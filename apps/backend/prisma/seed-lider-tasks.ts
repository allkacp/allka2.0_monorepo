import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── IDs fixos para idempotência (upsert seguro) ───────────────────────────────
const IDS = {
  liderUser:      "seed-lider-user-01",
  liderArea:      "seed-lider-area-01",
  agenciaUser:    "seed-agencia-user-01",
  nomade1:        "seed-nomade-01",
  nomade2:        "seed-nomade-02",
  nomade3:        "seed-nomade-03",
  nomadeUser1:    "seed-nomade-user-01",
  nomadeUser2:    "seed-nomade-user-02",
  nomadeUser3:    "seed-nomade-user-03",
  hab1:           "seed-hab-01",
  hab2:           "seed-hab-02",
  hab3:           "seed-hab-03",
  company:        "seed-company-lider-01",
  product:        "seed-product-perf-01",
  project:        "seed-project-lider-01",
  projectProduct: "seed-pp-lider-01",
};

const CATEGORY = "Performance e Anúncios Patrocinados";
const AREA     = "Performance";
const CONSULTOR = "Líder Allka";

// ── Datas relativas ───────────────────────────────────────────────────────────
const now = new Date();
const past   = (days: number) => new Date(now.getTime() - days * 86_400_000);
const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

// ── Perguntas de briefing (snapshot) — comuns a todas as tarefas de performance ─
const BRIEFING_QUESTIONS = [
  { key: "objetivo",  text: "Qual é o objetivo principal desta entrega?" },
  { key: "publico",   text: "Quem é o público-alvo da campanha?" },
  { key: "orcamento", text: "Qual o orçamento de mídia disponível?" },
  { key: "kpi",       text: "Quais KPIs serão usados para medir sucesso?" },
  { key: "prazo",     text: "Qual o prazo e período de veiculação?" },
  { key: "canais",    text: "Em quais canais a campanha será veiculada?" },
];

// ── Etapas padrão por status ──────────────────────────────────────────────────
const STAGE_TITLES = [
  { titulo: "Briefing & Acessos",     descricao: "Coleta de briefing, acessos às contas de anúncio e validação de informações iniciais." },
  { titulo: "Configuração & Setup",   descricao: "Estruturação de campanhas, grupos de anúncio, públicos e instalação de pixel/tags de conversão." },
  { titulo: "Execução & Otimização",  descricao: "Veiculação, monitoramento diário, ajuste de lances e otimização de criativos." },
  { titulo: "Entrega & Validação",    descricao: "Compilação de relatório de resultados, validação de metas e entrega final ao cliente." },
];

function stagesFor(status: string): string[] {
  switch (status) {
    case "PARA_LANCAMENTO":                 return ["EM_ANDAMENTO", "PENDENTE", "PENDENTE", "PENDENTE"];
    case "LANCAMENTO_ENVIADO_PARA_ANALISE": return ["CONCLUIDA", "EM_ANDAMENTO", "PENDENTE", "PENDENTE"];
    case "EM_EXECUCAO":                     return ["CONCLUIDA", "CONCLUIDA", "EM_ANDAMENTO", "PENDENTE"];
    case "ENTREGA_PENDENTE":                return ["CONCLUIDA", "CONCLUIDA", "CONCLUIDA", "EM_ANDAMENTO"];
    case "ENTREGA_ATRASADA":                return ["CONCLUIDA", "CONCLUIDA", "CONCLUIDA", "EM_ANDAMENTO"];
    case "REPROVADA":                       return ["CONCLUIDA", "CONCLUIDA", "EM_ANDAMENTO", "PENDENTE"];
    case "APROVADA":                        return ["CONCLUIDA", "CONCLUIDA", "CONCLUIDA", "CONCLUIDA"];
    default:                                return ["PENDENTE", "PENDENTE", "PENDENTE", "PENDENTE"];
  }
}

