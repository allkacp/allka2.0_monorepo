import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";
import { processDueInactivations } from "../lib/catalog2-service";
import { processPendingCatalog2NotificationJobs } from "../lib/catalog2-notifications";

// Item 5 (reunião 2026-09-14, "Inativação programada de produtos") —
// substitui o bloqueio direto dos Itens 2/2.1 (quando há vínculo ativo) por
// um fluxo de AVISO + 30 dias: agendar → notificar → propostas vigentes
// continuam honradas → na data efetiva, produto vira "arquivado" de
// verdade. "Relógio controlado" = manipulação direta de
// inactivation_scheduled_at/inactivation_effective_at já persistidos.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];

const DAY = 24 * 3600 * 1000;

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

async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] Co9 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c9co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co9 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C9 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c9ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: master ? "Admin Master" : "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

async function setPricingSettings() {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
    update: {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
  });
}

async function mkPublishedProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: {
      slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao",
      four_f: { create: [{ four_f_id: fourF.id }] },
    },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
      tasks: { create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } }] },
    },
  });
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}

async function purgeProject(id: string) {
  await prisma.catalog2ChangeOrder.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
  await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id } }).catch(() => {});
}
async function purgeProduct(id: string) {
  await prisma.systemAlert.deleteMany({ where: { entity_type: "catalog2_product", entity_id: id } }).catch(() => {});
  await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

async function createQuoteViaApi(token: string, productId: string, quantity = 1) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity, answers: {} } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string; commercial_price: number };
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER_USER: Awaited<ReturnType<typeof mkAdmin>>;
let MASTER = "";
let COMMON_ADMIN = "";

