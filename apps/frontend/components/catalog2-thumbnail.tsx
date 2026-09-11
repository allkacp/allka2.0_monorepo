"use client";

// Miniatura provisória compartilhada (Cadastro + Catálogo) — reparo 2026-09.
// Catalog2 ainda não tem campo de imagem definitivo; até que exista, cada
// produto ganha um ícone + gradiente determinístico (nunca uma foto, nunca
// baixado da internet, nunca reaproveitado de produto antigo). O selo
// "provisório" só aparece pra Admin Master.
import { Package, Boxes, Layers, Briefcase, Sparkles, Target } from "lucide-react";
import { provisionalThumbnail, type ThumbnailIconKey } from "@/lib/catalog2-provisional";
import { ProvisionalBadge } from "@/components/provisional-badge";

const ICONS: Record<ThumbnailIconKey, React.ElementType> = {
  Package, Boxes, Layers, Briefcase, Sparkles, Target,
};

export function Catalog2Thumbnail({
  productId, size = "md", showBadge = true,
}: {
  productId: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}) {
  const { value } = provisionalThumbnail(productId);
  const Icon = ICONS[value.iconKey];
  const dims = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-full w-full" : "h-16 w-16";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";
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
