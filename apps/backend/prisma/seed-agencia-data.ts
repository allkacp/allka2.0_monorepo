/**
 * Seed: Dados reais para o usuário Agency (agencia@allka.com.vc)
 * Cria: Agency, Companies (clientes), Projetos, TaskExecutions e Invoices
 *
 * Execução:  cd apps/backend && npx tsx prisma/seed-agencia-data.ts
 * Idempotente: usa upsert com IDs fixos — pode ser re-executado sem duplicar dados
 *
 * Espelho self-contained de apps/frontend/dev-mocks/data/* para agency.
 * NÃO importa nada do frontend — seguro para deploy em produção.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── IDs fixos para idempotência ───────────────────────────────────────────────
const IDS = {
  agency:       "seed-agencia-dev-01",
  client1:      "seed-agencia-cli-01",
  client2:      "seed-agencia-cli-02",
  client3:      "seed-agencia-cli-03",
  client4:      "seed-agencia-cli-04",
  client5:      "seed-agencia-cli-05",
  proj1:        "seed-agencia-proj-01",
  proj2:        "seed-agencia-proj-02",
  proj3:        "seed-agencia-proj-03",
  proj4:        "seed-agencia-proj-04",
  proj5:        "seed-agencia-proj-05",
  proj6:        "seed-agencia-proj-06",
  task01:       "seed-agencia-task-01",
  task02:       "seed-agencia-task-02",
  task03:       "seed-agencia-task-03",
  task04:       "seed-agencia-task-04",
  task05:       "seed-agencia-task-05",
  task06:       "seed-agencia-task-06",
  task07:       "seed-agencia-task-07",
  task08:       "seed-agencia-task-08",
  task09:       "seed-agencia-task-09",
  task10:       "seed-agencia-task-10",
  inv01:        "seed-agencia-inv-01",
  inv02:        "seed-agencia-inv-02",
  inv03:        "seed-agencia-inv-03",
  inv04:        "seed-agencia-inv-04",
  inv05:        "seed-agencia-inv-05",
};

const AGENCY_NAME = "Lamego Teste Agency";
const CONSULTANT  = "Fernanda Alves";
const CONSULTANT_EMAIL = "fernanda.alves@allka.com.vc";

const now    = new Date();
const past   = (days: number) => new Date(now.getTime() - days * 86_400_000);
const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

async function main() {
  console.log("🌱 Seed: dados para agency (agencia@allka.com.vc)...\n");

  // ── 1. Agency ─────────────────────────────────────────────────────────────
  const userRecord = await prisma.user.findFirst({
    where: { email: "agencia@allka.com.vc" },
    select: { id: true },
  });

  if (!userRecord) {
    console.error("❌ Usuário agencia@allka.com.vc não encontrado. Execute seed.ts primeiro.");
    process.exit(1);
  }

  const agency = await prisma.agency.upsert({
    where: { id: IDS.agency },
    update: {
      name:           AGENCY_NAME,
      partner_level:  "gold",
      wallet_balance: 28500,
      status:         "ativo",
    },
    create: {
      id:             IDS.agency,
      user_id:        userRecord.id,
      name:           AGENCY_NAME,
      cnpj:           "12.345.678/0001-90",
      email:          "contato@lamegoagency.com.br",
      phone:          "(11) 9 9000-1234",
      partner_level:  "gold",
      wallet_balance: 28500,
      status:         "ativo",
    },
  });
  console.log(`  ✓ Agency           → ${agency.name}  (${agency.id})`);

  // Atualizar user com nome do agency
  await prisma.user.update({
    where: { id: userRecord.id },
    data:  { name: AGENCY_NAME },
  });
  console.log(`  ✓ Usuário          → nome atualizado para "${AGENCY_NAME}"`);

  // ── 2. Companies (clientes da agência) ────────────────────────────────────
  const clients = [
    {
      id:      IDS.client1,
      name:    "Starbucks Coffee Brasil",
      cnpj:    "08.883.874/0001-62",
      email:   "marketing@starbucks.com.br",
      segment: "Alimentação",
    },
    {
      id:      IDS.client2,
      name:    "Nubank S.A.",
      cnpj:    "18.236.120/0001-58",
      email:   "parceiros@nubank.com.br",
      segment: "Fintech",
    },
    {
      id:      IDS.client3,
      name:    "Natura Cosméticos",
      cnpj:    "71.673.990/0001-77",
      email:   "mkt@natura.com.br",
      segment: "Cosméticos",
    },
    {
      id:      IDS.client4,
      name:    "Ambev S.A.",
      cnpj:    "02.808.708/0001-07",
      email:   "marketing@ambev.com.br",
      segment: "Bebidas",
    },
    {
      id:      IDS.client5,
      name:    "iFood Delivery",
      cnpj:    "14.380.200/0001-21",
      email:   "parcerias@ifood.com.br",
      segment: "Delivery",
    },
  ];

  for (const c of clients) {
    await prisma.company.upsert({
      where:  { id: c.id },
      update: { name: c.name },
      create: {
        id:      c.id,
        name:    c.name,
        cnpj:    c.cnpj,
        email:   c.email,
        segment: c.segment,
        status:  "ativo",
      },
    });
  }
  console.log(`  ✓ Clientes         → ${clients.length} empresas`);

  // ── 3. Projetos ───────────────────────────────────────────────────────────
  // Statuses válidos: draft | negotiation | awaiting-payment | planning |
  //                   in-progress | paused | completed | cancelled
  const projects = [
    {
      id:          IDS.proj1,
      title:       "Social Media Mensal — Starbucks",
      description: "Gestão contínua de redes sociais com produção de conteúdo semanal, stories e reels para todas as plataformas.",
      client_id:   IDS.client1,
      status:      "in-progress",
      type:        "Social Media",
      value:       8000,
      budget:      8000,
      spent:       4800,
      progress:    60,
      lifecycle:   "mensal",
      billing_day: 5,
      billing_start_date: "2026-01-05",
      start_date:  past(175),
      end_date:    future(190),
    },
    {
      id:          IDS.proj2,
      title:       "Identidade Visual Corporativa — Nubank",
      description: "Criação de identidade visual completa para nova linha de produtos: logotipo, paleta de cores, tipografia e manual de marca.",
      client_id:   IDS.client2,
      status:      "in-progress",
      type:        "Branding",
      value:       38000,
      budget:      38000,
      spent:       24700,
      progress:    65,
      lifecycle:   "avulso",
      start_date:  past(130),
      end_date:    future(5),
    },
    {
      id:          IDS.proj3,
      title:       "Rebranding Institucional — Natura",
      description: "Redesign completo da identidade visual da marca com novo posicionamento e guia de marca digital.",
      client_id:   IDS.client3,
      status:      "completed",
      type:        "Branding",
      value:       45000,
      budget:      45000,
      spent:       42800,
      progress:    100,
      lifecycle:   "avulso",
      start_date:  past(297),
      end_date:    past(135),
    },
    {
      id:          IDS.proj4,
      title:       "Campanha Black Friday 2026 — Ambev",
      description: "Campanha completa para Black Friday incluindo social media, email marketing e landing pages promocionais.",
      client_id:   IDS.client4,
      status:      "planning",
      type:        "Campanha",
      value:       65000,
      budget:      65000,
      spent:       0,
      progress:    15,
      lifecycle:   "avulso",
      start_date:  future(37),
      end_date:    future(157),
    },
    {
      id:          IDS.proj5,
      title:       "Redesign Portal Parceiros — iFood",
      description: "Redesign completo do portal interno de delivery para parceiros, com novo fluxo UX e identidade visual atualizada.",
      client_id:   IDS.client5,
      status:      "paused",
      type:        "Web Design",
      value:       52000,
      budget:      52000,
      spent:       15600,
      progress:    30,
      lifecycle:   "avulso",
      overdue:     true,
      start_date:  past(160),
      end_date:    future(20),
    },
    {
      id:          IDS.proj6,
      title:       "App de Fidelidade UX/UI — Starbucks",
      description: "Design UX/UI para aplicativo de programa de fidelidade com fluxo de pontos, resgates e gamificação.",
      client_id:   IDS.client1,
      status:      "awaiting-payment",
      type:        "UX/UI",
      value:       35000,
      budget:      35000,
      spent:       0,
      progress:    0,
      lifecycle:   "avulso",
      start_date:  future(14),
      end_date:    future(104),
    },
  ] as const;

  for (const p of projects) {
    await prisma.project.upsert({
      where:  { id: p.id },
      update: {
        status:   p.status,
        progress: p.progress,
        spent:    p.spent,
      },
      create: {
        id:                  p.id,
        title:               p.title,
        description:         p.description,
        client_id:           p.client_id,
        agency:              AGENCY_NAME,
        company_type:        "company",
        consultant:          CONSULTANT,
        consultant_email:    CONSULTANT_EMAIL,
        type:                p.type,
        status:              p.status,
        progress:            p.progress,
        budget:              p.budget,
        value:               p.value,
        spent:               p.spent,
        lifecycle:           p.lifecycle,
        billing_day:         (p as any).billing_day ?? null,
        billing_start_date:  (p as any).billing_start_date ?? null,
        start_date:          p.start_date,
        end_date:            p.end_date,
        overdue:             (p as any).overdue ?? false,
        portfolio_permission: p.status === "completed",
        bitrix_sync:         false,
        from_lead:           false,
        nomades:             "[]",
      },
    });
  }
  console.log(`  ✓ Projetos         → ${projects.length} projetos`);

  // ── 4. TaskExecutions ─────────────────────────────────────────────────────
  // Statuses: pending | in_progress | review | completed | cancelled
  const tasks = [
    // Proj 1 — Social Media Starbucks (in-progress)
    {
      id:           IDS.task01,
      project_id:   IDS.proj1,
      title:        "Post Instagram — Café da Semana",
      status:       "in_progress",
      priority:     "medium",
      due_date:     future(3),
      delivered_at: null,
    },
    {
      id:           IDS.task02,
      project_id:   IDS.proj1,
      title:        "Stories — Bastidores da Torra",
      status:       "pending",
      priority:     "low",
      due_date:     future(7),
      delivered_at: null,
    },
    {
      id:           IDS.task03,
      project_id:   IDS.proj1,
      title:        "Template de email — Junho",
      status:       "completed",
      priority:     "medium",
      due_date:     past(5),
      delivered_at: past(6),
    },
    // Proj 2 — Identidade Visual Nubank (in-progress)
    {
      id:           IDS.task04,
      project_id:   IDS.proj2,
      title:        "Manual de marca — versão digital",
      status:       "in_progress",
      priority:     "medium",
      due_date:     future(4),
      delivered_at: null,
    },
    {
      id:           IDS.task05,
      project_id:   IDS.proj2,
      title:        "Paleta de cores e tipografia",
      status:       "completed",
      priority:     "high",
      due_date:     past(30),
      delivered_at: past(31),
      approved_at:  past(28),
    },
    // Proj 3 — Rebranding Natura (completed)
    {
      id:           IDS.task06,
      project_id:   IDS.proj3,
      title:        "Pesquisa de mercado e benchmarking",
      status:       "completed",
      priority:     "high",
      due_date:     past(270),
      delivered_at: past(272),
      approved_at:  past(269),
    },
    {
      id:           IDS.task07,
      project_id:   IDS.proj3,
      title:        "Design do logotipo — 3 opções",
      status:       "completed",
      priority:     "high",
      due_date:     past(210),
      delivered_at: past(211),
      approved_at:  past(208),
    },
    // Proj 4 — Campanha Black Friday Ambev (planning)
    {
      id:           IDS.task08,
      project_id:   IDS.proj4,
      title:        "Briefing e planejamento da campanha",
      status:       "pending",
      priority:     "urgent",
      due_date:     future(50),
      delivered_at: null,
    },
    // Proj 5 — Portal iFood (paused)
    {
      id:           IDS.task09,
      project_id:   IDS.proj5,
      title:        "Revisão de UX — Fluxo de cadastro",
      status:       "pending",
      priority:     "high",
      due_date:     future(25),
      delivered_at: null,
    },
    // Proj 2 extra
    {
      id:           IDS.task10,
      project_id:   IDS.proj2,
      title:        "Criação do moodboard",
      status:       "completed",
      priority:     "medium",
      due_date:     past(90),
      delivered_at: past(91),
      approved_at:  past(89),
    },
  ] as const;

  for (const t of tasks) {
    await prisma.taskExecution.upsert({
      where:  { id: t.id },
      update: {},
      create: {
        id:           t.id,
        project_id:   t.project_id,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        type:         "standard",
        due_date:     t.due_date,
        delivered_at: (t as any).delivered_at ?? null,
        approved_at:  (t as any).approved_at  ?? null,
      },
    });
  }
  console.log(`  ✓ TaskExecutions   → ${tasks.length} tarefas`);

  // ── 5. Invoices ───────────────────────────────────────────────────────────
  const invoices = [
    {
      id:             IDS.inv01,
      company_id:     IDS.client3,
      project_id:     IDS.proj3,
      invoice_number: "NF-2025-089",
      description:    "Rebranding Institucional Natura — Pagamento final",
      amount:         45000,
      status:         "paid",
      due_date:       past(137),
      paid_at:        past(138),
    },
    {
      id:             IDS.inv02,
      company_id:     IDS.client1,
      project_id:     IDS.proj1,
      invoice_number: "NF-2026-021",
      description:    "Social Media Mensal — Starbucks — Junho/2026",
      amount:         8000,
      status:         "paid",
      due_date:       past(20),
      paid_at:        past(21),
    },
    {
      id:             IDS.inv03,
      company_id:     IDS.client2,
      project_id:     IDS.proj2,
      invoice_number: "NF-2026-034",
      description:    "Identidade Visual Corporativa — Nubank — Parcela 2/2",
      amount:         19000,
      status:         "pending",
      due_date:       future(5),
      paid_at:        null,
    },
    {
      id:             IDS.inv04,
      company_id:     IDS.client1,
      project_id:     IDS.proj6,
      invoice_number: "NF-2026-041",
      description:    "App Fidelidade UX/UI — Starbucks — Entrada 50%",
      amount:         17500,
      status:         "pending",
      due_date:       future(10),
      paid_at:        null,
    },
    {
      id:             IDS.inv05,
      company_id:     IDS.client5,
      project_id:     IDS.proj5,
      invoice_number: "NF-2026-018",
      description:    "Portal Parceiros iFood — Parcela 1/3",
      amount:         17333,
      status:         "overdue",
      due_date:       past(15),
      paid_at:        null,
    },
  ];

  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where:  { id: inv.id },
      update: {},
      create: {
        id:             inv.id,
        company_id:     inv.company_id,
        project_id:     inv.project_id,
        invoice_number: inv.invoice_number,
        description:    inv.description,
        amount:         inv.amount,
        status:         inv.status,
        due_date:       inv.due_date,
        paid_at:        inv.paid_at ?? undefined,
      },
    });
  }
  console.log(`  ✓ Invoices         → ${invoices.length} faturas`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído:");
  console.log(`   Agência:   ${agency.name}`);
  console.log("   Login:     agencia@allka.com.vc  /  SEED_TEST_USER_PASSWORD");
  console.log(`   Nível:     gold  |  Saldo: R$ 28.500`);
  console.log(`   Projetos:  ${projects.length}  (2 em andamento, 1 concluído, 1 planejamento, 1 pausado, 1 aguardando pagamento)`);
  console.log(`   Tarefas:   ${tasks.length}  (5 concluídas, 2 em andamento, 3 pendentes)`);
  console.log(`   Faturas:   ${invoices.length}  (2 pagas, 2 pendentes, 1 em atraso)`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
