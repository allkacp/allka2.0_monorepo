import { prisma } from "./prisma";

export type ProjectEventCode =
  | "CRIADO"
  | "RASCUNHO_SALVO"
  | "STATUS_ALTERADO"
  | "PRODUTO_ADICIONADO"
  | "PRODUTO_REMOVIDO"
  | "CHECKOUT_INICIADO"
  | "PAGAMENTO_APROVADO"
  | "TAREFAS_GERADAS"
  | "COMISSAO_ALTERADA"
  | "CLIENTE_ALTERADO"
  | "ATUALIZADO"
  | "CANCELADO"
  | "CONCLUIDO";

export interface LogProjectEventOpts {
  project_id: number;
  event: ProjectEventCode;
  description: string;
  actor_id?: number | null;
  actor_name?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Write a project activity log entry. Fire-and-forget safe: never throws,
 * logs any error to stderr instead of crashing the request.
 */
export async function logProjectEvent(
  opts: LogProjectEventOpts,
): Promise<void> {
  try {
    await (prisma as any).projectLog.create({
      data: {
        project_id: opts.project_id,
        event: opts.event,
        description: opts.description,
        actor_id: opts.actor_id ?? null,
        actor_name: opts.actor_name ?? null,
        meta: opts.meta ? JSON.stringify(opts.meta) : null,
      },
    });
  } catch (err) {
    console.error("[project-log] Failed to write log entry:", err);
  }
}
