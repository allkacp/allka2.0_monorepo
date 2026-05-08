// Seed de projetos para o banco de desenvolvimento
// Execução: node seed-projects.cjs
// Cria empresas de exemplo e projetos vinculados a elas

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de projetos...");

  // ── Criar empresas ──────────────────────────────────────────────────────
  const companies = await Promise.all([
    p.company.upsert({
      where: { cnpj: "12.345.678/0001-01" },
      update: {},
      create: {
        name: "Acme Tecnologia Ltda",
        cnpj: "12.345.678/0001-01",
        email: "contato@acme.com.br",
        status: "ativo",
      },
    }),
    p.company.upsert({
      where: { cnpj: "98.765.432/0001-02" },
      update: {},
      create: {
        name: "Grupo Horizonte S/A",
        cnpj: "98.765.432/0001-02",
        email: "contato@horizonte.com.br",
        status: "ativo",
      },
    }),
    p.company.upsert({
      where: { cnpj: "55.123.456/0001-03" },
      update: {},
      create: {
        name: "Nordeste Digital Comercio",
        cnpj: "55.123.456/0001-03",
        email: "contato@nestedigi.com.br",
        status: "ativo",
      },
    }),
  ]);

  console.log(`✅ ${companies.length} empresas criadas/atualizadas`);

  // ── Criar projetos ──────────────────────────────────────────────────────
  const now = new Date();
  const projectData = [
    {
      title: "Site Institucional + SEO",
      description: "Redesign completo do site institucional com estratégia de SEO on-page e off-page.",
      client_id: companies[0].id,
      status: "in-progress",
      lifecycle: "avulso",
      type: "Marketing Digital",
      value: 18500,
      budget: 18500,
      spent: 7200,
      progress: 42,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 4,
      from_lead: true,
      start_date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      end_date: new Date(now.getFullYear(), now.getMonth() + 2, 30),
    },
    {
      title: "Campanha Redes Sociais — Q2",
      description: "Gestão de tráfego pago e conteúdo orgânico para Q2 2026.",
      client_id: companies[0].id,
      status: "planning",
      lifecycle: "mensal",
      type: "Marketing Digital",
      value: 4800,
      budget: 4800,
      spent: 0,
      progress: 10,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 2,
      billing_day: 5,
      billing_start_date: "2026-05-05",
      start_date: new Date(now.getFullYear(), now.getMonth(), 1),
      end_date: new Date(now.getFullYear(), now.getMonth() + 3, 1),
    },
    {
      title: "E-commerce Completo",
      description: "Desenvolvimento de loja virtual com integração de meios de pagamento e ERP.",
      client_id: companies[1].id,
      status: "awaiting-payment",
      lifecycle: "avulso",
      type: "Desenvolvimento Web",
      value: 52000,
      budget: 52000,
      spent: 0,
      progress: 5,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 6,
      from_lead: true,
      start_date: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      end_date: new Date(now.getFullYear(), now.getMonth() + 6, 1),
    },
    {
      title: "App Mobile — Controle de Frotas",
      description: "Aplicativo iOS/Android para gestão de frotas em tempo real com dashboard web.",
      client_id: companies[1].id,
      status: "planning",
      lifecycle: "avulso",
      type: "Desenvolvimento Mobile",
      value: 87000,
      budget: 87000,
      spent: 12400,
      progress: 18,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 5,
      start_date: new Date(now.getFullYear(), now.getMonth(), 15),
      end_date: new Date(now.getFullYear(), now.getMonth() + 8, 15),
    },
    {
      title: "Identidade Visual & Branding",
      description: "Criação de identidade visual completa: logo, manual de marca, papelaria e assinatura de e-mail.",
      client_id: companies[2].id,
      status: "in-progress",
      lifecycle: "avulso",
      type: "Design",
      value: 9500,
      budget: 9500,
      spent: 5600,
      progress: 65,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 2,
      start_date: new Date(now.getFullYear(), now.getMonth() - 2, 5),
      end_date: new Date(now.getFullYear(), now.getMonth(), 28),
    },
    {
      title: "Consultoria em Marketing Digital",
      description: "Auditoria de presença digital, plano de ação e mentoria mensal.",
      client_id: companies[2].id,
      status: "completed",
      lifecycle: "avulso",
      type: "Consultoria",
      value: 6000,
      budget: 6000,
      spent: 6000,
      progress: 100,
      agency: "Allka Agency",
      company_type: "company",
      consultant: "Vinicius Guardia",
      consultant_email: "cp@lamego.com.vc",
      team_size: 1,
      start_date: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      end_date: new Date(now.getFullYear(), now.getMonth() - 1, 28),
    },
  ];

  let created = 0;
  for (const data of projectData) {
    const proj = await p.project.create({ data });
    console.log(`  📁 "${proj.title}" [${proj.status}] — R$ ${proj.value.toLocaleString("pt-BR")}`);
    created++;
  }

  console.log(`\n✅ ${created} projetos criados com sucesso.`);
  console.log(`   Empresas vinculadas:`);
  companies.forEach((c) => console.log(`   · ${c.name} (${c.cnpj})`));
  console.log("\n🚀 Seed concluído. Reinicie o backend se necessário.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
