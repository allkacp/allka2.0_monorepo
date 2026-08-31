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

// ─── Chat interno restaurado (ata 2026-08, bloco 3/5) ───────────────────
// Antes: contexto mock (ids fabricados `conv-<userId>`, sender fixo "admin",
// nenhuma carga real de mensagens, sem polling). Agora usa a API real
// (/api/chat/*) — as salas vêm de aprovações de Grupo de Notificação e de
// conversas diretas existentes. Atualização por polling (o backend não tem
// WebSocket/SSE; não criamos uma segunda infraestrutura).

const POLL_MS = 15_000;

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
  sendMessage: (roomId: string, content: string) => void;
  retrySend: (roomId: string, clientMessageId: string) => void;
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(false);

  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoomId;

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

  const loadRooms = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoadingRooms(true);
    setRoomsError(false);
    try {
      const res = await apiClient.getConversations({ limit: 100 });
      setRooms((res?.data ?? []) as ChatRoom[]);
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
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => {
      void loadRooms({ silent: true });
      const active = activeRoomIdRef.current;
      if (active) void loadMessages(active, { silent: true });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [isOpen, loadRooms, loadMessages]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    void loadRooms({ silent: true });
  }, [loadRooms]);

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

  const doSend = useCallback(
    async (roomId: string, content: string, clientMessageId: string) => {
      setMessagesByRoom((prev) => {
        const list = prev[roomId] ?? [];
        const idx = list.findIndex((m) => m.client_message_id === clientMessageId);
        const optimistic: ChatRoomMessage = {
          id: `local-${clientMessageId}`,
          conversation_id: roomId,
          sender_id: currentUserId ?? "me",
          sender: { id: currentUserId ?? "me", name: "Você" },
          content,
          created_at: new Date().toISOString(),
          client_message_id: clientMessageId,
          pending: true,
          failed: false,
        };
        const next = idx >= 0 ? list.map((m, i) => (i === idx ? { ...optimistic } : m)) : [...list, optimistic];
        return { ...prev, [roomId]: next };
      });

      try {
        const saved: any = await apiClient.sendMessage(roomId, { content, client_message_id: clientMessageId });
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
    [currentUserId, loadRooms],
  );

  const sendMessage = useCallback(
    (roomId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      void doSend(roomId, trimmed, genId());
    },
    [doSend],
  );

  const retrySend = useCallback(
    (roomId: string, clientMessageId: string) => {
      const msg = (messagesByRoom[roomId] ?? []).find((m) => m.client_message_id === clientMessageId);
      if (!msg) return;
      void doSend(roomId, msg.content, clientMessageId); // MESMO client_message_id → idempotente
    },
    [messagesByRoom, doSend],
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
