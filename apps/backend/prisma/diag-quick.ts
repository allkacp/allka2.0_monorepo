import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const projects = await p.project.findMany({
    include: { client: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });

  // Bulk count queries
  const ppCounts   = await p.projectProduct.groupBy({ by: ["project_id"], _count: { id: true } });
  const ptCounts   = await p.projectTask.groupBy({ by: ["project_id"], _count: { id: true } });
  const credCounts = await p.projectCredential.groupBy({ by: ["project_id"], _count: { id: true } });
  const invCounts  = await p.invoice.groupBy({ by: ["project_id"], _count: { id: true } });

  const ppMap   = Object.fromEntries(ppCounts.map((r) => [r.project_id, r._count.id]));
  const ptMap   = Object.fromEntries(ptCounts.map((r) => [r.project_id, r._count.id]));
  const credMap = Object.fromEntries(credCounts.map((r) => [r.project_id, r._count.id]));
  const invMap  = Object.fromEntries(invCounts.map((r) => [r.project_id, r._count.id]));

  console.log("=== PROJETOS (" + projects.length + ") ===");
  for (const pr of projects) {
    console.log(JSON.stringify({
      id:     pr.id,
      title:  (pr.title || "").substring(0, 40),
      status: pr.status,
      client: (pr.client?.name || "").substring(0, 25),
      pp:     ppMap[pr.id] ?? 0,
      pt:     ptMap[pr.id] ?? 0,
      cr:     credMap[pr.id] ?? 0,
      inv:    invMap[pr.id] ?? 0,
    }));
  }

  const prods = await p.product.findMany({ select: { id: true, name: true, code: true }, orderBy: { code: "asc" } });
  console.log("\n=== PRODUTOS (" + prods.length + ") ===");
  prods.forEach((pr) => console.log(JSON.stringify({ id: pr.id, code: pr.code, name: (pr.name || "").substring(0, 40) })));

  const cos = await p.company.findMany({ select: { id: true, name: true, type: true }, orderBy: { id: "asc" } });
  console.log("\n=== EMPRESAS (" + cos.length + ") ===");
  cos.forEach((c) => console.log(JSON.stringify({ id: c.id, name: (c.name || "").substring(0, 35), type: c.type })));
}
main().catch((e) => console.error("ERR:", e.message)).finally(() => p.$disconnect());
