import { describe, it, expect } from "vitest";
import { parseAmount } from "./wallet-topup-modal";

describe("recarga de crédito: leitura do valor", () => {
  it("aceita formatos brasileiros", () => {
    expect(parseAmount("50")).toBe(50);
    expect(parseAmount("50,00")).toBe(50);
    expect(parseAmount("1.250,50")).toBe(1250.5);
  });
  it("recusa lixo", () => {
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("-5")).toBeNaN();
  });
});
