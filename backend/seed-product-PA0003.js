// seed-product-PA0003.js — Configuração de Google Negócios
// Idempotente: deleta variações/addons e recria. O product_id é fixo.
// Uso: node seed-product-PA0003.js
//
// ⚠ Este seed NÃO afeta pedidos/projetos existentes. O product_id (GNEG-0001)
//    permanece o mesmo, então históricos de contratação são preservados.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "GNEG-0001";

// ─── Metadata ────────────────────────────────────────────────────────────────
// Espelho fiel de dev-mocks/data/products.ts → googleNegociosMeta
// Se atualizar aqui, atualizar lá também (e vice-versa).

const googleNegociosMeta = {
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

  warnings: [
    {
      id: "W01",
      level: "critical",
      message:
        "Briefing incompleto bloqueia a execução. Campos obrigatórios faltantes resultam em solicitação ao cliente antes do início.",
    },
    {
      id: "W02",
      level: "critical",
      message:
        "Acesso obrigatório: mktperformance2023@gmail.com deve estar como Proprietário no Google Meu Negócio antes do início da E01. Sem esse acesso, a execução não pode começar.",
    },
    {
      id: "W03",
      level: "info",
      message:
        "Limite do serviço: até 10 posts e até 20 respostas a avaliações por contratação avulsa.",
    },
    {
      id: "W04",
      level: "warning",
      message:
        "Não criamos contas Google pelo cliente. Se a conta não existir, orientar o cliente a criar antes do início.",
    },
    {
      id: "W05",
      level: "warning",
      message:
        "Materiais visuais (fotos, logotipo) devem ser fornecidos pelo cliente. Não utilizamos imagens com direitos autorais de terceiros.",
    },
  ],

  accessInstructions: {
    email: "mktperformance2023@gmail.com",
    role: "Proprietário",
    platform: "Google Meu Negócio",
    steps: [
      "Acessar business.google.com e fazer login com a conta proprietária do negócio",
      "Ir em Configurações > Gerenciar usuários",
      "Clicar em 'Adicionar usuários'",
      "Inserir o e-mail: mktperformance2023@gmail.com",
      "Selecionar a função 'Proprietário' (não Gerente)",
      "Confirmar o convite",
    ],
    removalSteps: [
      "Acessar business.google.com e fazer login com a conta proprietária",
      "Ir em Configurações > Gerenciar usuários",
      "Localizar mktperformance2023@gmail.com na lista",
      "Remover o acesso e confirmar",
    ],
    note:
      "O acesso de Proprietário é necessário para todas as configurações. Acesso de Gerente não permite editar todas as seções.",
  },

  executionTerms: [
    "Nome do negócio: usar exclusivamente o nome real — sem palavras-chave, cidades ou qualificadores extras",
    "Categoria principal: selecionar com base na atividade principal — é o campo de maior impacto no ranqueamento",
    "Endereço: preencher exatamente como fornecido no briefing — inconsistências afetam o ranqueamento",
    "Horários: configurar todos os dias da semana conforme briefing, incluindo feriados se fornecido",
    "Fotos: fazer upload de todos os materiais recebidos — mínimo obrigatório: capa + logotipo/perfil",
    "Posts: máximo 10 por contratação, com CTA claro em cada post",
    "Respostas a avaliações: máximo 20 por contratação, personalizadas para cada caso usando modelos do briefing como base",
    "Dados não fornecidos no briefing: captar do site indicado e registrar o que foi captado",
    "Documento de entrega (PA0003-DOC-ENTREGA): obrigatório, com prints de todas as seções configuradas",
    "Remoção de acesso: executar somente após aprovação formal do cliente na etapa E02",
    "Qualquer dado duvidoso ou conflitante deve ser confirmado com o cliente antes de publicar",
  ],

  deliveryDocument: {
    templateName: "Documento de Entrega — Google Meu Negócio",
    templateCode: "PA0003-DOC-ENTREGA",
    requiredSections: [
      "Dados da empresa configurados (nome, endereço, telefone, site) — com print",
      "Horários de funcionamento configurados — com print",
      "Categoria principal e secundárias — com justificativa",
      "Atributos configurados — lista e print",
      "Fotos carregadas — prints de capa, perfil e galeria",
      "Posts publicados — prints de cada post",
      "Respostas a avaliações — prints das respostas enviadas",
    ],
    attachmentRequired: true,
    attachmentStage: "PA0003-E02",
    note:
      "Entrega sem o documento preenchido com prints não é aceita pela plataforma. O documento deve ser anexado antes de marcar a etapa E02 como concluída.",
  },

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
          "Perfis bem configurados aparecem com muito mais frequência em buscas locais como \"restaurante perto de mim\" ou \"[serviço] em [cidade]\" — geração orgânica de clientes sem investimento em anúncios.",
      },
      {
        title: "Visibilidade aprimorada",
        description:
          "Posts, fotos e informações atualizadas aumentam o alcance do perfil e sinalizam ao algoritmo do Google que o negócio está ativo — sem custo adicional.",
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
        title: "Insights valiosos",
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
  },

  baseFeatures: [
    "Verificação de acessos e análise de briefing com captação de dados do site (T01 — 0,5h)",
    "Dados, horários e contato configurados com informações precisas do negócio (T02a — 1h)",
    "Categoria, atributos, fotos, posts e respostas a avaliações (T02b — 1,5h)",
    "Documento de entrega (PA0003-DOC-ENTREGA) com prints de todas as seções",
    "Remoção de acessos e encerramento documentado (T03 — 0,5h)",
    "3 etapas de execução estruturadas: E01 → E03 (8 dias úteis totais)",
    "Execução por nômade habilitado — Especialidade Performance / Google",
  ],

  tasks: [
    {
      id: "PA0003-T01",
      name: "Verificação de Acessos e Análise do Briefing",
      description:
        "Análise do briefing, verificação do acesso ao Google Meu Negócio (mktperformance2023@gmail.com como Proprietário) e captação de dados complementares do site indicado.",
      taskCategory: "Planejamento",
      objective:
        "Garantir que todos os acessos, materiais e dados do negócio estão disponíveis antes de iniciar a configuração.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Verificar se mktperformance2023@gmail.com aparece como Proprietário antes de qualquer ação",
        "Se o acesso não estiver correto, acionar o líder — não iniciar configuração sem acesso de Proprietário",
        "Captar dados do site indicado no briefing para complementar informações faltantes",
        "Registrar quais dados foram captados do site e quais vieram diretamente do cliente",
      ],
      calculatedCost: 20,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T01-S01",
          name: "Análise do Briefing",
          description:
            "Ler o briefing completo, identificar campos faltantes e definir dados que serão captados no site.",
          order: 1,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Se o briefing estiver incompleto em campos críticos (endereço, telefone, horários), solicitar ao cliente antes de avançar.",
        },
        {
          id: "PA0003-T01-S02",
          name: "Verificação de Acesso + Captação do Site",
          description:
            "Confirmar acesso Proprietário no Google Meu Negócio e captar dados complementares do site indicado.",
          order: 2,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Documentar: (1) confirmação de acesso Proprietário, (2) lista de dados captados no site vs. briefing.",
        },
      ],
    },
    {
      id: "PA0003-T02",
      name: "Configuração Completa do Google Negócios",
      description:
        "Configuração de todos os dados do perfil: informações, horários, categoria, atributos, fotos, posts e respostas a avaliações. Finaliza com o preenchimento do documento de entrega (PA0003-DOC-ENTREGA) com prints de cada seção.",
      taskCategory: "Execução",
      objective:
        "Entregar o perfil Google Meu Negócio 100% configurado com documento de entrega completo.",
      dependencies: ["PA0003-T01"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Nome do negócio: usar apenas o nome real — sem palavras-chave extras (ex: 'Cafeteria Aroma', não 'Cafeteria Aroma melhor café Curitiba')",
        "Categoria principal: escolher com cuidado — é o fator mais importante para ranqueamento no Maps",
        "Horários: preencher exatamente conforme briefing, incluindo domingos e feriados se fornecido",
        "Fotos: fazer upload de todos os materiais enviados (capa, perfil, galeria). Mínimo obrigatório: capa + logotipo",
        "Posts: máximo 10 posts, cada um com CTA claro. Usar materiais e modelos do briefing",
        "Avaliações: máximo 20 respostas, usando modelos do briefing como base e adaptando para cada caso",
        "Documento de entrega: preencher PA0003-DOC-ENTREGA com print de cada seção configurada — entrega sem documento não é aceita",
      ],
      calculatedCost: 96,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T02-S01",
          name: "Dados, Horários e Contatos",
          description:
            "Configurar nome, endereço, telefone, site, horários de funcionamento e meios de contato.",
          order: 1,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 24,
          internalGuidance:
            "Conferir cada dado com o briefing. NAP deve ser consistente com o site.",
        },
        {
          id: "PA0003-T02-S02",
          name: "Categoria, Atributos e Fotos",
          description:
            "Definir categoria principal e secundárias, configurar atributos relevantes e fazer upload de todos os materiais visuais.",
          order: 2,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 24,
          internalGuidance:
            "Registrar categorias escolhidas com justificativa breve. Atributos: marcar todos os relevantes disponíveis.",
        },
        {
          id: "PA0003-T02-S03",
          name: "Posts e Respostas a Avaliações",
          description:
            "Criar e publicar até 10 posts com CTA. Redigir e publicar respostas a até 20 avaliações usando modelos do briefing.",
          order: 3,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 24,
          internalGuidance:
            "Posts: variar tipos (novidade, oferta, informativo). Respostas negativas: profissional, empático, oferece solução.",
        },
        {
          id: "PA0003-T02-S04",
          name: "Preenchimento do Documento de Entrega",
          description:
            "Preencher o documento PA0003-DOC-ENTREGA com prints de todas as seções configuradas e encaminhar para aprovação.",
          order: 4,
          estimatedHours: 0.5,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "pleno",
          calculatedCost: 24,
          internalGuidance:
            "Documento obrigatório. Seções: dados, horários, fotos carregadas, categoria, posts e avaliações respondidas.",
        },
      ],
    },
    {
      id: "PA0003-T03",
      name: "Remoção de Acessos e Encerramento",
      description:
        "Após aprovação do cliente, remover mktperformance2023@gmail.com do perfil e registrar o encerramento no sistema.",
      taskCategory: "Encerramento",
      objective:
        "Garantir que a conta de execução não permanece com acesso ao perfil do cliente após a conclusão do projeto.",
      dependencies: ["PA0003-T02"],
      canRunInParallel: false,
      requiresAccess: true,
      executionRules: [
        "Somente remover o acesso após aprovação formal do cliente na etapa E02",
        "Registrar data e hora da remoção no sistema",
        "Confirmar que mktperformance2023@gmail.com não aparece mais como colaborador/proprietário",
      ],
      calculatedCost: 10,
      questionnaire: null,
      steps: [
        {
          id: "PA0003-T03-S01",
          name: "Remoção de Acesso e Registro de Encerramento",
          description:
            "Remover mktperformance2023@gmail.com do perfil Google Meu Negócio e registrar encerramento no sistema com print de confirmação.",
          order: 1,
          estimatedHours: 0.25,
          specialtyId: 6,
          specialty: 6,
          experienceLevel: "junior",
          calculatedCost: 10,
          internalGuidance:
            "Print de confirmação da remoção obrigatório. Registrar no sistema antes de marcar T03 como concluída.",
        },
      ],
    },
  ],

  stages: [
    {
      id: "PA0003-E01",
      code: "PA0003-E01",
      number: 1,
      name: "Verificação de Acessos",
      description:
        "Análise do briefing, confirmação dos materiais e verificação do acesso de Proprietário no perfil Google Meu Negócio.",
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
        "Confirmar acesso Proprietário antes de qualquer configuração. Sem acesso correto, não avançar.",
    },
    {
      id: "PA0003-E02",
      code: "PA0003-E02",
      number: 2,
      name: "Configuração de Google Negócios",
      description:
        "Configuração completa do perfil: dados, horários, categoria, atributos, fotos, posts, avaliações e documento de entrega.",
      category: "Execução",
      deliveryDeadlineDays: 5,
      executionDeadlineDays: 3,
      approvalDeadlineDays: 10,
      executionHours: 2,
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
        "Entrega somente com PA0003-DOC-ENTREGA preenchido com prints de todas as seções. Aprovação libera E03.",
    },
    {
      id: "PA0003-E03",
      code: "PA0003-E03",
      number: 3,
      name: "Remoção de Acessos",
      description:
        "Remoção de mktperformance2023@gmail.com do perfil e registro do encerramento no sistema.",
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
        "Somente após aprovação de E02. Registrar print de confirmação da remoção de acesso.",
    },
  ],

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
        aiContext: "E-mail Google da conta proprietária do perfil Google Meu Negócio",
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
        aiContext: "Informações gerais do negócio: nome, categoria, tipo de atividade, produtos/serviços principais",
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
        aiContext: "Endereço físico completo: rua, número, complemento, bairro, cidade, estado, CEP",
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
        aiContext: "URL do site ou página principal do negócio (Instagram, Facebook, etc.)",
        placeholder: "Ex: https://seusite.com.br ou https://instagram.com/seunegocio",
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
        aiContext: "Descrição da empresa para o perfil Google Meu Negócio (até 750 caracteres)",
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
        aiContext: "Número(s) de telefone principal e secundário do negócio com DDD",
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
        aiContext: "Texto modelo ou orientação para responder avaliações positivas dos clientes",
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
        aiContext: "Texto modelo ou orientação para responder avaliações com sugestões de melhoria",
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
        aiContext: "Texto modelo ou orientação para responder avaliações negativas ou reclamações",
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
        aiContext: "Observações adicionais e links de referência (redes sociais, outros perfis, site com informações, etc.)",
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
        aiContext: "Lista dos materiais enviados (fotos, logotipos, cardápio, catálogo, etc.) e onde foram enviados",
        placeholder:
          "Ex: Logotipo enviado no chat | 5 fotos do ambiente | Cardápio em PDF enviado | Não tenho foto de capa ainda.",
        warning:
          "Envie todos os materiais pelo chat do projeto antes do início. Fotos mínimas: capa (horizontal) e logotipo/perfil.",
      },
    ],
  },

  variationsInternal: {
    "GNEG-V01": {
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

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("▶ Seeding PA0003 — Configuração de Google Negócios...");

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
      name: "Configuração de Google Negócios",
      description:
        "Configuração e otimização completa do perfil Google Meu Negócio: informações do negócio, fotos, cardápio ou catálogo, publicação de até 10 posts e respostas a até 20 avaliações. Conteúdo capturado a partir do site e dos materiais enviados pelo cliente.",
      short_description:
        "Seu negócio configurado e otimizado no Google e Google Maps com perfil verificado, posts e respostas a avaliações.",
      category: "marketing",
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
      created_at: new Date("2026-01-01T09:00:00Z"),
      updated_at: new Date(),
    },
    update: {
      name: "Configuração de Google Negócios",
      description:
        "Configuração e otimização completa do perfil Google Meu Negócio: informações do negócio, fotos, cardápio ou catálogo, publicação de até 10 posts e respostas a até 20 avaliações. Conteúdo capturado a partir do site e dos materiais enviados pelo cliente.",
      short_description:
        "Seu negócio configurado e otimizado no Google e Google Maps com perfil verificado, posts e respostas a avaliações.",
      category: "marketing",
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
      updated_at: new Date(),
    },
  });
  console.log("  ✓ Produto GNEG-0001 upserted");

  // Variação única
  await p.productVariation.create({
    data: {
      id: "GNEG-V01",
      product_id: PRODUCT_ID,
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
  });
  console.log("  ✓ Variação GNEG-V01 criada");

  // Add-ons
  await p.productAddon.createMany({
    data: [
      {
        id: "GNEG-ADDON-01",
        product_id: PRODUCT_ID,
        name: "Posts Mensais (pacote com 10 posts)",
        description:
          "Criação e publicação de 10 novos posts mensais no perfil Google Meu Negócio.",
        price: 80,
        category: "extra",
      },
      {
        id: "GNEG-ADDON-02",
        product_id: PRODUCT_ID,
        name: "Gestão de Avaliações Mensal",
        description:
          "Monitoramento e resposta a novas avaliações ao longo do mês (até 30 respostas).",
        price: 60,
        category: "extra",
      },
    ],
  });
  console.log("  ✓ Add-ons criados (GNEG-ADDON-01, GNEG-ADDON-02)");

  console.log("✅ PA0003 — Configuração de Google Negócios seeded com sucesso.");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed PA0003:", e.message);
  p.$disconnect();
  process.exit(1);
});
