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

/** Item 3.2: mesmo que mkPublishedProduct, mas a tarefa fixa já nasce
 * vinculada a um questionário com 2 perguntas (uma obrigatória, uma não). */
async function mkPublishedProductWithQuestionnaire(slug: string) {
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

  const questionnaire = await prisma.catalog2Questionnaire.create({
    data: {
      name: `[TESTE] Briefing ${slug}`,
      questions: {
        create: [
          { key: "objetivo", label: "Qual o objetivo da campanha?", is_required: true, sort_order: 1 },
          { key: "referencias", label: "Tem referências visuais?", is_required: false, sort_order: 2 },
        ],
      },
    },
  });

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
            questionnaire_id: questionnaire.id,
            steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } },
        ],
      },
    },
  });
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return {
    product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }),
    versionId: v.id,
    questionnaireId: questionnaire.id,
  };
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

  // Item 2 (reunião 2026-09-14), LIMITE COMERCIAL: inativar (arquivar) um
  // produto vinculado a um pedido em andamento depende do aviso de 30 dias
  // (outro item, ainda não implementado) — até lá a transição é bloqueada.
  // Pausar/marcar como esgotado NÃO tem essa restrição (o produto continua
  // visível, só a contratação de NOVOS pedidos é que fica bloqueada).
  it("1b. arquivar produto com pedido em andamento (PENDENTE) é bloqueado; pausar continua permitido; arquivar funciona depois que o pedido conclui", async () => {
    const { product } = await mkPublishedProduct(`t6-link-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", {
      method: "POST", token: CO_A.token,
      body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() },
    });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    projects.push(checkout.json.project.id);
    const projectProductId = checkout.json.project_products[0].id;

    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: projectProductId } });
    assert.equal(pp.status, "PENDENTE");

    const archiveBlocked = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveBlocked.status, 409);
    assert.equal(archiveBlocked.json.code, "active_project_links");
    assert.match(archiveBlocked.json.error, /30 dias/);

    const statusArchiveBlocked = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });
    assert.equal(statusArchiveBlocked.status, 409);
    assert.equal(statusArchiveBlocked.json.code, "active_project_links");

    // Pausar (não é "inativação" no sentido da tarefa) continua permitido.
    const pause = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "temporariamente_inativo" } });
    assert.equal(pause.status, 200);
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { status: "disponivel" } });

    // Pedido concluído: o vínculo não é mais "ativo" — arquivar libera.
    await prisma.projectProduct.update({ where: { id: projectProductId }, data: { status: "CONCLUIDO" } });
    const archiveOk = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveOk.status, 200, JSON.stringify(archiveOk.json));
    assert.equal(archiveOk.json.status, "arquivado");
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

  // Item 2.1 (reunião 2026-09-14, "fechar as lacunas de disponibilidade"):
  // gap real encontrado — "/approve" já revalidava a cotação do aditivo,
  // mas "/checkout" não revalidava de novo. Entre aprovar e finalizar o
  // checkout, o produto podia ser pausado/esgotado/arquivado e o checkout
  // ainda passava, porque só olhava o `status` (possivelmente desatualizado)
  // salvo na Catalog2Quote. Corrigido revalidando no checkout também —
  // mesma função/regra usada na compra original.
  it("1c. aditivo aprovado, produto pausado DEPOIS da aprovação: checkout do aditivo é bloqueado; execução original nunca é tocada; reativando o produto, o mesmo aditivo aprovado finaliza normalmente", async () => {
    const { product } = await mkPublishedProduct(`t6-pause-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    const originalPpId = checkout.json.project_products[0].id;
    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201);
    const originalPpBefore = await prisma.projectProduct.findUniqueOrThrow({ where: { id: originalPpId } });
    const originalTaskCount = await prisma.projectTask.count({ where: { project_id: projectId } });

    const addonQuote = await createQuoteViaApi(CO_A.token, product.id, 3);
    const reqRes = await api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: projectId, quote_id: addonQuote.id } });
    assert.equal(reqRes.status, 201, JSON.stringify(reqRes.json));
    const changeOrderId = reqRes.json.id;
    const approve = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: MASTER, body: { approval_client_action_id: crypto.randomUUID() } });
    assert.equal(approve.status, 200, JSON.stringify(approve.json));
    assert.equal(approve.json.status, "aprovado");

    // Produto pausado DEPOIS da aprovação — exatamente o cenário do gap.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { status: "temporariamente_inativo" } });

    const blockedCheckout = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(blockedCheckout.status, 409, JSON.stringify(blockedCheckout.json));

    // A execução já contratada (linha original, já paga) nunca é tocada.
    const originalPpAfter = await prisma.projectProduct.findUniqueOrThrow({ where: { id: originalPpId } });
    assert.equal(originalPpAfter.status, originalPpBefore.status);
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId } }), originalTaskCount);
    // O aditivo em si não materializou nada — continua "aprovado", nunca "materializado".
    const coAfterBlock = await prisma.catalog2ChangeOrder.findUniqueOrThrow({ where: { id: changeOrderId } });
    assert.equal(coAfterBlock.status, "aprovado");
    assert.equal(coAfterBlock.materialized_project_product_id, null);

    // Reativado, o MESMO aditivo já aprovado finaliza sem precisar de nova aprovação.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { status: "disponivel" } });
    const okCheckout = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(okCheckout.status, 201, JSON.stringify(okCheckout.json));
  });

  // "Produto ativo e comercialmente válido permite o fluxo" já é coberto de
  // ponta a ponta pelo teste "8" acima (aditivo completo, sem pausa) — sem
  // duplicar aqui.

  it("1d. inativar (arquivar) produto com proposta (pré-cotação) VIGENTE é bloqueado, mesmo sem nenhum ProjectProduct vinculado", async () => {
    const { product } = await mkPublishedProduct(`t6-quote-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    assert.equal((await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: quote.id } })).status, "valida");

    const archiveBlocked = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveBlocked.status, 409, JSON.stringify(archiveBlocked.json));
    assert.equal(archiveBlocked.json.code, "active_quotes");
    assert.match(archiveBlocked.json.error, /30 dias/);

    // Cancelando a proposta, o vínculo deixa de ser vigente — arquivar libera.
    const cancel = await api(`/api/catalog2/quotes/${quote.id}/cancel`, { method: "POST", token: CO_A.token });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.json));
    const archiveOk = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveOk.status, 200, JSON.stringify(archiveOk.json));
  });

  it("1e. proposta EXPIRADA por tempo (mesmo se o campo 'status' no banco ainda diz 'valida') não bloqueia a inativação", async () => {
    const { product } = await mkPublishedProduct(`t6-expq-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    // Simula uma cotação vencida por tempo que ninguém revalidou ainda —
    // o campo `status` no banco continua "valida" (lazy), só `valid_until`
    // já passou. A checagem de inativação precisa cortar por TEMPO, não só
    // pelo literal salvo.
    await prisma.catalog2Quote.update({ where: { id: quote.id }, data: { valid_until: new Date(Date.now() - 3600_000) } });

    const archiveOk = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveOk.status, 200, JSON.stringify(archiveOk.json));
  });

  it("1f. proposta CANCELADA não bloqueia a inativação", async () => {
    const { product } = await mkPublishedProduct(`t6-cancq-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const cancel = await api(`/api/catalog2/quotes/${quote.id}/cancel`, { method: "POST", token: CO_A.token });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.json.status, "cancelada");

    const archiveOk = await api(`/api/admin/catalog2/products/${product.id}/archive`, { method: "POST", token: MASTER });
    assert.equal(archiveOk.status, 200, JSON.stringify(archiveOk.json));
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

  // Item 3.2 (reunião 2026-09-14, "Conectar questionários à execução"):
  // fluxo completo cotação → checkout → pagamento → ProjectTask materializada
  // com briefing_snapshot fotografado do Catalog2Questionnaire da versão
  // CONTRATADA, respondido pelo fluxo de briefing JÁ EXISTENTE
  // (GET/PUT /api/project-tasks/:id/briefing) — nenhuma rota/tela nova.
  describe("Conectar questionários à execução (Item 3.2)", () => {
    it("gerar execução real (cotação → checkout → pagamento) fotografa o questionário na ProjectTask: perguntas, ordem e obrigatoriedade corretas", async () => {
      const { product } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quote = await createQuoteViaApi(CO_A.token, product.id);
      const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
      assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
      const projectId = checkout.json.project.id;
      projects.push(projectId);
      const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      assert.equal(pay.status, 201, JSON.stringify(pay.json));

      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });
      assert.ok(pt.briefing_snapshot, "briefing_snapshot foi preenchido na geração");

      const briefing = await api(`/api/project-tasks/${pt.id}/briefing`, { token: CO_A.token });
      assert.equal(briefing.status, 200, JSON.stringify(briefing.json));
      assert.equal(briefing.json.briefing_questions.length, 2);
      assert.equal(briefing.json.briefing_questions[0].question_key, "objetivo");
      assert.equal(briefing.json.briefing_questions[0].question_text, "Qual o objetivo da campanha?");
      assert.equal(briefing.json.briefing_questions[0].required, true);
      assert.equal(briefing.json.briefing_questions[1].question_key, "referencias");
      assert.equal(briefing.json.briefing_questions[1].required, false);
      assert.deepEqual(briefing.json.answers, []);
    });

    it("salvar respostas e reabrir: as respostas persistem exatamente como foram salvas", async () => {
      const { product } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quote = await createQuoteViaApi(CO_A.token, product.id);
      const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
      const projectId = checkout.json.project.id;
      projects.push(projectId);
      await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });

      const save = await api(`/api/project-tasks/${pt.id}/briefing`, {
        method: "PUT", token: CO_A.token,
        body: { answers: [
          { question_key: "objetivo", question_text: "Qual o objetivo da campanha?", answer: "Aumentar vendas em 20%" },
          { question_key: "referencias", question_text: "Tem referências visuais?", answer: "Sim, anexo em breve" },
        ] },
      });
      assert.equal(save.status, 200, JSON.stringify(save.json));

      const reopened = await api(`/api/project-tasks/${pt.id}/briefing`, { token: CO_A.token });
      const byKey = Object.fromEntries(reopened.json.answers.map((a: any) => [a.question_key, a.answer]));
      assert.equal(byKey.objetivo, "Aumentar vendas em 20%");
      assert.equal(byKey.referencias, "Sim, anexo em breve");
    });

    it("alterar o questionário no cadastro DEPOIS de gerada a execução não afeta a execução anterior (fotografia real)", async () => {
      const { product, questionnaireId } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quote = await createQuoteViaApi(CO_A.token, product.id);
      const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
      const projectId = checkout.json.project.id;
      projects.push(projectId);
      await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });
      await api(`/api/project-tasks/${pt.id}/briefing`, {
        method: "PUT", token: CO_A.token,
        body: { answers: [{ question_key: "objetivo", question_text: "Qual o objetivo da campanha?", answer: "Resposta original" }] },
      });

      // Edita o questionário pelo cadastro: abre nova versão do produto (clona
      // a estrutura, herdando a referência ao MESMO questionário), e edita
      // pelo formulário da tarefa do rascunho — cria cópia (Item 3.1),
      // preservando o original que a execução já fotografou.
      const master = await mkAdmin(true);
      const masterToken = master.token;
      const nv = await api(`/api/admin/catalog2/products/${product.id}/versions`, { method: "POST", token: masterToken });
      assert.equal(nv.status, 201, JSON.stringify(nv.json));
      const detail = await api(`/api/admin/catalog2/products/${product.id}`, { token: masterToken });
      const draftTask = detail.json.versions.find((v: any) => v.state === "rascunho").tasks[0];
      const edit = await api(`/api/admin/catalog2/tasks/${draftTask.id}/questionnaire/content`, {
        method: "PUT", token: masterToken,
        body: { name: "[TESTE] Editado depois da venda", description: null, questions: [{ key: "objetivo", label: "Pergunta totalmente diferente", is_required: true }] },
      });
      assert.equal(edit.status, 200, JSON.stringify(edit.json));

      // A execução já gerada nunca muda: mesmo snapshot, mesma resposta salva.
      const ptAfter = await prisma.projectTask.findUniqueOrThrow({ where: { id: pt.id } });
      assert.equal(ptAfter.briefing_snapshot, pt.briefing_snapshot, "briefing_snapshot da execução é bit-a-bit o mesmo de antes da edição");
      const briefingAfter = await api(`/api/project-tasks/${pt.id}/briefing`, { token: CO_A.token });
      assert.equal(briefingAfter.json.briefing_questions[0].question_text, "Qual o objetivo da campanha?", "pergunta da execução continua a original, não a editada depois");
      const answerAfter = briefingAfter.json.answers.find((a: any) => a.question_key === "objetivo");
      assert.equal(answerAfter.answer, "Resposta original", "resposta já salva continua intacta");

      // E o questionário original (o que a execução aponta) também não mudou de conteúdo.
      const originalStill = await prisma.catalog2Questionnaire.findUniqueOrThrow({ where: { id: questionnaireId }, include: { questions: true } });
      assert.equal(originalStill.questions.find((q) => q.key === "objetivo")!.label, "Qual o objetivo da campanha?");
    });

    it("isolamento entre contas/projetos: conta B não acessa nem responde o briefing da tarefa de A", async () => {
      const { product } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quote = await createQuoteViaApi(CO_A.token, product.id);
      const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
      const projectId = checkout.json.project.id;
      projects.push(projectId);
      await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });

      const getAsB = await api(`/api/project-tasks/${pt.id}/briefing`, { token: CO_B.token });
      assert.equal(getAsB.status, 404);
      const putAsB = await api(`/api/project-tasks/${pt.id}/briefing`, {
        method: "PUT", token: CO_B.token,
        body: { answers: [{ question_key: "objetivo", question_text: "x", answer: "invasão" }] },
      });
      assert.equal(putAsB.status, 404);

      // outro projeto/conta não vê nem interfere na resposta de A.
      const { product: product2 } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quoteB = await createQuoteViaApi(CO_B.token, product2.id);
      const checkoutB = await api("/api/catalog2/checkout", { method: "POST", token: CO_B.token, body: { quote_ids: [quoteB.id], checkout_client_action_id: crypto.randomUUID() } });
      projects.push(checkoutB.json.project.id);
      await api("/api/payments/fake-checkout", { method: "POST", token: CO_B.token, body: { project_id: checkoutB.json.project.id } });
      const ptB = await prisma.projectTask.findFirstOrThrow({ where: { project_id: checkoutB.json.project.id } });
      assert.notEqual(ptB.id, pt.id);
      const briefingB = await api(`/api/project-tasks/${ptB.id}/briefing`, { token: CO_B.token });
      assert.deepEqual(briefingB.json.answers, [], "projeto novo de B começa sem respostas de A");
    });

    it("questionário com UMA ÚNICA referência, mas pertencente a uma versão PUBLICADA: editar/excluir pelas rotas genéricas continua bloqueado", async () => {
      const { questionnaireId } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const referrers = await prisma.catalog2Task.count({ where: { questionnaire_id: questionnaireId } });
      assert.equal(referrers, 1, "pré-condição do teste: só 1 tarefa referencia, e ela está numa versão publicada");

      const master = await mkAdmin(true);
      const masterToken = master.token;
      const editDirect = await api(`/api/admin/catalog2/questionnaires/${questionnaireId}`, { method: "PUT", token: masterToken, body: { name: "Tentativa direta" } });
      assert.equal(editDirect.status, 409);
      assert.equal(editDirect.json.code, "version_published_immutable");

      const question = await prisma.catalog2QuestionnaireQuestion.findFirstOrThrow({ where: { questionnaire_id: questionnaireId } });
      const deleteDirect = await api(`/api/admin/catalog2/questions/${question.id}`, { method: "DELETE", token: masterToken });
      assert.equal(deleteDirect.status, 409);
      assert.equal(deleteDirect.json.code, "version_published_immutable");

      const addDirect = await api(`/api/admin/catalog2/questionnaires/${questionnaireId}/questions`, { method: "POST", token: masterToken, body: { key: "nova", label: "Nova pergunta" } });
      assert.equal(addDirect.status, 409);
    });

    it("reexecução do gerador (retry do mesmo pagamento) não duplica a ProjectTask nem sobrescreve a resposta já salva", async () => {
      const { product } = await mkPublishedProductWithQuestionnaire(`t6-q-${crypto.randomBytes(4).toString("hex")}`);
      const quote = await createQuoteViaApi(CO_A.token, product.id);
      const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
      const projectId = checkout.json.project.id;
      projects.push(projectId);
      const pay1 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      assert.equal(pay1.status, 201);
      const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });
      await api(`/api/project-tasks/${pt.id}/briefing`, {
        method: "PUT", token: CO_A.token,
        body: { answers: [{ question_key: "objetivo", question_text: "Qual o objetivo da campanha?", answer: "Não pode sumir" }] },
      });

      const pay2 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
      assert.equal(pay2.status, 201, "retry do mesmo pagamento já confirmado — idempotente");
      assert.equal(pay2.json.alreadyProcessed, true);

      const taskCount = await prisma.projectTask.count({ where: { project_id: projectId } });
      assert.equal(taskCount, 1, "não duplicou a tarefa");
      const briefingAfterRetry = await api(`/api/project-tasks/${pt.id}/briefing`, { token: CO_A.token });
      const answer = briefingAfterRetry.json.answers.find((a: any) => a.question_key === "objetivo");
      assert.equal(answer.answer, "Não pode sumir", "resposta já salva não foi sobrescrita/apagada pela reexecução");
    });
  });
});
