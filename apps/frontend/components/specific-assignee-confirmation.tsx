import { useEffect, useRef, useState } from "react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { installAssigneeConfirmation, type AssigneeImpact } from "@/lib/specific-assignee-confirmation";
type Pending = { impact: AssigneeImpact; resolve: (value: boolean) => void };
export function SpecificAssigneeConfirmation() {
  const pending = useRef<Pending[]>([]);
  const [current, setCurrent] = useState<Pending | null>(null);
  useEffect(() => {
    const uninstall = installAssigneeConfirmation(impact => new Promise(resolve => {
      pending.current.push({ impact, resolve });
      setCurrent(pending.current[0]);
    }));
    return () => { uninstall(); pending.current.splice(0).forEach(p => p.resolve(false)); };
  }, []);
  function finish(value: boolean) {
    pending.current.shift()?.resolve(value);
    setCurrent(pending.current[0] ?? null);
  }
  if (!current) return null;
  const { impact } = current;
  return <StandardModalDialog open onClose={() => finish(false)} title="Responsável indicado pelo nome" subtitle={impact.user_name} size="compact" maxWidthPx={700} overlayClassName="!z-[1500]" contentClassName="!z-[1501]" footer={<div className="flex w-full justify-end gap-2"><Button variant="outline" onClick={() => finish(false)}>Cancelar</Button><Button onClick={() => finish(true)}>{impact.action === "delete" ? "Excluir mesmo assim" : "Inativar mesmo assim"}</Button></div>}>
    <div className="space-y-3 p-4 text-sm">
      <p>Esta pessoa foi escolhida pelo nome nas configurações abaixo. Se continuar, os produtos afetados ficarão com uma pendência para ajustar o responsável.</p>
      {impact.matrices.length > 0 && <section><h3 className="mb-2 font-semibold">Matrizes afetadas ({impact.matrices.length})</h3><div className="space-y-2">{impact.matrices.map((m, i) => <div key={`${m.product_id}:${i}`} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950"><p className="font-semibold">Produto {m.product_number} · {m.product_name}</p><p>v{m.version_number} · {m.version_state} · {m.task_name}</p>{m.step_name && <p>Etapa: {m.step_name}</p>}<p>{m.label}</p></div>)}</div></section>}
      {(impact.executions.length > 0 || impact.stages.length > 0) && <section><h3 className="mb-1 font-semibold">Execuções já contratadas</h3><p className="text-xs text-slate-600">{impact.executions.length} tarefa(s) e {impact.stages.length} etapa(s) com atribuição a esta pessoa. Precisam de revisão separada; ninguém será substituído automaticamente.</p><ul className="mt-2 space-y-1 text-xs">{impact.executions.map(t => <li key={t.id}>{t.title} · Projeto {t.project_id}</li>)}{impact.stages.map(s => <li key={s.id}>{s.project_task.title} → {s.titulo} · Projeto {s.project_task.project_id}</li>)}</ul></section>}
      <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">As matrizes e as contratações serão preservadas. Regras de rodízio ou seleção automática não serão convertidas em atribuições específicas. Outros vínculos, como propriedade de empresa, ainda podem impedir a exclusão.</p>
    </div>
  </StandardModalDialog>;
}
