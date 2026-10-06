"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Aprovações, prazos (SLA) e histórico real DA ETAPA, na própria configuração da etapa (2026-10-06).
// Os mesmos dados também aparecem na visão geral da aba "Aprovações e prazos" do produto.
type Act = (fn: () => Promise<any>, ok?: string) => Promise<any>;
const SEL = "h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900";
const EXEC_LABEL: Record<string, string> = { humano: "Humano", ia: "IA", hibrido: "Híbrido" };
const EXECUTOR_LABEL: Record<string, string> = { nomad: "Nômade", leader: "Líder", internal: "Equipe interna" };

const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const hrs = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`);
const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export function perfRatioText(r: number | null | undefined): string {
  if (r == null) return "—";
  if (r > 1.05) return `+${Math.round((r - 1) * 100)}% sobre o estimado`;
  if (r < 0.95) return `${Math.round((1 - r) * 100)}% abaixo do estimado`;
  return "no estimado";
}

function PerfRow({ label, s }: { label: string; s: any }) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="py-1 pr-2 font-medium">{label}</td><td className="px-2 text-right">{s.concluidas}</td><td className="px-2 text-right">{hrs(s.avg_actual_hours)}</td>
      <td className="px-2 text-right">{pct(s.on_time_rate)}</td><td className="px-2 text-right">{pct(s.rework_rate)}</td><td className="pl-2 text-right">{money(s.avg_cost)}</td>
    </tr>
  );
}

export function StepPerformance({ stepId, hasModel }: { stepId: string; hasModel: boolean }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scope, setScope] = useState<"product" | "model">("product");
  useEffect(() => {
    let live = true;
    setData(null); setErr(null);
    apiClient.getCatalog2StepPerformance(stepId).then((r: any) => { if (live) setData(r); }).catch((e: any) => { if (live) setErr(e?.message ?? "Não foi possível carregar o histórico."); });
    return () => { live = false; };
  }, [stepId]);
  if (err) return <p className="text-xs text-red-600">{err}</p>;
  if (!data) return <p className="text-xs text-slate-500">Carregando histórico…</p>;
  const p = scope === "model" && data.model ? data.model : data.product;
  return (
    <div className="space-y-2 text-xs" data-testid="step-performance">
      {hasModel && data.model && (
        <div className="flex gap-1.5">
          {(["product", "model"] as const).map((k) => <button key={k} type="button" onClick={() => setScope(k)} className={`rounded-lg border px-2 py-1 font-semibold ${scope === k ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600"}`}>{k === "product" ? "Neste produto" : `Este modelo em todos os produtos (${data.model_steps})`}</button>)}
        </div>
      )}
      {p.total === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">Etapa nova: ainda não foi contratada. O histórico aparece sozinho conforme ela for contratada e entregue.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[["Execuções concluídas", String(p.concluidas) + (p.em_andamento ? ` (+${p.em_andamento} em andamento)` : "")], ["Tempo real médio", `${hrs(p.avg_actual_hours)} (estimado ${hrs(p.avg_estimated_hours)})`], ["Leitura", perfRatioText(p.actual_vs_estimated)], ["No prazo", `${pct(p.on_time_rate)}${p.late_count ? ` · ${p.late_count} atraso(s), média ${hrs(p.avg_delay_hours)}` : ""}`], ["Precisou de ajuste", `${pct(p.rework_rate)} (média ${p.avg_rework_rounds ?? 0} rodada(s))`]].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{k}</p><p className="font-semibold">{v}</p></div>
            ))}
          </div>
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500"><th className="pr-2">Quem executou</th><th className="px-2 text-right">Concluídas</th><th className="px-2 text-right">Tempo real</th><th className="px-2 text-right">No prazo</th><th className="px-2 text-right">Ajuste</th><th className="pl-2 text-right">Custo médio</th></tr></thead>
            <tbody>
              {Object.entries(p.by_execution ?? {}).map(([k, s]) => <PerfRow key={`e-${k}`} label={EXEC_LABEL[k] ?? k} s={s} />)}
              {Object.entries(p.by_executor ?? {}).map(([k, s]) => <PerfRow key={`x-${k}`} label={`↳ ${EXECUTOR_LABEL[k] ?? k}`} s={s} />)}
            </tbody>
          </table>
          {p.signals?.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-slate-700 dark:text-slate-200" data-testid="perf-signals">{p.signals.map((s: string) => <li key={s}>{s}</li>)}</ul>}
          {scope === "product" && data.ai && <p className="text-slate-600 dark:text-slate-300">IA: {data.ai.runs} execução(ões) · {data.ai.adopted} adotada(s) · {data.ai.discarded} descartada(s) · {data.ai.errors} com erro · custo médio {money(data.ai.avg_cost)}</p>}
        </>
      )}
    </div>
  );
}

