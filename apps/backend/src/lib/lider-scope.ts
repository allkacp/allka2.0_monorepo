import { prisma } from "./prisma";

/**
 * Categorias que um Líder pode ver, somando as áreas ativas dele.
 * `null` = admin (vê tudo). Lista vazia = nenhuma restrição configurada,
 * mesma leitura que a fila /api/lider/tasks sempre fez.
 */
export async function getLiderAllowedCategories(userId: string, userRole: string): Promise<string[] | null> {
  if (userRole === "admin") return null;
  const areas = await prisma.liderArea.findMany({
    where: { user_id: userId, ativo: true },
    select: { categorias_permitidas: true },
  });
  const cats: string[] = [];
  for (const area of areas) {
    if (area.categorias_permitidas) {
      try {
        const parsed = JSON.parse(area.categorias_permitidas);
        if (Array.isArray(parsed)) cats.push(...parsed);
      } catch {}
    }
  }
  return cats;
}

/**
 * Filtro de tarefas visíveis a um Líder: as atribuídas a ele OU as da área
 * dele (mesmo filtro de categoria da fila /api/lider/tasks). Sem isso o Líder
 * via a tarefa na fila de "Briefings para Revisar", mas o detalhe, o briefing
 * e a liberação (rotas /api/project-tasks) respondiam 404 sempre que a
 * atribuição automática de líder não encontrava ninguém.
 */
export async function liderTaskScopeWhere(userId: string): Promise<Record<string, unknown>> {
  const cats = await getLiderAllowedCategories(userId, "lider");
  if (!cats || cats.length === 0) {
    // Área sem categorias configuradas: a fila já mostra todas as tarefas.
    return { OR: [{ lider_responsavel_id: userId }, { NOT: { id: "" } }] };
  }
  return {
    OR: [
      { lider_responsavel_id: userId },
      { category_snapshot: { in: cats } },
      { product: { category: { in: cats } } },
    ],
  };
}
