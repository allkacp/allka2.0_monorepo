// seed-product-DC0005.js — Layout de Website
// Idempotente: deleta variações/addons e recria. O product_id é fixo.
// Uso: node apps/backend/seed-product-DC0005.js
//
// ⚠ Este seed NÃO afeta pedidos/projetos existentes. O product_id (DC0005)
//    permanece o mesmo, então históricos de contratação são preservados.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "DC0005";

// ─── Metadata ────────────────────────────────────────────────────────────────
// Espelho fiel de dev-mocks/data/products.ts → layoutWebsiteMeta
// Se atualizar aqui, atualizar lá também (e vice-versa).

const layoutWebsiteMeta = {
  complementaryProductIds: ["PA0002", "PA0005"],
  subcategory: "Soluções Web",
  recurrence: "Avulso",
  deliveryDays: "7",
  summaryDescription:
    "Layout profissional de website criado por especialista em web design, com identidade visual da marca aplicada. Entrega em PDF, arquivos abertos em PSD ou Figma, imagens, fontes e versão mobile totalmente adaptada.",
  finalPrice: 453.60,
  itemLimit: 1,
  totalExecutionHours: 20,
  executionHoursPerDay: 4,
  testsEnabled: true,
  stepsEnabled: true,

  taskModel: {
    objective:
      "Criar layout de website com identidade visual da marca aplicada, no formato 1920×1080px (ou formato informado no briefing), entregando PDF para aprovação, arquivo aberto PSD ou Figma com imagens e fontes, e versão mobile totalmente adaptada.",
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
      level: "info",
      message:
        "Quanto maior o detalhamento de informações no briefing, mais fiel e qualitativa será a entrega. Descreva a identidade visual, público-alvo, referências e o objetivo de cada página.",
    },
    {
      id: "W02",
      level: "warning",
      message:
        "Se houver template ou guia de identidade visual, ele deve ser enviado antes do início da execução para que o nômade respeite as diretrizes da marca.",
    },
    {
      id: "W03",
      level: "warning",
      message:
        "O logotipo ou selo devem ser enviados vetorizados (AI, SVG, EPS) ou em alta qualidade (PNG/JPEG mínimo 300dpi). Material em baixa resolução prejudica a qualidade do layout.",
    },
    {
      id: "W04",
      level: "critical",
      message:
        "Todos os elementos e conteúdos enviados pelo cliente devem respeitar a Lei Federal nº 9.610/98 — direitos autorais. A Allka estará isenta em caso de violação causada pelo material enviado.",
    },
  ],

  baseFeatures: [
    "Layout de website criado por especialista em web design",
    "Formato padrão 1920×1080px (ou outro informado no briefing)",
    "Identidade visual da marca aplicada em todas as páginas",
    "Entrega em PDF para aprovação",
    "Arquivo aberto PSD ou Figma com imagens e fontes incluídas",
    "Versão mobile totalmente adaptada",
    "2 etapas: E01 Criação e Aprovação → E02 Entrega dos Arquivos Finais",
    "Execução por nômade habilitado — Especialidade Web Design",
  ],

  tasks: [
    {
      id: "DC0005-T01",
      name: "Criação do Layout de Website",
      description:
        "Criação do layout de website com identidade visual da marca aplicada, nos formatos e quantidade de páginas da variação contratada. Entrega em PDF para aprovação antes dos arquivos finais.",
      taskCategory: "Execução",
      objective:
        "Criar o layout de website conforme briefing, aplicando identidade visual, e apresentar para aprovação em PDF antes da entrega dos arquivos abertos.",
      dependencies: [],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Ler o briefing completo e pesquisar o nicho do cliente antes de iniciar qualquer criação",
        "Acessar as redes sociais e o site atual do cliente (se existir) para entender o tom de voz e estilo visual",
        "Aplicar identidade visual da marca: logotipo, paleta de cores, tipografia e demais elementos fornecidos",
        "Respeitar o formato padrão 1920×1080px, salvo outro formato informado no briefing",
        "Criar o número de páginas contratado na variação — não entregar menos do que o escopo",
        "Criar a versão mobile adaptada para todas as páginas criadas",
        "Entregar o PDF de todas as páginas (desktop e mobile) para aprovação antes de avançar para E02",
        "O conteúdo textual deve ser baseado no que o cliente forneceu — não criar textos por conta própria",
        "Não entregar com erros gramaticais, fora do tema proposto ou em desacordo com a identidade visual do cliente",
        "Não utilizar elementos com direitos autorais de terceiros sem autorização — apenas criações próprias ou banco com uso comercial permitido",
      ],
      calculatedCost: 320,
      questionnaire: null,
      steps: [
        {
          id: "DC0005-T01-S01",
          name: "Análise do Briefing e Planejamento",
          description:
            "Ler o briefing completo, identificar os elementos de identidade visual fornecidos, pesquisar referências e planejar a estrutura de cada página.",
          order: 1,
          estimatedHours: 2,
          specialtyId: 7,
          specialty: 7,
          experienceLevel: "pleno",
          calculatedCost: 60,
          internalGuidance:
            "Verificar: logotipo em vetor (AI ou SVG), paleta de cores com valores hex, tipografias especificadas. Acessar site atual e redes sociais do cliente para entender o estilo. Planejar estrutura antes de criar: número de seções por página, hierarquia de informações, CTAs principais.",
        },
        {
          id: "DC0005-T01-S02",
          name: "Criação das Páginas (desktop)",
          description:
            "Criar o layout de todas as páginas no formato desktop (1920×1080px ou informado no briefing), com identidade visual aplicada e conteúdo organizado.",
          order: 2,
          estimatedHours: 12,
          specialtyId: 7,
          specialty: 7,
          experienceLevel: "pleno",
          calculatedCost: 200,
          internalGuidance:
            "Usar grid consistente em todas as páginas. Hierarquia visual clara: headline > subheadline > corpo de texto > CTA. Espaçamentos e alinhamentos consistentes. Criar todas as páginas do escopo antes de avançar para a versão mobile.",
        },
        {
          id: "DC0005-T01-S03",
          name: "Adaptação Mobile",
          description:
            "Criar a versão mobile totalmente adaptada de todas as páginas, considerando breakpoints, legibilidade, hierarquia e usabilidade em tela pequena.",
          order: 3,
          estimatedHours: 4,
          specialtyId: 7,
          specialty: 7,
          experienceLevel: "pleno",
          calculatedCost: 60,
          internalGuidance:
            "Formato mobile: 390×844px (iPhone 14) como referência padrão. Verificar: texto legível sem zoom, botões com área mínima de 44px, menus adaptados, imagens recortadas corretamente para formato vertical.",
        },
      ],
    },
    {
      id: "DC0005-T02",
      name: "Entrega dos Arquivos Finais",
      description:
        "Entrega do arquivo aberto (PSD ou Figma) com todas as páginas, imagens e fontes incluídas, após aprovação do PDF pelo cliente.",
      taskCategory: "Entrega",
      objective:
        "Entregar ao cliente os arquivos abertos organizados para uso e edições futuras.",
      dependencies: ["DC0005-T01"],
      canRunInParallel: false,
      requiresAccess: false,
      executionRules: [
        "Compilar arquivo .ZIP com: PDF de todas as páginas (desktop e mobile), arquivo PSD ou Figma, imagens e fontes utilizadas",
        "PSD: camadas organizadas e nomeadas por página/seção, fontes incorporadas",
        "Figma: arquivo organizado por frames/páginas, com todos os componentes disponíveis",
        "Entregar todos os arquivos pelo sistema da plataforma na etapa E02",
        "Verificar se todas as páginas da variação contratada estão no arquivo antes de entregar",
        "Não entregar arquivo com camadas desorganizadas, fontes vinculadas faltando ou páginas faltantes",
      ],
      calculatedCost: 40,
      questionnaire: null,
      steps: [
        {
          id: "DC0005-T02-S01",
          name: "Organização e Entrega Final",
          description:
            "Organizar o arquivo aberto (PSD ou Figma), incluir todas as imagens e fontes, e compilar o .ZIP com todos os entregáveis.",
          order: 1,
          estimatedHours: 1,
          specialtyId: 7,
          specialty: 7,
          experienceLevel: "pleno",
          calculatedCost: 40,
          internalGuidance:
            "Checklist antes de entregar: (1) todas as páginas contratadas no arquivo; (2) versão mobile de cada página; (3) camadas organizadas; (4) imagens e fontes incluídas no .ZIP; (5) PDF com todas as páginas para referência. Arquivos incompletos = entrega não aceita.",
        },
      ],
    },
  ],

  stages: [
    {
      id: "DC0005-E01",
      code: "DC0005-E01",
      number: 1,
      name: "Criação e Aprovação do Layout",
      description:
        "Criação das páginas desktop e mobile, entregues em PDF para aprovação do cliente antes dos arquivos finais.",
      category: "Execução",
      deliveryDeadlineDays: 7,
      executionDeadlineDays: 6,
      approvalDeadlineDays: 10,
      executionHours: 18,
      value: 80,
      itemLimit: 1,
      specialtyId: 7,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: false,
      hideInProducts: false,
      internalGuidance:
        "Pesquisar redes sociais e site atual do cliente antes de criar. Entregar PDF de todas as páginas (desktop + mobile) para aprovação. Aguardar aprovação antes de avançar para E02.",
    },
    {
      id: "DC0005-E02",
      code: "DC0005-E02",
      number: 2,
      name: "Entrega dos Arquivos Finais",
      description:
        "Entrega do .ZIP com PDF, arquivo aberto (PSD ou Figma), imagens e fontes.",
      category: "Entrega",
      deliveryDeadlineDays: 2,
      executionDeadlineDays: 1,
      approvalDeadlineDays: 10,
      executionHours: 2,
      value: 20,
      itemLimit: 1,
      specialtyId: 7,
      experienceLevel: "pleno",
      isInternal: false,
      viewAccesses: false,
      keepSameNomad: true,
      delegateToLeader: false,
      requiresFinalFiles: true,
      hideInProducts: false,
      internalGuidance:
        "Entregar .ZIP com: PDF (todas as páginas, desktop + mobile), arquivo aberto PSD ou Figma, imagens e fontes. Verificar que todas as páginas da variação contratada estão incluídas antes de marcar como concluída.",
    },
  ],

  accessInstructions: null,

  executionTerms: [
    "Criar o layout de website conforme as especificações do briefing, aplicando identidade visual e respeitando o número de páginas da variação contratada",
    "Pesquisar o nicho do cliente e acessar redes sociais e site atual antes de iniciar qualquer criação",
    "Formato padrão: 1920×1080px (desktop) | 390×844px (mobile) — salvo outro formato informado no briefing",
    "Entregar PDF de todas as páginas (desktop e mobile) para aprovação do cliente antes dos arquivos finais",
    "Após aprovação, compilar .ZIP com: PDF, arquivo aberto PSD ou Figma, imagens e fontes utilizadas",
    "Conteúdo textual baseado no que o cliente forneceu — não criar textos por conta própria",
    "Não utilizar elementos com direitos autorais de terceiros sem autorização — apenas criações próprias ou banco com uso comercial permitido",
    "Se o cliente reprovar a entrega, realizar as correções solicitadas até o próximo dia útil",
    "Entregar a versão mobile adaptada de todas as páginas criadas — versão mobile faltante = entrega incompleta",
  ],

  nomadAttentionText:
    "Todos os elementos utilizados no layout devem ser desenvolvidos pelo nômade ou captados de banco de imagens e fontes com uso comercial devidamente permitido. Qualquer problema legal decorrente da criação que desrespeite essa norma será de exclusiva responsabilidade do nômade.",

  questionnaire: {
    id: "DC0005-Q",
    title: "Briefing — Layout de Website",
    description:
      "Preencha com as informações da sua marca e do website desejado. Quanto mais detalhado, mais fiel à sua visão será a entrega.",
    briefingTitle: "Briefing de Layout de Website",
    briefingInstructions:
      "Gere um documento de briefing estruturado para criação de layout de website: objetivo do site, público-alvo, referências, páginas desejadas, conteúdo disponível, identidade visual e observações.",
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
        aiContext:
          "Objetivo estratégico do website: gerar leads, vender produtos, apresentar portfólio, informar clientes, etc.",
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
        aiContext:
          "Perfil do público-alvo do site: quem são os visitantes esperados, faixa etária, contexto de uso",
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
        aiContext:
          "Lista das páginas que compõem o website: Home, Sobre, Serviços, Portfólio, Contato, etc.",
        placeholder:
          "Exemplo: Home | Sobre nós | Serviços | Portfólio | Blog | Contato",
        warning:
          "Informe todas as páginas dentro do limite da variação contratada. Páginas extras não incluídas serão cobradas separadamente.",
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
        aiContext:
          "URLs de sites de referência, estilos visuais e inspirações para o layout",
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
        aiContext: "Status dos ativos de identidade visual do cliente",
        placeholder: "Selecione",
        warning:
          "Se tiver guia de identidade visual, envie pelo chat do projeto antes do início da execução. O logotipo em vetor é obrigatório para qualidade profissional.",
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
        aiContext:
          "Status do conteúdo textual: textos prontos, esboços ou ausente",
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
        aiContext:
          "Plataforma do site: WordPress, Webflow, Wix, Shopify, código customizado, etc.",
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
        aiContext:
          "Informações adicionais: tom de voz, elementos que não devem aparecer, preferências de cor, outras especificações",
        placeholder:
          "Exemplo: usar predominantemente tons de azul e branco | evitar muitas fontes diferentes | o site deve transmitir sofisticação e confiança",
      },
    ],
  },

  nomadTests: [
    {
      id: "DC0005-TEST01",
      code: "DC0005-TEST01",
      name: "Teste de Habilitação — Layout de Website",
      description:
        "O nômade deve criar o layout de uma landing page completa (desktop + mobile) para uma marca fictícia, demonstrando domínio de web design, identidade visual aplicada, hierarquia visual, adaptação responsiva e entrega em PDF e arquivo aberto.",
      linkedTaskId: "DC0005-T01",
      linkedTaskName: "Criação do Layout de Website",
      fakeClientName: "Clínica Sorriso Pleno",
      fakeObjective:
        "Criar o layout de uma landing page (1 página) para a Clínica Sorriso Pleno, com identidade visual fornecida, versão desktop e mobile, entregue em PDF e PSD ou Figma.",
      fakeContext:
        "Marca: Clínica Sorriso Pleno — clínica odontológica de médio porte. Cores: Azul Saúde #1A6EA8 | Branco #FFFFFF | Cinza Claro #F5F5F5. Tipografia: Nunito (títulos), Open Sans (corpo). Logo: texto 'Sorriso Pleno' com ícone de dente azul (criar tipograficamente). Objetivo da página: captar agendamentos online. Público: adultos de 25 a 55 anos, acessam pelo celular. Seções da landing page: (1) Hero — headline principal + subheadline + botão 'Agendar consulta'; (2) Benefícios (3 colunas): Sem dor | Equipe especializada | Atendimento digital; (3) Serviços destacados (4 cards): Clareamento, Ortodontia, Implante, Limpeza; (4) Depoimento de paciente (1 depoimento fictício); (5) CTA final + Formulário simples (nome, telefone, serviço); (6) Rodapé com endereço e redes sociais.",
      fakeDeliverables: [
        "Layout da landing page em formato desktop 1920×1080px — com todas as 6 seções solicitadas",
        "Versão mobile da landing page 390×844px — totalmente adaptada",
        "PDF com ambas as versões (desktop + mobile)",
        "Arquivo aberto PSD ou Figma com camadas organizadas, imagens e fontes incluídas",
      ],
      evaluationCriteria: [
        "Identidade visual aplicada corretamente (cores hex, tipografia e logo)",
        "Todas as 6 seções presentes no layout desktop",
        "Hierarquia visual clara: headline > subheadline > corpo > CTA",
        "Versão mobile totalmente adaptada (não apenas reduzida)",
        "PDF com desktop e mobile entregue",
        "Arquivo aberto com camadas organizadas e fontes incluídas",
      ],
      passingScore: 70,
      timeLimit: 120,
      enablesAdditionalTasks: [
        {
          taskId: "DC0005-T01",
          taskName: "Criação do Layout de Website",
          productId: "DC0005",
          productName: "Layout de Website",
        },
        {
          taskId: "DC0005-T02",
          taskName: "Entrega dos Arquivos Finais",
          productId: "DC0005",
          productName: "Layout de Website",
        },
      ],
      isActive: true,
      createdAt: "2026-04-28T09:00:00Z",
      preCircuit: {
        welcomeTitle: "Bem-vindo ao Circuito de Habilitação — Layout de Website",
        welcomeSubtitle:
          "Você está prestes a se habilitar para criar layouts de website pela allka. Leia com atenção antes de começar.",
        welcomeHighlights: [
          "Criação prática de uma landing page completa (desktop + mobile)",
          "Até 120 minutos para completar",
          "Nota mínima de aprovação: 70 pontos",
          "Aprovação habilita você para todas as variações do produto",
        ],
        aboutDescription:
          "Neste teste você vai criar o layout de uma landing page para a Clínica Sorriso Pleno, demonstrando domínio de web design profissional, identidade visual aplicada, hierarquia visual e adaptação responsiva para mobile.",
        aboutWhatToExpect: [
          "Ler o briefing completo da Clínica Sorriso Pleno",
          "Criar o layout desktop com 6 seções definidas no briefing",
          "Criar a versão mobile adaptada",
          "Entregar PDF com ambas as versões",
          "Entregar arquivo aberto (PSD ou Figma) com camadas organizadas",
        ],
        estimatedTime: "120 minutos",
        rules: [
          "Use Adobe Photoshop, Figma, Adobe XD ou software profissional equivalente",
          "Formato desktop: 1920×1080px | Formato mobile: 390×844px",
          "Aplicar exatamente as cores hex e tipografias fornecidas no briefing",
          "Camadas organizadas e nomeadas no arquivo aberto",
          "Todas as fontes incorporadas ou disponíveis no arquivo Figma",
        ],
        warnings: [
          "Layout sem versão mobile resulta em desconto significativo na avaliação",
          "Arquivo aberto sem camadas organizadas ou com fontes faltando não é aceito para aprovação máxima",
        ],
        confirmChecklist: [
          "Li o briefing completo da Clínica Sorriso Pleno incluindo cores, tipografia e seções",
          "Tenho software profissional de web design (Figma, Photoshop ou equivalente)",
          "Sei criar layouts responsivos para desktop e mobile",
          "Entendo que o arquivo aberto deve ter camadas organizadas e fontes incluídas",
          "Sei exportar PDF de todas as páginas do projeto",
          "Tenho 120 minutos disponíveis para completar o teste",
        ],
      },
      qualificationChecklist: {
        id: "DC0005-TEST01-CL",
        linkedTestId: "DC0005-TEST01",
        linkedTestName: "Teste de Habilitação — Layout de Website",
        passingScore: 70,
        autoApproveAbove: 90,
        autoRejectBelow: 40,
        allowPartialCorrection: true,
        internalNotes:
          "Avaliar especialmente: (1) identidade visual aplicada corretamente; (2) hierarquia visual clara em todas as seções; (3) versão mobile totalmente adaptada (não apenas redimensionada); (4) arquivo aberto com camadas organizadas; (5) todas as 6 seções presentes.",
        sections: [
          {
            id: "DC0005-CL-S01",
            title: "Identidade Visual e Estilo",
            description: "Aplicação correta da identidade visual fornecida no briefing",
            items: [
              {
                id: "DC0005-CL-S01-I01",
                label: "Cores hex aplicadas corretamente",
                description:
                  "As cores #1A6EA8, #FFFFFF e #F5F5F5 estão aplicadas conforme o briefing",
                weight: 5,
                isRequired: true,
                hint: "Verificar nas seções principais se as cores estão dentro dos valores hex especificados",
              },
              {
                id: "DC0005-CL-S01-I02",
                label: "Tipografia correta (Nunito + Open Sans)",
                description:
                  "Os títulos usam Nunito e o corpo usa Open Sans conforme o briefing",
                weight: 4,
                isRequired: true,
                hint: "Verificar em pelo menos 3 seções se a tipografia está aplicada corretamente",
              },
              {
                id: "DC0005-CL-S01-I03",
                label: "Consistência visual entre seções",
                description:
                  "O layout apresenta consistência visual em espaçamentos, alinhamentos e estilo entre todas as seções",
                weight: 3,
                isRequired: false,
                hint: "Verificar se espaçamentos, margens e padding são consistentes entre as seções",
              },
            ],
          },
          {
            id: "DC0005-CL-S02",
            title: "Estrutura e Hierarquia",
            description: "Estrutura completa e hierarquia visual correta",
            items: [
              {
                id: "DC0005-CL-S02-I01",
                label: "Todas as 6 seções presentes no layout desktop",
                description:
                  "Hero, Benefícios, Serviços, Depoimento, CTA+Formulário e Rodapé estão presentes",
                weight: 6,
                isRequired: true,
                hint: "Contar as seções: (1) Hero, (2) Benefícios, (3) Serviços, (4) Depoimento, (5) CTA+Formulário, (6) Rodapé",
              },
              {
                id: "DC0005-CL-S02-I02",
                label: "Hierarquia visual clara",
                description:
                  "Há hierarquia clara entre headline, subheadline, corpo de texto e CTA",
                weight: 4,
                isRequired: true,
                hint: "Verificar se o olho percorre naturalmente: headline grande > subheadline menor > texto explicativo > CTA em destaque",
              },
              {
                id: "DC0005-CL-S02-I03",
                label: "CTA 'Agendar consulta' em destaque no Hero",
                description:
                  "O botão de CTA principal está visível e em destaque na seção Hero",
                weight: 3,
                isRequired: false,
                hint: "O CTA deve se destacar visualmente — cor contrastante, tamanho adequado, texto legível",
              },
            ],
          },
          {
            id: "DC0005-CL-S03",
            title: "Versão Mobile",
            description: "Qualidade e completude da adaptação mobile",
            items: [
              {
                id: "DC0005-CL-S03-I01",
                label: "Layout mobile 390×844px presente e completo",
                description:
                  "A versão mobile está presente no formato correto com todas as seções adaptadas",
                weight: 7,
                isRequired: true,
                hint: "Verificar se o mobile está em 390×844px e se todas as seções estão presentes",
              },
              {
                id: "DC0005-CL-S03-I02",
                label: "Adaptação real (não apenas redimensionado)",
                description:
                  "O layout mobile é uma adaptação real, não apenas a versão desktop reduzida",
                weight: 5,
                isRequired: true,
                hint: "Verificar se colunas foram reorganizadas, se textos têm tamanho legível, se CTAs têm área de toque adequada",
              },
            ],
          },
          {
            id: "DC0005-CL-S04",
            title: "Entregáveis",
            description: "Qualidade e completude dos arquivos entregues",
            items: [
              {
                id: "DC0005-CL-S04-I01",
                label: "PDF com versão desktop e mobile",
                description:
                  "O PDF contém ambas as versões — desktop e mobile — para referência",
                weight: 4,
                isRequired: true,
                hint: "Verificar se o PDF contém pelo menos 2 páginas: desktop completo e mobile completo",
              },
              {
                id: "DC0005-CL-S04-I02",
                label: "Arquivo aberto com camadas organizadas",
                description:
                  "O arquivo PSD ou Figma tem camadas nomeadas e organizadas por seção",
                weight: 4,
                isRequired: true,
                hint: "Verificar se as camadas/frames no arquivo aberto estão nomeadas (não apenas 'Camada 1', 'Camada 2')",
              },
            ],
          },
        ],
      },
    },
  ],

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
      internalCost: 100.00,
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
            placeholder: "Exemplo: Home | Sobre nós | Serviços | Portfólio | Contato",
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
      internalCost: 175.00,
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
              "O conteúdo textual revisado pelo cliente é obrigatório para início da execução. Sem conteúdo, o nômade usará placeholder — o resultado final pode divergir do esperado.",
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
              "Envie o logotipo em vetor (AI, SVG, EPS) ou PNG em alta resolução (mínimo 500px). Se tiver manual da marca, inclua no mesmo arquivo.",
            warning:
              "O logotipo em vetor é preferencial. PNG em baixa resolução dificulta a aplicação no layout e prejudica a qualidade da entrega.",
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
      internalCost: 250.00,
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
              "O conteúdo textual revisado pelo cliente é obrigatório para início da execução. Sem conteúdo, o nômade usará placeholder — o resultado final pode divergir do esperado.",
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
      "Empresas que precisam criar ou renovar o design do seu website com identidade visual profissional",
      "Negócios que têm o site em desenvolvimento e precisam do layout antes da programação",
      "Marcas que querem garantir que o site transmita credibilidade e profissionalismo",
      "Agências e consultores que precisam do layout para apresentar ao cliente antes de programar",
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
          "Um site com design criativo e memorável diferencia sua marca da concorrência e cria uma primeira impressão duradoura nos visitantes.",
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
          "Com o layout pronto, implemente a estratégia de SEO para posicionar seu site no Google e atrair visitantes qualificados de forma orgânica.",
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
          "Não. O produto entrega o layout visual (design) em PDF e arquivo aberto. A programação do site em WordPress, Webflow ou outra plataforma é um produto separado.",
      },
      {
        question: "Em qual formato são entregues os arquivos?",
        answer:
          "PDF de todas as páginas (desktop + mobile) + arquivo aberto em PSD ou Figma com imagens e fontes incluídas. Informe sua preferência entre PSD e Figma no briefing.",
      },
      {
        question: "O que é a 'versão mobile adaptada'?",
        answer:
          "É uma versão do layout desenvolvida especificamente para telas de celular — não apenas a versão desktop reduzida. Inclui reorganização de colunas, tamanhos de texto adaptados e CTAs com área de toque adequada.",
      },
      {
        question: "Preciso ter o conteúdo textual pronto?",
        answer:
          "Recomendado, mas não obrigatório. Se não tiver os textos prontos, o nômade usa placeholders para estruturar o layout. O conteúdo final deve ser revisado pelo cliente antes da programação.",
      },
      {
        question: "Posso usar o arquivo no Figma sem conta paga?",
        answer:
          "Sim. A conta gratuita do Figma permite visualizar, comentar e exportar arquivos. Para editar, você precisará de uma conta paga ou solicitar a entrega em PSD.",
      },
      {
        question: "Quantas revisões estão incluídas?",
        answer:
          "O produto inclui uma rodada de revisão após a aprovação do PDF. Revisões adicionais ou mudanças de escopo podem gerar cobrança extra — consulte antes de solicitar.",
      },
    ],
  },
};

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("▶ Seeding DC0005 — Layout de Website...");

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
      name: "Layout de Website",
      description:
        "Criação do layout visual de website com identidade visual da marca aplicada, desenvolvido por especialista em web design. Entrega em PDF para aprovação, arquivo aberto em PSD ou Figma com imagens e fontes incluídas, e versão mobile totalmente adaptada.",
      short_description:
        "Layout profissional de website com versão desktop e mobile — arquivos abertos PSD/Figma entregues em até 7, 9 ou 15 dias úteis conforme o número de páginas.",
      category: "design",
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
      base_price: 453.60,
      complexity: "intermediate",
      visibility: JSON.stringify({
        company: true,
        agency: true,
        partner: false,
        inHouse: false,
      }),
      image: "/images/products/layout-website.jpg",
      demonstrations: JSON.stringify([
        "/images/products/layout-website.jpg",
      ]),
      completion_time: "7 dias úteis",
      metadata: JSON.stringify(layoutWebsiteMeta),
      is_active: true,
      created_at: new Date("2026-04-28T09:00:00Z"),
      updated_at: new Date(),
    },
    update: {
      name: "Layout de Website",
      description:
        "Criação do layout visual de website com identidade visual da marca aplicada, desenvolvido por especialista em web design. Entrega em PDF para aprovação, arquivo aberto em PSD ou Figma com imagens e fontes incluídas, e versão mobile totalmente adaptada.",
      short_description:
        "Layout profissional de website com versão desktop e mobile — arquivos abertos PSD/Figma entregues em até 7, 9 ou 15 dias úteis conforme o número de páginas.",
      category: "design",
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
      base_price: 453.60,
      complexity: "intermediate",
      visibility: JSON.stringify({
        company: true,
        agency: true,
        partner: false,
        inHouse: false,
      }),
      image: "/images/products/layout-website.jpg",
      demonstrations: JSON.stringify([
        "/images/products/layout-website.jpg",
      ]),
      completion_time: "7 dias úteis",
      metadata: JSON.stringify(layoutWebsiteMeta),
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log("  ✓ Produto DC0005 upserted");

  // Variações
  const variations = [
    {
      id: "DC0005-V01",
      product_id: PRODUCT_ID,
      name: "Até 5 páginas",
      description:
        "Layout de website com até 5 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
      price: 453.60,
      price_modifier: 0,
      deadline_days: 7,
      scope_description: "Layout de até 5 páginas (desktop + mobile adaptado)",
      features: JSON.stringify([
        "Até 5 páginas de layout (desktop + mobile)",
        "Formato padrão 1920×1080px",
        "Versão mobile adaptada (390×844px)",
        "Entrega em PDF para aprovação",
        "Arquivo aberto PSD ou Figma com imagens e fontes",
        "Prazo: 7 dias úteis",
      ]),
      is_active: true,
      sort_order: 1,
    },
    {
      id: "DC0005-V02",
      product_id: PRODUCT_ID,
      name: "Até 10 páginas",
      description:
        "Layout de website com até 10 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
      price: 635.04,
      price_modifier: 0,
      deadline_days: 9,
      scope_description: "Layout de até 10 páginas (desktop + mobile adaptado)",
      features: JSON.stringify([
        "Até 10 páginas de layout (desktop + mobile)",
        "Formato padrão 1920×1080px",
        "Versão mobile adaptada (390×844px)",
        "Entrega em PDF para aprovação",
        "Arquivo aberto PSD ou Figma com imagens e fontes",
        "Prazo: 9 dias úteis",
      ]),
      is_active: true,
      sort_order: 2,
    },
    {
      id: "DC0005-V03",
      product_id: PRODUCT_ID,
      name: "Até 20 páginas",
      description:
        "Layout de website com até 20 páginas — versão desktop e mobile — entregues em PDF para aprovação e arquivo aberto em PSD ou Figma.",
      price: 907.20,
      price_modifier: 0,
      deadline_days: 15,
      scope_description: "Layout de até 20 páginas (desktop + mobile adaptado)",
      features: JSON.stringify([
        "Até 20 páginas de layout (desktop + mobile)",
        "Formato padrão 1920×1080px",
        "Versão mobile adaptada (390×844px)",
        "Entrega em PDF para aprovação",
        "Arquivo aberto PSD ou Figma com imagens e fontes",
        "Prazo: 15 dias úteis",
      ]),
      is_active: true,
      sort_order: 3,
    },
  ];

  for (const v of variations) {
    await p.productVariation.create({ data: v });
  }
  console.log("  ✓ Variações criadas: DC0005-V01 (5p) | DC0005-V02 (10p) | DC0005-V03 (20p)");

  console.log("\n✅ Seed DC0005 — Layout de Website concluído com sucesso!");
  console.log("   ID:         DC0005");
  console.log("   Variações:");
  console.log("     DC0005-V01  Até 5 páginas   R$ 453,60  7 dias úteis");
  console.log("     DC0005-V02  Até 10 páginas  R$ 635,04  9 dias úteis");
  console.log("     DC0005-V03  Até 20 páginas  R$ 907,20  15 dias úteis");
  console.log("   Categoria:  Design e Criação (design)");
  console.log("   ⚠ Lembre-se: adicionar layout-website.jpg em public/images/products/");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed DC0005:", e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
