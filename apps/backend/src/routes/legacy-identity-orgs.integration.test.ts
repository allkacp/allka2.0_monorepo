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
import {
  collectIdentityOrgSnapshot,
  DEFAULT_IDENTITY_SOURCE_NAME,
  IDENTITY_ORG_IMPORTER_VERSION,
  runImport,
} from "../legacy/importer";

// Extensão do Legado para IDENTIDADE HISTÓRICA e ORGANIZAÇÕES (bloco
// seguinte ao manifesto de retenção / simulador de virada).
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - usuário, perfil admin, empresa, agência, parceiro e nômade são
//    preservados com id original, e as relações (dono/membro/perfil) batem;
//  - NENHUM segredo (senha, hash, token, sessão) é copiado — nem sequer
//    coletado — mesmo quando o registro de origem os possui;
//  - o lote de identidade/organizações É INDEPENDENTE do lote de produtos
//    (preview e oficial coexistem, sem interferir no domínio de produtos);
//  - o lote oficial selado é idempotente (reexecução não regrava);
//  - a API de Consulta do Legado expõe os novos grupos (summary.tabs.contas,
//    /identities, /records/:id) sem vazar dado sensível.
//
// Nenhuma migration ou importação toca banco real: o banco legado é criado e
// destruído aqui; o operacional é o TEST_DATABASE_URL descartável.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-10T00:00:00.000Z");
const OFFICIAL_SOURCE = "Identidade e Organizações — Allka (teste descartável)";

const userIds: string[] = [];
const adminProfileIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const partnerProfileIds: string[] = [];
const nomadeIds: string[] = [];

const seeded = {
  adminProfileId: "",
  adminUserId: "",
  adminUserEmail: "",
  agencyOwnerUserId: "",
  agencyId: "",
  partnerProfileId: "",
  companyId: "",
  nomadeUserId: "",
  nomadeId: "",
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
  const id = `legid-tok-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegId ${id}`, is_master: true, is_active: true } });
  adminProfileIds.push(p.id);
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: "admin",
      account_type: "admin",
      is_active: true,
      status: "ativo",
      admin_profile_id: p.id,
    },
  });
  userIds.push(u.id);
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

