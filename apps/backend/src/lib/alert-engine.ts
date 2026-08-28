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
import { getZonedParts, zonedTimeToUtc } from "./timezone";
import { snapshotAlertImage } from "./alert-image-storage";
import { nestedAlertEventCreate } from "./alert-events";

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

// ── Resolução automática de ocorrência de TAREFA (ata 2026-08, bloco 1/2) ──
// Só `task.due_soon` / `task.overdue`. Etapas continuam no caminho legado
// (`resolveOccurrence`, campos `resolved_at`/`resolution_reason`) até o bloco
// 2. O autor de toda resolução automática é apresentado como este rótulo,
// nunca uma pessoa real.
export const MOTOR_LABEL = "Motor da Allka";

// Motivo técnico padronizado → mensagem legível (pt-BR). O motivo é gravado
// em `automatic_resolution_reason` (enum fechado, nunca texto livre); a
// mensagem em `automatic_resolution_message`. Nunca "Resolvido
// automaticamente" genérico — cada motivo diz o que realmente aconteceu.
//
// Reparo semântico (ata 2026-08): TODO motivo aqui afirma que a condição
// terminou por um FATO COMPROVÁVEL. Foram removidos:
//   - `deadline_changed` ("O prazo da tarefa foi alterado.") — mudar a data
//     mantendo a MESMA condição (segue atrasada / segue na janela) não é
//     fim do problema; a ocorrência é mantida, sem resolução nem evento.
//   - `rule_disabled` — desativar a regra não comprova que a tarefa foi
//     corrigida; a ocorrência existente permanece no seu estado verdadeiro
//     (encerrar em massa ao desativar uma regra seria uma AÇÃO
//     ADMINISTRATIVA explícita futura, com outro estado/motivo — pendência
//     registrada, não implementada).
export const AUTO_RESOLUTION_REASON_MESSAGES = {
  task_completed: "A tarefa foi concluída.",
  task_cancelled: "A tarefa foi cancelada.",
  task_removed: "A tarefa foi removida e a condição deixou de existir.",
  task_delivered: "A tarefa foi entregue pelo responsável.",
  deadline_changed_not_overdue: "O prazo foi alterado e a tarefa não está mais atrasada.",
  deadline_out_of_window: "O prazo foi alterado para fora da janela de alerta.",
  superseded_by_overdue: "O prazo venceu e a tarefa passou para a condição de atraso.",
  recipient_changed: "O destinatário deixou de ser responsável por esta tarefa.",
} as const;

export type AutoResolutionReason = keyof typeof AUTO_RESOLUTION_REASON_MESSAGES;

// ── Alerta automático de tarefa "controlado por condição" (ata 2026-08) ────
// Uma ocorrência automática de tarefa é governada PELA CONDIÇÃO REAL que a
// criou — nunca por comentário, por abrir a tarefa, por marcar como lido nem
// por "Resolver alerta" (nem pelo Admin Master). O formulário de resolução
// humana continua valendo só para alertas manuais/avulsos críticos.
//
// Predicado server-side (NUNCA por texto de título/mensagem): origem
// automática por Padrão+Regra (`standard_id`/`rule_id` preenchidos),
// `entity_type = "project_task"`, e tipo técnico numa das duas regras de
// tarefa (`task.due_soon` / `task.overdue`).
export function isConditionControlledTaskAlert(alert: {
  category?: string | null;
  entity_type?: string | null;
  standard_id?: string | null;
  rule_id?: string | null;
  type?: string | null;
}): boolean {
  return (
    alert.entity_type === "project_task" &&
    !!alert.standard_id &&
    !!alert.rule_id &&
    (alert.type === STANDARD_KEYS.DUE_SOON || alert.type === STANDARD_KEYS.OVERDUE)
  );
}

