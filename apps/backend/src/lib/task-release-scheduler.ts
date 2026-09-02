import { prisma } from "./prisma";
import { satisfyScheduledDateTrigger, PENDING_RELEASE_STATUS } from "./task-release-service";

const BLOCKED_TOO_LONG_MS = 48 * 60 * 60 * 1000; // 48h — "além do esperado"

// ─── Worker de gatilho por data programada (bloco 4/4) ──────────────────────
// Mesmo padrão real dos 3 motores já em produção (alert-engine.ts,
// task-rotation-engine.ts, comms/index.ts): trava em memória só evita duas
// execuções sobrepostas NO MESMO processo; a durabilidade de verdade vem de
// reler o trabalho pendente DIRETO DO BANCO a cada tick — nunca de um timer
// guardando estado só em memória. Atraso ou reinício do servidor nunca perde
// o gatilho: na volta, a mesma query encontra qualquer `scheduled_at` já
// vencido e processa normalmente (idempotente — ver satisfyScheduledDateTrigger).

let running = false;

export async function runTaskReleaseSchedulerOnce(): Promise<{ processed: number }> {
  const due = await prisma.taskReleaseTrigger.findMany({
    where: { trigger_type: "scheduled_date", status: "pending", scheduled_at: { lte: new Date() } },
    take: 200,
  });

  let processed = 0;
  for (const trigger of due) {
    const changed = await satisfyScheduledDateTrigger(trigger.id).catch((err) => {
      console.error("[task-release-scheduler] falha ao satisfazer gatilho de data", trigger.id, err);
      return false;
    });
    if (changed) processed += 1;
  }

  await notifyLongBlockedTasks();
  return { processed };
}

/** "Alerta quando bloqueio permanecer além do esperado" — nunca duplica: só
 * avisa uma tarefa que ainda não tem um evento `release_blocked_notice`
 * registrado (o alerta em si soma ao histórico da tarefa, então reler o
 * próprio histórico já é o dedupe, sem precisar de tabela/flag extra). */
async function notifyLongBlockedTasks(): Promise<void> {
  const threshold = new Date(Date.now() - BLOCKED_TOO_LONG_MS);
  const stuckTasks = await prisma.projectTask.findMany({
    where: { status: PENDING_RELEASE_STATUS, created_at: { lte: threshold } },
    select: { id: true, title: true, project_id: true },
    take: 200,
  });

  for (const task of stuckTasks) {
    const alreadyNotified = await prisma.taskReleaseEvent.findFirst({ where: { task_id: task.id, event_type: "release_blocked_notice" } });
    if (alreadyNotified) continue;

    const project = await prisma.project.findUnique({ where: { id: task.project_id }, select: { admin_responsible_user_id: true } });
    await prisma.taskReleaseEvent.create({
      data: { task_id: task.id, event_type: "release_blocked_notice", description: "Bloqueio de liberação permanece além do esperado (48h)." },
    });
    if (project?.admin_responsible_user_id) {
      await prisma.systemAlert
        .create({
          data: {
            type: "liberacao_bloqueada_alem_esperado",
            title: "Tarefa bloqueada há mais tempo que o esperado",
            message: `A tarefa "${task.title}" está pendente de liberação há mais de 48h.`,
            severity: "warning",
            category: "alerta",
            entity_type: "project_task",
            entity_id: task.id,
            user_id: project.admin_responsible_user_id,
          },
        })
        .catch(() => {});
    }
  }
}

export async function runTaskReleaseSchedulerOnceGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runTaskReleaseSchedulerOnce();
  } catch (err) {
    console.error("[task-release-scheduler] erro no ciclo", err);
  } finally {
    running = false;
  }
}
