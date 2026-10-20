import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkProduct, setPricingSettings, startServer, stopServer } from "../test-support/universal-helpers";

// Modelos globais de tarefa e etapa (19/10): criar dentro do produto já cria/vincula o modelo; impacto; "Editar globalmente"
// (só versões em rascunho mudam; publicada indica revisão nova); "Criar novo modelo a partir deste"; vincular etapa a mais tarefas.

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const uniq = () => crypto.randomUUID().slice(0, 6);

async function emptyProduct(name: string) {
  const { product, versionId } = await mkProduct({ name, tasks: [{ key: "a", steps: [{ key: "s1" }] }] });
  return { product, versionId };
}
/** Cria tarefa e etapa PELA API (como a tela faz) e devolve os ids. */
// Nomes sem palavras em comum (o sistema recusa "nome parecido" de propósito): cada chamada gera os seus.
const word = () => crypto.randomBytes(5).toString("hex");
async function viaApi(versionId: string, _taskName?: string, _stepName?: string) {
  const taskName = `${word()} ${word()}`; const stepName = `${word()} ${word()}`;
  const t = await adm(`/versions/${versionId}/tasks`, "POST", { name: taskName, client_action_id: crypto.randomUUID() });
  assert.equal(t.status, 201, JSON.stringify(t.json));
  const s = await adm(`/tasks/${t.json.id}/steps`, "POST", { name: stepName, estimated_minutes: 60, client_action_id: crypto.randomUUID() });
  assert.equal(s.status, 201, JSON.stringify(s.json));
  return { task: t.json, step: s.json };
}

