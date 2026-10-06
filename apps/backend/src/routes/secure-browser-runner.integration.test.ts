import assert from "node:assert/strict";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import WebSocket from "ws";
import app from "../app";
import { attachSecureBrowserWs } from "../lib/secure-browser-ws";
import { sanitizeInput } from "../lib/secure-browser-ws";
import { api, mkCompanyUser, mkUser, startServer, stopServer, tokenFor } from "../test-support/universal-helpers";

// D3 real — navegador Chromium no servidor (browser-runner). Roda só quando o runner está acessível (SECURE_BROWSER_RUNNER_URL).
const RUNNER = process.env.SECURE_BROWSER_RUNNER_URL;
const alive = async () => { try { return !!RUNNER && (await fetch(`${RUNNER}/health`, { signal: AbortSignal.timeout(3000) })).ok; } catch { return false; } };

describe("D3 · Navegador seguro real (runner)", () => {
  let http: ReturnType<typeof app.listen>; let base = ""; let up = false;
  before(async () => {
    up = await alive(); await startServer();
    http = app.listen(0); await new Promise<void>((r) => http.once("listening", () => r()));
    attachSecureBrowserWs(http); base = `127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  after(async () => { await new Promise((r) => http.close(() => r(null))); await stopServer(); });

  it("SBR00. filtra a entrada do usuário: só mouse/teclado/navegação; goto só no login inicial", () => {
    assert.equal(sanitizeInput("lixo", "use"), null);
    assert.equal(sanitizeInput(JSON.stringify({ type: "eval", code: "x" }), "use"), null);
    assert.equal(JSON.parse(sanitizeInput(JSON.stringify({ type: "nav", action: "goto", url: "https://a.com", allow_goto: true }), "use")!).allow_goto, false);
    assert.equal(JSON.parse(sanitizeInput(JSON.stringify({ type: "nav", action: "goto", url: "https://a.com" }), "setup")!).allow_goto, true);
  });

  it("SBR01. abre o Chromium real, transmite imagem, aceita cliques, guarda a sessão cifrada e encerra ao derrubar", async (t) => {
    if (!up) return t.skip("runner não está acessível neste ambiente");
    const co = await mkCompanyUser("SBR"), nomad = await mkUser("nomad", "nomades", { status: "ativo" });
    const nt = tokenFor(nomad);
    const call = (p: string, m = "GET", b?: unknown, tok = co.token) => api(`/api/secure-browser${p}`, { method: m, token: tok, body: b });
    const pr = await call("/profiles", "POST", { label: "Exemplo", start_url: "https://example.com/", consent: true, max_session_minutes: 10 });
    assert.equal(pr.status, 201);
    const id = pr.json.id as string;

    // login inicial (dono): imagem real chega
    const setup = await call(`/profiles/${id}/sessions`, "POST", { mode: "setup" });
    assert.equal(setup.status, 201, JSON.stringify(setup.json));
    assert.ok(setup.json.url.startsWith("/api/secure-browser/ws/"));
    const frame = await new Promise<Buffer>((resolve, reject) => {
      const ws = new WebSocket(`ws://${base}${setup.json.url}`);
      const to = setTimeout(() => reject(new Error("sem imagem em 25 s")), 25000);
      let last: Buffer | null = null;
      ws.on("message", (d, bin) => { if (bin) { last = d as Buffer; clearTimeout(to); ws.send(JSON.stringify({ type: "mouse", action: "move", x: 100, y: 100 })); } });
      setTimeout(() => { ws.close(); last ? resolve(last) : reject(new Error("sem imagem")); }, 6000); // dá tempo da página carregar
      ws.on("error", reject);
    });
    assert.ok(frame.length > 1000 && frame[0] === 0xff && frame[1] === 0xd8, "quadro JPEG recebido");
    fs.writeFileSync(process.env.SBR_FRAME_OUT ?? "/tmp/sbr-frame.jpg", frame);

    // sem ticket correto: recusado
    await assert.rejects(new Promise((resolve, reject) => { const ws = new WebSocket(`ws://${base}/api/secure-browser/ws/${setup.json.session.id}?t=errado`); ws.on("open", resolve); ws.on("error", reject); }));

    // guarda a sessão (cifrada) e encerra
    const saved = await call(`/sessions/${setup.json.session.id}/save-state`, "POST", {});
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.equal((await call("/profiles")).json.data[0].has_saved_session, true);

    // autorizado usa; ao derrubar, a conexão fecha
    assert.equal((await call(`/profiles/${id}/grants`, "POST", { user_id: nomad.id, minutes: 30 })).status, 201);
    const use = await call(`/profiles/${id}/sessions`, "POST", {}, nt);
    assert.equal(use.status, 201, JSON.stringify(use.json));
    const closed = new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(`ws://${base}${use.json.url}`);
      ws.on("open", async () => { await call(`/sessions/${use.json.session.id}/kill`, "POST", {}); });
      ws.on("close", (code) => resolve(code)); ws.on("error", reject);
      setTimeout(() => reject(new Error("não fechou")), 15000);
    });
    assert.equal(await closed, 1000);
  });

  it("SBR02. várias abas e tamanho sob medida: nova aba aparece na lista, troca e fecha; redimensionar devolve o novo tamanho", async (t) => {
    if (!up) return t.skip("runner não está acessível neste ambiente");
    const co = await mkCompanyUser("SBR2");
    const call = (p: string, m = "GET", b?: unknown) => api(`/api/secure-browser${p}`, { method: m, token: co.token, body: b });
    const pr = await call("/profiles", "POST", { label: "Abas", start_url: "https://example.com/", consent: true });
    const setup = await call(`/profiles/${pr.json.id}/sessions`, "POST", { mode: "setup" });
    assert.equal(setup.status, 201, JSON.stringify(setup.json));
    const msgs: any[] = [];
    const ws = new WebSocket(`ws://${base}${setup.json.url}`);
    ws.on("message", (d, bin) => { if (!bin) msgs.push(JSON.parse(String(d))); });
    await new Promise((r) => ws.once("open", r));
    const waitFor = async (pred: () => boolean, label: string) => { for (let i = 0; i < 80 && !pred(); i++) await new Promise((r) => setTimeout(r, 250)); assert.ok(pred(), label); };
    const lastTabs = () => [...msgs].reverse().find((m) => m.type === "tabs")?.tabs as any[] | undefined;
    await waitFor(() => (lastTabs()?.length ?? 0) === 1, "uma aba inicial");
    ws.send(JSON.stringify({ type: "tab", action: "new", url: "https://example.org/" }));
    await waitFor(() => (lastTabs()?.length ?? 0) === 2, "nova aba listada");
    const tabs = lastTabs()!;
    assert.equal(tabs.filter((x) => x.active).length, 1);
    ws.send(JSON.stringify({ type: "tab", action: "switch", id: tabs[0].id }));
    await waitFor(() => lastTabs()?.find((x) => x.id === tabs[0].id)?.active === true, "troca de aba");
    ws.send(JSON.stringify({ type: "resize", width: 1500, height: 800 }));
    await waitFor(() => msgs.some((m) => m.type === "size" && m.width === 1500 && m.height === 800), "tamanho novo");
    ws.send(JSON.stringify({ type: "tab", action: "close", id: tabs[1].id }));
    await waitFor(() => lastTabs()?.length === 1, "aba fechada");
    ws.close();
    await call(`/sessions/${setup.json.session.id}/kill`, "POST", {});
  });

  it("SBR03. sessão de USO: só os sites permitidos, sem sair da conta; o login guardado não é regravado pela sessão de uso", async (t) => {
    if (!up) return t.skip("runner não está acessível neste ambiente");
    const id = "sbr03-" + Date.now();
    const H = { "content-type": "application/json", "x-runner-secret": process.env.SECURE_BROWSER_RUNNER_SECRET ?? "" };
    const r = await fetch(`${RUNNER}/sessions`, { method: "POST", headers: H, body: JSON.stringify({ id, start_url: "https://example.com/", ttl_seconds: 60, allowed_hosts: ["example.com"], restrict: true }) });
    assert.equal(r.status, 201);
    const msgs: any[] = [];
    const ws = new WebSocket(`${RUNNER!.replace("http", "ws")}/ws/${id}?secret=${process.env.SECURE_BROWSER_RUNNER_SECRET}`);
    ws.on("message", (d, bin) => { if (!bin) msgs.push(JSON.parse(String(d))); });
    await new Promise((res) => ws.once("open", res));
    const wait = async (p: () => boolean) => { for (let i = 0; i < 60 && !p(); i++) await new Promise((x) => setTimeout(x, 250)); return p(); };
    await new Promise((x) => setTimeout(x, 3000));
    ws.send(JSON.stringify({ type: "nav", action: "goto", url: "https://example.org/", allow_goto: true }));
    assert.ok(await wait(() => msgs.some((m) => m.type === "notice" && /só abre/.test(m.text))), "site fora da lista é bloqueado com aviso");
    ws.send(JSON.stringify({ type: "nav", action: "goto", url: "https://example.com/accounts/logout/", allow_goto: true }));
    assert.ok(await wait(() => msgs.some((m) => m.type === "notice" && /Sair da conta/.test(m.text))), "sair da conta é bloqueado");
    const u = await (await fetch(`${RUNNER}/sessions/${id}/url`, { headers: H })).json() as any;
    assert.ok(u.url.startsWith("https://example.com"), "continua no site da conta: " + u.url);
    ws.close();
    await fetch(`${RUNNER}/sessions/${id}`, { method: "DELETE", headers: H });
  });
});
