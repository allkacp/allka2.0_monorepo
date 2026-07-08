/**
 * keep-only-qa-users-active.ts
 *
 * Mantém ativos SOMENTE os 12 usuários QA principais; desativa (is_active =
 * false) todos os demais. NÃO apaga nada — nenhum User, Client, ClientLink,
 * Project, Task, Payment, Wallet etc. é deletado. Não mexe em Client/
 * ClientLink de jeito nenhum. Idempotente: rodar de novo não duplica nada e
 * não reverte nada que já esteja correto.
 *
 * Execução: cd apps/backend && npx tsx prisma/keep-only-qa-users-active.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD || "123456";

interface Expected {
  email: string;
  name: string;
  role: string;
  account_type: string;
}

const QA_USERS: Expected[] = [
  { email: "admin@allka.test", name: "Vinicius Guardia Admin", role: "admin", account_type: "admin" },
  { email: "agencia@allka.test", name: "Gabriel Franco Agency", role: "agency_admin", account_type: "agencias" },
  { email: "agencia2@allka.test", name: "Teste 2 Agency", role: "agency_admin", account_type: "agencias" },
  { email: "agencia3@allka.test", name: "Teste 3 Agency", role: "agency_admin", account_type: "agencias" },
  { email: "company@allka.test", name: "Rose Bonifácio Company", role: "company_admin", account_type: "empresas" },
  { email: "company2@allka.test", name: "Teste 2 Company", role: "company_admin", account_type: "empresas" },
  { email: "company3@allka.test", name: "Teste 3 Company", role: "company_admin", account_type: "empresas" },
  { email: "partner@allka.test", name: "Valdério Partner", role: "partner", account_type: "parceiro" },
  { email: "partner2@allka.test", name: "Teste 2 Partner", role: "partner", account_type: "parceiro" },
  { email: "partner3@allka.test", name: "Teste 3 Partner", role: "partner", account_type: "parceiro" },
  { email: "leader@allka.test", name: "Maria Brito Leader", role: "lider", account_type: "lider" },
  { email: "nomad@allka.test", name: "Reynário Nomad", role: "nomad", account_type: "nomades" },
];
const QA_EMAILS = new Set(QA_USERS.map((u) => u.email));

async function main() {
  const totalBefore = await prisma.user.count();
  const activeBefore = await prisma.user.count({ where: { is_active: true } });
  const inactiveBefore = totalBefore - activeBefore;

  console.log("════════════════════════════════════════════════");
  console.log("ANTES");
  console.log("════════════════════════════════════════════════");
  console.log("Total users:", totalBefore, "| ativos:", activeBefore, "| inativos:", inactiveBefore);

  // ── 1. Conferir que os 12 existem, com nome/role/account_type/senha corretos ──
  console.log("\n════════════════════════════════════════════════");
  console.log("CONFERINDO OS 12 USUÁRIOS QA");
  console.log("════════════════════════════════════════════════");

  const missing: string[] = [];
  const mismatches: string[] = [];
  const badPassword: string[] = [];
  const foundUsers: Record<string, { id: string; password_hash: string }> = {};

  for (const expected of QA_USERS) {
    const user = await prisma.user.findUnique({ where: { email: expected.email } });
    if (!user) {
      missing.push(expected.email);
      console.log(`  ❌ ${expected.email} — NÃO EXISTE`);
      continue;
    }
    foundUsers[expected.email] = { id: user.id, password_hash: user.password_hash };

    const issues: string[] = [];
    if (user.name !== expected.name) issues.push(`name="${user.name}" (esperado "${expected.name}")`);
    if (user.role !== expected.role) issues.push(`role="${user.role}" (esperado "${expected.role}")`);
    if (user.account_type !== expected.account_type) issues.push(`account_type="${user.account_type}" (esperado "${expected.account_type}")`);

    const passwordOk = await bcrypt.compare(PASSWORD, user.password_hash);
    if (!passwordOk) {
      badPassword.push(expected.email);
      issues.push(`senha não bate com "${PASSWORD}"`);
    }

    if (issues.length > 0) {
      mismatches.push(`${expected.email}: ${issues.join("; ")}`);
      console.log(`  ⚠️  ${expected.email} — ${issues.join("; ")}`);
    } else {
      console.log(`  ✅ ${expected.email} — OK`);
    }
  }

  if (missing.length > 0) {
    console.error("\n❌ ABORTADO: os seguintes usuários QA obrigatórios não existem:", missing);
    console.error("   Rode o seed QA (seed-qa-realistic-data.ts) antes deste script.");
    process.exit(1);
  }

  if (badPassword.length > 0) {
    console.error(`\n⚠️  ATENÇÃO: ${badPassword.length} usuário(s) QA com senha diferente de "${PASSWORD}":`, badPassword);
    console.error("   Este script NÃO altera senha automaticamente — relatando e continuando.");
  }

  // ── 2. Garantir vínculo correto dos 12 (sem alterar o que já está certo) ──
  console.log("\n════════════════════════════════════════════════");
  console.log("VERIFICANDO VÍNCULOS DOS 12 (sem alterar Client/ClientLink)");
  console.log("════════════════════════════════════════════════");

  for (const expected of QA_USERS) {
    const userId = foundUsers[expected.email].id;
    if (expected.account_type === "admin") {
      console.log(`  ✅ ${expected.email} — admin não precisa de vínculo`);
      continue;
    }
    if (expected.account_type === "agencias") {
      const agency = await prisma.agency.findUnique({ where: { user_id: userId } });
      console.log(agency ? `  ✅ ${expected.email} — Agency ok (${agency.id})` : `  ❌ ${expected.email} — SEM Agency (não corrigido automaticamente — rode fix-user-profile-links.ts)`);
      continue;
    }
    if (expected.account_type === "empresas") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
      const company = user?.company_id ? await prisma.company.findUnique({ where: { id: user.company_id } }) : null;
      console.log(company ? `  ✅ ${expected.email} — Company ok (${company.id})` : `  ❌ ${expected.email} — company_id ausente/inválido (rode fix-user-profile-links.ts)`);
      continue;
    }
    if (expected.account_type === "parceiro") {
      const partner = await prisma.partnerProfile.findUnique({ where: { user_id: userId } });
      console.log(partner ? `  ✅ ${expected.email} — PartnerProfile ok (${partner.id})` : `  ❌ ${expected.email} — SEM PartnerProfile (rode fix-user-profile-links.ts)`);
      continue;
    }
    if (expected.account_type === "lider") {
      const area = await prisma.liderArea.findFirst({ where: { user_id: userId, ativo: true } });
      console.log(area ? `  ✅ ${expected.email} — LiderArea ativa ok (${area.id})` : `  ❌ ${expected.email} — SEM LiderArea ativa (rode fix-user-profile-links.ts)`);
      continue;
    }
    if (expected.account_type === "nomades") {
      const nomade = await prisma.nomade.findUnique({ where: { user_id: userId } });
      console.log(nomade ? `  ✅ ${expected.email} — Nomade ok (${nomade.id})` : `  ❌ ${expected.email} — SEM Nomade (rode fix-user-profile-links.ts)`);
      continue;
    }
  }

  // ── 3. Manter os 12 ativos ───────────────────────────────────────────────
  await prisma.user.updateMany({
    where: { email: { in: Array.from(QA_EMAILS) } },
    data: { is_active: true },
  });

  // ── 4. Desativar todos os outros ────────────────────────────────────────
  const deactivateResult = await prisma.user.updateMany({
    where: { email: { notIn: Array.from(QA_EMAILS) }, is_active: true },
    data: { is_active: false },
  });

  const totalAfter = await prisma.user.count();
  const activeAfter = await prisma.user.count({ where: { is_active: true } });
  const inactiveAfter = totalAfter - activeAfter;

  console.log("\n════════════════════════════════════════════════");
  console.log("DEPOIS");
  console.log("════════════════════════════════════════════════");
  console.log("Usuários recém-desativados nesta execução:", deactivateResult.count);
  console.log("Total users:", totalAfter, "| ativos:", activeAfter, "| inativos:", inactiveAfter);
  console.log("Usuários ausentes (obrigatórios):", missing.length === 0 ? "nenhum" : missing);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
