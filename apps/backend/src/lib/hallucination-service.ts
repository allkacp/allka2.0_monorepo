import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";
import { runAtomic } from "./db-atomic";

// ─── Serviço do relato de "possível alucinação" (bloco 2/4) ────────────────
// Nunca afirma que houve alucinação de fato — só registra a suspeita pra
// análise administrativa. Nunca corrige memória sozinho: qualquer edição de
// memória a partir daqui passa pela API oficial do bloco 1 e gera o
// MemoryHistoryEvent normal, nunca uma escrita direta aqui.

export const HALLUCINATION_CATEGORIES = [
  "informacao_incorreta",
  "instrucao_ignorada",
  "tom_inadequado",
  "dado_inventado",
  "outro",
] as const;
export type HallucinationCategory = (typeof HALLUCINATION_CATEGORIES)[number];
export function isHallucinationCategory(value: string): value is HallucinationCategory {
  return (HALLUCINATION_CATEGORIES as readonly string[]).includes(value);
}

export const HALLUCINATION_IMPACTS = ["baixo", "medio", "alto"] as const;
export type HallucinationImpact = (typeof HALLUCINATION_IMPACTS)[number];
export function isHallucinationImpact(value: string): value is HallucinationImpact {
  return (HALLUCINATION_IMPACTS as readonly string[]).includes(value);
}

export const HALLUCINATION_STATUSES = ["novo", "em_analise", "resolvido", "descartado"] as const;
export type HallucinationStatus = (typeof HALLUCINATION_STATUSES)[number];

export class HallucinationConcurrencyError extends Error {
  httpStatus = 409;
  code = "hallucination_report_stale";
  constructor() {
    super("Este relato foi alterado por outra pessoa. Recarregue e tente de novo.");
  }
}

export class HallucinationClosedError extends Error {
  httpStatus = 422;
  code = "hallucination_report_closed";
  constructor() {
    super("Este relato já foi resolvido ou descartado e não aceita mais essa ação.");
  }
}

/** Idempotente por `createClientActionId` — duplo clique/retry no formulário nunca duplica. */
export async function createHallucinationReport(
  params: {
    projectId: string;
    reportedByUserId: string;
    description: string;
    questionedResponse?: string | null;
    snapshotId?: string | null;
    launchExecutionId?: string | null;
    projectTaskId?: string | null;
    category: HallucinationCategory;
    impact: HallucinationImpact;
    createClientActionId?: string | null;
  },
  db: DbClient = prisma,
) {
  if (params.createClientActionId) {
    const existing = await db.hallucinationReport.findUnique({ where: { create_client_action_id: params.createClientActionId } });
    if (existing) return { report: existing, duplicate: true };
  }

  try {
    const report = await runAtomic(db, async (tx) => {
      const created = await tx.hallucinationReport.create({
        data: {
          project_id: params.projectId,
          reported_by_user_id: params.reportedByUserId,
          description: params.description,
          questioned_response: params.questionedResponse ?? null,
          snapshot_id: params.snapshotId ?? null,
          launch_execution_id: params.launchExecutionId ?? null,
          project_task_id: params.projectTaskId ?? null,
          category: params.category,
          impact: params.impact,
          create_client_action_id: params.createClientActionId ?? null,
        },
      });
      await tx.hallucinationReportEvent.create({
        data: {
          report_id: created.id,
          event_type: "created",
          actor_user_id: params.reportedByUserId,
          description: "Relato de possível alucinação registrado.",
        },
      });
      return created;
    });
    return { report, duplicate: false };
  } catch (e: any) {
    if (e?.code === "P2002" && params.createClientActionId) {
      const raced = await db.hallucinationReport.findUniqueOrThrow({ where: { create_client_action_id: params.createClientActionId } });
      return { report: raced, duplicate: true };
    }
    throw e;
  }
}

export async function findHallucinationReport(id: string, db: DbClient = prisma) {
  return db.hallucinationReport.findUnique({
    where: { id },
    include: {
      files: { where: { archived_at: null }, orderBy: { created_at: "desc" } },
      project_task: { select: { id: true, title: true } },
      snapshot: true,
    },
  });
}

