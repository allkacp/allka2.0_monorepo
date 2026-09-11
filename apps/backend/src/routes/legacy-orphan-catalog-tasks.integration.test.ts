import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { ORPHAN_CATALOG_TASKS_IMPORTER_VERSION, IMPORTER_VERSION, collectProductSnapshot } from "../legacy/importer";
import { collectOrphanCatalogTasksSnapshot } from "../legacy/collect-orphan-catalog-tasks";
import { runDomain } from "../legacy/snapshot-orchestrator";

// Coletor COMPLEMENTAR de tarefas de catálogo órfãs — bloco aditivo achado
// na auditoria pós-snapshot (83 CatalogTask reais, sem vínculo de produto,
// no banco real). Prova, SÓ em bancos descartáveis, que:
//  - tarefa vinculada a produto NUNCA entra aqui (mesmo id do lote de
//    produtos, sem duplicação);
//  - tarefa órfã entra, com campos históricos preservados e segredo
//    sanitizado;
//  - referência real por ProjectTask.catalog_task_id é preservada como
//    relação (mesmo o destino vivendo em outro domínio/lote);
//  - paginação real, idempotência, divergência, lote selado imutável,
//    coexistência com o lote de produtos, zero escrita no operacional,
//    dry-run seguro, concorrência, detecção de "deixou de ser órfã" e de
//    "tarefa nova depois do selamento" (via a MESMA proteção de
//    imutabilidade já usada pelos outros 5 domínios — nenhuma lógica
//    temporal nova).

const backendRoot = path.resolve(__dirname, "..", "..");

function id(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
}

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-12T00:00:00.000Z");
const PRODUCTS_SOURCE = "Produtos — Órfãs (teste descartável)";
const ORPHAN_SOURCE = "Tarefas de Catálogo Órfãs — Complemento (teste descartável)";

