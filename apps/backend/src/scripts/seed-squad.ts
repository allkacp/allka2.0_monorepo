// One-off seed: real SquadConfig + SquadCycle rows for existing companies,
// plus genuine wallet-ledger consumption (via recordWalletEvent, the same
// path used by the real /squad/:id/contract endpoint) so admin/financeiro's
// Squad tab shows real linked numbers instead of an all-zero empty state.
// Safe to re-run — skips entirely if squad_configs already has rows.
import { prisma } from "../lib/prisma";
import { findOrCreateWallet, recordWalletEvent } from "../lib/wallet-service";

function computeCycleDates(billingDay: number, referenceDate = new Date()) {
  const now = referenceDate;
  const year = now.getFullYear();
  const month = now.getMonth();
  let cycleStart: Date;
  if (now.getDate() >= billingDay) {
    cycleStart = new Date(year, month, billingDay);
  } else {
    cycleStart = new Date(year, month - 1, billingDay);
  }
  return { cycleStart };
}

async function main() {
  const existing = await prisma.squadConfig.count();
  if (existing > 0) {
    console.log(`squad_configs already has ${existing} rows — skipping.`);
    return;
  }

  const companyNames = [
    "TechCorp Brasil",
    "Varejo Modas Ltda",
    "Clínica Saúde Total",
    "Imobiliária Nova Casa",
    "Pet Shop Amigo Fiel",
    "Academia FitLife",
    "Magazine Luiza",
  ];

  const companies = await prisma.company.findMany({
    where: { name: { in: companyNames } },
    select: { id: true, name: true },
  });

  if (companies.length === 0) {
    console.log("No matching companies found — nothing to seed.");
    return;
  }

  // [creditLimit, monthlyMinimum, billingDay, paymentTerms, status, consumedFraction]
  const plans: Record<string, [number, number, number, number, string, number]> = {
    "TechCorp Brasil":        [15000, 3000, 10, 10, "active",     0.62],
    "Varejo Modas Ltda":      [8000,  1500, 5,  15, "active",     0.35],
    "Clínica Saúde Total":    [5000,  1000, 20, 10, "active",     0.12],
    "Imobiliária Nova Casa":  [20000, 4000, 15, 10, "active",     0.91],
    "Pet Shop Amigo Fiel":    [4000,  800,  10, 10, "paused",     0.20],
    "Academia FitLife":       [6000,  1200, 8,  10, "delinquent", 1.05],
    "Magazine Luiza":         [50000, 10000, 25, 15, "active",    0.48],
  };

  let created = 0;
  for (const company of companies) {
    const plan = plans[company.name];
    if (!plan) continue;
    const [creditLimit, monthlyMinimum, billingDay, paymentTerms, status, consumedFraction] = plan;

    const config = await prisma.squadConfig.create({
      data: {
        company_id: company.id,
        credit_limit: creditLimit,
        monthly_minimum: monthlyMinimum,
        billing_day: billingDay,
        payment_terms: paymentTerms,
        status,
        started_at: new Date(Date.now() - 90 * 86_400_000),
      },
    });

    await findOrCreateWallet("company", company.id);

    const { cycleStart } = computeCycleDates(billingDay);
    const dueAt = new Date(cycleStart.getTime());
    dueAt.setMonth(dueAt.getMonth() + 1);
    dueAt.setDate(dueAt.getDate() + paymentTerms);

    const cycle = await prisma.squadCycle.create({
      data: {
        squad_config_id: config.id,
        company_id: company.id,
        started_at: cycleStart,
        due_at: dueAt,
        status: "open",
      },
    });

    const consumedAmount = Math.round(creditLimit * consumedFraction * 100) / 100;
    if (consumedAmount > 0) {
      await recordWalletEvent("company", company.id, {
        type: "payment",
        direction: "debit",
        amount: consumedAmount,
        description: `Contratação Squad — ${company.name}`,
        idempotencyKey: `seed_squad_contract_${config.id}`,
        referenceType: "squad_cycle",
        referenceId: cycle.id,
        metadata: { squad_config_id: config.id, squad_cycle_id: cycle.id, seeded: true },
      });

      await prisma.squadCycle.update({
        where: { id: cycle.id },
        data: { total_consumed: consumedAmount },
      });
    }

    created++;
  }

  console.log(`Created ${created} squad_configs (+ wallets + open cycles + real ledger consumption).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
