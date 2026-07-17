import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { resolveMyPartnerId } from "../lib/project-scope";

const router = Router();

// Valor mínimo de saque — mesmo limite já comunicado na tela do parceiro
// (apps/frontend/app/parceiro/saques/page.tsx: "Valor mínimo: R$ 50,00").
const MIN_WITHDRAWAL_AMOUNT = 50;

// Partner não é mais um account_type/role próprio — é um upgrade da Agency
// do usuário (PartnerProfile.agency_id, status "active"). "É partner?"
// agora significa "minha agência tem um PartnerProfile ativo", resolvido
// via resolveMyPartnerId (que já faz esse lookup completo).
async function requirePartner(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const partnerId = await resolveMyPartnerId(prisma, req.user.id);
  if (!partnerId) {
    res.status(403).json({ error: "Permissão insuficiente" });
    return;
  }
  next();
}

function toWithdrawalDTO(w: {
  id: string;
  partner_profile_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  requested_at: Date;
  processed_at: Date | null;
}) {
  return {
    id: w.id,
    partnerId: w.partner_profile_id,
    amount: w.amount,
    pixKey: w.pix_key,
    pixKeyType: w.pix_key_type,
    status: w.status,
    requestedAt: w.requested_at.toISOString(),
    reviewedAt: w.processed_at ? w.processed_at.toISOString() : undefined,
  };
}

// Status "terminais": uma vez alcançados, o saque não pode ser reprocessado
// (evita pagar duas vezes ou reverter uma reprovação/cancelamento por engano).
const WITHDRAWAL_TERMINAL_STATUSES = ["paid", "rejected", "cancelled"];
const WITHDRAWAL_STATUS_VALUES = ["pending", "approved", "rejected", "paid", "cancelled"] as const;

function toAdminWithdrawalDTO(w: {
  id: string;
  partner_profile_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  requested_at: Date;
  processed_at: Date | null;
  partner: {
    balance: number;
    agency: { owner: { name: string | null; email: string } | null } | null;
  };
}) {
  return {
    id: w.id,
    partnerId: w.partner_profile_id,
    partnerName: w.partner.agency?.owner?.name ?? "",
    partnerEmail: w.partner.agency?.owner?.email ?? "",
    partnerBalance: w.partner.balance,
    amount: w.amount,
    pixKey: w.pix_key,
    pixKeyType: w.pix_key_type,
    status: w.status,
    notes: w.notes ?? undefined,
    reviewedBy: w.reviewed_by ?? undefined,
    reviewedAt: w.reviewed_at ? w.reviewed_at.toISOString() : undefined,
    requestedAt: w.requested_at.toISOString(),
    paidAt: w.status === "paid" && w.processed_at ? w.processed_at.toISOString() : undefined,
  };
}

// PartnerCommission.status hoje é só documentado como pending|approved|paid
// (ver schema.prisma) — o frontend (app/parceiro/comissoes/page.tsx, rota
// real /partner/comissoes) espera pending|confirmed|paid|cancelled. Único
// remapeamento necessário: approved → confirmed.
function toCommissionDTO(c: {
  id: string;
  partner_id: string;
  amount: number;
  status: string;
  company_name: string | null;
  project_name: string | null;
  created_at: Date;
  campaign: { name: string; type: string } | null;
}) {
  // sourceType/sourceName são derivados, não inventados: uma comissão sem
  // campaign vinculada é uma indicação direta (referral); com campaign, o
  // tipo vem de Campaign.type (coupon | link | referral) — "link" cai em
  // "campaign" por ser o rótulo mais próximo que o frontend já reconhece.
  const sourceType: "campaign" | "coupon" | "referral" = !c.campaign
    ? "referral"
    : c.campaign.type === "coupon"
      ? "coupon"
      : c.campaign.type === "referral"
        ? "referral"
        : "campaign";

  return {
    id: c.id,
    partnerId: c.partner_id,
    sourceType,
    sourceName: c.campaign?.name ?? "Indicação direta",
    companyName: c.company_name ?? "—",
    projectName: c.project_name ?? undefined,
    commissionAmount: c.amount,
    status: c.status === "approved" ? "confirmed" : c.status,
    convertedAt: c.created_at.toISOString(),
  };
}

