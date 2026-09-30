import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { gerarTarefasCatalog2DoProjeto, releaseCatalog2DeliveryCycle } from "../lib/generate-tasks-catalog2";
import { reevaluateSuccessors } from "../lib/task-release-service";

// Ciclos: implementação inicial x recorrência, 1ª contratação x seguintes.

const cleanup: (() => Promise<void>)[] = [];
const uid = () => crypto.randomBytes(4).toString("hex");

async function mkCatalog(opts: { implementationRule?: string; blocks?: boolean } = {}) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `cyc-${code}`, internal_name: `[TESTE] Ciclos ${code}`, status: "disponivel", delivery_recurrence: "mensal" } });
  const ver = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: prod.id, version_number: 1, state: "publicada", title: "T", accepts_recurring: true, has_initial_implementation: true,
      implementation_rule: opts.implementationRule ?? "first_only", implementation_blocks_operation: opts.blocks ?? true,
    },
  });
  const mk = (key: string, extra: Record<string, unknown> = {}, order = 1) =>
    prisma.catalog2Task.create({ data: { version_id: ver.id, key, name: `Tarefa ${key}`, sort_order: order, ...extra } });
  const impl = await mk("impl", { cycle_type: "implementacao" }, 1);
  const monthly = await mk("mensal", {}, 2);
  const firstOnly = await mk("primeira-vez", { repeat_rule: "first_only" }, 3);
  const every2 = await mk("a-cada-2", { repeat_rule: "every_n_cycles", repeat_every_cycles: 2 }, 4);
  const manual = await mk("manual", { repeat_rule: "manual" }, 5);
  const oneTime = await mk("avulsa", { cycle_type: "avulso" }, 6);
  cleanup.push(async () => {
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { prod, ver, tasks: { impl, monthly, firstOnly, every2, manual, oneTime } };
}

async function mkContract(catalog: Awaited<ReturnType<typeof mkCatalog>>, companyId: string, months = 3, monthsAgo = 3) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto Ciclo ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({
    data: {
      project_id: project.id, catalog2_product_id: catalog.prod.id, catalog2_version_id: catalog.ver.id, product_name_snapshot: "P",
      product_category_snapshot: "C", catalog2_period: "trimestral", catalog2_period_months: months,
    },
  });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 100, status: "PAGO", paid_at: new Date() } });
  const paidAt = new Date();
  paidAt.setMonth(paidAt.getMonth() - monthsAgo);
  await prisma.$transaction((tx) =>
    gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt, billingCycleKey: "c0", projectProductIds: [pp.id] }),
  );
  cleanup.push(async () => {
    await prisma.taskDependency.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: project.id } } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  });
  return { project, pp, payment };
}

const keysOf = async (projectId: string, cycleIndex?: number) =>
  (await prisma.projectTask.findMany({
    where: { project_id: projectId, ...(cycleIndex === undefined ? {} : { occurrence_index: cycleIndex }) },
    include: { catalog2_task: { select: { key: true } } },
  })).map((t) => t.catalog2_task!.key).sort();

