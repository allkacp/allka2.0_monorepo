import { describe, expect, it } from "vitest";
import {
  fmtDateBR, logActorText, NO_VALUE, paymentMethodLabel, projectBillingSnapshot, projectModalityBadge,
  projectProductIdentity, projectProductModality, taskAssignmentLabels, taskCardCode, taskDeadlineLabel,
} from "./project-display";

// Dados no formato que o servidor devolve para o proj_956 (pedido da agência pago pelo link; manutenção mensal com assinatura).
const PAID_AT = "2026-11-01T21:57:01.886Z";
const proj956 = {
  payments: [
    { id: "p1", status: "FALHOU", payment_method: "CARTAO_TESTE", paid_at: null },
    { id: "p2", status: "PAGO", payment_method: "CARTAO_TESTE", paid_at: PAID_AT },
  ],
  invoices: [{ status: "paid", invoice_number: "INV-2026-0016", due_date: null, paid_at: PAID_AT }],
  subscriptions: [{ status: "ativa", current_period_end: "2026-12-01T21:57:01.886Z", next_invoice_at: "2026-11-26T21:57:01.886Z", project_product: { product_name_snapshot: "Manutenção e Alteração de Site ou Loja Virtual" } }],
};

describe("resumo do Faturamento do projeto — só dados gravados", () => {
  it("usa o pagamento aprovado e a agenda real da assinatura (nada de Carteira/15-10-2025/15-11-2025 fixos)", () => {
    const s = projectBillingSnapshot(proj956);
    expect(s.lastMethod).toBe("Cartão (teste)");
    expect(s.lastPaidAt).toBe(fmtDateBR(PAID_AT));
    expect(s.next?.source).toBe("subscription");
    expect(s.next?.date).toBe(fmtDateBR("2026-12-01T21:57:01.886Z"));
    expect(s.next?.note).toContain("Manutenção e Alteração de Site ou Loja Virtual");
    expect(s.next?.note).toContain("Nenhuma cobrança foi emitida ainda");
    expect(JSON.stringify(s)).not.toMatch(/Carteira|15\/10\/2025|15\/11\/2025/);
  });
  it("sem pagamento, fatura ou assinatura: mostra — em tudo, sem data suposta", () => {
    expect(projectBillingSnapshot({})).toEqual({ lastMethod: NO_VALUE, lastPaidAt: NO_VALUE, next: null });
  });
  it("fatura em aberto com vencimento vence a assinatura como próxima cobrança; tentativa que falhou não conta como pagamento", () => {
    const s = projectBillingSnapshot({
      payments: [{ status: "FALHOU", payment_method: "CARTAO_TESTE", paid_at: null }],
      invoices: [{ status: "pending", invoice_number: "INV-9", due_date: "2026-12-10T00:00:00Z" }],
      subscriptions: proj956.subscriptions,
    });
    expect(s.lastMethod).toBe(NO_VALUE);
    expect(s.lastPaidAt).toBe(NO_VALUE);
    expect(s.next).toEqual({ date: fmtDateBR("2026-12-10T00:00:00Z"), source: "invoice", note: "Vencimento da fatura INV-9." });
  });
  it("assinatura pausada ou cancelada não vira próxima cobrança; fatura paga sem pagamento dá a data, não a forma", () => {
    const s = projectBillingSnapshot({ invoices: [{ status: "paid", paid_at: PAID_AT }], subscriptions: [{ ...proj956.subscriptions[0], status: "pausada" }] });
    expect(s).toEqual({ lastMethod: NO_VALUE, lastPaidAt: fmtDateBR(PAID_AT), next: null });
    expect(paymentMethodLabel("RECORRENCIA_AUTOMATICA")).toBe("Recorrência automática");
    expect(paymentMethodLabel("NOVO_METODO")).toBe("NOVO_METODO");
  });
});

