import { describe, expect, it } from "vitest";
import { filterSpecialties, isSpecialtyCompatible, keepSpecialtyForMode, specialtiesForMode, specialtyKind } from "./catalog2-specialty-kind";

const list = [
  { id: "h1", name: "Designer", execution_kind: "humano" },
  { id: "h2", name: "Redator" }, // antigas: sem tipo = humano
  { id: "i1", name: "IA de texto", execution_kind: "ia" },
  { id: "x1", name: "Redator ou IA", execution_kind: "hibrido" },
];

describe("Especialidade × quem executa", () => {
  it("humano mostra só humanas (inclusive as antigas sem tipo); IA só IA; humano ou IA mostra humanas + IA (o tipo antigo híbrido some)", () => {
    expect(specialtiesForMode(list, "humano").map((s) => s.id)).toEqual(["h1", "h2"]);
    expect(specialtiesForMode(list, "ia").map((s) => s.id)).toEqual(["i1"]);
    expect(specialtiesForMode(list, "hibrido").map((s) => s.id)).toEqual(["h1", "h2", "i1"]);
    expect(specialtiesForMode(undefined, "ia")).toEqual([]);
    expect(specialtyKind({ execution_kind: "lixo" })).toBe("humano");
  });

  it("ao trocar o executor, mantém a especialidade só se for do tipo novo; senão limpa", () => {
    expect(keepSpecialtyForMode(list, "h1", "humano")).toBe("h1");
    expect(keepSpecialtyForMode(list, "h1", "ia")).toBe("");
    expect(keepSpecialtyForMode(list, "x1", "hibrido")).toBe(""); // o tipo antigo "humano ou IA" não vale mais
    expect(keepSpecialtyForMode(list, "h1", "hibrido")).toBe("h1"); // humana e IA valem na etapa híbrida
    expect(keepSpecialtyForMode(list, "i1", "hibrido")).toBe("i1");
    expect(keepSpecialtyForMode(list, "x1", "humano")).toBe("");
    expect(keepSpecialtyForMode(list, "", "ia")).toBe("");
    expect(isSpecialtyCompatible(null, "ia")).toBe(true);
  });

  it("a busca ignora acento e maiúscula e aceita várias palavras", () => {
    const l = [{ name: "Designer Gráfico" }, { name: "Gestor de Tráfego" }, { name: "Redator" }, { name: "Designer UX" }];
    expect(filterSpecialties(l, "grafi").map((s) => s.name)).toEqual(["Designer Gráfico"]);
    expect(filterSpecialties(l, "ges").map((s) => s.name)).toEqual(["Gestor de Tráfego"]);
    expect(filterSpecialties(l, "g").map((s) => s.name)).toEqual(["Designer Gráfico", "Gestor de Tráfego", "Designer UX"]); // contém "g"
    expect(filterSpecialties(l, "des ux").map((s) => s.name)).toEqual(["Designer UX"]);
    expect(filterSpecialties(l, "").length).toBe(4);
  });
});
