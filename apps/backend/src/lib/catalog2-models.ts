// Catálogo global de modelos de tarefa e de etapa ("Tarefa #12", "Etapa #7").
//
// Regras (pedido do responsável, 2026-09-29):
//  - ID numérico sequencial e permanente; modelo nunca é apagado (só inativado).
//  - Tarefa/etapa de um produto (por versão) REFERENCIA o modelo de origem.
//  - Criar tarefa/etapa nova a partir do produto registra um modelo novo.
//  - Cargas automáticas (clone de versão, importações, scripts) reaproveitam o
//    modelo "igual" (mesma assinatura) em vez de criar um novo a cada versão.
import { createHash } from "node:crypto";
import { normalizeStepOps, normalizeTaskOps, opsEqual } from "./catalog2-ops";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const STEP_PURPOSES = [
  "execucao", "coleta_informacao", "validacao", "revisao", "qualificacao", "aprovacao_cliente", "entrega",
] as const;
export const STEP_PURPOSE_LABEL: Record<(typeof STEP_PURPOSES)[number], string> = {
  execucao: "Execução",
  coleta_informacao: "Coleta de informação",
  validacao: "Validação",
  revisao: "Revisão",
  qualificacao: "Qualificação",
  aprovacao_cliente: "Aprovação do cliente",
  entrega: "Entrega",
};

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const sha = (parts: unknown[]) => createHash("sha1").update(JSON.stringify(parts)).digest("hex");

export interface TaskModelFields {
  name: string;
  description?: string | null;
  execution_mode?: string | null;
  specialty_id?: string | null;
  estimated_minutes?: number | null;
  questionnaire_id?: string | null;
  is_conditional?: boolean | null;
  requires_client_approval?: boolean | null;
  requires_qualification?: boolean | null;
  cycle_type?: string | null;
  repeat_rule?: string | null;
  repeat_every_cycles?: number | null;
  executor_continuity?: string | null;
  asset_rule?: string | null;
  asset_revalidate_days?: number | null;
  /** Campos operacionais (objetivo, instruções…) — ver catalog2-ops.ts. */
  ops?: unknown;
  /** Revisão obrigatória (conferência técnica antes da qualificação/aprovação). */
  requires_review?: boolean | null;
  review_minutes?: number | null;
  review_specialty_id?: string | null;
  /** Qualificação configurável (2026-10-02): inherit | percent | hourly_time | fixed | time_and_percent. */
  qualification_cost_mode?: string | null;
  qualification_specialty_id?: string | null;
  qualification_hourly_rate?: number | null;
  qualification_minutes?: number | null;
  qualification_percent?: number | null;
  qualification_fixed_amount?: number | null;
  qualifier_kind?: string | null;
}

export interface StepModelFields {
  name: string;
  description?: string | null;
  specialty_id?: string | null;
  estimated_minutes?: number | null;
  execution_mode?: string | null;
  purpose?: string | null;
  completion_criteria?: string | null;
  ops?: unknown;
}

export function taskModelSignature(f: TaskModelFields): string {
  return sha([
    "task", norm(f.name), norm(f.description), f.execution_mode ?? "humano", f.specialty_id ?? null,
    f.estimated_minutes ?? null, f.questionnaire_id ?? null, !!f.is_conditional, !!f.requires_client_approval,
  ]);
}

export function stepModelSignature(f: StepModelFields): string {
  return sha([
    "step", norm(f.name), norm(f.description), f.specialty_id ?? null, f.estimated_minutes ?? null,
    f.execution_mode ?? "humano", f.purpose ?? "execucao",
  ]);
}

