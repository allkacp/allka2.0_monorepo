// Situação do FLUXO de uma tarefa, em linguagem clara (Pedido 2): responde "por que está
// parada / o que falta" para cliente, executor e líder. É DERIVADA (status + contexto),
// então convive com os status já existentes sem mudar o motor.
import type { Prisma, PrismaClient } from "@prisma/client";
import { ruleStatesForTask } from "./project-dependencies";
import { isAssetValid } from "./client-assets";

type Db = PrismaClient | Prisma.TransactionClient;

export const FLOW_STATES = [
  "aguardando_inicio_ciclo",
  "aguardando_implementacao",
  "aguardando_ativo_acesso",
  "aguardando_conexao",
  "bloqueada_dependencia_externa",
  "aguardando_dependencia_produto",
  "aguardando_executor",
  "em_execucao",
  "entregue_pelo_executor",
  "aguardando_revisao",
  "aguardando_qualificacao",
  "em_ajustes",
  "aguardando_aprovacao_cliente",
  "concluida",
  "dispensada_por_regra",
  "cancelada",
  "em_lancamento",
] as const;
export type FlowState = (typeof FLOW_STATES)[number];

export const FLOW_STATE_LABEL: Record<FlowState, string> = {
  aguardando_inicio_ciclo: "Aguardando início do ciclo",
  aguardando_implementacao: "Aguardando implementação",
  aguardando_ativo_acesso: "Aguardando ativo/acesso",
  aguardando_conexao: "Aguardando conexão",
  bloqueada_dependencia_externa: "Bloqueada por dependência externa",
  aguardando_dependencia_produto: "Aguardando dependência de produto",
  aguardando_executor: "Aguardando executor",
  em_execucao: "Em execução",
  entregue_pelo_executor: "Entregue pelo executor",
  aguardando_revisao: "Aguardando revisão",
  aguardando_qualificacao: "Aguardando qualificação",
  em_ajustes: "Em ajustes",
  aguardando_aprovacao_cliente: "Aguardando aprovação",
  concluida: "Concluída",
  dispensada_por_regra: "Dispensada por regra",
  cancelada: "Cancelada",
  em_lancamento: "Em lançamento",
};

export interface TaskFlow {
  state: FlowState;
  label: string;
  reason: string;
  blockers: string[];
}

const DONE = ["CONCLUIDA", "APROVADA", "DISPENSADA_POR_REGRA"];

/** Perfis de fora da operação (agência e cliente): só veem o que lhes diz respeito; o miolo interno (revisão, qualificação, escolha de executor) vira "em execução". */
export function isExternalViewer(viewer?: string | null): boolean {
  return viewer === "agency" || viewer === "client";
}
const INTERNAL_ONLY_STATES: FlowState[] = ["aguardando_revisao", "aguardando_qualificacao", "entregue_pelo_executor", "aguardando_executor"];

/** Situação do fluxo já ajustada ao perfil de quem olha. */
export async function computeFlowStateFor(db: Db, taskId: string, viewer?: string | null): Promise<TaskFlow | null> {
  const flow = await computeFlowState(db, taskId);
  if (!flow || !isExternalViewer(viewer)) return flow;
  if (INTERNAL_ONLY_STATES.includes(flow.state)) {
    return { state: "em_execucao", label: FLOW_STATE_LABEL.em_execucao, reason: "Nossa equipe está cuidando desta tarefa.", blockers: [] };
  }
  if (flow.state === "em_ajustes") return { ...flow, reason: "Estamos fazendo os ajustes pedidos.", blockers: [] };
  return flow;
}

