/**
 * Campo reutilizável "imagem do alerta" — usado no formulário de Avulso, na
 * edição de Padrão e no formulário de Programado (ata 2026-08, 4º lote;
 * upgrade visual/UX no 5º lote; padrão de dimensão corrigido de 1200×400
 * pra 1200×200 num lote seguinte — 6:1, achado alto demais na revisão do
 * responsável). Mostra o preview completo em proporção 6:1 (AlertBannerImage,
 * `object-contain`, nunca cortado) ou uma moldura vazia 6:1 antes da
 * seleção, um texto de orientação fixo (1200×200/6:1/formatos/5MB), input
 * de texto alternativo (obrigatório quando há imagem — mesma regra do
 * backend, reforçada aqui só como UX, o servidor é a autoridade real) e os
 * botões Selecionar/Substituir/Remover.
 *
 * Validação client-side (tipo/tamanho/dimensão exata 1200×200 via
 * readImageDimensions) é só feedback rápido — o backend valida por
 * CONTEÚDO real do arquivo (assinatura de bytes + dimensão decodificada de
 * verdade), não confia em nada calculado aqui. Se o upload falhar (incluindo
 * o backend discordando da pré-checagem local), o campo mostra o erro e
 * NUNCA finge que uma imagem foi anexada (o `image_file_name` só é setado
 * depois de uma resposta 201 de verdade).
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBannerImage } from "@/components/alert-banner-image";
import { apiClient } from "@/lib/api-client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — mesmo limite do backend (MAX_ALERT_IMAGE_BYTES)
const REQUIRED_WIDTH = 1200;
const REQUIRED_HEIGHT = 200;

// Lê as dimensões reais do arquivo selecionado ANTES de chamar o upload —
// puro ganho de UX (feedback imediato, sem round-trip de rede). O backend
// permanece a autoridade real (valida por conteúdo decodificado, não
// confia nisso) — se algum dia divergirem, a rejeição do backend ainda
// precisa aparecer normalmente (ver catch em handleFileSelected).
//
// Object URL aqui é local e de vida curta: criado só pra o navegador
// decodificar as dimensões, revogado imediatamente após o load/error —
// nunca é o mesmo Object URL usado pra exibição (esse vem do
// fetchAlertImageBlobUrl, autenticado, via AlertBannerImage/Thumbnail).
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(tempUrl);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    img.src = tempUrl;
  });
}

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

    try {
      const { width, height } = await readImageDimensions(file);
      if (width !== REQUIRED_WIDTH || height !== REQUIRED_HEIGHT) {
        setError(
          `A imagem selecionada possui ${width} × ${height} px. Selecione uma imagem de exatamente ${REQUIRED_WIDTH} × ${REQUIRED_HEIGHT} px.`,
        );
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    } catch {
      setError("Não foi possível ler a imagem selecionada. Tente outro arquivo.");
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

      {/* Texto de orientação (ata 2026-08, 5º lote; padrão corrigido pra
          1200×200/6:1 num lote seguinte) — verbatim, exibido sempre, antes e
          depois da seleção, pra deixar claro o formato exigido pelo backend
          (1200×200 exato em upload novo). */}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
        Use um banner de 1200 × 200 px (proporção 6:1), em JPG, PNG ou WebP, com até 5 MB.
      </p>

      <div className="mb-3">
        {hasImage ? (
          <AlertBannerImage src={value.image_url} alt={value.image_alt} />
        ) : (
          <div
            className="w-full aspect-[6/1] rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center leading-tight"
            data-testid="alert-image-empty-frame"
          >
            Sem imagem
          </div>
        )}
      </div>

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
