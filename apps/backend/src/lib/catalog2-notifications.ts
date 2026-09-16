// Item 8 (reunião 2026-09-14, "Notificações dos produtos") + Item 8.1
// ("Fechar as notificações dos produtos") — notificações comerciais do
// catalog2, reaproveitando SystemAlert (nenhum canal/campanha novo).
//
// Item 8.1 substitui o mecanismo original (2 colunas DateTime em
// Catalog2Product, só pra ativação) por uma fila DURÁVEL genérica —
// Catalog2NotificationJob + Catalog2NotificationJobRecipient — usada por
// TODOS os eventos (ativação, inativação agendada/cancelada/efetivada,
// mudança de preço, renovação): a INTENÇÃO (o Job + seus destinatários,
// já renderizados) é sempre persistida na MESMA transação da alteração
// real; o ENVIO (SystemAlert.createMany em lotes, marcando `sent_at` por
// destinatário) acontece depois, por um worker resumível — nunca duplica
// nem perde por destinatário, e nunca carrega todas as contas numa única
// requisição.
//
// "Ativação" é o único evento cujo conjunto de destinatários (TODAS as
// contas habilitadas da plataforma) é grande e caro de resolver — por
// isso é o único cujo Job nasce SEM destinatários materializados (só a
// intenção "isto precisa ser anunciado"); o worker resolve e grava os
// destinatários (em lotes) na primeira vez que pega o Job. Os demais
// eventos (inativação/preço/renovação) já sabem exatamente quem avisar no
// momento da alteração — os destinatários são materializados ali mesmo.

import type { DbClient } from "./project-scope";
import { prisma } from "./prisma";
import { computePricing, defaultSelection } from "./catalog2-pricing";

const BATCH_SIZE = 200;
// Nº máximo de lotes processados por Job em cada tick do worker — garante
// que um Job muito grande (ativação, todas as contas) nunca trava um tick
// inteiro; o resto fica pendente pro próximo tick (nunca perdido, nunca
// duplicado).
const MAX_BATCHES_PER_JOB_PER_TICK = 10;

export type Catalog2NotificationEventType =
  | "activation"
  | "inactivation_scheduled"
  | "inactivation_processed"
  | "inactivation_cancelled"
  | "commercial_change"
  | "quote_renewed";

export interface Catalog2NotificationRecipientInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  category: string;
  actionUrl?: string | null;
  /** Entidade "dona" DESTE destinatário — nunca herdada do Job. Um Job de
   * "mudança comercial" agrupa destinatários donos de cotações DIFERENTES;
   * cada linha carrega a sua própria. Quando omitido, usa a entidade do
   * Job (correto pra eventos onde todo destinatário compartilha a mesma
   * entidade — ativação, inativação). */
  entityType?: string;
  entityId?: string;
}

/**
 * Cria o Job (a INTENÇÃO de notificar) — opcionalmente já com destinatários
 * materializados (quando o chamador já sabe exatamente quem avisar).
 * SEMPRE chamado com o `db` (tx) da MESMA transação da alteração real que
 * este evento descreve — uma operação revertida nunca deixa Job nem
 * destinatário pra trás (o rollback desfaz os dois juntos).
 */
export async function createCatalog2NotificationJob(
  db: DbClient,
  params: {
    eventType: Catalog2NotificationEventType;
    entityType: string;
    entityId: string;
    recipients?: Catalog2NotificationRecipientInput[];
  },
): Promise<string> {
  const job = await db.catalog2NotificationJob.create({
    data: { event_type: params.eventType, entity_type: params.entityType, entity_id: params.entityId },
  });
  if (params.recipients && params.recipients.length > 0) {
    await createRecipientRowsInBatches(db, job.id, params.recipients, params.entityType, params.entityId);
  }
  return job.id;
}

