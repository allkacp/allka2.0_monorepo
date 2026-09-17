// Item 7 (reunião 2026-09-14, "Histórico de alterações do produto") —
// registro e leitura unificada do histórico de um produto catalog2.
//
// Reaproveita e MESCLA (nunca duplica) os mecanismos já existentes:
//   - Catalog2VersionEvent (criação/nova versão/publicação — já escrito por
//     catalog2-service.ts);
//   - Catalog2CommercialChangeEvent, escopos "product_version" (mudança
//     comercial que afeta este produto), "global_settings" (afeta TODOS os
//     produtos) e "specialty_rate" (afeta produtos cujas tarefas usam
//     aquela especialidade) — Item 4.1/6/6.1, já escrito por
//     catalog2-service.ts/catalog2-admin.ts.
// Catalog2ProductHistoryEvent (nova) cobre só o que os dois acima NÃO
// cobrem — ver comentário do modelo em schema.prisma.
//
// Item 7.1 (reunião 2026-09-14, "Fechar a integridade do histórico") —
// revisão que:
//   1. troca a data fixa de cobertura por um MARCO PERSISTIDO no ambiente
//      (Catalog2HistoryCoverageMarker) — nunca a data da reunião, nunca o
//      primeiro evento como prova;
//   2. faz `recordCatalog2ProductHistory` PROPAGAR erro (nunca engolir) —
//      quem chama SEMPRE roda dentro da MESMA transação da alteração real,
//      então uma falha ao gravar o histórico reverte a alteração junto;
//   3. mescla também "global_settings"/"specialty_rate" (mudanças
//      comerciais compartilhadas, atribuídas por vínculo real — nunca
//      inventado) e amplia os tipos de evento cobertos (etapas, adicionais
//      atualizados/removidos, perguntas editadas pelas rotas diretas).
//
// Item 7.2 (reunião 2026-09-14, "Completar o histórico do produto") —
// fecha a lacuna de variações/opções (criação/edição/exclusão/ordem +
// efeitos comerciais de opção) e corrige a REGRA DE COBERTURA: o marco do
// Item 7.1 foi criado enquanto essa lacuna ainda existia, então fechá-la
// agora não pode "provar" cobertura completa antes disso. Em vez de exigir
// "nenhum registro anterior ao marco" (o que nunca seria verdade pra
// produtos mais antigos, mesmo com todas as lacunas fechadas), a cobertura
// agora é um LIMITE TEMPORAL versionado: cada vez que uma lacuna de
// categoria fecha, uma NOVA linha de marco é criada (nunca reescreve a
// antiga — `Catalog2HistoryCoverageMarker` é reaproveitada, só o `id` muda
// pra uma chave versionada) com a data REAL deste deploy/ambiente. A linha
// antiga permanece no banco pra sempre — nunca apagada, nunca usada pra
// provar cobertura anterior à sua própria data real (ver
// CATALOG2_HISTORY_COVERAGE_VERSION abaixo).

import type { DbClient } from "./project-scope";
import { prisma } from "./prisma";

export type Catalog2HistoryActorKind = "user" | "import" | "system";

export interface RecordCatalog2ProductHistoryInput {
  productId: string;
  versionId?: string | null;
  eventType: string;
  description: string;
  before?: unknown;
  after?: unknown;
  actorUserId?: string | null;
  actorKind?: Catalog2HistoryActorKind;
}

/**
 * Grava um evento de histórico — SEMPRE chamado depois que a alteração real
 * já foi confirmada no banco (nunca antes de uma validação, nunca se a
 * operação foi recusada) — assim uma operação recusada/revertida nunca
 * aparece como concluída.
 *
 * Item 7.1: ao contrário da versão original (que engolia o erro), esta
 * função agora PROPAGA qualquer falha de escrita. Isso só é seguro porque
 * todo chamador passa o MESMO `db` (um `tx` de `prisma.$transaction`) usado
 * pela alteração real que este evento descreve — se a gravação do
 * histórico falhar, a transação inteira faz rollback, e a alteração nunca
 * fica "meio aplicada" sem o registro correspondente. Nunca chame isto fora
 * de uma transação que também contenha a alteração real.
 */
