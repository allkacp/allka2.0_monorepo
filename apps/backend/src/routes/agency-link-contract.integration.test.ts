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
import { amountForSubscriptionCycle, issueNextInvoice, payOpenInvoice } from "../lib/catalog2-subscriptions";

// Cenário do proj_956 (01/11, teste do Codex pela tela) reproduzido em banco DESCARTÁVEL — nunca o allka real:
// Agência Partner com consultor e cliente cadastrados contrata um produto avulso (variação + adicional, comissão 10%)
// e um mensal com 2% de desconto (quantidade 2 agrupada, comissão 6%); o cliente final paga pelo link (sandbox).
// Cobre: o que o link mostra, as fontes de cliente/consultor/Líder nas tarefas, o fluxo "aguardando lançamento",
// a categoria real da agência na lista de projetos e — item 8 — o que acontece HOJE na renovação mensal.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];
const cleanup: (() => Promise<unknown>)[] = [];
const uid = () => crypto.randomBytes(4).toString("hex");
const r2 = (x: number) => Math.round(x * 100) / 100;

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
async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `alc-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
  users.push(u.id);
  return u;
}
async function setPricingSettings() {
  const d = { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) };
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...d }, update: d });
}
async function mkProduct(name: string, o: { recurring?: boolean; options?: boolean }) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const slug = `alc-${uid()}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${name} ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: o.recurring ? "mensal" : null, four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5, implementation_blocks_operation: false, accepts_recurring: !!o.recurring,
      tasks: { create: [{ key: "rotina", name: "Tarefa rotina", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1, cycle_type: "recorrente", repeat_rule: "all_cycles", executor_continuity: "not_allowed",
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1, specialty_id: spec.id, estimated_minutes: 60 }] } }] },
      ...(o.options
        ? {
            variations: { create: [{ key: "paginas", name: "Páginas", is_required: true, selection_type: "single", options: { create: [
              { key: "ate5", label: "Até 5 páginas", is_default: true },
              { key: "ate10", label: "Até 10 páginas", effects: { create: [{ effect_type: "add_fixed_amount", effect_value: "100" }] } },
            ] } }] },
            addons: { create: [{ key: "concorrentes", name: "Análise de concorrentes", base_cost: 50 }] },
          }
        : {}),
    },
  });
  if (o.recurring) await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: {} });
  await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
  return prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
}

let ADMIN = "";
let AGENCY: { id: string; token: string; userId: string };
let CONSULTANT: { id: string; name: string };
let CLIENT: { id: string; name: string };

