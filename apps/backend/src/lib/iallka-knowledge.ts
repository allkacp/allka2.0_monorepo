// Base de conhecimento da IAllka — catálogo2 e documentos administrativos
// (reunião 10/09, "Base de conhecimento da IAllka — catálogo e briefings").
//
// NUNCA embeddings/busca vetorial: o catálogo2 tem ~37 produtos hoje — texto
// puro montado NA HORA da chamada (mesmo padrão já usado em
// ai-knowledge-base.ts/ai-consultor.ts) é suficiente, sempre atualizado (sem
// job de sincronização que possa ficar desatualizado ou duplicar conteúdo) e
// mais simples de auditar. Se o catálogo crescer a ponto de pesar no prompt,
// o próximo passo natural é paginar/filtrar por relevância — não vetorizar.
//
// Este arquivo NUNCA altera a estrutura da proposta (`selected_products`,
// que continua vindo só do catálogo LEGADO — ver lib/iallka.ts,
// buildProductCatalogContext) — o catálogo2 aqui é só INFORMATIVO, pra a
// IAllka responder perguntas e explicar produtos reais. Reformular a
// montagem de projeto pra usar ids do catalog2 é um problema maior (o
// vínculo Project->catalog2 ainda nem está em uso — ver
// ProjectProduct.catalog2_product_id, sempre nulo hoje) e fica fora deste
// bloco.
import { prisma } from "./prisma";
import { computePricing, defaultSelection } from "./catalog2-pricing";
import { getCategoryKnowledgeText, getProjectDocumentsText } from "./ai-knowledge-base";

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";

export interface KnowledgeSource {
  type: "produto" | "documento" | "projeto";
  name: string;
  detail?: string;
  updated_at?: string;
}

interface Catalog2KnowledgeOpts {
  /** Admin Master vendo o contexto administrativo — só quem pode ver
   * preço/prazo PROVISÓRIOS marcados como tal (nunca fato comercial). */
  includeProvisional: boolean;
  /** Company/Agency/Partner: só produtos realmente visíveis pro cliente
   * (mesma regra de checkClientVisibility/listClientProducts) — Admin
   * Master vê tudo, inclusive em preparação, sempre rotulado como tal. */
  clientVisibleOnly: boolean;
}

/** Catálogo2 — bloco INFORMATIVO (nunca usado pra `selected_products`).
 * Nunca inclui a fixture "[TESTE LOCAL]"; nunca apresenta preço/prazo
 * provisório como fato comercial (sempre rotulado "[PROVISÓRIO]", e só
 * quando `includeProvisional` for true); nunca lista um produto "em
 * preparação" como contratável. */