/** Cria SEMPRE um modelo novo de tarefa (ID novo). */
export async function createTaskModel(db: Db, f: TaskModelFields, userId?: string | null) {
  return db.catalog2TaskModel.create({
    data: {
      name: f.name,
      description: f.description ?? null,
      execution_mode: f.execution_mode ?? "humano",
      specialty_id: f.specialty_id ?? null,
      estimated_minutes: f.estimated_minutes ?? null,
      questionnaire_id: f.questionnaire_id ?? null,
      is_conditional: !!f.is_conditional,
      requires_client_approval: !!f.requires_client_approval,
      requires_qualification: !!f.requires_qualification,
      cycle_type: f.cycle_type ?? "recorrente",
      repeat_rule: f.repeat_rule ?? "all_cycles",
      repeat_every_cycles: f.repeat_every_cycles ?? null,
      executor_continuity: f.executor_continuity ?? "not_allowed",
      asset_rule: f.asset_rule ?? "first_only",
      asset_revalidate_days: f.asset_revalidate_days ?? null,
      ops: (normalizeTaskOps(f.ops) ?? undefined) as Prisma.InputJsonValue | undefined,
      requires_review: !!f.requires_review,
      review_minutes: f.review_minutes ?? null,
      review_specialty_id: f.review_specialty_id ?? null,
      qualification_cost_mode: f.qualification_cost_mode ?? "inherit",
      qualification_specialty_id: f.qualification_specialty_id ?? null,
      qualification_hourly_rate: f.qualification_hourly_rate ?? null,
      qualification_minutes: f.qualification_minutes ?? null,
      qualification_percent: f.qualification_percent ?? null,
      qualification_fixed_amount: f.qualification_fixed_amount ?? null,
      qualifier_kind: f.qualifier_kind ?? "area_leader",
      signature: taskModelSignature(f),
      created_by_user_id: userId ?? null,
    },
  });
}

/** Cria SEMPRE um modelo novo de etapa (ID novo). */
export async function createStepModel(db: Db, f: StepModelFields, userId?: string | null) {
  return db.catalog2StepModel.create({
    data: {
      name: f.name,
      description: f.description ?? null,
      completion_criteria: f.completion_criteria ?? null,
      purpose: f.purpose ?? "execucao",
      execution_mode: f.execution_mode ?? "humano",
      specialty_id: f.specialty_id ?? null,
      estimated_minutes: f.estimated_minutes ?? null,
      ops: (normalizeStepOps(f.ops) ?? undefined) as Prisma.InputJsonValue | undefined,
      signature: stepModelSignature(f),
      created_by_user_id: userId ?? null,
    },
  });
}

// ── Nomes semelhantes (evita criar um modelo novo por descuido) ──────────────
const foldName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "para", "com", "em", "no", "na", "e"]);
const tokensOf = (s: string) => new Set(foldName(s).split(" ").filter((w) => w && !STOPWORDS.has(w)));

export interface SimilarModel { id: number; name: string; label: string; is_active: boolean; similarity: number; reason: "mesmo_nome" | "nome_parecido" | "mesma_configuracao"; specialty_id: string | null; execution_mode: string }

