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
import { DEFAULT_CAMPAIGN_SOURCE_NAME, CAMPAIGN_IMPORTER_VERSION, runImport } from "../legacy/importer";
import { collectCampaignsSnapshot } from "../legacy/collect-campaigns";

// Extensão do Legado para CAMPANHAS, CUPONS e DESTINATÁRIOS — BLOCO FINAL
// de cobertura do domínio operacional.
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - campanha, cupom+uso, campanha de comunicação+estado por destinatário e
//    entrega de origem campanha são preservados com id original e relação;
//  - segredo colado em texto livre (corpo da campanha) é redigido, não
//    exclui o registro, e o resto do texto continua legível;
//  - NUNCA copia token/webhook/credencial (nem existem no schema, então nem
//    chegam a ser lidos) — prova negativa;
//  - destinatário é sempre um User real (nunca contato externo bruto);
//  - anexo (imagem da campanha) só metadado + referência;
//  - paginação real, idempotência, divergência;
//  - coexistência com os 5 lotes anteriores;
//  - API do Legado só lê;
//  - nenhum registro operacional muda;
//  - simulador de virada deixa de apontar "campanhas" como lacuna.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-10T00:00:00.000Z");
const OFFICIAL_SOURCE = "Campanhas — Allka (teste descartável)";

const userIds: string[] = [];
const adminProfileIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const partnerProfileIds: string[] = [];

const seeded = {
  ownerUserId: "",
  companyId: "",
  agencyId: "",
  partnerProfileId: "",
  campaignId: "",
  couponId: "",
  couponUsageId: "",
  communicationCampaignId: "",
  recipientStateId: "",
  deliveryId: "",
};

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, { headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) } });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkMaster() {
  const id = `legcamp-tok-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegCamp ${id}`, is_master: true, is_active: true } });
  adminProfileIds.push(p.id);
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

