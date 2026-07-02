/**
 * seed-demo-project-tasks.ts
 * Atualiza as ProjectTasks e ProjectTaskStages existentes com dados coerentes de demo.
 *
 * IDEMPOTENTE: rodar N vezes produz o mesmo resultado.
 * NÃO cria tarefas nem etapas duplicadas.
 * NÃO altera: Project, ProjectProduct, BriefingAnswers, Attachments, Invoices, Payments.
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-tasks -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-tasks
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Hash determinístico ────────────────────────────────────────────────────────
function dh(idx: number, seed: number = 1): number {
  return ((idx * 2654435761 + seed * 40503) >>> 0);
}
function pick<T>(arr: T[], idx: number, seed: number = 1): T {
  return arr[dh(idx, seed) % arr.length];
}
function inRange(idx: number, min: number, max: number, seed: number = 1): number {
  if (min >= max) return min;
  return min + (dh(idx, seed) % (max - min + 1));
}

// ── Status válidos confirmados no schema ───────────────────────────────────────
// ProjectTask.status
const TASK_STATUS = {
  PARA_LANCAMENTO: "PARA_LANCAMENTO",
  EM_LANCAMENTO: "EM_LANCAMENTO",
  LIBERADA_PARA_EXECUCAO: "LIBERADA_PARA_EXECUCAO",
  EM_EXECUCAO: "EM_EXECUCAO",
  EM_REVISAO: "EM_REVISAO",
  EM_APROVACAO: "EM_APROVACAO",
  CONCLUIDA: "CONCLUIDA",
  CANCELADA: "CANCELADA",
} as const;
type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// ProjectTaskStage.status
const STAGE_STATUS = {
  PENDENTE: "PENDENTE",
  BLOQUEADA: "BLOQUEADA",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  CONCLUIDA: "CONCLUIDA",
} as const;
type StageStatus = (typeof STAGE_STATUS)[keyof typeof STAGE_STATUS];

// ── Prioridades ────────────────────────────────────────────────────────────────
const PRIORITIES = ["low", "medium", "medium", "high", "urgent"] as const;

// ── Determinar status da tarefa ────────────────────────────────────────────────
// Regra: o status do ProjectProduct prevalece. Dentro de EM_EXECUCAO,
// distribuímos variedade usando o índice global da tarefa no projeto.
function taskStatusFor(
  ppStatus: string,
  projectStatus: string,
  taskIndexInProject: number, // 0-based, entre as tarefas deste projeto
  totalTasksInProject: number,
  globalTaskIdx: number, // índice global entre todos os tasks
): TaskStatus {
  // Produto CONCLUIDO → tarefa CONCLUIDA
  if (ppStatus === "CONCLUIDO") return TASK_STATUS.CONCLUIDA;

  // Produto PENDENTE → tarefa PARA_LANCAMENTO (exceto planning que pode ser EM_LANCAMENTO)
  if (ppStatus === "PENDENTE") {
    if (projectStatus === "planning") {
      return dh(globalTaskIdx, 5) % 3 === 0
        ? TASK_STATUS.EM_LANCAMENTO
        : TASK_STATUS.PARA_LANCAMENTO;
    }
    return TASK_STATUS.PARA_LANCAMENTO;
  }

  // Produto EM_EXECUCAO → varia por status do projeto e índice
  if (ppStatus === "EM_EXECUCAO") {
    if (projectStatus === "paused") {
      // Pausado: a maioria em EM_EXECUCAO, algumas EM_LANCAMENTO
      return dh(globalTaskIdx, 7) % 4 === 0
        ? TASK_STATUS.EM_LANCAMENTO
        : TASK_STATUS.EM_EXECUCAO;
    }

    // in-progress: variedade real para demonstrar a plataforma
    // Distribui de forma determinística em 5 buckets
    const bucket = dh(globalTaskIdx, 11) % 5;
    if (bucket === 0) return TASK_STATUS.EM_LANCAMENTO;
    if (bucket === 1) return TASK_STATUS.LIBERADA_PARA_EXECUCAO;
    if (bucket === 2) return TASK_STATUS.EM_EXECUCAO;
    if (bucket === 3) return TASK_STATUS.EM_REVISAO;
    return TASK_STATUS.EM_APROVACAO;
  }

  // Fallback
  return TASK_STATUS.PARA_LANCAMENTO;
}

// ── Datas da tarefa ────────────────────────────────────────────────────────────
function datesForTask(
  status: TaskStatus,
  projectStartDate: Date | null,
  projectEndDate: Date | null,
  taskIdx: number,
): {
  start_date: Date | null;
  due_date: Date | null;
  completed_at: Date | null;
  data_lancamento: Date | null;
  data_liberacao_execucao: Date | null;
  data_inicio_execucao: Date | null;
  data_conclusao: Date | null;
} {
  const base = projectStartDate ?? new Date("2025-06-01");
  const end = projectEndDate ?? new Date(base.getTime() + 90 * 86400000);

  const offsetDays = inRange(taskIdx, 0, 15, 13);
  const start = new Date(base);
  start.setDate(start.getDate() + offsetDays);

  const durationDays = inRange(taskIdx, 20, 60, 17);
  const due = new Date(start);
  due.setDate(due.getDate() + durationDays);

  const nullDates = {
    start_date: null,
    due_date: null,
    completed_at: null,
    data_lancamento: null,
    data_liberacao_execucao: null,
    data_inicio_execucao: null,
    data_conclusao: null,
  };

  switch (status) {
    case TASK_STATUS.PARA_LANCAMENTO:
      return { ...nullDates, due_date: due };

    case TASK_STATUS.EM_LANCAMENTO:
      return {
        ...nullDates,
        due_date: due,
        data_lancamento: start,
      };

    case TASK_STATUS.LIBERADA_PARA_EXECUCAO: {
      const libDays = inRange(taskIdx, 2, 8, 19);
      const lib = new Date(start);
      lib.setDate(lib.getDate() + libDays);
      return {
        ...nullDates,
        due_date: due,
        data_lancamento: start,
        data_liberacao_execucao: lib,
      };
    }

    case TASK_STATUS.EM_EXECUCAO:
    case TASK_STATUS.EM_REVISAO: {
      const libDays = inRange(taskIdx, 2, 5, 19);
      const lib = new Date(start);
      lib.setDate(lib.getDate() + libDays);
      const execStart = new Date(lib);
      execStart.setDate(execStart.getDate() + inRange(taskIdx, 1, 3, 23));
      return {
        ...nullDates,
        start_date: execStart,
        due_date: due,
        data_lancamento: start,
        data_liberacao_execucao: lib,
        data_inicio_execucao: execStart,
      };
    }

    case TASK_STATUS.EM_APROVACAO: {
      const libDays = inRange(taskIdx, 2, 5, 19);
      const lib = new Date(start);
      lib.setDate(lib.getDate() + libDays);
      const execStart = new Date(lib);
      execStart.setDate(execStart.getDate() + inRange(taskIdx, 1, 3, 23));
      return {
        ...nullDates,
        start_date: execStart,
        due_date: due,
        data_lancamento: start,
        data_liberacao_execucao: lib,
        data_inicio_execucao: execStart,
      };
    }

    case TASK_STATUS.CONCLUIDA: {
      const libDays = 2;
      const lib = new Date(start);
      lib.setDate(lib.getDate() + libDays);
      const execStart = new Date(lib);
      execStart.setDate(execStart.getDate() + 1);
      const conclusao = projectEndDate
        ? new Date(projectEndDate)
        : new Date(execStart.getTime() + 21 * 86400000);
      return {
        start_date: execStart,
        due_date: conclusao,
        completed_at: conclusao,
        data_lancamento: start,
        data_liberacao_execucao: lib,
        data_inicio_execucao: execStart,
        data_conclusao: conclusao,
      };
    }

    default:
      return nullDates;
  }
}

// ── Status das etapas por status da tarefa ────────────────────────────────────
// Regra: etapas são ordenadas por `ordem`. A função recebe a lista de ordens
// e retorna o status de cada uma.
function stageStatusesFor(
  taskStatus: TaskStatus,
  stageOrders: number[], // ordens das etapas, em ordem crescente
): StageStatus[] {
  const n = stageOrders.length;
  if (n === 0) return [];

  switch (taskStatus) {
    case TASK_STATUS.PARA_LANCAMENTO:
      // Todas pendentes (primeira PENDENTE, demais BLOQUEADA)
      return stageOrders.map((_, i) =>
        i === 0 ? STAGE_STATUS.PENDENTE : STAGE_STATUS.BLOQUEADA,
      );

    case TASK_STATUS.EM_LANCAMENTO:
      // Primeira em andamento, demais bloqueadas
      return stageOrders.map((_, i) =>
        i === 0 ? STAGE_STATUS.EM_ANDAMENTO : STAGE_STATUS.BLOQUEADA,
      );

    case TASK_STATUS.LIBERADA_PARA_EXECUCAO:
      // 1 concluída, próxima EM_ANDAMENTO, demais BLOQUEADA
      return stageOrders.map((_, i) => {
        if (i < 1) return STAGE_STATUS.CONCLUIDA;
        if (i === 1) return STAGE_STATUS.EM_ANDAMENTO;
        return STAGE_STATUS.BLOQUEADA;
      });

    case TASK_STATUS.EM_EXECUCAO: {
      // ~metade concluída, uma EM_ANDAMENTO, resto BLOQUEADA
      const done = Math.max(1, Math.floor(n * 0.45));
      return stageOrders.map((_, i) => {
        if (i < done) return STAGE_STATUS.CONCLUIDA;
        if (i === done) return STAGE_STATUS.EM_ANDAMENTO;
        return STAGE_STATUS.BLOQUEADA;
      });
    }

    case TASK_STATUS.EM_REVISAO: {
      // ~65% concluída, uma EM_ANDAMENTO, resto BLOQUEADA
      const done = Math.max(1, Math.floor(n * 0.65));
      return stageOrders.map((_, i) => {
        if (i < done) return STAGE_STATUS.CONCLUIDA;
        if (i === done) return STAGE_STATUS.EM_ANDAMENTO;
        return STAGE_STATUS.BLOQUEADA;
      });
    }

    case TASK_STATUS.EM_APROVACAO: {
      // Quase todas concluídas (última EM_ANDAMENTO)
      const done = Math.max(1, n - 1);
      return stageOrders.map((_, i) => {
        if (i < done) return STAGE_STATUS.CONCLUIDA;
        return STAGE_STATUS.EM_ANDAMENTO;
      });
    }

    case TASK_STATUS.CONCLUIDA:
    case TASK_STATUS.CANCELADA:
      // Todas concluídas
      return stageOrders.map(() => STAGE_STATUS.CONCLUIDA);

    default:
      return stageOrders.map((_, i) =>
        i === 0 ? STAGE_STATUS.PENDENTE : STAGE_STATUS.BLOQUEADA,
      );
  }
}

// ── Observações demo por status ────────────────────────────────────────────────
const OBS_BY_STATUS: Record<string, string[]> = {
  PARA_LANCAMENTO: [
    "Aguardando início do lançamento conforme cronograma.",
    "Tarefa prevista para início na próxima semana.",
  ],
  EM_LANCAMENTO: [
    "Briefing em análise pela equipe.",
    "Documentação de escopo em revisão.",
  ],
  LIBERADA_PARA_EXECUCAO: [
    "Briefing aprovado. Aguardando nômade iniciar.",
    "Escopo validado. Pronto para execução.",
  ],
  EM_EXECUCAO: [
    "Em execução conforme cronograma.",
    "Produção em andamento. Próxima revisão agendada.",
  ],
  EM_REVISAO: [
    "Entrega inicial submetida. Em revisão interna.",
    "Aguardando feedback da equipe de qualidade.",
  ],
  EM_APROVACAO: [
    "Revisão concluída. Aguardando aprovação do cliente.",
    "Material final enviado para aprovação.",
  ],
  CONCLUIDA: [
    "Tarefa concluída e aprovada pelo cliente.",
    "Entregável aceito. Projeto encerrado com sucesso.",
  ],
};

function obsForStatus(status: TaskStatus, idx: number): string {
  const opts = OBS_BY_STATUS[status];
  if (!opts) return "";
  return pick(opts, idx, 29);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n========== SEED: Demo Project Tasks (${DRY_RUN ? "DRY-RUN" : "APPLY"}) ==========\n`,
  );

  // ── Buscar líderes disponíveis (users com agency_admin ou admin) ──────────
  const liderUsers = await prisma.user.findMany({
    where: { role: { in: ["agency_admin", "admin"] }, is_active: true },
    select: { id: true, name: true },
    take: 8,
  });

  // ── Buscar nômades ativos ─────────────────────────────────────────────────
  const nomades = await prisma.nomade.findMany({
    where: { status: "ativo" },
    select: { id: true, name: true },
  });

  console.log(`Líderes disponíveis: ${liderUsers.length}`);
  console.log(`Nômades ativos: ${nomades.length}`);

  // ── Buscar todos os projetos com seus produtos e tarefas ──────────────────
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      start_date: true,
      end_date: true,
      products: {
        select: {
          id: true,
          status: true,
          product_name_snapshot: true,
          tasks: {
            select: {
              id: true,
              status: true,
              title: true,
              priority: true,
              due_date: true,
              start_date: true,
              completed_at: true,
              data_lancamento: true,
              data_liberacao_execucao: true,
              data_inicio_execucao: true,
              data_conclusao: true,
              lider_responsavel_id: true,
              nomade_responsavel_id: true,
              observations: true,
              stages: {
                select: { id: true, status: true, ordem: true },
                orderBy: { ordem: "asc" },
              },
            },
            orderBy: { sort_order: "asc" },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Projetos: ${projects.length}`);

  // ── Contagens antes ────────────────────────────────────────────────────────
  const beforeTaskCount = await prisma.projectTask.count();
  const beforeStageCount = await prisma.projectTaskStage.count();

  let taskUpdated = 0;
  let taskSkipped = 0;
  let stageUpdated = 0;
  let stageSkipped = 0;

  const taskStatusDist: Record<string, number> = {};
  const stageStatusDist: Record<string, number> = {};

  const SAMPLE_PROJECTS = 5;
  let sampleCount = 0;

  // ── Índice global de tarefa para hash ─────────────────────────────────────
  let globalTaskIdx = 0;

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi];
    const showSample = sampleCount < SAMPLE_PROJECTS;

    if (showSample) {
      console.log(
        `\n  Projeto ${pi + 1}: "${project.title}" [${project.status}]`,
      );
      sampleCount++;
    }

    // Índice local da tarefa dentro deste projeto (para lógica de variedade)
    let taskIndexInProject = 0;
    const totalTasksInProject = project.products.reduce(
      (s, pp) => s + pp.tasks.length,
      0,
    );

    for (const pp of project.products) {
      for (const task of pp.tasks) {
        const targetStatus = taskStatusFor(
          pp.status,
          project.status,
          taskIndexInProject,
          totalTasksInProject,
          globalTaskIdx,
        );

        // Acumula distribuição
        taskStatusDist[targetStatus] = (taskStatusDist[targetStatus] ?? 0) + 1;

        const priority = pick(PRIORITIES, globalTaskIdx, 31);

        // Atribuição de líder (apenas para tarefas em progresso/concluídas)
        const needsLider = [
          TASK_STATUS.LIBERADA_PARA_EXECUCAO,
          TASK_STATUS.EM_EXECUCAO,
          TASK_STATUS.EM_REVISAO,
          TASK_STATUS.EM_APROVACAO,
          TASK_STATUS.CONCLUIDA,
        ].includes(targetStatus as TaskStatus);

        const lider =
          needsLider && liderUsers.length > 0
            ? pick(liderUsers, globalTaskIdx, 37)
            : null;

        // Atribuição de nômade (apenas tarefas liberadas/em execução/aprovadas/concluídas)
        const needsNomade = [
          TASK_STATUS.LIBERADA_PARA_EXECUCAO,
          TASK_STATUS.EM_EXECUCAO,
          TASK_STATUS.EM_REVISAO,
          TASK_STATUS.EM_APROVACAO,
          TASK_STATUS.CONCLUIDA,
        ].includes(targetStatus as TaskStatus);

        const nomade =
          needsNomade && nomades.length > 0
            ? pick(nomades, globalTaskIdx, 41)
            : null;

        const dates = datesForTask(
          targetStatus,
          project.start_date,
          project.end_date,
          globalTaskIdx,
        );

        const observations = obsForStatus(targetStatus, globalTaskIdx);

        // Verifica se task precisa ser atualizada
        const taskNeedsUpdate =
          task.status !== targetStatus ||
          task.priority !== priority ||
          (task.observations ?? "") !== observations ||
          (task.lider_responsavel_id ?? null) !== (lider?.id ?? null) ||
          (task.nomade_responsavel_id ?? null) !== (nomade?.id ?? null) ||
          (task.due_date?.getTime() ?? null) !==
            (dates.due_date?.getTime() ?? null) ||
          (task.completed_at?.getTime() ?? null) !==
            (dates.completed_at?.getTime() ?? null) ||
          (task.data_conclusao?.getTime() ?? null) !==
            (dates.data_conclusao?.getTime() ?? null);

        if (taskNeedsUpdate) {
          if (showSample) {
            console.log(
              `    Task "${task.title.substring(0, 30)}" | pp:${pp.status} | ${task.status}→${targetStatus}`,
            );
          }

          if (!DRY_RUN) {
            await prisma.projectTask.update({
              where: { id: task.id },
              data: {
                status: targetStatus,
                priority,
                observations,
                lider_responsavel_id: lider?.id ?? null,
                nomade_responsavel_id: nomade?.id ?? null,
                due_date: dates.due_date,
                start_date: dates.start_date,
                completed_at: dates.completed_at,
                data_lancamento: dates.data_lancamento,
                data_liberacao_execucao: dates.data_liberacao_execucao,
                data_inicio_execucao: dates.data_inicio_execucao,
                data_conclusao: dates.data_conclusao,
              },
            });
          }
          taskUpdated++;
        } else {
          taskSkipped++;
        }

        // ── Atualizar etapas ─────────────────────────────────────────────────
        const stageOrders = task.stages.map((s) => s.ordem);
        const targetStageStatuses = stageStatusesFor(
          targetStatus,
          stageOrders,
        );

        for (let si = 0; si < task.stages.length; si++) {
          const stage = task.stages[si];
          const targetSS = targetStageStatuses[si] ?? STAGE_STATUS.BLOQUEADA;

          stageStatusDist[targetSS] = (stageStatusDist[targetSS] ?? 0) + 1;

          if (stage.status !== targetSS) {
            if (!DRY_RUN) {
              await prisma.projectTaskStage.update({
                where: { id: stage.id },
                data: { status: targetSS },
              });
            }
            stageUpdated++;
          } else {
            stageSkipped++;
          }
        }

        taskIndexInProject++;
        globalTaskIdx++;
      }
    }
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log(`\n── Resumo ${DRY_RUN ? "(DRY-RUN)" : "(APLICADO)"} ────────────────────────────────────`);
  console.log(`  Tarefas atualizadas: ${taskUpdated}`);
  console.log(`  Tarefas sem mudança: ${taskSkipped}`);
  console.log(`  Etapas atualizadas:  ${stageUpdated}`);
  console.log(`  Etapas sem mudança:  ${stageSkipped}`);

  console.log(`\n── Distribuição de status de tarefas ────────────────────────`);
  for (const [s, c] of Object.entries(taskStatusDist).sort()) {
    console.log(`  ${s.padEnd(30)} ${c}`);
  }

  console.log(`\n── Distribuição de status de etapas ─────────────────────────`);
  for (const [s, c] of Object.entries(stageStatusDist).sort()) {
    console.log(`  ${s.padEnd(30)} ${c}`);
  }

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY-RUN: nenhuma escrita realizada.`);
    console.log(`  Remova --dry-run para aplicar.\n`);
    return;
  }

  // ── Validação pós-seed ─────────────────────────────────────────────────────
  console.log(`\n── Validação pós-seed ──────────────────────────────────────────`);

  const [afterProj, afterPP, afterPT, afterStages] = await Promise.all([
    prisma.project.count(),
    prisma.projectProduct.count(),
    prisma.projectTask.count(),
    prisma.projectTaskStage.count(),
  ]);

  console.log(`  Projetos:     before=${projects.length} after=${afterProj}`);
  console.log(`  ProjectProducts: before=90 after=${afterPP}`);
  console.log(`  ProjectTasks: before=${beforeTaskCount} after=${afterPT}`);
  console.log(`  Stages:       before=${beforeStageCount} after=${afterStages}`);

  const tasksByStatus = await prisma.projectTask.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`\n── ProjectTasks por status ──────────────────────────────────`);
  for (const r of tasksByStatus) {
    console.log(`  ${r.status.padEnd(30)} ${r._count}`);
  }

  const stagesByStatus = await prisma.projectTaskStage.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`\n── ProjectTaskStages por status ────────────────────────────`);
  for (const r of stagesByStatus) {
    console.log(`  ${r.status.padEnd(30)} ${r._count}`);
  }

  // Integridade: tarefas sem etapas
  const tasksWithoutStages = await prisma.projectTask.count({
    where: { stages: { none: {} } },
  });
  // Projetos concluídos sem tarefas concluídas
  const completedProj = await prisma.project.findMany({
    where: { status: "completed" },
    select: {
      title: true,
      products: { select: { tasks: { select: { status: true } } } },
    },
  });
  let completedOk = true;
  for (const proj of completedProj) {
    const allTasks = proj.products.flatMap((pp) => pp.tasks);
    const notDone = allTasks.filter((t) => t.status !== "CONCLUIDA").length;
    if (notDone > 0) {
      console.log(
        `  ⚠️  "${proj.title}" tem ${notDone} tarefa(s) não concluída`,
      );
      completedOk = false;
    }
  }

  console.log(`\n── Integridade ──────────────────────────────────────────────`);
  console.log(`  Tarefas sem etapas:   ${tasksWithoutStages}`);
  console.log(
    `  Projetos concluídos ok: ${completedOk ? "✅" : "⚠️ verificar acima"}`,
  );

  console.log(
    `\n✅  Seed concluído. Project/Product/Briefing/Invoices não foram alterados.\n`,
  );
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
