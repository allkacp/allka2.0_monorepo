import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  fillBriefingWithAI,
  improveAnswerWithAI,
  improveProductField,
  improveFeedbackTicket,
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

export const MIN_PALAVRAS_IA = 5;
const improveProductFieldSchema = z.object({
  field_label: z.string().min(1),
  current_value: z.string().optional().default(""),
  mode: z.enum(["text", "list"]).optional().default("text"),
  length: z.enum(["manter", "curto", "medio", "longo"]).optional().default("manter"),
  approach: z.enum(["melhorar", "recriar"]).optional().default("melhorar"),
  research: z.boolean().optional().default(false),
  // Limites opcionais pedidos pelo usuário (reunião 2026-10-05).
  max_words: z.number().int().min(1).max(5000).nullish(),
  max_chars: z.number().int().min(1).max(50000).nullish(),
  // Mínimos (2026-10-06): evita texto curto demais.
  min_words: z.number().int().min(1).max(5000).nullish(),
  min_chars: z.number().int().min(1).max(50000).nullish(),
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
      const { field_label, current_value, mode, length, approach, context, research, max_words, max_chars, min_words, min_chars } = req.body as z.infer<
        typeof improveProductFieldSchema
      >;
      // Regra (ajustada em 2026-10-06): basta o NOME do produto — com ele a IA pesquisa na internet e escreve o campo do zero.
      // Sem nome e sem nenhum texto no campo, não há de onde partir.
      const palavras = current_value.trim().split(/\s+/).filter(Boolean).length;
      const temNome = !!context.name?.trim();
      if (palavras < 1 && !temNome) {
        res.status(422).json({ error: "Informe o nome do produto (ou escreva algo no campo) antes de usar a IA.", code: "ai_min_words" });
        return;
      }
      if ((min_words && max_words && min_words > max_words) || (min_chars && max_chars && min_chars > max_chars)) {
        res.status(422).json({ error: "O mínimo não pode ser maior que o máximo.", code: "ai_limits_invalid" });
        return;
      }
      // Pouco texto no campo: a IA parte do nome e PESQUISA na internet para montar o conteúdo.
      const pesquisar = research || palavras < MIN_PALAVRAS_IA;
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
        pesquisar,
        { maxWords: max_words, maxChars: max_chars, minWords: min_words, minChars: min_chars },
      );
      res.json({ improved_value });
    } catch (err) {
      next(err);
    }
  },
);

const improveFeedbackTicketSchema = z.object({
  type: z.string().min(1),
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),
  steps: z.string().optional().default(""),
  expected_result: z.string().optional().default(""),
  actual_result: z.string().optional().default(""),
});

// POST /api/ai-consultor/improve-feedback-ticket — botão "Melhorar com IA" no
// formulário "Ajuda e sugestões" (product-feedback-widget.tsx). Reescreve o
// conjunto de campos do chamado em linguagem clara para o desenvolvedor/QA
// que vai tratar — nunca inventa conteúdo pra campo vazio.
router.post(
  "/improve-feedback-ticket",
  verifyToken,
  validate(improveFeedbackTicketSchema),
  async (req, res, next) => {
    try {
      const { type, title, description, steps, expected_result, actual_result } = req.body as z.infer<
        typeof improveFeedbackTicketSchema
      >;
      const improved = await improveFeedbackTicket(
        { title, description, steps, expectedResult: expected_result, actualResult: actual_result },
        type,
      );
      res.json({
        title: improved.title,
        description: improved.description,
        steps: improved.steps,
        expected_result: improved.expectedResult,
        actual_result: improved.actualResult,
      });
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
