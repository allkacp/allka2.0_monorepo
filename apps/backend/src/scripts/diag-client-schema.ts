/**
 * DIAGNOSTIC SCRIPT — READ ONLY — confirma estrutura das tabelas clients/client_links.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  console.log("── Tabelas existem? ──────────────────────────────────");
  const tables = await prisma.$queryRawUnsafe<any[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('clients','client_links')`,
  );
  console.log(tables);

  console.log("\n── Coluna sequence_number (clients) ──────────────────");
  const seq = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COLUMN_NAME, COLUMN_TYPE, EXTRA, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'sequence_number'`,
  );
  console.log(seq);

  console.log("\n── Unique index em document (clients) ────────────────");
  const docIdx = await prisma.$queryRawUnsafe<any[]>(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'document'`,
  );
  console.log(docIdx);

  console.log("\n── FKs de client_links ────────────────────────────────");
  const fks = await prisma.$queryRawUnsafe<any[]>(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_links' AND REFERENCED_TABLE_NAME IS NOT NULL`,
  );
  console.log(fks);

  console.log("\n✅ Diagnóstico finalizado. Nenhum dado foi alterado.");
}

main()
  .catch((e) => { console.error("❌ Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
