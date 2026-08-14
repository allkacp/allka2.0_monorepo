export type AdminProfileLike = {
  is_active?: boolean;
  is_master?: boolean;
  permissions?: { module: string; action: string }[];
} | null | undefined;

/**
 * Mirrors the backend's requirePermission() rule exactly (see
 * apps/backend/src/middleware/auth.ts): no profile assigned, or an inactive
 * profile, or is_master → full legacy access; otherwise the profile must
 * have the specific (module, action) pair. This is only ever a UI signal —
 * every route this gates also re-checks it server-side, which stays the
 * real authority.
 */
export function hasAdminModulePermission(
  profile: AdminProfileLike,
  module: string,
  action: string,
): boolean {
  const semControleGranular = !profile || profile.is_active === false || profile.is_master === true;
  if (semControleGranular) return true;
  return (profile.permissions ?? []).some((p) => p.module === module && p.action === action);
}

/**
 * Mirrors the backend's evaluateRoadmapSsoAccess() exactly (see
 * apps/backend/src/middleware/auth.ts) — deliberately NOT the same rule as
 * hasAdminModulePermission()'s generic "no profile = full access"
 * grandfather:
 *
 * - "sistema" keeps its legacy grandfather, but ONLY for accountType
 *   "admin" — that assumption never applied to any other account type.
 * - "central_chamados" is brand new and never grandfathers, for any
 *   account type, including "admin".
 *
 * Without this split, showing the sidebar item to every account type would
 * also silently show it to every empresas/agencias/nomades/lider account
 * that has never been assigned a profile — i.e. everyone. This is only
 * ever a UI signal — POST .../product-feedback/roadmap-sso/start re-checks
 * the identical rule server-side, which stays the real authority.
 */
export function canOpenRoadmapPanel(accountType: string, profile: AdminProfileLike): boolean {
  if (accountType === "admin") {
    if (!profile || profile.is_active === false || profile.is_master === true) return true;
    if ((profile.permissions ?? []).some((p) => p.module === "sistema" && p.action === "view")) return true;
  }
  if (!profile || profile.is_active === false) return false;
  if (profile.is_master === true) return true;
  return (profile.permissions ?? []).some((p) => p.module === "central_chamados" && p.action === "view");
}
