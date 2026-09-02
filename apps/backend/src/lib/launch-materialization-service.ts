import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";
import { runAtomic } from "./db-atomic";
import { LaunchSessionClosedError } from "./launch-session-service";
import { LaunchProposalValidationError, assertLaunchPlanReadyForMaterialization, type LaunchPlan, type LaunchTask, type LaunchWave } from "./launch-proposal-schema";
import { DRAFT_STATUS, PENDING_RELEASE_STATUS, RELEASE_READY_STATUS } from "./task-release-service";

// ─── Materialização de uma proposta aprovada (bloco 4/4) ────────────────────
// Transforma UMA LaunchProposalVersion aprovada em ProjectTask/ProjectTaskStage
// reais, numa transação única (tudo ou nada). Idempotente por
// `client_action_id` E pelo `@unique` em `version_id` — "a proposta aprovada
// só pode ser materializada uma vez" é a MESMA constraint que impede
// duplicar em clique duplo/retry/corrida.

export type MaterializationMode = "rascunho_operacional" | "execucao";

export class MaterializationError extends Error {
  httpStatus: number;
  code: string;
  constructor(message: string, httpStatus = 422, code = "launch_materialization_invalid") {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

function summarizePlan(plan: LaunchPlan, titleToTaskId: Map<string, string>) {
  const dependencyCount = plan.tasks.reduce(
    (sum, t) => sum + t.prerequisites.filter((p) => titleToTaskId.has(p) && titleToTaskId.get(p) !== titleToTaskId.get(t.title)).length,
    0,
  );
  const pendingSelections = plan.tasks.filter((t) => t.specialty_requires_selection || t.responsible_requires_selection).length;
  return {
    tasks: plan.tasks.length,
    stages: plan.tasks.reduce((sum, t) => sum + t.steps.length, 0),
    dependencies: dependencyCount,
    waves: plan.waves.length,
    pending_selections: pendingSelections,
  };
}

/** Só os tipos de gatilho de ONDA que viram TaskReleaseTrigger — "aprovação
 * de tarefa anterior" já é coberto por TaskDependency (criada a partir de
 * `prerequisites`), nunca duplicada aqui como trigger também. */
function waveTriggerRows(wave: LaunchWave, taskId: string): { trigger_type: string; scheduled_at?: Date; scheduled_timezone?: string }[] {
  if (wave.trigger_type === "data" && wave.trigger_date) {
    const parsed = new Date(wave.trigger_date);
    if (!Number.isNaN(parsed.getTime())) {
      return [{ trigger_type: "scheduled_date", scheduled_at: parsed, scheduled_timezone: "America/Sao_Paulo" }];
    }
  }
  if (wave.trigger_type === "pagamento_nova_etapa") return [{ trigger_type: "payment" }];
  if (wave.trigger_type === "aprovacao_manual_gestor") return [{ trigger_type: "manual_approval" }];
  return [];
}

export async function materializeLaunchVersion(
  params: { sessionId: string; versionId: string; mode: MaterializationMode; requestedByUserId: string; clientActionId: string },
  db: DbClient = prisma,
) {
  const asDuplicateResult = (m: NonNullable<Awaited<ReturnType<typeof db.launchMaterialization.findUnique>>>) => ({
    materialization: m,
    createdTaskIds: JSON.parse(m.created_task_ids_json) as string[],
    summary: JSON.parse(m.summary_json),
    duplicate: true as const,
  });

  const existingByClientId = await db.launchMaterialization.findUnique({ where: { client_action_id: params.clientActionId } });
  if (existingByClientId) return asDuplicateResult(existingByClientId);

  // Único em version_id: a MESMA proteção que impede materializar a mesma
  // versão duas vezes também resolve retry sem client_action_id (ex.: front
  // perdeu o id gerado e tenta de novo) — devolve a existente, nunca erro.
  const existingByVersion = await db.launchMaterialization.findUnique({ where: { version_id: params.versionId } });
  if (existingByVersion) return asDuplicateResult(existingByVersion);

  const session = await db.launchSession.findUniqueOrThrow({ where: { id: params.sessionId } });
  if (session.status !== "aprovada_como_rascunho" || session.approved_version_id !== params.versionId) {
    throw new MaterializationError("Só é possível materializar a versão que foi formalmente aprovada como rascunho de lançamento.");
  }

  const version = await db.launchProposalVersion.findUniqueOrThrow({ where: { id: params.versionId } });
  if (version.session_id !== params.sessionId) throw new MaterializationError("Versão não pertence a esta sessão.");

  let plan: LaunchPlan;
  try {
    plan = JSON.parse(version.structured_json);
  } catch {
    throw new LaunchProposalValidationError(["versão aprovada não contém um plano JSON válido"]);
  }
  if (plan.tasks.length === 0) throw new MaterializationError("Esta proposta não tem nenhuma tarefa para materializar.");
  // Acabamento do bloco 4: a correção de especialidade/responsável tem que
  // acontecer no editor ANTES de chegar aqui — nunca vira só uma tarefa real
  // presa num gatilho pendente sem o humano ter visto o problema antes.
  assertLaunchPlanReadyForMaterialization(plan);

  try {
    const result = await runAtomic(db, async (tx) => {
      // 1) Container ProjectProduct — ProjectTask.project_product_id nunca é
      // nulo; um plano de IA não é uma compra de catálogo, então cria seu
      // próprio "balde" (origin: "AI_LAUNCH"), mesmo espírito de
      // origin="AI_ASSEMBLY" (IALLKA) já usado na plataforma.
      const projectProduct = await tx.projectProduct.create({
        data: {
          project_id: session.project_id,
          origin: "AI_LAUNCH",
          origin_launch_version_id: params.versionId,
          product_name_snapshot: (plan.plan_summary || "Plano de Lançamento IA").slice(0, 190),
          product_category_snapshot: "Lançamento IA",
          product_price_snapshot: 0,
          status: params.mode === "rascunho_operacional" ? "PENDENTE" : "EM_EXECUCAO",
        },
      });

      // 2) Passo 1: cria todas as tarefas (status provisório) + mapa título->id.
      const titleToTaskId = new Map<string, string>();
      const createdTaskIds: string[] = [];
      for (const t of plan.tasks) {
        const task = await tx.projectTask.create({
          data: {
            project_id: session.project_id,
            project_product_id: projectProduct.id,
            name_snapshot: t.title,
            title: t.title,
            description: t.description,
            category_snapshot: "Lançamento IA",
            status: DRAFT_STATUS,
            launch_session_id: session.id,
            launch_version_id: params.versionId,
            required_specialty_id: t.specialty_id,
            assignee_id: t.responsible_user_id,
            launch_ai_snapshot_json: JSON.stringify(t satisfies LaunchTask),
          },
        });
        titleToTaskId.set(t.title, task.id);
        createdTaskIds.push(task.id);

        await tx.projectTaskStage.createMany({
          data: t.steps.map((stepText, idx) => ({
            project_task_id: task.id,
            titulo: stepText.slice(0, 190),
            descricao: stepText,
            ordem: idx + 1,
            status: idx === 0 ? "PENDENTE" : "BLOQUEADA",
            depende_da_etapa_anterior: idx > 0,
          })),
        });
      }

      // 3) Passo 2: dependências a partir de `prerequisites` — SÓ quando o
      // texto bate EXATAMENTE com o título de outra tarefa do MESMO plano
      // (nunca "parece parecido"; texto que não bate é só prosa informativa).
      for (const t of plan.tasks) {
        const taskId = titleToTaskId.get(t.title)!;
        for (const prereqText of t.prerequisites) {
          const prereqTaskId = titleToTaskId.get(prereqText);
          if (prereqTaskId && prereqTaskId !== taskId) {
            await tx.taskDependency.create({
              data: { project_id: session.project_id, task_id: taskId, depends_on_task_id: prereqTaskId, created_by_user_id: params.requestedByUserId },
            });
          }
        }
      }

      // 4) Passo 3: gatilhos de onda (data/pagamento/aprovação manual) em
      // cada tarefa da onda — "aprovação de tarefa anterior" já foi coberta
      // no passo 2 acima via TaskDependency, nunca duplicada como trigger.
      for (const wave of plan.waves) {
        for (const title of wave.task_titles) {
          const taskId = titleToTaskId.get(title);
          if (!taskId) continue;
          for (const row of waveTriggerRows(wave, taskId)) {
            await tx.taskReleaseTrigger.create({ data: { task_id: taskId, status: "pending", ...row } });
          }
        }
      }

      // 5) Passo 4: gatilhos de seleção humana pendente (especialidade/
      // responsável que a IA não conseguiu resolver pra um id estável).
      // Nunca deveria disparar de fato — `assertLaunchPlanReadyForMaterialization`
      // já barra isso ANTES da transação começar — mas fica como segunda
      // camada de defesa, nunca dependendo só da checagem anterior.
      for (const t of plan.tasks) {
        const taskId = titleToTaskId.get(t.title)!;
        if (t.specialty_requires_selection) {
          await tx.taskReleaseTrigger.create({ data: { task_id: taskId, trigger_type: "specialty_selection", status: "pending" } });
        }
        if (t.responsible_requires_selection) {
          await tx.taskReleaseTrigger.create({ data: { task_id: taskId, trigger_type: "responsible_selection", status: "pending" } });
        }
      }

      // 6) Passo 5: status FINAL de cada tarefa, já com dependências/gatilhos
      // conhecidos. Rascunho operacional nunca libera nada, independente de
      // ter ou não bloqueador. Em modo execução: sem NENHUM bloqueador ->
      // vai direto pro início oficial do pipeline (PARA_LANCAMENTO, o mesmo
      // usado por generate-tasks.ts); com algum bloqueador -> Pendente de
      // liberação.
      for (const taskId of createdTaskIds) {
        const [depCount, triggerCount] = await Promise.all([
          tx.taskDependency.count({ where: { task_id: taskId } }),
          tx.taskReleaseTrigger.count({ where: { task_id: taskId } }),
        ]);
        const hasBlockers = depCount > 0 || triggerCount > 0;
        const finalStatus = params.mode === "rascunho_operacional" ? DRAFT_STATUS : hasBlockers ? PENDING_RELEASE_STATUS : RELEASE_READY_STATUS;
        await tx.projectTask.update({ where: { id: taskId }, data: { status: finalStatus } });
        await tx.taskReleaseEvent.create({
          data: {
            task_id: taskId,
            actor_user_id: params.requestedByUserId,
            event_type: "gate_created",
            description: "Tarefa materializada a partir da proposta aprovada da IA de Lançamento.",
            metadata_json: JSON.stringify({ mode: params.mode, has_blockers: hasBlockers }),
          },
        });
      }

      // 7) Registro da materialização em si.
      const summary = summarizePlan(plan, titleToTaskId);
      const materialization = await tx.launchMaterialization.create({
        data: {
          session_id: session.id,
          version_id: params.versionId,
          mode: params.mode,
          requested_by_user_id: params.requestedByUserId,
          client_action_id: params.clientActionId,
          created_task_ids_json: JSON.stringify(createdTaskIds),
          summary_json: JSON.stringify(summary),
        },
      });
      await tx.projectTask.updateMany({ where: { id: { in: createdTaskIds } }, data: { launch_materialization_id: materialization.id } });

      return { materialization, createdTaskIds, summary };
    });

    return { materialization: result.materialization, createdTaskIds: result.createdTaskIds, summary: result.summary, duplicate: false };
  } catch (e: any) {
    if (e?.code === "P2002") {
      const raced = await db.launchMaterialization.findUnique({ where: { client_action_id: params.clientActionId } });
      if (raced) return asDuplicateResult(raced);
      const racedByVersion = await db.launchMaterialization.findUnique({ where: { version_id: params.versionId } });
      if (racedByVersion) return asDuplicateResult(racedByVersion);
    }
    throw e;
  }
}

/** Resumo pra confirmação ANTES de materializar de fato — nunca cria nada, só calcula. */
export function previewMaterializationSummary(plan: LaunchPlan) {
  const titleToTaskId = new Map(plan.tasks.map((t) => [t.title, t.title]));
  return summarizePlan(plan, titleToTaskId);
}

export { LaunchSessionClosedError };
