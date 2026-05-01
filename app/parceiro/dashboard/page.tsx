// @ts-nocheck
"use client";

import { useState } from "react";
import { usePartner } from "@/contexts/partner-context";
import {
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  Wallet,
  DollarSign,
  FolderOpen,
  Copy,
  ExternalLink,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PageLoader } from "@/components/ui/loading";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function PartnerDashboard() {
  const { profile, stats, commissions, withdrawals, loading } = usePartner();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <PageLoader text="Carregando painel…" />;
  }
  }

  if (!profile || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
        <p className="text-sm">Nenhum perfil de parceiro encontrado.</p>
      </div>
    );
  }

  const pendingCommissions = commissions.filter(
    (c) => c.status === "pending" || c.status === "confirmed",
  );
  const recentActivity = [...commissions]
    .sort((a, b) => b.convertedAt.localeCompare(a.convertedAt))
    .slice(0, 5);

  const copyLink = () => {
    navigator.clipboard.writeText(profile.referralLink ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Olá, {profile.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Aqui estão seus dados e desempenho de indicações
          </p>
        </div>
        <Link to="/parceiro/saques">
          <Button className="h-9 gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-md">
            <Wallet className="h-4 w-4" />
            Solicitar Saque
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Balance */}
        <div className="xl:col-span-2 rounded-xl bg-gradient-to-br from-blue-600 to-violet-700 p-4 shadow-md">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            Saldo Disponível
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {fmtBRL(profile.balance)}
          </p>
          <p className="text-[11px] text-white/50 mt-1">
            Total ganho: {fmtBRL(profile.totalEarned)}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-sky-500" />
            <span className="text-xs text-slate-500 font-medium">Cliques</span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {stats.clicks.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.period}</p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">
              Conversões
            </span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {stats.conversions}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Taxa: {stats.conversionRate}%
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-violet-500" />
            <span className="text-xs text-slate-500 font-medium">Projetos</span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {stats.contractedProjects}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Contratados</p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-500 font-medium">
              Comissões
            </span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {fmtBRL(stats.commissionsEarned)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total ganho</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Seu link de indicação
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono text-slate-600 dark:text-slate-300 truncate">
            {profile.referralLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={copyLink}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          {profile.referralCode && (
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-violet-700 dark:text-violet-400 shrink-0">
              {profile.referralCode}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Atividade Recente
            </h2>
            <Link
              href="/parceiro/comissoes"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              Ver tudo <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {item.companyName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.projectName} · {fmtDate(item.convertedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-semibold ${statusColors[item.status]}`}
                  >
                    {item.status === "pending"
                      ? "Pendente"
                      : item.status === "confirmed"
                        ? "Confirmado"
                        : item.status === "paid"
                          ? "Pago"
                          : "Cancelado"}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">
                    +{fmtBRL(item.commissionAmount)}
                  </span>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                Nenhuma atividade ainda
              </div>
            )}
          </div>
        </div>

        {/* Withdrawals summary */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Saques
            </h2>
            <Link
              href="/parceiro/saques"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              Ver tudo <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {/* Balance summary */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Disponível
              </p>
              <p className="text-base font-bold text-blue-600 mt-0.5">
                {fmtBRL(profile.balance)}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Sacado
              </p>
              <p className="text-base font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                {fmtBRL(profile.totalWithdrawn)}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Total Ganho
              </p>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {fmtBRL(profile.totalEarned)}
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {withdrawals.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {fmtBRL(w.amount)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {fmtDate(w.requestedAt)}
                  </p>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                    w.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : w.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : w.status === "approved"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                  }`}
                >
                  {w.status === "paid"
                    ? "Pago"
                    : w.status === "pending"
                      ? "Pendente"
                      : w.status === "approved"
                        ? "Aprovado"
                        : "Rejeitado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
