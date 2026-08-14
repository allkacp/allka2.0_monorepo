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
