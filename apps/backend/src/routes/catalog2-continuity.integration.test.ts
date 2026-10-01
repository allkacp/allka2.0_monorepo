import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { gerarTarefasCatalog2DoProjeto, releaseCatalog2DeliveryCycle } from "../lib/generate-tasks-catalog2";
import { iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { startTaskRotation } from "../lib/task-rotation-engine";

// Continuidade com o mesmo executor: não permitido / permitido / recomendado / obrigatório.

let baseUrl = "";
let server: import("node:http").Server;
const cleanup: (() => Promise<void>)[] = [];
const userIds: string[] = [];
const uid = () => crypto.randomBytes(4).toString("hex");

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
  const id = `cont-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}
async function mkNomad() {
  const user = await mkUser("nomad", "nomades");
  const nomade = await prisma.nomade.create({ data: { user_id: user.id, name: user.name, email: `${user.id}-n@example.test`, status: "ativo" } });
  const h = await prisma.nomadeHabilidade.create({ data: { nomade_id: nomade.id, area: "Qualquer", categoria_produto: "Tarefa obrigatoria Tarefa permitida Tarefa recomendada Tarefa normal", disponibilidade: "disponivel", ativo: true, nota_media: 4 } });
  cleanup.push(async () => {
    await prisma.taskAssignmentHistory.deleteMany({ where: { nomade_id: nomade.id } });
    await prisma.nomadeHabilidade.deleteMany({ where: { id: h.id } });
    await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {});
  });
  return { user, nomade };
}

async function mkCatalogAndContract(companyId: string) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `cont-${code}`, internal_name: `[TESTE] Continuidade ${code}`, status: "disponivel", delivery_recurrence: "mensal" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T", accepts_recurring: true } });
  const mk = async (key: string, executor_continuity: string, order: number, steps: Record<string, unknown>[] = []) => {
    const t = await prisma.catalog2Task.create({ data: { version_id: ver.id, key, name: `Tarefa ${key}`, sort_order: order, executor_continuity } });
    let i = 1;
    for (const st of steps) await prisma.catalog2TaskStep.create({ data: { task_id: t.id, key: `s${i}`, name: `Etapa ${key}-${i}`, sort_order: i++, ...st } });
    return t;
  };
  const tReq = await mk("obrigatoria", "required", 1, [{ first_execution_only: true }, { skip_when_same_executor: true }, {}]);
  const tAllowed = await mk("permitida", "allowed", 2, [{}]);
  const tRecommended = await mk("recomendada", "recommended", 3, [{}]);
  const tNone = await mk("normal", "not_allowed", 4, [{}]);
  const project = await prisma.project.create({ data: { title: `Projeto Cont ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({
    data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C", catalog2_period: "trimestral", catalog2_period_months: 3 },
  });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 100, status: "PAGO", paid_at: new Date() } });
  const paidAt = new Date();
  paidAt.setMonth(paidAt.getMonth() - 3);
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt, billingCycleKey: "c0", projectProductIds: [pp.id] }));
  cleanup.push(async () => {
    await prisma.taskDependency.deleteMany({ where: { project_id: project.id } });
    await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product_id: pp.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { project, pp, tasks: { tReq, tAllowed, tRecommended, tNone } };
}

const byKey = async (projectId: string, cycle: number) => {
  const rows = await prisma.projectTask.findMany({ where: { project_id: projectId, occurrence_index: cycle }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } } });
  return Object.fromEntries(rows.map((r) => [r.catalog2_task!.key, r]));
};

