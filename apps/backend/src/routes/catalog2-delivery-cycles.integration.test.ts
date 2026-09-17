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
import { runCatalog2DeliveryCycleSchedulerOnce } from "../lib/catalog2-delivery-cycle-scheduler";
import { addMonths } from "../lib/catalog2-checkout";

// Item 6.1 (reunião 2026-09-14, "Completar a execução dos períodos") —
// produtos de entrega mensal recorrente registram e liberam um ciclo por
// mês do período pago, sem cobrança nova, reaproveitando o motor de
// geração de tarefas existente. "Relógio controlado" = manipulação direta
// de Catalog2ProjectDeliveryCycle.scheduled_at já persistido.

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co11 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c11co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co11 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C11 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c11ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

async function setPricingSettings(marginPercent = 30) {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: marginPercent, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
    update: {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: marginPercent, human_review_percent: 10,
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
  await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: id } } }).catch(() => {});
  await prisma.catalog2ChangeOrder.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
  await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id } }).catch(() => {});
}
async function purgeProduct(id: string) {
  await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
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

async function setDeliveryRecurrence(token: string, productId: string, value: string | null) {
  const r = await api(`/api/admin/catalog2/products/${productId}/delivery-recurrence`, { method: "PUT", token, body: { delivery_recurrence: value } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}
async function configurePeriod(token: string, productId: string, period: string, discount: number) {
  const r = await api(`/api/admin/catalog2/products/${productId}/periods/${period}`, { method: "PUT", token, body: { discount_percent: discount, is_active: true } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}
async function createQuoteViaApi(token: string, productId: string, period?: string) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} }, ...(period ? { period } : {}) } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
async function checkoutAndPay(token: string, quoteId: string) {
  const checkout = await api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: [quoteId], checkout_client_action_id: crypto.randomUUID() } });
  assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
  const projectId = checkout.json.project.id;
  const pay = await api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
  assert.equal(pay.status, 201, JSON.stringify(pay.json));
  return { projectId, projectProductId: checkout.json.project_products[0].id, pay };
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

