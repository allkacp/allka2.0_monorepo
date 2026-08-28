// API do CONSTRUTOR do novo catálogo (sprint de produtos, bloco 3/6).
//
// SOMENTE Admin Master (mesma classificação oficial usada em Legacy; 404 para
// os demais). Toda decisão — inclusive preço e prazo — é revalidada no
// servidor. Versão publicada é imutável por qualquer chamada direta.

import { AsyncLocalStorage } from "node:async_hooks";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { CATALOG2_STATUS_MEANING, CATALOG2_EXECUTION_MODES } from "../lib/catalog2-foundation";
import {
  CATALOG2_EFFECT_TYPES,
  CONDITION_OPERATORS,
  CONDITION_TRIGGER_SOURCES,
  describeCondition,
  validateEffect,
} from "../lib/catalog2-effects";
import {
  Catalog2Error,
  archiveProduct,
  buildEffectCtx,
  createProduct,
  getProductDetail,
  newDraftVersion,
  publishVersion,
  setProductStatus,
  validateConditionShape,
  validateVersionForPublish,
} from "../lib/catalog2-service";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";

const router = Router();

// ── Guarda ─────────────────────────────────────────────────────────────
async function guardAdminMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { admin_profile: { select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } } } },
    });
    if (!evaluateAdminMasterAccess(req.user.account_type, user?.admin_profile ?? null)) {
      res.status(404).json({ error: "Não encontrado" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
// Ator da requisição atual (para carimbar "editado por humano"). Preenchido
// pelo middleware abaixo; lido pelos helpers de edição sem precisar passar o
// id por toda a cadeia de funções.
const requestActor = new AsyncLocalStorage<string | null>();

router.use(verifyToken, guardAdminMaster);
// Guarda o ator da requisição para os helpers de edição (carimbo humano).
router.use((req, _res, next) => requestActor.run(req.user?.id ?? null, () => next()));

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof Catalog2Error) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(409).json({ error: "Registro duplicado (chave já usada nesta versão)." });
    return;
  }
  next(err);
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
function safeJson<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function audit(req: Request, action: string, after: Record<string, unknown>) {
  await writeAccessAudit({ actorId: req.user!.id, action: `catalog2.${action}`, after: { module: "catalog2", ...after } }).catch(() => {});
}

// Marca o produto importado como "editado por humano" — depois disso o
// importador do bloco 4 nunca mais sobrescreve o rascunho. Idempotente:
// só carimba a primeira vez (human_edited_at IS NULL).
async function stampHumanEdit(versionId: string) {
  const actorUserId = requestActor.getStore();
  if (!actorUserId) return;
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { product_id: true } });
  if (!v) return;
  await prisma.catalog2ProductImportOrigin
    .updateMany({
      where: { product_id: v.product_id, human_edited_at: null },
      data: { human_edited_at: new Date(), human_edited_by_user_id: actorUserId },
    })
    .catch(() => {});
}

// Carrega uma versão e garante que é RASCUNHO editável. Todo caminho que passa
// por aqui é uma escrita no rascunho → carimba a edição humana.
async function editableVersionOrThrow(versionId: string) {
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId } });
  if (!v) throw new Catalog2Error("Versão não encontrada.", 404);
  if (v.state === "publicada") {
    throw new Catalog2Error("Versão publicada é imutável. Crie uma nova versão.", 409, "version_published_immutable");
  }
  await stampHumanEdit(versionId);
  return v;
}
async function versionOfTask(taskId: string) {
  const t = await prisma.catalog2Task.findUnique({ where: { id: taskId }, select: { version_id: true } });
  if (!t) throw new Catalog2Error("Tarefa não encontrada.", 404);
  return editableVersionOrThrow(t.version_id);
}
async function versionOfVariation(variationId: string) {
  const va = await prisma.catalog2Variation.findUnique({ where: { id: variationId }, select: { version_id: true } });
  if (!va) throw new Catalog2Error("Variação não encontrada.", 404);
  return editableVersionOrThrow(va.version_id);
}

// ── Classificações (listar + criar; a ata prevê incluir novos pilares) ──
const classCreate = z.object({ key: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/), name: z.string().min(1).max(120), sort_order: z.number().int().optional() });

