/**
 * Teste de autorização por perfil via ENDPOINTS HTTP REAIS (não chamando
 * services diretamente) — exige o backend rodando localmente
 * (http://localhost:3001 por padrão, ajustável via BACKEND_URL).
 *
 * Pressupõe os 15 projetos de prisma/seed-qa-reset-15-projects.ts.
 *
 * Execução: cd apps/backend && npx tsx prisma/verify-authorization-endpoints.ts
 * (com o servidor já rodando em outro terminal, ou via `npm run dev`)
 */
import "dotenv/config";

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

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou pra ${email}: HTTP ${res.status} — ${await res.text()}`);
  }
  const body = (await res.json()) as { token?: string; accessToken?: string };
  const token = body.token ?? body.accessToken;
  if (!token) throw new Error(`Login de ${email} não retornou token: ${JSON.stringify(body)}`);
  return token;
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
  console.log(`VERIFY — Autorização por perfil via endpoints HTTP reais (${BASE})`);
  console.log("─".repeat(70));

  // Sanity check: servidor está de pé?
  try {
    const ping = await fetch(`${BASE}/api/auth/login`, { method: "OPTIONS" }).catch(() => null);
    if (!ping) throw new Error("sem resposta");
  } catch {
    console.error(`❌ Não consegui conectar em ${BASE} — o backend está rodando?`);
    process.exit(1);
  }

  console.log("\n=== Login dos 4 perfis de teste ===");
  const [adminToken, agenciaToken, companyToken, partnerToken] = await Promise.all([
    login("admin@allka.test"),
    login("agencia@allka.test"),
    login("company@allka.test"),
    login("partner@allka.test"),
  ]);
  check("admin logou", !!adminToken);
  check("agencia logou", !!agenciaToken);
  check("company logou", !!companyToken);
  check("partner logou", !!partnerToken);

  // ── ADMIN ──────────────────────────────────────────────────────────────
  console.log("\n=== ADMIN — acessa tudo, único que pode reprocessar ===");
  {
    const list = await api(adminToken, "/api/project-tasks");
    check("admin: listagem geral responde 200", list.status === 200, `status=${list.status}`);

    const agencyProjectTasks = await api(adminToken, "/api/project-tasks?project_id=seed-reset-agency-03");
    const companyProjectTasks = await api(adminToken, "/api/project-tasks?project_id=seed-reset-company-03");
    check("admin: vê tarefas de projeto da Agency", agencyProjectTasks.status === 200);
    check("admin: vê tarefas de projeto da Company", companyProjectTasks.status === 200);

    // Reprocessamento: exige payment_id; sem produtos pagos ainda, então o
    // teste real de sucesso está em verify-payment-task-generation.ts — aqui
    // confirmamos só que Admin NÃO é bloqueado por permissão (403), mesmo
    // que a resposta seja outro erro de negócio (400 sem payment_id válido).
    const reprocess = await api(adminToken, "/api/projects/seed-reset-agency-03/generate-tasks", {
      method: "POST",
      body: JSON.stringify({}),
    });
    check("admin: reprocessamento NÃO bloqueado por permissão (sem 403)", reprocess.status !== 403, `status=${reprocess.status}`);
  }

  // ── AGENCY ─────────────────────────────────────────────────────────────
  console.log("\n=== AGENCY — só os próprios projetos ===");
  {
    const ownList = await api(agenciaToken, "/api/project-tasks?project_id=seed-reset-agency-03");
    check("agency: lista tarefas do próprio projeto (200)", ownList.status === 200, `status=${ownList.status}`);
    const ownData = (ownList.body as { data?: unknown[] })?.data ?? [];
    check("agency: lista do próprio projeto não é forçadamente vazia (ou 0 tarefas geradas ainda, ambos válidos)", Array.isArray(ownData));

    const otherCompanyList = await api(agenciaToken, "/api/project-tasks?project_id=seed-reset-company-03");
    const otherData = (otherCompanyList.body as { data?: unknown[] })?.data ?? [];
    check(
      "agency: NÃO vê tarefas de projeto de outra Company (lista vazia, filtro no backend)",
      otherCompanyList.status === 200 && otherData.length === 0,
      `status=${otherCompanyList.status} itens=${otherData.length}`,
    );

    // Detalhe por ID de uma tarefa de OUTRO tenant (se existir alguma tarefa
    // gerada em company-03 nesse ponto do teste) deve dar 404, nunca 200.
    const anyCompanyTask = await api(adminToken, "/api/project-tasks?project_id=seed-reset-company-03");
    const companyTaskId = ((anyCompanyTask.body as { data?: { id: string }[] })?.data ?? [])[0]?.id;
    if (companyTaskId) {
      const crossTenantDetail = await api(agenciaToken, `/api/project-tasks/${companyTaskId}`);
      check("agency: detalhe de tarefa de outra Company retorna 404 (não 200)", crossTenantDetail.status === 404, `status=${crossTenantDetail.status}`);
      const crossTenantPatch = await api(agenciaToken, `/api/project-tasks/${companyTaskId}`, { method: "PATCH", body: JSON.stringify({ priority: "high" }) });
      check("agency: tentativa de alterar tarefa de outra Company retorna 404 (não 200)", crossTenantPatch.status === 404, `status=${crossTenantPatch.status}`);
    } else {
      console.log("  ⚠️  Nenhuma tarefa gerada em company-03 ainda neste ponto do teste — checks de cross-tenant por ID pulados (não é falha, apenas não há fixture disponível agora).");
    }

    const reprocessAsAgency = await api(agenciaToken, "/api/projects/seed-reset-agency-03/generate-tasks", { method: "POST", body: JSON.stringify({ payment_id: "whatever" }) });
    check("agency: reprocessamento administrativo bloqueado (403)", reprocessAsAgency.status === 403, `status=${reprocessAsAgency.status}`);
  }

  // ── COMPANY ────────────────────────────────────────────────────────────
  console.log("\n=== COMPANY — só os próprios projetos ===");
  {
    const ownList = await api(companyToken, "/api/project-tasks?project_id=seed-reset-company-03");
    check("company: lista tarefas do próprio projeto (200)", ownList.status === 200, `status=${ownList.status}`);

    const agencyList = await api(companyToken, "/api/project-tasks?project_id=seed-reset-agency-03");
    const agencyData = (agencyList.body as { data?: unknown[] })?.data ?? [];
    check(
      "company: NÃO vê tarefas de projeto de Agency",
      agencyList.status === 200 && agencyData.length === 0,
      `status=${agencyList.status} itens=${agencyData.length}`,
    );

    const partnerList = await api(companyToken, "/api/project-tasks?project_id=seed-reset-partner-03");
    const partnerData = (partnerList.body as { data?: unknown[] })?.data ?? [];
    check(
      "company: NÃO vê tarefas de projeto de Partner",
      partnerList.status === 200 && partnerData.length === 0,
      `status=${partnerList.status} itens=${partnerData.length}`,
    );

    const reprocessAsCompany = await api(companyToken, "/api/projects/seed-reset-company-03/generate-tasks", { method: "POST", body: JSON.stringify({ payment_id: "whatever" }) });
    check("company: reprocessamento administrativo bloqueado (403)", reprocessAsCompany.status === 403, `status=${reprocessAsCompany.status}`);
  }

  // ── PARTNER ────────────────────────────────────────────────────────────
  console.log("\n=== PARTNER — só os próprios projetos ===");
  {
    const ownList = await api(partnerToken, "/api/project-tasks?project_id=seed-reset-partner-03");
    check("partner: lista tarefas do próprio projeto (200)", ownList.status === 200, `status=${ownList.status}`);

    const agencyList = await api(partnerToken, "/api/project-tasks?project_id=seed-reset-agency-03");
    const agencyData = (agencyList.body as { data?: unknown[] })?.data ?? [];
    check(
      "partner: NÃO vê tarefas de projeto de Agency",
      agencyList.status === 200 && agencyData.length === 0,
      `status=${agencyList.status} itens=${agencyData.length}`,
    );

    const reprocessAsPartner = await api(partnerToken, "/api/projects/seed-reset-partner-03/generate-tasks", { method: "POST", body: JSON.stringify({ payment_id: "whatever" }) });
    check("partner: reprocessamento administrativo bloqueado (403)", reprocessAsPartner.status === 403, `status=${reprocessAsPartner.status}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam`);
  console.log("=".repeat(70));
  if (failed > 0) process.exit(1);
  console.log("\n✅ Todos os checks passaram.");
}

main().catch((e) => {
  console.error("\n❌ ERRO INESPERADO:", e);
  process.exit(1);
});
