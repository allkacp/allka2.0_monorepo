// Indicadores do Programa Partner no painel do Partner — fonte ÚNICA dos cartões
// do topo e do widget "Métricas": só o que a API devolve para a conta (ausente = 0).
// Antes, o topo lia números de demonstração (124 convites, 38 clientes, Diamond)
// e calculava "a receber"/"pago no mês" com proporções inventadas (28%/45%).

export interface PartnerProgramStats {
  total?: number;
  invitesSent?: number;
  accepted?: number;
  mrrGenerated?: number;
  diamond?: number;
  platinum?: number;
  gold?: number;
  silver?: number;
}

// value aceita número porque o renderizador do painel trata os dois formatos.
type Metric = { value: string | number; change: number; trend: "up" };

/** Dados do widget "Programa Partner" (convites, ativos, níveis) — mesma regra: só o que a API devolve, ausente = 0. */
export function partnerProgramWidgetData(pp: PartnerProgramStats | null | undefined) {
  return {
    total: pp?.total ?? 0,
    invitesSent: pp?.invitesSent ?? 0,
    pending: 0,
    accepted: pp?.accepted ?? 0,
    diamond: pp?.diamond ?? 0,
    platinum: pp?.platinum ?? 0,
    gold: pp?.gold ?? 0,
    silver: pp?.silver ?? 0,
    bronze: 0,
    mrrGenerated: pp?.mrrGenerated ?? 0,
  };
}

/** Valor exibido quando a plataforma ainda não registra o dado — nunca um número inventado. */
export const NO_DATA_VALUE = "—";

export function partnerProgramMetrics(pp: PartnerProgramStats | null | undefined) {
  const invites = pp?.invitesSent ?? 0;
  const accepted = pp?.accepted ?? 0;
  const total = pp?.total ?? 0;
  const generated = pp?.mrrGenerated ?? 0;
  const metric = (value: string): Metric => ({ value, change: 0, trend: "up" });
  const money = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;
  const level = pp?.diamond ? "Diamond" : pp?.platinum ? "Platinum" : pp?.gold ? "Gold" : pp?.silver ? "Silver" : "Bronze";
  return {
    invitesSent: metric(invites.toLocaleString("pt-BR")),
    clientsConverted: metric(accepted.toLocaleString("pt-BR")),
    activeClients: metric(total.toLocaleString("pt-BR")),
    commissionsGenerated: metric(money(generated)),
    // A API ainda não informa comissões a receber nem pagas no mês.
    commissionsToReceive: metric(NO_DATA_VALUE),
    commissionPaidMonth: metric(NO_DATA_VALUE),
    conversionRate: metric(`${(invites > 0 ? (accepted / invites) * 100 : 0).toFixed(1)}%`),
    partnerLevel: metric(level),
  };
}
