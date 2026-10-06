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

async function projeto(cfg: Record<string, Partial<{ internal_step: boolean; requires_qualification: boolean; release_next_auto: boolean }>>, stageMode = true) {
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

describe("Execução por etapa · qualificação e aprovação (A8b fase 2)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("EE"); OUTRO = await mkCompanyUser("EO"); LEADER = await mkLeader(); });
  after(async () => { await stopServer(); });

  it("EX01. fluxo completo: entrega → qualificação → aprovação do cliente → libera a próxima; etapa interna não passa pelo cliente", async () => {
    const p = await projeto({ s1: {}, s2: { internal_step: true }, s3: { internal_step: true, requires_qualification: false } });
    const stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: p.taskId } });
    assert.deepEqual(stages.map((s) => [s.visivel_ao_cliente, s.exige_qualificacao]).sort().join("|"), [[false, false], [false, true], [true, true]].sort().join("|"), "configuração materializada em cada etapa");
    assert.equal(await status(p.taskId, p.idOf.s1), "EM_ANDAMENTO");

    const r1 = await entregar(p.taskId, p.idOf.s1);
    assert.equal(r1.etapaEmConferencia, "qualificacao");
    assert.equal(await status(p.taskId, p.idOf.s1), "EM_QUALIFICACAO");
    assert.equal(await status(p.taskId, p.idOf.s2), "BLOQUEADA", "a próxima só abre depois de aprovada");
    assert.equal((await decidir(CO.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar")).status, 403, "cliente não qualifica");
    const q = await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    assert.equal(q.status, 200, JSON.stringify(q.json));
    assert.equal(await status(p.taskId, p.idOf.s1), "EM_APROVACAO_CLIENTE");
    assert.equal((await decidir(OUTRO.token, p.taskId, p.idOf.s1, "aprovacao", "aprovar")).status, 404, "outra empresa não enxerga a tarefa");
    const a = await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "aprovar");
    assert.equal(a.status, 200, JSON.stringify(a.json));
    assert.equal(await status(p.taskId, p.idOf.s1), "CONCLUIDA");
    assert.equal(await status(p.taskId, p.idOf.s2), "EM_ANDAMENTO", "aprovou → libera a próxima sozinha");

    // etapa interna: qualificação do líder basta; o cliente nunca aprova
    await entregar(p.taskId, p.idOf.s2);
    assert.equal(await status(p.taskId, p.idOf.s2), "EM_QUALIFICACAO");
    const qi = await decidir(LEADER.token, p.taskId, p.idOf.s2, "qualificacao", "aprovar");
    assert.equal(qi.status, 200);
    assert.equal(await status(p.taskId, p.idOf.s2), "CONCLUIDA", "etapa interna não vai para o cliente");
    assert.equal(await status(p.taskId, p.idOf.s3), "EM_ANDAMENTO");
    // interna e sem qualificação: conclui assim que o executor entrega, e a tarefa fecha no fim
    const fim = await entregar(p.taskId, p.idOf.s3);
    assert.equal(await status(p.taskId, p.idOf.s3), "CONCLUIDA");
    assert.equal(fim.tarefaConcluida, true);
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: p.taskId } });
    assert.equal(t.status, "CONCLUIDA");
    assert.ok(t.completed_at, "tarefa fechou sem repetir o aceite no fim");
  });

  it("EX02. reprovação (do líder e do cliente) devolve ao MESMO executor com o MESMO prazo e conta rodadas; motivo é obrigatório", async () => {
    const p = await projeto({ s1: {} });
    const antes = await stageOf(p.taskId, p.idOf.s1);
    await prisma.projectTaskStage.update({ where: { id: antes.id }, data: { prazo_execucao: new Date("2030-01-10T12:00:00Z") } });
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "reprovar")).status, 422, "sem motivo");
    assert.equal((await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "reprovar", "Falta o print do acesso")).status, 200);
    let s = await stageOf(p.taskId, p.idOf.s1);
    assert.equal(s.status, "EM_ANDAMENTO");
    assert.equal(s.rodada_ajuste, 1);
    assert.equal(s.lider_id, LEADER.user.id, "mesmo executor");
    assert.equal(s.prazo_execucao?.toISOString(), "2030-01-10T12:00:00.000Z", "mesmo prazo");
    await entregar(p.taskId, p.idOf.s1);
    await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    assert.equal((await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "reprovar", "A cor está errada")).status, 200);
    s = await stageOf(p.taskId, p.idOf.s1);
    assert.deepEqual([s.status, s.rodada_ajuste], ["EM_ANDAMENTO", 2]);
    assert.equal(s.prazo_execucao?.toISOString(), "2030-01-10T12:00:00.000Z");
    await entregar(p.taskId, p.idOf.s1);
    await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    assert.equal((await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "aprovar")).status, 200);
    const hist = await api(`/api/project-tasks/${p.taskId}/etapas/${s.id}/historico`, { token: CO.token });
    assert.equal(hist.status, 200);
    assert.deepEqual([...new Set(hist.json.data.map((h: any) => h.decision))].sort(), ["aprovada", "reprovada", "solicitada"]);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: p.taskId } })).status, "CONCLUIDA");
  });

  it("EX03. 'liberar a próxima automaticamente' desligado: aprovada, a próxima só abre com a liberação do líder", async () => {
    const p = await projeto({ s1: { requires_qualification: false, release_next_auto: false }, s2: {} });
    const r = await entregar(p.taskId, p.idOf.s1);
    assert.equal(r.etapaEmConferencia, "aprovacao", "sem qualificação vai direto para o cliente");
    const a = await decidir(CO.token, p.taskId, p.idOf.s1, "aprovacao", "aprovar");
    assert.equal(a.json.aguardandoLiberacao, true);
    assert.equal(await status(p.taskId, p.idOf.s1), "CONCLUIDA");
    assert.equal(await status(p.taskId, p.idOf.s2), "BLOQUEADA");
    const stageId = (await stageOf(p.taskId, p.idOf.s1)).id;
    assert.equal((await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/liberar-proxima`, { method: "POST", token: CO.token })).status, 403, "cliente não libera");
    const lib = await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/liberar-proxima`, { method: "POST", token: LEADER.token });
    assert.equal(lib.status, 200, JSON.stringify(lib.json));
    assert.equal(await status(p.taskId, p.idOf.s2), "EM_ANDAMENTO");
    assert.equal((await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/liberar-proxima`, { method: "POST", token: LEADER.token })).status, 422, "nada mais para liberar");
  });

  it("EX04. etapa interna: invisível para o cliente até o líder avisar; aviso gera alerta e passa a mostrar a etapa", async () => {
    const p = await projeto({ s1: { internal_step: true } });
    const stageId = (await stageOf(p.taskId, p.idOf.s1)).id;
    assert.equal((await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/historico`, { token: CO.token })).status, 404);
    assert.equal((await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/avisar-cliente`, { method: "POST", token: CO.token, body: { mensagem: "teste" } })).status, 403);
    const av = await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/avisar-cliente`, { method: "POST", token: LEADER.token, body: { mensagem: "O acesso enviado está incorreto" } });
    assert.equal(av.status, 200, JSON.stringify(av.json));
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).visivel_ao_cliente, true);
    const alerta = await prisma.systemAlert.findFirst({ where: { type: "aviso_etapa_cliente", user_id: CO.user.id } });
    assert.ok(alerta?.message.includes("O acesso enviado está incorreto"));
    assert.equal((await api(`/api/project-tasks/${p.taskId}/etapas/${stageId}/historico`, { token: CO.token })).status, 200);
  });

  it("EX05. tarefa no modo padrão (sem execução por etapa) segue como sempre: etapa conclui direto e as rotas novas recusam", async () => {
    const p = await projeto({ s1: {}, s2: {} }, false);
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).exige_qualificacao, false);
    await entregar(p.taskId, p.idOf.s1);
    assert.equal(await status(p.taskId, p.idOf.s1), "CONCLUIDA");
    assert.equal(await status(p.taskId, p.idOf.s2), "EM_ANDAMENTO");
    const r = await decidir(LEADER.token, p.taskId, p.idOf.s2, "qualificacao", "aprovar");
    assert.equal(r.status, 422);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: p.taskId } })).stage_execution, "task");
  });

  it("EX07. painel do projeto: cada perfil recebe só o que pode ver e fazer (cliente não vê etapa interna; botões vêm do servidor)", async () => {
    const p = await projeto({ s1: { internal_step: true }, s2: {} });
    const verTudo = await api(`/api/task-flow/${p.taskId}`, { token: LEADER.token });
    assert.equal(verTudo.status, 200, JSON.stringify(verTudo.json));
    assert.equal(verTudo.json.task.stage_execution, "stage");
    assert.equal(verTudo.json.stages.length, 2);
    const interna = verTudo.json.stages.find((e: any) => e.titulo.includes("s1"));
    assert.equal(interna.interna, true);
    assert.equal(interna.can_warn_client, true, "líder pode avisar o cliente de problema numa etapa interna");
    const cliente = await api(`/api/task-flow/${p.taskId}`, { token: CO.token });
    assert.equal(cliente.json.stages.length, 1, "o cliente não vê a etapa interna");
    assert.equal(cliente.json.stages[0].can_warn_client, false);
    assert.equal(cliente.json.viewer.can_manage_sla, false);
    assert.equal(verTudo.json.viewer.can_manage_sla, true);
    // entrega a etapa 1 (interna): só o líder vê can_qualify
    await entregar(p.taskId, p.idOf.s1);
    const l = (await api(`/api/task-flow/${p.taskId}`, { token: LEADER.token })).json.stages.find((e: any) => e.titulo.includes("s1"));
    assert.equal(l.can_qualify, true);
    assert.equal((await api(`/api/task-flow/${p.taskId}`, { token: ADMIN.token })).json.stages.find((e: any) => e.titulo.includes("s1")).can_qualify, true);
    await decidir(LEADER.token, p.taskId, p.idOf.s1, "qualificacao", "aprovar");
    await entregar(p.taskId, p.idOf.s2);
    await decidir(LEADER.token, p.taskId, p.idOf.s2, "qualificacao", "aprovar");
    const c = (await api(`/api/task-flow/${p.taskId}`, { token: CO.token })).json.stages[0];
    assert.equal(c.can_approve, true, "a etapa visível aguarda a aprovação do cliente");
    assert.equal(c.can_qualify, false);
    const outro = await api(`/api/task-flow/${p.taskId}`, { token: OUTRO.token });
    assert.equal(outro.status, 404, "outra empresa não enxerga a tarefa");
  });

  it("EX06. cadastro: modo por etapa e flags da etapa são salvos, voltam no detalhe e são copiados ao criar nova versão", async () => {
    const p = await mkProduct({ name: "Cad", tasks: [{ key: "t", steps: [{ key: "a" }, { key: "b" }] }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId }, include: { steps: true } });
    assert.equal((await adm(`/tasks/${t.id}`, "PUT", { stage_execution: "stage", scope: "product" })).status, 200);
    assert.equal((await adm(`/tasks/${t.id}`, "PUT", { stage_execution: "xyz" })).status, 400);
    const a = t.steps.find((s) => s.key === "a")!;
    assert.equal((await adm(`/steps/${a.id}`, "PUT", { internal_step: true, requires_qualification: false, release_next_auto: false, scope: "product" })).status, 200);
    const det = await adm(`/products/${p.product.id}`);
    const task = det.json.versions[0].tasks[0];
    assert.equal(task.stage_execution, "stage");
    const sa = task.steps.find((s: any) => s.key === "a");
    assert.deepEqual([sa.internal_step, sa.requires_qualification, sa.release_next_auto], [true, false, false]);
    const sb = task.steps.find((s: any) => s.key === "b");
    assert.deepEqual([sb.internal_step, sb.requires_qualification, sb.release_next_auto], [false, true, true], "padrões");
  });
});
