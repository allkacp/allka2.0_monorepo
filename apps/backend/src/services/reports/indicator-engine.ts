// ─── Indicator Engine — Central Dispatcher ────────────────────────────────────
// Receives a validated IndicatorRunRequest + resolved scope, routes to the
// correct calculator, and wraps any error as a structured unavailable result
// (never silently returns zero for a calculation failure).

import type { JwtPayload } from "../../middleware/auth";
import type { CalculatorContext, IndicatorResult, IndicatorRunRequest } from "./types";
import { previousPeriod, unavailableResult } from "./types";
import { resolveUserScope } from "./report-access.service";

// Calculators
import { calcFaturamento, calcMrr, calcAvulsos, calcCheckoutCliente, calcPlanoCredito, calcChurnProjetos, calcChurnAgencias, calcTicketMedio, calcLtv, calcCmv, calcMargemBruta } from "./calculators/financial";
import { calcProjetosAtivos, calcProjetosRascunho, calcProjetosNegociacao, calcProjetosPerdidos, calcProjetosPorStatus } from "./calculators/projects";
import { calcTarefasContratadas, calcTarefasConcluidas, calcTarefasAtrasadas, calcPontuacaoTarefas, calcTarefasReprovadas } from "./calculators/tasks";
import { calcNomades, calcPontuacaoNomades, calcRemuneracaoNomade, calcRemuneracaoMedia, calcComissoesNomade, calcPontuacaoNomadePropria } from "./calculators/nomads";
import { calcClientesAtivos, calcClientesPorStatus, calcAtividade, calcInatividade, calcUsabilidade } from "./calculators/agencies";
import { calcCarteira, calcExtratoSummary } from "./calculators/wallets";
import { calcAgenciasLideradasStatus, calcProjetosAgenciasLideradas, calcUsabilidadeAgenciasLideradas, calcTarefasLider, calcFaturamentoLider } from "./calculators/leaders-partners";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Maps indicator IDs from the catalog to their calculator functions.

type CalculatorFn = (ctx: CalculatorContext) => Promise<IndicatorResult>;

const REGISTRY: Record<string, CalculatorFn> = {
  // Financial
  faturamento: calcFaturamento,
  mrr: calcMrr,
  avulsos: calcAvulsos,
  checkout_cliente: calcCheckoutCliente,
  plano_credito: calcPlanoCredito,
  novos_mrr: calcMrr,       // same logic, slightly different framing — reuse for now
  novos_avulsos: calcAvulsos,
  churn_projetos: calcChurnProjetos,
  churn_agencias: calcChurnAgencias,
  ticket_medio: calcTicketMedio,
  ltv: calcLtv,
  cmv: calcCmv,
  margem_bruta: calcMargemBruta,

  // Projects
  projetos_ativos: calcProjetosAtivos,
  projetos_rascunho: calcProjetosRascunho,
  projetos_negociacao: calcProjetosNegociacao,
  projetos_perdidos: calcProjetosPerdidos,
  projetos_status_breakdown: calcProjetosPorStatus,

  // Agency-scoped (share calculators with admin, scope is resolved)
  agency_projetos_status: calcProjetosPorStatus,
  agency_contratacoes_recorrentes: calcMrr,
  agency_contratacoes_avulsas: calcAvulsos,
  agency_checkout_cliente: calcCheckoutCliente,
  agency_churn_projetos: calcChurnProjetos,
  agency_ticket_medio: calcTicketMedio,
  agency_clientes_ativos: calcClientesAtivos,

  // Tasks
  tarefas_contratadas: calcTarefasContratadas,
  tarefas_concluidas: calcTarefasConcluidas,
  tarefas_atrasadas: calcTarefasAtrasadas,
  pontuacao_tarefas: calcPontuacaoTarefas,
  tarefas_reprovadas: calcTarefasReprovadas,

  // Nomads
  nomades: calcNomades,
  pontuacao_nomades: calcPontuacaoNomades,
  remuneracao_nomade: calcRemuneracaoNomade,
  remuneracao_media: calcRemuneracaoMedia,
  nomad_pontuacao: calcPontuacaoNomadePropria,
  nomad_tarefas_recebidas: calcTarefasContratadas,
  nomad_tarefas_concluidas: calcTarefasConcluidas,
  nomad_tarefas_atrasadas: calcTarefasAtrasadas,
  nomad_tarefas_reprovadas: calcTarefasReprovadas,
  nomad_pontuacao_tarefas: calcPontuacaoTarefas,
  nomad_remuneracao: calcRemuneracaoNomade,
  nomad_comissoes: calcComissoesNomade,

  // Clients / Agencies
  clientes_ativos: calcClientesAtivos,
  clientes_status: calcClientesPorStatus,
  atividade: calcAtividade,
  inatividade: calcInatividade,
  usabilidade: calcUsabilidade,

  // Wallets
  carteira: calcCarteira,
  extrato_summary: calcExtratoSummary,

  // Partner
  partner_agencias_lideradas_status: calcAgenciasLideradasStatus,
  partner_projetos_agencias: calcProjetosAgenciasLideradas,
  partner_tarefas_agencias: calcTarefasContratadas,
  partner_usabilidade_agencias: calcUsabilidadeAgenciasLideradas,

  // Leader
  leader_tarefas_recebidas: calcTarefasLider,
  leader_tarefas_concluidas: calcTarefasConcluidas,
  leader_tarefas_atrasadas: calcTarefasAtrasadas,
  leader_tarefas_reprovadas: calcTarefasReprovadas,
  leader_pontuacao_tarefas: calcPontuacaoTarefas,
  leader_remuneracao: calcRemuneracaoNomade,
  leader_comissoes: calcComissoesNomade,
  leader_faturamento_proporcionado: calcFaturamentoLider,

  // Indicators documented as missing (return structured unavailable)
  leads: () => Promise.resolve(unavailableResult("leads", "Leads", "missing_model", "Modelo Lead não existe no banco de dados. Este indicador requer migration para criar a tabela 'leads'.")),
  convertidos: () => Promise.resolve(unavailableResult("convertidos", "Convertidos", "missing_model", "Modelo Lead não existe. Necessário criar tabela 'leads' com campo converted_at.")),
  tempo_medio_uso: () => Promise.resolve(unavailableResult("tempo_medio_uso", "Tempo Médio de Uso", "missing_model", "Tempo médio de uso requer sessões com duração (started_at + ended_at). Use a tabela UsageEvent após instrumentar o frontend.")),
  agency_pontuacao: () => Promise.resolve(unavailableResult("agency_pontuacao", "Pontuação da Agência", "missing_model", "Campo Agency.score não existe. AgencyReport.rating existe mas é por relatório mensal, não score acumulado.")),
  agency_leads: () => Promise.resolve(unavailableResult("agency_leads", "Leads", "missing_model", "Modelo Lead não existe.")),
};

