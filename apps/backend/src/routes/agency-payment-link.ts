import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { verifyAgencyPaymentLink, roundMoney } from "../lib/agency-checkout";
import { confirmPaymentAndGenerateProjectTasks, PaymentValidationError, withIdempotentRetry } from "../lib/confirm-payment";
import { getPaymentGateway } from "../lib/payment-gateway";
import { resolveClientContext } from "../lib/catalog2-client";

const router = Router();
// Link é uma capacidade assinada: não autentica usuário, não expõe projeto,
// preço de custo, comissão, acessos ou informações internas da agência.
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); res.set("Referrer-Policy", "no-referrer"); next(); });
router.get("/:token", async (req, res, next) => {
  try {
    const order = await verifyAgencyPaymentLink(req.params.token as string);
    res.json({ code: order.project_code, total: roundMoney(order.products.reduce((s, p) => s + p.preco_final_cliente_snapshot, 0)),
      items: order.products.map((p) => ({ name: p.catalog2_version?.title || p.product_name_snapshot, total: p.preco_final_cliente_snapshot,
        modality: p.catalog2_period || "avulso" })),
      paid: order.payments.length > 0, sandbox: config.NODE_ENV !== "production" && getPaymentGateway().name === "FAKE_SANDBOX" });
  } catch (e) { if (e instanceof PaymentValidationError) { res.status(e.statusCode).json({ error: e.message }); return; } next(e); }
});
router.post("/:token/pay-sandbox", async (req, res, next) => {
  try {
    if (config.NODE_ENV === "production" || getPaymentGateway().name !== "FAKE_SANDBOX") {
      res.status(403).json({ error: "Simulação disponível apenas no ambiente local de testes. Pagamento real ainda não está habilitado neste fluxo." }); return;
    }
    const { card_last_digits } = z.object({ card_last_digits: z.enum(["4242", "0002", "0069", "0127"]) }).parse(req.body);
    const order = await verifyAgencyPaymentLink(req.params.token as string);
    const quote = await prisma.catalog2Quote.findUnique({ where: { id: order.products[0].origin_catalog2_quote_id! }, select: { user_id: true } });
    const actor = await prisma.user.findFirst({ where: { id: quote?.user_id ?? "", is_active: true, status: "ativo" } });
    if (!actor) throw new PaymentValidationError("Agência indisponível. Solicite um novo pedido.", 409);
    const ctx = await resolveClientContext(actor.id, actor.account_type, actor.role);
    if (!ctx.can_contract || ctx.account_kind !== "agency" || ctx.account_id !== order.agency_id) throw new PaymentValidationError("Agência indisponível. Solicite um novo pedido.", 409);
    const result = await withIdempotentRetry(() => prisma.$transaction((tx) => confirmPaymentAndGenerateProjectTasks(tx, {
      projectId: order.id, requesterUser: actor, agencyClientLink: true, paymentMethod: "CARTAO_TESTE",
      cardLastDigits: card_last_digits, cardHolder: "CLIENTE — TESTE LOCAL", notes: "Link do cliente final — pagamento sandbox, sem cobrança real.",
    })));
    if (result.declined) { res.status(402).json({ error: result.declineReason }); return; }
    res.json({ paid: true, code: order.project_code, message: "Pagamento de teste confirmado. A agência já pode preparar o lançamento das tarefas." });
  } catch (e) { if (e instanceof PaymentValidationError) { res.status(e.statusCode).json({ error: e.message }); return; } next(e); }
});
export default router;
