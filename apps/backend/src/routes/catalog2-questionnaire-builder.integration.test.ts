import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, describe, it } from "node:test";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { publishVersion } from "../lib/catalog2-service";
import { QUESTION_TYPES, validateAnswerValue, validateBriefingAnswers, conditionMetByAnswers, type SnapshotQuestion } from "../lib/catalog2-question-types";
import { detectKind, briefingFilePath } from "../lib/briefing-files";
import { TestWorld, tasksOf } from "../test-support/first-execution-helpers";

// Construtor universal de questionários (17/10): 22 tipos, configuração por pergunta, anexos seguros, condições, seções,
// reutilização, cópia/modelo global e proteção de modelos compartilhados. Tudo local; nada é publicado fora dos produtos de teste.

const W = new TestWorld();
let CO: Awaited<ReturnType<TestWorld["mkCompanyUser"]>>;
let OTHER: Awaited<ReturnType<TestWorld["mkCompanyUser"]>>;
let ADMIN: Awaited<ReturnType<TestWorld["mkAdmin"]>>;
const admin = (p: string, method = "GET", body?: unknown) => W.api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const taskOf = (versionId: string) => prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(64, 32)]);

async function upload(token: string, taskId: string, key: string, name: string, data: Buffer, description?: string) {
  const fd = new FormData();
  fd.append("question_key", key);
  if (description) fd.append("description", description);
  fd.append("file", new Blob([new Uint8Array(data)]), name);
  const res = await fetch(`${W.baseUrl}/api/project-tasks/${taskId}/briefing/files`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd });
  return { status: res.status, json: await res.json().catch(() => null) };
}

/** Produto de teste com UM questionário (criado pela API) já vinculado à tarefa; devolve ids. */
async function productWithQuestionnaire(name: string, questions: Record<string, unknown>[], extra: Record<string, unknown> = {}, publish = false) {
  const { product, versionId } = await W.mkProduct(name, { steps: [{ minutes: 60 }], recurring: false, publish: false });
  const task = await taskOf(versionId);
  const qn = await admin("/questionnaires", "POST", { name: `Q ${name} ${Date.now()}` });
  W.questionnaires.push(qn.json.id);
  assert.equal((await admin(`/tasks/${task.id}/questionnaire`, "PUT", { questionnaire_id: qn.json.id })).status, 200);
  const content = await admin(`/tasks/${task.id}/questionnaire/content`, "PUT", { name: `Q ${name}`, questions, ...extra });
  assert.equal(content.status, 200, JSON.stringify(content.json));
  if (publish) await publishVersion(versionId, "system", { activate: true, changeSummary: "teste" });
  return { product, versionId, task, qid: content.json.questionnaire.id as string, content: content.json };
}
async function contract(productId: string) {
  const q = await W.quote(CO.token, productId);
  assert.equal(q.status, 201, JSON.stringify(q.json));
  const { projectId } = await W.checkoutAndPay(CO.token, [q.json.id]);
  const [t] = await tasksOf(projectId, 0);
  return { projectId, taskId: t.id };
}
const snap = (qs: Partial<SnapshotQuestion>[]) => JSON.stringify(qs.map((q, i) => ({ question_key: `k${i}`, question_text: `P${i}`, type: "text_short", required: false, ...q })));

