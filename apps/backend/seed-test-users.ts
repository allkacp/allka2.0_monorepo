/**
 * seed-test-users.ts
 * Cria/atualiza os 6 usuários de teste do seletor de login
 * e suas entidades vinculadas (Agency, Company, Nomade, PartnerProfile, LiderArea).
 *
 * Execução local:  npx tsx seed-test-users.ts
 * Via npm:         npm run db:seed:test-users  (no diretório apps/backend)
 *
 * Regras:
 *  - Idempotente: usa upsert — não duplica nem apaga dados existentes.
 *  - Afeta SOMENTE os 6 e-mails listados em `users` abaixo.
 *  - Sempre atualiza senha, is_active, role e account_type.
 *  - Preserva dados existentes das entidades vinculadas quando possível.
 *  - Em produção, só roda com ALLOW_TEST_USERS_SEED_IN_PRODUCTION=true.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Senha dos usuários de teste — obrigatória, sem fallback hardcoded. Encerra
// antes de qualquer escrita se ausente.
if (!process.env.SEED_TEST_USER_PASSWORD) {
  console.error("❌ SEED_TEST_USER_PASSWORD não definida — obrigatória, sem valor padrão embutido.");
  process.exit(1);
}
const PASSWORD: string = process.env.SEED_TEST_USER_PASSWORD;

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
      name: "Nômade Teste",
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

  // ── 1. Usuários ──────────────────────────────────────────────────────────────
  // update sempre aplica role/account_type esperados para esses 6 usuários de teste.
  const savedUsers: Record<string, { id: string; company_id: string | null }> =
    {};

  for (const u of users) {
    const result = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash: passwordHash,
        is_active: true,
        role: u.role,
        account_type: u.account_type,
      },
      create: {
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
        role: u.role,
        account_type: u.account_type,
        is_active: true,
      },
    });
    savedUsers[u.email] = { id: result.id, company_id: result.company_id };
    console.log(`  ✅ ${u.role.padEnd(14)} → ${result.email}`);
  }

  console.log("\n🔗 Vinculando entidades...\n");

  // ── 2. Agency para agencia@allka.test ────────────────────────────────────────
  {
    const userId = savedUsers["agencia@allka.test"].id;
    await prisma.agency.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        name: "Agency Test",
        email: "agencia@allka.test",
        status: "ativo",
        partner_level: "bronze",
      },
      update: { status: "ativo" },
    });
    console.log("  ✅ Agency          → agencia@allka.test");
  }

  // ── 3. Nomade para nomade@allka.test ─────────────────────────────────────────
  // Upsert por email (UNIQUE no model Nomade). Preserva dados extras existentes.
  {
    const userId = savedUsers["nomade@allka.test"].id;
    await prisma.nomade.upsert({
      where: { email: "nomade@allka.test" },
      create: {
        user_id: userId,
        name: "Nômade Teste",
        email: "nomade@allka.test",
        status: "ativo",
      },
      update: { user_id: userId, status: "ativo" },
    });
    console.log("  ✅ Nomade          → nomade@allka.test");
  }

  // ── 4. Company para company@allka.test ───────────────────────────────────────
  // Company não tem campo único além do id; identifica por email na ausência de company_id.
  {
    const userId = savedUsers["company@allka.test"].id;
    const existingCompanyId = savedUsers["company@allka.test"].company_id;

    let companyId: string;
    if (existingCompanyId) {
      // Usuário já está vinculado — preservar
      companyId = existingCompanyId;
      console.log(
        `  ✅ Company         → company@allka.test (já vinculado id=${companyId})`,
      );
    } else {
      // Buscar pelo email para evitar duplicar em execuções repetidas
      let company = await prisma.company.findFirst({
        where: { email: "company@allka.test" },
      });
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: "Company Test",
            email: "company@allka.test",
            status: "ativo",
          },
        });
        console.log(`  ✅ Company         → criada id=${company.id}`);
      } else {
        console.log(`  ✅ Company         → já existia id=${company.id}`);
      }
      companyId = company.id;
      // Vincular user.company_id
      await prisma.user.update({
        where: { id: userId },
        data: { company_id: companyId },
      });
      console.log("     User.company_id → atualizado");
    }
  }

  // ── 5. PartnerProfile para partner@allka.test ────────────────────────────────
  {
    const userId = savedUsers["partner@allka.test"].id;
    await prisma.partnerProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        status: "active",
        balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      },
      update: { status: "active" },
    });
    console.log("  ✅ PartnerProfile  → partner@allka.test");
  }

  // ── 6. LiderArea para lider.performance@allka.test ───────────────────────────
  // LiderArea não tem unique composto; usa findFirst + create se não existir.
  {
    const userId = savedUsers["lider.performance@allka.test"].id;
    const existing = await prisma.liderArea.findFirst({
      where: { user_id: userId, area_nome: "Performance" },
    });
    if (!existing) {
      await prisma.liderArea.create({
        data: {
          user_id: userId,
          area_nome: "Performance",
          ativo: true,
          categorias_permitidas: JSON.stringify([
            "Performance e Anúncios Patrocinados",
            "Tráfego Pago",
            "SEO",
          ]),
          produtos_permitidos: JSON.stringify([]),
        },
      });
      console.log(
        "  ✅ LiderArea       → criada (Performance) para lider.performance@allka.test",
      );
    } else {
      console.log(
        "  ✅ LiderArea       → já existia (Performance) para lider.performance@allka.test",
      );
    }
  }

  console.log("\n✔  Todos os usuários e vínculos estão prontos.");
  console.log("   Senha comum: (definida em SEED_TEST_USER_PASSWORD — nunca impressa)\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar usuários de teste:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
