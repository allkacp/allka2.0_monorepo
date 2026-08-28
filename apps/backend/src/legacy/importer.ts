// Importador OFFLINE da "Consulta da Plataforma Anterior" (sprint de
// produtos, bloco 1/6). Não é rota HTTP. Lê o banco OPERACIONAL e escreve o
// banco LEGADO (`allka_legacy`) com a credencial de escrita
// (`LEGACY_IMPORT_DATABASE_URL`), usada em nenhum outro lugar.
//
// Propriedades: dry-run, idempotência (upsert por (lote, tipo, id original)),
// checksum após sanitização, comparação origem×destino, relatório de
// divergências, nunca sobrescreve silenciosamente uma fotografia concluída.

import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { PrismaClient as LegacyPrisma } from "./generated";
import { hashPayload } from "../lib/canonical-json";
import { sanitizeForLegacy, scrubSecretValues } from "./sanitize";

export const IMPORTER_VERSION = "products-foundation-1";
export const DEFAULT_SOURCE_NAME = "[TESTE LOCAL] Fotografia de produtos anteriores";

export type LegacyEntityType =
  | "product"
  | "product_variation"
  | "product_addon"
  | "product_catalog_task"
  | "catalog_task"
  | "specialty";

interface RawRecord {
  entity_type: LegacyEntityType;
  source_table: string;
  original_id: string;
  original_code: string | null;
  title: string | null;
  subtitle: string | null;
  original_status: string | null;
  dates: Record<string, unknown>;
  content: Record<string, unknown>;
  search_category: string | null;
  search_active: boolean | null;
}

interface RawRelation {
  from_original_id: string;
  from_entity_type: LegacyEntityType;
  to_original_id: string;
  to_entity_type: LegacyEntityType | null;
  relation_type: string;
  description: string | null;
}

export interface SnapshotCollection {
  records: RawRecord[];
  relations: RawRelation[];
  sourceCounts: Record<string, number>;
}

function isoDates(row: { created_at?: Date | null; updated_at?: Date | null }): Record<string, unknown> {
  return {
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function safeJsonParse(raw: string | null | undefined): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // mantém o texto cru quando não for JSON
  }
}

/**
 * Monta a fotografia dos PRODUTOS atuais (+ variações, adicionais,
 * tarefas-modelo vinculadas, tarefas de catálogo referenciadas e
 * especialidades). Só metadados — nenhum binário.
 */
