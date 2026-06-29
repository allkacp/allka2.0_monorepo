/**
 * Seed: Dados QA para os 3 portais (agência, empresa, parceiro)
 *
 * Idempotente — usa upsert com IDs fixos; pode rodar quantas vezes quiser.
 *
 * O que faz:
 *  1. Adiciona 5 projetos extras para a agência "Lamego Teste Agency" (total: 15)
 *  2. Garante que parceiro@allka.com.vc tem PartnerProfile ativo
 *  3. Marca 3 empresas (já criadas pelo seed-agencia-data) como referidas por esse parceiro
 *  4. Upsert de 15 projetos para essas empresas (5 por empresa)
 *
 * Execução: cd apps/backend && npx tsx prisma/seed-qa-projects.ts
 *
 * Contagem final esperada no banco:
 *   Agência (Lamego Teste Agency): 15 projetos
 *   Empresa (company@allka.test):  15 projetos
 *   Parceiro (parceiro@allka.com.vc via empresas referidas): 15 projetos
 *   TOTAL admin:                   45 projetos
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGENCY_NAME    = "Lamego Teste Agency";
const PARTNER_EMAIL  = "parceiro@allka.com.vc";

// Empresas criadas pelo seed-agencia-data.ts — as 3 primeiras serão linked ao parceiro
const PARTNER_COMPANY_IDS = [
  "seed-ag-client-coca-cola",
  "seed-ag-client-starbucks",
  "seed-ag-client-google",
];

// ─── 5 projetos extras para agência (proj-11 a proj-15) ─────────────────────
const AGENCY_EXTRA_PROJECTS = [
  {
    id: "seed-ag-proj-11",
    title: "Estratégia de Growth Hacking",
    client_id: "seed-ag-client-nubank",
    type: "Marketing Digital",
    status: "in-progress",
    progress: 55,
    budget: 18000,
    value: 18000,
    start_date: new Date("2026-04-01"),
    end_date: new Date("2026-07-31"),
    created_at: new Date("2026-03-20T09:00:00Z"),
  },
  {
    id: "seed-ag-proj-12",
    title: "Campanha de Lançamento Produto",
    client_id: "seed-ag-client-natura",
    type: "Campanha",
    status: "planning",
    progress: 10,
    budget: 42000,
    value: 42000,
    start_date: new Date("2026-06-01"),
    end_date: new Date("2026-09-30"),
    created_at: new Date("2026-05-10T14:00:00Z"),
  },
  {
    id: "seed-ag-proj-13",
    title: "SEO & Performance Mensal",
    client_id: "seed-ag-client-tesla",
    type: "SEO",
    status: "in-progress",
    progress: 70,
    budget: 7200,
    value: 7200,
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31"),
    created_at: new Date("2025-12-10T10:00:00Z"),
  },
  {
    id: "seed-ag-proj-14",
    title: "Webinar de Automação Industrial",
    client_id: "seed-ag-client-ambev",
    type: "Evento Digital",
    status: "draft",
    progress: 0,
    budget: 22000,
    value: 22000,
    start_date: new Date("2026-08-15"),
    end_date: new Date("2026-08-15"),
    created_at: new Date("2026-06-01T08:00:00Z"),
  },
  {
    id: "seed-ag-proj-15",
    title: "Dashboard Analítico BI",
    client_id: "seed-ag-client-embraer",
    type: "Desenvolvimento Web",
    status: "negotiation",
    progress: 5,
    budget: 58000,
    value: 58000,
    start_date: new Date("2026-07-01"),
    end_date: new Date("2026-12-31"),
    created_at: new Date("2026-05-28T11:00:00Z"),
  },
];

// ─── 15 projetos para o parceiro (5 por empresa referida) ────────────────────
const PARTNER_PROJECTS = [
  // Coca-Cola Brasil (seed-ag-client-coca-cola)
  {
    id: "seed-partner-proj-01",
    title: "Identidade Visual Verão 2027",
    client_id: "seed-ag-client-coca-cola",
    type: "Branding",
    status: "in-progress",
    progress: 45,
    budget: 32000,
    value: 32000,
    start_date: new Date("2026-05-01"),
    end_date: new Date("2026-08-31"),
    created_at: new Date("2026-04-15T10:00:00Z"),
  },
  {
    id: "seed-partner-proj-02",
    title: "Campanha Digital Copa",
    client_id: "seed-ag-client-coca-cola",
    type: "Campanha",
    status: "planning",
    progress: 20,
    budget: 75000,
    value: 75000,
    start_date: new Date("2026-09-01"),
    end_date: new Date("2026-12-15"),
    created_at: new Date("2026-07-01T09:00:00Z"),
  },
  {
    id: "seed-partner-proj-03",
    title: "E-commerce Drinks Premium",
    client_id: "seed-ag-client-coca-cola",
    type: "Desenvolvimento Web",
    status: "draft",
    progress: 0,
    budget: 90000,
    value: 90000,
    start_date: new Date("2026-10-01"),
    end_date: new Date("2027-02-28"),
    created_at: new Date("2026-06-20T14:00:00Z"),
  },
  {
    id: "seed-partner-proj-04",
    title: "Influencer Hub Micro",
    client_id: "seed-ag-client-coca-cola",
    type: "Social Media",
    status: "in-progress",
    progress: 60,
    budget: 15000,
    value: 15000,
    start_date: new Date("2026-04-01"),
    end_date: new Date("2026-09-30"),
    created_at: new Date("2026-03-28T11:00:00Z"),
  },
  {
    id: "seed-partner-proj-05",
    title: "App Loyalty Refresh",
    client_id: "seed-ag-client-coca-cola",
    type: "UX/UI",
    status: "completed",
    progress: 100,
    budget: 48000,
    value: 48000,
    start_date: new Date("2025-11-01"),
    end_date: new Date("2026-02-28"),
    created_at: new Date("2025-10-15T08:00:00Z"),
  },
  // Starbucks Coffee (seed-ag-client-starbucks)
  {
    id: "seed-partner-proj-06",
    title: "Menu Digital Interativo",
    client_id: "seed-ag-client-starbucks",
    type: "UX/UI",
    status: "in-progress",
    progress: 35,
    budget: 24000,
    value: 24000,
    start_date: new Date("2026-05-15"),
    end_date: new Date("2026-08-15"),
    created_at: new Date("2026-05-01T10:00:00Z"),
  },
  {
    id: "seed-partner-proj-07",
    title: "Campanha Sazonalidade",
    client_id: "seed-ag-client-starbucks",
    type: "Social Media",
    status: "planning",
    progress: 15,
    budget: 19000,
    value: 19000,
    start_date: new Date("2026-08-01"),
    end_date: new Date("2026-11-30"),
    created_at: new Date("2026-06-10T14:00:00Z"),
  },
  {
    id: "seed-partner-proj-08",
    title: "Treinamento Digital Baristas",
    client_id: "seed-ag-client-starbucks",
    type: "E-learning",
    status: "awaiting-payment",
    progress: 0,
    budget: 38000,
    value: 38000,
    start_date: new Date("2026-09-01"),
    end_date: new Date("2026-12-31"),
    created_at: new Date("2026-05-25T09:00:00Z"),
  },
  {
    id: "seed-partner-proj-09",
    title: "Email Marketing Mensal 2026",
    client_id: "seed-ag-client-starbucks",
    type: "E-mail Marketing",
    status: "in-progress",
    progress: 80,
    budget: 6000,
    value: 6000,
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31"),
    created_at: new Date("2025-12-20T11:00:00Z"),
  },
  {
    id: "seed-partner-proj-10",
    title: "Podcast Café com Cultura",
    client_id: "seed-ag-client-starbucks",
    type: "Conteúdo",
    status: "draft",
    progress: 0,
    budget: 12000,
    value: 12000,
    start_date: new Date("2026-10-01"),
    end_date: new Date("2026-12-31"),
    created_at: new Date("2026-06-15T08:00:00Z"),
  },
  // Google Brasil (seed-ag-client-google)
  {
    id: "seed-partner-proj-11",
    title: "Portfólio de Casos de Sucesso",
    client_id: "seed-ag-client-google",
    type: "Content",
    status: "in-progress",
    progress: 50,
    budget: 28000,
    value: 28000,
    start_date: new Date("2026-04-01"),
    end_date: new Date("2026-09-30"),
    created_at: new Date("2026-03-20T10:00:00Z"),
  },
  {
    id: "seed-partner-proj-12",
    title: "Ads Performance Max Q3",
    client_id: "seed-ag-client-google",
    type: "Marketing Digital",
    status: "planning",
    progress: 5,
    budget: 55000,
    value: 55000,
    start_date: new Date("2026-07-01"),
    end_date: new Date("2026-09-30"),
    created_at: new Date("2026-05-30T14:00:00Z"),
  },
  {
    id: "seed-partner-proj-13",
    title: "Site Corporativo Responsive",
    client_id: "seed-ag-client-google",
    type: "Desenvolvimento Web",
    status: "completed",
    progress: 100,
    budget: 40000,
    value: 40000,
    start_date: new Date("2025-10-01"),
    end_date: new Date("2026-01-31"),
    created_at: new Date("2025-09-15T08:00:00Z"),
  },
  {
    id: "seed-partner-proj-14",
    title: "Workshop IA para Times",
    client_id: "seed-ag-client-google",
    type: "Consultoria",
    status: "draft",
    progress: 0,
    budget: 18000,
    value: 18000,
    start_date: new Date("2026-09-15"),
    end_date: new Date("2026-09-15"),
    created_at: new Date("2026-06-01T11:00:00Z"),
  },
  {
    id: "seed-partner-proj-15",
    title: "Relatório de Benchmarking Anual",
    client_id: "seed-ag-client-google",
    type: "Consultoria",
    status: "in-progress",
    progress: 30,
    budget: 22000,
    value: 22000,
    start_date: new Date("2026-06-01"),
    end_date: new Date("2026-08-31"),
    created_at: new Date("2026-05-20T09:00:00Z"),
  },
];

async function main() {
  console.log("🌱 Seed QA — 45 projetos totais (agência + empresa + parceiro)\n");

  // ── 1. Garantir PartnerProfile para parceiro@allka.com.vc ──────────────────
  const partnerUser = await prisma.user.findUnique({
    where: { email: PARTNER_EMAIL },
  });
  if (!partnerUser) {
    console.error(`❌ Usuário ${PARTNER_EMAIL} não encontrado. Execute seed.ts primeiro.`);
    process.exit(1);
  }

  await prisma.partnerProfile.upsert({
    where: { user_id: partnerUser.id },
    update: { status: "active" },
    create: {
      user_id: partnerUser.id,
      status: "active",
      referral_code: "ALLKADEV",
      referral_link: "https://allka.com.br/ref/allkadev",
      balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
    },
  });
  const partnerProfile = await prisma.partnerProfile.findUnique({
    where: { user_id: partnerUser.id },
  });
  console.log(`  ✓ PartnerProfile → ${PARTNER_EMAIL} (id: ${partnerProfile!.id})`);

  // ── 2. Vincular 3 empresas ao parceiro ────────────────────────────────────
  for (const companyId of PARTNER_COMPANY_IDS) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      console.warn(`  ⚠  Empresa ${companyId} não encontrada — pule o seed-agencia-data.ts primeiro`);
      continue;
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { referred_by_partner_id: partnerProfile!.id },
    });
    console.log(`  ✓ Empresa vinculada ao parceiro → ${company.name}`);
  }
  console.log();

  // ── 3. Upsert 5 projetos extras da agência ────────────────────────────────
  console.log("  Agência — 5 projetos extras:");
  for (const p of AGENCY_EXTRA_PROJECTS) {
    const { created_at, ...rest } = p;
    await prisma.project.upsert({
      where: { id: p.id },
      update: { title: p.title, status: p.status, progress: p.progress },
      create: {
        ...rest,
        agency: AGENCY_NAME,
        company_type: "company",
        lifecycle: "avulso",
        created_at,
      },
    });
    console.log(`    ✓ [${p.status.padEnd(17)}] ${p.title}`);
  }

  const agencyTotal = await prisma.project.count({ where: { agency: AGENCY_NAME } });
  console.log(`\n  Agência total no banco: ${agencyTotal} projeto(s)\n`);

  // ── 4. Upsert 15 projetos do parceiro ─────────────────────────────────────
  console.log("  Parceiro — 15 projetos:");
  for (const p of PARTNER_PROJECTS) {
    const { created_at, ...rest } = p;
    await prisma.project.upsert({
      where: { id: p.id },
      update: { title: p.title, status: p.status, progress: p.progress },
      create: {
        ...rest,
        company_type: "company",
        lifecycle: "avulso",
        created_at,
      },
    });
    console.log(`    ✓ [${p.status.padEnd(17)}] ${p.title}`);
  }

  // ── 5. Resumo ──────────────────────────────────────────────────────────────
  const totalAll = await prisma.project.count();
  const agencyCount = await prisma.project.count({ where: { agency: AGENCY_NAME } });
  const partnerCompanyCount = await prisma.project.count({
    where: { client_id: { in: PARTNER_COMPANY_IDS } },
  });

  console.log("\n✅ Seed QA concluído:");
  console.log(`   Agência    : ${agencyCount} projetos`);
  console.log(`   Parceiro   : ${partnerCompanyCount} projetos (em empresas referidas)`);
  console.log(`   Total banco: ${totalAll} projetos`);
  console.log("\n💡 Parceiro vê projetos via GET /api/partners/me → campo 'projects'");
  console.log("   Admin vê todos os 45 em GET /api/projects (ou mais, se houver outros)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
