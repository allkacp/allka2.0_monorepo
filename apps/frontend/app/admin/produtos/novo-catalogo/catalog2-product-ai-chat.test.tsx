import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = { draftCatalog2ProductWithAI: vi.fn(), listCatalog2AiGuides: vi.fn(async () => ({ guides: [] })) };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { ProductAiChatDialog, draftToVersionPatch } from "./catalog2-product-ai-chat";
import { AI_PRODUCT_FIELDS } from "./product-ai-inventory";

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

  it("no teste identifica título sozinho, campos vazios e exige confirmar gerar e aplicar", async () => {
    api.draftCatalog2ProductWithAI.mockResolvedValueOnce({ draft: DRAFT, reply: "Proposta para revisar." });
    const onApply = vi.fn(async () => {});
    render(<ProductAiChatDialog open productId="p1" onOpenChange={() => {}} onApply={onApply} currentValues={{ title: "Título digitado agora", summary: "", scope: "Escopo já digitado" }} />);
    expect(screen.getByTestId("ai-filled-fields")).toHaveTextContent("Título comercial");
    expect(screen.getByTestId("ai-filled-fields")).toHaveTextContent("Escopo");
    expect(screen.getByTestId("ai-available-fields")).toHaveTextContent("Descrição curta");
    expect(screen.getByTestId("product-ai-chat-overlay")).toHaveClass("bg-black/60");
    expect(screen.getByTestId("product-ai-chat")).toHaveClass("border-violet-300");
    expect(within(screen.getByTestId("ai-filled-fields")).getByRole("list", { name: "Identificação e descrição" })).toHaveTextContent("Título comercial");
    expect(api.draftCatalog2ProductWithAI).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("ai-generate-from-inputs"));
    await screen.findByText("Proposta para revisar.");
    expect(api.draftCatalog2ProductWithAI).toHaveBeenCalledWith("p1", [expect.objectContaining({ role: "user", text: expect.stringContaining("Escopo") })], expect.objectContaining({ title: "Título digitado agora", summary: "", scope: "Escopo já digitado" }));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("apply-draft"));
    expect(screen.getByRole("alertdialog", { name: "Confirmar aplicação das sugestões" })).toHaveTextContent("somente os campos vazios");
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("confirm-ai-apply"));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(DRAFT, { onlyEmpty: true }));
  });

  it("reconhece título e descrição, sem oferecer a descrição preenchida como vazia", () => {
    render(<ProductAiChatDialog open productId="p1" onOpenChange={() => {}} onApply={async () => {}} currentValues={{ title: "Nome", summary: "Descrição já informada" }} />);
    expect(within(screen.getByTestId("ai-filled-fields")).getByText("Título comercial")).toBeInTheDocument();
    expect(within(screen.getByTestId("ai-filled-fields")).getByText("Descrição curta")).toBeInTheDocument();
    expect(screen.getByTestId("ai-available-fields")).not.toHaveTextContent("Descrição curta");
    expect(api.draftCatalog2ProductWithAI).not.toHaveBeenCalled();
  });

  it("sem campos vazios não mostra CTA desabilitado; nomes são etiquetas em grupos e o X fecha sem gerar", () => {
    const close = vi.fn();
    const currentValues = Object.fromEntries(AI_PRODUCT_FIELDS.map(([key]) => [key, ["included_items", "excluded_items", "client_requirements", "deliverables_summary"].includes(key) ? ["Informado"] : "Informado"]));
    render(<ProductAiChatDialog open productId="p1" onOpenChange={close} onApply={async () => {}} currentValues={currentValues} />);
    const filled = screen.getByTestId("ai-filled-fields");
    expect(within(filled).getAllByRole("listitem")).toHaveLength(14);
    expect(within(filled).getByRole("list", { name: "Identificação e descrição" })).toBeInTheDocument();
    expect(within(filled).getByRole("list", { name: "Apresentação comercial" })).toBeInTheDocument();
    expect(screen.getByTestId("ai-available-fields")).toHaveTextContent("Nenhum campo vazio");
    expect(screen.queryByTestId("ai-generate-from-inputs")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar assistente de IA" }));
    expect(close).toHaveBeenCalledWith(false);
    expect(api.draftCatalog2ProductWithAI).not.toHaveBeenCalled();
  });

  // R21-14: anexar escopo, não sobrescrever produto já preenchido.
  it("R21-14: com 'só completar o vazio', texto e listas que já têm conteúdo são preservados", () => {
    const cur = { title: "Meu título", summary: "", full_description: "Descrição que já existe" };
    const p = draftToVersionPatch(DRAFT, cur, true, { included_items: ["Já tinha"], excluded_items: [] });
    expect(p.title).toBe("Meu título");
    expect(p.summary).toBe("Gestão completa de redes.");
    expect(p.full_description).toBe("Descrição que já existe");
    expect("included_items" in p).toBe(false);
    const structured = draftToVersionPatch({ ...DRAFT, scope: "Escopo proposto", target_audience: "Público proposto" }, cur, true, { scope: "Escopo preenchido" });
    expect(structured.scope).toBeUndefined();
    expect(structured.target_audience).toBe("Público proposto");
    const livre = draftToVersionPatch(DRAFT, cur, false, { included_items: ["Já tinha"] });
    expect(livre.title).toBe("Social Media Premium");
    expect(livre.included_items).toEqual(["Calendário editorial"]);
  });

  it("R21-14: anexar um .txt coloca o texto na conversa; Word/PDF é recusado com orientação; o aplicar leva a opção", async () => {
    api.draftCatalog2ProductWithAI.mockResolvedValueOnce({ draft: DRAFT, reply: "ok" });
    const onApply = vi.fn(async () => {});
    render(<ProductAiChatDialog open onOpenChange={() => {}} productId="p1" onApply={onApply} />);
    const txt = new File(["Escopo: 4 posts por semana"], "escopo.txt", { type: "text/plain" });
    fireEvent.change(screen.getByTestId("ai-attach"), { target: { files: [txt] } });
    await waitFor(() => expect((screen.getByLabelText("Mensagem para a IA") as HTMLTextAreaElement).value).toContain("[Anexo: escopo.txt]"));
    expect((screen.getByLabelText("Mensagem para a IA") as HTMLTextAreaElement).value).toContain("4 posts por semana");
    expect(screen.getByTestId("ai-attached").textContent).toContain("escopo.txt");
    fireEvent.change(screen.getByTestId("ai-attach"), { target: { files: [new File(["x"], "doc.docx")] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/não é texto/);
    fireEvent.click(screen.getByRole("button", { name: /Gerar/ }));
    await screen.findByText("ok");
    expect((screen.getByTestId("ai-only-empty") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId("apply-draft"));
    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect((onApply.mock.calls[0] as any[])[1]).toEqual({ onlyEmpty: true });
  });
});
