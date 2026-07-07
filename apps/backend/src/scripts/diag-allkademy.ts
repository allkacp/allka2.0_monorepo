/**
 * DIAGNOSTIC SCRIPT — READ ONLY — NO WRITES — TEMPORÁRIO
 * Finalidade: validar em runtime a segmentação por perfil da Allkademy
 * (coluna audience_profiles, cursos de teste, usuários de teste por perfil).
 * Remover após o diagnóstico.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

const TEST_EMAILS = [
  "admin@allka.test",
  "company@allka.test",
  "agencia@allka.test",
  "nomade@allka.test",
  "lider.performance@allka.test",
  "partner@allka.test",
];

const TEST_TITLES = [
  "Boas práticas de uso da plataforma Allka",
  "Como aprovar entregas e acompanhar projetos na Allka",
  "Gestão de clientes e projetos na Allka",
  "Como executar tarefas e enviar entregas corretamente",
  "Revisão, devolutiva e qualificação de tarefas",
  "Como acompanhar indicações, comissões e saques",
];

async function main() {
  console.log("\n========== DIAGNÓSTICO ALLKADEMY (SOMENTE LEITURA) ==========\n");

  console.log("── Coluna audience_profiles em `courses` ─────────────────────");
  const cols = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'audience_profiles'`,
  );
  console.log(cols.length ? cols : "  ❌ coluna NÃO encontrada");

  console.log("\n── Usuários de teste (email/role/account_type) ────────────────");
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true, role: true, account_type: true },
  });
  for (const email of TEST_EMAILS) {
    const u = users.find((x) => x.email === email);
    console.log(
      u
        ? `  ✔ ${email.padEnd(32)} role=${String(u.role).padEnd(16)} account_type=${u.account_type}`
        : `  ❌ ${email.padEnd(32)} NÃO ENCONTRADO`,
    );
  }

  console.log("\n── Admins reais: role='admin' OU account_type='admin' ────────");
  const admins = await prisma.user.findMany({
    where: { OR: [{ role: "admin" }, { account_type: "admin" }] },
    select: { email: true, role: true, account_type: true },
  });
  for (const a of admins) {
    const mismatch = a.role !== "admin" || a.account_type !== "admin";
    console.log(`  ${mismatch ? "⚠️ " : "✔ "}${a.email.padEnd(32)} role=${String(a.role).padEnd(16)} account_type=${a.account_type}`);
  }

  console.log("\n── Cursos de teste (Allkademy) ─────────────────────────────────");
  const courses = await prisma.course.findMany({
    where: { title: { in: TEST_TITLES } },
    select: { id: true, title: true, audience_profiles: true, is_published: true },
    orderBy: [{ audience_profiles: "asc" }, { title: "asc" }],
  });
  if (!courses.length) {
    console.log("  (nenhum curso de teste encontrado ainda — seed não rodado)");
  } else {
    for (const c of courses) {
      console.log(`  [${c.id}] audience=${c.audience_profiles.padEnd(10)} published=${c.is_published}  ${c.title}`);
    }
  }

  console.log("\n===============================================================\n");
  console.log("✅  Diagnóstico finalizado. Nenhum dado foi alterado.\n");
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
