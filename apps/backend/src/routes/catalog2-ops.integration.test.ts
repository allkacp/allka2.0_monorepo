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
import { createProduct } from "../lib/catalog2-service";
import { computePricing } from "../lib/catalog2-pricing";
import { validateSelection } from "../lib/catalog2-client";
import { gerarTarefasCatalog2DoProjeto } from "../lib/generate-tasks-catalog2";

// Pedido 3 · Fase 1 — campos operacionais, visibilidade por perfil, evidência, condições com
// referência real, variações por tipo (uma/várias/quantidade), opções inativas e filtros.

let baseUrl = "";
let server: import("node:http").Server;
const userIds: string[] = [];
const adminProfiles: string[] = [];
const productIds: string[] = [];
const cleanup: (() => Promise<void>)[] = [];
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
  const id = `ops-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}
async function mkMaster() {
  const p = await prisma.adminProfile.create({ data: { name: `OpsProf ${uid()}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  return mkUser("admin", "admin", { admin_profile_id: p.id });
}
async function mkProduct(masterId: string, name: string) {
  const p = await createProduct({ internal_name: name }, masterId);
  productIds.push(p.id);
  const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
  return { product: p, versionId: v.id };
}
const productDetail = async (token: string, id: string) => (await api(`/api/admin/catalog2/products/${id}`, { token })).json;

