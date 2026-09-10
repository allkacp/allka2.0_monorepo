// Consulta da Plataforma Anterior (sprint de produtos, bloco 1/6).
//
// SOMENTE LEITURA e SOMENTE Admin Master. Toda rota:
//   - autentica (verifyToken);
//   - checa Admin Master de verdade (evaluateAdminMasterAccess — a mesma
//     classificação oficial, nunca só o texto do papel);
//   - audita o acesso no banco OPERACIONAL (nunca no legado, que fica imutável);
//   - lê o banco LEGADO com a conexão somente-leitura.
// Nenhuma rota aqui insere, edita ou apaga — não existe verbo de escrita.

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { getLegacyPrisma, LegacyNotConfiguredError } from "../legacy/legacy-prisma";
import { IDENTITY_ENTITY_TYPES } from "../legacy/importer";

const router = Router();
const MODULE = "consulta_legado";

// ── Guarda: Admin Master + auditoria de permitido/negado ─────────────────
async function guardAdminMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        admin_profile: {
          select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } },
        },
      },
    });
    const allowed = evaluateAdminMasterAccess(req.user.account_type, user?.admin_profile ?? null);
    if (!allowed) {
      await writeAccessAudit({
        actorId: req.user.id,
        action: "legacy_consultation.denied",
        after: { module: MODULE, path: req.path, method: req.method, result: "denied" },
      }).catch(() => {});
      // 404, não 403, para não revelar a existência do módulo a quem não pode vê-lo.
      res.status(404).json({ error: "Não encontrado" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

router.use(verifyToken, guardAdminMaster);

function handleErr(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof LegacyNotConfiguredError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}

async function audit(req: Request, action: string, extra: Record<string, unknown>) {
  await writeAccessAudit({
    actorId: req.user!.id,
    action: `legacy_consultation.${action}`,
    after: { module: MODULE, result: "allowed", ...extra },
  }).catch(() => {});
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── GET /summary ────────────────────────────────────────────────────────
router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legacy = getLegacyPrisma();
    if (!legacy) throw new LegacyNotConfiguredError();

    const batch = await legacy.legacyImportBatch.findFirst({ orderBy: { imported_at: "desc" } });
    await audit(req, "summary", { batch_id: batch?.id ?? null });

    if (!batch) {
      res.json({
        configured: true,
        batch: null,
        counts: {},
        tabs: baseTabs(),
      });
      return;
    }

    const grouped = await legacy.legacyRecordSnapshot.groupBy({
      by: ["entity_type"],
      where: { batch_id: batch.id },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.entity_type] = g._count._all;

    const productStatus = await legacy.legacyRecordSnapshot.groupBy({
      by: ["original_status"],
      where: { batch_id: batch.id, entity_type: "product" },
      _count: { _all: true },
    });
    const productByStatus: Record<string, number> = {};
    for (const s of productStatus) productByStatus[s.original_status ?? "—"] = s._count._all;

    // "contas" (identidade/organizações) pode viver num lote DIFERENTE do
    // mais recente exibido acima (cada domínio tem seu próprio source_name —
    // ver collectIdentityOrgSnapshot) — por isso checa por existência de
    // QUALQUER lote com esses tipos, em vez de depender de `counts` do lote
    // "mais recente" geral.
    const identityCount = await legacy.legacyRecordSnapshot.count({
      where: { entity_type: { in: IDENTITY_ENTITY_TYPES } },
    });

    res.json({
      configured: true,
      batch: {
        id: batch.id,
        source_name: batch.source_name,
        source_environment: batch.source_environment,
        snapshot_at: batch.snapshot_at,
        imported_at: batch.imported_at,
        importer_version: batch.importer_version,
        status: batch.status,
        expected_count: batch.expected_count,
        imported_count: batch.imported_count,
        checksum: batch.checksum,
        reconciliation: parseJson(batch.reconciliation_json, {} as Record<string, unknown>),
        notes: batch.notes,
        // Tipo do lote — EXPLÍCITO (coluna `kind`), não mais inferido do texto
        // do nome. Lotes antigos, sem a coluna preenchida, caem em "preview".
        kind: batch.kind ?? "preview",
        is_official: (batch.kind ?? "preview") === "official",
        is_preview: (batch.kind ?? "preview") !== "official",
        sealed_at: batch.sealed_at ?? null,
      },
      counts,
      product_by_status: productByStatus,
      tabs: {
        resumo: { status: "ready" },
        produtos: { status: "ready", count: counts["product"] ?? 0 },
        contas: { status: identityCount > 0 ? "ready" : "awaiting_import", count: identityCount },
        compras: { status: "awaiting_import" },
        projetos: { status: "awaiting_import" },
        tarefas: { status: "awaiting_import" },
        financeiro: { status: "awaiting_import" },
      },
    });
  } catch (err) {
    handleErr(err, res, next);
  }
});

function baseTabs() {
  return {
    resumo: { status: "ready" },
    produtos: { status: "awaiting_import" },
    contas: { status: "awaiting_import" },
    compras: { status: "awaiting_import" },
    projetos: { status: "awaiting_import" },
    tarefas: { status: "awaiting_import" },
    financeiro: { status: "awaiting_import" },
  };
}

// ── GET /products ──────────────────────────────────────────────────────
const SORTABLE = new Set(["title", "original_code", "imported_at", "original_status"]);

router.get("/products", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legacy = getLegacyPrisma();
    if (!legacy) throw new LegacyNotConfiguredError();

    const batchId =
      typeof req.query.batch_id === "string" && req.query.batch_id
        ? req.query.batch_id
        : (await legacy.legacyImportBatch.findFirst({ orderBy: { imported_at: "desc" }, select: { id: true } }))?.id;

    if (!batchId) {
      res.json({ data: [], total: 0, page: 1, page_size: 20, batch_id: null });
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const sortBy = SORTABLE.has(String(req.query.sort_by)) ? String(req.query.sort_by) : "title";
    const sortDir = req.query.sort_dir === "desc" ? "desc" : "asc";

    const where: Record<string, unknown> = { batch_id: batchId, entity_type: "product" };
    if (status) where.original_status = status;
    if (category) where.search_category = category;
    if (q) {
      where.OR = [
        { original_code: { contains: q } },
        { title: { contains: q } },
        { subtitle: { contains: q } },
        { content_json: { contains: q } },
      ];
    }

    const [total, rows, categories] = await Promise.all([
      legacy.legacyRecordSnapshot.count({ where }),
      legacy.legacyRecordSnapshot.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          original_id: true,
          original_code: true,
          title: true,
          subtitle: true,
          original_status: true,
          search_category: true,
          search_active: true,
          imported_at: true,
          sanitized: true,
        },
      }),
      legacy.legacyRecordSnapshot.findMany({
        where: { batch_id: batchId, entity_type: "product" },
        distinct: ["search_category"],
        select: { search_category: true },
      }),
    ]);

    await audit(req, "list", {
      entity_type: "product",
      batch_id: batchId,
      filters: { has_query: !!q, status: status ?? null, category: category ?? null, page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir },
      result_count: rows.length,
    });

    res.json({
      data: rows,
      total,
      page,
      page_size: pageSize,
      batch_id: batchId,
      available_categories: categories.map((c) => c.search_category).filter(Boolean).sort(),
      read_only: true,
    });
  } catch (err) {
    handleErr(err, res, next);
  }
});

