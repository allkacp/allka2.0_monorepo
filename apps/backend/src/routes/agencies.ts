import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  partner_level: z
    .enum(["bronze", "silver", "gold", "platinum", "diamond"])
    .default("bronze"),
  status: z.string().default("ativo"),
  user_id: z.string().min(1),
});

const updateSchema = createSchema.partial().omit({ user_id: true });

// GET /api/agencies
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { role, account_type, id: userId } = req.user!;

    // Agency users see only their own agency
    if (account_type === "agencias") {
      const agency = await prisma.agency.findFirst({
        where: { user_id: userId },
        include: {
          user: { select: { id: true, email: true, name: true } },
          match_queue_entry: true,
        },
      });
      res.json({ data: agency ? [agency] : [], total: agency ? 1 : 0, page: 1, limit: 1 });
      return;
    }

    // Non-admin, non-agency accounts cannot list agencies
    if (role !== "admin") {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    // Admin: full paginated listing
    const { page, limit, skip } = parsePagination(req.query);
    const partner_level = req.query.partner_level as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (partner_level) where["partner_level"] = partner_level;
    if (status) where["status"] = status;
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.agency.count({ where }),
      prisma.agency.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          match_queue_entry: true,
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/agencies/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const { role, account_type, id: userId } = req.user!;

    // Agency users can only see their own agency
    if (account_type === "agencias") {
      const own = await prisma.agency.findFirst({ where: { user_id: userId }, select: { id: true } });
      if (!own || own.id !== req.params.id) {
        res.status(403).json({ error: "Acesso não autorizado" });
        return;
      }
    } else if (role !== "admin") {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    const agency = await prisma.agency.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        user: { select: { id: true, email: true, name: true } },
        match_queue_entry: true,
      },
    });

    if (!agency) {
      res.status(404).json({ error: "Agência não encontrada" });
      return;
    }

    res.json(agency);
  } catch (err) {
    next(err);
  }
});

// POST /api/agencies — admin only
router.post("/", verifyToken, requireRole("admin"), validate(createSchema), async (req, res, next) => {
  try {
    const agency = await prisma.agency.create({
      data: req.body,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.status(201).json(agency);
  } catch (err) {
    next(err);
  }
});

// PUT /api/agencies/:id — admin only
router.put("/:id", verifyToken, requireRole("admin"), validate(updateSchema), async (req, res, next) => {
  try {
    const agency = await prisma.agency.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(agency);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/:id — admin only
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.agency.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Partner Leadership Routes ────────────────────────────────────────────────

// GET /api/agencies/led — agencies led by the current partner
router.get("/led/list", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const leaderships = await prisma.agencyLeadership.findMany({
      where: { partner_id: partner.id, status: "active" },
      include: {
        agency: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            reports: {
              where: { partner_id: partner.id },
              orderBy: [{ period_year: "desc" }, { period_month: "desc" }],
              take: 5,
            },
          },
        },
      },
      orderBy: { started_at: "desc" },
    });

    res.json(leaderships);
  } catch (err) {
    next(err);
  }
});

// POST /api/agencies/:id/lead — start leading an agency
router.post("/:id/lead", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const agency = await prisma.agency.findUnique({
      where: { id: (req.params.id as string) },
    });
    if (!agency) {
      res.status(404).json({ error: "Agência não encontrada" });
      return;
    }

    const leadership = await prisma.agencyLeadership.upsert({
      where: { partner_id_agency_id: { partner_id: partner.id, agency_id: agency.id } },
      create: { partner_id: partner.id, agency_id: agency.id, status: "active", notes: req.body.notes },
      update: { status: "active", notes: req.body.notes },
      include: { agency: true },
    });

    res.status(201).json(leadership);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/:id/lead — stop leading an agency
router.delete("/:id/lead", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    await prisma.agencyLeadership.updateMany({
      where: { partner_id: partner.id, agency_id: (req.params.id as string) },
      data: { status: "ended", ended_at: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/agencies/:id/reports — reports for a led agency
router.get("/:id/reports", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const reports = await prisma.agencyReport.findMany({
      where: { partner_id: partner.id, agency_id: (req.params.id as string) },
      orderBy: [{ period_year: "desc" }, { period_month: "desc" }],
    });

    res.json(reports);
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2020),
  rating: z.number().int().min(1).max(5).optional(),
  highlights: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  mrr: z.number().optional(),
  projects_count: z.number().int().optional(),
  tasks_count: z.number().int().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

// POST /api/agencies/:id/reports — create a report for a led agency
router.post("/:id/reports", verifyToken, validate(reportSchema), async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const body = req.body;
    const report = await prisma.agencyReport.create({
      data: {
        partner_id: partner.id,
        agency_id: (req.params.id as string),
        title: body.title,
        content: body.content,
        period_month: body.period_month,
        period_year: body.period_year,
        rating: body.rating,
        highlights: body.highlights ? JSON.stringify(body.highlights) : null,
        improvements: body.improvements ? JSON.stringify(body.improvements) : null,
        mrr: body.mrr,
        projects_count: body.projects_count,
        tasks_count: body.tasks_count,
        status: body.status ?? "draft",
      },
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// PUT /api/agencies/:id/reports/:reportId — update a report
router.put("/:id/reports/:reportId", verifyToken, validate(reportSchema.partial()), async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const body = req.body;
    const updateData: Record<string, unknown> = { ...body };
    if (body.highlights !== undefined) updateData.highlights = JSON.stringify(body.highlights);
    if (body.improvements !== undefined) updateData.improvements = JSON.stringify(body.improvements);

    const report = await prisma.agencyReport.update({
      where: { id: (req.params.reportId as string), partner_id: partner.id },
      data: updateData,
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/:id/reports/:reportId — delete a report
router.delete("/:id/reports/:reportId", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
    });
    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    await prisma.agencyReport.delete({
      where: { id: (req.params.reportId as string), partner_id: partner.id },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
