import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import {
  buildRetentionManifest,
  RETAINED_ACCOUNT_EMAILS,
  RetentionManifestError,
  resolveRetainedAccount,
} from "../lib/cutover/retention-manifest";
import { buildDomainPlan, DomainPlanDb } from "../lib/cutover/domain-plan";
import { attachReadOnlyGuard, CutoverReadOnlyViolation, PrismaLikeClient } from "../lib/cutover/read-only-guard";
import { getForeignKeyDependencies } from "../lib/cutover/dependency-graph";

// Simulador de virada limpa — manifesto de retenção + plano de domínios.
// Prova, contra um banco de teste descartável de verdade (não um mock),
// que: as 4 contas são resolvidas por e-mail, uma conta ausente/ambígua
// falha sem escrever nada, o plano classifica sem alterar nada, catalog2 é
// preservado, e os domínios ainda não cobertos pelo Legacy aparecem como
// bloqueadores. run-db-tests.ts cuida do banco descartável (cria, aplica
// `db push`, roda este arquivo, sempre dropa no final).

function id(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

async function seedRetainedAccounts() {
  const adminProfile = await prisma.adminProfile.create({
    data: { id: id("ap"), name: "Master", is_master: true, is_active: true },
  });

  const cp = await prisma.user.create({
    data: {
      id: id("u-cp"),
      email: "cp@lamego.com.vc",
      password_hash: "x",
      name: "Vinicius Guardia",
      role: "admin",
      account_type: "admin",
      status: "ativo",
      is_active: true,
      admin_profile_id: adminProfile.id,
    },
  });

  // Agency.owner_user_id -> User e User.agency_id -> Agency formam um ciclo de
  // FK: cria o usuário primeiro (sem agency_id), cria a agência apontando pra
  // ele, depois liga o usuário à própria agência (mesmo padrão de dono+membro
  // usado pelos fluxos reais de cadastro de agência).
  const gabrielUserId = id("u-gabriel");
  await prisma.user.create({
    data: {
      id: gabrielUserId,
      email: "gabriel@lamego.com.vc",
      password_hash: "x",
      name: "Gabriel Franco",
      role: "agency_admin",
      account_type: "agencias",
      status: "ativo",
      is_active: true,
    },
  });
  const gabrielAgency = await prisma.agency.create({
    data: { id: id("ag"), name: "Gabriel Franco Agency", owner_user_id: gabrielUserId },
  });
  const gabriel = await prisma.user.update({
    where: { id: gabrielUserId },
    data: { agency_id: gabrielAgency.id },
  });

  const valderioUserId = id("u-valderio");
  await prisma.user.create({
    data: {
      id: valderioUserId,
      email: "valderio@lamego.com.vc",
      password_hash: "x",
      name: "Valdério Santos",
      role: "agency_admin",
      account_type: "agencias",
      status: "ativo",
      is_active: true,
    },
  });
  const valderioAgency = await prisma.agency.create({
    data: { id: id("ag"), name: "Valdério Santos Parcerias", owner_user_id: valderioUserId },
  });
  const valderio = await prisma.user.update({
    where: { id: valderioUserId },
    data: { agency_id: valderioAgency.id },
  });
  const valderioPartnerProfile = await prisma.partnerProfile.create({
    data: { id: id("pp"), agency_id: valderioAgency.id, status: "active" },
  });

  const nomadUserId = id("u-nomad");
  const nomadUser = await prisma.user.create({
    data: {
      id: nomadUserId,
      email: "nomad@allka.com.vc",
      password_hash: "x",
      name: "[TESTE LOCAL] Nômade QA",
      role: "nomad",
      account_type: "nomades",
      status: "ativo",
      is_active: true,
    },
  });
  const nomade = await prisma.nomade.create({
    data: { id: id("nm"), user_id: nomadUserId, name: nomadUser.name, email: "nomad-profile@allka.com.vc" },
  });

  return { adminProfile, cp, gabriel, gabrielAgency, valderio, valderioAgency, valderioPartnerProfile, nomadUser, nomade };
}

async function seedNoise() {
  // Usuário importado (legacy_id preenchido) — deve cair em copiar_legacy.
  await prisma.user.create({
    data: {
      id: id("u-legacy"),
      email: "importado@example.test",
      password_hash: "x",
      name: "Importado da plataforma anterior",
      role: "company_admin",
      account_type: "empresas",
      status: "ativo",
      is_active: true,
      legacy_id: 999001,
    },
  });
  // Usuário nativo, não retido — deve cair em decisao_humana.
  await prisma.user.create({
    data: {
      id: id("u-native"),
      email: "smoke-test@allka.test",
      password_hash: "x",
      name: "Cliente Smoke Test",
      role: "company_admin",
      account_type: "empresas",
      status: "ativo",
      is_active: true,
    },
  });

  // catalog2: 2 produtos reais + 1 marcado [TESTE LOCAL] — devem ser separados.
  await prisma.catalog2Product.create({ data: { id: id("c2p"), slug: id("slug"), internal_name: "Landing Page Essencial" } });
  await prisma.catalog2Product.create({ data: { id: id("c2p"), slug: id("slug"), internal_name: "SEO Mensal" } });
  await prisma.catalog2Product.create({
    data: { id: id("c2p"), slug: id("slug"), internal_name: "[TESTE LOCAL] Produto QA" },
  });
}

// Conta a quantidade de linhas de TODAS as tabelas do schema atual — usado
// para provar que a simulação não grava nada (antes/depois idênticos).
async function snapshotAllTableCounts(): Promise<Record<string, number>> {
  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
  );
  const counts: Record<string, number> = {};
  for (const { table_name } of tables) {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      `SELECT COUNT(*) AS c FROM \`${table_name}\``,
    );
    counts[table_name] = Number(rows[0].c);
  }
  return counts;
}

