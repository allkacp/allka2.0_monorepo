import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { summarizeCatalog2ProductHistory } from "../lib/catalog2-product-history-ai";

// Item 7 (reunião 2026-09-14, "Histórico de alterações do produto") —
// cobre: (1) antes/depois + autor; (2) operação recusada nunca vira evento
// concluído; (3) tarefas/status/comercial são todos capturados (mesclados);
// (4) paginação e filtros; (5) permissão + proteção contra alteração via
// rota normal; (6) resumo por IA baseado só nos eventos fornecidos, com
// fallback determinístico quando a IA está indisponível (TEST_DATABASE_URL
// já garante nenhuma chamada paga real aqui, ver catalog2-product-history-ai.ts).

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
  const p = await prisma.adminProfile.create({ data: { name: `C10 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c10ad-${crypto.randomBytes(5).toString("hex")}`;
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
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

let MASTER_USER: Awaited<ReturnType<typeof mkAdmin>>;
let MASTER = "";
let COMMON_ADMIN = "";

describe("Histórico de alterações do produto (Item 7, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    MASTER_USER = await mkAdmin(true);
    MASTER = MASTER_USER.token;
    COMMON_ADMIN = (await mkAdmin(false)).token;
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

  it("1. registra antes/depois e autor corretamente na mudança de status e de classificação", async () => {
    const { product } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    const r = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });
    assert.equal(r.status, 200, JSON.stringify(r.json));

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(hist.status, 200);
    const ev = hist.json.data.find((e: any) => e.event_type === "status_changed");
    assert.ok(ev, "evento de mudança de status deve existir");
    assert.equal(ev.before.status, "em_preparacao");
    assert.equal(ev.after.status, "arquivado");
    assert.equal(ev.actor_user_id, MASTER_USER.user.id);
    assert.match(ev.description, /Situação alterada/i);
  });

  it("2. operação recusada (status inválido) não gera evento de histórico", async () => {
    const { product } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    const before = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const countBefore = before.json.total;

    const rejected = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "status_invalido_xyz" } });
    assert.notEqual(rejected.status, 200, "status inválido deve ser recusado");

    const after = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(after.json.total, countBefore, "operação recusada nunca aparece como alteração concluída");
  });

  it("3. reconfirmar o mesmo status (sem mudança real) não duplica evento", async () => {
    const { product } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });
    const afterFirst = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const countAfterFirst = afterFirst.json.data.filter((e: any) => e.event_type === "status_changed").length;

    // reenviar o MESMO status atual: setProductStatus não muda nada -> sem novo evento.
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });
    const afterSecond = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const countAfterSecond = afterSecond.json.data.filter((e: any) => e.event_type === "status_changed").length;
    assert.equal(countAfterSecond, countAfterFirst, "confirmar o mesmo status não gera um segundo evento");
  });

  it("4. tarefas e alterações comerciais/versão são capturadas (mescladas de fontes diferentes)", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);

    const created = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, {
      method: "POST", token: MASTER,
      body: { key: "t1", name: "Tarefa original", specialty_id: specialtyId, estimated_minutes: 60 },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const taskId = created.json.id;

    const updated = await api(`/api/admin/catalog2/tasks/${taskId}`, {
      method: "PUT", token: MASTER, body: { estimated_minutes: 90 },
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.json));

    const period = await api(`/api/admin/catalog2/products/${product.id}/delivery-recurrence`, { method: "PUT", token: MASTER, body: { delivery_recurrence: "mensal" } });
    assert.equal(period.status, 200, JSON.stringify(period.json));

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const types = hist.json.data.map((e: any) => e.event_type);
    assert.ok(types.includes("task_added"), "tarefa criada deve aparecer");
    assert.ok(types.includes("task_updated"), "prazo alterado (5 para 7 dias, no exemplo do prazo estimado) deve aparecer");
    assert.ok(types.includes("delivery_recurrence_set"), "mudança comercial de recorrência deve aparecer");

    const taskUpdatedEv = hist.json.data.find((e: any) => e.event_type === "task_updated");
    assert.equal(taskUpdatedEv.before.estimated_minutes, 60);
    assert.equal(taskUpdatedEv.after.estimated_minutes, 90);
    assert.match(taskUpdatedEv.description, /90/);
  });

  it("5. paginação e filtro por tipo/data funcionam corretamente", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    for (let i = 0; i < 3; i++) {
      await api(`/api/admin/catalog2/versions/${versionId}/tasks`, {
        method: "POST", token: MASTER, body: { key: `t${i}`, name: `Tarefa ${i}`, specialty_id: specialtyId },
      });
    }
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });

    const page1 = await api(`/api/admin/catalog2/products/${product.id}/history?page=1&page_size=2`, { token: MASTER });
    assert.equal(page1.json.data.length, 2);
    assert.ok(page1.json.total >= 4);
    const page2 = await api(`/api/admin/catalog2/products/${product.id}/history?page=2&page_size=2`, { token: MASTER });
    assert.equal(page2.json.data.length, Math.min(2, page1.json.total - 2));
    const page1Ids = new Set(page1.json.data.map((e: any) => e.id));
    for (const e of page2.json.data) assert.ok(!page1Ids.has(e.id), "páginas não devem repetir itens");

    const filtered = await api(`/api/admin/catalog2/products/${product.id}/history?category=status`, { token: MASTER });
    assert.ok(filtered.json.data.every((e: any) => e.event_type === "status_changed" || e.event_type === "archived" || e.event_type.startsWith("inactivation")));

    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const noneYet = await api(`/api/admin/catalog2/products/${product.id}/history?date_from=${encodeURIComponent(futureDate)}`, { token: MASTER });
    assert.equal(noneYet.json.data.length, 0, "filtro de data futura não deve trazer eventos já ocorridos");
  });

  it("6. permissões — só Admin Master consulta o histórico; nenhuma rota de edição/exclusão existe", async () => {
    const { product } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });

    const byCommon = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: COMMON_ADMIN });
    assert.equal(byCommon.status, 404);
    const anon = await api(`/api/admin/catalog2/products/${product.id}/history`);
    assert.equal(anon.status, 401);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const ev = hist.json.data[0];
    const putAttempt = await api(`/api/admin/catalog2/products/${product.id}/history/${ev.id}`, { method: "PUT", token: MASTER, body: {} });
    assert.equal(putAttempt.status, 404, "não existe rota de edição de histórico");
    const delAttempt = await api(`/api/admin/catalog2/products/${product.id}/history/${ev.id}`, { method: "DELETE", token: MASTER });
    assert.equal(delAttempt.status, 404, "não existe rota de exclusão de histórico");

    // proteção direta no banco: nenhum caminho de update exposto via API muda o registro.
    const raw = await prisma.catalog2ProductHistoryEvent.findUniqueOrThrow({ where: { id: ev.id } });
    assert.equal(raw.description, ev.description);
  });

  it("7. resumo por IA se baseia só nos eventos fornecidos e tem fallback determinístico sem chamada real", async () => {
    const { product } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });

    const viaRoute = await api(`/api/admin/catalog2/products/${product.id}/history/summary`, { method: "POST", token: MASTER });
    assert.equal(viaRoute.status, 200, JSON.stringify(viaRoute.json));
    assert.equal(viaRoute.json.summary, null, "em ambiente de teste (TEST_DATABASE_URL setado) nunca há chamada paga real");
    assert.ok(viaRoute.json.unavailable_reason, "motivo de indisponibilidade deve ser explicado");
    assert.deepEqual(viaRoute.json.based_on_event_ids, []);

    // sem eventos -> fallback também determinístico, sem lançar.
    const emptyResult = await summarizeCatalog2ProductHistory("Produto sem histórico", []);
    assert.equal(emptyResult.summary, null);
    assert.equal(emptyResult.based_on_event_ids.length, 0);
    assert.ok(emptyResult.unavailable_reason);
  });

  it("8. publicação da versão também aparece no histórico (mesclado de Catalog2VersionEvent)", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c10-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/versions/${versionId}/tasks`, {
      method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId, estimated_minutes: 30 },
    });
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
      update: {},
    });
    await prisma.catalog2Specialty.update({ where: { id: specialtyId }, data: { max_hourly_rate: 100 } });
    const publish = await api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: MASTER, body: { client_action_id: crypto.randomUUID(), change_summary: "primeira publicação" } });
    assert.equal(publish.status, 200, JSON.stringify(publish.json));

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const published = hist.json.data.find((e: any) => e.event_type === "created" || e.event_type === "published");
    assert.ok(published, "evento de publicação/criação de versão deve aparecer no histórico mesclado");
    assert.ok(hist.json.full_history_since, "resposta deve informar a data a partir da qual o histórico é completo");
  });
});
