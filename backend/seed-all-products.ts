/**
 * seed-all-products.ts
 * Restaura TODOS os produtos reais da plataforma na base de dados.
 *
 * ─ O que faz:
 *   1. Lê o array mockProducts (fonte única de verdade para os dados de produto)
 *   2. Faz upsert de cada produto, variação e addon
 *   3. Corrige o produto SE0001 → PA0002 (ID errado + encoding corrompido)
 *   4. Idempotente: pode ser executado múltiplas vezes sem duplicar dados
 *
 * ─ Uso:
 *   cd backend && npx tsx seed-all-products.ts
 */

import { PrismaClient } from "@prisma/client";
import { mockProducts } from "../dev-mocks/data/products";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando restauração de produtos reais...\n");

  // ── 1. Corrigir SE0001 → PA0002 ─────────────────────────────────────────
  // O produto SEO foi inserido com ID errado "SE0001" e encoding corrompido.
  // Apagar para que o upsert crie o produto com ID correto "PA0002".
  const se0001 = await prisma.product.findUnique({ where: { id: "SE0001" } });
  if (se0001) {
    // Deletar variações/addons primeiro (FK)
    await prisma.productVariation.deleteMany({
      where: { product_id: "SE0001" },
    });
    await prisma.productAddon.deleteMany({ where: { product_id: "SE0001" } });
    await prisma.product.delete({ where: { id: "SE0001" } });
    console.log("🗑  Removido produto com ID incorreto: SE0001 (SEO)");
  }

  // ── 2. Upsert de todos os produtos ──────────────────────────────────────
  let created = 0;
  let updated = 0;

  for (const mp of mockProducts) {
    const { variations = [], addons = [], ...productData } = mp as any;

    // Campos mapeados para o schema Prisma
    const data = {
      name: productData.name,
      description: productData.description ?? null,
      short_description: productData.short_description ?? null,
      category: productData.category,
      tags: productData.tags ?? null,
      base_price: productData.base_price ?? 0,
      complexity: productData.complexity ?? "basic",
      visibility: productData.visibility ?? null,
      image: productData.image ?? null,
      demonstrations: productData.demonstrations ?? null,
      completion_time: productData.completion_time ?? null,
      metadata: productData.metadata ?? null,
      is_active: productData.is_active ?? true,
      created_at: new Date(productData.created_at ?? Date.now()),
      updated_at: new Date(productData.updated_at ?? Date.now()),
    };

    const existing = await prisma.product.findUnique({
      where: { id: productData.id },
    });

    if (existing) {
      // Atualizar produto existente
      await prisma.product.update({ where: { id: productData.id }, data });

      // Limpar e recriar variações
      await prisma.productVariation.deleteMany({
        where: { product_id: productData.id },
      });
      await prisma.productAddon.deleteMany({
        where: { product_id: productData.id },
      });
      updated++;
    } else {
      await prisma.product.create({ data: { id: productData.id, ...data } });
      created++;
    }

    // Recriar variações
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      await prisma.productVariation.create({
        data: {
          id: v.id,
          product_id: productData.id,
          name: v.name,
          description: v.description ?? null,
          price: v.price ?? 0,
          price_modifier: v.price_modifier ?? 0,
          deadline_days: v.deadline_days ?? null,
          scope_description: v.scope_description ?? null,
          features: v.features ?? null,
          sort_order: v.sort_order ?? i + 1,
          is_active: v.is_active ?? true,
        },
      });
    }

    // Recriar addons
    for (const a of addons) {
      await prisma.productAddon.create({
        data: {
          id: a.id,
          product_id: productData.id,
          name: a.name,
          description: a.description ?? null,
          price: a.price ?? 0,
          category: a.category ?? null,
        },
      });
    }

    console.log(`  ✅ ${productData.id} — ${productData.name}`);
  }

  console.log(`\n✨ Concluído!`);
  console.log(`   Criados : ${created}`);
  console.log(`   Atualizados: ${updated}`);

  // ── 3. Resumo final ──────────────────────────────────────────────────────
  const total = await prisma.product.count();
  const active = await prisma.product.count({ where: { is_active: true } });
  console.log(`\n📦 Produtos no banco: ${total} total (${active} ativos)`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
