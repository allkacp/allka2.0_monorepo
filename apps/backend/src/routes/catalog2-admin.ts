// API da fundação do NOVO catálogo (sprint de produtos, bloco 2/6).
//
// SOMENTE Admin Master (a mesma classificação oficial usada em Legacy).
// Mínima e segura: listar classificações e produtos, abrir um produto e sua
// estrutura, e o mínimo de escrita para provar a arquitetura + os testes
// (criar produto, nova versão, publicar, editar rascunho). NÃO é o editor
// visual completo — isso é o bloco 3.

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { CATALOG2_STATUS_MEANING } from "../lib/catalog2-foundation";
import {
  Catalog2Error,
  assertVersionEditable,
  createProduct,
  getProductDetail,
  newDraftVersion,
  publishVersion,
  setProductStatus,
} from "../lib/catalog2-service";

const router = Router();

async function guardAdminMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        admin_profile: {
          select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } },
        },
      },
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
  next(err);
}

// ── Classificações ─────────────────────────────────────────────────────
router.get("/pillars", async (_req, res, next) => {
  try {
    res.json({ data: await prisma.catalog2Pillar.findMany({ orderBy: { sort_order: "asc" } }) });
  } catch (err) {
    next(err);
  }
});
router.get("/four-f", async (_req, res, next) => {
  try {
    res.json({ data: await prisma.catalog2FourF.findMany({ orderBy: { sort_order: "asc" } }) });
  } catch (err) {
    next(err);
  }
});
router.get("/categories", async (_req, res, next) => {
  try {
    res.json({ data: await prisma.catalog2Category.findMany({ orderBy: { sort_order: "asc" } }) });
  } catch (err) {
    next(err);
  }
});
router.get("/specialties", async (_req, res, next) => {
  try {
    res.json({ data: await prisma.catalog2Specialty.findMany({ orderBy: { sort_order: "asc" } }) });
  } catch (err) {
    next(err);
  }
});

// ── Visão geral (tela de validação) ────────────────────────────────────
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
      counts: {
        products: products, // SÓ o novo catálogo — nunca os 162 atuais
        pillars,
        four_f: fourF,
        categories,
        specialties,
        draft_versions: draftCount,
      },
      products_by_status: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      status_meaning: CATALOG2_STATUS_MEANING,
      is_empty: products === 0,
      empty_message: "O novo catálogo está preparado. Os 36 produtos serão importados em um próximo bloco.",
    });
  } catch (err) {
    next(err);
  }
});

// ── Produtos ───────────────────────────────────────────────────────────
router.get("/products", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await prisma.catalog2Product.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: "desc" },
      include: {
        pillar: { select: { key: true, name: true } },
        category: { select: { key: true, name: true } },
        four_f: { include: { four_f: { select: { key: true, name: true } } } },
        _count: { select: { versions: true } },
        versions: { select: { id: true, version_number: true, state: true, published_at: true } },
      },
    });
    res.json({
      data: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        internal_name: p.internal_name,
        status: p.status,
        origin: p.origin,
        pillar: p.pillar,
        category: p.category,
        four_f: p.four_f.map((l) => l.four_f.key).sort(),
        version_count: p._count.versions,
        published_version_id: p.published_version_id,
        draft_count: p.versions.filter((v) => v.state === "rascunho").length,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    res.json(await getProductDetail(req.params.id as string));
  } catch (err) {
    handle(err, res, next);
  }
});

// ── Escrita mínima (provar arquitetura / testes) ───────────────────────
const createSchema = z.object({
  internal_name: z.string().min(1).max(200),
  pillar_id: z.string().nullish(),
  category_id: z.string().nullish(),
  origin: z.enum(["existente", "novo", "reativado"]).nullish(),
  four_f_ids: z.array(z.string()).max(4).optional(),
  version_title: z.string().max(200).optional(),
});

router.post("/products", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const product = await createProduct(parsed.data, req.user!.id);
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.product_created",
      after: { module: "catalog2", id: product.id, internal_name: product.internal_name },
    });
    res.status(201).json(await getProductDetail(product.id));
  } catch (err) {
    handle(err, res, next);
  }
});

router.patch("/products/:id/status", async (req, res, next) => {
  try {
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    const updated = await setProductStatus(req.params.id as string, status);
    res.json({ ok: true, status: updated.status });
  } catch (err) {
    handle(err, res, next);
  }
});

router.post("/products/:id/versions", async (req, res, next) => {
  try {
    const version = await newDraftVersion(req.params.id as string, req.user!.id);
    res.status(201).json({ ok: true, version_id: version.id, version_number: version.version_number, state: version.state });
  } catch (err) {
    handle(err, res, next);
  }
});

const editVersionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(4000).nullish(),
  full_description: z.string().max(20000).nullish(),
});

router.put("/versions/:id", async (req, res, next) => {
  try {
    const version = await prisma.catalog2ProductVersion.findUnique({ where: { id: req.params.id as string } });
    if (!version) {
      res.status(404).json({ error: "Versão não encontrada" });
      return;
    }
    // Regra de negócio: versão publicada é IMUTÁVEL.
    assertVersionEditable(version);
    const parsed = editVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const updated = await prisma.catalog2ProductVersion.update({
      where: { id: version.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.summary !== undefined ? { summary: parsed.data.summary } : {}),
        ...(parsed.data.full_description !== undefined ? { full_description: parsed.data.full_description } : {}),
      },
    });
    res.json({ ok: true, version_id: updated.id });
  } catch (err) {
    handle(err, res, next);
  }
});

router.post("/versions/:id/publish", async (req, res, next) => {
  try {
    const published = await publishVersion(req.params.id as string, req.user!.id);
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.version_published",
      after: { module: "catalog2", version_id: published.id, product_id: published.product_id, version_number: published.version_number },
    });
    res.json({ ok: true, version_id: published.id, published_at: published.published_at });
  } catch (err) {
    handle(err, res, next);
  }
});

export default router;