async function createRecipientRowsInBatches(
  db: DbClient, jobId: string, recipients: Catalog2NotificationRecipientInput[],
  fallbackEntityType: string, fallbackEntityId: string,
): Promise<void> {
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    await db.catalog2NotificationJobRecipient.createMany({
      data: chunk.map((r) => ({
        job_id: jobId, user_id: r.userId, type: r.type, title: r.title, message: r.message,
        severity: r.severity, category: r.category, action_url: r.actionUrl ?? null,
        entity_type: r.entityType ?? fallbackEntityType, entity_id: r.entityId ?? fallbackEntityId,
      })),
      skipDuplicates: true,
    });
  }
}

// ─── Ativação — destinatários e mensagem por PERFIL ──────────────────────
// Item 8.1: "inclua TODAS as contas habilitadas, também administradores e
// nômades — a permissão de contratar não deve determinar quem recebe o
// comunicado." Mensagem e destino se adaptam ao perfil: quem pode contratar
// recebe o convite ao catálogo; quem só visualiza (líder) recebe o mesmo
// link sem linguagem de contratação; admin recebe um aviso administrativo
// (link pro painel, nunca o catálogo do cliente); quem não acessa o
// catálogo (nômade e demais) recebe um aviso puramente informativo, sem
// nenhum link que implique contratação — nunca dado administrativo/
// provisório em nenhuma das variantes.
type ActivationAudience = "hire" | "view" | "admin" | "none";
function classifyActivationAudience(accountType: string | null | undefined): ActivationAudience {
  if (accountType === "admin") return "admin";
  if (accountType === "empresas" || accountType === "agencias") return "hire";
  if (accountType === "lider") return "view";
  return "none";
}
function renderActivationNotification(
  audience: ActivationAudience,
  productId: string,
  publicName: string,
): { title: string; message: string; action_url: string | null } {
  switch (audience) {
    case "hire":
      return { title: "Novo produto disponível — Catálogo", message: `O produto "${publicName}" está disponível para contratação no catálogo.`, action_url: "/catalog2" };
    case "view":
      return { title: "Novo produto no catálogo", message: `O produto "${publicName}" foi publicado no catálogo.`, action_url: "/catalog2" };
    case "admin":
      return { title: "Produto ativado no catálogo", message: `O produto "${publicName}" foi ativado e está disponível no catálogo.`, action_url: `/admin/produtos?produto=${productId}` };
    default:
      return { title: "Novidade na plataforma", message: `Um novo produto ("${publicName}") foi disponibilizado no catálogo da Allka.`, action_url: "/dashboard" };
  }
}

async function isProductCommerciallyReady(publishedVersionId: string | null): Promise<boolean> {
  if (!publishedVersionId) return false;
  const pricing = await computePricing(publishedVersionId, await defaultSelection(publishedVersionId));
  return pricing.commercial_ready;
}

