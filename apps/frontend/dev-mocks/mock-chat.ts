// Chat de demonstração do modo mock (vite --mode mock): salas, mensagens com
// foto, áudio, documento, resposta, edição e exclusão, e as configurações do
// Admin Master — para ver o chat estilo WhatsApp Web sem backend.
import { DEFAULT_CHAT_SETTINGS, type ChatSettings } from "../lib/chat-settings";

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: { id: string; name: string; avatar: string | null };
  content: string;
  created_at: string;
  client_message_id: string | null;
  type: "text" | "image" | "file" | "audio";
  attachment: { name: string | null; mime: string | null; size: number | null; duration_sec: number | null } | null;
  reply_to: { id: string; content: string; type: string; sender_name: string | null; deleted: boolean } | null;
  edited_at: string | null;
  deleted_at: string | null;
  blob?: Blob;
};

const PEOPLE = {
  ana: { id: "chat-ana", name: "Ana Souza", role: "empresas", email: "ana@empresa-demo.com" },
  bruno: { id: "chat-bruno", name: "Bruno Lima", role: "agencias", email: "bruno@agencia-demo.com" },
  carla: { id: "chat-carla", name: "Carla Mendes", role: "nomades", email: "carla@nomade-demo.com" },
  diego: { id: "chat-diego", name: "Diego Rocha", role: "lider", email: "diego@lider-demo.com" },
};

let settings: ChatSettings = { ...DEFAULT_CHAT_SETTINGS };
let settingsUpdatedAt: string | null = null;
let seq = 1;
let seeded = false;
const rooms: { id: string; title: string | null; type: string; status: "active" | "archived"; participants: string[]; read_at: Record<string, string> }[] = [];
const messages: Msg[] = [];
const names = new Map<string, string>();

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function demoImage(): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2a6f"/><stop offset="1" stop-color="#c81a7f"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><circle cx="500" cy="110" r="60" fill="#ffd166" opacity=".9"/><path d="M0 330 L160 210 L300 320 L420 240 L640 360 L640 420 L0 420Z" fill="#0b141a" opacity=".55"/><text x="40" y="80" font-family="Montserrat,Arial" font-size="36" font-weight="700" fill="#fff">Campanha Verão</text><text x="40" y="120" font-family="Montserrat,Arial" font-size="20" fill="#fff" opacity=".85">Peça 01 — feed</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

function demoAudio(seconds = 4): Blob {
  const rate = 8000;
  const n = rate * seconds;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, "data");
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 8) * Math.min(1, (seconds - t) * 8);
    v.setUint8(44 + i, 128 + Math.round(40 * env * Math.sin(2 * Math.PI * (330 + 60 * Math.sin(t * 3)) * t)));
  }
  return new Blob([buf], { type: "audio/wav" });
}

function add(roomId: string, senderId: string, minutesAgo: number, content: string, extra: Partial<Msg> = {}) {
  const m: Msg = {
    id: `cm-${seq++}`,
    conversation_id: roomId,
    sender_id: senderId,
    sender: { id: senderId, name: names.get(senderId) ?? "Pessoa", avatar: null },
    content,
    created_at: ago(minutesAgo),
    client_message_id: null,
    type: "text",
    attachment: null,
    reply_to: null,
    edited_at: null,
    deleted_at: null,
    ...extra,
  };
  messages.push(m);
  return m;
}

function quote(m: Msg) {
  return { id: m.id, content: m.deleted_at ? "" : m.content, type: m.type, sender_name: m.sender.name, deleted: !!m.deleted_at };
}

