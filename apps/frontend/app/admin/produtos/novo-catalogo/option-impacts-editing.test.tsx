import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Item 6 (31/10): preço e prazo das opções de variação. O resumo "Preço / Prazo / Etapas / Entregáveis" parecia um formulário
// mas não editava; agora cada item abre o campo certo. Impactos aparecem em português e o "calculado × informado" fica explícito.
const api: Record<string, any> = {
  addCatalog2OptionEffect: vi.fn(async () => ({})),
  deleteCatalog2OptionEffect: vi.fn(async () => ({})),
  updateCatalog2Option: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => api[k] ?? vi.fn(async () => ({ data: [] })) }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800, sidebarWidth: 72 }) }));
import { VariationOptionRow, effectHumanLabel, resetOpenStoreForTests } from "./product-editor";

const version = { id: "v1", tasks: [{ key: "t1", name: "SEO", steps: [{ key: "e1", name: "Aplicar ajustes", sort_order: 1, specialty_id: "sp1", is_conditional: false }] }], variations: [], addons: [], conditions: [] };
const variation = { id: "va1", name: "Quantidade de páginas", selection_type: "single", base_included: true, options: [] };
const act = vi.fn(async (fn: () => Promise<any>) => fn());
const option = (effects: any[] = []) => ({ id: "o1", label: "Até 10 páginas", is_default: false, is_active: true, availability: "auto", effects });
const mount = (effects: any[] = [], readOnly = false) => render(<ul><VariationOptionRow option={option(effects)} variation={variation} index={0} list={[]} version={version} readOnly={readOnly} act={act} /></ul>);
const openImpacts = () => fireEvent.click(screen.getByTestId("option-detail-toggle"));

beforeEach(() => { resetOpenStoreForTests(); sessionStorage.clear(); localStorage.clear(); Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("impactos da opção — preço e prazo editáveis a partir do resumo", () => {
  it("clicar em Prazo abre a área de impactos com 'Adicionar dias ao prazo' escolhido; salvar grava o impacto da opção", async () => {
    mount();
    openImpacts();
    const acc = screen.getByTestId("option-deadline-accordion") as HTMLDetailsElement;
    expect(acc.open).toBe(false);
    fireEvent.click(screen.getByTestId("impact-pick-deadline"));
    expect(acc.open).toBe(true);
    const area = within(acc);
    expect((area.getAllByRole("combobox")[0] as HTMLSelectElement).value).toBe("add_deadline_days");
    fireEvent.change(area.getByPlaceholderText("valor"), { target: { value: "2" } });
    fireEvent.click(area.getByRole("button", { name: /adicionar/i }));
    await waitFor(() => expect(api.addCatalog2OptionEffect).toHaveBeenCalledWith("o1", expect.objectContaining({ effect_type: "add_deadline_days", effect_value: "2" })));
  });

  it("clicar em Preço escolhe 'Adicionar valor fixo' e explica calculado × informado; com horas extras avisa a cobrança dobrada", () => {
    mount([{ id: "h1", effect_type: "add_effort_hours", effect_value: "2", source_task_key: "t1", source_step_key: "e1" }]);
    openImpacts();
    expect(screen.getByTestId("impact-pick-price")).toHaveTextContent("Calculado pelas horas extras");
    fireEvent.click(screen.getByTestId("impact-pick-price"));
    const acc = within(screen.getByTestId("option-deadline-accordion"));
    expect((acc.getAllByRole("combobox")[0] as HTMLSelectElement).value).toBe("add_fixed_amount");
    expect(screen.getByTestId("price-informed-help")).toHaveTextContent("calculado");
    expect(screen.getByTestId("price-double-charge-warning")).toBeInTheDocument();
  });

  it("impactos aparecem em português, não com o nome interno", () => {
    expect(effectHumanLabel({ effect_type: "add_deadline_days", effect_value: "2" })).toBe("Prazo: +2 dia(s)");
    expect(effectHumanLabel({ effect_type: "add_fixed_amount", effect_value: "50" })).toBe("Preço informado: + R$ 50,00");
    expect(effectHumanLabel({ effect_type: "add_percent", effect_value: "10" })).toBe("Preço informado: + 10%");
    mount([{ id: "d1", effect_type: "add_deadline_days", effect_value: "2" }]);
    openImpacts();
    fireEvent.click(screen.getByTestId("impact-pick-deadline"));
    const items = screen.getAllByTestId("effect-item").map((x) => x.textContent);
    expect(items.some((t) => t?.includes("Prazo: +2 dia(s)"))).toBe(true);
    expect(items.some((t) => t?.includes("add_deadline_days"))).toBe(false);
  });

  // Validação 31/10 (API simulada): atalho Preço → informar → salvar → "reabrir" com o que o servidor devolve → conferir.
  it("preço pelo atalho: grava UMA vez pela rota da opção e, reaberto com o retorno do servidor, mostra o impacto em português", async () => {
    const first = mount();
    openImpacts();
    fireEvent.click(screen.getByTestId("impact-pick-price"));
    const acc = within(screen.getByTestId("option-deadline-accordion"));
    fireEvent.change(acc.getByPlaceholderText("valor"), { target: { value: "50" } });
    const add = acc.getByRole("button", { name: /adicionar/i });
    fireEvent.click(add); fireEvent.click(add); // segundo clique: campo já limpo, nada é enviado
    await waitFor(() => expect(api.addCatalog2OptionEffect).toHaveBeenCalledTimes(1));
    expect(api.addCatalog2OptionEffect).toHaveBeenCalledWith("o1", expect.objectContaining({ effect_type: "add_fixed_amount", effect_value: "50" }));
    first.unmount(); resetOpenStoreForTests();
    mount([{ id: "e1", effect_type: "add_fixed_amount", effect_value: "50" }, { id: "e2", effect_type: "add_deadline_days", effect_value: "3" }]);
    openImpacts();
    expect(screen.getByTestId("impact-pick-price")).toHaveTextContent("1 alteração"); // resumo conta; o valor aparece na lista
    expect(screen.getByTestId("impact-pick-price")).not.toHaveTextContent("Sem alteração");
    fireEvent.click(screen.getByTestId("impact-pick-price"));
    const texts = screen.getAllByTestId("effect-item").map((x) => x.textContent ?? "");
    expect(texts.some((t) => t.includes("Preço informado: + R$ 50,00"))).toBe(true);
    expect(texts.some((t) => t.includes("Prazo: +3 dia(s)"))).toBe(true);
  });

  it("versão publicada (leitura): o resumo não vira atalho e nada pode ser adicionado", () => {
    mount([{ id: "d1", effect_type: "add_deadline_days", effect_value: "2" }], true);
    openImpacts();
    expect(screen.queryByTestId("impact-pick-price")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("valor")).not.toBeInTheDocument();
  });
});
