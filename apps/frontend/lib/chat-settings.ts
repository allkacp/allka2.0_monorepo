// Configurações do chat interno — espelho de apps/backend/src/lib/chat-settings.ts.
// O servidor é a fonte de verdade (GET /api/chat/settings); estes padrões só
// valem enquanto a resposta não chega ou se ela falhar.

export const CHAT_PROFILES = ["admin", "empresas", "agencias", "nomades", "lider"] as const;
export type ChatProfile = (typeof CHAT_PROFILES)[number];

export const CHAT_PROFILE_LABELS: Record<ChatProfile, string> = {
  admin: "Administração",
  empresas: "Empresas",
  agencias: "Agências e Parceiros",
  nomades: "Nômades",
  lider: "Líderes",
};

export interface ChatSettings {
  enabled: boolean;
  allowed_profiles: ChatProfile[];
  allow_new_conversations: boolean;
  allow_audio: boolean;
  max_audio_seconds: number;
  allow_images: boolean;
  allow_files: boolean;
  max_file_mb: number;
  allowed_extensions: string;
  allow_emoji: boolean;
  allow_reply: boolean;
  allow_edit: boolean;
  edit_window_minutes: number;
  allow_delete: boolean;
  delete_window_minutes: number;
  show_read_receipts: boolean;
  max_message_chars: number;
  enter_sends: boolean;
  compact_width: number;
  compact_height: number;
  allow_expanded: boolean;
  allow_popout: boolean;
  expanded_width_pct: number;
  expanded_height_pct: number;
  default_mode: "compact" | "expanded";
}

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

/** Dentro da janela de edição/exclusão? (0 = sem limite.) */
export function withinChatWindow(createdAt: string, minutes: number, now = Date.now()): boolean {
  if (minutes <= 0) return true;
  return now - new Date(createdAt).getTime() <= minutes * 60_000;
}
