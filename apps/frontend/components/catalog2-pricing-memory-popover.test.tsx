import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Catalog2PricingMemoryPopover } from "@/components/catalog2-pricing-memory-popover";

// Reunião 10/09 ("memória de cálculo da precificação — Admin Master"): o
// ícone de informação ao lado do preço mostra EXATAMENTE o que o backend
// (computePricing) já calculou — nunca recalcula/reformula nada aqui.
// Restrito a Admin Master; provisório (Catalog2ProvisionalPreview) sempre
// numa caixa separada, nunca misturado com o preço real.

const { api } = vi.hoisted(() => ({ api: { getCatalog2ProductPricingMemory: vi.fn() } }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

beforeEach(() => {
  vi.clearAllMocks();
});

const COMPLETE_PRICING = {
  version_id: "v1",
  version_state: "rascunho",
  pricing: {
    currency: "BRL",
    commercial_ready: true,
    quote_blockers: [],
    pending_info: [],
    applied_order: ["tax", "commission", "operational", "margin"],
    human_cost_breakdown: [
      { task_key: "t1", specialty: "Designer", minutes: 120, rate: 137.5, cost: 275 },
    ],
    lines: {
      human_cost: { label: "Custo humano", amount: 275, detail: "120 min no total" },
      ia_cost: { label: "Custo de IA (tokens + revisões)", amount: 0 },
      human_review_cost: { label: "Revisão humana", amount: 27.5, detail: "10% do custo humano" },
      addons: { label: "Adicionais selecionados", amount: 0 },
      variation_impacts: { label: "Impactos de variações", amount: 0 },
      condition_impacts: { label: "Impactos de condições", amount: null, detail: "nenhuma" },
      direct_cost: { label: "Custo direto (humano + IA)", amount: 275 },
      minimum_price: { label: "Preço mínimo permitido (= custo direto)", amount: 275 },
      subtotal_cost: { label: "Subtotal (custo acumulado)", amount: 302.5 },
      taxes_and_margins: [
        { label: "Impostos (Simples Nacional) (6% sobre acumulado)", amount: 18.15 },
        { label: "Comissão (10% sobre acumulado)", amount: 32.07 },
      ],
      commercial_final_price: { label: "Preço comercial final", amount: 493.71 },
      final_price: { label: "Preço comercial final", amount: 493.71 },
    },
  },
};

const BLOCKED_PRICING = {
  version_id: "v2",
  version_state: "rascunho",
  pricing: {
    currency: "BRL",
    commercial_ready: false,
    quote_blockers: ["preço comercial incompleto"],
    pending_info: ["valor/hora de especialidade", "ordem de incidência das taxas"],
    applied_order: ["tax", "commission", "operational", "margin"],
    human_cost_breakdown: [{ task_key: "t1", specialty: null, minutes: 0, rate: null, cost: null }],
    lines: {
      human_cost: { label: "Custo humano", amount: null, detail: "aguardando valor/hora de alguma especialidade" },
      ia_cost: { label: "Custo de IA (tokens + revisões)", amount: 0 },
      human_review_cost: { label: "Revisão humana", amount: null, detail: "aguardando definição comercial" },
      addons: { label: "Adicionais selecionados", amount: 0 },
      variation_impacts: { label: "Impactos de variações", amount: 0 },
      condition_impacts: { label: "Impactos de condições", amount: null, detail: "nenhuma" },
      direct_cost: { label: "Custo direto (humano + IA)", amount: null },
      minimum_price: { label: "Preço mínimo permitido (= custo direto)", amount: null },
      subtotal_cost: { label: "Subtotal (custo acumulado)", amount: 0 },
      taxes_and_margins: [],
      commercial_final_price: { label: "Preço comercial final", amount: null, detail: "A definir" },
      final_price: { label: "Preço comercial final", amount: null, detail: "A definir" },
    },
  },
};

async function openPopover() {
  const user = userEvent.setup();
  const btn = await screen.findByRole("button", { name: "Como o preço foi calculado" });
  await user.click(btn);
}

describe("Catalog2PricingMemoryPopover", () => {
  it("5. restrito ao Admin Master — sem isAdminMaster, não renderiza nem o ícone", () => {
    const { container } = render(<Catalog2PricingMemoryPopover productId="p1" isAdminMaster={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(api.getCatalog2ProductPricingMemory).not.toHaveBeenCalled();
  });

  it("Admin Master vê o ícone; nada é buscado antes de abrir", () => {
    render(<Catalog2PricingMemoryPopover productId="p1" isAdminMaster />);
    expect(screen.getByRole("button", { name: "Como o preço foi calculado" })).toBeInTheDocument();
    expect(api.getCatalog2ProductPricingMemory).not.toHaveBeenCalled();
  });

  it("1. produto com cálculo completo: mostra tarefas, especialidade, horas, valor/hora, percentuais e preço final — 6. exatamente os valores devolvidos pelo backend, nunca recalculados", async () => {
    api.getCatalog2ProductPricingMemory.mockResolvedValue(COMPLETE_PRICING);
    render(<Catalog2PricingMemoryPopover productId="p1" isAdminMaster />);
    await openPopover();

    expect(api.getCatalog2ProductPricingMemory).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.queryByText(/Calculando/i)).not.toBeInTheDocument());

    // tarefa: especialidade, minutos, valor/hora, custo — valores exatos do backend
    expect(screen.getByText("t1")).toBeInTheDocument();
    expect(screen.getByText(/Designer/)).toBeInTheDocument();
    expect(screen.getAllByText(/120 min/).length).toBeGreaterThan(0);
    expect(screen.getByText(/137,50\/h/)).toBeInTheDocument();

    // percentuais comerciais / ordem de incidência
    expect(screen.getByText(/tax → commission → operational → margin/)).toBeInTheDocument();
    expect(screen.getByText(/Impostos \(Simples Nacional\)/)).toBeInTheDocument();
    expect(screen.getByText(/Comissão \(10% sobre acumulado\)/)).toBeInTheDocument();

    // preço final — número exato vindo do backend (493.71), nunca recalculado aqui
    expect(screen.getByText("Preço comercial final")).toBeInTheDocument();
    expect(screen.getByText(/493,71/)).toBeInTheDocument();

    // nunca mostra o aviso de bloqueio quando o preço está pronto
    expect(screen.queryByText(/Preço ainda não calculável/i)).not.toBeInTheDocument();
  });

  it("2/3. produto sem cálculo possível: mostra 'Preço ainda não calculável' e lista exatamente os bloqueadores do backend", async () => {
    api.getCatalog2ProductPricingMemory.mockResolvedValue(BLOCKED_PRICING);
    render(<Catalog2PricingMemoryPopover productId="p2" isAdminMaster />);
    await openPopover();

    await waitFor(() => expect(screen.getByText(/Preço ainda não calculável/i)).toBeInTheDocument());
    expect(screen.getByText("valor/hora de especialidade")).toBeInTheDocument();
    expect(screen.getByText("ordem de incidência das taxas")).toBeInTheDocument();
    expect(screen.getByText("preço comercial incompleto")).toBeInTheDocument();
    // nunca inventa um preço quando ele é null
    expect(screen.queryByText(/493,71/)).not.toBeInTheDocument();
  });

  it("4. valor provisório aparece separado, claramente rotulado, e nunca junto da memória de cálculo real", async () => {
    api.getCatalog2ProductPricingMemory.mockResolvedValue(BLOCKED_PRICING);
    render(<Catalog2PricingMemoryPopover productId="p2" isAdminMaster provisionalPriceAmount={4321} />);
    await openPopover();

    await waitFor(() => expect(screen.getByText(/Preço ainda não calculável/i)).toBeInTheDocument());
    expect(screen.getByText(/Valor provisório para visualização/i)).toBeInTheDocument();
    expect(screen.getByText(/Nunca é preço comercial real/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.321,00/)).toBeInTheDocument();
  });

  it("erro de rede: mostra mensagem honesta, nunca finge um cálculo", async () => {
    api.getCatalog2ProductPricingMemory.mockRejectedValue(new Error("Falha ao calcular"));
    render(<Catalog2PricingMemoryPopover productId="p3" isAdminMaster />);
    await openPopover();
    expect(await screen.findByText("Falha ao calcular")).toBeInTheDocument();
  });
});
