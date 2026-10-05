import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { reevaluateProjectDependencies } from "../lib/project-dependencies";
import { computeDue, syncSlaClocks } from "../lib/sla";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, SEL, setPricingSettings, startServer, stopServer, tasksOf, type ProductSpec } from "../test-support/universal-helpers";

// Estrutura universal v2 · aprovação como portão de fluxo + prazos/SLA estruturados (dias úteis/corridos, pausa, retomada).

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const gateApi = (id: string, token: string, decision: "approve" | "reject", comment?: string) => api(`/api/approval-gates/${id}/decision`, { method: "POST", token, body: { decision, ...(comment ? { comment } : {}) } });
const stageOf = async (taskId: string, key: string) => {
  const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId }, select: { catalog2_task_id: true } });
  const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { key, task_id: t.catalog2_task_id! } });
  return prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: step.id } });
};
const stageStatus = async (taskId: string, key: string) => (await stageOf(taskId, key)).status;
const gateRow = (taskId: string, key: string) => prisma.projectApprovalGate.findUniqueOrThrow({ where: { project_task_id_gate_key: { project_task_id: taskId, gate_key: key } } });

type GateBody = { key: string; name: string; anchor_task_key: string; anchor_step_key?: string; position: string; approver_kind?: string; group_key?: string; sequence_no?: number; group_mode?: string; rejection_return_step_key?: string; requires_comment?: boolean };

/** Produto com 1 tarefa de 2 etapas (prep → pub), portões e regras de prazo cadastrados pela API oficial, publicado e ativo. */
async function mkFlowProduct(o: { gates?: GateBody[]; sla?: Array<Record<string, unknown>>; extra?: Partial<ProductSpec> } = {}) {
  const { product, versionId } = await mkProduct({ name: `Fluxo ${crypto.randomUUID().slice(0, 4)}`, tasks: [{ key: "camp", steps: [{ key: "prep" }, { key: "pub" }] }], ...(o.extra ?? {}) });
  for (const g of o.gates ?? []) { const r = await adm(`/versions/${versionId}/approval-gates`, "POST", g); assert.equal(r.status, 201, JSON.stringify(r.json)); }
  for (const s of o.sla ?? []) { const r = await adm(`/versions/${versionId}/sla-rules`, "POST", s); assert.equal(r.status, 201, JSON.stringify(r.json)); }
  const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId };
}
/** Contrata, deixa as etapas com o líder e abre a primeira. */
async function buyAndStart(productId: string) {
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: productId, selection: SEL } });
  assert.equal(q.status, 201, JSON.stringify(q.json));
  const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
  const task = byKey(await tasksOf(projectId)).camp;
  await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, data_liberacao_execucao: new Date() } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, task.id);
  return { projectId, taskId: task.id };
}
const finish = (taskId: string, key: string) => stageOf(taskId, key).then((s) => concluirEtapa(prisma, s.id, { userId: LEADER.user.id }));

