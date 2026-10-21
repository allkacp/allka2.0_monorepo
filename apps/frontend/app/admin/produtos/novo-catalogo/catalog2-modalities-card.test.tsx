import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = {
  updateCatalog2ProductDeliveryRecurrence: vi.fn(async () => ({})),
  getCatalog2ProductPeriods: vi.fn(async () => ({ data: [{ period: "mensal", is_active: false, discount_percent: 0 }] })),
  updateCatalog2ProductPeriod: vi.fn(async () => ({})),
  updateCatalog2VersionInfo: vi.fn(async () => ({})),
  simulateCatalog2: vi.fn(async () => ({ pricing: null })),
  getWorkCalendar: vi.fn(async () => ({ business_hours_per_day: 8 })),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { ContractModesSection, MONTHLY_ISSUE_RE, readinessDestination } from "./product-editor";

// Correção de 16/10: o cartão de modalidades só tem Avulso e Assinatura mensal; a pergunta "gera nova entrega todo mês?" é feita no mesmo
// fluxo; a pendência de entrega mensal leva ao campo certo do Passo 4 (e nunca a um botão dentro de componente que não aparece).
const act = vi.fn(async (fn: () => Promise<any>, _ok?: string, opts?: any) => { try { await fn(); } catch (e) { if (opts?.rethrow) throw e; } });
const version = (over: Record<string, any> = {}) => ({ id: "v1", accepts_one_time: true, accepts_recurring: false, pricing_mode: "calculated", ...over });
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Cartão de modalidades · só Avulso e Assinatura mensal", () => {
  it("mostra apenas as duas modalidades, com os textos de ajuda combinados, e NENHUM controle antigo", () => {
    render(<ContractModesSection version={version()} readOnly={false} act={act} compact product={{ id: "p1", delivery_recurrence: null }} />);
    const card = screen.getByTestId("modalities-card");
    expect(within(card).getByText("Avulso")).toBeInTheDocument();
    expect(within(card).getByText("Assinatura mensal")).toBeInTheDocument();
    const helps = Array.from(card.querySelectorAll(".field-info")).map((i) => i.getAttribute("data-help") ?? "");
    expect(helps.some((h) => /um único ciclo, sem renovação automática/.test(h) && /primeira execução/.test(h))).toBe(true);
    expect(helps.some((h) => /novo ciclo a cada mês/.test(h) && /não são cobradas novamente/.test(h))).toBe(true);
    for (const legacy of [/Implementação inicial/i, /implementação no 1º mês/i, /Só em pacote/i, /Vendido sozinho/i, /Implementação roda/i, /Bloqueia a rotina/i]) {
      expect(screen.queryByText(legacy)).not.toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Venda")).not.toBeInTheDocument();
  });

  it("marcar 'Assinatura mensal' sem entrega mensal pergunta, no mesmo fluxo, se o produto gera nova entrega todo mês; 'Sim' liga entrega e período mensal", async () => {
    render(<ContractModesSection version={version()} readOnly={false} act={act} compact product={{ id: "p1", delivery_recurrence: null }} />);
    expect(screen.queryByTestId("recurrence-prompt")).not.toBeInTheDocument();
    const box = within(screen.getByTestId("modalities-card")).getAllByRole("checkbox")[1] as HTMLInputElement;
    fireEvent.click(box);
    const prompt = await screen.findByTestId("recurrence-prompt");
    expect(prompt.textContent).toMatch(/Este produto gera uma nova entrega todo mês\?/);
    expect(prompt.textContent).toMatch(/Cobrança mensal.*como o cliente paga/);
    fireEvent.click(screen.getByTestId("recurrence-yes"));
    await waitFor(() => expect(api.updateCatalog2ProductDeliveryRecurrence).toHaveBeenCalledWith("p1", "mensal"));
    await waitFor(() => expect(api.updateCatalog2ProductPeriod).toHaveBeenCalledWith("p1", "mensal", { discount_percent: 0, is_active: true }));
  });

  it("'Decidir no Passo 4' leva ao campo (atalho), sem resolver sozinho", () => {
    const go = vi.fn();
    render(<ContractModesSection version={version({ accepts_recurring: true })} readOnly={false} act={act} compact product={{ id: "p1", delivery_recurrence: null }} onGoToRecurrence={go} />);
    fireEvent.click(screen.getByTestId("recurrence-goto"));
    expect(go).toHaveBeenCalledTimes(1);
    expect(api.updateCatalog2ProductDeliveryRecurrence).not.toHaveBeenCalled();
  });

  it("com a entrega mensal já marcada, a pergunta não aparece", () => {
    render(<ContractModesSection version={version({ accepts_recurring: true })} readOnly={false} act={act} compact product={{ id: "p1", delivery_recurrence: "mensal" }} />);
    expect(screen.queryByTestId("recurrence-prompt")).not.toBeInTheDocument();
  });
});

