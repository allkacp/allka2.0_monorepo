import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = {
  createCatalog2Deliverable: vi.fn(async () => ({})),
  updateCatalog2Deliverable: vi.fn(async () => ({})),
  deleteCatalog2Deliverable: vi.fn(async () => ({})),
  reorderCatalog2Deliverables: vi.fn(async () => ({})),
  searchCatalog2DeliverableLibrary: vi.fn(async () => ({ data: [{ id: "lib1", name: "Relatório mensal", description: "PDF", type: "arquivo", format: "PDF", responsible: "executor", is_required: true, requires_approval: true, visibility: "client", evidence_required: false, requires_qualification: false, delivery_moment: "cycle_end", cycle_scope: "every_cycle", template_url: null, template_name: null, from: "Produto #3 · Rotina" }] })),
  uploadCatalog2DeliverableFile: vi.fn(),
  downloadCatalog2DeliverableFile: vi.fn(),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
vi.mock("@/components/confirmation-dialog", () => ({
  ConfirmationDialog: ({ open, title, message, confirmText, cancelText, onConfirm, onClose }: any) => open ? (<div role="alertdialog" aria-label={title}><h2>{title}</h2><div>{message}</div><button onClick={onClose}>{cancelText ?? "Cancelar"}</button><button onClick={() => void onConfirm()}>{confirmText ?? "Confirmar"}</button></div>) : null,
}));
import { OPEN_STEP_EVENT, TaskDeliverablesEditor } from "./catalog2-deliverables-ui";

const act = vi.fn(async (fn: () => Promise<any>) => { await fn(); });
const task = (deliverables: any[] = []) => ({ id: "t1", name: "Gestão de anúncios", steps: [{ id: "s1", name: "Configurar a conta", sort_order: 1 }, { id: "s2", name: "Otimizar campanhas", sort_order: 2 }], deliverables });
const full = {
  id: "d1", key: "relatorio-mensal", name: "Relatório mensal", description: "PDF com métricas", type: "arquivo", responsible: "executor", is_required: true, requires_approval: true, visibility: "client", step_id: "s2",
  format: "PDF", delivery_moment: "cycle_end", template_url: "https://exemplo.test/modelo.pdf", template_name: "Modelo.pdf", evidence_required: true, requires_qualification: true, cycle_scope: "first_execution", is_conditional: false, condition_json: null,
};
const other = { ...full, id: "d2", key: "print-campanha", name: "Print da campanha", cycle_scope: "every_cycle", template_url: null, template_name: null };
const orphan = { ...full, id: "d3", key: "sem-etapa", name: "Contrato assinado", step_id: null };
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Entregáveis da tarefa · resumo derivado das etapas", () => {
  it("rascunho novo já salvo retoma com ID real e não cria uma segunda cópia após F5", async () => {
    const created = { ...full, id: "novo-salvo", name: "Rascunho salvo" };
    api.createCatalog2Deliverable.mockResolvedValueOnce(created);
    const first = render(<TaskDeliverablesEditor task={task([])} act={act} />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    fireEvent.change(screen.getByLabelText("Nome do entregável"), { target: { value: created.name } });
    fireEvent.click(screen.getByTestId("deliverable-save-draft"));
    await waitFor(() => expect(screen.getByText("Editar entregável")).toBeInTheDocument());
    first.unmount(); render(<TaskDeliverablesEditor task={task([created])} act={act} />);
    expect(screen.getByLabelText("Nome do entregável")).toHaveValue(created.name);
    fireEvent.click(screen.getByTestId("deliverable-save-draft"));
    await waitFor(() => expect(api.updateCatalog2Deliverable).toHaveBeenCalledWith(created.id, expect.anything()));
    expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1);
  });
  it("F5 reabre o entregável no mesmo bloco com dados locais sem enviar alteração", () => {
    const first = render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    fireEvent.change(screen.getByLabelText("Nome do entregável"), { target: { value: "Nome que ainda não salvei" } });
    fireEvent.click(screen.getByRole("button", { name: /Arquivo-modelo/ }));
    first.unmount();
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    expect(screen.getByLabelText("Nome do entregável")).toHaveValue("Nome que ainda não salvei");
    expect(screen.getByRole("button", { name: "Escolher arquivo salvo" })).toBeVisible();
    expect(api.updateCatalog2Deliverable).not.toHaveBeenCalled();
  });
  it("não reabre entregável excluído do servidor nem recupera edição no modo leitura", () => {
    const first = render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    first.unmount();
    const second = render(<TaskDeliverablesEditor task={task([full])} act={act} readOnly />);
    expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument();
    second.unmount(); render(<TaskDeliverablesEditor task={task([])} act={act} />);
    expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument();
  });
  it("agrupa pela etapa responsável (número + nome) e mostra tipo, recorrência, responsável, momento, obrigatoriedade, aprovação e visibilidade", () => {
    render(<TaskDeliverablesEditor task={task([full, { ...other, step_id: "s1" }])} act={act} />);
    const titles = screen.getAllByTestId("deliverable-group-title").map((t) => t.textContent);
    expect(titles[0]).toContain("Etapa 1 — Configurar a conta");
    expect(titles[1]).toContain("Etapa 2 — Otimizar campanhas");
    // uma linha só por entregável: os detalhes vão no tooltip do ícone de info
    fireEvent.focus(within(screen.getAllByTestId("deliverable-row")[1]).getByLabelText("Informações do entregável Relatório mensal"));
    const chips = screen.getAllByTestId("deliverable-chips")[0].textContent!;
    for (const t of ["Arquivo", "só 1ª execução", "Executor", "No fim do ciclo", "obrigatório", "aprovação do cliente"]) expect(chips).toContain(t);
    expect(screen.queryByTestId("deliverable-body")).not.toBeInTheDocument();
  });

  it("entregável sem etapa vai para o grupo 'Entregáveis sem etapa responsável' com aviso de pendência", () => {
    render(<TaskDeliverablesEditor task={task([full, orphan])} act={act} />);
    const groups = screen.getAllByTestId("deliverable-group");
    expect(groups.at(-1)!.textContent).toContain("Entregáveis sem etapa responsável");
    expect(groups.at(-1)!.textContent).toContain("Contrato assinado");
    expect(screen.getByTestId("deliverables-orphans").textContent).toContain("1 entregável sem etapa responsável");
  });

  it("sem abrir/fechar: o ícone de info mostra os detalhes (ID permanente, etapa, momento, recorrência, evidência, modelo)", () => {
    render(<TaskDeliverablesEditor task={task([full, other])} act={act} />);
    expect(screen.queryByLabelText("Expandir entregável Relatório mensal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expandir todos" })).not.toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Informações do entregável Relatório mensal"));
    const info = screen.getAllByTestId("deliverable-info")[0];
    expect(within(info).getAllByTestId("deliverable-id")[0].textContent).toBe("ID relatorio-mensal");
    expect(info.textContent).toContain("Etapa 2 — Otimizar campanhas");
    expect(info.textContent).toContain("No fim do ciclo");
    expect(info.textContent).toContain("Só na primeira execução");
    expect(info.textContent).toContain("Modelo.pdf");
    expect(info.textContent).toMatch(/Exige evidência\?\s*SIM/);
  });

  it("busca só aparece com mais de 3 entregáveis e filtra por nome sem acento", () => {
    const many = ["Plano estratégico", "Relatório", "Print", "Contrato"].map((name, i) => ({ ...full, id: `x${i}`, key: `k${i}`, name, step_id: "s1" }));
    render(<TaskDeliverablesEditor task={task(many)} act={act} />);
    fireEvent.change(screen.getByTestId("deliverable-search"), { target: { value: "relatorio" } });
    expect(screen.getAllByTestId("deliverable-row")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("deliverable-search"), { target: { value: "zzz" } });
    expect(screen.getByTestId("deliverable-search-empty")).toBeInTheDocument();
  });

  it("'Ir para a etapa' pede ao editor da etapa para abrir (mesmo registro, sem copiar)", () => {
    const got: string[] = [];
    const on = (e: Event) => got.push((e as CustomEvent).detail.stepId);
    window.addEventListener(OPEN_STEP_EVENT, on);
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByRole("button", { name: "Ir para a etapa" }));
    window.removeEventListener(OPEN_STEP_EVENT, on);
    expect(got).toEqual(["s2"]);
  });

  it("o lápis abre o modal com tudo preenchido e o contexto da tarefa/etapa; mudar a recorrência e salvar envia o corpo completo do MESMO registro", async () => {
    render(<TaskDeliverablesEditor task={task([{ ...full, cycle_scope: "every_cycle" }])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    const modal = screen.getByTestId("deliverable-modal");
    expect(within(modal).getByText("Editar entregável")).toBeInTheDocument();
    expect(within(modal).getByTestId("deliverable-modal-context").textContent).toContain("Etapa 2 — Otimizar campanhas");
    expect(within(modal).getByTestId("deliverable-go-step")).toBeInTheDocument();
    expect((within(modal).getByLabelText("Nome do entregável") as HTMLInputElement).value).toBe("Relatório mensal");
    expect((within(modal).getByLabelText("Etapa") as HTMLSelectElement).value).toBe("s2");
    expect((within(modal).getByLabelText("Exige aprovação") as HTMLInputElement).checked).toBe(true);
    // rodapé sempre à vista, em 3 botões
    const foot = within(screen.getByTestId("deliverable-modal-footer"));
    expect(foot.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(foot.getByTestId("deliverable-save-draft")).toBeInTheDocument();
    const sel = within(modal).getByLabelText("Recorrência do entregável") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "first_execution" } });
    expect(within(modal).getByTestId("deliverable-dirty")).toBeInTheDocument();
    fireEvent.click(within(modal).getByTestId("deliverable-save"));
    await waitFor(() => expect(api.updateCatalog2Deliverable).toHaveBeenCalledTimes(1));
    const [id, body] = api.updateCatalog2Deliverable.mock.calls[0] as any[];
    expect(id).toBe("d1");
    expect(body).toMatchObject({ cycle_scope: "first_execution", delivery_moment: "cycle_end", format: "PDF", step_id: "s2", evidence_required: true, requires_qualification: true, template_name: "Modelo.pdf", draft: false });
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled(); // nada de cópia paralela
  });

  it("modal tem 8 blocos recolhíveis com nomes completos", () => {
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    const names = ["Identificação", "Entrega e formato", "Responsável e etapa", "Momento e recorrência", "Evidência e aprovação", "Condições", "Arquivo-modelo", "Visibilidade e avançado"];
    names.forEach((n, i) => expect(screen.getByTestId(`deliverable-section-${i + 1}`).textContent).toContain(n));
  });

  it("concluir com campos faltando NÃO fecha, NÃO apaga e explica; 'Salvar rascunho' guarda assim mesmo", async () => {
    render(<TaskDeliverablesEditor task={task()} act={act} />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/ }));
    const modal = screen.getByTestId("deliverable-modal");
    expect(within(modal).getByText("Novo entregável")).toBeInTheDocument();
    fireEvent.change(within(modal).getByLabelText("Nome do entregável"), { target: { value: "Contrato assinado" } });
    fireEvent.click(within(modal).getByTestId("deliverable-save"));
    const sum = await within(modal).findByTestId("deliverable-error-summary");
    expect(sum.textContent).toContain("Descreva o que é o entregável");
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
    expect((within(modal).getByLabelText("Nome do entregável") as HTMLInputElement).value).toBe("Contrato assinado");
    fireEvent.click(within(modal).getByTestId("deliverable-save-draft"));
    await waitFor(() => expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Contrato assinado", draft: true }]);
  });

  it("condicional: marcar revela o campo da condição e conta o que falta", () => {
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    const modal = screen.getByTestId("deliverable-modal");
    expect(within(modal).queryByTestId("deliverable-condition-box")).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByLabelText("Entregável condicional"));
    const box = within(modal).getByTestId("deliverable-condition-box");
    expect(within(box).getByTestId("reveal-missing").textContent).toBe("falta 1 campo");
    fireEvent.change(within(box).getByLabelText("Condição do entregável"), { target: { value: "só se tiver Meta" } });
    expect(within(modal).queryByTestId("reveal-missing")).not.toBeInTheDocument();
  });

  it("cancelar o modal sem mexer fecha direto e não grava; com alterações pergunta antes", () => {
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    fireEvent.click(within(screen.getByTestId("deliverable-modal-footer")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Editar entregável Relatório mensal"));
    fireEvent.change(screen.getByLabelText("Nome do entregável"), { target: { value: "Outro nome" } });
    fireEvent.click(within(screen.getByTestId("deliverable-modal-footer")).getByRole("button", { name: "Cancelar" }));
    expect(screen.getByTestId("deliverable-close-ask")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("deliverable-close-discard"));
    expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument();
    expect(api.updateCatalog2Deliverable).not.toHaveBeenCalled();
  });

  it("a lixeira pede confirmação antes de excluir; recusa do servidor (entregável já usado) não perde nada", async () => {
    render(<TaskDeliverablesEditor task={task([full, other])} act={act} />);
    fireEvent.click(screen.getByLabelText("Excluir entregável Print da campanha"));
    const dlg = screen.getByRole("alertdialog");
    expect(dlg.textContent).toContain("Print da campanha");
    expect(api.deleteCatalog2Deliverable).not.toHaveBeenCalled();
    fireEvent.click(within(dlg).getByRole("button", { name: "Cancelar" }));
    expect(api.deleteCatalog2Deliverable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Excluir entregável Print da campanha"));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Excluir entregável" }));
    await waitFor(() => expect(api.deleteCatalog2Deliverable).toHaveBeenCalledWith("d2"));
  });

  it("duplicar cria um novo registro com '(cópia)' no nome e os mesmos campos", async () => {
    render(<TaskDeliverablesEditor task={task([full])} act={act} />);
    fireEvent.click(screen.getByLabelText("Duplicar entregável Relatório mensal"));
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled(); // pede confirmação antes
    fireEvent.click(screen.getByRole("button", { name: "Duplicar entregável" }));
    await waitFor(() => expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Relatório mensal (cópia)", format: "PDF", cycle_scope: "first_execution", step_id: "s2" }]);
  });

  it("ordenar dentro da etapa: subir/descer manda a nova ordem dos ids; o primeiro não sobe e o último não desce", async () => {
    render(<TaskDeliverablesEditor task={task([full, other])} act={act} />);
    expect(screen.getByLabelText("Subir entregável Relatório mensal")).toBeDisabled();
    expect(screen.getByLabelText("Descer entregável Print da campanha")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Descer entregável Relatório mensal"));
    await waitFor(() => expect(api.reorderCatalog2Deliverables).toHaveBeenCalledWith("t1", ["d2", "d1"]));
  });

  it("somente leitura: nada de editar, adicionar ou remover; sem entregáveis explica que a tarefa conclui pelas etapas", () => {
    const { rerender } = render(<TaskDeliverablesEditor task={task([full])} act={act} readOnly />);
    expect(screen.queryByLabelText("Editar entregável Relatório mensal")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Excluir entregável Relatório mensal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar/ })).not.toBeInTheDocument();
    rerender(<TaskDeliverablesEditor task={task()} act={act} readOnly />);
    expect(screen.getByText(/A tarefa conclui só pelas etapas/)).toBeInTheDocument();
  });

  it("reutilizar existente busca na biblioteca e cria o entregável nesta tarefa", async () => {
    render(<TaskDeliverablesEditor task={task()} act={act} />);
    fireEvent.click(screen.getByRole("button", { name: /Reutilizar existente/ }));
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    fireEvent.click(await screen.findByRole("button", { name: /Reutilizar$/ }));
    await waitFor(() => expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Relatório mensal" }]);
  });
});

