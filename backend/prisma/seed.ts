import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Admin Profile ─────────────────────────────────────────────────────────
  const masterProfile = await prisma.adminProfile.upsert({
    where: { name: "Master" },
    update: {},
    create: {
      name: "Master",
      description: "Perfil com acesso total ao sistema",
      is_master: true,
      is_active: true,
    },
  });

  // ─── Users ─────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("senha123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@allka.com" },
    update: {},
    create: {
      email: "admin@allka.com",
      password_hash: adminPassword,
      name: "Admin Allka",
      role: "admin",
      account_type: "admin",
      admin_profile_id: masterProfile.id,
      is_active: true,
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: "empresa@exemplo.com" },
    update: {},
    create: {
      email: "empresa@exemplo.com",
      password_hash: userPassword,
      name: "João Silva",
      role: "company_admin",
      account_type: "empresas",
      is_active: true,
    },
  });

  const partnerUser = await prisma.user.upsert({
    where: { email: "parceiro@exemplo.com" },
    update: {},
    create: {
      email: "parceiro@exemplo.com",
      password_hash: userPassword,
      name: "Carlos Mendonça",
      role: "partner",
      account_type: "parceiro",
      is_active: true,
    },
  });

  const agencyUser = await prisma.user.upsert({
    where: { email: "agencia@exemplo.com" },
    update: {},
    create: {
      email: "agencia@exemplo.com",
      password_hash: userPassword,
      name: "Agência Digital",
      role: "agency_admin",
      account_type: "agencias",
      is_active: true,
    },
  });

  // Nomad users (linked to Nomade records below)
  const nomadeUsers = await Promise.all(
    ["ana@nomad.com", "lucas@nomad.com", "marina@nomad.com"].map((email, i) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password_hash: userPassword,
          name: ["Ana Ferreira", "Lucas Oliveira", "Marina Costa"][i],
          role: "nomad",
          account_type: "nomades",
          is_active: true,
        },
      })
    )
  );

  // ─── Nomade Levels ─────────────────────────────────────────────────────────
  const levelData = [
    {
      slug: "bronze",
      name: "Bronze",
      min_score: 0,
      max_score: 199,
      color: "#cd7f32",
      benefits: '["Acesso às tarefas básicas","Suporte via chat"]',
      requirements: '[{"label":"Tarefas no trimestre","value":"5+"}]',
    },
    {
      slug: "silver",
      name: "Prata",
      min_score: 200,
      max_score: 499,
      color: "#c0c0c0",
      benefits:
        '["Acesso às tarefas intermediárias","Bônus de 5%","Suporte prioritário"]',
      requirements:
        '[{"label":"Tarefas no trimestre","value":"15+"},{"label":"Nota média","value":"4.0+"}]',
    },
    {
      slug: "gold",
      name: "Ouro",
      min_score: 500,
      max_score: 999,
      color: "#ffd700",
      benefits:
        '["Acesso a tarefas avançadas","Bônus de 10%","Antecipação de pagamento"]',
      requirements:
        '[{"label":"Tarefas no trimestre","value":"30+"},{"label":"Nota média","value":"4.5+"}]',
    },
    {
      slug: "platinum",
      name: "Platina",
      min_score: 1000,
      max_score: 1999,
      color: "#e5e4e2",
      benefits:
        '["Acesso a todas as tarefas","Bônus de 15%","Mentoria mensal","Comissão de liderança"]',
      requirements:
        '[{"label":"Tarefas no trimestre","value":"50+"},{"label":"Nota média","value":"4.8+"}]',
    },
    {
      slug: "diamond",
      name: "Diamante",
      min_score: 2000,
      max_score: 3999,
      color: "#b9f2ff",
      benefits:
        '["Todos os benefícios Platina","Bônus de 20%","Possibilidade de tornar-se Líder"]',
      requirements:
        '[{"label":"Tarefas no trimestre","value":"75+"},{"label":"Nota média","value":"4.9+"}]',
    },
    {
      slug: "leader",
      name: "Líder",
      min_score: 4000,
      color: "#7c3aed",
      benefits:
        '["Todos os benefícios Diamante","Salário fixo mensal","Comissão de equipe","Gestão de nômades"]',
      requirements: '[{"label":"Convite especial da Allka","value":"Necessário"}]',
    },
  ];

  for (const level of levelData) {
    await prisma.nomadeLevel.upsert({
      where: { slug: level.slug },
      update: {},
      create: level,
    });
  }

  // ─── Nômades ───────────────────────────────────────────────────────────────
  const nomadeData = [
    {
      name: "Ana Ferreira",
      email: "ana@nomad.com",
      whatsapp: "11999990001",
      level: "gold" as const,
      status: "ativo" as const,
      score: 720,
      tasks_completed_total: 87,
      tasks_completed_quarter: 28,
      areas_of_interest:
        '["Design Gráfico","UI/UX","Copywriting"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.8,
      performance_on_time: 94,
      performance_rejection_rate: 2,
      user_id: nomadeUsers[0].id,
    },
    {
      name: "Lucas Oliveira",
      email: "lucas@nomad.com",
      whatsapp: "11999990002",
      level: "silver" as const,
      status: "ativo" as const,
      score: 310,
      tasks_completed_total: 42,
      tasks_completed_quarter: 14,
      areas_of_interest: '["Desenvolvimento Web","SEO"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.3,
      performance_on_time: 88,
      performance_rejection_rate: 5,
      user_id: nomadeUsers[1].id,
    },
    {
      name: "Marina Costa",
      email: "marina@nomad.com",
      whatsapp: "11999990003",
      level: "bronze" as const,
      status: "aguardando_aprovacao" as const,
      score: 45,
      tasks_completed_total: 5,
      tasks_completed_quarter: 5,
      areas_of_interest: '["Redação","Tradução"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.0,
      performance_on_time: 80,
      performance_rejection_rate: 10,
      user_id: nomadeUsers[2].id,
    },
    {
      name: "Rafael Souza",
      email: "rafael@nomad.com",
      whatsapp: "11999990004",
      level: "platinum" as const,
      status: "ativo" as const,
      score: 1250,
      tasks_completed_total: 156,
      tasks_completed_quarter: 52,
      areas_of_interest: '["Gestão de Projetos","CRM","Marketing Digital"]',
      terms_accepted: true,
      is_leader: true,
      performance_avg_rating: 4.9,
      performance_on_time: 97,
      performance_rejection_rate: 1,
    },
    {
      name: "Camila Rodrigues",
      email: "camila@nomad.com",
      whatsapp: "11999990005",
      level: "silver" as const,
      status: "inativo" as const,
      score: 280,
      tasks_completed_total: 31,
      tasks_completed_quarter: 0,
      areas_of_interest: '["Consultoria Comercial"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 3.9,
      performance_on_time: 75,
      performance_rejection_rate: 12,
    },
  ];

  const nomades: Array<{ id: string }> = [];
  for (const nd of nomadeData) {
    const nomade = await prisma.nomade.upsert({
      where: { email: nd.email },
      update: {},
      create: nd,
    });
    nomades.push(nomade);
  }

  // Qualifications for Ana
  const existingQuals = await prisma.qualification.count({
    where: { nomade_id: nomades[0].id },
  });
  if (existingQuals === 0) {
    await prisma.qualification.createMany({
      data: [
        {
          nomade_id: nomades[0].id,
          category: "Design",
          task: "Identidade Visual",
          status: "habilitado",
          certification_date: new Date("2025-03-15"),
          test_required: true,
        },
        {
          nomade_id: nomades[0].id,
          category: "Design",
          task: "Social Media",
          status: "habilitado",
          certification_date: new Date("2025-04-10"),
          test_required: true,
        },
        {
          nomade_id: nomades[0].id,
          category: "Copywriting",
          task: "Blog Post",
          status: "teste_pendente",
          test_required: true,
        },
      ],
    });
  }

  // ─── Companies ─────────────────────────────────────────────────────────────
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { cnpj: "12.345.678/0001-90" },
      update: {},
      create: {
        name: "TechCorp Brasil",
        cnpj: "12.345.678/0001-90",
        email: "contato@techcorp.com.br",
        phone: "(11) 3456-7890",
        status: "ativo",
        segment: "Tecnologia",
        website: "https://techcorp.com.br",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "98.765.432/0001-10" },
      update: {},
      create: {
        name: "Varejo Modas Ltda",
        cnpj: "98.765.432/0001-10",
        email: "comercial@varejomodas.com",
        phone: "(11) 9876-5432",
        status: "ativo",
        segment: "Varejo / Moda",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "55.555.555/0001-55" },
      update: {},
      create: {
        name: "Restaurante Sabor & Arte",
        cnpj: "55.555.555/0001-55",
        email: "chef@saborarte.com.br",
        phone: "(11) 5555-5555",
        status: "prospecto",
        segment: "Alimentação",
      },
    }),
  ]);

  // ─── Specialties ───────────────────────────────────────────────────────────
  const specialties = await Promise.all([
    prisma.specialty.upsert({
      where: { id: "spec-design" },
      update: {},
      create: {
        id: "spec-design",
        name: "Design Gráfico",
        hourly_rate: 85,
        category: "Criativo",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-copy" },
      update: {},
      create: {
        id: "spec-copy",
        name: "Copywriting",
        hourly_rate: 75,
        category: "Conteúdo",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-social" },
      update: {},
      create: {
        id: "spec-social",
        name: "Social Media",
        hourly_rate: 70,
        category: "Marketing",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-seo" },
      update: {},
      create: {
        id: "spec-seo",
        name: "SEO / Tráfego Pago",
        hourly_rate: 95,
        category: "Marketing",
        is_active: true,
      },
    }),
  ]);

  // ─── Products ──────────────────────────────────────────────────────────────
  const productData = [
    {
      name: "Identidade Visual Completa",
      short_description: "Criação de marca do zero",
      category: "Design",
      base_price: 1800,
      complexity: "advanced" as const,
      tags: '["branding","logo","identidade visual"]',
      visibility:
        '{"company":true,"agency":true,"partner":false,"inHouse":false}',
      contract_count: 47,
      average_rating: 4.8,
      completion_time: "15-20 dias",
    },
    {
      name: "Gestão de Redes Sociais",
      short_description: "Gerenciamento completo das suas redes",
      category: "Social Media",
      base_price: 1200,
      complexity: "intermediate" as const,
      tags: '["instagram","facebook","conteúdo"]',
      visibility:
        '{"company":true,"agency":true,"partner":false,"inHouse":false}',
      contract_count: 89,
      average_rating: 4.6,
      completion_time: "30 dias (mensal)",
    },
    {
      name: "Copywriting para Landing Page",
      short_description: "Textos persuasivos que convertem",
      category: "Conteúdo",
      base_price: 900,
      complexity: "intermediate" as const,
      tags: '["copy","landing page","conversão"]',
      visibility:
        '{"company":true,"agency":true,"partner":true,"inHouse":false}',
      contract_count: 63,
      average_rating: 4.7,
      completion_time: "5-7 dias",
    },
    {
      name: "Gestão de Tráfego Pago",
      short_description: "Google Ads + Meta Ads com resultados",
      category: "Marketing Digital",
      base_price: 2200,
      complexity: "advanced" as const,
      tags: '["google ads","meta ads","tráfego pago"]',
      visibility:
        '{"company":true,"agency":true,"partner":false,"inHouse":false}',
      contract_count: 34,
      average_rating: 4.9,
      completion_time: "30 dias (mensal)",
    },
    {
      name: "SEO — Otimização Básica",
      short_description: "Melhore o ranqueamento do seu site",
      category: "SEO",
      base_price: 1500,
      complexity: "intermediate" as const,
      tags: '["seo","google","orgânico"]',
      visibility:
        '{"company":true,"agency":true,"partner":true,"inHouse":false}',
      contract_count: 28,
      average_rating: 4.5,
      completion_time: "20-25 dias",
    },
  ];

  for (const prod of productData) {
    const existing = await prisma.product.findFirst({
      where: { name: prod.name },
    });
    if (!existing) {
      await prisma.product.create({ data: prod });
    }
  }

  // ─── Projects ──────────────────────────────────────────────────────────────
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        title: "Identidade Visual — TechCorp",
        description: "Redesign completo da marca TechCorp",
        client_id: companies[0].id,
        status: "in-progress",
        lifecycle: "avulso",
        value: 2400,
        start_date: new Date("2026-03-15"),
      },
    }),
    prisma.project.create({
      data: {
        title: "Gestão Social — Varejo Modas",
        description: "Gerenciamento mensal das redes sociais",
        client_id: companies[1].id,
        status: "in-progress",
        lifecycle: "mensal",
        value: 1500,
        start_date: new Date("2026-02-01"),
      },
    }),
    prisma.project.create({
      data: {
        title: "Campanha de Lançamento — Sabor & Arte",
        description: "Estratégia completa para novo cardápio",
        client_id: companies[2].id,
        status: "planning",
        lifecycle: "avulso",
        value: 3800,
        start_date: new Date("2026-04-01"),
      },
    }),
  ]);

  // ─── Task Executions ───────────────────────────────────────────────────────
  await prisma.taskExecution.createMany({
    data: [
      {
        project_id: projects[0].id,
        nomade_id: nomades[0].id,
        title: "Criação de Logotipo — TechCorp",
        description: "Desenvolver 3 opções de logotipo para aprovação",
        status: "in_progress",
        priority: "high",
        type: "standard",
        due_date: new Date("2026-04-15"),
      },
      {
        project_id: projects[0].id,
        nomade_id: nomades[1].id,
        title: "Manual de Identidade Visual",
        description: "Documentação das diretrizes de marca",
        status: "draft",
        priority: "medium",
        type: "standard",
        due_date: new Date("2026-04-25"),
      },
      {
        project_id: projects[1].id,
        nomade_id: nomades[0].id,
        title: "Criação de Conteúdo — Abril",
        description: "30 posts para Instagram e Facebook",
        status: "approved",
        priority: "medium",
        type: "standard",
        due_date: new Date("2026-03-31"),
        approved_at: new Date("2026-04-02"),
        rating: 4.9,
      },
    ],
  });

  // ─── Invoices ──────────────────────────────────────────────────────────────
  await prisma.invoice.createMany({
    data: [
      {
        company_id: companies[0].id,
        project_id: projects[0].id,
        amount: 1200,
        status: "paid",
        due_date: new Date("2026-03-20"),
        paid_at: new Date("2026-03-19"),
        invoice_number: "INV-2026-001",
        description: "50% entrada — Identidade Visual TechCorp",
      },
      {
        company_id: companies[1].id,
        project_id: projects[1].id,
        amount: 1500,
        status: "paid",
        due_date: new Date("2026-03-05"),
        paid_at: new Date("2026-03-04"),
        invoice_number: "INV-2026-002",
        description: "Gestão Social Fev/2026",
      },
      {
        company_id: companies[2].id,
        project_id: projects[2].id,
        amount: 1900,
        status: "pending",
        due_date: new Date("2026-04-10"),
        invoice_number: "INV-2026-003",
        description: "50% entrada — Campanha Lançamento",
      },
    ],
  });

  // ─── Wallet Transactions for Ana ───────────────────────────────────────────
  const anaWalletCount = await prisma.walletTransaction.count({
    where: { nomade_id: nomades[0].id },
  });
  if (anaWalletCount === 0) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          nomade_id: nomades[0].id,
          type: "credit",
          amount: 480,
          description: "Pagamento — Gestão Social Varejo Modas (Mar)",
          date: new Date("2026-04-02"),
        },
        {
          nomade_id: nomades[0].id,
          type: "bonus",
          amount: 48,
          description: "Bônus nível Ouro — 10%",
          date: new Date("2026-04-02"),
        },
        {
          nomade_id: nomades[0].id,
          type: "withdrawal",
          amount: 300,
          description: "Saque PIX — ana@nomad.com",
          date: new Date("2026-03-25"),
        },
        {
          nomade_id: nomades[0].id,
          type: "credit",
          amount: 350,
          description: "Pagamento — Logotipo TechCorp",
          date: new Date("2026-03-10"),
        },
      ],
    });
  }

  // ─── Withdrawal Request ─────────────────────────────────────────────────────
  const existingWithdrawal = await prisma.withdrawalRequest.findFirst({
    where: { nomade_id: nomades[0].id },
  });
  if (!existingWithdrawal) {
    await prisma.withdrawalRequest.create({
      data: {
        nomade_id: nomades[0].id,
        amount: 500,
        status: "aguardando_analise",
        pix_key: "ana@nomad.com",
        pix_key_type: "email",
      },
    });
  }

  // ─── Agency ────────────────────────────────────────────────────────────────
  const existingAgency = await prisma.agency.findUnique({
    where: { user_id: agencyUser.id },
  });
  if (!existingAgency) {
    await prisma.agency.create({
      data: {
        user_id: agencyUser.id,
        name: "Agência Digital Creative",
        cnpj: "77.888.999/0001-11",
        email: "agencia@exemplo.com",
        partner_level: "gold",
        wallet_balance: 3200,
        status: "ativo",
      },
    });
  }

  // ─── Partner Profile ───────────────────────────────────────────────────────
  const existingPartner = await prisma.partnerProfile.findUnique({
    where: { user_id: partnerUser.id },
  });
  if (!existingPartner) {
    const campaign = await prisma.campaign.create({
      data: {
        name: "Campanha Verão 2026",
        type: "coupon",
        status: "active",
        commission_type: "percentage",
        commission_value: 8,
        coupon_code: "CARLOS10",
      },
    });

    await prisma.partnerProfile.create({
      data: {
        user_id: partnerUser.id,
        balance: 1240,
        total_earned: 4870.5,
        total_withdrawn: 3630.5,
        referral_code: "CARLOS10",
        referral_link: "https://allka.com.br/ref/carlos10",
        status: "active",
        pix_key: "parceiro@exemplo.com",
        pix_key_type: "email",
        linked_campaign_id: campaign.id,
      },
    });
  }

  // ─── Term ──────────────────────────────────────────────────────────────────
  const existingTerm = await prisma.term.findFirst();
  if (!existingTerm) {
    await prisma.term.create({
      data: {
        title: "Termos de Uso da Plataforma Allka",
        content:
          "Ao utilizar a plataforma Allka, você concorda com os presentes Termos de Uso...",
        version: "1.0",
        acceptance_level: "usuario",
        target_account_types: '["empresas","agencias","nomades","parceiro"]',
        is_active: true,
      },
    });
  }

  // ─── Admin Permissions ─────────────────────────────────────────────────────
  const profilePermCount = await prisma.adminPermission.count({
    where: { profile_id: masterProfile.id },
  });
  if (profilePermCount === 0) {
    const modules = [
      "empresas",
      "nomades",
      "projetos",
      "financeiro",
      "produtos",
      "usuarios",
    ];
    const actions = ["view", "edit", "create", "delete"] as const;

    const permData = modules.flatMap((module) =>
      actions.map((action) => ({
        profile_id: masterProfile.id,
        module,
        action,
      }))
    );

    await prisma.adminPermission.createMany({ data: permData });
  }

  console.log("✅ Seed concluído com sucesso!\n");
  console.log("👤 Credenciais de acesso:");
  console.log("   Admin:    admin@allka.com     / admin123");
  console.log("   Empresa:  empresa@exemplo.com / senha123");
  console.log("   Nômade:   ana@nomad.com       / senha123");
  console.log("   Agência:  agencia@exemplo.com / senha123");
  console.log("   Parceiro: parceiro@exemplo.com/ senha123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
