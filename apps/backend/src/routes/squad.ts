/**
 * /api/squad — Plano Squad (pós-pago com limite de crédito)
 *
 * Regras de negócio:
 * - Squad vincula uma Company existente a um plano pós-pago.
 * - A carteira da empresa pode ficar negativa até o credit_limit.
 * - Toda contratação gera débito na carteira.
 * - No billing_day, o ciclo fecha e uma Invoice é gerada.
 * - Se total consumido < monthly_minimum, a fatura cobra o mínimo.
 * - O ajuste de mínimo NÃO vira crédito futuro.
 * - Pagamento da fatura → crédito na carteira (idempotente).
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { findOrCreateWallet, recordWalletEvent } from "../lib/wallet-service";

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  company_id:      z.string().min(1),
  credit_limit:    z.number().positive(),
  monthly_minimum: z.number().min(0),
  billing_day:     z.number().int().min(1).max(28).default(10),
  payment_terms:   z.number().int().min(1).max(90).default(10),
  status:          z.enum(["active", "paused", "cancelled", "delinquent"]).default("active"),
  notes:           z.string().optional(),
  consultant_id:   z.string().optional(),
  started_at:      z.string().datetime({ offset: true }).optional(),
});

const updateSchema = createSchema.omit({ company_id: true }).partial();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Computes next cycle start and close dates from a billing_day. */
function computeCycleDates(billingDay: number, referenceDate = new Date()) {
  const now = referenceDate;
  const year = now.getFullYear();
  const month = now.getMonth();

  // If today is past (or on) the billing_day, the new cycle starts today
  // and closes on billing_day of next month.
  let cycleStart: Date;
  let cycleClose: Date;

  if (now.getDate() >= billingDay) {
    // Current cycle started on billing_day of this month (already past)
    cycleStart = new Date(year, month, billingDay);
    cycleClose = new Date(year, month + 1, billingDay);
  } else {
    // Current cycle started on billing_day of last month
    cycleStart = new Date(year, month - 1, billingDay);
    cycleClose = new Date(year, month, billingDay);
  }

  return { cycleStart, cycleClose };
}

/** Enriches a SquadConfig with wallet balance and current cycle data. */
async function enrichSquad(config: any) {
  const wallet = await prisma.wallet.findFirst({
    where: { owner_type: "company", owner_id: config.company_id },
    select: { id: true, balance: true, blocked_balance: true },
  });

  const currentCycle = await prisma.squadCycle.findFirst({
    where: { squad_config_id: config.id, status: "open" },
    orderBy: { started_at: "desc" },
  });

  const balance = wallet?.balance ?? 0;
  const creditLimit = config.credit_limit;
  const available = creditLimit + balance; // balance is negative → available = limit - |balance|

  return {
    ...config,
    wallet: wallet ?? null,
    current_cycle: currentCycle ?? null,
    balance,
    credit_available: Math.max(0, available),
    credit_used: Math.abs(Math.min(0, balance)),
  };
}

// ── GET /api/squad/stats ───────────────────────────────────────────────────────

router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const configs = await prisma.squadConfig.findMany({
      select: { id: true, company_id: true, credit_limit: true, monthly_minimum: true, status: true },
    });

    const wallets = await prisma.wallet.findMany({
      where: { owner_type: "company", owner_id: { in: configs.map((c) => c.company_id) } },
      select: { owner_id: true, balance: true },
    });
    const walletMap = new Map(wallets.map((w) => [w.owner_id, w.balance]));

    const openCycles  = await prisma.squadCycle.count({ where: { status: "open" } });
    const openInvoices = await prisma.invoice.count({ where: { status: "pending" } });
    const overdueInvoices = await prisma.invoice.count({ where: { status: "overdue" } });

    let totalLimit = 0, totalUsed = 0, totalAvailable = 0, totalMinimum = 0;
    const active = configs.filter((c) => c.status === "active");
    for (const c of active) {
      const bal = walletMap.get(c.company_id) ?? 0;
      totalLimit    += c.credit_limit;
      totalUsed     += Math.abs(Math.min(0, bal));
      totalAvailable += Math.max(0, c.credit_limit + bal);
      totalMinimum  += c.monthly_minimum;
    }

    res.json({
      totalSquad:          configs.length,
      activeSquad:         active.length,
      pausedSquad:         configs.filter((c) => c.status === "paused").length,
      cancelledSquad:      configs.filter((c) => c.status === "cancelled").length,
      delinquentSquad:     configs.filter((c) => c.status === "delinquent").length,
      totalCreditLimit:    totalLimit,
      totalCreditUsed:     totalUsed,
      totalCreditAvailable: totalAvailable,
      totalMonthlyMinimum: totalMinimum,
      openCycles,
      openInvoices,
      overdueInvoices,
    });
  } catch (err) { next(err); }
});

