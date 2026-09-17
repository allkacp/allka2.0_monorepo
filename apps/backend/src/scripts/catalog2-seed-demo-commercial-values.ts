/**
 * Item 16.1 (reunião 2026-09-14, "Definições do responsável") — configura,
 * SÓ ONDE FALTAR, valores comerciais demonstrativos para os 36 produtos
 * reais: prazo comercial PROVISÓRIO (nunca sobrescreve `base_commercial_
 * deadline_days` se já estiver definido — esse é o campo REAL, sempre
 * vence quando presente), `delivery_recurrence: "mensal"` e os 4 períodos
 * (mensal/trimestral/semestral/anual) com desconto demonstrativo.
 *
 *   npm run catalog2:seed-demo-commercial -- --dry-run   (padrão)
 *   npm run catalog2:seed-demo-commercial -- --apply
 *
 * Preço em si NÃO precisa de valor demonstrativo — já é calculado a partir
 * de taxa/hora de especialidade × minutos de tarefa (dado real, já
 * configurado) + `Catalog2PricingSettings` (global, já configurado).
 *
 * Contratação avulsa não exige configuração própria — é simplesmente
 * "nenhum período selecionado" no checkout, já suportado sem mudança.
 *
 * Garantia (não desta ferramenta — do motor de preço, `catalog2-pricing.ts`):
 * `commercialReady = !opts.simulateProvisional && quoteBlockers.length === 0`
 * — modo simulação/demonstração NUNCA autoriza cotação, publicação ou
 * contratação real, incondicionalmente. Nenhum preço fictício aqui pode
 * gerar cobrança real.
 */
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";

function arg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const DEMO_DEADLINE_REASON = "Valor demonstrativo (Item 16.1, reunião 2026-09-14) — 2x o esforço interno estimado (mínimo 5 dias úteis), NUNCA revisado comercialmente. Editável na aba \"Custos e preço\" do Cadastro de Produtos.";
const DEMO_DEADLINE_SOURCE = "demo-item16.1";
const WORKDAY_MINUTES = 8 * 60;

// Descontos demonstrativos por período — fictícios, editáveis no painel de
// Precificação a qualquer momento. Mensal sem desconto (é a referência).
const DEMO_PERIODS: Array<{ period: string; months: number; discount_percent: number }> = [
  { period: "mensal", months: 1, discount_percent: 0 },
  { period: "trimestral", months: 3, discount_percent: 5 },
  { period: "semestral", months: 6, discount_percent: 10 },
  { period: "anual", months: 12, discount_percent: 15 },
];

async function main() {
  const apply = arg("apply");
  const mode = apply ? "apply" : "dry_run";
  const dbUrl = process.env.DATABASE_URL;
  assertLocalDatabase(dbUrl);
  const db = new PrismaClient();

  console.log(`▶ Configuração de valores comerciais demonstrativos — modo ${mode.toUpperCase()}`);

  const products = await db.catalog2Product.findMany({
    where: { import_origin: { isNot: null } },
    include: {
      periods: true,
      versions: { orderBy: { version_number: "desc" }, take: 1, include: { tasks: true } },
    },
    orderBy: { slug: "asc" },
  });

  let deadlineSet = 0, deadlineSkipped = 0, recurrenceSet = 0, periodsCreated = 0, periodsSkipped = 0;

  for (const p of products) {
    const v = p.versions[0];
    if (!v) continue;

    // ── Prazo comercial provisório — só se o REAL ainda não existir ──
    if (v.base_commercial_deadline_days == null) {
      if (v.provisional_commercial_deadline_days == null) {
        const totalMinutes = v.tasks.reduce((a, t) => a + (t.estimated_minutes ?? 0), 0);
        const effortDays = totalMinutes > 0 ? Math.ceil(totalMinutes / WORKDAY_MINUTES) : 1;
        const demoDeadline = Math.max(5, effortDays * 2);
        console.log(`  ${p.slug}: prazo provisório = ${demoDeadline} dias (esforço=${effortDays}d)`);
        if (apply) {
          await db.catalog2ProductVersion.update({
            where: { id: v.id },
            data: {
              provisional_commercial_deadline_days: demoDeadline,
              provisional_deadline_reason: DEMO_DEADLINE_REASON,
              provisional_deadline_source: DEMO_DEADLINE_SOURCE,
            },
          });
        }
        deadlineSet++;
      } else {
        deadlineSkipped++; // já tem provisório de antes — nunca sobrescreve silenciosamente
      }
    } else {
      deadlineSkipped++; // já tem prazo REAL — nunca mexe
    }

    // ── delivery_recurrence — só se ainda não estiver definido ──
    if (p.delivery_recurrence == null) {
      if (apply) await db.catalog2Product.update({ where: { id: p.id }, data: { delivery_recurrence: "mensal" } });
      recurrenceSet++;
    }

    // ── Períodos — só cria o que ainda não existe, nunca sobrescreve desconto já configurado ──
    const existingPeriods = new Set(p.periods.map((pp) => pp.period));
    for (const demo of DEMO_PERIODS) {
      if (existingPeriods.has(demo.period)) { periodsSkipped++; continue; }
      if (apply) {
        await db.catalog2ProductPeriod.create({
          data: { product_id: p.id, period: demo.period, months: demo.months, discount_percent: demo.discount_percent, is_active: true },
        });
      }
      periodsCreated++;
    }
  }

  console.log(`\n════════ RESULTADO (${products.length} produtos) ════════`);
  console.log(`  prazo comercial provisório: ${deadlineSet} definidos agora, ${deadlineSkipped} preservados (já tinham real ou provisório)`);
  console.log(`  delivery_recurrence: ${recurrenceSet} definidos como "mensal"`);
  console.log(`  períodos: ${periodsCreated} criados, ${periodsSkipped} preservados (já configurados)`);
  console.log(`\n${apply ? "Aplicado." : "Nada foi gravado — rode com --apply para aplicar."}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
