"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmtAllkoins, fmtAllkoinsBoth, fmtReais } from "@/lib/allkoins";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Os valores da plataforma mostram os DOIS: Allkoin e real. Regra do usuário (26/10/2026): "AK$ 366,07 (R$ 366,07)" — Allkoin primeiro,
// o real entre parênteses; hoje 1 AK$ = R$ 1,00. A regra mora aqui e em lib/allkoins.ts — mudar a ordem/forma é mexer só nestes arquivos.
//  • PriceWithAllkoins — PREÇO DE PRODUTO: aparece "R$ 10,00" e, ao passar o mouse, "AK$ 10,00 (R$ 10,00)" (por enquanto nessa ordem; depois inverte).
//  • AllkoinsAmount    — SALDO em espaço curto (cabeçalho, cartões): aparece "AK$ 1.000,00" e, no mouse, "AK$ 1.000,00 (R$ 1.000,00)".
//  • AkBoth            — qualquer outro valor de carteira/movimentação: "AK$ 1.000,00 (R$ 1.000,00)" já visível, o real menor.
//  • Money             — como PriceWithAllkoins, para telas que montavam o preço como texto.
/** "R$ 10,00" (com espaço não separável, como o resto da plataforma). */
export const fmtPriceBRL = fmtReais;

function BothTooltip({ value, children, className, testId }: { value: number; children: ReactNode; className?: string; testId: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)} data-testid={testId}>{children}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="space-y-0.5 text-xs" data-testid="price-allkoins-tooltip">
          <p className="text-sm font-bold">{fmtAllkoinsBoth(value)}</p>
          <p className="opacity-80">Allkoins, a moeda da Allka (entre parênteses, o valor em reais).</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PriceWithAllkoins({ value, className, children }: { value: number | null | undefined; className?: string; children?: ReactNode }) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return <span className={className}>{children ?? "—"}</span>;
  return <BothTooltip value={n} className={className} testId="price-with-allkoins">{children ?? fmtReais(n)}</BothTooltip>;
}

/** Saldo curto: "AK$ 1.000,00"; o mouse mostra também o real entre parênteses. */
export function AllkoinsAmount({ value, className }: { value: number | null | undefined; className?: string }) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return <BothTooltip value={safe} className={className} testId="allkoins-amount">{fmtAllkoins(safe)}</BothTooltip>;
}

/** "AK$ 1.000,00 (R$ 1.000,00)" visível; o real fica menor e mais claro (herda a cor do texto ao redor). */
export function AkBoth({ value, className }: { value: number | null | undefined; className?: string }) {
  return (
    <span className={className} data-testid="ak-both">
      {fmtAllkoins(value)} <span className="text-[0.7em] font-normal opacity-70">({fmtReais(value)})</span>
    </span>
  );
}

/** Para as telas que hoje montam o preço como texto (`money(...)`): mesmo "R$ 10,00" com os dois valores no mouse. */
export function Money({ value, fallback = "A definir", className }: { value: number | null | undefined; fallback?: string; className?: string }) {
  if (value == null) return <span className={className}>{fallback}</span>;
  return <PriceWithAllkoins value={value} className={className} />;
}
