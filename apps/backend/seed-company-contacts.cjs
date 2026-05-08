/**
 * seed-company-contacts.cjs
 *
 * Garante que toda empresa cadastrada tenha:
 *   - pelo menos 1 usuário vinculado (aparece no dropdown "Cliente")
 *   - pelo menos 1 usuário com role != 'company_user' (aparece no dropdown "Consultor")
 *
 * Idempotente: não cria duplicados, não apaga nada existente.
 * Rodar: node seed-company-contacts.cjs
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Slug seguro para e-mails (remove acentos, espaços → hífen)
function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUser({ email, name, role, phone, companyId, passwordHash }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Se existir mas sem company_id, vincular à empresa
    if (!existing.company_id && companyId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { company_id: companyId },
      });
      return { user: existing, created: false, updated: true };
    }
    return { user: existing, created: false, updated: false };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      account_type: "empresas",
      password_hash: passwordHash,
      phone,
      is_active: true,
      company_id: companyId,
    },
  });
  return { user, created: true, updated: false };
}

async function main() {
  console.log("=== seed-company-contacts ===\n");

  const PASSWORD_HASH = await bcrypt.hash("Teste@123456", 10);

  const companies = await prisma.company.findMany({
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, is_active: true },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log(`Empresas encontradas: ${companies.length}\n`);

  let clientesCreated = 0;
  let consultoresCreated = 0;
  let companiesSemCliente = [];
  let companiesSemConsultor = [];

  for (const company of companies) {
    const slug = slugify(company.name);
    const activeUsers = company.users.filter((u) => u.is_active);
    const hasClient = activeUsers.length > 0;
    const hasConsultant = activeUsers.some((u) => u.role !== "company_user");

    console.log(`📋 ${company.name} [${company.status}]`);
    console.log(`   Usuários ativos: ${activeUsers.length} | Com cliente: ${hasClient} | Com consultor: ${hasConsultant}`);

    // ── 1. Garantir cliente (company_user) ──────────────────────────────────
    if (!hasClient) {
      const email = `cliente+${slug}@allka.test`;
      const { created, updated } = await ensureUser({
        email,
        name: `Contato ${company.name}`,
        role: "company_user",
        phone: "(11) 99999-0001",
        companyId: company.id,
        passwordHash: PASSWORD_HASH,
      });
      if (created) {
        clientesCreated++;
        console.log(`   ✅ Cliente criado: ${email}`);
      } else if (updated) {
        console.log(`   🔗 Cliente vinculado (já existia): ${email}`);
      } else {
        console.log(`   ℹ️  Cliente já existe: ${email}`);
      }
    }

    // ── 2. Garantir consultor/responsável (role != company_user) ────────────
    if (!hasConsultant) {
      const email = `responsavel+${slug}@allka.test`;
      const { created, updated } = await ensureUser({
        email,
        name: `Responsável ${company.name}`,
        role: "company_admin",
        phone: "(11) 99999-0002",
        companyId: company.id,
        passwordHash: PASSWORD_HASH,
      });
      if (created) {
        consultoresCreated++;
        console.log(`   ✅ Consultor criado: ${email}`);
      } else if (updated) {
        console.log(`   🔗 Consultor vinculado (já existia): ${email}`);
      } else {
        console.log(`   ℹ️  Consultor já existe: ${email}`);
      }
    }

    // ── Validação pós-seed ──────────────────────────────────────────────────
    const updatedUsers = await prisma.user.findMany({
      where: { company_id: company.id, is_active: true },
      select: { role: true },
    });
    const stillNoClient = updatedUsers.length === 0;
    const stillNoConsultant = !updatedUsers.some((u) => u.role !== "company_user");

    if (stillNoClient) companiesSemCliente.push(company.name);
    if (stillNoConsultant) companiesSemConsultor.push(company.name);

    console.log();
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("RELATÓRIO FINAL");
  console.log("═══════════════════════════════════════");
  console.log(`Empresas verificadas : ${companies.length}`);
  console.log(`Clientes criados     : ${clientesCreated}`);
  console.log(`Consultores criados  : ${consultoresCreated}`);
  console.log();

  if (companiesSemCliente.length === 0) {
    console.log("✅ Todas as empresas têm pelo menos 1 cliente.");
  } else {
    console.log(`❌ Empresas AINDA sem cliente (${companiesSemCliente.length}):`);
    companiesSemCliente.forEach((n) => console.log(`   - ${n}`));
  }

  if (companiesSemConsultor.length === 0) {
    console.log("✅ Todas as empresas têm pelo menos 1 consultor/responsável.");
  } else {
    console.log(`❌ Empresas AINDA sem consultor (${companiesSemConsultor.length}):`);
    companiesSemConsultor.forEach((n) => console.log(`   - ${n}`));
  }

  console.log("\nSenha de acesso de todos os contatos criados: Teste@123456");
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
