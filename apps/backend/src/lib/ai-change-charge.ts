// P-11 (reunião 07/10): cobrança das ALTERAÇÕES feitas por IA numa contratação.
// Regras: cada contratação tem N alterações grátis (regra global em AiChangePricingSettings.free_changes, ou o valor próprio do produto em
// Catalog2Product.ai_free_changes). Passando disso, cada alteração custa o preço calculado pela média de tokens (computeChangePricing) e é
// DEBITADA DO SALDO DA CARTEIRA. Todo dinheiro que entra (cartão, Pix) vira crédito na carteira antes de ser debitado; sem saldo suficiente a
// alteração não é feita e o cliente é orientado a recarregar.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { computeChangePricing } from "./ai-change-pricing";
import { createLedgerEntryTx, findOrCreateWalletTx } from "./wallet-service";

export class AiChargeError extends Error {
  constructor(message: string, public httpStatus = 422, public code = "ai_charge_invalid", public details?: Record<string, unknown>) { super(message); }
}
export interface AiChargeAccount { kind: "company" | "agency"; id: string }
/** Cota de UMA etapa da contratação (step_key = id da etapa na versão contratada). */
export interface AiChangeStage { step_key: string; step_name: string; task_name: string; free_total: number; used: number; free_left: number }
/**
 * `stages` vazio = nenhuma etapa define cota: vale a regra global por contratação (free_total/used/free_left da contratação).
 * Com etapas: free_total/used/free_left descrevem a etapa pedida (`step_key`) ou, sem etapa escolhida, a soma de todas.
 */
export interface AiChangeQuote { project_product_id: string; step_key: string | null; stages: AiChangeStage[]; free_total: number; used: number; free_left: number; is_free: boolean; price_brl: number; balance_brl: number; enough_balance: boolean; missing_brl: number }

async function loadOwned(projectProductId: string, account: AiChargeAccount) {
  const pp = await prisma.projectProduct.findUnique({
    where: { id: projectProductId },
    select: { id: true, catalog2_version_id: true, project: { select: { company_id: true, agency_id: true } } },
  });
  const owner = account.kind === "company" ? pp?.project.company_id : pp?.project.agency_id;
  if (!pp || owner !== account.id) throw new AiChargeError("Contratação não encontrada.", 404, "not_found");
  return pp;
}

/** Etapas da versão contratada que definem alterações por IA grátis, na ordem de tarefas/etapas, já com o consumo de cada uma. */
async function loadStages(projectProductId: string, versionId: string | null): Promise<AiChangeStage[]> {
  if (!versionId) return [];
  const steps = await prisma.catalog2TaskStep.findMany({
    where: { ai_free_changes: { not: null }, task: { version_id: versionId } },
    select: { id: true, name: true, ai_free_changes: true, sort_order: true, task: { select: { name: true, sort_order: true } } },
  });
  if (steps.length === 0) return [];
  const usedRows = await prisma.aiChangeCharge.groupBy({ by: ["step_key"], where: { project_product_id: projectProductId, step_key: { not: null } }, _count: { _all: true } });
  const usedBy = new Map(usedRows.map((r) => [r.step_key as string, r._count._all]));
  return steps
    .sort((a, b) => a.task.sort_order - b.task.sort_order || a.sort_order - b.sort_order)
    .map((s) => {
      const total = s.ai_free_changes ?? 0;
      const used = usedBy.get(s.id) ?? 0;
      return { step_key: s.id, step_name: s.name, task_name: s.task.name, free_total: total, used, free_left: Math.max(0, total - used) };
    });
}

