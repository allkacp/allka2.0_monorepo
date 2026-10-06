import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// Histórico real da etapa: o que já foi executado em projetos aparece sozinho; etapa nova vem vazia.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

describe("Histórico real da etapa (performance)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("PF"); });
  after(async () => { await stopServer(); });

  it("SP10. etapa nova não tem histórico; depois de contratada e executada, mostra tempo real, atraso e refação", async () => {
    const p = await mkProduct({ name: "Histórico", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 120 }] }] });
    const t = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" }, include: { steps: true } });
    const stepId = t.steps[0].id;
    const vazio = await adm(`/steps/${stepId}/performance`);
    assert.equal(vazio.status, 200, JSON.stringify(vazio.json));
    assert.equal(vazio.json.product.total, 0);
    assert.equal((await adm(`/steps/nao-existe/performance`)).status, 404);

    const pub = await adm(`/versions/${p.versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const task = byKey(await tasksOf(projectId)).t;
    const t0 = new Date("2026-10-01T10:00:00Z");
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id, catalog_step_ref: stepId }, data: { status: "CONCLUIDA", iniciada_em: t0, concluida_em: new Date(t0.getTime() + 5 * 3600000), prazo_execucao: new Date(t0.getTime() + 3 * 3600000), horas_execucao: 2, rodada_ajuste: 1 } });
    const r = await adm(`/steps/${stepId}/performance`);
    assert.equal(r.status, 200);
    assert.equal(r.json.product.concluidas, 1);
    assert.equal(r.json.product.avg_actual_hours, 5);
    assert.equal(r.json.product.late_count, 1);
    assert.equal(r.json.product.avg_delay_hours, 2);
    assert.equal(r.json.product.rework_rate, 1);
    assert.ok(r.json.product.by_execution.humano, "agrupa por tipo de execução");
    assert.equal(r.json.model, null, "etapa sem modelo global: só o histórico do produto");
  });
});
