import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { api, byKey, checkoutAndPay, mkAdmin, mkCompanyUser, mkProduct, mkUser, SEL, startServer, stopServer, tasksOf, tokenFor, uid } from "../test-support/universal-helpers";

// A9: quem executa (nômade de qualquer etapa) lê o questionário do cliente; quem não tem etapa nem tarefa, não.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
async function mkNomade() {
  const user = await mkUser("nomad", "nomades");
  const nomade = await prisma.nomade.create({ data: { id: `nm-${uid()}`, name: "Nômade A9", email: `${user.id}@example.test`, user_id: user.id } });
  return { user, nomade, token: tokenFor(user) };
}

describe("Questionário visível a quem executa (A9)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("A9"); });
  after(async () => { await stopServer(); });

  it("BR01. nômade com etapa na tarefa lê perguntas e respostas; outro nômade recebe 404; cliente continua lendo", async () => {
    const p = await mkProduct({ name: "Briefing", tasks: [{ key: "t", steps: [{ key: "s1", minutes: 30 }, { key: "s2", minutes: 30 }], data: { stage_execution: "stage" } }] });
    const pub = await api(`/api/admin/catalog2/versions/${p.versionId}/publish`, { method: "POST", token: ADMIN.token, body: { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() } });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
    const { projectId } = await checkoutAndPay(CO.token, [q.json.id]);
    const task = byKey(await tasksOf(projectId)).t;
    await prisma.projectTask.update({ where: { id: task.id }, data: { briefing_snapshot: JSON.stringify([{ question_key: "obj", question_text: "Qual o objetivo?" }]) } });
    await prisma.taskBriefingAnswer.create({ data: { project_task_id: task.id, question_key: "obj", question_text: "Qual o objetivo?", answer: "Vender mais" } });
    const dono = await mkNomade(), outro = await mkNomade();
    const st = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: task.id }, orderBy: { ordem: "asc" } });
    await prisma.projectTaskStage.update({ where: { id: st.id }, data: { nomade_id: dono.nomade.id } });
    const ok = await api(`/api/project-tasks/${task.id}/briefing`, { token: dono.token });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(ok.json.answers[0].answer, "Vender mais");
    assert.equal((await api(`/api/project-tasks/${task.id}/briefing`, { token: outro.token })).status, 404);
    assert.equal((await api(`/api/project-tasks/${task.id}/briefing`, { token: CO.token })).status, 200);
    // nômade não grava resposta do cliente
    const put = await api(`/api/project-tasks/${task.id}/briefing`, { method: "PUT", token: dono.token, body: { answers: [{ question_key: "obj", question_text: "x", answer: "hack" }] } });
    assert.equal(put.status, 404);
  });
});
