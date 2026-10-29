import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { storeDeliverableFile, DELIVERABLE_FILES_SUBPATH } from "../lib/catalog2-deliverable-files";
import { deleteUploadedFile } from "../lib/file-storage";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, setPricingSettings, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// Fluxo universal de etapas e entregáveis (19/10): entregável dentro da etapa (vínculo = step_id), rascunho do entregável,
// exclusão que respeita referências, aprovação do cliente explícita (ops.client_approval) e "esta etapa não tem entregáveis".

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const publish = (versionId: string) => adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
const full = (name: string, extra: Record<string, unknown> = {}) => ({ name, description: `Descrição de ${name}`, type: "arquivo", responsible: "executor", is_required: true, requires_approval: true, visibility: "client", ...extra });

async function mkDraftProduct(name: string) {
  const { product, versionId } = await mkProduct({ name, tasks: [{ key: "a", steps: [{ key: "s1" }, { key: "s2" }] }] });
  const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "a" }, include: { steps: { orderBy: { sort_order: "asc" } } } });
  return { product, versionId, task, s1: task.steps[0], s2: task.steps[1] };
}
const rowOf = (id: string) => prisma.catalog2TaskDeliverable.findUniqueOrThrow({ where: { id } });
const testFiles: string[] = [];

describe("Entregáveis dentro da etapa · rascunho, vínculo e exclusão", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("FD"); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); for (const id of testFiles) deleteUploadedFile(DELIVERABLE_FILES_SUBPATH, id); });

  it("F01. criar já ligado à etapa; rascunho aceita incompleto (sem nome) e fica marcado; o mesmo registro vira completo ao concluir", async () => {
    const { task, s1 } = await mkDraftProduct("F01");
    const ok = await adm(`/tasks/${task.id}/deliverables`, "POST", full("Plano estratégico inicial de mídia paga", { step_id: s1.id }));
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.equal(ok.json.step_id, s1.id);
    assert.equal(ok.json.draft_incomplete, false);
    const dr = await adm(`/tasks/${task.id}/deliverables`, "POST", { draft: true, step_id: s1.id, type: "arquivo" });
    assert.equal(dr.status, 201, JSON.stringify(dr.json));
    assert.equal(dr.json.name, "Entregável sem nome");
    assert.equal(dr.json.draft_incomplete, true);
    const done = await adm(`/deliverables/${dr.json.id}`, "PUT", { ...full("Relatório de otimização", { step_id: s1.id }), draft: false });
    assert.equal(done.status, 200, JSON.stringify(done.json));
    const row = await rowOf(dr.json.id);
    assert.equal(row.draft_incomplete, false);
    assert.equal(row.id, dr.json.id, "é o MESMO registro (nada de cópia)");
    assert.equal(await prisma.catalog2TaskDeliverable.count({ where: { task_id: task.id } }), 2);
  });

  it("F02. PUT sem a chave draft NÃO mexe na marca; draft:true marca; o ID e a chave permanecem", async () => {
    const { task } = await mkDraftProduct("F02");
    const c = await adm(`/tasks/${task.id}/deliverables`, "POST", { ...full("Contrato"), draft: true });
    assert.equal(c.json.draft_incomplete, true);
    const other = await adm(`/deliverables/${c.json.id}`, "PUT", { visibility: "internal" });
    assert.equal(other.status, 200, JSON.stringify(other.json));
    assert.equal((await rowOf(c.json.id)).draft_incomplete, true, "editar outro campo não conclui");
    const again = await adm(`/deliverables/${c.json.id}`, "PUT", { draft: true, name: "" });
    assert.equal(again.status, 200, JSON.stringify(again.json));
    const row = await rowOf(c.json.id);
    assert.equal(row.draft_incomplete, true);
    assert.equal(row.key, c.json.key);
    assert.equal(row.name, "Contrato", "nome em branco no rascunho não apaga o nome atual");
  });

  it("F03. entregável em rascunho aparece na serialização e BLOQUEIA a publicação; concluir libera", async () => {
    const { product, versionId, task } = await mkDraftProduct("F03");
    const d = await adm(`/tasks/${task.id}/deliverables`, "POST", { ...full("Plano"), draft: true });
    const prod = await adm(`/products/${product.id}`);
    const dels = (prod.json.versions as any[]).find((v) => v.id === versionId).tasks.flatMap((t: any) => t.deliverables);
    assert.equal(dels.find((x: any) => x.id === d.json.id)?.draft_incomplete, true);
    const pub = await publish(versionId);
    assert.notEqual(pub.status, 200);
    assert.match(JSON.stringify(pub.json), /rascunho incompleto/);
    await adm(`/deliverables/${d.json.id}`, "PUT", { draft: false });
    const pub2 = await publish(versionId);
    assert.equal(pub2.status, 200, JSON.stringify(pub2.json));
  });

  it("F04. remover SÓ o vínculo (step_id null) mantém o registro, o ID e a chave; vincular a outra etapa também é o mesmo registro", async () => {
    const { task, s1, s2 } = await mkDraftProduct("F04");
    const c = await adm(`/tasks/${task.id}/deliverables`, "POST", full("Relatório", { step_id: s1.id }));
    const un = await adm(`/deliverables/${c.json.id}`, "PUT", { step_id: null });
    assert.equal(un.status, 200, JSON.stringify(un.json));
    assert.equal((await rowOf(c.json.id)).step_id, null, "fica sem etapa (pendência), não é excluído");
    const mv = await adm(`/deliverables/${c.json.id}`, "PUT", { step_id: s2.id });
    assert.equal(mv.status, 200);
    const row = await rowOf(c.json.id);
    assert.deepEqual([row.id, row.key, row.step_id], [c.json.id, c.json.key, s2.id]);
    assert.equal(await prisma.catalog2TaskDeliverable.count({ where: { task_id: task.id } }), 1, "sem duplicar");
  });

  it("F05. etapa de OUTRA tarefa é recusada como responsável do entregável", async () => {
    const a = await mkDraftProduct("F05a");
    const b = await mkDraftProduct("F05b");
    const r = await adm(`/tasks/${a.task.id}/deliverables`, "POST", full("Indevido", { step_id: b.s1.id }));
    assert.equal(r.status, 422, JSON.stringify(r.json));
  });

  it("F06. excluir entregável NUNCA usado funciona; já usado em tarefa contratada é recusado (409 deliverable_in_use) e nada se perde", async () => {
    const livre = await mkDraftProduct("F06a");
    const usadoP = await mkDraftProduct("F06b");
    const dLivre = await adm(`/tasks/${livre.task.id}/deliverables`, "POST", full("Livre", { step_id: livre.s1.id }));
    const dUsado = await adm(`/tasks/${usadoP.task.id}/deliverables`, "POST", full("Usado", { step_id: usadoP.s1.id }));
    // uma tarefa contratada (de outro produto publicado) que guardou o entregável "Usado"
    const outro = await mkProduct({ name: "F06c", tasks: [{ key: "a", steps: [{ key: "s1" }] }] });
    assert.equal((await publish(outro.versionId)).status, 200);
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: outro.product.id, selection: SEL } });
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const pt = byKey(await tasksOf(projectId)).a;
    await prisma.projectTaskDeliverable.create({ data: { project_task_id: pt.id, catalog2_deliverable_id: dUsado.json.id, key: "usado", name: "Usado" } });
    const recusa = await adm(`/deliverables/${dUsado.json.id}`, "DELETE");
    assert.equal(recusa.status, 409, JSON.stringify(recusa.json));
    assert.equal(recusa.json.code, "deliverable_in_use");
    assert.match(recusa.json.error, /já foi usado/);
    assert.ok(await prisma.catalog2TaskDeliverable.findUnique({ where: { id: dUsado.json.id } }), "o entregável usado continua existindo");
    const ok = await adm(`/deliverables/${dLivre.json.id}`, "DELETE");
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(await prisma.catalog2TaskDeliverable.findUnique({ where: { id: dLivre.json.id } }), null);
  });

  it("F08. excluir rascunho incompleto remove o bloqueio, a aprovação antiga e o resumo ao reler o produto", async () => {
    const { product, versionId, task, s1 } = await mkDraftProduct("F08");
    const created = await adm(`/tasks/${task.id}/deliverables`, "POST", { ...full("Entregável removido", { step_id: s1.id }), draft: true });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const blocked = await publish(versionId);
    assert.notEqual(blocked.status, 200);
    assert.match(JSON.stringify(blocked.json), /rascunho incompleto/);
    assert.equal((await adm(`/deliverables/${created.json.id}`, "DELETE")).status, 200);
    const saved = await adm(`/steps/${s1.id}`, "PUT", { draft: false, ops: { no_deliverables: true, client_approval: { mode: "none" } } });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const reread = await adm(`/products/${product.id}`);
    const version = reread.json.versions.find((v: any) => v.id === versionId);
    assert.equal(version.tasks.find((t: any) => t.id === task.id).deliverables.length, 0);
    assert.equal(await prisma.catalog2TaskDeliverable.count({ where: { id: created.json.id } }), 0);
    const published = await publish(versionId);
    assert.equal(published.status, 200, JSON.stringify(published.json));
  });

  it("F09. biblioteca busca arquivo salvo, elimina duplicatas, ignora ausente/link externo e reutiliza sem apagar a origem", async () => {
    const { task, s1, s2 } = await mkDraftProduct("F09");
    const ref = storeDeliverableFile("Modelo-F09.pdf", Buffer.from("arquivo de teste descartável"), "application/pdf");
    testFiles.push(ref.id);
    const a = await adm(`/tasks/${task.id}/deliverables`, "POST", full("Original", { step_id: s1.id, template_url: `file:${ref.id}`, template_name: ref.name }));
    assert.equal(a.status, 201, JSON.stringify(a.json));
    await adm(`/tasks/${task.id}/deliverables`, "POST", full("Ausente", { step_id: s1.id, template_url: "file:11111111-1111-4111-8111-111111111111.pdf", template_name: "Modelo-F09-ausente.pdf" }));
    await adm(`/tasks/${task.id}/deliverables`, "POST", full("Externo", { step_id: s1.id, template_url: "https://example.test/modelo.pdf", template_name: "Modelo-F09-externo.pdf" }));
    const list = await adm("/deliverable-files?q=Modelo-F09");
    assert.equal(list.status, 200, JSON.stringify(list.json));
    assert.equal(list.json.data.length, 1);
    assert.equal(list.json.data[0].id, ref.id);
    assert.match(list.json.data[0].from, /F09/);
    const b = await adm(`/tasks/${task.id}/deliverables`, "POST", full("Reutilizado", { step_id: s2.id, template_url: `file:${list.json.data[0].id}`, template_name: list.json.data[0].name }));
    assert.equal(b.status, 201, JSON.stringify(b.json));
    assert.equal((await adm("/deliverable-files?q=Modelo-F09")).json.data.length, 1);
    assert.equal((await adm(`/deliverables/${b.json.id}`, "PUT", { template_url: null, template_name: null })).status, 200);
    assert.equal((await rowOf(a.json.id)).template_url, `file:${ref.id}`);
    assert.equal((await adm("/deliverable-files?q=Modelo-F09")).json.data.length, 1);
    assert.equal((await adm("/deliverable-files?q=nome-inexistente-F09")).json.data.length, 0);
    const forbidden = await api("/api/admin/catalog2/deliverable-files", { token: CO.token });
    assert.notEqual(forbidden.status, 200);
  });

  it("F07. ordenar: a rota de ordem aceita os ids da tarefa e mantém os mesmos registros", async () => {
    const { task, s1 } = await mkDraftProduct("F07");
    const ids: string[] = [];
    for (const n of ["Um", "Dois", "Três"]) ids.push((await adm(`/tasks/${task.id}/deliverables`, "POST", full(n, { step_id: s1.id }))).json.id);
    const novo = [ids[2], ids[0], ids[1]];
    const r = await adm(`/tasks/${task.id}/deliverables/order`, "PUT", { order: novo });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const rows = await prisma.catalog2TaskDeliverable.findMany({ where: { task_id: task.id }, orderBy: { sort_order: "asc" } });
    assert.deepEqual(rows.map((x) => x.id), novo);
  });
});

