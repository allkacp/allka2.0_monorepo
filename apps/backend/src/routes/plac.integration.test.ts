import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { computeDueDates, sweepPlacOverdue } from "../lib/plac";
import { api, checkoutAndPay, mkAdmin, mkCompanyUser, mkLeader, mkProduct, SEL, startServer, stopServer } from "../test-support/universal-helpers";

// PLAC (13 passos): projeto pago abre o cronograma; modelo editável; público por tipo de comprador; acompanhamento no projeto; cobrança interna.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let LEADER: Awaited<ReturnType<typeof mkLeader>>;
const adm = (p: string, method = "GET", body?: unknown, token = ADMIN.token) => api(`/api/plac${p}`, { method, token, body });

async function projetoPago(co: Awaited<ReturnType<typeof mkCompanyUser>>) {
  const p = await mkProduct({ name: "PLAC", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 60 }] }] });
  const pub = await api(`/api/admin/catalog2/versions/${p.versionId}/publish`, { method: "POST", token: ADMIN.token, body: { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() } });
  assert.equal(pub.status, 200, JSON.stringify(pub.json));
  const q = await api("/api/catalog2/quotes", { method: "POST", token: co.token, body: { product: p.product.id, selection: SEL } });
  const { projectId } = await checkoutAndPay(co.token, [q.json.id]);
  return projectId;
}

