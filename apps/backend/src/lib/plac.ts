// PLAC — Procedimento Lógico de Atendimento Consultivo: cronograma de 13 passos aberto automaticamente quando o projeto é PAGO (2026-10-06).
// O modelo dos passos é editável pela administração (quem faz, D+N dias, para quem vale, responsáveis internos de cobrança);
// cada projeto recebe uma cópia, com os prazos calculados a partir do pagamento. Fonte: Imersão Partner Allka (cronograma de 13 passos).
import type { Prisma, PrismaClient } from "@prisma/client";
import { audienceAllows, type AudienceViewer } from "./catalog2-audience";
import { createFromPlacStep } from "./internal-tasks";

type Db = PrismaClient | Prisma.TransactionClient;

export const PLAC_ROLES = ["vc", "ac", "other"] as const;
export const PLAC_ROLE_LABEL: Record<string, string> = { vc: "Consultor (VC)", ac: "Assistente Consultiva (AC)", other: "Outro" };
export const PLAC_PHASES = ["inicio", "mensal", "fim"] as const;
export const PLAC_PHASE_LABEL: Record<string, string> = { inicio: "Início do contrato", mensal: "Mensal", fim: "Fim do ciclo" };
export const PLAC_REPEAT = ["none", "monthly", "end_of_cycle"] as const;
export const PLAC_STATUS = ["pendente", "em_andamento", "concluida", "dispensada"] as const;
export const PLAC_STATUS_LABEL: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", dispensada: "Dispensada" };

interface Seed { key: string; name: string; description: string; role_kind: string; phase: string; after_key: string | null; offset_days: number; estimated_hours: number; hourly_cost: number; repeat_rule: string }
/** Os 13 passos do cronograma PLAC. Prazos (D+N) são SUGESTÃO inicial e ficam editáveis nas Configurações. */
export const PLAC_DEFAULT_STEPS: Seed[] = [
  { key: "agendamento_briefing", name: "Agendamento de Briefing", description: "A assistente consultiva (AC) agenda a reunião e envia o checklist de preparação; envia lembrete de confirmação 2 h antes.", role_kind: "ac", phase: "inicio", after_key: null, offset_days: 1, estimated_hours: 0.17, hourly_cost: 20, repeat_rule: "none" },
  { key: "reuniao_briefing", name: "Reunião e Elaboração do Briefing", description: "O consultor (VC) conduz o briefing consultivo, aplica a Matriz 4 F's e agenda a apresentação do Plano Tático.", role_kind: "vc", phase: "inicio", after_key: "agendamento_briefing", offset_days: 2, estimated_hours: 1, hourly_cost: 50, repeat_rule: "none" },
  { key: "criacao_ptt", name: "Criação e Detalhamento do PTT", description: "O VC elabora o Plano Tático (PT), a Matriz de Prioridade, a Estrutura de Upsell e o Termo de Aceite.", role_kind: "vc", phase: "inicio", after_key: "reuniao_briefing", offset_days: 3, estimated_hours: 4, hourly_cost: 50, repeat_rule: "none" },
  { key: "apresentacao_ptt", name: "Apresentação do PTT", description: "O VC apresenta a estratégia, defende a blindagem e coleta a aprovação formal do cliente.", role_kind: "vc", phase: "inicio", after_key: "criacao_ptt", offset_days: 2, estimated_hours: 1, hourly_cost: 50, repeat_rule: "none" },
  { key: "handover_gravacao", name: "Handover (AC) e Gravação", description: "O VC envia a aprovação (Termo de Aceite) e a gravação/detalhamento do PT para a AC, no mesmo dia.", role_kind: "vc", phase: "inicio", after_key: "apresentacao_ptt", offset_days: 0, estimated_hours: 0.5, hourly_cost: 50, repeat_rule: "none" },
  { key: "lancamento_inicial", name: "Lançamento das Tarefas Iniciais", description: "A AC lança as tarefas iniciais (24 h) e passa a monitorar diária/semanalmente (filtro de pendências).", role_kind: "ac", phase: "inicio", after_key: "handover_gravacao", offset_days: 1, estimated_hours: 4, hourly_cost: 20, repeat_rule: "none" },
  { key: "reserva_agenda", name: "Reserva de Agenda (Lançamento Mensal)", description: "A AC reserva um período mensal na agenda para lançar todo o PT do mês seguinte, respeitando a data de início da contratação.", role_kind: "ac", phase: "mensal", after_key: "lancamento_inicial", offset_days: 30, estimated_hours: 0.33, hourly_cost: 20, repeat_rule: "monthly" },
  { key: "qualificacao_aprovacoes", name: "Qualificação e Envio de Aprovações", description: "A AC qualifica a entrega da allka e envia ao cliente, garantindo o cadenciamento PLAC de 10 dias.", role_kind: "ac", phase: "mensal", after_key: "lancamento_inicial", offset_days: 10, estimated_hours: 3, hourly_cost: 20, repeat_rule: "monthly" },
  { key: "critica_consultiva", name: "Crítica Consultiva de Entregas", description: "O VC critica as entregas junto ao cliente (grupo/plataforma) para mostrar atenção à qualidade e ao alto nível estratégico.", role_kind: "vc", phase: "mensal", after_key: "qualificacao_aprovacoes", offset_days: 3, estimated_hours: 2, hourly_cost: 50, repeat_rule: "monthly" },
  { key: "relatorio_mensal", name: "Relatório Mensal de Status (PT atualizado)", description: "A AC envia o PT atualizado (30 dias após o lançamento) com status das tarefas, horas dedicadas e resumo das entregas.", role_kind: "ac", phase: "mensal", after_key: "lancamento_inicial", offset_days: 30, estimated_hours: 1, hourly_cost: 20, repeat_rule: "monthly" },
  { key: "agendamento_proximo_ptt", name: "Agendamento do Próximo PTT/Análise", description: "A AC agenda a Reunião de Resultados/Novo PT (máx. 10 dias após o fim do PT anterior) e reserva a agenda do VC para análise de dados.", role_kind: "ac", phase: "fim", after_key: "relatorio_mensal", offset_days: 1, estimated_hours: 0.25, hourly_cost: 20, repeat_rule: "end_of_cycle" },
  { key: "analise_novo_pt", name: "Análise do PT Atual e Criação do Novo PT com UPSELL", description: "O VC analisa os dados do período, defende as ações e projeta o novo PT (upsell), já com a transição de fase.", role_kind: "vc", phase: "fim", after_key: "agendamento_proximo_ptt", offset_days: 9, estimated_hours: 5, hourly_cost: 50, repeat_rule: "end_of_cycle" },
  { key: "reuniao_resultados_upsell", name: "Reunião de Resultados e UPSELL", description: "O VC apresenta os dados (defesa das ações) e o novo PT (upsell), já projetado com a transição de fase.", role_kind: "vc", phase: "fim", after_key: "analise_novo_pt", offset_days: 1, estimated_hours: 1, hourly_cost: 50, repeat_rule: "end_of_cycle" },
];