describe("Pedido 3 · Fase 1 — campos operacionais, visibilidade e variações", () => {
  let admin: Awaited<ReturnType<typeof mkUser>>;
  let token = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    admin = await mkMaster();
    token = tokenFor(admin);
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    for (const id of productIds) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("tarefa e etapa guardam os campos operacionais; campo desconhecido é recusado; 'somente neste produto' x 'modelo global'", async () => {
    const { product, versionId } = await mkProduct(admin.id, "[TESTE] Ops A");
    const ops = { objective: "Objetivo A", instructions: "Faça assim", required_inputs: "Acesso ao site", expected_output: "Relatório", acceptance_criteria: "Sem erros", risks_notes: "Cuidado com prazo", visibility: { acceptance_criteria: "agency" } };
    const t = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa Ops", description: "Descrição da tarefa", ops } });
    assert.equal(t.status, 201);
    const bad = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa Ruim", ops: { campo_inventado: "x" } } });
    assert.equal(bad.status, 400, "campo desconhecido não passa");
    const s = await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { name: "Etapa Ops", ops: { instructions: "Passo a passo", evidence_required: true, evidence_hint: "Print da tela" } } });
    assert.equal(s.status, 201);

    let detail = await productDetail(token, product.id);
    const task = detail.versions[0].tasks[0];
    assert.equal(task.description, "Descrição da tarefa");
    assert.equal(task.ops.objective, "Objetivo A");
    assert.equal(task.ops.visibility.acceptance_criteria, "agency");
    assert.equal(task.steps[0].ops.evidence_required, true);
    assert.equal(task.model.customized, false, "igual ao modelo recém-criado");

    // somente neste produto → o modelo global não muda
    const up = await api(`/api/admin/catalog2/tasks/${t.json.id}`, { method: "PUT", token, body: { ops: { ...ops, instructions: "Só neste produto" }, scope: "product" } });
    assert.equal(up.status, 200);
    detail = await productDetail(token, product.id);
    assert.equal(detail.versions[0].tasks[0].ops.instructions, "Só neste produto");
    assert.equal(detail.versions[0].tasks[0].model.customized, true);
    const modelNow = await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}`, { token });
    assert.equal(modelNow.json.ops.instructions, "Faça assim", "modelo global intacto");

    // atualizar o modelo global → revisão sobe e volta a ficar igual
    const up2 = await api(`/api/admin/catalog2/tasks/${t.json.id}`, { method: "PUT", token, body: { ops: { ...ops, instructions: "Para todos" }, scope: "model", confirm_model_update: true } });
    assert.equal(up2.status, 200);
    const modelAfter = await api(`/api/admin/catalog2/task-models/${t.json.task_model_id}`, { token });
    assert.equal(modelAfter.json.ops.instructions, "Para todos");
    assert.equal(modelAfter.json.revision, 2);
    detail = await productDetail(token, product.id);
    assert.equal(detail.versions[0].tasks[0].model.customized, false);

    // limpar os campos volta para "nada preenchido"
    const clear = await api(`/api/admin/catalog2/tasks/${t.json.id}`, { method: "PUT", token, body: { ops: { instructions: "   " }, scope: "product" } });
    assert.equal(clear.status, 200);
    detail = await productDetail(token, product.id);
    assert.equal(detail.versions[0].tasks[0].ops, null);
  });

  it("nova versão (rascunho a partir da publicada) leva os campos operacionais e o qualificador designado", async () => {
    const { product, versionId } = await mkProduct(admin.id, "[TESTE] Ops Clone");
    const leader = await mkUser("lider", "lider");
    const t = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token, body: { name: "T", requires_qualification: true, qualifier_user_id: leader.id, ops: { instructions: "Instrução clone" } } });
    await api(`/api/admin/catalog2/tasks/${t.json.id}/steps`, { method: "POST", token, body: { name: "E", ops: { evidence_required: true } } });
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { state: "publicada", published_at: new Date() } });
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { published_version_id: versionId } });
    const nv = await api(`/api/admin/catalog2/products/${product.id}/versions`, { method: "POST", token });
    assert.equal(nv.status, 201, JSON.stringify(nv.json));
    const detail = await productDetail(token, product.id);
    const draft = detail.versions.find((v: any) => v.state === "rascunho");
    assert.equal(draft.tasks[0].ops.instructions, "Instrução clone");
    assert.equal(draft.tasks[0].qualifier_user_id, leader.id);
    assert.equal(draft.tasks[0].steps[0].ops.evidence_required, true);
  });

  it("contratação: cada perfil só recebe o que a visibilidade permite; evidência obrigatória bloqueia a conclusão sem anexo", async () => {
    const code = uid();
    const prod = await prisma.catalog2Product.create({ data: { slug: `ops-${code}`, internal_name: `[TESTE] Ops contrato ${code}`, status: "disponivel" } });
    productIds.push(prod.id);
    const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T" } });
    const task = await prisma.catalog2Task.create({
      data: {
        version_id: ver.id, key: "t1", name: "Tarefa guiada", description: "Descrição pública", sort_order: 1,
        ops: { objective: "OBJ", instructions: "INSTR", required_inputs: "ENTR", expected_output: "SAIDA", acceptance_criteria: "ACEITE", risks_notes: "RISCO", visibility: { acceptance_criteria: "agency" } },
      },
    });
    await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "s1", name: "Etapa 1", sort_order: 1, completion_criteria: "CRITERIO", ops: { instructions: "PASSO1", evidence_required: true, evidence_hint: "PRINT", visibility: { evidence_hint: "client" } } } });
    await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "s2", name: "Etapa 2", sort_order: 2 } });

    const company = await prisma.company.create({ data: { name: `Empresa Ops ${code}` } });
    const other = await prisma.company.create({ data: { name: `Outra Ops ${code}` } });
    const clientUser = await mkUser("company_user", "empresas", { company_id: company.id });
    const strangerUser = await mkUser("company_user", "empresas", { company_id: other.id });
    const leader = await mkUser("lider", "lider");
    const nomadUser = await mkUser("nomad", "nomades");
    const nomade = await prisma.nomade.create({ data: { user_id: nomadUser.id, name: nomadUser.name, email: `${nomadUser.id}-n@example.test`, status: "ativo" } });
    const project = await prisma.project.create({ data: { title: `Projeto Ops ${code}`, project_code: code, company_id: company.id } });
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
    const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 100, status: "PAGO", paid_at: new Date() } });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
    cleanup.push(async () => {
      await prisma.taskAttachment.deleteMany({ where: { project_task: { project_id: project.id } } });
      await prisma.taskDependency.deleteMany({ where: { project_id: project.id } });
      await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
      await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { project_id: project.id } });
      await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
      await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {});
      await prisma.company.deleteMany({ where: { id: { in: [company.id, other.id] } } });
    });

    const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id }, include: { stages: { orderBy: { ordem: "asc" } }, ops: true } });
    assert.ok(pt.ops, "fotografia operacional gravada em tabela à parte");
    assert.equal(pt.stages[0].exige_anexo, true, "evidência obrigatória liga o bloqueio de anexo da etapa");
    assert.equal(pt.stages[1].exige_anexo, false);
    // a rota comum de detalhe NÃO carrega as instruções (nada vaza por acidente)
    const plain = await api(`/api/project-tasks/${pt.id}`, { token: tokenFor(clientUser) });
    assert.equal(plain.status, 200);
    assert.equal(JSON.stringify(plain.json).includes("INSTR"), false);
    assert.equal(JSON.stringify(plain.json).includes("RISCO"), false);

    const labels = (r: any) => r.json.task.items.map((i: any) => i.key).sort();
    const stageKeys = (r: any, n: number) => r.json.stages[n].items.map((i: any) => i.key).sort();

    const asClient = await api(`/api/project-tasks/${pt.id}/operational`, { token: tokenFor(clientUser) });
    assert.equal(asClient.status, 200);
    assert.deepEqual(labels(asClient), ["description", "expected_output", "objective", "required_inputs"], "cliente: sem instruções, sem aceite (nível agência) e sem riscos");
    assert.deepEqual(stageKeys(asClient, 0), ["evidence_hint"], "cliente vê só a dica de evidência marcada como 'cliente'");
    assert.equal(asClient.json.stages[0].evidence_required, true);

    const asStranger = await api(`/api/project-tasks/${pt.id}/operational`, { token: tokenFor(strangerUser) });
    assert.equal(asStranger.status, 404, "empresa de outro cliente não enxerga");

    // líder designado
    await prisma.projectTask.update({ where: { id: pt.id }, data: { lider_responsavel_id: leader.id } });
    const asLeader = await api(`/api/project-tasks/${pt.id}/operational`, { token: tokenFor(leader) });
    assert.equal(asLeader.status, 200);
    assert.ok(labels(asLeader).includes("risks_notes") && labels(asLeader).includes("instructions"));

    // nômade sem vínculo não vê; com etapa atribuída vê o que é de "executor"
    const nomadNo = await api(`/api/project-tasks/${pt.id}/operational`, { token: tokenFor(nomadUser) });
    assert.equal(nomadNo.status, 404);
    await prisma.projectTaskStage.update({ where: { id: pt.stages[0].id }, data: { nomade_id: nomade.id, status: "EM_ANDAMENTO" } });
    const asNomad = await api(`/api/project-tasks/${pt.id}/operational`, { token: tokenFor(nomadUser) });
    assert.equal(asNomad.status, 200);
    const nk = labels(asNomad);
    assert.ok(nk.includes("instructions") && nk.includes("acceptance_criteria"), "executor vê instruções e aceite");
    assert.ok(!nk.includes("risks_notes"), "riscos só para líder e administração");
    assert.deepEqual(stageKeys(asNomad, 0), ["completion_criteria", "evidence_hint", "instructions"]);

    const asAdmin = await api(`/api/project-tasks/${pt.id}/operational`, { token });
    assert.ok(labels(asAdmin).includes("risks_notes"));

    // evidência obrigatória: concluir sem anexo é recusado com motivo
    const tryFinish = await api(`/api/nomades/me/etapas/${pt.stages[0].id}/concluir`, { method: "PATCH", token: tokenFor(nomadUser) });
    assert.equal(tryFinish.status, 422);
    assert.equal(tryFinish.json.code, "ANEXO_OBRIGATORIO");
  });

  it("condições só aceitam referências reais: opção, adicional e quantidade; opção inativa também é recusada", async () => {
    const { versionId } = await mkProduct(admin.id, "[TESTE] Ops Condições");
    const va = await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token, body: { key: "porte", name: "Porte" } });
    await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token, body: { key: "pequeno", label: "Pequeno" } });
    const oGrande = await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token, body: { key: "grande", label: "Grande" } });
    await api(`/api/admin/catalog2/versions/${versionId}/addons`, { method: "POST", token, body: { key: "urgencia", name: "Urgência" } });
    const cond = (extra: Record<string, unknown>) => api(`/api/admin/catalog2/versions/${versionId}/conditions`, { method: "POST", token, body: { key: `c-${uid()}`, name: "Cond", effect_type: "add_deadline_days", effect_value: "2", ...extra } });

    assert.equal((await cond({ trigger_source: "variation_option", trigger_ref: "inexistente", operator: "selected" })).status, 422);
    assert.equal((await cond({ trigger_source: "variation_option", trigger_ref: "grande", operator: "selected" })).status, 201);
    assert.equal((await cond({ trigger_source: "variation_option", operator: "eq", comparison_value: "nao-existe" })).status, 422);
    assert.equal((await cond({ trigger_source: "addon_selected", trigger_ref: "fantasma", operator: "selected" })).status, 422);
    assert.equal((await cond({ trigger_source: "addon_selected", trigger_ref: "urgencia", operator: "selected" })).status, 201);
    assert.equal((await cond({ trigger_source: "quantity", operator: "gte", comparison_value: "abc" })).status, 422);
    assert.equal((await cond({ trigger_source: "quantity", operator: "gte", comparison_value: "5" })).status, 201);
    assert.equal((await cond({ trigger_source: "client_answer", operator: "eq", comparison_value: "sim" })).status, 422, "resposta sem chave");

    // desativar a opção: nova condição apontando para ela é recusada
    await api(`/api/admin/catalog2/options/${oGrande.json.id}`, { method: "PUT", token, body: { is_active: false } });
    assert.equal((await cond({ trigger_source: "variation_option", trigger_ref: "grande", operator: "selected" })).status, 422);
  });

  it("variações: uma opção (padrão único), várias opções e quantidade; opção/variação inativa não entra; chave de opção não repete", async () => {
    const { versionId } = await mkProduct(admin.id, "[TESTE] Ops Variações");
    const mkVar = async (key: string, selection_type: string, extra: Record<string, unknown> = {}) =>
      (await api(`/api/admin/catalog2/versions/${versionId}/variations`, { method: "POST", token, body: { key, name: key, selection_type, ...extra } })).json;
    const mkOpt = async (varId: string, key: string, extra: Record<string, unknown> = {}) =>
      api(`/api/admin/catalog2/variations/${varId}/options`, { method: "POST", token, body: { key, label: key, ...extra } });
    const effect = async (optId: string, type: string, value: string) => api(`/api/admin/catalog2/options/${optId}/effects`, { method: "POST", token, body: { effect_type: type, effect_value: value } });

    const single = await mkVar("tam", "single");
    const a = (await mkOpt(single.id, "tam-p")).json;
    const b = (await mkOpt(single.id, "tam-g", { is_default: true })).json;
    await effect(a.id, "add_fixed_amount", "10");
    await effect(b.id, "add_fixed_amount", "50");
    // só pode haver UMA opção padrão numa variação de escolha única
    const a2 = await api(`/api/admin/catalog2/options/${a.id}`, { method: "PUT", token, body: { is_default: true } });
    assert.equal(a2.status, 200);
    const reread = await prisma.catalog2VariationOption.findMany({ where: { variation_id: single.id } });
    assert.equal(reread.filter((o) => o.is_default).length, 1);
    assert.equal(reread.find((o) => o.is_default)!.key, "tam-p");
    // chave repetida na versão é recusada
    assert.equal((await mkOpt(single.id, "tam-p")).status, 422);

    const multi = await mkVar("extras", "multiple");
    const m1 = (await mkOpt(multi.id, "ex-1")).json;
    const m2 = (await mkOpt(multi.id, "ex-2")).json;
    await effect(m1.id, "add_fixed_amount", "100");
    await effect(m2.id, "add_fixed_amount", "200");

    const qty = await mkVar("campanhas", "quantity");
    const q1 = (await mkOpt(qty.id, "camp-unid")).json;
    await effect(q1.id, "add_fixed_amount", "30");
    await effect(q1.id, "add_deadline_days", "2");

    const fixed = async (sel: Record<string, unknown>) => (await computePricing(versionId, sel as any)).lines.variation_impacts.amount;
    assert.equal(await fixed({ variation_option_keys: ["tam-p"] }), 10);
    assert.equal(await fixed({ variation_option_keys: ["tam-p", "ex-1", "ex-2"] }), 10 + 100 + 200, "várias opções somam");
    assert.equal(await fixed({ variation_option_keys: [], variation_quantities: { campanhas: 4 } }), 120, "quantidade multiplica o efeito por unidade");
    const r = await computePricing(versionId, { variation_option_keys: [], variation_quantities: { campanhas: 4 } });
    assert.equal(r.deadline.days_from_variations, 8, "dias também por unidade");
    assert.equal(await fixed({ variation_option_keys: [], variation_quantities: { campanhas: 0 } }), 0);

    // desativar opção: o efeito sai do cálculo
    await api(`/api/admin/catalog2/options/${m2.id}`, { method: "PUT", token, body: { is_active: false } });
    assert.equal(await fixed({ variation_option_keys: ["ex-1", "ex-2"] }), 100);
    // desativar variação inteira
    await api(`/api/admin/catalog2/variations/${multi.id}`, { method: "PUT", token, body: { is_active: false } });
    assert.equal(await fixed({ variation_option_keys: ["ex-1"] }), 0);

    // validação da seleção por tipo
    const ver = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId }, include: { variations: { include: { options: true } }, addons: true } });
    const errs = (sel: Record<string, unknown>) => validateSelection(ver as any, { quantity: 1, delivery_groups: [1], ...sel } as any);
    assert.ok(errs({ variation_option_keys: ["tam-p", "tam-g"] }).some((e) => e.includes("apenas uma opção")));
    assert.ok(errs({ variation_option_keys: ["tam-p"], variation_quantities: { campanhas: -1 } }).length > 0);
    assert.equal(errs({ variation_option_keys: ["tam-p"], variation_quantities: { campanhas: 3 } }).length, 0);
    assert.ok(errs({ variation_option_keys: ["tam-p", "ex-1"] }).some((e) => e.includes("inválida") || e.includes("não existe")), "opção de variação inativa é recusada");
  });

  it("adicional só se vincula a tarefa/etapa da mesma versão; busca de modelos filtra por tipo de ciclo", async () => {
    const a = await mkProduct(admin.id, "[TESTE] Ops Adicional A");
    const b = await mkProduct(admin.id, "[TESTE] Ops Adicional B");
    const ta = await api(`/api/admin/catalog2/versions/${a.versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa A", cycle_type: "implementacao" } });
    const tb = await api(`/api/admin/catalog2/versions/${b.versionId}/tasks`, { method: "POST", token, body: { name: "Tarefa B", cycle_type: "recorrente" } });
    const ok = await api(`/api/admin/catalog2/versions/${a.versionId}/addons`, { method: "POST", token, body: { key: "ad1", name: "Ad 1", target_task_id: ta.json.id } });
    assert.equal(ok.status, 201);
    const cross = await api(`/api/admin/catalog2/versions/${a.versionId}/addons`, { method: "POST", token, body: { key: "ad2", name: "Ad 2", target_task_id: tb.json.id } });
    assert.equal(cross.status, 422);
    const put = await api(`/api/admin/catalog2/addons/${ok.json.id}`, { method: "PUT", token, body: { target_task_id: tb.json.id } });
    assert.equal(put.status, 422);

    const impl = await api(`/api/admin/catalog2/task-models?cycle_type=implementacao&limit=100`, { token });
    assert.equal(impl.status, 200);
    assert.ok(impl.json.data.every((m: any) => m.cycle_type === "implementacao"));
    assert.ok(impl.json.data.some((m: any) => m.id === ta.json.task_model_id));
    assert.ok(!impl.json.data.some((m: any) => m.id === tb.json.task_model_id));
  });
});
