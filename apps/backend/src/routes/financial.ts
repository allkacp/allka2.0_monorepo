import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission, evaluateAnyPermission } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { recordWalletEvent } from "../lib/wallet-service";

const router = Router();

// Resolve o Nomade vinculado à sessão autenticada — nunca confiar num
// nomade_id enviado pelo cliente pra decidir de quem é o quê (ver GET/:id
// e POST abaixo). Mesma ideia de "derive o dono da sessão" já usada pelo
// escopo de nômade em GET /withdrawals.
async function resolveOwnNomadeId(userId: string): Promise<string | null> {
  const nomade = await prisma.nomade.findUnique({ where: { user_id: userId }, select: { id: true } });
  return nomade?.id ?? null;
}

const createSchema = z.object({
  nomade_id: z.string().min(1),
  amount: z.number().positive(),
  pix_key: z.string().optional(),
  pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
  notes: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum([
    "aguardando_analise",
    "pagamento_agendado",
    "pagamento_efetuado",
    "cancelado",
    "reprovado",
  ]),
  notes: z.string().optional(),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
});

// GET /api/financial/withdrawals
router.get("/withdrawals", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const nomade_id = req.query.nomade_id as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (nomade_id) where["nomade_id"] = nomade_id;

    // Nomad users can only see their own withdrawals
    if (req.user?.role === "nomad" || req.user?.role === "nomad_admin") {
      where["nomade"] = { user_id: req.user.id };
    } else if (req.user?.account_type !== "admin") {
      // Empresa, agência, parceiro/líder: nenhum motivo legítimo pra ver
      // saques de nômade — nunca existiu tela nem fluxo do produto pra
      // isso. Sem esse corte, a rota devolvia a lista inteira (nome,
      // e-mail, chave PIX, valor) de todos os nômades pra qualquer sessão
      // válida.
      res.json({ data: [], total: 0, page, limit });
      return;
    }

    const [total, data] = await Promise.all([
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.findMany({
        where,
        include: { nomade: { select: { id: true, name: true, email: true } } },
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

// GET /api/financial/withdrawals/:id
router.get("/withdrawals/:id", verifyToken, async (req, res, next) => {
  try {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: (req.params.id as string) },
      include: { nomade: true },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }

    const isAdmin = req.user?.account_type === "admin";
    const isOwner = req.user?.id != null && withdrawal.nomade?.user_id === req.user.id;
    if (!isAdmin && !isOwner) {
      // 404, não 403 — não confirma pra quem não tem relação com o
      // registro que ele de fato existe (evita enumeração).
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }

    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// POST /api/financial/withdrawals
// Nômade solicitando o próprio saque: o nomade_id nunca vem do corpo da
// requisição, é sempre resolvido pelo vínculo real da sessão — senão um
// nômade logado poderia solicitar saque em nome de outro só trocando o
// nomade_id enviado. Admin continua podendo cadastrar em nome de um
// nômade (ex.: pedido recebido por outro canal), mas só com a mesma
// permissão administrativa já usada pra aprovar/excluir saques
// (module "sistema", action "create") — não é liberado pra qualquer
// account_type diferente de nômade.
router.post("/withdrawals", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const isNomadeSelf = req.user?.role === "nomad" || req.user?.role === "nomad_admin";
    let nomadeId = req.body.nomade_id as string;

    if (isNomadeSelf) {
      const ownNomadeId = await resolveOwnNomadeId(req.user!.id);
      if (!ownNomadeId) {
        res.status(403).json({ error: "Usuário não está vinculado a um cadastro de nômade" });
        return;
      }
      nomadeId = ownNomadeId;
    } else if (req.user?.account_type === "admin") {
      const admin = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          admin_profile: {
            select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } },
          },
        },
      });
      if (!evaluateAnyPermission(admin?.admin_profile, [["sistema", "create"]])) {
        res.status(403).json({ error: "Seu perfil de acesso não permite cadastrar saques em nome de um nômade." });
        return;
      }
      // nomadeId permanece o valor enviado no corpo — admin agindo por terceiro.
    } else {
      res.status(403).json({ error: "Você não tem permissão para solicitar saques" });
      return;
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: { ...req.body, nomade_id: nomadeId },
      include: { nomade: { select: { id: true, name: true } } },
    });
    res.status(201).json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// PUT /api/financial/withdrawals/:id — review/update status
// Aprova, agenda, rejeita ou cancela um saque, e pode disparar débito real
// na carteira do nômade (recordWalletEvent abaixo) — só admin com permissão
// administrativa (module "sistema", action "edit") pode chamar. Mesma
// política adotada no lote de segurança anterior (ver routes/products.ts).
router.put(
  "/withdrawals/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "edit"),
  validate(reviewSchema),
  async (req, res, next) => {
  try {
    const { status, notes, scheduled_for } = req.body as {
      status: string;
      notes?: string;
      scheduled_for?: string;
    };

    // Capture previous status to detect the "pagamento_efetuado" transition
    const previous = await prisma.withdrawalRequest.findUnique({
      where: { id: req.params.id as string },
      select: { status: true, nomade_id: true, amount: true },
    });

    const data: Record<string, unknown> = {
      status,
      reviewed_by: req.user?.id,
      reviewed_at: new Date(),
    };
    if (notes) data["notes"] = notes;
    if (scheduled_for) data["scheduled_for"] = new Date(scheduled_for);
    if (status === "pagamento_efetuado") data["paid_at"] = new Date();

    const withdrawal = await prisma.withdrawalRequest.update({
      where: { id: (req.params.id as string) },
      data,
      include: { nomade: { select: { id: true, name: true } } },
    });

    // ── Registro na carteira (não bloqueia o fluxo) ────────────────────────────
    // Debita a carteira do nômade apenas na transição para "pagamento_efetuado".
    if (previous?.status !== "pagamento_efetuado" && status === "pagamento_efetuado" && previous?.nomade_id) {
      await recordWalletEvent("nomad", previous.nomade_id, {
        type: "withdrawal",
        direction: "debit",
        amount: previous.amount,
        description: `Saque efetuado — solicitação ${withdrawal.id}`,
        idempotencyKey: `wd_debit_${withdrawal.id}`,
        referenceType: "withdrawal",
        referenceId: withdrawal.id,
        createdBy: req.user?.id,
        metadata: { withdrawal_id: withdrawal.id, nomade_id: previous.nomade_id },
      });
    }

    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/financial/withdrawals/:id
// Exclusão física do registro do saque — distinto de cancelar (PUT acima
// com status "cancelado", que preserva o histórico). Só admin com
// permissão administrativa (module "sistema", action "delete").
router.delete(
  "/withdrawals/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "delete"),
  async (req, res, next) => {
    try {
      await prisma.withdrawalRequest.delete({ where: { id: (req.params.id as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/financial/stats — summary for admin
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const [byStatus, totalAmount] = await Promise.all([
      prisma.withdrawalRequest.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.aggregate({ _sum: { amount: true } }),
    ]);

    res.json({
      total: totalAmount._sum.amount ?? 0,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: s._sum.amount ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