export function StepGovernance({ step, task, version, readOnly, act }: { step: any; task: any; version: any; readOnly: boolean; act: Act }) {
  const [gateOpts, setGateOpts] = useState<any>(null);
  const [slaOpts, setSlaOpts] = useState<any>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    apiClient.getCatalog2GateOptions().then(setGateOpts).catch(() => setGateOpts(null));
    apiClient.getCatalog2SlaOptions().then(setSlaOpts).catch(() => setSlaOpts(null));
  }, [open]);
  const gates: any[] = (version.approval_gates ?? []).filter((g: any) => g.anchor_task_key === task.key && g.anchor_step_key === step.key);
  const target = `${task.key}:${step.key}`;
  const rules: any[] = (version.sla_rules ?? []).filter((r: any) => r.scope_kind === "step" && r.target_key === target);
  const [g, setG] = useState<any>({ name: "", position: "before_step", approver_kind: "client", requires_comment: false });
  const [r, setR] = useState<any>({ name: "", amount: "", unit: "business_hours", anchor: "start" });
  const [addG, setAddG] = useState(false);
  const [addR, setAddR] = useState(false);
  const lab = (list: any[] | undefined, k: string) => list?.find((x) => x.key === k)?.label ?? k;
  return (
    <details className="mt-1 rounded-md border border-slate-200 bg-white/70 text-xs dark:border-slate-700 dark:bg-slate-900/40" data-testid="step-governance" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer select-none px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">Aprovações, prazos e histórico real desta etapa{gates.length + rules.length > 0 ? ` · ${gates.length} aprovação(ões), ${rules.length} prazo(s)` : ""}</summary>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-2.5 dark:border-slate-800">
          <section>
            <div className="mb-1 flex items-center gap-2"><h5 className="font-bold">Aprovações desta etapa</h5>{!readOnly && <Button type="button" size="sm" variant="outline" className="ml-auto h-6 px-2 text-[11px]" onClick={() => setAddG((v) => !v)}><Plus className="mr-1 h-3 w-3" />Nova aprovação</Button>}</div>
            <p className="mb-1 text-[11px] text-slate-500">Ponto em que alguém precisa aprovar antes de seguir (ex.: o cliente aprova antes de a etapa começar ou depois que ela termina).</p>
            {gates.length === 0 && <p className="italic text-slate-400">Nenhuma aprovação extra nesta etapa.</p>}
            <ul className="space-y-1">{gates.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/50"><span className="font-semibold">{x.name}</span><span className="text-slate-500">{lab(gateOpts?.positions, x.position)} · aprova: {lab(gateOpts?.approvers, x.approver_kind)}{x.requires_comment ? " · exige comentário" : ""}</span>{!readOnly && <button type="button" aria-label="Remover aprovação" className="ml-auto text-red-500" onClick={() => void act(() => apiClient.deleteCatalog2ApprovalGate(x.id), "Aprovação removida.")}><Trash2 className="h-3.5 w-3.5" /></button>}</li>
            ))}</ul>
            {!readOnly && addG && (
              <div className="mt-1 flex flex-wrap items-end gap-1.5">
                <Input className="h-7 w-48 text-xs" placeholder="Nome da aprovação" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
                <select aria-label="Posição da aprovação" className={SEL} value={g.position} onChange={(e) => setG({ ...g, position: e.target.value })}>{(gateOpts?.positions ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                <select aria-label="Quem aprova esta etapa" className={SEL} value={g.approver_kind} onChange={(e) => setG({ ...g, approver_kind: e.target.value })}>{(gateOpts?.approvers ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                <label className="inline-flex items-center gap-1"><input type="checkbox" checked={g.requires_comment} onChange={(e) => setG({ ...g, requires_comment: e.target.checked })} /> exige comentário</label>
                <Button type="button" size="sm" className="h-7 bg-gradient-to-r from-violet-700 to-fuchsia-600" disabled={!g.name.trim()} onClick={() => void act(() => apiClient.addCatalog2ApprovalGate(version.id, { name: g.name.trim(), anchor_task_key: task.key, anchor_step_key: step.key, position: g.position, approver_kind: g.approver_kind, group_key: null, sequence_no: 0, group_mode: "sequence", rejection_return_step_key: step.key, requires_comment: g.requires_comment }), "Aprovação adicionada.").then(() => { setAddG(false); setG({ ...g, name: "" }); })}>Adicionar</Button>
              </div>
            )}
          </section>
          <section>
            <div className="mb-1 flex items-center gap-2"><h5 className="font-bold">Prazo (SLA) desta etapa</h5>{!readOnly && <Button type="button" size="sm" variant="outline" className="ml-auto h-6 px-2 text-[11px]" onClick={() => setAddR((v) => !v)}><Plus className="mr-1 h-3 w-3" />Novo prazo</Button>}</div>
            <p className="mb-1 text-[11px] text-slate-500">Quanto tempo esta etapa pode levar, contado a partir de um marco (ex.: 16 horas úteis depois de liberada).</p>
            {rules.length === 0 && <p className="italic text-slate-400">Nenhum prazo próprio nesta etapa.</p>}
            <ul className="space-y-1">{rules.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/50"><span className="font-semibold">{x.name}</span><span className="text-slate-500">{Number(x.amount)} {lab(slaOpts?.units, x.unit)} · {lab(slaOpts?.anchors, x.anchor)}</span>{!readOnly && <button type="button" aria-label="Remover prazo da etapa" className="ml-auto text-red-500" onClick={() => void act(() => apiClient.deleteCatalog2SlaRule(x.id), "Prazo removido.")}><Trash2 className="h-3.5 w-3.5" /></button>}</li>
            ))}</ul>
            {!readOnly && addR && (
              <div className="mt-1 flex flex-wrap items-end gap-1.5">
                <Input className="h-7 w-48 text-xs" placeholder="Nome do prazo" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
                <Input className="h-7 w-16 text-xs" type="number" min={1} aria-label="Quantidade do prazo da etapa" placeholder="qtd" value={r.amount} onChange={(e) => setR({ ...r, amount: e.target.value })} />
                <select aria-label="Unidade do prazo da etapa" className={SEL} value={r.unit} onChange={(e) => setR({ ...r, unit: e.target.value })}>{(slaOpts?.units ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                <select aria-label="Contado a partir de (etapa)" className={SEL} value={r.anchor} onChange={(e) => setR({ ...r, anchor: e.target.value })}>{(slaOpts?.anchors ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
                <Button type="button" size="sm" className="h-7 bg-gradient-to-r from-violet-700 to-fuchsia-600" disabled={!r.name.trim() || !(Number(r.amount) > 0)} onClick={() => void act(() => apiClient.addCatalog2SlaRule(version.id, { name: r.name.trim(), scope_kind: "step", target_key: target, modality: "any", amount: Number(r.amount), unit: r.unit, anchor: r.anchor }), "Prazo adicionado.").then(() => { setAddR(false); setR({ ...r, name: "", amount: "" }); })}>Adicionar</Button>
              </div>
            )}
          </section>
          <section>
            <h5 className="mb-1 font-bold">Histórico real desta etapa</h5>
            <p className="mb-1 text-[11px] text-slate-500">Calculado automaticamente das execuções já contratadas e entregues: tempo real contra o estimado, atrasos, ajustes, custo e uso de IA — separado por humano, IA e híbrido.</p>
            <StepPerformance stepId={step.id} hasModel={step.step_model_id != null} />
          </section>
        </div>
      )}
    </details>
  );
}
