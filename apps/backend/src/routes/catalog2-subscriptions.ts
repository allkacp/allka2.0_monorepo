// Assinatura mensal contínua (Pedido 3, fase 4) — o cliente vê o estado e age; a administração vê tudo.
import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { Catalog2Error } from "../lib/catalog2-service";
import {
  cancelSubscription, issueNextInvoice, payOpenInvoice, pauseSubscription, resumeSubscription, runSubscriptionsTick, serializeSubscription,
} from "../lib/catalog2-subscriptions";

const router = Router();
router.use(verifyToken);

async function ownedSub(req: import("express").Request, id: string) {
  const sub = await prisma.catalog2Subscription.findUnique({ where: { id } });
  if (!sub) return null;
  if (isAdminUser(req.user!)) return sub;
  const project = await prisma.project.findUnique({ where: { id: sub.project_id } });
  if (!project || !(await projectVisibleToUser(prisma, req.user!, project))) return null;
  return sub;
}

router.get("/", async (req, res, next) => {
  try {
    const all = await prisma.catalog2Subscription.findMany({ orderBy: { created_at: "desc" }, take: 300, include: { project_product: { select: { product_name_snapshot: true } }, } });
    const out = [];
    for (const s of all) {
      if (!isAdminUser(req.user!)) {
        const project = await prisma.project.findUnique({ where: { id: s.project_id } });
        if (!project || !(await projectVisibleToUser(prisma, req.user!, project))) continue;
      }
      out.push({ ...serializeSubscription(s), product_name: s.project_product.product_name_snapshot });
    }
    res.json({ data: out });
  } catch (e) { next(e); }
});

router.get("/by-product/:projectProductId", async (req, res, next) => {
  try {
    const sub = await prisma.catalog2Subscription.findUnique({ where: { project_product_id: req.params.projectProductId as string } });
    const owned = sub ? await ownedSub(req, sub.id) : null;
    if (!owned) { res.status(404).json({ error: "Assinatura não encontrada." }); return; }
    const events = await prisma.catalog2SubscriptionEvent.findMany({ where: { subscription_id: owned.id }, orderBy: { created_at: "desc" }, take: 50, select: { from_status: true, to_status: true, reason: true, created_at: true } });
    res.json(serializeSubscription(owned, events));
  } catch (e) { next(e); }
});

const actionSchema = z.object({ reason: z.string().max(1000).optional(), card_last_digits: z.string().regex(/^\d{4}$/).optional() });
for (const action of ["pause", "resume", "cancel", "pay", "issue-invoice"] as const) {
  router.post(`/:id/${action}`, async (req, res, next) => {
    try {
      const sub = await ownedSub(req, req.params.id as string);
      if (!sub) { res.status(404).json({ error: "Assinatura não encontrada." }); return; }
      const body = actionSchema.parse(req.body ?? {});
      const actor = req.user!.id;
      if (action === "issue-invoice") {
        if (!isAdminUser(req.user!)) { res.status(403).json({ error: "Só a administração emite fatura manualmente." }); return; }
        res.json(await issueNextInvoice(sub.id, actor));
        return;
      }
      if (action === "pay") { res.json(await payOpenInvoice(sub.id, { cardLastDigits: body.card_last_digits, actor })); return; }
      const fn = action === "pause" ? pauseSubscription : action === "resume" ? resumeSubscription : cancelSubscription;
      res.json(serializeSubscription(await fn(sub.id, actor, body.reason)));
    } catch (e) {
      if (e instanceof Catalog2Error) { res.status(e.httpStatus).json({ error: e.message, code: e.code }); return; }
      next(e);
    }
  });
}

router.post("/run-tick", async (req, res, next) => {
  try {
    if (!isAdminUser(req.user!)) { res.status(403).json({ error: "Acesso negado." }); return; }
    res.json(await runSubscriptionsTick());
  } catch (e) { next(e); }
});

export default router;
