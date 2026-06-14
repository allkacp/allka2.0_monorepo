import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

function getQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type OwnerType = "company" | "agency" | "nomad" | "partner" | "platform";

async function enrichWallets(wallets: any[]) {
  const byType = (type: OwnerType) => wallets.filter((w) => w.owner_type === type).map((w) => w.owner_id);
  const [companyIds, agencyIds, nomadIds, partnerIds] = (
    ["company", "agency", "nomad", "partner"] as OwnerType[]
  ).map(byType);

  const [companies, agencies, nomads, partners] = await Promise.all([
    companyIds.length
      ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true, email: true, cnpj: true } })
      : [],
    agencyIds.length
      ? prisma.agency.findMany({ where: { id: { in: agencyIds } }, select: { id: true, name: true, email: true, cnpj: true } })
      : [],
    nomadIds.length
      ? prisma.nomade.findMany({ where: { id: { in: nomadIds } }, select: { id: true, name: true, email: true } })
      : [],
    partnerIds.length
      ? prisma.partnerProfile.findMany({
          where: { id: { in: partnerIds } },
          select: { id: true, user: { select: { name: true, email: true } } },
        })
      : [],
  ]);

  const cMap = new Map(companies.map((x) => [x.id, x]));
  const aMap = new Map(agencies.map((x) => [x.id, x]));
  const nMap = new Map(nomads.map((x) => [x.id, x]));
  const pMap = new Map(partners.map((x) => [x.id, x]));

  return wallets.map((w) => {
    let owner: any;
    switch (w.owner_type as OwnerType) {
      case "company": owner = cMap.get(w.owner_id); break;
      case "agency":  owner = aMap.get(w.owner_id); break;
      case "nomad":   owner = nMap.get(w.owner_id); break;
      case "partner": { const p = pMap.get(w.owner_id); owner = p ? { name: p.user?.name, email: p.user?.email } : null; break; }
      case "platform": owner = { name: "Allka Plataforma", email: "admin@allka.com.vc" }; break;
      default: owner = null;
    }
    return {
      ...w,
      owner_name:  owner?.name  ?? "—",
      owner_email: owner?.email ?? "",
      owner_cnpj:  owner?.cnpj  ?? "",
    };
  });
}

// ─── GET /api/wallets/stats ────────────────────────────────────────────────────
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const fromRaw   = getQueryString(req.query.from);
    const toRaw     = getQueryString(req.query.to);
    const ownerType = getQueryString(req.query.owner_type);

    const walletWhere: Record<string, any> = {};
    if (ownerType && ownerType !== "all") walletWhere.owner_type = ownerType;

    const ledgerWhere: Record<string, any> = {};
    if (fromRaw || toRaw) {
      ledgerWhere.created_at = {};
      if (fromRaw) ledgerWhere.created_at.gte = new Date(fromRaw);
      if (toRaw)   ledgerWhere.created_at.lte = new Date(toRaw);
    }
    // Scope ledger to wallets of the filtered owner_type
    if (ownerType && ownerType !== "all") {
      ledgerWhere.wallet = { owner_type: ownerType };
    }

    const [
      allWallets, byType, credits, debits, activeCount, suspendedCount, zeroCount,
      bonusAgg, withdrawalAgg, additionalCreditAgg, planAgg, recurringAgg, commissionAgg,
    ] = await Promise.all([
      prisma.wallet.aggregate({ _sum: { balance: true, blocked_balance: true }, _count: true, where: walletWhere }),
      prisma.wallet.groupBy({ by: ["owner_type"], _sum: { balance: true }, _count: true, where: walletWhere }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, direction: "debit",  status: "confirmed" } }),
      prisma.wallet.count({ where: { ...walletWhere, status: "active" } }),
      prisma.wallet.count({ where: { ...walletWhere, status: "suspended" } }),
      prisma.wallet.count({ where: { ...walletWhere, balance: 0, status: "active" } }),
      // Type-specific breakdowns
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, type: "bonus",      direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, type: "withdrawal", direction: "debit",  status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, type: "adjustment", direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, reference_type: "invoice", direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, reference_type: "project", direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: { ...ledgerWhere, type: "commission", direction: "credit", status: "confirmed" } }),
    ]);

    res.json({
      totalBalance:   allWallets._sum.balance ?? 0,
      blockedBalance: allWallets._sum.blocked_balance ?? 0,
      walletCount:    allWallets._count,
      activeCount,
      suspendedCount,
      zeroCount,
      credits:      credits._sum.amount  ?? 0,
      debits:       debits._sum.amount   ?? 0,
      creditCount:  credits._count,
      debitCount:   debits._count,
      // Type breakdowns
      bonus:              bonusAgg._sum.amount          ?? 0,
      bonusCount:         bonusAgg._count,
      withdrawals:        withdrawalAgg._sum.amount     ?? 0,
      withdrawalCount:    withdrawalAgg._count,
      additionalCredit:   additionalCreditAgg._sum.amount ?? 0,
      additionalCreditCount: additionalCreditAgg._count,
      planCredits:        planAgg._sum.amount           ?? 0,
      planCreditCount:    planAgg._count,
      recurringCredits:   recurringAgg._sum.amount      ?? 0,
      recurringCreditCount: recurringAgg._count,
      commissions:        commissionAgg._sum.amount     ?? 0,
      commissionCount:    commissionAgg._count,
      byType: byType.map((t) => ({ owner_type: t.owner_type, balance: t._sum.balance ?? 0, count: t._count })),
    });
  } catch (err) { next(err); }
});

