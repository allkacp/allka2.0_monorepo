import { z } from "zod";
import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";

// ─── Schema estruturado da proposta de plano tático (bloco 3/4, ajustado no
// bloco 4/4) ─────────────────────────────────────────────────────────────
// A API NUNCA depende de interpretar Markdown livre — toda saída da IA passa
// por aqui: validação estrutural (zod) + resolução de referências reais.
//
// Ajuste obrigatório do bloco 4: a IA NUNCA sabe o id real de uma
// Specialty/User (ela só vê texto na conversa) — pedir que ela "acerte" um
// id é estruturalmente impossível de fazer com segurança. Por isso a saída
// crua da IA (`RawLaunchTask`) só tem TEXTO livre (`required_specialty`,
// `responsible_name_mentioned`); a RESOLUÇÃO pra um id estável é sempre
// feita aqui, no backend, contra o cadastro real — nunca por correspondência
// "parece parecido": só um match exato (normalizado por caixa/acento) confia
// automaticamente; qualquer outro caso vira `requires_selection: true`,
// preservando a sugestão em texto pra um humano decidir. O plano
// PERSISTIDO (`LaunchTask`, o que fica em `LaunchProposalVersion.structured_json`
// e o que a edição humana envia de volta) só existe nesse formato já
// resolvido — nunca o texto cru da IA sozinho.

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

// ─── Formato CRU da IA (nunca persistido diretamente) ──────────────────────
const rawLaunchTaskSchema = z.object({
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  description: z.string().trim().min(1),
  deliverable: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  suggested_duration_days: z.number().int().positive(),
  required_specialty: z.string().trim().min(1),
  responsible_name_mentioned: optionalNonEmptyString,
  prerequisites: z.array(z.string()).default([]),
  approval_criteria: z.array(z.string().trim().min(1)).min(1),
  references: z.array(z.string()).default([]),
  justification: z.string().trim().min(1),
  open_questions: z.array(z.string()).default([]),
});
export type RawLaunchTask = z.infer<typeof rawLaunchTaskSchema>;

const rawLaunchWaveSchema = z.object({
  name: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  trigger_type: z.enum(LAUNCH_WAVE_TRIGGER_TYPES),
  trigger_date: optionalNonEmptyString,
  trigger_note: optionalNonEmptyString,
  task_titles: z.array(z.string().trim().min(1)).min(1),
});
export type RawLaunchWave = z.infer<typeof rawLaunchWaveSchema>;

const rawLaunchPlanSchema = z.object({
  plan_summary: z.string(),
  plan_duration_months: z.number().int().nullable().optional(),
  plan_duration_days_custom: z.number().int().positive().nullable().optional(),
  waves: z.array(rawLaunchWaveSchema),
  tasks: z.array(rawLaunchTaskSchema),
});
export type RawLaunchPlan = z.infer<typeof rawLaunchPlanSchema>;

export const rawLaunchAIResponseSchema = z.object({
  reply_text: z.string().trim().min(1),
  stage: z.enum(["coletando_informacoes", "proposta_gerada"]),
  pending_questions: z.array(z.string()),
  plan: rawLaunchPlanSchema,
});
export type RawLaunchAIResponse = z.infer<typeof rawLaunchAIResponseSchema>;

// ─── Formato RESOLVIDO/persistido (o que fica salvo e o que a edição humana
// envia de volta) — nunca guarda texto cru da IA como se fosse confirmado.
export const launchTaskSchema = z.object({
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  description: z.string().trim().min(1),
  deliverable: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  suggested_duration_days: z.number().int().positive(),

  // Especialidade: id estável SÓ quando confirmado; senão sugestão em texto
  // + flag pedindo seleção humana. Nunca os dois preenchidos ao mesmo tempo
  // de propósito (ver refine abaixo).
  specialty_id: z.string().trim().min(1).nullable().default(null),
  specialty_suggestion: z.string().trim().min(1).nullable().default(null),
  specialty_requires_selection: z.boolean().default(false),

  // Responsável: mesma lógica — nunca um "quase igual" vira id automático.
  responsible_user_id: z.string().trim().min(1).nullable().default(null),
  responsible_suggestion: z.string().trim().min(1).nullable().default(null),
  responsible_requires_selection: z.boolean().default(false),

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
  plan_summary: z.string(),
  plan_duration_months: z.number().int().nullable().optional(),
  plan_duration_days_custom: z.number().int().positive().nullable().optional(),
  waves: z.array(launchWaveSchema),
  tasks: z.array(launchTaskSchema),
});
export type LaunchPlan = z.infer<typeof launchPlanSchema>;

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
// a outra tarefa do mesmo plano — dependência EFETIVA só existe no bloco 4,
// como `TaskDependency`, criada na materialização) e por isso nunca é
// validado contra `task_titles`: rejeitar um pré-requisito em prosa como
// "referência inexistente" seria um falso positivo constante.
function structuralIssues(payload: { waves: { name: string; task_titles: string[] }[]; tasks: { title: string }[] }): string[] {
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

export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS_RE, "");
}

