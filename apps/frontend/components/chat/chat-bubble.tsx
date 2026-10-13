// Balão de mensagem no estilo WhatsApp Web, nas cores da plataforma: quem
// enviou vê o degradê dos botões do tema (texto branco), os outros branco; horário, "editada" e tiques dentro do balão; menu com
// Responder / Copiar / Editar / Apagar ao passar o mouse (ou tocar).
import { memo } from "react";
import { Ban, Check, CheckCheck, ChevronDown, Clock3, Copy, Pencil, Reply, RotateCw, Trash2, FileText, Image as ImageIcon, Mic } from "lucide-react";
import type { ChatRoomMessage } from "@/types/chat";
import type { ChatSettings } from "@/lib/chat-settings";
import { withinChatWindow } from "@/lib/chat-settings";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChatAudio, ChatFile, ChatImage } from "./chat-media";
import { formatClock, senderColor } from "./chat-utils";

interface Props {
  message: ChatRoomMessage;
  mine: boolean;
  showSender: boolean;
  /** Primeira mensagem de uma sequência da mesma pessoa: ganha a "ponta" do balão. */
  first?: boolean;
  readAllUntil: string | null;
  settings: ChatSettings;
  readOnly: boolean;
  onReply: (m: ChatRoomMessage) => void;
  onEdit: (m: ChatRoomMessage) => void;
  onDelete: (m: ChatRoomMessage) => void;
  onRetry: (m: ChatRoomMessage) => void;
  onJumpTo: (id: string) => void;
}

function ReplyQuote({ reply, mine, onJumpTo }: { reply: NonNullable<ChatRoomMessage["reply_to"]>; mine: boolean; onJumpTo: (id: string) => void }) {
  const color = mine ? "#fff" : senderColor(reply.sender_name ?? reply.id);
  const label = reply.deleted
    ? "Mensagem apagada"
    : reply.content || (reply.type === "image" ? "Foto" : reply.type === "audio" ? "Mensagem de voz" : reply.type === "file" ? "Documento" : "");
  return (
    <button
      type="button"
      onClick={() => onJumpTo(reply.id)}
      className={cn(
        "mb-1 flex w-full min-w-0 overflow-hidden rounded-md text-left",
        mine ? "bg-white/15" : "bg-slate-100 dark:bg-black/20",
      )}
    >
      <span className="w-1 shrink-0" style={{ background: color }} />
      <span className="min-w-0 px-2 py-1">
        <span className="block truncate text-xs font-semibold" style={{ color }}>
          {reply.sender_name ?? "Mensagem"}
        </span>
        <span className={cn("flex items-center gap-1 truncate text-xs", mine ? "text-white/80" : "text-slate-600 dark:text-slate-300")}>
          {!reply.deleted && reply.type === "image" && <ImageIcon className="h-3 w-3 shrink-0" />}
          {!reply.deleted && reply.type === "audio" && <Mic className="h-3 w-3 shrink-0" />}
          {!reply.deleted && reply.type === "file" && <FileText className="h-3 w-3 shrink-0" />}
          <span className={cn("truncate", reply.deleted && "italic")}>{label}</span>
        </span>
      </span>
    </button>
  );
}