export async function buildCatalog2KnowledgeText(opts: Catalog2KnowledgeOpts): Promise<{ text: string; sources: KnowledgeSource[] }> {
  const products = await prisma.catalog2Product.findMany({
    where: { NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } } },
    include: {
      pillar: { select: { name: true } },
      category: { select: { name: true } },
      four_f: { select: { four_f: { select: { name: true } } } },
      import_origin: { select: { pendencies_json: true } },
      provisional_preview: true,
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          _count: { select: { variations: true, addons: true, tasks: true } },
          tasks: { select: { specialty: { select: { name: true } }, _count: { select: { steps: true } } } },
        },
      },
    },
    orderBy: { internal_name: "asc" },
  });

  const sources: KnowledgeSource[] = [];
  const lines: string[] = [];

  for (const p of products) {
    const published = p.versions.find((v) => v.id === p.published_version_id) ?? null;
    const draft = p.versions.find((v) => v.state === "rascunho") ?? p.versions[0] ?? null;
    const target = published ?? draft;
    if (!target) continue;

    let pricing: Awaited<ReturnType<typeof computePricing>> | null = null;
    try {
      pricing = await computePricing(target.id, await defaultSelection(target.id));
    } catch {
      pricing = null;
    }

    const pend = safeJsonArray(p.import_origin?.pendencies_json);
    const clientVisible = p.status === "disponivel" && !!published && pend.length === 0 && !!pricing?.commercial_ready;
    if (opts.clientVisibleOnly && !clientVisible) continue; // cliente comum nunca vê o que não pode contratar

    const specialties = Array.from(new Set(target.tasks.map((t) => t.specialty?.name).filter((n): n is string => !!n)));
    const stepCount = target.tasks.reduce((a, t) => a + t._count.steps, 0);
    const fourFs = p.four_f.map((l) => l.four_f.name);

    let priceText: string;
    let deadlineText: string;
    const realAmount = pricing?.commercial_ready ? pricing.lines.commercial_final_price.amount : null;
    if (pricing?.commercial_ready && realAmount != null) {
      priceText = `R$ ${realAmount.toFixed(2)} [REAL]`;
      deadlineText = `${pricing.deadline.commercial_deadline_days} dia(s) [REAL]`;
    } else if (opts.includeProvisional && p.provisional_preview?.price_amount != null) {
      priceText = `R$ ${p.provisional_preview.price_amount.toFixed(2)} [PROVISÓRIO — revisar, nunca oferecer como preço final]`;
      deadlineText = `${p.provisional_preview.deadline_days ?? "?"} dia(s) [PROVISÓRIO — revisar]`;
    } else {
      priceText = "a definir (produto em preparação, sem preço comercial ainda)";
      deadlineText = "a definir (produto em preparação, sem prazo comercial ainda)";
    }

    const disponibilidade = clientVisible
      ? "disponível para contratação"
      : "EM PREPARAÇÃO — não contratável ainda, nunca recomende como se já pudesse ser contratado";

    lines.push(
      [
        `- ${p.internal_name}`,
        `categoria: ${p.category?.name ?? "sem categoria"}`,
        `pilar: ${p.pillar?.name ?? "sem pilar"}`,
        fourFs.length ? `4Fs: ${fourFs.join(", ")}` : null,
        specialties.length ? `especialidades: ${specialties.join(", ")}` : null,
        target.summary ? `resumo: ${target.summary.slice(0, 240)}` : null,
        `variações/adicionais: ${target._count.variations} variação(ões), ${target._count.addons} adicional(is)`,
        `estrutura: ${target._count.tasks} tarefa(s), ${stepCount} etapa(s)`,
        `preço: ${priceText}`,
        `prazo: ${deadlineText}`,
        `status: ${p.status}`,
        pend.length ? `pendências: ${pend.join(", ")}` : "pendências: nenhuma",
        `disponibilidade: ${disponibilidade}`,
      ]
        .filter(Boolean)
        .join(" | "),
    );
    sources.push({ type: "produto", name: p.internal_name, detail: p.slug, updated_at: p.updated_at.toISOString() });
  }

  if (lines.length === 0) {
    return { text: "(nenhum produto catalog2 disponível para consulta no momento)", sources: [] };
  }
  return { text: lines.join("\n"), sources };
}

/** Documentos administrativos já aprovados (AIKnowledgeCategory/Document,
 * gerenciados em Configurações > Base de Conhecimento IA) — conhecimento
 * COMPARTILHADO por definição (só entra ali por decisão de um Admin
 * Master), nunca dado privado de projeto. */
export async function buildAdminKnowledgeText(): Promise<{ text: string; sources: KnowledgeSource[] }> {
  const categories = ["produtos", "briefing"] as const;
  const parts: string[] = [];
  const sources: KnowledgeSource[] = [];
  for (const key of categories) {
    const text = await getCategoryKnowledgeText(key);
    if (text.trim()) {
      parts.push(`### Categoria: ${key}\n${text}`);
      sources.push({ type: "documento", name: key });
    }
  }
  return { text: parts.join("\n\n---\n\n"), sources };
}

/** Briefing de projeto — dado PRIVADO. Só deve ser chamado depois de validar
 * que o projeto pertence à conta da sessão (ver routes/iallka.ts); nunca
 * cacheado nem misturado com o conhecimento compartilhado acima. */
export async function buildProjectBriefingText(projectId: string): Promise<{ text: string; source: KnowledgeSource } | null> {
  const text = await getProjectDocumentsText(projectId);
  if (!text.trim()) return null;
  return { text, source: { type: "projeto", name: "Documentos do projeto", detail: projectId } };
}

function safeJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