describe("Construtor universal de questionários", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await W.start(app);
    CO = await W.mkCompanyUser("QB");
    OTHER = await W.mkCompanyUser("QB-other");
    ADMIN = await W.mkAdmin();
  });
  after(async () => {
    // remove do disco os anexos de teste (o banco descartável some sozinho)
    for (const f of await prisma.taskBriefingFile.findMany({ select: { stored_name: true } })) { try { fs.unlinkSync(briefingFilePath(f.stored_name)); } catch { /* já removido */ } }
    await W.cleanup(); await prisma.$disconnect();
  });

  it("1. os 22 tipos pedidos existem e cada um pode ser criado pela API com sua configuração", async () => {
    const wanted = ["texto_curto", "texto_longo", "numero", "moeda", "data", "hora", "data_hora", "sim_nao", "selecao_unica", "selecao_multipla", "lista_suspensa", "escala", "telefone", "email", "url", "endereco", "arquivo", "imagem", "video", "audio", "documento", "aceite"];
    for (const t of wanted) assert.ok((QUESTION_TYPES as readonly string[]).includes(t), `tipo ${t}`);
    assert.equal(wanted.length, 22);
    const opts = ["A", "B", "C"];
    const questions = wanted.map((t, i) => ({
      key: `q${i}-${t}`, label: `Pergunta do tipo ${t}`, is_required: i % 2 === 0, question_type: t,
      ...(["selecao_unica", "selecao_multipla", "lista_suspensa"].includes(t) ? { options: opts.map((o, k) => ({ value: o.toLowerCase(), label: o, is_default: t !== "selecao_multipla" && k === 0 })) } : {}),
      ...(t === "escala" ? { settings: { scale: { min: 1, max: 10 } } } : {}),
    }));
    const p = await productWithQuestionnaire("Todos os tipos", questions);
    const saved = p.content.questionnaire.questions as any[];
    assert.equal(saved.length, 22);
    assert.deepEqual(saved.map((q) => q.question_type), wanted);
    assert.ok(saved.every((q) => typeof q.id === "string" && q.id.length > 10), "toda pergunta tem ID próprio");
    assert.equal(new Set(saved.map((q) => q.id)).size, 22);
    assert.equal(saved.find((q) => q.question_type === "escala").settings.scale.max, 10);
    assert.equal(saved.find((q) => q.question_type === "selecao_unica").options.find((o: any) => o.is_default).value, "a");
    const bad = await admin(`/tasks/${p.task.id}/questionnaire/content`, "PUT", { name: "x", questions: [{ key: "a", label: "Tipo inexistente", question_type: "holograma" }] });
    assert.ok([400, 422].includes(bad.status));
  });

  it("2. validação de cada tipo (valores certos passam, errados são recusados com mensagem clara)", () => {
    const v = (type: string, value: string, extra: Record<string, unknown> = {}) => validateAnswerValue({ type, ...(extra as object) }, value);
    const sel = { options: [{ value: "a" }, { value: "b" }, { value: "c" }] };
    assert.equal(v("hora", "14:30"), null); assert.match(v("hora", "25:00")!, /hora válida/);
    assert.equal(v("data_hora", "2026-10-17 14:30"), null); assert.match(v("data_hora", "17/10/2026")!, /data e hora/);
    assert.equal(v("data", "2026-10-17"), null); assert.match(v("data", "2026-02-31")!, /não existe/);
    assert.equal(v("numero", "12,5", { validation: { min: 1, max: 20 } }), null); assert.match(v("numero", "50", { validation: { max: 20 } })!, /máximo/);
    assert.equal(v("moeda", "R$ 1.500,00"), null); assert.match(v("moeda", "abc")!, /reais/);
    assert.equal(v("escala", "7", { settings: { scale: { min: 1, max: 10 } } }), null); assert.match(v("escala", "11", { settings: { scale: { min: 1, max: 10 } } })!, /nota de 1 a 10/);
    assert.equal(v("aceite", "sim"), null); assert.match(v("aceite", "não")!, /Marque a caixa/);
    assert.equal(v("sim_nao", "sim"), null); assert.match(v("sim_nao", "talvez")!, /sim ou não/);
    assert.equal(v("email", "a@b.com"), null); assert.match(v("email", "a@b")!, /e-mail/);
    assert.equal(v("telefone", "(11) 91234-5678"), null); assert.match(v("telefone", "123")!, /DDD/);
    assert.equal(v("url", "https://x.com/a"), null); assert.match(v("url", "x.com")!, /http/);
    assert.equal(v("endereco", "Rua A, 10, São Paulo"), null); assert.match(v("endereco", "rua")!, /endereço completo/);
    assert.equal(v("texto_curto", "oi", { validation: { min_length: 2, max_length: 5 } }), null); assert.match(v("texto_curto", "oi tudo bem", { validation: { max_length: 5 } })!, /no máximo 5/);
    assert.equal(v("selecao_unica", "a", sel), null); assert.match(v("selecao_unica", "z", sel)!, /opções disponíveis/);
    assert.equal(v("lista_suspensa", "b", sel), null); assert.match(v("lista_suspensa", "z", sel)!, /opções disponíveis/);
    assert.equal(v("imagem", "qualquer", {}), null, "tipos de arquivo validam o arquivo, não o texto");
  });

  it("3. obrigatória × opcional: só as obrigatórias ATIVAS bloqueiam o envio final; rascunho nunca bloqueia", () => {
    const s = snap([{ question_key: "a", required: true }, { question_key: "b", required: false }, { question_key: "c", required: true, settings: { is_active: false } }]);
    assert.deepEqual(validateBriefingAnswers(s, [], { final: false }), [], "rascunho vazio é aceito");
    const errs = validateBriefingAnswers(s, [], { final: true });
    assert.deepEqual(errs.map((e) => e.key), ["a"], "b é opcional e c está desativada");
    assert.deepEqual(validateBriefingAnswers(s, [{ question_key: "a", answer: "ok" }], { final: true }), []);
  });

  it("4. seleção única/múltipla: opção padrão, “Outro”, mínimo e máximo de escolhas; opções e limites validados no cadastro", async () => {
    const multi = { question_type: "selecao_multipla", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }], settings: { min_choices: 1, max_choices: 2, allow_other: true } };
    const s = snap([{ question_key: "m", type: "multiple_choice", question_type: "selecao_multipla", options: multi.options, settings: multi.settings, required: true } as any]);
    const ans = (v: string) => validateBriefingAnswers(s, [{ question_key: "m", answer: v }], { final: true });
    assert.deepEqual(ans(JSON.stringify(["a", "b"])), []);
    assert.match(ans(JSON.stringify(["a", "b", "c"]))[0].message, /no máximo 2/);
    assert.deepEqual(ans(JSON.stringify(["a", "outro:Algo diferente"])), [], "“Outro” com texto é aceito");
    assert.match(ans(JSON.stringify(["a", "outro:"]))[0].message, /não existe/, "“Outro” vazio não vale");
    const p = await productWithQuestionnaire("Seleção", [{ key: "m", label: "Escolha", question_type: "selecao_multipla", options: multi.options, settings: multi.settings }]);
    assert.equal(p.content.questionnaire.questions[0].settings.max_choices, 2);
    const task = p.task;
    const twoDefaults = await admin(`/tasks/${task.id}/questionnaire/content`, "PUT", { name: "x", questions: [{ key: "u", label: "Única", question_type: "selecao_unica", options: [{ value: "a", label: "A", is_default: true }, { value: "b", label: "B", is_default: true }] }] });
    assert.equal(twoDefaults.status, 422, "só uma opção padrão em seleção única");
    const tooMany = await admin(`/tasks/${task.id}/questionnaire/content`, "PUT", { name: "x", questions: [{ key: "u", label: "Única", question_type: "selecao_multipla", options: multi.options, settings: { max_choices: 9 } }] });
    assert.equal(tooMany.status, 422);
    const oneOption = await admin(`/tasks/${task.id}/questionnaire/content`, "PUT", { name: "x", questions: [{ key: "u", label: "Única", question_type: "lista_suspensa", options: [{ value: "a", label: "A" }] }] });
    assert.equal(oneOption.status, 422, "mínimo de 2 opções");
  });

  it("5. anexos seguros: tipo real, extensão, tamanho, quantidade, descrição, autor/data/pergunta e permissão do projeto", async () => {
    const p = await productWithQuestionnaire("Anexos", [
      { key: "logo", label: "Envie o logotipo", is_required: true, question_type: "imagem", settings: { attachments: { allowed: true, max_files: 1, max_size_mb: 1, require_description: true } } },
      { key: "obs", label: "Observações", question_type: "texto_longo", settings: { attachments: { allowed: true, accept: [".pdf"], max_files: 2 } } },
    ], {}, true);
    const { taskId } = await contract(p.product.id);
    // sem descrição obrigatória
    assert.equal((await upload(CO.token, taskId, "logo", "logo.png", PNG)).status, 422);
    // executável e extensões fora da lista
    assert.equal((await upload(CO.token, taskId, "logo", "virus.exe", Buffer.from("MZ" + "x".repeat(50)), "x")).status, 422);
    assert.equal((await upload(CO.token, taskId, "logo", "doc.pdf", PDF, "x")).status, 422, "imagem só aceita extensões de imagem");
    // tipo real diferente da extensão
    const fake = await upload(CO.token, taskId, "logo", "falso.png", Buffer.from("isto é só texto, não uma imagem"), "x");
    assert.equal(fake.status, 422); assert.equal(fake.json.code, "briefing_file_mismatch");
    // HTML disfarçado
    assert.equal((await upload(CO.token, taskId, "obs", "a.pdf", Buffer.from("<html><script>alert(1)</script></html>"))).status, 422);
    // muito grande
    assert.equal((await upload(CO.token, taskId, "logo", "grande.png", Buffer.concat([PNG, Buffer.alloc(1.2 * 1024 * 1024)]), "x")).json.code, "briefing_file_too_big");
    // ok + registro de autor/data/pergunta
    const ok = await upload(CO.token, taskId, "logo", "logo.png", PNG, "Logo oficial");
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.equal(ok.json.file.description, "Logo oficial");
    assert.equal(JSON.stringify(ok.json).includes("uploads"), false, "nenhum caminho interno é exposto");
    const row = await prisma.taskBriefingFile.findUniqueOrThrow({ where: { id: ok.json.file.id } });
    assert.equal(row.question_key, "logo"); assert.equal(row.uploaded_by_user_id, CO.user.id); assert.ok(row.created_at); assert.equal(row.detected_kind, "image");
    // limite de quantidade
    assert.equal((await upload(CO.token, taskId, "logo", "outra.png", PNG, "x")).json.code, "briefing_file_limit");
    // anexo complementar em pergunta de texto
    assert.equal((await upload(CO.token, taskId, "obs", "regras.pdf", PDF)).status, 201);
    // permissões: outro cliente não vê nem baixa
    assert.equal((await upload(OTHER.token, taskId, "obs", "x.pdf", PDF)).status, 404);
    const dl = await fetch(`${W.baseUrl}/api/project-tasks/${taskId}/briefing/files/${ok.json.file.id}/download`, { headers: { authorization: `Bearer ${CO.token}` } });
    assert.equal(dl.status, 200); assert.equal(dl.headers.get("x-content-type-options"), "nosniff"); assert.match(dl.headers.get("content-disposition") ?? "", /attachment/);
    const dl2 = await fetch(`${W.baseUrl}/api/project-tasks/${taskId}/briefing/files/${ok.json.file.id}/download`, { headers: { authorization: `Bearer ${OTHER.token}` } });
    assert.equal(dl2.status, 404);
    // resposta só aceita anexos realmente enviados para a pergunta
    const forged = await W.api(`/api/project-tasks/${taskId}/briefing`, { method: "PUT", token: CO.token, body: { answers: [{ question_key: "obs", question_text: "Observações", files: JSON.stringify([{ id: ok.json.file.id, name: "logo.png" }]) }] } });
    assert.equal(forged.status, 422, "anexo da pergunta “logo” não vale na pergunta “obs”");
    const good = await W.api(`/api/project-tasks/${taskId}/briefing`, { method: "PUT", token: CO.token, body: { answers: [{ question_key: "logo", question_text: "Envie o logotipo", files: JSON.stringify([{ id: ok.json.file.id, name: "logo.png", description: "Logo oficial" }]) }] } });
    assert.equal(good.status, 200, JSON.stringify(good.json));
    // regras puras: anexo obrigatório
    const s = snap([{ question_key: "a", required: false, settings: { attachments: { allowed: true, required: true } } }]);
    assert.equal(validateBriefingAnswers(s, [], { final: true })[0].message, "Anexo obrigatório.");
    assert.deepEqual(validateBriefingAnswers(s, [{ question_key: "a", files: JSON.stringify([{ id: "x", name: "a.pdf" }]) }], { final: true }), []);
    // remover: só quem enviou
    assert.equal((await W.api(`/api/project-tasks/${taskId}/briefing/files/${ok.json.file.id}`, { method: "DELETE", token: OTHER.token })).status, 404);
    assert.equal((await W.api(`/api/project-tasks/${taskId}/briefing/files/${ok.json.file.id}`, { method: "DELETE", token: CO.token })).status, 200);
  });

  it("6. detecção do tipo real pelo conteúdo", () => {
    assert.equal(detectKind(PNG)?.kind, "image");
    assert.equal(detectKind(PDF)?.kind, "pdf");
    assert.equal(detectKind(Buffer.from("MZ\x90\x00 exe"))?.kind, undefined);
    assert.equal(detectKind(Buffer.from("#!/bin/sh\nrm -rf /")), null);
    assert.equal(detectKind(Buffer.from("a;b;c\n1;2;3"))?.kind, "text");
    assert.equal(detectKind(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypmp42"), Buffer.alloc(16)]))?.kind, "video");
  });

  it("7. lógica condicional por resposta anterior: igual, diferente, contém, selecionado, maior/menor, anexado", () => {
    const A = (answer: string | null, files: string | null = null) => new Map([["base", { answer, files }]]);
    const c = (operator: string, value?: string) => ({ source: "answer" as const, ref: "base", operator: operator as any, ...(value != null ? { value } : {}) });
    assert.equal(conditionMetByAnswers(c("eq", "sim"), A("sim")), true); assert.equal(conditionMetByAnswers(c("eq", "sim"), A("nao")), false);
    assert.equal(conditionMetByAnswers(c("neq", "sim"), A("nao")), true);
    assert.equal(conditionMetByAnswers(c("contains", "meta"), A("Uso Meta Ads")), true); assert.equal(conditionMetByAnswers(c("contains", "tiktok"), A("Uso Meta Ads")), false);
    assert.equal(conditionMetByAnswers(c("selected"), A("x")), true); assert.equal(conditionMetByAnswers(c("not_selected"), A(null)), true); assert.equal(conditionMetByAnswers(c("selected"), A("")), false);
    assert.equal(conditionMetByAnswers(c("gt", "10"), A("15")), true); assert.equal(conditionMetByAnswers(c("gt", "10"), A("5")), false);
    assert.equal(conditionMetByAnswers(c("lt", "10"), A("5")), true); assert.equal(conditionMetByAnswers(c("lt", "10"), A("")), false);
    assert.equal(conditionMetByAnswers(c("attached"), A(null, JSON.stringify([{ id: "1", name: "a.pdf" }]))), true); assert.equal(conditionMetByAnswers(c("not_attached"), A(null)), true);
    assert.equal(conditionMetByAnswers(c("eq", "b"), A(JSON.stringify(["a", "b"]))), true, "seleção múltipla: igual a uma das escolhas");
    // pergunta condicional: some quando a condição não vale (não valida nem exige) e aparece quando vale
    const s = snap([{ question_key: "base", required: true }, { question_key: "extra", required: true, condition: c("eq", "sim") }]);
    assert.deepEqual(validateBriefingAnswers(s, [{ question_key: "base", answer: "nao" }], { final: true }), []);
    assert.deepEqual(validateBriefingAnswers(s, [{ question_key: "base", answer: "sim" }], { final: true }).map((e) => e.key), ["extra"]);
  });

  it("8. a API valida e grava as novas condições; condição inválida é recusada", async () => {
    const q0 = { key: "base", label: "Usa Meta?", question_type: "sim_nao" };
    const ok = await productWithQuestionnaire("Condições", [q0, { key: "obs", label: "Detalhe", question_type: "texto_curto", condition: { source: "answer", ref: "base", operator: "contains", value: "sim" } }, { key: "n", label: "Mais de quantos?", question_type: "numero", condition: { source: "answer", ref: "base", operator: "gt", value: "3" } }, { key: "f", label: "Sem arquivo", question_type: "texto_curto", condition: { source: "answer", ref: "base", operator: "not_attached" } }]);
    assert.equal(ok.content.questionnaire.questions.filter((q: any) => q.condition_json).length, 3);
    const bad = (condition: unknown) => admin(`/tasks/${ok.task.id}/questionnaire/content`, "PUT", { name: "x", questions: [q0, { key: "z", label: "Z", question_type: "texto_curto", condition }] });
    assert.equal((await bad({ source: "answer", ref: "base", operator: "gt", value: "abc" })).status, 422, "maior que precisa de número");
    assert.equal((await bad({ source: "answer", ref: "base", operator: "contains" })).status, 422, "contém precisa de valor");
    assert.equal((await bad({ source: "addon", ref: "x", operator: "attached" })).status, 422, "anexo só vale para resposta anterior");
  });

  it("9. IDs permanentes, reordenar, duplicar questionário, ativar/desativar sem apagar, seções no contrato", async () => {
    const p = await productWithQuestionnaire("Ordem", [
      { key: "a", label: "A", settings: { section_key: "s1" } }, { key: "b", label: "B", settings: { section_key: "s2" } }, { key: "c", label: "C", settings: { is_active: false } },
    ], { sections: [{ key: "s1", name: "Dados da empresa", description: "Quem é o cliente" }, { key: "s2", name: "Objetivos" }] }, false);
    const ids = Object.fromEntries((p.content.questionnaire.questions as any[]).map((q) => [q.key, q.id]));
    // reordena (c, b, a) mantendo ids; muda texto de b
    const re = await admin(`/tasks/${p.task.id}/questionnaire/content`, "PUT", { name: "Ordem", sections: [{ key: "s1", name: "Dados da empresa" }, { key: "s2", name: "Objetivos" }], questions: [{ id: ids.c, key: "c", label: "C", settings: { is_active: false } }, { id: ids.b, key: "b", label: "B editada", settings: { section_key: "s2" } }, { id: ids.a, key: "a", label: "A", settings: { section_key: "s1" } }] });
    assert.equal(re.status, 200, JSON.stringify(re.json));
    const after = re.json.questionnaire.questions as any[];
    assert.deepEqual(after.map((q) => q.key), ["c", "b", "a"]);
    assert.deepEqual(after.map((q) => q.id), [ids.c, ids.b, ids.a], "os IDs não mudam ao reordenar/editar");
    assert.equal(re.json.questionnaire.revision, 3, "cada salvamento sobe a versão do questionário");
    // seção sem existir é recusada
    assert.equal((await admin(`/tasks/${p.task.id}/questionnaire/content`, "PUT", { name: "x", questions: [{ key: "a", label: "A", settings: { section_key: "nao-existe" } }] })).status, 422);
    // duplicar questionário: IDs novos
    const dup = await admin(`/questionnaires/${p.qid}/duplicate`, "POST", {});
    assert.equal(dup.status, 201); W.questionnaires.push(dup.json.id);
    const copy = (await admin(`/questionnaires/${dup.json.id}`)).json;
    assert.equal(copy.questions.length, 3);
    assert.equal(copy.questions.some((q: any) => q.id === ids.a), false, "a cópia tem IDs próprios");
    assert.equal(copy.source_questionnaire_id, p.qid);
    // contrato: a pergunta desativada não entra; seção e versão ficam no briefing congelado
    await admin(`/tasks/${p.task.id}/questionnaire/content`, "PUT", { name: "Ordem", sections: [{ key: "s1", name: "Dados da empresa", description: "Quem é o cliente" }, { key: "s2", name: "Objetivos" }], questions: [{ id: ids.a, key: "a", label: "A", settings: { section_key: "s1" } }, { id: ids.b, key: "b", label: "B", settings: { section_key: "s2" } }, { id: ids.c, key: "c", label: "C", settings: { is_active: false } }] });
    await publishVersion(p.versionId, "system", { activate: true, changeSummary: "teste" });
    const { taskId } = await contract(p.product.id);
    const snapshot = JSON.parse((await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).briefing_snapshot!) as any[];
    assert.deepEqual(snapshot.map((q) => q.question_key), ["a", "b"], "pergunta desativada não vai para o contrato");
    assert.equal(snapshot[0].section_name, "Dados da empresa"); assert.equal(snapshot[0].section_description, "Quem é o cliente");
    assert.equal(snapshot[0].question_id, ids.a); assert.equal(snapshot[0].questionnaire_id, p.qid); assert.ok(snapshot[0].questionnaire_revision >= 3);
    // editar o modelo depois NÃO muda o contrato já feito
    const frozen = (await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).briefing_snapshot;
    await prisma.catalog2Questionnaire.update({ where: { id: p.qid }, data: { name: "Mudou" } });
    await prisma.catalog2QuestionnaireQuestion.update({ where: { id: ids.a }, data: { label: "Texto novo" } });
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).briefing_snapshot, frozen);
  });

  it("10. reutilização: buscar questionário por ID/nome/produto, buscar pergunta por nome/ID, modelo global, vincular sincronizado ou como cópia", async () => {
    const a = await productWithQuestionnaire("Biblioteca A", [{ key: "site", label: "Qual o endereço do site da empresa?", question_type: "url" }]);
    const found = await admin(`/questionnaires?q=${a.qid.slice(0, 10)}`);
    assert.ok(found.json.data.some((x: any) => x.id === a.qid), "por ID");
    assert.ok((await admin(`/questionnaires?q=${encodeURIComponent("endereço do site")}`)).json.data.some((x: any) => x.id === a.qid), "pelo texto de uma pergunta");
    assert.ok((await admin(`/questionnaires?product=${encodeURIComponent("Biblioteca A")}`)).json.data.some((x: any) => x.id === a.qid), "por produto");
    const lib = await admin(`/question-library?q=${encodeURIComponent("endereço do site")}`);
    const qq = lib.json.data.find((x: any) => x.questionnaire_id === a.qid);
    assert.ok(qq && qq.id && qq.question_type === "url", "pergunta encontrada por nome");
    assert.ok((await admin(`/question-library?q=${qq.id}`)).json.data.some((x: any) => x.id === qq.id), "pergunta encontrada por ID");
    // modelo global
    assert.equal((await admin(`/questionnaires/${a.qid}/global`, "PUT", { is_global_model: true })).json.is_global_model, true);
    assert.ok((await admin("/questionnaires?global=1")).json.data.some((x: any) => x.id === a.qid));
    // B vincula sincronizado; C vincula cópia
    const b = await W.mkProduct("Biblioteca B", { steps: [{ minutes: 60 }], publish: false });
    const bt = await taskOf(b.versionId);
    assert.equal((await admin(`/tasks/${bt.id}/questionnaire`, "PUT", { questionnaire_id: a.qid, mode: "sync" })).json.copied, false);
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: bt.id } })).questionnaire_id, a.qid);
    const c = await W.mkProduct("Biblioteca C", { steps: [{ minutes: 60 }], publish: false });
    const ct = await taskOf(c.versionId);
    const linked = await admin(`/tasks/${ct.id}/questionnaire`, "PUT", { questionnaire_id: a.qid, mode: "copy" });
    assert.equal(linked.json.copied, true);
    assert.notEqual(linked.json.questionnaire_id, a.qid, "cópia independente tem ID próprio");
    W.questionnaires.push(linked.json.questionnaire_id);
    const copyQ = (await admin(`/questionnaires/${linked.json.questionnaire_id}`)).json;
    assert.equal(copyQ.source_questionnaire_id, a.qid);
    assert.equal(copyQ.questions.length, 1);
    assert.notEqual(copyQ.questions[0].id, qq.id);
  });

  it("11. editar questionário compartilhado: escolha entre editar o modelo ou criar cópia; nunca altera outros produtos em silêncio", async () => {
    const a = await productWithQuestionnaire("Compartilhado A", [{ key: "x", label: "Pergunta original", question_type: "texto_curto" }]);
    const b = await W.mkProduct("Compartilhado B", { steps: [{ minutes: 60 }], publish: false });
    const bt = await taskOf(b.versionId);
    await admin(`/tasks/${bt.id}/questionnaire`, "PUT", { questionnaire_id: a.qid });
    const origId = a.content.questionnaire.questions[0].id;
    const body = (extra: Record<string, unknown>) => ({ name: "Compartilhado", questions: [{ id: origId, key: "x", label: "Pergunta ALTERADA", question_type: "texto_curto" }], ...extra });
    // modelo compartilhado + escolha "editar o modelo" exige confirmação
    const needConfirm = await admin(`/tasks/${a.task.id}/questionnaire/content`, "PUT", body({ shared_mode: "edit_shared" }));
    assert.equal(needConfirm.status, 409); assert.equal(needConfirm.json.code, "questionnaire_shared_confirm");
    assert.equal((await prisma.catalog2QuestionnaireQuestion.findUniqueOrThrow({ where: { id: origId } })).label, "Pergunta original", "nada mudou sem confirmação");
    // criar cópia: o modelo original e o outro produto ficam intactos
    const copy = await admin(`/tasks/${a.task.id}/questionnaire/content`, "PUT", body({ shared_mode: "copy" }));
    assert.equal(copy.status, 200); assert.equal(copy.json.forked, true);
    W.questionnaires.push(copy.json.questionnaire.id);
    assert.equal((await prisma.catalog2QuestionnaireQuestion.findUniqueOrThrow({ where: { id: origId } })).label, "Pergunta original");
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: bt.id } })).questionnaire_id, a.qid, "o outro produto continua no modelo");
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: a.task.id } })).questionnaire_id, copy.json.questionnaire.id);
    // agora C compartilha de novo e editamos o modelo de propósito (confirmado)
    const c = await W.mkProduct("Compartilhado C", { steps: [{ minutes: 60 }], publish: false });
    const ct = await taskOf(c.versionId);
    await admin(`/tasks/${ct.id}/questionnaire`, "PUT", { questionnaire_id: a.qid });
    const edit = await admin(`/tasks/${bt.id}/questionnaire/content`, "PUT", body({ shared_mode: "edit_shared", confirm_shared: true }));
    assert.equal(edit.status, 200, JSON.stringify(edit.json)); assert.equal(edit.json.forked, false);
    assert.equal((await prisma.catalog2QuestionnaireQuestion.findUniqueOrThrow({ where: { id: origId } })).label, "Pergunta ALTERADA");
    assert.equal(edit.json.questionnaire.questions[0].id, origId, "ID da pergunta preservado");
    // sem escolha explícita: comportamento de sempre (cópia) — a menos que haja só um uso
    const legacy = await admin(`/tasks/${ct.id}/questionnaire/content`, "PUT", { name: "Legado", questions: [{ key: "x", label: "Via legado", question_type: "texto_curto" }] });
    assert.equal(legacy.json.forked, true); W.questionnaires.push(legacy.json.questionnaire.id);
    // modelo usado por versão PUBLICADA não pode ser editado como compartilhado
    const pub = await productWithQuestionnaire("Compartilhado Pub", [{ key: "p", label: "Publicada", question_type: "texto_curto" }], {}, true);
    const d = await W.mkProduct("Compartilhado D", { steps: [{ minutes: 60 }], publish: false });
    const dt = await taskOf(d.versionId);
    await admin(`/tasks/${dt.id}/questionnaire`, "PUT", { questionnaire_id: pub.qid });
    const blocked = await admin(`/tasks/${dt.id}/questionnaire/content`, "PUT", { name: "x", shared_mode: "edit_shared", confirm_shared: true, questions: [{ key: "p", label: "Mexi", question_type: "texto_curto" }] });
    assert.equal(blocked.status, 409); assert.equal(blocked.json.code, "version_published_immutable");
  });

  it("12. dados existentes preservados: questionário/pergunta antigos (sem configuração nova) abrem, validam e geram o contrato como antes", async () => {
    const { product, versionId } = await W.mkProduct("Legado Q", { steps: [{ minutes: 60 }], publish: false });
    const task = await taskOf(versionId);
    const qn = await prisma.catalog2Questionnaire.create({ data: { name: "Antigo" } });
    W.questionnaires.push(qn.id);
    const old = await prisma.catalog2QuestionnaireQuestion.create({ data: { questionnaire_id: qn.id, key: "p1", label: "Qual o objetivo?", is_required: true, sort_order: 1 } });
    await prisma.catalog2Task.update({ where: { id: task.id }, data: { questionnaire_id: qn.id } });
    const detail = (await admin(`/products/${product.id}`)).json.versions.find((v: any) => v.id === versionId).tasks[0].questionnaire;
    assert.equal(detail.revision, 1); assert.equal(detail.is_global_model, false); assert.deepEqual(detail.sections, []);
    assert.equal(detail.questions[0].id, old.id); assert.deepEqual(detail.questions[0].settings, {}); assert.equal(detail.questions[0].question_type, "texto_longo");
    await publishVersion(versionId, "system", { activate: true, changeSummary: "teste" });
    const { taskId } = await contract(product.id);
    const snapshot = JSON.parse((await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).briefing_snapshot!) as any[];
    assert.equal(snapshot.length, 1); assert.equal(snapshot[0].question_key, "p1"); assert.equal(snapshot[0].required, true);
    assert.equal((await W.api(`/api/project-tasks/${taskId}/briefing`, { method: "PUT", token: CO.token, body: { answers: [{ question_key: "p1", question_text: "Qual o objetivo?", answer: "Vender mais" }] } })).status, 200);
    assert.deepEqual(validateBriefingAnswers(JSON.stringify(snapshot), [{ question_key: "p1", answer: "Vender mais" }], { final: true }), []);
  });
});
