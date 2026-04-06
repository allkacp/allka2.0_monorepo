// @ts-nocheck
"use client";

import { useState } from "react";
import { useAgencia } from "@/contexts/agencia-context";
import { Search, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  briefing:  { label: "Briefing",  bg: "bg-slate-100 text-slate-600" },
  producao:  { label: "Produção",  bg: "bg-blue-100 text-blue-700" },
  revisao:   { label: "Revisão",   bg: "bg-amber-100 text-amber-700" },
  entregue:  { label: "Entregue",  bg: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", bg: "bg-red-100 text-red-700" },
} as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  briefing: "Briefing",
  producao: "Produção",
  revisao: "Revisão",
  entregue: "Entregue",
};

export default function AgenciaProjetos() {
  const { projects } = useAgencia();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Projetos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie os projetos da sua agência
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cliente ou categoria..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key)}
              className="h-9 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const cfg = STATUS_CONFIG[project.status];
            const pct = Math.round((project.tasksDone / Math.max(project.tasksTotal, 1)) * 100);
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{project.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{project.clientName} · {project.category}</p>
                  </div>
                  <Badge className={`${cfg.bg} border-0 text-xs shrink-0`}>{cfg.label}</Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{project.tasksDone}/{project.tasksTotal} tarefas</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Valor</p>
                    <p className="font-semibold text-slate-900">{fmtBRL(project.value)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Entrega prev.</p>
                    <p className="font-semibold text-slate-900">
                      {fmtDate(project.deliveryDate ?? project.completedDate)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          {filtered.length} projeto{filtered.length !== 1 ? "s" : ""} · Total:{" "}
          {fmtBRL(filtered.reduce((s, p) => s + p.value, 0))}
        </p>
      )}
    </div>
  );
}
