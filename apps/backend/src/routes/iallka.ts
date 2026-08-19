import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { resolveMyAgencyId } from "../lib/project-scope";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { createBulkProjectProducts } from "../lib/project-products-bulk";
import {
  sendIallkaTurn,
  validateProposal,
  type IallkaHistoryTurn,
  type IallkaSelectedProduct,
  type IallkaTurnResult,
} from "../lib/iallka";

const router = Router();

// IALLKA: chat multi-turno que ajuda admin/agência a montar um projeto —
// pergunta o que for preciso, propõe produtos reais do catálogo, e ao ser
// aprovado cria o Project + ProjectProducts de verdade (origin="AI_ASSEMBLY",
// ver lib/project-products-bulk.ts). Mesmo escopo de acesso do combo (ver
// routes/product-bundles.ts): "agencias" é account_type, não role.

const OPENING_MESSAGE =
  "IALLKA pode te ajudar a montar um projeto, basta responder algumas perguntas. Me conte tudo que sabe e deseja para este projeto:";

function isAdmin(req: Request): boolean {
  return req.user!.account_type === "admin" || req.user!.role === "admin";
}

function isDono(req: Request, session: { user_id: string }): boolean {
  return isAdmin(req) || session.user_id === req.user!.id;
}

function toHistory(messages: Array<{ role: string; content: string }>): IallkaHistoryTurn[] {
  return messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

// ── POST /api/iallka/sessions ─────────────────────────────────────────────────

router.post("/sessions", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isAdmin(req) && req.user!.account_type !== "agencias") {
      res.status(403).json({ error: "Só admin ou agência podem usar o assistente IALLKA" });
      return;
    }
    const agencyId = isAdmin(req) ? null : await resolveMyAgencyId(prisma, req.user!.id);

    const session = await prisma.iallkaSession.create({
      data: {
        user_id: req.user!.id,
        agency_id: agencyId,
        messages: { create: { role: "assistant", content: OPENING_MESSAGE } },
      },
      include: { messages: { orderBy: { created_at: "asc" } } },
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/iallka/sessions ───────────────────────────────────────────────────

router.get("/sessions", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.iallkaSession.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/iallka/sessions/:id ──────────────────────────────────────────────

router.get("/sessions/:id", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.iallkaSession.findUnique({
      where: { id: req.params.id as string },
      include: { messages: { orderBy: { created_at: "asc" } } },
    });
    if (!session) {
      res.status(404).json({ error: "Sessão não encontrada" });
      return;
    }
    if (!isDono(req, session)) {
      res.status(403).json({ error: "Sem permissão para ver esta sessão" });
      return;
    }
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/iallka/sessions/:id/messages ────────────────────────────────────

const messageSchema = z.object({ message: z.string().min(1) });

router.post(
  "/sessions/:id/messages",
  verifyToken,
  validate(messageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await prisma.iallkaSession.findUnique({
        where: { id: req.params.id as string },
        include: { messages: { orderBy: { created_at: "asc" } } },
      });
      if (!session) {
        res.status(404).json({ error: "Sessão não encontrada" });
        return;
      }
      if (!isDono(req, session)) {
        res.status(403).json({ error: "Sem permissão para usar esta sessão" });
        return;
      }
      if (session.status === "approved" || session.status === "cancelled") {
        res.status(409).json({ error: "Esta sessão já foi encerrada" });
        return;
      }

      const { message } = req.body as z.infer<typeof messageSchema>;
      const history = toHistory(session.messages);

      let result: IallkaTurnResult;
      try {
        result = await sendIallkaTurn(history, message, req.user!.id);
      } catch (err) {
        next(err);
        return;
      }

      let selectedProducts: IallkaSelectedProduct[] = [];
      if (result.stage === "proposal") {
        selectedProducts = await validateProposal(result.selected_products);
        if (selectedProducts.length === 0) {
          // Nenhum item sobreviveu à validação — volta pra "gathering" em vez
          // de mostrar uma proposta vazia (a IA alucinou tudo, ou o catálogo
          // mudou entre o começo da sessão e agora).
          result = {
            ...result,
            stage: "gathering",
            reply_text:
              "Não consegui montar uma proposta válida com o catálogo atual — pode me dar mais detalhes sobre o que você precisa?",
          };
        } else {
          result = { ...result, selected_products: selectedProducts };
        }
      }

      await prisma.iallkaMessage.create({
        data: { session_id: session.id, role: "user", content: message },
      });
      await prisma.iallkaMessage.create({
        data: {
          session_id: session.id,
          role: "assistant",
          content: result.reply_text,
          structured_payload: JSON.stringify(result),
        },
      });
      await prisma.iallkaSession.update({
        where: { id: session.id },
        data: { status: result.stage === "proposal" ? "proposal" : "gathering" },
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/iallka/sessions/:id/approve ─────────────────────────────────────

router.post("/sessions/:id/approve", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.iallkaSession.findUnique({
      where: { id: req.params.id as string },
      include: { messages: { orderBy: { created_at: "desc" } } },
    });
    if (!session) {
      res.status(404).json({ error: "Sessão não encontrada" });
      return;
    }
    if (!isDono(req, session)) {
      res.status(403).json({ error: "Sem permissão para aprovar esta sessão" });
      return;
    }
    if (session.status === "approved") {
      res.status(409).json({ error: "Esta sessão já foi aprovada" });
      return;
    }

    const lastProposal = session.messages.find(
      (m) => m.role === "assistant" && m.structured_payload,
    );
    const payload = lastProposal?.structured_payload
      ? (JSON.parse(lastProposal.structured_payload) as IallkaTurnResult)
      : null;
    if (!payload || payload.stage !== "proposal" || payload.selected_products.length === 0) {
      res.status(400).json({ error: "Esta sessão ainda não tem uma proposta pronta para aprovar" });
      return;
    }

    // Revalida de novo na hora de aprovar — o catálogo pode ter mudado desde
    // que a proposta foi gerada.
    const selectedProducts = await validateProposal(payload.selected_products);
    if (selectedProducts.length === 0) {
      res.status(422).json({ error: "Os produtos propostos não estão mais disponíveis — peça uma nova proposta" });
      return;
    }

    const project = await createProjectWithSequentialCode(prisma, {
      title: payload.project_title || "Projeto montado pela IALLKA",
      status: "draft",
      lifecycle: "avulso",
      agency_id: session.agency_id,
      created_by_user_id: req.user!.id,
    });

    const projectProducts = await createBulkProjectProducts(prisma, {
      project_id: project.id,
      items: selectedProducts.map((p) => ({ product_id: p.product_id, variation_id: p.variation_id })),
      origin: "AI_ASSEMBLY",
      originAiSessionId: session.id,
    });

    await prisma.iallkaSession.update({
      where: { id: session.id },
      data: { status: "approved", created_project_id: project.id },
    });

    res.status(201).json({ project, project_products: projectProducts });
  } catch (err) {
    next(err);
  }
});

export default router;
