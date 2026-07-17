import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["coupon", "link", "referral"]).default("coupon"),
  status: z.enum(["active", "paused", "ended"]).default("active"),
  commission_type: z.enum(["percentage", "fixed"]).default("percentage"),
  commission_value: z.number().min(0).default(10),
  coupon_code: z.string().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
});

// GET /api/campaigns
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (type) where["type"] = type;

    const [total, data] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        include: {
          _count: { select: { commissions: true } },
          commissions: { select: { amount: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    // Real linked-partner lookup — a campaign can be the referral link a
    // partner shares (PartnerProfile.linked_campaign_id); surface that
    // instead of a fabricated "linked user".
    const campaignIds = data.map((c) => c.id);
    const linkedPartners = campaignIds.length
      ? await prisma.partnerProfile.findMany({
          where: { linked_campaign_id: { in: campaignIds } },
          include: { agency: { select: { id: true, name: true, owner: { select: { id: true, name: true } } } } },
        })
      : [];
    const linkedByCampaign = new Map(
      linkedPartners.map((p) => [p.linked_campaign_id as string, p]),
    );

    const enriched = data.map((c) => {
      const { commissions, _count, ...rest } = c;
      const linked = linkedByCampaign.get(c.id);
      return {
        ...rest,
        active_referrals: _count.commissions,
        total_earned: commissions.reduce((sum, x) => sum + x.amount, 0),
        // "Usuário vinculado" agora é o dono da Agency que é esse Partner —
        // não existe mais um usuário próprio do PartnerProfile.
        linked_user_id: linked?.agency?.owner?.id ?? null,
        linked_user_name: linked?.agency?.owner?.name ?? linked?.agency?.name ?? null,
      };
    });

    res.json({ data: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        commissions: {
          include: {
            partner: {
              include: { agency: { select: { id: true, name: true, owner: { select: { id: true, name: true } } } } },
            },
          },
          take: 20,
          orderBy: { created_at: "desc" },
        },
        _count: { select: { commissions: true } },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: "Campanha não encontrada" });
      return;
    }

    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.create({ data: req.body });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

// PUT /api/campaigns/:id
router.put("/:id", verifyToken, validate(createSchema.partial()), async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/campaigns/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.campaign.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
