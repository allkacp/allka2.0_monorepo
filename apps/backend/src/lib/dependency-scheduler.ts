import { prisma } from "./prisma";
import { config } from "../config";
import { evaluateRule, reevaluateProjectDependencies } from "./project-dependencies";
import { logProjectDecision } from "./catalog2-cycles";

// Rede de segurança das dependências (Pedido 2): mesmo padrão dos outros workers — lê o
// banco a cada tick (nunca estado só em memória).
//   1) reavalia projetos com tarefas seguradas por dependência (libera/avança sozinho);
//   2) avisa o LÍDER quando uma dependência está atrasando um produto vinculado
//      (tarefa esperando há muito tempo ou tarefa-alvo vencida) — no máximo 1 aviso/24h por regra.

let running = false;
const DAY_MS = 86_400_000;

export async function runDependencySchedulerOnce(now: Date = new Date()): Promise<{ projects: number; alerts: number }> {
  const waiting = await prisma.projectTask.findMany({
    where: { status: { in: ["PENDENTE_DE_LIBERACAO", "AGUARDANDO_DEPENDENCIA_PRODUTO"] } },
    select: { project_id: true },
    distinct: ["project_id"],
    take: 200,
  });
  for (const w of waiting) await reevaluateProjectDependencies(prisma, w.project_id);

  const delayMs = config.DEPENDENCY_DELAY_ALERT_HOURS * 3_600_000;
  const rules = await prisma.projectDependencyRule.findMany({
    where: { OR: [{ alerted_at: null }, { alerted_at: { lt: new Date(now.getTime() - DAY_MS) } }] },
    take: 500,
  });
  let alerts = 0;
  for (const rule of rules) {
    const state = await evaluateRule(prisma, rule);
    if (state.satisfied) continue;
    const task = await prisma.projectTask.findUnique({
      where: { id: rule.task_id },
      select: { id: true, title: true, status: true, project_id: true, project_product_id: true, lider_responsavel_id: true, project: { select: { title: true, admin_responsible_user_id: true } } },
    });
    if (!task || ["CONCLUIDA", "CANCELADA", "APROVADA", "DISPENSADA_POR_REGRA"].includes(task.status)) continue;
    const target = rule.target_task_id ? await prisma.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { title: true, due_date: true, status: true } }) : null;
    const waitedLongEnough = now.getTime() - rule.created_at.getTime() >= delayMs;
    const targetOverdue = !!target?.due_date && target.due_date < now && !["CONCLUIDA", "APROVADA"].includes(target.status);
    if (!waitedLongEnough && !targetOverdue) continue;
    const userId = task.lider_responsavel_id ?? task.project.admin_responsible_user_id;
    if (!userId) continue;
    await prisma.systemAlert.create({
      data: {
        type: "dependencia_atrasada",
        title: `Dependência atrasando: ${task.title}`,
        message: `A tarefa "${task.title}" (projeto "${task.project.title}") está esperando: ${rule.reason}${targetOverdue ? ` — a tarefa vinculada "${target!.title}" está vencida.` : "."}`,
        severity: "warning", category: "alerta", entity_type: "project_task", entity_id: task.id, user_id: userId,
      },
    });
    await prisma.projectDependencyRule.update({ where: { id: rule.id }, data: { alerted_at: now } });
    await logProjectDecision(prisma, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: task.id, kind: "dependency_delay_alert", message: `O líder foi avisado: a dependência de "${task.title}" está atrasando (${rule.reason}).` });
    alerts++;
  }
  return { projects: waiting.length, alerts };
}

export async function runDependencySchedulerOnceGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runDependencySchedulerOnce();
  } catch (err) {
    console.error("[dependency-scheduler] erro no ciclo", err);
  } finally {
    running = false;
  }
}
