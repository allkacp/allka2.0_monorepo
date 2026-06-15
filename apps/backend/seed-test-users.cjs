// seed-test-users.cjs
// Cria 8 usuários de teste idempotentemente para desenvolvimento.
// Requer: SEED_TEST_USER_PASSWORD no .env

"use strict";

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

if (process.env.NODE_ENV === "production") {
  console.error("❌ Este script não pode rodar em produção.");
  process.exit(1);
}

const DEFAULT_PASSWORD = process.env.SEED_TEST_USER_PASSWORD;
if (!DEFAULT_PASSWORD) {
  console.error("❌ SEED_TEST_USER_PASSWORD não configurado no .env");
  process.exit(1);
}

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function upsertUser({ email, name, role, account_type }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ↩  Já existe: ${email}`);
    return existing;
  }
  const password_hash = await hashPassword(DEFAULT_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      account_type,
      password_hash,
      is_active: true,
    },
  });
  console.log(`  ✓  Criado: ${email} (${role})`);
  return user;
}

async function main() {
  console.log("▶ Seeding test users...");
  console.log(`  Senha: (definida em SEED_TEST_USER_PASSWORD)\n`);

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  await upsertUser({
    email: "admin@allka.test",
    name: "Admin Allka",
    role: "admin",
    account_type: "admin",
  });

  // ── 2. Agência ────────────────────────────────────────────────────────────
  await upsertUser({
    email: "agencia@allka.test",
    name: "Agência Teste",
    role: "agency_admin",
    account_type: "agencias",
  });

  // ── 3. Nômade ─────────────────────────────────────────────────────────────
  const nomadeUser = await upsertUser({
    email: "nomade@allka.test",
    name: "Nômade Teste",
    role: "nomad",
    account_type: "nomades",
  });

  // Garantir que existe registro Nomade com status ativo e level diamond
  const existingNomade = await prisma.nomade.findUnique({
    where: { email: "nomade@allka.test" },
  });
  if (!existingNomade) {
    const nomade = await prisma.nomade.create({
      data: {
        user_id: nomadeUser.id,
        name: "Nômade Teste",
        email: "nomade@allka.test",
        level: "diamond",
        status: "ativo",
        score: 9999,
        tasks_completed_total: 200,
        tasks_completed_quarter: 50,
        terms_accepted: true,
      },
    });
    console.log("  ✓  Nomade record criado (diamond, ativo)");

    // Criar qualificações para todas as categorias principais
    const categories = [
      "Design",
      "Copywriting",
      "SEO",
      "Marketing",
      "Conteúdo",
      "Criativo",
      "Desenvolvimento",
      "Tecnologia",
      "Estratégia",
      "Gestão",
      "Vídeo",
    ];
    for (const category of categories) {
      await prisma.qualification.create({
        data: {
          nomade_id: nomade.id,
          category,
          task: "Geral",
          status: "habilitado",
          test_required: false,
          certification_date: new Date(),
        },
      });
    }
    console.log("  ✓  Qualificações criadas para todas as categorias");
  } else {
    // Update status/level se necessário
    if (existingNomade.status !== "ativo" || existingNomade.level !== "diamond") {
      await prisma.nomade.update({
        where: { id: existingNomade.id },
        data: { status: "ativo", level: "diamond" },
      });
      console.log("  ↩  Nomade atualizado para diamond/ativo");
    } else {
      console.log("  ↩  Nomade já existe (diamond, ativo)");
    }
  }

  // ── 4. Company ────────────────────────────────────────────────────────────
  await upsertUser({
    email: "company@allka.test",
    name: "Company Teste",
    role: "company_user",
    account_type: "empresas",
  });

  // ── 5. Partner ────────────────────────────────────────────────────────────
  await upsertUser({
    email: "partner@allka.test",
    name: "Partner Teste",
    role: "partner",
    account_type: "parceiro",
  });

  // ── 6. Líder de Performance ───────────────────────────────────────────────
  const liderPerf = await upsertUser({
    email: "lider.performance@allka.test",
    name: "Líder de Performance",
    role: "lider",
    account_type: "lider",
  });

  const existingLiderPerfArea = await prisma.liderArea.findFirst({
    where: { user_id: liderPerf.id },
  });
  if (!existingLiderPerfArea) {
    await prisma.liderArea.create({
      data: {
        user_id: liderPerf.id,
        area_nome: "Performance",
        categorias_permitidas: JSON.stringify([
          "Marketing",
          "SEO",
          "Estratégia",
          "Gestão",
        ]),
        ativo: true,
      },
    });
    console.log("  ✓  LiderArea criada: Performance");
  }

  // ── 7. Líder de Design ────────────────────────────────────────────────────
  const liderDesign = await upsertUser({
    email: "lider.design@allka.test",
    name: "Líder de Design",
    role: "lider",
    account_type: "lider",
  });

  const existingLiderDesignArea = await prisma.liderArea.findFirst({
    where: { user_id: liderDesign.id },
  });
  if (!existingLiderDesignArea) {
    await prisma.liderArea.create({
      data: {
        user_id: liderDesign.id,
        area_nome: "Design",
        categorias_permitidas: JSON.stringify([
          "Design",
          "Criativo",
          "Vídeo",
        ]),
        ativo: true,
      },
    });
    console.log("  ✓  LiderArea criada: Design");
  }

  // ── 8. Líder de Conteúdo ──────────────────────────────────────────────────
  const liderConteudo = await upsertUser({
    email: "lider.conteudo@allka.test",
    name: "Líder de Conteúdo",
    role: "lider",
    account_type: "lider",
  });

  const existingLiderConteudoArea = await prisma.liderArea.findFirst({
    where: { user_id: liderConteudo.id },
  });
  if (!existingLiderConteudoArea) {
    await prisma.liderArea.create({
      data: {
        user_id: liderConteudo.id,
        area_nome: "Conteúdo",
        categorias_permitidas: JSON.stringify([
          "Conteúdo",
          "Copywriting",
        ]),
        ativo: true,
      },
    });
    console.log("  ✓  LiderArea criada: Conteúdo");
  }

  console.log("\n✅ Seed de usuários de teste concluído.");
  console.log("   Logins disponíveis (senha: SEED_TEST_USER_PASSWORD):");
  console.log("   admin@allka.test              →  /login");
  console.log("   agencia@allka.test            →  /agencia/login");
  console.log("   nomade@allka.test             →  /nomades/login");
  console.log("   company@allka.test            →  /company/login");
  console.log("   partner@allka.test            →  /parceiro/login");
  console.log("   lider.performance@allka.test  →  /lider/login");
  console.log("   lider.design@allka.test       →  /lider/login");
  console.log("   lider.conteudo@allka.test     →  /lider/login");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
