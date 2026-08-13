import { prisma } from "./prisma";
import { isRoadmapTechnicallyConfigured } from "./roadmap-client";
import {
  decideProductFeedbackAccess,
  type ProductFeedbackDecisionResult,
  type ProductFeedbackDefaultPolicy,
} from "./product-feedback-access-decision";

// Singleton row — this product has exactly one global configuration, never
// a list of them. Fixed id instead of a generic settings table because the
// read side (decideProductFeedbackAccess) has its own specific shape.
const SINGLETON_CONFIG_ID = "singleton";

export async function getOrCreateAccessConfig() {
  const existing = await prisma.productFeedbackAccessConfig.findUnique({
    where: { id: SINGLETON_CONFIG_ID },
  });
  if (existing) return existing;
  return prisma.productFeedbackAccessConfig.create({
    data: { id: SINGLETON_CONFIG_ID, enabled: true, default_policy: "ALLOW_ALL_ACTIVE" },
  });
}

/**
 * The one place that assembles the inputs for decideProductFeedbackAccess
 * from the database. Every route that needs an access answer — the user's
 * own GET /access, ticket creation, ticket listing, and the admin
 * simulate endpoint — calls this, never decideProductFeedbackAccess
 * directly with hand-built inputs. Keeps the "creating/listing must
 * re-run the check even if the frontend already showed the button"
 * requirement from silently drifting out of sync across routes.
 */
export async function resolveProductFeedbackAccess(
  userId: string | null,
): Promise<ProductFeedbackDecisionResult> {
  const now = new Date();
  const accessConfig = await getOrCreateAccessConfig();
  const baseConfig = {
    enabled: accessConfig.enabled,
    defaultPolicy: accessConfig.default_policy as ProductFeedbackDefaultPolicy,
    technicallyConfigured: isRoadmapTechnicallyConfigured(),
  };

  if (!userId) {
    return decideProductFeedbackAccess({
      authenticated: false,
      user: null,
      config: baseConfig,
      memberGroups: [],
      now,
    });
  }

  const [user, override, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true, status: true },
    }),
    prisma.productFeedbackUserOverride.findUnique({ where: { user_id: userId } }),
    prisma.productFeedbackAccessGroupMember.findMany({
      where: { user_id: userId, group: { active: true, archived_at: null } },
      include: { group: true },
    }),
  ]);

  return decideProductFeedbackAccess({
    authenticated: true,
    user: user ? { id: user.id, isActive: user.is_active, status: user.status } : null,
    config: baseConfig,
    memberGroups: memberships.map((m) => ({
      id: m.group.id,
      effect: m.group.effect as "ALLOW" | "DENY",
      priority: m.group.priority,
      active: m.group.active,
      expiresAt: m.group.expires_at,
    })),
    override: override
      ? {
          effect: override.effect as "INHERIT" | "ALLOW" | "DENY",
          active: override.active,
          expiresAt: override.expires_at,
        }
      : undefined,
    now,
  });
}

export async function writeAccessAudit(input: {
  actorId: string | null;
  targetUserId?: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  await prisma.productFeedbackAccessAudit.create({
    data: {
      actor_id: input.actorId,
      target_user_id: input.targetUserId ?? null,
      action: input.action,
      before_json: input.before !== undefined ? JSON.stringify(input.before) : null,
      after_json: input.after !== undefined ? JSON.stringify(input.after) : null,
      reason: input.reason ?? null,
    },
  });
}
