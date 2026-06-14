import type { AccountType, UserRole } from "@/types/user";

export type CatalogProfileKind =
  | "admin"
  | "agency"
  | "company"
  | "nomad"
  | "partner"
  | "leader";

export interface CatalogIdentity {
  accountType: AccountType;
  role: UserRole | string | null;
  userId: string;
  companyId: string | null;
  agencyId: string | null;
  activeCompanyId: string | null;
  activeAgencyId: string | null;
  scopeId: string;
  kind: CatalogProfileKind;
}

export interface CatalogProjectDestination {
  pathname: string;
  state?: Record<string, unknown>;
}

export interface CatalogProductLike {
  id: string;
  isActive?: boolean;
  contractable?: boolean;
  activeTaskTemplates?: number;
  finalPrice?: number;
  basePrice?: number;
}

function readStoredUser(): Record<string, any> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("allka_user");
    return raw ? (JSON.parse(raw) as Record<string, any>) : null;
  } catch {
    return null;
  }
}

export function resolveCatalogIdentity(accountType: AccountType): CatalogIdentity {
  const user = readStoredUser() || {};
  const role = (user.role ?? null) as UserRole | string | null;
  const userId = String(user.id ?? "anonymous");
  const companyId = user.active_company_id ?? user.company_id ?? null;
  const agencyId = user.active_agency_id ?? user.agency_id ?? null;

  const kind: CatalogProfileKind =
    accountType === "admin" || role === "admin"
      ? "admin"
      : accountType === "agencias" || role === "agency_admin" || role === "agency_user"
        ? "agency"
        : accountType === "empresas" || role === "company_admin" || role === "company_user"
          ? "company"
          : accountType === "nomades" || role === "nomad"
            ? "nomad"
            : accountType === "parceiro" || role === "partner"
              ? "partner"
              : accountType === "lider" || role === "lider"
                ? "leader"
                : "company";

  const scopeId =
    kind === "agency"
      ? String(agencyId || userId)
      : kind === "company"
        ? String(companyId || userId)
        : String(userId);

  return {
    accountType,
    role,
    userId,
    companyId,
    agencyId,
    activeCompanyId: user.active_company_id ?? null,
    activeAgencyId: user.active_agency_id ?? null,
    scopeId,
    kind,
  };
}

export function getCatalogBasketStorageKey(identity: CatalogIdentity): string {
  return ["allka", "cart", identity.kind, identity.scopeId, identity.userId]
    .filter(Boolean)
    .join(".");
}

export function getCatalogProductLimitations(
  product: CatalogProductLike,
  identity: CatalogIdentity,
) {
  if (!product.isActive) {
    return {
      canChoose: false,
      canSeePrice: true,
      canSeeInternalPrice: identity.kind === "admin" || identity.kind === "agency",
      reason: "Produto inativo.",
    };
  }

  if (product.contractable === false || (product.activeTaskTemplates ?? 0) <= 0) {
    return {
      canChoose: false,
      canSeePrice: true,
      canSeeInternalPrice: identity.kind === "admin" || identity.kind === "agency",
      reason: "Este produto ainda não tem tarefas operacionais suficientes para contratação.",
    };
  }

  if (!["admin", "agency", "company"].includes(identity.kind)) {
    return {
      canChoose: false,
      canSeePrice: false,
      canSeeInternalPrice: false,
      reason: "Seu perfil não tem permissão para contratar produtos.",
    };
  }

  const price = Number(product.finalPrice ?? product.basePrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      canChoose: false,
      canSeePrice: identity.kind !== "company" ? true : false,
      canSeeInternalPrice: identity.kind === "admin" || identity.kind === "agency",
      reason: "Este produto está sem preço válido de contratação.",
    };
  }

  return {
    canChoose: true,
    canSeePrice: true,
    canSeeInternalPrice: identity.kind === "admin" || identity.kind === "agency",
    reason: null,
  };
}

export function resolveCatalogProjectDestination(
  identity: CatalogIdentity,
  projectId: string | number | null | undefined,
): CatalogProjectDestination | null {
  if (!projectId) return null;
  const id = String(projectId);

  if (identity.kind === "admin") {
    return { pathname: `/admin/projetos/${id}` };
  }

  if (identity.kind === "agency") {
    return { pathname: `/agency/projetos/${id}` };
  }

  if (identity.kind === "company") {
    return {
      pathname: "/company/projetos",
      state: { openProjectId: id, openProjectTab: "dashboard" },
    };
  }

  if (identity.kind === "partner") {
    return {
      pathname: "/partner/projetos",
      state: { openProjectId: id },
    };
  }

  return null;
}

export function formatCatalogRecurrence(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("mensal")) return "Mensal";
  if (normalized.includes("avulso") || normalized.includes("único")) return "Avulso";
  return value;
}