describe("Legado — snapshot de identidade histórica e organizações", () => {
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

    // ── Dados mínimos: admin+perfil, agência (dono+membro), parceiro,
    //    empresa (dona), nômade (com perfil de usuário) ──────────────────
    const adminProfile = await prisma.adminProfile.create({
      data: { name: `Perfil Master ${crypto.randomBytes(3).toString("hex")}`, is_master: true, is_active: true },
    });
    adminProfileIds.push(adminProfile.id);
    seeded.adminProfileId = adminProfile.id;

    const adminUserEmail = `admin-${crypto.randomBytes(3).toString("hex")}@lamego.example.test`;
    const adminUser = await prisma.user.create({
      data: {
        id: `legid-admin-${crypto.randomBytes(4).toString("hex")}`,
        email: adminUserEmail,
        password_hash: "SEGREDO_NUNCA_DEVE_APARECER_NO_LEGADO",
        name: "Admin Histórico de Teste",
        role: "admin",
        account_type: "admin",
        status: "ativo",
        is_active: true,
        admin_profile_id: adminProfile.id,
      },
    });
    userIds.push(adminUser.id);
    seeded.adminUserId = adminUser.id;
    seeded.adminUserEmail = adminUserEmail;

    // Agência: usuário dono primeiro (FK cíclica), depois a agência, depois
    // liga o usuário à própria agência (dono == membro, caso mais comum).
    const agencyOwnerId = `legid-agowner-${crypto.randomBytes(4).toString("hex")}`;
    await prisma.user.create({
      data: {
        id: agencyOwnerId,
        email: `agowner-${crypto.randomBytes(3).toString("hex")}@lamego.example.test`,
        password_hash: "OUTRO_SEGREDO_QUE_NUNCA_DEVE_VAZAR",
        name: "Dono de Agência de Teste",
        role: "agency_admin",
        account_type: "agencias",
        status: "ativo",
        is_active: true,
      },
    });
    userIds.push(agencyOwnerId);
    seeded.agencyOwnerUserId = agencyOwnerId;

    const agency = await prisma.agency.create({
      data: { name: "Agência Histórica de Teste", owner_user_id: agencyOwnerId, status: "ativo", partner_level: "gold" },
    });
    agencyIds.push(agency.id);
    seeded.agencyId = agency.id;
    await prisma.user.update({ where: { id: agencyOwnerId }, data: { agency_id: agency.id } });

    const partnerProfile = await prisma.partnerProfile.create({
      data: { agency_id: agency.id, status: "active", referral_code: `REF-${crypto.randomBytes(2).toString("hex")}` },
    });
    partnerProfileIds.push(partnerProfile.id);
    seeded.partnerProfileId = partnerProfile.id;

    const company = await prisma.company.create({
      data: { name: "Empresa Histórica de Teste", status: "ativo", type: "empresa", cnpj: `${crypto.randomBytes(6).toString("hex")}` },
    });
    companyIds.push(company.id);
    seeded.companyId = company.id;

    const nomadeUserId = `legid-nomad-${crypto.randomBytes(4).toString("hex")}`;
    await prisma.user.create({
      data: {
        id: nomadeUserId,
        email: `nomad-${crypto.randomBytes(3).toString("hex")}@allka.example.test`,
        password_hash: "SEGREDO_DO_NOMADE_JAMAIS_NO_LEGADO",
        name: "Nômade Histórico de Teste",
        role: "nomad",
        account_type: "nomades",
        status: "ativo",
        is_active: true,
      },
    });
    userIds.push(nomadeUserId);
    seeded.nomadeUserId = nomadeUserId;

    const nomade = await prisma.nomade.create({
      data: { user_id: nomadeUserId, name: "Nômade Histórico de Teste", email: `nomade-perfil-${crypto.randomBytes(3).toString("hex")}@allka.example.test` },
    });
    nomadeIds.push(nomade.id);
    seeded.nomadeId = nomade.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.partnerProfile.deleteMany({ where: { id: { in: partnerProfileIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
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

  it("prévia: preserva usuário, perfil admin, agência, parceiro, empresa e nômade — com id original e relações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: DEFAULT_IDENTITY_SOURCE_NAME,
      collectors: [collectIdentityOrgSnapshot],
      importerVersion: IDENTITY_ORG_IMPORTER_VERSION,
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
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: DEFAULT_IDENTITY_SOURCE_NAME },
      });
      assert.equal(batch.importer_version, IDENTITY_ORG_IMPORTER_VERSION);

      const byId = async (entity_type: string, original_id: string) =>
        legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      const adminRec = await byId("admin_profile", seeded.adminProfileId);
      assert.ok(adminRec, "perfil administrativo preservado com id original");

      const userRec = await byId("user", seeded.adminUserId);
      assert.ok(userRec, "usuário admin preservado com id original");
      assert.equal(userRec!.title, "Admin Histórico de Teste");

      const agencyRec = await byId("agency", seeded.agencyId);
      assert.ok(agencyRec, "agência preservada com id original");

      const partnerRec = await byId("partner_profile", seeded.partnerProfileId);
      assert.ok(partnerRec, "perfil de parceiro preservado com id original");

      const companyRec = await byId("company", seeded.companyId);
      assert.ok(companyRec, "empresa preservada com id original");

      const nomadeRec = await byId("nomade", seeded.nomadeId);
      assert.ok(nomadeRec, "nômade preservado com id original");

      // Relações auditáveis: usuário↔perfil admin, agência↔dono,
      // agência↔parceiro, nômade↔perfil de usuário.
      const rel = async (relation_type: string, to_original_id: string) =>
        legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("has_admin_profile", seeded.adminProfileId), "relação usuário→perfil admin");
      assert.ok(await rel("owned_by_user", seeded.agencyOwnerUserId), "relação agência→dono");
      assert.ok(await rel("member_of_agency", seeded.agencyId), "relação usuário→agência (membro)");
      assert.ok(await rel("has_partner_profile", seeded.partnerProfileId), "relação agência→perfil de parceiro");
      assert.ok(await rel("profile_of_user", seeded.nomadeUserId), "relação nômade→usuário");
    } finally {
      await legacy.$disconnect();
    }
  });

  it("NUNCA copia senha/hash/token/sessão — mesmo quando a origem os possui", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: DEFAULT_IDENTITY_SOURCE_NAME },
      });
      const userRecords = await legacy.legacyRecordSnapshot.findMany({
        where: { batch_id: batch.id, entity_type: "user" },
      });
      assert.ok(userRecords.length >= 3, "usuários de teste presentes no lote");

      for (const rec of userRecords) {
        const raw = rec.content_json;
        // Nem por engano: nenhuma senha semeada aparece em lugar nenhum do
        // conteúdo gravado, e nenhum campo de credencial/sessão/token existe.
        assert.doesNotMatch(raw, /SEGREDO|password_hash|password|token|session|sessao|mfa|otp|recovery|secret|segredo/i);
        const content = JSON.parse(raw) as Record<string, unknown>;
        for (const forbidden of [
          "password_hash",
          "password",
          "username",
          "must_set_password",
          "password_setup_token",
          "password_setup_expires_at",
          "token",
          "session",
          "ip_address",
        ]) {
          assert.ok(!(forbidden in content), `campo "${forbidden}" não deveria existir no conteúdo histórico`);
        }
      }

      // Confere também que nenhum registro do lote inteiro (qualquer
      // entidade) carrega as senhas literais que semeamos.
      const allRecords = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id } });
      for (const rec of allRecords) {
        assert.doesNotMatch(rec.content_json, /SEGREDO_NUNCA_DEVE_APARECER_NO_LEGADO|OUTRO_SEGREDO_QUE_NUNCA_DEVE_VAZAR|SEGREDO_DO_NOMADE_JAMAIS_NO_LEGADO/);
      }
    } finally {
      await legacy.$disconnect();
    }
  });

  it("execução OFICIAL exige parâmetros explícitos, igual ao domínio de produtos", async () => {
    await assert.rejects(
      () =>
        runImport({
          dryRun: false,
          kind: "official",
          sourceName: OFFICIAL_SOURCE,
          // sourceEnvironment/snapshotAt/acknowledgeOfficial ausentes de propósito.
          collectors: [collectIdentityOrgSnapshot],
          importerVersion: IDENTITY_ORG_IMPORTER_VERSION,
          legacyImportUrl: legacyUrl,
        }),
      (e: any) => e.code === "official_requires_explicit_params",
    );
  });

  it("collectors customizados exigem sourceName explícito (não há padrão genérico entre domínios)", async () => {
    await assert.rejects(
      () =>
        runImport({
          dryRun: false,
          kind: "preview",
          collectors: [collectIdentityOrgSnapshot],
          legacyImportUrl: legacyUrl,
        }),
      (e: any) => e.code === "custom_collectors_require_source_name",
    );
  });

  it("snapshot OFICIAL de identidade/organizações: lote próprio, selado, e NÃO interfere no lote de produtos", async () => {
    // Cria também um lote de produtos (vazio, mas um lote de verdade) para
    // provar que os dois domínios coexistem sem colisão de nome/lote.
    await runImport({ dryRun: false, kind: "preview", legacyImportUrl: legacyUrl });

    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [collectIdentityOrgSnapshot],
      importerVersion: IDENTITY_ORG_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);
    assert.equal(res.status, "completed");

    const legacy = await openLegacy();
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "official", source_name: OFFICIAL_SOURCE },
      });
      assert.ok(official.sealed_at, "lote oficial de identidade/organizações selado");
      assert.equal(official.importer_version, IDENTITY_ORG_IMPORTER_VERSION);

      const productsPreview = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: { not: DEFAULT_IDENTITY_SOURCE_NAME } },
      });
      assert.ok(productsPreview.id !== official.id, "lote de produtos é um lote DIFERENTE do de identidade/organizações");

      const totalBatches = await legacy.legacyImportBatch.count();
      assert.ok(totalBatches >= 3, "prévia de identidade + prévia de produtos + oficial de identidade coexistem");
    } finally {
      await legacy.$disconnect();
    }
  });

  it("oficial selado: reexecução é idempotente (valida, não regrava, não sela de novo)", async () => {
    const legacy = await openLegacy();
    let recordsBefore = 0;
    let sealedAtBefore = "";
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      recordsBefore = await legacy.legacyRecordSnapshot.count({ where: { batch_id: official.id } });
      sealedAtBefore = official.sealed_at!.toISOString();
    } finally {
      await legacy.$disconnect();
    }

    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [collectIdentityOrgSnapshot],
      importerVersion: IDENTITY_ORG_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.status, "validated_official");
    assert.equal(res.sealed, true);
    assert.equal(res.totals.changed, 0);

    const legacy2 = await openLegacy();
    try {
      const official = await legacy2.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.equal(
        await legacy2.legacyRecordSnapshot.count({ where: { batch_id: official.id } }),
        recordsBefore,
        "nenhum registro novo/duplicado",
      );
      assert.equal(official.sealed_at!.toISOString(), sealedAtBefore, "sealed_at inalterado");
      assert.equal(
        await legacy2.legacyImportBatch.count({ where: { kind: "official", source_name: OFFICIAL_SOURCE } }),
        1,
        "sem lote oficial duplicado",
      );
    } finally {
      await legacy2.$disconnect();
    }
  });

  it("API de Consulta do Legado: summary expõe a aba 'contas' como pronta, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.status, 200);
    assert.equal(r.json.tabs.contas.status, "ready");
    assert.ok(r.json.tabs.contas.count >= 6, "contagem de identidade/organizações exposta");
    assert.doesNotMatch(JSON.stringify(r.json), /SEGREDO|password/i);
  });

  it("API de Consulta do Legado: /identities lista, filtra por entity_type e nunca expõe conteúdo sensível", async () => {
    const t = tokenFor(await mkMaster());

    const all = await api("/api/admin/legacy/identities?page_size=50", { token: t });
    assert.equal(all.status, 200);
    assert.ok(all.json.total >= 6);
    assert.equal(all.json.read_only, true);
    assert.doesNotMatch(JSON.stringify(all.json), /SEGREDO|password_hash/i);

    const onlyUsers = await api("/api/admin/legacy/identities?entity_type=user", { token: t });
    assert.ok(onlyUsers.json.data.every((r: { entity_type: string }) => r.entity_type === "user"));
    assert.ok(onlyUsers.json.data.some((r: { title: string }) => r.title === "Admin Histórico de Teste"));

    const search = await api("/api/admin/legacy/identities?q=Agência+Histórica", { token: t });
    assert.ok(search.json.data.some((r: { title: string }) => r.title === "Agência Histórica de Teste"));
  });

  it("API de Consulta do Legado: /records/:id mostra identidade histórica + relações, sem senha/token", async () => {
    const t = tokenFor(await mkMaster());
    const list = await api("/api/admin/legacy/identities?entity_type=user&q=Admin+Hist%C3%B3rico", { token: t });
    const recordId = list.json.data[0]?.id;
    assert.ok(recordId, "encontra o registro do usuário admin na busca");

    const detail = await api(`/api/admin/legacy/records/${recordId}`, { token: t });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.record.entity_type, "user");
    assert.equal(detail.json.record.content.email, seeded.adminUserEmail);
    assert.ok(detail.json.relations_by_type.has_admin_profile, "relação com o perfil admin exposta no detalhe");
    assert.doesNotMatch(JSON.stringify(detail.json), /SEGREDO|password_hash|password|token|session/i);
  });
});
