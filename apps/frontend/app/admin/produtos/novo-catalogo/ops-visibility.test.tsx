import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { rolesOf, visibilityOfRoles, visibilitySummary, VisibilitySelect } from "./catalog2-ops-ui";
import { QuestionAudienceMenu, questionAudienceOf, questionVisibilityOf } from "./catalog2-questions-ui";

// R21-13 (reunião 21/10): "Quem pode ver" em tarefas, etapas, entregáveis e perguntas = caixas de marcar com atalho Todos.
describe("Quem pode ver (tarefa, etapa e entregável): lista de perfis", () => {
  it("nível antigo vira o conjunto 'até aquele nível' e volta ao nível quando é exatamente isso", () => {
    expect([...rolesOf("agency")]).toEqual(["internal", "leader", "executor", "agency"]);
    expect(visibilityOfRoles(new Set(["internal", "leader", "executor", "agency"]))).toBe("agency");
    expect(visibilityOfRoles(new Set(["internal", "leader", "executor", "agency", "client"]))).toBe("client");
    expect(visibilityOfRoles(new Set(["internal", "client", "leader"]))).toBe("internal,leader,client");
    expect([...rolesOf("internal,executor,client")].sort()).toEqual(["client", "executor", "internal"]);
    expect(visibilitySummary("client")).toBe("Todos, inclusive o cliente");
    expect(visibilitySummary("internal,leader,client")).toBe("Administração + Líder + Cliente (empresa)");
  });

  it("menu: Todos marca os cinco; desmarcar um perfil grava a lista; administração sempre fica marcada e travada", () => {
    const onChange = vi.fn();
    render(<VisibilitySelect value="executor" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("visibility-menu"));
    expect((screen.getByLabelText("Administração") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Administração") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText("Todos"));
    expect(onChange).toHaveBeenLastCalledWith("client");
    fireEvent.click(screen.getByLabelText("Líder")); // depois do Todos estão os cinco marcados; tira o líder
    expect(onChange).toHaveBeenLastCalledWith("internal,executor,agency,client");
  });
});

describe("Quem vê a pergunta: caixas de marcar", () => {
  it("mapeia para os mesmos 4 valores de sempre", () => {
    expect(questionAudienceOf("client")).toEqual({ client: true, team: false });
    expect(questionAudienceOf("both")).toEqual({ client: true, team: true });
    expect(questionVisibilityOf({ client: false, team: true })).toBe("team");
    expect(questionVisibilityOf({ client: false, team: false })).toBe("internal");
  });

  it("Todos = cliente e equipe; desmarcar tudo = só interno", () => {
    const onChange = vi.fn();
    render(<QuestionAudienceMenu value="client" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("question-audience"));
    fireEvent.click(screen.getByLabelText("Todos"));
    expect(onChange).toHaveBeenLastCalledWith("both");
    fireEvent.click(screen.getByLabelText("Cliente")); // desmarca o cliente (estava marcado)
    expect(onChange).toHaveBeenLastCalledWith("internal");
  });
});
