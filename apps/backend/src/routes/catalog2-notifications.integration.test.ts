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
import {
  processPendingCatalog2NotificationJobs,
  sweepCatalog2ReadinessTransitions,
  createCatalog2NotificationJob,
} from "../lib/catalog2-notifications";

// Item 8 (reunião 2026-09-14, "Notificações dos produtos") + Item 8.1
// ("Fechar as notificações dos produtos") — cobre: (1) admin/empresa/
// agência/líder/nômade habilitados recebem o aviso apropriado, conta
// desabilitada não recebe; (2) produto ativo incompleto que se torna
// pronto depois gera o aviso correto, sem repetir; (3) reprocessamento não
// duplica, nova ativação legítima (ativação->pausa->reativação) é
// reconhecida; (4) falha parcial de entrega retoma só os pendentes; (5)
// operação revertida não deixa notificação de sucesso; (6) inativação,
// mudança de preço e renovação continuam corretas com a fila nova; (7)
// links/conteúdo respeitam a permissão de cada perfil.

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
  const c = await prisma.company.create({ data: { name: `[TESTE] C14 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c14co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co14 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkAgencyUser(tag: string) {
  const id = `c14ag-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Ag14 ${tag}`, role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkLeaderUser(tag: string) {
  const id = `c14ld-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Lider14 ${tag}`, role: "lider", account_type: "lider", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkNomadUser(tag: string) {
  const id = `c14no-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Nomad14 ${tag}`, role: "nomad", account_type: "nomades", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkDisabledUser(tag: string) {
  const id = `c14ds-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Disabled14 ${tag}`, role: "company_user", account_type: "empresas", is_active: false, status: "inativo" },
  });
  users.push(u.id);
  return { user: u };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C14 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c14ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: master ? "Admin Master" : "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function setPricingSettings() {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
    update: { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
  });
}
async function mkDraftFixture(slug: string, specialtyKey = "designer") {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: specialtyKey } });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
      tasks: { create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1 }] },
    },
  });
  return { product, versionId: v.id, specialtyId: spec.id };
}
async function mkReadyPublishedProduct(slug: string, specialtyKey = "designer") {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: specialtyKey } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const { product, versionId } = await mkDraftFixture(slug, specialtyKey);
  await publishVersion(versionId, "system", { changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId, specialtyId: spec.id };
}
async function createQuoteViaApi(token: string, productId: string, quantity = 1) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity, answers: {} } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string; commercial_price: number; currency: string };
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
  const jobs = await prisma.catalog2NotificationJob.findMany({ where: { entity_id: id }, select: { id: true } });
  await prisma.catalog2NotificationJob.deleteMany({ where: { id: { in: jobs.map((j) => j.id) } } }).catch(() => {});
  await prisma.systemAlert.deleteMany({ where: { entity_id: id } }).catch(() => {});
  await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
  const quotes = await prisma.catalog2Quote.findMany({ where: { product_id: id }, select: { id: true } });
  for (const q of quotes) {
    const qjobs = await prisma.catalog2NotificationJob.findMany({ where: { entity_id: q.id }, select: { id: true } });
    await prisma.catalog2NotificationJob.deleteMany({ where: { id: { in: qjobs.map((j) => j.id) } } }).catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { entity_id: q.id } }).catch(() => {});
  }
  await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2CommercialChangeEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}
async function activationAlertsFor(productId: string) {
  return prisma.systemAlert.findMany({ where: { type: "catalog2.product_activated", entity_id: productId } });
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let AGENCY: Awaited<ReturnType<typeof mkAgencyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeaderUser>>;
let NOMAD: Awaited<ReturnType<typeof mkNomadUser>>;
let DISABLED: Awaited<ReturnType<typeof mkDisabledUser>>;
let MASTER_USER: Awaited<ReturnType<typeof mkAdmin>>;
let MASTER = "";

describe("Notificações dos produtos (Item 8/8.1, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    AGENCY = await mkAgencyUser("A");
    LEADER = await mkLeaderUser("A");
    NOMAD = await mkNomadUser("A");
    DISABLED = await mkDisabledUser("A");
    MASTER_USER = await mkAdmin(true);
    MASTER = MASTER_USER.token;
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

  it("1. ativação alcança TODAS as contas habilitadas (admin, empresa, agência, líder, nômade), cada uma com o aviso certo; conta desabilitada não recebe", async () => {
    const { product } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`);
    await processPendingCatalog2NotificationJobs();

    const alerts = await activationAlertsFor(product.id);
    const byUser = new Map(alerts.map((a) => [a.user_id, a]));

    assert.ok(byUser.has(CO_A.user.id), "empresa deve ser notificada");
    assert.match(byUser.get(CO_A.user.id)!.message, /contratação/i);
    assert.equal(byUser.get(CO_A.user.id)!.action_url, "/catalog2");

    assert.ok(byUser.has(AGENCY.user.id), "agência deve ser notificada");
    assert.equal(byUser.get(AGENCY.user.id)!.action_url, "/catalog2");

    assert.ok(byUser.has(LEADER.user.id), "líder deve ser notificado");
    assert.equal(byUser.get(LEADER.user.id)!.action_url, "/catalog2", "líder acessa o catálogo, mesmo sem poder contratar");
    assert.doesNotMatch(byUser.get(LEADER.user.id)!.message, /contratação/i, "líder não contrata — mensagem não pode sugerir isso");

    assert.ok(byUser.has(NOMAD.user.id), "nômade (Item 8.1) TAMBÉM deve ser notificado agora");
    assert.equal(byUser.get(NOMAD.user.id)!.action_url, "/dashboard", "nômade não acessa o catálogo — nunca um link de contratação");
    assert.doesNotMatch(byUser.get(NOMAD.user.id)!.message, /contratação/i, "aviso informativo, nunca linguagem de contratação");

    assert.ok(byUser.has(MASTER_USER.user.id), "admin (Item 8.1) TAMBÉM deve ser notificado agora");
    assert.equal(byUser.get(MASTER_USER.user.id)!.action_url, `/admin/produtos?produto=${product.id}`, "admin recebe link administrativo, nunca o catálogo do cliente");

    assert.ok(!byUser.has(DISABLED.user.id), "conta desabilitada nunca recebe");
  });

  it("2. produto ativo incompleto que se torna pronto DEPOIS (sem nova mudança de status) gera o aviso correto, uma única vez", async () => {
    const { product, versionId, specialtyId } = await mkDraftFixture(`c14-${crypto.randomBytes(4).toString("hex")}`, "redator");
    await prisma.catalog2Specialty.update({ where: { id: specialtyId }, data: { max_hourly_rate: null } });
    await setPricingSettings();
    await publishVersion(versionId, "system", { changeSummary: "publicação de teste (incompleto)" });

    const reloaded = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(reloaded.status, "disponivel");
    assert.equal(reloaded.last_known_commercially_ready, false);

    // varredura antes de ficar pronto: nada acontece.
    await sweepCatalog2ReadinessTransitions();
    assert.equal((await activationAlertsFor(product.id)).length, 0);

    // agora fica pronto — SEM nenhuma mudança de status.
    await prisma.catalog2Specialty.update({ where: { id: specialtyId }, data: { max_hourly_rate: 120 } });
    const sweep1 = await sweepCatalog2ReadinessTransitions();
    assert.ok(sweep1.flagged.includes(product.id), "a varredura deve reconhecer a transição não-pronto -> pronto");

    await processPendingCatalog2NotificationJobs();
    const alertsAfterFirstSweep = await activationAlertsFor(product.id);
    assert.ok(alertsAfterFirstSweep.length > 0, "deve anunciar a disponibilidade assim que fica pronto, mesmo sem mudança de status");

    // varreduras seguintes NÃO devem repetir o mesmo evento.
    await sweepCatalog2ReadinessTransitions();
    await sweepCatalog2ReadinessTransitions();
    await processPendingCatalog2NotificationJobs();
    const alertsAfterMoreSweeps = await activationAlertsFor(product.id);
    assert.equal(alertsAfterMoreSweeps.length, alertsAfterFirstSweep.length, "não deve anunciar o mesmo evento repetidamente");
  });

  it("3. sequência ativação -> pausa -> reativação: a reativação legítima é reconhecida (nenhum marcador permanente bloqueia); reprocessar não duplica", async () => {
    const { product } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`);
    await processPendingCatalog2NotificationJobs();
    const countAfterFirstActivation = (await activationAlertsFor(product.id)).length;
    assert.ok(countAfterFirstActivation > 0);

    // reprocessar sem nenhuma mudança nova nunca duplica.
    await processPendingCatalog2NotificationJobs();
    await processPendingCatalog2NotificationJobs();
    assert.equal((await activationAlertsFor(product.id)).length, countAfterFirstActivation, "reexecutar o worker não duplica");

    // pausa.
    const pause = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "temporariamente_inativo" } });
    assert.equal(pause.status, 200, JSON.stringify(pause.json));
    await processPendingCatalog2NotificationJobs();
    assert.equal((await activationAlertsFor(product.id)).length, countAfterFirstActivation, "pausar não gera um novo aviso de ativação");

    // reativação — evento LEGÍTIMO e NOVO; o marcador antigo (`last_known_commercially_ready`, já true de antes) NUNCA deve impedir isto.
    const reactivate = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "disponivel" } });
    assert.equal(reactivate.status, 200, JSON.stringify(reactivate.json));
    await processPendingCatalog2NotificationJobs();
    const countAfterReactivation = (await activationAlertsFor(product.id)).length;
    assert.ok(countAfterReactivation > countAfterFirstActivation, "a reativação deve gerar um NOVO conjunto de avisos — nenhum marcador permanente pode bloquear isso");
  });

  it("4. falha parcial de entrega: reprocessar retoma SÓ os destinatários ainda pendentes, nunca reenvia quem já recebeu", async () => {
    // draft (nunca publicado) — nenhuma transição de status, nenhum Job de
    // ativação automático criado; controla o cenário manualmente.
    const { product } = await mkDraftFixture(`c14-${crypto.randomBytes(4).toString("hex")}`);
    // simula uma "falha parcial": materializa o Job manualmente com 2
    // destinatários, um já marcado como enviado (como se um lote anterior
    // tivesse sido concluído antes de o processo cair no meio do 2º lote).
    const jobId = await createCatalog2NotificationJob(prisma, {
      eventType: "activation", entityType: "catalog2_product", entityId: product.id,
      recipients: [
        { userId: CO_A.user.id, type: "catalog2.product_activated", title: "t", message: "m1", severity: "info", category: "notificacao", actionUrl: "/catalog2" },
        { userId: AGENCY.user.id, type: "catalog2.product_activated", title: "t", message: "m2", severity: "info", category: "notificacao", actionUrl: "/catalog2" },
      ],
    });
    const [first] = await prisma.catalog2NotificationJobRecipient.findMany({ where: { job_id: jobId, user_id: CO_A.user.id } });
    await prisma.catalog2NotificationJobRecipient.update({ where: { id: first.id }, data: { sent_at: new Date() } });
    // um SystemAlert "já enviado" correspondente, simulando o lote anterior.
    await prisma.systemAlert.create({ data: { type: "catalog2.product_activated", title: "t", message: "m1", severity: "info", category: "notificacao", entity_type: "catalog2_product", entity_id: product.id, user_id: CO_A.user.id } });

    await processPendingCatalog2NotificationJobs();

    const co_a_alerts = await prisma.systemAlert.count({ where: { type: "catalog2.product_activated", entity_id: product.id, user_id: CO_A.user.id } });
    assert.equal(co_a_alerts, 1, "destinatário já enviado (sent_at preenchido) nunca é reenviado");
    const agency_alerts = await prisma.systemAlert.count({ where: { type: "catalog2.product_activated", entity_id: product.id, user_id: AGENCY.user.id } });
    assert.equal(agency_alerts, 1, "destinatário pendente deve ter sido enviado agora");

    const job = await prisma.catalog2NotificationJob.findUniqueOrThrow({ where: { id: jobId } });
    assert.equal(job.status, "done");
  });

  it("5. operação revertida não deixa Job/notificação de sucesso (mesma transação da alteração real)", async () => {
    const { product } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`);
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await createCatalog2NotificationJob(tx, {
          eventType: "commercial_change", entityType: "catalog2_product", entityId: product.id,
          recipients: [{ userId: CO_A.user.id, type: "catalog2.commercial_change", title: "t", message: "m", severity: "info", category: "notificacao" }],
        });
        // força a transação inteira a falhar DEPOIS de criar o Job.
        await tx.catalog2Product.update({ where: { id: "produto-inexistente-xyz" }, data: { status: "disponivel" } });
      }),
    );
    const jobs = await prisma.catalog2NotificationJob.count({ where: { entity_id: product.id, event_type: "commercial_change" } });
    assert.equal(jobs, 0, "o Job criado numa transação revertida não pode sobreviver");
  });

  it("6a. inativação (agendar/cancelar/efetivar) continua correta com a fila nova — admin interno + cliente real + donos de cotações, cada um com o link certo", async () => {
    const { product } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`);
    const quote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    await prisma.project.update({ where: { id: projectId }, data: { admin_responsible_user_id: MASTER_USER.user.id } });

    const schedule = await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });
    assert.equal(schedule.status, 201, JSON.stringify(schedule.json));
    // a intenção já deve existir mesmo ANTES do worker rodar.
    const pendingJob = await prisma.catalog2NotificationJob.findFirst({ where: { event_type: "inactivation_scheduled", entity_id: product.id, status: "pending" } });
    assert.ok(pendingJob, "a intenção de notificar deve ser persistida junto do agendamento");

    await processPendingCatalog2NotificationJobs();
    const scheduledAlerts = await prisma.systemAlert.findMany({ where: { type: "catalog2.product_inactivation_scheduled", entity_id: product.id } });
    const byUser = new Map(scheduledAlerts.map((a) => [a.user_id, a]));
    assert.equal(byUser.get(MASTER_USER.user.id)?.action_url, `/admin/produtos?produto=${product.id}`);
    assert.equal(byUser.get(CO_A.user.id)?.action_url, "/dashboard");

    const cancel = await api(`/api/admin/catalog2/products/${product.id}/inactivation/cancel`, { method: "POST", token: MASTER });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.json));
    await processPendingCatalog2NotificationJobs();
    const cancelAlerts = await prisma.systemAlert.findMany({ where: { type: "catalog2.product_inactivation_cancelled", entity_id: product.id } });
    assert.ok(cancelAlerts.some((a) => a.user_id === CO_A.user.id));
  });

  it("6b. mudança de preço afeta só propostas pertinentes; renovação informa novo valor + nova aceitação", async () => {
    const { product: usesDesigner } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`, "designer");
    const { product: usesRedator, specialtyId: redatorId } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`, "redator");
    const quoteDesigner = await createQuoteViaApi(CO_A.token, usesDesigner.id);
    const quoteRedator = await createQuoteViaApi(CO_A.token, usesRedator.id);
    await prisma.catalog2Quote.update({ where: { id: quoteDesigner.id }, data: { price_protection_started_at: new Date() } });
    await prisma.catalog2Quote.update({ where: { id: quoteRedator.id }, data: { price_protection_started_at: new Date() } });

    const rSpec = await api(`/api/admin/catalog2/specialties/${redatorId}`, { method: "PUT", token: MASTER, body: { max_hourly_rate: 150 } });
    assert.equal(rSpec.status, 200, JSON.stringify(rSpec.json));
    await processPendingCatalog2NotificationJobs();

    const commercialAlerts = await prisma.systemAlert.findMany({ where: { type: "catalog2.commercial_change" } });
    const byQuote = new Set(commercialAlerts.map((a) => a.entity_id));
    assert.ok(byQuote.has(quoteRedator.id), "só o produto que usa a especialidade alterada deve ser avisado");
    assert.ok(!byQuote.has(quoteDesigner.id), "produto de outra especialidade não deve ser avisado");

    // renovação.
    await prisma.catalog2Quote.update({
      where: { id: quoteRedator.id },
      data: { valid_until: new Date(Date.now() - 1000), price_protection_started_at: new Date(Date.now() - 40 * 24 * 3600 * 1000) },
    });
    await prisma.catalog2Specialty.update({ where: { id: redatorId }, data: { max_hourly_rate: 300 } });
    const renew = await api(`/api/catalog2/quotes/${quoteRedator.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200, JSON.stringify(renew.json));
    assert.equal(renew.json.mode, "recomputed");
    await processPendingCatalog2NotificationJobs();
    const renewedAlerts = await prisma.systemAlert.findMany({ where: { type: "catalog2.quote_renewed", entity_id: renew.json.quote.id } });
    assert.equal(renewedAlerts.length, 1);
    assert.match(renewedAlerts[0].message, /nova aceitação/i);
  });

  it("7. conteúdo do aviso de ativação nunca expõe nome interno/administrativo", async () => {
    const { product } = await mkReadyPublishedProduct(`c14-${crypto.randomBytes(4).toString("hex")}`);
    await processPendingCatalog2NotificationJobs();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { type: "catalog2.product_activated", entity_id: product.id, user_id: CO_A.user.id } });
    assert.doesNotMatch(alert.message, /\[TESTE LOCAL\]/);
  });
});
