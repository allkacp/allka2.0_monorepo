/**
 * ChatWidget — chat interno no estilo WhatsApp Web (2026-10-12).
 *
 * O botão fica no canto inferior direito. O chat abre pequeno ali mesmo
 * (janela ao lado do botão, uma coluna: lista → conversa), pode ser aberto em
 * tela grande (duas colunas, como o WhatsApp Web) ou numa janela separada do
 * navegador (/chat-janela, ver ChatStandalone). No celular ocupa a tela toda. Tudo o que aparece — áudio, fotos, documentos,
 * emojis, responder, editar, apagar, tamanhos das janelas — segue as
 * configurações do Admin Master (Configurações > Chat), lidas no ChatContext.
 *
 * Gatilho: ícone fixo no canto superior direito (desktop) ou na pilha de
 * botões redondos do canto inferior (celular/tablet). Salas vêm de aprovações
 * de Grupo de Notificação e de conversas diretas. Sala arquivada = somente
 * leitura.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  Minimize2,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useChat } from "@/contexts/chat-context";
import { useTelaEstreita } from "@/hooks/useTelaEstreita";
import type { ChatRoom, ChatRoomMessage } from "@/types/chat";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { dayLabel, formatListTime, initials, lastMessageLabel, roomAvatar, roomTitle, sameDay, senderColor } from "@/components/chat/chat-utils";

// Cores do chat = cores do tema da plataforma (Personalizar Sidebar): o topo
// usa o degradê dos cabeçalhos, os botões principais o degradê dos botões e
// os destaques (não lidas, filtro ativo) a cor do item ativo.
const BRAND_GRADIENT = "var(--app-brand-header, var(--app-brand-gradient, linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)))";
const BRAND_BUTTON = "var(--app-brand-button, var(--app-brand-gradient, linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)))";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administração",
  empresas: "Empresa",
  empresa: "Empresa",
  company: "Empresa",
  agencias: "Agência",
  agencia: "Agência",
  agency: "Agência",
  parceiro: "Parceiro",
  partner: "Parceiro",
  nomades: "Nômade",
  nomade: "Nômade",
  nomad: "Nômade",
  lider: "Líder",
  leader: "Líder",
};

function roleLabel(role?: string | null) {
  return ROLE_LABELS[String(role ?? "").toLowerCase()] ?? "";
}

// ─── Peças pequenas ─────────────────────────────────────────────────────

function Avatar({ name, src, group, seed, size = 49 }: { name: string; src?: string | null; group?: boolean; seed: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (src && !broken) {
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" onError={() => setBroken(true)} />;
  }
  return (
    <div
      style={{ ...style, background: group ? "#94a3b8" : senderColor(seed) }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      aria-hidden
    >
      {group ? <Users style={{ width: size * 0.45, height: size * 0.45 }} /> : <span style={{ fontSize: Math.round(size * 0.34) }}>{initials(name || "?")}</span>}
    </div>
  );
}

function HeaderButton({ label, onClick, children, buttonRef }: { label: string; onClick: () => void; children: React.ReactNode; buttonRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}

/** Outra janela, expandir/diminuir e fechar — sempre no canto superior direito. */
function WindowControls({
  expanded,
  canExpand,
  onToggle,
  onClose,
  onPopout,
  closeRef,
}: {
  expanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPopout?: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <div className="flex shrink-0 items-center">
      {onPopout && (
        <HeaderButton label="Abrir chat em outra janela" onClick={onPopout}>
          <ExternalLink className="h-[18px] w-[18px]" />
        </HeaderButton>
      )}
      {canExpand && (
        <HeaderButton label={expanded ? "Diminuir chat" : "Abrir chat em tela grande"} onClick={onToggle}>
          {expanded ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
        </HeaderButton>
      )}
      <HeaderButton label="Fechar chat" onClick={onClose} buttonRef={closeRef}>
        <X className="h-5 w-5" />
      </HeaderButton>
    </div>
  );
}

// ─── Lista de conversas ─────────────────────────────────────────────────

type Filter = "all" | "unread" | "groups";

function RoomList({
  onSelect,
  onNew,
  canStartNew,
  controls,
  fixedGradient,
}: {
  onSelect: (id: string) => void;
  onNew: () => void;
  canStartNew: boolean;
  controls: React.ReactNode;
  fixedGradient: boolean;
}) {
  const { rooms, activeRoomId, loadingRooms, roomsError, refreshRooms, currentUserId, totalUnread } = useChat();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (filter === "unread" && r.unread_count <= 0) return false;
      if (filter === "groups" && r.type !== "group") return false;
      return !q || roomTitle(r, currentUserId).toLowerCase().includes(q);
    });
  }, [rooms, search, filter, currentUserId]);

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "unread", label: totalUnread > 0 ? `Não lidas ${totalUnread}` : "Não lidas" },
    { id: "groups", label: "Grupos" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <div
        className="flex h-[60px] shrink-0 items-center gap-1 pl-4 pr-2 text-white"
        style={{ background: BRAND_GRADIENT, backgroundAttachment: fixedGradient ? "fixed" : undefined }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-tight">Conversas</p>
          <p className="truncate text-xs text-white/70">
            {totalUnread > 0 ? `${totalUnread} não ${totalUnread === 1 ? "lida" : "lidas"}` : "Chat interno"}
          </p>
        </div>
        {canStartNew && (
          <HeaderButton label="Nova conversa" onClick={onNew}>
            <MessageSquarePlus className="h-5 w-5" />
          </HeaderButton>
        )}
        {controls}
      </div>

      <div className="shrink-0 space-y-2 border-b border-black/5 px-3 py-2 dark:border-white/5">
        <label className="flex h-9 items-center gap-3 rounded-lg bg-slate-100 px-3 dark:bg-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar conversa"
            aria-label="Pesquisar conversa"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 dark:text-slate-100"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Limpar pesquisa" className="text-slate-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                filter === c.id
                  ? "chat-accent-soft"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loadingRooms && rooms.length === 0 && (
          <div className="flex h-full items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        )}
        {roomsError && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Não foi possível abrir as conversas.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={refreshRooms}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        )}
        {!loadingRooms && !roomsError && filtered.length === 0 && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {rooms.length === 0 ? "Nenhuma conversa ainda." : filter === "unread" && !search ? "Nenhuma conversa não lida." : "Nada encontrado."}
            </p>
            {rooms.length === 0 && canStartNew && (
              <Button size="sm" className="mt-3 rounded-full text-white hover:opacity-90" style={{ background: BRAND_BUTTON }} onClick={onNew}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Nova conversa
              </Button>
            )}
          </div>
        )}
        {filtered.map((room) => (
          <RoomRow key={room.id} room={room} active={room.id === activeRoomId} currentUserId={currentUserId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function RoomRow({ room, active, currentUserId, onSelect }: { room: ChatRoom; active: boolean; currentUserId: string | null; onSelect: (id: string) => void }) {
  const title = roomTitle(room, currentUserId);
  const last = lastMessageLabel(room.last_message);
  const unread = room.unread_count > 0;
  const mineLast = !!room.last_message && room.last_message.sender_id === currentUserId;
  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        "flex w-full items-center gap-3 pl-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
        active && "bg-slate-100 dark:bg-slate-800",
      )}
    >
      <Avatar name={title} src={roomAvatar(room, currentUserId)} group={room.type === "group"} seed={room.id} />
      <div className="min-w-0 flex-1 border-b border-black/5 py-3 pr-3 dark:border-white/5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[16px] text-slate-900 dark:text-slate-100">{title}</p>
          {room.last_message && (
            <span className={cn("shrink-0 text-xs", unread ? "font-semibold chat-accent-text" : "text-slate-500 dark:text-slate-400")}>
              {formatListTime(room.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {room.status === "archived" && <Lock className="h-3.5 w-3.5 shrink-0" aria-label="Arquivada" />}
            {mineLast && last.icon !== "deleted" && <span className="shrink-0">Você:</span>}
            {last.icon === "image" && <ImageIcon className="h-4 w-4 shrink-0" />}
            {last.icon === "audio" && <Mic className="h-4 w-4 shrink-0" />}
            {last.icon === "file" && <FileText className="h-4 w-4 shrink-0" />}
            {last.icon === "deleted" && <Ban className="h-4 w-4 shrink-0" />}
            <span className={cn("truncate", last.icon === "deleted" && "italic")}>{last.text || (room.type === "group" ? `${room.participants.length} participantes` : "")}</span>
          </p>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full chat-accent-bg px-1.5 text-xs font-semibold">
              {room.unread_count > 99 ? "99+" : room.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Nova conversa ──────────────────────────────────────────────────────

type Contact = { id: string; name: string; avatar?: string | null; account_type: string; email?: string };

function NewConversation({ onBack, onPick, fixedGradient }: { onBack: () => void; onPick: (id: string) => void; fixedGradient: boolean }) {
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    const t = setTimeout(() => {
      apiClient
        .getChatContacts(q.trim() || undefined)
        .then((res: any) => alive && setContacts(Array.isArray(res?.data) ? res.data : []))
        .catch(() => alive && setError(true))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, reload]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <div
        className="flex h-[60px] shrink-0 items-center gap-2 px-2 text-white"
        style={{ background: BRAND_GRADIENT, backgroundAttachment: fixedGradient ? "fixed" : undefined }}
      >
        <HeaderButton label="Voltar" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </HeaderButton>
        <p className="text-base font-bold">Nova conversa</p>
      </div>
      <div className="shrink-0 border-b border-black/5 px-3 py-2 dark:border-white/5">
        <label className="flex h-9 items-center gap-3 rounded-lg bg-slate-100 px-3 dark:bg-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar nome ou e-mail"
            aria-label="Pesquisar pessoa"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 dark:text-slate-100"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loading && contacts.length === 0 ? (
          <div className="flex h-full items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">Não foi possível buscar as pessoas.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setReload((n) => n + 1)}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        ) : contacts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Ninguém encontrado.</p>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="flex w-full items-center gap-3 pl-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <Avatar name={c.name} src={c.avatar} seed={c.id} size={44} />
              <div className="min-w-0 flex-1 border-b border-black/5 py-3 pr-3 dark:border-white/5">
                <p className="truncate text-[15px] text-slate-900 dark:text-slate-100">{c.name}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{[roleLabel(c.account_type), c.email].filter(Boolean).join(" · ")}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Conversa aberta ────────────────────────────────────────────────────

function ConversationPane({
  roomId,
  onBack,
  controls,
  fixedGradient,
}: {
  roomId: string;
  onBack: (() => void) | null;
  controls: React.ReactNode;
  fixedGradient: boolean;
}) {
  const {
    rooms,
    messages,
    currentUserId,
    loadingMessages,
    messagesError,
    retryMessages,
    sendMessage,
    retrySend,
    sendAttachment,
    editMessage,
    deleteMessage,
    readAllUntil,
    settings,
  } = useChat();
  const room = rooms.find((r) => r.id === roomId);
  const readOnly = !!room?.read_only;
  const isGroup = room?.type === "group";
  const title = room ? roomTitle(room, currentUserId) : "Conversa";

  const [replyTo, setReplyTo] = useState<ChatRoomMessage | null>(null);
  const [editing, setEditing] = useState<ChatRoomMessage | null>(null);
  const [toDelete, setToDelete] = useState<ChatRoomMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const firstPaintRef = useRef(true);

  // Trocou de conversa: começa do fim, sem resposta/edição pendente.
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    setToDelete(null);
    setUnseen(0);
    firstPaintRef.current = true;
    lastCountRef.current = 0;
  }, [roomId]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseen(0);
  }, []);

  // Mensagem nova: desce sozinho se a pessoa já estava no fim ou se foi ela
  // quem mandou; senão mostra o botão com a contagem (como no WhatsApp).
  useLayoutEffect(() => {
    const count = messages.length;
    const prev = lastCountRef.current;
    lastCountRef.current = count;
    if (count === 0) return;
    if (firstPaintRef.current) {
      firstPaintRef.current = false;
      scrollToBottom(false);
      return;
    }
    if (count <= prev) return;
    const last = messages[count - 1];
    if (atBottom || last.sender_id === currentUserId) scrollToBottom(true);
    else setUnseen((n) => n + (count - prev));
  }, [messages, atBottom, currentUserId, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAtBottom(near);
    if (near) setUnseen(0);
  };

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("chat-msg-flash");
    void el.offsetWidth;
    el.classList.add("chat-msg-flash");
    setTimeout(() => el.classList.remove("chat-msg-flash"), 1600);
  }, []);

  const onReply = useCallback((m: ChatRoomMessage) => {
    setEditing(null);
    setReplyTo(m);
  }, []);
  const onEdit = useCallback((m: ChatRoomMessage) => {
    setReplyTo(null);
    setEditing(m);
  }, []);
  const onDelete = useCallback((m: ChatRoomMessage) => {
    setDeleteError(null);
    setToDelete(m);
  }, []);
  const onRetry = useCallback(
    (m: ChatRoomMessage) => {
      if (m.client_message_id) retrySend(roomId, m.client_message_id);
    },
    [retrySend, roomId],
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const err = await deleteMessage(roomId, toDelete.id);
    setDeleting(false);
    if (err) {
      setDeleteError(err);
      return;
    }
    if (editing?.id === toDelete.id) setEditing(null);
    if (replyTo?.id === toDelete.id) setReplyTo(null);
    setToDelete(null);
  };

  // Escape com a confirmação aberta só cancela a confirmação.
  useEffect(() => {
    if (!toDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setToDelete(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [toDelete]);

  const subtitle = room
    ? isGroup
      ? room.participants
          .map((p) => (p.id === currentUserId ? "Você" : p.name.split(" ")[0]))
          .join(", ")
      : roleLabel(room.participants.find((p) => p.id !== currentUserId)?.role)
    : "";

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col">
      <div
        className="flex h-[60px] shrink-0 items-center gap-2 pl-2 pr-2 text-white"
        style={{ background: BRAND_GRADIENT, backgroundAttachment: fixedGradient ? "fixed" : undefined }}
      >
        {onBack ? (
          <HeaderButton label="Voltar para as conversas" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </HeaderButton>
        ) : (
          <span className="w-2" />
        )}
        {room && <Avatar name={title} src={roomAvatar(room, currentUserId)} group={isGroup} seed={room.id} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
        {controls}
      </div>

      <div className="chat-wallpaper relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden py-3">
          {loadingMessages && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <Spinner size="md" />
            </div>
          )}
          {messagesError && (
            <div className="mx-auto mt-6 w-fit rounded-lg bg-white px-4 py-3 text-center shadow-sm dark:bg-slate-800">
              <p className="text-sm text-red-500">Não foi possível abrir as mensagens.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={retryMessages}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          )}
          {!loadingMessages && !messagesError && messages.length === 0 && (
            <p className="mx-auto mt-6 w-fit max-w-[85%] rounded-lg chat-accent-soft px-3 py-2 text-center text-[12.5px] shadow-sm">
              <Lock className="mr-1 inline h-3 w-3 -translate-y-px" />
              As mensagens desta conversa ficam só entre os participantes, dentro da plataforma.
            </p>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || !sameDay(prev.created_at, m.created_at);
            const first = newDay || prev.sender_id !== m.sender_id;
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.client_message_id ?? m.id}>
                {newDay && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-lg bg-white px-3 py-1 text-[12.5px] font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={first ? "mt-2" : "mt-0.5"}>
                  <ChatBubble
                    message={m}
                    mine={mine}
                    first={first}
                    showSender={isGroup && first}
                    readAllUntil={settings.show_read_receipts ? readAllUntil : null}
                    settings={settings}
                    readOnly={readOnly}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRetry={onRetry}
                    onJumpTo={jumpTo}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            aria-label="Ir para a última mensagem"
            className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-md dark:bg-slate-800 dark:text-slate-300"
          >
            <ChevronDown className="h-5 w-5" />
            {unseen > 0 && (
              <span className="absolute -top-1.5 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full chat-accent-bg px-1 text-[11px] font-semibold">
                {unseen}
              </span>
            )}
          </button>
        )}
      </div>

      {readOnly ? (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
          <Lock className="h-4 w-4" />
          Esta conversa está arquivada — somente leitura.
        </div>
      ) : (
        <ChatComposer
          key={roomId}
          settings={settings}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
          onSendText={(text) => {
            sendMessage(roomId, text, replyTo?.id);
            setReplyTo(null);
          }}
          onSaveEdit={async (text) => {
            if (!editing) return null;
            const err = await editMessage(roomId, editing.id, text);
            if (!err) setEditing(null);
            return err;
          }}
          onSendAttachment={(input) => {
            sendAttachment(roomId, input, replyTo?.id);
            setReplyTo(null);
          }}
        />
      )}

      {toDelete && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setToDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="chat-delete-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800">
            <p id="chat-delete-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Apagar mensagem?
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ela some para todos nesta conversa.</p>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setToDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button className="rounded-full text-white hover:opacity-90" style={{ background: BRAND_BUTTON }} onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? <Spinner size="xs" /> : "Apagar para todos"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPane({ controls }: { controls: React.ReactNode }) {
  return (
    <div className="relative flex h-full min-w-0 flex-col items-center justify-center bg-slate-50 px-8 text-center dark:bg-slate-900">
      <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: BRAND_GRADIENT }} />
      <div className="absolute right-2 top-2 rounded-full bg-slate-500/70">{controls}</div>
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg" style={{ background: BRAND_GRADIENT }}>
        <MessageSquare className="h-12 w-12" />
      </div>
      <p className="text-2xl font-light text-slate-600 dark:text-slate-100">Chat da plataforma</p>
      <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Escolha uma conversa ao lado para ler e responder. Mande texto, emojis, fotos, documentos e mensagens de voz, conforme o que estiver liberado.
      </p>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3 w-3" /> Conversas internas da plataforma
      </p>
    </div>
  );
}

// ─── Lista + conversa ────────────────────────────────────────────────────

/**
 * Uma coluna (lista → conversa) ou duas (lista ao lado da conversa, como o
 * WhatsApp Web). Usado pela janela flutuante e pela janela separada.
 */
function ChatLayout({ twoPanes, controls, fixedGradient }: { twoPanes: boolean; controls: React.ReactNode; fixedGradient: boolean }) {
  const { activeRoomId, openRoom, openDirectWith, backToList, canManage, settings } = useChat();
  const [newOpen, setNewOpen] = useState(false);
  const canStartNew = canManage || settings.allow_new_conversations;

  const pickContact = (id: string) => {
    setNewOpen(false);
    openDirectWith(id);
  };

  const listPane = newOpen ? (
    <NewConversation onBack={() => setNewOpen(false)} onPick={pickContact} fixedGradient={fixedGradient} />
  ) : (
    <RoomList
      onSelect={openRoom}
      onNew={() => setNewOpen(true)}
      canStartNew={canStartNew}
      controls={twoPanes ? null : controls}
      fixedGradient={fixedGradient}
    />
  );

  if (twoPanes) {
    return (
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[34%] min-w-[300px] max-w-[440px] flex-col border-r border-black/10 dark:border-white/10">{listPane}</div>
        <div className="flex min-w-0 flex-1 flex-col">
          {activeRoomId ? <ConversationPane roomId={activeRoomId} onBack={null} controls={controls} fixedGradient={fixedGradient} /> : <EmptyPane controls={controls} />}
        </div>
      </div>
    );
  }
  return activeRoomId ? <ConversationPane roomId={activeRoomId} onBack={backToList} controls={controls} fixedGradient={false} /> : listPane;
}

// ─── Widget ──────────────────────────────────────────────────────────────
export function ChatWidget() {
  const { isOpen, openChat, closeChat, activeRoomId, totalUnread, canUse, settings, mode, setMode } = useChat();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const narrow = useTelaEstreita(640);
  const belowDesktop = useTelaEstreita(1024);

  const canExpand = settings.allow_expanded && !narrow;
  const expanded = canExpand && mode === "expanded";
  const canPopout = settings.allow_popout && !narrow;
  // No desktop o botão fica no canto inferior direito e continua à vista com
  // a janela pequena aberta ao lado dele (vira "minimizar").
  const launcherStays = !belowDesktop && !expanded;

  // O chat é uma janela global: Escape fecha em qualquer página, inclusive
  // quando a página abaixo usa o container branco/painéis de z-index alto.
  // Menus e o seletor de emoji abertos dentro do chat fecham primeiro.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      closeChat();
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeChat]);

  if (!canUse) return null;

  const toggleMode = () => setMode(expanded ? "compact" : "expanded");

  // Janela separada do navegador: abre na mesma conversa e fecha a daqui.
  const popOut = () => {
    const sc = window.screen as Screen & { availLeft?: number; availTop?: number };
    const w = Math.min(1100, sc.availWidth - 40);
    const h = Math.min(780, sc.availHeight - 60);
    const left = Math.round((sc.availLeft ?? 0) + (sc.availWidth - w) / 2);
    const top = Math.round((sc.availTop ?? 0) + (sc.availHeight - h) / 2);
    const url = `/chat-janela${activeRoomId ? `?sala=${encodeURIComponent(activeRoomId)}` : ""}`;
    const win = window.open(url, "allka_chat", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (win) {
      win.focus();
      closeChat();
    }
  };

  const controls = (
    <WindowControls
      expanded={expanded}
      canExpand={canExpand}
      onToggle={toggleMode}
      onClose={closeChat}
      onPopout={canPopout ? popOut : undefined}
      closeRef={closeButtonRef}
    />
  );

  const windowStyle: React.CSSProperties | undefined = narrow
    ? undefined
    : expanded
      ? { width: `${settings.expanded_width_pct}vw`, height: `${settings.expanded_height_pct}vh` }
      : {
          width: `min(${settings.compact_width}px, calc(100vw - 32px))`,
          height: `min(${settings.compact_height}px, calc(100vh - 32px))`,
        };

  return (
    <>
      {isOpen && (
        <>
          {/* O chat precisa ficar acima do shell (sidebar z-100) e de qualquer
              HeaderSlideScreen (z-60). A janela pequena não escurece a página
              (dá para continuar trabalhando com ela aberta); a grande sim. */}
          {expanded && <div onClick={() => setMode("compact")} className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-[1px]" aria-hidden />}
          <div
            className={cn(
              "fixed z-[200] flex flex-col overflow-hidden bg-white dark:bg-slate-900",
              narrow && "inset-0 h-[100dvh] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]",
              // Desktop: ao lado do botão do canto inferior direito, sem cobrir a barra de ícones.
              !narrow && !expanded && "bottom-4 right-4 rounded-xl border border-black/10 shadow-[0_12px_48px_-8px_rgba(0,0,0,0.35)] lg:right-[60px] dark:border-white/10",
              expanded && "left-1/2 top-1/2 max-h-[100vh] max-w-[100vw] -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl",
            )}
            style={windowStyle}
            role="dialog"
            aria-modal={expanded || narrow}
            aria-label="Chat interno"
            data-chat-root=""
            data-chat-mode={narrow ? "mobile" : expanded ? "expanded" : "compact"}
          >
            <ChatLayout twoPanes={expanded} controls={controls} fixedGradient={expanded} />
          </div>
        </>
      )}

      {(!isOpen || launcherStays) && (
        /* O gatilho precisa superar o container branco da página (e a
           sidebar z-100). */
        <button
          onClick={isOpen ? closeChat : openChat}
          aria-label={isOpen ? "Minimizar chat" : "Abrir chat"}
          aria-expanded={isOpen}
          data-tour-id="chat-widget-button"
          style={{ background: BRAND_BUTTON }}
          // Desktop: botão redondo no canto inferior direito, na coluna da
          // barra de ícones. Celular/tablet (< lg): entra na pilha de botões
          // redondos do canto inferior (um degrau acima da Aura, ver
          // iallka-floating-icon.tsx) e some com uma tela deslizante aberta.
          className="group fab-celular fixed z-[120] flex items-center justify-center rounded-full text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] transition-transform max-lg:z-45 max-lg:right-3 max-lg:bottom-[calc(72px+env(safe-area-inset-bottom,0px)+252px)] max-lg:h-12 max-lg:w-12 max-lg:active:scale-95 lg:bottom-4 lg:right-[4px] lg:h-12 lg:w-12 lg:hover:scale-105"
        >
          {isOpen ? <ChevronDown className="h-6 w-6" /> : <MessageSquare className="h-5 w-5" />}
          {!isOpen && totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white shadow">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}
    </>
  );
}

// ─── Janela separada (/chat-janela) ──────────────────────────────────────

/**
 * O chat ocupando uma janela própria do navegador, sem o menu da plataforma
 * — para conversar enquanto usa a plataforma em outra tela. Abre na conversa
 * que estava aberta (?sala=<id>).
 */
export function ChatStandalone() {
  const { openChat, openRoom, canUse, totalUnread } = useChat();
  const twoPanes = !useTelaEstreita(768);

  useEffect(() => {
    openChat();
    const sala = new URLSearchParams(window.location.search).get("sala");
    if (sala) openRoom(sala);
    // só na abertura da janela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Chat · Allka` : "Chat · Allka";
  }, [totalUnread]);

  if (!canUse) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6 text-center font-sans text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        O chat não está liberado para o seu perfil. Feche esta janela.
      </div>
    );
  }

  const controls = (
    <HeaderButton label="Fechar janela" onClick={() => window.close()}>
      <X className="h-5 w-5" />
    </HeaderButton>
  );

  return (
    <div data-chat-root="" data-chat-mode="window" className="fixed inset-0 flex flex-col overflow-hidden bg-white font-sans dark:bg-slate-900">
      <ChatLayout twoPanes={twoPanes} controls={controls} fixedGradient={twoPanes} />
    </div>
  );
}