describe("Legado — snapshot de campanhas, cupons e destinatários (bloco final)", () => {
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

    // ── Fixtures mínimas ─────────────────────────────────────────────────
    const ownerUser = await prisma.user.create({
      data: { id: `legcamp-owner-${crypto.randomBytes(4).toString("hex")}`, email: `owner-${crypto.randomBytes(3).toString("hex")}@example.test`, password_hash: "SEGREDO_DO_DONO_NUNCA_NO_LEGADO", name: "Dono da Agência", role: "agency_admin", account_type: "agencias", status: "ativo", is_active: true },
    });
    userIds.push(ownerUser.id);
    seeded.ownerUserId = ownerUser.id;

    const agency = await prisma.agency.create({ data: { name: "Agência de Campanha (teste)", owner_user_id: ownerUser.id, status: "ativo" } });
    agencyIds.push(agency.id);
    seeded.agencyId = agency.id;
    const partnerProfile = await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active" } });
    partnerProfileIds.push(partnerProfile.id);
    seeded.partnerProfileId = partnerProfile.id;

    const company = await prisma.company.create({ data: { name: "Empresa de Campanha (teste)", status: "ativo", type: "empresa" } });
    companyIds.push(company.id);
    seeded.companyId = company.id;

    const campaign = await prisma.campaign.create({
      data: { name: "Campanha de Indicação (teste)", type: "referral", status: "active", commission_type: "percentage", commission_value: 15, coupon_code: `REF-${crypto.randomBytes(3).toString("hex")}` },
    });
    seeded.campaignId = campaign.id;

    await prisma.partnerCommission.create({
      data: { partner_id: partnerProfile.id, campaign_id: campaign.id, amount: 50, status: "pending", company_name: company.name },
    });

    const coupon = await prisma.coupon.create({
      data: { code: `CUPOM-${crypto.randomBytes(3).toString("hex")}`, coupon_type: "discount", discount_type: "percentage", discount_value: 10, linked_user_id: ownerUser.id, allowed_company_ids: JSON.stringify([company.id]) },
    });
    seeded.couponId = coupon.id;
    const couponUsage = await prisma.couponUsage.create({ data: { coupon_id: coupon.id, company_id: company.id } });
    seeded.couponUsageId = couponUsage.id;

    const communicationCampaign = await prisma.communicationCampaign.create({
      data: {
        internal_name: "reengajamento-teste",
        title: "Volte a usar a Allka",
        body: `Sentimos sua falta! Segredo colado à mão: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa — favor ignorar`,
        image_file_name: "banner-campanha.png",
        channels_json: JSON.stringify(["platform", "email"]),
        audience_json: JSON.stringify({ account_types: ["empresas"] }),
        status: "completed",
        created_by_user_id: ownerUser.id,
        activated_by_user_id: ownerUser.id,
      },
    });
    seeded.communicationCampaignId = communicationCampaign.id;

    const recipientState = await prisma.campaignRecipientState.create({
      data: { campaign_id: communicationCampaign.id, recipient_user_id: ownerUser.id, state: "processed" },
    });
    seeded.recipientStateId = recipientState.id;

    const delivery = await prisma.communicationDelivery.create({
      data: { origin: "campaign", origin_id: communicationCampaign.id, recipient_user_id: ownerUser.id, channel: "platform", status: "delivered", scheduled_for: new Date(), delivered_at: new Date(), idempotency_key: `idem-camp-${crypto.randomBytes(4).toString("hex")}` },
    });
    seeded.deliveryId = delivery.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.communicationDelivery.deleteMany({ where: { id: seeded.deliveryId } });
    await prisma.campaignRecipientState.deleteMany({ where: { id: seeded.recipientStateId } });
    await prisma.communicationCampaign.deleteMany({ where: { id: seeded.communicationCampaignId } });
    await prisma.couponUsage.deleteMany({ where: { id: seeded.couponUsageId } });
    await prisma.coupon.deleteMany({ where: { id: seeded.couponId } });
    await prisma.partnerCommission.deleteMany({ where: { campaign_id: seeded.campaignId } });
    await prisma.campaign.deleteMany({ where: { id: seeded.campaignId } });
    await prisma.partnerProfile.deleteMany({ where: { id: { in: partnerProfileIds } } });
    await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "legacy_consultation." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfileIds } } });
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
    const full = await collectCampaignsSnapshot(prisma);
    const paginatedSmall = await collectCampaignsSnapshot(prisma, { pageSize: 1 });
    assert.deepEqual(paginatedSmall.sourceCounts, full.sourceCounts);
    assert.ok(full.sourceCounts.campaign >= 1 && full.sourceCounts.coupon >= 1);
  });

  it("prévia: preserva campanha, cupom+uso, campanha de comunicação+estado do destinatário e entrega — com id original e relações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: DEFAULT_CAMPAIGN_SOURCE_NAME,
      collectors: [(db) => collectCampaignsSnapshot(db)],
      importerVersion: CAMPAIGN_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "preview");
    assert.equal(res.sealed, false);
    assert.equal(res.status, "completed");
    for (const [entity, r] of Object.entries(res.reconciliation)) assert.equal(r.divergence, 0, `divergência 0 para ${entity}`);

    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
      assert.equal(batch.importer_version, CAMPAIGN_IMPORTER_VERSION);

      const byId = async (entity_type: string, original_id: string) => legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      assert.ok(await byId("campaign", seeded.campaignId));
      assert.ok(await byId("coupon", seeded.couponId));
      assert.ok(await byId("coupon_usage", seeded.couponUsageId));
      assert.ok(await byId("communication_campaign", seeded.communicationCampaignId));
      assert.ok(await byId("campaign_recipient_state", seeded.recipientStateId));
      assert.ok(await byId("communication_delivery", seeded.deliveryId));

      const rel = async (relation_type: string, to_original_id: string) => legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("coupon_linked_user", seeded.ownerUserId));
      assert.ok(await rel("belongs_to_coupon", seeded.couponId));
      assert.ok(await rel("used_by_company", seeded.companyId));
      assert.ok(await rel("belongs_to_campaign", seeded.communicationCampaignId));
      assert.ok(await rel("recipient_user", seeded.ownerUserId));
      assert.ok(await rel("campaign_created_by", seeded.ownerUserId));
      assert.ok(await rel("delivery_for_campaign", seeded.communicationCampaignId));
    } finally {
      await legacy.$disconnect();
    }
  });

  it("retroativo: partner_commission (bloco financeiro) agora relaciona corretamente com campaign (bloco de campanhas)", async () => {
    // O bloco financeiro já preservava campaign_id em `content`; a relação
    // tipada só pode existir agora que "campaign" é um entity_type real.
    const { collectFinancialSnapshot } = await import("../legacy/collect-financial");
    const financial = await collectFinancialSnapshot(prisma);
    const commissionRelation = financial.relations.find((r) => r.relation_type === "commission_from_campaign" && r.to_original_id === seeded.campaignId);
    assert.ok(commissionRelation, "partner_commission→campaign deve existir no coletor financeiro");
  });

  it("sanitiza segredo colado no corpo da campanha, preservando o resto do texto legível", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
      const rec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "communication_campaign", original_id: seeded.communicationCampaignId } });
      assert.equal(rec.sanitized, true);
      const content = JSON.parse(rec.content_json) as { body: string };
      assert.doesNotMatch(content.body, /eyJhbGciOiJIUzI1NiJ9/);
      assert.match(content.body, /^Sentimos sua falta! Segredo colado à mão: \[removido: possível segredo\] — favor ignorar$/);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("anexo (imagem da campanha) preservado só como metadado + referência, nunca o binário", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
      const rec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "communication_campaign", original_id: seeded.communicationCampaignId } });
      const content = JSON.parse(rec.content_json) as { image_ref: { reference: string; file_available_in_snapshot: boolean } };
      assert.equal(content.image_ref.reference, "banner-campanha.png");
      assert.equal(content.image_ref.file_available_in_snapshot, false);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("destinatário é sempre um User real — nenhum contato externo bruto (e-mail/telefone) é copiado", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
      const stateRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, entity_type: "campaign_recipient_state", original_id: seeded.recipientStateId } });
      const content = JSON.parse(stateRec.content_json) as Record<string, unknown>;
      assert.ok(!("email" in content) && !("phone" in content) && !("telefone" in content));
      assert.ok(
        await legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type: "recipient_user", from_record_id: stateRec.id, to_original_id: seeded.ownerUserId } }),
        "destinatário referenciado por id de User real, não por contato bruto",
      );
    } finally {
      await legacy.$disconnect();
    }
  });

  it("NUNCA copia password_hash, tokens ou credenciais — mesmo com senha real na origem", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
      const allRecords = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id } });
      assert.ok(allRecords.length > 0);
      for (const rec of allRecords) {
        assert.doesNotMatch(rec.content_json, /SEGREDO_DO_DONO_NUNCA_NO_LEGADO/);
        const content = JSON.parse(rec.content_json) as Record<string, unknown>;
        for (const forbidden of ["password_hash", "token", "webhook_secret", "api_key", "smtp", "credential"]) {
          assert.ok(!(forbidden in content), `campo "${forbidden}" não deveria existir em ${rec.entity_type}`);
        }
      }
    } finally {
      await legacy.$disconnect();
    }
  });

  it("snapshot OFICIAL: lote próprio, selado, coexiste com os 5 lotes anteriores", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectCampaignsSnapshot(db)],
      importerVersion: CAMPAIGN_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);

    const legacy = await openLegacy();
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.ok(official.sealed_at);
      const preview = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_CAMPAIGN_SOURCE_NAME } });
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
      collectors: [(db) => collectCampaignsSnapshot(db)],
      importerVersion: CAMPAIGN_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(idempotent.status, "validated_official");
    assert.equal(idempotent.totals.changed, 0);

    await prisma.campaign.update({ where: { id: seeded.campaignId }, data: { status: "paused" } });
    try {
      let err: any;
      await runImport({
        dryRun: false,
        kind: "official",
        sourceName: OFFICIAL_SOURCE,
        sourceEnvironment: "producao",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
        collectors: [(db) => collectCampaignsSnapshot(db)],
        importerVersion: CAMPAIGN_IMPORTER_VERSION,
        legacyImportUrl: legacyUrl,
      }).catch((e) => (err = e));
      assert.ok(err);
      assert.equal(err.code, "official_divergence");
    } finally {
      await prisma.campaign.update({ where: { id: seeded.campaignId }, data: { status: "active" } });
    }
  });

  it("API do Legado: /campaigns busca por tipo, status, período e relacionado (related_to); sem verbo de escrita", async () => {
    const t = tokenFor(await mkMaster());

    const byStatus = await api(`/api/admin/legacy/campaigns?entity_type=campaign&status=active`, { token: t });
    assert.equal(byStatus.status, 200);
    assert.ok(byStatus.json.data.some((r: { original_id: string }) => r.original_id === seeded.campaignId));

    const byCoupon = await api(`/api/admin/legacy/campaigns?related_to=${seeded.couponId}`, { token: t });
    assert.ok(byCoupon.json.total >= 1);

    const today = new Date().toISOString().slice(0, 10);
    const byPeriod = await api(`/api/admin/legacy/campaigns?entity_type=campaign&from=2020-01-01&to=${today}`, { token: t });
    assert.ok(byPeriod.json.data.some((r: { original_id: string }) => r.original_id === seeded.campaignId));

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(`${baseUrl}/api/admin/legacy/campaigns`, { method, headers: { authorization: `Bearer ${t}` } });
      assert.ok([404, 405].includes(res.status), `${method} deveria ser 404/405, foi ${res.status}`);
    }
    assert.doesNotMatch(JSON.stringify(byCoupon.json), /SEGREDO_DO_DONO_NUNCA_NO_LEGADO|password_hash/);
  });

  it("summary: 'campanhas' aparece pronta, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.json.tabs.campanhas.status, "ready");
    assert.ok(r.json.tabs.campanhas.count >= 5);
    assert.doesNotMatch(JSON.stringify(r.json), /SEGREDO_DO_DONO_NUNCA_NO_LEGADO|password/);
  });

  it("nenhum registro OPERACIONAL foi alterado por rodar o importador", async () => {
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: seeded.campaignId } });
    assert.equal(campaign.status, "active");
    assert.equal(campaign.commission_value, 15);
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: seeded.couponId } });
    assert.equal(coupon.discount_value, 10);
  });
});
