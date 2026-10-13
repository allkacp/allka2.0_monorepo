// Utilitários do chat interno (estilo WhatsApp Web, 2026-10-12).
import type { ChatRoom } from "@/types/chat";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function roomTitle(room: ChatRoom, currentUserId: string | null) {
  if (room.title) return room.title;
  const other = room.participants.find((p) => p.id !== currentUserId);
  return other?.name ?? "Conversa";
}

/** Avatar da conversa: na direta, a foto da outra pessoa. */
export function roomAvatar(room: ChatRoom, currentUserId: string | null): string | null {
  if (room.type === "group") return null;
  return room.participants.find((p) => p.id !== currentUserId)?.avatar ?? null;
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Horário na lista de conversas: hoje → hora; ontem → "Ontem"; na semana → dia; senão → data. */
export function formatListTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff <= 0) return formatClock(iso);
  if (diff === 1) return "Ontem";
  if (diff < 7) return d.toLocaleDateString("pt-BR", { weekday: "long" }).replace(/-feira$/, "");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Separador de data entre as mensagens ("Hoje", "Ontem", "12/10/2026"). */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) {
    const w = d.toLocaleDateString("pt-BR", { weekday: "long" });
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function sameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function formatDuration(sec: number | null | undefined) {
  const s = Math.max(0, Math.round(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Prévia da última mensagem na lista (ícone + texto, como no WhatsApp). */
export function lastMessageLabel(m: ChatRoom["last_message"]): { icon: "image" | "audio" | "file" | "deleted" | null; text: string } {
  if (!m) return { icon: null, text: "" };
  if (m.deleted) return { icon: "deleted", text: "Mensagem apagada" };
  if (m.type === "image") return { icon: "image", text: m.content || "Foto" };
  if (m.type === "audio") return { icon: "audio", text: "Mensagem de voz" };
  if (m.type === "file") return { icon: "file", text: m.content || m.attachment_name || "Documento" };
  return { icon: null, text: m.content };
}

/** Cor estável do nome de quem escreveu em grupo (paleta do WhatsApp, legível nos dois temas). */
const NAME_COLORS = ["#1f7aec", "#e5476c", "#13a89e", "#a05ae0", "#d9822b", "#3b9e3f", "#c2459b", "#5b6ee1"];
export function senderColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}
