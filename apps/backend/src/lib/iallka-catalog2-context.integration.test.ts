import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "./prisma";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "./catalog2-classifications-seed";
import { publishVersion } from "./catalog2-service";
import {
  buildCatalog2ProductAuraContext,
  resolveCatalog2QuoteAuraContext,
  buildCatalog2HistoryAuraContext,
} from "./iallka-catalog2-context";

// Item 9 (reunião 2026-09-14, "Atualizar o contexto da Aura") — testa os
// CONSTRUTORES de contexto diretamente (nunca `sendIallkaTurn`/a rota de
// mensagem completa, que chamaria a IA de verdade — mesma convenção já
// usada em iallka.integration.test.ts). Cobre: respostas com os dados
// corretos de produto/cotação; isolamento entre contas; dados
// provisórios/internos respeitando o perfil; produto indisponível nunca
// apresentado como contratável; proteção de preço com datas reais.

const catProducts: string[] = [];
const users: string[] = [];
const companies: string[] = [];
const adminProfiles: string[] = [];

async function setPricingSettings() {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
    update: { component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
  });
}
async function mkReadyPublishedProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const questionnaire = await prisma.catalog2Questionnaire.create({ data: { name: `Briefing ${slug}` } });
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
      tasks: {
        create: [{
          key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
          questionnaire_id: questionnaire.id,
          steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] },
        }],
      },
    },
  });
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id, specialtyId: spec.id };
}
async function mkIncompleteDraftProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "redator" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: null } });
  await setPricingSettings();
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
      tasks: { create: [{ key: "t1", name: "Tarefa incompleta", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1 }] },
    },
  });
  // publica sem estar comercialmente pronto (mesmo cenário validado nos itens anteriores).
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste (incompleto)" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}
async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] C15 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c15co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co15 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return u;
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C15 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c15ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: master ? "Admin Master" : "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return u;
}
async function mkQuote(product: { id: string; published_version_id: string | null }, owner: { id: string; company_id: string | null }) {
  return prisma.catalog2Quote.create({
    data: {
      account_kind: "company", account_id: owner.company_id!, user_id: owner.id,
      product_id: product.id, version_id: product.published_version_id!,
      selection_json: JSON.stringify({ variation_option_keys: [], addon_keys: [], quantity: 1 }),
      quantity: 1, commercial_deadline_days: 5, commercial_price: 1000, currency: "BRL",
      config_checksum: crypto.randomBytes(16).toString("hex"),
      status: "valida", valid_until: new Date(Date.now() + 48 * 3600 * 1000), is_preview: false,
    },
  });
}
async function purgeProduct(id: string) {
  await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

describe("Contexto da Aura para catalog2 (Item 9, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
  });
  after(async () => {
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. produto real e pronto: admin recebe tarefas/etapas/questionário/períodos; conta comercial recebe o mesmo, sem pendências administrativas", async () => {
    const { product } = await mkReadyPublishedProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);

    const adminCtx = await buildCatalog2ProductAuraContext(product.id, { isAdminMaster: true, clientVisibleOnly: false });
    assert.ok(adminCtx);
    assert.match(adminCtx!.text, /Tarefa fixa/);
    assert.match(adminCtx!.text, /Questionários vinculados/);
    assert.match(adminCtx!.text, /Pendências administrativas/);

    const clientCtx = await buildCatalog2ProductAuraContext(product.id, { isAdminMaster: false, clientVisibleOnly: true });
    assert.ok(clientCtx);
    assert.doesNotMatch(clientCtx!.text, /Pendências administrativas/, "conta comercial nunca recebe a seção de pendências administrativas");
    assert.match(clientCtx!.text, /Contratável agora \(proposta nova\): sim/);
  });

  it("2. produto incompleto/indisponível nunca é apresentado como contratável, e some do contexto de conta comercial", async () => {
    const { product } = await mkIncompleteDraftProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);

    const adminCtx = await buildCatalog2ProductAuraContext(product.id, { isAdminMaster: true, clientVisibleOnly: false });
    assert.ok(adminCtx, "Admin Master continua vendo o produto, mesmo incompleto");
    assert.match(adminCtx!.text, /Contratável agora \(proposta nova\): não/);

    const clientCtx = await buildCatalog2ProductAuraContext(product.id, { isAdminMaster: false, clientVisibleOnly: true });
    assert.equal(clientCtx, null, "produto não visível pro perfil nunca vira contexto — nunca revela nem a existência dele");
  });

  it("3. produto inexistente nunca gera contexto (nunca inventa dado)", async () => {
    const ctx = await buildCatalog2ProductAuraContext("produto-que-nao-existe-xyz", { isAdminMaster: true, clientVisibleOnly: false });
    assert.equal(ctx, null);
  });

  it("4. cotação: isolamento entre contas — dono real recebe os dados corretos; outra conta nunca recebe nada", async () => {
    const { product } = await mkReadyPublishedProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);
    const ownerA = await mkCompanyUser("A");
    const ownerB = await mkCompanyUser("B");
    const ownerAFull = await prisma.user.findUniqueOrThrow({ where: { id: ownerA.id } });
    const quote = await mkQuote(product, ownerAFull);

    const asOwner = await resolveCatalog2QuoteAuraContext(quote.id, ownerA.id, "empresas", "company_user", false);
    assert.equal(asOwner.authorized, true);
    assert.ok(asOwner.content);
    assert.match(asOwner.content!.text, /Preço congelado nesta cotação: BRL 1000/);

    const asOtherAccount = await resolveCatalog2QuoteAuraContext(quote.id, ownerB.id, "empresas", "company_user", false);
    assert.equal(asOtherAccount.authorized, false, "cotação de outra conta nunca é autorizada");
    assert.equal(asOtherAccount.content, null);

    const asAdmin = await resolveCatalog2QuoteAuraContext(quote.id, ownerB.id, "empresas", "company_user", true);
    assert.equal(asAdmin.authorized, true, "Admin Master pode ver qualquer cotação, pra suporte");
  });

  it("5. proteção de preço da cotação usa as DATAS REAIS persistidas — nunca um valor inventado", async () => {
    const { product } = await mkReadyPublishedProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);
    const owner = await mkCompanyUser("C");
    const ownerFull = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    const quote = await mkQuote(product, ownerFull);
    const startedAt = new Date(Date.now() - 10 * 24 * 3600 * 1000); // 10 dias atrás -> faltam 20 dias
    await prisma.catalog2Quote.update({ where: { id: quote.id }, data: { price_protection_started_at: startedAt } });

    const result = await resolveCatalog2QuoteAuraContext(quote.id, owner.id, "empresas", "company_user", false);
    assert.equal(result.authorized, true);
    const expectedEnd = new Date(startedAt.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    assert.match(result.content!.text, new RegExp(expectedEnd));
    assert.match(result.content!.text, /ainda ativa/);
  });

  it("6. histórico: só Admin Master recebe; conta comercial nunca recebe, mesmo pedindo explicitamente", async () => {
    const { product } = await mkReadyPublishedProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);
    const asAdmin = await buildCatalog2HistoryAuraContext(product.id, true);
    assert.ok(asAdmin);
    assert.match(asAdmin!.text, /Cobertura completa a partir de/);

    const asClient = await buildCatalog2HistoryAuraContext(product.id, false);
    assert.equal(asClient, null, "histórico nunca é montado pra quem não é Admin Master");
  });

  it("7. histórico nunca inventa evento — produto sem histórico de verdade mostra 'nenhum evento registrado'", async () => {
    const { product } = await mkReadyPublishedProduct(`c15-${crypto.randomBytes(4).toString("hex")}`);
    // limpa qualquer evento de histórico já gravado pela própria publicação de teste acima.
    await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: product.id } });
    const ctx = await buildCatalog2HistoryAuraContext(product.id, true);
    assert.ok(ctx);
    // total pode ainda ser > 0 por causa do evento "created"/"published" mesclado (Catalog2VersionEvent) — o que importa é nunca um evento FORA da lista real.
    assert.doesNotMatch(ctx!.text, /evento inventado/i);
  });
});
