// Fotografia FINANCEIRA — faturas, pagamentos (+ itens), carteiras (+
// movimentações), saques (nômade e parceiro), comissões/repasses, método de
// pagamento de empresa (já mascarado por desenho), cobrança recorrente
// (squad) e aditivos de catalog2. Bloco seguinte ao de projetos/execução.
//
// Reaproveita o MESMO mecanismo genérico (RawRecord/RawRelation/
// SnapshotCollection, sanitizeForLegacy, runImport) — nenhum schema/migration
// novo. Só a COLETA é o que este arquivo acrescenta.
//
// ── Segurança (allowlist explícita, nunca objeto inteiro) ──────────────────
// NUNCA lido: pix_key/pix_key_type (WithdrawalRequest/PartnerWithdrawal),
// número de conta/banco (BankAccount não é coletado — ver nota abaixo),
// holder_name de cartão (CompanyPaymentMethod), payload bruto de provedor
// (WalletLedger.metadata). Cada `content` abaixo é montado campo a campo, a
// partir de uma lista explícita — nunca um spread do registro inteiro
// seguido de exclusão a posteriori. sanitizeForLegacy/scrubSecretValues
// continuam rodando por cima de tudo, como segunda camada.
//
// Deliberadamente FORA deste bloco (ver relatório): BankAccount (dado
// bancário completo — nenhum valor histórico sobra depois de mascarado, e é
// exatamente o tipo de dado proibido); Coupon/CouponUsage (domínio de
// campanhas, ainda adiado); Catalog2Quote/Catalog2CartItem (cotação/cesta,
// não é uma operação financeira concluída).
//
// ── Sandbox vs. real ────────────────────────────────────────────────────────
// Payment.gateway/payment_method já denunciam sandbox no próprio dado
// (FAKE_SANDBOX/CARTAO_TESTE/PIX_FAKE/BOLETO_FAKE) — preservados como estão
// (nunca excluídos silenciosamente) e espelhados num campo derivado
// `is_sandbox` explícito, fácil de filtrar na consulta.
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { fileRef, isoDates, type LegacyEntityType, type RawRecord, type RawRelation, type SnapshotCollection } from "./importer";
import { findManyChunked, paginate } from "./pagination";

const PAGE_SIZE = 200;
const SANDBOX_GATEWAYS = new Set(["FAKE_SANDBOX"]);
const SANDBOX_PAYMENT_METHODS = new Set(["CARTAO_TESTE", "PIX_FAKE", "BOLETO_FAKE"]);

// Mapeia WalletLedger.reference_type -> entity_type do Legado, só para os
// tipos que de fato têm um coletor (payment/invoice/expense/project). Os
// demais (withdrawal/commission/adjustment) ficam preservados em texto no
// `content` (reference_type/reference_id), sem relação tipada — evita
// apontar pra um entity_type ambíguo (dois tipos de saque distintos).
const WALLET_LEDGER_REFERENCE_ENTITY: Record<string, LegacyEntityType> = {
  payment: "payment",
  invoice: "invoice",
  expense: "expense",
  project: "project",
};

export interface CollectFinancialOptions {
  /** Registros por página de leitura (padrão 200). Nunca um findMany() sem limite. */
  pageSize?: number;
}

