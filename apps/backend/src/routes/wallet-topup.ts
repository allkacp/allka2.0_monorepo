// Recarga de crédito da carteira pelo cliente (empresa/agência): cartão e Pix via gateway configurado (hoje o fake de teste).
import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { resolveClientContext } from "../lib/catalog2-client";
import { TopupError, confirmPixSandbox, createPix, intentStatusFor, startHostedTopup, topupByCard, walletSummary } from "../lib/wallet-topup";

const router = Router();
router.use(verifyToken);

async function ctxOf(req: { user?: { id: string; account_type: string; role: string } }) {
  const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);
  if (ctx.account_kind !== "company" && ctx.account_kind !== "agency") throw new TopupError("Disponível apenas para empresas e agências.", 403, "not_client");
  return { ctx, account: { kind: ctx.account_kind as "company" | "agency", id: ctx.account_id } };
}
function guardPay(ctx: { can_contract: boolean }) {
  if (!ctx.can_contract) throw new TopupError("Seu perfil não pode adicionar crédito.", 403, "cannot_pay");
}
function fail(e: unknown, res: import("express").Response, next: import("express").NextFunction) {
  if (e instanceof TopupError) { res.status(e.httpStatus).json({ error: e.message, code: e.code }); return; }
  next(e);
}

router.get("/summary", async (req, res, next) => {
  try { const { account } = await ctxOf(req as never); res.json(await walletSummary(account)); } catch (e) { fail(e, res, next); }
});

const cardSchema = z.object({ amount: z.number(), card_number: z.string().min(12).max(23), holder: z.string().max(120).optional() });
router.post("/card", async (req, res, next) => {
  try {
    const d = cardSchema.parse(req.body ?? {});
    const { ctx, account } = await ctxOf(req as never); guardPay(ctx);
    const digits = d.card_number.replace(/\D/g, "");
    res.status(201).json(await topupByCard({ account, userId: ctx.user_id, amount: d.amount, cardLastDigits: digits.slice(-4), cardHolder: d.holder }));
  } catch (e) { fail(e, res, next); }
});

router.post("/pix", async (req, res, next) => {
  try {
    const d = z.object({ amount: z.number() }).parse(req.body ?? {});
    const { ctx } = await ctxOf(req as never); guardPay(ctx);
    res.status(201).json(await createPix({ amount: d.amount }));
  } catch (e) { fail(e, res, next); }
});

router.post("/pix/confirm-sandbox", async (req, res, next) => {
  try {
    const d = z.object({ transaction_id: z.string().min(5).max(120) }).parse(req.body ?? {});
    const { ctx, account } = await ctxOf(req as never); guardPay(ctx);
    res.status(201).json(await confirmPixSandbox({ account, userId: ctx.user_id, transactionId: d.transaction_id }));
  } catch (e) { fail(e, res, next); }
});

router.post("/start", async (req, res, next) => {
  try {
    const d = z.object({ amount: z.number(), method: z.enum(["pix", "card"]) }).parse(req.body ?? {});
    const { ctx, account } = await ctxOf(req as never); guardPay(ctx);
    const i = await startHostedTopup({ account, userId: ctx.user_id, amount: d.amount, method: d.method });
    res.status(201).json({ id: i.id, status: i.status, method: i.method, amount_brl: i.amount, pix_copy_paste: i.pix_copy_paste, redirect_url: i.redirect_url, expires_at: i.expires_at });
  } catch (e) { fail(e, res, next); }
});

router.get("/intents/:id", async (req, res, next) => {
  try { const { account } = await ctxOf(req as never); res.json(await intentStatusFor(String(req.params.id), account)); } catch (e) { fail(e, res, next); }
});

export default router;
