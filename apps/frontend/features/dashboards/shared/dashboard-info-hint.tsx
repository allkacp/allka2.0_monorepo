// Item 2 (reunião 09/09/2026) — padronização dos tooltips informativos ("i")
// dos dashboards.
//
// Antes, alguns "i" do cabeçalho (ex.: o seletor de dashboards salvos) tinham
// o <TooltipTrigger asChild> embrulhando um <div> INTEIRO — o cluster todo
// (dropdown + rótulo + ícone) virava gatilho, o tooltip abria ao passar o
// mouse em qualquer parte, e como o gatilho era um <div> não-focável o
// teclado nunca alcançava a explicação.
//
// Este componente é a forma única e correta: um <button> focável, com nome
// acessível, envolvendo SÓ o ícone "i"; o conteúdo sai portalado
// (<TooltipContent> do design system) com `collisionPadding` para não cortar
// nas bordas. Reaproveita 100% o Tooltip compartilhado
// (components/ui/tooltip.tsx, Radix) — não é um segundo sistema de tooltip.
"use client";

import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TooltipContentProps = ComponentProps<typeof TooltipContent>;

export interface DashboardInfoHintProps {
  /** Nome acessível do ícone — vira o `aria-label` do botão. Ex.: "Mais informações sobre Receita". */
  label: string;
  /** Conteúdo do tooltip (texto/JSX). */
  children: ReactNode;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: number;
  /** Atraso de abertura no hover (ms). Foco pelo teclado abre sem atraso. */
  delayDuration?: number;
  /** Classe extra no <TooltipContent> (largura máxima, tema escuro do painel Admin, etc.). */
  contentClassName?: string;
  /** Classe extra no <button> do ícone (hover claro x escuro, alinhamento). */
  triggerClassName?: string;
  /** Classe extra no <Info>. */
  iconClassName?: string;
  /** Repasse opcional do clique (ex.: `e.stopPropagation()` num card arrastável).
   *  O "i" é informativo — não tem ação própria; o hover/foco é que revela o texto. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function DashboardInfoHint({
  label,
  children,
  side = "bottom",
  align,
  sideOffset = 6,
  delayDuration = 150,
  contentClassName,
  triggerClassName,
  iconClassName,
  onClick,
}: DashboardInfoHintProps) {
  return (
    // `disableHoverableContent`: o tooltip fecha assim que o mouse sai do
    // ícone (comportamento previsível pedido no Item 2) em vez de manter uma
    // "ponte" pro conteúdo — que aqui é só uma frase curta, não precisa ser
    // percorrido com o mouse.
    <Tooltip delayDuration={delayDuration} disableHoverableContent>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 shrink-0 rounded-full cursor-help",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            triggerClassName,
          )}
        >
          <Info className={cn("h-3.5 w-3.5", iconClassName)} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn("max-w-[240px]", contentClassName)}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