// Subconjunto: alerta automático de tarefa VERMELHO cuja condição ainda
// está ATIVA (nunca resolvido nem encerrado). Enquanto isto é verdade, o
// alerta não pode ser dispensado, arquivado nem escondido de "Dispensar
// todos" — nem pelo Admin Master: autoridade administrativa não torna uma
// tarefa atrasada entregue (ata 2026-08). Depois que a condição real
// termina (`automatic_resolved_at`/`condition_cleared_at`), esta função
// passa a devolver `false` e o arquivamento explícito volta a ser
// permitido.
export function isActiveConditionControlledCriticalTaskAlert(alert: {
  category?: string | null;
  entity_type?: string | null;
  standard_id?: string | null;
  rule_id?: string | null;
  type?: string | null;
  severity?: string | null;
  automatic_resolved_at?: Date | null;
  manual_resolved_at?: Date | null;
  condition_cleared_at?: Date | null;
}): boolean {
  return (
    isConditionControlledTaskAlert(alert) &&
    alert.severity === "error" &&
    !alert.automatic_resolved_at &&
    !alert.manual_resolved_at &&
    !alert.condition_cleared_at
  );
}

// "Entrega da tarefa INTEIRA pelo responsável" — condição inequívoca
// auditada no código (ver stage-engine.ts `concluirEtapa`): quando NÃO
// sobra nenhuma etapa obrigatória em aberto, a plataforma move a tarefa
// para EM_APROVACAO/`data_conclusao` e a obrigação do executor terminou.
// É o MESMO gatilho que o motor de etapas usa pra decidir que a execução
// acabou — não é "uma etapa", é o conjunto obrigatório completo.
// Tarefa sem etapas (ou `legacy_model`) não tem sinal de entrega — segue
// só resolvendo por conclusão/cancelamento (lacuna documentada, nunca
// inventada).
export function isTaskDeliveredByExecutor(task: {
  legacy_model?: boolean | null;
  stages?: { status: string; obrigatoria: boolean }[] | null;
}): boolean {
  if (task.legacy_model) return false;
  const stages = task.stages ?? [];
  if (stages.length === 0) return false;
  const obrigatorias = stages.filter((s) => s.obrigatoria);
  if (obrigatorias.length === 0) return false;
  return obrigatorias.every((s) => s.status === "CONCLUIDA");
}

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

// Só ETAPAS ainda usam o dia do prazo na chave (caminho legado, bloco 2).
function dedupeCycleKey(due: Date): string {
  return due.toISOString().slice(0, 10);
}

// Identidade ESTÁVEL do episódio de uma ocorrência de TAREFA: regra +
// tarefa + destinatário. NÃO inclui o dia do prazo (ata 2026-08, reparo
// semântico) — mudar a data mantendo a mesma condição não pode fingir um
// episódio novo. Um episódio novo só nasce depois que `condition_cleared_at`
// é gravado e a chave é liberada (zerada) pelo encerramento.
function taskEpisodeKey(ruleId: string, taskId: string, userId: string): string {
  return `${ruleId}:project_task:${taskId}:${userId}`;
}

export interface AlertEngineRunResult {
  created: number;
  resolved: number;
  skippedNoResponsavel: number;
  skippedNoAdminResponsavel: number;
  errors: number;
  // ── Programados (ata 2026-08, 4º lote) ──────────────────────────────────
  schedulesFired: number;
  schedulesSkippedStale: number;
  expired: number;
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
    schedulesFired: 0,
    schedulesSkippedStale: 0,
    expired: 0,
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
  await processSchedules(now, result);
  await resolveExpiredOccurrences(now, result);

  return result;
}

const TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  due_date: true,
  project_id: true,
  legacy_model: true,
  nomade_responsavel_id: true,
  lider_responsavel_id: true,
  responsavel_agencia_id: true,
  assignee_id: true,
  project: { select: { title: true, admin_responsible_user_id: true } },
  // Só pra decidir "entrega da tarefa inteira" (isTaskDeliveredByExecutor) —
  // nunca pra gerar alerta de etapa (fora de escopo).
  stages: { select: { status: true, obrigatoria: true } },
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
      // Executor já entregou a tarefa inteira (todas as etapas obrigatórias
      // concluídas) — a condição de prazo não se aplica mais a ele. Não cria
      // ocorrência nova; resolveStaleOccurrences encerra as abertas como
      // `task_delivered`.
      if (isTaskDeliveredByExecutor(task)) continue;
      const isOverdue = task.due_date.getTime() <= now.getTime();
      const vars = { tarefa: task.title, prazo: formatPrazo(task.due_date), projeto: task.project?.title ?? "—" };

      if (isOverdue && overdueRule) {
        const recipients = await resolveRuleRecipients(overdueRule, "project_task", task, result);
        if (recipients.length === 0) result.skippedNoResponsavel++;
        for (const userId of recipients) {
          const created = await createOccurrenceIfNeeded(overdueRule, "project_task", task.id, userId, vars, task.due_date, result);
          if (created) {
            // Transição "próxima do prazo" → "atrasada": encerra AUTOMATICAMENTE
            // a(s) ocorrência(s) amarela(s) do MESMO destinatário/tarefa. A
            // ordem é resistente a falha: o vermelho já foi criado acima; se
            // este encerramento falhar num ciclo, o próximo ciclo o refaz
            // (resolveStaleOccurrences reavalia o amarelo e chega ao mesmo
            // "superseded_by_overdue"). Nunca ficam os dois ativos por muito
            // tempo, nunca fica nenhum quando a tarefa está de fato atrasada.
            const amarelos = await findActiveTaskOccurrences(task.id, userId, STANDARD_KEYS.DUE_SOON);
            for (const amarelo of amarelos) {
              await autoResolveTaskOccurrence(amarelo, "superseded_by_overdue", now, result);
            }
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
  // `project_task.id` (reparo "Ver alerta") vira `entity_parent_id` na
  // ocorrência — a plataforma não tem rota exclusiva de etapa, então "Ver"
  // precisa saber qual TAREFA abrir.
  project_task: { select: { id: true, title: true, project: { select: { title: true, admin_responsible_user_id: true } } } },
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
            stage.project_task?.id,
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
            await createOccurrenceIfNeeded(dueSoonRule, "project_task_stage", stage.id, userId, vars, stage.prazo_execucao, result, stage.project_task?.id);
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
  name: string;
  trigger_type: string;
  severity_override: string | null;
  lead_time_minutes: number | null;
  is_active: boolean;
  recipient_roles_json: string;
  standard: { id: string; key: string; name: string; title: string; message: string; default_severity: string };
};

async function createOccurrenceIfNeeded(
  rule: RuleWithStandard,
  entityType: EntityType,
  entityId: string,
  userId: string,
  vars: Record<string, string>,
  dueDate: Date,
  result: AlertEngineRunResult,
  // Só preenchido pra "project_task_stage" (id da tarefa que contém a
  // etapa) — reparo "Ver alerta", ver comentário no schema.
  entityParentId?: string,
): Promise<boolean> {
  if (entityType === "project_task") {
    const dedupeKey = taskEpisodeKey(rule.id, entityId, userId);
    // Episódio aberto = a ÚNICA linha com `dedupe_key` preenchido pra esta
    // combinação (regra+tarefa+destinatário). `dedupe_key` só é zerado quando
    // o episódio encerra (autoResolveTaskOccurrence / resolveOccurrence /
    // expiração) — uma resolução MANUAL o mantém, então continua sendo o
    // episódio aberto. Buscar pela identidade (e não pela chave exata) é o
    // que dá compatibilidade com ocorrências locais gravadas no formato
    // antigo `...:userId:AAAA-MM-DD`.
    const open = await prisma.systemAlert.findFirst({
      where: {
        rule_id: rule.id,
        entity_type: "project_task",
        entity_id: entityId,
        user_id: userId,
        dedupe_key: { not: null },
      },
      select: { id: true, dedupe_key: true },
    });
    if (open) {
      if (open.dedupe_key !== dedupeKey) {
        // Normalização segura: reescreve SÓ a chave da ocorrência aberta pro
        // formato estável. Nenhum outro campo, nenhum evento, nenhuma data —
        // não é uma atualização ampla, é o mesmo episódio com a chave certa.
        await prisma.systemAlert.update({ where: { id: open.id }, data: { dedupe_key: dedupeKey } });
      }
      return false; // segunda execução / episódio já aberto não duplica
    }
    return createOccurrenceRow(rule, "project_task", entityId, userId, vars, dedupeKey, result, entityParentId);
  }

  // Etapas (caminho legado, bloco 2) — chave com o dia do prazo, inalterada.
  const dedupeKey = `${rule.id}:${entityType}:${entityId}:${userId}:${dedupeCycleKey(dueDate)}`;

  const existing = await prisma.systemAlert.findFirst({
    where: { dedupe_key: dedupeKey, resolved_at: null },
    select: { id: true },
  });
  if (existing) return false; // segunda execução não duplica

  return createOccurrenceRow(rule, entityType, entityId, userId, vars, dedupeKey, result, entityParentId);
}

async function createOccurrenceRow(
  rule: RuleWithStandard,
  entityType: EntityType,
  entityId: string,
  userId: string,
  vars: Record<string, string>,
  dedupeKey: string,
  result: AlertEngineRunResult,
  entityParentId?: string,
): Promise<boolean> {
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
        entity_parent_id: entityParentId ?? null,
        user_id: userId,
        standard_id: rule.standard.id,
        rule_id: rule.id,
        dedupe_key: dedupeKey,
        events: nestedAlertEventCreate({
          eventType: "created",
          description: `Ocorrência gerada automaticamente pela regra "${rule.name}" (padrão "${rule.standard.name}").`,
        }),
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

// ── Resolução automática de ocorrência de TAREFA (ata 2026-08, bloco 1/2) ──
// Só o motor chama isto — não há rota pública. Distinta de `resolveOccurrence`
// (etapas/legado, ainda usa `resolved_at`/`resolution_reason`) e da resolução
// manual/expiração. Idempotente e resistente a dois ciclos concorrentes: a
// gravação é um compare-and-swap transacional em `condition_cleared_at` (só
// entra quem achar o campo ainda nulo) e o evento de histórico nasce na MESMA
// transação. Nunca sobrescreve uma resolução manual já registrada — nesse
// caso só encerra o EPISÓDIO (marca `condition_cleared_at`, zera `dedupe_key`,
// grava um evento "condition_cleared") sem tocar em `automatic_resolved_at`.

type StaleTaskAlertRow = {
  id: string;
  manual_resolved_at: Date | null;
};

async function findActiveTaskOccurrences(
  entityId: string,
  userId: string,
  standardKey: string,
): Promise<StaleTaskAlertRow[]> {
  return prisma.systemAlert.findMany({
    where: {
      entity_type: "project_task",
      entity_id: entityId,
      user_id: userId,
      condition_cleared_at: null,
      dedupe_key: { not: null },
      standard: { key: standardKey },
    },
    select: { id: true, manual_resolved_at: true },
  });
}

async function autoResolveTaskOccurrence(
  alert: StaleTaskAlertRow,
  reason: AutoResolutionReason,
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  const message = AUTO_RESOLUTION_REASON_MESSAGES[reason];
  const preResolvedManually = alert.manual_resolved_at != null;

  const data: Record<string, unknown> = {
    condition_cleared_at: now,
    // Zera a chave: o episódio acabou. Um episódio futuro (mesma
    // regra+tarefa+destinatário) recria a chave idêntica e, como nenhuma
    // linha ativa a segura mais, uma ocorrência NOVA é criada — nunca a
    // antiga reaproveitada.
    dedupe_key: null,
  };
  if (!preResolvedManually) {
    // Resolução automática de verdade — a pessoa não chegou a resolver.
    // NÃO arquiva (ata 2026-08, reparo semântico): resolver ≠ arquivar. O
    // alerta sai de "Ativos" porque está resolvido (filtro `resolved`),
    // aparece em "Resolvidos" e só entra em "Arquivados" por uma ação
    // explícita e autorizada depois. O histórico distingue "Resolvido
    // automaticamente" (evento abaixo) de "Arquivado" (evento próprio, só
    // quando alguém arquiva).
    data.automatic_resolved_at = now;
    data.automatic_resolution_reason = reason;
    data.automatic_resolution_message = message;
  }

  let applied = false;
  await prisma.$transaction(async (tx) => {
    const cas = await tx.systemAlert.updateMany({
      // Só quem encontrar o episódio ainda aberto grava — dois ciclos
      // simultâneos: um vence o CAS, o outro vê count=0 e não faz nada
      // (nem duplica evento).
      where: { id: alert.id, condition_cleared_at: null },
      data,
    });
    if (cas.count === 0) return;
    applied = true;
    await tx.systemAlertEvent.create({
      data: {
        alert_id: alert.id,
        event_type: preResolvedManually ? "condition_cleared" : "auto_resolved",
        // actor_user_id sempre nulo — autor é "Motor da Allka", nunca pessoa.
        actor_user_id: null,
        description: preResolvedManually
          ? "A condição que originou este alerta deixou de existir."
          : "Alerta resolvido automaticamente pelo Motor da Allka.",
        metadata_json: JSON.stringify({ reason, message }),
      },
    });
  });

  if (!applied) return;
  await writeAccessAudit({
    actorId: null,
    action: "alert_occurrence.auto_resolved",
    after: { system_alert_id: alert.id, reason, pre_resolved_manually: preResolvedManually },
  });
  result.resolved++;
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
      entity_type: { in: ["project_task", "project_task_stage"] },
      user_id: { not: null },
      // Episódio já encerrado (resolução automática de tarefa) nunca volta a
      // ser avaliado — sempre nulo em ocorrências de etapa (bloco 2).
      condition_cleared_at: null,
      // Ativa OU ainda "no episódio": a segunda condição do OR pega uma
      // ocorrência de TAREFA resolvida MANUALMENTE cuja condição continua
      // viva (`dedupe_key` preenchido, mas `is_archived`/`resolved_at`
      // poderiam já ter mudado) — é isso que permite ao motor encerrar o
      // episódio quando a condição enfim terminar, sem recriar nada nem
      // sobrescrever a resolução manual.
      OR: [
        { resolved_at: null, is_archived: false },
        { dedupe_key: { not: null } },
      ],
    },
    select: {
      id: true,
      entity_type: true,
      entity_id: true,
      user_id: true,
      dedupe_key: true,
      rule_id: true,
      resolved_at: true,
      is_archived: true,
      manual_resolved_at: true,
      condition_cleared_at: true,
      standard: { select: { key: true } },
    },
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
          await autoResolveTaskOccurrence(alert, "task_removed", now, result);
          continue;
        }
        if (task.status === "CONCLUIDA" || task.status === "CANCELADA") {
          await autoResolveTaskOccurrence(alert, task.status === "CONCLUIDA" ? "task_completed" : "task_cancelled", now, result);
          continue;
        }
        const rule = alert.standard.key === STANDARD_KEYS.DUE_SOON ? rules.dueSoonTaskRule : rules.overdueTaskRule;
        await evaluateAndMaybeResolveTask(alert, task, alert.user_id, rule, now, result);
      } else if (alert.entity_type === "project_task_stage") {
        // Etapas ficam no caminho legado até o bloco 2. O scan foi alargado
        // (OR com `dedupe_key`) só pra alcançar ocorrências de TAREFA
        // resolvidas manualmente — uma linha de etapa que não seja
        // estritamente ativa não deve ser reprocessada aqui.
        if (alert.resolved_at || alert.is_archived) continue;
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

// Versão TAREFA do encerramento automático (ata 2026-08, bloco 1/2 + reparo
// semântico). Só encerra a ocorrência quando há um FATO que comprova o fim
// da condição — nunca por "o prazo mudou de dia" nem por "a regra foi
// desativada". Enquanto a condição continua verdadeira E DO MESMO TIPO
// (segue atrasada / segue na janela), a MESMA ocorrência é mantida: sem
// `automatic_resolved_at`, sem `condition_cleared_at`, sem zerar a chave,
// sem evento, sem nova ocorrência, sem mexer na data de criação.
async function evaluateAndMaybeResolveTask(
  alert: {
    id: string;
    manual_resolved_at: Date | null;
    standard: { key: string } | null;
  },
  task: {
    id: string;
    due_date: Date | null;
    legacy_model?: boolean | null;
    stages?: { status: string; obrigatoria: boolean }[] | null;
  } & TaskRecipientFields,
  userId: string,
  rule: RuleWithStandard | undefined,
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  const standardKey = alert.standard!.key;
  const isDueSoon = standardKey === STANDARD_KEYS.DUE_SOON;

  // Regra desativada NÃO comprova que a tarefa foi corrigida: a ocorrência
  // fica no seu estado verdadeiro. `processTasks` já para de criar novas
  // ocorrências (só recebe regras ativas). Encerrar em massa ao desativar
  // uma regra seria uma ação administrativa explícita futura (outro
  // estado/motivo), não "resolução automática" — pendência registrada.
  if (!rule?.is_active) return;

  // Entrega real da tarefa inteira pelo responsável (todas as etapas
  // obrigatórias concluídas — mesmo gatilho do motor de etapas). Fato
  // comprovável: encerra a ocorrência. Não confundir com aprovação/
  // conclusão administrativa posterior (essas continuam por `task_completed`).
  if (isTaskDeliveredByExecutor(task)) {
    await autoResolveTaskOccurrence(alert, "task_delivered", now, result);
    return;
  }

  const dueDate = task.due_date;
  if (!dueDate) {
    // Prazo removido da tarefa: a tarefa não está mais atrasada nem na
    // janela de proximidade — fato real, motivo coerente com o tipo.
    await autoResolveTaskOccurrence(
      alert,
      isDueSoon ? "deadline_out_of_window" : "deadline_changed_not_overdue",
      now,
      result,
    );
    return;
  }

  // Destinatário deixou de ser responsável (troca de nômade/líder/agência/
  // assignee ou Admin responsável do projeto). Só a ocorrência DESTA pessoa
  // é encerrada — as das outras seguem seu próprio ciclo.
  const recipients = await resolveRuleRecipients(rule, "project_task", task, result);
  if (!recipients.includes(userId)) {
    await autoResolveTaskOccurrence(alert, "recipient_changed", now, result);
    return;
  }

  const nowMs = now.getTime();
  const dueMs = dueDate.getTime();
  const isOverdue = dueMs <= nowMs;
  const leadMs = (rule.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
  const withinWindow = !isOverdue && dueMs - nowMs <= leadMs;

  if (isDueSoon) {
    if (isOverdue) {
      // Transição real "próxima do prazo" → "atrasada": encerra a amarela;
      // processTasks (já rodou neste ciclo) criou/mantém a única vermelha.
      await autoResolveTaskOccurrence(alert, "superseded_by_overdue", now, result);
      return;
    }
    if (!withinWindow) {
      // Saiu da janela de proximidade (prazo empurrado pra longe).
      await autoResolveTaskOccurrence(alert, "deadline_out_of_window", now, result);
      return;
    }
    // Continua próxima do prazo (o prazo pode ter mudado de dia, mas segue
    // na janela) — mesma ocorrência, nada a fazer.
    return;
  }

  // OVERDUE
  if (!isOverdue) {
    // Deixou de estar atrasada (prazo corrigido pra frente).
    await autoResolveTaskOccurrence(alert, "deadline_changed_not_overdue", now, result);
    return;
  }
  // Continua atrasada (o prazo pode ter mudado pra outra data ainda vencida)
  // — mesma ocorrência, nada a fazer.
}

// ── Alertas Programados (ata 2026-08, 4º lote) ───────────────────────────
// Reaproveita o mesmo ciclo/trava do motor (ver runAlertEngineOnce) — não é
// um segundo timer. Cada disparo vira um SystemAlert comum, com
// `schedule_id` marcando a origem, igual `standard_id`/`rule_id` já fazem
// pras Regras.

// Janela de tolerância: se o servidor ficou desligado durante um ou mais
// horários programados, só o disparo mais recente dentro desta janela é
// processado ao voltar — nunca um backlog de dezenas de mensagens atrasadas.
// Documentado explicitamente porque é uma decisão de produto, não só técnica.
export const SCHEDULE_CATCH_UP_TOLERANCE_MS = 60 * 60 * 1000; // 1 hora

const CRITICALITY_TYPE_SCHEDULE = "alerta_programado";

type ScheduleRecord = {
  id: string;
  name: string;
  title: string;
  message: string;
  severity: string;
  image_file_name: string | null;
  image_alt: string | null;
  user_id: string | null;
  recurrence_type: string;
  weekdays_json: string | null;
  time_of_day: string;
  timezone: string;
  starts_at: Date;
  ends_at: Date | null;
  occurrence_expires_minutes: number | null;
  is_active: boolean;
  next_run_at: Date | null;
};

/**
 * Calcula o próximo instante (UTC) em que a programação deve disparar, a
 * partir de `from` (exclusive — sempre estritamente depois). `null` quando
 * não há próxima execução (ex.: "once" já disparada, ou passou de `ends_at`).
 */
export function computeNextRun(schedule: ScheduleRecord, from: Date): Date | null {
  if (schedule.recurrence_type === "once") {
    return schedule.starts_at.getTime() > from.getTime() ? schedule.starts_at : null;
  }

  const [hh, mm] = schedule.time_of_day.split(":").map(Number);
  const weekdays: number[] = schedule.recurrence_type === "weekly" ? JSON.parse(schedule.weekdays_json ?? "[]") : [];

  let cursor = new Date(Math.max(from.getTime(), schedule.starts_at.getTime() - 24 * 60 * 60 * 1000));
  for (let i = 0; i < 400; i++) {
    const zoned = getZonedParts(cursor, schedule.timezone);
    const candidate = zonedTimeToUtc(zoned.year, zoned.month, zoned.day, hh, mm, schedule.timezone);

    if (schedule.ends_at && candidate.getTime() > schedule.ends_at.getTime()) return null;

    const dayMatches = schedule.recurrence_type === "daily" || weekdays.includes(zoned.weekday);
    if (
      dayMatches &&
      candidate.getTime() > from.getTime() &&
      candidate.getTime() >= schedule.starts_at.getTime()
    ) {
      return candidate;
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return null;
}

async function processSchedules(now: Date, result: AlertEngineRunResult): Promise<void> {
  const schedules = await prisma.alertSchedule.findMany({
    where: { is_active: true, is_archived: false, next_run_at: { lte: now } },
  });

  for (const schedule of schedules) {
    try {
      const scheduledFor = schedule.next_run_at!;
      const isStale = now.getTime() - scheduledFor.getTime() > SCHEDULE_CATCH_UP_TOLERANCE_MS;

      if (!isStale) {
        const recipients = schedule.user_id ? [schedule.user_id] : [null];
        for (const userId of recipients) {
          await createScheduleOccurrence(schedule, scheduledFor, userId, result);
        }
        result.schedulesFired++;
      } else {
        result.schedulesSkippedStale++;
        await writeAccessAudit({
          actorId: null,
          action: "alert_schedule.execution_skipped_stale",
          after: { alert_schedule_id: schedule.id, scheduled_for: scheduledFor, now },
        });
      }

      const nextRun = computeNextRun(schedule, isStale ? now : scheduledFor);
      await prisma.alertSchedule.update({
        where: { id: schedule.id },
        data: { last_run_at: scheduledFor, next_run_at: nextRun },
      });
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao processar programação ${schedule.id}:`, err);
    }
  }
}

async function createScheduleOccurrence(
  schedule: ScheduleRecord,
  scheduledFor: Date,
  userId: string | null,
  result: AlertEngineRunResult,
): Promise<void> {
  if (userId) {
    const active = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } });
    if (!active?.is_active) return; // usuário removido/desativado depois de criar a programação — não inventa destinatário
  }
  const dedupeKey = `schedule:${schedule.id}:${scheduledFor.toISOString()}:${userId ?? "geral"}`;
  const existing = await prisma.systemAlert.findFirst({ where: { dedupe_key: dedupeKey, resolved_at: null }, select: { id: true } });
  if (existing) return;

  const imageFileName = schedule.image_file_name ? snapshotAlertImage(schedule.image_file_name) : null;
  const expiresAt = schedule.occurrence_expires_minutes
    ? new Date(scheduledFor.getTime() + schedule.occurrence_expires_minutes * 60 * 1000)
    : null;

  try {
    const created = await prisma.systemAlert.create({
      data: {
        type: CRITICALITY_TYPE_SCHEDULE,
        title: schedule.title,
        message: schedule.message,
        severity: schedule.severity,
        category: "alerta",
        user_id: userId,
        image_file_name: imageFileName,
        image_alt: imageFileName ? schedule.image_alt : null,
        expires_at: expiresAt,
        schedule_id: schedule.id,
        entity_type: "alert_schedule",
        entity_id: schedule.id,
        dedupe_key: dedupeKey,
        events: nestedAlertEventCreate({
          eventType: "created",
          description: `Ocorrência criada pela programação "${schedule.name}".`,
        }),
      },
    });
    result.created++;
    await writeAccessAudit({
      actorId: null,
      action: "alert_occurrence.auto_created",
      after: { system_alert_id: created.id, schedule_id: schedule.id, scheduled_for: scheduledFor, user_id: userId },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return;
    throw err;
  }
}

// ── Expiração de ocorrência (ata 2026-08, 4º lote) ────────────────────────
// Distinta do fim da PROGRAMAÇÃO (ends_at, que só impede criar novas
// ocorrências) — isto encerra ocorrências JÁ CRIADAS (Avulso ou
// Programado) cujo prazo passou. Nunca toca ocorrência de Regra de tarefa/
// etapa (elas nunca têm expires_at preenchido).
async function resolveExpiredOccurrences(now: Date, result: AlertEngineRunResult): Promise<void> {
  const expired = await prisma.systemAlert.findMany({
    where: { expires_at: { lte: now }, resolved_at: null, is_archived: false },
    select: { id: true },
  });
  for (const alert of expired) {
    await prisma.systemAlert.update({
      where: { id: alert.id },
      data: {
        resolved_at: now,
        resolution_reason: "expired",
        is_archived: true,
        archived_at: now,
        dedupe_key: null,
        events: nestedAlertEventCreate({
          eventType: "expired_by_engine",
          description: "Ocorrência expirada automaticamente pelo motor.",
        }),
      },
    });
    await writeAccessAudit({ actorId: null, action: "alert_occurrence.expired", after: { system_alert_id: alert.id } });
    result.expired++;
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
