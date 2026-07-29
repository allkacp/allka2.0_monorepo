/**
 * Backfill único: converte CatalogTask.steps que ainda estão salvos como
 * array de strings simples (formato antigo da tela /admin/tarefas) para o
 * formato rico [{name, description?, order}] que generate-tasks.ts já espera
 * ao materializar ProjectTaskStage. Sem isso, o texto da etapa se perde na
 * geração (vira só "Etapa N" genérico) — ver Fase 0 do plano de produtos.
 *
 * Idempotente: pula CatalogTasks cujo steps já está no formato rico (objetos).
 * Não apaga nem sobrescreve nenhum outro campo.
 *
 * Run:
 *   npx tsx apps/backend/src/scripts/backfill-catalog-task-steps.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.catalogTask.findMany({
    where: { steps: { not: null } },
    select: { id: true, code: true, name: true, steps: true },
  });

  let converted = 0;
  let alreadyRich = 0;
  let skippedInvalid = 0;

  for (const task of tasks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(task.steps as string);
    } catch {
      skippedInvalid++;
      console.warn(`[skip] ${task.code} — steps não é JSON válido`);
      continue;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      skippedInvalid++;
      continue;
    }

    const isPlainStringArray = parsed.every((item) => typeof item === "string");
    if (!isPlainStringArray) {
      alreadyRich++;
      continue;
    }

    const rich = parsed.map((name: string, idx: number) => ({
      name,
      order: idx + 1,
    }));

    await prisma.catalogTask.update({
      where: { id: task.id },
      data: { steps: JSON.stringify(rich) },
    });
    converted++;
    console.log(`[converted] ${task.code} — ${task.name} (${rich.length} etapas)`);
  }

  console.log(
    `\n[backfill-catalog-task-steps] done. converted=${converted} already_rich=${alreadyRich} skipped_invalid=${skippedInvalid} total=${tasks.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
