import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { createProduct, newDraftVersion } from "../lib/catalog2-service";
import { ensureStandardStepModels } from "../lib/catalog2-access";
import { backfillCatalog2Models, ensureStepModelFromPackage, ensureTaskModelFromPackage } from "../lib/catalog2-models";
import { addAccessRequirements } from "../test-support/access-helpers";

// Catálogo global de modelos de tarefa ("Tarefa #ID") e de etapa ("Etapa #ID").

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const products: string[] = [];

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
async function mkMaster() {
  const id = `tm-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `TMProf ${id}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return u;
}
async function mkProduct(masterId: string, name: string) {
  const p = await createProduct({ internal_name: name }, masterId);
  products.push(p.id);
  const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
  return { product: p, versionId: v.id };
}

describe("Catálogo global de modelos de tarefa e etapa", () => {
  let token = "";
  let masterId = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const master = await mkMaster();
    masterId = master.id;
    token = tokenFor(master);
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of products) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("tarefa/etapa nova no produto ganha ID próprio, sequencial e distinto", async () => {
    const { versionId } = await mkProduct(masterId, "[TESTE] Modelos A");
    const t1 = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { key: "t1", name: "Tarefa Um" } });
    const t2 = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { key: "t2", name: "Tarefa Dois" } });
    assert.equal(t1.status, 201);
    assert.equal(t2.status, 201);
    assert.equal(typeof t1.json.task_model_id, "number");
    assert.ok(t2.json.task_model_id > t1.json.task_model_id, "IDs crescem");
    const s1 = await api(`/api/admin/catalog2/tasks/${t1.json.id}/steps`, { method: "POST", token, body: { key: "s1", name: "Etapa Um" } });
    const s2 = await api(`/api/admin/catalog2/tasks/${t1.json.id}/steps`, { method: "POST", token, body: { key: "s2", name: "Etapa Dois" } });
    assert.equal(s1.status, 201);
    assert.ok(s2.json.step_model_id > s1.json.step_model_id);

    const detail = await api(`/api/admin/catalog2/task-models/${t1.json.task_model_id}`, { token });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.name, "Tarefa Um");
    assert.equal(detail.json.is_active, true);
    assert.equal(detail.json.steps.length, 2, "etapas padrão do modelo vêm da tarefa");
    assert.equal(detail.json.used_by.length, 1);
  });

  it("busca por ID e por nome", async () => {
    const { versionId } = await mkProduct(masterId, "[TESTE] Modelos Busca");
    const t = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { key: "b", name: "Zebra Especial XYZ" } });
    const byId = await api(`/api/admin/catalog2/task-models?q=%23${t.json.task_model_id}`, { token });
    assert.ok(byId.json.data.some((m: { id: number }) => m.id === t.json.task_model_id));
    const byName = await api(`/api/admin/catalog2/task-models?q=Zebra%20Especial`, { token });
    assert.equal(byName.json.data.length, 1);
  });

  it("importar da biblioteca e criar nova versão mantêm o MESMO modelo (reuso sem perder a origem)", async () => {
    const a = await mkProduct(masterId, "[TESTE] Modelos Origem");
    const t = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { key: "orig", name: "Tarefa Reutilizável" } });
    const st = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { key: "e1", name: "Etapa Reutilizável" } });

    const b = await mkProduct(masterId, "[TESTE] Modelos Destino");
    const imp = await api(`/api/admin/catalog2/versions/${b.versionId}/tasks/import`, { method: "POST", token, body: { source_task_id: t.json.id } });
    assert.equal(imp.status, 201);
    const imported = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: imp.json.task_id }, include: { steps: true } });
    assert.equal(imported.task_model_id, t.json.task_model_id);
    assert.equal(imported.steps[0].step_model_id, st.json.step_model_id);

    // clone de versão (publica v1 direto no banco descartável, gera v2)
    await prisma.catalog2ProductVersion.update({ where: { id: a.versionId }, data: { state: "publicada", published_at: new Date() } });
    await prisma.catalog2Product.update({ where: { id: a.product.id }, data: { published_version_id: a.versionId } });
    await newDraftVersion(a.product.id, masterId);
    const v2 = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: a.product.id, version_number: 2 }, include: { tasks: { include: { steps: true } } } });
    assert.equal(v2.tasks[0].task_model_id, t.json.task_model_id);
    assert.equal(v2.tasks[0].steps[0].step_model_id, st.json.step_model_id);

    const detail = await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}`, { token });
    assert.equal(detail.json.used_by.length, 2, "usado por 2 produtos");
  });

  it("editar o modelo global sobe a revisão e NÃO altera a tarefa já cadastrada no produto", async () => {
    const { versionId } = await mkProduct(masterId, "[TESTE] Modelos Edição");
    const t = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { key: "ed", name: "Nome Original", estimated_minutes: 30 } });
    const put = await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}`, { method: "PUT", token, body: { name: "Nome Novo", estimated_minutes: 45 } });
    assert.equal(put.status, 200);
    assert.equal(put.json.revision, 2);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: t.json.id } });
    assert.equal(task.name, "Nome Original");
    assert.equal(task.estimated_minutes, 30);
    assert.equal(task.task_model_revision, 1, "guarda a revisão usada");
  });

  it("modelo não é apagado (só inativado); inativo some da lista padrão", async () => {
    const { versionId } = await mkProduct(masterId, "[TESTE] Modelos Inativar");
    const t = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { key: "in", name: "Tarefa Para Inativar" } });
    await assert.rejects(() => prisma.catalog2TaskModel.delete({ where: { id: t.json.task_model_id } }), "FK Restrict impede apagar modelo em uso");
    const off = await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}/active`, { method: "PATCH", token, body: { is_active: false } });
    assert.equal(off.json.is_active, false);
    const active = await api(`/api/admin/catalog2/task-models?q=Tarefa%20Para%20Inativar`, { token });
    assert.equal(active.json.data.length, 0);
    const all = await api(`/api/admin/catalog2/task-models?q=Tarefa%20Para%20Inativar&status=all`, { token });
    assert.equal(all.json.data.length, 1);
    // a tarefa do produto continua íntegra
    assert.ok(await prisma.catalog2Task.findUnique({ where: { id: t.json.id } }));
  });

  it("usuário comum não acessa o catálogo de modelos", async () => {
    const id = `tm-plain-${crypto.randomBytes(4).toString("hex")}`;
    const u = await prisma.user.create({
      data: { id, email: `${id}@example.test`, password_hash: "x", name: id, role: "company_user", account_type: "empresas", is_active: true, status: "ativo" },
    });
    users.push(u.id);
    assert.equal((await api("/api/admin/catalog2/task-models", { token: tokenFor(u) })).status, 404);
    assert.equal((await api("/api/admin/catalog2/task-models")).status, 401);
  });

  it("selecionar modelo existente: cria vinculado, com etapas padrão e key automática; modelo inativo é recusado", async () => {
    const a = await mkProduct(masterId, "[TESTE] Modelos Fonte");
    const t = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa do Catálogo", estimated_minutes: 30, requires_qualification: true } });
    assert.equal(t.status, 201, "key não é mais obrigatória");
    assert.match(t.json.key, /^tarefa-\d+/);
    assert.equal(t.json.requires_qualification, true);
    await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { name: "Etapa do Catálogo", purpose: "validacao", completion_criteria: "Tudo conferido" } });

    const b = await mkProduct(masterId, "[TESTE] Modelos Uso");
    const use = await api(`/api/admin/catalog2/versions/${b.versionId}/tasks/from-model`, { method: "POST", token, body: { model_id: t.json.task_model_id } });
    assert.equal(use.status, 201);
    const row = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: use.json.id }, include: { steps: true } });
    assert.equal(row.task_model_id, t.json.task_model_id);
    assert.equal(row.requires_qualification, true);
    assert.equal(row.steps.length, 1, "etapas padrão do modelo");
    assert.equal(row.steps[0].step_model_id !== null, true);

    const detail = await api(`/api/admin/catalog2/products/${b.product.id}`, { token });
    const dt = detail.json.versions[0].tasks[0];
    assert.equal(dt.model.customized, false);
    assert.equal(dt.model.outdated, false);
    assert.equal(dt.steps[0].purpose, "validacao", "efetivo vem do modelo");
    assert.equal(dt.steps[0].completion_criteria, "Tudo conferido");

    await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}/active`, { method: "PATCH", token, body: { is_active: false } });
    const c = await mkProduct(masterId, "[TESTE] Modelos Inativo");
    const off = await api(`/api/admin/catalog2/versions/${c.versionId}/tasks/from-model`, { method: "POST", token, body: { model_id: t.json.task_model_id } });
    assert.equal(off.status, 422);
    assert.equal(off.json.code, "model_inactive");
  });

  it("etapa a partir de modelo existente", async () => {
    const a = await mkProduct(masterId, "[TESTE] Etapa Fonte");
    const t = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { name: "T" } });
    const s = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { name: "Etapa Reaproveitável", estimated_minutes: 15 } });
    const b = await mkProduct(masterId, "[TESTE] Etapa Uso");
    const t2 = await api(`/api/admin/catalog2/versions/${b.versionId}/tasks`, { method: "POST", token, body: { name: "T2" } });
    const use = await api(`/api/admin/catalog2/tasks/${t2.json.id}/steps/from-model`, { method: "POST", token, body: { step_model_id: s.json.step_model_id } });
    assert.equal(use.status, 201);
    assert.equal(use.json.step_model_id, s.json.step_model_id);
    assert.equal(use.json.name, "Etapa Reaproveitável");
  });

  it("editar 'somente neste produto' não muda o modelo; 'modelo global' sobe a revisão e marca os outros usos como desatualizados; sincronizar traz o modelo", async () => {
    const a = await mkProduct(masterId, "[TESTE] Escopo A");
    const t = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa Escopo", estimated_minutes: 10 } });
    const b = await mkProduct(masterId, "[TESTE] Escopo B");
    const tb = await api(`/api/admin/catalog2/versions/${b.versionId}/tasks/from-model`, { method: "POST", token, body: { model_id: t.json.task_model_id } });

    // só neste produto (padrão)
    await api(`/api/admin/catalog2/tasks/${t.json.id}`, { method: "PUT", token, body: { estimated_minutes: 99 } });
    let model = await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: t.json.task_model_id } });
    assert.equal(model.estimated_minutes, 10);
    assert.equal(model.revision, 1);
    let da = (await api(`/api/admin/catalog2/products/${a.product.id}`, { token })).json.versions[0].tasks[0];
    assert.equal(da.model.customized, true, "configuração específica deste produto");

    // modelo global
    const up = await api(`/api/admin/catalog2/tasks/${t.json.id}`, { method: "PUT", token, body: { estimated_minutes: 50, scope: "model", confirm_model_update: true } });
    assert.equal(up.status, 200);
    model = await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: t.json.task_model_id } });
    assert.equal(model.estimated_minutes, 50);
    assert.equal(model.revision, 2);
    da = (await api(`/api/admin/catalog2/products/${a.product.id}`, { token })).json.versions[0].tasks[0];
    assert.equal(da.model.customized, false);
    assert.equal(da.model.outdated, false);
    const db = (await api(`/api/admin/catalog2/products/${b.product.id}`, { token })).json.versions[0].tasks[0];
    assert.equal(db.estimated_minutes, 10, "o outro produto NÃO muda sozinho");
    assert.equal(db.model.outdated, true);

    const sync = await api(`/api/admin/catalog2/tasks/${tb.json.id}/sync-model`, { method: "POST", token });
    assert.equal(sync.status, 200);
    const tbRow = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: tb.json.id } });
    assert.equal(tbRow.estimated_minutes, 50);
    assert.equal(tbRow.task_model_revision, 2);
  });

  it("acessos do produto (cadastro único): a rota antiga saiu; a nova versão herda as exigências de conexão", async () => {
    const a = await mkProduct(masterId, "[TESTE] Acessos");
    const old = await api(`/api/admin/catalog2/versions/${a.versionId}/access-requirements`, { method: "PUT", token, body: { items: [{ access_type: "google_ads" }] } });
    assert.equal(old.status, 404, "a lista antiga de acessos não existe mais");
    await addAccessRequirements(a.versionId, [{ type: "google_ads", label: "Google Ads" }, { type: "meta_business_manager", label: "Meta Business Manager", required: false }]);
    await prisma.catalog2ProductVersion.update({ where: { id: a.versionId }, data: { state: "publicada", published_at: new Date() } });
    await prisma.catalog2Product.update({ where: { id: a.product.id }, data: { published_version_id: a.versionId } });
    await newDraftVersion(a.product.id, masterId);
    const detail = (await api(`/api/admin/catalog2/products/${a.product.id}`, { token })).json.versions[0];
    assert.equal(detail.version_number, 2);
    assert.deepEqual(detail.connection_requirements.map((x: { label: string }) => x.label), ["Google Ads", "Meta Business Manager"], "a nova versão herda os acessos");
  });

  it("etapa padrão de acessos: falta no ambiente → 404; existindo entra no INÍCIO da tarefa e não duplica", async () => {
    const a = await mkProduct(masterId, "[TESTE] Etapa Acessos");
    const t = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa com acessos" } });
    await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { name: "Depois dos acessos" } });

    await prisma.catalog2StepModel.updateMany({ where: { is_access_validation: true }, data: { is_access_validation: false } });
    const missing = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps/access-validation`, { method: "POST", token });
    assert.equal(missing.status, 404);
    assert.equal(missing.json.code, "standard_step_missing");

    const model = await ensureStandardStepModels(prisma);
    assert.equal(model.is_access_validation, true);
    assert.equal(model.purpose, "coleta_informacao");
    assert.equal(model.execution_mode, "hibrido");
    assert.doesNotMatch(model.description ?? "", /informe (a|sua) senha/i);
    assert.match(model.description ?? "", /Nunca solicitar/);

    const add = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps/access-validation`, { method: "POST", token });
    assert.equal(add.status, 201);
    const steps = await prisma.catalog2TaskStep.findMany({ where: { task_id: t.json.id }, orderBy: { sort_order: "asc" } });
    assert.equal(steps.length, 2);
    assert.equal(steps[0].step_model_id, model.id, "vai para o início");
    const again = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps/access-validation`, { method: "POST", token });
    assert.equal(again.status, 409);
  });

  it("numeração de cadastros antigos: vincula sem alterar a tarefa e é idempotente", async () => {
    const { versionId } = await mkProduct(masterId, "[TESTE] Modelos Backfill");
    const legacyTask = await prisma.catalog2Task.create({ data: { version_id: versionId, key: "old", name: "Tarefa Antiga", estimated_minutes: 20 } });
    await prisma.catalog2TaskStep.create({ data: { task_id: legacyTask.id, key: "old-s", name: "Etapa Antiga" } });
    const before = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: legacyTask.id } });
    assert.equal(before.task_model_id, null);

    const r1 = await backfillCatalog2Models(prisma);
    assert.ok(r1.tasksLinked >= 1);
    const after = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: legacyTask.id } });
    assert.equal(typeof after.task_model_id, "number");
    assert.equal(after.name, before.name);
    assert.equal(after.updated_at.getTime(), before.updated_at.getTime(), "updated_at preservado");

    const r2 = await backfillCatalog2Models(prisma);
    assert.equal(r2.tasksLinked, 0);
    assert.equal(r2.taskModelsCreated, 0);
    assert.equal(r2.stepModelsCreated, 0);
  });

  it("envio entre ambientes: modelo criado com o MESMO ID; ID já usado com outro nome não é sobrescrito", async () => {
    const wantedId = 900000 + Math.floor(Math.random() * 90000);
    const pkg = {
      id: wantedId, name: "Tarefa do Pacote", description: null, execution_mode: "humano", estimated_minutes: 10,
      is_conditional: false, requires_client_approval: false, revision: 3, specialty: null,
    };
    const warns: string[] = [];
    const a = await prisma.$transaction((tx) => ensureTaskModelFromPackage(tx, pkg, null, (m) => warns.push(m)));
    assert.equal(a?.id, wantedId);
    assert.equal(a?.revision, 3);
    const again = await prisma.$transaction((tx) => ensureTaskModelFromPackage(tx, pkg, null, (m) => warns.push(m)));
    assert.equal(again?.id, wantedId, "idempotente");
    assert.equal(warns.length, 0);

    const clash = await prisma.$transaction((tx) => ensureTaskModelFromPackage(tx, { ...pkg, name: "Outro Nome Completamente" }, null, (m) => warns.push(m)));
    assert.notEqual(clash?.id, wantedId);
    assert.equal(warns.length, 1);
    assert.equal((await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: wantedId } })).name, "Tarefa do Pacote", "não sobrescreve");

    const stepId = wantedId;
    const s = await prisma.$transaction((tx) =>
      ensureStepModelFromPackage(tx, { id: stepId, name: "Etapa do Pacote", description: null, completion_criteria: "ok", purpose: "validacao", execution_mode: "humano", estimated_minutes: 5, revision: 1, specialty: null }, () => {}),
    );
    assert.equal(s?.id, stepId);
  });
});
