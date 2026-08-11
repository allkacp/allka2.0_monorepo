import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Uso e Custos de IA (admin > Configurações) — quanto cada serviço de IA
// plugado na plataforma está custando, com base nos tokens que a própria
// resposta do modelo devolve × o preço configurado (ver lib/ai-usage-tracker.ts,
// que grava cada chamada em AIUsageLog). Só admin acessa.
router.use(verifyToken, requireRole("admin"));

function monthRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
}

function dayRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: now };
}

// GET /api/ai-usage/summary — visão geral por serviço, pra tela principal
router.get("/summary", async (_req, res, next) => {
  try {
    const services = await prisma.aIServiceConfig.findMany({
      orderBy: { created_at: "asc" },
      include: { model_pricing: { orderBy: { model: "asc" } } },
    });

    const { from: monthFrom, to: monthTo } = monthRange();
    const { from: dayFrom, to: dayTo } = dayRange();

    const summaries = await Promise.all(
      services.map(async (service) => {
        const [monthAgg, todayAgg, allTimeAgg, byFeature] = await Promise.all([
          prisma.aIUsageLog.aggregate({
            where: { service_id: service.id, created_at: { gte: monthFrom, lte: monthTo } },
            _sum: { estimated_cost_usd: true, total_tokens: true },
            _count: true,
          }),
          prisma.aIUsageLog.aggregate({
            where: { service_id: service.id, created_at: { gte: dayFrom, lte: dayTo } },
            _sum: { estimated_cost_usd: true },
            _count: true,
          }),
          prisma.aIUsageLog.aggregate({
            where: { service_id: service.id },
            _sum: { estimated_cost_usd: true },
            _count: true,
          }),
          prisma.aIUsageLog.groupBy({
            by: ["feature"],
            where: { service_id: service.id, created_at: { gte: monthFrom, lte: monthTo } },
            _sum: { estimated_cost_usd: true, total_tokens: true },
            _count: true,
          }),
        ]);

        const spendThisMonth = monthAgg._sum.estimated_cost_usd ?? 0;
        const budget = service.monthly_budget_usd ?? null;
        const budgetUsedPct = budget && budget > 0 ? Math.round((spendThisMonth / budget) * 1000) / 10 : null;
        const alert = budget != null && budgetUsedPct != null && budgetUsedPct >= service.alert_threshold_pct;

        return {
          id: service.id,
          key: service.key,
          name: service.name,
          provider: service.provider,
          is_active: service.is_active,
          monthly_budget_usd: service.monthly_budget_usd,
          alert_threshold_pct: service.alert_threshold_pct,
          model_pricing: service.model_pricing,
          spend_today_usd: todayAgg._sum.estimated_cost_usd ?? 0,
          calls_today: todayAgg._count,
          spend_this_month_usd: spendThisMonth,
          tokens_this_month: monthAgg._sum.total_tokens ?? 0,
          calls_this_month: monthAgg._count,
          spend_all_time_usd: allTimeAgg._sum.estimated_cost_usd ?? 0,
          calls_all_time: allTimeAgg._count,
          budget_used_pct: budgetUsedPct,
          alert,
          by_feature_this_month: byFeature.map((f) => ({
            feature: f.feature,
            calls: f._count,
            tokens: f._sum.total_tokens ?? 0,
            cost_usd: f._sum.estimated_cost_usd ?? 0,
          })),
        };
      }),
    );

    res.json({ services: summaries });
  } catch (err) {
    next(err);
  }
});

const createServiceSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  name: z.string().min(2).max(120),
  provider: z.string().max(120).optional(),
});

// POST /api/ai-usage/services — cadastra um novo provedor de IA (ex: uma
// futura API de imagem/vídeo). Só cria o registro de custo/orçamento — a
// chamada de verdade pra essa API ainda precisa ser implementada em código.
router.post("/services", validate(createServiceSchema), async (req, res, next) => {
  try {
    const { key, name, provider } = req.body as z.infer<typeof createServiceSchema>;
    const existing = await prisma.aIServiceConfig.findUnique({ where: { key } });
    if (existing) {
      res.status(409).json({ error: "Já existe um serviço com essa chave" });
      return;
    }
    const service = await prisma.aIServiceConfig.create({ data: { key, name, provider } });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

const createModelPricingSchema = z
  .object({
    model: z.string().min(1).max(120),
    pricing_unit: z.enum(["tokens", "image", "video_second", "request", "minute"]).default("tokens"),
    input_price_per_million: z.number().min(0).optional(),
    output_price_per_million: z.number().min(0).optional(),
    unit_price: z.number().min(0).optional(),
  })
  .refine(
    (v) =>
      v.pricing_unit === "tokens"
        ? v.input_price_per_million != null && v.output_price_per_million != null
        : v.unit_price != null,
    { message: "Informe o preço correspondente ao tipo de cobrança escolhido" },
  );

// POST /api/ai-usage/services/:key/models — adiciona um modelo/preço novo a
// um serviço já cadastrado.
router.post(
  "/services/:key/models",
  validate(createModelPricingSchema),
  async (req, res, next) => {
    try {
      const service = await prisma.aIServiceConfig.findUnique({ where: { key: req.params.key as string } });
      if (!service) {
        res.status(404).json({ error: "Serviço de IA não encontrado" });
        return;
      }
      const data = req.body as z.infer<typeof createModelPricingSchema>;
      const existing = await prisma.aIModelPricing.findUnique({
        where: { service_id_model: { service_id: service.id, model: data.model } },
      });
      if (existing) {
        res.status(409).json({ error: "Já existe um preço cadastrado para esse modelo" });
        return;
      }
      const pricing = await prisma.aIModelPricing.create({
        data: {
          service_id: service.id,
          model: data.model,
          pricing_unit: data.pricing_unit,
          input_price_per_million: data.input_price_per_million,
          output_price_per_million: data.output_price_per_million,
          unit_price: data.unit_price,
        },
      });
      res.status(201).json(pricing);
    } catch (err) {
      next(err);
    }
  },
);

const updateServiceSchema = z.object({
  monthly_budget_usd: z.number().nullable().optional(),
  alert_threshold_pct: z.number().int().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

// PUT /api/ai-usage/services/:key — teto mensal / alerta / ativo
router.put("/services/:key", validate(updateServiceSchema), async (req, res, next) => {
  try {
    const service = await prisma.aIServiceConfig.findUnique({ where: { key: req.params.key as string } });
    if (!service) {
      res.status(404).json({ error: "Serviço de IA não encontrado" });
      return;
    }
    const data = req.body as z.infer<typeof updateServiceSchema>;
    const updated = await prisma.aIServiceConfig.update({
      where: { id: service.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const updatePricingSchema = z.object({
  input_price_per_million: z.number().min(0).optional(),
  output_price_per_million: z.number().min(0).optional(),
  unit_price: z.number().min(0).optional(),
});

// PUT /api/ai-usage/pricing/:id — preço por 1M tokens de um modelo
router.put("/pricing/:id", validate(updatePricingSchema), async (req, res, next) => {
  try {
    const pricing = await prisma.aIModelPricing.findUnique({ where: { id: req.params.id as string } });
    if (!pricing) {
      res.status(404).json({ error: "Preço de modelo não encontrado" });
      return;
    }
    const data = req.body as z.infer<typeof updatePricingSchema>;
    const updated = await prisma.aIModelPricing.update({ where: { id: pricing.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
