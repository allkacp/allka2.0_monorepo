/**
 * alert-engine.ts — Padrão → Regra geral → Verificação automática → Ocorrências
 * individuais por destinatário.
 *
 * Reparo conceitual (ata 2026-08, 3º lote) sobre o motor do 2º lote: a regra
 * continua ÚNICA e GERAL — nunca uma regra por tarefa/etapa/produto. O que
 * mudou é que cada regra passou a ter uma lista configurável de CATEGORIAS de
 * destinatário (papéis/relações — nunca pessoas escolhidas a dedo, isso é
 * exclusivo do Alerta Avulso), e o motor agora também avalia `ProjectTaskStage`
 * (etapas reais), não só `ProjectTask`. Uma única execução de uma regra geral
 * pode gerar VÁRIAS ocorrências — uma por destinatário elegível — nunca uma
 * ocorrência única compartilhada.
 *
 * A ocorrência continua sendo um `SystemAlert` comum — não existe tabela
 * paralela; `standard_id`/`rule_id`/`dedupe_key` só marcam de onde ela veio.
 *
 * Reaproveita a infraestrutura que já existia: `writeAccessAudit` para
 * auditoria, e o mesmo padrão de "registrar cron em src/index.ts, nunca em
 * módulo importado pelos testes" já usado pela sincronização diária do Meta
 * Ads (ver index.ts) — este arquivo nunca importa `cron` nem inicia timers
 * sozinho; quem liga o motor é o index.ts.
 */
import { prisma } from "./prisma";
import { writeAccessAudit } from "./product-feedback-service";
import { isEligibleAdminResponsible } from "./admin-responsible";

export const STANDARD_KEYS = {
  DUE_SOON: "task.due_soon",
  OVERDUE: "task.overdue",
  STAGE_DUE_SOON: "stage.due_soon",
  STAGE_OVERDUE: "stage.overdue",
} as const;

export const TRIGGER_TYPES = [
  STANDARD_KEYS.DUE_SOON,
  STANDARD_KEYS.OVERDUE,
  STANDARD_KEYS.STAGE_DUE_SOON,
  STANDARD_KEYS.STAGE_OVERDUE,
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export type EntityType = "project_task" | "project_task_stage";

// Cada gatilho avalia exatamente um tipo de entidade — é isto que torna a
// regra "geral": ela nunca aponta pra um registro específico, só pro TIPO.
export const TRIGGER_ENTITY_TYPE: Record<string, EntityType> = {
  [STANDARD_KEYS.DUE_SOON]: "project_task",
  [STANDARD_KEYS.OVERDUE]: "project_task",
  [STANDARD_KEYS.STAGE_DUE_SOON]: "project_task_stage",
  [STANDARD_KEYS.STAGE_OVERDUE]: "project_task_stage",
};

export function isDueSoonTrigger(triggerType: string): boolean {
  return triggerType === STANDARD_KEYS.DUE_SOON || triggerType === STANDARD_KEYS.STAGE_DUE_SOON;
}

// Conjunto fechado — nunca JSON livre nem código. Cada padrão só aceita as
// variáveis desta lista dentro de {{...}} na mensagem.
export const ALLOWED_VARIABLES: Record<string, string[]> = {
  [STANDARD_KEYS.DUE_SOON]: ["tarefa", "prazo", "projeto"],
  [STANDARD_KEYS.OVERDUE]: ["tarefa", "prazo", "projeto"],
  [STANDARD_KEYS.STAGE_DUE_SOON]: ["etapa", "tarefa", "prazo", "projeto"],
  [STANDARD_KEYS.STAGE_OVERDUE]: ["etapa", "tarefa", "prazo", "projeto"],
};

// ── Categorias de destinatário ───────────────────────────────────────────
// Papéis/relações, nunca pessoas — a regra escolhe QUAIS categorias
// participam; o motor resolve a pessoa real de cada categoria pra cada
// registro elegível, a cada execução. "admin_responsavel" resolve via
// Project.admin_responsible_user_id (ata 2026-08, reparo "categoria sem
// efeito") — escolhido explicitamente no projeto pelo Admin Master/Admin,
// nunca inferido do dono da Company/Agency nem de qualquer Admin global.
// Projeto sem Admin responsável definido (ou apontando pra alguém que
// deixou de ser Admin ativo) continua resolvendo vazio — conta a lacuna em
// `skippedNoAdminResponsavel`, nunca escolhe substituto ("todos os
// administradores" nunca é o comportamento).
export const RECIPIENT_CATEGORIES = ["responsavel", "nomade", "lider", "admin_responsavel"] as const;
export type RecipientCategory = (typeof RECIPIENT_CATEGORIES)[number];

export const RECIPIENT_CATEGORY_LABELS: Record<RecipientCategory, string> = {
  responsavel: "Responsável",
  nomade: "Nômade executor",
  lider: "Líder",
  admin_responsavel: "Admin responsável",
};

export function parseRecipientRoles(raw: string): RecipientCategory[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every((v) => (RECIPIENT_CATEGORIES as readonly string[]).includes(v))) return null;
    return [...new Set(parsed)] as RecipientCategory[];
  } catch {
    return null;
  }
}

