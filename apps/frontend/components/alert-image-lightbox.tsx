/**
 * Miniatura clicável + visualizador ampliado (lightbox) pra imagem de
 * alerta (Padrão/Avulso/Programado — ata 2026-08, 4º lote). Nenhum
 * componente desse tipo existia na base; este envolve o Dialog padrão
 * (components/ui/dialog.tsx) em vez de inventar um overlay próprio —
 * fechamento por click-outside/Esc/X já vem de graça do Radix.
 *
 * A miniatura nunca deve dominar a linha da lista — compacta por padrão
 * (h-12 w-12), decisão já tomada fora deste arquivo. Se a imagem falhar
 * (404/rede), mostra um estado de placeholder, nunca o ícone quebrado do
 * navegador.
 */
import { useEffect, useState } from "react";
import { ImageOff, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AlertImageThumbnailProps {
  src: string | null | undefined;
  alt: string | null | undefined;
  className?: string;
}

export function AlertImageThumbnail({ src, alt, className }: AlertImageThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // A rota de imagem exige Bearer token — um <img src> direto pra ela
  // apanha (ERR_BLOCKED_BY_ORB) porque a tag não manda o header de auth.
  // Busca autenticada + Object URL, mesmo padrão já usado pra anexos de
  // projeto (ver apiClient.fetchAlertImageBlobUrl).
  useEffect(() => {
    setBroken(false);
    setObjectUrl(null);
    if (!src) return;
    let cancelled = false;
    let created: string | null = null;
    apiClient
      .fetchAlertImageBlobUrl(src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBroken(true);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (!src) return null;

  const altText = alt?.trim() || "Imagem do alerta";

  if (broken) {
    return (
      <div
        className={cn(
          "h-12 w-12 rounded shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700",
          className,
        )}
        title="Imagem indisponível"
      >
        <ImageOff className="h-4 w-4" aria-hidden="true" />
      </div>
    );
  }

  if (!objectUrl) {
    // Ainda buscando o blob autenticado — estado neutro, nunca o mesmo
    // visual de "indisponível" (evita parecer quebrada por uma fração de
    // segundo em toda carga de lista).
    return (
      <div
        className={cn("h-12 w-12 rounded shrink-0 bg-slate-100 dark:bg-slate-800 animate-pulse", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative h-12 w-12 rounded shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 group",
          className,
        )}
        title="Ampliar imagem"
      >
        <img
          src={objectUrl}
          alt={altText}
          className="h-12 w-12 rounded object-cover shrink-0"
          onError={() => setBroken(true)}
        />
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] p-4">
          <DialogTitle className="sr-only">{altText}</DialogTitle>
          <img src={objectUrl} alt={altText} className="w-full max-h-[70vh] object-contain rounded-lg" onError={() => setBroken(true)} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{altText}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
