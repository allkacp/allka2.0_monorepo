"use strict";

require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
// Obrigatória, sem fallback hardcoded — encerra antes de qualquer escrita se ausente.
const TEMPORARY_PASSWORD = process.env.RESET_USERS_PASSWORD;
const SALT_ROUNDS = 10;

async function main() {
  if (!TEMPORARY_PASSWORD) {
    console.error("❌ RESET_USERS_PASSWORD não definida — obrigatória, sem valor padrão embutido.");
    process.exitCode = 1;
    return;
  }
  console.log("🔐 Iniciando reset de senha dos usuários...");
  console.log("   Usando senha definida em RESET_USERS_PASSWORD (nunca impressa)");

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