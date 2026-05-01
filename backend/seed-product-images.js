// seed-product-images.js
// Populates image (cover) and demonstrations (portfolio) for all products.
// Safe to re-run: uses upsert-style update (no records deleted, only image fields updated).
// Usage: node backend/seed-product-images.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const products = [
  // ─── Performance e Anúncios Patrocinados ────────────────────────────────
  {
    id: "PA0001",
    image: "/images/products/trafego-pago.svg",
    demonstrations: [
      "/images/products/trafego-pago.svg",
      "/images/products/trafego-portfolio-01.svg",
      "/images/products/trafego-portfolio-02.svg",
      "/images/products/trafego-portfolio-03.svg",
      "/images/products/trafego-portfolio-04.svg",
    ],
  },
  {
    id: "PA0002",
    image: "/images/products/seo.svg",
    demonstrations: [
      "/images/products/seo.svg",
      "/images/products/seo-portfolio-01.svg",
      "/images/products/seo-portfolio-02.svg",
      "/images/products/seo-portfolio-03.svg",
      "/images/products/seo-portfolio-04.svg",
    ],
  },
  {
    id: "PA0003",
    image: "/images/products/google-negocios.svg",
    demonstrations: [
      "/images/products/google-negocios.svg",
      "/images/products/google-negocios-portfolio-01.svg",
      "/images/products/google-negocios-portfolio-02.svg",
      "/images/products/google-negocios-portfolio-03.svg",
    ],
  },
  {
    id: "PA0004",
    image: "/images/products/data-analytics.svg",
    demonstrations: [
      "/images/products/data-analytics.svg",
      "/images/products/data-analytics-portfolio-01.svg",
      "/images/products/data-analytics-portfolio-02.svg",
      "/images/products/data-analytics-portfolio-03.svg",
    ],
  },
  {
    id: "PA0005",
    image: "/images/products/ux-analysis.svg",
    demonstrations: [
      "/images/products/ux-analysis.svg",
      "/images/products/ux-analysis-portfolio-01.svg",
      "/images/products/ux-analysis-portfolio-02.svg",
      "/images/products/ux-analysis-portfolio-03.svg",
    ],
  },
  // ─── Design e Criação ──────────────────────────────────────────────────
  {
    id: "DC0001",
    image: "/images/products/layout-redes-sociais.svg",
    demonstrations: [
      "/images/products/layout-redes-sociais.svg",
      "/images/products/layout-redes-sociais-portfolio-01.svg",
      "/images/products/layout-redes-sociais-portfolio-02.svg",
      "/images/products/layout-redes-sociais-portfolio-03.svg",
    ],
  },
  {
    id: "DC0002",
    image: "/images/products/criativos-display.svg",
    demonstrations: [
      "/images/products/criativos-display.svg",
      "/images/products/criativos-display-portfolio-01.svg",
      "/images/products/criativos-display-portfolio-02.svg",
      "/images/products/criativos-display-portfolio-03.svg",
    ],
  },
  {
    id: "DC0003",
    image: "/images/products/tratamento-imagens.svg",
    demonstrations: [
      "/images/products/tratamento-imagens.svg",
      "/images/products/tratamento-imagens-portfolio-01.svg",
      "/images/products/tratamento-imagens-portfolio-02.svg",
      "/images/products/tratamento-imagens-portfolio-03.svg",
    ],
  },
  {
    id: "DC0004",
    image: "/images/products/papelaria.svg",
    demonstrations: [
      "/images/products/papelaria.svg",
      "/images/products/papelaria-portfolio-01.svg",
      "/images/products/papelaria-portfolio-02.svg",
      "/images/products/papelaria-portfolio-03.svg",
      "/images/products/papelaria-portfolio-04.svg",
    ],
  },
  {
    id: "DC0005",
    image: "/images/products/layout-website.svg",
    demonstrations: [
      "/images/products/layout-website.svg",
      "/images/products/layout-website-portfolio-01.svg",
      "/images/products/layout-website-portfolio-02.svg",
      "/images/products/layout-website-portfolio-03.svg",
      "/images/products/layout-website-portfolio-04.svg",
    ],
  },
  // DC0006 not in user list but fix the broken .jpg paths too
  {
    id: "DC0006",
    image: "/images/products/template-criativos.svg",
    demonstrations: [
      "/images/products/template-criativos.svg",
      "/images/products/template-criativos-portfolio-01.svg",
      "/images/products/template-criativos-portfolio-02.svg",
      "/images/products/template-criativos-portfolio-03.svg",
      "/images/products/template-criativos-portfolio-04.svg",
    ],
  },
];

async function main() {
  console.log("Updating product images and portfolios...\n");

  for (const prod of products) {
    const result = await p.product.updateMany({
      where: { id: prod.id },
      data: {
        image: prod.image,
        demonstrations: JSON.stringify(prod.demonstrations),
      },
    });

    if (result.count > 0) {
      console.log(
        `  ✓ ${prod.id} → image: ${prod.image} | portfolio: ${prod.demonstrations.length - 1} imagens`
      );
    } else {
      console.log(`  ⚠ ${prod.id} — produto não encontrado no banco`);
    }
  }

  console.log("\n✅ Imagens de produtos atualizadas com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
