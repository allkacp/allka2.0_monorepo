/**
 * Seed completo para empresa 1 — "Empresa Teste Validação"
 * Dados profissionais realistas para validação da plataforma
 *
 * Uso: node seed-company1-complete.cjs
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed da empresa 1...\n");

  // ── Encontrar empresa 1 ────────────────────────────────────────────────────
  const company = await prisma.company.findFirst({
    orderBy: { created_at: "asc" },
  });

  if (!company) {
    throw new Error("Nenhuma empresa encontrada. Execute o seed base primeiro.");
  }

  console.log(`✅ Empresa encontrada: ${company.name} (${company.id})`);

  // ── Atualizar dados da empresa ────────────────────────────────────────────
  await prisma.company.update({
    where: { id: company.id },
    data: {
      name: "Empresa Teste Validação",
      cnpj: "12.345.678/0001-99",
      email: "contato@validacaodigital.com.br",
      phone: "(11) 3456-7890",
      website: "https://www.validacaodigital.com.br",
      address: "R. Teofrasto, 172 – Vila Olinda, São Paulo – SP, 03379-050",
      segment: "Marketing Digital",
      description:
        "Agência especializada em marketing digital, tráfego pago e desenvolvimento web para PMEs do segmento e-commerce.",
      status: "ativo",
      // Contato Comercial
      commercial_contact_name: "Carlos Ferreira",
      commercial_contact_role: "Diretor Comercial",
      commercial_contact_email: "carlos.ferreira@validacaodigital.com.br",
      commercial_contact_phone: "(11) 3456-7891",
      commercial_contact_whatsapp: "(11) 97654-3210",
      commercial_contact_preferred_channel: "whatsapp",
      commercial_contact_notes:
        "Disponível seg-sex 9h-18h. Prefere WhatsApp para assuntos urgentes.",
      // Contato Financeiro
      financial_contact_name: "Roberta Mendes",
      financial_contact_role: "Diretora Financeira",
      financial_contact_email: "financeiro@validacaodigital.com.br",
      financial_contact_phone: "(11) 3456-7892",
      financial_contact_whatsapp: "(11) 96543-2109",
      financial_contact_preferred_channel: "email",
      financial_contact_notes:
        "Responsável por aprovação de NFs e pagamentos. Enviar faturas com 5 dias de antecedência.",
      use_master_as_financial_fallback: false,
    },
  });
  console.log("✅ Dados da empresa atualizados");

  // ── Usuários da empresa ───────────────────────────────────────────────────
  const existingUsers = await prisma.user.findMany({
    where: { company_id: company.id },
  });
  console.log(`   Usuários existentes: ${existingUsers.length}`);

  const passwordHash = await bcrypt.hash("Allka@2026!", 10);

  const usersToCreate = [
    {
      name: "Ana Paula Costa",
      email: "ana.costa@validacaodigital.com.br",
      role: "company_admin",
      phone: "(11) 98111-2233",
      job_title: "CEO",
    },
    {
      name: "Roberta Mendes",
      email: "roberta.mendes@validacaodigital.com.br",
      role: "company_financial",
      phone: "(11) 98222-3344",
      job_title: "Diretora Financeira",
    },
    {
      name: "João Souza",
      email: "joao.souza@validacaodigital.com.br",
      role: "company_user",
      phone: "(11) 98333-4455",
      job_title: "Coordenador de Marketing",
    },
    {
      name: "Fernanda Lima",
      email: "fernanda.lima@validacaodigital.com.br",
      role: "company_user",
      phone: "(11) 98444-5566",
      job_title: "Analista de Conteúdo",
    },
  ];

  let usersCreated = 0;
  for (const u of usersToCreate) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          position: u.job_title,
          password_hash: passwordHash,
          company_id: company.id,
          account_type: "empresas",
          is_active: true,
        },
      });
      usersCreated++;
    }
  }
  console.log(`✅ Usuários criados: ${usersCreated} (${usersToCreate.length - usersCreated} já existiam)`);

  // ── Projetos ──────────────────────────────────────────────────────────────
  const existingProjects = await prisma.project.findMany({
    where: { client_id: company.id },
  });

  if (existingProjects.length === 0) {
    const projects = [
      {
        title: "Gestão de Tráfego Pago — Q2 2026",
        description:
          "Gerenciamento completo de campanhas Google Ads e Meta Ads com foco em e-commerce. Meta mensal: R$ 50k em faturamento atribuído.",
        status: "in-progress",
        lifecycle: "mensal",
        type: "Marketing Digital",
        start_date: new Date("2026-04-01"),
        end_date: new Date("2026-06-30"),
        value: 8500.0,
        budget: 8500.0,
        client_id: company.id,
      },
      {
        title: "Redesign e Desenvolvimento do Site Institucional",
        description:
          "Redesign completo do site com novo branding, otimização SEO e integração com CRM HubSpot.",
        status: "completed",
        lifecycle: "avulso",
        type: "Desenvolvimento Web",
        start_date: new Date("2026-01-15"),
        end_date: new Date("2026-03-31"),
        value: 15000.0,
        budget: 15000.0,
        client_id: company.id,
      },
      {
        title: "Implementação CRM e Automação de Marketing",
        description:
          "Setup do HubSpot CRM, fluxos de automação, integração com e-commerce e treinamento da equipe.",
        status: "awaiting-approval",
        lifecycle: "avulso",
        type: "Consultoria",
        start_date: new Date("2026-07-01"),
        end_date: new Date("2026-09-30"),
        value: 12000.0,
        budget: 12000.0,
        client_id: company.id,
      },
      {
        title: "Produção de Conteúdo — Blog e Redes Sociais",
        description:
          "Planejamento editorial mensal, produção de 16 posts/mês (blog + social), gestão de comunidade.",
        status: "in-progress",
        lifecycle: "mensal",
        type: "Marketing Digital",
        start_date: new Date("2026-04-01"),
        end_date: new Date("2026-12-31"),
        value: 3200.0,
        budget: 3200.0,
        client_id: company.id,
      },
    ];

    for (const p of projects) {
      await prisma.project.create({ data: p });
    }
    console.log(`✅ Projetos criados: ${projects.length}`);
  } else {
    console.log(`   Projetos: ${existingProjects.length} já existiam`);
  }

  // ── Cartões de Pagamento ──────────────────────────────────────────────────
  const existingCards = await prisma.companyPaymentMethod.findMany({
    where: { company_id: company.id },
  });

  if (existingCards.length === 0) {
    const cards = [
      {
        company_id: company.id,
        brand: "Mastercard",
        last_four: "4892",
        expiry: "09/2028",
        holder_name: "VALIDACAO DIGITAL LTDA",
        is_default: true,
        is_client_card: false,
        label: "Cartão Principal da Agência",
        is_active: true,
      },
      {
        company_id: company.id,
        brand: "Visa",
        last_four: "7731",
        expiry: "03/2027",
        holder_name: "ANA PAULA COSTA",
        is_default: false,
        is_client_card: false,
        label: "Cartão da CEO",
        is_active: true,
      },
      {
        company_id: company.id,
        brand: "Elo",
        last_four: "5521",
        expiry: "11/2027",
        holder_name: "CLIENTE EXTERNO LTDA",
        is_default: false,
        is_client_card: true,
        label: "Cartão do Cliente",
        is_active: true,
      },
    ];

    for (const c of cards) {
      await prisma.companyPaymentMethod.create({ data: c });
    }
    console.log(`✅ Cartões criados: ${cards.length}`);
  } else {
    console.log(`   Cartões: ${existingCards.length} já existiam`);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────
  const existingInvoices = await prisma.invoice.findMany({
    where: { company_id: company.id },
  });

  if (existingInvoices.length === 0) {
    const invoices = [
      {
        company_id: company.id,
        amount: 8500.0,
        status: "paid",
        due_date: new Date("2026-04-05"),
        paid_at: new Date("2026-04-03"),
        description: "Fatura Abril/2026 — Gestão de Tráfego Pago",
        invoice_number: "NF-2026-0041",
      },
      {
        company_id: company.id,
        amount: 8500.0,
        status: "paid",
        due_date: new Date("2026-05-05"),
        paid_at: new Date("2026-05-04"),
        description: "Fatura Maio/2026 — Gestão de Tráfego Pago",
        invoice_number: "NF-2026-0058",
      },
      {
        company_id: company.id,
        amount: 3200.0,
        status: "paid",
        due_date: new Date("2026-05-05"),
        paid_at: new Date("2026-05-04"),
        description: "Fatura Maio/2026 — Produção de Conteúdo",
        invoice_number: "NF-2026-0059",
      },
      {
        company_id: company.id,
        amount: 8500.0,
        status: "pending",
        due_date: new Date("2026-06-05"),
        description: "Fatura Junho/2026 — Gestão de Tráfego Pago",
        invoice_number: "NF-2026-0074",
      },
      {
        company_id: company.id,
        amount: 3200.0,
        status: "pending",
        due_date: new Date("2026-06-05"),
        description: "Fatura Junho/2026 — Produção de Conteúdo",
        invoice_number: "NF-2026-0075",
      },
      {
        company_id: company.id,
        amount: 15000.0,
        status: "paid",
        due_date: new Date("2026-04-01"),
        paid_at: new Date("2026-03-30"),
        description: "Encerramento — Redesign e Desenvolvimento do Site",
        invoice_number: "NF-2026-0039",
      },
    ];

    for (const inv of invoices) {
      // Check if invoice fields exist in schema
      await prisma.invoice.create({ data: inv }).catch(async (e) => {
        // Fallback: some fields might not exist yet, try minimal
        if (e.code === "P2022") {
          await prisma.invoice.create({
            data: {
              company_id: inv.company_id,
              amount: inv.amount,
              status: inv.status,
              due_date: inv.due_date,
              description: inv.description,
            },
          });
        } else {
          throw e;
        }
      });
    }
    console.log(`✅ Faturas criadas: ${invoices.length}`);
  } else {
    console.log(`   Faturas: ${existingInvoices.length} já existiam`);
  }

  console.log("\n🎉 Seed completo!");
  console.log(`   Empresa: Validação Digital Ltda`);
  console.log(`   CNPJ: 12.345.678/0001-99`);
  console.log(`   Endereço: R. Teofrasto, 172 – Vila Olinda, São Paulo – SP`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
