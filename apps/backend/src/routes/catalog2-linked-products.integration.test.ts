import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { concluirEtapa, iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { reevaluateProjectDependencies } from "../lib/project-dependencies";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, SEL, setPricingSettings, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// Estrutura universal v2 · vínculo entre produtos comprados juntos: etapa específica aguarda o entregável aprovado do outro produto,
// começo parcial, entregável aprovado vira ENTRADA, não obriga a compra do outro e resolve sempre pelo ID real.

let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

const pubApi = async (versionId: string) => {
  const r = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
  assert.equal(r.status, 200, JSON.stringify(r.json));
};
const quote = async (productId: string) => {
  const r = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: productId, selection: SEL } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.id as string;
};
async function stageOf(taskId: string, key: string) {
  const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: taskId }, select: { catalog2_task_id: true } });
  const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { key, task_id: t.catalog2_task_id! } });
  return prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: taskId, catalog_step_ref: step.id } });
}
const statusOf = async (taskId: string, key: string) => (await stageOf(taskId, key)).status;
const finish = async (taskId: string, key: string) => concluirEtapa(prisma, (await stageOf(taskId, key)).id, { userId: LEADER.user.id });
async function startTask(taskId: string) {
  await prisma.projectTask.update({ where: { id: taskId }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.user.id, data_liberacao_execucao: new Date() } });
  await prisma.projectTaskStage.updateMany({ where: { project_task_id: taskId }, data: { executor_type: "leader", lider_id: LEADER.user.id } });
  await iniciarEtapasDaTarefa(prisma, taskId);
}

/** Produto A (campanha: preparar → publicar) e produto B (criativo), ambos publicados; regra cadastrada pela API oficial. */
async function setup(rule: Record<string, unknown> = {}) {
  const a = await mkProduct({ name: "Campanha", tasks: [{ key: "camp", steps: [{ key: "prep" }, { key: "pub" }] }] });
  const b = await mkProduct({ name: "Criativos", tasks: [{ key: "design", steps: [{ key: "arte" }] }], publish: true });
  const r = await adm(`/products/${a.product.id}/prerequisites`, "POST", {
    target_kind: "product_deliverables", target_product_id: b.product.id, dependent_task_key: "camp", dependent_step_key: "pub",
    condition_mode: "when_bought_together", behavior: "block_start", provides_input: true, input_label: "Arte aprovada", ...rule,
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  await pubApi(a.versionId);
  return { a: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: a.product.id } }), b: b.product, ruleId: r.json.id as string };
}

