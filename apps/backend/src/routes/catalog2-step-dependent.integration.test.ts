import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { validateVersionForPublish } from "../lib/catalog2-service";
import { api, mkAdmin, mkProduct, setPricingSettings, startServer, stopServer } from "../test-support/universal-helpers";

// R21-03 (reunião 21/10): etapa marcada como "dependente de variação ou adicional" precisa estar ligada a uma opção, adicional ou condição
// (efeito "incluir etapa"); sem esse vínculo o produto não publica. A etapa dependente fica fora do produto base.

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const PLAT = { key: "plat", name: "Plataforma", is_required: true, selection_type: "single", options: { create: [{ key: "g", label: "Google", is_default: true }, { key: "m", label: "Meta" }] } };
const MSG = /dependente de variação ou adicional/;

async function mk(name: string) {
  const { product, versionId } = await mkProduct({ name, tasks: [{ key: "a", steps: [{ key: "s1" }, { key: "s2" }] }], variations: [PLAT] } as any);
  const s2 = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { key: "s2", task: { version_id: versionId } } });
  const optM = await prisma.catalog2VariationOption.findFirstOrThrow({ where: { key: "m", variation: { version_id: versionId } } });
  return { product, versionId, s2, optM };
}
const issues = async (versionId: string) => (await validateVersionForPublish(versionId)).issues.filter((m) => MSG.test(m));

describe("Etapa dependente de variação ou adicional", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("D01. marcar a etapa como dependente é guardado (e só da etapa do produto)", async () => {
    const { s2 } = await mk("D01");
    const r = await adm(`/steps/${s2.id}`, "PUT", { is_conditional: true, scope: "product" });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s2.id } })).is_conditional, true);
  });

  it("D02. etapa dependente SEM vínculo trava a publicação, com mensagem que cita a etapa; etapa comum não é afetada", async () => {
    const { versionId, s2 } = await mk("D02");
    assert.deepEqual(await issues(versionId), [], "sem marcação não há erro");
    await adm(`/steps/${s2.id}`, "PUT", { is_conditional: true, scope: "product" });
    const list = await issues(versionId);
    assert.equal(list.length, 1);
    assert.match(list[0], new RegExp(`"${s2.name}"`));
    const det = (await validateVersionForPublish(versionId)).issue_details.find((d) => MSG.test(d.message));
    assert.equal(det?.target, "options", "o atalho 'Corrigir' leva para variações/adicionais");
  });

  it("D03. ligar a etapa a uma opção da variação (efeito 'incluir etapa') resolve o erro", async () => {
    const { versionId, s2, optM } = await mk("D03");
    await adm(`/steps/${s2.id}`, "PUT", { is_conditional: true, scope: "product" });
    assert.equal((await issues(versionId)).length, 1);
    const r = await adm(`/options/${optM.id}/effects`, "POST", { effect_type: "add_step", effect_value: "a:s2", charge_scope: "recurring" });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.deepEqual(await issues(versionId), []);
  });

  it("D05. a prontidão (tela Conferência final) mostra o bloqueio em VARIAÇÕES, com a etapa citada, e ele some ao ligar a etapa", async () => {
    const { product, versionId, s2, optM } = await mk("D05");
    await adm(`/steps/${s2.id}`, "PUT", { is_conditional: true, scope: "product" });
    const ready = async () => (await adm(`/products/${product.id}/readiness?version_id=${versionId}`)).json as { items: Record<string, { level: string; note: string }> };
    const antes = (await ready()).items.variacoes;
    assert.equal(antes.level, "bloqueador");
    assert.match(antes.note, new RegExp(s2.name));
    assert.match(antes.note, /Incluir etapa/);
    await adm(`/options/${optM.id}/effects`, "POST", { effect_type: "add_step", effect_value: "a:s2", charge_scope: "recurring" });
    assert.notEqual((await ready()).items.variacoes.level, "bloqueador");
  });

  it("D04. só uma etapa marcada como dependente pode ser incluída por uma opção (etapa comum é recusada)", async () => {
    const { optM } = await mk("D04");
    const r = await adm(`/options/${optM.id}/effects`, "POST", { effect_type: "add_step", effect_value: "a:s1", charge_scope: "recurring" });
    assert.equal(r.status, 422);
    assert.match(JSON.stringify(r.json), /condicional/i);
  });
});