// ─── GET /api/wallets/ledger (global — all wallets) ───────────────────────────
// Must be declared before /:id to avoid route conflict.
router.get("/ledger", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const direction  = getQueryString(req.query.direction);
    const type       = getQueryString(req.query.type);
    const status     = getQueryString(req.query.status);
    const fromRaw    = getQueryString(req.query.from);
    const toRaw      = getQueryString(req.query.to);
    const ownerType  = getQueryString(req.query.owner_type);
    const refType    = getQueryString(req.query.reference_type);

    const where: Record<string, any> = {};
    if (direction && direction !== "all") where.direction      = direction;
    if (type      && type      !== "all") where.type           = type;
    if (status    && status    !== "all") where.status         = status;
    if (refType   && refType   !== "all") where.reference_type = refType;
    if (fromRaw || toRaw) {
      where.created_at = {};
      if (fromRaw) where.created_at.gte = new Date(fromRaw);
      if (toRaw)   where.created_at.lte = new Date(toRaw);
    }
    if (ownerType && ownerType !== "all") {
      where.wallet = { owner_type: ownerType };
    }

    const [total, entries, credAgg, debAgg] = await Promise.all([
      prisma.walletLedger.count({ where }),
      prisma.walletLedger.findMany({
        where, skip, take: limit, orderBy: { created_at: "desc" },
        include: {
          wallet: { select: { id: true, owner_type: true, owner_id: true } },
        },
      }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, where: { ...where, direction: "credit", status: "confirmed" } }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, where: { ...where, direction: "debit",  status: "confirmed" } }),
    ]);

    // Enrich entries with owner name
    const walletIds = [...new Set(entries.map((e: any) => e.wallet_id))];
    const wallets = walletIds.length
      ? await prisma.wallet.findMany({ where: { id: { in: walletIds } }, select: { id: true, owner_type: true, owner_id: true } })
      : [];
    const enriched = await enrichWallets(wallets);
    const walletMap = new Map(enriched.map((w) => [w.id, w]));

    const cred = credAgg._sum.amount ?? 0;
    const deb  = debAgg._sum.amount  ?? 0;

    res.json({
      data: entries.map((e: any) => ({
        ...e,
        wallet: walletMap.get(e.wallet_id) ?? e.wallet,
      })),
      total, page, limit,
      summary: { credits: cred, debits: deb, net: cred - deb },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/wallets/projections ─────────────────────────────────────────────
// Returns expected credits (pending invoices) and debits (recurring projects)
// for the next N days (default 30). Not tied to wallet ledger — it's a projection.
router.get("/projections", verifyToken, async (req, res, next) => {
  try {
    const days    = Math.min(parseInt(getQueryString(req.query.days) ?? "", 10) || 30, 365);
    const now     = new Date();
    const horizon = new Date(now.getTime() + days * 86_400_000);

    const [pendingInvoices, recurringProjects] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: { in: ["pending"] }, due_date: { gte: now, lte: horizon } },
        include: { company: { select: { id: true, name: true } } },
        orderBy: { due_date: "asc" },
        take: 100,
      }),
      prisma.project.findMany({
        where: { lifecycle: "mensal", status: "in-progress" },
        include: { client: { select: { id: true, name: true } } },
        take: 100,
      }),
    ]);

    const futureCredits = pendingInvoices.reduce((s, i) => s + i.amount, 0);
    const futureDebits  = recurringProjects.reduce((s, p) => s + ((p as any).value ?? 0), 0);

    res.json({
      horizon: days,
      horizonDate: horizon.toISOString(),
      futureCredits,
      futureDebits,
      pendingInvoices: pendingInvoices.map((i) => ({
        id: i.id, amount: i.amount, due_date: i.due_date,
        company_name: (i as any).company?.name ?? "—",
        description: i.description,
        invoice_number: i.invoice_number,
      })),
      recurringProjects: recurringProjects.map((p) => ({
        id: p.id, title: p.title, status: p.status,
        client_name: (p as any).client?.name ?? "—",
        value: (p as any).value ?? 0,
      })),
    });
  } catch (err) { next(err); }
});

