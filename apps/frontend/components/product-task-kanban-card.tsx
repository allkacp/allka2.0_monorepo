"use client"

import { Calendar, Eye, SendHorizonal, User } from "lucide-react"
import { TaskLaunchSubstatus } from "@/components/task-launch-substatus"

// Cartão do Kanban de "Produtos → Ver tarefas" (reteste Codex de 02/11). O cartão não é clicável: ver os
// detalhes (olho) e lançar (botão nomeado, só em "Para lançamento") são ações separadas, como na Lista e no
// Kanban principal da aba Tarefas — antes o clique no cartão "Para lançamento" abria o formulário de LANÇAMENTO.
export function ProductTaskKanbanCard({
  code,
  name,
  executor,
  deadline,
  status,
  rawStatus,
  borderColor,
  onView,
  onLaunch,
}: {
  code: string
  name: string
  executor: string
  deadline: { text: string; title?: string } | null
  status: string
  rawStatus?: string | null
  borderColor: string
  onView: () => void
  onLaunch: () => void
}) {
  const continuing = rawStatus === "EM_LANCAMENTO" || rawStatus === "AGUARDANDO_INFORMACOES"
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">{code}</span>
        <button
          type="button"
          onClick={onView}
          aria-label={`Ver detalhes da tarefa ${code}`}
          title="Visualizar detalhes da tarefa"
          className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">{name}</p>
      {status === "Para lançamento" && <TaskLaunchSubstatus rawStatus={rawStatus} className="mb-1.5" />}
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <User className="h-2.5 w-2.5" />
        <span>{executor}</span>
      </div>
      {deadline && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
          <Calendar className="h-2.5 w-2.5" />
          <span title={deadline.title}>{deadline.text}</span>
        </div>
      )}
      {status === "Para lançamento" && (
        <button
          type="button"
          onClick={onLaunch}
          className="mt-2 w-full h-7 flex items-center justify-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 text-orange-700 text-[11px] font-semibold hover:bg-orange-100 transition-colors"
        >
          <SendHorizonal className="h-3 w-3" />
          {continuing ? "Continuar lançamento" : "Lançar tarefa"}
        </button>
      )}
    </div>
  )
}