describe("Legado — coletor complementar de tarefas de catálogo órfãs", () => {
  const catalogTaskIds: string[] = [];
  const productIds: string[] = [];
  let linkedTaskId = "";
  let orphanPlainId = "";
  let orphanWithProjectRefId = "";
  let orphanWithSecretId = "";
  let orphanInactiveId = "";
  let projectTaskId = "";

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

    // ── Massa: 1 produto + 1 tarefa VINCULADA (não deve aparecer no complemento) ──
    const product = await prisma.product.create({
      data: { name: "Produto Órfãs (teste)", product_code: `prod_orph_${id("p")}`, category: "Design", is_active: true, base_price: 100, description: "d", short_description: "d" },
    });
    productIds.push(product.id);
    const linkedTask = await prisma.catalogTask.create({
      data: { code: `ct_linked_${id("c")}`, name: "Tarefa vinculada (teste)", category: "Design", task_type: "execution", is_active: true },
    });
    linkedTaskId = linkedTask.id;
    catalogTaskIds.push(linkedTask.id);
    await prisma.productCatalogTask.create({ data: { product_id: product.id, catalog_task_id: linkedTask.id } });

    // ── 4 tarefas ÓRFÃS (sem nenhum vínculo em product_catalog_tasks) ──
    const orphanPlain = await prisma.catalogTask.create({
      data: { code: `ct_orph_plain_${id("c")}`, name: "Tarefa órfã simples (teste)", category: "Design", task_type: "execution", is_active: true, objective: "Diagramar identidade visual" },
    });
    orphanPlainId = orphanPlain.id;
    catalogTaskIds.push(orphanPlain.id);

    const orphanInactive = await prisma.catalogTask.create({
      data: { code: `ct_orph_inactive_${id("c")}`, name: "Tarefa órfã inativa (teste)", category: "Performance", task_type: "execution", is_active: false, status: "inativa" },
    });
    orphanInactiveId = orphanInactive.id;
    catalogTaskIds.push(orphanInactive.id);

    const orphanWithSecret = await prisma.catalogTask.create({
      data: {
        code: `ct_orph_secret_${id("c")}`,
        name: "Tarefa órfã com segredo colado (teste)",
        category: "Web",
        task_type: "execution",
        is_active: true,
        description: "Contém um segredo colado à mão: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.cccccccccccccccccccccccccccccc — o resto deste texto deve continuar legível",
      },
    });
    orphanWithSecretId = orphanWithSecret.id;
    catalogTaskIds.push(orphanWithSecret.id);

    const orphanWithProjectRef = await prisma.catalogTask.create({
      data: { code: `ct_orph_ref_${id("c")}`, name: "Tarefa órfã referenciada por ProjectTask (teste)", category: "Web", task_type: "execution", is_active: true },
    });
    orphanWithProjectRefId = orphanWithProjectRef.id;
    catalogTaskIds.push(orphanWithProjectRef.id);

    // Projeto/tarefa real referenciando a tarefa de catálogo órfã (FK real —
    // exatamente o achado real: existem tarefas órfãs USADAS de verdade).
    const company = await prisma.company.create({ data: { name: "Empresa Órfãs (teste)", status: "ativo", type: "empresa" } });
    const project = await prisma.project.create({ data: { title: "Projeto Órfãs (teste)", project_code: `proj_orph_${id("j")}`, status: "in-progress", company_id: company.id } });
    const projectProduct = await prisma.projectProduct.create({
      data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category, status: "EM_EXECUCAO" },
    });
    const pt = await prisma.projectTask.create({
      data: { project_id: project.id, project_product_id: projectProduct.id, catalog_task_id: orphanWithProjectRef.id, name_snapshot: orphanWithProjectRef.name, title: "Tarefa executando (teste)", status: "EM_EXECUCAO" },
    });
    projectTaskId = pt.id;
  });

  after(async () => {
    await prisma.projectTask.deleteMany({ where: { id: projectTaskId } });
    await prisma.projectProduct.deleteMany({ where: { project: { title: "Projeto Órfãs (teste)" } } });
    await prisma.project.deleteMany({ where: { title: "Projeto Órfãs (teste)" } });
    await prisma.company.deleteMany({ where: { name: "Empresa Órfãs (teste)" } });
    await prisma.productCatalogTask.deleteMany({ where: { catalog_task_id: linkedTaskId } });
    await prisma.catalogTask.deleteMany({ where: { id: { in: catalogTaskIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    const adm = new URL(adminUrl);
    const conn = await mysql.createConnection({ host: adm.hostname, port: Number(adm.port || 3306), user: decodeURIComponent(adm.username), password: decodeURIComponent(adm.password) });
    await conn.execute(`DROP DATABASE IF EXISTS \`${legacyDbName}\`;`);
    await conn.end();
    await prisma.$disconnect();
  });

  it("1/2) tarefa vinculada a produto nunca entra; tarefas órfãs entram", async () => {
    const collection = await collectOrphanCatalogTasksSnapshot(prisma as never);
    const collectedIds = collection.records.map((r) => r.original_id);
    assert.ok(!collectedIds.includes(linkedTaskId), "tarefa vinculada a produto não deve aparecer no complemento");
    assert.ok(collectedIds.includes(orphanPlainId));
    assert.ok(collectedIds.includes(orphanInactiveId));
    assert.ok(collectedIds.includes(orphanWithSecretId));
    assert.ok(collectedIds.includes(orphanWithProjectRefId));
    assert.equal(collection.records.length, 4, "só as 4 tarefas órfãs, nunca a vinculada");
  });

  it("3) referência real por ProjectTask é preservada como relação", async () => {
    const collection = await collectOrphanCatalogTasksSnapshot(prisma as never);
    const rel = collection.relations.find((r) => r.from_original_id === orphanWithProjectRefId && r.to_entity_type === "project_task");
    assert.ok(rel, "deve existir relação referenced_by_project_task");
    assert.equal(rel!.to_original_id, projectTaskId);
    assert.equal(rel!.relation_type, "referenced_by_project_task");
  });

  it("4) campos históricos preservados (categoria, tipo, objetivo)", async () => {
    const collection = await collectOrphanCatalogTasksSnapshot(prisma as never);
    const rec = collection.records.find((r) => r.original_id === orphanPlainId)!;
    assert.equal((rec.content as { category: string }).category, "Design");
    assert.equal((rec.content as { objective: string }).objective, "Diagramar identidade visual");
    assert.equal((rec.content as { orphan_without_product_link: boolean }).orphan_without_product_link, true);
  });

  it("6) processa em páginas de verdade (pageSize pequeno não perde nenhuma tarefa)", async () => {
    const collection = await collectOrphanCatalogTasksSnapshot(prisma as never, { pageSize: 1 });
    assert.equal(collection.records.length, 4);
  });

  it("5/9/10/11/12/13) dry-run: sanitiza segredo, não escreve, coexiste com o lote de produtos já selado", async () => {
    // Sela primeiro o lote de PRODUTOS (que inclui a tarefa VINCULADA).
    const productsResult = (await runDomain({
      domain: "products",
      operationalUrl: process.env.DATABASE_URL!,
      legacyImportUrl: legacyUrl,
      dryRun: false,
      kind: "official",
      sourceName: PRODUCTS_SOURCE,
      sourceEnvironment: "qa",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
    assert.equal(productsResult.status, "completed");
    assert.equal(productsResult.sealed, true);

    // Dry-run do complemento — nunca escreve.
    const opCountsBefore = await prisma.catalogTask.count();
    const legacyBefore = await (await openLegacy()).legacyImportBatch.count();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dry: any = await runDomain({
      domain: "orphan-catalog-tasks",
      operationalUrl: process.env.DATABASE_URL!,
      legacyImportUrl: legacyUrl,
      dryRun: true,
      kind: "preview",
      sourceName: "[TESTE LOCAL] dry-run complemento",
      sourceEnvironment: "local",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
    });
    assert.equal(dry.status, "dry_run");
    assert.equal(dry.expected, 4);
    const opCountsAfter = await prisma.catalogTask.count();
    assert.equal(opCountsAfter, opCountsBefore, "dry-run não altera o operacional");
    const legacy = await openLegacy();
    const legacyAfter = await legacy.legacyImportBatch.count();
    assert.equal(legacyAfter, legacyBefore, "dry-run não cria lote no Legado");

    // Selo o complemento oficialmente — deve conter só as 4 órfãs, e o
    // segredo colado deve estar sanitizado (redigido, texto ao redor
    // preservado), coexistindo com o lote de produtos já selado.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const official: any = await runDomain({
      domain: "orphan-catalog-tasks",
      operationalUrl: process.env.DATABASE_URL!,
      legacyImportUrl: legacyUrl,
      dryRun: false,
      kind: "official",
      sourceName: ORPHAN_SOURCE,
      sourceEnvironment: "qa",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
    });
    assert.equal(official.status, "completed");
    assert.equal(official.sealed, true);
    assert.equal(official.divergence_count, 0);
    assert.equal(official.sanitized_records, 1, "só a tarefa com segredo deve ser sanitizada");

    const secretRecord = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: official.batch_id, original_id: orphanWithSecretId } });
    const serialized = secretRecord.content_json;
    assert.doesNotMatch(serialized, /eyJhbGciOiJIUzI1NiJ9\.eyJzdWIiOiIxMjM0NTY3ODkwIn0\.cccccccccccccccccccccccccccccc/);
    assert.match(serialized, /resto deste texto deve continuar leg/);

    // Coexistência: os dois lotes (produtos e complemento) vivem juntos,
    // sem colidir — a tarefa vinculada só existe no lote de produtos; as
    // órfãs só no lote do complemento. Zero duplicação.
    const linkedInProducts = await legacy.legacyRecordSnapshot.count({ where: { batch_id: productsResult.batch_id, entity_type: "catalog_task", original_id: linkedTaskId } });
    const linkedInOrphan = await legacy.legacyRecordSnapshot.count({ where: { batch_id: official.batch_id, entity_type: "catalog_task", original_id: linkedTaskId } });
    assert.equal(linkedInProducts, 1);
    assert.equal(linkedInOrphan, 0, "tarefa vinculada nunca deve aparecer no lote do complemento");

    const orphanInProducts = await legacy.legacyRecordSnapshot.count({ where: { batch_id: productsResult.batch_id, entity_type: "catalog_task", original_id: orphanPlainId } });
    assert.equal(orphanInProducts, 0, "tarefa órfã nunca deve aparecer no lote de produtos");

    await legacy.$disconnect();
  });

  it("7/8) reexecução idempotente (validated_official, mesmo checksum)", async () => {
    const legacy = await openLegacy();
    const before = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: ORPHAN_SOURCE } });
    await legacy.$disconnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await runDomain({
      domain: "orphan-catalog-tasks",
      operationalUrl: process.env.DATABASE_URL!,
      legacyImportUrl: legacyUrl,
      dryRun: false,
      kind: "official",
      sourceName: ORPHAN_SOURCE,
      sourceEnvironment: "qa",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
    });
    assert.equal(r.status, "validated_official");
    assert.equal(r.batch_id, before.id);
  });

  it("9/10/17) tarefa nova criada DEPOIS do selamento não entra silenciosamente — reexecução detecta divergência, lote selado permanece intacto", async () => {
    const legacy = await openLegacy();
    const before = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: ORPHAN_SOURCE } });

    // Tarefa órfã NOVA, criada depois do lote selado.
    const newOrphan = await prisma.catalogTask.create({
      data: { code: `ct_orph_new_${id("c")}`, name: "Tarefa órfã criada depois do selamento (teste)", category: "Design", task_type: "execution", is_active: true },
    });
    catalogTaskIds.push(newOrphan.id);

    await assert.rejects(async () => {
      const r = await runDomain({
        domain: "orphan-catalog-tasks",
        operationalUrl: process.env.DATABASE_URL!,
        legacyImportUrl: legacyUrl,
        dryRun: false,
        kind: "official",
        sourceName: ORPHAN_SOURCE,
        sourceEnvironment: "qa",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
      });
      if (r.status === "failed") throw new Error(r.error);
    }, /diverge|divergência|registro novo/i);

    const after = await legacy.legacyImportBatch.findUniqueOrThrow({ where: { id: before.id } });
    assert.equal(after.checksum, before.checksum, "checksum do lote selado não deve mudar");
    assert.equal(after.sealed_at?.getTime(), before.sealed_at?.getTime());
    const countAfter = await legacy.legacyRecordSnapshot.count({ where: { batch_id: before.id } });
    assert.equal(countAfter, 4, "o lote selado continua só com as 4 tarefas originais — a nova NÃO entrou");

    await prisma.catalogTask.delete({ where: { id: newOrphan.id } });
    await legacy.$disconnect();
  });

  it("14) concorrência: duas execuções oficiais simultâneas nunca produzem dois lotes distintos", async () => {
    const [r1, r2] = await Promise.allSettled([
      runDomain({ domain: "orphan-catalog-tasks", operationalUrl: process.env.DATABASE_URL!, legacyImportUrl: legacyUrl, dryRun: false, kind: "official", sourceName: ORPHAN_SOURCE, sourceEnvironment: "qa", snapshotAt: OFFICIAL_SNAPSHOT_AT, acknowledgeOfficial: true }),
      runDomain({ domain: "orphan-catalog-tasks", operationalUrl: process.env.DATABASE_URL!, legacyImportUrl: legacyUrl, dryRun: false, kind: "official", sourceName: ORPHAN_SOURCE, sourceEnvironment: "qa", snapshotAt: OFFICIAL_SNAPSHOT_AT, acknowledgeOfficial: true }),
    ]);
    const batchIds = [r1, r2]
      .map((r) => (r.status === "fulfilled" ? (r.value as { batch_id?: string | null }).batch_id : undefined))
      .filter((v): v is string => !!v);
    assert.equal(new Set(batchIds).size <= 1, true, "nunca dois lotes distintos para o mesmo domínio/sourceName");
  });

  it("15) consulta pela API do Legado localiza a tarefa órfã pelo batch_id do complemento", async () => {
    const legacy = await openLegacy();
    const batch = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: ORPHAN_SOURCE } });
    const record = await legacy.legacyRecordSnapshot.findFirstOrThrow({ where: { batch_id: batch.id, original_id: orphanPlainId } });
    assert.equal(record.entity_type, "catalog_task");
    assert.equal(record.original_status, "ativa");
    await legacy.$disconnect();
  });

  it("16) tarefa que ganha vínculo de produto some do complemento na próxima coleta (detecção por identidade, não lista fixa)", async () => {
    const newlyLinkedTask = await prisma.catalogTask.create({
      data: { code: `ct_becomes_linked_${id("c")}`, name: "Tarefa que ganha vínculo (teste)", category: "Design", task_type: "execution", is_active: true },
    });
    catalogTaskIds.push(newlyLinkedTask.id);

    let collection = await collectOrphanCatalogTasksSnapshot(prisma as never);
    assert.ok(collection.records.some((r) => r.original_id === newlyLinkedTask.id), "antes do vínculo, deve aparecer como órfã");

    await prisma.productCatalogTask.create({ data: { product_id: productIds[0], catalog_task_id: newlyLinkedTask.id } });

    collection = await collectOrphanCatalogTasksSnapshot(prisma as never);
    assert.ok(!collection.records.some((r) => r.original_id === newlyLinkedTask.id), "depois do vínculo, não deve mais aparecer como órfã");

    await prisma.productCatalogTask.deleteMany({ where: { catalog_task_id: newlyLinkedTask.id } });
  });

  it("importer_version do complemento é o esperado, distinto do de produtos", () => {
    assert.notEqual(ORPHAN_CATALOG_TASKS_IMPORTER_VERSION, IMPORTER_VERSION);
  });

  it("collectProductSnapshot ainda importável/estável (não foi alterado por este bloco)", () => {
    assert.equal(typeof collectProductSnapshot, "function");
  });
});
