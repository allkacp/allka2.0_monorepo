import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { fillBriefingWithAI, improveAnswerWithAI } from "../lib/ai-consultor";

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
});

// POST /api/ai-consultor/fill-briefing
router.post(
  "/fill-briefing",
  verifyToken,
  validate(fillBriefingSchema),
  async (req, res, next) => {
    try {
      const { free_text, questions } = req.body as z.infer<typeof fillBriefingSchema>;
      const answers = await fillBriefingWithAI(free_text, questions);
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

export default router;
