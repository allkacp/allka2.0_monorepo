/**
 * alert-engine.ts — Padrão → Regra → Verificação automática → Ocorrência.
 *
 * Primeira automação real da Central de Alertas (ata 2026-08, 2º lote): tarefa
 * próxima do prazo, tarefa atrasada, encerramento automático quando a tarefa
 * deixa de atender à condição. A ocorrência é sempre um `SystemAlert` comum —
 * não existe tabela paralela; `standard_id`/`rule_id`/`dedupe_key` só marcam
 * de onde ela veio, pra permitir reconhecer/encerrar automaticamente.
 *
 * Reaproveita a infraestrutura que já existia: `writeAccessAudit` para
 * auditoria, e o mesmo padrão de "registrar cron em src/index.ts, nunca em
 * módulo importado pelos testes" já usado pela sincronização diária do Meta
 * Ads (ver index.ts) — é por isso que este arquivo nunca importa `cron`
 * nem inicia timers sozinho; quem liga o motor é o index.ts.
 */
import { prisma } from "./prisma";
import { writeAccessAudit } from "./product-feedback-service";

export const STANDARD_KEYS = {
  DUE_SOON: "task.due_soon",
  OVERDUE: "task.overdue",
} as const;

export const TRIGGER_TYPES = [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

// Conjunto fechado — nunca JSON livre nem código. Cada padrão só aceita as
// variáveis desta lista dentro de {{...}} na mensagem.
export const ALLOWED_VARIABLES: Record<string, string[]> = {
  [STANDARD_KEYS.DUE_SOON]: ["tarefa", "prazo", "projeto"],
  [STANDARD_KEYS.OVERDUE]: ["tarefa", "prazo", "projeto"],
};

// Tarefas nestes estados nunca disparam nem mantêm alerta automático ativo.
const TERMINAL_TASK_STATUSES = ["CONCLUIDA", "CANCELADA"];

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
 * Cria os dois padrões/regras obrigatórios se ainda não existirem. Chamado
 * no boot (dev e produção — mesmo padrão de ensureDefaultKnowledgeCategories/
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
  }> = [
    {
      key: STANDARD_KEYS.DUE_SOON,
      name: "Tarefa próxima do prazo",
      title: "Tarefa próxima do prazo",
      message: 'A tarefa "{{tarefa}}" do projeto "{{projeto}}" vence em {{prazo}}.',
      default_severity: "warning",
      ruleName: "Tarefa próxima do prazo (24h)",
      lead_time_minutes: DEFAULT_LEAD_TIME_MINUTES,
    },
    {
      key: STANDARD_KEYS.OVERDUE,
      name: "Tarefa atrasada",
      title: "Tarefa atrasada",
      message: 'A tarefa "{{tarefa}}" do projeto "{{projeto}}" está atrasada. Prazo era {{prazo}}.',
      default_severity: "error",
      ruleName: "Tarefa atrasada",
      lead_time_minutes: null,
    },
  ];

  for (const def of defaults) {
    const standard = await prisma.alertStandard.upsert({
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

    const existingRule = await prisma.alertRule.findFirst({
      where: { standard_id: standard.id, trigger_type: def.key },
    });
    if (!existingRule) {
      await prisma.alertRule.create({
        data: {
          standard_id: standard.id,
          name: def.ruleName,
          trigger_type: def.key,
          is_active: true,
          lead_time_minutes: def.lead_time_minutes,
        },
      });
    }
  }
}

// ── Responsável real da tarefa ───────────────────────────────────────────

/**
 * Prioridade: nômade responsável (resolvido via Nomade.user_id — o campo na
 * tarefa aponta pro registro de Nomade, não direto pro User) → líder
 * responsável → responsável da agência → assignee genérico. O primeiro que
 * existir de verdade (usuário ativo) é o destinatário. Sem nenhum, não
 * inventa: a tarefa fica de fora desta automação (registrado para o lote
 * futuro de "Tarefa disponível").
 */
export async function resolveTaskResponsavel(task: {
  nomade_responsavel_id: string | null;
  lider_responsavel_id: string | null;
  responsavel_agencia_id: string | null;
  assignee_id: string | null;
}): Promise<string | null> {
  if (task.nomade_responsavel_id) {
    const nomade = await prisma.nomade.findUnique({
      where: { id: task.nomade_responsavel_id },
      select: { user_id: true },
    });
    if (nomade?.user_id) {
      const isActive = await userIsActive(nomade.user_id);
      if (isActive) return nomade.user_id;
    }
  }
  for (const candidate of [task.lider_responsavel_id, task.responsavel_agencia_id, task.assignee_id]) {
    if (candidate && (await userIsActive(candidate))) return candidate;
  }
  return null;
}

async function userIsActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } });
  return !!user?.is_active;
}

