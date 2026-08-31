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

import { prisma } from "./prisma";
import { hashPayload } from "./canonical-json";
import { Catalog2Error, isNewByPublicationDate } from "./catalog2-service";
import { computePricing, defaultSelection, type PricingResult, type PricingSelection } from "./catalog2-pricing";

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
}

export async function resolveClientContext(userId: string, accountType: string, role: string): Promise<ClientContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      company_id: true,
      agency_id: true,
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
    can_preview_drafts: isMaster,
  };
}

// ── Visibilidade de produto ─────────────────────────────────────────────

export interface VisibilityCheck {
  visible: boolean;
  reasons: string[];
  published_version_id: string | null;
}

function mandatoryPendencies(pendJson: string | null | undefined): string[] {
  if (!pendJson) return [];
  try {
    const v = JSON.parse(pendJson);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

type ProductForVisibility = {
  status: string;
  published_version_id: string | null;
  import_origin: { pendencies_json: string | null } | null;
};

export async function checkClientVisibility(product: ProductForVisibility): Promise<VisibilityCheck> {
  const reasons: string[] = [];
  if (product.status !== "disponivel") reasons.push("produto não está disponível");
  if (!product.published_version_id) reasons.push("sem versão publicada");
  const pend = mandatoryPendencies(product.import_origin?.pendencies_json);
  if (pend.length > 0) reasons.push(`pendência obrigatória: ${pend.join(", ")}`);

  if (product.published_version_id && reasons.length === 0) {
    const pricing = await computePricing(product.published_version_id, await defaultSelection(product.published_version_id));
    if (!pricing.commercial_ready) reasons.push(`cálculo comercial incompleto: ${pricing.quote_blockers.join(", ")}`);
  }
  return { visible: reasons.length === 0, reasons, published_version_id: product.published_version_id };
}

// ── Projeção segura para o cliente ─────────────────────────────────────

/** Remove TUDO que é interno de um PricingResult antes de mandar ao cliente. */
export function clientPricingView(p: PricingResult) {
  return {
    currency: p.currency,
    quantity: p.quantity,
    // Preço/prazo COMERCIAIS (nunca esforço, nunca custo).
    commercial_price: p.lines.commercial_final_price.amount,
    commercial_price_label: p.lines.commercial_final_price.amount == null ? "A definir" : undefined,
    commercial_deadline_days: p.deadline.commercial_deadline_days,
    commercial_deadline_pending: p.deadline.commercial_deadline_pending,
    commercial_ready: p.commercial_ready,
    // avisos relevantes ao cliente (sem jargão de custo interno)
    notices: p.warnings
      .filter((w) => w.code !== "tax_order_not_confirmed" && !w.code.startsWith("specialty_") && !w.code.startsWith("ia_cost") && w.code !== "task_without_time")
      .map((w) => w.message),
    applied_options: p.applied_conditions.map((c) => c.explanation),
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

export async function listClientProducts(ctx: ClientContext, f: ClientListFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, f.page_size ?? 20));
  const where: Record<string, unknown> = { status: "disponivel", published_version_id: { not: null } };
  if (f.pillar_id) where.pillar_id = f.pillar_id;
  if (f.category_id) where.category_id = f.category_id;
  if (f.four_f_id) where.four_f = { some: { four_f_id: f.four_f_id } };
  if (f.q) where.OR = [{ internal_name: { contains: f.q } }, { slug: { contains: f.q } }];
  // produtos importados com pendência obrigatória: fora.
  where.OR = [
    ...(where.OR ? [{ OR: where.OR }] : []),
    { import_origin: null },
    { import_origin: { pendencies_json: null } },
    { import_origin: { pendencies_json: "[]" } },
  ] as unknown as typeof where.OR;

  const orderBy =
    f.sort === "name_desc"
      ? { internal_name: "desc" as const }
      : f.sort === "recent"
        ? { updated_at: "desc" as const }
        : { internal_name: "asc" as const };

  const rows = await prisma.catalog2Product.findMany({
    where,
    orderBy,
    include: {
      pillar: { select: { key: true, name: true } },
      category: { select: { key: true, name: true } },
      four_f: { include: { four_f: { select: { key: true, name: true } } } },
      published_version: { select: { id: true, title: true, summary: true, published_at: true } },
    },
  });

  // Filtra por cálculo comercial pronto (não dá pra fazer em SQL).
  const enriched: Array<Record<string, unknown>> = [];
  for (const p of rows) {
    if (!p.published_version) continue;
    const pricing = await computePricing(p.published_version.id, await defaultSelection(p.published_version.id));
    if (!pricing.commercial_ready) continue;
    enriched.push({
      id: p.id,
      slug: p.slug,
      name: p.published_version.title || p.internal_name,
      short_description: p.published_version.summary ?? null,
      pillar: p.pillar,
      category: p.category,
      four_f: p.four_f.map((l) => l.four_f).sort((a, b) => a.key.localeCompare(b.key)),
      origin: p.origin,
      is_new: isNewByPublicationDate(p.published_version.published_at),
      starting_price: pricing.lines.commercial_final_price.amount,
      commercial_deadline_days: pricing.deadline.commercial_deadline_days,
      currency: pricing.currency,
      has_variations: pricing.active_task_keys.length >= 0, // placeholder; UI usa detalhe
    });
  }
  // variações/adicionais indicador: recarrega leve
  const withCounts = await Promise.all(
    enriched.map(async (e) => {
      const v = await prisma.catalog2ProductVersion.findUnique({
        where: { id: rows.find((r) => r.id === e.id)!.published_version!.id },
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

export async function getClientProduct(ctx: ClientContext, slugOrId: string, opts: { preview: boolean }) {
  const product = await prisma.catalog2Product.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    include: {
      pillar: true,
      category: true,
      four_f: { include: { four_f: true } },
      import_origin: { select: { pendencies_json: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" } } } },
          addons: { orderBy: { sort_order: "asc" } },
        },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);

  const previewMode = opts.preview && ctx.can_preview_drafts;
  const vis = await checkClientVisibility(product);

  if (!vis.visible && !previewMode) {
    // Não vaza a existência de rascunho: 404.
    throw new Catalog2Error("Produto não encontrado.", 404);
  }

  const version =
    product.versions.find((v) => v.id === product.published_version_id) ??
    (previewMode ? product.versions.find((v) => v.state === "rascunho") ?? product.versions[0] : null);
  if (!version) throw new Catalog2Error("Produto não encontrado.", 404);

  const sel = await defaultSelection(version.id);
  const pricing = await computePricing(version.id, sel);

  return {
    id: product.id,
    slug: product.slug,
    name: version.title || product.internal_name,
    description: version.full_description ?? version.summary ?? null,
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
    variations: version.variations.map((va) => ({
      id: va.id,
      key: va.key,
      name: va.name,
      is_required: va.is_required,
      selection_type: va.selection_type,
      notes: va.notes,
      options: va.options.map((o) => ({ key: o.key, label: o.label, is_default: o.is_default })),
    })),
    addons: version.addons
      .filter((a) => a.is_active)
      .map((a) => ({ key: a.key, name: a.name, description: a.description, is_default_selected: a.is_default_selected })),
    // informações obrigatórias declaradas por efeitos require_info
    required_info: pricing.warnings
      .filter((w) => w.code === "extra_info_required")
      .flatMap((w) => w.message.replace(/^Informações extras exigidas:\s*/, "").split("; ")),
    default_selection: sel,
    pricing: clientPricingView(pricing),
    can_configure: ctx.can_configure && vis.visible,
    can_contract: ctx.can_contract && vis.visible && pricing.commercial_ready,
  };
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
  return {
    variation_option_keys: arr(r.variation_option_keys),
    addon_keys: arr(r.addon_keys),
    quantity: qty,
    answers,
  };
}

export function configChecksum(productId: string, versionId: string, sel: PricingSelection): string {
  return hashPayload({
    product_id: productId,
    version_id: versionId,
    variation_option_keys: [...(sel.variation_option_keys ?? [])].sort(),
    addon_keys: [...(sel.addon_keys ?? [])].sort(),
    quantity: sel.quantity ?? 1,
    answers: sel.answers ?? {},
  });
}

/** Valida que a seleção cobre toda variação obrigatória e respeita min/max. */
export function validateSelection(
  version: {
    variations: Array<{ key: string; name: string; is_required: boolean; selection_type: string | null; options: Array<{ key: string }> }>;
    addons: Array<{ key: string; is_active: boolean }>;
  },
  sel: PricingSelection,
): string[] {
  const errs: string[] = [];
  const chosen = new Set(sel.variation_option_keys ?? []);
  for (const va of version.variations) {
    const optKeys = va.options.map((o) => o.key);
    const picked = optKeys.filter((k) => chosen.has(k));
    if (va.is_required && picked.length === 0) errs.push(`Escolha uma opção para "${va.name}".`);
    if ((va.selection_type ?? "single") === "single" && picked.length > 1) errs.push(`"${va.name}" aceita apenas uma opção.`);
    for (const k of picked) if (!optKeys.includes(k)) errs.push(`Opção inválida em "${va.name}".`);
  }
  const activeAddons = new Set(version.addons.filter((a) => a.is_active).map((a) => a.key));
  for (const k of sel.addon_keys ?? []) if (!activeAddons.has(k)) errs.push("Adicional inválido ou inativo selecionado.");
  const qty = sel.quantity ?? 1;
  if (qty < 1 || qty > 100000) errs.push("Quantidade fora do limite (1 a 100000).");
  return errs;
}

export async function configureProduct(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown, opts: { preview: boolean }) {
  const product = await prisma.catalog2Product.findFirst({
    where: { OR: [{ slug: productIdOrSlug }, { id: productIdOrSlug }] },
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: { variations: { include: { options: true } }, addons: true },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);

  const previewMode = opts.preview && ctx.can_preview_drafts;
  const vis = await checkClientVisibility(product);
  if (!vis.visible && !previewMode) throw new Catalog2Error("Produto não encontrado.", 404);

  const version =
    product.versions.find((v) => v.id === product.published_version_id) ??
    (previewMode ? product.versions.find((v) => v.state === "rascunho") ?? product.versions[0] : null);
  if (!version) throw new Catalog2Error("Produto não encontrado.", 404);

  const sel = normalizeSelection(rawSelection);
  const selectionErrors = validateSelection(version, sel);
  const pricing = await computePricing(version.id, sel);
  const checksum = configChecksum(product.id, version.id, sel);

  const canQuote =
    !previewMode &&
    ctx.can_contract &&
    vis.visible &&
    version.state === "publicada" &&
    selectionErrors.length === 0 &&
    pricing.commercial_ready;

  return {
    product_id: product.id,
    slug: product.slug,
    version_id: version.id,
    is_preview: previewMode && !vis.visible,
    selection: sel,
    selection_errors: selectionErrors,
    config_checksum: checksum,
    deliverables: deliverablesFor(version, sel, pricing),
    pricing: clientPricingView(pricing),
    can_generate_quote: canQuote,
    quote_blockers: [
      ...(previewMode && !vis.visible ? ["pré-visualização de rascunho não gera cotação"] : []),
      ...selectionErrors,
      ...pricing.quote_blockers,
    ],
  };
}

// ── Pré-cotação ───────────────────────────────────────────────────────

const QUOTE_TTL_HOURS = 72;

export async function createQuote(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode gerar cotações.", 403, "cannot_contract");

  const product = await prisma.catalog2Product.findFirst({
    where: { OR: [{ slug: productIdOrSlug }, { id: productIdOrSlug }] },
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: { orderBy: { version_number: "desc" }, include: { variations: { include: { options: true } }, addons: true } },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);

  const vis = await checkClientVisibility(product);
  if (!vis.visible) throw new Catalog2Error("Produto indisponível para cotação.", 409, "not_quotable");

  const version = product.versions.find((v) => v.id === product.published_version_id);
  if (!version || version.state !== "publicada") throw new Catalog2Error("Produto sem versão publicada.", 409, "not_published");

  const sel = normalizeSelection(rawSelection);
  const selErrors = validateSelection(version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");

  const pricing = await computePricing(version.id, sel);
  if (!pricing.commercial_ready) {
    throw new Catalog2Error(`Cotação inválida: ${pricing.quote_blockers.join("; ")}.`, 409, "not_commercial_ready");
  }

  const checksum = configChecksum(product.id, version.id, sel);
  const validUntil = new Date(Date.now() + QUOTE_TTL_HOURS * 3600 * 1000);

  // Clique duplo: a MESMA config já válida → devolve a existente.
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
      commercial_deadline_days: pricing.deadline.commercial_deadline_days,
      commercial_price: pricing.lines.commercial_final_price.amount,
      currency: pricing.currency,
      config_checksum: checksum,
      pricing_snapshot_json: JSON.stringify(clientPricingView(pricing)),
      status: "valida",
      valid_until: validUntil,
      is_preview: false,
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

/** Recalcula uma cotação: se produto/versão/preço mudou, marca para revisão. */
export async function revalidateQuote(ctx: ClientContext, id: string) {
  const q = await prisma.catalog2Quote.findUnique({ where: { id } });
  if (!q || q.account_kind !== ctx.account_kind || q.account_id !== ctx.account_id) {
    throw new Catalog2Error("Cotação não encontrada.", 404);
  }
  if (q.status === "convertida" || q.status === "cancelada") return serializeQuote(q);

  const product = await prisma.catalog2Product.findUnique({
    where: { id: q.product_id },
    include: { import_origin: { select: { pendencies_json: true } } },
  });
  const sel = normalizeSelection(JSON.parse(q.selection_json));
  const stillCurrent = product?.published_version_id === q.version_id;
  const vis = product ? await checkClientVisibility(product) : { visible: false, reasons: ["produto removido"], published_version_id: null };

  let pricing: PricingResult | null = null;
  if (stillCurrent && vis.visible) pricing = await computePricing(q.version_id, sel);

  const changed =
    !stillCurrent ||
    !vis.visible ||
    !pricing ||
    !pricing.commercial_ready ||
    pricing.lines.commercial_final_price.amount !== q.commercial_price ||
    pricing.deadline.commercial_deadline_days !== q.commercial_deadline_days;

  const now = new Date();
  const expired = q.valid_until != null && q.valid_until < now;

  const updated = await prisma.catalog2Quote.update({
    where: { id: q.id },
    data: {
      status: changed || expired ? "expirada" : "valida",
      pricing_snapshot_json: pricing ? JSON.stringify(clientPricingView(pricing)) : q.pricing_snapshot_json,
    },
  });
  return {
    ...serializeQuote(updated),
    needs_recalc: changed || expired,
    recalc_reason: !stillCurrent
      ? "o produto tem uma nova versão publicada"
      : !vis.visible
        ? "o produto não está mais disponível"
        : expired
          ? "a cotação expirou"
          : changed
            ? "o preço ou o prazo comercial mudou"
            : null,
    fresh_pricing: pricing ? clientPricingView(pricing) : null,
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
}) {
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
    include: { product: { select: { slug: true, internal_name: true, status: true, published_version_id: true } } },
  });
  const out = [];
  let anyStale = false;
  for (const it of items) {
    const sel = normalizeSelection(JSON.parse(it.selection_json));
    const current = it.product.published_version_id === it.version_id && it.product.status === "disponivel";
    let pricing: PricingResult | null = null;
    if (current) pricing = await computePricing(it.version_id, sel);
    const view = pricing ? clientPricingView(pricing) : null;
    if (!current || !pricing?.commercial_ready) anyStale = true;
    out.push({
      id: it.id,
      product_id: it.product_id,
      slug: it.product.slug,
      name: it.product.internal_name,
      version_id: it.version_id,
      selection: sel,
      quantity: it.quantity,
      config_checksum: it.config_checksum,
      current, // versão ainda é a publicada?
      pricing: view,
      needs_recalc: !current || !pricing?.commercial_ready,
    });
  }
  return { items: out, count: out.length, needs_revalidation: anyStale };
}

export async function addToCart(ctx: ClientContext, productIdOrSlug: string, rawSelection: unknown) {
  if (!ctx.can_contract) throw new Catalog2Error("Seu perfil não pode usar a cesta do catálogo.", 403, "cannot_contract");
  const product = await prisma.catalog2Product.findFirst({
    where: { OR: [{ slug: productIdOrSlug }, { id: productIdOrSlug }] },
    include: {
      import_origin: { select: { pendencies_json: true } },
      versions: { orderBy: { version_number: "desc" }, include: { variations: { include: { options: true } }, addons: true } },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  const vis = await checkClientVisibility(product);
  if (!vis.visible) throw new Catalog2Error("Produto indisponível.", 409, "not_available");
  const version = product.versions.find((v) => v.id === product.published_version_id)!;
  const sel = normalizeSelection(rawSelection);
  const selErrors = validateSelection(version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const checksum = configChecksum(product.id, version.id, sel);

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
    },
  });
  return { created: true, item_id: created.id, already_in_cart: false };
}

export async function updateCartItem(ctx: ClientContext, itemId: string, rawSelection: unknown) {
  const item = await prisma.catalog2CartItem.findUnique({ where: { id: itemId }, include: { version: { include: { variations: { include: { options: true } }, addons: true } } } });
  if (!item || item.account_kind !== ctx.account_kind || item.account_id !== ctx.account_id || item.user_id !== ctx.user_id) {
    throw new Catalog2Error("Item não encontrado.", 404);
  }
  const sel = normalizeSelection(rawSelection);
  const selErrors = validateSelection(item.version, sel);
  if (selErrors.length) throw new Catalog2Error(selErrors.join(" "), 422, "invalid_selection");
  const checksum = configChecksum(item.product_id, item.version_id, sel);
  const clash = await prisma.catalog2CartItem.findFirst({
    where: { account_kind: ctx.account_kind, account_id: ctx.account_id, user_id: ctx.user_id, config_checksum: checksum, NOT: { id: itemId } },
  });
  if (clash) throw new Catalog2Error("Essa configuração já está na cesta.", 409, "duplicate_config");
  await prisma.catalog2CartItem.update({
    where: { id: itemId },
    data: { selection_json: JSON.stringify(sel), quantity: sel.quantity ?? 1, config_checksum: checksum },
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