function seed(me: { id: string; name: string }) {
  if (seeded) return;
  seeded = true;
  names.set(me.id, me.name);
  Object.values(PEOPLE).forEach((p) => names.set(p.id, p.name));

  rooms.push(
    { id: "room-ana", title: null, type: "direct", status: "active", participants: [me.id, PEOPLE.ana.id], read_at: { [PEOPLE.ana.id]: ago(3) } },
    { id: "room-grupo", title: "Lançamento Verão 2027", type: "group", status: "active", participants: [me.id, PEOPLE.bruno.id, PEOPLE.carla.id, PEOPLE.diego.id], read_at: {} },
    { id: "room-carla", title: null, type: "direct", status: "active", participants: [me.id, PEOPLE.carla.id], read_at: { [PEOPLE.carla.id]: ago(60 * 30) } },
    { id: "room-arquivada", title: "Projeto Inverno (encerrado)", type: "group", status: "archived", participants: [me.id, PEOPLE.bruno.id], read_at: {} },
  );

  const a1 = add("room-ana", PEOPLE.ana.id, 60 * 26, "Oi! Tudo bem? Conseguiu ver a proposta que mandei ontem?");
  add("room-ana", me.id, 60 * 25.5, "Oi, Ana! Vi sim, está ótima. Só quero ajustar o cronograma da segunda fase.");
  add("room-ana", PEOPLE.ana.id, 60 * 25, "", { type: "file", attachment: { name: "proposta-comercial-v2.pdf", mime: "application/pdf", size: 482_133, duration_sec: null }, blob: new Blob(["Proposta de demonstração"], { type: "application/pdf" }) });
  add("room-ana", me.id, 42, "Bom dia! Segue a primeira peça da campanha 👇");
  add("room-ana", me.id, 41, "Primeira versão do feed", { type: "image", attachment: { name: "campanha-verao-feed.svg", mime: "image/svg+xml", size: 2_100, duration_sec: null }, blob: demoImage() });
  const a2 = add("room-ana", PEOPLE.ana.id, 30, "Ficou linda! Pode trocar o amarelo por um tom mais quente?");
  add("room-ana", PEOPLE.ana.id, 29, "", { type: "audio", attachment: { name: "audio.wav", mime: "audio/wav", size: 32_044, duration_sec: 4 }, blob: demoAudio(4) });
  add("room-ana", me.id, 12, "Claro, ajusto ainda hoje e te mando.", { reply_to: quote(a2), edited_at: ago(11) });
  add("room-ana", me.id, 8, "", { deleted_at: ago(7) });
  add("room-ana", PEOPLE.ana.id, 2, "Perfeito, obrigada! Sobre o cronograma, pode ser na reunião de quinta?", { reply_to: quote(a1) });

  add("room-grupo", PEOPLE.diego.id, 60 * 3, "Pessoal, o briefing final está no drive. Prazo da primeira entrega: sexta.");
  add("room-grupo", PEOPLE.bruno.id, 60 * 2.5, "Combinado. A agência já separou a equipe.");
  add("room-grupo", PEOPLE.carla.id, 60 * 2, "Eu fico com as legendas e o roteiro dos vídeos.");
  add("room-grupo", PEOPLE.carla.id, 60 * 1.9, "Começo amanhã cedo 💪");
  add("room-grupo", PEOPLE.diego.id, 15, "Ótimo. Alguém pode confirmar o horário da call de alinhamento?");

  add("room-carla", PEOPLE.carla.id, 60 * 24 * 3, "Mandei o portfólio atualizado, quando puder dá uma olhada.");
  add("room-carla", me.id, 60 * 24 * 3 - 20, "Recebi, obrigado Carla!");

  add("room-arquivada", PEOPLE.bruno.id, 60 * 24 * 40, "Projeto entregue. Obrigado a todos!");
}

function dto(m: Msg) {
  const deleted = !!m.deleted_at;
  const { blob: _blob, ...rest } = m;
  return {
    ...rest,
    content: deleted ? "" : m.content,
    attachment: deleted ? null : m.attachment,
  };
}

function unreadFor(roomId: string, meId: string) {
  const room = rooms.find((r) => r.id === roomId)!;
  const since = room.read_at[meId];
  return messages.filter((m) => m.conversation_id === roomId && m.sender_id !== meId && !m.deleted_at && (!since || m.created_at > since)).length;
}