describe("Continuidade com o mesmo executor entre ciclos", () => {
  let company: { id: string };
  let clientUser: Awaited<ReturnType<typeof mkUser>>;
  let stranger: Awaited<ReturnType<typeof mkUser>>;
  let leader: Awaited<ReturnType<typeof mkUser>>;
  let admin: Awaited<ReturnType<typeof mkUser>>;
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    company = await prisma.company.create({ data: { name: `Empresa Cont ${uid()}` } });
    cleanup.push(async () => { await prisma.company.delete({ where: { id: company.id } }).catch(() => {}); });
    clientUser = await mkUser("company_user", "empresas", { company_id: company.id });
    const otherCompany = await prisma.company.create({ data: { name: `Outra ${uid()}` } });
    cleanup.push(async () => { await prisma.company.delete({ where: { id: otherCompany.id } }).catch(() => {}); });
    stranger = await mkUser("company_user", "empresas", { company_id: otherCompany.id });
    leader = await mkUser("lider", "lider");
    admin = await mkUser("admin", "admin");
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function firstCycleDone(n1: Awaited<ReturnType<typeof mkNomad>>) {
    const c = await mkCatalogAndContract(company.id);
    const cycle0 = await byKey(c.project.id, 0);
    for (const t of Object.values(cycle0)) {
      await prisma.projectTask.update({ where: { id: t.id }, data: { status: "CONCLUIDA", nomade_responsavel_id: n1.nomade.id, data_conclusao: new Date(), lider_responsavel_id: leader.id } });
    }
    await prisma.taskBriefingAnswer.create({ data: { project_task_id: cycle0["permitida"].id, question_key: "site", question_text: "Qual o site?", answer: "https://exemplo.com" } });
    const cycles = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: c.pp.id }, orderBy: { occurrence_index: "asc" } });
    assert.equal(await releaseCatalog2DeliveryCycle(prisma, cycles[0].id), "released");
    return { ...c, cycle1: await byKey(c.project.id, 1) };
  }

  it("ciclo seguinte: obrigatório nasce 'mantido'; permitido/recomendado aguardam escolha; não permitido segue a fila; etapa de 1ª execução some", async () => {
    const n1 = await mkNomad();
    const { project, cycle1 } = await firstCycleDone(n1);

    assert.equal(cycle1["obrigatoria"].continuity_status, "kept");
    assert.equal(cycle1["obrigatoria"].continuity_prev_nomade_id, n1.nomade.id);
    assert.equal(cycle1["obrigatoria"].stages.length, 2, "a etapa 'só na 1ª execução' não se repete");

    for (const k of ["permitida", "recomendada"]) {
      assert.equal(cycle1[k].continuity_status, "pending_choice");
      assert.equal(cycle1[k].auto_nomad_dispatch_enabled, false, "não entra na fila até escolherem");
      assert.equal(cycle1[k].continuity_prev_nomade_id, n1.nomade.id);
    }
    assert.equal(cycle1["recomendada"].executor_continuity, "recommended");
    assert.equal(cycle1["normal"].continuity_status, null);
    assert.equal(cycle1["normal"].auto_nomad_dispatch_enabled, true);

    const alerts = await prisma.systemAlert.findMany({ where: { user_id: clientUser.id, type: "continuidade_pendente" } });
    assert.ok(alerts.length >= 2, "cliente é perguntado: manter com o mesmo nômade?");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: project.id } });
    assert.ok(logs.some((l) => l.kind === "executor_kept"));
    assert.ok(logs.some((l) => l.kind === "continuity_pending"));
  });

  it("obrigatório: vai direto ao mesmo executor ao entrar na fila; etapa 'dispensável com continuidade' é pulada", async () => {
    const n1 = await mkNomad();
    const { cycle1 } = await firstCycleDone(n1);
    const t = cycle1["obrigatoria"];
    await prisma.projectTask.update({ where: { id: t.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    await iniciarEtapasDaTarefa(prisma, t.id);
    await startTaskRotation(t.id);

    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id }, include: { stages: { orderBy: { ordem: "asc" } } } });
    assert.equal(after.nomade_responsavel_id, n1.nomade.id);
    assert.equal(after.status, "EM_EXECUCAO");
    assert.equal(after.stages[0].status, "CONCLUIDA", "etapa dispensável pulada");
    assert.equal(after.stages[1].status, "EM_ANDAMENTO");
    assert.equal(after.stages[1].nomade_id, n1.nomade.id);
    assert.equal(after.requires_qualification, false);
    const hist = await prisma.taskAssignmentHistory.findMany({ where: { project_task_id: t.id } });
    assert.equal(hist[0].criterio, "continuidade");
  });

  it("obrigatório com executor indisponível: cai na fila normal e avisa o líder", async () => {
    const n1 = await mkNomad();
    const { project, cycle1 } = await firstCycleDone(n1);
    await prisma.nomade.update({ where: { id: n1.nomade.id }, data: { status: "inativo" } });
    const t = cycle1["obrigatoria"];
    await prisma.projectTask.update({ where: { id: t.id }, data: { lider_responsavel_id: leader.id } });
    await prisma.projectTask.update({ where: { id: t.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    await iniciarEtapasDaTarefa(prisma, t.id);
    await startTaskRotation(t.id);
    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(after.nomade_responsavel_id, null);
    assert.equal(after.continuity_status, "redistributed");
    assert.ok(await prisma.systemAlert.findFirst({ where: { user_id: leader.id, type: "continuidade_indisponivel", entity_id: t.id } }));
    assert.ok((await prisma.projectDecisionLog.findMany({ where: { project_id: project.id, kind: "executor_changed" } })).length >= 1);
  });

  it("cliente escolhe MANTER: briefing do ciclo anterior é preservado e a tarefa vai ao mesmo executor; outro cliente não decide", async () => {
    const n1 = await mkNomad();
    const { cycle1 } = await firstCycleDone(n1);
    const t = cycle1["permitida"];

    const denied = await api(`/api/project-tasks/${t.id}/continuity`, { method: "POST", token: tokenFor(stranger), body: { choice: "keep" } });
    assert.equal(denied.status, 404);

    const info = await api(`/api/project-tasks/${t.id}/continuity`, { token: tokenFor(clientUser) });
    assert.equal(info.status, 200);
    assert.equal(info.json.can_choose, true);
    assert.equal(info.json.previous_executor.name, "Especialista responsável", "cliente não vê o nome por padrão");
    assert.equal(info.json.previous_executor.id, null);

    const keep = await api(`/api/project-tasks/${t.id}/continuity`, { method: "POST", token: tokenFor(clientUser), body: { choice: "keep" } });
    assert.equal(keep.status, 200);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id }, include: { briefing_answers: true } });
    assert.equal(row.continuity_status, "kept");
    assert.equal(row.continuity_decided_by, clientUser.id);
    assert.equal(row.briefing_answers[0]?.answer, "https://exemplo.com", "contexto preservado");

    // decidir de novo não vale
    const again = await api(`/api/project-tasks/${t.id}/continuity`, { method: "POST", token: tokenFor(clientUser), body: { choice: "redistribute" } });
    assert.equal(again.status, 422);

    // ao liberar, vai ao mesmo executor
    await prisma.projectTask.update({ where: { id: t.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    await iniciarEtapasDaTarefa(prisma, t.id);
    await startTaskRotation(t.id);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } })).nomade_responsavel_id, n1.nomade.id);
  });

  it("escolher NÃO manter: vai pra fila inteligente com o histórico no briefing; definir à mão é só do líder/admin", async () => {
    const n1 = await mkNomad();
    const n2 = await mkNomad();
    const { cycle1 } = await firstCycleDone(n1);

    const t = cycle1["permitida"];
    const redistribute = await api(`/api/project-tasks/${t.id}/continuity`, { method: "POST", token: tokenFor(clientUser), body: { choice: "redistribute" } });
    assert.equal(redistribute.status, 200);
    const row = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(row.continuity_status, "redistributed");
    assert.equal(row.auto_nomad_dispatch_enabled, true);
    assert.match(row.observations ?? "", /Histórico do ciclo anterior/);

    const r = cycle1["recomendada"];
    const denied = await api(`/api/project-tasks/${r.id}/continuity`, { method: "POST", token: tokenFor(clientUser), body: { choice: "manual_leader", nomade_id: n2.nomade.id } });
    assert.equal(denied.status, 403);
    const ok = await api(`/api/project-tasks/${r.id}/continuity`, { method: "POST", token: tokenFor(admin), body: { choice: "manual_leader", nomade_id: n2.nomade.id } });
    assert.equal(ok.status, 200);
    await prisma.projectTask.update({ where: { id: r.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    await iniciarEtapasDaTarefa(prisma, r.id);
    await startTaskRotation(r.id);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: r.id } })).nomade_responsavel_id, n2.nomade.id, "o líder escolheu outra pessoa");
  });
});
