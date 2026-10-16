import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { runSubscriptionsTick } from "../lib/catalog2-subscriptions";
import { iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { advanceRotation, acceptOffer, declineOffer, startTaskRotation } from "../lib/task-rotation-engine";
import { skipStagesForContinuity } from "../lib/catalog2-continuity";
import { isAssetValid } from "../lib/client-assets";
import { TestWorld, tasksOf, tokenFor } from "../test-support/first-execution-helpers";

// Continuidade do executor — configuração SIMPLES (16/10): modo, prazo de aceite, o que fazer se indisponível / sem resposta,
// reaproveitamento só no mesmo projeto, dispensa de etapa com crédito, exigir de novo. Tudo local, sem tocar produtos reais.

const W = new TestWorld();
let CO: Awaited<ReturnType<TestWorld["mkCompanyUser"]>>;
let ADMIN: Awaited<ReturnType<TestWorld["mkAdmin"]>>;
let LEADER: Awaited<ReturnType<TestWorld["mkUser"]>>;

const STEPS = [{ minutes: 60, first: true, name: "Implantação da conta" }, { minutes: 60, skip: true, name: "Conferir acessos" }, { minutes: 60, name: "Executar o ciclo" }];
type Cfg = { hours?: number | null; ifUnavailable?: string; afterDeadline?: string; sameProject?: boolean; mode?: string };

/** Contrato mensal já com o ciclo 1 gerado (executor anterior = n1 concluiu o ciclo 0). Devolve a tarefa do ciclo 1 pronta para a escolha. */
async function cycleOne(n1: { nomade: { id: string } }, cfg: Cfg = {}) {
  const { product, versionId } = await W.mkProduct("Continuidade", {
    steps: STEPS, recurring: true, continuity: cfg.mode ?? "recommended",
    taskFlags: { continuity_accept_hours: cfg.hours === undefined ? 2 : cfg.hours, continuity_if_unavailable: cfg.ifUnavailable ?? "normal_queue", continuity_after_deadline: cfg.afterDeadline ?? "normal_queue", reuse_connections_same_project: cfg.sameProject ?? true },
  });
  const q = await W.quote(CO.token, product.id, { period: "mensal" });
  assert.equal(q.status, 201, JSON.stringify(q.json));
  const { projectId, pps } = await W.checkoutAndPay(CO.token, [q.json.id]);
  for (const t of await tasksOf(projectId, 0)) {
    await prisma.projectTask.update({ where: { id: t.id }, data: { status: "CONCLUIDA", nomade_responsavel_id: n1.nomade.id, data_conclusao: new Date(), lider_responsavel_id: LEADER.id } });
  }
  const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
  await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
  await runSubscriptionsTick();
  const paid = await W.api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO.token, body: {} });
  assert.equal(paid.json.paid, true, JSON.stringify(paid.json));
  const [task] = await tasksOf(projectId, 1);
  await prisma.projectTask.update({ where: { id: task.id }, data: { lider_responsavel_id: LEADER.id } });
  return { versionId, product, projectId, subId: sub.id, taskId: task.id, ppId: pps[0].id };
}
const release = async (taskId: string) => {
  await prisma.projectTask.update({ where: { id: taskId }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
  await iniciarEtapasDaTarefa(prisma, taskId);
  await startTaskRotation(taskId);
};
const stageByName = async (taskId: string, titulo: string) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, titulo } });
const keep = (taskId: string) => W.api(`/api/project-tasks/${taskId}/continuity`, { method: "POST", token: CO.token, body: { choice: "keep" } });
const nomadFor = async () => { const n = await W.mkNomad("Tarefa rotina"); return n; };

