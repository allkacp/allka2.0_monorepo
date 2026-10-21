import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { audienceToFieldVisibility, fieldVisibilityToAudience, FieldAudienceMenu } from "./catalog2-audience-ui";

vi.mock("@/lib/api-client", () => ({ apiClient: {} }));

// R21-13 (reunião 21/10): "Quem pode ver" de cada campo = caixas de marcar com atalho Todos, em todos os lugares.
describe("Quem pode ver este campo · conversões", () => {
  it("valores antigos viram públicos marcados e voltam ao valor guardado", () => {
    expect(fieldVisibilityToAudience("client")).toEqual(["company", "agency", "partner"]);
    expect(fieldVisibilityToAudience("company")).toEqual(["company"]);
    expect(fieldVisibilityToAudience("internal")).toEqual(["internal"]);
    expect(fieldVisibilityToAudience("team")).toEqual(["internal"]);
    expect(fieldVisibilityToAudience("company,partner")).toEqual(["company", "partner"]);
    expect(audienceToFieldVisibility(["company", "agency", "partner"])).toBe("client");
    expect(audienceToFieldVisibility(["company"])).toBe("company");
    expect(audienceToFieldVisibility(["partner", "company"])).toBe("company,partner");
    expect(audienceToFieldVisibility(["internal"])).toBe("internal");
  });
});

describe("Quem pode ver este campo · menu", () => {
  it("mostra o resumo, abre as caixas e grava uma lista (Todos = atalho); nunca grava vazio", () => {
    const onChange = vi.fn();
    render(<FieldAudienceMenu fieldKey="target_audience" value="client" onChange={onChange} />);
    const btn = screen.getByTestId("field-audience-target_audience");
    expect(btn.textContent).toContain("Todos");
    fireEvent.click(btn);
    fireEvent.click(screen.getByLabelText("Agency Partner")); // desmarca o partner
    expect(onChange).toHaveBeenLastCalledWith("company,agency");
    fireEvent.click(screen.getByLabelText("Todos")); // Todos limpa quando todos estavam marcados; aqui falta um -> marca os três
    expect(onChange).toHaveBeenLastCalledWith("client");
  });

  it("campo de equipe interna não abre; em leitura também não", () => {
    const { rerender } = render(<FieldAudienceMenu fieldKey="internal_notes" value="internal" onChange={vi.fn()} locked />);
    expect((screen.getByTestId("field-audience-internal_notes") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("field-audience-internal_notes").textContent).toContain("Somente equipe interna");
    rerender(<FieldAudienceMenu fieldKey="scope" value="client" onChange={vi.fn()} readOnly />);
    expect((screen.getByTestId("field-audience-scope") as HTMLButtonElement).disabled).toBe(true);
  });
});
