"use client";

// Resumo final do painel da etapa (19/10): o que está completo, o que falta, entregáveis, acessos, aprovação, qualificação e
// como a próxima etapa é liberada. Só lê o que já está na tela; não grava nada.
import { STATUS_LABEL, STEP_BLOCKS, type BlockInfo, type StepBlockId, type StepIssue } from "./step-completeness";

export function StepFinalSummary({ infos, issues, deliverables, accessLine, approvalLine, qualificationLine, releaseLine, onGo, rows = [], onEdit, dirty = false }: {
  infos: Record<StepBlockId, BlockInfo>; issues: StepIssue[]; deliverables: string[]; accessLine: string; approvalLine: string; qualificationLine: string; releaseLine: string;
  onGo: (issue: StepIssue) => void;
  rows?: { label: string; value: string }[]; onEdit?: (block: StepBlockId) => void; dirty?: boolean;
}) {
  const pend = issues.length;
  return (
    <section className="min-w-0 rounded-xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900 dark:bg-slate-900" data-testid="step-final-summary" data-pending={pend}>
      <h5 className="m-0 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        Resumo da etapa
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pend ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`} data-testid="step-final-status">{pend ? `Incompleta · ${pend} ${pend === 1 ? "pendência" : "pendências"}` : "Completa"}</span>
      </h5>
      <p className="mt-1 text-xs text-slate-500" role="status">Somente leitura · {dirty ? "Inclui alterações ainda não salvas. Use os botões de salvar para gravar." : "Nenhuma alteração pendente de salvar neste formulário."}</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2" data-testid="step-final-blocks">
        {STEP_BLOCKS.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs dark:bg-slate-800/50">
            <span className="min-w-0 truncate">{b.id} · {b.title}</span>
            <span className="shrink-0 font-semibold">{STATUS_LABEL[infos[b.id].status]}{infos[b.id].count ? ` (${infos[b.id].count})` : ""}</span>
            {onEdit && <button type="button" className="shrink-0 font-semibold text-violet-700 hover:underline dark:text-violet-300" aria-label={`Corrigir bloco ${b.id}`} title={b.title} onClick={() => onEdit(b.id)}>Corrigir</button>}
          </li>
        ))}
      </ul>
      {pend > 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900" data-testid="step-final-pending">
          <p className="font-semibold">O que ainda falta:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{issues.map((i, k) => <li key={`${i.field}-${k}`}><button type="button" className="text-left underline decoration-dotted" onClick={() => onGo(i)}>{i.message}</button></li>)}</ul>
        </div>
      )}
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[10rem_minmax(0,1fr)]">
        {rows.map((row) => <SummaryRow key={row.label} {...row} />)}
        <dt className="font-semibold text-slate-500">Entregáveis</dt>
        <dd data-testid="step-final-deliverables">{deliverables.length ? deliverables.join(" · ") : "nenhum"}</dd>
        <dt className="font-semibold text-slate-500">Acessos necessários</dt>
        <dd data-testid="step-final-access">{accessLine}</dd>
        <dt className="font-semibold text-slate-500">Aprovação do cliente</dt>
        <dd data-testid="step-final-approval">{approvalLine}</dd>
        <dt className="font-semibold text-slate-500">Qualificação</dt>
        <dd data-testid="step-final-qualification">{qualificationLine}</dd>
        <dt className="font-semibold text-slate-500">Próxima etapa</dt>
        <dd data-testid="step-final-release">{releaseLine}</dd>
      </dl>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <><dt className="font-semibold text-slate-500">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{value}</dd></>;
}
