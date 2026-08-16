/**
 * Smoke test ao vivo — Combos de produtos. Roda contra http://localhost:3001
 * via API real (login real, sem mocks). Cria só o mínimo de fixture
 * necessário (1 usuário de agência descartável + 1 projeto de teste) e
 * limpa tudo no final, inclusive em caso de falha no meio do caminho.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ["warn", "error"] });
const BASE_URL = "http://localhost:3001/api";
const ADMIN_CREDENTIALS = { email: "cp@lamego.com.vc", password: "123456" };
const AGENCY_A_CREDENTIALS = { email: "gabriel@lamego.com.vc", password: "123456" };
const AGENCY_B_EMAIL = "__e2e-combo-agency-b@allka.test";
const AGENCY_B_PASSWORD = "123456";

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function section(msg: string) { console.log(`\n─── ${msg} ${"─".repeat(Math.max(0, 60 - msg.length))}`); }

async function apiFetch(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body: any;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

const createdBundleIds: string[] = [];
let createdUserBId: string | null = null;
let createdProjectId: string | null = null;
let createdNonContractableProductId: string | null = null;

async function cleanup() {
  section("Limpeza");
  for (const id of createdBundleIds) {
    try { await prisma.productBundle.delete({ where: { id } }); } catch {}
  }
  if (createdProjectId) {
    try {
      await prisma.projectProduct.deleteMany({ where: { project_id: createdProjectId } });
      await prisma.project.delete({ where: { id: createdProjectId } });
    } catch {}
  }
  if (createdUserBId) {
    try { await prisma.user.delete({ where: { id: createdUserBId } }); } catch {}
  }
  if (createdNonContractableProductId) {
    try { await prisma.product.delete({ where: { id: createdNonContractableProductId } }); } catch {}
  }
  console.log("  Combos, projeto, produto e usuário de teste removidos.");
}

async function main() {
  console.log("=".repeat(70));
  console.log("  SMOKE TEST — Combos de produtos");
  console.log("=".repeat(70));

  section("0. Preparar fixtures (produtos reais + usuário de agência B descartável)");

  const contractableProducts = await prisma.product.findMany({
    where: { is_active: true, task_links: { some: { catalog_task: { is_active: true } } } },
    select: { id: true, name: true, base_price: true },
    take: 3,
  });
  if (contractableProducts.length < 3) {
    fail(`Preciso de pelo menos 3 produtos ativos e contratáveis no catálogo local, achei ${contractableProducts.length}`);
    process.exit(1);
  }
  const [prodA, prodB, prodC] = contractableProducts;
  pass(`Produtos contratáveis achados: ${prodA.name}, ${prodB.name}, ${prodC.name}`);

  // Todo produto real ativo no catálogo local já tem tarefa vinculada —
  // criamos um descartável sem nenhum vínculo só pra forçar o cenário de
  // rejeição (limpo no final, junto com o resto).
  const nonContractableProduct = await prisma.product.create({
    data: { name: `__E2E Produto Não-Contratável — ${Date.now()}`, category: "teste", base_price: 10, is_active: true },
    select: { id: true, name: true },
  });
  createdNonContractableProductId = nonContractableProduct.id;
  pass(`Produto não-contratável criado (pra teste de rejeição): ${nonContractableProduct.name}`);

  const agencyAUser = await prisma.user.findUnique({ where: { email: AGENCY_A_CREDENTIALS.email }, select: { agency_id: true } });
  if (!agencyAUser?.agency_id) {
    fail(`Conta de teste ${AGENCY_A_CREDENTIALS.email} não tem agency_id`);
    process.exit(1);
  }
  const agencyAId = agencyAUser.agency_id;

  const otherAgency = await prisma.agency.findFirst({ where: { id: { not: agencyAId } }, select: { id: true, name: true } });
  if (!otherAgency) {
    fail("Não achei uma segunda agência no banco pra testar isolamento cross-agência");
    process.exit(1);
  }

  const userB = await prisma.user.create({
    data: {
      email: AGENCY_B_EMAIL,
      password_hash: await bcrypt.hash(AGENCY_B_PASSWORD, 10),
      name: "E2E Combo Test — Agência B",
      role: "agency_admin",
      account_type: "agencias",
      agency_id: otherAgency.id,
      status: "ativo",
      is_active: true,
    },
  });
  createdUserBId = userB.id;
  pass(`Usuário descartável criado na agência "${otherAgency.name}" (${otherAgency.id})`);

  section("1. Login (admin, agência A, agência B)");
  const adminLogin = await apiFetch("/auth/login", { method: "POST", body: ADMIN_CREDENTIALS });
  const agencyALogin = await apiFetch("/auth/login", { method: "POST", body: AGENCY_A_CREDENTIALS });
  const agencyBLogin = await apiFetch("/auth/login", { method: "POST", body: { email: AGENCY_B_EMAIL, password: AGENCY_B_PASSWORD } });
  if (adminLogin.status !== 200 || agencyALogin.status !== 200 || agencyBLogin.status !== 200) {
    fail(`Login falhou — admin=${adminLogin.status} agenciaA=${agencyALogin.status} agenciaB=${agencyBLogin.status}`);
    await cleanup();
    process.exit(1);
  }
  const adminToken = adminLogin.body.token as string;
  const agencyAToken = agencyALogin.body.token as string;
  const agencyBToken = agencyBLogin.body.token as string;
  pass("3 logins OK");

  section("2. Admin cria combo global");
  const globalBundleRes = await apiFetch("/product-bundles", {
    method: "POST", token: adminToken,
    body: { name: `E2E Combo Global — ${Date.now()}`, category: "teste", items: [{ product_id: prodA.id }, { product_id: prodB.id }] },
  });
  if (globalBundleRes.status !== 201) {
    fail(`Criar combo global falhou: ${globalBundleRes.status} ${JSON.stringify(globalBundleRes.body)}`);
  } else if (globalBundleRes.body.agency_id !== null) {
    fail(`Combo do admin deveria ter agency_id null, veio ${globalBundleRes.body.agency_id}`);
  } else {
    pass(`Combo global criado (agency_id: null) — ${globalBundleRes.body.id}`);
  }
  const globalBundleId = globalBundleRes.body?.id;
  if (globalBundleId) createdBundleIds.push(globalBundleId);

  section("3. Agência A cria combo próprio");
  const agencyBundleRes = await apiFetch("/product-bundles", {
    method: "POST", token: agencyAToken,
    body: { name: `E2E Combo Agência A — ${Date.now()}`, items: [{ product_id: prodA.id }, { product_id: prodC.id }] },
  });
  if (agencyBundleRes.status !== 201) {
    fail(`Criar combo de agência falhou: ${agencyBundleRes.status} ${JSON.stringify(agencyBundleRes.body)}`);
  } else if (agencyBundleRes.body.agency_id !== agencyAId) {
    fail(`Combo da agência A deveria ter agency_id=${agencyAId}, veio ${agencyBundleRes.body.agency_id}`);
  } else {
    pass(`Combo da agência A criado (agency_id: ${agencyAId}) — ${agencyBundleRes.body.id}`);
  }
  const agencyBundleId = agencyBundleRes.body?.id;
  if (agencyBundleId) createdBundleIds.push(agencyBundleId);

  section("4. Isolamento cross-agência");
  if (agencyBundleId) {
    const listAsB = await apiFetch("/product-bundles", { token: agencyBToken });
    const seesAgencyABundle = (listAsB.body?.data ?? []).some((b: any) => b.id === agencyBundleId);
    if (seesAgencyABundle) fail("Agência B consegue VER o combo da agência A na listagem — vazamento");
    else pass("Agência B não vê o combo da agência A na listagem");

    const putAsB = await apiFetch(`/product-bundles/${agencyBundleId}`, {
      method: "PUT", token: agencyBToken,
      body: { name: "hackeado", items: [{ product_id: prodA.id }, { product_id: prodB.id }] },
    });
    if (putAsB.status !== 403 && putAsB.status !== 404) fail(`Agência B conseguiu editar/ver combo da agência A: status ${putAsB.status}`);
    else pass(`Agência B bloqueada ao tentar editar combo da agência A (status ${putAsB.status})`);
  }
  if (globalBundleId) {
    const listAsBGlobal = await apiFetch("/product-bundles", { token: agencyBToken });
    const seesGlobal = (listAsBGlobal.body?.data ?? []).some((b: any) => b.id === globalBundleId);
    if (!seesGlobal) fail("Agência B NÃO vê o combo global do admin — deveria ver (leitura)");
    else pass("Agência B vê o combo global do admin na listagem");

    const putGlobalAsB = await apiFetch(`/product-bundles/${globalBundleId}`, {
      method: "PUT", token: agencyBToken,
      body: { name: "hackeado", items: [{ product_id: prodA.id }, { product_id: prodB.id }] },
    });
    if (putGlobalAsB.status !== 403) fail(`Agência B conseguiu editar o combo GLOBAL do admin: status ${putGlobalAsB.status}`);
    else pass("Agência B bloqueada ao tentar editar o combo global (403)");
  }

  section("5. Criar projeto de teste e contratar o combo global");
  const projectRes = await apiFetch("/projects", {
    method: "POST", token: adminToken,
    body: { title: `__E2E Combo Test Project — ${Date.now()}` },
  });
  if (projectRes.status !== 201) {
    fail(`Criar projeto de teste falhou: ${projectRes.status} ${JSON.stringify(projectRes.body)}`);
    await cleanup();
    process.exit(1);
  }
  const projectId = (projectRes.body.project ?? projectRes.body).id;
  createdProjectId = projectId;
  pass(`Projeto de teste criado: ${projectId}`);

  if (globalBundleId) {
    const contractRes = await apiFetch(`/product-bundles/${globalBundleId}/contract`, {
      method: "POST", token: adminToken,
      body: { project_id: projectId },
    });
    if (contractRes.status !== 201) {
      fail(`Contratar combo falhou: ${contractRes.status} ${JSON.stringify(contractRes.body)}`);
    } else {
      const created = contractRes.body.project_products ?? [];
      if (created.length !== 2) {
        fail(`Esperava 2 ProjectProduct criados (1 por item do combo), vieram ${created.length}`);
      } else {
        pass(`2 ProjectProduct criados a partir do combo`);
      }
      const groupIds = new Set(created.map((pp: any) => pp.origin_bundle_purchase_id));
      if (groupIds.size !== 1 || !created[0]?.origin_bundle_purchase_id) {
        fail(`origin_bundle_purchase_id deveria ser igual e não-nulo nas 2 linhas, veio: ${JSON.stringify([...groupIds])}`);
      } else {
        pass(`Todas as linhas compartilham o mesmo origin_bundle_purchase_id (${created[0].origin_bundle_purchase_id})`);
      }
      if (!created.every((pp: any) => pp.origin === "COMBO")) {
        fail("Nem todas as linhas vieram com origin=COMBO");
      } else {
        pass("Todas as linhas vieram com origin=COMBO");
      }

      const expectedTotal = (prodA.base_price || 0) + (prodB.base_price || 0);
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { value: true } });
      if (Math.abs((project?.value ?? 0) - expectedTotal) > 0.01) {
        fail(`Project.value deveria ser ${expectedTotal} (soma dos componentes), veio ${project?.value}`);
      } else {
        pass(`Project.value recalculado corretamente: ${project?.value}`);
      }
    }
  }

  section("6. Combo com produto não-contratável — rejeição completa (sem criação parcial)");
  const badBundleRes = await apiFetch("/product-bundles", {
    method: "POST", token: adminToken,
    body: { name: `E2E Combo Inválido — ${Date.now()}`, items: [{ product_id: prodA.id }, { product_id: nonContractableProduct.id }] },
  });
  const badBundleId = badBundleRes.body?.id;
  if (badBundleId) createdBundleIds.push(badBundleId);

  if (badBundleRes.status !== 201) {
    fail(`Criar o combo 'ruim' (só pra testar rejeição) falhou: ${badBundleRes.status}`);
  } else {
    const countBefore = await prisma.projectProduct.count({ where: { project_id: projectId } });
    const badContractRes = await apiFetch(`/product-bundles/${badBundleId}/contract`, {
      method: "POST", token: adminToken,
      body: { project_id: projectId },
    });
    const countAfter = await prisma.projectProduct.count({ where: { project_id: projectId } });
    if (badContractRes.status >= 200 && badContractRes.status < 300) {
      fail(`Contratação deveria ter sido recusada (produto não-contratável no meio), mas retornou ${badContractRes.status}`);
    } else {
      pass(`Contratação recusada corretamente (status ${badContractRes.status})`);
    }
    if (countAfter !== countBefore) {
      fail(`Criação parcial detectada! ProjectProduct antes=${countBefore}, depois=${countAfter} (deveria ser igual)`);
    } else {
      pass(`Nenhum ProjectProduct parcial foi criado (continua em ${countAfter})`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(process.exitCode === 1 ? "  RESULTADO: FALHAS ENCONTRADAS" : "  RESULTADO: TODOS OS CASOS PASSARAM");
  console.log("=".repeat(70));

  await cleanup();
}

main()
  .catch(async (e) => { console.error("ERRO FATAL:", e); await cleanup().catch(() => {}); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
