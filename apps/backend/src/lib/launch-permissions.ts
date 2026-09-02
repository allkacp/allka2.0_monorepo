import type { Prisma } from "@prisma/client";
import { isAdminUser, projectVisibleToUser, type DbClient } from "./project-scope";
import { canEditMemory } from "./memory-permissions";

// ─── Permissões da IA de Lançamento (bloco 3/4) ─────────────────────────────
// Reaproveita o vínculo real já usado pela Memória (blocos 1/2) — nunca
// compara papel por string solta fora daqui, nunca aceita autoridade vinda
// do payload (company/agency sempre resolvidos a partir do projeto real).

export type AuthUser = { id: string; account_type?: string; role?: string };

const PROJECT_SELECT = {
  id: true,
  agency: true,
  client_id: true,
  agency_id: true,
  company_id: true,
  partner_id: true,
} satisfies Prisma.ProjectSelect;

async function loadProjectForAccess(db: DbClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: PROJECT_SELECT });
}

/**
 * Pode VER a sessão de lançamento — mesma visibilidade ampla de projeto já
 * usada em toda a plataforma (`projectVisibleToUser`). Nunca mais restrito
 * que "consegue acessar o projeto".
 */
export async function canViewLaunchSession(
  db: DbClient,
  user: AuthUser,
  projectId: string,
): Promise<{ exists: boolean; allowed: boolean }> {
  const project = await loadProjectForAccess(db, projectId);
  if (!project) return { exists: false, allowed: false };
  if (isAdminUser(user)) return { exists: true, allowed: true };
  const allowed = await projectVisibleToUser(db, user, project);
  return { exists: true, allowed };
}

/**
 * Pode GERAR proposta e APROVAR como rascunho — não existe hoje, em nenhum
 * lugar da plataforma, uma permissão granular dedicada a "criar/gerenciar
 * tarefa" (auditado no bloco 3: `project-tasks.ts` não usa
 * `requirePermission`, só escopo de vínculo). O nível real mais próximo é
 * "dono do projeto" — o mesmo critério já usado por `canEditMemory` pro
 * escopo "project": Admin sempre; Company/Agência DONA do projeto (nunca só
 * "visível"); Líder e Nômade NUNCA ganham isto automaticamente (já embutido
 * em `canEditMemory`).
 */
export async function canManageLaunchSession(db: DbClient, user: AuthUser, projectId: string): Promise<boolean> {
  if (isAdminUser(user)) return true;
  return canEditMemory(db, user, "project", projectId);
}
