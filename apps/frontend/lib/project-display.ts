// Apresentação da tela do projeto (Faturamento, Produtos, Tarefas e Histórico) — auditoria T28 de 01/11.
// Tudo vem do que o servidor gravou: nenhuma data, forma de pagamento, nome ou autor é suposto.
// Sem informação confiável, a tela mostra "—" (ou "Autoria não registrada").

export const NO_VALUE = "—";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARTAO_TESTE: "Cartão (teste)",
  RECORRENCIA_AUTOMATICA: "Recorrência automática",
  ALLKOINS: "Carteira (Allkoins)",
  BRINDE: "Brinde",
  LINK_PAGAMENTO: "Link de pagamento",
};

/** Forma de pagamento gravada no pagamento; código desconhecido aparece como veio. */
export function paymentMethodLabel(code?: string | null): string {
  if (!code) return NO_VALUE;
  return PAYMENT_METHOD_LABELS[code] ?? code;
}

export function fmtDateBR(iso?: string | Date | null): string {
  if (!iso) return NO_VALUE;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? NO_VALUE : d.toLocaleDateString("pt-BR");
}

type BillingPayment = { id?: string; status?: string | null; payment_method?: string | null; paid_at?: string | null };
type BillingInvoice = { status?: string | null; due_date?: string | null; paid_at?: string | null; invoice_number?: string | null };
type BillingSubscription = {
  status?: string | null;
  current_period_end?: string | null;
  next_invoice_at?: string | null;
  project_product?: { product_name_snapshot?: string | null } | null;
};

export type NextCharge = { date: string; source: "invoice" | "subscription"; note: string };

const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN);

/**
 * Resumo do Faturamento: última forma/data de pagamento e a próxima cobrança.
 * Próxima cobrança = fatura em aberto com vencimento gravado; sem ela, o fim do período de uma assinatura ATIVA
 * (data em que a renovação vence, já agendada no sistema). Nada disso é disparado ou calculado aqui.
 */
export function projectBillingSnapshot({ payments = [], invoices = [], subscriptions = [] }: {
  payments?: BillingPayment[]; invoices?: BillingInvoice[]; subscriptions?: BillingSubscription[];
}): { lastMethod: string; lastPaidAt: string; next: NextCharge | null } {
  const byNewest = (a?: string | null, b?: string | null) => time(b) - time(a);
  const paid = payments.filter((p) => p.status === "PAGO" && p.paid_at).sort((a, b) => byNewest(a.paid_at, b.paid_at))[0];
  const paidInvoice = invoices.filter((i) => i.status === "paid" && i.paid_at).sort((a, b) => byNewest(a.paid_at, b.paid_at))[0];
  const open = invoices
    .filter((i) => (i.status === "pending" || i.status === "overdue") && i.due_date)
    .sort((a, b) => time(a.due_date) - time(b.due_date))[0];
  let next: NextCharge | null = null;
  if (open?.due_date) {
    next = { date: fmtDateBR(open.due_date), source: "invoice", note: `Vencimento da fatura ${open.invoice_number ?? "em aberto"}.` };
  } else {
    const sub = subscriptions
      .filter((s) => s.status === "ativa" && s.current_period_end)
      .sort((a, b) => time(a.current_period_end) - time(b.current_period_end))[0];
    if (sub?.current_period_end) {
      const product = sub.project_product?.product_name_snapshot;
      const issue = sub.next_invoice_at ? ` A fatura é emitida em ${fmtDateBR(sub.next_invoice_at)}.` : "";
      next = {
        date: fmtDateBR(sub.current_period_end),
        source: "subscription",
        note: `Renovação agendada da assinatura${product ? ` de ${product}` : ""}.${issue} Nenhuma cobrança foi emitida ainda.`,
      };
    }
  }
  return {
    // Só o pagamento guarda a forma; a fatura paga sozinha prova a data, não a forma.
    lastMethod: paid ? paymentMethodLabel(paid.payment_method) : NO_VALUE,
    lastPaidAt: fmtDateBR(paid?.paid_at ?? paidInvoice?.paid_at ?? null),
    next,
  };
}

type ProjectProductLike = {
  product?: { name?: string | null; category?: string | null } | null;
  product_name_snapshot?: string | null;
  product_category_snapshot?: string | null;
  catalog2_product_id?: string | null;
  catalog2_period?: string | null;
  recurrence_snapshot?: string | null;
};

/** Nome e categoria do produto contratado: catálogo antigo como antes; no novo catálogo (sem produto antigo), os congelados na compra. */
export function projectProductIdentity(pp: ProjectProductLike): { nome: string; tipo: string } {
  return {
    nome: pp.product?.name || pp.product_name_snapshot || NO_VALUE,
    tipo: pp.product?.category || pp.product_category_snapshot || NO_VALUE,
  };
}

