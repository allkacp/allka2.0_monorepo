import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";
import { clientPricingView } from "../lib/catalog2-client";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";

// Pedido 3 · Fase 7 — custos: perfil e custo de IA, tempo e custo de revisão, demonstrativo por tarefa e custos realizados.

let baseUrl = "";
let server: import("node:http").Server;
const cleanup: (() => Promise<void>)[] = [];
const userIds: string[] = [];
const uid = () => crypto.randomBytes(4).toString("hex");

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkUser(role: string, account_type: string, extra: Record<string, unknown> = {}) {
  const id = `cost-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}

async function setSettings(reviewPct: number | null = 10) {
  const data = {
    tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: reviewPct,
    component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
  };
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
}

type TaskSpec = { key: string; mode?: string; minutes?: number; specialty: string | null; review?: { minutes: number; specialty: string | null }; ai?: { profile_id?: string | null; tin?: number; tout?: number; rounds?: number; cin?: number | null; cout?: number | null } };
async function mkVersion(tasks: TaskSpec[], state = "rascunho") {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `cost-${code}`, internal_name: `[TESTE] Custos ${code}`, status: state === "publicada" ? "disponivel" : "em_preparacao" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state, title: "T", implementation_blocks_operation: false, base_commercial_deadline_days: 5 } });
  let order = 1;
  for (const t of tasks) {
    const ct = await prisma.catalog2Task.create({
      data: {
        version_id: ver.id, key: t.key, name: `Tarefa ${t.key}`, sort_order: order++, execution_mode: t.mode ?? "humano", specialty_id: t.specialty, estimated_minutes: t.minutes ?? 60,
        requires_review: !!t.review, review_minutes: t.review?.minutes ?? null, review_specialty_id: t.review?.specialty ?? null,
      },
    });
    await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: "e1", name: "Etapa", sort_order: 1 } });
    if (t.ai) await prisma.catalog2TaskAI.create({ data: { task_id: ct.id, profile_id: t.ai.profile_id ?? null, est_input_tokens: t.ai.tin ?? 0, est_output_tokens: t.ai.tout ?? 0, est_review_rounds: t.ai.rounds ?? 0, unit_cost_input_per_1k: t.ai.cin ?? null, unit_cost_output_per_1k: t.ai.cout ?? null } });
  }
  cleanup.push(async () => {
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { prod, ver };
}

describe("Pedido 3 · Fase 7 — custos", () => {
  let specA = "";
  let specB = "";
  let specNoRate = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    const specs = await prisma.catalog2Specialty.findMany({ take: 3, orderBy: { key: "asc" } });
    [specA, specB, specNoRate] = specs.map((s) => s.id);
    await prisma.catalog2Specialty.update({ where: { id: specA }, data: { max_hourly_rate: 100 } });
    await prisma.catalog2Specialty.update({ where: { id: specB }, data: { max_hourly_rate: 200 } });
    await prisma.catalog2Specialty.update({ where: { id: specNoRate }, data: { max_hourly_rate: null } });
    await setSettings(10);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("produto só com tarefas humanas e sem tempo de revisão: preço idêntico ao de sempre (revisão = percentual do custo humano)", async () => {
    const v = await mkVersion([{ key: "a", specialty: specA, minutes: 60 }, { key: "b", specialty: specB, minutes: 30 }]);
    const p = await computePricing(v.ver.id, await defaultSelection(v.ver.id));
    // humano: 60min×100/h = 100 + 30min×200/h = 100 → 200; revisão 10% = 20; IA = 0
    assert.equal(p.lines.human_cost.amount, 200);
    assert.equal(p.lines.ia_cost.amount, 0);
    assert.equal(p.lines.human_review_cost.amount, 20);
    assert.equal(p.lines.human_review_cost.detail, "10% do custo humano");
    assert.deepEqual(p.review_breakdown.map((r) => [r.task_key, r.source, r.cost]), [["a", "percentual", 10], ["b", "percentual", 10]]);
    assert.equal(p.cost_statement.find((c) => c.task_key === "a")?.total, 110);
    assert.equal(p.lines.subtotal_cost.amount, 220);
  });

  it("revisão por TEMPO: minutos × valor/hora da especialidade de revisão; as demais tarefas seguem o percentual; quantidade multiplica", async () => {
    const v = await mkVersion([
      { key: "a", specialty: specA, minutes: 60 },
      { key: "b", specialty: specA, minutes: 60, review: { minutes: 30, specialty: specB } },
    ]);
    let p = await computePricing(v.ver.id, await defaultSelection(v.ver.id));
    // revisão de b = 30min × 200/h = 100 (tempo); revisão de a = 10% de 100 = 10 (percentual)
    assert.equal(p.lines.human_review_cost.amount, 110);
    assert.deepEqual(p.review_breakdown.map((r) => [r.task_key, r.source, r.minutes, r.rate, r.cost]), [["a", "percentual", 0, null, 10], ["b", "tempo", 30, 200, 100]]);
    assert.ok(String(p.lines.human_review_cost.detail).includes("30 min de revisão por tempo"));
    const b = p.cost_statement.find((c) => c.task_key === "b")!;
    assert.equal(b.review_minutes, 30);
    assert.equal(b.review_cost, 100);
    assert.equal(b.total, 200, "custo humano 100 + revisão 100");
    p = await computePricing(v.ver.id, { ...(await defaultSelection(v.ver.id)), quantity: 2 });
    assert.equal(p.lines.human_review_cost.amount, 220, "quantidade 2 dobra a revisão");
    assert.equal(p.review_breakdown.find((r) => r.task_key === "b")?.minutes, 60);
    // sem valor/hora na especialidade de revisão: não fecha e diz por quê
    const w = await mkVersion([{ key: "c", specialty: specA, minutes: 60, review: { minutes: 20, specialty: specNoRate } }]);
    const pw = await computePricing(w.ver.id, await defaultSelection(w.ver.id));
    assert.equal(pw.lines.human_review_cost.amount, null);
    assert.ok(pw.pending_info.includes("valor/hora da especialidade de revisão"));
    assert.ok(pw.warnings.some((x) => x.code === "review_rate_missing"));
    assert.equal(pw.commercial_ready, false);
    // e o cliente nunca vê esse aviso interno
    assert.ok(!clientPricingView(pw).notices.some((n) => n.includes("revisão")));
  });

  it("tempo de revisão sem precisar do percentual: se TODAS as tarefas têm tempo de revisão, o percentual não é exigido", async () => {
    await setSettings(null);
    try {
      const v = await mkVersion([{ key: "a", specialty: specA, minutes: 60, review: { minutes: 15, specialty: specA } }]);
      const p = await computePricing(v.ver.id, await defaultSelection(v.ver.id));
      assert.equal(p.lines.human_review_cost.amount, 25, "15 min × 100/h");
      assert.ok(!p.pending_info.includes("percentual de revisão humana"));
      const u = await mkVersion([{ key: "a", specialty: specA, minutes: 60 }]);
      const pu = await computePricing(u.ver.id, await defaultSelection(u.ver.id));
      assert.equal(pu.lines.human_review_cost.amount, null);
      assert.ok(pu.pending_info.includes("percentual de revisão humana"), "sem tempo de revisão e sem percentual: continua pendente como antes");
    } finally { await setSettings(10); }
  });

  it("custo de IA pelo PERFIL: tokens × preço do perfil + custo fixo por passada, × (1 + rodadas de revisão) × quantidade", async () => {
    const prof = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] Perfil custo ${uid()}`, unit_cost_input_per_1k: 0.002, unit_cost_output_per_1k: 0.01, fixed_cost_per_run: 0.5 } });
    cleanup.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: prof.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: prof.id } }).catch(() => {}); });
    const v = await mkVersion([
      { key: "ia", mode: "ia", specialty: null, ai: { profile_id: prof.id, tin: 10000, tout: 2000, rounds: 1, cin: 9, cout: 9 } }, // preços da tarefa IGNORADOS quando há perfil
    ]);
    let p = await computePricing(v.ver.id, await defaultSelection(v.ver.id));
    // passada = 10×0,002 + 2×0,01 + 0,5 = 0,54 ; × (1+1) = 1,08
    assert.equal(p.lines.ia_cost.amount, 1.08);
    assert.equal(p.ia_cost_breakdown[0].profile, prof.name);
    assert.equal(p.ia_cost_breakdown[0].fixed_cost_per_pass, 0.5);
    assert.equal(p.cost_statement[0].ia_cost, 1.08);
    assert.equal(p.cost_statement[0].executor, "ia");
    p = await computePricing(v.ver.id, { ...(await defaultSelection(v.ver.id)), quantity: 3 });
    assert.equal(p.lines.ia_cost.amount, 3.24);
    // tarefa de IA sem perfil usa o preço informado nela (como sempre)
    const legacy = await mkVersion([{ key: "ia", mode: "ia", specialty: null, ai: { tin: 1000, tout: 1000, rounds: 0, cin: 1, cout: 2 } }]);
    assert.equal((await computePricing(legacy.ver.id, await defaultSelection(legacy.ver.id))).lines.ia_cost.amount, 3);
    // perfil sem preço algum: custo pendente e bloqueia o preço comercial
    const free = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] Sem preço ${uid()}` } });
    cleanup.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: free.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: free.id } }).catch(() => {}); });
    const nop = await mkVersion([{ key: "ia", mode: "ia", specialty: null, ai: { profile_id: free.id, tin: 1000, tout: 1000 } }]);
    const pn = await computePricing(nop.ver.id, await defaultSelection(nop.ver.id));
    assert.equal(pn.lines.ia_cost.amount, null);
    assert.ok(pn.warnings.some((x) => x.code === "ia_cost_not_configured" && x.message.includes(free.name)));
    assert.ok(!clientPricingView(pn).notices.some((n) => n.includes(free.name)), "nome do perfil de IA não vaza para o cliente");
  });

  it("o que o cliente enxerga não traz demonstrativo, perfil de IA nem minutos de revisão", async () => {
    const prof = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] Perfil oculto ${uid()}`, unit_cost_input_per_1k: 0.001, unit_cost_output_per_1k: 0.001 } });
    cleanup.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: prof.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: prof.id } }).catch(() => {}); });
    const v = await mkVersion([{ key: "a", specialty: specA, minutes: 60, review: { minutes: 30, specialty: specB } }, { key: "ia", mode: "ia", specialty: null, ai: { profile_id: prof.id, tin: 1000, tout: 1000 } }]);
    const view = JSON.stringify(clientPricingView(await computePricing(v.ver.id, await defaultSelection(v.ver.id))));
    for (const forbidden of ["review_breakdown", "cost_statement", "ia_cost_breakdown", "human_cost", prof.name, "review_minutes"]) assert.ok(!view.includes(forbidden), `vazou: ${forbidden}`);
  });

  it("custos REALIZADOS da tarefa: IA (execuções) + revisão (minutos gastos × valor/hora); só administração e líder veem", async () => {
    const code = uid();
    const prod = await prisma.catalog2Product.create({ data: { slug: `cost-${code}`, internal_name: `[TESTE] Real ${code}`, status: "disponivel" } });
    const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T", implementation_blocks_operation: false } });
    const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "t1", name: "Tarefa real", sort_order: 1, cycle_type: "recorrente", requires_review: true, review_minutes: 20, review_specialty_id: specB } });
    await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: "e1", name: "Etapa", sort_order: 1 } });
    const companyId = (await prisma.company.create({ data: { name: `Empresa custos ${uid()}` } })).id;
    const project = await prisma.project.create({ data: { title: `Projeto custos ${code}`, project_code: code, company_id: companyId } });
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
    const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
    const task = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id } });
    cleanup.push(async () => {
      await prisma.projectTaskAIRun.deleteMany({ where: { project_task_id: task.id } });
      await prisma.projectTaskReview.deleteMany({ where: { project_task_id: task.id } });
      await prisma.projectDependencyRule.deleteMany({ where: { project_id: project.id } });
      await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
      await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { project_id: project.id } });
      await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
      await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
      await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
      await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
    });
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    await prisma.projectTask.update({ where: { id: task.id }, data: { lider_responsavel_id: leader.id } });
    for (const [cost, pt, ct2, status] of [[0.05, 1000, 200, "adotada"], [0.03, 500, 100, "descartada"]] as const) {
      await prisma.projectTaskAIRun.create({ data: { project_task_id: task.id, mode: "rascunho", prompt_tokens: pt, completion_tokens: ct2, cost, status } });
    }
    for (const mins of [10, 20]) await prisma.projectTaskReview.create({ data: { project_task_id: task.id, decision: "comentario", minutes_spent: mins } as any });
    const r = await api(`/api/project-tasks/${task.id}/costs`, { token: tokenFor(leader) });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.review.planned_minutes, 20);
    assert.equal(r.json.review.spent_minutes, 30);
    assert.equal(r.json.review.estimated_cost, 100, "30 min × 200/h");
    assert.deepEqual(r.json.ai.by_status, { adotada: 1, descartada: 1 });
    assert.equal(r.json.ai.cost, 0.08);
    assert.equal(r.json.ai.tokens_in, 1500);
    assert.equal(r.json.total_realized, 100.08);
    assert.equal((await api(`/api/project-tasks/${task.id}/costs`, { token: tokenFor(client) })).status, 404, "cliente não vê custo interno");
  });
});
