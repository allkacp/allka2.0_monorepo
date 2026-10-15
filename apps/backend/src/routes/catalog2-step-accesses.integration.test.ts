import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { accessesForStep, accessesForTask, type RequirementLike } from "../lib/catalog2-step-accesses";
import { addAccessRequirements } from "../test-support/access-helpers";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// P-12 (08/10): cadastro ÚNICO de acessos; cada etapa diz quais acessos usa (todos / só os escolhidos); o nômade só vê os da etapa dele.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const put = (id: string, body: unknown) => api(`/api/admin/catalog2/steps/${id}`, { method: "PUT", token: ADMIN.token, body });
const req = (key: string, label: string, obligation = "required"): RequirementLike => ({ key, label, obligation, instructions: null, connection_type: { key: `t_${key}`, name: label } });

describe("Acessos por etapa (P-12)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("ACE"); });
  after(async () => { await stopServer(); });

  it("ACE01. regra pura: padrão (validação = todos; demais = nenhum), 'todos', 'só os escolhidos' e a união por tarefa", () => {
    const reqs = [req("a", "Google Ads"), req("b", "Meta"), req("c", "CRM", "optional")];
    assert.deepEqual(accessesForStep(reqs, null, true).map((x) => x.label), ["Google Ads", "Meta", "CRM"], "etapa de validação sem escolha usa todos");
    assert.deepEqual(accessesForStep(reqs, null, false), [], "etapa comum sem escolha não usa nenhum");
    assert.equal(accessesForStep(reqs, { access_scope: "all" }, false).length, 3);
    const some = accessesForStep(reqs, { access_scope: "some", access_keys: ["b", "zzz"] }, true);
    assert.deepEqual(some.map((x) => x.label), ["Meta"], "só os escolhidos; chave inexistente é ignorada");
    assert.equal(accessesForStep(reqs, { access_scope: "some", access_keys: ["c"] }, false)[0].is_required, false, "opcional continua opcional");
    assert.equal(accessesForTask(reqs, [{ ops: null, isAccessValidation: false }]).length, 3, "sem escolha em nenhuma etapa: a tarefa usa a lista toda");
    const un = accessesForTask(reqs, [{ ops: { access_scope: "some", access_keys: ["a"] }, isAccessValidation: false }, { ops: { access_scope: "some", access_keys: ["b"] }, isAccessValidation: false }]);
    assert.deepEqual(un.map((x) => x.key).sort(), ["a", "b"], "união dos acessos das etapas");
  });

  it("ACE02. a escolha da etapa é gravada (e validada) no cadastro da etapa", async () => {
    const p = await mkProduct({ name: "Acessos etapa", tasks: [{ key: "t", steps: [{ key: "s1" }] }], publish: false });
    const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { task: { version_id: p.versionId } } });
    const ok = await put(step.id, { ops: { access_scope: "some", access_keys: ["google_ads-1", "google_ads-1", " "] } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const row = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: step.id } });
    assert.deepEqual(row.ops, { access_scope: "some", access_keys: ["google_ads-1"] }, "sem repetidos nem vazios");
    assert.ok((await put(step.id, { ops: { access_scope: "qualquer" } })).status >= 400, "escopo inválido é recusado");
    const all = await put(step.id, { ops: { access_scope: "all" } });
    assert.equal(all.status, 200);
    assert.deepEqual((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: step.id } })).ops, { access_scope: "all" });
  });

  it("ACE02b. quem executa a tarefa vem das etapas: todas humanas → humano · todas IA → IA · misto → híbrido; tarefa antiga não muda sozinha", async () => {
    const p = await mkProduct({ name: "Executor pela etapa", tasks: [{ key: "t", steps: [{ key: "s1" }, { key: "s2" }] }], publish: false });
    const [s1, s2] = await prisma.catalog2TaskStep.findMany({ where: { task: { version_id: p.versionId } }, orderBy: { sort_order: "asc" } });
    const task = () => prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId } });
    const before = (await task()).execution_mode;
    assert.equal((await put(s1.id, { name: "Só renomeei" })).status, 200);
    assert.equal((await task()).execution_mode, before, "mudar outra coisa da etapa não mexe no executor da tarefa");
    assert.equal((await put(s1.id, { execution_mode: "humano" })).status, 200);
    assert.equal((await put(s2.id, { execution_mode: "humano" })).status, 200);
    assert.equal((await task()).execution_mode, "humano");
    assert.equal((await put(s2.id, { execution_mode: "ia" })).status, 200);
    assert.equal((await task()).execution_mode, "hibrido", "uma etapa humana + uma IA = híbrido");
    assert.equal((await put(s1.id, { execution_mode: "ia" })).status, 200);
    assert.equal((await task()).execution_mode, "ia", "todas IA = IA");
  });

  it("HIB01. etapa 'Humano ou IA' guarda a opção IA (especialidade + tempo); fora do híbrido a opção IA é limpa; nova versão copia", async () => {
    const p = await mkProduct({ name: "Etapa híbrida", tasks: [{ key: "t", steps: [{ key: "s1" }] }], publish: false });
    const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { task: { version_id: p.versionId } } });
    const sp = await prisma.catalog2Specialty.create({ data: { key: `ia_hib_${Date.now()}`, name: "Redator IA", sort_order: 99, execution_kind: "ia", max_hourly_rate: 10 } });
    const ok = await put(step.id, { execution_mode: "hibrido", estimated_minutes: 120, ai_specialty_id: sp.id, ai_estimated_minutes: 30 });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    let row = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: step.id } });
    assert.deepEqual([row.execution_mode, row.estimated_minutes, row.ai_specialty_id, row.ai_estimated_minutes], ["hibrido", 120, sp.id, 30]);
    assert.equal((await put(step.id, { ai_specialty_id: "nao-existe" })).status, 422, "especialidade da IA inexistente é recusada");
    assert.equal((await put(step.id, { execution_mode: "humano" })).status, 200);
    row = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: step.id } });
    assert.deepEqual([row.ai_specialty_id, row.ai_estimated_minutes], [null, null], "saiu do híbrido: a opção IA é limpa");
  });

  it("VAR01. opção de variação guarda descrição, links e arquivo-modelo; recusa link inválido e arquivo inexistente; a nova versão copia tudo", async () => {
    const { storeDeliverableFile } = await import("../lib/catalog2-deliverable-files");
    const ref = storeDeliverableFile("modelo.pdf", Buffer.from("conteudo"), "application/pdf");
    const p = await mkProduct({ name: "Variação exemplos", tasks: [{ key: "t", steps: [{ key: "s1" }] }], publish: false });
    const va = await api(`/api/admin/catalog2/versions/${p.versionId}/variations`, { method: "POST", token: ADMIN.token, body: { key: "campanhas", name: "Campanhas", is_required: true, selection_type: "single" } });
    assert.equal(va.status, 201, JSON.stringify(va.json));
    const mk = (body: unknown) => api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token: ADMIN.token, body });
    assert.equal((await mk({ key: "x", label: "X", example_links: [{ url: "ftp://nao" }] })).json.code, "invalid_example_link");
    assert.equal((await mk({ key: "y", label: "Y", example_file: { id: "11111111-1111-4111-8111-111111111111.pdf", name: "x.pdf" } })).json.code, "invalid_example_file");
    const ok = await mk({ key: "quatro", label: "4 campanhas", short_description: "  Quatro campanhas por mês  ", example_links: [{ label: "Modelo", url: "https://drive.google.com/abc" }], example_file: ref });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    const row = await prisma.catalog2VariationOption.findUniqueOrThrow({ where: { id: ok.json.id } });
    assert.equal(row.short_description, "Quatro campanhas por mês");
    assert.deepEqual(JSON.parse(row.example_links_json!), [{ label: "Modelo", url: "https://drive.google.com/abc" }]);
    assert.equal(JSON.parse(row.example_file_json!).name, "modelo.pdf");
    // atualizar: limpar o arquivo e os links
    const upd = await api(`/api/admin/catalog2/options/${ok.json.id}`, { method: "PUT", token: ADMIN.token, body: { example_file: null, example_links: [] } });
    assert.equal(upd.status, 200, JSON.stringify(upd.json));
    const after = await prisma.catalog2VariationOption.findUniqueOrThrow({ where: { id: ok.json.id } });
    assert.deepEqual([after.example_file_json, after.example_links_json, after.short_description], [null, null, "Quatro campanhas por mês"]);
  });

  it("VAR02. padrão = o que o produto original já inclui: variação fora do produto original não aceita opção padrão e a nova versão copia a marca", async () => {
    const p = await mkProduct({ name: "Variação padrão", tasks: [{ key: "t", steps: [{ key: "s1" }] }], publish: false });
    const mkVar = (key: string, base_included?: boolean) => api(`/api/admin/catalog2/versions/${p.versionId}/variations`, { method: "POST", token: ADMIN.token, body: { key, name: key, is_required: true, selection_type: "single", ...(base_included === undefined ? {} : { base_included }) } });
    const inBase = await mkVar("campanhas");
    assert.equal(inBase.status, 201, JSON.stringify(inBase.json));
    assert.equal((await prisma.catalog2Variation.findUniqueOrThrow({ where: { id: inBase.json.id } })).base_included, true, "por padrão o produto original inclui a variação");
    const o1 = await api(`/api/admin/catalog2/variations/${inBase.json.id}/options`, { method: "POST", token: ADMIN.token, body: { key: "uma", label: "1 campanha", is_default: true } });
    assert.equal(o1.status, 201, JSON.stringify(o1.json));
    const o2 = await api(`/api/admin/catalog2/variations/${inBase.json.id}/options`, { method: "POST", token: ADMIN.token, body: { key: "duas", label: "2 campanhas" } });
    assert.equal((await prisma.catalog2VariationOption.findUniqueOrThrow({ where: { id: o2.json.id } })).is_default, false, "a opção que soma não é padrão");
    // variação que o produto original NÃO inclui: ninguém é padrão
    const extra = await mkVar("plataformas", false);
    assert.equal(extra.status, 201, JSON.stringify(extra.json));
    const bad = await api(`/api/admin/catalog2/variations/${extra.json.id}/options`, { method: "POST", token: ADMIN.token, body: { key: "meta", label: "Meta", is_default: true } });
    assert.equal(bad.json.code, "variation_not_in_base");
    const ok = await api(`/api/admin/catalog2/variations/${extra.json.id}/options`, { method: "POST", token: ADMIN.token, body: { key: "google", label: "Google" } });
    assert.equal(ok.status, 201);
    const mark = await api(`/api/admin/catalog2/options/${ok.json.id}`, { method: "PUT", token: ADMIN.token, body: { is_default: true } });
    assert.equal(mark.json.code, "variation_not_in_base");
    // desligar "já no produto original" numa variação que tinha padrão remove o padrão
    const off = await api(`/api/admin/catalog2/variations/${inBase.json.id}`, { method: "PUT", token: ADMIN.token, body: { base_included: false } });
    assert.equal(off.status, 200, JSON.stringify(off.json));
    assert.equal((await prisma.catalog2VariationOption.findUniqueOrThrow({ where: { id: o1.json.id } })).is_default, false);
  });

  it("VAR03. opção padrão não soma horas: recusa horas extras e, ao virar padrão, remove as que tinha", async () => {
    const p = await mkProduct({ name: "Padrão sem horas", tasks: [{ key: "t", steps: [{ key: "s1" }] }], publish: false });
    const va = await api(`/api/admin/catalog2/versions/${p.versionId}/variations`, { method: "POST", token: ADMIN.token, body: { key: "campanhas", name: "Campanhas", is_required: true, selection_type: "single" } });
    const o = await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token: ADMIN.token, body: { key: "uma", label: "1 campanha" } });
    const effort = { effect_type: "add_effort_hours", effect_value: "2", charge_scope: "recurring", source_task_key: "t", source_step_key: "s1", effort_scale_by_quantity: false };
    const add1 = await api(`/api/admin/catalog2/options/${o.json.id}/effects`, { method: "POST", token: ADMIN.token, body: effort });
    assert.equal(add1.status, 201, JSON.stringify(add1.json));
    // vira padrão: as horas extras saem
    const mark = await api(`/api/admin/catalog2/options/${o.json.id}`, { method: "PUT", token: ADMIN.token, body: { is_default: true } });
    assert.equal(mark.status, 200, JSON.stringify(mark.json));
    assert.equal(await prisma.catalog2OptionEffect.count({ where: { variation_option_id: o.json.id } }), 0);
    // opção padrão não aceita horas extras
    const again = await api(`/api/admin/catalog2/options/${o.json.id}/effects`, { method: "POST", token: ADMIN.token, body: effort });
    assert.equal(again.json.code, "default_option_no_effort");
  });

  it("CLR01. limpar tarefa: dupla confirmação no servidor, não exclui a tarefa, guarda fotografia no histórico e restaura; a última tarefa nunca é excluída", async () => {
    const p = await mkProduct({ name: "Limpar tarefa", tasks: [{ key: "t", steps: [{ key: "s1" }, { key: "s2" }] }], publish: false });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId } });
    const clear = (body: unknown) => api(`/api/admin/catalog2/tasks/${task.id}/clear`, { method: "POST", token: ADMIN.token, body });
    assert.equal((await clear({ confirm_name: "outro nome", confirm_phrase: "LIMPAR" })).json.code, "confirm_name_mismatch", "nome errado não limpa");
    assert.ok((await clear({ confirm_name: task.name })).status >= 400, "sem a frase LIMPAR não limpa");
    assert.equal(await prisma.catalog2TaskStep.count({ where: { task_id: task.id } }), 2, "nada foi limpo ainda");
    assert.equal((await clear({ confirm_name: task.name, confirm_phrase: "LIMPAR" })).status, 200);
    assert.equal(await prisma.catalog2TaskStep.count({ where: { task_id: task.id } }), 0);
    assert.ok(await prisma.catalog2Task.findUnique({ where: { id: task.id } }), "a tarefa continua no produto");
    assert.equal((await clear({ confirm_name: task.name, confirm_phrase: "LIMPAR" })).json.code, "task_already_empty");
    const snaps = await api(`/api/admin/catalog2/tasks/${task.id}/clear-snapshots`, { token: ADMIN.token });
    assert.equal(snaps.json.data.length, 1);
    assert.equal(snaps.json.task_is_empty, true);
    assert.equal((await api(`/api/admin/catalog2/tasks/${task.id}`, { method: "DELETE", token: ADMIN.token })).json.code, "last_task_cannot_be_removed", "a única tarefa não é excluída");
    const back = await api(`/api/admin/catalog2/tasks/${task.id}/restore`, { method: "POST", token: ADMIN.token, body: { event_id: snaps.json.data[0].event_id } });
    assert.equal(back.status, 200, JSON.stringify(back.json));
    assert.deepEqual((await prisma.catalog2TaskStep.findMany({ where: { task_id: task.id }, orderBy: { sort_order: "asc" } })).map((s) => s.key), ["s1", "s2"]);
    assert.equal((await api(`/api/admin/catalog2/tasks/${task.id}/restore`, { method: "POST", token: ADMIN.token, body: { event_id: snaps.json.data[0].event_id } })).json.code, "task_not_empty", "não restaura por cima de etapas existentes");
  });

  it("ACE03. ao contratar, cada etapa recebe só os acessos que escolheu; a validação de acessos recebe todos; etapa sem escolha não recebe", async () => {
    const p = await mkProduct({ name: "Acessos geração", tasks: [{ key: "t", data: { stage_execution: "stage" }, steps: [{ key: "s1" }, { key: "s2" }, { key: "s3" }] }], publish: false });
    await addAccessRequirements(p.versionId, [{ type: "google_ads", label: "Google Ads" }, { type: "meta_business_manager", label: "Meta Business Manager" }]);
    const sm = await prisma.catalog2StepModel.create({ data: { name: `Acessos ${Date.now()}`, purpose: "coleta_informacao", is_access_validation: true, signature: `sig-ace-${Date.now()}` } });
    const [s1, s2] = await prisma.catalog2TaskStep.findMany({ where: { task: { version_id: p.versionId } }, orderBy: { sort_order: "asc" } });
    await prisma.catalog2TaskStep.update({ where: { id: s1.id }, data: { step_model_id: sm.id, step_model_revision: 1 } });
    await prisma.catalog2TaskStep.update({ where: { id: s2.id }, data: { ops: { access_scope: "some", access_keys: ["meta_business_manager-2"] } } });
    const { publishVersion } = await import("../lib/catalog2-service");
    await publishVersion(p.versionId, "system", { activate: true, changeSummary: "teste" });
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const task = byKey(await tasksOf(projectId)).t;
    const cfg = task.stages.map((s) => JSON.parse(s.config_snapshot ?? "{}"));
    assert.deepEqual(cfg[0].access_requirements.map((a: any) => a.label), ["Google Ads", "Meta Business Manager"], "validação de acessos: todos");
    assert.deepEqual(cfg[1].access_requirements.map((a: any) => a.label), ["Meta Business Manager"], "etapa 2 só vê o que escolheu");
    assert.equal(cfg[2].access_requirements, undefined, "etapa 3 não escolheu nada: não vê acessos");
    await prisma.catalog2StepModel.delete({ where: { id: sm.id } }).catch(() => {});
  });
});
