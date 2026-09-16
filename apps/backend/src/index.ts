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
import { runTaskReleaseSchedulerOnceGuarded } from "./lib/task-release-scheduler";
import { runCommsSchedulerOnceGuarded } from "./lib/comms";
import { runCatalog2InactivationSchedulerOnceGuarded } from "./lib/catalog2-inactivation-scheduler";
import { runCatalog2DeliveryCycleSchedulerOnceGuarded } from "./lib/catalog2-delivery-cycle-scheduler";
import { runCatalog2ActivationNotificationSchedulerOnceGuarded } from "./lib/catalog2-activation-notification-scheduler";
import { getCatalog2HistoryCoverageMarker } from "./lib/catalog2-product-history";

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
  // (bloco 3/6, correção 1.2) O novo catálogo NÃO é semeado no boot. As
  // classificações dinâmicas vêm de `npm run catalog2:seed-classifications`
  // (comando explícito, idempotente, recusa host remoto); as 4 fases 4Fs
  // vêm da migration. O backend inicia sem tocar em dados do catálogo.

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

  // Worker de gatilho por data programada (bloco 4/4, IA de Lançamento) —
  // mecanismo DURÁVEL do servidor (nunca timer só em memória): reavalia
  // gatilhos vencidos direto do banco a cada tick, então atraso/reinício do
  // servidor nunca perde a liberação. Mesmo padrão dos motores acima.
  setInterval(() => {
    runTaskReleaseSchedulerOnceGuarded().catch((err) =>
      console.error("❌ Falha no worker de liberação por data programada:", err),
    );
  }, config.TASK_RELEASE_SCHEDULER_INTERVAL_MS).unref();
  console.log(`📅 Worker de liberação por data programada ativo (intervalo: ${config.TASK_RELEASE_SCHEDULER_INTERVAL_MS}ms).`);

  // Motor de comunicação (ata 2026-08, bloco 5/5) — ativa campanhas/banners
  // agendados, cria as entregas idempotentes em lote e processa a outbox.
  // Não depende de nenhuma página aberta no navegador. Mesmo padrão dos
  // motores acima: registrado só aqui, naturalmente desligado nos testes.
  setInterval(() => {
    runCommsSchedulerOnceGuarded().catch((err) =>
      console.error("❌ Falha na varredura do motor de comunicação:", err),
    );
  }, config.COMMS_SCHEDULER_INTERVAL_MS).unref();
  console.log(`📣 Motor de comunicação ativo (intervalo: ${config.COMMS_SCHEDULER_INTERVAL_MS}ms).`);

  // Worker de inativação programada de produtos do catalog2 (Item 5,
  // reunião 2026-09-14) — efetiva o status "arquivado" quando a data
  // programada chega, reaproveitando o MESMO padrão durável dos motores
  // acima. O bloqueio de contratação em si nunca depende deste worker ter
  // rodado (ver checkClientVisibility) — ele só formaliza o status e envia
  // o aviso de encerramento.
  setInterval(() => {
    runCatalog2InactivationSchedulerOnceGuarded().catch((err) =>
      console.error("❌ Falha no worker de inativação programada do catálogo:", err),
    );
  }, config.CATALOG2_INACTIVATION_SCHEDULER_INTERVAL_MS).unref();
  console.log(`🗄️  Worker de inativação programada do catálogo ativo (intervalo: ${config.CATALOG2_INACTIVATION_SCHEDULER_INTERVAL_MS}ms).`);

  // Worker de ciclos de entrega mensal do catalog2 (Item 6.1, reunião
  // 2026-09-14) — libera (gera tarefas de) cada ciclo de um contrato de
  // período pago quando sua data prevista chega. Mesmo padrão durável dos
  // motores acima; nunca cria cobrança/pagamento novo.
  setInterval(() => {
    runCatalog2DeliveryCycleSchedulerOnceGuarded().catch((err) =>
      console.error("❌ Falha no worker de ciclos de entrega do catálogo:", err),
    );
  }, config.CATALOG2_DELIVERY_CYCLE_SCHEDULER_INTERVAL_MS).unref();
  console.log(`📦 Worker de ciclos de entrega do catálogo ativo (intervalo: ${config.CATALOG2_DELIVERY_CYCLE_SCHEDULER_INTERVAL_MS}ms).`);

  // Worker de aviso de ativação do catalog2 (Item 8, reunião 2026-09-14) —
  // envia (em lote) o aviso "produto disponível" pra toda a plataforma
  // quando uma transição real de status registrou a intenção — mesmo
  // padrão durável dos motores acima; a mudança de status em si nunca
  // espera este worker (a intenção já foi persistida junto da alteração).
  setInterval(() => {
    runCatalog2ActivationNotificationSchedulerOnceGuarded().catch((err) =>
      console.error("❌ Falha no worker de aviso de ativação do catálogo:", err),
    );
  }, config.CATALOG2_ACTIVATION_NOTIFICATION_SCHEDULER_INTERVAL_MS).unref();
  console.log(`📢 Worker de aviso de ativação do catálogo ativo (intervalo: ${config.CATALOG2_ACTIVATION_NOTIFICATION_SCHEDULER_INTERVAL_MS}ms).`);

  // Item 7.1 (reunião 2026-09-14, "Fechar a integridade do histórico"):
  // aquece o marco persistido de cobertura completa do histórico do
  // catalog2 — cria (só na 1ª vez, em cada ambiente) ou apenas lê o já
  // existente. Nunca bloqueia o boot do servidor por causa disto.
  getCatalog2HistoryCoverageMarker().catch((err) =>
    console.error("❌ Falha ao aquecer o marco de cobertura do histórico do catálogo:", err),
  );

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
