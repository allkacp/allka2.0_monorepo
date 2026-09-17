import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { resolveMyAgencyId, resolveProjectNewScope, getProjectScope, projectInScope } from "../lib/project-scope";
import { buildProjectBriefingText } from "../lib/iallka-knowledge";
import {
  buildCatalog2ProductAuraContext,
  resolveCatalog2QuoteAuraContext,
  buildCatalog2HistoryAuraContext,
} from "../lib/iallka-catalog2-context";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { createBulkProjectProducts } from "../lib/project-products-bulk";
import {
  sendIallkaTurn,
  validateProposal,
  validateCatalog2Recommendations,
  type IallkaHistoryTurn,
  type IallkaSelectedProduct,
  type IallkaTurnResult,
} from "../lib/iallka";

const router = Router();

// IALLKA: chat multi-turno que ajuda a montar um projeto — pergunta o que
// for preciso, propõe produtos reais do catálogo, e ao ser aprovado cria o
// Project + ProjectProducts de verdade (origin="AI_ASSEMBLY", ver
// lib/project-products-bulk.ts).
//
// Correção 2026-09-11 ("acesso da IAllka"): o acesso era só Admin Master ou
// Agency — Company via 403 clicando no ícone global, o que não fazia
// sentido pro objetivo da reunião (Catálogo/Projetos ajudando quem
// realmente contrata). Agora: Admin MASTER (nunca admin comum — mesma regra
// de sempre, evaluateAdminMasterAccess), Agency (account_type "agencias",
// que já cobre Partner — Partner nunca é um 4º tipo de conta, é sempre a
// mesma Agency com PartnerProfile ativo, ver project-scope.ts) e Company
// (account_type "empresas"). Léder/Nômade continuam de fora daqui (não
// precisam montar/contratar produto) — o ícone simplesmente não aparece
// pra eles no frontend.
//
// Isolamento entre contas continua por dono da sessão (user_id) — nunca por
// organização — então "Company A não vê sessão de Company B" já valia antes
// e continua valendo. O que muda de verdade é o momento de aprovar: em vez
// de gravar o vínculo de organização uma vez na criação, ele é resolvido de
// novo na hora de aprovar (resolveProjectNewScope, a mesma função usada na
// criação real de projetos em routes/projects.ts) — nunca cria um projeto
// "solto" (sem agency_id/company_id) pra quem não é Admin Master.

const OPENING_MESSAGE =
  "Olá! Eu sou a Aura, a inteligência artificial da Allka. Reconheço a tela em que você está e posso ajudar com o que você precisa fazer nela. Por onde começamos?";

async function isAdminMaster(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { account_type: true, admin_profile: { select: { is_active: true, is_master: true, permissions: { select: { module: true, action: true } } } } },
  });
  if (!user) return false;
  return evaluateAdminMasterAccess(user.account_type, user.admin_profile ?? null);
}

async function canUseIallka(req: Request): Promise<boolean> {
  if (req.user!.account_type === "agencias" || req.user!.account_type === "empresas") return true;
  return isAdminMaster(req.user!.id);
}

async function isDono(req: Request, session: { user_id: string }): Promise<boolean> {
  if (session.user_id === req.user!.id) return true;
  // Admin Master pode ler/atuar em qualquer sessão só pra suporte — nunca o
  // caminho inverso (uma conta comum nunca usa isto como atalho pra ver a
  // sessão de outra conta).
  return isAdminMaster(req.user!.id);
}

function toHistory(messages: Array<{ role: string; content: string }>): IallkaHistoryTurn[] {
  return messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

// ── POST /api/iallka/sessions ─────────────────────────────────────────────────

router.post("/sessions", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canUseIallka(req))) {
      res.status(403).json({ error: "A Aura ainda não está disponível para este tipo de conta" });
      return;
    }
    // Só informativo na criação (auditoria/debug) — o vínculo real usado
    // pra criar o projeto é sempre RE-resolvido na hora de aprovar (ver
    // rota /approve), nunca confiado neste valor congelado no início.
    const agencyId = req.user!.account_type === "agencias" ? await resolveMyAgencyId(prisma, req.user!.id) : null;

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
    if (!(await isDono(req, session))) {
      res.status(403).json({ error: "Sem permissão para ver esta sessão" });
      return;
    }
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/iallka/sessions/:id/messages ────────────────────────────────────

