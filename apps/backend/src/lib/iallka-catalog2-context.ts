// Item 9 (reunião 2026-09-14, "Atualizar o contexto da Aura") — contexto
// PRODUTO/COTAÇÃO/HISTÓRICO específicos pra a Aura explicar as regras dos
// Itens 2-8 (status/disponibilidade, prontidão comercial, proteção de
// preço, inativação programada, períodos/ciclos de entrega, histórico).
//
// Regra central desta etapa: NUNCA reproduzir cálculo/regra comercial no
// prompt — todo texto aqui é montado a partir do resultado de funções já
// existentes (checkClientVisibility, computeInactivationState, assessQuote,
// listPeriodsForAdmin, listCatalog2ProductHistory). Este arquivo só FORMATA
// o resultado real em texto; nunca deriva um preço, uma data de proteção ou
// uma disponibilidade por conta própria.
//
// Autorização: cada função abaixo resolve/reautoriza o dado no SERVIDOR a
// partir do id recebido — o id vindo do frontend é só um HINT (mesmo
// princípio já usado por routes/iallka.ts para `project_id`). Um produto
// não visível pro perfil, ou uma cotação de outra conta, nunca chega a
// gerar texto — a função devolve `null` e a Aura informa que não tem essa
// informação, em vez de vazar a existência/detalhe do registro.

import { prisma } from "./prisma";
import { checkClientVisibility, resolveClientContext, loadOwnedQuote, assessQuote } from "./catalog2-client";
import { computeInactivationState, CATALOG2_INACTIVATION_NOTICE_DAYS } from "./catalog2-service";
import { listPeriodsForAdmin } from "./catalog2-periods";
import { listCatalog2ProductHistory } from "./catalog2-product-history";
import type { KnowledgeSource } from "./iallka-knowledge";

export interface Catalog2ProductAuraOpts {
  /** Admin Master: vê rascunho + publicada, pendências, dados provisórios.
   * Conta comercial: só a versão PUBLICADA, nunca pendência/provisório. */
  isAdminMaster: boolean;
  /** Produto precisa estar realmente visível pro perfil (mesma regra do
   * catálogo do cliente) — nunca revela um produto "em preparação" pra
   * quem não é Admin Master. */
  clientVisibleOnly: boolean;
}

/**
 * Explica UM produto real: status/disponibilidade/bloqueios, pendências e
 * dados provisórios (só Admin Master), tarefas/etapas/questionários,
 * modalidades/descontos configurados e recorrência de entrega, e inativação
 * programada com data efetiva. Devolve `null` quando o produto não existe
 * ou não é visível pro perfil que está perguntando — nunca um texto parcial
 * que insinue a existência do registro.
 */
