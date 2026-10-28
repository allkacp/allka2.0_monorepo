import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecificAssigneeConfirmation } from "./specific-assignee-confirmation";
import { withAssigneeConfirmation, type AssigneeImpact } from "@/lib/specific-assignee-confirmation";
// Mantém o conteúdo real e isola apenas o portal/layout global.
vi.mock("@/components/standard-modal-dialog", () => ({ StandardModalDialog: ({ children, footer, title, onClose }: any) => <div role="dialog"><h2>{title}</h2><button onClick={onClose}>Fechar</button>{children}{footer}</div> }));
const impact: AssigneeImpact = { token: "a".repeat(64), action: "deactivate", user_name: "Pessoa de teste", matrices: [{ product_id: "p", product_number: 2, product_name: "Produto preservado", version_number: 1, version_state: "publicada", task_name: "Tarefa matriz", step_name: "Etapa matriz", label: "Líder específico" }], stages: [], executions: [] };
const failure = () => Object.assign(new Error("Confirme os vínculos"), { code: "specific_assignee_confirmation_required", data: { impact } });
afterEach(cleanup);
describe("Confirmação de impacto nominal", () => {
  it("exibe os vínculos e cancela sem repetir a mutação", async () => {
    render(<SpecificAssigneeConfirmation />); const op = vi.fn().mockRejectedValue(failure());
    const result = withAssigneeConfirmation(op).catch(e => e.message);
    await screen.findByRole("dialog"); expect(screen.getByText(/Produto 2 · Produto preservado/)).toBeInTheDocument();
    expect(screen.getByText("Etapa: Etapa matriz")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await result).toMatch(/cancelada/); expect(op).toHaveBeenCalledTimes(1);
  });
  it("só repete com o token depois de confirmação explícita", async () => {
    render(<SpecificAssigneeConfirmation />); const op = vi.fn().mockRejectedValueOnce(failure()).mockResolvedValueOnce({ saved: true });
    const result = withAssigneeConfirmation(op);
    await userEvent.click(await screen.findByRole("button", { name: "Inativar mesmo assim" }));
    expect(await result).toEqual({ saved: true }); expect(op.mock.calls).toEqual([[], [impact.token]]);
  });
  it("sem impacto não abre diálogo nem altera a operação", async () => {
    render(<SpecificAssigneeConfirmation />); const op = vi.fn().mockResolvedValue({ ok: true });
    expect(await withAssigneeConfirmation(op)).toEqual({ ok: true }); expect(screen.queryByRole("dialog")).toBeNull(); expect(op).toHaveBeenCalledTimes(1);
  });
  it("desmontar o diálogo cancela a operação pendente", async () => {
    const view = render(<SpecificAssigneeConfirmation />); const op = vi.fn().mockRejectedValue(failure());
    const result = withAssigneeConfirmation(op).catch(e => e.message); await screen.findByRole("dialog");
    act(() => view.unmount()); expect(await result).toMatch(/cancelada/); expect(op).toHaveBeenCalledTimes(1);
  });
  it("erro normal não pede confirmação", async () => {
    render(<SpecificAssigneeConfirmation />); const op = vi.fn().mockRejectedValue(new Error("Sem permissão"));
    await expect(withAssigneeConfirmation(op)).rejects.toThrow("Sem permissão"); expect(screen.queryByRole("dialog")).toBeNull();
  });
});
