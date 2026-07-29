/**
 * Fix invalid '0000-00-00' datetimes in MySQL — CLI wrapper around the
 * shared implementation in src/lib/clean-zero-datetimes.ts (a rodada normal
 * do backend já roda isso automaticamente na subida; este script é só pra
 * forçar manualmente, ex. depois de restaurar um dump).
 *
 * Run:
 *   npx tsx apps/backend/src/scripts/fix-zero-datetimes.ts
 *   # or (from apps/backend): npx tsx src/scripts/fix-zero-datetimes.ts
 */
import { PrismaClient } from "@prisma/client";
import { cleanZeroDatetimes } from "../lib/clean-zero-datetimes";

const prisma = new PrismaClient();

async function main() {
  const totalFixed = await cleanZeroDatetimes(prisma, true);
  console.log(`\n[fix-zero-datetimes] done. Total rows fixed: ${totalFixed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
