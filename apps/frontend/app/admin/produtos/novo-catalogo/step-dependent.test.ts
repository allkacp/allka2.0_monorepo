import { describe, expect, it } from "vitest";
import { conditionalStepOptions, linkedStepRefs, stepNameOfRef } from "./product-editor";

// R21-03 (reunião 21/10): etapa dependente de variação/adicional + vínculo por "incluir etapa".
const version = {
  tasks: [{ key: "a", steps: [{ key: "s1", name: "Briefing", is_conditional: false }, { key: "s2", name: "Campanhas extras", is_conditional: true }, { key: "s3", name: "Relatório extra", is_conditional: true }] }],
  variations: [{ options: [{ effects: [{ effect_type: "add_step", effect_value: "a:s2" }, { effect_type: "add_deadline_days", effect_value: "2" }] }] }],
  addons: [{ effects: [] }],
  conditions: [],
};

describe("Etapa dependente de variação ou adicional", () => {
  it("o seletor de 'Incluir etapa' oferece só as etapas marcadas como dependentes", () => {
    expect(conditionalStepOptions(version)).toEqual([["a:s2", "Campanhas extras"], ["a:s3", "Relatório extra"]]);
    expect(conditionalStepOptions({ tasks: [] })).toEqual([]);
  });
  it("sabe quais etapas já estão ligadas a uma opção, adicional ou condição", () => {
    expect([...linkedStepRefs(version)]).toEqual(["a:s2"]);
    const comAddon = { ...version, addons: [{ effects: [{ effect_type: "add_step", effect_value: "a:s3" }] }] };
    expect([...linkedStepRefs(comAddon)].sort()).toEqual(["a:s2", "a:s3"]);
  });
  it("mostra o nome da etapa no lugar do código", () => {
    expect(stepNameOfRef(version, "a:s3")).toBe("Relatório extra");
    expect(stepNameOfRef(version, "a:x")).toBe("a:x");
  });
});
