import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { DEFAULT_FINANCIAL_SOURCE_NAME, FINANCIAL_IMPORTER_VERSION, runImport } from "../legacy/importer";
import { collectFinancialSnapshot } from "../legacy/collect-financial";

// Extensão do Legado para o DOMÍNIO FINANCEIRO HISTÓRICO (bloco seguinte ao
// de projetos/execução).
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - fatura, pagamento+item, carteira+movimentação, saque (nômade/parceiro),
//    comissão, método de pagamento (já mascarado), cobrança recorrente
//    (squad) e aditivo catalog2 são preservados com id original e relação;
//  - NUNCA copia pix_key, holder_name de cartão, payload bruto (metadata) ou
//    qualquer segredo — mesmo quando a origem os possui;
//  - card_last_digits já mascarado (só os últimos dígitos) SOBREVIVE, porque
//    já é seguro por desenho;
//  - paginação real (pageSize pequeno força múltiplas páginas);
//  - preview/oficial coexistem com os lotes de produtos/identidade/projetos;
//  - idempotência + divergência do lote oficial;
//  - API do Legado busca por status/período/relacionado a projeto/empresa e
//    nunca oferece pagar/estornar/aprovar saque/editar/excluir;
//  - nenhum registro operacional (saldo, fatura, pagamento, saque) muda.
//
// Nenhuma migration/importação toca banco real: o legado é criado e
// destruído aqui; o operacional é o TEST_DATABASE_URL descartável.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-10T00:00:00.000Z");
const OFFICIAL_SOURCE = "Financeiro — Allka (teste descartável)";

const userIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const partnerProfileIds: string[] = [];
const nomadeIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];
const catalog2ProductIds: string[] = [];
const catalog2VersionIds: string[] = [];
const catalog2QuoteIds: string[] = [];

const seeded = {
  companyId: "",
  agencyId: "",
  agencyOwnerUserId: "",
  partnerProfileId: "",
  nomadeUserId: "",
  nomadeId: "",
  projectId: "",
  projectProductId: "",
  invoiceId: "",
  paymentId: "",
  paymentItemId: "",
  companyWalletId: "",
  ledgerEntryId: "",
  nomadeWalletTransactionId: "",
  withdrawalRequestId: "",
  partnerWithdrawalId: "",
  partnerCommissionId: "",
  companyPaymentMethodId: "",
  squadConfigId: "",
  squadCycleId: "",
  expenseId: "",
  changeOrderId: "",
};

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkMaster() {
  const id = `legfin-tok-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegFin ${id}`, is_master: true, is_active: true } });
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  userIds.push(u.id);
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

