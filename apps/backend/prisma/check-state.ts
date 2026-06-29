import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Agency info
  const agencyUser = await prisma.user.findUnique({
    where: { email: "agencia@allka.test" },
    include: { agency: true },
  });
  console.log("\n=== Agency (agencia@allka.test) ===");
  console.log("User name :", agencyUser?.name);
  console.log("Agency    :", agencyUser?.agency?.name);

  // Company info
  const companyUser = await prisma.user.findUnique({
    where: { email: "company@allka.test" },
    select: { name: true, company_id: true, company: { select: { name: true } } },
  });
  console.log("\n=== Company (company@allka.test) ===");
  console.log("User name    :", companyUser?.name);
  console.log("Company name :", companyUser?.company?.name);
  console.log("company_id   :", companyUser?.company_id);

  // Partner info
  const partnerUser = await prisma.user.findUnique({
    where: { email: "partner@allka.test" },
    include: { partner: { include: { referred_companies: { select: { id: true, name: true, referred_by_partner_id: true } } } } },
  });
  console.log("\n=== Partner (partner@allka.test) ===");
  console.log("User name       :", partnerUser?.name);
  console.log("PartnerProfile  :", partnerUser?.partner?.id ?? "❌ NOT FOUND");
  if (partnerUser?.partner?.referred_companies?.length) {
    console.log("Referred companies:");
    for (const c of partnerUser.partner.referred_companies) {
      console.log(`  - ${c.name} (referred_by_partner_id: ${c.referred_by_partner_id})`);
    }
  } else {
    console.log("Referred companies: ❌ NONE");
  }

  // Projects per type
  const agencyCount = await prisma.project.count({ where: { agency: "Agency Conta Teste" } });
  const companyCount = companyUser?.company_id
    ? await prisma.project.count({ where: { client_id: companyUser.company_id } })
    : 0;
  const partnerCompanyIds = ["seed-partner-company-A", "seed-partner-company-B", "seed-partner-company-C"];
  const partnerCount = await prisma.project.count({ where: { client_id: { in: partnerCompanyIds } } });
  const total = await prisma.project.count();

  console.log("\n=== Projetos por portal ===");
  console.log(`Agency  : ${agencyCount}  (esperado: 15)`);
  console.log(`Company : ${companyCount}  (esperado: 15)`);
  console.log(`Partner : ${partnerCount}  (esperado: 15)`);
  console.log(`Total   : ${total}`);

  // Partner companies verification
  console.log("\n=== Partner companies (referred_by_partner_id) ===");
  for (const cid of partnerCompanyIds) {
    const c = await prisma.company.findUnique({ where: { id: cid }, select: { name: true, referred_by_partner_id: true } });
    if (!c) { console.log(`  ${cid}: ❌ NÃO EXISTE`); continue; }
    const ok = c.referred_by_partner_id ? "✅" : "❌ NULL";
    console.log(`  ${c.name}: ${ok} (referred_by_partner_id: ${c.referred_by_partner_id ?? "null"})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
