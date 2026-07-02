import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

// GET /api/partners
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (search) {
      where["user"] = {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      };
    }

    const [total, data] = await Promise.all([
      prisma.partnerProfile.count({ where }),
      prisma.partnerProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          _count: { select: { commissions: true } },
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

// GET /api/partners/me
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { user_id: req.user!.id },
      include: {
        commissions: {
          orderBy: { created_at: "desc" },
          take: 20,
          include: { campaign: { select: { id: true, name: true } } },
        },
        referred_companies: {
          select: { id: true, name: true },
        },
      },
    });

    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    // Fetch projects of companies referred by this partner
    const referredCompanyIds = partner.referred_companies.map((c: any) => c.id);
    const rawProjects =
      referredCompanyIds.length > 0
        ? await prisma.project.findMany({
            where: { client_id: { in: referredCompanyIds } },
            include: { client: { select: { id: true, name: true } } },
            orderBy: { created_at: "desc" },
          })
        : [];

    // Compute global seq using Prisma (works in SQLite dev + MySQL prod — no window functions)
    let seqMap: Record<string, number> = {};
    if (rawProjects.length > 0) {
      const allProjectIds = await prisma.project.findMany({
        select: { id: true },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      });
      allProjectIds.forEach((p, i) => { seqMap[p.id] = i + 1; });
    }

    // Map project.status → PartnerProject status (active | completed | cancelled)
    const mapProjectStatus = (
      status: string,
    ): "active" | "completed" | "cancelled" => {
      if (status === "completed" || status === "paid") return "completed";
      if (status === "cancelled") return "cancelled";
      return "active";
    };

    // Commission per project: match by project_name against PartnerCommission
    const commissionByProjectName = new Map<
      string,
      { amount: number; status: string }
    >();
    for (const c of partner.commissions as any[]) {
      if (c.project_name) {
        commissionByProjectName.set(c.project_name, {
          amount: c.amount ?? 0,
          status: c.status ?? "pending",
        });
      }
    }
    const mapCommissionStatus = (
      status: string,
    ): "pending" | "confirmed" | "paid" => {
      if (status === "paid") return "paid";
      if (status === "approved" || status === "confirmed") return "confirmed";
      return "pending";
    };

    // Shape projects to match the frontend PartnerProject interface
    const projects = rawProjects.map((p: any, i: number) => {
      const comm = commissionByProjectName.get(p.title);
      return {
        id: p.id,
        seq: seqMap[p.id],
        partnerId: partner.id,
        companyName: p.client?.name ?? "—",
        companyId: p.client?.id ?? p.client_id ?? "",
        projectName: p.title,
        projectValue: p.value ?? p.budget ?? 0,
        serviceCategory: p.type ?? "—",
        status: mapProjectStatus(p.status),
        contractedAt: (p.start_date ?? p.created_at)
          ?.toISOString()
          .split("T")[0],
        completedAt: p.end_date ? p.end_date.toISOString().split("T")[0] : undefined,
        commissionGenerated: comm?.amount ?? 0,
        commissionStatus: mapCommissionStatus(comm?.status ?? "pending"),
      };
    });

    const { referred_companies, ...partnerData } = partner as any;
    res.json({ ...partnerData, projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        commissions: {
          orderBy: { created_at: "desc" },
          take: 50,
        },
      },
    });

    if (!partner) {
      res.status(404).json({ error: "Parceiro não encontrado" });
      return;
    }

    res.json(partner);
  } catch (err) {
    next(err);
  }
});

// POST /api/partners
router.post(
  "/",
  verifyToken,
  validate(
    z.object({
      user_id: z.string().min(1),
      referral_code: z.string().optional(),
      pix_key: z.string().optional(),
      pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
      linked_campaign_id: z.string().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const partner = await prisma.partnerProfile.create({
        data: req.body,
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.status(201).json(partner);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/partners/:id
router.put(
  "/:id",
  verifyToken,
  validate(
    z.object({
      status: z.enum(["active", "suspended", "pending"]).optional(),
      pix_key: z.string().optional(),
      pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
      referral_code: z.string().optional(),
      linked_campaign_id: z.string().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const partner = await prisma.partnerProfile.update({
        where: { id: (req.params.id as string) },
        data: req.body,
      });
      res.json(partner);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/partners/:id/commissions
router.get("/:id/commissions", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, data] = await Promise.all([
      prisma.partnerCommission.count({ where: { partner_id: (req.params.id as string) } }),
      prisma.partnerCommission.findMany({
        where: { partner_id: (req.params.id as string) },
        include: { campaign: { select: { id: true, name: true } } },
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

export default router;
