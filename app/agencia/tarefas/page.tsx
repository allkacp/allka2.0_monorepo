// @ts-nocheck
"use client";

import { useState } from "react";
import { useAgencia } from "@/contexts/agencia-context";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  available:   { label: "Disponível",  bg: "bg-slate-100 text-slate-500" },
  in_progress: { label: "Em execução", bg: "bg-blue-100 text-blue-700" },
  review:      { label: "Em revisão",  bg: "bg-amber-100 text-amber-700" },
  done:        { label: "Concluída",   bg: "bg-emerald-100 text-emerald-700" },
  cancelled:   { label: "Cancelada",   bg: "bg-red-100 text-red-700" },
} as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Todas",
  available: "Disponível",
  in_progress: "Em execução",
  review: "Em revisão",
  done: "Concluída",
};

export default function AgenciaTarefas() {
  const { tasks } = useAgencia();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (t.nomadeName?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tarefas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Acompanhe todas as tarefas em andamento na sua agência
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG)
          .filter(([k]) => k !== "cancelled")
          .map(([key, cfg]) => {
            const count = tasks.filter((t) => t.status === key).length;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm"
              >
                <Badge className={`${cfg.bg} border-0 text-xs`}>{cfg.label}</Badge>
                <span className="text-sm font-bold text-slate-800">{count}</span>
              </div>
            );
          })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa, cliente ou nômade..."
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarefa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nômade</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((task) => {
                  const cfg = STATUS_CONFIG[task.status];
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{task.name}</p>
                        <p className="text-xs text-slate-400">{task.category}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{task.clientName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {task.nomadeName ?? <span className="text-slate-400">Não atribuído</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {fmtBRL(task.value)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${cfg.bg} border-0 text-xs`}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {task.status === "done" ? fmtDate(task.deliveredAt) : fmtDate(task.dueDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
