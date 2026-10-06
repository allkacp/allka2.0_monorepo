import { describe, expect, it } from "vitest";
import { audienceSummary, parseAudienceValue, toggleAudience } from "./catalog2-audience-ui";

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
    expect(audienceSummary(null)).toBe("Todos");
  });
});
