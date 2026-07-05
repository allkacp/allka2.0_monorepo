// One-off fix: every real Specialty row had description=NULL and
// required_skills=NULL, so admin/especialidades' Descrição column and the
// edit form's "Habilidades Necessárias" field always showed "—"/empty for
// all 10 real specialties. Fills in real, specific content per specialty
// instead of a generic placeholder. Safe to re-run — only touches rows that
// are still missing this data.
import { prisma } from "../lib/prisma";

const CONTENT: Record<string, { description: string; required_skills: string }> = {
  "Consultoria Estratégica": {
    description:
      "Planejamento estratégico de marketing e negócios, análise de mercado, definição de posicionamento e metas de crescimento para clientes.",
    required_skills: "Análise de mercado, Planejamento estratégico, OKRs, Apresentações executivas",
  },
  "Copywriting": {
    description:
      "Criação de textos persuasivos para anúncios, landing pages, e-mails e redes sociais, com foco em conversão e voz de marca.",
    required_skills: "Redação publicitária, SEO on-page, Storytelling, Revisão gramatical",
  },
  "Design Gráfico": {
    description:
      "Criação de peças visuais para campanhas, identidade visual, materiais impressos e digitais, seguindo o manual de marca do cliente.",
    required_skills: "Adobe Illustrator, Adobe Photoshop, InDesign, Tipografia",
  },
  "E-commerce": {
    description:
      "Configuração, manutenção e otimização de lojas virtuais em plataformas como Shopify, VTEX e WooCommerce, incluindo integrações de pagamento e frete.",
    required_skills: "Shopify, WooCommerce, Integrações de pagamento, Gestão de catálogo",
  },
  "Fotografia Profissional": {
    description:
      "Produção de fotos de produtos, eventos e conteúdo institucional para uso em campanhas digitais e materiais impressos.",
    required_skills: "Fotografia de produto, Iluminação de estúdio, Lightroom, Direção de cena",
  },
  "SEO / Tráfego Pago": {
    description:
      "Otimização de sites para mecanismos de busca e gestão de campanhas de mídia paga no Google Ads e Meta Ads, com foco em ROI.",
    required_skills: "Google Ads, Meta Ads, Google Analytics, SEO técnico",
  },
  "Social Media": {
    description:
      "Planejamento e execução de calendário editorial, criação de conteúdo e gestão de comunidade nas redes sociais do cliente.",
    required_skills: "Planejamento de conteúdo, Copywriting para redes, Métricas de engajamento, Canva",
  },
  "UI/UX Design": {
    description:
      "Design de interfaces e experiência do usuário para sites e aplicativos, incluindo pesquisa com usuários, wireframes e protótipos navegáveis.",
    required_skills: "Figma, Pesquisa com usuários, Prototipagem, Design system",
  },
  "Produção de Vídeo": {
    description:
      "Roteirização, filmagem e edição de vídeos institucionais, publicitários e para redes sociais, incluindo motion graphics.",
    required_skills: "Adobe Premiere, After Effects, Roteirização, Captação de imagem",
  },
  "Desenvolvimento Web": {
    description:
      "Desenvolvimento e manutenção de sites, landing pages e sistemas web personalizados, com foco em performance e responsividade.",
    required_skills: "React, Node.js, HTML/CSS, Performance web",
  },
};

async function main() {
  const specialties = await prisma.specialty.findMany();
  let updated = 0;
  for (const sp of specialties) {
    const content = CONTENT[sp.name];
    if (!content) continue;
    if (sp.description && sp.required_skills) continue; // already filled in
    await prisma.specialty.update({
      where: { id: sp.id },
      data: {
        description: sp.description || content.description,
        required_skills: sp.required_skills || content.required_skills,
      },
    });
    updated++;
  }
  console.log(`Updated ${updated} of ${specialties.length} specialties with real description/required_skills.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
