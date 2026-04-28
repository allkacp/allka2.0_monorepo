import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function run() {
  const companies = await p.company.findMany({ select: { id: true, name: true }, take: 12 });
  console.log("\n=== Companies (id format) ===");
  companies.forEach(c => console.log(`  ${c.name.padEnd(35)} id=${c.id}`));

  const users = await p.user.findMany({ where: { company_id: { not: null } }, select: { name: true, email: true, company_id: true }, take: 6 });
  console.log("\n=== Users with company_id ===");
  users.forEach(u => console.log(`  ${u.name.padEnd(25)} company_id=${u.company_id}`));

  const total = await p.user.count({ where: { company_id: { not: null } } });
  console.log(`\n  Total users with company_id: ${total}`);
  await p.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
