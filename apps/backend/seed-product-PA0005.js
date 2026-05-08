// =============================================================================
// seed-product-PA0005.js — Análise de Usabilidade UX (UXAN-0001)
// Execução: node apps/backend/seed-product-PA0005.js
// Idempotente: usa upsert em todos os registros
// =============================================================================
// @ts-nocheck
"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed PA0005 — Análise de Usabilidade UX...");

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PRODUTO BASE
  // ──────────────────────────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { id: "UXAN-0001" },
    update: {
      name: "Análise de Usabilidade UX",
      description:
        "Análise abrangente de usabilidade e performance das páginas do seu site: velocidade de carregamento (Google PageSpeed Insights), diagnóstico de navegação, verificação funcional de todos os botões e links, diagnóstico de tagueamento (GA4, GTM, pixels de anúncios) e relatório completo PA0005-REL-UX com evidências, tabela de erros e recomendações priorizadas por impacto.",
      short_description:
        "Análise completa de usabilidade: velocidade, links, botões e tagueamento — relatório com evidências em até 6 dias úteis.",
      category: "marketing",
      tags: JSON.stringify([
        "usabilidade",
        "ux",
        "velocidade",
        "pagespeed",
        "tagueamento",
        "analytics",
        "conversão",
        "diagnóstico",
      ]),
      image: "/images/products/ux-analysis.svg",
      recurrence: "Avulso",
      base_price: 90.72,
      status: "active",
      price: 90.72,
      unit: "avulso",
      sku: "PA0005",
    },
    create: {
      id: "UXAN-0001",
      name: "Análise de Usabilidade UX",
      description:
        "Análise abrangente de usabilidade e performance das páginas do seu site: velocidade de carregamento (Google PageSpeed Insights), diagnóstico de navegação, verificação funcional de todos os botões e links, diagnóstico de tagueamento (GA4, GTM, pixels de anúncios) e relatório completo PA0005-REL-UX com evidências, tabela de erros e recomendações priorizadas por impacto.",
      short_description:
        "Análise completa de usabilidade: velocidade, links, botões e tagueamento — relatório com evidências em até 6 dias úteis.",
      category: "marketing",
      tags: JSON.stringify([
        "usabilidade",
        "ux",
        "velocidade",
        "pagespeed",
        "tagueamento",
        "analytics",
        "conversão",
        "diagnóstico",
      ]),
      image: "/images/products/ux-analysis.svg",
      recurrence: "Avulso",
      base_price: 90.72,
      status: "active",
      price: 90.72,
      unit: "avulso",
      sku: "PA0005",
    },
  });
  console.log("✅ Produto criado:", product.id);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. VARIAÇÕES
  // ──────────────────────────────────────────────────────────────────────────
  const variations = [
    {
      id: "UXAN-V01",
      product_id: "UXAN-0001",
      name: "Até 5 páginas",
      description:
        "Análise de usabilidade completa em até 5 páginas do site — velocidade, links, botões e tagueamento com relatório PA0005-REL-UX.",
      price: 90.72,
      deadline_days: 4,
      scope_description:
        "Análise de até 5 páginas: PageSpeed Insights (desktop/mobile), verificação de todos os botões e links de cada página, diagnóstico de tagueamento e relatório PA0005-REL-UX completo.",
      features: JSON.stringify([
        "Até 5 páginas analisadas",
        "PageSpeed Insights desktop e mobile",
        "Verificação de botões e links de todas as páginas",
        "Diagnóstico de tagueamento (GA4, GTM, pixels)",
        "Relatório PA0005-REL-UX com evidências",
        "Prazo: 4 dias úteis",
      ]),
      is_active: true,
      sort_order: 1,
      variation_type: "scope",
      category: "standard",
    },
    {
      id: "UXAN-V02",
      product_id: "UXAN-0001",
      name: "Até 10 páginas",
      description:
        "Análise de usabilidade completa em até 10 páginas do site — velocidade, links, botões e tagueamento com relatório PA0005-REL-UX.",
      price: 136.08,
      deadline_days: 4,
      scope_description:
        "Análise de até 10 páginas: PageSpeed Insights, verificação de todos os botões e links de cada página, diagnóstico de tagueamento e relatório completo com recomendações priorizadas.",
      features: JSON.stringify([
        "Até 10 páginas analisadas",
        "PageSpeed Insights desktop e mobile",
        "Verificação de botões e links de todas as páginas",
        "Diagnóstico de tagueamento (GA4, GTM, pixels)",
        "Relatório PA0005-REL-UX com evidências",
        "Prazo: 4 dias úteis",
      ]),
      is_active: true,
      sort_order: 2,
      variation_type: "scope",
      category: "standard",
    },
    {
      id: "UXAN-V03",
      product_id: "UXAN-0001",
      name: "Até 20 páginas",
      description:
        "Análise de usabilidade completa em até 20 páginas do site — velocidade, links, botões e tagueamento com relatório PA0005-REL-UX.",
      price: 181.44,
      deadline_days: 5,
      scope_description:
        "Análise de até 20 páginas: PageSpeed Insights, verificação funcional de todos os elementos interativos de cada página, diagnóstico de tagueamento e relatório PA0005-REL-UX detalhado.",
      features: JSON.stringify([
        "Até 20 páginas analisadas",
        "PageSpeed Insights desktop e mobile",
        "Verificação de botões e links de todas as páginas",
        "Diagnóstico de tagueamento (GA4, GTM, pixels)",
        "Relatório PA0005-REL-UX com evidências",
        "Prazo: 5 dias úteis",
      ]),
      is_active: true,
      sort_order: 3,
      variation_type: "scope",
      category: "standard",
    },
    {
      id: "UXAN-V04",
      product_id: "UXAN-0001",
      name: "Até 50 páginas",
      description:
        "Análise de usabilidade completa em até 50 páginas do site — velocidade, links, botões e tagueamento com relatório PA0005-REL-UX.",
      price: 317.52,
      deadline_days: 6,
      scope_description:
        "Análise de até 50 páginas: PageSpeed Insights, verificação funcional de todos os elementos interativos de cada página, diagnóstico de tagueamento e relatório PA0005-REL-UX completo com recomendações por prioridade.",
      features: JSON.stringify([
        "Até 50 páginas analisadas",
        "PageSpeed Insights desktop e mobile",
        "Verificação de botões e links de todas as páginas",
        "Diagnóstico de tagueamento (GA4, GTM, pixels)",
        "Relatório PA0005-REL-UX com evidências",
        "Prazo: 6 dias úteis",
      ]),
      is_active: true,
      sort_order: 4,
      variation_type: "scope",
      category: "standard",
    },
  ];

  for (const v of variations) {
    await prisma.productVariation.upsert({
      where: { id: v.id },
      update: v,
      create: v,
    });
  }
  console.log("✅ Variações criadas: UXAN-V01, UXAN-V02, UXAN-V03, UXAN-V04");

  // ──────────────────────────────────────────────────────────────────────────
  // 3. META
  // ──────────────────────────────────────────────────────────────────────────
  const meta = {
    product_id: "UXAN-0001",
    recurrence: "Avulso",
    delivery_days: "4",
    summary_description:
      "Análise abrangente de usabilidade e desempenho do site: velocidade, navegação, botões, links, tagueamento e relatório completo com pontos de melhoria.",
    final_price: 90.72,
    item_limit: 1,
    total_execution_hours: 2,
    execution_hours_per_day: 2,
    tests_enabled: true,
    steps_enabled: true,
    task_model: JSON.stringify({
      objective:
        "Analisar a usabilidade e desempenho das páginas indicadas no briefing — velocidade, navegação, botões, links e tagueamento — e entregar o relatório PA0005-REL-UX com evidências e pontos de melhoria para cada problema identificado.",
      creator: "Consultor/Agência",
      responsible: "Líder de Performance",
      executor: "Nômade Especialista",
      requiresAccess: false,
      itemLimit: 1,
      totalDeadlineDays: 4,
      totalDeadlineNote:
        "4 dias úteis para até 10 páginas (V01/V02) | 5 dias para até 20 páginas (V03) | 6 dias para até 50 páginas (V04)",
    }),
    warnings: JSON.stringify([
      {
        id: "W01",
        title: "Site deve estar funcionando",
        description:
          "A análise só pode ser realizada com o site publicado e acessível. Páginas fora do ar, em manutenção ou protegidas por senha sem credenciais impedem a execução. Garanta que o site está funcionando durante todo o período da análise.",
        severity: "warning",
      },
      {
        id: "W02",
        title: "Não inclui alterações no website",
        description:
          "A análise identifica e documenta problemas, mas NÃO inclui a implementação das melhorias sugeridas. As correções devem ser realizadas pela equipe de desenvolvimento do cliente ou em produto específico de desenvolvimento.",
        severity: "info",
      },
      {
        id: "W03",
        title: "Não inclui alterações de SEO",
        description:
          "O relatório de usabilidade não cobre otimização de SEO técnico ou de conteúdo. Para otimização para mecanismos de busca, contrate o produto SEO.",
        severity: "info",
      },
      {
        id: "W04",
        title: "Não inclui UX Design",
        description:
          "A análise documenta problemas de usabilidade mas não inclui redesign de telas, prototipação, wireframes ou qualquer entrega de UX Design.",
        severity: "info",
      },
      {
        id: "W05",
        title: "Direitos autorais e responsabilidade",
        description:
          "Todo conteúdo presente no site analisado é de responsabilidade do cliente. A allka não se responsabiliza por uso não autorizado de materiais de terceiros identificados durante a análise.",
        severity: "warning",
      },
    ]),
    access_instructions: JSON.stringify({
      email: null,
      role: null,
      platform: "Site do cliente (acesso público via navegador)",
      steps: [
        "Informe no briefing a URL completa do site a ser analisado",
        "Liste as páginas específicas a analisar ou confirme 'todas as páginas' dentro do limite da variação",
        "Garanta que o site está publicado e acessível durante todo o período de análise",
        "Se houver páginas protegidas por senha (ex: área de membros), informe as credenciais de acesso pelo chat do projeto",
      ],
      removalSteps: [],
      note: "Não é necessário compartilhar acesso administrativo ao site. O nômade analisa o site pelo navegador como um usuário comum, usando ferramentas de diagnóstico (PageSpeed, Tag Assistant, etc.).",
    }),
    execution_terms: JSON.stringify([
      "Analisar as páginas do site conforme as URLs fornecidas no briefing, dentro do limite da variação contratada (5, 10, 20 ou 50 páginas)",
      "Verificar a velocidade de carregamento usando Google PageSpeed Insights — obrigatório: registrar pontuação de desktop e mobile com print de evidência",
      "Testar todos os botões e links em cada página analisada: verificar clicabilidade, redirecionamento correto e identificar links quebrados",
      "Verificar tagueamento: confirmar se tags de analytics (GA4, GTM) e pixels de anúncios estão presentes e disparando usando Tag Assistant do Google e ferramentas equivalentes",
      "Registrar cada problema identificado com print da evidência e descrição clara do impacto para o usuário",
      "Preencher completamente o relatório PA0005-REL-UX com todas as seções: velocidade, navegação/links, tagueamento e recomendações",
      "O relatório deve conter evidências visuais (prints) de todos os problemas encontrados — entrega sem prints não é aceita",
      "Se o site estiver fora do ar ou com páginas inacessíveis durante a execução, notificar o líder e aguardar resolução pelo cliente antes de avançar",
    ]),
    delivery_document: JSON.stringify({
      templateName: "Relatório de Usabilidade UX",
      templateCode: "PA0005-REL-UX",
      requiredSections: [
        "Informações do site analisado (URL, data, variação contratada, número de páginas)",
        "Análise de velocidade — print do PageSpeed Insights (desktop e mobile) com pontuação e problemas identificados",
        "Análise de navegação e fluidez — avaliação do fluxo do usuário entre páginas",
        "Verificação de botões e links — tabela com status de cada elemento testado (OK / quebrado / redirecionamento incorreto)",
        "Verificação de tagueamento — status de cada tag/pixel identificado (ativo / ausente / com erro)",
        "Resumo dos problemas encontrados por grau de impacto (crítico / moderado / leve)",
        "Recomendações de melhoria — lista priorizada com descrição e benefício esperado de cada ação",
      ],
      attachmentRequired: true,
      attachmentStage: "UXAN-E02",
      note: "O relatório PA0005-REL-UX deve ser anexado na etapa E02 antes de marcá-la como concluída. Entrega sem relatório completo com evidências não é aceita.",
    }),
    recurrence_rules: JSON.stringify({
      avulso: {
        expiresAfterDays: 90,
        description:
          "Contratação avulsa válida por até 90 dias. Se não utilizada dentro desse prazo, expira automaticamente. O serviço pode ser contratado novamente a qualquer momento após alterações no site.",
      },
    }),
    presentation: JSON.stringify({
      tagline:
        "Seu site está perdendo clientes por problemas que você não vê. Botões quebrados, carregamento lento, links mortos e tags ausentes são erros silenciosos que custam conversões. A Análise de Usabilidade UX encontra e documenta tudo isso.",
      highlights: [
        "Análise completa de velocidade com Google PageSpeed Insights",
        "Verificação de todos os botões, links e CTA das páginas",
        "Diagnóstico de tagueamento (Analytics, pixels de anúncios)",
        "Relatório estruturado com evidências e recomendações priorizadas",
      ],
      targetAudience: [
        "Empresas que investem em tráfego pago mas têm taxas de conversão abaixo do esperado",
        "Negócios que suspeita que o site tem problemas mas não sabem exatamente quais",
        "Equipes de marketing que precisam de dados concretos para justificar melhorias no site",
        "E-commerces e sites de serviço que querem identificar barreiras na jornada do usuário",
        "Clientes que acabaram de lançar ou redesenhar o site e querem validar a experiência",
      ],
      whatIsIncluded: [
        {
          title: "Análise de velocidade do site",
          description:
            "Verificação completa de performance com Google PageSpeed Insights nas versões desktop e mobile — score, métricas Core Web Vitals e principais gargalos de carregamento.",
        },
        {
          title: "Análise de experiência do usuário",
          description:
            "Avaliação da fluidez de navegação, clareza do fluxo entre páginas, legibilidade e consistência visual dos elementos interativos.",
        },
        {
          title: "Verificação de erros em botões e links",
          description:
            "Teste funcional de todos os botões, CTAs e links nas páginas analisadas — identificação de elementos quebrados, com redirecionamento incorreto ou não clicáveis.",
        },
        {
          title: "Verificação de tagueamento",
          description:
            "Diagnóstico do status das tags de analytics (GA4, GTM) e pixels de anúncios — confirmação de disparo correto ou identificação de ausências e erros.",
        },
        {
          title: "Relatório PA0005-REL-UX",
          description:
            "Documento estruturado com evidências (prints), tabela de problemas por grau de impacto e lista priorizada de recomendações de melhoria.",
        },
      ],
      benefits: [
        {
          title: "Otimização da experiência do usuário",
          description:
            "Identificar e corrigir barreiras na navegação aumenta o tempo de permanência no site e reduz a taxa de rejeição — mais visitas que se convertem em oportunidades reais.",
        },
        {
          title: "Decisões impulsionadas por dados",
          description:
            "O relatório entrega evidências concretas — não suposições. Cada problema é documentado com print, localização e impacto, dando base objetiva para priorizar melhorias.",
        },
        {
          title: "Aumento da taxa de conversão",
          description:
            "Botões quebrados, páginas lentas e links mortos são causas diretas de abandono. Encontrar e corrigir esses problemas tem impacto imediato nas conversões.",
        },
        {
          title: "Redução de custos a longo prazo",
          description:
            "Identificar problemas cedo é sempre mais barato que corrigir depois de campanhas pagas já rodando. Análise preventiva evita desperdício de verba publicitária.",
        },
        {
          title: "Melhoria contínua",
          description:
            "A análise pode ser repetida após cada atualização do site, criando um ciclo de melhoria contínua da experiência digital com evidências comparáveis entre versões.",
        },
        {
          title: "Relatório padronizado e didático",
          description:
            "O relatório PA0005-REL-UX é estruturado para ser entendido por qualquer membro da equipe — não apenas por desenvolvedores — com linguagem clara e priorização visual.",
        },
      ],
      deliverables: [
        "Relatório PA0005-REL-UX completo com evidências e recomendações",
        "Análise de velocidade PageSpeed (desktop e mobile) com pontuação e gargalos",
        "Tabela de verificação de botões e links (status de cada elemento testado)",
        "Diagnóstico de tagueamento com status de cada tag/pixel identificado",
        "Lista priorizada de melhorias com descrição do benefício esperado",
      ],
      notIncluded: [
        "Efetuar as alterações sugeridas no website — o relatório aponta melhorias, mas a implementação é separada",
        "Otimização de SEO técnico ou de conteúdo",
        "Criação de conteúdo textual ou redação de páginas",
        "Programação ou desenvolvimento de páginas",
        "UX Design — redesign de telas, wireframes ou prototipação",
        "Elaboração de relatório personalizado com identidade visual do cliente",
      ],
      complementaryProducts: [
        {
          title: "Banner Digital Estático ou Carrossel (até 5 telas)",
          description:
            "Após a análise, renove os criativos das páginas com materiais visuais profissionais que melhoram o engajamento e a taxa de conversão.",
        },
        {
          title: "Copy para páginas web (1000 palavras)",
          description:
            "Reescreva o conteúdo textual das páginas com base nas oportunidades identificadas na análise — headlines, descrições e CTAs otimizados.",
        },
        {
          title: "Configuração de Data Analytics",
          description:
            "Se a análise identificou ausência ou falha no tagueamento, corrija com a instalação completa de GA4, GTM e pixels de anúncios.",
        },
        {
          title: "Edição de vídeo (até 5 min)",
          description:
            "Adicione vídeos profissionais nas páginas estratégicas identificadas na análise para aumentar o engajamento e o tempo de permanência.",
        },
        {
          title: "Alteração de Website ou Loja Virtual (até 10 itens)",
          description:
            "Implemente diretamente as melhorias recomendadas no relatório com até 10 alterações no seu site WordPress.",
        },
        {
          title: "Gestão de Tráfego — Até 2 Campanhas",
          description:
            "Com o site otimizado, maximize o retorno das campanhas pagas — um site com boa usabilidade converte muito mais o tráfego gerado.",
        },
      ],
      requirements: [
        "Site publicado e acessível via URL durante todo o período de análise",
        "Lista das páginas a analisar (ou confirmação de 'todas as páginas') dentro do limite da variação contratada",
        "Credenciais de acesso para páginas protegidas por senha (quando aplicável)",
        "Briefing preenchido com objetivo da análise e principais problemas percebidos pelo cliente",
      ],
      howToRequest: [
        {
          step: "Escolha a variação",
          description:
            "Selecione o número de páginas a analisar: até 5, até 10, até 20 ou até 50 páginas.",
        },
        {
          step: "Preencha o briefing",
          description:
            "Informe a URL do site, as páginas a analisar, o objetivo da análise e os principais problemas percebidos.",
        },
        {
          step: "Aguarde o relatório",
          description:
            "O especialista analisa o site e entrega o relatório PA0005-REL-UX em até 4 a 6 dias úteis, dependendo da variação.",
        },
        {
          step: "Implemente as melhorias",
          description:
            "Use o relatório para priorizar e implementar as correções com sua equipe de desenvolvimento ou contratando os produtos complementares.",
        },
      ],
      faq: [
        {
          question: "O que é incluído na análise de usabilidade?",
          answer:
            "A análise cobre velocidade (PageSpeed Insights), experiência de navegação, verificação funcional de botões e links, e diagnóstico de tagueamento (GA4, GTM, pixels). Tudo documentado no relatório PA0005-REL-UX com prints de evidência.",
        },
        {
          question: "Vocês implementam as melhorias sugeridas?",
          answer:
            "Não. A análise documenta os problemas e recomendações, mas a implementação não está incluída. Para corrigir alterações no site, contrate o produto 'Alteração de Website'. Para instalar tags/pixels, contrate 'Configuração de Data Analytics'.",
        },
        {
          question: "Como são escolhidas as páginas analisadas?",
          answer:
            "Você indica no briefing quais páginas priorizar ou confirma 'todas as páginas' dentro do limite da variação contratada. O especialista seguirá exatamente essa lista.",
        },
        {
          question: "Qual é o formato do relatório entregue?",
          answer:
            "O relatório PA0005-REL-UX é um documento estruturado entregue pelo sistema da plataforma, contendo análise com prints, tabelas de erros e recomendações priorizadas por impacto.",
        },
        {
          question: "Preciso ter Google Analytics ou GTM instalado?",
          answer:
            "Não é pré-requisito. Se o site não tiver tagueamento, o relatório vai identificar isso como ponto de atenção. Para instalar o tagueamento, contrate o produto 'Configuração de Data Analytics'.",
        },
        {
          question: "Posso contratar novamente após atualizar o site?",
          answer:
            "Sim. A análise de usabilidade pode ser repetida sempre que o site sofrer mudanças significativas (redesign, novas páginas, nova campanha). O relatório serve como baseline para comparação.",
        },
      ],
    }),
    base_features: JSON.stringify([
      "Análise de velocidade com Google PageSpeed Insights — desktop e mobile (T01-S01)",
      "Verificação funcional de todos os botões, CTAs e links das páginas analisadas (T01-S02)",
      "Diagnóstico de tagueamento: GA4, GTM e pixels de anúncios (T01-S03)",
      "Relatório PA0005-REL-UX com evidências, tabela de erros e recomendações priorizadas (T02)",
      "2 etapas de execução: E01 Análise → E02 Entrega do Relatório",
      "Prazo: 4 dias úteis (5p/10p) | 5 dias úteis (20p) | 6 dias úteis (50p)",
      "Execução por nômade habilitado — Especialidade UX Design",
    ]),
    tasks: JSON.stringify([
      {
        id: "UXAN-T01",
        name: "Análise de Usabilidade UX",
        description:
          "Análise completa das páginas indicadas no briefing: velocidade (PageSpeed Insights), navegação e fluidez, verificação funcional de botões e links, e diagnóstico de tagueamento (GA4, GTM, pixels de anúncios).",
        taskCategory: "Execução",
        objective:
          "Identificar e documentar todos os problemas de usabilidade, performance e tagueamento nas páginas analisadas, com evidências visuais para cada problema encontrado.",
        dependencies: [],
        canRunInParallel: false,
        requiresAccess: false,
        executionRules: [
          "Analisar exatamente as páginas listadas no briefing, dentro do limite da variação contratada",
          "Executar Google PageSpeed Insights em versão desktop E mobile para cada página — registrar pontuações",
          "Testar todos os botões e links de cada página: clicar em cada elemento e registrar o status (OK / quebrado / redirecionamento incorreto)",
          "Verificar tagueamento com Tag Assistant do Google: confirmar se GA4, GTM e pixels estão ativos e disparando",
          "Cada problema identificado deve ter print de evidência e descrição do impacto",
          "Se o site estiver fora do ar durante a análise, notificar o líder imediatamente antes de prosseguir",
        ],
        calculatedCost: 67,
        questionnaire: null,
        steps: [
          {
            id: "UXAN-T01-S01",
            name: "Análise de Velocidade e Performance",
            description:
              "Executar Google PageSpeed Insights (desktop e mobile) em cada página a analisar. Registrar pontuação, Core Web Vitals (LCP, CLS, FID/INP) e principais oportunidades de melhoria.",
            order: 1,
            estimatedHours: 0.5,
            specialtyId: 1,
            specialty: 1,
            experienceLevel: "pleno",
            calculatedCost: 22,
            internalGuidance:
              "Usar pagespeed.web.dev. Fazer print da aba 'Performance' com a pontuação visível. Registrar as 3 maiores oportunidades de melhoria apontadas pela ferramenta.",
          },
          {
            id: "UXAN-T01-S02",
            name: "Análise de Navegação, Botões e Links",
            description:
              "Avaliar a fluidez da navegação entre páginas e testar funcionalmente todos os botões, CTAs e links de cada página analisada.",
            order: 2,
            estimatedHours: 0.75,
            specialtyId: 1,
            specialty: 1,
            experienceLevel: "pleno",
            calculatedCost: 33,
            internalGuidance:
              "Criar uma tabela: página → elemento (botão/link) → status (OK/quebrado/redirecionamento errado). Testar em desktop e mobile. Registrar URL de destino real vs. esperado.",
          },
          {
            id: "UXAN-T01-S03",
            name: "Verificação de Tagueamento",
            description:
              "Verificar quais tags de analytics e pixels de anúncios estão instalados no site e se estão disparando corretamente, usando Tag Assistant do Google e ferramentas de diagnóstico de pixels.",
            order: 3,
            estimatedHours: 0.25,
            specialtyId: 1,
            specialty: 1,
            experienceLevel: "pleno",
            calculatedCost: 11,
            internalGuidance:
              "Usar a extensão Tag Assistant Legacy ou Tag Assistant Companion do Google Chrome. Para Meta Pixel, usar Meta Pixel Helper. Registrar cada tag encontrada: nome, status (disparando/com erro/ausente), page_view confirmado.",
          },
        ],
      },
      {
        id: "UXAN-T02",
        name: "Relatório de Usabilidade e Entrega",
        description:
          "Compilação de todos os dados coletados durante a análise, preenchimento completo do relatório PA0005-REL-UX com evidências e lista priorizada de recomendações, e envio ao cliente.",
        taskCategory: "Entrega",
        objective:
          "Entregar o relatório PA0005-REL-UX completo com evidências de todos os problemas encontrados e recomendações priorizadas por impacto.",
        dependencies: ["UXAN-T01"],
        canRunInParallel: false,
        requiresAccess: false,
        executionRules: [
          "Preencher todas as seções obrigatórias do relatório PA0005-REL-UX",
          "Cada problema deve ter print de evidência, descrição e classificação de impacto (crítico / moderado / leve)",
          "A lista de recomendações deve ser priorizada da mais impactante para a menos urgente",
          "Não entregar relatório com seções em branco ou sem evidências visuais",
          "Anexar o relatório na etapa E02 antes de marcá-la como concluída",
        ],
        calculatedCost: 22,
        questionnaire: null,
        steps: [
          {
            id: "UXAN-T02-S01",
            name: "Preenchimento e Entrega do Relatório PA0005-REL-UX",
            description:
              "Compilar todas as evidências coletadas, preencher o relatório PA0005-REL-UX em todas as seções obrigatórias e anexar na plataforma para aprovação do cliente.",
            order: 1,
            estimatedHours: 0.5,
            specialtyId: 1,
            specialty: 1,
            experienceLevel: "pleno",
            calculatedCost: 22,
            internalGuidance:
              "Seções obrigatórias: (1) dados do site, (2) velocidade com prints, (3) navegação e links (tabela), (4) tagueamento (tabela), (5) resumo por grau de impacto, (6) recomendações priorizadas. Não deixar nenhuma seção sem conteúdo.",
          },
        ],
      },
    ]),
    stages: JSON.stringify([
      {
        id: "UXAN-E01",
        code: "UXAN-E01",
        number: 1,
        name: "Análise de Usabilidade UX",
        description:
          "Análise completa das páginas: velocidade (PageSpeed Insights), navegação, botões, links e tagueamento — com coleta de evidências para o relatório.",
        category: "Execução",
        deliveryDeadlineDays: 3,
        executionDeadlineDays: 3,
        approvalDeadlineDays: 10,
        executionHours: 1.5,
        value: 67,
        itemLimit: 1,
        specialtyId: 1,
        experienceLevel: "pleno",
        isInternal: false,
        viewAccesses: false,
        keepSameNomad: true,
        delegateToLeader: false,
        requiresFinalFiles: false,
        hideInProducts: false,
        internalGuidance:
          "Coletar todos os prints de evidência durante a análise. Para variações maiores (V03/V04), o prazo de execução é maior — respeitar o prazo da variação contratada.",
      },
      {
        id: "UXAN-E02",
        code: "UXAN-E02",
        number: 2,
        name: "Entrega do Relatório de Usabilidade",
        description:
          "Preenchimento do relatório PA0005-REL-UX com todas as evidências coletadas na E01 e entrega para aprovação do cliente.",
        category: "Entrega",
        deliveryDeadlineDays: 4,
        executionDeadlineDays: 1,
        approvalDeadlineDays: 10,
        executionHours: 0.5,
        value: 22,
        itemLimit: 1,
        specialtyId: 1,
        experienceLevel: "pleno",
        isInternal: false,
        viewAccesses: false,
        keepSameNomad: true,
        delegateToLeader: false,
        requiresFinalFiles: true,
        hideInProducts: false,
        internalGuidance:
          "Relatório PA0005-REL-UX com todas as seções e evidências obrigatório antes de marcar E02 como concluída. Não entregar sem prints.",
      },
    ]),
    questionnaire: JSON.stringify({
      id: "UXAN-Q",
      title: "Briefing — Análise de Usabilidade UX",
      description:
        "Preencha as informações do site a ser analisado. Quanto mais detalhado, mais assertiva será a análise e mais úteis serão as recomendações.",
      briefingTitle: "Briefing de Usabilidade UX",
      briefingInstructions:
        "Gere um documento de briefing para análise de usabilidade: URL do site, páginas a analisar, objetivos da análise, público-alvo, problemas percebidos e dispositivos prioritários.",
      questions: [
        {
          id: "UXAN-Q01",
          question: "URL completa do site a ser analisado",
          type: "text",
          required: true,
          options: [],
          aiAssisted: false,
          section: "Site",
          briefingKey: "urlSite",
          aiContext: "Endereço completo do site a analisar",
          placeholder: "Ex: https://www.seusite.com.br",
          warning:
            "O site deve estar publicado e acessível. A análise não pode ser realizada em sites offline, em manutenção ou em ambiente de testes sem acesso.",
        },
        {
          id: "UXAN-Q02",
          question: "Quais páginas devem ser analisadas?",
          type: "multiline",
          required: true,
          options: [],
          aiAssisted: false,
          section: "Páginas",
          briefingKey: "paginasAnalisar",
          aiContext:
            "Lista das páginas específicas a analisar (URLs ou nomes), dentro do limite da variação contratada",
          placeholder:
            "Ex: Homepage | Página de Serviços | Página de Contato | Blog | Página de Produto\n\nOu: Todas as páginas do menu principal",
          warning:
            "Informe exatamente as páginas dentro do limite da variação contratada (5, 10, 20 ou 50 páginas). Páginas não listadas não serão analisadas.",
        },
        {
          id: "UXAN-Q03",
          question: "Qual é o objetivo principal desta análise?",
          type: "multiline",
          required: true,
          options: [],
          aiAssisted: true,
          section: "Objetivo",
          briefingKey: "objetivoAnalise",
          aiContext:
            "Objetivo estratégico da análise de usabilidade: melhorar conversão, identificar problemas antes de campanha, validar redesign, etc.",
          placeholder:
            "Ex: Quero identificar por que os visitantes não chegam até a página de contato | Vou rodar campanhas e preciso que o site converta bem | Acabei de redesenhar o site e quero validar",
          warning:
            "Quanto mais específico o objetivo, mais direcionadas serão as recomendações do relatório.",
        },
        {
          id: "UXAN-Q04",
          question: "Qual é o público-alvo do site?",
          type: "multiline",
          required: false,
          options: [],
          aiAssisted: true,
          section: "Público",
          briefingKey: "publicoAlvo",
          aiContext:
            "Perfil do público-alvo do site: quem são os visitantes esperados, faixa etária, contexto de uso",
          placeholder:
            "Ex: Empresários de pequenas empresas, entre 30 e 50 anos, que acessam principalmente pelo celular | Jovens que buscam produtos de moda, acessam pelo Instagram",
        },
        {
          id: "UXAN-Q05",
          question: "Quais problemas você já percebe no site?",
          type: "multiline",
          required: false,
          options: [],
          aiAssisted: false,
          section: "Problemas",
          briefingKey: "problemasPercebidos",
          aiContext:
            "Problemas já identificados ou suspeitos pelo cliente: páginas lentas, botões que não funcionam, alto bounce rate, etc.",
          placeholder:
            "Ex: A página de contato carrega lento | O botão de WhatsApp não aparece no celular | Clientes dizem que o site trava no checkout",
          warning:
            "Relatar problemas percebidos ajuda o especialista a focar nas áreas mais críticas e verificar hipóteses específicas.",
        },
        {
          id: "UXAN-Q06",
          question: "Qual dispositivo é prioritário para a análise?",
          type: "select",
          required: true,
          options: [
            "Desktop (prioridade para computadores)",
            "Mobile (prioridade para celulares)",
            "Ambos — desktop e mobile com peso igual",
          ],
          aiAssisted: false,
          section: "Dispositivo",
          briefingKey: "dispositivo",
          aiContext: "Dispositivo prioritário para a análise de usabilidade",
          placeholder: "Selecione",
          warning:
            "A análise de PageSpeed sempre inclui desktop e mobile. Esta resposta define qual dispositivo recebe mais atenção na análise de navegação e usabilidade.",
        },
        {
          id: "UXAN-Q07",
          question: "Observações adicionais",
          type: "multiline",
          required: false,
          options: [],
          aiAssisted: false,
          section: "Complemento",
          briefingKey: "observacoes",
          aiContext:
            "Informações adicionais relevantes para a análise: histórico de alterações, integrações específicas, contexto adicional",
          placeholder:
            "Ex: O site usa WooCommerce | Tenho GA4 instalado mas suspeito que não está funcionando | O site foi redesenhado em fevereiro de 2026",
        },
      ],
    }),
    nomad_tests: JSON.stringify([
      {
        id: "UXAN-TEST01",
        code: "UXAN-TEST01",
        name: "Teste de Habilitação — Análise de Usabilidade UX",
        description:
          "O nômade deve realizar uma análise completa de usabilidade em um site fictício, demonstrando domínio das ferramentas de diagnóstico (PageSpeed, Tag Assistant), verificação de botões/links e preenchimento do relatório PA0005-REL-UX com evidências.",
        linkedTaskId: "UXAN-T01",
        linkedTaskName: "Análise de Usabilidade UX",
        fakeClientName: "Floricultura Bella Rosa",
        fakeObjective:
          "Identificar problemas de usabilidade no site da Floricultura Bella Rosa antes de iniciar uma campanha de Google Ads para o Dia das Mães.",
        fakeContext:
          "Site: bellarosa.com.br (simulado). Páginas a analisar (5 páginas — variação V01): Homepage, Catálogo de Flores, Página de Produto (Buquê de Rosas Vermelhas), Contato e Sobre Nós. Público-alvo: mulheres entre 25 e 55 anos, acesso principalmente mobile. Problemas percebidos pelo cliente: 'o site parece lento e não sei se o botão de WhatsApp está funcionando no celular'. Dispositivo prioritário: mobile. O site tem GA4 instalado mas o cliente não sabe se está funcionando. Não tem Meta Pixel.",
        fakeDeliverables: [
          "Print do Google PageSpeed Insights da homepage — versão desktop E mobile — com pontuação e principais oportunidades apontadas",
          "Tabela de verificação de todos os botões e links das 5 páginas analisadas (status: OK / quebrado / redirecionamento incorreto)",
          "Resultado da verificação de tagueamento: status do GA4, presença ou ausência de Meta Pixel, qualquer outro tag identificado",
          "Relatório PA0005-REL-UX preenchido com todas as seções obrigatórias e evidências de cada problema encontrado",
        ],
        evaluationCriteria: [
          "PageSpeed executado com print de pontuação visível (desktop e mobile)",
          "Todos as 5 páginas analisadas com tabela de botões/links preenchida",
          "Status do GA4 verificado com ferramenta de diagnóstico",
          "Ausência do Meta Pixel registrada como ponto de atenção",
          "Relatório com todas as seções obrigatórias preenchidas",
          "Cada problema documentado com print de evidência e descrição de impacto",
          "Lista de recomendações priorizada por impacto",
        ],
        passingScore: 70,
        timeLimit: 90,
        enablesAdditionalTasks: [
          {
            taskId: "UXAN-T01",
            taskName: "Análise de Usabilidade UX",
            productId: "UXAN-0001",
            productName: "Análise de Usabilidade UX",
          },
          {
            taskId: "UXAN-T02",
            taskName: "Relatório de Usabilidade e Entrega",
            productId: "UXAN-0001",
            productName: "Análise de Usabilidade UX",
          },
        ],
        isActive: true,
        createdAt: "2026-01-15T09:00:00Z",
        preCircuit: {
          welcomeTitle:
            "Bem-vindo ao Circuito de Habilitação — Análise de Usabilidade UX",
          welcomeSubtitle:
            "Você está prestes a se habilitar para realizar análises de usabilidade pela allka. Leia com atenção antes de começar.",
          welcomeHighlights: [
            "Análise prática em site fictício com briefing completo",
            "Até 90 minutos para completar",
            "Nota mínima de aprovação: 70 pontos",
            "Aprovação habilita você para todas as variações do produto",
          ],
          aboutDescription:
            "Neste teste você vai analisar o site fictício da Floricultura Bella Rosa, demonstrando domínio das ferramentas de diagnóstico (PageSpeed Insights, Tag Assistant), verificação funcional de botões e links, e preenchimento do relatório PA0005-REL-UX com evidências de cada problema encontrado.",
          aboutWhatToExpect: [
            "Ler o briefing completo da Floricultura Bella Rosa (objetivo, páginas, problemas percebidos)",
            "Executar Google PageSpeed Insights nas páginas indicadas e registrar os resultados",
            "Verificar funcionalmente todos os botões, CTAs e links das 5 páginas analisadas",
            "Verificar o tagueamento com Tag Assistant (GA4 e Meta Pixel)",
            "Preencher o relatório PA0005-REL-UX com evidências e recomendações priorizadas",
          ],
          estimatedTime: "90 minutos",
          rules: [
            "Use ferramentas reais: Google PageSpeed Insights (pagespeed.web.dev) e Tag Assistant do Google Chrome",
            "Cada problema deve ser documentado com print de evidência — sem print não é aceito",
            "O relatório deve ter todas as seções preenchidas, sem campos em branco",
            "As recomendações devem ser priorizadas da mais crítica para a menos urgente",
            "Não inclua sugestões de redesign — apenas problemas funcionais e de performance",
          ],
          warnings: [
            "Relatórios sem evidências visuais (prints) são automaticamente reprovados",
            "A análise cobre usabilidade e performance — NÃO inclui sugestões de SEO ou redesign",
          ],
          confirmChecklist: [
            "Li o briefing completo da Floricultura Bella Rosa",
            "Tenho a extensão Tag Assistant ou Tag Assistant Companion instalada no Chrome",
            "Sei usar o Google PageSpeed Insights e registrar os resultados",
            "Entendo que cada problema precisa de print de evidência",
            "Tenho 90 minutos disponíveis para completar o teste",
          ],
        },
        qualificationChecklist: {
          id: "UXAN-TEST01-CL",
          linkedTestId: "UXAN-TEST01",
          linkedTestName: "Teste de Habilitação — Análise de Usabilidade UX",
          passingScore: 70,
          autoApproveAbove: 90,
          autoRejectBelow: 40,
          allowPartialCorrection: true,
          internalNotes:
            "Avaliar especialmente: (1) presença de prints de evidência em cada problema — ausência = falha crítica; (2) verificação de tagueamento com ferramenta de diagnóstico; (3) lista de recomendações priorizada e coerente.",
          sections: [
            {
              id: "CL5-S01",
              title: "Análise de Velocidade",
              description: "Avaliação do diagnóstico de velocidade realizado",
              items: [
                {
                  id: "CL5-S01-I01",
                  label: "PageSpeed executado com print de pontuação visível",
                  description:
                    "O relatório contém print do Google PageSpeed Insights com a pontuação e métricas visíveis",
                  weight: 5,
                  isRequired: true,
                  hint: "Print deve mostrar a pontuação de performance e pelo menos 2 métricas Core Web Vitals",
                },
                {
                  id: "CL5-S01-I02",
                  label: "Análise realizada para mobile E desktop",
                  description:
                    "O relatório registra as pontuações de pelo menos 2 versões: mobile e desktop",
                  weight: 4,
                  isRequired: true,
                  hint: "PageSpeed tem abas separadas para mobile e desktop — ambas devem ser registradas",
                },
                {
                  id: "CL5-S01-I03",
                  label: "Principais oportunidades de melhoria listadas",
                  description:
                    "O relatório lista as principais oportunidades de melhoria de velocidade apontadas pelo PageSpeed",
                  weight: 3,
                  isRequired: false,
                  hint: "Ver seção 'Oportunidades' no relatório — listar pelo menos as 3 mais impactantes",
                },
              ],
            },
            {
              id: "CL5-S02",
              title: "Navegação, Botões e Links",
              description:
                "Avaliação da verificação funcional de botões e links",
              items: [
                {
                  id: "CL5-S02-I01",
                  label:
                    "Tabela de botões e links preenchida para todas as páginas",
                  description:
                    "O relatório contém tabela com status (OK/quebrado/erro) de cada botão e link das 5 páginas analisadas",
                  weight: 5,
                  isRequired: true,
                  hint: "Verificar se todas as 5 páginas estão na tabela com seus respectivos elementos",
                },
                {
                  id: "CL5-S02-I02",
                  label: "Problemas funcionais documentados com print",
                  description:
                    "Cada problema de botão ou link identificado tem print de evidência e descrição de impacto",
                  weight: 4,
                  isRequired: true,
                  hint: "Sem print = sem evidência = não aceito. Verificar cada item marcado como 'quebrado' ou 'erro'",
                },
                {
                  id: "CL5-S02-I03",
                  label: "Análise realizada em dispositivo mobile",
                  description:
                    "A verificação de botões e links foi realizada ou simulada no contexto mobile (dado que o briefing prioriza mobile)",
                  weight: 3,
                  isRequired: false,
                  hint: "Pode usar DevTools do Chrome para simular mobile. Verificar se botões são clicáveis no tamanho de tela mobile",
                },
              ],
            },
            {
              id: "CL5-S03",
              title: "Tagueamento",
              description: "Avaliação da verificação de tagueamento",
              items: [
                {
                  id: "CL5-S03-I01",
                  label: "Tagueamento verificado com ferramenta de diagnóstico",
                  description:
                    "O relatório registra o resultado da verificação com Tag Assistant ou ferramenta equivalente",
                  weight: 4,
                  isRequired: true,
                  hint: "Print do Tag Assistant mostrando as tags identificadas — GA4 status e ausência do Meta Pixel documentados",
                },
                {
                  id: "CL5-S03-I02",
                  label:
                    "Ausência do Meta Pixel documentada como ponto de atenção",
                  description:
                    "O relatório registra que o Meta Pixel não foi encontrado e inclui isso nas recomendações",
                  weight: 3,
                  isRequired: false,
                  hint: "A ausência de tagueamento importante deve ser documentada como oportunidade de melhoria",
                },
              ],
            },
            {
              id: "CL5-S04",
              title: "Relatório de Entrega",
              description:
                "Avaliação do preenchimento do relatório PA0005-REL-UX",
              items: [
                {
                  id: "CL5-S04-I01",
                  label:
                    "Todas as seções obrigatórias do relatório preenchidas",
                  description:
                    "Nenhuma seção obrigatória do PA0005-REL-UX está em branco ou com placeholder",
                  weight: 5,
                  isRequired: true,
                  hint: "Verificar seção a seção: dados do site, velocidade, links/botões, tagueamento, resumo por impacto, recomendações",
                },
                {
                  id: "CL5-S04-I02",
                  label: "Problemas classificados por grau de impacto",
                  description:
                    "Os problemas encontrados são classificados como crítico, moderado ou leve",
                  weight: 3,
                  isRequired: false,
                  hint: "A classificação por impacto ajuda o cliente a priorizar o que corrigir primeiro",
                },
                {
                  id: "CL5-S04-I03",
                  label: "Lista de recomendações priorizada e coerente",
                  description:
                    "As recomendações são ordenadas da mais impactante para a menos urgente e são acionáveis",
                  weight: 4,
                  isRequired: true,
                  hint: "Cada recomendação deve ser específica (ex: 'otimizar imagem da homepage — está com 4.2MB') — não genérica",
                },
              ],
            },
          ],
        },
      },
    ]),
    variations_internal: JSON.stringify({
      "UXAN-V01": {
        label: "Até 5 páginas",
        code: "PA0005-V01",
        publicDeadlineLabel: "4 dias úteis",
        executionHours: 2,
      },
      "UXAN-V02": {
        label: "Até 10 páginas",
        code: "PA0005-V02",
        publicDeadlineLabel: "4 dias úteis",
        executionHours: 3,
      },
      "UXAN-V03": {
        label: "Até 20 páginas",
        code: "PA0005-V03",
        publicDeadlineLabel: "5 dias úteis",
        executionHours: 4,
      },
      "UXAN-V04": {
        label: "Até 50 páginas",
        code: "PA0005-V04",
        publicDeadlineLabel: "6 dias úteis",
        executionHours: 7,
      },
    }),
    portfolio_images: JSON.stringify([
      {
        id: "uxan-img-01",
        url: "/images/products/ux-analysis.svg",
        title: "Visão Geral do Produto",
        description:
          "Análise de Usabilidade UX — painel de diagnóstico completo",
        isMain: true,
        sortOrder: 0,
      },
      {
        id: "uxan-img-02",
        url: "/images/products/ux-analysis-portfolio-01.svg",
        title: "Análise de Velocidade",
        description:
          "PageSpeed Insights com Core Web Vitals e oportunidades de melhoria",
        isMain: false,
        sortOrder: 1,
      },
      {
        id: "uxan-img-03",
        url: "/images/products/ux-analysis-portfolio-02.svg",
        title: "Navegação e Links",
        description:
          "Mapa de páginas com marcadores de problemas e tabela de verificação",
        isMain: false,
        sortOrder: 2,
      },
      {
        id: "uxan-img-04",
        url: "/images/products/ux-analysis-portfolio-03.svg",
        title: "Relatório de Entrega",
        description:
          "Relatório PA0005-REL-UX com diagnóstico, evidências e recomendações priorizadas",
        isMain: false,
        sortOrder: 3,
      },
    ]),
  };

  await prisma.productMeta.upsert({
    where: { product_id: "UXAN-0001" },
    update: meta,
    create: meta,
  });
  console.log("✅ Meta criada para UXAN-0001");

  console.log(
    "\n✅ Seed PA0005 concluído com sucesso!\n" +
      "   Produto:    UXAN-0001 — Análise de Usabilidade UX\n" +
      "   SKU:        PA0005\n" +
      "   Variações:  UXAN-V01 (5p R$90.72) | UXAN-V02 (10p R$136.08)\n" +
      "               UXAN-V03 (20p R$181.44) | UXAN-V04 (50p R$317.52)\n" +
      "   Prazos:     4d / 4d / 5d / 6d\n" +
      "   Relatório:  PA0005-REL-UX\n" +
      "   Teste:      UXAN-TEST01 — Floricultura Bella Rosa\n"
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed PA0005:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
