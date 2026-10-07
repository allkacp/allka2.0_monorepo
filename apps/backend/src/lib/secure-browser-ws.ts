// Ponte WebSocket do navegador seguro: o visualizador (frontend) conecta aqui com o ticket da sessão; a ponte valida, conecta ao runner
// (rede interna, com segredo) e repassa frames (runner → usuário) e eventos de teclado/mouse (usuário → runner). Fecha ao expirar/derrubar.
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer } from "ws";
import { prisma } from "./prisma";
import { hashTicket, runnerBase, runnerSecret } from "./secure-browser";

const PATH = /^\/api\/secure-browser\/ws\/([^/?]+)$/;
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

/** Só entrada de usuário passa; `goto` é permitido apenas no login inicial (dono). */
export function sanitizeInput(raw: string, mode: string): string | null {
  let m: any;
  try { m = JSON.parse(raw); } catch { return null; }
  if (!m || typeof m !== "object") return null;
  if (m.type === "mouse" && ["move", "down", "up", "wheel"].includes(m.action)) return JSON.stringify({ type: "mouse", action: m.action, x: Number(m.x) || 0, y: Number(m.y) || 0, button: Number(m.button) || 0, dx: Number(m.dx) || 0, dy: Number(m.dy) || 0 });
  if (m.type === "key" && ["down", "up"].includes(m.action) && typeof m.key === "string" && m.key.length <= 32) return JSON.stringify({ type: "key", action: m.action, key: m.key, ctrl: !!m.ctrl, meta: !!m.meta });
  if (m.type === "resize") return JSON.stringify({ type: "resize", width: Number(m.width) || 1280, height: Number(m.height) || 720, dpr: Number(m.dpr) || 1, zoom: Number(m.zoom) || 1 });
  if (m.type === "tab" && ["switch", "close", "new"].includes(m.action)) return JSON.stringify({ type: "tab", action: m.action, id: String(m.id ?? "").slice(0, 8), url: typeof m.url === "string" ? m.url.slice(0, 2000) : "", allow_goto: mode === "setup" });
  if (m.type === "nav" && ["back", "forward", "reload", "goto"].includes(m.action)) return JSON.stringify({ type: "nav", action: m.action, url: typeof m.url === "string" ? m.url.slice(0, 2000) : "", allow_goto: mode === "setup" });
  return null;
}

async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const u = new URL(req.url ?? "", "http://x");
  const m = u.pathname.match(PATH);
  if (!m) return false;
  const reject = (code: number) => { socket.write(`HTTP/1.1 ${code} Error\r\nConnection: close\r\n\r\n`); socket.destroy(); };
  const id = m[1];
  const t = u.searchParams.get("t") ?? "";
  const s = await prisma.browserSession.findUnique({ where: { id } });
  if (!runnerBase() || !s || s.driver !== "runner" || s.status !== "active" || s.expires_at.getTime() <= Date.now() || !s.ticket_hash || hashTicket(t) !== s.ticket_hash) { reject(404); return true; }
  const upstream = new WebSocket(`${runnerBase().replace(/^http/, "ws")}/ws/${id}?secret=${encodeURIComponent(runnerSecret())}`);
  upstream.on("error", () => reject(502));
  const pending: Array<[WebSocket.RawData, boolean]> = []; let forward: ((d: WebSocket.RawData, b: boolean) => void) | null = null;
  upstream.on("message", (d, b) => { if (forward) forward(d, b); else pending.push([d, b]); });
  upstream.on("open", () => {
    wss.handleUpgrade(req, socket, head, (client) => {
      let closed = false;
      const closeAll = (why: string) => { if (closed) return; closed = true; clearInterval(watch); try { client.close(1000, why); } catch { /* */ } try { upstream.close(); } catch { /* */ } };
      forward = (data, isBinary) => { if (client.readyState === 1) client.send(data, { binary: isBinary }); };
      for (const [d, b] of pending.splice(0)) forward(d, b);
      upstream.on("close", () => closeAll("session_closed"));
      client.on("message", (data, isBinary) => { if (isBinary || upstream.readyState !== 1) return; const out = sanitizeInput(String(data), s.mode); if (out) upstream.send(out); });
      client.on("close", () => closeAll("client_closed"));
      // prazo e derrubada: confere no banco a cada 3 s
      const watch = setInterval(async () => {
        try { const cur = await prisma.browserSession.findUnique({ where: { id }, select: { status: true, expires_at: true } }); if (!cur || cur.status !== "active" || cur.expires_at.getTime() <= Date.now()) closeAll("session_over"); } catch { /* tenta de novo */ }
      }, 3000);
    });
  });
  return true;
}

export function attachSecureBrowserWs(server: Server) {
  server.on("upgrade", (req, socket, head) => { if (PATH.test((req.url ?? "").split("?")[0])) handleUpgrade(req, socket, head).catch(() => socket.destroy()); });
}
