import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: () => vi.fn(async () => ({ data: [] })) }) }));
import { taskStagesPrice } from "./product-editor";

// Achado da gravação do SEO 003 (30/10): o resumo da tarefa mostrava R$595, mas a composição cobrada era R$510.
// A diferença era 1h da etapa de Líder (R$85), que o servidor corretamente NÃO cobra. O resumo agora segue a mesma regra.
const refs = { specialties: [{ id: "seo", name: "SEO/GEO", max_hourly_rate: 85 }] };
const seo = {
  specialty: { id: "seo" },
  steps: [
    { id: "172", estimated_minutes: 60, executor_kind: "leader" },
    { id: "173", estimated_minutes: 120, executor_kind: "nomad", specialty_id: "seo" },
    { id: "174", estimated_minutes: 180, executor_kind: "nomad", specialty_id: "seo" },
    { id: "175", estimated_minutes: 60, executor_kind: "nomad", specialty_id: "seo" },
  ],
};

describe("custo total estimado do resumo da tarefa", () => {
  it("SEO 003: 6h de Nômade × R$85 = R$510 (a hora do Líder não entra)", () => {
    expect(taskStagesPrice(seo, refs)).toBe(510);
  });
  it("equipe interna também não entra; sem etapas continua 'a definir' (null)", () => {
    expect(taskStagesPrice({ ...seo, steps: [{ id: "x", estimated_minutes: 60, executor_kind: "internal" }, seo.steps[1]] }, refs)).toBe(170);
    expect(taskStagesPrice({ steps: [] }, refs)).toBeNull();
  });
});