export async function recordCatalog2ProductHistory(db: DbClient, input: RecordCatalog2ProductHistoryInput): Promise<void> {
  await db.catalog2ProductHistoryEvent.create({
    data: {
      product_id: input.productId,
      version_id: input.versionId ?? null,
      event_type: input.eventType,
      description: input.description,
      before_json: input.before !== undefined ? JSON.stringify(input.before) : null,
      after_json: input.after !== undefined ? JSON.stringify(input.after) : null,
      actor_user_id: input.actorUserId ?? null,
      actor_kind: input.actorKind ?? "user",
    },
  });
}

export interface UnifiedCatalog2HistoryEvent {
  id: string;
  source: "history" | "version_event" | "commercial_change";
  event_type: string;
  description: string;
  before: unknown;
  after: unknown;
  actor_user_id: string | null;
  actor_kind: Catalog2HistoryActorKind;
  version_id: string | null;
  created_at: Date;
  /** true para eventos comerciais compartilhados (global_settings/
   * specialty_rate) que afetam este produto por vínculo (todos os produtos,
   * ou produtos que usam a especialidade), não por serem exclusivos dele —
   * a interface usa isto pra deixar claro que a mudança não foi feita
   * "neste produto" especificamente. */
  shared?: boolean;
}

// Agrupamento por categoria, pra filtro simples na interface — cada
// categoria mapeia pra um conjunto de event_type reais, nunca inventa um
// novo tipo.
export const CATALOG2_HISTORY_CATEGORIES: Record<string, string[]> = {
  conteudo: ["content_updated", "classification_updated"],
  tarefas: [
    "task_added", "task_updated", "task_removed",
    "step_added", "step_updated", "step_removed",
    "questionnaire_linked", "questionnaire_unlinked", "questionnaire_content_updated",
  ],
  variacoes: [
    "variation_added", "variation_updated", "variation_removed",
    "option_added", "option_updated", "option_removed",
    "option_effect_added", "option_effect_removed",
    "addon_added", "addon_updated", "addon_removed",
    "addon_effect_added", "addon_effect_removed",
  ],
  status: ["status_changed", "archived", "inactivation_scheduled", "inactivation_cancelled", "inactivation_processed"],
  periodos: ["period_configured", "period_removed", "delivery_recurrence_set"],
  versao: ["created", "new_version", "published"],
  comercial: ["commercial_change", "commercial_change_global", "commercial_change_specialty_rate"],
};

const VERSION_EVENT_LABEL: Record<string, string> = {
  created: "Produto criado (1ª versão)",
  new_version: "Nova versão criada a partir da publicada",
  published: "Versão publicada",
  updated: "Versão atualizada",
};

// Categorias que o Item 7 pediu cobrir, mas que ainda NÃO estão
// instrumentadas — declarado explicitamente (nunca escondido) pra nunca
// apresentar o histórico como mais completo do que realmente é. Atualizar
// esta lista (e só esta lista, nunca uma data) quando alguma dessas
// lacunas for fechada — e, ao esvaziá-la ou reduzi-la, bumpar
// CATALOG2_HISTORY_COVERAGE_VERSION (ver abaixo) na MESMA mudança.
// Item 7.2 fechou a última lacuna conhecida (efeitos de adicional) — lista
// vazia por enquanto. Nunca remover o mecanismo (a checagem continua ativa
// pra qualquer lacuna futura); só passa a ficar vazia porque não há mais
// nenhuma categoria pedida pelo Item 7 sem instrumentação.
export const CATALOG2_HISTORY_KNOWN_GAPS: string[] = [];

// Item 7.2: versão da COBERTURA (não do código) — incrementada toda vez
// que uma entrada de CATALOG2_HISTORY_KNOWN_GAPS é fechada. Cada versão
// tem sua PRÓPRIA linha em Catalog2HistoryCoverageMarker (reaproveita a
// mesma tabela/model do Item 7.1 — só o `id` muda), criada de forma
// preguiçosa (upsert, na 1ª vez que o código desta versão roda neste
// ambiente) com a data REAL daquele momento. A linha de uma versão
// anterior nunca é apagada nem reescrita — permanece no banco como
// registro histórico de quando aquele nível de cobertura começou, mas
// NUNCA é usada pra provar cobertura de uma versão posterior (ver
// getCatalog2HistoryCoverageMarker).
//   v1 (Item 7.1): produto/classificação/tarefas/etapas/questionários
//     (incl. rotas diretas)/adicionais(add,update,remove)/status/
//     inativação/períodos/comercial global e por especialidade.
//   v2 (Item 7.2): + variações e opções (criação/edição/exclusão/ordem) e
//     efeitos comerciais de opção (adicionados/removidos).
export const CATALOG2_HISTORY_COVERAGE_VERSION = 2;
const COVERAGE_MARKER_ID = `coverage-v${CATALOG2_HISTORY_COVERAGE_VERSION}`;

