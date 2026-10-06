import { describe, expect, it } from "vitest";
import { isSpecialtyCompatible, keepSpecialtyForMode, specialtiesForMode, specialtyKind } from "./catalog2-specialty-kind";

const list = [
  { id: "h1", name: "Designer", execution_kind: "humano" },
  { id: "h2", name: "Redator" }, // antigas: sem tipo = humano
  { id: "i1", name: "IA de texto", execution_kind: "ia" },
  { id: "x1", name: "Redator ou IA", execution_kind: "hibrido" },
];

describe("Especialidade × quem executa", () => {
  it("humano mostra só humanas (inclusive as antigas sem tipo); IA só IA; humano ou IA só as híbridas", () => {
    expect(specialtiesForMode(list, "humano").map((s) => s.id)).toEqual(["h1", "h2"]);
    expect(specialtiesForMode(list, "ia").map((s) => s.id)).toEqual(["i1"]);
    expect(specialtiesForMode(list, "hibrido").map((s) => s.id)).toEqual(["x1"]);
    expect(specialtiesForMode(undefined, "ia")).toEqual([]);
    expect(specialtyKind({ execution_kind: "lixo" })).toBe("humano");
  });

  it("ao trocar o executor, mantém a especialidade só se for do tipo novo; senão limpa", () => {
    expect(keepSpecialtyForMode(list, "h1", "humano")).toBe("h1");
    expect(keepSpecialtyForMode(list, "h1", "ia")).toBe("");
    expect(keepSpecialtyForMode(list, "x1", "hibrido")).toBe("x1");
    expect(keepSpecialtyForMode(list, "x1", "humano")).toBe("");
    expect(keepSpecialtyForMode(list, "", "ia")).toBe("");
    expect(isSpecialtyCompatible(null, "ia")).toBe(true);
  });
});
