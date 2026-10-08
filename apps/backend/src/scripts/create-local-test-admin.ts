/**
 * Cria (ou atualiza) um administrador master de TESTE no banco LOCAL, só para conferir telas no navegador do app.
 * Recusa rodar fora do banco local (host precisa ser localhost/127.0.0.1/mysql). A senha é gerada na hora e gravada em
 * apps/backend/.test-login.local (não vai para o chat nem para o repositório). Use:  tsx src/scripts/create-local-test-admin.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const EMAIL = "teste.local@allka.test";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = /@([^:/]+)[:/]/.exec(url)?.[1] ?? "";
  if (!["localhost", "127.0.0.1", "mysql"].includes(host)) throw new Error(`Recusado: o banco (${host || "?"}) não é local.`);
  const password = crypto.randomBytes(9).toString("base64url");
  const password_hash = await bcrypt.hash(password, 10);
  const profile = (await prisma.adminProfile.findFirst({ where: { name: "Teste local (P12)" } })) ?? (await prisma.adminProfile.create({ data: { name: "Teste local (P12)", is_master: true, is_active: true } }));
  const data = { name: "Teste local (P12)", password_hash, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: profile.id };
  const existing = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (existing) await prisma.user.update({ where: { id: existing.id }, data });
  else await prisma.user.create({ data: { id: `teste-local-${crypto.randomBytes(4).toString("hex")}`, email: EMAIL, ...data } });
  const out = path.resolve(__dirname, "..", "..", ".test-login.local");
  fs.writeFileSync(out, `email: ${EMAIL}\nsenha: ${password}\n`);
  console.log(`Usuário de teste local pronto (${EMAIL}). Credenciais em apps/backend/.test-login.local`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
