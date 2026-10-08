// Pagamentos (Admin Master): escolher o gateway ativo, guardar as chaves no cofre, testar a conexão e ver o histórico de trocas.
// Trocar o gateway ativo exige a SENHA do próprio Admin Master (de novo), mesmo já estando logado.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireAdminMaster } from "../middleware/auth";
import { GatewayConfigError, activateGateway, gatewayHistory, listGateways, saveGatewayConfig, testGateway } from "../lib/payment-gateways/config-service";

const router = Router();
router.use(verifyToken, requireAdminMaster);

function fail(e: unknown, res: import("express").Response, next: import("express").NextFunction) {
  if (e instanceof GatewayConfigError) { res.status(e.httpStatus).json({ error: e.message, code: e.code }); return; }
  next(e);
}

router.get("/", async (_req, res, next) => { try { res.json(await listGateways()); } catch (e) { fail(e, res, next); } });
router.get("/history", async (_req, res, next) => { try { res.json({ data: await gatewayHistory() }); } catch (e) { fail(e, res, next); } });

const saveSchema = z.object({
  mode: z.enum(["sandbox", "live"]),
  secrets: z.record(z.string(), z.string().max(4000)).default({}),
  values: z.record(z.string(), z.string().max(1000)).default({}),
  fee_note: z.string().max(1000).nullish(),
});
router.put("/:key", async (req, res, next) => {
  try {
    const d = saveSchema.parse(req.body ?? {});
    await saveGatewayConfig({ key: String(req.params.key), mode: d.mode, secrets: d.secrets, values: d.values, feeNote: d.fee_note, actor: req.user!.id });
    res.json(await listGateways());
  } catch (e) { fail(e, res, next); }
});

router.post("/:key/test", async (req, res, next) => { try { res.json(await testGateway(String(req.params.key))); } catch (e) { fail(e, res, next); } });

router.post("/:key/activate", async (req, res, next) => {
  try {
    const d = z.object({ password: z.string().min(1), note: z.string().max(500).optional() }).parse(req.body ?? {});
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { password_hash: true } });
    if (!me || !(await bcrypt.compare(d.password, me.password_hash))) { res.status(403).json({ error: "Senha incorreta.", code: "wrong_password" }); return; }
    await activateGateway({ key: String(req.params.key), actor: req.user!.id, note: d.note });
    res.json(await listGateways());
  } catch (e) { fail(e, res, next); }
});

export default router;
