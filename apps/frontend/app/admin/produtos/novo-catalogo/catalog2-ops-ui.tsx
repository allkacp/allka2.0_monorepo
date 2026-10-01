"use client";

// Campos operacionais de tarefa e etapa (Pedido 3, fase 1): formulários do editor de produto e o
// "guia" que executor, líder, agência e cliente enxergam na tarefa contratada.
// A visibilidade de cada campo é decidida no cadastro; o servidor só devolve o que o perfil pode ver.
import { Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Visibility = "internal" | "leader" | "executor" | "agency" | "client";
export const VISIBILITY_OPTIONS: [Visibility, string][] = [
  ["internal", "Só administração"],
  ["leader", "Administração e líder"],
  ["executor", "Quem executa (nômade/IA)"],
  ["agency", "Também a agência"],
  ["client", "Todos, inclusive o cliente"],
];

type TaskField = "objective" | "instructions" | "required_inputs" | "expected_output" | "acceptance_criteria" | "risks_notes";
const TASK_FIELDS: { key: TaskField; label: string; hint: string; rows: number; def: Visibility }[] = [
  { key: "objective", label: "Objetivo", hint: "Para que esta tarefa existe e que resultado de negócio ela busca.", rows: 2, def: "client" },
  { key: "instructions", label: "Instruções de execução", hint: "Passo a passo de como fazer. Aparece para quem executa e aprova.", rows: 4, def: "executor" },
  { key: "required_inputs", label: "Entradas necessárias", hint: "O que precisa existir ou ser enviado antes de começar (acessos, materiais, respostas).", rows: 2, def: "client" },
  { key: "expected_output", label: "Saída / entregável esperado", hint: "O que deve ser entregue no final.", rows: 2, def: "client" },
  { key: "acceptance_criteria", label: "Critério de aceite", hint: "Como saber que está certo: o que o líder, a agência e o cliente vão conferir.", rows: 2, def: "client" },
  { key: "risks_notes", label: "Riscos e observações", hint: "Cuidados e pontos de atenção internos.", rows: 2, def: "leader" },
];

export function VisibilitySelect({ value, onChange, disabled }: { value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500" title="Quem pode ver este campo">
      <Eye className="h-3 w-3" />
      <select
        aria-label="Quem pode ver este campo"
        disabled={disabled}
        className="h-6 rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        value={value}
        onChange={(e) => onChange(e.target.value as Visibility)}
      >
        {VISIBILITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </span>
  );
}

export type TaskOpsValue = Partial<Record<TaskField, string>> & { visibility?: Partial<Record<TaskField, Visibility>> };

/** Formulário dos campos operacionais da TAREFA. `value` nulo = nada preenchido. */
export function TaskOpsForm({ value, onChange, disabled }: { value: TaskOpsValue; onChange: (v: TaskOpsValue) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {TASK_FIELDS.map((f) => (
        <div key={f.key} className="min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{f.label}</span>
            <VisibilitySelect
              disabled={disabled}
              value={value.visibility?.[f.key] ?? f.def}
              onChange={(v) => onChange({ ...value, visibility: { ...(value.visibility ?? {}), [f.key]: v } })}
            />
          </div>
          <Textarea rows={f.rows} disabled={disabled} maxLength={f.key === "instructions" ? 8000 : 4000} value={value[f.key] ?? ""} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} className="min-h-0 text-xs" />
          <p className="text-[10px] leading-snug text-slate-400">{f.hint}</p>
        </div>
      ))}
    </div>
  );
}

export type StepOpsValue = { instructions?: string; evidence_required?: boolean; evidence_hint?: string; visibility?: Partial<Record<"instructions" | "evidence_hint" | "completion_criteria", Visibility>> };

/** Formulário dos campos operacionais da ETAPA (instrução, evidência) + visibilidade do critério de conclusão. */
export function StepOpsForm({ value, onChange, disabled }: { value: StepOpsValue; onChange: (v: StepOpsValue) => void; disabled?: boolean }) {
  const vis = (k: "instructions" | "evidence_hint" | "completion_criteria") => value.visibility?.[k] ?? "executor";
  const setVis = (k: "instructions" | "evidence_hint" | "completion_criteria", v: Visibility) => onChange({ ...value, visibility: { ...(value.visibility ?? {}), [k]: v } });
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/40">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Instrução para o executor</span>
          <VisibilitySelect disabled={disabled} value={vis("instructions")} onChange={(v) => setVis("instructions", v)} />
        </div>
        <Textarea rows={3} disabled={disabled} maxLength={8000} value={value.instructions ?? ""} onChange={(e) => onChange({ ...value, instructions: e.target.value })} className="min-h-0 text-xs" placeholder="Como executar esta etapa, passo a passo." />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium" title="A etapa só pode ser concluída depois de anexar uma evidência.">
          <input type="checkbox" disabled={disabled} checked={!!value.evidence_required} onChange={(e) => onChange({ ...value, evidence_required: e.target.checked })} />
          Evidência obrigatória <span className="font-normal text-slate-500">(só conclui com anexo)</span>
        </label>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-slate-500">Critério de conclusão: <VisibilitySelect disabled={disabled} value={vis("completion_criteria")} onChange={(v) => setVis("completion_criteria", v)} /></span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Que evidência enviar</span>
          <VisibilitySelect disabled={disabled} value={vis("evidence_hint")} onChange={(v) => setVis("evidence_hint", v)} />
        </div>
        <Input disabled={disabled} maxLength={1000} value={value.evidence_hint ?? ""} onChange={(e) => onChange({ ...value, evidence_hint: e.target.value })} className="h-8 text-xs" placeholder="Ex.: print da tela com a campanha publicada" />
      </div>
    </div>
  );
}
