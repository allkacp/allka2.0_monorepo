import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { concluirEtapa } from "../lib/stage-engine";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";
import { addAccessRequirements } from "../test-support/access-helpers";

// Qualificação obrigatória: a entrega do executor só segue (agência/cliente/
// concluída) depois do aceite do líder/qualificador; reprovar volta ao
// executor; ajuste interno NÃO conta como alteração grátis do cliente.

let baseUrl = "";
let server: import("node:http").Server;
const userIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];

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
async function mkUser(role: string, account_type: string) {
  const id = `qual-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Q ${id}`, role, account_type, is_active: true, status: "ativo" },
  });
  userIds.push(u.id);
  return u;
}
async function mkTask(opts: { qualification: boolean; leaderId?: string }) {
  const code = crypto.randomBytes(4).toString("hex");
  const project = await prisma.project.create({ data: { title: `Projeto Qual ${code}`, project_code: code } });
  projectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto Qual ${code}`, category: "Cat" } });
  productIds.push(product.id);
  const pp = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: "Cat" },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name,
      title: `Tarefa Qual ${code}`, category_snapshot: "Cat", status: "EM_EXECUCAO", exige_aprovacao_cliente: false,
      requires_qualification: opts.qualification, lider_responsavel_id: opts.leaderId ?? null,
    },
  });
  const stage = await prisma.projectTaskStage.create({
    data: { project_task_id: task.id, titulo: "Executar", ordem: 1, status: "EM_ANDAMENTO", obrigatoria: true, executor_type: "leader", lider_id: opts.leaderId ?? null },
  });
  return { task, stage };
}

describe("Qualificação obrigatória da entrega", () => {
  let admin: Awaited<ReturnType<typeof mkUser>>;
  let leader: Awaited<ReturnType<typeof mkUser>>;
  let stranger: Awaited<ReturnType<typeof mkUser>>;
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    admin = await mkUser("admin", "admin");
    leader = await mkUser("lider", "lider");
    stranger = await mkUser("company_user", "empresas");
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("sem qualificação obrigatória o fluxo continua igual: última etapa → EM_APROVACAO", async () => {
    const { task, stage } = await mkTask({ qualification: false });
    const r = await concluirEtapa(prisma, stage.id, { userId: admin.id });
    assert.equal(r.enviadaParaAprovacao, true);
    assert.equal(r.enviadaParaQualificacao, false);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status, "EM_APROVACAO");
  });

  it("com qualificação: entrega → AGUARDANDO_QUALIFICACAO; ninguém aprova/conclui por atalho", async () => {
    const { task, stage } = await mkTask({ qualification: true, leaderId: leader.id });
    const r = await concluirEtapa(prisma, stage.id, { userId: leader.id });
    assert.equal(r.enviadaParaQualificacao, true);
    assert.equal(r.enviadaParaAprovacao, false);
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.status, "AGUARDANDO_QUALIFICACAO");
    assert.equal(t.qualification_round, 1);
    assert.equal(t.qualified_at, null);
    const hist = await prisma.projectTaskQualification.findMany({ where: { project_task_id: task.id } });
    assert.deepEqual(hist.map((h) => h.decision), ["solicitada"]);

    // aprovação de agência/cliente não vale enquanto aguarda qualificação
    const approve = await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: tokenFor(admin), body: {} });
    assert.equal(approve.status, 422);
    // edição direta de status também é barrada
    const patch = await api(`/api/project-tasks/${task.id}`, { method: "PATCH", token: tokenFor(admin), body: { status: "CONCLUIDA" } });
    assert.equal(patch.status, 409);
    assert.equal(patch.json.code, "qualification_required");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status, "AGUARDANDO_QUALIFICACAO");
  });

  it("só o qualificador (ou admin) decide; reprovar exige comentário e volta ao executor sem contar como alteração do cliente", async () => {
    const { task, stage } = await mkTask({ qualification: true, leaderId: leader.id });
    await concluirEtapa(prisma, stage.id, { userId: leader.id });

    const denied = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(stranger), body: { decisao: "aprovar" } });
    assert.equal(denied.status, 403);

    const noComment = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar" } });
    assert.equal(noComment.status, 422);

    const note = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "comentar", comentario: "Boa base, falta o gráfico." } });
    assert.equal(note.status, 200);

    const reject = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar", comentario: "Refazer o gráfico com dados de setembro." } });
    assert.equal(reject.status, 200);
    assert.equal(reject.json.status, "EM_AJUSTES");
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.status, "EM_AJUSTES");
    assert.equal(t.reprovacoes, 0, "ajuste interno não consome as alterações grátis do cliente");
    assert.equal((await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } })).status, "EM_ANDAMENTO");
    const alert = await prisma.systemAlert.findFirst({ where: { type: "tarefa_reprovada", user_id: leader.id, entity_id: stage.id } });
    assert.ok(alert, "executor é avisado com o motivo");
    assert.match(alert!.message, /qualificador/);
  });

  it("nova entrega exige NOVA qualificação; aprovar libera o fluxo normal até concluir", async () => {
    const { task, stage } = await mkTask({ qualification: true, leaderId: leader.id });
    await concluirEtapa(prisma, stage.id, { userId: leader.id });
    await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "reprovar", comentario: "Ajustar." } });

    await concluirEtapa(prisma, stage.id, { userId: leader.id }); // executor entrega de novo
    let t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.status, "AGUARDANDO_QUALIFICACAO");
    assert.equal(t.qualification_round, 2, "rodada nova");
    assert.equal(t.qualified_at, null);

    const ok = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar", comentario: "Aprovado." } });
    assert.equal(ok.status, 200);
    t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.status, "EM_APROVACAO");
    assert.ok(t.qualified_at);
    assert.equal(t.qualified_by, leader.id);

    // agora a aprovação de quem contratou (fluxo já existente) conclui
    const done = await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: tokenFor(admin), body: {} });
    assert.equal(done.status, 200);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status, "CONCLUIDA");

    const hist = await api(`/api/project-tasks/${task.id}/qualificacao`, { token: tokenFor(admin) });
    assert.equal(hist.status, 200);
    assert.deepEqual(hist.json.historico.map((h: { decision: string }) => h.decision), ["solicitada", "reprovada", "solicitada", "aprovada"]);
  });

  it("geração a partir do catálogo: a tarefa contratada herda a qualificação e o qualificador; a etapa guarda finalidade e critério do modelo", async () => {
    const code = crypto.randomBytes(4).toString("hex");
    const prod = await prisma.catalog2Product.create({ data: { slug: `qual-${code}`, internal_name: `[TESTE] Qual ${code}`, status: "disponivel" } });
    const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T" } });
    const sm = await prisma.catalog2StepModel.create({ data: { name: `Etapa Qual ${code}`, purpose: "validacao", completion_criteria: "Tudo conferido", is_access_validation: true, signature: `sig-${code}` } });
    const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "k1", name: "Tarefa que exige qualificação", requires_qualification: true, qualifier_user_id: leader.id } });
    await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: "e1", name: "Etapa única", step_model_id: sm.id, step_model_revision: 1 } });
    await addAccessRequirements(ver.id, [{ type: "google_ads", label: "Google Ads" }]);
    const project = await prisma.project.create({ data: { title: `Projeto Ger ${code}`, project_code: code } });
    projectIds.push(project.id);
    const pp = await prisma.projectProduct.create({
      data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" },
    });
    const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "CONFIRMADO", paid_at: new Date() } });
    try {
      const r = await gerarTarefasCatalog2DoProjeto(prisma, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c1", projectProductIds: [pp.id] });
      assert.equal(r.generated, 1);
      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id }, include: { stages: true } });
      assert.equal(pt.requires_qualification, true);
      assert.equal(pt.lider_responsavel_id, leader.id);
      const cfg = JSON.parse(pt.stages[0].config_snapshot ?? "{}");
      assert.equal(cfg.purpose, "validacao");
      assert.equal(cfg.completion_criteria, "Tudo conferido");
      assert.equal(cfg.step_model_id, sm.id);
      assert.equal(cfg.is_access_validation, true);
      assert.deepEqual(cfg.access_requirements.map((a: { label: string }) => a.label), ["Google Ads"]);
    } finally {
      await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
      await prisma.payment.deleteMany({ where: { project_id: project.id } });
      await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
      await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } });
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
      await prisma.catalog2Product.delete({ where: { id: prod.id } });
      await prisma.catalog2StepModel.delete({ where: { id: sm.id } });
    }
  });

  it("não aprova/reprova quando a tarefa não está aguardando qualificação", async () => {
    const { task } = await mkTask({ qualification: true, leaderId: leader.id });
    const r = await api(`/api/project-tasks/${task.id}/qualificacao`, { method: "POST", token: tokenFor(leader), body: { decisao: "aprovar" } });
    assert.equal(r.status, 422);
  });
});