// `project_id` opcional (reunião 10/09, "base de conhecimento — briefings"):
// permite anexar o briefing PRIVADO de um projeto próprio a este turno —
// validado abaixo contra o escopo real da conta (nunca persistido na
// sessão, nunca cacheado, nunca vazado pra outra conta/turno).
//
// `product_id`/`quote_id` opcionais (Item 9, reunião 2026-09-14,
// "Atualizar o contexto da Aura") — mesma regra: só HINTS do frontend,
// SEMPRE reautorizados/reresolvidos aqui contra o dono real da sessão antes
// de virar contexto de prompt (ver lib/iallka-catalog2-context.ts).
const messageSchema = z.object({
  message: z.string().min(1),
  project_id: z.string().optional(),
  product_id: z.string().optional(),
  quote_id: z.string().optional(),
});

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
      if (!(await isDono(req, session))) {
        res.status(403).json({ error: "Sem permissão para usar esta sessão" });
        return;
      }
      if (session.status === "approved" || session.status === "cancelled") {
        res.status(409).json({ error: "Esta sessão já foi encerrada" });
        return;
      }

      const { message, project_id, product_id, quote_id } = req.body as z.infer<typeof messageSchema>;
      const history = toHistory(session.messages);

      // Vínculo organizacional do DONO da sessão (nunca de quem está
      // usando, no caso raro de suporte via Admin Master) — decide se ele
      // vê o catálogo2 inteiro (Admin Master) ou só o realmente contratável
      // (Company/Agency/Partner), mesma regra de checkClientVisibility.
      const owner = await prisma.user.findUnique({ where: { id: session.user_id }, select: { account_type: true, role: true } });
      const ownerIsAdminMaster = await isAdminMaster(session.user_id);

      let projectBriefing: Awaited<ReturnType<typeof buildProjectBriefingText>> = null;
      if (project_id) {
        const scope = await getProjectScope(prisma, session.user_id, owner?.account_type ?? "");
        const project = await prisma.project.findUnique({ where: { id: project_id }, select: { agency: true, client_id: true } });
        if (!project || !projectInScope(scope, project)) {
          res.status(403).json({ error: "Este projeto não pertence à sua conta" });
          return;
        }
        projectBriefing = await buildProjectBriefingText(project_id);
      }

      // Item 9: `product_id`/`quote_id` são só HINTS — cada builder
      // reresolve/reautoriza contra o dono real da sessão; um id
      // inexistente, não visível, ou de outra conta simplesmente não vira
      // contexto (a Aura informa que não tem essa informação, nunca 403 —
      // troca de tela/produto sem contexto antigo não é um erro de acesso).
      const catalog2Product = product_id
        ? await buildCatalog2ProductAuraContext(product_id, { isAdminMaster: ownerIsAdminMaster, clientVisibleOnly: !ownerIsAdminMaster })
        : null;
      let catalog2Quote: Awaited<ReturnType<typeof resolveCatalog2QuoteAuraContext>>["content"] = null;
      if (quote_id) {
        const resolved = await resolveCatalog2QuoteAuraContext(quote_id, session.user_id, owner?.account_type ?? "", owner?.role ?? "", ownerIsAdminMaster);
        if (!resolved.authorized) {
          res.status(403).json({ error: "Esta cotação não pertence à sua conta" });
          return;
        }
        catalog2Quote = resolved.content;
      }
      const catalog2History = product_id && ownerIsAdminMaster ? await buildCatalog2HistoryAuraContext(product_id, true) : null;

      let result: IallkaTurnResult;
      try {
        result = await sendIallkaTurn(history, message, req.user!.id, {
          isAdminMaster: ownerIsAdminMaster,
          clientVisibleOnly: !ownerIsAdminMaster,
          projectBriefing,
          catalog2Product,
          catalog2Quote,
          catalog2History,
        });
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

      // O Catalog2 tem um caminho comercial próprio. A IAllka pode
      // recomendá-lo com base nos 4Fs, mas nunca transforma essa sugestão em
      // projeto/cotação automaticamente nem deixa um rascunho parecer oferta.
      result = {
        ...result,
        catalog2_recommendations: await validateCatalog2Recommendations(result.catalog2_recommendations ?? []),
      };

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
    if (!(await isDono(req, session))) {
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

    // Vínculo organizacional do projeto SEMPRE resolvido de novo aqui, a
    // partir da conta DONA da sessão (nunca de quem está aprovando — um
    // Admin Master pode aprovar em nome de suporte, mas o projeto criado
    // pertence à conta que pediu, nunca ao admin). Mesma função usada pra
    // criar projeto de verdade em routes/projects.ts — nunca uma segunda
    // regra de vínculo divergente.
    const owner = await prisma.user.findUnique({ where: { id: session.user_id }, select: { account_type: true } });
    const scope = await resolveProjectNewScope(prisma, session.user_id, owner?.account_type ?? "");
    let orgData: { agency_id?: string; partner_id?: string; company_id?: string } = {};
    if (scope.kind === "agency") {
      orgData = { agency_id: scope.agencyId, ...(scope.partnerId ? { partner_id: scope.partnerId } : {}) };
    } else if (scope.kind === "company") {
      orgData = { company_id: scope.companyId };
    } else if (!(await isAdminMaster(session.user_id))) {
      // Conta comum (agency/empresa) sem vínculo organizacional nenhum —
      // nunca cria um projeto "solto"/sem dono real. Admin Master é a única
      // exceção estrutural (já era assim antes desta correção).
      res.status(422).json({ error: "Sua conta ainda não está vinculada a uma agência ou empresa — não é possível criar o projeto." });
      return;
    }

    const project = await createProjectWithSequentialCode(prisma, {
      title: payload.project_title || "Projeto montado pela Aura",
      status: "draft",
      lifecycle: "avulso",
      ...orgData,
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
