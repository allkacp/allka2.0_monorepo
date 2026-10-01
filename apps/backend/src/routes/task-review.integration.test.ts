import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { concluirEtapa, garantirRevisor } from "../lib/stage-engine";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";

// Pedido 3 · Fase 2 — Revisão obrigatória com efeito real:
// execução → REVISÃO → qualificação → aprovação → (cliente) → concluída.

let baseUrl = "";
let server: import("node:http").Server;
const userIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];
const catalogIds: string[] = [];
const specialtyIds: string[] = [];
const nomadeIds: string[] = [];
const uid = () => crypto.randomBytes(5).toString("hex");

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkUser(role: string, account_type: string, extra: Record<string, unknown> = {}) {
  const id = `rev-${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `R ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}
async function mkTask(opts: { review: boolean; qualification?: boolean; leaderId?: string; reviewerId?: string; nomadeId?: string; reviewSpecialtyId?: string; reviewMinutes?: number }) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto Rev ${code}`, project_code: code } });
  projectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto Rev ${code}`, category: "Cat" } });
  productIds.push(product.id);
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: "Cat" } });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name,
      title: `Tarefa Rev ${code}`, category_snapshot: "Cat", status: "EM_EXECUCAO", exige_aprovacao_cliente: false,
      requires_review: opts.review, requires_qualification: !!opts.qualification, lider_responsavel_id: opts.leaderId ?? null,
      reviewer_user_id: opts.reviewerId ?? null, nomade_responsavel_id: opts.nomadeId ?? null,
      review_specialty_id: opts.reviewSpecialtyId ?? null, review_minutes: opts.reviewMinutes ?? null,
    },
  });
  const stage = await prisma.projectTaskStage.create({
    data: { project_task_id: task.id, titulo: "Executar", ordem: 1, status: "EM_ANDAMENTO", obrigatoria: true, executor_type: "leader", lider_id: opts.leaderId ?? null, nomade_id: opts.nomadeId ?? null },
  });
  return { task, stage };
}
const reload = (id: string) => prisma.projectTask.findUniqueOrThrow({ where: { id } });