// R21-09 (reunião 21/10): o resumo de entregáveis da tarefa é só consulta; editar = ir para a etapa de origem.
describe("Entregáveis da tarefa · modo só resumo (summaryOnly)", () => {
  it("não mostra criar, reutilizar, editar, excluir, duplicar nem reordenar", () => {
    render(<TaskDeliverablesEditor summaryOnly task={task([full, other])} act={act} />);
    expect(screen.queryByRole("button", { name: /Adicionar|Reutilizar existente/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("deliverable-actions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar entregável|Excluir entregável|Duplicar entregável|Subir entregável|Descer entregável/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("deliverables-hint").textContent).toContain("Ir para a etapa");
  });

  it("cada entregável tem 'Ir para a etapa' que abre a etapa de origem; sem etapa aparece o aviso", () => {
    const got: string[] = [];
    const on = (e: Event) => got.push((e as CustomEvent).detail.stepId);
    window.addEventListener(OPEN_STEP_EVENT, on);
    render(<TaskDeliverablesEditor summaryOnly task={task([full, orphan])} act={act} />);
    fireEvent.click(screen.getByTestId("deliverable-go-step"));
    window.removeEventListener(OPEN_STEP_EVENT, on);
    expect(got).toEqual(["s2"]);
    expect(screen.getByTestId("deliverable-no-step").textContent).toContain("sem etapa");
  });

  it("R21-06: a linha recolhida mostra 'arquivo anexado' só nos entregáveis que têm arquivo", () => {
    render(<TaskDeliverablesEditor task={task([full, other])} readOnly summaryOnly act={act as any} />);
    const marks = screen.getAllByTestId("deliverable-has-file");
    expect(marks).toHaveLength(1);
    expect(marks[0].getAttribute("title")).toContain("Modelo.pdf");
  });
});
