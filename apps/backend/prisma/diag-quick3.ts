import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const company = await p.company.findFirst({ where: { id: { startsWith: "seed-co" } }, select: { id: true, name: true } });
  console.log("=== EMPRESA CONTA TESTE ==="); console.log(JSON.stringify(company));

  const agency = await p.agency.findFirst({ include: { user: { select: { id: true, email: true } } } });
  console.log("\n=== AGENCY ==="); console.log(JSON.stringify({ id: agency?.id, name: agency?.name, userId: agency?.user?.id, email: agency?.user?.email }));

  const proj11 = await p.project.findUnique({ where: { id: "seed-co-proj-11" }, select: { client_id: true, agency: true } });
  console.log("\n=== seed-co-proj-11 ==="); console.log(JSON.stringify(proj11));

  const companyCo = await p.company.findUnique({ where: { id: proj11?.client_id ?? "" }, select: { id: true, name: true, cnpj: true } });
  console.log("\n=== Company Conta Teste ==="); console.log(JSON.stringify(companyCo));

  const catTasks = await p.catalogTask.findMany({
    select: { id: true, code: true, category: true, task_type: true, briefing_questions: true, product_links: { select: { product: { select: { id: true, name: true } } } } },
  });
  console.log("\n=== CATALOG TASKS (" + catTasks.length + ") ===");
  catTasks.forEach((ct) => {
    const bq = ct.briefing_questions ? JSON.parse(ct.briefing_questions as string) : [];
    console.log(JSON.stringify({ id: ct.id, code: ct.code, cat: ct.category, type: ct.task_type, bq_count: bq.length, prods: ct.product_links.map((l) => l.product?.id) }));
  });
}
main().catch((e) => console.error("ERR:", e.message)).finally(() => p.$disconnect());
