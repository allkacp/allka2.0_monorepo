import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, mkProduct, SEL, startServer, stopServer } from "../test-support/universal-helpers";

// D-2 (reunião 07/10): produto SOB CONSULTA não contrata direto — o cliente solicita orçamento respondendo ao questionário;
// a equipe responde com valor e prazo; o cliente aprova ou recusa.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let OUTRA: Awaited<ReturnType<typeof mkCompanyUser>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const cli = (p: string, method = "GET", body?: unknown, token = CO.token) => api(`/api/catalog2${p}`, { method, token, body });

async function produtoSobConsulta() {
  const p = await mkProduct({ name: "Consultoria sob medida", tasks: [{ key: "t" }], flags: { pricing_mode: "on_request" }, publish: true });
  const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: p.versionId, key: "t" } });
  const q = await prisma.catalog2Questionnaire.create({
    data: {
      name: "Briefing do orçamento",
      questions: {
        create: [
          { key: "objetivo", label: "Qual é o objetivo do projeto?", is_required: true, sort_order: 1, question_type: "texto_longo" },
          { key: "verba", label: "Qual a verba mensal?", is_required: false, sort_order: 2, question_type: "moeda" },
          { key: "plataforma", label: "Quais plataformas usa?", is_required: true, sort_order: 3, question_type: "selecao_multipla", options_json: JSON.stringify(["Meta", "Google"]) },
          { key: "margem", label: "Margem interna esperada", is_required: true, sort_order: 4, question_type: "numero", visibility: "internal" },
        ],
      },
    },
    include: { questions: true },
  });
  await prisma.catalog2Task.update({ where: { id: task.id }, data: { questionnaire_id: q.id } });
  const id = Object.fromEntries(q.questions.map((x) => [x.key, x.id]));
  return { ...p, id };
}