// ─── Conciliation helpers ─────────────────────────────────────────────────────

// Ledger types that represent real money entering the bank account
const BANK_IN_TYPES = [
  "payment",           // card / PIX / boleto payment approved
  "pix",               // direct PIX credit
  "boleto",            // boleto compensated
  "card",              // card charge captured
  "plan",              // plan payment received
  "recharge",          // balance top-up paid
  "additional_credit", // extra credit purchased with real money
  "invoice_payment",   // invoice paid in cash
  "invoice",           // invoice ledger entry (legacy)
  "squad_payment",     // Squad invoice payment
];

// Ledger types that represent real money leaving the bank account
const BANK_OUT_TYPES = [
  "withdrawal",        // saque pago via PIX/TED
  "transfer",          // transferência bancária
  "refund",            // reembolso real pago
  "chargeback",        // estorno financeiro real
  "bank_fee",          // taxa bancária real
  "external_payment",  // pagamento externo realizado
];

// ─── GET /api/wallets/conciliation ─────────────────────────────────────────────
// Returns only WalletLedger entries with real bank impact (money actually moved
// in/out of a bank account). Excludes bonus, project debits, internal transfers,
// adjustments, and any type not in BANK_IN/BANK_OUT lists.
router.get("/conciliation", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const fromRaw   = getQueryString(req.query.from);
    const toRaw     = getQueryString(req.query.to);
    const ownerType = getQueryString(req.query.owner_type);
    const walletId  = getQueryString(req.query.wallet_id);
    const impact    = getQueryString(req.query.impact); // bank_in | bank_out | all
    const origin    = getQueryString(req.query.origin); // specific type (payment, withdrawal …)
    const search    = getQueryString(req.query.search);

    // ── Base filters ──────────────────────────────────────────────────────────
    const baseWhere: any = { status: "confirmed" };
    if (walletId) baseWhere.wallet_id = walletId;
    if (ownerType && ownerType !== "all") baseWhere.wallet = { owner_type: ownerType };
    if (fromRaw || toRaw) {
      baseWhere.created_at = {};
      if (fromRaw) baseWhere.created_at.gte = new Date(fromRaw);
      if (toRaw)   baseWhere.created_at.lte = new Date(toRaw);
    }
    if (search) baseWhere.description = { contains: search };

    // ── Bank-impact filter ────────────────────────────────────────────────────
    let impactClause: any;
    if (impact === "bank_in") {
      const types = origin && BANK_IN_TYPES.includes(origin) ? [origin] : BANK_IN_TYPES;
      impactClause = { type: { in: types }, direction: "credit" };
    } else if (impact === "bank_out") {
      const types = origin && BANK_OUT_TYPES.includes(origin) ? [origin] : BANK_OUT_TYPES;
      impactClause = { type: { in: types }, direction: "debit" };
    } else if (origin) {
      if      (BANK_IN_TYPES.includes(origin))  impactClause = { type: origin, direction: "credit" };
      else if (BANK_OUT_TYPES.includes(origin)) impactClause = { type: origin, direction: "debit" };
      else impactClause = { id: "__never__" }; // unknown origin → return nothing
    } else {
      impactClause = {
        OR: [
          { type: { in: BANK_IN_TYPES },  direction: "credit" },
          { type: { in: BANK_OUT_TYPES }, direction: "debit"  },
        ],
      };
    }

    const where = { ...baseWhere, ...impactClause };

    // ── Summary always covers all bank-impact entries (ignores impact/origin) ─
    const summaryWhere = { ...baseWhere };
    const bankInWhere  = { ...summaryWhere, type: { in: BANK_IN_TYPES },  direction: "credit" };
    const bankOutWhere = { ...summaryWhere, type: { in: BANK_OUT_TYPES }, direction: "debit"  };
    const wdWhere      = { ...summaryWhere, type: "withdrawal",            direction: "debit"  };

    const [
      total, entries,
      bankInAgg, bankOutAgg, wdAgg,
      distinctWalletGroups,
    ] = await Promise.all([
      prisma.walletLedger.count({ where }),
      prisma.walletLedger.findMany({
        where, skip, take: limit, orderBy: { created_at: "desc" },
        include: { wallet: { select: { id: true, owner_type: true, owner_id: true } } },
      }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: bankInWhere }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: bankOutWhere }),
      prisma.walletLedger.aggregate({ _sum: { amount: true }, _count: true, where: wdWhere }),
      prisma.walletLedger.groupBy({
        by: ["wallet_id"],
        where: {
          ...summaryWhere,
          OR: [
            { type: { in: BANK_IN_TYPES },  direction: "credit" },
            { type: { in: BANK_OUT_TYPES }, direction: "debit"  },
          ],
        },
      }),
    ]);

    // ── Enrich entries with owner info ────────────────────────────────────────
    const walletIds = [...new Set(entries.map((e: any) => e.wallet_id))];
    const rawWallets = walletIds.length
      ? await prisma.wallet.findMany({
          where: { id: { in: walletIds } },
          select: { id: true, owner_type: true, owner_id: true },
        })
      : [];
    const enrichedWallets = await enrichWallets(rawWallets);
    const walletMap = new Map(enrichedWallets.map((w) => [w.id, w]));

    const bankIn  = bankInAgg._sum.amount  ?? 0;
    const bankOut = bankOutAgg._sum.amount ?? 0;

    res.json({
      data: entries.map((e: any) => ({
        ...e,
        bank_impact: BANK_IN_TYPES.includes(e.type) && e.direction === "credit"
          ? "bank_in" : "bank_out",
        wallet: walletMap.get(e.wallet_id) ?? e.wallet,
      })),
      total, page, limit,
      summary: {
        bankIn,
        bankOut,
        netReal:             bankIn - bankOut,
        bankInCount:         bankInAgg._count,
        bankOutCount:        bankOutAgg._count,
        withdrawals:         wdAgg._sum.amount ?? 0,
        withdrawalCount:     wdAgg._count,
        realCredits:         bankIn,
        realCreditCount:     bankInAgg._count,
        walletsWithMovement: distinctWalletGroups.length,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/wallets ─────────────────────────────────────────────────────────
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const ownerType = getQueryString(req.query.owner_type);
    const status    = getQueryString(req.query.status);
    const search    = getQueryString(req.query.search);
    const minBal    = req.query.min_balance ? parseFloat(getQueryString(req.query.min_balance) ?? "") : undefined;

    const where: Record<string, any> = {};
    if (ownerType && ownerType !== "all") where.owner_type = ownerType;
    if (status    && status    !== "all") where.status     = status;
    if (minBal !== undefined) {
      if (minBal === 0) where.balance = 0;
      else              where.balance = { gt: 0 };
    }

    const [total, wallets] = await Promise.all([
      prisma.wallet.count({ where }),
      prisma.wallet.findMany({ where, skip, take: limit, orderBy: { updated_at: "desc" } }),
    ]);

    let enriched = await enrichWallets(wallets);

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (w) =>
          w.owner_name.toLowerCase().includes(q) ||
          w.owner_email.toLowerCase().includes(q) ||
          w.owner_id.toLowerCase().includes(q)
      );
    }

    res.json({ data: enriched, total, page, limit });
  } catch (err) { next(err); }
});

