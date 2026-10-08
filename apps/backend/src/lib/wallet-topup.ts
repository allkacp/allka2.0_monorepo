// Recarga de crédito na carteira (cartão ou Pix) pelo próprio cliente. Passa SEMPRE pelo gateway de pagamento ativo
// (payment-gateway.ts): hoje o FAKE_SANDBOX aprova tudo (cartões de teste recusam por final), e trocar por Mercado Pago/Asaas/PagBank/Stripe
// é só implementar o adapter — esta camada e as telas não mudam. O crédito entra no ledger com chave de idempotência por transação.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { getPaymentGateway } from "./payment-gateway";
import { createLedgerEntryTx, findOrCreateWalletTx } from "./wallet-service";

export const TOPUP_MIN_BRL = 5;
export const TOPUP_MAX_BRL = 5000;

export class TopupError extends Error {
  constructor(message: string, public httpStatus = 422, public code = "topup_invalid") { super(message); }
}
export interface TopupAccount { kind: "company" | "agency"; id: string }

function checkAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < TOPUP_MIN_BRL || amount > TOPUP_MAX_BRL) {
    throw new TopupError(`O valor da recarga deve ficar entre R$ ${TOPUP_MIN_BRL},00 e R$ ${TOPUP_MAX_BRL},00.`, 422, "invalid_amount");
  }
  return Math.round(amount * 100) / 100;
}

async function credit(account: TopupAccount, userId: string, amount: number, method: "card" | "pix", gateway: string, transactionId: string, extra: Record<string, unknown> = {}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await findOrCreateWalletTx(tx, account.kind, account.id);
    const { entry, duplicate } = await createLedgerEntryTx(tx, {
      walletId: wallet.id, type: "credit", direction: "credit", amount,
      description: method === "card" ? "Recarga de crédito (cartão)" : "Recarga de crédito (Pix)",
      idempotencyKey: `topup:${transactionId}`, referenceType: "payment", referenceId: transactionId, createdBy: userId,
      metadata: { method, gateway, transaction_id: transactionId, ...extra },
    });
    const fresh = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    return { entry, duplicate, balance_brl: fresh.balance - fresh.blocked_balance };
  });
}

export async function walletSummary(account: TopupAccount) {
  const wallet = await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: account.kind, owner_id: account.id } } });
  const recent = wallet
    ? await prisma.walletLedger.findMany({ where: { wallet_id: wallet.id }, orderBy: { created_at: "desc" }, take: 10, select: { id: true, direction: true, amount: true, description: true, created_at: true, status: true } })
    : [];
  const gw = getPaymentGateway();
  return { balance_brl: wallet ? Math.max(0, wallet.balance - wallet.blocked_balance) : 0, recent, gateway: gw.name, is_sandbox: gw.name === "FAKE_SANDBOX", hosted: !!gw.createIntent, min_brl: TOPUP_MIN_BRL, max_brl: TOPUP_MAX_BRL };
}

/** Só os 4 últimos dígitos chegam ao backend e ao gateway fake; o número completo nunca é guardado. */
export async function topupByCard(input: { account: TopupAccount; userId: string; amount: number; cardLastDigits: string; cardHolder?: string }) {
  const amount = checkAmount(input.amount);
  if (!/^\d{4}$/.test(input.cardLastDigits)) throw new TopupError("Cartão inválido.", 422, "invalid_card");
  const referenceId = randomUUID();
  const r = await getPaymentGateway().charge({ amount, cardLastDigits: input.cardLastDigits, cardHolder: input.cardHolder, referenceId, description: "Recarga de crédito Allka" });
  if (!r.approved) throw new TopupError(r.declineReason ?? "Pagamento recusado pela operadora.", 402, r.declineCode ?? "declined");
  return credit(input.account, input.userId, amount, "card", r.gateway, r.transactionId, { card_last4: input.cardLastDigits });
}

/** Pix: gera o código (copia e cola). No sandbox o crédito só entra quando o pagamento é "simulado" (confirmPixSandbox). Num gateway real, entra pelo webhook. */
export async function createPix(input: { amount: number }) {
  const amount = checkAmount(input.amount);
  const gw = getPaymentGateway();
  if (!gw.createPix) throw new TopupError("Pix indisponível neste gateway.", 501, "pix_unsupported");
  return { ...(await gw.createPix({ amount, referenceId: randomUUID() })), amount_brl: amount };
}

export async function confirmPixSandbox(input: { account: TopupAccount; userId: string; transactionId: string }) {
  const gw = getPaymentGateway();
  if (gw.name !== "FAKE_SANDBOX" || !gw.parseFakePix) throw new TopupError("Simulação de Pix só existe no ambiente de teste.", 403, "not_sandbox");
  const parsed = gw.parseFakePix(input.transactionId);
  if (!parsed) throw new TopupError("Código Pix inválido.", 422, "invalid_pix");
  return credit(input.account, input.userId, parsed.amount, "pix", gw.name, input.transactionId);
}

