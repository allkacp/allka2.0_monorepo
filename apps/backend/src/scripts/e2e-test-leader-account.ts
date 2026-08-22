/**
 * Smoke test ao vivo — conta de teste do Líder (leader@lamego.com.vc).
 * Roda contra http://localhost:3001 via API real (login real, sem mocks).
 * Não cria nem apaga nada — só confirma o estado que o seed (prisma/seed.ts)
 * deixou no banco local, e que o classificador de login (ACCESS_TYPE_RULES
 * em src/routes/auth.ts) reconhece essa conta como Líder, não como Nômade.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });
const BASE_URL = "http://localhost:3001/api";
const LEADER_EMAIL = "leader@lamego.com.vc";
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD;

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function section(msg: string) { console.log(`\n─── ${msg} ${"─".repeat(Math.max(0, 60 - msg.length))}`); }

async function apiFetch(path: string, opts: { method?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body: any;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

async function main() {
  console.log("=".repeat(70));
  console.log("  SMOKE TEST — Conta de teste do Líder");
  console.log("=".repeat(70));

  if (!PASSWORD) {
    console.error("❌ SEED_TEST_USER_PASSWORD não configurado no .env");
    process.exit(1);
  }

  section("1. Banco: account_type correto após o seed");
  const dbUser = await prisma.user.findUnique({
    where: { email: LEADER_EMAIL },
    select: { role: true, account_type: true, is_active: true },
  });
  if (dbUser?.role === "lider" && dbUser?.account_type === "lider") {
    pass("role e account_type = \"lider\"");
  } else {
    fail(`esperado role/account_type = "lider", obtido ${JSON.stringify(dbUser)}`);
  }

  section("2. Banco: seed é idempotente (sem duplicar a conta)");
  const count = await prisma.user.count({ where: { email: LEADER_EMAIL } });
  if (count === 1) {
    pass("exatamente 1 registro para o e-mail");
  } else {
    fail(`esperado 1 registro, encontrado ${count}`);
  }

  section("3. Banco: contas comuns não foram promovidas a Líder");
  const admin = await prisma.user.findUnique({
    where: { email: "cp@lamego.com.vc" },
    select: { role: true, account_type: true },
  });
  if (admin?.role === "admin" && admin?.account_type === "admin") {
    pass("cp@lamego.com.vc continua admin — não foi promovido");
  } else {
    fail(`cp@lamego.com.vc mudou inesperadamente: ${JSON.stringify(admin)}`);
  }

  section("4. API: /auth/identify-account classifica como LEADER, não NOMAD");
  const identify = await apiFetch("/auth/identify-account", {
    method: "POST",
    body: { email: LEADER_EMAIL },
  });
  if (identify.body?.accessType === "LEADER") {
    pass("accessType = LEADER");
  } else {
    fail(`accessType = ${JSON.stringify(identify.body?.accessType)} (esperado LEADER)`);
  }

  section("5. API: login real devolve role/account_type corretos");
  const login = await apiFetch("/auth/login", {
    method: "POST",
    body: { email: LEADER_EMAIL, password: PASSWORD },
  });
  if (
    login.status === 200 &&
    login.body?.user?.account_type === "lider" &&
    login.body?.user?.role === "lider"
  ) {
    pass("login OK, user.account_type/role = \"lider\"");
  } else {
    fail(`login retornou status ${login.status}, user=${JSON.stringify(login.body?.user)}`);
  }

  await prisma.$disconnect();

  console.log("\n" + "=".repeat(70));
  if (process.exitCode) {
    console.log("  RESULTADO: FALHOU");
  } else {
    console.log("  RESULTADO: OK");
  }
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exitCode = 1;
});