describe("Etapa · 'não tem entregáveis' e aprovação do cliente (ops)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("O01. ops.no_deliverables e ops.client_approval são guardados e normalizados (modo inválido é recusado)", async () => {
    const { s1 } = await mkDraftProduct("O01");
    const r = await adm(`/steps/${s1.id}`, "PUT", { ops: { no_deliverables: true, client_approval: { mode: "step", silence_action: "remind", adjust_receiver: "leader", adjustment_limit: 3 } } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const ops = (await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).ops as any;
    assert.equal(ops.no_deliverables, true);
    assert.deepEqual(ops.client_approval, { mode: "step", silence_action: "remind", adjust_receiver: "leader", adjustment_limit: 3 });
    const bad = await adm(`/steps/${s1.id}`, "PUT", { ops: { client_approval: { mode: "qualquer-coisa" } } });
    assert.equal(bad.status, 400, JSON.stringify(bad.json));
    const ops2 = (await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).ops as any;
    assert.equal(ops2.client_approval.mode, "step", "recusa não altera o que estava salvo");
  });

  it("O02. outras chaves do ops continuam intactas ao gravar a aprovação (nada se perde)", async () => {
    const { s1 } = await mkDraftProduct("O02");
    await adm(`/steps/${s1.id}`, "PUT", { ops: { instructions: "Passo a passo", evidence_required: true, checklist: [{ text: "Conferir", kind: "execucao" }] } });
    await adm(`/steps/${s1.id}`, "PUT", { ops: { instructions: "Passo a passo", evidence_required: true, checklist: [{ text: "Conferir", kind: "execucao" }], client_approval: { mode: "none" } } });
    const ops = (await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).ops as any;
    assert.equal(ops.instructions, "Passo a passo");
    assert.equal(ops.evidence_required, true);
    assert.equal(ops.checklist?.[0]?.text, "Conferir");
    assert.equal(ops.client_approval.mode, "none");
  });
});

