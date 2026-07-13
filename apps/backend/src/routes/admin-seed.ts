import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { generateNextUserCode } from "../lib/user-code";
import { withProjectCode } from "../lib/create-project";

// POST /api/admin/seed/company-test
// Admin-only endpoint to seed the company test user + data in any environment.
// Call once after each deploy if the DB is freshly migrated.
const router = Router();

const CT_COMPANY_ID = "cmqgqm0u3000a13ogmj3z2i6c";
const CT_EMAIL = "company@allka.test";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

router.post(
  "/company-test",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      // ── Company ───────────────────────────────────────────────────────────
      await prisma.company.upsert({
        where: { id: CT_COMPANY_ID },
        update: {},
        create: {
          id: CT_COMPANY_ID,
          name: "Company Test",
          cnpj: "00.000.001/0001-99",
          email: CT_EMAIL,
          phone: "(11) 90000-0001",
          status: "ativo",
          segment: "Tecnologia",
        },
      });

      // ── User ──────────────────────────────────────────────────────────────
      const password = process.env.SEED_TEST_USER_PASSWORD || "Test@2026!";
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.upsert({
        where: { email: CT_EMAIL },
        update: { password_hash: hash, company_id: CT_COMPANY_ID, is_active: true },
        create: {
          email: CT_EMAIL,
          password_hash: hash,
          name: "Company Test",
          role: "company_admin",
          account_type: "empresas",
          company_id: CT_COMPANY_ID,
          is_active: true,
          user_code: await generateNextUserCode(prisma),
        },
      });

      // ── Projects ──────────────────────────────────────────────────────────
      const projects = [
        { id: "proj-ct-01", title: "Site institucional + SEO",              type: "Desenvolvimento Web",    status: "producao",  value: 8500,  budget: 8500,  progress: 45,  start_date: daysAgo(25),  end_date: daysAgo(-15) },
        { id: "proj-ct-02", title: "Gestão de Tráfego Pago — Q3",           type: "Marketing Digital",      status: "producao",  value: 3200,  budget: 3200,  progress: 70,  start_date: daysAgo(18),  end_date: daysAgo(-20) },
        { id: "proj-ct-03", title: "Identidade Visual & Branding",          type: "Design",                 status: "revisao",   value: 5000,  budget: 5000,  progress: 85,  start_date: daysAgo(40),  end_date: daysAgo(-5)  },
        { id: "proj-ct-04", title: "Criação de Conteúdo — Redes Sociais",   type: "Marketing Digital",      status: "briefing",  value: 2400,  budget: 2400,  progress: 10,  start_date: daysAgo(5),   end_date: daysAgo(-30) },
        { id: "proj-ct-05", title: "Landing Page — Campanha de Lançamento", type: "Desenvolvimento Web",    status: "briefing",  value: 3800,  budget: 3800,  progress: 0,   start_date: daysAgo(3),   end_date: daysAgo(-25) },
        { id: "proj-ct-06", title: "E-commerce + Integração de Pagamento",  type: "E-commerce",             status: "entregue",  value: 14000, budget: 14000, progress: 100, start_date: daysAgo(95),  end_date: daysAgo(10)  },
        { id: "proj-ct-07", title: "App de Agendamento — MVP",              type: "Desenvolvimento Mobile", status: "entregue",  value: 18000, budget: 18000, progress: 100, start_date: daysAgo(180), end_date: daysAgo(60)  },
        { id: "proj-ct-08", title: "Consultoria SEO — Auditoria Técnica",   type: "Consultoria",            status: "cancelado", value: 1800,  budget: 1800,  progress: 20,  start_date: daysAgo(200), end_date: daysAgo(150) },
      ];
      for (const proj of projects) {
        const existing = await prisma.project.findUnique({ where: { id: proj.id }, select: { id: true } });
        if (existing) {
          await prisma.project.update({ where: { id: proj.id }, data: { ...proj } });
        } else {
          await withProjectCode(prisma, (tx, projectCode) =>
            tx.project.create({ data: { ...proj, client_id: CT_COMPANY_ID, project_code: projectCode } }),
          );
        }
      }

      // ── Tasks ─────────────────────────────────────────────────────────────
      const tasks = [
        { id: "task-ct-01", project_id: "proj-ct-01", title: "Wireframes e prototipação das páginas",            status: "done",        due_date: daysAgo(15), delivered_at: daysAgo(16) },
        { id: "task-ct-02", project_id: "proj-ct-01", title: "Desenvolvimento frontend — Home e Sobre",          status: "in_progress", due_date: daysAgo(-5)  },
        { id: "task-ct-03", project_id: "proj-ct-01", title: "Desenvolvimento backend — Formulário de contato",  status: "available",   due_date: daysAgo(-10) },
        { id: "task-ct-04", project_id: "proj-ct-01", title: "SEO On-page — levantamento de palavras-chave",     status: "done",        due_date: daysAgo(20), delivered_at: daysAgo(22) },
        { id: "task-ct-05", project_id: "proj-ct-01", title: "Integração Google Analytics + Search Console",     status: "available",   due_date: daysAgo(-12) },
        { id: "task-ct-06", project_id: "proj-ct-02", title: "Setup conta Google Ads + estrutura de campanhas",  status: "done",        due_date: daysAgo(14), delivered_at: daysAgo(15) },
        { id: "task-ct-07", project_id: "proj-ct-02", title: "Criação de anúncios e criativos — 1ª rodada",      status: "done",        due_date: daysAgo(10), delivered_at: daysAgo(11) },
        { id: "task-ct-08", project_id: "proj-ct-02", title: "Otimização de lances e segmentação de público",    status: "in_progress", due_date: daysAgo(-3)  },
        { id: "task-ct-09", project_id: "proj-ct-02", title: "Relatório de performance — semana 2",              status: "review",      due_date: daysAgo(2)   },
        { id: "task-ct-10", project_id: "proj-ct-03", title: "Pesquisa de mercado e moodboard",                  status: "done",        due_date: daysAgo(30), delivered_at: daysAgo(32) },
        { id: "task-ct-11", project_id: "proj-ct-03", title: "Criação do logotipo — 3 propostas",                status: "done",        due_date: daysAgo(20), delivered_at: daysAgo(21) },
        { id: "task-ct-12", project_id: "proj-ct-03", title: "Manual de identidade visual completo",             status: "review",      due_date: daysAgo(3)   },
        { id: "task-ct-13", project_id: "proj-ct-03", title: "Aplicações (papelaria, assinatura e-mail, PPT)",   status: "available",   due_date: daysAgo(-7)  },
        { id: "task-ct-14", project_id: "proj-ct-04", title: "Definição de calendário editorial",                status: "available",   due_date: daysAgo(-8)  },
        { id: "task-ct-15", project_id: "proj-ct-04", title: "Criação de 12 posts para feed",                    status: "available",   due_date: daysAgo(-15) },
        { id: "task-ct-16", project_id: "proj-ct-06", title: "Configuração da loja WooCommerce",                 status: "done",        due_date: daysAgo(80), delivered_at: daysAgo(82) },
        { id: "task-ct-17", project_id: "proj-ct-06", title: "Integração gateway de pagamento (Stripe + Pix)",   status: "done",        due_date: daysAgo(65), delivered_at: daysAgo(66) },
        { id: "task-ct-18", project_id: "proj-ct-06", title: "Importação do catálogo de produtos (320 itens)",   status: "done",        due_date: daysAgo(55), delivered_at: daysAgo(56) },
        { id: "task-ct-19", project_id: "proj-ct-06", title: "Testes de compra e QA completo",                   status: "done",        due_date: daysAgo(15), delivered_at: daysAgo(14) },
        { id: "task-ct-20", project_id: "proj-ct-07", title: "UX Research + fluxo de usuário",                   status: "done",        due_date: daysAgo(170), delivered_at: daysAgo(172) },
        { id: "task-ct-21", project_id: "proj-ct-07", title: "Design de telas — React Native",                   status: "done",        due_date: daysAgo(140), delivered_at: daysAgo(141) },
        { id: "task-ct-22", project_id: "proj-ct-07", title: "Desenvolvimento das telas de agendamento",         status: "done",        due_date: daysAgo(100), delivered_at: daysAgo(102) },
        { id: "task-ct-23", project_id: "proj-ct-07", title: "Backend API + notificações push",                  status: "done",        due_date: daysAgo(80),  delivered_at: daysAgo(81)  },
        { id: "task-ct-24", project_id: "proj-ct-07", title: "Publicação App Store + Google Play",               status: "done",        due_date: daysAgo(65),  delivered_at: daysAgo(63)  },
        { id: "task-ct-25", project_id: "proj-ct-08", title: "Auditoria técnica inicial de SEO",                 status: "cancelled",   due_date: daysAgo(180) },
      ];
      for (const task of tasks) {
        await prisma.taskExecution.upsert({
          where: { id: task.id },
          update: { ...task },
          create: { ...task },
        });
      }

      // ── Invoices ──────────────────────────────────────────────────────────
      const invoices = [
        { id: "inv-ct-01", company_id: CT_COMPANY_ID, project_id: "proj-ct-07", amount: 9000,  status: "paid",    invoice_number: "NF-2024-001", description: "App de Agendamento — parcela 1/2",   due_date: daysAgo(162), paid_at: daysAgo(158), created_at: daysAgo(165) },
        { id: "inv-ct-02", company_id: CT_COMPANY_ID, project_id: "proj-ct-07", amount: 9000,  status: "paid",    invoice_number: "NF-2024-002", description: "App de Agendamento — parcela 2/2",   due_date: daysAgo(82),  paid_at: daysAgo(79),  created_at: daysAgo(85)  },
        { id: "inv-ct-03", company_id: CT_COMPANY_ID, project_id: "proj-ct-06", amount: 7000,  status: "paid",    invoice_number: "NF-2024-003", description: "E-commerce — parcela 1/2",           due_date: daysAgo(92),  paid_at: daysAgo(91),  created_at: daysAgo(95)  },
        { id: "inv-ct-04", company_id: CT_COMPANY_ID, project_id: "proj-ct-06", amount: 7000,  status: "paid",    invoice_number: "NF-2024-004", description: "E-commerce — parcela 2/2",           due_date: daysAgo(22),  paid_at: daysAgo(18),  created_at: daysAgo(25)  },
        { id: "inv-ct-05", company_id: CT_COMPANY_ID, project_id: "proj-ct-03", amount: 2500,  status: "paid",    invoice_number: "NF-2025-001", description: "Identidade Visual — sinal (50%)",    due_date: daysAgo(37),  paid_at: daysAgo(34),  created_at: daysAgo(40)  },
        { id: "inv-ct-06", company_id: CT_COMPANY_ID, project_id: "proj-ct-01", amount: 4250,  status: "pending", invoice_number: "NF-2025-002", description: "Site Institucional — sinal (50%)",   due_date: daysAgo(-5),  created_at: daysAgo(5)  },
        { id: "inv-ct-07", company_id: CT_COMPANY_ID, project_id: "proj-ct-02", amount: 1600,  status: "pending", invoice_number: "NF-2025-003", description: "Tráfego Pago — parcela 1/2",         due_date: daysAgo(-8),  created_at: daysAgo(3)  },
        { id: "inv-ct-08", company_id: CT_COMPANY_ID, project_id: "proj-ct-03", amount: 2500,  status: "pending", invoice_number: "NF-2025-004", description: "Identidade Visual — restante (50%)", due_date: daysAgo(-3),  created_at: daysAgo(6)  },
        { id: "inv-ct-09", company_id: CT_COMPANY_ID, project_id: "proj-ct-08", amount: 900,   status: "overdue", invoice_number: "NF-2024-005", description: "Consultoria SEO — sinal (50%)",      due_date: daysAgo(60),  created_at: daysAgo(65) },
      ];
      for (const inv of invoices) {
        await prisma.invoice.upsert({
          where: { id: inv.id },
          update: { ...inv },
          create: { ...inv },
        });
      }

      res.json({
        ok: true,
        message: "Company Test seed concluído",
        data: {
          company: CT_COMPANY_ID,
          user: CT_EMAIL,
          projects: projects.length,
          tasks: tasks.length,
          invoices: invoices.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/seed/agency-real
// Seeds the agency "Lamego Teste Agency" (agencia@allka.com.vc) with realistic
// projects, tasks and invoices. Idempotent (upsert). Safe in any environment.
router.post(
  "/agency-real",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const AGENCY_NAME      = "Lamego Teste Agency";
      const AGENCY_EMAIL     = "agencia@allka.com.vc";
      const CONSULTANT       = "Fernanda Alves";
      const CONSULTANT_EMAIL = "fernanda.alves@allka.com.vc";

      const now    = new Date();
      const past   = (d: number) => new Date(now.getTime() - d * 86_400_000);
      const future = (d: number) => new Date(now.getTime() + d * 86_400_000);

      // ── Agency user ───────────────────────────────────────────────────────
      const userRecord = await prisma.user.findFirst({
        where:  { email: AGENCY_EMAIL },
        select: { id: true },
      });
      if (!userRecord) {
        res.status(422).json({ error: `Usuário ${AGENCY_EMAIL} não encontrado. Execute db:seed primeiro.` });
        return;
      }

      const agency = await prisma.agency.upsert({
        where:  { id: "seed-agencia-dev-01" },
        update: { name: AGENCY_NAME, partner_level: "gold", wallet_balance: 28500, status: "ativo" },
        create: {
          id:             "seed-agencia-dev-01",
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

      await prisma.user.update({
        where: { id: userRecord.id },
        data:  { name: AGENCY_NAME },
      });

      // ── Clients ───────────────────────────────────────────────────────────
      const clients = [
        { id: "seed-agencia-cli-01", name: "Starbucks Coffee Brasil", cnpj: "08.883.874/0001-62", segment: "Alimentação"  },
        { id: "seed-agencia-cli-02", name: "Nubank S.A.",              cnpj: "18.236.120/0001-58", segment: "Fintech"      },
        { id: "seed-agencia-cli-03", name: "Natura Cosméticos",        cnpj: "71.673.990/0001-77", segment: "Cosméticos"   },
        { id: "seed-agencia-cli-04", name: "Ambev S.A.",               cnpj: "02.808.708/0001-07", segment: "Bebidas"      },
        { id: "seed-agencia-cli-05", name: "iFood Delivery",           cnpj: "14.380.200/0001-21", segment: "Delivery"     },
      ];
      for (const c of clients) {
        await prisma.company.upsert({
          where:  { id: c.id },
          update: { name: c.name },
          create: { id: c.id, name: c.name, cnpj: c.cnpj, segment: c.segment, status: "ativo" },
        });
      }

      // ── Projects ──────────────────────────────────────────────────────────
      const projects = [
        { id: "seed-agencia-proj-01", title: "Social Media Mensal — Starbucks",      client_id: "seed-agencia-cli-01", status: "in-progress",      type: "Social Media",  value: 8000,  budget: 8000,  spent: 4800,  progress: 60,  lifecycle: "mensal",  billing_day: 5, billing_start_date: "2026-01-05", start_date: past(175),  end_date: future(190), overdue: false },
        { id: "seed-agencia-proj-02", title: "Identidade Visual Corporativa — Nubank",client_id: "seed-agencia-cli-02", status: "in-progress",      type: "Branding",      value: 38000, budget: 38000, spent: 24700, progress: 65,  lifecycle: "avulso", start_date: past(130),  end_date: future(5),   overdue: false },
        { id: "seed-agencia-proj-03", title: "Rebranding Institucional — Natura",     client_id: "seed-agencia-cli-03", status: "completed",        type: "Branding",      value: 45000, budget: 45000, spent: 42800, progress: 100, lifecycle: "avulso", start_date: past(297),  end_date: past(135),   overdue: false },
        { id: "seed-agencia-proj-04", title: "Campanha Black Friday 2026 — Ambev",   client_id: "seed-agencia-cli-04", status: "planning",         type: "Campanha",      value: 65000, budget: 65000, spent: 0,     progress: 15,  lifecycle: "avulso", start_date: future(37), end_date: future(157), overdue: false },
        { id: "seed-agencia-proj-05", title: "Redesign Portal Parceiros — iFood",     client_id: "seed-agencia-cli-05", status: "paused",           type: "Web Design",    value: 52000, budget: 52000, spent: 15600, progress: 30,  lifecycle: "avulso", start_date: past(160),  end_date: future(20),  overdue: true  },
        { id: "seed-agencia-proj-06", title: "App de Fidelidade UX/UI — Starbucks",  client_id: "seed-agencia-cli-01", status: "awaiting-payment", type: "UX/UI",         value: 35000, budget: 35000, spent: 0,     progress: 0,   lifecycle: "avulso", start_date: future(14), end_date: future(104), overdue: false },
      ];
      for (const p of projects) {
        const existing = await prisma.project.findUnique({ where: { id: p.id }, select: { id: true } });
        if (existing) {
          await prisma.project.update({
            where: { id: p.id },
            data: { status: p.status, progress: p.progress, spent: p.spent },
          });
        } else {
          await withProjectCode(prisma, (tx, projectCode) =>
            tx.project.create({
              data: {
                ...p,
                agency:           AGENCY_NAME,
                company_type:     "company",
                consultant:       CONSULTANT,
                consultant_email: CONSULTANT_EMAIL,
                portfolio_permission: p.status === "completed",
                bitrix_sync:      false,
                from_lead:        false,
                nomades:          "[]",
                project_code: projectCode,
              },
            }),
          );
        }
      }

      // ── Tasks ─────────────────────────────────────────────────────────────
      const tasks = [
        { id: "seed-agencia-task-01", project_id: "seed-agencia-proj-01", title: "Post Instagram — Café da Semana",    status: "in_progress", priority: "medium", due_date: future(3),   delivered_at: null },
        { id: "seed-agencia-task-02", project_id: "seed-agencia-proj-01", title: "Stories — Bastidores da Torra",      status: "pending",     priority: "low",    due_date: future(7),   delivered_at: null },
        { id: "seed-agencia-task-03", project_id: "seed-agencia-proj-01", title: "Template de email — Junho",          status: "completed",   priority: "medium", due_date: past(5),     delivered_at: past(6) },
        { id: "seed-agencia-task-04", project_id: "seed-agencia-proj-02", title: "Manual de marca — versão digital",   status: "in_progress", priority: "medium", due_date: future(4),   delivered_at: null },
        { id: "seed-agencia-task-05", project_id: "seed-agencia-proj-02", title: "Paleta de cores e tipografia",       status: "completed",   priority: "high",   due_date: past(30),    delivered_at: past(31) },
        { id: "seed-agencia-task-06", project_id: "seed-agencia-proj-03", title: "Pesquisa de mercado e benchmarking", status: "completed",   priority: "high",   due_date: past(270),   delivered_at: past(272) },
        { id: "seed-agencia-task-07", project_id: "seed-agencia-proj-03", title: "Design do logotipo — 3 opções",      status: "completed",   priority: "high",   due_date: past(210),   delivered_at: past(211) },
        { id: "seed-agencia-task-08", project_id: "seed-agencia-proj-04", title: "Briefing e planejamento da campanha",status: "pending",     priority: "urgent", due_date: future(50),  delivered_at: null },
        { id: "seed-agencia-task-09", project_id: "seed-agencia-proj-05", title: "Revisão de UX — Fluxo de cadastro",  status: "pending",     priority: "high",   due_date: future(25),  delivered_at: null },
        { id: "seed-agencia-task-10", project_id: "seed-agencia-proj-02", title: "Criação do moodboard",               status: "completed",   priority: "medium", due_date: past(90),    delivered_at: past(91) },
      ];
      for (const t of tasks) {
        await prisma.taskExecution.upsert({
          where:  { id: t.id },
          update: {},
          create: { id: t.id, project_id: t.project_id, title: t.title, status: t.status, priority: t.priority, type: "standard", due_date: t.due_date, delivered_at: t.delivered_at },
        });
      }

      // ── Invoices ──────────────────────────────────────────────────────────
      const invoices = [
        { id: "seed-agencia-inv-01", company_id: "seed-agencia-cli-03", project_id: "seed-agencia-proj-03", invoice_number: "NF-2025-089", description: "Rebranding Institucional Natura — Pagamento final",        amount: 45000, status: "paid",    due_date: past(137),  paid_at: past(138)  },
        { id: "seed-agencia-inv-02", company_id: "seed-agencia-cli-01", project_id: "seed-agencia-proj-01", invoice_number: "NF-2026-021", description: "Social Media Mensal Starbucks — Junho/2026",              amount: 8000,  status: "paid",    due_date: past(20),   paid_at: past(21)   },
        { id: "seed-agencia-inv-03", company_id: "seed-agencia-cli-02", project_id: "seed-agencia-proj-02", invoice_number: "NF-2026-034", description: "Identidade Visual Corporativa Nubank — Parcela 2/2",     amount: 19000, status: "pending", due_date: future(5),  paid_at: null       },
        { id: "seed-agencia-inv-04", company_id: "seed-agencia-cli-01", project_id: "seed-agencia-proj-06", invoice_number: "NF-2026-041", description: "App Fidelidade UX/UI Starbucks — Entrada 50%",           amount: 17500, status: "pending", due_date: future(10), paid_at: null       },
        { id: "seed-agencia-inv-05", company_id: "seed-agencia-cli-05", project_id: "seed-agencia-proj-05", invoice_number: "NF-2026-018", description: "Portal Parceiros iFood — Parcela 1/3",                   amount: 17333, status: "overdue", due_date: past(15),   paid_at: null       },
      ];
      for (const inv of invoices) {
        await prisma.invoice.upsert({
          where:  { id: inv.id },
          update: {},
          create: { ...inv, paid_at: inv.paid_at ?? undefined },
        });
      }

      res.json({
        ok: true,
        message: "Agency seed concluído",
        data: {
          agency:   agency.name,
          login:    AGENCY_EMAIL,
          level:    "gold",
          clients:  clients.length,
          projects: projects.length,
          tasks:    tasks.length,
          invoices: invoices.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/seed/empresa-real
// Seeds empresa@allka.com.vc (TechStart Soluções Digitais) with realistic
// projects, tasks and invoices covering all status variants. Idempotent.
router.post(
  "/empresa-real",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const EMPRESA_EMAIL = "empresa@allka.com.vc";
      const COMPANY_ID    = "seed-empresa-dev-01";

      const now    = new Date();
      const past   = (d: number) => new Date(now.getTime() - d * 86_400_000);
      const future = (d: number) => new Date(now.getTime() + d * 86_400_000);

      // ── Company ───────────────────────────────────────────────────────────
      const company = await prisma.company.upsert({
        where:  { id: COMPANY_ID },
        update: { name: "TechStart Soluções Digitais", email: EMPRESA_EMAIL },
        create: {
          id:      COMPANY_ID,
          name:    "TechStart Soluções Digitais",
          cnpj:    "12.345.678/0001-55",
          email:   EMPRESA_EMAIL,
          phone:   "(11) 9 9000-0001",
          address: "Av. Paulista, 1000 — São Paulo, SP",
          segment: "Tecnologia",
          website: "https://www.techstart.com.br",
          status:  "ativo",
        },
      });

      await prisma.user.updateMany({
        where: { email: EMPRESA_EMAIL, account_type: "empresas" },
        data:  { company_id: COMPANY_ID },
      });

      // ── Projects ──────────────────────────────────────────────────────────
      const projects = [
        { id: "seed-empresa-proj-01", title: "Site Institucional + SEO",        status: "in-progress",      type: "Marketing Digital",     budget: 12000, value: 12000, progress: 45,  start_date: past(30),   end_date: future(60)  },
        { id: "seed-empresa-proj-02", title: "Campanha Google Ads — Q2/2026",   status: "in-progress",      type: "Marketing Digital",     budget: 8500,  value: 8500,  progress: 70,  start_date: past(45),   end_date: future(30)  },
        { id: "seed-empresa-proj-03", title: "Identidade Visual & Branding",    status: "completed",        type: "Design",                budget: 6000,  value: 6000,  progress: 100, start_date: past(90),   end_date: past(10)    },
        { id: "seed-empresa-proj-04", title: "App Mobile — Versão 2.0",         status: "awaiting-payment", type: "Desenvolvimento Mobile", budget: 22000, value: 22000, progress: 0,   start_date: future(7),  end_date: future(97)  },
        { id: "seed-empresa-proj-05", title: "Auditoria SEO + Conteúdo Q3",     status: "planning",         type: "Marketing Digital",     budget: 4500,  value: 4500,  progress: 10,  start_date: future(14), end_date: future(74)  },
      ];
      for (const p of projects) {
        const existing = await prisma.project.findUnique({ where: { id: p.id }, select: { id: true } });
        if (existing) {
          await prisma.project.update({
            where: { id: p.id },
            data: { status: p.status, progress: p.progress },
          });
        } else {
          await withProjectCode(prisma, (tx, projectCode) =>
            tx.project.create({ data: { ...p, client_id: COMPANY_ID, project_code: projectCode } }),
          );
        }
      }

      // ── Tasks ─────────────────────────────────────────────────────────────
      const tasks = [
        { id: "seed-empresa-task-01", project_id: "seed-empresa-proj-01", title: "Levantamento de palavras-chave SEO",              status: "completed",   priority: "high",   due_date: past(20),   delivered_at: past(18) },
        { id: "seed-empresa-task-02", project_id: "seed-empresa-proj-01", title: "Wireframes das páginas principais",                status: "completed",   priority: "high",   due_date: past(15),   delivered_at: past(12) },
        { id: "seed-empresa-task-03", project_id: "seed-empresa-proj-01", title: "Desenvolvimento front-end — Homepage",             status: "in_progress", priority: "high",   due_date: future(10), delivered_at: null },
        { id: "seed-empresa-task-04", project_id: "seed-empresa-proj-01", title: "Configuração Google Analytics + Search Console",   status: "pending",     priority: "medium", due_date: future(20), delivered_at: null },
        { id: "seed-empresa-task-05", project_id: "seed-empresa-proj-02", title: "Criação de campanhas Search — Produto A",          status: "completed",   priority: "high",   due_date: past(30),   delivered_at: past(28) },
        { id: "seed-empresa-task-06", project_id: "seed-empresa-proj-02", title: "Criação de campanhas Display — Retargeting",       status: "completed",   priority: "medium", due_date: past(20),   delivered_at: past(19) },
        { id: "seed-empresa-task-07", project_id: "seed-empresa-proj-02", title: "Otimização de lances — Semana 3",                  status: "in_progress", priority: "high",   due_date: future(5),  delivered_at: null },
        { id: "seed-empresa-task-08", project_id: "seed-empresa-proj-02", title: "Relatório de performance mensal — Junho/2026",     status: "pending",     priority: "medium", due_date: future(15), delivered_at: null },
        { id: "seed-empresa-task-09", project_id: "seed-empresa-proj-03", title: "Criação de logotipo principal e variações",        status: "completed",   priority: "high",   due_date: past(50),   delivered_at: past(48) },
        { id: "seed-empresa-task-10", project_id: "seed-empresa-proj-03", title: "Manual de marca — versão final",                   status: "completed",   priority: "high",   due_date: past(15),   delivered_at: past(12) },
        { id: "seed-empresa-task-11", project_id: "seed-empresa-proj-04", title: "Levantamento de requisitos e escopo",               status: "pending",     priority: "high",   due_date: future(10), delivered_at: null },
        { id: "seed-empresa-task-12", project_id: "seed-empresa-proj-05", title: "Auditoria técnica de SEO — relatório inicial",     status: "pending",     priority: "medium", due_date: future(20), delivered_at: null },
      ];
      for (const t of tasks) {
        await prisma.taskExecution.upsert({
          where:  { id: t.id },
          update: {},
          create: { id: t.id, project_id: t.project_id, title: t.title, status: t.status, priority: t.priority, type: "standard", due_date: t.due_date, delivered_at: t.delivered_at },
        });
      }

      // ── Invoices ──────────────────────────────────────────────────────────
      const invoices = [
        { id: "seed-empresa-inv-01", project_id: "seed-empresa-proj-03", invoice_number: "INV-2026-001", description: "Identidade Visual & Branding — Pagamento Final",  amount: 6000, status: "paid",    due_date: past(20),   paid_at: past(18)  },
        { id: "seed-empresa-inv-02", project_id: "seed-empresa-proj-01", invoice_number: "INV-2026-002", description: "Site Institucional + SEO — Parcela 1/2",           amount: 6000, status: "paid",    due_date: past(30),   paid_at: past(28)  },
        { id: "seed-empresa-inv-03", project_id: "seed-empresa-proj-01", invoice_number: "INV-2026-003", description: "Site Institucional + SEO — Parcela 2/2",           amount: 6000, status: "pending", due_date: future(15), paid_at: null       },
        { id: "seed-empresa-inv-04", project_id: "seed-empresa-proj-02", invoice_number: "INV-2026-004", description: "Google Ads Q2/2026 — Gestão + Fee",                amount: 8500, status: "pending", due_date: future(7),  paid_at: null       },
        { id: "seed-empresa-inv-05", project_id: null,                   invoice_number: "INV-2026-005", description: "Taxa de plataforma — Maio/2026",                   amount: 490,  status: "overdue", due_date: past(5),    paid_at: null       },
        { id: "seed-empresa-inv-06", project_id: "seed-empresa-proj-04", invoice_number: "INV-2026-006", description: "App Mobile 2.0 — Entrada 40%",                    amount: 8800, status: "pending", due_date: future(10), paid_at: null       },
      ];
      for (const inv of invoices) {
        await prisma.invoice.upsert({
          where:  { id: inv.id },
          update: {},
          create: { ...inv, company_id: COMPANY_ID, project_id: inv.project_id ?? undefined, paid_at: inv.paid_at ?? undefined },
        });
      }

      res.json({
        ok: true,
        message: "Empresa seed concluído",
        data: {
          company:  company.name,
          login:    EMPRESA_EMAIL,
          projects: projects.length,
          tasks:    tasks.length,
          invoices: invoices.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/seed/lider-real
// Seeds lider@allka.com.vc with LiderArea, 3 nomades, 1 project and 15
// ProjectTasks covering all lider statuses. Idempotent (upsert/find-or-create).
router.post(
  "/lider-real",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const LIDER_EMAIL  = "lider@allka.com.vc";
      const CATEGORY     = "Performance e Anúncios Patrocinados";
      const AREA         = "Performance";
      const CONSULTOR    = "Líder Allka";

      const now    = new Date();
      const past   = (d: number) => new Date(now.getTime() - d * 86_400_000);
      const future = (d: number) => new Date(now.getTime() + d * 86_400_000);

      // ── Lider user ────────────────────────────────────────────────────────
      const liderUser = await prisma.user.findFirst({
        where:  { email: LIDER_EMAIL },
        select: { id: true },
      });
      if (!liderUser) {
        res.status(422).json({ error: `Usuário ${LIDER_EMAIL} não encontrado. Execute db:seed primeiro.` });
        return;
      }
      const liderUserId = liderUser.id;

      // ── LiderArea ─────────────────────────────────────────────────────────
      const existingArea = await prisma.liderArea.findFirst({ where: { id: "seed-lider-area-01" } });
      if (!existingArea) {
        await prisma.liderArea.create({
          data: {
            id:                     "seed-lider-area-01",
            user_id:                liderUserId,
            area_nome:              AREA,
            categorias_permitidas:  JSON.stringify([CATEGORY, "SEO"]),
            produtos_permitidos:    JSON.stringify(["seed-product-perf-01"]),
            ativo:                  true,
          },
        });
      }

      // ── Nomades ───────────────────────────────────────────────────────────
      const nomadeData = [
        { userId: "seed-nomade-user-01", nomadeId: "seed-nomade-01", habId: "seed-hab-01", email: "nomade.seed1@allka.com.vc", name: "Ana Pereira",  level: "gold",   score: 820 },
        { userId: "seed-nomade-user-02", nomadeId: "seed-nomade-02", habId: "seed-hab-02", email: "nomade.seed2@allka.com.vc", name: "Bruno Lima",   level: "silver", score: 430 },
        { userId: "seed-nomade-user-03", nomadeId: "seed-nomade-03", habId: "seed-hab-03", email: "nomade.seed3@allka.com.vc", name: "Carla Souza",  level: "bronze", score: 180 },
      ];

      const password = process.env.SEED_TEST_USER_PASSWORD || "Test@2026!";
      const hash     = await bcrypt.hash(password, 10);

      for (const n of nomadeData) {
        await prisma.user.upsert({
          where:  { id: n.userId },
          update: { password_hash: hash },
          create: { id: n.userId, email: n.email, password_hash: hash, name: n.name, role: "nomad", account_type: "nomades", is_active: true },
        });
        const nomade = await prisma.nomade.upsert({
          where:  { id: n.nomadeId },
          update: {},
          create: { id: n.nomadeId, user_id: n.userId, name: n.name, email: n.email, level: n.level, status: "ativo", score: n.score, tasks_completed_total: Math.floor(n.score / 10), tasks_completed_quarter: Math.floor(n.score / 40), is_leader: false, performance_avg_rating: 4.5, performance_on_time: 0.9, performance_rejection_rate: 0.05, areas_of_interest: JSON.stringify([AREA]) },
        });
        const habExists = await prisma.nomadeHabilidade.findUnique({ where: { id: n.habId } });
        if (!habExists) {
          await prisma.nomadeHabilidade.create({
            data: { id: n.habId, nomade_id: nomade.id, area: AREA, categoria_produto: CATEGORY, nota_media: 4.5, disponibilidade: "disponivel", ativo: true },
          });
        }
      }

      // ── Agência seed ──────────────────────────────────────────────────────
      await prisma.user.upsert({
        where:  { id: "seed-agencia-user-01" },
        update: { password_hash: hash },
        create: { id: "seed-agencia-user-01", email: "agencia.seed@allka.com.vc", password_hash: hash, name: "Agência Performance Seed", role: "agency", account_type: "agencias", is_active: true },
      });

      // ── Empresa cliente ───────────────────────────────────────────────────
      await prisma.company.upsert({
        where:  { id: "seed-company-lider-01" },
        update: {},
        create: { id: "seed-company-lider-01", name: "Empresa Seed Performance", cnpj: "00.000.000/0001-99", status: "ativo" },
      });

      // ── Produto ───────────────────────────────────────────────────────────
      await prisma.product.upsert({
        where:  { id: "seed-product-perf-01" },
        update: {},
        create: { id: "seed-product-perf-01", name: "Gestão de Performance", description: "Gestão de campanhas de performance e mídia paga", category: CATEGORY, base_price: 2500, complexity: "intermediate", is_active: true },
      });

      // ── Projeto ───────────────────────────────────────────────────────────
      const existingLiderProject = await prisma.project.findUnique({ where: { id: "seed-project-lider-01" }, select: { id: true } });
      if (existingLiderProject) {
        await prisma.project.update({
          where: { id: "seed-project-lider-01" },
          data: { consultant: CONSULTOR, consultant_email: LIDER_EMAIL },
        });
      } else {
        await withProjectCode(prisma, (tx, projectCode) =>
          tx.project.create({
            data: { id: "seed-project-lider-01", title: "Projeto Allka Seed", description: "Gestão de performance e mídia paga", client_id: "seed-company-lider-01", status: "in-progress", lifecycle: "mensal", type: "Marketing Digital", value: 5000, budget: 5000, progress: 40, consultant: CONSULTOR, consultant_email: LIDER_EMAIL, start_date: past(30), project_code: projectCode },
          }),
        );
      }

      // ── ProjectProduct ────────────────────────────────────────────────────
      const ppExists = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id: "seed-project-lider-01", product_id: "seed-product-perf-01" } },
      });
      if (!ppExists) {
        await prisma.projectProduct.create({
          data: { id: "seed-pp-lider-01", project_id: "seed-project-lider-01", product_id: "seed-product-perf-01", product_name_snapshot: "Gestão de Performance", product_code_snapshot: "PERF-001", product_category_snapshot: CATEGORY, product_price_snapshot: 2500, preco_final_cliente_snapshot: 2500, comissao_snapshot: 0, pagador_snapshot: "AGENCIA", status: "EM_EXECUCAO" },
        });
      }

      // ── 15 ProjectTasks cobrindo todos os status do líder ─────────────────
      const nomadeIds = ["seed-nomade-01", "seed-nomade-02", "seed-nomade-03"];
      const TASKS = [
        // PARA_LANCAMENTO (3)
        { id: "seed-task-01", code: "T-SEED-001", title: "Criar campanha Google Ads — Q2",       status: "PARA_LANCAMENTO",                 due_date: future(7),  nomadeIdx: 0, priority: "high"   },
        { id: "seed-task-02", code: "T-SEED-002", title: "Otimizar campanhas de remarketing",    status: "PARA_LANCAMENTO",                 due_date: future(10), nomadeIdx: 1, priority: "medium" },
        { id: "seed-task-03", code: "T-SEED-003", title: "Análise de palavras-chave SEO",        status: "PARA_LANCAMENTO",                 due_date: future(5),  nomadeIdx: 2, priority: "medium" },
        // EM_EXECUCAO (3)
        { id: "seed-task-04", code: "T-SEED-004", title: "Relatório mensal de performance",      status: "EM_EXECUCAO",                     due_date: future(3),  nomadeIdx: 0, priority: "high"   },
        { id: "seed-task-05", code: "T-SEED-005", title: "Configuração de pixel de conversão",   status: "EM_EXECUCAO",                     due_date: future(4),  nomadeIdx: 1, priority: "urgent" },
        { id: "seed-task-06", code: "T-SEED-006", title: "Criação de públicos personalizados",   status: "EM_EXECUCAO",                     due_date: future(6),  nomadeIdx: 2, priority: "medium" },
        // LANCAMENTO_ENVIADO_PARA_ANALISE (2)
        { id: "seed-task-07", code: "T-SEED-007", title: "Briefing campanha Black Friday",       status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(2),  nomadeIdx: 0, priority: "urgent" },
        { id: "seed-task-08", code: "T-SEED-008", title: "Briefing campanha institucional",      status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(1),  nomadeIdx: 1, priority: "medium" },
        // ENTREGA_PENDENTE (2)
        { id: "seed-task-09", code: "T-SEED-009", title: "Entrega relatório de impressões",      status: "ENTREGA_PENDENTE",                due_date: past(1),    nomadeIdx: 2, priority: "high"   },
        { id: "seed-task-10", code: "T-SEED-010", title: "Entrega de criativos para Meta Ads",   status: "ENTREGA_PENDENTE",                due_date: past(2),    nomadeIdx: 0, priority: "medium" },
        // ENTREGA_ATRASADA (2)
        { id: "seed-task-11", code: "T-SEED-011", title: "Ajuste de lances por horário",         status: "ENTREGA_ATRASADA",                due_date: past(5),    nomadeIdx: 1, priority: "high"   },
        { id: "seed-task-12", code: "T-SEED-012", title: "Atualização de estratégia de lances",  status: "ENTREGA_ATRASADA",                due_date: past(8),    nomadeIdx: 2, priority: "urgent" },
        // REPROVADA (2)
        { id: "seed-task-13", code: "T-SEED-013", title: "Revisão de copy dos anúncios",         status: "REPROVADA",                       due_date: past(3),    nomadeIdx: 0, priority: "medium" },
        { id: "seed-task-14", code: "T-SEED-014", title: "Reestruturação de grupos de anúncio",  status: "REPROVADA",                       due_date: past(6),    nomadeIdx: 1, priority: "high"   },
        // APROVADA (1)
        { id: "seed-task-15", code: "T-SEED-015", title: "Campanha sazonal aprovada",            status: "APROVADA",                        due_date: past(1),    nomadeIdx: 2, priority: "medium" },
      ];

      let created = 0;
      let updated = 0;
      for (const t of TASKS) {
        const baseData = {
          project_id:             "seed-project-lider-01",
          project_product_id:     "seed-pp-lider-01",
          product_id:             "seed-product-perf-01",
          task_code:              t.code,
          code_snapshot:          t.code,
          title:                  t.title,
          name_snapshot:          t.title,
          category_snapshot:      CATEGORY,
          status:                 t.status,
          priority:               t.priority,
          fase:                   "Execução",
          phase:                  "Execução",
          due_date:               t.due_date,
          lider_responsavel_id:   liderUserId,
          responsavel_agencia_id: "seed-agencia-user-01",
          nomade_responsavel_id:  nomadeIds[t.nomadeIdx],
        };
        const exists = await prisma.projectTask.findUnique({ where: { id: t.id } });
        if (exists) {
          await prisma.projectTask.update({ where: { id: t.id }, data: baseData });
          updated++;
        } else {
          await prisma.projectTask.create({ data: { id: t.id, ...baseData } });
          created++;
        }
      }

      res.json({
        ok:      true,
        message: "Líder seed concluído",
        data: {
          login:   LIDER_EMAIL,
          area:    AREA,
          nomades: nomadeData.length,
          tasks:   { total: TASKS.length, created, updated },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
