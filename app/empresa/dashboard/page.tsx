// @ts-nocheck
"use client";

import { useEmpresa } from "@/contexts/empresa-context";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  CheckSquare,
  FileText,
  TrendingUp,
  Clock,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const PROJECT_STATUS_CONFIG = {
  briefing:  { label: "Briefing",   bg: "bg-slate-100 text-slate-600" },
  producao:  { label: "Produção",   bg: "bg-blue-100 text-blue-700" },
  revisao:   { label: "Revisão",    bg: "bg-amber-100 text-amber-700" },
  entregue:  { label: "Entregue",   bg: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado",  bg: "bg-red-100 text-red-700" },
} as const;

const TASK_STATUS_CONFIG = {
  available:   { label: "Disponível",    bg: "bg-slate-100 text-slate-500" },
  in_progress: { label: "Em execução",   bg: "bg-blue-100 text-blue-700" },
  review:      { label: "Em revisão",    bg: "bg-amber-100 text-amber-700" },
  done:        { label: "Concluída",     bg: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelada",     bg: "bg-red-100 text-red-700" },
} as const;

export default function EmpresaDashboard() {
  const { profile, projects, tasks, invoices } = useEmpresa();

  const activeProjects = projects.filter((p) => !["entregue", "cancelado"].includes(p.status));
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const pendingTotal = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const activeTasks = tasks.filter((t) => ["in_progress", "review"].includes(t.status));
  const recentProjects = [...projects]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Olá, {profile.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Aqui está o resumo dos seus projetos e tarefas
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
            Projetos Ativos
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeProjects.length}</p>
          <p className="text-xs text-slate-400 mt-1">{projects.filter((p) => p.status === "entregue").length} entregues</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            Tarefas em Andamento
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeTasks.length}</p>
          <p className="text-xs text-slate-400 mt-1">{tasks.filter((t) => t.status === "done").length} concluídas</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Total Investido
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmtBRL(profile.totalInvested)}</p>
          <p className="text-xs text-slate-400 mt-1">desde {fmtDate(profile.createdAt)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <FileText className="h-3.5 w-3.5 text-amber-500" />
            Faturas Pendentes
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingInvoices.length}</p>
          <p className="text-xs text-amber-600 mt-1">{fmtBRL(pendingTotal)} a pagar</p>
        </div>
      </div>

      {/* Active projects + tasks pending */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Projetos Recentes</h2>
            <Link
              to="/empresa/projetos"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentProjects.map((project) => {
              const cfg = PROJECT_STATUS_CONFIG[project.status];
              const pct = Math.round((project.tasksDone / Math.max(project.tasksTotal, 1)) * 100);
              return (
                <div key={project.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-400">{project.category}</p>
                    </div>
                    <Badge className={`${cfg.bg} border-0 text-xs shrink-0`}>{cfg.label}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{project.tasksDone}/{project.tasksTotal} tarefas</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active tasks */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Tarefas em Andamento</h2>
            <Link
              to="/empresa/tarefas"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activeTasks.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                Nenhuma tarefa em andamento
              </p>
            ) : (
              activeTasks.map((task) => {
                const cfg = TASK_STATUS_CONFIG[task.status];
                return (
                  <div key={task.id} className="px-5 py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.name}</p>
                      <p className="text-xs text-slate-400">{task.projectName}</p>
                      {task.nomadeName && (
                        <p className="text-xs text-slate-500 mt-0.5">👤 {task.nomadeName}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={`${cfg.bg} border-0 text-xs`}>{cfg.label}</Badge>
                      <p className="text-xs text-slate-400 mt-1">entrega {fmtDate(task.dueDate)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pending invoices alert */}
      {pendingInvoices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Você tem {pendingInvoices.length} fatura{pendingInvoices.length > 1 ? "s" : ""} pendente{pendingInvoices.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Total de {fmtBRL(pendingTotal)} aguardando pagamento.
            </p>
          </div>
          <Link
            to="/empresa/faturas"
            className="shrink-0 text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
          >
            Ver faturas <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