describe("PLAC · 13 passos", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); LEADER = await mkLeader(); });
  after(async () => { await stopServer(); });

  it("PL01. prazos: depois do passo indicado ou do pagamento (D+N); referência quebrada conta do pagamento", () => {
    const paid = new Date("2026-10-01T12:00:00Z");
    const d = computeDueDates([{ key: "a", after_key: null, offset_days: 1 }, { key: "b", after_key: "a", offset_days: 2 }, { key: "c", after_key: "nao_existe", offset_days: 3 }, { key: "x", after_key: "y", offset_days: 1 }, { key: "y", after_key: "x", offset_days: 1 }], paid);
    assert.equal(d.get("a")!.toISOString(), "2026-10-02T12:00:00.000Z");
    assert.equal(d.get("b")!.toISOString(), "2026-10-04T12:00:00.000Z");
    assert.equal(d.get("c")!.toISOString(), "2026-10-04T12:00:00.000Z");
    assert.ok(d.get("x") && d.get("y"), "círculo não trava");
  });

  it("PL02. pagou → abre os 13 passos do modelo, com prazos a partir do pagamento; segunda confirmação não duplica", async () => {
    const co = await mkCompanyUser("PL");
    const projectId = await projetoPago(co);
    const rows = await prisma.placProjectStep.findMany({ where: { project_id: projectId }, orderBy: { sort_order: "asc" } });
    assert.equal(rows.length, 13);
    assert.equal(rows[0].name, "Agendamento de Briefing");
    assert.ok(rows.every((r) => r.due_at && r.status === "pendente"));
    assert.ok(rows[1].due_at!.getTime() > rows[0].due_at!.getTime(), "o 2º vem depois do 1º");
    const v = await adm(`/projects/${projectId}`, "GET", undefined, co.token);
    assert.equal(v.status, 200, JSON.stringify(v.json));
    assert.equal(v.json.steps.length, 13);
    assert.equal(v.json.progress.percent, 0);
    const outro = await mkCompanyUser("PL2");
    assert.equal((await adm(`/projects/${projectId}`, "GET", undefined, outro.token)).status, 404, "outra empresa não vê");
    const again = await adm(`/projects/${projectId}/generate`, "POST");
    assert.equal(again.json.created, 0, "idempotente");
  });

  it("PL03. administração edita o modelo: prazo, quem faz, responsáveis internos e para quem vale (partner não vale para company); passo novo e excluir", async () => {
    const lista = await adm("/templates");
    assert.equal(lista.status, 200);
    const t = lista.json.data.find((x: any) => x.key === "reuniao_briefing");
    const salvo = await adm(`/templates/${t.key}`, "PUT", { name: t.name, role: "vc", phase: "inicio", after_key: "agendamento_briefing", offset_days: 5, estimated_hours: 1, audiences: ["partner"], internal_user_ids: [LEADER.user.id] });
    assert.equal(salvo.status, 200, JSON.stringify(salvo.json));
    assert.deepEqual(salvo.json.audiences, ["partner"]);
    assert.equal((await adm(`/templates/${t.key}`, "PUT", { name: t.name, role: "vc", phase: "inicio", after_key: "reuniao_resultados_upsell", offset_days: 1 })).status, 422, "círculo é recusado");
    const co = await mkCompanyUser("PL3");
    const projectId = await projetoPago(co);
    assert.equal(await prisma.placProjectStep.count({ where: { project_id: projectId } }), 12, "passo só para partner não abre para company");
    // volta para todos e cria um passo novo
    await adm(`/templates/${t.key}`, "PUT", { name: t.name, role: "vc", phase: "inicio", after_key: "agendamento_briefing", offset_days: 2, audiences: [] });
    const novo = await adm("/templates", "POST", { name: "Passo extra de teste", role: "other", phase: "fim", offset_days: 7, audiences: ["company"] });
    assert.equal(novo.status, 201);
    const gen = await adm(`/projects/${projectId}/generate`, "POST");
    assert.equal(gen.json.created, 2, "completa o que faltava (o que voltou a valer + o novo)");
    assert.equal((await adm(`/templates/${novo.json.key}`, "DELETE")).status, 200);
    const comum = await adm("/templates", "GET", undefined, co.token);
    assert.equal(comum.status, 403, "só a administração configura");
  });

  it("PL04. quem acompanha o projeto conclui o passo e vê o progresso; só admin muda prazo/responsável", async () => {
    const co = await mkCompanyUser("PL4");
    const projectId = await projetoPago(co);
    const v = await adm(`/projects/${projectId}`, "GET", undefined, co.token);
    const passo = v.json.steps[0];
    const ok = await adm(`/projects/${projectId}/steps/${passo.id}`, "PATCH", { status: "concluida", note: "feito" }, co.token);
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(ok.json.step.status, "concluida");
    assert.equal(ok.json.progress.done, 1);
    assert.equal((await adm(`/projects/${projectId}/steps/${passo.id}`, "PATCH", { due_at: new Date().toISOString() }, co.token)).status, 403);
    const novoPrazo = await adm(`/projects/${projectId}/steps/${v.json.steps[1].id}`, "PATCH", { due_at: new Date(Date.now() + 86400000).toISOString(), internal_user_ids: [LEADER.user.id] });
    assert.equal(novoPrazo.status, 200);
    assert.deepEqual(novoPrazo.json.step.internal_user_ids, [LEADER.user.id]);
  });

  it("PL05. passo vencido avisa os responsáveis internos uma única vez", async () => {
    const co = await mkCompanyUser("PL5");
    const projectId = await projetoPago(co);
    const passo = await prisma.placProjectStep.findFirstOrThrow({ where: { project_id: projectId }, orderBy: { sort_order: "asc" } });
    await prisma.placProjectStep.update({ where: { id: passo.id }, data: { due_at: new Date(Date.now() - 3600000), internal_user_ids: JSON.stringify([LEADER.user.id]), overdue_alerted_at: null } });
    await sweepPlacOverdue(prisma);
    assert.equal(await prisma.systemAlert.count({ where: { type: "plac_step_overdue", user_id: LEADER.user.id, message: { contains: passo.name } } }), 1);
    await sweepPlacOverdue(prisma);
    assert.equal(await prisma.systemAlert.count({ where: { type: "plac_step_overdue", user_id: LEADER.user.id, message: { contains: passo.name } } }), 1, "não repete");
  });
});
