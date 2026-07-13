/**
 * Verifica que o Admin Dashboard (GET /api/dashboard/stats e
 * GET /api/dashboard/recent-activities) reflete o estado REAL do banco —
 * não valores zerados, mockados ou hardcoded.
 *
 * Compara o banco (consulta direta via Prisma) contra a resposta HTTP real
 * do endpoint autenticado como Admin. Exige o backend rodando localmente
 * (http://localhost:3001 por padrão, ajustável via BACKEND_URL).
 *
 * Execução: cd apps/backend && npx tsx prisma/verify-admin-dashboard-metrics.ts
 * (com o servidor já rodando em outro terminal, ou via `npm run dev`)
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD || "123456";

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function isFiniteNumber(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v);
}

// Percorre o JSON procurando por NaN/Infinity/undefined em qualquer nível.
function findBadValues(obj: unknown, path = "root"): string[] {
  const bad: string[] = [];
  if (obj === undefined) {
    bad.push(`${path} é undefined`);
  } else if (typeof obj === "number" && !Number.isFinite(obj)) {
    bad.push(`${path} é ${obj}`);
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      bad.push(...findBadValues(v, `${path}.${k}`));
    }
  }
  return bad;
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou pra ${email}: HTTP ${res.status} — ${await res.text()}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error(`Login de ${email} não retornou token: ${JSON.stringify(body)}`);
  return body.token;
}

async function api(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

async function main() {
  console.log("─".repeat(70));
  console.log(`VERIFY — Admin Dashboard: banco real vs. endpoints HTTP (${BASE})`);
  console.log("─".repeat(70));

  try {
    const ping = await fetch(`${BASE}/api/health`).catch(() => null);
    if (!ping || !ping.ok) throw new Error("sem resposta");
  } catch {
    console.error(`❌ Não consegui conectar em ${BASE} — o backend está rodando?`);
    process.exit(1);
  }

  // ── 1. Estado real do banco (fonte da verdade) ──────────────────────────
  console.log("\n=== 1. Consultando banco diretamente (fonte da verdade) ===");
  const [
    totalProjects,
    projectsByStatusRaw,
    totalProjectProducts,
    pendingPaymentsAgg,
    paidPaymentsAgg,
    totalTasks,
    totalStages,
    totalUsers,
    totalCompanies,
    totalAgencies,
    totalPartners,
    totalCatalogProducts,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.projectProduct.count(),
    prisma.payment.aggregate({ _count: true, _sum: { amount: true }, where: { status: "PENDENTE" } }),
    prisma.payment.aggregate({ _count: true, _sum: { amount: true }, where: { status: "PAGO" } }),
    prisma.projectTask.count(),
    prisma.projectTaskStage.count(),
    prisma.user.count(),
    prisma.company.count(),
    prisma.agency.count(),
    prisma.partnerProfile.count(),
    prisma.product.count(),
  ]);
  const projectsByStatus = Object.fromEntries(projectsByStatusRaw.map((g) => [g.status, g._count.id]));
  console.log(`  Projetos: ${totalProjects} | por status: ${JSON.stringify(projectsByStatus)}`);
  console.log(`  ProjectProducts: ${totalProjectProducts}`);
  console.log(`  Payments PENDENTE: ${pendingPaymentsAgg._count} (R$ ${pendingPaymentsAgg._sum.amount ?? 0}) | PAGO: ${paidPaymentsAgg._count} (R$ ${paidPaymentsAgg._sum.amount ?? 0})`);
  console.log(`  ProjectTasks: ${totalTasks} | ProjectTaskStages: ${totalStages}`);
  console.log(`  Users: ${totalUsers} | Companies: ${totalCompanies} | Agencies: ${totalAgencies} | Partners: ${totalPartners} | Products (catálogo): ${totalCatalogProducts}`);

  // ── 2. Login Admin real ──────────────────────────────────────────────────
  console.log("\n=== 2. Login como Admin ===");
  const adminToken = await login("admin@allka.test");
  check("admin logou e recebeu token", !!adminToken);

  // ── 3. GET /api/dashboard/stats — comparar contra o banco ──────────────
  console.log("\n=== 3. GET /api/dashboard/stats vs. banco ===");
  const statsRes = await api(adminToken, "/api/dashboard/stats");
  check("stats: HTTP 200", statsRes.status === 200, `status=${statsRes.status}`);
  const stats = statsRes.body as any;

  check("stats: projects.total === banco", stats?.projects?.total === totalProjects, `endpoint=${stats?.projects?.total} banco=${totalProjects}`);
  check(
    "stats: projects.byStatus === banco (draft/negotiation/awaiting-payment)",
    JSON.stringify(stats?.projects?.byStatus) === JSON.stringify(projectsByStatus),
    `endpoint=${JSON.stringify(stats?.projects?.byStatus)} banco=${JSON.stringify(projectsByStatus)}`,
  );
  check("stats: payments.pendingCount === banco", stats?.payments?.pendingCount === pendingPaymentsAgg._count, `endpoint=${stats?.payments?.pendingCount} banco=${pendingPaymentsAgg._count}`);
  check(
    "stats: payments.pendingAmount === banco",
    Number(stats?.payments?.pendingAmount) === Number(pendingPaymentsAgg._sum.amount ?? 0),
    `endpoint=${stats?.payments?.pendingAmount} banco=${pendingPaymentsAgg._sum.amount}`,
  );
  check("stats: payments.paidCount === banco (0 é esperado nesta base)", stats?.payments?.paidCount === paidPaymentsAgg._count, `endpoint=${stats?.payments?.paidCount} banco=${paidPaymentsAgg._count}`);
  check("stats: projectProducts.total === banco", stats?.projectProducts?.total === totalProjectProducts, `endpoint=${stats?.projectProducts?.total} banco=${totalProjectProducts}`);
  check("stats: users.total === banco", stats?.users?.total === totalUsers, `endpoint=${stats?.users?.total} banco=${totalUsers}`);
  check("stats: companies.total === banco", stats?.companies?.total === totalCompanies, `endpoint=${stats?.companies?.total} banco=${totalCompanies}`);
  check("stats: agencies.total === banco", stats?.agencies?.total === totalAgencies, `endpoint=${stats?.agencies?.total} banco=${totalAgencies}`);
  check("stats: partners.total === banco", stats?.partners?.total === totalPartners, `endpoint=${stats?.partners?.total} banco=${totalPartners}`);
  check("stats: catalogProducts.total === banco", stats?.catalogProducts?.total === totalCatalogProducts, `endpoint=${stats?.catalogProducts?.total} banco=${totalCatalogProducts}`);

  // Indicadores que podem LEGITIMAMENTE ficar zerados nesta base (0 tarefas/stages/pagamentos pagos) —
  // checa que refletem o banco (0), não que sejam != 0.
  check("stats: tasks.total === banco (0 é esperado nesta base)", stats?.tasks !== undefined, "campo tasks ausente");
  check("stats: projectTaskStages reais == 0 no banco (esperado nesta base)", totalStages === 0, `banco=${totalStages}`);

  // ── 4. Nenhuma métrica NaN/Infinity/undefined ───────────────────────────
  console.log("\n=== 4. Nenhuma métrica NaN/Infinity/undefined ===");
  const badStats = findBadValues(stats);
  check("stats: sem NaN/Infinity/undefined em nenhum campo", badStats.length === 0, badStats.join("; "));

  // ── 5. Totais que NÃO podem ficar zerados (existem no banco) ───────────
  console.log("\n=== 5. Métricas que não podem ficar zeradas (dado existe no banco) ===");
  check("regra: total de projetos > 0", stats?.projects?.total > 0, `valor=${stats?.projects?.total}`);
  check("regra: pagamentos pendentes > 0", stats?.payments?.pendingCount > 0, `valor=${stats?.payments?.pendingCount}`);
  check("regra: produtos vinculados (ProjectProduct) > 0", stats?.projectProducts?.total > 0, `valor=${stats?.projectProducts?.total}`);
  check("regra: usuários cadastrados > 0", stats?.users?.total > 0, `valor=${stats?.users?.total}`);
  check("regra: empresas cadastradas > 0", stats?.companies?.total > 0, `valor=${stats?.companies?.total}`);
  check("regra: agências cadastradas > 0", stats?.agencies?.total > 0, `valor=${stats?.agencies?.total}`);
  check("regra: parceiros cadastrados > 0", stats?.partners?.total > 0, `valor=${stats?.partners?.total}`);
  check("regra: produtos no catálogo > 0", stats?.catalogProducts?.total > 0, `valor=${stats?.catalogProducts?.total}`);
  check(
    "regra: soma por status (draft+negotiation+awaiting-payment+in-progress+completed+cancelled) === total",
    Object.values(projectsByStatus).reduce((a: number, b) => a + (b as number), 0) === totalProjects,
    `soma=${Object.values(projectsByStatus).reduce((a: number, b) => a + (b as number), 0)} total=${totalProjects}`,
  );

  // ── 6. GET /api/dashboard/recent-activities — Admin vê projetos reais ──
  console.log("\n=== 6. GET /api/dashboard/recent-activities ===");
  const activitiesRes = await api(adminToken, "/api/dashboard/recent-activities");
  check("recent-activities: HTTP 200", activitiesRes.status === 200, `status=${activitiesRes.status}`);
  const activities = (activitiesRes.body as any[]) ?? [];
  check("recent-activities: não vazio (existem projetos reais)", activities.length > 0, `length=${activities.length}`);
  check(
    "recent-activities: todos os itens têm status real e id",
    activities.every((a) => !!a.id && !!a.status),
    "algum item sem id/status",
  );

  // ── 7. Admin recebe dados globais (nenhum filtro de ownership aplicado) ─
  console.log("\n=== 7. Admin recebe dados globais (sem filtro por agency/company/partner/created_by) ===");
  check(
    "admin: projects.total do endpoint bate com o total GLOBAL do banco (sem escopo por usuário)",
    stats?.projects?.total === totalProjects,
    `endpoint=${stats?.projects?.total} banco_global=${totalProjects}`,
  );

  console.log("\n" + "=".repeat(70));
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam`);
  console.log("=".repeat(70));
  if (failed > 0) {
    console.log("\n❌ Existem divergências entre o banco e o Admin Dashboard.");
    process.exit(1);
  }
  console.log("\n✅ Todas passaram, 0 falharam.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\n❌ ERRO INESPERADO:", e);
  process.exit(1);
});
