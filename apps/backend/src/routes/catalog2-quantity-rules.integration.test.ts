import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { computePricing, cycleAmount } from "../lib/catalog2-pricing";
import { publishVersion } from "../lib/catalog2-service";
import { quantityRulesSchema, volumeSelection, executionStepsForCycle, executionSnapshot, stageExecutionBudget } from "../lib/catalog2-quantity";
import { pagarEtapasConcluidas } from "../lib/stage-payout";
import { api, startServer, stopServer, mkAdmin, mkCompanyUser, mkProduct, mkUser, setRate, SEL, checkoutAndPay, tasksOf } from "../test-support/universal-helpers";
let admin: Awaited<ReturnType<typeof mkAdmin>>, buyer: Awaited<ReturnType<typeof mkCompanyUser>>;
const rules = { repeat_setup_per_contract: true, extra_deadline_percent_per_unit: 20, discount_tiers: [{ from_quantity: 2, discount_percent: 5 }, { from_quantity: 3, discount_percent: 10 }] };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.03, `${a} ≠ ${b}`);
async function product() {
  return mkProduct({ name: "Quantidade e nova demanda", tasks: [{ key: "t", steps: [{ key: "setup", minutes: 60 }, { key: "work", minutes: 60 }], data: { stage_execution: "stage", stage_payout_mode: "per_stage" } }] });
}
async function save(id: string, value: unknown) {
  return api(`/api/admin/catalog2/versions/${id}`, { method: "PUT", token: admin.token, body: { quantity_rules: value } });
}
async function quote(productId: string, quantity = 1, groups = [quantity]) {
  const res = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product: productId, selection: { ...SEL, quantity, delivery_groups: groups } } });
  assert.equal(res.status, 201, JSON.stringify(res.json)); return res.json;
}
async function aditivo(projectId: string, quoteId: string) {
  const req = await api("/api/catalog2/change-orders", { method: "POST", token: buyer.token, body: { project_id: projectId, quote_id: quoteId } });
  assert.equal(req.status, 201, JSON.stringify(req.json));
  const approved = await api(`/api/catalog2/change-orders/${req.json.id}/approve`, { method: "POST", token: admin.token, body: { approval_client_action_id: crypto.randomUUID() } });
  assert.equal(approved.status, 200, JSON.stringify(approved.json));
  const result = await api(`/api/catalog2/change-orders/${req.json.id}/checkout`, { method: "POST", token: buyer.token });
  assert.equal(result.status, 201, JSON.stringify(result.json)); return result;
}
before(async () => { await startServer(); admin = await mkAdmin(); buyer = await mkCompanyUser("volume"); });
after(async () => { await stopServer(); await prisma.$disconnect(); });
describe("Reunião 28/10 · quantidade, implantação, prazo, desconto e repasse", () => {
  it("valida faixas, não inventa percentuais e escolhe a maior faixa sem acumulá-las", () => {
    assert.equal(quantityRulesSchema.safeParse({ discount_tiers: [{ from_quantity: 2, discount_percent: 5 }, { from_quantity: 2, discount_percent: 6 }] }).success, false);
    assert.equal(quantityRulesSchema.safeParse({ discount_tiers: [{ from_quantity: 2, discount_percent: 20 }, { from_quantity: 5, discount_percent: 10 }] }).success, false);
    assert.equal(quantityRulesSchema.safeParse({ discount_tiers: [{ from_quantity: 2, discount_percent: 100 }] }).success, false);
    const v = volumeSelection(rules, { quantity: 3, delivery_groups: [1, 1, 1] });
    assert.equal(v.discountPercent, 10); assert.equal(v.deadlineMultiplier, 1);
    assert.equal(quantityRulesSchema.parse({}).extra_deadline_percent_per_unit, 0);
  });
  it("salva e copia as regras; faixa inválida não sobrescreve o cadastro", async () => {
    const p = await product();
    assert.equal((await save(p.versionId, rules)).status, 200);
    assert.ok(await prisma.catalog2VersionEvent.findFirst({ where: { version_id: p.versionId, note: { contains: "regras de quantidade, implantação e descontos" } } }));
    assert.equal((await save(p.versionId, { ...rules, discount_tiers: [{ from_quantity: 0, discount_percent: -1 }] })).status, 400);
    assert.deepEqual(JSON.parse((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } })).quantity_rules_json!), rules);
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const copied = await api(`/api/admin/catalog2/products/${p.product.id}/versions`, { method: "POST", token: admin.token, body: {} });
    assert.equal(copied.status, 201, JSON.stringify(copied.json));
    assert.deepEqual(JSON.parse((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: copied.json.version_id } })).quantity_rules_json!), rules);
  });
  it("desconto e prazo chegam à memória, cotação, contrato e repasse, sem reduzir esforço", async () => {
    const p = await product();
    const before = await computePricing(p.versionId, { ...SEL, quantity: 3, delivery_groups: [3] });
    assert.equal((await save(p.versionId, rules)).status, 200);
    const price = await computePricing(p.versionId, { ...SEL, quantity: 3, delivery_groups: [3] });
    near(price.lines.commercial_final_price.amount!, before.lines.commercial_final_price.amount! * 0.9);
    near(price.deadline.effort_minutes, before.deadline.effort_minutes);
    assert.equal(price.deadline.commercial_deadline_days, 7); // base 5, lote 3, +40%
    near(cycleAmount(price.split.schedule, 0, 0), price.split.first_charge!);
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const q = await quote(p.product.id, 3);
    assert.equal(q.pricing_snapshot.volume.discount_percent, 10);
    assert.equal(JSON.stringify(q).includes("execution_snapshot_json"), false, "snapshot interno não vaza para comprador");
    const pp = await checkoutAndPay(buyer.token, [q.id]);
    const tasks = await tasksOf(pp.projectId);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].delivery_quantity, 3);
    for (const stage of tasks[0].stages) {
      near(stage.valor_nomade!, 270); // custo humano de 100 × 3 × 90%
      near(stage.horas_execucao!, 1.4); // prazo de execução, não esforço
      assert.equal(JSON.parse(stage.config_snapshot!).effort_minutes, 180);
    }
    near((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pp.pps[0].id } })).product_price_snapshot, q.commercial_price);
  });
  it("tarefas separadas têm prazos independentes e IDs distintos", async () => {
    const p = await product(); await save(p.versionId, rules);
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const q = await quote(p.product.id, 3, [1, 1, 1]);
    assert.equal(q.commercial_deadline_days, 5);
    const order = await checkoutAndPay(buyer.token, [q.id]);
    const tasks = await tasksOf(order.projectId);
    assert.equal(tasks.length, 3);
    assert.equal(new Set(tasks.flatMap((t) => t.stages.map((s) => s.id))).size, 6);
    assert.ok(tasks.every((t) => t.status === "PARA_LANCAMENTO" && t.stages.every((s) => s.horas_execucao === 1 && s.valor_nomade === 90)));
  });
  it("percentual específico da etapa é salvo e controla seu prazo", async () => {
    const p = await product(); await save(p.versionId, { ...rules, extra_deadline_percent_per_unit: 10 });
    const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { task: { version_id: p.versionId }, key: "work" } });
    const res = await api(`/api/admin/catalog2/steps/${step.id}`, { method: "PUT", token: admin.token, body: { ops: { multiple_units: { deadline_extra_percent: 30 } } } });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const q = await quote(p.product.id, 3), order = await checkoutAndPay(buyer.token, [q.id]);
    assert.equal(q.commercial_deadline_days, 8);
    const task = (await tasksOf(order.projectId))[0];
    near(task.stages.find((s) => s.catalog_step_ref === step.id)!.horas_execucao!, 1.6);
  });
  it("desconto exagerado bloqueia a cotação, em vez de vender abaixo do custo", async () => {
    const p = await product(); await save(p.versionId, { ...rules, discount_tiers: [{ from_quantity: 2, discount_percent: 99 }] });
    await publishVersion(p.versionId, admin.user.id, { activate: true }); // quantidade padrão 1 continua válida
    const res = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product: p.product.id, selection: { ...SEL, quantity: 2 } } });
    assert.equal(res.status, 422, JSON.stringify(res.json));
    assert.match(JSON.stringify(res.json), /abaixo do custo/);
  });
  it("nova demanda repete implantação no aditivo, mantendo tarefas anteriores intactas", async () => {
    const p = await product(); await save(p.versionId, rules);
    await prisma.catalog2TaskStep.updateMany({ where: { task: { version_id: p.versionId }, key: "setup" }, data: { first_execution_only: true } });
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const first = await checkoutAndPay(buyer.token, [(await quote(p.product.id)).id]);
    const original = await tasksOf(first.projectId);
    await aditivo(first.projectId, (await quote(p.product.id)).id);
    const all = await tasksOf(first.projectId);
    assert.equal(all.length, 2); assert.ok(all.every((t) => t.stages.length === 2));
    assert.deepEqual(all.find((t) => t.id === original[0].id), original[0]);
  });
  it("etapa condicional desligada não é materializada no pedido", async () => {
    const p = await mkProduct({ name: "Etapa por condição", publish: true, tasks: [{ key: "t", steps: [{ key: "base" }, { key: "condicional", conditional: true }] }],
      variations: [{ key: "features", name: "Escopo", is_required: false, options: { create: [{ key: "base", label: "Padrão", is_default: true }, { key: "enable", label: "Com extra", effects: { create: [{ effect_type: "add_step", effect_value: "t:condicional" }] } }] } }] });
    const order = await checkoutAndPay(buyer.token, [(await quote(p.product.id)).id]);
    const tasks = await tasksOf(order.projectId);
    assert.equal(tasks[0].stages.length, 1);
    assert.match(tasks[0].stages[0].titulo, /base/);
    const enabledQuote = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product: p.product.id, selection: { ...SEL, variation_option_keys: ["enable"] } } });
    assert.equal(enabledQuote.status, 201, JSON.stringify(enabledQuote.json));
    const enabledOrder = await checkoutAndPay(buyer.token, [enabledQuote.json.id]);
    assert.equal((await tasksOf(enabledOrder.projectId))[0].stages.length, 2);
  });
  it("horas extras selecionadas na cotação entram no esforço e repasse da etapa real", async () => {
    const p = await mkProduct({ name: "Extra de esforço", publish: true, tasks: [{ key: "t", steps: [{ key: "s", minutes: 60 }] }],
      variations: [{ key: "scope", name: "Escopo", is_required: false, options: { create: [{ key: "normal", label: "Normal", is_default: true }, { key: "extra", label: "Mais uma hora", effects: { create: [{ effect_type: "add_effort_hours", effect_value: "1", source_task_key: "t", source_step_key: "s", charge_scope: "first_cycle" }] } }] } }] });
    const q = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product: p.product.id, selection: { ...SEL, variation_option_keys: ["extra"] } } });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    const order = await checkoutAndPay(buyer.token, [q.json.id]);
    const stage = (await tasksOf(order.projectId))[0].stages[0];
    near(stage.valor_nomade!, 200); near(stage.horas_execucao!, 2);
    assert.equal(JSON.parse(stage.config_snapshot!).effort_minutes, 120);
  });
  it("planejamento de renovação somente de implantação devolve vazio, sem fallback para as etapas antigas", () => {
    const onlySetup = [{ key: "setup", first_execution_only: true }, { key: "modelo", step_model: { first_execution_only: true } }];
    assert.deepEqual(executionStepsForCycle(onlySetup, "t", null, true), []);
    assert.deepEqual(executionStepsForCycle(onlySetup, "t", null, false), onlySetup);
    const mixed = [...onlySetup, { key: "work" }];
    assert.deepEqual(executionStepsForCycle(mixed, "t", null, true).map((s) => s.key), ["work"]);
  });
  it("esforço adicional é repartido sem duplicar entre lotes e respeita ciclo de cobrança", () => {
    const snapshot = { discount_percent: 10, steps: [{ ref: "t:work", minutes: 60, rate: 100, cost: 100, extras: [{ minutes: 60, cost: 100, scope: "first_cycle", start: 0, end: null }] }] };
    const a = stageExecutionBudget(snapshot, "t:work", 1, 3, 0, 60);
    const b = stageExecutionBudget(snapshot, "t:work", 2, 3, 0, 60);
    near(a.amount! + b.amount!, 360); // (3 h base + 1 h extra) × 100 × 90%
    near(a.effortMinutes! + b.effortMinutes!, 240);
    const renewal = stageExecutionBudget(snapshot, "t:work", 3, 3, 1, 60);
    near(renewal.amount!, 270); near(renewal.effortMinutes!, 180);
  });
  it("a fotografia inclui horas extras do cenário sem expor custos na resposta comercial", async () => {
    const p = await product();
    const pricing = await computePricing(p.versionId, SEL);
    pricing.effort_breakdown.push({ from: "opcao:extra", mode: "add", task: "t", step: "work", minutes_per_unit: 60, scale: 1, minutes: 60, when: "primeiro ciclo", specialty: "Designer", rate: 100, human_cost: 100, qualification_cost: 15, cost: 115 });
    pricing.split.schedule.items.push({ label: "esforço:opcao:extra", price: 183, scope: "first_cycle", start: 0, end: null });
    const stored = JSON.parse(executionSnapshot(pricing, rules));
    const budget = stageExecutionBudget(stored, "t:work", 1, 1, 0, 60);
    near(budget.amount!, 200); near(budget.effortMinutes!, 120);
    near(stageExecutionBudget(stored, "t:work", 1, 1, 1, 60).amount!, 100);
  });
  it("repasse usa valor congelado e credita uma única vez, sem mudar valor/hora global", async () => {
    const p = await product(); await save(p.versionId, rules);
    await publishVersion(p.versionId, admin.user.id, { activate: true });
    const q = await quote(p.product.id, 3);
    await setRate("designer", 200); // mudança posterior não pode reprecificar o repasse contratado
    const order = await checkoutAndPay(buyer.token, [q.id]);
    const t = (await tasksOf(order.projectId))[0];
    const u = await mkUser("nomad", "nomades");
    const n = await prisma.nomade.create({ data: { id: crypto.randomUUID(), user_id: u.id, name: "Executor teste descartável", email: u.email } });
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: t.id }, data: { status: "CONCLUIDA", nomade_id: n.id } });
    assert.equal(await pagarEtapasConcluidas(t.id), 2);
    assert.equal(await pagarEtapasConcluidas(t.id), 0);
    const entries = await prisma.walletLedger.findMany({ where: { reference_id: { in: t.stages.map((s) => s.id) }, type: "task_payout" } });
    near(entries.reduce((a, e) => a + e.amount, 0), 540);
    assert.equal((await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } })).max_hourly_rate, 200);
  });
});
