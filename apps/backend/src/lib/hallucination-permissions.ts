import type { Prisma } from "@prisma/client";
import { isAdminUser, projectVisibleToUser, type DbClient } from "./project-scope";
import { canEditMemory } from "./memory-permissions";

// ─── Permissões do relato de "possível alucinação" (bloco 2/4) ─────────────
// Reaproveita o vínculo real já usado pela Memória (bloco 1) — nunca compara
// papel por string solta fora daqui, nunca usa nome textual de empresa/
// agência como autorização.

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
 * Pode CRIAR um relato neste projeto — qualquer pessoa com visibilidade real
 * do projeto (mesma regra ampla de `projectVisibleToUser`, já usada pra
 * decidir quem enxerga o projeto em qualquer outra tela — nunca mais
 * restrito que "consegue acessar o projeto").
 */
export async function canReportOnProject(
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
 * Company/Agência DONA do projeto (mesmo critério de `canEditMemory` para o
 * escopo "project") — usado pra decidir o que aparece na listagem de
 * relatos "do meu vínculo".
 */
export async function isProjectOwnerForReports(db: DbClient, user: AuthUser, projectId: string): Promise<boolean> {
  if (isAdminUser(user)) return true;
  return canEditMemory(db, user, "project", projectId);
}

/**
 * Acesso a UM relato já existente: Admin Master sempre; quem relatou sempre
 * enxerga o próprio relato (mesmo que o vínculo do projeto mude depois — a
 * autoria não muda, então o relato não pode simplesmente sumir de quem o
 * criou); dono ATUAL do projeto (Company/Agência) também vê. Qualquer outro
 * caso é 404 (nunca 403 — não revela nem que o relato existe).
 */
export async function canAccessHallucinationReport(
  db: DbClient,
  user: AuthUser,
  report: { project_id: string; reported_by_user_id: string },
): Promise<boolean> {
  if (isAdminUser(user)) return true;
  if (report.reported_by_user_id === user.id) return true;
  return isProjectOwnerForReports(db, user, report.project_id);
}
