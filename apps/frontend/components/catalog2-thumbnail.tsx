"use client";

// Miniatura do catalog2 (Cadastro + Catálogo + detalhe) — reparo 2026-09
// ("restaurar imagens reais"). Fonte PRINCIPAL: `imagePath`, vindo do backend
// (Catalog2ProvisionalPreview.image_path — um arquivo REAL já existente em
// /images/products, nunca baixado da internet, nunca movido/alterado). O
// ícone + gradiente determinístico (lib/catalog2-provisional.ts) só aparece
// como ÚLTIMO recurso: quando não há `imagePath` nenhum, ou quando o arquivo
// falha ao carregar — nunca como fonte principal.
import { useState } from "react";
import { Package, Boxes, Layers, Briefcase, Sparkles, Target } from "lucide-react";
import { provisionalThumbnail, type ThumbnailIconKey } from "@/lib/catalog2-provisional";
import { ProvisionalBadge } from "@/components/provisional-badge";

const ICONS: Record<ThumbnailIconKey, React.ElementType> = {
  Package, Boxes, Layers, Briefcase, Sparkles, Target,
};

export function Catalog2Thumbnail({
  productId, imagePath, size = "md", showBadge = true,
}: {
  productId: string;
  /** Caminho real (ex.: "/images/products/alk-ads-001.svg"), vindo do backend. */
  imagePath?: string | null;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const dims = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-full w-full" : "h-16 w-16";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";
  const hasRealImage = !!imagePath && !failed;

  if (hasRealImage) {
    return (
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 shadow-sm ${dims}`}>
        <img
          src={imagePath}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        {showBadge && (
          <div className="absolute -bottom-1 -right-1">
            <ProvisionalBadge label="Imagem provisória — reaproveitada para visualização, substituir pela imagem definitiva do produto." />
          </div>
        )}
      </div>
    );
  }

  // Fallback: falha de carregamento OU produto ainda sem nenhuma imagem
  // provisória associada (nunca o caminho principal — ver comentário acima).
  const { value } = provisionalThumbnail(productId);
  const Icon = ICONS[value.iconKey];
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br shadow-sm ${dims} ${value.gradient}`}>
      <Icon className={`${iconSize} text-white/90`} />
      {showBadge && (
        <div className="absolute -bottom-1 -right-1">
          <ProvisionalBadge label="Imagem provisória — substituir quando o catalog2 tiver campo de imagem definitivo." />
        </div>
      )}
    </div>
  );
}
