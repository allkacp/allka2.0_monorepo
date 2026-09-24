/**
 * publish-demo-catalog2-product.ts — publica o produto de teste
 * "[TESTE LOCAL] Serviço Demo do Catálogo" pra ele aparecer no catálogo do
 * cliente (status "disponivel") — pedido do usuário durante o teste do
 * fluxo principal (2026-09-25), pra poder testar o checkout sem esperar os
 * 36 produtos reais (ainda "em_preparacao", de verdade em preparação pela
 * equipe, isso não é bug). Só mexe nesta ÚNICA fixture — nenhum produto
 * real é tocado. Usa exatamente a mesma função de serviço que a rota admin
 * PATCH /api/admin/catalog2/products/:id/status usa de verdade.
 *
 *   npx tsx src/scripts/publish-demo-catalog2-product.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { setProductStatus } from "../lib/catalog2-service";
import { recordCatalog2ProductHistory } from "../lib/catalog2-product-history";

const prisma = new PrismaClient();
const PRODUCT_ID = "cmthrr7i6000imtna6l1ue9uq"; // [TESTE LOCAL] Serviço Demo do Catálogo
const ADMIN_MASTER_ID = "cmormdvqj00005p7xiyt3mcrp"; // cp@lamego.com.vc

async function main() {
  const { host, database } = assertLocalDatabase(process.env.DATABASE_URL);
  console.log(`Banco confirmado: host="${host}" database="${database}"`);

  const before = await prisma.catalog2Product.findUnique({
    where: { id: PRODUCT_ID },
    select: { internal_name: true, status: true, published_version_id: true, last_known_commercially_ready: true },
  });
  if (!before) throw new Error("Produto de teste não encontrado — id mudou?");
  console.log("Antes:", before);

  const updated = await prisma.$transaction(async (tx) => {
    const u = await setProductStatus(PRODUCT_ID, "disponivel", tx);
    await recordCatalog2ProductHistory(tx, {
      productId: u.id,
      eventType: "status_changed",
      description: `Status alterado de "${before.status}" para "disponivel" (script de teste, pedido do usuário).`,
      before: { status: before.status },
      after: { status: u.status },
      actorUserId: ADMIN_MASTER_ID,
    });
    return u;
  });

  console.log("Depois:", { status: updated.status });
  console.log("\nProduto de teste agora visível no catálogo do cliente.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
