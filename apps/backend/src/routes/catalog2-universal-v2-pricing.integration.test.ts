import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, byKey, checkoutAndPay, FACTOR, mkAdmin, mkCompanyUser, mkProduct, near, priceOfMinutes, r2, SEL, setPricingSettings, setRate, simulate, startServer, stopServer, tasksOf, uid } from "../test-support/universal-helpers";

// Estrutura universal v2 (2026-10-02) · preço (fonte única), esforço, disponibilidade de opção, adicionais tipados, qualificação, IA e nome interno.
// Regra de teste: designer R$ 100/h; qualificação 15%; taxas 6% × 10% × 5% × 30% sobre o acumulado (FACTOR ≈ 1,59159).

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const T1 = { key: "t1", minutes: 60 };

const optionsOf = (list: unknown[]) => ({ create: [{ key: "var", name: "Variação", is_required: true, selection_type: "single", options: { create: list } }] });
const adm = (path: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${path}`, { method, token: ADMIN.token, body });
const eff = (type: string, value: string, extra: Record<string, unknown> = {}) => ({ effect_type: type, effect_value: value, source_task_key: "t1", source_step_key: "s1", ...extra });

describe("Estrutura universal v2 · preço, esforço, opções e adicionais", () => {
  before(async () => {
    await startServer();
    ADMIN = await mkAdmin();
    CO = await mkCompanyUser("U");
  });
  beforeEach(async () => { await setPricingSettings(); await setRate("designer", 100); });
  after(async () => { await stopServer(); });

  // ── PROBLEMA 1 · FONTE ÚNICA DA REGRA DE PREÇO ───────────────────────────────────────────────
  describe("P1 · fonte única de preço", () => {
    it("U01. o preço usa só a regra real; a memória registra a regra versionada", async () => {
      const { versionId, product } = await mkProduct({ name: "Fonte única", tasks: [T1] }); // rascunho
      const sim = await simulate(ADMIN.token, versionId);
      const p = sim.pricing;
      near(p.split.recurring.price, priceOfMinutes(60), "preço com a regra REAL (100/h, 15%, 30%), não 150/12/25");
      assert.equal(p.rule.hourly_rates_applied[0].hourly_rate, 100);
      assert.equal(p.rule.qualification_percent, 15);
      assert.equal(p.rule.profit_margin_percent, 30);
      assert.equal(p.rule.tax_percent, 6);
      assert.equal(p.rule.commission_percent, 10);
      assert.equal(p.rule.operational_fee_percent, 5);
      assert.ok(p.rule.version >= 1 && p.rule.hash.length === 64 && !Number.isNaN(Date.parse(p.rule.calculated_at)), "versão, hash e data do cálculo");
      assert.equal(p.simulation_provenance.commercial_config, "real");
      // prontidão e memória de cálculo: mesma regra, mesma versão
      const mem = await adm(`/products/${product.id}/pricing-memory`);
      assert.equal(mem.status, 200);
      assert.equal(mem.json.pricing.rule.hash, p.rule.hash);
      assert.equal(mem.json.pricing_simulation.rule.hash, p.rule.hash, "não existe segundo cálculo");
      near(mem.json.pricing.simulation.total, p.simulation.total);
    });

    it("U02. preço pendente (custo de IA indefinido): o valor ilustrativo vem da regra real e diz o que falta; nunca de outra configuração", async () => {
      const prof = await prisma.catalog2AIProfile.create({ data: { name: "IA sem custo", provider: "gemini", model: "gemini-2.5-flash", is_active: true } });
      const { versionId, product } = await mkProduct({ name: "Pendente IA", tasks: [{ ...T1, mode: "hibrido", data: { ai: { create: { profile_id: prof.id, ai_mode: "rascunho", human_review_required: true } } } }] });
      const sim = await simulate(ADMIN.token, versionId);
      assert.equal(sim.price_summary.source, "simulacao");
      assert.match(sim.price_summary.explanation, /regras reais de preço/);
      assert.match(sim.price_summary.explanation, /custo por token de IA/);
      near(sim.price_summary.amount, priceOfMinutes(60), "ilustrativo = regra real, sem inventar custo de IA");
      assert.equal(sim.pricing.ai_cost_state, "not_defined");
      assert.equal(sim.price_summary.rule_version, sim.pricing.rule.version);
      const rd = await adm(`/products/${product.id}/readiness`);
      assert.equal(rd.json.pricing_simulation.is_provisional, false);
      assert.equal(rd.json.pricing_simulation.rule_version, sim.pricing.rule.version);
      near(rd.json.pricing_simulation.price_amount, sim.price_summary.amount);
    });

    it("U03. mudar o valor/hora cria NOVA versão da regra; cotação antiga guarda a versão usada", async () => {
      const { versionId } = await mkProduct({ name: "Versão da regra", tasks: [T1], publish: true });
      const v1 = (await simulate(ADMIN.token, versionId)).pricing.rule;
      await setRate("designer", 120);
      const v2 = (await simulate(ADMIN.token, versionId)).pricing.rule;
      assert.notEqual(v2.version, v1.version);
      assert.notEqual(v2.hash, v1.hash);
      assert.equal(v2.hourly_rates_applied[0].hourly_rate, 120);
      await setRate("designer", 100);
      const v3 = (await simulate(ADMIN.token, versionId)).pricing.rule;
      assert.equal(v3.version, v1.version, "mesmo conteúdo = mesma versão");
    });

    it("U04. simulação, catálogo, cotação, checkout e pagamento usam EXATAMENTE o mesmo preço", async () => {
      const { product, versionId } = await mkProduct({ name: "Mesmo preço", tasks: [T1], publish: true });
      const sim = await simulate(ADMIN.token, versionId);
      const expected = sim.pricing.lines.commercial_final_price.amount as number;
      assert.ok(expected > 0);
      const list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
      const row = (list.json.data as any[]).find((x) => x.id === product.id);
      near(row.starting_price, expected, "lista do cliente");
      const conf = await api(`/api/catalog2/products/${product.slug}/configure`, { method: "POST", token: CO.token, body: SEL });
      near(conf.json.pricing.commercial_price, expected, "configurador");
      assert.equal(conf.json.pricing.pricing_rule_version, sim.pricing.rule.version);
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: SEL } });
      assert.equal(q.status, 201, JSON.stringify(q.json));
      near(q.json.commercial_price, expected, "cotação");
      const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
      const pays = await prisma.payment.findMany({ where: { project_id: projectId } });
      near(pays.reduce((a, p) => a + (p.amount ?? 0), 0), expected, "pagamento do checkout");
      const snap = JSON.parse((await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q.json.id } })).pricing_snapshot_json!);
      assert.equal(snap.pricing_rule_version, sim.pricing.rule.version, "contrato/relatórios: a versão da regra fica no snapshot");
    });
  });

  // ── PROBLEMA 2 · EFEITO UNIVERSAL DE ESFORÇO ────────────────────────────────────────────────
  describe("P2 · esforço universal", () => {
    it("U05. adicionar minutos (recorrente) soma ao esforço da etapa-alvo e ao preço mensal", async () => {
      const { versionId } = await mkProduct({ name: "Esforço min", tasks: [T1], variations: [optionsOf([{ key: "base", label: "Base", is_default: true }, { key: "mais", label: "Mais", effects: { create: [eff("add_effort_minutes", "30")] } }]).create[0]] });
      const base = await simulate(ADMIN.token, versionId, { variation_option_keys: ["base"], addon_keys: [], quantity: 1 });
      const mais = await simulate(ADMIN.token, versionId, { variation_option_keys: ["mais"], addon_keys: [], quantity: 1 });
      near(base.pricing.split.recurring.price, priceOfMinutes(60));
      near(mais.pricing.split.recurring.price, priceOfMinutes(90));
      assert.equal(mais.pricing.effort_breakdown.length, 1);
      const l = mais.pricing.effort_breakdown[0];
      assert.deepEqual({ task: l.task, step: l.step, minutes: l.minutes, when: l.when }, { task: "t1", step: "s1", minutes: 30, when: "todos os ciclos" });
      assert.equal(mais.pricing.deadline.effort_minutes, 90);
    });

    it("U06. adicionar HORAS equivale a minutos × 60; escopo de implantação cobra só na implantação (não na renovação)", async () => {
      const { versionId } = await mkProduct({
        name: "Esforço impl", recurring: true, flags: { has_initial_implementation: true },
        tasks: [{ key: "t1", cycle: "implementacao", repeat: "first_only" }, { key: "t2" }],
        variations: [{ key: "var", name: "V", is_required: true, selection_type: "single", options: { create: [{ key: "base", label: "Base", is_default: true }, { key: "mais", label: "Mais", effects: { create: [eff("add_effort_hours", "1", { charge_scope: "implementation" })] } }] } }],
      });
      const base = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["base"], addon_keys: [], quantity: 1 })).pricing;
      const mais = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["mais"], addon_keys: [], quantity: 1 })).pricing;
      near(base.split.implementation.price, priceOfMinutes(60));
      near(mais.split.implementation.price, priceOfMinutes(120), "1 hora a mais na implantação");
      near(mais.split.recurring.price, base.split.recurring.price, "mensalidade NÃO muda");
      near(mais.split.renewal, base.split.renewal, "renovação sem implantação");
      assert.equal(mais.effort_breakdown[0].minutes, 60);
    });

    it("U07. substituir esforço troca os minutos da etapa; escopo único é recusado pela API", async () => {
      const { versionId } = await mkProduct({ name: "Esforço sub", tasks: [T1], variations: [{ key: "var", name: "V", is_required: true, selection_type: "single", options: { create: [{ key: "base", label: "Base", is_default: true }, { key: "curto", label: "Curto", effects: { create: [eff("replace_effort_minutes", "20")] } }] } }] });
      const curto = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["curto"], addon_keys: [], quantity: 1 })).pricing;
      near(curto.split.recurring.price, priceOfMinutes(20), "só 20 min");
      const optId = (await prisma.catalog2VariationOption.findFirstOrThrow({ where: { key: "base", variation: { version_id: versionId } } })).id;
      const bad = await adm(`/options/${optId}/effects`, "POST", { effect_type: "replace_effort_minutes", effect_value: "10", source_task_key: "t1", source_step_key: "s1", charge_scope: "one_time" });
      assert.equal(bad.status, 422, JSON.stringify(bad.json));
      assert.match(bad.json.error, /todos os ciclos/);
    });

    it("U08. multiplicar por quantidade (adicional por unidade) e ciclos específicos", async () => {
      const { versionId } = await mkProduct({
        name: "Esforço qtd", recurring: true, tasks: [T1],
        addons: [{ key: "extra", name: "Extra", addon_type: "quantity", qty_min: 1, qty_max: 10, unit_label: "item", unit_minutes: 30, source_task_key: "t1", source_step_key: "s1" }],
        variations: [{ key: "var", name: "V", is_required: true, selection_type: "single", options: { create: [{ key: "base", label: "Base", is_default: true }, { key: "pc", label: "Ciclos", effects: { create: [eff("add_effort_minutes", "60", { charge_scope: "first_cycle" }), eff("add_effort_minutes", "60", { charge_scope: "per_cycle", charge_start_cycle: 2, charge_end_cycle: 2 })] } }] } }],
      });
      const q3 = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["base"], addon_keys: ["extra"], addon_selections: { extra: { quantity: 3 } }, quantity: 1 })).pricing;
      near(q3.split.recurring.price, priceOfMinutes(60 + 90), "3 unidades × 30 min");
      assert.equal(q3.addon_breakdown[0].quantity, 3);
      assert.equal(q3.addon_breakdown[0].minutes, 90);
      const q2 = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["base"], addon_keys: ["extra"], addon_selections: { extra: { quantity: 2 } }, quantity: 1 })).pricing;
      near(q2.split.recurring.price, priceOfMinutes(120));
      const cyc = (await simulate(ADMIN.token, versionId, { variation_option_keys: ["pc"], addon_keys: [], quantity: 1 })).pricing.split.cycle_prices as { cycle: number; price: number }[];
      const base = priceOfMinutes(60), plus = priceOfMinutes(120);
      near(cyc[0].price, plus, "ciclo 0: primeiro ciclo +60");
      near(cyc[1].price, base, "ciclo 1: base");
      near(cyc[2].price, plus, "ciclo 2: ciclo específico +60");
      near(cyc[3].price, base, "ciclo 3: base");
    });

    it("U09. a API recusa esforço sem alvo, com alvo inexistente ou número inválido (nada é ignorado)", async () => {
      const { versionId } = await mkProduct({ name: "Esforço inválido", tasks: [T1], addons: [{ key: "a", name: "A" }] });
      const addonId = (await prisma.catalog2Addon.findFirstOrThrow({ where: { version_id: versionId } })).id;
      const semAlvo = await adm(`/addons/${addonId}/effects`, "POST", { effect_type: "add_effort_minutes", effect_value: "10" });
      assert.equal(semAlvo.status, 422);
      assert.match(semAlvo.json.error, /Escolha a tarefa/);
      const tarefaFantasma = await adm(`/addons/${addonId}/effects`, "POST", { effect_type: "add_effort_minutes", effect_value: "10", source_task_key: "nao_existe" });
      assert.equal(tarefaFantasma.status, 422);
      const etapaFantasma = await adm(`/addons/${addonId}/effects`, "POST", { effect_type: "add_effort_minutes", effect_value: "10", source_task_key: "t1", source_step_key: "nao_existe" });
      assert.equal(etapaFantasma.status, 422);
      const negativo = await adm(`/addons/${addonId}/effects`, "POST", { effect_type: "add_effort_hours", effect_value: "-2", source_task_key: "t1" });
      assert.equal(negativo.status, 422);
      const ok = await adm(`/addons/${addonId}/effects`, "POST", { effect_type: "add_effort_hours", effect_value: "0.5", source_task_key: "t1", source_step_key: "s1" });
      assert.equal(ok.status, 201, JSON.stringify(ok.json));
    });
  });

  // ── PROBLEMA 3 · OPÇÃO QUE EXIGE ORÇAMENTO PERSONALIZADO ────────────────────────────────────
  describe("P3 · disponibilidade da opção", () => {
    const mk = async (availability: string) => {
      const { product, versionId } = await mkProduct({
        name: `Opção ${availability}`, tasks: [T1], publish: true,
        variations: [{ key: "porte", name: "Porte", is_required: true, selection_type: "single", options: { create: [{ key: "padrao", label: "Padrão", is_default: true }, { key: "grande", label: "Acima do limite", availability, availability_note: "Fale com o comercial." }] } }],
      });
      return { product, versionId };
    };
    const sel = (opt: string) => ({ variation_option_keys: [opt], addon_keys: [], quantity: 1, answers: {} });

    it("U10. orçamento personalizado: visível, selecionável, sem preço definitivo e a API NÃO ignora a opção", async () => {
      const { product, versionId } = await mk("custom_quote");
      const sim = await simulate(ADMIN.token, versionId, sel("grande"));
      assert.equal(sim.pricing.price_status, "custom_quote");
      assert.equal(sim.pricing.quote_requirements.length, 1);
      assert.equal(sim.pricing.quote_requirements[0].kind, "custom_quote");
      assert.equal(sim.pricing.lines.commercial_final_price.amount, null, "preço automático não é definitivo");
      assert.equal(sim.pricing.commercial_ready, false);
      assert.equal(sim.price_summary.source, "sob_solicitacao");
      assert.equal(sim.price_summary.amount, null);
      // cliente: a opção continua visível e selecionável
      const det = await api(`/api/catalog2/products/${product.slug}`, { token: CO.token });
      const opt = det.json.variations[0].options.find((o: any) => o.key === "grande");
      assert.deepEqual({ sel: opt.selectable, req: opt.requires_commercial_request, av: opt.availability }, { sel: true, req: true, av: "custom_quote" });
      // configurar: botão vira "Solicitar orçamento"
      const conf = await api(`/api/catalog2/products/${product.slug}/configure`, { method: "POST", token: CO.token, body: sel("grande") });
      assert.equal(conf.status, 200, JSON.stringify(conf.json));
      assert.equal(conf.json.can_generate_quote, false);
      assert.equal(conf.json.can_request_commercial, true);
      assert.equal(conf.json.pricing.cta, "request_quote");
      assert.equal(conf.json.pricing.cta_label, "Solicitar orçamento");
      assert.equal(conf.json.pricing.commercial_price_label, "Orçamento personalizado");
      assert.equal(conf.json.pricing.price_status, "custom_quote");
      // o backend bloqueia a contratação automática (cotação e cesta)
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("grande") } });
      assert.equal(q.status, 409);
      assert.equal(q.json.code, "commercial_request_required");
      const cart = await api("/api/catalog2/cart/items", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("grande") } });
      assert.equal(cart.status, 409, JSON.stringify(cart.json));
      assert.equal(cart.json.code, "commercial_request_required");
      // a opção padrão continua contratando normalmente
      const ok = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("padrao") } });
      assert.equal(ok.status, 201, JSON.stringify(ok.json));
    });

    it("U11. a seleção gera uma solicitação comercial (idempotente), visível ao cliente e à fila do admin", async () => {
      const { product } = await mk("custom_quote");
      const body = { product: product.id, selection: sel("grande"), note: "Preciso de 12 campanhas." };
      const r1 = await api("/api/catalog2/commercial-requests", { method: "POST", token: CO.token, body });
      assert.equal(r1.status, 201, JSON.stringify(r1.json));
      assert.equal(r1.json.kind, "custom_quote");
      assert.equal(r1.json.status, "aberta");
      assert.equal(r1.json.already_existed, false);
      const r2b = await api("/api/catalog2/commercial-requests", { method: "POST", token: CO.token, body });
      assert.equal(r2b.json.id, r1.json.id, "mesma seleção aberta = mesma solicitação");
      assert.equal(r2b.json.already_existed, true);
      const mine = await api("/api/catalog2/commercial-requests", { token: CO.token });
      assert.ok((mine.json.data as any[]).some((x) => x.id === r1.json.id));
      const queue = await adm("/commercial-requests?status=aberta");
      const row = (queue.json.data as any[]).find((x) => x.id === r1.json.id);
      assert.ok(row && row.product.id === product.id);
      assert.equal(row.reasons[0].kind, "custom_quote");
      const upd = await adm(`/commercial-requests/${r1.json.id}`, "PATCH", { status: "respondida", response_note: "Orçamento enviado." });
      assert.equal(upd.status, 200);
      assert.equal((await prisma.catalog2CommercialRequest.findUniqueOrThrow({ where: { id: r1.json.id } })).status, "respondida");
      // seleção que PODE contratar direto não gera solicitação
      const naoPrecisa = await api("/api/catalog2/commercial-requests", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("padrao") } });
      assert.equal(naoPrecisa.status, 409);
      assert.equal(naoPrecisa.json.code, "commercial_request_not_needed");
    });

    it("U12. indisponível: visível, mas a API recusa (nunca ignora); opção inexistente também aparece como problema", async () => {
      const { product, versionId } = await mk("unavailable");
      const sim = await simulate(ADMIN.token, versionId, sel("grande"));
      assert.equal(sim.selection_issues[0].code, "option_unavailable");
      assert.equal(sim.pricing.commercial_ready, false);
      const conf = await api(`/api/catalog2/products/${product.slug}/configure`, { method: "POST", token: CO.token, body: sel("grande") });
      assert.ok((conf.json.selection_errors as string[]).some((m) => /indisponível/.test(m)));
      assert.equal(conf.json.can_generate_quote, false);
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("grande") } });
      assert.equal(q.status, 422);
      const fantasma = await simulate(ADMIN.token, versionId, sel("fantasma"));
      assert.equal(fantasma.selection_issues[0].code, "option_unknown", "chave inexistente não é ignorada em silêncio");
      const det = await api(`/api/catalog2/products/${product.slug}`, { token: CO.token });
      assert.equal(det.json.variations[0].options.find((o: any) => o.key === "grande").selectable, false);
    });

    it("U13. análise comercial e contratação assistida também exigem solicitação; 'auto' (padrão) mantém tudo como era", async () => {
      for (const kind of ["commercial_review", "assisted_only"]) {
        const { versionId } = await mk(kind);
        const sim = await simulate(ADMIN.token, versionId, sel("grande"));
        assert.equal(sim.pricing.quote_requirements[0].kind, kind);
        assert.equal(sim.pricing.price_status, kind);
        assert.equal(sim.pricing.commercial_ready, false);
      }
      const { product, versionId } = await mk("auto");
      const sim = await simulate(ADMIN.token, versionId, sel("grande"));
      assert.equal(sim.pricing.quote_requirements.length, 0);
      assert.equal(sim.pricing.price_status, "final");
      assert.equal(sim.pricing.commercial_ready, true);
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: sel("grande") } });
      assert.equal(q.status, 201);
    });

    it("U14. a disponibilidade é editada pela API oficial, entra no histórico e é copiada para a nova versão", async () => {
      const { product, versionId } = await mkProduct({ name: "Editar disponibilidade", tasks: [T1], publish: true, variations: [{ key: "porte", name: "Porte", is_required: true, selection_type: "single", options: { create: [{ key: "a", label: "A", is_default: true }, { key: "b", label: "B" }] } }] });
      const nv = await adm(`/products/${product.id}/versions`, "POST");
      assert.equal(nv.status, 201, JSON.stringify(nv.json));
      const optB = await prisma.catalog2VariationOption.findFirstOrThrow({ where: { key: "b", variation: { version_id: nv.json.version_id } } });
      const upd = await adm(`/options/${optB.id}`, "PUT", { availability: "custom_quote", availability_note: "Fora do padrão." });
      assert.equal(upd.status, 200, JSON.stringify(upd.json));
      assert.equal(upd.json.availability, "custom_quote");
      const bad = await adm(`/options/${optB.id}`, "PUT", { availability: "inventada" });
      assert.equal(bad.status, 400);
      const hist = await prisma.catalog2ProductHistoryEvent.findFirst({ where: { product_id: product.id, event_type: "option_updated" }, orderBy: { created_at: "desc" } });
      assert.match(hist!.description, /disponibilidade/);
      const nv2Product = await adm(`/products/${product.id}`);
      const draft = (nv2Product.json.versions as any[]).find((v) => v.state === "rascunho");
      assert.equal(draft.variations[0].options.find((o: any) => o.key === "b").availability, "custom_quote");
      void versionId;
    });
  });

  // ── PROBLEMA 4 · ADICIONAIS TIPADOS ─────────────────────────────────────────────────────────
  describe("P4 · tipos de adicional", () => {
    const base = (addons: unknown[]) => mkProduct({ name: "Adicionais", tasks: [T1], addons, recurring: true });
    const run = (versionId: string, selection: Record<string, unknown>) => simulate(ADMIN.token, versionId, { variation_option_keys: [], addon_keys: Object.keys((selection.addon_selections as object) ?? {}), quantity: 1, ...selection });

    it("U15. quantidade inteira: valor, minutos e prazo por unidade; limites mínimo, máximo e incremento", async () => {
      const { versionId } = await base([{ key: "camp", name: "Campanha extra", addon_type: "quantity", qty_min: 1, qty_max: 5, qty_step: 1, unit_label: "campanha", unit_base_cost: 20, unit_minutes: 90, unit_deadline_days: 0.5, auto_quote_limit: 4, charge_scope: "recurring", source_task_key: "t1", source_step_key: "s1" }]);
      const q2 = (await run(versionId, { addon_selections: { camp: { quantity: 2 } } })).pricing;
      const q3 = (await run(versionId, { addon_selections: { camp: { quantity: 3 } } })).pricing;
      assert.equal(q2.addon_breakdown[0].minutes, 180);
      assert.equal(q3.addon_breakdown[0].minutes, 270);
      assert.equal(q3.addon_breakdown[0].unit_label, "campanha");
      assert.equal(q3.deadline.days_from_addons, 1.5, "0,5 dia × 3");
      // preço: tarefa 60 + 270 min de esforço + 3×20 de valor base, com qualificação só sobre o esforço
      const expected = r2(((60 + 270) / 60 * 100 * 1.15 + 3 * 20) * FACTOR);
      near(q3.split.recurring.price, expected, "quantidade 3", 0.05);
      assert.ok(q3.split.recurring.price > q2.split.recurring.price);
      // limites
      for (const [qty, code] of [[0, "addon_quantity_invalid"], [6, "addon_quantity_max"]] as const) {
        const r = await run(versionId, { addon_selections: { camp: { quantity: qty } } });
        assert.equal(r.selection_issues[0].code, code, `quantidade ${qty}`);
        assert.equal(r.pricing.commercial_ready, false);
      }
      // acima do limite de orçamento automático (4): exige orçamento personalizado
      const alto = (await run(versionId, { addon_selections: { camp: { quantity: 5 } } })).pricing;
      assert.equal(alto.quote_requirements[0].kind, "custom_quote");
      assert.equal(alto.price_status, "custom_quote");
    });

    it("U16. incremento: a quantidade só varia de N em N a partir do mínimo", async () => {
      const { versionId } = await base([{ key: "pac", name: "Pacote", addon_type: "quantity", qty_min: 10, qty_max: 100, qty_step: 10, unit_label: "peça", unit_base_cost: 1 }]);
      assert.equal((await run(versionId, { addon_selections: { pac: { quantity: 30 } } })).selection_issues.length, 0);
      assert.equal((await run(versionId, { addon_selections: { pac: { quantity: 35 } } })).selection_issues[0].code, "addon_quantity_step");
      assert.equal((await run(versionId, { addon_selections: { pac: { quantity: 5 } } })).selection_issues[0].code, "addon_quantity_min");
    });

    it("U17. seleção única, múltipla, faixa de quantidade e valor informado", async () => {
      const { versionId } = await base([
        { key: "unica", name: "Plano", addon_type: "single_select", choices: { create: [{ key: "p", label: "Prata", base_cost: 100, is_default: true }, { key: "o", label: "Ouro", base_cost: 300, requires_quote: true }] } },
        { key: "multi", name: "Extras", addon_type: "multi_select", choices: { create: [{ key: "a", label: "A", base_cost: 10 }, { key: "b", label: "B", base_cost: 20 }] } },
        { key: "faixa", name: "Volume", addon_type: "range", choices: { create: [{ key: "f1", label: "1 a 5", qty_from: 1, qty_to: 5, base_cost: 50 }, { key: "f2", label: "6 a 10", qty_from: 6, qty_to: 10, base_cost: 90 }] } },
        { key: "valor", name: "Verba", addon_type: "quoted_value" },
      ]);
      const u = (await run(versionId, { addon_selections: { unica: { choice_keys: ["p"] } } })).pricing;
      assert.equal(u.addon_breakdown[0].choices[0], "Prata");
      assert.equal(u.quote_requirements.length, 0);
      assert.equal((await run(versionId, { addon_selections: { unica: { choice_keys: ["o"] } } })).pricing.quote_requirements[0].kind, "custom_quote", "escolha que exige orçamento");
      assert.equal((await run(versionId, { addon_selections: { unica: { choice_keys: ["p", "o"] } } })).selection_issues[0].code, "addon_choice_many");
      const m = (await run(versionId, { addon_selections: { multi: { choice_keys: ["a", "b"] } } })).pricing;
      assert.deepEqual(m.addon_breakdown[0].choices.sort(), ["A", "B"]);
      assert.equal(m.addon_breakdown[0].base_cost, 30);
      assert.equal((await run(versionId, { addon_selections: { multi: { choice_keys: ["z"] } } })).selection_issues[0].code, "addon_choice_unknown");
      const f = (await run(versionId, { addon_selections: { faixa: { quantity: 7 } } })).pricing;
      assert.equal(f.addon_breakdown[0].choices[0], "6 a 10");
      assert.equal((await run(versionId, { addon_selections: { faixa: { quantity: 11 } } })).selection_issues[0].code, "addon_range_out");
      const v = (await run(versionId, { addon_selections: { valor: { value: 25000 } } })).pricing;
      assert.equal(v.quote_requirements[0].kind, "custom_quote", "valor informado vira orçamento");
      assert.equal(v.addon_breakdown[0].value, 25000);
      assert.equal((await run(versionId, { addon_selections: { valor: { value: 0 } } })).selection_issues[0].code, "addon_value_invalid");
    });

    it("U18. recorrência do adicional: cobrança única só na primeira cobrança; recorrente em todos os ciclos", async () => {
      const { versionId } = await base([
        { key: "unica", name: "Setup", base_cost: 100, charge_scope: "one_time" },
        { key: "mensal", name: "Mensal", base_cost: 100, charge_scope: "recurring" },
      ]);
      const sem = (await run(versionId, {})).pricing;
      const so1 = (await run(versionId, { addon_selections: { unica: {} } })).pricing;
      const so2 = (await run(versionId, { addon_selections: { mensal: {} } })).pricing;
      const cp = (p: any) => p.split.cycle_prices.map((c: any) => c.price) as number[];
      near(cp(so1)[0] - cp(sem)[0], r2(100 * FACTOR), "única: aparece na 1ª cobrança");
      near(cp(so1)[1], cp(sem)[1], "única: não aparece na renovação");
      near(cp(so2)[1] - cp(sem)[1], r2(100 * FACTOR), "recorrente: aparece na renovação");
    });

    it("U19. a API valida a configuração do adicional e das escolhas (mensagens claras)", async () => {
      const { versionId } = await mkProduct({ name: "Validação adicional", tasks: [T1] });
      const maxMenor = await adm(`/versions/${versionId}/addons`, "POST", { key: "a", name: "A", addon_type: "quantity", qty_min: 5, qty_max: 2 });
      assert.equal(maxMenor.status, 422);
      assert.match(maxMenor.json.error, /máxima/);
      const semAlvo = await adm(`/versions/${versionId}/addons`, "POST", { key: "b", name: "B", addon_type: "quantity", unit_minutes: 30 });
      assert.equal(semAlvo.status, 422);
      assert.match(semAlvo.json.error, /tarefa/);
      const ok = await adm(`/versions/${versionId}/addons`, "POST", { key: "c", name: "C", addon_type: "range", source_task_key: "t1" });
      assert.equal(ok.status, 201, JSON.stringify(ok.json));
      const faixaSemLimite = await adm(`/addons/${ok.json.id}/choices`, "POST", { key: "x", label: "X" });
      assert.equal(faixaSemLimite.status, 422);
      const f1 = await adm(`/addons/${ok.json.id}/choices`, "POST", { key: "f1", label: "1 a 5", qty_from: 1, qty_to: 5 });
      assert.equal(f1.status, 201, JSON.stringify(f1.json));
      const dup = await adm(`/addons/${ok.json.id}/choices`, "POST", { key: "f1", label: "Outra", qty_from: 6 });
      assert.equal(dup.status, 422);
      const inv = await adm(`/addons/${ok.json.id}/choices`, "POST", { key: "f2", label: "Invertida", qty_from: 9, qty_to: 3 });
      assert.equal(inv.status, 422);
    });
  });

  // ── PROBLEMAS 9, 10, 11, 12 ─────────────────────────────────────────────────────────────────
  describe("P9–P12 · nome interno, qualificação, IA e apresentação", () => {
    it("U20. nome interno: rota oficial, só administrador, com histórico antes/depois; slug e título não mudam sozinhos", async () => {
      const { product, versionId } = await mkProduct({ name: "Nome original", tasks: [T1] });
      const slugAntes = product.slug;
      const comoCliente = await api(`/api/admin/catalog2/products/${product.id}/internal-name`, { method: "PATCH", token: CO.token, body: { internal_name: "Hack" } });
      assert.ok([401, 403, 404].includes(comoCliente.status), `status ${comoCliente.status}`);
      const r = await adm(`/products/${product.id}/internal-name`, "PATCH", { internal_name: "Novo nome interno" });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      const p = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
      assert.equal(p.internal_name, "Novo nome interno");
      assert.equal(p.slug, slugAntes, "slug intocado");
      assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).title, "Nome original", "título comercial intocado");
      const h = await prisma.catalog2ProductHistoryEvent.findFirstOrThrow({ where: { product_id: product.id, event_type: "internal_name_updated" } });
      assert.equal(JSON.parse(h.before_json!).internal_name, product.internal_name);
      assert.equal(JSON.parse(h.after_json!).internal_name, "Novo nome interno");
      assert.equal(h.actor_user_id, ADMIN.user.id);
      assert.ok(h.created_at instanceof Date);
      // slug só com confirmação explícita
      const semConfirmar = await adm(`/products/${product.id}/internal-name`, "PATCH", { internal_name: "Novo nome interno", slug: "outro-slug" });
      assert.equal(semConfirmar.status, 422);
      assert.equal(semConfirmar.json.code, "slug_change_not_confirmed");
      const comConfirmar = await adm(`/products/${product.id}/internal-name`, "PATCH", { internal_name: "Novo nome interno", slug: "outro-slug", confirm_slug_change: true });
      assert.equal(comConfirmar.status, 200, JSON.stringify(comConfirmar.json));
      assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).slug, "outro-slug");
      // nome repetido
      const outro = await mkProduct({ name: "Outro", tasks: [T1] });
      const dup = await adm(`/products/${outro.product.id}/internal-name`, "PATCH", { internal_name: "Novo nome interno" });
      assert.equal(dup.status, 409);
    });

    it("U21. qualificação configurável: percentual próprio, valor/hora próprio × tempo, valor fixo e combinação; padrão herda o percentual global", async () => {
      const mkQ = (data: Record<string, unknown>) => mkProduct({ name: "Qualificação", tasks: [{ ...T1, qualification: true, data }] });
      const h = 100; // custo humano de 60 min
      const inherit = (await simulate(ADMIN.token, (await mkQ({})).versionId)).pricing;
      near(inherit.split.recurring.cost, h * 1.15, "herda 15% global");
      assert.equal(inherit.rule.qualification_applied[0].mode, "inherit");
      const pct = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "percent", qualification_percent: 10 })).versionId)).pricing;
      near(pct.split.recurring.cost, h * 1.10, "10% próprio");
      // R$ 110/h × 30 min = R$ 55 — explícito, nunca convertido em percentual
      const tempo = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "hourly_time", qualification_hourly_rate: 110, qualification_minutes: 30 })).versionId)).pricing;
      near(tempo.split.recurring.cost, h + 55, "30 min × R$ 110/h");
      assert.match(tempo.rule.qualification_applied[0].detail, /30 min × R\$ 110\/h \(valor\/hora próprio\)/);
      assert.equal(tempo.review_breakdown[0].source, "qualificacao_tempo");
      const fixo = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "fixed", qualification_fixed_amount: 40 })).versionId)).pricing;
      near(fixo.split.recurring.cost, h + 40);
      const misto = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "time_and_percent", qualification_hourly_rate: 110, qualification_minutes: 30, qualification_percent: 5 })).versionId)).pricing;
      near(misto.split.recurring.cost, h + 55 + 5, "tempo + 5%");
      // especialidade do qualificador (valor/hora vem do cadastro global)
      const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "redator" } });
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 80 } });
      const porEsp = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "hourly_time", qualification_specialty_id: spec.id, qualification_minutes: 60 })).versionId)).pricing;
      near(porEsp.split.recurring.cost, h + 80, "60 min × R$ 80/h da especialidade");
      // sem valor/hora → pendência explícita (nada é inventado)
      const semRate = (await simulate(ADMIN.token, (await mkQ({ qualification_cost_mode: "hourly_time", qualification_minutes: 30 })).versionId)).pricing;
      assert.ok(semRate.pending_info.includes("valor/hora da especialidade de revisão"));
      assert.equal(semRate.price_status, "pending");
    });

    it("U22. a API aceita a qualificação por tarefa e o modelo global leva os mesmos campos", async () => {
      const { versionId } = await mkProduct({ name: "Qual API", tasks: [T1] });
      const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
      const t = await adm(`/versions/${versionId}/tasks`, "POST", { key: "t2", name: "Tarefa com qualificação", specialty_id: spec.id, estimated_minutes: 30, requires_qualification: true, qualification_cost_mode: "time_and_percent", qualification_hourly_rate: 110, qualification_minutes: 20, qualification_percent: 5, qualifier_kind: "designated_leader", client_action_id: `q-${uid()}` });
      assert.equal(t.status, 201, JSON.stringify(t.json));
      const row = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "t2" }, include: { task_model: true } });
      assert.deepEqual({ m: row.qualification_cost_mode, r: row.qualification_hourly_rate, mi: row.qualification_minutes, p: row.qualification_percent, k: row.qualifier_kind }, { m: "time_and_percent", r: 110, mi: 20, p: 5, k: "designated_leader" });
      assert.equal(row.task_model!.qualification_cost_mode, "time_and_percent", "o modelo global guarda a mesma configuração");
      const bad = await adm(`/tasks/${row.id}`, "PUT", { qualification_cost_mode: "inventado" });
      assert.equal(bad.status, 400);
    });

    it("U23. estados do custo de IA: sem IA · não definido · desativada · configurada · estimada; execuções previstas e unidade de tokens", async () => {
      const mkAi = (prof: Record<string, unknown>, ai: Record<string, unknown> = {}) => prisma.catalog2AIProfile.create({ data: { name: `IA ${uid()}`, provider: "gemini", model: "gemini-2.5-flash", ...prof } }).then(async (p) => (await mkProduct({ name: "IA", tasks: [{ ...T1, mode: "hibrido", data: { ai: { create: { profile_id: p.id, ai_mode: "rascunho", human_review_required: true, ...ai } } } }] })).versionId);
      const state = async (vid: string) => (await simulate(ADMIN.token, vid)).pricing;
      assert.equal((await state((await mkProduct({ name: "Sem IA", tasks: [T1] })).versionId)).ai_cost_state, "none");
      assert.equal((await state(await mkAi({ is_active: true }))).ai_cost_state, "not_defined");
      assert.equal((await state(await mkAi({ is_active: false }))).ai_cost_state, "disabled");
      const cfg = await state(await mkAi({ is_active: true, unit_cost_input_per_1k: 0.1, unit_cost_output_per_1k: 0.2 }));
      assert.equal(cfg.ai_cost_state, "configured");
      assert.equal(cfg.pricing_pending, false);
      const est = await state(await mkAi({ is_active: true, unit_cost_input_per_1k: 0.1, unit_cost_output_per_1k: 0.2 }, { est_input_tokens: 2000, est_output_tokens: 1000 }));
      assert.equal(est.ai_cost_state, "estimated");
      near(est.ia_cost_breakdown[0].cost, 0.4, "2k×0,1 + 1k×0,2", 0.001);
      // execuções previstas e limite de revisões
      const runs = await state(await mkAi({ is_active: true, unit_cost_input_per_1k: 0.1, unit_cost_output_per_1k: 0.2, expected_runs: 3, review_limit: 1 }, { est_input_tokens: 2000, est_output_tokens: 1000, est_review_rounds: 5 }));
      near(runs.ia_cost_breakdown[0].cost ?? 0, 0.4 * (1 + 1) * 3, "revisões limitadas a 1 e 3 execuções", 0.001);
      // unidade de tokens: preço informado por milhão
      const mi = await state(await mkAi({ is_active: true, unit_tokens: 1_000_000, unit_cost_input_per_1k: 1, unit_cost_output_per_1k: 2 }, { est_input_tokens: 2_000_000, est_output_tokens: 1_000_000 }));
      near(mi.ia_cost_breakdown[0].cost ?? 0, 4, "2M/1M×1 + 1M/1M×2", 0.001);
    });

    it("U24. perfil de IA: estado explícito (inativo sem credenciais, provedor/ custo)", async () => {
      const mk = (b: Record<string, unknown>) => adm("/ai-profiles", "POST", { name: `Perfil ${uid()}`, ...b });
      const r = await mk({ provider: "gemini", model: "gemini-2.5-pro", is_active: false, unit_tokens: 1000, expected_runs: 2, review_limit: 3 });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      const list = await adm("/ai-profiles");
      const p = (list.json.data as any[]).find((x) => x.id === r.json.id);
      assert.ok(["inactive", "inactive_no_credentials"].includes(p.status), p.status);
      assert.equal(p.expected_runs, 2);
      assert.equal(p.review_limit, 3);
      assert.equal(p.cost_defined, false);
      const ativo = await adm(`/ai-profiles/${r.json.id}`, "PUT", { is_active: true });
      assert.equal(ativo.status, 200, JSON.stringify(ativo.json));
      const p2 = ((await adm("/ai-profiles")).json.data as any[]).find((x) => x.id === r.json.id);
      assert.ok(["cost_not_defined", "provider_not_configured"].includes(p2.status), p2.status);
      const comCusto = await adm(`/ai-profiles/${r.json.id}`, "PUT", { unit_cost_input_per_1k: 0.1, unit_cost_output_per_1k: 0.3 });
      assert.equal(comCusto.status, 200);
      assert.equal(((await adm("/ai-profiles")).json.data as any[]).find((x) => x.id === r.json.id).cost_defined, true);
    });

    it("U25. tarefas e etapas: base x condicional separadas; condicionais desligadas não entram no preço e ligadas entram", async () => {
      const { product, versionId } = await mkProduct({
        name: "Condicionais", tasks: [T1, { key: "extra", conditional: true, minutes: 30, steps: [{ key: "e1", minutes: 30 }] }, { key: "t3", steps: [{ key: "a", minutes: 30 }, { key: "b", minutes: 30, conditional: true }] }],
        addons: [{ key: "liga", name: "Liga a tarefa extra", effects: { create: [{ effect_type: "add_task", effect_value: "extra" }, { effect_type: "add_step", effect_value: "t3:b" }] } }],
      });
      const off = (await simulate(ADMIN.token, versionId)).pricing;
      assert.deepEqual(off.active_scenario, { base_tasks: 2, conditional_tasks_on: 0, base_steps: 2, conditional_steps_on: 0, tasks_possible: 3, steps_possible: 4 });
      assert.ok(!off.active_task_keys.includes("extra"));
      const on = (await simulate(ADMIN.token, versionId, { variation_option_keys: [], addon_keys: ["liga"], quantity: 1 })).pricing;
      assert.deepEqual(on.active_scenario, { base_tasks: 2, conditional_tasks_on: 1, base_steps: 3, conditional_steps_on: 1, tasks_possible: 3, steps_possible: 4 });
      assert.ok(on.active_task_keys.includes("extra"));
      assert.ok(on.split.recurring.price > off.split.recurring.price, "ligadas custam mais");
      // prontidão/detalhe separam base × condicional (nunca "3 tarefas / 4 etapas" misturado)
      const rd = await adm(`/products/${product.id}/readiness`);
      assert.deepEqual({ tb: rd.json.task_count_base, tc: rd.json.task_count_conditional, sb: rd.json.step_count_base, sc: rd.json.step_count_conditional, t: rd.json.task_count, s: rd.json.step_count }, { tb: 2, tc: 1, sb: 3, sc: 1, t: 3, s: 4 });
      const det = await adm(`/products/${product.id}`);
      assert.deepEqual(det.json.versions[0].counts, { tasks_base: 2, tasks_conditional: 1, tasks_total: 3, steps_base: 3, steps_conditional: 1, steps_total: 4 });
    });

    it("U26. produto antigo (sem nenhuma configuração nova) calcula como sempre, com padrões seguros", async () => {
      const { versionId, product } = await mkProduct({ name: "Produto antigo", tasks: [T1], publish: true });
      const row = await prisma.catalog2Addon.count({ where: { version_id: versionId } });
      assert.equal(row, 0);
      const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
      assert.deepEqual({ m: t.qualification_cost_mode, k: t.qualifier_kind }, { m: "inherit", k: "area_leader" });
      const sim = (await simulate(ADMIN.token, versionId)).pricing;
      near(sim.split.recurring.price, priceOfMinutes(60));
      assert.deepEqual({ r: sim.quote_requirements.length, i: sim.selection_issues.length, e: sim.effort_breakdown.length, s: sim.price_status }, { r: 0, i: 0, e: 0, s: "final" });
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: SEL } });
      assert.equal(q.status, 201, JSON.stringify(q.json));
    });

    it("U27. produto em rascunho é invisível ao cliente e não pode ser cotado nem pedido por solicitação comercial", async () => {
      const { product } = await mkProduct({ name: "Rascunho", tasks: [T1], variations: [{ key: "v", name: "V", is_required: true, selection_type: "single", options: { create: [{ key: "a", label: "A", is_default: true, availability: "custom_quote" }] } }] });
      const list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
      assert.ok(!(list.json.data as any[]).some((x) => x.id === product.id));
      assert.equal((await api(`/api/catalog2/products/${product.slug}`, { token: CO.token })).status, 404);
      const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: { ...SEL, variation_option_keys: ["a"] } } });
      assert.equal(q.status, 409);
      assert.equal(q.json.code, "not_quotable");
      const req = await api("/api/catalog2/commercial-requests", { method: "POST", token: CO.token, body: { product: product.id, selection: { ...SEL, variation_option_keys: ["a"] } } });
      assert.equal(req.status, 409);
    });

    it("U28. referências inexistentes (opção, tarefa, etapa, produto) falham com mensagem; editar um produto não altera outro", async () => {
      const a = await mkProduct({ name: "Produto A", tasks: [T1] });
      const b = await mkProduct({ name: "Produto B", tasks: [T1] });
      const snap = async (id: string) => JSON.stringify(await prisma.catalog2Product.findUniqueOrThrow({ where: { id }, include: { versions: { include: { tasks: { include: { steps: true } }, addons: true, variations: { include: { options: true } } } } } }));
      const before = await snap(b.product.id);
      const optFantasma = await adm("/options/nao-existe", "PUT", { availability: "auto" });
      assert.equal(optFantasma.status, 404);
      const gate = await adm(`/versions/${a.versionId}/approval-gates`, "POST", { name: "G", anchor_task_key: "fantasma", position: "before_deliver" });
      assert.equal(gate.status, 422);
      const rule = await adm(`/products/${a.product.id}/prerequisites`, "POST", { target_kind: "product_deliverables", target_product_id: "produto-que-nao-existe", condition_mode: "when_bought_together", behavior: "block_stage" });
      assert.equal(rule.status, 404);
      const addon = await adm(`/versions/${a.versionId}/addons`, "POST", { key: "x", name: "X", addon_type: "quantity", source_task_key: "t1", unit_minutes: 10 });
      assert.equal(addon.status, 201);
      const ef = await adm(`/addons/${addon.json.id}/effects`, "POST", { effect_type: "add_effort_minutes", effect_value: "5", source_task_key: "t1", source_step_key: "sem_etapa" });
      assert.equal(ef.status, 422);
      assert.equal(await snap(b.product.id), before, "o outro produto não mudou");
      void byKey; void tasksOf;
    });
  });
});
