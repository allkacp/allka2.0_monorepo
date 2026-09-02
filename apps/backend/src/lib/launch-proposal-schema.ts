import { z } from "zod";
import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";

// ─── Schema estruturado da proposta de plano tático (bloco 3/4) ────────────
// A API NUNCA depende de interpretar Markdown livre — toda saída da IA passa
// por aqui: validação estrutural (zod) + validação referencial (specialty e
// responsável precisam existir de verdade). Estruturas inválidas ou
// referências inexistentes são rejeitadas, nunca aceitas "quase certas".

export const LAUNCH_WAVE_TRIGGER_TYPES = [
  "data",
  "aprovacao_tarefa_anterior",
  "pagamento_nova_etapa",
  "aprovacao_manual_gestor",
] as const;

// A saída estruturada do Gemini preenche todo campo declarado no schema,
// mesmo os NÃO obrigatórios — "ausente" vem como string vazia (""), nunca
// como o campo de fato faltando. Normaliza pra null antes de validar, senão
// "responsável apenas quando houver informação válida" rejeitaria toda
// proposta legítima que corretamente não tem responsável ainda.
const optionalNonEmptyString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : null));

export const launchTaskSchema = z.object({
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  description: z.string().trim().min(1),
  deliverable: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  suggested_duration_days: z.number().int().positive(),
  required_specialty: z.string().trim().min(1),
  responsible_user_id: optionalNonEmptyString,
  prerequisites: z.array(z.string()).default([]),
  approval_criteria: z.array(z.string().trim().min(1)).min(1),
  references: z.array(z.string()).default([]),
  justification: z.string().trim().min(1),
  open_questions: z.array(z.string()).default([]),
});
export type LaunchTask = z.infer<typeof launchTaskSchema>;

export const launchWaveSchema = z.object({
  name: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  trigger_type: z.enum(LAUNCH_WAVE_TRIGGER_TYPES),
  trigger_date: optionalNonEmptyString,
  trigger_note: optionalNonEmptyString,
  task_titles: z.array(z.string().trim().min(1)).min(1),
});
export type LaunchWave = z.infer<typeof launchWaveSchema>;

export const launchPlanSchema = z.object({
  // Vazio é uma resposta HONESTA e esperada enquanto stage ainda for
  // "coletando_informacoes" (a IA corretamente não inventa um resumo de
  // plano que não pode montar ainda) — a obrigatoriedade real de conteúdo
  // é verificada depois, condicionada ao stage (ver parseLaunchAIResponse).
  plan_summary: z.string(),
  plan_duration_months: z.number().int().nullable().optional(),
  plan_duration_days_custom: z.number().int().positive().nullable().optional(),
  waves: z.array(launchWaveSchema),
  tasks: z.array(launchTaskSchema),
});
export type LaunchPlan = z.infer<typeof launchPlanSchema>;

export const launchAIResponseSchema = z.object({
  reply_text: z.string().trim().min(1),
  stage: z.enum(["coletando_informacoes", "proposta_gerada"]),
  pending_questions: z.array(z.string()),
  plan: launchPlanSchema,
});
export type LaunchAIResponsePayload = z.infer<typeof launchAIResponseSchema>;

export class LaunchProposalValidationError extends Error {
  httpStatus = 422;
  code = "launch_proposal_invalid";
  issues: string[];
  constructor(issues: string[]) {
    super(`Proposta de plano tático inválida: ${issues.join("; ")}`);
    this.issues = issues;
  }
}

// `prerequisites` é sempre texto livre (nem toda dependência vira referência
// a outra tarefa do mesmo plano — dependência EFETIVA só existe no bloco 4)
// e por isso nunca é validado contra `task_titles`: rejeitar um
// pré-requisito em prosa como "referência inexistente" seria um falso
// positivo constante.
function structuralIssues(payload: LaunchPlan): string[] {
  const issues: string[] = [];
  const taskTitles = new Set(payload.tasks.map((t) => t.title));
  for (const wave of payload.waves) {
    for (const title of wave.task_titles) {
      if (!taskTitles.has(title)) issues.push(`onda "${wave.name}" referencia a tarefa inexistente "${title}"`);
    }
  }
  return issues;
}

const COMBINING_DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS_RE, "");
}

/**
 * Valida referências reais (nunca confia que a IA citou um id/nome que
 * existe de fato) — mesma ideia de `validateProposal` do IALLKA, mas aqui a
 * API REJEITA a proposta inteira em vez de descartar item por item: um
 * plano ainda não foi aprovado por ninguém, então "quase certo" não é
 * aceitável — force uma nova geração/edição em vez de aceitar referência
 * quebrada.
 */
export async function validateLaunchPlanReferences(payload: LaunchPlan, db: DbClient = prisma): Promise<void> {
  const issues = structuralIssues(payload);

  const responsibleIds = [...new Set(payload.tasks.map((t) => t.responsible_user_id).filter((id): id is string => Boolean(id)))];
  if (responsibleIds.length > 0) {
    const found = await db.user.findMany({ where: { id: { in: responsibleIds } }, select: { id: true } });
    const foundIds = new Set(found.map((u) => u.id));
    for (const id of responsibleIds) {
      if (!foundIds.has(id)) issues.push(`responsável referenciado não existe: ${id}`);
    }
  }

  // Compara ignorando maiúsculas/minúsculas E acentos — a IA varia a grafia
  // entre gerações ("Tráfego Pago" / "trafego pago" / "Especialista em
  // Tráfego Pago"); exigir bytes idênticos rejeitaria propostas legítimas
  // por diferença puramente ortográfica, sem ganho real de segurança (isto
  // não é uma checagem de autorização, é só "esse nome existe no cadastro").
  const specialtyNames = [...new Set(payload.tasks.map((t) => normalizeForComparison(t.required_specialty)).filter(Boolean))];
  if (specialtyNames.length > 0) {
    const specialties = await db.specialty.findMany({ where: { is_active: true }, select: { name: true } });
    const known = new Set(specialties.map((s) => normalizeForComparison(s.name)));
    for (const name of specialtyNames) {
      if (!known.has(name)) issues.push(`especialidade referenciada não existe: "${name}"`);
    }
  }

  if (issues.length > 0) throw new LaunchProposalValidationError(issues);
}

/** Faz o parse + validação estrutural (zod) da resposta bruta da IA. Nunca
 * lança se o JSON.parse falhar silenciosamente — sempre um erro claro. */
export function parseLaunchAIResponse(rawJson: string): LaunchAIResponsePayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new LaunchProposalValidationError(["a resposta da IA não é um JSON válido"]);
  }
  const result = launchAIResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new LaunchProposalValidationError(result.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`));
  }
  const payload = result.data;
  if (payload.stage === "proposta_gerada") {
    if (payload.plan.tasks.length === 0) {
      throw new LaunchProposalValidationError(["stage é \"proposta_gerada\" mas nenhuma tarefa foi proposta"]);
    }
    if (!payload.plan.plan_summary.trim()) {
      throw new LaunchProposalValidationError(["stage é \"proposta_gerada\" mas plan_summary está vazio"]);
    }
  }
  return payload;
}
