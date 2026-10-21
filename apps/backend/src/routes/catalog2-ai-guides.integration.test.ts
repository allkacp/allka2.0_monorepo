import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { __setDraftGeneratorForTests, guidesPromptBlock } from "../lib/catalog2-product-draft-ai";
import { api, mkAdmin, mkCompanyUser, mkProduct, startServer, stopServer } from "../test-support/universal-helpers";

// R21-18 (reunião 21/10): área de guias e métodos que a IA de preenchimento do produto consulta.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown, token = ADMIN.token) => api(`/api/admin/catalog2${p}`, { method, token, body });

describe("Guias e métodos da IA (R21-18)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("GUI"); });
  after(async () => { __setDraftGeneratorForTests(null); await stopServer(); });

  it("G01. o bloco do prompt traz só os guias e respeita o limite de tamanho", () => {
    assert.equal(guidesPromptBlock([]), "");
    assert.equal(guidesPromptBlock(undefined), "");
    const b = guidesPromptBlock([{ title: "Método PLA", content: "Passo 1" }, { title: "Grande", content: "x".repeat(50000) }]);
    assert.match(b, /Método PLA/);
    assert.ok(b.length < 13000, "limitado a ~12 mil caracteres");
  });

  it("G02. criar, listar, desativar e apagar guia; validação; cliente não acessa", async () => {
    assert.equal((await adm("/ai-guides", "POST", { title: "x", content: "curto" })).status, 400);
    const c = await adm("/ai-guides", "POST", { title: "Método PLA", content: "Primeiro defina o público; depois o canal." });
    assert.equal(c.status, 201, JSON.stringify(c.json));
    assert.ok((await adm("/ai-guides")).json.guides.some((g: any) => g.id === c.json.id));
    const off = await adm(`/ai-guides/${c.json.id}`, "PUT", { is_active: false });
    assert.equal(off.json.is_active, false);
    assert.notEqual((await adm("/ai-guides", "GET", undefined, CO.token)).status, 200, "cliente não vê");
    assert.equal((await adm(`/ai-guides/${c.json.id}`, "DELETE")).status, 200);
  });

  it("G03. a IA recebe só os guias ATIVOS ao preencher um produto", async () => {
    const on = await adm("/ai-guides", "POST", { title: "Guia Ativo G03", content: "Sempre cite o canal principal." });
    const off = await adm("/ai-guides", "POST", { title: "Guia Inativo G03", content: "Não deve aparecer nunca.", is_active: false });
    const p = await mkProduct({ name: "Produto G03", tasks: [{ key: "t" }] });
    let visto: any = null;
    __setDraftGeneratorForTests(async (input) => { visto = input; return { reply: "ok", title: "T", full_description: "D" }; });
    const r = await adm(`/products/${p.product.id}/ai-draft`, "POST", { messages: [{ role: "user", text: "Produto de teste" }], current: null });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const titulos = (visto.existing.guides as { title: string }[]).map((g) => g.title);
    assert.ok(titulos.includes("Guia Ativo G03"));
    assert.ok(!titulos.includes("Guia Inativo G03"));
    await adm(`/ai-guides/${on.json.id}`, "DELETE"); await adm(`/ai-guides/${off.json.id}`, "DELETE");
  });
});
