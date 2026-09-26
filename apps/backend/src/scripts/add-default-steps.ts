/**
 * Cria UMA etapa padrão em cada tarefa do catalog2 que ainda não tem etapa
 * (regra: toda tarefa precisa de ao menos uma etapa — é ela que carrega
 * especialidade, horas e o pagamento). A etapa herda nome, horas e
 * especialidade da tarefa, então o preço calculado não muda.
 *
 *   npx tsx src/scripts/add-default-steps.ts          # simulação
 *   npx tsx src/scripts/add-default-steps.ts --apply  # grava
 */
import { prisma } from "../lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");
  const tasks = await prisma.catalog2Task.findMany({
    where: { steps: { none: {} } },
    select: { id: true, key: true, name: true, description: true, estimated_minutes: true, specialty_id: true, version_id: true },
  });
  console.log(`Tarefas sem etapa: ${tasks.length}`);
  const withMinutes = tasks.filter((t) => (t.estimated_minutes ?? 0) > 0).length;
  const withSpecialty = tasks.filter((t) => t.specialty_id).length;
  console.log(`  com horas: ${withMinutes} · com especialidade: ${withSpecialty}`);
  if (!apply) {
    console.log("Simulação: nada gravado. Rode com --apply.");
    return;
  }
  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const t of tasks) {
      await tx.catalog2TaskStep.create({
        data: {
          task_id: t.id,
          key: "principal",
          name: t.name.length > 190 ? t.name.slice(0, 190) : t.name,
          description: t.description ?? null,
          sort_order: 0,
          estimated_minutes: t.estimated_minutes ?? null,
          specialty_id: t.specialty_id ?? null,
          is_conditional: false,
        },
      });
      // Fica marcada para REVISÃO humana: o admin confere a etapa e clica em Salvar/Ok para confirmar.
      await tx.catalog2Task.update({ where: { id: t.id }, data: { effort_is_provisional: true, effort_source: "auto_default_step", effort_provisional_reason: "Etapa padrão criada automaticamente a partir da tarefa — revise e confirme." } });
      created++;
    }
  });
  console.log(`Etapas criadas: ${created}`);
}

main().catch((e) => { console.error("ERRO:", e.message ?? e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
