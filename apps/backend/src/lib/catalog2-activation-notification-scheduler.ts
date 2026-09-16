import { processPendingCatalog2NotificationJobs, sweepCatalog2ReadinessTransitions } from "./catalog2-notifications";

// ─── Worker de notificações do catalog2 (Item 8, reunião 2026-09-14; Item
// 8.1, "Fechar as notificações dos produtos") ────────────────────────────
// Mesmo padrão de catalog2-inactivation-scheduler.ts (e dos demais motores
// já em produção): trava em memória só evita duas execuções sobrepostas NO
// MESMO processo; a durabilidade de verdade vem de reler o estado DIRETO DO
// BANCO a cada tick — nunca de um timer guardando estado só em memória.
// Atraso ou reinício do servidor nunca perde nem duplica o envio: na volta,
// a mesma query encontra qualquer Job/destinatário ainda pendente e
// processa normalmente (idempotente por destinatário — ver o worker em
// catalog2-notifications.ts).
//
// Dois passos por tick, nessa ordem:
//   1. sweepCatalog2ReadinessTransitions — Item 8.1, "produto ativo que se
//      torna pronto depois": varre produtos "disponivel" procurando a
//      transição comercial_ready false->true SEM uma nova mudança de
//      status, e registra a intenção de anunciar quando encontra uma.
//   2. processPendingCatalog2NotificationJobs — processa QUALQUER Job
//      pendente (ativação, inativação, mudança de preço, renovação),
//      materializando destinatários quando preciso e enviando em lotes.

let running = false;

export async function runCatalog2ActivationNotificationSchedulerOnce(): Promise<{ flagged: number; completed: number; batches_sent: number }> {
  const sweep = await sweepCatalog2ReadinessTransitions();
  const jobs = await processPendingCatalog2NotificationJobs();
  return { flagged: sweep.flagged.length, completed: jobs.completed.length, batches_sent: jobs.batches_sent };
}

export async function runCatalog2ActivationNotificationSchedulerOnceGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runCatalog2ActivationNotificationSchedulerOnce();
  } catch (err) {
    console.error("[catalog2-activation-notification-scheduler] erro no ciclo", err);
  } finally {
    running = false;
  }
}