// Cache em memória do marco — válido por processo. Nunca é reescrito depois
// de criado (só lido de novo se o cache local ainda não foi aquecido nesta
// instância do processo, ou depois de um reset explícito de teste), então
// múltiplas chamadas no mesmo processo nunca disparam uma nova data.
let cachedCoverageMarker: Date | null = null;

/**
 * Devolve (criando na primeira vez, se preciso) o marco PERSISTIDO de
 * início da cobertura completa do histórico NESTE ambiente/banco, PRA
 * VERSÃO DE COBERTURA ATUAL (CATALOG2_HISTORY_COVERAGE_VERSION) — nunca
 * uma data fixa no código, nunca a data da reunião, nunca a data do
 * primeiro evento (que só prova que ALGO foi registrado então, não que
 * TUDO passou a ser), e nunca herdada de uma versão de cobertura anterior
 * (Item 7.1 fechou uma lista de lacunas diferente da de hoje — reaproveitar
 * aquele marco pra "provar" cobertura de variações/opções seria uma
 * cobertura retroativa inválida). `upsert` idempotente: a primeira chamada
 * (em qualquer ambiente — dev, staging, produção, ou um banco descartável
 * de teste) DEPOIS de uma versão de cobertura nova grava `new Date()` uma
 * única vez, numa linha NOVA (id específico da versão); todas as chamadas
 * seguintes, neste processo ou em processos futuros, sempre leem a MESMA
 * data gravada pra essa versão — nunca retroativa, nunca recalculada a
 * cada reinício.
 */
export async function getCatalog2HistoryCoverageMarker(db: DbClient = prisma): Promise<Date> {
  if (cachedCoverageMarker) return cachedCoverageMarker;
  const row = await db.catalog2HistoryCoverageMarker.upsert({
    where: { id: COVERAGE_MARKER_ID },
    create: { id: COVERAGE_MARKER_ID },
    update: {},
  });
  cachedCoverageMarker = row.full_coverage_since;
  return cachedCoverageMarker;
}

/** Só para testes — simula um "reinício do processo" limpando o cache
 * local, forçando a próxima leitura a ir ao banco de novo (e confirmar que
 * volta o MESMO valor já persistido, nunca um novo). */
export function __resetCatalog2HistoryCoverageMarkerCacheForTests(): void {
  cachedCoverageMarker = null;
}

export interface Catalog2HistoryCoverage {
  /** ISO da data REAL a partir da qual a cobertura está completa NESTA
   * versão de cobertura (todas as categorias em CATALOG2_HISTORY_KNOWN_GAPS
   * vazias) — sempre presente depois da 1ª leitura/escrita de histórico
   * neste ambiente. Nunca retroage a uma versão de cobertura anterior. */
  full_coverage_since: string;
  /** "complete_since_marker": não há NENHUMA lacuna de categoria conhecida
   * em aberto (`known_gaps` vazio) — a partir de `full_coverage_since`, o
   * histórico é comprovadamente completo pra todas as categorias pedidas.
   * Isto NÃO depende de o produto não ter registros anteriores ao marco —
   * um produto mais antigo ainda tem cobertura completa A PARTIR do
   * marco, só o intervalo ANTERIOR a ele é que fica parcial (ver
   * `has_history_before_marker`). "partial": ainda existe alguma lacuna de
   * categoria em aberto — o histórico nunca pode ser chamado de completo,
   * nem a partir do marco, enquanto isso for verdade. */
  status: "partial" | "complete_since_marker";
  /** Categorias que o Item 7 pediu cobrir e que ainda não estão
   * instrumentadas — nunca escondido, ver CATALOG2_HISTORY_KNOWN_GAPS. */
  known_gaps: string[];
  /** true quando este produto tem registros (versões) anteriores a
   * `full_coverage_since` — sinaliza que o INTERVALO ANTERIOR ao marco é
   * histórico parcial (só o que os mecanismos antigos já comprovavam),
   * mesmo quando `status` é "complete_since_marker" pra tudo dali em
   * diante. As três coisas são distintas de propósito: histórico anterior
   * parcial (`has_history_before_marker`), lacunas atuais (`known_gaps`),
   * e a data real da cobertura completa (`full_coverage_since`). */
  has_history_before_marker: boolean;
}