/** Modelos globais com nome igual/parecido (ou mesma configuração) a um nome que está para ser criado. */
export async function findSimilarModels(db: Db, kind: "task" | "step", f: { name: string; specialty_id?: string | null; execution_mode?: string | null; signature?: string }): Promise<SimilarModel[]> {
  const rows: { id: number; name: string; is_active: boolean; specialty_id: string | null; execution_mode: string; signature: string }[] =
    kind === "task" ? await db.catalog2TaskModel.findMany({ select: { id: true, name: true, is_active: true, specialty_id: true, execution_mode: true, signature: true } })
      : await db.catalog2StepModel.findMany({ select: { id: true, name: true, is_active: true, specialty_id: true, execution_mode: true, signature: true } });
  const mine = foldName(f.name);
  const myTokens = tokensOf(f.name);
  const label = kind === "task" ? "Modelo de tarefa" : "Modelo de etapa";
  const out: SimilarModel[] = [];
  for (const r of rows) {
    const theirs = foldName(r.name);
    let similarity = 0;
    let reason: SimilarModel["reason"] = "nome_parecido";
    if (f.signature && r.signature === f.signature) { similarity = 1; reason = "mesma_configuracao"; }
    else if (theirs === mine && mine) { similarity = 1; reason = "mesmo_nome"; }
    else if (mine && theirs && (theirs.includes(mine) || mine.includes(theirs)) && Math.min(mine.length, theirs.length) >= 6) similarity = 0.85;
    else {
      const t = tokensOf(r.name);
      const inter = [...myTokens].filter((w) => t.has(w)).length;
      const union = new Set([...myTokens, ...t]).size;
      similarity = union ? inter / union : 0;
    }
    if (similarity >= 0.6) out.push({ id: r.id, name: r.name, label: `${label} #${r.id}`, is_active: r.is_active, similarity: Math.round(similarity * 100) / 100, reason, specialty_id: r.specialty_id, execution_mode: r.execution_mode });
  }
  return out.sort((a, b) => b.similarity - a.similarity || a.id - b.id).slice(0, 8);
}

/** Reaproveita o modelo de mesma assinatura (o mais antigo) ou cria um novo. */
export async function findOrCreateTaskModel(db: Db, f: TaskModelFields) {
  const signature = taskModelSignature(f);
  const found = await db.catalog2TaskModel.findFirst({ where: { signature }, orderBy: { id: "asc" } });
  return found ?? createTaskModel(db, f);
}

export async function findOrCreateStepModel(db: Db, f: StepModelFields) {
  const signature = stepModelSignature(f);
  const found = await db.catalog2StepModel.findFirst({ where: { signature }, orderBy: { id: "asc" } });
  return found ?? createStepModel(db, f);
}

/**
 * Em produção, o primeiro "número" dos modelos precisa vir do PACOTE de produtos
 * (mesmo ID do ambiente local). Por isso lá a numeração automática só roda depois
 * que o catálogo global já tem modelos (ou se CATALOG2_MODELS_BACKFILL=true).
 * Fora de produção (local/teste) roda sempre.
 */
export async function shouldBackfillModelsOnBoot(db: PrismaClient): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.CATALOG2_MODELS_BACKFILL === "true") return true;
  return (await db.catalog2TaskModel.count()) > 0;
}

/**
 * Preenche o vínculo (Tarefa #/Etapa #) de tudo que ainda não tem — cadastros
 * anteriores ao catálogo global e qualquer caminho que crie tarefa/etapa sem
 * informar o modelo. Idempotente; NÃO altera dados da tarefa/etapa nem o
 * `updated_at` delas (usa SQL direto só nas colunas de vínculo).
 * Os modelos são numerados na ordem em que a tarefa/etapa foi criada.
 */
