import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Extraído de src/routes/projects.ts para ser reutilizável tanto pelas rotas
 * de projeto quanto por project-tasks.ts e pelo serviço de confirmação de
 * pagamento (que roda dentro de uma transação e por isso não pode usar o
 * PrismaClient global — todo helper aqui recebe o client como parâmetro).
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

// ─── Resolução de escopo por vínculo de membro ──────────────────────────────
// Fonte da verdade pra "qual organização este usuário enxerga" é sempre
// User.agency_id / User.partner_id (vínculo de membro, preenchido tanto pro
// usuário principal quanto por futuros subusuários) — nunca a relação de
// propriedade (Agency/PartnerProfile.owner_user_id, exposta via
// User.owned_agency/owned_partner). Propriedade define quem é o
// administrador principal; vínculo de membro define quem enxerga os dados.
export async function resolveMyAgencyId(db: DbClient, userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { agency_id: true } });
  return user?.agency_id ?? null;
}

export async function resolveMyPartnerId(db: DbClient, userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { partner_id: true } });
  return user?.partner_id ?? null;
}

export type ProjectScope =
  | { kind: "admin" }
  | { kind: "open" }
  | { kind: "agency"; agencyName: string }
  | { kind: "agency_unlinked" }
  | { kind: "company"; companyId: string }
  | { kind: "company_unlinked" }
  | { kind: "partner"; companyIds: string[] }
  | { kind: "partner_unlinked" };

export async function getProjectScope(
  db: DbClient,
  userId: string,
  accountType: string,
): Promise<ProjectScope> {
  if (accountType === "admin") return { kind: "admin" };

  if (accountType === "agencias") {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { agency_link: { select: { name: true } } },
    });
    const agencyName = user?.agency_link?.name;
    if (!agencyName) return { kind: "agency_unlinked" };
    return { kind: "agency", agencyName };
  }

  if (accountType === "empresas") {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!user?.company_id) return { kind: "company_unlinked" };
    return { kind: "company", companyId: user.company_id };
  }

  if (accountType === "parceiro") {
    const partnerId = await resolveMyPartnerId(db, userId);
    if (!partnerId) return { kind: "partner_unlinked" };
    const profile = await db.partnerProfile.findUnique({
      where: { id: partnerId },
      select: { referred_companies: { select: { id: true } } },
    });
    const companyIds = profile?.referred_companies?.map((c) => c.id) ?? [];
    if (companyIds.length === 0) return { kind: "partner_unlinked" };
    return { kind: "partner", companyIds };
  }

  return { kind: "open" };
}

export function scopeToWhere(scope: ProjectScope): Record<string, unknown> | null {
  if (
    scope.kind === "company_unlinked" ||
    scope.kind === "agency_unlinked" ||
    scope.kind === "partner_unlinked"
  )
    return null;
  if (scope.kind === "agency") return { agency: scope.agencyName };
  if (scope.kind === "company") return { client_id: scope.companyId };
  if (scope.kind === "partner") return { client_id: { in: scope.companyIds } };
  return {};
}

export function projectInScope(
  scope: ProjectScope,
  project: { agency: string | null; client_id: string | null },
): boolean {
  if (scope.kind === "admin" || scope.kind === "open") return true;
  if (
    scope.kind === "company_unlinked" ||
    scope.kind === "agency_unlinked" ||
    scope.kind === "partner_unlinked"
  )
    return false;
  if (scope.kind === "agency") return project.agency === scope.agencyName;
  if (scope.kind === "company") return project.client_id === scope.companyId;
  if (scope.kind === "partner")
    return scope.companyIds.includes(project.client_id ?? "");
  return false;
}

// ─── New structured scope (agency_id/company_id/partner_id) ────────────────
// Roda em paralelo ao escopo legado acima. Projetos antigos (sem esses 3
// campos) continuam visíveis só pelo escopo legado; projetos novos passam a
// usar isto também. No máximo um dos três é preenchido por projeto (regra
// aplicada em código, não em constraint de banco — mesmo padrão do ClientLink).
export function isAdminUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "admin" || user?.account_type === "admin";
}
export function isLeaderUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "lider" || user?.account_type === "lider";
}

export type NewProjectScope =
  | { kind: "agency"; agencyId: string }
  | { kind: "company"; companyId: string }
  | { kind: "partner"; partnerId: string }
  | { kind: "none" };

export async function resolveProjectNewScope(
  db: DbClient,
  userId: string,
  accountType: string,
): Promise<NewProjectScope> {
  if (accountType === "agencias") {
    const agencyId = await resolveMyAgencyId(db, userId);
    return agencyId ? { kind: "agency", agencyId } : { kind: "none" };
  }
  if (accountType === "empresas") {
    const user = await db.user.findUnique({ where: { id: userId }, select: { company_id: true } });
    return user?.company_id ? { kind: "company", companyId: user.company_id } : { kind: "none" };
  }
  if (accountType === "parceiro") {
    const partnerId = await resolveMyPartnerId(db, userId);
    return partnerId ? { kind: "partner", partnerId } : { kind: "none" };
  }
  return { kind: "none" };
}

export function newScopeToWhere(scope: NewProjectScope): Record<string, unknown> | null {
  if (scope.kind === "agency") return { agency_id: scope.agencyId };
  if (scope.kind === "company") return { company_id: scope.companyId };
  if (scope.kind === "partner") return { partner_id: scope.partnerId };
  return null;
}

// Visibilidade combinada (legado OR novo) pra endpoints de projeto único
// (GET/:id, PUT/:id, /:id/files, /:id/credentials, confirmação de pagamento).
export async function projectVisibleToUser(
  db: DbClient,
  user: { id: string; account_type?: string; role?: string },
  project: {
    agency: string | null;
    client_id: string | null;
    agency_id?: string | null;
    company_id?: string | null;
    partner_id?: string | null;
  },
): Promise<boolean> {
  const scope = await getProjectScope(db, user.id, user.account_type ?? "");
  if (projectInScope(scope, project)) return true;
  const newScope = await resolveProjectNewScope(db, user.id, user.account_type ?? "");
  if (newScope.kind === "agency") return project.agency_id === newScope.agencyId;
  if (newScope.kind === "company") return project.company_id === newScope.companyId;
  if (newScope.kind === "partner") return project.partner_id === newScope.partnerId;
  return false;
}

// Combina escopo legado + novo num único where pra usar em Project.findMany
// (GET /api/projects) ou aninhado em { project: { ... } } (GET /api/project-tasks).
export async function combinedProjectWhere(
  db: DbClient,
  userId: string,
  accountType: string,
): Promise<{ where: Record<string, unknown> | null; scope: ProjectScope }> {
  const scope = await getProjectScope(db, userId, accountType);
  if (scope.kind === "admin" || scope.kind === "open") {
    return { where: {}, scope };
  }
  const scopeWhere = scopeToWhere(scope);
  const newScope = await resolveProjectNewScope(db, userId, accountType);
  const newWhere = newScopeToWhere(newScope);
  if (scopeWhere === null && newWhere === null) return { where: null, scope };
  const orConditions = [scopeWhere, newWhere].filter(
    (w): w is Record<string, unknown> => w !== null,
  );
  return {
    where: orConditions.length > 1 ? { OR: orConditions } : orConditions[0],
    scope,
  };
}
