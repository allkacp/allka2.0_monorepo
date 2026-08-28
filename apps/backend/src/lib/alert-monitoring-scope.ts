import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluateAdminMasterAccess, evaluateAnyPermission } from "../middleware/auth";

// ── Escopo da aba "Monitoramento" (ata 2026-08, bloco 2/5) ────────────────
// Monitoramento mostra alertas CRÍTICOS de TERCEIROS dentro da autoridade
// real de quem pergunta. Nunca decidido por `role === "leader"` sozinho —
// sempre por vínculo consultável no banco. O `where` devolvido é aplicado
// com AND sobre qualquer filtro do cliente e sempre exclui os alertas do
// próprio usuário; manipular query/ID nunca amplia o acesso.

export type MonitoringScope =
  // Admin Master — todos os alertas de terceiros (globais + de qualquer pessoa)
  | { kind: "global" }
  // Filtro concreto (líder → suas tarefas; admin não-master → só Gerais)
  | { kind: "scoped"; where: Prisma.SystemAlertWhereInput; note?: string }
  // Sem autoridade de acompanhamento — a aba não aparece e a rota responde 403
  | { kind: "denied" };

type UserForScope = {
  id: string;
  role: string | null;
  account_type: string;
};

export interface MonitoringAccess {
  scope: MonitoringScope;
  /** Rótulo curto do nível, para o frontend explicar a abrangência. */
  level: "master" | "admin" | "leader" | "none";
}

export async function resolveMonitoringAccess(req: Request): Promise<MonitoringAccess> {
  const u = req.user as UserForScope;

  const dbUser = await prisma.user.findUnique({
    where: { id: u.id },
    select: {
      role: true,
      account_type: true,
      admin_profile: {
        select: {
          is_master: true,
          is_active: true,
          permissions: { select: { module: true, action: true } },
        },
      },
    },
  });

  const perfil = dbUser?.admin_profile ?? null;

  // 1. Admin Master → visão global (estritamente is_master, sem a regra do
  //    "avô" de requirePermission — mesmo critério de requireAdminMaster).
  if (evaluateAdminMasterAccess(u.account_type, perfil)) {
    return { scope: { kind: "global" }, level: "master" };
  }

  const isAdmin = u.account_type === "admin" || dbUser?.role === "admin";

  // 2. Admin não-master → precisa de grant explícito de visualização. Escopo
  //    conservador e honesto: só os alertas GERAIS (user_id = null). A
  //    plataforma não tem hoje "organização que este admin administra" como
  //    vínculo consultável para alertas de pessoas — documentado no relatório.
  if (isAdmin) {
    const canView = evaluateAnyPermission(perfil, [
      ["sistema", "view"],
      ["central_alertas", "view"],
    ]);
    if (!canView) return { scope: { kind: "denied" }, level: "none" };
    return {
      scope: {
        kind: "scoped",
        where: { user_id: null },
        note: "Somente alertas gerais do sistema — seu perfil não abrange alertas de pessoas específicas.",
      },
      level: "admin",
    };
  }

  // 3. Líder → alertas SOBRE as tarefas onde ele é o líder responsável
  //    (lider_responsavel_id). Vínculo direto e consultável; nunca por nome
  //    de papel. Sem tarefa sob responsabilidade → sem aba.
  if (dbUser?.role === "lider") {
    const tasks = await prisma.projectTask.findMany({
      where: { lider_responsavel_id: u.id },
      select: { id: true },
    });
    if (tasks.length === 0) return { scope: { kind: "denied" }, level: "none" };
    const taskIds = tasks.map((t) => t.id);
    return {
      scope: {
        kind: "scoped",
        where: { entity_type: "project_task", entity_id: { in: taskIds } },
        note: "Alertas das tarefas sob sua responsabilidade como líder.",
      },
      level: "leader",
    };
  }

  // 4. Company/Agency/Nômade/usuário final → sem Monitoramento nesta primeira
  //    versão (documentado). Só seus próprios alertas, na aba "Meus Alertas".
  return { scope: { kind: "denied" }, level: "none" };
}

/**
 * Converte o escopo num `where` Prisma pronto para AND com os filtros do
 * cliente. `global` vira apenas "exclua os meus" (Monitoramento é de
 * terceiros). `denied` nunca deve chegar aqui — a rota responde 403 antes.
 */
export function monitoringScopeWhere(
  scope: MonitoringScope,
  selfUserId: string,
): Prisma.SystemAlertWhereInput {
  const notMine: Prisma.SystemAlertWhereInput = { NOT: { user_id: selfUserId } };
  if (scope.kind === "global") return notMine;
  if (scope.kind === "scoped") return { AND: [scope.where, notMine] };
  // denied — barreira final defensiva: não casa nada.
  return { id: "__monitoring_denied__" };
}
