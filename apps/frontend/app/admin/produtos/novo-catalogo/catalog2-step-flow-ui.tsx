"use client";

// Fluxo das etapas de uma tarefa (reunião 2026-10-05, A8): em sequência, em paralelo ou depois de etapas específicas,
// e quem executa (novo/automático ou o mesmo de outra etapa). Opcional: sem configurar, a tarefa segue a sequência de sempre.
// Todo cálculo de preço/prazo continua no backend; aqui só se monta e valida o desenho do fluxo.
import { useEffect, useMemo, useState } from "react";
import { GitBranch, Pencil, Save } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Act = (fn: () => Promise<any>, ok?: string) => Promise<any>;
type Mode = "previous" | "start" | "after";
interface Row { key: string; name: string; mode: Mode; after: string[]; policy: "auto" | "same_as_step" | "prefer_same_as_step" | "other_than_step"; sameAs: string }
const REF_POLICIES = ["same_as_step", "prefer_same_as_step", "other_than_step"];
const isRef = (p: string) => REF_POLICIES.includes(p);

const SEL = "h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900";
export const fmtMin = (m: number) => { const h = Math.floor(m / 60), r = Math.round(m % 60); return h && r ? `${h} h ${r} min` : h ? `${h} h` : `${r} min`; };

function rowsFrom(steps: any[]): Row[] {
  return [...steps].sort((a, b) => a.sort_order - b.sort_order).map((s) => ({
    key: s.key, name: s.name,
    mode: s.depends_on == null ? "previous" : s.depends_on.length === 0 ? "start" : "after",
    after: Array.isArray(s.depends_on) ? s.depends_on : [],
    policy: isRef(s.executor_policy) ? s.executor_policy : "auto",
    sameAs: s.executor_same_as_key ?? "",
  }));
}
/** Dependências diretas (chaves) de cada etapa, considerando o padrão "depois da anterior". */
export function directDeps(rows: Row[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  rows.forEach((r, i) => m.set(r.key, r.mode === "previous" ? (i === 0 ? [] : [rows[i - 1].key]) : r.mode === "start" ? [] : r.after));
  return m;
}
function ancestors(map: Map<string, string[]>, key: string, seen = new Set<string>()): Set<string> {
  for (const d of map.get(key) ?? []) if (!seen.has(d)) { seen.add(d); ancestors(map, d, seen); }
  return seen;
}
function hasCycle(map: Map<string, string[]>): boolean {
  const st = new Map<string, number>();
  const visit = (k: string): boolean => {
    st.set(k, 1);
    for (const d of map.get(k) ?? []) { if (st.get(d) === 1) return true; if (!st.get(d) && visit(d)) return true; }
    st.set(k, 2);
    return false;
  };
  return [...map.keys()].some((k) => !st.get(k) && visit(k));
}
export function flowSummary(steps: any[]) {
  const rows = rowsFrom(steps);
  const map = directDeps(rows);
  const mins = new Map(steps.map((s: any) => [s.key, Math.max(0, s.estimated_minutes ?? 0)]));
  const level = new Map<string, number>();
  const lv = (k: string, g = new Set<string>()): number => { if (level.has(k)) return level.get(k)!; if (g.has(k)) return 0; g.add(k); const v = Math.max(-1, ...(map.get(k) ?? []).map((d) => lv(d, g))) + 1; g.delete(k); level.set(k, v); return v; };
  const finish = new Map<string, number>();
  const fin = (k: string, g = new Set<string>()): number => { if (finish.has(k)) return finish.get(k)!; if (g.has(k)) return 0; g.add(k); const v = Math.max(0, ...(map.get(k) ?? []).map((d) => fin(d, g))) + (mins.get(k) ?? 0); g.delete(k); finish.set(k, v); return v; };
  const waves: string[][] = [];
  rows.forEach((r) => { (waves[lv(r.key)] ??= []).push(r.key); });
  return { waves: waves.filter(Boolean), criticalMinutes: Math.max(0, ...rows.map((r) => fin(r.key))), totalMinutes: [...mins.values()].reduce((a, b) => a + b, 0), configured: steps.some((s: any) => s.depends_on != null) };
}

/** Modo "Começa:" de uma etapa, para o seletor rápido da linha. */
export type StartMode = "previous" | "with_previous" | "start" | "custom";
const sortSteps = (steps: any[]) => [...steps].sort((a, b) => a.sort_order - b.sort_order);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
/** Dependências de uma etapa (chaves), considerando o padrão "depois da anterior". */
function depsOfIndex(ord: any[], i: number): string[] {
  const s = ord[i];
  return s.depends_on == null ? (i === 0 ? [] : [ord[i - 1].key]) : s.depends_on;
}
export function stepStartMode(step: any, steps: any[]): StartMode {
  const ord = sortSteps(steps);
  const i = ord.findIndex((s) => s.key === step.key);
  if (step.depends_on == null) return "previous";
  // vazio: se a etapa anterior também começa no início, "ao mesmo tempo que a anterior" e "no início" são a mesma coisa — mostra a leitura mais natural
  if (i > 0 && sameSet(step.depends_on, depsOfIndex(ord, i - 1))) return "with_previous";
  if (step.depends_on.length === 0) return "start";
  return "custom";
}
/**
 * Alteração pedida pelo seletor rápido → itens para salvar o fluxo.
 * "Ao mesmo tempo que a etapa anterior": começa junto com ela (mesmas dependências). Se a etapa seguinte ainda estava no padrão,
 * ela passa a esperar AS DUAS (a anterior e esta), para nunca começar antes de uma delas terminar.
 */
export function startChangePayload(mode: StartMode, step: any, steps: any[]): { step_id: string; depends_on: string[] | null }[] {
  const ord = sortSteps(steps);
  const i = ord.findIndex((s) => s.key === step.key);
  if (mode === "previous") return [{ step_id: step.id, depends_on: null }];
  if (mode === "start") return [{ step_id: step.id, depends_on: [] }];
  if (mode !== "with_previous" || i <= 0) return [];
  const out: { step_id: string; depends_on: string[] | null }[] = [{ step_id: step.id, depends_on: depsOfIndex(ord, i - 1) }];
  const next = ord[i + 1];
  if (next && next.depends_on == null) out.push({ step_id: next.id, depends_on: [ord[i - 1].key, step.key] });
  return out;
}

/** Texto curto para a linha da etapa: "começa junto" · "depois da(s) etapa(s) 1, 2" · "mesmo executor da etapa 1". */
export function stepFlowChips(step: any, steps: any[]): string[] {
  const ord = [...steps].sort((a, b) => a.sort_order - b.sort_order);
  const num = (k: string) => ord.findIndex((s) => s.key === k) + 1;
  const out: string[] = [];
  if (step.depends_on != null) out.push(step.depends_on.length === 0 ? "começa junto com a tarefa" : `depois da${step.depends_on.length > 1 ? "s etapas" : " etapa"} ${step.depends_on.map(num).sort((a: number, b: number) => a - b).join(", ")}`);
  if (step.executor_same_as_key && step.executor_policy === "same_as_step") out.push(`mesmo executor da etapa ${num(step.executor_same_as_key)}`);
  if (step.executor_same_as_key && step.executor_policy === "prefer_same_as_step") out.push(`prefere o executor da etapa ${num(step.executor_same_as_key)}`);
  if (step.executor_same_as_key && step.executor_policy === "other_than_step") out.push(`nunca o executor da etapa ${num(step.executor_same_as_key)}`);
  return out;
}

/** Frases do fluxo SALVO de uma etapa (para a visão organizada). */
export function stepFlowSentences(step: any, steps: any[], opts: { stageMode?: boolean } = {}) {
  const ord = sortSteps(steps);
  const i = ord.findIndex((s) => s.key === step.key);
  const num = (k: string) => ord.findIndex((s) => s.key === k) + 1;
  const label = (k: string) => `etapa ${num(k)} (${ord.find((s) => s.key === k)?.name ?? k})`;
  const done = opts.stageMode ? "aprovada" : "concluída";
  const deps = depsOfIndex(ord, i);
  const starts = deps.length === 0
    ? (i === 0 || step.depends_on != null ? "Começa quando a tarefa inicia" : "Começa quando a tarefa inicia")
    : `Começa depois que ${deps.map(label).join(" e ")} ${deps.length > 1 ? "forem" : "for"} ${done}${deps.length > 1 ? "s" : ""}`;
  const kind = step.executor_kind === "leader" ? "Líder" : step.executor_kind === "internal" ? "Equipe interna" : "Nômade";
  let who = kind + (step.executor_kind === "leader" ? (step.leader_mode === "specific" ? " específico" : " da área") : step.executor_kind === "internal" ? "" : "");
  if (step.executor_same_as_key && step.executor_policy === "same_as_step") who += ` · mesmo executor da ${label(step.executor_same_as_key)}`;
  else if (step.executor_same_as_key && step.executor_policy === "prefer_same_as_step") who += ` · prefere o executor da ${label(step.executor_same_as_key)} (reserva por prazo de aceite)`;
  else if (step.executor_same_as_key && step.executor_policy === "other_than_step") who += ` · nunca o executor da ${label(step.executor_same_as_key)}`;
  else if ((step.executor_policy ?? "auto") === "auto") who += " · executor novo escolhido automaticamente";
  const flags: string[] = [];
  if (opts.stageMode) {
    flags.push(step.internal_step ? "etapa interna (o cliente não vê nem aprova)" : "o cliente aprova a etapa");
    if (step.requires_qualification !== false) flags.push("passa pela qualificação do líder");
    flags.push("libera a próxima sozinha");
    if (step.requires_specialist_qualification) flags.push("qualificação do especialista");
  }
  return { starts, who, flags, minutes: Math.max(0, step.estimated_minutes ?? 0) };
}

function FlowOverview({ steps, stageMode }: { steps: any[]; stageMode: boolean }) {
  const ord = sortSteps(steps);
  const sum = flowSummary(steps);
  const num = (k: string) => ord.findIndex((x) => x.key === k) + 1;
  const configured = sum.configured;
  const deps = directDeps(rowsFrom(steps));
  const succ = (k: string) => ord.filter((x) => (deps.get(x.key) ?? []).includes(k)).map((x) => x.key);
  const labelOf = (k: string) => `etapa ${num(k)} (${ord.find((x) => x.key === k)?.name ?? k})`;
  return (
    <div className="mt-2 space-y-2" data-testid="flow-overview">
      {!configured && <p className="rounded-lg bg-white/70 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">Fluxo padrão: cada etapa começa quando a anterior {stageMode ? "é aprovada" : "termina"}. Para colocar etapas em paralelo, esperar etapas específicas ou definir quem executa, configure direto na etapa (linha "Começa").</p>}
      {sum.waves.map((wave, wi) => (
        <section key={wi} className="rounded-lg border border-indigo-200 bg-white p-2.5 dark:border-indigo-900/60 dark:bg-slate-900/60" data-testid={`flow-wave-${wi + 1}`}>
          <header className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            <span>Fase {wi + 1}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] normal-case text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">{wave.length > 1 ? `rodando juntas: etapas ${wave.map(num).join(" + ")}` : `rodando: etapa ${num(wave[0])}`}</span>
            {wi === 0 ? <span className="normal-case text-slate-500">começa quando a tarefa inicia</span> : <span className="normal-case text-slate-500">liberada depois das fases anteriores</span>}
          </header>
          <ul className="space-y-1.5">
            {wave.map((k) => {
              const st = ord.find((x) => x.key === k)!;
              const t = stepFlowSentences(st, steps, { stageMode });
              return (
                <li key={k} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/50" data-testid={`flow-step-${k}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-5 min-w-5 items-center justify-center rounded bg-sky-500 px-1 text-[11px] font-bold text-white">{num(k)}</span><span className="min-w-0 flex-1 truncate">{st.name}</span><span className="shrink-0 text-[11px] font-normal text-slate-500">{fmtMin(t.minutes)}</span></div>
                  <dl className="mt-1 grid gap-x-3 gap-y-0.5 pl-7 sm:grid-cols-[auto_1fr]">
                    <dt className="text-slate-500">Começa</dt><dd>{t.starts}</dd>
                    <dt className="text-slate-500">Executor</dt><dd>{t.who}</dd>
                    <dt className="text-slate-500">Libera depois</dt><dd>{succ(k).length ? succ(k).map(labelOf).join(", ") : "ninguém — é a última nesse caminho"}</dd>
                    {t.flags.length > 0 && <><dt className="text-slate-500">Regras</dt><dd>{t.flags.join(" · ")}</dd></>}
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function StepFlowEditor({ task, readOnly, act, startEditing = false, allowEdit = false }: { task: any; readOnly: boolean; act: Act; startEditing?: boolean; allowEdit?: boolean }) {
  // O fluxo se edita direto em cada etapa (StepFlowControls); aqui só se mostra o resultado. O editor completo só abre se pedido (testes/uso interno).
  const [editing, setEditing] = useState(startEditing);
  const steps: any[] = task.steps ?? [];
  const sig = JSON.stringify(steps.map((s) => [s.key, s.sort_order, s.depends_on, s.executor_policy, s.executor_same_as_key]));
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(steps));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setRows(rowsFrom(steps)); setError(null); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const map = useMemo(() => directDeps(rows), [rows]);
  const cyc = hasCycle(map);
  const noRoot = rows.length > 0 && ![...map.values()].some((d) => d.length === 0);
  const dirty = JSON.stringify(rows) !== JSON.stringify(rowsFrom(steps));
  const draftSteps = steps.map((s) => { const r = rows.find((x) => x.key === s.key); return { ...s, depends_on: !r || r.mode === "previous" ? null : r.mode === "start" ? [] : r.after, executor_policy: r?.policy, executor_same_as_key: r?.policy === "same_as_step" ? r.sameAs : null }; });
  const sum = flowSummary(draftSteps);
  const numOf = (k: string) => rows.findIndex((r) => r.key === k) + 1;
  const nameOf = (k: string) => rows.find((r) => r.key === k)?.name ?? k;
  const set = (key: string, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  if (steps.length < 2) return null;

  async function save() {
    setSaving(true); setError(null);
    try {
      await act(() => apiClient.saveCatalog2StepFlow(task.id, rows.map((r) => {
        const s = steps.find((x) => x.key === r.key);
        return { step_id: s.id, depends_on: r.mode === "previous" ? null : r.mode === "start" ? [] : r.after, executor_policy: r.policy, executor_same_as_key: isRef(r.policy) ? r.sameAs || null : null };
      })), "Fluxo das etapas salvo.");
      setEditing(false);
    } catch (e: any) { setError(e?.message ?? "Não foi possível salvar o fluxo."); } finally { setSaving(false); }
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/10" data-testid="step-flow-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200"><GitBranch className="h-4 w-4" />Fluxo das etapas <span className="font-normal normal-case text-slate-500">(resultado do que você configurou em cada etapa)</span></h4>
        <span className="text-[11px] text-slate-600 dark:text-slate-300" data-testid="flow-summary">
          {sum.configured || dirty ? `Ordem: ${sum.waves.map((w) => (w.length > 1 ? `[${w.map(numOf).join(" + ")}]` : String(numOf(w[0])))).join(" → ")}` : "Em sequência (padrão)"} · duração mínima {fmtMin(sum.criticalMinutes)} · esforço total {fmtMin(sum.totalMinutes)}
        </span>
      </div>
      {!editing && <FlowOverview steps={steps} stageMode={task.stage_execution === "stage"} />}
      {!editing && !readOnly && allowEdit && <div className="mt-2"><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} data-testid="edit-step-flow"><Pencil className="mr-1.5 h-4 w-4" />Editar fluxo</Button></div>}
      {editing && <>
      <p className="mt-1 text-[11px] text-slate-500">Escolha quando cada etapa começa e quem a executa. Padrão: cada etapa começa quando a anterior termina. Etapas que começam juntas contam o tempo só uma vez na duração mínima; o custo continua sendo a soma de todas.</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r, i) => {
          const ancs = ancestors(map, r.key);
          const others = rows.filter((x) => x.key !== r.key);
          return (
            <li key={r.key} className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-medium"><span className="flex h-5 min-w-5 items-center justify-center rounded bg-sky-500 px-1 text-[11px] font-bold text-white">{i + 1}</span>{r.name}</div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Quando começa
                  <select aria-label={`Quando a etapa ${i + 1} começa`} disabled={readOnly} className={`${SEL} mt-0.5`} value={r.mode} onChange={(e) => set(r.key, { mode: e.target.value as Mode, ...(e.target.value !== "after" ? { after: [] } : {}) })}>
                    <option value="previous">{i === 0 ? "No início da tarefa" : "Depois da etapa anterior (padrão)"}</option>
                    <option value="start">Junto com o início da tarefa (em paralelo)</option>
                    <option value="after">Depois de etapas específicas…</option>
                  </select>
                  {r.mode === "after" && (
                    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-normal">
                      {others.map((o) => (
                        <label key={o.key} className="inline-flex items-center gap-1 text-xs">
                          <input type="checkbox" disabled={readOnly} checked={r.after.includes(o.key)} onChange={(e) => set(r.key, { after: e.target.checked ? [...r.after, o.key] : r.after.filter((k) => k !== o.key) })} />
                          Etapa {numOf(o.key)}
                        </label>
                      ))}
                      {r.after.length === 0 && <span className="text-[11px] text-amber-700">Marque ao menos uma etapa (ou escolha "junto com o início").</span>}
                    </span>
                  )}
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Quem executa
                  <select aria-label={`Quem executa a etapa ${i + 1}`} disabled={readOnly} className={`${SEL} mt-0.5`} value={r.policy} onChange={(e) => set(r.key, { policy: e.target.value as Row["policy"], ...(e.target.value === "auto" ? { sameAs: "" } : {}) })}>
                    <option value="auto">Executor novo, escolhido automaticamente</option>
                    <option value="same_as_step">Mesmo executor de outra etapa</option>
                    <option value="prefer_same_as_step">Preferir o mesmo executor de outra etapa (oferece primeiro a ele)</option>
                    <option value="other_than_step">Nunca o mesmo executor de outra etapa</option>
                  </select>
                  {isRef(r.policy) && (
                    <select aria-label={`Mesmo executor da etapa (para a etapa ${i + 1})`} disabled={readOnly} className={`${SEL} mt-1.5`} value={r.sameAs} onChange={(e) => set(r.key, { sameAs: e.target.value })}>
                      <option value="">Escolha a etapa…</option>
                      {others.map((o) => <option key={o.key} value={o.key} disabled={!ancs.has(o.key)}>Etapa {numOf(o.key)} — {nameOf(o.key)}{ancs.has(o.key) ? "" : " (precisa terminar antes desta)"}</option>)}
                    </select>
                  )}
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      {(cyc || noRoot) && <p className="mt-2 text-xs font-semibold text-red-600">{cyc ? "O fluxo tem um círculo: uma etapa espera por outra que depende dela." : "Pelo menos uma etapa precisa poder começar sem esperar ninguém."}</p>}
      {rows.some((r) => isRef(r.policy) && !r.sameAs) && <p className="mt-2 text-xs font-semibold text-amber-700">Falta escolher de qual etapa vem o executor.</p>}
      {error && <p className="mt-2 text-xs font-semibold text-red-600" role="alert">{error}</p>}
      {!readOnly && (
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" size="sm" disabled={!dirty || saving || cyc || noRoot || rows.some((r) => (r.mode === "after" && r.after.length === 0) || (isRef(r.policy) && !r.sameAs))} onClick={() => void save()} data-testid="save-step-flow"><Save className="mr-1.5 h-4 w-4" />Salvar fluxo</Button>
          {dirty && <Button type="button" size="sm" variant="ghost" onClick={() => { setRows(rowsFrom(steps)); setError(null); }}>Desfazer alterações</Button>}
          <Button type="button" size="sm" variant="ghost" onClick={() => { setRows(rowsFrom(steps)); setError(null); setEditing(false); }}>Cancelar</Button>
          <span className="text-[11px] text-slate-500">Vale para projetos criados depois de salvar e publicar.</span>
        </div>
      )}
      </>}
    </div>
  );
}

/**
 * Fluxo configurado DIRETO na etapa (sem editor separado): quando começa (depois da anterior / no início / junto com a anterior / depois de
 * etapas específicas) e quem executa (novo, mesmo, preferir o mesmo, nunca o mesmo de outra etapa). Salva ao escolher; o bloco "Fluxo das etapas" só mostra o resultado.
 */
export function StepFlowControls({ step, steps, index, taskId, act }: { step: any; steps: any[]; index: number; taskId: string; act: Act }) {
  const ord = sortSteps(steps);
  const i = ord.findIndex((s) => s.key === step.key);
  const num = (k: string) => ord.findIndex((s) => s.key === k) + 1;
  const mode0 = stepStartMode(step, steps);
  const [custom, setCustom] = useState(mode0 === "custom");
  const [after, setAfter] = useState<string[]>(Array.isArray(step.depends_on) ? step.depends_on : []);
  const [policy, setPolicy] = useState<string>(isRef(step.executor_policy) ? step.executor_policy : "auto");
  const [sameAs, setSameAs] = useState<string>(step.executor_same_as_key ?? "");
  const sig = JSON.stringify([step.depends_on, step.executor_policy, step.executor_same_as_key]);
  useEffect(() => { setCustom(stepStartMode(step, steps) === "custom"); setAfter(Array.isArray(step.depends_on) ? step.depends_on : []); setPolicy(isRef(step.executor_policy) ? step.executor_policy : "auto"); setSameAs(step.executor_same_as_key ?? ""); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (items: { step_id: string; depends_on?: string[] | null; executor_policy?: string; executor_same_as_key?: string | null }[]) => void act(() => apiClient.saveCatalog2StepFlow(taskId, items), "Fluxo da etapa salvo.");
  // etapas que terminam ANTES desta (para "mesmo executor" e "depois de etapas específicas" sem criar círculo)
  const map = directDeps(rowsFrom(steps));
  const ancs = ancestors(map, step.key);
  const others = ord.filter((o) => o.key !== step.key);
  const startValue = custom ? "custom" : mode0 === "custom" ? "custom" : mode0;
  const SELC = "h-7 rounded-md border border-indigo-200 bg-white px-1.5 text-[11px] dark:border-indigo-800 dark:bg-slate-900";
  return (
    <div className="mt-1 space-y-1" data-testid="step-start-row">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">Começa:</span>
        {index === 0 && steps.length > 0 ? <span className="text-slate-600">no início da tarefa (ou configure depois de etapas específicas)</span> : null}
        <select aria-label={`Quando a etapa ${index + 1} começa`} className={SELC} value={startValue} onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") { setCustom(true); if (after.length) save([{ step_id: step.id, depends_on: after }]); return; }
          setCustom(false); setAfter([]);
          const items = startChangePayload(v as StartMode, step, steps); if (items.length) save(items);
        }}>
          <option value="previous">{i === 0 ? "No início da tarefa" : "Depois da etapa anterior (em sequência)"}</option>
          {i > 0 && <option value="with_previous">{i === 1 ? "Ao mesmo tempo que a etapa 1" : `Ao mesmo tempo que a etapa ${i}`}</option>}
          <option value="start">No início da tarefa (em paralelo com as primeiras)</option>
          {others.length > 0 && <option value="custom">Depois de etapas específicas…</option>}
        </select>
        {startValue === "custom" && (
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {others.map((o) => (
              <label key={o.key} className="inline-flex items-center gap-1" title={`Esta etapa só começa depois que a etapa ${num(o.key)} terminar`}>
                <input type="checkbox" checked={after.includes(o.key)} disabled={(map.get(o.key) ?? []).length > 0 && ancestors(map, o.key).has(step.key)} onChange={(e) => { const next = e.target.checked ? [...after, o.key] : after.filter((k) => k !== o.key); setAfter(next); if (next.length) save([{ step_id: step.id, depends_on: next }]); }} />
                Etapa {num(o.key)}
              </label>
            ))}
            {after.length === 0 && <span className="text-amber-700">Marque ao menos uma etapa.</span>}
          </span>
        )}
      </div>
      {i > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">Executor:</span>
          <select aria-label={`Quem executa a etapa ${index + 1}`} className={SELC} value={policy} onChange={(e) => {
            const v = e.target.value; setPolicy(v);
            if (v === "auto") { setSameAs(""); save([{ step_id: step.id, executor_policy: "auto", executor_same_as_key: null }]); }
            else if (sameAs) save([{ step_id: step.id, executor_policy: v, executor_same_as_key: sameAs }]);
          }}>
            <option value="auto">Executor novo, escolhido automaticamente</option>
            <option value="same_as_step">Mesmo executor de outra etapa</option>
            <option value="prefer_same_as_step">Preferir o mesmo executor de outra etapa</option>
            <option value="other_than_step">Nunca o mesmo executor de outra etapa</option>
          </select>
          {isRef(policy) && (
            <select aria-label={`Mesmo executor da etapa (para a etapa ${index + 1})`} className={SELC} value={sameAs} onChange={(e) => { setSameAs(e.target.value); if (e.target.value) save([{ step_id: step.id, executor_policy: policy, executor_same_as_key: e.target.value }]); }}>
              <option value="">Escolha a etapa…</option>
              {others.map((o) => <option key={o.key} value={o.key} disabled={!ancs.has(o.key)}>Etapa {num(o.key)} — {o.name}{ancs.has(o.key) ? "" : " (precisa terminar antes desta)"}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
