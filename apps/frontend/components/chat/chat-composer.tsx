// Barra de escrita no estilo WhatsApp Web: emoji, anexar (imagem/documento),
// campo de texto que cresce, e microfone quando o campo está vazio. Também
// cuida das barras de "Respondendo a…" / "Editando mensagem" e da prévia do
// anexo com legenda antes de enviar. Tudo o que aparece respeita as
// configurações do chat (Configurações > Chat).
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Mic, Paperclip, Pencil, Send, Smile, Trash2, X } from "lucide-react";
import type { ChatRoomMessage } from "@/types/chat";
import type { ChatSettings } from "@/lib/chat-settings";
import type { ChatAttachmentInput } from "@/contexts/chat-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration, senderColor } from "./chat-utils";

/** Cor de destaque do tema (Personalizar Sidebar → item ativo). */
const ACCENT = "var(--app-brand-active, #c81a7f)";

const EmojiPicker = lazy(() => import("@/app/dashboard/share/_components/emoji-picker"));

interface Props {
  settings: ChatSettings;
  replyTo: ChatRoomMessage | null;
  editing: ChatRoomMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSendText: (text: string) => void;
  onSaveEdit: (text: string) => Promise<string | null>;
  onSendAttachment: (input: ChatAttachmentInput) => void;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* navegador antigo */
    }
  }
  return "";
}