describe("Pedido 3 · Fase 2 — revisão obrigatória", () => {
  let admin: Awaited<ReturnType<typeof mkUser>>;
  let leader: Awaited<ReturnType<typeof mkUser>>;
  let reviewer: Awaited<ReturnType<typeof mkUser>>;
  let stranger: Awaited<ReturnType<typeof mkUser>>;
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    admin = await mkUser("admin", "admin");
    leader = await mkUser("lider", "lider");
    reviewer = await mkUser("lider", "lider");
    stranger = await mkUser("company_user", "empresas");
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.taskAttachment.deleteMany({ where: { project_task: { project_id: { in: projectIds } } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    for (const id of catalogIds) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
    await prisma.catalog2Specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("sem revisão obrigatória o fluxo continua igual: última etapa → EM_APROVACAO", async () => {
    const { task, stage } = await mkTask({ review: false });
    const r = await concluirEtapa(prisma, stage.id, { userId: admin.id });
    assert.equal(r.enviadaParaRevisao, false);
    assert.equal(r.enviadaParaAprovacao, true);
    assert.equal((await reload(task.id)).status, "EM_APROVACAO");
  });

  it("com revisão: entrega → AGUARDANDO_REVISAO; aprovação, edição direta e conclusão por atalho são barradas", async () => {
    const { task, stage } = await mkTask({ review: true, leaderId: leader.id });
    const r = await concluirEtapa(prisma, stage.id, { userId: leader.id });
    assert.equal(r.enviadaParaRevisao, true);
    assert.equal(r.enviadaParaAprovacao, false);
    const t = await reload(task.id);
    assert.equal(t.status, "AGUARDANDO_REVISAO");
    assert.equal(t.review_round, 1);
    assert.equal(t.reviewed_at, null);
    assert.deepEqual((await prisma.projectTaskReview.findMany({ where: { project_task_id: task.id } })).map((h) => h.decision), ["solicitada"]);

    assert.equal((await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: tokenFor(admin), body: {} })).status, 422, "aprovação de agência/cliente não vale durante a revisão");
    const patch = await api(`/api/project-tasks/${task.id}`, { method: "PATCH", token: tokenFor(admin), body: { status: "EM_APROVACAO" } });
    assert.equal(patch.status, 409);
    assert.equal(patch.json.code, "review_required");
    assert.equal((await reload(task.id)).status, "AGUARDANDO_REVISAO");

    // o estado aparece em linguagem clara
    const flow = await api(`/api/project-tasks/${task.id}/flow`, { token: tokenFor(admin) });
    assert.equal(flow.json.state, "aguardando_revisao");
    assert.equal(flow.json.label, "Aguardando revisão");
  });

  it("só o revisor (ou admin) decide; reprovar/ajustes exigem comentário; ajuste volta ao executor sem contar como alteração do cliente", async () => {
    const { task, stage } = await mkTask({ review: true, leaderId: leader.id });
    await concluirEtapa(prisma, stage.id, { userId: leader.id });

    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(stranger), body: { decisao: "aprovar" } })).status, 403);
    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar" } })).status, 422);
    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "ajustes", comentario: "  " } })).status, 422);

    const note = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "comentar", comentario: "Base boa.", minutos: 5 } });
    assert.equal(note.status, 200);
    assert.equal((await reload(task.id)).status, "AGUARDANDO_REVISAO", "comentar não muda o estado");

    const adj = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "ajustes", comentario: "Corrigir a planilha de junho.", minutos: 12 } });
    assert.equal(adj.status, 200);
    assert.equal(adj.json.status, "EM_AJUSTES");
    const t = await reload(task.id);
    assert.equal(t.status, "EM_AJUSTES");
    assert.equal(t.reprovacoes, 0, "ajuste interno não consome as alterações grátis do cliente");
    assert.equal((await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } })).status, "EM_ANDAMENTO", "última etapa reaberta");
    const alert = await prisma.systemAlert.findFirst({ where: { type: "tarefa_reprovada", user_id: leader.id, entity_id: stage.id } });
    assert.ok(alert);
    assert.match(alert!.message, /revisor/);

    // fora de AGUARDANDO_REVISAO não dá para aprovar de novo
    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } })).status, 422);

    // nova entrega = NOVA rodada de revisão; aprovar segue o fluxo
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    let t2 = await reload(task.id);
    assert.equal(t2.status, "AGUARDANDO_REVISAO");
    assert.equal(t2.review_round, 2);
    const rej = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar", comentario: "Ainda errado.", minutos: 3 } });
    assert.equal(rej.status, 200);
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    const ok = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar", comentario: "Agora sim.", minutos: 8 } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.status, "EM_APROVACAO");
    t2 = await reload(task.id);
    assert.equal(t2.status, "EM_APROVACAO");
    assert.equal(t2.review_round, 3);
    assert.ok(t2.reviewed_at);
    const hist = await prisma.projectTaskReview.findMany({ where: { project_task_id: task.id }, orderBy: { created_at: "asc" } });
    assert.deepEqual(hist.map((h) => `${h.round}:${h.decision}`), ["1:solicitada", "1:comentario", "1:ajustes", "2:solicitada", "2:reprovada", "3:solicitada", "3:aprovada"]);
    assert.equal(hist.reduce((s, h) => s + (h.minutes_spent ?? 0), 0), 5 + 12 + 3 + 8, "tempo de revisão acumulado");
  });

  it("revisão + qualificação: revisão aprova → AGUARDANDO_QUALIFICACAO; qualificação reprova → nova entrega passa pela revisão de novo", async () => {
    const { task, stage } = await mkTask({ review: true, qualification: true, leaderId: leader.id });
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    const ap = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } });
    assert.equal(ap.status, 200);
    assert.equal(ap.json.status, "AGUARDANDO_QUALIFICACAO");
    let t = await reload(task.id);
    assert.equal(t.qualification_round, 1);
    assert.ok(t.reviewed_at);
    // a qualificação só aceita depois da revisão; reprovar aqui devolve ao executor
    const q = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar", comentario: "Refazer." } });
    assert.equal(q.status, 200);
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    t = await reload(task.id);
    assert.equal(t.status, "AGUARDANDO_REVISAO", "depois de ajustes a entrega volta para a REVISÃO primeiro");
    assert.equal(t.reviewed_at, null);
    await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } });
    const q2 = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } });
    assert.equal(q2.status, 200);
    assert.equal((await reload(task.id)).status, "EM_APROVACAO");
  });

  it("revisor designado decide no lugar do líder; aviso chega ao revisor; histórico só para quem é da tarefa", async () => {
    const nUser = await mkUser("nomad", "nomades");
    const nomade = await prisma.nomade.create({ data: { user_id: nUser.id, name: nUser.name, email: `${nUser.id}-n@example.test`, status: "ativo" } });
    nomadeIds.push(nomade.id);
    const spec = await prisma.catalog2Specialty.create({ data: { key: `rev-${uid()}`, name: "Revisão técnica", max_hourly_rate: 120 } });
    specialtyIds.push(spec.id);
    const { task, stage } = await mkTask({ review: true, leaderId: leader.id, reviewerId: reviewer.id, nomadeId: nomade.id, reviewSpecialtyId: spec.id, reviewMinutes: 30 });
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    await garantirRevisor(task.id);
    const alert = await prisma.systemAlert.findFirst({ where: { type: "revisao_pendente", entity_id: task.id } });
    assert.ok(alert);
    assert.equal(alert!.user_id, reviewer.id, "o aviso vai para o revisor designado, não para o líder");

    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } })).status, 403, "líder sem designação não revisa quando há revisor designado");
    const ok = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(reviewer), body: { decisao: "comentar", comentario: "Em análise.", minutos: 30 } });
    assert.equal(ok.status, 200);

    const asReviewer = await api(`/api/project-tasks/${task.id}/revisao`, { token: tokenFor(reviewer) });
    assert.equal(asReviewer.status, 200);
    assert.equal(asReviewer.json.pode_revisar, true);
    assert.equal(asReviewer.json.total_minutos, 30);
    assert.equal(asReviewer.json.custo_estimado, 60, "30 min × R$ 120/h");
    assert.equal(asReviewer.json.minutos_estimados, 30);
    assert.equal(asReviewer.json.especialidade.name, "Revisão técnica");
    const asNomade = await api(`/api/project-tasks/${task.id}/revisao`, { token: tokenFor(nUser) });
    assert.equal(asNomade.status, 200, "o executor vê os pedidos de ajuste");
    assert.equal(asNomade.json.pode_revisar, false);
    assert.equal((await api(`/api/project-tasks/${task.id}/revisao`, { token: tokenFor(stranger) })).status, 404, "cliente/outros não veem a revisão interna");
  });

  it("contratação do catálogo copia a configuração de revisão para a tarefa contratada", async () => {
    const code = uid();
    const prod = await prisma.catalog2Product.create({ data: { slug: `rev-${code}`, internal_name: `[TESTE] Revisão ${code}`, status: "disponivel" } });
    catalogIds.push(prod.id);
    const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T" } });
    await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "t1", name: "Tarefa com revisão", sort_order: 1, requires_review: true, review_minutes: 25, reviewer_user_id: reviewer.id } });
    const project = await prisma.project.create({ data: { title: `Projeto Rev ${code}`, project_code: code } });
    projectIds.push(project.id);
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
    const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 100, status: "PAGO", paid_at: new Date() } });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
    const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id } });
    assert.equal(pt.requires_review, true);
    assert.equal(pt.review_minutes, 25);
    assert.equal(pt.reviewer_user_id, reviewer.id);
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
  });
});
