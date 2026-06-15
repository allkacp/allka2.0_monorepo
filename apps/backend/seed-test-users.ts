/**
 * seed-test-users.ts
 * Cria os usuários de teste para uso com o seletor de login de dev.
 *
 * Execução: npx tsx seed-test-users.ts
 *
 * Regras:
 *  - Idempotente: usa upsert — não duplica nem apaga usuários existentes.
 *  - Não altera usuários fora desta lista.
 *  - Destinado apenas a ambientes de desenvolvimento.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Este script não pode rodar em produção.");
    process.exit(1);
  }

  const PASSWORD = process.env.SEED_TEST_USER_PASSWORD;
  if (!PASSWORD) {
    console.error("❌ SEED_TEST_USER_PASSWORD não configurado no .env");
    process.exit(1);
  }

  console.log("🌱 Criando/atualizando usuários de teste...\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const users = [
    {
      email: "admin@allka.test",
      name: "Admin Test",
      role: "admin",
      account_type: "admin",
    },
    {
      email: "agencia@allka.test",
      name: "Agency Test",
      role: "agency_admin",
      account_type: "agencias",
    },
    {
      email: "nomade@allka.test",
      name: "Nomad Test",
      role: "nomad",
      account_type: "nomades",
    },
    {
      email: "company@allka.test",
      name: "Company Test",
      role: "company_admin",
      account_type: "empresas",
    },
    {
      email: "partner@allka.test",
      name: "Partner Test",
      role: "partner",
      account_type: "parceiro",
    },
    {
      email: "lider.performance@allka.test",
      name: "Leader Test",
      role: "lider",
      account_type: "lider",
    },
  ];

  for (const u of users) {
    const result = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash: passwordHash,
        is_active: true,
        name: u.name,
        role: u.role,
        account_type: u.account_type,
      },
      create: {
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
        role: u.role,
        account_type: u.account_type,
        is_active: true,
      },
    });
    console.log(`  ✅ ${u.role.padEnd(14)} → ${result.email}`);
  }

  console.log("\n✔  Todos os usuários de teste estão prontos.");
  console.log(`   Senha comum: (definida em SEED_TEST_USER_PASSWORD)\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar usuários de teste:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
