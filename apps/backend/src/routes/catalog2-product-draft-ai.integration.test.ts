import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { __setDraftGeneratorForTests, normalizeDraft } from "../lib/catalog2-product-draft-ai";
import { api, mkAdmin, mkCompanyUser, mkProduct, startServer, stopServer } from "../test-support/universal-helpers";

// P-8 (reunião 07/10): a IA conversa e preenche o produto inteiro (rascunho; nada é salvo até o administrador aplicar).
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const chat = (productId: string, body: unknown, token = ADMIN.token) => api(`/api/admin/catalog2/products/${productId}/ai-draft`, { method: "POST", token, body });

describe("IA que preenche o produto inteiro por conversa (P-8)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("PDA"); });
  after(async () => { __setDraftGeneratorForTests(null); await stopServer(); });

  it("PDA01. normalização respeita os limites do cadastro e limpa as listas", () => {
    const r = normalizeDraft({
      title: "  Gestão de Tráfego ".padEnd(300, "x"), summary: "a".repeat(900), full_description: "b".repeat(5000),
      included_items: ["Plano de mídia", "Plano de mídia", "ab", ...Array.from({ length: 80 }, (_, i) => `Entrega número ${i + 1}`)],
      suggested_tasks: [{ name: "Configurar contas", objective: "x", steps: [{ name: "Instalar pixel", description: "d", completion_criteria: "c" }, { name: "x" }] }, { name: "ab" }],
      reply: "Pronto.", target_audience: "p".repeat(1500), scope: "s".repeat(4500),
      change_policy: "Sem inventar quantidade de revisões.",
    });
    assert.equal(r.draft.title.length, 200);
    assert.equal(r.draft.summary.length, 500);
    assert.equal(r.draft.full_description.length, 2000);
    assert.equal(r.draft.included_items.length, 50, "no máximo 50 itens");
    assert.equal(new Set(r.draft.included_items).size, r.draft.included_items.length);
    assert.ok(!r.draft.included_items.includes("ab"));
    assert.deepEqual(r.draft.suggested_tasks.map((t) => [t.name, t.steps.length]), [["Configurar contas", 1]], "etapa/tarefa curta demais sai");
    assert.equal(r.reply, "Pronto.");
    assert.equal(r.draft.target_audience?.length, 1000);
    assert.equal(r.draft.scope?.length, 4000);
    assert.equal(r.draft.change_policy, "Sem inventar quantidade de revisões.");
  });

  it("PDA: textos comerciais novos são apenas proposta e mantêm o rascunho anterior", async () => {
    const p = await mkProduct({ name: "Proposta textual", tasks: [{ key: "t" }] });
    const before = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    __setDraftGeneratorForTests(async input => {
      assert.equal(input.current?.scope, "Escopo que o usuário já informou");
      return { reply: "Revise o objetivo.", commercial_objective: "Apresentar o serviço com clareza." };
    });
    const result = await chat(p.product.id, { messages: [{ role: "user", text: "Complete os textos vazios sem inventar valores." }], current: { title: "Proposta textual", scope: "Escopo que o usuário já informou", target_audience: "" } });
    assert.equal(result.status, 200);
    assert.equal(result.json.draft.scope, "Escopo que o usuário já informou");
    assert.equal(result.json.draft.commercial_objective, "Apresentar o serviço com clareza.");
    const after = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    assert.equal(after.scope, before.scope);
    assert.equal(after.commercial_objective, before.commercial_objective);
  });

  it("PDA02. conversa em rodadas: o rascunho anterior segue junto, o ajuste pedido muda só o que foi pedido; nada é salvo", async () => {
    const p = await mkProduct({ name: "Produto para IA", tasks: [{ key: "t" }] });
    const antes = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    const vistos: any[] = [];
    __setDraftGeneratorForTests(async (input) => {
      vistos.push(input);
      if (input.current == null) return { reply: "Montei a proposta.", title: "Social Media Premium", summary: "Gestão completa de redes.", full_description: "Planejamento, criação e relatório mensal.", included_items: ["Calendário editorial", "12 posts por mês"], excluded_items: ["Impulsionamento"], client_requirements: ["Acesso às redes"], deliverables_summary: ["Relatório mensal"] };
      return { reply: "Encurtei o resumo.", summary: "Redes gerenciadas ponta a ponta." };
    });
    const r1 = await chat(p.product.id, { messages: [{ role: "user", text: "Produto de social media com calendário e relatório mensal" }] });
    assert.equal(r1.status, 200, JSON.stringify(r1.json));
    assert.equal(r1.json.draft.title, "Social Media Premium");
    assert.deepEqual(r1.json.draft.included_items, ["Calendário editorial", "12 posts por mês"]);
    assert.equal(vistos[0].existing.title.includes("Produto para IA"), true, "a IA sabe o nome já cadastrado");
    const r2 = await chat(p.product.id, { messages: [{ role: "user", text: "Produto de social media" }, { role: "assistant", text: r1.json.reply }, { role: "user", text: "Deixe o resumo mais curto" }], current: r1.json.draft });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.draft.summary, "Redes gerenciadas ponta a ponta.");
    assert.equal(r2.json.draft.title, "Social Media Premium", "o que não foi pedido continua igual");
    assert.deepEqual(r2.json.draft.included_items, ["Calendário editorial", "12 posts por mês"]);
    assert.ok(vistos[1].current && vistos[1].messages.length === 3, "o rascunho e a conversa vão juntos");
    const depois = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } });
    assert.equal(depois.title, antes.title, "a IA só propõe: nada foi gravado na versão");
  });

  it("PDA03. erros claros: sem mensagem do administrador, IA indisponível, resposta inútil, produto inexistente e permissão", async () => {
    const p = await mkProduct({ name: "Produto Y", tasks: [{ key: "t" }] });
    assert.equal((await chat(p.product.id, { messages: [{ role: "assistant", text: "oi" }] })).status, 422);
    __setDraftGeneratorForTests(async () => { throw new Error("cota excedida"); });
    const falha = await chat(p.product.id, { messages: [{ role: "user", text: "Produto de tráfego pago" }] });
    assert.equal(falha.status, 502);
    assert.match(falha.json.error, /cota excedida/);
    __setDraftGeneratorForTests(async () => ({ reply: "ok" }));
    assert.equal((await chat(p.product.id, { messages: [{ role: "user", text: "Produto de tráfego pago" }] })).status, 502, "sem título nem descrição não serve");
    __setDraftGeneratorForTests(async () => ({ title: "X produto", full_description: "Descrição completa do produto" }));
    assert.equal((await chat("nao-existe", { messages: [{ role: "user", text: "Produto de tráfego pago" }] })).status, 404);
    const negado = (await chat(p.product.id, { messages: [{ role: "user", text: "Produto de tráfego pago" }] }, CO.token)).status;
    assert.ok([401, 403, 404].includes(negado), `empresa não usa (status ${negado})`);
  });
});
