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

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

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
