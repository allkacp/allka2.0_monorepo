"use client";

// Miniatura do catalog2 (Cadastro + Catálogo + detalhe). Mostra a imagem REAL do produto quando existe; sem imagem (ou se o arquivo falhar),
// mostra um espaço neutro com ícone — nunca uma imagem inventada nem selo de "provisório" (P-12, 08/10).
import { useState } from "react";
import { Package } from "lucide-react";

export function Catalog2Thumbnail({
  imagePath, size = "md",
}: {
  productId?: string;
  /** Caminho real da imagem do produto. */
  imagePath?: string | null;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const dims = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-full w-full" : "h-16 w-16";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-6 w-6";
  const hasRealImage = !!imagePath && !failed;
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 shadow-sm dark:bg-slate-800 ${dims}`} data-testid="catalog2-thumbnail">
      {hasRealImage
        ? <img src={imagePath!} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        : <Package className={`${iconSize} text-slate-400`} aria-label="Sem imagem" />}
    </div>
  );
}
