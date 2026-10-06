import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { sweepInternalTaskOverdue } from "../lib/internal-tasks";
import { api, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, mkUser, SEL, startServer, stopServer, tokenFor, uid } from "../test-support/universal-helpers";

// D2 — tarefas internas da conta: quadro da equipe, isolamento entre contas, público configurável, ligação com passo PLAC, aviso de atraso.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const call = (p: string, method = "GET", body?: unknown, token = ADMIN.token) => api(`/api/internal-tasks${p}`, { method, token, body });

async function mkAgency(partner: boolean) {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { name: `[TESTE] IT ${uid()}`, status: "ativo", owner_user_id: owner.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  if (partner) await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active" } as any });
  const colega = await mkUser("agency_user", "agencias", { agency_id: agency.id });
  return { owner, colega, agency, token: tokenFor(owner), colegaToken: tokenFor(colega) };
}
async function projetoPago(co: Awaited<ReturnType<typeof mkCompanyUser>>) {
  const p = await mkProduct({ name: "IT", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
  await api(`/api/admin/catalog2/versions/${p.versionId}/publish`, { method: "POST", token: ADMIN.token, body: { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() } });
  const q = await api("/api/catalog2/quotes", { method: "POST", token: co.token, body: { product: p.product.id, selection: SEL } });
  return (await checkoutAndPay(co.token, [q.json.id])).projectId;
}

describe("D2 · Tarefas internas", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); await call("/settings", "PUT", { audiences: ["agency", "partner"], auto_from_plac: false }); });
  after(async () => { await stopServer(); });

  it("IT01. público configurável: padrão agências (comum e partner); company só se a administração liberar; só admin muda", async () => {
    const co = await mkCompanyUser("IT");
    const ag = await mkAgency(false);
    assert.equal((await call("/", "GET", undefined, co.token)).status, 403, "company bloqueada por padrão");
    assert.equal((await call("/", "GET", undefined, ag.token)).status, 200);
    assert.equal((await call("/settings", "PUT", { audiences: ["company"] }, ag.token)).status, 403);
    assert.equal((await call("/settings", "PUT", { audiences: ["agency", "partner", "company"] })).status, 200);
    assert.equal((await call("/", "GET", undefined, co.token)).status, 200, "liberada para company");
    await call("/settings", "PUT", { audiences: ["agency", "partner"] });
    assert.equal((await call("/", "GET", undefined, co.token)).status, 403);
  });

  it("IT02. quadro da equipe: criar, atribuir a colega, mover, checklist, comentar; outra agência não vê; admin vê tudo; resumo", async () => {
    const a = await mkAgency(true), b = await mkAgency(false);
    const t = await call("/", "POST", { title: "Preparar relatório", priority: "high", due_date: new Date(Date.now() + 86400000).toISOString(), assignee_user_id: a.colega.id, checklist: [{ text: "Coletar dados" }, { text: "Revisar", done: true }] }, a.token);
    assert.equal(t.status, 201, JSON.stringify(t.json));
    assert.equal(t.json.checklist.length, 2);
    assert.equal((await call(`/${t.json.id}`, "PATCH", { status: "doing" }, a.colegaToken)).json.status, "doing", "colega da mesma agência edita");
    assert.equal((await call(`/${t.json.id}/comments`, "POST", { body: "Começando" }, a.colegaToken)).status, 201);
    assert.equal((await call(`/${t.json.id}/comments`, "GET", undefined, a.token)).json.data.length, 1);
    assert.equal((await call(`/${t.json.id}`, "PATCH", { status: "done" }, b.token)).status, 404, "outra agência não enxerga");
    const lista = await call("/", "GET", undefined, a.token);
    assert.equal(lista.json.total, 1);
    const resumo = await call("/summary", "GET", undefined, a.colegaToken);
    assert.deepEqual([resumo.json.open, resumo.json.mine], [1, 1]);
    assert.ok((await call(`/?agency_id=${a.agency.id}`)).json.total >= 1, "admin vê por agência");
    assert.equal((await call(`/${t.json.id}`, "DELETE", undefined, a.colegaToken)).status, 403, "só quem criou (ou admin) exclui");
    assert.equal((await call(`/${t.json.id}`, "DELETE", undefined, a.token)).status, 200);
  });

  it("IT03. responsável precisa ser da mesma conta; projeto precisa ser visível", async () => {
    const a = await mkAgency(false), b = await mkAgency(false);
    assert.equal((await call("/", "POST", { title: "Tarefa", assignee_user_id: b.owner.id }, a.token)).status, 422);
    const co = await mkCompanyUser("IT3");
    const projectId = await projetoPago(co);
    assert.equal((await call("/", "POST", { title: "Projeto alheio", project_id: projectId }, a.token)).status, 404, "agência sem vínculo não usa o projeto");
  });

  it("IT04. passo PLAC vira tarefa interna (idempotente) e conclui junto nos dois sentidos", async () => {
    const co = await mkCompanyUser("IT4");
    await call("/settings", "PUT", { audiences: ["agency", "partner", "company"] });
    const projectId = await projetoPago(co);
    const passo = await prisma.placProjectStep.findFirstOrThrow({ where: { project_id: projectId }, orderBy: { sort_order: "asc" } });
    const c1 = await call(`/from-plac/${passo.id}`, "POST", {}, co.token);
    assert.equal(c1.status, 201, JSON.stringify(c1.json));
    assert.equal((await call(`/from-plac/${passo.id}`, "POST", {}, co.token)).status, 200, "não duplica");
    assert.equal((await call(`/${c1.json.task.id}`, "PATCH", { status: "done" }, co.token)).status, 200);
    assert.equal((await prisma.placProjectStep.findUniqueOrThrow({ where: { id: passo.id } })).status, "concluida");
    assert.equal((await api(`/api/plac/projects/${projectId}/steps/${passo.id}`, { method: "PATCH", token: co.token, body: { status: "pendente" } })).status, 200);
    assert.equal((await prisma.internalTask.findUniqueOrThrow({ where: { id: c1.json.task.id } })).status, "todo");
    await call("/settings", "PUT", { audiences: ["agency", "partner"] });
  });

  it("IT05. tarefa vencida avisa o responsável uma única vez", async () => {
    const a = await mkAgency(false);
    const t = await call("/", "POST", { title: "Atrasada", assignee_user_id: a.colega.id, due_date: new Date(Date.now() - 3600000).toISOString() }, a.token);
    await sweepInternalTaskOverdue(prisma);
    await sweepInternalTaskOverdue(prisma);
    assert.equal(await prisma.systemAlert.count({ where: { type: "internal_task_overdue", entity_id: t.json.id, user_id: a.colega.id } }), 1);
  });
});