// Tarefas nestes estados nunca disparam nem mantêm alerta automático ativo.
const TERMINAL_TASK_STATUSES = ["CONCLUIDA", "CANCELADA"];
// Etapas concluídas encerram; BLOQUEADA significa "aguardando a etapa
// anterior" — ainda não abriu de verdade, então não é elegível pra alerta de
// prazo (auditado: nenhum código hoje seta BLOQUEADA em produção, mas o
// estado existe na modelagem e é tratado aqui por segurança).
const TERMINAL_STAGE_STATUSES = ["CONCLUIDA", "BLOQUEADA"];

const DEFAULT_LEAD_TIME_MINUTES = 24 * 60;

/** Substitui só variáveis da allowlist — nunca avalia código. */
export function renderTemplate(template: string, vars: Record<string, string>, allowed: string[]): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    if (!allowed.includes(name)) return match;
    return vars[name] ?? match;
  });
}

export function validateAllowedVariablesJson(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Nenhuma variável fora da lista fechada pode aparecer em título/mensagem. */
export function findUnknownVariables(text: string, allowed: string[]): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const name = match[1];
    if (name && !allowed.includes(name)) found.add(name);
  }
  return [...found];
}

// ── Bootstrap idempotente ────────────────────────────────────────────────

/**
 * Cria os quatro padrões/regras obrigatórios se ainda não existirem — SEMPRE
 * únicos e gerais (nunca um por tarefa/etapa). Chamado no boot (dev e
 * produção — mesmo padrão de ensureDefaultKnowledgeCategories/
 * ensureDefaultAIServices em index.ts), sempre por `key` estável, então
 * rodar de novo nunca duplica.
 */
