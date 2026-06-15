/**
 * seed-test-users.ts
 * Cria/atualiza APENAS os 6 usuários de teste do seletor de login.
 *
 * Execução local:  npx tsx seed-test-users.ts
 *
 * Regras:
 *  - Idempotente: usa upsert — não duplica nem apaga usuários existentes.
 *  - Afeta SOMENTE os e-mails listados em `users` abaixo.
 *  - Sempre atualiza a senha, mesmo se o usuário já existir.
 *  - Preserva role/account_type de usuários já existentes.
 *  - Em produção, só roda com ALLOW_TEST_USERS_SEED_IN_PRODUCTION=true.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Senha dos usuários de teste. Fallback "123456" se a env não estiver definida.
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD || "123456";

async function main() {
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_TEST_USERS_SEED_IN_PRODUCTION !== "true") {
      console.error(
        "❌ Bloqueado em produção.\n" +
          "   Para criar/atualizar os usuários de teste em produção, defina:\n" +
          "   ALLOW_TEST_USERS_SEED_IN_PRODUCTION=true",
      );
      process.exit(1);
    }
    console.warn(
      "⚠️  Rodando seed de usuários de teste em PRODUÇÃO (flag habilitada).",
    );
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
      // Usuário existente: só atualiza senha e reativa.
      // role/account_type/name são preservados.
      update: {
        password_hash: passwordHash,
        is_active: true,
      },
      // Usuário novo: cria com os dados mínimos do padrão.
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
  console.log(`   Senha comum: ${PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar usuários de teste:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
