// @ts-nocheck
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_INDICATORS,
  AGENCY_INDICATORS,
  PARTNER_INDICATORS,
  NOMAD_INDICATORS,
  LEADER_INDICATORS,
  DATA_AVAILABILITY_SUMMARY,
} from "../constants/report-indicators.catalog";
import type { IndicatorDefinition } from "../types/indicator.types";

// ─── Availability badge ───────────────────────────────────────────────────────

function AvailabilityBadge({ availability }: { availability: string }) {
  if (availability === "available") {
    return (
      <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">
        Disponível
      </Badge>
    );
  }
  if (availability === "partial") {
    return (
      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 font-normal">
        Parcial
      </Badge>
    );
  }
  return (
    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 font-normal">
      Indisponível
    </Badge>
  );
}

// ─── Category label map ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financeiro",
  projects: "Projetos",
  tasks: "Tarefas",
  nomads: "Nômades",
  clients: "Clientes",
  gamification: "Gamificação",
  leads: "Leads",
  activity: "Atividade",
  partner_mgmt: "Gestão Parceiro",
};

// ─── Visual type label ────────────────────────────────────────────────────────

function visualTypeLabel(vt: string | string[]): string {
  const types = Array.isArray(vt) ? vt : [vt];
  const map: Record<string, string> = {
    kpi: "KPI",
    kpi_comparison: "KPI + Comparação",
    kpi_line: "KPI + Linha",
    kpi_alert: "KPI + Alerta",
    line_chart: "Gráfico de Linha",
    area_chart: "Gráfico de Área",
    bar_chart: "Gráfico de Barras",
    donut_chart: "Gráfico de Rosca",
    table: "Tabela",
    drill_list: "Lista Detalhada",
  };
  return types.map((t) => map[t] ?? t).join(", ");
}

// ─── Indicator card ───────────────────────────────────────────────────────────

function IndicatorCard({ indicator }: { indicator: IndicatorDefinition }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">
            {indicator.name}
          </CardTitle>
          <AvailabilityBadge availability={indicator.dataAvailability} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {indicator.description}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs font-normal">
            {CATEGORY_LABELS[indicator.category] ?? indicator.category}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            {visualTypeLabel(indicator.visualType)}
          </Badge>
          {indicator.allowsComparison && (
            <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">
              Comparação
            </Badge>
          )}
          {indicator.allowsDrillDown && (
            <Badge variant="outline" className="text-xs font-normal text-purple-600 border-purple-200">
              Drill-down
            </Badge>
          )}
          {indicator.allowsExport && (
            <Badge variant="outline" className="text-xs font-normal text-slate-500">
              Exportável
            </Badge>
          )}
        </div>
        {indicator.notes && (
          <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed line-clamp-2">
            {indicator.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow() {
  const s = DATA_AVAILABILITY_SUMMARY;
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
        {s.available} disponíveis
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
        {s.partial} parciais
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
        {s.missing} indisponíveis
      </div>
      <span className="text-sm text-muted-foreground">
        — {s.total} indicadores no catálogo
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ALL_INDICATORS = [
  ...ADMIN_INDICATORS,
  ...AGENCY_INDICATORS,
  ...PARTNER_INDICATORS,
  ...NOMAD_INDICATORS,
  ...LEADER_INDICATORS,
];

// Deduplicate by id (some are shared across profiles)
const UNIQUE_INDICATORS = Array.from(
  new Map(ALL_INDICATORS.map((i) => [i.id, i])).values()
);

export function ReportIndicatorLibrary() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(UNIQUE_INDICATORS.map((i) => i.category));
    return Array.from(cats).sort();
  }, []);

  const filtered = useMemo(() => {
    return UNIQUE_INDICATORS.filter((ind) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        ind.name.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        ind.id.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || ind.category === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "all" || ind.dataAvailability === availabilityFilter;

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [search, categoryFilter, availabilityFilter]);

  // Group by category for display
  const grouped = useMemo(() => {
    const map: Record<string, IndicatorDefinition[]> = {};
    for (const ind of filtered) {
      if (!map[ind.category]) map[ind.category] = [];
      map[ind.category].push(ind);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <SummaryRow />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar indicador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="missing">Indisponível</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Nenhum indicador encontrado para os filtros selecionados.
        </div>
      ) : (
        Object.entries(grouped).map(([category, indicators]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {CATEGORY_LABELS[category] ?? category}
              <span className="ml-2 font-normal normal-case">
                ({indicators.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
              {indicators.map((ind) => (
                <IndicatorCard key={ind.id} indicator={ind} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
