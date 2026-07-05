import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  code: z.string().min(1),
  coupon_type: z.enum(["discount", "credit-bonus", "referral"]).default("discount"),
  discount_type: z.enum(["percentage", "fixed"]).default("percentage"),
  discount_value: z.number().min(0).default(0),
  credit_bonus: z.number().min(0).default(0),
  usage_limit: z.number().int().min(0).default(0),
  usage_limit_per_company: z.enum(["unlimited", "once", "custom"]).default("unlimited"),
  max_uses_per_company: z.number().int().min(0).default(0),
  valid_from: z.string().datetime({ offset: true }).optional(),
  valid_until: z.string().datetime({ offset: true }).optional(),
  applicable_products: z.array(z.string()).optional(),
  allowed_account_types: z.array(z.string()).optional(),
  allowed_company_ids: z.array(z.string()).optional(),
  allowed_user_ids: z.array(z.string()).optional(),
  linked_user_id: z.string().optional(),
  linked_user_commission_type: z.enum(["percentage", "fixed"]).optional(),
  linked_user_commission_value: z.number().min(0).optional(),
  status: z.enum(["active", "disabled", "expired"]).default("active"),
});

function toCreateData(body: z.infer<typeof createSchema>) {
  const {
    applicable_products,
    allowed_account_types,
    allowed_company_ids,
    allowed_user_ids,
    ...rest
  } = body;
  return {
    ...rest,
    applicable_products: applicable_products ? JSON.stringify(applicable_products) : undefined,
    allowed_account_types: allowed_account_types ? JSON.stringify(allowed_account_types) : undefined,
    allowed_company_ids: allowed_company_ids ? JSON.stringify(allowed_company_ids) : undefined,
    allowed_user_ids: allowed_user_ids ? JSON.stringify(allowed_user_ids) : undefined,
  };
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeCoupon(coupon: any) {
  const { linked_user, _count, ...rest } = coupon;
  return {
    ...rest,
    applicable_products: parseJsonArray(coupon.applicable_products),
    allowed_account_types: parseJsonArray(coupon.allowed_account_types),
    allowed_company_ids: parseJsonArray(coupon.allowed_company_ids),
    allowed_user_ids: parseJsonArray(coupon.allowed_user_ids),
    linked_user_name: linked_user?.name ?? null,
    used_count: _count?.usages ?? 0,
  };
}

// GET /api/coupons
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const type = req.query.coupon_type as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (type) where["coupon_type"] = type;

    const [total, data] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        include: {
          linked_user: { select: { id: true, name: true } },
          _count: { select: { usages: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: data.map(serializeCoupon), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/coupons/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: req.params.id as string },
      include: {
        linked_user: { select: { id: true, name: true } },
        _count: { select: { usages: true } },
        usages: {
          include: { company: { select: { id: true, name: true } } },
          take: 20,
          orderBy: { used_at: "desc" },
        },
      },
    });

    if (!coupon) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }

    res.json(serializeCoupon(coupon));
  } catch (err) {
    next(err);
  }
});

// POST /api/coupons
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.create({ data: toCreateData(req.body) });
    res.status(201).json(serializeCoupon(coupon));
  } catch (err) {
    next(err);
  }
});

// PUT /api/coupons/:id
router.put("/:id", verifyToken, validate(createSchema.partial()), async (req, res, next) => {
  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id as string },
      data: toCreateData(req.body as z.infer<typeof createSchema>),
    });
    res.json(serializeCoupon(coupon));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/coupons/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
