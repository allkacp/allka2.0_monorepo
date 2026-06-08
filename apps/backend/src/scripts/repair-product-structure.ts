import "dotenv/config";
import { prisma } from "../lib/prisma";
import { main as repairCatalogTaskStructure } from "./seed-catalog-tasks";
import { main as auditProductStructure } from "./audit-products";

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  REPAIR: Estrutura de Produtos / Tarefas / Etapas");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("─── Auditoria inicial ──────────────────────────────────────");
  await auditProductStructure();

  console.log("\n─── Reparo idempotente ────────────────────────────────────");
  await repairCatalogTaskStructure();

  console.log("\n─── Auditoria final ───────────────────────────────────────");
  await auditProductStructure();

  console.log("\n✅ Reparo de estrutura concluído");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("❌ Erro no reparo de estrutura:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { main };
