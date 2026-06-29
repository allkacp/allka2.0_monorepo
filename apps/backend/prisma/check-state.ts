import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Agency info for agencia@allka.test
  const user = await prisma.user.findUnique({
    where: { email: "agencia@allka.test" },
    include: { agency: true },
  });
  console.log("\n=== Agência agencia@allka.test ===");
  console.log("User name:", user?.name);
  console.log("Agency name:", user?.agency?.name);
  console.log("Agency id:", user?.agency?.id);

  // Projects per agency name
  const byAgency = await prisma.project.groupBy({
    by: ["agency"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("\n=== Projetos por agência ===");
  for (const g of byAgency) {
    console.log(`  "${g.agency ?? "(sem agência)"}" → ${g._count.id} projetos`);
  }

  // Total
  const total = await prisma.project.count();
  console.log("\nTotal projetos no banco:", total);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
