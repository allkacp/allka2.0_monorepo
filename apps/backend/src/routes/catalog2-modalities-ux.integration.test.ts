import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { runSubscriptionsTick } from "../lib/catalog2-subscriptions";
import { commercialConsistency, blockersOf } from "../lib/catalog2-commercial";
import { publishVersion, validateVersionForPublish } from "../lib/catalog2-service";
import { auditLegacyFields } from "../scripts/catalog2-legacy-fields-audit";
import { TestWorld, SEL, tasksOf } from "../test-support/first-execution-helpers";

// Questionário e entregáveis com tela/API completas, sem dependência entre tarefas em produto individual, "somente em pacote" na gestão de pacotes,
// campos antigos que não bloqueiam a publicação, padrões atuais, entrega mensal ≠ cobrança e o script que normaliza o Produto 1 (sem publicar).

const W = new TestWorld();
let CO: Awaited<ReturnType<TestWorld["mkCompanyUser"]>>;
let ADMIN: Awaited<ReturnType<TestWorld["mkAdmin"]>>;
const STEPS = [{ minutes: 60, first: true, name: "Implantação da conta" }, { minutes: 60, name: "Executar o ciclo" }];
const VARIATIONS = [{ key: "porte", name: "Porte", is_required: true, selection_type: "single", options: { create: [{ key: "basico", label: "Básico", is_default: true }, { key: "plus", label: "Plus" }] } }];
const admin = (p: string, method = "GET", body?: unknown) => W.api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const taskOf = (versionId: string) => prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
const stepOf = (taskId: string, key: string) => prisma.catalog2TaskStep.findFirstOrThrow({ where: { task_id: taskId, key } });
const delKeys = async (taskId: string) => (await prisma.projectTaskDeliverable.findMany({ where: { project_task_id: taskId } })).map((d) => d.key).sort();
const runScript = (args: string[]) =>
  execFileSync(process.execPath, ["--import", "tsx", path.join(process.cwd(), "src/scripts/catalog2-normalize-product-1.ts"), ...args], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "development" }, encoding: "utf8" });

