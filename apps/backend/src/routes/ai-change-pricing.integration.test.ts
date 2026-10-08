import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { ensureDefaultAIServices } from "../lib/ai-usage-tracker";
import { averagesFrom, pooledCost, priceForChange } from "../lib/ai-change-pricing";
import { api, mkAdmin, mkCompanyUser, startServer, stopServer } from "../test-support/universal-helpers";

// P-11 (reunião 07/10): preço das alterações feitas por IA a partir da MÉDIA real de tokens/custo.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const get = (token = ADMIN.token) => api("/api/ai-usage/change-pricing", { token });
const put = (body: unknown, token = ADMIN.token) => api("/api/ai-usage/change-pricing", { method: "PUT", token, body });

describe("Precificação das alterações por IA (P-11)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("CPR"); await ensureDefaultAIServices(); await prisma.aIUsageLog.deleteMany({}); });
  after(async () => { await prisma.aIUsageLog.deleteMany({}); await stopServer(); });

  it("CPR01. cálculo puro: média, percentil 90, ponderação por chamadas, margem, mínimo e arredondamento para cima em R$ 0,10", () => {
    const logs = [
      ...[0.001, 0.002, 0.003, 0.004, 0.010].map((c) => ({ feature: "improve-product-field", prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, estimated_cost_usd: c })),
      ...[0.020, 0.040].map((c) => ({ feature: "product-draft", prompt_tokens: 4000, completion_tokens: 2000, total_tokens: 6000, estimated_cost_usd: c })),
    ];
    const av = averagesFrom(logs);
    const a = av.find((x) => x.feature === "improve-product-field")!;
    assert.deepEqual([a.calls, a.avg_total_tokens, a.avg_cost_usd, a.p90_cost_usd], [5, 1500, 0.004, 0.01]);
    assert.equal(av[0].feature, "improve-product-field", "ordena por número de chamadas");
    const avg = pooledCost(av, null, "average");
    assert.ok(Math.abs(avg - (0.004 * 5 + 0.03 * 2) / 7) < 1e-9, "média ponderada pelas chamadas");
    assert.equal(pooledCost(av, ["product-draft"], "average"), 0.03, "só as funcionalidades escolhidas");
    assert.equal(pooledCost(av, ["nao-existe"], "average"), 0);
    const s = { usd_brl_rate: 5, margin_percent: 100, free_changes: 1, min_price_brl: 0, basis: "average" as const, features: null };
    assert.equal(priceForChange(0.03, s), 0.3, "0,03 USD × 5 × 2 = R$ 0,30");
    assert.equal(priceForChange(0.0301, s), 0.4, "arredonda para cima em R$ 0,10");
    assert.equal(priceForChange(0.0001, { ...s, min_price_brl: 1.5 }), 1.5, "respeita o mínimo");
    assert.equal(priceForChange(0, s), 0);
  });

  it("CPR02. sem dados o preço fica no mínimo e avisa que há poucos dados; só administração acessa", async () => {
    const r = await get();
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.enough_data, false);
    assert.equal(r.json.price_per_change_brl, 0);
    assert.deepEqual([r.json.settings.usd_brl_rate, r.json.settings.margin_percent, r.json.settings.free_changes], [5.5, 100, 1], "padrões");
    const negado = (await get(CO.token)).status;
    assert.ok([401, 403].includes(negado), `empresa não acessa (status ${negado})`);
  });

  it("CPR03. com chamadas reais registradas, calcula as médias e o preço; as regras são editáveis e validadas", async () => {
    const svc = await prisma.aIServiceConfig.findUniqueOrThrow({ where: { key: "gemini" } });
    const rows = Array.from({ length: 30 }, (_, i) => ({ service_id: svc.id, model: "gemini-2.5-flash", feature: i < 20 ? "improve-product-field" : "questionnaire-suggest", prompt_tokens: 1000, completion_tokens: 400, total_tokens: 1400, estimated_cost_usd: i < 20 ? 0.002 : 0.01 }));
    await prisma.aIUsageLog.createMany({ data: rows });
    // imagem (cobrada por unidade) fica fora da média de tokens
    await prisma.aIUsageLog.create({ data: { service_id: svc.id, model: "gemini-2.5-flash-image", feature: "image", units: 1, estimated_cost_usd: 0.04 } });
    const r = await get();
    assert.equal(r.json.sample_calls, 30);
    assert.equal(r.json.enough_data, true);
    assert.deepEqual(r.json.averages.map((a: any) => [a.feature, a.calls, a.avg_cost_usd]), [["improve-product-field", 20, 0.002], ["questionnaire-suggest", 10, 0.01]]);
    const custo = (0.002 * 20 + 0.01 * 10) / 30;
    assert.ok(Math.abs(r.json.pooled_cost_usd - custo) < 1e-6);
    assert.equal(r.json.price_per_change_brl, Math.ceil(custo * 5.5 * 2 * 10 - 1e-9) / 10);
    // regras
    assert.equal((await put({ margin_percent: -5 })).status, 422);
    assert.equal((await put({ usd_brl_rate: 0 })).status, 422);
    assert.ok([400, 422].includes((await put({ free_changes: 1.5 })).status), "decimal é recusado");
    const ok = await put({ usd_brl_rate: 6, margin_percent: 150, free_changes: 2, min_price_brl: 0.5, basis: "p90", features: ["improve-product-field"] });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.deepEqual([ok.json.settings.usd_brl_rate, ok.json.settings.margin_percent, ok.json.settings.free_changes, ok.json.settings.basis, ok.json.settings.features], [6, 150, 2, "p90", ["improve-product-field"]]);
    assert.equal(ok.json.price_per_change_brl, Math.max(0.5, Math.ceil(0.002 * 6 * 2.5 * 10 - 1e-9) / 10), "usa só a funcionalidade escolhida, p90 e o mínimo");
    const limpa = await put({ features: [] });
    assert.equal(limpa.json.settings.features, null, "lista vazia = todas as funcionalidades");
  });
});
