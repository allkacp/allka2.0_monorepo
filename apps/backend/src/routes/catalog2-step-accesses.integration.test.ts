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
