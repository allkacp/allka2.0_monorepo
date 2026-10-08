// P-11: o cliente consulta o preço de uma alteração por IA e a confirma (grátis ou debitada do saldo da carteira).
import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { resolveClientContext } from "../lib/catalog2-client";
import { AiChargeError, chargeAiChange, quoteAiChange } from "../lib/ai-change-charge";

const router = Router();
router.use(verifyToken);

const bodySchema = z.object({ project_product_id: z.string().min(1).max(191), feature: z.string().min(2).max(60).optional(), note: z.string().max(500).nullish() });

async function accountOf(req: { user?: { id: string; account_type: string; role: string } }) {
  const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);
  if (ctx.account_kind !== "company" && ctx.account_kind !== "agency") throw new AiChargeError("Disponível apenas para empresas e agências.", 403, "not_client");
  return { ctx, account: { kind: ctx.account_kind as "company" | "agency", id: ctx.account_id } };
}

router.post("/quote", async (req, res, next) => {
  try {
    const d = bodySchema.parse(req.body ?? {});
    const { account } = await accountOf(req as never);
    res.json(await quoteAiChange(d.project_product_id, account));
  } catch (e) { fail(e, res, next); }
});

router.post("/charge", async (req, res, next) => {
  try {
    const d = bodySchema.parse(req.body ?? {});
    const { ctx, account } = await accountOf(req as never);
    if (!ctx.can_contract) throw new AiChargeError("Seu perfil não pode pedir alterações cobradas.", 403, "cannot_contract");
    res.status(201).json(await chargeAiChange({ projectProductId: d.project_product_id, account, userId: ctx.user_id, feature: d.feature ?? "alteracao-ia", note: d.note }));
  } catch (e) { fail(e, res, next); }
});

function fail(e: unknown, res: import("express").Response, next: import("express").NextFunction) {
  if (e instanceof AiChargeError) { res.status(e.httpStatus).json({ error: e.message, code: e.code, ...(e.details ? { details: e.details } : {}) }); return; }
  next(e);
}

export default router;
