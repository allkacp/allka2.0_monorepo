/**
 * seed-demo-project-billing.ts
 * Cria faturas (Invoice) e pagamentos (Payment) de demonstração para os projetos seed.
 *
 * IDEMPOTENTE: usa invoice_number único por projeto para upsert.
 * NÃO usa dados financeiros reais.
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-billing -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-billing
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Hash determinístico ────────────────────────────────────────────────────────
function dh(idx: number, seed: number = 1): number {
  return ((idx * 2654435761 + seed * 40503) >>> 0);
}
function inRange(idx: number, min: number, max: number, seed: number = 1): number {
  if (min >= max) return min;
  return min + (dh(idx, seed) % (max - min + 1));
}

// ── Contagem de invoices por status ──────────────────────────────────────────
function invoiceCount(status: string, projIdx: number): number {
  switch (status) {
    case "draft":
    case "negotiation":
      return 0;
    case "awaiting-payment":
      return 1;
    case "planning":
      return inRange(projIdx, 1, 2, 20);
    case "in-progress":
      return inRange(projIdx, 2, 4, 21);
    case "paused":
      return inRange(projIdx, 1, 3, 22);
    case "completed":
      return inRange(projIdx, 3, 6, 23);
    default:
      return 1;
  }
}

// ── Status da fatura ──────────────────────────────────────────────────────────
function invoiceStatus(
  projStatus: string,
  invIdx: number,
  projIdx: number,
  totalInvoices: number,
): string {
  const seed = projIdx * 100 + invIdx;

  if (projStatus === "completed") return "paid";
  if (projStatus === "awaiting-payment") return "pending";
  if (projStatus === "planning") {
    return dh(seed, 30) % 2 === 0 ? "paid" : "pending";
  }
  if (projStatus === "in-progress") {
    // Primeiras pagas, última pode ser pending/overdue
    if (invIdx < totalInvoices - 1) return "paid";
    return dh(seed, 31) % 3 === 0 ? "overdue" : "pending";
  }
  if (projStatus === "paused") {
    if (invIdx === 0) return "paid";
    return dh(seed, 32) % 2 === 0 ? "overdue" : "pending";
  }
  return "pending";
}

// ── Valor da fatura (múltiplos de 50 entre 500 e 5000) ───────────────────────
function invoiceAmount(projIdx: number, invIdx: number): number {
  const base = inRange(projIdx * 10 + invIdx, 500, 5000, 40);
  return Math.round(base / 50) * 50;
}

// ── Datas ──────────────────────────────────────────────────────────────────────
function dueDate(projIdx: number, invIdx: number, totalInvoices: number): Date {
  // Espalha faturas mensalmente, as mais recentes primeiro no array
  const monthsAgo = (totalInvoices - 1 - invIdx);
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(inRange(projIdx, 5, 28, 50));
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n💰 Seed Demo Project Billing — ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const projects = await prisma.project.findMany({
    select: { id: true, status: true, client_id: true },
    orderBy: { created_at: "asc" },
  });

  let createdInv = 0;
  let updatedInv = 0;
  let createdPay = 0;
  let skipped = 0;

  for (let projIdx = 0; projIdx < projects.length; projIdx++) {
    const proj = projects[projIdx];
    const count = invoiceCount(proj.status, projIdx);

    if (count === 0) {
      skipped++;
      continue;
    }

    for (let invIdx = 0; invIdx < count; invIdx++) {
      const invNum = `INV-DEMO-${proj.id.slice(-6).toUpperCase()}-${String(invIdx + 1).padStart(3, "0")}`;
      const status = invoiceStatus(proj.status, invIdx, projIdx, count);
      const amount = invoiceAmount(projIdx, invIdx);
      const due = dueDate(projIdx, invIdx, count);
      const paidAt = status === "paid" ? new Date(due.getTime() - 2 * 24 * 60 * 60 * 1000) : null;

      const descriptions: string[] = [
        "Mensalidade de serviços — gestão de campanhas digitais",
        "Fatura mensal — produção de conteúdo e SEO",
        "Cobrança mensal — social media e analytics",
        "Serviços de marketing digital — gestão e relatórios",
        "Mensalidade — tráfego pago e otimização de anúncios",
        "Fatura referente à produção de identidade visual",
      ];
      const desc = descriptions[(projIdx * 10 + invIdx) % descriptions.length];

      if (DRY_RUN) {
        console.log(`  [DRY] ${proj.id} | ${invNum} | R$${amount} | ${status} | venc ${due.toLocaleDateString("pt-BR")}`);
        createdInv++;
        continue;
      }

      const existing = await prisma.invoice.findFirst({
        where: { project_id: proj.id, invoice_number: invNum },
      });

      if (existing) {
        await prisma.invoice.update({
          where: { id: existing.id },
          data: { amount, status, due_date: due, paid_at: paidAt, description: desc },
        });
        updatedInv++;
        console.log(`  ↺ updated ${proj.id} | ${invNum} | R$${amount} | ${status}`);

        // Criar pagamento se paid e não existe
        if (status === "paid") {
          const payExists = await prisma.payment.findFirst({
            where: { project_id: proj.id, notes: invNum },
          });
          if (!payExists) {
            await prisma.payment.create({
              data: {
                project_id: proj.id,
                amount,
                payment_method: "CARTAO_TESTE",
                status: "PAGO",
                gateway: "FAKE_SANDBOX",
                paid_at: paidAt!,
                notes: invNum,
              },
            });
            createdPay++;
          }
        }
      } else {
        await prisma.invoice.create({
          data: {
            project_id: proj.id,
            company_id: proj.client_id,
            invoice_number: invNum,
            amount,
            status,
            due_date: due,
            paid_at: paidAt,
            description: desc,
          },
        });
        createdInv++;
        console.log(`  ✓ criado  ${proj.id} | ${invNum} | R$${amount} | ${status}`);

        // Criar pagamento para faturas pagas
        if (status === "paid") {
          await prisma.payment.create({
            data: {
              project_id: proj.id,
              amount,
              payment_method: "CARTAO_TESTE",
              status: "PAGO",
              gateway: "FAKE_SANDBOX",
              paid_at: paidAt!,
              notes: invNum,
            },
          });
          createdPay++;
        }
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   Projetos processados : ${projects.length}`);
  console.log(`   Faturas criadas      : ${createdInv}`);
  console.log(`   Faturas atualizadas  : ${updatedInv}`);
  console.log(`   Pagamentos criados   : ${createdPay}`);
  console.log(`   Projetos sem fatura  : ${skipped}`);
  if (DRY_RUN) console.log("\n   ⚠️  DRY RUN — nenhuma alteração feita.");
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
