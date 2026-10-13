import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ChatRoom, ChatRoomMessage } from "@/types/chat";
import { apiClient, ApiError } from "@/lib/api-client";
import { useSoundOnIncrease } from "@/hooks/use-notification-sound";
import { DEFAULT_CHAT_SETTINGS, type ChatSettings } from "@/lib/chat-settings";

// ─── Chat interno restaurado (ata 2026-08, bloco 3/5) ───────────────────
// Antes: contexto mock (ids fabricados `conv-<userId>`, sender fixo "admin",
// nenhuma carga real de mensagens, sem polling). Agora usa a API real
// (/api/chat/*) — as salas vêm de aprovações de Grupo de Notificação e de
// conversas diretas existentes. Atualização por polling (o backend não tem
// WebSocket/SSE; não criamos uma segunda infraestrutura).

const POLL_MS = 15_000;
// Com uma conversa aberta na tela a resposta precisa aparecer rápido — sem
// WebSocket, o intervalo cai enquanto a sala está à vista.
const ACTIVE_ROOM_POLL_MS = 5_000;
const MODE_KEY = "allka_chat_mode";

export type ChatWindowMode = "compact" | "expanded";
export type ChatAttachmentInput = { blob: Blob; fileName: string; kind: "image" | "file" | "audio"; caption?: string; duration_sec?: number };

