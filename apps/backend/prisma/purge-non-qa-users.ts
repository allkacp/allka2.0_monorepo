/**
 * purge-non-qa-users.ts
 *
 * Deixa a base como se só existissem os 12 usuários QA principais: corrige
 * seus dados (senha, is_active, user_code) e APAGA FISICAMENTE todo o resto,
 * junto dos perfis dependentes (Agency/PartnerProfile/Nomade/LiderArea) que
 * só existem por causa deles. Nunca toca em Client/ClientLink/Project/Task/
 * Payment/Wallet — essas tabelas não são tocadas por este script.
 *
 * Modo padrão é DRY-RUN (não altera nada). Só executa de verdade com
 * --apply explícito.
 *
 * Segurança:
 *  - Nunca deleta nenhum dos 12 QA, nem a Company de nenhum deles.
 *  - Cada delete (usuário + seus perfis dependentes) roda em uma transaction
 *    própria — se alguma FK bloquear, essa transaction inteira é revertida
 *    e o usuário fica como "pendência" (não deletado), sem abortar o script
 *    inteiro nem forçar delete.
 *  - Limpeza de Company órfã (criada só pra um usuário deletado) é uma
 *    etapa separada, também com try/catch por linha — se a Company tiver
 *    Project/Client/Invoice/etc. reais, o delete falha e ela é listada como
 *    pendência, nunca forçada.
 *
 * Execução:
 *   cd apps/backend
 *   npx tsx prisma/purge-non-qa-users.ts --dry-run   (padrão, nada muda)
 *   npx tsx prisma/purge-non-qa-users.ts --apply      (executa de verdade)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD || "123456";
const APPLY = process.argv.includes("--apply");

interface QaUser {
  user_code: string;
  email: string;
  name: string;
  role: string;
  account_type: string;
}

const QA_USERS: QaUser[] = [
  { user_code: "00001", email: "admin@allka.test", name: "Vinicius Guardia Admin", role: "admin", account_type: "admin" },
  { user_code: "00002", email: "agencia@allka.test", name: "Gabriel Franco Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "00003", email: "agencia2@allka.test", name: "Teste 2 Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "00004", email: "agencia3@allka.test", name: "Teste 3 Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "00005", email: "company@allka.test", name: "Rose Bonifácio Company", role: "company_admin", account_type: "empresas" },
  { user_code: "00006", email: "company2@allka.test", name: "Teste 2 Company", role: "company_admin", account_type: "empresas" },
  { user_code: "00007", email: "company3@allka.test", name: "Teste 3 Company", role: "company_admin", account_type: "empresas" },
  { user_code: "00008", email: "partner@allka.test", name: "Valdério Partner", role: "partner", account_type: "parceiro" },
  { user_code: "00009", email: "partner2@allka.test", name: "Teste 2 Partner", role: "partner", account_type: "parceiro" },
  { user_code: "00010", email: "partner3@allka.test", name: "Teste 3 Partner", role: "partner", account_type: "parceiro" },
  { user_code: "00011", email: "leader@allka.test", name: "Maria Brito Leader", role: "lider", account_type: "lider" },
  { user_code: "00012", email: "nomad@allka.test", name: "Reynário Nomad", role: "nomad", account_type: "nomades" },
];
const QA_EMAILS = new Set(QA_USERS.map((u) => u.email));

// Contas reais fora dos 12 QA que NUNCA devem ser deletadas nem alteradas
// por este script — ex.: o login admin real do operador (documentado no
// README), diferente do admin@allka.test (QA).
const PROTECTED_EMAILS = new Set(["cp@lamego.com.vc"]);

async function main() {
  console.log("════════════════════════════════════════════════");
  console.log(APPLY ? "⚠️  MODO APPLY — alterações reais serão feitas" : "🔍 MODO DRY-RUN — nada será alterado");
  console.log("════════════════════════════════════════════════");

  // ── 1-2. Conferir que os 12 existem ──────────────────────────────────────
  const foundUsers: Record<string, { id: string; company_id: string | null }> = {};
  const missing: string[] = [];
  for (const q of QA_USERS) {
    const u = await prisma.user.findUnique({ where: { email: q.email }, select: { id: true, company_id: true } });
    if (!u) {
      missing.push(q.email);
      continue;
    }
    foundUsers[q.email] = u;
  }
  if (missing.length > 0) {
    console.error("\n❌ ABORTADO: usuários QA obrigatórios ausentes:", missing);
    process.exit(1);
  }
  console.log("✅ Os 12 usuários QA existem.");

  // ── 3-4-5. Corrigir senha/is_active/user_code/nome/role dos 12 ──────────
  console.log("\n════════════════════════════════════════════════");
  console.log("CORRIGINDO OS 12 USUÁRIOS QA");
  console.log("════════════════════════════════════════════════");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const q of QA_USERS) {
    if (APPLY) {
      await prisma.user.update({
        where: { email: q.email },
        data: {
          password_hash: passwordHash,
          is_active: true,
          user_code: q.user_code,
          name: q.name,
          role: q.role,
          account_type: q.account_type,
        },
      });
    }
    console.log(`  ${APPLY ? "✅ atualizado" : "[dry-run] iria atualizar"}: ${q.user_code} ${q.email} — senha=${PASSWORD}, is_active=true, name="${q.name}"`);
  }

  // Companies dos 12 QA (protegidas — nunca deletadas)
  const protectedCompanyIds = new Set(
    Object.values(foundUsers).map((u) => u.company_id).filter((x): x is string => !!x),
  );

  // ── 6. Identificar usuários fora da lista ───────────────────────────────
  const allUsersBefore = await prisma.user.count();
  const nonQaUsers = await prisma.user.findMany({
    where: { email: { notIn: [...QA_EMAILS, ...PROTECTED_EMAILS] } },
    select: { id: true, email: true, name: true, company_id: true },
  });

  // ── 7. Relatório antes de deletar ───────────────────────────────────────
  console.log("\n════════════════════════════════════════════════");
  console.log("RELATÓRIO — O QUE SERÁ DELETADO");
  console.log("════════════════════════════════════════════════");
  console.log("Total de usuários antes:", allUsersBefore);
  console.log("Serão mantidos (QA):", QA_USERS.length);
  console.log("Protegidos (não-QA, nunca deletados):", Array.from(PROTECTED_EMAILS).join(", "));
  console.log("Serão deletados:", nonQaUsers.length);
  console.log("\nE-mails que serão deletados:");
  nonQaUsers.forEach((u) => console.log(`  - ${u.email} (${u.name}) id=${u.id}`));

  if (!APPLY) {
    console.log("\n════════════════════════════════════════════════");
    console.log("DRY-RUN concluído — nada foi alterado no banco.");
    console.log("Rode com --apply para executar de verdade.");
    console.log("════════════════════════════════════════════════");
    return;
  }

  // ── 8. Deletar fisicamente, por usuário, em transaction individual ─────
  console.log("\n════════════════════════════════════════════════");
  console.log("DELETANDO (--apply)");
  console.log("════════════════════════════════════════════════");

  const deleted: string[] = [];
  const failed: { email: string; error: string }[] = [];
  const candidateCompanyIds = new Set<string>();

  for (const u of nonQaUsers) {
    if (u.company_id) candidateCompanyIds.add(u.company_id);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.agency.deleteMany({ where: { user_id: u.id } });
        await tx.partnerProfile.deleteMany({ where: { user_id: u.id } });
        await tx.nomade.deleteMany({ where: { user_id: u.id } });
        await tx.liderArea.deleteMany({ where: { user_id: u.id } });
        await tx.user.delete({ where: { id: u.id } });
      });
      deleted.push(u.email);
      console.log(`  ✅ deletado: ${u.email}`);
    } catch (e: any) {
      failed.push({ email: u.email, error: e.message });
      console.log(`  ⚠️  PENDÊNCIA (não deletado, bloqueado por FK): ${u.email} — ${e.message}`);
    }
  }

  // ── Limpeza de Company órfã (só as que sobraram de usuários deletados) ──
  console.log("\n════════════════════════════════════════════════");
  console.log("LIMPEZA DE COMPANIES ÓRFÃS");
  console.log("════════════════════════════════════════════════");
  const companiesDeleted: string[] = [];
  const companiesFailed: { id: string; name: string; error: string }[] = [];

  for (const companyId of candidateCompanyIds) {
    if (protectedCompanyIds.has(companyId)) {
      console.log(`  ⏭️  pulando ${companyId} — é Company de um dos 12 QA`);
      continue;
    }
    const remainingUsers = await prisma.user.count({ where: { company_id: companyId } });
    if (remainingUsers > 0) {
      console.log(`  ⏭️  pulando ${companyId} — ainda tem ${remainingUsers} usuário(s) vinculado(s)`);
      continue;
    }
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
    if (!company) continue;
    try {
      await prisma.company.delete({ where: { id: companyId } });
      companiesDeleted.push(companyId);
      console.log(`  ✅ Company deletada: ${company.name} (${companyId})`);
    } catch (e: any) {
      companiesFailed.push({ id: companyId, name: company.name, error: e.message });
      console.log(`  ⚠️  PENDÊNCIA (Company não deletada, tem dependências reais): ${company.name} (${companyId}) — ${e.message}`);
    }
  }

  // ── Resumo final ─────────────────────────────────────────────────────────
  const totalAfter = await prisma.user.count();
  console.log("\n════════════════════════════════════════════════");
  console.log("RESUMO FINAL");
  console.log("════════════════════════════════════════════════");
  console.log("Total de usuários antes:", allUsersBefore);
  console.log("Usuários deletados:", deleted.length);
  console.log("Usuários em pendência (não deletados):", failed.length);
  if (failed.length > 0) failed.forEach((f) => console.log(`   - ${f.email}: ${f.error}`));
  console.log("Total de usuários depois:", totalAfter);
  console.log("Companies órfãs deletadas:", companiesDeleted.length);
  console.log("Companies em pendência:", companiesFailed.length);
  if (companiesFailed.length > 0) companiesFailed.forEach((f) => console.log(`   - ${f.name} (${f.id}): ${f.error}`));
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
