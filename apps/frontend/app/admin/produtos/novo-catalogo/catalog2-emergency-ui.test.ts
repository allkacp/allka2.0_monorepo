import { describe, expect, it } from "vitest";
import { emergencyDraftError, emergencyDraftOf, emergencyPayload } from "./catalog2-emergency-ui";

describe("entrega emergencial (editor)", () => {
  it("converte horas em minutos e exige tipo+valor juntos", () => {
    const d = { reduction_hours: "2,5", kind: "fixed" as const, value: "150" };
    expect(emergencyPayload(d)).toMatchObject({ emergency_reduction_minutes: 150, emergency_extra_kind: "fixed", emergency_extra_value: 150 });
    expect(emergencyDraftError({ reduction_hours: "1", kind: "fixed", value: "" }, 8)).toMatch(/juntos/);
    expect(emergencyPayload({ reduction_hours: "", kind: "", value: "" })).toMatchObject({ emergency_reduction_minutes: null, emergency_extra_kind: null, emergency_extra_value: null });
  });
  it("recusa redução maior que a etapa e lê o rascunho do cadastro", () => {
    expect(emergencyDraftError({ reduction_hours: "9", kind: "", value: "" }, 8)).toMatch(/Maior/);
    expect(emergencyDraftOf({ emergency_reduction_minutes: 90, emergency_extra_kind: "percent", emergency_extra_value: 20 })).toEqual({ reduction_hours: "1.5", kind: "percent", value: "20" });
  });
});
