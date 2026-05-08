// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Conversation, ChatMessage, ChatParticipant } from "@/types/chat";
import { apiClient } from "@/lib/api-client";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ChatContextValue {
  conversations: Conversation[];
  activeConversationId: string | null;
  isOpen: boolean;
  isMinimized: boolean;
  showNewConversation: boolean;
  totalUnread: number;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  setActiveConversation: (id: string | null) => void;
  openConversationWithUser: (
    userId: string,
    user?: Partial<ChatParticipant>,
  ) => void;
  sendMessage: (conversationId: string, content: string) => void;
  startNewConversation: () => void;
  cancelNewConversation: () => void;
  allContacts: ChatParticipant[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allContacts, setAllContacts] = useState<ChatParticipant[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Load conversations from API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res: any = await apiClient.getConversations();
        if (cancelled) return;
        const data = Array.isArray(res) ? res : res.data || [];
        setConversations(data);
        // Extract unique contacts
        const contacts: ChatParticipant[] = [];
        const seen = new Set<string>();
        for (const conv of data) {
          if (conv.contact && !seen.has(conv.contact.id)) {
            seen.add(conv.contact.id);
            contacts.push(conv.contact);
          }
        }
        setAllContacts(contacts);
      } catch (err) {
        console.error("[ChatProvider] Failed to load conversations:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setActiveConversationId(null);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      // Mark messages as read
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
      );
    }
  }, []);

  const openConversationWithUser = useCallback(
    (userId: string, user?: Partial<ChatParticipant>) => {
      const convId = `conv-${userId}`;
      const existing = conversations.find((c) => c.id === convId);

      if (!existing && user) {
        // Create a new conversation
        const contact: ChatParticipant = {
          id: userId,
          name: user.name || "Usuário",
          email: user.email || "",
          account_type: user.account_type || "empresas",
          online_status: user.online_status || "offline",
          phone: user.phone,
          last_seen: new Date().toISOString(),
        };
        const newConv: Conversation = {
          id: convId,
          participants: [contact],
          contact,
          messages: [],
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pinned: false,
          is_archived: false,
        };
        setConversations((prev) => [newConv, ...prev]);
      }

      setActiveConversationId(convId);
      setIsOpen(true);
      setIsMinimized(false);
      setShowNewConversation(false);

      // Mark as read
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)),
      );
    },
    [conversations],
  );

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: "admin",
      sender_name: "Você",
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      type: "text",
      is_mine: true,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const updatedMessages = [...c.messages, msg];
        return {
          ...c,
          messages: updatedMessages,
          last_message: msg,
          updated_at: msg.created_at,
        };
      }),
    );

    // Send via API, then mark as sent
    apiClient
      .sendMessage(conversationId, { content })
      .then(() => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msg.id ? { ...m, status: "sent" } : m,
              ),
            };
          }),
        );
      })
      .catch(() => {
        // Mark as sent locally even if API fails
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msg.id ? { ...m, status: "sent" } : m,
              ),
            };
          }),
        );
      }, 500);
  }, []);

  const startNewConversation = useCallback(() => {
    setShowNewConversation(true);
    setActiveConversationId(null);
  }, []);

  const cancelNewConversation = useCallback(() => {
    setShowNewConversation(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        isOpen,
        isMinimized,
        showNewConversation,
        totalUnread,
        openChat,
        closeChat,
        minimizeChat,
        setActiveConversation,
        openConversationWithUser,
        sendMessage,
        startNewConversation,
        cancelNewConversation,
        allContacts,
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
