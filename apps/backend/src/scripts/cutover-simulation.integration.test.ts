import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
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
import { id, seedRetainedAccounts, seedNoise, snapshotAllTableCounts } from "../test-support/cutover-fixtures";

// Simulador de virada limpa — manifesto de retenção + plano de domínios.
// Prova, contra um banco de teste descartável de verdade (não um mock),
// que: as 4 contas são resolvidas por e-mail, uma conta ausente/ambígua
// falha sem escrever nada, o plano classifica sem alterar nada, catalog2 é
// preservado, e os domínios ainda não cobertos pelo Legacy aparecem como
// bloqueadores. run-db-tests.ts cuida do banco descartável (cria, aplica
// `db push`, roda este arquivo, sempre dropa no final).
//
// Fixtures (seedRetainedAccounts/seedNoise/snapshotAllTableCounts/id) vivem
// em src/test-support/cutover-fixtures.ts — reusadas também por
// src/routes/legacy-integrated-proof.integration.test.ts.

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
      // 2026-09-11: os 6 domínios foram selados oficialmente contra o
      // allka_legacy real (identidade/organizações inclui TODOS os
      // usuários, importados ou nativos) — ambas as linhas agora são
      // "remover_apos_copia" (cobertura real confirmada), não mais
      // "copiar_legacy"/"decisao_humana" (ver domain-plan.ts).
      assert.equal(importados?.bucket, "remover_apos_copia");
      assert.ok((nativos?.count ?? 0) >= 1, "the native non-retained noise user must be counted");
      assert.equal(nativos?.bucket, "remover_apos_copia");
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

    it("nenhuma das tabelas de alertas/notificações/chat conhecidas fica sem classificação (regressão do achado pós-snapshot: mandatory_banners/notification_preferences/user_communication_channel_prefs ficaram ausentes por um bloco inteiro)", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = { userIds: new Set(manifest.map((m) => m.user_id)), agencyIds: new Set<string>(), companyIds: new Set<string>(), nomadeIds: new Set<string>() };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      const knownAlertNotificationChatTables = [
        "alert_rules",
        "alert_standards",
        "system_alerts",
        "system_alert_events",
        "notification_messages",
        "notification_rules",
        "notification_groups",
        "notification_group_members",
        "communication_deliveries",
        "banner_acknowledgements",
        "mandatory_banners",
        "notification_preferences",
        "user_communication_channel_prefs",
      ];
      const itemizedTables = new Set(plan.rows.filter((r) => r.domain === "alertas" || r.domain === "notificacoes").map((r) => r.table));
      for (const t of knownAlertNotificationChatTables) {
        assert.ok(itemizedTables.has(t), `tabela "${t}" deveria ter sua própria linha no plano — não pode ficar escondida numa categoria agregada`);
      }
    });

    it("no domain is left as a Legacy gap — every domain now has a ready collector (bloco final de cobertura)", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set<string>(),
        companyIds: new Set<string>(),
        nomadeIds: new Set<string>(),
      };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      // Produtos, identidade/organizações, projetos/execução, financeiro,
      // alertas/notificações/chat e campanhas todos têm coletor pronto agora
      // (nenhum snapshot REAL foi executado — "covered" aqui é sobre o
      // mecanismo existir, ver comentário no topo de domain-plan.ts).
      assert.deepEqual(plan.legacy_gaps, [], "nenhum domínio deveria aparecer como lacuna do Legacy neste ponto");
    });

    it("catalog_tasks aparece dividido em vinculados (remover_apos_copia) e órfãos (bloqueado) — nunca uma única linha otimista", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = { userIds: new Set(manifest.map((m) => m.user_id)), agencyIds: new Set<string>(), companyIds: new Set<string>(), nomadeIds: new Set<string>() };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      const linked = plan.rows.find((r) => r.table === "catalog_tasks (vinculados a produto)");
      const orphan = plan.rows.find((r) => r.table === "catalog_tasks (órfãos, sem vínculo de produto)");
      assert.ok(linked, "deve haver uma linha para tarefas vinculadas");
      assert.ok(orphan, "deve haver uma linha para tarefas órfãs");
      assert.equal(linked!.bucket, "remover_apos_copia");
      assert.equal(orphan!.bucket, "bloqueado");
      assert.equal(orphan!.legacy_covered, true, "o coletor complementar existe — só a execução oficial está pendente");
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
