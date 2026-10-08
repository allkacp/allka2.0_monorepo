// Catálogo do CLIENTE do catalog2 (sprint de produtos, bloco 5/6).
//
// O cliente encontra um produto publicado, configura variações/adicionais/
// informações, vê preço e prazo COMERCIAIS calculados no servidor, gera uma
// pré-cotação e adiciona à cesta. NÃO cria compra, pagamento nem projeto.
//
// Regras de ouro:
//   • o servidor recalcula tudo — nada de preço vindo do navegador;
//   • o cliente nunca vê custo interno, margem, imposto, comissão, referência
//     histórica de preço, observações da Rose nem divergências administrativas;
//   • rascunho / suspenso / arquivado nunca aparecem para o cliente;
//   • cotação VÁLIDA exige preço comercial completo + prazo comercial completo
//     + versão publicada + produto disponível + zero pendência obrigatória.

import { clientCommercialView } from "./catalog2-commercial-fields";
import { prisma } from "./prisma";
import { audienceWhere, productVisibleTo as audienceAllows, viewerFromContext } from "./catalog2-audience";
import { config } from "../config";
import { hashPayload } from "./canonical-json";
import { Catalog2Error, isNewByPublicationDate, computeInactivationState } from "./catalog2-service";
import { computePricing, defaultSelection, type PricingResult, type PricingSelection } from "./catalog2-pricing";
import { REQUEST_KIND_LABEL, strongestRequirement } from "./catalog2-availability";
import { findEarliestCommercialChangeAfter } from "./catalog2-commercial-change-log";
import { createCatalog2NotificationJob } from "./catalog2-notifications";
import { OPEN_REQUEST_STATUSES, PROPOSAL_VISIBLE_STATUSES, loadRequestQuestionnaire, notifyAdmins, validateRequestAnswers } from "./catalog2-commercial-flow";
import { connectionsPreviewForClient } from "./connections/quote";
import { linkedProductsForClient } from "./catalog2-linked-products";
import {
  CATALOG2_PERIODS,
  isCatalog2Period,
  computePeriodPricing,
  listAvailablePeriods,
  type Catalog2Period,
  type PeriodPricingResult,
} from "./catalog2-periods";
import {
  CATALOG2_CLIENT_VISIBLE_STATUSES,
  CATALOG2_CONTRACTABLE_STATUSES,
  CATALOG2_STATUS_BLOCK_MESSAGE,
  CATALOG2_STATUS_LABEL,
  type Catalog2Status,
} from "./catalog2-foundation";

// Resolve produto por slug, id técnico OU o ID numérico curto exposto no
// link direto (/catalogo-produtos/:sequence_number) — achado do usuário
// 2026-09-23: o slug completo é grande demais pra compartilhar. Reaproveitado
// em todo endpoint que recebe o produto "da URL" (detalhe, configurar,
// cotação, cesta), pra qualquer um deles aceitar o link curto.
function productLookupWhere(slugOrId: string) {
  const asNumber = Number(slugOrId);
  const or: Array<{ slug: string } | { id: string } | { sequence_number: number }> = [
    { slug: slugOrId },
    { id: slugOrId },
  ];
  if (Number.isInteger(asNumber) && asNumber > 0) or.push({ sequence_number: asNumber });
  return { OR: or };
}

// ── Identidade / permissão do cliente ────────────────────────────────────

export type ClientKind = "admin" | "agency" | "company" | "leader" | "nomad" | "other";

export interface ClientContext {
  user_id: string;
  kind: ClientKind;
  // Conta contratante para isolar cotação/cesta.
  account_kind: "company" | "agency" | "admin_preview";
  account_id: string;
  can_view: boolean;
  can_configure: boolean;
  can_contract: boolean;
  // Admin Master pode abrir rascunhos em "pré-visualizar como cliente".
  can_preview_drafts: boolean;
  // Líder vê o catálogo inteiro (ativo + inativo/em preparação) sempre,
  // sem precisar de ?preview=1 — pedido do usuário 2026-09-25: "só o admin
  // e leader que vê tudo mesmo inativo". Nunca configura/contrata (ver
  // can_configure/can_contract, que continuam false pra leader).
  always_sees_all_products: boolean;
  /** Nível de parceiro da agência (visibilidade por público, C7). */
  agency_is_partner?: boolean;
  /** Nível da agência (bronze…diamond) — visibilidade por nível (D-1). */
  agency_level?: string | null;
}

// Item 16.1 (reunião 2026-09-14, "Visibilidade e teste") — parseia a lista
// uma vez, e-mails normalizados em minúsculo. Nunca um wildcard.
const DEMO_PREVIEW_EMAILS = new Set(
  (config.CATALOG2_DEMO_PREVIEW_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function resolveClientContext(userId: string, accountType: string, role: string): Promise<ClientContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      // company_id/agency_id (vínculo de MEMBRO) são a fonte de verdade real
      // pra "qual organização este usuário enxerga/compra em nome de" — a
      // MESMA usada por project-scope.ts (ver comentário lá, linha 11-17),
      // nunca owned_company/owned_agency (isso é OWNERSHIP, conceito
      // diferente). Achado do usuário 2026-09-23: checkout gravava
      // Project.company_id = ID DO USUÁRIO (violando a foreign key) porque
      // os dados de teste nunca tinham User.company_id/agency_id
      // preenchidos — corrigido na origem em setup-test-accounts.ts, não
      // aqui (usar owned_company aqui seria inconsistente com
      // project-scope.ts e quebraria pra um sub-usuário no futuro).
      company_id: true,
      agency_id: true,
      agency_link: { select: { partner_level: true, partner_profile: { select: { status: true } } } },
      owned_agency: { select: { partner_level: true, partner_profile: { select: { status: true } } } },
      admin_profile: { select: { is_master: true, is_active: true } },
    },
  });

  const kind: ClientKind =
    accountType === "admin" || role === "admin"
      ? "admin"
      : accountType === "agencias" || role === "agency_admin" || role === "agency_user"
        ? "agency"
        : accountType === "empresas" || role === "company_admin" || role === "company_user"
          ? "company"
          : accountType === "lider" || role === "lider"
            ? "leader"
            : accountType === "nomades" || role === "nomad"
              ? "nomad"
              : "other";

  const isMaster = kind === "admin" && !!user?.admin_profile?.is_master && user.admin_profile.is_active !== false;
  // Conta de teste explicitamente autorizada (e-mail exato na allowlist,
  // nunca inferido) — só company/agency, nunca amplia o que um admin comum
  // (não-master) já não teria. Preço fictício em preview continua nunca
  // autorizando cotação/contratação real (ver simulateProvisional).
  const isAuthorizedDemoAccount =
    (kind === "company" || kind === "agency") && !!user?.email && DEMO_PREVIEW_EMAILS.has(user.email.toLowerCase());

  // Quem contrata: company/agency. Admin só pré-visualiza. leader/nomad só veem.
  const canContract = kind === "agency" || kind === "company";
  const canConfigure = canContract;
  const canView = kind === "admin" || kind === "agency" || kind === "company" || kind === "leader";

  const account_kind: ClientContext["account_kind"] =
    kind === "agency" ? "agency" : kind === "company" ? "company" : "admin_preview";
  const account_id =
    kind === "agency" ? String(user?.agency_id || userId) : kind === "company" ? String(user?.company_id || userId) : userId;

  return {
    user_id: userId,
    kind,
    account_kind,
    account_id,
    can_view: canView,
    can_configure: canConfigure,
    can_contract: canContract,
    can_preview_drafts: isMaster || isAuthorizedDemoAccount,
    // Admin Master vê o catálogo inteiro sempre, sem precisar de ?preview=1
    // — achado do usuário 2026-09-23: "Catálogo de Produtos" do admin tem
    // que ser a MESMA tela que company/agency/líder usam, só que o admin
    // vê tudo. Continua nunca configurando/contratando por enquanto (ver
    // canConfigure/canContract acima) — "comprar em nome de uma empresa" é
    // decisão adiada pelo usuário, feita pelo fluxo do projeto da empresa,
    // não por aqui.
    always_sees_all_products: kind === "leader" || isMaster,
    agency_level: kind === "agency" ? (user?.agency_link?.partner_level ?? user?.owned_agency?.partner_level ?? null) : null,
    agency_is_partner: kind === "agency" && (user?.agency_link?.partner_profile?.status ?? user?.owned_agency?.partner_profile?.status) === "active",
  };
}

// ── Visibilidade de produto ─────────────────────────────────────────────

export interface VisibilityCheck {
  /** Aparece no catálogo do cliente (mesmo que ainda não contratável). */
  visible: boolean;
  /** Pode gerar cotação NOVA / ir à cesta / ser contratado AGORA. Item 5:
   * já fica `false` desde o AGENDAMENTO da inativação (antes da data
   * efetiva), não só depois dela. */
  contractable: boolean;
  /** Item 5: usado só para revalidar uma cotação/aditivo JÁ EXISTENTE —
   * ignora o bloqueio de "nova venda desde o agendamento" (propostas
   * vigentes continuam honradas durante o aviso), mas ainda vira `false`
   * na data EFETIVA da inativação, igual a "arquivado". Nunca usado para
   * decidir se uma cotação NOVA pode ser criada. */
  contractable_existing: boolean;
  reasons: string[];
  published_version_id: string | null;
  inactivation_scheduled_at: Date | null;
  inactivation_effective_at: Date | null;
}

// Produtos são NOVOS (sem vínculo com a plataforma antiga): pendências que vinham
// da importação não bloqueiam mais a visibilidade nem a contratação. O que vale
// é status + versão publicada + prontidão comercial (preço/prazo).
function mandatoryPendencies(_pendJson: string | null | undefined): string[] {
  return [];
}

type ProductForVisibility = {
  status: string;
  published_version_id: string | null;
  import_origin: { pendencies_json: string | null } | null;
  inactivation_scheduled_at: Date | null;
  inactivation_effective_at: Date | null;
};

// Item 2 (reunião 2026-09-14) — "Status e disponibilidade dos produtos":
// status do produto, publicação de versão e prontidão comercial são três
// eixos INDEPENDENTES, nenhum apaga o outro:
//   - status decide se o produto aparece no catálogo (visible) e se pode
//     ser comprado NESTE status (contractable via CATALOG2_CONTRACTABLE_
//     STATUSES — hoje só "disponivel"/"Ativo");
//   - published_version_id decide se existe conteúdo real pra mostrar;
//   - commercial_ready (computePricing) decide se preço/prazo comercial
//     estão completos — só é exigido pra VISIBILIDADE no status "disponivel"
//     (mesmo comportamento de sempre); nos demais status visíveis
//     (pré-lançamento/pausado/esgotado) o produto aparece com aviso mesmo
//     que o cálculo comercial ainda não esteja pronto, porque de qualquer
//     forma a contratação já está bloqueada pelo status.
export async function checkClientVisibility(product: ProductForVisibility): Promise<VisibilityCheck> {
  const reasons: string[] = [];
  const status = product.status as Catalog2Status;
  const visibleByStatus = CATALOG2_CLIENT_VISIBLE_STATUSES.includes(status);
  if (!visibleByStatus) reasons.push(CATALOG2_STATUS_BLOCK_MESSAGE[status] ?? "produto não está disponível");
  if (!product.published_version_id) reasons.push("sem versão publicada");
  const pend = mandatoryPendencies(product.import_origin?.pendencies_json);
  if (pend.length > 0) reasons.push(`pendência obrigatória: ${pend.join(", ")}`);

  let commercialReady = false;
  let onRequest = false; // "sob consulta": aparece no catálogo sem preço e sem poder contratar
  if (product.published_version_id && pend.length === 0) {
    const pricing = await computePricing(product.published_version_id, await defaultSelection(product.published_version_id));
    commercialReady = pricing.commercial_ready;
    onRequest = pricing.pricing_mode === "on_request";
    if (onRequest) reasons.push("produto sob consulta: não gera cotação nem contratação automática");
    // Só bloqueia VISIBILIDADE por prontidão comercial no status "Ativo" —
    // igual ao comportamento de sempre. Nos demais status visíveis, o
    // produto aparece mesmo com preço/prazo incompletos (a contratação já
    // está bloqueada pelo status de qualquer forma).
    if (status === "disponivel" && !commercialReady && !onRequest) {
      reasons.push(`cálculo comercial incompleto: ${pricing.quote_blockers.join(", ")}`);
    }
  }

  const requiresCommercialReadyForVisibility = status === "disponivel";
  let visible =
    visibleByStatus &&
    !!product.published_version_id &&
    pend.length === 0 &&
    (!requiresCommercialReadyForVisibility || commercialReady || onRequest);

  let contractableExisting = visible && CATALOG2_CONTRACTABLE_STATUSES.includes(status) && commercialReady;
  if (visible && !CATALOG2_CONTRACTABLE_STATUSES.includes(status)) {
    const blockMsg = CATALOG2_STATUS_BLOCK_MESSAGE[status];
    if (blockMsg) reasons.push(blockMsg);
  }

  // Item 5 (reunião 2026-09-14, "Inativação programada de produtos"):
  //   - a partir do AGENDAMENTO, nenhuma cotação NOVA pode mais ser gerada
  //     (`contractable`), mesmo antes da data efetiva — interpretação
  //     explícita registrada no relatório, a reunião não definiu isso
  //     expressamente;
  //   - propostas (cotações) JÁ existentes continuam honradas —
  //     `contractable_existing` só vira falso na data EFETIVA, exatamente
  //     como "arquivado" (calculado AO VIVO contra a data atual, nunca
  //     dependente do worker já ter rodado — regra 4 da tarefa).
  const inact = computeInactivationState(product);
  if (inact.isEffective) {
    // Data efetiva chegou: trata exatamente como "arquivado", mesmo que o
    // worker agendado ainda não tenha virado o campo `status` no banco.
    visible = false;
    contractableExisting = false;
    reasons.push("produto inativado");
  } else if (inact.isScheduled && inact.effectiveAt) {
    reasons.push(`Inativação programada para ${inact.effectiveAt.toISOString().slice(0, 10)} — novas contratações bloqueadas a partir de agora`);
  }
  const contractable = contractableExisting && !inact.isScheduled;

  return {
    visible,
    contractable,
    contractable_existing: contractableExisting,
    reasons,
    published_version_id: product.published_version_id,
    inactivation_scheduled_at: inact.scheduledAt,
    inactivation_effective_at: inact.effectiveAt,
  };
}