export async function backfillCatalog2Models(prisma: PrismaClient) {
  const result = { taskModelsCreated: 0, stepModelsCreated: 0, tasksLinked: 0, stepsLinked: 0, joinRows: 0 };

  const tasks = await prisma.catalog2Task.findMany({
    where: { task_model_id: null },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, description: true, execution_mode: true, specialty_id: true,
      estimated_minutes: true, questionnaire_id: true, is_conditional: true, requires_client_approval: true,
    },
  });
  const modelBySig = new Map<string, { id: number; revision: number }>();
  for (const t of tasks) {
    const sig = taskModelSignature(t);
    let m = modelBySig.get(sig);
    if (!m) {
      const existing = await prisma.catalog2TaskModel.findFirst({ where: { signature: sig }, orderBy: { id: "asc" } });
      const row = existing ?? (result.taskModelsCreated++, await createTaskModel(prisma, t));
      m = { id: row.id, revision: row.revision };
      modelBySig.set(sig, m);
    }
    await prisma.$executeRaw`UPDATE catalog2_tasks SET task_model_id = ${m.id}, task_model_revision = ${m.revision} WHERE id = ${t.id} AND task_model_id IS NULL`;
    result.tasksLinked++;
  }

  const steps = await prisma.catalog2TaskStep.findMany({
    where: { step_model_id: null },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: { id: true, name: true, description: true, specialty_id: true, estimated_minutes: true },
  });
  const stepBySig = new Map<string, { id: number; revision: number }>();
  for (const s of steps) {
    const sig = stepModelSignature(s);
    let m = stepBySig.get(sig);
    if (!m) {
      const existing = await prisma.catalog2StepModel.findFirst({ where: { signature: sig }, orderBy: { id: "asc" } });
      const row = existing ?? (result.stepModelsCreated++, await createStepModel(prisma, s));
      m = { id: row.id, revision: row.revision };
      stepBySig.set(sig, m);
    }
    await prisma.$executeRaw`UPDATE catalog2_task_steps SET step_model_id = ${m.id}, step_model_revision = ${m.revision} WHERE id = ${s.id} AND step_model_id IS NULL`;
    result.stepsLinked++;
  }

  // Etapas padrão de cada modelo de tarefa que ainda não tem nenhuma.
  const empty = await prisma.catalog2TaskModel.findMany({ where: { steps: { none: {} } }, select: { id: true } });
  for (const model of empty) result.joinRows += await syncTaskModelSteps(prisma, model.id);
  return result;
}

/**
 * Se o modelo de tarefa ainda não tem etapas padrão, copia (por referência) a
 * lista de etapas de uma tarefa de produto que use esse modelo.
 */
export async function syncTaskModelSteps(db: Db, taskModelId: number): Promise<number> {
  const has = await db.catalog2TaskModelStep.count({ where: { task_model_id: taskModelId } });
  if (has > 0) return 0;
  const source = await db.catalog2Task.findFirst({
    where: { task_model_id: taskModelId, steps: { some: { step_model_id: { not: null } } } },
    orderBy: { created_at: "asc" },
    include: { steps: { where: { step_model_id: { not: null } }, orderBy: { sort_order: "asc" } } },
  });
  if (!source) return 0;
  let n = 0;
  const seen = new Set<number>();
  for (const s of source.steps) {
    if (s.step_model_id == null || seen.has(s.step_model_id)) continue;
    seen.add(s.step_model_id);
    await db.catalog2TaskModelStep.create({ data: { task_model_id: taskModelId, step_model_id: s.step_model_id, sort_order: n + 1 } });
    n++;
  }
  return n;
}

// ── Usar um modelo global dentro de um produto ──────────────────────────────
// A key técnica nunca é pedida ao usuário: é gerada aqui (única dentro da
// versão / da tarefa) e só aparece numa área "avançada".
export function autoKey(prefix: string, id: number, taken: Set<string>): string {
  let key = `${prefix}-${id}`;
  for (let n = 2; taken.has(key); n++) key = `${prefix}-${id}-${n}`;
  return key;
}

type TaskModelRow = Prisma.Catalog2TaskModelGetPayload<object>;
type StepModelRow = Prisma.Catalog2StepModelGetPayload<object>;

export function taskDataFromModel(m: TaskModelRow) {
  return {
    name: m.name,
    description: m.description,
    execution_mode: m.execution_mode,
    specialty_id: m.specialty_id,
    estimated_minutes: m.estimated_minutes,
    questionnaire_id: m.questionnaire_id,
    is_conditional: m.is_conditional,
    requires_client_approval: m.requires_client_approval,
    requires_qualification: m.requires_qualification,
    cycle_type: m.cycle_type,
    repeat_rule: m.repeat_rule,
    repeat_every_cycles: m.repeat_every_cycles,
    executor_continuity: m.executor_continuity,
    asset_rule: m.asset_rule,
    asset_revalidate_days: m.asset_revalidate_days,
    ops: (m.ops ?? Prisma.DbNull) as Prisma.InputJsonValue,
    requires_review: m.requires_review,
    review_minutes: m.review_minutes,
    review_specialty_id: m.review_specialty_id,
    qualification_cost_mode: m.qualification_cost_mode,
    qualification_specialty_id: m.qualification_specialty_id,
    qualification_hourly_rate: m.qualification_hourly_rate,
    qualification_minutes: m.qualification_minutes,
    qualification_percent: m.qualification_percent,
    qualification_fixed_amount: m.qualification_fixed_amount,
    qualifier_kind: m.qualifier_kind,
    task_model_id: m.id,
    task_model_revision: m.revision,
  };
}

