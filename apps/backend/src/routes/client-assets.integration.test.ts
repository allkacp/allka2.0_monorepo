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
import { isAssetValid, reopenAccessValidationOnExecutorChange } from "../lib/client-assets";

// Ativos validados do cliente: reaproveitar acessos já válidos, revalidar por regra,
// nunca aceitar senha.

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
  const id = `ast-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}

async function mkCatalog(assetRule: string, days: number | null = null) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `ast-${code}`, internal_name: `[TESTE] Ativos ${code}`, status: "disponivel" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T" } });
  await prisma.catalog2VersionAccess.createMany({
    data: [
      { version_id: ver.id, access_type: "google_ads", label: "Google Ads", is_required: true, sort_order: 1 },
      { version_id: ver.id, access_type: "meta_business_manager", label: "Meta Business Manager", is_required: true, sort_order: 2 },
      { version_id: ver.id, access_type: "crm", label: "CRM", is_required: false, sort_order: 3 },
    ],
  });
  const sm = await prisma.catalog2StepModel.create({ data: { name: `Acessos ${code}`, purpose: "coleta_informacao", is_access_validation: true, signature: `sig-${code}` } });
  const task = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "gestao", name: "Gestão de campanhas", asset_rule: assetRule, asset_revalidate_days: days } });
  await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "acessos", name: "Validação e organização dos acessos", sort_order: 1, step_model_id: sm.id } });
  await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "executar", name: "Executar", sort_order: 2 } });
  cleanup.push(async () => {
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
    await prisma.catalog2StepModel.delete({ where: { id: sm.id } }).catch(() => {});
  });
  return { prod, ver, task };
}

async function contract(cat: Awaited<ReturnType<typeof mkCatalog>>, companyId: string) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto Ativos ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: cat.prod.id, catalog2_version_id: cat.ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
  cleanup.push(async () => {
    await prisma.clientAssetLink.deleteMany({ where: { project_id: project.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  });
  const task = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id }, include: { stages: { orderBy: { ordem: "asc" } } } });
  return { project, pp, task };
}

const validateBoth = async (token: string, companyId: string) => {
  const assets = (await api(`/api/client-assets?company_id=${companyId}`, { token })).json.data as { id: string; label: string }[];
  for (const a of assets.filter((x) => x.label !== "CRM")) {
    const r = await api(`/api/client-assets/${a.id}/validate`, { method: "POST", token, body: { scope_confirmed: "Administrador" } });
    assert.equal(r.status, 200);
  }
};

describe("Ativos validados do cliente", () => {
  let companyId = "";
  let admin: Awaited<ReturnType<typeof mkUser>>;
  let client: Awaited<ReturnType<typeof mkUser>>;
  let stranger: Awaited<ReturnType<typeof mkUser>>;
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    companyId = (await prisma.company.create({ data: { name: `Empresa Ativos ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.company.delete({ where: { id: companyId } }).catch(() => {}); });
    const other = await prisma.company.create({ data: { name: `Outra ${uid()}` } });
    cleanup.push(async () => { await prisma.company.delete({ where: { id: other.id } }).catch(() => {}); });
    admin = await mkUser("admin", "admin");
    client = await mkUser("company_user", "empresas", { company_id: companyId });
    stranger = await mkUser("company_user", "empresas", { company_id: other.id });
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.clientAsset.deleteMany({ where: { company_id: companyId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("regra de validade: primeira vez, sempre, a cada X dias, mudança informada, expirado", () => {
    const now = new Date();
    const valid = { status: "validado", last_validated_at: new Date(now.getTime() - 10 * 86_400_000), expires_at: null, change_reported_at: null };
    assert.equal(isAssetValid(valid, "first_only"), true);
    assert.equal(isAssetValid(valid, "always"), false);
    assert.equal(isAssetValid(valid, "every_x_days", { revalidateDays: 30 }), true);
    assert.equal(isAssetValid(valid, "every_x_days", { revalidateDays: 7 }), false);
    assert.equal(isAssetValid({ ...valid, change_reported_at: now }, "on_client_change"), false);
    assert.equal(isAssetValid({ ...valid, change_reported_at: now }, "first_only"), true);
    assert.equal(isAssetValid({ ...valid, expires_at: new Date(now.getTime() - 1000) }, "none_while_valid"), false);
    assert.equal(isAssetValid({ ...valid, status: "pendente" }, "first_only"), false);
  });

  it("1ª contratação: cria os ativos pendentes ligados à tarefa; validar (Allka) dispensa a etapa de acessos; cliente não valida", async () => {
    const cat = await mkCatalog("first_only");
    const c1 = await contract(cat, companyId);
    assert.equal(c1.task.stages[0].status, "PENDENTE", "acessos ainda não validados");
    const assets = await prisma.clientAsset.findMany({ where: { company_id: companyId } });
    assert.deepEqual(assets.map((a) => a.label).sort(), ["CRM", "Google Ads", "Meta Business Manager"]);
    assert.ok(assets.every((a) => a.status === "pendente"));

    const view = await api(`/api/project-tasks/${c1.task.id}/assets`, { token: tokenFor(admin) });
    assert.equal(view.status, 200);
    assert.equal(view.json.assets.length, 3);
    assert.equal(view.json.can_validate, true);

    const ga = assets.find((a) => a.label === "Google Ads")!;
    assert.equal((await api(`/api/client-assets/${ga.id}/validate`, { method: "POST", token: tokenFor(client), body: { scope_confirmed: "Admin" } })).status, 403);
    assert.equal((await api(`/api/client-assets?company_id=${companyId}`, { token: tokenFor(stranger) })).status, 404);
    assert.equal((await api(`/api/client-assets?company_id=${companyId}`, { token: tokenFor(client) })).status, 200);

    await validateBoth(tokenFor(admin), companyId);
    const stage = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: c1.task.id }, orderBy: { ordem: "asc" } });
    assert.equal(stage.status, "CONCLUIDA", "todos os obrigatórios válidos → etapa de acessos concluída");
    assert.match(stage.config_snapshot ?? "", /dispensed_by/);
  });

  it("contratação seguinte (mesmo cliente): acessos já válidos → etapa de coleta NÃO é repetida", async () => {
    const cat = await mkCatalog("first_only");
    const c2 = await contract(cat, companyId); // ativos do teste anterior já estão validados
    assert.equal(c2.task.stages[0].status, "CONCLUIDA");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: c2.project.id, kind: "task_dispensed" } });
    assert.equal(logs.length, 1);
    assert.match(logs[0].message, /já estão válidos/);
    const links = await prisma.clientAssetLink.count({ where: { project_task_id: c2.task.id } });
    assert.equal(links, 3, "produtos e tarefas que dependem do ativo ficam registrados");
  });

  it("regras: 'sempre validar' e 'a cada X dias' (vencido) mantêm a etapa; 'verificação leve' mantém só a checagem", async () => {
    const always = await contract(await mkCatalog("always"), companyId);
    assert.equal(always.task.stages[0].status, "PENDENTE");

    await prisma.clientAsset.updateMany({ where: { company_id: companyId }, data: { last_validated_at: new Date(Date.now() - 40 * 86_400_000) } });
    const old = await contract(await mkCatalog("every_x_days", 30), companyId);
    assert.equal(old.task.stages[0].status, "PENDENTE", "validação de 40 dias > 30");
    const fresh = await contract(await mkCatalog("every_x_days", 60), companyId);
    assert.equal(fresh.task.stages[0].status, "CONCLUIDA");

    const light = await contract(await mkCatalog("light_check"), companyId);
    assert.equal(light.task.stages[0].status, "PENDENTE", "a etapa fica, mas leve");
    assert.match(light.task.stages[0].config_snapshot ?? "", /light_check/);
    assert.equal(light.task.stages[0].horas_execucao, 0.25);
  });

  it("cliente informa mudança → volta a revalidar; inválido/expirado marca o contrato para revalidação", async () => {
    const cat = await mkCatalog("on_client_change");
    await prisma.clientAsset.updateMany({ where: { company_id: companyId }, data: { last_validated_at: new Date(), status: "validado", change_reported_at: null } });
    const ok = await contract(cat, companyId);
    assert.equal(ok.task.stages[0].status, "CONCLUIDA");

    const asset = await prisma.clientAsset.findFirstOrThrow({ where: { company_id: companyId, label: "Google Ads" } });
    const rep = await api(`/api/client-assets/${asset.id}/report-change`, { method: "POST", token: tokenFor(client), body: { note: "Trocamos a conta" } });
    assert.equal(rep.status, 200);
    assert.equal(rep.json.status, "revalidar");
    const again = await contract(cat, companyId);
    assert.equal(again.task.stages[0].status, "PENDENTE", "precisa revalidar");

    const inv = await api(`/api/client-assets/${asset.id}/invalidate`, { method: "POST", token: tokenFor(admin), body: { reason: "Permissão removida pelo cliente", expired: true } });
    assert.equal(inv.status, 200);
    assert.equal(inv.json.status, "expirado");
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: again.pp.id } });
    assert.match(pp.revalidation_reason ?? "", /acesso expirado: Google Ads/);
    assert.ok((await prisma.projectDecisionLog.findMany({ where: { project_id: again.project.id, kind: "asset_invalidated" } })).length >= 1);
  });

  it("troca de executor reabre a validação quando a regra é 'revalidar se houver troca de executor'", async () => {
    const cat = await mkCatalog("on_executor_change");
    await prisma.clientAsset.updateMany({ where: { company_id: companyId }, data: { status: "validado", last_validated_at: new Date(), change_reported_at: null, expires_at: null } });
    const c = await contract(cat, companyId);
    assert.equal(c.task.stages[0].status, "CONCLUIDA");
    assert.equal(await reopenAccessValidationOnExecutorChange(prisma, c.task.id), true);
    const stage = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: c.task.id }, orderBy: { ordem: "asc" } });
    assert.equal(stage.status, "PENDENTE");
  });

  it("NUNCA aceita senha ou credencial", async () => {
    const token = tokenFor(admin);
    const byKey = await api("/api/client-assets", { method: "POST", token, body: { company_id: companyId, asset_type: "crm", label: "CRM X", password: "123" } });
    assert.equal(byKey.status, 422);
    assert.match(byKey.json.error, /senha/i);
    const byText = await api("/api/client-assets", { method: "POST", token, body: { company_id: companyId, asset_type: "crm", label: "CRM Y", notes: "senha: abc123" } });
    assert.equal(byText.status, 422);
    const ok = await api("/api/client-assets", { method: "POST", token, body: { company_id: companyId, asset_type: "site_landing", label: "Site institucional", identifier: "exemplo.com.br" } });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.status, "pendente", "informar o identificador não valida");
  });
});