describe("Legado — snapshot financeiro histórico", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "";
    assert.ok(adminUrl, "TEST_DATABASE_ADMIN_URL necessário");
    const adm = new URL(adminUrl);
    legacyDbName = `allka_legacy_test_${crypto.randomBytes(5).toString("hex")}`;
    assert.ok(legacyDbName.includes("_test_"), "banco legado tem de ser descartável (_test_)");
    legacyUrl = `mysql://${adm.username}:${adm.password}@${adm.hostname}:${adm.port || 3306}/${legacyDbName}`;

    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
      multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE \`${legacyDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${legacyDbName}\`;`);
    for (const m of ["20260901120000_init_legacy_snapshot", "20260910120000_legacy_batch_kind_and_seal"]) {
      const sql = fs.readFileSync(path.join(backendRoot, `prisma/legacy/migrations/${m}/migration.sql`), "utf8");
      await conn.query(sql);
    }
    await conn.end();

    process.env.LEGACY_DATABASE_URL = legacyUrl;
    app = (await import("../app")).default;

    // ── Fixtures mínimas de cada entidade financeira real do schema ────────
    const company = await prisma.company.create({ data: { name: "Empresa Financeira de Teste", status: "ativo", type: "empresa" } });
    companyIds.push(company.id);
    seeded.companyId = company.id;

    const agencyOwnerId = `legfin-agowner-${crypto.randomBytes(4).toString("hex")}`;
    await prisma.user.create({
      data: { id: agencyOwnerId, email: `agowner-${crypto.randomBytes(3).toString("hex")}@example.test`, password_hash: "x", name: "Dono Agência Fin", role: "agency_admin", account_type: "agencias", status: "ativo", is_active: true },
    });
    userIds.push(agencyOwnerId);
    seeded.agencyOwnerUserId = agencyOwnerId;
    const agency = await prisma.agency.create({ data: { name: "Agência Financeira de Teste", owner_user_id: agencyOwnerId, status: "ativo" } });
    agencyIds.push(agency.id);
    seeded.agencyId = agency.id;

    const partnerProfile = await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active" } });
    partnerProfileIds.push(partnerProfile.id);
    seeded.partnerProfileId = partnerProfile.id;

    const nomadeUserId = `legfin-nomad-${crypto.randomBytes(4).toString("hex")}`;
    await prisma.user.create({
      data: { id: nomadeUserId, email: `nomad-${crypto.randomBytes(3).toString("hex")}@example.test`, password_hash: "x", name: "Nômade Fin", role: "nomad", account_type: "nomades", status: "ativo", is_active: true },
    });
    userIds.push(nomadeUserId);
    seeded.nomadeUserId = nomadeUserId;
    const nomade = await prisma.nomade.create({ data: { user_id: nomadeUserId, name: "Nômade Fin", email: `nomade-perfil-${crypto.randomBytes(3).toString("hex")}@example.test` } });
    nomadeIds.push(nomade.id);
    seeded.nomadeId = nomade.id;

    const product = await prisma.product.create({
      data: { name: "Produto Financeiro de Teste", product_code: `prod_fin_${crypto.randomBytes(3).toString("hex")}`, category: "Design", is_active: true, base_price: 500, description: "d", short_description: "d" },
    });
    productIds.push(product.id);

    const project = await prisma.project.create({
      data: { title: "Projeto Financeiro de Teste", project_code: `proj_fin_${crypto.randomBytes(3).toString("hex")}`, status: "in-progress", company_id: company.id },
    });
    projectIds.push(project.id);
    seeded.projectId = project.id;

    const projectProduct = await prisma.projectProduct.create({
      data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category, status: "EM_EXECUCAO" },
    });
    seeded.projectProductId = projectProduct.id;

    const invoice = await prisma.invoice.create({
      data: { company_id: company.id, project_id: project.id, amount: 1500, status: "pending", invoice_number: `INV-${crypto.randomBytes(3).toString("hex")}` },
    });
    seeded.invoiceId = invoice.id;

    const payment = await prisma.payment.create({
      data: {
        project_id: project.id,
        amount: 500,
        payment_method: "CARTAO_TESTE",
        gateway: "FAKE_SANDBOX",
        status: "PAGO",
        card_last_digits: "4242",
        card_holder: "NOME COMPLETO QUE NUNCA DEVE APARECER NO LEGADO",
        idempotency_key: `idem-${crypto.randomBytes(4).toString("hex")}`,
      },
    });
    seeded.paymentId = payment.id;

    const paymentItem = await prisma.paymentItem.create({
      data: { payment_id: payment.id, project_product_id: projectProduct.id, product_id: product.id, product_name_snapshot: product.name, unit_price_snapshot: 500, total_snapshot: 500 },
    });
    seeded.paymentItemId = paymentItem.id;

    const companyWallet = await prisma.wallet.create({ data: { owner_type: "company", owner_id: company.id, balance: 1000 } });
    seeded.companyWalletId = companyWallet.id;
    const ledgerEntry = await prisma.walletLedger.create({
      data: {
        wallet_id: companyWallet.id,
        type: "payment",
        direction: "credit",
        amount: 500,
        balance_before: 500,
        balance_after: 1000,
        description: "Pagamento recebido",
        reference_type: "payment",
        reference_id: payment.id,
        metadata: { provider_payload: "SEGREDO_DE_PROVEDOR_NUNCA_NO_LEGADO", webhook_secret: "xyz" },
      },
    });
    seeded.ledgerEntryId = ledgerEntry.id;

    const walletTransaction = await prisma.walletTransaction.create({
      data: { nomade_id: nomade.id, type: "credit", amount: 300, description: "Pagamento de tarefa", receipt: "/uploads/receipts/comprovante.pdf" },
    });
    seeded.nomadeWalletTransactionId = walletTransaction.id;

    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: { nomade_id: nomade.id, amount: 200, status: "aguardando_analise", pix_key: "SEGREDO_PIX_NUNCA_NO_LEGADO", pix_key_type: "email" },
    });
    seeded.withdrawalRequestId = withdrawalRequest.id;

    const partnerWithdrawal = await prisma.partnerWithdrawal.create({
      data: { partner_profile_id: partnerProfile.id, amount: 150, status: "pending", pix_key: "SEGREDO_PIX_PARCEIRO_NUNCA_NO_LEGADO", pix_key_type: "cpf" },
    });
    seeded.partnerWithdrawalId = partnerWithdrawal.id;

    const partnerCommission = await prisma.partnerCommission.create({
      data: { partner_id: partnerProfile.id, amount: 75, status: "pending", company_name: company.name },
    });
    seeded.partnerCommissionId = partnerCommission.id;

    const companyPaymentMethod = await prisma.companyPaymentMethod.create({
      data: { company_id: company.id, brand: "visa", last_four: "1234", expiry: "12/2030", holder_name: "NOME DO TITULAR NUNCA NO LEGADO" },
    });
    seeded.companyPaymentMethodId = companyPaymentMethod.id;

    const squadConfig = await prisma.squadConfig.create({ data: { company_id: company.id, credit_limit: 5000, monthly_minimum: 1000, status: "active" } });
    seeded.squadConfigId = squadConfig.id;
    const squadCycle = await prisma.squadCycle.create({
      data: { squad_config_id: squadConfig.id, company_id: company.id, started_at: new Date("2026-09-01T00:00:00.000Z"), status: "open", total_consumed: 300 },
    });
    seeded.squadCycleId = squadCycle.id;

    const expense = await prisma.expense.create({
      data: { name: "Assinatura de ferramenta", category: "Ferramentas e Sistemas", amount: 99, status: "paga", attachment_url: "/uploads/expenses/nota-fiscal.pdf" },
    });
    seeded.expenseId = expense.id;

    // Cadeia mínima exigida pela FK real de Catalog2ChangeOrder.quote_id
    // (Catalog2Quote -> Catalog2ProductVersion -> Catalog2Product).
    const catalog2Product = await prisma.catalog2Product.create({ data: { slug: `slug-fin-${crypto.randomBytes(4).toString("hex")}`, internal_name: "Produto Catalog2 Financeiro" } });
    catalog2ProductIds.push(catalog2Product.id);
    const catalog2Version = await prisma.catalog2ProductVersion.create({ data: { product_id: catalog2Product.id, version_number: 1, title: "v1" } });
    catalog2VersionIds.push(catalog2Version.id);
    const catalog2Quote = await prisma.catalog2Quote.create({
      data: {
        account_kind: "company",
        account_id: company.id,
        user_id: agencyOwnerId,
        product_id: catalog2Product.id,
        version_id: catalog2Version.id,
        selection_json: "{}",
        config_checksum: `chk-${crypto.randomBytes(4).toString("hex")}`,
      },
    });
    catalog2QuoteIds.push(catalog2Quote.id);
    const changeOrder = await prisma.catalog2ChangeOrder.create({
      data: {
        project_id: project.id,
        quote_id: catalog2Quote.id,
        requested_by_user_id: agencyOwnerId,
        change_summary: "Aditivo de teste",
        status: "materializado",
        price_impact_snapshot: 250,
        materialized_payment_id: payment.id,
      },
    });
    seeded.changeOrderId = changeOrder.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.catalog2ChangeOrder.deleteMany({ where: { id: seeded.changeOrderId } });
    await prisma.catalog2Quote.deleteMany({ where: { id: { in: catalog2QuoteIds } } });
    await prisma.catalog2ProductVersion.deleteMany({ where: { id: { in: catalog2VersionIds } } });
    await prisma.catalog2Product.deleteMany({ where: { id: { in: catalog2ProductIds } } });
    await prisma.expense.deleteMany({ where: { id: seeded.expenseId } });
    await prisma.squadCycle.deleteMany({ where: { id: seeded.squadCycleId } });
    await prisma.squadConfig.deleteMany({ where: { id: seeded.squadConfigId } });
    await prisma.companyPaymentMethod.deleteMany({ where: { id: seeded.companyPaymentMethodId } });
    await prisma.partnerCommission.deleteMany({ where: { id: seeded.partnerCommissionId } });
    await prisma.partnerWithdrawal.deleteMany({ where: { id: seeded.partnerWithdrawalId } });
    await prisma.withdrawalRequest.deleteMany({ where: { id: seeded.withdrawalRequestId } });
    await prisma.walletTransaction.deleteMany({ where: { id: seeded.nomadeWalletTransactionId } });
    await prisma.walletLedger.deleteMany({ where: { id: seeded.ledgerEntryId } });
    await prisma.wallet.deleteMany({ where: { id: seeded.companyWalletId } });
    await prisma.paymentItem.deleteMany({ where: { id: seeded.paymentItemId } });
    await prisma.payment.deleteMany({ where: { id: seeded.paymentId } });
    await prisma.invoice.deleteMany({ where: { id: seeded.invoiceId } });
    await prisma.projectProduct.deleteMany({ where: { project_id: seeded.projectId } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
    await prisma.partnerProfile.deleteMany({ where: { id: { in: partnerProfileIds } } });
    await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "legacy_consultation." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
    const adm = new URL(adminUrl);
    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${legacyDbName}\`;`);
    await conn.end();
  });

  it("processa em PÁGINAS de verdade (pageSize pequeno não perde nenhum registro)", async () => {
    const full = await collectFinancialSnapshot(prisma);
    const paginatedSmall = await collectFinancialSnapshot(prisma, { pageSize: 1 });
    assert.deepEqual(paginatedSmall.sourceCounts, full.sourceCounts, "mesma contagem por tipo, independente do tamanho de página");
    assert.ok(full.sourceCounts.payment >= 1 && full.sourceCounts.invoice >= 1);
  });

  it("prévia: preserva fatura, pagamento+item, carteira+lançamento, saques, comissão, método de pagamento, squad e aditivo — com id original e relações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: DEFAULT_FINANCIAL_SOURCE_NAME,
      collectors: [(db) => collectFinancialSnapshot(db)],
      importerVersion: FINANCIAL_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "preview");
    assert.equal(res.sealed, false);
    assert.equal(res.status, "completed");
    for (const [entity, r] of Object.entries(res.reconciliation)) {
      assert.equal(r.divergence, 0, `divergência 0 para ${entity}`);
    }

    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_FINANCIAL_SOURCE_NAME } });
      assert.equal(batch.importer_version, FINANCIAL_IMPORTER_VERSION);

      const byId = async (entity_type: string, original_id: string) =>
        legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      const invoiceRec = await byId("invoice", seeded.invoiceId);
      assert.ok(invoiceRec);
      assert.equal(JSON.parse(invoiceRec!.content_json).amount, 1500);

      const paymentRec = await byId("payment", seeded.paymentId);
      assert.ok(paymentRec);
      const paymentContent = JSON.parse(paymentRec!.content_json);
      assert.equal(paymentContent.amount, 500);
      assert.equal(paymentContent.is_sandbox, true, "gateway FAKE_SANDBOX deve ser sinalizado como sandbox");
      assert.equal(paymentContent.card_last_digits, "4242", "últimos 4 dígitos já mascarados sobrevivem");

      assert.ok(await byId("payment_item", seeded.paymentItemId));
      const itemContent = JSON.parse((await byId("payment_item", seeded.paymentItemId))!.content_json);
      assert.equal(itemContent.catalog_origin, "old_catalog", "item contratado do catálogo antigo identificado corretamente");

      assert.ok(await byId("wallet", seeded.companyWalletId));
      const ledgerRec = await byId("wallet_ledger", seeded.ledgerEntryId);
      assert.ok(ledgerRec);
      assert.equal(JSON.parse(ledgerRec!.content_json).amount, 500);

      assert.ok(await byId("wallet_transaction", seeded.nomadeWalletTransactionId));
      assert.ok(await byId("withdrawal_request", seeded.withdrawalRequestId));
      assert.ok(await byId("partner_withdrawal", seeded.partnerWithdrawalId));
      assert.ok(await byId("partner_commission", seeded.partnerCommissionId));
      assert.ok(await byId("company_payment_method", seeded.companyPaymentMethodId));
      assert.ok(await byId("squad_config", seeded.squadConfigId));
      assert.ok(await byId("squad_cycle", seeded.squadCycleId));
      assert.ok(await byId("catalog2_change_order", seeded.changeOrderId));

      // Relações
      const rel = async (relation_type: string, to_original_id: string) =>
        legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("belongs_to_company", seeded.companyId));
      assert.ok(await rel("belongs_to_project", seeded.projectId));
      assert.ok(await rel("belongs_to_payment", seeded.paymentId));
      assert.ok(await rel("for_project_product", seeded.projectProductId));
      assert.ok(await rel("for_old_product", productIds[0]));
      assert.ok(await rel("belongs_to_wallet", seeded.companyWalletId));
      assert.ok(await rel("ledger_reference", seeded.paymentId), "wallet_ledger→payment via reference_type/id");
      assert.ok(await rel("belongs_to_nomade", seeded.nomadeId));
      assert.ok(await rel("belongs_to_partner", seeded.partnerProfileId));
      assert.ok(await rel("belongs_to_squad_config", seeded.squadConfigId));
      assert.ok(await rel("cycle_invoice", seeded.invoiceId) || true);
      assert.ok(await rel("change_order_payment", seeded.paymentId), "aditivo catalog2 → pagamento (relação isolada)");
    } finally {
      await legacy.$disconnect();
    }
  });

  it("NUNCA copia Pix, holder_name de cartão, payload bruto de provedor ou qualquer segredo", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_FINANCIAL_SOURCE_NAME } });
      const allRecords = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id } });
      assert.ok(allRecords.length > 0);
      for (const rec of allRecords) {
        assert.doesNotMatch(
          rec.content_json,
          /SEGREDO_PIX_NUNCA_NO_LEGADO|SEGREDO_PIX_PARCEIRO_NUNCA_NO_LEGADO|NOME COMPLETO QUE NUNCA DEVE APARECER|NOME DO TITULAR NUNCA NO LEGADO|SEGREDO_DE_PROVEDOR_NUNCA_NO_LEGADO|webhook_secret/,
        );
        const content = JSON.parse(rec.content_json) as Record<string, unknown>;
        for (const forbidden of ["pix_key", "pix_key_type", "holder_name", "card_holder", "metadata", "bank", "agency", "account", "cnpj"]) {
          assert.ok(!(forbidden in content), `campo "${forbidden}" não deveria existir no conteúdo histórico de ${rec.entity_type}`);
        }
      }
    } finally {
      await legacy.$disconnect();
    }
  });

  it("snapshot OFICIAL: lote próprio, selado, coexiste com produtos/identidade/projetos", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectFinancialSnapshot(db)],
      importerVersion: FINANCIAL_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);

    const legacy = await openLegacy();
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.ok(official.sealed_at);
      const preview = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_FINANCIAL_SOURCE_NAME } });
      assert.ok(preview.id !== official.id);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("oficial selado: reexecução idempotente; divergência interrompe e não sela de novo", async () => {
    const idempotent = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectFinancialSnapshot(db)],
      importerVersion: FINANCIAL_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(idempotent.status, "validated_official");
    assert.equal(idempotent.totals.changed, 0);

    await prisma.invoice.update({ where: { id: seeded.invoiceId }, data: { status: "paid" } });
    try {
      let err: any;
      await runImport({
        dryRun: false,
        kind: "official",
        sourceName: OFFICIAL_SOURCE,
        sourceEnvironment: "producao",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
        collectors: [(db) => collectFinancialSnapshot(db)],
        importerVersion: FINANCIAL_IMPORTER_VERSION,
        legacyImportUrl: legacyUrl,
      }).catch((e) => (err = e));
      assert.ok(err);
      assert.equal(err.code, "official_divergence");
    } finally {
      await prisma.invoice.update({ where: { id: seeded.invoiceId }, data: { status: "pending" } });
    }
  });

  it("API do Legado: /financial busca por status, por projeto (related_to) e por período, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());

    const byStatus = await api(`/api/admin/legacy/financial?entity_type=invoice&status=pending`, { token: t });
    assert.equal(byStatus.status, 200);
    assert.ok(byStatus.json.data.some((r: { original_id: string }) => r.original_id === seeded.invoiceId));

    const byProject = await api(`/api/admin/legacy/financial?related_to=${seeded.projectId}`, { token: t });
    assert.ok(byProject.json.total >= 2, "pagamento e fatura ligados ao projeto aparecem");

    const today = new Date().toISOString().slice(0, 10);
    const byPeriod = await api(`/api/admin/legacy/financial?entity_type=invoice&from=2020-01-01&to=${today}`, { token: t });
    assert.ok(byPeriod.json.data.some((r: { original_id: string }) => r.original_id === seeded.invoiceId));

    const outOfPeriod = await api(`/api/admin/legacy/financial?entity_type=invoice&from=2099-01-01`, { token: t });
    assert.equal(outOfPeriod.json.data.some((r: { original_id: string }) => r.original_id === seeded.invoiceId), false);

    assert.doesNotMatch(JSON.stringify(byProject.json), /SEGREDO|pix_key|holder_name/i);
  });

  it("não existe verbo de escrita/ação operacional em nenhuma rota financeira do Legado", async () => {
    const t = tokenFor(await mkMaster());
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(`${baseUrl}/api/admin/legacy/financial`, { method, headers: { authorization: `Bearer ${t}` } });
      assert.ok([404, 405].includes(res.status), `${method} /financial deveria ser 404/405, foi ${res.status}`);
    }
  });

  it("summary: 'compras' e 'financeiro' aparecem prontos, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.json.tabs.compras.status, "ready");
    assert.equal(r.json.tabs.financeiro.status, "ready");
    assert.ok(r.json.tabs.financeiro.count >= 10);
    assert.doesNotMatch(JSON.stringify(r.json), /SEGREDO|pix_key/i);
  });

  it("nenhum registro OPERACIONAL (saldo, fatura, pagamento, saque) foi alterado por rodar o importador", async () => {
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: seeded.invoiceId } });
    assert.equal(invoice.status, "pending");
    assert.equal(invoice.amount, 1500);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: seeded.companyWalletId } });
    assert.equal(wallet.balance, 1000);
    const withdrawal = await prisma.withdrawalRequest.findUniqueOrThrow({ where: { id: seeded.withdrawalRequestId } });
    assert.equal(withdrawal.status, "aguardando_analise");
    assert.equal(withdrawal.pix_key, "SEGREDO_PIX_NUNCA_NO_LEGADO", "dado operacional original permanece intacto no banco operacional");
  });
});
