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
      where: { id: (req.params.id as string) },
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
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:id
router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clients/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
