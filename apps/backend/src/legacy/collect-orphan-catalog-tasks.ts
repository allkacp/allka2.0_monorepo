// Fotografia COMPLEMENTAR de tarefas de catálogo ÓRFÃS — bloco aditivo,
// nunca substitui nem duplica o lote oficial de Produtos já selado.
//
// Achado na auditoria pós-snapshot (2026-09-11): o coletor de produtos
// (collectProductSnapshot, importer.ts) só grava uma CatalogTask quando ela
// chega até ele por um Product → ProductCatalogTask → CatalogTask real (a
// forma como o schema de fato relaciona as duas entidades). 83 das 335
// CatalogTask do banco real NUNCA tiveram esse vínculo (`product_links`
// vazio) — não são lixo/fixture: todas têm `legacy_id` preenchido (vieram
// do import histórico da plataforma anterior, mesmo lote de importação —
// created_at idêntico até o minuto) e 2 delas são referenciadas DE VERDADE
// por ProjectTask.catalog_task_id (usadas em execução real), mesmo sem
// nunca terem sido anexadas a um produto.
//
// Detecção por IDENTIDADE HISTÓRICA (filtro relacional Prisma
// `product_links: { none: {} }`), nunca por lista fixa de 83 ids — se uma
// tarefa ganhar vínculo de produto no futuro, o coletor de produtos passa a
// cobri-la e ela sai naturalmente deste filtro na próxima coleta.
//
// Nenhuma relação de especialidade é criada: auditado no schema real —
// CatalogTask não tem FK para Specialty (nem o contrário), e o próprio
// coletor de produtos já NUNCA criou essa relação (calcula
// `specialtyCategories` e descarta com `void`) — mesma disciplina desta
// base de nunca inventar relação sem FK real (ver collect-campaigns.ts).
//
// Relação real preservada: para as tarefas que JÁ são referenciadas por
// ProjectTask.catalog_task_id (FK real), cria `referenced_by_project_task`
// — o destino pode estar em OUTRO lote (projetos/execução, já selado);
// isso é tolerado por desenho (to_record_id fica NULL se não resolvido no
// MESMO lote — mesmo padrão já usado pela relação retroativa
// commission_from_campaign no bloco financeiro).
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { isoDates, safeJsonParse, type RawRecord, type RawRelation, type SnapshotCollection } from "./importer";
import { paginate } from "./pagination";

const PAGE_SIZE = 200;

export interface CollectOrphanCatalogTasksOptions {
  pageSize?: number;
}

export async function collectOrphanCatalogTasksSnapshot(
  db: OperationalPrisma,
  opts: CollectOrphanCatalogTasksOptions = {},
): Promise<SnapshotCollection> {
  const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : PAGE_SIZE;
  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  await paginate(
    (skip, take) =>
      db.catalogTask.findMany({
        where: { product_links: { none: {} } },
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          subcategory: true,
          task_type: true,
          description: true,
          objective: true,
          default_deadline_days: true,
          default_priority: true,
          complexity: true,
          estimated_hours: true,
          responsible_type: true,
          requires_access: true,
          requires_briefing: true,
          requires_files: true,
          steps: true,
          checklist: true,
          briefing_questions: true,
          required_files: true,
          execution_rules: true,
          conclusion_rules: true,
          status: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const taskIds = page.map((ct) => ct.id);
      const referencingProjectTasks = await db.projectTask.findMany({
        where: { catalog_task_id: { in: taskIds } },
        select: { id: true, catalog_task_id: true },
      });
      const referencingByTaskId = new Map<string, string[]>();
      for (const pt of referencingProjectTasks) {
        if (!pt.catalog_task_id) continue;
        referencingByTaskId.set(pt.catalog_task_id, [...(referencingByTaskId.get(pt.catalog_task_id) ?? []), pt.id]);
      }

      for (const ct of page) {
        records.push({
          entity_type: "catalog_task",
          source_table: "catalog_tasks",
          original_id: ct.id,
          original_code: ct.code,
          title: ct.name,
          subtitle: ct.objective ?? ct.description ?? null,
          original_status: ct.status ?? (ct.is_active ? "ativa" : "inativa"),
          dates: isoDates(ct),
          content: {
            id: ct.id,
            code: ct.code,
            name: ct.name,
            category: ct.category,
            subcategory: ct.subcategory,
            task_type: ct.task_type,
            description: ct.description,
            objective: ct.objective,
            default_deadline_days: ct.default_deadline_days,
            default_priority: ct.default_priority,
            complexity: ct.complexity,
            estimated_hours: ct.estimated_hours,
            responsible_type: ct.responsible_type,
            requires_access: ct.requires_access,
            requires_briefing: ct.requires_briefing,
            requires_files: ct.requires_files,
            steps: safeJsonParse(ct.steps),
            checklist: safeJsonParse(ct.checklist),
            briefing_questions: safeJsonParse(ct.briefing_questions),
            required_files: safeJsonParse(ct.required_files),
            execution_rules: safeJsonParse(ct.execution_rules),
            conclusion_rules: safeJsonParse(ct.conclusion_rules),
            status: ct.status,
            is_active: ct.is_active,
            // Nunca coberta por produto — marca explícita, para nunca ser
            // confundida com uma tarefa vinculada quando lida no Legado.
            orphan_without_product_link: true,
          },
          search_category: ct.category ?? null,
          search_active: ct.is_active,
        });

        for (const projectTaskId of referencingByTaskId.get(ct.id) ?? []) {
          relations.push({
            from_original_id: ct.id,
            from_entity_type: "catalog_task",
            to_original_id: projectTaskId,
            to_entity_type: "project_task",
            relation_type: "referenced_by_project_task",
            description: null,
          });
        }
      }
    },
  );

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}
