/**
 * wallet-seed.ts
 *
 * Script de população de carteiras em duas passagens:
 *
 * PASSAGEM 1 — Backfill de dados reais:
 *   - Invoice.status="paid"           → crédito na carteira da empresa
 *   - Payment.status="PAGO"           → crédito + débito na carteira da empresa
 *   - WithdrawalRequest.status="pagamento_efetuado" → débito na carteira do nômade
 *
 * PASSAGEM 2 — Demo para carteiras ainda zeradas:
 *   - Se uma carteira continua sem ledger após a passagem 1,
 *     injeta entradas realistas por owner_type (company/nomad/agency/partner).
 *
 * Seguro para reexecutar: usa idempotency_key em todas as entradas.
 */

import { prisma } from "../lib/prisma";
import { findOrCreateWallet, createLedgerEntry } from "../lib/wallet-service";

// ── Deterministic pseudo-random (evita dados completamente aleatórios a cada run) ──
function seed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function between(s: number, min: number, max: number) {
  return Math.round(min + (s % (max - min + 1)));
}

// ── Contadores ──────────────────────────────────────────────────────────────────
let realCredits = 0, realDebits = 0, demoEntries = 0, duplicates = 0, errors = 0;

async function record(
  ownerType: string,
  ownerId: string,
  type: string,
  direction: "credit" | "debit",
  amount: number,
  description: string,
  idKey: string,
  refType?: string,
  refId?: string,
) {
  try {
    const wallet = await findOrCreateWallet(ownerType, ownerId);
    const result = await createLedgerEntry({
      walletId: wallet.id,
      type,
      direction,
      amount,
      description,
      idempotencyKey: idKey,
      referenceType: refType,
      referenceId: refId,
      createdBy: "wallet-seed",
    });
    if (result.duplicate) {
      duplicates++;
    } else {
      direction === "credit" ? realCredits++ : realDebits++;
    }
  } catch (err: any) {
    console.error(`  ✗ ${idKey}: ${err.message}`);
    errors++;
  }
}

// ── Passagem 1: backfill de dados reais ─────────────────────────────────────────
async function backfillReal() {
  // 1a. Faturas pagas → crédito na empresa
  const invoices = await prisma.invoice.findMany({
    where: { status: "paid", company_id: { not: null } },
    select: { id: true, amount: true, company_id: true, invoice_number: true, description: true },
  });
  console.log(`  Faturas pagas encontradas: ${invoices.length}`);
  for (const inv of invoices) {
    if (!inv.company_id) continue;
    const desc = inv.invoice_number
      ? `Fatura #${inv.invoice_number} paga`
      : inv.description
      ? `Fatura paga — ${inv.description}`
      : `Fatura ${inv.id} paga`;
    await record("company", inv.company_id, "payment", "credit", inv.amount, desc,
      `inv_credit_${inv.id}`, "invoice", inv.id);
  }

  // 1b. Pagamentos aprovados → crédito + débito na empresa
  const payments = await prisma.payment.findMany({
    where: { status: "PAGO" },
    include: { project: { select: { id: true, title: true, client_id: true } } },
  });
  console.log(`  Pagamentos aprovados encontrados: ${payments.length}`);
  for (const pay of payments) {
    const clientId = pay.project?.client_id;
    if (!clientId) continue;
    const projectTitle = pay.project?.title || pay.project_id;
    await record("company", clientId, "payment", "credit", pay.amount,
      `Pagamento aprovado — ${projectTitle}`,
      `pay_credit_${pay.id}`, "payment", pay.id);
    await record("company", clientId, "payment", "debit", pay.amount,
      `Débito projeto — ${projectTitle}`,
      `pay_debit_${pay.id}`, "project", pay.project_id);
  }

  // 1c. Saques pagos → débito no nômade
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { status: "pagamento_efetuado" },
    select: { id: true, amount: true, nomade_id: true },
  });
  console.log(`  Saques pagos encontrados: ${withdrawals.length}`);
  for (const wd of withdrawals) {
    await record("nomad", wd.nomade_id, "withdrawal", "debit", wd.amount,
      `Saque efetuado — solicitação ${wd.id}`,
      `wd_debit_${wd.id}`, "withdrawal", wd.id);
  }
}