export function stepDataFromModel(m: StepModelRow) {
  return {
    name: m.name,
    description: m.description,
    estimated_minutes: m.estimated_minutes,
    specialty_id: m.specialty_id,
    // nulo = herda do modelo (ajustes específicos do produto ficam nas colunas)
    purpose: null,
    execution_mode: null,
    completion_criteria: null,
    first_execution_only: m.first_execution_only,
    skip_when_same_executor: m.skip_when_same_executor,
    ops: (m.ops ?? Prisma.DbNull) as Prisma.InputJsonValue,
    step_model_id: m.id,
    step_model_revision: m.revision,
  };
}

/** Cria a tarefa (e as etapas padrão do modelo) numa versão, vinculada ao modelo. */
export async function addTaskFromModel(tx: Prisma.TransactionClient, versionId: string, model: TaskModelRow, sortOrder: number) {
  const taken = new Set((await tx.catalog2Task.findMany({ where: { version_id: versionId }, select: { key: true } })).map((t) => t.key));
  const task = await tx.catalog2Task.create({
    data: { version_id: versionId, key: autoKey("tarefa", model.id, taken), sort_order: sortOrder, ...taskDataFromModel(model) },
  });
  const defaults = await tx.catalog2TaskModelStep.findMany({ where: { task_model_id: model.id }, orderBy: { sort_order: "asc" }, include: { step_model: true } });
  let i = 1;
  for (const d of defaults) {
    await tx.catalog2TaskStep.create({
      data: { task_id: task.id, key: autoKey("etapa", d.step_model.id, new Set()), sort_order: i++, ...stepDataFromModel(d.step_model) },
    });
  }
  return task;
}

export async function addStepFromModel(tx: Prisma.TransactionClient, taskId: string, model: StepModelRow, sortOrder: number) {
  const taken = new Set((await tx.catalog2TaskStep.findMany({ where: { task_id: taskId }, select: { key: true } })).map((s) => s.key));
  return tx.catalog2TaskStep.create({
    data: { task_id: taskId, key: autoKey("etapa", model.id, taken), sort_order: sortOrder, ...stepDataFromModel(model) },
  });
}

const eqText = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").trim() === (b ?? "").trim();