router.get("/pillars", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Pillar.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/pillars", async (req, res, next) => {
  try {
    const d = classCreate.parse(req.body);
    res.status(201).json(await prisma.catalog2Pillar.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.get("/four-f", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2FourF.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.get("/categories", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Category.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/categories", async (req, res, next) => {
  try {
    const d = classCreate.parse(req.body);
    res.status(201).json(await prisma.catalog2Category.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.get("/specialties", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Specialty.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/specialties", async (req, res, next) => {
  try {
    const d = classCreate.extend({ max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish() }).parse(req.body);
    res.status(201).json(await prisma.catalog2Specialty.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99, max_hourly_rate: d.max_hourly_rate ?? null, hourly_rate_note: d.hourly_rate_note ?? null } }));
  } catch (e) { handle(e, res, next); }
});
router.put("/specialties/:id", async (req, res, next) => {
  try {
    const d = z.object({ name: z.string().min(1).max(120).optional(), max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish() }).parse(req.body);
    const updated = await prisma.catalog2Specialty.update({
      where: { id: req.params.id as string },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.max_hourly_rate !== undefined ? { max_hourly_rate: d.max_hourly_rate } : {}),
        ...(d.hourly_rate_note !== undefined ? { hourly_rate_note: d.hourly_rate_note } : {}),
      },
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});

// ── Módulo de precificação (singleton) ────────────────────────────────
router.get("/pricing-settings", async (_req, res, next) => {
  try {
    const s = (await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } })) ??
      (await prisma.catalog2PricingSettings.create({ data: { id: "default" } }));
    res.json(s);
  } catch (e) { next(e); }
});
router.put("/pricing-settings", async (req, res, next) => {
  try {
    const d = z.object({
      tax_percent: z.number().nonnegative().nullish(),
      commission_percent: z.number().nonnegative().nullish(),
      operational_fee_percent: z.number().nonnegative().nullish(),
      profit_margin_percent: z.number().nonnegative().nullish(),
      human_review_percent: z.number().nonnegative().nullish(),
      currency: z.string().length(3).optional(),
      notes: z.string().max(2000).nullish(),
    }).parse(req.body);
    const data: Record<string, unknown> = { updated_by_user_id: req.user!.id };
    for (const k of ["tax_percent", "commission_percent", "operational_fee_percent", "profit_margin_percent", "human_review_percent", "currency", "notes"] as const) {
      if (d[k] !== undefined) data[k] = d[k];
    }
    const s = await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    await audit(req, "pricing_settings_updated", {});
    res.json(s);
  } catch (e) { handle(e, res, next); }
});

// ── Overview (tela) ──────────────────────────────────────────────────
router.get("/overview", async (_req, res, next) => {
  try {
    const [pillars, fourF, categories, specialties, products, byStatus, draftCount] = await Promise.all([
      prisma.catalog2Pillar.count(),
      prisma.catalog2FourF.count(),
      prisma.catalog2Category.count(),
      prisma.catalog2Specialty.count(),
      prisma.catalog2Product.count(),
      prisma.catalog2Product.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.catalog2ProductVersion.count({ where: { state: "rascunho" } }),
    ]);
    res.json({
      counts: { products, pillars, four_f: fourF, categories, specialties, draft_versions: draftCount },
      products_by_status: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      status_meaning: CATALOG2_STATUS_MEANING,
      is_empty: products === 0,
      empty_message: "O novo catálogo está preparado. Os 36 produtos serão importados em um próximo bloco.",
    });
  } catch (e) { next(e); }
});

// ── Listagem de produtos (busca/filtro/ordenação/paginação) ──────────
const SORTS: Record<string, Prisma.Catalog2ProductOrderByWithRelationInput> = {
  name: { internal_name: "asc" },
  name_desc: { internal_name: "desc" },
  updated: { updated_at: "desc" },
  created: { created_at: "desc" },
};
router.get("/products", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const pillar = typeof req.query.pillar_id === "string" ? req.query.pillar_id : undefined;
    const category = typeof req.query.category_id === "string" ? req.query.category_id : undefined;
    const fourF = typeof req.query.four_f_id === "string" ? req.query.four_f_id : undefined;
    const origin = typeof req.query.origin === "string" ? req.query.origin : undefined;
    const execMode = typeof req.query.execution_mode === "string" ? req.query.execution_mode : undefined;
    // Filtros da importação (bloco 4): origem/revisão da Rose/estado de preparo/tipo de pendência.
    const roseReviewed = req.query.rose_reviewed === "true" ? true : req.query.rose_reviewed === "false" ? false : undefined;
    const reviewState = typeof req.query.review_state === "string" ? req.query.review_state : undefined;
    const pendency = typeof req.query.pendency === "string" ? req.query.pendency : undefined;
    const importedOnly = req.query.imported === "true";
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const orderBy = SORTS[String(req.query.sort ?? "name")] ?? SORTS.name;

    const where: Prisma.Catalog2ProductWhereInput = {};
    if (status) where.status = status;
    if (pillar) where.pillar_id = pillar;
    if (category) where.category_id = category;
    if (origin) where.origin = origin;
    if (fourF) where.four_f = { some: { four_f_id: fourF } };
    if (execMode) where.versions = { some: { tasks: { some: { execution_mode: execMode } } } };
    if (q) where.OR = [{ internal_name: { contains: q } }, { slug: { contains: q } }];

    const originWhere: Prisma.Catalog2ProductImportOriginWhereInput = {};
    if (roseReviewed !== undefined) originWhere.rose_reviewed = roseReviewed;
    if (reviewState) originWhere.review_state = reviewState;
    if (pendency) originWhere.pendencies_json = { contains: `"${pendency}"` };
    if (importedOnly || Object.keys(originWhere).length > 0) where.import_origin = { is: originWhere };

    const [total, rows] = await Promise.all([
      prisma.catalog2Product.count({ where }),
      prisma.catalog2Product.findMany({
        where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
        include: {
          pillar: { select: { key: true, name: true } },
          category: { select: { key: true, name: true } },
          versions: { select: { id: true, version_number: true, state: true, published_at: true, updated_at: true } },
          import_origin: { select: { rose_reviewed: true, review_state: true, pendencies_json: true, area_rose: true, human_edited_at: true, source_index: true } },
        },
      }),
    ]);
    const NEW_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    res.json({
      data: rows.map((p) => {
        const pub = p.versions.find((v) => v.id === p.published_version_id) ?? null;
        const io = p.import_origin;
        return {
          id: p.id,
          internal_name: p.internal_name,
          slug: p.slug,
          pillar: p.pillar,
          category: p.category,
          origin: p.origin,
          status: p.status,
          published_version_number: pub?.version_number ?? null,
          published_at: pub?.published_at ?? null,
          has_draft: p.versions.some((v) => v.state === "rascunho"),
          is_new: !!pub?.published_at && now - new Date(pub.published_at).getTime() <= NEW_MS,
          updated_at: p.updated_at,
          imported: !!io,
          rose_reviewed: io?.rose_reviewed ?? null,
          review_state: io?.review_state ?? null,
          pendencies: io?.pendencies_json ? safeJsonArray(io.pendencies_json) : [],
          human_edited: !!io?.human_edited_at,
          source_index: io?.source_index ?? null,
        };
      }),
      total, page, page_size: pageSize,
    });
  } catch (e) { next(e); }
});

router.get("/products/:id", async (req, res, next) => {
  try { res.json(await getProductDetail(req.params.id as string)); } catch (e) { handle(e, res, next); }
});

