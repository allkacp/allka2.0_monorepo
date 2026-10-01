// Proteção OBRIGATÓRIA contra modelos globais duplicados (tarefa e etapa), feita na API — não só na tela.
//
// Antes de criar um modelo novo:
//   1. procura por nome normalizado (sem acento/caixa/pontuação), por KEY já usada e por nome parecido;
//   2. compara especialidade, ciclo (tarefa) e modo de execução e marca quais candidatos são COMPATÍVEIS;
//   3. se houver candidato, a criação PARA com resposta estruturada (409 `duplicate_model_candidates`), salvo se o
//      chamador mandar `duplicate_resolution`: `use_existing` (+ id) ou `create_anyway` (+ justificativa ≥ 10 caracteres).
// Idempotência: `client_action_id` repetido devolve o mesmo modelo, sem consumir novo ID. Concorrência: a criação é
// serializada por tipo com uma linha-sentinela travada (SELECT ... FOR UPDATE) dentro da própria transação.
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { Catalog2Error } from "./catalog2-service";
import { createStepModel, createTaskModel, findSimilarModels, taskModelSignature, stepModelSignature, type SimilarModel, type StepModelFields, type TaskModelFields } from "./catalog2-models";

type Tx = Prisma.TransactionClient;
export type ModelKind = "task" | "step";
export const DUPLICATE_RESOLUTIONS = ["use_existing", "create_anyway"] as const;
export type DuplicateResolution = (typeof DUPLICATE_RESOLUTIONS)[number];

export interface GuardInput {
  clientActionId?: string | null;
  resolution?: DuplicateResolution | null;
  existingModelId?: number | null;
  justification?: string | null;
  key?: string | null;
  userId: string;
}
export interface GuardedModel<M> { model: M; created: boolean; replayed: boolean; resolution: DuplicateResolution | null }
export interface Candidate extends SimilarModel { compatible: boolean; same_specialty: boolean; same_execution_mode: boolean; same_cycle: boolean | null; match: string[] }

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A linha-sentinela é criada FORA da transação (INSERT duplicado dentro dela gera deadlock ao subir para FOR UPDATE).
const sentinelReady = new Set<string>();
async function ensureSentinel(kind: ModelKind) {
  if (sentinelReady.has(kind)) return;
  try { await prisma.catalog2ModelAction.create({ data: { client_action_id: `__lock__:${kind}`, kind: `lock_${kind}`, model_id: 0, name_normalized: "" } }); } catch { /* já existe */ }
  sentinelReady.add(kind);
}
async function lockKind(tx: Tx, kind: ModelKind) {
  await ensureSentinel(kind);
  const id = `__lock__:${kind}`;
  await tx.$queryRaw`SELECT id FROM catalog2_model_actions WHERE client_action_id = ${id} FOR UPDATE`;
}

export async function findCandidates(db: PrismaClient | Tx, kind: ModelKind, f: { name: string; key?: string | null; specialty_id?: string | null; execution_mode?: string | null; cycle_type?: string | null; signature?: string }): Promise<Candidate[]> {
  const similar = await findSimilarModels(db, kind, { name: f.name, specialty_id: f.specialty_id, execution_mode: f.execution_mode, signature: f.signature });
  const byId = new Map<number, Candidate>();
  const extra: Record<number, { cycle_type?: string | null }> = {};
  const ids = similar.map((s) => s.id);
  if (kind === "task" && ids.length) for (const m of await (db as PrismaClient).catalog2TaskModel.findMany({ where: { id: { in: ids } }, select: { id: true, cycle_type: true } })) extra[m.id] = { cycle_type: m.cycle_type };
  const mk = (s: SimilarModel, match: string[]): Candidate => {
    const same_specialty = (s.specialty_id ?? null) === (f.specialty_id ?? null);
    const same_execution_mode = s.execution_mode === (f.execution_mode ?? "humano");
    const same_cycle = kind === "task" ? (extra[s.id]?.cycle_type ?? null) === (f.cycle_type ?? "recorrente") : null;
    return { ...s, same_specialty, same_execution_mode, same_cycle, compatible: same_specialty && same_execution_mode && same_cycle !== false, match };
  };
  for (const s of similar) byId.set(s.id, mk(s, [s.reason === "mesmo_nome" ? "nome" : s.reason === "mesma_configuracao" ? "configuração" : "nome parecido"]));
  // mesma KEY já usada por tarefa/etapa de algum produto que vem de um modelo
  if (f.key) {
    const rows = kind === "task"
      ? await (db as PrismaClient).catalog2Task.findMany({ where: { key: f.key, task_model_id: { not: null } }, select: { task_model_id: true }, take: 20 })
      : await (db as PrismaClient).catalog2TaskStep.findMany({ where: { key: f.key, step_model_id: { not: null } }, select: { step_model_id: true }, take: 20 });
    const modelIds = [...new Set(rows.map((r) => ("task_model_id" in r ? r.task_model_id : (r as { step_model_id: number | null }).step_model_id)).filter((x): x is number => x != null))];
    for (const id of modelIds) {
      if (byId.has(id)) { byId.get(id)!.match.push("key"); continue; }
      const m = kind === "task"
        ? await (db as PrismaClient).catalog2TaskModel.findUnique({ where: { id }, select: { id: true, name: true, is_active: true, specialty_id: true, execution_mode: true, cycle_type: true } })
        : await (db as PrismaClient).catalog2StepModel.findUnique({ where: { id }, select: { id: true, name: true, is_active: true, specialty_id: true, execution_mode: true } });
      if (!m) continue;
      if (kind === "task") extra[id] = { cycle_type: (m as { cycle_type?: string }).cycle_type };
      byId.set(id, mk({ id: m.id, name: m.name, label: `${kind === "task" ? "Modelo de tarefa" : "Modelo de etapa"} #${m.id}`, is_active: m.is_active, similarity: 0.6, reason: "nome_parecido", specialty_id: m.specialty_id, execution_mode: m.execution_mode }, ["key"]));
    }
  }
  return [...byId.values()].sort((a, b) => Number(b.compatible) - Number(a.compatible) || b.similarity - a.similarity || a.id - b.id).slice(0, 10);
}