// GET /api/partners
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (search) {
      where["agency"] = {
        owner: {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        },
      };
    }

    const [total, rawData] = await Promise.all([
      prisma.partnerProfile.count({ where }),
      prisma.partnerProfile.findMany({
        where,
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              owner: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
          _count: { select: { commissions: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);
    // Resposta expõe o dono da agência sob "user" (compat — ver apps/frontend/
    // app/admin/clientes/page.tsx, admin/projetos/page.tsx, lider/clientes/
    // page.tsx, que leem p.user?.name/.email da listagem). Partner não tem
    // usuário próprio — é sempre o dono da Agency vinculada.
    const data = rawData.map(({ agency, ...rest }) => ({
      ...rest,
      user: agency?.owner,
      agencyName: agency?.name,
    }));

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/me
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const myPartnerId = await resolveMyPartnerId(prisma, req.user!.id);
    const partner = myPartnerId ? await prisma.partnerProfile.findUnique({
      where: { id: myPartnerId },
      include: {
        agency: {
          select: {
            name: true,
            email: true,
            owner: { select: { name: true, email: true } },
          },
        },
        commissions: {
          orderBy: { created_at: "desc" },
          take: 20,
          include: { campaign: { select: { id: true, name: true } } },
        },
        referred_companies: {
          select: { id: true, name: true },
        },
      },
    }) : null;

    if (!partner) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    // Fetch projects of companies referred by this partner
    const referredCompanyIds = partner.referred_companies.map((c: any) => c.id);
    const rawProjects =
      referredCompanyIds.length > 0
        ? await prisma.project.findMany({
            where: { client_id: { in: referredCompanyIds } },
            include: { client: { select: { id: true, name: true } } },
            orderBy: { created_at: "desc" },
          })
        : [];

    // Compute global seq using Prisma (works in SQLite dev + MySQL prod — no window functions)
    let seqMap: Record<string, number> = {};
    if (rawProjects.length > 0) {
      const allProjectIds = await prisma.project.findMany({
        select: { id: true },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      });
      allProjectIds.forEach((p, i) => { seqMap[p.id] = i + 1; });
    }

    // Map project.status → PartnerProject status (active | completed | cancelled)
    const mapProjectStatus = (
      status: string,
    ): "active" | "completed" | "cancelled" => {
      if (status === "completed" || status === "paid") return "completed";
      if (status === "cancelled") return "cancelled";
      return "active";
    };

    // Commission per project: match by project_name against PartnerCommission
    const commissionByProjectName = new Map<
      string,
      { amount: number; status: string }
    >();
    for (const c of partner.commissions as any[]) {
      if (c.project_name) {
        commissionByProjectName.set(c.project_name, {
          amount: c.amount ?? 0,
          status: c.status ?? "pending",
        });
      }
    }
    const mapCommissionStatus = (
      status: string,
    ): "pending" | "confirmed" | "paid" => {
      if (status === "paid") return "paid";
      if (status === "approved" || status === "confirmed") return "confirmed";
      return "pending";
    };

    // Shape projects to match the frontend PartnerProject interface
    const projects = rawProjects.map((p: any, i: number) => {
      const comm = commissionByProjectName.get(p.title);
      return {
        id: p.id,
        seq: seqMap[p.id],
        partnerId: partner.id,
        companyName: p.client?.name ?? "—",
        companyId: p.client?.id ?? p.client_id ?? "",
        projectName: p.title,
        projectValue: p.value ?? p.budget ?? 0,
        serviceCategory: p.type ?? "—",
        status: mapProjectStatus(p.status),
        contractedAt: (p.start_date ?? p.created_at)
          ?.toISOString()
          .split("T")[0],
        completedAt: p.end_date ? p.end_date.toISOString().split("T")[0] : undefined,
        commissionGenerated: comm?.amount ?? 0,
        commissionStatus: mapCommissionStatus(comm?.status ?? "pending"),
      };
    });

    // Formato esperado pelo frontend (contexts/partner-context.tsx lê
    // me.profile/me.projects — ver dev-mocks/mock-api-client.ts para o
    // contrato original). Antes desta correção, o endpoint devolvia os
    // campos soltos na raiz (snake_case) e "profile" nunca era populado.
    const profile = {
      id: partner.id,
      agencyId: partner.agency_id,
      // Nome/e-mail exibidos são os do dono da agência (Partner não tem
      // usuário próprio — é a mesma pessoa que já loga como Agency).
      name: (partner as any).agency?.owner?.name ?? (partner as any).agency?.name ?? "",
      email: (partner as any).agency?.owner?.email ?? (partner as any).agency?.email ?? "",
      avatarInitials: ((partner as any).agency?.owner?.name ?? (partner as any).agency?.name ?? "P")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s: string) => s[0]?.toUpperCase())
        .join(""),
      linkedCampaignId: partner.linked_campaign_id ?? undefined,
      balance: partner.balance,
      totalEarned: partner.total_earned,
      totalWithdrawn: partner.total_withdrawn,
      referralLink: partner.referral_link ?? undefined,
      referralCode: partner.referral_code ?? undefined,
      status: partner.status,
      createdAt: partner.created_at.toISOString(),
      pixKey: partner.pix_key ?? undefined,
      pixKeyType: partner.pix_key_type ?? undefined,
    };

    res.json({ profile, projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/me/commissions — comissões do próprio Partner logado.
// Antes disso o frontend chamava getPartnerCommissions("me"), que montava
// "/partners/me/commissions" — rota que nunca existiu de verdade: caía em
// "/:id/commissions" com id="me", retornando sempre uma lista vazia (200,
// sem erro nenhum). Essa rota "/me/commissions" real substitui isso.
// Registrada ANTES de "/:id" pelo mesmo motivo do "/me" acima.
router.get("/me/commissions", verifyToken, requirePartner, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const myPartnerId = await resolveMyPartnerId(prisma, req.user!.id);
    if (!myPartnerId) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const [total, data] = await Promise.all([
      prisma.partnerCommission.count({ where: { partner_id: myPartnerId } }),
      prisma.partnerCommission.findMany({
        where: { partner_id: myPartnerId },
        include: { campaign: { select: { name: true, type: true } } },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: data.map(toCommissionDTO), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/partners/withdrawals — Partner solicita saque do próprio saldo.
// Registrado ANTES de "/:id" de propósito: rotas com parâmetro capturam
// qualquer segmento (inclusive "withdrawals") se vierem primeiro no router.
// Não debita o saldo agora: PartnerProfile.balance só é ajustado quando a
// solicitação for de fato processada (mesma regra do saque de Nômade em
// financial.ts, que só debita a carteira na transição para "pagamento_efetuado").
// Como ainda não existe tela/endpoint admin de aprovação para saque de
// Partner, toda solicitação fica em status "pending" até esse fluxo existir.
router.post(
  "/withdrawals",
  verifyToken,
  requirePartner,
  validate(
    z.object({
      amount: z.number().positive(),
      pix_key: z.string().min(1),
      pix_key_type: z.enum(["cpf", "email", "phone", "random"]),
    }),
  ),
  async (req, res, next) => {
    try {
      const { amount, pix_key, pix_key_type } = req.body as {
        amount: number;
        pix_key: string;
        pix_key_type: string;
      };

      const myPartnerId = await resolveMyPartnerId(prisma, req.user!.id);
      if (!myPartnerId) {
        res.status(404).json({ error: "Perfil de parceiro não encontrado" });
        return;
      }
      const partner = await prisma.partnerProfile.findUnique({ where: { id: myPartnerId } });
      if (!partner) {
        res.status(404).json({ error: "Perfil de parceiro não encontrado" });
        return;
      }

      if (amount < MIN_WITHDRAWAL_AMOUNT) {
        res
          .status(400)
          .json({ error: `Valor mínimo para saque é R$ ${MIN_WITHDRAWAL_AMOUNT.toFixed(2).replace(".", ",")}` });
        return;
      }

      if (amount > partner.balance) {
        res.status(400).json({ error: "Valor maior que o saldo disponível" });
        return;
      }

      const pending = await prisma.partnerWithdrawal.findFirst({
        where: { partner_profile_id: partner.id, status: "pending" },
      });
      if (pending) {
        res.status(400).json({ error: "Já existe uma solicitação de saque pendente" });
        return;
      }

      const withdrawal = await prisma.partnerWithdrawal.create({
        data: { partner_profile_id: partner.id, amount, pix_key, pix_key_type },
      });

      res.status(201).json(toWithdrawalDTO(withdrawal));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/partners/withdrawals — histórico de saques do próprio Partner logado.
router.get("/withdrawals", verifyToken, requirePartner, async (req, res, next) => {
  try {
    const myPartnerId = await resolveMyPartnerId(prisma, req.user!.id);
    if (!myPartnerId) {
      res.status(404).json({ error: "Perfil de parceiro não encontrado" });
      return;
    }

    const withdrawals = await prisma.partnerWithdrawal.findMany({
      where: { partner_profile_id: myPartnerId },
      orderBy: { requested_at: "desc" },
    });

    res.json(withdrawals.map(toWithdrawalDTO));
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/admin/withdrawals — admin-only, lista TODOS os saques de
// Partner (qualquer perfil), com dados do partner/usuário para a tela de
// aprovação. Registrado antes de "/:id" pelo mesmo motivo do "/withdrawals"
// acima (senão "admin" seria capturado como :id).
router.get(
  "/admin/withdrawals",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};
      if (status) where["status"] = status;

      const [total, data] = await Promise.all([
        prisma.partnerWithdrawal.count({ where }),
        prisma.partnerWithdrawal.findMany({
          where,
          include: { partner: { include: { agency: { select: { owner: { select: { name: true, email: true } } } } } } },
          skip,
          take: limit,
          orderBy: { requested_at: "desc" },
        }),
      ]);

      res.json({ data: data.map(toAdminWithdrawalDTO), total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/partners/admin/withdrawals/:id — admin-only, aprova/reprova/marca
// como pago um saque de Partner.
// Regra de saldo: NUNCA debitado na solicitação — só quando status vira
// "paid", dentro de uma transaction (checa saldo atual + debita + credita
// total_withdrawn de forma atômica). "rejected"/"cancelled" não tocam saldo.
// Uma vez em status terminal (paid|rejected|cancelled), não pode ser
// reprocessado — isso é o que impede pagar duas vezes.
router.put(
  "/admin/withdrawals/:id",
  verifyToken,
  requireRole("admin"),
  validate(
    z.object({
      status: z.enum(WITHDRAWAL_STATUS_VALUES),
      notes: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { status, notes } = req.body as { status: string; notes?: string };
      const id = req.params.id as string;

      const existing = await prisma.partnerWithdrawal.findUnique({
        where: { id },
        include: { partner: { include: { agency: { select: { owner: { select: { name: true, email: true } } } } } } },
      });
      if (!existing) {
        res.status(404).json({ error: "Solicitação de saque não encontrada" });
        return;
      }

      if (WITHDRAWAL_TERMINAL_STATUSES.includes(existing.status)) {
        // Checagem rápida fora da transaction — só um atalho de UX (evita abrir
        // transaction pro caso comum). NÃO é isso que impede o débito duplo em
        // corrida real; a proteção de fato é o updateMany condicional abaixo.
        res.status(400).json({
          error: `Este saque já foi processado (status atual: ${existing.status}) e não pode ser alterado novamente.`,
        });
        return;
      }

      if (status === "paid") {
        const updated = await prisma.$transaction(async (tx) => {
          // Update condicional: só transiciona pra "paid" se o status ainda
          // NÃO for terminal no momento exato do UPDATE (não o que foi lido
          // antes da transaction). Isso é uma operação atômica no MySQL — se
          // duas requisições concorrentes chegarem aqui quase juntas, o
          // InnoDB serializa via row lock: a primeira UPDATE que pegar o lock
          // vê status="pending"/"approved" e afeta 1 linha; a segunda, ao
          // adquirir o lock em seguida, já vê status="paid" (commitado pela
          // primeira) e o WHERE não bate mais → count=0. Isso é o que
          // realmente impede pagar o mesmo saque duas vezes, não a checagem
          // de status feita fora da transaction acima.
          const claim = await tx.partnerWithdrawal.updateMany({
            where: { id, status: { notIn: WITHDRAWAL_TERMINAL_STATUSES } },
            data: {
              status: "paid",
              notes: notes ?? existing.notes,
              reviewed_by: req.user!.id,
              reviewed_at: new Date(),
              processed_at: new Date(),
            },
          });
          if (claim.count === 0) {
            throw new Error("ALREADY_PROCESSED");
          }

          // Relê o saldo dentro da MESMA transaction, depois de já ter
          // garantido a posse exclusiva do saque acima.
          const partner = await tx.partnerProfile.findUnique({
            where: { id: existing.partner_profile_id },
            select: { balance: true },
          });
          if (!partner || partner.balance < existing.amount) {
            // Lança e derruba a transaction inteira — o updateMany acima
            // também é revertido (rollback), o saque volta a ficar não-terminal.
            throw new Error("INSUFFICIENT_BALANCE");
          }

          await tx.partnerProfile.update({
            where: { id: existing.partner_profile_id },
            data: {
              balance: { decrement: existing.amount },
              total_withdrawn: { increment: existing.amount },
            },
          });

          return tx.partnerWithdrawal.findUnique({
            where: { id },
            include: { partner: { include: { agency: { select: { owner: { select: { name: true, email: true } } } } } } },
          });
        }).catch((err) => {
          if (err instanceof Error && (err.message === "INSUFFICIENT_BALANCE" || err.message === "ALREADY_PROCESSED")) {
            return err.message;
          }
          throw err;
        });

        if (updated === "INSUFFICIENT_BALANCE") {
          res.status(400).json({ error: "Saldo atual do parceiro é insuficiente para pagar este saque." });
          return;
        }
        if (updated === "ALREADY_PROCESSED") {
          res.status(400).json({ error: "Este saque já foi processado por outra requisição." });
          return;
        }
        if (!updated) {
          res.status(404).json({ error: "Solicitação de saque não encontrada" });
          return;
        }

        res.json(toAdminWithdrawalDTO(updated));
        return;
      }

      // approved | rejected | cancelled | pending — não mexe em saldo, mas
      // usa o mesmo guard atômico do fluxo "paid": updateMany condicionado a
      // status ainda não-terminal. Isso é o que impede, por exemplo, uma
      // requisição "rejected" sobrescrever um saque que outra requisição
      // acabou de marcar "paid" (ou vice-versa) — sem isso, as duas ações
      // corriam por fora uma da outra e o saque podia terminar rejected com
      // o saldo já debitado.
      const claim = await prisma.partnerWithdrawal.updateMany({
        where: { id, status: { notIn: WITHDRAWAL_TERMINAL_STATUSES } },
        data: {
          status,
          notes: notes ?? existing.notes,
          reviewed_by: req.user!.id,
          reviewed_at: new Date(),
        },
      });
      if (claim.count === 0) {
        res.status(400).json({ error: "Este saque já foi processado por outra requisição." });
        return;
      }

      const withdrawal = await prisma.partnerWithdrawal.findUnique({
        where: { id },
        include: {
          partner: {
            include: { agency: { select: { owner: { select: { name: true, email: true } } } } },
          },
        },
      });
      if (!withdrawal) {
        res.status(404).json({ error: "Solicitação de saque não encontrada" });
        return;
      }

      res.json(toAdminWithdrawalDTO(withdrawal));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/partners/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        agency: { select: { id: true, name: true, owner: { select: { id: true, name: true, email: true } } } },
        commissions: {
          orderBy: { created_at: "desc" },
          take: 50,
        },
      },
    });

    if (!partner) {
      res.status(404).json({ error: "Parceiro não encontrado" });
      return;
    }

    res.json(partner);
  } catch (err) {
    next(err);
  }
});

// Não existe mais POST /api/partners (criação direta de um PartnerProfile
// "solto"): Partner sempre nasce de um convite feito a uma Agency já
// existente — ver POST /api/agencies/:id/partner-invite em agencies.ts.

// PUT /api/partners/:id
router.put(
  "/:id",
  verifyToken,
  validate(
    z.object({
      // invited/declined normalmente só mudam via os endpoints dedicados de
      // convite (POST .../partner-invite/accept|decline) — este PUT genérico
      // aceita o enum inteiro pra permitir ações administrativas diretas
      // (ex.: suspender um Partner ativo), mas não é o fluxo de convite em si.
      status: z.enum(["invited", "active", "declined", "suspended"]).optional(),
      pix_key: z.string().optional(),
      pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
      referral_code: z.string().optional(),
      linked_campaign_id: z.string().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const partner = await prisma.partnerProfile.update({
        where: { id: (req.params.id as string) },
        data: req.body,
      });
      res.json(partner);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/partners/:id/commissions
router.get("/:id/commissions", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, data] = await Promise.all([
      prisma.partnerCommission.count({ where: { partner_id: (req.params.id as string) } }),
      prisma.partnerCommission.findMany({
        where: { partner_id: (req.params.id as string) },
        include: { campaign: { select: { id: true, name: true } } },
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

export default router;