describe("Checklist de publicação · pendência de entrega mensal leva ao campo certo", () => {
  it("o texto da pendência 'assinatura mensal sem entrega mensal recorrente' é reconhecido", () => {
    expect(MONTHLY_ISSUE_RE.test("A assinatura mensal está habilitada, mas o produto não tem entrega mensal recorrente: o cliente pagaria todo mês sem receber…")).toBe(true);
    expect(MONTHLY_ISSUE_RE.test("O período Mensal está cadastrado/ativo, mas a assinatura mensal não está habilitada")).toBe(true);
    expect(MONTHLY_ISSUE_RE.test("Informe o título comercial.")).toBe(false);
  });

  it("'Validação' com pendência de modalidade/entrega mensal abre o Passo 4 e o campo 'Este produto gera uma nova entrega todo mês'", () => {
    const dest = readinessDestination("validacao", {}, "A assinatura mensal está habilitada, mas o produto não tem entrega mensal recorrente.");
    expect(dest).toEqual({ tab: "precos", target: "catalog2-delivery-recurrence" });
  });

  it("'Validação' sem relação com a entrega mensal continua indo para Revisão e publicação", () => {
    expect(readinessDestination("validacao", {}, "Informe o título comercial.")).toMatchObject({ tab: "revisao", target: "sec-publicacao" });
  });

  it("toda pendência do checklist aponta para um destino (nunca para um botão invisível)", () => {
    for (const key of ["conteudo", "classificacao", "variacoes", "adicionais", "tarefas", "etapas", "esforco_tarefas", "prazo", "conexoes", "preco", "portfolio", "validacao", "publicacao"]) {
      const d = readinessDestination(key, { pillar: { id: "x" }, category: { id: "y" } }, "");
      expect(d.tab, key).toBeTruthy();
      expect(d.target, key).toMatch(/^(catalog2-|sec-)/);
    }
  });
});

describe("Entrega comercial · quadro Prontidão da entrega", () => {
  it("explica o que é verificado e que prontidão NÃO significa produto publicado", async () => {
    const version = { id: "v1", title: "T", summary: "S", tasks: [], accepts_one_time: true, accepts_recurring: false };
    const { DeliveryCommercialOverview } = await import("./product-editor");
    render(<DeliveryCommercialOverview version={version} readOnly={false} act={act} ringOf={() => ""} locked={false} product={{ id: "p1", delivery_recurrence: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /Entrega comercial/ }));
    expect(screen.getByTestId("readiness-subtitle").textContent).toMatch(/estrutura para executar o produto está configurada/);
    const box = screen.getByTestId("readiness-explain");
    expect(box.tagName).toBe("DETAILS");
    for (const t of [/Estrutura comercial:.*modalidades, recorrência e demais configurações comerciais/, /Tarefas e etapas:.*fluxo operacional, responsáveis, duração e regras de execução/, /Acessos e conexões:.*requisitos de acesso necessários, quando houver/]) expect(box.textContent).toMatch(t);
    expect(screen.getByTestId("readiness-not-published").textContent).toMatch(/não significa que o produto já está publicado.*publicação continua dependendo das demais validações/);
    expect(screen.getByTestId("charge-summary-card")).toBeInTheDocument();
  });
});
