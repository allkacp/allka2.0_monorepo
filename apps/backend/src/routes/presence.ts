import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { clearPresence, isOnline, onlineSince, PRESENCE_HEARTBEAT_MS, PRESENCE_OFFLINE_AFTER_MS, recordHeartbeat } from "../lib/presence-service";

const router = Router();
router.use(verifyToken);

// ── Presença online (ata 2026-08, bloco 4/5) ────────────────────────────
// Identidade SEMPRE da sessão — nunca do corpo. Uma conta não atualiza a
// presença de outra. Conta inativa não fica online.

// POST /api/presence/heartbeat — chamado periodicamente pelo frontend.
router.post("/heartbeat", async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { is_active: true } });
    if (!me?.is_active) {
      // conta bloqueada/inativa nunca fica online
      await clearPresence(prisma, req.user!.id);
      res.status(403).json({ error: "Conta inativa." });
      return;
    }
    await recordHeartbeat(prisma, req.user!.id);
    res.json({
      ok: true,
      heartbeat_ms: PRESENCE_HEARTBEAT_MS,
      offline_after_ms: PRESENCE_OFFLINE_AFTER_MS,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/presence/offline — logout encerra a presença imediatamente.
router.post("/offline", async (req, res, next) => {
  try {
    await clearPresence(prisma, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/presence/me — situação da própria presença (nunca de terceiros).
router.get("/me", async (req, res, next) => {
  try {
    const row = await prisma.userPresence.findUnique({ where: { user_id: req.user!.id } });
    res.json({
      online: isOnline(row?.last_seen_at ?? null),
      last_seen_at: row?.last_seen_at ?? null,
      online_since: onlineSince(),
      heartbeat_ms: PRESENCE_HEARTBEAT_MS,
      offline_after_ms: PRESENCE_OFFLINE_AFTER_MS,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