describe("Contratação por link da agência — cenário do proj_956 (banco descartável)", () => {
  // preenchido no 1º cenário e reaproveitado pelos seguintes (um único pedido, como o proj_956)
  const order: { projectId?: string; seoQuote?: any; monthlyQuote?: any; link?: string; paidTotal?: number } = {};

  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    const profile = await prisma.adminProfile.create({ data: { name: `ALC ${uid()}`, is_master: true, is_active: true } });
    adminProfiles.push(profile.id);
    ADMIN = tokenFor(await mkUser("admin", "admin", { admin_profile_id: profile.id }));
    const owner = await mkUser("agency_admin", "agencias");
    const agency = await prisma.agency.create({ data: { name: `[TESTE] Agência Partner ${uid()}`, owner_user_id: owner.id, status: "ativo" } });
    cleanup.push(() => prisma.agency.deleteMany({ where: { id: agency.id } }));
    const partner = await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active" } });
    cleanup.push(() => prisma.partnerProfile.deleteMany({ where: { id: partner.id } }));
    const ownerWithAgency = await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
    AGENCY = { id: agency.id, token: tokenFor(ownerWithAgency), userId: owner.id };
    const consultant = await mkUser("agency_consultant", "agencias", { agency_id: agency.id, name: "Consultor Teste" });
    CONSULTANT = { id: consultant.id, name: consultant.name };
    const client = await prisma.client.create({ data: { name: `[TESTE] Cliente final ${uid()}`, created_by_user_id: owner.id, links: { create: [{ agency_id: agency.id, status: "active" }] } } });
    cleanup.push(async () => { await prisma.clientLink.deleteMany({ where: { client_id: client.id } }); await prisma.client.deleteMany({ where: { id: client.id } }); });
    CLIENT = { id: client.id, name: client.name };
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) {
      const taskIds = (await prisma.projectTask.findMany({ where: { project_id: id }, select: { id: true } })).map((t) => t.id);
      await prisma.systemAlert.deleteMany({ where: { entity_id: { in: taskIds } } }).catch(() => {});
      await prisma.catalog2SubscriptionEvent.deleteMany({ where: { subscription: { project_id: id } } }).catch(() => {});
      await prisma.catalog2Subscription.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectDecisionLog.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: id } } }).catch(() => {});
      await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
      await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.project.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of catProducts.splice(0)) {
      await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
      const vids = (await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } })).map((x) => x.id);
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.walletLedger.deleteMany({ where: { wallet: { owner_id: AGENCY?.id } } }).catch(() => {});
    await prisma.wallet.deleteMany({ where: { owner_id: AGENCY?.id } }).catch(() => {});
    await prisma.user.updateMany({ where: { id: { in: users } }, data: { agency_id: null } }).catch(() => {});
    for (const fn of cleanup.splice(0).reverse()) await fn().catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. link público mostra quantidade, modalidade, recorrência e opções — nunca comissão, custo ou acessos", async () => {
    const seo = await mkProduct("SEO demonstração", { options: true });
    const monthly = await mkProduct("Manutenção demonstração", { recurring: true });
    const put = await api(`/api/admin/catalog2/products/${monthly.id}/periods/mensal`, { method: "PUT", token: ADMIN, body: { discount_percent: 2, is_active: true } });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const q1 = await api("/api/catalog2/quotes", { method: "POST", token: AGENCY.token, body: { product: seo.id, selection: { variation_option_keys: ["ate10"], addon_keys: ["concorrentes"], quantity: 1, answers: {} } } });
    assert.equal(q1.status, 201, JSON.stringify(q1.json));
    const q2 = await api("/api/catalog2/quotes", { method: "POST", token: AGENCY.token, body: { product: monthly.id, period: "mensal", selection: { variation_option_keys: [], addon_keys: [], quantity: 2, delivery_groups: [2], answers: {} } } });
    assert.equal(q2.status, 201, JSON.stringify(q2.json));
    order.seoQuote = q1.json; order.monthlyQuote = q2.json;
    const project = await api("/api/projects", { method: "POST", token: AGENCY.token, body: { title: `[TESTE] Contratação SEO ${uid()}`, status: "draft", consultant_user_id: CONSULTANT.id, client_record_id: CLIENT.id } });
    assert.equal(project.status, 201, JSON.stringify(project.json));
    projects.push(project.json.id);
    order.projectId = project.json.id;
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: AGENCY.token, body: {
      quote_ids: [q1.json.id, q2.json.id], checkout_client_action_id: crypto.randomUUID(), project_id: project.json.id, payer: "client",
      commission_mode: "per_product", item_commissions: [{ quote_id: q1.json.id, percent: 10 }, { quote_id: q2.json.id, percent: 6 }],
    } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    order.link = checkout.json.payment_link_path.split("/").pop();

    const view = await api(`/api/public/agency-payment/${order.link}`);
    assert.equal(view.status, 200, JSON.stringify(view.json));
    const seoTotal = r2(q1.json.commercial_price + r2(q1.json.commercial_price * 10 / 100));
    const monthlyTotal = r2(q2.json.commercial_price + r2(q2.json.commercial_price * 6 / 100));
    order.paidTotal = r2(seoTotal + monthlyTotal);
    assert.equal(view.json.total, order.paidTotal);
    const [seoItem, monthlyItem] = [...view.json.items].sort((a: any, b: any) => (a.modality === "avulso" ? -1 : 1) - (b.modality === "avulso" ? -1 : 1));
    assert.deepEqual(seoItem, { name: "SEO demonstração", total: seoTotal, modality: "avulso", period_months: null, quantity: 1, delivery_groups: [1], options: ["Páginas: Até 10 páginas", "Análise de concorrentes"] });
    assert.deepEqual(monthlyItem, { name: "Manutenção demonstração", total: monthlyTotal, modality: "mensal", period_months: 1, quantity: 2, delivery_groups: [2], options: [] });
    // privacidade: só estas chaves chegam ao cliente final (nada de comissão, custo, projeto, acessos)
    assert.deepEqual(Object.keys(view.json).sort(), ["code", "items", "paid", "sandbox", "total"]);
    for (const item of view.json.items) assert.deepEqual(Object.keys(item).sort(), ["delivery_groups", "modality", "name", "options", "period_months", "quantity", "total"]);
    assert.doesNotMatch(JSON.stringify(view.json), /comiss|commission|custo|cost|senha|password|access/i);

    const paid = await api(`/api/public/agency-payment/${order.link}/pay-sandbox`, { method: "POST", body: { card_last_digits: "4242" } });
    assert.equal(paid.status, 200, JSON.stringify(paid.json));
  });

  it("2. tarefas: cliente do projeto, consultor e Líder vêm de fontes próprias; comprar não lança (fluxo = aguardando lançamento)", async () => {
    assert.ok(order.projectId, "depende do cenário 1");
    const tasks = await prisma.projectTask.findMany({ where: { project_id: order.projectId }, orderBy: { created_at: "asc" } });
    assert.equal(tasks.length, 2, "uma tarefa por produto (a mensal de 2 unidades agrupadas é uma só)");
    assert.ok(tasks.every((t) => t.status === "PARA_LANCAMENTO" && !t.lider_responsavel_id && !t.nomade_responsavel_id));
    assert.deepEqual(tasks.map((t) => t.delivery_quantity).sort(), [1, 2]);

    const list = await api(`/api/project-tasks?project_id=${order.projectId}`, { token: AGENCY.token });
    assert.equal(list.status, 200, JSON.stringify(list.json));
    assert.equal(list.json.data.length, 2);
    for (const t of list.json.data) {
      assert.equal(t.project.client, null, "projeto novo não usa o cliente legado");
      assert.deepEqual(t.project.client_record, { id: CLIENT.id, name: CLIENT.name });
      assert.deepEqual(t.project.consultant_user, { id: CONSULTANT.id, name: CONSULTANT.name });
      assert.equal(t.lider_responsavel, null, "consultor nunca aparece como Líder");
      assert.ok(t.task_code, "código operacional da tarefa");
    }
    const detail = await api(`/api/project-tasks/${tasks[0].task_code}`, { token: AGENCY.token });
    assert.equal(detail.status, 200, JSON.stringify(detail.json));
    const d = detail.json.data ?? detail.json;
    assert.deepEqual(d.project.client_record, { id: CLIENT.id, name: CLIENT.name });
    assert.deepEqual(d.project.consultant_user, { id: CONSULTANT.id, name: CONSULTANT.name });
    assert.equal(d.lider_responsavel, null);

    const flow = await api(`/api/project-tasks/${tasks[0].id}/flow`, { token: AGENCY.token });
    assert.equal(flow.status, 200, JSON.stringify(flow.json));
    assert.equal(flow.json.state, "aguardando_lancamento");
    assert.equal(flow.json.label, "Aguardando lançamento");
  });

  it("3. lista de projetos traz a categoria real da conta: agência com perfil Partner ativo (sem company_type gravado)", async () => {
    assert.ok(order.projectId, "depende do cenário 1");
    const row = await prisma.project.findUniqueOrThrow({ where: { id: order.projectId } });
    assert.equal(row.company_type, null);
    assert.equal(row.company_id, null);
    assert.equal(row.agency_id, AGENCY.id);
    const list = await api("/api/projects?limit=50", { token: AGENCY.token });
    assert.equal(list.status, 200, JSON.stringify(list.json));
    const p = list.json.data.find((x: any) => x.id === order.projectId);
    assert.ok(p, "projeto da agência aparece na lista dela");
    assert.equal(p._ownerType, "agency");
    assert.equal(p.agency_owner.partner_profile.status, "active");
    const one = await api(`/api/projects/${order.projectId}`, { token: AGENCY.token });
    assert.equal(one.status, 200);
    assert.equal(one.json.agency_owner.partner_profile.status, "active");
  });

  it("4. mensal por link com comissão por produto — 1ª cobrança e split corretos; renovação: comportamento ATUAL documentado (regra da comissão recorrente NÃO definida)", async () => {
    assert.ok(order.projectId && order.monthlyQuote, "depende do cenário 1");
    const base = r2(order.seoQuote.commercial_price + order.monthlyQuote.commercial_price);
    const commission = r2(r2(order.seoQuote.commercial_price * 10 / 100) + r2(order.monthlyQuote.commercial_price * 6 / 100));
    const payment = await prisma.payment.findFirstOrThrow({ where: { project_id: order.projectId, status: "PAGO" } });
    // o valor gravado é a soma das linhas (ponto flutuante); a comparação é em centavos
    assert.equal(r2(payment.amount), order.paidTotal, "cliente pagou base + comissões de cada linha");
    const ledger = await prisma.walletLedger.findMany({ where: { type: "commission", wallet: { owner_id: AGENCY.id } } });
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].amount, commission);
    const platform = await prisma.walletLedger.findUniqueOrThrow({ where: { idempotency_key: `agency_checkout_platform_${payment.id}` } });
    assert.equal(platform.amount, base);
    assert.equal(r2(platform.amount + ledger[0].amount), r2(payment.amount), "split fecha com o total pago");
    const invoices = await prisma.invoice.findMany({ where: { project_id: order.projectId } });
    assert.equal(invoices.length, 1);
    assert.equal(invoices[0].company_id, null, "fatura do pedido da agência nasce sem empresa (por isso o Financeiro da agência não a lista — item 7)");

    const pp = await prisma.projectProduct.findFirstOrThrow({ where: { project_id: order.projectId, catalog2_period: "mensal" } });
    const monthlyClientTotal = r2(order.monthlyQuote.commercial_price + r2(order.monthlyQuote.commercial_price * 6 / 100));
    assert.equal(pp.preco_final_cliente_snapshot, monthlyClientTotal);
    assert.equal(pp.comissao_snapshot, 6);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pp.id } });
    // COMPORTAMENTO ATUAL: a mensalidade congelada é a base da agência, SEM a comissão (o cliente pagou base + 6% no 1º mês).
    assert.equal(sub.monthly_amount, order.monthlyQuote.recurring_price);
    assert.equal(sub.monthly_amount, order.monthlyQuote.commercial_price);
    assert.equal(JSON.parse(sub.first_charge_json!).total, monthlyClientTotal);

    // Renovação no banco descartável (nunca no allka real): emite e paga a fatura do mês 2.
    const expectedRenewal = amountForSubscriptionCycle(sub, 1);
    assert.ok(Math.abs(expectedRenewal - sub.monthly_amount) <= 0.01, `renovação calculada ${expectedRenewal} × mensalidade congelada ${sub.monthly_amount}`);
    const issued = await issueNextInvoice(sub.id);
    assert.equal(issued.issued, true);
    const renewalPayment = await prisma.payment.findUniqueOrThrow({ where: { id: issued.payment_id! } });
    assert.equal(renewalPayment.amount, expectedRenewal, "renovação cobra a mensalidade (base), sem os 6% da agência");
    assert.ok(renewalPayment.amount < monthlyClientTotal);
    const renewalInvoice = await prisma.invoice.findFirstOrThrow({ where: { payment_id: renewalPayment.id } });
    assert.equal(renewalInvoice.company_id, null, "fatura da renovação também sem vínculo com a agência");
    const paid = await payOpenInvoice(sub.id, { cardLastDigits: "4242" });
    assert.equal(paid.paid, true);
    // COMPORTAMENTO ATUAL: renovação não credita comissão nem registra o split plataforma × agência.
    assert.equal(await prisma.walletLedger.count({ where: { type: "commission", wallet: { owner_id: AGENCY.id } } }), 1);
    assert.equal(await prisma.walletLedger.count({ where: { reference_id: renewalPayment.id } }), 0);
    // a renovação liberou as tarefas do mês 2, também paradas (nada lançado/distribuído)
    const cycle2 = await prisma.projectTask.findMany({ where: { project_id: order.projectId, occurrence_index: 1 } });
    assert.ok(cycle2.length >= 1);
    assert.ok(cycle2.every((t) => !t.nomade_responsavel_id && !t.lider_responsavel_id));
  });

  it("5. auditoria T28: faturamento traz agenda e itens reais; histórico atribui autoria só pelo que foi registrado (nunca a quem está vendo)", async () => {
    assert.ok(order.projectId && order.paidTotal, "depende dos cenários 1 e 4");
    const billing = await api(`/api/projects/${order.projectId}/billing`, { token: AGENCY.token });
    assert.equal(billing.status, 200, JSON.stringify(billing.json));
    const sub = await prisma.catalog2Subscription.findFirstOrThrow({ where: { project_id: order.projectId } });
    assert.equal(billing.json.subscriptions.length, 1);
    const [agenda] = billing.json.subscriptions;
    assert.equal(agenda.status, sub.status);
    assert.equal(new Date(agenda.current_period_end).getTime(), sub.current_period_end.getTime());
    const monthlyLine = await prisma.projectProduct.findFirstOrThrow({ where: { project_id: order.projectId, catalog2_period: "mensal" } });
    assert.equal(agenda.project_product.product_name_snapshot, monthlyLine.product_name_snapshot, "nome congelado na contratação");
    assert.deepEqual(Object.keys(agenda).sort(), ["current_period_end", "id", "next_invoice_at", "period_months", "project_product", "status"], "agenda sem valores da assinatura");
    const linkPayment = billing.json.payments.find((p: any) => p.status === "PAGO" && p.payment_method === "CARTAO_TESTE");
    assert.ok(linkPayment, "pagamento do link aparece com a forma registrada");
    assert.equal(r2(linkPayment.items.reduce((s: number, i: any) => s + i.total_snapshot, 0)), order.paidTotal, "itens congelados somam o total pago");
    const renewal = billing.json.payments.find((p: any) => p.payment_method === "RECORRENCIA_AUTOMATICA");
    assert.ok(renewal && renewal.items.length === 1);

    const viewer = jwt.decode(ADMIN) as { id: string };
    const viewerName = (await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } })).name;
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: AGENCY.userId } });
    const log = await api(`/api/projects/${order.projectId}/log`, { token: ADMIN });
    assert.equal(log.status, 200, JSON.stringify(log.json));
    const of = (event: string) => log.json.data.filter((e: any) => e.event === event);
    assert.deepEqual(of("CRIADO")[0].actor, { kind: "user", name: owner.name }, "criador gravado no projeto");
    assert.equal(of("CRIADO")[0].actor_name, owner.name);
    assert.ok(of("PRODUTO_ADICIONADO").length === 2 && of("PRODUTO_ADICIONADO").every((e: any) => e.actor.kind === "unknown" && !e.actor_name), "vínculo do produto não guarda autor");
    const tasks = await prisma.projectTask.findMany({ where: { project_id: order.projectId } });
    assert.ok(tasks.every((t) => t.origin_payment_id), "todas as tarefas nasceram de um pagamento");
    assert.deepEqual(of("TAREFAS_GERADAS")[0].actor, { kind: "system", detail: "automático, após o pagamento" });
    assert.ok(of("CHECKOUT_INICIADO").length === 2 && of("CHECKOUT_INICIADO").every((e: any) => e.actor.kind === "system"), "faturas nascem com o pagamento");
    const approvals = of("PAGAMENTO_APROVADO").map((e: any) => e.actor).sort((a: any, b: any) => a.kind.localeCompare(b.kind));
    assert.deepEqual(approvals, [{ kind: "client", detail: "pelo link de pagamento" }, { kind: "system", detail: "cobrança recorrente da assinatura" }],
      "o link grava o usuário da agência como solicitante, mas quem pagou foi o cliente final");
    assert.ok(log.json.data.every((e: any) => e.actor && e.actor.name !== viewerName && e.actor_name !== viewerName), "admin que está vendo nunca vira autor");
    assert.ok(log.json.data.every((e: any) => e.actor.name !== owner.name || e.event === "CRIADO"), "agência só aparece onde está registrada");
  });

  it("6. tela do projeto (Lista/Kanban): atribuição real das tarefas — ids para todos, nomes só para admin", async () => {
    assert.ok(order.projectId, "depende do cenário 1");
    const tasks = await prisma.projectTask.findMany({ where: { project_id: order.projectId, occurrence_index: 0 }, orderBy: { created_at: "asc" } });
    const viewer = jwt.decode(ADMIN) as { id: string };
    const leader = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
    // banco DESCARTÁVEL: um Líder atribuído a uma tarefa para provar o que cada perfil vê (no allka real nada é atribuído)
    await prisma.projectTask.update({ where: { id: tasks[0].id }, data: { lider_responsavel_id: leader.id } });
    try {
      const asAgency = await api(`/api/project-products?project_id=${order.projectId}`, { token: AGENCY.token });
      assert.equal(asAgency.status, 200, JSON.stringify(asAgency.json));
      const agencyTasks = asAgency.json.data.flatMap((pp: any) => pp.tasks);
      const withLeader = agencyTasks.find((t: any) => t.id === tasks[0].id);
      assert.equal(withLeader.lider_responsavel_id, leader.id, "agência sabe que há Líder atribuído");
      assert.ok(agencyTasks.every((t: any) => !("lider_responsavel_name" in t) && !("nomade_responsavel_name" in t)), "agência não recebe nomes");
      assert.doesNotMatch(JSON.stringify(asAgency.json), new RegExp(leader.name));
      assert.ok(agencyTasks.filter((t: any) => t.id !== tasks[0].id).every((t: any) => t.lider_responsavel_id === null && t.nomade_responsavel_id === null), "as outras seguem sem ninguém");

      const asAdmin = await api(`/api/project-products?project_id=${order.projectId}`, { token: ADMIN });
      assert.equal(asAdmin.status, 200, JSON.stringify(asAdmin.json));
      const adminTask = asAdmin.json.data.flatMap((pp: any) => pp.tasks).find((t: any) => t.id === tasks[0].id);
      assert.equal(adminTask.lider_responsavel_name, leader.name);
      assert.equal(adminTask.nomade_responsavel_name, null, "sem Nômade atribuído não aparece nome nenhum");
    } finally {
      await prisma.projectTask.update({ where: { id: tasks[0].id }, data: { lider_responsavel_id: null } });
    }
  });
});
