import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectReferenceStats, ProjectReferenceActions } from "./project-reference-parts";
afterEach(cleanup);
function mount(status = "in-progress", archived = false) {
  const calls = { onView: vi.fn(), onEdit: vi.fn(), onClone: vi.fn(), onCancel: vi.fn(), onArchive: vi.fn(), onContinue: vi.fn(), onPayment: vi.fn() };
  render(<ProjectReferenceActions name="Teste" status={status} archived={archived} {...calls} />);
  return calls;
}
describe("Projetos — referência Clientes", () => {
  it("mostra quatro indicadores reais, sem inventar crescimento", () => {
    render(<ProjectReferenceStats total={2} active={1} completed={0} mrr={2000} />);
    expect(screen.getByTestId("project-reference-stats").children).toHaveLength(4);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("R$ 2k")).toBeInTheDocument();
    expect(screen.queryByText(/no mês/)).not.toBeInTheDocument();
  });
  it("oferece Ver, Editar e Mais ações compactos", async () => {
    const user = userEvent.setup(), calls = mount();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Ver projeto Teste" }));
    await user.click(screen.getByRole("button", { name: "Editar projeto Teste" }));
    expect(calls.onView).toHaveBeenCalledOnce(); expect(calls.onEdit).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Mais ações — Teste" }));
    await user.click(screen.getByRole("menuitem", { name: "Clonar projeto" }));
    expect(calls.onClone).toHaveBeenCalledOnce();
  });
  it("rascunho continua ou descarta, sem clonar nem pagar", async () => {
    const user = userEvent.setup(), calls = mount("draft");
    await user.click(screen.getByRole("button", { name: "Continuar projeto Teste" }));
    expect(calls.onContinue).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Mais ações — Teste" }));
    expect(screen.queryByRole("menuitem", { name: "Clonar projeto" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Descartar rascunho" }));
    expect(calls.onCancel).toHaveBeenCalledOnce();
  });
  it("aguardando pagamento preserva pagar, editar, cancelar e arquivar", async () => {
    const user = userEvent.setup(), calls = mount("awaiting-payment");
    await user.click(screen.getByRole("button", { name: "Mais ações — Teste" }));
    expect(screen.queryByRole("menuitem", { name: "Clonar projeto" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Arquivar projeto" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cancelar projeto" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Ir para pagamento" }));
    expect(calls.onPayment).toHaveBeenCalledOnce();
  });
  it("arquivado permanece somente leitura", async () => {
    const user = userEvent.setup(); mount("in-progress", true);
    expect(screen.getByRole("button", { name: "Editar projeto Teste" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Mais ações — Teste" }));
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.queryByRole("menuitem", { name: "Cancelar projeto" })).not.toBeInTheDocument();
  });
});
