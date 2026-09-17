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
import {
  recordCatalog2ProductHistory,
  __resetCatalog2HistoryCoverageMarkerCacheForTests,
  CATALOG2_HISTORY_COVERAGE_VERSION,
  CATALOG2_HISTORY_KNOWN_GAPS,
} from "../lib/catalog2-product-history";

// Item 7.2 (reunião 2026-09-14, "Completar o histórico do produto") —
// cobre: (1) criação/edição/exclusão/ordem de variações e opções, com
// antes/depois + autor + efeitos comerciais; (2) falha ao gravar reverte a
// alteração; (3) bloqueio em versão publicada continua ativo; (4) transição
// de cobertura parcial -> completa a partir do NOVO marco (v2), sem atribuir
// cobertura retroativa ao intervalo anterior.

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
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C12 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c12ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: master ? "Admin Master" : "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkDraftProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: {
      slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao",
      four_f: { create: [{ four_f_id: fourF.id }] },
    },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
    },
  });
  return { product, versionId: v.id, specialtyId: spec.id };
}
async function purgeProduct(id: string) {
  await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2CommercialChangeEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2OptionEffect.deleteMany({ where: { option: { variation: { version_id: { in: vids } } } } }).catch(() => {});
  await prisma.catalog2VariationOption.deleteMany({ where: { variation: { version_id: { in: vids } } } }).catch(() => {});
  await prisma.catalog2Variation.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2AddonEffect.deleteMany({ where: { addon: { version_id: { in: vids } } } }).catch(() => {});
  await prisma.catalog2Addon.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}
async function setPricingSettings() {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
    update: { component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
  });
}

let MASTER_USER: Awaited<ReturnType<typeof mkAdmin>>;
let MASTER = "";