// ─── GET /api/wallets/:id ─────────────────────────────────────────────────────
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: getQueryString(req.params.id)! } });
    if (!wallet) { res.status(404).json({ error: "Carteira não encontrada" }); return; }
    const [enriched] = await enrichWallets([wallet]);
    res.json(enriched);
  } catch (err) { next(err); }
});

// ─── GET /api/wallets/:id/ledger ──────────────────────────────────────────────
router.get("/:id/ledger", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const direction = getQueryString(req.query.direction);
    const type      = getQueryString(req.query.type);
    const status    = getQueryString(req.query.status);
    const fromRaw   = getQueryString(req.query.from);
    const toRaw     = getQueryString(req.query.to);

    const where: Record<string, any> = { wallet_id: getQueryString(req.params.id)! };
    if (direction && direction !== "all") where.direction = direction;
    if (type      && type      !== "all") where.type      = type;
    if (status    && status    !== "all") where.status    = status;
    if (fromRaw || toRaw) {
      where.created_at = {};
      if (fromRaw) where.created_at.gte = new Date(fromRaw);
      if (toRaw)   where.created_at.lte = new Date(toRaw);
    }

    const [total, entries, summary] = await Promise.all([
      prisma.walletLedger.count({ where }),
      prisma.walletLedger.findMany({ where, skip, take: limit, orderBy: { created_at: "desc" } }),
      prisma.walletLedger.aggregate({
        _sum: { amount: true },
        where: { ...where, direction: "credit", status: "confirmed" },
      }),
    ]);

    const totalCredits = summary._sum.amount ?? 0;
    const debSummary   = await prisma.walletLedger.aggregate({ _sum: { amount: true }, where: { ...where, direction: "debit", status: "confirmed" } });
    const totalDebits  = debSummary._sum.amount ?? 0;

    res.json({ data: entries, total, page, limit, summary: { credits: totalCredits, debits: totalDebits, net: totalCredits - totalDebits } });
  } catch (err) { next(err); }
});

