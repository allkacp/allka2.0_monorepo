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
import { createProduct, newDraftVersion, publishVersion } from "../lib/catalog2-service";

// Fundação do novo catálogo (sprint de produtos, bloco 2/6).

let baseUrl = "";
let server: import("node:http").Server;

const users: string[] = [];
const adminProfiles: string[] = [];
const catProducts: string[] = [];

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

async function mkUser(kind: "master" | "common_admin" | "plain") {
  const id = `cat2-${crypto.randomBytes(6).toString("hex")}`;
  let admin_profile_id: string | undefined;
  if (kind !== "plain") {
    const p = await prisma.adminProfile.create({
      data: { name: `Cat2Prof ${id}`, is_master: kind === "master", is_active: true },
    });
    adminProfiles.push(p.id);
    admin_profile_id = p.id;
  }
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: kind === "plain" ? "company_user" : "admin",
      account_type: kind === "plain" ? "empresas" : "admin",
      is_active: true,
      status: "ativo",
      admin_profile_id,
    },
  });
  users.push(u.id);
  return u;
}

describe("Novo catálogo — fundação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    // Limpa só o que este teste criou.
    for (const id of catProducts) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("1. Admin Master acessa; 2. admin comum e usuário comum NÃO acessam", async () => {
    const master = await mkUser("master");
    const commonAdmin = await mkUser("common_admin");
    const plain = await mkUser("plain");

    assert.equal((await api("/api/admin/catalog2/overview", { token: tokenFor(master) })).status, 200);
    assert.equal((await api("/api/admin/catalog2/overview", { token: tokenFor(commonAdmin) })).status, 404);
    assert.equal((await api("/api/admin/catalog2/overview", { token: tokenFor(plain) })).status, 404);
    assert.equal((await api("/api/admin/catalog2/pillars")).status, 401);
  });

  it("3/4. o catálogo operacional (products) e o Legacy não são tocados pela fundação", async () => {
    const productsBefore = await prisma.product.count();
    const master = await mkUser("master");
    // criar um produto do NOVO catálogo não altera `products`
    const p = await createProduct({ internal_name: "[TESTE] Isolamento" }, master.id);
    catProducts.push(p.id);
    assert.equal(await prisma.product.count(), productsBefore, "tabela products intocada");
    // o novo catálogo tem suas próprias tabelas, separadas
    assert.ok((await prisma.catalog2Product.findUnique({ where: { id: p.id } })) !== null);
  });

  it("5. o novo catálogo começa separado — /overview conta só catalog2, nunca os 162", async () => {
    const master = await mkUser("master");
    const r = await api("/api/admin/catalog2/overview", { token: tokenFor(master) });
    assert.equal(r.status, 200);
    assert.equal(r.json.counts.pillars, 5);
    assert.equal(r.json.counts.four_f, 4);
    assert.equal(r.json.counts.categories, 5);
    // products: só os do catalog2 criados nos testes — bem abaixo de 162
    assert.ok(r.json.counts.products < 50);
  });

  it("6. versão PUBLICADA não pode ser editada diretamente (409); 7. nova versão preserva a publicada", async () => {
    const master = await mkUser("master");
    const p = await createProduct({ internal_name: "[TESTE] Versionamento" }, master.id);
    catProducts.push(p.id);
    const v1 = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id, version_number: 1 } });

    // publica a v1 (force: este teste não monta o produto completo — o
    // bloco 3 adicionou a validação de publicação; ver catalog2-builder.*)
    const pubRes = await api(`/api/admin/catalog2/versions/${v1.id}/publish`, { method: "POST", token: tokenFor(master), body: { force: true } });
    assert.equal(pubRes.status, 200);

    // editar a v1 publicada → 409
    const editPub = await api(`/api/admin/catalog2/versions/${v1.id}`, { method: "PUT", token: tokenFor(master), body: { title: "hackeado" } });
    assert.equal(editPub.status, 409);
    assert.equal(editPub.json.code, "version_published_immutable");
    const v1Fresh = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: v1.id } });
    assert.notEqual(v1Fresh.title, "hackeado", "versão publicada não muda");

    // nova versão rascunho → v1 publicada continua lá, product.published_version_id = v1
    const nv = await api(`/api/admin/catalog2/products/${p.id}/versions`, { method: "POST", token: tokenFor(master) });
    assert.equal(nv.status, 201);
    assert.equal(nv.json.version_number, 2);
    assert.equal(nv.json.state, "rascunho");
    const productFresh = await prisma.catalog2ProductVersion.count({ where: { product_id: p.id } });
    assert.equal(productFresh, 2, "as duas versões coexistem");
    const prod = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(prod.published_version_id, v1.id, "produto ainda aponta pra v1 publicada");
    assert.equal(prod.status, "disponivel");

    // a v2 rascunho PODE ser editada
    const editDraft = await api(`/api/admin/catalog2/versions/${nv.json.version_id}`, { method: "PUT", token: tokenFor(master), body: { title: "rascunho editado" } });
    assert.equal(editDraft.status, 200);
  });

  it("8. ordem de tarefas e etapas é preservada; 9. variação e adicional são entidades separadas", async () => {
    const master = await mkUser("master");
    const p = await createProduct({ internal_name: "[TESTE] Estrutura" }, master.id);
    catProducts.push(p.id);
    const v1 = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id, version_number: 1 } });

    // monta tarefas fora de ordem de criação, mas com sort_order explícito
    const t2 = await prisma.catalog2Task.create({ data: { version_id: v1.id, key: "t2", name: "Segunda", sort_order: 2, execution_mode: "ia" } });
    const t1 = await prisma.catalog2Task.create({ data: { version_id: v1.id, key: "t1", name: "Primeira", sort_order: 1, execution_mode: "humano" } });
    await prisma.catalog2TaskStep.createMany({
      data: [
        { task_id: t1.id, key: "b", name: "Passo B", sort_order: 2 },
        { task_id: t1.id, key: "a", name: "Passo A", sort_order: 1 },
      ],
    });
    void t2;
    // variação (obrigatória) e adicional (opcional) — tabelas distintas
    await prisma.catalog2Variation.create({
      data: { version_id: v1.id, key: "formato", name: "Formato", options: { create: [{ key: "e", label: "Estático", sort_order: 1 }] } },
    });
    await prisma.catalog2Addon.create({ data: { version_id: v1.id, key: "extra", name: "Extra opcional" } });

    const detail = await api(`/api/admin/catalog2/products/${p.id}`, { token: tokenFor(master) });
    assert.equal(detail.status, 200);
    const v = detail.json.versions.find((x: any) => x.version_number === 1);
    assert.deepEqual(v.tasks.map((t: any) => t.name), ["Primeira", "Segunda"], "tarefas em ordem de sort_order");
    assert.deepEqual(v.tasks[0].steps.map((s: any) => s.name), ["Passo A", "Passo B"], "etapas em ordem");
    assert.equal(v.variations.length, 1);
    assert.equal(v.addons.length, 1);
    assert.notEqual(v.variations[0].id, v.addons[0].id);
    // são de tabelas diferentes — contam separado
    assert.equal(await prisma.catalog2Variation.count({ where: { version_id: v1.id } }), 1);
    assert.equal(await prisma.catalog2Addon.count({ where: { version_id: v1.id } }), 1);
  });

  it("estado do produto: só sai de em_preparacao ao publicar; disponível exige versão publicada", async () => {
    const master = await mkUser("master");
    const p = await createProduct({ internal_name: "[TESTE] Estados" }, master.id);
    catProducts.push(p.id);
    let prod = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(prod.status, "em_preparacao");

    // tenta marcar "disponivel" sem versão publicada → 409
    const bad = await api(`/api/admin/catalog2/products/${p.id}/status`, { method: "PATCH", token: tokenFor(master), body: { status: "disponivel" } });
    assert.equal(bad.status, 409);

    const v1 = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    await publishVersion(v1.id, master.id, { force: true });
    prod = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(prod.status, "disponivel");

    // agora pode suspender temporariamente
    const susp = await api(`/api/admin/catalog2/products/${p.id}/status`, { method: "PATCH", token: tokenFor(master), body: { status: "temporariamente_inativo" } });
    assert.equal(susp.status, 200);
  });

  it("não existe versão rascunho duplicada por produto", async () => {
    const master = await mkUser("master");
    const p = await createProduct({ internal_name: "[TESTE] Um rascunho" }, master.id);
    catProducts.push(p.id);
    // já tem a v1 rascunho — pedir outra sem publicar → 409
    await assert.rejects(() => newDraftVersion(p.id, master.id), (e: any) => e.code === "draft_exists");
  });
});