// ── Produto: criar / info geral / classificações / status / arquivar ──
const createSchema = z.object({
  internal_name: z.string().min(1).max(200),
  slug: z.string().max(90).nullish(),
  pillar_id: z.string().nullish(),
  category_id: z.string().nullish(),
  origin: z.enum(["existente", "novo", "reativado"]).nullish(),
  four_f_ids: z.array(z.string()).max(4).optional(),
});
router.post("/products", async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    const p = await createProduct(d, req.user!.id);
    await audit(req, "product_created", { id: p.id, internal_name: p.internal_name });
    res.status(201).json(await getProductDetail(p.id));
  } catch (e) { handle(e, res, next); }
});

router.put("/versions/:id", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = z.object({
      title: z.string().min(1).max(200).optional(),
      summary: z.string().max(4000).nullish(),
      full_description: z.string().max(30000).nullish(),
      deliverables: z.string().max(8000).nullish(),
      client_info: z.string().max(8000).nullish(),
      internal_notes: z.string().max(8000).nullish(),
      change_summary: z.string().max(2000).nullish(),
    }).parse(req.body);
    // deliverables/client_info/internal_notes ficam no full_description
    // estruturado por marcadores? Não — mantemos simples: só os campos do
    // schema. Os extras entram no summary/description conforme a UI.
    const data: Record<string, unknown> = { updated_by_user_id: req.user!.id };
    for (const k of ["title", "summary", "full_description", "change_summary"] as const) if (d[k] !== undefined) data[k] = d[k];
    const updated = await prisma.catalog2ProductVersion.update({ where: { id: req.params.id as string }, data });
    await prisma.catalog2VersionEvent.create({ data: { version_id: updated.id, event_type: "updated", actor_user_id: req.user!.id, note: "Informações gerais editadas." } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

router.put("/products/:id/classifications", async (req, res, next) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const d = z.object({
      pillar_id: z.string().nullish(),
      category_id: z.string().nullish(),
      four_f_ids: z.array(z.string()).max(4).optional(),
    }).parse(req.body);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Product.update({
        where: { id: product.id },
        data: { pillar_id: d.pillar_id ?? null, category_id: d.category_id ?? null },
      });
      if (d.four_f_ids) {
        await tx.catalog2ProductFourF.deleteMany({ where: { product_id: product.id } });
        for (const four_f_id of d.four_f_ids) await tx.catalog2ProductFourF.create({ data: { product_id: product.id, four_f_id } });
      }
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

router.patch("/products/:id/status", async (req, res, next) => {
  try {
    const updated = await setProductStatus(req.params.id as string, String(req.body?.status ?? ""));
    await audit(req, "product_status", { id: updated.id, status: updated.status });
    res.json({ ok: true, status: updated.status });
  } catch (e) { handle(e, res, next); }
});
router.post("/products/:id/archive", async (req, res, next) => {
  try {
    const updated = await archiveProduct(req.params.id as string, req.user!.id);
    await audit(req, "product_archived", { id: updated.id });
    res.json({ ok: true, status: updated.status });
  } catch (e) { handle(e, res, next); }
});

// ── Versões ─────────────────────────────────────────────────────────
router.post("/products/:id/versions", async (req, res, next) => {
  try {
    const v = await newDraftVersion(req.params.id as string, req.user!.id);
    res.status(201).json({ ok: true, version_id: v.id, version_number: v.version_number, state: v.state });
  } catch (e) { handle(e, res, next); }
});
router.get("/versions/:id/validate", async (req, res, next) => {
  try { res.json(await validateVersionForPublish(req.params.id as string)); } catch (e) { handle(e, res, next); }
});
router.post("/versions/:id/publish", async (req, res, next) => {
  try {
    const d = z.object({ client_action_id: z.string().max(80).optional(), change_summary: z.string().max(2000).optional(), force: z.boolean().optional() }).parse(req.body ?? {});
    const published = await publishVersion(req.params.id as string, req.user!.id, {
      clientActionId: d.client_action_id,
      changeSummary: d.change_summary,
      force: d.force,
    });
    await audit(req, "version_published", { version_id: published.id, product_id: published.product_id, version_number: published.version_number });
    res.json({ ok: true, version_id: published.id, published_at: published.published_at, version_number: published.version_number });
  } catch (e) { handle(e, res, next); }
});

// ── Variações e opções ──────────────────────────────────────────────
const variationSchema = z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(120), is_required: z.boolean().optional(), selection_type: z.enum(["single"]).optional(), sort_order: z.number().int().optional(), notes: z.string().max(2000).nullish() });
router.post("/versions/:id/variations", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = variationSchema.parse(req.body);
    const created = await prisma.catalog2Variation.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, is_required: d.is_required ?? true, sort_order: d.sort_order ?? 99, notes: d.notes ?? null } });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/variations/:id", async (req, res, next) => {
  try {
    await versionOfVariation(req.params.id as string);
    const d = variationSchema.partial().parse(req.body);
    res.json(await prisma.catalog2Variation.update({ where: { id: req.params.id as string }, data: d }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/variations/:id", async (req, res, next) => {
  try {
    await versionOfVariation(req.params.id as string);
    await prisma.catalog2Variation.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
const optionSchema = z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(160), sort_order: z.number().int().optional(), is_default: z.boolean().optional() });
router.post("/variations/:id/options", async (req, res, next) => {
  try {
    await versionOfVariation(req.params.id as string);
    const d = optionSchema.parse(req.body);
    res.status(201).json(await prisma.catalog2VariationOption.create({ data: { variation_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.put("/options/:id", async (req, res, next) => {
  try {
    const o = await prisma.catalog2VariationOption.findUnique({ where: { id: req.params.id as string }, select: { variation_id: true } });
    if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
    await versionOfVariation(o.variation_id);
    const d = optionSchema.partial().parse(req.body);
    res.json(await prisma.catalog2VariationOption.update({ where: { id: req.params.id as string }, data: d }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/options/:id", async (req, res, next) => {
  try {
    const o = await prisma.catalog2VariationOption.findUnique({ where: { id: req.params.id as string }, select: { variation_id: true } });
    if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
    await versionOfVariation(o.variation_id);
    await prisma.catalog2VariationOption.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Efeitos (opção / adicional) — vocabulário fechado ────────────────
const effectSchema = z.object({ effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500), sort_order: z.number().int().optional() });
async function versionOfOption(optionId: string): Promise<string> {
  const o = await prisma.catalog2VariationOption.findUnique({ where: { id: optionId }, include: { variation: { select: { version_id: true } } } });
  if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
  await editableVersionOrThrow(o.variation.version_id);
  return o.variation.version_id;
}
router.post("/options/:id/effects", async (req, res, next) => {
  try {
    const versionId = await versionOfOption(req.params.id as string);
    const d = effectSchema.parse(req.body);
    const ctx = await buildEffectCtx(versionId);
    const err = validateEffect(d.effect_type, d.effect_value, ctx);
    if (err) throw new Catalog2Error(err, 422, "invalid_effect");
    res.status(201).json(await prisma.catalog2OptionEffect.create({ data: { variation_option_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/option-effects/:id", async (req, res, next) => {
  try {
    const e = await prisma.catalog2OptionEffect.findUnique({ where: { id: req.params.id as string }, select: { variation_option_id: true } });
    if (!e) throw new Catalog2Error("Efeito não encontrado.", 404);
    await versionOfOption(e.variation_option_id);
    await prisma.catalog2OptionEffect.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (err) { handle(err, res, next); }
});

// ── Adicionais ─────────────────────────────────────────────────────
const addonSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), is_default_selected: z.boolean().optional(), is_active: z.boolean().optional(),
  base_cost: z.number().nonnegative().nullish(), target_task_id: z.string().nullish(), target_step_id: z.string().nullish(),
});
router.post("/versions/:id/addons", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = addonSchema.parse(req.body);
    res.status(201).json(await prisma.catalog2Addon.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, is_default_selected: d.is_default_selected ?? false, is_active: d.is_active ?? true, base_cost: d.base_cost ?? null, target_task_id: d.target_task_id ?? null, target_step_id: d.target_step_id ?? null } }));
  } catch (e) { handle(e, res, next); }
});
async function versionOfAddon(addonId: string): Promise<string> {
  const a = await prisma.catalog2Addon.findUnique({ where: { id: addonId }, select: { version_id: true } });
  if (!a) throw new Catalog2Error("Adicional não encontrado.", 404);
  await editableVersionOrThrow(a.version_id);
  return a.version_id;
}
router.put("/addons/:id", async (req, res, next) => {
  try {
    await versionOfAddon(req.params.id as string);
    const d = addonSchema.partial().parse(req.body);
    res.json(await prisma.catalog2Addon.update({ where: { id: req.params.id as string }, data: d }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/addons/:id", async (req, res, next) => {
  try {
    await versionOfAddon(req.params.id as string);
    await prisma.catalog2Addon.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.post("/addons/:id/effects", async (req, res, next) => {
  try {
    const versionId = await versionOfAddon(req.params.id as string);
    const d = effectSchema.parse(req.body);
    const err = validateEffect(d.effect_type, d.effect_value, await buildEffectCtx(versionId));
    if (err) throw new Catalog2Error(err, 422, "invalid_effect");
    res.status(201).json(await prisma.catalog2AddonEffect.create({ data: { addon_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/addon-effects/:id", async (req, res, next) => {
  try {
    const e = await prisma.catalog2AddonEffect.findUnique({ where: { id: req.params.id as string }, select: { addon_id: true } });
    if (!e) throw new Catalog2Error("Efeito não encontrado.", 404);
    await versionOfAddon(e.addon_id);
    await prisma.catalog2AddonEffect.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (err) { handle(err, res, next); }
});

// ── Tarefas e etapas ───────────────────────────────────────────────
const taskSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), objective: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), specialty_id: z.string().nullish(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  estimated_minutes: z.number().int().nonnegative().nullish(),
  requires_review: z.boolean().optional(), requires_client_approval: z.boolean().optional(), is_conditional: z.boolean().optional(),
});
router.post("/versions/:id/tasks", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = taskSchema.parse(req.body);
    res.status(201).json(await prisma.catalog2Task.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, objective: d.objective ?? null, sort_order: d.sort_order ?? 99, specialty_id: d.specialty_id ?? null, execution_mode: d.execution_mode ?? "humano", estimated_minutes: d.estimated_minutes ?? null, requires_review: d.requires_review ?? false, requires_client_approval: d.requires_client_approval ?? false, is_conditional: d.is_conditional ?? false } }));
  } catch (e) { handle(e, res, next); }
});
router.put("/tasks/:id", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const d = taskSchema.partial().parse(req.body);
    res.json(await prisma.catalog2Task.update({ where: { id: req.params.id as string }, data: d }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/tasks/:id", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    await prisma.catalog2Task.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.post("/tasks/:id/duplicate", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const src = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, include: { steps: true, ai: true } });
    const dup = await prisma.$transaction(async (tx) => {
      const t = await tx.catalog2Task.create({
        data: {
          version_id: src.version_id, key: `${src.key}-copia-${Date.now().toString(36)}`, name: `${src.name} (cópia)`,
          description: src.description, objective: src.objective, sort_order: src.sort_order + 1,
          specialty_id: src.specialty_id, execution_mode: src.execution_mode, estimated_minutes: src.estimated_minutes,
          requires_review: src.requires_review, requires_client_approval: src.requires_client_approval, is_conditional: src.is_conditional,
        },
      });
      for (const s of src.steps) await tx.catalog2TaskStep.create({ data: { task_id: t.id, key: s.key, name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional } });
      if (src.ai) await tx.catalog2TaskAI.create({ data: { task_id: t.id, provider: src.ai.provider, model: src.ai.model, est_input_tokens: src.ai.est_input_tokens, est_output_tokens: src.ai.est_output_tokens, unit_cost_input_per_1k: src.ai.unit_cost_input_per_1k, unit_cost_output_per_1k: src.ai.unit_cost_output_per_1k, currency: src.ai.currency, est_review_rounds: src.ai.est_review_rounds, cost_note: src.ai.cost_note, human_review_required: src.ai.human_review_required } });
      return t;
    });
    res.status(201).json({ ok: true, task_id: dup.id });
  } catch (e) { handle(e, res, next); }
});

// Reordenar tarefas (lista de ids na ordem desejada) — persiste no banco.
router.put("/versions/:id/tasks/order", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const ids = z.array(z.string()).parse(req.body?.order ?? []);
    await prisma.$transaction(ids.map((id, i) => prisma.catalog2Task.update({ where: { id }, data: { sort_order: i + 1 } })));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

const stepSchema = z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), sort_order: z.number().int().optional(), estimated_minutes: z.number().int().nonnegative().nullish(), is_conditional: z.boolean().optional() });
router.post("/tasks/:id/steps", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const d = stepSchema.parse(req.body);
    res.status(201).json(await prisma.catalog2TaskStep.create({ data: { task_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, estimated_minutes: d.estimated_minutes ?? null, is_conditional: d.is_conditional ?? false } }));
  } catch (e) { handle(e, res, next); }
});
async function versionOfStep(stepId: string) {
  const s = await prisma.catalog2TaskStep.findUnique({ where: { id: stepId }, include: { task: { select: { version_id: true } } } });
  if (!s) throw new Catalog2Error("Etapa não encontrada.", 404);
  return editableVersionOrThrow(s.task.version_id);
}
router.put("/steps/:id", async (req, res, next) => {
  try {
    await versionOfStep(req.params.id as string);
    res.json(await prisma.catalog2TaskStep.update({ where: { id: req.params.id as string }, data: stepSchema.partial().parse(req.body) }));
  } catch (e) { handle(e, res, next); }
});
router.delete("/steps/:id", async (req, res, next) => {
  try {
    await versionOfStep(req.params.id as string);
    await prisma.catalog2TaskStep.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.put("/tasks/:id/steps/order", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const ids = z.array(z.string()).parse(req.body?.order ?? []);
    await prisma.$transaction(ids.map((id, i) => prisma.catalog2TaskStep.update({ where: { id }, data: { sort_order: i + 1 } })));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// Dependência entre tarefas — recusa tarefa de outra versão.
router.post("/tasks/:id/dependencies", async (req, res, next) => {
  try {
    const v = await versionOfTask(req.params.id as string);
    const dependsOn = z.string().parse(req.body?.depends_on_task_id);
    const dep = await prisma.catalog2Task.findUnique({ where: { id: dependsOn }, select: { version_id: true, id: true } });
    if (!dep || dep.version_id !== v.id) throw new Catalog2Error("A dependência precisa ser uma tarefa da MESMA versão.", 422, "cross_version_ref");
    if (dep.id === req.params.id) throw new Catalog2Error("Uma tarefa não pode depender de si mesma.", 422);
    await prisma.catalog2TaskDependency.create({ data: { task_id: req.params.id as string, depends_on_task_id: dependsOn } });
    res.status(201).json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.delete("/tasks/:id/dependencies/:depId", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    await prisma.catalog2TaskDependency.deleteMany({ where: { task_id: req.params.id as string, depends_on_task_id: req.params.depId as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// AI config da tarefa
router.put("/tasks/:id/ai", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const d = z.object({
      provider: z.string().max(120).nullish(), model: z.string().max(120).nullish(),
      est_input_tokens: z.number().int().nonnegative().nullish(), est_output_tokens: z.number().int().nonnegative().nullish(),
      unit_cost_input_per_1k: z.number().nonnegative().nullish(), unit_cost_output_per_1k: z.number().nonnegative().nullish(),
      currency: z.string().length(3).optional(), est_review_rounds: z.number().int().nonnegative().nullish(),
      cost_note: z.string().max(2000).nullish(), human_review_required: z.boolean().optional(),
    }).parse(req.body);
    const ai = await prisma.catalog2TaskAI.upsert({
      where: { task_id: req.params.id as string },
      create: { task_id: req.params.id as string, ...d },
      update: d,
    });
    res.json(ai);
  } catch (e) { handle(e, res, next); }
});

// ── Condições TIPADAS ──────────────────────────────────────────────
const conditionSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
  trigger_source: z.enum(CONDITION_TRIGGER_SOURCES), trigger_ref: z.string().max(120).nullish(),
  operator: z.enum(CONDITION_OPERATORS), comparison_value: z.string().max(200).nullish(),
  effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500),
});
router.post("/versions/:id/conditions", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = conditionSchema.parse(req.body);
    const err = validateConditionShape(d, await buildEffectCtx(req.params.id as string));
    if (err) throw new Catalog2Error(err, 422, "invalid_condition");
    const explanation = describeCondition(d);
    res.status(201).json(await prisma.catalog2Condition.create({ data: { version_id: req.params.id as string, ...d, description: d.description ?? null, trigger_ref: d.trigger_ref ?? null, comparison_value: d.comparison_value ?? null, is_active: d.is_active ?? true, sort_order: d.sort_order ?? 99, explanation } }));
  } catch (e) { handle(e, res, next); }
});
async function versionOfCondition(id: string) {
  const c = await prisma.catalog2Condition.findUnique({ where: { id }, select: { version_id: true } });
  if (!c) throw new Catalog2Error("Condição não encontrada.", 404);
  return editableVersionOrThrow(c.version_id);
}
router.put("/conditions/:id", async (req, res, next) => {
  try {
    const v = await versionOfCondition(req.params.id as string);
    const cur = await prisma.catalog2Condition.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const d = conditionSchema.partial().parse(req.body);
    const merged = { ...cur, ...d };
    const err = validateConditionShape(merged, await buildEffectCtx(v.id));
    if (err) throw new Catalog2Error(err, 422, "invalid_condition");
    const updated = await prisma.catalog2Condition.update({ where: { id: req.params.id as string }, data: { ...d, explanation: describeCondition(merged) } });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/conditions/:id", async (req, res, next) => {
  try {
    await versionOfCondition(req.params.id as string);
    await prisma.catalog2Condition.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Simulador e Pré-visualização (mesmo cálculo do backend) ─────────
const selectionSchema = z.object({
  variation_option_keys: z.array(z.string()).optional(),
  addon_keys: z.array(z.string()).optional(),
  quantity: z.number().int().positive().max(100000).optional(),
  answers: z.record(z.string()).optional(),
});
router.post("/versions/:id/simulate", async (req, res, next) => {
  try {
    const sel = selectionSchema.parse(req.body ?? {});
    const pricing = await computePricing(req.params.id as string, sel);
    res.json({ selection: sel, pricing });
  } catch (e) { handle(e, res, next); }
});
router.get("/versions/:id/preview", async (req, res, next) => {
  try {
    const version = await prisma.catalog2ProductVersion.findUnique({
      where: { id: req.params.id as string },
      include: {
        product: { include: { pillar: true, category: true, four_f: { include: { four_f: true } } } },
        variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" } } } },
        addons: { orderBy: { sort_order: "asc" } },
        tasks: { orderBy: { sort_order: "asc" }, select: { name: true, execution_mode: true } },
      },
    });
    if (!version) throw new Catalog2Error("Versão não encontrada.", 404);
    const sel = await defaultSelection(req.params.id as string);
    const pricing = await computePricing(req.params.id as string, sel);
    res.json({
      name: version.product.internal_name,
      title: version.title,
      description: version.full_description ?? version.summary,
      pillar: version.product.pillar?.name ?? null,
      category: version.product.category?.name ?? null,
      four_f: version.product.four_f.map((l) => l.four_f.name),
      variations: version.variations.map((va) => ({ name: va.name, options: va.options.map((o) => o.label) })),
      addons: version.addons.map((a) => ({ name: a.name, description: a.description })),
      tasks: version.tasks.map((t) => ({ name: t.name, mode: t.execution_mode })),
      estimated_deadline_days: pricing.estimated_deadline_days,
      commercial_deadline_pending: pricing.deadline.commercial_deadline_pending,
      effort_days: pricing.deadline.effort_days,
      price: pricing.lines.commercial_final_price.amount,
      price_pending: pricing.pricing_pending,
      pending_info: pricing.pending_info,
      currency: pricing.currency,
      default_selection: sel,
    });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// IMPORTAÇÃO DOS 36 PRODUTOS (sprint de produtos, bloco 4/6) — leitura,
// painel de resumo, relatório de qualidade e resolução de pendências.
// Tudo Admin Master (o router já garante). Nada aqui publica produto.
// ═══════════════════════════════════════════════════════════════════════

// Ordem de prioridade para recalcular o "estado de preparo" ao resolver
// pendências — igual à do importador (import-products.ts).
const PENDENCY_PRIORITY = [
  "content_review_pending",
  "classification_decision_pending",
  "price_pending",
  "deadline_pending",
  "portfolio_pending",
  "rose_review_pending",
];
function reviewStateFromPendencies(pendencies: string[]): string {
  for (const p of PENDENCY_PRIORITY) if (pendencies.includes(p)) return p;
  return "ready_for_final_review";
}

// Painel de resumo da última importação aplicada + panorama por estado.
router.get("/import/summary", async (_req, res, next) => {
  try {
    const lastApply = await prisma.catalog2ImportBatch.findFirst({
      where: { mode: "apply" },
      orderBy: { started_at: "desc" },
    });
    const [totalImported, byState, origins] = await Promise.all([
      prisma.catalog2ProductImportOrigin.count(),
      prisma.catalog2ProductImportOrigin.groupBy({ by: ["review_state"], _count: { _all: true } }),
      prisma.catalog2ProductImportOrigin.findMany({
        select: { pendencies_json: true, rose_reviewed: true, divergences_json: true, human_edited_at: true, historical_price_min: true },
      }),
    ]);
    const pendencyCounts: Record<string, number> = {};
    let decisionsPending = 0;
    for (const o of origins) {
      for (const p of safeJsonArray(o.pendencies_json)) pendencyCounts[p] = (pendencyCounts[p] ?? 0) + 1;
      const divs = safeJson<Array<{ decision_pending?: boolean }>>(o.divergences_json, []);
      if (divs.some((d) => d.decision_pending)) decisionsPending++;
    }
    res.json({
      has_import: !!lastApply,
      last_batch: lastApply
        ? {
            id: lastApply.id,
            mode: lastApply.mode,
            rule_version: lastApply.rule_version,
            status: lastApply.status,
            started_at: lastApply.started_at,
            finished_at: lastApply.finished_at,
            expected_products: lastApply.expected_products,
            created: lastApply.created_count,
            updated: lastApply.updated_count,
            unchanged: lastApply.unchanged_count,
            divergences: lastApply.divergence_count,
            source_main: { name: lastApply.source_main_name, checksum: lastApply.source_main_checksum },
            source_rose: { name: lastApply.source_rose_name, checksum: lastApply.source_rose_checksum },
            source_ata_checksum: lastApply.source_ata_checksum,
          }
        : null,
      total_imported: totalImported,
      expected: 36,
      count_matches_expected: totalImported === 36,
      rose_reviewed: origins.filter((o) => o.rose_reviewed).length,
      not_rose_reviewed: origins.filter((o) => !o.rose_reviewed).length,
      human_edited: origins.filter((o) => o.human_edited_at).length,
      with_historical_price: origins.filter((o) => o.historical_price_min != null).length,
      by_review_state: Object.fromEntries(byState.map((s) => [s.review_state, s._count._all])),
      by_pendency: pendencyCounts,
      decisions_pending: decisionsPending,
      // Escopo: SÓ os produtos vindos da importação. Nenhum deles pode estar publicado.
      published_count: await prisma.catalog2ProductVersion.count({
        where: { state: "publicada", product: { import_origin: { isNot: null } } },
      }),
    });
  } catch (e) { next(e); }
});

// Relatório de qualidade legível da última importação (report_json do lote).
router.get("/import/quality", async (_req, res, next) => {
  try {
    const last = await prisma.catalog2ImportBatch.findFirst({
      where: { mode: "apply" },
      orderBy: { started_at: "desc" },
      include: { records: { orderBy: { source_index: "asc" } } },
    });
    if (!last) {
      res.json({ has_import: false, message: "Nenhuma importação aplicada ainda. Rode: npm run catalog2:import-products -- --apply" });
      return;
    }
    const report = safeJson<Record<string, unknown>>(last.report_json, {});
    res.json({
      has_import: true,
      batch_id: last.id,
      status: last.status,
      generated_at: last.finished_at,
      report,
      records: last.records.map((r) => ({
        source_index: r.source_index,
        source_name: r.source_name,
        slug: r.slug,
        outcome: r.outcome,
        rose_reviewed: r.rose_reviewed,
        divergences: safeJson(r.divergences_json, []),
        warnings: safeJsonArray(r.warnings_json),
        errors: safeJsonArray(r.errors_json),
      })),
    });
  } catch (e) { next(e); }
});

router.get("/import/batches", async (_req, res, next) => {
  try {
    const batches = await prisma.catalog2ImportBatch.findMany({
      orderBy: { started_at: "desc" },
      take: 50,
      select: {
        id: true, mode: true, status: true, rule_version: true, started_at: true, finished_at: true,
        created_count: true, updated_count: true, unchanged_count: true, divergence_count: true,
        source_main_checksum: true, source_rose_checksum: true,
      },
    });
    res.json({ data: batches });
  } catch (e) { next(e); }
});

// "Origem e revisão" de um produto importado — planilha principal, revisão da
// Rose, campos alterados pela Rose, divergências, referência histórica de
// preço, observações, textos originais preservados, pendências e histórico
// de resoluções. 404 se o produto não veio da importação.
router.get("/products/:id/origin", async (req, res, next) => {
  try {
    const origin = await prisma.catalog2ProductImportOrigin.findUnique({
      where: { product_id: req.params.id as string },
      include: { resolutions: { orderBy: { resolved_at: "desc" } } },
    });
    if (!origin) throw new Catalog2Error("Este produto não foi criado pela importação dos 36.", 404, "not_imported");
    res.json({
      source: { key: origin.source_key, index: origin.source_index, name: origin.source_name },
      rose_reviewed: origin.rose_reviewed,
      area_rose: origin.area_rose,
      review_state: origin.review_state,
      pendencies: safeJsonArray(origin.pendencies_json),
      main_fields: safeJson(origin.main_fields_json, {}),
      rose_fields: safeJson(origin.rose_fields_json, {}),
      rose_changed_fields: Object.keys(safeJson<Record<string, unknown>>(origin.rose_fields_json, {})),
      divergences: safeJson(origin.divergences_json, []),
      original_texts: safeJson(origin.original_texts_json, {}),
      observations: origin.observations,
      historical_price: {
        min: origin.historical_price_min,
        max: origin.historical_price_max,
        note: origin.historical_price_note ?? "Referência histórica da planilha — NÃO é o preço final.",
      },
      human_edited_at: origin.human_edited_at,
      human_edited_by_user_id: origin.human_edited_by_user_id,
      last_import_checksum: origin.last_import_checksum,
      last_import_batch_id: origin.last_import_batch_id,
      resolutions: origin.resolutions.map((r) => ({
        id: r.id,
        pendency_key: r.pendency_key,
        decision: r.decision,
        original_divergence: safeJson(r.original_divergence_json, null),
        resolved_by_user_id: r.resolved_by_user_id,
        resolved_at: r.resolved_at,
      })),
    });
  } catch (e) { handle(e, res, next); }
});

// Resolver UMA pendência: altera só o rascunho/estado de preparo, registra
// quem/quando/decisão e PRESERVA a divergência original no histórico.
router.post("/products/:id/resolve-pendency", async (req, res, next) => {
  try {
    const d = z.object({
      pendency_key: z.string().min(1).max(60),
      decision: z.string().min(1).max(4000),
    }).parse(req.body);
    const origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: req.params.id as string } });
    if (!origin) throw new Catalog2Error("Este produto não foi criado pela importação dos 36.", 404, "not_imported");

    const pendencies = safeJsonArray(origin.pendencies_json);
    if (!pendencies.includes(d.pendency_key)) {
      throw new Catalog2Error("Essa pendência não está aberta para este produto.", 422, "pendency_not_open");
    }
    const remaining = pendencies.filter((p) => p !== d.pendency_key);
    // Snapshot da divergência associada (preservada intacta no histórico).
    const divergences = safeJson<Array<{ type: string; detail: string; decision_pending?: boolean }>>(origin.divergences_json, []);
    const relatedDivergence =
      d.pendency_key === "classification_decision_pending"
        ? divergences.find((x) => x.type === "area_vs_category" || x.type === "ebook_classification") ?? null
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.catalog2ReviewResolution.create({
        data: {
          origin_id: origin.id,
          pendency_key: d.pendency_key,
          decision: d.decision,
          original_divergence_json: relatedDivergence ? JSON.stringify(relatedDivergence) : JSON.stringify(divergences),
          resolved_by_user_id: req.user!.id,
        },
      });
      await tx.catalog2ProductImportOrigin.update({
        where: { id: origin.id },
        data: {
          pendencies_json: JSON.stringify(remaining),
          review_state: reviewStateFromPendencies(remaining),
          // decisão humana registrada → o importador não mexe mais no rascunho.
          human_edited_at: origin.human_edited_at ?? new Date(),
          human_edited_by_user_id: origin.human_edited_by_user_id ?? req.user!.id,
        },
      });
    });
    await audit(req, "import_pendency_resolved", { product_id: req.params.id, pendency_key: d.pendency_key });
    res.json({
      ok: true,
      pendency_key: d.pendency_key,
      remaining_pendencies: remaining,
      review_state: reviewStateFromPendencies(remaining),
    });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// PRONTIDÃO PARA O CATÁLOGO DO CLIENTE (sprint de produtos, bloco 5/6).
// Por produto: conteúdo, classificação, variações, adicionais, tarefas,
// etapas, preço, prazo, portfólio, revisão da Rose e publicação — cada
// item = pronto | pendente | bloqueador | opcional. Os 36 seguem rascunho.
// ═══════════════════════════════════════════════════════════════════════
type ReadinessLevel = "pronto" | "pendente" | "bloqueador" | "opcional";
router.get("/readiness", async (_req, res, next) => {
  try {
    const products = await prisma.catalog2Product.findMany({
      orderBy: { internal_name: "asc" },
      include: {
        pillar: { select: { name: true } },
        category: { select: { name: true } },
        four_f: { select: { four_f_id: true } },
        import_origin: { select: { source_index: true, rose_reviewed: true, pendencies_json: true, review_state: true } },
        versions: {
          orderBy: { version_number: "desc" },
          include: { _count: { select: { variations: true, addons: true, tasks: true } } },
        },
      },
    });

    const rows = [];
    for (const p of products) {
      const draft = p.versions.find((v) => v.state === "rascunho") ?? p.versions[0] ?? null;
      const published = p.versions.find((v) => v.id === p.published_version_id) ?? null;
      const targetVersion = published ?? draft;
      const pend = safeJsonArray(p.import_origin?.pendencies_json);
      const has = (k: string) => pend.includes(k);

      let pricing: Awaited<ReturnType<typeof computePricing>> | null = null;
      if (targetVersion) {
        try {
          pricing = await computePricing(targetVersion.id, await defaultSelection(targetVersion.id));
        } catch {
          pricing = null;
        }
      }

      const items: Record<string, { level: ReadinessLevel; note: string }> = {
        conteudo: has("content_review_pending")
          ? { level: "bloqueador", note: "Revisão de conteúdo pendente (texto preservado da importação)." }
          : { level: "pronto", note: "Conteúdo revisável." },
        classificacao: !p.pillar_id || !p.category_id
          ? { level: "bloqueador", note: "Falta pilar ou categoria." }
          : has("classification_decision_pending")
            ? { level: "bloqueador", note: "Divergência categoria × área aguardando decisão." }
            : { level: "pronto", note: `${p.pillar?.name ?? "—"} / ${p.category?.name ?? "—"} / ${p.four_f.length} 4F` },
        variacoes: (targetVersion?._count.variations ?? 0) > 0
          ? { level: "pronto", note: `${targetVersion?._count.variations} variação(ões).` }
          : { level: "opcional", note: "Sem variações (permitido)." },
        adicionais: (targetVersion?._count.addons ?? 0) > 0
          ? { level: "pronto", note: `${targetVersion?._count.addons} adicional(is).` }
          : { level: "opcional", note: "Sem adicionais (permitido)." },
        tarefas: (targetVersion?._count.tasks ?? 0) > 0
          ? { level: "pronto", note: `${targetVersion?._count.tasks} tarefa(s).` }
          : { level: "pendente", note: "Nenhuma tarefa — não vira operação sem tarefas (bloco 6)." },
        etapas: { level: "opcional", note: "Etapas não são obrigatórias para o catálogo do cliente." },
        preco: pricing?.commercial_ready
          ? { level: "pronto", note: `Preço comercial ${pricing.currency} ${pricing.lines.commercial_final_price.amount}.` }
          : { level: "bloqueador", note: `Preço comercial "A definir": ${pricing?.pending_info.join("; ") || "configuração comercial incompleta"}.` },
        prazo: pricing && !pricing.deadline.commercial_deadline_pending
          ? { level: "pronto", note: `Prazo comercial ${pricing.deadline.commercial_deadline_days} dia(s).` }
          : { level: "bloqueador", note: "Prazo comercial base não definido." },
        portfolio: has("portfolio_pending")
          ? { level: "pendente", note: "Sem material de portfólio (não bloqueia venda, mas empobrece a página)." }
          : { level: "pronto", note: "Portfólio ok / não aplicável." },
        revisao_rose: p.import_origin
          ? p.import_origin.rose_reviewed
            ? { level: "pronto", note: "Revisado pela Rose." }
            : { level: "pendente", note: "Sem revisão da Rose." }
          : { level: "opcional", note: "Produto não veio da importação." },
        publicacao: published
          ? { level: "pronto", note: `v${published.version_number} publicada.` }
          : { level: "bloqueador", note: "Nunca publicado — invisível para o cliente (bloco 5 não publica)." },
      };

      const blockers = Object.entries(items).filter(([, v]) => v.level === "bloqueador").map(([k]) => k);
      const pendings = Object.entries(items).filter(([, v]) => v.level === "pendente").map(([k]) => k);
      rows.push({
        id: p.id,
        slug: p.slug,
        name: p.internal_name,
        source_index: p.import_origin?.source_index ?? null,
        review_state: p.import_origin?.review_state ?? null,
        status: p.status,
        published: !!published,
        client_visible: p.status === "disponivel" && !!published && pend.length === 0 && !!pricing?.commercial_ready,
        items,
        blockers,
        pendings,
        ready_for_client: blockers.length === 0,
      });
    }

    res.json({
      expected: 36,
      total: rows.length,
      ready_for_client: rows.filter((r) => r.ready_for_client).length,
      client_visible_now: rows.filter((r) => r.client_visible).length,
      with_blockers: rows.filter((r) => r.blockers.length > 0).length,
      note: "Os 36 produtos continuam rascunhos neste bloco — nada é publicado aqui.",
      products: rows,
    });
  } catch (e) { next(e); }
});

export default router;
