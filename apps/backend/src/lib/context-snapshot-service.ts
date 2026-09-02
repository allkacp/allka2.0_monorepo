import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";
import { compileProjectMemoryContext, type CompiledMemoryContext } from "./memory-context-compiler";

// ─── Snapshot imutável de execução (bloco 2/4) ──────────────────────────────
// Nenhuma chamada de IA externa é fabricada aqui — só a prévia real
// ("Visualizar contexto que a IA utilizará") registra um AIContextSnapshot,
// com provider/model/response_text nulos (nenhuma IA foi de fato chamada).
// Idempotente por `createClientActionId`: retry (rede instável, duplo
// clique) nunca duplica o snapshot.

export async function createContextSnapshotPreview(
  params: { projectId: string; requestedByUserId: string; createClientActionId?: string | null },
  db: DbClient = prisma,
): Promise<{ snapshot: Awaited<ReturnType<typeof db.aIContextSnapshot.findUniqueOrThrow>>; compiled: CompiledMemoryContext | null; duplicate: boolean }> {
  if (params.createClientActionId) {
    const existing = await db.aIContextSnapshot.findUnique({ where: { create_client_action_id: params.createClientActionId } });
    if (existing) return { snapshot: existing, compiled: null, duplicate: true };
  }

  const compiled = await compileProjectMemoryContext(params.projectId, db);

  try {
    const snapshot = await db.aIContextSnapshot.create({
      data: {
        project_id: params.projectId,
        requested_by_user_id: params.requestedByUserId,
        action: "preview",
        checksum: compiled.checksum,
        compiled_text: compiled.text,
        structured_json: JSON.stringify(compiled.layers),
        missing_layers: JSON.stringify(compiled.missingLayers),
        approved_task_refs: JSON.stringify(compiled.approvedTaskRefs),
        status: "compiled",
        create_client_action_id: params.createClientActionId ?? null,
      },
    });
    return { snapshot, compiled, duplicate: false };
  } catch (e: any) {
    if (e?.code === "P2002" && params.createClientActionId) {
      // Corrida: outra chamada com o MESMO createClientActionId venceu entre
      // o findUnique acima e este create.
      const raced = await db.aIContextSnapshot.findUniqueOrThrow({ where: { create_client_action_id: params.createClientActionId } });
      return { snapshot: raced, compiled, duplicate: true };
    }
    throw e;
  }
}

export async function getContextSnapshot(id: string, db: DbClient = prisma) {
  return db.aIContextSnapshot.findUnique({ where: { id } });
}

/**
 * Snapshot de uma execução de IA REAL (bloco 3/4 — IA de Lançamento). Ao
 * contrário da prévia acima, `action` aqui é sempre "execution": esta
 * chamada só acontece imediatamente antes de uma chamada de IA de verdade
 * usar o contexto, nunca como visualização. Sem idempotência própria — a
 * idempotência da GERAÇÃO inteira (bloco 3) já é resolvida um nível acima,
 * por `LaunchGenerationExecution.client_action_id`, antes deste ponto ser
 * alcançado; um retry legítimo nunca chega até aqui duas vezes.
 */
export async function createContextSnapshotForExecution(
  params: { projectId: string; requestedByUserId: string },
  db: DbClient = prisma,
): Promise<{ snapshot: Awaited<ReturnType<typeof db.aIContextSnapshot.findUniqueOrThrow>>; compiled: CompiledMemoryContext }> {
  const compiled = await compileProjectMemoryContext(params.projectId, db);
  const snapshot = await db.aIContextSnapshot.create({
    data: {
      project_id: params.projectId,
      requested_by_user_id: params.requestedByUserId,
      action: "execution",
      checksum: compiled.checksum,
      compiled_text: compiled.text,
      structured_json: JSON.stringify(compiled.layers),
      missing_layers: JSON.stringify(compiled.missingLayers),
      approved_task_refs: JSON.stringify(compiled.approvedTaskRefs),
      status: "compiled",
    },
  });
  return { snapshot, compiled };
}
