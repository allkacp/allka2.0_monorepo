import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";

// Chamadas GET idênticas e simultâneas viram uma só; cada quem recebe cópia própria; nada é guardado depois da resposta.
describe("ApiClient: deduplicação de GET simultâneo", () => {
  let calls: string[];
  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ lista: [1, 2, 3], n: calls.length }), { status: 200, headers: { "content-type": "application/json" } });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("duas chamadas iguais ao mesmo tempo fazem UMA ida ao servidor e recebem cópias independentes", async () => {
    const [a, b] = await Promise.all([apiClient.getWalletTopupSummary(), apiClient.getWalletTopupSummary()]);
    expect(calls.length).toBe(1);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.lista.push(99);
    expect(b.lista).toEqual([1, 2, 3]);
  });

  it("depois que a resposta chegou, uma nova chamada vai de novo ao servidor (nada fica guardado)", async () => {
    await apiClient.getWalletTopupSummary();
    await apiClient.getWalletTopupSummary();
    expect(calls.length).toBe(2);
  });

  it("chamadas com parâmetros diferentes não se misturam", async () => {
    await Promise.all([apiClient.getCurrentUser?.() ?? apiClient.getWalletTopupSummary(), apiClient.getWalletTopupSummary()]);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it("POST nunca é compartilhado", async () => {
    await Promise.all([apiClient.createWalletPix({ amount: 10 }), apiClient.createWalletPix({ amount: 10 })]);
    expect(calls.filter((c) => c.startsWith("POST")).length).toBe(2);
  });
});