// ── Execução ──────────────────────────────────────────────────────────────

function formatPrazo(due: Date): string {
  return due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface AlertEngineRunResult {
  created: number;
  resolved: number;
  skippedNoResponsavel: number;
  errors: number;
}

/**
 * Um ciclo completo: cria ocorrências para tarefas que entraram na janela de
 * cada regra ativa, e encerra ocorrências automáticas cuja condição deixou de
 * valer. Nunca lança — cada tarefa/regra é isolada em try/catch pra uma falha
 * pontual não travar o lote inteiro (item 22 dos testes obrigatórios).
 */
export async function runAlertEngineOnce(): Promise<AlertEngineRunResult> {
  const result: AlertEngineRunResult = { created: 0, resolved: 0, skippedNoResponsavel: 0, errors: 0 };
  const now = new Date();

  const rules = await prisma.alertRule.findMany({
    where: { is_active: true, standard: { is_active: true } },
    include: { standard: true },
  });

  const dueSoonRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.DUE_SOON);
  const overdueRule = rules.find((r) => r.trigger_type === STANDARD_KEYS.OVERDUE);

  const candidateTasks = await prisma.projectTask.findMany({
    where: {
      due_date: { not: null },
      status: { notIn: TERMINAL_TASK_STATUSES },
    },
    select: {
      id: true,
      title: true,
      status: true,
      due_date: true,
      project_id: true,
      nomade_responsavel_id: true,
      lider_responsavel_id: true,
      responsavel_agencia_id: true,
      assignee_id: true,
      project: { select: { title: true } },
    },
  });

  for (const task of candidateTasks) {
    try {
      if (!task.due_date) continue;
      const isOverdue = task.due_date.getTime() <= now.getTime();

      if (isOverdue && overdueRule) {
        await createOccurrenceIfNeeded(overdueRule, task, now, result);
        // A transição prazo-próximo → atrasado encerra o Amarelo ativo desta
        // mesma tarefa, sempre que existir — nunca duplica o Vermelho.
        await resolveActiveOccurrences({
          standardKey: STANDARD_KEYS.DUE_SOON,
          entityId: task.id,
          reason: "superseded",
        });
      } else if (!isOverdue && dueSoonRule) {
        const leadMs = (dueSoonRule.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
        const withinWindow = task.due_date.getTime() - now.getTime() <= leadMs;
        if (withinWindow) {
          await createOccurrenceIfNeeded(dueSoonRule, task, now, result);
        }
      }
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao processar tarefa ${task.id}:`, err);
    }
  }

  // ── Encerramento automático ────────────────────────────────────────────
  const activeAutoAlerts = await prisma.systemAlert.findMany({
    where: {
      standard_id: { not: null },
      resolved_at: null,
      is_archived: false,
      entity_type: "project_task",
    },
    select: { id: true, entity_id: true, standard: { select: { key: true } }, rule_id: true },
  });

  const taskById = new Map(candidateTasks.map((t) => [t.id, t]));
  for (const alert of activeAutoAlerts) {
    try {
      if (!alert.entity_id) continue;
      const task = taskById.get(alert.entity_id);
      // Não está mais entre as tarefas candidatas: ou foi concluída/
      // cancelada, ou perdeu o prazo (due_date removido) — busca direta pra
      // diferenciar o motivo.
      if (!task) {
        const fresh = await prisma.projectTask.findUnique({
          where: { id: alert.entity_id },
          select: { status: true, due_date: true },
        });
        if (!fresh) continue;
        const reason =
          fresh.status === "CONCLUIDA"
            ? "task_completed"
            : fresh.status === "CANCELADA"
              ? "task_cancelled"
              : "condition_cleared";
        await resolveOccurrence(alert.id, reason);
        result.resolved++;
        continue;
      }

      // Ainda é candidata — mas talvez a condição específica desta regra não
      // valha mais (ex.: due_soon cujo prazo foi adiado pra fora da janela).
      if (alert.standard?.key === STANDARD_KEYS.DUE_SOON) {
        const rule = dueSoonRule;
        const leadMs = (rule?.lead_time_minutes ?? DEFAULT_LEAD_TIME_MINUTES) * 60 * 1000;
        const stillWithinWindow =
          task.due_date && task.due_date.getTime() > now.getTime() && task.due_date.getTime() - now.getTime() <= leadMs;
        if (!rule?.is_active || !stillWithinWindow) {
          await resolveOccurrence(alert.id, "condition_cleared");
          result.resolved++;
        }
      } else if (alert.standard?.key === STANDARD_KEYS.OVERDUE) {
        // Prazo foi adiado pra frente (deixou de estar atrasada) — encerra o
        // Vermelho; o Amarelo, se voltar a se aplicar, é recriado pela
        // varredura normal acima, sem duplicar (dedupe_key novo por ciclo
        // de regra, checado antes de criar).
        const stillOverdue = task.due_date && task.due_date.getTime() <= now.getTime();
        if (!overdueRule?.is_active || !stillOverdue) {
          await resolveOccurrence(alert.id, "condition_cleared");
          result.resolved++;
        }
      }
    } catch (err) {
      result.errors++;
      console.error(`❌ alert-engine: falha ao encerrar ocorrência ${alert.id}:`, err);
    }
  }

  return result;
}

async function createOccurrenceIfNeeded(
  rule: { id: string; trigger_type: string; severity_override: string | null; standard: { id: string; key: string; title: string; message: string; default_severity: string } },
  task: {
    id: string;
    title: string;
    due_date: Date | null;
    project: { title: string } | null;
    nomade_responsavel_id: string | null;
    lider_responsavel_id: string | null;
    responsavel_agencia_id: string | null;
    assignee_id: string | null;
  },
  now: Date,
  result: AlertEngineRunResult,
): Promise<void> {
  if (!task.due_date) return;
  const dedupeKey = `${rule.id}:${task.id}:${rule.trigger_type}`;

  const existing = await prisma.systemAlert.findFirst({
    where: { dedupe_key: dedupeKey, resolved_at: null, is_archived: false },
    select: { id: true },
  });
  if (existing) return; // segunda execução não duplica

  const responsavelId = await resolveTaskResponsavel(task);
  if (!responsavelId) {
    result.skippedNoResponsavel++;
    return;
  }

  const vars = { tarefa: task.title, prazo: formatPrazo(task.due_date), projeto: task.project?.title ?? "—" };
  const allowed = ALLOWED_VARIABLES[rule.standard.key] ?? [];
  const title = renderTemplate(rule.standard.title, vars, allowed);
  const message = renderTemplate(rule.standard.message, vars, allowed);
  const severity = rule.severity_override ?? rule.standard.default_severity;

  const created = await prisma.systemAlert.create({
    data: {
      type: rule.standard.key,
      title,
      message,
      severity,
      category: "alerta",
      entity_type: "project_task",
      entity_id: task.id,
      user_id: responsavelId,
      standard_id: rule.standard.id,
      rule_id: rule.id,
      dedupe_key: dedupeKey,
    },
  });
  result.created++;

  await writeAccessAudit({
    actorId: null,
    action: "alert_occurrence.auto_created",
    before: undefined,
    after: {
      system_alert_id: created.id,
      trigger_type: rule.trigger_type,
      task_id: task.id,
      rule_id: rule.id,
      user_id: responsavelId,
    },
  });
}

async function resolveActiveOccurrences(input: { standardKey: string; entityId: string; reason: string }): Promise<void> {
  const active = await prisma.systemAlert.findMany({
    where: {
      entity_type: "project_task",
      entity_id: input.entityId,
      resolved_at: null,
      is_archived: false,
      standard: { key: input.standardKey },
    },
    select: { id: true },
  });
  for (const alert of active) {
    await resolveOccurrence(alert.id, input.reason);
  }
}

async function resolveOccurrence(alertId: string, reason: string): Promise<void> {
  await prisma.systemAlert.update({
    where: { id: alertId },
    data: { resolved_at: new Date(), resolution_reason: reason, is_archived: true, archived_at: new Date() },
  });
  await writeAccessAudit({
    actorId: null,
    action: "alert_occurrence.auto_resolved",
    after: { system_alert_id: alertId, reason },
  });
}

// ── Trava simples de execução concorrente ────────────────────────────────
// A implantação é sempre instância única (ver ecosystem.config.js:
// instances: 1), então uma trava em memória do próprio processo já evita
// duas varreduras sobrepostas — não é preciso lock distribuído.
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