/** A tarefa do produto difere do modelo global (configuração específica do produto)? */
export function taskDivergesFromModel(t: {
  name: string; description: string | null; execution_mode: string; specialty_id: string | null; estimated_minutes: number | null;
  questionnaire_id: string | null; is_conditional: boolean; requires_client_approval: boolean; requires_qualification: boolean;
  cycle_type: string; repeat_rule: string; repeat_every_cycles: number | null; executor_continuity: string; asset_rule: string; asset_revalidate_days: number | null;
  ops?: unknown;
  requires_review?: boolean; review_minutes?: number | null; review_specialty_id?: string | null;
  qualification_cost_mode?: string; qualification_specialty_id?: string | null; qualification_hourly_rate?: number | null; qualification_minutes?: number | null;
  qualification_percent?: number | null; qualification_fixed_amount?: number | null; qualifier_kind?: string;
}, m: TaskModelRow): boolean {
  return !(
    eqText(t.name, m.name) && eqText(t.description, m.description) && t.execution_mode === m.execution_mode &&
    (t.specialty_id ?? null) === (m.specialty_id ?? null) && (t.estimated_minutes ?? null) === (m.estimated_minutes ?? null) &&
    (t.questionnaire_id ?? null) === (m.questionnaire_id ?? null) && t.is_conditional === m.is_conditional &&
    t.requires_client_approval === m.requires_client_approval && t.requires_qualification === m.requires_qualification &&
    t.cycle_type === m.cycle_type && t.repeat_rule === m.repeat_rule && (t.repeat_every_cycles ?? null) === (m.repeat_every_cycles ?? null) &&
    t.executor_continuity === m.executor_continuity && t.asset_rule === m.asset_rule && (t.asset_revalidate_days ?? null) === (m.asset_revalidate_days ?? null) &&
    opsEqual(normalizeTaskOps(t.ops), normalizeTaskOps(m.ops)) &&
    (t.requires_review ?? false) === m.requires_review && (t.review_minutes ?? null) === (m.review_minutes ?? null) && (t.review_specialty_id ?? null) === (m.review_specialty_id ?? null) &&
    (t.qualification_cost_mode ?? "inherit") === m.qualification_cost_mode && (t.qualification_specialty_id ?? null) === (m.qualification_specialty_id ?? null) &&
    (t.qualification_hourly_rate ?? null) === (m.qualification_hourly_rate ?? null) && (t.qualification_minutes ?? null) === (m.qualification_minutes ?? null) &&
    (t.qualification_percent ?? null) === (m.qualification_percent ?? null) && (t.qualification_fixed_amount ?? null) === (m.qualification_fixed_amount ?? null) &&
    (t.qualifier_kind ?? "area_leader") === m.qualifier_kind
  );
}

export function stepDivergesFromModel(s: {
  name: string; description: string | null; estimated_minutes: number | null; specialty_id: string | null;
  purpose: string | null; execution_mode: string | null; completion_criteria: string | null;
  first_execution_only: boolean; skip_when_same_executor: boolean;
  ops?: unknown;
}, m: StepModelRow): boolean {
  return !(
    eqText(s.name, m.name) && eqText(s.description, m.description) && (s.estimated_minutes ?? null) === (m.estimated_minutes ?? null) &&
    (s.specialty_id ?? null) === (m.specialty_id ?? null) && (s.purpose ?? m.purpose) === m.purpose &&
    (s.execution_mode ?? m.execution_mode) === m.execution_mode && eqText(s.completion_criteria ?? m.completion_criteria, m.completion_criteria) &&
    s.first_execution_only === m.first_execution_only && s.skip_when_same_executor === m.skip_when_same_executor &&
    opsEqual(normalizeStepOps(s.ops), normalizeStepOps(m.ops))
  );
}

// ── Envio de produtos entre ambientes (local → servidor) ────────────────────
// O pacote leva o modelo de cada tarefa/etapa COM o ID. No destino, o modelo é
// criado com o MESMO ID (assim "Tarefa #12" é a mesma nos dois lados). Se o ID
// já existe no destino com outro conteúdo (nome diferente), NÃO se sobrescreve
// nada: reaproveita/cria pelo conteúdo e avisa.
export interface PackagedTaskModel {
  id: number; name: string; description: string | null; execution_mode: string; estimated_minutes: number | null;
  is_conditional: boolean; requires_client_approval: boolean; requires_qualification?: boolean; is_active?: boolean;
  revision: number; specialty?: { key: string } | null; ops?: unknown; requires_review?: boolean; review_minutes?: number | null;
}
export interface PackagedStepModel {
  id: number; name: string; description: string | null; completion_criteria: string | null; purpose: string;
  execution_mode: string; estimated_minutes: number | null; is_active?: boolean; is_access_validation?: boolean; revision: number; specialty?: { key: string } | null; ops?: unknown;
}

