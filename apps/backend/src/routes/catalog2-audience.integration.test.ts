import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, mkLeader, mkProduct, mkUser, SEL, startServer, stopServer, tokenFor, uid } from "../test-support/universal-helpers";

// Visibilidade do produto por público (C7): lista, detalhe, cotação, cesta e IA respeitam empresa / agência (+ nível) / interno.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
async function mkAgency(partner: boolean) {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { name: `[TESTE] AUD ${partner ? "partner" : "comum"} ${uid()}`, status: "ativo", owner_user_id: owner.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  if (partner) await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active" } as any });
  return { user: owner, token: tokenFor(owner) };
}
async function publicado() {
  const p = await mkProduct({ name: "Público", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
  const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  return p;
}
const lista = async (token: string, slug: string) => JSON.stringify((await api("/api/catalog2/products?page_size=60", { token })).json).includes(`"${slug}"`);
const detalhe = async (token: string, slug: string) => (await api(`/api/catalog2/products/${slug}`, { token })).status;
const cotar = async (token: string, productId: string) => (await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: SEL } })).status;

const vis = (id: string, audiences: string[]) => adm(`/products/${id}/visibility`, "PATCH", { audiences });
const slugOf = async (id: string) => (await prisma.catalog2Product.findUniqueOrThrow({ where: { id } })).slug;

describe("Visibilidade do produto por público — lista de marcação (C7)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("AU"); LEADER = await mkLeader(); });
  after(async () => { await stopServer(); });

  it("AU01. padrão é todos; valida público; lista vazia volta para todos; equipe interna é exclusiva", async () => {
    const p = await publicado();
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.product.id } })).visibility_mode, "all");
    assert.equal((await vis(p.product.id, ["xpto"])).status, 422);
    assert.equal((await vis(p.product.id, ["partner", "company"])).json.visibility_mode, "company,partner");
    assert.equal((await vis(p.product.id, ["company", "internal"])).json.visibility_mode, "internal");
    assert.equal((await vis(p.product.id, [])).json.visibility_mode, "all");
  });

  it("AU02. só Company: empresa vê e cota; agências (comum e partner) não; equipe interna vê", async () => {
    const p = await publicado();
    const comum = await mkAgency(false), partner = await mkAgency(true);
    await vis(p.product.id, ["company"]);
    const slug = await slugOf(p.product.id);
    assert.deepEqual([await lista(CO.token, slug), await lista(comum.token, slug), await lista(partner.token, slug), await lista(LEADER.token, slug)], [true, false, false, true]);
    assert.deepEqual([await detalhe(CO.token, slug), await detalhe(comum.token, slug)], [200, 404]);
    assert.equal(await cotar(CO.token, p.product.id), 201);
    assert.equal(await cotar(comum.token, p.product.id), 404);
  });

  it("AU03. só Agency Partner: parceira vê e cota; agência comum e empresa não", async () => {
    const p = await publicado();
    const comum = await mkAgency(false), partner = await mkAgency(true);
    await vis(p.product.id, ["partner"]);
    const slug = await slugOf(p.product.id);
    assert.deepEqual([await lista(partner.token, slug), await lista(comum.token, slug), await lista(CO.token, slug)], [true, false, false]);
    assert.equal(await cotar(partner.token, p.product.id), 201);
    assert.equal(await cotar(comum.token, p.product.id), 404);
  });

  it("AU04. Agency é só agência comum (partner NÃO vê); combinação Company + Agency Partner funciona", async () => {
    const p = await publicado();
    const comum = await mkAgency(false), partner = await mkAgency(true);
    await vis(p.product.id, ["agency"]);
    const slug = await slugOf(p.product.id);
    assert.deepEqual([await lista(comum.token, slug), await lista(partner.token, slug), await lista(CO.token, slug)], [true, false, false]);
    await vis(p.product.id, ["company", "partner"]);
    assert.deepEqual([await lista(comum.token, slug), await lista(partner.token, slug), await lista(CO.token, slug)], [false, true, true]);
  });

  it("AU05. só equipe interna: empresa e agência não veem; líder vê", async () => {
    const p = await publicado();
    const partner = await mkAgency(true);
    await vis(p.product.id, ["internal"]);
    const slug = await slugOf(p.product.id);
    assert.deepEqual([await lista(CO.token, slug), await lista(partner.token, slug), await lista(LEADER.token, slug)], [false, false, true]);
    assert.equal(await cotar(CO.token, p.product.id), 404);
  });

  it("AU06. nome do produto é um só: mudar o título comercial atualiza o nome interno", async () => {
    const p = await mkProduct({ name: "Rascunho", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
    const r = await adm(`/versions/${p.versionId}`, "PUT", { title: "Nome Único do Produto" });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.product.id } })).internal_name, "Nome Único do Produto");
  });

  it("AU07. prazo comercial em HORAS úteis: guarda as horas e o reflexo em dias; dado só em dias continua valendo", async () => {
    const p = await mkProduct({ name: "Prazo", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
    assert.equal((await adm(`/versions/${p.versionId}`, "PUT", { base_commercial_deadline_hours: 0 })).status, 400);
    assert.equal((await adm(`/versions/${p.versionId}`, "PUT", { base_commercial_deadline_hours: 20 })).status, 200);
    let v = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    assert.equal(v.base_commercial_deadline_hours, 20);
    assert.equal(v.base_commercial_deadline_days, 1, "20 h < 24 h = 1 dia (mínimo)");
    assert.equal((await adm(`/versions/${p.versionId}`, "PUT", { base_commercial_deadline_hours: 49 })).status, 200);
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } })).base_commercial_deadline_days, 3, "49 h = 3 dias (arredonda para cima)");
    assert.equal((await adm(`/versions/${p.versionId}`, "PUT", { base_commercial_deadline_days: 5 })).status, 200);
    v = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    assert.deepEqual([v.base_commercial_deadline_days, v.base_commercial_deadline_hours], [5, null]);
  });
});