async function hasPendingActivationJob(db: DbClient, productId: string): Promise<boolean> {
  const existing = await db.catalog2NotificationJob.findFirst({
    where: { event_type: "activation", entity_type: "catalog2_product", entity_id: productId, status: "pending" },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Gatilho 1 — TRANSIÇÃO REAL de status pra "disponivel" (1ª publicação via
 * publishVersion, ou PATCH /products/:id/status). Chamada dentro da MESMA
 * transação da alteração de status. Só cria o Job (sem destinatários —
 * materializados depois pelo worker) quando a transição é real E o
 * produto já está comercialmente pronto agora; sempre atualiza
 * `last_known_commercially_ready` com o valor REAL avaliado, pra a
 * varredura (gatilho 2) nunca reagir a um estado que este gatilho já
 * tratou.
 */
export async function maybeCreateCatalog2ActivationJobOnStatusTransition(
  tx: DbClient,
  params: { productId: string; beforeStatus: string; afterStatus: string; publishedVersionId: string | null },
): Promise<void> {
  const CONTRACTABLE = "disponivel";
  const enteredContractable = params.afterStatus === CONTRACTABLE && params.beforeStatus !== CONTRACTABLE;
  if (!enteredContractable) return;
  const ready = await isProductCommerciallyReady(params.publishedVersionId);
  await tx.catalog2Product.update({ where: { id: params.productId }, data: { last_known_commercially_ready: ready } });
  if (!ready) return;
  if (await hasPendingActivationJob(tx, params.productId)) return; // já existe um Job não processado — nunca duplica
  await createCatalog2NotificationJob(tx, { eventType: "activation", entityType: "catalog2_product", entityId: params.productId });
}

/**
 * Gatilho 2 — Item 8.1, "produto ativo que se torna pronto depois": uma
 * varredura periódica (nunca depende de uma nova mudança de status) que
 * detecta a transição false->true de `last_known_commercially_ready`
 * enquanto o produto já está "disponivel". Reaproveita a MESMA regra
 * central de prontidão (computePricing(...).commercial_ready) do
 * gatilho 1 — nunca uma segunda lógica. "Evita anunciar o mesmo evento
 * repetidamente": só cria o Job na transição (false->true), nunca a cada
 * tick enquanto `ready` permanece true, e nunca quando o gatilho 1 já
 * tratou a mesma mudança (guard `hasPendingActivationJob`).
 *
 * "Ativação -> pausa -> reativação": esta varredura só olha produtos
 * `status:"disponivel"` — durante a pausa, o produto simplesmente não é
 * considerado (o valor antigo de `last_known_commercially_ready` fica
 * parado, sem efeito); a REATIVAÇÃO real é tratada pelo gatilho 1
 * (transição de status), que sempre reavalia do zero — nenhum marcador
 * permanente impede um novo aviso legítimo.
 */
export async function sweepCatalog2ReadinessTransitions(): Promise<{ flagged: string[] }> {
  const candidates = await prisma.catalog2Product.findMany({
    where: { status: "disponivel", last_known_commercially_ready: false },
    select: { id: true, published_version_id: true },
  });
  const flagged: string[] = [];
  for (const row of candidates) {
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.catalog2Product.findUnique({ where: { id: row.id } });
      if (!fresh || fresh.status !== "disponivel" || fresh.last_known_commercially_ready) return null; // mudou de estado entre a leitura e agora
      const ready = await isProductCommerciallyReady(fresh.published_version_id);
      if (!ready) return null; // ainda não — nada a fazer, o valor já era false
      await tx.catalog2Product.update({ where: { id: fresh.id }, data: { last_known_commercially_ready: true } });
      if (await hasPendingActivationJob(tx, fresh.id)) return { flagged: false }; // gatilho 1 já tratou esta mesma mudança
      await createCatalog2NotificationJob(tx, { eventType: "activation", entityType: "catalog2_product", entityId: fresh.id });
      return { flagged: true };
    });
    if (result?.flagged) flagged.push(row.id);
  }
  return { flagged };
}

async function recipientUserIdsForCatalog2ActivationBroadcast(): Promise<Array<{ id: string; account_type: string | null }>> {
  // Item 8.1: TODAS as contas habilitadas — nunca filtra por tipo (a
  // permissão de contratar não decide quem recebe o comunicado; ela só
  // decide QUAL variante de mensagem/link cada um recebe, ver
  // classifyActivationAudience). "Conta desabilitada não recebe":
  // is_active/status continuam o único filtro de elegibilidade.
  return prisma.user.findMany({ where: { is_active: true, status: "ativo" }, select: { id: true, account_type: true } });
}

// ─── Worker genérico — processa QUALQUER Job pendente, de QUALQUER evento ─
export async function processPendingCatalog2NotificationJobs(): Promise<{ completed: string[]; batches_sent: number }> {
  const jobs = await prisma.catalog2NotificationJob.findMany({ where: { status: "pending" }, select: { id: true, event_type: true, entity_id: true } });
  const completed: string[] = [];
  let batchesSent = 0;

  for (const job of jobs) {
    // Ativação: materializa os destinatários (TODAS as contas habilitadas,
    // renderizadas por perfil) na 1ª vez que o worker pega este Job — nunca
    // durante a requisição que criou a intenção. Idempotente: só materializa
    // se ainda não há nenhum destinatário gravado.
    if (job.event_type === "activation") {
      const already = await prisma.catalog2NotificationJobRecipient.count({ where: { job_id: job.id } });
      if (already === 0) {
        const product = await prisma.catalog2Product.findUnique({
          where: { id: job.entity_id },
          select: { id: true, internal_name: true, published_version: { select: { title: true } } },
        });
        if (!product) { await prisma.catalog2NotificationJob.update({ where: { id: job.id }, data: { status: "done", completed_at: new Date() } }); continue; }
        const publicName = product.published_version?.title ?? product.internal_name;
        const users = await recipientUserIdsForCatalog2ActivationBroadcast();
        const rows: Catalog2NotificationRecipientInput[] = users.map((u) => {
          const audience = classifyActivationAudience(u.account_type);
          const rendered = renderActivationNotification(audience, product.id, publicName);
          return { userId: u.id, type: "catalog2.product_activated", title: rendered.title, message: rendered.message, severity: "info", category: "notificacao", actionUrl: rendered.action_url };
        });
        await createRecipientRowsInBatches(prisma, job.id, rows, "catalog2_product", job.entity_id);
      }
    }

    // Envia em lotes — no máximo MAX_BATCHES_PER_JOB_PER_TICK por Job por
    // tick, pra nunca travar um tick inteiro num Job muito grande. Cada
    // lote é UMA transação: releitura fresca dos destinatários com
    // `sent_at` nulo, createMany (atômico), marca `sent_at` — falha em
    // qualquer ponto reverte o lote inteiro (nunca marca sem ter enviado).
    for (let i = 0; i < MAX_BATCHES_PER_JOB_PER_TICK; i++) {
      const sentInBatch = await prisma.$transaction(async (tx) => {
        const pending = await tx.catalog2NotificationJobRecipient.findMany({
          where: { job_id: job.id, sent_at: null },
          take: BATCH_SIZE,
        });
        if (pending.length === 0) return 0;
        const now = new Date();
        await tx.systemAlert.createMany({
          data: pending.map((r) => ({
            type: r.type, title: r.title, message: r.message, severity: r.severity, category: r.category,
            entity_type: r.entity_type, entity_id: r.entity_id,
            user_id: r.user_id, action_url: r.action_url, created_at: now,
          })),
        });
        await tx.catalog2NotificationJobRecipient.updateMany({
          where: { id: { in: pending.map((r) => r.id) } },
          data: { sent_at: now },
        });
        return pending.length;
      });
      if (sentInBatch > 0) batchesSent++;
      if (sentInBatch < BATCH_SIZE) break; // esgotou os pendentes deste Job neste tick
    }

    const remaining = await prisma.catalog2NotificationJobRecipient.count({ where: { job_id: job.id, sent_at: null } });
    if (remaining === 0) {
      await prisma.catalog2NotificationJob.update({ where: { id: job.id }, data: { status: "done", completed_at: new Date() } });
      completed.push(job.id);
    }
  }

  return { completed, batches_sent: batchesSent };
}

// ─── Alterações comerciais — aviso aos donos de propostas vigentes ───────
// Item 8, ponto 3 (mantido pelo 8.1): "notifique os donos das propostas
// vigentes afetadas por mudanças comerciais... explique o prazo restante
// de proteção com a data calculada pelo Item 4.1." Reaproveita a MESMA
// janela de 30 dias já usada pelo Item 4.1 (PRICE_PROTECTION_DAYS em
// catalog2-client.ts) — duplicada aqui como uma constante isolada (não
// como lógica de preço) porque catalog2-client.ts já importa de
// catalog2-service.ts, que precisa deste módulo; importar de volta criaria
// um ciclo. Nunca recalcula preço, só lê `price_protection_started_at` já
// persistido pelo mecanismo do Item 4.1.
const CATALOG2_PRICE_PROTECTION_DAYS = 30;

export type Catalog2CommercialNotificationScope = "global_settings" | "specialty_rate" | "product_version";

/**
 * Materializa (dentro do `db`/tx do chamador — sempre a MESMA transação da
 * alteração comercial real) um Job com os destinatários JÁ resolvidos:
 * donos de cotações (propostas) VIGENTES ("valida", ainda dentro da
 * própria validade) afetadas — nunca contratos já convertidos/pagos
 * (status "valida" já exclui "convertida"). Só inclui quem AINDA tem
 * proteção de preço ativa (faz sentido "explicar quanto tempo resta");
 * sem proteção ativa, o preço já seria recalculado no próximo /revalidate
 * de qualquer forma — fora do escopo deste aviso.
 */
export async function notifyValidQuoteOwnersOfCommercialChange(
  db: DbClient,
  params: { scope: Catalog2CommercialNotificationScope; productId?: string; specialtyId?: string },
): Promise<{ notified: number }> {
  const now = new Date();
  let productIds: string[] | undefined;
  if (params.scope === "product_version") {
    if (!params.productId) return { notified: 0 };
    productIds = [params.productId];
  } else if (params.scope === "specialty_rate") {
    if (!params.specialtyId) return { notified: 0 };
    const rows = await db.catalog2Task.findMany({
      where: { specialty_id: params.specialtyId },
      select: { version: { select: { product_id: true } } },
      distinct: ["version_id"],
    });
    productIds = [...new Set(rows.map((r) => r.version.product_id))];
    if (productIds.length === 0) return { notified: 0 };
  }
  // scope "global_settings": productIds fica undefined -> sem filtro de
  // produto (toda cotação vigente/protegida é afetada por definição).

  const quotes = await db.catalog2Quote.findMany({
    where: {
      status: "valida",
      ...(productIds ? { product_id: { in: productIds } } : {}),
    },
    select: { id: true, user_id: true, product_id: true, valid_until: true, price_protection_started_at: true },
  });
  if (quotes.length === 0) return { notified: 0 };

  const relevantProductIds = [...new Set(quotes.map((q) => q.product_id))];
  const products = await db.catalog2Product.findMany({
    where: { id: { in: relevantProductIds } },
    select: { id: true, internal_name: true, published_version: { select: { title: true } } },
  });
  const nameById = new Map(products.map((p) => [p.id, p.published_version?.title ?? p.internal_name]));

  const recipients: Catalog2NotificationRecipientInput[] = [];
  for (const q of quotes) {
    const vigente = q.valid_until == null || q.valid_until >= now;
    if (!vigente) continue;
    const protectionEndsAt = q.price_protection_started_at
      ? new Date(q.price_protection_started_at.getTime() + CATALOG2_PRICE_PROTECTION_DAYS * 24 * 3600 * 1000)
      : null;
    if (!protectionEndsAt || protectionEndsAt <= now) continue; // sem proteção ativa — nada a explicar sobre prazo restante
    const daysLeft = Math.max(1, Math.ceil((protectionEndsAt.getTime() - now.getTime()) / (24 * 3600 * 1000)));
    recipients.push({
      userId: q.user_id,
      type: "catalog2.commercial_change",
      title: "Alteração comercial no catálogo",
      message: `Uma alteração comercial foi registrada no catálogo. Sua proposta para "${nameById.get(q.product_id) ?? "produto"}" continua com o preço protegido por mais ${daysLeft} dia(s) (até ${protectionEndsAt.toISOString().slice(0, 10)}).`,
      severity: "info",
      category: "notificacao",
      actionUrl: "/catalog2-checkout",
      // Cada destinatário é dono de uma cotação DIFERENTE — nunca a
      // entidade do Job (que é a especialidade/produto que mudou).
      entityType: "catalog2_quote",
      entityId: q.id,
    });
  }
  if (recipients.length === 0) return { notified: 0 };
  await createCatalog2NotificationJob(db, {
    eventType: "commercial_change",
    entityType: params.scope === "specialty_rate" ? "catalog2_specialty" : "catalog2_product",
    entityId: params.specialtyId ?? params.productId ?? "global",
    recipients,
  });
  return { notified: recipients.length };
}
