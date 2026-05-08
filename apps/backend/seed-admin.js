const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash("123@321", 10);
  // Delete first to ensure clean state
  await p.user.deleteMany({ where: { email: "cp@lamego.com.vc" } });
  const user = await p.user.create({
    data: {
      email: "cp@lamego.com.vc",
      password_hash: hash,
      name: "Vinicius Guardia",
      role: "admin",
      account_type: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  console.log("Usuário criado:", user.email, user.role);
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
