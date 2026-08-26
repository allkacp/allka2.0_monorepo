/**
 * Campo reutilizável "imagem do alerta" — usado no formulário de Avulso, na
 * edição de Padrão e no formulário de Programado (ata 2026-08, 4º lote).
 * Mostra a miniatura atual (ou estado "sem imagem"), input de texto
 * alternativo (obrigatório quando há imagem — mesma regra do backend,
 * reforçada aqui só como UX, o servidor é a autoridade real) e os botões
 * Selecionar/Substituir/Remover.
 *
 * Validação client-side (tipo/tamanho) é só feedback rápido — o backend
 * valida por CONTEÚDO real do arquivo (assinatura de bytes), não confia no
 * Content-Type/extensão. Se o upload falhar, o campo mostra o erro e NUNCA
 * finge que uma imagem foi anexada (o `image_file_name` só é setado depois
 * de uma resposta 201 de verdade).
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertImageThumbnail } from "@/components/alert-image-lightbox";
import { apiClient } from "@/lib/api-client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — mesmo limite do backend (MAX_ALERT_IMAGE_BYTES)

export interface AlertImageFieldValue {
  image_file_name: string | null;
  image_alt: string | null;
  /** URL já resolvida (com host), pronta pro <img src> — só pra exibir. */
  image_url: string | null;
}

interface AlertImageFieldProps {
  value: AlertImageFieldValue;
  onChange: (value: AlertImageFieldValue) => void;
  disabled?: boolean;
}

export function AlertImageField({ value, onChange, disabled }: AlertImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato inválido — envie JPEG, PNG ou WebP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande — o limite é 5MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const res = await apiClient.uploadAlertImage(file);
      onChange({
        image_file_name: res.file_name,
        image_alt: value.image_alt,
        image_url: apiClient.resolveAlertImageUrl(res.url),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setError(null);
    onChange({ image_file_name: null, image_alt: null, image_url: null });
  }

  const hasImage = !!value.image_file_name;
  const altMissing = hasImage && !value.image_alt?.trim();

  return (
    <div>
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Imagem (opcional)</label>

      <div className="flex items-center gap-3">
        {hasImage ? (
          <AlertImageThumbnail src={value.image_url} alt={value.image_alt} />
        ) : (
          <div className="h-12 w-12 rounded shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-[9px] text-slate-400 text-center leading-tight">
            Sem imagem
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFileSelected(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {uploading ? "Enviando..." : hasImage ? "Substituir" : "Selecionar imagem"}
          </Button>
          {hasImage && (
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-red-600 dark:text-red-400" disabled={disabled || uploading} onClick={handleRemove}>
              <X className="h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>
      </div>

      {hasImage && (
        <div className="mt-2">
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            Texto alternativo <span className="text-red-500">*</span>
          </label>
          <Input
            value={value.image_alt ?? ""}
            onChange={(e) => onChange({ ...value, image_alt: e.target.value })}
            placeholder="Descreva a imagem para leitores de tela"
            maxLength={300}
            disabled={disabled}
          />
          {altMissing && <p className="text-[10px] text-red-500 mt-1">Texto alternativo é obrigatório quando há imagem.</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

/** Válido pra envio: sem imagem, ou com imagem + alt preenchido. */
export function isAlertImageFieldValid(value: AlertImageFieldValue): boolean {
  return !value.image_file_name || !!value.image_alt?.trim();
}
