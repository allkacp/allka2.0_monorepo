// @ts-nocheck
"use client";

import { useState } from "react";
import { usePartner } from "@/contexts/partner-context";
import { FolderOpen, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function PartnerProjetos() {
  const { projects, stats, loading } = usePartner();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting();

  const filtered = projects.filter((p) => {
    if (
      search &&
      !p.projectName.toLowerCase().includes(search.toLowerCase()) &&
      !p.companyName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const totalValue = projects.reduce((s, p) => s + p.projectValue, 0);
  const totalCommission = projects.reduce(
    (s, p) => s + p.commissionGenerated,
    0,
  );

  const statusConfig = {
    active: {
      label: "Ativo",
      color: "bg-emerald-100 text-emerald-700",
      icon: Clock,
    },
    completed: {
      label: "Concluído",
      color: "bg-slate-100 text-slate-600",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelado",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    },
  };

  const commStatusConfig = {
    pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-700" },
    paid: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  };

  if (loading) {
    return <PageLoader text="Carregando projetos…" />;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Projetos Indicados
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Projetos contratados por empresas através do seu link
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Total de Projetos
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {projects.length}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Valor Total
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {fmtBRL(totalValue)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Comissões Geradas
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {fmtBRL(totalCommission)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar projeto ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {(["all", "active", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
            }`}
          >
            {s === "all"
              ? "Todos"
              : s === "active"
                ? "Ativos"
                : s === "completed"
                  ? "Concluídos"
                  : "Cancelados"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Projeto"
                  field="projectName"
                  type="text"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Empresa"
                  field="companyName"
                  type="text"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Categoria"
                  field="serviceCategory"
                  type="status"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                  columnFilters={columnFilters}
                  onFilter={toggleColumnFilter}
                  onClearFilter={clearColumnFilter}
                  filterValues={[
                    "Branding",
                    "Social Media",
                    "Produção de Vídeo",
                    "Conteúdo",
                  ]}
                />
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Valor"
                  field="projectValue"
                  type="number"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Comissão"
                  field="commissionGenerated"
                  type="number"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Status"
                  field="status"
                  type="status"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                  columnFilters={columnFilters}
                  onFilter={toggleColumnFilter}
                  onClearFilter={clearColumnFilter}
                  filterValues={["active", "completed", "cancelled"]}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Contratado"
                  field="startDate"
                  type="date"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortData(filtered).map((p, idx) => {
              const sc = statusConfig[p.status];
              const cc = commStatusConfig[p.commissionStatus];
              return (
                <tr
                  key={p.id}
                  className={
                    idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                  }
                >
                  <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {p.projectName}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {p.companyName}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {p.serviceCategory}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                    {fmtBRL(p.projectValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="tabular-nums font-semibold text-emerald-600">
                      {fmtBRL(p.commissionGenerated)}
                    </span>
                    <span
                      className={`ml-2 text-[10px] px-1 py-0.5 rounded font-semibold ${cc.color}`}
                    >
                      {cc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-semibold ${sc.color}`}
                    >
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {fmtDate(p.contractedAt)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-slate-400"
                >
                  <FolderOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  Nenhum projeto encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
