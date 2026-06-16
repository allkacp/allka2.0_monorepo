/**
 * seed-wallets.ts
 * Cria uma carteira para cada entidade cadastrada que ainda não tem uma.
 * Uso: npx tsx seed-wallets.ts
 */
import { prisma } from "./src/lib/prisma";

async function main() {
  let created = 0;
  let skipped = 0;

  async function ensure(owner_type: string, owner_id: string, label: string) {
    const existing = await prisma.wallet.findUnique({
      where: { owner_type_owner_id: { owner_type, owner_id } },
    });
    if (existing) { skipped++; return; }
    await prisma.wallet.create({ data: { owner_type, owner_id, balance: 0, status: "active" } });
    console.log(`  ✓ ${owner_type.padEnd(10)} ${owner_id.padEnd(30)} ${label}`);
    created++;
  }

  console.log("\n── Carteira da Plataforma ──────────────────────────────────");
  await ensure("platform", "platform", "Allka Plataforma");

  console.log("\n── Empresas ────────────────────────────────────────────────");
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  for (const c of companies) await ensure("company", c.id, c.name);

  console.log("\n── Agências ────────────────────────────────────────────────");
  const agencies = await prisma.agency.findMany({ select: { id: true, name: true } });
  for (const a of agencies) await ensure("agency", a.id, a.name);

  console.log("\n── Nômades ─────────────────────────────────────────────────");
  const nomads = await prisma.nomade.findMany({ select: { id: true, name: true } });
  for (const n of nomads) await ensure("nomad", n.id, n.name);

  console.log("\n── Parceiros ───────────────────────────────────────────────");
  const partners = await prisma.partnerProfile.findMany({
    select: { id: true, user: { select: { name: true } } },
  });
  for (const p of partners) await ensure("partner", p.id, p.user?.name ?? p.id);

  console.log(`\n✅ Concluído: ${created} carteiras criadas, ${skipped} já existiam.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
