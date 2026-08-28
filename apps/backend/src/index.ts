import cron from "node-cron";
import { config } from "./config";
import app from "./app";
import { prisma } from "./lib/prisma";
import { cleanZeroDatetimes } from "./lib/clean-zero-datetimes";
import { ensureDefaultKnowledgeCategories } from "./lib/ai-knowledge-base";
import { ensureDefaultAIServices } from "./lib/ai-usage-tracker";
import { isMetaIntegrationConfigured } from "./lib/meta-ads-client";
import { runDailySyncForAllConnections } from "./lib/meta-ads-sync";
import { ensureDefaultAlertStandardsAndRules, runAlertEngineOnceGuarded } from "./lib/alert-engine";
import { runTaskRotationOnceGuarded } from "./lib/task-rotation-engine";

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
    console.warn("     Execute: cd apps/backend && npx tsx src/scripts/seed-in-progress.ts");
  }
  console.log("─────────────────────────────────────────────");
}

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  // Auto-fix invalid '0000-00-00' datetimes (MySQL only) — they crash Prisma queries
  await cleanZeroDatetimes(prisma, true);

  // Cria as categorias padrão da Base de Conhecimento IA (briefing/produtos/
  // nômades-agências) e migra os PDFs que já existiam em instrucoesAI/ pra
  // dentro da categoria "briefing", na primeira vez — idempotente.
  await ensureDefaultKnowledgeCategories();
  // Registro de custo de IA (AIServiceConfig "gemini" + preço de partida dos
  // modelos) — ver Configurações > Uso e Custos de IA.
  await ensureDefaultAIServices();
  // Padrões/Regras obrigatórios da Central de Alertas (tarefa próxima do
  // prazo / tarefa atrasada) — idempotente por `key`, ver alert-engine.ts.
  await ensureDefaultAlertStandardsAndRules();

  await logStartupState();

  // Sincronização diária de métricas das Conexões do projeto (Meta Ads por
  // enquanto) — 03:15, dá tempo do próprio pipeline de dados da Meta
  // assentar "ontem" antes da gente puxar. Nunca impede o boot se a
  // integração não estiver configurada.
  if (isMetaIntegrationConfigured()) {
    cron.schedule("15 3 * * *", () => {
      runDailySyncForAllConnections().catch((err) =>
        console.error("❌ Falha na sincronização diária Meta Ads:", err),
      );
    });
    console.log("🔄 Sincronização diária Meta Ads agendada (03:15).");
  } else {
    console.log("ℹ️  Integração Meta Ads não configurada — sincronização diária desativada.");
  }

  // Motor de alertas automáticos (tarefa próxima do prazo/atrasada) — varre
  // em intervalo fixo, configurável via ALERT_ENGINE_INTERVAL_MS (padrão
  // 5 min). Registrado só aqui — nunca em módulo importado pelos testes —
  // pra ficar naturalmente desligado em test:* sem precisar de guarda por
  // NODE_ENV (mesmo raciocínio do cron do Meta Ads acima).
  setInterval(() => {
    runAlertEngineOnceGuarded().catch((err) =>
      console.error("❌ Falha na varredura do motor de alertas:", err),
    );
  }, config.ALERT_ENGINE_INTERVAL_MS).unref();
  console.log(`🔔 Motor de alertas automáticos ativo (intervalo: ${config.ALERT_ENGINE_INTERVAL_MS}ms).`);

  // Motor do rodízio de ofertas de tarefa (ata 2026-08, bloco 4/5) — expira
  // ofertas vencidas e avança para o próximo Nômade / escala. Mesmo padrão
  // do motor de alertas: registrado só aqui, naturalmente desligado nos
  // testes. Não exige que ninguém mantenha uma tela aberta.
  setInterval(() => {
    runTaskRotationOnceGuarded().catch((err) =>
      console.error("❌ Falha na varredura do rodízio de tarefas:", err),
    );
  }, config.TASK_ROTATION_INTERVAL_MS).unref();
  console.log(`🔁 Motor do rodízio de tarefas ativo (intervalo: ${config.TASK_ROTATION_INTERVAL_MS}ms).`);

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
