/**
 * seed-demo-project-task-assets.ts
 * Cria TaskBriefingAnswers e TaskAttachments para as 90 tarefas existentes.
 *
 * IDEMPOTENTE: rodar N vezes produz o mesmo resultado.
 * Briefings: upsert por @@unique [project_task_id, question_key].
 * Attachments: cria somente se não existir anexo com mesmo nome na tarefa.
 *
 * NÃO altera: Project, ProjectProduct, ProjectTask, ProjectTaskStage,
 *             Invoices, Payments.
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-task-assets -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-task-assets
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Hash determinístico ────────────────────────────────────────────────────────
function dh(idx: number, seed: number = 1): number {
  return ((idx * 2654435761 + seed * 40503) >>> 0);
}
function pick<T>(arr: T[], idx: number, seed: number = 1): T {
  return arr[dh(idx, seed) % arr.length];
}
function inRange(idx: number, min: number, max: number, seed: number = 1): number {
  if (min >= max) return min;
  return min + (dh(idx, seed) % (max - min + 1));
}

// ── Marcas demo genéricas (nunca usar clientes reais) ─────────────────────────
const DEMO_BRANDS = [
  "Marca Aurora",
  "Café Norte",
  "Clínica Horizonte",
  "Loja Prisma",
  "Grupo Atlas",
  "Studio Via",
  "Plataforma Allka Demo",
  "Construtora Zenith",
  "Escola Lumina",
  "Fintech Vela",
];

// ── Templates de perguntas por categoria de produto ───────────────────────────

type BriefingTemplate = { key: string; text: string; answers: string[] }[];

const BRIEFING_TEMPLATES: Record<string, BriefingTemplate> = {
  "Design e Criação": [
    {
      key: "q_objetivo",
      text: "Qual é o objetivo principal desta peça?",
      answers: [
        "Comunicar o lançamento da nova linha de produtos para o público jovem adulto.",
        "Fortalecer o posicionamento de marca premium no mercado regional.",
        "Gerar reconhecimento de marca em canais digitais e ponto de venda.",
      ],
    },
    {
      key: "q_publico",
      text: "Quem é o público-alvo?",
      answers: [
        "Mulheres de 25 a 40 anos, classe B/C, interessadas em bem-estar e lifestyle.",
        "Empreendedores e gestores de pequenas empresas, 30–50 anos.",
        "Profissionais de saúde, prioritariamente médicos e enfermeiros.",
      ],
    },
    {
      key: "q_referencias",
      text: "Há referências visuais ou de estilo para seguir?",
      answers: [
        "Sim. Referências anexadas no briefing. Estilo clean, tipografia sem serifa, paleta neutra.",
        "Sim. Manual de marca v2 disponível em assets.allka.test/demo/guia-marca.pdf.",
        "Sem referências externas. Seguir identidade visual do guia de marca anexado.",
      ],
    },
    {
      key: "q_cores",
      text: "Existem cores ou elementos obrigatórios?",
      answers: [
        "Sim. Azul #1A56DB e branco são as cores primárias. Logotipo deve aparecer no canto superior esquerdo.",
        "Não há restrição rígida, mas preferência por tons terrosos e quentes.",
        "Paleta definida no guia de marca: primária verde #2E7D32, secundária creme #FFF8E1.",
      ],
    },
    {
      key: "q_formatos",
      text: "Quais formatos finais são esperados?",
      answers: [
        "PDF editável + PNG em alta resolução (300dpi). Formatos: A4 e 1080×1080px para social.",
        "Arquivos em AI e PDF. Versões para print e digital.",
        "PNG e SVG em vetor. Tamanhos: 1920×1080 (banner) e 400×400 (ícone).",
      ],
    },
    {
      key: "q_restricoes",
      text: "Há restrições de marca ou conteúdo?",
      answers: [
        "Não usar imagens de rostos sem autorização. Manter área de respiro mínima de 20px.",
        "Proibido usar fotografia de concorrentes. Texto deve ter no máximo 30 palavras.",
        "Aprovação necessária do setor jurídico antes da publicação de qualquer copy.",
      ],
    },
  ],

  "Performance e Anúncios Patrocinados": [
    {
      key: "q_objetivo",
      text: "Qual é o objetivo da campanha?",
      answers: [
        "Geração de leads qualificados via Google Ads. Meta: 150 leads/mês com CPL abaixo de R$35.",
        "Aumento de tráfego orgânico em 30% em 90 dias focando em palavras-chave de cauda longa.",
        "Reconhecimento de marca em Meta Ads com foco em jovens de 18–30 anos na região Sul.",
      ],
    },
    {
      key: "q_publico",
      text: "Qual é o público-alvo da campanha?",
      answers: [
        "Gestores de RH e diretores de PMEs, interessados em soluções de produtividade.",
        "Consumidores finais buscando por serviços de saúde preventiva na cidade de São Paulo.",
        "Estudantes universitários, 18–25 anos, interessados em tecnologia e educação online.",
      ],
    },
    {
      key: "q_canais",
      text: "Quais canais serão utilizados?",
      answers: [
        "Google Search + Display. Sem remarketing nesta fase.",
        "Meta Ads (Facebook + Instagram) e TikTok Ads.",
        "Google Ads (Search) + SEO on-page para as 20 páginas principais do site.",
      ],
    },
    {
      key: "q_palavras_chave",
      text: "Há palavras-chave prioritárias ou restritas?",
      answers: [
        "Positivas: 'software gestão rh', 'sistema rh pme', 'folha de pagamento online'. Negativas: 'gratuito', 'pirata'.",
        "Foco em termos de intenção de compra. Evitar termos muito genéricos (ex: 'saúde').",
        "Lista de 45 palavras-chave já aprovada e disponível em arquivos do briefing.",
      ],
    },
    {
      key: "q_verba",
      text: "Qual é a verba disponível e restrições de budget?",
      answers: [
        "R$ 3.500/mês. Sem variação permitida acima de 10% sem aprovação.",
        "Verba flexível entre R$ 5.000 e R$ 8.000 conforme performance de CPC.",
        "Budget fixo de R$ 2.000/mês. Distribuição: 60% Search, 40% Display.",
      ],
    },
    {
      key: "q_conversao",
      text: "Qual é a conversão esperada e como será medida?",
      answers: [
        "Lead via formulário de contato. Pixel do Meta e tag do Google configurados.",
        "Venda direta no e-commerce. Meta: ROAS mínimo de 3x.",
        "Agendamento de demo via Calendly integrado ao CRM. Meta: 20 demos/mês.",
      ],
    },
  ],

  "Conteúdo e Redes Sociais": [
    {
      key: "q_tom",
      text: "Qual é o tom de voz da marca?",
      answers: [
        "Profissional mas acessível. Sem jargões técnicos. Foco em clareza e confiança.",
        "Descontraído e próximo. Linguagem jovem, uso de emojis moderado.",
        "Técnico e especializado, mas sem ser arrogante. Demonstrar autoridade no nicho.",
      ],
    },
    {
      key: "q_frequencia",
      text: "Qual a frequência e volume de publicações?",
      answers: [
        "3 posts por semana no Instagram + 1 newsletter quinzenal.",
        "Diário no LinkedIn (artigo curto) + 2 reels/semana no Instagram.",
        "4 posts/semana. Mix: 2 educativos, 1 promocional, 1 institucional.",
      ],
    },
    {
      key: "q_canais",
      text: "Quais canais e formatos serão priorizados?",
      answers: [
        "Instagram (feed + stories + reels) e LinkedIn. Sem TikTok nesta fase.",
        "YouTube (vídeos 5–8 min) + Instagram Reels adaptados. Sem Blog.",
        "Blog (SEO) + LinkedIn + Email Marketing (MailChimp).",
      ],
    },
    {
      key: "q_temas",
      text: "Quais temas e pautas são prioritários?",
      answers: [
        "Cases de sucesso, dicas práticas, bastidores da empresa, datas comemorativas relevantes.",
        "Educação financeira simplificada, comparativos de produtos, depoimentos de clientes.",
        "Novidades do setor, conteúdo técnico simplificado, entretenimento relacionado à área.",
      ],
    },
    {
      key: "q_personas",
      text: "Quais são as personas que o conteúdo deve atingir?",
      answers: [
        "Ana, 32 anos, coordenadora de marketing, busca inspiração e soluções rápidas no LinkedIn.",
        "Carlos, 45 anos, empresário da construção civil, usa YouTube e WhatsApp, pouco tempo.",
        "Julia, 22 anos, estudante universitária, consome conteúdo principalmente via Instagram e TikTok.",
      ],
    },
    {
      key: "q_cta",
      text: "Qual CTA (chamada para ação) deve ser priorizado?",
      answers: [
        "'Fale com nosso time' e 'Saiba mais' com link para landing page específica.",
        "'Baixe o e-book gratuito' e 'Assine nossa newsletter' para captura de leads.",
        "'Compre agora' com desconto exclusivo para seguidores. Código promocional ativo.",
      ],
    },
  ],

  "Desenvolvimento Web e App": [
    {
      key: "q_objetivo",
      text: "Qual é o objetivo principal do sistema/página?",
      answers: [
        "Apresentar os serviços da empresa e captar leads via formulário de contato.",
        "Plataforma de e-learning com área do aluno, cursos em vídeo e certificados.",
        "Dashboard interno para gestão de pedidos, estoque e relatórios de vendas.",
      ],
    },
    {
      key: "q_secoes",
      text: "Quais são as principais seções/funcionalidades?",
      answers: [
        "Home, Sobre, Serviços, Cases, Blog, Contato. CTA fixo no header.",
        "Autenticação, perfil do usuário, catálogo de cursos, player de vídeo, progresso, certificado.",
        "Login, overview (KPIs), pedidos (listagem + detalhe), estoque, relatórios exportáveis.",
      ],
    },
    {
      key: "q_integracoes",
      text: "Quais integrações externas são necessárias?",
      answers: [
        "Google Analytics 4, Meta Pixel, RD Station CRM, WhatsApp Business API.",
        "Stripe (pagamentos), Vimeo (vídeos), Mailchimp (e-mail), Zapier (automações).",
        "ERP interno via API REST, banco de dados MySQL existente, relatórios em PDF via Puppeteer.",
      ],
    },
    {
      key: "q_responsividade",
      text: "Há regras específicas de responsividade?",
      answers: [
        "Mobile-first obrigatório. Breakpoints: 320, 768, 1024, 1440px. Sem IE.",
        "Prioridade desktop (uso interno). Mobile com funcionalidade reduzida é aceito.",
        "PWA com suporte a offline mode para funcionalidades críticas.",
      ],
    },
    {
      key: "q_aceite",
      text: "Quais são os critérios de aceite da entrega?",
      answers: [
        "PageSpeed acima de 85 (mobile e desktop), formulário funcional, HTTPS, sem erros no console.",
        "Todos os fluxos de usuário funcionando em produção. Testes E2E aprovados pelo QA.",
        "Aprovação visual pelo cliente + funcionamento correto das integrações em staging.",
      ],
    },
    {
      key: "q_referencias",
      text: "Há referências ou material existente para base?",
      answers: [
        "Sim. Site atual em produção + wireframes no Figma (link enviado por e-mail).",
        "Protótipo no Figma disponível em assets.allka.test/demo/prototipo-ux.pdf.",
        "Nenhuma referência formal. Liberdade criativa seguindo brand book.",
      ],
    },
  ],

  "Audiovisual e Vídeo": [
    {
      key: "q_roteiro",
      text: "Qual é o roteiro ou tema base do vídeo?",
      answers: [
        "Vídeo institucional apresentando a empresa, sua história e diferenciais. Tom emocional.",
        "Tutorial prático mostrando o passo a passo do produto principal. Foco em clareza.",
        "Depoimentos de 3 clientes reais editados em formato de case de sucesso.",
      ],
    },
    {
      key: "q_duracao",
      text: "Qual é a duração esperada?",
      answers: [
        "Até 2 minutos. Versão curta de 30s para anúncio.",
        "Entre 5 e 8 minutos. Conteúdo educativo para YouTube.",
        "Versão principal: 3 min. Teaser: 15s para Instagram Stories.",
      ],
    },
    {
      key: "q_formato",
      text: "Qual é o formato final de entrega?",
      answers: [
        "MP4 H.264, 1080p. Versões: horizontal (16:9) e quadrado (1:1).",
        "MP4 4K (quando possível), 16:9. Arquivos de projeto After Effects incluídos.",
        "MOV + MP4. Resolução mínima 1080p. Legendas em SRT separadas.",
      ],
    },
    {
      key: "q_trilha",
      text: "Há definição sobre trilha sonora ou locução?",
      answers: [
        "Trilha licenciada do acervo da Epidemic Sound. Sem locução. Texto em legenda.",
        "Locutor profissional (voz masculina, tom formal). Trilha instrumental leve de fundo.",
        "Sem locução. Trilha energética. O próprio cliente aparecerá no vídeo.",
      ],
    },
    {
      key: "q_referencias",
      text: "Existem referências de vídeos que inspiraram este projeto?",
      answers: [
        "Sim. 3 vídeos de referência enviados por e-mail. Estilo documental suave.",
        "Referência: campanhas da Apple e da Nubank de 2023. Minimalismo visual.",
        "Sem referências formais. Aguardando visita técnica ao local de gravação.",
      ],
    },
    {
      key: "q_aprovacao",
      text: "Como será o processo de aprovação e revisões?",
      answers: [
        "2 rodadas de revisão incluídas. Aprovação do corte bruto antes da edição final.",
        "1 revisão de roteiro + 1 revisão do vídeo finalizado. Aprovação por e-mail.",
        "Revisões ilimitadas de texto/legenda. Mudanças de locução serão cobradas à parte.",
      ],
    },
  ],

  "Consultoria e Estratégia": [
    {
      key: "q_objetivo",
      text: "Qual é o objetivo principal da consultoria?",
      answers: [
        "Diagnóstico completo da presença digital e plano de ação para os próximos 12 meses.",
        "Estruturar o funil de vendas digital e treinar o time comercial.",
        "Benchmark competitivo e recomendações de posicionamento para novo mercado.",
      ],
    },
    {
      key: "q_contexto",
      text: "Qual é o contexto atual do negócio?",
      answers: [
        "Empresa B2B com 5 anos de mercado, crescimento estagnado nos últimos 2 anos, sem presença digital relevante.",
        "Startup em fase de tração, 18 meses de operação, buscando otimizar CAC e aumentar LTV.",
        "Empresa familiar em processo de digitalização, primeira geração com acesso à tecnologia.",
      ],
    },
    {
      key: "q_desafios",
      text: "Quais são os principais desafios ou dores atuais?",
      answers: [
        "Dificuldade em converter leads online. Taxa de conversão de 0,8% vs. meta de 3%.",
        "Alta rotatividade da equipe de vendas e falta de padronização no processo.",
        "Dependência excessiva de um único canal de aquisição (indicações).",
      ],
    },
    {
      key: "q_entregaveis",
      text: "Quais são os entregáveis esperados?",
      answers: [
        "Relatório de diagnóstico (PDF 30 páginas) + apresentação executiva (PPT) + roadmap de 90 dias.",
        "Planilha de processos de vendas + manual de objeções + treinamento gravado.",
        "Relatório de benchmark + matriz SWOT + recomendações em formato de slides executivos.",
      ],
    },
    {
      key: "q_participantes",
      text: "Quem participará das reuniões e sessões de trabalho?",
      answers: [
        "Diretor Comercial + Coordenador de Marketing. Máximo 3 sessões de 2h.",
        "Equipe de vendas completa (8 pessoas) + CEO. 2 workshops presenciais.",
        "Apenas gestores (C-Level). Sessões 100% remotas via Meet.",
      ],
    },
    {
      key: "q_prazo",
      text: "Há restrições de prazo ou datas fixas?",
      answers: [
        "Apresentação final deve ocorrer antes do planejamento anual de novembro.",
        "Sem restrição de data. Foco em qualidade sobre velocidade.",
        "Necessário relatório parcial em 30 dias para apresentação ao board.",
      ],
    },
  ],
};

// Fallback genérico para categorias não mapeadas
const DEFAULT_BRIEFING: BriefingTemplate = [
  {
    key: "q_objetivo",
    text: "Qual é o objetivo principal desta entrega?",
    answers: [
      "Garantir a entrega do escopo contratado dentro do prazo e qualidade acordados.",
      "Consolidar os materiais solicitados e submeter para aprovação interna.",
      "Concluir a fase planejada e preparar documentação para a próxima etapa.",
    ],
  },
  {
    key: "q_contexto",
    text: "Qual é o contexto geral do projeto nesta etapa?",
    answers: [
      "Projeto em fase intermediária. Dependências externas foram resolvidas.",
      "Fase inicial de execução. Escopo validado e recursos disponíveis.",
      "Etapa final antes da entrega ao cliente. Revisão interna em andamento.",
    ],
  },
  {
    key: "q_criterios",
    text: "Quais são os critérios de aceite desta entrega?",
    answers: [
      "Aprovação do responsável de projeto + checklist de qualidade preenchido.",
      "Validação pelo cliente via e-mail ou plataforma interna.",
      "Todos os itens do checklist da etapa marcados como concluídos.",
    ],
  },
  {
    key: "q_restricoes",
    text: "Há restrições ou dependências que impactam a execução?",
    answers: [
      "Aguardando acesso a plataformas de terceiros. Prazo para resolução: 2 dias úteis.",
      "Sem dependências no momento. Execução pode prosseguir conforme cronograma.",
      "Materiais de referência recebidos com atraso. Prazo ajustado internamente.",
    ],
  },
  {
    key: "q_responsavel",
    text: "Quem é o responsável pela aprovação final desta entrega?",
    answers: [
      "Gerente de Projetos + Diretor de Marketing do cliente.",
      "Líder técnico interno + validação do cliente na plataforma.",
      "Responsável de conta + aprovação automática após 72h sem contestação.",
    ],
  },
  {
    key: "q_observacoes",
    text: "Há observações adicionais importantes para a execução?",
    answers: [
      "Manter comunicação ativa via plataforma. Evitar alterações de escopo não documentadas.",
      "Priorizar itens do checklist na ordem definida. Etapas anteriores são pré-requisito.",
      "Nenhuma observação adicional no momento. Seguir protocolo padrão de entrega.",
    ],
  },
];

// ── Número de perguntas por status da tarefa ───────────────────────────────────
function numQuestionsForStatus(taskStatus: string): number {
  const map: Record<string, number> = {
    PARA_LANCAMENTO: 3,
    EM_LANCAMENTO: 4,
    LIBERADA_PARA_EXECUCAO: 5,
    EM_EXECUCAO: 6,
    EM_REVISAO: 6,
    EM_APROVACAO: 6,
    CONCLUIDA: 6,
  };
  return map[taskStatus] ?? 3;
}

// ── Resolver template por categoria do produto ─────────────────────────────────
function templateForCategory(cat: string): BriefingTemplate {
  if (cat.toLowerCase().includes("design") || cat.toLowerCase().includes("cria"))
    return BRIEFING_TEMPLATES["Design e Criação"];
  if (cat.toLowerCase().includes("performance") || cat.toLowerCase().includes("anúncio") || cat.toLowerCase().includes("seo"))
    return BRIEFING_TEMPLATES["Performance e Anúncios Patrocinados"];
  if (cat.toLowerCase().includes("conteúdo") || cat.toLowerCase().includes("social") || cat.toLowerCase().includes("email") || cat.toLowerCase().includes("e-mail"))
    return BRIEFING_TEMPLATES["Conteúdo e Redes Sociais"];
  if (cat.toLowerCase().includes("web") || cat.toLowerCase().includes("app") || cat.toLowerCase().includes("desenvolv") || cat.toLowerCase().includes("dashboard") || cat.toLowerCase().includes("site"))
    return BRIEFING_TEMPLATES["Desenvolvimento Web e App"];
  if (cat.toLowerCase().includes("vídeo") || cat.toLowerCase().includes("video") || cat.toLowerCase().includes("audiovisual") || cat.toLowerCase().includes("podcast"))
    return BRIEFING_TEMPLATES["Audiovisual e Vídeo"];
  if (cat.toLowerCase().includes("consultoria") || cat.toLowerCase().includes("estratégia") || cat.toLowerCase().includes("treinamento") || cat.toLowerCase().includes("workshop") || cat.toLowerCase().includes("webinar"))
    return BRIEFING_TEMPLATES["Consultoria e Estratégia"];
  return DEFAULT_BRIEFING;
}

// ── Tipos de arquivo por status da tarefa ─────────────────────────────────────
// TaskAttachment.type: file | link | reference | delivery
type AttachmentSpec = {
  name: string;
  type: "file" | "link" | "reference" | "delivery";
  mime_type: string;
  size: number; // bytes
};

const MIME_SIZES: Record<string, { min: number; max: number }> = {
  "application/pdf": { min: 300_000, max: 4_000_000 },
  "application/zip": { min: 2_000_000, max: 30_000_000 },
  "image/png": { min: 500_000, max: 8_000_000 },
  "image/jpeg": { min: 500_000, max: 8_000_000 },
  "text/csv": { min: 50_000, max: 500_000 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { min: 100_000, max: 2_000_000 },
  "video/mp4": { min: 20_000_000, max: 250_000_000 },
};

function fakeSize(mime: string, idx: number): number {
  const range = MIME_SIZES[mime] ?? { min: 100_000, max: 5_000_000 };
  return range.min + (dh(idx, 43) % (range.max - range.min));
}

function attachmentsForStatus(
  taskStatus: string,
  category: string,
  taskIdx: number,
  projectId: string,
  taskId: string,
): AttachmentSpec[] {
  const isDesign = templateForCategory(category) === BRIEFING_TEMPLATES["Design e Criação"];
  const isVideo = category.toLowerCase().includes("vídeo") || category.toLowerCase().includes("video") || category.toLowerCase().includes("podcast");

  const base = `https://files.allka.test/demo/projects/${projectId.substring(0, 8)}/tasks/${taskId.substring(0, 8)}`;

  const refFiles: AttachmentSpec[] = isDesign
    ? [
        { name: "guia-de-marca.pdf", type: "reference", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx) },
        { name: "referencias-visuais.zip", type: "reference", mime_type: "application/zip", size: fakeSize("application/zip", taskIdx + 1) },
      ]
    : isVideo
    ? [
        { name: "roteiro-base.pdf", type: "reference", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx) },
        { name: "referencias-de-video.pdf", type: "reference", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 1) },
      ]
    : [
        { name: "briefing-inicial.pdf", type: "reference", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx) },
      ];

  const deliveryFile: AttachmentSpec = isDesign
    ? { name: "entrega-final-layout.zip", type: "delivery", mime_type: "application/zip", size: fakeSize("application/zip", taskIdx + 2) }
    : isVideo
    ? { name: "video-final.mp4", type: "delivery", mime_type: "video/mp4", size: fakeSize("video/mp4", taskIdx + 2) }
    : { name: "entrega-final.pdf", type: "delivery", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 2) };

  switch (taskStatus) {
    case "PARA_LANCAMENTO":
      return [refFiles[0]];

    case "EM_LANCAMENTO":
      return refFiles.slice(0, Math.min(refFiles.length, 2));

    case "LIBERADA_PARA_EXECUCAO":
      return refFiles;

    case "EM_EXECUCAO":
      return [
        ...refFiles,
        { name: "rascunho-inicial.pdf", type: "file", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 3) },
      ];

    case "EM_REVISAO":
      return [
        ...refFiles,
        { name: "versao-preliminar.pdf", type: "file", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 3) },
        { name: "anotacoes-revisao.pdf", type: "file", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 4) },
      ];

    case "EM_APROVACAO":
      return [
        refFiles[0],
        { ...deliveryFile, name: deliveryFile.name.replace("entrega-", "entrega-para-aprovacao-") },
      ];

    case "CONCLUIDA":
      return [
        refFiles[0],
        deliveryFile,
        { name: "comprovante-aprovacao.pdf", type: "delivery", mime_type: "application/pdf", size: fakeSize("application/pdf", taskIdx + 5) },
      ];

    default:
      return [refFiles[0]];
  }
}

// ── Uploader demo determinístico ───────────────────────────────────────────────
function uploaderFor(users: { id: string; name: string }[], idx: number): string {
  if (users.length === 0) return "Sistema Demo";
  return pick(users, idx, 53).name;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n========== SEED: Demo Task Assets (${DRY_RUN ? "DRY-RUN" : "APPLY"}) ==========\n`,
  );

  // Usuários para uploaded_by
  const uploaders = await prisma.user.findMany({
    where: { role: { in: ["agency_admin", "admin", "agency_user"] }, is_active: true },
    select: { id: true, name: true },
    take: 10,
  });

  // Buscar todas as tarefas com contexto completo
  const tasks = await prisma.projectTask.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      project_id: true,
      briefing_answers: { select: { question_key: true } },
      attachments: { select: { name: true } },
      project_product: {
        select: {
          product_category_snapshot: true,
          project: { select: { id: true } },
        },
      },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Tarefas encontradas: ${tasks.length}`);
  console.log(`Uploaders disponíveis: ${uploaders.length}`);

  const beforeBriefing = await prisma.taskBriefingAnswer.count();
  const beforeAttachments = await prisma.taskAttachment.count();
  console.log(`BriefingAnswers antes: ${beforeBriefing}`);
  console.log(`TaskAttachments antes: ${beforeAttachments}`);

  let briefingCreated = 0;
  let briefingUpdated = 0;
  let briefingSkipped = 0;
  let attachmentCreated = 0;
  let attachmentSkipped = 0;

  const attTypeDist: Record<string, number> = {};
  const SAMPLE_MAX = 5;
  let sampleCount = 0;

  for (let ti = 0; ti < tasks.length; ti++) {
    const task = tasks[ti];
    const cat = task.project_product?.product_category_snapshot ?? "";
    const projectId = task.project_product?.project.id ?? task.project_id;
    const showSample = sampleCount < SAMPLE_MAX;

    if (showSample) {
      console.log(
        `\n  Tarefa ${ti + 1}: "${task.title.substring(0, 35)}" [${task.status}] cat="${cat}"`,
      );
      sampleCount++;
    }

    // ── Briefing answers ──────────────────────────────────────────────────────
    const template = templateForCategory(cat);
    const numQ = numQuestionsForStatus(task.status);
    const questions = template.slice(0, numQ);

    const existingKeys = new Set(task.briefing_answers.map((b) => b.question_key));

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const answer = pick(q.answers, ti * 7 + qi, 59);

      const alreadyExists = existingKeys.has(q.key);

      if (alreadyExists) {
        briefingSkipped++;
        if (showSample && qi === 0) console.log(`    briefing: ${numQ} perguntas (${numQ - existingKeys.size} novas)`);
      } else {
        if (showSample && !alreadyExists) {
          if (qi === 0) console.log(`    briefing: criando ${numQ} respostas`);
        }

        if (!DRY_RUN) {
          await prisma.taskBriefingAnswer.upsert({
            where: {
              project_task_id_question_key: {
                project_task_id: task.id,
                question_key: q.key,
              },
            },
            create: {
              project_task_id: task.id,
              question_key: q.key,
              question_text: q.text,
              answer,
            },
            update: {
              question_text: q.text,
              answer,
            },
          });
        }
        briefingCreated++;
      }
    }

    // ── Task attachments ──────────────────────────────────────────────────────
    const existingNames = new Set(task.attachments.map((a) => a.name));

    const specs = attachmentsForStatus(task.status, cat, ti, projectId, task.id);
    for (const spec of specs) {
      attTypeDist[spec.type] = (attTypeDist[spec.type] ?? 0) + 1;

      if (existingNames.has(spec.name)) {
        attachmentSkipped++;
        continue;
      }

      const uploader = uploaderFor(uploaders, ti);
      const url = `https://files.allka.test/demo/projects/${projectId.substring(0, 8)}/tasks/${task.id.substring(0, 8)}/${spec.name}`;

      if (!DRY_RUN) {
        await prisma.taskAttachment.create({
          data: {
            project_task_id: task.id,
            type: spec.type,
            name: spec.name,
            url,
            size: spec.size,
            mime_type: spec.mime_type,
            uploaded_by: uploader,
            observations: spec.type === "delivery" ? "Entregável submetido para revisão/aprovação." : null,
          },
        });
      }
      attachmentCreated++;
    }
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log(`\n── Resumo ${DRY_RUN ? "(DRY-RUN)" : "(APLICADO)"} ──────────────────────────────────────`);
  console.log(`  BriefingAnswers criados:    ${briefingCreated}`);
  console.log(`  BriefingAnswers atualizados: ${briefingUpdated}`);
  console.log(`  BriefingAnswers sem mudança: ${briefingSkipped}`);
  console.log(`  TaskAttachments criados:    ${attachmentCreated}`);
  console.log(`  TaskAttachments sem mudança: ${attachmentSkipped}`);

  console.log(`\n── Distribuição de attachments por tipo ──────────────────────`);
  for (const [t, c] of Object.entries(attTypeDist).sort()) {
    console.log(`  ${t.padEnd(15)} ${c}`);
  }

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY-RUN: nenhuma escrita realizada.`);
    console.log(`  Remova --dry-run para aplicar.\n`);
    return;
  }

  // ── Validação pós-seed ─────────────────────────────────────────────────────
  console.log(`\n── Validação pós-seed ──────────────────────────────────────────`);

  const [projCount, ppCount, ptCount, stageCount, baCount, attCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.projectProduct.count(),
      prisma.projectTask.count(),
      prisma.projectTaskStage.count(),
      prisma.taskBriefingAnswer.count(),
      prisma.taskAttachment.count(),
    ]);

  console.log(`  Projetos:           ${projCount} (esperado 45)`);
  console.log(`  ProjectProducts:    ${ppCount} (esperado 90)`);
  console.log(`  ProjectTasks:       ${ptCount} (esperado 90)`);
  console.log(`  ProjectTaskStages:  ${stageCount} (esperado 515)`);
  console.log(`  BriefingAnswers:    ${baCount} (antes: ${beforeBriefing})`);
  console.log(`  TaskAttachments:    ${attCount} (antes: ${beforeAttachments})`);

  const attByType = await prisma.taskAttachment.groupBy({ by: ["type"], _count: true });
  console.log(`\n── TaskAttachments por tipo ──────────────────────────────────`);
  for (const r of attByType) console.log(`  ${r.type.padEnd(15)} ${r._count}`);

  // Checar: tarefas CONCLUIDA têm delivery
  const concludedTasks = await prisma.projectTask.findMany({
    where: { status: "CONCLUIDA" },
    select: { id: true, title: true, attachments: { select: { type: true } } },
  });
  const concludedWithoutDelivery = concludedTasks.filter(
    (t) => !t.attachments.some((a) => a.type === "delivery"),
  ).length;

  // Checar: tarefas PARA_LANCAMENTO sem delivery
  const pendingWithDelivery = await prisma.projectTask.count({
    where: {
      status: "PARA_LANCAMENTO",
      attachments: { some: { type: "delivery" } },
    },
  });

  // URLs com domínio .test
  const badUrls = await prisma.taskAttachment.count({
    where: { NOT: { url: { contains: "allka.test" } } },
  });

  console.log(`\n── Integridade ──────────────────────────────────────────────`);
  console.log(`  Concluídas sem arquivo de entrega: ${concludedWithoutDelivery}`);
  console.log(`  Pendentes com arquivo de entrega:  ${pendingWithDelivery}`);
  console.log(`  URLs fora do domínio .test:        ${badUrls}`);
  console.log(
    `  Tudo ok: ${concludedWithoutDelivery === 0 && pendingWithDelivery === 0 && badUrls === 0 ? "✅" : "⚠️ verificar"}`,
  );

  console.log(
    `\n✅  Seed concluído. Project/Product/Task/Stages/Invoices não foram alterados.\n`,
  );
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
