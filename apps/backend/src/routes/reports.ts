import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// GET /api/reports/summary
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

// GET /api/reports/nomades
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

// GET /api/reports/financial
router.get("/financial", verifyToken, async (req, res, next) => {
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

export default router;
