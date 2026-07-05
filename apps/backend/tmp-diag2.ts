import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const companies = await p.company.findMany({
    where: { id: { in: ["seed-partner-company-A","seed-partner-company-B","seed-partner-company-C"] } },
    select: { id: true, name: true }
  });
  console.log("COMPANIES:" + JSON.stringify(companies));
  const pp = await p.projectProduct.findMany({
    where: { project_id: "seed-partner-proj-02" },
    select: { id: true, product_id: true, product_name_snapshot: true, product_code_snapshot: true, status: true,
      tasks: { select: { id: true, title: true, task_code: true, status: true,
        stages: { select: { id: true, titulo: true, ordem: true, status: true }, orderBy: { ordem: "asc" } }
      }}
    }
  });
  console.log("PP:" + JSON.stringify(pp, null, 2));
  const prods = await p.product.findMany({
    where: { id: { in: ["DC0001","DC0002"] } },
    select: { id: true, name: true, category: true, base_price: true }
  });
  console.log("PRODS:" + JSON.stringify(prods));
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
