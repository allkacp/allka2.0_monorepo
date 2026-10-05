// IA nas tarefas (Pedido 3, fase 5) — vocabulário e cópia da configuração.
import type { Prisma } from "@prisma/client";

/** autonoma: a IA executa e conclui a etapa sozinha · rascunho: a IA escreve e um humano adota/edita · auxilia: o humano executa e a IA só sugere. */
export const AI_MODES = ["autonoma", "rascunho", "auxilia"] as const;
export type AIMode = (typeof AI_MODES)[number];
export const AI_MODE_LABEL: Record<AIMode, string> = {
  autonoma: "Executa sozinha (passa por revisão humana)",
  rascunho: "Gera rascunho para um humano adotar",
  auxilia: "Auxilia o humano (só sugere)",
};
export const AI_ACTORS = ["leader", "executor"] as const;
/** Quando a IA roda: manual (padrão) · automatica (sozinha, depois de todos os pré-requisitos) · so_rascunho (nunca conclui nada: sempre devolve rascunho para um humano). */
export const AI_TRIGGERS = ["manual", "automatica", "so_rascunho"] as const;
export type AITrigger = (typeof AI_TRIGGERS)[number];
export const AI_TRIGGER_LABEL: Record<AITrigger, string> = { manual: "Manual (alguém aciona)", automatica: "Automática após todos os pré-requisitos", so_rascunho: "Apenas rascunho" };
export const AI_EXECUTION_MODES = ["ia", "hibrido"];

/** Campos de IA que acompanham a tarefa ao clonar/duplicar/importar. */
export function aiCopyData(ai: {
  provider: string | null; model: string | null; est_input_tokens: number | null; est_output_tokens: number | null;
  unit_cost_input_per_1k: number | null; unit_cost_output_per_1k: number | null; currency: string; est_review_rounds: number | null; est_runs?: number | null;
  cost_note: string | null; human_review_required: boolean; profile_id: string | null; ai_mode: string; ai_trigger: string; instructions: string | null; prompt_version: number;
}): Omit<Prisma.Catalog2TaskAIUncheckedCreateInput, "task_id"> {
  return {
    provider: ai.provider, model: ai.model, est_input_tokens: ai.est_input_tokens, est_output_tokens: ai.est_output_tokens,
    unit_cost_input_per_1k: ai.unit_cost_input_per_1k, unit_cost_output_per_1k: ai.unit_cost_output_per_1k, currency: ai.currency,
    est_review_rounds: ai.est_review_rounds, est_runs: ai.est_runs ?? null, cost_note: ai.cost_note, human_review_required: ai.human_review_required,
    profile_id: ai.profile_id, ai_mode: ai.ai_mode, ai_trigger: ai.ai_trigger, instructions: ai.instructions, prompt_version: ai.prompt_version,
  };
}

/** Custo de UMA execução: tokens × preço do perfil + custo fixo. Nulo quando o perfil não tem preço definido. */
export function runCost(profile: { unit_cost_input_per_1k: number | null; unit_cost_output_per_1k: number | null; fixed_cost_per_run: number; unit_tokens?: number | null }, promptTokens: number, completionTokens: number): number | null {
  if (profile.unit_cost_input_per_1k == null && profile.unit_cost_output_per_1k == null && !profile.fixed_cost_per_run) return null;
  const unit = Math.max(1, profile.unit_tokens ?? 1000);
  const c = (promptTokens / unit) * (profile.unit_cost_input_per_1k ?? 0) + (completionTokens / unit) * (profile.unit_cost_output_per_1k ?? 0) + (profile.fixed_cost_per_run ?? 0);
  return Math.round(c * 1_000_000) / 1_000_000;
}