export async function ensureDefaultAlertStandardsAndRules(): Promise<void> {
  const defaults: Array<{
    key: string;
    name: string;
    title: string;
    message: string;
    default_severity: string;
    ruleName: string;
    lead_time_minutes: number | null;
    recipientRoles: RecipientCategory[];
  }> = [
    {
      key: STANDARD_KEYS.DUE_SOON,
      name: "Tarefa próxima do prazo",
      title: "Tarefa próxima do prazo",
      message: 'A tarefa "{{tarefa}}" do projeto "{{projeto}}" vence em {{prazo}}.',
      default_severity: "warning",
      ruleName: "Tarefa próxima do prazo (regra geral)",
      lead_time_minutes: DEFAULT_LEAD_TIME_MINUTES,
      recipientRoles: ["responsavel"],
    },
    {
      key: STANDARD_KEYS.OVERDUE,
      name: "Tarefa atrasada",
      title: "Tarefa atrasada",
      message: 'A tarefa "{{tarefa}}" do projeto "{{projeto}}" está atrasada. Prazo era {{prazo}}.',
      default_severity: "error",
      ruleName: "Tarefa atrasada (regra geral)",
      lead_time_minutes: null,
      recipientRoles: ["responsavel", "admin_responsavel"],
    },
    {
      key: STANDARD_KEYS.STAGE_DUE_SOON,
      name: "Etapa próxima do prazo",
      title: "Etapa próxima do prazo",
      message: 'A etapa "{{etapa}}" da tarefa "{{tarefa}}" ({{projeto}}) vence em {{prazo}}.',
      default_severity: "warning",
      ruleName: "Etapa próxima do prazo (regra geral)",
      lead_time_minutes: DEFAULT_LEAD_TIME_MINUTES,
      recipientRoles: ["nomade", "lider"],
    },
    {
      key: STANDARD_KEYS.STAGE_OVERDUE,
      name: "Etapa atrasada",
      title: "Etapa atrasada",
      message: 'A etapa "{{etapa}}" da tarefa "{{tarefa}}" ({{projeto}}) está atrasada. Prazo era {{prazo}}.',
      default_severity: "error",
      ruleName: "Etapa atrasada (regra geral)",
      lead_time_minutes: null,
      recipientRoles: ["nomade", "lider", "admin_responsavel"],
    },
  ];

  for (const def of defaults) {
    let standard;
    try {
      standard = await prisma.alertStandard.upsert({
        where: { key: def.key },
        update: {},
        create: {
          key: def.key,
          name: def.name,
          title: def.title,
          message: def.message,
          default_severity: def.default_severity,
          is_active: true,
          is_system: true,
          allowed_variables_json: JSON.stringify(ALLOWED_VARIABLES[def.key]),
        },
      });
    } catch (err) {
      // Duas instâncias/processos rodando o bootstrap ao mesmo tempo podem
      // colidir na criação (a `key` é única) — não é duplicidade real, é
      // corrida: quem perdeu só busca o que a outra instância acabou de
      // criar.
      if (!isUniqueConstraintError(err)) throw err;
      standard = await prisma.alertStandard.findUniqueOrThrow({ where: { key: def.key } });
    }

    const existingRule = await prisma.alertRule.findFirst({
      where: { standard_id: standard.id, trigger_type: def.key },
    });
    if (!existingRule) {
      try {
        await prisma.alertRule.create({
          data: {
            standard_id: standard.id,
            name: def.ruleName,
            trigger_type: def.key,
            is_active: true,
            lead_time_minutes: def.lead_time_minutes,
            recipient_roles_json: JSON.stringify(def.recipientRoles),
          },
        });
      } catch (err) {
        // Mesma corrida do standard acima, agora pra regra — a regra não
        // tem constraint único próprio (não é necessário: o próprio
        // findFirst acima é a checagem de idempotência), então só ignora se
        // uma segunda checagem confirmar que já existe.
        if (!isUniqueConstraintError(err)) {
          const raced = await prisma.alertRule.findFirst({ where: { standard_id: standard.id, trigger_type: def.key } });
          if (!raced) throw err;
        }
      }
    }
  }

  await ensureAdminResponsavelOnOverdueRules();
}

/**
 * Repara regras de atraso já existentes (do 2º/3º lote, criadas antes da
 * categoria "admin_responsavel" resolver alguém de verdade — ver
 * Project.admin_responsible_user_id) pra incluir essa categoria — sem
 * jamais duplicar nem remover categorias que o Admin Master já tenha
 * configurado. Roda a cada boot; idempotente (add-if-missing).
 */
async function ensureAdminResponsavelOnOverdueRules(): Promise<void> {
  const overdueRules = await prisma.alertRule.findMany({
    where: { trigger_type: { in: [STANDARD_KEYS.OVERDUE, STANDARD_KEYS.STAGE_OVERDUE] } },
  });
  for (const rule of overdueRules) {
    const categories = parseRecipientRoles(rule.recipient_roles_json) ?? [];
    if (categories.includes("admin_responsavel")) continue;
    await prisma.alertRule.update({
      where: { id: rule.id },
      data: { recipient_roles_json: JSON.stringify([...categories, "admin_responsavel"]) },
    });
  }
}

// ── Resolução de destinatários ───────────────────────────────────────────
// Uma regra geral nunca aponta pra uma pessoa — ela escolhe categorias
// (papéis/relações). O motor resolve a pessoa real de cada categoria pra
// CADA registro elegível, a cada execução. O mesmo padrão de "existir de
// verdade e estar ativo" de sempre; sem isso, não inventa destinatário.

async function userIsActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } });
  return !!user?.is_active;
}

async function resolveNomadeUser(nomadeId: string | null): Promise<string | null> {
  if (!nomadeId) return null;
  const nomade = await prisma.nomade.findUnique({ where: { id: nomadeId }, select: { user_id: true } });
  if (!nomade?.user_id) return null;
  return (await userIsActive(nomade.user_id)) ? nomade.user_id : null;
}

async function resolveDirectUser(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  return (await userIsActive(userId)) ? userId : null;
}

type TaskRecipientFields = {
  nomade_responsavel_id: string | null;
  lider_responsavel_id: string | null;
  responsavel_agencia_id: string | null;
  assignee_id: string | null;
  project: { admin_responsible_user_id: string | null } | null;
};

