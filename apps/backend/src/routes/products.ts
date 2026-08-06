import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { assertProductContractable, getProductContractability } from "../lib/product-contractability";
import { generateNextProductCode } from "../lib/product-code";

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
  is_active: z.boolean().default(false),
  // Default true, e não false: desligar o aceite do cliente é a exceção, e um
  // produto criado por integração que esqueça o campo deve seguir a regra
  // conservadora (cliente confere) em vez de encerrar tarefa sozinho.
  exige_aprovacao_cliente: z.boolean().default(true),
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
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
            orderBy: { sort_order: "asc" },
          },
          _count: { select: { variations: true, addons: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    const dataWithContractability = await Promise.all(
      data.map(async (product) => {
        const contractability = await getProductContractability(product.id);
        return {
          ...product,
          contractability,
        };
      }),
    );

    res.json({ data: dataWithContractability, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
// Aceita tanto o `id` técnico (cuid/legado) quanto o `product_code`
// amigável ("prod_1") — a URL usa o product_code, mas links antigos ou
// chamadas internas ainda podem usar o id técnico.
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: req.params.id as string },
          { product_code: req.params.id as string },
        ],
      },
      include: {
        variations: true,
        addons: true,
        task_links: {
          where: { catalog_task: { is_active: true } },
          include: { catalog_task: true },
          orderBy: { sort_order: "asc" },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json({
      ...product,
      contractability: await getProductContractability(product.id),
    });
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

      if (rest.is_active === true) {
        throw Object.assign(
          new Error(
            "Este produto não pode ser criado como ativo porque ainda não possui tarefas operacionais vinculadas. Cadastre pelo menos uma tarefa antes de ativá-lo.",
          ),
          { statusCode: 400, code: "PRODUCT_WITHOUT_TASKS" },
        );
      }

      const product_code = await generateNextProductCode(prisma);
      const product = await prisma.product.create({
        data: {
          ...(rest as Parameters<typeof prisma.product.create>[0]["data"]),
          product_code,
          variations: variations ? { create: variations } : undefined,
          addons: addons ? { create: addons } : undefined,
        },
        include: {
          variations: true,
          addons: true,
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
          },
        },
      });

      res.status(201).json({
        ...product,
        contractability: await getProductContractability(product.id),
      });
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

      // Snapshot do estado ANTES de aplicar o update — permite reverter
      // depois (ver GET/POST /:id/versions abaixo). Não bloqueia o
      // salvamento se o snapshot falhar por algum motivo (best-effort).
      const before = await prisma.product.findUnique({
        where: { id: req.params.id as string },
        include: { variations: true, addons: true },
      });

      // Só valida "tem tarefa ativa vinculada" quando o produto está
      // REALMENTE virando ativo (estava inativo, passou a ativo nesse
      // update). Um produto que já está ativo e só teve outro campo
      // editado (ex: descrição) não deve ficar bloqueado por essa regra —
      // senão qualquer produto cuja tarefa vinculada perca o status ativo
      // depois fica com todo o cadastro travado, mesmo pra edições sem
      // relação nenhuma com ativação.
      const isActivating = rest.is_active === true && before?.is_active !== true;
      if (isActivating) {
        await assertProductContractable(req.params.id as string);
      }

      if (before) {
        await prisma.productVersion.create({
          data: {
            product_id: before.id,
            snapshot: JSON.stringify(before),
          },
        });
      }

      const product = await prisma.product.update({
        where: { id: req.params.id as string as string as string },
        data: rest as Parameters<typeof prisma.product.update>[0]["data"],
        include: {
          variations: true,
          addons: true,
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
          },
        },
      });
      res.json({
        ...product,
        contractability: await getProductContractability(product.id),
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/products/:id/versions — histórico de snapshots (mais recente
// primeiro), pra tela de edição mostrar "Histórico" e permitir reverter.
router.get("/:id/versions", verifyToken, async (req, res, next) => {
  try {
    const versions = await prisma.productVersion.findMany({
      where: { product_id: req.params.id as string },
      orderBy: { created_at: "desc" },
      select: { id: true, created_at: true, snapshot: true },
    });
    const summarized = versions.map((v) => {
      let name: string | undefined;
      let short_description: string | undefined;
      try {
        const parsed = JSON.parse(v.snapshot);
        name = parsed.name;
        short_description = parsed.short_description ?? undefined;
      } catch {
        // snapshot corrompido — ainda listamos, só sem prévia
      }
      return { id: v.id, created_at: v.created_at, name, short_description };
    });
    res.json({ data: summarized });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/versions/:versionId/restore — restaura o produto
// pro estado salvo naquela versão. Antes de restaurar, tira um novo
// snapshot do estado ATUAL (assim reverter também é reversível).
router.post(
  "/:id/versions/:versionId/restore",
  verifyToken,
  async (req, res, next) => {
    try {
      const version = await prisma.productVersion.findUnique({
        where: { id: req.params.versionId as string },
      });
      if (!version || version.product_id !== req.params.id) {
        res.status(404).json({ error: "Versão não encontrada" });
        return;
      }

      const current = await prisma.product.findUnique({
        where: { id: req.params.id as string },
        include: { variations: true, addons: true },
      });
      if (!current) {
        res.status(404).json({ error: "Produto não encontrado" });
        return;
      }
      await prisma.productVersion.create({
        data: { product_id: current.id, snapshot: JSON.stringify(current) },
      });

      const snap = JSON.parse(version.snapshot) as Record<string, unknown> & {
        variations?: unknown[];
        addons?: unknown[];
      };
      const {
        id: _id,
        created_at: _ca,
        updated_at: _ua,
        variations: snapVariations,
        addons: snapAddons,
        ...fields
      } = snap;

      await prisma.$transaction([
        prisma.productVariation.deleteMany({ where: { product_id: req.params.id as string } }),
        prisma.productAddon.deleteMany({ where: { product_id: req.params.id as string } }),
        prisma.product.update({
          where: { id: req.params.id as string },
          data: {
            ...(fields as Parameters<typeof prisma.product.update>[0]["data"]),
            variations: Array.isArray(snapVariations) && snapVariations.length
              ? {
                  create: (snapVariations as Record<string, unknown>[]).map(
                    ({ id: _vid, product_id: _pid, created_at: _vca, updated_at: _vua, ...v }) => v,
                  ) as Parameters<typeof prisma.productVariation.create>[0]["data"][],
                }
              : undefined,
            addons: Array.isArray(snapAddons) && snapAddons.length
              ? {
                  create: (snapAddons as Record<string, unknown>[]).map(
                    ({ id: _aid, product_id: _apid, created_at: _aca, ...a }) => a,
                  ) as Parameters<typeof prisma.productAddon.create>[0]["data"][],
                }
              : undefined,
          },
        }),
      ]);

      const restored = await prisma.product.findUnique({
        where: { id: req.params.id as string },
        include: {
          variations: true,
          addons: true,
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
          },
        },
      });
      res.json({
        ...restored,
        contractability: await getProductContractability(req.params.id as string),
      });
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