/** Cria o modelo dos 13 passos se ainda não existe nenhum (idempotente; nunca recria o que o administrador apagou depois). */
export async function ensurePlacTemplates(db: Db): Promise<number> {
  if ((await db.placStepTemplate.count()) > 0) return 0;
  for (const [i, s] of PLAC_DEFAULT_STEPS.entries()) await db.placStepTemplate.create({ data: { ...s, sort_order: i + 1, audience: "all" } });
  return PLAC_DEFAULT_STEPS.length;
}

const parseIds = (raw: string | null | undefined): string[] => { try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };
export const idsOf = parseIds;

/** Calcula o prazo de cada passo: depois do passo indicado (D+N) ou do pagamento. Passo apontando para inexistente/ciclo conta do pagamento. */
export function computeDueDates(steps: { key: string; after_key: string | null; offset_days: number }[], paidAt: Date): Map<string, Date> {
  const by = new Map(steps.map((s) => [s.key, s]));
  const out = new Map<string, Date>();
  const resolve = (key: string, seen: Set<string>): Date => {
    const hit = out.get(key); if (hit) return hit;
    const s = by.get(key)!;
    let base = paidAt;
    if (s.after_key && by.has(s.after_key) && !seen.has(s.after_key)) base = resolve(s.after_key, new Set([...seen, key]));
    const due = new Date(base.getTime() + Math.round((s.offset_days ?? 0) * 86400000));
    out.set(key, due);
    return due;
  };
  for (const s of steps) resolve(s.key, new Set());
  return out;
}

/** Quem é o comprador do projeto, para decidir se o passo vale (company / agency / agency partner). */
export async function projectBuyerViewer(db: Db, projectId: string): Promise<AudienceViewer> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { agency_id: true, company_id: true, client_id: true } });
  if (p?.agency_id && !p.company_id && !p.client_id) {
    const a = await db.agency.findUnique({ where: { id: p.agency_id }, select: { partner_profile: { select: { status: true } } } });
    return { kind: "agency", is_partner: a?.partner_profile?.status === "active" };
  }
  if (p?.agency_id) {
    const a = await db.agency.findUnique({ where: { id: p.agency_id }, select: { partner_profile: { select: { status: true } } } });
    return { kind: "agency", is_partner: a?.partner_profile?.status === "active" };
  }
  return { kind: "company" };
}

async function projectFourFIds(db: Db, projectId: string): Promise<string[]> {
  const prods = await db.projectProduct.findMany({ where: { project_id: projectId, catalog2_product_id: { not: null } }, select: { catalog2_product_id: true } });
  const ids = prods.map((p) => p.catalog2_product_id).filter((x): x is string => !!x);
  if (!ids.length) return [];
  return (await db.catalog2ProductFourF.findMany({ where: { product_id: { in: ids } }, select: { four_f_id: true } })).map((x) => x.four_f_id);
}