describe("Modelos globais · criar dentro do produto, impacto, editar globalmente e novo modelo", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("G01. criar tarefa e etapa dentro do produto cria o modelo global de cada uma e LIGA a etapa à tarefa-modelo (sem duplicar)", async () => {
    const { versionId } = await emptyProduct("G01");
    const n = uniq();
    const { task, step } = await viaApi(versionId, `Tarefa real ${n}`, `Etapa real ${n}`);
    assert.ok(task.task_model_id, "a tarefa nasceu com modelo global");
    assert.ok(step.step_model_id, "a etapa nasceu com modelo global");
    const join = await prisma.catalog2TaskModelStep.findMany({ where: { task_model_id: task.task_model_id } });
    assert.deepEqual(join.map((j) => j.step_model_id), [step.step_model_id], "etapa ligada à tarefa-modelo");
    // segunda etapa na mesma tarefa: nova ligação, e repetir a mesma etapa não duplica a ligação
    const s2 = await adm(`/tasks/${task.id}/steps`, "POST", { name: `Etapa dois ${n}`, estimated_minutes: 30, client_action_id: crypto.randomUUID() });
    assert.equal(s2.status, 201, JSON.stringify(s2.json));
    const again = await prisma.catalog2TaskModelStep.findMany({ where: { task_model_id: task.task_model_id }, orderBy: { sort_order: "asc" } });
    assert.equal(again.length, 2);
    assert.equal(new Set(again.map((j) => j.step_model_id)).size, 2);
    // o modelo aparece na lista de modelos com a tarefa que o usa
    const det = await adm(`/step-models/${step.step_model_id}`);
    assert.equal(det.status, 200);
    assert.equal(det.json.task_models.length, 1);
    assert.equal(det.json.instances.length, 1);
  });

  it("G02. impacto da edição global: conta tarefas/etapas, produtos, o que é atualizado (rascunho) e o que só indica revisão nova (publicada)", async () => {
    const a = await emptyProduct("G02a"); const b = await emptyProduct("G02b"); const c = await emptyProduct("G02c");
    const n = uniq();
    const A = await viaApi(a.versionId, `Tarefa ${n}`, `Etapa ${n}`);
    const modelId: number = A.step.step_model_id;
    for (const v of [b, c]) {
      const t = await adm(`/versions/${v.versionId}/tasks`, "POST", { name: `${word()} ${word()}`, client_action_id: crypto.randomUUID() });
      const s = await adm(`/tasks/${t.json.id}/steps/from-model`, "POST", { step_model_id: modelId });
      assert.equal(s.status, 201, JSON.stringify(s.json));
    }
    await prisma.catalog2ProductVersion.update({ where: { id: c.versionId }, data: { state: "publicada" } });
    const imp = await adm(`/step-models/${modelId}/impact`);
    assert.equal(imp.status, 200, JSON.stringify(imp.json));
    assert.deepEqual([imp.json.instances, imp.json.editable, imp.json.locked, imp.json.products], [3, 2, 1, 3]);
    assert.equal(imp.json.tasks.length, 3);
    const tImp = await adm(`/task-models/${A.task.task_model_id}/impact`);
    assert.equal(tImp.status, 200);
    assert.equal(tImp.json.instances, 1);
    assert.equal((await adm(`/step-models/999999/impact`)).status, 404);
  });

  it("G03. 'Editar globalmente': atualiza o modelo e as etapas em RASCUNHO de outros produtos; a publicada não muda (fica na revisão antiga); acessos de cada produto são preservados", async () => {
    const a = await emptyProduct("G03a"); const b = await emptyProduct("G03b"); const c = await emptyProduct("G03c");
    const n = uniq();
    const A = await viaApi(a.versionId, `Tarefa ${n}`, `Etapa ${n}`);
    const modelId: number = A.step.step_model_id;
    const inst: Record<string, string> = {};
    for (const [k, v] of [["b", b], ["c", c]] as const) {
      const t = await adm(`/versions/${v.versionId}/tasks`, "POST", { name: `${word()} ${word()}`, client_action_id: crypto.randomUUID() });
      const s = await adm(`/tasks/${t.json.id}/steps/from-model`, "POST", { step_model_id: modelId });
      inst[k] = s.json.id;
    }
    await prisma.catalog2TaskStep.update({ where: { id: inst.b }, data: { ops: { access_keys: ["so-do-b"], access_scope: "some", instructions: "antigo" } } });
    await prisma.catalog2ProductVersion.update({ where: { id: c.versionId }, data: { state: "publicada" } });
    const before = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: modelId } });
    // sem confirmar: recusa e diz quantos produtos são afetados
    const refuse = await adm(`/steps/${A.step.id}`, "PUT", { scope: "model", name: `Etapa global ${n}`, estimated_minutes: 90 });
    assert.equal(refuse.status, 422, JSON.stringify(refuse.json));
    assert.equal(refuse.json.code ?? refuse.json.error?.code, "model_update_not_confirmed");
    const ok = await adm(`/steps/${A.step.id}`, "PUT", { scope: "model", confirm_model_update: true, name: `Etapa global ${n}`, estimated_minutes: 90, ops: { instructions: "novo texto", access_keys: ["so-do-a"], access_scope: "some" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.deepEqual([ok.json.model_effect.updated, ok.json.model_effect.locked], [1, 1], "1 rascunho atualizado, 1 publicada só sinalizada");
    const model = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: modelId } });
    assert.equal(model.revision, before.revision + 1);
    assert.equal(model.name, `Etapa global ${n}`);
    assert.equal((model.ops as any)?.access_keys, undefined, "o modelo não guarda os acessos de um produto");
    const B = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: inst.b } });
    assert.equal(B.name, `Etapa global ${n}`);
    assert.equal(B.estimated_minutes, 90);
    assert.equal(B.step_model_revision, model.revision);
    assert.deepEqual((B.ops as any).access_keys, ["so-do-b"], "acesso do produto B preservado");
    assert.equal((B.ops as any).instructions, "novo texto");
    const C = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: inst.c } });
    assert.notEqual(C.name, `Etapa global ${n}`, "versão publicada NÃO muda sozinha");
    assert.equal(C.step_model_revision, before.revision, "continua na revisão antiga (a tela mostra 'revisão nova disponível')");
  });

  it("G04. 'Criar novo modelo a partir deste' (etapa): modelo novo com ID novo, SÓ a etapa editada passa a usá-lo; o modelo antigo e os outros vínculos não mudam", async () => {
    const a = await emptyProduct("G04a"); const b = await emptyProduct("G04b");
    const n = uniq();
    const A = await viaApi(a.versionId, `Tarefa ${n}`, `Etapa ${n}`);
    const oldId: number = A.step.step_model_id;
    const t = await adm(`/versions/${b.versionId}/tasks`, "POST", { name: `${word()} ${word()}`, client_action_id: crypto.randomUUID() });
    const sb = await adm(`/tasks/${t.json.id}/steps/from-model`, "POST", { step_model_id: oldId });
    const oldBefore = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: oldId } });
    const r = await adm(`/steps/${A.step.id}`, "PUT", { scope: "new_model", estimated_minutes: 120, description: "versão nova da etapa" });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const newId: number = r.json.model_effect.new_model_id;
    assert.notEqual(newId, oldId);
    const mine = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: A.step.id } });
    assert.equal(mine.step_model_id, newId);
    const nm = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: newId } });
    assert.equal(nm.estimated_minutes, 120);
    assert.equal(nm.description, "versão nova da etapa");
    assert.notEqual(nm.name, oldBefore.name, "nome livre: ganha sufixo quando já existe um modelo com o mesmo nome");
    assert.match(nm.name, /novo modelo/);
    const oldAfter = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: oldId } });
    assert.deepEqual([oldAfter.revision, oldAfter.estimated_minutes, oldAfter.name], [oldBefore.revision, oldBefore.estimated_minutes, oldBefore.name], "modelo antigo intacto");
    const other = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: sb.json.id } });
    assert.equal(other.step_model_id, oldId, "o outro produto continua ligado ao modelo antigo");
    assert.equal((await adm(`/step-models/${oldId}/impact`)).json.instances, 1);
  });

  it("G05. 'Criar novo modelo a partir deste' (tarefa): modelo novo ligado só a esta tarefa, com a mesma lista de etapas; 'Editar globalmente' da tarefa atualiza só rascunhos", async () => {
    const a = await emptyProduct("G05a"); const b = await emptyProduct("G05b");
    const n = uniq();
    const A = await viaApi(a.versionId, `Tarefa ${n}`, `Etapa ${n}`);
    const oldId: number = A.task.task_model_id;
    const tb = await adm(`/versions/${b.versionId}/tasks/from-model`, "POST", { model_id: oldId });
    assert.equal(tb.status, 201, JSON.stringify(tb.json));
    // global: o outro produto (rascunho) recebe
    const g = await adm(`/tasks/${A.task.id}`, "PUT", { scope: "model", confirm_model_update: true, description: "descrição global nova" });
    assert.equal(g.status, 200, JSON.stringify(g.json));
    assert.equal(g.json.model_effect.updated, 1);
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: tb.json.id } })).description, "descrição global nova");
    // novo modelo
    const f = await adm(`/tasks/${A.task.id}`, "PUT", { scope: "new_model", description: "só desta tarefa" });
    assert.equal(f.status, 200, JSON.stringify(f.json));
    const newId: number = f.json.model_effect.new_model_id;
    assert.notEqual(newId, oldId);
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: A.task.id } })).task_model_id, newId);
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: tb.json.id } })).task_model_id, oldId);
    const steps = await prisma.catalog2TaskModelStep.findMany({ where: { task_model_id: newId } });
    assert.equal(steps.length, 1, "mesma lista de etapas, por referência");
    assert.equal((await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: oldId } })).description, "descrição global nova", "modelo antigo intacto depois do fork");
  });

  it("G06. vincular uma etapa a mais tarefas: só acrescenta a ligação (sem copiar, sem duplicar, sem mexer em produtos)", async () => {
    const a = await emptyProduct("G06a"); const b = await emptyProduct("G06b");
    const n = uniq();
    const A = await viaApi(a.versionId, `Tarefa ${n}`, `Etapa ${n}`);
    const B = await viaApi(b.versionId, `Tarefa B ${n}`, `Etapa B ${n}`);
    const stepModelId: number = A.step.step_model_id;
    const r = await adm(`/step-models/${stepModelId}/link-tasks`, "POST", { task_model_ids: [B.task.task_model_id] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.added, 1);
    const again = await adm(`/step-models/${stepModelId}/link-tasks`, "POST", { task_model_ids: [B.task.task_model_id] });
    assert.equal(again.json.added, 0, "repetir não duplica");
    assert.equal(await prisma.catalog2TaskModelStep.count({ where: { task_model_id: B.task.task_model_id, step_model_id: stepModelId } }), 1);
    assert.equal(await prisma.catalog2StepModel.count({ where: { name: A.step.name } }), 1, "nenhuma cópia criada");
    assert.equal((await adm(`/step-models/${stepModelId}/link-tasks`, "POST", { task_model_ids: [999999] })).status, 422);
    assert.equal((await adm(`/step-models/${stepModelId}/link-tasks`, "POST", { task_model_ids: [] })).status, 400);
  });
});
