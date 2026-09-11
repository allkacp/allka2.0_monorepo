"use client";

// Selo pequeno pra marcar um valor provisório/demonstrativo — nunca deve
// ser confundido com dado real. Só aparece pra Admin Master (construtor,
// detalhe administrativo, matriz de pendências) — nunca no catálogo do
// cliente comum.
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProvisionalBadge({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            aria-label={label}
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            provisório
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
