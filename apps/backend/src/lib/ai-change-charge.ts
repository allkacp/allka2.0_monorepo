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
export interface AiChangeQuote { project_product_id: string; free_total: number; used: number; free_left: number; is_free: boolean; price_brl: number; balance_brl: number; enough_balance: boolean; missing_brl: number }

async function loadOwned(projectProductId: string, account: AiChargeAccount) {
  const pp = await prisma.projectProduct.findUnique({
    where: { id: projectProductId },
    select: { id: true, project: { select: { company_id: true, agency_id: true } }, catalog2_product: { select: { ai_free_changes: true } } },
  });
  const owner = account.kind === "company" ? pp?.project.company_id : pp?.project.agency_id;
  if (!pp || owner !== account.id) throw new AiChargeError("Contratação não encontrada.", 404, "not_found");
  return pp;
}

export async function quoteAiChange(projectProductId: string, account: AiChargeAccount): Promise<AiChangeQuote> {
  const pp = await loadOwned(projectProductId, account);
  const pricing = await computeChangePricing(90);
  const freeTotal = pp.catalog2_product?.ai_free_changes ?? pricing.settings.free_changes;
  const used = await prisma.aiChangeCharge.count({ where: { project_product_id: pp.id } });
  const isFree = used < freeTotal || pricing.price_per_change_brl <= 0;
  const price = isFree ? 0 : pricing.price_per_change_brl;
  const wallet = await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: account.kind, owner_id: account.id } } });
  const balance = Math.max(0, (wallet?.balance ?? 0) - (wallet?.blocked_balance ?? 0));
  return { project_product_id: pp.id, free_total: freeTotal, used, free_left: Math.max(0, freeTotal - used), is_free: isFree, price_brl: price, balance_brl: balance, enough_balance: balance + 1e-9 >= price, missing_brl: Math.max(0, Math.round((price - balance) * 100) / 100) };
}

/** Registra UMA alteração: grátis (valor 0) ou debitada do saldo. Sem saldo, recusa antes de gravar qualquer coisa. */
export async function chargeAiChange(input: { projectProductId: string; account: AiChargeAccount; userId: string; feature: string; note?: string | null }) {
  const q = await quoteAiChange(input.projectProductId, input.account);
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
      data: { id, account_kind: input.account.kind, account_id: input.account.id, project_product_id: input.projectProductId, user_id: input.userId, feature: input.feature.slice(0, 60), is_free: q.is_free, amount_brl: q.price_brl, ledger_id: ledgerId, note: input.note?.slice(0, 500) ?? null },
    });
    return { charge: row, free_left: Math.max(0, q.free_left - (q.is_free ? 1 : 0)) };
  });
}
