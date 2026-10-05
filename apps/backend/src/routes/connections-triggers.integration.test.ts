import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { ensureConnectionTypes } from "../lib/connections/catalog";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, SEL, setPricingSettings, startServer, stopServer, tasksOf, type ProductSpec } from "../test-support/universal-helpers";

// Estrutura universal v2 · conexões ativadas por gatilho (produto, variação, opção, adicional, tarefa, etapa, resposta, produto vinculado).
// Sem gatilho nada muda (modo manual = comportamento anterior): produtos antigos e conexões sem gatilho seguem como sempre.

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const cn = (p: string, token: string, method = "GET", body?: unknown) => api(`/api/connections${p}`, { method, token, body });
const pcrsOf = async (projectId: string) => {
  const rows = await prisma.projectConnectionRequirement.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
  const defs = await prisma.catalog2ConnectionRequirement.findMany({ where: { id: { in: rows.map((r) => r.requirement_id) } }, select: { id: true, key: true } });
  const keyById = new Map(defs.map((d) => [d.id, d.key]));
  return rows.map((r) => ({ ...r, requirement: { key: keyById.get(r.requirement_id)! } }));
};
const keyOf = (p: { requirement: { key: string } }) => p.requirement.key;

interface Req { key: string; type: string; deps: { task_key: string; kind?: string }[]; triggers?: Array<{ kind: string; ref_key?: string; ref_value?: string; operator?: string }>; mode?: string; obligation?: string; extra?: Record<string, unknown> }
// método e permissão válidos para cada tipo do catálogo
const METHOD: Record<string, string> = { google_ads: "manager_account", meta_business_manager: "partner_business", meta_ad_account: "partner_business", google_analytics_4: "oauth", email_account: "user_invite" };
const PERM: Record<string, string> = { google_ads: "standard", meta_ad_account: "advertiser", email_account: "delegate" };
const reqBody = (r: Req) => ({
  connection_type_key: r.type, method: METHOD[r.type] ?? "revocable_token", permission_level: PERM[r.type] ?? "read_write", when_needed: "before_task", when_task_key: r.deps[0].task_key,
  obligation: r.obligation ?? "required", validation_mode: "manual", dependents: r.deps.map((d) => ({ task_key: d.task_key, step_key: null, kind: d.kind ?? "start" })),
  ...(r.triggers ? { triggers: r.triggers, activation_mode: r.mode ?? "any_trigger" } : {}), ...(r.extra ?? {}),
});
async function mkConnProduct(name: string, spec: Omit<ProductSpec, "name" | "publish">, reqs: Req[]) {
  const { product, versionId } = await mkProduct({ name, ...spec });
  assert.equal((await adm(`/versions/${versionId}/connections-module`, "PUT", { requires_connections: true })).status, 200);
  for (const r of reqs) {
    const x = await adm(`/versions/${versionId}/connection-requirements/by-key/${r.key}`, "PUT", reqBody(r));
    assert.ok([200, 201].includes(x.status), JSON.stringify(x.json));
  }
  const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId };
}
const quote = async (productId: string, selection: Record<string, unknown> = SEL) => {
  const r = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: productId, selection } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string };
};
const sel = (opts: string[], addons: string[] = [], answers: Record<string, string> = {}) => ({ variation_option_keys: opts, addon_keys: addons, quantity: 1, answers });

const PLAT = { key: "plat", name: "Plataforma", is_required: true, selection_type: "single", options: { create: [{ key: "g", label: "Google", is_default: true }, { key: "m", label: "Meta" }, { key: "both", label: "Ambas" }] } };

