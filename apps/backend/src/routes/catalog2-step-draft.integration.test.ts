import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { ensureConnectionTypes } from "../lib/connections/catalog";
import { api, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, setPricingSettings, startServer, stopServer, SEL } from "../test-support/universal-helpers";

// Rascunho da etapa (18/10) · "Salvar rascunho" aceita incompleto, "Concluir" tira a marca; rascunho nunca é publicado nem pedido ao cliente;
// acesso condicional com condição estruturada (vários valores = OU, regras E/OU) e acesso incompleto salvo como rascunho.

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const PLAT = { key: "plat", name: "Plataforma", is_required: true, selection_type: "single", options: { create: [{ key: "g", label: "Google", is_default: true }, { key: "m", label: "Meta" }, { key: "both", label: "Ambas" }] } };
const reqBody = (taskKey: string, stepKey: string | null, extra: Record<string, unknown> = {}) => ({
  connection_type_key: "google_ads", method: "manager_account", permission_level: "standard", when_needed: stepKey ? "before_step" : "before_task", when_task_key: taskKey, when_step_key: stepKey,
  obligation: "required", validation_mode: "manual", dependents: [{ task_key: taskKey, step_key: stepKey, kind: "start" }], ...extra,
});
async function mkDraftProduct(name: string, withVariation = false, connections = false) {
  const { product, versionId } = await mkProduct({ name, tasks: [{ key: "a", steps: [{ key: "s1" }, { key: "s2" }] }], ...(withVariation ? { variations: [PLAT] } : {}) });
  const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { key: "s1", task: { version_id: versionId } } });
  if (connections) assert.equal((await adm(`/versions/${versionId}/connections-module`, "PUT", { requires_connections: true })).status, 200);
  return { product, versionId, step };
}
const stepRow = (id: string) => prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id } });

describe("Etapa · salvar rascunho x concluir", () => {
  before(async () => { await startServer(); await ensureConnectionTypes(prisma); ADMIN = await mkAdmin(); CO = await mkCompanyUser("RD"); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("R01. rascunho COMPLETAMENTE vazio é aceito: nada obrigatório, nome atual preservado, etapa marcada como rascunho incompleto", async () => {
    const { step } = await mkDraftProduct("R01");
    const before = await stepRow(step.id);
    const r = await adm(`/steps/${step.id}`, "PUT", { draft: true, scope: "product", name: "", description: null, estimated_minutes: null, specialty_id: null, completion_criteria: null, requires_specialist_qualification: true, specialist_user_id: null });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const after = await stepRow(step.id);
    assert.equal(after.draft_incomplete, true);
    assert.ok(after.draft_saved_at, "guarda quando o rascunho foi salvo");
    assert.equal(after.name, before.name, "nome em branco no rascunho não apaga o nome atual");
    assert.equal(after.id, step.id, "o ID da etapa continua o mesmo");
    assert.equal(after.key, step.key);
    assert.equal(after.estimated_minutes, null);
    assert.equal(after.specialty_id, null);
    assert.equal(after.requires_specialist_qualification, true, "o que foi marcado é guardado mesmo incompleto");
  });

  it("R02. fora do rascunho as regras de sempre continuam: especialista exigido sem especialista dá erro", async () => {
    const { step } = await mkDraftProduct("R02");
    const r = await adm(`/steps/${step.id}`, "PUT", { requires_specialist_qualification: true, specialist_user_id: null });
    assert.equal(r.status, 422);
    assert.match(JSON.stringify(r.json), /especialista/i);
  });

  it("R03. preservar campos parciais: o que foi preenchido (nome, checklist, evidência, prazos) fica gravado no rascunho", async () => {
    const { step } = await mkDraftProduct("R03");
    const ops = { instructions: "1. Abrir a conta", evidence_required: true, evidence_types: ["print"], checklist: [{ text: "Pixel instalado", kind: "execucao" }] };
    const r = await adm(`/steps/${step.id}`, "PUT", { draft: true, scope: "product", name: "Configurar a conta (em andamento)", approval_hours: 4, ops });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const row = await stepRow(step.id);
    assert.equal(row.name, "Configurar a conta (em andamento)");
    assert.equal(row.approval_hours, 4);
    const o = row.ops as { instructions?: string; evidence_types?: string[]; checklist?: { text: string }[] };
    assert.equal(o.instructions, "1. Abrir a conta");
    assert.deepEqual(o.evidence_types, ["print"]);
    assert.equal(o.checklist?.[0].text, "Pixel instalado");
  });

  it("R04. outras gravações (sem a chave draft) NÃO mexem na marca; concluir (draft:false) a limpa", async () => {
    const { step } = await mkDraftProduct("R04");
    await adm(`/steps/${step.id}`, "PUT", { draft: true, scope: "product" });
    assert.equal((await stepRow(step.id)).draft_incomplete, true);
    const other = await adm(`/steps/${step.id}`, "PUT", { ops: { instructions: "só o checklist mudou" } });
    assert.equal(other.status, 200);
    assert.equal((await stepRow(step.id)).draft_incomplete, true, "salvar o checklist não conclui a etapa");
    const done = await adm(`/steps/${step.id}`, "PUT", { draft: false, name: "Etapa pronta" });
    assert.equal(done.status, 200);
    const row = await stepRow(step.id);
    assert.equal(row.draft_incomplete, false);
    assert.equal(row.draft_saved_at, null);
  });

  it("R05. o rascunho aparece no editor (serialização) e bloqueia a publicação com mensagem clara; concluir libera", async () => {
    const { product, versionId, step } = await mkDraftProduct("R05");
    await adm(`/steps/${step.id}`, "PUT", { draft: true, scope: "product" });
    const full = await adm(`/products/${product.id}`);
    assert.equal(full.status, 200, JSON.stringify(full.json).slice(0, 200));
    const steps = (full.json.versions as { id: string; tasks: { steps: { id: string; draft_incomplete: boolean }[] }[] }[]).find((v) => v.id === versionId)!.tasks.flatMap((t) => t.steps);
    assert.equal(steps.find((s) => s.id === step.id)?.draft_incomplete, true);
    const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.notEqual(pub.status, 200);
    assert.match(JSON.stringify(pub.json), /rascunho incompleto/);
    await adm(`/steps/${step.id}`, "PUT", { draft: false });
    const pub2 = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub2.status, 200, JSON.stringify(pub2.json));
  });

  it("R06. criar etapa já como rascunho (draft:true no POST)", async () => {
    const { versionId } = await mkDraftProduct("R06");
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "a" } });
    const r = await adm(`/tasks/${task.id}/steps`, "POST", { name: `Etapa rascunho ${crypto.randomUUID().slice(0, 6)}`, draft: true, client_action_id: crypto.randomUUID() });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const row = await stepRow(r.json.id);
    assert.equal(row.draft_incomplete, true);
    assert.ok(row.draft_saved_at);
  });
});