type StageRecipientFields = {
  nomade_id: string | null;
  lider_id: string | null;
  project_task: { project: { admin_responsible_user_id: string | null } | null } | null;
};

/**
 * "Admin responsável" — herda de `Project.admin_responsible_user_id`, nunca
 * de tarefa/etapa individual (ata 2026-08: "Não crie um Admin diferente
 * para cada tarefa ou etapa"). Revalida no momento da resolução (não confia
 * só no valor gravado no projeto) — se o Admin foi desativado ou deixou de
 * ser Admin desde a atribuição, resolve vazio em vez de enviar pra quem não
 * é mais elegível.
 */
async function resolveAdminResponsavel(projectAdminResponsibleId: string | null): Promise<string | null> {
  if (!projectAdminResponsibleId) return null;
  const eligible = await isEligibleAdminResponsible(projectAdminResponsibleId);
  return eligible ? projectAdminResponsibleId : null;
}

/**
 * "Responsável" da tarefa — prioridade: nômade responsável (resolvido via
 * Nomade.user_id) → líder responsável → responsável da agência → assignee
 * genérico. O primeiro que existir de verdade (usuário ativo) é o
 * destinatário. Preserva EXATAMENTE o comportamento do 2º lote — a categoria
 * "responsavel" das regras de tarefa é esta mesma cadeia.
 */
export async function resolveTaskResponsavel(task: TaskRecipientFields): Promise<string | null> {
  const viaNomade = await resolveNomadeUser(task.nomade_responsavel_id);
  if (viaNomade) return viaNomade;
  for (const candidate of [task.lider_responsavel_id, task.responsavel_agencia_id, task.assignee_id]) {
    const resolved = await resolveDirectUser(candidate);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * "Responsável" da etapa — quem está executando de fato: nômade da etapa,
 * senão o líder da etapa. Não existe assignee/agência no nível de etapa no
 * modelo atual (auditado antes de implementar).
 */
async function resolveStageResponsavel(stage: StageRecipientFields): Promise<string | null> {
  const viaNomade = await resolveNomadeUser(stage.nomade_id);
  if (viaNomade) return viaNomade;
  return resolveDirectUser(stage.lider_id);
}

async function resolveCategoryForTask(category: RecipientCategory, task: TaskRecipientFields): Promise<string | null> {
  switch (category) {
    case "responsavel":
      return resolveTaskResponsavel(task);
    case "nomade":
      return resolveNomadeUser(task.nomade_responsavel_id);
    case "lider":
      return resolveDirectUser(task.lider_responsavel_id);
    case "admin_responsavel":
      return resolveAdminResponsavel(task.project?.admin_responsible_user_id ?? null);
  }
}

async function resolveCategoryForStage(category: RecipientCategory, stage: StageRecipientFields): Promise<string | null> {
  switch (category) {
    case "responsavel":
      return resolveStageResponsavel(stage);
    case "nomade":
      return resolveNomadeUser(stage.nomade_id);
    case "lider":
      return resolveDirectUser(stage.lider_id);
    case "admin_responsavel":
      return resolveAdminResponsavel(stage.project_task?.project?.admin_responsible_user_id ?? null);
  }
}

/**
 * Resolve todas as categorias da regra pra um registro elegível e retorna os
 * usuários únicos (a mesma pessoa nunca recebe duas ocorrências da mesma
 * verificação só por aparecer em duas categorias). Cada usuário resolvido
 * ainda recebe sua PRÓPRIA ocorrência — nunca uma compartilhada.
 */
async function resolveRuleRecipients(
  rule: { recipient_roles_json: string },
  entityType: EntityType,
  entity: TaskRecipientFields | StageRecipientFields,
  result: AlertEngineRunResult,
): Promise<string[]> {
  const categories = parseRecipientRoles(rule.recipient_roles_json) ?? [];
  const resolved = new Set<string>();
  let requestedAdminResponsavel = false;
  for (const category of categories) {
    if (category === "admin_responsavel") requestedAdminResponsavel = true;
    const userId =
      entityType === "project_task"
        ? await resolveCategoryForTask(category, entity as TaskRecipientFields)
        : await resolveCategoryForStage(category, entity as StageRecipientFields);
    if (userId) resolved.add(userId);
  }
  if (requestedAdminResponsavel) result.skippedNoAdminResponsavel++;
  return [...resolved];
}

// ── Execução ──────────────────────────────────────────────────────────────

function formatPrazo(due: Date): string {
  return due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dedupeCycleKey(due: Date): string {
  return due.toISOString().slice(0, 10);
}

export interface AlertEngineRunResult {
  created: number;
  resolved: number;
  skippedNoResponsavel: number;
  skippedNoAdminResponsavel: number;
  errors: number;
}

/**
 * Um ciclo completo: cria ocorrências (uma por destinatário elegível) pras
 * tarefas/etapas que entraram na janela de cada regra geral ativa, e encerra
 * ocorrências automáticas cuja condição — ou destinatário — deixou de valer.
 * Nunca lança — cada registro é isolado em try/catch pra uma falha pontual
 * não travar o lote inteiro.
 */
export async function runAlertEngineOnce(): Promise<AlertEngineRunResult> {
  const result: AlertEngineRunResult = {
    created: 0,
    resolved: 0,
    skippedNoResponsavel: 0,
    skippedNoAdminResponsavel: 0,
    errors: 0,
  };
  const now = new Date();

  const rules = await prisma.alertRule.findMany({
    where: { is_active: true, standard: { is_active: true } },
    include: { standard: true },
  });

  const dueSoonTaskRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.DUE_SOON);
  const overdueTaskRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.OVERDUE);
  const dueSoonStageRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.STAGE_DUE_SOON);
  const overdueStageRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.STAGE_OVERDUE);

  await processTasks(dueSoonTaskRule, overdueTaskRule, now, result);
  await processStages(dueSoonStageRule, overdueStageRule, now, result);
  await resolveStaleOccurrences(
    { dueSoonTaskRule, overdueTaskRule, dueSoonStageRule, overdueStageRule },
    now,
    result,
  );

  return result;
}

const TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  due_date: true,
  project_id: true,
  nomade_responsavel_id: true,
  lider_responsavel_id: true,
  responsavel_agencia_id: true,
  assignee_id: true,
  project: { select: { title: true, admin_responsible_user_id: true } },
} as const;

async function processTasks(
  dueSoonRule: RuleWithStandard | undefined,
  overdueRule: RuleWithStandard | undefined,
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  if (!dueSoonRule && !overdueRule) return;

  const tasks = await prisma.projectTask.findMany({
    where: { due_date: { not: null }, status: { notIn: TERMINAL_TASK_STATUSES } },
    select: TASK_SELECT,
  });

  for (const task of tasks) {
    try {
      if (!task.due_date) continue;
      const isOverdue = task.due_date.getTime() <= now.getTime();
      const vars = { tarefa: task.title, prazo: formatPrazo(task.due_date), projeto: task.project?.title ?? "—" };

      if (isOverdue && overdueRule) {
        const recipients = await resolveRuleRecipients(overdueRule, "project_task", task, result);
        if (recipients.length === 0) result.skippedNoResponsavel++;
        for (const userId of recipients) {
          const created = await createOccurrenceIfNeeded(overdueRule, "project_task", task.id, userId, vars, task.due_date, result);
          if (created) {
            await resolveMatchingOccurrences({
              entityType: "project_task",
              entityId: task.id,
              userId,
              standardKey: STANDARD_KEYS.DUE_SOON,
              reason: "superseded",
              result,
            });
          }
        }
      } else if (!isOverdue && dueSoonRule) {
        const leadMs = (dueSoonRule.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
        const withinWindow = task.due_date.getTime() - now.getTime() <= leadMs;
        if (withinWindow) {
          const recipients = await resolveRuleRecipients(dueSoonRule, "project_task", task, result);
          if (recipients.length === 0) result.skippedNoResponsavel++;
          for (const userId of recipients) {
            await createOccurrenceIfNeeded(dueSoonRule, "project_task", task.id, userId, vars, task.due_date, result);
          }
        }
      }
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao processar tarefa ${task.id}:`, err);
    }
  }
}

const STAGE_SELECT = {
  id: true,
  titulo: true,
  status: true,
  prazo_execucao: true,
  nomade_id: true,
  lider_id: true,
  project_task: { select: { title: true, project: { select: { title: true, admin_responsible_user_id: true } } } },
} as const;

async function processStages(
  dueSoonRule: RuleWithStandard | undefined,
  overdueRule: RuleWithStandard | undefined,
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  if (!dueSoonRule && !overdueRule) return;

  const stages = await prisma.projectTaskStage.findMany({
    where: { prazo_execucao: { not: null }, status: { notIn: TERMINAL_STAGE_STATUSES } },
    select: STAGE_SELECT,
  });

  for (const stage of stages) {
    try {
      if (!stage.prazo_execucao) continue;
      const isOverdue = stage.prazo_execucao.getTime() <= now.getTime();
      const vars = {
        etapa: stage.titulo,
        tarefa: stage.project_task?.title ?? "—",
        prazo: formatPrazo(stage.prazo_execucao),
        projeto: stage.project_task?.project?.title ?? "—",
      };

      if (isOverdue && overdueRule) {
        const recipients = await resolveRuleRecipients(overdueRule, "project_task_stage", stage, result);
        if (recipients.length === 0) result.skippedNoResponsavel++;
        for (const userId of recipients) {
          const created = await createOccurrenceIfNeeded(
            overdueRule,
            "project_task_stage",
            stage.id,
            userId,
            vars,
            stage.prazo_execucao,
            result,
          );
          if (created) {
            await resolveMatchingOccurrences({
              entityType: "project_task_stage",
              entityId: stage.id,
              userId,
              standardKey: STANDARD_KEYS.STAGE_DUE_SOON,
              reason: "superseded",
              result,
            });
          }
        }
      } else if (!isOverdue && dueSoonRule) {
        const leadMs = (dueSoonRule.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
        const withinWindow = stage.prazo_execucao.getTime() - now.getTime() <= leadMs;
        if (withinWindow) {
          const recipients = await resolveRuleRecipients(dueSoonRule, "project_task_stage", stage, result);
          if (recipients.length === 0) result.skippedNoResponsavel++;
          for (const userId of recipients) {
            await createOccurrenceIfNeeded(dueSoonRule, "project_task_stage", stage.id, userId, vars, stage.prazo_execucao, result);
          }
        }
      }
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao processar etapa ${stage.id}:`, err);
    }
  }
}

