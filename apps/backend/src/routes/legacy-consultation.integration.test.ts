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

// Consulta da Plataforma Anterior (sprint de produtos, bloco 1/6).
//
// Usa um banco LEGADO descartável próprio (allka_legacy_test_*), criado e
// migrado (`migrate deploy` do zero) no before(). `app` é importado DEPOIS
// que LEGACY_DATABASE_URL está no process.env, porque config.ts lê o env no
// load — e getLegacyPrisma() lê process.env em runtime.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const users: string[] = [];
const products: string[] = [];
const adminProfiles: string[] = [];

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function mkUser(over: Partial<{ email: string; role: string; account_type: string; master: boolean; commonAdmin: boolean }> = {}) {
  const id = `leg-${crypto.randomBytes(6).toString("hex")}`;
  let admin_profile_id: string | undefined;
  if (over.master || over.commonAdmin) {
    const p = await prisma.adminProfile.create({
      data: { name: `LegProf ${id}`, is_master: !!over.master, is_active: true },
    });
    adminProfiles.push(p.id);
    admin_profile_id = p.id;
  }
  const u = await prisma.user.create({
    data: {
      id,
      email: over.email ?? `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: over.role ?? (over.master || over.commonAdmin ? "admin" : "company_user"),
      account_type: over.account_type ?? (over.master || over.commonAdmin ? "admin" : "empresas"),
      is_active: true,
      status: "ativo",
      admin_profile_id,
    },
  });
  users.push(u.id);
  return u;
}

async function seedProduct(over: { name: string; code: string; category: string; active: boolean; withVariation?: boolean }) {
  const p = await prisma.product.create({
    data: {
      name: over.name,
      product_code: over.code,
      category: over.category,
      is_active: over.active,
      base_price: 100,
      description: `Descrição de ${over.name}`,
      short_description: `Resumo de ${over.name}`,
    },
  });
  products.push(p.id);
  if (over.withVariation) {
    await prisma.productVariation.create({
      data: { product_id: p.id, name: `${over.name} - Plano A`, price: 150, is_active: true },
    });
  }
  return p;
}

describe("Consulta da Plataforma Anterior", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "";
    assert.ok(adminUrl, "TEST_DATABASE_ADMIN_URL necessário");
    const adm = new URL(adminUrl);
    legacyDbName = `allka_legacy_test_${crypto.randomBytes(5).toString("hex")}`;
    legacyUrl = `mysql://${adm.username}:${adm.password}@${adm.hostname}:${adm.port || 3306}/${legacyDbName}`;

    // Cria o banco legado descartável e aplica a migration do LEGADO do zero
    // (o mesmo migration.sql que `prisma migrate deploy` roda — aqui via
    // mysql2 para o teste não depender do CLI).
    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
      multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE \`${legacyDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    const migrationSql = fs.readFileSync(
      path.join(backendRoot, "prisma/legacy/migrations/20260901120000_init_legacy_snapshot/migration.sql"),
      "utf8",
    );
    await conn.query(`USE \`${legacyDbName}\`; ${migrationSql}`);
    await conn.end();

    // Só agora expõe a URL para a aplicação e importa o `app`.
    process.env.LEGACY_DATABASE_URL = legacyUrl;
    app = (await import("../app")).default;

    // Semeia produtos no banco OPERACIONAL de teste e roda o importador.
    await seedProduct({ name: "Logo e Identidade Visual", code: "prod_1", category: "Design", active: true, withVariation: true });
    await seedProduct({ name: "Gestão de Tráfego", code: "prod_2", category: "Performance", active: true });
    await seedProduct({ name: "Produto Descontinuado", code: "prod_3", category: "Design", active: false });

    await runImport({ dryRun: false, sourceName: "[TESTE LOCAL] Fotografia de produtos anteriores", legacyImportUrl: legacyUrl });

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.productVariation.deleteMany({ where: { product_id: { in: products } } });
    await prisma.product.deleteMany({ where: { id: { in: products } } });
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

  it("sem sessão → 401", async () => {
    assert.equal((await api("/api/admin/legacy/summary")).status, 401);
  });

  it("Admin comum (sem is_master) → 404, sem vazar conteúdo, e o acesso negado é auditado", async () => {
    const common = await mkUser({ commonAdmin: true });
    const r = await api("/api/admin/legacy/summary", { token: tokenFor(common) });
    assert.equal(r.status, 404);
    assert.ok(!JSON.stringify(r.json).includes("Fotografia"), "não revela conteúdo do legado");
    const denied = await prisma.productFeedbackAccessAudit.findFirst({
      where: { actor_id: common.id, action: "legacy_consultation.denied" },
    });
    assert.ok(denied, "acesso negado registrado na auditoria");
  });

  it("Admin Master → resumo com lote, contagens e conferência coerentes", async () => {
    const master = await mkUser({ master: true });
    const r = await api("/api/admin/legacy/summary", { token: tokenFor(master) });
    assert.equal(r.status, 200);
    assert.equal(r.json.batch.source_name, "[TESTE LOCAL] Fotografia de produtos anteriores");
    assert.equal(r.json.batch.is_preview, true);
    assert.equal(r.json.batch.status, "completed");
    assert.equal(r.json.counts.product, 3);
    assert.equal(r.json.counts.product_variation, 1);
    assert.equal(r.json.tabs.contas.status, "awaiting_import");
    assert.equal(r.json.tabs.produtos.status, "ready");
    // conferência: esperado === importado, divergência 0
    assert.equal(r.json.batch.reconciliation.product.divergence, 0);
    const audited = await prisma.productFeedbackAccessAudit.findFirst({
      where: { actor_id: master.id, action: "legacy_consultation.summary" },
    });
    assert.ok(audited, "consulta ao resumo é auditada");
  });

  it("Produtos: paginação, filtro por situação/categoria, busca e ordenação", async () => {
    const master = await mkUser({ master: true });
    const t = tokenFor(master);

    const all = await api("/api/admin/legacy/products?page_size=2", { token: t });
    assert.equal(all.status, 200);
    assert.equal(all.json.total, 3);
    assert.equal(all.json.data.length, 2);
    assert.equal(all.json.read_only, true);

    const page2 = await api("/api/admin/legacy/products?page_size=2&page=2", { token: t });
    assert.equal(page2.json.data.length, 1);

    const inactive = await api("/api/admin/legacy/products?status=inativo", { token: t });
    assert.equal(inactive.json.total, 1);
    assert.equal(inactive.json.data[0].original_code, "prod_3");

    const design = await api("/api/admin/legacy/products?category=Design", { token: t });
    assert.equal(design.json.total, 2);

    const search = await api("/api/admin/legacy/products?q=Tráfego", { token: t });
    assert.equal(search.json.total, 1);
    assert.equal(search.json.data[0].original_code, "prod_2");

    const desc = await api("/api/admin/legacy/products?sort_by=title&sort_dir=desc", { token: t });
    assert.equal(desc.json.data[0].title, "Produto Descontinuado");
  });

  it("Detalhe do produto: conteúdo importado + relações (variação/categoria), IDs originais, somente leitura", async () => {
    const master = await mkUser({ master: true });
    const t = tokenFor(master);
    const list = await api("/api/admin/legacy/products?q=Logo", { token: t });
    const recId = list.json.data[0].id;

    const detail = await api(`/api/admin/legacy/records/${recId}`, { token: t });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.read_only, true);
    assert.equal(detail.json.record.entity_type, "product");
    assert.equal(detail.json.record.original_code, "prod_1");
    assert.ok(detail.json.record.original_id.length > 0);
    assert.ok(detail.json.record.content.description.includes("Logo"));
    assert.ok(detail.json.relations_by_type.has_variation?.length === 1, "relação de variação presente");
    assert.ok(detail.json.relations_by_type.in_category, "relação de categoria presente");

    const audited = await prisma.productFeedbackAccessAudit.findFirst({
      where: { actor_id: master.id, action: "legacy_consultation.detail" },
    });
    assert.ok(audited, "abrir detalhe é auditado");
    assert.ok(String(audited!.after_json).includes("historical_original_id"), "auditoria guarda o id histórico");
  });

  it("Não existe verbo de escrita nas rotas do legado", async () => {
    const master = await mkUser({ master: true });
    const t = tokenFor(master);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = await fetch(`${baseUrl}/api/admin/legacy/products`, {
        method,
        headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
        body: "{}",
      });
      assert.ok(res.status === 404 || res.status === 405, `${method} não deve ser aceito (got ${res.status})`);
    }
  });

  it("Importador é idempotente e nunca sobrescreve fotografia concluída em silêncio", async () => {
    // Reprocessar o MESMO lote concluído sem --allow-refresh → recusa.
    const legacy = new (await import("../legacy/generated")).PrismaClient({ datasources: { db: { url: legacyUrl } } });
    const batch = await legacy.legacyImportBatch.findFirst();
    const recordsBefore = await legacy.legacyRecordSnapshot.count();
    await assert.rejects(
      () => runImport({ dryRun: false, batchId: batch!.id, legacyImportUrl: legacyUrl }),
      (e: any) => e.code === "batch_completed",
    );
    // Com --allow-refresh, sem mudança na origem → tudo inalterado, sem duplicar.
    const res = await runImport({ dryRun: false, batchId: batch!.id, allowRefresh: true, legacyImportUrl: legacyUrl });
    assert.equal(res.totals.changed, 0);
    assert.equal(res.totals.skipped_unchanged, res.totals.imported);
    const recordsAfter = await legacy.legacyRecordSnapshot.count();
    assert.equal(recordsAfter, recordsBefore, "sem duplicação");
    await legacy.$disconnect();
  });

  it("dry-run não escreve nada", async () => {
    const legacy = new (await import("../legacy/generated")).PrismaClient({ datasources: { db: { url: legacyUrl } } });
    const batchesBefore = await legacy.legacyImportBatch.count();
    const res = await runImport({ dryRun: true, legacyImportUrl: legacyUrl });
    assert.equal(res.dry_run, true);
    assert.equal(res.batch_id, null);
    assert.equal(await legacy.legacyImportBatch.count(), batchesBefore, "dry-run não cria lote");
    await legacy.$disconnect();
  });
});
