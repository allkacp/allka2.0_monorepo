// API do CONSTRUTOR do novo catálogo (sprint de produtos, bloco 3/6).
//
// SOMENTE Admin Master (mesma classificação oficial usada em Legacy; 404 para
// os demais). Toda decisão — inclusive preço e prazo — é revalidada no
// servidor. Versão publicada é imutável por qualquer chamada direta.

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
router.use(verifyToken, guardAdminMaster);

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

async function audit(req: Request, action: string, after: Record<string, unknown>) {
  await writeAccessAudit({ actorId: req.user!.id, action: `catalog2.${action}`, after: { module: "catalog2", ...after } }).catch(() => {});
}

// Carrega uma versão e garante que é RASCUNHO editável.
async function editableVersionOrThrow(versionId: string) {
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId } });
  if (!v) throw new Catalog2Error("Versão não encontrada.", 404);
  if (v.state === "publicada") {
    throw new Catalog2Error("Versão publicada é imutável. Crie uma nova versão.", 409, "version_published_immutable");
  }
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const orderBy = SORTS[String(req.query.sort ?? "name")] ?? SORTS.name;

    const where: Prisma.Catalog2ProductWhereInput = {};
    if (status) where.status = status;
    if (pillar) where.pillar_id = pillar;
    if (category) where.category_id = category;
    if (q) where.OR = [{ internal_name: { contains: q } }, { slug: { contains: q } }];

    const [total, rows] = await Promise.all([
      prisma.catalog2Product.count({ where }),
      prisma.catalog2Product.findMany({
        where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
        include: {
          pillar: { select: { key: true, name: true } },
          category: { select: { key: true, name: true } },
          versions: { select: { id: true, version_number: true, state: true, published_at: true, updated_at: true } },
        },
      }),
    ]);
    const NEW_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    res.json({
      data: rows.map((p) => {
        const pub = p.versions.find((v) => v.id === p.published_version_id) ?? null;
        return {
          id: p.id,
          internal_name: p.internal_name,
          slug: p.slug,
          pillar: p.pillar,
          category: p.category,
          status: p.status,
          published_version_number: pub?.version_number ?? null,
          published_at: pub?.published_at ?? null,
          has_draft: p.versions.some((v) => v.state === "rascunho"),
          is_new: !!pub?.published_at && now - new Date(pub.published_at).getTime() <= NEW_MS,
          updated_at: p.updated_at,
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
      price: pricing.lines.final_price.amount,
      price_pending: pricing.pricing_pending,
      currency: pricing.currency,
      default_selection: sel,
    });
  } catch (e) { handle(e, res, next); }
});

export default router;