/** Modalidade contratada DESTE produto (o projeto pode misturar avulso e assinatura). null = não registrada (linhas antigas). */
export function projectProductModality(pp: ProjectProductLike): string | null {
  if (pp.catalog2_product_id) {
    if (!pp.catalog2_period) return "Avulso";
    return pp.catalog2_period.charAt(0).toUpperCase() + pp.catalog2_period.slice(1);
  }
  if (pp.recurrence_snapshot === "mensal") return "Mensal";
  if (pp.recurrence_snapshot === "avulso") return "Avulso";
  return null;
}

/**
 * Selo de modalidade do cabeçalho. Projetos do catálogo antigo mantêm o tipo cadastrado no projeto;
 * no novo catálogo o tipo do projeto não é preenchido na compra, então o selo resume as modalidades dos produtos.
 */
export function projectModalityBadge(
  produtos: { nome: string; modalidade?: string | null; catalog2?: boolean }[],
  storedLifecycle: string,
): { label: string; recurring: boolean; title?: string } {
  const catalog2 = produtos.filter((p) => p.catalog2 && p.modalidade);
  if (!catalog2.length) return { label: storedLifecycle, recurring: storedLifecycle === "Mensal" };
  const distinct = [...new Set(catalog2.map((p) => p.modalidade as string))].sort((a, b) => (a === "Avulso" ? -1 : b === "Avulso" ? 1 : a.localeCompare(b)));
  const title = `Modalidade por produto: ${catalog2.map((p) => `${p.nome} — ${p.modalidade}`).join(" · ")}`;
  return { label: distinct.join(" + "), recurring: distinct.some((m) => m !== "Avulso"), title };
}

export type LogActor = { kind: "user" | "system" | "client" | "unknown"; name?: string; detail?: string };

/** Quem fez a ação do histórico, como o servidor registrou. Sem registro: "Autoria não registrada" (nunca quem está vendo). */
export function logActorText(entry: { actor?: LogActor | null; actor_name?: string | null }): { kind: LogActor["kind"]; text: string } {
  const actor = entry.actor ?? (entry.actor_name ? { kind: "user" as const, name: entry.actor_name } : null);
  if (actor?.kind === "user" && actor.name) return { kind: "user", text: actor.name };
  if (actor?.kind === "client") return { kind: "client", text: `Cliente final${actor.detail ? ` — ${actor.detail}` : ""}` };
  if (actor?.kind === "system") return { kind: "system", text: `Sistema${actor.detail ? ` — ${actor.detail}` : ""}` };
  return { kind: "unknown", text: "Autoria não registrada" };
}

export const NO_EXECUTOR_LABEL = "Sem executor atribuído";
export const NO_TASK_LEADER_LABEL = "Sem líder atribuído";

/**
 * Executor e Líder da tarefa na tela do projeto (Lista, Kanban, tarefas do produto): só o que está atribuído de fato.
 * Nomes apenas para quem pode vê-los (admin); os demais veem "Nômade atribuído"/"Equipe Allka" — e nunca isso
 * quando ninguém foi atribuído (antes aparecia sempre, sugerindo uma atribuição inexistente).
 */
export function taskAssignmentLabels(
  tarefa: { executorAtribuido?: boolean; executor?: string | null; liderAtribuido?: boolean; lider?: string | null },
  canSeeNames: boolean,
): { executor: string; lider: string } {
  const executor = !tarefa.executorAtribuido ? NO_EXECUTOR_LABEL : canSeeNames && tarefa.executor ? tarefa.executor : "Nômade atribuído";
  const lider = !tarefa.liderAtribuido ? NO_TASK_LEADER_LABEL : canSeeNames && tarefa.lider ? tarefa.lider : "Equipe Allka";
  return { executor, lider };
}

/** Código mostrado no cartão/linha da tarefa: o código real (T015718); o número virtual só em dado antigo sem código. */
export function taskCardCode(tarefa: { tarefaCode?: string | null }, virtualId: number | string): string {
  return tarefa.tarefaCode || `#${virtualId}`;
}

/** Prazo mostrado na lista de tarefas: antes do lançamento é o prazo PARA LANÇAR (não o de entrega). */
export function taskDeadlineLabel(tarefa: { prazo?: string | null; prazoTipo?: "lancamento" | "entrega" }): { text: string; title?: string } {
  const prazo = tarefa.prazo || NO_VALUE;
  if (tarefa.prazoTipo !== "lancamento") return { text: prazo };
  return {
    text: `Lançar até ${prazo}`,
    title: "Prazo para lançar a tarefa — não é o prazo de entrega.",
  };
}