type RuleWithStandard = {
  id: string;
  trigger_type: string;
  severity_override: string | null;
  lead_time_minutes: number | null;
  is_active: boolean;
  recipient_roles_json: string;
  standard: { id: string; key: string; title: string; message: string; default_severity: string };
};

async function createOccurrenceIfNeeded(
  rule: RuleWithStandard,
  entityType: EntityType,
  entityId: string,
  userId: string,
  vars: Record<string, string>,
  dueDate: Date,
  result: AlertEngineRunResult,
): Promise<boolean> {
  const dedupeKey = `${rule.id}:${entityType}:${entityId}:${userId}:${dedupeCycleKey(dueDate)}`;

  const existing = await prisma.systemAlert.findFirst({
    where: { dedupe_key: dedupeKey, resolved_at: null },
    select: { id: true },
  });
  if (existing) return false; // segunda execução não duplica

  const allowed = ALLOWED_VARIABLES[rule.standard.key] ?? [];
  const title = renderTemplate(rule.standard.title, vars, allowed);
  const message = renderTemplate(rule.standard.message, vars, allowed);
  const severity = rule.severity_override ?? rule.standard.default_severity;

  try {
    const created = await prisma.systemAlert.create({
      data: {
        type: rule.standard.key,
        title,
        message,
        severity,
        category: "alerta",
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        standard_id: rule.standard.id,
        rule_id: rule.id,
        dedupe_key: dedupeKey,
      },
    });
    result.created++;

    await writeAccessAudit({
      actorId: null,
      action: "alert_occurrence.auto_created",
      after: {
        system_alert_id: created.id,
        trigger_type: rule.trigger_type,
        entity_type: entityType,
        entity_id: entityId,
        rule_id: rule.id,
        user_id: userId,
      },
    });
    return true;
  } catch (err: unknown) {
    // Proteção real de banco (constraint único em dedupe_key): se outra
    // execução concorrente criou a MESMA chave entre nosso SELECT e nosso
    // INSERT, o índice único rejeita — trata como sucesso silencioso (já
    // existe), não como erro. Isto protege mesmo com mais de uma instância
    // do backend, diferente da trava em memória (que só protege dentro do
    // mesmo processo).
    if (isUniqueConstraintError(err)) return false;
    throw err;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: string }).code === "P2002";
}

