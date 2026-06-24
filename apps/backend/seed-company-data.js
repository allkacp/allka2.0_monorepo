require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const COMPANY_ID = 'cmqgqm0u3000a13ogmj3z2i6c'; // Company Test (company@allka.test)

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function run() {
  console.log('🌱 Seeding company data for', COMPANY_ID, '...\n');

  // ── 1. Projects ────────────────────────────────────────────────────────────
  const projects = [
    {
      id: 'proj-ct-01',
      title: 'Site institucional + SEO',
      type: 'Desenvolvimento Web',
      status: 'producao',
      value: 8500,
      budget: 8500,
      progress: 45,
      start_date: daysAgo(25),
      end_date: daysAgo(-15),
    },
    {
      id: 'proj-ct-02',
      title: 'Gestão de Tráfego Pago — Q3',
      type: 'Marketing Digital',
      status: 'producao',
      value: 3200,
      budget: 3200,
      progress: 70,
      start_date: daysAgo(18),
      end_date: daysAgo(-20),
    },
    {
      id: 'proj-ct-03',
      title: 'Identidade Visual & Branding',
      type: 'Design',
      status: 'revisao',
      value: 5000,
      budget: 5000,
      progress: 85,
      start_date: daysAgo(40),
      end_date: daysAgo(-5),
    },
    {
      id: 'proj-ct-04',
      title: 'Criação de Conteúdo — Redes Sociais',
      type: 'Marketing Digital',
      status: 'briefing',
      value: 2400,
      budget: 2400,
      progress: 10,
      start_date: daysAgo(5),
      end_date: daysAgo(-30),
    },
    {
      id: 'proj-ct-05',
      title: 'Landing Page — Campanha de Lançamento',
      type: 'Desenvolvimento Web',
      status: 'briefing',
      value: 3800,
      budget: 3800,
      progress: 0,
      start_date: daysAgo(3),
      end_date: daysAgo(-25),
    },
    {
      id: 'proj-ct-06',
      title: 'E-commerce + Integração de Pagamento',
      type: 'E-commerce',
      status: 'entregue',
      value: 14000,
      budget: 14000,
      progress: 100,
      start_date: daysAgo(95),
      end_date: daysAgo(10),
    },
    {
      id: 'proj-ct-07',
      title: 'App de Agendamento — MVP',
      type: 'Desenvolvimento Mobile',
      status: 'entregue',
      value: 18000,
      budget: 18000,
      progress: 100,
      start_date: daysAgo(180),
      end_date: daysAgo(60),
    },
    {
      id: 'proj-ct-08',
      title: 'Consultoria SEO — Auditoria Técnica',
      type: 'Consultoria',
      status: 'cancelado',
      value: 1800,
      budget: 1800,
      progress: 20,
      start_date: daysAgo(200),
      end_date: daysAgo(150),
    },
  ];

  for (const proj of projects) {
    await p.project.upsert({
      where: { id: proj.id },
      update: proj,
      create: { ...proj, client_id: COMPANY_ID },
    });
    console.log(`  ✅ Project: ${proj.title} [${proj.status}]`);
  }

  // ── 2. Task Executions ─────────────────────────────────────────────────────
  const tasks = [
    // proj-empresa-01 (Site institucional — em produção)
    { id: 'task-ct-01', project_id: 'proj-ct-01', title: 'Wireframes e prototipação das páginas', status: 'done', due_date: daysAgo(15), delivered_at: daysAgo(16) },
    { id: 'task-ct-02', project_id: 'proj-ct-01', title: 'Desenvolvimento frontend — Home e Sobre', status: 'in_progress', due_date: daysAgo(-5) },
    { id: 'task-ct-03', project_id: 'proj-ct-01', title: 'Desenvolvimento backend — Formulário de contato', status: 'available', due_date: daysAgo(-10) },
    { id: 'task-ct-04', project_id: 'proj-ct-01', title: 'SEO On-page — levantamento de palavras-chave', status: 'done', due_date: daysAgo(20), delivered_at: daysAgo(22) },
    { id: 'task-ct-05', project_id: 'proj-ct-01', title: 'Integração Google Analytics + Search Console', status: 'available', due_date: daysAgo(-12) },

    // proj-empresa-02 (Tráfego Pago — em produção)
    { id: 'task-ct-06', project_id: 'proj-ct-02', title: 'Setup conta Google Ads + estrutura de campanhas', status: 'done', due_date: daysAgo(14), delivered_at: daysAgo(15) },
    { id: 'task-ct-07', project_id: 'proj-ct-02', title: 'Criação de anúncios e criativos — 1ª rodada', status: 'done', due_date: daysAgo(10), delivered_at: daysAgo(11) },
    { id: 'task-ct-08', project_id: 'proj-ct-02', title: 'Otimização de lances e segmentação de público', status: 'in_progress', due_date: daysAgo(-3) },
    { id: 'task-ct-09', project_id: 'proj-ct-02', title: 'Relatório de performance — semana 2', status: 'review', due_date: daysAgo(2) },

    // proj-empresa-03 (Identidade Visual — em revisão)
    { id: 'task-ct-10', project_id: 'proj-ct-03', title: 'Pesquisa de mercado e moodboard', status: 'done', due_date: daysAgo(30), delivered_at: daysAgo(32) },
    { id: 'task-ct-11', project_id: 'proj-ct-03', title: 'Criação do logotipo — 3 propostas', status: 'done', due_date: daysAgo(20), delivered_at: daysAgo(21) },
    { id: 'task-ct-12', project_id: 'proj-ct-03', title: 'Manual de identidade visual completo', status: 'review', due_date: daysAgo(3) },
    { id: 'task-ct-13', project_id: 'proj-ct-03', title: 'Aplicações (papelaria, assinatura e-mail, PPT)', status: 'available', due_date: daysAgo(-7) },

    // proj-empresa-04 (Conteúdo — briefing)
    { id: 'task-ct-14', project_id: 'proj-ct-04', title: 'Definição de calendário editorial', status: 'available', due_date: daysAgo(-8) },
    { id: 'task-ct-15', project_id: 'proj-ct-04', title: 'Criação de 12 posts para feed', status: 'available', due_date: daysAgo(-15) },

    // proj-empresa-06 (E-commerce — entregue)
    { id: 'task-ct-16', project_id: 'proj-ct-06', title: 'Configuração da loja WooCommerce', status: 'done', due_date: daysAgo(80), delivered_at: daysAgo(82) },
    { id: 'task-ct-17', project_id: 'proj-ct-06', title: 'Integração gateway de pagamento (Stripe + Pix)', status: 'done', due_date: daysAgo(65), delivered_at: daysAgo(66) },
    { id: 'task-ct-18', project_id: 'proj-ct-06', title: 'Importação do catálogo de produtos (320 itens)', status: 'done', due_date: daysAgo(55), delivered_at: daysAgo(56) },
    { id: 'task-ct-19', project_id: 'proj-ct-06', title: 'Testes de compra e QA completo', status: 'done', due_date: daysAgo(15), delivered_at: daysAgo(14) },

    // proj-empresa-07 (App — entregue)
    { id: 'task-ct-20', project_id: 'proj-ct-07', title: 'UX Research + fluxo de usuário', status: 'done', due_date: daysAgo(170), delivered_at: daysAgo(172) },
    { id: 'task-ct-21', project_id: 'proj-ct-07', title: 'Design de telas — React Native', status: 'done', due_date: daysAgo(140), delivered_at: daysAgo(141) },
    { id: 'task-ct-22', project_id: 'proj-ct-07', title: 'Desenvolvimento das telas de agendamento', status: 'done', due_date: daysAgo(100), delivered_at: daysAgo(102) },
    { id: 'task-ct-23', project_id: 'proj-ct-07', title: 'Backend API + notificações push', status: 'done', due_date: daysAgo(80), delivered_at: daysAgo(81) },
    { id: 'task-ct-24', project_id: 'proj-ct-07', title: 'Publicação App Store + Google Play', status: 'done', due_date: daysAgo(65), delivered_at: daysAgo(63) },

    // proj-empresa-08 (cancelado)
    { id: 'task-ct-25', project_id: 'proj-ct-08', title: 'Auditoria técnica inicial de SEO', status: 'cancelled', due_date: daysAgo(180) },
  ];

  for (const task of tasks) {
    await p.taskExecution.upsert({
      where: { id: task.id },
      update: task,
      create: task,
    });
    console.log(`  ✅ Task: ${task.title} [${task.status}]`);
  }

  // ── 3. Invoices (created_at spread across time so period filters work) ────────
  const invoices = [
    // Pagas — datas espalhadas: 160d, 80d, 91d, 18d, 34d atrás
    { id: 'inv-ct-01', company_id: COMPANY_ID, project_id: 'proj-ct-07', amount: 9000,  status: 'paid',    invoice_number: 'NF-2024-001', description: 'App de Agendamento — parcela 1/2', due_date: daysAgo(162), paid_at: daysAgo(158), created_at: daysAgo(165) },
    { id: 'inv-ct-02', company_id: COMPANY_ID, project_id: 'proj-ct-07', amount: 9000,  status: 'paid',    invoice_number: 'NF-2024-002', description: 'App de Agendamento — parcela 2/2', due_date: daysAgo(82),  paid_at: daysAgo(79),  created_at: daysAgo(85) },
    { id: 'inv-ct-03', company_id: COMPANY_ID, project_id: 'proj-ct-06', amount: 7000,  status: 'paid',    invoice_number: 'NF-2024-003', description: 'E-commerce — parcela 1/2',         due_date: daysAgo(92),  paid_at: daysAgo(91),  created_at: daysAgo(95) },
    { id: 'inv-ct-04', company_id: COMPANY_ID, project_id: 'proj-ct-06', amount: 7000,  status: 'paid',    invoice_number: 'NF-2024-004', description: 'E-commerce — parcela 2/2',         due_date: daysAgo(22),  paid_at: daysAgo(18),  created_at: daysAgo(25) },
    { id: 'inv-ct-05', company_id: COMPANY_ID, project_id: 'proj-ct-03', amount: 2500,  status: 'paid',    invoice_number: 'NF-2025-001', description: 'Identidade Visual — sinal (50%)',  due_date: daysAgo(37),  paid_at: daysAgo(34),  created_at: daysAgo(40) },
    // Pendentes — emitidas recentemente (dentro dos últimos 7 dias)
    { id: 'inv-ct-06', company_id: COMPANY_ID, project_id: 'proj-ct-01', amount: 4250,  status: 'pending', invoice_number: 'NF-2025-002', description: 'Site Institucional — sinal (50%)',  due_date: daysAgo(-5),  created_at: daysAgo(5) },
    { id: 'inv-ct-07', company_id: COMPANY_ID, project_id: 'proj-ct-02', amount: 1600,  status: 'pending', invoice_number: 'NF-2025-003', description: 'Tráfego Pago — parcela 1/2',        due_date: daysAgo(-8),  created_at: daysAgo(3) },
    { id: 'inv-ct-08', company_id: COMPANY_ID, project_id: 'proj-ct-03', amount: 2500,  status: 'pending', invoice_number: 'NF-2025-004', description: 'Identidade Visual — restante (50%)',due_date: daysAgo(-3),  created_at: daysAgo(6) },
    // Em atraso — emitida há 60d
    { id: 'inv-ct-09', company_id: COMPANY_ID, project_id: 'proj-ct-08', amount: 900,   status: 'overdue', invoice_number: 'NF-2024-005', description: 'Consultoria SEO — sinal (50%)',    due_date: daysAgo(60),  created_at: daysAgo(65) },
  ];

  for (const inv of invoices) {
    await p.invoice.upsert({
      where: { id: inv.id },
      update: inv,
      create: inv,
    });
    console.log(`  ✅ Invoice: ${inv.description} [${inv.status}] R$ ${inv.amount}`);
  }

  console.log('\n✅ Done! Company data seeded successfully.\n');
  console.log(`Projects: ${projects.length} | Tasks: ${tasks.length} | Invoices: ${invoices.length}`);
}

run().catch(console.error).finally(() => p.$disconnect());
