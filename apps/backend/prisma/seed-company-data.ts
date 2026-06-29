/**
 * Seed: 15 projetos reais para company@allka.test
 * IDs sequenciais de proj-11 a proj-25 (agency ocupa proj-01 a proj-10).
 *
 * Execução:  cd apps/backend && npx tsx prisma/seed-company-data.ts
 * Idempotente: upsert com IDs fixos
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_EMAIL  = "company@allka.test";
const AGENCY_NAME    = "Lamego Teste Agency";

const IDS = {
  company: "seed-co-allka-test-01",
  // Projetos: sequência 11-25 (01-10 pertencem à agency)
  proj11: "seed-co-proj-11",
  proj12: "seed-co-proj-12",
  proj13: "seed-co-proj-13",
  proj14: "seed-co-proj-14",
  proj15: "seed-co-proj-15",
  proj16: "seed-co-proj-16",
  proj17: "seed-co-proj-17",
  proj18: "seed-co-proj-18",
  proj19: "seed-co-proj-19",
  proj20: "seed-co-proj-20",
  proj21: "seed-co-proj-21",
  proj22: "seed-co-proj-22",
  proj23: "seed-co-proj-23",
  proj24: "seed-co-proj-24",
  proj25: "seed-co-proj-25",
  // Faturas: sequência 11-13
  inv11:  "seed-co-inv-11",
  inv12:  "seed-co-inv-12",
  inv13:  "seed-co-inv-13",
  // IDs legados (criados antes da sequência correta — serão deletados)
  legacyProjs: [
    "seed-co-proj-01","seed-co-proj-02","seed-co-proj-03","seed-co-proj-04","seed-co-proj-05",
    "seed-co-proj-06","seed-co-proj-07","seed-co-proj-08","seed-co-proj-09","seed-co-proj-10",
  ],
  legacyInvs: ["seed-co-inv-01","seed-co-inv-02","seed-co-inv-03"],
};

const now    = new Date();
const past   = (days: number) => new Date(now.getTime() - days * 86_400_000);
const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

async function main() {
  console.log("🌱 Seed: 15 projetos para company@allka.test (proj-11 a proj-25)\n");

  // 1. Resolve company: prefer existing user's company_id, fall back to fixed seed ID
  const userRecord = await prisma.user.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { company_id: true },
  });
  const existingCompanyId = userRecord?.company_id ?? null;

  let company: { id: string; name: string };
  if (existingCompanyId) {
    const existing = await prisma.company.findUnique({ where: { id: existingCompanyId } });
    if (existing) {
      company = existing;
      console.log(`  ✓ Company existente → ${company.name} (${company.id})`);
    } else {
      throw new Error(`company_id ${existingCompanyId} not found in companies table`);
    }
  } else {
    company = await prisma.company.upsert({
      where:  { id: IDS.company },
      update: { name: "Allka Company Test" },
      create: {
        id:      IDS.company,
        name:    "Allka Company Test",
        email:   COMPANY_EMAIL,
        phone:   "(11) 9 8000-0002",
        address: "Rua das Flores, 200 — São Paulo, SP",
        status:  "ativo",
      },
    });
    console.log(`  ✓ Company criada → ${company.name} (${company.id})`);

    const linked = await prisma.user.updateMany({
      where: { email: COMPANY_EMAIL, account_type: "empresas" },
      data:  { company_id: company.id },
    });
    console.log(`  ✓ Usuário vinculado → ${linked.count} registro(s)`);
  }

  // 2. Remover registros legados (IDs antigos 01-10)
  const deletedInvs = await prisma.invoice.deleteMany({ where: { id: { in: IDS.legacyInvs } } });
  const deletedProjs = await prisma.project.deleteMany({ where: { id: { in: IDS.legacyProjs } } });
  if (deletedProjs.count > 0) console.log(`  🗑  Removidos ${deletedProjs.count} projeto(s) legado(s) (IDs 01-10)`);
  if (deletedInvs.count > 0) console.log(`  🗑  Removidas ${deletedInvs.count} fatura(s) legada(s)`);

  // 3. 15 projetos com IDs sequenciais 11-25
  const projects = [
    {
      id: IDS.proj11, title: "Identidade Visual Completa",
      description: "Criação de identidade visual — logo, paleta, tipografia e manual de marca.",
      type: "Branding", status: "completed", progress: 100, budget: 18000, value: 18000,
      start_date: past(120), end_date: past(15), created_at: past(130),
    },
    {
      id: IDS.proj12, title: "Site Institucional + SEO",
      description: "Desenvolvimento de site responsivo com otimização para buscadores.",
      type: "Web Design", status: "in-progress", progress: 65, budget: 14000, value: 14000,
      start_date: past(45), end_date: future(30), created_at: past(50),
    },
    {
      id: IDS.proj13, title: "Campanha Google Ads — Q3",
      description: "Gestão de campanhas pagas com foco em geração de leads qualificados.",
      type: "Marketing Digital", status: "in-progress", progress: 40, budget: 6000, value: 6000,
      start_date: past(20), end_date: future(70), created_at: past(25),
    },
    {
      id: IDS.proj14, title: "Gestão de Redes Sociais",
      description: "Criação e gestão de conteúdo para Instagram, LinkedIn e Facebook.",
      type: "Social Media", status: "in-progress", progress: 55, budget: 3500, value: 3500,
      start_date: past(60), end_date: future(120), created_at: past(65),
    },
    {
      id: IDS.proj15, title: "E-commerce B2C",
      description: "Desenvolvimento de loja virtual com integração de pagamento e estoque.",
      type: "E-commerce", status: "planning", progress: 10, budget: 32000, value: 32000,
      start_date: past(5), end_date: future(90), created_at: past(10),
    },
    {
      id: IDS.proj16, title: "Vídeo Institucional 2 min",
      description: "Roteiro, filmagem e edição de vídeo institucional para site e redes.",
      type: "Vídeo", status: "in-progress", progress: 30, budget: 9500, value: 9500,
      start_date: past(15), end_date: future(25), created_at: past(20),
    },
    {
      id: IDS.proj17, title: "E-mail Marketing — Base Ativa",
      description: "Série de e-mails de nutrição com automação e segmentação da base.",
      type: "E-mail Marketing", status: "in-progress", progress: 80, budget: 2800, value: 2800,
      start_date: past(90), end_date: future(30), created_at: past(95),
    },
    {
      id: IDS.proj18, title: "App Mobile — Fidelidade",
      description: "Design UX/UI e desenvolvimento de app de fidelidade para clientes.",
      type: "Mobile", status: "draft", progress: 0, budget: 45000, value: 45000,
      start_date: undefined, end_date: undefined, created_at: past(3),
    },
    {
      id: IDS.proj19, title: "SEO Técnico + Conteúdo",
      description: "Auditoria técnica, otimização on-page e produção de artigos para blog.",
      type: "SEO", status: "completed", progress: 100, budget: 7200, value: 7200,
      start_date: past(180), end_date: past(30), created_at: past(185),
    },
    {
      id: IDS.proj20, title: "Consultoria de Marketing Digital",
      description: "Diagnóstico da presença digital e plano de ação trimestral.",
      type: "Consultoria", status: "completed", progress: 100, budget: 4500, value: 4500,
      start_date: past(200), end_date: past(140), created_at: past(205),
    },
    {
      id: IDS.proj21, title: "Campanha Black Friday 2026",
      description: "Estratégia completa de Black Friday: social, e-mail, anúncios e landing page.",
      type: "Campanha", status: "planning", progress: 5, budget: 28000, value: 28000,
      start_date: future(30), end_date: future(120), created_at: past(2),
    },
    {
      id: IDS.proj22, title: "Rebranding — Nova Fase",
      description: "Atualização da identidade visual para nova fase da empresa.",
      type: "Branding", status: "awaiting-payment", progress: 0, budget: 22000, value: 22000,
      start_date: undefined, end_date: undefined, created_at: past(7),
    },
    {
      id: IDS.proj23, title: "Dashboard Analytics Interno",
      description: "Desenvolvimento de painel interno com métricas de negócio em tempo real.",
      type: "Desenvolvimento Web", status: "paused", progress: 35, budget: 16000, value: 16000,
      start_date: past(50), end_date: future(40), created_at: past(55),
    },
    {
      id: IDS.proj24, title: "Produção de Conteúdo Editorial",
      description: "12 artigos mensais para blog + 4 materiais ricos (e-books, infográficos).",
      type: "Content", status: "in-progress", progress: 70, budget: 4800, value: 4800,
      start_date: past(75), end_date: future(15), created_at: past(80),
    },
    {
      id: IDS.proj25, title: "Treinamento de Equipe — Inbound",
      description: "Workshop presencial + material didático sobre inbound marketing.",
      type: "Treinamento", status: "completed", progress: 100, budget: 3200, value: 3200,
      start_date: past(150), end_date: past(100), created_at: past(155),
    },
  ];

  for (const p of projects) {
    const { created_at, start_date, end_date, ...rest } = p;
    await prisma.project.upsert({
      where:  { id: p.id },
      update: { title: p.title, status: p.status, progress: p.progress },
      create: {
        ...rest,
        agency:           AGENCY_NAME,
        client_id:        company.id,
        company_type:     "company",
        lifecycle:        "avulso",
        consultant:       "Fernanda Alves",
        consultant_email: "fernanda@allka.com",
        ...(start_date ? { start_date } : {}),
        ...(end_date   ? { end_date }   : {}),
        created_at,
      },
    });
    console.log(`  ✓ [${p.id}] [${p.status.padEnd(17)}] ${p.title}`);
  }

  // 4. Faturas de exemplo
  const invoices = [
    {
      id: IDS.inv11, description: "Identidade Visual Completa — Parcela final",
      amount: 9000, status: "paid", due_date: past(20), paid_at: past(18),
      project_id: IDS.proj11,
    },
    {
      id: IDS.inv12, description: "Site Institucional + SEO — Entrada 50%",
      amount: 7000, status: "paid", due_date: past(40), paid_at: past(38),
      project_id: IDS.proj12,
    },
    {
      id: IDS.inv13, description: "App Mobile — Proposta aprovada",
      amount: 22500, status: "pending", due_date: future(10), paid_at: null,
      project_id: IDS.proj18,
    },
  ];

  for (const inv of invoices) {
    const { paid_at, project_id, ...rest } = inv;
    await prisma.invoice.upsert({
      where:  { id: inv.id },
      update: { status: inv.status },
      create: {
        ...rest,
        company_id:     company.id,
        project_id,
        invoice_number: String(Math.floor(Math.random() * 9000) + 1000),
        ...(paid_at ? { paid_at } : {}),
      },
    });
  }
  console.log(`  ✓ ${invoices.length} faturas criadas`);

  const total = await prisma.project.count({ where: { client_id: company.id } });
  console.log(`\n✅ Company "${company.name}" tem ${total} projeto(s) no banco.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