export async function collectProductSnapshot(db: OperationalPrisma): Promise<SnapshotCollection> {
  const products = await db.product.findMany({
    include: {
      variations: true,
      addons: true,
      task_links: { include: { catalog_task: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];
  const catalogTaskById = new Map<string, (typeof products)[number]["task_links"][number]["catalog_task"]>();
  const specialtyCategories = new Set<string>();

  for (const p of products) {
    const projectProductsCount = await db.projectProduct.count({ where: { product_id: p.id } });
    const paymentItemsCount = await db.paymentItem.count({ where: { product_id: p.id } });

    const content: Record<string, unknown> = {
      id: p.id,
      product_code: p.product_code,
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      category: p.category,
      tags: safeJsonParse(p.tags),
      base_price: p.base_price,
      complexity: p.complexity,
      visibility: safeJsonParse(p.visibility),
      // Imagens e portfólio APENAS como metadados/referências — nenhum binário
      // é copiado nesta etapa. Marcamos honestamente que o arquivo não está
      // disponível na fotografia.
      image_ref: p.image
        ? { reference: p.image, file_available_in_snapshot: false }
        : null,
      demonstrations_refs: Array.isArray(safeJsonParse(p.demonstrations))
        ? (safeJsonParse(p.demonstrations) as unknown[]).map((r) => ({
            reference: r,
            file_available_in_snapshot: false,
          }))
        : [],
      contract_count: p.contract_count,
      average_rating: p.average_rating,
      completion_time: p.completion_time,
      is_active: p.is_active,
      exige_aprovacao_cliente: p.exige_aprovacao_cliente,
      metadata: safeJsonParse(p.metadata),
      // Agregados úteis pra entender o produto sem varrer relações:
      counts: {
        variations: p.variations.length,
        addons: p.addons.length,
        catalog_task_links: p.task_links.length,
        used_in_project_products: projectProductsCount,
        payment_items: paymentItemsCount,
      },
    };

    records.push({
      entity_type: "product",
      source_table: "products",
      original_id: p.id,
      original_code: p.product_code ?? null,
      title: p.name,
      subtitle: p.short_description ?? p.description ?? null,
      original_status: p.is_active ? "ativo" : "inativo",
      dates: isoDates(p),
      content,
      search_category: p.category ?? null,
      search_active: p.is_active,
    });
    relations.push({
      from_original_id: p.id,
      from_entity_type: "product",
      to_original_id: p.category,
      to_entity_type: null,
      relation_type: "in_category",
      description: `Categoria "${p.category}"`,
    });
    if (p.category) specialtyCategories.add(p.category);

    for (const v of p.variations) {
      records.push({
        entity_type: "product_variation",
        source_table: "product_variations",
        original_id: v.id,
        original_code: null,
        title: v.name,
        subtitle: v.scope_description ?? v.description ?? null,
        original_status: v.is_active ? "ativo" : "inativo",
        dates: isoDates(v),
        content: {
          id: v.id,
          product_id: v.product_id,
          name: v.name,
          description: v.description,
          price: v.price,
          price_modifier: v.price_modifier,
          deadline_days: v.deadline_days,
          scope_description: v.scope_description,
          features: safeJsonParse(v.features),
          sort_order: v.sort_order,
          is_active: v.is_active,
        },
        search_category: p.category ?? null,
        search_active: v.is_active,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: v.id,
        to_entity_type: "product_variation",
        relation_type: "has_variation",
        description: v.name,
      });
    }

    for (const a of p.addons) {
      records.push({
        entity_type: "product_addon",
        source_table: "product_addons",
        original_id: a.id,
        original_code: null,
        title: a.name,
        subtitle: a.description ?? null,
        original_status: null,
        dates: isoDates({ created_at: a.created_at }),
        content: {
          id: a.id,
          product_id: a.product_id,
          name: a.name,
          description: a.description,
          price: a.price,
          category: a.category,
        },
        search_category: p.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: a.id,
        to_entity_type: "product_addon",
        relation_type: "has_addon",
        description: a.name,
      });
    }

    for (const link of p.task_links) {
      records.push({
        entity_type: "product_catalog_task",
        source_table: "product_catalog_tasks",
        original_id: link.id,
        original_code: link.catalog_task?.code ?? null,
        title: link.catalog_task?.name ?? null,
        subtitle: link.notes ?? null,
        original_status: link.is_mandatory ? "obrigatoria" : "opcional",
        dates: isoDates({ created_at: link.created_at }),
        content: {
          id: link.id,
          product_id: link.product_id,
          catalog_task_id: link.catalog_task_id,
          variation_id: link.variation_id,
          sort_order: link.sort_order,
          is_mandatory: link.is_mandatory,
          phase: link.phase,
          notes: link.notes,
        },
        search_category: p.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: link.catalog_task_id,
        to_entity_type: "catalog_task",
        relation_type: "has_catalog_task",
        description: link.catalog_task?.name ?? link.catalog_task_id,
      });
      if (link.catalog_task) catalogTaskById.set(link.catalog_task.id, link.catalog_task);
    }
  }

  // Tarefas de catálogo referenciadas (deduplicadas).
  for (const ct of catalogTaskById.values()) {
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
        // "etapas-modelo" do produto antigo vivem aqui (JSON):
        steps: safeJsonParse(ct.steps),
        checklist: safeJsonParse(ct.checklist),
        briefing_questions: safeJsonParse(ct.briefing_questions),
        required_files: safeJsonParse(ct.required_files),
        execution_rules: safeJsonParse(ct.execution_rules),
        conclusion_rules: safeJsonParse(ct.conclusion_rules),
        status: ct.status,
        is_active: ct.is_active,
      },
      search_category: ct.category ?? null,
      search_active: ct.is_active,
    });
  }

  // Especialidades (todas — são poucas e dão contexto de área).
  const specialties = await db.specialty.findMany({ orderBy: { name: "asc" } });
  for (const s of specialties) {
    records.push({
      entity_type: "specialty",
      source_table: "specialties",
      original_id: s.id,
      original_code: null,
      title: s.name,
      subtitle: s.description ?? null,
      original_status: s.is_active ? "ativa" : "inativa",
      dates: isoDates(s),
      content: {
        id: s.id,
        name: s.name,
        description: s.description,
        hourly_rate: s.hourly_rate,
        category: s.category,
        required_skills: safeJsonParse(s.required_skills),
        is_active: s.is_active,
      },
      search_category: s.category ?? null,
      search_active: s.is_active,
    });
  }
  void specialtyCategories;

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}

// ─────────────────────────── execução do import ────────────────────────────

export interface ImportOptions {
  dryRun: boolean;
  sourceName?: string;
  sourceEnvironment?: string;
  /** Reusar/continuar um lote específico. Sem isto, cria um lote novo. */
  batchId?: string;
  /** Permitir reprocessar um lote JÁ concluído (por padrão, recusa). */
  allowRefresh?: boolean;
  legacyImportUrl: string;
}

export interface EntityReconciliation {
  expected_source: number;
  imported: number;
  divergence: number;
  justification: string;
}

export interface ImportResult {
  dry_run: boolean;
  batch_id: string | null;
  source_name: string;
  status: string;
  importer_version: string;
  totals: { expected: number; imported: number; skipped_unchanged: number; changed: number; sanitized_records: number };
  reconciliation: Record<string, EntityReconciliation>;
  divergences: Array<{ entity_type: string; original_id: string; reason: string }>;
  batch_checksum: string | null;
  blocked_fields_removed_sample: string[];
}

export async function runImport(opts: ImportOptions): Promise<ImportResult> {
  const operational = new OperationalPrisma();
  const legacy = new LegacyPrisma({ datasources: { db: { url: opts.legacyImportUrl } }, log: ["warn", "error"] });

  try {
    const sourceName = opts.sourceName ?? DEFAULT_SOURCE_NAME;
    const sourceEnvironment = opts.sourceEnvironment ?? "local";
    const snapshotAt = new Date();

    const collection = await collectProductSnapshot(operational);

    // Sanitiza + checksum de cada registro (checksum SEMPRE após sanitização).
    const prepared = collection.records.map((r) => {
      const s1 = sanitizeForLegacy(r.content);
      const s2 = scrubSecretValues(s1.clean);
      const removedFields = [...s1.removedFields, ...s2.scrubbed.map((p) => `${p} (valor)`)];
      const cleanContent = s2.clean;
      return {
        raw: r,
        cleanContent,
        removedFields,
        sanitized: removedFields.length > 0,
        checksum: hashPayload(cleanContent),
      };
    });

    const expected = prepared.length;
    const blockedSample = [...new Set(prepared.flatMap((p) => p.removedFields))].slice(0, 20);
    const sanitizedRecords = prepared.filter((p) => p.sanitized).length;

    const reconcile = (): Record<string, EntityReconciliation> => {
      const out: Record<string, EntityReconciliation> = {};
      for (const [entity, expectedCount] of Object.entries(collection.sourceCounts)) {
        if (entity === "relations") continue;
        out[entity] = {
          expected_source: expectedCount,
          imported: 0,
          divergence: expectedCount,
          justification: "ainda não importado",
        };
      }
      return out;
    };

    // ── DRY-RUN ──────────────────────────────────────────────────────────
    if (opts.dryRun) {
      const rec = reconcile();
      for (const k of Object.keys(rec)) {
        rec[k].imported = rec[k].expected_source;
        rec[k].divergence = 0;
        rec[k].justification = "dry-run: seria importado";
      }
      return {
        dry_run: true,
        batch_id: null,
        source_name: sourceName,
        status: "dry_run",
        importer_version: IMPORTER_VERSION,
        totals: { expected, imported: 0, skipped_unchanged: 0, changed: 0, sanitized_records: sanitizedRecords },
        reconciliation: rec,
        divergences: [],
        batch_checksum: hashPayload(prepared.map((p) => p.checksum).sort()),
        blocked_fields_removed_sample: blockedSample,
      };
    }

    // ── Lote ─────────────────────────────────────────────────────────────
    let batch = opts.batchId
      ? await legacy.legacyImportBatch.findUnique({ where: { id: opts.batchId } })
      : null;

    if (batch && (batch.status === "completed") && !opts.allowRefresh) {
      // Nunca sobrescreve silenciosamente uma fotografia concluída.
      throw Object.assign(
        new Error(
          `O lote ${batch.id} já está concluído. Rode com --allow-refresh para comparar/atualizar, ou crie um lote novo.`,
        ),
        { code: "batch_completed" },
      );
    }

    if (!batch) {
      batch = await legacy.legacyImportBatch.create({
        data: {
          source_name: sourceName,
          source_environment: sourceEnvironment,
          snapshot_at: snapshotAt,
          importer_version: IMPORTER_VERSION,
          expected_count: expected,
          status: "running",
        },
      });
    } else {
      await legacy.legacyImportBatch.update({
        where: { id: batch.id },
        data: { status: "running", expected_count: expected, importer_version: IMPORTER_VERSION },
      });
    }

    const divergences: ImportResult["divergences"] = [];
    let importedCount = 0;
    let skippedUnchanged = 0;
    let changed = 0;

    // Estado ANTERIOR (antes de escrever) — para detectar novo/alterado e
    // registrar divergências contra uma fotografia já parcialmente gravada.
    const before = await legacy.legacyRecordSnapshot.findMany({
      where: { batch_id: batch.id },
      select: { entity_type: true, original_id: true, checksum: true },
    });
    const beforeByKey = new Map(before.map((e) => [`${e.entity_type}::${e.original_id}`, e.checksum]));

    // Escrita idempotente por (lote, tipo, id original). Em lotes.
    const CHUNK = 50;
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const slice = prepared.slice(i, i + CHUNK);
      await legacy.$transaction(
        slice.map((p) => {
          const r = p.raw;
          const data = {
            batch_id: batch!.id,
            entity_type: r.entity_type,
            source_table: r.source_table,
            original_id: r.original_id,
            original_code: r.original_code,
            title: r.title,
            subtitle: r.subtitle,
            original_status: r.original_status,
            dates_json: JSON.stringify(r.dates),
            content_json: JSON.stringify(p.cleanContent),
            checksum: p.checksum,
            sanitized: p.sanitized,
            sanitized_fields_json: p.removedFields.length ? JSON.stringify(p.removedFields) : null,
            search_category: r.search_category,
            search_active: r.search_active,
          };
          return legacy.legacyRecordSnapshot.upsert({
            where: {
              batch_id_entity_type_original_id: {
                batch_id: batch!.id,
                entity_type: r.entity_type,
                original_id: r.original_id,
              },
            },
            create: data,
            update: data,
          });
        }),
      );
    }

    // Conta novo/inalterado/alterado comparando com o estado ANTERIOR.
    // Um registro que já existia com checksum diferente é uma DIVERGÊNCIA
    // (a origem mudou desde a fotografia anterior) — nunca sobrescrito em
    // silêncio: só chega aqui em lote não-concluído ou com --allow-refresh.
    for (const p of prepared) {
      const k = `${p.raw.entity_type}::${p.raw.original_id}`;
      const prev = beforeByKey.get(k);
      importedCount++;
      if (prev === undefined) {
        changed++; // novo
      } else if (prev === p.checksum) {
        skippedUnchanged++;
      } else {
        changed++;
        divergences.push({
          entity_type: p.raw.entity_type,
          original_id: p.raw.original_id,
          reason: "checksum diferente do já gravado neste lote — origem alterada desde a fotografia anterior",
        });
      }
    }

    const existing = await legacy.legacyRecordSnapshot.findMany({
      where: { batch_id: batch.id },
      select: { entity_type: true, checksum: true },
    });

    // Relações — só depois que os registros existem (resolve to_record_id
    // dentro do lote). Recria do zero para este lote (idempotente).
    await legacy.legacyRelationSnapshot.deleteMany({ where: { batch_id: batch.id } });
    const recIdByKey = new Map(
      (
        await legacy.legacyRecordSnapshot.findMany({
          where: { batch_id: batch.id },
          select: { id: true, entity_type: true, original_id: true },
        })
      ).map((r) => [`${r.entity_type}::${r.original_id}`, r.id]),
    );
    const relRows = collection.relations.map((rel) => ({
      batch_id: batch!.id,
      from_record_id: recIdByKey.get(`${rel.from_entity_type}::${rel.from_original_id}`)!,
      to_record_id: rel.to_entity_type ? recIdByKey.get(`${rel.to_entity_type}::${rel.to_original_id}`) ?? null : null,
      relation_type: rel.relation_type,
      to_original_id: rel.to_original_id,
      description: rel.description,
    }));
    for (let i = 0; i < relRows.length; i += 200) {
      await legacy.legacyRelationSnapshot.createMany({ data: relRows.slice(i, i + 200) });
    }

    // ── Conferência (Parte 7) ────────────────────────────────────────────
    const importedByEntity: Record<string, number> = {};
    for (const e of existing) importedByEntity[e.entity_type] = (importedByEntity[e.entity_type] ?? 0) + 1;

    const reconciliation: Record<string, EntityReconciliation> = {};
    let anyDivergence = divergences.length > 0;
    for (const [entity, expectedCount] of Object.entries(collection.sourceCounts)) {
      if (entity === "relations") continue;
      const imp = importedByEntity[entity] ?? 0;
      const div = expectedCount - imp;
      if (div !== 0) anyDivergence = true;
      reconciliation[entity] = {
        expected_source: expectedCount,
        imported: imp,
        divergence: div,
        justification: div === 0 ? "coerente" : "quantidades não batem — verificar",
      };
    }
    reconciliation.relations = {
      expected_source: collection.relations.length,
      imported: relRows.length,
      divergence: collection.relations.length - relRows.length,
      justification: collection.relations.length === relRows.length ? "coerente" : "verificar",
    };

    const batchChecksum = hashPayload(existing.map((e) => e.checksum).sort());
    const finalStatus = anyDivergence ? "completed_with_divergences" : "completed";

    await legacy.legacyImportBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        imported_count: importedCount,
        checksum: batchChecksum,
        reconciliation_json: JSON.stringify(reconciliation),
        notes: `${sanitizedRecords} registro(s) sanitizado(s). ${changed} novo(s)/alterado(s), ${skippedUnchanged} inalterado(s).`,
      },
    });

    return {
      dry_run: false,
      batch_id: batch.id,
      source_name: sourceName,
      status: finalStatus,
      importer_version: IMPORTER_VERSION,
      totals: { expected, imported: importedCount, skipped_unchanged: skippedUnchanged, changed, sanitized_records: sanitizedRecords },
      reconciliation,
      divergences,
      batch_checksum: batchChecksum,
      blocked_fields_removed_sample: blockedSample,
    };
  } finally {
    await operational.$disconnect();
    await legacy.$disconnect();
  }
}