export async function ensureTaskModelFromPackage(
  tx: Prisma.TransactionClient, m: PackagedTaskModel | null | undefined, questionnaireId: string | null, warn: (msg: string) => void,
): Promise<{ id: number; revision: number } | null> {
  if (!m) return null;
  const spec = m.specialty?.key ? await tx.catalog2Specialty.findUnique({ where: { key: m.specialty.key }, select: { id: true } }) : null;
  const fields: TaskModelFields = {
    name: m.name, description: m.description, execution_mode: m.execution_mode, specialty_id: spec?.id ?? null,
    estimated_minutes: m.estimated_minutes, questionnaire_id: questionnaireId, is_conditional: m.is_conditional,
    requires_client_approval: m.requires_client_approval,
  };
  const existing = await tx.catalog2TaskModel.findUnique({ where: { id: m.id } });
  if (existing) {
    if (norm(existing.name) === norm(m.name)) return { id: existing.id, revision: existing.revision };
    warn(`Tarefa #${m.id} já existe no destino com outro nome ("${existing.name}") — não sobrescrita; vinculada pelo conteúdo.`);
    const alt = await findOrCreateTaskModel(tx, fields);
    return { id: alt.id, revision: alt.revision };
  }
  const created = await tx.catalog2TaskModel.create({
    data: {
      id: m.id, name: m.name, description: m.description, execution_mode: m.execution_mode, specialty_id: spec?.id ?? null,
      estimated_minutes: m.estimated_minutes, questionnaire_id: questionnaireId, is_conditional: m.is_conditional,
      requires_client_approval: m.requires_client_approval, requires_qualification: !!m.requires_qualification,
      requires_review: !!m.requires_review, review_minutes: m.review_minutes ?? null,
      ops: (normalizeTaskOps(m.ops) ?? undefined) as Prisma.InputJsonValue | undefined,
      is_active: m.is_active !== false, revision: m.revision, signature: taskModelSignature(fields),
    },
  });
  return { id: created.id, revision: created.revision };
}

export async function ensureStepModelFromPackage(
  tx: Prisma.TransactionClient, m: PackagedStepModel | null | undefined, warn: (msg: string) => void,
): Promise<{ id: number; revision: number } | null> {
  if (!m) return null;
  const spec = m.specialty?.key ? await tx.catalog2Specialty.findUnique({ where: { key: m.specialty.key }, select: { id: true } }) : null;
  const fields: StepModelFields = {
    name: m.name, description: m.description, specialty_id: spec?.id ?? null, estimated_minutes: m.estimated_minutes,
    execution_mode: m.execution_mode, purpose: m.purpose, completion_criteria: m.completion_criteria,
  };
  const existing = await tx.catalog2StepModel.findUnique({ where: { id: m.id } });
  if (existing) {
    if (norm(existing.name) === norm(m.name)) {
      if (m.is_access_validation && !existing.is_access_validation) await tx.catalog2StepModel.update({ where: { id: existing.id }, data: { is_access_validation: true } });
      return { id: existing.id, revision: existing.revision };
    }
    warn(`Etapa #${m.id} já existe no destino com outro nome ("${existing.name}") — não sobrescrita; vinculada pelo conteúdo.`);
    const alt = await findOrCreateStepModel(tx, fields);
    return { id: alt.id, revision: alt.revision };
  }
  const created = await tx.catalog2StepModel.create({
    data: {
      id: m.id, name: m.name, description: m.description, completion_criteria: m.completion_criteria, purpose: m.purpose,
      execution_mode: m.execution_mode, specialty_id: spec?.id ?? null, estimated_minutes: m.estimated_minutes,
      ops: (normalizeStepOps(m.ops) ?? undefined) as Prisma.InputJsonValue | undefined,
      is_active: m.is_active !== false, is_access_validation: !!m.is_access_validation, revision: m.revision, signature: stepModelSignature(fields),
    },
  });
  return { id: created.id, revision: created.revision };
}
