// Consistência comercial da versão (correção de 2026-09-30): três conceitos SEPARADOS.
//
//   1) Modalidades de COMPRA da versão  → accepts_one_time (avulso: 1 ciclo, sem renovação) e accepts_recurring (assinatura mensal).
//   2) Tipo de ENTREGA do produto       → delivery_recurrence = "mensal": um novo lote de tarefas a cada mês (vazio = entrega única).
//   3) IMPLEMENTAÇÃO inicial            → has_initial_implementation + implementation_rule (independe de pagamento).
//
// Eles se relacionam, mas não são a mesma coisa. Aqui só se DIAGNOSTICA: nada é alterado sozinho. As correções são
// ações explícitas do administrador (ver RESOLUTION_ACTIONS), só em versão em edição.
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface CommercialInput {
  version: { accepts_one_time: boolean; accepts_recurring: boolean };
  product: { delivery_recurrence: string | null };
  periods: { period: string; is_active: boolean }[];
}
export interface CommercialIssue { code: string; severity: "blocker" | "warning"; message: string }

export const RESOLUTION_ACTIONS = ["only_one_time", "one_time_and_monthly", "only_monthly", "unmark_recurring_delivery", "manual_review"] as const;
export type ResolutionAction = (typeof RESOLUTION_ACTIONS)[number];

/** O que cada ação faz, em português — mostrado ao administrador ANTES de confirmar. */
export const RESOLUTION_EFFECTS: Record<ResolutionAction, { label: string; effects: string[] }> = {
  only_one_time: { label: "Manter somente avulso", effects: ["Avulso: ligado", "Assinatura mensal: desligada", "Entrega mensal recorrente do produto: desmarcada"] },
  one_time_and_monthly: { label: "Habilitar avulso e recorrente mensal", effects: ["Avulso: ligado", "Assinatura mensal: ligada", "Entrega mensal recorrente do produto: marcada"] },
  only_monthly: { label: "Manter somente recorrente mensal", effects: ["Avulso: desligado", "Assinatura mensal: ligada", "Entrega mensal recorrente do produto: marcada"] },
  unmark_recurring_delivery: { label: "Desmarcar entrega mensal recorrente", effects: ["Entrega mensal recorrente do produto: desmarcada", "Modalidades de compra: sem mudança"] },
  manual_review: { label: "Revisar manualmente", effects: ["Nada é alterado"] },
};

const LONG_PERIODS = ["trimestral", "semestral", "anual"];

export function commercialConsistency(i: CommercialInput): CommercialIssue[] {
  const out: CommercialIssue[] = [];
  const recDelivery = i.product.delivery_recurrence === "mensal";
  const { accepts_one_time: one, accepts_recurring: rec } = i.version;
  const monthly = i.periods.find((p) => p.period === "mensal");
  if (!one && !rec) {
    out.push({ code: "no_modality", severity: "blocker", message: "Nenhuma modalidade de compra está habilitada (nem avulso, nem assinatura mensal)." });
  }
  if (recDelivery && !rec) {
    out.push({
      code: "recurring_delivery_without_subscription", severity: "blocker",
      message: "O produto tem entrega mensal recorrente (novo lote de tarefas todo mês), mas a assinatura mensal NÃO está habilitada nas modalidades de compra. Habilite a assinatura ou desmarque a entrega mensal recorrente.",
    });
  }
  if (rec && !recDelivery) {
    out.push({
      code: "subscription_without_recurring_delivery", severity: "blocker",
      message: "A assinatura mensal está habilitada, mas o produto não tem entrega mensal recorrente: o cliente pagaria todo mês sem receber um novo lote de tarefas. Marque a entrega mensal recorrente ou desabilite a assinatura.",
    });
  }
  if (monthly?.is_active && !rec) {
    out.push({ code: "monthly_period_without_subscription", severity: "warning", message: "O período Mensal está cadastrado/ativo, mas a assinatura mensal não está habilitada nesta versão — ele não é oferecido ao cliente." });
  }
  if (rec && recDelivery && !monthly?.is_active) {
    out.push({ code: "subscription_without_monthly_period", severity: "warning", message: "A assinatura mensal está habilitada, mas o período Mensal não está configurado/ativo em Custos e preço — enquanto isso, o cliente não consegue assinar." });
  }
  const longActive = i.periods.filter((p) => LONG_PERIODS.includes(p.period) && p.is_active).map((p) => p.period);
  if (longActive.length > 0) {
    out.push({ code: "long_periods_reserved", severity: "warning", message: `Períodos ${longActive.join(", ")}: reservados para ativação futura — ficam cadastrados com desconto, mas não são contratáveis.` });
  }
  return out;
}

export const blockersOf = (issues: CommercialIssue[]) => issues.filter((x) => x.severity === "blocker");

/** Texto de modalidade mostrado na prévia/ficha — sempre derivado das modalidades REAIS da versão. */
export function saleLabel(v: { accepts_one_time: boolean; accepts_recurring: boolean }): string | null {
  if (v.accepts_one_time && v.accepts_recurring) return "Disponível avulso ou em assinatura mensal";
  if (v.accepts_recurring) return "Assinatura mensal recorrente";
  if (v.accepts_one_time) return "Avulso disponível";
  return null;
}

export async function loadConsistency(db: Db, productId: string, version: { accepts_one_time: boolean; accepts_recurring: boolean }) {
  const [product, periods] = await Promise.all([
    db.catalog2Product.findUnique({ where: { id: productId }, select: { delivery_recurrence: true } }),
    db.catalog2ProductPeriod.findMany({ where: { product_id: productId }, select: { period: true, is_active: true } }),
  ]);
  return commercialConsistency({ version, product: { delivery_recurrence: product?.delivery_recurrence ?? null }, periods });
}

/** Aplica UMA ação explícita do administrador (versão em edição). Devolve o que foi alterado. */
export async function applyResolution(db: Db, versionId: string, productId: string, action: ResolutionAction) {
  const before = await db.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId }, select: { accepts_one_time: true, accepts_recurring: true } });
  const prod = await db.catalog2Product.findUniqueOrThrow({ where: { id: productId }, select: { delivery_recurrence: true } });
  const vData: Prisma.Catalog2ProductVersionUpdateInput = {};
  let delivery: string | null | undefined;
  switch (action) {
    case "only_one_time": vData.accepts_one_time = true; vData.accepts_recurring = false; delivery = null; break;
    case "one_time_and_monthly": vData.accepts_one_time = true; vData.accepts_recurring = true; delivery = "mensal"; break;
    case "only_monthly": vData.accepts_one_time = false; vData.accepts_recurring = true; delivery = "mensal"; break;
    case "unmark_recurring_delivery": delivery = null; break;
    case "manual_review": break;
  }
  if (Object.keys(vData).length > 0) await db.catalog2ProductVersion.update({ where: { id: versionId }, data: vData });
  if (delivery !== undefined && delivery !== prod.delivery_recurrence) await db.catalog2Product.update({ where: { id: productId }, data: { delivery_recurrence: delivery } });
  return {
    before: { ...before, delivery_recurrence: prod.delivery_recurrence },
    after: { accepts_one_time: vData.accepts_one_time ?? before.accepts_one_time, accepts_recurring: vData.accepts_recurring ?? before.accepts_recurring, delivery_recurrence: delivery === undefined ? prod.delivery_recurrence : delivery },
  };
}
