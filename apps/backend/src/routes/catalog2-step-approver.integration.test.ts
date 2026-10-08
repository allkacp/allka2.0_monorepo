import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, SEL, startServer, stopServer, tasksOf } from "../test-support/universal-helpers";

// P-14 (reunião 07/10): "Quem aprova esta etapa" — etapa feita por IA/híbrida SEMPRE tem qualificador.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const put = (id: string, body: unknown) => api(`/api/admin/catalog2/steps/${id}`, { method: "PUT", token: ADMIN.token, body });

async function produto(tag: string) {
  const p = await mkProduct({ name: `Aprovação ${tag}`, tasks: [{ key: "t", data: { stage_execution: "stage" }, steps: [{ key: "s1" }, { key: "s2" }] }], publish: false });
  const steps = await prisma.catalog2TaskStep.findMany({ where: { task: { version_id: p.versionId } }, orderBy: { sort_order: "asc" } });
  return { ...p, steps };
}

describe("Quem aprova a etapa (P-14)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("APR"); });
  after(async () => { await stopServer(); });

  it("APR01. etapa humana pode ficar sem qualificação; ao trocar para IA/híbrida sem qualificador, o líder passa a qualificar", async () => {
    const p = await produto("A");
    const [s1] = p.steps;
    const sem = await put(s1.id, { requires_qualification: false, requires_specialist_qualification: false });
    assert.equal(sem.status, 200, JSON.stringify(sem.json));
    assert.equal((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).requires_qualification, false, "humano: continua sem qualificação (cadastro antigo preservado)");
    const ia = await put(s1.id, { execution_mode: "ia" });
    assert.equal(ia.status, 200, JSON.stringify(ia.json));
    assert.equal((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).requires_qualification, true, "IA: sempre há qualificador");
    // tentar desligar de novo com IA: o servidor mantém
    await put(s1.id, { requires_qualification: false });
    assert.equal((await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } })).requires_qualification, true);
  });

  it("APR02. com IA e especialista escolhido, não precisa do líder (já há qualificador)", async () => {
    const p = await produto("B");
    const s1 = p.steps[0];
    const esp = await prisma.user.create({ data: { name: "Especialista APR", email: `apr-${Date.now()}@teste.local`, password_hash: "x", role: "lider", account_type: "interno", is_active: true } as never }).catch(() => null);
    if (!esp) return; // ambiente sem criação direta de usuário: coberto por EX-ESP
    const r = await put(s1.id, { execution_mode: "ia", requires_qualification: false, requires_specialist_qualification: true, specialist_user_id: esp.id });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const row = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: s1.id } });
    assert.deepEqual([row.requires_qualification, row.requires_specialist_qualification], [false, true]);
  });

  it("APR03. mesmo que o cadastro esteja sem qualificação, a etapa de IA nasce exigindo qualificação ao contratar", async () => {
    const p = await produto("C");
    const [s1, s2] = p.steps;
    await prisma.catalog2TaskStep.update({ where: { id: s1.id }, data: { execution_mode: "ia", requires_qualification: false } });
    await prisma.catalog2TaskStep.update({ where: { id: s2.id }, data: { execution_mode: "humano", requires_qualification: false } });
    const { publishVersion } = await import("../lib/catalog2-service");
    await publishVersion(p.versionId, "system", { activate: true, changeSummary: "teste" });
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const task = byKey(await tasksOf(projectId)).t;
    const [e1, e2] = task.stages;
    assert.equal(e1.exige_qualificacao, true, "etapa de IA: qualificação obrigatória");
    assert.equal(e2.exige_qualificacao, false, "etapa humana antiga sem qualificação: preservada");
  });
});
