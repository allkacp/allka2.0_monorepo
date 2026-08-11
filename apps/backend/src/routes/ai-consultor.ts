import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  fillBriefingWithAI,
  improveAnswerWithAI,
  improveProductField,
  researchProductPricing,
  researchSpecialtyMarket,
  researchEmergingSpecialties,
} from "../lib/ai-consultor";

const router = Router();

// "Consultor IA" — endpoints usados pelo TaskLaunchDrawer (preencher/melhorar
// o briefing de uma tarefa). Sempre requer login; qualquer conta autenticada
// pode usar (o dado sensível aqui é a chave do Gemini, guardada só no
// backend — nunca chega no frontend).

const questionSchema = z.object({
  question_key: z.string().min(1),
  question_text: z.string().min(1),
  type: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const fillBriefingSchema = z.object({
  free_text: z.string().min(1, "Descreva as informações do cliente antes de enviar"),
  questions: z.array(questionSchema).min(1),
  project_id: z.string().optional(),
  use_project_documents: z.boolean().optional(),
});

// POST /api/ai-consultor/fill-briefing
router.post(
  "/fill-briefing",
  verifyToken,
  validate(fillBriefingSchema),
  async (req, res, next) => {
    try {
      const { free_text, questions, project_id, use_project_documents } = req.body as z.infer<
        typeof fillBriefingSchema
      >;
      const answers = await fillBriefingWithAI(free_text, questions, {
        projectId: project_id,
        useProjectDocuments: use_project_documents,
      });
      res.json({ answers });
    } catch (err) {
      next(err);
    }
  },
);

const improveAnswerSchema = z.object({
  question_text: z.string().min(1),
  current_answer: z.string().optional().default(""),
  type: z.string().optional(),
});

// POST /api/ai-consultor/improve-answer
router.post(
  "/improve-answer",
  verifyToken,
  validate(improveAnswerSchema),
  async (req, res, next) => {
    try {
      const { question_text, current_answer, type } = req.body as z.infer<
        typeof improveAnswerSchema
      >;
      const improved_answer = await improveAnswerWithAI(question_text, current_answer, type);
      res.json({ improved_answer });
    } catch (err) {
      next(err);
    }
  },
);

const improveProductFieldSchema = z.object({
  field_label: z.string().min(1),
  current_value: z.string().optional().default(""),
  mode: z.enum(["text", "list"]).optional().default("text"),
  length: z.enum(["manter", "curto", "medio", "longo"]).optional().default("manter"),
  approach: z.enum(["melhorar", "recriar"]).optional().default("melhorar"),
  context: z
    .object({
      name: z.string().optional(),
      category: z.string().optional(),
      price: z.union([z.string(), z.number()]).optional(),
      other_fields: z.record(z.string()).optional(),
    })
    .optional()
    .default({}),
});

// POST /api/ai-consultor/improve-product-field — usado no admin/produtos
// (cadastro/edição de produto), um botão "Melhorar com IA" por campo.
router.post(
  "/improve-product-field",
  verifyToken,
  validate(improveProductFieldSchema),
  async (req, res, next) => {
    try {
      const { field_label, current_value, mode, length, approach, context } = req.body as z.infer<
        typeof improveProductFieldSchema
      >;
      const improved_value = await improveProductField(
        field_label,
        current_value,
        {
          name: context.name,
          category: context.category,
          price: context.price,
          otherFields: context.other_fields,
        },
        mode,
        length,
        approach,
      );
      res.json({ improved_value });
    } catch (err) {
      next(err);
    }
  },
);

const researchProductPricingSchema = z.object({
  product_name: z.string().optional().default(""),
  category: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

// POST /api/ai-consultor/research-product-pricing — botão "Pesquisar preço de
// mercado com IA" no admin/produtos. Usa busca real no Google (Gemini
// grounding) — mais lento e mais caro que os outros endpoints, só disparar
// quando o usuário clicar explicitamente.
router.post(
  "/research-product-pricing",
  verifyToken,
  validate(researchProductPricingSchema),
  async (req, res, next) => {
    try {
      const { product_name, category, description } = req.body as z.infer<
        typeof researchProductPricingSchema
      >;
      const result = await researchProductPricing(product_name, category, description);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

const researchSpecialtySchema = z.object({
  specialty_name: z.string().optional().default(""),
  category: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

// POST /api/ai-consultor/research-specialty-market — botão "Pesquisar
// mercado com IA" no admin/especialidades, por especialidade.
router.post(
  "/research-specialty-market",
  verifyToken,
  validate(researchSpecialtySchema),
  async (req, res, next) => {
    try {
      const { specialty_name, category, description } = req.body as z.infer<
        typeof researchSpecialtySchema
      >;
      const result = await researchSpecialtyMarket(specialty_name, category, description);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

const researchEmergingSchema = z.object({
  category_hint: z.string().optional(),
});

// POST /api/ai-consultor/research-emerging-specialties — botão de página
// inteira no admin/especialidades ("Pesquisar novas especialidades").
router.post(
  "/research-emerging-specialties",
  verifyToken,
  validate(researchEmergingSchema),
  async (req, res, next) => {
    try {
      const { category_hint } = req.body as z.infer<typeof researchEmergingSchema>;
      const result = await researchEmergingSpecialties(category_hint);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