describe("Completar o histórico do produto (Item 7.2, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    MASTER_USER = await mkAdmin(true);
    MASTER = MASTER_USER.token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1a. variação: criar/editar (nome+ordem)/remover geram eventos com antes/depois e autor", async () => {
    const { product, versionId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    const created = await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token: MASTER, body: { key: "cor", name: "Cor", sort_order: 1 } });
    assert.equal(created.status, 201, JSON.stringify(created.json));

    const updated = await api(`/api/admin/catalog2/variations/${created.json.id}`, { method: "PUT", token: MASTER, body: { name: "Cor principal", sort_order: 2 } });
    assert.equal(updated.status, 200, JSON.stringify(updated.json));

    const removed = await api(`/api/admin/catalog2/variations/${created.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(removed.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const added = hist.json.data.find((e: any) => e.event_type === "variation_added");
    const upd = hist.json.data.find((e: any) => e.event_type === "variation_updated");
    const rem = hist.json.data.find((e: any) => e.event_type === "variation_removed");
    assert.ok(added && upd && rem, "os 3 eventos de variação devem existir");
    assert.equal(upd.before.name, "Cor");
    assert.equal(upd.after.name, "Cor principal");
    assert.equal(upd.before.sort_order, 1);
    assert.equal(upd.after.sort_order, 2);
    assert.match(upd.description, /ordem de 1 para 2/);
    for (const ev of [added, upd, rem]) assert.equal(ev.actor_user_id, MASTER_USER.user.id);
  });

  it("1b. opção: criar/editar (rótulo+ordem)/remover geram eventos corretos, vinculados à variação certa", async () => {
    const { product, versionId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    const variation = await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token: MASTER, body: { key: "cor", name: "Cor" } });
    const created = await api(`/api/admin/catalog2/variations/${variation.json.id}/options`, { method: "POST", token: MASTER, body: { key: "azul", label: "Azul", sort_order: 1 } });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const updated = await api(`/api/admin/catalog2/options/${created.json.id}`, { method: "PUT", token: MASTER, body: { label: "Azul marinho", sort_order: 3 } });
    assert.equal(updated.status, 200);
    const removed = await api(`/api/admin/catalog2/options/${created.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(removed.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const added = hist.json.data.find((e: any) => e.event_type === "option_added");
    const upd = hist.json.data.find((e: any) => e.event_type === "option_updated");
    const rem = hist.json.data.find((e: any) => e.event_type === "option_removed");
    assert.ok(added && upd && rem, "os 3 eventos de opção devem existir");
    assert.match(added.description, /Cor/, "descrição deve identificar a variação dona da opção");
    assert.equal(upd.before.label, "Azul");
    assert.equal(upd.after.label, "Azul marinho");
    assert.equal(upd.before.sort_order, 1);
    assert.equal(upd.after.sort_order, 3);
  });

  it("1c. efeito comercial de opção (add_percent) e de adicional: adicionar/remover geram eventos com valor legível", async () => {
    const { product, versionId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    const variation = await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token: MASTER, body: { key: "cor", name: "Cor" } });
    const option = await api(`/api/admin/catalog2/variations/${variation.json.id}/options`, { method: "POST", token: MASTER, body: { key: "azul", label: "Azul" } });
    const effect = await api(`/api/admin/catalog2/options/${option.json.id}/effects`, { method: "POST", token: MASTER, body: { effect_type: "add_percent", effect_value: "10" } });
    assert.equal(effect.status, 201, JSON.stringify(effect.json));
    const effectDel = await api(`/api/admin/catalog2/option-effects/${effect.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(effectDel.status, 200);

    const addon = await api(`/api/admin/catalog2/versions/${versionId}/addons`, { method: "POST", token: MASTER, body: { key: "urgente", name: "Urgente" } });
    const addonEffect = await api(`/api/admin/catalog2/addons/${addon.json.id}/effects`, { method: "POST", token: MASTER, body: { effect_type: "add_deadline_days", effect_value: "2" } });
    assert.equal(addonEffect.status, 201, JSON.stringify(addonEffect.json));
    const addonEffectDel = await api(`/api/admin/catalog2/addon-effects/${addonEffect.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(addonEffectDel.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const types = hist.json.data.map((e: any) => e.event_type);
    assert.ok(types.includes("option_effect_added") && types.includes("option_effect_removed"));
    assert.ok(types.includes("addon_effect_added") && types.includes("addon_effect_removed"));
    const optEffAdded = hist.json.data.find((e: any) => e.event_type === "option_effect_added");
    assert.match(optEffAdded.description, /10%/);
    const addonEffAdded = hist.json.data.find((e: any) => e.event_type === "addon_effect_added");
    assert.match(addonEffAdded.description, /2 dia/);
  });

  it("2. falha ao gravar o evento reverte a alteração de variação (mesma transação)", async () => {
    const { product, versionId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.catalog2Variation.create({ data: { version_id: versionId, key: "cor", name: "Cor", is_required: true, sort_order: 1 } });
        await recordCatalog2ProductHistory(tx, {
          productId: product.id, versionId: "versao-inexistente-xyz", eventType: "variation_added",
          description: "isto nunca deveria persistir", actorUserId: MASTER_USER.user.id,
        });
      }),
    );
    const variations = await prisma.catalog2Variation.count({ where: { version_id: versionId } });
    assert.equal(variations, 0, "a criação da variação deve ter sido revertida junto com a falha no histórico");
  });

  it("3. edição/remoção de variação e opção em versão PUBLICADA continua bloqueada — sem evento", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId, estimated_minutes: 30 } });
    const variation = await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token: MASTER, body: { key: "cor", name: "Cor" } });
    const option = await api(`/api/admin/catalog2/variations/${variation.json.id}/options`, { method: "POST", token: MASTER, body: { key: "azul", label: "Azul" } });

    await setPricingSettings();
    await prisma.catalog2Specialty.update({ where: { id: specialtyId }, data: { max_hourly_rate: 100 } });
    const publish = await api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: MASTER, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(publish.status, 200, JSON.stringify(publish.json));

    const countBefore = (await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER })).json.total;

    const blockedVarUpdate = await api(`/api/admin/catalog2/variations/${variation.json.id}`, { method: "PUT", token: MASTER, body: { name: "Nova cor" } });
    assert.equal(blockedVarUpdate.status, 409);
    assert.equal(blockedVarUpdate.json.code, "version_published_immutable");
    const blockedOptDelete = await api(`/api/admin/catalog2/options/${option.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(blockedOptDelete.status, 409);
    const blockedVarDelete = await api(`/api/admin/catalog2/variations/${variation.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(blockedVarDelete.status, 409);

    const countAfter = (await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER })).json.total;
    assert.equal(countAfter, countBefore, "nenhuma tentativa bloqueada deve ter gerado evento");
  });

  it("4. cobertura transita de parcial para completa a partir do NOVO marco (v2), sem retroagir", async () => {
    const { product } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    assert.equal(CATALOG2_HISTORY_KNOWN_GAPS.length, 0, "Item 7.2 deveria ter fechado todas as lacunas declaradas até aqui");
    assert.equal(CATALOG2_HISTORY_COVERAGE_VERSION, 2);

    const before = Date.now();
    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(hist.status, 200);
    assert.equal(hist.json.coverage.status, "complete_since_marker", "sem lacunas conhecidas, a cobertura deve ser completa a partir do marco");
    const since = new Date(hist.json.coverage.full_coverage_since).getTime();
    assert.ok(since >= before - 10_000 && since <= Date.now() + 10_000, "o marco v2 deve ser uma data real deste ambiente, não herdada de uma versão anterior");
    assert.notEqual(hist.json.coverage.full_coverage_since.slice(0, 10), "2026-09-14");

    // "reinício": o marco não muda.
    __resetCatalog2HistoryCoverageMarkerCacheForTests();
    const hist2 = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(hist2.json.coverage.full_coverage_since, hist.json.coverage.full_coverage_since);

    // produto criado DEPOIS do marco (produto novo em banco de teste
    // recém-criado) -> não deve ter "histórico anterior" a declarar.
    assert.equal(hist.json.coverage.has_history_before_marker, false);
  });

  it("4b. um produto com registro anterior ao marco v2 continua marcado como tendo histórico parcial ANTES do marco, mas completo a partir dele", async () => {
    const { product, versionId } = await mkDraftProduct(`c12-${crypto.randomBytes(4).toString("hex")}`);
    // força a versão a parecer mais antiga que o marco atual (simula um
    // produto que já existia antes desta revisão).
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { created_at: new Date(Date.now() - 365 * 24 * 3600 * 1000) } });

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(hist.json.coverage.has_history_before_marker, true, "produto mais antigo que o marco deve sinalizar histórico parcial anterior");
    // MESMO assim, o status geral continua "complete_since_marker" — a
    // regra não exige mais ausência de registros anteriores; o que ela
    // garante é que TUDO a partir do marco é completo.
    assert.equal(hist.json.coverage.status, "complete_since_marker");
  });
});