// ── GET /identities  (identidade histórica + organizações) ─────────────
// Mesmo padrão de busca/paginação de /products, mas para os 6 tipos de
// identidade/organização (user, admin_profile, company, agency,
// partner_profile, nomade) — que vivem em seu(s) próprio(s) lote(s),
// distintos do lote de produtos (ver collectIdentityOrgSnapshot).
const IDENTITY_SORTABLE = new Set(["title", "original_code", "imported_at", "original_status"]);

router.get("/identities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legacy = getLegacyPrisma();
    if (!legacy) throw new LegacyNotConfiguredError();

    const requestedEntityType =
      typeof req.query.entity_type === "string" && (IDENTITY_ENTITY_TYPES as string[]).includes(req.query.entity_type)
        ? req.query.entity_type
        : undefined;
    const entityTypeFilter = requestedEntityType ? [requestedEntityType] : IDENTITY_ENTITY_TYPES;

    // Sem --batch_id explícito, usa o lote mais recente que de fato tem
    // registros de identidade/organização — NUNCA o mais recente geral (que
    // pode ser um lote de outro domínio, ex.: produtos).
    const batchId =
      typeof req.query.batch_id === "string" && req.query.batch_id
        ? req.query.batch_id
        : (
            await legacy.legacyRecordSnapshot.findFirst({
              where: { entity_type: { in: IDENTITY_ENTITY_TYPES } },
              orderBy: { imported_at: "desc" },
              select: { batch_id: true },
            })
          )?.batch_id;

    if (!batchId) {
      res.json({ data: [], total: 0, page: 1, page_size: 20, batch_id: null, available_entity_types: [], read_only: true });
      return;
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const sortBy = IDENTITY_SORTABLE.has(String(req.query.sort_by)) ? String(req.query.sort_by) : "title";
    const sortDir = req.query.sort_dir === "desc" ? "desc" : "asc";

    const where: Record<string, unknown> = { batch_id: batchId, entity_type: { in: entityTypeFilter } };
    if (status) where.original_status = status;
    if (q) {
      where.OR = [
        { original_code: { contains: q } },
        { title: { contains: q } },
        { subtitle: { contains: q } },
        { content_json: { contains: q } },
      ];
    }

    const [total, rows, entityTypeCounts] = await Promise.all([
      legacy.legacyRecordSnapshot.count({ where }),
      legacy.legacyRecordSnapshot.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Só o que já é seguro por desenho (content/dados sensíveis nunca
        // estiveram aqui — ver collectIdentityOrgSnapshot): nenhuma seleção
        // adicional de campo é necessária para não vazar segredo, mas a
        // lista (diferente do detalhe) nem inclui `content_json` — só o
        // suficiente pra identificar o registro na busca.
        select: {
          id: true,
          entity_type: true,
          original_id: true,
          original_code: true,
          title: true,
          subtitle: true,
          original_status: true,
          imported_at: true,
          sanitized: true,
        },
      }),
      legacy.legacyRecordSnapshot.groupBy({
        by: ["entity_type"],
        where: { batch_id: batchId, entity_type: { in: IDENTITY_ENTITY_TYPES } },
        _count: { _all: true },
      }),
    ]);

    await audit(req, "list", {
      entity_type: "identity_org",
      batch_id: batchId,
      filters: { has_query: !!q, status: status ?? null, entity_type: requestedEntityType ?? null, page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir },
      result_count: rows.length,
    });

    res.json({
      data: rows,
      total,
      page,
      page_size: pageSize,
      batch_id: batchId,
      available_entity_types: entityTypeCounts.map((c) => ({ entity_type: c.entity_type, count: c._count._all })),
      read_only: true,
    });
  } catch (err) {
    handleErr(err, res, next);
  }
});

