/**
 * Seed: dados coerentes para teste do fluxo de criação de projeto.
 *
 * Idempotente — pode ser executado múltiplas vezes com segurança:
 *  • NÃO apaga empresas, clientes ou consultores existentes.
 *  • NÃO duplica registros: pula tudo o que já existe.
 *
 * O que faz:
 *  1. Para cada Company sem usuário vinculado, cria 1 usuário de contato
 *     (papel company_admin, status ativo) — funciona como "cliente" no
 *     fluxo de projeto (vínculo Company.users).
 *  2. Garante que existam 3 consultores Allka (admins) ativos para
 *     selecionar como responsável de projeto.
 *
 * Execução:  npx tsx prisma/seed-test-data.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Slugifica um nome para virar parte de email/username. */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Gera telefone fictício mas com formato válido (DDD 11). */
function fakePhone(seed: number): string {
  const n = String(10000 + (seed % 90000)).padStart(4, "0").slice(0, 4);
  return `(11) 9${n}-${String(1000 + (seed % 9000)).slice(0, 4)}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seed: dados coerentes para teste do fluxo de projeto\n");

  const passwordHash = await bcrypt.hash("Allka@2026", 10);

  // ── 1. Cliente por empresa ───────────────────────────────────────────────
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      cnpj: true,
      email: true,
      phone: true,
      _count: { select: { users: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`📊 ${companies.length} empresas cadastradas no ambiente.`);

  let createdContacts = 0;
  let skippedContacts = 0;

  for (const co of companies) {
    if (co._count.users > 0) {
      skippedContacts++;
      continue;
    }

    const slug = slugify(co.name) || `empresa-${co.id.slice(0, 6)}`;
    const baseEmail = `contato@${slug}.test.allka`;
    const username = `contato-${slug}`.slice(0, 40);

    // Garante unicidade caso já exista um email/username solto
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: baseEmail }, { username }] },
      select: { id: true },
    });
    if (exists) {
      skippedContacts++;
      continue;
    }

    const seedNum =
      co.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 1;

    await prisma.user.create({
      data: {
        email: baseEmail,
        username,
        password_hash: passwordHash,
        name: `Responsável ${co.name}`.slice(0, 80),
        role: "company_admin",
        account_type: "empresas",
        is_active: true,
        phone: co.phone || fakePhone(seedNum),
        position: "Responsável de Conta",
        company_id: co.id,
      },
    });

    createdContacts++;
    console.log(`  ✓ Contato criado para "${co.name}" (${baseEmail})`);
  }

  console.log(
    `\n👥 Contatos: ${createdContacts} criados, ${skippedContacts} já existentes.`,
  );

  // ── 2. Consultores Allka (responsáveis de projeto) ───────────────────────
  const consultantDefs = [
    {
      email: "consultor01@allka.test",
      username: "consultor-allka-01",
      name: "Consultor Allka 01",
      phone: "(11) 90000-0001",
    },
    {
      email: "consultor02@allka.test",
      username: "consultor-allka-02",
      name: "Consultor Allka 02",
      phone: "(11) 90000-0002",
    },
    {
      email: "consultor03@allka.test",
      username: "consultor-allka-03",
      name: "Consultor Allka 03",
      phone: "(11) 90000-0003",
    },
  ];

  let createdConsultants = 0;
  let skippedConsultants = 0;

  for (const def of consultantDefs) {
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: def.email }, { username: def.username }] },
      select: { id: true },
    });
    if (exists) {
      skippedConsultants++;
      continue;
    }

    await prisma.user.create({
      data: {
        email: def.email,
        username: def.username,
        password_hash: passwordHash,
        name: def.name,
        role: "admin",
        account_type: "admin",
        is_active: true,
        phone: def.phone,
        position: "Consultor Responsável",
      },
    });

    createdConsultants++;
    console.log(`  ✓ ${def.name} criado (${def.email})`);
  }

  console.log(
    `\n🧑‍💼 Consultores Allka: ${createdConsultants} criados, ${skippedConsultants} já existentes.`,
  );

  console.log("\n✅ Seed concluído.\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
