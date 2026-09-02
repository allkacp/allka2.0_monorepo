import type { Memory } from "@prisma/client";
import { prisma } from "./prisma";
import type { MemoryScopeType } from "./memory-permissions";
import type { DbClient } from "./project-scope";
import { runAtomic } from "./db-atomic";

// ─── Serviço central da Memória (bloco 1/4) ─────────────────────────────────
// Só armazenamento/histórico/concorrência — NENHUMA montagem de prompt,
// chamada de IA, correção automática ou resolução de conflito de hierarquia
// acontece aqui (bloco 2). Toda escrita gera um MemoryHistoryEvent imutável.

export const MEMORY_SECTIONS = ["positive_instructions", "negative_instructions", "summary"] as const;
export type MemorySection = (typeof MEMORY_SECTIONS)[number];

export function isMemorySection(value: string): value is MemorySection {
  return (MEMORY_SECTIONS as readonly string[]).includes(value);
}

export class MemoryConcurrencyError extends Error {
  httpStatus = 409;
  code = "memory_stale";
  constructor() {
    super("Esta memória foi alterada por outra sessão. Recarregue e tente de novo.");
  }
}

/**
 * Busca a memória do escopo, OU null se ainda não existe (a criação real só
 * acontece na primeira edição — GET nunca cria linha à toa).
 */
export async function findMemory(scopeType: MemoryScopeType, scopeId: string) {
  return prisma.memory.findUnique({
    where: { scope_type_scope_id: { scope_type: scopeType, scope_id: scopeId } },
    include: {
      files: { where: { archived_at: null }, orderBy: { created_at: "desc" } },
      approved_task_records: { orderBy: { approved_at: "desc" }, include: { project_task: { select: { title: true } } } },
    },
  });
}

/**
 * Cria a memória do escopo se ainda não existir (idempotente — chamada
 * concorrente cai no catch do unique constraint e relê a linha já criada).
 */
async function ensureMemory(scopeType: MemoryScopeType, scopeId: string, actorUserId: string, db: DbClient = prisma): Promise<Memory> {
  const existing = await db.memory.findUnique({
    where: { scope_type_scope_id: { scope_type: scopeType, scope_id: scopeId } },
  });
  if (existing) return existing;

  try {
    return await runAtomic(db, async (tx) => {
      const created = await tx.memory.create({
        data: { scope_type: scopeType, scope_id: scopeId, created_by_user_id: actorUserId },
      });
      await tx.memoryHistoryEvent.create({
        data: { memory_id: created.id, section: "summary", action: "created", actor_user_id: actorUserId, origin: "manual" },
      });
      return created;
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const raced = await db.memory.findUnique({
        where: { scope_type_scope_id: { scope_type: scopeType, scope_id: scopeId } },
      });
      if (raced) return raced;
    }
    throw e;
  }
}

/**
 * Edita UMA seção (nunca o blob inteiro). Concorrência otimista: `expectedUpdatedAt`
 * precisa bater com o `updated_at` atual da memória (mesmo padrão de
 * planner.ts PUT /cards/:id) — se não bater, lança MemoryConcurrencyError
 * (409) sem escrever nada.
 */
export async function updateMemorySection(params: {
  scopeType: MemoryScopeType;
  scopeId: string;
  section: MemorySection;
  value: string;
  actorUserId: string;
  expectedUpdatedAt: string | null;
}): Promise<Memory> {
  const { scopeType, scopeId, section, value, actorUserId, expectedUpdatedAt } = params;
  const memory = await ensureMemory(scopeType, scopeId, actorUserId);

  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== memory.updated_at.getTime()) {
    throw new MemoryConcurrencyError();
  }

  const before = memory[section];
  if (before === value) return memory; // nada mudou — não gera evento de história vazio

  return prisma.$transaction(async (tx) => {
    const updated = await tx.memory.update({
      where: { id: memory.id, updated_at: memory.updated_at },
      data: { [section]: value, updated_by_user_id: actorUserId },
    });
    await tx.memoryHistoryEvent.create({
      data: {
        memory_id: memory.id,
        section,
        action: "updated",
        actor_user_id: actorUserId,
        before_json: JSON.stringify({ value: before ?? null }),
        after_json: JSON.stringify({ value }),
        origin: "manual",
      },
    });
    return updated;
  }).catch((e: any) => {
    // updated_at mudou entre o findUnique acima e este update (corrida real
    // dentro da mesma janela) -- Prisma não acha a linha pelo where composto
    // e lança P2025; trata igual à checagem otimista de cima.
    if (e?.code === "P2025") throw new MemoryConcurrencyError();
    throw e;
  });
}