// ── Passagem 2: dados de demonstração para carteiras zeradas ─────────────────────
async function seedDemo() {
  const wallets = await prisma.wallet.findMany({
    select: { id: true, owner_type: true, owner_id: true, balance: true },
  });

  // Wallets que ainda têm balance=0 e sem ledger após backfill real
  const emptyIds = wallets.filter((w) => w.balance === 0).map((w) => w.id);
  if (emptyIds.length === 0) {
    console.log("  Nenhuma carteira zerada — seed demo não necessário");
    return;
  }
  console.log(`  Carteiras ainda zeradas: ${emptyIds.length} — injetando dados demo`);

  for (const wallet of wallets.filter((w) => emptyIds.includes(w.id))) {
    const { id, owner_type, owner_id } = wallet;
    const s = seed(`${owner_type}:${owner_id}`);

    if (owner_type === "company") {
      // Créditos: plano mensal + projeto avulso
      const planAmt   = between(s,        3_000, 18_000);
      const projAmt   = between(s ^ 0xAA,  500,  12_000);
      const bonusAmt  = between(s ^ 0xBB,  200,   2_000);
      const debitProj = between(s ^ 0xCC,  400,   8_000);

      await record("company", owner_id, "payment",     "credit", planAmt,   "Pagamento plano mensal — cobrança automática", `demo_comp_plan_${id}`, "invoice", id);
      await record("company", owner_id, "payment",     "credit", projAmt,   "Pagamento projeto contratado",                  `demo_comp_proj_${id}`, "project", id);
      await record("company", owner_id, "bonus",       "credit", bonusAmt,  "Bônus de fidelidade concedido pela Allka",      `demo_comp_bonus_${id}`);
      await record("company", owner_id, "payment",     "debit",  debitProj, "Débito projeto em execução",                    `demo_comp_dbt_${id}`,  "project", id);
      demoEntries += 4;

    } else if (owner_type === "nomad") {
      // Créditos: tarefas + comissão; débito: saque
      const task1  = between(s,        800,  5_000);
      const task2  = between(s ^ 0xDD, 400,  3_500);
      const commis = between(s ^ 0xEE, 100,  1_200);
      const saque  = between(s ^ 0xFF, 200,  2_500);

      await record("nomad", owner_id, "commission", "credit", task1,  "Crédito por tarefa concluída",     `demo_nomad_t1_${id}`,  "project", id);
      await record("nomad", owner_id, "commission", "credit", task2,  "Crédito por tarefa concluída",     `demo_nomad_t2_${id}`,  "project", id);
      await record("nomad", owner_id, "commission", "credit", commis, "Comissão extra — performance",     `demo_nomad_cm_${id}`);
      await record("nomad", owner_id, "withdrawal", "debit",  saque,  "Saque solicitado e processado",    `demo_nomad_wd_${id}`,  "withdrawal", id);
      demoEntries += 4;

    } else if (owner_type === "agency") {
      const rev1  = between(s,        5_000, 40_000);
      const rev2  = between(s ^ 0x11, 2_000, 15_000);
      const debit = between(s ^ 0x22, 1_000,  8_000);

      await record("agency", owner_id, "commission", "credit", rev1,  "Receita de projetos gerenciados",  `demo_agency_r1_${id}`, "project", id);
      await record("agency", owner_id, "payment",    "credit", rev2,  "Repasse de plano empresarial",     `demo_agency_r2_${id}`, "invoice", id);
      await record("agency", owner_id, "payment",    "debit",  debit, "Débito operacional",               `demo_agency_dt_${id}`);
      demoEntries += 3;

    } else if (owner_type === "partner") {
      const comm1 = between(s,        300,  8_000);
      const comm2 = between(s ^ 0x33, 100,  3_000);

      await record("partner", owner_id, "commission", "credit", comm1, "Comissão — indicação de empresa",  `demo_part_c1_${id}`, "commission", id);
      await record("partner", owner_id, "commission", "credit", comm2, "Comissão — projeto recorrente",    `demo_part_c2_${id}`, "commission", id);
      demoEntries += 2;

    } else if (owner_type === "platform") {
      const recv = between(s, 50_000, 500_000);
      await record("platform", owner_id, "payment", "credit", recv, "Receita consolidada da plataforma", `demo_plat_${id}`, "adjustment", id);
      demoEntries += 1;
    }
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Wallet Seed — Passagem 1: backfill de dados reais ===");
  await backfillReal();

  console.log("\n=== Wallet Seed — Passagem 2: demo para carteiras zeradas ===");
  await seedDemo();

  console.log(
    `\n✅ Concluído: ${realCredits} créditos reais, ${realDebits} débitos reais,` +
    ` ${demoEntries} entradas demo, ${duplicates} ignoradas (idempotentes), ${errors} erros`,
  );
}

main()
  .catch((err) => { console.error("FATAL:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
