/**
 * admin-responsible.ts — "Admin responsável da Allka" por projeto (ata
 * 2026-08, reparo "categoria sem efeito"). Escolhido explicitamente no
 * projeto, nunca inferido do dono da Company/Agency nem de qualquer Admin
 * global — ver Project.admin_responsible_user_id no schema.
 *
 * Este arquivo é o único lugar que decide "o que conta como Admin interno
 * válido pra esta função" — reaproveitado tanto pela validação em
 * POST/PUT /api/projects quanto pela resolução do motor de alertas
 * (alert-engine.ts), pra nunca haver duas definições divergentes do mesmo
 * conceito.
 */
import { prisma } from "./prisma";

/**
 * true só quando o usuário é um Admin interno da Allka realmente ativo —
 * nunca Company, Agency, Nômade ou usuário comum "fingindo" ser Admin
 * (account_type é sempre resolvido pelo backend, nunca aceito do payload
 * do cliente, então não há como forjar isto).
 */
export async function isEligibleAdminResponsible(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { account_type: true, is_active: true },
  });
  return !!user && user.is_active && user.account_type === "admin";
}

export type AdminResponsibleValidation =
  | { ok: true; value: string | null | undefined }
  | { ok: false; error: string };

/**
 * Valida o valor recebido no payload de criação/edição de projeto.
 * `undefined` = campo não enviado (não mexe). `null` = remover
 * explicitamente o Admin responsável (permitido — "permitir deixar sem
 * responsável"). String = precisa ser um Admin interno ativo de verdade.
 */
export async function validateAdminResponsibleUserId(
  value: string | null | undefined,
): Promise<AdminResponsibleValidation> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  const eligible = await isEligibleAdminResponsible(value);
  if (!eligible) {
    return { ok: false, error: "Admin responsável inválido: precisa ser um usuário administrativo interno ativo" };
  }
  return { ok: true, value };
}
