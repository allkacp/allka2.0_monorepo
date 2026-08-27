/**
 * Banner completo de imagem de alerta (ata 2026-08, 5º lote — correção de
 * UX; padrão de dimensão corrigido de 1200×400/3:1 pra 1200×200/6:1 num
 * lote seguinte, achado alto demais na revisão do responsável). Diferente
 * de AlertImageThumbnail (miniatura compacta h-12 w-12, `object-cover`,
 * usada nas listas administrativas — nunca mexer nisso aqui), este
 * componente mostra a imagem INTEIRA, sem cortar: proporção fixa 6:1 (o
 * formato exigido no upload, 1200×200), `object-fit: contain` — nunca
 * `cover`. Precisa continuar funcionando pra imagens antigas fora de 6:1
 * (inclusive as 1200×400/3:1 de um lote anterior, nunca migradas): a
 * proporção real da imagem é preservada dentro do quadro 6:1, com barras
 * neutras (letterboxing) se for diferente.
 *
 * Usado em dois lugares: dentro do preview dos 3 formulários (Avulso,
 * Padrão, Programado — ver alert-image-field.tsx) e no feed pessoal de
 * alertas do destinatário (AlertsPanel), pra fechar a lacuna funcional
 * "recebi um alerta com imagem e nunca vi a imagem".
 */
import { useState } from "react";
import { ImageOff, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthenticatedImageBlob } from "@/lib/use-authenticated-image-blob";
import { cn } from "@/lib/utils";

interface AlertBannerImageProps {
  src: string | null | undefined;
  alt: string | null | undefined;
  className?: string;
}

export function AlertBannerImage({ src, alt, className }: AlertBannerImageProps) {
  const [open, setOpen] = useState(false);
  const { objectUrl, broken, setBroken } = useAuthenticatedImageBlob(src);

  if (!src) return null;

  const altText = alt?.trim() || "Imagem do alerta";

  if (broken) {
    return (
      <div
        className={cn(
          "w-full aspect-[6/1] rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700",
          className,
        )}
        title="Imagem indisponível"
      >
        <ImageOff className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  if (!objectUrl) {
    // Estado neutro enquanto busca o blob autenticado — nunca o mesmo
    // visual de "indisponível" por uma fração de segundo.
    return (
      <div
        className={cn("w-full aspect-[6/1] rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse", className)}
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
          "relative w-full aspect-[6/1] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 group block",
          className,
        )}
        title="Ampliar imagem"
      >
        <img
          src={objectUrl}
          alt={altText}
          className="w-full h-full object-contain"
          onError={() => setBroken(true)}
        />
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="h-5 w-5 text-white" aria-hidden="true" />
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
