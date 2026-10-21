import { describe, expect, it } from "vitest";
import { audienceSummary, effectiveAudience, parseAudienceValue, toggleAudience } from "./catalog2-audience-ui";

describe("público do produto (lista de marcação)", () => {
  it("todos = lista vazia; combinação company + partner; equipe interna é exclusiva", () => {
    expect(parseAudienceValue("all")).toEqual([]);
    expect(parseAudienceValue("company,partner")).toEqual(["company", "partner"]);
    let s = toggleAudience([], "company", true);
    s = toggleAudience(s, "partner", true);
    expect(s).toEqual(["company", "partner"]);
    expect(toggleAudience(s, "internal", true)).toEqual(["internal"]);
    expect(toggleAudience(["internal"], "agency", true)).toEqual(["agency"]);
    expect(toggleAudience(s, "all", true)).toEqual([]);
    expect(audienceSummary("company,partner")).toBe("Company + Agency Partner");
    expect(audienceSummary(null)).toBe("Company + Agency + Agency Partner");
  });

  // R21-13 (reunião 21/10): a opção "Todos" saiu; sem restrição guardada aparece como os três públicos de cliente marcados.
  it("sem restrição guardada (\"all\") vira os três públicos de cliente marcados; lista explícita é respeitada", () => {
    expect(effectiveAudience("all")).toEqual(["company", "agency", "partner"]);
    expect(effectiveAudience(null)).toEqual(["company", "agency", "partner"]);
    expect(effectiveAudience("company,partner")).toEqual(["company", "partner"]);
    expect(effectiveAudience("internal")).toEqual(["internal"]);
    expect(audienceSummary("company,agency,partner")).toBe("Company + Agency + Agency Partner");
  });

  it("níveis de agência vêm dos cadastrados: vazio ou todos marcados = sem restrição; nível novo funciona; só aparece quando agências podem ver", async () => {
    const m = await import("./catalog2-audience-ui");
    const opts = [{ key: "bronze", name: "Bronze" }, { key: "gold", name: "Gold" }, { key: "elite", name: "Elite" }];
    expect(m.parseLevelValue(null, opts)).toEqual([]);
    expect(m.parseLevelValue(",gold,elite,", opts)).toEqual(["gold", "elite"]);
    expect(m.parseLevelValue(",bronze,gold,elite,", opts)).toEqual([]);
    expect(m.parseLevelValue(",gold,antigo,", opts)).toEqual(["gold"]);
    expect(m.levelsSummary(",elite,", opts)).toBe("Níveis: Elite");
    expect(m.levelsSummary(null, opts)).toBe("Todos os níveis de agência");
    expect(m.levelsApply([])).toBe(true);
    expect(m.levelsApply(["agency"])).toBe(true);
    expect(m.levelsApply(["company"])).toBe(false);
    expect(m.levelsApply(["internal"])).toBe(false);
  });
});
