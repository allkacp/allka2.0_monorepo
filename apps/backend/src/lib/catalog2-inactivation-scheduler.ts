import { processDueInactivations } from "./catalog2-service";

// ─── Worker de inativação programada do catalog2 (Item 5, reunião
// 2026-09-14) ────────────────────────────────────────────────────────────
// Mesmo padrão dos motores já em produção (alert-engine.ts,
// task-rotation-engine.ts, comms/index.ts, task-release-scheduler.ts): trava
// em memória só evita duas execuções sobrepostas NO MESMO processo; a
// durabilidade de verdade vem de reler `inactivation_effective_at` DIRETO DO
// BANCO a cada tick (`processDueInactivations`) — nunca de um timer
// guardando estado só em memória. Atraso ou reinício do servidor nunca perde
// o processamento: na volta, a mesma query encontra qualquer inativação já
// vencida e processa normalmente (idempotente por produto — ver
// `processDueInactivations` em catalog2-service.ts).
//
// Importante (regra 4 da tarefa): o BLOQUEIO de contratação em si NUNCA
// depende deste worker ter rodado — `checkClientVisibility` (catalog2-
// client.ts) já compara `inactivation_effective_at` contra a data atual
// AO VIVO. Este worker só formaliza o status="arquivado" e envia o aviso de
// encerramento; mesmo se ele atrasar, a validação de contratação já bloqueia
// desde o instante exato em que a data efetiva chegou.

let running = false;

export async function runCatalog2InactivationSchedulerOnce(): Promise<{ processed: number }> {
  const { processed } = await processDueInactivations();
  return { processed: processed.length };
}

export async function runCatalog2InactivationSchedulerOnceGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runCatalog2InactivationSchedulerOnce();
  } catch (err) {
    console.error("[catalog2-inactivation-scheduler] erro no ciclo", err);
  } finally {
    running = false;
  }
}
