import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = { draftCatalog2ProductWithAI: vi.fn() };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { ProductAiChatDialog, draftToVersionPatch } from "./catalog2-product-ai-chat";

const DRAFT = { title: "Social Media Premium", summary: "Gestão completa de redes.", full_description: "Planejamento e relatório.", included_items: ["Calendário editorial"], excluded_items: [], client_requirements: ["Acesso às redes"], deliverables_summary: [], suggested_tasks: [{ name: "Planejar conteúdo", objective: "Definir pautas", steps: [{ name: "Montar calendário", description: "", completion_criteria: "Calendário aprovado" }] }] };

describe("IA que preenche o produto (P-8)", () => {
  beforeEach(() => { api.draftCatalog2ProductWithAI.mockReset(); });

  it("draftToVersionPatch: usa o que a IA trouxe e NÃO apaga listas que vieram vazias", () => {
    const p = draftToVersionPatch({ ...DRAFT, title: "", summary: "" }, { title: "Título atual", summary: "Resumo atual", full_description: "x" });
    expect(p.title).toBe("Título atual");
    expect(p.summary).toBe("Resumo atual");
    expect(p.full_description).toBe("Planejamento e relatório.");
    expect(p.included_items).toEqual(["Calendário editorial"]);
    expect("excluded_items" in p).toBe(false);
    expect("deliverables_summary" in p).toBe(false);
  });

  it("conversa: gera o rascunho, mostra a prévia, manda o rascunho atual no ajuste e só aplica ao clicar", async () => {
    api.draftCatalog2ProductWithAI
      .mockResolvedValueOnce({ draft: DRAFT, reply: "Montei a proposta." })
      .mockResolvedValueOnce({ draft: { ...DRAFT, summary: "Redes ponta a ponta." }, reply: "Encurtei." });
    const onApply = vi.fn(async () => {});
    render(<ProductAiChatDialog open onOpenChange={() => {}} productId="p1" onApply={onApply} />);
    expect((screen.getByTestId("apply-draft") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Mensagem para a IA"), { target: { value: "Produto de social media com relatório" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerar/ }));
    await screen.findByText("Montei a proposta.");
    expect(screen.getByTestId("draft-preview").textContent).toContain("Social Media Premium");
    expect(screen.getByTestId("draft-preview").textContent).toContain("Montar calendário");
    expect(api.draftCatalog2ProductWithAI).toHaveBeenCalledWith("p1", [{ role: "user", text: "Produto de social media com relatório" }], null);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mensagem para a IA"), { target: { value: "Deixe o resumo mais curto" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajustar/ }));
    await screen.findByText("Encurtei.");
    const segunda = api.draftCatalog2ProductWithAI.mock.calls[1] as any[];
    expect(segunda[1]).toHaveLength(3);
    expect(segunda[2].title).toBe("Social Media Premium");
    fireEvent.click(screen.getByTestId("apply-draft"));
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect((onApply.mock.calls[0] as any[])[0].summary).toBe("Redes ponta a ponta.");
    await screen.findByText(/Aplicado e salvo/);
  });

  it("erro da IA aparece em destaque e não derruba a conversa", async () => {
    api.draftCatalog2ProductWithAI.mockRejectedValueOnce(new Error("A IA não está configurada neste ambiente."));
    render(<ProductAiChatDialog open onOpenChange={() => {}} productId="p1" onApply={async () => {}} />);
    fireEvent.change(screen.getByLabelText("Mensagem para a IA"), { target: { value: "Produto X" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerar/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/não está configurada/);
    expect((screen.getByTestId("apply-draft") as HTMLButtonElement).disabled).toBe(true);
  });
});
