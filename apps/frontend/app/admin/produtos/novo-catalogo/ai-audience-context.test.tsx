import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

// Item 1 (31/10): IA contextual para público-alvo e informações comerciais. Usa as tarefas/etapas como contexto (sem horas, preços,
// pessoas ou acessos), separa "quem pode ver/contratar" (permissão, só leitura) de "público-alvo" (texto comercial) e só PROPÕE.
const api = { draftCatalog2ProductWithAI: vi.fn(), listCatalog2AiGuides: vi.fn(async () => ({ guides: [] })) };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { ProductAiChatDialog } from "./catalog2-product-ai-chat";
import { aiTasksContext, productAiInventory } from "./product-ai-inventory";

const version = {
  tasks: [{
    id: "t1", name: "Diagnóstico e otimização de SEO", description: "Melhorar a presença orgânica", estimated_minutes: 420, specialty: { id: "sp1", max_hourly_rate: 85 },
    steps: [
      { id: "s1", name: "Validar briefing e acessos", description: "Confere o briefing", completion_criteria: "Acessos validados", executor_kind: "leader", estimated_minutes: 60, leader_user_id: "pessoa-x" },
      { id: "s2", name: "Auditar SEO", description: "Auditoria técnica", completion_criteria: "Checklist completo", executor_kind: "nomad", estimated_minutes: 120, specialist_user_id: "pessoa-y" },
    ],
    deliverables: [{ id: "d1", step_id: "s2", name: "Relatório de auditoria", template_url: "file:privado" }],
  }],
  connection_requirements: [{ secret: "nunca" }], manual_price: 999,
};

beforeEach(() => { api.draftCatalog2ProductWithAI.mockReset(); });

describe("contexto das tarefas/etapas para a IA", () => {
  it("leva nomes, descrições, critérios, quem recebe (perfil) e entregáveis — nunca horas, preço, pessoas ou acessos", () => {
    const ctx = aiTasksContext(version);
    expect(ctx[0].steps.map((s: any) => [s.name, s.receiver])).toEqual([["Validar briefing e acessos", "Líder"], ["Auditar SEO", "Nômade"]]);
    expect(ctx[0].steps[1].deliverables).toEqual(["Relatório de auditoria"]);
    expect(ctx[0].steps[1].completion_criteria).toBe("Checklist completo");
    const json = JSON.stringify(ctx);
    for (const proibido of ["420", "85", "pessoa-x", "pessoa-y", "file:privado", "nunca", "999", "estimated_minutes", "max_hourly_rate"]) expect(json).not.toContain(proibido);
  });
});

describe("janela da IA: contexto × público-alvo", () => {
  const values = { title: "SEO", summary: "Otimização", target_audience: "", audience: ["Agências", "Empresas"], tasks_context: aiTasksContext(version) };

  it("mostra à parte o contexto lido; 'Quem pode ver' aparece como permissão que não é alterada; tarefas com contagem", () => {
    render(<ProductAiChatDialog open productId="p1" onOpenChange={() => {}} onApply={vi.fn()} currentValues={values} />);
    const ctx = screen.getByTestId("ai-context-used");
    expect(ctx).toHaveTextContent("Quem pode ver");
    expect(within(ctx).getByTestId("ai-permission-tag")).toHaveTextContent("permissão · não altera");
    expect(ctx).toHaveTextContent("Tarefas e etapas · 1 tarefa(s), 2 etapa(s)");
    expect(screen.getByTestId("ai-filled-fields")).not.toHaveTextContent("Quem pode ver"); // não se mistura aos campos preenchidos
    expect(screen.getByTestId("ai-available-fields")).toHaveTextContent("Público-alvo");
    expect(productAiInventory(values).contextLabels).toEqual(["Quem pode ver", "Tarefas e etapas"]);
  });

  it("'Sugerir público-alvo e textos comerciais' só PROPÕE os vazios, manda o contexto das etapas e proíbe usar permissão como público", async () => {
    api.draftCatalog2ProductWithAI.mockResolvedValueOnce({ draft: { title: "SEO", summary: "", full_description: "", included_items: [], excluded_items: [], client_requirements: [], deliverables_summary: [], suggested_tasks: [], target_audience: "Pequenas empresas com site" }, reply: "Proposta." });
    const onApply = vi.fn();
    render(<ProductAiChatDialog open productId="p1" onOpenChange={() => {}} onApply={onApply} currentValues={{ ...values, scope: "Escopo já escrito" }} />);
    const btn = screen.getByTestId("ai-suggest-audience");
    expect(btn.getAttribute("data-fields")).toContain("Público-alvo");
    expect(btn.getAttribute("data-fields")).not.toContain("Escopo"); // já preenchido: não entra
    fireEvent.click(btn);
    await screen.findByText("Proposta.");
    const sent = (api.draftCatalog2ProductWithAI.mock.calls[0] as any[])[1].at(-1).text as string;
    expect(sent).toContain("PERMISSÕES de acesso");
    expect(sent).toContain("Validar briefing e acessos");
    expect(sent).toContain("Relatório de auditoria");
    expect(sent).not.toContain("pessoa-x");
    expect(onApply).not.toHaveBeenCalled(); // só aplica depois da revisão e confirmação
  });
});