/**
 * Resolve especialidade/responsável do TEXTO cru da IA pra um id estável —
 * só quando houver exatamente UM match exato (normalizado) no cadastro
 * real. Qualquer ambiguidade, zero match, ou nome não mencionado vira
 * `requires_selection`/sugestão, nunca uma associação automática por
 * "parecido". Responsável só é candidato entre quem tem vínculo real com o
 * projeto (mesma resolução de dono usada em memory-permissions.ts) — nunca
 * qualquer usuário da plataforma com nome parecido.
 */
/**
 * Usuários elegíveis a "responsável" de uma tarefa de um projeto — sempre a
 * Company OU Agência DONA do projeto (nunca a plataforma inteira). Mesma
 * regra de posse usada em `resolveTaskAssignments` (aqui) e em
 * `canEditMemory`'s escopo "project" (memory-permissions.ts) — extraída pra
 * ser reaproveitada por uma rota de leitura (o editor humano do plano
 * precisa da MESMA lista pra oferecer como opções, nunca uma lista
 * diferente que pudesse divergir).
 */
export async function listUsersEligibleForProjectResponsible(
  projectId: string,
  db: DbClient = prisma,
): Promise<{ id: string; name: string }[]> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true, agency_id: true } });
  const ownerCompanyId = project?.company_id ?? project?.client_id ?? null;
  const ownerAgencyId = project?.agency_id ?? null;
  if (ownerCompanyId) return db.user.findMany({ where: { company_id: ownerCompanyId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  if (ownerAgencyId) return db.user.findMany({ where: { agency_id: ownerAgencyId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return [];
}

export async function resolveTaskAssignments(raw: RawLaunchPlan, projectId: string, db: DbClient = prisma): Promise<LaunchPlan> {
  const specialties = await db.specialty.findMany({ where: { is_active: true }, select: { id: true, name: true } });
  const specialtyByNormalizedName = new Map<string, string[]>();
  for (const s of specialties) {
    const key = normalizeForComparison(s.name);
    specialtyByNormalizedName.set(key, [...(specialtyByNormalizedName.get(key) ?? []), s.id]);
  }

  const candidateUsers = await listUsersEligibleForProjectResponsible(projectId, db);
  const userByNormalizedName = new Map<string, string[]>();
  for (const u of candidateUsers) {
    const key = normalizeForComparison(u.name);
    userByNormalizedName.set(key, [...(userByNormalizedName.get(key) ?? []), u.id]);
  }

  const tasks: LaunchTask[] = raw.tasks.map((t) => {
    const specialtyMatches = specialtyByNormalizedName.get(normalizeForComparison(t.required_specialty)) ?? [];
    const specialtyResolved =
      specialtyMatches.length === 1
        ? { specialty_id: specialtyMatches[0], specialty_suggestion: null, specialty_requires_selection: false }
        : { specialty_id: null, specialty_suggestion: t.required_specialty, specialty_requires_selection: true };

    let responsibleResolved: Pick<LaunchTask, "responsible_user_id" | "responsible_suggestion" | "responsible_requires_selection">;
    if (!t.responsible_name_mentioned) {
      // Ninguém foi mencionado — não é um bloqueio, é só "ainda sem
      // responsável", igual a qualquer tarefa nova da plataforma (a
      // atribuição normal por rodízio/seleção acontece depois da liberação).
      responsibleResolved = { responsible_user_id: null, responsible_suggestion: null, responsible_requires_selection: false };
    } else {
      const responsibleMatches = userByNormalizedName.get(normalizeForComparison(t.responsible_name_mentioned)) ?? [];
      responsibleResolved =
        responsibleMatches.length === 1
          ? { responsible_user_id: responsibleMatches[0], responsible_suggestion: null, responsible_requires_selection: false }
          : { responsible_user_id: null, responsible_suggestion: t.responsible_name_mentioned, responsible_requires_selection: true };
    }

    return {
      title: t.title,
      objective: t.objective,
      description: t.description,
      deliverable: t.deliverable,
      steps: t.steps,
      suggested_duration_days: t.suggested_duration_days,
      ...specialtyResolved,
      ...responsibleResolved,
      prerequisites: t.prerequisites,
      approval_criteria: t.approval_criteria,
      references: t.references,
      justification: t.justification,
      open_questions: t.open_questions,
    };
  });

  return {
    plan_summary: raw.plan_summary,
    plan_duration_months: raw.plan_duration_months ?? null,
    plan_duration_days_custom: raw.plan_duration_days_custom ?? null,
    waves: raw.waves,
    tasks,
  };
}

/**
 * Valida a proposta JÁ RESOLVIDA (estrutural + o que ainda for referência
 * real, como onda→tarefa) — usada tanto depois de `resolveTaskAssignments`
 * quanto na edição humana (que envia o plano já no formato resolvido).
 * Nunca revalida especialidade/responsável por texto aqui — isso só existe
 * no formato cru da IA, resolvido uma única vez antes de persistir.
 */
export function validateLaunchPlanStructure(payload: LaunchPlan): void {
  const issues = structuralIssues(payload);
  for (const t of payload.tasks) {
    if (t.specialty_id && t.specialty_suggestion) issues.push(`tarefa "${t.title}": especialidade não pode ter id confirmado E sugestão pendente ao mesmo tempo`);
    if (t.responsible_user_id && t.responsible_suggestion) issues.push(`tarefa "${t.title}": responsável não pode ter id confirmado E sugestão pendente ao mesmo tempo`);
  }
  if (issues.length > 0) throw new LaunchProposalValidationError(issues);
}

/**
 * Valida referências reais do plano JÁ RESOLVIDO (nunca confia que um id
 * enviado por edição humana existe de fato — o formulário pode mandar
 * qualquer coisa). Estruturas inválidas ou referências inexistentes são
 * rejeitadas, nunca aceitas "quase certas".
 */
export async function validateLaunchPlanReferences(payload: LaunchPlan, db: DbClient = prisma): Promise<void> {
  validateLaunchPlanStructure(payload);
  const issues: string[] = [];

  const responsibleIds = [...new Set(payload.tasks.map((t) => t.responsible_user_id).filter((id): id is string => Boolean(id)))];
  if (responsibleIds.length > 0) {
    const found = await db.user.findMany({ where: { id: { in: responsibleIds } }, select: { id: true } });
    const foundIds = new Set(found.map((u) => u.id));
    for (const id of responsibleIds) {
      if (!foundIds.has(id)) issues.push(`responsável referenciado não existe: ${id}`);
    }
  }

  const specialtyIds = [...new Set(payload.tasks.map((t) => t.specialty_id).filter((id): id is string => Boolean(id)))];
  if (specialtyIds.length > 0) {
    const found = await db.specialty.findMany({ where: { id: { in: specialtyIds }, is_active: true }, select: { id: true } });
    const foundIds = new Set(found.map((s) => s.id));
    for (const id of specialtyIds) {
      if (!foundIds.has(id)) issues.push(`especialidade referenciada não existe: ${id}`);
    }
  }

  if (issues.length > 0) throw new LaunchProposalValidationError(issues);
}

/**
 * Acabamento do bloco 4: a correção de especialidade/responsável precisa
 * acontecer no EDITOR, antes da materialização — nunca só depois, como uma
 * tarefa real presa num gatilho pendente. Bloqueia com uma explicação clara
 * (por tarefa e campo) sempre que sobrar qualquer `*_requires_selection` no
 * plano. Responsável "ainda sem responsável" (`responsible_requires_selection:
 * false` com `responsible_user_id: null`) nunca é bloqueado — é um estado
 * legítimo (rodízio normal assume depois). Especialidade é SEMPRE
 * obrigatória (a IA nunca propõe tarefa sem ela), então nunca tem esse
 * mesmo escape.
 */
export function assertLaunchPlanReadyForMaterialization(payload: LaunchPlan): void {
  const issues: string[] = [];
  for (const t of payload.tasks) {
    if (t.specialty_requires_selection || !t.specialty_id) {
      issues.push(`tarefa "${t.title}": escolha uma especialidade real antes de materializar (sugestão da IA: "${t.specialty_suggestion ?? "—"}")`);
    }
    if (t.responsible_requires_selection) {
      issues.push(`tarefa "${t.title}": escolha um responsável real ou aguarde atribuição normal — o nome mencionado ("${t.responsible_suggestion ?? "—"}") não corresponde a ninguém com vínculo real no projeto`);
    }
  }
  if (issues.length > 0) throw new LaunchProposalValidationError(issues);
}

/** Faz o parse + validação estrutural (zod) da resposta CRUA da IA. Nunca
 * lança se o JSON.parse falhar silenciosamente — sempre um erro claro. */
export function parseLaunchAIResponse(rawJson: string): RawLaunchAIResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new LaunchProposalValidationError(["a resposta da IA não é um JSON válido"]);
  }
  const result = rawLaunchAIResponseSchema.safeParse(parsed);
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