describe("Ciclos de entrega mensal (Item 6.1, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    MASTER = (await mkAdmin(true)).token;
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

  it("1. avulso continua gerando sua execução normal — nenhum ciclo registrado", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id); // sem período
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    const taskCount = await prisma.projectTask.count({ where: { project_id: projectId } });
    assert.ok(taskCount > 0);
    const cycles = await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: projectProductId } });
    assert.equal(cycles, 0, "avulso nunca registra ciclo de entrega");
  });

  it("2. produto mensal contratado por 3 meses (trimestral) executa 3 ciclos, um por mês", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    // ciclo 0 (o pago junto do checkout) já gerou tarefas — nenhuma linha registrada pra ele.
    const cycles = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId }, orderBy: { occurrence_index: "asc" } });
    assert.equal(cycles.length, 2, "ciclos 1 e 2 registrados (3 meses = ciclos 0,1,2 — só 1 e 2 viram linha)");
    assert.deepEqual(cycles.map((c) => c.occurrence_index), [1, 2]);
    assert.ok(cycles.every((c) => c.status === "pending"));

    const taskCountAfterCheckout = await prisma.projectTask.count({ where: { project_id: projectId } });
    assert.ok(taskCountAfterCheckout > 0, "1º ciclo já gerou tarefas no pagamento");

    // força os 2 ciclos pra vencidos e processa.
    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    const run = await runCatalog2DeliveryCycleSchedulerOnce();
    assert.equal(run.processed, 2);

    const cyclesAfter = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId } });
    assert.ok(cyclesAfter.every((c) => c.status === "released"));
    const taskCountAfterCycles = await prisma.projectTask.count({ where: { project_id: projectId } });
    assert.ok(taskCountAfterCycles > taskCountAfterCheckout, "ciclos 1 e 2 geraram tarefas novas");

    const occurrenceIndexes = await prisma.projectTask.findMany({ where: { project_id: projectId }, select: { occurrence_index: true }, distinct: ["occurrence_index"] });
    assert.deepEqual(occurrenceIndexes.map((t) => t.occurrence_index).sort(), [0, 1, 2]);
  });

  it("3. passagem de mês, incluindo datas no fim do mês, calcula a data prevista corretamente (meses de calendário, nunca 30 dias fixos)", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 5);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    const payment = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId } });
    const cycles = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId }, orderBy: { occurrence_index: "asc" } });
    assert.equal(cycles.length, 2);
    for (const c of cycles) {
      const expected = addMonths(payment.paid_at!, c.occurrence_index);
      assert.equal(c.scheduled_at.getTime(), expected.getTime(), `ciclo ${c.occurrence_index} deve estar exatamente ${c.occurrence_index} mês(es) de calendário após o pagamento (não 30 dias fixos)`);
    }

    // Caso explícito de "fim do mês": pagamento em 31/01 -> +1 mês cai em
    // 28/02 (2026 não é bissexto), NUNCA em 03/03 (o que `setMonth` sozinho,
    // sem capar o dia, produziria ao estourar fevereiro).
    const jan31 = new Date(Date.UTC(2026, 0, 31, 10, 0, 0));
    const feb28 = addMonths(jan31, 1);
    assert.equal(feb28.toISOString(), "2026-02-28T10:00:00.000Z");
    const mar31 = addMonths(jan31, 2);
    assert.equal(mar31.toISOString(), "2026-03-31T10:00:00.000Z");
  });

  it("4. reprocessamento (scheduler rodando 2x seguidas, e ciclo já vencido reprocessado) não duplica tarefas", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    await runCatalog2DeliveryCycleSchedulerOnce();
    const taskCountAfterFirstRun = await prisma.projectTask.count({ where: { project_id: projectId } });

    // roda de novo (simula agendador reexecutando) — ciclos já "released", nada novo.
    const run2 = await runCatalog2DeliveryCycleSchedulerOnce();
    assert.equal(run2.processed, 0, "ciclos já liberados não são reprocessados");
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId } }), taskCountAfterFirstRun);

    // reexecuta o PAGAMENTO original (retry de fake-checkout) — idempotente, não duplica nem o 1º ciclo.
    const pay2 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay2.status, 201);
    assert.equal(pay2.json.alreadyProcessed, true);
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId } }), taskCountAfterFirstRun);
    assert.equal(await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: projectProductId } }), 2, "retry do pagamento não duplica o registro dos ciclos");
  });

  it("5. alterar o cadastro do produto DEPOIS da compra não muda os ciclos já contratados", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);
    const cyclesBefore = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId } });

    // desliga a recorrência mensal do produto e muda o desconto do período — DEPOIS da compra.
    await setDeliveryRecurrence(MASTER, product.id, null);
    await configurePeriod(MASTER, product.id, "trimestral", 90);

    const cyclesAfter = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId } });
    assert.deepEqual(cyclesAfter.map((c) => ({ occurrence_index: c.occurrence_index, scheduled_at: c.scheduled_at.getTime(), status: c.status })),
      cyclesBefore.map((c) => ({ occurrence_index: c.occurrence_index, scheduled_at: c.scheduled_at.getTime(), status: c.status })));

    // os ciclos JÁ REGISTRADOS continuam liberando normalmente, mesmo com o produto não sendo mais "mensal" hoje.
    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    const run = await runCatalog2DeliveryCycleSchedulerOnce();
    assert.equal(run.processed, 2);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
  });

  it("6. fim do período encerra a geração de novos ciclos — nenhum ciclo além do contratado", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    await runCatalog2DeliveryCycleSchedulerOnce();
    // roda várias vezes a mais — nunca aparece um ciclo 3, 4... (trimestral = só 0,1,2).
    await runCatalog2DeliveryCycleSchedulerOnce();
    await runCatalog2DeliveryCycleSchedulerOnce();
    const finalCycles = await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: projectProductId } });
    assert.equal(finalCycles, 2, "nunca cria ciclo além dos meses contratados");
    const maxOccurrence = await prisma.projectTask.aggregate({ where: { project_id: projectId }, _max: { occurrence_index: true } });
    assert.equal(maxOccurrence._max.occurrence_index, 2);
  });

  it("7. período sem frequência de entrega definida é bloqueado pela API, mesmo com desconto já configurado", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    // desconto configurado, mas delivery_recurrence NUNCA definido.
    await configurePeriod(MASTER, product.id, "trimestral", 10);

    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.json.available_periods.length, 0, "período não aparece disponível sem frequência de entrega definida");

    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "trimestral" } });
    assert.equal(q.status, 409);
    assert.match(q.json.error, /frequência de entrega recorrente/);

    // define a recorrência — agora sim disponível.
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    const q2 = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "trimestral" } });
    assert.equal(q2.status, 201);
  });

  it("8. valores cobrados continuam iguais à cotação aprovada, em todos os ciclos", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 15);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const approvedTotal = quote.commercial_price;
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: projectProductId } });
    assert.equal(pp.preco_final_cliente_snapshot, approvedTotal);

    // muda preço/desconto DEPOIS — processa os ciclos seguintes e confirma
    // que nada relacionado a cobrança nova aconteceu (nenhum Payment novo).
    await setPricingSettings(90);
    await configurePeriod(MASTER, product.id, "trimestral", 50);
    const paymentCountBefore = await prisma.payment.count({ where: { project_id: projectId } });

    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    await runCatalog2DeliveryCycleSchedulerOnce();

    assert.equal(await prisma.payment.count({ where: { project_id: projectId } }), paymentCountBefore, "processar ciclos nunca cria Payment novo");
    const ppAfter = await prisma.projectProduct.findUniqueOrThrow({ where: { id: projectProductId } });
    assert.equal(ppAfter.preco_final_cliente_snapshot, approvedTotal, "valor cobrado permanece o da cotação aprovada");
    await setPricingSettings();
    await configurePeriod(MASTER, product.id, "trimestral", 15);
  });

  it("9 (regra adicional). inativação do produto DEPOIS da compra não cancela ciclos já pagos", async () => {
    const { product } = await mkPublishedProduct(`t11-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const { projectId, projectProductId } = await checkoutAndPay(CO_A.token, quote.id);
    projects.push(projectId);

    // agenda e efetiva a inativação do produto (Item 5) — DEPOIS da compra.
    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { inactivation_effective_at: new Date(Date.now() - 1000), status: "arquivado" } });

    await prisma.catalog2ProjectDeliveryCycle.updateMany({ where: { project_product_id: projectProductId }, data: { scheduled_at: new Date(Date.now() - 1000) } });
    const run = await runCatalog2DeliveryCycleSchedulerOnce();
    assert.equal(run.processed, 2, "ciclos pagos continuam sendo liberados mesmo com o produto já inativado");
    const cycles = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: projectProductId } });
    assert.ok(cycles.every((c) => c.status === "released"));
  });
});
