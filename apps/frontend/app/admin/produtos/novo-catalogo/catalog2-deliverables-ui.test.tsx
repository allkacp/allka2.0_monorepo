import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = {
  createCatalog2Deliverable: vi.fn(async () => ({})),
  updateCatalog2Deliverable: vi.fn(async () => ({})),
  deleteCatalog2Deliverable: vi.fn(async () => ({})),
  searchCatalog2DeliverableLibrary: vi.fn(async () => ({ data: [{ id: "lib1", name: "Relatório mensal", description: "PDF", type: "arquivo", format: "PDF", responsible: "executor", is_required: true, requires_approval: true, visibility: "client", evidence_required: false, requires_qualification: false, delivery_moment: "cycle_end", cycle_scope: "every_cycle", template_url: null, template_name: null, from: "Produto #3 · Rotina" }] })),
  uploadCatalog2DeliverableFile: vi.fn(),
  downloadCatalog2DeliverableFile: vi.fn(),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { TaskDeliverablesEditor } from "./catalog2-deliverables-ui";

const act = vi.fn(async (fn: () => Promise<any>) => { await fn(); });
const task = (deliverables: any[] = []) => ({ id: "t1", steps: [{ id: "s1", name: "Configurar a conta" }, { id: "s2", name: "Otimizar campanhas" }], deliverables });
const full = {
  id: "d1", key: "relatorio-mensal", name: "Relatório mensal", description: "PDF com métricas", type: "arquivo", responsible: "executor", is_required: true, requires_approval: true, visibility: "client", step_id: "s2",
  format: "PDF", delivery_moment: "cycle_end", template_url: "https://exemplo.test/modelo.pdf", template_name: "Modelo.pdf", evidence_required: true, requires_qualification: true, cycle_scope: "first_execution", is_conditional: false, condition_json: null,
};
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Entregáveis · cadastro completo na tela", () => {
  it("cada entregável mostra ID permanente, etapa, momento, formato, arquivo-modelo, prova, qualificação, aprovação, visibilidade e recorrência", () => {
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    const row = screen.getByTestId("deliverable-row");
    expect(within(row).getByTestId("deliverable-id").textContent).toBe("ID relatorio-mensal");
    expect((within(row).getByLabelText("Nome do entregável") as HTMLInputElement).value).toBe("Relatório mensal");
    expect((within(row).getByLabelText("Etapa") as HTMLSelectElement).value).toBe("s2");
    expect((within(row).getByLabelText("Momento da entrega") as HTMLSelectElement).value).toBe("cycle_end");
    expect((within(row).getByLabelText("Formato") as HTMLInputElement).value).toBe("PDF");
    expect((within(row).getByLabelText("Recorrência do entregável") as HTMLSelectElement).value).toBe("first_execution");
    expect(within(row).getByText("Modelo.pdf")).toBeInTheDocument();
    expect((within(row).getByLabelText("Exige evidência") as HTMLInputElement).checked).toBe(true);
    expect((within(row).getByLabelText("Exige aprovação") as HTMLInputElement).checked).toBe(true);
    expect(within(row).getByLabelText(/qualificação/i)).toBeInTheDocument();
  });

  it("a recorrência oferece 'Todo ciclo' e 'Só na primeira execução'; mudar habilita Salvar e envia o corpo completo", async () => {
    render(<TaskDeliverablesEditor task={task([{ ...full, cycle_scope: "every_cycle" }])} act={act} />);
    const sel = screen.getByLabelText("Recorrência do entregável") as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.text)).toEqual(["Todo ciclo", "Só na primeira execução"]);
    expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
    fireEvent.change(sel, { target: { value: "first_execution" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.updateCatalog2Deliverable).toHaveBeenCalledTimes(1));
    const [id, body] = api.updateCatalog2Deliverable.mock.calls[0] as any[];
    expect(id).toBe("d1");
    expect(body).toMatchObject({ cycle_scope: "first_execution", delivery_moment: "cycle_end", format: "PDF", step_id: "s2", evidence_required: true, requires_qualification: true, template_name: "Modelo.pdf" });
  });

  it("condição em texto fica como orientação (não promete filtrar sozinha)", () => {
    render(<TaskDeliverablesEditor task={task([{ ...full, is_conditional: true, condition_json: JSON.stringify({ text: "só se tiver Meta" }) }])} act={act} />);
    expect(screen.getByText(/texto de orientação para quem executa/i)).toBeInTheDocument();
    expect((screen.getByLabelText("Condição do entregável") as HTMLInputElement).value).toBe("só se tiver Meta");
  });

  it("reaproveitar: busca pelo nome na biblioteca e cria uma cópia nesta tarefa", async () => {
    render(<TaskDeliverablesEditor task={task()} act={act} />);
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar/ }));
    fireEvent.change(screen.getByLabelText("Buscar entregável existente"), { target: { value: "Relat" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Produto #3 · Rotina")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Reutilizar/ }).pop()!);
    await waitFor(() => expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Relatório mensal", delivery_moment: "cycle_end", cycle_scope: "every_cycle" }]);
  });

  it("somente leitura: nada de editar, adicionar ou remover; sem entregáveis explica que a tarefa conclui pelas etapas", () => {
    const { rerender } = render(<TaskDeliverablesEditor task={task()} act={act} readOnly />);
    expect(screen.getByText(/Nenhum entregável/)).toBeInTheDocument();
    expect(screen.queryByTitle("Adicionar entregável")).not.toBeInTheDocument();
    rerender(<TaskDeliverablesEditor task={task([full])} act={act} readOnly />);
    expect((screen.getByLabelText("Nome do entregável") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText("Remover entregável")).not.toBeInTheDocument();
  });
});
