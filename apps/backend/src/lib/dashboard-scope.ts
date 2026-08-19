import type { PrismaClient } from "@prisma/client";
import { resolveMyAgencyId } from "./project-scope";
import type { WidgetsScope } from "./dashboard-widgets";

/**
 * Ponto único de resolução de escopo — usado tanto na CRIAÇÃO de um
 * ShareLink (routes/dashboard-shares.ts) quanto no dashboard AUTENTICADO
 * normal (routes/dashboard.ts, POST /widgets). Escopo nunca vem do
 * frontend: aqui ele é sempre derivado de quem está logado (User.company_id
 * / agency_id / Nomade.user_id), nunca de um id enviado na requisição.
 */
export async function resolveOwnScopeId(
  db: PrismaClient,
  user: { id: string; role: string; account_type: string },
  profile: string,
): Promise<string | null> {
  if (profile === "company") {
    const u = await db.user.findUnique({
      where: { id: user.id },
      select: { company_id: true },
    });
    return u?.company_id ?? null;
  }
  if (profile === "agency" || profile === "partner") {
    return resolveMyAgencyId(db, user.id);
  }
  if (profile === "nomad") {
    const n = await db.nomade.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    });
    return n?.id ?? null;
  }
  if (profile === "leader") {
    // Escopo por categoria/produto permitido (LiderArea) não é reduzível a
    // um único id — ver resolveDashboardScopeExtras abaixo, que
    // deliberadamente NÃO aplica nenhum filtro extra pra "leader" hoje.
    // Limitação documentada, não contornada: o dashboard de Leader (normal
    // e compartilhado) mostra dado agregado da plataforma sem recorte por
    // área até que um filtro real por LiderArea seja implementado.
    return user.id;
  }
  return null;
}

/**
 * Deriva o "profile" (mesmo vocabulário do ShareLink.profile) a partir da
 * conta de quem está autenticado — nunca aceito como parâmetro do cliente.
 * Usado só pelo dashboard NORMAL (routes/dashboard.ts); o compartilhado
 * usa o profile já travado no ShareLink desde a criação.
 */
export function resolveAuthenticatedProfile(user: {
  role?: string;
  account_type?: string;
}): "admin" | "agency" | "company" | "nomad" | "leader" | "partner" | null {
  if (user.role === "admin" || user.account_type === "admin") return "admin";
  if (user.role === "lider" || user.account_type === "lider") return "leader";
  if (user.account_type === "agencias") return "agency";
  if (user.account_type === "empresas") return "company";
  if (user.account_type === "nomades") return "nomad";
  // "parceiro" é um account_type legado ainda presente em produção (3
  // contas reais confirmadas) — Partner hoje é tipicamente um upgrade de
  // Agency (ver project-scope.ts), mas essas contas antigas não têm
  // agency_id; resolveOwnScopeId trata "partner" igual a "agency"
  // (resolveMyAgencyId), então fica null pra elas — sem escopo real
  // aplicável, dashboard permanece no mock local pra essas 3 contas.
  if (user.account_type === "parceiro") return "partner";
  return null;
}

/**
 * Monta os filtros extras (WidgetsScope) de computeDashboardWidgetsMetrics
 * a partir de profile+scopeId — extraído de routes/share.ts pra ser
 * reutilizado também por routes/dashboard.ts (POST /widgets), evitando
 * duas implementações de escopo divergindo de novo (era exatamente esse o
 * bug original dos widgets zerados no compartilhamento).
 */
export async function resolveDashboardScopeExtras(
  db: PrismaClient,
  profile: string,
  scopeId: string | null,
): Promise<WidgetsScope> {
  // Projetos "legados" de agência só têm o campo de texto `agency` (nome)
  // preenchido, sem `agency_id` (ver Project.agency_id no schema.prisma:
  // "não usado pelos projetos existentes"). Sem este OR, um
  // compartilhamento/dashboard de agência ficava com quase tudo zerado.
  let legacyAgencyName: string | null = null;
  if ((profile === "agency" || profile === "partner") && scopeId) {
    const agency = await db.agency.findUnique({
      where: { id: scopeId },
      select: { name: true },
    });
    legacyAgencyName = agency?.name ?? null;
  }

  const projectNestedExtra: Record<string, unknown> =
    (profile === "agency" || profile === "partner") && scopeId
      ? {
          OR: [
            { agency_id: scopeId },
            ...(legacyAgencyName ? [{ agency: legacyAgencyName }] : []),
          ],
        }
      : profile === "company" && scopeId
        ? { OR: [{ client_id: scopeId }, { company_id: scopeId }] }
        : {};

  return {
    projectNestedExtra,
    projectExtra: projectNestedExtra,
    invoiceExtra: profile === "company" && scopeId ? { company_id: scopeId } : {},
    // ProjectTask (motor real de tarefas) marca o responsável em
    // `nomade_responsavel_id` — não confundir com TaskExecution.nomade_id
    // (tabela legada, não é mais a fonte dos widgets de tarefas).
    taskExtra: profile === "nomad" && scopeId ? { nomade_responsavel_id: scopeId } : {},
    nomadeExtra: profile === "nomad" && scopeId ? { id: scopeId } : {},
    companyExtra: profile === "company" && scopeId ? { id: scopeId } : {},
    partnerExtra: (profile === "agency" || profile === "partner") && scopeId ? { agency_id: scopeId } : {},
    // Faturas sem projeto (plano de crédito) não têm como ser atribuídas a
    // uma agência — quando o escopo é agência/partner, essas faturas ficam
    // de fora (0) em vez de vazar receita de outra organização.
    creditPlanAttributable: !((profile === "agency" || profile === "partner") && !!scopeId),
  };
}
