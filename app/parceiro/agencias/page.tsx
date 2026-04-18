// @ts-nocheck
"use client";

import { useState } from "react";
import { usePartner } from "@/contexts/partner-context";
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Users,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  active: {
    label: "Ativa",
    bg: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  onboarding: {
    label: "Onboarding",
    bg: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  at_risk: {
    label: "Em risco",
    bg: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
  inactive: {
    label: "Inativa",
    bg: "bg-slate-100 text-slate-500",
    icon: XCircle,
  },
} as const;

export default function ParceiroAgencias() {
  const { ledAgencies } = usePartner();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting();

  const totalMrr = ledAgencies.reduce((s, a) => s + a.mrr, 0);
  const totalCommission = ledAgencies.reduce((s, a) => s + a.commissionAmount, 0);
  const activeCount = ledAgencies.filter((a) => a.status === "active").length;
  const atRiskCount = ledAgencies.filter((a) => a.status === "at_risk").length;

  const filtered = ledAgencies.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Agências Lideradas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Acompanhe o desempenho das agências sob sua liderança
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <Users className="h-3.5 w-3.5" />
            Total de Agências
          </div>
          <p className="text-2xl font-bold text-slate-900">{ledAgencies.length}</p>
          <p className="text-xs text-emerald-600 mt-1">{activeCount} ativas</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <TrendingUp className="h-3.5 w-3.5" />
            MRR Total
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmtBRL(totalMrr)}</p>
          <p className="text-xs text-slate-400 mt-1">consumo mensal</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <Building2 className="h-3.5 w-3.5" />
            Comissão Mensal
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmtBRL(totalCommission)}</p>
          <p className="text-xs text-slate-400 mt-1">5% sobre MRR</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Em Risco / Onboarding
          </div>
          <p className="text-2xl font-bold text-slate-900">{atRiskCount}</p>
          <p className="text-xs text-amber-600 mt-1">
            {ledAgencies.filter((a) => a.status === "onboarding").length} em onboarding
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "onboarding", "at_risk", "inactive"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="h-9 text-xs"
            >
              {s === "all"
                ? "Todos"
                : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Agência" field="name" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Plano" field="plan" type="status" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["500","1000","2000"]} />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="MRR" field="mrr" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Comissão" field="commissionAmount" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Projetos" field="projectsCount" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Status" field="status" type="status" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["active","onboarding","at_risk","inactive"]} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Última atividade" field="lastActivity" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Nenhuma agência encontrada.
                  </td>
                </tr>
              ) : (
                sortData(filtered).map((agency) => {
                  const cfg = STATUS_CONFIG[agency.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={agency.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{agency.name}</p>
                        <p className="text-xs text-slate-400">{agency.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600">
                          {agency.plan === "0" ? "Freemium" : `R$ ${agency.plan}/mês`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {agency.mrr > 0 ? fmtBRL(agency.mrr) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {agency.commissionAmount > 0 ? (
                          <span className="font-medium text-emerald-700">
                            {fmtBRL(agency.commissionAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {agency.totalProjects}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${cfg.bg} border-0 gap-1 text-xs font-medium`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fmtDate(agency.lastActiveAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{filtered.length} agência{filtered.length !== 1 ? "s" : ""}</span>
            <span>MRR total: {fmtBRL(filtered.reduce((s, a) => s + a.mrr, 0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
