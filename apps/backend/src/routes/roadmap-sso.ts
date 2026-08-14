import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { verifyToken, requireRoadmapSsoAccess } from "../middleware/auth";
import { isRoadmapTechnicallyConfigured, startRoadmapSso, RoadmapClientError } from "../lib/roadmap-client";
import { config } from "../config";
import { writeAccessAudit } from "../lib/product-feedback-service";

// The Allka -> Roadmap SSO handoff, gated ONLY by the real granular
// permission (module "sistema" OR "central_chamados") — deliberately NOT
// nested under product-feedback-admin.ts's requireAdminWithAudit. That
// router requires role==="admin" for every route in it; this feature must
// not, since a founder can grant "central_chamados" to a non-admin account
// (a developer or QA reviewer) and this is the one place that grant is
// actually exercised.
//
// requireRoadmapSsoAccess() (not the generic requireAnyPermission()) is
// used here on purpose: "sistema" keeps its legacy "no profile = full
// access" grandfather, but ONLY for account_type "admin" — that assumption
// never applied to any other account_type. "central_chamados" never
// grandfathers at all, for any account_type. Without this split, opening
// this route to every account_type would also silently let every
// empresas/agencias/nomades/lider account through by default, since none
// of them have ever been assigned a profile. See middleware/auth.ts's
// evaluateRoadmapSsoAccess() for the full rule + rationale.
const router = Router();

router.use(verifyToken);

const roadmapSsoGuard = requireRoadmapSsoAccess;

// ── GET /roadmap-sso/base-url ───────────────────────────────────────────────
// Lets the frontend navigate a freshly-opened tab to the Roadmap's public
// origin BEFORE requesting a token, so the browser's Basic Auth prompt (if
// any) is resolved first — see hooks/use-open-roadmap-panel.ts. Never a
// secret, just the same public URL already exposed to admins via
// product-feedback-admin.ts's /config.
router.get("/roadmap-sso/base-url", roadmapSsoGuard, (_req: Request, res: Response) => {
  if (!config.ROADMAP_INTERNAL_URL) {
    res.status(409).json({ error: "URL do painel interno da Roadmap não configurada." });
    return;
  }
  res.json({ roadmapInternalUrl: config.ROADMAP_INTERNAL_URL.replace(/\/$/, "") });
});

// ── POST /roadmap-sso/start ──────────────────────────────────────────────────
// One-click login bridge: the caller is already an authenticated Allka user
// with the right permission; this asks the Roadmap to mint a short-lived,
// single-use token tied to this user's own email, then hands back a URL
// that logs them into the Roadmap without retyping credentials — but only
// if a matching, active, staff-role Roadmap account already exists with
// that same email. Never creates or promotes anything on either side.
router.post("/roadmap-sso/start", roadmapSsoGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.ROADMAP_INTERNAL_URL || !isRoadmapTechnicallyConfigured()) {
      res.status(503).json({ error: "A integração com a Roadmap não está disponível agora. Tente novamente." });
      return;
    }
    const { ssoToken } = await startRoadmapSso(req.user!.email);
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "roadmap_sso.started",
      reason: "Login único iniciado para abrir o painel interno da Roadmap",
    });
    const base = config.ROADMAP_INTERNAL_URL.replace(/\/$/, "");
    res.json({ redirectUrl: `${base}/sso/consume?token=${encodeURIComponent(ssoToken)}` });
  } catch (err) {
    if (err instanceof RoadmapClientError) {
      res.status(err.status === 404 ? 404 : 503).json({
        error: "Não foi possível abrir a Central de roadmap e chamados. Tente novamente.",
      });
      return;
    }
    next(err);
  }
});

export default router;
