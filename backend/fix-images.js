// fix-images.js — Corrige imagens de PA0001 (Gestão de Tráfego) e SE0001 (SEO)
// Idempotente: pode ser executado múltiplas vezes sem efeito colateral.
// Uso: node backend/fix-images.js
//
// Problema corrigido:
//   PA0001 — image: NULL → /images/products/trafego-pago.svg + demonstrations
//   SE0001 — image: base64 (blob antigo) → /images/products/seo.svg + demonstrations
// @ts-nocheck
"use strict";

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  console.log("🔧 Iniciando correção de imagens de produtos...\n");

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PA0001 — Gestão de Tráfego
  // ──────────────────────────────────────────────────────────────────────────
  const pa0001 = await p.product.findUnique({ where: { id: "PA0001" } });
  if (!pa0001) {
    console.log("⚠  PA0001 não encontrado no banco — pulando.");
  } else {
    const demonstrations = JSON.stringify([
      "/images/products/trafego-pago.svg",
      "/images/products/trafego-portfolio-01.svg",
      "/images/products/trafego-portfolio-02.svg",
      "/images/products/trafego-portfolio-03.svg",
      "/images/products/trafego-portfolio-04.svg",
    ]);

    // Atualiza metadata para incluir portfolioImages se o metadata atual não tiver
    let updatedMeta = pa0001.metadata;
    if (updatedMeta) {
      try {
        const metaObj = JSON.parse(updatedMeta);
        if (!metaObj.portfolioImages || metaObj.portfolioImages.length === 0) {
          metaObj.portfolioImages = [
            { id: "tp-img-01", url: "/images/products/trafego-pago.svg", title: "Visão Geral", isMain: true, sortOrder: 0 },
            { id: "tp-img-02", url: "/images/products/trafego-portfolio-01.svg", title: "Portfolio 1", isMain: false, sortOrder: 1 },
            { id: "tp-img-03", url: "/images/products/trafego-portfolio-02.svg", title: "Portfolio 2", isMain: false, sortOrder: 2 },
            { id: "tp-img-04", url: "/images/products/trafego-portfolio-03.svg", title: "Portfolio 3", isMain: false, sortOrder: 3 },
            { id: "tp-img-05", url: "/images/products/trafego-portfolio-04.svg", title: "Portfolio 4", isMain: false, sortOrder: 4 },
          ];
          updatedMeta = JSON.stringify(metaObj);
        }
      } catch (_) {
        // metadata inválido — manter como está
      }
    }

    await p.product.update({
      where: { id: "PA0001" },
      data: {
        image: "/images/products/trafego-pago.svg",
        demonstrations,
        ...(updatedMeta !== pa0001.metadata ? { metadata: updatedMeta } : {}),
        updated_at: new Date(),
      },
    });
    console.log("✅ PA0001 (Gestão de Tráfego) corrigido:");
    console.log("   image → /images/products/trafego-pago.svg");
    console.log("   demonstrations → 5 imagens (cover + 4 portfolio)\n");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SE0001 — SEO
  // ──────────────────────────────────────────────────────────────────────────
  const se0001 = await p.product.findUnique({ where: { id: "SE0001" } });
  if (!se0001) {
    console.log("⚠  SE0001 não encontrado no banco — pulando.");
  } else {
    const demonstrations = JSON.stringify([
      "/images/products/seo.svg",
      "/images/products/seo-portfolio-01.svg",
      "/images/products/seo-portfolio-02.svg",
      "/images/products/seo-portfolio-03.svg",
      "/images/products/seo-portfolio-04.svg",
    ]);

    let updatedMeta = se0001.metadata;
    if (updatedMeta) {
      try {
        const metaObj = JSON.parse(updatedMeta);
        if (!metaObj.portfolioImages || metaObj.portfolioImages.length === 0) {
          metaObj.portfolioImages = [
            { id: "seo-img-01", url: "/images/products/seo.svg", title: "Visão Geral", isMain: true, sortOrder: 0 },
            { id: "seo-img-02", url: "/images/products/seo-portfolio-01.svg", title: "Portfolio 1", isMain: false, sortOrder: 1 },
            { id: "seo-img-03", url: "/images/products/seo-portfolio-02.svg", title: "Portfolio 2", isMain: false, sortOrder: 2 },
            { id: "seo-img-04", url: "/images/products/seo-portfolio-03.svg", title: "Portfolio 3", isMain: false, sortOrder: 3 },
            { id: "seo-img-05", url: "/images/products/seo-portfolio-04.svg", title: "Portfolio 4", isMain: false, sortOrder: 4 },
          ];
          updatedMeta = JSON.stringify(metaObj);
        }
      } catch (_) {
        // metadata inválido — manter como está
      }
    }

    await p.product.update({
      where: { id: "SE0001" },
      data: {
        image: "/images/products/seo.svg",
        demonstrations,
        ...(updatedMeta !== se0001.metadata ? { metadata: updatedMeta } : {}),
        updated_at: new Date(),
      },
    });
    console.log("✅ SE0001 (SEO) corrigido:");
    console.log("   image → /images/products/seo.svg (substituída base64)");
    console.log("   demonstrations → 5 imagens (cover + 4 portfolio)\n");
  }

  console.log("✅ Correção de imagens concluída!");
  console.log("   Próximos passos:");
  console.log("   1. Fazer backup de dev.db");
  console.log("   2. Rodar seed DC0004:  node backend/seed-product-DC0004.js");
  console.log("   3. Upload do dev.db atualizado para o servidor");
}

main()
  .catch((e) => {
    console.error("❌ Erro na correção de imagens:", e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