// ── GET /api/squad ────────────────────────────────────────────────────────────

router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.company = { name: { contains: search } };
    }

    const [total, configs] = await Promise.all([
      prisma.squadConfig.count({ where }),
      prisma.squadConfig.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, email: true, cnpj: true, status: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    const enriched = await Promise.all(configs.map(enrichSquad));

    res.json({ data: enriched, total, page, limit });
  } catch (err) { next(err); }
});

// ── POST /api/squad ───────────────────────────────────────────────────────────

router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const {
      company_id, credit_limit, monthly_minimum, billing_day,
      payment_terms, status, notes, consultant_id, started_at,
    } = req.body;

    // Validar que a empresa existe
    const company = await prisma.company.findUnique({ where: { id: company_id } });
    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }

    // Verificar se já tem Squad configurado
    const existing = await prisma.squadConfig.findUnique({ where: { company_id } });
    if (existing) {
      res.status(409).json({ error: "Esta empresa já possui configuração Squad. Use PUT para editar." });
      return;
    }

    const config = await prisma.squadConfig.create({
      data: {
        company_id,
        credit_limit,
        monthly_minimum,
        billing_day,
        payment_terms,
        status: status ?? "active",
        notes,
        consultant_id,
        started_at: started_at ? new Date(started_at) : new Date(),
      },
      include: { company: { select: { id: true, name: true, email: true } } },
    });

    // Garantir que a carteira da empresa existe
    await findOrCreateWallet("company", company_id);

    // Criar o primeiro ciclo Squad
    const { cycleStart, cycleClose } = computeCycleDates(billing_day);
    const dueAt = new Date(cycleClose.getTime() + payment_terms * 86_400_000);

    await prisma.squadCycle.create({
      data: {
        squad_config_id: config.id,
        company_id,
        started_at: cycleStart,
        closed_at: null,
        due_at: dueAt,
        status: "open",
      },
    });

    res.status(201).json(await enrichSquad(config));
  } catch (err) { next(err); }
});

// ── GET /api/squad/:id ────────────────────────────────────────────────────────

router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const config = await prisma.squadConfig.findUnique({
      where: { id: req.params.id as string },
      include: {
        company: { select: { id: true, name: true, email: true, cnpj: true, status: true } },
      },
    });
    if (!config) { res.status(404).json({ error: "Configuração Squad não encontrada" }); return; }
    res.json(await enrichSquad(config));
  } catch (err) { next(err); }
});

// ── PUT /api/squad/:id ────────────────────────────────────────────────────────

router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const data: any = { ...req.body };
    if (data.started_at) data.started_at = new Date(data.started_at);
    if (data.ended_at)   data.ended_at   = new Date(data.ended_at);
    if (data.status === "cancelled" && !data.ended_at) data.ended_at = new Date();

    const config = await prisma.squadConfig.update({
      where: { id: req.params.id as string },
      data,
      include: { company: { select: { id: true, name: true, email: true, cnpj: true, status: true } } },
    });
    res.json(await enrichSquad(config));
  } catch (err) { next(err); }
});

// ── DELETE /api/squad/:id ─────────────────────────────────────────────────────

router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    // Soft delete: marca como cancelled
    await prisma.squadConfig.update({
      where: { id: req.params.id as string },
      data: { status: "cancelled", ended_at: new Date() },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── GET /api/squad/:id/cycles ─────────────────────────────────────────────────

router.get("/:id/cycles", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, cycles] = await Promise.all([
      prisma.squadCycle.count({ where: { squad_config_id: req.params.id as string } }),
      prisma.squadCycle.findMany({
        where: { squad_config_id: req.params.id as string },
        skip,
        take: limit,
        orderBy: { started_at: "desc" },
      }),
    ]);

    res.json({ data: cycles, total, page, limit });
  } catch (err) { next(err); }
});

// ── GET /api/squad/:id/current-cycle ─────────────────────────────────────────

router.get("/:id/current-cycle", verifyToken, async (req, res, next) => {
  try {
    const config = await prisma.squadConfig.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, company_id: true },
    });
    if (!config) { res.status(404).json({ error: "Configuração Squad não encontrada" }); return; }

    const cycle = await prisma.squadCycle.findFirst({
      where: { squad_config_id: config.id, status: "open" },
      orderBy: { started_at: "desc" },
    });

    // Ledger entries of the current cycle
    let ledgerEntries: any[] = [];
    if (cycle) {
      const wallet = await prisma.wallet.findFirst({
        where: { owner_type: "company", owner_id: config.company_id },
        select: { id: true },
      });
      if (wallet) {
        ledgerEntries = await prisma.walletLedger.findMany({
          where: {
            wallet_id: wallet.id,
            direction: "debit",
            created_at: { gte: cycle.started_at },
            status: "confirmed",
          },
          orderBy: { created_at: "desc" },
          take: 50,
        });
      }
    }

    res.json({ cycle, ledger_entries: ledgerEntries });
  } catch (err) { next(err); }
});