describe("Motor de etapas · modos de aprovação do cliente", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("FA"); LEADER = await mkLeader(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  async function projeto(cfg: Record<string, Record<string, unknown>>) {
    const keys = Object.keys(cfg);
    const p = await mkProduct({ name: "Aprovação", tasks: [{ key: "t", steps: keys.map((k) => ({ key: k, minutes: 30 })), data: { stage_execution: "stage" } }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
    const idOf = Object.fromEntries(t.steps.map((s) => [s.key, s.id]));
    for (const k of keys) await prisma.catalog2TaskStep.update({ where: { id: idOf[k] }, data: { requires_qualification: false, ...cfg[k] } as any });
    const pub = await publish(p.versionId);
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const task = byKey(await tasksOf(projectId)).t;
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, data_liberacao_execucao: new Date() } });
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
    await iniciarEtapasDaTarefa(prisma, task.id);
    return { taskId: task.id, idOf };
  }
  const stageOf = (taskId: string, stepId: string) => prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: stepId } });
  const entregar = async (taskId: string, stepId: string) => concluirEtapa(prisma, (await stageOf(taskId, stepId)).id, { userId: LEADER.user.id });

  it("M01. modo 'step' (e etapa antiga sem a chave) espera a aprovação do cliente e BLOQUEIA a próxima", async () => {
    const p = await projeto({ s1: { ops: { client_approval: { mode: "step" } } }, s2: {} });
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).status, "EM_APROVACAO_CLIENTE");
    assert.equal((await stageOf(p.taskId, p.idOf.s2)).status, "BLOQUEADA");
    const q = await projeto({ s1: {}, s2: {} });
    await entregar(q.taskId, q.idOf.s1);
    assert.equal((await stageOf(q.taskId, q.idOf.s1)).status, "EM_APROVACAO_CLIENTE", "produto antigo: comportamento de sempre");
  });

  it("M02. modo 'deliverables' também é uma barreira do cliente", async () => {
    const p = await projeto({ s1: { ops: { client_approval: { mode: "deliverables" } } }, s2: {} });
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).status, "EM_APROVACAO_CLIENTE");
    assert.equal((await stageOf(p.taskId, p.idOf.s2)).status, "BLOQUEADA");
  });

  it("M03. modo 'none': o cliente não aprova, a etapa conclui e a próxima abre na hora", async () => {
    const p = await projeto({ s1: { ops: { client_approval: { mode: "none" } } }, s2: {} });
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).status, "CONCLUIDA");
    assert.equal((await stageOf(p.taskId, p.idOf.s2)).status, "EM_ANDAMENTO");
  });

  it("M04. modo 'awareness': conclui sem bloquear e deixa registrado que o cliente tomou ciência", async () => {
    const p = await projeto({ s1: { ops: { client_approval: { mode: "awareness" } } }, s2: {} });
    await entregar(p.taskId, p.idOf.s1);
    const s1 = await stageOf(p.taskId, p.idOf.s1);
    assert.equal(s1.status, "CONCLUIDA");
    assert.equal((await stageOf(p.taskId, p.idOf.s2)).status, "EM_ANDAMENTO", "próxima liberada na hora");
    const rev = await prisma.projectTaskStageReview.findFirst({ where: { stage_id: s1.id, kind: "ciencia_cliente" } });
    assert.ok(rev, "ciência do cliente registrada no histórico");
  });

  it("M05. etapa interna nunca vai ao cliente, mesmo que o ops antigo diga 'step'", async () => {
    const p = await projeto({ s1: { internal_step: true, ops: { client_approval: { mode: "step" } } }, s2: {} });
    await entregar(p.taskId, p.idOf.s1);
    assert.equal((await stageOf(p.taskId, p.idOf.s1)).status, "CONCLUIDA");
  });
});
