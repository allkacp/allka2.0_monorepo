/**
 * Seed QA v2 — Corrige separação de clientes por conta responsável
 *
 * Idempotente — usa upsert com IDs fixos; pode rodar quantas vezes quiser.
 * Não apaga dados. Não usa deleteMany. Só upsert e update.
 *
 * O que faz:
 *  1. Cria usuário `partner@allka.test` + PartnerProfile
 *  2. Renomeia agência → "Agency Conta Teste" + atualiza projetos existentes
 *  3. Renomeia empresa de company@allka.test → "Company Conta Teste"
 *  4. Remove vínculo de parceiro das empresas da agência (Coca-Cola, Starbucks, Google)
 *  5. Cria 3 empresas exclusivas do partner com CNPJs únicos
 *  6. Vincula essas empresas ao parceiro (referred_by_partner_id)
 *  7. Atualiza os 15 projetos do parceiro para usar as empresas certas
 *
 * Execução: cd apps/backend && npx tsx prisma/seed-qa-v2.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AGENCY_EMAIL    = "agencia@allka.test";
const COMPANY_EMAIL   = "company@allka.test";
const PARTNER_EMAIL   = "partner@allka.test";

const AGENCY_NAME_NEW  = "Agency Conta Teste";
const AGENCY_NAME_OLD  = "Lamego Teste Agency";
const COMPANY_NAME_NEW = "Company Conta Teste";

// 3 empresas exclusivas do partner (CNPJs únicos, claramente fictícios para QA)
const PARTNER_COMPANIES = [
  { id: "seed-partner-company-A", name: "Cliente Partner Alpha Ltda", cnpj: "30100100000101", segment: "Tecnologia" },
  { id: "seed-partner-company-B", name: "Cliente Partner Beta Ltda",  cnpj: "30200200000102", segment: "Marketing"  },
  { id: "seed-partner-company-C", name: "Cliente Partner Gamma Ltda", cnpj: "30300300000103", segment: "Design"     },
];

// Mapeamento: projeto → empresa do partner
const PARTNER_PROJECT_COMPANY_MAP: Record<string, string> = {
  "seed-partner-proj-01": "seed-partner-company-A",
  "seed-partner-proj-02": "seed-partner-company-A",
  "seed-partner-proj-03": "seed-partner-company-A",
  "seed-partner-proj-04": "seed-partner-company-A",
  "seed-partner-proj-05": "seed-partner-company-A",
  "seed-partner-proj-06": "seed-partner-company-B",
  "seed-partner-proj-07": "seed-partner-company-B",
  "seed-partner-proj-08": "seed-partner-company-B",
  "seed-partner-proj-09": "seed-partner-company-B",
  "seed-partner-proj-10": "seed-partner-company-B",
  "seed-partner-proj-11": "seed-partner-company-C",
  "seed-partner-proj-12": "seed-partner-company-C",
  "seed-partner-proj-13": "seed-partner-company-C",
  "seed-partner-proj-14": "seed-partner-company-C",
  "seed-partner-proj-15": "seed-partner-company-C",
};

// Empresas da agência que foram linkadas incorretamente ao parceiro anterior
const AGENCY_COMPANY_IDS_TO_UNLINK = [
  "seed-ag-client-coca-cola",
  "seed-ag-client-starbucks",
  "seed-ag-client-google",
];

async function main() {
  console.log("🌱 Seed QA v2 — Separação correta de clientes por conta responsável\n");

  const passwordHash = await bcrypt.hash("Allka@2026", 10);

  // ── 1. Criar usuário partner@allka.test ───────────────────────────────────
  await prisma.user.upsert({
    where: { email: PARTNER_EMAIL },
    update: { is_active: true, name: "Partner Conta Teste" },
    create: {
      email: PARTNER_EMAIL,
      password_hash: passwordHash,
      name: "Partner Conta Teste",
      role: "partner",
      account_type: "parceiro",
      is_active: true,
    },
  });
  const partnerUser = await prisma.user.findUnique({ where: { email: PARTNER_EMAIL } });
  console.log(`  ✓ Usuário → ${PARTNER_EMAIL} (${partnerUser!.name})`);

  // ── 2. Criar/atualizar PartnerProfile para partner@allka.test ─────────────
  await prisma.partnerProfile.upsert({
    where: { user_id: partnerUser!.id },
    update: { status: "active" },
    create: {
      user_id: partnerUser!.id,
      status: "active",
      referral_code: "PARTNERTEST",
      referral_link: "https://allka.com.br/ref/partnertest",
      balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
    },
  });
  const partnerProfile = await prisma.partnerProfile.findUnique({
    where: { user_id: partnerUser!.id },
  });
  console.log(`  ✓ PartnerProfile → id: ${partnerProfile!.id}\n`);

  // ── 3. Renomear agência → "Agency Conta Teste" ────────────────────────────
  const agencyUser = await prisma.user.findUnique({
    where: { email: AGENCY_EMAIL },
    include: { agency: true },
  });
  if (agencyUser?.agency) {
    await prisma.agency.update({
      where: { id: agencyUser.agency.id },
      data: { name: AGENCY_NAME_NEW },
    });
    console.log(`  ✓ Agência renomeada → "${AGENCY_NAME_NEW}"`);

    // Atualizar projetos com o nome antigo da agência
    const updated = await prisma.project.updateMany({
      where: { agency: AGENCY_NAME_OLD },
      data: { agency: AGENCY_NAME_NEW },
    });
    console.log(`  ✓ Projetos agência atualizados → ${updated.count} registro(s) de "${AGENCY_NAME_OLD}" → "${AGENCY_NAME_NEW}"\n`);
  } else {
    console.warn(`  ⚠  Usuário ${AGENCY_EMAIL} ou agência não encontrado\n`);
  }

  // ── 4. Renomear empresa de company@allka.test → "Company Conta Teste" ─────
  const companyUser = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { company_id: true },
  });
  if (companyUser?.company_id) {
    await prisma.company.update({
      where: { id: companyUser.company_id },
      data: { name: COMPANY_NAME_NEW },
    });
    console.log(`  ✓ Empresa renomeada → "${COMPANY_NAME_NEW}" (id: ${companyUser.company_id})\n`);
  } else {
    console.warn(`  ⚠  Usuário ${COMPANY_EMAIL} sem company_id\n`);
  }

  // ── 4b. Limpar campo agency dos projetos da Company (não devem ter agency) ──
  if (companyUser?.company_id) {
    const clearedAgency = await prisma.project.updateMany({
      where: { client_id: companyUser.company_id, agency: { not: null } },
      data: { agency: null },
    });
    if (clearedAgency.count > 0) {
      console.log(`  ✓ Campo agency limpo em ${clearedAgency.count} projeto(s) da Company\n`);
    }
  }

  // ── 5. Desvincular empresas da agência do parceiro anterior ───────────────
  const unlinked = await prisma.company.updateMany({
    where: { id: { in: AGENCY_COMPANY_IDS_TO_UNLINK } },
    data: { referred_by_partner_id: null },
  });
  console.log(`  ✓ Desvinculadas ${unlinked.count} empresa(s) da agência do parceiro anterior\n`);

  // ── 6. Criar 3 empresas exclusivas do partner ─────────────────────────────
  console.log("  Criando empresas do Partner:");
  for (const c of PARTNER_COMPANIES) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: { name: c.name, referred_by_partner_id: partnerProfile!.id },
      create: {
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        segment: c.segment,
        status: "ativo",
        referred_by_partner_id: partnerProfile!.id,
      },
    });
    console.log(`    ✓ ${c.name} (CNPJ: ${c.cnpj})`);
  }
  console.log();

  // ── 7. Atualizar projetos do partner para usar empresas certas ────────────
  console.log("  Atualizando projetos do Partner:");
  for (const [projectId, companyId] of Object.entries(PARTNER_PROJECT_COMPANY_MAP)) {
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!proj) {
      console.warn(`    ⚠  Projeto ${projectId} não encontrado — rode seed-qa-projects.ts primeiro`);
      continue;
    }
    await prisma.project.update({
      where: { id: projectId },
      data: { client_id: companyId, agency: null },
    });
    console.log(`    ✓ ${proj.title} → client_id: ${companyId}`);
  }
  console.log();

  // ── 8. Relatório final ────────────────────────────────────────────────────
  const totalAll    = await prisma.project.count();
  const agencyCount = await prisma.project.count({ where: { agency: AGENCY_NAME_NEW } });
  const companyCount = companyUser?.company_id
    ? await prisma.project.count({ where: { client_id: companyUser.company_id } })
    : 0;
  const partnerCompanyIds = PARTNER_COMPANIES.map((c) => c.id);
  const partnerCount = await prisma.project.count({ where: { client_id: { in: partnerCompanyIds } } });

  console.log("✅ Seed QA v2 concluído:");
  console.log(`   Agency Conta Teste       : ${agencyCount} projetos`);
  console.log(`   Company Conta Teste       : ${companyCount} projetos`);
  console.log(`   Partner Conta Teste       : ${partnerCount} projetos`);
  console.log(`   Total no banco            : ${totalAll} projetos`);
  console.log("\n💡 Logins de teste:");
  console.log(`   Agency  → ${AGENCY_EMAIL}`);
  console.log(`   Company → ${COMPANY_EMAIL}`);
  console.log(`   Partner → ${PARTNER_EMAIL} (NOVO)`);
  console.log("   Senha de todos: Allka@2026");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
