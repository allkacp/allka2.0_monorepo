// @ts-nocheck
"use client";

import { useState } from "react";
import { usePartner } from "@/contexts/partner-context";
import { TrendingUp, Search } from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function PartnerComissoes() {
  const { commissions, loading } = usePartner();
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

  const filtered = commissions.filter((c) => {
    if (
      search &&
      !c.companyName.toLowerCase().includes(search.toLowerCase()) &&
      !c.sourceName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const totalEarned = commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.commissionAmount, 0);
  const totalConfirmed = commissions
    .filter((c) => c.status === "confirmed")
    .reduce((s, c) => s + c.commissionAmount, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.commissionAmount, 0);

  const statusConfig = {
    pending: { label: "Pendente", bg: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Confirmado", bg: "bg-blue-100 text-blue-700" },
    paid: { label: "Pago", bg: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelado", bg: "bg-red-100 text-red-700" },
  };

  const sourceConfig = {
    coupon: { label: "Cupom", bg: "bg-purple-100 text-purple-700" },
    referral: { label: "Referral", bg: "bg-sky-100 text-sky-700" },
    campaign: { label: "Campanha", bg: "bg-indigo-100 text-indigo-700" },
  };

  if (loading) {
    return <PageLoader text="Carregando comissões…" />;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <PageHeader title="Comissões" description="Histórico de todas as suas comissões geradas" />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Total Ganho
          </p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
            {fmtBRL(totalEarned)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">
            Pendentes
          </p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">
            {fmtBRL(totalPending)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">
            Confirmados
          </p>
          <p className="text-xl font-bold text-blue-600 mt-1 tabular-nums">
            {fmtBRL(totalConfirmed)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wide">
            Pagos
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
            {fmtBRL(totalPaid)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar empresa ou origem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {(["all", "pending", "confirmed", "paid"] as const).map((s) => (
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
              ? "Todas"
              : s === "pending"
                ? "Pendentes"
                : s === "confirmed"
                  ? "Confirmadas"
                  : "Pagas"}
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
                  label="Origem"
                  field="source"
                  type="status"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                  columnFilters={columnFilters}
                  onFilter={toggleColumnFilter}
                  onClearFilter={clearColumnFilter}
                  filterValues={["coupon", "referral", "campaign"]}
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
                  label="Projeto"
                  field="projectName"
                  type="text"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Valor Projeto"
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
                  field="amount"
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
                  filterValues={["pending", "confirmed", "paid", "cancelled"]}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <SortableHeader
                  label="Convertido"
                  field="convertedAt"
                  type="date"
                  sortKey={sortKey ? String(sortKey) : null}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortData(filtered).map((c, idx) => {
              const sc = statusConfig[c.status] ?? statusConfig.pending;
              const src = sourceConfig[c.sourceType] ?? sourceConfig.campaign;
              return (
                <tr
                  key={c.id}
                  className={
                    idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                  }
                >
                  <td className="px-5 py-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${src.bg}`}
                    >
                      {src.label}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {c.sourceName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                    {c.companyName}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {c.projectName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300 text-xs">
                    {c.projectValue ? fmtBRL(c.projectValue) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                    {fmtBRL(c.commissionAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${sc.bg}`}
                    >
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {fmtDate(c.convertedAt)}
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
                  <TrendingUp className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  Nenhuma comissão encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
