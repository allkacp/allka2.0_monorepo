// Runner do navegador seguro. NUNCA exposto publicamente: só o backend fala com ele (cabeçalho/parâmetro com segredo compartilhado).
// - POST   /sessions            { id, start_url, storage_state?, ttl_seconds, width?, height? }  abre um contexto isolado do Chromium
// - DELETE /sessions/:id        encerra
// - POST   /sessions/:id/export-state   devolve o storageState (cookies/localStorage) para o backend cifrar no cofre
// - WS     /ws/:id?secret=...   frames JPEG (binário) + eventos de entrada do usuário (JSON)
// Proteções: sem downloads, sem permissões do navegador, sem acesso a rede privada/metadados (SSRF), uma página por sessão, TTL rígido.
const http = require("node:http");
const dns = require("node:dns").promises;
const net = require("node:net");
const crypto = require("node:crypto");
const { chromium } = require("playwright-core");
const { WebSocketServer } = require("ws");

const SECRET = process.env.RUNNER_SECRET || "";
const PORT = Number(process.env.PORT || 7000);
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 5);
if (!SECRET) { console.error("RUNNER_SECRET não configurado"); process.exit(1); }

let browserPromise = null;
const getBrowser = () => (browserPromise ??= chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-features=Translate", "--disable-background-networking"] }));
const sessions = new Map(); // id -> { context, page, cdp, timer, sockets:Set, vw, vh }

// ── SSRF: bloqueia endereços privados/locais/metadados e esquemas que não são http(s)
const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:127.") || l.startsWith("::ffff:10.") || l.startsWith("::ffff:192.168.");
};
const hostCache = new Map();
async function hostIsBlocked(hostname) {
  if (!hostname) return true;
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h === "host.docker.internal") return true;
  if (net.isIP(h)) return isPrivateIp(h);
  const hit = hostCache.get(h);
  if (hit && Date.now() - hit.t < 60000) return hit.blocked;
  let blocked = false;
  try { const r = await dns.lookup(h, { all: true }); blocked = r.length === 0 || r.some((x) => isPrivateIp(x.address)); } catch { blocked = true; }
  hostCache.set(h, { t: Date.now(), blocked });
  return blocked;
}
async function urlAllowed(raw) {
  let u; try { u = new URL(raw); } catch { return false; }
  if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") return true;
  if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "ws:" && u.protocol !== "wss:") return false;
  return !(await hostIsBlocked(u.hostname));
}

const MAX_TABS = 8;
// Qualidade da imagem: JPEG 80 e resolução física da tela de quem assiste (dpr), para o texto ficar nítido.
const CAPTURE_QUALITY = Number(process.env.CAPTURE_QUALITY || 85); // qualidade da imagem enviada (JPEG, resolução física da tela de quem assiste)
const MIN_GAP_MS = Number(process.env.MIN_GAP_MS || 40);
// O screencast do Chromium ignora o zoom/escala e entrega imagem reamostrada (borrada). Por isso ele só serve de AVISO de que a tela mudou
// (quadros minúsculos); a imagem que o usuário vê vem de captureScreenshot, que desenha nativamente na resolução física.
const shotOpts = () => ({ format: "jpeg", quality: 40, maxWidth: 640, maxHeight: 640, everyNthFrame: 1 });
// O screencast só entrega a imagem no tamanho "CSS" da página (borrada em telas de alta densidade). Por isso, quando a imagem para de mudar
// (350 ms), tiramos uma captura nítida na resolução física de quem assiste (dpr) e enviamos por cima.
const applyMetrics = (s, tab) => tab.cdp.send("Emulation.setDeviceMetricsOverride", { width: s.vw, height: s.vh, deviceScaleFactor: s.dsf, mobile: false }).catch(() => {});
function scheduleSettle(s) { s.dirty = true; if (!s.capturing) void captureLoop(s); }
async function captureLoop(s) {
  s.capturing = true;
  try {
    while (s.dirty && s.sockets.size) {
      s.dirty = false;
      const wait = MIN_GAP_MS - (Date.now() - (s.lastCapture || 0));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const tab = s.pages.get(s.active); if (!tab) break;
      try {
        const r = await tab.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: CAPTURE_QUALITY });
        const buf = Buffer.from(r.data, "base64");
        s.lastCapture = Date.now();
        if (s.active === tab.id) for (const ws of s.sockets) if (ws.readyState === 1 && ws.bufferedAmount < 4_000_000) ws.send(buf, { binary: true });
      } catch { /* aba fechando ou carregando */ }
    }
  } finally { s.capturing = false; }
}
const clampW = (n) => Math.min(Math.max(Number(n) || 1280, 480), 2560), clampH = (n) => Math.min(Math.max(Number(n) || 720, 300), 1440);
const sendAll = (s, payload) => { const data = typeof payload === "string" ? payload : JSON.stringify(payload); for (const ws of s.sockets) if (ws.readyState === 1) ws.send(data); };

