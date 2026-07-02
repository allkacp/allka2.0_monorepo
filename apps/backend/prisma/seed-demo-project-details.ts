/**
 * seed-demo-project-details.ts
 * Preenche campos de cadastro dos projetos existentes com dados realistas de demonstração.
 *
 * IDEMPOTENTE: rodar N vezes produz o mesmo resultado.
 * NÃO cria projetos, NÃO apaga projetos.
 * NÃO altera: status, client_id, agency, products, tasks, invoices, payments, attachments, users.
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-details -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-details
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Consultores demo (emails .test — nunca usar emails reais) ──────────────────
const CONSULTANTS = [
  { name: "Mariana Costa",  email: "mariana.costa@allka.test"   },
  { name: "Renato Almeida", email: "renato.almeida@allka.test"  },
  { name: "Camila Torres",  email: "camila.torres@allka.test"   },
  { name: "Bruno Martins",  email: "bruno.martins@allka.test"   },
  { name: "Equipe Lamego",  email: "atendimento@lamego.test"    },
];

// ── Projetos que serão convertidos para lifecycle = "mensal" ───────────────────
// Critério: título contém palavras que indicam serviço recorrente
const MENSAL_KEYWORDS = [
  "mensal",
  "gestão de redes",
  "produção de conteúdo editorial",
  "site institucional + seo",
];
const MENSAL_BILLING_DAYS = [5, 10, 15, 20, 25];

// ── Hash determinístico (sem Math.random — garante idempotência) ───────────────
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

// ── Detecção de tipo por título ────────────────────────────────────────────────
function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("e-commerce") || t.includes("ecommerce") || t.includes("loja virtual") || t.includes("drinks premium"))
    return "E-commerce";
  if (t.includes("site") || t.includes("web") || t.includes("portal") || t.includes("landing page"))
    return "Desenvolvimento Web";
  if (t.includes("app ") || t.includes("app ") || t.includes("mobile") || t.includes("fidelidade") || t.match(/\bapp\b/i))
    return "Desenvolvimento Móvel";
  if (
    t.includes("dashboard") || t.includes("analytics") || t.includes(" bi") ||
    t.includes("benchmark") || t.includes("treinamento") || t.includes("consultoria") ||
    t.includes("workshop") || t.includes("webinar")
  )
    return "Consultoria";
  if (t.includes("vídeo") || t.includes("video") || t.includes("podcast"))
    return "Produção de Conteúdo";
  if (
    t.includes("brand") || t.includes("identidade") || t.includes("design") ||
    t.includes("visual") || t.includes("menu digital") || t.includes("portfólio")
  )
    return "Design";
  return "Marketing Digital";
}

// ── Value range por tipo ───────────────────────────────────────────────────────
function valueForType(type: string, idx: number): number {
  const ranges: Record<string, [number, number]> = {
    "E-commerce":              [25000, 85000],
    "Desenvolvimento Web":     [12000, 55000],
    "Desenvolvimento Móvel": [25000, 90000],
    "Consultoria":             [4500,  22000],
    "Produção de Conteúdo": [3500, 14000],
    "Design":                  [4500,  18000],
    "Marketing Digital":       [3500,  18000],
  };
  const [min, max] = ranges[type] ?? [5000, 20000];
  const raw = inRange(idx, min, max, 7);
  return Math.round(raw / 500) * 500; // arredonda a R$500
}

// ── Descrição por tipo e título ────────────────────────────────────────────────
function generateDescription(title: string, type: string): string {
  const t = title.toLowerCase();

  if (type === "E-commerce") {
    return (
      `Desenvolvimento completo da loja virtual ${title} com foco em conversão e experiência do usuário. ` +
      `O projeto contempla: arquitetura de catálogo de produtos, checkout otimizado, ` +
      `integração com meios de pagamento (PIX, cartão e boleto), painel administrativo personalizado, ` +
      `SEO técnico e velocidade acima de 90 no PageSpeed. ` +
      `Entregáveis: loja publicada, documentação de uso, treinamento da equipe e 30 dias de suporte pós-lançamento.`
    );
  }

  if (type === "Desenvolvimento Web") {
    if (t.includes("landing")) {
      return (
        `Criação de landing page de alta conversão para ${title}. ` +
        `Estrutura focada em CTA claro, headline impactante, prova social e formulário de captura. ` +
        `Inclui versão mobile responsíva, integração com CRM e tracking via Meta Pixel e Google Analytics. ` +
        `Prazo de entrega: 2 semanas a partir do briefing aprovado. Revisões inclusívas até aprovação final.`
      );
    }
    return (
      `Desenvolvimento de ${title} com foco em performance, acessibilidade e SEO. ` +
      `O projeto inclui wireframes, design UI aprovado, desenvolvimento front-end responsívo, ` +
      `integração com CMS, otimização de velocidade e configuração de analytics. ` +
      `Entrega em etapas com revisões quinzenais. Suporte técnico incluso por 60 dias após publicação.`
    );
  }

  // Suportar tipos que já possam existir no banco ("Branding", "UX/UI")
  if (type === "Design" || type === "Branding") {
    if (t.includes("brand") || t.includes("rebranding")) {
      return (
        `Projeto de rebranding para ${title}. ` +
        `Auditoria da marca atual, pesquisa de posicionamento, criação de novo logotipo (mínimo 3 propostas), ` +
        `paleta de cores, tipografia, iconografia, tom de voz e manual de marca completo. ` +
        `Aplicações: papelaria, assinaturas digitais e template de apresentação. ` +
        `Entrega: arquivos vetoriais e brand book em PDF.`
      );
    }
    if (t.includes("identidade") || t.includes("visual")) {
      return (
        `Criação de identidade visual completa para ${title}. ` +
        `Inclui logotipo e variações, paleta cromática, tipografia, padrões gráficos e manual de identidade. ` +
        `Aplicações: cartão de visita, papel timbrado, assinatura de e-mail e templates para redes sociais.`
      );
    }
    if (t.includes("menu digital")) {
      return (
        `Desenvolvimento de ${title} com interface intuitiva para tablets e totens. ` +
        `Design adaptado à identidade visual da marca, navegação simplificada, fotos profissionais dos itens, ` +
        `descrições e filtros por categoria. Formato de entrega: arquivo editável + versão publicada.`
      );
    }
    return (
      `Projeto de design para ${title}. ` +
      `Pesquisa de referências, criação de conceito visual, desenvolvimento das peças e aprovação em etapas. ` +
      `Todas as entregas fornecidas em formatos editáveis (AI/PSD) e prontos para produção (PDF/PNG).`
    );
  }

  if (type === "Desenvolvimento Móvel" || type === "UX/UI") {
    return (
      `Desenvolvimento do aplicativo ${title} para plataformas iOS e Android. ` +
      `Contempla autenticação segura, notificações push, integração com API REST, experiência offline-first ` +
      `e design system padronizado. Processo: Descoberta → Prototipagem → Desenvolvimento → QA → Publicação nas lojas.`
    );
  }

  if (type === "Consultoria") {
    if (t.includes("dashboard") || t.includes("bi") || t.includes("analytics") || t.includes("benchmark")) {
      return (
        `Desenvolvimento de solução de Business Intelligence para ${title}. ` +
        `Mapeamento das fontes de dados, modelagem dimensional, criação de dashboards executivos e operacionais, ` +
        `integração com ferramentas de BI (Power BI / Looker Studio) e treinamento da equipe para autonomia nos relatórios. ` +
        `Entregáveis: documentação de métricas, painéis publicados e manual de uso.`
      );
    }
    if (t.includes("treinamento")) {
      return (
        `Programa de capacitação para equipe em ${title}. ` +
        `Contempla: diagnóstico inicial, trilha de aprendizado personalizada, materiais didáticos, sessões ao vivo e avaliação de desempenho. ` +
        `Carga horária: 16h em 4 semanas. Certificado de conclusão para todos os participantes. ` +
        `Sessão de dúvidas por 30 dias após o encerramento.`
      );
    }
    if (t.includes("workshop") || t.includes("webinar")) {
      return (
        `Organização e produção do ${title}. ` +
        `Escopo: definição de tema e palestrantes, criação de página de inscrição, material de divulgação, ` +
        `suporte técnico ao vivo, gravação e edição do conteúdo, distribuição pós-evento e relatório de engajamento com métricas de audiência.`
      );
    }
    return (
      `Consultoria especializada em ${title}. ` +
      `Diagnóstico do cenário atual, mapeamento de oportunidades, entrega de plano de ação com priorização por impacto, ` +
      `acompanhamento de implementação e relatório final com resultados e próximos passos recomendados.`
    );
  }

  if (type === "Produção de Conteúdo") {
    if (t.includes("vídeo") || t.includes("video")) {
      return (
        `Produção de ${title} para uso institucional e digital. ` +
        `Contempla: briefing criativo, roteiro em duas versões (longa e curta), captação, ` +
        `edição com motion graphics, trilha sonora licenciada e legenda acessível. ` +
        `Entrega em formatos: YouTube HD, Stories (vertical) e versão quadrada para feeds. Até 2 rodadas de ajustes.`
      );
    }
    if (t.includes("podcast")) {
      return (
        `Lançamento e produção do ${title}. ` +
        `Inclui identidade visual, configuração em plataformas (Spotify, Apple Podcasts, Deezer), ` +
        `roteiro editorial para 8 episódios, captação de áudio, edição com vinheta e arte de capa profissional. ` +
        `Publicação semanal com cronograma editorial definido em conjunto com o cliente.`
      );
    }
    return (
      `Produção de conteúdo estratégico para ${title}. ` +
      `Planejamento editorial trimestral, criação de conteúdos em múltiplos formatos (artigos, infográficos, vídeos curtos), ` +
      `calendário de publicação, copywriting otimizado para SEO e análise de performance mensal com ajustes de rota.`
    );
  }

  if (type === "__Design_handled_above__") {
    if (t.includes("brand") || t.includes("rebranding")) {
      return (
        `Projeto de rebranding para ${title}. ` +
        `Auditoria da marca atual, pesquisa de posicionamento, criação de novo logotipo (mínimo 3 propostas), ` +
        `paleta de cores, tipografia, iconografia, tom de voz e manual de marca completo. ` +
        `Aplicações: papelaria, assinaturas digitais, materiais de marketing e template de apresentação. ` +
        `Entrega: arquivos vetoriais e brand book em PDF.`
      );
    }
    if (t.includes("identidade") || t.includes("visual")) {
      return (
        `Criação de identidade visual completa para ${title}. ` +
        `Inclui logotipo e variações, paleta cromática, tipografia, padrões gráficos e manual de identidade. ` +
        `Aplicações: cartão de visita, papel timbrado, assinatura de e-mail e templates para redes sociais. ` +
        `Aprovação em etapas com apresentação formal de cada fase.`
      );
    }
    if (t.includes("menu digital")) {
      return (
        `Desenvolvimento de ${title} com interface intuitiva para tablets e totens. ` +
        `Design adaptado à identidade visual da marca, navegação simplificada, fotos profissionais dos itens, ` +
        `descrições e filtros por categoria/restrição alimentária. Formato de entrega: arquivo editável + versão publicada.`
      );
    }
    return (
      `Projeto de design para ${title}. ` +
      `Pesquisa de referências, criação de conceito visual, desenvolvimento das peças especificadas, apresentação e ajustes. ` +
      `Todas as entregas fornecidas em formatos editáveis (AI/PSD) e prontos para produção (PDF/PNG) com especificações técnicas.`
    );
  }

  // Marketing Digital (padrão)
  if (t.includes("seo") || t.includes("performance")) {
    return (
      `Projeto de SEO técnico e editorial para ${title}. ` +
      `Auditoria completa do site, correção de erros de indexação, otimização de velocidade (Core Web Vitals), ` +
      `pesquisa de palavras-chave, criação de conteúdo otimizado, link building e relatório mensal de posicionamento. ` +
      `Meta: top 10 para as 20 principais palavras-chave em 6 meses.`
    );
  }
  if (t.includes("social") || t.includes("redes sociais")) {
    return (
      `Gestão completa das redes sociais para ${title}. ` +
      `Calendário editorial mensal, criação de conteúdo em texto, imagem e vídeo curto, agendamento e publicação, ` +
      `resposta a comentários e DMs, relatório semanal de métricas. ` +
      `Canais: Instagram, Facebook e LinkedIn. Frequência: 4 publicações/semana por canal + Stories diários.`
    );
  }
  if (t.includes("campanha") || t.includes("ads") || t.includes("google")) {
    return (
      `Planejamento e execução de ${title}. ` +
      `Definição de objetivos, segmentação de público, criação de criativos (textos, banners e vídeos), ` +
      `configuração e otimização de campanhas, testes A/B, monitoramento diário e relatório de resultados com análise de ROAS, CPC e conversões.`
    );
  }
  if (t.includes("email") || t.includes("e-mail")) {
    return (
      `Estratégia e execução de e-mail marketing para ${title}. ` +
      `Segmentação da base, criação de templates responsívos, copywriting persuasivo, automações de nutrição, ` +
      `testes de entregabilidade e relatórios de abertura, clique e conversão. ` +
      `Meta: taxa de abertura acima de 22% e CTR acima de 3,5%.`
    );
  }
  if (t.includes("influencer")) {
    return (
      `Gestão de campanha com microinfluenciadores para ${title}. ` +
      `Curadoria de perfis alinhados à marca (10k–100k seguidores), briefing criativo, monitoramento de publicações ` +
      `e análise de engajamento. Entregável: relatório consolidado com métricas de alcance e performance por influenciador.`
    );
  }
  if (t.includes("growth")) {
    return (
      `Projeto de Growth Hacking para ${title}. ` +
      `Identificação de alavancas de crescimento, experimentos rápidos (testes A/B, funis, onboarding), ` +
      `análise de dados comportamentais e implementação das hipóteses validadas. ` +
      `Cadência semanal de resultados e roadmap de crescimento trimestral.`
    );
  }
  if (t.includes("portfólio") || t.includes("portfólio")) {
    return (
      `Curação e produção do portfólio de ${title}. ` +
      `Seleção dos melhores casos, produção de relatórios de resultado, design das páginas de caso, ` +
      `publicação no site e distribuição como material comercial. Foco em demonstrar ROI mensurável e narrativa de sucesso.`
    );
  }
  if (t.includes("content") || t.includes("conteúdo")) {
    return (
      `Estratégia e produção de conteúdo para ${title}. ` +
      `Plano editorial mensal, criação de artigos, posts e materiais ricos, distribuição nas plataformas estratégicas ` +
      `e relatório de performance. OKRs: aumento de tráfego orgânico, engajamento e leads qualificados.`
    );
  }
  return (
    `Projeto estratégico para ${title}. ` +
    `Análise de mercado e concorrentes, definição de posicionamento, criação de materiais de comunicação ` +
    `e execução das ações planejadas. Reuniões quinzenais de alinhamento e relatórios mensais de resultado.`
  );
}

// ── Datas por status (determinísticas baseadas em idx) ─────────────────────────
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}
function datesForStatus(status: string, idx: number): { start_date: Date; end_date: Date } {
  switch (status) {
    case "draft":
      return { start_date: daysFromNow(inRange(idx, 15, 45, 2)), end_date: daysFromNow(inRange(idx, 60, 130, 3)) };
    case "negotiation":
      return { start_date: daysFromNow(inRange(idx, 7, 30, 2)), end_date: daysFromNow(inRange(idx, 60, 150, 3)) };
    case "awaiting-payment":
      return { start_date: daysFromNow(inRange(idx, 5, 20, 2)), end_date: daysFromNow(inRange(idx, 45, 90, 3)) };
    case "planning":
      return { start_date: daysAgo(inRange(idx, 5, 20, 2)), end_date: daysFromNow(inRange(idx, 30, 90, 3)) };
    case "in-progress":
      return { start_date: daysAgo(inRange(idx, 30, 90, 2)), end_date: daysFromNow(inRange(idx, 15, 60, 3)) };
    case "paused":
      return { start_date: daysAgo(inRange(idx, 45, 120, 2)), end_date: daysFromNow(inRange(idx, 20, 60, 3)) };
    case "completed":
      return { start_date: daysAgo(inRange(idx, 90, 180, 2)), end_date: daysAgo(inRange(idx, 5, 30, 3)) };
    default:
      return { start_date: daysAgo(30), end_date: daysFromNow(60) };
  }
}

// ── Progresso por status ────────────────────────────────────────────────────────
function progressForStatus(status: string, idx: number): number {
  switch (status) {
    case "draft":            return inRange(idx, 5, 10, 5);
    case "negotiation":      return inRange(idx, 10, 15, 5);
    case "awaiting-payment": return inRange(idx, 15, 25, 5);
    case "planning":         return inRange(idx, 20, 35, 5);
    case "in-progress":      return inRange(idx, 35, 75, 5);
    case "paused":           return inRange(idx, 25, 55, 5);
    case "completed":        return 100;
    default:                 return 0;
  }
}

// ── Spent por status ───────────────────────────────────────────────────────────
function spentForStatus(status: string, value: number, progress: number, idx: number): number {
  const pct = progress / 100;
  switch (status) {
    case "draft":
    case "negotiation":
      return 0;
    case "awaiting-payment":
      return Math.round(value * 0.01);     // ~1% custo administrativo
    case "planning":
      return Math.round(value * inRange(idx, 5, 15, 8) / 100);
    case "in-progress":
      return Math.round(value * pct * inRange(idx, 82, 98, 9) / 100);
    case "paused":
      return Math.round(value * pct * inRange(idx, 70, 88, 9) / 100);
    case "completed":
      return Math.round(value * inRange(idx, 93, 100, 9) / 100);
    default:
      return 0;
  }
}

// ── Verificadores de valor "vazio ou genérico" ─────────────────────────────────
const GENERIC_CONSULTANTS = new Set([
  null, "", "Equipe Lamego", "Equipe Allka", "—", "-", "N/A", "n/a",
]);
const GENERIC_EMAILS = new Set([
  null, "", "contato@lamego.com.vc", "atendimento@lamego.com.vc",
  "contato@allka.com.br", "—", "-", "N/A", "n/a",
]);

function isGenericConsultant(v: string | null | undefined): boolean {
  return GENERIC_CONSULTANTS.has(v as string | null);
}
function isGenericEmail(v: string | null | undefined): boolean {
  return GENERIC_EMAILS.has(v as string | null);
}
function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}
function isShortDesc(v: string | null | undefined): boolean {
  return !v || v.trim().length < 40;
}

// ── Determina se projeto deve ser MENSAL ───────────────────────────────────────
function shouldBeMensal(title: string): boolean {
  const t = title.toLowerCase();
  return MENSAL_KEYWORDS.some((kw) => t.includes(kw));
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const label = DRY_RUN ? " [DRY-RUN — nenhum dado será alterado]" : " [APPLY]";
  console.log(`\n=== SEED: Dados do Projeto${label} ===\n`);

  const projects = await prisma.project.findMany({
    orderBy: { created_at: "asc" },
  });

  console.log(`  ${projects.length} projetos encontrados no banco.\n`);

  let totalUpdated = 0;
  let totalMensal = 0;
  let totalAvulso = 0;
  const statusCounts: Record<string, number> = {};
  const examples: string[] = [];

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;

    // ── Tipo ──────────────────────────────────────────────────────────────────
    const type = p.type && p.type.trim() ? p.type : detectType(p.title);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    const isMensal = shouldBeMensal(p.title);
    const lifecycle = isMensal ? "mensal" : "avulso";
    if (isMensal) totalMensal++; else totalAvulso++;

    // ── Consultor ─────────────────────────────────────────────────────────────
    const consultantEntry = pick(CONSULTANTS, i, 3);
    const consultant = isGenericConsultant(p.consultant) ? consultantEntry.name : p.consultant;
    const consultant_email = isGenericEmail(p.consultant_email) ? consultantEntry.email : p.consultant_email;

    // ── Descrição ─────────────────────────────────────────────────────────────
    const description = isShortDesc(p.description)
      ? generateDescription(p.title, type)
      : p.description;

    // ── Valor / Budget ────────────────────────────────────────────────────────
    const value = !p.value ? valueForType(type, i) : p.value;
    const budget = !p.budget
      ? Math.round(value * inRange(i, 95, 108, 11) / 100 / 100) * 100
      : p.budget;

    // ── Datas ─────────────────────────────────────────────────────────────────
    const dates = datesForStatus(p.status, i);
    const start_date = p.start_date ?? dates.start_date;
    const end_date = p.end_date ?? dates.end_date;

    // ── Progresso ─────────────────────────────────────────────────────────────
    const progressIsIncoherent =
      p.progress === 0 ||
      (p.status === "completed" && p.progress < 100) ||
      (p.status === "in-progress" && p.progress < 5);
    const progress = progressIsIncoherent ? progressForStatus(p.status, i) : p.progress;

    // ── Spent ─────────────────────────────────────────────────────────────────
    const spentIsEmpty =
      (!p.spent || p.spent === 0) &&
      !["draft", "negotiation"].includes(p.status);
    const spent = spentIsEmpty ? spentForStatus(p.status, value, progress, i) : p.spent;

    // ── Flags ─────────────────────────────────────────────────────────────────
    const portfolio_permission = p.status === "completed"
      ? i % 2 === 0
      : ["in-progress", "planning"].includes(p.status)
      ? i % 3 === 0
      : false;
    const bitrix_sync = ["awaiting-payment", "planning", "in-progress", "paused", "completed"].includes(p.status);

    // ── Ciclo mensal ──────────────────────────────────────────────────────────
    const billing_day = isMensal
      ? (p.billing_day ?? MENSAL_BILLING_DAYS[i % MENSAL_BILLING_DAYS.length])
      : p.billing_day;
    const billing_start_date = isMensal
      ? (p.billing_start_date ?? start_date.toISOString().split("T")[0])
      : p.billing_start_date;

    // ── Team size ─────────────────────────────────────────────────────────────
    const teamSizeByType: Record<string, [number, number]> = {
      "E-commerce":              [3, 6],
      "Desenvolvimento Web":     [3, 5],
      "Desenvolvimento Móvel": [3, 6],
      "Consultoria":             [1, 3],
      "Produção de Conteúdo": [2, 4],
      "Design":                  [2, 3],
      "Marketing Digital":       [2, 4],
    };
    const [tsMin, tsMax] = teamSizeByType[type] ?? [2, 4];
    const team_size = p.team_size && p.team_size > 0 ? p.team_size : inRange(i, tsMin, tsMax, 13);

    // ── Exemplo de log ────────────────────────────────────────────────────────
    if (examples.length < 5) {
      examples.push(
        `  [${p.status.padEnd(17)}] "${p.title}"\n` +
        `     type=${type}, lifecycle=${lifecycle}, progress=${progress}%, value=R$${value.toLocaleString("pt-BR")}\n` +
        `     consultor="${consultant}", email="${consultant_email}"\n` +
        `     desc: ${(description ?? "").substring(0, 90)}...`
      );
    }

    // ── Update ────────────────────────────────────────────────────────────────
    if (!DRY_RUN) {
      await prisma.project.update({
        where: { id: p.id },
        data: {
          type,
          description,
          consultant,
          consultant_email,
          start_date,
          end_date,
          value,
          budget,
          spent,
          progress,
          lifecycle,
          portfolio_permission,
          bitrix_sync,
          team_size,
          ...(billing_day !== null && billing_day !== undefined ? { billing_day } : {}),
          ...(billing_start_date ? { billing_start_date } : {}),
        },
      });
    }

    totalUpdated++;
  }

  // ── Relatório ─────────────────────────────────────────────────────────────
  console.log(`  Projetos processados:       ${totalUpdated}`);
  console.log(`  Projetos que ficam avulso:  ${totalAvulso}`);
  console.log(`  Projetos que ficam mensal:  ${totalMensal}`);
  console.log(`\n  Distribuição por status:`);
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status.padEnd(22)} ${count}`);
  }
  console.log(`\n  Exemplos (${examples.length} projetos):`);
  for (const ex of examples) console.log(ex);

  if (DRY_RUN) {
    console.log(`\n  [✓] DRY-RUN concluído. Nenhum dado foi alterado.\n`);
  } else {
    console.log(`\n  [✓] ${totalUpdated} projetos atualizados com sucesso.\n`);
    // ── Validação rápida pós-seed ────────────────────────────────────────────
    const [total, withDesc, withStart, withEnd, withValue, withBudget, withProgress, mensal] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { description: { not: null } } }),
      prisma.project.count({ where: { start_date: { not: null } } }),
      prisma.project.count({ where: { end_date: { not: null } } }),
      prisma.project.count({ where: { value: { gt: 0 } } }),
      prisma.project.count({ where: { budget: { gt: 0 } } }),
      prisma.project.count({ where: { progress: { gt: 0 } } }),
      prisma.project.count({ where: { lifecycle: "mensal" } }),
    ]);
    console.log("  ── Validação pós-seed ──────────────────────────");
    console.log(`    Total de projetos:            ${total}  (deve ser 45)`);
    console.log(`    Com description preenchida:   ${withDesc} / ${total}`);
    console.log(`    Com start_date:               ${withStart} / ${total}`);
    console.log(`    Com end_date:                 ${withEnd} / ${total}`);
    console.log(`    Com value > 0:                ${withValue} / ${total}`);
    console.log(`    Com budget > 0:               ${withBudget} / ${total}`);
    console.log(`    Com progress > 0:             ${withProgress} / ${total}`);
    console.log(`    Com lifecycle = mensal:        ${mensal} / ${total}`);
    console.log();
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
