import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, mkProduct, SEL, startServer, stopServer } from "../test-support/universal-helpers";

// Entrega emergencial (B3): cadastro por etapa, recálculo de prazo/preço e cotação do cliente.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

async function produto() {
  const p = await mkProduct({ name: "Emergencial", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 480 }, { key: "s2", minutes: 480 }] }] });
  const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
  return { ...p, idOf: Object.fromEntries(task.steps.map((s) => [s.key, s.id])) };
}
const sim = (versionId: string, emergency: boolean) => adm(`/versions/${versionId}/simulate`, "POST", { ...SEL, emergency });

describe("Entrega emergencial (B3)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("EM"); });
  after(async () => { await stopServer(); });

  it("EM01. cadastro valida: redução maior que a etapa, tipo sem valor e percentual absurdo são recusados", async () => {
    const p = await produto();
    assert.equal((await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_reduction_minutes: 9999 })).status, 422);
    assert.equal((await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_extra_kind: "fixed" })).status, 422);
    assert.equal((await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_extra_kind: "percent", emergency_extra_value: 5000 })).status, 422);
    const ok = await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_reduction_minutes: 240, emergency_extra_kind: "fixed", emergency_extra_value: 150 });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const det = await adm(`/products/${p.product.id}`);
    const s1 = det.json.versions[0].tasks[0].steps.find((s: any) => s.key === "s1");
    assert.equal(s1.emergency_reduction_minutes, 240);
    assert.equal(s1.emergency_extra_kind, "fixed");
  });

  it("EM02. sem ligar na versão a opção não existe; ligada, soma o adicional e encurta o prazo", async () => {
    const p = await produto();
    await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_reduction_minutes: 480, emergency_extra_kind: "fixed", emergency_extra_value: 150 });
    const off = await sim(p.versionId, true);
    assert.equal(off.status, 200, JSON.stringify(off.json));
    assert.equal(off.json.pricing.emergency.available, false);
    const on = await adm(`/versions/${p.versionId}`, "PUT", { emergency_enabled: true });
    assert.equal(on.status, 200, JSON.stringify(on.json));
    const base = await sim(p.versionId, false);
    const em = await sim(p.versionId, true);
    assert.equal(em.json.pricing.emergency.available, true);
    assert.equal(em.json.pricing.emergency.selected, true);
    assert.equal(em.json.pricing.emergency.extra_price, 150);
    assert.equal(em.json.pricing.emergency.reduction_minutes, 480);
    assert.equal(Math.round((em.json.pricing.simulation.total - base.json.pricing.simulation.total) * 100) / 100, 150);
    assert.equal(base.json.pricing.emergency.selected, false);
  });

  it("EM03. publicar com a opção ligada e nenhuma etapa configurada é bloqueado", async () => {
    const p = await produto();
    await adm(`/versions/${p.versionId}`, "PUT", { emergency_enabled: true });
    const v = await adm(`/versions/${p.versionId}/validate`);
    assert.match(JSON.stringify(v.json), /entrega emergencial/i);
  });

  it("EM04. cliente cota com entrega emergencial: preço sobe, é outra configuração e o produto sem a opção recusa", async () => {
    const p = await produto();
    await adm(`/steps/${p.idOf.s1}`, "PUT", { emergency_reduction_minutes: 240, emergency_extra_kind: "fixed", emergency_extra_value: 200 });
    await adm(`/versions/${p.versionId}`, "PUT", { emergency_enabled: true });
    const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    const a = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    const b = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: { ...SEL, emergency: true } } });
    assert.equal(a.status, 201, JSON.stringify(a.json));
    assert.equal(b.status, 201, JSON.stringify(b.json));
    assert.notEqual(a.json.config_checksum ?? a.json.id, b.json.config_checksum ?? b.json.id);
    assert.equal(Math.round((Number(b.json.commercial_price) - Number(a.json.commercial_price)) * 100) / 100, 200);
  });

  it("EM05. R21-04: como condição do PRODUTO, o % vale para todas as etapas (prazo e adicional); sem o % não publica", async () => {
    const p = await produto();
    await adm(`/versions/${p.versionId}`, "PUT", { emergency_enabled: true, emergency_mode: "product" });
    assert.match(JSON.stringify((await adm(`/versions/${p.versionId}/validate`)).json), /percentual de redução/i);
    const ok = await adm(`/versions/${p.versionId}`, "PUT", { emergency_product_reduction_percent: 50, emergency_product_extra_percent: 10 });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const base = await sim(p.versionId, false);
    const em = await sim(p.versionId, true);
    assert.equal(em.json.pricing.emergency.available, true);
    assert.equal(em.json.pricing.emergency.items.length, 2, "todas as etapas entram");
    assert.equal(em.json.pricing.emergency.reduction_minutes, 480, "50% de 2 etapas de 480 min em sequência = 480 min a menos");
    assert.ok(em.json.pricing.simulation.total > base.json.pricing.simulation.total, "o adicional de % sobe o preço");
  });

  it("EM06. R21-19: limites do pedido são guardados e validados (HH:MM)", async () => {
    const p = await produto();
    assert.equal((await adm(`/versions/${p.versionId}`, "PUT", { emergency_same_day_limit_time: "25:99" })).status, 400);
    const ok = await adm(`/versions/${p.versionId}`, "PUT", { emergency_same_day_limit_time: "12:00", emergency_min_notice_hours: 24, emergency_executor_accept_required: true, emergency_executor_accept_hours: 4 });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const v = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    assert.equal(v.emergency_same_day_limit_time, "12:00");
    assert.equal(v.emergency_min_notice_hours, 24);
    assert.equal(v.emergency_executor_accept_required, true);
  });

  it("EM07. R21-05: adicional \"só depois da execução\" não aparece na compra; \"antes\" e \"ambos\" aparecem; os de depois/ambos saem em after_purchase_addons", async () => {
    const p = await mkProduct({
      name: "Fase do adicional", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 480 }] }],
      addons: [{ key: "a-antes", name: "Antes", base_cost: 10 }, { key: "a-depois", name: "Depois", base_cost: 10, contract_phase: "during" }, { key: "a-ambos", name: "Ambos", base_cost: 10, contract_phase: "both" }],
    } as any);
    const upd = await adm(`/addons/${(await prisma.catalog2Addon.findFirstOrThrow({ where: { version_id: p.versionId, key: "a-antes" } })).id}`, "PUT", { contract_phase: "tudo" });
    assert.equal(upd.status, 400, "valor inválido é recusado");
    const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    const det = await api(`/api/catalog2/products/${p.product.id}`, { token: CO.token });
    assert.equal(det.status, 200, JSON.stringify(det.json));
    const keys = (det.json.addons as { key: string }[]).map((a) => a.key).sort();
    assert.deepEqual(keys, ["a-ambos", "a-antes"]);
    assert.deepEqual((det.json.after_purchase_addons as { key: string }[]).map((a) => a.key).sort(), ["a-ambos", "a-depois"]);
  });
});
