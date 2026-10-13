// Anexos do chat: imagem, áudio e documento. A rota do anexo exige o token no
// cabeçalho (um <img src> não envia), então o arquivo vem como Blob e vira um
// endereço local — guardado em cache para o polling não baixar tudo de novo.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Pause, Play, X, ImageOff } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { ChatRoomMessage } from "@/types/chat";
import { Spinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration } from "./chat-utils";

const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function fetchUrl(messageId: string): Promise<string> {
  const cached = urlCache.get(messageId);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(messageId);
  if (running) return running;
  const job = apiClient
    .getChatAttachment(messageId)
    .then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      urlCache.set(messageId, url);
      return url;
    })
    .finally(() => inflight.delete(messageId));
  inflight.set(messageId, job);
  return job;
}

/** Endereço local do anexo (do arquivo recém-enviado ou baixado do servidor). */
export function useAttachmentUrl(message: ChatRoomMessage, enabled = true) {
  const [url, setUrl] = useState<string | null>(() => (message.localFile ? null : urlCache.get(message.id) ?? null));
  const [error, setError] = useState(false);
  const localBlob = message.localFile?.blob;

  useEffect(() => {
    if (localBlob) {
      const u = URL.createObjectURL(localBlob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    if (!enabled || message.id.startsWith("local-")) return;
    let alive = true;
    setError(false);
    fetchUrl(message.id)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [message.id, localBlob, enabled]);

  return { url, error };
}

async function download(message: ChatRoomMessage) {
  try {
    const url = message.localFile ? URL.createObjectURL(message.localFile.blob) : await fetchUrl(message.id);
    const a = document.createElement("a");
    a.href = url;
    a.download = message.attachment?.name || "arquivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* o botão continua disponível para tentar de novo */
  }
}

export function ChatImage({ message }: { message: ChatRoomMessage }) {
  const { url, error } = useAttachmentUrl(message);
  const [open, setOpen] = useState(false);

  // Escape fecha só a imagem ampliada (e não o chat inteiro, que também ouve Escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        className="block overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
        aria-label={`Abrir imagem ${message.attachment?.name ?? ""}`}
      >
        {url ? (
          <img src={url} alt={message.attachment?.name ?? "Imagem"} className="block max-h-72 w-full max-w-[280px] object-cover" />
        ) : (
          <div className="flex h-40 w-56 items-center justify-center">
            {error ? <ImageOff className="h-6 w-6 text-slate-400" /> : <Spinner size="sm" />}
          </div>
        )}
      </button>
      {open && url &&
        createPortal(
          <div
            className="fixed inset-0 z-[260] flex flex-col bg-black/90"
            data-chat-lightbox=""
            role="dialog"
            aria-modal="true"
            aria-label="Imagem"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <p className="min-w-0 truncate text-sm">{message.attachment?.name}</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => void download(message)} className="rounded-full p-2 hover:bg-white/10" aria-label="Baixar">
                  <Download className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
              <img src={url} alt={message.attachment?.name ?? "Imagem"} className="max-h-full max-w-full object-contain" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function ChatAudio({ message, mine }: { message: ChatRoomMessage; mine: boolean }) {
  const [wanted, setWanted] = useState(!!message.localFile);
  const { url, error } = useAttachmentUrl(message, wanted);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number>(message.attachment?.duration_sec ?? 0);
  const [rate, setRate] = useState(1);
  const playWhenReady = useRef(false);

  useEffect(() => {
    if (url && playWhenReady.current && audioRef.current) {
      playWhenReady.current = false;
      void audioRef.current.play().catch(() => {});
    }
  }, [url]);

  const toggle = () => {
    const el = audioRef.current;
    if (!url || !el) {
      playWhenReady.current = true;
      setWanted(true);
      return;
    }
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="flex w-[240px] max-w-full items-center gap-2.5 py-1">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-white/20 text-white" : "chat-accent-bg",
        )}
        aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
      >
        {wanted && !url && !error ? <Spinner size="xs" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={current}
          onChange={(e) => {
            const v = Number(e.target.value);
            setCurrent(v);
            if (audioRef.current) audioRef.current.currentTime = v;
          }}
          className="chat-audio-range h-1 w-full cursor-pointer"
          style={{ ["--chat-audio-pct" as string]: `${pct}%` }}
          aria-label="Posição do áudio"
          disabled={!url}
        />
        <div className={cn("mt-1 flex items-center justify-between text-[11px]", mine ? "text-white/75" : "text-slate-500 dark:text-slate-400")}>
          <span>{error ? "Áudio indisponível" : formatDuration(playing || current > 0 ? current : duration)}</span>
          <button
            type="button"
            onClick={() => {
              const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
              setRate(next);
              if (audioRef.current) audioRef.current.playbackRate = next;
            }}
            className={cn("rounded-full px-1.5 font-semibold", mine ? "bg-white/20" : "bg-black/5 dark:bg-white/10")}
            aria-label="Velocidade do áudio"
          >
            {rate}×
          </button>
        </div>
      </div>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
            e.currentTarget.playbackRate = rate;
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}

export function ChatFile({ message, mine = false }: { message: ChatRoomMessage; mine?: boolean }) {
  const name = message.attachment?.name ?? "Documento";
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 4) : "ARQ";
  return (
    <button
      type="button"
      onClick={() => void download(message)}
      className={cn(
        "flex w-[260px] max-w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        mine ? "bg-white/15 hover:bg-white/25" : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10",
      )}
      aria-label={`Baixar ${name}`}
    >
      <div className="relative flex h-10 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
        <FileText className="h-5 w-5" />
        <span className="absolute -bottom-1 rounded bg-rose-500 px-1 text-[8px] font-bold leading-3 text-white">{ext}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className={cn("text-[11px]", mine ? "text-white/75" : "text-slate-500 dark:text-slate-400")}>{formatBytes(message.attachment?.size)}</p>
      </div>
      <Download className={cn("h-4 w-4 shrink-0", mine ? "text-white/80" : "text-slate-500")} />
    </button>
  );
}
