import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa, atribuirExecutoresPendentes } from "../lib/stage-engine";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, mkUser, SEL, startServer, stopServer, tasksOf, tokenFor, uid } from "../test-support/universal-helpers";

// Executor por etapa (A8b-3): preferir o mesmo nômade (reserva por prazo), nunca o mesmo, e "novo automático" sem herdar calado.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
let A: Awaited<ReturnType<typeof mkNomade>>;
let B: Awaited<ReturnType<typeof mkNomade>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
async function mkNomade(tag: string) {
  const user = await mkUser("nomad", "nomades");
  const nomade = await prisma.nomade.create({ data: { id: `nm-${tag}-${uid()}`, name: `Nômade ${tag}`, status: "ativo", email: `${user.id}@example.test`, user_id: user.id } });
  return { user, nomade, token: tokenFor(user) };
}

async function projeto(policy: "auto" | "prefer_same_as_step" | "other_than_step", acceptHours?: number) {
  const p = await mkProduct({ name: "Preferência", tasks: [{ key: "t", steps: ["s1", "s2"].map((k) => ({ key: k, minutes: 30 })), data: { stage_execution: "stage" } }] });
  const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
  const idOf = Object.fromEntries(t.steps.map((s) => [s.key, s.id]));
  for (const k of ["s1", "s2"]) await prisma.catalog2TaskStep.update({ where: { id: idOf[k] }, data: { requires_qualification: false, ...(k === "s2" && acceptHours ? { executor_accept_hours: acceptHours } : {}) } });
  const fl = await adm(`/tasks/${t.id}/steps/flow`, "PUT", { steps: [
    { step_id: idOf.s1, depends_on: [] },
    { step_id: idOf.s2, depends_on: ["s1"], executor_policy: policy, ...(policy === "auto" ? {} : { executor_same_as_key: "s1" }) },
  ] });
  assert.equal(fl.status, 200, JSON.stringify(fl.json));
  const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
  const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
  const task = byKey(await tasksOf(projectId)).t;
  await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, nomade_responsavel_id: A.nomade.id, data_liberacao_execucao: new Date() } });
  // s1 é executada pelo nômade A (aberta como líder só para não disparar rodízio, e depois entregue a A)
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, task.id);
  const s1 = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: task.id, catalog_step_ref: idOf.s1 } });
  await prisma.projectTaskStage.update({ where: { id: s1.id }, data: { executor_type: "nomad", nomade_id: A.nomade.id } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id, catalog_step_ref: idOf.s2 }, data: { executor_type: "nomad", lider_id: null } });
  return { taskId: task.id, idOf, s1Id: s1.id };
}
const s2Of = (taskId: string, idOf: Record<string, string>) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: idOf.s2 } });
async function concluirS1(p: Awaited<ReturnType<typeof projeto>>) {
  await concluirEtapa(prisma, p.s1Id, { userId: LEADER.user.id });
  const r = await api(`/api/project-tasks/${p.taskId}/etapas/${p.s1Id}/decisao`, { method: "POST", token: CO.token, body: { tipo: "aprovacao", decisao: "aprovar" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  await atribuirExecutoresPendentes(p.taskId);
}
const mural = async (token: string) => ((await api("/api/nomades/me/disponiveis", { token })).json.data ?? []).map((e: any) => e.id) as string[];
const aceitar = (token: string, stageId: string) => api(`/api/nomades/me/etapas/${stageId}/aceitar`, { method: "PATCH", token });

describe("Executor por etapa · preferir / nunca o mesmo (A8b-3)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("PR"); LEADER = await mkLeader(); A = await mkNomade("A"); B = await mkNomade("B"); });
  after(async () => { await stopServer(); });

  it("PR01. cadastro aceita as novas regras e exige a etapa de referência anterior", async () => {
    const p = await mkProduct({ name: "Regras", tasks: [{ key: "t", steps: ["s1", "s2"].map((k) => ({ key: k, minutes: 30 })) }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
    const id = Object.fromEntries(t.steps.map((s) => [s.key, s.id]));
    const sem = await adm(`/tasks/${t.id}/steps/flow`, "PUT", { steps: [{ step_id: id.s1, depends_on: [] }, { step_id: id.s2, depends_on: ["s1"], executor_policy: "prefer_same_as_step" }] });
    assert.equal(sem.status, 422);
    const futura = await adm(`/tasks/${t.id}/steps/flow`, "PUT", { steps: [{ step_id: id.s1, depends_on: [], executor_policy: "other_than_step", executor_same_as_key: "s2" }, { step_id: id.s2, depends_on: ["s1"] }] });
    assert.equal(futura.status, 422, "só vale referenciar etapa que termina ANTES");
    const ok = await adm(`/tasks/${t.id}/steps/flow`, "PUT", { steps: [{ step_id: id.s1, depends_on: [] }, { step_id: id.s2, depends_on: ["s1"], executor_policy: "other_than_step", executor_same_as_key: "s1" }] });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal((await adm(`/steps/${id.s2}`, "PUT", { executor_accept_hours: 0 })).status, 400);
    assert.equal((await adm(`/steps/${id.s2}`, "PUT", { executor_accept_hours: 3 })).status, 200);
  });

  it("PR02. preferir o mesmo: etapa reservada ao nômade A (alerta + prazo); B não vê nem aceita; A aceita; depois do prazo abre para B", async () => {
    const p = await projeto("prefer_same_as_step", 4);
    await concluirS1(p);
    const s2 = await s2Of(p.taskId, p.idOf);
    assert.equal(s2.status, "AGUARDANDO_EXECUTOR");
    assert.equal(s2.nomade_preferido_id, A.nomade.id);
    assert.ok(s2.reservada_ate && s2.reservada_ate.getTime() > Date.now() + 3 * 3600000, "reserva de 4 h (prazo da etapa)");
    assert.ok(await prisma.systemAlert.findFirst({ where: { type: "etapa_reservada", user_id: A.user.id } }), "A foi avisado");
    assert.equal((await mural(B.token)).includes(s2.id), false, "B não vê enquanto reservada");
    assert.equal((await mural(A.token)).includes(s2.id), true);
    assert.equal((await aceitar(B.token, s2.id)).status, 403);
    // reserva vencida → abre para os demais
    await prisma.projectTaskStage.update({ where: { id: s2.id }, data: { reservada_ate: new Date(Date.now() - 1000) } });
    assert.equal((await mural(B.token)).includes(s2.id), true);
    assert.equal((await aceitar(B.token, s2.id)).status, 200);
    assert.equal((await s2Of(p.taskId, p.idOf)).nomade_id, B.nomade.id);
  });

  it("PR03. preferir o mesmo: o nômade A aceita dentro do prazo e fica com a etapa", async () => {
    const p = await projeto("prefer_same_as_step");
    await concluirS1(p);
    const s2 = await s2Of(p.taskId, p.idOf);
    const cfg = await prisma.taskRoutingSettings.findUnique({ where: { id: "singleton" } });
    assert.ok(s2.reservada_ate!.getTime() - Date.now() > ((cfg?.stage_preferred_accept_minutes ?? 120) - 5) * 60000, "sem prazo na etapa vale o padrão da plataforma (2 h)");
    assert.equal((await aceitar(A.token, s2.id)).status, 200);
    assert.equal((await s2Of(p.taskId, p.idOf)).nomade_id, A.nomade.id);
  });

  it("PR04. nunca o mesmo: A não vê nem aceita a etapa seguinte; B aceita", async () => {
    const p = await projeto("other_than_step");
    await concluirS1(p);
    const s2 = await s2Of(p.taskId, p.idOf);
    assert.equal(s2.nomade_excluido_id, A.nomade.id);
    assert.equal(s2.reservada_ate, null);
    assert.equal((await mural(A.token)).includes(s2.id), false);
    assert.equal((await aceitar(A.token, s2.id)).status, 403);
    assert.equal((await aceitar(B.token, s2.id)).status, 200);
  });

  it("PR05. novo automático: a etapa seguinte NÃO herda calada o nômade da tarefa — fica na vaga para qualquer um", async () => {
    const p = await projeto("auto");
    await concluirS1(p);
    const s2 = await s2Of(p.taskId, p.idOf);
    assert.equal(s2.status, "AGUARDANDO_EXECUTOR");
    assert.equal(s2.nomade_id, null);
    assert.equal((await mural(B.token)).includes(s2.id), true);
    assert.equal((await aceitar(B.token, s2.id)).status, 200);
  });
});
