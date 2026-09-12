// Preenchimento PROVISÓRIO (dado de teste) de especialidade/tempo estimado
// nas 102 tarefas dos 36 produtos reais do catalog2 (reunião 10/09, "36
// produtos funcionalmente completos para teste"). Idempotente: só toca
// tarefa que ainda não tem NENHUM valor de esforço (specialty_id E
// estimated_minutes ambos nulos) — uma vez preenchida (por este script OU
// por edição humana via PUT /tasks/:id), nunca é sobrescrita de novo
// (regras 13/14). Nunca cria etapa nem dependência (regras do enunciado:
// etapa-espelho já existente cobre a falta de subdivisão real; a fonte não
// declara dependência explícita entre segmentos — só prosa sequencial).
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../assert-local-database";
import { classifyTaskEffort } from "./classify-provisional-effort";

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";
const EFFORT_SOURCE = "provisional_fill_v1";
const PROVISIONAL_REASON =
  "Especialidade e tempo definidos PROVISORIAMENTE para teste — estimados por regra determinística (classify-provisional-effort.ts) a partir do nome da tarefa e do produto ao qual pertence. NÃO é dado real revisado; não pode ser usado para aprovar preço comercial nem publicação.";

export interface TaskEffortFillLine {
  product_name: string;
  task_key: string;
  task_name: string;
  outcome: "filled" | "skipped_has_value" | "skipped_human_reviewed" | "error";
  specialty_key: string | null;
  estimated_minutes: number | null;
  rule: string | null;
  ambiguous: boolean;
  ambiguous_reason: string | null;
  error?: string;
}

export interface TaskEffortFillResult {
  mode: "dry_run" | "apply";
  products_total: number;
  tasks_total: number;
  tasks_filled: number;
  tasks_skipped_already_has_value: number;
  tasks_ambiguous: number;
  specialties_used: Record<string, number>;
  minutes_range: { min: number; max: number } | null;
  lines: TaskEffortFillLine[];
}

export async function runProvisionalTaskEffortFill(opts: { mode: "dry_run" | "apply" }): Promise<TaskEffortFillResult> {
  if (opts.mode === "apply") assertLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient();

  try {
    const products = await db.catalog2Product.findMany({
      where: { NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } } },
      orderBy: { internal_name: "asc" },
      include: {
        versions: {
          where: { state: "rascunho" },
          include: { tasks: { orderBy: { sort_order: "asc" } } },
        },
      },
    });

    const specialties = await db.catalog2Specialty.findMany({ select: { id: true, key: true } });
    const specialtyIdByKey = new Map(specialties.map((s) => [s.key, s.id]));

    const lines: TaskEffortFillLine[] = [];
    let tasksTotal = 0;
    let tasksFilled = 0;
    let tasksSkippedHasValue = 0;
    let tasksAmbiguous = 0;
    const specialtiesUsed: Record<string, number> = {};
    let minMinutes: number | null = null;
    let maxMinutes: number | null = null;

    for (const p of products) {
      const version = p.versions[0];
      if (!version) continue;

      for (const t of version.tasks) {
        tasksTotal++;

        if (t.effort_source === "human_reviewed") {
          lines.push({
            product_name: p.internal_name,
            task_key: t.key,
            task_name: t.name,
            outcome: "skipped_human_reviewed",
            specialty_key: null,
            estimated_minutes: null,
            rule: null,
            ambiguous: false,
            ambiguous_reason: null,
          });
          continue;
        }

        if (t.specialty_id != null || t.estimated_minutes != null) {
          // Já tem algum valor — seja de uma execução anterior deste
          // script (idempotência), seja de qualquer outra origem. Nunca
          // sobrescreve.
          tasksSkippedHasValue++;
          lines.push({
            product_name: p.internal_name,
            task_key: t.key,
            task_name: t.name,
            outcome: "skipped_has_value",
            specialty_key: null,
            estimated_minutes: null,
            rule: null,
            ambiguous: false,
            ambiguous_reason: null,
          });
          continue;
        }

        const estimate = classifyTaskEffort(p.internal_name, t.name);
        const specialtyId = specialtyIdByKey.get(estimate.specialty_key);
        if (!specialtyId) {
          lines.push({
            product_name: p.internal_name,
            task_key: t.key,
            task_name: t.name,
            outcome: "error",
            specialty_key: estimate.specialty_key,
            estimated_minutes: null,
            rule: estimate.rule,
            ambiguous: estimate.ambiguous,
            ambiguous_reason: estimate.ambiguous_reason,
            error: `Especialidade "${estimate.specialty_key}" não existe no banco — nunca inventa uma nova.`,
          });
          continue;
        }

        if (opts.mode === "apply") {
          await db.catalog2Task.update({
            where: { id: t.id },
            data: {
              specialty_id: specialtyId,
              estimated_minutes: estimate.estimated_minutes,
              effort_is_provisional: true,
              effort_source: EFFORT_SOURCE,
              effort_provisional_reason: PROVISIONAL_REASON,
            },
          });
        }

        tasksFilled++;
        if (estimate.ambiguous) tasksAmbiguous++;
        specialtiesUsed[estimate.specialty_key] = (specialtiesUsed[estimate.specialty_key] ?? 0) + 1;
        minMinutes = minMinutes == null ? estimate.estimated_minutes : Math.min(minMinutes, estimate.estimated_minutes);
        maxMinutes = maxMinutes == null ? estimate.estimated_minutes : Math.max(maxMinutes, estimate.estimated_minutes);

        lines.push({
          product_name: p.internal_name,
          task_key: t.key,
          task_name: t.name,
          outcome: "filled",
          specialty_key: estimate.specialty_key,
          estimated_minutes: estimate.estimated_minutes,
          rule: estimate.rule,
          ambiguous: estimate.ambiguous,
          ambiguous_reason: estimate.ambiguous_reason,
        });
      }
    }

    return {
      mode: opts.mode,
      products_total: products.length,
      tasks_total: tasksTotal,
      tasks_filled: tasksFilled,
      tasks_skipped_already_has_value: tasksSkippedHasValue,
      tasks_ambiguous: tasksAmbiguous,
      specialties_used: specialtiesUsed,
      minutes_range: minMinutes != null && maxMinutes != null ? { min: minMinutes, max: maxMinutes } : null,
      lines,
    };
  } finally {
    await db.$disconnect();
  }
}
