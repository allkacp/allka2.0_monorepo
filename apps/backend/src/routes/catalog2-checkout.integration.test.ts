import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";

// Checkout / pedido / financeiro / tarefas / aditivos do catalog2 (sprint de
// produtos, bloco 6/6). Cobre: cotação -> pedido, idempotência de clique
// duplo, isolamento entre contas, snapshot imutável, materialização de
// tarefas a partir da versão CONTRATADA (nunca a mais recente), e o ciclo
// completo de um aditivo (solicitar -> aprovar -> pagar isoladamente).

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co6 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c6co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co6 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C6 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c6ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

/** Cria um produto catalog2 publicado e comercialmente completo, sem
 * variações obrigatórias (checkout mais simples de testar). */
async function mkPublishedProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
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
      tasks: {
        create: [
          { key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
            steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } },
        ],
      },
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

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let CO_B: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

async function createQuoteViaApi(token: string, productId: string, quantity = 1) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity, answers: {} } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string; commercial_price: number };
}

describe("Checkout, pedido, financeiro, tarefas e aditivos do catalog2 (bloco 6/6)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);

    CO_A = await mkCompanyUser("A");
    CO_B = await mkCompanyUser("B");
    MASTER = (await mkAdmin(true)).token;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) await purgeProject(id);
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. checkout com cotação válida cria Project + ProjectProduct com snapshot correto", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);

    const r = await api("/api/catalog2/checkout", {
      method: "POST", token: CO_A.token,
      body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() },
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    projects.push(r.json.project.id);
    assert.equal(r.json.project.company_id, CO_A.companyId);
    assert.equal(r.json.project_products.length, 1);
    assert.equal(r.json.project_products[0].origin, "CATALOG2");
    assert.equal(r.json.project_products[0].preco_final_cliente_snapshot, quote.commercial_price);
  });

  it("2. clique duplo (mesmo checkout_client_action_id) não duplica o pedido", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const actionId = crypto.randomUUID();

    const r1 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: actionId } });
    assert.equal(r1.status, 201);
    projects.push(r1.json.project.id);
    const r2 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: actionId } });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.project.id, r1.json.project.id);
    assert.equal(r2.json.already_processed, true);

    const count = await prisma.project.count({ where: { catalog2_checkout_client_action_id: actionId } });
    assert.equal(count, 1);
  });

  it("3. cotação de outra conta não pode ser usada no checkout", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const r = await api("/api/catalog2/checkout", { method: "POST", token: CO_B.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(r.status, 404);
  });

  it("4. cotação expirada bloqueia o checkout", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({ where: { id: quote.id }, data: { valid_until: new Date(Date.now() - 1000) } });
    const r = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, "quote_stale");
    const count = await prisma.projectProduct.count({ where: { origin_catalog2_quote_id: quote.id } });
    assert.equal(count, 0);
  });

  it("5. Admin (preview) não pode finalizar checkout", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const r = await api("/api/catalog2/checkout", { method: "POST", token: MASTER, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(r.status, 403);
  });

  it("6. pagamento confirmado materializa tarefas a partir da versão CONTRATADA (não da mais recente publicada depois)", async () => {
    const { product, versionId } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201);
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    // Publica uma NOVA versão do produto com uma tarefa diferente — o
    // pedido já feito não pode ser afetado.
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    const newVersion = await prisma.catalog2ProductVersion.create({
      data: {
        product_id: product.id, version_number: 2, state: "rascunho", title: "v2", summary: "v2", full_description: "descrição v2", base_commercial_deadline_days: 5,
        tasks: { create: [{ key: "t2-nova", name: "Tarefa da v2 (não deveria aparecer no pedido antigo)", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1 }] },
      },
    });
    await publishVersion(newVersion.id, "system", { changeSummary: "v2" });

    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201, JSON.stringify(pay.json));
    assert.ok((pay.json.tarefasCriadasAgora ?? 0) > 0);

    const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
    assert.ok(tasks.every((t) => t.catalog2_version_id === versionId));
    assert.ok(!tasks.some((t) => t.name_snapshot.includes("Tarefa da v2")));
  });

  it("7. retry de fake-checkout não duplica pagamento nem tarefas", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    const pay1 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay1.status, 201);
    const tasksAfter1 = await prisma.projectTask.count({ where: { project_id: projectId } });

    const pay2 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay2.status, 201);
    assert.equal(pay2.json.alreadyProcessed, true);
    const tasksAfter2 = await prisma.projectTask.count({ where: { project_id: projectId } });
    assert.equal(tasksAfter1, tasksAfter2);

    const payments = await prisma.payment.count({ where: { project_id: projectId } });
    assert.equal(payments, 1);
  });

  it("8. aditivo: solicitar sem aprovação não materializa nada; aprovar revalida preço; checkout do aditivo gera tarefas isoladas sem duplicar as do pedido original", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201);
    const originalTaskCount = await prisma.projectTask.count({ where: { project_id: projectId } });

    // Quantidade diferente da cotação original — checksum diferente, para
    // não colidir com a constraint única de (conta, checksum, status) do
    // catalog2_quotes quando ambas eventualmente viram "convertida".
    const addonQuote = await createQuoteViaApi(CO_A.token, product.id, 2);
    const reqRes = await api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: projectId, quote_id: addonQuote.id } });
    assert.equal(reqRes.status, 201, JSON.stringify(reqRes.json));
    const changeOrderId = reqRes.json.id;
    assert.equal(reqRes.json.status, "solicitado");

    const ppCountBeforeApproval = await prisma.projectProduct.count({ where: { project_id: projectId } });
    assert.equal(ppCountBeforeApproval, 1); // nada materializado ainda

    // usuário comum não pode aprovar
    const badApprove = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: CO_A.token, body: { approval_client_action_id: crypto.randomUUID() } });
    assert.equal(badApprove.status, 403);

    const approveActionId = crypto.randomUUID();
    const approve = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: MASTER, body: { approval_client_action_id: approveActionId } });
    assert.equal(approve.status, 200, JSON.stringify(approve.json));
    assert.equal(approve.json.status, "aprovado");
    assert.ok(approve.json.price_impact_snapshot > 0);

    // aprovar de novo com o MESMO approval_client_action_id é idempotente
    const approveAgain = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: MASTER, body: { approval_client_action_id: approveActionId } });
    assert.equal(approveAgain.status, 200);
    assert.equal(approveAgain.json.status, "aprovado");

    const co = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(co.status, 201, JSON.stringify(co.json));
    assert.ok(co.json.tasks_generated > 0);

    const finalTaskCount = await prisma.projectTask.count({ where: { project_id: projectId } });
    assert.equal(finalTaskCount, originalTaskCount + co.json.tasks_generated);

    const payments = await prisma.payment.count({ where: { project_id: projectId } });
    assert.equal(payments, 2); // um do pedido original, um do aditivo — isolados
  });

  it("9. aditivo rejeitado nunca materializa nada", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    const addonQuote = await createQuoteViaApi(CO_A.token, product.id);
    const reqRes = await api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: projectId, quote_id: addonQuote.id } });
    const changeOrderId = reqRes.json.id;
    const rej = await api(`/api/catalog2/change-orders/${changeOrderId}/reject`, { method: "POST", token: MASTER, body: { decision_note: "não autorizado" } });
    assert.equal(rej.status, 200);
    assert.equal(rej.json.status, "rejeitado");

    const coCheckout = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(coCheckout.status, 409);
    const ppCount = await prisma.projectProduct.count({ where: { project_id: projectId } });
    assert.equal(ppCount, 1);
  });

  it("10. conta A não acessa/lista aditivo de conta B", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    const list = await api(`/api/catalog2/change-orders?project_id=${projectId}`, { token: CO_B.token });
    assert.equal(list.status, 403);
  });

  it("11. custos internos não vazam na resposta do checkout", async () => {
    const { product } = await mkPublishedProduct(`t6-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const r = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    projects.push(r.json.project.id);
    const raw = JSON.stringify(r.json).toLowerCase();
    assert.ok(!raw.includes("margem"));
    assert.ok(!raw.includes("imposto"));
  });
});
