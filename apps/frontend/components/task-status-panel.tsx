"use client"

// Situação do fluxo, acessos do cliente e continuidade da tarefa (Pedido 3, fase 6) — para cliente, agência,
// executor e líder. Cada perfil recebe do servidor só o que pode ver. Abre sob demanda para não pesar a lista.
import { useState } from "react"
import { ChevronDown, ListChecks } from "lucide-react"
import { TaskFlowCard } from "@/components/task-flow-card"
import { TaskAssetsCard } from "@/components/task-assets-card"
import { TaskContinuityCard } from "@/components/task-continuity-card"

export function TaskStatusPanel({ taskId, status, className }: { taskId: string; status: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <ListChecks className="h-4 w-4 text-slate-500" />
        Situação, acessos e continuidade
        <ChevronDown className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <TaskFlowCard taskId={taskId} status={status} />
          <TaskAssetsCard taskId={taskId} status={status} />
          <TaskContinuityCard taskId={taskId} status={status} />
        </div>
      )}
    </div>
  )
}
