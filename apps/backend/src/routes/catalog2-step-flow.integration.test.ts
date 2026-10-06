import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, mkUser, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// Fluxo das etapas (A8): sequência, paralelo, dependências específicas e regra de executor — do cadastro até o projeto rodando.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

const keys = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `s${i + 1}`, minutes: 60 }));
async function produto(n = 5) {
  const p = await mkProduct({ name: "Fluxo", tasks: [{ key: "t", steps: keys(n) }] });
  const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
  const idOf = Object.fromEntries(task.steps.map((s) => [s.key, s.id]));
  return { ...p, taskId: task.id, idOf };
}
const flow = (taskId: string, idOf: Record<string, string>, cfg: Record<string, { dep?: string[] | null; same?: string }>) =>
  adm(`/tasks/${taskId}/steps/flow`, "PUT", { steps: Object.entries(cfg).map(([k, v]) => ({ step_id: idOf[k], ...(v.dep !== undefined ? { depends_on: v.dep } : {}), ...(v.same ? { executor_policy: "same_as_step", executor_same_as_key: v.same } : {}) })) });

async function publicarEContratar(versionId: string, productId: string) {
  const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: productId, selection: SEL } });
  assert.equal(q.status, 201, JSON.stringify(q.json));
  const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
  const tasks = byKey(await tasksOf(projectId));
  return { projectId, task: tasks.t };
}
const stageOf = (taskId: string, versionStepId: string) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: versionStepId } });
async function iniciar(taskId: string) {
  await prisma.projectTask.update({ where: { id: taskId }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, data_liberacao_execucao: new Date() } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: taskId }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, taskId);
}
const concluir = async (taskId: string, stepId: string) => concluirEtapa(prisma, (await stageOf(taskId, stepId)).id, { userId: LEADER.user.id });
const statusOf = async (taskId: string, stepId: string) => (await stageOf(taskId, stepId)).status;

