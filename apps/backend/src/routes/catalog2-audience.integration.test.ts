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
async function mkAgency(partner: boolean, level?: string) {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { name: `[TESTE] AUD ${partner ? "partner" : "comum"} ${uid()}`, status: "ativo", owner_user_id: owner.id, ...(level ? { partner_level: level } : {}) } });
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

  it("AU-NIV. níveis de agência: restringe só agências (lista, detalhe, cotação); empresas e equipe não são afetadas; vazio ou todos = sem restrição", async () => {
    // como no sistema real: os cinco níveis iniciais estão cadastrados
    if ((await prisma.partnerLevel.count()) === 0) for (const [i, n] of ["Bronze", "Silver", "Gold", "Platinum", "Diamond"].entries()) await prisma.partnerLevel.create({ data: { name: n, sort_order: i + 1 } });
    const gold = await mkAgency(false, "gold"), bronze = await mkAgency(false, "bronze"), partnerGold = await mkAgency(true, "gold");
    const p = await publicado();
    const slug = await slugOf(p.product.id);
    // inválido
    assert.equal((await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: [], agency_levels: ["ouro"] })).status, 422);
    // só Gold e Platinum
    const ok = await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: [], agency_levels: ["Gold", "platinum"] });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(ok.json.visibility_agency_levels, ",gold,platinum,");
    assert.deepEqual(ok.json.agency_levels, ["gold", "platinum"]);
    assert.equal(await lista(gold.token, slug), true, "agência Gold vê");
    assert.equal(await lista(partnerGold.token, slug), true, "partner Gold vê");
    assert.equal(await lista(bronze.token, slug), false, "agência Bronze não vê");
    assert.equal(await detalhe(gold.token, slug), 200);
    assert.equal(await detalhe(bronze.token, slug), 404);
    assert.equal(await cotar(bronze.token, p.product.id), 404, "Bronze não cota");
    assert.equal(await lista(CO.token, slug), true, "empresa não é afetada");
    assert.equal(await lista(LEADER.token, slug), true, "líder vê");
    assert.equal(await detalhe(ADMIN.token, slug), 200);
    // trocar só o público mantém os níveis; "somente Company" limpa os níveis
    const keep = await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: ["agency", "partner"] });
    assert.equal(keep.json.visibility_agency_levels, ",gold,platinum,");
    const co = await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: ["company"] });
    assert.equal(co.json.visibility_agency_levels, null);
    // todos os níveis marcados = sem restrição
    // os níveis oferecidos são os CADASTRADOS: a lista reflete a tabela de níveis
    const reg = await adm("/agency-levels");
    assert.equal(reg.status, 200);
    const keys = reg.json.data.map((l: any) => l.key);
    assert.ok(keys.includes("gold") && keys.includes("bronze"), "traz os níveis cadastrados");
    // cadastrar um nível novo faz ele aparecer, aceitar agência nesse nível e valer como filtro do produto
    const novoNome = "Elite " + uid();
    await prisma.partnerLevel.create({ data: { name: novoNome, sort_order: 99 } });
    const reg2 = await adm("/agency-levels");
    const novoKey = novoNome.toLowerCase();
    assert.ok(reg2.json.data.some((l: any) => l.key === novoKey), "nível novo aparece na lista");
    const elite = await mkAgency(false, novoKey);
    const soElite = await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: [], agency_levels: [novoKey] });
    assert.equal(soElite.status, 200, JSON.stringify(soElite.json));
    assert.equal(await lista(elite.token, slug), true, "agência do nível novo vê");
    assert.equal(await lista(gold.token, slug), false, "Gold não vê (só o nível novo)");
    // todos os níveis cadastrados marcados = sem restrição
    await adm(`/products/${p.product.id}/visibility`, "PATCH", { audiences: [], agency_levels: [...keys, novoKey] });
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: p.product.id } })).visibility_agency_levels, null);
    assert.equal(await lista(bronze.token, slug), true, "todos os níveis: Bronze volta a ver");
  });
});