// ── Datas do ciclo de vida por status ─────────────────────────────────────────
function lifecycleDates(status: string) {
  switch (status) {
    case "PARA_LANCAMENTO":
      return { start_date: past(2), data_lancamento: null, data_inicio_execucao: null, data_conclusao: null, completed_at: null };
    case "LANCAMENTO_ENVIADO_PARA_ANALISE":
      return { start_date: past(5), data_lancamento: past(3), data_inicio_execucao: null, data_conclusao: null, completed_at: null };
    case "EM_EXECUCAO":
      return { start_date: past(10), data_lancamento: past(8), data_inicio_execucao: past(6), data_conclusao: null, completed_at: null };
    case "ENTREGA_PENDENTE":
      return { start_date: past(15), data_lancamento: past(13), data_inicio_execucao: past(10), data_conclusao: null, completed_at: null };
    case "ENTREGA_ATRASADA":
      return { start_date: past(20), data_lancamento: past(18), data_inicio_execucao: past(15), data_conclusao: null, completed_at: null };
    case "REPROVADA":
      return { start_date: past(22), data_lancamento: past(20), data_inicio_execucao: past(16), data_conclusao: null, completed_at: null };
    case "APROVADA":
      return { start_date: past(28), data_lancamento: past(26), data_inicio_execucao: past(22), data_conclusao: past(1), completed_at: past(1) };
    default:
      return { start_date: past(2), data_lancamento: null, data_inicio_execucao: null, data_conclusao: null, completed_at: null };
  }
}

// ── Definição completa das 15 tarefas ─────────────────────────────────────────
type SeedTask = {
  id: string;
  code: string;
  title: string;
  status: string;
  due_date: Date;
  priority: string;
  fase: string;
  nomadeId: string;
  description: string;
  brief: { objetivo: string; publico: string; orcamento: string; kpi: string; prazo: string; canais: string };
  observations?: string;
  hasDelivery?: boolean;
};