/**
 * Abre os passos PLAC de um projeto a partir do modelo ativo (só uma vez por projeto; pode ser pedido de novo para completar passos novos
 * do modelo). Filtra por quem comprou (company / agency / partner) e, se o passo restringir, pela classificação 4F dos produtos do projeto.
 */
export async function generatePlacForProject(db: Db, projectId: string, paidAt: Date = new Date()): Promise<{ created: number; skipped: number }> {
  await ensurePlacTemplates(db);
  const [templates, existing, viewer, fourFs] = await Promise.all([
    db.placStepTemplate.findMany({ where: { is_active: true }, orderBy: { sort_order: "asc" } }),
    db.placProjectStep.findMany({ where: { project_id: projectId }, select: { template_key: true } }),
    projectBuyerViewer(db, projectId),
    projectFourFIds(db, projectId),
  ]);
  const have = new Set(existing.map((e) => e.template_key));
  const eligible = templates.filter((t) => {
    if (!audienceAllows({ visibility_mode: t.audience }, viewer)) return false;
    const need = parseIds(t.four_f_ids);
    return need.length === 0 || need.some((id) => fourFs.includes(id));
  });
  const due = computeDueDates(eligible, paidAt);
  let created = 0;
  for (const t of eligible) {
    if (have.has(t.key)) continue;
    await db.placProjectStep.create({
      data: {
        project_id: projectId, template_key: t.key, sort_order: t.sort_order, name: t.name, description: t.description, role_kind: t.role_kind, phase: t.phase,
        estimated_hours: t.estimated_hours, due_at: due.get(t.key) ?? null, internal_user_ids: t.internal_user_ids,
      },
    });
    created++;
  }
  // D2: se a administração ligou "passos PLAC viram tarefa interna", cada passo novo também entra no quadro da conta que executa o PLAC.
  if (created > 0) {
    const cfg = await db.internalTaskSettings.findUnique({ where: { id: "singleton" }, select: { auto_from_plac: true } });
    if (cfg?.auto_from_plac) {
      const fresh = await db.placProjectStep.findMany({ where: { project_id: projectId } });
      for (const st of fresh) await createFromPlacStep(db, st, "system").catch(() => false);
    }
  }
  return { created, skipped: eligible.length - created };
}

export function stepView(s: { id: string; template_key: string; sort_order: number; name: string; description: string | null; role_kind: string; phase: string; estimated_hours: number | null; due_at: Date | null; status: string; completed_at: Date | null; assignee_user_id: string | null; internal_user_ids: string | null; note: string | null }, now = new Date()) {
  const open = s.status === "pendente" || s.status === "em_andamento";
  return {
    id: s.id, key: s.template_key, order: s.sort_order, name: s.name, description: s.description,
    role: s.role_kind, role_label: PLAC_ROLE_LABEL[s.role_kind] ?? s.role_kind, phase: s.phase, phase_label: PLAC_PHASE_LABEL[s.phase] ?? s.phase,
    estimated_hours: s.estimated_hours, due_at: s.due_at, status: s.status, status_label: PLAC_STATUS_LABEL[s.status] ?? s.status,
    overdue: open && !!s.due_at && s.due_at.getTime() < now.getTime(), completed_at: s.completed_at,
    assignee_user_id: s.assignee_user_id, internal_user_ids: idsOf(s.internal_user_ids), note: s.note,
  };
}

export function progressOf(steps: { status: string }[]) {
  const total = steps.filter((s) => s.status !== "dispensada").length;
  const done = steps.filter((s) => s.status === "concluida").length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Avisa os responsáveis INTERNOS (cobrança) de passos vencidos e ainda abertos. Um alerta por passo (não repete). Devolve quantos avisou. */
export async function sweepPlacOverdue(db: PrismaClient, now = new Date()): Promise<number> {
  const rows = await db.placProjectStep.findMany({
    where: { status: { in: ["pendente", "em_andamento"] }, due_at: { lt: now }, overdue_alerted_at: null },
    include: { project: { select: { title: true } } }, take: 200,
  });
  let n = 0;
  for (const s of rows) {
    const users = [...new Set([...idsOf(s.internal_user_ids), ...(s.assignee_user_id ? [] : [])])];
    for (const userId of users) {
      await db.systemAlert.create({
        data: {
          type: "plac_step_overdue", title: `PLAC: passo atrasado — ${s.name}`,
          message: `O passo "${s.name}" (${PLAC_ROLE_LABEL[s.role_kind] ?? s.role_kind}) do projeto "${s.project.title}" venceu em ${s.due_at!.toLocaleDateString("pt-BR")} e ainda não foi concluído. Cobre o responsável.`,
          severity: "warning", category: "alerta", entity_type: "project", entity_id: s.project_id, user_id: userId, dedupe_key: `plac_overdue:${s.id}:${userId}`, action_url: `/admin/projetos`,
        },
      }).catch(() => null);
    }
    await db.placProjectStep.update({ where: { id: s.id }, data: { overdue_alerted_at: now } });
    n++;
  }
  return n;
}
