import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";

export interface LedgerParams {
  walletId: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  description: string;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  status?: string;
}

/**
 * Finds the wallet for a given owner, or creates one (balance 0) if it doesn't exist.
 * Uses upsert so it's safe under concurrent calls.
 */
export async function findOrCreateWallet(ownerType: string, ownerId: string) {
  return prisma.wallet.upsert({
    where: { owner_type_owner_id: { owner_type: ownerType, owner_id: ownerId } },
    update: {},
    create: {
      owner_type: ownerType,
      owner_id: ownerId,
      balance: 0,
      blocked_balance: 0,
      currency: "BRL",
      status: "active",
    },
  });
}

/**
 * Creates a WalletLedger entry atomically:
 * 1. Checks idempotency key — returns existing entry without modifying balance if already recorded.
 * 2. Opens a Prisma transaction: reads current balance, creates ledger row, updates wallet.balance.
 *
 * Returns { entry, duplicate: true } if the idempotency key already existed.
 * Returns { entry, duplicate: false } on first recording.
 * Throws on Prisma or logic errors (caller should catch and handle).
 */
export async function createLedgerEntry(params: LedgerParams) {
  // Fast idempotency check outside the transaction to avoid serialisation overhead
  const existing = await prisma.walletLedger.findUnique({
    where: { idempotency_key: params.idempotencyKey },
  });
  if (existing) return { entry: existing, duplicate: true };

  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id: params.walletId } });
    if (!wallet) throw new Error(`Carteira ${params.walletId} não encontrada`);
    if (wallet.status === "closed") throw new Error(`Carteira ${params.walletId} está fechada`);

    const balanceBefore = wallet.balance;
    const balanceAfter =
      params.direction === "credit"
        ? balanceBefore + params.amount
        : balanceBefore - params.amount;

    const entry = await tx.walletLedger.create({
      data: {
        wallet_id:       params.walletId,
        type:            params.type,
        direction:       params.direction,
        amount:          params.amount,
        balance_before:  balanceBefore,
        balance_after:   balanceAfter,
        description:     params.description,
        idempotency_key: params.idempotencyKey,
        reference_type:  params.referenceType,
        reference_id:    params.referenceId,
        created_by:      params.createdBy,
        metadata:        params.metadata as any,
        status:          params.status ?? "confirmed",
      },
    });

    await tx.wallet.update({
      where: { id: params.walletId },
      data: { balance: balanceAfter },
    });

    return { entry, duplicate: false };
  });
}

/**
 * Records a financial event in a wallet, non-blocking.
 * On failure: logs error and returns null instead of throwing.
 * Use this in route handlers where the wallet ledger must not block the primary flow.
 */
/**
 * Variantes que operam dentro de uma transação JÁ ABERTA pelo chamador (tx),
 * em vez de abrir a sua própria (como findOrCreateWallet/createLedgerEntry
 * fazem). Necessário para o checkout admin (contratação em nome de empresa/
 * agência com débito de carteira Allkoins — achado do usuário 2026-09-23):
 * o débito precisa comitar/reverter JUNTO com a criação do projeto e do
 * pagamento, nunca como efeito colateral solto fora da transação principal
 * (diferente do lançamento best-effort de recordWalletEvent, que documenta
 * "fora da transação principal" de propósito para o fluxo de cartão).
 */
export async function findOrCreateWalletTx(tx: DbClient, ownerType: string, ownerId: string) {
  return tx.wallet.upsert({
    where: { owner_type_owner_id: { owner_type: ownerType, owner_id: ownerId } },
    update: {},
    create: {
      owner_type: ownerType,
      owner_id: ownerId,
      balance: 0,
      blocked_balance: 0,
      currency: "BRL",
      status: "active",
    },
  });
}

export async function createLedgerEntryTx(tx: DbClient, params: LedgerParams) {
  const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: params.idempotencyKey } });
  if (existing) return { entry: existing, duplicate: true };

  const wallet = await tx.wallet.findUnique({ where: { id: params.walletId } });
  if (!wallet) throw new Error(`Carteira ${params.walletId} não encontrada`);
  if (wallet.status === "closed") throw new Error(`Carteira ${params.walletId} está fechada`);

  const balanceBefore = wallet.balance;
  const balanceAfter = params.direction === "credit" ? balanceBefore + params.amount : balanceBefore - params.amount;

  const entry = await tx.walletLedger.create({
    data: {
      wallet_id:       params.walletId,
      type:            params.type,
      direction:       params.direction,
      amount:          params.amount,
      balance_before:  balanceBefore,
      balance_after:   balanceAfter,
      description:     params.description,
      idempotency_key: params.idempotencyKey,
      reference_type:  params.referenceType,
      reference_id:    params.referenceId,
      created_by:      params.createdBy,
      metadata:        params.metadata as any,
      status:          params.status ?? "confirmed",
    },
  });

  await tx.wallet.update({ where: { id: params.walletId }, data: { balance: balanceAfter } });

  return { entry, duplicate: false };
}

export async function recordWalletEvent(
  ownerType: string,
  ownerId: string,
  params: Omit<LedgerParams, "walletId">,
): Promise<{ entry: any; duplicate: boolean } | null> {
  try {
    const wallet = await findOrCreateWallet(ownerType, ownerId);
    return await createLedgerEntry({ ...params, walletId: wallet.id });
  } catch (err: any) {
    console.error(
      `[wallet-service] Falha ao registrar evento "${params.type}" na carteira (${ownerType}/${ownerId}):`,
      err?.message ?? err,
    );
    return null;
  }
}
