/**
 * e2e-test-payment-flow.ts
 *
 * Teste end-to-end completo do fluxo: criar projeto → vincular produtos →
 * pagar → verificar tarefas, etapas, status, vínculos e diagnóstico.
 *
 * Produtos testados: PA0004, PA0002, DC0004
 *
 * Execução:
 *   cd apps/backend
 *   $env:DATABASE_URL=...
 *   npx tsx src/scripts/e2e-test-payment-flow.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

const BASE_URL = "http://localhost:3001/api";

// ─── Test config ──────────────────────────────────────────────────────────────
const TEST_PRODUCTS = ["PA0004", "PA0002", "DC0004"];
const TEST_CREDENTIALS = { email: "cp@lamego.com.vc", password: "123@321" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function info(msg: string) { console.log(`     ${msg}`); }
function section(msg: string) { console.log(`\n─── ${msg} ${"─".repeat(Math.max(0, 56 - msg.length))}`); }

async function apiFetch(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let body: any;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  E2E TEST — Fluxo completo: projeto → pagamento → tarefas");
  console.log("═══════════════════════════════════════════════════════════════");

  // ── 1. Autenticação ────────────────────────────────────────────────────────
  section("1. Autenticação");
  const loginRes = await apiFetch("/auth/login", {
    method: "POST",
    body: TEST_CREDENTIALS,
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    fail(`Login falhou: status=${loginRes.status} body=${JSON.stringify(loginRes.body)}`);
    process.exit(1);
  }

  const token = loginRes.body.token as string;
  pass(`Login OK — user: ${loginRes.body.user?.email} (${loginRes.body.user?.role})`);

  // ── 2. Verificar produtos existem e têm modelos ativos ────────────────────
  section("2. Verificar produtos no catálogo");

  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: TEST_PRODUCTS } },
    include: {
      task_links: {
        where: { catalog_task: { is_active: true } },
        include: { catalog_task: { select: { code: true, name: true, is_active: true } } },
      },
    },
  });

  for (const pid of TEST_PRODUCTS) {
    const p = productsFromDB.find((x) => x.id === pid);
    if (!p) {
      fail(`Produto ${pid} não encontrado no banco`);
      continue;
    }
    if (!p.is_active) {
      fail(`Produto ${pid} "${p.name}" está inativo`);
      continue;
    }
    const active = p.task_links.filter((l) => l.catalog_task.is_active);
    if (active.length === 0) {
      fail(`Produto ${pid} "${p.name}" não tem modelos ativos`);
    } else {
      pass(`Produto ${pid} "${p.name}" | ${active.length} modelo(s) ativo(s)`);
      for (const l of active) info(`[${l.catalog_task.code}] ${l.catalog_task.name}`);
    }
  }

  // ── 3. Buscar ou criar cliente de teste ────────────────────────────────────
  section("3. Cliente de teste");

  const clientsRes = await apiFetch("/clients?per_page=50", { token });
  let clientId: string;

  if (clientsRes.status === 200) {
    const existing = (clientsRes.body.data ?? clientsRes.body ?? []).find(
      (c: any) => c.name === "Cliente E2E Test",
    );
    if (existing) {
      clientId = existing.id;
      pass(`Cliente existente reutilizado: ${existing.name} (${clientId})`);
    } else {
      const createRes = await apiFetch("/clients", {
        method: "POST",
        token,
        body: {
          name: "Cliente E2E Test",
          email: "e2e-test@allka.test",
          phone: "11999990000",
          type: "empresa",
        },
      });
      if (createRes.status !== 201) {
        fail(`Criar cliente falhou: ${JSON.stringify(createRes.body)}`);
        process.exit(1);
      }
      clientId = createRes.body.id;
      pass(`Cliente criado: ${createRes.body.name} (${clientId})`);
    }
  } else {
    fail(`Erro ao listar clientes: ${clientsRes.status}`);
    process.exit(1);
  }

  // ── 4. Criar projeto de teste ──────────────────────────────────────────────
  section("4. Criar projeto de teste");

  const projectTitle = `E2E Test — ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;
  const createProjRes = await apiFetch("/projects", {
    method: "POST",
    token,
    body: {
      title: projectTitle,
      client_id: clientId,
      status: "draft",
      description: "Projeto criado pelo teste E2E automatizado",
    },
  });

  if (createProjRes.status !== 201) {
    fail(`Criar projeto falhou: status=${createProjRes.status} body=${JSON.stringify(createProjRes.body)}`);
    process.exit(1);
  }

  const projectId = createProjRes.body.id as string;
  pass(`Projeto criado: "${projectTitle}" (${projectId})`);
  info(`Status inicial: ${createProjRes.body.status}`);

  // ── 5. Vincular produtos ao projeto ───────────────────────────────────────
  section("5. Vincular produtos");

  const linkedProductIds: string[] = [];

  for (const pid of TEST_PRODUCTS) {
    const product = productsFromDB.find((x) => x.id === pid);
    const linkRes = await apiFetch("/project-products", {
      method: "POST",
      token,
      body: {
        project_id: projectId,
        product_id: pid,
        recurrence_snapshot: "mensal",
        preco_final_cliente_snapshot: product?.base_price ?? 0,
        comissao_snapshot: 10,
        pagador_snapshot: "AGENCIA",
      },
    });

    if (linkRes.status === 201) {
      linkedProductIds.push(linkRes.body.id);
      pass(`Produto ${pid} vinculado: pp_id=${linkRes.body.id}`);
    } else if (linkRes.status === 409) {
      // Already linked — get the existing link id from DB
      const existing = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id: projectId, product_id: pid } },
      });
      if (existing) {
        linkedProductIds.push(existing.id);
        pass(`Produto ${pid} já vinculado (reutilizado): pp_id=${existing.id}`);
      }
    } else {
      fail(`Vincular produto ${pid} falhou: status=${linkRes.status} body=${JSON.stringify(linkRes.body)}`);
    }
  }

  // ── 6. Confirmar produtos vinculados no banco ─────────────────────────────
  section("6. Validar vínculos no banco antes do pagamento");

  const ppRecords = await prisma.projectProduct.findMany({
    where: { project_id: projectId },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { created_at: "asc" },
  });

  if (ppRecords.length !== TEST_PRODUCTS.length) {
    fail(`Esperado ${TEST_PRODUCTS.length} produtos, encontrado ${ppRecords.length}`);
  } else {
    pass(`${ppRecords.length} produtos vinculados ao projeto`);
  }
  for (const pp of ppRecords) {
    info(`  [${pp.product_id}] "${pp.product.name}" | pp_id=${pp.id}`);
  }

  // ── 7. Pagar com cartão fake ───────────────────────────────────────────────
  section("7. Pagamento sandbox");

  // Total amount: sum of snapshots
  const totalAmount = ppRecords.reduce(
    (acc, pp) => acc + (Number(pp.preco_final_cliente_snapshot) || 0),
    0,
  );

  const payRes = await apiFetch("/payments/fake-checkout", {
    method: "POST",
    token,
    body: {
      project_id: projectId,
      amount: totalAmount || 999.99,
      card_last_digits: "4242",
      card_holder: "E2E TEST",
      notes: "Pagamento E2E automatizado",
    },
  });

  if (payRes.status !== 201 || !payRes.body.success) {
    fail(`Pagamento falhou: status=${payRes.status} body=${JSON.stringify(payRes.body)}`);
    process.exit(1);
  }

  const payBody = payRes.body;
  pass(`Pagamento aprovado | transaction: ${payBody.payment?.fake_transaction_id}`);
  info(`message: "${payBody.message}"`);
  info(`tarefasGeradas: ${payBody.tarefasGeradas}`);
  info(`etapasGeradas: ${payBody.etapasGeradas}`);
  info(`produtosProcessados: ${payBody.produtosProcessados}`);
  info(`produtosSemModelo: ${JSON.stringify(payBody.produtosSemModelo)}`);
  info(`errosDeGeracao: ${JSON.stringify(payBody.errosDeGeracao)}`);
  info(`warnings: ${JSON.stringify(payBody.warnings)}`);

  if (payBody.tarefasGeradas === 0) {
    fail("CRÍTICO: nenhuma tarefa foi gerada após pagamento!");
  } else {
    pass(`${payBody.tarefasGeradas} tarefa(s) gerada(s) conforme esperado`);
  }

  // ── 8. Validar projeto no banco ────────────────────────────────────────────
  section("8. Validar projeto após pagamento");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      products: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  if (!project) {
    fail("Projeto não encontrado no banco após pagamento");
    process.exit(1);
  }

  if (project.status === "in-progress") {
    pass(`Status do projeto: "${project.status}" ✓`);
  } else {
    fail(`Status do projeto: "${project.status}" — esperado "in-progress"`);
  }

  if (project.products.length === TEST_PRODUCTS.length) {
    pass(`Produtos preservados: ${project.products.length}`);
  } else {
    fail(`Produtos no projeto: ${project.products.length} — esperado ${TEST_PRODUCTS.length}`);
  }

  // ── 9. Validar pagamento no banco ──────────────────────────────────────────
  section("9. Validar pagamento no banco");

  const payment = await prisma.payment.findFirst({
    where: { project_id: projectId },
    orderBy: { created_at: "desc" },
  });

  if (!payment) {
    fail("Nenhum registro de pagamento encontrado");
  } else {
    pass(`Pagamento registrado: status=${payment.status} | gateway=${payment.gateway}`);
    info(`transaction_id: ${payment.fake_transaction_id}`);
    info(`amount: R$ ${Number(payment.amount).toFixed(2)}`);
  }

  // ── 10. Validar tarefas no banco ───────────────────────────────────────────
  section("10. Validar tarefas geradas");

  const tasks = await prisma.projectTask.findMany({
    where: { project_id: projectId },
    include: {
      stages: { orderBy: { ordem: "asc" } },
      project_product: { include: { product: { select: { id: true, name: true } } } },
      catalog_task: { select: { code: true, name: true } },
    },
    orderBy: { sort_order: "asc" },
  });

  if (tasks.length === 0) {
    fail("CRÍTICO: nenhuma tarefa encontrada no banco!");
  } else {
    pass(`${tasks.length} tarefa(s) encontrada(s) no banco`);
  }

  // Group by product
  const tasksByProduct = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const pid = t.project_product?.product?.id ?? t.product_id ?? "?";
    if (!tasksByProduct.has(pid)) tasksByProduct.set(pid, []);
    tasksByProduct.get(pid)!.push(t);
  }

  let totalStages = 0;
  let statusErrors = 0;
  let linkErrors = 0;
  let stageErrors = 0;

  for (const pid of TEST_PRODUCTS) {
    const ptasks = tasksByProduct.get(pid) ?? [];
    const product = productsFromDB.find((x) => x.id === pid);
    const expectedModels = product?.task_links.length ?? 0;

    info(`\n  Produto ${pid} | "${product?.name}" | tarefas: ${ptasks.length} / ${expectedModels} esperada(s)`);

    if (ptasks.length === 0) {
      fail(`  Nenhuma tarefa para produto ${pid}`);
      linkErrors++;
      continue;
    }

    for (const t of ptasks) {
      const statusOk = t.status === "PARA_LANCAMENTO";
      const linkedProd = t.project_product?.product?.id === pid;
      const linkedModel = t.catalog_task_id != null;
      const stagesOk = t.stages.length > 0;

      totalStages += t.stages.length;

      const statusIcon = statusOk ? "✅" : "❌";
      const prodIcon = linkedProd ? "✅" : "❌";
      const modelIcon = linkedModel ? "✅" : "❌";
      const stagesIcon = stagesOk ? "✅" : "❌";

      info(
        `    ${statusIcon} status=${t.status}  ${prodIcon} produto=${t.project_product?.product?.id ?? "?"}` +
        `  ${modelIcon} modelo=${t.catalog_task?.code ?? "?"}  ${stagesIcon} etapas=${t.stages.length}`,
      );

      if (!statusOk) statusErrors++;
      if (!linkedProd) linkErrors++;
      if (t.stages.length === 0) stageErrors++;

      // Validate stage order and status
      for (let i = 0; i < t.stages.length; i++) {
        const s = t.stages[i];
        const orderOk = s.ordem === i;
        const stageStatusOk = s.status === "PENDENTE";
        if (!orderOk || !stageStatusOk) {
          fail(`      Etapa ${i}: ordem=${s.ordem} (esperado ${i}), status=${s.status} (esperado PENDENTE)`);
          stageErrors++;
        }
      }
    }
  }

  if (statusErrors === 0) pass(`Todas as tarefas com status PARA_LANCAMENTO`);
  if (linkErrors === 0) pass(`Todas as tarefas vinculadas ao produto correto`);
  if (stageErrors === 0) pass(`Todas as etapas com ordem e status corretos`);
  pass(`Total de etapas no banco: ${totalStages}`);

  // ── 11. Verificar duplicidade ──────────────────────────────────────────────
  section("11. Verificar duplicidade (idempotência)");

  // Check for duplicate tasks: same project_product_id + catalog_task_id
  const dupeCheck = await prisma.$queryRawUnsafe<Array<{ project_product_id: string; catalog_task_id: string; cnt: number }>>(
    `SELECT project_product_id, catalog_task_id, COUNT(*) as cnt
     FROM project_tasks
     WHERE project_id = ?
     GROUP BY project_product_id, catalog_task_id
     HAVING cnt > 1`,
    projectId,
  );

  if (dupeCheck.length === 0) {
    pass("Nenhuma tarefa duplicada encontrada");
  } else {
    for (const d of dupeCheck) {
      fail(`Duplicata: project_product_id=${d.project_product_id} catalog_task_id=${d.catalog_task_id} cnt=${d.cnt}`);
    }
  }

  // ── 12. Verificar via API: GET /api/projects/:id/tasks ────────────────────
  section("12. Validar via API: tarefas do projeto");

  const projTasksRes = await apiFetch(`/projects/${projectId}/tasks`, { token });
  if (projTasksRes.status !== 200) {
    fail(`GET /projects/${projectId}/tasks retornou ${projTasksRes.status}`);
  } else {
    const apiTasks = Array.isArray(projTasksRes.body) ? projTasksRes.body : (projTasksRes.body.data ?? []);
    if (apiTasks.length > 0) {
      pass(`API retornou ${apiTasks.length} tarefa(s) para o projeto`);
    } else {
      fail(`API retornou 0 tarefas — a interface ficaria em branco`);
    }
  }

  // ── 13. Verificar via API: GET /api/project-tasks (admin/tarefas) ────────────
  section("13. Validar via API: /admin/tarefas");

  // /admin/tarefas usa GET /api/project-tasks (sem filtro de projeto — lista todas)
  // Verificamos com filtro para confirmar que as tarefas do projeto aparecem
  const adminTasksRes = await apiFetch(`/project-tasks?project_id=${projectId}`, { token });
  if (adminTasksRes.status === 200) {
    const adminTasks = Array.isArray(adminTasksRes.body)
      ? adminTasksRes.body
      : (adminTasksRes.body.data ?? adminTasksRes.body.tasks ?? []);
    if (adminTasks.length > 0) {
      pass(`/api/project-tasks retornou ${adminTasks.length} tarefa(s) — /admin/tarefas mostraria corretamente`);
    } else {
      fail(`/api/project-tasks retornou 0 tarefas para este projeto`);
    }
  } else {
    fail(`GET /api/project-tasks retornou ${adminTasksRes.status}`);
  }

  // ── 14. Relatório final ────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  RELATÓRIO FINAL DO TESTE E2E");
  console.log("═══════════════════════════════════════════════════════════════");

  // Re-fetch fresh data for report
  const finalProject = await prisma.project.findUnique({ where: { id: projectId } });
  const finalTasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
  const finalStages = await prisma.projectTaskStage.findMany({
    where: { project_task: { project_id: projectId } },
  });

  console.log(`
  Projeto
  ─────────────────────────────────────────────────
  ID              : ${projectId}
  Nome            : ${finalProject?.title}
  Status          : ${finalProject?.status}
  Produtos        : ${ppRecords.length} (${ppRecords.map((p) => p.product_id).join(", ")})

  Pagamento
  ─────────────────────────────────────────────────
  Status          : ${payment?.status ?? "N/A"}
  Gateway         : ${payment?.gateway ?? "N/A"}
  Valor           : R$ ${Number(payment?.amount ?? 0).toFixed(2)}
  Transaction ID  : ${payment?.fake_transaction_id ?? "N/A"}

  Tarefas
  ─────────────────────────────────────────────────
  Total geradas   : ${finalTasks.length}
  Etapas geradas  : ${finalStages.length}
  Status único    : ${[...new Set(finalTasks.map((t) => t.status))].join(", ")}
  Produtos sem modelo: ${payBody.produtosSemModelo?.join(", ") || "nenhum"}

  Erros detectados: ${process.exitCode === 1 ? "SIM — ver linhas marcadas com ❌" : "Nenhum"}

  Validações
  ─────────────────────────────────────────────────
  Status errados  : ${statusErrors}
  Erros de vínculo: ${linkErrors}
  Erros de etapas : ${stageErrors}
  Duplicatas      : ${dupeCheck.length}
  `);

  if (process.exitCode === 1) {
    console.log("  ❌ TESTE COM FALHAS — revisar itens marcados acima\n");
  } else {
    console.log("  ✅ TODOS OS CRITÉRIOS SATISFEITOS — fluxo OK\n");
  }
}

main()
  .catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
