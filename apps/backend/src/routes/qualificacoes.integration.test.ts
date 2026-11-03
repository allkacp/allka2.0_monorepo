import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Tela única de qualificação: o nômade qualificador (e o líder) só enxergam e decidem o que é deles.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
let projectId = "";
let productId = "";
let taskId = "";
const stageIds: string[] = [];

const tokenFor = (u: { id: string; email: string; role: string; account_type: string }) => jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, { method: opts.method ?? "GET", headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) }, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkUser(kind: "nomad" | "lider" | "empresa") {
  const id = `qal-${crypto.randomBytes(6).toString("hex")}`;
  const map = { nomad: { role: "nomad", account_type: "nomades" }, lider: { role: "lider", account_type: "lider" }, empresa: { role: "company", account_type: "empresas" } }[kind];
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: id, is_active: true, status: "ativo", ...map } });
  users.push(u.id);
  return u;
}

describe("Tela única de qualificação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const l = app.listen(0);
    server = l;
    await new Promise<void>((r) => l.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(l.address() as AddressInfo).port}`;
    const code = crypto.randomBytes(4).toString("hex");
    const project = await prisma.project.create({ data: { title: `Proj qal ${code}`, project_code: code, status: "in-progress" } });
    projectId = project.id;
    const product = await prisma.product.create({ data: { name: `Prod qal ${code}`, category: "QAL" } });
    productId = product.id;
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: "QAL" } });
    const task = await prisma.projectTask.create({ data: { project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name, title: `Tarefa qal ${code}`, category_snapshot: "QAL", status: "EM_ANDAMENTO", stage_execution: "stage" } });
    taskId = task.id;
  });
  after(async () => {
    await prisma.projectTaskStageReview.deleteMany({ where: { stage_id: { in: stageIds } } });
    await prisma.projectTask.deleteMany({ where: { id: taskId } });
    await prisma.projectProduct.deleteMany({ where: { project_id: projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("QAL01. o nômade qualificador vê só as etapas que são dele, abre o que conferir e decide; quem não é dele não decide", async () => {
    const qualifier = await mkUser("nomad");
    const other = await mkUser("nomad");
    const stage = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qal:${crypto.randomBytes(3).toString("hex")}`, titulo: "Montar relatório", ordem: 1, status: "EM_QUALIFICACAO_ESPECIALISTA", exige_qualificacao_especialista: true, especialista_id: qualifier.id, qualificador_pool: true, visivel_ao_cliente: false, entregue_em: new Date() } });
    stageIds.push(stage.id);
    const qTok = tokenFor(qualifier), oTok = tokenFor(other);

    const mine = await api("/api/qualificacoes/pendentes", { token: qTok });
    assert.equal(mine.status, 200, JSON.stringify(mine.json));
    assert.deepEqual(mine.json.data.map((x: any) => x.id), [stage.id]);
    assert.equal(mine.json.data[0].from_pool, true);
    assert.equal((await api("/api/qualificacoes/pendentes", { token: oTok })).json.total, 0, "outro nômade não vê");

    const detail = await api(`/api/qualificacoes/etapas/${stage.id}`, { token: qTok });
    assert.equal(detail.status, 200, JSON.stringify(detail.json));
    assert.equal(detail.json.stage.title, "Montar relatório");
    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}`, { token: oTok })).status, 404);

    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: oTok, body: { decisao: "aprovar" } })).status, 403);
    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: qTok, body: { decisao: "reprovar" } })).status, 422, "pedir ajustes exige explicar");
    const ok = await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: qTok, body: { decisao: "aprovar", comentario: "Conferido" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const after = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } });
    assert.notEqual(after.status, "EM_QUALIFICACAO_ESPECIALISTA", "a etapa seguiu depois da aprovação");
    assert.equal((await api("/api/qualificacoes/pendentes", { token: qTok })).json.total, 0);
  });

  it("QAL02. o líder da tarefa vê e qualifica as etapas em qualificação; o cliente não acessa", async () => {
    const leader = await mkUser("lider");
    const client = await mkUser("empresa");
    await prisma.projectTask.update({ where: { id: taskId }, data: { lider_responsavel_id: leader.id } });
    const stage = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qal:${crypto.randomBytes(3).toString("hex")}`, titulo: "Conferir briefing", ordem: 2, status: "EM_QUALIFICACAO", exige_qualificacao: true, visivel_ao_cliente: false, entregue_em: new Date() } });
    stageIds.push(stage.id);
    const lTok = tokenFor(leader);
    const mine = await api("/api/qualificacoes/pendentes", { token: lTok });
    assert.ok(mine.json.data.some((x: any) => x.id === stage.id && x.kind === "qualificacao"));
    assert.equal((await api("/api/qualificacoes/pendentes", { token: tokenFor(client) })).json.total, 0);
    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: tokenFor(client), body: { decisao: "aprovar" } })).status, 403);
    const ok = await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: lTok, body: { decisao: "aprovar" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
  });

  it("QAL03 (31/10). a pessoa específica que EXECUTOU a etapa não confere a própria entrega: some da lista dela e a decisão é recusada", async () => {
    const doer = await mkUser("nomad");
    const stage = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qal:${crypto.randomBytes(3).toString("hex")}`, titulo: "Auditar SEO", ordem: 3, status: "EM_QUALIFICACAO_ESPECIALISTA", exige_qualificacao_especialista: true, especialista_id: doer.id, nomade_id: doer.id, concluida_por: doer.id, visivel_ao_cliente: false, entregue_em: new Date() } });
    stageIds.push(stage.id);
    const tok = tokenFor(doer);
    assert.equal((await api("/api/qualificacoes/pendentes", { token: tok })).json.total, 0, "não aparece para quem executou");
    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}`, { token: tok })).status, 404);
    assert.equal((await api(`/api/qualificacoes/etapas/${stage.id}/decisao`, { method: "POST", token: tok, body: { decisao: "aprovar" } })).status, 403);
    assert.equal((await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } })).status, "EM_QUALIFICACAO_ESPECIALISTA", "nada mudou");
  });

  it("QAL04 (31/10). na entrega, se a pessoa indicada para qualificar é o próprio executor, a conferência vai para o líder (com motivo no histórico); com líder + pessoa, depois do líder ela é dispensada", async () => {
    const { concluirEtapa } = await import("../lib/stage-engine");
    const leader = await mkUser("lider");
    const doer = await mkUser("nomad");
    await prisma.projectTask.update({ where: { id: taskId }, data: { lider_responsavel_id: leader.id } });

    // Só a pessoa específica (que é o executor) → vai para o líder.
    const s1 = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qal:${crypto.randomBytes(3).toString("hex")}`, titulo: "Aplicar ajustes", ordem: 4, status: "EM_ANDAMENTO", exige_qualificacao_especialista: true, especialista_id: doer.id, nomade_id: doer.id, visivel_ao_cliente: false } });
    stageIds.push(s1.id);
    const r1 = await concluirEtapa(prisma, s1.id, { userId: doer.id });
    assert.equal(r1.enviadaParaQualificacao, true);
    const a1 = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: s1.id } });
    assert.equal(a1.status, "EM_QUALIFICACAO", "foi para o líder, não para o próprio executor");
    assert.equal(a1.exige_qualificacao_especialista, false);
    const h1 = await prisma.projectTaskStageReview.findFirstOrThrow({ where: { stage_id: s1.id }, orderBy: { created_at: "desc" } });
    assert.match(h1.comment ?? "", /executou esta etapa/);
    const lTok = tokenFor(leader);
    assert.ok((await api("/api/qualificacoes/pendentes", { token: lTok })).json.data.some((x: any) => x.id === s1.id), "o líder vê");
    assert.equal((await api("/api/qualificacoes/pendentes", { token: tokenFor(doer) })).json.total, 0, "o executor não vê");

    // Líder + pessoa (a pessoa é o executor): o líder aprova e a etapa segue sem a segunda conferência.
    const s2 = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qal:${crypto.randomBytes(3).toString("hex")}`, titulo: "Revisar relatório", ordem: 5, status: "EM_QUALIFICACAO", exige_qualificacao: true, exige_qualificacao_especialista: true, especialista_id: doer.id, nomade_id: doer.id, concluida_por: doer.id, visivel_ao_cliente: false, entregue_em: new Date() } });
    stageIds.push(s2.id);
    const ok = await api(`/api/qualificacoes/etapas/${s2.id}/decisao`, { method: "POST", token: lTok, body: { decisao: "aprovar" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const a2 = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: s2.id } });
    assert.notEqual(a2.status, "EM_QUALIFICACAO_ESPECIALISTA", "não voltou para o próprio executor conferir");
    assert.ok(await prisma.projectTaskStageReview.findFirst({ where: { stage_id: s2.id, kind: "especialista", decision: "dispensada" } }), "dispensa registrada");
    assert.notEqual(ok.json.status, "EM_QUALIFICACAO_ESPECIALISTA", "a resposta diz o estado real");
  });
});
