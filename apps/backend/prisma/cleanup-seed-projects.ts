import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.project.count({
    where: { id: { startsWith: "seed-ag-proj-" } },
  });
  console.log("Projetos seed encontrados:", count);

  const del = await prisma.project.deleteMany({
    where: { id: { startsWith: "seed-ag-proj-" } },
  });
  console.log("Projetos deletados:", del.count);

  const remaining = await prisma.project.count();
  console.log("Projetos restantes no banco:", remaining);

  // Also show what's left
  const projects = await prisma.project.findMany({
    select: { id: true, title: true, agency: true, status: true },
    orderBy: { created_at: "desc" },
  });
  console.log("\nProjetos reais existentes:");
  for (const p of projects) {
    console.log(`  [${p.status}] ${p.title} (agency: ${p.agency ?? "—"})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
