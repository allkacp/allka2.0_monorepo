import { describe, expect, it } from "vitest";
import { ALLKOIN_BRL_RATE, fmtAllkoins, fmtAllkoinsBoth, fmtReais, fromAllkoins, toAllkoins } from "./allkoins";

// A moeda da plataforma é o Allkoin: 1 AK$ = R$ 1,00 hoje. Saldo aparece sempre assim: "AK$ 1.000,00" (símbolo na frente, como reais).
const NB = " ";

describe("allkoins", () => {
  it("hoje 1 Allkoin vale R$ 1,00", () => {
    expect(ALLKOIN_BRL_RATE).toBe(1);
    expect(toAllkoins(1000)).toBe(1000);
    expect(fromAllkoins(25)).toBe(25);
  });

  it("escreve como dinheiro: símbolo na frente e duas casas", () => {
    expect(fmtAllkoins(1000)).toBe(`AK$${NB}1.000,00`);
    expect(fmtAllkoins(1234.5)).toBe(`AK$${NB}1.234,50`);
    expect(fmtAllkoins(21.97000000000003)).toBe(`AK$${NB}21,97`);
    expect(fmtAllkoins(0)).toBe(`AK$${NB}0,00`);
  });

  it("os dois valores: Allkoin primeiro e o real entre parênteses", () => {
    expect(fmtAllkoinsBoth(366.07)).toBe(`AK$${NB}366,07 (R$${NB}366,07)`);
    expect(fmtAllkoinsBoth(1000)).toBe(`AK$${NB}1.000,00 (R$${NB}1.000,00)`);
    expect(fmtReais(10)).toBe(`R$${NB}10,00`);
    expect(fmtAllkoinsBoth(null)).toBe(`AK$${NB}0,00 (R$${NB}0,00)`);
  });

  it("'number' devolve só o número", () => {
    expect(fmtAllkoins(1000, "number")).toBe("1.000,00");
    expect(fmtAllkoins(-5, "number")).toBe("-5,00");
  });

  it("valor ausente ou inválido vira zero, sem quebrar a tela", () => {
    expect(fmtAllkoins(null)).toBe(`AK$${NB}0,00`);
    expect(fmtAllkoins(undefined)).toBe(`AK$${NB}0,00`);
    expect(fmtAllkoins(Number.NaN)).toBe(`AK$${NB}0,00`);
  });

  it("negativo (saldo devedor) mantém o sinal na frente", () => {
    expect(fmtAllkoins(-50)).toBe(`-AK$${NB}50,00`);
  });
});
