import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
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
import { PathnameSchema } from "../lib/roadmap-integration-contract";
import { hashPayload } from "../lib/canonical-json";

const router = Router();

router.use(verifyToken);

function currentEnvironment(): "production" | "qa" | "local" {
  // Explicit only — never NODE_ENV. config.ts already refuses to boot with
  // PRODUCT_FEEDBACK_ENABLED=true and no PRODUCT_FEEDBACK_ENVIRONMENT, so
  // reaching this route (behind resolveProductFeedbackAccess's technical-
  // config check) guarantees it's set; this is just type narrowing.
  if (!config.PRODUCT_FEEDBACK_ENVIRONMENT) {
    throw new Error("PRODUCT_FEEDBACK_ENVIRONMENT não configurado — a integração não deveria estar habilitada.");
  }
  return config.PRODUCT_FEEDBACK_ENVIRONMENT;
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
    res.json({ enabled: decision.configEnabled, canUse: decision.canUse });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/product-feedback/work-items ───────────────────────────────────
// Deliberately narrow schema: no identity, cookie, token, password,
// arbitrary environment, full URL, querystring, fragment, or internal
// Roadmap field can ever come from the browser — identity, workspace
// context, and environment are always derived server-side below. Reuses
// the exact same PathnameSchema the contract (and the Roadmap's own route)
// validate against, so there is one definition of "safe pathname", not two
// that could quietly drift apart.

const createSchema = z
  .object({
    // Generated once by the frontend when the form is opened for a NEW
    // ticket, and reused as-is across every retry of that same submit
    // attempt (network timeout, page still open, user clicks "Enviar"
    // again) — never regenerated per HTTP call. This is what makes the
    // idempotency ledger below actually idempotent: reusing this same
    // value as the Roadmap's own idempotencyKey means a retry can never
    // create a second ticket, no matter which side timed out.
    clientSubmissionId: z.string().uuid(),
    type: z.enum(["PROBLEM", "IDEA", "IMPROVEMENT"]),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(3).max(5000),
    pathname: PathnameSchema,
    pageTitle: z.string().trim().max(200).optional(),
    steps: z.string().trim().max(2000).optional(),
    expectedResult: z.string().trim().max(1000).optional(),
    actualResult: z.string().trim().max(1000).optional(),
    impact: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * The one canonical idempotency flow for ticket creation. Persists a
 * "pending" local ledger row (protocol still null) BEFORE calling the
 * Roadmap, so a crash/timeout between the Roadmap call succeeding and the
 * local write finishing leaves behind a resumable row instead of an
 * orphaned Roadmap ticket with no local record. A retry with the same
 * clientSubmissionId always finds and continues from that same row.
 */
async function createWorkItemIdempotently(
  userId: string,
  body: z.infer<typeof createSchema>,
): Promise<{ status: 200 | 201; protocol: string } | { status: 409; conflict: true }> {
  const payloadForHash = {
    type: body.type,
    title: body.title,
    description: body.description,
    pathname: body.pathname,
    pageTitle: body.pageTitle ?? null,
    steps: body.steps ?? null,
    expectedResult: body.expectedResult ?? null,
    actualResult: body.actualResult ?? null,
    impact: body.impact ?? null,
  };
  const payloadHash = hashPayload(payloadForHash);

  async function resolveExistingLink() {
    return prisma.productFeedbackWorkItemLink.findUnique({
      where: { idempotency_key: body.clientSubmissionId },
    });
  }

  let link = await resolveExistingLink();

  if (link && link.user_id !== userId) {
    // A clientSubmissionId is only ever meant to be used by the user who
    // generated it — this should be geometrically impossible (UUIDv4
    // collision) rather than a real contention path, but never trust a
    // cross-user match blindly.
    throw new Error("clientSubmissionId pertence a outro usuário.");
  }

  if (link && link.payload_hash !== payloadHash) {
    return { status: 409, conflict: true };
  }

  if (link && link.protocol) {
    // Fast path: already completed, no need to call the Roadmap again.
    return { status: 200, protocol: link.protocol };
  }

  if (!link) {
    try {
      link = await prisma.productFeedbackWorkItemLink.create({
        data: {
          user_id: userId,
          protocol: null,
          payload_hash: payloadHash,
          correlation_id: crypto.randomUUID(),
          idempotency_key: body.clientSubmissionId,
          type: body.type,
          title: body.title,
        },
      });
    } catch (error) {
      // Concurrency safety: two near-simultaneous requests with the same
      // clientSubmissionId (double-click, duplicate tab) race on the
      // idempotency_key unique constraint — the loser re-reads the
      // winner's row instead of erroring out.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        link = await resolveExistingLink();
        if (!link) throw error;
        if (link.payload_hash !== payloadHash) {
          return { status: 409, conflict: true };
        }
        if (link.protocol) {
          return { status: 200, protocol: link.protocol };
        }
      } else {
        throw error;
      }
    }
  }

  const identity = await buildIdentity(userId);
  const { protocol } = await createRoadmapWorkItem({
    idempotencyKey: body.clientSubmissionId,
    correlationId: link.correlation_id,
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

  await prisma.productFeedbackWorkItemLink.update({
    where: { id: link.id },
    data: { protocol, cached_status: "RECEIVED", cached_updated_at: new Date() },
  });

  return { status: 201, protocol };
}

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

    const result = await createWorkItemIdempotently(req.user!.id, parsed.data);
    if ("conflict" in result) {
      res.status(409).json({ error: "Este envio já foi processado com dados diferentes. Abra um novo chamado." });
      return;
    }

    res.status(result.status).json({ protocol: result.protocol });
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
    if (!link || !link.protocol) {
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
