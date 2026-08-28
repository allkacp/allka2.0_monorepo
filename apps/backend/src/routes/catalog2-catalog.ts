// API do CATÁLOGO DO CLIENTE do catalog2 (sprint de produtos, bloco 5/6).
//
// Rotas em /api/catalog2/* — autenticadas. A permissão (ver/configurar/
// contratar) e a conta contratante são resolvidas pelo servidor a partir do
// usuário real, nunca por nome de papel enviado pelo cliente.
//
// NÃO cria compra, pagamento, projeto nem tarefa. NÃO publica os 36 rascunhos.

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { Catalog2Error } from "../lib/catalog2-service";
import {
  resolveClientContext,
  listClientProducts,
  getClientProduct,
  configureProduct,
  createQuote,
  listQuotes,
  getQuote,
  revalidateQuote,
  cancelQuote,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../lib/catalog2-client";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(verifyToken);

// Contexto do cliente em toda requisição.
async function withCtx(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);
    if (!ctx.can_view) {
      res.status(404).json({ error: "Não encontrado" });
      return;
    }
    (req as Request & { clientCtx: Awaited<ReturnType<typeof resolveClientContext>> }).clientCtx = ctx;
    next();
  } catch (e) {
    next(e);
  }
}
router.use(withCtx);
function ctxOf(req: Request) {
  return (req as Request & { clientCtx: Awaited<ReturnType<typeof resolveClientContext>> }).clientCtx;
}

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof Catalog2Error) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}

// Preview de rascunho só se o cliente CONSEGUE (Admin Master) — nunca por URL.
function wantsPreview(req: Request): boolean {
  return (req.query.preview === "1" || req.query.preview === "true") && ctxOf(req).can_preview_drafts;
}

// ── Referências para os filtros (só as usadas pelo cliente) ──────────────
router.get("/refs", async (_req, res, next) => {
  try {
    const [pillars, categories, fourF] = await Promise.all([
      prisma.catalog2Pillar.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, key: true, name: true } }),
      prisma.catalog2Category.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, key: true, name: true } }),
      prisma.catalog2FourF.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, key: true, name: true } }),
    ]);
    res.json({ pillars, categories, four_f: fourF });
  } catch (e) {
    next(e);
  }
});

// ── Listagem ────────────────────────────────────────────────────────────
router.get("/products", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : undefined;
    const data = await listClientProducts(ctxOf(req), {
      q,
      pillar_id: str(req.query.pillar_id),
      category_id: str(req.query.category_id),
      four_f_id: str(req.query.four_f_id),
      sort: str(req.query.sort),
      page: Number(req.query.page) || 1,
      page_size: Number(req.query.page_size) || 20,
    });
    res.json(data);
  } catch (e) {
    handle(e, res, next);
  }
});

// ── Detalhe ─────────────────────────────────────────────────────────────
router.get("/products/:slug", async (req, res, next) => {
  try {
    res.json(await getClientProduct(ctxOf(req), req.params.slug as string, { preview: wantsPreview(req) }));
  } catch (e) {
    handle(e, res, next);
  }
});

// ── Configurar / recalcular ─────────────────────────────────────────────
const selectionSchema = z.object({
  variation_option_keys: z.array(z.string()).optional(),
  addon_keys: z.array(z.string()).optional(),
  quantity: z.number().int().positive().max(100000).optional(),
  answers: z.record(z.string()).optional(),
});
router.post("/products/:slug/configure", async (req, res, next) => {
  try {
    const sel = selectionSchema.parse(req.body ?? {});
    res.json(await configureProduct(ctxOf(req), req.params.slug as string, sel, { preview: wantsPreview(req) }));
  } catch (e) {
    handle(e, res, next);
  }
});

// ── Pré-cotação ─────────────────────────────────────────────────────────
router.get("/quotes", async (req, res, next) => {
  try {
    res.json({ data: await listQuotes(ctxOf(req)) });
  } catch (e) {
    handle(e, res, next);
  }
});
router.post("/quotes", async (req, res, next) => {
  try {
    const body = z.object({ product: z.string().min(1), selection: selectionSchema }).parse(req.body);
    res.status(201).json(await createQuote(ctxOf(req), body.product, body.selection));
  } catch (e) {
    handle(e, res, next);
  }
});
router.get("/quotes/:id", async (req, res, next) => {
  try {
    res.json(await getQuote(ctxOf(req), req.params.id as string));
  } catch (e) {
    handle(e, res, next);
  }
});
router.post("/quotes/:id/revalidate", async (req, res, next) => {
  try {
    res.json(await revalidateQuote(ctxOf(req), req.params.id as string));
  } catch (e) {
    handle(e, res, next);
  }
});
router.post("/quotes/:id/cancel", async (req, res, next) => {
  try {
    res.json(await cancelQuote(ctxOf(req), req.params.id as string));
  } catch (e) {
    handle(e, res, next);
  }
});

// ── Cesta ───────────────────────────────────────────────────────────────
router.get("/cart", async (req, res, next) => {
  try {
    res.json(await getCart(ctxOf(req)));
  } catch (e) {
    handle(e, res, next);
  }
});
router.post("/cart/items", async (req, res, next) => {
  try {
    const body = z.object({ product: z.string().min(1), selection: selectionSchema }).parse(req.body);
    res.status(201).json(await addToCart(ctxOf(req), body.product, body.selection));
  } catch (e) {
    handle(e, res, next);
  }
});
router.put("/cart/items/:id", async (req, res, next) => {
  try {
    const sel = selectionSchema.parse(req.body ?? {});
    res.json(await updateCartItem(ctxOf(req), req.params.id as string, sel));
  } catch (e) {
    handle(e, res, next);
  }
});
router.delete("/cart/items/:id", async (req, res, next) => {
  try {
    res.json(await removeCartItem(ctxOf(req), req.params.id as string));
  } catch (e) {
    handle(e, res, next);
  }
});
router.post("/cart/clear", async (req, res, next) => {
  try {
    res.json(await clearCart(ctxOf(req)));
  } catch (e) {
    handle(e, res, next);
  }
});

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export default router;