// ── POST /api/squad/:id/close-cycle ──────────────────────────────────────────
// Fecha o ciclo atual, gera fatura e abre novo ciclo.

router.post("/:id/close-cycle", verifyToken, async (req, res, next) => {
  try {
    const config = await prisma.squadConfig.findUnique({
      where: { id: req.params.id as string },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!config) { res.status(404).json({ error: "Configuração Squad não encontrada" }); return; }

    const openCycle = await prisma.squadCycle.findFirst({
      where: { squad_config_id: config.id, status: "open" },
      orderBy: { started_at: "desc" },
    });
    if (!openCycle) { res.status(400).json({ error: "Nenhum ciclo aberto para fechar" }); return; }

    // Calcular total consumido no ciclo (débitos na carteira desde o início do ciclo)
    const wallet = await prisma.wallet.findFirst({
      where: { owner_type: "company", owner_id: config.company_id },
      select: { id: true },
    });

    let totalConsumed = 0;
    if (wallet) {
      const agg = await prisma.walletLedger.aggregate({
        _sum: { amount: true },
        where: {
          wallet_id: wallet.id,
          direction: "debit",
          status: "confirmed",
          created_at: { gte: openCycle.started_at },
        },
      });
      totalConsumed = agg._sum.amount ?? 0;
    }

    const minimumAdjustment = Math.max(0, config.monthly_minimum - totalConsumed);
    const totalInvoiced     = Math.max(totalConsumed, config.monthly_minimum);

    const now        = new Date();
    const dueAt      = new Date(now.getTime() + config.payment_terms * 86_400_000);
    const invNumber  = `SQ-${config.company_id.slice(0, 6).toUpperCase()}-${Date.now()}`;

    // Gerar linha de ajuste de mínimo no ledger (NÃO aumenta saldo — apenas registra)
    if (minimumAdjustment > 0 && wallet) {
      await recordWalletEvent("company", config.company_id, {
        type: "fee",
        direction: "debit",
        amount: minimumAdjustment,
        description: `Ajuste de mínimo Squad — ciclo fechado em ${now.toLocaleDateString("pt-BR")}`,
        idempotencyKey: `squad_min_${openCycle.id}`,
        referenceType: "adjustment",
        referenceId: openCycle.id,
        createdBy: (req as any).user?.id,
        metadata: { squad_cycle_id: openCycle.id, minimum: config.monthly_minimum, consumed: totalConsumed },
      });
    }

    // Criar Invoice para o ciclo
    const invoice = await prisma.invoice.create({
      data: {
        company_id:     config.company_id,
        amount:         totalInvoiced,
        status:         "pending",
        due_date:       dueAt,
        description:    `Fatura Squad — ${config.company.name} — ciclo até ${now.toLocaleDateString("pt-BR")}`,
        invoice_number: invNumber,
      },
    });

    // Fechar o ciclo
    await prisma.squadCycle.update({
      where: { id: openCycle.id },
      data: {
        status:             "invoiced",
        closed_at:          now,
        due_at:             dueAt,
        total_consumed:     totalConsumed,
        minimum_adjustment: minimumAdjustment,
        total_invoiced:     totalInvoiced,
        invoice_id:         invoice.id,
      },
    });

    // Abrir novo ciclo
    const { cycleStart: newStart } = computeCycleDates(config.billing_day, now);
    const nextClose = new Date(newStart.getFullYear(), newStart.getMonth() + 1, config.billing_day);
    const nextDue   = new Date(nextClose.getTime() + config.payment_terms * 86_400_000);

    const newCycle = await prisma.squadCycle.create({
      data: {
        squad_config_id: config.id,
        company_id:      config.company_id,
        started_at:      now,
        due_at:          nextDue,
        status:          "open",
      },
    });

    res.json({
      closed_cycle:  { ...openCycle, status: "invoiced", total_consumed: totalConsumed, minimum_adjustment: minimumAdjustment, total_invoiced: totalInvoiced },
      invoice,
      new_cycle:     newCycle,
      summary: { total_consumed: totalConsumed, monthly_minimum: config.monthly_minimum, minimum_adjustment: minimumAdjustment, total_invoiced: totalInvoiced },
    });
  } catch (err) { next(err); }
});

// ── POST /api/squad/:id/pay-invoice ──────────────────────────────────────────
// Registra pagamento de uma fatura Squad → crédito na carteira.

router.post("/:id/pay-invoice", verifyToken, async (req, res, next) => {
  try {
    const { invoice_id, amount } = req.body as { invoice_id: string; amount?: number };
    if (!invoice_id) { res.status(400).json({ error: "invoice_id é obrigatório" }); return; }

    const config = await prisma.squadConfig.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, company_id: true },
    });
    if (!config) { res.status(404).json({ error: "Configuração Squad não encontrada" }); return; }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoice_id } });
    if (!invoice) { res.status(404).json({ error: "Fatura não encontrada" }); return; }
    if (invoice.status === "paid") { res.status(409).json({ error: "Fatura já está paga" }); return; }

    const paidAmount = amount ?? invoice.amount;

    // Crédito na carteira (reduz o saldo negativo)
    await recordWalletEvent("company", config.company_id, {
      type: "payment",
      direction: "credit",
      amount: paidAmount,
      description: `Pagamento fatura Squad #${invoice.invoice_number ?? invoice.id}`,
      idempotencyKey: `squad_pay_${invoice_id}`,
      referenceType: "invoice",
      referenceId:   invoice_id,
      createdBy: (req as any).user?.id,
    });

    // Atualizar fatura
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice_id },
      data: { status: "paid", paid_at: new Date() },
    });

    // Atualizar ciclo vinculado
    await prisma.squadCycle.updateMany({
      where: { invoice_id },
      data: { status: "paid" },
    });

    res.json({ invoice: updatedInvoice, message: "Pagamento registrado com sucesso" });
  } catch (err) { next(err); }
});