// ── Projeção segura para o cliente ─────────────────────────────────────

/** Remove TUDO que é interno de um PricingResult antes de mandar ao cliente. */
/** Só o que o cliente pode ver da separação de cobrança (nunca custo, imposto ou margem). */
export function clientChargesView(p: PricingResult) {
  const s = p.split;
  return {
    implementation: { applicable: s.implementation.applicable, price: s.implementation.applicable ? s.implementation.price : 0, reason: s.implementation.reason },
    first_charge: s.first_charge,
    renewal: s.renewal,
    avulso_total: s.avulso_total,
  };
}

/** Campos de cobrança separados gravados na cotação (implantação × recorrente × primeira cobrança) + cronograma por ciclo. */
export function quoteChargeFields(pricing: PricingResult, periodPricing: { first_charge_price?: number | null; implementation_price?: number | null; renewal_price?: number | null; discount_percent: number; months: number } | null) {
  const s = pricing.split;
  const recurring = !!periodPricing;
  return {
    implementation_price: periodPricing ? periodPricing.implementation_price ?? 0 : s.implementation.applicable ? s.implementation.price : 0,
    recurring_price: recurring ? periodPricing!.renewal_price ?? s.renewal : null,
    first_charge_price: periodPricing ? periodPricing.first_charge_price ?? null : s.first_charge,
    pricing_components_json: JSON.stringify({
      schedule: s.schedule, first_charge_parts: s.first_charge_parts, implementation: { applicable: s.implementation.applicable, rule: s.implementation.rule, reason: s.implementation.reason },
      discount_percent: periodPricing?.discount_percent ?? 0, months: periodPricing?.months ?? 1,
    }),
  };
}

export function clientPricingView(p: PricingResult) {
  return {
    charges: clientChargesView(p),
    currency: p.currency,
    quantity: p.quantity,
    // Preço/prazo COMERCIAIS (nunca esforço, nunca custo).
    commercial_price: p.lines.commercial_final_price.amount,
    commercial_price_label: p.quote_requirements.length ? (REQUEST_KIND_LABEL[strongestRequirement(p.quote_requirements) ?? "custom_quote"] ?? "Sob solicitação") : p.pricing_mode === "on_request" ? "Sob consulta" : p.lines.commercial_final_price.amount == null ? "A definir" : undefined,
    // Versão da regra de preço usada neste cálculo (a mesma da memória de cálculo do administrador).
    pricing_rule_version: p.rule?.version ?? null,
    // Entrega emergencial: só aparece quando o produto oferece. Mostra o que o cliente ganha (prazo) e paga a mais.
    emergency: p.emergency.available ? { available: true, selected: p.emergency.selected, extra_price: p.emergency.extra_price, extra_pending: p.emergency.extra_pending, reduction_days: p.emergency.reduction_days, commercial_days_before: p.emergency.commercial_days_before, commercial_days_after: p.emergency.commercial_days_after } : { available: false },
    // Opção/adicional que exige orçamento personalizado, análise ou contratação assistida: sem preço definitivo e sem contratação automática.
    price_status: p.price_status,
    requires_commercial_request: p.quote_requirements.length > 0,
    request_kind: strongestRequirement(p.quote_requirements),
    cta: p.quote_requirements.length > 0 ? "request_quote" : "contract",
    cta_label: p.quote_requirements.length > 0 ? "Solicitar orçamento" : "Contratar",
    quote_requirements: p.quote_requirements.map((r) => ({ kind: r.kind, label: r.label, message: r.message })),
    selection_issues: p.selection_issues.map((i) => ({ code: i.code, message: i.message })),
    addons_applied: p.addon_breakdown.map((a) => ({ key: a.key, name: a.name, type: a.type, quantity: a.quantity, unit_label: a.unit_label, recurrence: a.recurrence })),
    pricing_mode: p.pricing_mode,
    commercial_deadline_days: p.deadline.commercial_deadline_days,
    commercial_deadline_pending: p.deadline.commercial_deadline_pending,
    commercial_ready: p.commercial_ready,
    // avisos relevantes ao cliente (sem jargão de custo interno)
    notices: p.warnings
      .filter((w) =>
        w.code !== "tax_order_not_confirmed" &&
        !w.code.startsWith("specialty_") &&
        !w.code.startsWith("ia_cost") &&
        w.code !== "review_rate_missing" &&
        w.code !== "task_without_time" &&
        // Reunião 10/09 ("precificação dos 36 produtos funcional para
        // teste"): avisos de dado PROVISÓRIO (esforço/prazo) nunca chegam
        // ao cliente — defesa em profundidade, mesmo que este caminho
        // nunca receba computePricing em modo simulação de propósito.
        w.code !== "effort_provisional" &&
        w.code !== "deadline_provisional",
      )
      .map((w) => w.message),
    applied_options: p.applied_conditions.map((c) => c.explanation),
    // Defesa em profundidade: o cliente NUNCA deve receber um resultado de
    // simulação (o servidor nunca deveria chamar computePricing assim
    // aqui, mas se algum dia chamar por engano, isto nunca autoriza nada).
    ...(p.is_simulation ? { commercial_ready: false } : {}),
  };
}

/** Item 6 — projeção segura de UM período pra o cliente: exatamente os 6
 * pontos que a reunião pediu pra mostrar no carrinho/detalhe (duração,
 * valor mensal de referência, desconto, total antecipado, valor mensal
 * equivalente — comparativo, prazo/motivo de bloqueio). Nunca expõe o
 * PricingResult bruto (custo interno) por baixo. */
export function clientPeriodPricingView(r: PeriodPricingResult) {
  return {
    period: r.period,
    months: r.months,
    available: r.available,
    discount_percent: r.discount_percent,
    reference_monthly_price: r.reference_monthly_price,
    total_price: r.total_price,
    // "Comparativo" — nunca é o valor efetivamente cobrado por ciclo (o
    // pagamento é único e antecipado); só ajuda o cliente comparar com o
    // preço mensal avulso.
    monthly_equivalent_price: r.monthly_equivalent_price,
    commercial_deadline_days: r.commercial_deadline_days,
    currency: r.currency,
    commercial_ready: r.commercial_ready,
    quote_blockers: r.quote_blockers,
    // Separação financeira: o que se paga AGORA (implantação + 1ª mensalidade) × o que renova.
    first_charge_price: r.first_charge_price ?? r.total_price,
    implementation_price: r.implementation_price ?? 0,
    renewal_price: r.renewal_price ?? null,
  };
}

function deliverablesFor(version: {
  full_description: string | null;
  addons: Array<{ key: string; name: string; description: string | null }>;
}, sel: PricingSelection, pricing: PricingResult): string[] {
  const out: string[] = [];
  // entregáveis vindos de efeitos add_deliverable já entram como warning
  for (const w of pricing.warnings) {
    if (w.code === "extra_deliverables") out.push(w.message.replace(/^Entregáveis extras:\s*/, ""));
  }
  const addonSet = new Set(sel.addon_keys ?? []);
  for (const a of version.addons) {
    if (addonSet.has(a.key)) out.push(a.name);
  }
  return [...new Set(out)];
}

// ── Listagem ──────────────────────────────────────────────────────────

export interface ClientListFilters {
  q?: string;
  pillar_id?: string;
  category_id?: string;
  four_f_id?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export async function listClientProducts(ctx: ClientContext, f: ClientListFilters, opts: { preview?: boolean } = {}) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, f.page_size ?? 20));
  // Preview ("visualizar como cliente"): só Admin Master, só com ?preview=1
  // (checado nas duas pontas — aqui e no chamador). Mostra TODOS os
  // produtos (reais + a fixture [TESTE LOCAL]) INDEPENDENTE de
  // status/pendência/prontidão comercial — é o mesmo relaxamento que já
  // existia para o detalhe de UM produto (getClientProduct), agora também
  // na listagem, senão o preview nunca mostra os 36 (a maioria ainda em
  // preparação, sem versão publicada). A fixture ficava excluída daqui
  // antes (2026-09-25: pedido do usuário pra ele conseguir ver como ela
  // aparece no preview, igual qualquer outro produto).
  const previewMode = (!!opts.preview && ctx.can_preview_drafts) || ctx.always_sees_all_products;

  const where: Record<string, unknown> = previewMode
    ? {}
    : { status: { in: CATALOG2_CLIENT_VISIBLE_STATUSES as string[] }, published_version_id: { not: null } };
  if (f.pillar_id) where.pillar_id = f.pillar_id;
  if (f.category_id) where.category_id = f.category_id;
  if (f.four_f_id) where.four_f = { some: { four_f_id: f.four_f_id } };
  if (f.q) where.OR = [{ internal_name: { contains: f.q } }, { slug: { contains: f.q } }];
  // Público do produto (C7): empresa/agência só enxergam o que é para o seu público.
  const audience = audienceWhere(viewerFromContext(ctx));
  if (audience) where.AND = [...((where.AND as unknown[]) ?? []), audience];
  // (Produtos são novos: pendências de importação não escondem mais nada do catálogo.)

  const orderBy =
    f.sort === "name_desc"
      ? { internal_name: "desc" as const }
      : f.sort === "recent"
        ? { updated_at: "desc" as const }
        : { internal_name: "asc" as const };

  const rowsRaw = await prisma.catalog2Product.findMany({
    where,
    orderBy,
    include: {
      pillar: { select: { key: true, name: true } },
      category: { select: { key: true, name: true } },
      four_f: { include: { four_f: { select: { key: true, name: true } } } },
      published_version: { select: { id: true, title: true, summary: true, published_at: true } },
      versions: previewMode ? { orderBy: { version_number: "desc" as const }, take: 1, where: { state: "rascunho" } } : false,
      import_origin: previewMode ? { select: { pendencies_json: true } } : false,
    },
  });
  // Item 5: uma inativação programada já EFETIVA (data vencida) some do
  // catálogo exatamente como "arquivado" — calculado AO VIVO, mesmo que o
  // worker agendado ainda não tenha virado o `status` no banco (regra 4).
  const rows = rowsRaw.filter((p) => !computeInactivationState(p).isEffective);

  // Filtra por cálculo comercial pronto — não se aplica ao preview, que
  // mostra TODOS os reais (fora a fixture), prontos ou não.
  const enriched: Array<Record<string, unknown>> = [];
  for (const p of rows) {
    const versionForPreview = previewMode ? p.published_version ?? (p as any).versions?.[0] ?? null : p.published_version;
    if (!versionForPreview) {
      if (!previewMode) continue;
      enriched.push({
        id: p.id, slug: p.slug, sequence_number: p.sequence_number, name: p.internal_name, short_description: null,
        pillar: p.pillar, category: p.category, four_f: p.four_f.map((l) => l.four_f).sort((a, b) => a.key.localeCompare(b.key)),
        origin: p.origin, is_new: false, starting_price: null, commercial_deadline_days: null, currency: "BRL",
        has_variations: false, has_addons: false,
        is_preview: true, status: p.status,
        status_label: CATALOG2_STATUS_LABEL[p.status as Catalog2Status] ?? p.status,
        contractable: false,
        unavailable_reason: CATALOG2_STATUS_BLOCK_MESSAGE[p.status as Catalog2Status] ?? null,
        pendencies: mandatoryPendencies((p as any).import_origin?.pendencies_json),
      });
      continue;
    }
    // Item 16.1 (reunião 2026-09-14, "Visibilidade e teste"): em preview,
    // simula com dado PROVISÓRIO quando o real ainda não existe — é o que
    // permite homologar os 36 produtos online mesmo com prazo ainda
    // provisório. `simulateProvisional` nunca autoriza cotação/contratação
    // (bloqueio incondicional em computePricing/checkClientVisibility) —
    // só afeta o que aparece NESTA leitura de preview.
    const pricing = await computePricing(versionForPreview.id, await defaultSelection(versionForPreview.id), { previewOnly: previewMode });
    const status = p.status as Catalog2Status;
    // Prontidão comercial só é exigida pra APARECER no status "Ativo" (regra
    // de sempre). Pré-lançamento/pausado/esgotado aparecem mesmo com
    // preço/prazo ainda incompletos — a contratação já está bloqueada pelo
    // status de qualquer forma (ver checkClientVisibility).
    if (!previewMode && status === "disponivel" && !pricing.commercial_ready && pricing.pricing_mode !== "on_request") continue;
    const inact = computeInactivationState(p);
    // Item 5: bloqueado pra NOVA contratação desde o agendamento, mesmo
    // antes da data efetiva (a exclusão de `rows` acima já cobre o "depois").
    const contractable = CATALOG2_CONTRACTABLE_STATUSES.includes(status) && pricing.commercial_ready && !inact.isScheduled;
    enriched.push({
      id: p.id,
      slug: p.slug,
      sequence_number: p.sequence_number,
      name: versionForPreview.title || p.internal_name,
      short_description: versionForPreview.summary ?? null,
      pillar: p.pillar,
      category: p.category,
      four_f: p.four_f.map((l) => l.four_f).sort((a, b) => a.key.localeCompare(b.key)),
      origin: p.origin,
      is_new: p.published_version ? isNewByPublicationDate(p.published_version.published_at) : false,
      starting_price: pricing.commercial_ready ? pricing.lines.commercial_final_price.amount : null,
      commercial_deadline_days: pricing.commercial_ready ? pricing.deadline.commercial_deadline_days : null,
      currency: pricing.currency,
      has_variations: pricing.active_task_keys.length >= 0, // placeholder; UI usa detalhe
      status,
      status_label: CATALOG2_STATUS_LABEL[status] ?? status,
      contractable,
      unavailable_reason: inact.isScheduled
        ? `Inativação programada para ${inact.effectiveAt!.toISOString().slice(0, 10)}`
        : !contractable ? (CATALOG2_STATUS_BLOCK_MESSAGE[status] ?? null) : null,
      inactivation_scheduled_at: inact.scheduledAt,
      inactivation_effective_at: inact.effectiveAt,
      ...(previewMode ? { is_preview: true, pendencies: mandatoryPendencies((p as any).import_origin?.pendencies_json) } : {}),
    });
  }
  // variações/adicionais indicador: recarrega leve
  const withCounts = await Promise.all(
    enriched.map(async (e) => {
      const row = rows.find((r) => r.id === e.id)!;
      const versionId = row.published_version?.id ?? (row as any).versions?.[0]?.id;
      if (!versionId) return { ...e, has_variations: false, has_addons: false };
      const v = await prisma.catalog2ProductVersion.findUnique({
        where: { id: versionId },
        select: { _count: { select: { variations: true, addons: true } } },
      });
      return { ...e, has_variations: (v?._count.variations ?? 0) > 0, has_addons: (v?._count.addons ?? 0) > 0 };
    }),
  );

  const total = withCounts.length;
  const start = (page - 1) * pageSize;
  return { data: withCounts.slice(start, start + pageSize), total, page, page_size: pageSize };
}