export async function computeFlowState(db: Db, taskId: string): Promise<TaskFlow | null> {
  const t = await db.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true, status: true, cycle_kind: true, occurrence_index: true, nomade_responsavel_id: true, continuity_status: true,
      aprovado_agencia_em: true, exige_aprovacao_cliente: true, catalog2_task: { select: { asset_rule: true, asset_revalidate_days: true } },
    },
  });
  if (!t) return null;
  const make = (state: FlowState, reason: string, blockers: string[] = []): TaskFlow => ({ state, label: FLOW_STATE_LABEL[state], reason, blockers });

  if (t.status === "CANCELADA") return make("cancelada", "Tarefa cancelada.");
  if (t.status === "DISPENSADA_POR_REGRA") return make("dispensada_por_regra", "Dispensada por regra — não precisa ser executada.");
  if (["CONCLUIDA", "APROVADA"].includes(t.status)) return make("concluida", "Entrega aprovada e tarefa encerrada.");
  if (t.status === "PAUSADA_DEPENDENCIA_EXTERNA") {
    const b = await db.projectTaskExternalBlock.findFirst({ where: { project_task_id: taskId, resolved_at: null }, orderBy: { started_at: "desc" } });
    return make("bloqueada_dependencia_externa", b ? `Pausada por dependência externa: ${b.reason} O prazo está suspenso.` : "Pausada por dependência externa. O prazo está suspenso.", b ? [b.reason] : []);
  }
  if (t.status === "AGUARDANDO_REVISAO") return make("aguardando_revisao", "A entrega aguarda a revisão técnica (antes da qualificação e da aprovação).");
  if (t.status === "AGUARDANDO_QUALIFICACAO") return make("aguardando_qualificacao", "A entrega aguarda o aceite interno do líder/qualificador.");
  if (t.status === "EM_AJUSTES") return make("em_ajustes", "O qualificador pediu ajustes; a tarefa voltou ao executor.");
  if (t.status === "ENTREGUE_PELO_NOMADE") return make("entregue_pelo_executor", "O executor entregou; aguarda a qualificação/conferência.");
  if (t.status === "APROVACAO_PENDENTE_CLIENTE" || (t.status === "EM_APROVACAO" && (t.aprovado_agencia_em || !t.exige_aprovacao_cliente))) {
    return make("aguardando_aprovacao_cliente", "A entrega aguarda a aprovação do cliente.");
  }
  if (t.status === "EM_APROVACAO") return make("aguardando_aprovacao_cliente", "A entrega aguarda a conferência de quem contratou.");

  // Esperas: implementação, dependência, ativo/acesso
  const blockers: string[] = [];
  let waitingImplementation = false;
  if (t.status === "PENDENTE_DE_LIBERACAO" || t.status === "AGUARDANDO_DEPENDENCIA_PRODUTO") {
    const deps = await db.taskDependency.findMany({ where: { task_id: taskId }, include: { depends_on_task: { select: { title: true, status: true, cycle_kind: true } } } });
    for (const d of deps.filter((x) => !DONE.includes(x.depends_on_task.status))) {
      blockers.push(`Aguardando "${d.depends_on_task.title}"`);
      if (d.depends_on_task.cycle_kind === "implementacao") waitingImplementation = true;
    }
  }
  const rules = (await ruleStatesForTask(db, taskId)).filter((r) => !r.satisfied && r.behavior !== "alert_only");
  for (const r of rules) blockers.push(r.reason);
  if (t.status === "PENDENTE_DE_LIBERACAO" || t.status === "AGUARDANDO_DEPENDENCIA_PRODUTO") {
    if (waitingImplementation) return make("aguardando_implementacao", "As tarefas operacionais só começam depois da implementação inicial.", blockers);
    if (rules.some((r) => r.targetKind === "connection")) return make("aguardando_conexao", "Falta uma conexão ou acesso necessário para esta tarefa.", blockers);
    if (rules.some((r) => r.targetKind === "info_asset")) return make("aguardando_ativo_acesso", "Falta validar um acesso/ativo do cliente.", blockers);
    if (blockers.length > 0) return make("aguardando_dependencia_produto", blockers[0], blockers);
    return make("aguardando_dependencia_produto", "Aguardando liberação.");
  }

  // Ativo/acesso pendente na etapa de acessos
  const accessLinks = await db.clientAssetLink.findMany({ where: { project_task_id: taskId, is_required: true }, include: { asset: true } });
  if (accessLinks.length > 0) {
    const stages = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: { ordem: "asc" } });
    const access = stages.find((s) => { try { return !!(s.config_snapshot && JSON.parse(s.config_snapshot).is_access_validation); } catch { return false; } });
    if (access && access.status !== "CONCLUIDA") {
      const pending = accessLinks.filter((l) => !isAssetValid(l.asset, t.catalog2_task?.asset_rule ?? "first_only", { revalidateDays: t.catalog2_task?.asset_revalidate_days }));
      if (pending.length > 0) return make("aguardando_ativo_acesso", `Falta validar: ${pending.map((l) => l.asset.label).join(", ")}.`, pending.map((l) => l.asset.label));
    }
  }

  if (t.continuity_status === "pending_choice") return make("aguardando_executor", "Aguardando a escolha: manter o mesmo executor do ciclo anterior?");
  if (t.status === "AGUARDANDO_NOMADE" || (t.status === "LIBERADA_PARA_EXECUCAO" && !t.nomade_responsavel_id)) return make("aguardando_executor", "Aguardando um executor assumir a tarefa.");
  if (t.status === "EM_EXECUCAO" || t.status === "LIBERADA_PARA_EXECUCAO") return make("em_execucao", "Em execução.");
  if (["PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES", "LANCAMENTO_EM_REVISAO", "RASCUNHO_OPERACIONAL"].includes(t.status)) {
    return t.occurrence_index > 0
      ? make("aguardando_inicio_ciclo", "Ciclo novo: aguardando o lançamento/início da tarefa.")
      : make("em_lancamento", "Tarefa em lançamento (briefing e informações).");
  }
  return make("em_execucao", t.status.replace(/_/g, " ").toLowerCase());
}