function ChatBubbleImpl({ message: m, mine, showSender, first = false, readAllUntil, settings, readOnly, onReply, onEdit, onDelete, onRetry, onJumpTo }: Props) {
  const deleted = !!m.deleted_at;
  const type = m.type ?? "text";
  const isLocal = m.pending || m.failed;
  const read = !!readAllUntil && !isLocal && new Date(m.created_at).getTime() <= new Date(readAllUntil).getTime();

  const canReply = !deleted && !isLocal && !readOnly && settings.allow_reply;
  const canEdit = mine && !deleted && !isLocal && !readOnly && type === "text" && settings.allow_edit && withinChatWindow(m.created_at, settings.edit_window_minutes);
  const canDelete = mine && !deleted && !isLocal && !readOnly && settings.allow_delete && withinChatWindow(m.created_at, settings.delete_window_minutes);
  const canCopy = !deleted && !!m.content;
  const hasMenu = canReply || canEdit || canDelete || canCopy;

  const meta = (
    <span
      className={cn(
        "ml-2 inline-flex translate-y-1 items-center gap-1 whitespace-nowrap align-bottom text-[11px]",
        mine ? "text-white/75" : "text-slate-500 dark:text-slate-400",
        type === "image" && !m.content && "absolute bottom-1.5 right-2 translate-y-0 rounded-full bg-black/40 px-1.5 text-white dark:text-white",
      )}
    >
      {m.edited_at && !deleted && <span>editada</span>}
      <span>{formatClock(m.created_at)}</span>
      {mine && !deleted && (
        m.pending ? (
          <Clock3 className="h-3 w-3" aria-label="Enviando" />
        ) : m.failed ? null : read ? (
          <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Lida" />
        ) : (
          <Check className="h-3.5 w-3.5" aria-label="Enviada" />
        )
      )}
    </span>
  );

  return (
    <div id={`chat-msg-${m.id}`} className={cn("group/msg flex px-[4%] sm:px-[6%]", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-2 pb-1.5 pt-1 text-[14.2px] leading-[19px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] sm:max-w-[65%]",
          mine ? "chat-brand chat-on-brand" : "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100",
          first && (mine ? "rounded-tr-none" : "rounded-tl-none"),
        )}
      >
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-slate-500 opacity-0 transition-opacity focus:opacity-100 group-hover/msg:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-60",
                  mine ? "bg-black/25 text-white" : "bg-white dark:bg-slate-800",
                )}
                aria-label="Opções da mensagem"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={mine ? "end" : "start"} className="z-[260] min-w-40">
              {canReply && (
                <DropdownMenuItem onSelect={() => onReply(m)}>
                  <Reply className="mr-2 h-4 w-4" /> Responder
                </DropdownMenuItem>
              )}
              {canCopy && (
                <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(m.content).catch(() => {})}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onSelect={() => onEdit(m)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onSelect={() => onDelete(m)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Apagar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {showSender && !mine && (
          <p className="mb-0.5 pr-6 text-[12.8px] font-semibold" style={{ color: senderColor(m.sender_id) }}>
            {m.sender?.name}
          </p>
        )}

        {deleted ? (
          <p className={cn("flex items-center gap-1.5 pr-1 italic", mine ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
            <Ban className="h-4 w-4" /> {mine ? "Você apagou esta mensagem" : "Mensagem apagada"}
            {meta}
          </p>
        ) : (
          <>
            {m.reply_to && <ReplyQuote reply={m.reply_to} mine={mine} onJumpTo={onJumpTo} />}
            {type === "image" && (
              <div className="relative -mx-1 mb-1 mt-0.5">
                <ChatImage message={m} />
                {!m.content && meta}
              </div>
            )}
            {type === "audio" && (
              <div className={cn(hasMenu && "pr-5")}>
                <ChatAudio message={m} mine={mine} />
              </div>
            )}
            {type === "file" && (
              <div className="mb-1 mt-0.5">
                <ChatFile message={m} mine={mine} />
              </div>
            )}
            {(type === "text" || m.content || type === "audio" || type === "file") && (
              <p className={cn("whitespace-pre-wrap break-words pr-1", hasMenu && type === "text" && "pr-5")}>
                {m.content}
                {(type !== "image" || m.content) && meta}
              </p>
            )}
          </>
        )}

        {m.failed && (
          <button type="button" onClick={() => onRetry(m)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-200">
            <RotateCw className="h-3 w-3" /> Não enviada — tocar para tentar de novo
          </button>
        )}
      </div>
    </div>
  );
}

export const ChatBubble = memo(ChatBubbleImpl);