interface ChatContextValue {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: ChatRoomMessage[];
  currentUserId: string | null;
  isOpen: boolean;
  isMinimized: boolean;
  loadingRooms: boolean;
  roomsError: boolean;
  loadingMessages: boolean;
  messagesError: boolean;
  totalUnread: number;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  openRoom: (id: string) => void;
  /** Abre (ou cria e abre) a conversa direta 1:1 com um usuário. */
  openDirectWith: (userId: string) => void;
  backToList: () => void;
  refreshRooms: () => void;
  retryMessages: () => void;
  sendMessage: (roomId: string, content: string, replyToId?: string) => void;
  retrySend: (roomId: string, clientMessageId: string) => void;
  /** Chat estilo WhatsApp Web (2026-10-12) */
  sendAttachment: (roomId: string, input: ChatAttachmentInput, replyToId?: string) => void;
  editMessage: (roomId: string, messageId: string, content: string) => Promise<string | null>;
  deleteMessage: (roomId: string, messageId: string) => Promise<string | null>;
  /** Até quando TODOS os outros participantes da sala aberta já leram (tiques azuis). */
  readAllUntil: string | null;
  settings: ChatSettings;
  /** O perfil desta pessoa pode usar o chat (Configurações > Chat). */
  canUse: boolean;
  /** É Admin Master (pode mudar as configurações do chat). */
  canManage: boolean;
  reloadSettings: () => Promise<void>;
  mode: ChatWindowMode;
  setMode: (mode: ChatWindowMode) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function genId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `cli-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatRoomMessage[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  // null até a 1ª carga das salas: o som de chat só toca pra mensagem nova depois disso.
  const [soundUnread, setSoundUnread] = useState<number | null>(null);
  useSoundOnIncrease("chat", soundUnread);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [readAllByRoom, setReadAllByRoom] = useState<Record<string, string | null>>({});
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [canUse, setCanUse] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [mode, setModeState] = useState<ChatWindowMode>(() => {
    try {
      const v = localStorage.getItem(MODE_KEY);
      return v === "expanded" || v === "compact" ? v : "compact";
    } catch {
      return "compact";
    }
  });
  const modeChosenRef = useRef<boolean>(false);
  try {
    modeChosenRef.current = modeChosenRef.current || !!localStorage.getItem(MODE_KEY);
  } catch {
    /* sem storage: segue o padrão do servidor */
  }

  const setMode = useCallback((m: ChatWindowMode) => {
    setModeState(m);
    modeChosenRef.current = true;
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* preferência só desta sessão */
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    try {
      // Testes e o modo mock podem não ter esta rota: sem ela, valem os padrões.
      const res: any = await (apiClient as any).getChatSettings?.();
      if (!res?.settings) return;
      const next: ChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...res.settings };
      setSettings(next);
      setCanUse(res.can_use !== false);
      setCanManage(!!res.can_manage);
      if (!modeChosenRef.current) setModeState(next.default_mode);
      if (!next.allow_expanded) setModeState("compact");
    } catch {
      /* falha de rede: mantém o último estado conhecido */
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoomId;
  const messagesByRoomRef = useRef<Record<string, ChatRoomMessage[]>>({});
  messagesByRoomRef.current = messagesByRoom;

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((me: any) => {
        if (!cancelled) setCurrentUserId(me?.id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canUseRef = useRef(true);
  canUseRef.current = canUse;

  const loadRooms = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!canUseRef.current) return;
    if (!opts.silent) setLoadingRooms(true);
    setRoomsError(false);
    try {
      const res = await apiClient.getConversations({ limit: 100 });
      const loaded = (res?.data ?? []) as ChatRoom[];
      setRooms(loaded);
      setSoundUnread(loaded.reduce((s, r) => s + (r.unread_count || 0), 0));
    } catch {
      if (!opts.silent) setRoomsError(true);
    } finally {
      if (!opts.silent) setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoadingMessages(true);
    setMessagesError(false);
    try {
      const res = await apiClient.getMessages(roomId, { limit: 200 });
      const server = (res?.data ?? []) as ChatRoomMessage[];
      setReadAllByRoom((prev) => ({ ...prev, [roomId]: ((res as any)?.read_all_until as string | null) ?? null }));
      setMessagesByRoom((prev) => {
        // Preserva otimistas ainda não confirmados (pending/failed) que o
        // servidor não devolveu (por client_message_id).
        const pendingLocal = (prev[roomId] ?? []).filter(
          (m) => (m.pending || m.failed) && !server.some((s) => s.client_message_id && s.client_message_id === m.client_message_id),
        );
        return { ...prev, [roomId]: [...server, ...pendingLocal] };
      });
    } catch {
      if (!opts.silent) setMessagesError(true);
    } finally {
      if (!opts.silent) setLoadingMessages(false);
    }
  }, []);

  const markRead = useCallback(
    async (roomId: string) => {
      try {
        await apiClient.markConversationRead(roomId);
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r)));
      } catch {
        /* silencioso — próxima carga corrige */
      }
    },
    [],
  );

  // Carga inicial + polling enquanto o chat está aberto.
  useEffect(() => {
    if (canUse) void loadRooms();
    else setRooms([]);
  }, [loadRooms, canUse]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => {
      void loadRooms({ silent: true });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [isOpen, loadRooms]);

  useEffect(() => {
    if (!isOpen || !activeRoomId) return;
    const t = setInterval(() => {
      void loadMessages(activeRoomId, { silent: true });
      void markRead(activeRoomId);
    }, ACTIVE_ROOM_POLL_MS);
    return () => clearInterval(t);
  }, [isOpen, activeRoomId, loadMessages, markRead]);

  // Chat fechado: o polling acima não roda — confere em segundo plano pra o
  // som de mensagem nova tocar mesmo sem o chat aberto.
  useEffect(() => {
    if (isOpen || !canUse) return;
    const t = setInterval(() => void loadRooms({ silent: true }), 30_000);
    return () => clearInterval(t);
  }, [isOpen, loadRooms, canUse]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    void loadRooms({ silent: true });
    void reloadSettings();
  }, [loadRooms, reloadSettings]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setActiveRoomId(null);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const openRoom = useCallback(
    (id: string) => {
      setActiveRoomId(id);
      void loadMessages(id);
      void markRead(id);
    },
    [loadMessages, markRead],
  );

  const backToList = useCallback(() => setActiveRoomId(null), []);

  const openDirectWith = useCallback(
    async (userId: string) => {
      if (!userId) return;
      setIsOpen(true);
      setIsMinimized(false);
      try {
        const res: any = await apiClient.createConversation({ type: "direct", participant_ids: [userId] });
        const id = res?.id;
        if (id) {
          await loadRooms({ silent: true });
          setActiveRoomId(id);
          void loadMessages(id);
          void markRead(id);
        }
      } catch {
        /* mantém o chat aberto na lista mesmo se a criação falhar */
      }
    },
    [loadRooms, loadMessages, markRead],
  );

  const replyPreviewFor = useCallback(
    (roomId: string, replyToId?: string): ChatRoomMessage["reply_to"] => {
      if (!replyToId) return null;
      const m = (messagesByRoomRef.current[roomId] ?? []).find((x) => x.id === replyToId);
      if (!m) return null;
      return { id: m.id, content: m.content, type: m.type ?? "text", sender_name: m.sender?.name ?? null, deleted: !!m.deleted_at };
    },
    [],
  );

  const doSend = useCallback(
    async (roomId: string, content: string, clientMessageId: string, replyToId?: string) => {
      setMessagesByRoom((prev) => {
        const list = prev[roomId] ?? [];
        const idx = list.findIndex((m) => m.client_message_id === clientMessageId);
        const optimistic: ChatRoomMessage = {
          id: `local-${clientMessageId}`,
          conversation_id: roomId,
          sender_id: currentUserId ?? "me",
          sender: { id: currentUserId ?? "me", name: "Você" },
          content,
          type: "text",
          reply_to: replyPreviewFor(roomId, replyToId),
          created_at: new Date().toISOString(),
          client_message_id: clientMessageId,
          pending: true,
          failed: false,
        };
        const next = idx >= 0 ? list.map((m, i) => (i === idx ? { ...optimistic } : m)) : [...list, optimistic];
        return { ...prev, [roomId]: next };
      });

      try {
        const saved: any = await apiClient.sendMessage(roomId, {
          content,
          client_message_id: clientMessageId,
          ...(replyToId ? { reply_to_id: replyToId } : {}),
        });
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.client_message_id === clientMessageId
              ? { ...saved, pending: false, failed: false }
              : m,
          ),
        }));
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId
              ? { ...r, last_message: { id: saved.id, content, created_at: saved.created_at, sender_id: saved.sender_id }, updated_at: saved.created_at }
              : r,
          ),
        );
      } catch (err) {
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.client_message_id === clientMessageId ? { ...m, pending: false, failed: true } : m,
          ),
        }));
        if (err instanceof ApiError && err.status === 403) {
          // sala arquivada / conta inativa — recarrega pra refletir o estado
          void loadRooms({ silent: true });
        }
      }
    },
    [currentUserId, loadRooms, replyPreviewFor],
  );

  const doSendAttachment = useCallback(
    async (roomId: string, input: ChatAttachmentInput, clientMessageId: string, replyToId?: string) => {
      setMessagesByRoom((prev) => {
        const list = prev[roomId] ?? [];
        const idx = list.findIndex((m) => m.client_message_id === clientMessageId);
        const optimistic: ChatRoomMessage = {
          id: `local-${clientMessageId}`,
          conversation_id: roomId,
          sender_id: currentUserId ?? "me",
          sender: { id: currentUserId ?? "me", name: "Você" },
          content: input.caption ?? "",
          type: input.kind,
          attachment: { name: input.fileName, mime: input.blob.type || null, size: input.blob.size, duration_sec: input.duration_sec ?? null },
          reply_to: replyPreviewFor(roomId, replyToId),
          created_at: new Date().toISOString(),
          client_message_id: clientMessageId,
          pending: true,
          failed: false,
          localFile: { blob: input.blob, fileName: input.fileName, kind: input.kind, duration_sec: input.duration_sec },
        };
        const next = idx >= 0 ? list.map((m, i) => (i === idx ? { ...optimistic } : m)) : [...list, optimistic];
        return { ...prev, [roomId]: next };
      });
      try {
        const saved: any = await apiClient.sendChatAttachment(roomId, {
          file: input.blob,
          fileName: input.fileName,
          kind: input.kind,
          caption: input.caption,
          duration_sec: input.duration_sec,
          client_message_id: clientMessageId,
          reply_to_id: replyToId,
        });
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            // Mantém o arquivo local: a prévia aparece na hora, sem baixar de novo.
            m.client_message_id === clientMessageId ? { ...saved, localFile: m.localFile, pending: false, failed: false } : m,
          ),
        }));
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  last_message: { id: saved.id, content: saved.content ?? "", created_at: saved.created_at, sender_id: saved.sender_id, type: input.kind, attachment_name: input.fileName },
                  updated_at: saved.created_at,
                }
              : r,
          ),
        );
        return null;
      } catch (err) {
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] ?? []).map((m) =>
            m.client_message_id === clientMessageId ? { ...m, pending: false, failed: true } : m,
          ),
        }));
        return err instanceof Error ? err.message : "Não foi possível enviar.";
      }
    },
    [currentUserId, replyPreviewFor],
  );

  const sendMessage = useCallback(
    (roomId: string, content: string, replyToId?: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      void doSend(roomId, trimmed, genId(), replyToId);
    },
    [doSend],
  );

  const sendAttachment = useCallback(
    (roomId: string, input: ChatAttachmentInput, replyToId?: string) => {
      void doSendAttachment(roomId, input, genId(), replyToId);
    },
    [doSendAttachment],
  );

  const retrySend = useCallback(
    (roomId: string, clientMessageId: string) => {
      const msg = (messagesByRoom[roomId] ?? []).find((m) => m.client_message_id === clientMessageId);
      if (!msg) return;
      // MESMO client_message_id → idempotente
      if (msg.localFile) {
        void doSendAttachment(roomId, { ...msg.localFile, caption: msg.content }, clientMessageId, msg.reply_to?.id);
        return;
      }
      void doSend(roomId, msg.content, clientMessageId, msg.reply_to?.id);
    },
    [messagesByRoom, doSend, doSendAttachment],
  );

  const replaceMessage = useCallback((roomId: string, saved: ChatRoomMessage) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] ?? []).map((m) => (m.id === saved.id ? { ...saved, localFile: undefined } : m)),
    }));
  }, []);

  const editMessage = useCallback(
    async (roomId: string, messageId: string, content: string) => {
      try {
        const saved: any = await apiClient.editChatMessage(messageId, content.trim());
        replaceMessage(roomId, saved);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Não foi possível editar.";
      }
    },
    [replaceMessage],
  );

  const deleteMessage = useCallback(
    async (roomId: string, messageId: string) => {
      try {
        const saved: any = await apiClient.deleteChatMessage(messageId);
        replaceMessage(roomId, saved);
        void loadRooms({ silent: true });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Não foi possível apagar.";
      }
    },
    [replaceMessage, loadRooms],
  );

  const totalUnread = rooms.reduce((s, r) => s + (r.unread_count || 0), 0);
  const messages = activeRoomId ? messagesByRoom[activeRoomId] ?? [] : [];

  return (
    <ChatContext.Provider
      value={{
        rooms,
        activeRoomId,
        messages,
        currentUserId,
        isOpen,
        isMinimized,
        loadingRooms,
        roomsError,
        loadingMessages,
        messagesError,
        totalUnread,
        openChat,
        closeChat,
        minimizeChat,
        openRoom,
        openDirectWith,
        backToList,
        refreshRooms: () => void loadRooms(),
        retryMessages: () => {
          if (activeRoomId) void loadMessages(activeRoomId);
        },
        sendMessage,
        retrySend,
        sendAttachment,
        editMessage,
        deleteMessage,
        readAllUntil: activeRoomId ? readAllByRoom[activeRoomId] ?? null : null,
        settings,
        canUse,
        canManage,
        reloadSettings,
        mode: settings.allow_expanded ? mode : "compact",
        setMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
