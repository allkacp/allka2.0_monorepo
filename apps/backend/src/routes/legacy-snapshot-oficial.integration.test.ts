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
import { runImport } from "../legacy/importer";

// Preparação segura do Snapshot Histórico Oficial (reunião 10/09/2026).
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - a fotografia preserva produto, variação, tarefa+etapas, especialidade,
//    VERSÃO histórica e COMBO (com itens) — cada um com id original e relação;
//  - o lote de PRÉVIA continua legível pela API (is_preview);
//  - o lote OFICIAL é identificável (kind=official) e fica SELADO (imutável);
//  - execução oficial exige parâmetros explícitos;
//  - reexecução do oficial selado é idempotente (valida, não regrava);
//  - qualquer divergência da origem interrompe o oficial com relatório;
//  - o oficial NÃO reclassifica nem apaga o lote de prévia.
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
const OFFICIAL_SOURCE = "Plataforma allka — produção (teste descartável)";

const users: string[] = [];
const adminProfiles: string[] = [];
const productIds: string[] = [];
const bundleIds: string[] = [];
const catalogTaskIds: string[] = [];
const specialtyIds: string[] = [];

const seeded = {
  productId: "",
  variationId: "",
  versionId: "",
  catalogTaskId: "",
  linkId: "",
  specialtyId: "",
  bundleId: "",
  bundleItemId: "",
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
  const id = `legoff-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegOff ${id}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
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
  users.push(u.id);
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

describe("Snapshot Histórico Oficial — preparação segura", () => {
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

    // ── Dados mínimos: produto + variação + tarefa/etapas + especialidade +
    //    versão histórica + combo com item ──────────────────────────────────
    const specialty = await prisma.specialty.create({
      data: { name: `Esp Oficial ${crypto.randomBytes(3).toString("hex")}`, category: "Design", hourly_rate: 120, is_active: true },
    });
    specialtyIds.push(specialty.id);
    seeded.specialtyId = specialty.id;

    const catalogTask = await prisma.catalogTask.create({
      data: {
        code: `ct_off_${crypto.randomBytes(3).toString("hex")}`,
        name: "Diagramação da identidade",
        category: "Design",
        task_type: "execucao",
        steps: JSON.stringify([
          { title: "Rascunho", order: 1 },
          { title: "Refino", order: 2 },
        ]),
        is_active: true,
      },
    });
    catalogTaskIds.push(catalogTask.id);
    seeded.catalogTaskId = catalogTask.id;

    const product = await prisma.product.create({
      data: {
        name: "Identidade Visual Oficial",
        product_code: `prod_off_${crypto.randomBytes(3).toString("hex")}`,
        category: "Design",
        is_active: true,
        base_price: 2500,
        description: "Produto operacional usado no teste do snapshot oficial",
        short_description: "Identidade visual — teste oficial",
      },
    });
    productIds.push(product.id);
    seeded.productId = product.id;

    const variation = await prisma.productVariation.create({
      data: { product_id: product.id, name: "Completo", price: 3200, deadline_days: 20, is_active: true },
    });
    seeded.variationId = variation.id;

    const link = await prisma.productCatalogTask.create({
      data: { product_id: product.id, catalog_task_id: catalogTask.id, sort_order: 1, is_mandatory: true, phase: "execucao" },
    });
    seeded.linkId = link.id;

    const version = await prisma.productVersion.create({
      data: {
        product_id: product.id,
        snapshot: JSON.stringify({ name: "Identidade Visual Oficial", base_price: 2200, note: "estado anterior" }),
      },
    });
    seeded.versionId = version.id;

    const bundle = await prisma.productBundle.create({
      data: { name: "Combo Identidade + Social", description: "combo de teste", category: "Design", is_active: true },
    });
    bundleIds.push(bundle.id);
    seeded.bundleId = bundle.id;
    const bundleItem = await prisma.productBundleItem.create({
      data: { bundle_id: bundle.id, product_id: product.id, variation_id: variation.id, sort_order: 1 },
    });
    seeded.bundleItemId = bundleItem.id;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.productBundleItem.deleteMany({ where: { bundle_id: { in: bundleIds } } });
    await prisma.productBundle.deleteMany({ where: { id: { in: bundleIds } } });
    await prisma.productCatalogTask.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.productVersion.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.productVariation.deleteMany({ where: { product_id: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.catalogTask.deleteMany({ where: { id: { in: catalogTaskIds } } });
    await prisma.specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "legacy_consultation." } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
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

  it("prévia: a fotografia preserva versão, combo, variação, tarefa/etapas e especialidade — com id original e relação", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: "[TESTE LOCAL] Fotografia de produtos anteriores",
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
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview" } });

      // Cada entidade preservada pelo id original.
      const byId = async (entity_type: string, original_id: string) =>
        legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      const prodRec = await byId("product", seeded.productId);
      assert.ok(prodRec, "produto preservado com id original");
      assert.ok(await byId("product_variation", seeded.variationId), "variação preservada");
      assert.ok(await byId("product_version", seeded.versionId), "versão histórica preservada");
      assert.ok(await byId("specialty", seeded.specialtyId), "especialidade preservada");
      assert.ok(await byId("product_bundle", seeded.bundleId), "combo preservado");
      assert.ok(await byId("product_bundle_item", seeded.bundleItemId), "item do combo preservado");

      const ctRec = await byId("catalog_task", seeded.catalogTaskId);
      assert.ok(ctRec, "tarefa de catálogo preservada");
      const ctContent = JSON.parse(ctRec!.content_json);
      assert.ok(Array.isArray(ctContent.steps) && ctContent.steps.length === 2, "etapas da tarefa preservadas no JSON");

      const versionContent = JSON.parse((await byId("product_version", seeded.versionId))!.content_json);
      assert.equal(versionContent.snapshot.note, "estado anterior", "conteúdo da versão preservado");

      // Relações: produto→versão, produto→variação, produto→tarefa,
      // combo→item, item→produto.
      const rel = async (relation_type: string, to_original_id: string) =>
        legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("has_version", seeded.versionId), "relação has_version");
      assert.ok(await rel("has_variation", seeded.variationId), "relação has_variation");
      assert.ok(await rel("has_catalog_task", seeded.catalogTaskId), "relação has_catalog_task");
      assert.ok(await rel("has_bundle_item", seeded.bundleItemId), "relação has_bundle_item");
      assert.ok(await rel("bundle_contains_product", seeded.productId), "relação bundle_contains_product");
    } finally {
      await legacy.$disconnect();
    }
  });

  it("prévia continua legível pela API e o lote fica identificado como preview", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.status, 200);
    assert.equal(r.json.batch.kind, "preview");
    assert.equal(r.json.batch.is_preview, true);
    assert.equal(r.json.batch.is_official, false);
    assert.equal(r.json.batch.sealed_at, null);
    assert.ok((r.json.counts.product_version ?? 0) >= 1, "contagem de versões históricas exposta");
    assert.ok((r.json.counts.product_bundle ?? 0) >= 1, "contagem de combos exposta");
  });

  it("execução OFICIAL exige parâmetros explícitos (nome real, ambiente ≠ local, data, confirmação)", async () => {
    await assert.rejects(
      () => runImport({ dryRun: false, kind: "official", legacyImportUrl: legacyUrl }),
      (e: any) => e.code === "official_requires_explicit_params",
    );
    await assert.rejects(
      () =>
        runImport({
          dryRun: false,
          kind: "official",
          sourceName: "[TESTE LOCAL] não pode",
          sourceEnvironment: "producao",
          snapshotAt: OFFICIAL_SNAPSHOT_AT,
          acknowledgeOfficial: true,
          legacyImportUrl: legacyUrl,
        }),
      (e: any) => e.code === "official_requires_explicit_params",
    );
    await assert.rejects(
      () =>
        runImport({
          dryRun: false,
          kind: "official",
          sourceName: OFFICIAL_SOURCE,
          sourceEnvironment: "producao",
          snapshotAt: OFFICIAL_SNAPSHOT_AT,
          // sem acknowledgeOfficial
          legacyImportUrl: legacyUrl,
        }),
      (e: any) => e.code === "official_requires_explicit_params",
    );
  });

  it("snapshot OFICIAL: cria lote próprio, coerente, SELADO — e não toca no lote de prévia", async () => {
    const legacy = await openLegacy();
    let previewBatchId = "";
    try {
      previewBatchId = (await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview" } })).id;
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
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);
    assert.equal(res.status, "completed");
    for (const [entity, r] of Object.entries(res.reconciliation)) {
      assert.equal(r.divergence, 0, `divergência 0 para ${entity}`);
    }

    const legacy2 = await openLegacy();
    try {
      const official = await legacy2.legacyImportBatch.findFirstOrThrow({ where: { kind: "official" } });
      assert.ok(official.sealed_at, "lote oficial selado");
      assert.equal(official.source_name, OFFICIAL_SOURCE);
      assert.equal(official.source_environment, "producao");
      assert.equal(official.snapshot_at.toISOString(), OFFICIAL_SNAPSHOT_AT.toISOString());

      const preview = await legacy2.legacyImportBatch.findUniqueOrThrow({ where: { id: previewBatchId } });
      assert.equal(preview.kind, "preview", "prévia NÃO reclassificada");
      assert.equal(preview.sealed_at, null);
      assert.ok(
        (await legacy2.legacyRecordSnapshot.count({ where: { batch_id: previewBatchId } })) > 0,
        "registros da prévia intactos",
      );
      assert.ok(await legacy2.legacyImportBatch.count() >= 2, "prévia e oficial coexistem");
    } finally {
      await legacy2.$disconnect();
    }

    // API mostra o mais recente (oficial) como histórico oficial.
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.json.batch.kind, "official");
    assert.equal(r.json.batch.is_official, true);
    assert.ok(r.json.batch.sealed_at, "API expõe sealed_at do oficial");
  });

  it("oficial selado: reexecução é idempotente (valida, não regrava, não sela de novo)", async () => {
    const legacy = await openLegacy();
    let recordsBefore = 0;
    let sealedAtBefore = "";
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official" } });
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
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.status, "validated_official");
    assert.equal(res.sealed, true);
    assert.equal(res.totals.changed, 0);

    const legacy2 = await openLegacy();
    try {
      const official = await legacy2.legacyImportBatch.findFirstOrThrow({ where: { kind: "official" } });
      assert.equal(
        await legacy2.legacyRecordSnapshot.count({ where: { batch_id: official.id } }),
        recordsBefore,
        "nenhum registro novo/duplicado",
      );
      assert.equal(official.sealed_at!.toISOString(), sealedAtBefore, "sealed_at inalterado");
      assert.equal(await legacy2.legacyImportBatch.count({ where: { kind: "official" } }), 1, "sem lote oficial duplicado");
    } finally {
      await legacy2.$disconnect();
    }
  });

  it("oficial selado: divergência da origem INTERROMPE com relatório e não grava nada", async () => {
    // Altera a origem — o produto operacional muda de nome.
    await prisma.product.update({ where: { id: seeded.productId }, data: { name: "Identidade Visual Oficial (ALTERADA)" } });
    try {
      let err: any;
      await runImport({
        dryRun: false,
        kind: "official",
        sourceName: OFFICIAL_SOURCE,
        sourceEnvironment: "producao",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
        legacyImportUrl: legacyUrl,
      }).catch((e) => {
        err = e;
      });
      assert.ok(err, "reexecução divergente lança erro");
      assert.equal(err.code, "official_divergence");
      assert.ok(Array.isArray(err.divergences) && err.divergences.length >= 1, "erro carrega divergências");

      const legacy = await openLegacy();
      try {
        const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official" } });
        const prodRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({
          where: { batch_id: official.id, entity_type: "product", original_id: seeded.productId },
        });
        assert.equal(prodRec.title, "Identidade Visual Oficial", "registro selado NÃO foi sobrescrito");
        assert.equal(official.status, "completed", "lote oficial continua concluído e íntegro");
        assert.ok(official.sealed_at, "lote oficial continua selado");
      } finally {
        await legacy.$disconnect();
      }
    } finally {
      // Restaura a origem para não afetar limpeza/outros arquivos.
      await prisma.product.update({ where: { id: seeded.productId }, data: { name: "Identidade Visual Oficial" } });
    }
  });
});
