/**
 * Seed: Dados reais para o usuário Company (empresa@allka.com.vc)
 * Cria: Company, vincula usuário, cria Projetos, TaskExecutions e Invoices
 *
 * Execução:  cd apps/backend && npx tsx prisma/seed-empresa-data.ts
 * Idempotente: usa upsert com IDs fixos — pode ser re-executado sem duplicar dados
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── IDs fixos para idempotência ───────────────────────────────────────────────
const IDS = {
  company:    "seed-empresa-dev-01",
  proj1:      "seed-empresa-proj-01",
  proj2:      "seed-empresa-proj-02",
  proj3:      "seed-empresa-proj-03",
  task01:     "seed-empresa-task-01",
  task02:     "seed-empresa-task-02",
  task03:     "seed-empresa-task-03",
  task04:     "seed-empresa-task-04",
  task05:     "seed-empresa-task-05",
  task06:     "seed-empresa-task-06",
  task07:     "seed-empresa-task-07",
  task08:     "seed-empresa-task-08",
  task09:     "seed-empresa-task-09",
  task10:     "seed-empresa-task-10",
  inv01:      "seed-empresa-inv-01",
  inv02:      "seed-empresa-inv-02",
  inv03:      "seed-empresa-inv-03",
  inv04:      "seed-empresa-inv-04",
  inv05:      "seed-empresa-inv-05",
};

const now = new Date();
const past   = (days: number) => new Date(now.getTime() - days * 86_400_000);
const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

async function main() {
  console.log("🌱 Seed: dados para empresa (empresa@allka.com.vc)...\n");

  // ── 1. Company ────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: IDS.company },
    update: {
      name: "TechStart Soluções Digitais",
      email: "empresa@allka.com.vc",
    },
    create: {
      id:      IDS.company,
      name:    "TechStart Soluções Digitais",
      cnpj:    "00.000.000/0001-01",
      email:   "empresa@allka.com.vc",
      phone:   "(11) 99000-0001",
      address: "Av. Paulista, 1000 — São Paulo, SP",
      segment: "Tecnologia",
      status:  "ativo",
    },
  });
  console.log(`  ✓ Company         → ${company.name}  (${company.id})`);

  // ── 2. Vincular usuário empresa@allka.com.vc ─────────────────────────────
  const updated = await prisma.user.updateMany({
    where: { email: "empresa@allka.com.vc", account_type: "empresas" },
    data:  { company_id: IDS.company },
  });
  console.log(`  ✓ Usuário empresa  → company_id vinculado (${updated.count} registro${updated.count === 1 ? "" : "s"})`);

  // ── 3. Projetos ───────────────────────────────────────────────────────────
  const proj1 = await prisma.project.upsert({
    where:  { id: IDS.proj1 },
    update: {},
    create: {
      id:          IDS.proj1,
      title:       "Site Institucional + SEO",
      description: "Criação de site institucional responsivo com otimização SEO e integração com Google Analytics.",
      client_id:   IDS.company,
      status:      "in-progress",
      type:        "Marketing Digital",
      budget:      12000,
      value:       12000,
      progress:    45,
      start_date:  past(30),
      end_date:    future(60),
    },
  });

  const proj2 = await prisma.project.upsert({
    where:  { id: IDS.proj2 },
    update: {},
    create: {
      id:          IDS.proj2,
      title:       "Campanha Google Ads — Q2/2026",
      description: "Gestão de campanhas Google Ads com foco em geração de leads qualificados para o segmento B2B.",
      client_id:   IDS.company,
      status:      "in-progress",
      type:        "Marketing Digital",
      budget:      8500,
      value:       8500,
      progress:    70,
      start_date:  past(45),
      end_date:    future(30),
    },
  });

  const proj3 = await prisma.project.upsert({
    where:  { id: IDS.proj3 },
    update: {},
    create: {
      id:          IDS.proj3,
      title:       "Identidade Visual & Branding",
      description: "Desenvolvimento completo da identidade visual: logotipo, paleta de cores, tipografia e manual de marca.",
      client_id:   IDS.company,
      status:      "completed",
      type:        "Design",
      budget:      6000,
      value:       6000,
      progress:    100,
      start_date:  past(90),
      end_date:    past(10),
    },
  });

  console.log(`  ✓ Projeto 1       → ${proj1.title}`);
  console.log(`  ✓ Projeto 2       → ${proj2.title}`);
  console.log(`  ✓ Projeto 3       → ${proj3.title}`);

  // ── 4. TaskExecutions ─────────────────────────────────────────────────────
  // Statuses mapeados pelo empresa-context:
  //   pending    → "available"   in_progress → "in_progress"
  //   review     → "review"      completed   → "done"
  //   cancelled  → "cancelled"

  const tasks = [
    // Projeto 1 — Site + SEO
    {
      id:         IDS.task01,
      project_id: IDS.proj1,
      title:      "Levantamento de palavras-chave SEO",
      status:     "completed",
      priority:   "high",
      due_date:   past(20),
      delivered_at: past(18),
    },
    {
      id:         IDS.task02,
      project_id: IDS.proj1,
      title:      "Wireframes das páginas principais",
      status:     "completed",
      priority:   "high",
      due_date:   past(15),
      delivered_at: past(12),
    },
    {
      id:         IDS.task03,
      project_id: IDS.proj1,
      title:      "Desenvolvimento front-end — Homepage",
      status:     "in_progress",
      priority:   "high",
      due_date:   future(10),
      delivered_at: null,
    },
    {
      id:         IDS.task04,
      project_id: IDS.proj1,
      title:      "Configuração Google Analytics + Search Console",
      status:     "pending",
      priority:   "medium",
      due_date:   future(20),
      delivered_at: null,
    },
    // Projeto 2 — Google Ads
    {
      id:         IDS.task05,
      project_id: IDS.proj2,
      title:      "Criação de campanhas Search — Produto A",
      status:     "completed",
      priority:   "high",
      due_date:   past(30),
      delivered_at: past(28),
    },
    {
      id:         IDS.task06,
      project_id: IDS.proj2,
      title:      "Criação de campanhas Display — Retargeting",
      status:     "completed",
      priority:   "medium",
      due_date:   past(20),
      delivered_at: past(19),
    },
    {
      id:         IDS.task07,
      project_id: IDS.proj2,
      title:      "Otimização de lances — Semana 3",
      status:     "in_progress",
      priority:   "high",
      due_date:   future(5),
      delivered_at: null,
    },
    {
      id:         IDS.task08,
      project_id: IDS.proj2,
      title:      "Relatório de performance mensal — Junho/2026",
      status:     "pending",
      priority:   "medium",
      due_date:   future(15),
      delivered_at: null,
    },
    // Projeto 3 — Branding (concluído)
    {
      id:         IDS.task09,
      project_id: IDS.proj3,
      title:      "Criação de logotipo principal e variações",
      status:     "completed",
      priority:   "high",
      due_date:   past(50),
      delivered_at: past(48),
      approved_at:  past(45),
    },
    {
      id:         IDS.task10,
      project_id: IDS.proj3,
      title:      "Manual de marca — versão final",
      status:     "completed",
      priority:   "high",
      due_date:   past(15),
      delivered_at: past(12),
      approved_at:  past(10),
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
        delivered_at: "delivered_at" in t ? (t as any).delivered_at : null,
        approved_at:  "approved_at"  in t ? (t as any).approved_at  : null,
      },
    });
  }
  console.log(`  ✓ TaskExecutions  → ${tasks.length} tarefas criadas`);

  // ── 5. Invoices ───────────────────────────────────────────────────────────
  const invoices = [
    {
      id:             IDS.inv01,
      company_id:     IDS.company,
      project_id:     IDS.proj3,
      invoice_number: "INV-2026-001",
      description:    "Identidade Visual & Branding — Pagamento Final",
      amount:         6000,
      status:         "paid",
      due_date:       past(20),
      paid_at:        past(18),
    },
    {
      id:             IDS.inv02,
      company_id:     IDS.company,
      project_id:     IDS.proj1,
      invoice_number: "INV-2026-002",
      description:    "Site Institucional + SEO — Parcela 1/2",
      amount:         6000,
      status:         "paid",
      due_date:       past(30),
      paid_at:        past(28),
    },
    {
      id:             IDS.inv03,
      company_id:     IDS.company,
      project_id:     IDS.proj1,
      invoice_number: "INV-2026-003",
      description:    "Site Institucional + SEO — Parcela 2/2",
      amount:         6000,
      status:         "pending",
      due_date:       future(15),
      paid_at:        null,
    },
    {
      id:             IDS.inv04,
      company_id:     IDS.company,
      project_id:     IDS.proj2,
      invoice_number: "INV-2026-004",
      description:    "Google Ads Q2/2026 — Gestão + Fee",
      amount:         8500,
      status:         "pending",
      due_date:       future(7),
      paid_at:        null,
    },
    {
      id:             IDS.inv05,
      company_id:     IDS.company,
      project_id:     null,
      invoice_number: "INV-2026-005",
      description:    "Taxa de plataforma — Maio/2026",
      amount:         490,
      status:         "overdue",
      due_date:       past(5),
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
        project_id:     inv.project_id ?? undefined,
        invoice_number: inv.invoice_number,
        description:    inv.description,
        amount:         inv.amount,
        status:         inv.status,
        due_date:       inv.due_date,
        paid_at:        inv.paid_at ?? undefined,
      },
    });
  }
  console.log(`  ✓ Invoices        → ${invoices.length} faturas criadas`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed concluído:");
  console.log(`   Empresa:   ${company.name}`);
  console.log("   Login:     empresa@allka.com.vc  /  SEED_TEST_USER_PASSWORD");
  console.log(`   Projetos:  3  (2 em andamento, 1 concluído)`);
  console.log(`   Tarefas:   ${tasks.length}  (4 concluídas, 3 em andamento, 3 pendentes)`);
  console.log(`   Faturas:   ${invoices.length}  (2 pagas, 2 pendentes, 1 em atraso)`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