describe("produtos do projeto — nome/categoria congelados e modalidade por produto", () => {
  const seo = { product: null, catalog2_product_id: "c2-seo", product_name_snapshot: "SEO — Otimização para Buscadores", product_category_snapshot: "Performance", catalog2_period: null, recurrence_snapshot: null };
  const manut = { product: null, catalog2_product_id: "c2-man", product_name_snapshot: "Manutenção e Alteração de Site ou Loja Virtual", product_category_snapshot: "Soluções Web", catalog2_period: "mensal", recurrence_snapshot: "mensal" };
  it("catálogo novo sem produto antigo: usa o nome e a categoria gravados na compra (não —)", () => {
    expect(projectProductIdentity(seo)).toEqual({ nome: "SEO — Otimização para Buscadores", tipo: "Performance" });
    expect(projectProductIdentity(manut)).toEqual({ nome: "Manutenção e Alteração de Site ou Loja Virtual", tipo: "Soluções Web" });
  });
  it("catálogo antigo continua lendo o produto vinculado; sem nenhum dado, —", () => {
    expect(projectProductIdentity({ product: { name: "Site institucional", category: "Web" }, product_name_snapshot: "Nome antigo", product_category_snapshot: "Antiga" })).toEqual({ nome: "Site institucional", tipo: "Web" });
    expect(projectProductIdentity({ product: null })).toEqual({ nome: NO_VALUE, tipo: NO_VALUE });
  });
  it("modalidade vem de cada produto; linha antiga sem registro fica sem modalidade", () => {
    expect(projectProductModality(seo)).toBe("Avulso");
    expect(projectProductModality(manut)).toBe("Mensal");
    expect(projectProductModality({ recurrence_snapshot: "mensal" })).toBe("Mensal");
    expect(projectProductModality({})).toBeNull();
  });
  it("cabeçalho do projeto misto não diz só Avulso; projeto antigo mantém o tipo cadastrado", () => {
    const produtos = [
      { nome: "SEO", modalidade: "Avulso", catalog2: true },
      { nome: "Manutenção", modalidade: "Mensal", catalog2: true },
    ];
    expect(projectModalityBadge(produtos, "Avulso")).toEqual({ label: "Avulso + Mensal", recurring: true, title: "Modalidade por produto: SEO — Avulso · Manutenção — Mensal" });
    expect(projectModalityBadge([produtos[0]], "Mensal").label).toBe("Avulso");
    expect(projectModalityBadge([{ nome: "Antigo", modalidade: "Mensal", catalog2: false }], "Avulso")).toEqual({ label: "Avulso", recurring: false });
  });
});

describe("histórico do projeto — autoria registrada", () => {
  it("mostra usuário, sistema ou cliente final; sem registro, 'Autoria não registrada'", () => {
    expect(logActorText({ actor: { kind: "user", name: "Agência 1" } })).toEqual({ kind: "user", text: "Agência 1" });
    expect(logActorText({ actor: { kind: "system", detail: "automático, após o pagamento" } }).text).toBe("Sistema — automático, após o pagamento");
    expect(logActorText({ actor: { kind: "client", detail: "pelo link de pagamento" } }).text).toBe("Cliente final — pelo link de pagamento");
    expect(logActorText({ actor: { kind: "unknown" } })).toEqual({ kind: "unknown", text: "Autoria não registrada" });
    expect(logActorText({})).toEqual({ kind: "unknown", text: "Autoria não registrada" });
    expect(logActorText({ actor: { kind: "user" } }).kind).toBe("unknown");
  });
});

describe("executor, Líder e código das tarefas (Lista, Kanban, tarefas do produto)", () => {
  it("sem ninguém atribuído não sugere atribuição — para nenhum perfil", () => {
    const vazia = { executorAtribuido: false, executor: "", liderAtribuido: false, lider: "" };
    expect(taskAssignmentLabels(vazia, false)).toEqual({ executor: "Sem executor atribuído", lider: "Sem líder atribuído" });
    expect(taskAssignmentLabels(vazia, true)).toEqual({ executor: "Sem executor atribuído", lider: "Sem líder atribuído" });
  });
  it("atribuído: admin vê o nome; os demais veem só que existe, sem o nome protegido", () => {
    const t = { executorAtribuido: true, executor: "Nômade Fulano", liderAtribuido: true, lider: "Líder Beltrano" };
    expect(taskAssignmentLabels(t, true)).toEqual({ executor: "Nômade Fulano", lider: "Líder Beltrano" });
    expect(taskAssignmentLabels(t, false)).toEqual({ executor: "Nômade atribuído", lider: "Equipe Allka" });
    expect(JSON.stringify(taskAssignmentLabels(t, false))).not.toMatch(/Fulano|Beltrano/);
  });
  it("código do cartão é o da tarefa (T015718); número virtual só sem código", () => {
    expect(taskCardCode({ tarefaCode: "T015718" }, 1001)).toBe("T015718");
    expect(taskCardCode({ tarefaCode: null }, 1001)).toBe("#1001");
  });
});

describe("prazo na lista de tarefas do projeto", () => {
  it("antes do lançamento identifica o prazo PARA LANÇAR, sem mudar a data", () => {
    expect(taskDeadlineLabel({ prazo: "01/12/2026", prazoTipo: "lancamento" })).toEqual({ text: "Lançar até 01/12/2026", title: "Prazo para lançar a tarefa — não é o prazo de entrega." });
    expect(taskDeadlineLabel({ prazo: "15/12/2026", prazoTipo: "entrega" })).toEqual({ text: "15/12/2026" });
    expect(taskDeadlineLabel({ prazo: "" })).toEqual({ text: NO_VALUE });
  });
});