describe("Estrutura universal v2 · portões de aprovação e SLA", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("GA"); LEADER = await mkLeader(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  // ───────────────────────── PORTÕES DE APROVAÇÃO ─────────────────────────
  it("G01. aprovação ANTES DE PUBLICAR: o cliente aprova; só depois a etapa 'publicar' é liberada — nunca antes", async () => {
    const { product } = await mkFlowProduct({ gates: [{ key: "cli", name: "Cliente aprova campanha, criativos e configuração", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_publish", approver_kind: "client", rejection_return_step_key: "prep" }] });
    const { taskId } = await buyAndStart(product.id);
    assert.equal(await stageStatus(taskId, "prep"), "EM_ANDAMENTO", "preparar pode começar normalmente");
    await finish(taskId, "prep");
    assert.equal(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO", "publicar fica esperando a aprovação do cliente");
    const pubStage = await stageOf(taskId, "pub");
    await assert.rejects(() => concluirEtapa(prisma, pubStage.id, { userId: LEADER.user.id }), /aprovação|aprovad/i, "não conclui nem publica sem aprovação");
    assert.equal(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO");
    const gate = await gateRow(taskId, "cli");
    assert.equal(gate.status, "pendente");
    // o cliente enxerga e decide; quem não pode, não pode
    const flow = await api(`/api/task-flow/${taskId}`, { token: CO.token });
    assert.equal(flow.status, 200, JSON.stringify(flow.json));
    assert.equal(flow.json.approval_gates[0].can_decide, true);
    assert.equal(flow.json.approval_gates[0].position_label, "Antes de publicar");
    const pend = await api("/api/approval-gates/pending", { token: CO.token });
    assert.ok((pend.json.data as any[]).some((x) => x.gate_id === gate.id), "aparece nas pendências do cliente");
    const out = await gateApi(gate.id, CO.token, "approve", "Tudo certo.");
    assert.equal(out.status, 200, JSON.stringify(out.json));
    assert.notEqual(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO", "liberada depois da aprovação");
    assert.equal((await gateRow(taskId, "cli")).status, "aprovada");
    const rep = await gateApi(gate.id, CO.token, "approve");
    assert.equal(rep.status, 409, "não aprova duas vezes");
  });

  it("G02. REPROVAÇÃO devolve para a etapa configurada, registra motivo e rodada; a publicação continua travada até nova aprovação", async () => {
    const { product } = await mkFlowProduct({ gates: [{ key: "cli", name: "Aprovação do cliente", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_publish", approver_kind: "client", rejection_return_step_key: "prep" }] });
    const { taskId } = await buyAndStart(product.id);
    await finish(taskId, "prep");
    const gate = await gateRow(taskId, "cli");
    const semMotivo = await gateApi(gate.id, CO.token, "reject");
    assert.equal(semMotivo.status, 422, "reprovar exige motivo");
    const rej = await gateApi(gate.id, CO.token, "reject", "O criativo 2 está com o texto errado.");
    assert.equal(rej.status, 200, JSON.stringify(rej.json));
    assert.equal(rej.json.returned_to, "prep");
    assert.equal((await gateRow(taskId, "cli")).status, "reprovada");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).status, "EM_AJUSTES");
    assert.equal(await stageStatus(taskId, "prep"), "EM_ANDAMENTO", "etapa de retorno reaberta");
    assert.equal(await stageStatus(taskId, "pub"), "BLOQUEADA");
    const ev = await prisma.projectApprovalGateEvent.findFirstOrThrow({ where: { gate_id: gate.id, decision: "reprovada" } });
    assert.equal(ev.comment, "O criativo 2 está com o texto errado.");
    assert.equal(ev.returned_to_stage_key, "prep");
    const decidirReprovado = await gateApi(gate.id, CO.token, "approve");
    assert.equal(decidirReprovado.status, 409, "enquanto não corrigir, não decide de novo");
    // corrige e conclui de novo: nova rodada, publicar espera outra vez
    await finish(taskId, "prep");
    const g2 = await gateRow(taskId, "cli");
    assert.deepEqual({ s: g2.status, r: g2.round }, { s: "pendente", r: 1 });
    assert.equal(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO");
    assert.equal((await gateApi(g2.id, CO.token, "approve")).status, 200);
    assert.notEqual(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO");
    const hist = (await api(`/api/task-flow/${taskId}`, { token: CO.token })).json.approval_gates[0].history as any[];
    assert.deepEqual(hist.map((h) => h.decision), ["reprovada", "aprovada"]);
  });

  it("G03. aprovações em SEQUÊNCIA (interna → cliente) e em PARALELO", async () => {
    const seq = await mkFlowProduct({ gates: [
      { key: "int", name: "Revisão interna", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "internal", group_key: "g", sequence_no: 1, group_mode: "sequence" },
      { key: "cli", name: "Cliente", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "client", group_key: "g", sequence_no: 2, group_mode: "sequence" },
    ] });
    const a = await buyAndStart(seq.product.id);
    await finish(a.taskId, "prep");
    const gi = await gateRow(a.taskId, "int"), gc = await gateRow(a.taskId, "cli");
    const antes = await gateApi(gc.id, CO.token, "approve");
    assert.equal(antes.status, 409);
    assert.equal(antes.json.code, "gate_not_actionable", "o cliente só decide depois da aprovação interna");
    assert.equal((await gateApi(gi.id, LEADER.token, "approve")).status, 200);
    assert.equal(await stageStatus(a.taskId, "pub"), "AGUARDANDO_APROVACAO", "ainda falta o cliente");
    assert.equal((await gateApi(gc.id, CO.token, "approve")).status, 200);
    assert.notEqual(await stageStatus(a.taskId, "pub"), "AGUARDANDO_APROVACAO");

    const par = await mkFlowProduct({ gates: [
      { key: "int", name: "Interna", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "internal", group_key: "p", sequence_no: 1, group_mode: "parallel" },
      { key: "cli", name: "Cliente", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "client", group_key: "p", sequence_no: 2, group_mode: "parallel" },
    ] });
    const b = await buyAndStart(par.product.id);
    await finish(b.taskId, "prep");
    const [pi, pc] = [await gateRow(b.taskId, "int"), await gateRow(b.taskId, "cli")];
    assert.equal((await gateApi(pc.id, CO.token, "approve")).status, 200, "em paralelo: qualquer ordem");
    assert.equal(await stageStatus(b.taskId, "pub"), "AGUARDANDO_APROVACAO");
    assert.equal((await gateApi(pi.id, LEADER.token, "approve")).status, 200);
    assert.notEqual(await stageStatus(b.taskId, "pub"), "AGUARDANDO_APROVACAO");
  });

  it("G04. permissões: cliente não decide portão interno; líder não decide o do cliente; administração em nome do cliente exige motivo", async () => {
    const { product } = await mkFlowProduct({ gates: [
      { key: "int", name: "Interna", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "internal" },
      { key: "cli", name: "Cliente", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", approver_kind: "client" },
    ] });
    const { taskId } = await buyAndStart(product.id);
    await finish(taskId, "prep");
    const gi = await gateRow(taskId, "int"), gc = await gateRow(taskId, "cli");
    assert.equal((await gateApi(gi.id, CO.token, "approve")).status, 403);
    assert.equal((await gateApi(gc.id, LEADER.token, "approve")).status, 403);
    const semMotivo = await gateApi(gc.id, ADMIN.token, "approve");
    assert.equal(semMotivo.status, 422);
    assert.equal(semMotivo.json.code, "gate_on_behalf_comment");
    assert.equal((await gateApi(gc.id, ADMIN.token, "approve", "Cliente aprovou por telefone em 02/10.")).status, 200);
    const outro = await mkCompanyUser("Intruso");
    assert.equal((await gateApi(gi.id, outro.token, "approve")).status, 404, "outra empresa nem enxerga a tarefa");
  });

  it("G05. aprovação ANTES DE ENTREGAR segura a entrega da tarefa; DEPOIS DE UMA ETAPA e ANTES DE INICIAR também funcionam", async () => {
    const entrega = await mkFlowProduct({ gates: [{ key: "ent", name: "Antes de entregar", anchor_task_key: "camp", position: "before_deliver", approver_kind: "leader" }] });
    const a = await buyAndStart(entrega.product.id);
    await finish(a.taskId, "prep");
    await finish(a.taskId, "pub");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: a.taskId } })).status, "AGUARDANDO_DEPENDENCIA_PRODUTO", "entrega segurada");
    const g = await gateRow(a.taskId, "ent");
    assert.equal((await gateApi(g.id, LEADER.token, "approve")).status, 200);
    await reevaluateProjectDependencies(prisma, a.projectId);
    const st = (await prisma.projectTask.findUniqueOrThrow({ where: { id: a.taskId } })).status;
    assert.ok(["AGUARDANDO_QUALIFICACAO", "EM_APROVACAO", "AGUARDANDO_REVISAO"].includes(st), `seguiu para o aceite (${st})`);

    const depois = await mkFlowProduct({ gates: [{ key: "dep", name: "Depois da preparação", anchor_task_key: "camp", anchor_step_key: "prep", position: "after_step", approver_kind: "client" }] });
    const b = await buyAndStart(depois.product.id);
    await finish(b.taskId, "prep");
    assert.equal(await stageStatus(b.taskId, "pub"), "AGUARDANDO_APROVACAO", "a etapa seguinte espera a aprovação");

    const antes = await mkFlowProduct({ gates: [{ key: "ini", name: "Antes de iniciar", anchor_task_key: "camp", anchor_step_key: "prep", position: "before_step", approver_kind: "client" }] });
    const c = await buyAndStart(antes.product.id);
    assert.equal(await stageStatus(c.taskId, "prep"), "AGUARDANDO_APROVACAO", "nem a primeira etapa começa sem aprovação");
    assert.equal((await gateApi((await gateRow(c.taskId, "ini")).id, CO.token, "approve")).status, 200);
    assert.notEqual(await stageStatus(c.taskId, "prep"), "AGUARDANDO_APROVACAO");
  });

  it("G06. produto SEM portões segue exatamente como antes (nenhuma linha de portão, nenhuma espera)", async () => {
    const { product } = await mkFlowProduct();
    const { taskId } = await buyAndStart(product.id);
    assert.equal(await prisma.projectApprovalGate.count({ where: { project_task_id: taskId } }), 0);
    await finish(taskId, "prep");
    assert.notEqual(await stageStatus(taskId, "pub"), "AGUARDANDO_APROVACAO");
  });

  it("G07. cadastro: valida âncora/etapas, copia para a nova versão e registra no histórico", async () => {
    const { product, versionId } = await mkProduct({ name: "Cadastro de portões", tasks: [{ key: "camp", steps: [{ key: "prep" }, { key: "pub" }] }] });
    const bad = [
      { name: "x", anchor_task_key: "fantasma", position: "before_deliver" },
      { name: "x", anchor_task_key: "camp", position: "before_step" },
      { name: "x", anchor_task_key: "camp", anchor_step_key: "fantasma", position: "before_step" },
      { name: "x", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step", rejection_return_step_key: "fantasma" },
      { name: "x", anchor_task_key: "camp", anchor_step_key: "pub", position: "inventada" },
    ];
    for (const b of bad) { const r = await adm(`/versions/${versionId}/approval-gates`, "POST", b); assert.ok([400, 422].includes(r.status), JSON.stringify([b, r.json])); }
    const ok = await adm(`/versions/${versionId}/approval-gates`, "POST", { key: "g", name: "Cliente aprova", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_publish", approver_kind: "client" });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    const upd = await adm(`/approval-gates/${ok.json.id}`, "PUT", { requires_comment: true });
    assert.equal(upd.status, 200);
    assert.equal((await adm(`/versions/${versionId}/approval-gates`, "POST", { key: "g", name: "dup", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_step" })).status, 422);
    assert.ok(await prisma.catalog2ProductHistoryEvent.findFirst({ where: { product_id: product.id, event_type: "approval_gate_added" } }));
    const detail = await adm(`/products/${product.id}`);
    assert.equal(detail.json.versions[0].approval_gates[0].requires_comment, true);
    await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    const nv = await adm(`/products/${product.id}/versions`, "POST");
    assert.equal(nv.status, 201, JSON.stringify(nv.json));
    assert.equal(await prisma.catalog2ApprovalGate.count({ where: { version_id: nv.json.version_id, key: "g" } }), 1, "nova versão copia os portões");
    // publicar com portão inválido é recusado com a mensagem do portão
    await prisma.catalog2Task.deleteMany({ where: { version_id: nv.json.version_id, key: "camp" } });
    const pub = await adm(`/versions/${nv.json.version_id}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 422);
    assert.ok(JSON.stringify(pub.json).includes("Portão de aprovação"), "pendência do portão aparece na publicação");
  });

  // ───────────────────────── SLA ─────────────────────────
  const SLA_TASK = { key: "sla_t", name: "Prazo da tarefa", scope_kind: "task", target_key: "camp", amount: 7, unit: "business_days", anchor: "prerequisites_valid" };

  it("S01. SLA em DIAS ÚTEIS e em DIAS CORRIDOS: o prazo parte dos pré-requisitos válidos", async () => {
    const { product } = await mkFlowProduct({ sla: [SLA_TASK, { key: "sla_c", name: "Ciclo", scope_kind: "cycle", amount: 30, unit: "calendar_days", anchor: "cycle_start" }] });
    const { projectId, taskId } = await buyAndStart(product.id);
    assert.equal(await prisma.projectSlaClock.count({ where: { project_id: projectId } }), 2, "um relógio por regra");
    await syncSlaClocks(prisma, projectId);
    const taskClock = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_id: projectId, scope_kind: "task" } });
    assert.equal(taskClock.status, "correndo");
    assert.ok(taskClock.anchor_at && taskClock.due_at);
    assert.equal(taskClock.due_at!.getTime(), computeDue(taskClock.anchor_at!, 7, "business_days").getTime());
    assert.ok(![0, 6].includes(taskClock.due_at!.getDay()), "prazo em dia útil");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId } })).due_date?.getTime(), taskClock.due_at!.getTime(), "o prazo vira o due_date da tarefa");
    const cycle = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_id: projectId, scope_kind: "cycle" } });
    assert.equal(cycle.due_at!.getTime() - cycle.anchor_at!.getTime(), 30 * 24 * 3600 * 1000, "30 dias corridos");
  });

  it("S02. relatório: até o 3º dia útil depois do fechamento do ciclo; implantação: sete dias úteis depois dos pré-requisitos", async () => {
    const { product } = await mkFlowProduct({
      extra: { flags: { has_initial_implementation: true } },
      sla: [
        { key: "ciclo", name: "Ciclo", scope_kind: "cycle", amount: 30, unit: "calendar_days", anchor: "cycle_start" },
        { key: "rel", name: "Relatório", scope_kind: "task", target_key: "camp", amount: 3, unit: "business_days", anchor: "cycle_close" },
        { key: "impl", name: "Implantação", scope_kind: "implementation", amount: 7, unit: "business_days", anchor: "prerequisites_valid" },
      ],
    });
    const { projectId } = await buyAndStart(product.id);
    await syncSlaClocks(prisma, projectId);
    const cycle = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_id: projectId, scope_kind: "cycle" } });
    const rel = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_id: projectId, rule_key: "rel" } });
    assert.ok(cycle.due_at, "ciclo tem prazo");
    assert.equal(rel.anchor_at!.getTime(), cycle.due_at!.getTime(), "relatório ancora no fechamento do ciclo");
    assert.equal(rel.due_at!.getTime(), computeDue(cycle.due_at!, 3, "business_days").getTime());
    assert.equal(await prisma.projectSlaClock.count({ where: { project_id: projectId, scope_kind: "implementation" } }), 1);
  });

  it("S03. PAUSA e RETOMADA: motivo, responsável pela pendência e o que faltava continua de onde parou", async () => {
    const { product } = await mkFlowProduct({ sla: [SLA_TASK] });
    const { projectId, taskId } = await buyAndStart(product.id);
    await syncSlaClocks(prisma, projectId);
    const clock0 = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_task_id: taskId } });
    const motivos = await api("/api/sla/reasons", { token: CO.token });
    assert.equal(motivos.json.reasons.length, 9);
    assert.deepEqual(motivos.json.reasons.map((r: any) => r.key).sort(), ["acesso_nao_liberado", "aprovacao_pendente", "bloqueio_revisao_plataforma", "conexao_vencida_insuficiente", "falta_resposta_cliente", "material_nao_enviado", "pagamento_plataforma_pendente", "pagina_destino_indisponivel", "verba_indisponivel"]);
    assert.equal((await api(`/api/sla/task/${taskId}/pause`, { method: "POST", token: CO.token, body: { reason: "verba_indisponivel" } })).status, 403, "só a equipe pausa");
    const bad = await api(`/api/sla/task/${taskId}/pause`, { method: "POST", token: LEADER.token, body: { reason: "motivo_inventado" } });
    assert.equal(bad.status, 400);
    const p = await api(`/api/sla/task/${taskId}/pause`, { method: "POST", token: LEADER.token, body: { reason: "verba_indisponivel", responsible_party: "client", note: "Cliente ainda não depositou a verba." } });
    assert.equal(p.status, 200, JSON.stringify(p.json));
    assert.equal(p.json.paused_clocks, 1);
    const view1 = (await api(`/api/sla/task/${taskId}`, { token: CO.token })).json.data[0];
    assert.equal(view1.status, "pausado");
    assert.equal(view1.pauses[0].reason_key, "verba_indisponivel");
    assert.equal(view1.pauses[0].responsible_party, "client");
    assert.match(view1.pauses[0].reason, /Verba indisponível/);
    // simula 2 dias de pausa
    await prisma.projectSlaPause.updateMany({ where: { clock_id: clock0.id }, data: { started_at: new Date(Date.now() - 2 * 24 * 3600 * 1000) } });
    const r = await api(`/api/sla/task/${taskId}/resume`, { method: "POST", token: LEADER.token, body: {} });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.resumed_clocks, 1);
    const clock1 = await prisma.projectSlaClock.findUniqueOrThrow({ where: { id: clock0.id } });
    assert.equal(clock1.status, "correndo");
    assert.ok(clock1.due_at!.getTime() > clock0.due_at!.getTime(), "o prazo foi empurrado pela pausa");
    assert.ok(clock1.paused_minutes >= 2 * 24 * 60 - 5, `minutos pausados: ${clock1.paused_minutes}`);
    assert.equal(clock1.original_due_at!.getTime(), clock0.original_due_at!.getTime(), "o prazo original é preservado");
    const pause = await prisma.projectSlaPause.findFirstOrThrow({ where: { clock_id: clock0.id } });
    assert.ok(pause.resolved_at && (pause.minutes ?? 0) >= 2 * 24 * 60 - 5);
    assert.equal(await prisma.projectSlaPause.count({ where: { clock_id: clock0.id, resolved_at: null } }), 0);
  });

  it("S04. portão de aprovação pendente PAUSA a parte dependente (aprovação pendente) e a aprovação retoma", async () => {
    const { product } = await mkFlowProduct({
      gates: [{ key: "cli", name: "Cliente aprova", anchor_task_key: "camp", anchor_step_key: "pub", position: "before_publish", approver_kind: "client", rejection_return_step_key: "prep" }],
      sla: [SLA_TASK],
    });
    const { projectId, taskId } = await buyAndStart(product.id);
    await syncSlaClocks(prisma, projectId);
    await finish(taskId, "prep");
    const c = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_task_id: taskId } });
    assert.equal(c.status, "pausado");
    const pz = await prisma.projectSlaPause.findFirstOrThrow({ where: { clock_id: c.id, resolved_at: null } });
    assert.equal(pz.reason_key, "aprovacao_pendente");
    assert.equal(pz.responsible_party, "client");
    assert.equal((await gateApi((await gateRow(taskId, "cli")).id, CO.token, "approve")).status, 200);
    assert.equal((await prisma.projectSlaClock.findUniqueOrThrow({ where: { id: c.id } })).status, "correndo", "aprovou: o prazo volta a contar");
  });

  it("S05. SLA estourado aparece como estourado e concluído quando a tarefa termina; produto sem regras não cria relógio", async () => {
    const { product } = await mkFlowProduct({ sla: [SLA_TASK] });
    const { projectId, taskId } = await buyAndStart(product.id);
    await syncSlaClocks(prisma, projectId);
    const c = await prisma.projectSlaClock.findFirstOrThrow({ where: { project_task_id: taskId } });
    await prisma.projectSlaClock.update({ where: { id: c.id }, data: { due_at: new Date(Date.now() - 3600 * 1000) } });
    assert.equal((await api(`/api/sla/task/${taskId}`, { token: CO.token })).json.data[0].status, "estourado");
    await prisma.projectTask.update({ where: { id: taskId }, data: { status: "CONCLUIDA" } });
    assert.equal((await api(`/api/sla/task/${taskId}`, { token: CO.token })).json.data[0].status, "concluido");
    const sem = await mkFlowProduct();
    const b = await buyAndStart(sem.product.id);
    assert.equal(await prisma.projectSlaClock.count({ where: { project_id: b.projectId } }), 0);
  });

  it("S06. cadastro de prazos: escopos, unidades e alvos validados; copiado para a nova versão", async () => {
    const { product, versionId } = await mkProduct({ name: "Cadastro SLA", tasks: [{ key: "camp", steps: [{ key: "prep" }, { key: "pub" }] }] });
    const ruim = [
      { name: "x", scope_kind: "task", target_key: "fantasma", amount: 3 },
      { name: "x", scope_kind: "task", amount: 3 },
      { name: "x", scope_kind: "step", target_key: "camp:fantasma", amount: 3 },
      { name: "x", scope_kind: "approval", target_key: "portao_inexistente", amount: 3 },
      { name: "x", scope_kind: "cycle", amount: 0 },
      { name: "x", scope_kind: "cycle", amount: 5, unit: "semanas" },
      { name: "x", scope_kind: "inventado", amount: 5 },
      { name: "x", scope_kind: "product", amount: 5, anchor: "cycle_close" },
    ];
    for (const b of ruim) { const r = await adm(`/versions/${versionId}/sla-rules`, "POST", b); assert.ok([400, 422].includes(r.status), JSON.stringify([b, r.json])); }
    for (const [unit, scope, target] of [["business_days", "step", "camp:pub"], ["calendar_days", "cycle", undefined], ["business_hours", "task", "camp"]] as const) {
      const r = await adm(`/versions/${versionId}/sla-rules`, "POST", { name: `Prazo ${unit}`, scope_kind: scope, ...(target ? { target_key: target } : {}), amount: 2, unit });
      assert.equal(r.status, 201, JSON.stringify(r.json));
    }
    const opts = await adm("/sla-options");
    assert.deepEqual(opts.json.units.map((u: any) => u.key).sort(), ["business_days", "business_hours", "calendar_days"]);
    assert.equal(opts.json.scopes.length, 9);
    await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    const nv = await adm(`/products/${product.id}/versions`, "POST");
    assert.equal(await prisma.catalog2SlaRule.count({ where: { version_id: nv.json.version_id } }), 3);
  });
});