describe("Questionário, entregáveis, pacote, campos antigos, padrões e Produto 1 (sem publicar)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await W.start(app);
    CO = await W.mkCompanyUser("Q");
    ADMIN = await W.mkAdmin();
  });
  after(async () => { await W.cleanup(); await prisma.$disconnect(); });

  // ── Questionário ──────────────────────────────────────────────────────────────────────────────
  it("Q1. questionário: criar/vincular por nome ou ID, pergunta obrigatória, tipo, visibilidade, etapa de destino e condição por variação; condição inválida é recusada; tudo no histórico", async () => {
    const { product, versionId } = await W.mkProduct("Questionário", { steps: STEPS, recurring: false, publish: false, variationsRaw: VARIATIONS });
    const task = await taskOf(versionId);
    const qn = await admin("/questionnaires", "POST", { name: `Briefing de tráfego ${Date.now()}`, description: "Perguntas da contratação" });
    assert.equal(qn.status, 201, JSON.stringify(qn.json));
    W.questionnaires.push(qn.json.id);
    const add = (body: unknown) => admin(`/questionnaires/${qn.json.id}/questions`, "POST", body);
    const a = await add({ key: "site", label: "Qual é o site?", is_required: true, question_type: "texto_curto", visibility: "client", target_step_key: "s2", answer_usage: "both" });
    assert.equal(a.status, 201, JSON.stringify(a.json));
    assert.equal(a.json.target_step_key, "s2");
    assert.equal(a.json.is_required, true);
    const b = await add({ key: "verba_plus", label: "Qual a verba do plano Plus?", is_required: false, question_type: "texto_curto", condition: { source: "variation_option", ref: "plus", operator: "selected" } });
    assert.equal(b.status, 201, JSON.stringify(b.json));
    assert.equal(JSON.parse(b.json.condition_json).ref, "plus");
    const bad = await add({ key: "ruim", label: "Pergunta sem referência", condition: { source: "variation_option", operator: "selected" } });
    assert.ok([400, 422].includes(bad.status), `condição sem referência é recusada (veio ${bad.status})`);
    const badOp = await add({ key: "ruim2", label: "Operador inválido", condition: { source: "addon", ref: "x", operator: "talvez" } });
    assert.ok([400, 422].includes(badOp.status));
    const link = await admin(`/tasks/${task.id}/questionnaire`, "PUT", { questionnaire_id: qn.json.id });
    assert.equal(link.status, 200, JSON.stringify(link.json));
    // depois de vinculado, editar o questionário passa a constar no histórico do produto
    assert.equal((await add({ key: "extra", label: "Mais alguma informação?", is_required: false, question_type: "texto_longo" })).status, 201);
    // lista (a tela busca por nome/ID e mostra quantas perguntas/tarefas usam)
    const list = await admin("/questionnaires");
    const row = list.json.data.find((x: any) => x.id === qn.json.id);
    assert.equal(row.question_count, 3);
    assert.equal(row.task_count, 1);
    // o produto devolve a pergunta com destino e condição para a tela
    const detail = await admin(`/products/${product.id}`);
    const draft = (detail.json.versions ?? []).find((v: any) => v.id === versionId);
    const questions = draft.tasks[0].questionnaire.questions;
    assert.equal(questions.find((q: any) => q.key === "site").target_step_key, "s2");
    assert.equal(questions.find((q: any) => q.key === "verba_plus").condition.ref, "plus");
    const hist = await prisma.catalog2ProductHistoryEvent.findMany({ where: { product_id: product.id } });
    assert.ok(hist.some((h) => h.event_type === "questionnaire_linked"));
    assert.ok(hist.some((h) => h.event_type === "questionnaire_content_updated"));
  });

  it("Q2. a pergunta condicional só entra no contrato quando a variação é escolhida; a de destino por etapa fica no briefing congelado", async () => {
    const { product, versionId } = await W.mkProduct("Questionário no contrato", { steps: STEPS, recurring: false, publish: false, variationsRaw: VARIATIONS });
    const task = await taskOf(versionId);
    const qn = await admin("/questionnaires", "POST", { name: `Briefing contrato ${Date.now()}` });
    W.questionnaires.push(qn.json.id);
    await admin(`/questionnaires/${qn.json.id}/questions`, "POST", { key: "site", label: "Qual é o site?", is_required: true, question_type: "texto_curto", target_step_key: "s2" });
    await admin(`/questionnaires/${qn.json.id}/questions`, "POST", { key: "verba_plus", label: "Verba do plano Plus", is_required: false, question_type: "texto_curto", condition: { source: "variation_option", ref: "plus", operator: "selected" } });
    await admin(`/tasks/${task.id}/questionnaire`, "PUT", { questionnaire_id: qn.json.id });
    await publishVersion(versionId, "system", { activate: true, changeSummary: "teste" });
    const keysOf = async (variation: string) => {
      const q = await W.quote(CO.token, product.id, { selection: { ...SEL, variation_option_keys: [variation] } });
      assert.equal(q.status, 201, JSON.stringify(q.json));
      const { projectId } = await W.checkoutAndPay(CO.token, [q.json.id]);
      const [t] = await tasksOf(projectId, 0);
      const snap = JSON.parse((await prisma.projectTask.findUniqueOrThrow({ where: { id: t.id } })).briefing_snapshot ?? "[]") as any[];
      return snap;
    };
    const basico = await keysOf("basico");
    const plus = await keysOf("plus");
    assert.deepEqual(basico.map((q) => q.question_key), ["site"], "plano básico: sem a pergunta do Plus");
    assert.deepEqual(plus.map((q) => q.question_key).sort(), ["site", "verba_plus"]);
    assert.equal(basico[0].target_step_key, "s2", "a etapa de destino acompanha a pergunta");
    assert.equal(basico[0].required, true);
    assert.equal(plus.find((q) => q.question_key === "verba_plus").condition.ref, "plus", "a condição fica fotografada");
  });

  // ── Entregáveis ───────────────────────────────────────────────────────────────────────────────
  it("D1. entregável: cadastro completo (nome, descrição, etapa, momento, formato, modelo, prova, qualificação, aprovação, visibilidade, recorrência, ID permanente), reaproveitamento e histórico", async () => {
    const { product, versionId } = await W.mkProduct("Entregáveis", { steps: STEPS, recurring: true, publish: false });
    const task = await taskOf(versionId);
    const s2 = await stepOf(task.id, "s2");
    const full = await admin(`/tasks/${task.id}/deliverables`, "POST", {
      key: "relatorio-mensal", name: "Relatório mensal de resultados", description: "PDF com métricas do mês", type: "arquivo", responsible: "executor", is_required: true, requires_approval: true,
      visibility: "client", step_id: s2.id, format: "PDF", delivery_moment: "cycle_end", template_url: "https://exemplo.test/modelo.pdf", template_name: "Modelo.pdf",
      evidence_required: true, requires_qualification: true, cycle_scope: "every_cycle",
    });
    assert.equal(full.status, 201, JSON.stringify(full.json));
    assert.equal(full.json.key, "relatorio-mensal", "ID permanente");
    assert.equal(full.json.delivery_moment, "cycle_end");
    assert.equal(full.json.evidence_required, true);
    assert.equal(full.json.requires_qualification, true);
    assert.equal(full.json.template_name, "Modelo.pdf");
    const dup = await admin(`/tasks/${task.id}/deliverables`, "POST", { key: "relatorio-mensal", name: "Outro" });
    assert.equal(dup.status, 422, "ID repetido na tarefa é recusado");
    const other = await W.mkProduct("Outra etapa", { steps: STEPS, publish: false });
    const otherStep = await stepOf((await taskOf(other.versionId)).id, "s1");
    const wrongStep = await admin(`/tasks/${task.id}/deliverables`, "POST", { name: "Etapa de outra tarefa", step_id: otherStep.id });
    assert.equal(wrongStep.status, 422, "etapa que não é desta tarefa é recusada");
    const upd = await admin(`/deliverables/${full.json.id}`, "PUT", { cycle_scope: "first_execution", delivery_moment: "step_end" });
    assert.equal(upd.status, 200);
    assert.equal(upd.json.cycle_scope, "first_execution");
    // biblioteca: reutilizar o entregável em outra tarefa
    const lib = await admin("/deliverables-library?q=Relat%C3%B3rio");
    assert.ok(lib.json.data.some((d: any) => d.name === "Relatório mensal de resultados"), "aparece na biblioteca para reutilização");
    const hist = await prisma.catalog2ProductHistoryEvent.findMany({ where: { product_id: product.id } });
    assert.ok(hist.some((h) => h.event_type === "deliverable_added"));
    assert.ok(hist.some((h) => h.event_type === "deliverable_updated"));
    const read = await admin(`/products/${product.id}`);
    const t = (read.json.versions ?? []).find((v: any) => v.id === versionId).tasks[0];
    assert.equal(t.deliverables.length, 1, "o produto devolve os entregáveis para a tela");
  });

  it("D2. entregável de PRIMEIRA EXECUÇÃO nasce só no 1º ciclo; o RECORRENTE nasce em todo ciclo; o de etapa de 1ª execução some com ela; o condicional por variação respeita a escolha", async () => {
    const { product, versionId } = await W.mkProduct("Entregáveis nos ciclos", { steps: STEPS, recurring: true, publish: false, variationsRaw: VARIATIONS });
    const task = await taskOf(versionId);
    const s1 = await stepOf(task.id, "s1");
    const mk = (body: Record<string, unknown>) => admin(`/tasks/${task.id}/deliverables`, "POST", body);
    assert.equal((await mk({ key: "so-primeira", name: "Plano de implantação", cycle_scope: "first_execution" })).status, 201);
    assert.equal((await mk({ key: "todo-ciclo", name: "Relatório do ciclo", cycle_scope: "every_cycle" })).status, 201);
    assert.equal((await mk({ key: "da-etapa-1a", name: "Print da conta configurada", step_id: s1.id })).status, 201);
    assert.equal((await mk({ key: "so-plus", name: "Painel Plus", is_conditional: true, condition_json: JSON.stringify({ source: "variation_option", ref: "plus", operator: "selected" }) })).status, 201);
    assert.equal((await mk({ key: "texto-livre", name: "Item com condição só em texto", is_conditional: true, condition_json: JSON.stringify({ text: "só se o cliente tiver Meta" }) })).status, 201);
    await publishVersion(versionId, "system", { activate: true, changeSummary: "teste" });

    const q = await W.quote(CO.token, product.id, { period: "mensal", selection: { ...SEL, variation_option_keys: ["basico"] } });
    const { projectId, pps } = await W.checkoutAndPay(CO.token, [q.json.id]);
    const [c0] = await tasksOf(projectId, 0);
    assert.deepEqual(await delKeys(c0.id), ["da-etapa-1a", "so-primeira", "texto-livre", "todo-ciclo"], "ciclo 1, plano básico: o condicional do Plus não nasce");
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    for (const t of await tasksOf(projectId, 0)) await prisma.projectTask.update({ where: { id: t.id }, data: { status: "CONCLUIDA", data_conclusao: new Date() } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    await W.api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO.token, body: {} });
    const [c1] = await tasksOf(projectId, 1);
    assert.deepEqual(await delKeys(c1.id), ["texto-livre", "todo-ciclo"], "ciclo 2: só os recorrentes (a etapa e os itens de 1ª execução não voltam)");

    const qp = await W.quote(CO.token, product.id, { period: "mensal", selection: { ...SEL, variation_option_keys: ["plus"] } });
    const { projectId: pj2 } = await W.checkoutAndPay(CO.token, [qp.json.id]);
    const [p0] = await tasksOf(pj2, 0);
    assert.ok((await delKeys(p0.id)).includes("so-plus"), "plano Plus: o condicional nasce");
  });

  // ── Produto individual / pacotes ──────────────────────────────────────────────────────────────
  it("N1. produto INDIVIDUAL não tem dependência entre tarefas (a API recusa); produto composto continua podendo", async () => {
    const single = await W.mkProduct("Individual", { steps: STEPS, publish: false });
    const t1 = await taskOf(single.versionId);
    const cond = await prisma.catalog2Task.create({ data: { version_id: single.versionId, key: "extra", name: "Tarefa condicional", is_conditional: true, sort_order: 2 } });
    const r = await admin(`/tasks/${cond.id}/dependencies`, "POST", { depends_on_task_id: t1.id });
    assert.equal(r.status, 422);
    assert.equal(r.json.code, "single_product_no_task_dependencies");
    assert.match(r.json.error, /Combos \/ Pacotes e Dependências/);
    assert.equal(await prisma.catalog2TaskDependency.count({ where: { task_id: cond.id } }), 0);
    // composto
    const multi = await W.mkProduct("Composto", { steps: STEPS, publish: false });
    await prisma.catalog2Product.update({ where: { id: multi.product.id }, data: { task_structure: "multiple" } });
    const m1 = await taskOf(multi.versionId);
    const m2 = await prisma.catalog2Task.create({ data: { version_id: multi.versionId, key: "segunda", name: "Segunda tarefa", sort_order: 2 } });
    const ok = await admin(`/tasks/${m2.id}/dependencies`, "POST", { depends_on_task_id: m1.id });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
  });

  it("P1. “Somente em pacote” fica na gestão de pacotes: produto em pacote continua avulso por padrão; só “impedir venda separada” bloqueia — e o pacote completo passa", async () => {
    const a = await W.mkProduct("Item A", { steps: STEPS, recurring: false });
    const b = await W.mkProduct("Item B", { steps: STEPS, recurring: false });
    const pkg = await admin("/packages", "POST", { name: `[TESTE FE] Pacote ${Date.now()}`, product_ids: [a.product.id, b.product.id] });
    assert.equal(pkg.status, 201, JSON.stringify(pkg.json));
    const row0 = await prisma.catalog2Package.findUniqueOrThrow({ where: { id: pkg.json.id } });
    assert.equal(row0.block_standalone_sale, false, "padrão: os produtos do pacote continuam vendidos separadamente");
    const qa = await W.quote(CO.token, a.product.id);
    const alone = await W.api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [qa.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(alone.status, 201, "sem a marca, o produto avulso é vendido normalmente");
    W.projects.push(alone.json.project.id);

    assert.equal((await admin(`/packages/${pkg.json.id}`, "PUT", { block_standalone_sale: true })).status, 200);
    const detail = await W.api(`/api/catalog2/products/${a.product.slug}`, { token: CO.token });
    assert.equal(detail.json.sale_modes.package_only, true, "o cliente vê que só é vendido em pacote");
    const qa2 = await W.quote(CO.token, a.product.id);
    const blocked = await W.api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [qa2.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.json.code ?? blocked.json.error_code, "package_only");
    assert.match(blocked.json.error ?? blocked.json.message, /não é vendido separadamente/);
    const qa3 = await W.quote(CO.token, a.product.id);
    const qb3 = await W.quote(CO.token, b.product.id);
    const both = await W.api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [qa3.json.id, qb3.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(both.status, 201, JSON.stringify(both.json));
    W.projects.push(both.json.project.id);
  });

  // ── Entrega mensal x cobrança ─────────────────────────────────────────────────────────────────
  it("M1. assinatura mensal SEM entrega mensal é diagnosticada (bloqueia a publicação) e se resolve numa ação explícita; avulso sozinho não precisa de entrega mensal", async () => {
    const issues = (rec: boolean, one: boolean, delivery: string | null) => commercialConsistency({ version: { accepts_one_time: one, accepts_recurring: rec }, product: { delivery_recurrence: delivery }, periods: [{ period: "mensal", is_active: true }] });
    assert.ok(blockersOf(issues(true, true, null)).some((i) => i.code === "subscription_without_recurring_delivery"), "cobra todo mês sem nova entrega");
    assert.deepEqual(blockersOf(issues(true, true, "mensal")), []);
    assert.deepEqual(blockersOf(issues(false, true, null)), [], "só avulso: sem entrega mensal, tudo certo");
    assert.ok(blockersOf(issues(false, true, "mensal")).some((i) => i.code === "recurring_delivery_without_subscription"));
    // pela API: a versão em edição mostra o bloqueio e a ação resolve
    const { versionId, product } = await W.mkProduct("Entrega mensal", { steps: STEPS, recurring: false, oneTime: true, publish: false, flags: { accepts_recurring: true } });
    const val = await validateVersionForPublish(versionId);
    assert.equal(val.ok, false);
    assert.ok(val.issues.some((m) => /entrega mensal/i.test(m)), `a validação cita a entrega mensal: ${JSON.stringify(val.issues)}`);
    const fix = await admin(`/versions/${versionId}/commercial-resolution`, "POST", { action: "one_time_and_monthly" });
    assert.ok([200, 201].includes(fix.status), JSON.stringify(fix.json));
    const after = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(after.delivery_recurrence, "mensal");
    assert.ok((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).accepts_recurring);
  });

  // ── Campos antigos / padrões ──────────────────────────────────────────────────────────────────
  it("L1. campos comerciais ANTIGOS e invisíveis não bloqueiam a publicação (nem mudam o preço); contrato/versão antigos são preservados", async () => {
    const legacy = await W.mkProduct("Legado", { steps: [{ minutes: 60 }, { minutes: 60 }], recurring: true, publish: false, flags: { has_initial_implementation: true, implementation_rule: "on_revalidation", implementation_blocks_operation: false, sell_mode: "package_only", sale_modes_enforced: false } });
    const val = await validateVersionForPublish(legacy.versionId);
    assert.equal(val.ok, true, `valores antigos não bloqueiam: ${JSON.stringify(val.issues)}`);
    const sim = await admin(`/versions/${legacy.versionId}/simulate`, "POST", SEL);
    const clean = await W.mkProduct("Sem legado", { steps: [{ minutes: 60 }, { minutes: 60 }], recurring: true, publish: false });
    const simClean = await admin(`/versions/${clean.versionId}/simulate`, "POST", SEL);
    assert.equal(sim.json.pricing.lines.commercial_final_price.amount, simClean.json.pricing.lines.commercial_final_price.amount, "o preço não depende dos campos antigos");
    // publicar preserva os valores antigos (nada é reescrito em silêncio)
    await publishVersion(legacy.versionId, "system", { activate: true, changeSummary: "teste legado" });
    const row = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: legacy.versionId } });
    assert.equal(row.implementation_rule, "on_revalidation");
    assert.equal(row.has_initial_implementation, true);
    assert.equal(row.sell_mode, "package_only");
    // legado honrado: versão publicada "só em pacote" continua bloqueando a compra avulsa
    const q = await W.quote(CO.token, legacy.product.id, { period: "mensal" });
    const blocked = await W.api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [q.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(blocked.status, 409, "o valor antigo continua valendo para a versão que o tem");
  });

  it("L2. a auditoria dos campos antigos é somente leitura e cobre todos os campos pedidos", async () => {
    const before = await prisma.catalog2ProductVersion.count();
    const rows = await auditLegacyFields();
    const fields = rows.map((r) => r.field);
    for (const f of ["has_initial_implementation", "implementation_rule", "implementation_blocks_operation", "sell_mode", "sale_modes_enforced", "cycle_type", "repeat_rule", "asset_rule", "executor_continuity"]) assert.ok(fields.includes(f), `campo auditado: ${f}`);
    for (const r of rows) { assert.ok(r.effect.length > 10 && r.editable_in.length > 3, `${r.field}: efeito e onde editar descritos`); }
    assert.equal(await prisma.catalog2ProductVersion.count(), before);
  });

  it("F1. produto NOVO usa os padrões atuais: avulso ligado, assinatura desligada, sem implantação antiga, venda independente, continuidade não permitida", async () => {
    const r = await admin("/products", "POST", { internal_name: `[TESTE LOCAL] Padrões ${Date.now()}`, task_structure: "single" });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    W.catProducts.push(r.json.id);
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: r.json.id } });
    assert.equal(v.state, "rascunho");
    assert.equal(v.accepts_one_time, true);
    assert.equal(v.accepts_recurring, false);
    assert.equal(v.has_initial_implementation, false);
    assert.equal(v.implementation_rule, "first_only");
    assert.equal(v.sell_mode, "standalone");
    const t = await prisma.catalog2Task.findFirst({ where: { version_id: v.id } });
    if (t) { assert.equal(t.executor_continuity, "not_allowed"); assert.equal(t.cycle_type, "recorrente"); }
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: r.json.id } })).delivery_recurrence, null);
  });

  // ── Produto 1: normalização técnica sem publicar ─────────────────────────────────────────────
  it("X1. o script do Produto 1: simula sem gravar, grava só valores técnicos, não publica, não mexe em textos/etapas, registra histórico e é idempotente", async () => {
    const { product, versionId } = await W.mkProduct("Produto técnico", {
      steps: STEPS, recurring: false, oneTime: true, publish: false,
      flags: { has_initial_implementation: true, implementation_rule: "on_revalidation", title: "Título que NÃO pode mudar", summary: "Resumo que NÃO pode mudar" },
    });
    await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: product.id } });
    const task = await taskOf(versionId);
    const stepsBefore = JSON.stringify(await prisma.catalog2TaskStep.findMany({ where: { task_id: task.id }, orderBy: { key: "asc" } }));
    const seq = String(product.sequence_number);
    const pricingBefore = (await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).pricing_mode;
    const dry = runScript([`--product=${seq}`]);
    assert.match(dry, /SIMULAÇÃO/);
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).implementation_rule, "on_revalidation", "a simulação não grava");
    const out = runScript([`--product=${seq}`, "--apply"]);
    assert.match(out, /continua em rascunho/);
    const v = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } });
    assert.equal(v.state, "rascunho", "nada foi publicado");
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).published_version_id, null);
    assert.equal(v.accepts_one_time, true);
    assert.equal(v.accepts_recurring, true);
    assert.equal(v.has_initial_implementation, false);
    assert.equal(v.implementation_rule, "first_only");
    assert.equal(v.title, "Título que NÃO pode mudar");
    assert.equal(v.summary, "Resumo que NÃO pode mudar");
    const p = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(p.delivery_recurrence, "mensal");
    assert.equal(p.task_structure, "single");
    const monthly = await prisma.catalog2ProductPeriod.findFirstOrThrow({ where: { product_id: product.id, period: "mensal" } });
    assert.equal(monthly.is_active, true);
    const t = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.executor_continuity, "recommended");
    assert.equal(t.continuity_accept_hours, 2);
    assert.equal(t.continuity_if_unavailable, "normal_queue");
    assert.equal(t.reuse_connections_same_project, true);
    assert.equal(JSON.stringify(await prisma.catalog2TaskStep.findMany({ where: { task_id: task.id }, orderBy: { key: "asc" } })), stepsBefore, "as etapas não foram tocadas");
    assert.equal(await prisma.catalog2Task.count({ where: { version_id: versionId } }), 1, "nenhuma tarefa criada ou apagada");
    const hist = await prisma.catalog2ProductHistoryEvent.findMany({ where: { product_id: product.id, event_type: "legacy_normalized" } });
    assert.equal(hist.length, 1, "uma linha de histórico com antes/depois");
    const again = runScript([`--product=${seq}`, "--apply"]);
    assert.match(again, /já normalizado/);
    assert.equal(await prisma.catalog2ProductHistoryEvent.count({ where: { product_id: product.id, event_type: "legacy_normalized" } }), 1, "idempotente");
    // nenhum preço fixo foi criado: o modo de preço da versão não mudou
    assert.equal(v.pricing_mode, pricingBefore);
  });

  it("X2. o script recusa produto sem rascunho (versão publicada nunca é alterada) e banco que não parece local", async () => {
    const pub = await W.mkProduct("Já publicado", { steps: STEPS, recurring: false });
    let msg = "";
    try { runScript([`--product=${pub.product.sequence_number}`, "--apply"]); } catch (e: any) { msg = String(e.stdout ?? "") + String(e.stderr ?? ""); }
    assert.match(msg, /Sem versão em rascunho|nunca mexe em versão publicada/);
    let msg2 = "";
    try {
      execFileSync(process.execPath, ["--import", "tsx", path.join(process.cwd(), "src/scripts/catalog2-normalize-product-1.ts"), "--product=1"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: "mysql://u:p@db.exemplo.com.br:3306/x", NODE_ENV: "development" }, encoding: "utf8" });
    } catch (e: any) { msg2 = String(e.stdout ?? "") + String(e.stderr ?? ""); }
    assert.match(msg2, /não parece local/);
  });
});

void tasksOf;
