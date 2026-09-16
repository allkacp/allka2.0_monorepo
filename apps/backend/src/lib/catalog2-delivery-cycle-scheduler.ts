import { prisma } from "./prisma";
import { releaseCatalog2DeliveryCycle } from "./generate-tasks-catalog2";

// ─── Worker de ciclos de entrega mensal do catalog2 (Item 6.1, reunião
// 2026-09-14) ─────────────────────────────────────────────────────────────
// Mesmo padrão dos motores já em produção (alert-engine.ts,
// task-rotation-engine.ts, catalog2-inactivation-scheduler.ts,
// task-release-scheduler.ts): trava em memória só evita duas execuções
// sobrepostas NO MESMO processo; a durabilidade real vem de reler
// Catalog2ProjectDeliveryCycle DIRETO DO BANCO a cada tick — nunca de um
// timer guardando estado só em memória. Atraso ou reinício do servidor
// nunca perde nem duplica um ciclo: cada linha só é processada uma vez
// (status "pending" → "released"/"skipped" dentro da MESMA transação que
// gera as tarefas — ver releaseCatalog2DeliveryCycle).

let running = false;

export async function runCatalog2DeliveryCycleSchedulerOnce(): Promise<{ processed: number }> {
  const due = await prisma.catalog2ProjectDeliveryCycle.findMany({
    where: { status: "pending", scheduled_at: { lte: new Date() } },
    select: { id: true },
    take: 200,
  });

  let processed = 0;
  for (const row of due) {
    const outcome = await prisma
      .$transaction((tx) => releaseCatalog2DeliveryCycle(tx, row.id))
      .catch((err) => {
        console.error("[catalog2-delivery-cycle-scheduler] falha ao liberar ciclo", row.id, err);
        return null;
      });
    if (outcome === "released") processed += 1;
  }
  return { processed };
}

export async function runCatalog2DeliveryCycleSchedulerOnceGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runCatalog2DeliveryCycleSchedulerOnce();
  } catch (err) {
    console.error("[catalog2-delivery-cycle-scheduler] erro no ciclo", err);
  } finally {
    running = false;
  }
}
