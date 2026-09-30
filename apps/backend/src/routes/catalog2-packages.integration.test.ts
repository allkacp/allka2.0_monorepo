import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";
import { concluirEtapa } from "../lib/stage-engine";
import { DependencyBlockedError, reevaluateProjectDependencies } from "../lib/project-dependencies";
import { runDependencySchedulerOnce } from "../lib/dependency-scheduler";

// Pacotes de produtos e dependências (produto/tarefa/etapa/entregável/aprovação/ativo).

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

async function mkMaster() {
  const id = `pkg-${uid()}${uid()}`;
  const profile = await prisma.adminProfile.create({ data: { name: `PkgProf ${id}`, is_master: true, is_active: true } });
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: id, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: profile.id } });
  userIds.push(u.id);
  cleanup.push(async () => { await prisma.adminProfile.delete({ where: { id: profile.id } }).catch(() => {}); });
  return u;
}

async function mkProduct(name: string, tasks: { key: string; steps?: number }[]) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `pkg-${code}`, internal_name: `[TESTE] ${name} ${code}`, status: "disponivel" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: name } });
  const rows: Record<string, { id: string }> = {};
  let order = 1;
  for (const t of tasks) {
    const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: t.key, name: `Tarefa ${t.key}`, sort_order: order++ } });
    for (let i = 1; i <= (t.steps ?? 0); i++) await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: `e${i}`, name: `Etapa ${t.key}-${i}`, sort_order: i } });
    rows[t.key] = ct;
  }
  cleanup.push(async () => {
    await prisma.catalog2DependencyRule.deleteMany({ where: { OR: [{ dependent_product_id: prod.id }, { target_product_id: prod.id }] } });
    await prisma.catalog2PackageItem.deleteMany({ where: { catalog2_product_id: prod.id } });
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { prod, ver, tasks: rows };
}

async function contract(companyId: string, products: Awaited<ReturnType<typeof mkProduct>>[]) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto Pacote ${code}`, project_code: code, company_id: companyId } });
  const pps: Awaited<ReturnType<typeof prisma.projectProduct.create>>[] = [];
  for (const p of products) {
    pps.push(await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: p.prod.id, catalog2_version_id: p.ver.id, product_name_snapshot: p.prod.internal_name, product_category_snapshot: "C" } }));
  }
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: pps.map((p) => p.id) }));
  cleanup.push(async () => {
    await prisma.taskAttachment.deleteMany({ where: { project_task: { project_id: project.id } } }).catch(() => {});
    await prisma.projectDependencyRule.deleteMany({ where: { project_id: project.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.projectPackage.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  });
  const tasks = await prisma.projectTask.findMany({ where: { project_id: project.id }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } } });
  return { project, pps, payment, task: (key: string) => tasks.find((t) => t.catalog2_task!.key === key)! };
}

describe("Pacotes de produtos e dependências", () => {
  let master: Awaited<ReturnType<typeof mkMaster>>;
  let token = "";
  let companyId = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    master = await mkMaster();
    token = tokenFor(master);
    companyId = (await prisma.company.create({ data: { name: `Empresa Pacote ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.company.delete({ where: { id: companyId } }).catch(() => {}); });
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.catalog2Package.deleteMany({ where: { name: { startsWith: "[TESTE]" } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function buildPackage() {
    const gtp = await mkProduct("Gestão de Tráfego", [{ key: "estrategia" }, { key: "publicacao" }, { key: "lancamento", steps: 2 }, { key: "otimizacao" }, { key: "relatorio" }]);
    const criativos = await mkProduct("Criativos", [{ key: "criativos" }]);
    const pkg = await api("/api/admin/catalog2/packages", { method: "POST", token, body: { name: `[TESTE] GTP + Criativos ${uid()}`, product_ids: [gtp.prod.id, criativos.prod.id] } });
    assert.equal(pkg.status, 201);
    const rule = (body: Record<string, unknown>) => api(`/api/admin/catalog2/packages/${pkg.json.id}/rules`, { method: "POST", token, body: { dependent_product_id: gtp.prod.id, target_product_id: criativos.prod.id, ...body } });
    return { gtp, criativos, pkgId: pkg.json.id as string, rule };
  }

  it("cadastro do pacote: mínimo 2 produtos; regra valida alvo, ciclo e pertencimento ao pacote", async () => {
    const one = await mkProduct("Solo", [{ key: "t" }]);
    assert.equal((await api("/api/admin/catalog2/packages", { method: "POST", token, body: { name: "[TESTE] Um só", product_ids: [one.prod.id, one.prod.id] } })).status, 422);

    const { gtp, criativos, rule } = await buildPackage();
    assert.equal((await rule({ dependent_task_key: "publicacao", target_kind: "client_approval" })).status, 422, "faltou a tarefa alvo");
    assert.equal((await rule({ dependent_task_key: "publicacao", target_kind: "client_approval", target_task_key: "nao-existe" })).status, 422);
    const outsider = await mkProduct("Fora", [{ key: "t" }]);
    assert.equal((await rule({ dependent_task_key: "publicacao", target_kind: "product", target_product_id: outsider.prod.id })).status, 422, "produto de fora do pacote");
    assert.equal((await rule({ dependent_task_key: "publicacao", target_kind: "client_approval", target_task_key: "criativos" })).status, 201);
    // ciclo de bloqueio de início entre produtos
    const cycle = await api(`/api/admin/catalog2/packages/${(await prisma.catalog2Package.findFirstOrThrow({ orderBy: { created_at: "desc" } })).id}/rules`, {
      method: "POST", token, body: { dependent_product_id: criativos.prod.id, target_kind: "product", target_product_id: gtp.prod.id, behavior: "block_start" },
    });
    assert.equal(cycle.status, 201, "1ª direção de produto inteiro");
    const back = await api(`/api/admin/catalog2/packages/${(await prisma.catalog2Package.findFirstOrThrow({ orderBy: { created_at: "desc" } })).id}/rules`, {
      method: "POST", token, body: { dependent_product_id: gtp.prod.id, target_kind: "product", target_product_id: criativos.prod.id, behavior: "block_start" },
    });
    assert.equal(back.status, 422);
    assert.equal(back.json.code, "dependency_cycle");
  });

  it("contratados juntos: cria o pacote; estratégia começa, publicação fica bloqueada até os criativos serem aprovados; libera sozinha", async () => {
    const { gtp, criativos, pkgId, rule } = await buildPackage();
    await rule({ dependent_task_key: "publicacao", target_kind: "client_approval", target_task_key: "criativos", behavior: "block_start", note: "Publicação só depois que os criativos forem aprovados" });
    const c = await contract(companyId, [gtp, criativos]);

    const inst = await prisma.projectPackage.findMany({ where: { project_id: c.project.id } });
    assert.equal(inst.length, 1);
    assert.equal(inst[0].package_id, pkgId);
    assert.ok(c.pps.length === 2 && (await prisma.projectProduct.count({ where: { project_id: c.project.id, package_instance_id: inst[0].id } })) === 2);

    assert.equal(c.task("estrategia").status, "PARA_LANCAMENTO", "estratégia pode começar");
    assert.equal(c.task("publicacao").status, "PENDENTE_DE_LIBERACAO", "publicação bloqueada");

    const view = await api(`/api/project-tasks/${c.task("publicacao").id}/dependencies`, { token });
    assert.equal(view.status, 200);
    assert.equal(view.json.blocked, true);
    assert.equal(view.json.rules[0].state, "bloqueada");
    assert.match(view.json.rules[0].reason, /criativos/);
    assert.equal(view.json.rules[0].target_task.id, c.task("criativos").id, "vínculo com o produto de criativos visível");

    // os criativos são aprovados pelo cliente → publicação é liberada automaticamente
    await prisma.projectTask.update({ where: { id: c.task("criativos").id }, data: { aprovado_cliente_em: new Date(), status: "CONCLUIDA" } });
    const moved = await reevaluateProjectDependencies(prisma, c.project.id);
    assert.equal(moved, 1);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: c.task("publicacao").id } })).status, "PARA_LANCAMENTO");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: c.project.id } });
    assert.ok(logs.some((l) => l.kind === "package_linked"));
    assert.ok(logs.some((l) => l.kind === "dependency_blocked"));
    assert.ok(logs.some((l) => l.kind === "dependency_released"));
  });

  it("'bloquear a execução final': pode executar, mas a última etapa só conclui com o entregável", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    await rule({ dependent_task_key: "lancamento", target_kind: "deliverable", target_task_key: "criativos", behavior: "block_final" });
    const c = await contract(companyId, [gtp, criativos]);
    const t = c.task("lancamento");
    assert.equal(t.status, "PARA_LANCAMENTO", "não bloqueia o início");
    const [s1, s2] = t.stages;

    await concluirEtapa(prisma, s1.id, { userId: master.id }); // etapa 1 (não é a final) passa
    await assert.rejects(() => concluirEtapa(prisma, s2.id, { userId: master.id }), DependencyBlockedError);

    const api1 = await api(`/api/project-tasks/${t.id}/dependencies`, { token });
    assert.equal(api1.json.rules[0].state, "bloqueada");

    await prisma.taskAttachment.create({ data: { project_task_id: c.task("criativos").id, type: "delivery", name: "criativo.png", url: "/u/criativo.png", size: 1, mime_type: "image/png", uploaded_by: master.id } });
    const done = await concluirEtapa(prisma, s2.id, { userId: master.id });
    assert.equal(done.enviadaParaAprovacao, true);
  });

  it("'exigir antes da entrega': executa, mas a entrega fica segura até a aprovação interna e depois segue", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    await rule({ dependent_task_key: "otimizacao", target_kind: "internal_approval", target_task_key: "criativos", behavior: "require_before_delivery" });
    const c = await contract(companyId, [gtp, criativos]);
    const t = c.task("otimizacao");
    const r = await concluirEtapa(prisma, t.stages[0].id, { userId: master.id });
    assert.equal(r.aguardandoDependencia, true);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } })).status, "AGUARDANDO_DEPENDENCIA_PRODUTO");

    await prisma.projectTask.update({ where: { id: c.task("criativos").id }, data: { qualified_at: new Date() } });
    assert.equal(await reevaluateProjectDependencies(prisma, c.project.id), 1);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } })).status, "EM_APROVACAO");
  });

  it("'somente alertar' nunca bloqueia", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    await rule({ dependent_task_key: "relatorio", target_kind: "task", target_task_key: "criativos", behavior: "alert_only" });
    const c = await contract(companyId, [gtp, criativos]);
    assert.equal(c.task("relatorio").status, "PARA_LANCAMENTO");
    const view = await api(`/api/project-tasks/${c.task("relatorio").id}/dependencies`, { token });
    assert.equal(view.json.blocked, false);
    assert.equal(view.json.rules[0].satisfied, false);
    assert.equal(view.json.rules[0].state, "aguardando_item");
    const r = await concluirEtapa(prisma, c.task("relatorio").stages[0].id, { userId: master.id });
    assert.equal(r.enviadaParaAprovacao, true);
  });

  it("pré-requisito de PRODUTO: exige outro produto já concluído pelo mesmo cliente", async () => {
    const base = await mkProduct("Site", [{ key: "site" }]);
    const dependent = await mkProduct("Tráfego do site", [{ key: "campanha" }]);
    const create = await api(`/api/admin/catalog2/products/${dependent.prod.id}/prerequisites`, {
      method: "POST", token, body: { target_kind: "product", target_product_id: base.prod.id, behavior: "block_start", note: "Precisa do site pronto" },
    });
    assert.equal(create.status, 201);

    const first = await contract(companyId, [dependent]);
    const blocked = first.task("campanha");
    assert.equal(blocked.status, "PENDENTE_DE_LIBERACAO");
    const missing = await prisma.projectDependencyRule.findFirstOrThrow({ where: { task_id: blocked.id } });
    assert.equal(missing.target_missing, true, "o produto exigido ainda não foi contratado");

    // o cliente contrata e conclui o site depois
    const siteContract = await contract(companyId, [base]);
    await prisma.projectTask.update({ where: { id: siteContract.task("site").id }, data: { status: "CONCLUIDA" } });
    assert.equal(await reevaluateProjectDependencies(prisma, first.project.id), 1);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: blocked.id } })).status, "PARA_LANCAMENTO");
  });

  it("situação do fluxo em linguagem clara; dispensar por regra libera quem dependia; histórico de decisões visível", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    await rule({ dependent_task_key: "publicacao", target_kind: "task", target_task_key: "criativos", behavior: "block_start" });
    const c = await contract(companyId, [gtp, criativos]);

    const flow = await api(`/api/project-tasks/${c.task("publicacao").id}/flow`, { token });
    assert.equal(flow.status, 200);
    assert.equal(flow.json.state, "aguardando_dependencia_produto");
    assert.equal(flow.json.label, "Aguardando dependência de produto");
    assert.match(flow.json.reason, /criativos/);
    assert.equal((await api(`/api/project-tasks/${c.task("estrategia").id}/flow`, { token })).json.state, "em_lancamento");

    // só líder/admin dispensa; tarefa que já começou não pode
    const plain = await prisma.user.create({ data: { id: `pl-${uid()}${uid()}`, email: `pl-${uid()}@example.test`, password_hash: "x", name: "x", role: "company_user", account_type: "empresas", is_active: true, status: "ativo" } });
    userIds.push(plain.id);
    assert.equal((await api(`/api/project-tasks/${c.task("criativos").id}/dispense`, { method: "POST", token: tokenFor(plain), body: { reason: "Cliente já tem os criativos" } })).status, 403);
    const dis = await api(`/api/project-tasks/${c.task("criativos").id}/dispense`, { method: "POST", token, body: { reason: "Cliente já tem os criativos" } });
    assert.equal(dis.status, 200);
    assert.equal((await api(`/api/project-tasks/${c.task("criativos").id}/flow`, { token })).json.state, "dispensada_por_regra");
    // a própria rota já reavalia em segundo plano; garante também pela via direta (idempotente)
    await reevaluateProjectDependencies(prisma, c.project.id);
    let released = "";
    for (let i = 0; i < 20 && released !== "PARA_LANCAMENTO"; i++) {
      released = (await prisma.projectTask.findUniqueOrThrow({ where: { id: c.task("publicacao").id } })).status;
      if (released !== "PARA_LANCAMENTO") await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(released, "PARA_LANCAMENTO", "dispensada conta como cumprida");

    await prisma.projectTask.update({ where: { id: c.task("estrategia").id }, data: { status: "EM_EXECUCAO" } });
    assert.equal((await api(`/api/project-tasks/${c.task("estrategia").id}/dispense`, { method: "POST", token, body: { reason: "Teste de tarefa em andamento" } })).status, 422);

    const decisions = await api(`/api/project-tasks/${c.task("criativos").id}/decisions`, { token });
    assert.equal(decisions.status, 200);
    assert.ok(decisions.json.data.some((d: { kind: string; automatic: boolean }) => d.kind === "task_dispensed" && d.automatic === false));
  });

  it("worker de dependências: avisa o líder quando a dependência atrasa (uma vez por dia) e não repete", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    await rule({ dependent_task_key: "publicacao", target_kind: "task", target_task_key: "criativos", behavior: "block_start" });
    const c = await contract(companyId, [gtp, criativos]);
    await prisma.projectTask.update({ where: { id: c.task("publicacao").id }, data: { lider_responsavel_id: master.id } });
    await prisma.projectTask.update({ where: { id: c.task("criativos").id }, data: { due_date: new Date(Date.now() - 86_400_000) } });

    const first = await runDependencySchedulerOnce();
    assert.ok(first.alerts >= 1);
    const alerts = await prisma.systemAlert.findMany({ where: { user_id: master.id, type: "dependencia_atrasada", entity_id: c.task("publicacao").id } });
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].message, /vencida/);
    const second = await runDependencySchedulerOnce();
    assert.equal(second.alerts, 0, "não repete dentro de 24h");
    assert.equal((await prisma.systemAlert.count({ where: { user_id: master.id, type: "dependencia_atrasada", entity_id: c.task("publicacao").id } })), 1);
    assert.ok((await prisma.projectDecisionLog.findMany({ where: { project_id: c.project.id, kind: "dependency_delay_alert" } })).length >= 1);
  });

  it("regra desativada não vale para novas contratações", async () => {
    const { gtp, criativos, rule } = await buildPackage();
    const r = await rule({ dependent_task_key: "publicacao", target_kind: "client_approval", target_task_key: "criativos" });
    const off = await api(`/api/admin/catalog2/dependency-rules/${r.json.id}/active`, { method: "PATCH", token, body: { is_active: false } });
    assert.equal(off.json.is_active, false);
    const c = await contract(companyId, [gtp, criativos]);
    assert.equal(c.task("publicacao").status, "PARA_LANCAMENTO");
  });
});
