// Item 1 (reunião 09/09/2026) — controle de "Período global" do dashboard.
//
// Antes: cada um dos 5 dashboards (Admin, Agency, Company, Leader, Partner)
// tinha uma cópia byte-a-byte de dois elementos SOLTOS no cabeçalho — um
// selo decorativo "GLOBAL" e, separado, um rótulo "Período:" com o seletor.
// A relação entre os dois (e o fato de o seletor controlar a visão INTEIRA,
// não um card) só ficava explícita passando o mouse por cima (tooltip do
// componente inteiro).
//
// Agora: um único componente compartilhado. O rótulo passou a ser
// "Período global", sempre visível, com uma frase de apoio curta
// ("aplica-se a todo o painel") também sempre visível — a informação
// principal não depende mais de hover. O gatilho é um <button> de verdade,
// com foco de teclado visível, estado aberto visível e rótulo acessível.
//
// O que este componente NÃO muda: as opções de período, o intervalo
// personalizado, o "Últimos 90 dias" e QUALQUER regra de negócio de data —
// tudo isso continua vindo por prop de cada dashboard, exatamente como
// antes. O componente só padroniza a casca visual e a acessibilidade.
"use client";

import { useId } from "react";
import { Calendar, Check, ChevronDown, Globe } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DashboardPeriodOption {
  type: string;
  label: string;
}

export interface GlobalPeriodControlProps {
  /** Rótulo do período atualmente selecionado, ex.: "Últimos 30 dias". */
  periodLabel: string;
  /** `type` do período selecionado (para marcar a opção ativa no menu). */
  periodType: string;
  /** Estado aberto/fechado do menu — controlado pelo dashboard. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lista completa de períodos (a entrada `type: "custom"` é ignorada aqui). */
  options: DashboardPeriodOption[];
  /** Seleção de um período pré-definido — mesma assinatura do `handlePeriodChange` atual. */
  onSelectPreset: (type: string, label: string) => void;
  /** Atalho "Últimos 90 dias" — mantém o comportamento inline que já existia em cada dashboard. */
  onSelectLast90Days: () => void;
  /** Intervalo personalizado (mesmo estado `customPeriodFrom` / `customPeriodTo` de hoje). */
  customFrom?: Date;
  customTo?: Date;
  onCustomFromChange: (date: Date | undefined) => void;
  onCustomToChange: (date: Date | undefined) => void;
  onApplyCustom: () => void;
  /**
   * "light" = dashboards de perfil (cabeçalho claro).
   * "dark" = Painel Administrativo (cabeçalho escuro, texto/bordas em branco).
   */
  variant?: "light" | "dark";
}

const GRADIENT = "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)";
const TEXT_GRADIENT =
  "bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]";

export function GlobalPeriodControl({
  periodLabel,
  periodType,
  open,
  onOpenChange,
  options,
  onSelectPreset,
  onSelectLast90Days,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  variant = "light",
}: GlobalPeriodControlProps) {
  const dark = variant === "dark";
  const hintId = useId();
  const isLast90Active = periodLabel === "Últimos 90 dias";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Rótulo do conceito — sempre visível, nunca só no hover. */}
      <span
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap",
          dark ? "text-white" : "text-slate-700 dark:text-slate-200",
        )}
      >
        <Globe
          className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-white/90" : "text-[#7d1b6a]")}
          aria-hidden="true"
        />
        Período global
      </span>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Período global: ${periodLabel}. Abrir seletor de período.`}
            aria-describedby={hintId}
            className={cn(
              "group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border overflow-hidden cursor-pointer transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              dark
                ? "border-white/70 bg-white/10 hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-transparent data-[state=open]:bg-white/25 data-[state=open]:border-white"
                : "border-border/60 hover:border-transparent focus-visible:ring-[#7d1b6a] focus-visible:ring-offset-background data-[state=open]:border-[#7d1b6a]",
            )}
          >
            {!dark && (
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity pointer-events-none"
                style={{ background: GRADIENT }}
                aria-hidden="true"
              />
            )}
            <Calendar
              className={cn(
                "relative z-10 h-3 w-3 shrink-0 transition-colors",
                dark ? "text-white" : "text-[#7d1b6a] group-hover:text-white",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "relative z-10 text-xs font-semibold max-w-[140px] truncate transition-colors",
                dark
                  ? "text-white"
                  : cn(TEXT_GRADIENT, "group-hover:[background-image:none] group-hover:text-white"),
              )}
            >
              {periodLabel}
            </span>
            <ChevronDown
              className={cn(
                "relative z-10 h-3 w-3 shrink-0 transition-transform group-data-[state=open]:rotate-180",
                dark ? "text-white" : "text-[#c81a7f] group-hover:text-white",
              )}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-48 p-0 overflow-hidden rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.10)] border border-border/60"
          align="start"
        >
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
              Período global do painel
            </p>
          </div>

          <div className="p-1">
            {options
              .filter((o) => o.type !== "custom")
              .map((option) => {
                const isActive = periodType === option.type && !isLast90Active;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => onSelectPreset(option.type, option.label)}
                    className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isActive
                          ? TEXT_GRADIENT
                          : cn(
                              "text-foreground",
                              "group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]",
                            ),
                      )}
                    >
                      {option.label}
                    </span>
                    {isActive && <Check className="h-3 w-3 flex-shrink-0 text-[#c81a7f]" />}
                  </button>
                );
              })}

            <button
              type="button"
              onClick={onSelectLast90Days}
              className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left hover:bg-muted/50"
            >
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isLast90Active
                    ? TEXT_GRADIENT
                    : cn(
                        "text-foreground",
                        "group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]",
                      ),
                )}
              >
                Últimos 90 dias
              </span>
              {isLast90Active && <Check className="h-3 w-3 flex-shrink-0 text-[#c81a7f]" />}
            </button>
          </div>

          <div className="border-t border-border/50 p-2.5 space-y-2 bg-muted/20">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
              Personalizado
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">De</label>
                <input
                  type="date"
                  aria-label="Data inicial do período global"
                  value={customFrom ? format(customFrom, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    onCustomFromChange(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)
                  }
                  className="flex-1 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#7d1b6a]/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">Até</label>
                <input
                  type="date"
                  aria-label="Data final do período global"
                  value={customTo ? format(customTo, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    onCustomToChange(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)
                  }
                  className="flex-1 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#7d1b6a]/40"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!customFrom || !customTo}
              onClick={onApplyCustom}
              className="relative w-full h-7 rounded-lg overflow-hidden text-[11px] font-semibold text-white transition-opacity disabled:opacity-40"
            >
              <span className="absolute inset-0" style={{ background: GRADIENT }} />
              <span className="relative z-10">Aplicar</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Frase de apoio curta — também sempre visível (não é tooltip). */}
      <span
        id={hintId}
        className={cn(
          "hidden md:inline text-[11px] whitespace-nowrap",
          dark ? "text-white/70" : "text-muted-foreground",
        )}
      >
        aplica-se a todo o painel
      </span>
    </div>
  );
}
