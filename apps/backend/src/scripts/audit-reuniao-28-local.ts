// Leitura apenas. Nunca liga a QA/produção, nunca cria carteira ou corrige saldo.
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error("Auditoria permitida somente no MySQL local.");
const db = new PrismaClient();
async function main() {
  const users = await db.user.findMany({ select: { user_code: true, name: true, role: true, is_active: true, agency_id: true, company_id: true }, orderBy: { user_code: "asc" } });
  const companies = await db.company.findMany({ select: { sequence_number: true, name: true, status: true } });
  const agencies = await db.agency.findMany({ select: { sequence_number: true, name: true, status: true } });
  const nomads = await db.nomade.findMany({ select: { name: true, status: true, user: { select: { name: true, is_active: true } }, habilidades: { select: { area: true, categoria_produto: true, ativo: true, disponibilidade: true } } } });
  const product = await db.catalog2Product.findUnique({ where: { sequence_number: 2 }, select: { sequence_number: true, internal_name: true, status: true, published_version_id: true, versions: { select: { id: true, version_number: true, state: true, accepts_multiple_contracts: true, quantity_rules_json: true, tasks: { select: { name: true, steps: { select: { name: true, executor_kind: true, leader_mode: true, first_execution_only: true } } } } }, orderBy: { version_number: "desc" } } } });
  const wallets = await db.wallet.findMany({ include: { ledger: true } });
  const walletAudit = wallets.map((w) => {
    const sum = w.ledger.reduce((s, e) => s + (e.direction === "credit" ? e.amount : -e.amount), 0);
    const invalidEntries = w.ledger.filter((e) => Math.abs(e.balance_after - (e.balance_before + (e.direction === "credit" ? e.amount : -e.amount))) > 0.011).length;
    return { owner_type: w.owner_type, balance: w.balance, blocked: w.blocked_balance, entries: w.ledger.length, difference_from_ledger: Math.round((w.balance - sum) * 100) / 100, invalid_entries: invalidEntries };
  });
  console.log(JSON.stringify({ read_only: true, users, companies, agencies, nomads, product, wallets: walletAudit,
    active_leaders: users.filter((u) => u.is_active && u.role === "lider").length,
    totals: { projects: await db.project.count(), clients: await db.client.count(), products: await db.catalog2Product.count() } }, null, 2));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