// ─── runIndicator ─────────────────────────────────────────────────────────────

export async function runIndicator(
  user: JwtPayload,
  request: IndicatorRunRequest,
): Promise<IndicatorResult> {
  const { indicatorId, startDate, endDate, filters = {}, comparisonMode = false } = request;

  const title = indicatorId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Parse dates — fail clearly instead of returning zeros for bad input
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return unavailableResult(
      indicatorId,
      title,
      "error",
      `Data inválida: startDate='${startDate}' endDate='${endDate}'.`,
    );
  }
  if (start > end) {
    return unavailableResult(
      indicatorId,
      title,
      "error",
      `startDate (${startDate}) deve ser anterior a endDate (${endDate}).`,
    );
  }

  // Look up calculator
  const calc = REGISTRY[indicatorId];
  if (!calc) {
    return unavailableResult(
      indicatorId,
      title,
      "missing_model",
      `Indicador '${indicatorId}' não está implementado. Verifique o catálogo em report-indicators.catalog.ts.`,
    );
  }

  // Resolve scope from JWT — queries DB to get entity IDs
  const scope = await resolveUserScope(user);

  const current = { start, end };
  const previous = comparisonMode ? previousPeriod(current) : undefined;

  const ctx: CalculatorContext = { scope, current, previous, filters };

  // Run calculator — catch errors and return structured failure (never silently zero)
  try {
    return await calc(ctx);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailableResult(
      indicatorId,
      title,
      "error",
      `Erro ao calcular indicador '${indicatorId}': ${msg}`,
    );
  }
}

// ─── runMultipleIndicators ────────────────────────────────────────────────────
// Runs multiple indicators in parallel, maintaining individual error isolation.

export async function runMultipleIndicators(
  user: JwtPayload,
  requests: IndicatorRunRequest[],
): Promise<IndicatorResult[]> {
  return Promise.all(requests.map((r) => runIndicator(user, r)));
}

// ─── listAvailableIndicatorIds ────────────────────────────────────────────────
// Returns which indicator IDs have a calculator registered.

export function listAvailableIndicatorIds(): string[] {
  return Object.keys(REGISTRY);
}
