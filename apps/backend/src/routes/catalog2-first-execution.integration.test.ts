import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { computePricing } from "../lib/catalog2-pricing";
import { amountForSubscriptionCycle, runSubscriptionsTick } from "../lib/catalog2-subscriptions";
import { gerarTarefasCatalog2DoProjeto, releaseCatalog2DeliveryCycle } from "../lib/generate-tasks-catalog2";
import { TestWorld, SEL, r2, tasksOf } from "../test-support/first-execution-helpers";

// Primeira execução (decisão de 16/10): as etapas marcadas "Só na primeira execução" formam a IMPLANTAÇÃO.
//  • entram na primeira cobrança e rodam só no 1º ciclo do produto no projeto;
//  • NÃO entram no preço da renovação; aparecem separadas na memória de cálculo ("Implantação/primeira execução").

const W = new TestWorld();
let CO_A: Awaited<ReturnType<TestWorld["mkCompanyUser"]>>;
let ADMIN: Awaited<ReturnType<TestWorld["mkAdmin"]>>;
const near = (a: unknown, b: unknown, msg?: string) => assert.ok(typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 0.03, `${msg ?? ""} ${a} != ${b}`);
const nameOfKeys = (rows: { catalog2_task: { key: string } | null; stages: { titulo: string }[] }[]) => rows.flatMap((t) => t.stages.map((s) => s.titulo));