describe("Continuidade do executor · configuração simples, aceite, dispensa e crédito", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await W.start(app);
    CO = await W.mkCompanyUser("C");
    ADMIN = await W.mkAdmin();
    LEADER = await W.mkUser("lider", "lider");
  });
  after(async () => { await W.cleanup(); await prisma.$disconnect(); });

  it("1. a configuração é salva pela tela (API do Passo 2) com padrões que mantêm o comportamento antigo; vai ao histórico do produto", async () => {
    const { product, versionId } = await W.mkProduct("Config", { steps: STEPS, recurring: true, publish: false });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
    assert.equal(task.executor_continuity, "not_allowed", "padrão: não permitida");
    assert.equal(task.continuity_accept_hours, null);
    assert.equal(task.continuity_if_unavailable, "normal_queue");
    assert.equal(task.continuity_after_deadline, "normal_queue");
    assert.equal(task.reuse_connections_same_project, false, "tarefa criada fora da tela mantém o comportamento antigo");
    const made = await W.api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: ADMIN.token, body: { name: `Tarefa nova pela tela ${Date.now()}`, is_conditional: true } });
    assert.ok([200, 201].includes(made.status), JSON.stringify(made.json));
    const madeRow = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: made.json.id } });
    assert.equal(madeRow.reuse_connections_same_project, true, "tarefa nova pela tela: reaproveita conexões só no mesmo projeto (padrão atual)");
    assert.equal(madeRow.executor_continuity, "not_allowed");
    assert.equal(madeRow.continuity_accept_hours, null);
    const r = await W.api(`/api/admin/catalog2/tasks/${task.id}`, { method: "PUT", token: ADMIN.token, body: { executor_continuity: "recommended", continuity_accept_hours: 2, continuity_if_unavailable: "ask_leader", continuity_after_deadline: "normal_queue", reuse_connections_same_project: true, asset_rule: "first_only" } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const saved = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(saved.executor_continuity, "recommended");
    assert.equal(saved.continuity_accept_hours, 2);
    assert.equal(saved.continuity_if_unavailable, "ask_leader");
    const hist = await prisma.catalog2ProductHistoryEvent.findMany({ where: { product_id: product.id, event_type: "task_updated" } });
    assert.ok(hist.some((h) => /continuidade do executor/.test(h.description)), "a mudança fica no histórico do produto");
    const bad = await W.api(`/api/admin/catalog2/tasks/${task.id}`, { method: "PUT", token: ADMIN.token, body: { continuity_accept_hours: 0 } });
    assert.equal(bad.status, 400, "prazo de 0 hora é recusado");
    // o produto lido de volta traz os campos para a tela
    const read = await W.api(`/api/admin/catalog2/products/${product.id}`, { token: ADMIN.token });
    assert.equal(read.status, 200);
    const draft = (read.json.versions ?? []).find((v: any) => v.id === versionId) ?? read.json.draft_version ?? read.json.version;
    const t = (draft?.tasks ?? []).find((x: any) => x.id === task.id);
    assert.equal(t?.continuity_accept_hours, 2);
    assert.equal(t?.executor_continuity, "recommended");
  });

  it("2. continuidade RECOMENDADA, executor preferido DISPONÍVEL: a tarefa é OFERECIDA a ele com prazo de 2 h (não é atribuída sem o aceite)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1);
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(t.continuity_status, "pending_choice");
    assert.equal(t.continuity_prev_nomade_id, n1.nomade.id);
    assert.equal((await keep(c.taskId)).status, 200);
    await release(c.taskId);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.continuity_status, "offered");
    assert.equal(row.nomade_responsavel_id, null, "ainda sem executor: depende do aceite");
    const offer = await prisma.taskOffer.findFirstOrThrow({ where: { project_task_id: c.taskId }, orderBy: { offered_at: "desc" } });
    assert.equal(offer.nomade_id, n1.nomade.id);
    assert.equal(offer.rotation_round, 0);
    assert.equal(offer.status, "pendente");
    const hours = (offer.expires_at.getTime() - offer.offered_at.getTime()) / 3_600_000;
    assert.ok(Math.abs(hours - 2) < 0.05, `prazo de aceite = 2 h (veio ${hours})`);
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_task_id: c.taskId, kind: "continuity_offered" } });
    assert.equal(logs.length, 1);
    assert.equal((await stageByName(c.taskId, "Conferir acessos")).status !== "CONCLUIDA", true, "nada é dispensado antes do aceite");
  });

  it("3. o executor ACEITA: continua (mesmo executor), a etapa “dispensável” é dispensada, não é cobrada e vira CRÉDITO na próxima fatura; fica no histórico", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1);
    await keep(c.taskId);
    await release(c.taskId);
    const offer = await prisma.taskOffer.findFirstOrThrow({ where: { project_task_id: c.taskId, nomade_id: n1.nomade.id } });
    await acceptOffer(offer.id, n1.user.id);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.nomade_responsavel_id, n1.nomade.id);
    assert.equal(row.continuity_status, "kept");
    const st = await stageByName(c.taskId, "Conferir acessos");
    assert.equal(st.status, "CONCLUIDA");
    const cfg = JSON.parse(st.config_snapshot!);
    assert.equal(cfg.dispensed_by, "continuity");
    assert.ok(cfg.dispensed_price > 0, "o preço da etapa dispensada ficou registrado");
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } });
    assert.ok(Math.abs(sub.pending_credit_amount - cfg.dispensed_price) < 0.02, "crédito = preço da etapa dispensada");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_task_id: c.taskId, kind: { in: ["stage_dispensed", "executor_kept"] } } });
    assert.ok(logs.some((l) => l.kind === "stage_dispensed" && /não são cobradas/.test(l.message)), "motivo no histórico do projeto");
    assert.ok(logs.some((l) => l.kind === "executor_kept"));
    // a etapa de implantação (só 1ª execução) nunca existiu no ciclo 1 e a etapa do ciclo segue aberta
    assert.equal(await prisma.projectTaskStage.count({ where: { project_task_id: c.taskId, titulo: "Implantação da conta" } }), 0);
    assert.notEqual((await stageByName(c.taskId, "Executar o ciclo")).status, "CONCLUIDA");
  });

  it("4. o crédito da dispensa abate a PRÓXIMA fatura (a renovação cobra menos, sem mexer na mensalidade contratada)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1);
    await keep(c.taskId);
    await release(c.taskId);
    await acceptOffer((await prisma.taskOffer.findFirstOrThrow({ where: { project_task_id: c.taskId } })).id, n1.user.id);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } });
    const credit = sub.pending_credit_amount;
    assert.ok(credit > 0);
    // fecha o ciclo 1 e emite o ciclo 2
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    const invs = await prisma.invoice.findMany({ where: { project_id: c.projectId }, orderBy: { created_at: "asc" } });
    assert.equal(invs.length, 3);
    assert.ok(Math.abs(invs[2].amount - (sub.monthly_amount - credit)) < 0.02, `fatura = mensalidade − crédito (${invs[2].amount} vs ${sub.monthly_amount - credit})`);
    const after = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: sub.id } });
    assert.equal(after.pending_credit_amount, 0, "o crédito foi usado");
    assert.equal(after.monthly_amount, sub.monthly_amount, "a mensalidade contratada não mudou");
  });

  it("5. executor preferido RECUSA: segue para a distribuição normal e a etapa dispensável NÃO é dispensada (executor mudou)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1);
    await keep(c.taskId);
    await release(c.taskId);
    const offer = await prisma.taskOffer.findFirstOrThrow({ where: { project_task_id: c.taskId, nomade_id: n1.nomade.id } });
    await declineOffer(offer.id, n1.user.id, "sem agenda");
    await advanceRotation(c.taskId);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.continuity_status, "redistributed");
    assert.notEqual(row.nomade_responsavel_id, n1.nomade.id);
    assert.notEqual((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA", "a etapa dispensável continua valendo");
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } })).pending_credit_amount, 0, "sem crédito");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "executor_changed", message: { contains: "recusou" } } }));
  });

  it("6. o prazo VENCE sem resposta → distribuição normal (depois do prazo = fila normal)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { afterDeadline: "normal_queue" });
    await keep(c.taskId);
    await release(c.taskId);
    await prisma.taskOffer.updateMany({ where: { project_task_id: c.taskId, rotation_round: 0 }, data: { expires_at: new Date(Date.now() - 60_000) } });
    await advanceRotation(c.taskId);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.continuity_status, "redistributed");
    assert.equal((await prisma.taskOffer.findFirstOrThrow({ where: { project_task_id: c.taskId, rotation_round: 0 } })).status, "expirada");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "executor_changed", message: { contains: "não respondeu no prazo" } } }));
  });

  it("7. o prazo VENCE e a regra é “o líder decide”: a tarefa fica retida, o líder é avisado e nada é atribuído sozinho", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { afterDeadline: "ask_leader" });
    await keep(c.taskId);
    await release(c.taskId);
    await prisma.taskOffer.updateMany({ where: { project_task_id: c.taskId, rotation_round: 0 }, data: { expires_at: new Date(Date.now() - 60_000) } });
    const r = await advanceRotation(c.taskId);
    assert.equal(r.action, "waiting");
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.continuity_status, "pending_choice");
    assert.equal(row.auto_nomad_dispatch_enabled, false);
    assert.equal(row.nomade_responsavel_id, null);
    assert.ok(await prisma.systemAlert.findFirst({ where: { user_id: LEADER.id, type: "continuidade_indisponivel", entity_id: c.taskId } }), "o líder foi avisado");
  });

  it("8. executor preferido INDISPONÍVEL: sem aceite possível — vai para a distribuição normal (e avisa o líder); se a regra for “líder decide”, fica aguardando", async () => {
    const n1 = await nomadFor();
    const a = await cycleOne(n1, { ifUnavailable: "normal_queue" });
    await prisma.nomade.update({ where: { id: n1.nomade.id }, data: { status: "inativo" } });
    await keep(a.taskId);
    await release(a.taskId);
    const rowA = await prisma.projectTask.findUniqueOrThrow({ where: { id: a.taskId } });
    assert.equal(rowA.continuity_status, "redistributed");
    assert.equal(await prisma.taskOffer.count({ where: { project_task_id: a.taskId, nomade_id: n1.nomade.id } }), 0, "nem chegou a oferecer a quem está indisponível");
    assert.ok(await prisma.systemAlert.findFirst({ where: { user_id: LEADER.id, type: "continuidade_indisponivel", entity_id: a.taskId } }));

    const n2 = await nomadFor();
    const b = await cycleOne(n2, { ifUnavailable: "ask_leader" });
    await prisma.nomade.update({ where: { id: n2.nomade.id }, data: { status: "inativo" } });
    await keep(b.taskId);
    await release(b.taskId);
    const rowB = await prisma.projectTask.findUniqueOrThrow({ where: { id: b.taskId } });
    assert.equal(rowB.continuity_status, "pending_choice", "o líder decide");
    assert.equal(rowB.auto_nomad_dispatch_enabled, false);
    await prisma.nomade.update({ where: { id: n1.nomade.id }, data: { status: "ativo" } });
  });

  it("9. continuidade OBRIGATÓRIA vai direto (sem oferta com prazo), como sempre foi", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { mode: "required" });
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(t.continuity_status, "kept");
    await release(c.taskId);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.nomade_responsavel_id, n1.nomade.id);
    assert.equal(await prisma.taskOffer.count({ where: { project_task_id: c.taskId, rotation_round: 0 } }), 0);
  });

  it("10. SEM prazo de aceite configurado (padrão antigo) a continuidade “mantida” atribui direto, como antes", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await keep(c.taskId);
    await release(c.taskId);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(row.nomade_responsavel_id, n1.nomade.id);
    assert.equal(row.continuity_status, "kept");
    assert.equal((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA", "dispensa na hora");
  });

  it("11a. o ADMINISTRADOR pode EXIGIR a etapa de antemão (mesmo com o mesmo executor): ela não é dispensada, sem crédito, com justificativa no histórico", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await keep(c.taskId);
    const st = await stageByName(c.taskId, "Conferir acessos");
    const ok = await W.api(`/api/project-tasks/${c.taskId}/etapas/${st.id}/exigir`, { method: "POST", token: ADMIN.token, body: { justificativa: "Acesso novo do cliente: conferir de novo." } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    await release(c.taskId);
    assert.notEqual((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA", "a etapa foi exigida: não é dispensada");
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } })).pending_credit_amount, 0, "sem crédito");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "stage_required_again", message: { contains: "Acesso novo do cliente" } } }));
    assert.equal(await prisma.projectDecisionLog.count({ where: { project_task_id: c.taskId, kind: "stage_dispensed" } }), 0);
  });

  it("11b. depois de dispensada e com a etapa seguinte JÁ em andamento, não dá para exigir (mensagem clara)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await keep(c.taskId);
    await release(c.taskId);
    const st = await stageByName(c.taskId, "Conferir acessos");
    assert.equal(st.status, "CONCLUIDA");
    const r = await W.api(`/api/project-tasks/${c.taskId}/etapas/${st.id}/exigir`, { method: "POST", token: ADMIN.token, body: { justificativa: "Quero conferir de novo, por favor." } });
    assert.equal(r.status, 409);
    assert.match(r.json.error, /etapa seguinte já começou/);
  });

  it("11c. o ADMINISTRADOR exige a etapa dispensada de volta (justificativa obrigatória): a etapa reabre, o crédito é desfeito e o histórico registra", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await keep(c.taskId);
    assert.equal(await skipStagesForContinuity(prisma, c.taskId), 1, "dispensada antes de qualquer etapa começar");
    const st = await stageByName(c.taskId, "Conferir acessos");
    assert.equal(st.status, "CONCLUIDA");
    const before = (await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } })).pending_credit_amount;
    assert.ok(before > 0);
    const noAuth = await W.api(`/api/project-tasks/${c.taskId}/etapas/${st.id}/exigir`, { method: "POST", token: CO.token, body: { justificativa: "quero mesmo assim" } });
    assert.equal(noAuth.status, 403, "o cliente não exige");
    const short = await W.api(`/api/project-tasks/${c.taskId}/etapas/${st.id}/exigir`, { method: "POST", token: ADMIN.token, body: { justificativa: "ok" } });
    assert.equal(short.status, 400, "sem justificativa de verdade, não vale");
    const ok = await W.api(`/api/project-tasks/${c.taskId}/etapas/${st.id}/exigir`, { method: "POST", token: ADMIN.token, body: { justificativa: "A conta do cliente mudou: refazer a conferência de acessos." } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const after = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: st.id } });
    assert.notEqual(after.status, "CONCLUIDA");
    assert.equal(JSON.parse(after.config_snapshot!).required_by_admin, true);
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: c.subId } })).pending_credit_amount, 0, "crédito desfeito");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "stage_required_again", message: { contains: "refazer a conferência" } } }));
    // e uma etapa exigida pelo administrador não é dispensada de novo
    assert.equal(await skipStagesForContinuity(prisma, c.taskId), 0);
  });

  it("12. “Reaproveitar só no mesmo projeto”: execução anterior em OUTRO projeto não dispensa a etapa (e o motivo fica no histórico)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null, sameProject: true });
    const other = await cycleOne(n1, { hours: null, sameProject: true });
    // a tarefa de c passa a ter como "anterior" uma execução de outro projeto
    const otherPrev = (await tasksOf(other.projectId, 0))[0];
    await prisma.projectTask.update({ where: { id: c.taskId }, data: { continuity_prev_task_id: otherPrev.id, continuity_prev_nomade_id: n1.nomade.id } });
    await iniciarEtapasDaTarefa(prisma, c.taskId);
    assert.equal(await skipStagesForContinuity(prisma, c.taskId), 0);
    assert.notEqual((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "stage_dispense_blocked", message: { contains: "outro projeto" } } }));
    // com a opção desligada, vale para qualquer projeto do mesmo cliente
    await prisma.catalog2Task.updateMany({ where: { version_id: c.versionId }, data: { reuse_connections_same_project: false } });
    assert.equal(await skipStagesForContinuity(prisma, c.taskId), 1);
  });

  it("13. mudança que exige REVALIDAR (plataforma/acesso) impede a dispensa", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await prisma.projectProduct.update({ where: { id: c.ppId }, data: { revalidation_reason: "troca_de_plataforma" } });
    await keep(c.taskId);
    await release(c.taskId);
    assert.notEqual((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_task_id: c.taskId, kind: "stage_dispense_blocked", message: { contains: "revalidar" } } }));
  });

  it("14. continuidade NÃO PERMITIDA: nada de executor preferido nem dispensa; e produto antigo (padrão) continua igual", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { mode: "not_allowed", hours: null });
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: c.taskId } });
    assert.equal(t.continuity_status, null);
    assert.equal(t.continuity_prev_nomade_id, null);
    assert.equal(t.auto_nomad_dispatch_enabled, true);
    assert.notEqual((await stageByName(c.taskId, "Conferir acessos")).status, "CONCLUIDA", "sem continuidade a etapa dispensável é executada");
  });

  it("15. regra de acessos: cada regra valida o acesso como descrito (primeira vez, sempre, a cada X dias, mudança do cliente)", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const ok = { status: "validado", last_validated_at: new Date("2026-10-01T12:00:00Z"), expires_at: null, change_reported_at: null };
    assert.equal(isAssetValid(ok, "first_only", { now }), true, "só na primeira execução: acesso validado vale");
    assert.equal(isAssetValid(ok, "always", { now }), false, "sempre: revalida antes de todo ciclo");
    assert.equal(isAssetValid(ok, "every_x_days", { revalidateDays: 30, now }), true);
    assert.equal(isAssetValid(ok, "every_x_days", { revalidateDays: 7, now }), false, "passou de 7 dias");
    assert.equal(isAssetValid({ ...ok, change_reported_at: new Date("2026-10-10T00:00:00Z") }, "on_client_change", { now }), false, "o cliente avisou mudança depois da validação");
    assert.equal(isAssetValid({ ...ok, status: "revalidar" }, "first_only", { now }), false);
  });

  it("16. painel da tarefa: o botão “exigir etapa” só é oferecido ao administrador enquanto a ação é permitida (nunca depois que a etapa seguinte começou)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    await keep(c.taskId);
    const flow = (token: string) => W.api(`/api/task-flow/${c.taskId}`, { token });
    const flag = async (token: string) => (await flow(token)).json.stages.find((s: any) => s.titulo === "Conferir acessos")?.can_require_dispensed_stage;
    assert.equal(await flag(ADMIN.token), true, "antes de dispensar: administrador pode exigir de antemão");
    assert.notEqual(await flag(CO.token), true, "o cliente nunca vê o botão");
    assert.equal((await flow(ADMIN.token)).json.viewer.is_admin, true);
    await release(c.taskId); // dispensa e a etapa seguinte começa
    assert.equal(await flag(ADMIN.token), false, "etapa seguinte já começou: sem botão");
    const stFlow = (await flow(ADMIN.token)).json.stages;
    assert.ok(stFlow.every((s: any) => s.can_require_dispensed_stage === false));
  });

  it("17. painel da tarefa: programar e cancelar a repetição da primeira execução (justificativa obrigatória, estado visível no painel, histórico)", async () => {
    const n1 = await nomadFor();
    const c = await cycleOne(n1, { hours: null });
    const state = async () => (await W.api(`/api/task-flow/${c.taskId}`, { token: ADMIN.token })).json.task;
    assert.equal((await state()).force_first_execution_next, false);
    assert.equal((await state()).project_product_id, c.ppId);
    const url = `/api/admin/catalog2/project-products/${c.ppId}/force-first-execution`;
    assert.equal((await W.api(url, { method: "POST", token: ADMIN.token, body: { reason: "curta" } })).status, 400);
    assert.ok([403, 404].includes((await W.api(url, { method: "POST", token: CO.token, body: { reason: "Mudança estrutural na conta do cliente." } })).status), "cliente não programa");
    assert.equal((await W.api(url, { method: "POST", token: ADMIN.token, body: { reason: "Mudança estrutural na conta do cliente." } })).status, 200);
    assert.equal((await state()).force_first_execution_next, true);
    assert.equal((await W.api(url, { method: "POST", token: ADMIN.token, body: { reason: "Mudei de ideia, não precisa mais.", cancel: true } })).status, 200);
    assert.equal((await state()).force_first_execution_next, false);
    const kinds = (await prisma.projectDecisionLog.findMany({ where: { project_id: c.projectId, kind: { in: ["first_execution_force_requested", "first_execution_force_cancelled"] } }, orderBy: { created_at: "asc" } })).map((l) => l.kind);
    assert.deepEqual(kinds, ["first_execution_force_requested", "first_execution_force_cancelled"]);
  });
});

void tokenFor;
