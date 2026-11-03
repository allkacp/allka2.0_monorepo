"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { createPortal } from "react-dom";
import { useLayoutEffect } from "react";
import { FramedPanel } from "@/components/framed-panel";
import { useFramedEditorSessionKey } from "@/components/framed-editor-context";
import { readEditorSession, writeEditorSession } from "./editor-session";
import { OPEN_STEP_EVENT } from "./catalog2-deliverables-ui";
import "./editor-layout-test.css";

export type ProductEditorLayout = "current" | "test";
const LayoutContext = createContext<ProductEditorLayout>("current");
export const ProductEditorLayoutProvider = LayoutContext.Provider;
export function useTestProductLayout() { return useContext(LayoutContext) === "test"; }

export const PRODUCT_FLOW_STEPS = [
  { id: "info", label: "Produto", keys: ["produto_base", "classificacao", "conteudo"] },
  { id: "entrega", label: "Configurações da tarefa e etapas", keys: ["tarefas", "etapas", "esforco_tarefas", "conexoes", "variacoes", "adicionais"] },
  { id: "revisao", label: "Conferência, preço e publicação", keys: ["prazo", "preco", "validacao"] },
];
const FlowContext = createContext<{ step: string; workspaces: Record<string, string>; targets: Record<string, string>; setTarget: (slot: string, id: string) => void; releaseTarget: (slot: string, id: string) => void; setWorkspace: (slot: string, id: string) => void; releaseWorkspace: (slot: string, id: string) => void }>({ step: "info", workspaces: {}, targets: {}, setTarget: () => {}, releaseTarget: () => {}, setWorkspace: () => {}, releaseWorkspace: () => {} });
export function ProductFlowProvider({ value, children }: { value: string; children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const setTarget = useCallback((slot: string, id: string) => setTargets(cur => cur[slot] === id ? cur : ({ ...cur, [slot]: id })), []);
  const releaseTarget = useCallback((slot: string, id: string) => setTargets(cur => cur[slot] === id ? { ...cur, [slot]: "" } : cur), []);
  const setWorkspace = useCallback((slot: string, id: string) => setWorkspaces(cur => ({ ...cur, [slot]: cur[slot] === id ? "" : id })), []);
  const releaseWorkspace = useCallback((slot: string, id: string) => setWorkspaces(cur => cur[slot] === id ? { ...cur, [slot]: "" } : cur), []);
  useEffect(() => { setWorkspaces({}); }, [value]);
  return <FlowContext.Provider value={{ step: value, workspaces, targets, setTarget, releaseTarget, setWorkspace, releaseWorkspace }}>{children}</FlowContext.Provider>;
}
export function useProductFlowStep() { return useContext(FlowContext).step; }
export function ProductFlowWorkspace({ slot, label }: { slot: string; label: string }) {
  const test = useTestProductLayout();
  const id = useId();
  const { workspaces, setWorkspace, releaseWorkspace } = useContext(FlowContext);
  useEffect(() => () => releaseWorkspace(slot, id), [slot, id, releaseWorkspace]);
  const active = workspaces[slot] === id;
  if (!test) return null;
  return <div className="w-full min-w-0 space-y-2">
    <button type="button" aria-expanded={active} className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700" onClick={event => {
      // Options now live inside the task: show its steps instead of moving an ancestor into itself.
      if (slot === "tasks" && event.currentTarget.closest('[data-testid="test-task-editor"]')) {
        window.dispatchEvent(new CustomEvent("catalog2:task-pane-reveal", { detail: { ids: ["catalog2-step"] } }));
        return;
      }
      setWorkspace(slot, id);
    }}>{active ? "Fechar cadastro de apoio" : label}</button>
    <div hidden={!active} className="space-y-2 rounded-xl border border-violet-200 bg-white p-2" data-editor-layout="test" data-flow-id={id}>
      <p className="text-[11px] text-slate-500">Mesmo cadastro, sem sair deste passo. Salve as alterações antes de fechar; não é uma cópia.</p>
    </div>
  </div>;
}
export function flowDestination(tab: string, target = "") {
  if (tab === "precos") return "revisao";
  if (/catalog2-deadline-base|catalog2-delivery-recurrence|charge-summary/.test(target)) return "revisao";
  if (/questionnaire|questionario|sec-var|sec-add|sec-conditions/.test(target)) return "entrega";
  if (tab === "questionario" || tab === "opcoes") return "entrega";
  return tab;
}

/** Registers a visible destination only while its task is open. The source form stays mounted. */
export function ProductFlowTarget({ slot }: { slot: string }) {
  const id = useId();
  const { setTarget, releaseTarget } = useContext(FlowContext);
  useLayoutEffect(() => {
    setTarget(slot, id);
    return () => releaseTarget(slot, id);
  }, [slot, id, setTarget, releaseTarget]);
  return <div className="min-w-0 space-y-2" data-flow-id={id} data-flow-slot={slot} />;
}

