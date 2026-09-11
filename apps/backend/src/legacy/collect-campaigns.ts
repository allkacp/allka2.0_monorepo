// Fotografia de CAMPANHAS, CUPONS e DESTINATÁRIOS — bloco final de
// cobertura do Legado (último domínio operacional pendente).
//
// Reaproveita o MESMO mecanismo genérico (RawRecord/RawRelation/
// SnapshotCollection, sanitizeForLegacy, runImport) — nenhum schema/migration
// novo. Só a COLETA é o que este arquivo acrescenta.
//
// ── Auditoria do schema real (não presumida) ────────────────────────────────
// Campaign: name/type/status/commission_type/commission_value/coupon_code/
// start_date/end_date — SEM company_id/agency_id/created_by (não existem no
// modelo real); nenhuma relação "campanha→empresa/agência/criador" é
// inventada aqui por não haver FK. `coupon_code` (Campaign) e `code`
// (Coupon) são namespaces INDEPENDENTES — apesar do nome parecido, não há
// FK entre os dois modelos, então nenhuma relação campaign↔coupon é criada.
//
// Coupon/CouponUsage/CommunicationCampaign/CampaignRecipientState: todo
// "destinatário" deste domínio é um User real (recipient_user_id/
// linked_user_id) ou uma Company (CouponUsage.company_id) — já cobertos
// pelo coletor de identidade/organizações. NÃO existe, no schema real, lista
// bruta de contato externo (e-mail/telefone solto) nem entidade de "lead"
// para mascarar — auditado via grep em src/lib/comms/*.ts e no schema; a
// decisão de não mascarar nada é porque não há o que mascarar, não uma
// omissão.
//
// "communication_delivery" (origin="campaign") é coletado AQUI — o coletor
// de alertas/notificações/chat (bloco anterior) filtra essas linhas fora de
// propósito (documentado lá), reusando o MESMO entity_type físico, nunca
// redeclarado.
//
// Métricas de abertura/clique/conversão citadas conceitualmente no pedido
// NÃO existem no schema nem no código — só status/state já cobertos.
//
// ── Segurança ────────────────────────────────────────────────────────────
// NUNCA lido: token de API, segredo de webhook, credencial SMTP/WhatsApp/
// push, payload bruto de provedor, header HTTP, cookie — nenhum desses
// campos existe nas entidades deste domínio (auditado), então nem chegam a
// ser selecionados. Allowlist explícita por entidade, igual aos blocos
// anteriores. sanitizeForLegacy/scrubSecretValues continuam rodando por
// cima de tudo (agora também sobre title/subtitle/original_code, corrigido
// no bloco anterior) como segunda camada.
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { fileRef, isoDates, safeJsonParse, type RawRecord, type RawRelation, type SnapshotCollection } from "./importer";
import { paginate } from "./pagination";

const PAGE_SIZE = 200;

export interface CollectCampaignsOptions {
  /** Registros por página de leitura (padrão 200). Nunca um findMany() sem limite. */
  pageSize?: number;
}