export async function collectFinancialSnapshot(
  db: OperationalPrisma,
  opts: CollectFinancialOptions = {},
): Promise<SnapshotCollection> {
  const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : PAGE_SIZE;
  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  // ── Faturas ────────────────────────────────────────────────────────────
  await paginate(
    (skip, take) =>
      db.invoice.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, company_id: true, project_id: true, amount: true, status: true, due_date: true, paid_at: true, description: true, invoice_number: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const inv of page) {
        records.push({
          entity_type: "invoice",
          source_table: "invoices",
          original_id: inv.id,
          original_code: inv.invoice_number,
          title: inv.invoice_number ?? `Fatura ${inv.id}`,
          subtitle: inv.description ? inv.description.slice(0, 200) : null,
          original_status: inv.status,
          dates: { ...isoDates(inv), due_date: inv.due_date?.toISOString() ?? null, paid_at: inv.paid_at?.toISOString() ?? null },
          content: { id: inv.id, amount: inv.amount, status: inv.status, invoice_number: inv.invoice_number, description: inv.description },
          search_category: null,
          search_active: inv.status === "pending" || inv.status === "overdue",
        });
        if (inv.company_id) relations.push({ from_original_id: inv.id, from_entity_type: "invoice", to_original_id: inv.company_id, to_entity_type: "company", relation_type: "belongs_to_company", description: null });
        if (inv.project_id) relations.push({ from_original_id: inv.id, from_entity_type: "invoice", to_original_id: inv.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
      }
    },
  );

  // ── Pagamentos + itens (com origem catálogo antigo/catalog2) ────────────
  await paginate(
    (skip, take) =>
      db.payment.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          project_id: true,
          user_id: true,
          amount: true,
          payment_method: true,
          status: true,
          gateway: true,
          fake_transaction_id: true,
          card_last_digits: true,
          paid_at: true,
          idempotency_key: true,
          billing_cycle_key: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const paymentIds = page.map((p) => p.id);
      const items = await findManyChunked(paymentIds, (ids) =>
        db.paymentItem.findMany({
          where: { payment_id: { in: ids } },
          select: {
            id: true,
            payment_id: true,
            project_product_id: true,
            product_id: true,
            product_name_snapshot: true,
            unit_price_snapshot: true,
            quantity_snapshot: true,
            total_snapshot: true,
            recurrence_snapshot: true,
            billing_cycle_key: true,
            created_at: true,
          },
        }),
      );
      // Origem do item: catálogo antigo (product_id) ou catalog2 — resolvida
      // via ProjectProduct.catalog2_product_id (PaymentItem não tem ponteiro
      // catalog2 próprio, denormaliza a partir do que foi de fato contratado).
      const projectProductIds = [...new Set(items.map((i) => i.project_product_id))];
      const projectProducts = await findManyChunked(projectProductIds, (ids) =>
        db.projectProduct.findMany({ where: { id: { in: ids } }, select: { id: true, catalog2_product_id: true } }),
      );
      const catalog2ByProjectProductId = new Map(projectProducts.map((pp) => [pp.id, pp.catalog2_product_id]));
      const itemsByPayment = new Map<string, typeof items>();
      for (const it of items) itemsByPayment.set(it.payment_id, [...(itemsByPayment.get(it.payment_id) ?? []), it]);

      for (const p of page) {
        const isSandbox = SANDBOX_GATEWAYS.has(p.gateway) || SANDBOX_PAYMENT_METHODS.has(p.payment_method);
        records.push({
          entity_type: "payment",
          source_table: "payments",
          original_id: p.id,
          original_code: p.idempotency_key,
          title: `Pagamento ${p.amount} (${p.status})`,
          subtitle: p.billing_cycle_key,
          original_status: p.status,
          dates: { ...isoDates(p), paid_at: p.paid_at?.toISOString() ?? null },
          // NUNCA copiado: card_holder (nome do titular do cartão). card_last_digits
          // já vem mascarado de origem (só os últimos dígitos) — seguro preservar.
          content: {
            id: p.id,
            project_id: p.project_id,
            amount: p.amount,
            payment_method: p.payment_method,
            status: p.status,
            gateway: p.gateway,
            is_sandbox: isSandbox,
            fake_transaction_id: p.fake_transaction_id,
            card_last_digits: p.card_last_digits,
            billing_cycle_key: p.billing_cycle_key,
          },
          search_category: p.gateway,
          search_active: p.status === "PENDENTE",
        });
        relations.push({ from_original_id: p.id, from_entity_type: "payment", to_original_id: p.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
        if (p.user_id) relations.push({ from_original_id: p.id, from_entity_type: "payment", to_original_id: p.user_id, to_entity_type: "user", relation_type: "payment_by_user", description: null });

        for (const it of itemsByPayment.get(p.id) ?? []) {
          const catalog2ProductId = catalog2ByProjectProductId.get(it.project_product_id);
          const catalogOrigin = catalog2ProductId ? "catalog2" : it.product_id ? "old_catalog" : "unknown";
          records.push({
            entity_type: "payment_item",
            source_table: "payment_items",
            original_id: it.id,
            original_code: null,
            title: it.product_name_snapshot,
            subtitle: it.recurrence_snapshot,
            original_status: null,
            dates: { created_at: it.created_at.toISOString(), updated_at: null },
            content: {
              id: it.id,
              payment_id: it.payment_id,
              product_name_snapshot: it.product_name_snapshot,
              unit_price_snapshot: it.unit_price_snapshot,
              quantity_snapshot: it.quantity_snapshot,
              total_snapshot: it.total_snapshot,
              recurrence_snapshot: it.recurrence_snapshot,
              billing_cycle_key: it.billing_cycle_key,
              catalog_origin: catalogOrigin,
            },
            search_category: catalogOrigin,
            search_active: null,
          });
          relations.push({ from_original_id: it.id, from_entity_type: "payment_item", to_original_id: it.payment_id, to_entity_type: "payment", relation_type: "belongs_to_payment", description: null });
          relations.push({ from_original_id: it.id, from_entity_type: "payment_item", to_original_id: it.project_product_id, to_entity_type: "project_product", relation_type: "for_project_product", description: null });
          if (it.product_id) relations.push({ from_original_id: it.id, from_entity_type: "payment_item", to_original_id: it.product_id, to_entity_type: "product", relation_type: "for_old_product", description: null });
        }
      }
    },
  );

  // ── Carteiras + movimentações (ledger genérico) ─────────────────────────
  const OWNER_ENTITY: Record<string, LegacyEntityType> = { company: "company", agency: "agency", nomad: "nomade", partner: "partner_profile" };
  await paginate(
    (skip, take) =>
      db.wallet.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, owner_type: true, owner_id: true, balance: true, blocked_balance: true, currency: true, status: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      const walletIds = page.map((w) => w.id);
      const ledgerEntries = await findManyChunked(walletIds, (ids) =>
        db.walletLedger.findMany({
          where: { wallet_id: { in: ids } },
          // metadata (JSON livre, pode carregar payload de provedor) NUNCA selecionado.
          select: {
            id: true,
            wallet_id: true,
            type: true,
            direction: true,
            amount: true,
            balance_before: true,
            balance_after: true,
            description: true,
            category: true,
            status: true,
            reference_type: true,
            reference_id: true,
            created_at: true,
          },
        }),
      );
      const ledgerByWallet = new Map<string, typeof ledgerEntries>();
      for (const l of ledgerEntries) ledgerByWallet.set(l.wallet_id, [...(ledgerByWallet.get(l.wallet_id) ?? []), l]);

      for (const w of page) {
        records.push({
          entity_type: "wallet",
          source_table: "wallets",
          original_id: w.id,
          original_code: null,
          title: `Carteira ${w.owner_type}`,
          subtitle: null,
          original_status: w.status,
          dates: isoDates(w),
          content: { id: w.id, owner_type: w.owner_type, balance: w.balance, blocked_balance: w.blocked_balance, currency: w.currency, status: w.status },
          search_category: w.owner_type,
          search_active: w.status === "active",
        });
        // "platform" não tem entidade dona própria no Legado — sem relação.
        const ownerEntityType = OWNER_ENTITY[w.owner_type];
        if (ownerEntityType) {
          relations.push({ from_original_id: w.id, from_entity_type: "wallet", to_original_id: w.owner_id, to_entity_type: ownerEntityType, relation_type: "wallet_of_owner", description: null });
        }

        for (const l of ledgerByWallet.get(w.id) ?? []) {
          records.push({
            entity_type: "wallet_ledger",
            source_table: "wallet_ledger",
            original_id: l.id,
            original_code: null,
            title: `${l.type} ${l.direction} ${l.amount}`,
            subtitle: l.description ? l.description.slice(0, 200) : null,
            original_status: l.status,
            dates: { created_at: l.created_at.toISOString(), updated_at: null },
            content: {
              id: l.id,
              wallet_id: l.wallet_id,
              type: l.type,
              direction: l.direction,
              amount: l.amount,
              balance_before: l.balance_before,
              balance_after: l.balance_after,
              description: l.description,
              category: l.category,
              status: l.status,
              reference_type: l.reference_type,
              reference_id: l.reference_id,
            },
            search_category: l.type,
            search_active: null,
          });
          relations.push({ from_original_id: l.id, from_entity_type: "wallet_ledger", to_original_id: l.wallet_id, to_entity_type: "wallet", relation_type: "belongs_to_wallet", description: null });
          const refEntity = l.reference_type ? WALLET_LEDGER_REFERENCE_ENTITY[l.reference_type] : undefined;
          if (refEntity && l.reference_id) {
            relations.push({ from_original_id: l.id, from_entity_type: "wallet_ledger", to_original_id: l.reference_id, to_entity_type: refEntity, relation_type: "ledger_reference", description: l.reference_type });
          }
        }
      }
    },
  );

  // ── Movimentações "legado" de nômade (modelo antigo, paralelo ao ledger) ──
  await paginate(
    (skip, take) =>
      db.walletTransaction.findMany({
        skip,
        take,
        orderBy: [{ date: "asc" }, { id: "asc" }],
        select: { id: true, nomade_id: true, type: true, amount: true, description: true, date: true, receipt: true, justification: true },
      }),
    pageSize,
    async (page) => {
      for (const wt of page) {
        records.push({
          entity_type: "wallet_transaction",
          source_table: "wallet_transactions",
          original_id: wt.id,
          original_code: null,
          title: `${wt.type} ${wt.amount}`,
          subtitle: wt.description ? wt.description.slice(0, 200) : null,
          original_status: null,
          dates: { created_at: wt.date.toISOString(), updated_at: null },
          content: {
            id: wt.id,
            nomade_id: wt.nomade_id,
            type: wt.type,
            amount: wt.amount,
            description: wt.description,
            justification: wt.justification,
            receipt_ref: fileRef(wt.receipt),
          },
          search_category: wt.type,
          search_active: null,
        });
        relations.push({ from_original_id: wt.id, from_entity_type: "wallet_transaction", to_original_id: wt.nomade_id, to_entity_type: "nomade", relation_type: "belongs_to_nomade", description: null });
      }
    },
  );

  // ── Saques (nômade e parceiro) — NUNCA pix_key/pix_key_type ─────────────
  await paginate(
    (skip, take) =>
      db.withdrawalRequest.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, nomade_id: true, amount: true, status: true, reviewed_at: true, scheduled_for: true, paid_at: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const wr of page) {
        records.push({
          entity_type: "withdrawal_request",
          source_table: "withdrawal_requests",
          original_id: wr.id,
          original_code: null,
          title: `Saque ${wr.amount}`,
          subtitle: null,
          original_status: wr.status,
          dates: { ...isoDates(wr), reviewed_at: wr.reviewed_at?.toISOString() ?? null, scheduled_for: wr.scheduled_for?.toISOString() ?? null, paid_at: wr.paid_at?.toISOString() ?? null },
          // pix_key/pix_key_type NUNCA lidos.
          content: { id: wr.id, nomade_id: wr.nomade_id, amount: wr.amount, status: wr.status },
          search_category: null,
          search_active: wr.status === "aguardando_analise",
        });
        relations.push({ from_original_id: wr.id, from_entity_type: "withdrawal_request", to_original_id: wr.nomade_id, to_entity_type: "nomade", relation_type: "belongs_to_nomade", description: null });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.partnerWithdrawal.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, partner_profile_id: true, amount: true, status: true, requested_at: true, reviewed_at: true, processed_at: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const pw of page) {
        records.push({
          entity_type: "partner_withdrawal",
          source_table: "partner_withdrawals",
          original_id: pw.id,
          original_code: null,
          title: `Saque de parceiro ${pw.amount}`,
          subtitle: null,
          original_status: pw.status,
          dates: { ...isoDates(pw), requested_at: pw.requested_at.toISOString(), reviewed_at: pw.reviewed_at?.toISOString() ?? null, processed_at: pw.processed_at?.toISOString() ?? null },
          // pix_key/pix_key_type NUNCA lidos.
          content: { id: pw.id, partner_profile_id: pw.partner_profile_id, amount: pw.amount, status: pw.status },
          search_category: null,
          search_active: pw.status === "pending",
        });
        relations.push({ from_original_id: pw.id, from_entity_type: "partner_withdrawal", to_original_id: pw.partner_profile_id, to_entity_type: "partner_profile", relation_type: "belongs_to_partner", description: null });
      }
    },
  );

  // ── Comissões/repasses ───────────────────────────────────────────────────
  await paginate(
    (skip, take) =>
      db.partnerCommission.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, partner_id: true, campaign_id: true, amount: true, status: true, company_name: true, project_name: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const c of page) {
        records.push({
          entity_type: "partner_commission",
          source_table: "partner_commissions",
          original_id: c.id,
          original_code: null,
          title: `Comissão ${c.amount}`,
          subtitle: c.company_name ?? c.project_name,
          original_status: c.status,
          dates: isoDates(c),
          content: { id: c.id, partner_id: c.partner_id, campaign_id: c.campaign_id, amount: c.amount, status: c.status, company_name: c.company_name, project_name: c.project_name },
          search_category: null,
          search_active: c.status === "pending",
        });
        relations.push({ from_original_id: c.id, from_entity_type: "partner_commission", to_original_id: c.partner_id, to_entity_type: "partner_profile", relation_type: "belongs_to_partner", description: null });
      }
    },
  );

  // ── Método de pagamento de empresa (já mascarado por desenho) ───────────
  await paginate(
    (skip, take) =>
      db.companyPaymentMethod.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, company_id: true, brand: true, last_four: true, expiry: true, is_default: true, is_client_card: true, label: true, is_active: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const m of page) {
        records.push({
          entity_type: "company_payment_method",
          source_table: "company_payment_methods",
          original_id: m.id,
          original_code: null,
          title: `${m.brand} •••• ${m.last_four}`,
          subtitle: m.label,
          original_status: m.is_active ? "ativo" : "inativo",
          dates: isoDates(m),
          // holder_name NUNCA lido — last_four/expiry já vêm mascarados de origem.
          content: { id: m.id, brand: m.brand, last_four: m.last_four, expiry: m.expiry, is_default: m.is_default, is_client_card: m.is_client_card, label: m.label },
          search_category: m.brand,
          search_active: m.is_active,
        });
        relations.push({ from_original_id: m.id, from_entity_type: "company_payment_method", to_original_id: m.company_id, to_entity_type: "company", relation_type: "belongs_to_company", description: null });
      }
    },
  );

  // ── Cobrança recorrente (squad: config + ciclos) ────────────────────────
  await paginate(
    (skip, take) =>
      db.squadConfig.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, company_id: true, credit_limit: true, monthly_minimum: true, billing_day: true, payment_terms: true, status: true, consultant_id: true, started_at: true, ended_at: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      const configIds = page.map((c) => c.id);
      const cycles = await findManyChunked(configIds, (ids) =>
        db.squadCycle.findMany({
          where: { squad_config_id: { in: ids } },
          select: { id: true, squad_config_id: true, company_id: true, started_at: true, closed_at: true, due_at: true, status: true, total_consumed: true, minimum_adjustment: true, total_invoiced: true, invoice_id: true, created_at: true, updated_at: true },
        }),
      );
      const cyclesByConfig = new Map<string, typeof cycles>();
      for (const cy of cycles) cyclesByConfig.set(cy.squad_config_id, [...(cyclesByConfig.get(cy.squad_config_id) ?? []), cy]);

      for (const sc of page) {
        records.push({
          entity_type: "squad_config",
          source_table: "squad_configs",
          original_id: sc.id,
          original_code: null,
          title: `Cobrança recorrente — ${sc.company_id}`,
          subtitle: null,
          original_status: sc.status,
          dates: { ...isoDates(sc), started_at: sc.started_at.toISOString(), ended_at: sc.ended_at?.toISOString() ?? null },
          content: { id: sc.id, credit_limit: sc.credit_limit, monthly_minimum: sc.monthly_minimum, billing_day: sc.billing_day, payment_terms: sc.payment_terms, status: sc.status },
          search_category: null,
          search_active: sc.status === "active",
        });
        relations.push({ from_original_id: sc.id, from_entity_type: "squad_config", to_original_id: sc.company_id, to_entity_type: "company", relation_type: "belongs_to_company", description: null });
        if (sc.consultant_id) relations.push({ from_original_id: sc.id, from_entity_type: "squad_config", to_original_id: sc.consultant_id, to_entity_type: "user", relation_type: "managed_by_user", description: null });

        for (const cy of cyclesByConfig.get(sc.id) ?? []) {
          records.push({
            entity_type: "squad_cycle",
            source_table: "squad_cycles",
            original_id: cy.id,
            original_code: null,
            title: `Ciclo ${cy.started_at.toISOString().slice(0, 10)}`,
            subtitle: null,
            original_status: cy.status,
            dates: { created_at: cy.created_at.toISOString(), updated_at: cy.updated_at.toISOString(), started_at: cy.started_at.toISOString(), closed_at: cy.closed_at?.toISOString() ?? null, due_at: cy.due_at?.toISOString() ?? null },
            content: { id: cy.id, squad_config_id: cy.squad_config_id, company_id: cy.company_id, status: cy.status, total_consumed: cy.total_consumed, minimum_adjustment: cy.minimum_adjustment, total_invoiced: cy.total_invoiced },
            search_category: null,
            search_active: cy.status === "open",
          });
          relations.push({ from_original_id: cy.id, from_entity_type: "squad_cycle", to_original_id: cy.squad_config_id, to_entity_type: "squad_config", relation_type: "belongs_to_squad_config", description: null });
          relations.push({ from_original_id: cy.id, from_entity_type: "squad_cycle", to_original_id: cy.company_id, to_entity_type: "company", relation_type: "belongs_to_company", description: null });
          if (cy.invoice_id) relations.push({ from_original_id: cy.id, from_entity_type: "squad_cycle", to_original_id: cy.invoice_id, to_entity_type: "invoice", relation_type: "cycle_invoice", description: null });
        }
      }
    },
  );

  // ── Despesas operacionais da própria Allka ───────────────────────────────
  await paginate(
    (skip, take) =>
      db.expense.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          amount: true,
          type: true,
          recurrence: true,
          status: true,
          due_date: true,
          paid_at: true,
          payment_method: true,
          department: true,
          competence_month: true,
          attachment_url: true,
          created_by: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      for (const e of page) {
        records.push({
          entity_type: "expense",
          source_table: "expenses",
          original_id: e.id,
          original_code: null,
          title: e.name,
          subtitle: e.description ? e.description.slice(0, 200) : null,
          original_status: e.status,
          dates: { ...isoDates(e), due_date: e.due_date?.toISOString() ?? null, paid_at: e.paid_at?.toISOString() ?? null },
          content: {
            id: e.id,
            name: e.name,
            category: e.category,
            amount: e.amount,
            type: e.type,
            recurrence: e.recurrence,
            status: e.status,
            payment_method: e.payment_method,
            department: e.department,
            competence_month: e.competence_month,
            attachment_ref: fileRef(e.attachment_url),
          },
          search_category: e.category,
          search_active: e.status === "prevista" || e.status === "pendente",
        });
        if (e.created_by) relations.push({ from_original_id: e.id, from_entity_type: "expense", to_original_id: e.created_by, to_entity_type: "user", relation_type: "created_by_user", description: null });
      }
    },
  );

  // ── Aditivos do catalog2 (pagamento isolado, soft ref) ──────────────────
  await paginate(
    (skip, take) =>
      db.catalog2ChangeOrder.findMany({
        skip,
        take,
        orderBy: [{ requested_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          project_id: true,
          original_project_product_id: true,
          materialized_project_product_id: true,
          materialized_payment_id: true,
          status: true,
          price_impact_snapshot: true,
          deadline_impact_days_snapshot: true,
          currency_snapshot: true,
          requested_at: true,
          decided_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      for (const co of page) {
        records.push({
          entity_type: "catalog2_change_order",
          source_table: "catalog2_change_orders",
          original_id: co.id,
          original_code: null,
          title: `Aditivo ${co.price_impact_snapshot ?? "?"} ${co.currency_snapshot}`,
          subtitle: null,
          original_status: co.status,
          dates: { created_at: co.requested_at.toISOString(), updated_at: co.updated_at.toISOString(), requested_at: co.requested_at.toISOString(), decided_at: co.decided_at?.toISOString() ?? null },
          content: {
            id: co.id,
            project_id: co.project_id,
            status: co.status,
            price_impact_snapshot: co.price_impact_snapshot,
            deadline_impact_days_snapshot: co.deadline_impact_days_snapshot,
            currency_snapshot: co.currency_snapshot,
          },
          search_category: null,
          search_active: co.status === "solicitado",
        });
        relations.push({ from_original_id: co.id, from_entity_type: "catalog2_change_order", to_original_id: co.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
        if (co.original_project_product_id) {
          relations.push({ from_original_id: co.id, from_entity_type: "catalog2_change_order", to_original_id: co.original_project_product_id, to_entity_type: "project_product", relation_type: "change_order_for_project_product", description: null });
        }
        if (co.materialized_project_product_id) {
          relations.push({ from_original_id: co.id, from_entity_type: "catalog2_change_order", to_original_id: co.materialized_project_product_id, to_entity_type: "project_product", relation_type: "materialized_as_project_product", description: null });
        }
        // Isolado de propósito (soft ref, sem FK no operacional — ver
        // comentário do schema): o pagamento pode não existir mais ou nunca
        // ter sido importado; a relação preserva o id mesmo assim.
        if (co.materialized_payment_id) {
          relations.push({ from_original_id: co.id, from_entity_type: "catalog2_change_order", to_original_id: co.materialized_payment_id, to_entity_type: "payment", relation_type: "change_order_payment", description: "referência isolada (sem FK no operacional)" });
        }
      }
    },
  );

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}
