import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withProjectCode } from "../src/lib/create-project";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Este seed não pode rodar em produção.");
    process.exit(1);
  }

  const seedPassword = process.env.SEED_TEST_USER_PASSWORD;
  if (!seedPassword) {
    console.error("❌ SEED_TEST_USER_PASSWORD não configurado no .env");
    process.exit(1);
  }

  console.log("🌱 Iniciando seed...");

  // ─── Admin Profiles ────────────────────────────────────────────────────────
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

  const editorProfile = await prisma.adminProfile.upsert({
    where: { name: "Editor" },
    update: {},
    create: {
      name: "Editor",
      description: "Perfil com acesso de edição (sem exclusão)",
      is_master: false,
      is_active: true,
    },
  });

  // ─── Users (10 total) ─────────────────────────────────────────────────────
  const sharedPassword = await bcrypt.hash(seedPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@allka.com" },
    // update: {} de propósito — usuário existente nunca tem password_hash/
    // is_active tocados por um seed reutilizável (só a criação define isso).
    update: {},
    create: {
      email: "admin@allka.com",
      password_hash: sharedPassword,
      name: "Admin Allka",
      role: "admin",
      account_type: "admin",
      admin_profile_id: masterProfile.id,
      is_active: false,
    },
  });

  const adminUser2 = await prisma.user.upsert({
    where: { email: "suporte@allka.com" },
    update: {},
    create: {
      email: "suporte@allka.com",
      password_hash: sharedPassword,
      name: "Suporte Allka",
      role: "admin",
      account_type: "admin",
      admin_profile_id: editorProfile.id,
      is_active: false,
    },
  });

  // ─── Admin principal de teste ─────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "cp@lamego.com.vc" },
    update: { name: "Vinicius Guardia", admin_profile_id: masterProfile.id },
    create: {
      email: "cp@lamego.com.vc",
      password_hash: sharedPassword,
      name: "Vinicius Guardia",
      role: "admin",
      account_type: "admin",
      admin_profile_id: masterProfile.id,
      is_active: true,
    },
  });

  // ─── Usuários dev por tipo de conta (senha: SEED_TEST_USER_PASSWORD) ────────
  await prisma.user.upsert({
    where: { email: "nomade@allka.com.vc" },
    update: {},
    create: {
      email: "nomade@allka.com.vc",
      password_hash: sharedPassword,
      name: "Nômade Dev",
      role: "nomad",
      account_type: "nomades",
      is_active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "empresa@allka.com.vc" },
    update: {},
    create: {
      email: "empresa@allka.com.vc",
      password_hash: sharedPassword,
      name: "Empresa Dev",
      role: "company_admin",
      account_type: "empresas",
      is_active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "agencia@allka.com.vc" },
    update: {},
    create: {
      email: "agencia@allka.com.vc",
      password_hash: sharedPassword,
      name: "Agência Dev",
      role: "agency_admin",
      account_type: "agencias",
      is_active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "parceiro@allka.com.vc" },
    update: {},
    create: {
      email: "parceiro@allka.com.vc",
      password_hash: sharedPassword,
      name: "Parceiro Dev",
      role: "partner",
      account_type: "parceiro",
      is_active: true,
    },
  });

  // ─── Usuário Líder ────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "lider@allka.com.vc" },
    update: {},
    create: {
      email: "lider@allka.com.vc",
      password_hash: sharedPassword,
      name: "Líder Dev",
      role: "lider",
      account_type: "lider",
      is_active: true,
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: "empresa@exemplo.com" },
    update: {},
    create: {
      email: "empresa@exemplo.com",
      password_hash: sharedPassword,
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
      password_hash: sharedPassword,
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
      password_hash: sharedPassword,
      name: "Agência Digital",
      role: "agency_admin",
      account_type: "agencias",
      is_active: true,
    },
  });

  // Nomad users (linked to Nomade records below)
  const nomadeEmails = [
    "ana@nomad.com",
    "lucas@nomad.com",
    "marina@nomad.com",
    "rafael@nomad.com",
    "camila@nomad.com",
    "pedro@nomad.com",
    "juliana@nomad.com",
    "thiago@nomad.com",
  ];
  const nomadeNames = [
    "Ana Ferreira",
    "Lucas Oliveira",
    "Marina Costa",
    "Rafael Souza",
    "Camila Rodrigues",
    "Pedro Nascimento",
    "Juliana Almeida",
    "Thiago Martins",
  ];
  const nomadeUsers: Array<{ id: string }> = [];
  for (let i = 0; i < nomadeEmails.length; i++) {
    const u = await prisma.user.upsert({
      where: { email: nomadeEmails[i] },
      update: {},
      create: {
        email: nomadeEmails[i],
        password_hash: sharedPassword,
        name: nomadeNames[i],
        role: "nomad",
        account_type: "nomades",
        is_active: true,
      },
    });
    nomadeUsers.push(u);
  }

  // ─── Nomade Levels (6) ────────────────────────────────────────────────────
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
      requirements:
        '[{"label":"Convite especial da Allka","value":"Necessário"}]',
    },
  ];

  for (const level of levelData) {
    await prisma.nomadeLevel.upsert({
      where: { slug: level.slug },
      update: {},
      create: level,
    });
  }

  // ─── Nômades (10 total — 8 with users, 2 without) ────────────────────────
  const nomadeData = [
    {
      name: "Ana Ferreira",
      email: "ana@nomad.com",
      whatsapp: "11999990001",
      level: "gold",
      status: "ativo",
      score: 720,
      tasks_completed_total: 87,
      tasks_completed_quarter: 28,
      areas_of_interest: '["Design Gráfico","UI/UX","Copywriting"]',
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
      level: "silver",
      status: "ativo",
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
      level: "bronze",
      status: "aguardando_aprovacao",
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
      level: "platinum",
      status: "ativo",
      score: 1250,
      tasks_completed_total: 156,
      tasks_completed_quarter: 52,
      areas_of_interest: '["Gestão de Projetos","CRM","Marketing Digital"]',
      terms_accepted: true,
      is_leader: true,
      performance_avg_rating: 4.9,
      performance_on_time: 97,
      performance_rejection_rate: 1,
      user_id: nomadeUsers[3].id,
    },
    {
      name: "Camila Rodrigues",
      email: "camila@nomad.com",
      whatsapp: "11999990005",
      level: "silver",
      status: "inativo",
      score: 280,
      tasks_completed_total: 31,
      tasks_completed_quarter: 0,
      areas_of_interest: '["Consultoria Comercial"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 3.9,
      performance_on_time: 75,
      performance_rejection_rate: 12,
      user_id: nomadeUsers[4].id,
    },
    {
      name: "Pedro Nascimento",
      email: "pedro@nomad.com",
      whatsapp: "11999990006",
      level: "diamond",
      status: "ativo",
      score: 2100,
      tasks_completed_total: 210,
      tasks_completed_quarter: 68,
      areas_of_interest: '["Vídeo","Motion Graphics","Edição"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.7,
      performance_on_time: 92,
      performance_rejection_rate: 3,
      user_id: nomadeUsers[5].id,
    },
    {
      name: "Juliana Almeida",
      email: "juliana@nomad.com",
      whatsapp: "11999990007",
      level: "gold",
      status: "ativo",
      score: 680,
      tasks_completed_total: 72,
      tasks_completed_quarter: 22,
      areas_of_interest: '["UI/UX","Prototipagem","Figma"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.6,
      performance_on_time: 91,
      performance_rejection_rate: 4,
      user_id: nomadeUsers[6].id,
    },
    {
      name: "Thiago Martins",
      email: "thiago@nomad.com",
      whatsapp: "11999990008",
      level: "bronze",
      status: "ativo",
      score: 95,
      tasks_completed_total: 12,
      tasks_completed_quarter: 8,
      areas_of_interest: '["WordPress","E-commerce"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.1,
      performance_on_time: 82,
      performance_rejection_rate: 8,
      user_id: nomadeUsers[7].id,
    },
    {
      name: "Fernanda Lima",
      email: "fernanda@nomad.com",
      whatsapp: "11999990009",
      level: "gold",
      status: "suspenso",
      score: 550,
      tasks_completed_total: 60,
      tasks_completed_quarter: 0,
      areas_of_interest: '["Marketing de Conteúdo","E-mail Marketing"]',
      terms_accepted: true,
      is_leader: false,
      performance_avg_rating: 4.4,
      performance_on_time: 85,
      performance_rejection_rate: 7,
    },
    {
      name: "Gabriel Santos",
      email: "gabriel@nomad.com",
      whatsapp: "11999990010",
      level: "silver",
      status: "aguardando_aprovacao",
      score: 220,
      tasks_completed_total: 25,
      tasks_completed_quarter: 10,
      areas_of_interest: '["Fotografia","Edição de Imagem"]',
      terms_accepted: false,
      is_leader: false,
      performance_avg_rating: 4.2,
      performance_on_time: 87,
      performance_rejection_rate: 6,
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

  // ─── Qualifications ────────────────────────────────────────────────────────
  await prisma.qualification.createMany({
    skipDuplicates: true,
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
      {
        nomade_id: nomades[1].id,
        category: "Desenvolvimento",
        task: "WordPress",
        status: "habilitado",
        certification_date: new Date("2025-02-20"),
        test_required: true,
      },
      {
        nomade_id: nomades[1].id,
        category: "SEO",
        task: "Auditoria SEO",
        status: "habilitado",
        certification_date: new Date("2025-05-01"),
        test_required: true,
      },
      {
        nomade_id: nomades[5].id,
        category: "Vídeo",
        task: "Motion Graphics",
        status: "habilitado",
        certification_date: new Date("2025-06-12"),
        test_required: true,
      },
      {
        nomade_id: nomades[5].id,
        category: "Vídeo",
        task: "Edição de Vídeo",
        status: "habilitado",
        certification_date: new Date("2025-01-18"),
        test_required: false,
      },
      {
        nomade_id: nomades[6].id,
        category: "Design",
        task: "UI/UX",
        status: "habilitado",
        certification_date: new Date("2025-04-22"),
        test_required: true,
      },
      {
        nomade_id: nomades[7].id,
        category: "Desenvolvimento",
        task: "WordPress",
        status: "teste_pendente",
        test_required: true,
      },
      {
        nomade_id: nomades[3].id,
        category: "Gestão",
        task: "Gerenciamento de Projeto",
        status: "habilitado",
        certification_date: new Date("2024-12-10"),
        test_required: false,
      },
    ],
  });

  // ─── Companies (10 total) ─────────────────────────────────────────────────
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
    prisma.company.upsert({
      where: { cnpj: "11.222.333/0001-44" },
      update: {},
      create: {
        name: "Clínica Saúde Total",
        cnpj: "11.222.333/0001-44",
        email: "atendimento@saudetotal.com",
        phone: "(21) 3333-4444",
        status: "ativo",
        segment: "Saúde",
        website: "https://saudetotal.com",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "22.333.444/0001-55" },
      update: {},
      create: {
        name: "Imobiliária Nova Casa",
        cnpj: "22.333.444/0001-55",
        email: "vendas@novacasa.com.br",
        phone: "(31) 2222-3333",
        status: "ativo",
        segment: "Imobiliário",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "33.444.555/0001-66" },
      update: {},
      create: {
        name: "Escritório Advocacia JR",
        cnpj: "33.444.555/0001-66",
        email: "contato@advocaciajr.com",
        phone: "(11) 4444-5555",
        status: "prospecto",
        segment: "Jurídico",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "44.555.666/0001-77" },
      update: {},
      create: {
        name: "Academia FitLife",
        cnpj: "44.555.666/0001-77",
        email: "contato@fitlife.com.br",
        phone: "(41) 5555-6666",
        status: "ativo",
        segment: "Fitness / Bem-estar",
        website: "https://fitlife.com.br",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "55.666.777/0001-88" },
      update: {},
      create: {
        name: "Pet Shop Amigo Fiel",
        cnpj: "55.666.777/0001-88",
        email: "contato@amigofiel.com",
        phone: "(51) 6666-7777",
        status: "ativo",
        segment: "Pet / Veterinário",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "66.777.888/0001-99" },
      update: {},
      create: {
        name: "Escola Crescer & Aprender",
        cnpj: "66.777.888/0001-99",
        email: "secretaria@crescer.edu.br",
        phone: "(61) 7777-8888",
        status: "inativo",
        segment: "Educação",
      },
    }),
    prisma.company.upsert({
      where: { cnpj: "77.888.999/0001-00" },
      update: {},
      create: {
        name: "StartupX Inovações",
        cnpj: "77.888.999/0001-00",
        email: "founders@startupx.io",
        phone: "(11) 8888-9999",
        status: "prospecto",
        segment: "Tecnologia / Startup",
      },
    }),
  ]);

  // ─── Specialties (10 total) ───────────────────────────────────────────────
  await Promise.all([
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
    prisma.specialty.upsert({
      where: { id: "spec-video" },
      update: {},
      create: {
        id: "spec-video",
        name: "Produção de Vídeo",
        hourly_rate: 110,
        category: "Criativo",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-uiux" },
      update: {},
      create: {
        id: "spec-uiux",
        name: "UI/UX Design",
        hourly_rate: 100,
        category: "Criativo",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-webdev" },
      update: {},
      create: {
        id: "spec-webdev",
        name: "Desenvolvimento Web",
        hourly_rate: 120,
        category: "Tecnologia",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-ecommerce" },
      update: {},
      create: {
        id: "spec-ecommerce",
        name: "E-commerce",
        hourly_rate: 90,
        category: "Tecnologia",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-consulting" },
      update: {},
      create: {
        id: "spec-consulting",
        name: "Consultoria Estratégica",
        hourly_rate: 150,
        category: "Estratégia",
        is_active: true,
      },
    }),
    prisma.specialty.upsert({
      where: { id: "spec-photo" },
      update: {},
      create: {
        id: "spec-photo",
        name: "Fotografia Profissional",
        hourly_rate: 80,
        category: "Criativo",
        is_active: true,
      },
    }),
  ]);

  // ─── Products ────────────────────────────────────────────────────────────
  // Produtos reais são criados via seed-product-pa0186.js (e futuros seeds individuais).
  // O seed genérico NÃO cria mais produtos de exemplo para não poluir o catálogo.
  // Para recriar o produto PA0186: node apps/backend/seed-product-pa0186.js

  // ─── Projects (10 total) ──────────────────────────────────────────────────
  const projects = await Promise.all([
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Identidade Visual — TechCorp",
          description: "Redesign completo da marca TechCorp",
          client_id: companies[0].id,
          status: "in-progress",
          lifecycle: "avulso",
          value: 2400,
          progress: 45,
          team_size: 2,
          start_date: new Date("2026-03-15"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Gestão Social — Varejo Modas",
          description: "Gerenciamento mensal das redes sociais",
          client_id: companies[1].id,
          status: "in-progress",
          lifecycle: "mensal",
          value: 1500,
          progress: 70,
          team_size: 1,
          start_date: new Date("2026-02-01"),
          billing_day: 5,
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Campanha de Lançamento — Sabor & Arte",
          description: "Estratégia completa para novo cardápio",
          client_id: companies[2].id,
          status: "planning",
          lifecycle: "avulso",
          value: 3800,
          progress: 10,
          team_size: 3,
          start_date: new Date("2026-04-01"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Site Institucional — Saúde Total",
          description: "Desenvolvimento de site responsivo com blog",
          client_id: companies[3].id,
          status: "in-progress",
          lifecycle: "avulso",
          value: 4200,
          progress: 60,
          team_size: 2,
          start_date: new Date("2026-01-20"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "SEO + Tráfego — Nova Casa",
          description: "Otimização SEO e campanhas de tráfego pago",
          client_id: companies[4].id,
          status: "in-progress",
          lifecycle: "mensal",
          value: 3200,
          progress: 35,
          team_size: 2,
          start_date: new Date("2026-03-01"),
          billing_day: 10,
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Branding — Advocacia JR",
          description: "Identidade visual e papelaria jurídica",
          client_id: companies[5].id,
          status: "draft",
          lifecycle: "avulso",
          value: 2800,
          progress: 0,
          team_size: 0,
          start_date: new Date("2026-05-01"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Social Media — FitLife",
          description: "Gestão de Instagram e TikTok para academia",
          client_id: companies[6].id,
          status: "completed",
          lifecycle: "mensal",
          value: 1800,
          progress: 100,
          team_size: 1,
          start_date: new Date("2025-12-01"),
          end_date: new Date("2026-02-28"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "E-commerce — Amigo Fiel",
          description: "Loja virtual completa para pet shop",
          client_id: companies[7].id,
          status: "in-progress",
          lifecycle: "avulso",
          value: 7200,
          progress: 25,
          team_size: 3,
          start_date: new Date("2026-03-10"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Vídeo Institucional — Crescer",
          description: "Vídeo institucional + campanha de matrículas",
          client_id: companies[8].id,
          status: "cancelled",
          lifecycle: "avulso",
          value: 3500,
          progress: 15,
          team_size: 2,
          start_date: new Date("2026-02-15"),
          end_date: new Date("2026-03-01"),
          project_code: projectCode,
        },
      }),
    ),
    withProjectCode(prisma, (tx, projectCode) =>
      tx.project.create({
        data: {
          title: "Landing Page — StartupX",
          description: "Landing page de captação para lançamento",
          client_id: companies[9].id,
          status: "planning",
          lifecycle: "avulso",
          value: 1600,
          progress: 5,
          team_size: 1,
          start_date: new Date("2026-04-15"),
          project_code: projectCode,
        },
      }),
    ),
  ]);

  // ─── Task Executions (10 total) ───────────────────────────────────────────
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
      {
        project_id: projects[3].id,
        nomade_id: nomades[1].id,
        title: "Desenvolvimento Frontend — Saúde Total",
        description: "Implementação das páginas do site em WordPress",
        status: "in_progress",
        priority: "high",
        type: "standard",
        due_date: new Date("2026-04-10"),
      },
      {
        project_id: projects[3].id,
        nomade_id: nomades[6].id,
        title: "Design UI/UX — Saúde Total",
        description: "Wireframes e protótipos no Figma",
        status: "delivered",
        priority: "high",
        type: "standard",
        due_date: new Date("2026-03-20"),
        delivered_at: new Date("2026-03-18"),
      },
      {
        project_id: projects[4].id,
        nomade_id: nomades[1].id,
        title: "Auditoria SEO — Nova Casa",
        description: "Relatório completo de SEO on-page e off-page",
        status: "approved",
        priority: "medium",
        type: "standard",
        due_date: new Date("2026-03-25"),
        approved_at: new Date("2026-03-28"),
        rating: 4.5,
      },
      {
        project_id: projects[4].id,
        nomade_id: nomades[5].id,
        title: "Setup Google Ads — Nova Casa",
        description: "Criação de campanhas de busca e display",
        status: "in_progress",
        priority: "high",
        type: "standard",
        due_date: new Date("2026-04-05"),
      },
      {
        project_id: projects[6].id,
        nomade_id: nomades[0].id,
        title: "Posts Janeiro — FitLife",
        description: "Conteúdo mensal Instagram + Stories",
        status: "approved",
        priority: "medium",
        type: "standard",
        due_date: new Date("2026-01-31"),
        approved_at: new Date("2026-02-02"),
        rating: 4.8,
      },
      {
        project_id: projects[7].id,
        nomade_id: nomades[7].id,
        title: "Estrutura WooCommerce — Amigo Fiel",
        description: "Setup do WooCommerce + tema + 50 produtos",
        status: "in_progress",
        priority: "high",
        type: "standard",
        due_date: new Date("2026-04-20"),
      },
      {
        project_id: projects[9].id,
        nomade_id: nomades[6].id,
        title: "Design Landing Page — StartupX",
        description: "Layout responsivo da LP de captação",
        status: "draft",
        priority: "medium",
        type: "standard",
        due_date: new Date("2026-04-30"),
      },
    ],
  });

  // ─── Invoices (10 total) ──────────────────────────────────────────────────
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
      {
        company_id: companies[3].id,
        project_id: projects[3].id,
        amount: 2100,
        status: "paid",
        due_date: new Date("2026-02-15"),
        paid_at: new Date("2026-02-14"),
        invoice_number: "INV-2026-004",
        description: "50% entrada — Site Saúde Total",
      },
      {
        company_id: companies[4].id,
        project_id: projects[4].id,
        amount: 3200,
        status: "paid",
        due_date: new Date("2026-03-10"),
        paid_at: new Date("2026-03-10"),
        invoice_number: "INV-2026-005",
        description: "SEO + Tráfego mensal — Nova Casa",
      },
      {
        company_id: companies[5].id,
        project_id: projects[5].id,
        amount: 1400,
        status: "pending",
        due_date: new Date("2026-05-05"),
        invoice_number: "INV-2026-006",
        description: "50% entrada — Branding Advocacia JR",
      },
      {
        company_id: companies[6].id,
        project_id: projects[6].id,
        amount: 5400,
        status: "paid",
        due_date: new Date("2026-03-01"),
        paid_at: new Date("2026-02-28"),
        invoice_number: "INV-2026-007",
        description: "Social Media FitLife — 3 meses",
      },
      {
        company_id: companies[7].id,
        project_id: projects[7].id,
        amount: 3600,
        status: "pending",
        due_date: new Date("2026-04-15"),
        invoice_number: "INV-2026-008",
        description: "50% entrada — E-commerce Amigo Fiel",
      },
      {
        company_id: companies[3].id,
        project_id: projects[3].id,
        amount: 2100,
        status: "overdue",
        due_date: new Date("2026-03-30"),
        invoice_number: "INV-2026-009",
        description: "50% final — Site Saúde Total",
      },
      {
        company_id: companies[9].id,
        project_id: projects[9].id,
        amount: 800,
        status: "pending",
        due_date: new Date("2026-04-20"),
        invoice_number: "INV-2026-010",
        description: "50% entrada — Landing Page StartupX",
      },
    ],
  });

  // ─── Wallet Transactions ──────────────────────────────────────────────────
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
      {
        nomade_id: nomades[1].id,
        type: "credit",
        amount: 620,
        description: "Pagamento — Dev Frontend Saúde Total",
        date: new Date("2026-03-28"),
      },
      {
        nomade_id: nomades[1].id,
        type: "credit",
        amount: 380,
        description: "Pagamento — Auditoria SEO Nova Casa",
        date: new Date("2026-03-30"),
      },
      {
        nomade_id: nomades[5].id,
        type: "credit",
        amount: 550,
        description: "Pagamento — Setup Google Ads Nova Casa",
        date: new Date("2026-04-01"),
      },
      {
        nomade_id: nomades[5].id,
        type: "bonus",
        amount: 110,
        description: "Bônus nível Diamante — 20%",
        date: new Date("2026-04-01"),
      },
      {
        nomade_id: nomades[6].id,
        type: "credit",
        amount: 420,
        description: "Pagamento — Design UI/UX Saúde Total",
        date: new Date("2026-03-22"),
      },
      {
        nomade_id: nomades[3].id,
        type: "credit",
        amount: 750,
        description: "Comissão de liderança — Março",
        date: new Date("2026-04-05"),
      },
    ],
  });

  // ─── Withdrawal Requests (5 total) ────────────────────────────────────────
  await prisma.withdrawalRequest.createMany({
    data: [
      {
        nomade_id: nomades[0].id,
        amount: 500,
        status: "aguardando_analise",
        pix_key: "ana@nomad.com",
        pix_key_type: "email",
      },
      {
        nomade_id: nomades[1].id,
        amount: 800,
        status: "aprovado",
        pix_key: "11999990002",
        pix_key_type: "phone",
        reviewed_at: new Date("2026-04-03"),
      },
      {
        nomade_id: nomades[5].id,
        amount: 600,
        status: "pago",
        pix_key: "pedro.nascimento@banco.com",
        pix_key_type: "email",
        reviewed_at: new Date("2026-03-28"),
        paid_at: new Date("2026-03-30"),
      },
      {
        nomade_id: nomades[3].id,
        amount: 750,
        status: "aguardando_analise",
        pix_key: "12345678900",
        pix_key_type: "cpf",
      },
      {
        nomade_id: nomades[6].id,
        amount: 420,
        status: "rejeitado",
        pix_key: "juliana@banco.com",
        pix_key_type: "email",
        notes: "Dados PIX inconsistentes",
        reviewed_at: new Date("2026-04-01"),
      },
    ],
  });

  // ─── Campaigns (10 total — mix coupon / link / referral) ──────────────────
  // Idempotente: campanhas com coupon_code usam essa chave única real
  // (upsert); as sem coupon_code (link/referral) não têm nenhuma chave
  // natural no schema além do id, então usam "create apenas se não existir
  // uma campanha com este name" — nunca substitui coupon_code por um valor
  // aleatório só pra evitar colisão.
  const campaignSpecs = [
    { name: "Campanha Verão 2026", type: "coupon", status: "active", commission_type: "percentage", commission_value: 8, coupon_code: "VERAO2026" },
    { name: "Cupom Primeira Compra", type: "coupon", status: "active", commission_type: "percentage", commission_value: 15, coupon_code: "PRIMEIRA15" },
    { name: "Desconto Black Friday", type: "coupon", status: "inactive", commission_type: "percentage", commission_value: 25, coupon_code: "BLACK25", start_date: new Date("2026-11-20"), end_date: new Date("2026-11-30") },
    { name: "Cupom Fidelidade 5%", type: "coupon", status: "active", commission_type: "percentage", commission_value: 5, coupon_code: "FIEL5" },
    { name: "Link Afiliado — Blog Tech", type: "link", status: "active", commission_type: "percentage", commission_value: 10 },
    { name: "Link Afiliado — YouTube", type: "link", status: "active", commission_type: "fixed", commission_value: 50 },
    { name: "Link Afiliado — Influencer", type: "link", status: "paused", commission_type: "percentage", commission_value: 12 },
    { name: "Indicação Amigo — R$30", type: "referral", status: "active", commission_type: "fixed", commission_value: 30 },
    { name: "Indicação Premium", type: "referral", status: "active", commission_type: "percentage", commission_value: 7 },
    { name: "Cupom Parceiro Carlos", type: "coupon", status: "active", commission_type: "percentage", commission_value: 8, coupon_code: "CARLOS10" },
  ];

  const campaigns = [];
  for (const spec of campaignSpecs) {
    const { name, type, status, commission_type, commission_value, coupon_code, start_date, end_date } = spec;
    const mutableData = { name, type, status, commission_type, commission_value, coupon_code: coupon_code ?? null, start_date: start_date ?? null, end_date: end_date ?? null };

    if (coupon_code) {
      campaigns.push(
        await prisma.campaign.upsert({
          where: { coupon_code },
          update: mutableData,
          create: mutableData,
        }),
      );
      continue;
    }

    const existing = await prisma.campaign.findFirst({ where: { name, coupon_code: null } });
    campaigns.push(
      existing
        ? await prisma.campaign.update({ where: { id: existing.id }, data: mutableData })
        : await prisma.campaign.create({ data: mutableData }),
    );
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

  // ─── Partner Profile ──────────────────────────────────────────────────────
  const existingPartner = await prisma.partnerProfile.findUnique({
    where: { user_id: partnerUser.id },
  });
  if (!existingPartner) {
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
        linked_campaign_id: campaigns[9].id,
      },
    });
  }

  // ─── Terms (3 total) ──────────────────────────────────────────────────────
  await prisma.term.create({
    data: {
      title: "Termos de Uso da Plataforma Allka",
      content:
        "Ao utilizar a plataforma Allka, você concorda com os presentes Termos de Uso. A plataforma conecta empresas a profissionais nômades digitais para execução de serviços criativos e de marketing. É proibido o uso da plataforma para atividades ilegais, ofensivas ou que violem direitos de terceiros. A Allka reserva-se o direito de suspender contas que violem estes termos.",
      version: "1.0",
      acceptance_level: "usuario",
      target_account_types: '["empresas","agencias","nomades","parceiro"]',
      is_active: true,
    },
  });
  await prisma.term.create({
    data: {
      title: "Política de Privacidade",
      content:
        "A Allka coleta e trata dados pessoais de acordo com a LGPD (Lei 13.709/2018). Os dados coletados incluem nome, e-mail, telefone e dados de pagamento, utilizados exclusivamente para operação da plataforma. Seus dados não são compartilhados com terceiros sem seu consentimento. Você pode solicitar a exclusão de seus dados a qualquer momento.",
      version: "1.0",
      acceptance_level: "usuario",
      target_account_types: '["empresas","agencias","nomades","parceiro"]',
      is_active: true,
    },
  });
  await prisma.term.create({
    data: {
      title: "Contrato de Prestação de Serviços — Nômade",
      content:
        "Este contrato regula a relação entre o profissional nômade digital e a Allka. O nômade compromete-se a entregar as tarefas nos prazos estipulados, manter a qualidade acordada e comunicar eventuais impedimentos. A remuneração será creditada na carteira virtual após aprovação da entrega pelo cliente.",
      version: "1.0",
      acceptance_level: "nomade",
      target_account_types: '["nomades"]',
      is_active: true,
    },
  });

  // ─── Courses + Modules + Lessons (5 courses for Allkademy) ────────────────
  const course1 = await prisma.course.create({
    data: {
      title: "Introdução ao Marketing Digital",
      description:
        "Aprenda os fundamentos do marketing digital: SEO, redes sociais, tráfego pago e métricas.",
      category: "Marketing",
      duration: 480,
      is_published: true,
      is_free: true,
    },
  });
  const c1m1 = await prisma.courseModule.create({
    data: {
      course_id: course1.id,
      title: "O que é Marketing Digital?",
      order: 1,
    },
  });
  const c1m2 = await prisma.courseModule.create({
    data: { course_id: course1.id, title: "SEO Básico", order: 2 },
  });
  await prisma.lesson.createMany({
    data: [
      {
        module_id: c1m1.id,
        title: "Conceitos fundamentais",
        content_type: "video",
        duration: 15,
        order: 1,
      },
      {
        module_id: c1m1.id,
        title: "Canais e estratégias",
        content_type: "video",
        duration: 20,
        order: 2,
      },
      {
        module_id: c1m2.id,
        title: "Palavras-chave e on-page",
        content_type: "video",
        duration: 25,
        order: 1,
      },
      {
        module_id: c1m2.id,
        title: "Link building",
        content_type: "video",
        duration: 18,
        order: 2,
      },
    ],
  });

  const course2 = await prisma.course.create({
    data: {
      title: "Design para Redes Sociais",
      description:
        "Domine as técnicas de criação de posts e stories profissionais usando Canva e Figma.",
      category: "Design",
      duration: 360,
      is_published: true,
      is_free: false,
    },
  });
  const c2m1 = await prisma.courseModule.create({
    data: { course_id: course2.id, title: "Fundamentos de Design", order: 1 },
  });
  const c2m2 = await prisma.courseModule.create({
    data: { course_id: course2.id, title: "Criando no Canva", order: 2 },
  });
  await prisma.lesson.createMany({
    data: [
      {
        module_id: c2m1.id,
        title: "Teoria das cores",
        content_type: "video",
        duration: 12,
        order: 1,
      },
      {
        module_id: c2m1.id,
        title: "Tipografia e hierarquia",
        content_type: "video",
        duration: 15,
        order: 2,
      },
      {
        module_id: c2m2.id,
        title: "Templates e brand kit",
        content_type: "video",
        duration: 20,
        order: 1,
      },
      {
        module_id: c2m2.id,
        title: "Criando carrosséis",
        content_type: "video",
        duration: 22,
        order: 2,
      },
    ],
  });

  const course3 = await prisma.course.create({
    data: {
      title: "Copywriting que Converte",
      description:
        "Aprenda a escrever textos persuasivos para landing pages, e-mails e anúncios.",
      category: "Conteúdo",
      duration: 300,
      is_published: true,
      is_free: true,
    },
  });
  const c3m1 = await prisma.courseModule.create({
    data: { course_id: course3.id, title: "Fundamentos de Copy", order: 1 },
  });
  await prisma.lesson.createMany({
    data: [
      {
        module_id: c3m1.id,
        title: "AIDA e PAS frameworks",
        content_type: "video",
        duration: 18,
        order: 1,
      },
      {
        module_id: c3m1.id,
        title: "Headlines magnéticas",
        content_type: "video",
        duration: 14,
        order: 2,
      },
      {
        module_id: c3m1.id,
        title: "CTAs que funcionam",
        content_type: "video",
        duration: 16,
        order: 3,
      },
    ],
  });

  const course4 = await prisma.course.create({
    data: {
      title: "Google Ads do Zero ao Avançado",
      description:
        "Curso completo de Google Ads: busca, display, shopping e YouTube Ads.",
      category: "Tráfego Pago",
      duration: 720,
      is_published: true,
      is_free: false,
    },
  });
  const c4m1 = await prisma.courseModule.create({
    data: {
      course_id: course4.id,
      title: "Primeiros passos no Google Ads",
      order: 1,
    },
  });
  const c4m2 = await prisma.courseModule.create({
    data: { course_id: course4.id, title: "Campanhas de Busca", order: 2 },
  });
  const c4m3 = await prisma.courseModule.create({
    data: { course_id: course4.id, title: "Display e YouTube Ads", order: 3 },
  });
  await prisma.lesson.createMany({
    data: [
      {
        module_id: c4m1.id,
        title: "Criando sua conta",
        content_type: "video",
        duration: 10,
        order: 1,
      },
      {
        module_id: c4m1.id,
        title: "Estrutura de campanhas",
        content_type: "video",
        duration: 20,
        order: 2,
      },
      {
        module_id: c4m2.id,
        title: "Pesquisa de palavras-chave",
        content_type: "video",
        duration: 25,
        order: 1,
      },
      {
        module_id: c4m2.id,
        title: "Criando anúncios responsivos",
        content_type: "video",
        duration: 22,
        order: 2,
      },
      {
        module_id: c4m3.id,
        title: "Banners e remarketing",
        content_type: "video",
        duration: 18,
        order: 1,
      },
      {
        module_id: c4m3.id,
        title: "Video Ads no YouTube",
        content_type: "video",
        duration: 20,
        order: 2,
      },
    ],
  });

  const course5 = await prisma.course.create({
    data: {
      title: "Gestão de Projetos para Nômades",
      description:
        "Como gerenciar múltiplos projetos, prazos e clientes como profissional freelancer.",
      category: "Produtividade",
      duration: 240,
      is_published: false,
      is_free: true,
    },
  });
  const c5m1 = await prisma.courseModule.create({
    data: {
      course_id: course5.id,
      title: "Organização e Ferramentas",
      order: 1,
    },
  });
  await prisma.lesson.createMany({
    data: [
      {
        module_id: c5m1.id,
        title: "Kanban e Scrum simplificado",
        content_type: "video",
        duration: 20,
        order: 1,
      },
      {
        module_id: c5m1.id,
        title: "Ferramentas essenciais (Notion, Trello, Asana)",
        content_type: "article",
        duration: 15,
        order: 2,
      },
    ],
  });

  // ─── Course Enrollments ───────────────────────────────────────────────────
  await prisma.courseEnrollment.createMany({
    data: [
      {
        course_id: course1.id,
        user_id: nomadeUsers[0].id,
        progress: 100,
        completed_at: new Date("2026-02-10"),
      },
      { course_id: course1.id, user_id: nomadeUsers[1].id, progress: 60 },
      { course_id: course2.id, user_id: nomadeUsers[0].id, progress: 75 },
      { course_id: course2.id, user_id: nomadeUsers[6].id, progress: 40 },
      { course_id: course3.id, user_id: nomadeUsers[2].id, progress: 20 },
      { course_id: course4.id, user_id: nomadeUsers[1].id, progress: 10 },
      { course_id: course4.id, user_id: nomadeUsers[5].id, progress: 85 },
    ],
  });

  // ─── Admin Permissions ────────────────────────────────────────────────────
  const modules = [
    "empresas",
    "nomades",
    "projetos",
    "financeiro",
    "produtos",
    "usuarios",
    "campanhas",
    "cursos",
    "termos",
    "sistema",
  ];
  const actions = ["view", "edit", "create", "delete"] as const;

  // Master — full access
  const masterPermData = modules.flatMap((m) =>
    actions.map((a) => ({
      profile_id: masterProfile.id,
      module: m,
      action: a,
    })),
  );
  for (const p of masterPermData) {
    await prisma.adminPermission.upsert({
      where: {
        profile_id_module_action: {
          profile_id: p.profile_id,
          module: p.module,
          action: p.action,
        },
      },
      update: {},
      create: p,
    });
  }

  // Editor — view + edit only
  const editorPermData = modules.flatMap((m) =>
    (["view", "edit"] as const).map((a) => ({
      profile_id: editorProfile.id,
      module: m,
      action: a,
    })),
  );
  for (const p of editorPermData) {
    await prisma.adminPermission.upsert({
      where: {
        profile_id_module_action: {
          profile_id: p.profile_id,
          module: p.module,
          action: p.action,
        },
      },
      update: {},
      create: p,
    });
  }

  // ─── Company Test User + Data (company@allka.test) ──────────────────────
  // IDs fixos → idempotente (upsert seguro para re-rodar o seed)
  const CT_COMPANY_ID = "cmqgqm0u3000a13ogmj3z2i6c";

  const companyTest = await prisma.company.upsert({
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
    // company_id não é sensível (vínculo estrutural) — seguro sincronizar.
    update: { company_id: CT_COMPANY_ID },
    create: {
      email: "company@allka.test",
      password_hash: sharedPassword,
      name: "Company Test",
      role: "company_admin",
      account_type: "empresas",
      company_id: CT_COMPANY_ID,
      is_active: true,
    },
  });

  function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  // Projects
  const ctProjects = [
    { id: "proj-ct-01", title: "Site institucional + SEO",               type: "Desenvolvimento Web",    status: "producao",  value: 8500,  budget: 8500,  progress: 45,  start_date: daysAgo(25),  end_date: daysAgo(-15) },
    { id: "proj-ct-02", title: "Gestão de Tráfego Pago — Q3",            type: "Marketing Digital",      status: "producao",  value: 3200,  budget: 3200,  progress: 70,  start_date: daysAgo(18),  end_date: daysAgo(-20) },
    { id: "proj-ct-03", title: "Identidade Visual & Branding",           type: "Design",                 status: "revisao",   value: 5000,  budget: 5000,  progress: 85,  start_date: daysAgo(40),  end_date: daysAgo(-5)  },
    { id: "proj-ct-04", title: "Criação de Conteúdo — Redes Sociais",    type: "Marketing Digital",      status: "briefing",  value: 2400,  budget: 2400,  progress: 10,  start_date: daysAgo(5),   end_date: daysAgo(-30) },
    { id: "proj-ct-05", title: "Landing Page — Campanha de Lançamento",  type: "Desenvolvimento Web",    status: "briefing",  value: 3800,  budget: 3800,  progress: 0,   start_date: daysAgo(3),   end_date: daysAgo(-25) },
    { id: "proj-ct-06", title: "E-commerce + Integração de Pagamento",   type: "E-commerce",             status: "entregue",  value: 14000, budget: 14000, progress: 100, start_date: daysAgo(95),  end_date: daysAgo(10)  },
    { id: "proj-ct-07", title: "App de Agendamento — MVP",               type: "Desenvolvimento Mobile", status: "entregue",  value: 18000, budget: 18000, progress: 100, start_date: daysAgo(180), end_date: daysAgo(60)  },
    { id: "proj-ct-08", title: "Consultoria SEO — Auditoria Técnica",    type: "Consultoria",            status: "cancelado", value: 1800,  budget: 1800,  progress: 20,  start_date: daysAgo(200), end_date: daysAgo(150) },
  ];
  for (const proj of ctProjects) {
    await withProjectCode(prisma, (tx, projectCode) =>
      tx.project.upsert({
        where: { id: proj.id },
        update: { ...proj },
        create: { ...proj, client_id: CT_COMPANY_ID, project_code: projectCode },
      }),
    );
  }

  // Tasks
  const ctTasks = [
    { id: "task-ct-01", project_id: "proj-ct-01", title: "Wireframes e prototipação das páginas",             status: "done",        due_date: daysAgo(15), delivered_at: daysAgo(16) },
    { id: "task-ct-02", project_id: "proj-ct-01", title: "Desenvolvimento frontend — Home e Sobre",           status: "in_progress", due_date: daysAgo(-5)  },
    { id: "task-ct-03", project_id: "proj-ct-01", title: "Desenvolvimento backend — Formulário de contato",   status: "available",   due_date: daysAgo(-10) },
    { id: "task-ct-04", project_id: "proj-ct-01", title: "SEO On-page — levantamento de palavras-chave",      status: "done",        due_date: daysAgo(20), delivered_at: daysAgo(22) },
    { id: "task-ct-05", project_id: "proj-ct-01", title: "Integração Google Analytics + Search Console",      status: "available",   due_date: daysAgo(-12) },
    { id: "task-ct-06", project_id: "proj-ct-02", title: "Setup conta Google Ads + estrutura de campanhas",   status: "done",        due_date: daysAgo(14), delivered_at: daysAgo(15) },
    { id: "task-ct-07", project_id: "proj-ct-02", title: "Criação de anúncios e criativos — 1ª rodada",       status: "done",        due_date: daysAgo(10), delivered_at: daysAgo(11) },
    { id: "task-ct-08", project_id: "proj-ct-02", title: "Otimização de lances e segmentação de público",     status: "in_progress", due_date: daysAgo(-3)  },
    { id: "task-ct-09", project_id: "proj-ct-02", title: "Relatório de performance — semana 2",               status: "review",      due_date: daysAgo(2)   },
    { id: "task-ct-10", project_id: "proj-ct-03", title: "Pesquisa de mercado e moodboard",                   status: "done",        due_date: daysAgo(30), delivered_at: daysAgo(32) },
    { id: "task-ct-11", project_id: "proj-ct-03", title: "Criação do logotipo — 3 propostas",                 status: "done",        due_date: daysAgo(20), delivered_at: daysAgo(21) },
    { id: "task-ct-12", project_id: "proj-ct-03", title: "Manual de identidade visual completo",              status: "review",      due_date: daysAgo(3)   },
    { id: "task-ct-13", project_id: "proj-ct-03", title: "Aplicações (papelaria, assinatura e-mail, PPT)",    status: "available",   due_date: daysAgo(-7)  },
    { id: "task-ct-14", project_id: "proj-ct-04", title: "Definição de calendário editorial",                 status: "available",   due_date: daysAgo(-8)  },
    { id: "task-ct-15", project_id: "proj-ct-04", title: "Criação de 12 posts para feed",                     status: "available",   due_date: daysAgo(-15) },
    { id: "task-ct-16", project_id: "proj-ct-06", title: "Configuração da loja WooCommerce",                  status: "done",        due_date: daysAgo(80), delivered_at: daysAgo(82) },
    { id: "task-ct-17", project_id: "proj-ct-06", title: "Integração gateway de pagamento (Stripe + Pix)",    status: "done",        due_date: daysAgo(65), delivered_at: daysAgo(66) },
    { id: "task-ct-18", project_id: "proj-ct-06", title: "Importação do catálogo de produtos (320 itens)",    status: "done",        due_date: daysAgo(55), delivered_at: daysAgo(56) },
    { id: "task-ct-19", project_id: "proj-ct-06", title: "Testes de compra e QA completo",                    status: "done",        due_date: daysAgo(15), delivered_at: daysAgo(14) },
    { id: "task-ct-20", project_id: "proj-ct-07", title: "UX Research + fluxo de usuário",                    status: "done",        due_date: daysAgo(170), delivered_at: daysAgo(172) },
    { id: "task-ct-21", project_id: "proj-ct-07", title: "Design de telas — React Native",                    status: "done",        due_date: daysAgo(140), delivered_at: daysAgo(141) },
    { id: "task-ct-22", project_id: "proj-ct-07", title: "Desenvolvimento das telas de agendamento",          status: "done",        due_date: daysAgo(100), delivered_at: daysAgo(102) },
    { id: "task-ct-23", project_id: "proj-ct-07", title: "Backend API + notificações push",                   status: "done",        due_date: daysAgo(80),  delivered_at: daysAgo(81)  },
    { id: "task-ct-24", project_id: "proj-ct-07", title: "Publicação App Store + Google Play",                status: "done",        due_date: daysAgo(65),  delivered_at: daysAgo(63)  },
    { id: "task-ct-25", project_id: "proj-ct-08", title: "Auditoria técnica inicial de SEO",                  status: "cancelled",   due_date: daysAgo(180) },
  ];
  for (const task of ctTasks) {
    await prisma.taskExecution.upsert({
      where: { id: task.id },
      update: { ...task },
      create: { ...task },
    });
  }

  // Invoices
  const ctInvoices = [
    { id: "inv-ct-01", company_id: CT_COMPANY_ID, project_id: "proj-ct-07", amount: 9000,  status: "paid",    invoice_number: "NF-2024-001", description: "App de Agendamento — parcela 1/2",  due_date: daysAgo(162), paid_at: daysAgo(158), created_at: daysAgo(165) },
    { id: "inv-ct-02", company_id: CT_COMPANY_ID, project_id: "proj-ct-07", amount: 9000,  status: "paid",    invoice_number: "NF-2024-002", description: "App de Agendamento — parcela 2/2",  due_date: daysAgo(82),  paid_at: daysAgo(79),  created_at: daysAgo(85)  },
    { id: "inv-ct-03", company_id: CT_COMPANY_ID, project_id: "proj-ct-06", amount: 7000,  status: "paid",    invoice_number: "NF-2024-003", description: "E-commerce — parcela 1/2",          due_date: daysAgo(92),  paid_at: daysAgo(91),  created_at: daysAgo(95)  },
    { id: "inv-ct-04", company_id: CT_COMPANY_ID, project_id: "proj-ct-06", amount: 7000,  status: "paid",    invoice_number: "NF-2024-004", description: "E-commerce — parcela 2/2",          due_date: daysAgo(22),  paid_at: daysAgo(18),  created_at: daysAgo(25)  },
    { id: "inv-ct-05", company_id: CT_COMPANY_ID, project_id: "proj-ct-03", amount: 2500,  status: "paid",    invoice_number: "NF-2025-001", description: "Identidade Visual — sinal (50%)",   due_date: daysAgo(37),  paid_at: daysAgo(34),  created_at: daysAgo(40)  },
    { id: "inv-ct-06", company_id: CT_COMPANY_ID, project_id: "proj-ct-01", amount: 4250,  status: "pending", invoice_number: "NF-2025-002", description: "Site Institucional — sinal (50%)",  due_date: daysAgo(-5),  created_at: daysAgo(5)  },
    { id: "inv-ct-07", company_id: CT_COMPANY_ID, project_id: "proj-ct-02", amount: 1600,  status: "pending", invoice_number: "NF-2025-003", description: "Tráfego Pago — parcela 1/2",        due_date: daysAgo(-8),  created_at: daysAgo(3)  },
    { id: "inv-ct-08", company_id: CT_COMPANY_ID, project_id: "proj-ct-03", amount: 2500,  status: "pending", invoice_number: "NF-2025-004", description: "Identidade Visual — restante (50%)", due_date: daysAgo(-3), created_at: daysAgo(6)  },
    { id: "inv-ct-09", company_id: CT_COMPANY_ID, project_id: "proj-ct-08", amount: 900,   status: "overdue", invoice_number: "NF-2024-005", description: "Consultoria SEO — sinal (50%)",     due_date: daysAgo(60),  created_at: daysAgo(65) },
  ];
  for (const inv of ctInvoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: { ...inv },
      create: { ...inv },
    });
  }
  console.log("✅ Company Test: 1 empresa · 1 user · 8 projetos · 25 tarefas · 9 faturas");

  console.log("✅ Seed concluído com sucesso!\n");
  console.log("📊 Dados criados:");
  console.log("   10 usuários · 10 nômades · 10 empresas · 10 projetos");
  console.log("   10 tarefas · 10 faturas · 10 campanhas");
  console.log("   10 especialidades · 5 cursos · 7 matrículas · 5 saques");
  console.log("   3 termos · 6 níveis · 10 qualificações");
  console.log("\n👤 Credenciais de acesso:");
  console.log("   Admin:    admin@allka.com      / admin123");
  console.log("   Suporte:  suporte@allka.com     / admin123");
  console.log("   Empresa:  empresa@exemplo.com   / senha123");
  console.log("   Company:  company@allka.test    / (SEED_TEST_USER_PASSWORD)");
  console.log("   Nômade:   ana@nomad.com         / senha123");
  console.log("   Agência:  agencia@exemplo.com   / senha123");
  console.log("   Parceiro: parceiro@exemplo.com  / senha123");

  // ─── Verificar se dados reais foram perdidos ──────────────────────────────
  // ATENÇÃO: este seed NÃO restaura produtos, modelos de tarefas ou
  // tarefas operacionais. Esses dados devem ser restaurados manualmente.
  const productCount    = await prisma.product.count();
  const catalogCount    = await prisma.catalogTask.count();
  const projectTaskCount = await prisma.projectTask.count();

  if (productCount === 0 || catalogCount === 0) {
    console.log("\n⚠️  ─────────────────────────────────────────────────────");
    console.log("⚠️  DADOS REAIS AUSENTES — execute os comandos abaixo:");
    if (productCount === 0) {
      console.log("⚠️  Produtos (0):         npx tsx seed-all-products.ts");
    }
    if (catalogCount === 0) {
      console.log("⚠️  Modelos tarefas (0):  npx tsx migrate-tasks.ts");
    }
    if (projectTaskCount === 0) {
      console.log("⚠️  Tarefas operat. (0):  npx tsx src/scripts/seed-in-progress.ts");
    }
    console.log("⚠️  ─────────────────────────────────────────────────────\n");
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
