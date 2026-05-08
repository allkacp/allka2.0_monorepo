/**
 * seed-catalog-tasks.ts
 *
 * Seed idempotente: garante que todos os produtos ativos tenham
 * pelo menos 1 CatalogTask ativo com etapas válidas.
 *
 * Regras:
 * - Não apaga nada existente
 * - Não sobrescreve dados manuais de modelos já existentes
 * - Upsert por `code` (chave única no schema)
 * - Ativa DC0006-T01 (Template para Criativos) que estava inativo
 * - Corrige etapas sem título em PA0005-T01
 * - Garante vínculo product ↔ CatalogTask via ProductCatalogTask
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

// ─── Step helpers ─────────────────────────────────────────────────────────────

function step(
  title: string,
  description: string,
  opts: { mandatory?: boolean; requires_briefing?: boolean } = {},
) {
  return {
    title,
    description,
    mandatory: opts.mandatory ?? true,
    requires_briefing: opts.requires_briefing ?? false,
  };
}

// ─── Catalog task definitions ─────────────────────────────────────────────────
// Each entry: { code, productId, taskDef, linkOpts }
// taskDef is used only if the CatalogTask with that code doesn't exist yet.
// linkOpts is used to upsert the ProductCatalogTask join.

interface TaskDef {
  code: string;
  name: string;
  category: string;
  description: string;
  steps: ReturnType<typeof step>[];
  default_priority?: string;
  default_deadline_days?: number;
  requires_briefing?: boolean;
}

interface SeedEntry {
  productId: string;
  sortOrder: number;
  phase?: string;
  taskDef: TaskDef;
  /** If true and the model is inactive, reactivate it */
  forceActivate?: boolean;
}