export async function collectCampaignsSnapshot(
  db: OperationalPrisma,
  opts: CollectCampaignsOptions = {},
): Promise<SnapshotCollection> {
  const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : PAGE_SIZE;
  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  // ── Campanhas de comissão/indicação (Campaign) ──────────────────────────
  await paginate(
    (skip, take) =>
      db.campaign.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, name: true, type: true, status: true, commission_type: true, commission_value: true, coupon_code: true, start_date: true, end_date: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const c of page) {
        records.push({
          entity_type: "campaign",
          source_table: "campaigns",
          original_id: c.id,
          original_code: c.coupon_code,
          title: c.name,
          subtitle: c.type,
          original_status: c.status,
          dates: { ...isoDates(c), start_date: c.start_date?.toISOString() ?? null, end_date: c.end_date?.toISOString() ?? null },
          content: { id: c.id, name: c.name, type: c.type, status: c.status, commission_type: c.commission_type, commission_value: c.commission_value, coupon_code: c.coupon_code },
          search_category: c.type,
          search_active: c.status === "active",
        });
      }
    },
  );

  // ── Cupons + usos ────────────────────────────────────────────────────────
  await paginate(
    (skip, take) =>
      db.coupon.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          code: true,
          coupon_type: true,
          discount_type: true,
          discount_value: true,
          credit_bonus: true,
          usage_limit: true,
          usage_limit_per_company: true,
          max_uses_per_company: true,
          valid_from: true,
          valid_until: true,
          applicable_products: true,
          allowed_account_types: true,
          allowed_company_ids: true,
          allowed_user_ids: true,
          linked_user_id: true,
          linked_user_commission_type: true,
          linked_user_commission_value: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const couponIds = page.map((c) => c.id);
      const usages = await db.couponUsage.findMany({
        where: { coupon_id: { in: couponIds } },
        select: { id: true, coupon_id: true, company_id: true, used_at: true },
      });
      const usagesByCoupon = new Map<string, typeof usages>();
      for (const u of usages) usagesByCoupon.set(u.coupon_id, [...(usagesByCoupon.get(u.coupon_id) ?? []), u]);

      for (const c of page) {
        records.push({
          entity_type: "coupon",
          source_table: "coupons",
          original_id: c.id,
          original_code: c.code,
          title: c.code,
          subtitle: c.coupon_type,
          original_status: c.status,
          dates: { ...isoDates(c), valid_from: c.valid_from?.toISOString() ?? null, valid_until: c.valid_until?.toISOString() ?? null },
          content: {
            id: c.id,
            code: c.code,
            coupon_type: c.coupon_type,
            discount_type: c.discount_type,
            discount_value: c.discount_value,
            credit_bonus: c.credit_bonus,
            usage_limit: c.usage_limit,
            usage_limit_per_company: c.usage_limit_per_company,
            max_uses_per_company: c.max_uses_per_company,
            // Critério de segmentação em forma SEGURA — listas de ids
            // estruturadas (nunca SQL livre, nunca contato externo bruto).
            applicable_products: safeJsonParse(c.applicable_products),
            allowed_account_types: safeJsonParse(c.allowed_account_types),
            allowed_company_ids: safeJsonParse(c.allowed_company_ids),
            allowed_user_ids: safeJsonParse(c.allowed_user_ids),
            linked_user_commission_type: c.linked_user_commission_type,
            linked_user_commission_value: c.linked_user_commission_value,
            status: c.status,
          },
          search_category: c.coupon_type,
          search_active: c.status === "active",
        });
        if (c.linked_user_id) relations.push({ from_original_id: c.id, from_entity_type: "coupon", to_original_id: c.linked_user_id, to_entity_type: "user", relation_type: "coupon_linked_user", description: null });

        for (const u of usagesByCoupon.get(c.id) ?? []) {
          records.push({
            entity_type: "coupon_usage",
            source_table: "coupon_usages",
            original_id: u.id,
            original_code: null,
            title: null,
            subtitle: null,
            original_status: null,
            dates: { created_at: u.used_at.toISOString(), updated_at: null },
            content: { id: u.id, coupon_id: u.coupon_id, company_id: u.company_id },
            search_category: null,
            search_active: null,
          });
          relations.push({ from_original_id: u.id, from_entity_type: "coupon_usage", to_original_id: u.coupon_id, to_entity_type: "coupon", relation_type: "belongs_to_coupon", description: null });
          if (u.company_id) relations.push({ from_original_id: u.id, from_entity_type: "coupon_usage", to_original_id: u.company_id, to_entity_type: "company", relation_type: "used_by_company", description: null });
        }
      }
    },
  );

  // ── Campanhas de comunicação + estado por destinatário ──────────────────
  await paginate(
    (skip, take) =>
      db.communicationCampaign.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          internal_name: true,
          title: true,
          body: true,
          image_file_name: true,
          image_alt: true,
          link_url: true,
          channels_json: true,
          audience_json: true,
          status: true,
          is_reengagement: true,
          inactivity_days: true,
          scheduled_at: true,
          starts_at: true,
          ends_at: true,
          target_environment: true,
          activated_at: true,
          activated_by_user_id: true,
          completed_at: true,
          created_by_user_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const campaignIds = page.map((c) => c.id);
      const recipientStates = await db.campaignRecipientState.findMany({
        where: { campaign_id: { in: campaignIds } },
        select: { id: true, campaign_id: true, recipient_user_id: true, state: true, reason: true, processed_at: true, created_at: true },
      });
      const statesByCampaign = new Map<string, typeof recipientStates>();
      for (const s of recipientStates) statesByCampaign.set(s.campaign_id, [...(statesByCampaign.get(s.campaign_id) ?? []), s]);

      const deliveries = await db.communicationDelivery.findMany({
        where: { origin: "campaign", origin_id: { in: campaignIds } },
        select: { id: true, origin_id: true, recipient_user_id: true, channel: true, status: true, scheduled_for: true, delivered_at: true, failed_at: true, failure_summary: true, attempts: true, created_at: true, updated_at: true },
      });
      const deliveriesByCampaign = new Map<string, typeof deliveries>();
      for (const d of deliveries) if (d.origin_id) deliveriesByCampaign.set(d.origin_id, [...(deliveriesByCampaign.get(d.origin_id) ?? []), d]);

      for (const c of page) {
        records.push({
          entity_type: "communication_campaign",
          source_table: "communication_campaigns",
          original_id: c.id,
          original_code: c.internal_name,
          title: c.title,
          subtitle: c.internal_name,
          original_status: c.status,
          dates: { ...isoDates(c), scheduled_at: c.scheduled_at?.toISOString() ?? null, starts_at: c.starts_at?.toISOString() ?? null, ends_at: c.ends_at?.toISOString() ?? null, activated_at: c.activated_at?.toISOString() ?? null, completed_at: c.completed_at?.toISOString() ?? null },
          content: {
            id: c.id,
            internal_name: c.internal_name,
            title: c.title,
            body: c.body,
            image_ref: fileRef(c.image_file_name),
            image_alt: c.image_alt,
            link_url: c.link_url,
            channels: safeJsonParse(c.channels_json),
            // Público-alvo já estruturado/seguro na origem (ver comentário
            // do schema) — nunca SQL livre nem contato bruto.
            audience: safeJsonParse(c.audience_json),
            status: c.status,
            is_reengagement: c.is_reengagement,
            inactivity_days: c.inactivity_days,
            target_environment: c.target_environment,
          },
          search_category: c.status,
          search_active: c.status === "draft" || c.status === "scheduled" || c.status === "processing",
        });
        if (c.created_by_user_id) relations.push({ from_original_id: c.id, from_entity_type: "communication_campaign", to_original_id: c.created_by_user_id, to_entity_type: "user", relation_type: "campaign_created_by", description: null });
        if (c.activated_by_user_id) relations.push({ from_original_id: c.id, from_entity_type: "communication_campaign", to_original_id: c.activated_by_user_id, to_entity_type: "user", relation_type: "campaign_activated_by", description: null });

        for (const s of statesByCampaign.get(c.id) ?? []) {
          records.push({
            entity_type: "campaign_recipient_state",
            source_table: "campaign_recipient_states",
            original_id: s.id,
            original_code: null,
            title: null,
            subtitle: s.reason,
            original_status: s.state,
            dates: { ...isoDates(s), processed_at: s.processed_at?.toISOString() ?? null },
            content: { id: s.id, campaign_id: s.campaign_id, state: s.state, reason: s.reason },
            search_category: s.state,
            search_active: s.state === "queued",
          });
          relations.push({ from_original_id: s.id, from_entity_type: "campaign_recipient_state", to_original_id: s.campaign_id, to_entity_type: "communication_campaign", relation_type: "belongs_to_campaign", description: null });
          relations.push({ from_original_id: s.id, from_entity_type: "campaign_recipient_state", to_original_id: s.recipient_user_id, to_entity_type: "user", relation_type: "recipient_user", description: null });
        }

        for (const d of deliveriesByCampaign.get(c.id) ?? []) {
          records.push({
            entity_type: "communication_delivery",
            source_table: "communication_deliveries",
            original_id: d.id,
            original_code: null,
            title: `campaign · ${d.channel}`,
            subtitle: d.failure_summary,
            original_status: d.status,
            dates: { ...isoDates(d), scheduled_for: d.scheduled_for.toISOString(), delivered_at: d.delivered_at?.toISOString() ?? null, failed_at: d.failed_at?.toISOString() ?? null },
            content: { id: d.id, origin: "campaign", origin_id: d.origin_id, channel: d.channel, status: d.status, failure_summary: d.failure_summary, attempts: d.attempts },
            search_category: d.channel,
            search_active: d.status === "pending" || d.status === "processing",
          });
          relations.push({ from_original_id: d.id, from_entity_type: "communication_delivery", to_original_id: d.recipient_user_id, to_entity_type: "user", relation_type: "delivery_recipient", description: null });
          relations.push({ from_original_id: d.id, from_entity_type: "communication_delivery", to_original_id: c.id, to_entity_type: "communication_campaign", relation_type: "delivery_for_campaign", description: null });
        }
      }
    },
  );

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}
