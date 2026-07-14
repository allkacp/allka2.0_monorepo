// ─── Report access control & scope resolution ─────────────────────────────────
// This module is the single gatekeeper for all report/indicator requests.
// It:
//  1. Checks whether the authenticated user can access a given report_key.
//  2. Resolves what data scope (entities) the user is allowed to see.
//  3. Returns a 403-ready error object — never silently allows access.

import { prisma } from "../../lib/prisma";
import { resolveMyPartnerId } from "../../lib/project-scope";
import type { JwtPayload } from "../../middleware/auth";
import type { ResolvedScope } from "./types";

// ─── Permission result ────────────────────────────────────────────────────────

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  can_export: boolean;
  can_change_filters: boolean;
  data_scope: string;
  only_related_data: boolean;
}

// ─── JSON field helper ────────────────────────────────────────────────────────

function parseJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ─── checkReportAccess ───────────────────────────────────────────────────────
// Returns allowed=true with capabilities, or allowed=false with reason.
// Admin always has full access to every report.

export async function checkReportAccess(
  user: JwtPayload,
  reportKey: string,
): Promise<AccessCheckResult> {
  const isAdmin = user.role === "admin" || user.account_type === "admin";

  const config = await prisma.reportConfig.findUnique({
    where: { report_key: reportKey },
  });

  // If admin, grant full access regardless of config
  if (isAdmin) {
    return {
      allowed: true,
      can_export: config?.can_export ?? true,
      can_change_filters: config?.can_change_filters ?? true,
      data_scope: config?.data_scope ?? "GLOBAL",
      only_related_data: config?.only_related_data ?? false,
    };
  }

  // No config means report is not yet configured — deny non-admins
  if (!config) {
    return {
      allowed: false,
      reason: `Relatório '${reportKey}' não está configurado. Contate o administrador.`,
      can_export: false,
      can_change_filters: false,
      data_scope: "GLOBAL",
      only_related_data: true,
    };
  }

  // Report is inactive
  if (!config.is_active) {
    return {
      allowed: false,
      reason: `Relatório '${reportKey}' está desativado.`,
      can_export: false,
      can_change_filters: false,
      data_scope: config.data_scope,
      only_related_data: true,
    };
  }

  const blockedUserIds = parseJson(config.blocked_user_ids);
  const allowedUserIds = parseJson(config.allowed_user_ids);
  const allowedAccountTypes = parseJson(config.allowed_account_types);
  const allowedRoles = parseJson(config.allowed_roles);

  // Explicit block wins over everything
  if (blockedUserIds.includes(user.id)) {
    return {
      allowed: false,
      reason: "Seu usuário está bloqueado para este relatório.",
      can_export: false,
      can_change_filters: false,
      data_scope: config.data_scope,
      only_related_data: true,
    };
  }

  // Explicit user-level allow
  if (allowedUserIds.length > 0 && allowedUserIds.includes(user.id)) {
    return {
      allowed: true,
      can_export: config.can_export,
      can_change_filters: config.can_change_filters,
      data_scope: config.data_scope,
      only_related_data: config.only_related_data,
    };
  }

  // Match by account_type or role
  const byType = allowedAccountTypes.length > 0 && allowedAccountTypes.includes(user.account_type);
  const byRole = allowedRoles.length > 0 && allowedRoles.includes(user.role);

  if (byType || byRole) {
    return {
      allowed: true,
      can_export: config.can_export,
      can_change_filters: config.can_change_filters,
      data_scope: config.data_scope,
      only_related_data: config.only_related_data,
    };
  }

  return {
    allowed: false,
    reason:
      "Seu perfil não tem permissão para acessar este relatório. Contate o administrador.",
    can_export: false,
    can_change_filters: false,
    data_scope: config.data_scope,
    only_related_data: true,
  };
}

// ─── resolveUserScope ────────────────────────────────────────────────────────
// Determines what entities (agencies, companies, nomad IDs, etc.) a user
// is allowed to see based on their account_type and DB relationships.
// Admin always resolves to GLOBAL.

export async function resolveUserScope(user: JwtPayload): Promise<ResolvedScope> {
  if (user.role === "admin" || user.account_type === "admin") {
    return { type: "GLOBAL" };
  }

  // ── Agency ────────────────────────────────────────────────────────────────
  if (user.account_type === "agencias") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { agency_id: true, agency_link: { select: { name: true } } },
    });
    if (!dbUser?.agency_id || !dbUser.agency_link) {
      return { type: "OWN_AGENCY_SCOPE", agencyIds: [], agencyNames: [] };
    }
    return {
      type: "OWN_AGENCY_SCOPE",
      agencyIds: [dbUser.agency_id],
      agencyNames: [dbUser.agency_link.name],
    };
  }

  // ── Company ───────────────────────────────────────────────────────────────
  if (user.account_type === "empresas") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true },
    });
    return {
      type: "OWN_COMPANY_SCOPE",
      companyIds: dbUser?.company_id ? [dbUser.company_id] : [],
    };
  }

  // ── Nomad / Leader ────────────────────────────────────────────────────────
  if (user.account_type === "nomades") {
    const nomade = await prisma.nomade.findUnique({
      where: { user_id: user.id },
      select: { id: true, is_leader: true },
    });
    if (!nomade) return { type: "OWN_NOMAD_SCOPE", nomadeId: undefined };

    if (nomade.is_leader) {
      return {
        type: "OWN_LEADER_SCOPE",
        nomadeId: nomade.id,
        leaderUserId: user.id,
      };
    }
    return { type: "OWN_NOMAD_SCOPE", nomadeId: nomade.id };
  }

  // ── Partner / Embaixadora ─────────────────────────────────────────────────
  if (user.account_type === "parceiro") {
    const partnerId = await resolveMyPartnerId(prisma, user.id);
    if (!partnerId) return { type: "OWN_PARTNER_SCOPE", agencyIds: [], agencyNames: [] };

    const partner = await prisma.partnerProfile.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        led_agencies: {
          where: { status: "active" },
          select: { agency_id: true, agency: { select: { name: true } } },
        },
      },
    });
    if (!partner) return { type: "OWN_PARTNER_SCOPE", agencyIds: [], agencyNames: [] };

    return {
      type: "OWN_PARTNER_SCOPE",
      partnerProfileId: partner.id,
      agencyIds: partner.led_agencies.map((l) => l.agency_id),
      agencyNames: partner.led_agencies.map((l) => l.agency.name),
    };
  }

  return { type: "OWN_PROFILE_SCOPE" };
}

// ─── buildAgencyScopeFilter ──────────────────────────────────────────────────
// Builds the Prisma WHERE clause fragment for agency-scoped Project queries.
// Critical: Project.agency is a plain string, not a FK to Agency.id.

export function buildAgencyScopeFilter(
  scope: ResolvedScope,
): { agency?: { in: string[] } } | Record<string, never> {
  if (scope.type === "GLOBAL") return {};
  if (
    (scope.type === "OWN_AGENCY_SCOPE" || scope.type === "OWN_PARTNER_SCOPE") &&
    scope.agencyNames?.length
  ) {
    return { agency: { in: scope.agencyNames } };
  }
  return {};
}
