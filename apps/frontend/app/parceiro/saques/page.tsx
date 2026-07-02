// @ts-nocheck
"use client";

import { useState } from "react";
import { usePartner } from "@/contexts/partner-context";
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui/label";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PartnerSaques() {
  const { profile, withdrawals, requestWithdrawal } = usePartner();
  const [amount, setAmount] = useState("");
  const [pixConfirm, setPixConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("parceiro-saques", 10);
  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting();
  const sorted = sortData(withdrawals);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWithdrawals = sorted.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );

  const numAmount = parseFloat(amount.replace(",", ".")) || 0;
  const balance = profile?.balance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (numAmount <= 0) {
      setError("Insira um valor válido.");
      return;
    }
    if (numAmount > balance) {
      setError("Valor maior que o saldo disponível.");
      return;
    }
    if (pixConfirm !== profile?.pixKey) {
      setError("Chave PIX não confere com a cadastrada.");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    requestWithdrawal(numAmount, profile?.pixKey, profile?.pixKeyType);
    setAmount("");
    setPixConfirm("");
    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => setSuccess(false), 4000);
  };

  const statusConfig = {
    pending: {
      label: "Aguardando",
      bg: "bg-amber-100 text-amber-700",
      icon: Clock,
    },
    approved: {
      label: "Aprovado",
      bg: "bg-blue-100 text-blue-700",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejeitado",
      bg: "bg-red-100 text-red-700",
      icon: XCircle,
    },
    paid: {
      label: "Pago",
      bg: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
  };

  const pixLabelMap = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "E-mail",
    phone: "Telefone",
    random: "Chave aleatória",
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <PageHeader title="Saques" description="Solicite a transferência do seu saldo para sua chave PIX" />

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Balance + Form */}
        <div className="col-span-1 space-y-4">
          {/* Balance card */}
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 opacity-75" />
              <span className="text-sm font-semibold opacity-90">
                Saldo Disponível
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {fmtBRL(balance)}
            </p>
            <div className="mt-3 pt-3 border-t border-blue-500 text-xs opacity-80 space-y-1">
              <p>
                <span className="font-semibold">Chave PIX:</span>{" "}
                {profile?.pixKey}
              </p>
              <p>
                <span className="font-semibold">Tipo:</span>{" "}
                {pixLabelMap[profile?.pixKeyType] ?? profile?.pixKeyType}
              </p>
            </div>
          </div>

          {/* Request form */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-500" />
              Solicitar Saque
            </h2>

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Solicitação enviada com sucesso!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Valor (máx. {fmtBRL(balance)})
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^\d,\.]/g, ""))
                    }
                    placeholder="0,00"
                    className="pl-9 h-9 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Confirme sua Chave PIX
                </Label>
                <Input
                  type="text"
                  value={pixConfirm}
                  onChange={(e) => setPixConfirm(e.target.value)}
                  placeholder="Sua chave PIX cadastrada"
                  className="h-9 text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || balance <= 0}
                className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? "Processando..." : "Solicitar Saque"}
              </Button>

              <p className="text-[11px] text-slate-400 text-center leading-tight">
                Saques são processados em até 3 dias úteis.
                <br />
                Valor mínimo: R$ 50,00.
              </p>
            </form>
          </div>
        </div>

        {/* Right: History */}
        <div className="col-span-2">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Histórico de Saques
              </h2>
              <ItemsPerPageSelect
                value={itemsPerPage.toString()}
                onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                variant="top"
              />
            </div>
            <div className="overflow-x-auto allka-table-scroll">
            <table className="w-full text-sm min-w-150">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <SortableHeader label="Valor" field="amount" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <SortableHeader label="Status" field="status" type="status" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["pending","approved","rejected","paid"]} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <SortableHeader label="Solicitado em" field="requestedAt" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <SortableHeader label="Processado em" field="reviewedAt" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedWithdrawals.map((w, idx) => {
                  const sc = statusConfig[w.status];
                  const Icon = sc.icon;
                  return (
                    <tr
                      key={w.id}
                      className={
                        idx % 2 === 1
                          ? "bg-slate-50/50 dark:bg-slate-900/30"
                          : ""
                      }
                    >
                      <td className="px-5 py-3 font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {fmtBRL(w.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {w.pixKey}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${sc.bg}`}
                        >
                          <Icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {fmtDateTime(w.requestedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {w.reviewedAt ? fmtDateTime(w.reviewedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {w.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
                {withdrawals.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      Nenhum saque solicitado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-5 pb-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-sm text-slate-500">
                Página {safeCurrentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
