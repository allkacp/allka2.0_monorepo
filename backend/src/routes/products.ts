import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const variationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_modifier: z.number().default(0),
  features: z.string().optional(),
});

const addonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category: z.string().min(1),
  tags: z.string().optional(),
  base_price: z.number().min(0).default(0),
  complexity: z
    .enum(["basic", "intermediate", "advanced", "premium"])
    .default("basic"),
  visibility: z.string().optional(),
  image: z.string().optional(),
  demonstrations: z.string().optional(),
  completion_time: z.string().optional(),
  metadata: z.string().optional(),
  is_active: z.boolean().default(true),
  variations: z.array(variationSchema).optional(),
  addons: z.array(addonSchema).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/products
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = req.query.category as string | undefined;
    const complexity = req.query.complexity as string | undefined;
    const search = req.query.search as string | undefined;
    const is_active = req.query.is_active;

    const where: Record<string, unknown> = {};
    if (category) where["category"] = category;
    if (complexity) where["complexity"] = complexity;
    if (is_active !== undefined) where["is_active"] = is_active === "true";
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          variations: true,
          addons: true,
          _count: { select: { variations: true, addons: true } },
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

// GET /api/products/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string as string as string },
      include: { variations: true, addons: true },
    });

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post(
  "/",
  verifyToken,
  validate(createSchema),
  async (req, res, next) => {
    try {
      const { variations, addons, ...rest } = req.body as {
        variations?: {
          name: string;
          description?: string;
          price_modifier: number;
          features?: string;
        }[];
        addons?: {
          name: string;
          description?: string;
          price: number;
          category?: string;
        }[];
        [key: string]: unknown;
      };

      const product = await prisma.product.create({
        data: {
          ...(rest as Parameters<typeof prisma.product.create>[0]["data"]),
          variations: variations ? { create: variations } : undefined,
          addons: addons ? { create: addons } : undefined,
        },
        include: { variations: true, addons: true },
      });

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/products/:id
router.put(
  "/:id",
  verifyToken,
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const {
        variations: _v,
        addons: _a,
        ...rest
      } = req.body as Record<string, unknown>;

      const product = await prisma.product.update({
        where: { id: req.params.id as string as string as string },
        data: rest as Parameters<typeof prisma.product.update>[0]["data"],
        include: { variations: true, addons: true },
      });
      res.json(product);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/products/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id as string as string as string },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/variations
router.post(
  "/:id/variations",
  verifyToken,
  validate(variationSchema),
  async (req, res, next) => {
    try {
      const variation = await prisma.productVariation.create({
        data: {
          ...req.body,
          product_id: req.params.id as string as string as string,
        },
      });
      res.status(201).json(variation);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/products/:id/variations/:vid
router.delete("/:id/variations/:vid", verifyToken, async (req, res, next) => {
  try {
    await prisma.productVariation.delete({
      where: { id: req.params.vid as string as string as string },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/addons
router.post(
  "/:id/addons",
  verifyToken,
  validate(addonSchema),
  async (req, res, next) => {
    try {
      const addon = await prisma.productAddon.create({
        data: {
          ...req.body,
          product_id: req.params.id as string as string as string,
        },
      });
      res.status(201).json(addon);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/products/:id/addons/:aid
router.delete("/:id/addons/:aid", verifyToken, async (req, res, next) => {
  try {
    await prisma.productAddon.delete({
      where: { id: req.params.aid as string as string as string },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
