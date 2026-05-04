// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Play,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

const API_BASE = "/api";

function getToken() {
  try { return localStorage.getItem("allka_token"); } catch { return null; }
}

async function apiFetch(path: string, params?: Record<string, string>) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PARA_LANCAMENTO:       { label: "Para Qualificar",  color: "bg-blue-100 text-blue-700" },
  EM_LANCAMENTO:         { label: "Em Lançamento",    color: "bg-cyan-100 text-cyan-700" },
  EM_EXECUCAO:           { label: "Em Execução",      color: "bg-yellow-100 text-yellow-700" },
  EM_REVISAO:            { label: "Em Revisão",       color: "bg-purple-100 text-purple-700" },
  CONCLUIDA:             { label: "Concluída",        color: "bg-green-100 text-green-700" },
  CANCELADA:             { label: "Cancelada",        color: "bg-slate-100 text-slate-500" },
  APROVADA:              { label: "Aprovada",         color: "bg-emerald-100 text-emerald-700" },
  REPROVADA:             { label: "Devolvida",        color: "bg-orange-100 text-orange-700" },
  AGUARDANDO_INFORMACOES:{ label: "Aguardando Info",  color: "bg-amber-100 text-amber-700" },
  LIBERADA_PARA_EXECUCAO:{ label: "Liberada",         color: "bg-teal-100 text-teal-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function LiderDashboardPage() {
  const [counts, setCounts] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [countsData, tasksData] = await Promise.all([
          apiFetch("/lider/tasks/counts"),
          apiFetch("/lider/tasks", { limit: "5" }),
        ]);
        if (cancelled) return;
        setCounts(countsData);
        setTasks(tasksData.tasks ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  const statCards = [
    {
      label: "Para Qualificar",
      value: counts?.paraLancamento ?? 0,
      icon: CheckSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      href: "/lider/qualificacao",
    },
    {
      label: "Em Execução",
      value: counts?.emExecucao ?? 0,
      icon: Play,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      href: "/lider/tarefas",
    },
    {
      label: "Atrasadas",
      value: counts?.atrasadas ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      href: "/lider/tarefas",
    },
    {
      label: "Aprovadas",
      value: counts?.aprovadas ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      href: "/lider/historico",
    },
    {
      label: "Devolvidas",
      value: counts?.devolvidas ?? 0,
      icon: RotateCcw,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      href: "/lider/devolvidas",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard do Líder"
        description="Visão geral das tarefas do seu domínio"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.href}
              className={`flex flex-col gap-3 rounded-xl border p-4 hover:shadow-md transition-shadow ${card.bg} ${card.border}`}
            >
              <div className={`flex items-center justify-between`}>
                <span className="text-xs font-medium text-slate-600">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
            </Link>
          );
        })}
      </div>

      {/* Recent tasks */}
      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-border">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Tarefas Recentes
          </h2>
          <Link
            to="/lider/historico"
            className="text-xs text-teal-600 hover:underline font-medium"
          >
            Ver todas →
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Nenhuma tarefa encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-border">
                  <th className="px-6 py-3 text-left font-medium">Código</th>
                  <th className="px-6 py-3 text-left font-medium">Tarefa</th>
                  <th className="px-6 py-3 text-left font-medium">Produto</th>
                  <th className="px-6 py-3 text-left font-medium">Projeto / Cliente</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-border">
                {tasks.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {task.task_code ?? task.code_snapshot ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-800 dark:text-slate-100 max-w-[200px] truncate">
                      {task.title ?? task.name_snapshot ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {task.project_product?.product_name_snapshot ??
                        task.project_product?.product?.name ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {task.project?.name ?? "—"}
                      {task.project?.client?.name && (
                        <span className="text-slate-400"> · {task.project.client.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
