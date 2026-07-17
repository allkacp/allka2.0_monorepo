// @ts-nocheck
/**
 * PinToTrayButton — ícone de pin (+ tooltip) que adiciona/remove a página
 * atual da Bandeja de Telas global. Opt-in: só entra na bandeja se o
 * usuário clicar. Uso típico, ao lado do ExportButton no banner de uma
 * página padronizada:
 *
 *   <PinToTrayButton
 *     id="page-usuarios"
 *     label="Usuários"
 *     icon={Users}
 *     path="/admin/usuarios"
 *   />
 */
import type React from "react";
import { Pin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePinnedPage } from "@/contexts/open-screens-context";

export function PinToTrayButton({
  id,
  label,
  icon,
  path,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}) {
  const { pinned, toggle } = usePinnedPage({ id, label, icon, path });

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={pinned}
            className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors ${
              pinned
                ? "border-white bg-white/25 text-white"
                : "border-white/70 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
