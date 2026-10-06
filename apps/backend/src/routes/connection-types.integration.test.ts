import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, mkUser, startServer, stopServer, tokenFor, uid } from "../test-support/universal-helpers";

// Tipos de acesso criados pelo admin (ex.: Tray): campos que o cliente preenche, liberação por API, exclusão só pelo Admin Master.
let MASTER: Awaited<ReturnType<typeof mkAdmin>>;
let COMUM: { token: string };
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown, token = MASTER.token) => api(`/api/admin/catalog2${p}`, { method, token, body });
const tipo = (k: string, extra: Record<string, unknown> = {}) => ({
  key: k, name: `Tray ${k}`, allowed_methods: ["api_key", "user_invite"], permission_levels: [{ key: "read", label: "Leitura" }],
  fields: [{ key: "loja_id", label: "ID da loja", type: "text", required: true }, { key: "api_url", label: "Endereço da API", type: "url", required: false }], ...extra,
});

describe("Tipos de acesso (catálogo global)", () => {
  before(async () => {
    await startServer(); MASTER = await mkAdmin(); CO = await mkCompanyUser("CT");
    const p = await prisma.adminProfile.create({ data: { name: `Comum ${uid()}`, is_master: false, is_active: true } });
    const u = await mkUser("admin", "admin", { admin_profile_id: p.id });
    COMUM = { token: tokenFor(u) };
  });
  after(async () => { await stopServer(); });

  it("CT01. cria tipo novo com liberação por API e campos; valida campos (segredo no tipo certo, sem repetição)", async () => {
    const k = `tray_${uid()}`;
    const ok = await adm("/connection-types", "POST", tipo(k));
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.deepEqual(ok.json.fields.map((f: any) => f.key), ["loja_id", "api_url"]);
    assert.ok(ok.json.allowed_methods.includes("api_key"));
    const lista = await adm("/connection-types");
    assert.ok(lista.json.data.find((t: any) => t.key === k)?.fields.length === 2, "volta no catálogo com os campos");
    assert.equal((await adm("/connection-types", "POST", tipo(`${k}b`, { fields: [{ key: "api_key", label: "Chave", type: "text", required: true }] }))).status, 422, "campo de chave como texto comum é recusado");
    assert.equal((await adm("/connection-types", "POST", tipo(`${k}c`, { fields: [{ key: "x1", label: "A", type: "text" }, { key: "x1", label: "B", type: "text" }] }))).status, 422, "campo repetido");
    assert.equal((await adm("/connection-types", "POST", tipo(`${k}d`, { fields: [{ key: "chave_api", label: "Chave de API", type: "secret", required: true }] }))).status, 201, "segredo é aceito como segredo");
  });

  it("CT02. cliente preenche os campos; sem os obrigatórios não envia para validação", async () => {
    const k = `tray_${uid()}`;
    const t = await adm("/connection-types", "POST", tipo(k));
    const id = t.json.id as number;
    const desconhecido = await api("/api/connections", { method: "POST", token: CO.token, body: { connection_type_id: id, method: "api_key", fields: [{ key: "inexistente", value: "1" }] } });
    assert.equal(desconhecido.status, 422);
    const c = await api("/api/connections", { method: "POST", token: CO.token, body: { connection_type_id: id, method: "user_invite", label: "Minha Tray", fields: [{ key: "api_url", value: "https://loja.exemplo.com/api" }] } });
    assert.equal(c.status, 201, JSON.stringify(c.json));
    assert.equal(c.json.field_values.api_url, "https://loja.exemplo.com/api");
    const sem = await api(`/api/connections/${c.json.id}/submit`, { method: "POST", token: CO.token });
    assert.equal(sem.status, 422);
    assert.match(sem.json.error, /ID da loja/);
    assert.equal((await api(`/api/connections/${c.json.id}`, { method: "PATCH", token: CO.token, body: { fields: [{ key: "loja_id", value: "L-123" }] } })).status, 200);
    assert.equal((await api(`/api/connections/${c.json.id}/submit`, { method: "POST", token: CO.token })).status, 200);
    assert.equal((await api("/api/connections", { method: "POST", token: CO.token, body: { connection_type_id: id, method: "user_invite", fields: [{ key: "api_url", value: "isso nao e url" }] } })).status, 422, "URL inválida");
  });

  it("CT03. excluir: só Admin Master; bloqueado se em uso; tipo da semente excluído não volta", async () => {
    const k = `tray_${uid()}`;
    const t = await adm("/connection-types", "POST", tipo(k));
    assert.ok([403, 404].includes((await adm(`/connection-types/${t.json.id}`, "DELETE", undefined, COMUM.token)).status), "admin comum não exclui");
    // em uso por uma conexão de cliente → recusa
    await api("/api/connections", { method: "POST", token: CO.token, body: { connection_type_id: t.json.id, method: "user_invite" } });
    const uso = await adm(`/connection-types/${t.json.id}`, "DELETE");
    assert.equal(uso.status, 409);
    assert.match(uso.json.error, /em uso/);
    // sem uso → exclui
    const livre = await adm("/connection-types", "POST", tipo(`${k}z`));
    assert.equal((await adm(`/connection-types/${livre.json.id}`, "DELETE")).status, 200);
    assert.equal((await adm("/connection-types")).json.data.some((x: any) => x.key === `${k}z`), false);
    // semente padrão excluída não é recriada
    const dominio = (await adm("/connection-types")).json.data.find((x: any) => x.key === "domain");
    assert.ok(dominio, "o tipo da semente existe");
    assert.equal((await adm(`/connection-types/${dominio.id}`, "DELETE")).status, 200);
    assert.equal((await adm("/connection-types")).json.data.some((x: any) => x.key === "domain"), false, "não volta com a semente");
    // recriar com a mesma chave limpa o marcador
    assert.equal((await adm("/connection-types", "POST", tipo("domain"))).status, 201);
    assert.equal((await adm("/connection-types")).json.data.some((x: any) => x.key === "domain"), true);
  });
});