describe("Primeira execução · implantação × recorrente (preço, cotação, contrato, projeto)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await W.start(app);
    CO_A = await W.mkCompanyUser("A");
    ADMIN = await W.mkAdmin();
  });
  beforeEach(async () => { await W.setPricingSettings(); });
  after(async () => { await W.cleanup(); await prisma.$disconnect(); });

  // etapa 1 = 120 min só na 1ª execução (implantação); etapa 2 = 60 min recorrente
  const STEPS = [{ minutes: 120, first: true, name: "Configurar a conta" }, { minutes: 60, name: "Otimizar campanhas" }];

  it("1. simulação: a implantação nasce das etapas “Só na primeira execução”; primeira cobrança = implantação + 1º ciclo; renovação = só o recorrente", async () => {
    const { versionId } = await W.mkProduct("Gestão mensal", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const cs = p.split.commercial_summary;
    const P = r2(p.split.schedule.steps.find((s: any) => s.step_key === "s2").price); // preço de 60 min recorrentes
    near(cs.first_cycle_recurring_price, P, "ciclo recorrente = 1 h");
    near(cs.implementation_price, 2 * P, "implantação = 2 h (etapa de 1ª execução)");
    near(cs.first_charge, 3 * P, "primeira cobrança = implantação + 1º ciclo");
    near(cs.renewal, P, "renovação = só o recorrente");
    near(cs.avulso, 3 * P, "avulso = implantação + um ciclo");
    near(p.lines.commercial_final_price.amount, 3 * P, "o preço comercial é o da primeira cobrança");
    assert.equal(p.split.first_execution.has_steps, true);
    assert.equal(p.split.first_execution.applies, true);
    assert.deepEqual(cs.implementation_steps.map((s: any) => s.name), ["Configurar a conta"]);
    assert.deepEqual(cs.recurring_steps.map((s: any) => s.name), ["Otimizar campanhas"]);
    // valores REALMENTE diferentes por ciclo (não só rótulos)
    near(p.split.cycle_prices[0].price, 3 * P);
    for (const k of [1, 2, 3, 4, 5]) near(p.split.cycle_prices[k].price, P, `ciclo ${k}`);
    assert.equal(p.split.implementation.applicable, true);
    assert.match(p.split.implementation.reason, /Só na primeira execução/);
    assert.equal(p.scenario.implementation_applicable, true);
  });

  it("2. produto sem etapa de primeira execução: não há implantação e a mensagem é a combinada", async () => {
    const { versionId } = await W.mkProduct("Sem implantação", { steps: [{ minutes: 60 }, { minutes: 60 }], recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    assert.equal(p.split.first_execution.has_steps, false);
    assert.equal(p.split.first_execution.reason, "Este produto não possui atividades exclusivas da primeira execução.");
    assert.equal(p.split.implementation.applicable, false);
    assert.equal(p.split.implementation.reason, "Este produto não possui atividades exclusivas da primeira execução.");
    near(p.split.commercial_summary.first_charge, p.split.commercial_summary.renewal, "sem implantação: primeira cobrança = renovação");
  });

  it("3. produto somente AVULSO: aceita avulso, recusa assinatura; avulso = implantação + 1 ciclo, sem renovação", async () => {
    const { product, versionId } = await W.mkProduct("Só avulso", { steps: STEPS, recurring: false, oneTime: true });
    const p = await W.simulate(ADMIN.token, versionId);
    near(p.split.commercial_summary.avulso, p.split.commercial_summary.first_charge);
    const q = await W.quote(CO_A.token, product.id);
    assert.equal(q.status, 201, JSON.stringify(q.json));
    near(q.json.commercial_price, p.split.commercial_summary.avulso);
    assert.equal(q.json.recurring_price, null, "avulso não tem mensalidade");
    const sub = await W.quote(CO_A.token, product.id, { period: "mensal" });
    assert.notEqual(sub.status, 201, "assinatura não está habilitada neste produto");
    const { pps } = await W.checkoutAndPay(CO_A.token, [q.json.id]);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: pps[0].id } }), 0, "avulso nunca renova");
  });

  it("4. produto somente ASSINATURA: recusa avulso e aceita assinatura mensal (primeira cobrança separada da renovação)", async () => {
    const { product, versionId } = await W.mkProduct("Só assinatura", { steps: STEPS, recurring: true, oneTime: false });
    const p = await W.simulate(ADMIN.token, versionId);
    const avulso = await W.quote(CO_A.token, product.id);
    assert.notEqual(avulso.status, 201, "avulso não está habilitado");
    const q = await W.quote(CO_A.token, product.id, { period: "mensal" });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    near(q.json.first_charge_price, p.split.commercial_summary.first_charge, "cotação = primeira cobrança");
    near(q.json.recurring_price, p.split.commercial_summary.renewal, "a mensalidade NÃO carrega a implantação");
    near(q.json.implementation_price, p.split.commercial_summary.implementation_price - 0, "implantação gravada à parte");
    near(q.json.first_charge_price - q.json.recurring_price, q.json.implementation_price, "primeira cobrança − mensalidade = implantação");
  });

  it("5. produto AVULSO E ASSINATURA: as duas formas funcionam; a cotação guarda a memória da cobrança", async () => {
    const { product, versionId } = await W.mkProduct("Avulso e assinatura", { steps: STEPS, recurring: true, oneTime: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const a = await W.quote(CO_A.token, product.id);
    const m = await W.quote(CO_A.token, product.id, { period: "mensal" });
    assert.equal(a.status, 201, JSON.stringify(a.json));
    assert.equal(m.status, 201, JSON.stringify(m.json));
    near(a.json.commercial_price, p.split.commercial_summary.avulso);
    near(m.json.commercial_price, p.split.commercial_summary.first_charge);
    const row = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: m.json.id } });
    const comps = JSON.parse(row.pricing_components_json!);
    assert.equal(comps.commercial_summary.implementation_steps[0].name, "Configurar a conta", "cotação guarda as etapas da implantação");
    assert.ok(comps.schedule.steps.some((s: any) => s.kind === "implementation"), "cronograma por etapa guardado");
    assert.ok(comps.first_execution.applies);
  });

  it("6. contrato: o pagamento é a primeira cobrança; a etapa de 1ª execução existe no ciclo 1 do projeto; a assinatura guarda valores separados", async () => {
    const { product, versionId } = await W.mkProduct("Contrato", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const q = await W.quote(CO_A.token, product.id, { period: "mensal" });
    const { projectId, pps } = await W.checkoutAndPay(CO_A.token, [q.json.id]);
    const pay = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId } });
    near(pay.amount, p.split.commercial_summary.first_charge, "o que foi cobrado = primeira cobrança");
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    near(pp.first_charge_snapshot ?? 0, p.split.commercial_summary.first_charge);
    near(pp.implementation_price_snapshot ?? 0, p.split.commercial_summary.implementation_price);
    near(pp.recurring_price_snapshot ?? 0, p.split.commercial_summary.renewal);
    assert.equal(pp.first_execution_in_project, true, "ficou registrado que a primeira execução entrou neste projeto");
    const t0 = await tasksOf(projectId, 0);
    assert.deepEqual(nameOfKeys(t0).sort(), ["Configurar a conta", "Otimizar campanhas"], "1º ciclo: implantação + recorrente");
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    near(sub.monthly_amount, p.split.commercial_summary.renewal, "valor recorrente congelado");
    near(sub.implementation_amount, p.split.commercial_summary.implementation_price, "implantação cobrada só agora");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: projectId, kind: "first_execution_included" } });
    assert.equal(logs.length, 1, "histórico: primeira execução incluída");
  });

  it("7. renovação: a fatura é só o recorrente e o ciclo 2 não tem a etapa de 1ª execução (com a justificativa no histórico)", async () => {
    const { product, versionId } = await W.mkProduct("Renovação", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const P = p.split.commercial_summary.renewal;
    const q = await W.quote(CO_A.token, product.id, { period: "mensal" });
    const { projectId, pps } = await W.checkoutAndPay(CO_A.token, [q.json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    near(amountForSubscriptionCycle(sub, 1), P, "ciclo 2 (índice 1) = só o recorrente");
    near(amountForSubscriptionCycle(sub, 2), P);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    const inv = await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
    assert.equal(inv.length, 2);
    near(inv[1].amount, P, "renovação sem implantação");
    assert.equal((await W.api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    assert.deepEqual(nameOfKeys(await tasksOf(projectId, 1)), ["Otimizar campanhas"], "renovação: só as etapas recorrentes");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: projectId, kind: "first_execution_skipped" } });
    assert.equal(logs.length, 1, "o histórico explica por que a etapa não foi criada");
    assert.match(logs[0].message, /já rodaram no primeiro ciclo deste projeto/);
  });

  it("8. NOVO PROJETO do mesmo cliente: nova primeira execução (a implantação volta a ser executada e cobrada)", async () => {
    const { product, versionId } = await W.mkProduct("Novo projeto", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const a = await W.checkoutAndPay(CO_A.token, [(await W.quote(CO_A.token, product.id, { period: "mensal" })).json.id]);
    const q2 = await W.quote(CO_A.token, product.id, { period: "mensal" });
    near(q2.json.first_charge_price, p.split.commercial_summary.first_charge, "o novo projeto cobra a implantação de novo");
    const b = await W.checkoutAndPay(CO_A.token, [q2.json.id]);
    assert.notEqual(a.projectId, b.projectId);
    assert.deepEqual(nameOfKeys(await tasksOf(b.projectId, 0)).sort(), ["Configurar a conta", "Otimizar campanhas"], "projeto novo = primeira execução de novo");
  });

  it("9. RECONTRATAÇÃO no mesmo projeto: o preço não tem implantação e a etapa não é criada", async () => {
    const { product, versionId } = await W.mkProduct("Mesmo projeto", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const P = p.split.commercial_summary.renewal;
    const a = await W.checkoutAndPay(CO_A.token, [(await W.quote(CO_A.token, product.id, { period: "mensal" })).json.id]);
    // o motor de preço, com o contexto "produto já contratado neste projeto", não cobra a implantação
    const again = await computePricing(versionId, SEL, { firstExecution: { applies: false } });
    near(again.split.commercial_summary.first_charge, P, "recontratação no mesmo projeto = só o recorrente");
    near(again.split.commercial_summary.implementation_price, 0);
    assert.equal(again.split.first_execution.applies, false);
    assert.ok(again.split.not_charged.some((n: any) => /já foi contratado neste projeto/.test(n.reason)));
    // e a geração de tarefas num SEGUNDO contrato do mesmo produto no mesmo projeto não repete a etapa
    const firstPp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: a.pps[0].id } });
    const pay2 = await prisma.payment.create({ data: { project_id: a.projectId, amount: 1, status: "PAGO", paid_at: new Date() } });
    const pp2 = await prisma.projectProduct.create({ data: { project_id: a.projectId, catalog2_product_id: product.id, catalog2_version_id: versionId, product_name_snapshot: "P", product_category_snapshot: "C", created_at: new Date(firstPp.created_at.getTime() + 60_000) } });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, a.projectId, { paymentId: pay2.id, paidAt: new Date(), billingCycleKey: "extra", projectProductIds: [pp2.id] }));
    const mine = await prisma.projectTask.findMany({ where: { project_product_id: pp2.id }, include: { stages: true } });
    assert.deepEqual(mine.flatMap((t) => t.stages.map((s) => s.titulo)), ["Otimizar campanhas"], "no mesmo projeto a implantação não se repete");
    assert.equal((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pp2.id } })).first_execution_in_project, false);
  });

  it("10. a cotação de um aditivo no mesmo projeto é refeita SEM a implantação (e a revalidação não acusa desvio de preço)", async () => {
    const { product, versionId } = await W.mkProduct("Aditivo", { steps: STEPS, recurring: false, oneTime: true });
    const p = await W.simulate(ADMIN.token, versionId);
    const a = await W.checkoutAndPay(CO_A.token, [(await W.quote(CO_A.token, product.id)).json.id]);
    const q2 = await W.quote(CO_A.token, product.id, { selection: { ...SEL, quantity: 1 } });
    // a cotação de conta (sem projeto) ainda inclui a implantação…
    near(q2.json.commercial_price, p.split.commercial_summary.avulso);
    const co = await W.api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: a.projectId, quote_id: q2.json.id } });
    assert.ok([200, 201].includes(co.status), JSON.stringify(co.json));
    // …e ao pedir o aditivo para o projeto que já tem o produto, passa a valer o preço SEM a primeira execução
    const fresh = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q2.json.id } });
    assert.equal(fresh.for_project_id, a.projectId);
    near(fresh.commercial_price ?? 0, p.split.commercial_summary.renewal, "aditivo no mesmo projeto: só o recorrente");
    const reval = await W.api(`/api/catalog2/quotes/${q2.json.id}/revalidate`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(reval.json?.needs_recalc ?? false, false, JSON.stringify(reval.json));
  });

  it("11. o administrador pode FORÇAR a primeira execução no próximo ciclo (com justificativa e histórico)", async () => {
    const { product } = await W.mkProduct("Forçada", { steps: STEPS, recurring: true });
    const { projectId, pps } = await W.checkoutAndPay(CO_A.token, [(await W.quote(CO_A.token, product.id, { period: "mensal" })).json.id]);
    const denied = await W.api(`/api/admin/catalog2/project-products/${pps[0].id}/force-first-execution`, { method: "POST", token: ADMIN.token, body: { reason: "curto" } });
    assert.equal(denied.status, 400, "justificativa curta é recusada");
    const ok = await W.api(`/api/admin/catalog2/project-products/${pps[0].id}/force-first-execution`, { method: "POST", token: ADMIN.token, body: { reason: "Cliente trocou de plataforma de anúncios: refazer a configuração." } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    await W.api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    assert.deepEqual(nameOfKeys(await tasksOf(projectId, 1)).sort(), ["Configurar a conta", "Otimizar campanhas"], "a implantação voltou, por ordem do administrador");
    const logs = await prisma.projectDecisionLog.findMany({ where: { project_id: projectId, kind: { in: ["first_execution_force_requested", "first_execution_forced_applied"] } } });
    assert.equal(logs.length, 2, "histórico do pedido e da aplicação");
    assert.ok(logs.some((l) => /trocou de plataforma/.test(l.message)));
    assert.equal((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } })).force_first_execution_next, false, "a ordem vale uma vez");
  });

  it("12. horas extras de variação numa etapa de 1ª execução viram cobrança única: sobem a implantação e não entram na renovação", async () => {
    const variationsRaw = [{ key: "porte", name: "Porte", is_required: true, selection_type: "single", options: { create: [
      { key: "basico", label: "Básico", is_default: true },
      { key: "plus", label: "Plus", effects: { create: [{ effect_type: "add_effort_hours", effect_value: "1", charge_scope: "recurring", source_task_key: "rotina", source_step_key: "s1" }] } },
    ] } }];
    const { versionId } = await W.mkProduct("Horas extras", { steps: STEPS, recurring: true, variationsRaw });
    const base = await W.simulate(ADMIN.token, versionId, { ...SEL, variation_option_keys: ["basico"] });
    const plus = await W.simulate(ADMIN.token, versionId, { ...SEL, variation_option_keys: ["plus"] });
    assert.ok(plus.split.commercial_summary.implementation_price > base.split.commercial_summary.implementation_price + 0.5, "a implantação sobe");
    near(plus.split.commercial_summary.renewal, base.split.commercial_summary.renewal, "a renovação não muda");
  });

  it("13. memória de cálculo: implantação e recorrência aparecem separadas, com as etapas de cada uma", async () => {
    const { versionId } = await W.mkProduct("Memória", { steps: STEPS, recurring: true });
    const p = await W.simulate(ADMIN.token, versionId);
    assert.deepEqual(p.split.implementation.steps.map((s: any) => s.name), ["Configurar a conta"]);
    assert.deepEqual(p.split.recurring.steps.map((s: any) => s.name), ["Otimizar campanhas"]);
    assert.ok(p.split.implementation.price > p.split.recurring.price, "a implantação (2 h) custa mais que o ciclo (1 h)");
    near(p.split.first_charge_parts.implementation + p.split.first_charge_parts.recurring + p.split.first_charge_parts.one_time, p.split.first_charge, "as partes fecham a primeira cobrança");
  });

  it("14. produto ANTIGO preservado: sem etapa de 1ª execução o preço é o mesmo de sempre; tarefa de implantação legada continua valendo", async () => {
    const { versionId } = await W.mkProduct("Antigo", { steps: [{ minutes: 60 }, { minutes: 60 }], recurring: true, flags: { has_initial_implementation: true, implementation_rule: "on_revalidation", sell_mode: "standalone" } });
    const p = await W.simulate(ADMIN.token, versionId);
    near(p.split.commercial_summary.first_charge, p.split.commercial_summary.renewal);
    near(p.lines.commercial_final_price.amount, p.split.first_charge);
    assert.equal(p.split.implementation.rule, "on_revalidation", "o valor antigo é preservado e informado");
    // tarefa legada de implantação por ciclo (sem etapa marcada): continua cobrada só na 1ª vez, como antes
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2Task.create({ data: { version_id: versionId, key: "impl", name: "Implantação legada", sort_order: 9, specialty_id: spec.id, cycle_type: "implementacao", steps: { create: [{ key: "i1", name: "Passo de implantação", sort_order: 1, specialty_id: spec.id, estimated_minutes: 60 }] } } });
    const legacy = await W.simulate(ADMIN.token, versionId);
    assert.ok(legacy.split.commercial_summary.implementation_price > 0);
    assert.equal(legacy.split.implementation.applicable, true);
  });

  it("15. etapa COM horas mas SEM especialidade deixa o preço “a definir” e diz qual etapa falta (nunca vira R$ 0,00 em silêncio)", async () => {
    const { versionId } = await W.mkProduct("Sem especialidade", { steps: STEPS, recurring: true, publish: false });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
    await prisma.catalog2Task.update({ where: { id: task.id }, data: { specialty_id: null } });
    await prisma.catalog2TaskStep.updateMany({ where: { task_id: task.id, key: "s1" }, data: { specialty_id: null } });
    const p = await W.simulate(ADMIN.token, versionId);
    assert.ok(p.pending_info.some((m: string) => /especialidade de etapa\(s\) com horas/.test(m) && /Configurar a conta/.test(m)), JSON.stringify(p.pending_info));
    assert.ok(p.warnings.some((w: any) => w.code === "step_without_specialty"));
    assert.equal(p.lines.commercial_final_price.amount, null);
    assert.equal(p.split.commercial_summary.first_charge, null, "a primeira cobrança também fica a definir");
    // com a especialidade informada o preço volta a existir
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2TaskStep.updateMany({ where: { task_id: task.id, key: "s1" }, data: { specialty_id: spec.id } });
    const ok = await W.simulate(ADMIN.token, versionId);
    assert.ok(ok.pending_info.every((m: string) => !/especialidade de etapa/.test(m)));
    assert.ok(ok.split.commercial_summary.first_charge > 0);
  });
});

void releaseCatalog2DeliveryCycle;
