// Manutenção periódica das conexões: expira o que venceu (pausando só as atividades afetadas) e envia lembretes.
import { prisma } from "../prisma";
import { runConnectionMaintenance } from "./pending";

let running = false;
export async function runConnectionMaintenanceOnceGuarded() {
  if (running) return null;
  running = true;
  try {
    return await runConnectionMaintenance(prisma);
  } finally {
    running = false;
  }
}