describe("Estrutura universal v2 · conexões por gatilho", () => {
  before(async () => { await startServer(); await ensureConnectionTypes(prisma); ADMIN = await mkAdmin(); CO = await mkCompanyUser("CT"); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("T01. produto sem conexão: nada aparece, nada é criado, nada bloqueia", async () => {
    const { product, versionId } = await mkProduct({ name: "Sem conexão", tasks: [{ key: "a" }], publish: true });
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).requires_connections, false);
    const q = await quote(product.id);
    const { projectId } = await checkoutAndPay(CO.token, [q.id]);
    assert.equal((await pcrsOf(projectId)).length, 0);
    assert.notEqual(byKey(await tasksOf(projectId)).a.status, "PENDENTE_DE_LIBERACAO");
  });

  it("T02. conexão opcional (sem gatilho): aparece, mas nunca bloqueia a tarefa", async () => {
    const { product } = await mkConnProduct("Opcional", { tasks: [{ key: "a" }] }, [{ key: "crm", type: "crm", deps: [{ task_key: "a" }], obligation: "optional" }]);
    const { projectId } = await checkoutAndPay(CO.token, [(await quote(product.id)).id]);
    assert.equal((await pcrsOf(projectId)).length, 1);
    assert.notEqual(byKey(await tasksOf(projectId)).a.status, "PENDENTE_DE_LIBERACAO");
  });

  it("T03. ativada por VARIAÇÃO/OPÇÃO: Google exige Google Ads; Meta exige Business Manager e conta de anúncios; Ambas exige todas", async () => {
    const reqs: Req[] = [
      { key: "gads", type: "google_ads", deps: [{ task_key: "ga" }], triggers: [{ kind: "option", ref_key: "g" }, { kind: "option", ref_key: "both" }] },
      { key: "bm", type: "meta_business_manager", deps: [{ task_key: "me" }], triggers: [{ kind: "variation", ref_key: "plat", ref_value: "m" }, { kind: "option", ref_key: "both" }] },
      { key: "acc", type: "meta_ad_account", deps: [{ task_key: "me" }], triggers: [{ kind: "option", ref_key: "m" }, { kind: "option", ref_key: "both" }] },
    ];
    const { product } = await mkConnProduct("Plataformas", { tasks: [{ key: "ga" }, { key: "me" }, { key: "livre" }], variations: [PLAT] }, reqs);
    const act = async (opt: string) => {
      const { projectId } = await checkoutAndPay(CO.token, [(await quote(product.id, sel([opt]))).id]);
      const pcrs = await pcrsOf(projectId);
      const t = byKey(await tasksOf(projectId));
      return { active: pcrs.filter((p) => p.condition_active).map(keyOf).sort(), inactive: pcrs.filter((p) => !p.condition_active).map(keyOf).sort(), t };
    };
    const g = await act("g");
    assert.deepEqual(g.active, ["gads"]);
    assert.deepEqual(g.inactive, ["acc", "bm"]);
    assert.equal(g.t.ga.status, "PENDENTE_DE_LIBERACAO", "só a tarefa dependente do Google bloqueia");
    assert.notEqual(g.t.me.status, "PENDENTE_DE_LIBERACAO", "Meta não exigida: tarefa segue");
    assert.notEqual(g.t.livre.status, "PENDENTE_DE_LIBERACAO");
    const m = await act("m");
    assert.deepEqual(m.active, ["acc", "bm"]);
    assert.equal(m.t.me.status, "PENDENTE_DE_LIBERACAO");
    assert.notEqual(m.t.ga.status, "PENDENTE_DE_LIBERACAO");
    const both = await act("both");
    assert.deepEqual(both.active, ["acc", "bm", "gads"], "ambas: todas as conexões das duas plataformas");
    assert.equal(both.t.ga.status, "PENDENTE_DE_LIBERACAO");
    assert.equal(both.t.me.status, "PENDENTE_DE_LIBERACAO");
    assert.notEqual(both.t.livre.status, "PENDENTE_DE_LIBERACAO", "ausência da conexão bloqueia SÓ a tarefa dependente");
  });

  it("T04. ativada por ADICIONAL: GA4/GTM só quando contratado", async () => {
    const reqs: Req[] = [{ key: "ga4", type: "google_analytics_4", deps: [{ task_key: "a" }], triggers: [{ kind: "addon", ref_key: "ga4" }] }];
    const { product } = await mkConnProduct("Adicional liga conexão", { tasks: [{ key: "a" }], addons: [{ key: "ga4", name: "Implantação GA4" }] }, reqs);
    const sem = await checkoutAndPay(CO.token, [(await quote(product.id, sel([]))).id]);
    assert.equal((await pcrsOf(sem.projectId))[0].condition_active, false);
    assert.notEqual(byKey(await tasksOf(sem.projectId)).a.status, "PENDENTE_DE_LIBERACAO");
    const com = await checkoutAndPay(CO.token, [(await quote(product.id, sel([], ["ga4"]))).id]);
    assert.equal((await pcrsOf(com.projectId))[0].condition_active, true);
    assert.equal(byKey(await tasksOf(com.projectId)).a.status, "PENDENTE_DE_LIBERACAO");
  });

  it("T05. a contratação mostra ao cliente só as conexões que a seleção realmente aciona", async () => {
    const reqs: Req[] = [
      { key: "gads", type: "google_ads", deps: [{ task_key: "ga" }], triggers: [{ kind: "option", ref_key: "g" }] },
      { key: "acc", type: "meta_ad_account", deps: [{ task_key: "ga" }], triggers: [{ kind: "option", ref_key: "m" }] },
      { key: "crm", type: "crm", deps: [{ task_key: "ga" }] },
    ];
    const { product } = await mkConnProduct("Visão do cliente", { tasks: [{ key: "ga" }], variations: [PLAT] }, reqs);
    const qg = await quote(product.id, sel(["g"]));
    const keys = async (id: string) => ((await cn(`/quotes/${id}/requirements`, CO.token)).json.data as any[]).map((r) => r.key).sort();
    assert.deepEqual(await keys(qg.id), ["crm", "gads"], "Meta não aparece quando a opção é Google");
    assert.deepEqual(await keys((await quote(product.id, sel(["m"]))).id), ["acc", "crm"]);
    // vitrine (antes da seleção): mostra todas, com a regra de ativação
    const det = await api(`/api/catalog2/products/${product.slug}`, { token: CO.token });
    assert.equal(det.json.connections.items.length, 3);
  });

  it("T06. gatilhos de TAREFA e ETAPA (cenário ativo), PRODUTO e todos os gatilhos (all_triggers)", async () => {
    const reqs: Req[] = [
      { key: "portarefa", type: "crm", deps: [{ task_key: "a" }], triggers: [{ kind: "task", ref_key: "extra" }] },
      { key: "poretapa", type: "automation_tool", deps: [{ task_key: "a" }], triggers: [{ kind: "step", ref_key: "a:b" }] },
      { key: "porproduto", type: "email_account", deps: [{ task_key: "a" }], triggers: [{ kind: "product" }] },
      { key: "todos", type: "hosting", deps: [{ task_key: "a" }], triggers: [{ kind: "option", ref_key: "g" }, { kind: "addon", ref_key: "liga" }], mode: "all_triggers" },
    ];
    const { product } = await mkConnProduct("Gatilhos variados", {
      tasks: [{ key: "a", steps: [{ key: "s1" }, { key: "b", conditional: true }] }, { key: "extra", conditional: true }],
      variations: [PLAT], addons: [{ key: "liga", name: "Liga", effects: { create: [{ effect_type: "add_task", effect_value: "extra" }, { effect_type: "add_step", effect_value: "a:b" }] } }],
    }, reqs);
    const run = async (s: Record<string, unknown>) => { const { projectId } = await checkoutAndPay(CO.token, [(await quote(product.id, s)).id]); return (await pcrsOf(projectId)).filter((p) => p.condition_active).map(keyOf).sort(); };
    assert.deepEqual(await run(sel(["g"])), ["porproduto"], "cenário base: só o gatilho de produto");
    assert.deepEqual(await run(sel(["m"], ["liga"])), ["poretapa", "porproduto", "portarefa"], "adicional liga tarefa e etapa condicionais");
    assert.deepEqual(await run(sel(["g"], ["liga"])), ["poretapa", "porproduto", "portarefa", "todos"], "all_triggers: opção E adicional");
  });

  it("T07. produto vinculado como gatilho (pelo ID real) e conexão sem gatilho continua manual", async () => {
    const { product: outro } = await mkProduct({ name: "Produto vinculado", tasks: [{ key: "x" }], publish: true });
    const reqs: Req[] = [
      { key: "comoutro", type: "crm", deps: [{ task_key: "a" }], triggers: [{ kind: "linked_product", ref_key: outro.id }] },
      { key: "manual", type: "hosting", deps: [{ task_key: "a" }], obligation: "conditional", extra: { condition_text: "Quando o time pedir." } },
    ];
    const { product } = await mkConnProduct("Com vínculo", { tasks: [{ key: "a" }] }, reqs);
    const so = await checkoutAndPay(CO.token, [(await quote(product.id)).id]);
    const p1 = await pcrsOf(so.projectId);
    assert.deepEqual(p1.map((p) => [keyOf(p), p.condition_active]), [["comoutro", false], ["manual", false]], "sem o outro produto no pedido e sem ativação manual");
    const junto = await checkoutAndPay(CO.token, [(await quote(product.id)).id, (await quote(outro.id)).id]);
    const p2 = await pcrsOf(junto.projectId);
    assert.equal(p2.find((p) => keyOf(p) === "comoutro")!.condition_active, true, "comprados juntos: ativa");
    assert.equal(p2.find((p) => keyOf(p) === "manual")!.condition_active, false, "sem gatilho: só a equipe ativa");
    // a equipe ativa manualmente a condicional (como sempre)
    const act = await cn(`/requirements/${p2.find((p) => keyOf(p) === "manual")!.id}/activate-condition`, ADMIN.token, "POST", {});
    assert.ok([200, 201].includes(act.status), JSON.stringify(act.json));
  });

  it("T08. o cadastro recusa gatilhos com referência inexistente (variação, opção, adicional, tarefa, etapa, pergunta, produto)", async () => {
    const { versionId } = await mkProduct({ name: "Validação de gatilhos", tasks: [{ key: "a" }], variations: [PLAT] });
    await adm(`/versions/${versionId}/connections-module`, "PUT", { requires_connections: true });
    const put = (triggers: unknown[]) => adm(`/versions/${versionId}/connection-requirements/by-key/k`, "PUT", { ...reqBody({ key: "k", type: "crm", deps: [{ task_key: "a" }] }), triggers, activation_mode: "any_trigger" });
    for (const [t, rx] of [
      [{ kind: "variation", ref_key: "fantasma" }, /variação/], [{ kind: "variation", ref_key: "plat", ref_value: "zzz" }, /opção/], [{ kind: "option", ref_key: "zzz" }, /opção/],
      [{ kind: "addon", ref_key: "zzz" }, /adicional/], [{ kind: "task", ref_key: "zzz" }, /tarefa/], [{ kind: "step", ref_key: "a:zzz" }, /etapa/],
      [{ kind: "questionnaire_answer", ref_key: "zzz" }, /pergunta/], [{ kind: "linked_product", ref_key: "id-que-nao-existe" }, /produto vinculado/], [{ kind: "inventado" }, /Tipo de gatilho/],
    ] as const) {
      const r = await put([t]);
      assert.equal(r.status, 422, `${JSON.stringify(t)} → ${JSON.stringify(r.json)}`);
      assert.match(r.json.error, rx);
    }
    const ok = await put([{ kind: "option", ref_key: "g" }]);
    assert.ok([200, 201].includes(ok.status), JSON.stringify(ok.json));
    assert.equal(ok.json.activation.mode, "any_trigger");
    assert.equal(ok.json.activation.triggers[0].ref_key, "g");
    // modo automático sem gatilho é incoerente
    const semGatilho = await adm(`/versions/${versionId}/connection-requirements/by-key/k`, "PUT", { ...reqBody({ key: "k", type: "crm", deps: [{ task_key: "a" }] }), triggers: [], activation_mode: "any_trigger" });
    assert.equal(semGatilho.status, 422);
  });

  it("T09. nova versão copia os gatilhos; a ausência da conexão permite salvar rascunho e informa claramente o que falta", async () => {
    const reqs: Req[] = [{ key: "gads", type: "google_ads", deps: [{ task_key: "ga" }], triggers: [{ kind: "option", ref_key: "g" }] }];
    const { product, versionId } = await mkConnProduct("Copia gatilhos", { tasks: [{ key: "ga" }, { key: "livre" }], variations: [PLAT] }, reqs);
    const nv = await adm(`/products/${product.id}/versions`, "POST");
    assert.equal(nv.status, 201, JSON.stringify(nv.json));
    const copy = await prisma.catalog2ConnectionRequirement.findFirstOrThrow({ where: { version_id: nv.json.version_id, key: "gads" }, include: { triggers: true } });
    assert.equal(copy.activation_mode, "any_trigger");
    assert.deepEqual(copy.triggers.map((t) => [t.kind, t.ref_key]), [["option", "g"]]);
    // rascunho: contratar sem a conexão é permitido e o aviso diz o que falta
    const { projectId } = await checkoutAndPay(CO.token, [(await quote(product.id, sel(["g"]))).id]);
    const t = byKey(await tasksOf(projectId));
    const why = (await cn(`/tasks/${t.ga.id}`, ADMIN.token)).json.connections[0];
    assert.equal(why.satisfied, false);
    assert.ok(typeof why.reason === "string" && why.reason.length > 10, "informa o que falta");
    assert.notEqual(t.livre.status, "PENDENTE_DE_LIBERACAO");
    void versionId;
  });
});