// ── Gateway REAL (Pix copia e cola / página segura do cartão) ────────────────────────────────────────────────────────────────────
// O cliente paga fora da Allka; o crédito entra quando o gateway confirma (aviso automático ou consulta). Cada recarga é uma "intenção" com status.
import { adapterFor, publicValuesOf } from "./payment-gateways/config-service";

export const gatewayKeyOf = (adapterName: string) => adapterName.toLowerCase();

async function ownerInfo(account: TopupAccount) {
  const o = account.kind === "company"
    ? await prisma.company.findUnique({ where: { id: account.id }, select: { name: true, email: true, cnpj: true } })
    : await prisma.agency.findUnique({ where: { id: account.id }, select: { name: true, email: true, cnpj: true } });
  return { name: o?.name ?? "Cliente Allka", email: o?.email ?? null, taxId: o?.cnpj ?? null };
}

export async function startHostedTopup(input: { account: TopupAccount; userId: string; amount: number; method: "pix" | "card" }) {
  const amount = checkAmount(input.amount);
  const gw = getPaymentGateway();
  if (!gw.createIntent) throw new TopupError("O gateway ativo não usa pagamento externo.", 422, "not_hosted");
  const key = gatewayKeyOf(gw.name);
  const intent = await prisma.walletTopupIntent.create({ data: { owner_type: input.account.kind, owner_id: input.account.id, user_id: input.userId, method: input.method, amount, gateway: key } });
  try {
    const pub = await publicValuesOf(key);
    const r = await gw.createIntent({
      amount, method: input.method, referenceId: intent.id, description: "Recarga de crédito Allka",
      customer: await ownerInfo(input.account),
      notificationUrl: pub.public_base_url ? `${pub.public_base_url}/api/payment-webhooks/${key}` : undefined,
      redirectUrl: pub.site_base_url,
    });
    return await prisma.walletTopupIntent.update({ where: { id: intent.id }, data: { external_id: r.externalId, pix_copy_paste: r.pixCopyPaste ?? null, redirect_url: r.redirectUrl ?? null, expires_at: r.expiresAt ?? null, status: r.status === "paid" ? "pending" : "pending" } });
  } catch (e: any) {
    await prisma.walletTopupIntent.update({ where: { id: intent.id }, data: { status: "failed" } });
    throw new TopupError(e?.message ?? "Não foi possível gerar a cobrança no gateway.", 502, "gateway_error");
  }
}

/** Marca como paga UMA vez e credita. Seguro para avisos repetidos e para aviso + consulta ao mesmo tempo. */
export async function settleIntent(where: { id?: string; gateway?: string; externalId?: string }, status: "pending" | "paid" | "failed" | "expired") {
  const intent = await prisma.walletTopupIntent.findFirst({ where: where.id ? { id: where.id } : { gateway: where.gateway, external_id: where.externalId } });
  if (!intent) return null;
  if (status === "failed" || status === "expired") { await prisma.walletTopupIntent.updateMany({ where: { id: intent.id, status: "pending" }, data: { status } }); return intent; }
  if (status !== "paid") return intent;
  await prisma.$transaction(async (tx) => {
    const won = await tx.walletTopupIntent.updateMany({ where: { id: intent.id, status: "pending" }, data: { status: "paid", paid_at: new Date() } });
    if (won.count === 0) return; // já tinha sido paga
    const wallet = await findOrCreateWalletTx(tx, intent.owner_type, intent.owner_id);
    await createLedgerEntryTx(tx, {
      walletId: wallet.id, type: "credit", direction: "credit", amount: intent.amount,
      description: intent.method === "pix" ? "Recarga de crédito (Pix)" : "Recarga de crédito (cartão)",
      idempotencyKey: `topup:intent:${intent.id}`, referenceType: "payment", referenceId: intent.id, createdBy: intent.user_id,
      metadata: { method: intent.method, gateway: intent.gateway, external_id: intent.external_id, intent_id: intent.id },
    });
  });
  return prisma.walletTopupIntent.findUnique({ where: { id: intent.id } });
}

/** Estado da recarga para a tela; se ainda pendente, pergunta ao gateway (funciona mesmo sem o aviso automático). */
export async function intentStatusFor(id: string, account: TopupAccount) {
  let intent = await prisma.walletTopupIntent.findUnique({ where: { id } });
  if (!intent || intent.owner_type !== account.kind || intent.owner_id !== account.id) throw new TopupError("Recarga não encontrada.", 404, "not_found");
  if (intent.status === "pending" && intent.external_id) {
    const adapter = await adapterFor(intent.gateway).catch(() => null);
    const st = adapter?.getIntentStatus ? await adapter.getIntentStatus(intent.external_id, intent.id).catch(() => "pending" as const) : "pending";
    if (st !== "pending") intent = (await settleIntent({ id: intent.id }, st)) ?? intent;
    else if (intent.expires_at && intent.expires_at.getTime() < Date.now()) intent = (await settleIntent({ id: intent.id }, "expired")) ?? intent;
  }
  const w = await walletSummary(account);
  return { id: intent.id, status: intent.status, method: intent.method, amount_brl: intent.amount, pix_copy_paste: intent.pix_copy_paste, redirect_url: intent.redirect_url, expires_at: intent.expires_at, balance_brl: w.balance_brl };
}
