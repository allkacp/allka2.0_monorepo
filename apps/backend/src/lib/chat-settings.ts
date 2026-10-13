// Configurações do chat interno (Configurações > Chat, só o Admin Master grava).
// Uma linha só (platform_chat_settings.id = "default"); o que não estiver salvo
// vale o padrão abaixo — assim um campo novo nunca deixa o chat sem valor.
import { z } from "zod";
import { prisma } from "./prisma";

export const CHAT_PROFILES = ["admin", "empresas", "agencias", "nomades", "lider"] as const;
export type ChatProfile = (typeof CHAT_PROFILES)[number];

export const chatSettingsSchema = z.object({
  /** Liga/desliga o chat para toda a plataforma. */
  enabled: z.boolean(),
  /** Perfis que veem e usam o chat. */
  allowed_profiles: z.array(z.enum(CHAT_PROFILES)).max(CHAT_PROFILES.length),
  /** Quem não é Admin pode iniciar conversa nova (com a administração ou com quem já conversa). */
  allow_new_conversations: z.boolean(),
  allow_audio: z.boolean(),
  max_audio_seconds: z.number().int().min(10).max(900),
  allow_images: z.boolean(),
  allow_files: z.boolean(),
  max_file_mb: z.number().int().min(1).max(25),
  /** Extensões aceitas em "Documento", separadas por vírgula (sem ponto). */
  allowed_extensions: z.string().trim().max(500),
  allow_emoji: z.boolean(),
  allow_reply: z.boolean(),
  allow_edit: z.boolean(),
  /** Minutos para editar depois de enviar (0 = sem limite). */
  edit_window_minutes: z.number().int().min(0).max(10080),
  allow_delete: z.boolean(),
  /** Minutos para apagar depois de enviar (0 = sem limite). */
  delete_window_minutes: z.number().int().min(0).max(10080),
  /** Mostra os dois tiques azuis quando o outro lado leu. */
  show_read_receipts: z.boolean(),
  max_message_chars: z.number().int().min(100).max(4000),
  /** Enter envia (Shift+Enter quebra linha). Desligado: Enter quebra linha. */
  enter_sends: z.boolean(),
  /** Janela pequena (canto da tela), em px. */
  compact_width: z.number().int().min(320).max(640),
  compact_height: z.number().int().min(420).max(900),
  /** Permite abrir o chat em tela grande (estilo WhatsApp Web). */
  allow_expanded: z.boolean(),
  /** Permite abrir o chat separado, em outra janela do navegador. */
  allow_popout: z.boolean(),
  /** Tamanho da tela grande, em % da janela do navegador. */
  expanded_width_pct: z.number().int().min(50).max(100),
  expanded_height_pct: z.number().int().min(50).max(100),
  /** Como o chat abre na primeira vez (cada pessoa pode trocar depois). */
  default_mode: z.enum(["compact", "expanded"]),
});

export type ChatSettings = z.infer<typeof chatSettingsSchema>;

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  enabled: true,
  allowed_profiles: [...CHAT_PROFILES],
  allow_new_conversations: true,
  allow_audio: true,
  max_audio_seconds: 120,
  allow_images: true,
  allow_files: true,
  max_file_mb: 10,
  allowed_extensions: "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,png,jpg,jpeg,gif,webp",
  allow_emoji: true,
  allow_reply: true,
  allow_edit: true,
  edit_window_minutes: 15,
  allow_delete: true,
  delete_window_minutes: 60,
  show_read_receipts: true,
  max_message_chars: 4000,
  enter_sends: true,
  compact_width: 380,
  compact_height: 560,
  allow_expanded: true,
  allow_popout: true,
  expanded_width_pct: 92,
  expanded_height_pct: 90,
  default_mode: "compact",
};

/** Mistura o salvo com o padrão, campo a campo; campo inválido volta ao padrão. */
export function mergeChatSettings(raw: unknown): ChatSettings {
  const out: Record<string, unknown> = { ...DEFAULT_CHAT_SETTINGS };
  if (raw && typeof raw === "object") {
    const shape = chatSettingsSchema.shape as Record<string, z.ZodTypeAny>;
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!(k in shape)) continue;
      const parsed = shape[k].safeParse(v);
      if (parsed.success) out[k] = parsed.data;
    }
  }
  return out as ChatSettings;
}

export async function getChatSettings(): Promise<ChatSettings & { updated_at: Date | null }> {
  const row = await prisma.platformChatSettings.findUnique({ where: { id: "default" } });
  let raw: unknown = null;
  try {
    raw = row ? JSON.parse(row.settings_json) : null;
  } catch {
    raw = null;
  }
  return { ...mergeChatSettings(raw), updated_at: row?.updated_at ?? null };
}

export async function saveChatSettings(settings: ChatSettings, userId: string) {
  const data = { settings_json: JSON.stringify(settings), updated_by_user_id: userId };
  await prisma.platformChatSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
  return getChatSettings();
}

/** Perfil do chat a partir do usuário do token (mesma leitura do resto da plataforma). */
export function chatProfileOf(user: { role?: string; account_type?: string }): ChatProfile | null {
  const t = String(user.account_type ?? user.role ?? "").toLowerCase();
  const r = String(user.role ?? "").toLowerCase();
  if (t === "admin" || r === "admin") return "admin";
  if (t === "lider" || t === "leader" || r === "lider") return "lider";
  if (["nomades", "nomade", "nomad"].includes(t)) return "nomades";
  if (["agencias", "agencia", "agency", "parceiro", "partner"].includes(t)) return "agencias";
  if (["empresas", "empresa", "company"].includes(t)) return "empresas";
  return null;
}

export function canUseChat(settings: ChatSettings, user: { role?: string; account_type?: string }): boolean {
  const p = chatProfileOf(user);
  // Admin sempre entra (mesmo com o chat desligado) — é quem precisa
  // conseguir testar, religar e dar suporte.
  if (p === "admin") return true;
  if (!settings.enabled) return false;
  return !!p && settings.allowed_profiles.includes(p);
}

export function extensionAllowed(settings: ChatSettings, fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (!ext || ext === fileName.toLowerCase()) return false;
  const list = settings.allowed_extensions
    .split(",")
    .map((s) => s.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  return list.includes(ext);
}

/** Dentro da janela de edição/exclusão? (0 = sem limite.) */
export function withinWindow(createdAt: Date, minutes: number, now = new Date()): boolean {
  if (minutes <= 0) return true;
  return now.getTime() - createdAt.getTime() <= minutes * 60_000;
}
