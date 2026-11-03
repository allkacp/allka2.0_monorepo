import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { generateDraftWithClient, normalizeDraft } from "./catalog2-product-draft-ai";

const response = (text: string, finishReason = "STOP") => ({ text, candidates: [{ finishReason }] }) as GenerateContentResponse;
const input = (text: string) => ({
  messages: [{ role: "user" as const, text }],
  current: { title: "SEO", summary: "Texto original", target_audience: "Público original", suggested_tasks: [] },
  existing: { title: "SEO", category: "Performance" },
});

describe("IA de produto — transporte real com respostas simuladas", () => {
  it("público-alvo pontual usa só uma chamada e preserva os demais campos", async () => {
    const calls: GenerateContentParameters[] = [];
    const data = input('CADASTRO ATUAL: tarefas/etapas; não invente tarefas.\nPedido: Proponha somente uma melhoria no público-alvo com base nas quatro etapas cadastradas.');
    const raw = await generateDraftWithClient(data, async request => {
      calls.push(request);
      return response(JSON.stringify({ reply: "Revise a proposta.", target_audience: "Empresas com site existente e necessidades de SEO." }));
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(Object.keys((calls[0].config!.responseJsonSchema as any).properties), ["reply", "target_audience"]);
    assert.equal((calls[0].config!.responseJsonSchema as any).additionalProperties, false);
    const result = normalizeDraft(raw, data.current);
    assert.equal(result.draft.summary, "Texto original");
    assert.equal(result.draft.title, "SEO");
    assert.equal(result.draft.target_audience, "Empresas com site existente e necessidades de SEO.");
  });

  it("contexto prefixado não dispara geração de tarefas num ajuste de resumo", async () => {
    const calls: GenerateContentParameters[] = [];
    await generateDraftWithClient(input('CADASTRO ATUAL: sugira tarefas e etapas apenas como contexto.\nPedido: Encurte a descrição curta.'), async request => {
      calls.push(request);
      return response('{"reply":"Revise.","summary":"SEO objetivo."}');
    });
    assert.equal(calls.length, 2, "base e textos comerciais, sem terceira chamada de tarefas");
  });

  it("pedido explícito de tarefas continua disponível", async () => {
    const calls: GenerateContentParameters[] = [];
    await generateDraftWithClient(input('Sugira tarefas para este produto.'), async request => {
      calls.push(request);
      return response('{"reply":"Revise."}');
    });
    assert.equal(calls.length, 3);
    assert.ok((calls[2].config!.responseJsonSchema as any).properties.suggested_tasks);
  });

  it("preencher produto completo ainda sugere tarefas mesmo com título já informado", async () => {
    const calls: GenerateContentParameters[] = [];
    await generateDraftWithClient(input('Preencha o produto inteiro com base no nome.'), async request => {
      calls.push(request);
      return response('{"reply":"Revise."}');
    });
    assert.equal(calls.length, 3);
  });

  it("corte MAX_TOKENS não vira proposta mesmo quando o texto é JSON válido", async () => {
    const calls: GenerateContentParameters[] = [];
    const records: unknown[] = [];
    const result = await generateDraftWithClient(input('Ajuste somente o público-alvo.'), async request => {
      calls.push(request);
      return calls.length === 1 ? response('{"reply":"cortada","target_audience":"parcial"}', "MAX_TOKENS")
        : response('{"reply":"Completa.","target_audience":"Empresas com site existente."}');
    }, async r => { records.push(r); });
    assert.equal(calls.length, 2);
    assert.equal(records.length, 2, "contabiliza cada tentativa");
    assert.match(String(calls[1].contents), /resuma drasticamente/);
    assert.equal(result.target_audience, "Empresas com site existente.");
  });

  it("duas respostas cortadas geram erro, nunca rascunho parcial", async () => {
    let count = 0;
    await assert.rejects(generateDraftWithClient(input('Proponha apenas público-alvo.'), async () => {
      count++;
      return response('{"reply":', "MAX_TOKENS");
    }), /resposta incompleta/);
    assert.equal(count, 2);
  });

  it("resposta vazia ou array é rejeitado e não normalizado como sucesso", async () => {
    let count = 0;
    await assert.rejects(generateDraftWithClient(input('Proponha somente público-alvo.'), async () => {
      return response(++count === 1 ? "" : "[]");
    }), /resposta incompleta/);
  });

  it("ignora campos fora do escopo solicitado", async () => {
    const raw = await generateDraftWithClient(input('Proponha apenas público-alvo.'), async () =>
      response('{"reply":"Revise.","target_audience":"Empresas.","title":"Não autorizado","price":100}'));
    assert.deepEqual(raw, { reply: "Revise.", target_audience: "Empresas." });
  });
});
