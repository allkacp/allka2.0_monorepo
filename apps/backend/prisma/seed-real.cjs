/**
 * seed-real.cjs — Prod-safe seed (no tsx required, runs with plain Node).
 *
 * Mirrors the upsert logic of the admin-seed endpoints
 * (agency-real / empresa-real / lider-real) so the same realistic data exists
 * on the VPS as locally. Self-contained: uses only @prisma/client + bcryptjs
 * (both production deps). Idempotent — re-running upserts, never deletes.
 *
 * Run: node prisma/seed-real.cjs   (or: npm run db:seed:real:prod)
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const now = new Date();
const past = (d) => new Date(now.getTime() - d * 86_400_000);
const future = (d) => new Date(now.getTime() + d * 86_400_000);

// ── Base Users (admin + role accounts) ──────────────────────────────────────
// Garante que todos os usuários necessários existam no banco antes dos seeds
// específicos. Usa upsert — não apaga, não duplica. Senha: env ou fallback.
async function seedBaseUsers() {
  const password = process.env.SEED_TEST_USER_PASSWORD || "Test@2026!";
  const hash = await bcrypt.hash(password, 10);

  // Admin master (conta real de acesso ao painel admin)
  await prisma.user.upsert({
    where: { email: "cp@lamego.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "cp@lamego.com.vc",
      password_hash: hash,
      name: "Vinicius Guardia",
      role: "admin",
      account_type: "admin",
      is_active: true,
    },
  });

  // Agência (precisa existir antes de seedAgencia criar Agency e projetos)
  await prisma.user.upsert({
    where: { email: "agencia@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "agencia@allka.com.vc",
      password_hash: hash,
      name: "Lamego Teste Agency",
      role: "agency_admin",
      account_type: "agencias",
      is_active: true,
    },
  });

  // Empresa (precisa existir antes de seedEmpresa criar Company e projetos)
  await prisma.user.upsert({
    where: { email: "empresa@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "empresa@allka.com.vc",
      password_hash: hash,
      name: "TechStart Soluções Digitais",
      role: "company_admin",
      account_type: "empresas",
      is_active: true,
    },
  });

  // Nômade (conta dev para a tela /nomades)
  await prisma.user.upsert({
    where: { email: "nomade@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "nomade@allka.com.vc",
      password_hash: hash,
      name: "Nômade Dev",
      role: "nomad",
      account_type: "nomades",
      is_active: true,
    },
  });

  // Parceiro (conta dev para a tela /parceiro)
  await prisma.user.upsert({
    where: { email: "parceiro@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "parceiro@allka.com.vc",
      password_hash: hash,
      name: "Parceiro Dev",
      role: "partner",
      account_type: "parceiro",
      is_active: true,
    },
  });

  // Company Test (conta company com dados completos criados no seed.ts)
  // O seed-real não cria os dados desta company — apenas garante o login existe.
  const CT_COMPANY_ID = "cmqgqm0u3000a13ogmj3z2i6c";
  await prisma.company.upsert({
    where: { id: CT_COMPANY_ID },
    update: {},
    create: {
      id: CT_COMPANY_ID,
      name: "Company Test",
      cnpj: "00.000.001/0001-99",
      email: "company@allka.test",
      phone: "(11) 90000-0001",
      status: "ativo",
      segment: "Tecnologia",
    },
  });
  await prisma.user.upsert({
    where: { email: "company@allka.test" },
    update: { password_hash: hash, company_id: CT_COMPANY_ID, is_active: true },
    create: {
      email: "company@allka.test",
      password_hash: hash,
      name: "Company Test",
      role: "company_admin",
      account_type: "empresas",
      company_id: CT_COMPANY_ID,
      is_active: true,
    },
  });

  console.log("[seed-real] base users OK: admin · agencia · empresa · nomade · parceiro · company@allka.test");
}

// ── Agency ───────────────────────────────────────────────────────────────────
async function seedAgencia() {
  const AGENCY_NAME = "Lamego Teste Agency";
  const AGENCY_EMAIL = "agencia@allka.com.vc";
  const CONSULTANT = "Fernanda Alves";
  const CONSULTANT_EMAIL = "fernanda.alves@allka.com.vc";

  const userRecord = await prisma.user.findFirst({
    where: { email: AGENCY_EMAIL },
    select: { id: true },
  });
  if (!userRecord) {
    console.warn(`[seed-real] agency: usuário ${AGENCY_EMAIL} não existe — pulando.`);
    return;
  }

  const agency = await prisma.agency.upsert({
    where: { id: "seed-agencia-dev-01" },
    update: { name: AGENCY_NAME, partner_level: "gold", wallet_balance: 28500, status: "ativo" },
    create: {
      id: "seed-agencia-dev-01",
      user_id: userRecord.id,
      name: AGENCY_NAME,
      cnpj: "12.345.678/0001-90",
      email: "contato@lamegoagency.com.br",
      phone: "(11) 9 9000-1234",
      partner_level: "gold",
      wallet_balance: 28500,
      status: "ativo",
    },
  });

  await prisma.user.update({ where: { id: userRecord.id }, data: { name: AGENCY_NAME } });

  const clients = [
    { id: "seed-agencia-cli-01", name: "Starbucks Coffee Brasil", cnpj: "08.883.874/0001-62", segment: "Alimentação" },
    { id: "seed-agencia-cli-02", name: "Nubank S.A.", cnpj: "18.236.120/0001-58", segment: "Fintech" },
    { id: "seed-agencia-cli-03", name: "Natura Cosméticos", cnpj: "71.673.990/0001-77", segment: "Cosméticos" },
    { id: "seed-agencia-cli-04", name: "Ambev S.A.", cnpj: "02.808.708/0001-07", segment: "Bebidas" },
    { id: "seed-agencia-cli-05", name: "iFood Delivery", cnpj: "14.380.200/0001-21", segment: "Delivery" },
  ];
  for (const c of clients) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: { id: c.id, name: c.name, cnpj: c.cnpj, segment: c.segment, status: "ativo" },
    });
  }

  const projects = [
    { id: "seed-agencia-proj-01", title: "Social Media Mensal — Starbucks", client_id: "seed-agencia-cli-01", status: "in-progress", type: "Social Media", value: 8000, budget: 8000, spent: 4800, progress: 60, lifecycle: "mensal", start_date: past(175), end_date: future(190) },
    { id: "seed-agencia-proj-02", title: "Identidade Visual Corporativa — Nubank", client_id: "seed-agencia-cli-02", status: "in-progress", type: "Branding", value: 38000, budget: 38000, spent: 24700, progress: 65, lifecycle: "avulso", start_date: past(130), end_date: future(5) },
    { id: "seed-agencia-proj-03", title: "Rebranding Institucional — Natura", client_id: "seed-agencia-cli-03", status: "completed", type: "Branding", value: 45000, budget: 45000, spent: 42800, progress: 100, lifecycle: "avulso", start_date: past(297), end_date: past(135) },
    { id: "seed-agencia-proj-04", title: "Campanha Black Friday 2026 — Ambev", client_id: "seed-agencia-cli-04", status: "planning", type: "Campanha", value: 65000, budget: 65000, spent: 0, progress: 15, lifecycle: "avulso", start_date: future(37), end_date: future(157) },
    { id: "seed-agencia-proj-05", title: "Redesign Portal Parceiros — iFood", client_id: "seed-agencia-cli-05", status: "paused", type: "Web Design", value: 52000, budget: 52000, spent: 15600, progress: 30, lifecycle: "avulso", start_date: past(160), end_date: future(20) },
    { id: "seed-agencia-proj-06", title: "App de Fidelidade UX/UI — Starbucks", client_id: "seed-agencia-cli-01", status: "awaiting-payment", type: "UX/UI", value: 35000, budget: 35000, spent: 0, progress: 0, lifecycle: "avulso", start_date: future(14), end_date: future(104) },
  ];
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { status: p.status, progress: p.progress, spent: p.spent },
      create: {
        ...p,
        agency: AGENCY_NAME,
        company_type: "company",
        consultant: CONSULTANT,
        consultant_email: CONSULTANT_EMAIL,
        portfolio_permission: p.status === "completed",
        bitrix_sync: false,
        from_lead: false,
        nomades: "[]",
      },
    });
  }

  const tasks = [
    { id: "seed-agencia-task-01", project_id: "seed-agencia-proj-01", title: "Post Instagram — Café da Semana", status: "in_progress", priority: "medium", due_date: future(3), delivered_at: null },
    { id: "seed-agencia-task-02", project_id: "seed-agencia-proj-01", title: "Stories — Bastidores da Torra", status: "pending", priority: "low", due_date: future(7), delivered_at: null },
    { id: "seed-agencia-task-03", project_id: "seed-agencia-proj-01", title: "Template de email — Junho", status: "completed", priority: "medium", due_date: past(5), delivered_at: past(6) },
    { id: "seed-agencia-task-04", project_id: "seed-agencia-proj-02", title: "Manual de marca — versão digital", status: "in_progress", priority: "medium", due_date: future(4), delivered_at: null },
    { id: "seed-agencia-task-05", project_id: "seed-agencia-proj-02", title: "Paleta de cores e tipografia", status: "completed", priority: "high", due_date: past(30), delivered_at: past(31) },
    { id: "seed-agencia-task-06", project_id: "seed-agencia-proj-03", title: "Pesquisa de mercado e benchmarking", status: "completed", priority: "high", due_date: past(270), delivered_at: past(272) },
    { id: "seed-agencia-task-07", project_id: "seed-agencia-proj-03", title: "Design do logotipo — 3 opções", status: "completed", priority: "high", due_date: past(210), delivered_at: past(211) },
    { id: "seed-agencia-task-08", project_id: "seed-agencia-proj-04", title: "Briefing e planejamento da campanha", status: "pending", priority: "urgent", due_date: future(50), delivered_at: null },
    { id: "seed-agencia-task-09", project_id: "seed-agencia-proj-05", title: "Revisão de UX — Fluxo de cadastro", status: "pending", priority: "high", due_date: future(25), delivered_at: null },
    { id: "seed-agencia-task-10", project_id: "seed-agencia-proj-02", title: "Criação do moodboard", status: "completed", priority: "medium", due_date: past(90), delivered_at: past(91) },
  ];
  for (const t of tasks) {
    await prisma.taskExecution.upsert({
      where: { id: t.id },
      update: {},
      create: { id: t.id, project_id: t.project_id, title: t.title, status: t.status, priority: t.priority, type: "standard", due_date: t.due_date, delivered_at: t.delivered_at },
    });
  }

  const invoices = [
    { id: "seed-agencia-inv-01", company_id: "seed-agencia-cli-03", project_id: "seed-agencia-proj-03", invoice_number: "NF-2025-089", description: "Rebranding Institucional Natura — Pagamento final", amount: 45000, status: "paid", due_date: past(137), paid_at: past(138) },
    { id: "seed-agencia-inv-02", company_id: "seed-agencia-cli-01", project_id: "seed-agencia-proj-01", invoice_number: "NF-2026-021", description: "Social Media Mensal Starbucks — Junho/2026", amount: 8000, status: "paid", due_date: past(20), paid_at: past(21) },
    { id: "seed-agencia-inv-03", company_id: "seed-agencia-cli-02", project_id: "seed-agencia-proj-02", invoice_number: "NF-2026-034", description: "Identidade Visual Corporativa Nubank — Parcela 2/2", amount: 19000, status: "pending", due_date: future(5), paid_at: null },
    { id: "seed-agencia-inv-04", company_id: "seed-agencia-cli-01", project_id: "seed-agencia-proj-06", invoice_number: "NF-2026-041", description: "App Fidelidade UX/UI Starbucks — Entrada 50%", amount: 17500, status: "pending", due_date: future(10), paid_at: null },
    { id: "seed-agencia-inv-05", company_id: "seed-agencia-cli-05", project_id: "seed-agencia-proj-05", invoice_number: "NF-2026-018", description: "Portal Parceiros iFood — Parcela 1/3", amount: 17333, status: "overdue", due_date: past(15), paid_at: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: { ...inv, paid_at: inv.paid_at ?? undefined },
    });
  }

  console.log(`[seed-real] agency OK: ${agency.name} (${clients.length} clientes, ${projects.length} projetos, ${tasks.length} tarefas, ${invoices.length} faturas)`);
}

// ── Empresa ──────────────────────────────────────────────────────────────────
async function seedEmpresa() {
  const EMPRESA_EMAIL = "empresa@allka.com.vc";
  const COMPANY_ID = "seed-empresa-dev-01";

  const company = await prisma.company.upsert({
    where: { id: COMPANY_ID },
    update: { name: "TechStart Soluções Digitais", email: EMPRESA_EMAIL },
    create: {
      id: COMPANY_ID,
      name: "TechStart Soluções Digitais",
      cnpj: "12.345.678/0001-55",
      email: EMPRESA_EMAIL,
      phone: "(11) 9 9000-0001",
      address: "Av. Paulista, 1000 — São Paulo, SP",
      segment: "Tecnologia",
      website: "https://www.techstart.com.br",
      status: "ativo",
    },
  });

  await prisma.user.updateMany({
    where: { email: EMPRESA_EMAIL, account_type: "empresas" },
    data: { company_id: COMPANY_ID },
  });

  const projects = [
    { id: "seed-empresa-proj-01", title: "Site Institucional + SEO", status: "in-progress", type: "Marketing Digital", budget: 12000, value: 12000, progress: 45, start_date: past(30), end_date: future(60) },
    { id: "seed-empresa-proj-02", title: "Campanha Google Ads — Q2/2026", status: "in-progress", type: "Marketing Digital", budget: 8500, value: 8500, progress: 70, start_date: past(45), end_date: future(30) },
    { id: "seed-empresa-proj-03", title: "Identidade Visual & Branding", status: "completed", type: "Design", budget: 6000, value: 6000, progress: 100, start_date: past(90), end_date: past(10) },
    { id: "seed-empresa-proj-04", title: "App Mobile — Versão 2.0", status: "awaiting-payment", type: "Desenvolvimento Mobile", budget: 22000, value: 22000, progress: 0, start_date: future(7), end_date: future(97) },
    { id: "seed-empresa-proj-05", title: "Auditoria SEO + Conteúdo Q3", status: "planning", type: "Marketing Digital", budget: 4500, value: 4500, progress: 10, start_date: future(14), end_date: future(74) },
  ];
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: { status: p.status, progress: p.progress },
      create: { ...p, client_id: COMPANY_ID },
    });
  }

  const tasks = [
    { id: "seed-empresa-task-01", project_id: "seed-empresa-proj-01", title: "Levantamento de palavras-chave SEO", status: "completed", priority: "high", due_date: past(20), delivered_at: past(18) },
    { id: "seed-empresa-task-02", project_id: "seed-empresa-proj-01", title: "Wireframes das páginas principais", status: "completed", priority: "high", due_date: past(15), delivered_at: past(12) },
    { id: "seed-empresa-task-03", project_id: "seed-empresa-proj-01", title: "Desenvolvimento front-end — Homepage", status: "in_progress", priority: "high", due_date: future(10), delivered_at: null },
    { id: "seed-empresa-task-04", project_id: "seed-empresa-proj-01", title: "Configuração Google Analytics + Search Console", status: "pending", priority: "medium", due_date: future(20), delivered_at: null },
    { id: "seed-empresa-task-05", project_id: "seed-empresa-proj-02", title: "Criação de campanhas Search — Produto A", status: "completed", priority: "high", due_date: past(30), delivered_at: past(28) },
    { id: "seed-empresa-task-06", project_id: "seed-empresa-proj-02", title: "Criação de campanhas Display — Retargeting", status: "completed", priority: "medium", due_date: past(20), delivered_at: past(19) },
    { id: "seed-empresa-task-07", project_id: "seed-empresa-proj-02", title: "Otimização de lances — Semana 3", status: "in_progress", priority: "high", due_date: future(5), delivered_at: null },
    { id: "seed-empresa-task-08", project_id: "seed-empresa-proj-02", title: "Relatório de performance mensal — Junho/2026", status: "pending", priority: "medium", due_date: future(15), delivered_at: null },
    { id: "seed-empresa-task-09", project_id: "seed-empresa-proj-03", title: "Criação de logotipo principal e variações", status: "completed", priority: "high", due_date: past(50), delivered_at: past(48) },
    { id: "seed-empresa-task-10", project_id: "seed-empresa-proj-03", title: "Manual de marca — versão final", status: "completed", priority: "high", due_date: past(15), delivered_at: past(12) },
    { id: "seed-empresa-task-11", project_id: "seed-empresa-proj-04", title: "Levantamento de requisitos e escopo", status: "pending", priority: "high", due_date: future(10), delivered_at: null },
    { id: "seed-empresa-task-12", project_id: "seed-empresa-proj-05", title: "Auditoria técnica de SEO — relatório inicial", status: "pending", priority: "medium", due_date: future(20), delivered_at: null },
  ];
  for (const t of tasks) {
    await prisma.taskExecution.upsert({
      where: { id: t.id },
      update: {},
      create: { id: t.id, project_id: t.project_id, title: t.title, status: t.status, priority: t.priority, type: "standard", due_date: t.due_date, delivered_at: t.delivered_at },
    });
  }

  const invoices = [
    { id: "seed-empresa-inv-01", project_id: "seed-empresa-proj-03", invoice_number: "INV-2026-001", description: "Identidade Visual & Branding — Pagamento Final", amount: 6000, status: "paid", due_date: past(20), paid_at: past(18) },
    { id: "seed-empresa-inv-02", project_id: "seed-empresa-proj-01", invoice_number: "INV-2026-002", description: "Site Institucional + SEO — Parcela 1/2", amount: 6000, status: "paid", due_date: past(30), paid_at: past(28) },
    { id: "seed-empresa-inv-03", project_id: "seed-empresa-proj-01", invoice_number: "INV-2026-003", description: "Site Institucional + SEO — Parcela 2/2", amount: 6000, status: "pending", due_date: future(15), paid_at: null },
    { id: "seed-empresa-inv-04", project_id: "seed-empresa-proj-02", invoice_number: "INV-2026-004", description: "Google Ads Q2/2026 — Gestão + Fee", amount: 8500, status: "pending", due_date: future(7), paid_at: null },
    { id: "seed-empresa-inv-05", project_id: null, invoice_number: "INV-2026-005", description: "Taxa de plataforma — Maio/2026", amount: 490, status: "overdue", due_date: past(5), paid_at: null },
    { id: "seed-empresa-inv-06", project_id: "seed-empresa-proj-04", invoice_number: "INV-2026-006", description: "App Mobile 2.0 — Entrada 40%", amount: 8800, status: "pending", due_date: future(10), paid_at: null },
  ];
  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: { ...inv, company_id: COMPANY_ID, project_id: inv.project_id ?? undefined, paid_at: inv.paid_at ?? undefined },
    });
  }

  console.log(`[seed-real] empresa OK: ${company.name} (${projects.length} projetos, ${tasks.length} tarefas, ${invoices.length} faturas)`);
}

// ── Líder ────────────────────────────────────────────────────────────────────
async function seedLider() {
  const LIDER_EMAIL = "lider@allka.com.vc";
  const LIDER_EMAIL_ALT = "lider.performance@allka.test";
  const LIDER_USER_ID = "seed-lider-user-01";
  const CATEGORY = "Performance e Anúncios Patrocinados";
  const AREA = "Performance";
  const CONSULTOR = "Líder Allka";

  const password = process.env.SEED_TEST_USER_PASSWORD || "Test@2026!";
  const hash = await bcrypt.hash(password, 10);

  // Resolve o líder por prioridade: email canônico → email de teste (.test) →
  // qualquer usuário com papel de líder. Só cria um usuário seed se NENHUM existir.
  let liderUser =
    (await prisma.user.findFirst({ where: { email: LIDER_EMAIL }, select: { id: true, email: true } })) ||
    (await prisma.user.findFirst({ where: { email: LIDER_EMAIL_ALT }, select: { id: true, email: true } })) ||
    (await prisma.user.findFirst({
      where: { OR: [{ account_type: "lider" }, { role: "lider" }] },
      select: { id: true, email: true },
    }));

  if (liderUser) {
    console.log(`[seed-real] lider: usando usuário ${liderUser.email}`);
  } else {
    // Fallback seguro: cria um usuário seed controlado (mesmo padrão de seed-lider-tasks.ts).
    // Idempotente por id fixo; email canônico só é criado porque a busca acima confirmou que não existe.
    liderUser = await prisma.user.upsert({
      where: { id: LIDER_USER_ID },
      update: { password_hash: hash },
      create: {
        id: LIDER_USER_ID,
        email: LIDER_EMAIL,
        password_hash: hash,
        name: "Líder Performance Seed",
        role: "lider",
        account_type: "lider",
        is_active: true,
      },
      select: { id: true, email: true },
    });
    console.log(`[seed-real] lider: usuário seed criado ${liderUser.email}`);
  }
  const liderUserId = liderUser.id;

  const existingArea = await prisma.liderArea.findFirst({ where: { id: "seed-lider-area-01" } });
  if (!existingArea) {
    await prisma.liderArea.create({
      data: {
        id: "seed-lider-area-01",
        user_id: liderUserId,
        area_nome: AREA,
        categorias_permitidas: JSON.stringify([CATEGORY, "SEO"]),
        produtos_permitidos: JSON.stringify(["seed-product-perf-01"]),
        ativo: true,
      },
    });
  }

  const nomadeData = [
    { userId: "seed-nomade-user-01", nomadeId: "seed-nomade-01", habId: "seed-hab-01", email: "nomade.seed1@allka.com.vc", name: "Ana Pereira", level: "gold", score: 820 },
    { userId: "seed-nomade-user-02", nomadeId: "seed-nomade-02", habId: "seed-hab-02", email: "nomade.seed2@allka.com.vc", name: "Bruno Lima", level: "silver", score: 430 },
    { userId: "seed-nomade-user-03", nomadeId: "seed-nomade-03", habId: "seed-hab-03", email: "nomade.seed3@allka.com.vc", name: "Carla Souza", level: "bronze", score: 180 },
  ];

  for (const n of nomadeData) {
    await prisma.user.upsert({
      where: { id: n.userId },
      update: { password_hash: hash },
      create: { id: n.userId, email: n.email, password_hash: hash, name: n.name, role: "nomad", account_type: "nomades", is_active: true },
    });
    const nomade = await prisma.nomade.upsert({
      where: { id: n.nomadeId },
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

  await prisma.user.upsert({
    where: { id: "seed-agencia-user-01" },
    update: { password_hash: hash },
    create: { id: "seed-agencia-user-01", email: "agencia.seed@allka.com.vc", password_hash: hash, name: "Agência Performance Seed", role: "agency", account_type: "agencias", is_active: true },
  });

  await prisma.company.upsert({
    where: { id: "seed-company-lider-01" },
    update: {},
    create: { id: "seed-company-lider-01", name: "Empresa Seed Performance", cnpj: "00.000.000/0001-99", status: "ativo" },
  });

  await prisma.product.upsert({
    where: { id: "seed-product-perf-01" },
    update: {},
    create: { id: "seed-product-perf-01", name: "Gestão de Performance", description: "Gestão de campanhas de performance e mídia paga", category: CATEGORY, base_price: 2500, complexity: "intermediate", is_active: true },
  });

  await prisma.project.upsert({
    where: { id: "seed-project-lider-01" },
    update: { consultant: CONSULTOR, consultant_email: LIDER_EMAIL },
    create: { id: "seed-project-lider-01", title: "Projeto Allka Seed", description: "Gestão de performance e mídia paga", client_id: "seed-company-lider-01", status: "in-progress", lifecycle: "mensal", type: "Marketing Digital", value: 5000, budget: 5000, progress: 40, consultant: CONSULTOR, consultant_email: LIDER_EMAIL, start_date: past(30) },
  });

  const ppExists = await prisma.projectProduct.findUnique({
    where: { project_id_product_id: { project_id: "seed-project-lider-01", product_id: "seed-product-perf-01" } },
  });
  if (!ppExists) {
    await prisma.projectProduct.create({
      data: { id: "seed-pp-lider-01", project_id: "seed-project-lider-01", product_id: "seed-product-perf-01", product_name_snapshot: "Gestão de Performance", product_code_snapshot: "PERF-001", product_category_snapshot: CATEGORY, product_price_snapshot: 2500, preco_final_cliente_snapshot: 2500, comissao_snapshot: 0, pagador_snapshot: "AGENCIA", status: "EM_EXECUCAO" },
    });
  }

  const nomadeIds = ["seed-nomade-01", "seed-nomade-02", "seed-nomade-03"];
  const TASKS = [
    { id: "seed-task-01", code: "T-SEED-001", title: "Criar campanha Google Ads — Q2", status: "PARA_LANCAMENTO", due_date: future(7), nomadeIdx: 0, priority: "high" },
    { id: "seed-task-02", code: "T-SEED-002", title: "Otimizar campanhas de remarketing", status: "PARA_LANCAMENTO", due_date: future(10), nomadeIdx: 1, priority: "medium" },
    { id: "seed-task-03", code: "T-SEED-003", title: "Análise de palavras-chave SEO", status: "PARA_LANCAMENTO", due_date: future(5), nomadeIdx: 2, priority: "medium" },
    { id: "seed-task-04", code: "T-SEED-004", title: "Relatório mensal de performance", status: "EM_EXECUCAO", due_date: future(3), nomadeIdx: 0, priority: "high" },
    { id: "seed-task-05", code: "T-SEED-005", title: "Configuração de pixel de conversão", status: "EM_EXECUCAO", due_date: future(4), nomadeIdx: 1, priority: "urgent" },
    { id: "seed-task-06", code: "T-SEED-006", title: "Criação de públicos personalizados", status: "EM_EXECUCAO", due_date: future(6), nomadeIdx: 2, priority: "medium" },
    { id: "seed-task-07", code: "T-SEED-007", title: "Briefing campanha Black Friday", status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(2), nomadeIdx: 0, priority: "urgent" },
    { id: "seed-task-08", code: "T-SEED-008", title: "Briefing campanha institucional", status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(1), nomadeIdx: 1, priority: "medium" },
    { id: "seed-task-09", code: "T-SEED-009", title: "Entrega relatório de impressões", status: "ENTREGA_PENDENTE", due_date: past(1), nomadeIdx: 2, priority: "high" },
    { id: "seed-task-10", code: "T-SEED-010", title: "Entrega de criativos para Meta Ads", status: "ENTREGA_PENDENTE", due_date: past(2), nomadeIdx: 0, priority: "medium" },
    { id: "seed-task-11", code: "T-SEED-011", title: "Ajuste de lances por horário", status: "ENTREGA_ATRASADA", due_date: past(5), nomadeIdx: 1, priority: "high" },
    { id: "seed-task-12", code: "T-SEED-012", title: "Atualização de estratégia de lances", status: "ENTREGA_ATRASADA", due_date: past(8), nomadeIdx: 2, priority: "urgent" },
    { id: "seed-task-13", code: "T-SEED-013", title: "Revisão de copy dos anúncios", status: "REPROVADA", due_date: past(3), nomadeIdx: 0, priority: "medium" },
    { id: "seed-task-14", code: "T-SEED-014", title: "Reestruturação de grupos de anúncio", status: "REPROVADA", due_date: past(6), nomadeIdx: 1, priority: "high" },
    { id: "seed-task-15", code: "T-SEED-015", title: "Campanha sazonal aprovada", status: "APROVADA", due_date: past(1), nomadeIdx: 2, priority: "medium" },
  ];

  for (const t of TASKS) {
    const baseData = {
      project_id: "seed-project-lider-01",
      project_product_id: "seed-pp-lider-01",
      product_id: "seed-product-perf-01",
      task_code: t.code,
      code_snapshot: t.code,
      title: t.title,
      name_snapshot: t.title,
      category_snapshot: CATEGORY,
      status: t.status,
      priority: t.priority,
      fase: "Execução",
      phase: "Execução",
      due_date: t.due_date,
      lider_responsavel_id: liderUserId,
      responsavel_agencia_id: "seed-agencia-user-01",
      nomade_responsavel_id: nomadeIds[t.nomadeIdx],
    };
    const exists = await prisma.projectTask.findUnique({ where: { id: t.id } });
    if (exists) {
      await prisma.projectTask.update({ where: { id: t.id }, data: baseData });
    } else {
      await prisma.projectTask.create({ data: { id: t.id, ...baseData } });
    }
  }

  console.log(`[seed-real] lider OK: ${AREA} (${nomadeData.length} nômades, ${TASKS.length} tarefas)`);
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("[seed-real] iniciando seed prod-safe (upsert idempotente)…");
  for (const [name, fn] of [["base-users", seedBaseUsers], ["agencia", seedAgencia], ["empresa", seedEmpresa], ["lider", seedLider]]) {
    try {
      await fn();
    } catch (err) {
      console.error(`[seed-real] erro no bloco ${name}:`, err?.message || err);
    }
  }
  console.log("[seed-real] concluído.");
}

main()
  .catch((e) => {
    console.error("[seed-real] falha fatal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
