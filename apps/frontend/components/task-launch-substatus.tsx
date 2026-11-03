"use client"

// O grupo "Para lançamento" (lista, quadro e contador do projeto) junta três estados do servidor: ainda não
// lançada (PARA_LANCAMENTO), lançamento começado com rascunho salvo (EM_LANCAMENTO) e lançamento parado à espera
// de informação (AGUARDANDO_INFORMACOES). O detalhe da tarefa mostra o estado exato; este selo repete esse estado
// dentro do grupo para as duas telas dizerem a mesma coisa (reteste Codex 02/11, SEO T015718). Só rótulo: não muda
// estado nem rascunho.
const LAUNCH_SUBSTATUS: Record<string, { label: string; title: string }> = {
  EM_LANCAMENTO: {
    label: "Em lançamento",
    title: "O lançamento já começou e o rascunho está salvo. Continue de onde parou.",
  },
  AGUARDANDO_INFORMACOES: {
    label: "Aguard. informações",
    title: "O lançamento está parado à espera de informações. Continue quando tiver os dados.",
  },
}

export const LAUNCH_GROUP_HINT =
  "Inclui tarefas ainda não lançadas e as que já estão em lançamento (rascunho salvo) ou aguardando informações."

export function launchSubstatus(rawStatus?: string | null) {
  return rawStatus ? LAUNCH_SUBSTATUS[rawStatus] ?? null : null
}

export function TaskLaunchSubstatus({ rawStatus, className = "" }: { rawStatus?: string | null; className?: string }) {
  const sub = launchSubstatus(rawStatus)
  if (!sub) return null
  return (
    <span
      title={sub.title}
      data-testid="task-launch-substatus"
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 ${className}`}
    >
      {sub.label}
    </span>
  )
}
