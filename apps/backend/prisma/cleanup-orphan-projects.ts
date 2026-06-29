import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Show what we're about to delete
  const orphans = await prisma.project.findMany({
    where: { agency: null },
    select: { id: true, title: true, status: true },
  });
  const testAgency = await prisma.project.findMany({
    where: { agency: { in: ["Escola Crescer & Aprender", "Cliente E2E Test", "teste"] } },
    select: { id: true, title: true, agency: true, status: true },
  });

  console.log(`\nProjetos sem agência (${orphans.length}):`);
  for (const p of orphans) console.log(`  [${p.status}] ${p.title}`);

  console.log(`\nProjetos de agências de teste (${testAgency.length}):`);
  for (const p of testAgency) console.log(`  [${p.agency}] ${p.title}`);

  const orphanIds = orphans.map((p) => p.id);
  const testIds   = testAgency.map((p) => p.id);
  const allIds    = [...orphanIds, ...testIds];

  // Cascade-delete / nullify all dependent records first
  await prisma.payment.deleteMany({ where: { project_id: { in: allIds } } });
  await prisma.invoice.updateMany({ where: { project_id: { in: allIds } }, data: { project_id: null } });
  await prisma.taskExecution.deleteMany({ where: { project_id: { in: allIds } } });
  await prisma.projectTask.deleteMany({ where: { project_id: { in: allIds } } });

  const del1 = await prisma.project.deleteMany({ where: { id: { in: orphanIds } } });
  const del2 = await prisma.project.deleteMany({ where: { id: { in: testIds } } });

  console.log(`\nDeletados: ${del1.count} (sem agência) + ${del2.count} (agências de teste)`);

  const remaining = await prisma.project.count();
  const byAgency = await prisma.project.groupBy({
    by: ["agency"],
    _count: { id: true },
  });
  console.log(`\nProjetos restantes: ${remaining}`);
  for (const g of byAgency) {
    console.log(`  "${g.agency ?? "(sem agência)"}" → ${g._count.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
