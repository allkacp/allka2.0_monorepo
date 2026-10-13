import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, startServer, stopServer } from "../test-support/universal-helpers";

// Tema da plataforma (Personalizar Sidebar): leitura para todos, escrita só do administrador; sem cadastro devolve vazio.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;

describe("Tema da plataforma · rotas", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("THM"); await prisma.platformTheme.deleteMany({}); });
  after(async () => { await prisma.platformTheme.deleteMany({}); await stopServer(); });

  it("THM01. sem cadastro devolve tema vazio e qualquer usuário consegue ler", async () => {
    const r = await api("/api/platform-theme", { token: CO.token });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual([r.json.settings, r.json.presets], [null, []]);
  });

  it("THM02. só o administrador salva; o tema salvo vale para os outros usuários", async () => {
    const settings = { backgroundColor: "custom-gradient:linear-gradient(135deg, #064e3b 0%, #10b981 100%)", headerBg: null };
    const presets = [{ id: "1", name: "Verde", value: settings.backgroundColor, preview: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)" }];
    assert.equal((await api("/api/platform-theme", { method: "PUT", token: CO.token, body: { settings } })).status, 403);
    assert.equal((await api("/api/platform-theme", { method: "PUT", token: ADMIN.token, body: { settings: "verde" } })).status, 400);
    const ok = await api("/api/platform-theme", { method: "PUT", token: ADMIN.token, body: { settings, presets } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const r = await api("/api/platform-theme", { token: CO.token });
    assert.deepEqual([r.json.settings, r.json.presets], [settings, presets]);
  });

  it("THM03. salvar só o tema mantém os degradês salvos", async () => {
    const settings = { backgroundColor: "bg-blue-900" };
    const ok = await api("/api/platform-theme", { method: "PUT", token: ADMIN.token, body: { settings } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.deepEqual(ok.json.settings, settings);
    assert.equal(ok.json.presets.length, 1);
  });
});