export const mockChat = {
  rooms(me: { id: string; name: string }) {
    seed(me);
    const data = rooms
      .map((r) => {
        const list = messages.filter((m) => m.conversation_id === r.id);
        const last = list[list.length - 1];
        return {
          id: r.id,
          title: r.title,
          type: r.type,
          status: r.status,
          read_only: r.status === "archived",
          notification_group: null,
          participants: r.participants.map((id) => {
            const p = Object.values(PEOPLE).find((x) => x.id === id);
            return { id, name: names.get(id) ?? "Pessoa", avatar: null, role: p?.role ?? "admin" };
          }),
          last_message: last
            ? { id: last.id, content: last.deleted_at ? "" : last.content, created_at: last.created_at, sender_id: last.sender_id, type: last.type, deleted: !!last.deleted_at, attachment_name: last.attachment?.name ?? null }
            : null,
          unread_count: unreadFor(r.id, me.id),
          updated_at: last?.created_at ?? ago(0),
        };
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { data, total: data.length, page: 1, limit: 100 };
  },

  messages(me: { id: string; name: string }, roomId: string) {
    seed(me);
    const room = rooms.find((r) => r.id === roomId);
    const others = (room?.participants ?? []).filter((id) => id !== me.id);
    const reads = others.map((id) => room?.read_at[id] ?? null);
    const readAll = settings.show_read_receipts && reads.length > 0 && reads.every(Boolean) ? reads.sort()[0] : null;
    const data = messages.filter((m) => m.conversation_id === roomId).map(dto);
    return { data, total: data.length, page: 1, limit: 200, read_only: room?.status === "archived", read_all_until: readAll };
  },

  markRead(me: { id: string }, roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (room) room.read_at[me.id] = new Date().toISOString();
    return { ok: true };
  },

  send(me: { id: string; name: string }, roomId: string, body: { content: string; client_message_id?: string; reply_to_id?: string }) {
    seed(me);
    const dup = messages.find((m) => body.client_message_id && m.client_message_id === body.client_message_id);
    if (dup) return dto(dup);
    const reply = body.reply_to_id ? messages.find((m) => m.id === body.reply_to_id) : undefined;
    const m = add(roomId, me.id, 0, body.content, { client_message_id: body.client_message_id ?? null, reply_to: reply ? quote(reply) : null });
    return dto(m);
  },

  attach(me: { id: string; name: string }, roomId: string, input: { file: Blob; fileName: string; kind: "image" | "file" | "audio"; caption?: string; duration_sec?: number; client_message_id?: string; reply_to_id?: string }) {
    seed(me);
    const reply = input.reply_to_id ? messages.find((m) => m.id === input.reply_to_id) : undefined;
    const m = add(roomId, me.id, 0, input.caption ?? "", {
      type: input.kind,
      client_message_id: input.client_message_id ?? null,
      attachment: { name: input.fileName, mime: input.file.type || null, size: input.file.size, duration_sec: input.duration_sec ?? null },
      reply_to: reply ? quote(reply) : null,
      blob: input.file,
    });
    return dto(m);
  },

  attachment(messageId: string) {
    const m = messages.find((x) => x.id === messageId);
    if (!m?.blob || m.deleted_at) throw new Error("Anexo não encontrado.");
    return m.blob;
  },

  edit(messageId: string, content: string) {
    const m = messages.find((x) => x.id === messageId);
    if (!m) throw new Error("Mensagem não encontrada.");
    m.content = content;
    m.edited_at = new Date().toISOString();
    return dto(m);
  },

  remove(messageId: string) {
    const m = messages.find((x) => x.id === messageId);
    if (!m) throw new Error("Mensagem não encontrada.");
    m.deleted_at = new Date().toISOString();
    return dto(m);
  },

  contacts(q?: string) {
    const s = (q ?? "").toLowerCase();
    const data = Object.values(PEOPLE)
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.email.includes(s))
      .map((p) => ({ id: p.id, name: p.name, avatar: null, account_type: p.role, email: p.email }));
    return { data };
  },

  createDirect(me: { id: string; name: string }, otherId: string) {
    seed(me);
    const existing = rooms.find((r) => r.type === "direct" && r.participants.includes(otherId));
    if (existing) return { id: existing.id };
    const id = `room-${otherId}`;
    rooms.push({ id, title: null, type: "direct", status: "active", participants: [me.id, otherId], read_at: {} });
    return { id };
  },

  settings(canManage: boolean) {
    return { settings: { ...settings, updated_at: settingsUpdatedAt }, can_use: true, can_manage: canManage };
  },

  saveSettings(next: Partial<ChatSettings>) {
    settings = { ...settings, ...next };
    settingsUpdatedAt = new Date().toISOString();
    return { settings: { ...settings, updated_at: settingsUpdatedAt }, can_use: true, can_manage: true };
  },
};