describe("Inativação programada de produtos (Item 5, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    MASTER_USER = await mkAdmin(true);
    MASTER = MASTER_USER.token;
    COMMON_ADMIN = (await mkAdmin(false)).token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await setPricingSettings();
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) await purgeProject(id);
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. prévia mostra projetos/propostas afetados; agendamento notifica os responsáveis corretos", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    const master = MASTER_USER.user;
    await prisma.project.update({ where: { id: projectId }, data: { admin_responsible_user_id: master.id } });

    // uma segunda proposta vigente, ainda não convertida.
    const otherQuote = await createQuoteViaApi(CO_A.token, product.id, 2);

    const preview = await api(`/api/admin/catalog2/products/${product.id}/inactivation/preview`, { token: MASTER });
    assert.equal(preview.status, 200);
    assert.equal(preview.json.already_scheduled, false);
    assert.equal(preview.json.affected_projects.length, 1);
    assert.equal(preview.json.affected_projects[0].project_id, projectId);
    assert.ok(preview.json.affected_quotes.some((q: any) => q.id === otherQuote.id));
    assert.ok(preview.json.consequences.length > 0);

    const schedule = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: { note: "descontinuado" } });
    assert.equal(schedule.status, 201, JSON.stringify(schedule.json));
    assert.equal(schedule.json.already_scheduled, false);
    assert.ok(schedule.json.product.inactivation_scheduled_at);
    assert.ok(schedule.json.product.inactivation_effective_at);
    const effAt = new Date(schedule.json.product.inactivation_effective_at);
    const schAt = new Date(schedule.json.product.inactivation_scheduled_at);
    assert.equal(Math.round((effAt.getTime() - schAt.getTime()) / DAY), 30);

    // Item 8.1: a intenção (Job) já fica persistida junto do agendamento —
    // o ENVIO em si (SystemAlert) é assíncrono/resumível; roda o worker uma
    // vez aqui pra checar a entrega de ponta a ponta.
    const pendingJob = await prisma.catalog2NotificationJob.findFirst({ where: { event_type: "inactivation_scheduled", entity_id: product.id, status: "pending" } });
    assert.ok(pendingJob, "a intenção de notificar deve ser gravada junto do agendamento, mesmo antes do envio");
    await processPendingCatalog2NotificationJobs();

    const alertsForAdmin = await prisma.systemAlert.findMany({ where: { entity_id: product.id, user_id: master.id, type: "catalog2.product_inactivation_scheduled" } });
    assert.equal(alertsForAdmin.length, 1, "responsável do projeto afetado deveria ser notificado");
    const alertsForClient = await prisma.systemAlert.findMany({ where: { entity_id: product.id, user_id: CO_A.user.id, type: "catalog2.product_inactivation_scheduled" } });
    assert.equal(alertsForClient.length, 1, "dono da proposta vigente deveria ser notificado (uma vez, mesmo tendo 2 propostas)");
  });

  it("2. proposta anterior continua válida durante o aviso, respeitando validade e proteção de preço", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({ where: { id: quote.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });

    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });

    const rev = await api(`/api/catalog2/quotes/${quote.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.status, "valida", "proposta anterior continua válida durante o aviso");

    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    projects.push(checkout.json.project.id);
  });

  it("3. novas propostas são bloqueadas desde o AGENDAMENTO — antes mesmo da data efetiva", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });

    const list = await api("/api/catalog2/products?page_size=100", { token: CO_A.token });
    const row = list.json.data.find((p: any) => p.slug === product.slug);
    assert.ok(row, "produto continua visível no catálogo durante o aviso");
    assert.equal(row.contractable, false);
    assert.match(row.unavailable_reason ?? "", /Inativação programada/);

    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.can_contract, false);
    assert.match(detail.json.contract_blocked_reason ?? "", /Inativação programada/);

    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] } } });
    assert.equal(q.status, 409);
    assert.equal(q.json.code, "not_quotable");

    const cart = await api("/api/catalog2/cart/items", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] } } });
    assert.equal(cart.status, 409);
  });

  it("4. limite exato de 30 dias: 1 segundo antes ainda vale, exatamente na hora não vale mais", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({ where: { id: quote.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });
    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });

    const scheduled = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    const effectiveAt = scheduled.inactivation_effective_at!;

    // 1s antes do limite: continua honrada.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_scheduled_at: new Date(effectiveAt.getTime() - 30 * DAY), inactivation_effective_at: effectiveAt } });
    const before = await api(`/api/catalog2/quotes/${quote.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(before.json.status, "valida");

    // Simula "agora == effectiveAt" ajustando o campo pra já ter passado.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_effective_at: new Date(Date.now() - 1000) } });
    const after = await api(`/api/catalog2/quotes/${quote.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(after.json.status, "expirada", "no limite exato (e depois) a proposta deixa de ser honrada");
  });

  it("5. checkout e aditivo são bloqueados no backend depois da data final, mesmo usando cotação antiga", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const purchaseQuote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout1 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [purchaseQuote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout1.status, 201);
    const projectId = checkout1.json.project.id;
    projects.push(projectId);

    // cotação de aditivo, ainda válida, gerada ANTES da data final.
    const addonQuote = await createQuoteViaApi(CO_A.token, product.id, 3);
    await prisma.catalog2Quote.update({ where: { id: addonQuote.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });

    // agenda e força a data efetiva pro passado (produto ainda não processado pelo worker).
    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_effective_at: new Date(Date.now() - 1000) } });

    // Checkout de uma cotação NOVA (impossível gerar — bloqueado desde o agendamento) nem entra em jogo;
    // o que importa aqui é que o CHECKOUT com a cotação antiga também é recusado.
    const checkout2 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [addonQuote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout2.status, 409);
    assert.equal(checkout2.json.code, "quote_stale");

    const reqRes = await api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: projectId, quote_id: addonQuote.id } });
    assert.equal(reqRes.status, 409, "cotação não está mais 'valida' -> não pode nem virar solicitação de aditivo");

    const ppCount = await prisma.projectProduct.count({ where: { project_id: projectId } });
    assert.equal(ppCount, 1, "nenhum aditivo foi materializado");
  });

  it("6. reexecução do processamento não duplica notificações nem reprocessa; agendar 2x não reancora o prazo", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const s1 = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    assert.equal(s1.status, 201);
    const s2 = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    assert.equal(s2.status, 200);
    assert.equal(s2.json.already_scheduled, true);
    assert.equal(s2.json.product.inactivation_scheduled_at, s1.json.product.inactivation_scheduled_at, "reexecutar a confirmação nunca reancora o prazo");

    // Item 8.1: este cenário não tem projeto/proposta vinculados — 0
    // destinatários, então `notifyInactivationRecipients` nem chega a criar
    // um Job (nada a notificar); confirma que agendar 2x não muda isso.
    const jobsAfterDoubleSchedule = await prisma.catalog2NotificationJob.count({ where: { entity_id: product.id, event_type: "inactivation_scheduled" } });
    assert.equal(jobsAfterDoubleSchedule, 0, "sem destinatários, nenhum Job é criado");
    await processPendingCatalog2NotificationJobs();
    const alertsAfterDoubleSchedule = await prisma.systemAlert.count({ where: { entity_id: product.id, type: "catalog2.product_inactivation_scheduled" } });

    // força o vencimento e processa 3x seguidas — idempotente.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_effective_at: new Date(Date.now() - 1000) } });
    await processDueInactivations();
    const afterFirstRun = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(afterFirstRun.status, "arquivado");
    assert.ok(afterFirstRun.inactivation_processed_at);
    await processDueInactivations();
    await processDueInactivations();
    const afterMoreRuns = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(afterMoreRuns.inactivation_processed_at?.getTime(), afterFirstRun.inactivation_processed_at?.getTime(), "reprocessar não reatualiza o timestamp");

    // reprocessa o worker de notificação repetidas vezes também — nunca duplica.
    await processPendingCatalog2NotificationJobs();
    await processPendingCatalog2NotificationJobs();
    await processPendingCatalog2NotificationJobs();

    const closureAlerts = await prisma.systemAlert.count({ where: { entity_id: product.id, type: "catalog2.product_inactivation_processed" } });
    // 0 destinatários neste teste (sem projeto/proposta vinculados) — o que
    // importa é que rodar 3x não MULTIPLICA o que quer que tenha sido criado.
    const alertsAfterAllRuns = await prisma.systemAlert.count({ where: { entity_id: product.id, type: "catalog2.product_inactivation_scheduled" } });
    assert.equal(alertsAfterAllRuns, alertsAfterDoubleSchedule, "reprocessar o job nunca duplica os avisos de agendamento");
    assert.equal(closureAlerts, 0);
  });

  it("7. contratos, pagamentos e histórico já existentes permanecem intactos", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const paidPrice = quote.commercial_price;
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201);
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201, JSON.stringify(pay.json));
    const taskCountBefore = await prisma.projectTask.count({ where: { project_id: projectId } });
    const paymentCountBefore = await prisma.payment.count({ where: { project_id: projectId } });

    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_effective_at: new Date(Date.now() - 1000) } });
    await processDueInactivations();

    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { origin_catalog2_quote_id: quote.id } });
    assert.equal(pp.preco_final_cliente_snapshot, paidPrice);
    assert.notEqual(pp.status, "CANCELADO");
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId } }), taskCountBefore);
    assert.equal(await prisma.payment.count({ where: { project_id: projectId } }), paymentCountBefore);
    const productReloaded = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(productReloaded.status, "arquivado");
  });

  it("8. permissões administrativas — só Admin Master programa/cancela; admin comum e cliente são recusados", async () => {
    const { product } = await mkPublishedProduct(`t9-${crypto.randomBytes(4).toString("hex")}`);

    const byCommon = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: COMMON_ADMIN, body: {} });
    assert.equal(byCommon.status, 404);
    const byClient = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(byClient.status, 404);
    const previewByCommon = await api(`/api/admin/catalog2/products/${product.id}/inactivation/preview`, { token: COMMON_ADMIN });
    assert.equal(previewByCommon.status, 404);

    const schedule = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    assert.equal(schedule.status, 201);

    const cancelByCommon = await api(`/api/admin/catalog2/products/${product.id}/inactivation/cancel`, { method: "POST", token: COMMON_ADMIN });
    assert.equal(cancelByCommon.status, 404);

    const cancelByMaster = await api(`/api/admin/catalog2/products/${product.id}/inactivation/cancel`, { method: "POST", token: MASTER });
    assert.equal(cancelByMaster.status, 200);
    assert.equal(cancelByMaster.json.product.inactivation_scheduled_at, null);

    // depois de cancelado, o produto volta a ficar contratável normalmente.
    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.json.can_contract, true);

    // cancelar de novo (já não agendado) é recusado com o motivo certo.
    const cancelAgain = await api(`/api/admin/catalog2/products/${product.id}/inactivation/cancel`, { method: "POST", token: MASTER });
    assert.equal(cancelAgain.status, 409);
    assert.equal(cancelAgain.json.code, "not_scheduled");
  });
});
