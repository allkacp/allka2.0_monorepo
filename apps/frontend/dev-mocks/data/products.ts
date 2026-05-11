// Mock products — shape 100% compatível com BackendProduct / backendToFrontendProduct adapter.
// ATENÇÃO: este array deve conter APENAS os produtos reais da plataforma.
// Nunca adicionar produtos genéricos, de teste ou de exemplo aqui.
// Especialidades: 6 = Tráfego Pago | 2 = Copywriting | 1 = Design Gráfico | 3 = Social Media
export type ProductCategory =
  | "consultoria"
  | "desenvolvimento"
  | "design"
  | "marketing"
  | "treinamento"
  | "outros"
  | "Performance e Anúncios Patrocinados"
  | "Design e Criação";
export type ProductStatus = "active" | "inactive" | "draft";

export interface MockProduct {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  tags: string | null; // JSON string[] serializado
  base_price: number;
  complexity: string;
  visibility: string | null;
  image: string | null;
  demonstrations: string | null;
  completion_time: string | null;
  metadata: string | null; // JSON ProductMetadata serializado
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variations?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    price_modifier: number;
    deadline_days: number | null;
    scope_description: string | null;
    features: string | null;
    sort_order: number;
    is_active: boolean;
  }>;
  addons?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
  }>;
  // campos legados mantidos para compatibilidade com filtros do mock-api-client
  status?: ProductStatus;
  price?: number;
  unit?: string;
  sku?: string | null;
}

// ─── Produtos reais da plataforma ─────────────────────────────────────────────
// Fonte única de verdade para o modo mock local.
// Apenas os 2 produtos reais que estamos estruturando devem existir aqui.

// ════════════════════════════════════════════════════════════════════════════
// PA0001 — GESTÃO DE TRÁFEGO
// ════════════════════════════════════════════════════════════════════════════

const trafegoMeta = {
  complementaryProductIds: ["DC0002", "PA0002", "PA0004", "PA0005"],
  recurrence: "Mensal",
  deliveryDays: "30",
  summaryDescription:
    "Gestão completa de campanhas de tráfego pago por especialista certificado, com relatório mensal e foco em resultado.",
  finalPrice: 1200,
  itemLimit: 1,
  totalExecutionHours: 18,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
    tagline:
      "Campanhas de tráfego pago gerenciadas por especialistas certificados, com relatório mensal e foco em resultado.",
    highlights: [
      "Gestão profissional no Meta Ads e/ou Google Ads",
      "Volume de campanhas e plataformas conforme a opção contratada",
      "Otimização semanal com ajustes de segmentação e orçamento",
      "Relatório mensal detalhado com métricas e próximos passos",
    ],
    targetAudience: [
      "Empresas que querem aumentar vendas ou gerar leads de forma previsível",
      "Negócios que já investem em mídia paga e precisam de gestão especializada",
      "Empreendedores que nunca anunciaram e querem começar do jeito certo",
      "E-commerces e prestadores de serviço que buscam escala com controle de CAC",
    ],
    whatIsIncluded: [
      {
        title: "Onboarding e diagnóstico",
        description:
          "Reunião de briefing, análise do histórico de campanhas existentes e diagnóstico completo antes de qualquer ação.",
      },
      {
        title: "Configuração e ativação das campanhas",
        description:
          "Criação ou reestruturação de campanhas, conjuntos de anúncios, segmentação de público e definição de orçamentos.",
      },
      {
        title: "Monitoramento e otimizações semanais",
        description:
          "Análise de métricas, ajustes de lances, pausas de anúncios de baixo desempenho e testes contínuos.",
      },
      {
        title: "Relatório mensal de performance",
        description:
          "Documento completo com resultados do período: impressões, cliques, conversões, CAC, ROAS e próximos passos.",
      },
      {
        title: "Gestão por nômade habilitado",
        description:
          "Execução realizada exclusivamente por profissional habilitado na especialidade Tráfego Pago.",
      },
    ],
    deliverables: [
      "Relatório mensal de performance em PDF",
      "Acesso às campanhas estruturadas e ativas no gerenciador de anúncios",
      "Registro de todas as otimizações realizadas no período",
      "Plano de ação para o próximo mês",
    ],
    notIncluded: [
      "Criação de criativos (imagens, vídeos, textos) — pode ser adquirido como add-on",
      "Investimento em mídia (verba de anúncio) — pago diretamente pelo cliente nas plataformas",
      "Gestão de redes sociais orgânicas",
      "Desenvolvimento de landing pages ou sites",
    ],
    requirements: [
      "Acesso de administrador ao gerenciador de anúncios (Meta Business ou Google Ads)",
      "Pixel ou tag de conversão instalado no site (ou disponibilidade para instalar)",
      "Briefing completo preenchido com objetivo, público e orçamento de mídia",
    ],
    howToRequest: [
      {
        step: "Selecione a opção",
        description:
          "Escolha a opção que melhor se encaixa no número de campanhas que você precisa gerenciar.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Responda ao questionário com objetivo, público-alvo, orçamento de mídia e acesso às plataformas.",
      },
      {
        step: "Onboarding com o especialista",
        description:
          "O nômade habilitado entra em contato para a reunião de onboarding (dentro dos primeiros 3 dias).",
      },
      {
        step: "Acompanhe o progresso",
        description:
          "Visualize as etapas de execução pelo painel do projeto e receba o relatório mensal ao final.",
      },
    ],
    faq: [
      {
        question: "O investimento em mídia está incluso?",
        answer:
          "Não. O valor da Gestão de Tráfego cobre apenas o trabalho de gestão (configuração, otimização, relatório). A verba de mídia é paga diretamente pelo cliente nas plataformas (Meta ou Google).",
      },
      {
        question: "Em quais plataformas posso anunciar?",
        answer:
          "Meta Ads (Facebook e Instagram), Google Ads e TikTok Ads, conforme a opção contratada. A opção Básica inclui até 2 plataformas; a Premium inclui até 3.",
      },
      {
        question: "Preciso ter campanhas já criadas?",
        answer:
          "Não. O serviço inclui a etapa de configuração completa. Se você já tiver campanhas ativas, o especialista fará um diagnóstico e reestruturação se necessário.",
      },
      {
        question: "Posso cancelar antes de completar o mês?",
        answer:
          "O contrato é mensal. O cancelamento é válido a partir do próximo ciclo. Não há reembolso proporcional para cancelamentos dentro do mês vigente.",
      },
      {
        question: "Como funcionam as otimizações semanais?",
        answer:
          "O especialista revisa as métricas toda semana, faz ajustes de segmentação, lances e criativos conforme necessário, e registra todas as ações no histórico do projeto.",
      },
    ],
  },

  // ── Features base — em todas as opções ──────────────────────────────────
  baseFeatures: [
    "Onboarding e diagnóstico inicial de campanhas (T01 — 2h)",
    "Configuração, segmentação e ativação das campanhas (T02 — 3h)",
    "Monitoramento e otimizações semanais ao longo do mês (T03)",
    "Relatório mensal de performance com métricas e próximos passos (T04 — 2h)",
    "7 etapas de execução estruturadas: E01 → E07",
    "Execução por nômade habilitado — Especialidade Tráfego Pago",
  ],

  // ── Tarefas ──────────────────────────────────────────────────────────────
  tasks: [
    {
      id: "PA0001-T01",
      name: "Onboarding e Diagnóstico",
      description:
        "Reunião de briefing com o cliente, análise de campanhas existentes e diagnóstico completo antes da ativação.",
      taskCategory: "Planejamento",
      objective:
        "Entender os objetivos do cliente, histórico de campanhas e definir a estratégia inicial.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Agendar reunião de onboarding em até 48h após contratação",
        "Documentar todos os acessos recebidos antes de iniciar",
        "O briefing preenchido pelo cliente deve ser revisado antes da reunião",
      ],
      calculatedCost: 120,
      questionnaire: null,
      steps: [
        {
          id: "PA0001-T01-S01",
          name: "Reunião de Briefing",
          description:
            "Conduzir reunião estruturada para levantar objetivos, público-alvo, orçamento de mídia, histórico e acessos.",
          order: 1,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 40,
          internalGuidance:
            "Use o template de briefing de tráfego. Confirme acesso ao gerenciador de anúncios e pixel instalado.",
        },
        {
          id: "PA0001-T01-S02",
          name: "Diagnóstico de Campanhas Existentes",
          description:
            "Analisar histórico de campanhas, identificar pontos de melhoria e documentar diagnóstico.",
          order: 2,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 60,
          internalGuidance:
            "Se não houver campanhas anteriores, documentar o diagnóstico de mercado e plataformas recomendadas.",
        },
      ],
    },
    {
      id: "PA0001-T02",
      name: "Configuração e Ativação das Campanhas",
      description:
        "Criação ou reestruturação de campanhas, conjuntos de anúncios, segmentação e definição de orçamentos.",
      taskCategory: "Execução",
      objective:
        "Ter todas as campanhas estruturadas, segmentadas e ativas conforme a estratégia definida no onboarding.",
      dependencies: ["PA0001-T01"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Nunca ativar campanha sem aprovação prévia do cliente no checklist de revisão",
        "Registrar print de todas as configurações antes de publicar",
        "Nomear campanhas, conjuntos e anúncios seguindo o padrão: [Produto]-[Objetivo]-[Público]-[Data]",
      ],
      calculatedCost: 180,
      questionnaire: null,
      steps: [
        {
          id: "PA0001-T02-S01",
          name: "Estruturação de Campanhas e Conjuntos",
          description:
            "Criar a estrutura de campanhas, conjuntos de anúncios e anúncios conforme o número de campanhas da opção contratada.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 120,
          internalGuidance:
            "Siga a estrutura: 1 campanha por objetivo (Conversão, Tráfego, Geração de Leads). Limite-se ao número de campanhas da opção.",
        },
        {
          id: "PA0001-T02-S02",
          name: "Configuração de Segmentação e Orçamentos",
          description:
            "Definir públicos (interesse, lookalike, remarketing), orçamentos por conjunto e lances iniciais.",
          order: 2,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 60,
          internalGuidance:
            "Configurar pelo menos 3 públicos distintos. Orçamento inicial conservador (CBO ou ABO conforme briefing).",
        },
      ],
    },
    {
      id: "PA0001-T03",
      name: "Monitoramento e Otimização Semanal",
      description:
        "Análise semanal de métricas, ajustes de segmentação, lances, orçamentos e criativos ao longo do mês.",
      taskCategory: "Recorrência",
      objective:
        "Manter as campanhas otimizadas continuamente, pausar o que não performa e escalar o que funciona.",
      dependencies: ["PA0001-T02"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Revisar métricas toda semana (mínimo 1x por semana)",
        "Registrar todas as ações realizadas no log do projeto",
        "Nunca alterar mais de um elemento por vez em teste A/B",
        "Alertar o cliente imediatamente caso o CAC ultrapasse 30% do meta estabelecido",
      ],
      calculatedCost: 480,
      questionnaire: null,
      steps: [
        {
          id: "PA0001-T03-S01",
          name: "Análise de Métricas e Ajustes Semanais",
          description:
            "Revisar CTR, CPC, CPM, conversões, ROAS e fazer ajustes de lances, públicos e criativos.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 120,
          internalGuidance:
            "Executar 4 vezes ao longo do mês (uma por semana). Registrar cada sessão no log com data, métricas e ações tomadas.",
        },
      ],
    },
    {
      id: "PA0001-T04",
      name: "Relatório Mensal de Performance",
      description:
        "Compilação de todos os dados do mês, análise de resultados e entrega do relatório com plano para o próximo ciclo.",
      taskCategory: "Entrega",
      objective:
        "Entregar ao cliente um relatório completo com métricas, análise e recomendações para o próximo mês.",
      dependencies: ["PA0001-T03"],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Relatório deve ser entregue até o dia 30 do mês vigente",
        "Incluir comparativo com o mês anterior (quando disponível)",
        "Toda métrica deve ter benchmark de referência do setor",
      ],
      calculatedCost: 120,
      questionnaire: null,
      steps: [
        {
          id: "PA0001-T04-S01",
          name: "Compilação e Análise dos Dados",
          description:
            "Exportar dados das plataformas, organizar métricas principais e redigir análise do período.",
          order: 1,
          estimatedHours: 1.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 60,
          internalGuidance:
            "Use o template padrão de relatório. Dados obrigatórios: impressões, cliques, CTR, CPC, conversões, CAC, ROAS.",
        },
        {
          id: "PA0001-T04-S02",
          name: "Entrega do Relatório e Próximos Passos",
          description:
            "Apresentar ou enviar o relatório ao cliente com plano de ação para o próximo ciclo.",
          order: 2,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 20,
          internalGuidance:
            "Enviar PDF pelo sistema + mensagem de resumo no chat do projeto. Agendar reunião se solicitado.",
        },
      ],
    },
  ],

  // ── Etapas (kanban de execução) ──────────────────────────────────────────
  stages: [
    {
      id: "PA0001-E01",
      code: "PA0001-E01",
      number: 1,
      name: "Onboarding",
      description:
        "Reunião de briefing, levantamento de acessos e diagnóstico inicial de campanhas.",
      category: "Planejamento",
      deliveryDeadlineDays: 3,
      executionDeadlineDays: 3,
      executionHours: 2,
      value: 120,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Confirmar acessos ao gerenciador e pixel antes de iniciar E02.",
    },
    {
      id: "PA0001-E02",
      code: "PA0001-E02",
      number: 2,
      name: "Setup de Campanhas",
      description:
        "Criação ou reestruturação das campanhas, conjuntos de anúncios e segmentação.",
      category: "Execução",
      deliveryDeadlineDays: 7,
      executionDeadlineDays: 4,
      executionHours: 3,
      value: 180,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance: "Enviar para aprovação do cliente antes de publicar.",
    },
    {
      id: "PA0001-E03",
      code: "PA0001-E03",
      number: 3,
      name: "Ativação e Monitoramento Inicial",
      description:
        "Ativação das campanhas e monitoramento intensivo da primeira semana.",
      category: "Execução",
      deliveryDeadlineDays: 14,
      executionDeadlineDays: 7,
      executionHours: 2,
      value: 120,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Monitorar de perto nas primeiras 48–72h. Ajustes rápidos se CPA estiver fora do meta.",
    },
    {
      id: "PA0001-E04",
      code: "PA0001-E04",
      number: 4,
      name: "Otimização da 2ª Semana",
      description:
        "Análise de métricas da semana 2 e ajustes de segmentação, lances e criativos.",
      category: "Execução",
      deliveryDeadlineDays: 21,
      executionDeadlineDays: 7,
      executionHours: 2,
      value: 120,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Pausar criativos com CTR < 0,5%. Testar novo público se conversões estiverem abaixo do meta.",
    },
    {
      id: "PA0001-E05",
      code: "PA0001-E05",
      number: 5,
      name: "Otimização da 3ª e 4ª Semana",
      description:
        "Análise de métricas das semanas 3 e 4, ajustes finais e consolidação de aprendizados.",
      category: "Execução",
      deliveryDeadlineDays: 28,
      executionDeadlineDays: 7,
      executionHours: 2,
      value: 120,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Iniciar preparação da narrativa do relatório mensal com base nos aprendizados das semanas 3–4.",
    },
    {
      id: "PA0001-E06",
      code: "PA0001-E06",
      number: 6,
      name: "Relatório Mensal",
      description:
        "Compilação de dados, análise completa do mês e entrega do relatório ao cliente.",
      category: "Entrega",
      deliveryDeadlineDays: 30,
      executionDeadlineDays: 2,
      executionHours: 2,
      value: 120,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "junior",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
      internalGuidance:
        "Usar template padrão. Enviar PDF + mensagem de resumo no chat.",
    },
    {
      id: "PA0001-E07",
      code: "PA0001-E07",
      number: 7,
      name: "Encerramento e Renovação",
      description:
        "Fechamento do ciclo mensal, registro de aprendizados e preparação para o próximo mês.",
      category: "Administração",
      deliveryDeadlineDays: 30,
      executionDeadlineDays: 1,
      executionHours: 0.5,
      value: 0,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "junior",
      isInternal: true,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: true,
      internalGuidance:
        "Registrar aprendizados no histórico do produto. Iniciar E01 do novo ciclo se renovado.",
    },
  ],

  // ── Questionário de briefing (preenchido pelo cliente na contratação) ────
  questionnaire: {
    id: "PA0001-Q",
    title: "Briefing — Gestão de Tráfego",
    description:
      "Preencha este formulário para que o especialista possa entender suas campanhas, objetivos e começar da forma certa.",
    briefingTitle: "Briefing de Tráfego Pago",
    briefingInstructions:
      "Gere um documento de briefing estruturado resumindo objetivo, público-alvo, plataformas, orçamento e contexto do anunciante.",
    questions: [
      {
        id: "PA0001-Q01",
        question: "Qual é o principal objetivo das campanhas?",
        type: "select",
        required: true,
        options: [
          "Gerar vendas diretas",
          "Gerar leads (contatos qualificados)",
          "Aumentar o reconhecimento de marca",
          "Aumentar o tráfego para o site",
          "Outro",
        ],
        aiAssisted: true,
        section: "Objetivos",
        briefingKey: "campanhaPrincipalObjetivo",
        aiContext: "Objetivo principal das campanhas de tráfego pago",
        placeholder: "Selecione o objetivo",
      },
      {
        id: "PA0001-Q02",
        question:
          "Qual é o orçamento mensal disponível para investimento em mídia?",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Orçamento",
        briefingKey: "orcamentoMidia",
        aiContext: "Verba mensal para mídia paga (não inclui a taxa de gestão)",
        placeholder: "Ex: R$ 2.000 por mês",
        warning:
          "Este valor é separado da taxa de gestão. É o quanto você vai investir diretamente nas plataformas (Meta, Google, etc.).",
      },
      {
        id: "PA0001-Q03",
        question: "Em quais plataformas deseja anunciar?",
        type: "multiselect",
        required: true,
        options: [
          "Meta Ads (Facebook e Instagram)",
          "Google Ads",
          "TikTok Ads",
          "LinkedIn Ads",
          "Pinterest Ads",
        ],
        aiAssisted: false,
        section: "Plataformas",
        briefingKey: "plataformas",
        aiContext: "Canais de mídia paga onde as campanhas serão veiculadas",
        placeholder: "Selecione uma ou mais plataformas",
      },
      {
        id: "PA0001-Q04",
        question: "Descreva seu público-alvo principal",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Público",
        briefingKey: "publicoAlvo",
        aiContext:
          "Perfil demográfico, interesses, comportamentos e dores do público-alvo",
        placeholder:
          "Ex: Mulheres de 25 a 45 anos, interessadas em moda e bem-estar, com renda média, que compram online pelo celular.",
      },
      {
        id: "PA0001-Q05",
        question: "Você já tem campanhas ativas atualmente?",
        type: "select",
        required: true,
        options: [
          "Sim, tenho campanhas rodando",
          "Tive campanhas antes, mas estão pausadas",
          "Não, nunca anunciei",
        ],
        aiAssisted: false,
        section: "Histórico",
        briefingKey: "campanhasExistentes",
        aiContext: "Histórico de uso de mídia paga do anunciante",
        placeholder: "Selecione",
      },
      {
        id: "PA0001-Q06",
        question:
          "Você tem criativos (imagens/vídeos) disponíveis para os anúncios?",
        type: "select",
        required: true,
        options: [
          "Sim, tenho criativos prontos",
          "Tenho materiais brutos (fotos, textos)",
          "Não tenho nada — precisarei que a allka produza",
        ],
        aiAssisted: false,
        section: "Criativos",
        briefingKey: "criativos",
        aiContext: "Disponibilidade de materiais criativos para os anúncios",
        placeholder: "Selecione",
        warning:
          "A produção de criativos não está inclusa neste serviço. Consulte o add-on de Criativos.",
      },
      {
        id: "PA0001-Q07",
        question:
          "Qual é a URL do site ou landing page para onde os anúncios devem direcionar?",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Destino",
        briefingKey: "urlDestino",
        aiContext: "Página de destino das campanhas",
        placeholder: "Ex: https://seusite.com.br/oferta",
      },
      {
        id: "PA0001-Q08",
        question: "O pixel / tag de conversão está instalado no site?",
        type: "select",
        required: true,
        options: [
          "Sim, está instalado e funcionando",
          "Está instalado mas não testei",
          "Não está instalado",
          "Não sei verificar",
        ],
        aiAssisted: false,
        section: "Rastreamento",
        briefingKey: "pixelInstalado",
        aiContext: "Status do pixel de rastreamento de conversões",
        placeholder: "Selecione",
        warning:
          "Sem pixel instalado, não é possível rastrear conversões. O especialista pode auxiliar na instalação.",
      },
    ],
  },

  // ── Testes de nômades ────────────────────────────────────────────────────
  nomadTests: [
    {
      id: "PA0001-TEST01",
      code: "PA0001-TEST01",
      name: "Teste de Habilitação — Configuração de Campanhas",
      description:
        "O nômade deve configurar uma campanha completa no Meta Ads para um cliente fictício, demonstrando domínio de estrutura, segmentação e boas práticas.",
      linkedTaskId: "PA0001-T02",
      linkedTaskName: "Configuração e Ativação das Campanhas",
      fakeClientName: "Loja Chique — Moda Feminina",
      fakeObjective:
        "Gerar 50 vendas mensais de vestidos acima de R$ 150 com orçamento de R$ 1.500/mês no Meta Ads.",
      fakeContext:
        "A Loja Chique nunca anunciou. Tem um e-commerce no Shopify com pixel instalado e imagens de produto de boa qualidade. Público-alvo: mulheres de 22–45 anos interessadas em moda, que moram nas capitais do Sudeste.",
      fakeDeliverables: [
        "Estrutura de campanha criada no Ads Manager (pode ser em conta de teste ou no simulador)",
        "Documento descrevendo as escolhas de campanha, conjuntos e segmentação",
        "Justificativa para o tipo de campanha escolhido (Conversão, Tráfego, etc.)",
        "Screenshot ou print das configurações antes da publicação",
      ],
      evaluationCriteria: [
        "Escolha correta do objetivo de campanha para o meta de vendas",
        "Segmentação de público compatível com o perfil descrito",
        "Nomenclatura de campanhas, conjuntos e anúncios seguindo o padrão",
        "Distribuição de orçamento coerente com as campanhas criadas",
        "Configuração do evento de conversão (compra) no pixel",
        "Pelo menos 3 públicos distintos configurados",
      ],
      passingScore: 70,
      timeLimit: 120,
      enablesAdditionalTasks: [
        {
          taskId: "PA0001-T03",
          taskName: "Monitoramento e Otimização Semanal",
          productId: "PA0001",
          productName: "Gestão de Tráfego",
        },
      ],
      isActive: true,
      createdAt: "2026-01-10T09:00:00Z",
      preCircuit: {
        welcomeTitle:
          "Bem-vindo ao Circuito de Habilitação — Gestão de Tráfego",
        welcomeSubtitle:
          "Você está prestes a se habilitar para executar campanhas de tráfego pago pela allka. Leia tudo com atenção antes de começar.",
        welcomeHighlights: [
          "Teste prático com cliente fictício real",
          "Até 2 horas para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para Configuração + Otimização",
        ],
        aboutDescription:
          "Neste teste você vai demonstrar que sabe configurar uma campanha de tráfego pago do zero. O cliente é fictício, mas o cenário é realista.",
        aboutWhatToExpect: [
          "Ler o briefing do cliente fictício (Loja Chique)",
          "Criar a estrutura de campanha (campanha → conjuntos → anúncios)",
          "Documentar as configurações e justificativas",
          "Entregar screenshots ou prints das configurações",
          "Aguardar revisão do qualificador (até 48h úteis)",
        ],
        estimatedTime: "2 horas",
        rules: [
          "Use sua conta de anúncios de teste ou o simulador de campanha",
          "Não use campanhas reais ou de clientes existentes",
          "Documente cada decisão — o qualificador avalia o raciocínio, não apenas o resultado",
          "Siga o padrão de nomenclatura exigido: [Produto]-[Objetivo]-[Público]-[Data]",
        ],
        warnings: [
          "Não inicie o teste sem ter lido completamente o briefing do cliente",
          "Entregas incompletas resultam em reprovação automática",
        ],
        confirmChecklist: [
          "Li o briefing completo do cliente fictício",
          "Tenho acesso a uma conta de anúncios de teste",
          "Entendo o padrão de nomenclatura exigido",
          "Tenho pelo menos 2 horas disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "PA0001-TEST01-CL",
        linkedTestId: "PA0001-TEST01",
        linkedTestName: "Teste de Habilitação — Configuração de Campanhas",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar especialmente a coerência entre objetivo de negócio (vendas) e objetivo de campanha (Conversão).",
        sections: [
          {
            id: "CL-S01",
            title: "Estrutura da Campanha",
            description:
              "Avaliação da hierarquia campanha → conjuntos → anúncios",
            items: [
              {
                id: "CL-S01-I01",
                label:
                  "Objetivo de campanha correto (Conversão para meta de vendas)",
                description:
                  "Campanha configurada com objetivo de Conversão (não Tráfego ou Alcance)",
                weight: 5,
                isRequired: true,
                hint: "Ver screenshot da configuração da campanha",
              },
              {
                id: "CL-S01-I02",
                label: "Nomenclatura seguindo o padrão exigido",
                description:
                  "Campanha, conjuntos e anúncios nomeados conforme [Produto]-[Objetivo]-[Público]-[Data]",
                weight: 3,
                isRequired: false,
                hint: "Ver nomes no print do Ads Manager",
              },
              {
                id: "CL-S01-I03",
                label: "Mínimo de 3 conjuntos de anúncios criados",
                description: "Ao menos 3 conjuntos com públicos distintos",
                weight: 4,
                isRequired: true,
                hint: "Contar conjuntos no print do Ads Manager",
              },
            ],
          },
          {
            id: "CL-S02",
            title: "Segmentação e Público",
            description: "Avaliação da qualidade da segmentação de público",
            items: [
              {
                id: "CL-S02-I01",
                label:
                  "Segmentação compatível com o briefing (mulheres, 22–45, Sudeste, moda)",
                description:
                  "Os interesses e perfil demográfico correspondem ao público do cliente fictício",
                weight: 4,
                isRequired: true,
                hint: "Ver configuração de cada conjunto de anúncios",
              },
              {
                id: "CL-S02-I02",
                label: "Uso de público de remarketing ou lookalike",
                description:
                  "Ao menos 1 conjunto com remarketing ou público semelhante configurado",
                weight: 3,
                isRequired: false,
                hint: "Ver tipo de público configurado",
              },
            ],
          },
          {
            id: "CL-S03",
            title: "Rastreamento e Pixel",
            description: "Avaliação da configuração de conversão",
            items: [
              {
                id: "CL-S03-I01",
                label: "Evento de conversão (Compra) configurado no pixel",
                description:
                  "O evento de conversão correto está associado à campanha",
                weight: 5,
                isRequired: true,
                hint: "Ver configuração de conversão da campanha",
              },
            ],
          },
          {
            id: "CL-S04",
            title: "Documentação e Justificativas",
            description:
              "Avaliação da qualidade das justificativas apresentadas",
            items: [
              {
                id: "CL-S04-I01",
                label: "Justificativa clara para o tipo de campanha escolhido",
                description:
                  "O candidato explica por que usou Conversão e não outro objetivo",
                weight: 3,
                isRequired: false,
                hint: "Ver documento de justificativas entregue",
              },
              {
                id: "CL-S04-I02",
                label:
                  "Distribuição de orçamento coerente com o briefing (R$1.500/mês)",
                description:
                  "Os orçamentos dos conjuntos somam aproximadamente R$1.500",
                weight: 2,
                isRequired: false,
                hint: "Ver configuração de orçamento por conjunto",
              },
            ],
          },
        ],
      },
    },
  ],

  // ── Dados internos por variação ──────────────────────────────────────────
  variationsInternal: {
    "PA0001-V01": {
      label: "Até 2 campanhas",
      code: "PA0001-V01",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 14,
    },
    "PA0001-V02": {
      label: "Até 4 campanhas",
      code: "PA0001-V02",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 18,
    },
    "PA0001-V03": {
      label: "Até 6 campanhas",
      code: "PA0001-V03",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 24,
    },
  },
  portfolioImages: [
    {
      id: "trafego-img-01",
      url: "/images/products/trafego-pago.svg",
      title: "Visão Geral do Produto",
      description: "Dashboard com métricas de performance de campanhas",
      isMain: true,
      sortOrder: 0,
    },
    {
      id: "trafego-img-02",
      url: "/images/products/trafego-portfolio-01.svg",
      title: "Relatório de Performance — Abril",
      description:
        "Resultados mensais: ROAS, cliques, conversões e investimento",
      isMain: false,
      sortOrder: 1,
    },
    {
      id: "trafego-img-03",
      url: "/images/products/trafego-portfolio-02.svg",
      title: "Segmentação de Público",
      description:
        "Mapeamento de audiências: quente, lookalike, remarketing e frio",
      isMain: false,
      sortOrder: 2,
    },
    {
      id: "trafego-img-04",
      url: "/images/products/trafego-portfolio-03.svg",
      title: "Estrutura das Campanhas",
      description: "Arquitetura das campanhas ativas no Meta Ads e Google Ads",
      isMain: false,
      sortOrder: 3,
    },
    {
      id: "trafego-img-05",
      url: "/images/products/trafego-portfolio-04.svg",
      title: "Testes A/B — Criativos",
      description: "Comparativo de variações com insights de otimização",
      isMain: false,
      sortOrder: 4,
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PA0002 — SEO
// ════════════════════════════════════════════════════════════════════════════

const seoMeta = {
  complementaryProductIds: ["PA0001", "PA0004", "PA0005"],
  recurrence: "Mensal",
  deliveryDays: "30",
  summaryDescription:
    "Posicionamento orgânico real, com estratégia técnica e de conteúdo para crescer no Google de forma consistente.",
  finalPrice: 1500,
  itemLimit: 1,
  totalExecutionHours: 15,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
    tagline:
      "Posicionamento orgânico real, com estratégia técnica e de conteúdo para crescer no Google de forma consistente.",
    highlights: [
      "Auditoria técnica completa mensal do site",
      "Estratégia de palavras-chave atualizada todo mês",
      "Otimização on-page das principais páginas",
      "Relatório mensal de posicionamento e tráfego orgânico",
    ],
    targetAudience: [
      "Empresas que querem reduzir dependência de tráfego pago com resultado orgânico consistente",
      "E-commerces e prestadores de serviço que precisam aparecer no Google para palavras-chave do negócio",
      "Sites que já existem mas nunca foram otimizados para SEO",
      "Negócios que tiveram penalizações ou perda de tráfego orgânico e precisam recuperar",
    ],
    whatIsIncluded: [
      {
        title: "Auditoria técnica mensal",
        description:
          "Análise completa de saúde técnica do site: velocidade, mobile-first, indexação, erros 4xx/5xx, canonical, structured data.",
      },
      {
        title: "Estratégia de palavras-chave",
        description:
          "Pesquisa, análise de intenção de busca e priorização de keywords alinhadas ao objetivo do negócio.",
      },
      {
        title: "Otimização on-page",
        description:
          "Title tags, meta descriptions, headings H1–H6, URLs, imagens (alt text) e estrutura interna das principais páginas.",
      },
      {
        title: "Link Building",
        description:
          "Construção de backlinks relevantes e de qualidade em fontes compatíveis com o nicho do cliente.",
      },
      {
        title: "Relatório mensal",
        description:
          "Relatório com evolução de posicionamento, tráfego orgânico, páginas otimizadas e próximos passos.",
      },
    ],
    deliverables: [
      "Relatório mensal em PDF com posicionamento, tráfego orgânico e ações realizadas",
      "Lista de palavras-chave monitoradas com posições atuais",
      "Registro de todas as otimizações on-page realizadas no mês",
      "Relatório de backlinks construídos (domínio, DA, âncora)",
    ],
    notIncluded: [
      "Criação de conteúdo novo (artigos de blog, landing pages) — pode ser adquirido como add-on",
      "Desenvolvimento ou redesign do site",
      "Gestão de Google Ads ou anúncios pagos",
      "SEO de app mobile",
    ],
    requirements: [
      "Acesso ao Google Search Console e Google Analytics 4 (ou disponibilidade para configurar)",
      "Acesso de editor ao CMS do site (WordPress, Shopify, etc.) para implementar as otimizações",
      "Briefing preenchido com palavras-chave prioritárias, concorrentes e objetivos de negócio",
    ],
    howToRequest: [
      {
        step: "Selecione a opção",
        description:
          "Escolha a opção conforme o número de palavras-chave que deseja otimizar e o volume do site.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe a URL do site, palavras-chave prioritárias, concorrentes e objetivos de posicionamento.",
      },
      {
        step: "Auditoria e diagnóstico",
        description:
          "O especialista realiza a auditoria técnica completa e apresenta o diagnóstico nos primeiros 5 dias.",
      },
      {
        step: "Execução e relatório",
        description:
          "Otimizações on-page, link building e relatório final entregues até o dia 30 do mês.",
      },
    ],
    faq: [
      {
        question: "Em quanto tempo vejo resultados com SEO?",
        answer:
          "SEO é uma estratégia de médio a longo prazo. Melhorias técnicas podem ter efeito em semanas, mas movimentações significativas de posicionamento geralmente ocorrem entre 3 e 6 meses de trabalho contínuo.",
      },
      {
        question: "A criação de conteúdo está inclusa?",
        answer:
          "Não. O serviço inclui a otimização do conteúdo existente. A criação de novos artigos de blog ou páginas pode ser adquirida como add-on.",
      },
      {
        question: "O que é link building e por que é importante?",
        answer:
          "Link building é a construção de links de outros sites apontando para o seu. O Google interpreta esses links como votos de confiança. Links de qualidade elevam a autoridade do domínio e melhoram o posicionamento.",
      },
      {
        question: "Preciso ter acesso ao Search Console?",
        answer:
          "Sim, o acesso ao Google Search Console é obrigatório para monitorar posicionamento, indexação e erros. Se você não tiver, o especialista pode ajudar na configuração.",
      },
      {
        question: "O que acontece se meu site for penalizado pelo Google?",
        answer:
          "Em caso de penalização manual ou algorítmica, o especialista identifica a causa, remove links tóxicos (disavow) e aplica as correções necessárias. Recovery de penalização pode ser um trabalho adicional dependendo da gravidade.",
      },
    ],
  },

  // ── Features base — em todas as opções ──────────────────────────────────
  baseFeatures: [
    "Auditoria técnica completa mensal do site (T01 — 3h)",
    "Estratégia de palavras-chave atualizada mensalmente (T02 — 2h)",
    "Otimização on-page das principais páginas (T03)",
    "Construção de backlinks relevantes ao nicho (T04)",
    "Relatório mensal com posicionamento e tráfego orgânico (T05 — 1,5h)",
    "7 etapas de execução estruturadas: E01 → E07",
    "Execução por nômade habilitado — Especialidade Copywriting/SEO",
  ],

  // ── Tarefas ──────────────────────────────────────────────────────────────
  tasks: [
    {
      id: "PA0002-T01",
      name: "Auditoria Técnica de SEO",
      description:
        "Análise completa da saúde técnica do site: velocidade, indexação, mobile, erros, canonical, structured data.",
      taskCategory: "Diagnóstico",
      objective:
        "Identificar todos os problemas técnicos que impedem o site de rankear e priorizar as correções.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Usar ferramentas padrão: Screaming Frog, Google Search Console, PageSpeed Insights, Ahrefs/SEMrush",
        "Documentar cada problema com URL afetada, severidade e recomendação de correção",
        "Priorizar erros por impacto: crítico → alto → médio → baixo",
      ],
      calculatedCost: 180,
      questionnaire: null,
      steps: [
        {
          id: "PA0002-T01-S01",
          name: "Análise Técnica do Site",
          description:
            "Executar crawl completo, verificar velocidade, indexação, mobile-first, erros 4xx/5xx, canonical e hreflang.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "pleno",
          calculatedCost: 170,
          internalGuidance:
            "Exportar relatório do Screaming Frog. Cruzar com Search Console (páginas excluídas, cobertura de índice).",
        },
        {
          id: "PA0002-T01-S02",
          name: "Relatório de Auditoria Técnica",
          description:
            "Documentar todos os problemas encontrados com prioridade, URL afetada e recomendação de correção.",
          order: 2,
          estimatedHours: 1,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "junior",
          calculatedCost: 60,
          internalGuidance:
            "Usar template de auditoria padrão. Separar em abas: crítico, alto, médio, baixo. Compartilhar com o cliente.",
        },
      ],
    },
    {
      id: "PA0002-T02",
      name: "Estratégia de Palavras-chave",
      description:
        "Pesquisa, análise de intenção de busca e priorização de keywords alinhadas ao objetivo do negócio e ao volume contratado.",
      taskCategory: "Planejamento",
      objective:
        "Definir o mapa de palavras-chave do mês, priorizando as de maior potencial de tráfego e conversão.",
      dependencies: ["PA0002-T01"],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Usar dados reais do Search Console + ferramentas de pesquisa (Ahrefs, SEMrush, Ubersuggest)",
        "Classificar por intenção: informacional, comercial, transacional, navegacional",
        "Priorizar keywords com alta intenção de compra quando o objetivo é vendas",
      ],
      calculatedCost: 170,
      questionnaire: null,
      steps: [
        {
          id: "PA0002-T02-S01",
          name: "Pesquisa e Análise de Keywords",
          description:
            "Mapear palavras-chave principais, cauda longa e de concorrentes. Analisar volume, dificuldade e intenção.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "pleno",
          calculatedCost: 170,
          internalGuidance:
            "Exportar keywords do Search Console + pesquisa no Ahrefs. Montar planilha com: keyword, volume, dificuldade, intenção, URL-alvo.",
        },
      ],
    },
    {
      id: "PA0002-T03",
      name: "Otimização On-Page",
      description:
        "Otimização de title tags, meta descriptions, headings H1–H6, URLs, imagens e estrutura das páginas priorizadas.",
      taskCategory: "Execução",
      objective:
        "Implementar as otimizações on-page nas páginas selecionadas conforme o mapa de keywords e a auditoria.",
      dependencies: ["PA0002-T02"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Cada página deve ter keyword principal única — evitar canibalização",
        "Title tag: 55–60 caracteres, keyword no início",
        "Meta description: 150–160 caracteres, CTA implícita",
        "H1 único por página, keywords secundárias em H2/H3",
        "Registrar todas as alterações com URL, campo modificado e conteúdo antes/depois",
      ],
      calculatedCost: 240,
      questionnaire: null,
      steps: [
        {
          id: "PA0002-T03-S01",
          name: "Otimização de Meta Tags e Headings",
          description:
            "Reescrever title tags, meta descriptions e headings das páginas priorizadas conforme o mapa de keywords.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "pleno",
          calculatedCost: 170,
          internalGuidance:
            "Priorizar páginas de maior tráfego potencial ou com keyword em posição 5–20 (Quick Wins).",
        },
        {
          id: "PA0002-T03-S02",
          name: "Otimização de Conteúdo e Links Internos",
          description:
            "Melhorar a densidade semântica do conteúdo, adicionar links internos relevantes e otimizar alt text de imagens.",
          order: 2,
          estimatedHours: 2,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "pleno",
          calculatedCost: 170,
          internalGuidance:
            "Não reescrever o conteúdo integralmente — complementar e otimizar o existente para não perder rankings atuais.",
        },
      ],
    },
    {
      id: "PA0002-T04",
      name: "Link Building",
      description:
        "Prospecção e construção de backlinks relevantes e de qualidade em fontes compatíveis com o nicho do cliente.",
      taskCategory: "Execução",
      objective:
        "Aumentar a autoridade de domínio com backlinks de qualidade, respeitando o volume definido na opção contratada.",
      dependencies: ["PA0002-T01"],
      canRunInParallel: true,
      requiresAccess: false,
      executionRules: [
        "Nunca usar PBN, farm de links ou técnicas de black hat",
        "Verificar DA (Domain Authority) mínimo de 20 antes de prospectar",
        "Registrar cada link com: domínio, URL publicada, DA, âncora usada, data",
        "Diversificar âncoras: não usar sempre keyword exata — usar branded e variações",
      ],
      calculatedCost: 80,
      questionnaire: null,
      steps: [
        {
          id: "PA0002-T04-S01",
          name: "Prospecção e Construção de Backlinks",
          description:
            "Identificar oportunidades de link building (guest posts, menções, parceiros) e construir os links do mês.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "junior",
          calculatedCost: 80,
          internalGuidance:
            "Usar base de contatos allka + outreach para novos domínios. Registrar tudo na planilha de link building.",
        },
      ],
    },
    {
      id: "PA0002-T05",
      name: "Relatório Mensal de SEO",
      description:
        "Compilação de dados de posicionamento e tráfego orgânico, análise de evolução e entrega do relatório mensal.",
      taskCategory: "Entrega",
      objective:
        "Entregar ao cliente um relatório claro com evolução de posicionamento, tráfego orgânico e ações do próximo mês.",
      dependencies: ["PA0002-T03", "PA0002-T04"],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Relatório entregue até o dia 30 do mês",
        "Incluir comparativo com o mês anterior",
        "Destacar keywords que subiram e que caíram de posição",
      ],
      calculatedCost: 60,
      questionnaire: null,
      steps: [
        {
          id: "PA0002-T05-S01",
          name: "Análise de Posicionamento e Tráfego",
          description:
            "Exportar dados do Search Console e Analytics: posições médias, impressões, cliques, páginas de entrada.",
          order: 1,
          estimatedHours: 1,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "junior",
          calculatedCost: 40,
          internalGuidance:
            "Monitorar as keywords do mapa de keywords definido em T02. Comparar com mês anterior.",
        },
        {
          id: "PA0002-T05-S02",
          name: "Entrega do Relatório e Plano do Próximo Mês",
          description:
            "Montar o relatório final em PDF e definir as prioridades de otimização para o próximo ciclo.",
          order: 2,
          estimatedHours: 0.5,
          specialtyId: 2,
          specialty: 2,
          experienceLevel: "junior",
          calculatedCost: 20,
          internalGuidance:
            "Enviar PDF pelo sistema + mensagem de resumo no chat. Incluir lista de páginas priorizadas para o próximo mês.",
        },
      ],
    },
  ],

  // ── Etapas (kanban de execução) ──────────────────────────────────────────
  stages: [
    {
      id: "PA0002-E01",
      code: "PA0002-E01",
      number: 1,
      name: "Diagnóstico e Auditoria",
      description:
        "Crawl completo do site, análise técnica e relatório de auditoria com prioridades.",
      category: "Diagnóstico",
      deliveryDeadlineDays: 5,
      executionDeadlineDays: 5,
      executionHours: 3,
      value: 180,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Compartilhar o relatório de auditoria com o cliente antes de avançar para E02.",
    },
    {
      id: "PA0002-E02",
      code: "PA0002-E02",
      number: 2,
      name: "Estratégia de Palavras-chave",
      description:
        "Pesquisa, análise e priorização do mapa de keywords do mês.",
      category: "Planejamento",
      deliveryDeadlineDays: 8,
      executionDeadlineDays: 3,
      executionHours: 2,
      value: 170,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Entregar planilha de keywords para aprovação do cliente antes de iniciar E03.",
    },
    {
      id: "PA0002-E03",
      code: "PA0002-E03",
      number: 3,
      name: "Otimização On-Page",
      description:
        "Implementação das otimizações on-page nas páginas priorizadas.",
      category: "Execução",
      deliveryDeadlineDays: 15,
      executionDeadlineDays: 7,
      executionHours: 4,
      value: 340,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Registrar todas as alterações com before/after. Não fazer mais de 10 alterações por sessão para facilitar o rastreamento de impacto.",
    },
    {
      id: "PA0002-E04",
      code: "PA0002-E04",
      number: 4,
      name: "Conteúdo e Links Internos",
      description:
        "Otimização semântica do conteúdo existente e estruturação de links internos.",
      category: "Execução",
      deliveryDeadlineDays: 20,
      executionDeadlineDays: 5,
      executionHours: 2,
      value: 170,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Focar em linkagem interna estratégica para passar autoridade das páginas mais fortes para as pages que precisam rankar.",
    },
    {
      id: "PA0002-E05",
      code: "PA0002-E05",
      number: 5,
      name: "Link Building",
      description:
        "Prospecção e construção dos backlinks do mês conforme volume da opção contratada.",
      category: "Execução",
      deliveryDeadlineDays: 25,
      executionDeadlineDays: 5,
      executionHours: 2,
      value: 80,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "junior",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Registrar cada link construído na planilha de link building do cliente.",
    },
    {
      id: "PA0002-E06",
      code: "PA0002-E06",
      number: 6,
      name: "Relatório Mensal",
      description:
        "Compilação de dados, análise de posicionamento e tráfego, e entrega do relatório.",
      category: "Entrega",
      deliveryDeadlineDays: 30,
      executionDeadlineDays: 2,
      executionHours: 1.5,
      value: 60,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "junior",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
      internalGuidance:
        "Incluir comparativo mês anterior. Destacar Quick Wins e keywords em posição 5–20 para priorizar no próximo mês.",
    },
    {
      id: "PA0002-E07",
      code: "PA0002-E07",
      number: 7,
      name: "Encerramento e Renovação",
      description:
        "Fechamento do ciclo, registro de aprendizados e preparação para o próximo mês.",
      category: "Administração",
      deliveryDeadlineDays: 30,
      executionDeadlineDays: 1,
      executionHours: 0.5,
      value: 0,
      itemLimit: 1,
      specialtyId: 2,
      experienceLevel: "junior",
      isInternal: true,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: true,
      internalGuidance:
        "Registrar aprendizados. Iniciar E01 do novo ciclo se renovado.",
    },
  ],

  // ── Questionário de briefing ─────────────────────────────────────────────
  questionnaire: {
    id: "PA0002-Q",
    title: "Briefing — SEO",
    description:
      "Preencha este formulário para que o especialista possa entender o site, objetivos e começar a estratégia do jeito certo.",
    briefingTitle: "Briefing de SEO",
    briefingInstructions:
      "Gere um documento de briefing estruturado com objetivo de posicionamento, palavras-chave prioritárias, concorrentes e contexto do site.",
    questions: [
      {
        id: "PA0002-Q01",
        question: "Qual é a URL do site?",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Site",
        briefingKey: "urlSite",
        aiContext: "Endereço principal do site a ser otimizado",
        placeholder: "Ex: https://seusite.com.br",
      },
      {
        id: "PA0002-Q02",
        question: "Qual é o principal objetivo de SEO?",
        type: "select",
        required: true,
        options: [
          "Aumentar tráfego orgânico geral",
          "Posicionar para palavras-chave específicas",
          "Aumentar a autoridade de domínio",
          "Gerar mais vendas orgânicas",
          "Recuperar tráfego perdido (penalização ou atualização do Google)",
        ],
        aiAssisted: true,
        section: "Objetivos",
        briefingKey: "objetivoSEO",
        aiContext: "Principal objetivo de posicionamento orgânico",
        placeholder: "Selecione o objetivo",
      },
      {
        id: "PA0002-Q03",
        question: "Quais palavras-chave são mais importantes para o negócio?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Palavras-chave",
        briefingKey: "keywordsPrioritarias",
        aiContext: "Keywords principais que o cliente quer rankear",
        placeholder:
          "Ex: consultoria financeira para pequenas empresas, como abrir MEI, contador online barato",
      },
      {
        id: "PA0002-Q04",
        question:
          "Tem concorrentes que servem de referência de posicionamento?",
        type: "text",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Concorrentes",
        briefingKey: "concorrentes",
        aiContext: "Sites concorrentes usados como referência de SEO",
        placeholder: "Ex: concorrente1.com.br, concorrente2.com.br",
      },
      {
        id: "PA0002-Q05",
        question: "O site tem blog ativo com publicações regulares?",
        type: "select",
        required: true,
        options: [
          "Sim, publicamos regularmente",
          "Temos blog mas publicamos raramente",
          "Não temos blog",
        ],
        aiAssisted: false,
        section: "Conteúdo",
        briefingKey: "blogAtivo",
        aiContext: "Existência e frequência de publicações no blog",
        placeholder: "Selecione",
      },
      {
        id: "PA0002-Q06",
        question:
          "Você tem acesso ao Google Search Console e Google Analytics 4?",
        type: "select",
        required: true,
        options: [
          "Sim, tenho acesso a ambos",
          "Tenho acesso só ao Search Console",
          "Tenho acesso só ao Analytics",
          "Não tenho acesso a nenhum",
          "Não sei o que são essas ferramentas",
        ],
        aiAssisted: false,
        section: "Ferramentas",
        briefingKey: "acessoFerramentas",
        aiContext:
          "Disponibilidade de acesso às ferramentas de diagnóstico SEO",
        placeholder: "Selecione",
        warning:
          "Sem acesso ao Search Console, não conseguimos monitorar posicionamento. O especialista pode ajudar na configuração.",
      },
      {
        id: "PA0002-Q07",
        question: "O site já teve trabalho de SEO anteriormente?",
        type: "select",
        required: true,
        options: [
          "Sim, trabalhamos com outra agência/freelancer",
          "Já tentei fazer SEO internamente",
          "Nunca fizemos SEO",
          "Não sei — o site é antigo e não tenho histórico",
        ],
        aiAssisted: false,
        section: "Histórico",
        briefingKey: "historicoSEO",
        aiContext: "Histórico de otimização de SEO do site",
        placeholder: "Selecione",
      },
      {
        id: "PA0002-Q08",
        question:
          "Quais são as principais páginas que precisam ser otimizadas?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Páginas-alvo",
        briefingKey: "paginasAlvo",
        aiContext: "Páginas prioritárias do site para otimização on-page",
        placeholder:
          "Ex: página inicial, página de serviços, página de contato, artigo do blog sobre X",
      },
    ],
  },

  // ── Testes de nômades ────────────────────────────────────────────────────
  nomadTests: [
    {
      id: "PA0002-TEST01",
      code: "PA0002-TEST01",
      name: "Teste de Habilitação — Otimização On-Page",
      description:
        "O nômade deve otimizar uma página fictícia demonstrando domínio de title tag, meta description, headings, conteúdo e links internos.",
      linkedTaskId: "PA0002-T03",
      linkedTaskName: "Otimização On-Page",
      fakeClientName: "Clínica Bem Estar — Psicologia e Terapia",
      fakeObjective:
        "Rankear a página de serviço 'Terapia Cognitivo-Comportamental' para a keyword 'TCC em São Paulo' (volume: 2.400/mês, dificuldade: 42).",
      fakeContext:
        "A página existe mas nunca foi otimizada. Title tag atual: 'Serviços | Clínica Bem Estar'. H1 ausente. Meta description genérica. Conteúdo de 350 palavras sem mencionar a keyword principal. Sem links internos para outras páginas relevantes.",
      fakeDeliverables: [
        "Nova title tag proposta (com justificativa de até 60 caracteres)",
        "Nova meta description proposta (com CTA, 150–160 caracteres)",
        "Reescrita do H1 e sugestão de H2/H3",
        "Trecho de conteúdo otimizado (mínimo 150 palavras adicionais) com keyword e variações semânticas",
        "Lista de 3 sugestões de links internos (URL de origem, âncora, URL de destino)",
      ],
      evaluationCriteria: [
        "Title tag com keyword no início e dentro do limite de 60 caracteres",
        "Meta description com CTA implícita e dentro de 160 caracteres",
        "H1 único contendo a keyword principal",
        "Uso natural de variações semânticas no conteúdo (TCC, terapia cognitiva, psicoterapia)",
        "Links internos com âncoras descritivas (não 'clique aqui')",
        "Não há keyword stuffing no conteúdo proposto",
      ],
      passingScore: 70,
      timeLimit: 90,
      enablesAdditionalTasks: [
        {
          taskId: "PA0002-T04",
          taskName: "Link Building",
          productId: "PA0002",
          productName: "SEO",
        },
        {
          taskId: "PA0002-T05",
          taskName: "Relatório Mensal de SEO",
          productId: "PA0002",
          productName: "SEO",
        },
      ],
      isActive: true,
      createdAt: "2026-01-10T09:00:00Z",
      preCircuit: {
        welcomeTitle: "Bem-vindo ao Circuito de Habilitação — SEO On-Page",
        welcomeSubtitle:
          "Você está prestes a se habilitar para executar otimizações on-page de SEO pela allka. Leia tudo com atenção antes de começar.",
        welcomeHighlights: [
          "Teste prático com página fictícia realista",
          "Até 90 minutos para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para On-Page, Link Building e Relatório",
        ],
        aboutDescription:
          "Neste teste você vai otimizar uma página de serviço fictícia demonstrando domínio de title tags, meta descriptions, headings e estrutura de conteúdo.",
        aboutWhatToExpect: [
          "Ler o briefing da página fictícia (Clínica Bem Estar)",
          "Analisar os problemas atuais da página",
          "Propor as otimizações solicitadas (title, meta, H1, conteúdo, links internos)",
          "Entregar um documento com todas as propostas e justificativas",
          "Aguardar revisão do qualificador (até 48h úteis)",
        ],
        estimatedTime: "90 minutos",
        rules: [
          "Todas as propostas devem ser originais — não use geradores automáticos sem revisão crítica",
          "Justifique cada decisão — o qualificador avalia o raciocínio, não só o resultado",
          "Respeite os limites de caracteres exigidos para title e meta description",
          "Use a keyword exata e variações semânticas de forma natural — sem keyword stuffing",
        ],
        warnings: [
          "Entregas sem justificativa serão penalizadas na avaliação",
          "Title tags acima de 65 caracteres ou meta descriptions acima de 165 caracteres serão descontadas",
        ],
        confirmChecklist: [
          "Li o briefing completo da página fictícia",
          "Entendo a diferença entre keyword exata e variações semânticas",
          "Conheço os limites de caracteres de title tag e meta description",
          "Tenho pelo menos 90 minutos disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "PA0002-TEST01-CL",
        linkedTestId: "PA0002-TEST01",
        linkedTestName: "Teste de Habilitação — Otimização On-Page",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar especialmente o uso natural das keywords — keyword stuffing é falha crítica.",
        sections: [
          {
            id: "CL2-S01",
            title: "Title Tag e Meta Description",
            description: "Avaliação dos elementos de SERP",
            items: [
              {
                id: "CL2-S01-I01",
                label: "Keyword no início da title tag",
                description:
                  "A keyword principal aparece nos primeiros 30 caracteres da title",
                weight: 5,
                isRequired: true,
                hint: "Ver title tag proposta no documento entregue",
              },
              {
                id: "CL2-S01-I02",
                label: "Title tag dentro de 60 caracteres",
                description: "A title proposta tem no máximo 60 caracteres",
                weight: 3,
                isRequired: false,
                hint: "Contar caracteres da title entregue",
              },
              {
                id: "CL2-S01-I03",
                label: "Meta description com CTA e dentro de 160 caracteres",
                description:
                  "A meta description tem chamada para ação e respeita o limite",
                weight: 4,
                isRequired: false,
                hint: "Ver meta description proposta",
              },
            ],
          },
          {
            id: "CL2-S02",
            title: "Headings e Estrutura",
            description: "Avaliação de H1, H2, H3",
            items: [
              {
                id: "CL2-S02-I01",
                label: "H1 único contendo a keyword principal",
                description:
                  "Existe apenas um H1 e ele inclui a keyword 'TCC em São Paulo'",
                weight: 5,
                isRequired: true,
                hint: "Ver proposta de H1 no documento",
              },
              {
                id: "CL2-S02-I02",
                label: "Uso de H2/H3 com variações semânticas",
                description:
                  "Os subtítulos usam variações da keyword (terapia cognitiva, psicoterapia, TCC)",
                weight: 3,
                isRequired: false,
                hint: "Ver proposta de subheadings",
              },
            ],
          },
          {
            id: "CL2-S03",
            title: "Conteúdo",
            description: "Avaliação da qualidade do conteúdo proposto",
            items: [
              {
                id: "CL2-S03-I01",
                label: "Keyword e variações semânticas usadas de forma natural",
                description:
                  "Não há repetição excessiva da keyword — uso natural e contextual",
                weight: 5,
                isRequired: true,
                hint: "Ler o trecho de conteúdo otimizado e verificar densidade",
              },
              {
                id: "CL2-S03-I02",
                label: "Mínimo de 150 palavras adicionais entregues",
                description:
                  "O conteúdo proposto tem ao menos 150 palavras novas",
                weight: 3,
                isRequired: false,
                hint: "Contar palavras no trecho entregue",
              },
            ],
          },
          {
            id: "CL2-S04",
            title: "Links Internos",
            description: "Avaliação das sugestões de linkagem interna",
            items: [
              {
                id: "CL2-S04-I01",
                label: "3 sugestões de links internos com âncoras descritivas",
                description:
                  "As âncoras descrevem o destino — sem uso de 'clique aqui' ou 'saiba mais' genérico",
                weight: 4,
                isRequired: false,
                hint: "Ver lista de links internos entregue",
              },
            ],
          },
        ],
      },
    },
  ],

  // ── Dados internos por variação ──────────────────────────────────────────
  variationsInternal: {
    "PA0002-V01": {
      label: "Básico — até 10 palavras-chave",
      code: "PA0002-V01",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 10,
    },
    "PA0002-V02": {
      label: "Intermediário — até 25 palavras-chave",
      code: "PA0002-V02",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 15,
    },
    "PA0002-V03": {
      label: "Avançado — até 50 palavras-chave",
      code: "PA0002-V03",
      publicDeadlineLabel: "30 dias corridos",
      executionHours: 24,
    },
  },
  portfolioImages: [
    {
      id: "seo-img-01",
      url: "/images/products/seo.svg",
      title: "Visão Geral do Produto",
      description: "Mockup de SERP com resultado #1 e métricas orgânicas",
      isMain: true,
      sortOrder: 0,
    },
    {
      id: "seo-img-02",
      url: "/images/products/seo-portfolio-01.svg",
      title: "Ranking de Palavras-Chave",
      description: "Top 10 keywords monitoradas com posição, variação e volume",
      isMain: false,
      sortOrder: 1,
    },
    {
      id: "seo-img-03",
      url: "/images/products/seo-portfolio-02.svg",
      title: "Auditoria Técnica do Site",
      description: "Health score, problemas críticos e plano de ação",
      isMain: false,
      sortOrder: 2,
    },
    {
      id: "seo-img-04",
      url: "/images/products/seo-portfolio-03.svg",
      title: "Mapa de Palavras-Chave",
      description:
        "Distribuição por intenção de busca: informacional, comercial e transacional",
      isMain: false,
      sortOrder: 3,
    },
    {
      id: "seo-img-05",
      url: "/images/products/seo-portfolio-04.svg",
      title: "Link Building — Evolução do DA",
      description:
        "Backlinks conquistados e crescimento da autoridade de domínio",
      isMain: false,
      sortOrder: 4,
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PA0003 — CONFIGURAÇÃO DE GOOGLE NEGÓCIOS
// ════════════════════════════════════════════════════════════════════════════

const googleNegociosMeta = {
  complementaryProductIds: ["PA0001", "PA0002", "PA0004"],
  recurrence: "Avulso e Mensal",
  deliveryDays: "8",
  summaryDescription:
    "Configuração e otimização profissional do perfil Google Meu Negócio para aparecer no Google e Google Maps com credibilidade.",
  finalPrice: 136.08,
  itemLimit: 1,
  totalExecutionHours: 3,
  executionHoursPerDay: 1,
  testsEnabled: true,
  stepsEnabled: true,

  // ── Modelo de tarefa ─────────────────────────────────────────────────────
  taskModel: {
    objective:
      "Configurar e otimizar o perfil Google Meu Negócio com dados precisos, categoria correta, fotos, posts e respostas a avaliações, entregando documento de entrega completo com prints de cada seção.",
    creator: "Consultor/Agência",
    responsible: "Líder de Performance",
    executor: "Nômade Especialista",
    requiresAccess: true,
    itemLimit: 1,
    totalDeadlineDays: 8,
    totalDeadlineNote:
      "8 dias úteis considerando 1 dia de aprovação por etapa: E01 (1 dia execução + 1 aprovação) + E02 (3 dias execução + 1 aprovação) + E03 (1 dia execução + 1 aprovação) = 8 dias úteis.",
  },

  // ── Avisos importantes ───────────────────────────────────────────────────
  warnings: [
    {
      id: "W01",
      title: "Qualidade do briefing",
      description:
        "Quanto mais detalhado e completo o briefing, melhor será a entrega. Informações incompletas resultam em entregas incompletas.",
      severity: "info",
    },
    {
      id: "W02",
      title: "Compartilhamento de acesso obrigatório",
      description:
        "O cliente deve compartilhar a conta do Google Meu Negócio como proprietário com o e-mail mktperformance2023@gmail.com antes da execução. Sem esse acesso, a tarefa não pode ser iniciada.",
      severity: "warning",
    },
    {
      id: "W03",
      title: "Limite de posts e respostas",
      description:
        "O serviço está limitado a 10 publicações e 20 respostas a avaliações. Quantidades superiores precisam ser negociadas como adicional.",
      severity: "info",
    },
    {
      id: "W04",
      title: "Criação de contas",
      description:
        "A allka não se responsabiliza pela criação de contas Google ou recuperação de acesso. O cliente deve providenciar o acesso antes do início.",
      severity: "warning",
    },
    {
      id: "W05",
      title: "Direitos autorais e responsabilidade",
      description:
        "Todo material enviado pelo cliente (fotos, textos, logotipos) deve ser de sua propriedade ou ter autorização de uso. A responsabilidade por violações de direitos autorais é exclusivamente do cliente.",
      severity: "warning",
    },
  ],

  // ── Instruções de liberação de acessos ───────────────────────────────────
  accessInstructions: {
    email: "mktperformance2023@gmail.com",
    role: "Proprietário",
    platform: "Google Meu Negócio",
    steps: [
      "Acesse business.google.com",
      "Selecione o perfil do negócio",
      "Clique em 'Usuários' (ícone de pessoa com +)",
      "Insira o e-mail: mktperformance2023@gmail.com",
      "Selecione a função 'Proprietário'",
      "Clique em 'Convidar'",
    ],
    removalSteps: [
      "Após aprovação da entrega, acesse business.google.com",
      "Selecione o perfil do negócio → Usuários",
      "Localize mktperformance2023@gmail.com",
      "Remova o acesso clicando nos 3 pontos → 'Remover acesso'",
    ],
    note: "O acesso é removido pelo nômade na Etapa 3 (Remoção de acessos). O cliente é notificado após a remoção.",
  },

  // ── Termos de execução ───────────────────────────────────────────────────
  executionTerms: [
    "O nômade deve analisar completamente o briefing antes de iniciar qualquer configuração",
    "Informações do site do cliente e links úteis fornecidos devem ser consultados para captar dados precisos",
    "O cadastro deve ser realizado de forma completa: nome, endereço, telefone, site, horários, categoria, atributos e descrição",
    "Horários de funcionamento e meios de contato devem ser configurados obrigatoriamente",
    "Quando enviados pelo cliente, postar até 10 publicações; quando fornecidas respostas modelo, responder até 20 comentários/avaliações",
    "O documento modelo de entrega deve ser preenchido com prints de cada etapa realizada",
    "Quando necessário, solicitar o envio de carta de verificação Google ao cliente",
    "O documento de entrega preenchido deve ser anexado na etapa de entrega (E02)",
    "Não entregar com erros de cadastro (nome errado, endereço incorreto, horários desatualizados)",
    "Após entrega, aguardar aprovação do cliente ou solicitar alterações antes de avançar",
    "Na etapa de remoção (E03), remover o acesso mktperformance2023@gmail.com após aprovação da entrega",
  ],

  // ── Documento de entrega ─────────────────────────────────────────────────
  deliveryDocument: {
    templateName: "Documento de Entrega — Google Meu Negócio",
    templateCode: "PA0003-DOC-ENTREGA",
    requiredSections: [
      "Dados da empresa configurados (print do perfil)",
      "Horários de funcionamento (print)",
      "Meios de contato configurados (print)",
      "Posts publicados (prints de cada post)",
      "Respostas a avaliações (prints ou lista de avaliações respondidas)",
      "Status de verificação (verificado / carta solicitada / não aplicável)",
      "Observações e pendências do cliente",
    ],
    attachmentRequired: true,
    attachmentStage: "PA0003-E02",
    note: "O documento deve ser anexado na etapa E02 (Configuração de Google Negócios) antes de marcá-la como concluída.",
  },

  // ── Regras de recorrência ────────────────────────────────────────────────
  recurrenceRules: {
    avulso: {
      expiresAfterDays: 90,
      description:
        "Contratação avulsa válida por até 90 dias. Se não utilizada dentro desse prazo, expira automaticamente.",
    },
    mensal: {
      cycleDays: 30,
      expiresIfUnused: true,
      description:
        "Disponível a cada 30 dias. Expira se não utilizado antes da próxima abertura de ciclo.",
    },
  },

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
    tagline:
      "Clientes que buscam seu tipo de negócio no Google não encontram você — ou encontram o concorrente. Com o Google Negócios configurado por especialistas, seu perfil aparece com informações corretas, fotos e avaliações respondidas.",
    highlights: [
      "Configuração completa do perfil no Google Meu Negócio",
      "Otimização para Google Maps e busca local",
      "Publicação de até 10 posts no perfil",
      "Resposta a até 20 avaliações dos clientes",
    ],
    targetAudience: [
      "Pequenas e médias empresas que não aparecem no Google quando alguém busca pelo seu serviço na região",
      "Negócios que aparecem no Google com informações erradas, desatualizadas ou incompletas",
      "Empreendedores que nunca configuraram o Google Meu Negócio e estão perdendo clientes locais para quem configurou",
      "Empresas locais que querem atrair mais clientes da região sem investir em anúncios",
      "Negócios que perderam acesso ao perfil ou precisam otimizar um perfil já existente",
    ],
    whatIsIncluded: [
      {
        title: "Configuração e otimização do perfil",
        description:
          "Configuração completa do Google Meu Negócio: nome, endereço, telefone, horários, site, categoria e atributos do negócio.",
      },
      {
        title: "Captura de conteúdo e materiais",
        description:
          "Coleta de informações do site do cliente e de materiais enviados para preencher o perfil com dados precisos e otimizados.",
      },
      {
        title: "Cardápio, catálogo e funcionalidades",
        description:
          "Configuração de menu, catálogo de produtos/serviços e funcionalidades específicas da categoria do negócio.",
      },
      {
        title: "Fotos e identidade visual",
        description:
          "Upload e organização das fotos fornecidas pelo cliente (capa, perfil, galeria do ambiente e produtos).",
      },
      {
        title: "Publicação de posts",
        description:
          "Criação e publicação de até 10 posts no perfil Google com conteúdo relevante para engajar e informar.",
      },
      {
        title: "Respostas a avaliações",
        description:
          "Redação e publicação de respostas profissionais a até 20 avaliações existentes (positivas e negativas).",
      },
    ],
    benefits: [
      {
        title: "Posicionamento profissional",
        description:
          "Seu negócio aparece no Google e no Google Maps com informações completas, fotos organizadas e avaliações respondidas — transmitindo confiança e credibilidade ao primeiro contato.",
      },
      {
        title: "Auto-gestão",
        description:
          "O Google Meu Negócio é gratuito e pode ser atualizado pelo próprio dono. Você recebe o perfil configurado e pronto para usar, com plena autonomia para atualizações futuras.",
      },
      {
        title: "SEO local",
        description:
          'Perfis bem configurados aparecem com muito mais frequência em buscas locais como "restaurante perto de mim" ou "[serviço] em [cidade]" — geração orgânica de clientes sem investimento em anúncios.',
      },
      {
        title: "Visibilidade aprimorada",
        description:
          "Posts, fotos e informações atualizadas aumentam o alcance do perfil e sinalizaem ao algoritmo do Google que o negócio está ativo — sem custo adicional.",
      },
      {
        title: "Interatividade",
        description:
          "Responder avaliações e publicar posts regulares aumenta o engajamento do público e diferencia o negócio dos concorrentes que ignoram o canal.",
      },
      {
        title: "Credibilidade",
        description:
          "Avaliações respondidas de forma profissional constroem reputação sólida. Clientes leem as respostas antes de escolher um fornecedor.",
      },
      {
        title: "Insights valiósos",
        description:
          "O Google Meu Negócio fornece dados de desempenho gratuitos: número de buscas, visualizações, cliques no site, ligações e solicitações de rota geradas pelo perfil.",
      },
      {
        title: "Acesso gratuito",
        description:
          "O Google Meu Negócio é uma ferramenta 100% gratuita do Google. O investimento é exclusivamente na configuração profissional para aproveitá-la ao máximo.",
      },
    ],
    deliverables: [
      "Perfil Google Meu Negócio configurado e otimizado",
      "Até 10 posts publicados no perfil",
      "Respostas a até 20 avaliações",
      "Relatório de entrega com resumo das configurações realizadas",
      "Orientação para a etapa de validação por carta (responsabilidade do cliente)",
    ],
    notIncluded: [
      "Design e criação de conteúdo (fotos, vídeos, banners) — o cliente deve fornecer os materiais visuais",
      "Instalação de tags e pixels de rastreamento (Data Analytics) — disponível como serviço separado",
      "Criação da conta Google Meu Negócio — o cliente deve possuir conta ativa antes do início",
      "Configuração de perfis em outras plataformas (Waze, Apple Maps, Bing Places, Yelp, etc.)",
      "Criação de site ou landing page",
      "Gestão contínua do perfil após a entrega — contratar modalidade mensal para manutenção",
      "Validação por carta Google — essa etapa é realizada pelo próprio cliente",
    ],
    complementaryProducts: [
      {
        title: "Análise de Usabilidade UX (até 5 páginas)",
        description:
          "Avaliação da experiência do usuário no site para identificar barreiras e oportunidades de conversão — ideal para aproveitar o tráfego orgânico gerado pelo perfil.",
      },
      {
        title: "Construção de Landing Page WordPress",
        description:
          "Crie uma página focada em conversão para receber os visitantes vindos do Google Maps e transformar visualizações em clientes.",
      },
      {
        title: "Gestão de Tráfego — Até 2 Campanhas",
        description:
          "Combine o alcance orgânico do Google Negócios com campanhas pagas no Google Ads para maximizar a visibilidade local e atrair mais clientes da região.",
      },
      {
        title: "Banner Digital Estático ou Carrossel (até 5 telas)",
        description:
          "Crie materiais visuais profissionais para posts no Google Negócios, mantendo o perfil atualizado com conteúdo de qualidade.",
      },
    ],
    requirements: [
      "Acesso de gerenciamento ao perfil Google Meu Negócio existente (ou e-mail Google para criação)",
      "Informações completas do negócio: nome, endereço, telefone, horários de funcionamento",
      "Fotos do negócio fornecidas pelo cliente (mínimo: foto de capa e foto de perfil)",
      "Briefing preenchido com categoria do negócio, serviços/produtos e diferenciais",
    ],
    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Adicione o produto ao projeto e preencha o briefing com as informações do negócio.",
      },
      {
        step: "Envie os materiais",
        description:
          "Envie pelo chat do projeto as fotos e qualquer material adicional (cardápio, catálogo, etc.).",
      },
      {
        step: "Acompanhe a configuração",
        description:
          "O especialista configura o perfil em até 3 dias úteis. Você acompanha o progresso pelo painel.",
      },
      {
        step: "Valide a carta Google",
        description:
          "Ao final, o Google pode solicitar validação por carta (código enviado pelo correio). Essa etapa é feita pelo próprio cliente.",
      },
    ],
    faq: [
      {
        question: "O que é o Google Meu Negócio?",
        answer:
          "É a ferramenta gratuita do Google que permite que seu negócio apareça no Google Search e Google Maps. Com o perfil bem configurado, clientes encontram seu endereço, telefone, horários e avaliações diretamente na busca.",
      },
      {
        question:
          "Já tenho um perfil no Google. Vocês também fazem a otimização?",
        answer:
          "Sim. O serviço inclui tanto a criação de um perfil novo quanto a otimização de um perfil existente, corrigindo informações desatualizadas e adicionando conteúdo.",
      },
      {
        question: "O que é a validação por carta?",
        answer:
          "O Google pode solicitar a confirmação do endereço do negócio enviando uma carta com um código de verificação pelo correio. Essa etapa é de responsabilidade do cliente e não depende da allka.",
      },
      {
        question: "Preciso fornecer fotos?",
        answer:
          "Sim. Fotos de qualidade são essenciais para o perfil. Você precisa fornecer no mínimo uma foto de capa e uma foto de perfil. Quanto mais fotos, melhor a apresentação.",
      },
      {
        question: "O serviço inclui gestão contínua do perfil?",
        answer:
          "Não. Este serviço cobre a configuração e otimização inicial. Para manutenção mensal (novos posts, respostas a avaliações, atualizações), contrate a modalidade mensal.",
      },
      {
        question: "Em quanto tempo o perfil fica pronto?",
        answer:
          "Em até 3 dias úteis após o recebimento do briefing e dos materiais completos.",
      },
    ],
    warnings: [
      "Quanto maior o detalhamento das informações, mais fiel e qualitativa será a entrega.",
      "É necessário o compartilhamento como proprietário da conta com o e-mail mktperformance2023@gmail.com",
      "Limitado a 10 novos posts com foto e 20 respostas a seguidores/avaliações",
      "A Allka não se responsabiliza pela criação das contas",
      "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar a Lei Federal Nº 9.610/98",
    ],
  },

  // ── Features base ────────────────────────────────────────────────────────
  baseFeatures: [
    "Verificação de acessos e análise do briefing (T01 — 0,5h)",
    "Configuração completa do perfil: dados, horários, contatos, fotos e catálogo (T02 — 2,25h)",
    "Publicação de até 10 posts e respostas a até 20 avaliações (incluso em T02)",
    "Preenchimento do documento de entrega com prints e remoção de acessos (T03 — 0,25h)",
    "3 etapas de execução: E01 Verificação → E02 Configuração → E03 Remoção de acessos",
    "Total: 8 dias úteis (considerando 1 dia de aprovação por etapa)",
    "Execução por nômade habilitado — Especialidade Performance / Google",
  ],

  // ── Tarefas ──────────────────────────────────────────────────────────────
  tasks: [
    {
      id: "PA0003-T01",
      name: "Verificação de Acessos e Análise do Briefing",
      description:
        "Análise completa do briefing, verificação do acesso compartilhado ao Google Meu Negócio e captação de informações no site e links úteis do cliente.",
      taskCategory: "Planejamento",
      objective:
        "Garantir que todos os acessos necessários estejam disponíveis e que as informações do briefing sejam suficientes para iniciar a configuração.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: true,
      creator: "Consultor/Agência",
      responsible: "Líder de Performance",
      executor: "Nômade Especialista",
      executionRules: [
        "Verificar se o acesso mktperformance2023@gmail.com foi compartilhado como proprietário",
        "Analisar o briefing completo (todos os 11 campos) antes de qualquer acesso ao perfil",
        "Acessar o site e os links úteis informados para captar informações complementares",
        "Se o acesso não estiver disponível, notificar o cliente e aguardar antes de avançar",
        "Se o briefing estiver incompleto, solicitar complementação antes de avançar para T02",
      ],
      calculatedCost: 20,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T01-S01",
          name: "Análise do Briefing",
          description:
            "Ler o briefing preenchido pelo cliente, identificar informações faltantes e confirmar recebimento de fotos e materiais.",
          order: 1,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Verificar os 11 campos do briefing: conta Google, dados do negócio, endereço, site, descrição, telefone, modelos de resposta, observações e materiais.",
        },
        {
          id: "PA0003-T01-S02",
          name: "Verificação de Acesso e Captação no Site",
          description:
            "Confirmar acesso ao Google Meu Negócio via mktperformance2023@gmail.com e captar informações complementares no site e links enviados.",
          order: 2,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Sem acesso confirmado, não avançar. Registrar URL do site visitado e informações captadas para uso na configuração.",
        },
      ],
    },
    {
      id: "PA0003-T02",
      name: "Configuração Completa do Google Negócios",
      description:
        "Cadastro e configuração completa do perfil Google Meu Negócio: dados da empresa, horários, meios de contato, fotos, categoria, atributos, cardápio/catálogo, posts e respostas a avaliações. Preenchimento do documento de entrega com prints.",
      taskCategory: "Execução",
      objective:
        "Ter o perfil Google Meu Negócio 100% configurado, com posts publicados e avaliações respondidas, pronto para entrega ao cliente.",
      dependencies: ["PA0003-T01"],
      canRunInParallel: false,
      requiresAccess: true,
      creator: "Consultor/Agência",
      responsible: "Líder de Performance",
      executor: "Nômade Especialista",
      executionRules: [
        "Usar o nome exato do negócio — sem palavras-chave extras (viola políticas do Google)",
        "Cadastrar endereço, telefone e site exatamente como informados no briefing",
        "Configurar todos os horários de funcionamento, incluindo dias especiais se informados",
        "Preencher meios de contato: telefone, site, WhatsApp (se disponível)",
        "Fazer upload de todas as fotos enviadas pelo cliente (mínimo: capa e perfil)",
        "Configurar cardápio, catálogo ou lista de serviços quando enviados pelo cliente",
        "Publicar até 10 posts com base nos materiais e informações do briefing",
        "Responder até 20 avaliações usando os modelos de resposta fornecidos no briefing",
        "Preencher o documento de entrega (PA0003-DOC-ENTREGA) com print de cada seção configurada",
        "Solicitar carta de verificação Google quando o perfil ainda não estiver verificado",
        "Não fechar a tarefa com erros de cadastro — dado errado é retrabalho antes de entregar",
      ],
      calculatedCost: 96,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T02-S01",
          name: "Cadastro de Dados, Horários e Contatos",
          description:
            "Preencher nome, endereço, telefone, site, horários de funcionamento e meios de contato no perfil Google Meu Negócio.",
          order: 1,
          estimatedHours: 0.75,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 34,
          internalGuidance:
            "Confirmar que o endereço está exato (incluindo CEP). Horários devem cobrir todos os dias da semana informados. Telefone deve ter DDD.",
        },
        {
          id: "PA0003-T02-S02",
          name: "Categoria, Atributos, Fotos e Catálogo",
          description:
            "Configurar categoria principal e secundárias, preencher atributos, fazer upload das fotos e configurar cardápio ou catálogo de produtos/serviços.",
          order: 2,
          estimatedHours: 0.75,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 34,
          internalGuidance:
            "A categoria principal é o fator mais relevante para ranqueamento local. Usar categorias secundárias coerentes. Atributos aumentam visibilidade nos filtros do Maps.",
        },
        {
          id: "PA0003-T02-S03",
          name: "Posts e Respostas a Avaliações",
          description:
            "Publicar até 10 posts com base nos materiais do cliente e responder até 20 avaliações usando os modelos de resposta informados no briefing.",
          order: 3,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 20,
          internalGuidance:
            "Posts: variar entre novidade, oferta e evento. Incluir CTA (ligar, visitar, saber mais). Respostas: usar os modelos do briefing como base, personalizando para cada avaliação.",
        },
        {
          id: "PA0003-T02-S04",
          name: "Documento de Entrega com Prints",
          description:
            "Preencher o documento modelo de entrega (PA0003-DOC-ENTREGA) com prints de cada seção configurada e anexar na etapa E02.",
          order: 4,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Prints obrigatórios: dados da empresa, horários, contatos, fotos carregadas, posts publicados e avaliações respondidas. Solicitar carta de verificação quando necessário.",
        },
      ],
    },
    {
      id: "PA0003-T03",
      name: "Remoção de Acessos e Encerramento",
      description:
        "Após aprovação da entrega pelo cliente, remover o acesso mktperformance2023@gmail.com do perfil Google Meu Negócio e registrar o encerramento do projeto.",
      taskCategory: "Encerramento",
      objective:
        "Garantir que o acesso temporário seja removido após a entrega aprovada, mantendo a segurança da conta do cliente.",
      dependencies: ["PA0003-T02"],
      canRunInParallel: false,
      requiresAccess: true,
      creator: "Consultor/Agência",
      responsible: "Líder de Performance",
      executor: "Nômade Especialista",
      executionRules: [
        "Somente remover o acesso após aprovação explícita da entrega pelo cliente",
        "Remover o e-mail mktperformance2023@gmail.com da lista de proprietários",
        "Confirmar por print que o acesso foi removido",
        "Notificar o cliente no chat que o acesso foi removido",
        "Registrar no histórico do projeto a data e hora da remoção",
      ],
      calculatedCost: 10,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T03-S01",
          name: "Remoção de Acesso e Registro de Encerramento",
          description:
            "Remover mktperformance2023@gmail.com do perfil Google, tirar print da confirmação e notificar o cliente.",
          order: 1,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Acesse business.google.com → Usuários → Localizar mktperformance2023@gmail.com → Remover. Tirar print antes e depois.",
        },
      ],
    },
  ],

  // ── Etapas (kanban de execução) ──────────────────────────────────────────
  stages: [
    {
      id: "PA0003-E01",
      code: "PA0003-E01",
      number: 1,
      name: "Verificação de Acessos",
      description:
        "Análise do briefing, verificação do acesso ao Google Meu Negócio e captação de informações no site do cliente.",
      category: "Planejamento",
      deliveryDeadlineDays: 1,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 0.5,
      value: 20,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "junior",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Confirmar acesso mktperformance2023@gmail.com antes de avançar para E02. Sem acesso, aguardar e notificar o cliente.",
    },
    {
      id: "PA0003-E02",
      code: "PA0003-E02",
      number: 2,
      name: "Configuração de Google Negócios",
      description:
        "Cadastro e configuração completa do perfil: dados, horários, contatos, fotos, posts, respostas a avaliações e documento de entrega.",
      category: "Execução",
      deliveryDeadlineDays: 5,
      executionDeadlineDays: 3,
      approvalDeadlineDays: 10,
      executionHours: 2.25,
      value: 96,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
      internalGuidance:
        "Documento de entrega (PA0003-DOC-ENTREGA) preenchido com prints deve ser anexado antes de marcar E02 como concluída. Não entregar com erros cadastrais.",
    },
    {
      id: "PA0003-E03",
      code: "PA0003-E03",
      number: 3,
      name: "Remoção de Acessos",
      description:
        "Após aprovação da entrega, remover o acesso mktperformance2023@gmail.com do perfil Google Meu Negócio e encerrar o projeto.",
      category: "Encerramento",
      deliveryDeadlineDays: 7,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 0.25,
      value: 10,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "junior",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Só remover acesso após aprovação de E02. Print de confirmação obrigatório. Notificar cliente após remoção.",
    },
  ],

  // ── Questionário de briefing ─────────────────────────────────────────────
  questionnaire: {
    id: "PA0003-Q",
    title: "Briefing — Configuração de Google Negócios",
    description:
      "Preencha com as informações do seu negócio. Quanto mais detalhado, melhor será a entrega. Campos em aberto serão complementados com informações captadas no site indicado.",
    briefingTitle: "Briefing de Google Meu Negócio",
    briefingInstructions:
      "Gere um documento de briefing estruturado com todos os dados do negócio para configuração do Google Meu Negócio: conta Google, dados cadastrais, endereço, contato, descrição, horários, modelos de resposta e materiais de apoio.",
    questions: [
      {
        id: "PA0003-Q01",
        question: "Nome da conta Google (e-mail usado no perfil)",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Acesso",
        briefingKey: "contaGoogle",
        aiContext:
          "E-mail Google da conta proprietária do perfil Google Meu Negócio",
        placeholder: "Ex: contato@seusite.com.br ou seunegocio@gmail.com",
        warning:
          "Compartilhe a conta como proprietário com mktperformance2023@gmail.com antes do início. Sem esse acesso, a tarefa não pode ser executada.",
      },
      {
        id: "PA0003-Q02",
        question: "Dados do Google Negócios da empresa",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Negócio",
        briefingKey: "dadosNegocio",
        aiContext:
          "Informações gerais do negócio: nome, categoria, tipo de atividade, produtos/serviços principais",
        placeholder:
          "Ex: Clínica de Estética Corporal e Facial, especializada em depilação a laser, limpeza de pele e tratamentos faciais. Atende apenas com hora marcada.",
      },
      {
        id: "PA0003-Q03",
        question: "Endereço completo da empresa",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Localização",
        briefingKey: "enderecoCompleto",
        aiContext:
          "Endereço físico completo: rua, número, complemento, bairro, cidade, estado, CEP",
        placeholder:
          "Ex: Av. Paulista, 1234, Sala 56 — Bela Vista, São Paulo/SP, CEP 01310-100",
        warning:
          "O endereço deve estar correto e atualizado. Erros afetam a visibilidade no Google Maps.",
      },
      {
        id: "PA0003-Q04",
        question: "Website ou página da empresa",
        type: "text",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Contato",
        briefingKey: "website",
        aiContext:
          "URL do site ou página principal do negócio (Instagram, Facebook, etc.)",
        placeholder:
          "Ex: https://seusite.com.br ou https://instagram.com/seunegocio",
      },
      {
        id: "PA0003-Q05",
        question: "Descrição resumida da empresa",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Negócio",
        briefingKey: "descricaoResumida",
        aiContext:
          "Descrição da empresa para o perfil Google Meu Negócio (até 750 caracteres)",
        placeholder:
          "Ex: Somos uma clínica de estética há 10 anos no mercado, oferecendo tratamentos faciais e corporais com tecnologia avançada. Atendimento personalizado com profissionais certificados.",
        warning:
          "Se não fornecida, a descrição será captada no site informado. Quanto mais detalhada, melhor.",
      },
      {
        id: "PA0003-Q06",
        question: "Telefone(s) de contato",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Contato",
        briefingKey: "telefone",
        aiContext:
          "Número(s) de telefone principal e secundário do negócio com DDD",
        placeholder: "Ex: (11) 91234-5678 | (11) 3456-7890",
      },
      {
        id: "PA0003-Q07",
        question: "Modelo de resposta para elogios / avaliações positivas",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Avaliações",
        briefingKey: "respostaElogios",
        aiContext:
          "Texto modelo ou orientação para responder avaliações positivas dos clientes",
        placeholder:
          "Ex: Olá, [nome]! Muito obrigado pelo carinho e pela confiança. É um prazer atender você. Esperamos te ver em breve!",
        warning:
          "Se não fornecida, o especialista criará respostas coerentes com o tom do negócio.",
      },
      {
        id: "PA0003-Q08",
        question: "Modelo de resposta para sugestões",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Avaliações",
        briefingKey: "respostaSugestoes",
        aiContext:
          "Texto modelo ou orientação para responder avaliações com sugestões de melhoria",
        placeholder:
          "Ex: Olá, [nome]! Obrigado pela sua sugestão, ela é muito importante para nosso crescimento. Vamos analisar com atenção. Conte sempre conosco!",
        warning:
          "Se não fornecida, o especialista criará respostas profissionais baseadas nas boas práticas.",
      },
      {
        id: "PA0003-Q09",
        question: "Modelo de resposta para reclamações",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Avaliações",
        briefingKey: "respostaReclamacoes",
        aiContext:
          "Texto modelo ou orientação para responder avaliações negativas ou reclamações",
        placeholder:
          "Ex: Olá, [nome]! Lamentamos pela experiência. Entre em contato pelo (11) 91234-5678 para que possamos resolver da melhor forma. Sua satisfação é nossa prioridade.",
        warning:
          "Respostas a reclamações são críticas para a reputação. Se não fornecida, o especialista usará linguagem profissional e empática.",
      },
      {
        id: "PA0003-Q10",
        question: "Observações e links úteis",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Complemento",
        briefingKey: "observacoesLinks",
        aiContext:
          "Observações adicionais e links de referência (redes sociais, outros perfis, site com informações, etc.)",
        placeholder:
          "Ex: Instagram: @seunegocio | Cardápio: https://link.com/cardapio | Atenção: não atendemos em feriados.",
      },
      {
        id: "PA0003-Q11",
        question: "Materiais para o Google Negócios",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Materiais",
        briefingKey: "materiais",
        aiContext:
          "Lista dos materiais enviados (fotos, logotipos, cardápio, catálogo, etc.) e onde foram enviados",
        placeholder:
          "Ex: Logotipo enviado no chat | 5 fotos do ambiente | Cardápio em PDF enviado | Não tenho foto de capa ainda.",
        warning:
          "Envie todos os materiais pelo chat do projeto antes do início. Fotos mínimas: capa (horizontal) e logotipo/perfil.",
      },
    ],
  },

  // ── Testes de nômades ────────────────────────────────────────────────────
  nomadTests: [
    {
      id: "PA0003-TEST01",
      code: "PA0003-TEST01",
      name: "Teste de Habilitação — Configuração de Google Meu Negócio",
      description:
        "O nômade deve configurar um perfil fictício do Google Meu Negócio demonstrando domínio das boas práticas de cadastro, categoria, posts, respostas a avaliações e preenchimento do documento de entrega.",
      linkedTaskId: "PA0003-T02",
      linkedTaskName: "Configuração Completa do Google Negócios",
      fakeClientName: "Cafeteria Aroma — Café Especial",
      fakeObjective:
        "Configurar o perfil Google Meu Negócio da Cafeteria Aroma para aparecer no Google Maps quando alguém buscar 'café especial em Curitiba'.",
      fakeContext:
        "Cafeteria Aroma — Rua Carlos de Carvalho, 450 — Batel, Curitiba/PR, CEP 80430-180. Tel: (41) 98765-4321. Site: cafeteriaroma.com.br. Horários: seg–sáb 8h–19h, dom 10h–15h. Serve cafés especiais, salgados artesanais. Wi-Fi gratuito. Nunca teve perfil no Google. Materiais enviados: logotipo (PNG), 3 fotos internas, 2 fotos dos produtos e cardápio em PDF. Modelo para elogios: 'Obrigado, [nome]! É um prazer receber você na Aroma.' Modelo para reclamações: 'Lamentamos, [nome]. Entre em contato pelo (41) 98765-4321 para resolvermos.'",
      fakeDeliverables: [
        "Documento de entrega (PA0003-DOC-ENTREGA) preenchido com print de cada seção configurada",
        "Dados da empresa, endereço, telefone, site e horários configurados (com print)",
        "Categoria principal e ao menos 2 secundárias definidas (com justificativa)",
        "3 atributos relevantes identificados e listados (Wi-Fi, aceita cartão, etc.)",
        "2 posts redigidos (um de novidade e um de oferta) com CTA",
        "Resposta para uma avaliação positiva e uma negativa usando os modelos fornecidos",
      ],
      evaluationCriteria: [
        "Nome do negócio correto, sem palavras-chave extras",
        "Endereço, telefone e horários preenchidos exatamente como no briefing",
        "Categoria principal coerente (Café ou Cafeteria)",
        "Pelo menos 2 categorias secundárias relevantes com justificativa",
        "Atributos relevantes identificados e configurados",
        "Posts com CTA claro e conteúdo específico do negócio",
        "Respostas a avaliações baseadas nos modelos fornecidos, personalizadas para cada caso",
        "Documento de entrega preenchido com todos os prints obrigatórios",
      ],
      passingScore: 70,
      timeLimit: 90,
      enablesAdditionalTasks: [
        {
          taskId: "PA0003-T02",
          taskName: "Configuração Completa do Google Negócios",
          productId: "PA0003",
          productName: "Configuração de Google Negócios",
        },
        {
          taskId: "PA0003-T03",
          taskName: "Remoção de Acessos e Encerramento",
          productId: "PA0003",
          productName: "Configuração de Google Negócios",
        },
      ],
      isActive: true,
      createdAt: "2026-01-10T09:00:00Z",
      preCircuit: {
        welcomeTitle:
          "Bem-vindo ao Circuito de Habilitação — Google Meu Negócio",
        welcomeSubtitle:
          "Você está prestes a se habilitar para configurar perfis do Google Meu Negócio pela allka. Leia tudo com atenção antes de começar.",
        welcomeHighlights: [
          "Teste prático com cliente fictício e briefing completo",
          "Até 90 minutos para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para Configuração e Encerramento",
        ],
        aboutDescription:
          "Neste teste você vai configurar um perfil completo do Google Meu Negócio para uma cafeteria fictícia, demonstrando domínio do fluxo de cadastro, categoria, posts, respostas a avaliações e preenchimento do documento de entrega.",
        aboutWhatToExpect: [
          "Ler o briefing completo da Cafeteria Aroma (dados, horários, materiais e modelos de resposta)",
          "Preencher todas as informações do perfil conforme o briefing",
          "Definir categoria principal e secundárias com justificativa",
          "Identificar e listar os atributos relevantes",
          "Redigir 2 posts com CTA e 2 respostas a avaliações baseadas nos modelos",
          "Preencher o documento de entrega (PA0003-DOC-ENTREGA) com prints de cada seção",
        ],
        estimatedTime: "90 minutos",
        rules: [
          "Use um perfil de teste Google — nunca altere perfis reais de clientes",
          "Siga exatamente as informações do briefing — não invente dados",
          "O nome do negócio deve ser o nome real, sem palavras-chave extras",
          "As respostas a avaliações devem usar os modelos fornecidos como base, adaptados a cada caso",
          "O documento de entrega deve ser preenchido com prints reais ou capturas de tela simuladas",
        ],
        warnings: [
          "Adicionar palavras-chave ao nome do negócio viola as políticas do Google — falha crítica automática",
          "Entregas sem o documento de entrega preenchido não são aceitas",
        ],
        confirmChecklist: [
          "Li o briefing completo da Cafeteria Aroma",
          "Entendo que o nome não pode ter palavras-chave extras",
          "Sei preencher o documento de entrega com prints",
          "Conheço a diferença entre categoria principal e secundárias",
          "Tenho 90 minutos disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "PA0003-TEST01-CL",
        linkedTestId: "PA0003-TEST01",
        linkedTestName:
          "Teste de Habilitação — Configuração de Google Meu Negócio",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar especialmente: (1) nome sem keyword stuffing — falha crítica; (2) qualidade das respostas a reclamações; (3) documento de entrega com todos os prints obrigatórios.",
        sections: [
          {
            id: "CL3-S01",
            title: "Dados da Empresa e Cadastro",
            description:
              "Avaliação do preenchimento das informações cadastrais",
            items: [
              {
                id: "CL3-S01-I01",
                label: "Dados da empresa preenchidos corretamente",
                description:
                  "Nome, endereço completo, telefone e site preenchidos exatamente como no briefing",
                weight: 5,
                isRequired: true,
                hint: "Verificar cada campo no documento de entrega",
              },
              {
                id: "CL3-S01-I02",
                label: "Nome do negócio sem palavras-chave extras",
                description:
                  "O campo de nome contém apenas o nome real — sem 'melhor café', 'café em Curitiba', etc.",
                weight: 5,
                isRequired: true,
                hint: "Falha crítica: keyword stuffing no nome = reprovação imediata",
              },
              {
                id: "CL3-S01-I03",
                label: "Horários configurados conforme o briefing",
                description:
                  "Horários de todos os dias preenchidos (seg–sáb 8h–19h, dom 10h–15h)",
                weight: 4,
                isRequired: true,
                hint: "Ver print de horários no documento de entrega",
              },
              {
                id: "CL3-S01-I04",
                label: "Meios de contato preenchidos",
                description:
                  "Telefone, site e WhatsApp (quando disponível) configurados corretamente",
                weight: 3,
                isRequired: false,
                hint: "Verificar campos de contato no documento",
              },
            ],
          },
          {
            id: "CL3-S02",
            title: "Categoria e Atributos",
            description: "Avaliação da categorização e atributos do perfil",
            items: [
              {
                id: "CL3-S02-I01",
                label: "Categoria principal correta",
                description:
                  "A categoria principal está alinhada ao tipo de negócio (Café, Cafeteria ou similar)",
                weight: 5,
                isRequired: true,
                hint: "Ver categoria principal no documento com justificativa",
              },
              {
                id: "CL3-S02-I02",
                label: "Pelo menos 2 categorias secundárias relevantes",
                description:
                  "Categorias secundárias coerentes (ex: Confeitaria, Torrefação de café, Café da manhã)",
                weight: 3,
                isRequired: false,
                hint: "Ver lista de categorias secundárias com justificativa",
              },
              {
                id: "CL3-S02-I03",
                label: "Atributos relevantes identificados e configurados",
                description:
                  "Pelo menos 3 atributos marcados corretamente (Wi-Fi, aceita cartão, etc.)",
                weight: 3,
                isRequired: false,
                hint: "Ver lista de atributos no documento",
              },
            ],
          },
          {
            id: "CL3-S03",
            title: "Posts",
            description: "Avaliação dos posts redigidos",
            items: [
              {
                id: "CL3-S03-I01",
                label: "Ao menos 2 posts com CTA e conteúdo específico",
                description:
                  "Os posts têm chamada para ação (ligar, visitar, saber mais) e conteúdo relevante ao negócio",
                weight: 4,
                isRequired: false,
                hint: "Ler os posts entregues — verificar CTA e especificidade do conteúdo",
              },
              {
                id: "CL3-S03-I02",
                label: "Posts adicionados quando materiais foram enviados",
                description:
                  "O nômade usou os materiais fornecidos (fotos, cardápio) nos posts quando disponíveis",
                weight: 2,
                isRequired: false,
                hint: "Verificar se posts referenciam os materiais do briefing",
              },
            ],
          },
          {
            id: "CL3-S04",
            title: "Respostas a Avaliações",
            description: "Avaliação da qualidade das respostas",
            items: [
              {
                id: "CL3-S04-I01",
                label: "Respostas configuradas usando os modelos do briefing",
                description:
                  "As respostas usaram os modelos de elogios/reclamações fornecidos como base e foram adaptadas",
                weight: 4,
                isRequired: false,
                hint: "Comparar respostas com os modelos fornecidos no briefing",
              },
              {
                id: "CL3-S04-I02",
                label: "Resposta à avaliação negativa profissional e empática",
                description:
                  "A resposta é profissional, não confronta o cliente e oferece solução ou contato",
                weight: 5,
                isRequired: true,
                hint: "Ler resposta à avaliação negativa — sem discussão ou defensividade",
              },
            ],
          },
          {
            id: "CL3-S05",
            title: "Documento de Entrega",
            description:
              "Avaliação do preenchimento do documento PA0003-DOC-ENTREGA",
            items: [
              {
                id: "CL3-S05-I01",
                label:
                  "Prints anexados no documento (todos os campos obrigatórios)",
                description:
                  "O documento contém prints de: dados da empresa, horários, fotos carregadas, posts e avaliações respondidas",
                weight: 5,
                isRequired: true,
                hint: "Verificar se todas as seções obrigatórias do PA0003-DOC-ENTREGA estão preenchidas",
              },
              {
                id: "CL3-S05-I02",
                label: "Documento final sem campos obrigatórios em branco",
                description:
                  "Nenhuma seção obrigatória do documento está vazia ou com placeholder",
                weight: 4,
                isRequired: true,
                hint: "Revisar documento completo antes de aprovar",
              },
              {
                id: "CL3-S05-I03",
                label: "Compartilhamento solicitado corretamente documentado",
                description:
                  "O documento registra que o acesso mktperformance2023@gmail.com foi utilizado",
                weight: 3,
                isRequired: false,
                hint: "Ver seção de acessos no documento de entrega",
              },
              {
                id: "CL3-S05-I04",
                label: "Entrega sem erros cadastrais",
                description:
                  "Não há campos com dados errados, desatualizados ou inconsistentes com o briefing",
                weight: 4,
                isRequired: true,
                hint: "Cruzar dados do documento com o briefing da Cafeteria Aroma",
              },
            ],
          },
        ],
      },
    },
  ],

  // ── Dados internos por variação ──────────────────────────────────────────
  variationsInternal: {
    "PA0003-V01": {
      label: "Configuração de Google Negócios",
      code: "PA0003-V01",
      publicDeadlineLabel: "8 dias úteis",
      executionHours: 3,
    },
  },
  portfolioImages: [
    {
      id: "gneg-img-01",
      url: "/images/products/google-negocios.svg",
      title: "Visão Geral do Produto",
      description: "Perfil Google Meu Negócio configurado e otimizado",
      isMain: true,
      sortOrder: 0,
    },
    {
      id: "gneg-img-02",
      url: "/images/products/google-negocios-portfolio-01.svg",
      title: "Resultado no Google Maps",
      description: "Perfil visível no Google Maps com informações completas",
      isMain: false,
      sortOrder: 1,
    },
    {
      id: "gneg-img-03",
      url: "/images/products/google-negocios-portfolio-02.svg",
      title: "Posts Publicados",
      description: "Exemplos de posts publicados no perfil do negócio",
      isMain: false,
      sortOrder: 2,
    },
    {
      id: "gneg-img-04",
      url: "/images/products/google-negocios-portfolio-03.svg",
      title: "Respostas a Avaliações",
      description:
        "Gestão profissional das avaliações com respostas personalizadas",
      isMain: false,
      sortOrder: 3,
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PA0004 — Configuração de Data Analytics
// ════════════════════════════════════════════════════════════════════════════
const dataAnalyticsMeta = {
  complementaryProductIds: ["PA0001", "PA0002", "PA0005"],
  recurrence: "Avulso",
  deliveryDays: "9",
  summaryDescription:
    "Criação e implantação de pixel e tags de rastreamento para mensurar acessos, conversões e comportamento do usuário com precisão.",
  finalPrice: 272.16,
  itemLimit: 1,
  totalExecutionHours: 6,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,

  taskModel: {
    objective:
      "Criação e implantação de pixel e tags de rastreamento conforme solicitado no briefing, com entrega de documento comprobatório e remoção de acessos ao final.",
    creator: "Consultor/Agência",
    responsible: "Líder de Performance",
    executor: "Nômade Especialista",
    requiresAccess: true,
    itemLimit: 1,
    totalDeadlineDays: 9,
    totalDeadlineNote:
      "9 dias úteis: E01 (1 dia verificação de acessos) + E02 (4 dias configuração e entrega) + E03 (1 dia remoção de acessos). Considera 1 dia de aprovação entre etapas.",
  },

  warnings: [
    {
      id: "W01",
      level: "info",
      message:
        "Quanto maior o detalhamento das informações fornecidas no briefing, melhor será a qualidade da entrega. Descreva os objetivos, plataformas, metas de conversão e páginas com o máximo de detalhes.",
    },
    {
      id: "W02",
      level: "critical",
      message:
        "Compartilhe as contas de anúncio como administrador ou com controle total com o e-mail mktperformance2023@gmail.com. Sem acesso adequado, a execução não pode ser iniciada.",
    },
    {
      id: "W03",
      level: "critical",
      message:
        "Não é realizada instalação em plataformas que exigem alteração de código sem acesso (ex: temas customizados fechados, plataformas proprietárias). Nesses casos, é entregue documento com instruções para o desenvolvedor do cliente.",
    },
    {
      id: "W04",
      level: "warning",
      message:
        "A allka não se responsabiliza pela criação de contas nas plataformas nem pelo preenchimento de dados cadastrais. As contas devem ser criadas e configuradas pelo cliente antes do início da tarefa.",
    },
    {
      id: "W05",
      level: "warning",
      message:
        "A tarefa não inclui alterações no website — layout, conteúdo, código ou funcionalidades do site estão fora do escopo deste serviço.",
    },
    {
      id: "W06",
      level: "critical",
      message:
        "A tarefa só será liberada para execução com o website funcionando corretamente. Sites fora do ar, em manutenção ou com erros críticos impedem a instalação das tags.",
    },
    {
      id: "W07",
      level: "info",
      message:
        "A tarefa não inclui alterações em SEO — otimização de conteúdo, metadados, velocidade de carregamento ou estrutura do site não fazem parte deste produto.",
    },
    {
      id: "W08",
      level: "warning",
      message:
        "Todo o material fornecido pelo cliente (dados, textos, imagens, informações de contas) é de responsabilidade do próprio cliente quanto a direitos autorais e veracidade. A allka não se responsabiliza por conteúdo enviado pelo contratante.",
    },
  ],

  accessInstructions: {
    adminEmail: "mktperformance2023@gmail.com",
    steps: [
      {
        step: 1,
        label: "Acesso ao site",
        description:
          "Informe o login e a senha do painel administrativo do site (ex: WordPress Admin, Wix, Shopify, etc.).",
      },
      {
        step: 2,
        label: "Google Tag Manager",
        description:
          "Compartilhe o acesso ao contêiner do Google Tag Manager (se já existir) com o e-mail mktperformance2023@gmail.com como Publicador. Se não tiver GTM instalado, o acesso ao site já é suficiente para a instalação.",
      },
      {
        step: 3,
        label: "Contas de anúncio das plataformas selecionadas",
        description:
          "Compartilhe as contas das plataformas escolhidas no briefing: Google Analytics, Google Ads, Meta Ads, Pinterest Ads, LinkedIn Ads ou TikTok Ads.",
      },
      {
        step: 4,
        label:
          "Compartilhar como administrador com mktperformance2023@gmail.com",
        description:
          "Adicione o e-mail mktperformance2023@gmail.com como administrador (ou com controle total) no Google Tag Manager e em todas as contas de anúncio compartilhadas. Os acessos são removidos ao final da tarefa, na Etapa 3.",
      },
    ],
    note: "Compartilhe apenas as contas das plataformas selecionadas no briefing. Os acessos são removidos na E03 — Remoção de Acessos.",
  },

  executionTerms: [
    "Analisar o briefing e verificar se o Google Tag Manager já está instalado no site antes de iniciar qualquer configuração",
    "Instalar e configurar o Google Tag Manager no WordPress quando aplicável, via plugin oficial — não editar o código do tema diretamente",
    "Instalar e configurar o Analytics, a tag do Google Ads e os pixels das plataformas solicitadas no briefing",
    "Elaborar e entregar documento com instruções de implantação quando o site não for WordPress e não tiver Google Tag Manager instalado",
    "Elaborar documento de entrega com prints e confirmações de cada tag/pixel instalado, seguindo o modelo padronizado DTAN-DOC-ENTREGA",
    "Não entregar a tarefa com erros de instalação identificados ou sem a configuração dos eventos informados no briefing",
    "A conclusão da tarefa está condicionada à aprovação ou reprovação pelo cliente — o nômade deve aguardar a avaliação antes de encerrar",
  ],

  deliveryDocument: {
    templateName: "Documento de Entrega — Configuração de Data Analytics",
    templateCode: "DTAN-DOC-ENTREGA",
    requiredSections: [
      "Lista completa das tags/pixels instalados — com ID e plataforma",
      "Print do Tag Assistant ou debugger confirmando disparo do GTM",
      "Print do Pixel Helper do Facebook confirmando o pixel ativo",
      "Print de cada pixel/tag adicional (TikTok, LinkedIn, Google Ads) confirmando ativo",
      "Print do GA4 em tempo real confirmando dados chegando",
      "Print do Search Console confirmando propriedade verificada",
      "Observações sobre plataformas não instaladas diretamente (com código entregue ao cliente)",
    ],
    attachmentRequired: true,
    attachmentStage: "DTAN-E02",
    note: "Entrega sem o documento preenchido com evidências não é aceita pela plataforma. Prints de cada ferramenta de diagnóstico são obrigatórios.",
  },

  recurrenceRules: {
    avulso: {
      expiresAfterDays: 90,
      description:
        "Contratação avulsa válida por até 90 dias. Se não utilizada dentro desse prazo, expira automaticamente.",
    },
  },

  presentation: {
    tagline:
      "Instale e configure todos os pixels e tags do seu site em uma única contratação — rastreie acessos, conversões e comportamento com precisão.",
    highlights: [
      "Instalação de Google Tag Manager, Analytics, Pixel do Facebook, TikTok, LinkedIn e Google Ads",
      "Configuração de eventos e conversões para monitorar o que realmente importa",
      "Instalação completa em WordPress ou entrega de códigos para outras plataformas",
      "Relatório final comprovando cada implantação com evidências de disparo",
    ],
    targetAudience: [
      "Empresas que fazem marketing digital sem monitorar dados ou com ferramentas configuradas incorretamente",
      "Negócios que vão iniciar campanhas pagas e precisam dos pixels instalados antes",
      "Sites em WordPress que precisam do GTM + Analytics + pixels configurados corretamente",
      "Empreendedores que perderam rastreamento após troca de site ou plataforma",
    ],
    whatIsIncluded: [
      {
        title: "Instalação do Google Tag Manager",
        description:
          "Criação ou conexão do contêiner GTM ao site. Em WordPress, instalação via plugin oficial. Em outras plataformas, entrega do código para o desenvolvedor.",
      },
      {
        title: "Configuração do Google Analytics 4",
        description:
          "Vinculação da propriedade GA4 ao GTM, configuração de eventos básicos e verificação de dados chegando em tempo real.",
      },
      {
        title: "Pixels de plataformas de anúncios",
        description:
          "Instalação do Pixel do Facebook Ads, Pixel do TikTok, Pixel do LinkedIn Ads, Tag de Remarketing Google Ads e Tag de Conversão Google Ads — conforme selecionado no briefing.",
      },
      {
        title: "Configuração de eventos e conversões",
        description:
          "Criação das regras de disparo para os eventos solicitados: pageview, lead, purchase, contato, entre outros definidos no briefing.",
      },
      {
        title: "Google Search Console",
        description:
          "Verificação de propriedade do domínio, configuração básica e submissão do sitemap quando disponível.",
      },
      {
        title: "Relatório de entrega com evidências",
        description:
          "Documento final (DTAN-DOC-ENTREGA) com prints de cada tag/pixel disparando corretamente, comprovando todas as implantações realizadas.",
      },
    ],
    deliverables: [
      "Google Tag Manager instalado e contêiner configurado",
      "Google Analytics 4 disparando e recebendo dados",
      "Pixels de anúncios instalados e validados (conforme briefing)",
      "Eventos e conversões configurados conforme solicitado",
      "Google Search Console verificado e sitemap submetido",
      "Relatório de entrega (DTAN-DOC-ENTREGA) com prints de cada implantação",
    ],
    notIncluded: [
      "Alterações no site (layout, conteúdo, código)",
      "Gestão de campanhas de anúncios",
      "Instalação via API (Conversions API do Meta, Server-Side GTM, API do TikTok)",
      "Análise de dados e criação de dashboards",
      "Criação de estratégias de marketing",
      "Instalação em plataformas que exigem programação backend",
      "Instalação em plataformas com problemas técnicos identificados",
    ],
    requirements: [
      "Acesso de administrador ao painel WordPress (para instalação direta) ou GTM já instalado no site",
      "Contas criadas nas plataformas desejadas (Google, Meta, TikTok, LinkedIn) — a allka não cria contas pelo cliente",
      "Briefing completo com lista de tags/pixels desejados e eventos a monitorar",
      "Compartilhamento de acessos conforme instruções antes do início da E02",
    ],
    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Adicione o produto ao projeto. O briefing estará disponível assim que a contratação for confirmada.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe a URL do site, plataforma, quais tags/pixels instalar e os eventos que deseja monitorar.",
      },
      {
        step: "Compartilhe os acessos",
        description:
          "Adicione mktperformance2023@gmail.com nas plataformas indicadas nas instruções de acesso antes do início.",
      },
      {
        step: "Acompanhe a instalação",
        description:
          "O especialista instala e configura tudo em até 4 dias úteis. Você acompanha pelo painel e recebe o relatório ao final.",
      },
    ],
    faq: [
      {
        question:
          "Meu site não é WordPress. Vocês conseguem instalar assim mesmo?",
        answer:
          "Sim, mas de forma diferente. Para sites fora do WordPress (Wix, Shopify, Webflow, etc.), entregamos os códigos das tags e pixels com instruções detalhadas para implantação pelo seu desenvolvedor. A instalação direta é realizada apenas em WordPress.",
      },
      {
        question:
          "Já tenho o Google Tag Manager instalado no site. Precisa instalar de novo?",
        answer:
          "Não. Se o GTM já estiver instalado, apenas configuramos as tags e pixels dentro do contêiner existente. Informe isso no briefing.",
      },
      {
        question: "O que é a Conversions API e por que não está incluída?",
        answer:
          "A Conversions API (Meta CAPI) é uma integração server-side que exige alterações no backend do servidor. Esse escopo requer desenvolvimento técnico e não está coberto por este produto.",
      },
      {
        question: "Quais eventos são configurados?",
        answer:
          "Os eventos são definidos no briefing: pageview, clique em botão, envio de formulário, compra, visualização de página específica, entre outros. Configuramos apenas os eventos solicitados.",
      },
      {
        question: "Como comprovar que as tags estão funcionando?",
        answer:
          "O relatório de entrega inclui prints do Tag Assistant do Google, do Pixel Helper do Facebook e das ferramentas de diagnóstico nativas de cada plataforma, mostrando cada tag/pixel disparando corretamente.",
      },
      {
        question: "Preciso ter conta no Google Ads para instalar a tag?",
        answer:
          "Sim. A tag de remarketing e a tag de conversão do Google Ads exigem uma conta Google Ads ativa. Se não tiver conta, a instalação dessa tag específica não será realizada.",
      },
    ],
  },

  baseFeatures: [
    "Verificação de acessos e análise do briefing — E01 (1 dia útil)",
    "Instalação do GTM em WordPress ou elaboração de documento para outras plataformas",
    "Configuração de Analytics, tag do Google Ads e pixels das plataformas solicitadas",
    "Eventos e conversões configurados conforme briefing + testes de disparo de cada tag",
    "Documento DTAN-DOC-ENTREGA com prints de todas as implantações — entregue na E02",
    "Remoção de todos os acessos compartilhados ao final da tarefa — E03 (1 dia útil)",
    "3 etapas estruturadas: E01 → E02 → E03 (9 dias úteis totais)",
  ],

  tasks: [
    {
      id: "DTAN-T01",
      name: "Verificação de Acessos e Análise do Briefing",
      description:
        "Leitura do briefing, identificação de todos os acessos necessários e confirmação da plataforma do site para definir o fluxo de instalação correto.",
      taskCategory: "Planejamento",
      objective:
        "Garantir que todos os acessos, informações do site e lista de implantações estão confirmados antes de iniciar a instalação.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Identificar a plataforma do site (WordPress, GTM já instalado, outra plataforma)",
        "Confirmar quais tags/pixels foram solicitados no briefing",
        "Verificar se todos os acessos necessários foram compartilhados — se não, solicitar ao cliente antes de avançar",
        "Para WordPress: confirmar acesso de administrador ao painel WP",
        "Para outras plataformas: já preparar os códigos para entrega na E02",
      ],
      calculatedCost: 24,
      questionnaire: null,
      steps: [
        {
          id: "DTAN-T01-S01",
          name: "Análise do Briefing e Planejamento",
          description:
            "Ler o briefing completo, mapear todas as implantações solicitadas e identificar dependências (contas necessárias, tipo de plataforma, eventos).",
          order: 1,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 12,
          internalGuidance:
            "Criar uma checklist pessoal com cada tag/pixel a instalar e as ferramentas de validação correspondentes.",
        },
        {
          id: "DTAN-T01-S02",
          name: "Verificação de Acessos e Confirmação de Plataforma",
          description:
            "Confirmar cada acesso compartilhado, verificar a plataforma do site e registrar o que está disponível para início da instalação.",
          order: 2,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 12,
          internalGuidance:
            "Se algum acesso crítico estiver faltando, registrar no sistema e aguardar antes de avançar para T02.",
        },
      ],
    },
    {
      id: "DTAN-T02",
      name: "Configuração de Data Analytics e Entrega",
      description:
        "Instalação do Google Tag Manager, configuração do Analytics, instalação dos pixels e tags de anúncios das plataformas solicitadas, configuração de eventos e conversões, testes de validação e entrega do documento DTAN-DOC-ENTREGA — conforme solicitado no briefing.",
      taskCategory: "Execução",
      objective:
        "Instalar e configurar todas as tags e pixels solicitados, validar o disparo de cada implantação e entregar o documento comprobatório DTAN-DOC-ENTREGA.",
      dependencies: ["DTAN-T01"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Analisar o briefing e verificar se o Google Tag Manager já está instalado no site antes de iniciar qualquer configuração",
        "Instalar e configurar o Google Tag Manager no WordPress quando aplicável, via plugin oficial — não editar o código do tema diretamente",
        "Instalar e configurar o Analytics, a tag do Google Ads e os pixels das plataformas solicitadas no briefing",
        "Elaborar e entregar documento com instruções de implantação quando o site não for WordPress e não tiver Google Tag Manager instalado",
        "Não entregar com erros de instalação identificados ou sem a configuração dos eventos informados no briefing",
        "Elaborar o documento DTAN-DOC-ENTREGA com prints e confirmações de cada implantação realizada",
      ],
      calculatedCost: 200,
      questionnaire: null,
      steps: [
        {
          id: "DTAN-T02-S01",
          name: "Google Tag Manager e Google Analytics 4",
          description:
            "Instalar ou configurar o GTM no site e configurar a tag do GA4 com os eventos básicos de pageview.",
          order: 1,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 50,
          internalGuidance:
            "Verificar se já existe contêiner GTM antes de criar um novo. Se o site não for WordPress e não tiver GTM, elaborar documento com código para o desenvolvedor do cliente. GA4: usar tag de configuração + evento page_view.",
        },
        {
          id: "DTAN-T02-S02",
          name: "Pixel do Facebook Ads / Meta",
          description:
            "Instalar o Pixel do Facebook via GTM e configurar o evento PageView padrão.",
          order: 2,
          estimatedHours: 0.75,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 40,
          internalGuidance:
            "Usar o template oficial do Meta no GTM. Verificar com o Pixel Helper da extensão do Chrome antes de publicar.",
        },
        {
          id: "DTAN-T02-S03",
          name: "Pixels TikTok, LinkedIn e Tags Google Ads",
          description:
            "Instalar os pixels do TikTok Ads e LinkedIn Ads e as tags de Remarketing e Conversão do Google Ads via GTM.",
          order: 3,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 40,
          internalGuidance:
            "Verificar se as contas de TikTok, LinkedIn e Google Ads estão ativas antes de instalar. Se conta não existir, registrar no documento de entrega.",
        },
        {
          id: "DTAN-T02-S04",
          name: "Eventos, Conversões, Search Console e Testes",
          description:
            "Configurar os eventos e conversões solicitados no briefing via GTM, verificar o Search Console e executar os testes de disparo de todas as tags e pixels instalados.",
          order: 4,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 35,
          internalGuidance:
            "Eventos: criar triggers com base em cliques ou envio de formulários. Search Console: submeter sitemap se disponível. Testar cada tag com Tag Assistant e Pixel Helper antes de avançar para S05.",
        },
        {
          id: "DTAN-T02-S05",
          name: "Documento de Entrega (DTAN-DOC-ENTREGA)",
          description:
            "Preencher o documento de entrega com prints e confirmações de cada implantação realizada, seguindo o modelo padronizado DTAN-DOC-ENTREGA.",
          order: 5,
          estimatedHours: 1,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 35,
          internalGuidance:
            "Documento obrigatório. Uma seção por plataforma instalada. Para plataformas sem instalação direta, incluir as instruções de código entregues ao cliente. Documento sem prints de validação não é aceito.",
        },
      ],
    },
    {
      id: "DTAN-T03",
      name: "Remoção de Acessos e Encerramento",
      description:
        "Remoção do e-mail mktperformance2023@gmail.com de todas as plataformas compartilhadas durante a execução da tarefa e encerramento formal.",
      taskCategory: "Encerramento",
      objective:
        "Garantir que todos os acessos compartilhados pelo cliente sejam revogados ao final da tarefa, conforme padrão de segurança da allka.",
      dependencies: ["DTAN-T02"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Remover mktperformance2023@gmail.com de todas as plataformas em que foi adicionado durante a execução",
        "Verificar: Google Tag Manager, Google Analytics, Google Ads, Meta Business Manager, TikTok Ads, LinkedIn Ads — conforme acessos recebidos na E01",
        "Se o acesso ao site (WordPress Admin ou similar) foi fornecido, orientar o cliente a trocar a senha ao final",
        "Registrar a remoção de cada acesso — não encerrar a tarefa sem confirmar a remoção de todos os acessos",
      ],
      calculatedCost: 48,
      questionnaire: null,
      steps: [
        {
          id: "DTAN-T03-S01",
          name: "Remoção de Acessos de Todas as Plataformas",
          description:
            "Remover o e-mail mktperformance2023@gmail.com de todas as plataformas em que foi adicionado durante a execução: GTM, GA4, Google Ads, Meta, TikTok, LinkedIn e painel do site.",
          order: 1,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 48,
          internalGuidance:
            "Seguir a lista de acessos recebidos na E01. Remover um por um e confirmar cada remoção. Para o site (WordPress), orientar o cliente a trocar a senha após finalizar.",
        },
      ],
    },
  ],

  stages: [
    {
      id: "DTAN-E01",
      code: "DTAN-E01",
      number: 1,
      name: "Verificação de Acessos",
      description:
        "Leitura do briefing, verificação de todos os acessos compartilhados e confirmação de que o site está funcionando antes de iniciar a configuração.",
      category: "Planejamento",
      deliveryDeadlineDays: 1,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 0.5,
      value: 24,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Não avançar para E02 sem confirmar todos os acessos necessários. Registrar o que está faltando e solicitar ao cliente. Confirmar que o site está no ar e funcionando corretamente.",
    },
    {
      id: "DTAN-E02",
      code: "DTAN-E02",
      number: 2,
      name: "Configuração de Data Analytics",
      description:
        "Instalação do GTM, Analytics, pixels e tags das plataformas solicitadas, configuração de eventos e conversões, testes de validação e entrega do documento DTAN-DOC-ENTREGA.",
      category: "Execução",
      deliveryDeadlineDays: 6,
      executionDeadlineDays: 4,
      approvalDeadlineDays: 10,
      executionHours: 4.75,
      value: 200,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
      internalGuidance:
        "Publicar o contêiner GTM ao final das instalações. Não deixar tags em rascunho. Documento DTAN-DOC-ENTREGA obrigatório com print de cada validação.",
    },
    {
      id: "DTAN-E03",
      code: "DTAN-E03",
      number: 3,
      name: "Remoção de Acessos",
      description:
        "Remoção do e-mail mktperformance2023@gmail.com de todas as plataformas compartilhadas durante a execução da tarefa.",
      category: "Encerramento",
      deliveryDeadlineDays: 8,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 0.5,
      value: 48,
      itemLimit: 1,
      specialtyId: 6,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: true,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Remover um acesso por vez e confirmar cada remoção. Orientar o cliente a trocar a senha do site após a remoção. Não encerrar sem confirmar todas as remoções.",
    },
  ],

  questionnaire: {
    id: "DTAN-Q",
    title: "Briefing — Configuração de Data Analytics",
    description:
      "Preencha com as informações do seu negócio e das plataformas que deseja configurar. Quanto mais detalhado, melhor será a qualidade da entrega.",
    briefingTitle: "Briefing de Data Analytics",
    briefingInstructions:
      "Gere um documento de briefing estruturado para configuração de analytics: objetivo do uso, plataformas desejadas, identificação das contas, metas de conversão, páginas com necessidade de tags e plataforma do site.",
    questions: [
      {
        id: "DTAN-Q01",
        question:
          "Qual é o objetivo principal do uso de data analytics para a sua empresa?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Objetivo",
        briefingKey: "objetivoPrincipal",
        aiContext:
          "Objetivo estratégico do cliente ao implementar analytics: mensurar campanhas, monitorar conversões, entender comportamento do usuário, etc.",
        placeholder:
          "Ex: Quero mensurar o retorno das minhas campanhas de tráfego pago e entender quais páginas convertem mais | Preciso monitorar leads gerados pelo formulário de contato",
        warning:
          "Quanto mais detalhado o objetivo, melhor a configuração dos eventos e conversões. Descreva o que você quer medir e por quê.",
      },
      {
        id: "DTAN-Q02",
        question: "Quais plataformas você deseja utilizar para o analytics?",
        type: "multiselect",
        required: true,
        options: [
          "Google Tag Manager",
          "Google Analytics 4 (GA4)",
          "Google Search Console",
          "Tag do Google Ads (Remarketing e/ou Conversão)",
          "Meta Ads — Pixel do Facebook",
          "Pinterest Ads — Tag do Pinterest",
          "LinkedIn Ads — Insight Tag",
          "TikTok Ads — Pixel do TikTok",
        ],
        aiAssisted: false,
        section: "Plataformas",
        briefingKey: "plataformasAnalytics",
        aiContext:
          "Lista de plataformas de analytics e anúncios para configurar",
        placeholder: "Selecione todas que se aplicam",
        warning:
          "Selecione apenas as plataformas nas quais você já possui conta ativa. A allka não cria contas pelo cliente.",
      },
      {
        id: "DTAN-Q03",
        question: "Como podemos identificar facilmente suas contas de anúncio?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Identificação de Contas",
        briefingKey: "identificacaoContas",
        aiContext:
          "Identificadores das contas de anúncio do cliente nas plataformas selecionadas: IDs de conta, e-mails associados, nomes de Business Manager, etc.",
        placeholder:
          "Ex: Google Analytics — propriedade: meunegocio.com.br | Google Ads — ID: 123-456-7890 | Meta Business Manager — ID: 9876543210 | TikTok Ads — e-mail: marketing@empresa.com",
        warning:
          "Informe apenas as contas das plataformas selecionadas na pergunta anterior. Inclua os IDs ou e-mails para facilitar a localização no compartilhamento de acessos.",
      },
      {
        id: "DTAN-Q04",
        question:
          "Quais são as metas de conversão que você deseja rastrear com o analytics?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Metas de Conversão",
        briefingKey: "metasConversao",
        aiContext:
          "Eventos e conversões que o cliente quer monitorar: ações do usuário, envios de formulário, cliques em botões, compras, visualizações de páginas específicas",
        placeholder:
          "Ex: Envio do formulário de contato | Clique no botão 'Solicitar Orçamento' | Acesso à página /obrigado | Compra finalizada no checkout | Clique no número de WhatsApp",
        warning:
          "Seja específico. Cada meta de conversão se torna uma regra de disparo (trigger) no GTM. Quanto mais detalhado, mais precisa será a configuração.",
      },
      {
        id: "DTAN-Q05",
        question:
          "Quais páginas web necessitam da implantação de tags e pixels?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Páginas",
        briefingKey: "paginasImplantacao",
        aiContext:
          "Páginas ou seções do site onde as tags e pixels devem ser instalados ou disparar eventos específicos",
        placeholder:
          "Ex: Todas as páginas do site | Página de obrigado (/obrigado) | Checkout (/finalizar-compra) | Landing page de campanha (/lp/produto)",
        warning:
          "Se desejar rastrear todas as páginas, informe 'todas as páginas'. Se houver páginas específicas para conversões, liste-as com o caminho da URL.",
      },
      {
        id: "DTAN-Q06",
        question:
          "Em qual plataforma seu site está hospedado e qual é o nível de suporte necessário para a implantação de analytics?",
        type: "select",
        required: true,
        options: [
          "WordPress — instalação completa via plugin do GTM (acesso admin necessário)",
          "Site com Google Tag Manager já instalado — configuração das tags no contêiner existente",
          "Outra plataforma (Wix, Shopify, Webflow, Framer, etc.) — recebo documento com instruções para meu desenvolvedor",
        ],
        aiAssisted: false,
        section: "Plataforma do Site",
        briefingKey: "plataformaSiteSuporteNecessario",
        aiContext:
          "Plataforma do site e nível de suporte para instalação: WordPress (instalação completa), GTM já instalado (configuração direta), ou outra plataforma (entrega de código)",
        placeholder: "Selecione",
        warning:
          "A plataforma define o método de instalação. WordPress com acesso admin = instalação completa. GTM já instalado = configuramos no contêiner. Outras plataformas = entregamos os códigos com instruções.",
      },
    ],
  },

  nomadTests: [
    {
      id: "DTAN-TEST01",
      code: "DTAN-TEST01",
      name: "Teste de Habilitação — Configuração de Data Analytics",
      description:
        "O nômade deve instalar e configurar um conjunto completo de tags e pixels em um ambiente de teste WordPress, demonstrando domínio do GTM, GA4, Pixel do Facebook, eventos e preenchimento do documento de entrega.",
      linkedTaskId: "DTAN-T02",
      linkedTaskName: "Instalação e Configuração de Tags e Pixels",
      fakeClientName: "Clínica Estética Lumina",
      fakeObjective:
        "Instalar o GTM + GA4 + Pixel do Facebook + Tag de Remarketing Google Ads no site da Clínica Estética Lumina e configurar 2 eventos de conversão.",
      fakeContext:
        "Site WordPress em https://clinica-lumina-teste.com.br. Conta Google: clinicalumina@gmail.com. Tem conta no Google Ads (ID: 123-456-7890). Tem Meta Business Manager (Pixel ID: 9876543210). Não tem TikTok Ads nem LinkedIn Ads. Eventos a monitorar: (1) clique no botão 'Agendar Consulta' → conversão; (2) envio do formulário de contato → lead. GTM não está instalado. Acesso ao WP Admin compartilhado.",
      fakeDeliverables: [
        "GTM instalado no WordPress e contêiner publicado (com print do Tag Assistant confirmando)",
        "GA4 configurado com evento page_view disparando (com print do GA4 em tempo real)",
        "Pixel do Facebook instalado via GTM com PageView disparando (com print do Pixel Helper)",
        "Tag de Remarketing Google Ads configurada (com print do Tag Assistant)",
        "Evento de conversão 'Agendar Consulta' configurado (clique no botão) — com print de disparo",
        "Evento de lead 'Formulário de Contato' configurado — com print de disparo",
        "Documento DTAN-DOC-ENTREGA preenchido com prints de todas as validações",
      ],
      evaluationCriteria: [
        "GTM instalado corretamente — sem erros no Tag Assistant",
        "GA4 recebendo dados em tempo real — print confirmado",
        "Pixel do Facebook disparando PageView — print do Pixel Helper confirmado",
        "Tag de Remarketing Google Ads ativa no Tag Assistant",
        "Evento 'Agendar Consulta' disparando apenas no clique correto (não em todos os cliques)",
        "Evento 'Formulário de Contato' disparando no envio real do formulário",
        "Contêiner GTM publicado — sem tags em rascunho",
        "Documento DTAN-DOC-ENTREGA completo com prints de todas as seções obrigatórias",
      ],
      passingScore: 70,
      timeLimit: 90,
      enablesAdditionalTasks: [
        {
          taskId: "DTAN-T02",
          taskName: "Configuração de Data Analytics e Entrega",
          productId: "PA0004",
          productName: "Configuração de Data Analytics",
        },
        {
          taskId: "DTAN-T03",
          taskName: "Remoção de Acessos e Encerramento",
          productId: "PA0004",
          productName: "Configuração de Data Analytics",
        },
      ],
      isActive: true,
      createdAt: "2026-01-10T09:00:00Z",
      preCircuit: {
        welcomeTitle: "Bem-vindo ao Circuito de Habilitação — Data Analytics",
        welcomeSubtitle:
          "Você está prestes a se habilitar para instalar e configurar tags e pixels pela allka. Leia tudo com atenção antes de começar.",
        welcomeHighlights: [
          "Teste prático em ambiente WordPress de teste",
          "Até 90 minutos para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para Configuração e Remoção de Acessos",
        ],
        aboutDescription:
          "Neste teste você vai instalar o GTM em um WordPress de teste, configurar o GA4, o Pixel do Facebook e a Tag do Google Ads, criar 2 eventos de conversão e preencher o documento de entrega com prints de cada validação.",
        aboutWhatToExpect: [
          "Acessar o painel WordPress de teste com as credenciais fornecidas",
          "Instalar o Google Tag Manager via plugin",
          "Configurar GA4, Pixel do Facebook e Tag de Remarketing Google Ads via GTM",
          "Criar triggers para os 2 eventos de conversão descritos no briefing",
          "Publicar o contêiner GTM e validar cada tag com as ferramentas de diagnóstico",
          "Preencher o documento DTAN-DOC-ENTREGA com prints de todas as validações",
        ],
        estimatedTime: "90 minutos",
        rules: [
          "Use apenas o ambiente de teste fornecido — nunca acesse sites reais de clientes durante o teste",
          "Instale via plugin do GTM — não edite o header.php diretamente",
          "Nomeie cada tag no padrão: [PLATAFORMA] - [TIPO] - [VERSÃO]",
          "Publique o contêiner antes de tirar os prints finais",
          "O documento de entrega deve conter prints reais das ferramentas de diagnóstico",
        ],
        warnings: [
          "Tags em rascunho (não publicadas) contam como não instaladas — falha automática na seção correspondente",
          "Documento de entrega sem prints de validação não é aceito",
        ],
        confirmChecklist: [
          "Li o briefing completo da Clínica Lumina",
          "Sei instalar o GTM em WordPress via plugin",
          "Conheço o Tag Assistant e o Pixel Helper do Chrome",
          "Sei criar triggers de clique e de envio de formulário no GTM",
          "Tenho 90 minutos disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "DTAN-TEST01-CL",
        linkedTestId: "DTAN-TEST01",
        linkedTestName: "Teste de Habilitação — Configuração de Data Analytics",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar especialmente: (1) eventos disparando apenas no trigger correto; (2) contêiner GTM publicado; (3) documento completo com prints reais.",
        sections: [
          {
            id: "CL4-S01",
            title: "Verificação de Acessos e Ambiente",
            description:
              "Avaliação dos acessos recebidos e condições do ambiente antes da execução",
            items: [
              {
                id: "CL4-S01-I01",
                label: "Acessos recebidos corretamente",
                description:
                  "Todos os acessos necessários foram compartilhados antes do início da E02: site (quando aplicável), GTM e contas de anúncio das plataformas selecionadas",
                weight: 5,
                isRequired: true,
                hint: "Verificar relato de confirmação de acessos registrado na E01",
              },
              {
                id: "CL4-S01-I02",
                label: "Site funcionando no momento da execução",
                description:
                  "O site estava no ar e funcionando corretamente durante toda a execução da E02",
                weight: 3,
                isRequired: true,
                hint: "Site fora do ar ou com erros críticos invalida a execução",
              },
            ],
          },
          {
            id: "CL4-S02",
            title: "Google Tag Manager e Instalação",
            description: "Avaliação da instalação e configuração do GTM",
            items: [
              {
                id: "CL4-S02-I01",
                label:
                  "Tag Manager verificado ou instalado corretamente quando aplicável",
                description:
                  "GTM instalado via plugin no WordPress (ou já existente verificado) e contêiner confirmado pelo Tag Assistant sem erros",
                weight: 5,
                isRequired: true,
                hint: "Ver print do Tag Assistant no documento de entrega",
              },
              {
                id: "CL4-S02-I02",
                label: "Contêiner GTM publicado (não em rascunho)",
                description:
                  "Todas as tags estão na versão publicada do contêiner — versão com número acima de 0",
                weight: 4,
                isRequired: true,
                hint: "Verificar número da versão publicada no GTM",
              },
              {
                id: "CL4-S02-I03",
                label:
                  "Instruções de implantação entregues quando a plataforma exigiu código manual",
                description:
                  "Para sites não WordPress sem GTM instalado: documento com códigos e instruções para o desenvolvedor foi incluído na entrega",
                weight: 4,
                isRequired: false,
                hint: "Aplicável apenas quando o site não permite instalação direta",
              },
            ],
          },
          {
            id: "CL4-S03",
            title: "Analytics, Tags e Pixels Configurados",
            description:
              "Avaliação das implantações de analytics e pixels de anúncios",
            items: [
              {
                id: "CL4-S03-I01",
                label: "Google Analytics 4 configurado e recebendo dados",
                description:
                  "GA4 disparando pageview e recebendo dados em tempo real — confirmado com print",
                weight: 5,
                isRequired: true,
                hint: "Ver print do GA4 em tempo real no documento de entrega",
              },
              {
                id: "CL4-S03-I02",
                label: "Tags e pixels das plataformas solicitadas configurados",
                description:
                  "Cada pixel/tag selecionado no briefing foi instalado e verificado: Meta, TikTok, LinkedIn, Google Ads — conforme solicitado",
                weight: 5,
                isRequired: true,
                hint: "Verificar prints do Pixel Helper, Tag Assistant e ferramentas das plataformas no documento de entrega",
              },
              {
                id: "CL4-S03-I03",
                label: "Google Search Console instalado quando solicitado",
                description:
                  "Propriedade verificada e sitemap submetido quando o Search Console foi solicitado no briefing",
                weight: 3,
                isRequired: false,
                hint: "Aplicável apenas quando Search Console estava incluído nas plataformas selecionadas",
              },
            ],
          },
          {
            id: "CL4-S04",
            title: "Eventos, Conversões e Qualidade da Entrega",
            description:
              "Avaliação dos eventos configurados e da qualidade geral da implantação",
            items: [
              {
                id: "CL4-S04-I01",
                label: "Eventos e conversões configurados conforme briefing",
                description:
                  "Todos os eventos listados no briefing foram configurados com triggers corretos e estão disparando nas ações adequadas",
                weight: 5,
                isRequired: true,
                hint: "Verificar prints de disparo de cada evento no documento de entrega",
              },
              {
                id: "CL4-S04-I02",
                label: "Entrega sem erros de instalação identificados",
                description:
                  "Nenhum erro de instalação foi identificado nas ferramentas de diagnóstico (Tag Assistant, Pixel Helper, etc.) — ou erros identificados foram documentados com motivo",
                weight: 5,
                isRequired: true,
                hint: "Erros não documentados = falha automática nesta seção",
              },
            ],
          },
          {
            id: "CL4-S05",
            title: "Documento de Entrega e Encerramento",
            description:
              "Avaliação do DTAN-DOC-ENTREGA e encerramento da tarefa",
            items: [
              {
                id: "CL4-S05-I01",
                label:
                  "Documento DTAN-DOC-ENTREGA com prints de cada implantação",
                description:
                  "Documento preenchido com prints de cada plataforma instalada: Tag Assistant, GA4 em tempo real, Pixel Helper e ferramentas das demais plataformas",
                weight: 5,
                isRequired: true,
                hint: "Documento sem prints de validação não é aceito",
              },
              {
                id: "CL4-S05-I02",
                label: "Seções obrigatórias sem lacunas ou placeholders",
                description:
                  "Nenhuma seção obrigatória está vazia, com texto padrão não editado ou com placeholder",
                weight: 4,
                isRequired: true,
                hint: "Revisar documento completo linha a linha antes de submeter",
              },
              {
                id: "CL4-S05-I03",
                label: "Remoção de acessos confirmada após a entrega",
                description:
                  "O e-mail mktperformance2023@gmail.com foi removido de todas as plataformas após aprovação da E02 (E03 concluída)",
                weight: 3,
                isRequired: true,
                hint: "Verificar conclusão da E03 — Remoção de Acessos",
              },
            ],
          },
        ],
      },
    },
  ],

  variationsInternal: {
    "PA0004-V01": {
      label: "Configuração de Data Analytics",
      code: "PA0004-V01",
      publicDeadlineLabel: "9 dias úteis",
      executionHours: 6,
    },
  },

  portfolioImages: [
    {
      id: "dtan-img-01",
      url: "/images/products/data-analytics.jpg",
      title: "Visão Geral do Produto",
      description: "Configuração de Data Analytics — decisões inteligentes",
      isMain: true,
      sortOrder: 0,
    },
    {
      id: "dtan-img-02",
      url: "/images/products/data-analytics-portfolio-01.jpg",
      title: "Análise de Funil de Lançamento e Leads",
      description:
        "Dados que orientam decisões e aumentam resultados em lançamentos digitais",
      isMain: false,
      sortOrder: 1,
    },
    {
      id: "dtan-img-03",
      url: "/images/products/data-analytics-portfolio-02.jpg",
      title: "Análise de Desempenho em Redes Sociais",
      description:
        "Análise de dados para crescer com consistência nas redes sociais",
      isMain: false,
      sortOrder: 2,
    },
    {
      id: "dtan-img-04",
      url: "/images/products/data-analytics-portfolio-03.jpg",
      title: "Análise de Desempenho de Campanhas",
      description:
        "Dados que mostram o que funciona e onde investir para escalar resultados",
      isMain: false,
      sortOrder: 3,
    },
    {
      id: "dtan-img-05",
      url: "/images/products/data-analytics-portfolio-04.jpg",
      title: "Análise de Desempenho e Recomendações Estratégicas",
      description:
        "Análise de dados que transforma números em insights e orienta decisões",
      isMain: false,
      sortOrder: 4,
    },
    {
      id: "dtan-img-06",
      url: "/images/products/data-analytics-portfolio-05.jpg",
      title: "Análise de Desempenho do E-commerce",
      description:
        "Análise estratégica para aumentar vendas e otimizar resultados no e-commerce",
      isMain: false,
      sortOrder: 5,
    },
    {
      id: "dtan-img-07",
      url: "/images/products/data-analytics-portfolio-06.jpg",
      title: "Análise de Desempenho em Negócios Locais",
      description:
        "Dados que ajudam negócios locais a atrair mais clientes e gerar mais contato",
      isMain: false,
      sortOrder: 6,
    },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PA0005 — ANÁLISE DE USABILIDADE UX
// ════════════════════════════════════════════════════════════════════════════

const uxAnalysisMeta = {
  complementaryProductIds: ["PA0004", "PA0001", "PA0002"],
  recurrence: "Avulso",
  deliveryDays: "5",
  summaryDescription:
    "Análise de usabilidade do site seguindo checklist institucional: velocidade (PageSpeed e GTmetrix), compatibilidade mobile, links, botões, checkout, contraste, tagueamento e relatório completo com prints editados e interpretação didática.",
  finalPrice: 90.72,
  itemLimit: 1,
  totalExecutionHours: 2,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,

  // ── Modelo de tarefa ─────────────────────────────────────────────────────
  taskModel: {
    objective:
      "Realizar análise de desempenho e usabilidade do site conforme checklist e documento padrão da plataforma, incluindo velocidade, compatibilidade mobile, links, botões, checkout, contraste de cores, localização de botões, menu, imagens e tagueamento do Facebook e Google — e entregar o relatório com prints editados e marcações.",
    creator: "Consultor/Agência",
    responsible: "Líder de Performance",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 5,
    totalDeadlineNote:
      "5 dias úteis para até 5 e até 10 páginas (V01/V02) | 6 dias para até 20 páginas (V03) | 7 dias para até 50 páginas (V04)",
  },

  // ── Avisos importantes ───────────────────────────────────────────────────
  warnings: [
    {
      id: "W01",
      title: "Site deve estar funcionando",
      description:
        "Esta tarefa só será executada com o website publicado e funcionando corretamente. Sites em manutenção, offline ou sem acesso público não permitem a execução da análise. Garanta que o site esteja acessível durante todo o período contratado.",
      severity: "warning",
    },
    {
      id: "W02",
      title: "Não inclui alterações no website",
      description:
        "Esta tarefa realiza análise e entrega relatório com pontos de melhoria. Não está inclusa a implementação de nenhuma alteração no site. Para realizar as correções identificadas, contrate o produto específico de desenvolvimento.",
      severity: "info",
    },
    {
      id: "W03",
      title: "Não inclui alterações de SEO",
      description:
        "A análise de usabilidade não cobre otimização para mecanismos de busca. Palavras-chave, meta tags e estratégia de SEO não fazem parte do escopo desta tarefa.",
      severity: "info",
    },
    {
      id: "W04",
      title: "Não inclui UX Design",
      description:
        "Esta tarefa analisa e documenta problemas de usabilidade, mas não inclui redesign de telas, criação de protótipos, wireframes ou qualquer entrega de UX Design.",
      severity: "info",
    },
  ],

  // ── Instruções de acesso ─────────────────────────────────────────────────
  accessInstructions: {
    email: null,
    role: null,
    platform:
      "Site público do cliente (acesso via navegador, sem login administrativo)",
    steps: [],
    removalSteps: [],
    note: "A análise é realizada pelo navegador como usuário comum. Não é necessário acesso administrativo ao site. Basta informar a URL no briefing.",
  },

  // ── Termos de execução ───────────────────────────────────────────────────
  executionTerms: [
    "Realizar análise de usabilidade seguindo o checklist e o documento padrão da plataforma",
    "Analisar o briefing e entender o negócio do cliente antes de iniciar",
    "Preparar o documento de ajustes e alterações contemplando: velocidade no PageSpeed, velocidade no GTmetrix, compatibilidade mobile, links quebrados, botões do site, funcionamento do checkout, contraste de cores, localização de botões, menu, imagens, instalação de tagueamento do Facebook e Google",
    "Inserir prints corretamente editados com marcações visuais para cada ponto identificado",
    "Anexar o documento na etapa correta do projeto e salvar antes de avançar",
    "Não entregar com: pendências não resolvidas, erros gramaticais, layout fora do padrão, excesso de tecnicidade sem explicação, ausência de prints ou ausência de interpretação didática para o cliente",
  ],

  // ── Documento de entrega ─────────────────────────────────────────────────
  deliveryDocument: {
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
  },

  // ── Regras de recorrência ────────────────────────────────────────────────
  recurrenceRules: {
    avulso: {
      expiresAfterDays: 90,
      description:
        "Contratação avulsa válida por até 90 dias. Se não utilizada dentro desse prazo, expira automaticamente. O serviço pode ser contratado novamente a qualquer momento após alterações no site.",
    },
  },

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
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
          "O especialista analisa o site e entrega o relatório PA0005-REL-UX em até 5 a 7 dias úteis, dependendo da variação.",
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
  },

  // ── Features base ────────────────────────────────────────────────────────
  baseFeatures: [
    "Análise de velocidade com Google PageSpeed Insights — desktop e mobile (T01-S01)",
    "Verificação funcional de todos os botões, CTAs e links das páginas analisadas (T01-S02)",
    "Diagnóstico de tagueamento: GA4, GTM e pixels de anúncios (T01-S03)",
    "Relatório PA0005-REL-UX com evidências, tabela de erros e recomendações priorizadas (T02)",
    "2 etapas de execução: E01 Análise → E02 Entrega do Relatório",
    "Prazo: 5 dias úteis (V01/V02) | 6 dias úteis (V03) | 7 dias úteis (V04)",
    "Execução por nômade habilitado — Especialidade UX Design",
  ],

  // ── Tarefas ──────────────────────────────────────────────────────────────
  tasks: [
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
  ],

  // ── Etapas (kanban de execução) ──────────────────────────────────────────
  stages: [
    {
      id: "UXAN-E01",
      code: "UXAN-E01",
      number: 1,
      name: "Análise de Usabilidade UX",
      description:
        "Análise completa das páginas: velocidade (PageSpeed Insights), navegação, botões, links e tagueamento — com coleta de evidências para o relatório.",
      category: "Execução",
      deliveryDeadlineDays: 4,
      executionDeadlineDays: 4,
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
      deliveryDeadlineDays: 5,
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
  ],

  // ── Questionário de briefing ─────────────────────────────────────────────
  questionnaire: {
    id: "UXAN-Q",
    title: "Briefing — Análise de Usabilidade UX",
    description:
      "Responda às perguntas abaixo para que o especialista possa realizar a análise corretamente. Quanto mais informações você fornecer, mais preciso e útil será o relatório.",
    briefingTitle: "Briefing de Usabilidade UX",
    briefingInstructions:
      "Gere um documento de briefing para análise de usabilidade: domínio do site, posicionamento atual e insatisfações, objetivo do website, público-alvo e principais concorrentes.",
    questions: [
      {
        id: "UXAN-Q01",
        question: "Qual é o domínio para a análise?",
        type: "text",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Domínio",
        briefingKey: "dominio",
        aiContext: "URL do site a ser analisado",
        placeholder: "Ex: https://www.meusite.com.br",
      },
      {
        id: "UXAN-Q02",
        question:
          "Como você descreveria o posicionamento atual do seu site e quais são suas principais insatisfações?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Posicionamento",
        briefingKey: "posicionamento",
        aiContext:
          "Percepção atual do cliente sobre o site: o que gosta, o que não gosta, insatisfações, queixas de usuários",
        placeholder:
          "Ex: O site é bonito mas clientes reclamam que é difícil achar o WhatsApp | Parece lento e a taxa de abandono é alta | O checkout trava no mobile",
      },
      {
        id: "UXAN-Q03",
        question: "Qual é o objetivo principal do seu website?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Objetivo",
        briefingKey: "objetivo",
        aiContext:
          "Objetivo do site: gerar leads, vender produtos, apresentar serviços, informar, etc.",
        placeholder:
          "Ex: Gerar leads para que a equipe de vendas entre em contato | Vender produtos pelo WooCommerce | Apresentar o portfólio para fechar contratos",
      },
      {
        id: "UXAN-Q04",
        question: "Quem é o seu público-alvo?",
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
        question: "Quais são os seus principais concorrentes?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Concorrentes",
        briefingKey: "concorrentes",
        aiContext:
          "Sites concorrentes para referência: podem ser analisados como benchmark de usabilidade",
        placeholder:
          "Ex: www.concorrente1.com.br | www.concorrente2.com.br — são os sites que aparecem quando pesquiso no Google",
      },
    ],
  },

  // ── Testes de nômades ────────────────────────────────────────────────────
  nomadTests: [
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
        "Domínio: bellarosa.com.br (simulado). Posicionamento: 'O site é bonito mas clientes reclamam que não conseguem achar o WhatsApp e que parece lento no celular'. Objetivo: vender arranjos florais online e gerar pedidos pelo WhatsApp. Público-alvo: mulheres entre 25 e 55 anos, acesso principalmente mobile. Concorrentes informados: florarosa.com.br e flores24h.com.br. A análise deve cobrir a variação V01 (até 5 páginas): Homepage, Catálogo, Página de Produto, Contato e Sobre Nós.",
      fakeDeliverables: [
        "Resultado do teste de velocidade no Google PageSpeed Insights (com print editado com marcações)",
        "Resultado do teste de velocidade no GTmetrix (com print editado)",
        "Verificação de compatibilidade mobile com prints das páginas no modo responsivo",
        "Tabela de verificação de links, botões, checkout, contraste, localização de botões, menu e imagens das 5 páginas (status: OK / problema identificado)",
        "Resultado da verificação de SSL e tagueamento: status do Facebook Pixel e Google Analytics/GTM (com print do Tag Assistant ou ferramenta equivalente)",
        "Documento PA0005-REL-UX completo com todos os prints editados com marcações visuais e interpretação didática para o cliente",
      ],
      evaluationCriteria: [
        "PageSpeed e GTmetrix executados com prints editados com marcações visíveis",
        "Compatibilidade mobile verificada e documentada",
        "Todos os itens do checklist (links, botões, checkout, contraste, menu, imagens) verificados e registrados",
        "SSL e tagueamento verificados — Facebook Pixel e Google Analytics documentados",
        "Documento dentro do padrão PA0005-REL-UX, sem erros gramaticais",
        "Prints editados com marcações em todos os pontos identificados",
        "Interpretação didática para o cliente em cada item identificado",
      ],
      passingScore: 70,
      timeLimit: 90,
      enablesAdditionalTasks: [
        {
          taskId: "UXAN-T01",
          taskName: "Análise de Usabilidade UX",
          productId: "PA0005",
          productName: "Análise de Usabilidade UX",
        },
        {
          taskId: "UXAN-T02",
          taskName: "Relatório de Usabilidade e Entrega",
          productId: "PA0005",
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
          "Neste teste você vai analisar o site fictício da Floricultura Bella Rosa, aplicando o checklist de usabilidade da plataforma: velocidade no PageSpeed e GTmetrix, compatibilidade mobile, links quebrados, botões, checkout, contraste de cores, localização de botões, menu, imagens, SSL e tagueamento do Facebook e Google. Você vai preparar o documento padrão com prints editados e marcações.",
        aboutWhatToExpect: [
          "Ler o briefing da Floricultura Bella Rosa: domínio, posicionamento, objetivo e público-alvo",
          "Testar a velocidade do site no Google PageSpeed Insights e no GTmetrix",
          "Verificar compatibilidade mobile, links quebrados, botões e funcionamento do checkout",
          "Analisar contraste de cores, localização de botões, menu e imagens",
          "Verificar SSL e tagueamento instalado (Facebook Pixel e Google Analytics/GTM)",
          "Montar o documento com prints editados com marcações e interpretação didática",
        ],
        estimatedTime: "90 minutos",
        rules: [
          "Use o checklist padrão da plataforma — cada item deve ser verificado e registrado",
          "Prints devem ser editados com marcações visuais que identifiquem o problema",
          "Não entregar sem prints, sem interpretação didática ou com erros gramaticais",
          "O documento deve seguir o modelo PA0005-REL-UX — não use formatos alternativos",
          "Não inclua sugestões de SEO, redesign ou alterações no site — apenas diagnóstico",
        ],
        warnings: [
          "Documentos sem prints editados com marcações são automaticamente reprovados",
          "A análise não inclui SEO, UX Design ou qualquer alteração no website",
        ],
        confirmChecklist: [
          "Li o briefing completo da Floricultura Bella Rosa",
          "Sei usar o Google PageSpeed Insights e o GTmetrix",
          "Tenho o template PA0005-REL-UX ou acesso ao documento padrão da plataforma",
          "Entendo que cada item do checklist precisa de print editado com marcações",
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
          "Verificar presença de prints editados com marcações, SSL e tagueamento conferidos, velocidade testada no domínio correto e quantidade de análises conforme a variação contratada.",
        sections: [
          {
            id: "CL5-S01",
            title: "Qualidade do Documento",
            description:
              "Conformidade do documento entregue com o padrão da plataforma",
            items: [
              {
                id: "CL5-S01-I01",
                label: "O documento está dentro do padrão",
                description:
                  "O relatório segue o modelo PA0005-REL-UX e está formatado conforme o padrão visual e estrutural da plataforma",
                weight: 5,
                isRequired: true,
                hint: "Verificar se o documento usa o template correto, com logo, seções na ordem certa e sem formatação manual fora do padrão",
              },
              {
                id: "CL5-S01-I02",
                label: "Não tem erros gramaticais",
                description:
                  "O texto do relatório está livre de erros de ortografia, concordância e pontuação",
                weight: 4,
                isRequired: true,
                hint: "Ler ao menos um parágrafo de cada seção buscando erros — erros gramaticais são motivo de reprovação",
              },
              {
                id: "CL5-S01-I03",
                label: "A análise está de acordo com o briefing",
                description:
                  "O relatório responde ao que foi solicitado no briefing: domínio correto, objetivo informado e público-alvo considerado",
                weight: 5,
                isRequired: true,
                hint: "Comparar o domínio analisado e o contexto do relatório com o que foi preenchido no briefing do cliente",
              },
              {
                id: "CL5-S01-I04",
                label:
                  "Foi feita a quantidade de análises de acordo com a tarefa",
                description:
                  "O número de páginas analisadas corresponde ao limite da variação contratada (V01: 5 / V02: 10 / V03: 20 / V04: 50)",
                weight: 4,
                isRequired: true,
                hint: "Contar as páginas analisadas no documento e confirmar que não está abaixo do limite contratado",
              },
            ],
          },
          {
            id: "CL5-S02",
            title: "Análise Técnica",
            description:
              "Verificação dos itens técnicos obrigatórios do checklist",
            items: [
              {
                id: "CL5-S02-I01",
                label: "Foi feita a análise de SSL e tagueamento",
                description:
                  "O relatório contém o resultado da verificação de SSL (HTTPS) e do tagueamento instalado no site (Google Analytics, Meta Pixel, GTM)",
                weight: 5,
                isRequired: true,
                hint: "Ver seção de tagueamento: deve ter print ou registro do Tag Assistant e indicação do status do SSL",
              },
              {
                id: "CL5-S02-I02",
                label: "O teste de velocidade foi feito no site correto",
                description:
                  "O relatório apresenta o resultado do PageSpeed e/ou GTmetrix com o domínio do cliente — não de outro site ou URL de exemplo",
                weight: 5,
                isRequired: true,
                hint: "Verificar a URL que aparece no print do PageSpeed/GTmetrix — deve corresponder exatamente ao domínio informado no briefing",
              },
            ],
          },
        ],
      },
    },
  ],

  // ── Dados internos por variação ──────────────────────────────────────────
  variationsInternal: {
    "PA0005-V01": {
      label: "Até 5 páginas",
      code: "PA0005-V01",
      publicDeadlineLabel: "5 dias úteis",
      executionDeadlineDays: 4,
      totalDeadlineDays: 5,
      executionHours: 2,
      availabilityHours: 48,
      executorCost: 25.0,
    },
    "PA0005-V02": {
      label: "Até 10 páginas",
      code: "PA0005-V02",
      publicDeadlineLabel: "5 dias úteis",
      executionDeadlineDays: 4,
      totalDeadlineDays: 5,
      executionHours: 3,
      availabilityHours: 48,
      executorCost: 37.5,
    },
    "PA0005-V03": {
      label: "Até 20 páginas",
      code: "PA0005-V03",
      publicDeadlineLabel: "6 dias úteis",
      executionDeadlineDays: 5,
      totalDeadlineDays: 6,
      executionHours: 4,
      availabilityHours: 72,
      executorCost: 50.0,
    },
    "PA0005-V04": {
      label: "Até 50 páginas",
      code: "PA0005-V04",
      publicDeadlineLabel: "7 dias úteis",
      executionDeadlineDays: 6,
      totalDeadlineDays: 7,
      executionHours: 7,
      availabilityHours: 96,
      executorCost: 87.5,
    },
  },

  portfolioImages: [
    {
      id: "uxan-img-01",
      url: "/images/products/ux-analysis.svg",
      title: "Visão Geral do Produto",
      description: "Análise de Usabilidade UX — painel de diagnóstico completo",
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
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// ARRAY PRINCIPAL — apenas os 5 produtos reais
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// DC0001 — LAYOUT DE REDES SOCIAIS
// ════════════════════════════════════════════════════════════════════════════

const layoutRedesSociaisMeta = {
  complementaryProductIds: ["DC0003", "DC0002", "DC0006"],
  recurrence: "Avulso",
  deliveryDays: "2",
  summaryDescription:
    "Layout profissional de perfil e capa para até 3 redes sociais, em alta definição, coerente com a identidade visual da marca.",
  finalPrice: 90.72,
  itemLimit: 1,
  totalExecutionHours: 2,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,
  subcategory: "Mídias e Conteúdo",
  legacyCode: "DM0184",

  // ── Prazo de contratação avulsa ──────────────────────────────────────────
  contractExpiration: {
    days: 90,
    description:
      "O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é considerada expirada.",
  },

  // ── Modelo de tarefa ─────────────────────────────────────────────────────
  taskModel: {
    objective: "Criação de layout para sua rede social",
    creator: "Consultor/Agência",
    responsible: "Líder de Criação e Arte",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 2,
    totalDeadlineNote:
      "2 dias úteis: E01 — produção e entrega do layout com mockups.",
    taskDescription:
      "Criação de layout para redes sociais que transmita primeira impressão positiva, profissionalismo e credibilidade, fortalecendo a identidade de marca, aumentando o engajamento e garantindo consistência visual em múltiplos canais.",
  },

  // ── Avisos importantes ───────────────────────────────────────────────────
  warnings: [
    {
      id: "DC0001-W01",
      title: "Qualidade do briefing",
      description:
        "Quanto maior o detalhamento das informações fornecidas, mais fiel e qualitativa será a entrega do layout.",
      severity: "info",
    },
    {
      id: "DC0001-W02",
      title: "Direitos autorais",
      description:
        "Todos os elementos e conteúdos utilizados no layout devem respeitar direitos autorais. A Allka estará isenta em caso de violação causada pelo material enviado pelo cliente.",
      severity: "warning",
    },
    {
      id: "DC0001-W03",
      title: "Prazo de solicitação",
      description:
        "Por ser um serviço avulso, o cliente tem até 90 dias após a contratação para solicitar a execução. Após esse prazo, a tarefa é considerada expirada.",
      severity: "info",
    },
    {
      id: "DC0001-W04",
      title: "Responsabilidade do nômade — elementos utilizados",
      description:
        "Todos os elementos utilizados devem ser criados pelo nômade designado ou captados de banco de imagens/fontes com uso comercial permitido. Qualquer problema legal decorrente da criação que desrespeite isso será de responsabilidade exclusiva do nômade.",
      severity: "warning",
    },
  ],

  // ── Features base ────────────────────────────────────────────────────────
  baseFeatures: [
    "Layout para até 3 redes sociais (capa + perfil)",
    "Arquivos em alta definição com medidas exatas",
    "Design coerente com a identidade visual da marca",
    "Entrega com mockups para visualização",
    "Prazo: 2 dias úteis",
  ],

  // ── Tarefas ──────────────────────────────────────────────────────────────
  tasks: [
    {
      id: "DC0001-T01",
      name: "Criação de Layout para Redes Sociais",
      description:
        "Desenvolvimento completo do layout de perfil e capa para as redes sociais selecionadas, coerente com a identidade visual da marca.",
      taskCategory: "Criação",
      objective:
        "Entregar o layout de redes sociais (capa + perfil) em alta definição com mockups, dentro do prazo de 2 dias úteis.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Analisar o briefing e pesquisar sobre o tema; acessar as redes do cliente para entender tom de voz e estilo antes de iniciar a criação.",
        "Enviar os arquivos em PDF e os arquivos em PNG junto com os mockups ao concluir.",
        "O executor pode utilizar Canva, Photoshop ou ferramentas de IA; se o cliente enviar templates, usá-los como base com criatividade e inovação.",
        "Criar um arquivo .ZIP com o modelo de entrega da tarefa e todos os criativos em .png, corretamente nomeados como 'Projeto_nº da tarefa'.",
        "Não entregar com erros gramaticais, fora do tema ou em desacordo com a comunicação visual da marca.",
        "Não entregar com trechos copiados ou qualquer forma de plágio.",
      ],
      conclusionRules:
        "A tarefa poderá ser aprovada ou reprovada pelo cliente. Em caso de reprovação, o nômade deverá realizar as correções solicitadas até o próximo dia útil.",
      estimatedHours: 2,
      deliveryDeadlineDays: 2,
      executionDeadlineDays: 1,
      calculatedCost: 25.0,
      steps: [
        {
          id: "DC0001-T01-S01",
          name: "Análise do briefing e pesquisa",
          description:
            "Leitura completa do briefing, pesquisa sobre o tema e acesso às redes do cliente para entender tom de voz, estilo e referências visuais.",
          order: 1,
          estimatedMinutes: 30,
          specialtyId: 1,
          specialty: 1,
          experienceLevel: "pleno",
          calculatedCost: 6,
          internalGuidance:
            "Verificar paleta de cores, logotipo, tipografia e referências enviadas pelo cliente. Anotar insights de estilo antes de abrir o editor.",
        },
        {
          id: "DC0001-T01-S02",
          name: "Criação do layout",
          description:
            "Desenvolvimento do design de capa e perfil coerentes com a identidade visual da marca para cada rede social solicitada.",
          order: 2,
          estimatedMinutes: 60,
          specialtyId: 1,
          specialty: 1,
          experienceLevel: "pleno",
          calculatedCost: 12,
          internalGuidance:
            "Usar Canva, Photoshop ou IA. Se o cliente enviou templates, usá-los como base. Criar versões para cada rede social nas dimensões corretas.",
        },
        {
          id: "DC0001-T01-S03",
          name: "Geração de mockups e exportação",
          description:
            "Integração das artes nos mockups das redes sociais solicitadas e exportação de todos os arquivos em PNG.",
          order: 3,
          estimatedMinutes: 20,
          specialtyId: 1,
          specialty: 1,
          experienceLevel: "pleno",
          calculatedCost: 4,
          internalGuidance:
            "Usar mockups de cada rede social (Instagram, Facebook, LinkedIn, TikTok etc.). Exportar PDF com mockups e arquivos PNG em alta resolução, organizados por rede social.",
        },
        {
          id: "DC0001-T01-S04",
          name: "Empacotamento e entrega",
          description:
            "Criação do arquivo .ZIP com todos os criativos nomeados corretamente como 'Projeto_nº da tarefa' e envio ao cliente.",
          order: 4,
          estimatedMinutes: 10,
          specialtyId: 1,
          specialty: 1,
          experienceLevel: "pleno",
          calculatedCost: 3,
          internalGuidance:
            "Nome dos arquivos: Projeto_[número da tarefa]_[rede social]_[tipo: capa/perfil].png. Verificar se todos os arquivos estão presentes antes de fechar o ZIP.",
        },
      ],
    },
  ],

  // ── Etapas (kanban de execução) ──────────────────────────────────────────
  stages: [
    {
      id: "DC0001-E01",
      code: "DC0001-E01",
      number: 1,
      name: "Criação e Entrega do Layout",
      description:
        "Produção completa do layout de redes sociais — capa e perfil para cada rede selecionada — com mockups e arquivos em alta definição.",
      category: "Execução",
      deliveryDeadlineDays: 2,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 7,
      executionHours: 2,
      value: 25.0,
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
        "Verificar briefing e referências antes de iniciar. Entregar: PDF com mockups + arquivos PNG em .ZIP nomeados como 'Projeto_nº da tarefa'. Não entregar sem mockups ou com nomes incorretos.",
    },
  ],

  // ── Questionário de briefing ─────────────────────────────────────────────
  questionnaire: {
    id: "DC0001-Q",
    title: "Briefing — Layout de Redes Sociais",
    description:
      "Responda às perguntas abaixo para que o designer possa criar o layout ideal para as suas redes sociais. Quanto maior o detalhamento, mais fiel e qualitativa será a entrega.",
    briefingTitle: "Briefing de Layout de Redes Sociais",
    briefingInstructions:
      "Gere um documento de briefing para criação de layout de redes sociais: ideia criativa, público-alvo, redes sociais selecionadas, referências visuais, logotipo e banco de imagens.",
    questions: [
      {
        id: "DC0001-Q01",
        question: "Qual é a sua ideia criativa para a criação do layout?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Conceito",
        briefingKey: "ideiaCriativa",
        aiContext:
          "Ideia criativa, conceito visual e mensagem principal que o cliente quer transmitir no layout das redes sociais",
        placeholder:
          "Ex: Quero um layout moderno e minimalista, com foco no produto e que transmita sofisticação. As cores preferidas são azul escuro e dourado.",
      },
      {
        id: "DC0001-Q02",
        question:
          "Qual é o público-alvo que você planeja alcançar com esse layout?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Público",
        briefingKey: "publicoAlvo",
        aiContext:
          "Perfil do público-alvo: idade, gênero, interesses, comportamento e contexto de uso das redes sociais",
        placeholder:
          "Ex: Mulheres entre 25 e 45 anos, interessadas em moda e lifestyle, que acessam principalmente pelo celular e usam Instagram e Pinterest.",
      },
      {
        id: "DC0001-Q03",
        question: "Em quais redes sociais você planeja usar esse layout?",
        type: "multiselect",
        required: true,
        options: [
          "Instagram",
          "Facebook",
          "LinkedIn",
          "TikTok",
          "Google Meu Negócio",
          "YouTube",
          "Pinterest",
          "Outra",
        ],
        aiAssisted: false,
        section: "Redes",
        briefingKey: "redesSociais",
        aiContext:
          "Redes sociais selecionadas para criação do layout (máximo 3)",
        placeholder: "",
      },
      {
        id: "DC0001-Q04",
        question:
          "Por favor, nos mostre algumas referências que você tem em mente.",
        type: "file",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Referências",
        briefingKey: "referencias",
        aiContext:
          "Referências visuais, inspirações de layouts, prints de perfis ou capas que o cliente admira",
        placeholder:
          "Faça upload de imagens ou links de referência. Pode ser prints de outros perfis, paletas de cores, logos de inspiração etc.",
      },
      {
        id: "DC0001-Q05",
        question:
          "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
        type: "file",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Identidade Visual",
        briefingKey: "logotipo",
        aiContext:
          "Logotipo da marca em alta resolução (PNG ou PDF) e manual da marca se disponível",
        placeholder:
          "Formatos aceitos: PNG, SVG, AI, PDF. Se tiver manual da marca (PDF), anexe também.",
      },
      {
        id: "DC0001-Q06",
        question:
          "Você possui um banco de imagens pago que possa compartilhar? Se sim, informe o nome do banco e o plano contratado.",
        type: "text",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Recursos",
        briefingKey: "bancoImagens",
        aiContext:
          "Banco de imagens pago disponível para uso no layout: Shutterstock, Adobe Stock, Getty Images, Freepik Premium etc.",
        placeholder:
          "Ex: Tenho Freepik Premium | Uso Shutterstock com plano de 10 imagens/mês | Não possuo banco de imagens.",
      },
    ],
  },

  // ── Checklist de qualificação ────────────────────────────────────────────
  qualificationChecklist: {
    id: "DC0001-TEST01-CL",
    linkedTestId: "DC0001-TEST01",
    linkedTestName: "Teste de Habilitação — Layout de Redes Sociais",
    passingScore: 70,
    autoApproveAbove: 90,
    autoRejectBelow: 40,
    allowPartialCorrection: true,
    internalNotes:
      "Verificar se o layout está coerente com o briefing, se foi entregue em PDF e PNG, se os mockups estão presentes e se os arquivos estão dentro do padrão de nomenclatura.",
    sections: [
      {
        id: "DC0001-CL-S01",
        title: "Conformidade com o Briefing",
        description:
          "Verificação de aderência ao que foi solicitado no briefing",
        items: [
          {
            id: "DC0001-CL-S01-I01",
            label:
              "Verifiquei o briefing detalhadamente para averiguar como foi solicitado o layout",
            description:
              "O nômade demonstra ter lido e considerado todas as informações do briefing na criação do layout.",
            weight: 5,
            isRequired: true,
            hint: "Verificar se o conceito, o público-alvo e as redes sociais solicitadas estão refletidos no layout entregue.",
          },
          {
            id: "DC0001-CL-S01-I02",
            label: "O layout realizado está conforme o solicitado no briefing",
            description:
              "O design entregue é coerente com a ideia criativa, público-alvo e referências informadas pelo cliente.",
            weight: 5,
            isRequired: true,
            hint: "Comparar o layout entregue com as informações e referências fornecidas pelo cliente no briefing.",
          },
        ],
      },
      {
        id: "DC0001-CL-S02",
        title: "Qualidade da Entrega",
        description: "Conformidade com os padrões de entrega da plataforma",
        items: [
          {
            id: "DC0001-CL-S02-I01",
            label:
              "Confirmei que o layout foi enviado em PDF, contendo o layout no mockup e separado para cada rede social pedida",
            description:
              "O arquivo PDF entregue contém os layouts integrados nos mockups de cada rede social solicitada.",
            weight: 5,
            isRequired: true,
            hint: "Abrir o PDF e verificar se cada rede social contratada está presente com mockup de capa e perfil.",
          },
          {
            id: "DC0001-CL-S02-I02",
            label:
              "Avaliei o design visual do layout — se é atraente, impactante e alinhado com a identidade visual",
            description:
              "O layout possui apelo visual, coerência com a marca e transmite a mensagem desejada pelo cliente.",
            weight: 4,
            isRequired: true,
            hint: "Avaliar harmonia de cores, tipografia, uso do logotipo e impacto geral do design.",
          },
          {
            id: "DC0001-CL-S02-I03",
            label:
              "Confirmei que o layout é legível em diferentes redes sociais e que logo e informações são legíveis em cada aplicação",
            description:
              "O logotipo, textos e informações essenciais são legíveis nas dimensões de cada rede social.",
            weight: 4,
            isRequired: true,
            hint: "Verificar se os textos não ficaram pequenos demais para as dimensões de capa e perfil de cada plataforma.",
          },
          {
            id: "DC0001-CL-S02-I04",
            label:
              "Certifiquei-me de que representa de forma clara e visualmente apropriada a marca ou empresa",
            description:
              "O layout comunica com clareza quem é a marca, seus valores e sua proposta visual.",
            weight: 4,
            isRequired: false,
            hint: "Verificar se um visitante novo conseguiria identificar o segmento e o tom da marca só pelo layout.",
          },
          {
            id: "DC0001-CL-S02-I05",
            label:
              "Revisei o conteúdo para verificar se foi inserido o conteúdo descrito no briefing",
            description:
              "Todos os textos, slogan ou chamadas solicitadas no briefing estão presentes no layout.",
            weight: 3,
            isRequired: true,
            hint: "Comparar os elementos textuais do layout com o que foi pedido no briefing (nome da marca, slogan, frases etc.).",
          },
          {
            id: "DC0001-CL-S02-I06",
            label:
              "Todas as informações essenciais estão presentes no layout — logo, ícones, frase de efeito, telefone, e-mail etc.",
            description:
              "O layout contém todos os elementos de identidade que o cliente solicitou incluir.",
            weight: 4,
            isRequired: false,
            hint: "Verificar lista de elementos pedidos no briefing: logo, contatos, slogan, ícones de redes sociais etc.",
          },
        ],
      },
    ],
  },

  // ── Testes de habilitação ────────────────────────────────────────────────
  nomadTests: [
    {
      id: "DC0001-TEST01",
      code: "DC0001-TEST01",
      name: "Teste de Habilitação — Layout de Redes Sociais",
      description:
        "O nômade deve criar um layout completo de redes sociais (capa e perfil) para uma marca fictícia, demonstrando domínio de ferramentas de design, coerência com a identidade visual e entrega no padrão da plataforma.",
      linkedTaskId: "DC0001-T01",
      linkedTaskName: "Criação de Layout para Redes Sociais",
      fakeClientName: "Café Raízes",
      fakeObjective:
        "Criar layout de redes sociais para o Café Raízes, uma cafeteria artesanal que busca transmitir aconchego, autenticidade e qualidade para um público urbano jovem.",
      fakeContext:
        "Cliente: Café Raízes — cafeteria artesanal localizada em São Paulo. Ideia criativa: layout que transmita aconchego e artesanalidade, usando tons terrosos e tipografia moderna. Público-alvo: jovens adultos entre 22 e 38 anos, que valorizam café de qualidade e experiências autênticas. Redes sociais: Instagram e Facebook. Referências: perfis de cafeterias minimalistas com paleta de marrom, bege e verde. Logotipo: disponível em PDF (simplificado — nômade pode criar um logotipo fictício coerente). Banco de imagens: não possui.",
      fakeDeliverables: [
        "Capa e foto de perfil para Instagram (dimensões corretas)",
        "Capa e foto de perfil para Facebook (dimensões corretas)",
        "PDF com todos os layouts integrados em mockups das redes sociais",
        "Arquivo .ZIP com todos os PNGs nomeados como 'Projeto_DC0001-TEST01_[rede]_[tipo]'",
        "Design coerente com a identidade visual descrita: tons terrosos, tipografia moderna, sensação artesanal",
      ],
      evaluationCriteria: [
        "Layout entregue em PDF com mockups de Instagram e Facebook presentes",
        "Arquivos PNG entregues em .ZIP com nomenclatura correta",
        "Design coerente com a identidade visual solicitada (tons terrosos, artesanal)",
        "Legibilidade de logotipo e textos nas dimensões de capa e perfil",
        "Ausência de erros gramaticais em textos incluídos no layout",
        "Sem uso de imagens com direitos autorais não licenciadas",
        "Dimensões corretas para Instagram e Facebook",
      ],
      passingScore: 70,
      timeLimit: 90,
      enablesAdditionalTasks: [
        {
          taskId: "DC0001-T01",
          taskName: "Criação de Layout para Redes Sociais",
          productId: "DC0001",
          productName: "Layout de Redes Sociais",
        },
      ],
      isActive: true,
      createdAt: "2026-04-27T09:00:00Z",
    },
  ],

  // ── Circuito pré-habilitação ─────────────────────────────────────────────
  preCircuit: {
    welcomeTitle:
      "Bem-vindo ao Circuito de Habilitação — Layout de Redes Sociais",
    welcomeSubtitle:
      "Você está prestes a se habilitar para criar layouts de redes sociais pela allka. Leia com atenção antes de começar.",
    welcomeHighlights: [
      "Criação prática para uma marca fictícia com briefing completo",
      "Até 90 minutos para completar",
      "Nota mínima de aprovação: 70 pontos",
      "Aprovação habilita você para executar o produto DC0001",
    ],
    aboutDescription:
      "Neste teste você vai criar o layout completo de redes sociais (capa e perfil) para o Café Raízes, uma cafeteria artesanal fictícia. Você receberá um briefing com ideia criativa, público-alvo, redes selecionadas e referências visuais. A entrega deve seguir o padrão da plataforma: PDF com mockups e arquivo .ZIP com os PNGs nomeados corretamente.",
    aboutWhatToExpect: [
      "Ler o briefing do Café Raízes: ideia criativa, público-alvo, redes e referências",
      "Criar capa e foto de perfil para Instagram e Facebook nas dimensões corretas",
      "Garantir coerência visual com a identidade descrita (tons terrosos, artesanal, moderno)",
      "Gerar PDF com layouts integrados em mockups de cada rede social",
      "Montar arquivo .ZIP com todos os PNGs nomeados corretamente",
    ],
    estimatedTime: "90 minutos",
    rules: [
      "Use apenas recursos com licença comercial — bancos gratuitos (Unsplash, Freepik free) ou crie os elementos",
      "Não entregue com erros gramaticais ou elementos fora do tema do briefing",
      "O PDF deve conter mockups reais das redes sociais — não apresentações genéricas",
      "Nomeie os arquivos exatamente como: 'Projeto_DC0001-TEST01_[rede]_[tipo].png'",
      "Não inclua logotipos de marcas reais ou imagens com direitos autorais não licenciadas",
    ],
    warnings: [
      "Entregas sem mockups ou com nomes de arquivo incorretos são automaticamente reprovadas",
      "Elementos com direitos autorais não licenciados resultam em reprovação imediata",
    ],
    confirmChecklist: [
      "Li o briefing completo do Café Raízes",
      "Tenho acesso a uma ferramenta de design (Canva, Photoshop, Figma ou similar)",
      "Sei as dimensões corretas de capa e perfil do Instagram e Facebook",
      "Tenho como gerar mockups das redes sociais para o PDF",
      "Entendo o padrão de nomenclatura dos arquivos da plataforma",
      "Tenho 90 minutos disponíveis para completar o teste",
    ],
  },

  // ── Dados internos por variação (produto único — sem variações) ──────────
  variationsInternal: {
    DC0001: {
      label: "Layout de Redes Sociais",
      code: "DC0001",
      publicDeadlineLabel: "2 dias úteis",
      executionDeadlineDays: 1,
      totalDeadlineDays: 2,
      executionHours: 2,
      availabilityHours: 24,
      executorCost: 25.0,
    },
  },

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
    tagline:
      "As redes sociais são a vitrine do mundo digital — evidencie os valores da sua marca com um layout chamativo e personalizado.",
    highlights: [
      "Criação de foto de perfil e capa que conversam entre si",
      "Materiais entregues em alta definição com medidas exatas",
      "Design coerente com a identidade visual da marca",
      "Entrega com mockups para melhor visualização do resultado",
    ],
    targetAudience: [
      "Empresas e marcas que querem mais profissionalismo e beleza nas redes sociais",
      "Negócios que nunca tiveram um layout visual adequado para suas redes",
      "Empreendedores que desejam evidenciar os valores da marca digitalmente",
      "Quem quer criar uma primeira impressão positiva e aumentar credibilidade online",
    ],
    whatIsIncluded: [
      {
        title: "Criação de layout para redes sociais",
        description:
          "Desenvolvimento de capa e foto de perfil para até 3 redes sociais selecionadas, com design coerente entre si e com a marca.",
      },
      {
        title: "Materiais em alta definição",
        description:
          "Entrega dos arquivos finais em alta resolução com as medidas exatas de cada rede social.",
      },
      {
        title: "Integração em mockup",
        description:
          "Arte integrada em mockup da rede social solicitada para melhor visualização do resultado final.",
      },
      {
        title: "Design personalizado",
        description:
          "Layout diagramado com a identidade visual da marca, garantindo consistência e profissionalismo.",
      },
    ],
    benefits: [
      "Primeira impressão positiva nos visitantes do perfil",
      "Profissionalismo e credibilidade transmitidos visualmente",
      "Identidade de marca fortalecida nas redes sociais",
      "Maior engajamento com visual atrativo e consistente",
      "Consistência da marca em múltiplos canais digitais",
    ],
    notIncluded: [
      "Criação ou revisão de conteúdo textual",
      "Postagem nas redes sociais",
      "Criação ou otimização das redes sociais",
    ],
    complementaryProducts: [],
    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Selecione o produto e finalize a contratação. Por ser avulso, você tem até 90 dias para solicitar a execução.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe quais redes sociais deseja (até 3), sua ideia criativa, público-alvo e envie logotipo e referências visuais.",
      },
      {
        step: "Revisão e entrega",
        description:
          "O designer elabora o layout e entrega os arquivos em alta definição com mockups em até 2 dias úteis.",
      },
    ],
    faq: [
      {
        question: "Para quais redes sociais é feito o layout?",
        answer:
          "O serviço contempla até 3 redes sociais à sua escolha: Instagram, Facebook, LinkedIn, TikTok, Google Meu Negócio, entre outras.",
      },
      {
        question: "O que é entregue exatamente?",
        answer:
          "Capa e foto de perfil em alta definição com as medidas exatas de cada plataforma, além de mockups para visualização do resultado final.",
      },
      {
        question: "Preciso ter logotipo e identidade visual?",
        answer:
          "Ter um logotipo facilita muito o processo. Se não tiver identidade visual definida, informe no briefing e o designer adaptará com boas práticas visuais.",
      },
      {
        question: "Posso solicitar alterações depois da entrega?",
        answer:
          "Sim. Está incluída uma rodada de ajustes. Alterações fora do escopo original podem ser tratadas como novo serviço.",
      },
    ],
  },
};

// ─── DC0002 — Criativos Mídia Display Estático (meta) ─────────────────────
const criativosMidiaDisplayMeta = {
  complementaryProductIds: ["PA0001", "DC0001", "DC0006"],
  subcategory: "Mídias e Conteúdo",
  legacyCode: "DM0200",

  testsEnabled: true,
  totalExecutionHours: 7.5,

  // ── Avisos ──────────────────────────────────────────────────────────────
  warnings: [
    {
      id: "W01",
      type: "info",
      icon: "Info",
      title: "Qualidade do briefing",
      message:
        "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.",
    },
    {
      id: "W02",
      type: "warning",
      icon: "ImageIcon",
      title: "Qualidade das imagens enviadas",
      message:
        "No caso do envio de imagens, verifique a qualidade para os formatos solicitados.",
    },
    {
      id: "W03",
      type: "warning",
      icon: "Shield",
      title: "Direitos autorais — cliente",
      message:
        "Todos os elementos e conteúdos enviados pelo cliente devem respeitar a Lei Federal nº 9.610/98.",
    },
    {
      id: "W04",
      type: "info",
      icon: "Shield",
      title: "Direitos autorais — nômade",
      message:
        "As imagens e elementos usados pelos nômades são de bancos de imagem gratuita e respeitam a lei de direitos autorais.",
    },
  ],

  // ── Atenção ao nômade ────────────────────────────────────────────────────
  nomadAttentionText:
    "Todos os elementos utilizados devem ser criados pelo nômade designado ou captados de banco de imagens/fontes com uso comercial permitido. Qualquer problema legal diante da criação que desrespeite isso será responsabilidade do nômade.",

  // ── Modelo de tarefa ────────────────────────────────────────────────────
  taskModel: {
    objective:
      "Criação de Banner Digital para mídia display em diversos formatos solicitados.",
    creator: "Consultor/Agência",
    responsible: "Líder de Criação e Arte",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 2,
    totalExecutionDeadlineHours: 42,
    totalExecutionHours: 7.5,
    totalExecutorCost: 93.75,
  },

  // ── Características base ────────────────────────────────────────────────
  baseFeatures: [
    "Criação do conteúdo do criativo e da legenda com até 200 palavras",
    "Banner estático em diversos formatos (website, flyers, adesivos, cartões, Google Display etc.)",
    "Somente artes com uma tela para desenvolvimento",
    "Adaptação para todas as medidas solicitadas",
    "Entrega em .zip com arquivos abertos em .psd e fechados em .png",
  ],

  // ── Tarefas internas ────────────────────────────────────────────────────
  tasks: [
    {
      id: "DC0002-T01",
      legacyCode: "MC273_1",
      title: "Conteúdo e Legenda para Criativos",
      description:
        "Criação de conteúdo e legenda para os criativos que serão elaborados, com versão adaptada para veiculação em anúncios patrocinados.",
      creator: "Consultor/Agência",
      responsible: "Líder de Mídias e Conteúdo",
      executor: "Nômade Especialista",
      objective:
        "Criação de conteúdo e legenda para os criativos que serão elaborados.",
      executionRules: [
        "Analisar o briefing detalhadamente e, com base no objetivo relatado, criar o conteúdo do criativo, instruções para o designer e a legenda com a CTA desejada.",
        "Enviar em documento padronizado o texto para a legenda, com até 200 palavras, adaptado para até 3 redes sociais ou aplicações solicitadas no briefing.",
        "Criar uma versão da legenda para anúncios patrocinados, com texto primário de até 150 caracteres e título de até 50 caracteres.",
        "Não entregar com erros gramaticais, fora do tema ou em desacordo com a comunicação visual.",
        "Não entregar tarefa com trechos copiados/plágio.",
      ],
      conclusionRules: {
        canApprove: true,
        canReject: true,
        correctionDeadline: "próximo dia útil",
      },
      calculatedCost: 18.75,
    },
    {
      id: "DC0002-T02",
      legacyCode: "DM0200_2",
      title: "Layout de Criativos Mídia Display Estático",
      description:
        "Criação do layout do banner estático para mídia display, em todas as medidas solicitadas, com entrega em .zip contendo arquivos .png e .psd.",
      creator: "Consultor/Agência",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      objective: "Criação de Banner Digital para mídia display.",
      executionRules: [
        "Analisar toda a solicitação e a identidade visual do cliente nos materiais enviados e em suas páginas digitais.",
        "Pegar o conteúdo já elaborado e aprovado para o criativo na etapa anterior.",
        "Entregar em todas as medidas obedecendo às margens de segurança de cada criativo, como demonstrado nos infográficos.",
        "Enviar as opções de criativo para aprovação em arquivo fechado .png e arquivo aberto .psd, separados em duas pastas dentro de um .zip.",
        "Inserir o link das imagens utilizadas no criativo no documento padronizado, comprovando a liberação do direito de uso.",
        "No caso de erro de diagramação, digitação, recorte de imagem, arte sem relação com a referência ou erro em formato, retornar para alteração sem alteração do prazo inicial.",
      ],
      conclusionRules: {
        canApprove: true,
        canReject: true,
        correctionDeadline: "próximo dia útil",
      },
      calculatedCost: 75.0,
    },
  ],

  // ── Estágios ────────────────────────────────────────────────────────────
  stages: [
    {
      id: "DC0002-E01",
      code: "MC273_1",
      number: 1,
      title: "Conteúdo e Legenda para Criativo",
      description:
        "Criação do conteúdo do criativo e da legenda para veiculação, incluindo versão para anúncios patrocinados.",
      value: 18.75,
      deliveryDeadlineDays: 1,
      executionDeadlineHours: 18,
      executionHours: 1.5,
      keepSameNomad: false,
      requiresFinalFiles: true,
      requiresClientApproval: true,
      taskIds: ["DC0002-T01"],
    },
    {
      id: "DC0002-E02",
      code: "DM0200_2",
      number: 2,
      title: "Layout de Criativos Mídia Display Estático",
      description:
        "Desenvolvimento do layout do banner em todos os formatos e medidas solicitados, com entrega em .zip (.png e .psd).",
      value: 75.0,
      deliveryDeadlineDays: 1,
      executionDeadlineHours: 24,
      executionHours: 6.0,
      keepSameNomad: false,
      requiresFinalFiles: true,
      requiresClientApproval: true,
      taskIds: ["DC0002-T02"],
    },
  ],

  // ── Questionário de briefing ────────────────────────────────────────────
  questionnaire: {
    title: "Briefing — Criativos Mídia Display Estático",
    description:
      "Preencha as informações abaixo para que a equipe possa criar o conteúdo e o layout dos banners com precisão e fidelidade à identidade da sua marca.",
    aiAssisted: true,
    sections: [
      {
        id: "S01",
        title: "Objetivo e mensagem",
        questions: [
          {
            id: "Q01",
            briefingKey: "objetivoCriativo",
            label: "Qual o objetivo para o criativo solicitado?",
            placeholder:
              "Ex.: gerar leads, divulgar promoção, aumentar reconhecimento de marca, direcionar para link.",
            type: "multiline",
            required: true,
            aiAssisted: true,
          },
          {
            id: "Q02",
            briefingKey: "mensagemCriativo",
            label: "Qual mensagem deve ser transmitida no criativo?",
            placeholder:
              "Descreva a mensagem principal, o tom de voz e o que o público deve sentir ou fazer ao ver o banner.",
            type: "multiline",
            required: true,
            aiAssisted: true,
          },
          {
            id: "Q03",
            briefingKey: "ideiasSupgestoes",
            label: "Quais suas ideias para o criativo ou sugestões?",
            placeholder:
              "Descreva livremente conceitos, elementos visuais, cores, estilos ou qualquer sugestão criativa.",
            type: "multiline",
            required: false,
            aiAssisted: true,
          },
        ],
      },
      {
        id: "S02",
        title: "Referências e materiais",
        questions: [
          {
            id: "Q04",
            briefingKey: "referencias",
            label:
              "Para sermos mais assertivos, favor disponibilizar algumas referências.",
            placeholder:
              "Envie imagens, links de banners que você gosta ou descreva o estilo visual desejado.",
            type: "file",
            required: false,
          },
          {
            id: "Q05",
            briefingKey: "materiaisAdicionais",
            label: "Compartilhe materiais diversos, caso necessário.",
            placeholder:
              "Imagens, ícones, mockups, capturas de tela, PDFs ou qualquer arquivo de apoio para a criação.",
            type: "file",
            required: false,
          },
          {
            id: "Q06",
            briefingKey: "elementosVisuaisDefinidos",
            label:
              "Você já tem definido os elementos visuais padronizados para este cliente?",
            placeholder:
              "Ex.: paleta de cores (#HEX), tipografia, ícones, padrões de uso de logo etc.",
            type: "multiline",
            required: false,
            aiAssisted: false,
          },
        ],
      },
      {
        id: "S03",
        title: "Formatos e aplicação",
        questions: [
          {
            id: "Q07",
            briefingKey: "localAplicacao",
            label: "Descreva onde os criativos serão aplicados.",
            placeholder:
              "Ex.: Google Display, Meta Ads, email marketing, website, flyer digital, outdoor digital.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q08",
            briefingKey: "formatosPixels",
            label: "Quais os formatos em pixels?",
            placeholder:
              "Ex.: 1200×628px, 300×250px, 728×90px, 160×600px, 320×50px. Informe todos os formatos desejados.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
        ],
      },
      {
        id: "S04",
        title: "Identidade visual",
        questions: [
          {
            id: "Q09",
            briefingKey: "logotipo",
            label:
              "Por favor, anexe o logotipo renderizado e, se houver, o manual da marca.",
            placeholder:
              "Envie o logotipo em alta resolução (.png, .svg ou .ai). Manual da marca em PDF, se disponível.",
            type: "file",
            required: false,
          },
          {
            id: "Q10",
            briefingKey: "bancoDeMidia",
            label:
              "Você possui um banco de imagens pago que possa compartilhar?",
            placeholder:
              "Ex.: Shutterstock, Getty Images, Adobe Stock. Informe nome, plano e credenciais de acesso, se aplicável.",
            type: "text",
            required: false,
          },
        ],
      },
    ],
  },

  // ── Checklist de qualificação ───────────────────────────────────────────
  qualificationChecklist: {
    passingScore: 70,
    sections: [
      {
        id: "S01",
        title: "Verificação do briefing",
        items: [
          {
            id: "I01",
            description:
              "O briefing e as referências foram verificados antes do início da execução.",
            weight: 2,
            isRequired: true,
          },
        ],
      },
      {
        id: "S02",
        title: "Qualidade da entrega",
        items: [
          {
            id: "I01",
            description:
              "Material entregue está compatível com a solicitação e no documento padronizado.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I02",
            description:
              "O conteúdo de texto inserido está correto e sem erros gramaticais.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I03",
            description:
              "Os arquivos abertos (.psd) e fechados (.png) foram enviados corretamente.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I04",
            description:
              "Os arquivos abertos foram entregues incorporados e não vinculados.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I05",
            description:
              "Foram inseridos os links das imagens utilizadas na arte para confirmação de liberação de direitos autorais.",
            weight: 2,
            isRequired: true,
          },
        ],
      },
    ],
  },

  // ── Testes dos nômades ──────────────────────────────────────────────────
  nomadTests: [
    {
      id: "DC0002-TEST01",
      title:
        "Teste de Habilitação — Layout de Criativos Mídia Display Estático",
      description:
        "Criação de um banner estático para a marca fictícia Café Raízes em dois formatos solicitados, com entrega em .zip contendo .png e .psd.",
      timeLimitMinutes: 120,
      passingScore: 70,
      fakeContext: {
        clientName: "Café Raízes",
        clientDescription:
          "Cafeteria artesanal em São Paulo que valoriza o café de origem, o ambiente acolhedor e o ritual do preparo manual.",
        objective:
          "Criar banners estáticos para divulgação de promoção do Dia do Café — 14 de abril — no Google Display e Meta Ads.",
        message:
          "Celebre o Dia do Café com a gente. Venha tomar o melhor café de origem da cidade. Oferta especial: dois cafés pelo preço de um.",
        formats: ["1200×628px (Meta Ads)", "300×250px (Google Display)"],
        brandColors: ["#3E1F00", "#C8841B", "#F5ECD7"],
        logotipoProvided: true,
        bancoDeMidia: false,
      },
      evaluationCriteria: [
        "Layout coerente com a identidade visual da marca (cores, tipografia, tom)",
        "Mensagem clara, objetiva e legível em ambos os formatos",
        "Margens de segurança respeitadas em todos os formatos",
        "Arquivos .png e .psd entregues em duas pastas separadas dentro do .zip",
        "Nenhum elemento protegido por direitos autorais sem licença adequada",
        "Links das imagens utilizadas informados no documento padronizado",
        "Arquivo .psd entregue incorporado (não vinculado)",
      ],
      enablesAdditionalTasks: ["DC0002-T02"],
    },
  ],

  // ── Circuito pré-habilitação ────────────────────────────────────────────
  preCircuit: {
    welcomeTitle: "Bem-vindo ao circuito pré-habilitação — DC0002",
    welcomeHighlights: [
      "Produção de banners estáticos para mídia display",
      "Criação de conteúdo e legenda para criativos",
      "Adaptação para múltiplos formatos com margens de segurança",
      "Entrega em .zip com .png e .psd separados por pasta",
    ],
    aboutDescription:
      "Este circuito certifica que você está apto a executar tarefas de criação de criativos display estáticos, seguindo os padrões de entrega, nomenclatura, direitos autorais e qualidade da plataforma.",
    rules: [
      "Leia o briefing completo antes de iniciar qualquer criação.",
      "Use somente elementos e imagens livres de direitos autorais ou fornecidos pelo cliente.",
      "Respeite as margens de segurança de cada formato conforme os infográficos de referência.",
      "Entregue os arquivos separados em duas pastas dentro do .zip: uma para .png e outra para .psd.",
      "Insira os links das imagens utilizadas no documento padronizado para comprovação de liberação de uso.",
      "Os arquivos .psd devem ser entregues incorporados — nunca vinculados.",
    ],
    warnings: [
      "Não utilize fontes, ícones ou imagens pagas sem licença adequada — qualquer problema legal será sua responsabilidade.",
      "Entregas fora do padrão de nomenclatura, sem os arquivos .psd ou sem os links de imagens serão reprovadas.",
    ],
    confirmChecklist: [
      "Li e compreendi o briefing do cliente fictício e o objetivo do teste.",
      "Possuo acesso a alguma ferramenta de design (Photoshop, Figma, Illustrator etc.).",
      "Conheço as dimensões corretas e as margens de segurança para os formatos solicitados.",
      "Irei entregar os arquivos .png e .psd em duas pastas separadas dentro de um único .zip.",
      "Os arquivos .psd serão entregues incorporados, não vinculados.",
      "Irei informar os links das imagens utilizadas no documento padronizado.",
      "Tenho disponibilidade para concluir o teste dentro do prazo estabelecido.",
    ],
  },

  // ── Variações internas ──────────────────────────────────────────────────
  variationsInternal: {
    DC0002: {
      code: "DC0002",
      publicDeadlineLabel: "3 dias úteis",
      executionDeadlineDays: 2,
      totalDeadlineDays: 3,
      executorCost: 93.75,
    },
  },

  // ── Prazo de contratação ────────────────────────────────────────────────
  contractExpiration: {
    avulso: {
      days: 90,
      description:
        "O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é considerada expirada.",
    },
    mensal: {
      days: 30,
      description:
        "A tarefa fica disponível a cada 30 dias e pode ser utilizada até a abertura da próxima. Se não for utilizada, será considerada expirada.",
    },
  },

  // ── Apresentação pública ─────────────────────────────────────────────────
  presentation: {
    tagline:
      "Designers especializados transformam suas ideias em banners profissionais — prontos para veicular em qualquer plataforma de mídia paga.",
    highlights: [
      "Criação de banners estáticos adaptados para todos os formatos solicitados",
      "Conteúdo do criativo e legenda com até 200 palavras inclusos",
      "Entrega em .zip com arquivos abertos em .psd e fechados em .png",
      "Comunicação visual clara e impactante para otimizar tráfego pago",
    ],
    targetAudience: [
      "Empresas que precisam de banners para campanhas de tráfego pago",
      "Agências que produzem criativos de display para seus clientes",
      "Negócios que anunciam no Google Display, Facebook Ads ou Instagram Ads",
      "Empreendedores que precisam de artes profissionais para mídia digital",
    ],
    whatIsIncluded: [
      {
        title: "Design personalizado",
        description:
          "Banner estático criado com identidade visual da marca, mensagem objetiva e layout profissional.",
      },
      {
        title: "Adaptação para diversas medidas",
        description:
          "O mesmo criativo adaptado para todos os formatos e dimensões solicitados pelo cliente.",
      },
      {
        title: "Criação do conteúdo do criativo",
        description:
          "Desenvolvimento do texto e mensagem principal do banner, com até 200 palavras.",
      },
      {
        title: "Legenda para veiculação",
        description:
          "Legenda pronta para uso nos anúncios, alinhada à mensagem visual do criativo.",
      },
      {
        title: "Arquivos abertos em .psd",
        description:
          "Arquivos editáveis em Photoshop para futuras alterações e adaptações.",
      },
      {
        title: "Arquivos fechados em .png",
        description:
          "Artes finalizadas em alta resolução, prontas para upload em qualquer plataforma.",
      },
      {
        title: "Entrega em .zip",
        description:
          "Todos os arquivos organizados e compactados em um único .zip para download fácil.",
      },
    ],
    benefits: [
      "Criação de conteúdo do criativo e legenda com até 200 palavras",
      "Banner estático em diversos formatos (website, flyers, adesivos, cartões, Google Display etc.)",
      "Adaptação para todas as medidas solicitadas",
      "Entrega pronta para uso e futuras edições",
      "Apoio para campanhas e mídia display com comunicação clara e objetiva",
    ],
    notIncluded: ["Divulgação das artes"],
    complementaryProducts: [],
    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Selecione o produto e finalize a contratação. Disponível em avulso (90 dias) ou mensal (renova a cada 30 dias).",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe o conceito do banner, público-alvo, plataformas de veiculação, formatos/dimensões e envie logotipo e referências visuais.",
      },
      {
        step: "Revisão e entrega",
        description:
          "O designer cria os banners e entrega o .zip com todos os formatos em .png e .psd em até 3 dias úteis.",
      },
    ],
    faq: [
      {
        question: "Quais formatos de banner são criados?",
        answer:
          "Todos os formatos solicitados no briefing, como 1200×628px (Facebook/Instagram), 300×250px (Google Display), 728×90px (leaderboard), entre outros. Especifique as dimensões desejadas no briefing.",
      },
      {
        question: "O que está incluso no serviço?",
        answer:
          "Design personalizado, adaptação para todas as medidas solicitadas, criação do conteúdo e legenda com até 200 palavras, arquivos .png e .psd entregues em .zip.",
      },
      {
        question: "Preciso ter logotipo e identidade visual?",
        answer:
          "Ter um logotipo facilita muito o processo. Se não tiver identidade visual definida, informe no briefing e o designer adaptará com boas práticas visuais.",
      },
      {
        question: "Posso solicitar alterações depois da entrega?",
        answer:
          "Sim. Está incluída uma rodada de ajustes. Alterações fora do escopo original podem ser tratadas como novo serviço.",
      },
      {
        question: "Qual a diferença entre avulso e mensal?",
        answer:
          "No avulso, você tem 90 dias para solicitar a execução. No mensal, a tarefa renova automaticamente a cada 30 dias e expira se não utilizada no período.",
      },
    ],
  },
};

// ─── DC0003 — Tratamento de até 10 Imagens (meta) ─────────────────────────
const tratamentoImagensMeta = {
  complementaryProductIds: ["DC0001", "DC0002", "DC0004"],
  subcategory: "Fotografia e Imagem",
  legacyCode: "DM0204",

  testsEnabled: true,
  totalExecutionHours: 4,

  // ── Avisos ──────────────────────────────────────────────────────────────
  warnings: [
    {
      id: "W01",
      type: "info",
      icon: "Info",
      title: "Qualidade do briefing",
      message:
        "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.",
    },
    {
      id: "W02",
      type: "warning",
      icon: "Shield",
      title: "Direitos autorais — cliente",
      message:
        "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os termos da Lei Federal nº 9.610/98.",
    },
    {
      id: "W03",
      type: "warning",
      icon: "Shield",
      title: "Isenção de responsabilidade",
      message:
        "Caso o material enviado desrespeite essa determinação, a Allka estará isenta e o cliente será responsabilizado legalmente.",
    },
  ],

  // ── Atenção ao nômade ────────────────────────────────────────────────────
  nomadAttentionText:
    "Todos os elementos utilizados devem ser criados pelo nômade designado ou captados de banco de imagens/fontes com uso comercial permitido. Qualquer problema legal diante da criação que desrespeite isso será responsabilidade do nômade.",

  // ── Modelo de tarefa ────────────────────────────────────────────────────
  taskModel: {
    objective: "Tratamento de até 10 imagens",
    creator: "Consultor/Agência",
    responsible: "Líder de Criação e Arte",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 3,
    totalExecutionDeadlineHours: 48,
    totalExecutionHours: 4,
    totalExecutorCost: 50.0,
  },

  // ── Descritivo ──────────────────────────────────────────────────────────
  taskDescription:
    "Tratamento das imagens com objetivo de limpar, recortar, colocar efeitos e filtros. Pode se adequar a diferentes formatos e mídias. Não inclui fusão de imagens, animações e inserção de objetos ou elementos gráficos. O cliente deverá apresentar sua demanda de forma precisa e objetiva. As imagens serão entregues em PNG e em arquivos abertos em PSD e XMP.",

  // ── Características base ────────────────────────────────────────────────
  baseFeatures: [
    "Tratamento de até 10 imagens por ciclo",
    "Limpeza, recorte, efeitos e filtros",
    "Correção de contraste, saturação, sombras e pele",
    "Entrega de imagem original e editada lado a lado no documento padronizado",
    "Entrega em .zip com .png, .psd e .xmp",
  ],

  // ── Tarefas internas ────────────────────────────────────────────────────
  tasks: [
    {
      id: "DC0003-T01",
      legacyCode: "DM0204_1",
      title: "Tratamento e Edição de até 10 Imagens",
      description:
        "Tratamento e edição completa das imagens enviadas: limpeza, recorte, correção de contraste, saturação, sombras e pele, conforme briefing, com entrega de antes e depois no documento padronizado.",
      creator: "Consultor/Agência",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      objective: "Tratamento e Edição de até 10 Imagens",
      executionRules: [
        "Enviar todas as imagens solicitadas em formato PNG ou JPEG, apresentando a imagem original e a editada lado a lado no documento padronizado.",
        "Realizar uma verificação da qualidade da imagem, ajustando contraste, saturação, sombras e corrigindo a pele, conforme a descrição e o conteúdo enviados.",
        "Após o tratamento das imagens, enviar todas elas em um arquivo .zip, juntamente com o documento padronizado que apresenta o antes e o depois de cada imagem.",
        "É recomendado relatar no documento as melhorias realizadas.",
        "Não entregar o serviço com erros de edição e tratamento.",
        "Em caso de problema, a tarefa será devolvida para correção sem alteração do prazo inicial.",
      ],
      conclusionRules: {
        canApprove: true,
        canReject: true,
        correctionDeadline: "próximo dia útil",
      },
      calculatedCost: 50.0,
    },
  ],

  // ── Estágios ────────────────────────────────────────────────────────────
  stages: [
    {
      id: "DC0003-E01",
      code: "DM0204_1",
      number: 1,
      title: "Tratamento e Edição de até 10 Imagens",
      description:
        "Tratamento completo das imagens com correção de contraste, saturação, sombras e pele, entrega de antes/depois no documento padronizado e .zip com .png, .psd e .xmp.",
      value: 50.0,
      deliveryDeadlineDays: 3,
      executionDeadlineHours: 48,
      executionHours: 4,
      keepSameNomad: false,
      requiresFinalFiles: true,
      requiresClientApproval: true,
      taskIds: ["DC0003-T01"],
    },
  ],

  // ── Questionário de briefing ────────────────────────────────────────────
  questionnaire: {
    title: "Briefing — Tratamento de até 10 Imagens",
    description:
      "Preencha as informações abaixo para que o especialista realize o tratamento das imagens com precisão e fidelidade ao resultado esperado.",
    aiAssisted: false,
    sections: [
      {
        id: "S01",
        title: "Sobre o tratamento",
        questions: [
          {
            id: "Q01",
            briefingKey: "tratamentoDesejado",
            label: "Qual seria o tratamento desejado na imagem?",
            placeholder:
              "Descreva as edições necessárias: limpeza de fundo, correção de cores, remoção de imperfeições, recorte, aplicação de filtros, etc.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q02",
            briefingKey: "estiloReferencias",
            label:
              "Qual seria o estilo e referências para o tratamento de imagem?",
            placeholder:
              "Ex.: estilo editorial clean, tons quentes, referência de marca específica. Envie links ou descreva o estilo visual desejado.",
            type: "multiline",
            required: false,
            aiAssisted: false,
          },
          {
            id: "Q03",
            briefingKey: "redeSocial",
            label:
              "Você pode informar qual seria a rede social a ser usada nas imagens?",
            placeholder:
              "Ex.: Instagram (1080×1080px), Facebook, LinkedIn, TikTok, Pinterest. Informe também o formato se souber.",
            type: "multiline",
            required: false,
            aiAssisted: false,
          },
        ],
      },
      {
        id: "S02",
        title: "Arquivos e entrega",
        questions: [
          {
            id: "Q04",
            briefingKey: "imagens",
            label:
              "Favor anexar as imagens em arquivo .zip na quantidade contratada.",
            placeholder:
              "Envie as imagens originais em alta resolução compactadas em um único arquivo .zip. Máximo: 10 imagens por ciclo.",
            type: "file",
            required: true,
          },
          {
            id: "Q05",
            briefingKey: "marcaDagua",
            label:
              "Deseja inserir uma marca d'água nas imagens? Se sim, como deseja?",
            placeholder:
              "Ex.: logotipo no canto inferior direito em 20% de opacidade, marca d'água centralizada, sem marca d'água.",
            type: "multiline",
            required: false,
            aiAssisted: false,
          },
        ],
      },
    ],
  },

  // ── Checklist de qualificação ───────────────────────────────────────────
  qualificationChecklist: {
    passingScore: 70,
    sections: [
      {
        id: "S01",
        title: "Verificação do briefing",
        items: [
          {
            id: "I01",
            description:
              "Verifiquei o briefing detalhadamente para averiguar quais foram as edições pedidas.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I02",
            description:
              "Confirmei que as imagens criadas estão dentro do que é solicitado no briefing.",
            weight: 2,
            isRequired: true,
          },
        ],
      },
      {
        id: "S02",
        title: "Qualidade técnica",
        items: [
          {
            id: "I01",
            description: "As imagens estão em boa qualidade.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I02",
            description:
              "As imagens contêm também a versão original junto com as imagens tratadas, citando quais são as imagens.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I03",
            description:
              "Confirmei que as cores estão precisas e bem equilibradas, considerando paleta de cores, exposição, contraste, saturação e outros parâmetros.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I04",
            description:
              "O recorte e o enquadramento da imagem estão corretos, seguindo as especificações do projeto.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I05",
            description:
              "Foi aplicada corretamente qualquer marca d'água, logotipo da agência ou identificação necessária, seguindo as orientações fornecidas.",
            weight: 1,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ── Testes dos nômades ──────────────────────────────────────────────────
  nomadTests: [
    {
      id: "DC0003-TEST01",
      title: "Teste de Habilitação — Tratamento de Imagens",
      description:
        "Realizar o tratamento de 3 imagens de produto para a marca fictícia Oliva & Co., com entrega do antes/depois no documento padronizado e .zip com os arquivos tratados.",
      timeLimitMinutes: 90,
      passingScore: 70,
      fakeContext: {
        clientName: "Oliva & Co.",
        clientDescription:
          "Marca de azeites e conservas artesanais de origem portuguesa, com foco em embalagens elegantes e fotografia de produto clean e sofisticada.",
        objective:
          "Tratar 3 fotos de produto (frascos de azeite em fundo branco) para uso em loja virtual e Instagram, mantendo look clean e profissional.",
        tratamentoDesejado:
          "Correção de exposição, balanço de branco e remoção de sombras indesejadas no fundo. Ajuste de contraste e nitidez. Recorte para 1080×1080px.",
        estiloReferencias:
          "Clean, minimalista, tons frios levemente dessaturados. Estilo editorial de revista de gastronomia.",
        redeSocial: "Instagram (1080×1080px)",
        marcaDagua: "Não deseja marca d'água.",
        imagesProvided: true,
      },
      evaluationCriteria: [
        "Imagem original e editada apresentadas lado a lado no documento padronizado",
        "Balanço de branco e exposição corrigidos de forma natural e equilibrada",
        "Fundo limpo, sem sombras ou impurezas visíveis",
        "Contraste e nitidez realçados sem perda de qualidade ou aparência artificial",
        "Imagens entregues em 1080×1080px conforme solicitado",
        "Arquivos .png, .psd e .xmp entregues em .zip organizado",
        "Resultado coerente com estilo clean e editorial solicitado",
      ],
      enablesAdditionalTasks: ["DC0003-T01"],
    },
  ],

  // ── Circuito pré-habilitação ────────────────────────────────────────────
  preCircuit: {
    welcomeTitle: "Bem-vindo ao circuito pré-habilitação — DC0003",
    welcomeHighlights: [
      "Tratamento profissional de até 10 imagens por ciclo",
      "Correção de contraste, saturação, sombras e pele",
      "Entrega com antes/depois no documento padronizado",
      "Arquivos .png, .psd e .xmp compactados em .zip",
    ],
    aboutDescription:
      "Este circuito certifica que você está apto a executar tarefas de tratamento de imagens, seguindo os padrões de qualidade, entrega e documentação da plataforma.",
    rules: [
      "Leia o briefing completo e analise todas as imagens enviadas antes de iniciar o tratamento.",
      "Apresente a imagem original e a editada lado a lado no documento padronizado, relatando as melhorias realizadas.",
      "Não inclua fusão de imagens, animações ou inserção de objetos e elementos gráficos não solicitados.",
      "Entregue todas as imagens em .zip contendo os arquivos .png, .psd e .xmp.",
      "Em caso de erro, a tarefa será devolvida para correção sem alteração do prazo inicial.",
    ],
    warnings: [
      "Não utilize imagens ou elementos de terceiros sem autorização — qualquer problema legal será sua responsabilidade.",
      "Entregas com erros de edição visíveis, sem o documento padronizado de antes/depois ou sem os arquivos .psd serão reprovadas.",
    ],
    confirmChecklist: [
      "Li e compreendi o briefing do cliente fictício e o objetivo do teste.",
      "Possuo acesso a alguma ferramenta de edição de imagens (Photoshop, Lightroom, GIMP etc.).",
      "Sei aplicar correções de contraste, saturação, sombras e pele de forma profissional.",
      "Irei apresentar o antes e o depois de cada imagem no documento padronizado.",
      "Irei entregar os arquivos .png, .psd e .xmp em um único .zip.",
      "Tenho disponibilidade para concluir o teste dentro do prazo estabelecido.",
    ],
  },

  // ── Variações internas ──────────────────────────────────────────────────
  variationsInternal: {
    DC0003: {
      code: "DC0003",
      publicDeadlineLabel: "3 dias úteis",
      executionDeadlineDays: 2,
      totalDeadlineDays: 3,
      executorCost: 50.0,
    },
  },

  contractExpiration: {
    avulso: {
      days: 90,
      description:
        "O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é considerada expirada.",
    },
    mensal: {
      days: 30,
      description:
        "A tarefa fica disponível a cada 30 dias e pode ser utilizada até a abertura da próxima. Se não for utilizada, será considerada expirada.",
    },
  },

  presentation: {
    tagline:
      "Transforme suas fotos com tratamento profissional — imagens mais nítidas, vibrantes e prontas para qualquer mídia.",
    highlights: [
      "Tratamento de até 10 imagens por ciclo com correção completa",
      "Correção de exposição, cores, ruído, nitidez e imperfeições",
      "Entrega em .png com arquivos abertos em .psd e .xmp",
      "Resultado adequado para diferentes mídias e formatos",
    ],
    targetAudience: [
      "Empresas que precisam de imagens de produto de alta qualidade para e-commerce",
      "Agências que entregam fotos tratadas para seus clientes",
      "Marcas que precisam de consistência visual em redes sociais",
      "Empreendedores que querem dar um nível profissional às fotos do seu negócio",
    ],
    whatIsIncluded: [
      {
        title: "Manipulação de imagens",
        description:
          "Tratamento completo com limpeza, recorte, efeitos e filtros conforme briefing.",
      },
      {
        title: "Correção de cores",
        description:
          "Ajuste de balanço de branco, saturação e consistência visual conforme identidade da marca.",
      },
      {
        title: "Limpeza de cenário",
        description:
          "Remoção de elementos indesejados no fundo e limpeza geral da imagem.",
      },
      {
        title: "Redimensionamento e formatação",
        description:
          "Adequação das imagens para os formatos e dimensões solicitados no briefing.",
      },
      {
        title: "Ajustes de contraste e nitidez",
        description:
          "Realce de detalhes e elementos-chave com equilíbrio entre contraste e nitidez.",
      },
    ],
    benefits: [
      "Criação de estilo e identidade visual consistente",
      "Profissional especializado em edição de imagens",
      "Realce de detalhes e elementos-chave",
      "Correção de distorções e perspectivas",
      "Preparação para diferentes mídias e formatos",
    ],
    notIncluded: [
      "Redação de texto ou criação de conteúdo",
      "Colagem de imagens",
      "Montagem com elementos, moldura e outras aplicações",
    ],
    complementaryProducts: [],
    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Selecione o produto e finalize a contratação. Disponível em avulso (90 dias) ou mensal (renova a cada 30 dias).",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe o objetivo do tratamento, correções necessárias, formatos desejados e envie as imagens originais.",
      },
      {
        step: "Revisão e entrega",
        description:
          "O especialista realiza o tratamento e entrega o .zip com as imagens em .png e os arquivos abertos em .psd e .xmp em até 3 dias úteis.",
      },
    ],
    faq: [
      {
        question: "Quantas imagens estão incluídas?",
        answer:
          "O serviço contempla até 10 imagens por ciclo de contratação (avulso ou mensal).",
      },
      {
        question: "O que é entregue exatamente?",
        answer:
          "As imagens tratadas em .png, os arquivos abertos em .psd e os perfis de cor em .xmp, todos organizados em um .zip.",
      },
      {
        question:
          "Fusão de imagens e inserção de elementos gráficos está incluso?",
        answer:
          "Não. O serviço foca em tratamento: limpeza, recorte, correção de cores e imperfeições, efeitos e filtros. Fusão e inserção de elementos são serviços distintos.",
      },
      {
        question: "Posso solicitar revisões?",
        answer:
          "Sim. Está incluída uma rodada de ajustes. Alterações fora do escopo original podem ser tratadas como novo serviço.",
      },
      {
        question: "Qual a diferença entre avulso e mensal?",
        answer:
          "No avulso, você tem 90 dias para solicitar o tratamento. No mensal, a tarefa renova automaticamente a cada 30 dias e expira se não utilizada no período.",
      },
    ],
  },
};

// ─── DC0004 — Papelaria (3 unidades) (meta) ─────────────────────────────────
const papelariaMeta = {
  complementaryProductIds: ["DC0001", "DC0002", "DC0006"],
  legacyCode: "DM0199",
  recurrence: "Avulso",
  deliveryDays: "3",
  summaryDescription:
    "Criação de até 3 formatos de impressos com design profissional e identidade visual aplicada. Entregável em arquivo PDF em alta resolução para impressão e arquivo AI do Illustrator para edições futuras.",
  finalPrice: 181.44,
  itemLimit: 1,
  totalExecutionHours: 4,
  executionHoursPerDay: 2,
  testsEnabled: true,
  stepsEnabled: true,

  taskModel: {
    objective:
      "Criar até 3 peças de papelaria com design profissional, identidade visual coerente com a marca do cliente — entrega em .PNG com mockup para aprovação, PDF em alta resolução para impressão e arquivo AI editável.",
    creator: "Consultor/Agência",
    responsible: "Líder de Web",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 3,
  },

  warnings: [
    {
      id: "W01",
      level: "info",
      message:
        "Qualidade do briefing: quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega das peças de papelaria.",
    },
    {
      id: "W02",
      level: "warning",
      message:
        "Direitos autorais — cliente: todos os elementos, conteúdos e demais itens de propriedade do cliente utilizados nas peças devem respeitar os termos da Lei Federal nº 9.610/98.",
    },
    {
      id: "W03",
      level: "warning",
      message:
        "Isenção de responsabilidade: caso o material enviado desrespeite essa determinação, a Allka estará isenta e o cliente será responsabilizado legalmente.",
    },
  ],

  baseFeatures: [
    "Criação de até 3 peças de papelaria com diagramação profissional",
    "Identidade visual coerente com a marca do cliente",
    "Entrega das artes em mockup para visualização",
    "Arquivo PDF pronto para impressão em gráfica (CMYK, 300dpi)",
    "Arquivo AI aberto para edições futuras",
    "Prazo: 3 dias úteis",
    "Execução por nômade habilitado — Especialidade Design Gráfico",
  ],

  tasks: [
    {
      id: "DC0004-T01",
      name: "Criação das Peças de Papelaria",
      description:
        "Pesquisar, criar e entregar até 3 peças de papelaria em .PNG com mockup, respeitando a identidade visual da marca do cliente.",
      taskCategory: "Execução",
      objective:
        "Entregar até 3 peças de papelaria em .PNG com mockup para aprovação, com design coerente com a identidade visual da marca.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: false,
      calculatedCost: 135,
      questionnaire: null,
      executionRules: [
        "Ler o briefing completo e fazer pesquisa sobre o tema da papelaria solicitada antes de iniciar qualquer criação",
        "Acessar as redes sociais do cliente para entender o tom de voz e o estilo visual da comunicação",
        "Aplicar a identidade visual da marca: logotipo, paleta de cores, tipografia e demais elementos fornecidos",
        "Criar cada peça no formato e dimensão corretos para impressão (tamanhos padrão ABNT ou especificados no briefing)",
        "Incluir sangria (bleed) de 3mm e área de segurança nas peças com corte",
        "Enviar todos os materiais solicitados em .PNG junto com seus mockups para visualização e aprovação do cliente",
        "Após aprovação, criar arquivo .ZIP com o PDF em alta resolução e todos os criativos em .png, nomeados no padrão: 'nº da tarefa - projeto - papelaria'",
        "Não entregar o serviço com erros gramaticais, fora do tema proposto ou em desacordo com a comunicação visual do cliente",
        "Não entregar com trechos copiados ou plágio de outros materiais",
        "A tarefa poderá ser aprovada ou reprovada pelo cliente; se reprovada, retornar para correção até o próximo dia útil",
      ],
      steps: [
        {
          id: "DC0004-T01-S01",
          name: "Análise do Briefing e Identidade Visual",
          description:
            "Ler o briefing completo e planejar o layout de cada peça com base na identidade visual fornecida.",
          order: 1,
          estimatedHours: 0.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 22,
        },
        {
          id: "DC0004-T01-S02",
          name: "Criação das Peças (até 3 peças)",
          description:
            "Criar as peças de papelaria conforme briefing, com dimensões corretas, sangria e área de segurança.",
          order: 2,
          estimatedHours: 3.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 113,
        },
      ],
    },
    {
      id: "DC0004-T02",
      name: "Entrega Final — ZIP, PDF e Arquivo AI",
      description:
        "Compilar e entregar o arquivo .ZIP com PDF em alta resolução, criativos em .png e arquivo AI editável com fontes incorporadas.",
      taskCategory: "Entrega",
      objective:
        "Entregar ao cliente o arquivo .ZIP completo com PDF e criativos em .png nomeados corretamente, mais o arquivo AI editável.",
      dependencies: ["DC0004-T01"],
      canRunInParallel: false,
      requiresAccess: false,
      calculatedCost: 45,
      questionnaire: null,
      steps: [
        {
          id: "DC0004-T02-S01",
          name: "Mockup e Exportação de Arquivos Finais",
          description:
            "Criar mockup realista de cada peça e exportar PDF (CMYK, 300dpi) e AI editável com camadas organizadas.",
          order: 1,
          estimatedHours: 1.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 45,
        },
      ],
    },
  ],

  stages: [
    {
      id: "DC0004-E01",
      code: "DC0004-E01",
      number: 1,
      name: "Criação das Peças de Papelaria",
      description:
        "Criação de até 3 peças com identidade visual aplicada, entregues em .PNG com mockup para aprovação antes dos arquivos finais.",
      category: "Execução",
      deliveryDeadlineDays: 3,
      executionDeadlineDays: 2,
      approvalDeadlineDays: 10,
      executionHours: 4,
      value: 40,
      itemLimit: 1,
      specialtyId: 3,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
    },
    {
      id: "DC0004-E02",
      code: "DC0004-E02",
      number: 2,
      name: "Entrega Final — ZIP, PDF e Arquivo AI",
      description:
        "Entrega do arquivo .ZIP com PDF em alta resolução, criativos em .png nomeados corretamente e arquivo AI editável com fontes incorporadas.",
      category: "Entrega",
      deliveryDeadlineDays: 3,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 1,
      value: 10,
      itemLimit: 1,
      specialtyId: 3,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
    },
  ],

  accessInstructions: null,

  executionTerms: [
    "Criar até 3 peças de papelaria conforme as especificações do briefing, respeitando a identidade visual fornecida pelo cliente",
    "Pesquisar o tema e acessar as redes sociais do cliente para entender o tom de voz e estilo visual antes de iniciar",
    "Entregar os materiais em .PNG com mockup para aprovação do cliente antes dos arquivos finais",
    "Após aprovação, compilar arquivo .ZIP com PDF em alta resolução e criativos em .png, nomeados no padrão: 'nº da tarefa - projeto - papelaria'",
    "Entregar arquivo AI editável com camadas organizadas e fontes incorporadas ou convertidas em curvas",
    "Não utilizar elementos com direitos autorais de terceiros sem autorização — apenas criações próprias ou banco de imagens com uso comercial permitido",
    "Não entregar com erros gramaticais, fora do tema proposto ou em desacordo com a comunicação visual do cliente",
    "Não utilizar trechos copiados ou plágio em nenhuma parte do material",
    "Se o cliente reprovar a entrega, realizar as correções solicitadas até o próximo dia útil",
  ],

  nomadAttentionText:
    "Todos os elementos utilizados na criação das peças devem ser desenvolvidos pelo nômade designado ou captados de banco de imagens e fontes com uso comercial devidamente permitido. Qualquer problema legal decorrente da criação que desrespeite essa norma será de exclusiva responsabilidade do nômade.",

  questionnaire: {
    id: "DC0004-Q",
    title: "Briefing — Papelaria (3 unidades)",
    description:
      "Preencha com as informações da sua marca e das peças desejadas.",
    briefingTitle: "Briefing de Papelaria",
    briefingInstructions:
      "Gere um briefing estruturado para criação de papelaria: itens solicitados, objetivo, público-alvo, identidade visual, conteúdo obrigatório e referências visuais.",
    questions: [
      {
        id: "DC0004-Q01",
        question: "Quais 3 itens de papelaria você deseja solicitar?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Peças",
        briefingKey: "itensSolicitados",
        placeholder: "Ex: 1. Papel timbrado A4 | 2. Envelope | 3. Etiqueta",
        warning:
          "Escolha exatamente 3 itens. Opções: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página, Certificado.",
      },
      {
        id: "DC0004-Q02",
        question: "Qual é a ideia criativa e o objetivo desses materiais?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Objetivo",
        briefingKey: "ideiaObjetivo",
        placeholder:
          "Ex: Papelaria para reforçar presença institucional da marca em eventos",
      },
      {
        id: "DC0004-Q03",
        question: "Qual é o público-alvo e onde esses materiais serão usados?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Público",
        briefingKey: "publicoAlvoUso",
        placeholder:
          "Ex: Clientes corporativos — materiais usados em reuniões e envio de propostas",
      },
      {
        id: "DC0004-Q04",
        question: "Envie referências visuais e exemplos de estilo desejado",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Estilo",
        briefingKey: "referencias",
        placeholder:
          "Ex: Links do Pinterest | Estilo minimalista com dourado | Vou enviar imagens em .zip",
        warning:
          "Referências visuais reduzem revisões e garantem que o estilo entregue corresponda à sua expectativa.",
      },
      {
        id: "DC0004-Q05",
        question:
          "Anexe o logotipo renderizado e, se houver, o manual da marca",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Identidade",
        briefingKey: "logoManual",
        placeholder:
          "Ex: Logotipo em vetor AI/SVG — vou enviar no chat | Não tenho manual, apenas PNG",
        warning:
          "Logotipo em vetor (AI, SVG ou EPS) é obrigatório para qualidade de impressão.",
      },
      {
        id: "DC0004-Q06",
        question:
          "Você possui banco de imagens pago ou materiais próprios a serem usados?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Materiais",
        briefingKey: "bancoImagens",
        placeholder:
          "Ex: Sim, Adobe Stock — vou enviar as imagens | Não tenho banco de imagens",
        warning:
          "Todos os elementos visuais utilizados devem ter uso comercial permitido.",
      },
      {
        id: "DC0004-Q07",
        question:
          "Existe algum conteúdo obrigatório que precisa constar nas peças?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: true,
        section: "Conteúdo",
        briefingKey: "conteudoObrigatorio",
        placeholder:
          "Papel timbrado: CNPJ 00.000.000/0001-00 | Endereço | Telefone\nReceituário: CRM 12345",
        warning: "Informe todos os dados de cada peça separadamente.",
      },
      {
        id: "DC0004-Q08",
        question:
          "Há medidas, formatos ou exigências específicas de impressão?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Impressão",
        briefingKey: "medidasFormatos",
        placeholder:
          "Ex: Receituário em A5 | Crachá em 85x55mm | Papel timbrado A4",
      },
      {
        id: "DC0004-Q09",
        question:
          "Existe alguma observação adicional importante para a criação?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Complemento",
        briefingKey: "observacoesAdicionais",
        placeholder:
          "Ex: Não usar fundo escuro | Preciso de versão em escala de cinza | Prazo interno XX/XX",
      },
      {
        id: "DC0004-Q10",
        question: "Caso necessário, anexe materiais complementares em .zip",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Materiais",
        briefingKey: "materiaisComplementares",
        placeholder:
          "Ex: ZIP com fotos do produto enviado no chat | Não tenho materiais adicionais",
        warning:
          "Envie o arquivo .zip pelo chat do projeto antes do início da execução.",
      },
    ],
  },

  nomadTests: [
    {
      id: "DC0004-TEST01",
      code: "DC0004-TEST01",
      name: "Teste de Habilitação — Papelaria",
      description:
        "Criação de papel timbrado e cartão de visita para marca fictícia, demonstrando domínio de identidade visual, diagramação profissional, entrega em .PNG com mockup e arquivo .ZIP final correto.",
      linkedTaskId: "DC0004-T01",
      linkedTaskName: "Criação das Peças de Papelaria",
      fakeClientName: "Studio Atelier Forma",
      passingScore: 70,
      timeLimit: 120,
      isActive: true,
      createdAt: "2026-01-01T09:00:00Z",
    },
  ],

  variationsInternal: {
    "DC0004-V01": {
      label: "Papelaria (3 unidades)",
      code: "DC0004-V01",
      publicDeadlineLabel: "3 dias úteis",
      executionHours: 4,
    },
  },

  contractExpiration: {
    avulso: {
      expiresAfterDays: 90,
      description:
        "Contratação avulsa válida por até 90 dias. Se não utilizada dentro desse prazo, expira automaticamente.",
    },
  },

  portfolioImages: [
    {
      id: "pape-img-01",
      url: "/images/products/papelaria.svg",
      title: "Visão Geral do Produto",
      description: "Exemplos de peças de papelaria criadas pela allka",
      isMain: true,
      sortOrder: 0,
    },
  ],

  presentation: {
    tagline:
      "Sua marca existe além do digital. Papel timbrado, cartão de visita e demais peças de papelaria com design profissional passam credibilidade em cada contato presencial.",
    highlights: [
      "Criação de até 3 peças de papelaria com identidade visual aplicada",
      "Arte em mockup para visualização realista antes da impressão",
      "Arquivo PDF pronto para gráfica (CMYK, alta resolução)",
      "Arquivo AI editável para adaptações futuras",
    ],
    targetAudience: [
      "Profissionais liberais que precisam de papelaria para reuniões e apresentações",
      "Pequenas e médias empresas em processo de estruturação ou rebranding",
      "Escritórios, clínicas e consultórios que recebem clientes presencialmente",
      "Negócios que querem transmitir profissionalismo em cada ponto de contato físico",
    ],
    whatIsIncluded: [
      {
        title: "Criação de até 3 peças de papelaria",
        description:
          "Design profissional de qualquer combinação: papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, crachá, convite, cartaz e mais.",
      },
      {
        title: "Arte em mockup",
        description:
          "Cada peça é apresentada em mockup fotorrealista para visualização antes de ir à gráfica.",
      },
      {
        title: "PDF pronto para gráfica",
        description:
          "Exportação em CMYK, 300dpi — padrão exigido pelas gráficas para impressão profissional.",
      },
      {
        title: "Arquivo AI editável",
        description:
          "Arquivo fonte em Adobe Illustrator com camadas organizadas e fontes em curvas para adaptações futuras.",
      },
    ],
    benefits: [
      {
        title: "Credibilidade em cada contato",
        description:
          "Papelaria bem executada transmite profissionalismo antes mesmo de você falar.",
      },
      {
        title: "Arte pronta para gráfica",
        description:
          "PDF em CMYK com dimensões e sangria corretas — sem retrabalho com a gráfica.",
      },
      {
        title: "Arquivo editável para o futuro",
        description:
          "O arquivo AI é seu. Qualquer designer consegue fazer adaptações futuras em minutos.",
      },
    ],
    deliverables: [
      "Até 3 peças de papelaria criadas com identidade visual da marca",
      "Mockup realista de cada peça para aprovação",
      "Arquivo PDF em CMYK e alta resolução (300dpi) pronto para gráfica",
      "Arquivo AI editável com camadas organizadas e fontes em curvas",
    ],
    notIncluded: [
      "Criação de conteúdo textual — os textos devem ser fornecidos no briefing",
      "Impressão das artes em gráfica — a entrega é digital",
      "Criação ou redesign de logotipo",
      "Mais de 3 peças de papelaria",
    ],
    complementaryProducts: [
      {
        title: "Comunicação Visual (até 5 elementos)",
        description:
          "Expanda para sinalização e materiais de comunicação visual para o ambiente físico.",
      },
      {
        title: "Criação de Logotipo",
        description:
          "Se ainda não tem logotipo, crie um antes da papelaria para identidade visual consistente.",
      },
      {
        title: "Banner Digital Estático ou Carrossel (até 5 telas)",
        description:
          "Complemente a papelaria física com materiais digitais para redes sociais e campanhas.",
      },
    ],
    requirements: [
      "Logotipo da marca (vetor AI/SVG/EPS preferencial; PNG alta resolução aceito)",
      "Briefing com lista das 3 peças desejadas e informações de contato de cada peça",
      "Paleta de cores da marca (valores hex/RGB) — se ausente, extraída do logotipo ou site",
    ],
    howToRequest: [
      {
        step: "Escolha as 3 peças",
        description: "Informe no briefing quais 3 peças deseja criar.",
      },
      {
        step: "Preencha o briefing",
        description: "Envie logotipo, paleta de cores e dados de cada peça.",
      },
      {
        step: "Aprove o mockup",
        description: "Em até 2 dias úteis receba o mockup para aprovação.",
      },
      {
        step: "Receba os arquivos finais",
        description: "PDF para gráfica e AI editável após aprovação.",
      },
    ],
    faq: [
      {
        question: "Quais peças posso criar?",
        answer:
          "Papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, embalagem, etiqueta, crachá, convite, cartaz, marca-página, certificado ou selo.",
      },
      {
        question: "A entrega inclui a impressão?",
        answer:
          "Não. Entrega digital: mockup, PDF e AI. A impressão é responsabilidade do cliente.",
      },
      {
        question: "O arquivo AI pode ser editado por qualquer designer?",
        answer:
          "Sim. Fontes em curvas e camadas organizadas — qualquer designer com Illustrator consegue adaptar.",
      },
    ],
  },
};

// ─── DC0005 — Layout de Website (meta) ──────────────────────────────────────
const layoutWebsiteMeta = {
  complementaryProductIds: ["PA0002", "PA0005"],
  subcategory: "Soluções Web",
  recurrence: "Avulso",
  deliveryDays: "7",
  summaryDescription:
    "Layout profissional de website criado por especialista em web design, com identidade visual da marca aplicada. Entrega em PDF, arquivos abertos em PSD ou Figma, imagens, fontes e versão mobile totalmente adaptada.",
  finalPrice: 453.6,
  itemLimit: 1,
  totalExecutionHours: 20,
  executionHoursPerDay: 4,
  testsEnabled: true,
  stepsEnabled: true,

  taskModel: {
    objective:
      "Criar layout de website com identidade visual da marca aplicada, no formato 1920×1080px (ou informado), entregando PDF para aprovação, arquivo aberto PSD ou Figma com imagens e fontes, e versão mobile totalmente adaptada.",
    creator: "Consultor/Agência",
    responsible: "Líder de Web",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 7,
    totalDeadlineNote:
      "7 dias úteis para até 5 páginas (V01) | 9 dias para até 10 páginas (V02) | 15 dias para até 20 páginas (V03)",
  },

  warnings: [
    {
      id: "W01",
      title: "Qualidade do briefing",
      description:
        "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega. Descreva a identidade visual, público-alvo, referências e o objetivo de cada página.",
      severity: "info",
    },
    {
      id: "W02",
      title: "Guia de identidade visual",
      description:
        "Se houver template ou guia de identidade visual, ele deve ser enviado antes do início da execução para que o nômade respeite as diretrizes da marca.",
      severity: "warning",
    },
    {
      id: "W03",
      title: "Qualidade do logotipo",
      description:
        "O logotipo ou selo devem ser enviados vetorizados (AI, SVG, EPS) ou em alta qualidade (PNG/JPEG mínimo 300dpi). Material em baixa resolução prejudica a qualidade do layout.",
      severity: "warning",
    },
    {
      id: "W04",
      title: "Direitos autorais",
      description:
        "Todos os elementos e conteúdos enviados pelo cliente devem respeitar a Lei Federal nº 9.610/98. A Allka estará isenta em caso de violação causada pelo material enviado.",
      severity: "critical",
    },
  ],

  presentation: {
    tagline:
      "O design do seu website é a primeira impressão da sua marca. Um layout atraente, profissional e memorável transmite credibilidade, reflete seus valores e cria uma experiência única para seus visitantes.",
    highlights: [
      "Layout criado por especialista em web design com identidade visual da marca aplicada",
      "Formato padrão 1920×1080px — adaptável para outros formatos informados no briefing",
      "Versão mobile totalmente adaptada entregue em todas as variações",
      "Entrega em PDF para aprovação e arquivo aberto PSD/Figma para edições futuras",
    ],
    targetAudience: [
      "Empresas que precisam criar ou renovar o design do website com identidade visual profissional",
      "Negócios que têm o site em desenvolvimento e precisam do layout antes da programação",
      "Marcas que querem garantir que o site transmita credibilidade e profissionalismo",
      "Agências que precisam do layout para apresentar ao cliente antes de programar",
      "Empresas que querem arquivos abertos para edições futuras com seu designer ou equipe interna",
    ],
    whatIsIncluded: [
      {
        title: "Layout Desktop",
        description:
          "Layout criado no formato 1920×1080px (ou informado no briefing), com identidade visual da marca aplicada, grid consistente e hierarquia visual clara em todas as páginas.",
      },
      {
        title: "Versão Mobile Adaptada",
        description:
          "Versão mobile totalmente adaptada (não apenas redimensionada) para todas as páginas criadas — com breakpoints, legibilidade e usabilidade em tela pequena.",
      },
      {
        title: "PDF para Aprovação",
        description:
          "Arquivo PDF com todas as páginas (desktop e mobile) para visualização e aprovação antes da entrega dos arquivos finais.",
      },
      {
        title: "Arquivo Aberto PSD ou Figma",
        description:
          "Arquivo aberto com todas as páginas, camadas organizadas por seção, imagens e fontes incluídas — pronto para uso por qualquer designer.",
      },
      {
        title: "Revisão após Aprovação",
        description:
          "Após a aprovação do PDF, o nômade realiza ajustes pontuais solicitados antes de entregar os arquivos finais.",
      },
    ],
    benefits: [
      {
        title: "Fortalecimento da identidade de marca",
        description:
          "O layout é desenvolvido com a identidade visual da sua marca em cada detalhe — cores, tipografia, ícones e estilo visual consistentes em todas as páginas.",
      },
      {
        title: "Profissionalismo e credibilidade",
        description:
          "Um design atraente e profissional estabelece imagem positiva e confiável desde a primeira visita — antes mesmo de ler qualquer palavra.",
      },
      {
        title: "Liberdade com arquivos abertos",
        description:
          "Você recebe os arquivos PSD ou Figma organizados para que qualquer designer possa fazer adaptações futuras sem precisar recriar o layout do zero.",
      },
      {
        title: "Aplicação em diferentes plataformas",
        description:
          "O layout entregue pode ser aplicado em WordPress, Webflow, Wix, código customizado — com adaptações mínimas para qualquer plataforma.",
      },
      {
        title: "Destaque em relação à concorrência",
        description:
          "Um site com design criativo e memorável diferencia sua marca e cria uma primeira impressão duradoura nos visitantes.",
      },
      {
        title: "Melhoria da experiência do usuário",
        description:
          "O layout é criado com hierarquia visual, fluxo de navegação e CTAs estratégicos para guiar o visitante naturalmente até a conversão.",
      },
      {
        title: "Integração com mídias sociais",
        description:
          "O estilo visual do layout é desenvolvido em coerência com a comunicação da marca nas redes sociais, criando uma experiência consistente.",
      },
      {
        title: "Entrega no formato desejado e adaptado",
        description:
          "Formato padrão 1920×1080px, com adaptação para outros formatos informados no briefing. Arquivos em PSD ou Figma conforme sua preferência.",
      },
    ],
    deliverables: [
      "Layout de website em PDF (desktop + mobile) para aprovação",
      "Arquivo aberto PSD ou Figma com páginas, imagens e fontes incluídas",
      "Versão mobile totalmente adaptada para todas as páginas",
      "Revisão de ajustes após aprovação do PDF",
      "Entrega em até 7, 9 ou 15 dias úteis conforme a variação",
    ],
    notIncluded: [
      "Criação ou revisão de conteúdo textual",
      "Programação do website",
      "Configuração do website em qualquer plataforma",
      "Suporte na hospedagem",
      "Hospedagem do website",
    ],
    warnings: [
      "Quanto maior o detalhamento de informações no briefing, mais fiel e qualitativa será a entrega.",
      "Todos os elementos e conteúdos enviados pelo cliente devem respeitar a Lei Federal nº 9.610/98 — direitos autorais.",
      "A Allka estará isenta em caso de violação causada pelo material enviado pelo cliente.",
    ],
    complementaryProducts: [
      {
        title: "SEO — Posicionamento Orgânico",
        description:
          "Com o layout pronto, implemente a estratégia de SEO para posicionar seu site no Google e atrair visitantes qualificados.",
      },
      {
        title: "Análise de Usabilidade UX",
        description:
          "Após a criação do layout, valide a experiência do usuário com análise completa de usabilidade — velocidade, botões, links e tagueamento.",
      },
      {
        title: "Configuração de Data Analytics",
        description:
          "Instale rastreamento completo no novo site — GA4, GTM e pixels de anúncios — para medir acessos, conversões e comportamento dos visitantes.",
      },
    ],
    requirements: [
      "Logotipo da marca fornecido (vetor AI/SVG/EPS preferencial; PNG alta resolução aceito)",
      "Briefing preenchido com: objetivo do site, páginas desejadas, público-alvo e referências visuais",
      "Conteúdo textual revisado pelo cliente para cada página (ou indicação de uso de placeholder)",
      "Guia de identidade visual (se disponível) enviado antes do início da execução",
    ],
    howToRequest: [
      {
        step: "Escolha o número de páginas",
        description:
          "Selecione a variação com o número de páginas do seu website: até 5, até 10 ou até 20 páginas.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe o objetivo do site, as páginas desejadas, o público-alvo e envie o logotipo e referências visuais.",
      },
      {
        step: "Aprove o PDF",
        description:
          "Receba o PDF com o layout de todas as páginas (desktop e mobile) para revisão e aprovação.",
      },
      {
        step: "Receba os arquivos finais",
        description:
          "Após a aprovação, receba o .ZIP com PDF, arquivo aberto PSD ou Figma, imagens e fontes.",
      },
    ],
    faq: [
      {
        question: "O layout inclui programação?",
        answer:
          "Não. O produto entrega o layout visual em PDF e arquivo aberto. A programação do site é um produto separado.",
      },
      {
        question: "Em qual formato são entregues os arquivos?",
        answer:
          "PDF de todas as páginas (desktop + mobile) + arquivo aberto em PSD ou Figma com imagens e fontes. Informe sua preferência no briefing.",
      },
      {
        question: "O que é a versão mobile adaptada?",
        answer:
          "É uma versão do layout desenvolvida especificamente para telas de celular — não apenas a versão desktop reduzida. Inclui reorganização de colunas, tamanhos de texto adaptados e CTAs com área de toque adequada.",
      },
      {
        question: "Preciso ter o conteúdo textual pronto?",
        answer:
          "Recomendado, mas não obrigatório. Se não tiver os textos prontos, o nômade usa placeholders. O conteúdo final deve ser revisado pelo cliente antes da programação.",
      },
      {
        question: "Quantas revisões estão incluídas?",
        answer:
          "O produto inclui uma rodada de revisão após a aprovação do PDF. Revisões adicionais ou mudanças de escopo podem gerar cobrança extra.",
      },
    ],
  },

  questionnaire: {
    id: "DC0005-Q",
    title: "Briefing — Layout de Website",
    description:
      "Preencha com as informações da sua marca e do website desejado. Quanto mais detalhado, mais fiel à sua visão será a entrega.",
    questions: [
      {
        id: "DC0005-Q01",
        question: "Qual é o objetivo principal do website?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Objetivo",
        briefingKey: "objetivoSite",
        placeholder:
          "Exemplo: quero um site para apresentar meus serviços de consultoria e captar contatos de potenciais clientes.",
      },
      {
        id: "DC0005-Q02",
        question: "Qual é o público-alvo do website?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Público",
        briefingKey: "publicoAlvo",
        placeholder:
          "Exemplo: empresários de pequenas empresas, entre 30 e 50 anos, que acessam principalmente pelo celular.",
        warning:
          "O público-alvo define tom de voz, hierarquia visual e os CTAs prioritários do layout.",
      },
      {
        id: "DC0005-Q03",
        question: "Informe as páginas desejadas para o layout.",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Páginas",
        briefingKey: "paginasDesejadas",
        placeholder:
          "Exemplo: Home | Sobre nós | Serviços | Portfólio | Blog | Contato",
        warning:
          "Informe todas as páginas dentro do limite da variação contratada. Páginas extras serão cobradas separadamente.",
      },
      {
        id: "DC0005-Q04",
        question: "Você possui referências de layout ou sites que gosta?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Referências",
        briefingKey: "referencias",
        placeholder:
          "Exemplo: gosto do estilo do site www.exemplo.com.br — clean, com muito espaço em branco e CTA em destaque.",
        warning:
          "Referências visuais ajudam o especialista a entender o estilo desejado e reduzem revisões.",
      },
      {
        id: "DC0005-Q05",
        question: "Você possui logotipo e manual de identidade visual?",
        type: "select",
        required: true,
        options: [
          "Sim — tenho logotipo e manual da marca completo",
          "Sim — tenho logotipo, mas sem manual da marca",
          "Tenho apenas logotipo em baixa qualidade (PNG/JPG)",
          "Não tenho logotipo ainda",
        ],
        aiAssisted: false,
        section: "Identidade",
        briefingKey: "logoManual",
        placeholder: "Selecione",
        warning:
          "Se tiver guia de identidade visual, envie pelo chat antes do início. O logotipo em vetor é obrigatório para qualidade profissional.",
      },
      {
        id: "DC0005-Q06",
        question: "Você possui conteúdo textual pronto para o site?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Conteúdo",
        briefingKey: "conteudoTextual",
        placeholder:
          "Exemplo: tenho os textos de Home e Sobre prontos, mas Serviços e Contato precisam ser escritos.",
        warning:
          "O layout é criado com base no conteúdo fornecido. Sem texto, o nômade usará placeholder — a versão final depende do conteúdo revisado pelo cliente.",
      },
      {
        id: "DC0005-Q07",
        question: "O site usa alguma plataforma ou sistema específico?",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Plataforma",
        briefingKey: "plataforma",
        placeholder:
          "Exemplo: WordPress com Elementor | Webflow | site em HTML/CSS customizado | ainda não decidimos",
        warning:
          "Informar a plataforma permite que o layout seja criado respeitando as limitações e possibilidades do sistema escolhido.",
      },
      {
        id: "DC0005-Q08",
        question: "Observações adicionais",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Complemento",
        briefingKey: "observacoes",
        placeholder:
          "Exemplo: usar tons de azul e branco | evitar muitas fontes diferentes | o site deve transmitir sofisticação e confiança",
      },
    ],
  },

  // ─── Dados por variação ────────────────────────────────────────────────────
  variationData: {
    // ── V01 — Até 5 páginas [DM0221] ─────────────────────────────────────────
    "DC0005-V01": {
      legacyCode: "DM0221",
      objective: "Criação de até 05 páginas para o layout de website",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      creator: "Consultor/Agência",
      minNomads: 1,
      requiresAccess: false,
      internalDeadlineDays: 5,
      executionHoursTotal: 8,
      executionDeadlineHours: 72,
      internalCost: 100.0,
      externalDeadlineDaysExecution: 5,
      externalDeadlineDaysApproval: 10,
      externalDeadlineDaysTotal: 6,
      questionnaire: {
        id: "DC0005-V01-Q",
        title: "Briefing — Layout de Website (Até 5 páginas)",
        description:
          "Preencha as informações do website de até 5 páginas. Inclua o objetivo de cada página individualmente para garantir um layout alinhado com o seu negócio.",
        questions: [
          {
            id: "DC0005-V01-Q01",
            order: 1,
            question:
              "Poderia nos falar um pouco sobre o negócio que será apresentado no website?",
            type: "multiline",
            required: true,
            section: "Negócio",
            briefingKey: "descricaoNegocio",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: somos uma clínica odontológica em São Paulo, atendendo adultos e crianças com foco em estética dental.",
          },
          {
            id: "DC0005-V01-Q02",
            order: 2,
            question: "Qual seria o objetivo das páginas?",
            type: "multiline",
            required: true,
            section: "Objetivo",
            briefingKey: "objetivoPaginas",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: apresentar os serviços, transmitir credibilidade e captar agendamentos online.",
          },
          {
            id: "DC0005-V01-Q03",
            order: 3,
            question: "Qual seria o público-alvo?",
            type: "multiline",
            required: true,
            section: "Público",
            briefingKey: "publicoAlvo",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: adultos entre 25 e 45 anos, residentes na cidade de São Paulo, que buscam serviços odontológicos de qualidade.",
          },
          {
            id: "DC0005-V01-Q04",
            order: 4,
            question: "Qual domínio será utilizado?",
            type: "text",
            required: false,
            section: "Técnico",
            briefingKey: "dominio",
            aiAssisted: false,
            options: [],
            placeholder: "Exemplo: www.minhaempresa.com.br",
          },
          {
            id: "DC0005-V01-Q05",
            order: 5,
            question: "Qual seria o objetivo da página 1?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina1",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home — apresentar a marca, destaque dos principais serviços e CTA para agendamento.",
          },
          {
            id: "DC0005-V01-Q06",
            order: 6,
            question: "Qual seria o objetivo da página 2?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina2",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Sobre nós — contar a história da empresa, equipe e diferenciais.",
          },
          {
            id: "DC0005-V01-Q07",
            order: 7,
            question: "Qual seria o objetivo da página 3?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina3",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Serviços — detalhar cada serviço oferecido com descrição e benefícios.",
          },
          {
            id: "DC0005-V01-Q08",
            order: 8,
            question: "Qual seria o objetivo da página 4?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina4",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Portfólio — exibir casos, antes e depois ou galeria de trabalhos realizados.",
          },
          {
            id: "DC0005-V01-Q09",
            order: 9,
            question: "Qual seria o objetivo da página 5?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina5",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Contato — formulário de contato, mapa e informações para agendamento.",
          },
          {
            id: "DC0005-V01-Q10",
            order: 10,
            question: "Poderia nos enviar algumas referências?",
            type: "multiline",
            required: false,
            section: "Referências",
            briefingKey: "referencias",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: gosto do estilo visual de www.site1.com.br e www.site2.com.br — clean, com destaque para os serviços.",
            warning:
              "Referências visuais ajudam o especialista a entender o estilo desejado e reduzem revisões.",
          },
          {
            id: "DC0005-V01-Q11",
            order: 11,
            question:
              "Anexar o conteúdo revisado do site, páginas e banners (obrigatório)",
            type: "attachment",
            required: true,
            section: "Conteúdo",
            briefingKey: "conteudoAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie os textos revisados de cada página em formato .docx, .pdf ou .txt.",
            warning:
              "O conteúdo textual revisado pelo cliente é obrigatório para início da execução. Sem conteúdo, o nômade usará placeholder — o resultado final pode divergir do esperado.",
          },
          {
            id: "DC0005-V01-Q12",
            order: 12,
            question: "Irá possuir um CTA para ser incluso?",
            type: "multiline",
            required: true,
            section: "CTA",
            briefingKey: "cta",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: sim — quero um botão 'Agendar consulta' em destaque na Home e em todas as páginas de serviços.",
          },
          {
            id: "DC0005-V01-Q13",
            order: 13,
            question: "O que deseja colocar no menu?",
            type: "multiline",
            required: true,
            section: "Navegação",
            briefingKey: "menu",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home | Sobre nós | Serviços | Portfólio | Contato",
          },
          {
            id: "DC0005-V01-Q14",
            order: 14,
            question: "O que deseja no cabeçalho do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "cabecalho",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: logotipo à esquerda, menu centralizado e botão de agendamento à direita.",
          },
          {
            id: "DC0005-V01-Q15",
            order: 15,
            question: "O que deseja no rodapé do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "rodape",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: endereço, telefone, links das redes sociais, mapa do site e política de privacidade.",
          },
          {
            id: "DC0005-V01-Q16",
            order: 16,
            question: "Qual a sua ideia e instruções para as páginas?",
            type: "multiline",
            required: true,
            section: "Instruções",
            briefingKey: "instrucoesGerais",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: quero um layout moderno e clean, com bastante espaço em branco, cores azul e branco, transmitindo confiança e profissionalismo.",
          },
          {
            id: "DC0005-V01-Q17",
            order: 17,
            question: "Inserir todos os links úteis",
            type: "multiline",
            required: false,
            section: "Links",
            briefingKey: "linksUteis",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: site atual: www.site.com.br | Instagram: @perfil | Referências: www.ref1.com, www.ref2.com",
          },
          {
            id: "DC0005-V01-Q18",
            order: 18,
            question:
              "Possui fotos, vídeos e anexos que devem ser inseridos no site?",
            type: "attachment",
            required: false,
            section: "Mídia",
            briefingKey: "midiaAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie as fotos e materiais em alta resolução. Caso não tenha, o nômade usará imagens de banco com uso comercial.",
            warning:
              "Imagens em baixa resolução prejudicam a qualidade do layout. Envie sempre em PNG ou JPG com mínimo de 1920px de largura.",
          },
          {
            id: "DC0005-V01-Q19",
            order: 19,
            question:
              "Por favor, anexe o logotipo renderizado e, se tiver, o manual da marca",
            type: "attachment",
            required: true,
            section: "Identidade",
            briefingKey: "logoManualAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie o logotipo em vetor (AI, SVG, EPS) ou PNG em alta resolução (mínimo 500px). Se tiver manual da marca, inclua no mesmo arquivo.",
            warning:
              "O logotipo em vetor é preferencial. PNG em baixa resolução dificulta a aplicação no layout e prejudica a qualidade da entrega.",
          },
          {
            id: "DC0005-V01-Q20",
            order: 20,
            question:
              "Você possui um banco de imagens pago que possa compartilhar?",
            type: "select",
            required: false,
            section: "Imagens",
            briefingKey: "bancoImagens",
            aiAssisted: false,
            options: [
              "Sim — tenho acesso a banco de imagens pago e posso compartilhar",
              "Não — pode usar imagens de banco gratuito com uso comercial",
              "Não — prefiro que o layout use apenas as fotos que enviei",
            ],
            placeholder: "Selecione",
            warning:
              "Se possuir banco pago, o nômade deve enviar a imagem com marca d'água e o link original para que o cliente faça o download autorizado.",
          },
        ],
      },
      qualificationChecklist: {
        id: "DC0005-V01-CL",
        items: [
          {
            id: "DC0005-V01-CL-I01",
            label:
              "Analisei o briefing detalhadamente para averiguar como é o website pedido",
          },
          {
            id: "DC0005-V01-CL-I02",
            label:
              "Verifiquei se as páginas criadas estão dentro do solicitado no briefing",
          },
          {
            id: "DC0005-V01-CL-I03",
            label:
              "Certifiquei-me de que a estrutura do layout está clara e bem organizada",
          },
          {
            id: "DC0005-V01-CL-I04",
            label:
              "O layout está adaptado corretamente em diferentes dispositivos",
          },
          {
            id: "DC0005-V01-CL-I05",
            label: "A usabilidade está de acordo com o layout",
          },
          {
            id: "DC0005-V01-CL-I06",
            label:
              "Avaliei se imagens e elementos visuais são relevantes e de alta qualidade",
          },
        ],
      },
    },

    // ── V02 — Até 10 páginas [DM0222] ────────────────────────────────────────
    "DC0005-V02": {
      legacyCode: "DM0222",
      objective: "Criação de até 10 páginas para o layout de website",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      creator: "Consultor/Agência",
      minNomads: 2,
      requiresAccess: false,
      internalDeadlineDays: 6,
      executionHoursTotal: 14,
      executionDeadlineHours: 96,
      internalCost: 175.0,
      externalDeadlineDaysExecution: 6,
      externalDeadlineDaysApproval: 10,
      externalDeadlineDaysTotal: 7,
      questionnaire: {
        id: "DC0005-V02-Q",
        title: "Briefing — Layout de Website (Até 10 páginas)",
        description:
          "Preencha as informações do website de até 10 páginas. Inclua o objetivo de cada página individualmente para garantir um layout alinhado com a sua marca.",
        questions: [
          {
            id: "DC0005-V02-Q01",
            order: 1,
            question:
              "Poderia nos falar um pouco sobre o negócio que será apresentado no website?",
            type: "multiline",
            required: true,
            section: "Negócio",
            briefingKey: "descricaoNegocio",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: somos uma agência de marketing digital em São Paulo, atendendo PMEs e e-commerces com foco em resultado.",
          },
          {
            id: "DC0005-V02-Q02",
            order: 2,
            question: "Qual seria o objetivo das páginas?",
            type: "multiline",
            required: true,
            section: "Objetivo",
            briefingKey: "objetivoPaginas",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: apresentar os serviços e cases de sucesso, captar leads e transmitir autoridade no segmento.",
          },
          {
            id: "DC0005-V02-Q03",
            order: 3,
            question: "Qual seria o público-alvo?",
            type: "multiline",
            required: true,
            section: "Público",
            briefingKey: "publicoAlvo",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: proprietários de pequenas e médias empresas, entre 30 e 55 anos, que buscam aumentar vendas com marketing digital.",
          },
          {
            id: "DC0005-V02-Q04",
            order: 4,
            question: "Qual domínio será utilizado?",
            type: "text",
            required: false,
            section: "Técnico",
            briefingKey: "dominio",
            aiAssisted: false,
            options: [],
            placeholder: "Exemplo: www.minhaagencia.com.br",
          },
          {
            id: "DC0005-V02-Q05",
            order: 5,
            question: "Qual seria o objetivo da página 1?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina1",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home — apresentar a agência, serviços principais e CTA para falar com consultor.",
          },
          {
            id: "DC0005-V02-Q06",
            order: 6,
            question: "Qual seria o objetivo da página 2?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina2",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Sobre nós — história da empresa, missão, visão e valores.",
          },
          {
            id: "DC0005-V02-Q07",
            order: 7,
            question: "Qual seria o objetivo da página 3?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina3",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Serviços — listar todos os serviços com descrição e benefícios.",
          },
          {
            id: "DC0005-V02-Q08",
            order: 8,
            question: "Qual seria o objetivo da página 4?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina4",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Cases — exibir resultados de clientes com métricas e depoimentos.",
          },
          {
            id: "DC0005-V02-Q09",
            order: 9,
            question: "Qual seria o objetivo da página 5?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina5",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Blog — exibir artigos e conteúdos educativos do segmento.",
          },
          {
            id: "DC0005-V02-Q10",
            order: 10,
            question: "Qual seria o objetivo da página 6?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina6",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Equipe — apresentar os profissionais e suas especialidades.",
          },
          {
            id: "DC0005-V02-Q11",
            order: 11,
            question: "Qual seria o objetivo da página 7?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina7",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: FAQ — responder as dúvidas mais frequentes dos clientes.",
          },
          {
            id: "DC0005-V02-Q12",
            order: 12,
            question: "Qual seria o objetivo da página 8?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina8",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Parceiros — apresentar marcas e parceiros estratégicos.",
          },
          {
            id: "DC0005-V02-Q13",
            order: 13,
            question: "Qual seria o objetivo da página 9?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina9",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Política de privacidade — informações legais e LGPD.",
          },
          {
            id: "DC0005-V02-Q14",
            order: 14,
            question: "Qual seria o objetivo da página 10?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina10",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Contato — formulário completo, mapa, telefone e redes sociais.",
          },
          {
            id: "DC0005-V02-Q15",
            order: 15,
            question: "Poderia nos enviar algumas referências?",
            type: "multiline",
            required: false,
            section: "Referências",
            briefingKey: "referencias",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: gosto do estilo visual de www.site1.com.br e www.site2.com.br — clean, com destaque para cases e resultados.",
            warning:
              "Referências visuais ajudam o especialista a entender o estilo desejado e reduzem revisões.",
          },
          {
            id: "DC0005-V02-Q16",
            order: 16,
            question:
              "Anexar o conteúdo revisado do site, páginas e banners (obrigatório)",
            type: "attachment",
            required: true,
            section: "Conteúdo",
            briefingKey: "conteudoAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie os textos revisados de cada página em formato .docx, .pdf ou .txt.",
            warning:
              "O conteúdo textual revisado pelo cliente é obrigatório para início da execução. Sem conteúdo, o nômade usará placeholder.",
          },
          {
            id: "DC0005-V02-Q17",
            order: 17,
            question: "Irá possuir um CTA para ser incluso?",
            type: "multiline",
            required: true,
            section: "CTA",
            briefingKey: "cta",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: sim — quero botão 'Falar com consultor' na Home e nas páginas de serviços.",
          },
          {
            id: "DC0005-V02-Q18",
            order: 18,
            question: "O que deseja colocar no menu?",
            type: "multiline",
            required: true,
            section: "Navegação",
            briefingKey: "menu",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home | Sobre | Serviços | Cases | Blog | Equipe | Contato",
          },
          {
            id: "DC0005-V02-Q19",
            order: 19,
            question: "O que deseja no cabeçalho do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "cabecalho",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: logotipo à esquerda, menu completo ao centro, botão de contato à direita.",
          },
          {
            id: "DC0005-V02-Q20",
            order: 20,
            question: "O que deseja no rodapé do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "rodape",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: endereço, telefone, links das redes sociais, mapa do site e política de privacidade.",
          },
          {
            id: "DC0005-V02-Q21",
            order: 21,
            question: "Qual a sua ideia e instruções para as páginas?",
            type: "multiline",
            required: true,
            section: "Instruções",
            briefingKey: "instrucoesGerais",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: quero um site profissional com layout moderno, predominância das cores da marca, transmitindo autoridade e resultados.",
          },
          {
            id: "DC0005-V02-Q22",
            order: 22,
            question: "Inserir todos os links úteis",
            type: "multiline",
            required: false,
            section: "Links",
            briefingKey: "linksUteis",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: site atual: www.site.com.br | Instagram: @perfil | LinkedIn: /empresa | Referências: www.ref1.com",
          },
          {
            id: "DC0005-V02-Q23",
            order: 23,
            question:
              "Possui fotos, vídeos e anexos que devem ser inseridos no site?",
            type: "attachment",
            required: false,
            section: "Mídia",
            briefingKey: "midiaAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie as fotos e materiais em alta resolução. Caso não tenha, o nômade usará imagens de banco com uso comercial.",
            warning:
              "Imagens em baixa resolução prejudicam a qualidade do layout. Envie sempre em PNG ou JPG com mínimo de 1920px de largura.",
          },
          {
            id: "DC0005-V02-Q24",
            order: 24,
            question:
              "Por favor, anexe o logotipo renderizado e, se tiver, o manual da marca",
            type: "attachment",
            required: true,
            section: "Identidade",
            briefingKey: "logoManualAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie o logotipo em vetor (AI, SVG, EPS) ou PNG em alta resolução (mínimo 500px).",
            warning:
              "O logotipo em vetor é preferencial. PNG em baixa resolução dificulta a aplicação no layout.",
          },
          {
            id: "DC0005-V02-Q25",
            order: 25,
            question:
              "Você possui um banco de imagens pago que possa compartilhar?",
            type: "select",
            required: false,
            section: "Imagens",
            briefingKey: "bancoImagens",
            aiAssisted: false,
            options: [
              "Sim — tenho acesso a banco de imagens pago e posso compartilhar",
              "Não — pode usar imagens de banco gratuito com uso comercial",
              "Não — prefiro que o layout use apenas as fotos que enviei",
            ],
            placeholder: "Selecione",
            warning:
              "Se possuir banco pago, o nômade deve enviar a imagem com marca d'água e o link original para que o cliente faça o download autorizado.",
          },
        ],
      },
      qualificationChecklist: {
        id: "DC0005-V02-CL",
        items: [
          {
            id: "DC0005-V02-CL-I01",
            label:
              "Analisei o briefing detalhadamente para averiguar como é o website pedido",
          },
          {
            id: "DC0005-V02-CL-I02",
            label:
              "Verifiquei se as páginas criadas estão dentro do solicitado no briefing",
          },
          {
            id: "DC0005-V02-CL-I03",
            label:
              "Certifiquei-me de que a estrutura do layout está clara e bem organizada",
          },
          {
            id: "DC0005-V02-CL-I04",
            label:
              "O layout está adaptado corretamente em diferentes dispositivos",
          },
          {
            id: "DC0005-V02-CL-I05",
            label: "A usabilidade está de acordo com o layout",
          },
          {
            id: "DC0005-V02-CL-I06",
            label:
              "Avaliei se imagens e elementos visuais são relevantes e de alta qualidade",
          },
          {
            id: "DC0005-V02-CL-I07",
            label:
              "Verifiquei que todas as 10 páginas solicitadas foram criadas e estão presentes no arquivo final",
          },
          {
            id: "DC0005-V02-CL-I08",
            label:
              "Confirmei que todas as 10 páginas possuem versão mobile adaptada (não apenas redimensionada)",
          },
        ],
      },
    },

    // ── V03 — Até 20 páginas [DM0223] ────────────────────────────────────────
    "DC0005-V03": {
      legacyCode: "DM0223",
      objective: "Criação de até 20 páginas para o layout de website",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      creator: "Consultor/Agência",
      minNomads: 2,
      requiresAccess: false,
      internalDeadlineDays: 10,
      executionHoursTotal: 20,
      executionDeadlineHours: 144,
      internalCost: 250.0,
      externalDeadlineDaysExecution: 10,
      externalDeadlineDaysApproval: 10,
      externalDeadlineDaysTotal: 11,
      questionnaire: {
        id: "DC0005-V03-Q",
        title: "Briefing — Layout de Website (Até 20 páginas)",
        description:
          "Preencha as informações do website de até 20 páginas. Descreva o objetivo de cada página individualmente. Quanto mais detalhado o briefing, mais fiel e qualitativa será a entrega.",
        questions: [
          {
            id: "DC0005-V03-Q01",
            order: 1,
            question:
              "Poderia nos falar um pouco sobre o negócio que será apresentado no website?",
            type: "multiline",
            required: true,
            section: "Negócio",
            briefingKey: "descricaoNegocio",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: somos uma construtora de médio porte atuando em São Paulo e Grande SP, focada em imóveis residenciais de alto padrão.",
          },
          {
            id: "DC0005-V03-Q02",
            order: 2,
            question: "Qual seria o objetivo das páginas?",
            type: "multiline",
            required: true,
            section: "Objetivo",
            briefingKey: "objetivoPaginas",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: apresentar os empreendimentos, captar leads qualificados, transmitir solidez e credibilidade da construtora.",
          },
          {
            id: "DC0005-V03-Q03",
            order: 3,
            question: "Qual seria o público-alvo?",
            type: "multiline",
            required: true,
            section: "Público",
            briefingKey: "publicoAlvo",
            aiAssisted: true,
            options: [],
            placeholder:
              "Exemplo: compradores de imóveis de alto padrão entre 35 e 60 anos, com renda acima de R$ 15.000, que buscam segurança e valorização.",
          },
          {
            id: "DC0005-V03-Q04",
            order: 4,
            question: "Qual domínio será utilizado?",
            type: "text",
            required: false,
            section: "Técnico",
            briefingKey: "dominio",
            aiAssisted: false,
            options: [],
            placeholder: "Exemplo: www.minhaempresa.com.br",
          },
          {
            id: "DC0005-V03-Q05",
            order: 5,
            question: "Qual seria o objetivo da página 1?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina1",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home — apresentar a construtora, destaque dos empreendimentos e CTA principal.",
          },
          {
            id: "DC0005-V03-Q06",
            order: 6,
            question: "Qual seria o objetivo da página 2?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina2",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Sobre nós — história, valores, diferenciais e equipe.",
          },
          {
            id: "DC0005-V03-Q07",
            order: 7,
            question: "Qual seria o objetivo da página 3?",
            type: "multiline",
            required: true,
            section: "Páginas",
            briefingKey: "objetivoPagina3",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Empreendimentos — listagem de todos os projetos com filtros.",
          },
          {
            id: "DC0005-V03-Q08",
            order: 8,
            question: "Qual seria o objetivo da página 4?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina4",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Empreendimento A — página individual com galeria, planta e CTA.",
          },
          {
            id: "DC0005-V03-Q09",
            order: 9,
            question: "Qual seria o objetivo da página 5?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina5",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Empreendimento B — página individual com galeria, planta e CTA.",
          },
          {
            id: "DC0005-V03-Q10",
            order: 10,
            question: "Qual seria o objetivo da página 6?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina6",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Empreendimento C — página individual com galeria, planta e CTA.",
          },
          {
            id: "DC0005-V03-Q11",
            order: 11,
            question: "Qual seria o objetivo da página 7?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina7",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Empreendimento D — página individual com galeria, planta e CTA.",
          },
          {
            id: "DC0005-V03-Q12",
            order: 12,
            question: "Qual seria o objetivo da página 8?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina8",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Blog — artigos sobre mercado imobiliário e dicas de compra.",
          },
          {
            id: "DC0005-V03-Q13",
            order: 13,
            question: "Qual seria o objetivo da página 9?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina9",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Pós-venda — processo de entrega, documentação e acompanhamento.",
          },
          {
            id: "DC0005-V03-Q14",
            order: 14,
            question: "Qual seria o objetivo da página 10?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina10",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Sustentabilidade — iniciativas ambientais e certificações.",
          },
          {
            id: "DC0005-V03-Q15",
            order: 15,
            question: "Qual seria o objetivo da página 11?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina11",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Parceiros — construtoras, financeiras e parceiros estratégicos.",
          },
          {
            id: "DC0005-V03-Q16",
            order: 16,
            question: "Qual seria o objetivo da página 12?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina12",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Imprensa — clippings, press releases e kit para imprensa.",
          },
          {
            id: "DC0005-V03-Q17",
            order: 17,
            question: "Qual seria o objetivo da página 13?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina13",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Trabalhe conosco — formulário de candidatura e cultura da empresa.",
          },
          {
            id: "DC0005-V03-Q18",
            order: 18,
            question: "Qual seria o objetivo da página 14?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina14",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Área do cliente — acesso ao portal do comprador.",
          },
          {
            id: "DC0005-V03-Q19",
            order: 19,
            question: "Qual seria o objetivo da página 15?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina15",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Financiamento — simuladores e parceiros financeiros.",
          },
          {
            id: "DC0005-V03-Q20",
            order: 20,
            question: "Qual seria o objetivo da página 16?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina16",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Localização — mapas e pontos de referência dos empreendimentos.",
          },
          {
            id: "DC0005-V03-Q21",
            order: 21,
            question: "Qual seria o objetivo da página 17?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina17",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Depoimentos — clientes satisfeitos com fotos e histórias.",
          },
          {
            id: "DC0005-V03-Q22",
            order: 22,
            question: "Qual seria o objetivo da página 18?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina18",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Perguntas frequentes — FAQ sobre processos de compra e entrega.",
          },
          {
            id: "DC0005-V03-Q23",
            order: 23,
            question: "Qual seria o objetivo da página 19?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina19",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Política de privacidade — informações legais e LGPD.",
          },
          {
            id: "DC0005-V03-Q24",
            order: 24,
            question: "Qual seria o objetivo da página 20?",
            type: "multiline",
            required: false,
            section: "Páginas",
            briefingKey: "objetivoPagina20",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Contato — formulário completo, mapa de localização, telefone e redes sociais.",
          },
          {
            id: "DC0005-V03-Q25",
            order: 25,
            question: "Poderia nos enviar algumas referências?",
            type: "multiline",
            required: false,
            section: "Referências",
            briefingKey: "referencias",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: gosto do estilo visual de www.site1.com.br e www.site2.com.br — sofisticado, com foco em imagens de alta qualidade.",
            warning:
              "Referências visuais ajudam o especialista a entender o estilo desejado e reduzem revisões.",
          },
          {
            id: "DC0005-V03-Q26",
            order: 26,
            question: "O que deseja no cabeçalho do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "cabecalho",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: logotipo à esquerda, menu completo ao centro com submenus, botão de contato à direita.",
          },
          {
            id: "DC0005-V03-Q27",
            order: 27,
            question:
              "Anexar o conteúdo revisado do site, páginas e banners (obrigatório)",
            type: "attachment",
            required: true,
            section: "Conteúdo",
            briefingKey: "conteudoAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie os textos revisados de cada uma das 20 páginas em formato .docx, .pdf ou .txt.",
            warning:
              "O conteúdo textual revisado pelo cliente é obrigatório para início da execução. Sem conteúdo, o nômade usará placeholder.",
          },
          {
            id: "DC0005-V03-Q28",
            order: 28,
            question: "Irá possuir um CTA para ser incluso?",
            type: "multiline",
            required: true,
            section: "CTA",
            briefingKey: "cta",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: sim — quero botão 'Agendar visita' nas páginas de empreendimentos e na Home.",
          },
          {
            id: "DC0005-V03-Q29",
            order: 29,
            question: "O que deseja colocar no menu?",
            type: "multiline",
            required: true,
            section: "Navegação",
            briefingKey: "menu",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: Home | Sobre | Empreendimentos ▾ (submenu) | Blog | Contato",
          },
          {
            id: "DC0005-V03-Q30",
            order: 30,
            question: "O que deseja no rodapé do site?",
            type: "multiline",
            required: true,
            section: "Estrutura",
            briefingKey: "rodape",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: endereço de todas as unidades, telefones, mapa do site completo, redes sociais e política de privacidade.",
          },
          {
            id: "DC0005-V03-Q31",
            order: 31,
            question: "Inserir todos os links úteis",
            type: "multiline",
            required: false,
            section: "Links",
            briefingKey: "linksUteis",
            aiAssisted: false,
            options: [],
            placeholder:
              "Exemplo: site atual: www.site.com.br | Instagram: @perfil | LinkedIn: /empresa | YouTube: /canal | Referências: www.ref1.com",
          },
          {
            id: "DC0005-V03-Q32",
            order: 32,
            question:
              "Possui fotos, vídeos e anexos que devem ser inseridos no site?",
            type: "attachment",
            required: false,
            section: "Mídia",
            briefingKey: "midiaAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie as fotos e materiais em alta resolução. Para 20 páginas, organize os arquivos por página para facilitar o trabalho do nômade.",
            warning:
              "Imagens em baixa resolução prejudicam a qualidade do layout. Envie sempre em PNG ou JPG com mínimo de 1920px de largura. Organize por pasta/página.",
          },
          {
            id: "DC0005-V03-Q33",
            order: 33,
            question:
              "Você possui um banco de imagens pago que possa compartilhar?",
            type: "select",
            required: false,
            section: "Imagens",
            briefingKey: "bancoImagens",
            aiAssisted: false,
            options: [
              "Sim — tenho acesso a banco de imagens pago e posso compartilhar",
              "Não — pode usar imagens de banco gratuito com uso comercial",
              "Não — prefiro que o layout use apenas as fotos que enviei",
            ],
            placeholder: "Selecione",
            warning:
              "Se possuir banco pago, o nômade deve enviar a imagem com marca d'água e o link original para que o cliente faça o download autorizado.",
          },
          {
            id: "DC0005-V03-Q34",
            order: 34,
            question:
              "Por favor, anexe o logotipo renderizado e, se tiver, o manual da marca",
            type: "attachment",
            required: true,
            section: "Identidade",
            briefingKey: "logoManualAnexo",
            aiAssisted: false,
            options: [],
            placeholder:
              "Envie o logotipo em vetor (AI, SVG, EPS) ou PNG em alta resolução (mínimo 500px). Se tiver manual da marca, inclua no mesmo arquivo.",
            warning:
              "O logotipo em vetor é preferencial. Para um site de 20 páginas, o guia completo de identidade visual é altamente recomendado para garantir consistência.",
          },
        ],
      },
      qualificationChecklist: {
        id: "DC0005-V03-CL",
        items: [
          {
            id: "DC0005-V03-CL-I01",
            label:
              "Analisei o briefing detalhadamente para averiguar como é o website pedido",
          },
          {
            id: "DC0005-V03-CL-I02",
            label:
              "Verifiquei se as páginas criadas estão dentro do solicitado no briefing",
          },
          {
            id: "DC0005-V03-CL-I03",
            label:
              "Certifiquei-me de que a estrutura do layout está clara e bem organizada",
          },
          {
            id: "DC0005-V03-CL-I04",
            label:
              "O layout está adaptado corretamente em diferentes dispositivos",
          },
          {
            id: "DC0005-V03-CL-I05",
            label: "A usabilidade está de acordo com o layout",
          },
          {
            id: "DC0005-V03-CL-I06",
            label:
              "Avaliei se imagens e elementos visuais são relevantes e de alta qualidade",
          },
          {
            id: "DC0005-V03-CL-I07",
            label:
              "Verifiquei que todas as 20 páginas solicitadas foram criadas e estão presentes no arquivo final",
          },
          {
            id: "DC0005-V03-CL-I08",
            label:
              "Confirmei que todas as 20 páginas possuem versão mobile adaptada (não apenas redimensionada)",
          },
          {
            id: "DC0005-V03-CL-I09",
            label:
              "Revisei a consistência visual entre todas as 20 páginas — grid, tipografia e paleta de cores uniformes",
          },
          {
            id: "DC0005-V03-CL-I10",
            label:
              "Verifiquei que o arquivo aberto está organizado por seções e frames claramente identificados para o volume de 20 páginas",
          },
        ],
      },
    },
  },
};

// ─── DC0006 — Template para Criativos (5 unidades) (meta) ──────────────────
const templateCriativosMeta = {
  complementaryProductIds: ["DC0002", "DC0001", "PA0001"],
  subcategory: "Social Media e Publicações",
  legacyCode: "DM0220",
  recurrence: "Avulso e Mensal",
  deliveryDays: "4",
  summaryDescription:
    "Criação de até 5 templates criativos profissionais em Canva, Photoshop ou Illustrator, em até 3 formatos, com arquivos abertos para edição futura.",
  finalPrice: 226.8,

  testsEnabled: true,
  totalExecutionHours: 5,

  // ── Avisos ──────────────────────────────────────────────────────────────
  warnings: [
    {
      id: "W01",
      type: "info",
      icon: "Info",
      title: "Qualidade do briefing",
      message:
        "Quanto maior o detalhamento das informações, mais fiel e qualitativa será a entrega.",
    },
    {
      id: "W02",
      type: "warning",
      icon: "Shield",
      title: "Direitos autorais — cliente",
      message:
        "Todos os materiais e conteúdos enviados pelo cliente devem respeitar a Lei Federal nº 9.610/98 (Direitos Autorais).",
    },
    {
      id: "W03",
      type: "warning",
      icon: "Shield",
      title: "Isenção de responsabilidade",
      message:
        "Caso o material encaminhado desrespeite essa determinação, a Allka ficará isenta de responsabilidade e o cliente será responsável legalmente.",
    },
  ],

  // ── Atenção ao nômade ────────────────────────────────────────────────────
  nomadAttentionText:
    "Todos os elementos utilizados devem ser criados pelo nômade designado ou captados de banco de imagens/fontes com uso comercial permitido. Qualquer problema legal decorrente do uso de materiais não autorizados será de responsabilidade exclusiva do nômade.",

  // ── Modelo de tarefa ────────────────────────────────────────────────────
  taskModel: {
    objective: "Template para Criativos (5 unidades)",
    creator: "Consultor/Agência",
    responsible: "Líder de Criação e Arte",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 4,
    totalExecutionDeadlineHours: 48,
    totalExecutionHours: 5,
    totalExecutorCost: 62.5,
  },

  // ── Descritivo ──────────────────────────────────────────────────────────
  taskDescription:
    "Criação de até 5 templates criativos em até 3 formatos/dimensões, com design profissional e identidade visual alinhada à marca. O executor deve desenvolver os materiais em Canva, Photoshop ou Illustrator, conforme especificado no briefing, pesquisar a identidade visual do cliente e utilizar referências e bases fornecidas. A entrega inclui os arquivos abertos para edição e os arquivos finais em .png, organizados em .zip. Entregas via Canva incluem link editável ativo por no mínimo 10 dias.",

  // ── Características base ────────────────────────────────────────────────
  baseFeatures: [
    "Criação de até 5 templates criativos por ciclo",
    "Até 3 formatos/dimensões diferentes por solicitação",
    "Desenvolvidos em Canva, Photoshop ou Illustrator",
    "Entrega: arquivos abertos (.psd/.ai ou link Canva) + finais em .png em .zip",
    "Identidade visual alinhada à marca do cliente",
  ],

  // ── Tarefas internas ────────────────────────────────────────────────────
  tasks: [
    {
      id: "DC0004-T01",
      legacyCode: "DM0220_1",
      title: "Template para Criativos (5 unidades)",
      description:
        "Criação de até 5 templates criativos em Canva, Photoshop ou Illustrator, em até 3 formatos/dimensões solicitados, com design profissional e identidade visual alinhada à marca. Entrega em arquivo aberto (.psd, .ai ou link Canva) e arquivos finais em .png organizados em .zip.",
      creator: "Consultor/Agência",
      responsible: "Líder de Criação e Arte",
      executor: "Nômade Especialista",
      objective: "Template para Criativos (5 unidades)",
      executionRules: [
        "Analisar o briefing detalhadamente antes de iniciar — verificar objetivo, público-alvo, formatos solicitados e identidade visual da marca.",
        "Pesquisar a identidade visual do cliente: redes sociais, site, manual de marca ou referências enviadas. Observar paleta de cores, tipografia e tom visual.",
        "Desenvolver os 5 templates conforme as ideias e dimensões descritas no briefing, mantendo consistência visual entre todos os modelos.",
        "Se o cliente enviar bases ou referências visuais prontas, utilizá-las como ponto de partida e adaptá-las conforme o briefing.",
        "Não entregar materiais com erros gramaticais, fora do tema solicitado, desalinhados da identidade da marca ou com conteúdo plagiário.",
        "Formato de entrega padronizado:\n  • Photoshop: arquivos .psd (abertos, incorporados) + .png final de cada template\n  • Illustrator: arquivos .ai (abertos) + .png final de cada template\n  • Canva: link editável para cópia + .png final exportado de cada template\n  Todos os arquivos devem ser organizados em .zip antes da entrega.",
        "Se a entrega for pelo Canva, o link editável deve permanecer ativo por no mínimo 10 dias após a entrega. Informar o link diretamente no campo de entrega.",
        "Em caso de reprovação, a tarefa será devolvida para correção. O prazo de correção não altera o prazo original de entrega.",
      ],
      conclusionRules: {
        canApprove: true,
        canReject: true,
        correctionDeadline: "próximo dia útil",
      },
      calculatedCost: 62.5,
    },
  ],

  // ── Estágios ────────────────────────────────────────────────────────────
  stages: [
    {
      id: "DC0004-E01",
      code: "DM0220_1",
      number: 1,
      title: "Template para Criativos (5 unidades)",
      description:
        "Criação e entrega dos 5 templates criativos com arquivos abertos (.psd, .ai ou link Canva) e arquivos finais em .png, organizados em .zip, nos formatos e dimensões solicitados, alinhados à identidade visual da marca.",
      value: 62.5,
      deliveryDeadlineDays: 4,
      executionDeadlineHours: 48,
      executionHours: 5,
      keepSameNomad: false,
      requiresFinalFiles: true,
      requiresClientApproval: true,
      taskIds: ["DC0004-T01"],
    },
  ],

  // ── Questionário de briefing ────────────────────────────────────────────
  questionnaire: {
    title: "Briefing — Template para Criativos (5 unidades)",
    description:
      "Preencha as informações abaixo com o máximo de detalhes. Quanto mais preciso for o briefing, mais fiel será o resultado entregue.",
    aiAssisted: false,
    sections: [
      {
        id: "S01",
        title: "Objetivo e público",
        questions: [
          {
            id: "Q01",
            briefingKey: "objetivo",
            label: "Qual é o objetivo dos templates?",
            placeholder:
              "Ex.: posts para Instagram, banners para campanhas, stories promocionais, cards para LinkedIn, materiais para e-mail marketing.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q02",
            briefingKey: "publicoAlvo",
            label: "Quem é o público-alvo?",
            placeholder:
              "Ex.: mulheres de 25 a 40 anos interessadas em moda, empresários do setor de saúde, jovens universitários.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q03",
            briefingKey: "referencias",
            label:
              "Envie referências visuais para seguirmos a identidade do negócio.",
            placeholder:
              "Envie imagens, links de Instagram/Pinterest ou descreva o estilo visual. Quanto mais referências, melhor o alinhamento.",
            type: "file",
            required: false,
          },
        ],
      },
      {
        id: "S02",
        title: "Dimensões e ideias",
        questions: [
          {
            id: "Q04",
            briefingKey: "dimensoes",
            label: "Quais são as 3 dimensões desejadas?",
            placeholder:
              "Ex.: 1080×1080px (feed Instagram), 1080×1920px (stories), 1200×628px (Facebook/LinkedIn). Máximo de 3 formatos.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q05",
            briefingKey: "template1",
            label: "Qual é a ideia para o Template 1?",
            placeholder:
              "Descreva o tema, conteúdo e objetivo deste template. Ex.: post de lançamento de produto com headline em destaque.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q06",
            briefingKey: "template2",
            label: "Qual é a ideia para o Template 2?",
            placeholder: "Descreva o tema, conteúdo e objetivo deste template.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q07",
            briefingKey: "template3",
            label: "Qual é a ideia para o Template 3?",
            placeholder: "Descreva o tema, conteúdo e objetivo deste template.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q08",
            briefingKey: "template4",
            label: "Qual é a ideia para o Template 4?",
            placeholder: "Descreva o tema, conteúdo e objetivo deste template.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
          {
            id: "Q09",
            briefingKey: "template5",
            label: "Qual é a ideia para o Template 5?",
            placeholder: "Descreva o tema, conteúdo e objetivo deste template.",
            type: "multiline",
            required: true,
            aiAssisted: false,
          },
        ],
      },
      {
        id: "S03",
        title: "Plataforma e arquivos",
        questions: [
          {
            id: "Q10",
            briefingKey: "plataforma",
            label:
              "Qual é a plataforma desejada para criação: Photoshop, Illustrator ou Canva?",
            type: "select",
            required: true,
            options: [
              { value: "photoshop", label: "Photoshop (.psd)" },
              { value: "illustrator", label: "Illustrator (.ai)" },
              { value: "canva", label: "Canva (link editável)" },
            ],
          },
          {
            id: "Q11",
            briefingKey: "logotipo",
            label:
              "Anexe o logotipo renderizado e, se houver, o manual da marca.",
            placeholder:
              "Envie o logotipo em formato vetorial (.ai, .svg, .eps) ou em alta resolução. Se houver manual de identidade visual, envie também.",
            type: "file",
            required: true,
          },
          {
            id: "Q12",
            briefingKey: "bancoImagens",
            label: "Possui banco de imagens pago? Se sim, informe qual.",
            placeholder:
              "Ex.: Shutterstock, Getty Images, Adobe Stock. Caso não possua, informaremos se será necessário adquirir algum recurso.",
            type: "multiline",
            required: false,
            aiAssisted: false,
          },
        ],
      },
    ],
  },

  // ── Checklist de qualificação ───────────────────────────────────────────
  qualificationChecklist: {
    passingScore: 70,
    sections: [
      {
        id: "S01",
        title: "Alinhamento ao briefing",
        items: [
          {
            id: "I01",
            description:
              "Li o briefing detalhadamente e verifiquei objetivo, público-alvo, formatos solicitados e identidade visual antes de iniciar.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I02",
            description:
              "Os 5 templates foram criados conforme as ideias e o conteúdo descrito em cada item do briefing.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I03",
            description:
              "Os templates não contêm erros gramaticais, conteúdo fora do tema ou inconsistência com a marca.",
            weight: 2,
            isRequired: true,
          },
        ],
      },
      {
        id: "S02",
        title: "Qualidade técnica e entrega",
        items: [
          {
            id: "I01",
            description:
              "Todos os templates mantêm consistência visual entre si (cores, tipografia, estilo e logotipo).",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I02",
            description:
              "Os formatos e dimensões entregues correspondem exatamente aos solicitados no briefing.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I03",
            description:
              "Os arquivos abertos foram entregues no formato correto da plataforma escolhida: .psd, .ai ou link editável do Canva.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I04",
            description:
              "Os arquivos finais em .png foram entregues prontos para uso, organizados em .zip.",
            weight: 2,
            isRequired: true,
          },
          {
            id: "I05",
            description:
              "Se entregue pelo Canva, o link editável está ativo, funcional e foi informado no campo de entrega.",
            weight: 2,
            isRequired: false,
          },
          {
            id: "I06",
            description:
              "O CTA (chamada para ação) foi aplicado corretamente nos templates em que foi solicitado.",
            weight: 1,
            isRequired: false,
          },
        ],
      },
    ],
  },

  // ── Testes dos nômades ──────────────────────────────────────────────────
  nomadTests: [
    {
      id: "DC0004-TEST01",
      title: "Teste de Habilitação — Template para Criativos",
      description:
        "Criar 3 templates criativos para a marca fictícia Bella Concept, conforme briefing fornecido, entregando arquivos abertos e finais.",
      timeLimitMinutes: 120,
      passingScore: 70,
      fakeContext: {
        clientName: "Bella Concept",
        clientDescription:
          "Marca de moda feminina contemporânea, com foco em peças clássicas e minimalistas para mulheres de 25 a 45 anos. Paleta de cores: rosé, off-white e dourado.",
        objetivo:
          "Criar 3 templates para feed do Instagram (posts de produto, promoção e frase motivacional), alinhados à identidade visual da marca.",
        publicoAlvo:
          "Mulheres de 25 a 45 anos, interessadas em moda, lifestyle e tendências.",
        dimensoes: "1080×1080px (feed), 1080×1350px (retrato)",
        template1:
          "Post de lançamento de coleção — produto em destaque com headline elegante.",
        template2:
          "Post de promoção — destaque de desconto com elemento de urgência.",
        template3:
          "Post de frase motivacional — texto inspirador com identidade da marca.",
        plataforma: "Canva (link editável)",
        identidadeVisual: "Minimalista, elegante, rosé + off-white + dourado.",
      },
      evaluationCriteria: [
        "Os 3 templates foram criados conforme as ideias descritas no briefing",
        "A identidade visual (cores, tipografia, logotipo) está consistente entre os templates",
        "Os formatos e dimensões estão corretos (1080×1080px e 1080×1350px)",
        "O link editável do Canva está ativo e funcional",
        "Os arquivos finais em .png foram entregues",
        "O design é profissional, criativo e alinhado ao público-alvo",
        "Não há erros de digitação, recorte ou desalinhamento visível",
      ],
      enablesAdditionalTasks: ["DC0004-T01"],
    },
  ],

  // ── Circuito pré-habilitação ────────────────────────────────────────────
  preCircuit: {
    welcomeTitle: "Bem-vindo ao circuito pré-habilitação — DC0004",
    welcomeHighlights: [
      "Criação de até 5 templates criativos por ciclo",
      "Até 3 formatos diferentes por solicitação",
      "Entrega em Canva, Photoshop ou Illustrator",
      "Arquivos abertos para edição e arquivos finais para uso",
    ],
    aboutDescription:
      "Este circuito certifica que você está apto a executar tarefas de criação de templates criativos, seguindo os padrões de qualidade, consistência visual e entrega da plataforma.",
    rules: [
      "Leia o briefing completo antes de iniciar — objetivo, público-alvo, dimensões e ideias de cada template.",
      "Crie os templates com consistência visual entre si, respeitando a identidade da marca.",
      "Entregue os arquivos abertos no formato correto da plataforma escolhida (.psd, .ai ou link do Canva).",
      "Entregue também os arquivos finais em .png ou .jpg prontos para uso.",
      "Se a entrega for pelo Canva, o link editável deve permanecer ativo por pelo menos 10 dias.",
    ],
    warnings: [
      "Não utilize elementos de terceiros sem autorização — qualquer problema legal será de sua responsabilidade.",
      "Entregas sem os arquivos abertos para edição ou com inconsistência visual entre os templates serão reprovadas.",
    ],
    confirmChecklist: [
      "Li e compreendi o briefing do cliente fictício e o objetivo do teste.",
      "Possuo acesso a Canva, Photoshop ou Illustrator para criar os templates.",
      "Sei criar designs com consistência visual e alinhamento de identidade de marca.",
      "Irei entregar os arquivos abertos (.psd, .ai ou link Canva) e os finais em .png.",
      "Se a entrega for pelo Canva, o link editável ficará ativo por pelo menos 10 dias.",
      "Tenho disponibilidade para concluir o teste dentro do prazo estabelecido.",
    ],
  },

  // ── Variações internas ──────────────────────────────────────────────────
  variationsInternal: {
    DC0004: {
      code: "DC0004",
      publicDeadlineLabel: "4 dias úteis",
      executionDeadlineDays: 3,
      totalDeadlineDays: 4,
      executorCost: 62.5,
    },
  },

  // ── Expiração de contrato ───────────────────────────────────────────────
  contractExpiration: {
    avulso: {
      days: 90,
      description:
        "O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa será considerada expirada e não poderá mais ser utilizada.",
    },
    mensal: {
      days: 30,
      description:
        "A tarefa fica disponível a cada 30 dias e pode ser utilizada até a abertura da próxima recorrência. Caso não seja utilizada dentro desse período, será considerada expirada.",
    },
  },

  // ── Apresentação pública ────────────────────────────────────────────────
  presentation: {
    tagline:
      "5 templates criativos com a identidade visual da sua marca, prontos para publicar ou editar — entregues em até 4 dias úteis.",

    highlights: [
      "5 templates criativos por contratação (avulso ou mensal)",
      "Até 3 dimensões/formatos por solicitação",
      "Canva (link editável), Photoshop (.psd) ou Illustrator (.ai)",
      "Arquivos finais em .png, organizados em .zip",
      "Prazo de entrega: até 4 dias úteis após o briefing",
    ],

    targetAudience: [
      "Marcas que precisam de artes padronizadas para redes sociais sem manter designer fixo",
      "Agências que produzem criativos recorrentes para múltiplos clientes",
      "Empresas que querem padronizar sua comunicação visual com consistência",
      "Empreendedores que precisam de materiais profissionais e editáveis",
      "Times de marketing que precisam de templates prontos para uso contínuo",
    ],

    whatIsIncluded: [
      {
        title: "5 templates criativos",
        description:
          "Design original para cada template, criado com diagramação e estética alinhadas ao briefing e à identidade visual da marca.",
      },
      {
        title: "Até 3 formatos/dimensões por solicitação",
        description:
          "Cada template é adaptado para os formatos escolhidos no briefing, como feed, stories, banner ou outros.",
      },
      {
        title: "Arquivo aberto para edição",
        description:
          "Entrega em .psd (Photoshop), .ai (Illustrator) ou link editável do Canva — para que o cliente edite textos e imagens livremente. O link do Canva é válido por pelo menos 10 dias.",
      },
      {
        title: "Arquivo final pronto para publicação",
        description:
          "Entrega em .png de alta qualidade, organizados em .zip, prontos para uso imediato.",
      },
      {
        title: "Alinhamento à identidade visual",
        description:
          "Todos os templates respeitam o logotipo, paleta de cores e tipografia da marca informados no briefing.",
      },
    ],

    benefits: [
      "Templates reutilizáveis: edite textos e imagens quantas vezes precisar",
      "Consistência visual nas publicações sem depender de um designer fixo",
      "Mais agilidade no dia a dia — artes prontas quando você precisar",
      "Cobertura de diferentes formatos de publicação em uma única contratação",
      "Arquivos organizados em .zip para facilitar o uso e o armazenamento",
      "Economia de tempo e custo em relação à produção avulsa de cada peça",
    ],

    notIncluded: [
      "Criação de textos, legendas ou copywriting",
      "Publicação e agendamento nas redes sociais",
      "Assinatura ou plano pago do Canva",
      "Imagens de banco pagas (são utilizadas imagens gratuitas ou fornecidas pelo cliente)",
    ],

    complementaryProducts: [],

    howToRequest: [
      {
        step: "Contrate o serviço",
        description:
          "Escolha a modalidade: avulso (1 contratação, 90 dias para solicitar) ou mensal (renova automaticamente a cada 30 dias). Finalize a contratação no carrinho.",
      },
      {
        step: "Preencha o briefing completo",
        description:
          "Informe o objetivo e público-alvo, os 5 temas ou ideias de template, os formatos desejados (até 3 dimensões) e a plataforma de edição preferida (Canva, Photoshop ou Illustrator). Envie o logotipo em alta qualidade e referências visuais, se houver.",
      },
      {
        step: "Receba, revise e use",
        description:
          "Em até 4 dias úteis você recebe os 5 templates em arquivo aberto (Canva/Photoshop/Illustrator) + arquivos finais em .png no .zip. Você tem até 10 dias para aprovar ou solicitar ajustes dentro do escopo original.",
      },
    ],

    faq: [
      {
        question:
          "Quantos templates e formatos estão incluídos por contratação?",
        answer:
          "5 templates por contratação (avulso ou mensal). Cada template pode ser criado em até 3 dimensões/formatos diferentes, resultando em até 15 artes no total.",
      },
      {
        question: "Em qual ferramenta os templates serão criados?",
        answer:
          "Você escolhe no briefing: Canva, Photoshop ou Illustrator. O especialista criará todos os 5 templates na ferramenta selecionada.",
      },
      {
        question: "Por quanto tempo o link do Canva fica disponível?",
        answer:
          "O link editável fica ativo por pelo menos 10 dias após a entrega. Recomendamos salvar uma cópia na sua conta do Canva assim que receber.",
      },
      {
        question: "Posso solicitar revisões?",
        answer:
          "Sim. Está incluída uma rodada de ajustes dentro do escopo original do briefing. Alterações que fujam ao escopo podem ser tratadas como novo serviço.",
      },
      {
        question: "Os templates incluem imagens?",
        answer:
          "Sim, desde que sejam imagens gratuitas de banco de imagens. Imagens pagas não estão incluídas. Você também pode fornecer as imagens que deseja usar no briefing.",
      },
      {
        question: "Qual a diferença entre avulso e mensal?",
        answer:
          "No avulso, você faz uma única contratação e tem 90 dias para solicitar os templates. No mensal, a tarefa renova automaticamente a cada 30 dias e expira caso não seja utilizada no período.",
      },
    ],
  },
};

export const mockProducts: MockProduct[] = [
  // ─── PA0001 — Gestão de Tráfego ────────────────────────────────────────
  {
    id: "PA0001",
    name: "Gestão de Tráfego",
    description:
      "Gestão completa de campanhas de tráfego pago por especialista certificado, com monitoramento semanal, otimizações contínuas e relatório mensal de performance.",
    short_description:
      "Campanhas de tráfego pago gerenciadas por especialistas, com relatório mensal e foco em resultado.",
    category: "Performance e Anúncios Patrocinados",
    tags: JSON.stringify([
      "tráfego pago",
      "meta ads",
      "google ads",
      "performance",
      "mensal",
    ]),
    base_price: 1200,
    complexity: "intermediate",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/trafego-pago.jpg",
    demonstrations: JSON.stringify([
      "/images/products/trafego-pago.jpg",
      "/images/products/trafego-portfolio-01.jpg",
      "/images/products/trafego-portfolio-02.jpg",
      "/images/products/trafego-portfolio-03.jpg",
      "/images/products/trafego-portfolio-04.jpg",
      "/images/products/trafego-portfolio-05.jpg",
      "/images/products/trafego-portfolio-06.jpg",
    ]),
    completion_time: "30 dias",
    metadata: JSON.stringify(trafegoMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-25T09:00:00Z",
    variations: [
      {
        id: "PA0001-V01",
        name: "Até 2 campanhas",
        description:
          "Gestão de até 2 campanhas simultâneas em até 2 plataformas.",
        price: 1200,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Até 2 campanhas em até 2 plataformas (Meta Ads ou Google Ads)",
        features: JSON.stringify([
          "Gestão de até 2 campanhas simultâneas",
          "Em até 2 plataformas (Meta Ads ou Google Ads)",
          "Até 4 conjuntos de anúncios no total",
          "Relatório mensal com análise das 2 campanhas",
          "Até 14h de execução ao longo do mês",
        ]),
        sort_order: 1,
        is_active: true,
      },
      {
        id: "PA0001-V02",
        name: "Até 4 campanhas",
        description:
          "Gestão de até 4 campanhas simultâneas em até 2 plataformas.",
        price: 2000,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Até 4 campanhas em até 2 plataformas (Meta Ads e/ou Google Ads)",
        features: JSON.stringify([
          "Gestão de até 4 campanhas simultâneas",
          "Em até 2 plataformas (Meta Ads e/ou Google Ads)",
          "Até 10 conjuntos de anúncios no total",
          "Testes A/B básicos de criativos",
          "Relatório mensal completo com análise das 4 campanhas",
          "Até 18h de execução ao longo do mês",
        ]),
        sort_order: 2,
        is_active: true,
      },
      {
        id: "PA0001-V03",
        name: "Até 6 campanhas",
        description:
          "Gestão de até 6 campanhas simultâneas em até 3 plataformas.",
        price: 3200,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Até 6 campanhas em até 3 plataformas (Meta Ads, Google Ads e TikTok Ads)",
        features: JSON.stringify([
          "Gestão de até 6 campanhas simultâneas",
          "Em até 3 plataformas (Meta Ads, Google Ads e TikTok Ads)",
          "Conjuntos de anúncios ilimitados dentro do escopo",
          "Testes A/B avançados de criativos e públicos",
          "Dashboard de acompanhamento de resultados",
          "Relatório mensal detalhado com análise de todas as campanhas",
          "Até 24h de execução ao longo do mês",
        ]),
        sort_order: 3,
        is_active: true,
      },
    ],
    addons: [
      {
        id: "PA0001-ADDON-01",
        name: "Criação de Criativos (pacote mensal)",
        description:
          "Produção de até 8 peças criativas (imagem ou vídeo curto) para uso nos anúncios.",
        price: 800,
        category: "extra",
      },
      {
        id: "PA0001-ADDON-02",
        name: "Relatório Quinzenal",
        description:
          "Relatório de performance adicional entregue na metade do mês (dia 15).",
        price: 200,
        category: "extra",
      },
    ],
    status: "active",
    price: 1200,
    unit: "mês",
    sku: "PA0001",
  },

  // ─── PA0002 — SEO ───────────────────────────────────────────────────────
  {
    id: "PA0002",
    name: "SEO",
    description:
      "Otimização completa para mecanismos de busca: auditoria técnica, estratégia de palavras-chave, otimização on-page, link building e relatório mensal de posicionamento orgânico.",
    short_description:
      "Posicionamento orgânico real, com estratégia técnica e de conteúdo para crescer no Google de forma consistente.",
    category: "Performance e Anúncios Patrocinados",
    tags: JSON.stringify([
      "SEO",
      "tráfego orgânico",
      "palavras-chave",
      "google",
      "on-page",
      "link building",
      "mensal",
    ]),
    base_price: 1500,
    complexity: "intermediate",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/seo.svg",
    demonstrations: JSON.stringify([
      "/images/products/seo.svg",
      "/images/products/seo-portfolio-01.svg",
      "/images/products/seo-portfolio-02.svg",
      "/images/products/seo-portfolio-03.svg",
      "/images/products/seo-portfolio-04.svg",
    ]),
    completion_time: "30 dias",
    metadata: JSON.stringify(seoMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-25T09:00:00Z",
    variations: [
      {
        id: "PA0002-V01",
        name: "Básico — até 10 palavras-chave",
        description: "Ideal para sites em fase inicial de SEO.",
        price: 1500,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Otimização de até 10 palavras-chave e até 5 páginas por mês",
        features: JSON.stringify([
          "Otimização de até 10 palavras-chave principais",
          "Auditoria técnica mensal completa",
          "Otimização on-page de até 5 páginas",
          "Construção de 2 a 3 backlinks por mês",
          "Relatório mensal de posicionamento",
          "Até 10h de execução ao longo do mês",
        ]),
        sort_order: 1,
        is_active: true,
      },
      {
        id: "PA0002-V02",
        name: "Intermediário — até 25 palavras-chave",
        description: "Para sites com presença consolidada que querem escalar.",
        price: 2800,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Otimização de até 25 palavras-chave e até 12 páginas por mês",
        features: JSON.stringify([
          "Otimização de até 25 palavras-chave",
          "Auditoria técnica mensal completa",
          "Otimização on-page de até 12 páginas",
          "Construção de 4 a 6 backlinks por mês",
          "Orientação para criação de conteúdo otimizado",
          "Relatório mensal detalhado de posicionamento e tráfego",
          "Até 16h de execução ao longo do mês",
        ]),
        sort_order: 2,
        is_active: true,
      },
      {
        id: "PA0002-V03",
        name: "Avançado — até 50 palavras-chave",
        description:
          "Para sites competitivos com estratégia agressiva de posicionamento.",
        price: 4500,
        price_modifier: 0,
        deadline_days: 30,
        scope_description:
          "Otimização de até 50 palavras-chave e até 25 páginas por mês",
        features: JSON.stringify([
          "Otimização de até 50 palavras-chave",
          "Auditoria técnica mensal completa",
          "Otimização on-page de até 25 páginas",
          "Construção de 8 a 12 backlinks por mês",
          "Estratégia de conteúdo mensal (pauta + otimização)",
          "Monitoramento de concorrentes",
          "Relatório semanal de posicionamento e tráfego",
          "Até 24h de execução ao longo do mês",
        ]),
        sort_order: 3,
        is_active: true,
      },
    ],
    addons: [
      {
        id: "PA0002-ADDON-01",
        name: "Criação de Artigo para Blog (por artigo)",
        description:
          "Redação de artigo SEO-otimizado com mínimo 1.200 palavras, keyword principal e secundárias.",
        price: 350,
        category: "extra",
      },
      {
        id: "PA0002-ADDON-02",
        name: "Auditoria Técnica Avulsa",
        description:
          "Auditoria técnica completa fora do ciclo mensal, entregue em até 5 dias úteis.",
        price: 600,
        category: "extra",
      },
    ],
    status: "active",
    price: 1500,
    unit: "mês",
    sku: "PA0002",
  },

  // ─── PA0003 — Configuração de Google Negócios ───────────────────────────
  {
    id: "PA0003",
    name: "Configuração de Google Negócios",
    description:
      "Configuração e otimização completa do perfil Google Meu Negócio: informações do negócio, fotos, cardápio ou catálogo, publicação de até 10 posts e respostas a até 20 avaliações. Conteúdo capturado a partir do site e dos materiais enviados no briefing.",
    short_description:
      "Configuração e otimização completa do perfil Google Meu Negócio: informações do negócio, fotos, cardápio ou catálogo, publicação de até 10 posts e respostas a até 20 avaliações. Conteúdo capturado a partir do site e dos materiais enviados no briefing.",
    category: "Performance e Anúncios Patrocinados",
    tags: JSON.stringify([
      "Google Maps",
      "My Business",
      "Google Negócios",
      "SEO local",
      "Orgânico",
      "Google",
      "Mapa do Google",
    ]),
    base_price: 136.08,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/google-negocios.svg",
    demonstrations: JSON.stringify([
      "/images/products/google-negocios.svg",
      "/images/products/google-negocios-portfolio-01.svg",
      "/images/products/google-negocios-portfolio-02.svg",
      "/images/products/google-negocios-portfolio-03.svg",
    ]),
    completion_time: "8 dias úteis",
    metadata: JSON.stringify(googleNegociosMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-25T09:00:00Z",
    variations: [
      {
        id: "PA0003-V01",
        name: "Configuração de Google Negócios",
        description:
          "Configuração completa do perfil Google Meu Negócio com até 10 posts e respostas a até 20 avaliações.",
        price: 136.08,
        price_modifier: 0,
        deadline_days: 8,
        scope_description:
          "Configuração única do perfil + categoria, atributos, fotos, até 10 posts + respostas a até 20 avaliações + documento de entrega com prints",
        features: JSON.stringify([
          "Configuração completa do Google Meu Negócio (dados, horários, categoria, atributos)",
          "Upload e organização de fotos enviadas pelo cliente",
          "Cardápio, catálogo ou lista de serviços (quando fornecido)",
          "Publicação de até 10 posts no perfil",
          "Respostas a até 20 avaliações usando modelos do briefing",
          "Documento de entrega (PA0003-DOC-ENTREGA) com prints de cada seção",
          "Até 3h de execução em 8 dias úteis (E01 + E02 + E03)",
        ]),
        sort_order: 1,
        is_active: true,
      },
    ],
    addons: [
      {
        id: "PA0003-ADDON-01",
        name: "Posts Mensais (pacote com 10 posts)",
        description:
          "Criação e publicação de 10 novos posts mensais no perfil Google Meu Negócio.",
        price: 80,
        category: "extra",
      },
      {
        id: "PA0003-ADDON-02",
        name: "Gestão de Avaliações Mensal",
        description:
          "Monitoramento e resposta a novas avaliações ao longo do mês (até 30 respostas).",
        price: 60,
        category: "extra",
      },
    ],
    status: "active",
    price: 136.08,
    unit: "avulso",
    sku: "PA0003",
  },

  // ─── PA0004 — Configuração de Data Analytics ────────────────────────────
  {
    id: "PA0004",
    name: "Configuração de Data Analytics",
    description:
      "Instalação, configuração e testes de tags e pixels de rastreamento: Google Tag Manager, Google Analytics 4, Pixel do Facebook Ads, Pixel do TikTok, Pixel do LinkedIn Ads, Tags do Google Ads, Eventos do Analytics e Google Search Console. Em WordPress, instalação completa. Em outras plataformas, entrega dos códigos para implantação com desenvolvedor. Relatório final comprovando cada implantação.",
    short_description:
      "Instale e configure todos os pixels e tags do seu site — rastreie acessos e conversões com precisão em 9 dias úteis.",
    category: "Performance e Anúncios Patrocinados",
    tags: JSON.stringify([
      "Monitoramento",
      "Métricas",
      "Google Analytics",
      "Pixel",
      "Tags",
      "Relatórios",
      "Análise de dados",
      "Rastreamento",
      "Tagueamento",
      "Google Console",
      "Data Studio",
      "Looker Studio",
      "Google ADS",
      "Meta ADS",
      "Linkedin ADS",
      "Tiktok ADS",
      "Youtube ADS",
    ]),
    base_price: 272.16,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/data-analytics.jpg",
    demonstrations: JSON.stringify([
      "/images/products/data-analytics.jpg",
      "/images/products/data-analytics-portfolio-01.jpg",
      "/images/products/data-analytics-portfolio-02.jpg",
      "/images/products/data-analytics-portfolio-03.jpg",
      "/images/products/data-analytics-portfolio-04.jpg",
      "/images/products/data-analytics-portfolio-05.jpg",
      "/images/products/data-analytics-portfolio-06.jpg",
    ]),
    completion_time: "9 dias úteis",
    metadata: JSON.stringify(dataAnalyticsMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-26T09:00:00Z",
    variations: [
      {
        id: "PA0004-V01",
        name: "Configuração de Data Analytics",
        description:
          "Verificação de acessos, instalação e configuração completa de tags e pixels conforme briefing, testes de validação, entrega do documento DTAN-DOC-ENTREGA e remoção de acessos.",
        price: 272.16,
        price_modifier: 0,
        deadline_days: 9,
        scope_description:
          "Configuração única: verificação de acessos + GTM + Analytics + pixels de anúncios + eventos + Search Console (conforme briefing) + entrega de documento + remoção de acessos",
        features: JSON.stringify([
          "Instalação do Google Tag Manager (WordPress) ou documento de implantação para outras plataformas",
          "Configuração do Google Analytics 4 com eventos de pageview",
          "Instalação de pixels de anúncios (Meta, TikTok, LinkedIn, Google Ads — conforme briefing)",
          "Configuração de eventos e conversões personalizados conforme metas do briefing",
          "Verificação e configuração do Google Search Console",
          "Relatório de entrega (DTAN-DOC-ENTREGA) com prints de cada validação",
          "Remoção de todos os acessos compartilhados ao final da tarefa",
          "Até 6h de execução em até 9 dias úteis",
        ]),
        sort_order: 1,
        is_active: true,
      },
    ],
    addons: [],
    status: "active",
    price: 272.16,
    unit: "avulso",
    sku: "PA0004",
  },

  // ─── PA0005 — Análise de Usabilidade UX ─────────────────────────────────
  {
    id: "PA0005",
    name: "Análise de Usabilidade UX",
    description:
      "Análise abrangente de usabilidade e performance das páginas do seu site: velocidade de carregamento (Google PageSpeed Insights), diagnóstico de navegação, verificação funcional de todos os botões e links, diagnóstico de tagueamento (GA4, GTM, pixels de anúncios) e relatório completo PA0005-REL-UX com evidências, tabela de erros e recomendações priorizadas por impacto.",
    short_description:
      "Análise completa de usabilidade: velocidade, links, botões e tagueamento — relatório com evidências em até 7 dias úteis.",
    category: "Performance e Anúncios Patrocinados",
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
    base_price: 90.72,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/ux-analysis.svg",
    demonstrations: JSON.stringify([
      "/images/products/ux-analysis.svg",
      "/images/products/ux-analysis-portfolio-01.svg",
      "/images/products/ux-analysis-portfolio-02.svg",
      "/images/products/ux-analysis-portfolio-03.svg",
    ]),
    completion_time: "7 dias úteis",
    metadata: JSON.stringify(uxAnalysisMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-25T09:00:00Z",
    variations: [
      {
        id: "PA0005-V01",
        name: "Até 5 páginas",
        description:
          "Análise de usabilidade completa em até 5 páginas: velocidade, compatibilidade mobile, links, botões, checkout, contraste, menu, imagens, SSL e tagueamento — relatório com prints editados.",
        price: 90.72,
        price_modifier: 0,
        deadline_days: 5,
        scope_description:
          "Análise de até 5 páginas seguindo o checklist padrão: velocidade no PageSpeed e GTmetrix, compatibilidade mobile, links quebrados, botões, checkout, contraste, localização de botões, menu, imagens, SSL e tagueamento do Facebook e Google.",
        features: JSON.stringify([
          "Até 5 páginas analisadas",
          "Velocidade: PageSpeed e GTmetrix",
          "Compatibilidade mobile",
          "Links, botões e checkout",
          "Contraste, menu e imagens",
          "SSL e tagueamento (Facebook e Google)",
          "Relatório com prints editados e marcações",
          "Prazo: 5 dias úteis",
        ]),
        sort_order: 1,
        is_active: true,
      },
      {
        id: "PA0005-V02",
        name: "Até 10 páginas",
        description:
          "Análise de usabilidade completa em até 10 páginas: velocidade, compatibilidade mobile, links, botões, checkout, contraste, menu, imagens, SSL e tagueamento — relatório com prints editados.",
        price: 136.08,
        price_modifier: 0,
        deadline_days: 5,
        scope_description:
          "Análise de até 10 páginas seguindo o checklist padrão: velocidade no PageSpeed e GTmetrix, compatibilidade mobile, links quebrados, botões, checkout, contraste, localização de botões, menu, imagens, SSL e tagueamento do Facebook e Google.",
        features: JSON.stringify([
          "Até 10 páginas analisadas",
          "Velocidade: PageSpeed e GTmetrix",
          "Compatibilidade mobile",
          "Links, botões e checkout",
          "Contraste, menu e imagens",
          "SSL e tagueamento (Facebook e Google)",
          "Relatório com prints editados e marcações",
          "Prazo: 5 dias úteis",
        ]),
        sort_order: 2,
        is_active: true,
      },
      {
        id: "PA0005-V03",
        name: "Até 20 páginas",
        description:
          "Análise de usabilidade completa em até 20 páginas: velocidade, compatibilidade mobile, links, botões, checkout, contraste, menu, imagens, SSL e tagueamento — relatório com prints editados.",
        price: 181.44,
        price_modifier: 0,
        deadline_days: 6,
        scope_description:
          "Análise de até 20 páginas seguindo o checklist padrão: velocidade no PageSpeed e GTmetrix, compatibilidade mobile, links quebrados, botões, checkout, contraste, localização de botões, menu, imagens, SSL e tagueamento do Facebook e Google.",
        features: JSON.stringify([
          "Até 20 páginas analisadas",
          "Velocidade: PageSpeed e GTmetrix",
          "Compatibilidade mobile",
          "Links, botões e checkout",
          "Contraste, menu e imagens",
          "SSL e tagueamento (Facebook e Google)",
          "Relatório com prints editados e marcações",
          "Prazo: 6 dias úteis",
        ]),
        sort_order: 3,
        is_active: true,
      },
      {
        id: "PA0005-V04",
        name: "Até 50 páginas",
        description:
          "Análise de usabilidade completa em até 50 páginas: velocidade, compatibilidade mobile, links, botões, checkout, contraste, menu, imagens, SSL e tagueamento — relatório com prints editados.",
        price: 317.52,
        price_modifier: 0,
        deadline_days: 7,
        scope_description:
          "Análise de até 50 páginas seguindo o checklist padrão: velocidade no PageSpeed e GTmetrix, compatibilidade mobile, links quebrados, botões, checkout, contraste, localização de botões, menu, imagens, SSL e tagueamento do Facebook e Google.",
        features: JSON.stringify([
          "Até 50 páginas analisadas",
          "Velocidade: PageSpeed e GTmetrix",
          "Compatibilidade mobile",
          "Links, botões e checkout",
          "Contraste, menu e imagens",
          "SSL e tagueamento (Facebook e Google)",
          "Relatório com prints editados e marcações",
          "Prazo: 7 dias úteis",
        ]),
        sort_order: 4,
        is_active: true,
      },
    ],
    addons: [],
    status: "active",
    price: 90.72,
    unit: "avulso",
    sku: "PA0005",
  },

  // ─── DC0001 — Layout de Redes Sociais ──────────────────────────────────
  {
    id: "DC0001",
    name: "Layout de Redes Sociais",
    description:
      "Criação de layout para redes sociais selecionadas, fornecendo capa e perfil em alta definição com medidas exatas, design coerente entre si e com a marca, e entrega com mockups para melhor visualização.",
    short_description:
      "Layout profissional de perfil e capa para até 3 redes sociais, entregue em alta definição em até 2 dias úteis.",
    category: "Design e Criação",
    tags: JSON.stringify([
      "Social Media",
      "Photoshop",
      "Redes sociais",
      "Design gráfico",
      "Mídias sociais",
      "Imagens para redes sociais",
      "Capa",
      "Perfil",
      "LinkedIn",
      "Instagram",
      "Tiktok",
      "Facebook",
      "Google meu negócio",
      "Redes",
    ]),
    base_price: 90.72,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/layout-redes-sociais.svg",
    demonstrations: JSON.stringify([
      "/images/products/layout-redes-sociais.svg",
      "/images/products/layout-redes-sociais-portfolio-01.svg",
      "/images/products/layout-redes-sociais-portfolio-02.svg",
      "/images/products/layout-redes-sociais-portfolio-03.svg",
    ]),
    completion_time: "2 dias úteis",
    metadata: JSON.stringify(layoutRedesSociaisMeta),
    is_active: true,
    created_at: "2026-04-27T09:00:00Z",
    updated_at: "2026-04-27T09:00:00Z",
    variations: [],
    addons: [],
    status: "active",
    price: 90.72,
    unit: "avulso",
    sku: "DC0001",
  },

  // ─── DC0002 — Criativos Mídia Display Estático ──────────────────────────
  {
    id: "DC0002",
    name: "Criativos Mídia Display Estático",
    description:
      "Criação de mídia display estática para produção de banners e conteúdo criativo, adaptado para diversos formatos e plataformas. Entrega em .zip com arquivos abertos em .psd e fechados em .png.",
    short_description:
      "Banners estáticos profissionais para mídia display, em todos os formatos solicitados, com arquivos abertos para edição futura — entregues em até 3 dias úteis.",
    category: "Design e Criação",
    tags: JSON.stringify(["Display", "Criativos", "PNG", "Layout"]),
    base_price: 325.08,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/criativos-display.svg",
    demonstrations: JSON.stringify([
      "/images/products/criativos-display.svg",
      "/images/products/criativos-display-portfolio-01.svg",
      "/images/products/criativos-display-portfolio-02.svg",
      "/images/products/criativos-display-portfolio-03.svg",
    ]),
    completion_time: "3 dias úteis",
    metadata: JSON.stringify(criativosMidiaDisplayMeta),
    is_active: true,
    created_at: "2026-04-27T09:00:00Z",
    updated_at: "2026-04-27T09:00:00Z",
    variations: [],
    addons: [],
    status: "active",
    price: 325.08,
    unit: "avulso",
    sku: "DC0002",
  },

  // ─── DC0003 — Tratamento de até 10 Imagens ──────────────────────────────
  {
    id: "DC0003",
    name: "Tratamento de até 10 Imagens",
    description:
      "Tratamento profissional de até 10 imagens com correção de exposição, cores, ruído, nitidez e imperfeições. Entrega em .png com arquivos abertos em .psd e .xmp.",
    short_description:
      "Tratamento completo de até 10 imagens — limpeza, correção de cores, nitidez e imperfeições, prontas para qualquer mídia em até 3 dias úteis.",
    category: "Design e Criação",
    tags: JSON.stringify([
      "Photoshop",
      "Tratamento de imagens",
      "Fotografia",
      "Edição de imagens",
      "Colorização",
      "Nitidez",
      "Lightroom",
      "Manipulação de imagens",
      "Correção de imagens",
      "Xmp",
      "RAW",
    ]),
    base_price: 181.44,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/tratamento-imagens.jpg",
    demonstrations: JSON.stringify([
      "/images/products/tratamento-imagens.jpg",
      "/images/products/tratamento-imagens-portfolio-01.jpg",
      "/images/products/tratamento-imagens-portfolio-02.jpg",
      "/images/products/tratamento-imagens-portfolio-03.jpg",
      "/images/products/tratamento-imagens-portfolio-04.jpg",
      "/images/products/tratamento-imagens-portfolio-05.jpg",
      "/images/products/tratamento-imagens-portfolio-06.jpg",
      "/images/products/tratamento-imagens-portfolio-07.jpg",
      "/images/products/tratamento-imagens-portfolio-08.jpg",
      "/images/products/tratamento-imagens-portfolio-09.jpg",
    ]),
    completion_time: "3 dias úteis",
    metadata: JSON.stringify(tratamentoImagensMeta),
    is_active: true,
    created_at: "2026-04-27T09:00:00Z",
    updated_at: "2026-04-27T09:00:00Z",
    variations: [],
    addons: [],
    status: "active",
    price: 181.44,
    unit: "avulso",
    sku: "DC0003",
  },

  // ─── DC0004 — Papelaria (3 unidades) ────────────────────────────────────
  {
    id: "DC0004",
    name: "Papelaria (3 unidades)",
    description:
      "Criação de até 3 peças de papelaria profissional com identidade visual coerente com a marca do cliente: papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, crachá e muito mais. Entrega em mockup, PDF CMYK pronto para gráfica e arquivo AI editável.",
    short_description:
      "Até 3 peças de papelaria com design profissional — mockup, PDF para gráfica e arquivo AI editável em 3 dias úteis.",
    category: "Design e Criação",
    tags: JSON.stringify([
      "Papelaria",
      "Identidade visual",
      "Material promocional",
      "Design gráfico",
      "Papel timbrado",
      "Bloco de notas",
      "Receituário",
      "Sacola",
      "Embalagem",
      "Etiqueta",
      "Crachá",
      "Convite",
      "Cartaz",
      "Marca página",
      "Certificado",
      "Selo",
    ]),
    base_price: 181.44,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/papelaria.svg",
    demonstrations: JSON.stringify(["/images/products/papelaria.svg"]),
    completion_time: "3 dias úteis",
    metadata: JSON.stringify(papelariaMeta),
    is_active: true,
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-04-27T09:00:00Z",
    variations: [],
    addons: [],
    status: "active",
    price: 181.44,
    unit: "avulso",
    sku: "DC0004",
  },

  // ─── DC0005 — Layout de Website ─────────────────────────────────────────
  {
    id: "DC0005",
    name: "Layout de Website",
    description:
      "Criação do layout visual de website com identidade visual da marca aplicada, desenvolvido por especialista em web design. Entrega em PDF para aprovação, arquivo aberto em PSD ou Figma com imagens e fontes incluídas, e versão mobile totalmente adaptada.",
    short_description:
      "Layout profissional de website com versão desktop e mobile — arquivos abertos PSD/Figma entregues em até 7, 9 ou 15 dias úteis conforme o número de páginas.",
    category: "Design e Criação",
    tags: JSON.stringify([
      "Website",
      "Web design",
      "Design responsivo",
      "Layout de website",
      "UX",
      "Site",
      "Página Web",
      "Hot site",
      "Figma",
      "PSD",
      "Photoshop",
      "Mobile",
      "Landing page",
    ]),
    base_price: 453.6,
    complexity: "intermediate",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/layout-website.jpg",
    demonstrations: JSON.stringify(["/images/products/layout-website.jpg"]),
    completion_time: "7 dias úteis",
    metadata: JSON.stringify(layoutWebsiteMeta),
    is_active: true,
    created_at: "2026-04-28T09:00:00Z",
    updated_at: "2026-04-28T09:00:00Z",
    variations: [
      {
        id: "DC0005-V01",
        name: "Até 5 páginas",
        description:
          "Layout de website com até 5 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
        price: 453.6,
        price_modifier: 0,
        deadline_days: 7,
        scope_description:
          "Layout de até 5 páginas (desktop + mobile adaptado)",
        features: JSON.stringify([
          "Até 5 páginas de layout (desktop + mobile)",
          "Formato padrão 1920×1080px",
          "Versão mobile adaptada (390×844px)",
          "Entrega em PDF para aprovação",
          "Arquivo aberto PSD ou Figma com imagens e fontes",
          "Prazo: 7 dias úteis",
        ]),
        sort_order: 1,
        is_active: true,
      },
      {
        id: "DC0005-V02",
        name: "Até 10 páginas",
        description:
          "Layout de website com até 10 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
        price: 635.04,
        price_modifier: 0,
        deadline_days: 9,
        scope_description:
          "Layout de até 10 páginas (desktop + mobile adaptado)",
        features: JSON.stringify([
          "Até 10 páginas de layout (desktop + mobile)",
          "Formato padrão 1920×1080px",
          "Versão mobile adaptada (390×844px)",
          "Entrega em PDF para aprovação",
          "Arquivo aberto PSD ou Figma com imagens e fontes",
          "Prazo: 9 dias úteis",
        ]),
        sort_order: 2,
        is_active: true,
      },
      {
        id: "DC0005-V03",
        name: "Até 20 páginas",
        description:
          "Layout de website com até 20 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
        price: 907.2,
        price_modifier: 0,
        deadline_days: 15,
        scope_description:
          "Layout de até 20 páginas (desktop + mobile adaptado)",
        features: JSON.stringify([
          "Até 20 páginas de layout (desktop + mobile)",
          "Formato padrão 1920×1080px",
          "Versão mobile adaptada (390×844px)",
          "Entrega em PDF para aprovação",
          "Arquivo aberto PSD ou Figma com imagens e fontes",
          "Prazo: 15 dias úteis",
        ]),
        sort_order: 3,
        is_active: true,
      },
    ],
    addons: [],
    status: "active",
    price: 453.6,
    unit: "avulso",
    sku: "DC0005",
  },

  // ─── DC0006 — Template para Criativos (5 unidades) ──────────────────────
  {
    id: "DC0006",
    name: "Template para Criativos (5 unidades)",
    description:
      "Criação de até 5 templates criativos com design profissional e identidade visual alinhada à marca, desenvolvidos em Canva, Photoshop ou Illustrator. Entrega em arquivo aberto para edição e em formato final para uso, em até 3 formatos diferentes.",
    short_description:
      "Até 5 templates criativos profissionais em Canva, Photoshop ou Illustrator — em até 3 formatos, com arquivos abertos para edição, entregues em até 4 dias úteis.",
    category: "Design e Criação",
    tags: JSON.stringify([
      "Photoshop",
      "Illustrator",
      "Canva",
      "Template",
      "Design gráfico",
      "Mídias sociais",
      "Modelo",
      "KV",
      "Mockup",
      "Redes sociais",
      "Postagens",
      "Publicações",
      "Card Post",
      "Post",
      "Criativo",
      "Criativos",
    ]),
    base_price: 226.8,
    complexity: "basic",
    visibility: JSON.stringify({
      company: true,
      agency: true,
      partner: false,
      inHouse: false,
    }),
    image: "/images/products/template-criativos.jpg",
    demonstrations: JSON.stringify([
      "/images/products/template-criativos.jpg",
      "/images/products/template-criativos-portfolio-01.jpg",
      "/images/products/template-criativos-portfolio-02.jpg",
      "/images/products/template-criativos-portfolio-03.jpg",
      "/images/products/template-criativos-portfolio-04.jpg",
      "/images/products/template-criativos-portfolio-05.jpg",
      "/images/products/template-criativos-portfolio-06.jpg",
    ]),
    completion_time: "4 dias úteis",
    metadata: JSON.stringify(templateCriativosMeta),
    is_active: true,
    created_at: "2024-04-30T09:00:00Z",
    updated_at: "2026-04-27T09:00:00Z",
    variations: [],
    addons: [],
    status: "active",
    price: 226.8,
    unit: "avulso",
    sku: "DC0006",
  },
];
