import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepLeaderSelect } from "./step-leader-select";
const props = { mode: "specific", userId: "u1", leaders: [], loading: false, failed: false, onChange: vi.fn() };
describe("Regra de líder nominal versus automático", () => {
  it("não declara indisponibilidade enquanto carrega", () => {
    render(<StepLeaderSelect {...props} loading />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Consultando/ })).toBeInTheDocument();
  });
  it("falha na consulta não vira cadastro excluído", () => {
    render(<StepLeaderSelect {...props} failed />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("não significa que o cadastro foi excluído");
  });
  it("pessoa indisponível pode ser substituída por distribuição automática", async () => {
    const onChange=vi.fn(), user=userEvent.setup();
    render(<StepLeaderSelect {...props} onChange={onChange} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "__auto");
    expect(onChange).toHaveBeenCalledWith("auto", "");
  });
  it("automático ignora ID residual e não exige lista de líderes preenchida", () => {
    render(<StepLeaderSelect {...props} mode="auto" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("__auto");
    expect(screen.getByText(/opção automática não exige um nome/)).toBeInTheDocument();
  });
  it("administrador não pode aparecer entre líderes e referência antiga fica indisponível", () => {
    render(<StepLeaderSelect {...props} leaders={[{id:"u1",name:"Responsável",kind:"admin"}]} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Sempre Responsável/ })).not.toBeInTheDocument();
  });
});