// Navegação bloqueada deixa a aba numa página de erro; volta para a última página permitida.
const lastGood = new WeakMap();
function restoreAfterBlock(req) {
  try {
    if (!req.isNavigationRequest()) return;
    const page = req.frame().page();
    const back = lastGood.get(page);
    if (back) setTimeout(() => page.goto(back, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}), 150);
  } catch { /* melhor esforço */ }
}
const LOGOUT_RE = /log[-_]?out|sign[-_]?out/i;
const hostAllowed = (host, list) => list.some((h) => host === h || host.endsWith("." + h));
async function openSession({ id, start_url, storage_state, ttl_seconds, width, height, allowed_hosts, restrict }) {
  if (sessions.has(id)) throw Object.assign(new Error("Sessão já existe."), { status: 409 });
  if (sessions.size >= MAX_SESSIONS) throw Object.assign(new Error("Capacidade do navegador esgotada."), { status: 503 });
  if (!(await urlAllowed(start_url))) throw Object.assign(new Error("Endereço não permitido."), { status: 422 });
  const browser = await getBrowser();
  const vw = clampW(width), vh = clampH(height);
  const context = await browser.newContext({
    viewport: null, acceptDownloads: false, permissions: [], serviceWorkers: "block", locale: "pt-BR", timezoneId: "America/Sao_Paulo",
    ...(storage_state ? { storageState: storage_state } : {}),
  });
  const hosts = Array.isArray(allowed_hosts) ? allowed_hosts.map((h) => String(h).toLowerCase()) : [];
  let sref = null; // preenchido logo abaixo; usado para avisar quem está na tela
  await context.route("**/*", async (route) => {
    const req = route.request();
    const ok = await urlAllowed(req.url());
    if (!ok) return route.abort("blockedbyclient");
    if (restrict) { // sessão de USO: só os sites da conta e nada de sair/trocar de conta
      let u; try { u = new URL(req.url()); } catch { u = null; }
      if (u && (u.protocol === "http:" || u.protocol === "https:")) {
        if (LOGOUT_RE.test(u.pathname)) { if (sref && req.isNavigationRequest()) sendAll(sref, { type: "notice", text: "Sair da conta está bloqueado neste navegador." }); restoreAfterBlock(req); return route.abort("blockedbyclient"); }
        if (req.isNavigationRequest() && req.frame() === req.frame().page().mainFrame() && hosts.length && !hostAllowed(u.hostname.toLowerCase(), hosts)) { if (sref) sendAll(sref, { type: "notice", text: `Este navegador só abre: ${hosts.join(", ")}.` }); restoreAfterBlock(req); return route.abort("blockedbyclient"); }
      }
    }
    return route.continue();
  });
  const s = { id, context, pages: new Map(), active: null, nextTab: 1, sockets: new Set(), dirty: false, capturing: false, lastCapture: 0, vw, vh, dsf: 1, pxW: vw, pxH: vh, queue: [], draining: false, settleTimer: null, timer: null, streaming: false, tabsTimer: null };
  // Várias abas: popups/links "nova aba" viram abas do nosso navegador (até MAX_TABS).
  context.on("page", (p) => { void addTab(s, p, true); });
  s.timer = setTimeout(() => closeSession(id).catch(() => {}), Math.max(30, Number(ttl_seconds) || 3600) * 1000);
  sessions.set(id, s); sref = s;
  const page = await context.newPage();
  page.goto(start_url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  return { ok: true, width: vw, height: vh };
}
async function addTab(s, page, activate) {
  if (s.pages.size >= MAX_TABS) { await page.close().catch(() => {}); return null; }
  const tid = String(s.nextTab++);
  if ([...s.pages.values()].some((t) => t.page === page)) return null;
  const cdp = await s.context.newCDPSession(page);
  const tab = { id: tid, page, cdp };
  s.pages.set(tid, tab);
  page.on("download", (d) => d.cancel().catch(() => {}));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  page.on("framenavigated", (fr) => { if (fr === page.mainFrame()) { void applyMetrics(s, tab); const u = fr.url(); if (/^https?:/.test(u)) lastGood.set(page, u); } scheduleTabs(s); });
  page.on("domcontentloaded", () => scheduleTabs(s));
  page.on("close", () => { s.pages.delete(tid); if (s.active === tid) { const next = [...s.pages.keys()].pop(); if (next) void activateTab(s, next); else s.active = null; } scheduleTabs(s); });
  cdp.on("Page.screencastFrame", (f) => {
    // A própria captura nítida provoca um "repintar" idêntico: quadros iguais ao anterior são descartados (senão a imagem nítida
    // seria trocada por uma versão leve e borrada, e o ciclo se repetiria).
    const h = crypto.createHash("md5").update(f.data).digest("hex");
    if (h === tab.lastHash) { cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); return; }
    tab.lastHash = h;
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    if (s.active === tid) scheduleSettle(s);
  });
  await applyMetrics(s, tab); // depois dos ouvintes: a navegação inicial não pode passar despercebida
  if (activate || !s.active) await activateTab(s, tid); else scheduleTabs(s);
  return tab;
}
async function activateTab(s, tid) {
  const tab = s.pages.get(tid); if (!tab) return;
  const prev = s.active && s.pages.get(s.active);
  s.active = tid;
  if (prev && prev !== tab) await prev.cdp.send("Page.stopScreencast").catch(() => {});
  await tab.page.bringToFront().catch(() => {});
  if (s.streaming || s.sockets.size > 0) { s.streaming = true; await tab.cdp.send("Page.stopScreencast").catch(() => {}); await tab.cdp.send("Page.startScreencast", shotOpts()).catch(() => {}); }
  scheduleTabs(s);
}
function scheduleTabs(s) { clearTimeout(s.tabsTimer); s.tabsTimer = setTimeout(() => { broadcastTabs(s).catch(() => {}); }, 150); }
async function tabsPayload(s) {
  const tabs = [];
  for (const t of s.pages.values()) { let title = ""; try { title = await t.page.title(); } catch { /* aba carregando */ } tabs.push({ id: t.id, title: title.slice(0, 80), url: t.page.url().slice(0, 300), active: t.id === s.active }); }
  return { type: "tabs", tabs };
}
async function broadcastTabs(s) { if (s.sockets.size) sendAll(s, await tabsPayload(s)); }
async function resizeSession(s, w, h, dprIn, zoomIn) {
  const z = Math.min(2, Math.max(0.25, Number(zoomIn) || 1));
  let d = Math.min(2.5, Math.max(1, Number(dprIn) || 1));
  const aw = Math.min(3840, Math.max(300, Math.round(Number(w) || 1280))), ah = Math.min(2160, Math.max(200, Math.round(Number(h) || 720)));
  if (aw * d > 2560) d = Math.max(1, 2560 / aw); // limita o peso da imagem
  const vw = Math.min(3840, Math.max(320, Math.round(aw / z))), vh = Math.min(2160, Math.max(240, Math.round(ah / z)));
  const dsf = Math.min(3, Math.max(0.25, (aw * d) / vw));
  const changed = vw !== s.vw || vh !== s.vh || Math.abs(dsf - s.dsf) > 0.001;
  s.vw = vw; s.vh = vh; s.dsf = dsf; s.pxW = Math.round(vw * dsf); s.pxH = Math.round(vh * dsf);
  if (changed) {
    for (const t of s.pages.values()) await applyMetrics(s, t);
    const act = s.pages.get(s.active);
    if (act && s.streaming) { await act.cdp.send("Page.stopScreencast").catch(() => {}); await act.cdp.send("Page.startScreencast", shotOpts()).catch(() => {}); scheduleSettle(s); }
  }
  sendAll(s, { type: "size", width: vw, height: vh, dpr: dsf }); // responde sempre: a tela só mostra imagem depois de acertar o tamanho
}
async function closeSession(id) {
  const s = sessions.get(id); if (!s) return false;
  sessions.delete(id); clearTimeout(s.timer); clearTimeout(s.tabsTimer); clearTimeout(s.settleTimer);
  for (const ws of s.sockets) { try { ws.close(1000, "session_closed"); } catch { /* ignore */ } }
  await s.context.close().catch(() => {});
  return true;
}
async function startStream(s) {
  const a = s.pages.get(s.active); if (!a) return;
  s.streaming = true; // novo espectador: reinicia para receber um quadro atual imediatamente
  await a.cdp.send("Page.stopScreencast").catch(() => {});
  await a.cdp.send("Page.startScreencast", shotOpts()).catch(() => {});
  scheduleSettle(s); // manda já uma imagem completa
  scheduleTabs(s);
}
// Entrada do usuário em fila (ordem preservada); só o último "mover mouse" pendente vale, para não acumular atraso.
function pushInput(s, m) {
  const last = s.queue[s.queue.length - 1];
  if (m.type === "mouse" && m.action === "move" && last && last.type === "mouse" && last.action === "move") s.queue[s.queue.length - 1] = m;
  else if (m.type === "resize" && last && last.type === "resize") s.queue[s.queue.length - 1] = m;
  else s.queue.push(m);
  if (s.queue.length > 400) s.queue.splice(0, s.queue.length - 400);
  if (!s.draining) void drain(s);
}
async function drain(s) {
  s.draining = true;
  try { while (s.queue.length) await handleInput(s, s.queue.shift()); } finally { s.draining = false; }
}
const BUTTONS = { 0: "left", 1: "middle", 2: "right" };
async function handleInput(s, m) {
  const cur = s.pages.get(s.active);
  if (m.type === "resize") return resizeSession(s, m.width, m.height, m.dpr, m.zoom);
  if (m.type === "tab") {
    if (m.action === "switch") return activateTab(s, String(m.id));
    if (m.action === "close") { const t = s.pages.get(String(m.id)); if (t && s.pages.size > 1) await t.page.close().catch(() => {}); return; }
    if (m.action === "new" && m.allow_goto) { const p = await s.context.newPage(); const u = String(m.url || ""); if (u && (await urlAllowed(u))) p.goto(u, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}); return; }
    return;
  }
  if (!cur) return;
  const p = cur.page;
  try {
    if (m.type === "mouse") {
      const x = Math.max(0, Math.min(s.vw, Number(m.x) || 0)), y = Math.max(0, Math.min(s.vh, Number(m.y) || 0));
      if (m.action === "move") await p.mouse.move(x, y);
      else if (m.action === "down") { await p.mouse.move(x, y); await p.mouse.down({ button: BUTTONS[m.button] || "left" }); }
      else if (m.action === "up") await p.mouse.up({ button: BUTTONS[m.button] || "left" });
      else if (m.action === "wheel") await p.mouse.wheel(Number(m.dx) || 0, Number(m.dy) || 0);
    } else if (m.type === "key") {
      const key = String(m.key || "");
      if (m.action === "down") { if (key.length === 1 && !m.ctrl && !m.meta) await p.keyboard.type(key); else await p.keyboard.down(key); }
      else if (m.action === "up") { if (!(key.length === 1 && !m.ctrl && !m.meta)) await p.keyboard.up(key).catch(() => {}); }
    } else if (m.type === "nav") {
      if (m.action === "back") await p.goBack().catch(() => {});
      else if (m.action === "forward") await p.goForward().catch(() => {});
      else if (m.action === "reload") await p.reload().catch(() => {});
      else if (m.action === "goto" && m.allow_goto && (await urlAllowed(String(m.url || "")))) await p.goto(String(m.url), { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    }
  } catch { /* entrada inválida não derruba a sessão */ }
}

const auth = (req) => req.headers["x-runner-secret"] === SECRET;
const readJson = (req) => new Promise((resolve, reject) => { let b = ""; req.on("data", (c) => { b += c; if (b.length > 5_000_000) { reject(new Error("grande")); req.destroy(); } }); req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } }); });
const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/health") return send(res, 200, { ok: true, sessions: sessions.size });
    if (!auth(req)) return send(res, 401, { error: "não autorizado" });
    const m = req.url.split("?")[0].match(/^\/sessions(?:\/([^/]+))?(?:\/(export-state|url))?$/);
    if (!m) return send(res, 404, { error: "não encontrado" });
    const [, id, sub] = m;
    if (req.method === "POST" && !id) return send(res, 201, await openSession(await readJson(req)));
    if (req.method === "DELETE" && id) return send(res, 200, { closed: await closeSession(id) });
    if (req.method === "POST" && id && sub === "export-state") { const s = sessions.get(id); if (!s) return send(res, 404, { error: "sessão não encontrada" }); return send(res, 200, { state: await s.context.storageState(), url: s.pages.get(s.active)?.page.url() ?? "" }); }
    if (req.method === "GET" && id && sub === "url") { const s = sessions.get(id); if (!s) return send(res, 404, { error: "sessão não encontrada" }); return send(res, 200, { url: s.pages.get(s.active)?.page.url() ?? "" }); }
    return send(res, 405, { error: "método não permitido" });
  } catch (e) { send(res, e.status || 500, { error: e.message || "erro" }); }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on("upgrade", (req, socket, head) => {
  const u = new URL(req.url, "http://x"); const m = u.pathname.match(/^\/ws\/([^/]+)$/);
  const s = m && sessions.get(m[1]);
  if (!m || u.searchParams.get("secret") !== SECRET || !s) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    s.sockets.add(ws);
    ws.send(JSON.stringify({ type: "hello", width: s.vw, height: s.vh, dpr: s.dsf }));
    tabsPayload(s).then((t) => ws.readyState === 1 && ws.send(JSON.stringify(t))).catch(() => {});
    startStream(s).catch(() => {});
    ws.on("message", (data, isBinary) => { if (isBinary) return; try { const msg = JSON.parse(String(data)); pushInput(s, msg); } catch { /* ignora */ } });
    ws.on("close", () => s.sockets.delete(ws));
  });
});
server.listen(PORT, "0.0.0.0", () => console.log(`[browser-runner] ouvindo na porta ${PORT}`));
process.on("SIGTERM", async () => { for (const id of [...sessions.keys()]) await closeSession(id); process.exit(0); });