describe("Ciclos: implementação inicial, recorrência e repetição", () => {
  let companyId = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    companyId = (await prisma.company.create({ data: { name: `Empresa Ciclos ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.company.delete({ where: { id: companyId } }).catch(() => {}); });
  });
  after(async () => {
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.$disconnect();
  });

  it("1º ciclo da 1ª contratação: implementação + operação; operação BLOQUEADA até a implementação concluir; manual não nasce; tudo registrado", async () => {
    const cat = await mkCatalog();
    const { project, pp } = await mkContract(cat, companyId);
    assert.deepEqual(await keysOf(project.id, 0), ["a-cada-2", "avulsa", "impl", "mensal", "primeira-vez"]);

    const rows = await prisma.projectTask.findMany({ where: { project_id: project.id }, include: { catalog2_task: { select: { key: true } } } });
    const by = Object.fromEntries(rows.map((r) => [r.catalog2_task!.key, r]));
    assert.equal(by["impl"].cycle_kind, "implementacao");
    assert.equal(by["impl"].status, "PARA_LANCAMENTO");
    assert.equal(by["mensal"].cycle_kind, "recorrencia_mensal");
    assert.equal(by["mensal"].status, "PENDENTE_DE_LIBERACAO", "operação aguarda a implementação");
    assert.equal(by["avulsa"].status, "PENDENTE_DE_LIBERACAO");
    const deps = await prisma.taskDependency.findMany({ where: { project_id: project.id, depends_on_task_id: by["impl"].id } });
    assert.equal(deps.length, 4);

    const contract = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pp.id } });
    assert.equal(contract.contract_mode, "mensal_implementacao");
    assert.equal(contract.first_contract, true);

    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: project.id } });
    assert.ok(logs.some((l) => l.kind === "task_dispensed" && /manual/i.test(l.message)));
    assert.ok(logs.some((l) => l.kind === "operation_blocked"));
    assert.ok(logs.some((l) => l.kind === "cycle_generated"));

    // concluir a implementação libera a operação
    await prisma.projectTask.update({ where: { id: by["impl"].id }, data: { status: "CONCLUIDA" } });
    await reevaluateSuccessors(by["impl"].id, prisma);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: by["mensal"].id } })).status, "PARA_LANCAMENTO");
  });

  it("ciclos seguintes geram só as recorrentes, cada uma conforme a sua regra", async () => {
    const cat = await mkCatalog();
    const { project, pp } = await mkContract(cat, companyId, 3, 3);
    const cycles = await prisma.catalog2ProjectDeliveryCycle.findMany({ where: { project_product_id: pp.id }, orderBy: { occurrence_index: "asc" } });
    assert.deepEqual(cycles.map((c) => c.occurrence_index), [1, 2]);

    assert.equal(await releaseCatalog2DeliveryCycle(prisma, cycles[0].id), "released");
    assert.deepEqual(await keysOf(project.id, 1), ["mensal"], "ciclo 2: só a mensal (a-cada-2 é ciclos 1, 3…; primeira-vez, impl, avulsa e manual não)");

    assert.equal(await releaseCatalog2DeliveryCycle(prisma, cycles[1].id), "released");
    assert.deepEqual(await keysOf(project.id, 2), ["a-cada-2", "mensal"], "ciclo 3: a-cada-2 volta");
    const kinds = (await prisma.projectTask.findMany({ where: { project_id: project.id, occurrence_index: { gt: 0 } } })).map((t) => t.cycle_kind);
    assert.ok(kinds.every((k) => k === "recorrencia_mensal"));
  });

  it("2ª contratação do MESMO cliente: implementação concluída não é repetida (e a operação não fica bloqueada)", async () => {
    const cat = await mkCatalog();
    const first = await mkContract(cat, companyId);
    const impl = await prisma.projectTask.findFirstOrThrow({ where: { project_id: first.project.id, catalog2_task: { key: "impl" } } });
    await prisma.projectTask.update({ where: { id: impl.id }, data: { status: "CONCLUIDA" } });

    const second = await mkContract(cat, companyId);
    const keys = await keysOf(second.project.id, 0);
    assert.ok(!keys.includes("impl"), "implementação já feita");
    assert.ok(keys.includes("mensal"));
    const ops = await prisma.projectTask.findMany({ where: { project_id: second.project.id } });
    assert.ok(ops.every((t) => t.status === "PARA_LANCAMENTO"), "sem implementação, nada fica bloqueado");
    assert.equal((await prisma.projectProduct.findUniqueOrThrow({ where: { id: second.pp.id } })).first_contract, false);
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: second.project.id, kind: "implementation_skipped" } });
    assert.equal(logs.length, 1);
    assert.match(logs[0].message, /já concluída/);
  });

  it("regra 'sempre' repete a implementação; motivo de revalidação também", async () => {
    const always = await mkCatalog({ implementationRule: "always" });
    const a1 = await mkContract(always, companyId);
    const impl1 = await prisma.projectTask.findFirstOrThrow({ where: { project_id: a1.project.id, catalog2_task: { key: "impl" } } });
    await prisma.projectTask.update({ where: { id: impl1.id }, data: { status: "CONCLUIDA" } });
    const a2 = await mkContract(always, companyId);
    assert.ok((await keysOf(a2.project.id, 0)).includes("impl"));

    const reval = await mkCatalog();
    const r1 = await mkContract(reval, companyId);
    const i1 = await prisma.projectTask.findFirstOrThrow({ where: { project_id: r1.project.id, catalog2_task: { key: "impl" } } });
    await prisma.projectTask.update({ where: { id: i1.id }, data: { status: "CONCLUIDA" } });
    // 2º contrato com motivo de revalidação registrado ANTES de gerar
    const code = uid();
    const project = await prisma.project.create({ data: { title: `Reval ${code}`, project_code: code, company_id: companyId } });
    const pp = await prisma.projectProduct.create({
      data: { project_id: project.id, catalog2_product_id: reval.prod.id, catalog2_version_id: reval.ver.id, product_name_snapshot: "P", product_category_snapshot: "C", revalidation_reason: "acesso expirado" },
    });
    const pay = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: pay.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
    cleanup.push(async () => {
      await prisma.taskDependency.deleteMany({ where: { project_id: project.id } });
      await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
      await prisma.payment.deleteMany({ where: { project_id: project.id } });
      await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    });
    const rows = await prisma.projectTask.findMany({ where: { project_id: project.id }, include: { catalog2_task: { select: { key: true } } } });
    const impl = rows.find((r) => r.catalog2_task!.key === "impl");
    assert.ok(impl, "revalidação recria a implementação");
    assert.equal(impl!.cycle_kind, "revalidacao");
  });
});