describe("Estrutura universal v2 · produtos vinculados", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("LP"); LEADER = await mkLeader(); });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => { await stopServer(); });

  it("L01. comprado SOZINHO: o vínculo nem existe — não obriga a compra do outro produto e a publicação flui", async () => {
    const { a } = await setup();
    const { projectId } = await checkoutAndPay(CO.token, [await quote(a.id)]);
    assert.equal(await prisma.projectDependencyRule.count({ where: { project_id: projectId } }), 0, "nenhuma regra materializada");
    const task = byKey(await tasksOf(projectId)).camp;
    await startTask(task.id);
    await finish(task.id, "prep");
    assert.notEqual(await statusOf(task.id, "pub"), "AGUARDANDO_DEPENDENCIA");
    assert.notEqual(await statusOf(task.id, "pub"), "BLOQUEADA");
  });

  it("L02. comprados JUNTOS: preparar começa; publicar espera o entregável aprovado do outro produto; aprovado → libera e vira ENTRADA", async () => {
    const { a, b } = await setup();
    const { projectId, pps } = await checkoutAndPay(CO.token, [await quote(a.id), await quote(b.id)]);
    assert.equal(pps.length, 2);
    const tasks = byKey(await tasksOf(projectId));
    const camp = tasks.camp, design = tasks.design;
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: projectId, task_id: camp.id } });
    assert.deepEqual({ b: rule.behavior, g: rule.stage_gate, k: rule.target_kind, p: rule.target_product_id, i: rule.provides_input }, { b: "block_stage", g: "start", k: "product_deliverables", p: b.id, i: true }, "só a etapa publicar espera (resolvido pelo ID real)");
    assert.ok(rule.dependent_stage_key, "guarda a etapa que espera");
    assert.notEqual(camp.status, "PENDENTE_DE_LIBERACAO", "a tarefa pode começar (começo parcial)");

    await startTask(camp.id);
    assert.equal(await statusOf(camp.id, "prep"), "EM_ANDAMENTO", "a campanha pode ser preparada");
    await finish(camp.id, "prep");
    assert.equal(await statusOf(camp.id, "pub"), "AGUARDANDO_DEPENDENCIA", "publicar aguarda o produto vinculado");
    const pubStage = await stageOf(camp.id, "pub");
    await assert.rejects(() => concluirEtapa(prisma, pubStage.id, { userId: LEADER.user.id }), /outro produto/i);

    // entregável do outro produto: ainda não aprovado
    const del = await prisma.projectTaskDeliverable.create({ data: { project_task_id: design.id, key: "arte", name: "Arte final", status: "enviado", content_url: "https://exemplo.test/arte-v1.png", version: 1, is_required: true } });
    await reevaluateProjectDependencies(prisma, projectId);
    assert.equal(await statusOf(camp.id, "pub"), "AGUARDANDO_DEPENDENCIA", "enviado ≠ aprovado");
    assert.equal(await prisma.projectTaskInput.count({ where: { project_task_id: camp.id } }), 0);

    // aprovado: libera a etapa e o entregável vira entrada (link, versão e aprovação)
    await prisma.projectTaskDeliverable.update({ where: { id: del.id }, data: { status: "aprovado", content_url: "https://exemplo.test/arte-v2.png", version: 2, reviewed_at: new Date() } });
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual(await statusOf(camp.id, "pub"), "AGUARDANDO_DEPENDENCIA", "liberada");
    const input = await prisma.projectTaskInput.findFirstOrThrow({ where: { project_task_id: camp.id } });
    assert.deepEqual({ l: input.label, u: input.link_url, v: input.version_number, s: input.approval_status, k: input.source_deliverable_key, p: input.source_product_id }, { l: "Arte aprovada", u: "https://exemplo.test/arte-v2.png", v: 2, s: "aprovado", k: "arte", p: b.id });
    // nova versão do entregável atualiza a entrada (sem duplicar)
    await prisma.projectTaskDeliverable.update({ where: { id: del.id }, data: { version: 3, content_url: "https://exemplo.test/arte-v3.png" } });
    await reevaluateProjectDependencies(prisma, projectId);
    const inputs = await prisma.projectTaskInput.findMany({ where: { project_task_id: camp.id } });
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].version_number, 3);
    const flow = await api(`/api/task-flow/${camp.id}`, { token: CO.token });
    assert.equal(flow.status, 200, JSON.stringify(flow.json));
    assert.equal(flow.json.inputs[0].link_url, "https://exemplo.test/arte-v3.png");
    assert.ok(flow.json.dependencies.some((d: any) => d.kind === "product_deliverables" && d.behavior === "block_stage"), "o fluxo aparece no projeto");
  });

  it("L03. produto vinculado SEM entregáveis estruturados: vale a tarefa dele concluída", async () => {
    const { a, b } = await setup();
    const { projectId } = await checkoutAndPay(CO.token, [await quote(a.id), await quote(b.id)]);
    const tasks = byKey(await tasksOf(projectId));
    await startTask(tasks.camp.id);
    await finish(tasks.camp.id, "prep");
    assert.equal(await statusOf(tasks.camp.id, "pub"), "AGUARDANDO_DEPENDENCIA");
    await prisma.projectTask.update({ where: { id: tasks.design.id }, data: { status: "CONCLUIDA" } });
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual(await statusOf(tasks.camp.id, "pub"), "AGUARDANDO_DEPENDENCIA");
  });

  it("L04. começo PARCIAL no nível da tarefa: pode executar, mas a execução final/entrega espera", async () => {
    const { a, b } = await (async () => {
      const a = await mkProduct({ name: "Parcial", tasks: [{ key: "camp", steps: [{ key: "prep" }, { key: "pub" }] }] });
      const b = await mkProduct({ name: "Outro", tasks: [{ key: "design" }], publish: true });
      const r = await adm(`/products/${a.product.id}/prerequisites`, "POST", { target_kind: "product_deliverables", target_product_id: b.product.id, dependent_task_key: "camp", condition_mode: "when_bought_together", behavior: "block_start", allow_partial_start: true });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      await pubApi(a.versionId);
      return { a: a.product, b: b.product };
    })();
    const { projectId } = await checkoutAndPay(CO.token, [await quote(a.id), await quote(b.id)]);
    const tasks = byKey(await tasksOf(projectId));
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: projectId, task_id: tasks.camp.id } });
    assert.equal(rule.behavior, "block_final", "partial start vira 'bloqueia só a execução final'");
    assert.notEqual(tasks.camp.status, "PENDENTE_DE_LIBERACAO");
    await startTask(tasks.camp.id);
    await finish(tasks.camp.id, "prep");
    const pubStage = await stageOf(tasks.camp.id, "pub");
    await assert.rejects(() => concluirEtapa(prisma, pubStage.id, { userId: LEADER.user.id }), /execução final/i);
  });

  it("L05. o cliente vê na contratação o vínculo (sem obrigação de compra) e o cadastro valida tudo pelo ID real", async () => {
    const { a, b } = await setup();
    const det = await api(`/api/catalog2/products/${a.slug}`, { token: CO.token });
    assert.equal(det.status, 200, JSON.stringify(det.json));
    const lp = det.json.linked_products as any[];
    assert.equal(lp.length, 1);
    assert.deepEqual({ id: lp[0].product_id, req: lp[0].requires_purchase, partial: lp[0].partial_start }, { id: b.id, req: false, partial: true });
    assert.match(lp[0].description, /Não é obrigatório contratar o outro produto/);
    // validações do cadastro
    const novo = await mkProduct({ name: "Validações", tasks: [{ key: "camp", steps: [{ key: "prep" }] }] });
    const base = { target_kind: "product_deliverables", condition_mode: "when_bought_together", behavior: "block_start" };
    const post = (body: Record<string, unknown>) => adm(`/products/${novo.product.id}/prerequisites`, "POST", { ...base, ...body });
    assert.equal((await post({ target_product_id: b.slug })).status, 404, "nome/slug aproximado nunca resolve");
    assert.equal((await post({})).status, 422, "produto vinculado obrigatório");
    assert.equal((await post({ target_product_id: novo.product.id })).status, 422, "um produto não é comprado junto dele mesmo");
    assert.equal((await post({ target_product_id: b.id, dependent_task_key: "camp", dependent_step_key: "fantasma" })).status, 422);
    assert.equal((await post({ target_product_id: b.id, dependent_step_key: "prep" })).status, 422, "etapa exige a tarefa");
    assert.equal((await post({ target_product_id: b.id, dependent_task_key: "fantasma", dependent_step_key: "prep" })).status, 422);
    assert.equal((await post({ target_product_id: b.id, target_kind: "product", provides_input: true })).status, 422, "só entregável vira entrada");
    assert.equal((await post({ target_product_id: b.id, dependent_task_key: "camp", dependent_step_key: "prep" })).status, 201);
  });
});
