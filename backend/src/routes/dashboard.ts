import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const [
      totalCompanies,
      totalProjects,
      activeProjects,
      totalNomades,
      activeNomades,
      totalTasks,
      pendingTasks,
      approvedTasks,
      totalWithdrawals,
      pendingWithdrawals,
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.project.count(),
      prisma.project.count({ where: { status: "in-progress" } }),
      prisma.nomade.count(),
      prisma.nomade.count({ where: { status: "ativo" } }),
      prisma.taskExecution.count(),
      prisma.taskExecution.count({
        where: { status: { in: ["draft", "launched", "in_progress"] } },
      }),
      prisma.taskExecution.count({ where: { status: "approved" } }),
      prisma.withdrawalRequest.count(),
      prisma.withdrawalRequest.count({
        where: { status: "aguardando_analise" },
      }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "paid" } }),
    ]);

    const invoiceAmounts = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "paid" },
    });

    res.json({
      companies: { total: totalCompanies },
      projects: {
        total: totalProjects,
        active: activeProjects,
        inactive: totalProjects - activeProjects,
      },
      nomades: {
        total: totalNomades,
        active: activeNomades,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        approved: approvedTasks,
        completionRate:
          totalTasks > 0
            ? Math.round((approvedTasks / totalTasks) * 100)
            : 0,
      },
      financial: {
        totalRevenue: invoiceAmounts._sum.amount ?? 0,
        paidInvoices,
        totalInvoices,
        pendingWithdrawals,
        totalWithdrawals,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-activities
router.get("/recent-activities", verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const [recentProjects, recentTasks, recentNomades] = await Promise.all([
      prisma.project.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
          client: { select: { name: true } },
        },
      }),
      prisma.taskExecution.findMany({
        take: limit,
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true,
          nomade: { select: { name: true } },
        },
      }),
      prisma.nomade.findMany({
        take: 5,
        orderBy: { registration_date: "desc" },
        select: { id: true, name: true, level: true, status: true, registration_date: true },
      }),
    ]);

    const activities = [
      ...recentProjects.map((p) => ({
        type: "project",
        id: p.id,
        title: `Projeto: ${p.title}`,
        subtitle: p.client?.name,
        status: p.status,
        date: p.created_at,
      })),
      ...recentTasks.map((t) => ({
        type: "task",
        id: t.id,
        title: `Tarefa: ${t.title}`,
        subtitle: t.nomade?.name,
        status: t.status,
        date: t.updated_at,
      })),
      ...recentNomades.map((n) => ({
        type: "nomade",
        id: n.id,
        title: `Nômade: ${n.name}`,
        subtitle: n.level,
        status: n.status,
        date: n.registration_date,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    res.json(activities);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/my-tasks
router.get("/my-tasks", verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    // For nomad users, return their own tasks
    // For admin/other users, return most recent pending tasks
    const where =
      req.user?.role === "nomad"
        ? {
            nomade: { user_id: req.user.id },
            status: { in: ["launched", "in_progress", "returned"] },
          }
        : { status: { in: ["launched", "in_progress"] } };

    const tasks = await prisma.taskExecution.findMany({
      where,
      take: limit,
      orderBy: { due_date: "asc" },
      include: {
        project: { select: { id: true, title: true } },
        template: { select: { id: true, name: true } },
      },
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

export default router;
