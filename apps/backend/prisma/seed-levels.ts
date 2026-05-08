import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const levels = [
  {
    name: "Bronze",
    description: "Nível inicial do Programa Partner — MRR próprio até R$ 1.000",
    icon: "🥉",
    color: "#CD7F32",
    gradient: "from-amber-600 to-orange-700",
    min_mrr: 0,
    max_mrr: 1000,
    led_agencies_min: 0,
    led_agencies_mrr_min: 0,
    premium_project_limit: null,
    commission_rate: 0,
    extra_discount: 10,
    receives_leads_premium: false,
    requires_partner: true,
    level_up_bonus_credits: 0,
    benefits: JSON.stringify([
      "Desconto adicional de 10% em todas as contratações",
      "Acesso ao portal Partner",
      "Material de marketing exclusivo",
      "Acesso a treinamentos e eventos com founders",
      "Bônus em créditos por indicações ativas",
    ]),
    sort_order: 1,
  },
  {
    name: "Silver",
    description: "MRR próprio de R$ 1.001 a R$ 2.000 — líder de até 5 agências",
    icon: "🥈",
    color: "#C0C0C0",
    gradient: "from-slate-400 to-slate-600",
    min_mrr: 1001,
    max_mrr: 2000,
    led_agencies_min: 5,
    led_agencies_mrr_min: 2500,
    premium_project_limit: 1500,
    commission_rate: 5,
    extra_discount: 10,
    receives_leads_premium: true,
    requires_partner: true,
    level_up_bonus_credits: 0,
    benefits: JSON.stringify([
      "Desconto adicional de 10% em todas as contratações",
      "Comissão de 5% sobre MRR das agências lideradas",
      "Leads premium (projetos até R$ 1.500)",
      "Comissão de 30% sobre projetos premium",
      "Acesso prioritário a funcionalidades e treinamentos",
    ]),
    sort_order: 2,
  },
  {
    name: "Gold",
    description: "MRR próprio de R$ 2.001 a R$ 4.000 — líder de até 10 agências",
    icon: "🥇",
    color: "#FFD700",
    gradient: "from-yellow-400 to-amber-600",
    min_mrr: 2001,
    max_mrr: 4000,
    led_agencies_min: 10,
    led_agencies_mrr_min: 5000,
    premium_project_limit: 3000,
    commission_rate: 5,
    extra_discount: 10,
    receives_leads_premium: true,
    requires_partner: true,
    level_up_bonus_credits: 0,
    benefits: JSON.stringify([
      "Desconto adicional de 10% em todas as contratações",
      "Comissão de 5% sobre MRR das agências lideradas",
      "Leads premium (projetos até R$ 3.000)",
      "Comissão de 30% sobre projetos premium",
      "Reunião trimestral com founders",
      "Reconhecimento público na plataforma",
    ]),
    sort_order: 3,
  },
  {
    name: "Platinum",
    description: "MRR próprio de R$ 4.001 a R$ 8.000 — líder de até 20 agências",
    icon: "🏆",
    color: "#E5E4E2",
    gradient: "from-slate-300 to-slate-500",
    min_mrr: 4001,
    max_mrr: 8000,
    led_agencies_min: 20,
    led_agencies_mrr_min: 10000,
    premium_project_limit: 6000,
    commission_rate: 5,
    extra_discount: 10,
    receives_leads_premium: true,
    requires_partner: true,
    level_up_bonus_credits: 0,
    benefits: JSON.stringify([
      "Desconto adicional de 10% em todas as contratações",
      "Comissão de 5% sobre MRR das agências lideradas",
      "Leads premium (projetos até R$ 6.000)",
      "Comissão de 30% sobre projetos premium",
      "Reunião trimestral com founders (obrigatória)",
      "Prioridade em redistribuição de agências",
    ]),
    sort_order: 4,
  },
  {
    name: "Diamond",
    description: "MRR próprio acima de R$ 8.000 — líder de 40+ agências",
    icon: "💎",
    color: "#B9F2FF",
    gradient: "from-cyan-400 to-blue-600",
    min_mrr: 8001,
    max_mrr: null,
    led_agencies_min: 40,
    led_agencies_mrr_min: 20000,
    premium_project_limit: null,
    commission_rate: 5,
    extra_discount: 10,
    receives_leads_premium: true,
    requires_partner: true,
    level_up_bonus_credits: 0,
    benefits: JSON.stringify([
      "Desconto adicional de 10% em todas as contratações",
      "Comissão de 5% sobre MRR das agências lideradas",
      "Leads premium ilimitados (sem limite de valor)",
      "Comissão de 30% sobre projetos premium",
      "Reunião trimestral com founders (obrigatória)",
      "Acesso ao Conselho Allka Partners",
      "Avaliação por semáforo — influência em realocações estratégicas",
    ]),
    sort_order: 5,
  },
];

async function main() {
  // Remove levels that no longer exist in the official list
  const officialNames = levels.map((l) => l.name);
  const deleted = await prisma.partnerLevel.deleteMany({
    where: { name: { notIn: officialNames } },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} obsolete level(s).`);
  }

  for (const level of levels) {
    const result = await prisma.partnerLevel.upsert({
      where: { name: level.name },
      update: level,
      create: level,
    });
    console.log(`✓ ${result.name} (id: ${result.id})`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
