// @ts-nocheck
"use client";

import { useState } from "react";
import { useAgencia } from "@/contexts/agencia-context";
import {
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const INVOICE_STATUS_CONFIG = {
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
} as const;

const FALLBACK_INVOICE_STATUS = {
  label: "Desconhecido",
  bg: "bg-slate-100 text-slate-600",
  icon: AlertCircle,
};

const PLAN_DISCOUNTS: Record<
  string,
  { label: string; discount: number; color: string }
> = {
  "0": { label: "Freemium", discount: 0, color: "bg-slate-100 text-slate-600" },
  "500": { label: "Plano 500", discount: 10, color: "bg-sky-100 text-sky-700" },
  "1000": {
    label: "Plano 1000",
    discount: 15,
    color: "bg-blue-100 text-blue-700",
  },
  "2000": {
    label: "Plano 2000",
    discount: 20,
    color: "bg-indigo-100 text-indigo-700",
  },
  "3000": {
    label: "Plano 3000",
    discount: 25,
    color: "bg-violet-100 text-violet-700",
  },
  "5000": {
    label: "Plano 5000",
    discount: 30,
    color: "bg-purple-100 text-purple-700",
  },
};

export default function AgenciaFinanceiro() {
  const { profile, invoices, loading } = useAgencia();
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

  if (loading) {
    return <PageLoader text="Carregando financeiro…" />;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
        <p className="text-sm">Nenhum perfil de agência encontrado.</p>
      </div>
    );
  }

  const planInfo = PLAN_DISCOUNTS[profile.plan] ?? {
    label: `Plano ${profile.plan}`,
    discount: profile.planDiscount,
    color: "bg-indigo-100 text-indigo-700",
  };

  const filtered = invoices.filter(
    (i) => statusFilter === "all" || i.status === statusFilter,
  );

  const sorted = sortData(filtered);

  const pendingTotal = invoices
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + i.amount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Consumo mensal, descontos do plano e histórico de faturas
        </p>
      </div>

      {/* Plan highlight */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Plano ativo</p>
            <div className="flex items-center gap-2">
              <Badge
                className={`${planInfo.color} border-0 text-sm font-semibold px-3 py-1`}
              >
                {planInfo.label}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <Tag className="h-3 w-3" />
                {planInfo.discount}% de desconto
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-slate-400">Consumo este mês</p>
              <p className="text-lg font-bold text-slate-900">
                {fmtBRL(profile.currentMrr)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total pago (histórico)</p>
              <p className="text-lg font-bold text-slate-900">
                {fmtBRL(paidTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Discount table */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Tabela de descontos por plano
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(PLAN_DISCOUNTS).map(([plan, info]) => (
              <div
                key={plan}
                className={`rounded-lg p-2 text-center text-xs ${plan === profile.plan ? "ring-2 ring-indigo-500 ring-offset-1" : ""} ${info.color}`}
              >
                <p className="font-bold">{info.discount}%</p>
                <p className="opacity-70 text-[10px]">
                  {info.label.replace("Plano ", "R$ ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Faturas</h2>
          <div className="flex gap-2">
            {["all", "pending", "paid", "overdue"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="h-8 text-xs"
              >
                {s === "all"
                  ? "Todas"
                  : (INVOICE_STATUS_CONFIG[
                      s as keyof typeof INVOICE_STATUS_CONFIG
                    ]?.label ?? s)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Pendente
            </div>
            <p className="text-xl font-bold text-slate-900">
              {fmtBRL(pendingTotal)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Pago (total)
            </div>
            <p className="text-xl font-bold text-slate-900">
              {fmtBRL(paidTotal)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
              <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              Total de faturas
            </div>
            <p className="text-xl font-bold text-slate-900">
              {invoices.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Nº
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
                        ...new Set(
                          filtered.map((r) => r.status).filter(Boolean),
                        ),
                      ]}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-400 text-sm"
                    >
                      Nenhuma fatura encontrada.
                    </td>
                  </tr>
                ) : (
                  sorted.map((invoice) => {
                    const cfg =
                      INVOICE_STATUS_CONFIG[
                        invoice.status as keyof typeof INVOICE_STATUS_CONFIG
                      ] ?? FALLBACK_INVOICE_STATUS;
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
    </div>
  );
}
