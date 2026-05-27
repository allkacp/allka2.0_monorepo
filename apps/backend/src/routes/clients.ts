import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.string().default("ativo"),
  segment: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  // Commercial contact
  commercial_contact_name: z.string().optional(),
  commercial_contact_role: z.string().optional(),
  commercial_contact_email: z.string().email().optional().or(z.literal("")),
  commercial_contact_phone: z.string().optional(),
  commercial_contact_whatsapp: z.string().optional(),
  commercial_contact_preferred_channel: z.string().optional(),
  commercial_contact_notes: z.string().optional(),
  // Financial contact
  financial_contact_name: z.string().optional(),
  financial_contact_role: z.string().optional(),
  financial_contact_email: z.string().email().optional().or(z.literal("")),
  financial_contact_phone: z.string().optional(),
  financial_contact_whatsapp: z.string().optional(),
  financial_contact_preferred_channel: z.string().optional(),
  financial_contact_notes: z.string().optional(),
  financial_contact_user_id: z.string().optional(),
  use_master_as_financial_fallback: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

// GET /api/clients
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
        { cnpj: { contains: search } },
      ];
    }
    if (status) where["status"] = status;

    const [total, data] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
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

// GET /api/clients/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { projects: true, invoices: true } } },
    });

    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }

    res.json(company);
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post(
  "/",
  verifyToken,
  validate(createSchema),
  async (req, res, next) => {
    try {
      const company = await prisma.company.create({ data: req.body });
      res.status(201).json(company);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/clients/:id
router.put(
  "/:id",
  verifyToken,
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const company = await prisma.company.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      res.json(company);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/clients/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Payment Methods ──────────────────────────────────────────────────────────

// GET /api/clients/:id/payment-methods
router.get("/:id/payment-methods", verifyToken, async (req, res, next) => {
  try {
    const methods = await prisma.companyPaymentMethod.findMany({
      where: { company_id: req.params.id as string, is_active: true },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    });
    // Mask holder_name for client cards (only agency-owned cards show full name)
    const sanitized = methods.map((m) => ({
      ...m,
      holder_name: m.is_client_card ? "•••• Titular Externo" : m.holder_name,
    }));
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

const paymentMethodSchema = z.object({
  brand: z.string().min(1),
  last_four: z.string().length(4),
  expiry: z.string().regex(/^\d{2}\/\d{4}$/),
  holder_name: z.string().min(1),
  is_default: z.boolean().optional(),
  is_client_card: z.boolean().optional(),
  label: z.string().optional(),
});

// POST /api/clients/:id/payment-methods
router.post(
  "/:id/payment-methods",
  verifyToken,
  validate(paymentMethodSchema),
  async (req, res, next) => {
    try {
      const { is_default, ...rest } = req.body;
      // If setting as default, unset all others first
      if (is_default) {
        await prisma.companyPaymentMethod.updateMany({
          where: { company_id: req.params.id as string, is_active: true },
          data: { is_default: false },
        });
      }
      const method = await prisma.companyPaymentMethod.create({
        data: {
          ...rest,
          company_id: req.params.id,
          is_default: is_default ?? false,
        },
      });
      res.status(201).json(method);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/clients/:id/payment-methods/:pmId/default
router.patch(
  "/:id/payment-methods/:pmId/default",
  verifyToken,
  async (req, res, next) => {
    try {
      await prisma.companyPaymentMethod.updateMany({
        where: { company_id: req.params.id as string, is_active: true },
        data: { is_default: false },
      });
      const method = await prisma.companyPaymentMethod.update({
        where: { id: req.params.pmId as string },
        data: { is_default: true },
      });
      res.json(method);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/clients/:id/payment-methods/:pmId
router.delete(
  "/:id/payment-methods/:pmId",
  verifyToken,
  async (req, res, next) => {
    try {
      await prisma.companyPaymentMethod.update({
        where: { id: req.params.pmId as string },
        data: { is_active: false },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
