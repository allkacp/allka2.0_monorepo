import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
type Step = { id: string; name: string; executor_kind: string; leader_mode: string; leader_user_id: string | null; requires_specialist_qualification: boolean; specialist_user_id: string | null; qualifier_kind: string; execution_mode?: string | null; ops?: Prisma.JsonValue | null };
type Task = { id: string; name: string; version_id: string; requires_qualification: boolean; qualifier_user_id: string | null; steps: Step[] };
export type SpecificAssignment = { user_id: string; version_id: string; task_id: string; task_name: string; step_id: string | null; step_name: string | null; kind: "leader" | "person"; label: string };

// Só referências NOMINAIS ativas. IDs antigos em campos de modos automáticos
// não contam; rodízio, área e continuidade não são indicação de uma pessoa.
export function specificAssignments(tasks: Task[]): SpecificAssignment[] {
  const out: SpecificAssignment[] = [];
  for (const t of tasks) {
    const base = { version_id: t.version_id, task_id: t.id, task_name: t.name };
    if (t.requires_qualification && t.qualifier_user_id) out.push({ ...base, user_id: t.qualifier_user_id, step_id: null, step_name: null, kind: "person", label: "Qualificador específico" });
    for (const s of t.steps) {
      const step = { ...base, step_id: s.id, step_name: s.name };
      if (s.executor_kind === "leader" && s.leader_mode === "specific" && s.leader_user_id) out.push({ ...step, user_id: s.leader_user_id, kind: "leader", label: "Líder específico" });
      if (s.requires_specialist_qualification && s.specialist_user_id && s.qualifier_kind !== "nomad_pool") out.push({ ...step, user_id: s.specialist_user_id, kind: "person", label: "Especialista específico" });
      const ops = s.ops as Record<string, unknown> | null;
      if (["ia", "hibrido"].includes(s.execution_mode ?? "") && ["person", "leader_person"].includes(String(ops?.ai_qualifier_kind)) && typeof ops?.ai_qualifier_user_id === "string" && ops.ai_qualifier_user_id) out.push({ ...step, user_id: ops.ai_qualifier_user_id, kind: "person", label: "Qualificador específico da IA" });
    }
  }
  return out;
}

export async function unavailableSpecificAssignments(db: Db, tasks: Task[]) {
  const refs = specificAssignments(tasks);
  if (!refs.length) return [];
  const users = await db.user.findMany({ where: { id: { in: [...new Set(refs.map(r => r.user_id))] } }, select: { id: true, name: true, is_active: true, status: true, role: true } });
  const byId = new Map(users.map(u => [u.id, u]));
  return refs.filter(r => {
    const u = byId.get(r.user_id);
    return !u || !u.is_active || u.status !== "ativo" || (r.kind === "leader" && !["lider", "admin"].includes(u.role));
  }).map(r => ({ ...r, message: `${r.label} indisponível${r.step_name ? ` na etapa “${r.step_name}”` : ` na tarefa “${r.task_name}”`}. Ajuste o responsável desta configuração.` }));
}

export async function specificAssigneeImpact(db: Db, userId: string, action: "delete" | "deactivate") {
  const tasks = await db.catalog2Task.findMany({
    where: { OR: [{ qualifier_user_id: userId }, { steps: { some: { OR: [{ leader_user_id: userId }, { specialist_user_id: userId }, { ops: { path: "$.ai_qualifier_user_id", equals: userId } }] } } }] },
    include: { steps: true, version: { select: { version_number: true, state: true, product: { select: { id: true, sequence_number: true, internal_name: true } } } } },
  });
  const byId = new Map(tasks.map(t => [t.id, t]));
  const matrices = specificAssignments(tasks).filter(r => r.user_id === userId).map(r => {
    const v = byId.get(r.task_id)!.version;
    return { ...r, product_id: v.product.id, product_number: v.product.sequence_number, product_name: v.product.internal_name, version_number: v.version_number, version_state: v.state };
  }).sort((a, b) => `${a.task_id}:${a.step_id}:${a.label}`.localeCompare(`${b.task_id}:${b.step_id}:${b.label}`));
  // Execuções são apenas informadas. Não recalcular/corrigir suas atribuições
  // a partir da matriz atual: cada contratação preserva seu snapshot.
  const nomads = await db.nomade.findMany({ where: { user_id: userId }, select: { id: true } });
  const stages = await db.projectTaskStage.findMany({
    where: { status: { notIn: ["CONCLUIDA", "CANCELADA", "DISPENSADA"] }, OR: [{ lider_id: userId }, { especialista_id: userId }, ...(nomads.length ? [{ nomade_id: { in: nomads.map(n => n.id) } }] : [])] },
    select: { id: true, titulo: true, project_task: { select: { id: true, title: true, project_id: true } } }, orderBy: { id: "asc" },
  });
  const executions = await db.projectTask.findMany({ where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, OR: [{ lider_responsavel_id: userId }, { reviewer_user_id: userId }, ...(nomads.length ? [{ nomade_responsavel_id: { in: nomads.map(n => n.id) } }] : [])] }, select: { id: true, title: true, project_id: true }, orderBy: { id: "asc" } });
  const target = await db.user.findUnique({ where: { id: userId }, select: { name: true, updated_at: true } });
  const payload = { user_id: userId, user_name: target?.name ?? "Usuário", action, matrices, stages, executions };
  // Confirmação vinculada ao conjunto exibido; alterações no impacto exigem
  // nova confirmação. Não é autorização: as permissões da rota continuam valendo.
  const token = createHash("sha256").update(JSON.stringify({ ...payload, updated_at: target?.updated_at })).digest("hex");
  return { ...payload, token, has_impact: !!(matrices.length || stages.length || executions.length) };
}
