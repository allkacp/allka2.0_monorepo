// seed-product-DC0004.js — Papelaria (3 unidades)
// Idempotente: deleta variações/addons e recria. O product_id é fixo.
// Uso: node backend/seed-product-DC0004.js
//
// ⚠ Este seed NÃO afeta pedidos/projetos existentes. O product_id (DC0004)
//    permanece o mesmo, então históricos de contratação são preservados.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "DC0004";

// ─── Metadata ────────────────────────────────────────────────────────────────
// Espelho fiel de dev-mocks/data/products.ts → papelariaMeta
// Se atualizar aqui, atualizar lá também (e vice-versa).

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
      "Criar até 3 peças de papelaria com design profissional, identidade visual coerente com a marca do cliente — entrega em .PNG com mockup para aprovação, PDF em alta resolução para impressão e arquivo AI editável para edições futuras.",
    creator: "Consultor/Agência",
    responsible: "Líder de Web",
    executor: "Nômade Especialista",
    requiresAccess: false,
    itemLimit: 1,
    totalDeadlineDays: 3,
    totalDeadlineNote:
      "3 dias úteis: E01 (48h execução + aprovação do cliente) + E02 (entrega do arquivo final em ZIP) = 3 dias úteis.",
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
    "Criação de até 3 peças de papelaria com diagramação profissional (T01 — 4h)",
    "Identidade visual coerente com a marca do cliente",
    "Entrega das artes em mockup para visualização",
    "Arquivo PDF pronto para impressão em gráfica",
    "Arquivo AI aberto para edições futuras (T02 — 2h)",
    "2 etapas de execução: E01 Criação → E02 Entrega Final",
    "Prazo: 3 dias úteis",
    "Execução por nômade habilitado — Especialidade Design Gráfico",
  ],

  tasks: [
    {
      id: "DC0004-T01",
      name: "Criação das Peças de Papelaria",
      description:
        "Criação de até 3 peças de papelaria com design profissional, aplicando a identidade visual da marca do cliente: logotipo, paleta de cores, tipografia e elementos visuais. As peças são diagramadas para impressão e apresentadas em mockup.",
      taskCategory: "Execução",
      objective:
        "Entregar até 3 peças de papelaria com design coerente com a identidade visual da marca, prontas para aprovação do cliente.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: false,
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
      calculatedCost: 135,
      questionnaire: null,
      steps: [
        {
          id: "DC0004-T01-S01",
          name: "Análise do Briefing e Identidade Visual",
          description:
            "Ler o briefing completo, identificar os elementos de identidade visual fornecidos (logotipo, paleta, tipografia) e planejar o layout de cada peça solicitada.",
          order: 1,
          estimatedHours: 0.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 22,
          internalGuidance:
            "Verificar: logotipo em vetor (AI ou SVG), paleta de cores com valores hex, tipografias especificadas. Acessar redes sociais do cliente para entender estilo. ATENÇÃO: todos os elementos utilizados devem ser criados pelo nômade ou captados de banco de imagens/fontes com uso comercial permitido. Qualquer problema legal decorrente do desrespeito a essa regra é responsabilidade exclusiva do nômade.",
        },
        {
          id: "DC0004-T01-S02",
          name: "Criação das Peças (até 3 peças)",
          description:
            "Criar as peças de papelaria conforme briefing, aplicando identidade visual consistente, com dimensões corretas, sangria e área de segurança.",
          order: 2,
          estimatedHours: 3.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 113,
          internalGuidance:
            "Cada peça deve ter: (1) dimensões corretas para o tipo de material, (2) sangria de 3mm se houver corte, (3) todos os textos fora da área de segurança, (4) resolução mínima de 300dpi para elementos rasterizados, (5) fontes incorporadas ou convertidas em curvas. Entregar .PNG com mockup para aprovação antes de avançar para E02.",
        },
      ],
    },
    {
      id: "DC0004-T02",
      name: "Entrega em Mockup, PDF e AI",
      description:
        "Apresentação das peças em mockup realista, exportação em PDF de alta resolução pronto para impressão em gráfica e entrega do arquivo AI editável para uso futuro pelo cliente.",
      taskCategory: "Entrega",
      objective:
        "Entregar ao cliente as peças finalizadas em mockup (para visualização), PDF pronto para impressão e arquivo AI editável.",
      dependencies: ["DC0004-T01"],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Compilar arquivo .ZIP com o PDF em alta resolução e todos os criativos em .png, nomeados no padrão: 'nº da tarefa - projeto - papelaria'",
        "PDF: exportar em alta resolução para impressão profissional",
        "AI: salvar arquivo editável com todas as camadas organizadas, fontes incorporadas ou convertidas em curvas — não vinculadas",
        "Entregar todos os arquivos pelo sistema da plataforma na etapa E02",
        "Não entregar apenas mockup sem os arquivos finais — PDF e AI são obrigatórios",
      ],
      calculatedCost: 45,
      questionnaire: null,
      steps: [
        {
          id: "DC0004-T02-S01",
          name: "Mockup e Exportação de Arquivos Finais",
          description:
            "Criar mockup realista de cada peça e exportar os arquivos finais: PDF (CMYK, 300dpi, pronto para gráfica) e AI (editável, camadas organizadas, fontes em curvas).",
          order: 1,
          estimatedHours: 1.5,
          specialtyId: 3,
          specialty: 3,
          experienceLevel: "pleno",
          calculatedCost: 45,
          internalGuidance:
            "Verificar antes de entregar: (1) PDF em CMYK sem erros de perfil de cor, (2) AI com fontes em curvas ou incorporadas, (3) mockup com resolução suficiente para visualização clara. Arquivos incompletos = entrega não aceita.",
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
      internalGuidance:
        "Pesquisar redes sociais do cliente antes de criar. Entregar .PNG com mockup para aprovação antes dos arquivos finais. Todos os elementos devem ser criados pelo nômade ou captados de banco com uso comercial permitido. Aguardar aprovação antes de avançar para E02.",
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
      internalGuidance:
        "Entregar arquivo .ZIP com PDF e criativos em .png nomeados no padrão 'nº da tarefa - projeto - papelaria'. AI editável com fontes incorporadas ou em curvas obrigatório. Arquivos vinculados = entrega não aceita.",
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
      "Preencha com as informações da sua marca e das peças desejadas. Quanto mais detalhado, mais fiel ao seu negócio será a entrega.",
    briefingTitle: "Briefing de Papelaria",
    briefingInstructions:
      "Gere um documento de briefing estruturado para criação de papelaria: ideia criativa, público-alvo, referências visuais, itens solicitados, detalhamento de cada item e logotipo/manual da marca.",
    questions: [
      {
        id: "DC0004-Q01",
        question: "Qual ideia criativa para a papelaria?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Criação",
        briefingKey: "ideiaCriativa",
        aiContext: "Conceito criativo e direção visual para as peças de papelaria solicitadas",
        placeholder:
          "Exemplo: quero que siga a identidade visual da minha marca com meu logotipo em foco.",
      },
      {
        id: "DC0004-Q02",
        question: "Qual seria o público-alvo para as peças?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Público",
        briefingKey: "publicoAlvo",
        aiContext: "Perfil do público que irá receber ou interagir com as peças de papelaria",
        placeholder:
          "Exemplo: pessoas jovens de classe média entre 18 a 25 anos.",
      },
      {
        id: "DC0004-Q03",
        question: "Nos informe suas referências para a papelaria.",
        type: "multiline",
        required: false,
        options: [],
        aiAssisted: false,
        section: "Referências",
        briefingKey: "referencias",
        aiContext: "Referências visuais, exemplos de estilo e inspirações para as peças de papelaria",
        placeholder:
          "Exemplo: Anexei algumas referências para ajudar na criação.",
        warning:
          "Referências visuais ajudam o especialista a entender o estilo desejado e reduzem revisões.",
      },
      {
        id: "DC0004-Q04",
        question: "Quais os 3 itens da papelaria você deseja?",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Itens",
        briefingKey: "itensSolicitados",
        aiContext:
          "Os 3 itens de papelaria escolhidos dentre as opções disponíveis: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página, Certificado",
        placeholder:
          "Exemplo: Papel timbrado; Envelope; Etiqueta.",
        warning:
          "Itens disponíveis: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página, Certificado.",
      },
      {
        id: "DC0004-Q05",
        question: "Nos informe a ideia criativa para o Item 1.",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Item 1",
        briefingKey: "item1",
        aiContext:
          "Detalhamento da ideia criativa, conteúdo e aplicação do primeiro item de papelaria solicitado",
        placeholder:
          "Exemplo:\nEtiqueta\nIdeia: Utilizar um design minimalista com o logotipo da marca em destaque na frente, enquanto no verso incluir informações de contato em uma fonte elegante e legível.\nConteúdo: Nome, cargo, endereço de e-mail, número de telefone e site da empresa.\nAplicação: Distribuição durante eventos de networking, reuniões de negócios e como parte de apresentações comerciais.",
      },
      {
        id: "DC0004-Q06",
        question: "Nos informe a ideia criativa para o Item 2.",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Item 2",
        briefingKey: "item2",
        aiContext:
          "Detalhamento da ideia criativa, conteúdo e aplicação do segundo item de papelaria solicitado",
        placeholder:
          "Exemplo:\nPapel Timbrado\nIdeia: Criar um cabeçalho limpo e moderno com o logotipo da empresa e informações de contato sutis, posicionados no topo da página.\nConteúdo: Logotipo da empresa, endereço, número de telefone e site.\nAplicação: Uso em correspondências oficiais, documentos comerciais e propostas de negócios.",
      },
      {
        id: "DC0004-Q07",
        question: "Nos informe a ideia criativa para o Item 3.",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: true,
        section: "Item 3",
        briefingKey: "item3",
        aiContext:
          "Detalhamento da ideia criativa, conteúdo e aplicação do terceiro item de papelaria solicitado",
        placeholder:
          "Exemplo:\nEnvelopes\nIdeia: Aplicar o logotipo da marca de forma discreta e elegante no canto superior esquerdo do envelope, com um padrão sutil ou textura que complemente o design.\nConteúdo: Endereço do remetente e destinatário.\nAplicação: Envio de correspondências, convites e documentos importantes.",
      },
      {
        id: "DC0004-Q08",
        question:
          "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Identidade",
        briefingKey: "logoManual",
        aiContext:
          "Instruções sobre o envio do logotipo e do manual da marca para uso nas peças de papelaria",
        placeholder:
          "Exemplo: Sim, anexei o manual da marca.",
        warning:
          "O logotipo em vetor (AI, SVG ou EPS) é obrigatório para qualidade de impressão. Envie pelo chat do projeto antes do início da execução.",
      },
    ],
  },
        type: "multiline",
        required: true,
        options: [],
        aiAssisted: false,
        section: "Peças",
        briefingKey: "itensSolicitados",
        aiContext:
          "Itens de papelaria solicitados dentro das opções disponíveis: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página, Certificado",
        placeholder:
          "Ex: 1. Papel timbrado A4 | 2. Envelope | 3. Etiqueta\n\nOu: 1. Receituário A5 | 2. Crachá | 3. Convite",
        warning:
          "Escolha exatamente 3 itens. Opções disponíveis: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página, Certificado.",
      },
  nomadTests: [
    {
      id: "DC0004-TEST01",
      code: "DC0004-TEST01",
      name: "Teste de Habilitação — Papelaria",
      description:
        "O nômade deve criar 2 peças de papelaria (papel timbrado e cartão de visita) para uma marca fictícia, demonstrando domínio de identidade visual, diagramação profissional, exportação de arquivos para impressão e apresentação em mockup.",
      linkedTaskId: "DC0004-T01",
      linkedTaskName: "Criação das Peças de Papelaria",
      fakeClientName: "Studio Atelier Forma",
      fakeObjective:
        "Criar papel timbrado A4 e cartão de visita para o Studio Atelier Forma, aplicando identidade visual fornecida e entregando em mockup, PDF CMYK e AI editável.",
      fakeContext:
        "Marca: Studio Atelier Forma — estúdio de arquitetura e interiores de alto padrão. Cores: Branco #FFFFFF | Carvão #2C2C2C | Dourado #B8965A. Tipografia: Cormorant Garamond para títulos, Lato para corpo de texto. Peças solicitadas: (1) Papel timbrado A4 — conter logo, endereço: Rua Augusta, 1200, Jardins, São Paulo-SP, telefone: (11) 99123-4567, e-mail: contato@atelierforma.com.br, site: www.atelierforma.com.br; (2) Cartão de visita 9x5cm — frente: logo, nome 'Ana Barros', cargo 'Arquiteta e Sócia', telefone e e-mail; verso: slogan 'Espaços que inspiram'. Estilo: sofisticado, minimalista, clean. Logotipo: usar tipografia 'Studio Atelier Forma' em Cormorant Garamond com uma linha dourada fina como elemento de destaque.",
      fakeDeliverables: [
        "Papel timbrado A4 com identidade visual do Studio Atelier Forma aplicada e todas as informações de contato",
        "Cartão de visita 9x5cm (frente e verso) com nome, cargo, contato e slogan",
        ".PNG de cada peça acompanhado de mockup realista (papel timbrado em mesa; cartão em perspectiva)",
        "Arquivo .ZIP com o PDF em alta resolução e os criativos em .png, nomeados no padrão: 'nº da tarefa - Studio Atelier Forma - papelaria'",
        "Arquivo AI editável com camadas organizadas e fontes incorporadas ou convertidas em curvas",
      ],
      evaluationCriteria: [
        "O briefing e as referências foram consultados e compreendidos antes da criação",
        "Material entregue compatível com a solicitação (2 peças: papel timbrado + cartão de visita) e identidade visual do Studio Atelier Forma",
        "Mockups bem estruturados e visíveis — fotorealísticos, não screenshot do software de edição",
        "Conteúdo de texto correto e sem erros gramaticais (dados do briefing conferidos)",
        "Arquivo .ZIP entregue com PDF e .png nomeados no padrão correto",
        "Arquivo AI com fontes incorporadas ou em curvas — não vinculadas a arquivos externos",
      ],
      passingScore: 70,
      timeLimit: 120,
      enablesAdditionalTasks: [
        {
          taskId: "DC0004-T01",
          taskName: "Criação das Peças de Papelaria",
          productId: "DC0004",
          productName: "Papelaria (3 unidades)",
        },
        {
          taskId: "DC0004-T02",
          taskName: "Entrega em Mockup, PDF e AI",
          productId: "DC0004",
          productName: "Papelaria (3 unidades)",
        },
      ],
      isActive: true,
      createdAt: "2026-01-01T09:00:00Z",
      preCircuit: {
        welcomeTitle: "Bem-vindo ao Circuito de Habilitação — Papelaria",
        welcomeSubtitle:
          "Você está prestes a se habilitar para criar peças de papelaria pela allka. Leia com atenção antes de começar.",
        welcomeHighlights: [
          "Criação prática de 2 peças para marca fictícia com briefing completo",
          "Até 120 minutos para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para todas as variações do produto",
        ],
        aboutDescription:
          "Neste teste você vai criar papel timbrado e cartão de visita para o Studio Atelier Forma, demonstrando domínio de identidade visual aplicada, diagramação para impressão, exportação em PDF CMYK e entrega em mockup realista.",
        aboutWhatToExpect: [
          "Ler o briefing completo do Studio Atelier Forma (cores, tipografia, informações de cada peça)",
          "Criar papel timbrado A4 com identidade visual e informações de contato",
          "Criar cartão de visita 9x5cm (frente e verso) com todos os elementos solicitados",
          "Apresentar cada peça em mockup realista",
          "Exportar PDF em CMYK (300dpi) e arquivo AI editável com fontes em curvas",
        ],
        estimatedTime: "120 minutos",
        rules: [
          "Use Adobe Illustrator, Affinity Designer ou software profissional equivalente",
          "PDF deve estar em perfil de cor CMYK — não RGB",
          "Fontes no arquivo AI devem estar em curvas ou incorporadas",
          "Mockup deve ser realista — não screenshot do software de edição",
          "Aplicar exatamente as cores hex fornecidas no briefing",
        ],
        warnings: [
          "PDF em RGB (ao invés de CMYK) resulta em desconto na avaliação",
          "Arquivos sem mockup ou sem AI editável não são aceitos para aprovação máxima",
        ],
        confirmChecklist: [
          "Li o briefing completo do Studio Atelier Forma incluindo os itens solicitados, objetivo e referências de estilo",
          "Entendo que devo consultar as redes sociais do cliente fictício para entender o estilo visual antes de criar",
          "Tenho software profissional de design vetorial (Illustrator, Affinity Designer ou equivalente)",
          "Sei exportar PDF em alta resolução para impressão profissional",
          "Sei criar ou tenho acesso a mockups realistas de papelaria",
          "Entendo que devo entregar .ZIP com PDF e criativos em .png nomeados no padrão correto",
          "Entendo que o arquivo AI deve ter fontes incorporadas ou convertidas em curvas — nunca vinculadas",
          "Tenho 120 minutos disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "DC0004-TEST01-CL",
        linkedTestId: "DC0004-TEST01",
        linkedTestName: "Teste de Habilitação — Papelaria",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar com base nos 6 critérios do checklist: (1) briefing e referências verificados antes da criação; (2) material compatível com a solicitação e identidade visual aplicada; (3) mockups fotorealísticos de todas as peças; (4) textos corretos sem erros gramaticais; (5) ZIP com PDF e .png nomeados corretamente; (6) AI com fontes incorporadas ou em curvas — nunca vinculadas.",
        sections: [
          {
            id: "DC0004-CL-S01",
            title: "Briefing e Referências",
            description: "Verificação do briefing e das referências visuais antes da avaliação",
            items: [
              {
                id: "DC0004-CL-S01-I01",
                label: "o briefing e as referências foram verificados",
                description:
                  "O avaliador leu o briefing completo e verificou as referências enviadas pelo cliente antes de avaliar o material",
                weight: 5,
                isRequired: true,
                hint: "Confirmar: briefing lido, referências consultadas, itens solicitados identificados.",
              },
            ],
          },
          {
            id: "DC0004-CL-S02",
            title: "Compatibilidade com a Solicitação",
            description: "Avaliação da aderência ao que foi solicitado no briefing",
            items: [
              {
                id: "DC0004-CL-S02-I01",
                label: "o material entregue está compatível com a solicitação e no documento padronizado",
                description:
                  "As peças entregues correspondem aos 3 itens solicitados no briefing, aplicam a identidade visual e seguem o padrão de entrega da plataforma",
                weight: 10,
                isRequired: true,
                hint: "Verificar: (1) os 3 itens solicitados foram criados, (2) identidade visual aplicada (cores, tipografia, logotipo), (3) entrega no formato padronizado (ZIP + PDF + .png + AI).",
              },
            ],
          },
          {
            id: "DC0004-CL-S03",
            title: "Mockups",
            description: "Avaliação da apresentação visual em mockup de cada peça",
            items: [
              {
                id: "DC0004-CL-S03-I01",
                label: "os mockups estão bem estruturados e visíveis",
                description:
                  "Mockup realista entregue para cada peça, com boa qualidade de imagem e apresentação profissional",
                weight: 5,
                isRequired: true,
                hint: "Mockup deve ser fotorrealista — não screenshot do software. Cada peça deve ter seu próprio mockup. Imagem turva ou de baixa qualidade = reprovado.",
              },
            ],
          },
          {
            id: "DC0004-CL-S04",
            title: "Qualidade de Texto",
            description: "Verificação de erros gramaticais e adequação do conteúdo textual",
            items: [
              {
                id: "DC0004-CL-S04-I01",
                label: "o conteúdo de texto inserido está correto e sem erros gramaticais",
                description:
                  "Todos os textos inseridos nas peças estão corretos, sem erros de português, sem dados trocados e coerentes com o briefing",
                weight: 8,
                isRequired: true,
                hint: "Verificar: (1) dados de contato corretos conforme briefing, (2) nenhum erro de ortografia ou gramática, (3) nenhum placeholder ou texto genérico não substituído.",
              },
            ],
          },
          {
            id: "DC0004-CL-S05",
            title: "Arquivos Entregues",
            description: "Verificação da entrega completa e correta dos arquivos",
            items: [
              {
                id: "DC0004-CL-S05-I01",
                label: "os arquivos abertos e fechados foram enviados corretamente",
                description:
                  "O arquivo .ZIP entregue contém: PDF em alta resolução (arquivo fechado) e .png de cada peça, nomeados no padrão 'nº da tarefa - projeto - papelaria'",
                weight: 8,
                isRequired: true,
                hint: "Abrir o ZIP e verificar: presença do PDF, presença de .png de cada peça, nomenclatura correta dos arquivos.",
              },
              {
                id: "DC0004-CL-S05-I02",
                label: "os arquivos abertos foram entregues incorporados e não vinculados",
                description:
                  "O arquivo AI editável foi entregue com fontes incorporadas (ou convertidas em curvas) e imagens incorporadas — não vinculadas a arquivos externos",
                weight: 7,
                isRequired: true,
                hint: "Abrir o arquivo AI e verificar: Arquivo > Informações do Documento > Fontes (não deve ter fontes faltantes). Imagens vinculadas devem ser incorporadas.",
              },
            ],
          },
        ],
      },
    },
  ],

  variationsInternal: {
    "DC0004-V01": {
      label: "Papelaria (3 unidades)",
      code: "DC0004-V01",
      publicDeadlineLabel: "3 dias úteis",
      executionHours: 6,
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
      "Sua marca existe além do digital. Papel timbrado, cartão de visita, envelopes e bloco de notas com design profissional passam credibilidade em cada contato presencial — e refletem quem você é antes mesmo de falar.",
    highlights: [
      "Criação de até 3 peças de papelaria com identidade visual aplicada",
      "Arte em mockup para visualização realista antes da impressão",
      "Arquivo PDF pronto para gráfica (CMYK, alta resolução)",
      "Arquivo AI editável para adaptações futuras",
    ],
    targetAudience: [
      "Profissionais liberais e prestadores de serviço que precisam de papelaria para reuniões e apresentações",
      "Pequenas e médias empresas em processo de estruturação ou rebranding da identidade visual",
      "Escritórios, clínicas, consultórios e ateliês que recebem clientes presencialmente",
      "Negócios que querem transmitir profissionalismo e credibilidade em cada ponto de contato físico",
      "Empresas que têm logotipo mas ainda não têm papelaria desenvolvida",
    ],
    whatIsIncluded: [
      {
        title: "Criação de até 3 formatos de impressos",
        description:
          "Escolha até 3 itens dentre os disponíveis: Papel timbrado, Bloco de notas, Receituário, Pasta, Sacola, Selo, Envelope, Etiqueta, Adesivo, Tag, Camiseta, Crachás, Convites, Cartaz, Marca página ou Certificado.",
      },
      {
        title: "Diagramação adequada",
        description:
          "Cada peça é diagramada no formato e dimensão corretos para impressão, com sangria, área de segurança e identidade visual aplicada.",
      },
      {
        title: "Design criativo",
        description:
          "A ideia criativa é desenvolvida pelo especialista com base no briefing e no estilo visual da sua marca.",
      },
      {
        title: "Arte em mockup para visualização",
        description:
          "Entrega das artes em mockup para melhor visualização do produto antes de encaminhar para a gráfica.",
      },
      {
        title: "Arquivo PDF pronto para impressão",
        description:
          "Arquivo em PDF com alta resolução e margem de impressão, pronto para envio à gráfica.",
      },
      {
        title: "Arquivo AI para edições futuras",
        description:
          "Arquivo fonte em Adobe Illustrator (.AI) com camadas organizadas, para edições e adaptações futuras.",
      },
    ],
          "Cada peça é apresentada em mockup fotorrealista para que você visualize o resultado final antes de encaminhar para a gráfica.",
      },
    ],
    benefits: [
      {
        title: "Profissional especializado",
        description:
          "Irá contar com um profissional especialista na área que irá montar e diagramar o material da melhor forma.",
      },
      {
        title: "Credibilidade",
        description:
          "Uma papelaria bem projetada transmite profissionalismo e credibilidade aos clientes e parceiros de negócios.",
      },
      {
        title: "Criatividade e design",
        description:
          "Toda a ideia criativa será dada pelo especialista com base no seu preenchimento do questionário.",
      },
      {
        title: "Conexão",
        description:
          "Selecione até 3 itens de papelaria para elaboração, tornando os materiais mais conectados e sinérgicos.",
      },
    ],
    deliverables: [
      "Diagramação adequada",
      "Design criativo",
      "Entrega da arte em mockup para melhor visualização do produto",
      "Arquivo PDF pronto para impressão",
      "Arquivo AI para edições futuras",
    ],
    notIncluded: [
      "Criação de conteúdo",
      "Impressão das artes em uma gráfica",
    ],
    warnings: [
      "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega.",
      "Todos os elementos e conteúdos enviados ou de propriedade do cliente devem respeitar a Lei Federal nº 9.610/98.",
      "Qualquer problema legal diante aos itens fornecidos que desrespeitem esta regra será de responsabilidade do cliente, e a Allka estará isenta.",
    ],
    complementaryProducts: [
      {
        title: "Comunicação Visual (até 5 elementos)",
        description:
          "Expanda a papelaria para sinalização, displays e materiais de comunicação visual para o ambiente físico da sua marca.",
      },
      {
        title: "Criação de Logotipo",
        description:
          "Se ainda não tem logotipo, crie um antes da papelaria — assim todas as peças ficam alinhadas com uma identidade visual profissional e consistente.",
      },
      {
        title: "Banner Digital Estático ou Carrossel (até 5 telas)",
        description:
          "Complemente a papelaria física com materiais digitais nas mesmas proporções visuais — para redes sociais, campanhas e apresentações online.",
      },
    ],
    requirements: [
      "Logotipo da marca fornecido (vetor AI/SVG/EPS preferencial; PNG alta resolução aceito)",
      "Briefing preenchido com: lista das 3 peças desejadas, informações de contato a constar em cada peça e referências visuais (opcional)",
      "Paleta de cores da marca (valores hex ou RGB) — se não disponível, o nômade extrairá do logotipo ou site",
    ],
    howToRequest: [
      {
        step: "Escolha as 3 peças",
        description:
          "No briefing, informe quais 3 peças de papelaria deseja criar — papel timbrado, cartão de visita, envelope, bloco de notas, receituário ou qualquer outro item.",
      },
      {
        step: "Preencha o briefing",
        description:
          "Informe o nome da marca, envie o logotipo, informe a paleta de cores e os dados a constar em cada peça.",
      },
      {
        step: "Aprove o mockup",
        description:
          "Em até 2 dias úteis, você recebe o mockup das peças para aprovação. Solicite ajustes se necessário antes da entrega final.",
      },
      {
        step: "Receba os arquivos finais",
        description:
          "Após aprovação do mockup, receba os arquivos PDF (para gráfica) e AI (editável) em até 1 dia útil.",
      },
    ],
    faq: [
      {
        question: "Quais peças posso criar?",
        answer:
          "Qualquer combinação de: papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, embalagem, etiqueta, crachá, convite, cartaz, marca-página, certificado ou selo. Escolha as 3 peças no briefing.",
      },
      {
        question: "Preciso ter logotipo para contratar?",
        answer:
          "Sim. O logotipo é essencial para criar papelaria com identidade visual consistente. Se ainda não tem, contrate primeiro o produto de Criação de Logotipo.",
      },
      {
        question: "A entrega inclui a impressão?",
        answer:
          "Não. A entrega é digital: mockup, PDF pronto para gráfica e arquivo AI editável. A impressão é responsabilidade do cliente com a gráfica de sua preferência.",
      },
      {
        question: "Em qual formato é entregue o PDF?",
        answer:
          "PDF em perfil de cor CMYK, resolução 300dpi, com sangria de 3mm — padrão exigido pelas gráficas para impressão de alta qualidade.",
      },
      {
        question: "Posso pedir mais de 3 peças?",
        answer:
          "O produto inclui até 3 peças. Para quantidade maior, contrate o produto novamente para mais 3 unidades.",
      },
      {
        question: "O arquivo AI pode ser editado por qualquer designer?",
        answer:
          "Sim. O arquivo AI é entregue com fontes em curvas e camadas organizadas — qualquer designer com Adobe Illustrator ou software compatível consegue fazer adaptações futuras.",
      },
    ],
  },
};

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("▶ Seeding DC0004 — Papelaria (3 unidades)...");

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
      name: "Papelaria (3 unidades)",
      description:
        "Criação de até 3 peças de papelaria profissional com identidade visual coerente com a marca do cliente: papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, crachá e muito mais. Entrega em mockup, PDF CMYK pronto para gráfica e arquivo AI editável.",
      short_description:
        "Até 3 peças de papelaria com design profissional — mockup, PDF para gráfica e arquivo AI editável em 3 dias úteis.",
      category: "design",
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
      demonstrations: JSON.stringify([
        "/images/products/papelaria.svg",
      ]),
      completion_time: "3 dias úteis",
      metadata: JSON.stringify(papelariaMeta),
      is_active: true,
      created_at: new Date("2026-01-01T09:00:00Z"),
      updated_at: new Date(),
    },
    update: {
      name: "Papelaria (3 unidades)",
      description:
        "Criação de até 3 peças de papelaria profissional com identidade visual coerente com a marca do cliente: papel timbrado, cartão de visita, envelope, bloco de notas, receituário, sacola, crachá e muito mais. Entrega em mockup, PDF CMYK pronto para gráfica e arquivo AI editável.",
      short_description:
        "Até 3 peças de papelaria com design profissional — mockup, PDF para gráfica e arquivo AI editável em 3 dias úteis.",
      category: "design",
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
      demonstrations: JSON.stringify([
        "/images/products/papelaria.svg",
      ]),
      completion_time: "3 dias úteis",
      metadata: JSON.stringify(papelariaMeta),
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log("  ✓ Produto DC0004 upserted");

  // DC0004 não possui variações de escopo —
  // o produto é sempre "3 unidades" (preço único R$ 181,44)
  console.log("  ✓ Sem variações (produto avulso de escopo único)");

  console.log("✅ Seed DC0004 — Papelaria (3 unidades) concluído com sucesso!");
  console.log("   ID: DC0004 | Preço: R$ 181,44 | Prazo: 3 dias úteis");
  console.log("   ⚠ Lembre-se: adicionar papelaria.svg em public/images/products/");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed DC0004:", e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
