import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// Execução por ETAPA (A8b fase 2): entrega → qualificação do líder → aprovação do cliente (exceto etapa interna) → libera a próxima.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let OUTRO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

async function projeto(cfg: Record<string, Record<string, unknown>>, stageMode = true) {
  const keys = Object.keys(cfg);
  const p = await mkProduct({ name: "Etapas", tasks: [{ key: "t", steps: keys.map((k) => ({ key: k, minutes: 30 })), data: { stage_execution: stageMode ? "stage" : "task" } }] });
  const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
  const idOf = Object.fromEntries(t.steps.map((s) => [s.key, s.id]));
  for (const k of keys) await prisma.catalog2TaskStep.update({ where: { id: idOf[k] }, data: cfg[k] });
  const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
  const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
  const task = byKey(await tasksOf(projectId)).t;
  await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, data_liberacao_execucao: new Date() } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, task.id);
  return { taskId: task.id, idOf, projectId };
}
const stageOf = (taskId: string, stepId: string) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: stepId } });
const status = async (taskId: string, stepId: string) => (await stageOf(taskId, stepId)).status;
const entregar = async (taskId: string, stepId: string) => concluirEtapa(prisma, (await stageOf(taskId, stepId)).id, { userId: LEADER.user.id });
const decidir = async (token: string, taskId: string, stepId: string, tipo: string, decisao: string, comentario?: string) =>
  api(`/api/project-tasks/${taskId}/etapas/${(await stageOf(taskId, stepId)).id}/decisao`, { method: "POST", token, body: { tipo, decisao, ...(comentario ? { comentario } : {}) } });

describe("Prazos da etapa em horas · aprovação e refação (B4/B5)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("DH"); LEADER = await mkLeader(); });
  after(async () => { await stopServer(); });

  it("DH01. cadastro valida horas inteiras ≥ 1 e devolve no detalhe", async () => {
    const p = await mkProduct({ name: "Horas", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
    const id = t.steps[0].id;
    assert.equal((await adm(`/steps/${id}`, "PUT", { approval_hours: 0 })).status, 400);
    assert.equal((await adm(`/steps/${id}`, "PUT", { rework_hours: 1.5 })).status, 400);
    assert.equal((await adm(`/steps/${id}`, "PUT", { approval_hours: 8, rework_hours: 4 })).status, 200);
    const s = (await adm(`/products/${p.product.id}`)).json.versions[0].tasks[0].steps[0];
    assert.equal(s.approval_hours, 8);
    assert.equal(s.rework_hours, 4);
  });

  it("DH02. na execução: aprovação ganha prazo em horas úteis e a refação recalcula o prazo de execução; sem configurar, nada muda", async () => {
    const p = await projeto({ s1: { approval_hours: 8, rework_hours: 4 }, s2: {} });
    const s1 = await stageOf(p.taskId, p.idOf.s1);
    assert.equal(s1.aprovacao_horas, 8);
    assert.equal(s1.refacao_horas, 4);
    await entregar(p.taskId, p.idOf.s1);
    await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    const emAprov = await stageOf(p.taskId, p.idOf.s1);
    assert.equal(emAprov.status, "EM_APROVACAO_CLIENTE");
    const horas = (emAprov.prazo_aprovacao!.getTime() - Date.now()) / 3600000;
    assert.ok(horas > 0 && horas < 24 * 5, `prazo de aprovação coerente (${horas.toFixed(1)}h corridas)`);
    const antes = emAprov.prazo_execucao!.getTime();
    const rej = await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "reprovar", "ajustar o texto");
    assert.equal(rej.status, 200, JSON.stringify(rej.json));
    const depois = await stageOf(p.taskId, p.idOf.s1);
    assert.equal(depois.status, "EM_ANDAMENTO");
    assert.equal(depois.rodada_ajuste, 1);
    assert.ok(depois.prazo_execucao!.getTime() > Date.now(), "novo prazo de refação no futuro");
    assert.notEqual(depois.prazo_execucao!.getTime(), antes, "refação recalculou o prazo");
    // etapa sem horas configuradas: reprovar mantém o MESMO prazo
    await entregar(p.taskId, p.idOf.s1);
    await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "aprovar");
    const s2a = await stageOf(p.taskId, p.idOf.s2);
    assert.equal(s2a.aprovacao_horas, null);
    await entregar(p.taskId, p.idOf.s2);
    await decidir(LEADER.token, p.taskId, p.idOf.s2, "qualificacao", "aprovar");
    const prazoAntes = (await stageOf(p.taskId, p.idOf.s2)).prazo_execucao!.getTime();
    await decidir(CO.token, p.taskId, p.idOf.s2, "aprovacao", "reprovar", "refazer");
    assert.equal((await stageOf(p.taskId, p.idOf.s2)).prazo_execucao!.getTime(), prazoAntes);
  });
});