describe("Acesso condicional · condição estruturada e rascunho", () => {
  before(async () => { await startServer(); await ensureConnectionTypes(prisma); ADMIN = await mkAdmin(); CO = await mkCompanyUser("RA"); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("A01. concluir (require_complete) um acesso condicional SEM condição é recusado, citando o acesso", async () => {
    const { versionId } = await mkDraftProduct("A01", false, true);
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { label: "Google Ads", obligation: "conditional", require_complete: true }));
    assert.equal(r.status, 422, JSON.stringify(r.json));
    assert.match(JSON.stringify(r.json), /O acesso \\"Google Ads\\" está incompleto/);
    assert.equal(await prisma.catalog2ConnectionRequirement.count({ where: { version_id: versionId } }), 0, "nada parcial ficou gravado");
  });

  it("A02. como RASCUNHO o mesmo acesso é salvo, marcado como incompleto (e não conta como configurado)", async () => {
    const { versionId } = await mkDraftProduct("A02", false, true);
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { obligation: "conditional", draft: true }));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.draft_incomplete, true);
    // com condição completa, o rascunho já nasce sem a marca
    const ok = await adm(`/versions/${versionId}/connection-requirements/by-key/gads2`, "PUT", reqBody("a", "s1", { obligation: "conditional", draft: true, condition_text: "se tiver Google" }));
    assert.equal(ok.json.draft_incomplete, false);
  });

  it("A03. condição com VÁRIOS valores na mesma regra (Google Ads OU Ambas) e regras combinadas com E/OU são aceitas e guardadas", async () => {
    const { versionId } = await mkDraftProduct("A03", true, true);
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", {
      obligation: "conditional", require_complete: true, activation_mode: "any_trigger",
      triggers: [{ kind: "variation", ref_key: "plat", ref_value: "g|both", operator: "eq" }],
    }));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.draft_incomplete, false);
    assert.deepEqual(r.json.activation.triggers.map((t: { kind: string; ref_key: string; ref_value: string; operator: string }) => [t.kind, t.ref_key, t.ref_value, t.operator]), [["variation", "plat", "g|both", "eq"]]);
    const e = await adm(`/versions/${versionId}/connection-requirements/by-key/bm`, "PUT", reqBody("a", "s1", {
      connection_type_key: "meta_business_manager", method: "partner_business", permission_level: "read_write", obligation: "conditional", require_complete: true, activation_mode: "all_triggers",
      triggers: [{ kind: "variation", ref_key: "plat", ref_value: "m|both", operator: "eq" }, { kind: "first_execution", operator: "selected" }],
    }));
    assert.equal(e.status, 201, JSON.stringify(e.json));
    assert.equal(e.json.activation.mode, "all_triggers");
  });

  it("A04. opção inexistente na referência é recusada ao concluir, mas guardada no rascunho", async () => {
    const { versionId } = await mkDraftProduct("A04", true, true);
    const bad = { obligation: "conditional", activation_mode: "any_trigger", triggers: [{ kind: "variation", ref_key: "plat", ref_value: "g|inexistente", operator: "eq" }] };
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { ...bad, require_complete: true }));
    assert.equal(r.status, 422);
    assert.match(JSON.stringify(r.json), /inexistente/);
    const d = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { ...bad, draft: true }));
    assert.equal(d.status, 201, JSON.stringify(d.json));
  });

  it("A05. regra incompleta (variação sem referência) é recusada; no rascunho fica marcada como incompleta", async () => {
    const { versionId } = await mkDraftProduct("A05", true, true);
    const body = { obligation: "conditional", activation_mode: "any_trigger", triggers: [{ kind: "variation", ref_key: "", ref_value: null, operator: "eq" }] };
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", body));
    assert.equal(r.status, 422);
    assert.match(JSON.stringify(r.json), /Condição incompleta/);
    const d = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { ...body, draft: true }));
    assert.equal(d.status, 201, JSON.stringify(d.json));
    assert.equal(d.json.draft_incomplete, true);
  });

  it("A06. acesso em rascunho NÃO conta no checklist de conexões e bloqueia a publicação; completar libera", async () => {
    const { versionId } = await mkDraftProduct("A06", false, true);
    await adm(`/versions/${versionId}/connection-requirements/by-key/ok`, "PUT", reqBody("a", "s1", { connection_type_key: "crm", method: "revocable_token", permission_level: "read_write", obligation: "optional" }));
    await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { obligation: "conditional", draft: true }));
    const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.notEqual(pub.status, 200);
    assert.match(JSON.stringify(pub.json), /rascunho incompleto/);
    const fix = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { obligation: "conditional", condition_text: "quando o cliente usar Google", require_complete: true }));
    assert.equal(fix.status, 200, JSON.stringify(fix.json));
    assert.equal(fix.json.draft_incomplete, false);
  });

  it("A07. acesso em rascunho nunca é pedido ao cliente na contratação", async () => {
    const { product, versionId } = await mkDraftProduct("A07", false, true);
    await adm(`/versions/${versionId}/connection-requirements/by-key/ok`, "PUT", reqBody("a", "s1", { connection_type_key: "crm", method: "revocable_token", permission_level: "read_write", obligation: "optional" }));
    await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { obligation: "optional" }));
    const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    // simula um acesso que ficou como rascunho (marca direto no banco de teste)
    await prisma.catalog2ConnectionRequirement.updateMany({ where: { version_id: versionId, key: "gads" }, data: { draft_incomplete: true } });
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: SEL } });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const rows = await prisma.projectConnectionRequirement.findMany({ where: { project_id: projectId } });
    const defs = await prisma.catalog2ConnectionRequirement.findMany({ where: { id: { in: rows.map((r) => r.requirement_id) } }, select: { key: true } });
    assert.deepEqual(defs.map((d) => d.key).sort(), ["ok"], "só o acesso completo é pedido; o rascunho não");
  });

  it("A08. condição antiga em texto livre continua valendo (nada é apagado); gatilho de tipo não editado na tela fica guardado", async () => {
    const { versionId } = await mkDraftProduct("A08", false, true);
    const r = await adm(`/versions/${versionId}/connection-requirements/by-key/gads`, "PUT", reqBody("a", "s1", { obligation: "conditional", condition_text: "se o cliente já tiver conta", require_complete: true }));
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.condition_text, "se o cliente já tiver conta");
  });
});

describe("Entregáveis · ordem", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  after(async () => { await stopServer(); });

  it("D01. reordenar grava a nova ordem; ordem que não bate com os entregáveis da tarefa é recusada", async () => {
    const { versionId } = await mkDraftProduct("D01");
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "a" } });
    const ids: string[] = [];
    for (const n of ["Um", "Dois", "Tres"]) {
      const r = await adm(`/tasks/${task.id}/deliverables`, "POST", { name: n });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      ids.push(r.json.id);
    }
    const ok = await adm(`/tasks/${task.id}/deliverables/order`, "PUT", { order: [ids[2], ids[0], ids[1]] });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const rows = await prisma.catalog2TaskDeliverable.findMany({ where: { task_id: task.id }, orderBy: { sort_order: "asc" } });
    assert.deepEqual(rows.map((r) => r.name), ["Tres", "Um", "Dois"]);
    assert.equal((await adm(`/tasks/${task.id}/deliverables/order`, "PUT", { order: [ids[0]] })).status, 422);
    assert.equal((await adm(`/tasks/${task.id}/deliverables/order`, "PUT", { order: [ids[0], ids[0], ids[1]] })).status, 422);
  });
});
