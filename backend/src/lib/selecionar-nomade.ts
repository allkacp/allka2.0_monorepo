// ─── Nomad Auto-Selection Service ────────────────────────────────────────────
// Finds the best qualified nomad for a released task and assigns it.
// Called fire-and-forget from the /release endpoint.
//
// Algorithm:
//   1. Load task with category_snapshot and name_snapshot.
//   2. Find Qualifications where:
//        status = "habilitado"
//        category matches task.category_snapshot (case-insensitive)
//        associated Nomade.status = "ativo"
//   3. Sort candidates by performance_avg_rating DESC, tasks_completed_total DESC.
//   4a. Found → update task: nomade_responsavel_id, status = EM_EXECUCAO, data_inicio_execucao.
//   4b. Not found → update task: status = AGUARDANDO_NOMADE + create SystemAlert.
//   5. Always write TaskAssignmentHistory.

import { prisma } from "./prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectionResult {
  status: "atribuido" | "sem_nomade_disponivel";
  nomade_id?: string;
  nomade_name?: string;
  nota?: number;
  candidates_evaluated?: number;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function selecionarNomadeParaTarefa(
  taskId: string,
): Promise<SelectionResult> {
  // 1. Load task
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      category_snapshot: true,
      name_snapshot: true,
      catalog_task_id: true,
    },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Guard: only proceed if still in the releasable state
  // (could have been manually assigned between fire-and-forget and execution)
  if (
    task.status !== "LIBERADA_PARA_EXECUCAO" &&
    task.status !== "AGUARDANDO_NOMADE"
  ) {
    return { status: "atribuido", candidates_evaluated: 0 };
  }

  const category = task.category_snapshot ?? "";

  // 2. Find qualified nomads for the category
  //    - Qualification.status = "habilitado"
  //    - category match (case-insensitive using SQLite LIKE)
  //    - Nomade.status = "ativo"
  const qualifications = await prisma.qualification.findMany({
    where: {
      status: "habilitado",
      // Case-insensitive match — SQLite LIKE is case-insensitive for ASCII
      category: { contains: category.toLowerCase() },
    },
    include: {
      nomade: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          performance_avg_rating: true,
          tasks_completed_total: true,
          areas_of_interest: true,
        },
      },
    },
  });

  // 3. Filter: nomad must be active
  const activeCandidates = qualifications
    .filter((q) => q.nomade.status === "ativo")
    .map((q) => q.nomade);

  // Deduplicate (a nomad can have multiple qualifications in the same category)
  const seen = new Set<string>();
  const uniqueCandidates = activeCandidates.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  // 4. Sort by rating DESC, tasks_completed DESC
  uniqueCandidates.sort((a, b) => {
    if (b.performance_avg_rating !== a.performance_avg_rating) {
      return b.performance_avg_rating - a.performance_avg_rating;
    }
    return b.tasks_completed_total - a.tasks_completed_total;
  });

  const best = uniqueCandidates[0] ?? null;

  const detalhes = JSON.stringify({
    category_searched: category,
    candidates_evaluated: uniqueCandidates.length,
    top_candidates: uniqueCandidates.slice(0, 5).map((n) => ({
      id: n.id,
      name: n.name,
      rating: n.performance_avg_rating,
      tasks: n.tasks_completed_total,
    })),
  });

  if (best) {
    // 4a. Assign nomad → EM_EXECUCAO
    await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        nomade_responsavel_id: best.id,
        status: "EM_EXECUCAO",
        data_inicio_execucao: new Date(),
      },
    });

    await prisma.taskAssignmentHistory.create({
      data: {
        project_task_id: taskId,
        nomade_id: best.id,
        criterio: "nota_media",
        nota_nomade: best.performance_avg_rating,
        automatico: true,
        resultado: "atribuido",
        detalhes,
      },
    });

    return {
      status: "atribuido",
      nomade_id: best.id,
      nomade_name: best.name,
      nota: best.performance_avg_rating,
      candidates_evaluated: uniqueCandidates.length,
    };
  } else {
    // 4b. No nomad available → AGUARDANDO_NOMADE
    await prisma.projectTask.update({
      where: { id: taskId },
      data: { status: "AGUARDANDO_NOMADE" },
    });

    await prisma.taskAssignmentHistory.create({
      data: {
        project_task_id: taskId,
        nomade_id: null,
        criterio: "nota_media",
        nota_nomade: null,
        automatico: true,
        resultado: "sem_nomade_disponivel",
        detalhes,
      },
    });

    await prisma.systemAlert.create({
      data: {
        type: "nomade_nao_encontrado",
        title: "Tarefa aguardando nômade",
        message: `Nenhum nômade habilitado encontrado para "${task.title}"${category ? ` (categoria: ${category})` : ""}. A tarefa foi movida para AGUARDANDO_NOMADE.`,
        severity: "warning",
        entity_type: "project_task",
        entity_id: taskId,
      },
    });

    return {
      status: "sem_nomade_disponivel",
      candidates_evaluated: 0,
    };
  }
}