describe("Produto sob consulta → solicitar orçamento (D-2)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("OR1"); OUTRA = await mkCompanyUser("OR2"); });
  after(async () => { await stopServer(); });

  it("OR01. sob consulta não contrata direto (cotação e cesta recusadas); o cliente recebe só as perguntas visíveis a ele", async () => {
    const p = await produtoSobConsulta();
    const quote = await cli("/quotes", "POST", { product: p.product.id, selection: SEL });
    assert.equal(quote.status, 409);
    assert.equal(quote.json.code, "not_quotable");
    assert.ok((await cli("/cart", "POST", { product: p.product.id, selection: SEL })).status >= 400, "nem entra na cesta");
    const qs = await cli(`/products/${p.product.slug}/request-questionnaire`);
    assert.equal(qs.status, 200, JSON.stringify(qs.json));
    assert.deepEqual(qs.json.questions.map((x: any) => x.label), ["Qual é o objetivo do projeto?", "Qual a verba mensal?", "Quais plataformas usa?"], "pergunta interna não aparece");
    assert.deepEqual(qs.json.questions[2].options.map((o: any) => o.value), ["Meta", "Google"]);
  });

  it("OR02. solicitar exige as respostas obrigatórias e válidas; grava as respostas; avisa a administração; repetir devolve o pedido aberto", async () => {
    const p = await produtoSobConsulta();
    const base = { product: p.product.id, selection: SEL };
    const sem = await cli("/commercial-requests", "POST", { ...base, answers: { [p.id.verba]: "5000" } });
    assert.equal(sem.status, 422);
    assert.equal(sem.json.code, "request_answers_invalid");
    assert.match(sem.json.error, /objetivo/i);
    const fora = await cli("/commercial-requests", "POST", { ...base, answers: { [p.id.objetivo]: "Vender mais", [p.id.plataforma]: ["TikTok"] } });
    assert.equal(fora.status, 422, "escolha fora das opções");
    const nao = await cli("/commercial-requests", "POST", { ...base, answers: { [p.id.objetivo]: "Vender mais", [p.id.verba]: "muito", [p.id.plataforma]: ["Meta"] } });
    assert.equal(nao.status, 422, "número inválido");
    const ok = await cli("/commercial-requests", "POST", { ...base, note: "Urgente", answers: { [p.id.objetivo]: "Vender mais", [p.id.verba]: "5000", [p.id.plataforma]: ["Meta", "Google"] } });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.equal(ok.json.status, "novo");
    assert.equal(ok.json.proposal, null, "sem proposta ainda");
    assert.deepEqual(ok.json.answers.map((a: any) => [a.label, a.answer]), [["Qual é o objetivo do projeto?", "Vender mais"], ["Qual a verba mensal?", "5000"], ["Quais plataformas usa?", "Meta, Google"]]);
    const alerta = await prisma.systemAlert.count({ where: { type: "pedido_orcamento", entity_id: ok.json.id, user_id: ADMIN.user.id } });
    assert.ok(alerta >= 1, "a administração foi avisada");
    const de_novo = await cli("/commercial-requests", "POST", { ...base, answers: { [p.id.objetivo]: "Outro", [p.id.plataforma]: ["Meta"] } });
    assert.equal(de_novo.json.id, ok.json.id);
    assert.equal(de_novo.json.already_existed, true);
    // a equipe enxerga as respostas
    const fila = await adm("/commercial-requests?status=novo");
    const linha = fila.json.data.find((r: any) => r.id === ok.json.id);
    assert.equal(linha.answers.length, 3);
  });

  it("OR03. proposta: só envia com preço e prazo; o cliente vê o valor só depois de enviada; aprova ou recusa; outra empresa não responde; validade vencida expira", async () => {
    const p = await produtoSobConsulta();
    const sol = await cli("/commercial-requests", "POST", { product: p.product.id, selection: SEL, answers: { [p.id.objetivo]: "Vender mais", [p.id.plataforma]: ["Meta"] } });
    assert.equal(sol.status, 201, JSON.stringify(sol.json));
    const id = sol.json.id as string;
    const semValor = await adm(`/commercial-requests/${id}`, "PATCH", { status: "proposta_enviada" });
    assert.equal(semValor.status, 422);
    assert.equal(semValor.json.code, "proposal_incomplete");
    // preparada: o cliente ainda NÃO vê o valor
    await adm(`/commercial-requests/${id}`, "PATCH", { status: "proposta_preparada", proposed_price: 7800, proposed_deadline_days: 20 });
    const preparada = (await cli("/commercial-requests")).json.data.find((r: any) => r.id === id);
    assert.equal(preparada.proposal, null, "valor escondido até a proposta ser enviada");
    assert.equal(preparada.can_respond, false);
    assert.equal((await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "aprovar" })).status, 409, "ainda não há proposta para responder");
    // enviada
    const futuro = new Date(Date.now() + 7 * 86400000).toISOString();
    assert.equal((await adm(`/commercial-requests/${id}`, "PATCH", { status: "proposta_enviada", proposal_valid_until: futuro })).status, 200);
    assert.ok((await prisma.systemAlert.count({ where: { type: "pedido_orcamento", entity_id: id, user_id: CO.user.id } })) >= 1, "o cliente foi avisado da proposta");
    const enviada = (await cli("/commercial-requests")).json.data.find((r: any) => r.id === id);
    assert.deepEqual([enviada.proposal.proposed_price, enviada.proposal.proposed_deadline_days, enviada.can_respond], [7800, 20, true]);
    assert.equal((await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "aprovar" }, OUTRA.token)).status, 404, "outra empresa não responde");
    const ap = await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "aprovar", note: "Fechado" });
    assert.equal(ap.status, 200, JSON.stringify(ap.json));
    assert.equal(ap.json.status, "aprovado");
    assert.equal(ap.json.client_response_note, "Fechado");
    assert.equal((await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "recusar" })).status, 409, "já respondida");
    assert.ok((await prisma.systemAlert.count({ where: { type: "pedido_orcamento", entity_id: id, user_id: ADMIN.user.id, title: "Cliente aprovou o orçamento" } })) >= 1, "a equipe é avisada para formalizar");
    // recusar
    const sol2 = await cli("/commercial-requests", "POST", { product: p.product.id, selection: SEL, answers: { [p.id.objetivo]: "Outro", [p.id.plataforma]: ["Google"] }, note: "2" });
    assert.equal(sol2.status, 201, JSON.stringify(sol2.json));
    await adm(`/commercial-requests/${sol2.json.id}`, "PATCH", { status: "proposta_enviada", proposed_price: 100, proposed_deadline_days: 5 });
    assert.equal((await cli(`/commercial-requests/${sol2.json.id}/respond`, "POST", { decision: "recusar", note: "Caro" })).json.status, "recusado");
    // validade vencida
    const sol3 = await cli("/commercial-requests", "POST", { product: p.product.id, selection: SEL, answers: { [p.id.objetivo]: "Terceiro", [p.id.plataforma]: ["Google"] } });
    await adm(`/commercial-requests/${sol3.json.id}`, "PATCH", { status: "proposta_enviada", proposed_price: 100, proposed_deadline_days: 5, proposal_valid_until: new Date(Date.now() - 86400000).toISOString() });
    const venc = await cli(`/commercial-requests/${sol3.json.id}/respond`, "POST", { decision: "aprovar" });
    assert.equal(venc.status, 409);
    assert.equal(venc.json.code, "proposal_expired");
    assert.equal((await prisma.catalog2CommercialRequest.findUniqueOrThrow({ where: { id: sol3.json.id } })).status, "expirado");
  });

  it("OR04. equipe gera a contratação do pedido aprovado: cotação travada no valor aprovado (7 dias), cliente paga no checkout, projeto/tarefa nascem e as respostas viram briefing", async () => {
    const p = await produtoSobConsulta();
    const sol = await cli("/commercial-requests", "POST", { product: p.product.id, selection: SEL, answers: { [p.id.objetivo]: "Vender mais no Natal", [p.id.plataforma]: ["Meta"] } });
    assert.equal(sol.status, 201, JSON.stringify(sol.json));
    const id = sol.json.id as string;
    const gen = (token = ADMIN.token) => api(`/api/admin/catalog2/commercial-requests/${id}/generate-contract`, { method: "POST", token, body: {} });
    assert.equal((await gen()).status, 409, "ainda não foi aprovado pelo cliente");
    await adm(`/commercial-requests/${id}`, "PATCH", { status: "proposta_enviada", proposed_price: 7800, proposed_deadline_days: 20 });
    assert.equal((await gen()).status, 409, "proposta só enviada");
    assert.equal((await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "aprovar" })).status, 200);
    assert.ok([401, 403, 404].includes((await gen(CO.token)).status), "só a equipe gera");

    const g = await gen();
    assert.equal(g.status, 201, JSON.stringify(g.json));
    const quote = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: g.json.quote_id } });
    assert.equal(quote.commercial_price, 7800);
    assert.equal(quote.commercial_deadline_days, 20);
    assert.equal(quote.status, "valida");
    assert.equal(quote.account_id, CO.companyId);
    const dias = (quote.valid_until!.getTime() - Date.now()) / 86400000;
    assert.ok(dias > 6.9 && dias <= 7.01, `validade de 7 dias, veio ${dias}`);
    assert.ok((await prisma.systemAlert.count({ where: { type: "pedido_orcamento", entity_id: id, user_id: CO.user.id, title: "Sua contratação está pronta para pagar" } })) >= 1, "o cliente foi avisado");
    // gerar de novo só renova a validade (não duplica a cotação)
    const g2 = await gen();
    assert.equal(g2.status, 201);
    assert.equal(g2.json.quote_id, g.json.quote_id);
    assert.equal(g2.json.renewed, true);
    // o cliente revalida: continua válida e com o valor aprovado (o motor não recalcula)
    const rev = await cli(`/quotes/${g.json.quote_id}/revalidate`, "POST", {});
    assert.equal(rev.status, 200, JSON.stringify(rev.json));
    assert.equal(rev.json.status, "valida");
    assert.equal(rev.json.needs_recalc, false);
    // aparece na lista do admin com a cotação
    const fila = (await adm("/commercial-requests?status=aprovado")).json.data.find((r: any) => r.id === id);
    assert.equal(fila.contract_quote?.id, g.json.quote_id);

    const { checkoutAndPay, tasksOf } = await import("../test-support/universal-helpers");
    const { projectId } = await checkoutAndPay(CO.token, [g.json.quote_id]);
    const tasks = await tasksOf(projectId);
    assert.equal(tasks.length, 1, "a tarefa do produto nasceu");
    const respostas = await prisma.taskBriefingAnswer.findMany({ where: { project_task_id: tasks[0].id }, orderBy: { question_key: "asc" } });
    assert.deepEqual(respostas.map((r) => [r.question_key, r.answer]), [["objetivo", "Vender mais no Natal"], ["plataforma", "Meta"]], "as respostas do orçamento viraram o briefing");
    const depois = await prisma.catalog2CommercialRequest.findUniqueOrThrow({ where: { id } });
    assert.equal(depois.converted_project_id, projectId);
    assert.equal((await gen()).status, 409, "já virou projeto");
  });

  it("OR05. cotação negociada vencida não é paga nem renovada pelo cliente; a equipe renova", async () => {
    const p = await produtoSobConsulta();
    const sol = await cli("/commercial-requests", "POST", { product: p.product.id, selection: SEL, answers: { [p.id.objetivo]: "X", [p.id.plataforma]: ["Meta"] } });
    const id = sol.json.id as string;
    await adm(`/commercial-requests/${id}`, "PATCH", { status: "proposta_enviada", proposed_price: 900, proposed_deadline_days: 3 });
    await cli(`/commercial-requests/${id}/respond`, "POST", { decision: "aprovar" });
    const g = await api(`/api/admin/catalog2/commercial-requests/${id}/generate-contract`, { method: "POST", token: ADMIN.token, body: {} });
    assert.equal(g.status, 201, JSON.stringify(g.json));
    await prisma.catalog2Quote.update({ where: { id: g.json.quote_id }, data: { valid_until: new Date(Date.now() - 3600_000) } });
    const rev = await cli(`/quotes/${g.json.quote_id}/revalidate`, "POST", {});
    assert.equal(rev.json.status, "expirada");
    const renova = await cli(`/quotes/${g.json.quote_id}/renew`, "POST", {});
    assert.equal(renova.status, 409);
    assert.equal(renova.json.code, "negotiated_quote_expired");
    const g2 = await api(`/api/admin/catalog2/commercial-requests/${id}/generate-contract`, { method: "POST", token: ADMIN.token, body: {} });
    assert.equal(g2.status, 201);
    assert.equal((await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: g.json.quote_id } })).status, "valida");
  });
});
