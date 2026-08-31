import { prisma } from "./prisma";

// "Responsável" (Owner/Master) nesta plataforma não é só
// `AdminProfile.is_master` — o próprio `requirePermission()` já trata "sem
// perfil atribuído" (ou perfil desativado) como acesso irrestrito (regra do
// avô, ver middleware/auth.ts). Um admin nessas condições tem, na prática,
// o mesmo nível de acesso de um is_master de verdade — então as proteções
// de "não mexer no último responsável" e "Admin comum não mexe em Admin
// Master" usam esta mesma definição, não só o campo `is_master`.
export function hasMasterAccess(
  adminProfile: { is_master: boolean; is_active: boolean } | null | undefined,
): boolean {
  if (!adminProfile || !adminProfile.is_active) return true;
  return adminProfile.is_master;
}

/** Quantos admins ATIVOS ainda teriam acesso de responsável (Master ou
 * grandfathered), excluindo opcionalmente um id (o alvo da ação que está
 * prestes a acontecer) — usado pra decidir se uma ação deixaria a
 * plataforma sem ninguém responsável. */
export async function countActiveResponsibleAdmins(excludeUserId?: string): Promise<number> {
  const admins = await prisma.user.findMany({
    where: {
      role: "admin",
      is_active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { admin_profile: { select: { is_master: true, is_active: true } } },
  });
  return admins.filter((a) => hasMasterAccess(a.admin_profile)).length;
}