// ── GET /records/:id  (detalhe + relações) ─────────────────────────────
router.get("/records/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const legacy = getLegacyPrisma();
    if (!legacy) throw new LegacyNotConfiguredError();

    const record = await legacy.legacyRecordSnapshot.findUnique({
      where: { id: req.params.id as string },
      include: {
        batch: {
          select: { id: true, source_name: true, source_environment: true, snapshot_at: true, imported_at: true, importer_version: true, status: true, kind: true, sealed_at: true },
        },
        relations_from: {
          include: { to_record: { select: { id: true, entity_type: true, title: true, original_code: true, original_status: true } } },
          orderBy: { relation_type: "asc" },
        },
      },
    });

    if (!record) {
      await audit(req, "detail", { record_id: req.params.id, result: "not_found" });
      res.status(404).json({ error: "Registro histórico não encontrado" });
      return;
    }

    await audit(req, "detail", { record_id: record.id, entity_type: record.entity_type, historical_original_id: record.original_id });

    // Agrupa as relações por tipo (has_variation / has_addon / has_catalog_task / in_category / ...)
    const relationsByType: Record<string, unknown[]> = {};
    for (const rel of record.relations_from) {
      (relationsByType[rel.relation_type] ??= []).push({
        relation_type: rel.relation_type,
        to_original_id: rel.to_original_id,
        description: rel.description,
        record: rel.to_record
          ? {
              id: rel.to_record.id,
              entity_type: rel.to_record.entity_type,
              title: rel.to_record.title,
              original_code: rel.to_record.original_code,
              original_status: rel.to_record.original_status,
            }
          : null, // destino ainda não importado nesta fotografia
      });
    }

    res.json({
      record: {
        id: record.id,
        entity_type: record.entity_type,
        source_table: record.source_table,
        original_id: record.original_id,
        original_code: record.original_code,
        title: record.title,
        subtitle: record.subtitle,
        original_status: record.original_status,
        dates: parseJson(record.dates_json, {} as Record<string, unknown>),
        content: parseJson(record.content_json, {} as Record<string, unknown>),
        checksum: record.checksum,
        sanitized: record.sanitized,
        sanitized_fields: parseJson(record.sanitized_fields_json, [] as string[]),
        imported_at: record.imported_at,
      },
      batch: record.batch,
      relations_by_type: relationsByType,
      read_only: true,
    });
  } catch (err) {
    handleErr(err, res, next);
  }
});

export default router;