const TASKS: SeedTask[] = [
  // ── Para Qualificar (3) ──────────────────────────────────────────────────
  {
    id: "seed-task-01", code: "T-SEED-001", title: "Criar campanha Google Ads — Q2",
    status: "PARA_LANCAMENTO", due_date: future(7), priority: "high", fase: "Planejamento", nomadeId: IDS.nomade1,
    description: "Estruturar e lançar uma nova campanha de Search no Google Ads para o segundo trimestre, focada em geração de leads qualificados para o produto principal do cliente. Inclui pesquisa de palavras-chave, estrutura de grupos de anúncio, redação de anúncios responsivos e configuração de conversões.",
    brief: {
      objetivo: "Gerar 150 leads qualificados/mês com CPL abaixo de R$ 45,00.",
      publico: "Gestores e diretores de PMEs, 30-55 anos, regiões metropolitanas de SP, RJ e MG.",
      orcamento: "R$ 12.000,00/mês em mídia (Google Ads Search + PMax).",
      kpi: "CPL, taxa de conversão, volume de leads, ROAS.",
      prazo: "Início imediato, veiculação contínua durante todo o Q2.",
      canais: "Google Ads — Rede de Pesquisa e Performance Max.",
    },
  },
  {
    id: "seed-task-02", code: "T-SEED-002", title: "Otimizar campanhas de remarketing",
    status: "PARA_LANCAMENTO", due_date: future(10), priority: "medium", fase: "Planejamento", nomadeId: IDS.nomade2,
    description: "Revisar e otimizar as campanhas de remarketing ativas no Meta Ads e Google Ads, segmentando públicos por estágio do funil e ajustando criativos para reduzir o custo por aquisição e reengajar visitantes que não converteram.",
    brief: {
      objetivo: "Reduzir o CPA de remarketing em 20% e aumentar a taxa de reengajamento.",
      publico: "Visitantes do site nos últimos 30 dias que não finalizaram a compra; carrinhos abandonados.",
      orcamento: "R$ 4.500,00/mês dedicados a remarketing.",
      kpi: "CPA, frequência, CTR, taxa de recuperação de carrinho.",
      prazo: "Otimização contínua, revisão semanal.",
      canais: "Meta Ads (Facebook/Instagram) e Google Display.",
    },
  },
  {
    id: "seed-task-03", code: "T-SEED-003", title: "Análise de palavras-chave SEO",
    status: "PARA_LANCAMENTO", due_date: future(5), priority: "medium", fase: "Pesquisa", nomadeId: IDS.nomade3,
    description: "Realizar pesquisa aprofundada de palavras-chave para embasar a estratégia de conteúdo orgânico, identificando termos de alto volume e baixa concorrência, intenção de busca e oportunidades de ranqueamento para o blog e páginas de produto.",
    brief: {
      objetivo: "Mapear 50 palavras-chave prioritárias e gerar um plano de conteúdo de 3 meses.",
      publico: "Usuários em fase de pesquisa e consideração buscando soluções do segmento.",
      orcamento: "Não aplicável (entrega de planejamento orgânico).",
      kpi: "Volume de busca, dificuldade SEO, potencial de tráfego, posição média.",
      prazo: "Entrega do relatório em até 5 dias úteis.",
      canais: "Google (busca orgânica) — blog e páginas institucionais.",
    },
  },
  // ── Em Execução (3) ──────────────────────────────────────────────────────
  {
    id: "seed-task-04", code: "T-SEED-004", title: "Relatório mensal de performance",
    status: "EM_EXECUCAO", due_date: future(3), priority: "high", fase: "Execução", nomadeId: IDS.nomade1,
    description: "Compilar o relatório mensal consolidado de performance de todas as campanhas pagas, com análise de resultados, insights de otimização e recomendações estratégicas para o próximo ciclo.",
    brief: {
      objetivo: "Apresentar resultados consolidados e direcionar a estratégia do próximo mês.",
      publico: "Diretoria e time de marketing do cliente.",
      orcamento: "Consolidado de R$ 16.500,00 investidos no mês.",
      kpi: "ROAS, CAC, leads, receita atribuída, evolução mês a mês.",
      prazo: "Entrega até o 5º dia útil do mês.",
      canais: "Consolidado: Google Ads, Meta Ads e LinkedIn Ads.",
    },
  },
  {
    id: "seed-task-05", code: "T-SEED-005", title: "Configuração de pixel de conversão",
    status: "EM_EXECUCAO", due_date: future(4), priority: "urgent", fase: "Execução", nomadeId: IDS.nomade2,
    description: "Implementar e validar o pixel da Meta e as tags de conversão do Google via Google Tag Manager, configurando eventos de compra, lead e adição ao carrinho com deduplicação e API de Conversões.",
    brief: {
      objetivo: "Garantir rastreamento confiável de conversões com matching avançado.",
      publico: "Todos os visitantes do site e e-commerce do cliente.",
      orcamento: "Não aplicável (setup técnico).",
      kpi: "Eventos disparados corretamente, qualidade do evento (EMQ), deduplicação.",
      prazo: "Conclusão em até 4 dias úteis.",
      canais: "GTM, Meta Pixel + CAPI, Google Ads tags, GA4.",
    },
  },
  {
    id: "seed-task-06", code: "T-SEED-006", title: "Criação de públicos personalizados",
    status: "EM_EXECUCAO", due_date: future(6), priority: "medium", fase: "Execução", nomadeId: IDS.nomade3,
    description: "Construir públicos personalizados e semelhantes (lookalike) no Meta Ads e Google Ads a partir de listas de clientes, engajamento e eventos do site, para alimentar campanhas de prospecção e remarketing.",
    brief: {
      objetivo: "Criar segmentações de alta qualidade para escalar a aquisição.",
      publico: "Base de clientes atual + lookalikes 1-3% + engajadores de redes sociais.",
      orcamento: "Aplicado nas campanhas existentes.",
      kpi: "Tamanho e qualidade dos públicos, CTR e CPA por segmento.",
      prazo: "Conclusão em até 6 dias úteis.",
      canais: "Meta Ads e Google Ads (Customer Match).",
    },
  },
  // ── Briefings para Revisar (2) ───────────────────────────────────────────
  {
    id: "seed-task-07", code: "T-SEED-007", title: "Briefing campanha Black Friday",
    status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(2), priority: "urgent", fase: "Lançamento", nomadeId: IDS.nomade1,
    description: "Briefing e plano de mídia para a campanha de Black Friday, com estratégia de aquecimento, pico de ofertas e remarketing pós-data, contemplando criativos, orçamento escalonado e cronograma.",
    brief: {
      objetivo: "Maximizar vendas no período de Black Friday com ROAS mínimo de 6x.",
      publico: "Clientes recorrentes + prospecção quente aquecida nas semanas anteriores.",
      orcamento: "R$ 35.000,00 escalonados (aquecimento, pico e pós).",
      kpi: "ROAS, receita total, ticket médio, número de pedidos.",
      prazo: "Veiculação de 18/11 a 02/12, com pico em 29/11.",
      canais: "Meta Ads, Google Ads (Search + Shopping + PMax) e TikTok Ads.",
    },
  },
  {
    id: "seed-task-08", code: "T-SEED-008", title: "Briefing campanha institucional",
    status: "LANCAMENTO_ENVIADO_PARA_ANALISE", due_date: future(1), priority: "medium", fase: "Lançamento", nomadeId: IDS.nomade2,
    description: "Briefing da campanha institucional de fortalecimento de marca, com foco em alcance, reconhecimento e consideração, definindo mensagem, identidade visual dos criativos e métricas de brand lift.",
    brief: {
      objetivo: "Aumentar reconhecimento de marca e alcance qualificado no segmento.",
      publico: "Público amplo do setor, decisores e influenciadores de compra.",
      orcamento: "R$ 8.000,00/mês para topo de funil.",
      kpi: "Alcance, frequência, brand lift, CPM, visualizações de vídeo.",
      prazo: "Campanha contínua de 3 meses.",
      canais: "Meta Ads, YouTube Ads e LinkedIn Ads.",
    },
  },
  // ── Entregas Aguardando Análise (2) ──────────────────────────────────────
  {
    id: "seed-task-09", code: "T-SEED-009", title: "Entrega relatório de impressões",
    status: "ENTREGA_PENDENTE", due_date: past(1), priority: "high", fase: "Entrega", nomadeId: IDS.nomade3,
    description: "Relatório detalhado de impressões e share of voice das campanhas de display e vídeo, com análise de cobertura por região e dispositivo, pronto para validação do líder.",
    brief: {
      objetivo: "Demonstrar a cobertura de mídia e o share of voice alcançado.",
      publico: "Time de marketing e diretoria do cliente.",
      orcamento: "Referente a R$ 6.000,00 de display/vídeo no período.",
      kpi: "Impressões, alcance, share of voice, CPM, viewability.",
      prazo: "Entregue — aguardando análise do líder.",
      canais: "Google Display & Video 360 e YouTube.",
    },
    hasDelivery: true,
  },
  {
    id: "seed-task-10", code: "T-SEED-010", title: "Entrega de criativos para Meta Ads",
    status: "ENTREGA_PENDENTE", due_date: past(2), priority: "medium", fase: "Entrega", nomadeId: IDS.nomade1,
    description: "Pacote de criativos estáticos e em vídeo para as campanhas de Meta Ads, nos formatos feed, stories e reels, seguindo o guia de marca e as melhores práticas de conversão.",
    brief: {
      objetivo: "Entregar variações de criativos para teste A/B nas campanhas de aquisição.",
      publico: "Prospecção fria e remarketing no Meta.",
      orcamento: "Criativos para campanhas de R$ 9.000,00/mês.",
      kpi: "CTR, taxa de conversão, hook rate, custo por resultado.",
      prazo: "Entregue — aguardando análise do líder.",
      canais: "Meta Ads — Feed, Stories e Reels.",
    },
    hasDelivery: true,
  },
  // ── Tarefas Atrasadas (2) ────────────────────────────────────────────────
  {
    id: "seed-task-11", code: "T-SEED-011", title: "Ajuste de lances por horário",
    status: "ENTREGA_ATRASADA", due_date: past(5), priority: "high", fase: "Entrega", nomadeId: IDS.nomade2,
    description: "Implementar ajustes de lance por faixa horária e dia da semana com base na análise de conversões, concentrando investimento nos períodos de maior performance.",
    brief: {
      objetivo: "Aumentar a eficiência do orçamento priorizando horários de alta conversão.",
      publico: "Mesmo público das campanhas de Search ativas.",
      orcamento: "Otimização sobre R$ 12.000,00/mês já investidos.",
      kpi: "CPA por faixa horária, taxa de conversão, economia de orçamento.",
      prazo: "Atrasada — entrega pendente de regularização.",
      canais: "Google Ads — Rede de Pesquisa.",
    },
    hasDelivery: true,
  },
  {
    id: "seed-task-12", code: "T-SEED-012", title: "Atualização de estratégia de lances",
    status: "ENTREGA_ATRASADA", due_date: past(8), priority: "urgent", fase: "Entrega", nomadeId: IDS.nomade3,
    description: "Migrar as campanhas de lance manual para estratégias automatizadas de Smart Bidding (tROAS/tCPA), com período de aprendizado monitorado e validação de resultados.",
    brief: {
      objetivo: "Melhorar performance com lances inteligentes baseados em metas.",
      publico: "Todas as campanhas de conversão da conta.",
      orcamento: "R$ 12.000,00/mês — sem alteração de verba.",
      kpi: "ROAS/CPA alvo atingido, estabilidade pós-aprendizado.",
      prazo: "Atrasada — entrega pendente de regularização.",
      canais: "Google Ads — Search e Performance Max.",
    },
    hasDelivery: true,
  },
  // ── Devolvidas (2) ───────────────────────────────────────────────────────
  {
    id: "seed-task-13", code: "T-SEED-013", title: "Revisão de copy dos anúncios",
    status: "REPROVADA", due_date: past(3), priority: "medium", fase: "Revisão", nomadeId: IDS.nomade1,
    description: "Revisão e reescrita dos textos dos anúncios responsivos de Search, com novos títulos e descrições orientados a benefícios e CTAs mais fortes.",
    brief: {
      objetivo: "Elevar o CTR e o Índice de Qualidade com copy mais persuasivo.",
      publico: "Mesmo público das campanhas de Search.",
      orcamento: "Não aplicável (otimização de criativo).",
      kpi: "CTR, Índice de Qualidade, taxa de conversão.",
      prazo: "Devolvida — requer correções.",
      canais: "Google Ads — Anúncios Responsivos de Pesquisa.",
    },
    observations: "Devolvida pelo líder: os títulos ainda não exploram os diferenciais do produto e há 3 anúncios com 'baixo desempenho'. Reescrever os títulos 4 a 8 com foco em benefício e incluir prova social na descrição 2.",
  },
  {
    id: "seed-task-14", code: "T-SEED-014", title: "Reestruturação de grupos de anúncio",
    status: "REPROVADA", due_date: past(6), priority: "high", fase: "Revisão", nomadeId: IDS.nomade2,
    description: "Reorganizar os grupos de anúncio por tema e intenção de busca (SKAG/STAG), melhorando a relevância entre palavra-chave, anúncio e página de destino.",
    brief: {
      objetivo: "Aumentar relevância e reduzir CPC com estrutura mais granular.",
      publico: "Mesmo público das campanhas de Search.",
      orcamento: "Otimização estrutural — sem alteração de verba.",
      kpi: "Índice de Qualidade, CPC médio, CTR por grupo.",
      prazo: "Devolvida — requer correções.",
      canais: "Google Ads — Rede de Pesquisa.",
    },
    observations: "Devolvida pelo líder: a nova estrutura misturou intenções de busca em alguns grupos. Separar termos transacionais de informacionais e revisar as palavras-chave negativas compartilhadas antes de reenviar.",
  },
  // ── Aprovada (1) ─────────────────────────────────────────────────────────
  {
    id: "seed-task-15", code: "T-SEED-015", title: "Campanha sazonal aprovada",
    status: "APROVADA", due_date: past(1), priority: "medium", fase: "Concluída", nomadeId: IDS.nomade3,
    description: "Campanha sazonal de fim de período com ofertas especiais, criativos temáticos e plano de mídia escalonado. Executada, validada e aprovada pelo líder com metas atingidas.",
    brief: {
      objetivo: "Impulsionar vendas no período sazonal com ofertas limitadas.",
      publico: "Base de clientes + prospecção quente.",
      orcamento: "R$ 18.000,00 no período da campanha.",
      kpi: "ROAS, receita, número de pedidos, ticket médio.",
      prazo: "Concluída e aprovada.",
      canais: "Meta Ads e Google Ads (Search + PMax).",
    },
    hasDelivery: true,
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Este seed não pode rodar em produção.");
    process.exit(1);
  }

  const seedPassword = process.env.SEED_TEST_USER_PASSWORD;
  if (!seedPassword) {
    console.error("❌ SEED_TEST_USER_PASSWORD não configurado no .env");
    process.exit(1);
  }

  console.log("🌱 Iniciando seed de dados do líder...");
  const hash = await bcrypt.hash(seedPassword, 10);

  // ── 1. Usuário líder ──────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { id: IDS.liderUser },
    update: { password_hash: hash },
    create: {
      id:            IDS.liderUser,
      email:         "lider@allka.com.vc",
      password_hash: hash,
      name:          CONSULTOR,
      role:          "lider",
      account_type:  "lider",
      is_active:     true,
    },
  });
  console.log("  ✅ Usuário líder criado: lider@allka.com.vc");

  // ── 2. Área do líder ──────────────────────────────────────────────────────
  await prisma.liderArea.upsert({
    where: { id: IDS.liderArea },
    update: {},
    create: {
      id:                     IDS.liderArea,
      user_id:                IDS.liderUser,
      area_nome:              AREA,
      categorias_permitidas:  JSON.stringify([CATEGORY, "SEO"]),
      produtos_permitidos:    JSON.stringify([IDS.product]),
      ativo:                  true,
    },
  });
  console.log("  ✅ Área do líder configurada: Performance");

  // ── 3. Usuário da agência (responsável pelas tarefas) ─────────────────────
  await prisma.user.upsert({
    where: { id: IDS.agenciaUser },
    update: { password_hash: hash },
    create: {
      id:            IDS.agenciaUser,
      email:         "agencia.seed@allka.com.vc",
      password_hash: hash,
      name:          "Agência Performance Seed",
      role:          "agency",
      account_type:  "agencias",
      is_active:     true,
    },
  });
  console.log("  ✅ Usuário da agência criado");

  // ── 4. Usuários para os nômades ───────────────────────────────────────────
  const nomadeEmails = [
    { id: IDS.nomadeUser1, email: "nomade.seed1@allka.com.vc", name: "Ana Pereira" },
    { id: IDS.nomadeUser2, email: "nomade.seed2@allka.com.vc", name: "Bruno Lima"  },
    { id: IDS.nomadeUser3, email: "nomade.seed3@allka.com.vc", name: "Carla Souza" },
  ];
  for (const u of nomadeEmails) {
    await prisma.user.upsert({
      where:  { id: u.id },
      update: { password_hash: hash },
      create: {
        id:            u.id,
        email:         u.email,
        password_hash: hash,
        name:          u.name,
        role:          "nomad",
        account_type:  "nomades",
        is_active:     true,
      },
    });
  }

  // ── 5. Nômades com habilidades na área do líder ───────────────────────────
  const nomades = [
    { id: IDS.nomade1, userId: IDS.nomadeUser1, habId: IDS.hab1, name: "Ana Pereira",  email: "nomade.seed1@allka.com.vc", level: "gold",   score: 820 },
    { id: IDS.nomade2, userId: IDS.nomadeUser2, habId: IDS.hab2, name: "Bruno Lima",   email: "nomade.seed2@allka.com.vc", level: "silver", score: 430 },
    { id: IDS.nomade3, userId: IDS.nomadeUser3, habId: IDS.hab3, name: "Carla Souza",  email: "nomade.seed3@allka.com.vc", level: "bronze", score: 180 },
  ];

  for (const n of nomades) {
    const nomade = await prisma.nomade.upsert({
      where:  { id: n.id },
      update: {},
      create: {
        id:                      n.id,
        user_id:                 n.userId,
        name:                    n.name,
        email:                   n.email,
        level:                   n.level,
        status:                  "ativo",
        score:                   n.score,
        tasks_completed_total:   Math.floor(n.score / 10),
        tasks_completed_quarter: Math.floor(n.score / 40),
        is_leader:               false,
        performance_avg_rating:  4.2 + Math.random() * 0.7,
        performance_on_time:     0.85 + Math.random() * 0.1,
        performance_rejection_rate: 0.05,
        areas_of_interest: JSON.stringify([AREA]),
      },
    });

    const habExists = await prisma.nomadeHabilidade.findUnique({ where: { id: n.habId } });
    if (!habExists) {
      await prisma.nomadeHabilidade.create({
        data: {
          id:               n.habId,
          nomade_id:        nomade.id,
          area:             AREA,
          categoria_produto: CATEGORY,
          nota_media:       4.0 + Math.random() * 0.9,
          disponibilidade:  "disponivel",
          ativo:            true,
        },
      });
    }
  }
  console.log("  ✅ 3 nômades criados com habilidades em Performance");

  // ── 6. Empresa cliente ────────────────────────────────────────────────────
  await prisma.company.upsert({
    where:  { id: IDS.company },
    update: {},
    create: {
      id:     IDS.company,
      name:   "Empresa Seed Performance",
      cnpj:   "00.000.000/0001-99",
      status: "ativo",
      email:  "contato@seedperformance.com.br",
      phone:  "(11) 3555-7788",
    },
  });
  console.log("  ✅ Empresa cliente criada");

  // ── 7. Produto ────────────────────────────────────────────────────────────
  await prisma.product.upsert({
    where:  { id: IDS.product },
    update: {},
    create: {
      id:          IDS.product,
      name:        "Gestão de Performance",
      description: "Gestão completa de campanhas de performance e anúncios patrocinados",
      category:    CATEGORY,
      base_price:  2500,
      complexity:  "intermediate",
      is_active:   true,
    },
  });
  console.log("  ✅ Produto criado: Gestão de Performance");

  // ── 8. Projeto ────────────────────────────────────────────────────────────
  await prisma.project.upsert({
    where:  { id: IDS.project },
    update: {
      consultant:       CONSULTOR,
      consultant_email: "lider@allka.com.vc",
      type:             "Marketing Digital",
      description:      "Projeto de gestão de performance e mídia paga para a Empresa Seed Performance, com campanhas em Google Ads, Meta Ads e estratégia de SEO.",
    },
    create: {
      id:               IDS.project,
      title:            "Projeto Allka Seed",
      description:      "Projeto de gestão de performance e mídia paga para a Empresa Seed Performance, com campanhas em Google Ads, Meta Ads e estratégia de SEO.",
      client_id:        IDS.company,
      status:           "in-progress",
      lifecycle:        "mensal",
      type:             "Marketing Digital",
      value:            5000,
      budget:           5000,
      progress:         40,
      consultant:       CONSULTOR,
      consultant_email: "lider@allka.com.vc",
      start_date:       past(30),
    },
  });
  console.log("  ✅ Projeto criado: Projeto Allka Seed");

  // ── 9. ProjectProduct ─────────────────────────────────────────────────────
  const ppExists = await prisma.projectProduct.findUnique({
    where: { project_id_product_id: { project_id: IDS.project, product_id: IDS.product } },
  });
  if (!ppExists) {
    await prisma.projectProduct.create({
      data: {
        id:                            IDS.projectProduct,
        project_id:                    IDS.project,
        product_id:                    IDS.product,
        product_name_snapshot:         "Gestão de Performance",
        product_code_snapshot:         "PERF-001",
        product_category_snapshot:     CATEGORY,
        product_price_snapshot:        2500,
        preco_final_cliente_snapshot:  2500,
        comissao_snapshot:             0,
        pagador_snapshot:              "AGENCIA",
        status:                        "EM_EXECUCAO",
      },
    });
  }
  console.log("  ✅ ProjectProduct criado");

  // ── 10. ProjectTasks (15 tarefas com dados completos) ─────────────────────
  const briefingSnapshot = JSON.stringify(BRIEFING_QUESTIONS);
  let created = 0;
  let updated = 0;

  for (const t of TASKS) {
    const dates = lifecycleDates(t.status);

    // Checklist contextual da tarefa
    const checklist = [
      { id: "c1", text: "Briefing coletado e validado",            done: true },
      { id: "c2", text: "Acessos às contas de anúncio liberados",  done: true },
      { id: "c3", text: "Estrutura de campanha definida",          done: dates.data_inicio_execucao !== null },
      { id: "c4", text: "Pixel/tags de conversão validados",       done: dates.data_inicio_execucao !== null },
      { id: "c5", text: "Relatório de resultados gerado",          done: t.status === "APROVADA" },
    ];

    // Steps snapshot (resumo das etapas) + dados base
    const stepsSnapshot = JSON.stringify(
      STAGE_TITLES.map((s, i) => ({
        ref: `E0${i + 1}`,
        titulo: s.titulo,
        descricao: s.descricao,
        ordem: i + 1,
        obrigatoria: true,
      })),
    );

    const baseData = {
      project_id:            IDS.project,
      project_product_id:    IDS.projectProduct,
      product_id:            IDS.product,
      task_code:             t.code,
      code_snapshot:         t.code,
      title:                 t.title,
      name_snapshot:         t.title,
      category_snapshot:     CATEGORY,
      description:           t.description,
      status:                t.status,
      priority:              t.priority,
      fase:                  t.fase,
      phase:                 t.fase,
      due_date:              t.due_date,
      start_date:            dates.start_date,
      data_lancamento:       dates.data_lancamento,
      data_inicio_execucao:  dates.data_inicio_execucao,
      data_conclusao:        dates.data_conclusao,
      completed_at:          dates.completed_at,
      lider_responsavel_id:  IDS.liderUser,
      responsavel_agencia_id: IDS.agenciaUser,
      nomade_responsavel_id: t.nomadeId,
      observations:          t.observations ?? null,
      briefing_snapshot:     briefingSnapshot,
      checklist_snapshot:    JSON.stringify(checklist),
      steps_snapshot:        stepsSnapshot,
    };

    const exists = await prisma.projectTask.findUnique({ where: { id: t.id } });
    if (exists) {
      await prisma.projectTask.update({ where: { id: t.id }, data: baseData });
      updated++;
    } else {
      await prisma.projectTask.create({ data: { id: t.id, ...baseData } });
      created++;
    }

    // ── Briefing answers (recria sempre p/ idempotência) ──────────────────
    await prisma.taskBriefingAnswer.deleteMany({ where: { project_task_id: t.id } });
    const answerMap: Record<string, string> = {
      objetivo:  t.brief.objetivo,
      publico:   t.brief.publico,
      orcamento: t.brief.orcamento,
      kpi:       t.brief.kpi,
      prazo:     t.brief.prazo,
      canais:    t.brief.canais,
    };
    for (const q of BRIEFING_QUESTIONS) {
      await prisma.taskBriefingAnswer.create({
        data: {
          project_task_id: t.id,
          question_key:    q.key,
          question_text:   q.text,
          answer:          answerMap[q.key] ?? "",
        },
      });
    }

    // ── Etapas (recria sempre p/ idempotência) ────────────────────────────
    await prisma.projectTaskStage.deleteMany({ where: { project_task_id: t.id } });
    const stageStatuses = stagesFor(t.status);
    for (let i = 0; i < STAGE_TITLES.length; i++) {
      await prisma.projectTaskStage.create({
        data: {
          project_task_id:   t.id,
          catalog_step_ref:  `E0${i + 1}`,
          titulo:            STAGE_TITLES[i].titulo,
          descricao:         STAGE_TITLES[i].descricao,
          ordem:             i + 1,
          status:            stageStatuses[i],
          obrigatoria:       true,
          briefing_necessario: i === 0,
          checklist_snapshot: JSON.stringify(checklist.slice(0, 3)),
        },
      });
    }

    // ── Anexos (recria sempre p/ idempotência) ────────────────────────────
    await prisma.taskAttachment.deleteMany({ where: { project_task_id: t.id } });
    // Referência sempre presente
    await prisma.taskAttachment.create({
      data: {
        project_task_id: t.id,
        type:            "reference",
        name:            "Guia de marca e diretrizes da campanha.pdf",
        url:             "https://exemplo.allka.com.vc/seed/guia-de-marca.pdf",
        size:            842_137,
        mime_type:       "application/pdf",
        observations:    "Material de referência enviado pela agência no briefing.",
        uploaded_by:     "Agência Performance Seed",
      },
    });
    // Entrega para tarefas com hasDelivery
    if (t.hasDelivery) {
      await prisma.taskAttachment.create({
        data: {
          project_task_id: t.id,
          type:            "delivery",
          name:            `Entrega — ${t.title}.pdf`,
          url:             "https://exemplo.allka.com.vc/seed/entrega-final.pdf",
          size:            1_284_902,
          mime_type:       "application/pdf",
          observations:    "Entrega submetida pelo nômade para análise do líder.",
          uploaded_by:     nomades.find((n) => n.id === t.nomadeId)?.name ?? "Nômade",
        },
      });
    }
  }
  console.log(`  ✅ 15 tarefas com dados completos (${created} criadas, ${updated} atualizadas)`);
  console.log("     • briefing + respostas, etapas, checklist, anexos, responsáveis e datas preenchidos");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("   Login líder: lider@allka.com.vc / (SEED_TEST_USER_PASSWORD)");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
