import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { __setQuestionnaireGeneratorForTests, normalizeSuggestions } from "../lib/catalog2-questionnaire-ai";
import { api, mkAdmin, mkCompanyUser, mkProduct, startServer, stopServer } from "../test-support/universal-helpers";

// D-7 (reunião 07/10): a IA lê TUDO que está cadastrado e SUGERE o questionário; nada é salvo até o administrador criar.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const sugerir = (taskId: string, body: unknown = {}, token = ADMIN.token) => api(`/api/admin/catalog2/tasks/${taskId}/questionnaire/ai-suggest`, { method: "POST", token, body });

describe("Questionário gerado por IA (D-7)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("QAI"); });
  after(async () => { __setQuestionnaireGeneratorForTests(null); await stopServer(); });

  it("QAI01. normalização: tipos inválidos viram texto longo, opções só em perguntas de escolha, sem repetir, no máximo 15", () => {
    const out = normalizeSuggestions([
      { label: "Qual é o objetivo da campanha?", question_type: "texto_longo", is_required: true },
      { label: "Qual é o objetivo da campanha?", question_type: "texto_longo" }, // repetida
      { label: "Em quais plataformas anunciar?", question_type: "selecao_multipla", options: ["Meta", "Google", "Meta", "TikTok"], is_required: true },
      { label: "Escolha só uma opção?", question_type: "selecao_unica", options: ["única"] }, // opções insuficientes → vira texto curto
      { label: "Pergunta de tipo estranho aqui", question_type: "xpto", is_required: false, help_text: "  ajuda  " },
      { label: "Curta", question_type: "texto_curto" }, // curta demais
      { label: "Pergunta existente no questionário", question_type: "texto_curto" },
      ...Array.from({ length: 30 }, (_, i) => ({ label: `Pergunta extra número ${i + 1}`, question_type: "texto_curto" })),
    ], ["Pergunta existente no questionário"]);
    assert.equal(out.length, 15);
    assert.equal(out[0].label, "Qual é o objetivo da campanha?");
    assert.deepEqual(out[1].options, ["Meta", "Google", "TikTok"]);
    assert.equal(out[2].question_type, "texto_curto", "escolha sem opções suficientes vira texto curto");
    assert.deepEqual([out[3].question_type, out[3].is_required, out[3].help_text], ["texto_longo", false, "ajuda"]);
    assert.equal(new Set(out.map((q) => q.key)).size, out.length, "chaves únicas");
    assert.ok(!out.some((q) => q.label === "Curta" || q.label === "Pergunta existente no questionário"));
  });

  it("QAI02. a IA recebe TUDO o que está cadastrado (título, descrições, tarefa, etapas, variações, adicionais, acessos); devolve sugestão sem salvar nada", async () => {
    const p = await mkProduct({ name: "Gestão de Anúncios Meta Ads", tasks: [{ key: "t", steps: [{ key: "pixel", name: "Instalar o pixel de conversão", minutes: 60 }, { key: "camp", name: "Montar campanhas de remarketing", minutes: 90 }] }] });
    await prisma.catalog2ProductVersion.update({ where: { id: p.versionId }, data: { summary: "Gestão mensal de campanhas pagas", full_description: "Inclui otimização semanal e relatório de resultados." } });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" } });
    let recebido = "";
    let existentes: string[] = [];
    __setQuestionnaireGeneratorForTests(async (context, existing) => {
      recebido = context; existentes = existing;
      return [
        { label: "Qual é o orçamento mensal de mídia?", question_type: "moeda", is_required: true },
        { label: "Quais plataformas já usam pixel?", question_type: "selecao_multipla", options: ["Meta", "Google"], is_required: false, help_text: "Marque as que já têm pixel." },
      ];
    });
    const antes = await prisma.catalog2Questionnaire.count();
    const r = await sugerir(task.id, { existing_labels: ["Qual é o site do cliente?"] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    for (const trecho of ["Gestão de Anúncios Meta Ads", "Gestão mensal de campanhas pagas", "otimização semanal", "Instalar o pixel de conversão", "Montar campanhas de remarketing"]) assert.ok(recebido.includes(trecho), `a IA leu: ${trecho}`);
    assert.deepEqual(existentes, ["Qual é o site do cliente?"], "perguntas já existentes são repassadas para não repetir");
    assert.equal(r.json.questions.length, 2);
    assert.equal(r.json.questions[0].question_type, "moeda");
    assert.deepEqual(r.json.questions[1].options, ["Meta", "Google"]);
    assert.ok(r.json.name.startsWith("Briefing"));
    assert.equal(await prisma.catalog2Questionnaire.count(), antes, "só sugere: nada foi salvo");
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } })).questionnaire_id, null, "e nada foi vinculado à tarefa");
  });

  it("QAI03. a sugestão pode ser criada como questionário normal (revisada pelo administrador); falha da IA vira erro claro; só administração usa", async () => {
    const p = await mkProduct({ name: "Produto Z", tasks: [{ key: "t", steps: [{ key: "a", minutes: 30 }] }] });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" } });
    __setQuestionnaireGeneratorForTests(async () => [{ label: "Qual é o público-alvo principal?", question_type: "texto_longo", is_required: true }]);
    const s = await sugerir(task.id);
    assert.equal(s.status, 200);
    const q = s.json.questions[0];
    const criado = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: ADMIN.token, body: { name: s.json.name, description: s.json.description } });
    assert.equal(criado.status, 201, JSON.stringify(criado.json));
    const pergunta = await api(`/api/admin/catalog2/questionnaires/${criado.json.id}/questions`, { method: "POST", token: ADMIN.token, body: { key: q.key, label: q.label, is_required: q.is_required, question_type: q.question_type, help_text: q.help_text, options: q.options } });
    assert.equal(pergunta.status, 201, JSON.stringify(pergunta.json));
    // erro do provedor de IA
    __setQuestionnaireGeneratorForTests(async () => { throw new Error("cota excedida"); });
    const falha = await sugerir(task.id);
    assert.equal(falha.status, 502);
    assert.match(falha.json.error, /cota excedida/);
    // IA devolveu só lixo
    __setQuestionnaireGeneratorForTests(async () => [{ label: "x" }]);
    assert.equal((await sugerir(task.id)).status, 502);
    // permissões
    const negado = (await sugerir(task.id, {}, CO.token)).status;
    assert.ok([401, 403, 404].includes(negado), `empresa não usa (status ${negado})`);
    assert.notEqual(negado, 200);
    assert.equal((await sugerir("tarefa-que-nao-existe")).status, 404);
  });
});
