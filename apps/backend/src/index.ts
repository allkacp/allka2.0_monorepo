import { config } from "./config";
import app from "./app";
import { prisma } from "./lib/prisma";

// Mascara a URL do banco: mantém apenas o caminho do arquivo, omite credenciais
function maskDatabaseUrl(url: string): string {
  try {
    // SQLite: "file:./dev.db" — mostra o caminho, sem segredos
    if (url.startsWith("file:")) return url;
    // Postgres/MySQL: oculta usuário:senha
    const parsed = new URL(url);
    parsed.password = parsed.password ? "***" : "";
    parsed.username = parsed.username ? "***" : "";
    return parsed.toString();
  } catch {
    return "(URL inválida)";
  }
}

async function logStartupState(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "(não definido)";
  const maskedUrl = maskDatabaseUrl(dbUrl);
  const dbType = dbUrl.startsWith("file:") ? "SQLite" : dbUrl.startsWith("postgresql") ? "PostgreSQL" : dbUrl.startsWith("mysql") ? "MySQL" : "desconhecido";

  const [products, projects, catalogTasks, projectTasks] = await Promise.all([
    prisma.product.count(),
    prisma.project.count(),
    prisma.catalogTask.count(),
    prisma.projectTask.count(),
  ]);

  console.log("─────────────────────────────────────────────");
  console.log(`  NODE_ENV       : ${process.env.NODE_ENV ?? "development"}`);
  console.log(`  Banco          : ${dbType}`);
  console.log(`  DATABASE_URL   : ${maskedUrl}`);
  console.log("  ── Dados cadastrados ──");
  console.log(`  Produtos       : ${products}`);
  console.log(`  Projetos       : ${projects}`);
  console.log(`  Modelos tarefas: ${catalogTasks}`);
  console.log(`  Tarefas operat.: ${projectTasks}`);

  if (products === 0) {
    console.warn("  ⚠️  ATENÇÃO: Nenhum produto no banco.");
    console.warn("     Execute: cd apps/backend && npx tsx seed-all-products.ts");
  }
  if (catalogTasks === 0) {
    console.warn("  ⚠️  ATENÇÃO: Nenhum modelo de tarefa no banco.");
    console.warn("     Execute: cd apps/backend && npx tsx migrate-tasks.ts");
  }
  if (projectTasks === 0 && projects > 0) {
    console.warn("  ⚠️  ATENÇÃO: Projetos sem tarefas operacionais.");
    console.warn("     Execute: cd apps/backend && node seed-in-progress.cjs");
  }
  console.log("─────────────────────────────────────────────");
}

async function cleanZeroDatetimesIfMySQL(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.startsWith("mysql")) return;
  try {
    await prisma.$executeRawUnsafe(
      "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
    );
    const dbRows = await prisma.$queryRawUnsafe<{ db: string }[]>(
      "SELECT DATABASE() AS db",
    );
    const dbName = dbRows[0]?.db;
    if (!dbName) return;
    const cols = await prisma.$queryRawUnsafe<
      { TABLE_NAME: string; COLUMN_NAME: string; IS_NULLABLE: string }[]
    >(
      `SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = ?
          AND DATA_TYPE IN ('datetime','timestamp','date')`,
      dbName,
    );
    let fixed = 0;
    for (const c of cols) {
      const replacement =
        c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
      try {
        const affected = await prisma.$executeRawUnsafe(
          `UPDATE \`${c.TABLE_NAME}\` SET \`${c.COLUMN_NAME}\` = ${replacement}
            WHERE \`${c.COLUMN_NAME}\` = '0000-00-00 00:00:00'
               OR \`${c.COLUMN_NAME}\` = '0000-00-00'`,
        );
        if (affected > 0) {
          fixed += affected;
          console.log(
            `  🧹 zero-date fix: ${c.TABLE_NAME}.${c.COLUMN_NAME} → ${affected} row(s)`,
          );
        }
      } catch {
        // ignore individual column errors
      }
    }
    if (fixed > 0)
      console.log(`✅ Auto-cleanup de zero-dates concluído (${fixed} linhas).`);
  } catch (err) {
    console.warn(
      "⚠️  Auto-cleanup de zero-dates falhou (ignorando):",
      (err as Error).message,
    );
  }
}

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  // Auto-fix invalid '0000-00-00' datetimes (MySQL only) — they crash Prisma queries
  await cleanZeroDatetimesIfMySQL();

  await logStartupState();

  // Passenger/cPanel sets PORT as a socket path or port number
  // Use process.env.PORT directly to support both TCP and Unix socket
  const port = process.env.PORT || config.PORT;

  app.listen(port, () => {
    console.log(`🚀 Servidor Allka rodando na porta/socket: ${port}`);
    console.log(`   Ambiente: ${config.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error("❌ Falha ao iniciar o servidor:", err);
  process.exit(1);
});