// ── Detalhe ───────────────────────────────────────────────────────────

export async function getClientProduct(ctx: ClientContext, slugOrId: string, opts: { preview: boolean; versionId?: string }) {
  const product = await prisma.catalog2Product.findFirst({
    where: productLookupWhere(slugOrId),
    include: {
      pillar: true,
      category: true,
      four_f: { include: { four_f: true } },
      import_origin: { select: { pendencies_json: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" } } } },
          addons: { orderBy: { sort_order: "asc" }, include: { choices: { where: { is_active: true }, orderBy: { sort_order: "asc" } } } },
          // "O que está incluído" / especialidades do produto — dado REAL
          // (nunca a camada provisória de Catalog2ProvisionalPreview, que é
          // exclusiva do Admin Master) — achado do usuário 2026-09-23: a
          // tela de detalhe do cliente precisa da mesma estrutura visual do
          // "Detalhe comercial" do admin, incluindo o que está incluído e
          // as especialidades envolvidas.
          tasks: {
            orderBy: { sort_order: "asc" },
            include: { specialty: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);

  const previewMode = (opts.preview && ctx.can_preview_drafts) || ctx.always_sees_all_products;
  const vis = await checkClientVisibility(product);

  if (!vis.visible && !previewMode) {
    // Não vaza a existência de rascunho: 404.
    throw new Catalog2Error("Produto não encontrado.", 404);
  }

  // Pré-visualização do editor: o Admin Master pode pedir uma versão específica
  // (ex.: o rascunho em edição). Só vale em modo preview — cliente nunca escolhe versão.
  const version =
    (previewMode && opts.versionId ? product.versions.find((v) => v.id === opts.versionId) : undefined) ??
    product.versions.find((v) => v.id === product.published_version_id) ??
    (previewMode ? product.versions.find((v) => v.state === "rascunho") ?? product.versions[0] : null);
  if (!version) throw new Catalog2Error("Produto não encontrado.", 404);

  const sel = await defaultSelection(version.id);
  // Item 16.1: em preview, simula com dado PROVISÓRIO quando o real ainda
  // não existe — nunca autoriza cotação/contratação (ver checkClientVisibility/
  // computePricing, bloqueio incondicional em modo simulação).
  const implOpt = await implOpts(ctx.account_kind, ctx.account_id, product.id);
  const pricing = await computePricing(version.id, sel, { previewOnly: previewMode, ...implOpt });
  // Item 6: só os períodos CONFIGURADOS + ATIVOS aparecem — nunca os 4 fixos.
  const availablePeriods = saleModeProblem(version, "mensal") ? [] : await listAvailablePeriods(version.id, sel, product, implOpt);

  return {
    id: product.id,
    slug: product.slug,
    sequence_number: product.sequence_number,
    name: version.title || product.internal_name,
    description: version.full_description ?? version.summary ?? null,
    short_description: version.summary ?? null,
    // Só o que está marcado como visível ao cliente (observações internas NUNCA saem daqui).
    commercial: clientCommercialView(version as unknown as Record<string, unknown>),
    pillar: product.pillar ? { key: product.pillar.key, name: product.pillar.name } : null,
    category: product.category ? { key: product.category.key, name: product.category.name } : null,
    four_f: product.four_f.map((l) => ({ key: l.four_f.key, name: l.four_f.name })).sort((a, b) => a.key.localeCompare(b.key)),
    origin: product.origin,
    version_id: version.id,
    version_state: version.state,
    is_preview: previewMode && !vis.visible,
    preview_notice: previewMode && !vis.visible ? "Pré-visualização de RASCUNHO — não gera cotação nem contratação." : null,
    pendencies: previewMode ? mandatoryPendencies(product.import_origin?.pendencies_json) : [],
    visibility_reasons: previewMode ? vis.reasons : [],
    status: product.status,
    status_label: CATALOG2_STATUS_LABEL[product.status as Catalog2Status] ?? product.status,
    // Visível mas não contratável NESTE status (pré-lançamento/pausado/
    // esgotado) — motivo sempre exposto ao cliente real, não só no preview.
    // Item 5: inativação programada tem prioridade de mensagem sobre o
    // motivo de status (é o motivo REAL do bloqueio quando presente).
    contract_blocked_reason: vis.visible && !vis.contractable
      ? (vis.inactivation_scheduled_at
          ? `Inativação programada para ${vis.inactivation_effective_at!.toISOString().slice(0, 10)}`
          : (CATALOG2_STATUS_BLOCK_MESSAGE[product.status as Catalog2Status] ?? null))
      : null,
    inactivation_scheduled_at: vis.inactivation_scheduled_at,
    inactivation_effective_at: vis.inactivation_effective_at,
    variations: version.variations
      .filter((va) => va.is_active)
      .map((va) => ({
        id: va.id,
        key: va.key,
        name: va.name,
        is_required: va.is_required,
        selection_type: va.selection_type,
        notes: va.notes,
        help_text: va.notes,
        options: va.options.filter((o) => o.is_active).map((o) => ({ key: o.key, label: o.label, is_default: o.is_default, availability: o.availability, availability_note: o.availability_note, selectable: o.availability !== "unavailable", requires_commercial_request: ["custom_quote", "commercial_review", "assisted_only"].includes(o.availability) })),
      })),
    addons: version.addons
      .filter((a) => a.is_active)
      .map((a) => ({
        key: a.key, name: a.name, description: a.description, help_text: a.description, is_default_selected: a.is_default_selected,
        addon_type: a.addon_type, unit_label: a.unit_label, qty_min: a.qty_min, qty_max: a.qty_max, qty_step: a.qty_step, auto_quote_limit: a.auto_quote_limit,
        recurrence: a.charge_scope,
        choices: a.choices.map((c) => ({ key: c.key, label: c.label, is_default: c.is_default, qty_from: c.qty_from, qty_to: c.qty_to, requires_quote: c.requires_quote })),
      })),
    // Dado real (nunca provisório) — usado pela aba "Detalhes"/"Nômades" do
    // cliente, espelhando o "Detalhe comercial" do admin.
    included_items: version.tasks.map((t) => ({ title: t.name, description: t.description })),
    specialties: Array.from(new Set(version.tasks.map((t) => t.specialty?.name).filter((n): n is string => !!n))),
    // informações obrigatórias declaradas por efeitos require_info
    required_info: pricing.warnings
      .filter((w) => w.code === "extra_info_required")
      .flatMap((w) => w.message.replace(/^Informações extras exigidas:\s*/, "").split("; ")),
    default_selection: sel,
    // Conexões e acessos necessários (módulo opcional): vazio quando o produto não exige conexões externas.
    connections: await connectionsPreviewForClient(prisma, version.id),
    // Produtos vinculados "comprados juntos" (não obrigam a compra do outro): o cliente vê o efeito na contratação.
    linked_products: await linkedProductsForClient(prisma, product.id, version.id),
    pricing: clientPricingView(pricing),
    // Item 6: modalidades de período oferecidas por ESTE produto (avulso
    // continua sempre disponível via `pricing` acima — nunca listado aqui).
    available_periods: availablePeriods.map(clientPeriodPricingView),
    // Como este produto pode ser contratado (só informativo; quem decide é o servidor na cotação/cesta/checkout).
    sale_label: version.sale_modes_enforced ? saleLabelOf(version) : saleLabelOf({ accepts_one_time: true, accepts_recurring: availablePeriods.length > 0 }),
    sale_modes: {
      one_time: !version.sale_modes_enforced || version.accepts_one_time !== false,
      recurring: !version.sale_modes_enforced || version.accepts_recurring === true || availablePeriods.length > 0,
      package_only: !!version.sale_modes_enforced && version.sell_mode === "package_only",
    },
    can_configure: ctx.can_configure && vis.visible,
    can_contract: ctx.can_contract && vis.contractable,
  };
}

/**
 * Modalidades de venda (Pedido 3, fase 4): "avulso" e "recorrente/assinatura". Só versões criadas depois desta
 * regra (sale_modes_enforced) a respeitam; as já publicadas seguem exatamente como vendiam antes.
 */
/**
 * Versões que já seguem as regras novas (sale_modes_enforced) só são vendidas com as modalidades coerentes com a entrega e os
 * períodos. Versões antigas seguem como sempre (o painel do administrador mostra o aviso de inconsistência).
 */
export async function commercialProblem(productId: string, version: { sale_modes_enforced?: boolean; accepts_one_time: boolean; accepts_recurring: boolean }): Promise<string | null> {
  if (!version.sale_modes_enforced) return null;
  const { loadConsistency, blockersOf } = await import("./catalog2-commercial");
  const b = blockersOf(await loadConsistency(prisma, productId, version));
  return b.length ? "a configuração comercial deste produto está em revisão" : null;
}

function saleLabelOf(v: { accepts_one_time: boolean; accepts_recurring: boolean }): string | null {
  if (v.accepts_one_time && v.accepts_recurring) return "Disponível avulso ou em assinatura mensal";
  if (v.accepts_recurring) return "Assinatura mensal recorrente";
  if (v.accepts_one_time) return "Avulso disponível";
  return null;
}

async function implOpts(accountKind: string, accountId: string, productId: string) {
  const { loadImplementationDone } = await import("./catalog2-cycles");
  return { implementationDone: await loadImplementationDone(prisma, { companyId: accountKind === "company" ? accountId : null, catalog2ProductId: productId }) };
}

export function saleModeProblem(version: { sale_modes_enforced?: boolean; accepts_one_time?: boolean; accepts_recurring?: boolean }, period: unknown): string | null {
  if (!version.sale_modes_enforced) return null;
  if (!period && version.accepts_one_time === false) return "este produto não é vendido avulso";
  if (period && version.accepts_recurring !== true) return "este produto não é vendido como assinatura ou contrato recorrente";
  return null;
}

// ── Configurar (recalcular) ───────────────────────────────────────────

export function normalizeSelection(raw: unknown): PricingSelection {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const qty = Math.max(1, Math.floor(Number(r.quantity ?? 1)) || 1);
  const answers: Record<string, string> = {};
  if (r.answers && typeof r.answers === "object" && !Array.isArray(r.answers)) {
    for (const [k, v] of Object.entries(r.answers as Record<string, unknown>)) answers[String(k)] = String(v ?? "");
  }
  const variation_quantities: Record<string, number> = {};
  if (r.variation_quantities && typeof r.variation_quantities === "object" && !Array.isArray(r.variation_quantities)) {
    for (const [k, v] of Object.entries(r.variation_quantities as Record<string, unknown>)) {
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n >= 0) variation_quantities[String(k)] = n;
    }
  }
  const addon_selections: Record<string, { quantity?: number; value?: number; choice_keys?: string[] }> = {};
  if (r.addon_selections && typeof r.addon_selections === "object" && !Array.isArray(r.addon_selections)) {
    for (const [k, v] of Object.entries(r.addon_selections as Record<string, unknown>)) {
      const o = (v ?? {}) as Record<string, unknown>;
      const entry: { quantity?: number; value?: number; choice_keys?: string[] } = {};
      if (o.quantity != null && Number.isFinite(Number(o.quantity))) entry.quantity = Math.floor(Number(o.quantity));
      if (o.value != null && Number.isFinite(Number(o.value))) entry.value = Number(o.value);
      if (Array.isArray(o.choice_keys)) entry.choice_keys = o.choice_keys.map(String);
      addon_selections[String(k)] = entry;
    }
  }
  return {
    variation_option_keys: arr(r.variation_option_keys),
    addon_keys: arr(r.addon_keys),
    ...(Object.keys(addon_selections).length > 0 ? { addon_selections } : {}),
    ...(Object.keys(variation_quantities).length > 0 ? { variation_quantities } : {}),
    ...(r.emergency === true ? { emergency: true } : {}),
    quantity: qty,
    // Cotações anteriores não possuíam essa escolha: preservam exatamente o
    // comportamento anterior, com uma única tarefa para toda a quantidade.
    delivery_groups: Array.isArray(r.delivery_groups)
      ? r.delivery_groups.map((group) => Number(group))
      : [qty],
    answers,
  };
}

export function configChecksum(productId: string, versionId: string, sel: PricingSelection, period: Catalog2Period | null = null): string {
  return hashPayload({
    product_id: productId,
    version_id: versionId,
    variation_option_keys: [...(sel.variation_option_keys ?? [])].sort(),
    addon_keys: [...(sel.addon_keys ?? [])].sort(),
    quantity: sel.quantity ?? 1,
    delivery_groups: sel.delivery_groups ?? [sel.quantity ?? 1],
    answers: sel.answers ?? {},
    // Entrega emergencial escolhida: é outra configuração (outro preço e prazo).
    ...(sel.emergency ? { emergency: true } : {}),
    // Só entra quando há adicional tipado — assim as cotações antigas mantêm o mesmo checksum.
    ...(sel.addon_selections && Object.keys(sel.addon_selections).length > 0 ? { addon_selections: Object.fromEntries(Object.entries(sel.addon_selections).sort(([a], [b]) => a.localeCompare(b))) } : {}),
    // Só entra quando há variação por quantidade — assim as cotações antigas mantêm o mesmo checksum.
    ...(sel.variation_quantities && Object.keys(sel.variation_quantities).length > 0 ? { variation_quantities: Object.fromEntries(Object.entries(sel.variation_quantities).sort(([a], [b]) => a.localeCompare(b))) } : {}),
    // Item 6: a MESMA seleção com períodos diferentes (ou avulso) é uma
    // configuração DIFERENTE — nunca colide no clique-duplo/cesta.
    period,
  });
}

/** Item 6 — lê `period` de um corpo de requisição bruto: string válida vira
 * o período; qualquer outra coisa (ausente, "avulso", inválido) vira null
 * (avulso), nunca lança erro aqui — quem valida disponibilidade é o
 * chamador, com o motivo explicado ao cliente. */
export function normalizePeriod(raw: unknown): Catalog2Period | null {
  return isCatalog2Period(raw) ? raw : null;
}

/** Valida que a seleção cobre toda variação obrigatória e respeita min/max. */
export function validateSelection(
  version: {
    variations: Array<{ key: string; name: string; is_required: boolean; is_active?: boolean; selection_type: string | null; options: Array<{ key: string; is_active?: boolean }> }>;
    addons: Array<{ key: string; is_active: boolean }>;
  },
  sel: PricingSelection,
): string[] {
  const errs: string[] = [];
  const chosen = new Set(sel.variation_option_keys ?? []);
  // Item 4.1 (reunião 2026-09-14): todas as chaves de opção que EXISTEM em
  // alguma variação desta versão — usado pra detectar de verdade uma chave
  // escolhida que não existe mais (ex.: versão nova removeu a opção). O
  // laço abaixo, por variação, sempre checava `picked` (já filtrado pelas
  // próprias optKeys daquela variação) contra optKeys — tautológico, nunca
  // acusava nada; a checagem real precisa comparar contra o universo de
  // TODAS as opções da versão.
  const allOptionKeys = new Set(version.variations.filter((va) => va.is_active !== false).flatMap((va) => va.options.filter((o) => o.is_active !== false).map((o) => o.key)));
  for (const va of version.variations) {
    if (va.is_active === false) continue;
    const type = va.selection_type ?? "single";
    if (type === "quantity") {
      const q = sel.variation_quantities?.[va.key] ?? 0;
      if (!Number.isInteger(q) || q < 0 || q > 100000) errs.push(`Informe uma quantidade válida para "${va.name}".`);
      else if (va.is_required && q < 1) errs.push(`Informe a quantidade de "${va.name}" (mínimo 1).`);
      continue;
    }
    const optKeys = va.options.filter((o) => o.is_active !== false).map((o) => o.key);
    const picked = optKeys.filter((k) => chosen.has(k));
    if (va.is_required && picked.length === 0) errs.push(`Escolha uma opção para "${va.name}".`);
    if (type === "single" && picked.length > 1) errs.push(`"${va.name}" aceita apenas uma opção.`);
  }
  for (const k of chosen) if (!allOptionKeys.has(k)) errs.push(`Opção inválida ou não existe mais: "${k}".`);
  const activeAddons = new Set(version.addons.filter((a) => a.is_active).map((a) => a.key));
  for (const k of [...new Set([...(sel.addon_keys ?? []), ...Object.keys(sel.addon_selections ?? {})])]) if (!activeAddons.has(k)) errs.push("Adicional inválido ou inativo selecionado.");
  const qty = sel.quantity ?? 1;
  if (qty < 1 || qty > 100000) errs.push("Quantidade fora do limite (1 a 100000).");
  const groups = sel.delivery_groups ?? [qty];
  if (!Array.isArray(groups) || groups.length === 0) {
    errs.push("Informe ao menos um lote de execução.");
  } else if (groups.some((group) => !Number.isInteger(group) || group < 1)) {
    errs.push("Cada lote de execução precisa ter pelo menos uma unidade inteira.");
  } else if (groups.reduce((sum, group) => sum + group, 0) !== qty) {
    errs.push("A soma dos lotes precisa ser igual à quantidade contratada.");
  }
  return errs;
}

export async function configureProduct(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown, opts: { preview: boolean; period?: unknown; versionId?: string }) {
  const product = await prisma.catalog2Product.findFirst({
    where: productLookupWhere(productIdOrSlug),
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: { variations: { include: { options: true } }, addons: true },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);

  const previewMode = (opts.preview && ctx.can_preview_drafts) || ctx.always_sees_all_products;
  const vis = await checkClientVisibility(product);
  if (!vis.visible && !previewMode) throw new Catalog2Error("Produto não encontrado.", 404);

  // Pré-visualização do editor: o Admin Master pode pedir uma versão específica
  // (ex.: o rascunho em edição). Só vale em modo preview — cliente nunca escolhe versão.
  const version =
    (previewMode && opts.versionId ? product.versions.find((v) => v.id === opts.versionId) : undefined) ??
    product.versions.find((v) => v.id === product.published_version_id) ??
    (previewMode ? product.versions.find((v) => v.state === "rascunho") ?? product.versions[0] : null);
  if (!version) throw new Catalog2Error("Produto não encontrado.", 404);

  const sel = normalizeSelection(rawSelection);
  const period = normalizePeriod(opts.period);
  const selectionErrors = validateSelection(version, sel);
  const implOpt = await implOpts(ctx.account_kind, ctx.account_id, product.id);
  const pricing = await computePricing(version.id, sel, implOpt);
  // Item 6: quando um período é pedido, o preço mostrado/usado pra decidir
  // "pode gerar cotação" passa a ser o do PERÍODO (total antecipado), nunca
  // o avulso — mas o avulso (`pricing` acima) continua sempre calculado e
  // devolvido como referência.
  const periodPricing = period ? await computePeriodPricing(version.id, sel, product, period, implOpt) : null;
  const checksum = configChecksum(product.id, version.id, sel, period);

  const saleProblem = saleModeProblem(version, period) ?? (await commercialProblem(product.id, version));
  const commercialReadyForRequest = (periodPricing ? periodPricing.commercial_ready : pricing.commercial_ready) && !saleProblem;
  const pricingIssues = pricing.selection_issues.map((i) => i.message).filter((m) => !selectionErrors.includes(m));
  const canQuote =
    !previewMode &&
    ctx.can_contract &&
    vis.contractable &&
    version.state === "publicada" &&
    selectionErrors.length === 0 &&
    pricingIssues.length === 0 &&
    pricing.quote_requirements.length === 0 &&
    commercialReadyForRequest;
  // Seleção que exige orçamento personalizado/análise/contratação assistida: o cliente pode SOLICITAR (nunca contratar sozinho).
  const canRequestCommercial =
    !previewMode && ctx.can_contract && vis.contractable && version.state === "publicada" &&
    selectionErrors.length === 0 && pricingIssues.length === 0 && pricing.quote_requirements.length > 0;

  return {
    product_id: product.id,
    slug: product.slug,
    version_id: version.id,
    is_preview: previewMode && !vis.visible,
    selection: sel,
    period,
    selection_errors: [...selectionErrors, ...pricingIssues],
    config_checksum: checksum,
    deliverables: deliverablesFor(version, sel, pricing),
    pricing: clientPricingView(pricing),
    period_pricing: periodPricing ? clientPeriodPricingView(periodPricing) : null,
    can_generate_quote: canQuote,
    can_request_commercial: canRequestCommercial,
    quote_blockers: [
      ...(previewMode && !vis.visible ? ["pré-visualização de rascunho não gera cotação"] : []),
      // produto visível mas bloqueado NESTE status (pré-lançamento/pausado/
      // esgotado) — mesmo motivo exposto em getClientProduct.contract_blocked_reason.
      ...(!previewMode && vis.visible ? vis.reasons : []),
      ...selectionErrors,
      ...(saleProblem ? [saleProblem] : []),
      ...(periodPricing ? periodPricing.quote_blockers : pricing.quote_blockers),
    ],
  };
}

// ── Pré-cotação ───────────────────────────────────────────────────────

const QUOTE_TTL_HOURS = 72;
// Item 4 (reunião 2026-09-14, "Preços e proteção por 30 dias"): quantos
// dias uma cotação já gerada continua valendo o preço CONGELADO depois de
// uma alteração comercial (mudança em Catalog2PricingSettings, valor/hora
// de especialidade, etc.) — sempre respeitando também o valid_until
// próprio da cotação (72h), o que vier primeiro.
const PRICE_PROTECTION_DAYS = 30;

export async function createQuote(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown, rawPeriod?: unknown) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode gerar cotações.", 403, "cannot_contract");

  const product = await prisma.catalog2Product.findFirst({
    where: productLookupWhere(productIdOrSlug),
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: { orderBy: { version_number: "desc" }, include: { variations: { include: { options: true } }, addons: true } },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);

  const vis = await checkClientVisibility(product);
  // Bloqueia por CONTRATABILIDADE, não só visibilidade: um produto em
  // pré-lançamento/pausado/esgotado é visível no catálogo, mas gerar
  // cotação continua proibido enquanto o status não for "Ativo" — mesmo
  // chamando a API direto (esconder/desabilitar o botão não basta). Item 5:
  // `contractable` já embute "bloqueado desde o agendamento de inativação".
  if (!vis.contractable) throw new Catalog2Error(`Produto indisponível para cotação.${vis.reasons.length ? ` ${vis.reasons.join("; ")}.` : ""}`, 409, "not_quotable");

  const version = product.versions.find((v) => v.id === product.published_version_id);
  if (!version || version.state !== "publicada") throw new Catalog2Error("Produto sem versão publicada.", 409, "not_published");

  const sel = normalizeSelection(rawSelection);
  const period = normalizePeriod(rawPeriod);
  const selErrors = validateSelection(version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const saleProblem = saleModeProblem(version, period) ?? (await commercialProblem(product.id, version));
  if (saleProblem) throw new Catalog2Error(`Cotação inválida: ${saleProblem}.`, 409, "sale_mode_not_accepted");

  const implOpt = await implOpts(ctx.account_kind, ctx.account_id, product.id);
  const pricing = await computePricing(version.id, sel, implOpt);
  if (pricing.selection_issues.length) throw new Catalog2Error(pricing.selection_issues.map((i) => i.message).join(" "), 422, "invalid_selection");
  if (pricing.quote_requirements.length) {
    throw new Catalog2Error(`Esta seleção não pode ser contratada automaticamente. ${pricing.quote_requirements.map((r) => r.message).join(" ")} Use "Solicitar orçamento".`, 409, "commercial_request_required");
  }
  const periodPricing = period ? await computePeriodPricing(version.id, sel, product, period, implOpt) : null;
  if (period && !periodPricing!.available) {
    throw new Catalog2Error(`Cotação inválida: ${periodPricing!.quote_blockers.join("; ")}.`, 409, "not_commercial_ready");
  }
  if (!period && !pricing.commercial_ready) {
    throw new Catalog2Error(`Cotação inválida: ${pricing.quote_blockers.join("; ")}.`, 409, "not_commercial_ready");
  }

  const checksum = configChecksum(product.id, version.id, sel, period);
  const validUntil = new Date(Date.now() + QUOTE_TTL_HOURS * 3600 * 1000);

  // Clique duplo: a MESMA config (mesmo período) já válida → devolve a existente.
  const existing = await prisma.catalog2Quote.findFirst({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, config_checksum: checksum, status: "valida" },
  });
  if (existing) return serializeQuote(existing);

  const created = await prisma.catalog2Quote.create({
    data: {
      account_kind: ctx.account_kind,
      account_id: ctx.account_id,
      user_id: ctx.user_id,
      product_id: product.id,
      version_id: version.id,
      selection_json: JSON.stringify(sel),
      deliverables_json: JSON.stringify(deliverablesFor(version, sel, pricing)),
      quantity: sel.quantity ?? 1,
      // Item 6: com período, o "preço/prazo comerciais" da cotação SÃO os
      // do período (total antecipado / prazo do 1º ciclo) — nunca o avulso
      // por baixo, que continua só como referência em pricing_snapshot_json.
      commercial_deadline_days: periodPricing ? periodPricing.commercial_deadline_days : pricing.deadline.commercial_deadline_days,
      commercial_price: periodPricing ? periodPricing.total_price : pricing.lines.commercial_final_price.amount,
      currency: pricing.currency,
      config_checksum: checksum,
      pricing_snapshot_json: JSON.stringify(periodPricing ? clientPeriodPricingView(periodPricing) : clientPricingView(pricing)),
      status: "valida",
      valid_until: validUntil,
      is_preview: false,
      contract_period: period,
      contract_period_months: periodPricing?.months ?? null,
      contract_period_discount_percent: periodPricing?.discount_percent ?? null,
      contract_period_reference_monthly_price: periodPricing?.reference_monthly_price ?? null,
      ...quoteChargeFields(pricing, periodPricing),
    },
  });
  return serializeQuote(created);
}

export async function listQuotes(ctx: ClientContext) {
  const rows = await prisma.catalog2Quote.findMany({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return rows.map(serializeQuote).map((q) => ({ ...q, ...expiryFlags(q) }));
}

export async function getQuote(ctx: ClientContext, id: string) {
  const q = await prisma.catalog2Quote.findUnique({ where: { id } });
  if (!q || q.account_kind !== ctx.account_kind || q.account_id !== ctx.account_id) {
    throw new Catalog2Error("Cotação não encontrada.", 404);
  }
  return { ...serializeQuote(q), ...expiryFlags(serializeQuote(q)) };
}

type QuoteRow = NonNullable<Awaited<ReturnType<typeof prisma.catalog2Quote.findUnique>>>;

// Item 9 (reunião 2026-09-14, "Atualizar o contexto da Aura"): exportada
// pra reaproveitar a MESMA checagem de posse já usada por revalidate/renew/
// cancel — a Aura nunca reimplementa "esta cotação é desta conta?".
export async function loadOwnedQuote(ctx: ClientContext, id: string): Promise<QuoteRow> {
  const q = await prisma.catalog2Quote.findUnique({ where: { id } });
  if (!q || q.account_kind !== ctx.account_kind || q.account_id !== ctx.account_id) {
    throw new Catalog2Error("Cotação não encontrada.", 404);
  }
  return q;
}

/** Ids de especialidade usados pelas tarefas de uma ou mais versões — usado
 * pra saber quais Catalog2CommercialChangeEvent(scope:"specialty_rate")
 * podem ter afetado o preço desta cotação. */
async function relevantSpecialtyIds(versionIds: string[]): Promise<string[]> {
  const ids = [...new Set(versionIds)];
  if (!ids.length) return [];
  const rows = await prisma.catalog2Task.findMany({
    where: { version_id: { in: ids }, specialty_id: { not: null } },
    select: { specialty_id: true },
    distinct: ["specialty_id"],
  });
  return rows.map((r) => r.specialty_id).filter((x): x is string => !!x);
}

interface QuoteAssessment {
  vis: VisibilityCheck;
  sel: PricingSelection;
  /** Versão contra a qual o preço ATUAL é calculado (mesma da cotação, ou a
   * publicada atual se o produto trocou de versão E o escopo é compatível).
   * Nulo quando não há nenhuma versão viável pra calcular contra. */
  pricingVersionId: string | null;
  versionChanged: boolean;
  /** A seleção CONGELADA da cotação ainda é válida na versão-alvo (mesmas
   * chaves de variação/adicional existem e continuam satisfazendo as
   * variações obrigatórias)? Só é falso por incompatibilidade REAL de
   * escopo — nunca só porque o preço mudou. */
  scopeCompatible: boolean;
  /** Produto indisponível OU escopo incompatível — nunca protegido por
   * prazo, não é uma questão de preço. */
  structurallyBroken: boolean;
  pricing: PricingResult | null;
  /** Item 6: preenchido só quando a cotação tem `contract_period` — o
   * cálculo do TOTAL do período (mesmo motor, camada de período por cima). */
  periodResult: PeriodPricingResult | null;
  pricingBroken: boolean;
  priceOrDeadlineDrifted: boolean;
  timeExpired: boolean;
  /** Data resolvida da âncora de proteção (existente ou recém-calculada —
   * ainda NÃO persistida aqui). */
  resolvedAnchor: Date | null;
  anchorSource: "event_log" | "detected_fallback" | null;
  protectionEndsAt: Date | null;
  /** Ignora valid_until — só considera a janela de 30 dias em si. */
  withinProtectionWindow: boolean;
  /** Considera também valid_until — é o que decide se a cotação continua "valida". */
  withinProtection: boolean;
  needsRenewal: boolean;
}

/**
 * Avalia uma cotação contra a regra comercial ATUAL — não persiste nada.
 * Reunido aqui porque `revalidateQuote` (persiste avaliação + explica) e
 * `renewQuote` (decide reemitir preço antigo × recalcular com o atual)
 * precisam exatamente da mesma lógica, nunca duas implementações que podem
 * divergir.
 */
// Item 9: exportada pra a Aura explicar preço congelado/proteção/renovação
// de uma cotação usando EXATAMENTE o mesmo cálculo de revalidate/renew —
// nunca uma segunda fórmula de "quantos dias restam" reimplementada num
// prompt.
export async function assessQuote(q: QuoteRow): Promise<QuoteAssessment> {
  if (q.commercial_request_id) {
    // D-2: cotação travada no valor APROVADO do pedido "sob consulta" — o motor de preço não recalcula; vale só pela validade (7 dias).
    const timeExpired = q.valid_until != null && q.valid_until < new Date();
    return {
      vis: { visible: true, contractable: true, contractable_existing: true, reasons: [], published_version_id: q.version_id, inactivation_scheduled_at: null, inactivation_effective_at: null },
      sel: normalizeSelection(JSON.parse(q.selection_json)), pricingVersionId: q.version_id, versionChanged: false, scopeCompatible: true, structurallyBroken: false,
      pricing: null, periodResult: null, pricingBroken: false, priceOrDeadlineDrifted: false, timeExpired,
      resolvedAnchor: null, anchorSource: null, protectionEndsAt: null, withinProtectionWindow: false, withinProtection: false, needsRenewal: timeExpired,
    };
  }
  const product = await prisma.catalog2Product.findUnique({
    where: { id: q.product_id },
    include: { import_origin: { select: { pendencies_json: true } } },
  });
  const sel = normalizeSelection(JSON.parse(q.selection_json));
  const vis = product
    ? await checkClientVisibility(product)
    : {
        visible: false, contractable: false, contractable_existing: false, reasons: ["produto removido"],
        published_version_id: null, inactivation_scheduled_at: null, inactivation_effective_at: null,
      };

  // Item 5: revalida uma cotação JÁ EXISTENTE — usa `contractable_existing`
  // (ignora o bloqueio de "nova venda desde o agendamento", só vira falso
  // na data EFETIVA da inativação), nunca `contractable` (esse é o gate de
  // cotação NOVA).
  const targetVersionId = vis.contractable_existing ? product!.published_version_id : null;
  const versionChanged = targetVersionId !== q.version_id;

  let scopeCompatible = true;
  if (vis.contractable_existing && targetVersionId) {
    const targetVersion = await prisma.catalog2ProductVersion.findUnique({
      where: { id: targetVersionId },
      include: { variations: { include: { options: true } }, addons: true },
    });
    if (!targetVersion || targetVersion.state !== "publicada") {
      scopeCompatible = false;
    } else {
      // Item 4.1: trocar de versão (preço novo, MESMO escopo contratado)
      // nunca é quebra estrutural por si só — só é quando a seleção
      // CONGELADA deixa de caber na versão atual (variação/adicional
      // removido, nova variação obrigatória sem opção compatível etc.).
      scopeCompatible = validateSelection(targetVersion, sel).length === 0;
    }
  }

  const structurallyBroken = !vis.contractable_existing || !scopeCompatible;
  const pricingVersionId = structurallyBroken ? null : targetVersionId;

  // Item 6: cotação com período contratado usa o TOTAL do período pra
  // decidir se o preço "desviou" (não o preço mensal de referência sozinho
  // — um desconto de período mudando também conta como desvio). Sem
  // período, comportamento idêntico ao de antes (avulso).
  const contractPeriod = isCatalog2Period(q.contract_period) ? q.contract_period : null;

  let pricing: PricingResult | null = null;
  let periodResult: PeriodPricingResult | null = null;
  if (pricingVersionId) {
    if (contractPeriod) {
      periodResult = await computePeriodPricing(pricingVersionId, sel, product!, contractPeriod, await implOpts(q.account_kind, q.account_id, q.product_id));
      pricing = periodResult.base;
    } else {
      pricing = await computePricing(pricingVersionId, sel, await implOpts(q.account_kind, q.account_id, q.product_id));
    }
  }
  const currentReady = contractPeriod ? !!periodResult?.available : !!pricing?.commercial_ready;
  const pricingBroken = structurallyBroken || !pricing || !currentReady;

  let priceOrDeadlineDrifted = false;
  if (!pricingBroken) {
    const currentTotal = contractPeriod ? periodResult!.total_price : pricing!.lines.commercial_final_price.amount;
    const currentDeadline = contractPeriod ? periodResult!.commercial_deadline_days : pricing!.deadline.commercial_deadline_days;
    priceOrDeadlineDrifted = currentTotal !== q.commercial_price || currentDeadline !== q.commercial_deadline_days;
  }

  const now = new Date();
  const timeExpired = q.valid_until != null && q.valid_until < now;

  let resolvedAnchor = q.price_protection_started_at;
  let anchorSource = q.price_protection_anchor_source as "event_log" | "detected_fallback" | null;
  if (!pricingBroken && priceOrDeadlineDrifted && !resolvedAnchor) {
    // Item 4.1: a proteção conta a partir da data REAL da alteração
    // comercial, nunca da data desta consulta. Procura no log de eventos
    // (config global / valor-hora de especialidade / republicação deste
    // produto) o mais antigo depois da CRIAÇÃO desta cotação — alterações
    // sucessivas depois dessa primeira nunca importam (nunca reancora).
    const specialtyIds = await relevantSpecialtyIds(versionChanged && targetVersionId ? [q.version_id, targetVersionId] : [q.version_id]);
    const loggedAt = await findEarliestCommercialChangeAfter(prisma, { productId: q.product_id, specialtyIds, after: q.created_at });
    if (loggedAt) {
      resolvedAnchor = loggedAt;
      anchorSource = "event_log";
    } else {
      // Não há registro que explique o desvio (alteração anterior à
      // existência deste log, por exemplo) — nunca inventamos uma data
      // retroativa. Usa o momento desta detecção como salvaguarda
      // conservadora (dá ao cliente NO MÍNIMO os 30 dias inteiros a partir
      // de agora) e marca a origem como estimada, nunca silenciosamente
      // como se fosse a data real.
      resolvedAnchor = now;
      anchorSource = "detected_fallback";
    }
  }

  const protectionEndsAt = resolvedAnchor ? new Date(resolvedAnchor.getTime() + PRICE_PROTECTION_DAYS * 24 * 3600 * 1000) : null;
  const withinProtectionWindow = !!protectionEndsAt && now < protectionEndsAt;
  const withinProtection = withinProtectionWindow && !timeExpired;
  const needsRenewal = pricingBroken || timeExpired || (priceOrDeadlineDrifted && !withinProtectionWindow);

  return {
    vis, sel, pricingVersionId, versionChanged, scopeCompatible, structurallyBroken,
    pricing, periodResult, pricingBroken, priceOrDeadlineDrifted, timeExpired,
    resolvedAnchor, anchorSource, protectionEndsAt, withinProtectionWindow, withinProtection, needsRenewal,
  };
}

async function persistQuoteAssessment(q: QuoteRow, a: QuoteAssessment) {
  const anchorChanged =
    (a.resolvedAnchor?.getTime() ?? null) !== (q.price_protection_started_at?.getTime() ?? null) ||
    a.anchorSource !== q.price_protection_anchor_source;
  return prisma.catalog2Quote.update({
    where: { id: q.id },
    data: {
      status: a.needsRenewal ? "expirada" : "valida",
      // NUNCA sobrescreve commercial_price/commercial_deadline_days/
      // pricing_snapshot_json aqui — é exatamente a fotografia que o
      // Item 4 exige preservar.
      ...(anchorChanged ? { price_protection_started_at: a.resolvedAnchor, price_protection_anchor_source: a.anchorSource } : {}),
    },
  });
}

function explainAssessment(a: QuoteAssessment): string | null {
  const endLabel = a.protectionEndsAt?.toISOString().slice(0, 10);
  const fallbackNote =
    a.anchorSource === "detected_fallback"
      ? " (a data exata da alteração anterior a este registro não pôde ser determinada — proteção contada de forma conservadora a partir desta consulta)"
      : "";
  if (a.pricingBroken) {
    if (a.versionChanged && !a.scopeCompatible) {
      return "a nova versão publicada não é compatível com a configuração contratada (variação ou adicional alterado/removido) — não é possível manter nem renovar automaticamente";
    }
    if (!a.vis.contractable_existing) return "o produto não está mais disponível para contratação";
    return "cálculo comercial incompleto";
  }
  if (a.timeExpired) {
    if (a.priceOrDeadlineDrifted && a.withinProtectionWindow) {
      return `a validade desta cotação terminou, mas o preço continua protegido até ${endLabel} — renove para gerar uma cotação nova com o MESMO valor${fallbackNote}`;
    }
    return "a cotação expirou";
  }
  if (a.priceOrDeadlineDrifted && !a.withinProtectionWindow) {
    return `o preço ou prazo comercial mudou e a proteção de 30 dias terminou em ${endLabel} — renove para ver os valores atuais${fallbackNote}`;
  }
  if (a.priceOrDeadlineDrifted && a.withinProtectionWindow) {
    return `o preço mudou, mas esta cotação continua protegida até ${endLabel} (valor anterior preservado)${fallbackNote}`;
  }
  return null;
}

/**
 * Recalcula uma cotação contra a regra comercial ATUAL, sem nunca
 * sobrescrever o preço/prazo/snapshot CONGELADOS na criação (Item 4,
 * "Preços e proteção por 30 dias" — a fotografia da cotação é preservada
 * até que uma RENOVAÇÃO explícita a substitua por uma cotação nova).
 *
 * Três categorias de motivo, tratadas de formas diferentes:
 *  - ESTRUTURAL (produto não contratável, ou nova versão publicada com
 *    escopo INCOMPATÍVEL com a seleção congelada): nunca protegido por
 *    prazo. Trocar de versão com o MESMO escopo (só preço/prazo diferente)
 *    NÃO é estrutural — ver Item 4.1.
 *  - DESVIO DE PREÇO/PRAZO (mesmo escopo, só o valor calculado mudou):
 *    protegido por até 30 dias a partir da data REAL da alteração comercial
 *    (Catalog2CommercialChangeEvent — Item 4.1), nunca da data desta
 *    consulta, e nunca reancorada por alterações sucessivas, respeitando
 *    também o valid_until próprio.
 *  - SEM DESVIO: nada muda.
 */
export async function revalidateQuote(ctx: ClientContext, id: string) {
  const q = await loadOwnedQuote(ctx, id);
  if (q.status === "convertida" || q.status === "cancelada") return serializeQuote(q);

  const a = await assessQuote(q);
  const updated = await persistQuoteAssessment(q, a);

  return {
    ...serializeQuote(updated),
    needs_recalc: a.needsRenewal,
    // Está protegida (preço antigo preservado apesar do desvio) agora?
    protected: !a.pricingBroken && a.priceOrDeadlineDrifted && a.withinProtection,
    price_protection_ends_at: a.protectionEndsAt,
    recalc_reason: explainAssessment(a),
    fresh_pricing: a.pricing ? clientPricingView(a.pricing) : null,
    // Item 6: quando a cotação tem período, é isto que mostra o total ATUAL
    // (com o desconto/preço de hoje) pra comparar com o congelado.
    fresh_period_pricing: a.periodResult ? clientPeriodPricingView(a.periodResult) : null,
  };
}

/**
 * Renova uma cotação vencida (Item 4, ajustado no Item 4.1):
 *  - se a cotação ainda está totalmente válida (nunca precisou de
 *    renovação), é um no-op — devolve a mesma, sem criar nada;
 *  - se só a validade própria (valid_until) terminou mas a proteção de 30
 *    dias (contada da alteração REAL, não desta consulta) ainda está de
 *    pé — ou não houve nenhum desvio de preço — REEMITE a MESMA cotação
 *    (mesmo preço/prazo/config, mesma âncora de proteção, nunca reancorada)
 *    só com validade nova, capada pelo que resta da proteção;
 *  - só quando a proteção realmente terminou (ou há quebra estrutural)
 *    RECALCULA pela regra comercial atual, criando uma cotação nova;
 * em ambos os casos a cotação antiga NUNCA é apagada nem tem seu preço
 * sobrescrito — fica como histórico via renewed_from_quote_id. Se a
 * cotação renovada tem um aditivo (Catalog2ChangeOrder) ainda "solicitado"
 * ou "aprovado" vinculado a ela, o aditivo é REVINCULADO à cotação nova —
 * e, se o preço realmente mudou, sua aprovação é revogada (volta a
 * "solicitado"): nunca finaliza um aditivo aprovado com o preço antigo sem
 * uma nova aceitação.
 */
export async function renewQuote(ctx: ClientContext, id: string) {
  const q = await loadOwnedQuote(ctx, id);
  if (q.status === "convertida") {
    throw new Catalog2Error("Esta cotação já foi convertida em pedido — a contratação já paga permanece intacta e não pode ser renovada.", 409, "quote_already_converted");
  }
  if (q.status === "cancelada") {
    throw new Catalog2Error("Esta cotação foi cancelada — gere uma nova cotação no catálogo.", 409, "quote_cancelled");
  }

  if (q.commercial_request_id && q.valid_until && q.valid_until < new Date()) {
    throw new Catalog2Error("Esta cotação foi negociada com a equipe e a validade terminou. Peça à equipe para gerar a contratação novamente.", 409, "negotiated_quote_expired");
  }
  const a = await assessQuote(q);
  const updated = await persistQuoteAssessment(q, a);

  if (!a.needsRenewal) {
    // Ainda totalmente válida — nunca renova "à toa": devolve a mesma cotação.
    return {
      renewed: false,
      quote: {
        ...serializeQuote(updated),
        needs_recalc: false,
        protected: !a.pricingBroken && a.priceOrDeadlineDrifted && a.withinProtection,
        price_protection_ends_at: a.protectionEndsAt,
        recalc_reason: explainAssessment(a),
        fresh_pricing: a.pricing ? clientPricingView(a.pricing) : null,
        fresh_period_pricing: a.periodResult ? clientPeriodPricingView(a.periodResult) : null,
      },
    };
  }

  // Item 4.1: só recalcula pela regra ATUAL quando a proteção de fato
  // terminou (ou há quebra estrutural) — se ainda protegida (só a validade
  // própria venceu), reemite o MESMO preço/config, nunca recalcula.
  const reissueEligible = !a.pricingBroken && (!a.priceOrDeadlineDrifted || a.withinProtectionWindow);

  const sel = a.sel;
  let mode: "reissued" | "recomputed";
  let createData: Parameters<typeof prisma.catalog2Quote.create>[0]["data"];

  if (reissueEligible) {
    mode = "reissued";
    const cappedValidUntil =
      a.protectionEndsAt && a.protectionEndsAt.getTime() < Date.now() + QUOTE_TTL_HOURS * 3600 * 1000
        ? a.protectionEndsAt
        : new Date(Date.now() + QUOTE_TTL_HOURS * 3600 * 1000);
    createData = {
      account_kind: ctx.account_kind,
      account_id: ctx.account_id,
      user_id: ctx.user_id,
      product_id: q.product_id,
      version_id: q.version_id, // preserva a versão CONGELADA — a fotografia não muda numa reemissão.
      selection_json: q.selection_json,
      deliverables_json: q.deliverables_json,
      quantity: q.quantity,
      commercial_deadline_days: q.commercial_deadline_days,
      commercial_price: q.commercial_price,
      currency: q.currency,
      config_checksum: q.config_checksum,
      pricing_snapshot_json: q.pricing_snapshot_json,
      status: "valida",
      valid_until: cappedValidUntil,
      is_preview: false,
      price_protection_started_at: a.resolvedAnchor, // carregada, nunca reancorada.
      price_protection_anchor_source: a.anchorSource,
      renewed_from_quote_id: q.id,
      // Item 6: reemissão preserva a fotografia do período tal como estava
      // congelada — nunca recalcula (é exatamente o caso "ainda protegida").
      contract_period: q.contract_period,
      contract_period_months: q.contract_period_months,
      contract_period_discount_percent: q.contract_period_discount_percent,
      contract_period_reference_monthly_price: q.contract_period_reference_monthly_price,
      implementation_price: q.implementation_price, recurring_price: q.recurring_price, first_charge_price: q.first_charge_price, pricing_components_json: q.pricing_components_json,
    };
  } else {
    mode = "recomputed";
    if (a.versionChanged && !a.scopeCompatible) {
      throw new Catalog2Error(
        "Não é possível renovar: a nova versão publicada não é compatível com a configuração contratada (variação ou adicional alterado/removido). Escolha o produto novamente no catálogo.",
        409,
        "incompatible_version",
      );
    }
    if (!a.vis.contractable) {
      throw new Catalog2Error(`Não é possível renovar: ${a.vis.reasons.join("; ") || "produto indisponível"}.`, 409, "not_quotable");
    }
    if (!a.pricingVersionId) {
      throw new Catalog2Error("Produto sem versão publicada.", 409, "not_published");
    }
    const contractPeriod = isCatalog2Period(q.contract_period) ? q.contract_period : null;
    if (!a.pricing) {
      throw new Catalog2Error("Não é possível renovar: cálculo comercial incompleto.", 409, "not_commercial_ready");
    }
    if (contractPeriod && !a.periodResult?.available) {
      throw new Catalog2Error(`Não é possível renovar: ${a.periodResult?.quote_blockers.join("; ") ?? "período não disponível"}.`, 409, "not_commercial_ready");
    }
    if (!contractPeriod && !a.pricing.commercial_ready) {
      throw new Catalog2Error(`Não é possível renovar: ${a.pricing.quote_blockers.join("; ")}.`, 409, "not_commercial_ready");
    }
    const checksum = configChecksum(q.product_id, a.pricingVersionId, sel, contractPeriod);
    createData = {
      account_kind: ctx.account_kind,
      account_id: ctx.account_id,
      user_id: ctx.user_id,
      product_id: q.product_id,
      version_id: a.pricingVersionId, // pode ser uma versão NOVA (mesmo escopo, preço diferente).
      selection_json: JSON.stringify(sel),
      deliverables_json: JSON.stringify(deliverablesFor(await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: a.pricingVersionId }, include: { addons: true } }), sel, a.pricing)),
      quantity: sel.quantity ?? 1,
      commercial_deadline_days: contractPeriod ? a.periodResult!.commercial_deadline_days : a.pricing.deadline.commercial_deadline_days,
      commercial_price: contractPeriod ? a.periodResult!.total_price : a.pricing.lines.commercial_final_price.amount,
      currency: a.pricing.currency,
      config_checksum: checksum,
      pricing_snapshot_json: JSON.stringify(contractPeriod ? clientPeriodPricingView(a.periodResult!) : clientPricingView(a.pricing)),
      status: "valida",
      valid_until: new Date(Date.now() + QUOTE_TTL_HOURS * 3600 * 1000),
      is_preview: false,
      // Recálculo de verdade: nasce sem proteção — só entra em proteção de
      // novo se um FUTURO desvio for detectado a partir de agora.
      price_protection_started_at: null,
      price_protection_anchor_source: null,
      renewed_from_quote_id: q.id,
      contract_period: contractPeriod,
      contract_period_months: a.periodResult?.months ?? null,
      contract_period_discount_percent: a.periodResult?.discount_percent ?? null,
      contract_period_reference_monthly_price: a.periodResult?.reference_monthly_price ?? null,
      ...quoteChargeFields(a.pricing, a.periodResult),
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    // A antiga já está "expirada" (persistQuoteAssessment acima) —
    // reafirma por robustez, nunca apaga nem mexe no preço dela.
    await tx.catalog2Quote.update({ where: { id: q.id }, data: { status: "expirada" } });
    const newQuote = await tx.catalog2Quote.create({ data: createData });

    // Item 4.1: se esta cotação tem um aditivo ainda em aberto (solicitado)
    // ou já aprovado, o aditivo é REVINCULADO à cotação nova — sem isso a
    // renovação fica "flutuando" e nunca chega ao fluxo que será realmente
    // contratado. Se o preço mudou de verdade (recálculo), a aprovação
    // anterior é revogada: nunca finaliza o aditivo aprovado com o preço
    // antigo sem uma NOVA aceitação.
    const linkedChangeOrder = await tx.catalog2ChangeOrder.findUnique({ where: { quote_id: q.id } });
    if (linkedChangeOrder && (linkedChangeOrder.status === "solicitado" || linkedChangeOrder.status === "aprovado")) {
      const priceChanged =
        mode === "recomputed" &&
        (newQuote.commercial_price !== q.commercial_price || newQuote.commercial_deadline_days !== q.commercial_deadline_days);
      await tx.catalog2ChangeOrder.update({
        where: { id: linkedChangeOrder.id },
        data: {
          quote_id: newQuote.id,
          ...(linkedChangeOrder.status === "aprovado" && priceChanged
            ? {
                status: "solicitado",
                decided_by_user_id: null,
                decided_at: null,
                decision_note: null,
                approval_client_action_id: null,
                price_impact_snapshot: null,
                deadline_impact_days_snapshot: null,
              }
            : {}),
        },
      });
    }

    // Item 8 (reunião 2026-09-14, "Notificações dos produtos"): "quando uma
    // renovação atualizar os valores, informe a diferença e a necessidade
    // de nova aceitação" — só quando de fato recalculou (nunca numa
    // reemissão do MESMO preço) e algo realmente mudou.
    const priceOrDeadlineChanged =
      mode === "recomputed" &&
      (newQuote.commercial_price !== q.commercial_price || newQuote.commercial_deadline_days !== q.commercial_deadline_days);
    if (priceOrDeadlineChanged) {
      const product = await tx.catalog2Product.findUnique({
        where: { id: q.product_id },
        select: { internal_name: true, published_version: { select: { title: true } } },
      });
      const publicName = product?.published_version?.title ?? product?.internal_name ?? "produto";
      // Item 8.1: intenção gravada NA MESMA transação da renovação (Job +
      // destinatário já resolvidos); o envio em si é assíncrono (worker).
      await createCatalog2NotificationJob(tx, {
        eventType: "quote_renewed",
        entityType: "catalog2_quote",
        entityId: newQuote.id,
        recipients: [{
          userId: ctx.user_id,
          type: "catalog2.quote_renewed",
          title: "Proposta renovada com novo valor",
          message: `Sua proposta para "${publicName}" foi renovada com um novo valor — de ${q.currency} ${q.commercial_price ?? "—"} para ${newQuote.currency} ${newQuote.commercial_price ?? "—"}. É necessária uma nova aceitação para confirmar.`,
          severity: "warning",
          category: "alerta",
          actionUrl: "/catalog2-checkout",
        }],
      });
    }

    return newQuote;
  });

  return {
    renewed: true,
    mode,
    previous: {
      id: q.id,
      commercial_price: q.commercial_price,
      commercial_deadline_days: q.commercial_deadline_days,
      currency: q.currency,
    },
    quote: serializeQuote(created),
    // "Mostre valores anteriores e novos, identificando o que mudou" (Item 4).
    changed: {
      price: created.commercial_price !== q.commercial_price,
      deadline: created.commercial_deadline_days !== q.commercial_deadline_days,
    },
  };
}

export async function cancelQuote(ctx: ClientContext, id: string) {
  const q = await prisma.catalog2Quote.findUnique({ where: { id } });
  if (!q || q.account_kind !== ctx.account_kind || q.account_id !== ctx.account_id) {
    throw new Catalog2Error("Cotação não encontrada.", 404);
  }
  if (q.status === "convertida") throw new Catalog2Error("Cotação já convertida.", 409);
  const updated = await prisma.catalog2Quote.update({ where: { id }, data: { status: "cancelada" } });
  return serializeQuote(updated);
}

function serializeQuote(q: {
  id: string; product_id: string; version_id: string; selection_json: string; deliverables_json: string | null;
  quantity: number; commercial_deadline_days: number | null; commercial_price: number | null; currency: string;
  config_checksum: string; pricing_snapshot_json: string | null; status: string; valid_until: Date | null;
  is_preview: boolean; created_at: Date; updated_at: Date;
  price_protection_started_at?: Date | null; renewed_from_quote_id?: string | null;
  price_protection_anchor_source?: string | null;
  contract_period?: string | null; contract_period_months?: number | null;
  contract_period_discount_percent?: number | null; contract_period_reference_monthly_price?: number | null;
  implementation_price?: number | null; recurring_price?: number | null; first_charge_price?: number | null;
}) {
  const protectionEndsAt = q.price_protection_started_at
    ? new Date(q.price_protection_started_at.getTime() + PRICE_PROTECTION_DAYS * 24 * 3600 * 1000)
    : null;
  return {
    id: q.id,
    product_id: q.product_id,
    version_id: q.version_id,
    selection: safeParse(q.selection_json, {}),
    deliverables: safeParse<string[]>(q.deliverables_json, []),
    quantity: q.quantity,
    commercial_deadline_days: q.commercial_deadline_days,
    commercial_price: q.commercial_price,
    currency: q.currency,
    config_checksum: q.config_checksum,
    pricing_snapshot: safeParse(q.pricing_snapshot_json, null),
    status: q.status,
    valid_until: q.valid_until,
    is_preview: q.is_preview,
    created_at: q.created_at,
    updated_at: q.updated_at,
    price_protection_started_at: q.price_protection_started_at ?? null,
    price_protection_ends_at: protectionEndsAt,
    price_protection_anchor_source: q.price_protection_anchor_source ?? null,
    renewed_from_quote_id: q.renewed_from_quote_id ?? null,
    contract_period: q.contract_period ?? null,
    contract_period_months: q.contract_period_months ?? null,
    contract_period_discount_percent: q.contract_period_discount_percent ?? null,
    contract_period_reference_monthly_price: q.contract_period_reference_monthly_price ?? null,
    implementation_price: q.implementation_price ?? null,
    recurring_price: q.recurring_price ?? null,
    first_charge_price: q.first_charge_price ?? null,
  };
}
function expiryFlags(q: { valid_until: Date | null; status: string }) {
  const expired = q.valid_until != null && new Date(q.valid_until) < new Date() && q.status === "valida";
  return { expired, needs_recalc: expired };
}
function safeParse<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Cesta ─────────────────────────────────────────────────────────────

export async function getCart(ctx: ClientContext) {
  const items = await prisma.catalog2CartItem.findMany({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, user_id: ctx.user_id },
    orderBy: { created_at: "asc" },
    include: { product: { select: { id: true, slug: true, internal_name: true, status: true, published_version_id: true, delivery_recurrence: true } } },
  });
  const out = [];
  let anyStale = false;
  for (const it of items) {
    const sel = normalizeSelection(JSON.parse(it.selection_json));
    const period = isCatalog2Period(it.period) ? it.period : null;
    const current =
      it.product.published_version_id === it.version_id &&
      CATALOG2_CONTRACTABLE_STATUSES.includes(it.product.status as Catalog2Status);
    let pricing: PricingResult | null = null;
    let periodResult: PeriodPricingResult | null = null;
    if (current) {
      const cartImpl = await implOpts(ctx.account_kind, ctx.account_id, it.product_id);
      if (period) periodResult = await computePeriodPricing(it.version_id, sel, it.product, period, cartImpl);
      else pricing = await computePricing(it.version_id, sel, cartImpl);
    }
    const view = pricing ? clientPricingView(pricing) : null;
    const periodView = periodResult ? clientPeriodPricingView(periodResult) : null;
    const ready = period ? !!periodResult?.available : !!pricing?.commercial_ready;
    if (!current || !ready) anyStale = true;
    out.push({
      id: it.id,
      product_id: it.product_id,
      slug: it.product.slug,
      name: it.product.internal_name,
      version_id: it.version_id,
      selection: sel,
      period,
      quantity: it.quantity,
      config_checksum: it.config_checksum,
      current, // versão ainda é a publicada?
      pricing: view,
      period_pricing: periodView,
      needs_recalc: !current || !ready,
    });
  }
  return { items: out, count: out.length, needs_revalidation: anyStale };
}

export async function addToCart(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown, rawPeriod?: unknown) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode usar a cesta do catálogo.", 403, "cannot_contract");
  const product = await prisma.catalog2Product.findFirst({
    where: productLookupWhere(productIdOrSlug),
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: { orderBy: { version_number: "desc" }, include: { variations: { include: { options: true } }, addons: true } },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);
  const vis = await checkClientVisibility(product);
  // Mesma regra de createQuote: contratabilidade, não só visibilidade.
  // Item 5: `contractable` já embute o bloqueio desde o agendamento de inativação.
  if (!vis.contractable) throw new Catalog2Error("Produto indisponível.", 409, "not_available");
  const version = product.versions.find((v) => v.id === product.published_version_id)!;
  const sel = normalizeSelection(rawSelection);
  const period = normalizePeriod(rawPeriod);
  const selErrors = validateSelection(version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const saleProblem = saleModeProblem(version, period) ?? (await commercialProblem(product.id, version));
  if (saleProblem) throw new Catalog2Error(`Não é possível adicionar: ${saleProblem}.`, 409, "sale_mode_not_accepted");
  {
    const cartPricing = await computePricing(version.id, sel);
    if (cartPricing.selection_issues.length) throw new Catalog2Error(cartPricing.selection_issues.map((i) => i.message).join(" "), 422, "invalid_selection");
    if (cartPricing.quote_requirements.length) throw new Catalog2Error(`Esta seleção não pode ser contratada automaticamente. ${cartPricing.quote_requirements.map((r) => r.message).join(" ")} Use "Solicitar orçamento".`, 409, "commercial_request_required");
  }
  if (period) {
    const periodResult = await computePeriodPricing(version.id, sel, product, period);
    if (!periodResult.available) throw new Catalog2Error(`Não é possível adicionar: ${periodResult.quote_blockers.join("; ")}.`, 409, "period_not_available");
  }
  const checksum = configChecksum(product.id, version.id, sel, period);

  // Clique duplo / mesma config: não duplica — devolve a existente.
  const existing = await prisma.catalog2CartItem.findFirst({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, user_id: ctx.user_id, config_checksum: checksum },
  });
  if (existing) return { created: false, item_id: existing.id, already_in_cart: true };

  const created = await prisma.catalog2CartItem.create({
    data: {
      account_kind: ctx.account_kind,
      account_id: ctx.account_id,
      user_id: ctx.user_id,
      product_id: product.id,
      version_id: version.id,
      selection_json: JSON.stringify(sel),
      quantity: sel.quantity ?? 1,
      config_checksum: checksum,
      period,
    },
  });
  return { created: true, item_id: created.id, already_in_cart: false };
}

export async function updateCartItem(ctx: ClientContext, itemId: string, rawSelection: unknown, rawPeriod?: unknown) {
  const item = await prisma.catalog2CartItem.findUnique({
    where: { id: itemId },
    include: {
      version: { include: { variations: { include: { options: true } }, addons: true } },
      product: { select: { id: true, delivery_recurrence: true } },
    },
  });
  if (!item || item.account_kind !== ctx.account_kind || item.account_id !== ctx.account_id || item.user_id !== ctx.user_id) {
    throw new Catalog2Error("Item não encontrado.", 404);
  }
  const sel = normalizeSelection(rawSelection);
  const period = rawPeriod === undefined ? (isCatalog2Period(item.period) ? item.period : null) : normalizePeriod(rawPeriod);
  const selErrors = validateSelection(item.version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const saleProblem = saleModeProblem(item.version, period);
  if (saleProblem) throw new Catalog2Error(`Não é possível atualizar: ${saleProblem}.`, 409, "sale_mode_not_accepted");
  if (period) {
    const periodResult = await computePeriodPricing(item.version_id, sel, item.product, period);
    if (!periodResult.available) throw new Catalog2Error(`Não é possível atualizar: ${periodResult.quote_blockers.join("; ")}.`, 409, "period_not_available");
  }
  const checksum = configChecksum(item.product_id, item.version_id, sel, period);
  const clash = await prisma.catalog2CartItem.findFirst({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, user_id: ctx.user_id, config_checksum: checksum, NOT: { id: itemId } },
  });
  if (clash) throw new Catalog2Error("Essa configuração já está na cesta.", 409, "duplicate_config");
  await prisma.catalog2CartItem.update({
    where: { id: itemId },
    data: { selection_json: JSON.stringify(sel), quantity: sel.quantity ?? 1, config_checksum: checksum, period },
  });
  return { ok: true };
}

export async function removeCartItem(ctx: ClientContext, itemId: string) {
  const item = await prisma.catalog2CartItem.findUnique({ where: { id: itemId } });
  if (!item || item.account_kind !== ctx.account_kind || item.account_id !== ctx.account_id || item.user_id !== ctx.user_id) {
    throw new Catalog2Error("Item não encontrado.", 404);
  }
  await prisma.catalog2CartItem.delete({ where: { id: itemId } });
  return { ok: true };
}

export async function clearCart(ctx: ClientContext) {
  const r = await prisma.catalog2CartItem.deleteMany({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, user_id: ctx.user_id },
  });
  return { ok: true, removed: r.count };
}

// ── Solicitação comercial (orçamento personalizado / análise / contratação assistida) ───────────────────────
// Quando a seleção inclui uma opção/adicional que não pode ser contratado automaticamente, o cliente PEDE em vez de contratar:
// a seleção fica gravada para o time comercial responder. Nunca gera cotação nem cobrança.
export async function createCommercialRequest(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown, rawPeriod?: unknown, clientNote?: string | null, rawAnswers?: Record<string, unknown> | null) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode solicitar orçamento.", 403, "cannot_contract");
  const product = await prisma.catalog2Product.findFirst({
    where: productLookupWhere(productIdOrSlug),
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: { orderBy: { version_number: "desc" }, include: { variations: { include: { options: true } }, addons: { include: { choices: true } } } },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);
  const vis = await checkClientVisibility(product);
  const version = product.versions.find((v) => v.id === product.published_version_id);
  if (!version || version.state !== "publicada") throw new Catalog2Error("Produto sem versão publicada.", 409, "not_published");

  const sel = normalizeSelection(rawSelection);
  const period = normalizePeriod(rawPeriod);
  const selErrors = validateSelection(version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const implOpt = await implOpts(ctx.account_kind, ctx.account_id, product.id);
  const pricing = await computePricing(version.id, sel, implOpt);
  if (pricing.selection_issues.length) throw new Catalog2Error(pricing.selection_issues.map((i) => i.message).join(" "), 422, "invalid_selection");
  // Produto SOB CONSULTA (D-2): não contrata direto — o único caminho é solicitar orçamento (com o questionário do produto).
  const onRequest = pricing.pricing_mode === "on_request";
  if (onRequest ? !vis.visible : !vis.contractable) throw new Catalog2Error(`Produto indisponível.${vis.reasons.length ? ` ${vis.reasons.join("; ")}.` : ""}`, 409, "not_quotable");
  if (!onRequest && pricing.quote_requirements.length === 0) {
    throw new Catalog2Error("Esta seleção pode ser contratada diretamente: gere a cotação em vez de solicitar orçamento.", 409, "commercial_request_not_needed");
  }
  const kind = onRequest ? "custom_quote" : (strongestRequirement(pricing.quote_requirements) ?? "custom_quote");
  // Questionário do produto: obrigatórias respondidas antes de enviar (só nos produtos sob consulta; nos demais é opcional).
  const questions = await loadRequestQuestionnaire(version.id);
  const { answers, errors: answerErrors } = validateRequestAnswers(questions, rawAnswers ?? null);
  if (onRequest && answerErrors.length) throw new Catalog2Error(answerErrors.join(" "), 422, "request_answers_invalid");
  const checksum = configChecksum(product.id, version.id, sel, period);
  const existing = await prisma.catalog2CommercialRequest.findFirst({
    where: onRequest
      ? { product_id: product.id, requested_by_user_id: ctx.user_id, status: { in: OPEN_REQUEST_STATUSES } }
      : { product_id: product.id, requested_by_user_id: ctx.user_id, status: "aberta", selection_json: { contains: checksum } },
  });
  if (existing) return serializeCommercialRequest(existing, true);
  const created = await prisma.catalog2CommercialRequest.create({
    data: {
      product_id: product.id,
      version_id: version.id,
      account_kind: ctx.account_kind,
      account_id: ctx.account_id,
      requested_by_user_id: ctx.user_id,
      kind,
      status: onRequest ? "novo" : "aberta",
      selection_json: JSON.stringify({ checksum, selection: sel, period }),
      reasons_json: JSON.stringify(onRequest ? [{ kind: "custom_quote", message: "Produto sob consulta." }] : pricing.quote_requirements),
      pricing_snapshot_json: JSON.stringify({ rule_version: pricing.rule.version, indicative_total: pricing.simulation.total, active_scenario: pricing.active_scenario, effort_breakdown: pricing.effort_breakdown, addon_breakdown: pricing.addon_breakdown }),
      answers_json: answers.length ? JSON.stringify(answers) : null,
      client_note: clientNote?.slice(0, 2000) ?? null,
    },
  });
  await notifyAdmins("Novo pedido de orçamento", `Há um novo pedido de orçamento para "${product.internal_name}". Responda com valor e prazo em Pedidos de orçamento.`, created.id);
  return serializeCommercialRequest(created, false);
}

type CommercialRequestRow = { id: string; product_id: string; kind: string; status: string; selection_json: string; reasons_json: string; client_note: string | null; response_note: string | null; created_at: Date; handled_at: Date | null; answers_json?: string | null; proposed_price?: number | null; proposed_deadline_days?: number | null; proposal_valid_until?: Date | null; client_response_note?: string | null };
function serializeCommercialRequest(r: CommercialRequestRow, alreadyExisted: boolean) {
  let sel: unknown = null; let reasons: unknown = []; let answers: unknown = [];
  try { sel = JSON.parse(r.selection_json); } catch { /* ignora */ }
  try { reasons = JSON.parse(r.reasons_json); } catch { /* ignora */ }
  try { answers = r.answers_json ? JSON.parse(r.answers_json) : []; } catch { /* ignora */ }
  // Valor e prazo só aparecem para o cliente depois que a equipe ENVIA a proposta.
  const proposal = PROPOSAL_VISIBLE_STATUSES.includes(r.status) && r.proposed_price != null
    ? { proposed_price: r.proposed_price, proposed_deadline_days: r.proposed_deadline_days ?? null, proposal_valid_until: r.proposal_valid_until ?? null, expired: !!r.proposal_valid_until && r.proposal_valid_until.getTime() < Date.now() }
    : null;
  return { id: r.id, product_id: r.product_id, kind: r.kind, kind_label: REQUEST_KIND_LABEL[r.kind] ?? r.kind, status: r.status, selection: (sel as { selection?: unknown } | null)?.selection ?? null, period: (sel as { period?: unknown } | null)?.period ?? null, reasons, answers, proposal, can_respond: r.status === "proposta_enviada" && !(proposal?.expired), client_note: r.client_note, response_note: r.response_note, client_response_note: r.client_response_note ?? null, created_at: r.created_at, handled_at: r.handled_at, already_existed: alreadyExisted };
}

export async function listCommercialRequests(ctx: ClientContext) {
  const rows = await prisma.catalog2CommercialRequest.findMany({ where: { account_kind: ctx.account_kind, account_id: ctx.account_id }, orderBy: { created_at: "desc" }, take: 100 });
  return rows.map((r) => serializeCommercialRequest(r, false));
}

/** Perguntas que o cliente responde ao solicitar orçamento deste produto. */
export async function getRequestQuestionnaire(ctx: ClientContext, productIdOrSlug: string) {
  const product = await prisma.catalog2Product.findFirst({ where: productLookupWhere(productIdOrSlug), select: { id: true, slug: true, status: true, visibility_mode: true, visibility_agency_levels: true, published_version_id: true } });
  if (!product || !product.published_version_id) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!audienceAllows(product, viewerFromContext(ctx))) throw new Catalog2Error("Produto não encontrado.", 404);
  return { product_id: product.id, questions: await loadRequestQuestionnaire(product.published_version_id) };
}

/** O cliente aprova ou recusa a proposta enviada pela equipe. Aprovar NÃO contrata sozinho: avisa a equipe comercial para formalizar. */
export async function respondToCommercialRequest(ctx: ClientContext, id: string, decision: "aprovar" | "recusar", note?: string | null) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode responder a proposta.", 403, "cannot_contract");
  const row = await prisma.catalog2CommercialRequest.findUnique({ where: { id } });
  if (!row || row.account_kind !== ctx.account_kind || row.account_id !== ctx.account_id) throw new Catalog2Error("Pedido não encontrado.", 404);
  if (row.status !== "proposta_enviada") throw new Catalog2Error("Este pedido não tem uma proposta aguardando a sua resposta.", 409, "no_proposal_pending");
  const history = (() => { try { return row.history_json ? JSON.parse(row.history_json) : []; } catch { return []; } })();
  if (row.proposal_valid_until && row.proposal_valid_until.getTime() < Date.now()) {
    await prisma.catalog2CommercialRequest.update({ where: { id }, data: { status: "expirado", history_json: JSON.stringify([...history, { at: new Date().toISOString(), by_user_id: ctx.user_id, status_before: row.status, status_after: "expirado", changes: ["proposal_expired"] }]) } });
    throw new Catalog2Error("A validade da proposta terminou. Peça uma nova proposta à equipe.", 409, "proposal_expired");
  }
  const next = decision === "aprovar" ? "aprovado" : "recusado";
  const updated = await prisma.catalog2CommercialRequest.update({
    where: { id },
    data: { status: next, client_response_note: note?.slice(0, 2000) ?? null, history_json: JSON.stringify([...history, { at: new Date().toISOString(), by_user_id: ctx.user_id, status_before: row.status, status_after: next, changes: ["client_response_note"] }]) },
  });
  const prod = await prisma.catalog2Product.findUnique({ where: { id: row.product_id }, select: { internal_name: true } });
  await notifyAdmins(decision === "aprovar" ? "Cliente aprovou o orçamento" : "Cliente recusou o orçamento", `O cliente ${decision === "aprovar" ? "aprovou" : "recusou"} a proposta de "${prod?.internal_name ?? "produto"}".${decision === "aprovar" ? " Formalize a contratação." : ""}`, id);
  return serializeCommercialRequest(updated, false);
}