/** Cria (ou reaproveita) um modelo global com a proteção acima. Deve rodar DENTRO da transação do chamador. */
export async function createModelGuarded(tx: Tx, kind: ModelKind, fields: TaskModelFields | StepModelFields, input: GuardInput): Promise<GuardedModel<{ id: number; name: string; revision: number }>> {
  const norm = fold(fields.name);
  await lockKind(tx, kind);
  const load = async (id: number) => (kind === "task" ? tx.catalog2TaskModel.findUnique({ where: { id } }) : tx.catalog2StepModel.findUnique({ where: { id } }));

  if (input.clientActionId) {
    const prev = await tx.catalog2ModelAction.findUnique({ where: { client_action_id: input.clientActionId } });
    if (prev && prev.kind === kind) {
      const m = await load(prev.model_id);
      if (m) return { model: m, created: false, replayed: true, resolution: (prev.duplicate_resolution as DuplicateResolution | null) ?? null };
    }
  }

  const sig = kind === "task" ? taskModelSignature(fields as TaskModelFields) : stepModelSignature(fields as StepModelFields);
  const candidates = (await findCandidates(tx, kind, { name: fields.name, key: input.key, specialty_id: fields.specialty_id, execution_mode: fields.execution_mode, cycle_type: (fields as TaskModelFields).cycle_type, signature: sig })).filter((c) => c.is_active);
  const record = (modelId: number, resolution: DuplicateResolution | null) => input.clientActionId
    ? tx.catalog2ModelAction.create({ data: { client_action_id: input.clientActionId, kind, model_id: modelId, name_normalized: norm.slice(0, 190), duplicate_resolution: resolution, justification: resolution === "create_anyway" ? input.justification?.trim() ?? null : null, similar_ids_json: candidates.length ? JSON.stringify(candidates.map((c) => c.id)) : null, authorized_by_user_id: resolution ? input.userId : null } })
    : tx.catalog2ModelAction.create({ data: { client_action_id: `auto:${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`, kind, model_id: modelId, name_normalized: norm.slice(0, 190), duplicate_resolution: resolution, justification: resolution === "create_anyway" ? input.justification?.trim() ?? null : null, similar_ids_json: candidates.length ? JSON.stringify(candidates.map((c) => c.id)) : null, authorized_by_user_id: resolution ? input.userId : null } });

  if (candidates.length > 0) {
    if (!input.resolution) {
      const err = new Catalog2Error(
        `Já existe ${kind === "task" ? "tarefa" : "etapa"} parecida no catálogo (${candidates.slice(0, 3).map((c) => `${c.label} "${c.name}"`).join("; ")}). Use um modelo existente (duplicate_resolution=use_existing) ou confirme a criação (duplicate_resolution=create_anyway com justificativa).`,
        409, "duplicate_model_candidates",
      ) as Catalog2Error & { details?: unknown; similar?: unknown };
      err.details = { kind, candidates, resolutions: DUPLICATE_RESOLUTIONS, prefer: candidates.find((c) => c.compatible)?.id ?? null };
      err.similar = candidates;
      throw err;
    }
    if (input.resolution === "use_existing") {
      const id = input.existingModelId ?? null;
      if (id == null) throw new Catalog2Error("Informe o ID do modelo existente (duplicate_model_id).", 422, "duplicate_model_id_required");
      const m = await load(id);
      if (!m) throw new Catalog2Error("Modelo existente não encontrado.", 404, "model_not_found");
      if (!m.is_active) throw new Catalog2Error("O modelo escolhido está inativo.", 422, "model_inactive");
      await record(m.id, "use_existing");
      return { model: m, created: false, replayed: false, resolution: "use_existing" };
    }
    if ((input.justification?.trim().length ?? 0) < 10) throw new Catalog2Error("Para criar um modelo mesmo havendo parecido, explique o motivo (mínimo de 10 caracteres).", 422, "duplicate_justification_required");
  } else if (input.resolution === "use_existing") {
    // nada parecido, mas o chamador pediu um modelo específico: respeita (é o caminho from-model)
    if (input.existingModelId == null) throw new Catalog2Error("Informe o ID do modelo existente (duplicate_model_id).", 422, "duplicate_model_id_required");
    const m = await load(input.existingModelId);
    if (!m) throw new Catalog2Error("Modelo existente não encontrado.", 404, "model_not_found");
    if (!m.is_active) throw new Catalog2Error("O modelo escolhido está inativo.", 422, "model_inactive");
    await record(m.id, "use_existing");
    return { model: m, created: false, replayed: false, resolution: "use_existing" };
  }

  const created = kind === "task" ? await createTaskModel(tx, fields as TaskModelFields, input.userId) : await createStepModel(tx, fields as StepModelFields, input.userId);
  await record(created.id, candidates.length ? "create_anyway" : null);
  return { model: created, created: true, replayed: false, resolution: candidates.length ? "create_anyway" : null };
}