async function resolveMatchingOccurrences(input: {
  entityType: EntityType;
  entityId: string;
  userId: string;
  standardKey: string;
  reason: string;
  result: AlertEngineRunResult;
}): Promise<void> {
  const active = await prisma.systemAlert.findMany({
    where: {
      entity_type: input.entityType,
      entity_id: input.entityId,
      user_id: input.userId,
      resolved_at: null,
      is_archived: false,
      standard: { key: input.standardKey },
    },
    select: { id: true },
  });
  for (const alert of active) {
    await resolveOccurrence(alert.id, input.reason);
    input.result.resolved++;
  }
}

async function resolveOccurrence(alertId: string, reason: string): Promise<void> {
  await prisma.systemAlert.update({
    where: { id: alertId },
    data: { resolved_at: new Date(), resolution_reason: reason, is_archived: true, archived_at: new Date(), dedupe_key: null },
  });
  await writeAccessAudit({
    actorId: null,
    action: "alert_occurrence.auto_resolved",
    after: { system_alert_id: alertId, reason },
  });
}

// ── Encerramento automático ──────────────────────────────────────────────
// Varre toda ocorrência automática ainda ativa e confirma se ela continua
// válida: entidade ainda existe e não está concluída/cancelada, condição de
// prazo ainda vale, E o destinatário ainda é elegível pra alguma categoria
// da regra (cobre "destinatário deixar legitimamente de participar" — ex.:
// trocou o nômade da etapa).