describe("Simulador de virada limpa — manifesto de retenção + plano de domínios", () => {
  let fixtures: Awaited<ReturnType<typeof seedRetainedAccounts>>;

  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    fixtures = await seedRetainedAccounts();
    await seedNoise();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe("resolução das 4 contas por e-mail", () => {
    it("resolves all four RETAINED_ACCOUNT_EMAILS successfully", async () => {
      const manifest = await buildRetentionManifest(prisma);
      assert.equal(manifest.length, 4);
      assert.deepEqual(
        manifest.map((m) => m.email),
        [...RETAINED_ACCOUNT_EMAILS],
      );
    });

    it("resolves cp@lamego.com.vc as admin with its admin profile", async () => {
      const entry = await resolveRetainedAccount(prisma, "cp@lamego.com.vc");
      assert.equal(entry.user_id, fixtures.cp.id);
      assert.equal(entry.role, "admin");
      assert.ok(entry.minimal_required_records.some((r) => r.includes("admin_profiles")));
    });

    it("resolves gabriel@lamego.com.vc as the owner of Gabriel Franco Agency", async () => {
      const entry = await resolveRetainedAccount(prisma, "gabriel@lamego.com.vc");
      assert.equal(entry.linked_agency_id, fixtures.gabrielAgency.id);
      assert.ok(entry.minimal_required_records.some((r) => r.includes("Gabriel Franco Agency") && r.includes("dono")));
    });

    it("resolves valderio@lamego.com.vc with its agency AND partner profile vínculo", async () => {
      const entry = await resolveRetainedAccount(prisma, "valderio@lamego.com.vc");
      assert.equal(entry.linked_agency_id, fixtures.valderioAgency.id);
      assert.ok(entry.minimal_required_records.some((r) => r.includes("partner_profiles")));
    });

    it("resolves nomad@allka.com.vc with its Nomade profile, without any business-data fields", async () => {
      const entry = await resolveRetainedAccount(prisma, "nomad@allka.com.vc");
      assert.equal(entry.linked_nomade_id, fixtures.nomade.id);
      const serialized = JSON.stringify(entry);
      assert.doesNotMatch(serialized, /wallet|qualifica|habilidade|password/i);
    });
  });

  describe("falhas claras, sem escrita", () => {
    it("fails clearly for a non-existent account, without creating or deleting anything", async () => {
      const before = await snapshotAllTableCounts();
      await assert.rejects(
        () => resolveRetainedAccount(prisma, "nao-existe-de-verdade@lamego.com.vc"),
        (err: unknown) => err instanceof RetentionManifestError && /nao-existe-de-verdade@lamego\.com\.vc/.test(err.message),
      );
      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before);
    });

    it("fails clearly for an ambiguous account (company_id AND agency_id both set)", async () => {
      const company = await prisma.company.create({ data: { id: id("co"), name: "Empresa Ambígua" } });
      const agencyOwnerId = id("u-agency-owner");
      await prisma.user.create({
        data: {
          id: agencyOwnerId,
          email: `${agencyOwnerId}@example.test`,
          password_hash: "x",
          name: "Dono da Agência Ambígua",
          role: "agency_admin",
          account_type: "agencias",
          status: "ativo",
          is_active: true,
        },
      });
      const agency = await prisma.agency.create({
        data: { id: id("ag"), name: "Agência Ambígua", owner_user_id: agencyOwnerId },
      });
      const ambiguousUser = await prisma.user.create({
        data: {
          id: id("u-ambiguous"),
          email: "ambigua@lamego.com.vc",
          password_hash: "x",
          name: "Ambígua",
          role: "company_admin",
          account_type: "empresas",
          status: "ativo",
          is_active: true,
          company_id: company.id,
          agency_id: agency.id,
        },
      });
      void ambiguousUser;

      const before = await snapshotAllTableCounts();
      await assert.rejects(() => resolveRetainedAccount(prisma, "ambigua@lamego.com.vc"), /ambíguo/i);
      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before);
    });
  });

  describe("plano de domínios", () => {
    it("classifies data into buckets without modifying any record", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set(manifest.map((m) => m.linked_agency_id).filter((v): v is string => !!v)),
        companyIds: new Set(manifest.map((m) => m.linked_company_id).filter((v): v is string => !!v)),
        nomadeIds: new Set(manifest.map((m) => m.linked_nomade_id).filter((v): v is string => !!v)),
      };

      const before = await snapshotAllTableCounts();
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before, "buildDomainPlan must not change any row");

      const userRows = plan.rows.filter((r) => r.domain === "usuarios");
      const retidos = userRows.find((r) => r.table.includes("retidos)"));
      const importados = userRows.find((r) => r.table.includes("importados"));
      const nativos = userRows.find((r) => r.table.includes("nativos"));
      assert.equal(retidos?.count, 4);
      assert.equal(retidos?.bucket, "preservar");
      assert.ok((importados?.count ?? 0) >= 1, "the legacy_id-tagged noise user must be counted");
      assert.equal(importados?.bucket, "copiar_legacy");
      assert.ok((nativos?.count ?? 0) >= 1, "the native non-retained noise user must be counted");
      assert.equal(nativos?.bucket, "decisao_humana");
    });

    it("marks catalog2 for preservation and separates the [TESTE LOCAL] product from the real ones", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set<string>(),
        companyIds: new Set<string>(),
        nomadeIds: new Set<string>(),
      };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      assert.equal(plan.catalog2.bucket, "preservar");
      assert.equal(plan.catalog2.real_products, 2);
      assert.equal(plan.catalog2.test_local_products, 1);

      const catalog2Rows = plan.rows.filter((r) => r.domain === "catalog2");
      assert.ok(catalog2Rows.every((r) => r.bucket === "preservar" || r.table.includes("TESTE LOCAL")));
      const testLocalRow = catalog2Rows.find((r) => r.table.includes("TESTE LOCAL"));
      assert.equal(testLocalRow?.bucket, "decisao_humana");
    });

    it("lists domains not yet covered by Legacy as blockers", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set<string>(),
        companyIds: new Set<string>(),
        nomadeIds: new Set<string>(),
      };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      for (const expectedGap of ["projetos", "tarefas_etapas", "financeiro", "alertas", "notificacoes", "chat", "campanhas"]) {
        assert.ok(plan.legacy_gaps.includes(expectedGap), `expected "${expectedGap}" to be a Legacy gap`);
      }
      // Structural/config domain must never be a blocker.
      assert.ok(!plan.legacy_gaps.includes("configuracoes"));
    });
  });

  describe("garantia de somente leitura", () => {
    it("proves, against the real (disposable) test database, that no table gains/loses rows across the whole simulation", async () => {
      const before = await snapshotAllTableCounts();

      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set(manifest.map((m) => m.linked_agency_id).filter((v): v is string => !!v)),
        companyIds: new Set(manifest.map((m) => m.linked_company_id).filter((v): v is string => !!v)),
        nomadeIds: new Set(manifest.map((m) => m.linked_nomade_id).filter((v): v is string => !!v)),
      };
      await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      await getForeignKeyDependencies(prisma);

      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before, "no INSERT/UPDATE/DELETE happened anywhere in the schema");
    });

    it("blocks a write attempt on the guarded client before it reaches the database", async () => {
      // A dedicated PrismaClient instance so the guard doesn't leak into the
      // shared `prisma` singleton used by the rest of this test file.
      const { PrismaClient } = await import("@prisma/client");
      const guarded = new PrismaClient();
      attachReadOnlyGuard(guarded as unknown as PrismaLikeClient);
      try {
        const before = await snapshotAllTableCounts();
        await assert.rejects(
          () =>
            guarded.user.create({
              data: {
                id: id("u-blocked"),
                email: "blocked@example.test",
                password_hash: "x",
                name: "Should never be created",
                role: "company_user",
                account_type: "empresas",
              },
            }),
          CutoverReadOnlyViolation,
        );
        const after = await snapshotAllTableCounts();
        assert.deepEqual(after, before);
      } finally {
        await guarded.$disconnect();
      }
    });
  });
});
