import type { Prisma, PrismaClient } from "@prisma/client";
import {
  isAdminUser,
  isLeaderUser,
  projectVisibleToUser,
  resolveMyAgencyId,
  type DbClient,
} from "./project-scope";

// ─── Escopo hierárquico da memória (Projeto > Company > Agência) ───────────
// Nada aqui monta prompt, chama IA ou resolve conflito entre níveis — isso é
// bloco 2. Este módulo só decide "quem pode ver/editar a memória de QUAL
// escopo", reaproveitando o sistema oficial de vínculos (project-scope.ts) —
// nunca comparação de papel por string solta fora daqui.

export const MEMORY_SCOPE_TYPES = ["project", "company", "agency"] as const;
export type MemoryScopeType = (typeof MEMORY_SCOPE_TYPES)[number];

export function isMemoryScopeType(value: string): value is MemoryScopeType {
  return (MEMORY_SCOPE_TYPES as readonly string[]).includes(value);
}

type AuthUser = { id: string; account_type?: string; role?: string };

const PROJECT_VISIBILITY_SELECT = {
  id: true,
  agency: true,
  client_id: true,
  agency_id: true,
  company_id: true,
  partner_id: true,
} satisfies Prisma.ProjectSelect;

/**
 * Resolve se a ENTIDADE de escopo existe (project/company/agency com esse
 * id). Usado tanto pra 404 (não existe) quanto como base pras checagens de
 * visibilidade/edição abaixo.
 */
async function scopeEntityExists(db: DbClient, scopeType: MemoryScopeType, scopeId: string): Promise<boolean> {
  if (scopeType === "project") return Boolean(await db.project.findUnique({ where: { id: scopeId }, select: { id: true } }));
  if (scopeType === "company") return Boolean(await db.company.findUnique({ where: { id: scopeId }, select: { id: true } }));
  return Boolean(await db.agency.findUnique({ where: { id: scopeId }, select: { id: true } }));
}

/**
 * Visibilidade (leitura). Nômade/Líder passam por aqui normalmente SE a
 * auditoria de vínculo real permitir (ex.: projeto onde têm tarefa) — nunca
 * ganham nada além do que já enxergariam pelo sistema de vínculos oficial.
 */
export async function canViewMemory(db: DbClient, user: AuthUser, scopeType: MemoryScopeType, scopeId: string): Promise<boolean> {
  if (isAdminUser(user)) return true;

  if (scopeType === "project") {
    const project = await db.project.findUnique({ where: { id: scopeId }, select: PROJECT_VISIBILITY_SELECT });
    if (!project) return false;
    return projectVisibleToUser(db, user, project);
  }

  if (scopeType === "company") {
    if (user.account_type !== "empresas") return false;
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { company_id: true } });
    return dbUser?.company_id === scopeId;
  }

  // agency
  if (user.account_type !== "agencias") return false;
  const agencyId = await resolveMyAgencyId(db, user.id);
  return agencyId === scopeId;
}

/**
 * Edição — SEMPRE mais restrita que visibilidade. Nômade e Líder nunca
 * ganham edição automática aqui, mesmo quando visíveis (requisito explícito
 * do bloco 1). Só Admin, e o dono do vínculo (Company dona do projeto /
 * Agência dona do projeto, ou a própria Company/Agência) editam.
 */
export async function canEditMemory(db: DbClient, user: AuthUser, scopeType: MemoryScopeType, scopeId: string): Promise<boolean> {
  if (isAdminUser(user)) return true;
  if (isLeaderUser(user)) return false;
  if (user.account_type === "nomades") return false;

  if (scopeType === "company") {
    if (user.account_type !== "empresas") return false;
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { company_id: true } });
    return dbUser?.company_id === scopeId;
  }

  if (scopeType === "agency") {
    if (user.account_type !== "agencias") return false;
    const agencyId = await resolveMyAgencyId(db, user.id);
    return agencyId === scopeId;
  }

  // project — só a Company OU Agência DONA daquele projeto especificamente
  // (nunca qualquer projeto "visível" por algum outro vínculo mais frouxo).
  const project = await db.project.findUnique({ where: { id: scopeId }, select: PROJECT_VISIBILITY_SELECT });
  if (!project) return false;

  if (user.account_type === "empresas") {
    const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { company_id: true } });
    if (!dbUser?.company_id) return false;
    return dbUser.company_id === project.company_id || dbUser.company_id === project.client_id;
  }

  if (user.account_type === "agencias") {
    const agencyId = await resolveMyAgencyId(db, user.id);
    if (!agencyId) return false;
    if (agencyId === project.agency_id) return true;
    // Projeto legado sem agency_id, só o campo de texto `agency` (nome) —
    // compara pelo nome da própria agência do usuário.
    if (project.agency) {
      const myAgency = await db.agency.findUnique({ where: { id: agencyId }, select: { name: true } });
      return myAgency?.name === project.agency;
    }
    return false;
  }

  return false;
}

/**
 * Resultado combinado de uma checagem de acesso, já no formato que as rotas
 * usam pra decidir 404 vs 403 — 404 sempre que a entidade não existir OU o
 * usuário não tiver visibilidade nenhuma (nunca revela existência pra quem
 * não tem vínculo); 403 só quando já pode VER mas não pode editar.
 */
export type MemoryAccessResult =
  | { ok: true; canEdit: boolean }
  | { ok: false; status: 404 | 403 };

export async function checkMemoryAccess(
  db: DbClient,
  user: AuthUser,
  scopeType: MemoryScopeType,
  scopeId: string,
  need: "view" | "edit",
): Promise<MemoryAccessResult> {
  const exists = await scopeEntityExists(db, scopeType, scopeId);
  if (!exists) return { ok: false, status: 404 };

  const canView = await canViewMemory(db, user, scopeType, scopeId);
  if (!canView) return { ok: false, status: 404 };

  const canEdit = await canEditMemory(db, user, scopeType, scopeId);
  if (need === "edit" && !canEdit) return { ok: false, status: 403 };

  return { ok: true, canEdit };
}
