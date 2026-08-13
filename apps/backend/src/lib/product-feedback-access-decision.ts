/**
 * The one canonical function that decides whether a given Allka user can
 * use the "Ajuda e sugestões" product-feedback feature. Every place that
 * needs this answer — GET /api/product-feedback/access, POST/GET
 * work-items, the admin "simulate" endpoint — calls this same function.
 * Never re-implement this logic inline in a route handler.
 *
 * This decision belongs to Allka (it knows the real user, their role,
 * their active/status flags, and the admin-configured groups/overrides).
 * A previous, now-removed copy of similar logic lived in the Roadmap
 * repo (apps/backend/src/lib/product-feedback-access.ts) — wrong side of
 * the architecture, and its group tie-break was order-dependent (used
 * Array.sort, which is stable, so a tie between two same-priority groups
 * silently resolved to "whichever the database happened to return first"
 * instead of the deterministic rule below).
 *
 * Order of evaluation:
 *   1. not authenticated -> deny
 *   2. user missing/inactive/status != "ativo" -> deny
 *   3. technical config invalid (no valid HMAC secret/key configured) -> deny
 *   4. global product config disabled -> deny
 *   5. individual override active and not expired -> its effect wins
 *   6. active, non-expired group memberships -> highest priority wins;
 *      on a tie, DENY wins, regardless of the order groups were passed in
 *   7. no applicable rule -> the default policy
 */

export type ProductFeedbackDecisionEffect = "ALLOW" | "DENY";
export type ProductFeedbackDefaultPolicy = "ALLOW_ALL_ACTIVE" | "DENY_ALL_EXCEPT_ALLOWED";

export type ProductFeedbackUserLike = {
  id: string;
  isActive: boolean;
  status: string;
};

export type ProductFeedbackConfigLike = {
  enabled: boolean;
  defaultPolicy: ProductFeedbackDefaultPolicy;
  technicallyConfigured: boolean;
};

export type ProductFeedbackGroupLike = {
  id: string;
  effect: ProductFeedbackDecisionEffect;
  priority: number;
  active: boolean;
  expiresAt: Date | string | null;
};

export type ProductFeedbackOverrideLike = {
  effect: "INHERIT" | "ALLOW" | "DENY";
  active: boolean;
  expiresAt: Date | string | null;
} | null | undefined;

export type ProductFeedbackDecisionSource =
  | "not_authenticated"
  | "user_inactive"
  | "tech_disabled"
  | "global_disabled"
  | "override"
  | "group"
  | "default_policy";

export type ProductFeedbackDecisionResult = {
  canUse: boolean;
  /** Internal-only, for the audit trail — never shown to a common user. */
  reason: string;
  source: ProductFeedbackDecisionSource;
};

function isExpired(expiresAt: Date | string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return t.getTime() <= now.getTime();
}

/**
 * Deterministic, order-independent winner between two active groups of
 * possibly-equal priority. Symmetric: pickGroupWinner(a, b) and
 * pickGroupWinner(b, a) always agree on the resulting .effect.
 */
function pickGroupWinner(
  a: ProductFeedbackGroupLike,
  b: ProductFeedbackGroupLike,
): ProductFeedbackGroupLike {
  if (a.priority !== b.priority) return a.priority > b.priority ? a : b;
  if (a.effect === "DENY") return a;
  if (b.effect === "DENY") return b;
  return a;
}

export function decideProductFeedbackAccess(input: {
  authenticated: boolean;
  user: ProductFeedbackUserLike | null;
  config: ProductFeedbackConfigLike;
  memberGroups: ProductFeedbackGroupLike[];
  override?: ProductFeedbackOverrideLike;
  now?: Date;
}): ProductFeedbackDecisionResult {
  const now = input.now ?? new Date();

  if (!input.authenticated || !input.user) {
    return { canUse: false, reason: "not_authenticated", source: "not_authenticated" };
  }

  const user = input.user;
  if (!user.isActive || user.status !== "ativo") {
    return { canUse: false, reason: "user_inactive_or_suspended", source: "user_inactive" };
  }

  if (!input.config.technicallyConfigured) {
    return { canUse: false, reason: "integration_not_configured", source: "tech_disabled" };
  }

  if (!input.config.enabled) {
    return { canUse: false, reason: "global_config_disabled", source: "global_disabled" };
  }

  const override = input.override;
  if (
    override &&
    override.active &&
    override.effect !== "INHERIT" &&
    !isExpired(override.expiresAt, now)
  ) {
    const allow = override.effect === "ALLOW";
    return {
      canUse: allow,
      reason: allow ? "user_override_allow" : "user_override_deny",
      source: "override",
    };
  }

  const activeGroups = input.memberGroups.filter(
    (group) => group.active && !isExpired(group.expiresAt, now),
  );
  if (activeGroups.length > 0) {
    const winner = activeGroups.reduce(pickGroupWinner);
    const allow = winner.effect === "ALLOW";
    return {
      canUse: allow,
      reason: allow ? "group_allow" : "group_deny",
      source: "group",
    };
  }

  const allow = input.config.defaultPolicy === "ALLOW_ALL_ACTIVE";
  return {
    canUse: allow,
    reason: allow ? "default_allow_all" : "default_deny_all",
    source: "default_policy",
  };
}
