// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, RotateCcw, ShieldCheck } from "lucide-react";
import type { ShareProfile, FilterState } from "@/lib/share-token";
import { PROFILE_LABELS } from "@/lib/share-token";

export const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last_7_days", label: "Últimos 7 dias" },
  { value: "last_30_days", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_quarter", label: "Último trimestre" },
  { value: "last_90_days", label: "Últimos 90 dias" },
  { value: "this_year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspenso" },
  { value: "cancelled", label: "Cancelado" },
] as const;

function filtersEqual(a: FilterState, b: FilterState) {
  return (
    a.periodType === b.periodType &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo &&
    a.status === b.status
  );
}

type SharedFilterBarProps = {
  filters: FilterState;
  originalFilters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  profile?: ShareProfile;
  isLoading?: boolean;
};

export function SharedFilterBar({
  filters,
  originalFilters,
  onChange,
  onReset,
  profile,
  isLoading = false,
}: SharedFilterBarProps) {
  const isDirty = !filtersEqual(filters, originalFilters);

  const handlePeriodChange = (value: string) => {
    const found = PERIOD_OPTIONS.find((o) => o.value === value);
    onChange({
      ...filters,
      periodType: value,
      periodLabel: found?.label ?? value,
      dateFrom: value !== "custom" ? "" : filters.dateFrom,
      dateTo: value !== "custom" ? "" : filters.dateTo,
    });
  };

  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      {/* Period select */}
      <div className="space-y-1 min-w-[160px]">
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Período
        </Label>
        <Select
          value={filters.periodType}
          onValueChange={handlePeriodChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date pickers */}
      {filters.periodType === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              De
            </Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="h-8 text-xs w-[130px]"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Até
            </Label>
            <Input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="h-8 text-xs w-[130px]"
              disabled={isLoading}
            />
          </div>
        </>
      )}

      {/* Status select */}
      <div className="space-y-1 min-w-[150px]">
        <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Status
        </Label>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            onChange({ ...filters, status: v === "all" ? "" : v })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope lock + reset */}
      <div className="flex items-end gap-2 flex-1 justify-end flex-wrap">
        {profile && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2.5 py-1 border border-border/50 shrink-0">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Escopo: {PROFILE_LABELS[profile]}
          </span>
        )}
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            disabled={isLoading}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden xs:inline">Configuração original</span>
            <span className="xs:hidden">Redefinir</span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Desktop */}
      <div className="hidden sm:block px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Filtros
          </span>
          {isDirty && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: "#c81a7f" }}
            />
          )}
          {isLoading && (
            <span className="text-[10px] text-muted-foreground animate-pulse ml-auto">
              Atualizando…
            </span>
          )}
        </div>
        {controls}
      </div>

      {/* Mobile — accordion */}
      <div className="sm:hidden">
        <Accordion type="single" collapsible>
          <AccordionItem value="filters" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {isDirty && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: "#c81a7f" }}
                  />
                )}
                {isLoading && (
                  <span className="text-[10px] animate-pulse ml-1 normal-case">
                    Atualizando…
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">{controls}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