export async function listHallucinationReports(
  where: Prisma.HallucinationReportWhereInput,
  opts: { limit?: number; offset?: number } = {},
  db: DbClient = prisma,
) {
  const [data, total] = await Promise.all([
    db.hallucinationReport.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: Math.min(opts.limit ?? 50, 200),
      skip: opts.offset ?? 0,
      include: { project_task: { select: { title: true } } },
    }),
    db.hallucinationReport.count({ where }),
  ]);
  return { data, total };
}

export async function listHallucinationReportHistory(reportId: string, db: DbClient = prisma) {
  return db.hallucinationReportEvent.findMany({ where: { report_id: reportId }, orderBy: { created_at: "desc" } });
}

/**
 * Aplica UMA transição administrativa com concorrência otimista (mesmo
 * padrão de `updateMemorySection` do bloco 1 — cliente reenvia o
 * `updated_at` que leu por último; 409 sem sobrescrever em silêncio) e
 * grava o evento de histórico correspondente na mesma unidade atômica.
 */
async function applyReportTransition(
  params: {
    reportId: string;
    expectedUpdatedAt: string | null;
    actorUserId: string;
    patch: Prisma.HallucinationReportUpdateInput;
    eventType: string;
    eventDescription: string;
    metadata?: Record<string, unknown>;
  },
  db: DbClient = prisma,
) {
  const current = await db.hallucinationReport.findUniqueOrThrow({ where: { id: params.reportId } });
  if (params.expectedUpdatedAt && new Date(params.expectedUpdatedAt).getTime() !== current.updated_at.getTime()) {
    throw new HallucinationConcurrencyError();
  }

  return runAtomic(db, async (tx) => {
    const updated = await tx.hallucinationReport.update({
      where: { id: params.reportId, updated_at: current.updated_at },
      data: params.patch,
    });
    await tx.hallucinationReportEvent.create({
      data: {
        report_id: params.reportId,
        event_type: params.eventType,
        actor_user_id: params.actorUserId,
        description: params.eventDescription,
        metadata_json: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
    return updated;
  }).catch((e: any) => {
    if (e?.code === "P2025") throw new HallucinationConcurrencyError();
    throw e;
  });
}

export async function assumeAnalysis(
  params: { reportId: string; actorUserId: string; expectedUpdatedAt: string | null },
  db: DbClient = prisma,
) {
  const current = await db.hallucinationReport.findUniqueOrThrow({ where: { id: params.reportId } });
  if (current.status === "resolvido" || current.status === "descartado") throw new HallucinationClosedError();

  return applyReportTransition(
    {
      reportId: params.reportId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      actorUserId: params.actorUserId,
      patch: { status: "em_analise", assigned_admin_user_id: params.actorUserId, assigned_at: new Date() },
      eventType: "assumed_analysis",
      eventDescription: "Análise assumida por um administrador.",
    },
    db,
  );
}

export async function markSuspectedOrigin(
  params: {
    reportId: string;
    actorUserId: string;
    expectedUpdatedAt: string | null;
    layer: "project" | "company" | "agency";
    memoryId: string | null;
  },
  db: DbClient = prisma,
) {
  return applyReportTransition(
    {
      reportId: params.reportId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      actorUserId: params.actorUserId,
      patch: { suspected_origin_layer: params.layer, suspected_origin_memory_id: params.memoryId },
      eventType: "marked_suspected_origin",
      eventDescription: `Camada "${params.layer}" marcada como possível origem.`,
      metadata: { layer: params.layer, memoryId: params.memoryId },
    },
    db,
  );
}

export async function recordDiagnosis(
  params: { reportId: string; actorUserId: string; expectedUpdatedAt: string | null; note: string },
  db: DbClient = prisma,
) {
  return applyReportTransition(
    {
      reportId: params.reportId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      actorUserId: params.actorUserId,
      patch: { diagnosis_note: params.note },
      eventType: "diagnosis_recorded",
      eventDescription: "Diagnóstico registrado.",
    },
    db,
  );
}

/**
 * Resolver/descartar — idempotente por `clientActionId` (fechamento repetido
 * devolve o estado já existente, nunca duplica) e protegido por
 * compare-and-swap real contra duas requisições concorrentes fechando o
 * mesmo relato ao mesmo tempo (mesmo padrão de SystemAlert.resolve).
 */
export async function closeHallucinationReport(
  params: {
    reportId: string;
    actorUserId: string;
    outcome: "resolvido" | "descartado";
    justification: string;
    clientActionId: string;
    expectedUpdatedAt: string | null;
  },
  db: DbClient = prisma,
) {
  const existingByClientId = await db.hallucinationReport.findUnique({ where: { resolution_client_action_id: params.clientActionId } });
  if (existingByClientId) return { report: existingByClientId, duplicate: true, alreadyClosed: false };

  const current = await db.hallucinationReport.findUniqueOrThrow({ where: { id: params.reportId } });
  if (current.status === "resolvido" || current.status === "descartado") {
    return { report: current, duplicate: false, alreadyClosed: true };
  }
  if (params.expectedUpdatedAt && new Date(params.expectedUpdatedAt).getTime() !== current.updated_at.getTime()) {
    throw new HallucinationConcurrencyError();
  }

  try {
    const updated = await runAtomic(db, async (tx) => {
      const cas = await tx.hallucinationReport.updateMany({
        where: { id: params.reportId, status: current.status },
        data: {
          status: params.outcome,
          resolution_note: params.justification,
          resolved_by_user_id: params.actorUserId,
          resolved_at: new Date(),
          resolution_client_action_id: params.clientActionId,
        },
      });
      if (cas.count === 0) return null;
      await tx.hallucinationReportEvent.create({
        data: {
          report_id: params.reportId,
          event_type: params.outcome === "resolvido" ? "resolved" : "discarded",
          actor_user_id: params.actorUserId,
          description: `Relato ${params.outcome === "resolvido" ? "resolvido" : "descartado"}: ${params.justification}`,
        },
      });
      return tx.hallucinationReport.findUniqueOrThrow({ where: { id: params.reportId } });
    });
    if (!updated) {
      const raced = await db.hallucinationReport.findUniqueOrThrow({ where: { id: params.reportId } });
      const mesmoClientId = raced.resolution_client_action_id === params.clientActionId;
      return { report: raced, duplicate: mesmoClientId, alreadyClosed: !mesmoClientId };
    }
    return { report: updated, duplicate: false, alreadyClosed: false };
  } catch (e: any) {
    if (e?.code === "P2002") {
      const raced = await db.hallucinationReport.findUniqueOrThrow({ where: { resolution_client_action_id: params.clientActionId } });
      return { report: raced, duplicate: true, alreadyClosed: false };
    }
    throw e;
  }
}

// ── Anexos — mesma biblioteca de disco de MemoryFile (lib/file-storage.ts),
// linha própria, arquivamento lógico (nunca apaga o binário na hora). ──────

export async function addHallucinationReportFile(
  params: { reportId: string; actorUserId: string; name: string; fileName: string; mimeType: string | null; size: number },
  db: DbClient = prisma,
) {
  return runAtomic(db, async (tx) => {
    const file = await tx.hallucinationReportFile.create({
      data: {
        report_id: params.reportId,
        name: params.name,
        file_name: params.fileName,
        mime_type: params.mimeType,
        size: params.size,
        uploaded_by_user_id: params.actorUserId,
      },
    });
    await tx.hallucinationReportEvent.create({
      data: {
        report_id: params.reportId,
        event_type: "file_added",
        actor_user_id: params.actorUserId,
        description: `Anexo "${params.name}" adicionado.`,
      },
    });
    return file;
  });
}

export async function archiveHallucinationReportFile(fileId: string, actorUserId: string, db: DbClient = prisma) {
  const file = await db.hallucinationReportFile.findUnique({ where: { id: fileId } });
  if (!file || file.archived_at) return file;
  return runAtomic(db, async (tx) => {
    const updated = await tx.hallucinationReportFile.update({ where: { id: fileId }, data: { archived_at: new Date() } });
    await tx.hallucinationReportEvent.create({
      data: {
        report_id: file.report_id,
        event_type: "file_removed",
        actor_user_id: actorUserId,
        description: `Anexo "${file.name}" removido.`,
      },
    });
    return updated;
  });
}
