// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Filter,
  SlidersHorizontal,
  Clock,
  FolderOpen,
  GraduationCap,
  AlertCircle,
  Hash,
  Search,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FilterValues,
  EMPTY_FILTERS,
  countActiveFilters,
} from "@/types/tarefas-filters";

// ─── Local status/priority lists (same values as STATUS_CFG in the page) ─────

const STATUS_OPTIONS = [
  {
    value: "PARA_LANCAMENTO",
    label: "Para lan\u00e7amento",
    color: "text-slate-600",
  },
  {
    value: "EM_LANCAMENTO",
    label: "Em lan\u00e7amento",
    color: "text-indigo-700",
  },
  {
    value: "AGUARDANDO_INFORMACOES",
    label: "Aguard. informa\u00e7\u00f5es",
    color: "text-orange-700",
  },
  {
    value: "AGUARDANDO_ETAPA",
    label: "Aguardando etapa",
    color: "text-amber-700",
  },
  {
    value: "LIBERADA_PARA_EXECUCAO",
    label: "Enviada p/ execu\u00e7\u00e3o",
    color: "text-cyan-700",
  },
  {
    value: "EM_EXECUCAO",
    label: "Em execu\u00e7\u00e3o",
    color: "text-blue-700",
  },
  { value: "EM_REVISAO", label: "Em revis\u00e3o", color: "text-amber-700" },
  {
    value: "MELHORIAS_FINAIS",
    label: "Melhorias finais",
    color: "text-orange-700",
  },
  {
    value: "EM_APROVACAO",
    label: "Aprova\u00e7\u00e3o - Ag\u00eancia",
    color: "text-violet-700",
  },
  {
    value: "APROVACAO_PENDENTE_CLIENTE",
    label: "Aprova\u00e7\u00e3o - Cliente",
    color: "text-purple-700",
  },
  { value: "APROVADA", label: "Aprovada", color: "text-teal-700" },
  { value: "REPROVADA", label: "Reprovada", color: "text-red-700" },
  { value: "CONCLUIDA", label: "Conclu\u00edda", color: "text-emerald-700" },
  { value: "PAUSADA", label: "Pausada", color: "text-amber-600" },
  { value: "CANCELADA", label: "Cancelada", color: "text-red-600" },
  {
    value: "AGUARDANDO_NOMADE",
    label: "Aguard. n\u00f4made",
    color: "text-purple-700",
  },
  {
    value: "ENTREGA_PENDENTE",
    label: "Entrega pendente",
    color: "text-orange-700",
  },
  {
    value: "ENTREGA_ATRASADA",
    label: "Entrega atrasada",
    color: "text-red-700",
  },
  {
    value: "QUALIFICACAO_PENDENTE",
    label: "Qualifica\u00e7\u00e3o pendente",
    color: "text-blue-700",
  },
  {
    value: "NAO_SEGUIU_ORIENTACOES",
    label: "N\u00e3o seguiu orienta\u00e7\u00f5es",
    color: "text-rose-700",
  },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "M\u00e9dia" },
  { value: "low", label: "Baixa" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TarefasFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  initialFilters: FilterValues;
  onApply: (f: FilterValues) => void;
  uniqueProjects: [string, string][];
  uniqueEmpresas: [string, string][];
  uniqueProducts: string[];
  uniqueNomades: [string, string][];
  uniqueAgencias: [string, string][];
  uniqueLideres: string[];
  uniqueCategorias: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  icon: Icon,
  bg,
  text,
}: {
  label: string;
  icon: any;
  bg: string;
  text: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-6 py-2.5 border-y border-slate-100 dark:border-slate-800",
        bg,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", text)} />
      <p
        className={cn("text-[10px] font-bold uppercase tracking-widest", text)}
      >
        {label}
      </p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TarefasFilterDrawer({
  open,
  onClose,
  initialFilters,
  onApply,
  uniqueProjects,
  uniqueEmpresas,
  uniqueProducts,
  uniqueNomades,
  uniqueAgencias,
  uniqueLideres,
  uniqueCategorias,
}: TarefasFilterDrawerProps) {
  const [draft, setDraft] = useState<FilterValues>(initialFilters);

  // Sync draft when drawer opens
  useEffect(() => {
    if (open) setDraft(initialFilters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(
    <K extends keyof FilterValues>(k: K, v: FilterValues[K]) => {
      setDraft((prev) => ({ ...prev, [k]: v }));
    },
    [],
  );

  const activeCount = countActiveFilters(draft);

  // ── Date range row ────────────────────────────────────────────────────────
  const DateRange = ({
    label,
    fromKey,
    toKey,
  }: {
    label: string;
    fromKey: keyof FilterValues;
    toKey: keyof FilterValues;
  }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-slate-400 mb-1">De</p>
          <Input
            type="date"
            value={draft[fromKey] as string}
            onChange={(e) => set(fromKey, e.target.value as any)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-1">At\u00e9</p>
          <Input
            type="date"
            value={draft[toKey] as string}
            onChange={(e) => set(toKey, e.target.value as any)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );

  // ── Alert checkbox row ────────────────────────────────────────────────────
  const AlertChk = ({
    fieldKey,
    label,
    activeColor,
  }: {
    fieldKey: keyof FilterValues;
    label: string;
    activeColor: string;
  }) => {
    const checked = draft[fieldKey] as boolean;
    return (
      <label
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all select-none",
          checked
            ? `${activeColor} border-opacity-100`
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => set(fieldKey, Boolean(v) as any)}
          className="h-4 w-4 shrink-0"
        />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">
          {label}
        </span>
      </label>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-135 p-0 flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-700"
      >
        {/* ── Gradient header ─────────────────────────────────────── */}
        <div
          className="px-6 py-5 shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #4c1d95 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Filtros avan\u00e7ados
                </h2>
                <p className="text-xs text-white/50 mt-0.5">
                  {activeCount > 0
                    ? `${activeCount} filtro${activeCount !== 1 ? "s" : ""} ativo${activeCount !== 1 ? "s" : ""}`
                    : "Sem filtros ativos"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {activeCount > 0 && (
            <button
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar todos os filtros
            </button>
          )}
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-background">
          {/* ── Section 1: Identificação ── */}
          <SectionHeader
            label="Identifica\u00e7\u00e3o"
            icon={Hash}
            bg="bg-slate-50 dark:bg-slate-900/40"
            text="text-slate-500 dark:text-slate-400"
          />
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ID da tarefa</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="abc123..."
                    value={draft.idQuery}
                    onChange={(e) => set("idQuery", e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>C\u00f3digo</FieldLabel>
                <Input
                  placeholder="DC0006..."
                  value={draft.codeQuery}
                  onChange={(e) => set("codeQuery", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Nome da tarefa</FieldLabel>
              <Input
                placeholder="Buscar por nome..."
                value={draft.nameQuery}
                onChange={(e) => set("nameQuery", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* ── Section 2: Status e Prazos ── */}
          <SectionHeader
            label="Status e Prazos"
            icon={Clock}
            bg="bg-blue-50 dark:bg-blue-900/20"
            text="text-blue-600 dark:text-blue-400"
          />
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={draft.status}
                  onValueChange={(v) => set("status", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all" className="text-xs">
                      Todos os status
                    </SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        className="text-xs"
                      >
                        <span className={cn("font-medium", s.color)}>
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Prioridade</FieldLabel>
                <Select
                  value={draft.priority}
                  onValueChange={(v) => set("priority", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Todas
                    </SelectItem>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem
                        key={p.value}
                        value={p.value}
                        className="text-xs"
                      >
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DateRange
              label="Prazo de in\u00edcio"
              fromKey="startDateFrom"
              toKey="startDateTo"
            />
            <DateRange
              label="Prazo de entrega"
              fromKey="dueDateFrom"
              toKey="dueDateTo"
            />
            <DateRange
              label="Prazo de execu\u00e7\u00e3o"
              fromKey="execDateFrom"
              toKey="execDateTo"
            />
            <DateRange
              label="Data de cria\u00e7\u00e3o"
              fromKey="createdFrom"
              toKey="createdTo"
            />
            <DateRange
              label="Conclu\u00edda em"
              fromKey="completedFrom"
              toKey="completedTo"
            />
          </div>

          {/* ── Section 3: Relacionamentos ── */}
          <SectionHeader
            label="Relacionamentos"
            icon={FolderOpen}
            bg="bg-violet-50 dark:bg-violet-900/20"
            text="text-violet-600 dark:text-violet-400"
          />
          <div className="px-6 py-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Projeto</FieldLabel>
                <Select
                  value={draft.project}
                  onValueChange={(v) => set("project", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todos os projetos
                    </SelectItem>
                    {uniqueProjects.map(([id, title]) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Produto</FieldLabel>
                <Select
                  value={draft.product}
                  onValueChange={(v) => set("product", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todos os produtos
                    </SelectItem>
                    {uniqueProducts.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <Select
                  value={draft.empresa}
                  onValueChange={(v) => set("empresa", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todas as empresas
                    </SelectItem>
                    {uniqueEmpresas.map(([id, name]) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Ag\u00eancia</FieldLabel>
                <Select
                  value={draft.agencia}
                  onValueChange={(v) => set("agencia", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todas as ag\u00eancias
                    </SelectItem>
                    {uniqueAgencias.map(([id, name]) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>N\u00f4made</FieldLabel>
                <Select
                  value={draft.nomade}
                  onValueChange={(v) => set("nomade", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todos os n\u00f4mades
                    </SelectItem>
                    {uniqueNomades.map(([id, name]) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>L\u00edder</FieldLabel>
                <Select
                  value={draft.lider}
                  onValueChange={(v) => set("lider", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todos os l\u00edderes
                    </SelectItem>
                    {uniqueLideres.map((l) => (
                      <SelectItem key={l} value={l} className="text-xs">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>N\u00f4made qualificador</FieldLabel>
                <Select
                  value={draft.nomadeQualificador}
                  onValueChange={(v) => set("nomadeQualificador", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todos
                    </SelectItem>
                    {uniqueNomades.map(([id, name]) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Categoria</FieldLabel>
                <Select
                  value={draft.categoria}
                  onValueChange={(v) => set("categoria", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="text-xs">
                      Todas as categorias
                    </SelectItem>
                    {uniqueCategorias.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section 4: Qualificação e análise ── */}
          <SectionHeader
            label="Qualifica\u00e7\u00e3o e an\u00e1lise"
            icon={GraduationCap}
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            text="text-emerald-600 dark:text-emerald-400"
          />
          <div className="px-6 py-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Status da an\u00e1lise</FieldLabel>
                <Select
                  value={draft.statusAnalise}
                  onValueChange={(v) => set("statusAnalise", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Todos
                    </SelectItem>
                    <SelectItem value="pendente" className="text-xs">
                      Pendente
                    </SelectItem>
                    <SelectItem value="aprovado" className="text-xs">
                      Aprovado
                    </SelectItem>
                    <SelectItem value="reprovado" className="text-xs">
                      Reprovado
                    </SelectItem>
                    <SelectItem value="em_revisao" className="text-xs">
                      Em revis\u00e3o
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Qualifica\u00e7\u00e3o</FieldLabel>
                <Select
                  value={draft.qualificacao}
                  onValueChange={(v) => set("qualificacao", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Todas
                    </SelectItem>
                    <SelectItem value="pendente" className="text-xs">
                      Pendente
                    </SelectItem>
                    <SelectItem value="aprovada" className="text-xs">
                      Aprovada
                    </SelectItem>
                    <SelectItem value="reprovada" className="text-xs">
                      Reprovada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Reprova\u00e7\u00f5es</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  placeholder="M\u00edn."
                  value={draft.minReprovacoes}
                  onChange={(e) => set("minReprovacoes", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Campos de qualifica\u00e7\u00e3o s\u00e3o pl\u00e1ceholders \u2014
              ser\u00e3o integrados ao schema quando dispon\u00edvel via API.
            </p>
          </div>

          {/* ── Section 5: Alertas e atrasos ── */}
          <SectionHeader
            label="Alertas e atrasos"
            icon={AlertCircle}
            bg="bg-red-50 dark:bg-red-900/20"
            text="text-red-600 dark:text-red-400"
          />
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-2">
              <AlertChk
                fieldKey="overdue"
                label="Entrega atrasada"
                activeColor="bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-600"
              />
              <AlertChk
                fieldKey="execucaoAtrasada"
                label="Execu\u00e7\u00e3o atrasada"
                activeColor="bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700"
              />
              <AlertChk
                fieldKey="aprovacaoAtrasada"
                label="Aprova\u00e7\u00e3o atrasada"
                activeColor="bg-violet-50 border-violet-300 dark:bg-violet-900/20 dark:border-violet-700"
              />
              <AlertChk
                fieldKey="qualificacaoAtrasada"
                label="Qualifica\u00e7\u00e3o atrasada"
                activeColor="bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700"
              />
              <AlertChk
                fieldKey="revisaoAtrasada"
                label="Revis\u00e3o atrasada"
                activeColor="bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700"
              />
              <AlertChk
                fieldKey="prestesAtrasar"
                label="Prestes a atrasar (3d)"
                activeColor="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700"
              />
              <AlertChk
                fieldKey="prestesVencerLancamento"
                label="Lan\u00e7amento vencendo (3d)"
                activeColor="bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700"
              />
              <AlertChk
                fieldKey="prestesVencerAprovacao"
                label="Aprova\u00e7\u00e3o vencendo (3d)"
                activeColor="bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700"
              />
              <AlertChk
                fieldKey="emergencial"
                label="Emergenciais (urgente)"
                activeColor="bg-red-50 border-red-400 dark:bg-red-900/30 dark:border-red-500"
              />
              <AlertChk
                fieldKey="desqualificada"
                label="Desqualificada"
                activeColor="bg-rose-50 border-rose-300 dark:bg-rose-900/20 dark:border-rose-700"
              />
            </div>
          </div>

          {/* bottom spacer */}
          <div className="h-4" />
        </div>

        {/* ── Sticky footer ───────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-0.5">
                  <Filter className="h-3 w-3" />
                  {activeCount} filtro{activeCount !== 1 ? "s" : ""} ativo
                  {activeCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-sm"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm"
                onClick={() => setDraft(EMPTY_FILTERS)}
              >
                Limpar filtros
              </Button>
              <Button
                size="sm"
                className="h-9 text-sm btn-brand"
                onClick={() => {
                  onApply(draft);
                  onClose();
                }}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