export interface ListCatalog2ProductHistoryOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ListCatalog2ProductHistoryResult {
  data: UnifiedCatalog2HistoryEvent[];
  total: number;
  page: number;
  page_size: number;
  /** @deprecated use `coverage.full_coverage_since` — mantido pra
   * compatibilidade de quem já lê este campo direto. */
  full_history_since: string;
  coverage: Catalog2HistoryCoverage;
}

/**
 * Lê e mescla as fontes num único histórico ordenado — filtro e paginação
 * aplicados DEPOIS da mesclagem (volume por produto é pequeno: dezenas a
 * poucas centenas de eventos, nunca milhares; assumido explicitamente,
 * registrado como limitação de escala se algum dia deixar de valer).
 * Ordenação: `created_at` desc, com `id` como desempate — determinística e
 * estável mesmo quando dois eventos de fontes diferentes têm o mesmo
 * timestamp.
 */
export async function listCatalog2ProductHistory(
  productId: string,
  opts: ListCatalog2ProductHistoryOptions = {},
): Promise<ListCatalog2ProductHistoryResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));

  const [marker, ownEvents, versions, commercialEvents] = await Promise.all([
    getCatalog2HistoryCoverageMarker(),
    prisma.catalog2ProductHistoryEvent.findMany({ where: { product_id: productId }, orderBy: { created_at: "asc" } }),
    prisma.catalog2ProductVersion.findMany({ where: { product_id: productId }, select: { id: true, created_at: true } }),
    prisma.catalog2CommercialChangeEvent.findMany({ where: { product_id: productId, scope: "product_version" }, orderBy: { occurred_at: "asc" } }),
  ]);
  const versionIds = versions.map((v) => v.id);
  const [versionEvents, sharedCommercialEvents] = await Promise.all([
    versionIds.length
      ? prisma.catalog2VersionEvent.findMany({ where: { version_id: { in: versionIds } }, orderBy: { created_at: "asc" } })
      : Promise.resolve([]),
    findSharedCommercialEventsForProduct(productId, versionIds),
  ]);

  const merged: UnifiedCatalog2HistoryEvent[] = [
    ...ownEvents.map((e): UnifiedCatalog2HistoryEvent => ({
      id: e.id,
      source: "history",
      event_type: e.event_type,
      description: e.description,
      before: safeParse(e.before_json),
      after: safeParse(e.after_json),
      actor_user_id: e.actor_user_id,
      actor_kind: (e.actor_kind as Catalog2HistoryActorKind) ?? "user",
      version_id: e.version_id,
      created_at: e.created_at,
    })),
    ...versionEvents.map((e): UnifiedCatalog2HistoryEvent => ({
      id: e.id,
      source: "version_event",
      event_type: e.event_type,
      description: VERSION_EVENT_LABEL[e.event_type] ?? e.event_type,
      before: null,
      after: e.note ? { note: e.note } : null,
      actor_user_id: e.actor_user_id,
      actor_kind: "user",
      version_id: e.version_id,
      created_at: e.created_at,
    })),
    ...commercialEvents.map((e): UnifiedCatalog2HistoryEvent => ({
      id: e.id,
      source: "commercial_change",
      event_type: "commercial_change",
      description: e.note ?? "Alteração comercial registrada",
      before: null,
      after: null,
      actor_user_id: e.actor_user_id,
      actor_kind: "user",
      version_id: e.version_id,
      created_at: e.occurred_at,
    })),
    ...sharedCommercialEvents,
  ];

  merged.sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || a.id.localeCompare(b.id));

  const categoryTypes = opts.category ? CATALOG2_HISTORY_CATEGORIES[opts.category] : null;
  const filtered = merged.filter((e) => {
    if (categoryTypes && !categoryTypes.includes(e.event_type)) return false;
    if (opts.dateFrom && e.created_at < opts.dateFrom) return false;
    if (opts.dateTo && e.created_at > opts.dateTo) return false;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  // Item 7.2: `status` responde só "ainda existe lacuna de categoria em
  // aberto?" — nunca mais exige "nenhum registro anterior ao marco" (essa
  // exigência nunca seria satisfeita por um produto mais antigo, mesmo com
  // TODAS as categorias hoje instrumentadas, e não é isso que a pergunta
  // real é: "o histórico é completo A PARTIR do marco?"). Se este produto
  // tem registros anteriores ao marco, isso vira `has_history_before_marker`
  // — um sinal SEPARADO, pra a interface explicar que só o intervalo
  // anterior ao marco é parcial, nunca misturado com o `status` geral.
  const earliestKnownRecord = versions.reduce<Date | null>((min, v) => (!min || v.created_at < min ? v.created_at : min), null);
  const coverage: Catalog2HistoryCoverage = {
    full_coverage_since: marker.toISOString(),
    status: CATALOG2_HISTORY_KNOWN_GAPS.length > 0 ? "partial" : "complete_since_marker",
    known_gaps: CATALOG2_HISTORY_KNOWN_GAPS,
    has_history_before_marker: !!earliestKnownRecord && earliestKnownRecord < marker,
  };

  return { data, total, page, page_size: pageSize, full_history_since: coverage.full_coverage_since, coverage };
}

/**
 * Eventos comerciais COMPARTILHADOS (não exclusivos deste produto),
 * atribuídos por vínculo real — nunca inventado:
 *   - "global_settings": afeta TODOS os produtos comercializáveis (config
 *     de taxas/margem) — sempre incluído, sempre marcado `shared:true`,
 *     com nota deixando claro que é uma mudança compartilhada.
 *   - "specialty_rate": afeta só produtos cujas tarefas (em QUALQUER
 *     versão) usam aquela especialidade — verificado via
 *     Catalog2Task.specialty_id, o mesmo vínculo já usado por
 *     `findEarliestCommercialChangeAfter` (catalog2-commercial-change-log.ts)
 *     pra ancorar a proteção de preço. Produtos cuja ÚNICA tarefa com essa
 *     especialidade já foi removida deixam de aparecer — limitação
 *     conhecida e documentada (o vínculo garantido é o que existe HOJE).
 */
async function findSharedCommercialEventsForProduct(productId: string, versionIds: string[]): Promise<UnifiedCatalog2HistoryEvent[]> {
  const specialtyRows = versionIds.length
    ? await prisma.catalog2Task.findMany({
        where: { version_id: { in: versionIds }, specialty_id: { not: null } },
        select: { specialty_id: true },
        distinct: ["specialty_id"],
      })
    : [];
  const specialtyIds = specialtyRows.map((r) => r.specialty_id).filter((x): x is string => !!x);

  const events = await prisma.catalog2CommercialChangeEvent.findMany({
    where: {
      OR: [
        { scope: "global_settings" },
        ...(specialtyIds.length > 0 ? [{ scope: "specialty_rate" as const, specialty_id: { in: specialtyIds } }] : []),
      ],
    },
    orderBy: { occurred_at: "asc" },
  });
  if (events.length === 0) return [];

  // Pra especialidade, conta quantos OUTROS produtos também usam — só pra
  // deixar a descrição honesta sobre o alcance real da mudança
  // ("compartilhada"), sem enumerar todos (poderia ser uma lista longa).
  const specialtyProductCounts = new Map<string, number>();
  for (const specialtyId of new Set(events.filter((e) => e.scope === "specialty_rate" && e.specialty_id).map((e) => e.specialty_id as string))) {
    const rows = await prisma.catalog2Task.findMany({
      where: { specialty_id: specialtyId },
      select: { version: { select: { product_id: true } } },
      distinct: ["version_id"],
    });
    specialtyProductCounts.set(specialtyId, new Set(rows.map((r) => r.version.product_id)).size);
  }

  return events.map((e): UnifiedCatalog2HistoryEvent => {
    if (e.scope === "global_settings") {
      return {
        id: e.id,
        source: "commercial_change",
        event_type: "commercial_change_global",
        description: `Configuração comercial global alterada (taxas/margens) — afeta todos os produtos comercializáveis, incluindo este.${e.note ? ` (${e.note})` : ""}`,
        before: null,
        after: null,
        actor_user_id: e.actor_user_id,
        actor_kind: "user",
        version_id: null,
        created_at: e.occurred_at,
        shared: true,
      };
    }
    const affected = specialtyProductCounts.get(e.specialty_id ?? "") ?? 1;
    return {
      id: e.id,
      source: "commercial_change",
      event_type: "commercial_change_specialty_rate",
      description: `Valor/hora de uma especialidade usada por este produto foi alterado — afeta ${affected} produto(s) que usam essa especialidade, incluindo este.${e.note ? ` (${e.note})` : ""}`,
      before: null,
      after: null,
      actor_user_id: e.actor_user_id,
      actor_kind: "user",
      version_id: null,
      created_at: e.occurred_at,
      shared: true,
    };
  });
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
