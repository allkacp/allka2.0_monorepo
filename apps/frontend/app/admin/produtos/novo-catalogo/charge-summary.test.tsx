import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({ apiClient: {} }));
import { ChargeMemory, ChargeSummary, NO_FIRST_EXECUTION, chargeSummaryOf } from "./charge-summary";

// Cobrança do produto (16/10): a implantação nasce das etapas "Só na primeira execução"; a renovação é só o recorrente.
// A tela nunca calcula preço: mostra o que o servidor devolveu na simulação.
const pricing = (over: Record<string, any> = {}) => ({
  currency: "R$",
  pending_info: [],
  split: {
    commercial_summary: {
      implementation_price: 400, first_cycle_recurring_price: 200, first_charge: 600, renewal: 200, avulso: 600,
      implementation_steps: [{ ref: "rotina:s1", name: "Configurar a conta", price: 400 }],
      recurring_steps: [{ ref: "rotina:s2", name: "Otimizar campanhas", price: 200 }],
    },
    first_execution: { has_steps: true, applies: true, reason: "", steps: [{ ref: "rotina:s1" }] },
    dispensable: { steps: [], renewal_if_dispensed: null, savings_per_cycle: 0, note: "", continuity_mode: "not_allowed" },
    implementation: { applicable: true, cost: 300, price: 400, steps: [{ name: "Configurar a conta" }], taxes_and_margins: [{ label: "Imposto", amount: 20 }] },
    recurring: { cost: 150, price: 200, steps: [{ name: "Otimizar campanhas" }] },
    not_charged: [],
    ...over,
  },
});

