import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, mkUser, SEL, startServer, stopServer, tasksOf, uid } from "../test-support/universal-helpers";

// Execução por ETAPA (A8b fase 2): entrega → qualificação do líder → aprovação do cliente (exceto etapa interna) → libera a próxima.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
let NOMADE: { id: string };
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
async function projeto(payout: "at_end" | "per_stage") {
  const p = await mkProduct({ name: "Pagamento", tasks: [{ key: "t", steps: ["s1", "s2"].map((k) => ({ key: k, minutes: 30 })), data: { stage_execution: "stage", stage_payout_mode: payout } }] });
  const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
  const idOf = Object.fromEntries(t.steps.map((s) => [s.key, s.id]));
  for (const k of ["s1", "s2"]) await prisma.catalog2TaskStep.update({ where: { id: idOf[k] }, data: { requires_qualification: false } });
  const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
  const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
  const task = byKey(await tasksOf(projectId)).t;
  assert.equal(task.stage_payout_mode, payout, "modo materializado na tarefa do projeto");
  await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, nomade_responsavel_id: NOMADE.id, data_liberacao_execucao: new Date() } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, task.id);
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "nomad", nomade_id: NOMADE.id, valor_nomade: 100 } });
  return { taskId: task.id, idOf };
}
const stageOf = (taskId: string, stepId: string) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: stepId } });
const entregar = async (taskId: string, stepId: string) => concluirEtapa(prisma, (await stageOf(taskId, stepId)).id, { userId: LEADER.user.id });
const aprovar = async (taskId: string, stepId: string) => api(`/api/project-tasks/${taskId}/etapas/${(await stageOf(taskId, stepId)).id}/decisao`, { method: "POST", token: CO.token, body: { tipo: "aprovacao", decisao: "aprovar" } });
const creditos = async (taskId: string) => (await prisma.walletLedger.findMany({ where: { reference_id: { in: [taskId, ...(await prisma.projectTaskStage.findMany({ where: { project_task_id: taskId }, select: { id: true } })).map((s) => s.id)] }, type: "task_payout" } })).reduce((a, e) => a + e.amount, 0);

describe("Pagamento do nômade por etapa (A8b-4)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("PY"); LEADER = await mkLeader(); const u = await mkUser("nomad", "nomades"); NOMADE = await prisma.nomade.create({ data: { id: `nm-${uid()}`, name: "Nômade PY", email: `${u.id}@example.test`, user_id: u.id } }); });
  after(async () => { await stopServer(); });

  it("PY01. cadastro: modo de pagamento validado e devolvido no detalhe", async () => {
    const p = await mkProduct({ name: "Modo", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 30 }] }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" } });
    assert.equal(t.stage_payout_mode, "at_end", "padrão antigo");
    assert.equal((await adm(`/tasks/${t.id}`, "PUT", { stage_payout_mode: "talvez" })).status, 400);
    assert.equal((await adm(`/tasks/${t.id}`, "PUT", { stage_payout_mode: "per_stage" })).status, 200);
    assert.equal((await prisma.catalog2Task.findUniqueOrThrow({ where: { id: t.id } })).stage_payout_mode, "per_stage");
  });

  it("PY02. por etapa: cada etapa aprovada paga na hora, uma vez só; o fim da tarefa não paga de novo", async () => {
    const p = await projeto("per_stage");
    await entregar(p.taskId, p.idOf.s1);
    assert.equal(await creditos(p.taskId), 0, "entregue mas ainda não aprovada: nada creditado");
    assert.equal((await aprovar(p.taskId, p.idOf.s1)).status, 200);
    assert.equal(await creditos(p.taskId), 100, "aprovou a etapa 1 → paga 100");
    await prisma.projectTaskStage.update({ where: { id: (await stageOf(p.taskId, p.idOf.s2)).id }, data: { status: "EM_ANDAMENTO" } });
    await entregar(p.taskId, p.idOf.s2);
    assert.equal((await aprovar(p.taskId, p.idOf.s2)).status, 200);
    assert.equal(await creditos(p.taskId), 200, "etapa 2 aprovada → +100; tarefa fechou sem pagar em dobro");
  });

  it("PY03. no fim (padrão): nada é creditado durante as etapas; só no aceite final, com o total", async () => {
    const p = await projeto("at_end");
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await aprovar(p.taskId, p.idOf.s1)).status, 200);
    assert.equal(await creditos(p.taskId), 0, "créditos retidos");
    await prisma.projectTaskStage.update({ where: { id: (await stageOf(p.taskId, p.idOf.s2)).id }, data: { status: "EM_ANDAMENTO" } });
    await entregar(p.taskId, p.idOf.s2);
    assert.equal((await aprovar(p.taskId, p.idOf.s2)).status, 200);
    assert.equal(await creditos(p.taskId), 200, "fim da tarefa → total das etapas");
  });
});