export async function quoteAiChange(projectProductId: string, account: AiChargeAccount, stepKey?: string | null): Promise<AiChangeQuote> {
  const pp = await loadOwned(projectProductId, account);
  const pricing = await computeChangePricing(90);
  const stages = await loadStages(pp.id, pp.catalog2_version_id);
  let freeTotal: number; let used: number; let freeLeft: number; let isFree: boolean; let chosen: string | null = null;
  if (stages.length === 0) {
    freeTotal = pricing.settings.free_changes;
    used = await prisma.aiChangeCharge.count({ where: { project_product_id: pp.id, step_key: null } });
    freeLeft = Math.max(0, freeTotal - used);
    isFree = used < freeTotal;
  } else {
    const pick = stepKey ? stages.find((s) => s.step_key === stepKey) : stages.length === 1 ? stages[0] : undefined;
    if (stepKey && !pick) throw new AiChargeError("Etapa não encontrada nesta contratação.", 422, "invalid_step");
    if (pick) { chosen = pick.step_key; freeTotal = pick.free_total; used = pick.used; freeLeft = pick.free_left; isFree = pick.free_left > 0; }
    else { freeTotal = stages.reduce((a, s) => a + s.free_total, 0); used = stages.reduce((a, s) => a + s.used, 0); freeLeft = stages.reduce((a, s) => a + s.free_left, 0); isFree = freeLeft > 0; }
  }
  isFree = isFree || pricing.price_per_change_brl <= 0;
  const price = isFree ? 0 : pricing.price_per_change_brl;
  const wallet = await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: account.kind, owner_id: account.id } } });
  const balance = Math.max(0, (wallet?.balance ?? 0) - (wallet?.blocked_balance ?? 0));
  return { project_product_id: pp.id, step_key: chosen, stages, free_total: freeTotal, used, free_left: freeLeft, is_free: isFree, price_brl: price, balance_brl: balance, enough_balance: balance + 1e-9 >= price, missing_brl: Math.max(0, Math.round((price - balance) * 100) / 100) };
}

/** Registra UMA alteração: grátis (valor 0) ou debitada do saldo. Sem saldo, recusa antes de gravar qualquer coisa. */
export async function chargeAiChange(input: { projectProductId: string; account: AiChargeAccount; userId: string; feature: string; note?: string | null; stepKey?: string | null }) {
  const q = await quoteAiChange(input.projectProductId, input.account, input.stepKey);
  if (q.stages.length > 0 && !q.step_key) throw new AiChargeError("Escolha a etapa da alteração por IA.", 422, "step_required");
  if (!q.enough_balance) {
    throw new AiChargeError(`Saldo insuficiente: esta alteração custa R$ ${q.price_brl.toFixed(2).replace(".", ",")} e faltam R$ ${q.missing_brl.toFixed(2).replace(".", ",")} na carteira. Adicione crédito (cartão ou Pix) e tente de novo.`, 402, "insufficient_balance", { price_brl: q.price_brl, balance_brl: q.balance_brl, missing_brl: q.missing_brl });
  }
  const id = randomUUID();
  return prisma.$transaction(async (tx) => {
    // Revalida dentro da transação: duas alterações simultâneas não passam da cota grátis nem gastam o mesmo saldo duas vezes.
    let ledgerId: string | null = null;
    if (!q.is_free) {
      const wallet = await findOrCreateWalletTx(tx, input.account.kind, input.account.id);
      const fresh = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      if (fresh.balance - fresh.blocked_balance + 1e-9 < q.price_brl) throw new AiChargeError("Saldo insuficiente para esta alteração.", 402, "insufficient_balance", { price_brl: q.price_brl });
      const { entry } = await createLedgerEntryTx(tx, {
        walletId: wallet.id, type: "payment", direction: "debit", amount: q.price_brl,
        description: `Alteração por IA (${input.feature})`, idempotencyKey: `ai_change:${id}`,
        referenceType: "project", referenceId: input.projectProductId, createdBy: input.userId, metadata: { feature: input.feature, charge_id: id },
      });
      ledgerId = entry.id;
    }
    const row = await tx.aiChangeCharge.create({
      data: { id, account_kind: input.account.kind, account_id: input.account.id, project_product_id: input.projectProductId, step_key: q.step_key, user_id: input.userId, feature: input.feature.slice(0, 60), is_free: q.is_free, amount_brl: q.price_brl, ledger_id: ledgerId, note: input.note?.slice(0, 500) ?? null },
    });
    return { charge: row, free_left: Math.max(0, q.free_left - (q.is_free ? 1 : 0)) };
  });
}
