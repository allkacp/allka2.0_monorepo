/**
 * ChatWidget — chat interno restaurado (ata 2026-08, bloco 3/5).
 * Gatilho: ícone fixo no canto superior direito. Estado no ChatContext
 * (API real /api/chat/*). Salas vêm de aprovações de Grupo de Notificação
 * e de conversas diretas. Sala arquivada = somente leitura.
 */
import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  RefreshCw,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChat } from "@/contexts/chat-context";
import type { ChatRoom, ChatRoomMessage } from "@/types/chat";

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-xs";
  return (
    <div className={cn(s, "rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0")}>
      {initials(name || "?")}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function roomTitle(room: ChatRoom, currentUserId: string | null) {
  if (room.title) return room.title;
  const other = room.participants.find((p) => p.id !== currentUserId);
  return other?.name ?? "Conversa";
}

// ─── Lista de salas ───────────────────────────────────────────────────────
function RoomList({ onSelect }: { onSelect: (id: string) => void }) {
  const { rooms, activeRoomId, loadingRooms, roomsError, refreshRooms, currentUserId } = useChat();
  const [search, setSearch] = useState("");

  const filtered = rooms.filter((r) =>
    roomTitle(r, currentUserId).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="font-semibold text-sm text-slate-800 dark:text-white mb-2">Conversas</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar conversas"
          className="w-full h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingRooms && rooms.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Carregando...</p>
        )}
        {roomsError && (
          <div className="text-center py-8">
            <p className="text-xs text-red-500">Não foi possível carregar as conversas.</p>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={refreshRooms}>
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </div>
        )}
        {!loadingRooms && !roomsError && filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">
            {rooms.length === 0 ? "Nenhuma conversa ainda." : "Nada encontrado."}
          </p>
        )}
        {filtered.map((room) => {
          const isActive = room.id === activeRoomId;
          const title = roomTitle(room, currentUserId);
          return (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors",
                isActive && "bg-blue-50 dark:bg-blue-950/30 border-r-2 border-blue-500",
              )}
            >
              <Avatar name={title} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium truncate text-slate-800 dark:text-white flex items-center gap-1">
                    {room.type === "group" && <Users className="h-3 w-3 text-slate-400 shrink-0" />}
                    {title}
                  </p>
                  {room.last_message && (
                    <span className="text-[10px] text-slate-400 shrink-0">{formatTime(room.last_message.created_at)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                    {room.status === "archived" && <span className="text-slate-400">(arquivada) </span>}
                    {room.last_message?.content || "—"}
                  </p>
                  {room.unread_count > 0 && (
                    <span className="shrink-0 min-w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {room.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Janela de mensagens ─────────────────────────────────────────────────
function MessageWindow({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const {
    rooms,
    messages,
    currentUserId,
    loadingMessages,
    messagesError,
    retryMessages,
    sendMessage,
    retrySend,
  } = useChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const room = rooms.find((r) => r.id === roomId);
  const readOnly = !!room?.read_only;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const t = input.trim();
    if (!t || readOnly) return;
    sendMessage(roomId, t);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
        <button onClick={onBack} className="sm:hidden p-1 -ml-1 text-slate-500" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar name={room ? roomTitle(room, currentUserId) : "?"} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-slate-800 dark:text-white">
            {room ? roomTitle(room, currentUserId) : "Conversa"}
          </p>
          {room?.type === "group" && (
            <p className="text-[10px] text-slate-400">{room.participants.length} participantes</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950/40 min-h-0">
        {loadingMessages && messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Carregando mensagens...</p>
        )}
        {messagesError && (
          <div className="text-center py-8">
            <p className="text-xs text-red-500">Não foi possível carregar as mensagens.</p>
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={retryMessages}>
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </div>
        )}
        {!loadingMessages && !messagesError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mb-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Nenhuma mensagem ainda</p>
          </div>
        )}
        {messages.map((m: ChatRoomMessage) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3 py-1.5 text-sm",
                  mine
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700",
                )}
              >
                {!mine && room?.type === "group" && (
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">{m.sender?.name}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={cn("text-[9px] mt-0.5 text-right", mine ? "text-white/70" : "text-slate-400")}>
                  {m.pending ? "enviando…" : m.failed ? "falhou" : formatTime(m.created_at)}
                  {m.failed && m.client_message_id && (
                    <button
                      onClick={() => retrySend(roomId, m.client_message_id!)}
                      className="ml-1 underline"
                    >
                      tentar de novo
                    </button>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {readOnly ? (
        <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 bg-white dark:bg-slate-900">
          <Lock className="h-3.5 w-3.5" />
          Esta sala está arquivada — somente leitura.
        </div>
      ) : (
        <div className="shrink-0 flex items-end gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem..."
            aria-label="Mensagem"
            className="flex-1 resize-none max-h-24 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <Button size="sm" className="h-9 w-9 p-0 rounded-xl shrink-0" onClick={submit} disabled={!input.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Widget ──────────────────────────────────────────────────────────────
export function ChatWidget() {
  const { isOpen, openChat, closeChat, activeRoomId, openRoom, backToList, totalUnread } = useChat();

  return (
    <>
      {isOpen && (
        <>
          <div onClick={closeChat} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" aria-hidden />
          <div
            className={cn(
              "fixed z-50 flex flex-col bg-white dark:bg-[#0f1117] shadow-2xl border-l border-slate-200 dark:border-white/10",
              "inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px] sm:max-w-[100vw]",
            )}
            role="dialog"
            aria-label="Chat interno"
          >
            <div
              className="shrink-0 flex items-center justify-between px-4 py-3"
              style={{ background: "var(--app-brand-gradient, linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%))" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">Mensagens</p>
                  <p className="text-[11px] text-white/60">
                    {totalUnread > 0 ? `${totalUnread} não ${totalUnread === 1 ? "lida" : "lidas"}` : "Chat interno"}
                  </p>
                </div>
              </div>
              <button onClick={closeChat} aria-label="Fechar chat" className="p-1.5 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              <div className={cn("flex flex-col overflow-hidden border-r border-slate-100 dark:border-white/10 min-h-0", activeRoomId ? "hidden sm:flex sm:w-48" : "w-full")}>
                <RoomList onSelect={openRoom} />
              </div>
              {activeRoomId && (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <MessageWindow roomId={activeRoomId} onBack={backToList} />
                </div>
              )}
              {!activeRoomId && (
                <div className="hidden sm:flex flex-1 items-center justify-center text-xs text-slate-400">
                  Selecione uma conversa
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!isOpen && (
        <button
          onClick={openChat}
          aria-label="Abrir chat"
          className="group fixed top-[85px] right-[8px] z-50 flex items-center justify-center h-10 w-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 border-2 border-white shadow">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}
    </>
  );
}
