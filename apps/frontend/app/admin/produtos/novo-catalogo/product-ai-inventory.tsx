"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

const Context = createContext({ register: (_id: string, _read: () => Record<string, unknown>, _apply?: (patch: Record<string, unknown>) => void) => () => {}, read: (): Record<string, unknown> => ({}), apply: (_patch: Record<string, unknown>) => {} });
export function ProductAiInputsProvider({ children }: { children: ReactNode }) {
  const sources = useRef(new Map<string, () => Record<string, unknown>>());
  const setters = useRef(new Map<string, (patch: Record<string, unknown>) => void>());
  const registry = useMemo(() => ({
    register(id: string, read: () => Record<string, unknown>, apply?: (patch: Record<string, unknown>) => void) { sources.current.set(id, read); if (apply) setters.current.set(id, apply); return () => { if (sources.current.get(id) === read) { sources.current.delete(id); setters.current.delete(id); } }; },
    read() { return Object.assign({}, ...[...sources.current.values()].map(read => read())); },
    apply(patch: Record<string, unknown>) { for (const apply of setters.current.values()) apply(patch); },
  }), []);
  return <Context.Provider value={registry}>{children}</Context.Provider>;
}
/** Explicit form values only: never inspect the DOM or capture credentials/access data. */
export function useProductAiSource(id: string, fields: Record<string, unknown>, apply?: (patch: Record<string, unknown>) => void) {
  const { register } = useContext(Context);
  const current = useRef(fields); current.current = fields;
  const applyRef = useRef(apply); applyRef.current = apply;
  useEffect(() => register(id, () => current.current, patch => applyRef.current?.(patch)), [id, register]);
}
export function useProductAiInputs() { return useContext(Context); }

export const AI_COMMERCIAL_FIELDS = [
  ["target_audience", "Público-alvo"], ["commercial_objective", "Objetivo / promessa"], ["scope", "Escopo"],
  ["client_info", "Informações do cliente"], ["results_disclaimer", "Aviso de resultados"],
  ["change_policy", "Política de alterações"], ["internal_notes", "Observações internas"],
] as const;
export type AiCommercialKey = typeof AI_COMMERCIAL_FIELDS[number][0];
export const AI_PRODUCT_FIELDS = [
  ["title", "Título comercial"], ["summary", "Descrição curta"], ["full_description", "Descrição completa"],
  ["included_items", "Itens incluídos"], ["excluded_items", "Itens não incluídos"],
  ["client_requirements", "Requisitos do cliente"], ["deliverables_summary", "Resumo comercial dos entregáveis"],
  ...AI_COMMERCIAL_FIELDS,
] as const;
export const CONTEXT_FIELDS = [
  ["pillar", "Pilar"], ["category", "Categoria"], ["four_f", "Classificações 4F"],
  ["audience", "Quem pode ver"], ["agency_levels", "Níveis de agência"], ["modalities", "Modalidades"],
  ["tasks_context", "Tarefas e etapas"],
] as const;
/** Item 1 (31/10): permissões de acesso — a IA LÊ como contexto, mas nunca usa como público-alvo nem altera. */
export const AI_PERMISSION_CONTEXT = ["Quem pode ver", "Níveis de agência"] as const;
export function hasAiInput(value: unknown): boolean {
  return Array.isArray(value) ? value.some(hasAiInput) : typeof value === "string" ? !!value.trim() : value != null && value !== false;
}
const RECEIVER: Record<string, string> = { nomad: "Nômade", leader: "Líder", internal: "Equipe interna" };
/**
 * Item 1 (31/10): contexto das tarefas/etapas para a IA sugerir público-alvo e textos comerciais. Só o que descreve O QUE é feito:
 * nomes, descrições, critério de conclusão, quem recebe a etapa (perfil, não a pessoa) e nomes dos entregáveis.
 * Nunca horas, preços, pessoas, IDs, acessos/credenciais ou regras — a IA não pode inventar nem copiar números.
 */
export function aiTasksContext(version: any) {
  return (version?.tasks ?? []).map((task: any) => ({
    name: task.name,
    ...(task.description ? { description: String(task.description).slice(0, 400) } : {}),
    steps: (task.steps ?? []).map((step: any) => {
      const deliverables = (task.deliverables ?? []).filter((d: any) => d.step_id === step.id).map((d: any) => d.name).filter(Boolean);
      return {
        name: step.name,
        ...(step.description ? { description: String(step.description).slice(0, 300) } : {}),
        ...(step.completion_criteria ? { completion_criteria: String(step.completion_criteria).slice(0, 200) } : {}),
        receiver: RECEIVER[step.executor_kind ?? "nomad"] ?? "Nômade",
        ...(deliverables.length ? { deliverables } : {}),
      };
    }),
  }));
}
export function productAiInventory(values: Record<string, unknown>) {
  return {
    /** Rótulos do CONTEXTO (classificação, permissões, modalidades, tarefas) presentes: mostrados à parte, a IA só lê. */
    contextLabels: CONTEXT_FIELDS.filter(([key]) => hasAiInput(values[key])).map(([, label]) => label),
    filled: [...AI_PRODUCT_FIELDS, ...CONTEXT_FIELDS].filter(([key]) => hasAiInput(values[key])).map(([, label]) => label),
    available: AI_PRODUCT_FIELDS.filter(([key]) => !hasAiInput(values[key])).map(([, label]) => label),
    current: Object.fromEntries(AI_PRODUCT_FIELDS.map(([key]) => {
      const value = values[key];
      return [key, Array.isArray(value) ? value.map(item => typeof item === "string" ? item : String(item?.text ?? "")).filter(Boolean) : value ?? (key.endsWith("_items") || key === "client_requirements" || key === "deliverables_summary" ? [] : "")];
    })),
    context: Object.fromEntries(CONTEXT_FIELDS.filter(([key]) => hasAiInput(values[key])).map(([key]) => [key, values[key]])),
  };
}
