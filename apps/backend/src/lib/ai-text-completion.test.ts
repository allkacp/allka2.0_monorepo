import { describe, expect, it } from "vitest";
import { completeWithoutCutting, countWords, fitToLimits, limitState, limitsText } from "./ai-text-completion";

const seq = (...rs: { text: string; finishReason?: string }[]) => {
  const calls: string[] = [];
  let i = 0;
  return { calls, gen: async (c: string) => { calls.push(c); return rs[Math.min(i++, rs.length - 1)]; } };
};

describe("IA nunca corta o texto", () => {
  it("resposta interrompida por limite de saída é CONTINUADA até terminar (sem repetir)", async () => {
    const { gen, calls } = seq({ text: "Primeira parte do texto,", finishReason: "MAX_TOKENS" }, { text: "segunda parte, e o fim completo.", finishReason: "STOP" });
    const r = await completeWithoutCutting(gen, "ESCREVA");
    expect(r.text).toBe("Primeira parte do texto, segunda parte, e o fim completo.");
    expect(r.stillCut).toBe(false);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatch(/CONTINUE exatamente de onde parou/);
    expect(calls[1]).toContain("Primeira parte do texto,");
  });
  it("sem interrupção, uma chamada só", async () => {
    const { gen, calls } = seq({ text: "Texto inteiro.", finishReason: "STOP" });
    expect((await completeWithoutCutting(gen, "x")).text).toBe("Texto inteiro.");
    expect(calls).toHaveLength(1);
  });
  it("limites: conta palavras e caracteres e descreve em português", () => {
    expect(countWords("uma duas  três")).toBe(3);
    expect(limitState("a b c", { maxWords: 2 })).toBe("over");
    expect(limitState("a b c", { minChars: 50 })).toBe("under");
    expect(limitState("a b c", { minWords: 2, maxWords: 5, maxChars: 20 })).toBe("ok");
    expect(limitsText({ minWords: 10, maxChars: 4000 })).toBe("no mínimo 10 palavras, no máximo 4000 caracteres");
  });
  it("texto acima do máximo é CONDENSADO pela IA (nunca cortado) e passa a caber", async () => {
    const long = "palavra ".repeat(50).trim();
    const { gen, calls } = seq({ text: "texto condensado e completo.", finishReason: "STOP" });
    const r = await fitToLimits(gen, long, { maxWords: 10 });
    expect(r.text).toBe("texto condensado e completo.");
    expect(r.notes).toEqual([]);
    expect(calls[0]).toMatch(/CONDENSANDO e resumindo \(nunca cortando o final\)/);
  });
  it("se mesmo assim passar do máximo, devolve o texto INTEIRO com um aviso claro (não corta)", async () => {
    const long = "palavra ".repeat(30).trim();
    const { gen } = seq({ text: long, finishReason: "STOP" });
    const r = await fitToLimits(gen, long, { maxWords: 10 }, 1);
    expect(r.text).toBe(long);
    expect(r.notes[0]).toMatch(/Nada foi cortado/);
  });
  it("abaixo do mínimo, a IA amplia", async () => {
    const { gen, calls } = seq({ text: "um texto bem mais longo agora com muitas palavras suficientes.", finishReason: "STOP" });
    const r = await fitToLimits(gen, "curto", { minWords: 5 });
    expect(r.notes).toEqual([]);
    expect(calls[0]).toMatch(/Amplie-o/);
  });
});
