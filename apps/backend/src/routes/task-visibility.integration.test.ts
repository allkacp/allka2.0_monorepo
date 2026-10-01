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

// Pedido 3 · Fase 6 — continuidade, ativos e bloqueios visíveis para cliente, executor e líder, cada um com o que pode ver;
// e o fluxo do cliente para informar mudança de ativo.

let baseUrl = "";
let server: import("node:http").Server;
const cleanup: (() => Promise<void>)[] = [];
const userIds: string[] = [];
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
  const id = `vis-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}

async function mkContract(companyId: string) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `vis-${code}`, internal_name: `[TESTE] Visib ${code}`, status: "disponivel" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T", implementation_blocks_operation: false } });
  const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "t1", name: "Tarefa visível", sort_order: 1, cycle_type: "recorrente" } });
  await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: "e1", name: "Etapa 1", sort_order: 1 } });
  const project = await prisma.project.create({ data: { title: `Projeto Vis ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
  const task = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id } });
  cleanup.push(async () => {
    await prisma.systemAlert.deleteMany({ where: { entity_type: "project_task", entity_id: task.id } }).catch(() => {});
    await prisma.projectDecisionLog.deleteMany({ where: { project_id: project.id } }).catch(() => {});
    await prisma.clientAssetLink.deleteMany({ where: { project_id: project.id } }).catch(() => {});
    await prisma.projectDependencyRule.deleteMany({ where: { project_id: project.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { project, pp, task };
}

describe("Pedido 3 · Fase 6 — visibilidade por perfil e mudança de ativo", () => {
  let companyId = "";
  let otherCompanyId = "";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    companyId = (await prisma.company.create({ data: { name: `Empresa Vis ${uid()}` } })).id;
    otherCompanyId = (await prisma.company.create({ data: { name: `Outra Vis ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.clientAsset.deleteMany({ where: { company_id: { in: [companyId, otherCompanyId] } } }).catch(() => {}); await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } }).catch(() => {}); });
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("situação do fluxo: o miolo interno (revisão, qualificação) aparece para a equipe e vira 'em execução' para cliente", async () => {
    const k = await mkContract(companyId);
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id, status: "AGUARDANDO_REVISAO" } });
    const lead = await api(`/api/project-tasks/${k.task.id}/flow`, { token: tokenFor(leader) });
    assert.equal(lead.json.state, "aguardando_revisao");
    const cli = await api(`/api/project-tasks/${k.task.id}/flow`, { token: tokenFor(client) });
    assert.equal(cli.json.state, "em_execucao");
    assert.equal(cli.json.reason, "Nossa equipe está cuidando desta tarefa.");
    // o que é ação do cliente continua visível para ele
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { status: "APROVACAO_PENDENTE_CLIENTE" } });
    assert.equal((await api(`/api/project-tasks/${k.task.id}/flow`, { token: tokenFor(client) })).json.state, "aguardando_aprovacao_cliente");
    // e ajustes pedidos aparecem sem detalhe interno
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { status: "EM_AJUSTES" } });
    const aj = await api(`/api/project-tasks/${k.task.id}/flow`, { token: tokenFor(client) });
    assert.equal(aj.json.state, "em_ajustes");
    assert.equal(aj.json.reason, "Estamos fazendo os ajustes pedidos.");
    // outra empresa não enxerga
    const stranger = await mkUser("company_user", "empresas", { company_id: otherCompanyId });
    assert.equal((await api(`/api/project-tasks/${k.task.id}/flow`, { token: tokenFor(stranger) })).status, 404);
  });

  it("histórico e continuidade: cliente não vê a troca de executor nem os avisos internos; continua podendo escolher manter", async () => {
    const k = await mkContract(companyId);
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id } });
    const nomade = await prisma.nomade.create({ data: { name: "Fulano Interno Teste", email: `n-${uid()}@example.test` } as any });
    cleanup.push(async () => { await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {}); });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { executor_continuity: "recommended", continuity_status: "pending_choice", continuity_prev_nomade_id: nomade.id } });
    for (const [kind, message] of [["executor_changed", "Executor trocado para Fulano"], ["asset_validated", "Acesso validado"], ["dependency_delay_alert", "Líder avisado do atraso"]] as const) {
      await prisma.projectDecisionLog.create({ data: { project_id: k.project.id, project_task_id: k.task.id, kind, message } });
    }
    const asLeader = (await api(`/api/project-tasks/${k.task.id}/decisions`, { token: tokenFor(leader) })).json.data.map((d: any) => d.kind).filter((x: string) => x !== "cycle_generated").sort();
    assert.deepEqual(asLeader, ["asset_validated", "dependency_delay_alert", "executor_changed"]);
    const asClient = (await api(`/api/project-tasks/${k.task.id}/decisions`, { token: tokenFor(client) })).json.data.map((d: any) => d.kind).filter((x: string) => x !== "cycle_generated");
    assert.deepEqual(asClient, ["asset_validated"], "só o que diz respeito ao cliente");

    const cLeader = await api(`/api/project-tasks/${k.task.id}/continuity`, { token: tokenFor(leader) });
    assert.equal(cLeader.json.previous_executor.name, "Fulano Interno Teste");
    const cClient = await api(`/api/project-tasks/${k.task.id}/continuity`, { token: tokenFor(client) });
    assert.equal(cClient.json.previous_executor.name, "Especialista responsável", "por padrão o cliente vê só o especialista responsável");
    assert.equal(cClient.json.applies, true);
    assert.equal(cClient.json.can_choose, true, "o cliente ainda pode escolher manter ou redistribuir");
    assert.equal(cClient.json.can_choose_manually, false);
  });

  it("dependências: cliente vê o motivo, não a tarefa interna que bloqueia", async () => {
    const k = await mkContract(companyId);
    const other = await prisma.projectTask.create({ data: { project_id: k.project.id, project_product_id: k.pp.id, title: "Tarefa interna alvo", name_snapshot: "Tarefa interna alvo", task_code: `X-${uid()}`, status: "EM_EXECUCAO" } as any });
    await prisma.projectDependencyRule.create({
      data: { project_id: k.project.id, task_id: k.task.id, target_kind: "task", target_task_id: other.id, behavior: "block_start", reason: "Aguardando a entrega anterior" } as any,
    });
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id } });
    const lead = await api(`/api/project-tasks/${k.task.id}/dependencies`, { token: tokenFor(leader) });
    assert.equal(lead.json.rules[0].target_task.title, "Tarefa interna alvo");
    const cli = await api(`/api/project-tasks/${k.task.id}/dependencies`, { token: tokenFor(client) });
    assert.equal(cli.json.blocked, true, "o cliente vê que está bloqueada");
    assert.equal(cli.json.rules[0].reason, "Aguardando a entrega anterior");
    assert.equal(cli.json.rules[0].target_task, undefined);
    assert.equal(cli.json.rules[0].targetTaskId, undefined);
  });

  it("ativo: cliente informa mudança (novo identificador); ativo volta para revalidar, contrato pede revalidação, histórico e aviso ao líder; senha é recusada", async () => {
    const k = await mkContract(companyId);
    const leader = await mkUser("lider", "lider");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    const stranger = await mkUser("company_user", "empresas", { company_id: otherCompanyId });
    await prisma.projectTask.update({ where: { id: k.task.id }, data: { lider_responsavel_id: leader.id, status: "EM_EXECUCAO" } });
    const asset = await prisma.clientAsset.create({ data: { company_id: companyId, asset_type: "google_ads", label: "Conta Google Ads", identifier: "123-456-7890", status: "validado", last_validated_at: new Date(), scope_confirmed: "Administrador" } });
    await prisma.clientAssetLink.create({ data: { asset_id: asset.id, project_id: k.project.id, project_product_id: k.pp.id, project_task_id: k.task.id, is_required: true } as any });

    const view = await api(`/api/project-tasks/${k.task.id}/assets`, { token: tokenFor(client) });
    assert.equal(view.json.can_report, true);
    assert.equal(view.json.can_validate, false, "o cliente não valida o próprio acesso");
    assert.equal((await api(`/api/project-tasks/${k.task.id}/assets`, { token: tokenFor(leader) })).json.can_validate, true);

    assert.equal((await api(`/api/client-assets/${asset.id}/report-change`, { method: "POST", token: tokenFor(stranger), body: { note: "x" } })).status, 404);
    assert.equal((await api(`/api/client-assets/${asset.id}/report-change`, { method: "POST", token: tokenFor(client), body: { note: "minha senha: abc12345" } })).status, 422, "senha é recusada");

    const r = await api(`/api/client-assets/${asset.id}/report-change`, { method: "POST", token: tokenFor(client), body: { identifier: "999-888-7777", note: "Troquei de conta" } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const a = await prisma.clientAsset.findUniqueOrThrow({ where: { id: asset.id } });
    assert.equal(a.status, "revalidar");
    assert.equal(a.identifier, "999-888-7777");
    assert.ok(a.change_reported_at);
    assert.equal(a.notes, "Troquei de conta");
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: k.pp.id } });
    assert.ok(pp.revalidation_reason?.includes("Conta Google Ads"), "o contrato pede revalidação");
    const log = await prisma.projectDecisionLog.findFirst({ where: { project_id: k.project.id, kind: "asset_change_reported" } });
    assert.ok(log && log.message.includes("novo identificador informado"));
    const alerts = await prisma.systemAlert.findMany({ where: { entity_type: "project_task", entity_id: k.task.id, user_id: leader.id, type: "ativo_alterado" } });
    assert.equal(alerts.length, 1, "o líder foi avisado");
    // a equipe revalida e o fluxo segue
    const v = await api(`/api/client-assets/${asset.id}/validate`, { method: "POST", token: tokenFor(leader), body: { scope_confirmed: "Administrador" } });
    assert.equal(v.status, 200);
    assert.equal((await prisma.clientAsset.findUniqueOrThrow({ where: { id: asset.id } })).status, "validado");
    assert.equal((await api(`/api/client-assets/${asset.id}/validate`, { method: "POST", token: tokenFor(client), body: { scope_confirmed: "Administrador" } })).status, 403);
  });
});
