// ─── Leader Auto-Assignment Service ──────────────────────────────────────────
// Finds the correct leader for a task entering qualification and assigns it.
// Called fire-and-forget when a task status transitions to PARA_QUALIFICACAO.
//
// Algorithm:
//   1. Load task → get category_snapshot (and product name from catalog_task).
//   2. Find active LiderArea records where area_nome or categorias_permitidas
//      matches the task's category/product.
//   3. Sort candidates:
//      a. First active lider with the matching area.
//      b. If tie → lider with fewer open tasks (menor carga).
//   4a. Found → update task: lider_responsavel_id.
//   4b. Not found → create SystemAlert and log.

import { prisma } from "./prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiderAssignmentResult {
  status: "atribuido" | "sem_lider_disponivel";
  lider_user_id?: string;
  lider_name?: string;
  area_match?: string;
  candidates_evaluated?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a JSON array string from the DB (LiderArea.categorias_permitidas, etc.).
 * Returns empty array on failure.
 */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s) => String(s).trim()) : [];
  } catch {
    // fallback: comma-separated
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

/**
 * Case-insensitive match between a value and an array of allowed values.
 */
function matchesAny(value: string, allowed: string[]): boolean {
  const v = value.toLowerCase();
  return allowed.some((a) => a.toLowerCase() === v || v.includes(a.toLowerCase()) || a.toLowerCase().includes(v));
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function atribuirLiderParaTarefa(
  taskId: string,
): Promise<LiderAssignmentResult> {
  // 1. Load task with product/category context
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      category_snapshot: true,
      name_snapshot: true,
      lider_responsavel_id: true,
      catalog_task: {
        select: {
          category: true,
          name: true,
        },
      },
      project_product: {
        select: {
          product_name_snapshot: true,
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

  if (!task) throw new Error(`Task not found: ${taskId}`);

  // If already assigned, skip
  if (task.lider_responsavel_id) {
    return { status: "atribuido", lider_user_id: task.lider_responsavel_id };
  }

  // Collect all searchable context: area, category, product name
  const searchTerms: string[] = [];

  if (task.category_snapshot) searchTerms.push(task.category_snapshot);
  if (task.catalog_task?.category) searchTerms.push(task.catalog_task.category);
  if (task.project_product?.product?.category) searchTerms.push(task.project_product.product.category);

  // 2. Find all active leader areas
  const liderAreas = await prisma.liderArea.findMany({
    where: { ativo: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
        },
      },
    },
  });

  // 3. Match leaders to task context
  interface Candidate {
    user_id: string;
    name: string;
    area_match: string;
    open_tasks: number;
  }
  const candidates: Candidate[] = [];

  for (const liderArea of liderAreas) {
    // Skip if user is not active or not a lider/admin
    if (!liderArea.user.is_active) continue;
    if (liderArea.user.role !== "lider" && liderArea.user.role !== "admin") continue;

    const allowedCats = parseJsonArray(liderArea.categorias_permitidas);
    const allowedProds = parseJsonArray(liderArea.produtos_permitidos);

    // Check if any search term matches area_nome, categorias, or produtos
    const matchedBy =
      searchTerms.some((t) => matchesAny(t, [liderArea.area_nome])) ||
      (allowedCats.length > 0 && searchTerms.some((t) => matchesAny(t, allowedCats))) ||
      (allowedProds.length > 0 && searchTerms.some((t) => matchesAny(t, allowedProds)));

    if (matchedBy) {
      // Count current open tasks for this leader
      const open_tasks = await prisma.projectTask.count({
        where: {
          lider_responsavel_id: liderArea.user_id,
          status: {
            in: ["PARA_QUALIFICACAO", "LANCAMENTO_EM_REVISAO", "EM_APROVACAO_AGENCIA", "EM_APROVACAO_CLIENTE"],
          },
        },
      });

      candidates.push({
        user_id: liderArea.user_id,
        name: liderArea.user.name,
        area_match: liderArea.area_nome,
        open_tasks,
      });
    }
  }

  // Deduplicate by user_id (a leader can have multiple areas)
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    if (seen.has(c.user_id)) return false;
    seen.add(c.user_id);
    return true;
  });

  // Sort: menor carga de tarefas abertas first
  unique.sort((a, b) => a.open_tasks - b.open_tasks);

  const best = unique[0] ?? null;

  const detalhes = JSON.stringify({
    search_terms: searchTerms,
    candidates_evaluated: unique.length,
    top_candidates: unique.slice(0, 5).map((c) => ({
      user_id: c.user_id,
      name: c.name,
      area: c.area_match,
      open_tasks: c.open_tasks,
    })),
  });

  if (best) {
    // 4a. Assign leader
    await prisma.projectTask.update({
      where: { id: taskId },
      data: { lider_responsavel_id: best.user_id },
    });

    return {
      status: "atribuido",
      lider_user_id: best.user_id,
      lider_name: best.name,
      area_match: best.area_match,
      candidates_evaluated: unique.length,
    };
  } else {
    // 4b. No leader found → create alert
    await prisma.systemAlert.create({
      data: {
        type: "lider_nao_encontrado",
        title: "Líder não encontrado para tarefa",
        message: `A tarefa "${task.title}" (${taskId}) entrou para qualificação mas nenhum líder ativo está configurado para a área/categoria. Busca: ${searchTerms.join(", ") || "(sem contexto)"}`,
        severity: "warning",
        entity_type: "project_task",
        entity_id: taskId,
      },
    });

    return {
      status: "sem_lider_disponivel",
      candidates_evaluated: 0,
    };
  }
}
