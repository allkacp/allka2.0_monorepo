// seed-product-PA0004.js — Configuração de Data Analytics
// Idempotente: deleta variações/addons e recria. O product_id é fixo.
// Uso: node seed-product-PA0004.js
//
// ⚠ Este seed NÃO afeta pedidos/projetos existentes. O product_id (DTAN-0001)
//    permanece o mesmo, então históricos de contratação são preservados.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "DTAN-0001";

// ─── Metadata ────────────────────────────────────────────────────────────────
// Espelho fiel de dev-mocks/data/products.ts → dataAnalyticsMeta
// Se atualizar aqui, atualizar lá também (e vice-versa).

const dataAnalyticsMeta = {
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
        label: "Compartilhar como administrador com mktperformance2023@gmail.com",
        description:
          "Adicione o e-mail mktperformance2023@gmail.com como administrador (ou com controle total) no Google Tag Manager e em todas as contas de anúncio compartilhadas. Os acessos são removidos ao final da tarefa, na Etapa 3.",
      },
    ],
    note:
      "Compartilhe apenas as contas das plataformas selecionadas no briefing. Os acessos são removidos na E03 — Remoção de Acessos.",
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
    note:
      "Entrega sem o documento preenchido com evidências não é aceita pela plataforma. Prints de cada ferramenta de diagnóstico são obrigatórios.",
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
          "O especialista instala e configura tudo em até 9 dias úteis. Você acompanha pelo painel e recebe o documento de entrega ao final.",
      },
    ],
    faq: [
      {
        question: "Meu site não é WordPress. Vocês conseguem instalar assim mesmo?",
        answer:
          "Sim, mas de forma diferente. Para sites fora do WordPress (Wix, Shopify, Webflow, etc.), entregamos os códigos das tags e pixels com instruções detalhadas para implantação pelo seu desenvolvedor. A instalação direta é realizada apenas em WordPress.",
      },
      {
        question: "Já tenho o Google Tag Manager instalado no site. Precisa instalar de novo?",
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
            "Verificar se já existe contêiner GTM antes de criar um novo. Se o site não for WordPress e não tiver GTM, elaborar documento com código para o desenvolvedor do cliente.",
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
            "Eventos: criar triggers com base em cliques ou envio de formulários. Search Console: submeter sitemap se disponível. Testar cada tag com Tag Assistant e Pixel Helper antes de avançar.",
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
        "Leitura do briefing, mapeamento das plataformas solicitadas e confirmação de todos os acessos necessários para a execução.",
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
        "Não avançar para E02 sem confirmar todos os acessos necessários. Registrar o que está faltando e solicitar ao cliente antes de iniciar.",
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
      executionHours: 4.5,
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
        "Publicar o contêiner GTM ao final das instalações. Não entregar sem o documento DTAN-DOC-ENTREGA completo com prints de cada validação.",
    },
    {
      id: "DTAN-E03",
      code: "DTAN-E03",
      number: 3,
      name: "Remoção de Acessos",
      description:
        "Remoção do e-mail mktperformance2023@gmail.com de todas as plataformas compartilhadas pelo cliente durante a execução da tarefa.",
      category: "Encerramento",
      deliveryDeadlineDays: 8,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 1,
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
        "Remover um acesso por vez e confirmar cada remoção. Orientar o cliente a trocar a senha do painel do site após a conclusão.",
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
        question: "Qual é o objetivo principal do uso de data analytics para a sua empresa?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Objetivo",
        briefingKey: "objetivoPrincipal",
        aiContext: "Objetivo estratégico do cliente ao implementar analytics: mensurar campanhas, monitorar conversões, entender comportamento do usuário, etc.",
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
        aiContext: "Lista de plataformas de analytics e anúncios para configurar",
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
        aiContext: "Identificadores das contas de anúncio do cliente nas plataformas selecionadas: IDs de conta, e-mails associados, nomes de Business Manager, etc.",
        placeholder:
          "Ex: Google Analytics — propriedade: meunegocio.com.br | Google Ads — ID: 123-456-7890 | Meta Business Manager — ID: 9876543210 | TikTok Ads — e-mail: marketing@empresa.com",
        warning:
          "Informe apenas as contas das plataformas selecionadas na pergunta anterior. Inclua os IDs ou e-mails para facilitar a localização no compartilhamento de acessos.",
      },
      {
        id: "DTAN-Q04",
        question: "Quais são as metas de conversão que você deseja rastrear com o analytics?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Metas de Conversão",
        briefingKey: "metasConversao",
        aiContext: "Eventos e conversões que o cliente quer monitorar: ações do usuário, envios de formulário, cliques em botões, compras, visualizações de páginas específicas",
        placeholder:
          "Ex: Envio do formulário de contato | Clique no botão 'Solicitar Orçamento' | Acesso à página /obrigado | Compra finalizada no checkout | Clique no número de WhatsApp",
        warning:
          "Seja específico. Cada meta de conversão se torna uma regra de disparo (trigger) no GTM. Quanto mais detalhado, mais precisa será a configuração.",
      },
      {
        id: "DTAN-Q05",
        question: "Quais páginas web necessitam da implantação de tags e pixels?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Páginas",
        briefingKey: "paginasImplantacao",
        aiContext: "Páginas ou seções do site onde as tags e pixels devem ser instalados ou disparar eventos específicos",
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
        aiContext: "Plataforma do site e nível de suporte para instalação: WordPress (instalação completa), GTM já instalado (configuração direta), ou outra plataforma (entrega de código)",
        placeholder: "Selecione",
        warning:
          "A plataforma define o método de instalação. WordPress com acesso admin = instalação completa. GTM já instalado = configuramos no contêiner. Outras plataformas = entregamos os códigos com instruções.",
      },
    ],
  },

  variationsInternal: {
    "DTAN-V01": {
      label: "Configuração de Data Analytics",
      code: "PA0004-V01",
      publicDeadlineLabel: "9 dias úteis",
      executionHours: 6,
    },
  },

  portfolioImages: [
    {
      id: "dtan-img-01",
      url: "/images/products/data-analytics.svg",
      title: "Visão Geral do Produto",
      description: "Configuração de Data Analytics — tags e pixels instalados",
      isMain: true,
      sortOrder: 0,
    },
    {
      id: "dtan-img-02",
      url: "/images/products/data-analytics-portfolio-01.svg",
      title: "Google Tag Manager Configurado",
      description: "Contêiner GTM com tags organizadas e publicadas",
      isMain: false,
      sortOrder: 1,
    },
    {
      id: "dtan-img-03",
      url: "/images/products/data-analytics-portfolio-02.svg",
      title: "GA4 e Pixels Ativos",
      description: "Analytics e pixels de anúncios validados com ferramentas de diagnóstico",
      isMain: false,
      sortOrder: 2,
    },
    {
      id: "dtan-img-04",
      url: "/images/products/data-analytics-portfolio-03.svg",
      title: "Relatório de Entrega",
      description: "Documento DTAN-DOC-ENTREGA com evidências de cada implantação",
      isMain: false,
      sortOrder: 3,
    },
  ],
};

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("▶ Seeding PA0004 — Configuração de Data Analytics...");

  // Limpar relações existentes (idempotente)
  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  // Upsert do produto principal
  await p.product.upsert({
    where: { id: PRODUCT_ID },
    create: {
      id: PRODUCT_ID,
      name: "Configuração de Data Analytics",
      description:
        "Instalação, configuração e testes de tags e pixels de rastreamento: Google Tag Manager, Google Analytics 4, Pixel do Facebook Ads, Pixel do TikTok, Pixel do LinkedIn Ads, Tags do Google Ads, Eventos do Analytics e Google Search Console. Em WordPress, instalação completa. Em outras plataformas, entrega dos códigos para implantação com desenvolvedor. Relatório final comprovando cada implantação.",
      short_description:
        "Instale e configure todos os pixels e tags do seu site — rastreie acessos e conversões com precisão em 9 dias úteis.",
      category: "marketing",
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
      image: "/images/products/data-analytics.svg",
      demonstrations: JSON.stringify([
        "/images/products/data-analytics.svg",
        "/images/products/data-analytics-portfolio-01.svg",
        "/images/products/data-analytics-portfolio-02.svg",
        "/images/products/data-analytics-portfolio-03.svg",
      ]),
      completion_time: "9 dias úteis",
      metadata: JSON.stringify(dataAnalyticsMeta),
      is_active: true,
      created_at: new Date("2026-01-01T09:00:00Z"),
      updated_at: new Date(),
    },
    update: {
      name: "Configuração de Data Analytics",
      description:
        "Instalação, configuração e testes de tags e pixels de rastreamento: Google Tag Manager, Google Analytics 4, Pixel do Facebook Ads, Pixel do TikTok, Pixel do LinkedIn Ads, Tags do Google Ads, Eventos do Analytics e Google Search Console. Em WordPress, instalação completa. Em outras plataformas, entrega dos códigos para implantação com desenvolvedor. Relatório final comprovando cada implantação.",
      short_description:
        "Instale e configure todos os pixels e tags do seu site — rastreie acessos e conversões com precisão em 9 dias úteis.",
      category: "marketing",
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
      image: "/images/products/data-analytics.svg",
      demonstrations: JSON.stringify([
        "/images/products/data-analytics.svg",
        "/images/products/data-analytics-portfolio-01.svg",
        "/images/products/data-analytics-portfolio-02.svg",
        "/images/products/data-analytics-portfolio-03.svg",
      ]),
      completion_time: "9 dias úteis",
      metadata: JSON.stringify(dataAnalyticsMeta),
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log("  ✓ Produto DTAN-0001 upserted");

  // Variação única
  await p.productVariation.create({
    data: {
      id: "DTAN-V01",
      product_id: PRODUCT_ID,
      name: "Configuração de Data Analytics",
      description:
        "Instalação e configuração completa de tags e pixels selecionados no briefing, com testes de validação e relatório de entrega.",
      price: 272.16,
      price_modifier: 0,
      deadline_days: 9,
      scope_description:
        "Configuração única: GTM + Analytics + pixels de anúncio + eventos e conversões + Search Console + documento de entrega (conforme briefing)",
      features: JSON.stringify([
        "Instalação do Google Tag Manager (WordPress via plugin ou código para outras plataformas)",
        "Configuração do Google Analytics 4 com eventos básicos de pageview",
        "Instalação de pixels de anúncio (Meta, TikTok, LinkedIn, Google Ads — conforme briefing)",
        "Configuração de eventos e conversões personalizados conforme briefing",
        "Verificação e configuração do Google Search Console",
        "Testes de validação com Tag Assistant e Pixel Helper",
        "Documento de entrega (DTAN-DOC-ENTREGA) com prints de cada implantação",
        "Remoção de acessos ao final da tarefa",
        "Até 6h de execução em até 9 dias úteis",
      ]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação DTAN-V01 criada");

  console.log("✅ PA0004 — Configuração de Data Analytics seeded com sucesso.");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed PA0004:", e.message);
  p.$disconnect();
  process.exit(1);
});
