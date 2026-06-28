// @ts-nocheck
"use client";

import { useState } from "react";
import { useEmpresa } from "@/contexts/empresa-context";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    bg: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  paid: {
    label: "Paga",
    bg: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Vencida",
    bg: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelada",
    bg: "bg-slate-100 text-slate-500",
    icon: XCircle,
  },
} as const;

export default function EmpresaFaturas() {
  const { invoices, loading } = useEmpresa();
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting();

  const filtered = invoices.filter(
    (i) => statusFilter === "all" || i.status === statusFilter,
  );

  const sorted = sortData(filtered);

  const pending = invoices.filter((i) => i.status === "pending");
  const pendingTotal = pending.reduce((s, i) => s + i.amount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return <PageLoader text="Carregando faturas…" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Faturas" description="Histórico de cobranças e pagamentos" />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            Pendentes
          </div>
          <p className="text-2xl font-bold text-slate-900">{pending.length}</p>
          <p className="text-xs text-amber-600 mt-1">{fmtBRL(pendingTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Pagas
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {invoices.filter((i) => i.status === "paid").length}
          </p>
          <p className="text-xs text-emerald-600 mt-1">{fmtBRL(paidTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <FileText className="h-3.5 w-3.5 text-violet-500" />
            Total Geral
          </div>
          <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {fmtBRL(invoices.reduce((s, i) => s + i.amount, 0))} total
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "paid", "overdue"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="h-9 text-xs"
          >
            {s === "all"
              ? "Todas"
              : (STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s)}
          </Button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Nº Fatura
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Descrição"
                    field="description"
                    type="text"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Valor"
                    field="amount"
                    type="number"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Emissão"
                    field="issuedAt"
                    type="date"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Vencimento"
                    field="dueDate"
                    type="date"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
                    filterValues={[
                      ...new Set(filtered.map((r) => r.status).filter(Boolean)),
                    ]}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400 text-sm"
                  >
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                sorted.map((invoice) => {
                  const cfg = STATUS_CONFIG[invoice.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        #{invoice.number}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {invoice.description}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {fmtBRL(invoice.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fmtDate(invoice.issuedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fmtDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${cfg.bg} border-0 gap-1 text-xs`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
