/**
 * backend/seed-habilidades.cjs
 * ============================================================
 * Seeds NomadeHabilidade and LiderArea records for test users.
 *
 * Lideres (role=lider):
 *   lider.performance@allka.test → Performance
 *   lider.design@allka.test      → Design     (se existir)
 *
 * Nomades:
 *   nomade.performance@allka.test → Performance / Gestão de Tráfego
 *   nomade.design@allka.test      → Design
 *   (+ qualquer nomade ativo existente recebe habilidade de fallback)
 *
 * Run: node seed-habilidades.cjs
 * ============================================================
 */
"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Áreas canônicas ──────────────────────────────────────────────────────────

const AREAS = [
  {
    slug: "Performance",
    categorias: ["Performance e Anúncios Patrocinados", "SEO", "Data Analytics"],
    produtos: ["Gestão de Tráfego", "SEO Orgânico", "Data Analytics"],
  },
  {
    slug: "Design",
    categorias: ["Identidade Visual", "UI/UX", "Criação Gráfica"],
    produtos: ["Logo", "Branding", "Social Media Visual"],
  },
  {
    slug: "Conteúdo",
    categorias: ["Gestão de Redes Sociais", "Copywriting", "Blog e SEO"],
    produtos: ["Social Media", "Copywriting", "Blog"],
  },
  {
    slug: "Web",
    categorias: ["Desenvolvimento Web", "E-commerce", "Landing Pages"],
    produtos: ["Site Institucional", "Loja Virtual", "Landing Page"],
  },
  {
    slug: "Audiovisual",
    categorias: ["Vídeo", "Motion", "Podcast"],
    produtos: ["Vídeo Institucional", "Reels", "Podcast"],
  },
];

// ─── Seed líderes ─────────────────────────────────────────────────────────────

async function seedLideres() {
  const lideres = await prisma.user.findMany({
    where: {
      OR: [
        { role: "lider" },
        { email: { contains: "lider" } },
      ],
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (lideres.length === 0) {
    console.log("⚠  Nenhum líder encontrado. Execute seed-test-users.cjs primeiro.");
    return;
  }

  console.log(`\n📋 Líderes encontrados: ${lideres.length}`);

  for (const lider of lideres) {
    console.log(`   - ${lider.name} <${lider.email}> [${lider.role}]`);

    // Descobrir área pelo email (sem acentos para comparação)
    let areaSlug = "Performance"; // default
    const emailNorm = lider.email.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const area of AREAS) {
      const areaNorm = area.slug.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (emailNorm.includes(areaNorm)) {
        areaSlug = area.slug;
        break;
      }
    }

    const area = AREAS.find((a) => a.slug === areaSlug) || AREAS[0];

    // Upsert LiderArea
    const existingArea = await prisma.liderArea.findFirst({
      where: { user_id: lider.id, area_nome: area.slug },
    });

    if (existingArea) {
      await prisma.liderArea.update({
        where: { id: existingArea.id },
        data: {
          categorias_permitidas: JSON.stringify(area.categorias),
          produtos_permitidos: JSON.stringify(area.produtos),
          ativo: true,
        },
      });
      console.log(`   ✏  LiderArea "${area.slug}" atualizada para ${lider.email}`);
    } else {
      await prisma.liderArea.create({
        data: {
          user_id: lider.id,
          area_nome: area.slug,
          categorias_permitidas: JSON.stringify(area.categorias),
          produtos_permitidos: JSON.stringify(area.produtos),
          ativo: true,
        },
      });
      console.log(`   ✅ LiderArea "${area.slug}" criada para ${lider.email}`);
    }
  }
}

// ─── Seed nômades ─────────────────────────────────────────────────────────────

async function seedNomades() {
  const nomades = await prisma.nomade.findMany({
    where: { status: { in: ["ativo", "aguardando_aprovacao"] } },
    select: { id: true, email: true, name: true, status: true, performance_avg_rating: true },
    take: 20,
  });

  if (nomades.length === 0) {
    console.log("⚠  Nenhum nômade encontrado.");
    return;
  }

  console.log(`\n📋 Nômades encontrados: ${nomades.length}`);

  for (const nomade of nomades) {
    console.log(`   - ${nomade.name} <${nomade.email}>`);

    // Descobrir área pelo email
    let areaSlug = "Performance"; // default
    for (const area of AREAS) {
      if (nomade.email.toLowerCase().includes(area.slug.toLowerCase())) {
        areaSlug = area.slug;
        break;
      }
    }
    // Also check "trafego" → Performance
    if (nomade.email.toLowerCase().includes("trafego") || nomade.email.toLowerCase().includes("trafégo")) {
      areaSlug = "Performance";
    }

    const area = AREAS.find((a) => a.slug === areaSlug) || AREAS[0];
    const nota = nomade.performance_avg_rating > 0 ? nomade.performance_avg_rating : 4.0;

    // Habilidade por área (mais ampla — sem produto específico)
    try {
      await prisma.nomadeHabilidade.upsert({
        where: {
          nomade_id_area_categoria_produto_modelo_tarefa_id: {
            nomade_id: nomade.id,
            area: area.slug,
            categoria_produto: area.categorias[0],
            produto_id: null,
            modelo_tarefa_id: null,
          },
        },
        update: { nota_media: nota, ativo: true, disponibilidade: "disponivel" },
        create: {
          nomade_id: nomade.id,
          area: area.slug,
          categoria_produto: area.categorias[0],
          produto_id: null,
          modelo_tarefa_id: null,
          nota_media: nota,
          disponibilidade: "disponivel",
          ativo: true,
        },
      });
      console.log(`   ✅ Habilidade "${area.slug} / ${area.categorias[0]}" — nota ${nota.toFixed(1)}`);
    } catch (err) {
      // Unique constraint with null fields may not work with upsert in SQLite
      // — use findFirst + create/update fallback
      const existing = await prisma.nomadeHabilidade.findFirst({
        where: { nomade_id: nomade.id, area: area.slug, categoria_produto: area.categorias[0] },
      });
      if (existing) {
        await prisma.nomadeHabilidade.update({
          where: { id: existing.id },
          data: { nota_media: nota, ativo: true, disponibilidade: "disponivel" },
        });
        console.log(`   ✏  Habilidade "${area.slug}" atualizada`);
      } else {
        await prisma.nomadeHabilidade.create({
          data: {
            nomade_id: nomade.id,
            area: area.slug,
            categoria_produto: area.categorias[0],
            nota_media: nota,
            disponibilidade: "disponivel",
            ativo: true,
          },
        });
        console.log(`   ✅ Habilidade "${area.slug}" criada`);
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed de habilidades...\n");

  await seedLideres();
  await seedNomades();

  console.log("\n✅ Seed concluído!\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