// ── POST /api/squad/:id/contract ─────────────────────────────────────────────
// Contratação Squad: debita carteira com verificação de limite.

router.post("/:id/contract", verifyToken, async (req, res, next) => {
  try {
    const { amount, description, project_id, reference_type = "project", reference_id } = req.body as {
      amount: number;
      description: string;
      project_id?: string;
      reference_type?: string;
      reference_id?: string;
    };

    if (!amount || amount <= 0) { res.status(400).json({ error: "amount deve ser positivo" }); return; }

    const config = await prisma.squadConfig.findUnique({
      where: { id: req.params.id as string },
      include: { company: { select: { name: true } } },
    });
    if (!config) { res.status(404).json({ error: "Configuração Squad não encontrada" }); return; }

    // Verificar status
    if (config.status !== "active") {
      res.status(403).json({
        error: `Contratação bloqueada: Squad está ${config.status === "paused" ? "pausado" : config.status === "cancelled" ? "cancelado" : "inadimplente"}.`,
      });
      return;
    }

    // Verificar limite de crédito
    const wallet = await prisma.wallet.findFirst({
      where: { owner_type: "company", owner_id: config.company_id },
    });
    const currentBalance = wallet?.balance ?? 0;
    const newBalance     = currentBalance - amount;

    if (newBalance < -config.credit_limit) {
      res.status(403).json({
        error: "Limite Squad insuficiente para esta contratação.",
        detail: {
          current_balance:   currentBalance,
          requested_amount:  amount,
          credit_limit:      config.credit_limit,
          credit_available:  Math.max(0, config.credit_limit + currentBalance),
        },
      });
      return;
    }

    // Encontrar ciclo aberto
    const cycle = await prisma.squadCycle.findFirst({
      where: { squad_config_id: config.id, status: "open" },
      orderBy: { started_at: "desc" },
    });

    const idempotencyKey = reference_id
      ? `squad_contract_${reference_id}`
      : `squad_contract_${config.company_id}_${Date.now()}`;

    const result = await recordWalletEvent("company", config.company_id, {
      type: "payment",
      direction: "debit",
      amount,
      description: description || `Contratação Squad — ${config.company.name}`,
      idempotencyKey,
      referenceType: reference_type,
      referenceId:   reference_id ?? project_id,
      createdBy: (req as any).user?.id,
      metadata: {
        squad_config_id: config.id,
        squad_cycle_id:  cycle?.id,
        project_id,
      },
    });

    // Atualizar total consumido no ciclo
    if (cycle) {
      await prisma.squadCycle.update({
        where: { id: cycle.id },
        data: { total_consumed: { increment: amount } },
      });
    }

    const walletAfter = await prisma.wallet.findFirst({
      where: { owner_type: "company", owner_id: config.company_id },
      select: { balance: true },
    });

    res.json({
      success: true,
      ledger_entry: result?.entry,
      balance_after: walletAfter?.balance ?? newBalance,
      credit_available: Math.max(0, config.credit_limit + (walletAfter?.balance ?? newBalance)),
    });
  } catch (err) { next(err); }
});

export default router;
