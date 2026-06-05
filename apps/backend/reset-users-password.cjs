"use strict";

require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TEMPORARY_PASSWORD = "123456";
const SALT_ROUNDS = 10;

async function main() {
  console.log("🔐 Iniciando reset de senha dos usuários...");
  console.log("   Senha temporária: 123456");

  const passwordHash = await bcrypt.hash(TEMPORARY_PASSWORD, SALT_ROUNDS);

  const result = await prisma.user.updateMany({
    data: {
      password_hash: passwordHash,
      updated_at: new Date(),
    },
  });

  console.log(`✅ ${result.count} usuário(s) atualizado(s) com o novo hash.`);
}

main()
  .catch((error) => {
    console.error("❌ Falha ao redefinir senhas:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });