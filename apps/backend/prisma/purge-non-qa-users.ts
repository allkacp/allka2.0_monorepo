/**
 * purge-non-qa-users.ts
 *
 * Deixa a base com SOMENTE os 12 usuários QA principais: corrige seus
 * dados (senha, is_active, user_code) e APAGA FISICAMENTE todo o resto —
 * incluindo os perfis dependentes (Agency/PartnerProfile/Nomade/LiderArea)
 * e os registros "folha" que só existem por causa desses perfis
 * (Qualification, WalletTransaction, BankAccount, WithdrawalRequest,
 * PartnerCommission, PartnerWithdrawal, MatchQueueEntry, TermAcceptance,
 * ChatParticipant, ChatMessage, CourseEnrollment).
 *
 * Nunca mexe em Client/ClientLink/Project/Task/Product/TaskTemplate:
 *  - Se a Agency/PartnerProfile a ser removida tiver qualquer ClientLink
 *    real apontando pra ela, o usuário inteiro fica em pendência (nada é
 *    tocado) — mesmo que o schema tecnicamente permita cascade, a regra de
 *    negócio proíbe apagar ClientLink.
 *  - TaskExecution.nomade_id é setado pra NULL (nunca deletado) — preserva
 *    o histórico de execução/projeto, só desvincula o nômade removido.
 *  - Se sobrar uma FK desconhecida/inesperada, a transaction inteira desse
 *    usuário é revertida e ele fica listado como pendência — nunca força.
 *
 * Modo padrão é DRY-RUN. Só executa de verdade com --apply.
 *
 * Execução:
 *   cd apps/backend
 *   npx tsx prisma/purge-non-qa-users.ts --dry-run   (padrão, nada muda)
 *   npx tsx prisma/purge-non-qa-users.ts --apply      (executa de verdade)
 */

import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
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
  { user_code: "User_00001", email: "admin@allka.test", name: "Vinicius Guardia Admin", role: "admin", account_type: "admin" },
  { user_code: "User_00002", email: "agencia@allka.test", name: "Gabriel Franco Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "User_00003", email: "agencia2@allka.test", name: "Teste 2 Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "User_00004", email: "agencia3@allka.test", name: "Teste 3 Agency", role: "agency_admin", account_type: "agencias" },
  { user_code: "User_00005", email: "company@allka.test", name: "Rose Bonifácio Company", role: "company_admin", account_type: "empresas" },
  { user_code: "User_00006", email: "company2@allka.test", name: "Teste 2 Company", role: "company_admin", account_type: "empresas" },
  { user_code: "User_00007", email: "company3@allka.test", name: "Teste 3 Company", role: "company_admin", account_type: "empresas" },
  { user_code: "User_00008", email: "partner@allka.test", name: "Valdério Partner", role: "partner", account_type: "parceiro" },
  { user_code: "User_00009", email: "partner2@allka.test", name: "Teste 2 Partner", role: "partner", account_type: "parceiro" },
  { user_code: "User_00010", email: "partner3@allka.test", name: "Teste 3 Partner", role: "partner", account_type: "parceiro" },
  { user_code: "User_00011", email: "leader@allka.test", name: "Maria Brito Leader", role: "lider", account_type: "lider" },
  { user_code: "User_00012", email: "nomad@allka.test", name: "Reynário Nomad", role: "nomad", account_type: "nomades" },
];
const QA_EMAILS = new Set(QA_USERS.map((u) => u.email));

// Nenhuma conta é protegida além dos 12 QA — cp@lamego.com.vc e as contas
// .com.vc/.exemplo.com/etc. são candidatas normais a exclusão.

type Tx = Prisma.TransactionClient;

interface UserDeps {
  id: string;
  email: string;
  name: string;
  agencyId: string | null;
  partnerProfileId: string | null;
  nomadeId: string | null;
}

async function resolveDeps(u: { id: string; email: string; name: string }): Promise<UserDeps> {
  const [agency, partner, nomade] = await Promise.all([
    prisma.agency.findUnique({ where: { user_id: u.id }, select: { id: true } }),
    prisma.partnerProfile.findUnique({ where: { user_id: u.id }, select: { id: true } }),
    prisma.nomade.findUnique({ where: { user_id: u.id }, select: { id: true } }),
  ]);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    agencyId: agency?.id ?? null,
    partnerProfileId: partner?.id ?? null,
    nomadeId: nomade?.id ?? null,
  };
}

// Detecta se uma tabela existe no banco atual (information_schema), pra
// lidar com schema.prisma tendo model sem a tabela correspondente existir
// de fato no banco (ex.: coupons/coupon_usages em produção). DATABASE()
// resolve pro schema da própria conexão ativa (mesmo banco do DATABASE_URL).
async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ cnt: bigint | number }[]>`
    SELECT COUNT(*) as cnt
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = ${tableName}
  `;
  return Number(rows[0]?.cnt ?? 0) > 0;
}

// Conta quantos ClientLink reais apontam pra essa Agency/Partner — bloqueio
// duro, nunca forçado, mesmo que o schema tecnicamente faça cascade.
async function countClientLinks(deps: UserDeps): Promise<number> {
  const [byAgency, byPartner] = await Promise.all([
    deps.agencyId ? prisma.clientLink.count({ where: { agency_id: deps.agencyId } }) : Promise.resolve(0),
    deps.partnerProfileId ? prisma.clientLink.count({ where: { partner_id: deps.partnerProfileId } }) : Promise.resolve(0),
  ]);
  return byAgency + byPartner;
}

interface DepCount {
  table: string;
  count: number;
  action: string;
}

async function countDependents(deps: UserDeps): Promise<DepCount[]> {
  const results: DepCount[] = [];
  if (deps.nomadeId) {
    const [qual, wallet, bank, withdrawal, taskExec] = await Promise.all([
      prisma.qualification.count({ where: { nomade_id: deps.nomadeId } }),
      prisma.walletTransaction.count({ where: { nomade_id: deps.nomadeId } }),
      prisma.bankAccount.count({ where: { nomade_id: deps.nomadeId } }),
      prisma.withdrawalRequest.count({ where: { nomade_id: deps.nomadeId } }),
      prisma.taskExecution.count({ where: { nomade_id: deps.nomadeId } }),
    ]);
    if (qual) results.push({ table: "qualifications", count: qual, action: "deletar" });
    if (wallet) results.push({ table: "wallet_transactions", count: wallet, action: "deletar" });
    if (bank) results.push({ table: "bank_accounts", count: bank, action: "deletar" });
    if (withdrawal) results.push({ table: "withdrawal_requests", count: withdrawal, action: "deletar" });
    if (taskExec) results.push({ table: "task_executions", count: taskExec, action: "desvincular (nomade_id = NULL, preserva o registro)" });
  }
  if (deps.partnerProfileId) {
    const [comm, pwithdrawal] = await Promise.all([
      prisma.partnerCommission.count({ where: { partner_id: deps.partnerProfileId } }),
      prisma.partnerWithdrawal.count({ where: { partner_profile_id: deps.partnerProfileId } }),
    ]);
    if (comm) results.push({ table: "partner_commissions", count: comm, action: "deletar" });
    if (pwithdrawal) results.push({ table: "partner_withdrawals", count: pwithdrawal, action: "deletar" });
  }
  if (deps.agencyId) {
    const matchQueue = await prisma.matchQueueEntry.count({ where: { agency_id: deps.agencyId } });
    if (matchQueue) results.push({ table: "match_queue_entries", count: matchQueue, action: "deletar" });
  }
  const [terms, chatPart, chatMsg, courseEnroll] = await Promise.all([
    prisma.termAcceptance.count({ where: { user_id: deps.id } }),
    prisma.chatParticipant.count({ where: { user_id: deps.id } }),
    prisma.chatMessage.count({ where: { sender_id: deps.id } }),
    prisma.courseEnrollment.count({ where: { user_id: deps.id } }),
  ]);
  if (terms) results.push({ table: "term_acceptances", count: terms, action: "deletar" });
  if (chatPart) results.push({ table: "chat_participants", count: chatPart, action: "deletar" });
  if (chatMsg) results.push({ table: "chat_messages", count: chatMsg, action: "deletar" });
  if (courseEnroll) results.push({ table: "course_enrollments", count: courseEnroll, action: "deletar" });
  return results;
}

async function cleanupDependents(tx: Tx, deps: UserDeps, couponsTableExists: boolean): Promise<void> {
  if (deps.nomadeId) {
    await tx.qualification.deleteMany({ where: { nomade_id: deps.nomadeId } });
    await tx.walletTransaction.deleteMany({ where: { nomade_id: deps.nomadeId } });
    await tx.bankAccount.deleteMany({ where: { nomade_id: deps.nomadeId } });
    await tx.withdrawalRequest.deleteMany({ where: { nomade_id: deps.nomadeId } });
    await tx.taskExecution.updateMany({ where: { nomade_id: deps.nomadeId }, data: { nomade_id: null } });
  }
  if (deps.partnerProfileId) {
    await tx.partnerCommission.deleteMany({ where: { partner_id: deps.partnerProfileId } });
    await tx.partnerWithdrawal.deleteMany({ where: { partner_profile_id: deps.partnerProfileId } });
  }
  if (deps.agencyId) {
    await tx.matchQueueEntry.deleteMany({ where: { agency_id: deps.agencyId } });
  }
  await tx.termAcceptance.deleteMany({ where: { user_id: deps.id } });
  await tx.chatParticipant.deleteMany({ where: { user_id: deps.id } });
  await tx.chatMessage.deleteMany({ where: { sender_id: deps.id } });
  await tx.courseEnrollment.deleteMany({ where: { user_id: deps.id } });
  // Coupon.linked_user_id é opcional — desvincula em vez de deletar o cupom.
  // Só roda se a tabela coupons existir de fato no banco atual (schema.prisma
  // tem o model, mas em produção a tabela pode não ter sido criada ainda).
  if (couponsTableExists) {
    await tx.coupon.updateMany({ where: { linked_user_id: deps.id }, data: { linked_user_id: null } });
  }
}

async function main() {
  console.log("════════════════════════════════════════════════");
  console.log(APPLY ? "⚠️  MODO APPLY — alterações reais serão feitas" : "🔍 MODO DRY-RUN — nada será alterado");
  console.log("════════════════════════════════════════════════");

  // ── 1-2. Conferir que os 12 existem ──────────────────────────────────────
  const foundUsers: Record<string, { id: string }> = {};
  const missing: string[] = [];
  for (const q of QA_USERS) {
    const u = await prisma.user.findUnique({ where: { email: q.email }, select: { id: true } });
    if (!u) missing.push(q.email);
    else foundUsers[q.email] = u;
  }
  if (missing.length > 0) {
    console.error("\n❌ ABORTADO: usuários QA obrigatórios ausentes:", missing);
    process.exit(1);
  }
  console.log("✅ Os 12 usuários QA existem.");

  // ── 3-4-5-6. Corrigir senha/is_active/user_code/nome/role dos 12 ────────
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

  // ── Identificar usuários fora da lista (SEM proteção nenhuma) ───────────
  const allUsersBefore = await prisma.user.count();
  const nonQaUsers = await prisma.user.findMany({
    where: { email: { notIn: Array.from(QA_EMAILS) } },
    select: { id: true, email: true, name: true },
  });

  console.log("\n════════════════════════════════════════════════");
  console.log("RESOLVENDO DEPENDÊNCIAS DE CADA USUÁRIO FORA DOS 12");
  console.log("════════════════════════════════════════════════");
  console.log("Total de usuários antes:", allUsersBefore);
  console.log("Serão mantidos (QA):", QA_USERS.length);
  console.log("Candidatos a deletar:", nonQaUsers.length);

  const blocked: { email: string; reason: string }[] = [];
  const deletable: UserDeps[] = [];

  for (const u of nonQaUsers) {
    const deps = await resolveDeps(u);
    const clientLinkCount = await countClientLinks(deps);
    if (clientLinkCount > 0) {
      blocked.push({ email: u.email, reason: `${clientLinkCount} ClientLink(s) real(is) vinculado(s) — NÃO será tocado (regra: nunca apagar ClientLink)` });
      console.log(`\n⛔ ${u.email} — BLOQUEADO: ${clientLinkCount} ClientLink real(is). Usuário e perfil ficam intactos.`);
      continue;
    }
    const deps2 = await countDependents(deps);
    if (deps2.length === 0) {
      console.log(`\n✅ ${u.email} — sem dependentes, pode deletar direto.`);
    } else {
      console.log(`\n📋 ${u.email} — dependentes a resolver antes de deletar:`);
      deps2.forEach((d) => console.log(`     - ${d.table}: ${d.count} registro(s) → ${d.action}`));
    }
    deletable.push(deps);
  }

  console.log("\n════════════════════════════════════════════════");
  console.log("RESUMO DO PLANO");
  console.log("════════════════════════════════════════════════");
  console.log("Bloqueados por ClientLink real (não tocados):", blocked.length);
  blocked.forEach((b) => console.log(`   - ${b.email}: ${b.reason}`));
  console.log("Serão deletados (com dependentes resolvidos):", deletable.length);

  if (!APPLY) {
    console.log("\n════════════════════════════════════════════════");
    console.log("DRY-RUN concluído — nada foi alterado no banco.");
    console.log("Rode com --apply para executar de verdade.");
    console.log("════════════════════════════════════════════════");
    return;
  }

  // ── Deletar, um usuário por vez, em transaction própria ─────────────────
  console.log("\n════════════════════════════════════════════════");
  console.log("DELETANDO (--apply)");
  console.log("════════════════════════════════════════════════");

  // schema.prisma tem o model Coupon/CouponUsage, mas nem todo banco (ex.:
  // produção hoje) tem as tabelas coupons/coupon_usages de fato criadas.
  // Checa uma vez, fora do loop por usuário — é um fato do banco, não do
  // usuário sendo processado.
  const couponsTableExists = await tableExists("coupons");
  if (!couponsTableExists) {
    console.log("ℹ️  Tabela coupons não existe neste banco; etapa de desvincular cupons ignorada.");
  }

  const deleted: string[] = [];
  const failed: { email: string; error: string }[] = [];
  const candidateCompanyUsers = await prisma.user.findMany({
    where: { email: { in: nonQaUsers.map((u) => u.email) } },
    select: { email: true, company_id: true },
  });
  const companyIdByEmail = new Map(candidateCompanyUsers.map((u) => [u.email, u.company_id]));

  for (const deps of deletable) {
    try {
      await prisma.$transaction(async (tx) => {
        await cleanupDependents(tx, deps, couponsTableExists);
        await tx.agency.deleteMany({ where: { user_id: deps.id } });
        await tx.partnerProfile.deleteMany({ where: { user_id: deps.id } });
        await tx.nomade.deleteMany({ where: { user_id: deps.id } });
        await tx.liderArea.deleteMany({ where: { user_id: deps.id } });
        await tx.user.delete({ where: { id: deps.id } });
      });
      deleted.push(deps.email);
      console.log(`  ✅ deletado: ${deps.email}`);
    } catch (e: any) {
      failed.push({ email: deps.email, error: e.message });
      console.log(`  ⚠️  PENDÊNCIA (não deletado, FK inesperada — nada foi alterado pra este usuário): ${deps.email} — ${e.message}`);
    }
  }

  // ── Limpeza de Company órfã (só as que sobraram de usuários deletados) ──
  console.log("\n════════════════════════════════════════════════");
  console.log("LIMPEZA DE COMPANIES ÓRFÃS");
  console.log("════════════════════════════════════════════════");
  const protectedCompanyIds = new Set(
    await prisma.user
      .findMany({ where: { email: { in: Array.from(QA_EMAILS) } }, select: { company_id: true } })
      .then((rows) => rows.map((r) => r.company_id).filter((x): x is string => !!x)),
  );
  const candidateCompanyIds = new Set(
    deleted.map((email) => companyIdByEmail.get(email)).filter((x): x is string => !!x),
  );

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
    const clientLinkCount = await prisma.clientLink.count({ where: { company_id: companyId } });
    if (clientLinkCount > 0) {
      console.log(`  ⛔ pulando ${companyId} — tem ${clientLinkCount} ClientLink real (nunca apagar)`);
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
  const activeAfter = await prisma.user.count({ where: { is_active: true } });
  console.log("\n════════════════════════════════════════════════");
  console.log("RESUMO FINAL");
  console.log("════════════════════════════════════════════════");
  console.log("Total de usuários antes:", allUsersBefore);
  console.log("Bloqueados por ClientLink real:", blocked.length);
  console.log("Usuários deletados:", deleted.length);
  console.log("Usuários em pendência (FK inesperada):", failed.length);
  if (failed.length > 0) failed.forEach((f) => console.log(`   - ${f.email}: ${f.error}`));
  console.log("Total de usuários depois:", totalAfter, "| ativos:", activeAfter, "| inativos:", totalAfter - activeAfter);
  console.log("Companies órfãs deletadas:", companiesDeleted.length);
  console.log("Companies em pendência:", companiesFailed.length);
  if (companiesFailed.length > 0) companiesFailed.forEach((f) => console.log(`   - ${f.name} (${f.id}): ${f.error}`));

  if (totalAfter !== QA_USERS.length) {
    console.log(`\n⚠️  Total final (${totalAfter}) ainda não é ${QA_USERS.length}. Veja bloqueados/pendências acima — nenhum foi forçado.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