const SEED_ENTRIES: SeedEntry[] = [
  // ── PA0001 Gestão de Tráfego ─────────────────────────────────────────────
  {
    productId: "PA0001",
    sortOrder: 0,
    taskDef: {
      code: "PA0001-T01",
      name: "Onboarding e Diagnóstico",
      category: "Performance e Anúncios Patrocinados",
      description: "Levantamento de acessos, histórico de campanhas e diagnóstico inicial da conta.",
      requires_briefing: true,
      default_deadline_days: 3,
      steps: [
        step("Solicitar acessos ao cliente", "Google Ads, Meta Ads e Analytics.", { requires_briefing: true }),
        step("Diagnosticar histórico de campanhas", "Analisar dados históricos e desempenho anterior."),
        step("Entregar diagnóstico ao cliente", "Relato com pontos de melhoria identificados."),
      ],
    },
  },
  {
    productId: "PA0001",
    sortOrder: 1,
    taskDef: {
      code: "PA0001-T02",
      name: "Configuração e Ativação das Campanhas",
      category: "Performance e Anúncios Patrocinados",
      description: "Estruturação e ativação das campanhas conforme briefing aprovado.",
      default_deadline_days: 5,
      steps: [
        step("Criar estrutura de campanhas", "Definir conjuntos, públicos e orçamento."),
        step("Configurar rastreamento de conversões", "Instalar/verificar pixel e tags de conversão."),
        step("Ativar campanhas e monitorar 24h", "Validar entrega e primeiros resultados."),
        step("Enviar confirmação de ativação", "Notificar agência e cliente."),
      ],
    },
  },
  {
    productId: "PA0001",
    sortOrder: 2,
    taskDef: {
      code: "PA0001-T03",
      name: "Monitoramento e Otimização Semanal",
      category: "Performance e Anúncios Patrocinados",
      description: "Análise semanal de métricas e ajustes para melhorar performance.",
      default_deadline_days: 7,
      steps: [
        step("Analisar métricas da semana", "CTR, CPC, conversões, ROAS."),
        step("Aplicar otimizações", "Ajustar lances, públicos, criativos e textos."),
        step("Registrar alterações realizadas", "Log de mudanças para histórico."),
      ],
    },
  },
  {
    productId: "PA0001",
    sortOrder: 3,
    taskDef: {
      code: "PA0001-T04",
      name: "Relatório Mensal de Performance",
      category: "Performance e Anúncios Patrocinados",
      description: "Relatório mensal completo com resultados, insights e próximos passos.",
      default_deadline_days: 5,
      steps: [
        step("Coletar dados do mês", "Exportar dados de todas as plataformas."),
        step("Montar relatório", "Comparar com mês anterior e metas."),
        step("Enviar ao cliente e registrar entrega", "Envio por e-mail ou plataforma."),
      ],
    },
  },

  // ── PA0002 SEO ────────────────────────────────────────────────────────────
  {
    productId: "PA0002",
    sortOrder: 0,
    taskDef: {
      code: "PA0002-T01",
      name: "Auditoria Técnica de SEO",
      category: "Performance e Anúncios Patrocinados",
      description: "Diagnóstico completo do estado técnico e de autoridade do site.",
      requires_briefing: true,
      default_deadline_days: 5,
      steps: [
        step("Coletar acessos ao Search Console e Analytics", "Verificar propriedades e permissões.", { requires_briefing: true }),
        step("Analisar indexação e rastreamento", "Verificar sitemap, robots.txt, erros 404."),
        step("Entregar diagnóstico SEO", "Relatório com problemas técnicos encontrados."),
      ],
    },
  },
  {
    productId: "PA0002",
    sortOrder: 1,
    taskDef: {
      code: "PA0002-T02",
      name: "Estratégia de Palavras-chave",
      category: "Performance e Anúncios Patrocinados",
      description: "Pesquisa e definição das palavras-chave prioritárias para otimização.",
      default_deadline_days: 5,
      steps: [
        step("Pesquisar palavras-chave com volume", "Ferramentas: Semrush, Ahrefs ou Google Keyword Planner."),
        step("Classificar por intenção e prioridade", "Transacional, informacional, navegacional."),
        step("Entregar planilha de keywords validada", "Aprovação pela agência antes de otimizar."),
      ],
    },
  },
  {
    productId: "PA0002",
    sortOrder: 2,
    taskDef: {
      code: "PA0002-T03",
      name: "Otimização On-Page",
      category: "Performance e Anúncios Patrocinados",
      description: "Aplicação das otimizações nas páginas prioritárias do site.",
      default_deadline_days: 7,
      steps: [
        step("Otimizar titles e meta descriptions", "Seguir boas práticas de SEO on-page."),
        step("Otimizar headings (H1, H2, H3)", "Estruturar hierarquia de conteúdo."),
        step("Melhorar URLs e links internos", "Canonicals, hreflang se aplicável."),
        step("Validar e registrar alterações", "Documentar páginas alteradas."),
      ],
    },
  },
  {
    productId: "PA0002",
    sortOrder: 3,
    taskDef: {
      code: "PA0002-T05",
      name: "Relatório Mensal de SEO",
      category: "Performance e Anúncios Patrocinados",
      description: "Relatório com evolução de posicionamento, tráfego orgânico e próximos passos.",
      default_deadline_days: 5,
      steps: [
        step("Coletar dados de posicionamento", "Export Search Console + Semrush."),
        step("Comparar com mês anterior", "Crescimento de impressões, cliques e posição média."),
        step("Enviar relatório ao cliente", "Incluir próximos passos."),
      ],
    },
  },

  // ── PA0003 Configuração de Google Negócios ────────────────────────────────
  {
    productId: "PA0003",
    sortOrder: 0,
    taskDef: {
      code: "PA0003-T01",
      name: "Verificação de Acessos e Análise do Briefing — Google Negócios",
      category: "Performance e Anúncios Patrocinados",
      description: "Verificar acesso ao perfil e analisar briefing enviado pelo cliente.",
      requires_briefing: true,
      default_deadline_days: 2,
      steps: [
        step("Verificar acesso ao perfil do Google Meu Negócio", "Solicitar convite de gestão se necessário.", { requires_briefing: true }),
        step("Analisar briefing e dados do cliente", "CNPJ, endereço, horários, fotos, serviços."),
      ],
    },
  },
  {
    productId: "PA0003",
    sortOrder: 1,
    taskDef: {
      code: "PA0003-T02",
      name: "Configuração Completa do Google Negócios",
      category: "Performance e Anúncios Patrocinados",
      description: "Configuração completa e publicação do perfil Google Meu Negócio.",
      default_deadline_days: 3,
      steps: [
        step("Preencher dados básicos do perfil", "Nome, endereço, telefone, site, horários."),
        step("Adicionar fotos e identidade visual", "Capa, logo, fotos do espaço/produto."),
        step("Configurar serviços e descrição da empresa", "Categorias principais e secundárias."),
        step("Verificar publicação e entregar ao cliente", "Confirmar exibição pública do perfil."),
      ],
    },
  },

  // ── PA0004 Configuração de Data Analytics ────────────────────────────────
  {
    productId: "PA0004",
    sortOrder: 0,
    taskDef: {
      code: "PA0004-T01",
      name: "Verificação de Acessos e Análise do Briefing — Data Analytics",
      category: "Performance e Anúncios Patrocinados",
      description: "Verificar acessos às plataformas e analisar briefing de tagueamento.",
      requires_briefing: true,
      default_deadline_days: 2,
      steps: [
        step("Verificar acesso ao Google Analytics, GTM e plataformas solicitadas", "Solicitar acessos se necessário.", { requires_briefing: true }),
        step("Analisar briefing de tagueamento", "Identificar eventos, conversões e metas a configurar."),
        step("Documentar escopo de configuração", "Listar tags, triggers e variáveis a implementar."),
      ],
    },
  },
  {
    productId: "PA0004",
    sortOrder: 1,
    taskDef: {
      code: "PA0004-T02",
      name: "Configuração de Data Analytics e Entrega",
      category: "Performance e Anúncios Patrocinados",
      description: "Implementação de tags, eventos e conversões conforme briefing aprovado.",
      default_deadline_days: 5,
      steps: [
        step("Configurar tags no GTM", "Implementar GA4, pixels e demais tags solicitadas."),
        step("Configurar conversões e eventos", "Definir eventos-chave: formulários, cliques, compras."),
        step("Validar implementação com Preview/Debug", "Testar cada tag e confirmar disparo correto."),
        step("Validar dados no GA4 / plataformas", "Confirmar recebimento de dados em tempo real."),
        step("Entregar documentação de tagueamento", "Registrar tags implementadas e lógica aplicada."),
      ],
    },
  },

  // ── PA0005 Análise de Usabilidade UX ─────────────────────────────────────
  {
    productId: "PA0005",
    sortOrder: 0,
    taskDef: {
      code: "PA0005-T02",
      name: "Relatório de Usabilidade e Entrega",
      category: "Performance e Anúncios Patrocinados",
      description: "Entrega do relatório de usabilidade com diagnóstico e recomendações.",
      default_deadline_days: 5,
      steps: [
        step("Analisar páginas com PageSpeed Insights", "Desktop e mobile para URLs principais."),
        step("Testar navegação e fluidez", "Verificar botões, links, menus e formulários."),
        step("Verificar tagueamento das páginas", "Confirmar disparo de eventos no GTM/GA4."),
      ],
    },
  },

  // ── DC0001 Layout de Redes Sociais ────────────────────────────────────────
  {
    productId: "DC0001",
    sortOrder: 0,
    taskDef: {
      code: "DC0001-T01",
      name: "Criação de Layout para Redes Sociais",
      category: "Design e Criação",
      description: "Criação dos layouts para posts, stories e capas conforme identidade visual do cliente.",
      requires_briefing: true,
      default_deadline_days: 5,
      steps: [
        step("Receber e analisar briefing", "Verificar referências, cores, fontes e formatos solicitados.", { requires_briefing: true }),
        step("Criar layouts no Figma/Photoshop/Canva", "Desenvolver peças conforme formatos acordados."),
        step("Enviar para revisão interna", "Verificar identidade visual e qualidade antes de apresentar."),
        step("Apresentar ao cliente e coletar feedback", "Enviar PDF ou link de visualização."),
      ],
    },
  },

  // ── DC0002 Criativos Mídia Display Estático ───────────────────────────────
  {
    productId: "DC0002",
    sortOrder: 0,
    taskDef: {
      code: "DC0002-T01",
      name: "Conteúdo e Legenda para Criativos",
      category: "Design e Criação",
      description: "Definição de textos, copies e legendas para os criativos display.",
      requires_briefing: true,
      default_deadline_days: 3,
      steps: [
        step("Coletar briefing de conteúdo", "Objetivo da campanha, público, CTA e mensagem-chave.", { requires_briefing: true }),
        step("Criar copies e legendas", "Textos para headline, descrição e CTA."),
        step("Validar com a agência antes da produção", "Aprovação interna dos textos."),
      ],
    },
  },
  {
    productId: "DC0002",
    sortOrder: 1,
    taskDef: {
      code: "DC0002-T02",
      name: "Layout de Criativos Mídia Display Estático",
      category: "Design e Criação",
      description: "Criação dos criativos estáticos nos formatos solicitados para campanhas de mídia.",
      default_deadline_days: 5,
      steps: [
        step("Criar criativos nos formatos solicitados", "Ex: 300x250, 728x90, 160x600, 320x50."),
        step("Revisar visualmente todos os formatos", "Verificar alinhamento, legibilidade e CTA."),
        step("Exportar em PNG/JPG e organizar arquivos", "Nomenclatura padrão e compactação em ZIP."),
        step("Entregar e registrar aprovação", "Enviar ao cliente e coletar aprovação."),
      ],
    },
  },

  // ── DC0003 Tratamento de até 10 Imagens ──────────────────────────────────
  {
    productId: "DC0003",
    sortOrder: 0,
    taskDef: {
      code: "DC0003-T01",
      name: "Tratamento e Edição de até 10 Imagens",
      category: "Design e Criação",
      description: "Tratamento profissional de até 10 fotos com ajustes de cor, exposição, recorte e identidade visual.",
      requires_briefing: true,
      default_deadline_days: 3,
      steps: [
        step("Receber imagens e briefing de tratamento", "Fotos brutas e orientações de estilo.", { requires_briefing: true }),
        step("Aplicar tratamento: cor, exposição, recorte", "Manter consistência de estilo entre as imagens."),
        step("Exportar e entregar em alta resolução", "PNG ou JPG em ZIP com nomenclatura organizada."),
      ],
    },
  },

  // ── DC0004 Papelaria ──────────────────────────────────────────────────────
  {
    productId: "DC0004",
    sortOrder: 0,
    taskDef: {
      code: "DC0004-T01",
      name: "Criação das Peças de Papelaria",
      category: "Design e Criação",
      description: "Criação dos itens de papelaria conforme briefing: cartão de visita, papel timbrado, envelope, etc.",
      requires_briefing: true,
      default_deadline_days: 5,
      steps: [
        step("Receber briefing e definir peças", "Quais itens, dimensões, especificações de impressão.", { requires_briefing: true }),
        step("Criar e revisar as peças", "Desenvolver cada item com identidade visual aprovada."),
      ],
    },
  },
  {
    productId: "DC0004",
    sortOrder: 1,
    taskDef: {
      code: "DC0004-T02",
      name: "Entrega Final — ZIP, PDF e Arquivo AI (Papelaria)",
      category: "Design e Criação",
      description: "Exportação e entrega do pacote final com todos os arquivos de papelaria.",
      default_deadline_days: 2,
      steps: [
        step("Exportar PDF de visualização", "Um PDF por peça, com marcas de corte se necessário."),
        step("Exportar arquivo aberto (AI, PSD ou Figma)", "Arquivo editável para futuros ajustes."),
        step("Compactar e enviar ao cliente", "ZIP com todos os arquivos organizados por tipo."),
      ],
    },
  },

  // ── DC0005 Layout de Website ──────────────────────────────────────────────
  {
    productId: "DC0005",
    sortOrder: 0,
    taskDef: {
      code: "DC0005-T01",
      name: "Criação do Layout de Website",
      category: "Design e Criação",
      description: "Criação do layout completo do website conforme briefing aprovado.",
      requires_briefing: true,
      default_deadline_days: 10,
      steps: [
        step("Receber briefing e referências visuais", "Objetivo, público, páginas, paleta, fontes.", { requires_briefing: true }),
        step("Criar wireframes e layout no Figma", "Desktop e mobile para páginas principais."),
        step("Apresentar ao cliente e coletar aprovação", "Revisão e ajustes até aprovação final."),
      ],
    },
  },

  // ── DC0006 Template para Criativos (5 unidades) ───────────────────────────
  // Este modelo existe mas estava inativo — apenas ativamos.
  {
    productId: "DC0006",
    sortOrder: 0,
    forceActivate: true,
    taskDef: {
      code: "DC0006-T01",
      name: "Template para Criativos (5 unidades)",
      category: "Design e Criação",
      description:
        "Criação de até 5 templates criativos em Canva, Photoshop ou Illustrator, em até 3 formatos/dimensões solicitados, com design profissional e identidade visual alinhada à marca.",
      requires_briefing: true,
      default_deadline_days: 7,
      steps: [
        step("Briefing e definição dos formatos", "Quais formatos, dimensões e plataformas de destino.", { requires_briefing: true }),
        step("Criação dos templates criativos", "Desenvolver até 5 templates com identidade visual."),
        step("Revisão interna e ajustes", "Verificar qualidade visual e alinhamento com a marca."),
        step("Exportação e entrega do pacote", "Arquivo editável + PNG/JPG em ZIP para o cliente."),
      ],
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SEED: Garantindo Modelos de Tarefas por Produto");
  console.log("═══════════════════════════════════════════════════════════\n");

  let created = 0;
  let updated = 0;
  let activated = 0;
  let linked = 0;
  let skipped = 0;

  for (const entry of SEED_ENTRIES) {
    const { productId, sortOrder, phase, taskDef, forceActivate } = entry;

    // 1. Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, is_active: true },
    });

    if (!product) {
      console.warn(`⚠️  Produto ${productId} não encontrado — pulando`);
      continue;
    }

    // 2. Upsert CatalogTask
    const stepsJson = JSON.stringify(taskDef.steps);

    const existing = await prisma.catalogTask.findUnique({
      where: { code: taskDef.code },
    });

    let catalogTaskId: string;

    if (!existing) {
      // Create new
      const created_task = await prisma.catalogTask.create({
        data: {
          code: taskDef.code,
          name: taskDef.name,
          category: taskDef.category,
          description: taskDef.description,
          steps: stepsJson,
          requires_briefing: taskDef.requires_briefing ?? false,
          default_deadline_days: taskDef.default_deadline_days ?? null,
          default_priority: taskDef.default_priority ?? "medium",
          is_active: true,
          status: "ativa",
        },
      });
      catalogTaskId = created_task.id;
      console.log(`  ✅ CRIADO  [${taskDef.code}] ${taskDef.name}`);
      created++;
    } else {
      catalogTaskId = existing.id;

      // Activate if forceActivate is set and model is inactive
      if (forceActivate && !existing.is_active) {
        await prisma.catalogTask.update({
          where: { id: existing.id },
          data: { is_active: true, status: "ativa" },
        });
        console.log(`  🔓 ATIVADO [${taskDef.code}] ${existing.name}`);
        activated++;
      } else if (forceActivate && existing.is_active) {
        console.log(`  ✓  OK     [${taskDef.code}] ${existing.name} (já ativo)`);
        skipped++;
      } else if (!existing.is_active) {
        console.log(`  ⏭️  SKIP   [${taskDef.code}] ${existing.name} (inativo, sem forceActivate)`);
        skipped++;
      } else {
        console.log(`  ✓  OK     [${taskDef.code}] ${existing.name}`);
        skipped++;
      }

      // Fix steps with missing titles (malformed) without overwriting intentional data
      if (existing.steps) {
        try {
          const existingSteps = JSON.parse(existing.steps) as Array<{ title?: string; label?: string }>;
          const hasEmptyTitles = existingSteps.some((s) => !s.title && !s.label);
          if (hasEmptyTitles && existing.is_active) {
            await prisma.catalogTask.update({
              where: { id: existing.id },
              data: { steps: stepsJson },
            });
            console.log(`     ↳ Etapas corrigidas (títulos vazios encontrados)`);
            updated++;
          }
        } catch { /* invalid JSON — leave as-is */ }
      }
    }

    // 3. Ensure ProductCatalogTask link exists
    const existingLink = await prisma.productCatalogTask.findUnique({
      where: {
        product_id_catalog_task_id: {
          product_id: productId,
          catalog_task_id: catalogTaskId,
        },
      },
    });

    if (!existingLink) {
      await prisma.productCatalogTask.create({
        data: {
          product_id: productId,
          catalog_task_id: catalogTaskId,
          sort_order: sortOrder,
          is_mandatory: true,
          phase: phase ?? null,
        },
      });
      console.log(`     ↳ Vínculo criado: ${productId} → ${taskDef.code}`);
      linked++;
    }
  }

  console.log("\n─── Resumo ─────────────────────────────────────────────────");
  console.log(`  Modelos criados    : ${created}`);
  console.log(`  Modelos ativados   : ${activated}`);
  console.log(`  Etapas corrigidas  : ${updated} modelos`);
  console.log(`  Vínculos criados   : ${linked}`);
  console.log(`  Já OK (ignorados)  : ${skipped}`);

  // ─── Final audit ───────────────────────────────────────────────────────────
  console.log("\n─── Auditoria final ────────────────────────────────────────");

  const products = await prisma.product.findMany({
    where: { is_active: true },
    orderBy: { id: "asc" },
    include: {
      task_links: {
        include: { catalog_task: { select: { code: true, name: true, is_active: true, steps: true } } },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  let problems = 0;

  for (const p of products) {
    const activeLinks = p.task_links.filter((l) => l.catalog_task.is_active);
    const flag = activeLinks.length === 0 ? "❌" : "✅";
    console.log(`  ${flag} ${p.id} | ${p.name} | modelos ativos: ${activeLinks.length}`);

    if (activeLinks.length === 0) {
      problems++;
      console.log(`     ⚠️  PROBLEMA: produto ativo sem modelos ativos!`);
    } else {
      for (const link of activeLinks) {
        const ct = link.catalog_task;
        let stepCount = 0;
        try { stepCount = ct.steps ? JSON.parse(ct.steps).length : 0; } catch { /* ignore */ }
        const stepFlag = stepCount === 0 ? "⚠️  SEM ETAPAS" : `${stepCount} etapas`;
        console.log(`       ✓ [${ct.code}] ${ct.name} | ${stepFlag}`);
        if (stepCount === 0) problems++;
      }
    }
  }

  if (problems === 0) {
    console.log("\n  ✅ Tudo OK — todos os produtos ativos têm modelos com etapas.");
  } else {
    console.log(`\n  ⚠️  ${problems} problema(s) ainda encontrado(s) após seed.`);
  }

  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
