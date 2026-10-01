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
import { concluirEtapa } from "../lib/stage-engine";
import { reevaluateProjectDependencies } from "../lib/project-dependencies";
import { createProduct } from "../lib/catalog2-service";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";

// Pedido 3 · Fase 3 — entregáveis/anexos estruturados + dependências internas ao produto e por ciclo.

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
  const id = `dlv-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...extra } });
  userIds.push(u.id);
  return u;
}
async function mkMaster() {
  const p = await prisma.adminProfile.create({ data: { name: `DlvProf ${uid()}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  return mkUser("admin", "admin", { admin_profile_id: p.id });
}

interface TaskDef { key: string; cycle_type?: string; steps?: number }
async function mkCatalog(tasks: TaskDef[]) {
  const code = uid();
  const prod = await prisma.catalog2Product.create({ data: { slug: `dlv-${code}`, internal_name: `[TESTE] Entregáveis ${code}`, status: "disponivel" } });
  const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T", implementation_blocks_operation: false } });
  const rows: Record<string, { id: string; steps: { id: string; key: string }[] }> = {};
  let order = 1;
  for (const t of tasks) {
    const ct = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: t.key, name: `Tarefa ${t.key}`, sort_order: order++, cycle_type: t.cycle_type ?? "recorrente" } });
    const steps: { id: string; key: string }[] = [];
    for (let i = 1; i <= (t.steps ?? 1); i++) steps.push(await prisma.catalog2TaskStep.create({ data: { task_id: ct.id, key: `e${i}`, name: `Etapa ${t.key}-${i}`, sort_order: i } }));
    rows[t.key] = { id: ct.id, steps };
  }
  cleanup.push(async () => {
    await prisma.catalog2DependencyRule.deleteMany({ where: { OR: [{ dependent_product_id: prod.id }, { target_product_id: prod.id }] } });
    await prisma.catalog2Product.update({ where: { id: prod.id }, data: { published_version_id: null } }).catch(() => {});
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: prod.id } });
    await prisma.catalog2Product.delete({ where: { id: prod.id } }).catch(() => {});
  });
  return { prod, ver, tasks: rows };
}
async function contract(companyId: string, c: Awaited<ReturnType<typeof mkCatalog>>) {
  const code = uid();
  const project = await prisma.project.create({ data: { title: `Projeto Dlv ${code}`, project_code: code, company_id: companyId } });
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: c.prod.id, catalog2_version_id: c.ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
  const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
  await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
  cleanup.push(async () => {
    await prisma.taskAttachment.deleteMany({ where: { project_task: { project_id: project.id } } }).catch(() => {});
    await prisma.projectDependencyRule.deleteMany({ where: { project_id: project.id } });
    await prisma.taskDependency.deleteMany({ where: { project_id: project.id } });
    await prisma.projectTask.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentItem.deleteMany({ where: { payment: { project_id: project.id } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { project_id: project.id } });
    await prisma.projectProduct.deleteMany({ where: { project_id: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  });
  const tasks = await prisma.projectTask.findMany({ where: { project_id: project.id }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } } });
  return { project, pp, task: (key: string) => tasks.find((t) => t.catalog2_task!.key === key)! };
}

describe("Pedido 3 · Fase 3 — entregáveis estruturados e dependências", () => {
  let master: Awaited<ReturnType<typeof mkUser>>;
  let token = "";
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
    master = await mkMaster();
    token = tokenFor(master);
    companyId = (await prisma.company.create({ data: { name: `Empresa Dlv ${uid()}` } })).id;
    otherCompanyId = (await prisma.company.create({ data: { name: `Outra Dlv ${uid()}` } })).id;
    cleanup.push(async () => { await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompanyId] } } }).catch(() => {}); });
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const fn of cleanup.reverse()) await fn().catch(() => {});
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("cadastro: cria/edita/remove entregável, liga à etapa, recusa chave repetida e etapa de outra tarefa; nova versão copia tudo", async () => {
    const p = await createProduct({ internal_name: `[TESTE] Dlv API ${uid()}` }, master.id);
    cleanup.push(async () => {
      await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: p.id } });
      await prisma.catalog2Product.delete({ where: { id: p.id } }).catch(() => {});
    });
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const t1 = (await api(`/api/admin/catalog2/versions/${v.id}/tasks`, { method: "POST", token, body: { name: "T1" } })).json;
    const t2 = (await api(`/api/admin/catalog2/versions/${v.id}/tasks`, { method: "POST", token, body: { name: "T2" } })).json;
    const s1 = (await api(`/api/admin/catalog2/tasks/${t1.id}/steps`, { method: "POST", token, body: { name: "E1" } })).json;
    const s2 = (await api(`/api/admin/catalog2/tasks/${t2.id}/steps`, { method: "POST", token, body: { name: "E2" } })).json;

    const d1 = await api(`/api/admin/catalog2/tasks/${t1.id}/deliverables`, { method: "POST", token, body: { name: "Relatório final", type: "arquivo", responsible: "executor", step_id: s1.id, visibility: "agency" } });
    assert.equal(d1.status, 201, JSON.stringify(d1.json));
    assert.equal(d1.json.key, "entregavel-1");
    assert.equal((await api(`/api/admin/catalog2/tasks/${t1.id}/deliverables`, { method: "POST", token, body: { name: "Outro", key: "entregavel-1" } })).status, 422, "chave repetida");
    assert.equal((await api(`/api/admin/catalog2/tasks/${t1.id}/deliverables`, { method: "POST", token, body: { name: "De outra tarefa", step_id: s2.id } })).status, 422, "etapa de outra tarefa");
    assert.equal((await api(`/api/admin/catalog2/tasks/${t1.id}/deliverables`, { method: "POST", token, body: { name: "Tipo ruim", type: "video" } })).status, 400);
    const put = await api(`/api/admin/catalog2/deliverables/${d1.json.id}`, { method: "PUT", token, body: { is_required: false, name: "Relatório final v2" } });
    assert.equal(put.status, 200);

    let detail = (await api(`/api/admin/catalog2/products/${p.id}`, { token })).json;
    const task = detail.versions[0].tasks.find((t: any) => t.id === t1.id);
    assert.equal(task.deliverables.length, 1);
    assert.equal(task.deliverables[0].name, "Relatório final v2");
    assert.equal(task.deliverables[0].step_id, s1.id);

    // nova versão (a partir da publicada) leva os entregáveis e religa a etapa equivalente
    await prisma.catalog2ProductVersion.update({ where: { id: v.id }, data: { state: "publicada", published_at: new Date() } });
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: v.id } });
    assert.equal((await api(`/api/admin/catalog2/products/${p.id}/versions`, { method: "POST", token })).status, 201);
    detail = (await api(`/api/admin/catalog2/products/${p.id}`, { token })).json;
    const draft = detail.versions.find((x: any) => x.state === "rascunho");
    const cloned = draft.tasks.find((t: any) => t.key === task.key);
    assert.equal(cloned.deliverables.length, 1);
    assert.equal(cloned.deliverables[0].step_id, cloned.steps[0].id, "etapa religada na cópia");

    const del = await api(`/api/admin/catalog2/deliverables/${cloned.deliverables[0].id}`, { method: "DELETE", token });
    assert.equal(del.status, 200);
  });

  it("contratação: cada entregável vira um item da tarefa; só aparece para quem a visibilidade permite", async () => {
    const c = await mkCatalog([{ key: "t1", steps: 2 }]);
    await prisma.catalog2TaskDeliverable.createMany({
      data: [
        { task_id: c.tasks.t1.id, step_id: c.tasks.t1.steps[0].id, key: "briefing", name: "Briefing do cliente", type: "texto", responsible: "cliente", visibility: "client", sort_order: 1 },
        { task_id: c.tasks.t1.id, step_id: c.tasks.t1.steps[0].id, key: "arte", name: "Arte final", type: "arquivo", responsible: "executor", visibility: "client", sort_order: 2 },
        { task_id: c.tasks.t1.id, key: "nota", name: "Nota interna", type: "texto", responsible: "lider", visibility: "leader", sort_order: 3, is_required: false },
        { task_id: c.tasks.t1.id, key: "log", name: "Registro do sistema", type: "registro_sistema", responsible: "sistema", visibility: "agency", sort_order: 4, requires_approval: false },
      ],
    });
    const k = await contract(companyId, c);
    const t = k.task("t1");
    const items = await prisma.projectTaskDeliverable.findMany({ where: { project_task_id: t.id }, orderBy: { sort_order: "asc" } });
    assert.deepEqual(items.map((i) => i.key), ["briefing", "arte", "nota", "log"]);
    assert.equal(items[0].project_task_stage_id, t.stages[0].id, "ligado à etapa 1");
    assert.equal(items[2].project_task_stage_id, null);
    assert.deepEqual(items.map((i) => i.status), ["pendente", "pendente", "pendente", "aprovado"], "item do sistema sem aprovação já nasce aprovado");

    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    const stranger = await mkUser("company_user", "empresas", { company_id: otherCompanyId });
    const leader = await mkUser("lider", "lider");
    await prisma.projectTask.update({ where: { id: t.id }, data: { lider_responsavel_id: leader.id } });
    const keys = (r: any) => r.json.data.map((i: any) => i.key);
    const asClient = await api(`/api/project-tasks/${t.id}/deliverables`, { token: tokenFor(client) });
    assert.deepEqual(keys(asClient), ["briefing", "arte"], "cliente não vê o que é de agência/líder");
    assert.equal((await api(`/api/project-tasks/${t.id}/deliverables`, { token: tokenFor(stranger) })).status, 404);
    assert.deepEqual(keys(await api(`/api/project-tasks/${t.id}/deliverables`, { token: tokenFor(leader) })), ["briefing", "arte", "nota", "log"]);
    assert.deepEqual(keys(await api(`/api/project-tasks/${t.id}/deliverables`, { token })), ["briefing", "arte", "nota", "log"]);
    // o que cada um pode enviar
    const cl = asClient.json.data;
    assert.equal(cl.find((i: any) => i.key === "briefing").can_submit, true);
    assert.equal(cl.find((i: any) => i.key === "arte").can_submit, false, "arte é do executor");
  });

  it("envio por tipo, responsável certo, revisão com comentário, reenvio e aprovação automática", async () => {
    const c = await mkCatalog([{ key: "t1" }]);
    await prisma.catalog2TaskDeliverable.createMany({
      data: [
        { task_id: c.tasks.t1.id, key: "arq", name: "Arquivo", type: "arquivo", responsible: "executor", sort_order: 1 },
        { task_id: c.tasks.t1.id, key: "txt", name: "Texto", type: "texto", responsible: "cliente", sort_order: 2 },
        { task_id: c.tasks.t1.id, key: "livre", name: "Livre", type: "link", responsible: "cliente", requires_approval: false, sort_order: 3 },
      ],
    });
    const k = await contract(companyId, c);
    const t = k.task("t1");
    const client = await mkUser("company_user", "empresas", { company_id: companyId });
    const leader = await mkUser("lider", "lider");
    await prisma.projectTask.update({ where: { id: t.id }, data: { lider_responsavel_id: leader.id } });
    const list = async (who: Awaited<ReturnType<typeof mkUser>>) => (await api(`/api/project-tasks/${t.id}/deliverables`, { token: tokenFor(who) })).json.data as any[];
    const idOf = async (key: string) => (await list(leader)).find((i) => i.key === key).id as string;
    const submit = async (who: Awaited<ReturnType<typeof mkUser>> | null, key: string, body: unknown) => api(`/api/project-tasks/${t.id}/deliverables/${await idOf(key)}/submit`, { method: "POST", token: who ? tokenFor(who) : token, body });

    // tipo arquivo exige link válido; texto exige texto; nunca senha
    assert.equal((await submit(leader, "arq", {})).status, 422);
    assert.equal((await submit(leader, "arq", { content_url: "não é link" })).status, 422);
    assert.equal((await submit(leader, "arq", { content_url: "https://drive.example/arte.zip", content_text: "senha: 12345" })).status, 422, "nunca aceita senha");
    assert.equal((await submit(client, "arq", { content_url: "https://drive.example/arte.zip" })).status, 403, "cliente não envia item do executor");
    assert.equal((await submit(client, "txt", {})).status, 422);
    const okTxt = await submit(client, "txt", { content_text: "Nosso público é PME." });
    assert.equal(okTxt.status, 200);
    assert.equal(okTxt.json.status, "enviado");
    const okArq = await submit(leader, "arq", { content_url: "https://drive.example/arte.zip", content_name: "arte.zip" });
    assert.equal(okArq.json.status, "enviado");
    // sem exigir aprovação: já nasce aprovado
    assert.equal((await submit(client, "livre", { content_url: "https://exemplo.com/logo.png" })).json.status, "aprovado");

    // decisão: só líder/admin; reprovar exige comentário; reenviar volta para "enviado"
    const review = async (who: Awaited<ReturnType<typeof mkUser>> | null, key: string, body: unknown) => api(`/api/project-tasks/${t.id}/deliverables/${await idOf(key)}/review`, { method: "POST", token: who ? tokenFor(who) : token, body });
    assert.equal((await review(client, "arq", { decisao: "aprovar" })).status, 403);
    assert.equal((await review(leader, "arq", { decisao: "reprovar" })).status, 422);
    const rej = await review(leader, "arq", { decisao: "reprovar", comentario: "Faltou o logo." });
    assert.equal(rej.json.status, "reprovado");
    const rows = await list(leader);
    assert.equal(rows.find((i) => i.key === "arq").review_comment, "Faltou o logo.");
    assert.equal((await submit(leader, "arq", { content_url: "https://drive.example/arte-v2.zip" })).json.status, "enviado");
    assert.equal((await review(null, "arq", { decisao: "em_revisao" })).json.status, "em_revisao");
    assert.equal((await review(null, "arq", { decisao: "aprovar", comentario: "Ok." })).json.status, "aprovado");
    assert.equal((await submit(leader, "arq", { content_url: "https://drive.example/x.zip" })).status, 409, "aprovado não se reenvia");
  });

  it("entregável obrigatório do executor trava a conclusão da etapa (e da tarefa, quando for da tarefa toda)", async () => {
    const c = await mkCatalog([{ key: "t1", steps: 2 }]);
    await prisma.catalog2TaskDeliverable.createMany({
      data: [
        { task_id: c.tasks.t1.id, step_id: c.tasks.t1.steps[0].id, key: "e1", name: "Print da etapa 1", type: "link", responsible: "executor", sort_order: 1 },
        { task_id: c.tasks.t1.id, key: "final", name: "Relatório da tarefa", type: "texto", responsible: "executor", sort_order: 2 },
        { task_id: c.tasks.t1.id, key: "cli", name: "Material do cliente", type: "link", responsible: "cliente", sort_order: 3 },
      ],
    });
    const k = await contract(companyId, c);
    const t = k.task("t1");
    const leader = await mkUser("lider", "lider");
    await prisma.projectTask.update({ where: { id: t.id }, data: { lider_responsavel_id: leader.id, status: "EM_EXECUCAO" } });
    const [st1, st2] = t.stages;
    await prisma.projectTaskStage.update({ where: { id: st1.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: leader.id } });
    await prisma.projectTaskStage.update({ where: { id: st2.id }, data: { executor_type: "leader", lider_id: leader.id } });

    await assert.rejects(() => concluirEtapa(prisma, st1.id, { userId: leader.id }), /Print da etapa 1/, "falta o item da etapa 1");
    const item = async (key: string) => prisma.projectTaskDeliverable.findFirstOrThrow({ where: { project_task_id: t.id, key } });
    const send = async (key: string, body: Record<string, unknown>) => api(`/api/project-tasks/${t.id}/deliverables/${(await item(key)).id}/submit`, { method: "POST", token: tokenFor(leader), body });
    assert.equal((await send("e1", { content_url: "https://exemplo.com/print.png" })).status, 200);
    const r1 = await concluirEtapa(prisma, st1.id, { userId: leader.id });
    assert.ok(r1.proxima, "etapa 1 concluiu e abriu a 2");
    await prisma.projectTaskStage.update({ where: { id: st2.id }, data: { status: "EM_ANDAMENTO" } });

    // última etapa: precisa do item da TAREFA; o item do cliente NÃO trava o executor
    await assert.rejects(() => concluirEtapa(prisma, st2.id, { userId: leader.id }), /Relatório da tarefa/);
    assert.equal((await send("final", { content_text: "Resumo do trabalho." })).status, 200);
    const r2 = await concluirEtapa(prisma, st2.id, { userId: leader.id });
    assert.equal(r2.enviadaParaAprovacao, true);
    assert.equal((await item("cli")).status, "pendente", "item do cliente continua pendente e não bloqueou ninguém");
  });

  it("dependência por entregável específico: a tarefa espera o item ser APROVADO (não basta enviar)", async () => {
    const c = await mkCatalog([{ key: "criativo" }, { key: "publicar" }]);
    await prisma.catalog2TaskDeliverable.create({ data: { task_id: c.tasks.criativo.id, key: "arte", name: "Arte aprovada", type: "arquivo", responsible: "executor" } });
    const rule = await api(`/api/admin/catalog2/products/${c.prod.id}/prerequisites`, {
      method: "POST", token,
      body: { dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: c.prod.id, target_task_key: "criativo", target_deliverable_key: "arte", behavior: "block_start" },
    });
    assert.equal(rule.status, 201, JSON.stringify(rule.json));
    // entregável inexistente e "esperar por ela mesma" são recusados
    const bad1 = await api(`/api/admin/catalog2/products/${c.prod.id}/prerequisites`, { method: "POST", token, body: { dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: c.prod.id, target_task_key: "criativo", target_deliverable_key: "fantasma" } });
    assert.equal(bad1.status, 422);
    const bad2 = await api(`/api/admin/catalog2/products/${c.prod.id}/prerequisites`, { method: "POST", token, body: { dependent_task_key: "publicar", target_kind: "task", target_product_id: c.prod.id, target_task_key: "publicar" } });
    assert.equal(bad2.status, 422);

    const k = await contract(companyId, c);
    const pub = k.task("publicar");
    const crit = k.task("criativo");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: pub.id } })).status, "PENDENTE_DE_LIBERACAO", "publicar espera a arte");
    const dr = await prisma.projectDependencyRule.findFirstOrThrow({ where: { task_id: pub.id } });
    assert.equal(dr.target_task_id, crit.id, "alvo = tarefa irmã da mesma contratação");
    assert.equal(dr.target_deliverable_key, "arte");

    const leader = await mkUser("lider", "lider");
    await prisma.projectTask.update({ where: { id: crit.id }, data: { lider_responsavel_id: leader.id } });
    const d = await prisma.projectTaskDeliverable.findFirstOrThrow({ where: { project_task_id: crit.id, key: "arte" } });
    await api(`/api/project-tasks/${crit.id}/deliverables/${d.id}/submit`, { method: "POST", token: tokenFor(leader), body: { content_url: "https://exemplo.com/arte.png" } });
    await reevaluateProjectDependencies(prisma, k.project.id);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: pub.id } })).status, "PENDENTE_DE_LIBERACAO", "enviado ainda não libera");
    await api(`/api/project-tasks/${crit.id}/deliverables/${d.id}/review`, { method: "POST", token, body: { decisao: "aprovar" } });
    await reevaluateProjectDependencies(prisma, k.project.id);
    assert.notEqual((await prisma.projectTask.findUniqueOrThrow({ where: { id: pub.id } })).status, "PENDENTE_DE_LIBERACAO", "aprovado libera sozinho");
  });

  it("regra só para um tipo de ciclo: vale na implantação e não na rotina", async () => {
    const c = await mkCatalog([{ key: "diagnostico", cycle_type: "implementacao" }, { key: "config", cycle_type: "implementacao" }, { key: "rotina", cycle_type: "recorrente" }]);
    // a configuração (implantação) espera o diagnóstico, SÓ na implantação
    const r = await api(`/api/admin/catalog2/products/${c.prod.id}/prerequisites`, {
      method: "POST", token,
      body: { dependent_task_key: "config", target_kind: "task", target_product_id: c.prod.id, target_task_key: "diagnostico", applies_to: "implementacao", behavior: "block_start" },
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    // a rotina também espera o diagnóstico, mas a regra é só de implantação → não vale para ela
    const r2 = await api(`/api/admin/catalog2/products/${c.prod.id}/prerequisites`, {
      method: "POST", token,
      body: { dependent_task_key: "rotina", target_kind: "task", target_product_id: c.prod.id, target_task_key: "diagnostico", applies_to: "implementacao", behavior: "block_start" },
    });
    assert.equal(r2.status, 201);
    const k = await contract(companyId, c);
    const rules = await prisma.projectDependencyRule.findMany({ where: { project_id: k.project.id } });
    assert.deepEqual(rules.map((x) => x.task_id).sort(), [k.task("config").id].sort(), "só a tarefa de implantação recebeu a regra");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: k.task("rotina").id } })).status !== "PENDENTE_DE_LIBERACAO", true);
  });
});
