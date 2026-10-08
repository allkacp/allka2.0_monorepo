import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkProduct, startServer, stopServer } from "../test-support/universal-helpers";

// Teste com a IA REAL (Gemini). Só roda com REAL_AI=1 (gasta alguns centavos): `REAL_AI=1 bash scratch/uni/regress_uni.sh src/routes/catalog2-real-ai.integration.test.ts`
const ON = process.env.REAL_AI === "1";
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

describe("IA real (Gemini): preencher produto e sugerir questionário", { skip: !ON }, () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  after(async () => { await stopServer(); });

  it("REAL01. conversa de preenchimento do produto devolve um rascunho utilizável e aceita um ajuste", async () => {
    const p = await mkProduct({ name: "Gestão de Tráfego", tasks: [{ key: "t" }] });
    const r1 = await adm(`/products/${p.product.id}/ai-draft`, "POST", { messages: [{ role: "user", text: "Produto mensal de gestão de tráfego pago no Meta Ads e Google Ads para lojas de e-commerce. Inclui configuração de pixel, criação de campanhas de remarketing e relatório quinzenal. O cliente precisa ter contas de anúncio e catálogo de produtos." }] });
    assert.equal(r1.status, 200, JSON.stringify(r1.json));
    const d = r1.json.draft;
    console.log("TÍTULO:", d.title, "| itens:", d.included_items.length, "| não incluídos:", d.excluded_items.length, "| requisitos:", d.client_requirements.length, "| tarefas:", d.suggested_tasks.length, "| resumo:", d.summary.length, "carac.");
    assert.ok(d.title.length >= 5 && d.title.length <= 200);
    assert.ok(d.summary.length >= 20 && d.summary.length <= 500);
    assert.ok(d.full_description.length >= 100 && d.full_description.length <= 2000);
    assert.ok(d.included_items.length >= 2, "lista de incluídos");
    assert.ok(d.suggested_tasks.length >= 1 && d.suggested_tasks[0].steps.length >= 1, "sugere tarefa com etapas");
    assert.ok(r1.json.reply.length > 5);
    const r2 = await adm(`/products/${p.product.id}/ai-draft`, "POST", { messages: [{ role: "user", text: "Produto mensal de gestão de tráfego pago" }, { role: "assistant", text: r1.json.reply }, { role: "user", text: "Deixe a descrição curta com no máximo 120 caracteres." }], current: d });
    assert.equal(r2.status, 200, JSON.stringify(r2.json));
    console.log("RESUMO AJUSTADO:", r2.json.draft.summary.length, "carac. →", r2.json.draft.summary);
    assert.ok(r2.json.draft.summary.length <= 200, "o ajuste foi aplicado (resumo bem mais curto)");
    assert.equal(await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } }).then((v) => v.title), "Gestão de Tráfego", "só propõe: nada gravado");
  });

  it("REAL02. sugestão de questionário lê o cadastro e devolve perguntas válidas, sem pedir senha", async () => {
    const p = await mkProduct({ name: "Gestão de Anúncios Meta Ads", tasks: [{ key: "t", steps: [{ key: "pixel", name: "Instalar o pixel de conversão", minutes: 60 }, { key: "camp", name: "Criar campanhas de remarketing", minutes: 90 }] }] });
    await prisma.catalog2ProductVersion.update({ where: { id: p.versionId }, data: { summary: "Gestão mensal de campanhas pagas no Meta Ads", full_description: "Inclui configuração do pixel, campanhas de remarketing, otimização semanal e relatório quinzenal de resultados." } });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" } });
    const r = await adm(`/tasks/${task.id}/questionnaire/ai-suggest`, "POST", {});
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const qs = r.json.questions;
    console.log("PERGUNTAS:", qs.length); for (const q of qs) console.log(" -", q.question_type, q.is_required ? "*" : " ", q.label);
    assert.ok(qs.length >= 3 && qs.length <= 15);
    assert.ok(qs.every((q: any) => q.label.length >= 8 && q.key));
    assert.ok(!qs.some((q: any) => /senha|password|token/i.test(q.label)), "não pede senha");
    assert.ok(qs.some((q: any) => /pixel|campanha|remarketing|público|orçamento|verba|meta/i.test(q.label)), "usa o que está cadastrado");
  });
});