export async function buildCatalog2ProductAuraContext(
  productId: string,
  opts: Catalog2ProductAuraOpts,
): Promise<{ text: string; source: KnowledgeSource } | null> {
  const product = await prisma.catalog2Product.findUnique({
    where: { id: productId },
    include: {
      pillar: { select: { name: true } },
      category: { select: { name: true } },
      import_origin: { select: { pendencies_json: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          tasks: {
            orderBy: { sort_order: "asc" },
            include: {
              specialty: { select: { name: true } },
              questionnaire: { select: { name: true, questions: { select: { id: true } } } },
              steps: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!product) return null;

  const vis = await checkClientVisibility(product);
  if (opts.clientVisibleOnly && !vis.visible) return null;

  const published = product.versions.find((v) => v.id === product.published_version_id) ?? null;
  // Admin Master pode estar olhando um rascunho ainda não publicado; conta
  // comercial só enxerga o que já está publicado (nunca um rascunho interno).
  const target = opts.isAdminMaster ? (product.versions.find((v) => v.state === "rascunho") ?? published) : published;

  const inact = computeInactivationState(product);
  const periods = await listPeriodsForAdmin(product.id);
  const configuredPeriods = periods.filter((p) => p.configured);

  const lines: string[] = [
    `Produto: ${product.internal_name} (slug: ${product.slug})`,
    `Categoria: ${product.category?.name ?? "sem categoria"} | Pilar: ${product.pillar?.name ?? "sem pilar"}`,
    `Status administrativo: ${product.status}`,
    `Visível no catálogo do cliente: ${vis.visible ? "sim" : "não"}${vis.reasons.length ? ` (${vis.reasons.join("; ")})` : ""}`,
    `Contratável agora (proposta nova): ${vis.contractable ? "sim" : "não"}`,
    `Contratação já existente continua honrada: ${vis.contractable_existing ? "sim" : "não"}`,
  ];

  if (opts.isAdminMaster) {
    const pend = safeJsonArray(product.import_origin?.pendencies_json);
    lines.push(pend.length ? `Pendências administrativas: ${pend.join(", ")}` : "Pendências administrativas: nenhuma.");
  }

  if (target) {
    const stepCount = target.tasks.reduce((a, t) => a + t.steps.length, 0);
    const withQuestionnaire = target.tasks.filter((t) => t.questionnaire);
    const hasProvisionalEffort = target.tasks.some((t) => t.effort_is_provisional);
    lines.push(
      `Versão em referência: v${target.version_number} (${target.state}).`,
      `Tarefas: ${target.tasks.length} — ${target.tasks.map((t) => `"${t.name}"${t.specialty ? ` (${t.specialty.name})` : ""}`).join(", ") || "nenhuma cadastrada"}.`,
      `Etapas no total: ${stepCount}.`,
      withQuestionnaire.length
        ? `Questionários vinculados: ${withQuestionnaire.map((t) => `"${t.questionnaire!.name}" (tarefa "${t.name}", ${t.questionnaire!.questions.length} pergunta(s))`).join("; ")}.`
        : "Nenhuma tarefa tem questionário vinculado.",
    );
    if (opts.isAdminMaster && hasProvisionalEffort) {
      lines.push("Atenção: pelo menos uma tarefa tem esforço/tempo PROVISÓRIO (dado de teste) — nunca apresente isso como definitivo.");
    }
  } else {
    lines.push("Nenhuma versão publicada disponível para detalhar tarefas/etapas.");
  }

  lines.push(
    `Entrega mensal recorrente: ${product.delivery_recurrence === "mensal" ? "sim — períodos pagos liberam um novo ciclo de tarefas a cada mês" : "não definida — nenhum período fica disponível para contratação até isso ser configurado"}.`,
    configuredPeriods.length
      ? `Modalidades por período configuradas: ${configuredPeriods.map((p) => `${p.label} (${p.months} mês(es), ${p.is_active ? "ativo" : "inativo"})`).join(", ")}.`
      : "Nenhuma modalidade de período configurada ainda.",
  );

  if (inact.isScheduled) {
    lines.push(
      `Inativação programada: sim — data efetiva ${inact.effectiveAt?.toISOString().slice(0, 10) ?? "não definida"} (aviso de ${CATALOG2_INACTIVATION_NOTICE_DAYS} dias). ${inact.isEffective ? "Já efetivada — produto não pode mais ser contratado." : "Ainda dentro do prazo de aviso — contratações novas já bloqueadas, propostas e contratos existentes continuam honrados até a data efetiva."} Nunca prometa crédito, desconto ou cancelamento automático — a compensação financeira da inativação ainda não tem regra definida.`,
    );
  } else {
    lines.push("Inativação programada: não há nenhuma agendada para este produto agora.");
  }

  return {
    text: lines.join("\n"),
    source: { type: "produto", name: product.internal_name, detail: product.slug, updated_at: product.updated_at.toISOString() },
  };
}

export interface Catalog2QuoteAuraResult {
  /** false = a cotação não pertence à conta do dono da sessão (ou não
   * existe) — o CHAMADOR (rota) deve recusar o turno com 403, o mesmo
   * tratamento já dado a `project_id` fora de escopo (isolamento entre
   * contas, recusado ANTES de qualquer chamada à IA). true nos demais
   * casos, mesmo quando `content` acaba nulo por algum motivo interno. */
  authorized: boolean;
  content: { text: string; source: KnowledgeSource } | null;
}

/**
 * Resolve e explica UMA cotação identificada: preço congelado, proteção de
 * 30 dias, validade e o efeito real de uma renovação agora — tudo a partir
 * de `assessQuote` (mesmo cálculo de revalidate/renew, nunca reimplementado
 * aqui). `authorized:false` quando a cotação não existe ou não pertence à
 * conta do dono da sessão (Admin Master pode ver qualquer uma, pra
 * suporte) — nunca revela cotação de outra conta.
 */
export async function resolveCatalog2QuoteAuraContext(
  quoteId: string,
  sessionOwnerId: string,
  sessionOwnerAccountType: string,
  sessionOwnerRole: string,
  isAdminMaster: boolean,
): Promise<Catalog2QuoteAuraResult> {
  let quote: Awaited<ReturnType<typeof prisma.catalog2Quote.findUnique>>;
  if (isAdminMaster) {
    quote = await prisma.catalog2Quote.findUnique({ where: { id: quoteId } });
  } else {
    try {
      const ctx = await resolveClientContext(sessionOwnerId, sessionOwnerAccountType, sessionOwnerRole);
      quote = await loadOwnedQuote(ctx, quoteId);
    } catch {
      return { authorized: false, content: null }; // cotação de outra conta, ou perfil sem contexto de cliente
    }
  }
  if (!quote) return { authorized: false, content: null };

  const assessment = await assessQuote(quote);
  const product = await prisma.catalog2Product.findUnique({
    where: { id: quote.product_id },
    select: { internal_name: true, published_version: { select: { title: true } } },
  });
  const publicName = product?.published_version?.title ?? product?.internal_name ?? "produto";

  const lines: string[] = [
    `Produto da cotação: ${publicName}`,
    `Status da cotação: ${quote.status}`,
    `Preço congelado nesta cotação: ${quote.currency} ${quote.commercial_price != null ? quote.commercial_price.toFixed(2) : "a definir"}`,
    `Válida até: ${quote.valid_until ? quote.valid_until.toISOString().slice(0, 10) : "sem validade definida"}`,
  ];

  if (assessment.protectionEndsAt) {
    lines.push(
      `Proteção de preço de 30 dias: ${assessment.withinProtectionWindow ? "ainda ativa" : "janela já encerrada"}, até ${assessment.protectionEndsAt.toISOString().slice(0, 10)}.`,
    );
  } else {
    lines.push("Esta cotação ainda não tem uma data de início de proteção de preço registrada.");
  }

  if (assessment.needsRenewal) {
    const efeito = assessment.structurallyBroken
      ? "o produto ou o escopo contratado mudou estruturalmente — uma renovação recalcularia o preço pela regra comercial atual, sem proteção."
      : assessment.withinProtectionWindow
        ? "ainda dentro da proteção — uma renovação agora reemitiria o MESMO preço já congelado."
        : "a proteção de 30 dias já terminou — uma renovação agora recalcularia o preço/prazo pela regra comercial atual.";
    lines.push(`Esta cotação precisa de renovação para continuar válida. Se renovada agora: ${efeito}`);
  } else {
    lines.push("Esta cotação continua válida agora, sem necessidade de renovação.");
  }

  return {
    authorized: true,
    content: {
      text: lines.join("\n"),
      source: { type: "cotacao", name: `Cotação de ${publicName}`, detail: quote.id, updated_at: quote.updated_at.toISOString() },
    },
  };
}

/**
 * Histórico de alterações de um produto — SÓ Admin Master (nunca uma conta
 * comercial). Explica a cobertura real (Item 7.1/7.2: marco persistido,
 * lacunas conhecidas, se há histórico anterior ao marco) e os eventos mais
 * recentes — nunca inventa um evento que não veio de
 * `listCatalog2ProductHistory`.
 */
export async function buildCatalog2HistoryAuraContext(
  productId: string,
  isAdminMaster: boolean,
): Promise<{ text: string; source: KnowledgeSource } | null> {
  if (!isAdminMaster) return null;
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId }, select: { internal_name: true } });
  if (!product) return null;

  const result = await listCatalog2ProductHistory(productId, { page: 1, pageSize: 10 });
  const lines: string[] = [
    `Histórico de: ${product.internal_name}`,
    `Cobertura completa a partir de: ${new Date(result.coverage.full_coverage_since).toLocaleString("pt-BR")}.`,
    result.coverage.status === "complete_since_marker"
      ? "A partir dessa data, o histórico é comprovadamente completo (nenhuma lacuna de categoria em aberto hoje)."
      : `Ainda há lacuna(s) de categoria não instrumentada(s): ${result.coverage.known_gaps.join("; ") || "não especificada"}.`,
    result.coverage.has_history_before_marker
      ? "Este produto tem registros anteriores ao marco de cobertura — esse intervalo anterior é parcial, só mostra o que já era comprovado antes desta revisão."
      : "Este produto não tem nenhum registro anterior ao marco de cobertura completa.",
    `Total de eventos registrados: ${result.total}.`,
  ];
  if (result.data.length > 0) {
    lines.push(
      `Eventos mais recentes: ${result.data
        .slice(0, 5)
        .map((e) => `${e.created_at.toISOString().slice(0, 10)} — ${e.description}`)
        .join(" | ")}`,
    );
  } else {
    lines.push("Nenhum evento registrado ainda.");
  }

  return {
    text: lines.join("\n"),
    source: { type: "historico", name: `Histórico de ${product.internal_name}`, detail: productId },
  };
}

function safeJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
