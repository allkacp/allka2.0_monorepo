/**
 * Teste de integração local — fluxo Pagamento confirmado -> Tarefas -> Etapas.
 *
 * Sem endpoint público: chama confirmPaymentAndGenerateProjectTasks e
 * gerarTarefasDoProjeto diretamente (os mesmos serviços que
 * POST /api/payments/fake-checkout e POST /api/projects/:id/generate-tasks
 * usam por baixo), dentro do seu próprio prisma.$transaction — o caminho
 * real, sem precisar de servidor HTTP rodando. Testes de autorização por
 * PERFIL via HTTP real estão em prisma/verify-authorization-endpoints.ts.
 *
 * Pressupõe que os 15 projetos de prisma/seed-qa-reset-15-projects.ts
 * acabaram de ser (re)criados (inclui agora 1 projeto mensal —
 * seed-reset-company-03). Roda contra o banco local — recusa-se fora de
 * localhost/127.0.0.1.
 *
 * Execução: cd apps/backend && npx tsx prisma/verify-payment-task-generation.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  confirmPaymentAndGenerateProjectTasks,
  PaymentValidationError,
  withIdempotentRetry,
} from "../src/lib/confirm-payment";
import { gerarTarefasDoProjeto } from "../src/lib/generate-tasks";
import { withProjectCode } from "../src/lib/create-project";

const prisma = new PrismaClient();

const RAW_DB_URL = process.env.DATABASE_URL ?? "";
if (!/localhost|127\.0\.0\.1/.test(RAW_DB_URL) || process.env.NODE_ENV === "production") {
  console.error("❌ BLOQUEADO: este script só roda contra um banco local.");
  process.exit(1);
}

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

async function getUser(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: u.id, account_type: u.account_type, role: u.role };
}

// ─── A — projeto draft sem produto ─────────────────────────────────────────
async function scenarioA() {
  console.log("\n=== A — projeto sem produto ===");
  const projectId = "seed-reset-admin-01"; // draft, 0 produtos
  const admin = await getUser("admin@allka.test");

  const paymentsBefore = await prisma.payment.count();
  const tasksBefore = await prisma.projectTask.count();
  const stagesBefore = await prisma.projectTaskStage.count();

  let caught: unknown = null;
  try {
    await prisma.$transaction((tx) =>
      confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: admin }),
    );
  } catch (err) {
    caught = err;
  }

  const isValidationError = caught instanceof PaymentValidationError;
  check("lança PaymentValidationError (equivalente a HTTP 400)", isValidationError, String(caught));
  check(
    "status code 400",
    isValidationError && (caught as PaymentValidationError).statusCode === 400,
  );
  check(
    "mensagem clara sobre produto obrigatório",
    isValidationError &&
      (caught as PaymentValidationError).message === "O projeto precisa possuir pelo menos um produto antes do pagamento.",
  );

  check("zero novos Payments", (await prisma.payment.count()) === paymentsBefore);
  check("zero tarefas novas", (await prisma.projectTask.count()) === tasksBefore);
  check("zero etapas novas", (await prisma.projectTaskStage.count()) === stagesBefore);
}

interface ScenarioBCResult {
  paymentId: string;
  taskCount: number;
  stageCount: number;
  codes: string[];
}

// ─── B — PENDENTE -> PAGO (mesmo registro, sem abandonar o PENDENTE) ───────
// ─── C — PaymentItems congelados ───────────────────────────────────────────
async function scenarioBC(): Promise<ScenarioBCResult> {
  console.log("\n=== B — PENDENTE -> PAGO (reaproveita o mesmo registro) ===");
  const projectId = "seed-reset-agency-03"; // DC0005 (1 CatalogTask) + PA0002 (4 CatalogTasks) — templates reais
  const agencia = await getUser("agencia@allka.test");

  const pendingBefore = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId, status: "PENDENTE" } });
  const totalPaymentsBefore = await prisma.payment.count({ where: { project_id: projectId } });

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { products: true } });
  const expectedAmount = project.products.reduce((s, p) => s + p.preco_final_cliente_snapshot, 0);

  // Testa o caminho de payment_id EXPLÍCITO (o outro caminho, sem
  // payment_id, é exercitado no cenário G/mensal abaixo).
  const result = await prisma.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: agencia, paymentId: pendingBefore.id }),
  );

  check("mesmo Payment.id da tentativa PENDENTE original", result.payment.id === pendingBefore.id, `${pendingBefore.id} vs ${result.payment.id}`);
  check("Payment agora com status PAGO", result.payment.status === "PAGO");
  check(
    "valor = soma dos produtos válidos",
    Math.abs(result.payment.amount - expectedAmount) < 0.01,
    `esperado ${expectedAmount}, obtido ${result.payment.amount}`,
  );

  const totalPaymentsAfter = await prisma.payment.count({ where: { project_id: projectId } });
  check("quantidade total de Payments do projeto não aumentou", totalPaymentsAfter === totalPaymentsBefore, `${totalPaymentsBefore} -> ${totalPaymentsAfter}`);
  const stillPending = await prisma.payment.count({ where: { project_id: projectId, status: "PENDENTE" } });
  check("nenhum Payment PENDENTE abandonado para este projeto", stillPending === 0, `restam ${stillPending}`);

  console.log("\n=== C — PaymentItems congelados ===");
  const items = await prisma.paymentItem.findMany({ where: { payment_id: result.payment.id } });
  check("quantidade de PaymentItems = quantidade de produtos válidos", items.length === project.products.length, `${items.length} vs ${project.products.length}`);
  const itemsSum = items.reduce((s, i) => s + i.total_snapshot, 0);
  check("soma dos PaymentItems = Payment.amount", Math.abs(itemsSum - result.payment.amount) < 0.01, `${itemsSum} vs ${result.payment.amount}`);
  check("todo item aponta pra um project_product_id válido", items.every((i) => project.products.some((p) => p.id === i.project_product_id)));
  check("snapshots preenchidos (nome/preço/total)", items.every((i) => !!i.product_name_snapshot && i.unit_price_snapshot >= 0 && i.total_snapshot >= 0));

  const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
  check("tarefas geradas > 0", tasks.length > 0);
  check("todas as tarefas em PARA_LANCAMENTO", tasks.every((t) => t.status === "PARA_LANCAMENTO"));
  check("todas com origin_payment_id = payment confirmado", tasks.every((t) => t.origin_payment_id === result.payment.id));
  const codes = tasks.map((t) => t.task_code).filter((c): c is string => !!c);
  check("códigos T000001+ sem duplicidade", new Set(codes).size === codes.length, codes.join(", "));
  console.log(`  Códigos gerados: ${codes.slice().sort().join(", ")}`);

  const stageCount = await prisma.projectTaskStage.count({ where: { project_task: { project_id: projectId } } });
  check("etapas geradas > 0", stageCount > 0);

  return { paymentId: result.payment.id, taskCount: tasks.length, stageCount, codes };
}

// ─── D — produto adicionado DEPOIS do pagamento não entra no reprocessamento ──
async function scenarioD(prev: ScenarioBCResult) {
  console.log("\n=== D — produto adicionado depois do pagamento ===");
  const projectId = "seed-reset-agency-03";

  const product = await prisma.product.findUniqueOrThrow({ where: { id: "DC0001" } }); // Layout de Redes Sociais — ainda não vinculado a este projeto
  const newProjectProduct = await prisma.projectProduct.create({
    data: {
      project_id: projectId,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_code_snapshot: product.id,
      product_category_snapshot: product.category,
      product_price_snapshot: product.base_price,
      preco_final_cliente_snapshot: product.base_price,
      status: "PENDENTE",
    },
  });

  // Reprocessamento manual (mesma lógica de POST /api/projects/:id/generate-tasks):
  // carrega EXCLUSIVAMENTE os PaymentItems do Payment já confirmado.
  const paymentItems = await prisma.paymentItem.findMany({ where: { payment_id: prev.paymentId } });
  const projectProductIds = paymentItems.map((i) => i.project_product_id);
  check("produto novo NÃO está entre os PaymentItems do pagamento antigo", !projectProductIds.includes(newProjectProduct.id));

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: prev.paymentId } });
  const result = await prisma.$transaction((tx) =>
    gerarTarefasDoProjeto(tx, projectId, {
      paymentId: payment.id,
      paidAt: payment.paid_at ?? payment.created_at,
      billingCycleKey: payment.billing_cycle_key ?? "avulso",
      projectProductIds,
    }),
  );
  check("reprocessamento não gerou tarefa nova (tudo já existia)", result.generated === 0, `generated=${result.generated}`);

  const tasksForNewProduct = await prisma.projectTask.count({ where: { project_id: projectId, project_product_id: newProjectProduct.id } });
  check("nenhuma tarefa foi gerada pro produto adicionado depois", tasksForNewProduct === 0, `encontradas: ${tasksForNewProduct}`);

  const totalTasksAfter = await prisma.projectTask.count({ where: { project_id: projectId } });
  check("quantidade total de tarefas do projeto não mudou", totalTasksAfter === prev.taskCount, `${prev.taskCount} -> ${totalTasksAfter}`);
}

// ─── E — idempotência: repetir a mesma confirmação ─────────────────────────
async function scenarioE(prev: ScenarioBCResult) {
  console.log("\n=== E — idempotência (repetir a mesma confirmação) ===");
  const projectId = "seed-reset-agency-03";
  const agencia = await getUser("agencia@allka.test");

  const result = await prisma.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: agencia, paymentId: prev.paymentId }),
  );

  check("retornou o mesmo Payment", result.payment.id === prev.paymentId);
  check("alreadyProcessed = true", result.alreadyProcessed === true);

  const itemsAfter = await prisma.paymentItem.count({ where: { payment_id: prev.paymentId } });
  const tasksAfter = await prisma.projectTask.count({ where: { project_id: projectId } });
  const stagesAfter = await prisma.projectTaskStage.count({ where: { project_task: { project_id: projectId } } });

  check("mesma quantidade de PaymentItems", itemsAfter === (await prisma.paymentItem.count({ where: { payment_id: prev.paymentId } })));
  check("quantidade de tarefas não aumentou (produto extra do cenário D incluso)", tasksAfter >= prev.taskCount);
  const codes = (await prisma.projectTask.findMany({ where: { project_id: projectId }, select: { task_code: true } })).map((t) => t.task_code).slice().sort();
  check("códigos das tarefas originais não mudaram", prev.codes.every((c) => codes.includes(c)));
  console.log(`  (tarefas=${tasksAfter}, etapas=${stagesAfter})`);
}

// ─── F — concorrência real ──────────────────────────────────────────────────
async function scenarioF() {
  console.log("\n=== F — duas confirmações simultâneas da mesma tentativa PENDENTE ===");
  const projectId = "seed-reset-partner-03";
  const partner = await getUser("partner@allka.test");

  const pending = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId, status: "PENDENTE" } });

  const runOnce = () =>
    withIdempotentRetry(() =>
      prisma.$transaction((tx) =>
        confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: partner, paymentId: pending.id }),
      ),
    );
  const [r1, r2] = await Promise.allSettled([runOnce(), runOnce()]);

  check("primeira chamada concluiu sem erro", r1.status === "fulfilled", r1.status === "rejected" ? String(r1.reason) : undefined);
  check("segunda chamada concluiu sem erro", r2.status === "fulfilled", r2.status === "rejected" ? String(r2.reason) : undefined);
  if (r1.status === "fulfilled" && r2.status === "fulfilled") {
    check("as duas respostas apontam pro mesmo Payment", r1.value.payment.id === r2.value.payment.id);
  }

  const paymentCount = await prisma.payment.count({ where: { project_id: projectId } });
  check("nenhum Payment duplicado (mesma contagem de antes)", paymentCount === 1, `encontrados: ${paymentCount}`);
  const pendingLeftover = await prisma.payment.count({ where: { project_id: projectId, status: "PENDENTE" } });
  check("nenhum Payment PENDENTE abandonado", pendingLeftover === 0);

  const items = await prisma.paymentItem.findMany({ where: { payment_id: pending.id } });
  const itemKeys = items.map((i) => i.project_product_id);
  check("nenhum PaymentItem duplicado", new Set(itemKeys).size === itemKeys.length, itemKeys.join(","));

  const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
  const codes = tasks.map((t) => t.task_code);
  check("nenhum task_code duplicado", new Set(codes).size === codes.length, codes.join(", "));
  const genKeys = tasks.map((t) => t.generation_key);
  check("nenhuma generation_key duplicada", new Set(genKeys).size === genKeys.length);
}

// ─── G — contratação mensal, dois ciclos ───────────────────────────────────
async function scenarioG() {
  console.log("\n=== G — contratação mensal (seed-reset-company-03) ===");
  const projectId = "seed-reset-company-03";
  const company = await getUser("company@allka.test");

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  check("projeto está configurado como mensal", project.lifecycle === "mensal", project.lifecycle);

  const cycle1Pending = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId, status: "PENDENTE" } });
  const cycle1Key = cycle1Pending.billing_cycle_key;
  check("Payment do ciclo 1 tem billing_cycle_key preenchido", !!cycle1Key, String(cycle1Key));

  console.log("  -- Ciclo 1: confirmação --");
  const r1 = await prisma.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: company }), // sem payment_id — localiza a tentativa PENDENTE compatível com o ciclo corrente
  );
  check("ciclo 1: mesmo registro do PENDENTE original vira PAGO", r1.payment.id === cycle1Pending.id);
  check("ciclo 1: status PAGO", r1.payment.status === "PAGO");
  const cycle1Tasks = await prisma.projectTask.findMany({ where: { origin_payment_id: r1.payment.id } });
  check("ciclo 1: tarefas geradas > 0", cycle1Tasks.length > 0);
  check("ciclo 1: todas em PARA_LANCAMENTO", cycle1Tasks.every((t) => t.status === "PARA_LANCAMENTO"));
  const cycle1Stages = await prisma.projectTaskStage.count({ where: { project_task: { origin_payment_id: r1.payment.id } } });
  check("ciclo 1: etapas geradas > 0", cycle1Stages > 0);

  console.log("  -- Repetição do ciclo 1 --");
  const r1repeat = await prisma.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: company }),
  );
  check("repetição: mesmo Payment", r1repeat.payment.id === r1.payment.id);
  check("repetição: alreadyProcessed = true", r1repeat.alreadyProcessed === true);
  const cycle1TasksAfterRepeat = await prisma.projectTask.count({ where: { origin_payment_id: r1.payment.id } });
  check("repetição: nenhuma tarefa nova", cycle1TasksAfterRepeat === cycle1Tasks.length, `${cycle1Tasks.length} -> ${cycle1TasksAfterRepeat}`);
  const cycle1StagesAfterRepeat = await prisma.projectTaskStage.count({ where: { project_task: { origin_payment_id: r1.payment.id } } });
  check("repetição: nenhuma etapa nova", cycle1StagesAfterRepeat === cycle1Stages);

  console.log("  -- Ciclo 2: nova tentativa, outro ciclo --");
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const cycle2Key = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  check("ciclo 2 usa uma chave diferente do ciclo 1", cycle2Key !== cycle1Key, `${cycle1Key} vs ${cycle2Key}`);

  const r2 = await prisma.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, { projectId, requesterUser: company, billingCycleKey: cycle2Key }),
  );
  check("ciclo 2: Payment novo e diferente do ciclo 1", r2.payment.id !== r1.payment.id, `${r2.payment.id} vs ${r1.payment.id}`);
  check("ciclo 2: status PAGO", r2.payment.status === "PAGO");
  check("ciclo 2: billing_cycle_key correto", r2.payment.billing_cycle_key === cycle2Key);

  const cycle2Tasks = await prisma.projectTask.findMany({ where: { origin_payment_id: r2.payment.id } });
  check("ciclo 2: tarefas novas geradas", cycle2Tasks.length > 0);
  check("ciclo 2: tarefas com billing_cycle_key do ciclo 2", cycle2Tasks.every((t) => t.billing_cycle_key === cycle2Key));

  const cycle1TasksFinal = await prisma.projectTask.count({ where: { origin_payment_id: r1.payment.id } });
  check("ciclo 1 não foi alterado pela geração do ciclo 2", cycle1TasksFinal === cycle1Tasks.length, `${cycle1Tasks.length} -> ${cycle1TasksFinal}`);

  const allCodes = (await prisma.projectTask.findMany({ where: { project_id: projectId }, select: { task_code: true } })).map((t) => t.task_code);
  check("nenhum código repetido entre os dois ciclos", new Set(allCodes).size === allCodes.length, allCodes.join(","));
}

// ─── H — sequências sob concorrência ───────────────────────────────────────
async function scenarioH() {
  console.log("\n=== H — sequências (projeto seguinte + concorrência) ===");

  const seqBefore = await prisma.entitySequence.findUniqueOrThrow({ where: { key: "project" } });
  const next = await withProjectCode(prisma, (tx, projectCode) =>
    tx.project.create({ data: { title: "H — verificação de sequência", status: "draft", project_code: projectCode } }),
  );
  check(
    "projeto seguinte recebe o próximo código (sequência + 1)",
    next.project_code === `proj_${String(seqBefore.current_value + 1).padStart(5, "0")}`,
    next.project_code,
  );
  await prisma.project.delete({ where: { id: next.id } }); // limpeza — não faz parte dos 15 fixtures

  // Duas criações concorrentes de projeto não podem repetir project_code.
  const [c1, c2] = await Promise.all([
    withProjectCode(prisma, (tx, projectCode) => tx.project.create({ data: { title: "H concorrência 1", status: "draft", project_code: projectCode } })),
    withProjectCode(prisma, (tx, projectCode) => tx.project.create({ data: { title: "H concorrência 2", status: "draft", project_code: projectCode } })),
  ]);
  check("duas criações concorrentes de projeto não repetem código", c1.project_code !== c2.project_code, `${c1.project_code} vs ${c2.project_code}`);
  await prisma.project.deleteMany({ where: { id: { in: [c1.id, c2.id] } } });

  // Duas confirmações de pagamento CONCORRENTES em projetos DIFERENTES (cada
  // uma gerando tarefas novas de verdade, não uma idempotente) não podem
  // colidir no código de tarefa.
  const agenciaUser = await getUser("agencia@allka.test");
  const partnerUser = await getUser("partner@allka.test");
  const [t1, t2] = await Promise.all([
    withIdempotentRetry(() => prisma.$transaction((tx) => confirmPaymentAndGenerateProjectTasks(tx, { projectId: "seed-reset-agency-02", requesterUser: agenciaUser }))),
    withIdempotentRetry(() => prisma.$transaction((tx) => confirmPaymentAndGenerateProjectTasks(tx, { projectId: "seed-reset-partner-02", requesterUser: partnerUser }))),
  ]);
  const codes1 = (t1.tasksResult?.generated ?? 0) > 0 ? await prisma.projectTask.findMany({ where: { origin_payment_id: t1.payment.id }, select: { task_code: true } }) : [];
  const codes2 = (t2.tasksResult?.generated ?? 0) > 0 ? await prisma.projectTask.findMany({ where: { origin_payment_id: t2.payment.id }, select: { task_code: true } }) : [];
  const allConcurrentCodes = [...codes1, ...codes2].map((c) => c.task_code);
  check(
    "tarefas geradas em confirmações concorrentes (projetos diferentes) não colidem",
    new Set(allConcurrentCodes).size === allConcurrentCodes.length,
    allConcurrentCodes.join(","),
  );

  const seqTaskFinal = await prisma.entitySequence.findUniqueOrThrow({ where: { key: "project_task" } });
  const totalTaskCount = await prisma.projectTask.count();
  check("sequência project_task nunca fica atrás da contagem real de tarefas", seqTaskFinal.current_value >= totalTaskCount, `seq=${seqTaskFinal.current_value} tasks=${totalTaskCount}`);
}

async function main() {
  console.log("─".repeat(70));
  console.log("VERIFY — Pagamento confirmado -> Tarefas -> Etapas (Fase 1.1)");
  console.log("─".repeat(70));

  await scenarioA();
  const bc = await scenarioBC();
  await scenarioD(bc);
  await scenarioE(bc);
  await scenarioF();
  await scenarioG();
  await scenarioH();

  console.log("\n" + "=".repeat(70));
  console.log(`RESULTADO FINAL: ${passed} passaram, ${failed} falharam`);
  console.log("=".repeat(70));

  if (failed > 0) {
    console.error("\n❌ Um ou mais checks falharam.");
    process.exit(1);
  }
  console.log("\n✅ Todos os checks passaram.");
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO INESPERADO:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
