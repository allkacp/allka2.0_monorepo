import { describe, expect, it } from "vitest";
import { flowSummary } from "./catalog2-step-flow-ui";

const st = (key: string, sort_order: number, depends_on: string[] | null, min = 60) => ({ key, name: key, sort_order, depends_on, estimated_minutes: min });

describe("etapas ao mesmo tempo (paralelo)", () => {
  it("etapas que começam juntas ficam na mesma onda; a seguinte espera as duas", () => {
    const s = flowSummary([st("a", 1, []), st("b", 2, []), st("c", 3, null)]);
    expect(s.waves).toEqual([["a", "b"], ["c"]]);
    expect(s.criticalMinutes).toBe(120); // paralelas contam só a mais longa (60) + a última (60)
  });
  it("sequência padrão não tem etapas em paralelo", () => {
    const s = flowSummary([st("a", 1, null), st("b", 2, null), st("c", 3, null)]);
    expect(s.waves.every((w) => w.length === 1)).toBe(true);
  });
});
