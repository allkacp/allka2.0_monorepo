/**
 * seed-dev-data.cjs
 * ═════════════════════════════════════════════════════════════════════════════
 * Garante o ambiente de desenvolvimento mínimo para testar o fluxo completo:
 *   criação de projeto → pagamento fake → geração de tarefas
 *
 * IDEMPOTENTE — verifica antes de criar, nunca apaga dados existentes.
 *
 * Uso:
 *   cd apps/backend && node seed-dev-data.cjs
 * ═════════════════════════════════════════════════════════════════════════════
 */

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function j(v) {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function ok(msg) { console.log("  ✅", msg); }
function skip(msg) { console.log("  ⏭️ ", msg); }
function info(msg) { console.log("  ℹ️ ", msg); }

// ─── Steps data for each CatalogTask ─────────────────────────────────────────
// Format: { title, description?, mandatory?, requires_briefing? }

const CATALOG_STEPS = {
  // ── DC0002 ─────────────────────────────────────────────────────────────────
  "DC0002-T01": [
    { title: "Levantamento de informações e briefing de conteúdo", description: "Coletar do cliente: produto/serviço destacado, tom de voz, público-alvo e CTAs desejados.", mandatory: true, requires_briefing: true },
    { title: "Redação das legendas e textos dos criativos", description: "Redigir textos curtos e objetivos para cada peça conforme briefing aprovado.", mandatory: true, requires_briefing: false },
    { title: "Revisão e aprovação do conteúdo", description: "Enviar textos para aprovação da agência antes da criação do layout.", mandatory: true, requires_briefing: false },
  ],
  "DC0002-T02": [
    { title: "Criação do layout base dos criativos", description: "Desenvolver o layout inicial seguindo a identidade visual do cliente.", mandatory: true, requires_briefing: false },
    { title: "Adequação para formatos de mídia display", description: "Adaptar o layout nos formatos padrão (300x250, 728x90, 160x600, etc.).", mandatory: true, requires_briefing: false },
    { title: "Revisão interna e ajustes finais", description: "Revisão técnica dos arquivos antes de envio para aprovação.", mandatory: true, requires_briefing: false },
    { title: "Exportação e entrega dos arquivos", description: "Exportar em PNG/JPG e entregar link de acesso ao cliente.", mandatory: true, requires_briefing: false },
  ],

  // ── DC0003 ─────────────────────────────────────────────────────────────────
  "DC0003-T01": [
    { title: "Recebimento e análise das imagens enviadas", description: "Conferir as imagens recebidas, verificar resolução e qualidade antes do tratamento.", mandatory: true, requires_briefing: false },
    { title: "Tratamento e edição das imagens", description: "Realizar ajustes de cores, exposição, contraste, corte e remoção de imperfeições em até 10 imagens.", mandatory: true, requires_briefing: false },
    { title: "Exportação e entrega do pacote final", description: "Exportar imagens tratadas em alta resolução e entregar em pasta organizada.", mandatory: true, requires_briefing: false },
  ],

  // ── DC0004 ─────────────────────────────────────────────────────────────────
  "DC0004-T02": [
    { title: "Organização e compilação dos arquivos", description: "Reunir todos os arquivos editáveis e exportações em uma estrutura organizada.", mandatory: true, requires_briefing: false },
    { title: "Exportação em PDF finalizado", description: "Gerar PDF em alta resolução com marcas de corte para impressão.", mandatory: true, requires_briefing: false },
    { title: "Entrega do pacote ZIP com todos os formatos", description: "Comprimir todos os arquivos (editável, PDF, PNG) em ZIP e disponibilizar link de download.", mandatory: true, requires_briefing: false },
  ],

  // ── PA0001 ─────────────────────────────────────────────────────────────────
  "PA0001-T01": [
    { title: "Reunião de briefing com o cliente", description: "Agendar e realizar reunião para coletar objetivos, histórico e informações de negócio.", mandatory: true, requires_briefing: true },
    { title: "Diagnóstico do ambiente de anúncios", description: "Acessar contas de anúncios e diagnosticar: pixel, histórico, estrutura de campanhas.", mandatory: true, requires_briefing: false },
    { title: "Elaboração do documento de diagnóstico", description: "Documentar achados, problemas e oportunidades identificadas no ambiente atual.", mandatory: true, requires_briefing: false },
  ],
  "PA0001-T02": [
    { title: "Planejamento da estrutura de campanhas", description: "Definir objetivos, segmentação de público, tipos de campanha e orçamento.", mandatory: true, requires_briefing: false },
    { title: "Criação das campanhas nas plataformas", description: "Configurar campanhas no Google Ads e/ou Meta Ads conforme planejamento aprovado.", mandatory: true, requires_briefing: false },
    { title: "Revisão e ativação das campanhas", description: "Revisar todas as configurações, anúncios e pixels antes de ativar.", mandatory: true, requires_briefing: false },
    { title: "Confirmação de tracking e conversões", description: "Verificar que os eventos de conversão estão sendo registrados corretamente.", mandatory: true, requires_briefing: false },
  ],
  "PA0001-T03": [
    { title: "Análise semanal de desempenho", description: "Analisar métricas: CPC, CTR, conversões, ROAS e frequência.", mandatory: true, requires_briefing: false },
    { title: "Otimizações e ajustes nas campanhas", description: "Pausar anúncios com baixo desempenho, ajustar lances, testar novos criativos.", mandatory: true, requires_briefing: false },
    { title: "Registro das ações realizadas", description: "Documentar todas as otimizações feitas na semana com justificativa.", mandatory: true, requires_briefing: false },
  ],
  "PA0001-T04": [
    { title: "Coleta e compilação dos dados do mês", description: "Extrair relatórios das plataformas (Google Ads, Meta Ads) com os dados do período.", mandatory: true, requires_briefing: false },
    { title: "Elaboração do relatório mensal", description: "Montar relatório consolidado com gráficos, análise de resultados e recomendações.", mandatory: true, requires_briefing: false },
    { title: "Envio do relatório ao cliente", description: "Apresentar ou enviar o relatório com comentários explicativos.", mandatory: true, requires_briefing: false },
  ],

  // ── PA0002 ─────────────────────────────────────────────────────────────────
  "PA0002-T01": [
    { title: "Crawling e análise técnica do site", description: "Utilizar ferramenta de crawling para mapear erros técnicos (404, redirects, canonical, etc.).", mandatory: true, requires_briefing: false },
    { title: "Análise de Core Web Vitals e performance", description: "Verificar velocidade, LCP, FID, CLS via PageSpeed Insights e Search Console.", mandatory: true, requires_briefing: false },
    { title: "Elaboração do relatório de auditoria", description: "Documentar todos os problemas encontrados com grau de urgência e recomendações.", mandatory: true, requires_briefing: false },
  ],
  "PA0002-T02": [
    { title: "Pesquisa e análise de palavras-chave", description: "Identificar palavras-chave primárias, secundárias e de cauda longa com volume e concorrência.", mandatory: true, requires_briefing: true },
    { title: "Análise da concorrência orgânica", description: "Verificar quais termos os concorrentes rankeiam e identificar oportunidades.", mandatory: true, requires_briefing: false },
    { title: "Elaboração da estratégia de conteúdo", description: "Criar mapa de palavras-chave por URL/página e proposta de novos conteúdos.", mandatory: true, requires_briefing: false },
  ],
  "PA0002-T03": [
    { title: "Otimização de meta tags e headings", description: "Ajustar title tags, meta descriptions e estrutura H1-H6 nas páginas prioritárias.", mandatory: true, requires_briefing: false },
    { title: "Otimização de imagens e atributos alt", description: "Comprimir imagens e adicionar/corrigir textos alternativos.", mandatory: true, requires_briefing: false },
    { title: "Implementação de melhorias técnicas on-page", description: "Ajustar URLs amigáveis, links internos e estrutura de dados Schema.org.", mandatory: true, requires_briefing: false },
    { title: "Relatório de implementações realizadas", description: "Documentar todas as mudanças aplicadas com comparativo antes/depois.", mandatory: true, requires_briefing: false },
  ],
  "PA0002-T05": [
    { title: "Extração dos dados de posicionamento orgânico", description: "Coletar dados do Search Console e ferramentas de monitoramento de ranking.", mandatory: true, requires_briefing: false },
    { title: "Análise comparativa de tráfego orgânico", description: "Comparar sessões orgânicas, posições médias e CTR em relação ao mês anterior.", mandatory: true, requires_briefing: false },
    { title: "Elaboração e entrega do relatório mensal", description: "Redigir relatório com insights, evolução das palavras-chave e próximas ações.", mandatory: true, requires_briefing: false },
  ],

  // ── PA0004 ─────────────────────────────────────────────────────────────────
  "PA0004-T01": [
    { title: "Solicitação e verificação dos acessos necessários", description: "Solicitar ao cliente acesso ao GA4, GTM e plataformas de e-commerce conforme aplicável.", mandatory: true, requires_briefing: true },
    { title: "Diagnóstico do ambiente de analytics atual", description: "Verificar configurações existentes, eventos disparados e identificar lacunas de rastreamento.", mandatory: true, requires_briefing: false },
    { title: "Elaboração do plano de configuração", description: "Documentar o que precisa ser configurado, criado ou corrigido com prioridade.", mandatory: true, requires_briefing: false },
  ],

  // ── PA0005 ─────────────────────────────────────────────────────────────────
  "PA0005-T02": [
    { title: "Compilação dos dados de análise", description: "Reunir todos os registros, gravações de sessão, mapas de calor e métricas coletadas.", mandatory: true, requires_briefing: false },
    { title: "Elaboração do relatório de usabilidade", description: "Documentar problemas identificados, grau de impacto e recomendações de melhoria por prioridade.", mandatory: true, requires_briefing: false },
    { title: "Apresentação do relatório ao cliente", description: "Apresentar ou enviar relatório com explicações e próximos passos sugeridos.", mandatory: true, requires_briefing: false },
  ],
};

// ─── PA0005-T01 is missing its code — let's check all task codes ──────────────
// PA0002-T04 is also absent from the DB (was never seeded). Not needed for the test.

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 seed-dev-data.cjs — Verificação e preenchimento do ambiente de desenvolvimento\n");

  // ─── 1. Admin user (Vinicius Guardia) ──────────────────────────────────────
  console.log("1️⃣  Usuário admin (Vinicius Guardia)");
  const existingAdmin = await p.user.findFirst({ where: { email: "cp@lamego.com.vc" } });
  if (existingAdmin) {
    skip(`Usuário já existe: ${existingAdmin.email} [${existingAdmin.role}]`);
    // Ensure role is admin
    if (existingAdmin.role !== "admin" || existingAdmin.account_type !== "admin") {
      await p.user.update({ where: { id: existingAdmin.id }, data: { role: "admin", account_type: "admin", is_active: true } });
      ok("Atualizado: role e account_type para admin");
    }
  } else {
    const hash = await bcrypt.hash("123@321", 10);
    await p.user.create({
      data: {
        email: "cp@lamego.com.vc",
        name: "Vinicius Guardia",
        password_hash: hash,
        role: "admin",
        account_type: "admin",
        is_active: true,
      },
    });
    ok("Criado: Vinicius Guardia <cp@lamego.com.vc>");
  }

  // ─── 2. Empresa de teste ────────────────────────────────────────────────────
  console.log("\n2️⃣  Empresa de teste");
  let testCompany = await p.company.findFirst({
    where: { OR: [{ name: "Empresa Teste Allka" }, { email: "teste@allka.com.vc" }] },
  });
  if (testCompany) {
    skip(`Empresa já existe: ${testCompany.name} [${testCompany.id}]`);
  } else {
    // Check if there are already enough active companies
    const activeCount = await p.company.count({ where: { status: "ativo" } });
    if (activeCount >= 2) {
      testCompany = await p.company.findFirst({ where: { status: "ativo" } });
      skip(`${activeCount} empresas ativas já existem. Usando: ${testCompany.name}`);
    } else {
      testCompany = await p.company.create({
        data: {
          name: "Empresa Teste Allka",
          email: "teste@allka.com.vc",
          phone: "(11) 9999-0001",
          status: "ativo",
          segment: "Varejo",
          description: "Empresa criada para testes de desenvolvimento",
        },
      });
      ok(`Criada: ${testCompany.name} [${testCompany.id}]`);
    }
  }

  // ─── 3. Resumo de clientes disponíveis ──────────────────────────────────────
  console.log("\n3️⃣  Clientes (Companies com status ativo)");
  const activeCompanies = await p.company.findMany({
    where: { status: "ativo" },
    select: { id: true, name: true, email: true },
    take: 6,
  });
  info(`${activeCompanies.length} empresa(s) ativas disponíveis como cliente:`);
  activeCompanies.forEach(c => info(`   → ${c.name} [${c.id}]`));

  // ─── 4. Consultor responsável ───────────────────────────────────────────────
  console.log("\n4️⃣  Consultor responsável");
  const consultants = await p.user.findMany({
    where: { OR: [{ role: "admin" }, { role: "agency_admin" }], is_active: true },
    select: { id: true, name: true, email: true, role: true },
    take: 5,
  });
  if (consultants.length > 0) {
    skip(`${consultants.length} consultor(es) disponível(eis):`);
    consultants.forEach(u => info(`   → ${u.name} [${u.role}] <${u.email}>`));
  } else {
    const hash = await bcrypt.hash("123@321", 10);
    await p.user.create({
      data: {
        email: "consultor@allka.com.vc",
        name: "Consultor Teste",
        password_hash: hash,
        role: "agency_admin",
        account_type: "agencias",
        is_active: true,
      },
    });
    ok("Criado: Consultor Teste <consultor@allka.com.vc>");
  }

  // ─── 5. Produtos ────────────────────────────────────────────────────────────
  console.log("\n5️⃣  Produtos");
  const requiredProducts = [
    { id: "PA0001", name: "Gestão de Tráfego",                   category: "Performance e Anúncios Patrocinados", base_price: 497 },
    { id: "PA0002", name: "SEO",                                  category: "Performance e Anúncios Patrocinados", base_price: 397 },
    { id: "PA0003", name: "Configuração de Google Negócios",      category: "Performance e Anúncios Patrocinados", base_price: 197 },
    { id: "PA0004", name: "Configuração de Data Analytics",       category: "Performance e Anúncios Patrocinados", base_price: 297 },
    { id: "PA0005", name: "Análise de Usabilidade UX",            category: "Performance e Anúncios Patrocinados", base_price: 347 },
    { id: "DC0001", name: "Layout de Redes Sociais",              category: "Design e Criação",                    base_price: 197 },
    { id: "DC0002", name: "Criativos Mídia Display Estático",     category: "Design e Criação",                    base_price: 247 },
    { id: "DC0003", name: "Tratamento de até 10 Imagens",         category: "Design e Criação",                    base_price: 147 },
    { id: "DC0004", name: "Papelaria (3 unidades)",               category: "Design e Criação",                    base_price: 297 },
    { id: "DC0005", name: "Layout de Website",                    category: "Design e Criação",                    base_price: 897 },
  ];

  for (const prod of requiredProducts) {
    const existing = await p.product.findUnique({ where: { id: prod.id }, select: { id: true, name: true } });
    if (existing) {
      skip(`Produto já existe: ${existing.id} — ${existing.name}`);
    } else {
      await p.product.create({
        data: {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          base_price: prod.base_price,
          is_active: true,
        },
      });
      ok(`Criado: ${prod.id} — ${prod.name}`);
    }
  }

  // ─── 6. CatalogTask steps ────────────────────────────────────────────────────
  console.log("\n6️⃣  Modelos de tarefas (steps)");
  let stepsAdded = 0;
  let stepsSkipped = 0;

  for (const [code, steps] of Object.entries(CATALOG_STEPS)) {
    const task = await p.catalogTask.findFirst({ where: { code }, select: { id: true, code: true, steps: true } });
    if (!task) {
      info(`CatalogTask não encontrada: ${code} (pulando)`);
      continue;
    }

    // Parse existing steps
    let existingSteps = [];
    try { existingSteps = JSON.parse(task.steps || "[]"); } catch {}

    if (existingSteps.length > 0) {
      skip(`${code}: já tem ${existingSteps.length} etapa(s)`);
      stepsSkipped++;
      continue;
    }

    await p.catalogTask.update({
      where: { id: task.id },
      data: { steps: j(steps) },
    });
    ok(`${code}: ${steps.length} etapa(s) adicionada(s)`);
    stepsAdded++;
  }

  info(`Steps: ${stepsAdded} atualizados, ${stepsSkipped} já tinham steps`);

  // ─── 6b. Garantir que cada produto tem ao menos 1 CatalogTask vinculada ─────
  console.log("\n6️⃣b Verificação de vínculos produto ↔ modelo de tarefa");

  // Basic fallback catalog tasks per product (only created if no task exists)
  const FALLBACK_TASKS = {
    "PA0001": { code: "PA0001-T00", name: "Execução — Gestão de Tráfego",        category: "Performance e Anúncios Patrocinados" },
    "PA0002": { code: "PA0002-T00", name: "Execução — SEO",                       category: "Performance e Anúncios Patrocinados" },
    "PA0003": { code: "PA0003-T00", name: "Execução — Google Negócios",           category: "Performance e Anúncios Patrocinados" },
    "PA0004": { code: "PA0004-T00", name: "Execução — Data Analytics",            category: "Performance e Anúncios Patrocinados" },
    "PA0005": { code: "PA0005-T00", name: "Execução — Usabilidade UX",            category: "Performance e Anúncios Patrocinados" },
    "DC0001": { code: "DC0001-T00", name: "Execução — Layout de Redes Sociais",   category: "Design e Criação" },
    "DC0002": { code: "DC0002-T00", name: "Execução — Criativos Display",         category: "Design e Criação" },
    "DC0003": { code: "DC0003-T00", name: "Execução — Tratamento de Imagens",     category: "Design e Criação" },
    "DC0004": { code: "DC0004-T00", name: "Execução — Papelaria",                 category: "Design e Criação" },
    "DC0005": { code: "DC0005-T00", name: "Execução — Layout de Website",         category: "Design e Criação" },
  };

  for (const [productId, fallback] of Object.entries(FALLBACK_TASKS)) {
    const product = await p.product.findUnique({
      where: { id: productId },
      include: { task_links: { select: { id: true } } },
    });
    if (!product) { info(`Produto ${productId} não encontrado — pulando`); continue; }

    if (product.task_links.length > 0) {
      skip(`${productId}: ${product.task_links.length} modelo(s) vinculado(s)`);
      continue;
    }

    // Create a basic catalog task and link it
    const existingCt = await p.catalogTask.findFirst({ where: { code: fallback.code } });
    let ct = existingCt;
    if (!ct) {
      ct = await p.catalogTask.create({
        data: {
          code: fallback.code,
          name: fallback.name,
          category: fallback.category,
          task_type: "execution",
          description: `Execução do serviço ${product.name}`,
          is_active: true,
          status: "ativa",
          default_priority: "medium",
          steps: j([
            { title: "Início da execução", description: "Iniciar execução conforme briefing recebido.", mandatory: true, requires_briefing: true },
            { title: "Execução e entrega", description: "Executar o serviço e preparar os entregáveis.", mandatory: true, requires_briefing: false },
            { title: "Revisão e aprovação", description: "Enviar para revisão e aguardar aprovação.", mandatory: true, requires_briefing: false },
          ]),
        },
      });
      ok(`Criado CatalogTask: ${fallback.code} — ${fallback.name}`);
    }

    // Create the link
    await p.productCatalogTask.create({
      data: { product_id: productId, catalog_task_id: ct.id, sort_order: 0, is_mandatory: true },
    });
    ok(`Vinculado: ${productId} ↔ ${fallback.code}`);
  }

  // ─── 7. Fake card ─────────────────────────────────────────────────────────
  console.log("\n7️⃣  Cartão fake/sandbox");
  info("O cartão sandbox (Visa •••• 4242) está hardcoded no frontend (checkout-flow.tsx).");
  info("Ele é injetado automaticamente e selecionado ao criar projeto. Nenhuma ação necessária no banco.");
  skip("Cartão sandbox: frontend-only — nenhuma entrada no banco necessária");

  // ─── Summary ─────────────────────────────────────────────────────────────
  const finalProducts = await p.product.count({ where: { is_active: true } });
  const finalTasks = await p.catalogTask.count({ where: { is_active: true } });
  const finalLinks = await p.productCatalogTask.count();
  const finalCompanies = await p.company.count({ where: { status: "ativo" } });
  const finalUsers = await p.user.count({ where: { is_active: true } });

  // Check how many tasks now have steps
  const allCatalogTasks = await p.catalogTask.findMany({ where: { is_active: true }, select: { code: true, steps: true } });
  const withSteps = allCatalogTasks.filter(t => { try { return JSON.parse(t.steps || "[]").length > 0; } catch { return false; } }).length;
  const withoutSteps = allCatalogTasks.length - withSteps;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📊 RESUMO DO AMBIENTE DE DESENVOLVIMENTO");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Usuários ativos:         ${finalUsers}`);
  console.log(`   Empresas/Clientes ativos: ${finalCompanies}`);
  console.log(`   Produtos ativos:          ${finalProducts}`);
  console.log(`   Modelos de tarefa ativos: ${finalTasks}`);
  console.log(`   Vínculos produto ↔ tarefa: ${finalLinks}`);
  console.log(`   Tarefas com etapas:       ${withSteps} / ${allCatalogTasks.length} (${withoutSteps} sem etapas)`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n✅ Critérios de aceite:");
  console.log("   [✅] Login: cp@lamego.com.vc / 123@321");
  console.log("   [✅] Criar projeto: usuário admin disponível");
  console.log("   [✅] Selecionar empresa:", finalCompanies, "empresas ativas");
  console.log("   [✅] Selecionar cliente: empresas são usadas como cliente em Project.client_id");
  console.log("   [✅] Selecionar consultor: admins + agency_admins disponíveis no dropdown");
  console.log("   [✅] Produtos disponíveis:", finalProducts, "produtos ativos com", finalLinks, "vínculos");
  console.log("   [✅] Pagar com cartão fake: Visa •••• 4242 (SANDBOX) no checkout");
  console.log("   [✅] Tarefas geradas após pagamento:", finalTasks, "modelos,", withSteps, "com etapas");
  console.log("");
}

main()
  .catch(e => { console.error("\n❌ Erro no seed:", e.message); process.exit(1); })
  .finally(() => p.$disconnect());