export function ChatComposer({ settings, replyTo, editing, onCancelReply, onCancelEdit, onSendText, onSaveEdit, onSendAttachment }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; kind: "image" | "file"; preview: string | null } | null>(null);
  const [caption, setCaption] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);

  // Editar: o texto da mensagem vai para o campo.
  useEffect(() => {
    if (editing) {
      setText(editing.content);
      requestAnimationFrame(() => taRef.current?.focus());
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) taRef.current?.focus();
  }, [replyTo]);

  // Campo cresce com o texto, até 6 linhas.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  useEffect(() => () => stopTracks(), []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  function stopTracks() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const submitText = async () => {
    const t = text.trim();
    if (!t) return;
    if (t.length > settings.max_message_chars) {
      setError(`A mensagem passou do limite de ${settings.max_message_chars} caracteres.`);
      return;
    }
    if (editing) {
      if (t === editing.content) {
        onCancelEdit();
        setText("");
        return;
      }
      setSavingEdit(true);
      const err = await onSaveEdit(t);
      setSavingEdit(false);
      if (err) {
        setError(err);
        return;
      }
      setText("");
      return;
    }
    onSendText(t);
    setText("");
  };

  const choose = (file: File | undefined, kind: "image" | "file") => {
    if (!file) return;
    if (file.size > settings.max_file_mb * 1024 * 1024) {
      setError(`O arquivo passou do limite de ${settings.max_file_mb} MB.`);
      return;
    }
    if (kind === "file") {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const allowed = settings.allowed_extensions.split(",").map((s) => s.trim().replace(/^\./, "").toLowerCase()).filter(Boolean);
      if (!allowed.includes(ext)) {
        setError("Este tipo de arquivo não é aceito no chat.");
        return;
      }
    }
    setPending({ file, kind, preview: kind === "image" ? URL.createObjectURL(file) : null });
    setCaption(text);
    setText("");
  };

  const clearPending = () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
    setPending(null);
    setCaption("");
  };

  const sendPending = () => {
    if (!pending) return;
    onSendAttachment({ blob: pending.file, fileName: pending.file.name, kind: pending.kind, caption: caption.trim() || undefined });
    clearPending();
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não grava áudio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      discardRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        stopTracks();
        setRecording(false);
        if (discardRef.current || chunksRef.current.length === 0) return;
        if (seconds < 1) {
          setError("Segure um pouco mais — o áudio ficou curto demais.");
          return;
        }
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onSendAttachment({ blob, fileName: `audio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`, kind: "audio", duration_sec: Math.min(seconds, settings.max_audio_seconds) });
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setRecSeconds(0);
      rec.start(250);
      setRecording(true);
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setRecSeconds(s);
        if (s >= settings.max_audio_seconds) finishRecording(false);
      }, 250);
    } catch {
      stopTracks();
      setError("Não foi possível usar o microfone. Verifique a permissão do navegador.");
    }
  };

  function finishRecording(discard: boolean) {
    discardRef.current = discard;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else {
      stopTracks();
      setRecording(false);
    }
  }

  const canAttach = settings.allow_images || settings.allow_files;
  const showMic = settings.allow_audio && !text.trim() && !editing;

  return (
    <div className="relative shrink-0 border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      {error && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white shadow-lg" role="alert">
          {error}
        </div>
      )}

      {/* Prévia do anexo com legenda */}
      {pending && (
        <div className="border-b border-black/5 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{pending.kind === "image" ? "Enviar imagem" : "Enviar documento"}</p>
            <button type="button" onClick={clearPending} className="rounded-full p-1.5 text-slate-500 hover:bg-black/5" aria-label="Cancelar anexo">
              <X className="h-4 w-4" />
            </button>
          </div>
          {pending.preview ? (
            <img src={pending.preview} alt={pending.file.name} className="mx-auto max-h-48 rounded-lg object-contain" />
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
              <FileText className="h-8 w-8 text-slate-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{pending.file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(pending.file.size)}</p>
              </div>
            </div>
          )}
          <div className="mt-2 flex items-end gap-2">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendPending();
                }
              }}
              placeholder="Adicione uma legenda"
              aria-label="Legenda"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-800"
            />
            <button type="button" onClick={sendPending} className="chat-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Enviar anexo">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Respondendo / editando */}
      {(replyTo || editing) && !pending && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
            <span className="w-1 shrink-0" style={{ background: editing ? ACCENT : senderColor(replyTo!.sender?.name ?? replyTo!.id) }} />
            <div className="min-w-0 px-2.5 py-1.5">
              <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: editing ? ACCENT : senderColor(replyTo!.sender?.name ?? replyTo!.id) }}>
                {editing ? <><Pencil className="h-3 w-3" /> Editando mensagem</> : <>Respondendo a {replyTo!.sender?.name ?? "mensagem"}</>}
              </p>
              <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                {editing
                  ? editing.content
                  : replyTo!.content || (replyTo!.type === "image" ? "Foto" : replyTo!.type === "audio" ? "Mensagem de voz" : replyTo!.type === "file" ? replyTo!.attachment?.name ?? "Documento" : "")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                onCancelEdit();
                setText("");
              } else onCancelReply();
            }}
            className="rounded-full p-1.5 text-slate-500 hover:bg-black/5"
            aria-label={editing ? "Cancelar edição" : "Cancelar resposta"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button type="button" onClick={() => finishRecording(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-black/5" aria-label="Descartar áudio">
            <Trash2 className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-800">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">{formatDuration(recSeconds)}</span>
            <span className="ml-auto text-xs text-slate-400">máx. {formatDuration(settings.max_audio_seconds)}</span>
          </div>
          <button type="button" onClick={() => finishRecording(false)} className="chat-brand flex h-10 w-10 items-center justify-center rounded-full" aria-label="Enviar áudio">
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1 px-2 py-2 sm:gap-1.5 sm:px-3">
          {settings.allow_emoji && (
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-black/5 dark:text-slate-400" aria-label="Emojis">
                  <Smile className="h-6 w-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="z-[260] w-auto border-0 p-0 shadow-xl">
                <Suspense fallback={<div className="flex h-[360px] w-[320px] items-center justify-center"><Spinner size="md" /></div>}>
                  <EmojiPicker
                    onSelect={(emoji) => {
                      const el = taRef.current;
                      if (el) {
                        const start = el.selectionStart ?? text.length;
                        const end = el.selectionEnd ?? text.length;
                        setText(text.slice(0, start) + emoji + text.slice(end));
                        requestAnimationFrame(() => {
                          el.focus();
                          el.setSelectionRange(start + emoji.length, start + emoji.length);
                        });
                      } else setText((t) => t + emoji);
                    }}
                  />
                </Suspense>
              </PopoverContent>
            </Popover>
          )}

          {canAttach && !editing && (
            <Popover open={attachOpen} onOpenChange={setAttachOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-black/5 dark:text-slate-400" aria-label="Anexar">
                  <Paperclip className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="z-[260] w-48 p-1.5">
                {settings.allow_images && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttachOpen(false);
                      imageInput.current?.click();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full chat-accent-bg"><ImageIcon className="h-4 w-4" /></span>
                    Fotos
                  </button>
                )}
                {settings.allow_files && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttachOpen(false);
                      fileInput.current?.click();
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full chat-brand"><FileText className="h-4 w-4" /></span>
                    Documento
                  </button>
                )}
              </PopoverContent>
            </Popover>
          )}
          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { choose(e.target.files?.[0], "image"); e.target.value = ""; }} />
          <input
            ref={fileInput}
            type="file"
            accept={settings.allowed_extensions.split(",").map((s) => `.${s.trim().replace(/^\./, "")}`).join(",")}
            className="hidden"
            onChange={(e) => { choose(e.target.files?.[0], "file"); e.target.value = ""; }}
          />

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && (editing || replyTo)) {
                e.stopPropagation();
                if (editing) {
                  onCancelEdit();
                  setText("");
                } else onCancelReply();
                return;
              }
              const sends = settings.enter_sends ? e.key === "Enter" && !e.shiftKey : e.key === "Enter" && (e.ctrlKey || e.metaKey);
              if (sends) {
                e.preventDefault();
                void submitText();
              }
            }}
            onPaste={(e) => {
              const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
              if (img && settings.allow_images && !editing) {
                e.preventDefault();
                choose(img, "image");
              }
            }}
            rows={1}
            maxLength={settings.max_message_chars}
            placeholder={editing ? "Edite a mensagem" : "Digite uma mensagem"}
            aria-label="Mensagem"
            className="max-h-[132px] min-h-10 min-w-0 flex-1 resize-none rounded-lg border-0 bg-slate-100 px-3 py-2.5 text-[15px] leading-5 outline-none placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100"
          />

          {showMic ? (
            <button type="button" onClick={() => void startRecording()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-black/5 dark:text-slate-400" aria-label="Gravar áudio">
              <Mic className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitText()}
              disabled={!text.trim() || savingEdit}
              className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors", text.trim() ? "chat-brand" : "bg-slate-300 dark:bg-slate-600")}
              aria-label={editing ? "Salvar edição" : "Enviar"}
            >
              {savingEdit ? <Spinner size="xs" /> : <Send className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
