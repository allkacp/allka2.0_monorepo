// @ts-nocheck
"use client";

import { useAgencia } from "@/contexts/agencia-context";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  CheckSquare,
  TrendingUp,
  ArrowUpRight,
  Tag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/loading";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const PLAN_DISCOUNTS: Record<string, { label: string; discount: number }> = {
  "0": { label: "Freemium", discount: 0 },
  "500": { label: "Plano 500", discount: 10 },
  "1000": { label: "Plano 1000", discount: 15 },
  "2000": { label: "Plano 2000", discount: 20 },
  "3000": { label: "Plano 3000", discount: 25 },
  "5000": { label: "Plano 5000", discount: 30 },
};

const PROJECT_STATUS_CONFIG = {
  briefing: { label: "Briefing", bg: "bg-slate-100 text-slate-600" },
  producao: { label: "Produção", bg: "bg-blue-100 text-blue-700" },
  revisao: { label: "Revisão", bg: "bg-amber-100 text-amber-700" },
  entregue: { label: "Entregue", bg: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", bg: "bg-red-100 text-red-700" },
} as const;

const TASK_STATUS_CONFIG = {
  available: { label: "Disponível", bg: "bg-slate-100 text-slate-500" },
  in_progress: { label: "Em execução", bg: "bg-blue-100 text-blue-700" },
  review: { label: "Em revisão", bg: "bg-amber-100 text-amber-700" },
  done: { label: "Concluída", bg: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", bg: "bg-red-100 text-red-700" },
} as const;

export default function AgenciaDashboard() {
  const { profile, projects, tasks, loading } = useAgencia();

  if (loading) {
    return <PageLoader text="Carregando painel…" />;
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
  };
  const activeProjects = projects.filter(
    (p) => !["entregue", "cancelado"].includes(p.status),
  );
  const activeTasks = tasks.filter((t) =>
    ["in_progress", "review"].includes(t.status),
  );
  const recentProjects = [...projects]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Olá, {profile.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Aqui está o resumo da sua agência
        </p>
      </div>

      {/* Plan hero */}
      <div className="rounded-2xl bg-linear-to-r from-indigo-900 to-indigo-800 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/60 mb-1">Seu plano atual</p>
            <p className="text-xl font-bold">{planInfo.label}</p>
            <p className="text-xs text-white/70 mt-1">
              {planInfo.discount}% de desconto nas contratações
              {profile.partnerName && ` · Partner: ${profile.partnerName}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60 mb-1">MRR / Consumo</p>
            <p className="text-2xl font-bold">{fmtBRL(profile.currentMrr)}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
            Projetos Ativos
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {activeProjects.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {profile.totalProjects} total
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            Tarefas Ativas
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {activeTasks.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {profile.totalTasks} total
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <Tag className="h-3.5 w-3.5 text-emerald-500" />
            Desconto no Plano
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {planInfo.discount}%
          </p>
          <p className="text-xs text-slate-400 mt-1">nas contratações</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
            Consumo Mensal
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {fmtBRL(profile.currentMrr)}
          </p>
          <p className="text-xs text-slate-400 mt-1">mês atual</p>
        </div>
      </div>

      {/* Projects + Tasks */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Projetos Recentes
            </h2>
            <Link
              to="/agencia/projetos"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentProjects.map((project) => {
              const cfg = PROJECT_STATUS_CONFIG[project.status];
              const pct = Math.round(
                (project.tasksDone / Math.max(project.tasksTotal, 1)) * 100,
              );
              return (
                <div key={project.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {project.clientName}
                      </p>
                    </div>
                    <Badge className={`${cfg.bg} border-0 text-xs shrink-0`}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>
                        {project.tasksDone}/{project.tasksTotal} tarefas
                      </span>
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
            <h2 className="text-sm font-semibold text-slate-900">
              Tarefas em Andamento
            </h2>
            <Link
              to="/agencia/tarefas"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {activeTasks.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                Nenhuma tarefa ativa
              </p>
            ) : (
              activeTasks.map((task) => {
                const cfg = TASK_STATUS_CONFIG[task.status];
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {task.clientName}
                      </p>
                      {task.nomadeName && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          👤 {task.nomadeName}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={`${cfg.bg} border-0 text-xs`}>
                        {cfg.label}
                      </Badge>
                      <p className="text-xs text-slate-400 mt-1">
                        até {fmtDate(task.dueDate)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
