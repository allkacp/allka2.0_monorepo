import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { verifyToken } from "../middleware/auth";
import { resolveProductFeedbackAccess } from "../lib/product-feedback-service";
import {
  createRoadmapWorkItem,
  getRoadmapWorkItem,
  listRoadmapWorkItems,
  RoadmapClientError,
  type RoadmapIdentity,
} from "../lib/roadmap-client";

const router = Router();

router.use(verifyToken);

function currentEnvironment(): "production" | "qa" | "local" {
  return config.NODE_ENV === "production" ? "production" : "local";
}

async function buildIdentity(userId: string): Promise<RoadmapIdentity> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, user_code: true, company_id: true, agency_id: true, account_type: true },
  });
  return {
    externalUserId: userId,
    displayName: user?.name || undefined,
    userCode: user?.user_code || undefined,
    externalWorkspaceContext: {
      companyId: user?.company_id || undefined,
      agencyId: user?.agency_id || undefined,
      portal: user?.account_type || undefined,
    },
  };
}

function friendlyRoadmapError(res: Response, error: unknown) {
  if (error instanceof RoadmapClientError) {
    if (error.code === "NOT_CONFIGURED") {
      return res.status(503).json({ error: "O envio de chamados está temporariamente indisponível." });
    }
    if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") {
      return res.status(503).json({ error: "Não foi possível falar com o serviço de chamados agora. Tente novamente em instantes." });
    }
    if (error.upstreamCode === "RATE_LIMITED") {
      return res.status(429).json({ error: "Muitas tentativas em pouco tempo. Aguarde um instante." });
    }
    if (error.upstreamCode === "IDEMPOTENCY_CONFLICT") {
      return res.status(409).json({ error: "Este envio já foi processado com dados diferentes." });
    }
    return res.status(502).json({ error: "Não foi possível concluir a operação no serviço de chamados." });
  }
  return res.status(500).json({ error: "Erro inesperado." });
}

// ── GET /api/product-feedback/access ────────────────────────────────────────
// Common user never sees the internal reason/source — only the yes/no the
// frontend uses to show or hide the "Ajuda e sugestões" button.

router.get("/access", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await resolveProductFeedbackAccess(req.user!.id);
    res.json({ canUse: decision.canUse });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/product-feedback/work-items ───────────────────────────────────
// Deliberately narrow schema: no identity, cookie, token, password,
// arbitrary environment, full URL, querystring, fragment, or internal
// Roadmap field can ever come from the browser — identity, workspace
// context, and environment are always derived server-side below.

const sanitizedPathnameSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((v) => v.startsWith("/") && !v.includes("?") && !v.includes("#"), {
    message: "pathname deve ser um caminho relativo, sem querystring ou fragmento",
  });

const createSchema = z
  .object({
    type: z.enum(["PROBLEM", "IDEA", "IMPROVEMENT"]),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(3).max(5000),
    pathname: sanitizedPathnameSchema,
    pageTitle: z.string().trim().max(200).optional(),
    steps: z.string().trim().max(2000).optional(),
    expectedResult: z.string().trim().max(1000).optional(),
    actualResult: z.string().trim().max(1000).optional(),
    impact: z.string().trim().max(1000).optional(),
  })
  .strict();

router.post("/work-items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await resolveProductFeedbackAccess(req.user!.id);
    if (!decision.canUse) {
      res.status(403).json({ error: "Você não tem acesso a este recurso." });
      return;
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;

    const identity = await buildIdentity(req.user!.id);
    const idempotencyKey = crypto.randomUUID();
    const correlationId = crypto.randomUUID();

    const { protocol } = await createRoadmapWorkItem({
      idempotencyKey,
      correlationId,
      type: body.type,
      title: body.title,
      description: body.description,
      identity,
      page: {
        pathname: body.pathname,
        pageTitle: body.pageTitle,
        environment: currentEnvironment(),
      },
      steps: body.steps,
      expectedResult: body.expectedResult,
      actualResult: body.actualResult,
      impact: body.impact,
    });

    await prisma.productFeedbackWorkItemLink.create({
      data: {
        user_id: req.user!.id,
        protocol,
        correlation_id: correlationId,
        idempotency_key: idempotencyKey,
        type: body.type,
        title: body.title,
        cached_status: "RECEIVED",
        cached_updated_at: new Date(),
      },
    });

    res.status(201).json({ protocol });
  } catch (err) {
    if (err instanceof RoadmapClientError) {
      friendlyRoadmapError(res, err);
      return;
    }
    next(err);
  }
});

// ── GET /api/product-feedback/work-items ────────────────────────────────────

router.get("/work-items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await resolveProductFeedbackAccess(req.user!.id);
    if (!decision.canUse) {
      res.status(403).json({ error: "Você não tem acesso a este recurso." });
      return;
    }

    const identity = await buildIdentity(req.user!.id);
    const result = await listRoadmapWorkItems(identity, { limit: 100 });

    // Keep the local cache (protocol/title/last known status) in sync —
    // best-effort, never blocks the response to the user.
    await Promise.all(
      result.items.map((item) =>
        prisma.productFeedbackWorkItemLink
          .updateMany({
            where: { user_id: req.user!.id, protocol: item.protocol },
            data: { cached_status: item.status, cached_updated_at: new Date(item.updatedAt) },
          })
          .catch(() => undefined),
      ),
    );

    res.json({ items: result.items });
  } catch (err) {
    if (err instanceof RoadmapClientError) {
      friendlyRoadmapError(res, err);
      return;
    }
    next(err);
  }
});

// ── GET /api/product-feedback/work-items/:protocol ──────────────────────────

router.get("/work-items/:protocol", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decision = await resolveProductFeedbackAccess(req.user!.id);
    if (!decision.canUse) {
      res.status(403).json({ error: "Você não tem acesso a este recurso." });
      return;
    }

    // Only ever look up a protocol that belongs to this user's own local
    // link — never trust a client-supplied protocol to query the Roadmap
    // for a ticket that isn't provably this user's.
    const link = await prisma.productFeedbackWorkItemLink.findFirst({
      where: { user_id: req.user!.id, protocol: req.params.protocol as string },
    });
    if (!link) {
      res.status(404).json({ error: "Chamado não encontrado." });
      return;
    }

    const identity = await buildIdentity(req.user!.id);
    const item = await getRoadmapWorkItem(link.protocol, identity);
    if (!item) {
      res.status(404).json({ error: "Chamado não encontrado." });
      return;
    }

    res.json({ item });
  } catch (err) {
    if (err instanceof RoadmapClientError) {
      friendlyRoadmapError(res, err);
      return;
    }
    next(err);
  }
});

export default router;
