// ─── Reports & Indicators — User-facing routes ────────────────────────────────
// Mounted at /api/reports (see app.ts)
//
// Existing (preserved):
//   GET  /summary        — aggregate summary (admin)
//   GET  /nomades        — nomad list report
//   GET  /financial      — invoice + withdrawal totals
//   GET  /config         — admin: all ReportConfig records
//   PUT  /config/:key    — admin: upsert ReportConfig
//   GET  /available      — authenticated user: reports they can access
//
// New:
//   POST /indicators/run          — run one or more indicators
//   POST /indicators/run/batch    — alias for multiple indicators in one call
//   GET  /:reportKey              — get a report with access check (403 if denied)
//   POST /:reportKey/export       — export a report (checks can_export)
//   POST /usage-event             — record a usage event (frontend instrumentation)

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { checkReportAccess } from "../services/reports/report-access.service";
import { runIndicator, runMultipleIndicators } from "../services/reports/indicator-engine";
import type { IndicatorRunRequest } from "../services/reports/types";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(value: string | null | undefined): string[] {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

function deserializeConfig(c: {
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

// ─── Existing: GET /summary ────────────────────────────────────────────────────

router.get("/summary", verifyToken, async (_req, res, next) => {
  try {
    const [
      nomadesByLevel,
      nomadesByStatus,
      tasksByStatus,
      projectsByStatus,
      invoicesByStatus,
      topNomades,
    ] = await Promise.all([
      prisma.nomade.groupBy({ by: ["level"], _count: true }),
      prisma.nomade.groupBy({ by: ["status"], _count: true }),
      prisma.taskExecution.groupBy({ by: ["status"], _count: true }),
      prisma.project.groupBy({ by: ["status"], _count: true }),
      prisma.invoice.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.nomade.findMany({
        take: 10,
        orderBy: { score: "desc" },
        select: {
          id: true,
          name: true,
          level: true,
          score: true,
          tasks_completed_total: true,
          performance_avg_rating: true,
        },
      }),
    ]);

    res.json({
      nomades: {
        byLevel: nomadesByLevel,
        byStatus: nomadesByStatus,
        topPerformers: topNomades,
      },
      tasks: { byStatus: tasksByStatus },
      projects: { byStatus: projectsByStatus },
      financial: { byStatus: invoicesByStatus },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Existing: GET /nomades ────────────────────────────────────────────────────

router.get("/nomades", verifyToken, async (req, res, next) => {
  try {
    const level = req.query.level as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (level) where["level"] = level;
    if (status) where["status"] = status;

    const nomades = await prisma.nomade.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        status: true,
        score: true,
        tasks_completed_total: true,
        tasks_completed_quarter: true,
        performance_avg_rating: true,
        performance_on_time: true,
        performance_rejection_rate: true,
        registration_date: true,
        _count: { select: { qualifications: true, withdrawal_requests: true } },
      },
      orderBy: { score: "desc" },
    });

    res.json(nomades);
  } catch (err) {
    next(err);
  }
});

// ─── Existing: GET /financial ──────────────────────────────────────────────────

router.get("/financial", verifyToken, async (_req, res, next) => {
  try {
    const [invoiceTotals, withdrawalTotals] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    res.json({
      invoices: invoiceTotals,
      withdrawals: withdrawalTotals,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Existing: GET /config ────────────────────────────────────────────────────

router.get(
  "/config",
  verifyToken,
  requireRole("admin"),
  async (_req, res, next) => {
    try {
      const configs = await prisma.reportConfig.findMany();
      const byKey: Record<string, ReturnType<typeof deserializeConfig>> = {};
      for (const c of configs) {
        byKey[c.report_key] = deserializeConfig(c);
      }
      res.json(byKey);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Existing: PUT /config/:reportKey ────────────────────────────────────────

router.put(
  "/config/:reportKey",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const reportKey = req.params["reportKey"] as string;
      const {
        is_active = true,
        allowed_account_types = [],
        allowed_roles = [],
        allowed_user_ids = [],
        blocked_user_ids = [],
        data_scope = "GLOBAL",
        can_export = true,
        can_change_filters = true,
        only_related_data = false,
      } = req.body;

      const data = {
        is_active: Boolean(is_active),
        allowed_account_types: JSON.stringify(allowed_account_types),
        allowed_roles: JSON.stringify(allowed_roles),
        allowed_user_ids: JSON.stringify(allowed_user_ids),
        blocked_user_ids: JSON.stringify(blocked_user_ids),
        data_scope: String(data_scope),
        can_export: Boolean(can_export),
        can_change_filters: Boolean(can_change_filters),
        only_related_data: Boolean(only_related_data),
      };

      const config = await prisma.reportConfig.upsert({
        where: { report_key: reportKey },
        update: data,
        create: { report_key: reportKey, ...data },
      });

      res.json(deserializeConfig(config));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Existing: GET /available ─────────────────────────────────────────────────

router.get("/available", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;
    const isAdmin = user.role === "admin" || user.account_type === "admin";

    const configs = await prisma.reportConfig.findMany({
      where: { is_active: true },
    });

    const result: Array<{
      report_key: string;
      can_export: boolean;
      can_change_filters: boolean;
      data_scope: string;
    }> = [];

    for (const c of configs) {
      const allowedAccountTypes = parseJsonField(c.allowed_account_types);
      const allowedRoles = parseJsonField(c.allowed_roles);
      const allowedUserIds = parseJsonField(c.allowed_user_ids);
      const blockedUserIds = parseJsonField(c.blocked_user_ids);

      if (isAdmin) {
        result.push({
          report_key: c.report_key,
          can_export: c.can_export,
          can_change_filters: c.can_change_filters,
          data_scope: c.data_scope,
        });
        continue;
      }

      if (blockedUserIds.includes(user.id)) continue;

      if (allowedUserIds.length > 0 && allowedUserIds.includes(user.id)) {
        result.push({
          report_key: c.report_key,
          can_export: c.can_export,
          can_change_filters: c.can_change_filters,
          data_scope: c.data_scope,
        });
        continue;
      }

      const accountTypeMatch =
        allowedAccountTypes.length > 0 && allowedAccountTypes.includes(user.account_type);
      const roleMatch =
        allowedRoles.length > 0 && allowedRoles.includes(user.role);

      if (accountTypeMatch || roleMatch) {
        result.push({
          report_key: c.report_key,
          can_export: c.can_export,
          can_change_filters: c.can_change_filters,
          data_scope: c.data_scope,
        });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── NEW: POST /indicators/run — single indicator ─────────────────────────────
// Body: IndicatorRunRequest
// Returns: IndicatorResult
// Access check is done inside runIndicator via scope resolution.
// Admin bypasses scope restrictions; other profiles are scoped automatically.

router.post("/indicators/run", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as IndicatorRunRequest;

    if (!body.indicatorId || !body.startDate || !body.endDate) {
      res.status(400).json({
        error: "Campos obrigatórios: indicatorId, startDate, endDate.",
      });
      return;
    }

    const result = await runIndicator(user, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── NEW: POST /indicators/run/batch — multiple indicators at once ─────────────

router.post("/indicators/run/batch", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;
    const body = req.body as { indicators: IndicatorRunRequest[] };

    if (!Array.isArray(body.indicators) || body.indicators.length === 0) {
      res.status(400).json({
        error: "Campo 'indicators' deve ser um array não vazio de IndicatorRunRequest.",
      });
      return;
    }

    if (body.indicators.length > 20) {
      res.status(400).json({
        error: "Máximo de 20 indicadores por chamada batch.",
      });
      return;
    }

    const results = await runMultipleIndicators(user, body.indicators);
    res.json({ results, count: results.length });
  } catch (err) {
    next(err);
  }
});

// ─── NEW: GET /:reportKey — get report with permission check ──────────────────
// Returns 403 with explicit message if denied — never returns empty array.

router.get("/:reportKey", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;
    const reportKey = req.params["reportKey"] as string;

    const access = await checkReportAccess(user, reportKey);
    if (!access.allowed) {
      res.status(403).json({
        error: access.reason,
        report_key: reportKey,
        access_denied: true,
      });
      return;
    }

    const config = await prisma.reportConfig.findUnique({
      where: { report_key: reportKey },
    });

    res.json({
      report_key: reportKey,
      can_export: access.can_export,
      can_change_filters: access.can_change_filters,
      data_scope: access.data_scope,
      only_related_data: access.only_related_data,
      config: config ? deserializeConfig(config) : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── NEW: POST /:reportKey/export — export a report ──────────────────────────
// Validates can_export permission before processing.
// Full export implementation (PDF/XLSX rendering) requires additional tooling;
// this endpoint validates access and returns the data payload for the client to render.

router.post("/:reportKey/export", verifyToken, async (req, res, next) => {
  try {
    const user = req.user!;
    const reportKey = req.params["reportKey"] as string;

    const access = await checkReportAccess(user, reportKey);
    if (!access.allowed) {
      res.status(403).json({
        error: access.reason,
        report_key: reportKey,
        access_denied: true,
      });
      return;
    }

    if (!access.can_export) {
      res.status(403).json({
        error: "Exportação não permitida para este relatório com seu perfil.",
        report_key: reportKey,
        can_export: false,
      });
      return;
    }

    const body = req.body as {
      format?: "PDF" | "XLSX";
      indicators?: IndicatorRunRequest[];
      startDate?: string;
      endDate?: string;
    };

    const format = body.format ?? "XLSX";

    // If indicators are provided, run them and return data for client-side rendering
    if (Array.isArray(body.indicators) && body.indicators.length > 0) {
      const results = await runMultipleIndicators(user, body.indicators);
      res.json({
        report_key: reportKey,
        format,
        data_scope: access.data_scope,
        exported_at: new Date().toISOString(),
        indicators: results,
        note: "Dados prontos para renderização PDF/XLSX no cliente ou servidor.",
      });
      return;
    }

    // No indicators specified — return metadata only
    res.json({
      report_key: reportKey,
      format,
      data_scope: access.data_scope,
      exported_at: new Date().toISOString(),
      note: "Forneça 'indicators' no body para incluir dados no export.",
    });
  } catch (err) {
    next(err);
  }
});

// ─── NEW: POST /usage-event — record frontend usage events ───────────────────
// Allows the frontend to instrument page views, checkout funnels, etc.
// No auth required on this specific endpoint — events are recorded anonymously
// if not authenticated, or with user info if authenticated.

router.post("/usage-event", async (req, res, next) => {
  try {
    const body = req.body as {
      event_type?: string;
      route?: string;
      session_id?: string;
      metadata?: unknown;
    };

    if (!body.event_type || !body.route) {
      res.status(400).json({ error: "Campos obrigatórios: event_type, route." });
      return;
    }

    const ALLOWED_EVENT_TYPES = [
      "page_view", "login", "project_start", "project_abandon",
      "checkout_start", "checkout_complete", "checkout_abandon",
    ];

    if (!ALLOWED_EVENT_TYPES.includes(body.event_type)) {
      res.status(400).json({
        error: `event_type inválido. Valores permitidos: ${ALLOWED_EVENT_TYPES.join(", ")}`,
      });
      return;
    }

    // Try to extract user from Authorization header if present (optional auth)
    let userId = "anonymous";
    let accountType = "unknown";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = await import("jsonwebtoken");
        const jwtSecret = process.env.JWT_SECRET ?? "allka_dev_secret";
        const payload = jwt.default.verify(authHeader.slice(7), jwtSecret) as {
          id: string;
          account_type: string;
        };
        userId = payload.id;
        accountType = payload.account_type;
      } catch {
        // Token invalid or expired — still record event anonymously
      }
    }

    await prisma.usageEvent.create({
      data: {
        user_id: userId,
        account_type: accountType,
        route: String(body.route).slice(0, 500),
        event_type: body.event_type,
        session_id: body.session_id ?? null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
    });

    res.status(201).json({ recorded: true });
  } catch (err) {
    next(err);
  }
});

export default router;