describe("Fluxo das etapas · cadastro e execução (A8)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("FL"); LEADER = await mkLeader(); });
  after(async () => { await stopServer(); });

  it("FT01. cadastro: salva o fluxo, recusa círculo/etapa inexistente, devolve no detalhe e limpa referências ao remover etapa", async () => {
    const p = await produto(4);
    const ok = await flow(p.taskId, p.idOf, { s1: { dep: [] }, s2: { dep: [] }, s3: { dep: ["s1", "s2"] }, s4: { dep: ["s3"], same: "s3" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const cyc = await flow(p.taskId, p.idOf, { s1: { dep: ["s4"] } });
    assert.equal(cyc.status, 422);
    assert.match(cyc.json.error, /círculo/);
    const ghost = await flow(p.taskId, p.idOf, { s2: { dep: ["fantasma"] } });
    assert.equal(ghost.status, 422);
    assert.equal((await flow(p.taskId, p.idOf, { s4: { same: "s1" } })).status, 200, "s1 é ancestral de s4 (via s3): permitido");
    assert.equal((await adm(`/tasks/${p.taskId}/steps/flow`, "PUT", { steps: [{ step_id: "nao-existe", depends_on: [] }] })).status, 422);
    const det = await adm(`/products/${p.product.id}`);
    const steps = det.json.versions[0].tasks[0].steps;
    const s3 = steps.find((s: any) => s.key === "s3");
    assert.deepEqual(s3.depends_on, ["s1", "s2"]);
    assert.equal(steps.find((s: any) => s.key === "s4").executor_policy, "same_as_step");
    // remover s3: s4 deixa de depender dela e volta ao executor automático
    assert.equal((await adm(`/steps/${p.idOf.s3}`, "DELETE")).status, 200);
    const s4 = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: p.idOf.s4 } });
    assert.deepEqual(JSON.parse(s4.depends_on_json!), []);
    const v = await adm(`/versions/${p.versionId}/validate`);
    assert.ok(!JSON.stringify(v.json).includes("círculo"));
  });

  it("FT02. execução: 1, 2 e 3 começam juntas; a 4 só depois da 3; a 5 só depois de todas; a tarefa só encerra no fim", async () => {
    const p = await produto(5);
    assert.equal((await flow(p.taskId, p.idOf, { s1: { dep: [] }, s2: { dep: [] }, s3: { dep: [] }, s4: { dep: ["s3"] }, s5: { dep: ["s1", "s2", "s3", "s4"] } })).status, 200);
    const { task } = await publicarEContratar(p.versionId, p.product.id);
    const stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: task.id } });
    assert.equal(stages.length, 5);
    assert.deepEqual(stages.filter((s) => s.status === "PENDENTE").length, 3, "três etapas já nascem liberadas");
    assert.equal((await stageOf(task.id, p.idOf.s5)).depende_da_etapa_anterior, true);
    await iniciar(task.id);
    for (const k of ["s1", "s2", "s3"]) assert.equal(await statusOf(task.id, p.idOf[k]), "EM_ANDAMENTO", `${k} começa junto`);
    assert.equal(await statusOf(task.id, p.idOf.s4), "BLOQUEADA");
    assert.equal(await statusOf(task.id, p.idOf.s5), "BLOQUEADA");
    await concluir(task.id, p.idOf.s1);
    assert.equal(await statusOf(task.id, p.idOf.s4), "BLOQUEADA", "a 4 não depende da 1");
    const r3 = await concluir(task.id, p.idOf.s3);
    assert.equal(await statusOf(task.id, p.idOf.s4), "EM_ANDAMENTO", "a 4 abre quando a 3 termina (sem esperar a 2)");
    assert.ok(r3.proxima);
    assert.equal(await statusOf(task.id, p.idOf.s5), "BLOQUEADA");
    await concluir(task.id, p.idOf.s2);
    assert.equal(await statusOf(task.id, p.idOf.s5), "BLOQUEADA", "falta a 4");
    await concluir(task.id, p.idOf.s4);
    assert.equal(await statusOf(task.id, p.idOf.s5), "EM_ANDAMENTO");
    const fim = await concluir(task.id, p.idOf.s5);
    assert.ok(fim.enviadaParaAprovacao || fim.enviadaParaQualificacao || fim.enviadaParaRevisao || fim.tarefaConcluida, "tarefa segue para o aceite depois da última etapa");
  });

  it("FT03. tarefa sem fluxo configurado continua em sequência (compatibilidade)", async () => {
    const p = await produto(3);
    const { task } = await publicarEContratar(p.versionId, p.product.id);
    const stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: task.id }, orderBy: { ordem: "asc" } });
    assert.deepEqual(stages.map((s) => s.status), ["PENDENTE", "BLOQUEADA", "BLOQUEADA"]);
    assert.ok(stages.every((s) => s.depende_de_json === null));
    await iniciar(task.id);
    assert.equal(await statusOf(task.id, p.idOf.s2), "BLOQUEADA");
    await concluir(task.id, p.idOf.s1);
    assert.equal(await statusOf(task.id, p.idOf.s2), "EM_ANDAMENTO");
    assert.equal(await statusOf(task.id, p.idOf.s3), "BLOQUEADA");
  });

  it("FT04. 'mesmo executor': a etapa que abre herda o nômade da etapa indicada; sem a regra, não herda", async () => {
    const p = await produto(3);
    assert.equal((await flow(p.taskId, p.idOf, { s1: { dep: [] }, s2: { dep: ["s1"], same: "s1" }, s3: { dep: ["s1"] } })).status, 200);
    const { task } = await publicarEContratar(p.versionId, p.product.id);
    const nomadeId = `nomade-${crypto.randomBytes(5).toString("hex")}`;
    const user = await mkUser("nomade", "nomade");
    await prisma.nomade.create({ data: { id: nomadeId, name: `Nômade ${nomadeId}`, email: `${nomadeId}@example.test`, user_id: user.id } });
    const s2 = await stageOf(task.id, p.idOf.s2);
    assert.equal(s2.herdar_executor_de, p.idOf.s1, "a regra foi materializada na etapa do projeto");
    assert.equal((await stageOf(task.id, p.idOf.s3)).herdar_executor_de, null);
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", data_liberacao_execucao: new Date() } });
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "nomad" } });
    await prisma.projectTaskStage.update({ where: { id: (await stageOf(task.id, p.idOf.s1)).id }, data: { nomade_id: nomadeId, status: "EM_ANDAMENTO", iniciada_em: new Date() } });
    await concluir(task.id, p.idOf.s1);
    const a = await stageOf(task.id, p.idOf.s2);
    assert.equal(a.nomade_id, nomadeId, "a 2 manteve o mesmo nômade");
    assert.equal(a.status, "EM_ANDAMENTO");
    const b = await stageOf(task.id, p.idOf.s3);
    assert.equal(b.nomade_id, null, "a 3 não herda: executor novo/automático");
    assert.equal(b.status, "AGUARDANDO_EXECUTOR");
    await prisma.nomade.deleteMany({ where: { id: nomadeId } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("FT05. só a regra de executor (sem mexer na ordem): a etapa 5 volta para o MESMO executor da etapa 1, mesmo passando por outras", async () => {
    const p = await produto(5);
    assert.equal((await flow(p.taskId, p.idOf, { s5: { same: "s1" } })).status, 200, "s1 vem antes da s5 na sequência padrão");
    const { task } = await publicarEContratar(p.versionId, p.product.id);
    const s5 = await stageOf(task.id, p.idOf.s5);
    assert.equal(s5.herdar_executor_de, p.idOf.s1);
    assert.deepEqual(JSON.parse(s5.depende_de_json!), [p.idOf.s4], "a ordem continua sendo a sequência de sempre");
    const nomadeId = `nomade-${crypto.randomBytes(5).toString("hex")}`;
    const user = await mkUser("nomade", "nomade");
    await prisma.nomade.create({ data: { id: nomadeId, name: `Nômade ${nomadeId}`, email: `${nomadeId}@example.test`, user_id: user.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", data_liberacao_execucao: new Date() } });
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "nomad" } });
    await prisma.projectTaskStage.update({ where: { id: (await stageOf(task.id, p.idOf.s1)).id }, data: { nomade_id: nomadeId, status: "EM_ANDAMENTO", iniciada_em: new Date() } });
    await concluir(task.id, p.idOf.s1);
    // as etapas 2, 3 e 4 foram feitas por outras pessoas (ou pelo sistema): só importa que a 5 volta ao da 1
    for (const k of ["s2", "s3", "s4"]) {
      const st = await stageOf(task.id, p.idOf[k]);
      await prisma.projectTaskStage.update({ where: { id: st.id }, data: { status: "EM_ANDAMENTO", iniciada_em: new Date(), nomade_id: null } });
      await concluir(task.id, p.idOf[k]);
    }
    const fim = await stageOf(task.id, p.idOf.s5);
    assert.equal(fim.nomade_id, nomadeId);
    assert.equal(fim.status, "EM_ANDAMENTO");
    await prisma.nomade.deleteMany({ where: { id: nomadeId } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("FT06. quem recebe a etapa (cadastro): líder específico exige líder válido e ativo; trocar para nômade limpa o líder; detalhe devolve", async () => {
    const p = await produto(2);
    const put = (id: string, body: Record<string, unknown>) => adm(`/steps/${id}`, "PUT", { ...body, scope: "product" });
    assert.equal((await put(p.idOf.s1, { executor_kind: "leader", leader_mode: "specific" })).status, 422, "falta escolher o líder");
    assert.equal((await put(p.idOf.s1, { executor_kind: "leader", leader_mode: "specific", leader_user_id: "nao-existe" })).status, 422);
    const comum = await mkUser("company_user", "empresas");
    assert.equal((await put(p.idOf.s1, { executor_kind: "leader", leader_mode: "specific", leader_user_id: comum.id })).status, 422, "usuário que não é líder");
    assert.equal((await put(p.idOf.s1, { executor_kind: "robo" })).status, 400);
    const ok = await put(p.idOf.s1, { executor_kind: "leader", leader_mode: "specific", leader_user_id: LEADER.user.id });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const det = await adm(`/products/${p.product.id}`);
    const s1 = det.json.versions[0].tasks[0].steps.find((s: any) => s.key === "s1");
    assert.deepEqual([s1.executor_kind, s1.leader_mode, s1.leader_user_id], ["leader", "specific", LEADER.user.id]);
    assert.equal((await put(p.idOf.s1, { leader_mode: "auto" })).status, 200);
    assert.equal((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: p.idOf.s1 } })).leader_user_id, null, "líder da área não guarda líder específico");
    assert.equal((await put(p.idOf.s1, { executor_kind: "nomad" })).status, 200);
    const back = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: p.idOf.s1 } });
    assert.deepEqual([back.executor_kind, back.leader_mode, back.leader_user_id], ["nomad", "auto", null]);
  });

  it("FT07. execução: etapa de líder específico já nasce atribuída e começa com ele (sem líder na tarefa); equipe interna começa sozinha; nômade segue aguardando executor", async () => {
    const p = await produto(3);
    await prisma.catalog2TaskStep.update({ where: { id: p.idOf.s1 }, data: { executor_kind: "leader", leader_mode: "specific", leader_user_id: LEADER.user.id } });
    await prisma.catalog2TaskStep.update({ where: { id: p.idOf.s2 }, data: { executor_kind: "internal" } });
    const { task } = await publicarEContratar(p.versionId, p.product.id);
    const a = await stageOf(task.id, p.idOf.s1), b = await stageOf(task.id, p.idOf.s2), c = await stageOf(task.id, p.idOf.s3);
    assert.deepEqual([a.executor_type, a.lider_id], ["leader", LEADER.user.id]);
    assert.equal(b.executor_type, "internal");
    assert.equal(c.executor_type, "nomad", "padrão continua nômade");
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", data_liberacao_execucao: new Date() } });
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).lider_responsavel_id, null);
    await iniciarEtapasDaTarefa(prisma, task.id);
    const a1 = await stageOf(task.id, p.idOf.s1);
    assert.equal(a1.status, "EM_ANDAMENTO", "o líder específico recebe a etapa direto");
    assert.equal(a1.lider_id, LEADER.user.id);
    await concluirEtapa(prisma, a1.id, { userId: LEADER.user.id });
    assert.equal((await stageOf(task.id, p.idOf.s2)).status, "EM_ANDAMENTO", "equipe interna: começa sozinha");
    await concluirEtapa(prisma, (await stageOf(task.id, p.idOf.s2)).id, { userId: LEADER.user.id });
    assert.equal((await stageOf(task.id, p.idOf.s3)).status, "AGUARDANDO_EXECUTOR", "nômade: aguarda oferta/rodízio");
  });
});
