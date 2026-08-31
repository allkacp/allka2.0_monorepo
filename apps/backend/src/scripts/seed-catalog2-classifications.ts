/**
 * Seed EXPLÍCITO das classificações dinâmicas do novo catálogo (bloco 3/6).
 *
 *   npm run catalog2:seed-classifications
 *
 * Substitui o `ensureCatalog2Foundation()` que rodava no boot. Idempotente.
 * Recusa host remoto (QA/produção) via assertLocalDatabase.
 */
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { seedCatalog2Classifications } from "../lib/catalog2-classifications-seed";

async function main() {
  const { host, database } = assertLocalDatabase(process.env.DATABASE_URL);
  console.log(`▶ Seed de classificações do novo catálogo em ${host}/${database}`);
  const db = new PrismaClient();
  try {
    const r = await seedCatalog2Classifications(db);
    console.log(`✅ pilares: ${r.pillars} · categorias: ${r.categories} · especialidades: ${r.specialties}`);
    console.log("(As 4 fases 4Fs são estruturais e vêm da migration — não deste seed.)");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
