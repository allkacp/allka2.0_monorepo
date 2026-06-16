// ─── Admin Reports — CRUD over ReportConfig ──────────────────────────────────
// Mounted at /api/admin/reports (see app.ts)
// All endpoints require admin role.
//
// GET    /              — list all configured reports + unconfigured catalog keys
// POST   /              — create a new ReportConfig
// GET    /:key          — get one report config by report_key
// PUT    /:key          — full update of a report config
// PATCH  /:key/permissions — partial update of permission fields only
// DELETE /:key          — soft delete (set is_active = false)

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { listAvailableIndicatorIds } from "../services/reports/indicator-engine";

const router = Router();

// All admin report routes require authentication + admin role
router.use(verifyToken, requireRole("admin"));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function serializeConfig(c: {
  id: string;
  report_key: string;
  is_active: boolean;
  allowed_account_types: string | null;
  allowed_roles: string | null;
  allowed_user_ids: string | null;
  blocked_user_ids: string | null;
  data_scope: string;
  can_export: boolean;
  can_change_filters: boolean;
  only_related_data: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    ...c,
    allowed_account_types: parseJsonField(c.allowed_account_types),
    allowed_roles: parseJsonField(c.allowed_roles),
    allowed_user_ids: parseJsonField(c.allowed_user_ids),
    blocked_user_ids: parseJsonField(c.blocked_user_ids),
  };
}

function buildData(body: Record<string, unknown>) {
  return {
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    allowed_account_types: JSON.stringify(Array.isArray(body.allowed_account_types) ? body.allowed_account_types : []),
    allowed_roles: JSON.stringify(Array.isArray(body.allowed_roles) ? body.allowed_roles : []),
    allowed_user_ids: JSON.stringify(Array.isArray(body.allowed_user_ids) ? body.allowed_user_ids : []),
    blocked_user_ids: JSON.stringify(Array.isArray(body.blocked_user_ids) ? body.blocked_user_ids : []),
    data_scope: typeof body.data_scope === "string" ? body.data_scope : "GLOBAL",
    can_export: body.can_export !== undefined ? Boolean(body.can_export) : true,
    can_change_filters: body.can_change_filters !== undefined ? Boolean(body.can_change_filters) : true,
    only_related_data: body.only_related_data !== undefined ? Boolean(body.only_related_data) : false,
  };
}

// ─── GET / — list all report configs ─────────────────────────────────────────

router.get("/", async (_req, res, next) => {
  try {
    const configs = await prisma.reportConfig.findMany({
      orderBy: { report_key: "asc" },
    });

    // Merge with indicator IDs that have no config yet
    const configuredKeys = new Set(configs.map((c) => c.report_key));
    const allKnownKeys = listAvailableIndicatorIds();
    const unconfigured = allKnownKeys
      .filter((k) => !configuredKeys.has(k))
      .map((k) => ({ report_key: k, configured: false }));

    res.json({
      configured: configs.map((c) => ({ ...serializeConfig(c), configured: true })),
      unconfigured,
      total_configured: configs.length,
      total_unconfigured: unconfigured.length,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create a new ReportConfig ──────────────────────────────────────

router.post("/", async (req, res, next) => {
  try {
    const { report_key } = req.body as { report_key?: string };
    if (!report_key || typeof report_key !== "string") {
      res.status(400).json({ error: "Campo 'report_key' é obrigatório." });
      return;
    }

    const existing = await prisma.reportConfig.findUnique({ where: { report_key } });
    if (existing) {
      res.status(409).json({
        error: `Configuração para '${report_key}' já existe. Use PUT /:key para atualizar.`,
      });
      return;
    }

    const config = await prisma.reportConfig.create({
      data: { report_key, ...buildData(req.body as Record<string, unknown>) },
    });

    res.status(201).json(serializeConfig(config));
  } catch (err) {
    next(err);
  }
});

// ─── GET /:key ────────────────────────────────────────────────────────────────

router.get("/:key", async (req, res, next) => {
  try {
    const reportKey = req.params["key"] as string;
    const config = await prisma.reportConfig.findUnique({ where: { report_key: reportKey } });

    if (!config) {
      res.status(404).json({
        error: `Relatório '${reportKey}' não tem configuração. Use POST / para criar.`,
        report_key: reportKey,
        configured: false,
      });
      return;
    }

    res.json({ ...serializeConfig(config), configured: true });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:key — full update ──────────────────────────────────────────────────

router.put("/:key", async (req, res, next) => {
  try {
    const reportKey = req.params["key"] as string;

    const config = await prisma.reportConfig.upsert({
      where: { report_key: reportKey },
      create: { report_key: reportKey, ...buildData(req.body as Record<string, unknown>) },
      update: buildData(req.body as Record<string, unknown>),
    });

    res.json(serializeConfig(config));
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:key/permissions — partial permission update ─────────────────────

router.patch("/:key/permissions", async (req, res, next) => {
  try {
    const reportKey = req.params["key"] as string;
    const body = req.body as Record<string, unknown>;

    const existing = await prisma.reportConfig.findUnique({ where: { report_key: reportKey } });
    if (!existing) {
      res.status(404).json({ error: `Relatório '${reportKey}' não encontrado.` });
      return;
    }

    // Only update the fields that were explicitly provided
    const partial: Record<string, unknown> = {};
    if (body.allowed_account_types !== undefined)
      partial.allowed_account_types = JSON.stringify(body.allowed_account_types);
    if (body.allowed_roles !== undefined)
      partial.allowed_roles = JSON.stringify(body.allowed_roles);
    if (body.allowed_user_ids !== undefined)
      partial.allowed_user_ids = JSON.stringify(body.allowed_user_ids);
    if (body.blocked_user_ids !== undefined)
      partial.blocked_user_ids = JSON.stringify(body.blocked_user_ids);
    if (body.data_scope !== undefined)
      partial.data_scope = String(body.data_scope);
    if (body.can_export !== undefined)
      partial.can_export = Boolean(body.can_export);
    if (body.can_change_filters !== undefined)
      partial.can_change_filters = Boolean(body.can_change_filters);
    if (body.only_related_data !== undefined)
      partial.only_related_data = Boolean(body.only_related_data);
    if (body.is_active !== undefined)
      partial.is_active = Boolean(body.is_active);

    const updated = await prisma.reportConfig.update({
      where: { report_key: reportKey },
      data: partial,
    });

    res.json(serializeConfig(updated));
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:key — soft delete (is_active = false) ──────────────────────────

router.delete("/:key", async (req, res, next) => {
  try {
    const reportKey = req.params["key"] as string;

    const existing = await prisma.reportConfig.findUnique({ where: { report_key: reportKey } });
    if (!existing) {
      res.status(404).json({ error: `Relatório '${reportKey}' não encontrado.` });
      return;
    }

    const updated = await prisma.reportConfig.update({
      where: { report_key: reportKey },
      data: { is_active: false },
    });

    res.json({ message: `Relatório '${reportKey}' desativado.`, ...serializeConfig(updated) });
  } catch (err) {
    next(err);
  }
});

export default router;
