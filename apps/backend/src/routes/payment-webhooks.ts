// Aviso automático dos gateways ("o Pix foi pago"). Sem login: a autenticidade é conferida pela assinatura de cada gateway (parseWebhook).
import { Router } from "express";
import { adapterFor } from "../lib/payment-gateways/config-service";
import { settleIntent } from "../lib/wallet-topup";

const router = Router();

router.post("/:key", async (req, res) => {
  try {
    const key = String(req.params.key);
    const adapter = await adapterFor(key).catch(() => null);
    if (!adapter?.parseWebhook) { res.status(404).json({ error: "Gateway não configurado." }); return; }
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    const ev = adapter.parseWebhook({ headers: req.headers as Record<string, unknown>, rawBody: raw, body: req.body });
    if (!ev) { res.status(401).json({ error: "Assinatura inválida." }); return; }
    await settleIntent(ev.referenceId ? { id: ev.referenceId } : { gateway: key, externalId: ev.externalId }, ev.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[payment-webhooks]", (e as Error).message);
    res.status(500).json({ error: "Falha ao processar o aviso." }); // o gateway tenta de novo
  }
});

export default router;