async function resolveStaleOccurrences(
  rules: {
    dueSoonTaskRule: RuleWithStandard | undefined;
    overdueTaskRule: RuleWithStandard | undefined;
    dueSoonStageRule: RuleWithStandard | undefined;
    overdueStageRule: RuleWithStandard | undefined;
  },
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  const activeAutoAlerts = await prisma.systemAlert.findMany({
    where: {
      standard_id: { not: null },
      resolved_at: null,
      is_archived: false,
      entity_type: { in: ["project_task", "project_task_stage"] },
      user_id: { not: null },
    },
    select: { id: true, entity_type: true, entity_id: true, user_id: true, dedupe_key: true, rule_id: true, standard: { select: { key: true } } },
  });
  if (activeAutoAlerts.length === 0) return;

  const taskIds = [...new Set(activeAutoAlerts.filter((a) => a.entity_type === "project_task").map((a) => a.entity_id as string))];
  const stageIds = [...new Set(activeAutoAlerts.filter((a) => a.entity_type === "project_task_stage").map((a) => a.entity_id as string))];

  const [tasks, stages] = await Promise.all([
    taskIds.length ? prisma.projectTask.findMany({ where: { id: { in: taskIds } }, select: TASK_SELECT }) : Promise.resolve([]),
    stageIds.length ? prisma.projectTaskStage.findMany({ where: { id: { in: stageIds } }, select: STAGE_SELECT }) : Promise.resolve([]),
  ]);
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const stageById = new Map(stages.map((s) => [s.id, s]));

  for (const alert of activeAutoAlerts) {
    try {
      if (!alert.entity_id || !alert.user_id || !alert.standard) continue;

      if (alert.entity_type === "project_task") {
        // O batch acima buscou o registro SEM filtro de status (pra achar
        // tarefas concluídas/canceladas também) — por isso o status
        // terminal precisa ser checado aqui, não só quando o id nem aparece
        // mais no mapa (que só cobre "id não existe de verdade").
        const task = taskById.get(alert.entity_id) ?? (await prisma.projectTask.findUnique({ where: { id: alert.entity_id }, select: TASK_SELECT }));
        if (!task) {
          await resolveOccurrence(alert.id, "condition_cleared");
          result.resolved++;
          continue;
        }
        if (task.status === "CONCLUIDA" || task.status === "CANCELADA") {
          await resolveOccurrence(alert.id, task.status === "CONCLUIDA" ? "task_completed" : "task_cancelled");
          result.resolved++;
          continue;
        }
        const rule = alert.standard.key === STANDARD_KEYS.DUE_SOON ? rules.dueSoonTaskRule : rules.overdueTaskRule;
        await evaluateAndMaybeResolve(alert, task, "project_task", rule, now, result);
      } else if (alert.entity_type === "project_task_stage") {
        const stage = stageById.get(alert.entity_id) ?? (await prisma.projectTaskStage.findUnique({ where: { id: alert.entity_id }, select: STAGE_SELECT }));
        if (!stage) {
          await resolveOccurrence(alert.id, "condition_cleared");
          result.resolved++;
          continue;
        }
        if (stage.status === "CONCLUIDA") {
          await resolveOccurrence(alert.id, "task_completed");
          result.resolved++;
          continue;
        }
        if (stage.status === "BLOQUEADA") {
          await resolveOccurrence(alert.id, "condition_cleared");
          result.resolved++;
          continue;
        }
        const rule = alert.standard.key === STANDARD_KEYS.STAGE_DUE_SOON ? rules.dueSoonStageRule : rules.overdueStageRule;
        await evaluateAndMaybeResolve(alert, stage, "project_task_stage", rule, now, result);
      }
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao encerrar ocorrência ${alert.id}:`, err);
    }
  }
}

async function evaluateAndMaybeResolve(
  alert: { id: string; user_id: string | null; dedupe_key: string | null; rule_id: string | null; standard: { key: string } | null },
  entity: { id: string } & (typeof TASK_SELECT extends unknown ? any : never),
  entityType: EntityType,
  rule: RuleWithStandard | undefined,
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  const userId = alert.user_id!;
  const standardKey = alert.standard!.key;
  const dueDate: Date | null = entityType === "project_task" ? entity.due_date : entity.prazo_execucao;
  if (!dueDate || !rule?.is_active) {
    await resolveOccurrence(alert.id, "condition_cleared");
    result.resolved++;
    return;
  }

  // O prazo pode ter mudado de dia desde que esta ocorrência foi criada — a
  // chave de dedupe atual (regra+entidade+destinatário+dia) é diferente da
  // gravada nesta linha. Quando isso acontece, esta ocorrência é a "antiga":
  // encerra aqui (recalculada), e a verificação normal (processTasks/
  // processStages) já cria a ocorrência nova com a chave certa no mesmo
  // ciclo — nunca ficam duas ativas ao mesmo tempo pro mesmo destinatário.
  if (rule.id !== alert.rule_id) {
    await resolveOccurrence(alert.id, "condition_cleared");
    result.resolved++;
    return;
  }
  const currentKey = `${rule.id}:${entityType}:${entity.id}:${userId}:${dedupeCycleKey(dueDate)}`;
  if (currentKey !== alert.dedupe_key) {
    await resolveOccurrence(alert.id, "condition_cleared");
    result.resolved++;
    return;
  }

  // Destinatário não é mais elegível pra nenhuma categoria da regra —
  // "recipient_changed" cobre tanto "trocou pra outra pessoa" (nômade
  // trocado, Admin responsável do projeto trocado) quanto "trocou pra
  // ninguém" (Admin desativado): em ambos os casos, ESTA pessoa deixou de
  // ser quem deve receber, e é isso que o motivo registra.
  const recipients = await resolveRuleRecipients(rule, entityType, entity, result);
  if (!recipients.includes(userId)) {
    await resolveOccurrence(alert.id, "recipient_changed");
    result.resolved++;
    return;
  }

  if (isDueSoonTrigger(standardKey)) {
    const leadMs = (rule.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
    const stillWithinWindow = dueDate.getTime() > now.getTime() && dueDate.getTime() - now.getTime() <= leadMs;
    if (!stillWithinWindow) {
      await resolveOccurrence(alert.id, "condition_cleared");
      result.resolved++;
    }
  } else {
    const stillOverdue = dueDate.getTime() <= now.getTime();
    if (!stillOverdue) {
      await resolveOccurrence(alert.id, "condition_cleared");
      result.resolved++;
    }
  }
}

// ── Trava simples de execução concorrente ────────────────────────────────
// A implantação é sempre instância única (ver ecosystem.config.js:
// instances: 1), então uma trava em memória do próprio processo já evita
// duas varreduras sobrepostas dentro do mesmo processo. A proteção REAL
// contra duplicidade entre múltiplas instâncias é o índice único de
// `dedupe_key` no banco (ver createOccurrenceIfNeeded) — esta trava é só uma
// otimização pra não fazer trabalho redundante, não a garantia de dedupe.
let running = false;

export async function runAlertEngineOnceGuarded(): Promise<AlertEngineRunResult | null> {
  if (running) return null;
  running = true;
  try {
    return await runAlertEngineOnce();
  } finally {
    running = false;
  }
}
