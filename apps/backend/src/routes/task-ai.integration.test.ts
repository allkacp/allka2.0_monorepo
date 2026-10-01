import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { setTaskAIAdapter, resetTaskAIAdapter, canRunAI, type TaskAIAdapter } from "../lib/task-ai";
import { validateVersionForPublish, createProduct } from "../lib/catalog2-service";

// Pedido 3 · Fase 5 — IA nas tarefas: perfis autorizados, três modos, registro completo, saída rastreável,
// encaminhamento ao humano e nenhuma ação sem confirmação. Modelo SIMULADO (nunca chama o Gemini real).

let baseUrl = "";
let server: import("node:http").Server;
const cleanup: (() => Promise<void>)[] = [];
const userIds: string[] = [];
const adminProfiles: string[] = [];
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
  const id = `ai-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}
async function mkMaster() {
  const p = await prisma.adminProfile.create({ data: { name: `AiProf ${uid()}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  return mkUser("admin", "admin", { admin_profile_id: p.id });
}

const okAdapter: TaskAIAdapter = async ({ prompt }) => ({ text: `Texto gerado. (${prompt.length} caracteres de contexto)`, missing_information: [], promptTokens: 2000, completionTokens: 500 });

async function mkProfile(extra: Record<string, unknown> = {}) {
  const p = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] Perfil ${uid()}`, unit_cost_input_per_1k: 0.002, unit_cost_output_per_1k: 0.01, fixed_cost_per_run: 0.05, allowed_actors: "leader", base_instructions: "Você é redator de teste.", ...extra } });
  cleanup.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: p.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: p.id } }).catch(() => {}); });
  return p;
}

async function mkCatalog(opts: { execution_mode?: string; steps?: number; ai?: { profile_id: string | null; ai_mode: string; instructions?: string; human_review_required?: boolean } | null }) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `ai-${code}`, internal_name: `[TESTE] IA ${code}`, status: "disponivel" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T", implementation_blocks_operation: false } });
  const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "t1", name: "Redigir texto", sort_order: 1, cycle_type: "recorrente", execution_mode: opts.execution_mode ?? "ia" } });
  for (let i = 1; i <= (opts.steps ?? 1); i++) await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: `e${i}`, name: `Etapa ${i}`, sort_order: i } });
  if (opts.ai) await prisma.catalog2TaskAI.create({ data: { task_id: ct.id, profile_id: opts.ai.profile_id, ai_mode: opts.ai.ai_mode, instructions: opts.ai.instructions ?? "Escreva um texto curto.", human_review_required: opts.ai.human_review_required ?? true } });
  cleanup.push(async () => {
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { prod, ver, task: ct };
}
async function contract(companyId: string, c: Awaited<ReturnType<typeof mkCatalog>>) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto IA ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: c.prod.id, catalog2_version_id: c.ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
  cleanup.push(async () => {
    await prisma.projectTaskAIRun.deleteMany({ where: { project_task: { project_id: project.id } } }).catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { entity_type: "project_task", entity_id: { in: (await prisma.projectTask.findMany({ where: { project_id: project.id }, select: { id: true } })).map((t) => t.id) } } }).catch(() => {});
    await prisma.projectDependencyRule.deleteMany({ where: { project_id: project.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  });
  const task = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id }, include: { stages: { orderBy: { ordem: "asc" } } } });
  return { project, task };
}

describe("Pedido 3 · Fase 5 — IA nas tarefas", () => {
  let master: Awaited<ReturnType<typeof mkUser>>;
  let token = "";
  let companyId = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    setTaskAIAdapter(okAdapter, "simulado");
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    master = await mkMaster();
    token = tokenFor(master);
    companyId = (await prisma.company.create({ data: { name: `Empresa IA ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.company.delete({ where: { id: companyId } }).catch(() => {}); });
  });
  after(async () => {
    resetTaskAIAdapter();
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("cadastro: perfil autorizado, modo, instruções e versão do prompt; tarefa de IA sem perfil ativo não publica", async () => {
    const created = await api("/api/admin/catalog2/ai-profiles", { method: "POST", token, body: { name: `[TESTE] Perfil API ${uid()}`, unit_cost_input_per_1k: 0.001, unit_cost_output_per_1k: 0.004, allowed_actors: ["leader", "executor"] } });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    cleanup.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: created.json.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: created.json.id } }).catch(() => {}); });
    assert.equal(created.json.allowed_actors, "leader,executor");
    assert.equal((await api("/api/admin/catalog2/ai-profiles", { token })).json.data.some((p: any) => p.id === created.json.id), true);

    const p = await createProduct({ internal_name: `[TESTE] IA cadastro ${uid()}` }, master.id);
    cleanup.push(async () => { await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: null } }).catch(() => {}); await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: p.id } }); await prisma.catalog2Product.delete({ where: { id: p.id } }).catch(() => {}); });
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const t = (await api(`/api/admin/catalog2/versions/${v.id}/tasks`, { method: "POST", token, body: { name: "Texto por IA", execution_mode: "ia" } })).json;
    await api(`/api/admin/catalog2/tasks/${t.id}/steps`, { method: "POST", token, body: { name: "E1" } });

    let issues = (await validateVersionForPublish(v.id)).issues;
    assert.ok(issues.some((i) => i.includes("usa IA e precisa de um perfil de IA ativo")), "sem perfil: " + JSON.stringify(issues));
    assert.equal((await api(`/api/admin/catalog2/tasks/${t.id}/ai`, { method: "PUT", token, body: { profile_id: "nao-existe", ai_mode: "rascunho" } })).status, 422);
    assert.equal((await api(`/api/admin/catalog2/tasks/${t.id}/ai`, { method: "PUT", token, body: { profile_id: created.json.id, ai_mode: "voa" } })).status, 400);
    const a1 = await api(`/api/admin/catalog2/tasks/${t.id}/ai`, { method: "PUT", token, body: { profile_id: created.json.id, ai_mode: "rascunho", instructions: "Versão 1 do prompt" } });
    assert.equal(a1.status, 200, JSON.stringify(a1.json));
    assert.equal(a1.json.prompt_version, 1);
    const a2 = await api(`/api/admin/catalog2/tasks/${t.id}/ai`, { method: "PUT", token, body: { instructions: "Versão 2 do prompt" } });
    assert.equal(a2.json.prompt_version, 2, "mudou o texto, subiu a versão");
    const a3 = await api(`/api/admin/catalog2/tasks/${t.id}/ai`, { method: "PUT", token, body: { ai_mode: "auxilia" } });
    assert.equal(a3.json.prompt_version, 2, "mudar só o modo não sobe a versão");
    issues = (await validateVersionForPublish(v.id)).issues;
    assert.ok(!issues.some((i) => i.includes("usa IA")), "com perfil ativo a pendência some");
    await prisma.catalog2AIProfile.update({ where: { id: created.json.id }, data: { is_active: false } });
    issues = (await validateVersionForPublish(v.id)).issues;
    assert.ok(issues.some((i) => i.includes("usa IA")), "perfil desativado volta a bloquear");
    // clonar a versão leva modo, instruções, perfil e versão do prompt
    await prisma.catalog2ProductVersion.update({ where: { id: v.id }, data: { state: "publicada", published_at: new Date() } });
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: v.id } });
    assert.equal((await api(`/api/admin/catalog2/products/${p.id}/versions`, { method: "POST", token })).status, 201);
    const cloneTask = await prisma.catalog2Task.findFirstOrThrow({ where: { version: { product_id: p.id, state: "rascunho" } }, include: { ai: true } });
    assert.equal(cloneTask.ai?.ai_mode, "auxilia");
    assert.equal(cloneTask.ai?.prompt_version, 2);
    assert.equal(cloneTask.ai?.instructions, "Versão 2 do prompt");
    assert.equal(cloneTask.ai?.profile_id, created.json.id);
  });

  it("rascunho: só perfil autorizado aciona; nada vira entregável até um humano adotar (com edição); tudo fica registrado", async () => {
    const prof = await mkProfile();
    const c = await mkCatalog({ ai: { profile_id: prof.id, ai_mode: "rascunho", instructions: "Escreva o post." } });
    const k = await contract(companyId, c);
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id } });

    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token: tokenFor(client), body: {} })).status, 403, "cliente não aciona IA");
    const cfg = await api(`/api/project-tasks/${k.task.id}/ai`, { token: tokenFor(leader) });
    assert.equal(cfg.json.config.mode, "rascunho");
    assert.equal(cfg.json.config.can_run, true);

    const run = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token: tokenFor(leader), body: { inputs: { tom: "descontraído", acesso: "senha: abc12345" }, note: "Foque na promoção." } });
    assert.equal(run.status, 201, JSON.stringify(run.json));
    assert.equal(run.json.status, "gerada");
    assert.equal(run.json.forwarded, false);
    // custo = 2000/1000*0.002 + 500/1000*0.01 + 0.05 = 0.059
    assert.equal(run.json.cost, 0.059);
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: k.task.id } }), 0, "rascunho não cria entregável sozinho");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: k.task.id } })).status === "CONCLUIDA", false);

    const log = (await api(`/api/project-tasks/${k.task.id}/ai`, { token: tokenFor(leader) })).json.runs[0];
    assert.equal(log.prompt_version, 1);
    assert.equal(log.adapter, "simulado");
    assert.equal(log.profile_name, prof.name);
    assert.ok(log.instructions.includes("Escreva o post.") && log.instructions.includes("redator de teste"), "instruções (perfil + tarefa) registradas");
    assert.ok(log.context_text.includes("Redigir texto"), "contexto registrado");
    assert.equal(log.inputs.tom, "descontraído");
    assert.ok(!JSON.stringify(log.inputs).includes("abc12345"), "senha nas entradas é redigida");
    assert.equal(log.prompt_tokens, 2000);
    assert.equal(log.completion_tokens, 500);
    assert.ok(log.created_at);

    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/runs/${run.json.run_id}/adopt`, { method: "POST", token: tokenFor(client), body: {} })).status, 403);
    const adopt = await api(`/api/project-tasks/${k.task.id}/ai/runs/${run.json.run_id}/adopt`, { method: "POST", token: tokenFor(leader), body: { text: "Texto revisado por mim.", note: "Ajustei o tom." } });
    assert.equal(adopt.status, 200, JSON.stringify(adopt.json));
    const d = await prisma.projectTaskDeliverable.findUniqueOrThrow({ where: { id: adopt.json.deliverable_id } });
    assert.equal(d.source, "ia");
    assert.equal(d.ai_run_id, run.json.run_id, "a saída aponta para a execução que a originou");
    assert.equal(d.content_text, "Texto revisado por mim.");
    assert.equal(d.status, "enviado");
    const after = await prisma.projectTaskAIRun.findUniqueOrThrow({ where: { id: run.json.run_id } });
    assert.equal(after.status, "adotada");
    assert.equal(after.decided_by_user_id, leader.id);
    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/runs/${run.json.run_id}/adopt`, { method: "POST", token: tokenFor(leader), body: {} })).status, 409, "não adota duas vezes");
  });

  it("perfil de IA decide quem aciona: executor só se o perfil permitir; descartar não deixa rastro de entregável", async () => {
    const onlyLeader = await mkProfile({ allowed_actors: "leader" });
    const both = await mkProfile({ allowed_actors: "leader,executor" });
    const exec = { userId: "u", admin: false, leader: false, executor: true, agency: false, client: false };
    assert.equal(canRunAI(exec, onlyLeader), false);
    assert.equal(canRunAI(exec, both), true);
    assert.equal(canRunAI({ ...exec, executor: false, agency: true }, both), false);
    assert.equal(canRunAI({ ...exec, executor: false, admin: true }, onlyLeader), true);

    const c = await mkCatalog({ ai: { profile_id: onlyLeader.id, ai_mode: "rascunho" } });
    const k = await contract(companyId, c);
    const run = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(run.status, 201);
    const disc = await api(`/api/project-tasks/${k.task.id}/ai/runs/${run.json.run_id}/discard`, { method: "POST", token, body: { note: "Ficou fraco." } });
    assert.equal(disc.json.status, "descartada");
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: k.task.id } }), 0);
    // perfil desativado para de funcionar
    await prisma.catalog2AIProfile.update({ where: { id: onlyLeader.id }, data: { is_active: false } });
    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} })).status, 409);
  });

  it("auxilia: só sugere — não cria entregável, não conclui etapa e não pode ser 'adotada'", async () => {
    const prof = await mkProfile();
    const c = await mkCatalog({ execution_mode: "hibrido", ai: { profile_id: prof.id, ai_mode: "auxilia" } });
    const k = await contract(companyId, c);
    const run = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: { note: "Sugira títulos." } });
    assert.equal(run.json.status, "gerada");
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: k.task.id } }), 0);
    const stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: k.task.id } });
    assert.ok(stages.every((s) => s.status !== "CONCLUIDA"));
    const adopt = await api(`/api/project-tasks/${k.task.id}/ai/runs/${run.json.run_id}/adopt`, { method: "POST", token, body: {} });
    assert.equal(adopt.status, 409);
    assert.ok(String(adopt.json.error).includes("só sugere"));
  });

  it("autônoma: a IA executa as etapas abertas, cada saída vira entregável rastreável e a tarefa vai para a REVISÃO humana (nunca direto ao cliente)", async () => {
    const prof = await mkProfile();
    const c = await mkCatalog({ steps: 2, ai: { profile_id: prof.id, ai_mode: "autonoma" } });
    const k = await contract(companyId, c);
    assert.equal(k.task.requires_review, true, "tarefa com IA exige revisão humana por padrão");
    const r1 = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(r1.json.status, "adotada");
    let stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: k.task.id }, orderBy: { ordem: "asc" } });
    assert.equal(stages[0].status, "CONCLUIDA");
    assert.notEqual(stages[1].status, "CONCLUIDA");
    const r2 = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(r2.json.status, "adotada");
    stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: k.task.id }, orderBy: { ordem: "asc" } });
    assert.ok(stages.every((s) => s.status === "CONCLUIDA"));
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: k.task.id } })).status, "AGUARDANDO_REVISAO");
    const ds = await prisma.projectTaskDeliverable.findMany({ where: { project_task_id: k.task.id }, orderBy: { sort_order: "asc" } });
    assert.equal(ds.length, 2);
    assert.ok(ds.every((d) => d.source === "ia" && !!d.ai_run_id));
    assert.equal(await prisma.projectTaskAIRun.count({ where: { project_task_id: k.task.id, status: "adotada" } }), 2);
    // tarefa já em revisão: a IA não roda de novo
    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} })).status, 409);
  });

  it("faltou informação ou deu erro: a IA não chuta — encaminha ao humano, avisa o líder e deixa a etapa como está", async () => {
    const prof = await mkProfile();
    const c = await mkCatalog({ ai: { profile_id: prof.id, ai_mode: "autonoma" } });
    const k = await contract(companyId, c);
    const leader = await mkUser("lider", "lider");
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id } });

    setTaskAIAdapter(async () => ({ text: "", missing_information: ["Qual é o público-alvo?", "Qual é a oferta?"], promptTokens: 300, completionTokens: 20 }), "simulado");
    const miss = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(miss.status, 201);
    assert.equal(miss.json.forwarded, true);
    assert.equal(miss.json.status, "encaminhada");
    assert.ok(miss.json.reason.includes("público-alvo"));
    let st = await prisma.projectTaskStage.findMany({ where: { project_task_id: k.task.id } });
    assert.ok(st.every((s) => s.status !== "CONCLUIDA"), "a etapa não foi concluída");
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: k.task.id } }), 0);
    const alerts = await prisma.systemAlert.findMany({ where: { entity_type: "project_task", entity_id: k.task.id, user_id: leader.id } });
    assert.equal(alerts.length, 1);
    assert.ok(alerts[0].message.includes("Qual é o público-alvo?"));
    const row = await prisma.projectTaskAIRun.findFirstOrThrow({ where: { project_task_id: k.task.id } });
    assert.equal(row.status, "encaminhada");
    assert.ok(row.missing_info!.includes("Qual é a oferta?"));
    assert.equal(row.prompt_tokens, 300, "o consumo também fica registrado");

    setTaskAIAdapter(async () => { throw new Error("Falha de rede simulada"); }, "simulado");
    const err = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(err.json.status, "erro");
    assert.equal(err.json.forwarded, true);
    const errRow = await prisma.projectTaskAIRun.findUniqueOrThrow({ where: { id: err.json.run_id } });
    assert.equal(errRow.error_message, "Falha de rede simulada");
    assert.equal(errRow.cost, null, "sem resposta, sem custo");
    assert.equal(await prisma.systemAlert.count({ where: { entity_type: "project_task", entity_id: k.task.id, user_id: leader.id } }), 2);
    st = await prisma.projectTaskStage.findMany({ where: { project_task_id: k.task.id } });
    assert.ok(st.every((s) => s.status !== "CONCLUIDA"));

    // depois de resolvido, um humano assume e a tarefa segue normalmente
    setTaskAIAdapter(okAdapter, "simulado");
    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} })).json.status, "adotada");
  });

  it("tarefa sem IA configurada não aceita execução", async () => {
    const c = await mkCatalog({ execution_mode: "humano", ai: null });
    const k = await contract(companyId, c);
    const r = await api(`/api/project-tasks/${k.task.id}/ai/run`, { method: "POST", token, body: {} });
    assert.equal(r.status, 409);
    assert.equal(r.json.error, "Esta tarefa não tem IA configurada.");
    assert.equal((await api(`/api/project-tasks/${k.task.id}/ai`, { token })).json.config, null);
  });
});
