// ─── Nomad Auto-Selection Service ────────────────────────────────────────────
// Finds the best qualified nomad for a released task and assigns it.
// Called fire-and-forget from the /release endpoint.
//
// Algorithm:
//   1. Load task with category_snapshot, area, and catalog_task context.
//   2. PRIMARY: Find NomadeHabilidade records matching area/category/product
//      where ativo=true, disponibilidade="disponivel", nomade.status="ativo".
//   3. FALLBACK: If no NomadeHabilidade found, use legacy Qualification model.
//   4. Sort candidates by nota_media (NomadeHabilidade) or performance_avg_rating.
//   5a. Found → update task: nomade_responsavel_id, status = EM_EXECUCAO.
//   5b. Not found → update task: status = AGUARDANDO_NOMADE + create SystemAlert.
//   6. Always write TaskAssignmentHistory.

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
      catalog_task: {
        select: {
          category: true,
          name: true,
        },
      },
      project_product: {
        select: {
          product: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Guard: only proceed if still in the releasable state
  if (
    task.status !== "LIBERADA_PARA_EXECUCAO" &&
    task.status !== "AGUARDANDO_NOMADE"
  ) {
    return { status: "atribuido", candidates_evaluated: 0 };
  }

  const category = task.category_snapshot ?? task.catalog_task?.category ?? task.project_product?.product?.category ?? "";
  const area = category; // use category as area context (no separate area field on Product/CatalogTask)
  const productName = task.name_snapshot ?? task.catalog_task?.name ?? task.project_product?.product?.name ?? "";

  // ─── 2. PRIMARY: NomadeHabilidade ────────────────────────────────────────
  interface NomadeCandidate {
    id: string;
    name: string;
    nota: number;
    tasks_completed: number;
  }

  let uniqueCandidates: NomadeCandidate[] = [];
  let usedSource: "habilidade" | "qualification" = "habilidade";

  const buildAreaFilter = () => {
    const ors: object[] = [];
    if (area) ors.push({ area: { contains: area } });
    if (category) ors.push({ categoria_produto: { contains: category } });
    if (productName) ors.push({ categoria_produto: { contains: productName } });
    return ors.length > 0 ? { OR: ors } : {};
  };

  const habilidades = await prisma.nomadeHabilidade.findMany({
    where: {
      ativo: true,
      disponibilidade: "disponivel",
      ...buildAreaFilter(),
      nomade: { status: "ativo" },
    },
    include: {
      nomade: {
        select: {
          id: true,
          name: true,
          status: true,
          performance_avg_rating: true,
          tasks_completed_total: true,
        },
      },
    },
  });

  if (habilidades.length > 0) {
    // Deduplicate by nomade_id, keeping highest nota_media
    const nomadeMap = new Map<string, NomadeCandidate>();
    for (const h of habilidades) {
      const existing = nomadeMap.get(h.nomade_id);
      if (!existing || h.nota_media > existing.nota) {
        nomadeMap.set(h.nomade_id, {
          id: h.nomade.id,
          name: h.nomade.name,
          nota: h.nota_media > 0 ? h.nota_media : h.nomade.performance_avg_rating,
          tasks_completed: h.nomade.tasks_completed_total,
        });
      }
    }
    uniqueCandidates = Array.from(nomadeMap.values());
    usedSource = "habilidade";
  }

  // ─── 3. FALLBACK: legacy Qualification ───────────────────────────────────
  if (uniqueCandidates.length === 0 && category) {
    usedSource = "qualification";
    const qualifications = await prisma.qualification.findMany({
      where: {
        status: "habilitado",
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
          },
        },
      },
    });

    const active = qualifications.filter((q) => q.nomade.status === "ativo").map((q) => q.nomade);
    const seen = new Set<string>();
    const uniq = active.filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
    uniqueCandidates = uniq.map((n) => ({
      id: n.id,
      name: n.name,
      nota: n.performance_avg_rating,
      tasks_completed: n.tasks_completed_total,
    }));
  }

  // 4. Sort by nota DESC, tasks DESC
  uniqueCandidates.sort((a, b) => {
    if (b.nota !== a.nota) return b.nota - a.nota;
    return b.tasks_completed - a.tasks_completed;
  });

  const best = uniqueCandidates[0] ?? null;

  const detalhes = JSON.stringify({
    area_searched: area,
    category_searched: category,
    source: usedSource,
    candidates_evaluated: uniqueCandidates.length,
    top_candidates: uniqueCandidates.slice(0, 5).map((n) => ({
      id: n.id,
      name: n.name,
      nota: n.nota,
    })),
  });

  if (best) {
    // 5a. Assign nomad → EM_EXECUCAO
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
        nota_nomade: best.nota,
        automatico: true,
        resultado: "atribuido",
        detalhes,
      },
    });

    return {
      status: "atribuido",
      nomade_id: best.id,
      nomade_name: best.name,
      nota: best.nota,
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