export async function archiveMemory(scopeType: MemoryScopeType, scopeId: string, actorUserId: string, reason?: string) {
  const memory = await ensureMemory(scopeType, scopeId, actorUserId);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.memory.update({
      where: { id: memory.id },
      data: { is_archived: true, archived_at: new Date(), archived_by_user_id: actorUserId },
    });
    await tx.memoryHistoryEvent.create({
      data: { memory_id: memory.id, section: "archive", action: "archived", actor_user_id: actorUserId, reason, origin: "manual" },
    });
    return updated;
  });
}

export async function addMemoryFile(params: {
  scopeType: MemoryScopeType;
  scopeId: string;
  actorUserId: string;
  name: string;
  fileName: string;
  mimeType: string | null;
  size: number;
}) {
  const memory = await ensureMemory(params.scopeType, params.scopeId, params.actorUserId);
  return prisma.$transaction(async (tx) => {
    const file = await tx.memoryFile.create({
      data: {
        memory_id: memory.id,
        name: params.name,
        file_name: params.fileName,
        mime_type: params.mimeType,
        size: params.size,
        uploaded_by_user_id: params.actorUserId,
      },
    });
    await tx.memoryHistoryEvent.create({
      data: {
        memory_id: memory.id,
        section: "file",
        action: "file_added",
        actor_user_id: params.actorUserId,
        after_json: JSON.stringify({ file_id: file.id, name: file.name, size: file.size }),
        origin: "manual",
      },
    });
    return file;
  });
}

/** Arquivamento lógico — nunca apaga o registro nem o arquivo em disco na hora. */
export async function archiveMemoryFile(fileId: string, actorUserId: string) {
  const file = await prisma.memoryFile.findUnique({ where: { id: fileId } });
  if (!file || file.archived_at) return file;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.memoryFile.update({ where: { id: fileId }, data: { archived_at: new Date() } });
    await tx.memoryHistoryEvent.create({
      data: {
        memory_id: file.memory_id,
        section: "file",
        action: "file_removed",
        actor_user_id: actorUserId,
        before_json: JSON.stringify({ file_id: file.id, name: file.name }),
        origin: "manual",
      },
    });
    return updated;
  });
}

export async function listMemoryHistory(scopeType: MemoryScopeType, scopeId: string) {
  const memory = await findMemory(scopeType, scopeId);
  if (!memory) return [];
  return prisma.memoryHistoryEvent.findMany({
    where: { memory_id: memory.id },
    orderBy: { created_at: "desc" },
  });
}

/**
 * Registra uma tarefa/entrega aprovada na memória do PROJETO dela. Sempre
 * idempotente por `idempotencyKey` (retry/clique duplo no fluxo de aprovação
 * nunca duplica). Só dado seguro e necessário — nenhuma síntese por IA
 * acontece aqui (bloco 2).
 *
 * Confiabilidade (acabamento do bloco 1): quando o chamador passa o `db`
 * transacional da PRÓPRIA aprovação (ver PATCH /project-tasks/:id/aprovar),
 * este registro roda DENTRO da mesma transação — aprovação e memória
 * cometem juntas ou nenhuma das duas. Não existe mais uma janela onde a
 * tarefa já apareça aprovada e o registro de memória tenha se perdido: se
 * este passo falhar, a transação inteira volta atrás e a tarefa continua
 * exatamente como estava, pronta pra uma nova tentativa. Chamada avulsa
 * (sem transação de fora — ex.: script, teste) mantém sua própria
 * atomicidade local via `runAtomic`.
 */
export async function recordApprovedTask(
  params: {
    projectId: string;
    projectTaskId: string;
    approvedAt: Date;
    approvedByUserId: string | null;
    approvalNote?: string | null;
    idempotencyKey: string;
  },
  db: DbClient = prisma,
) {
  const existing = await db.memoryApprovedTaskRecord.findUnique({ where: { idempotency_key: params.idempotencyKey } });
  if (existing) return existing;

  const memory = await ensureMemory("project", params.projectId, params.approvedByUserId ?? "system", db);

  try {
    return await runAtomic(db, async (tx) => {
      const record = await tx.memoryApprovedTaskRecord.create({
        data: {
          memory_id: memory.id,
          project_task_id: params.projectTaskId,
          approved_at: params.approvedAt,
          approved_by_user_id: params.approvedByUserId,
          approval_note: params.approvalNote ?? null,
          idempotency_key: params.idempotencyKey,
        },
      });
      await tx.memoryHistoryEvent.create({
        data: {
          memory_id: memory.id,
          section: "approved_task",
          action: "approved_task_added",
          actor_user_id: params.approvedByUserId ?? "system",
          after_json: JSON.stringify({ project_task_id: params.projectTaskId, approved_at: params.approvedAt }),
          origin: "task_approval",
        },
      });
      return record;
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Corrida: outra chamada criou com a mesma idempotency_key entre o
      // findUnique acima e este create.
      return db.memoryApprovedTaskRecord.findUniqueOrThrow({ where: { idempotency_key: params.idempotencyKey } });
    }
    throw e;
  }
}