describe("Cobrança estimada · implantação × recorrente", () => {
  it("mostra implantação, ciclo recorrente, primeira cobrança, renovação e avulso com valores DIFERENTES e as etapas de cada um", () => {
    render(<ChargeSummary pricing={pricing()} />);
    expect(within(screen.getByTestId("charge-implementation")).getByText("R$ 400,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-first-cycle")).getByText("R$ 200,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-first")).getByText("R$ 600,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-renewal")).getByText("R$ 200,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-avulso")).getByText("R$ 600,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-steps-implementation")).getByText("Configurar a conta")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-steps-recurring")).getByText("Otimizar campanhas")).toBeInTheDocument();
    expect(screen.queryByText(NO_FIRST_EXECUTION)).not.toBeInTheDocument();
  });

  it("deixa evidente o que é pagamento único e o que é por ciclo; implementação nunca é apresentada como recorrente", () => {
    render(<ChargeSummary pricing={pricing()} />);
    const kind = (id: string) => screen.getByTestId(id + "-kind").textContent;
    expect(kind("charge-implementation")).toBe("Pagamento único");
    expect(kind("charge-first-cycle")).toBe("Por ciclo");
    expect(kind("charge-renewal")).toBe("Por ciclo");
    expect(kind("charge-first")).toMatch(/Pagamento único/);
    expect(kind("charge-avulso")).toBe("Pagamento único");
    expect(screen.getByTestId("charge-implementation").textContent).toMatch(/somente na primeira entrega/);
    expect(screen.getByTestId("charge-first-cycle").textContent).toMatch(/cada novo ciclo da assinatura/);
    expect(screen.getByTestId("charge-first").textContent).toMatch(/Soma da implementação com o primeiro ciclo recorrente/);
    expect(screen.getByTestId("charge-avulso").textContent).toMatch(/única entrega, sem renovação automática/);
    expect(screen.getByTestId("charge-estimate-note").textContent).toMatch(/estimados.*recalculados automaticamente.*especialidades.*IA.*qualificação.*adicionais/);
    expect(screen.getByTestId("charge-steps-details").tagName).toBe("DETAILS");
    expect(within(screen.getByTestId("charge-steps-recurring")).getByText(/por ciclo/)).toBeInTheDocument();
  });

  it("produto vendido só por assinatura não mostra o cartão de compra avulsa (só visual)", () => {
    render(<ChargeSummary pricing={pricing()} acceptsOneTime={false} />);
    expect(screen.queryByTestId("charge-avulso")).not.toBeInTheDocument();
    expect(screen.getByTestId("charge-first")).toBeInTheDocument();
  });

  it("produto SEM etapa de primeira execução mostra a mensagem combinada e primeira cobrança = renovação", () => {
    const p = pricing({
      commercial_summary: { implementation_price: 0, first_cycle_recurring_price: 200, first_charge: 200, renewal: 200, avulso: 200, implementation_steps: [], recurring_steps: [{ ref: "r:s1", name: "Rotina", price: 200 }] },
      first_execution: { has_steps: false, applies: true, reason: NO_FIRST_EXECUTION, steps: [] },
      implementation: { applicable: false },
    });
    render(<ChargeSummary pricing={p} />);
    expect(within(screen.getByTestId("charge-implementation")).getByText("—")).toBeInTheDocument();
    expect(screen.getAllByText(NO_FIRST_EXECUTION).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("charge-first")).getByText("R$ 200,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-renewal")).getByText("R$ 200,00")).toBeInTheDocument();
  });

  it("preço ainda a definir: avisa o que falta e nunca inventa valor", () => {
    const p = pricing({ commercial_summary: { implementation_price: null, first_cycle_recurring_price: null, first_charge: null, renewal: null, avulso: null, implementation_steps: [], recurring_steps: [] } });
    render(<ChargeSummary pricing={{ ...p, pending_info: ["horas da etapa Otimizar campanhas"] }} />);
    expect(screen.getByTestId("charge-summary-pending").textContent).toMatch(/Preço ainda a definir: falta horas da etapa Otimizar campanhas/);
    expect(within(screen.getByTestId("charge-first")).getByText("A definir")).toBeInTheDocument();
  });

  it("especialidade ausente identifica a etapa e mantém todas as cobranças como 'A definir'", () => {
    const p = pricing({ commercial_summary: { implementation_price: null, first_cycle_recurring_price: null, first_charge: null, renewal: null, avulso: null, implementation_steps: [], recurring_steps: [] } });
    render(<ChargeSummary pricing={{ ...p, pending_info: ['especialidade de etapa(s) com horas ("Configurar a conta" da tarefa "Tarefa rotina")'] }} />);
    expect(screen.getByTestId("charge-summary-pending").textContent).toContain('Configurar a conta');
    expect(within(screen.getByTestId("charge-implementation")).getByText("A definir")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-renewal")).getByText("A definir")).toBeInTheDocument();
    expect(within(screen.getByTestId("charge-avulso")).getByText("A definir")).toBeInTheDocument();
  });

  it("etapas dispensáveis com o mesmo executor: informa a renovação reduzida e quais etapas saem", () => {
    const p = pricing({ dispensable: { steps: [{ ref: "rotina:s2", name: "Conferir acessos", price: 50 }], renewal_if_dispensed: 150, savings_per_cycle: 50, note: "", continuity_mode: "recommended" } });
    render(<ChargeSummary pricing={p} />);
    const box = screen.getByTestId("charge-dispensable");
    expect(box.textContent).toMatch(/Se o mesmo executor continuar/);
    expect(box.textContent).toMatch(/Conferir acessos/);
    expect(box.textContent).toMatch(/R\$ 150,00/);
  });

  it("recontratação no mesmo projeto: explica por que a implantação não é cobrada", () => {
    const p = pricing({ first_execution: { has_steps: true, applies: false, reason: "A primeira execução deste produto já foi contratada neste projeto.", steps: [{ ref: "rotina:s1" }] } });
    render(<ChargeSummary pricing={p} />);
    expect(screen.getByTestId("charge-first-off").textContent).toMatch(/já foi contratada neste projeto/);
  });

  it("estados de erro e carregamento são honestos", () => {
    const { rerender } = render(<ChargeSummary pricing={null} loading />);
    expect(screen.getByTestId("charge-summary-loading").textContent).toMatch(/Calculando/);
    rerender(<ChargeSummary pricing={null} error="falha de rede" />);
    expect(screen.getByRole("alert").textContent).toMatch(/falha de rede/);
  });

  it("memória de cálculo separa 'Implantação/primeira execução' de 'Ciclo recorrente' e fecha primeira cobrança, renovação e avulso", () => {
    render(<ChargeMemory pricing={pricing()} />);
    expect(screen.getByText("Implantação/primeira execução")).toBeInTheDocument();
    expect(screen.getByText("Ciclo recorrente")).toBeInTheDocument();
    expect(within(screen.getByTestId("memory-impl-price")).getByText("R$ 400,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("memory-rec-price")).getByText("R$ 200,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("memory-first")).getByText("R$ 600,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("memory-renewal")).getByText("R$ 200,00")).toBeInTheDocument();
    expect(within(screen.getByTestId("memory-avulso")).getByText("R$ 600,00")).toBeInTheDocument();
  });

  it("chargeSummaryOf tolera resultado antigo sem 'split' (produto/versão antigos)", () => {
    const r = chargeSummaryOf({ currency: "R$" });
    expect(r.cs).toBeNull();
    expect(r.hasImplementation).toBe(false);
  });
});