/** Moves the same mounted form into its flow slot. No cloned state, handlers or API writes. */
export function ProductFlowField({ slot, children }: { slot: string; children: ReactNode }) {
  const test = useTestProductLayout();
  const { step, workspaces, targets } = useContext(FlowContext);
  const [host] = useState(() => typeof document === "undefined" ? null : document.createElement("div"));
  const [home, setHome] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!test || !host || !home) return;
    let live = true;
    const move = () => {
      if (!live) return;
      const root = home.closest("[data-editor-layout]");
      const destination = workspaces[slot] || targets[slot];
      const target = (destination ? [...document.querySelectorAll("[data-flow-id]")].find(node => node.getAttribute("data-flow-id") === destination) : null) ?? root?.querySelector(`[data-flow-slot="${slot}"]`) ?? home;
      if (host.parentElement !== target && !host.contains(target)) target.appendChild(host);
    };
    move();
    // Nested persistent forms attach after their parent's layout effect. Resolve once
    // more after all layout effects, without detaching children on every step change.
    queueMicrotask(move);
    return () => { live = false; };
  }, [test, host, home, slot, step, workspaces, targets]);
  useEffect(() => () => { host?.remove(); }, [host]);
  if (!test) return <>{children}</>;
  return <><div ref={setHome} />{host && createPortal(children, host)}</>;
}

export function ProductTestNotice() {
  return <div role="note" data-testid="product-test-notice" className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"><FlaskConical className="h-3.5 w-3.5 shrink-0" /><strong>Produto teste · layout alternativo</strong><span>Mesmos dados: salvar altera este produto nos dois layouts.</span></div>;
}

const PANES = [
  ["dados", "Dados da tarefa"], ["etapas", "Etapas e fluxo"],
  ["questionario", "Questionário"], ["entregaveis", "Entregáveis"],
  ["variacoes", "Variações"], ["adicionais", "Adicionais"], ["condicoes", "Prazos e condições"],
] as const;
type Pane = typeof PANES[number][0];
const TaskPaneContext = createContext<{ active: Pane; prefix: string } | null>(null);

/** Presentation only. All panes stay mounted so pending forms retain their existing save/validation hooks. */
export function TaskEditorSurface({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const test = useTestProductLayout();
  const key = useFramedEditorSessionKey("test-task-tab");
  const prefix = useId();
  const [active, setActive] = useState<Pane>(() => {
    const saved = readEditorSession<Pane>(key);
    return PANES.some(([id]) => id === saved) ? saved! : "dados";
  });
  const select = (pane: Pane) => { setActive(pane); writeEditorSession(key, pane); };
  useEffect(() => {
    if (!test) return;
    const steps = () => select("etapas");
    const reveal = (event: Event) => {
      const ids: string[] = (event as CustomEvent).detail?.ids ?? [];
      if (ids.some(id => /sec-var|catalog2-variation/.test(id))) select("variacoes");
      else if (ids.some(id => /sec-add|catalog2-addon/.test(id))) select("adicionais");
      else if (ids.some(id => /sec-conditions|condition|emergency|approval-gate|sla/.test(id))) select("condicoes");
      else if (ids.some(id => /questionnaire|questionario/.test(id))) select("questionario");
      else if (ids.some(id => /deliverable|entregave/.test(id))) select("entregaveis");
      else if (ids.some(id => /step|etapa|effort/.test(id))) select("etapas");
    };
    window.addEventListener(OPEN_STEP_EVENT, steps);
    window.addEventListener("catalog2:reveal", reveal);
    window.addEventListener("catalog2:task-pane-reveal", reveal);
    return () => { window.removeEventListener(OPEN_STEP_EVENT, steps); window.removeEventListener("catalog2:reveal", reveal); window.removeEventListener("catalog2:task-pane-reveal", reveal); };
  }, [test, key]);
  if (!test) return <FramedPanel open onOpenChange={open => { if (!open) onClose(); }} testId="task-panel" title={title}>{children}</FramedPanel>;
  return <TaskPaneContext.Provider value={{ active, prefix }}><section aria-label={title} data-testid="test-task-editor" className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
    <div role="tablist" aria-label="Cadastro da tarefa" className="mb-2 flex flex-wrap gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">{PANES.map(([id, label]) => <button key={id} type="button" role="tab" id={`${prefix}-${id}-tab`} aria-controls={`${prefix}-${id}-panel`} aria-selected={active === id} onClick={() => select(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active === id ? "bg-[image:var(--app-brand-gradient,linear-gradient(90deg,#7c3aed,#c026d3))] text-white" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300"}`}>{label}</button>)}</div>
    {children}
    <TaskEditorPane name="variacoes"><p className="text-[11px] text-slate-500">Escolhas de contratação deste produto, com os mesmos vínculos às tarefas e etapas.</p><ProductFlowTarget slot="product-variations" /></TaskEditorPane>
    <TaskEditorPane name="adicionais"><p className="text-[11px] text-slate-500">Adicionais deste produto. Cada adicional mantém o vínculo configurado com tarefa ou etapa.</p><ProductFlowTarget slot="product-addons" /></TaskEditorPane>
    <TaskEditorPane name="condicoes"><p className="text-[11px] text-slate-500">Condições gerais do produto; regras específicas continuam no cadastro de cada etapa.</p><ProductFlowTarget slot="product-conditions" /></TaskEditorPane>
  </section></TaskPaneContext.Provider>;
}

export function TaskEditorPane({ name, children }: { name: Pane; children: ReactNode }) {
  const context = useContext(TaskPaneContext);
  if (!context) return <>{children}</>;
  return <div role="tabpanel" id={`${context.prefix}-${name}-panel`} aria-labelledby={`${context.prefix}-${name}-tab`} hidden={context.active !== name} className="space-y-2">{children}</div>;
}
