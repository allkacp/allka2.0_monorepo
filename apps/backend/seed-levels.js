// Seed partner levels and nomade levels
// Safe to re-run: uses upsert (no duplicates)
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding partner levels...");

  const partnerLevels = [
    {
      name: "Bronze",
      description: "Nível inicial para novos parceiros",
      icon: "🥉",
      color: "#CD7F32",
      gradient: "from-amber-700 to-amber-500",
      min_mrr: 0,
      max_mrr: 4999,
      led_agencies_min: 0,
      led_agencies_mrr_min: 0,
      premium_project_limit: 2,
      commission_rate: 0.05,
      extra_discount: 0,
      receives_leads_premium: false,
      requires_partner: false,
      level_up_bonus_credits: 0,
      benefits: JSON.stringify(["Acesso ao painel de parceiros", "Suporte por e-mail"]),
      sort_order: 1,
    },
    {
      name: "Silver",
      description: "Parceiro com MRR entre R$5k e R$14,9k",
      icon: "🥈",
      color: "#C0C0C0",
      gradient: "from-slate-400 to-slate-300",
      min_mrr: 5000,
      max_mrr: 14999,
      led_agencies_min: 1,
      led_agencies_mrr_min: 0,
      premium_project_limit: 5,
      commission_rate: 0.08,
      extra_discount: 0.03,
      receives_leads_premium: false,
      requires_partner: false,
      level_up_bonus_credits: 500,
      benefits: JSON.stringify([
        "Acesso ao painel de parceiros",
        "Suporte por e-mail e chat",
        "3% de desconto extra para clientes",
      ]),
      sort_order: 2,
    },
    {
      name: "Gold",
      description: "Parceiro com MRR entre R$15k e R$49,9k",
      icon: "🥇",
      color: "#FFD700",
      gradient: "from-yellow-500 to-yellow-400",
      min_mrr: 15000,
      max_mrr: 49999,
      led_agencies_min: 3,
      led_agencies_mrr_min: 5000,
      premium_project_limit: 15,
      commission_rate: 0.1,
      extra_discount: 0.05,
      receives_leads_premium: false,
      requires_partner: true,
      level_up_bonus_credits: 1500,
      benefits: JSON.stringify([
        "Acesso ao painel de parceiros",
        "Suporte prioritário",
        "5% de desconto extra para clientes",
        "Acesso a leads qualificados",
      ]),
      sort_order: 3,
    },
    {
      name: "Platinum",
      description: "Parceiro com MRR entre R$50k e R$99,9k",
      icon: "💎",
      color: "#E5E4E2",
      gradient: "from-slate-300 to-blue-200",
      min_mrr: 50000,
      max_mrr: 99999,
      led_agencies_min: 5,
      led_agencies_mrr_min: 15000,
      premium_project_limit: 30,
      commission_rate: 0.12,
      extra_discount: 0.08,
      receives_leads_premium: true,
      requires_partner: true,
      level_up_bonus_credits: 3000,
      benefits: JSON.stringify([
        "Acesso ao painel de parceiros",
        "Gerente de conta dedicado",
        "8% de desconto extra para clientes",
        "Leads premium",
        "Materiais de co-marketing",
      ]),
      sort_order: 4,
    },
    {
      name: "Diamond",
      description: "Parceiro elite com MRR acima de R$100k",
      icon: "👑",
      color: "#B9F2FF",
      gradient: "from-cyan-400 to-violet-500",
      min_mrr: 100000,
      max_mrr: null,
      led_agencies_min: 10,
      led_agencies_mrr_min: 50000,
      premium_project_limit: null,
      commission_rate: 0.15,
      extra_discount: 0.12,
      receives_leads_premium: true,
      requires_partner: true,
      level_up_bonus_credits: 10000,
      benefits: JSON.stringify([
        "Acesso ao painel de parceiros",
        "Gerente de conta dedicado",
        "12% de desconto extra para clientes",
        "Leads premium exclusivos",
        "Participação em eventos privados",
        "Co-desenvolvimento de produtos",
      ]),
      sort_order: 5,
    },
  ];

  for (const level of partnerLevels) {
    await prisma.partnerLevel.upsert({
      where: { name: level.name },
      update: level,
      create: level,
    });
    console.log(`  ✓ PartnerLevel: ${level.name}`);
  }

  console.log("\nSeeding nomade levels...");

  const nomadeLevels = [
    {
      slug: "bronze",
      name: "Bronze",
      min_score: 0,
      max_score: 199,
      color: "#CD7F32",
      icon: "🥉",
      benefits: JSON.stringify(["Acesso à plataforma", "Projetos básicos"]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "0 pts" },
        { label: "Projetos entregues", value: "0" },
      ]),
    },
    {
      slug: "silver",
      name: "Silver",
      min_score: 200,
      max_score: 499,
      color: "#C0C0C0",
      icon: "🥈",
      benefits: JSON.stringify([
        "Projetos intermediários",
        "Badge de perfil Silver",
      ]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "200 pts" },
        { label: "Projetos entregues", value: "3" },
      ]),
    },
    {
      slug: "gold",
      name: "Gold",
      min_score: 500,
      max_score: 999,
      color: "#FFD700",
      icon: "🥇",
      benefits: JSON.stringify([
        "Projetos premium",
        "Badge de perfil Gold",
        "Prioridade em alocação",
      ]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "500 pts" },
        { label: "Projetos entregues", value: "10" },
        { label: "Avaliação média", value: "≥ 4.2" },
      ]),
    },
    {
      slug: "platinum",
      name: "Platinum",
      min_score: 1000,
      max_score: 1999,
      color: "#E5E4E2",
      icon: "💎",
      benefits: JSON.stringify([
        "Acesso a projetos de alto valor",
        "Badge de perfil Platinum",
        "Mentorias exclusivas",
      ]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "1000 pts" },
        { label: "Projetos entregues", value: "25" },
        { label: "Avaliação média", value: "≥ 4.5" },
      ]),
    },
    {
      slug: "diamond",
      name: "Diamond",
      min_score: 2000,
      max_score: 4999,
      color: "#B9F2FF",
      icon: "💠",
      benefits: JSON.stringify([
        "Projetos estratégicos",
        "Badge de perfil Diamond",
        "Participação em eventos VIP",
        "Bônus de performance",
      ]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "2000 pts" },
        { label: "Projetos entregues", value: "50" },
        { label: "Avaliação média", value: "≥ 4.7" },
      ]),
    },
    {
      slug: "leader",
      name: "Leader",
      min_score: 5000,
      max_score: null,
      color: "#A61E86",
      icon: "👑",
      benefits: JSON.stringify([
        "Projetos de liderança",
        "Badge de perfil Leader",
        "Participação em eventos VIP",
        "Bônus de performance elevado",
        "Co-criação de conteúdo Allka",
      ]),
      requirements: JSON.stringify([
        { label: "Score mínimo", value: "5000 pts" },
        { label: "Projetos entregues", value: "100" },
        { label: "Avaliação média", value: "≥ 4.8" },
        { label: "Liderança", value: "Indicação por time Allka" },
      ]),
    },
  ];

  for (const level of nomadeLevels) {
    await prisma.nomadeLevel.upsert({
      where: { slug: level.slug },
      update: level,
      create: level,
    });
    console.log(`  ✓ NomadeLevel: ${level.name}`);
  }

  console.log("\n✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
