import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const updateTask = vi.fn(async () => ({}));
vi.mock("@/lib/api-client", () => ({ apiClient: { updateCatalog2Task: (...a: any[]) => (updateTask as any)(...a) } }));
import { ContinuityCard } from "./continuity-card";

// Continuidade do executor (16/10): configuração simples e visível no Passo 2; cada alteração salva na hora.
const act = vi.fn(async (fn: () => Promise<any>) => { await fn(); });
const task = (over: Record<string, any> = {}) => ({
  id: "t1", executor_continuity: "not_allowed", continuity_accept_hours: null, continuity_if_unavailable: "normal_queue", continuity_after_deadline: "normal_queue",
  reuse_connections_same_project: true, asset_rule: "first_only", asset_revalidate_days: null, ...over,
});

beforeEach(() => { updateTask.mockClear(); act.mockClear(); });

describe("Continuidade do executor · Passo 2", () => {
  it("mostra as 4 opções e o texto de ajuda de cada uma; 'Não permitida' esconde os detalhes", () => {
    render(<ContinuityCard task={task()} readOnly={false} act={act} />);
    const select = screen.getByLabelText("Continuidade do executor nos próximos ciclos") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Não permitida", "Permitida", "Recomendada", "Obrigatória"]);
    expect(screen.getByTestId("continuity-help").textContent).toMatch(/distribuição normal/);
    expect(screen.queryByTestId("continuity-details")).not.toBeInTheDocument();
  });

  it("escolher 'Recomendada' salva na hora e já sugere o prazo de aceite de 2 horas (editável)", async () => {
    render(<ContinuityCard task={task()} readOnly={false} act={act} />);
    fireEvent.change(screen.getByLabelText("Continuidade do executor nos próximos ciclos"), { target: { value: "recommended" } });
    await waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1));
    expect(updateTask).toHaveBeenCalledWith("t1", { executor_continuity: "recommended", continuity_accept_hours: 2, scope: "product" });
  });

  it("Produto 1: Recomendada, aceite de 2 h, indisponível → distribuição normal, depois do prazo → fila normal, conexões só no mesmo projeto", () => {
    render(<ContinuityCard task={task({ executor_continuity: "recommended", continuity_accept_hours: 2 })} readOnly={false} act={act} />);
    expect(screen.getByTestId("continuity-details")).toBeInTheDocument();
    expect((screen.getByLabelText("Prazo de aceite do executor preferido (horas)") as HTMLInputElement).value).toBe("2");
    expect((screen.getByLabelText("Se o executor estiver indisponível") as HTMLSelectElement).value).toBe("normal_queue");
    expect((screen.getByLabelText("Depois do prazo, usar a distribuição normal") as HTMLElement).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("Reutilizar conexões só no mesmo projeto") as HTMLElement).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("continuity-help").textContent).toMatch(/prazo para aceitar/);
  });

  it("o prazo de aceite é salvo ao sair do campo; valor fora de 1–168 h é ignorado", async () => {
    render(<ContinuityCard task={task({ executor_continuity: "recommended", continuity_accept_hours: 2 })} readOnly={false} act={act} />);
    const input = screen.getByLabelText("Prazo de aceite do executor preferido (horas)");
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.blur(input);
    expect(updateTask).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.blur(input);
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith("t1", { continuity_accept_hours: 6, scope: "product" }));
  });

  it("'Se o executor estiver indisponível' e 'Revalidação dos acessos' salvam a escolha; 'a cada X dias' pede os dias", async () => {
    const { rerender } = render(<ContinuityCard task={task({ executor_continuity: "allowed", continuity_accept_hours: 2 })} readOnly={false} act={act} />);
    fireEvent.change(screen.getByLabelText("Se o executor estiver indisponível"), { target: { value: "ask_leader" } });
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith("t1", { continuity_if_unavailable: "ask_leader", scope: "product" }));
    fireEvent.change(screen.getByLabelText("Revalidação dos acessos antes do novo ciclo"), { target: { value: "every_x_days" } });
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith("t1", { asset_rule: "every_x_days", scope: "product" }));
    expect(screen.queryByLabelText("Dias para revalidar os acessos")).not.toBeInTheDocument();
    rerender(<ContinuityCard task={task({ executor_continuity: "allowed", asset_rule: "every_x_days", asset_revalidate_days: 30 })} readOnly={false} act={act} />);
    expect((screen.getByLabelText("Dias para revalidar os acessos") as HTMLInputElement).value).toBe("30");
  });

  it("'Obrigatória' não tem prazo nem 'depois do prazo' (vai direto); somente leitura desabilita tudo", () => {
    const { rerender } = render(<ContinuityCard task={task({ executor_continuity: "required" })} readOnly={false} act={act} />);
    expect((screen.getByLabelText("Prazo de aceite do executor preferido (horas)") as HTMLInputElement).disabled).toBe(true);
    rerender(<ContinuityCard task={task({ executor_continuity: "recommended", continuity_accept_hours: 2 })} readOnly act={act} />);
    expect((screen.getByLabelText("Continuidade do executor nos próximos ciclos") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Se o executor estiver indisponível") as HTMLSelectElement).disabled).toBe(true);
  });

  it("cada campo tem o ícone de informação (i) com explicação", () => {
    render(<ContinuityCard task={task({ executor_continuity: "recommended", continuity_accept_hours: 2 })} readOnly={false} act={act} />);
    const infos = Array.from(document.querySelectorAll(".field-info"));
    expect(infos.length).toBeGreaterThanOrEqual(6);
    expect(infos.every((i) => (i.getAttribute("data-help") ?? "").length > 20)).toBe(true);
  });
});