// ─── POST /api/wallets ────────────────────────────────────────────────────────
const createSchema = z.object({
  owner_type: z.enum(["company", "agency", "nomad", "partner", "platform"]),
  owner_id:   z.string().min(1),
  balance:    z.number().optional(),
  notes:      z.string().optional(),
});

router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const { owner_type, owner_id, balance = 0, notes } = req.body;
    const existing = await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type, owner_id } } });
    if (existing) { res.status(409).json({ error: "Carteira já existe para este titular" }); return; }

    const wallet = await prisma.wallet.create({ data: { owner_type, owner_id, balance, notes } });

    if (balance > 0) {
      await prisma.walletLedger.create({
        data: {
          wallet_id: wallet.id, type: "adjustment", direction: "credit",
          amount: balance, balance_before: 0, balance_after: balance,
          description: "Saldo inicial", status: "confirmed",
          created_by: (req as any).user?.id ?? null,
        },
      });
    }

    const [enriched] = await enrichWallets([wallet]);
    res.status(201).json(enriched);
  } catch (err) { next(err); }
});

// ─── POST /api/wallets/:id/adjustment ─────────────────────────────────────────
const adjustSchema = z.object({
  direction:   z.enum(["credit", "debit"]),
  amount:      z.number().positive(),
  description: z.string().min(1),
  category:    z.string().optional(),
  notes:       z.string().optional(),
  reference_type: z.string().optional(),
  reference_id:   z.string().optional(),
});

router.post("/:id/adjustment", verifyToken, validate(adjustSchema), async (req, res, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: getQueryString(req.params.id)! } });
    if (!wallet) { res.status(404).json({ error: "Carteira não encontrada" }); return; }

    const { direction, amount, description, category, notes, reference_type, reference_id } = req.body;

    const balanceBefore = wallet.balance;
    const balanceAfter  = direction === "credit" ? balanceBefore + amount : balanceBefore - amount;

    if (direction === "debit" && balanceAfter < 0) {
      res.status(422).json({ error: "Saldo insuficiente para este débito" }); return;
    }

    const [entry] = await prisma.$transaction([
      prisma.walletLedger.create({
        data: {
          wallet_id: wallet.id, type: "adjustment", direction,
          amount, balance_before: balanceBefore, balance_after: balanceAfter,
          description, category, notes, status: "confirmed",
          reference_type, reference_id,
          created_by: (req as any).user?.id ?? null,
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data:  { balance: balanceAfter },
      }),
    ]);

    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// ─── PUT /api/wallets/:id ─────────────────────────────────────────────────────
const updateSchema = z.object({
  status: z.enum(["active", "suspended", "closed"]).optional(),
  notes:  z.string().optional(),
});

router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const wallet = await prisma.wallet.update({ where: { id: getQueryString(req.params.id)! }, data: req.body });
    const [enriched] = await enrichWallets([wallet]);
    res.json(enriched);
  } catch (err) { next(err); }
});

export default router;
