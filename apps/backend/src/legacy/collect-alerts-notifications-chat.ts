// Fotografia de ALERTAS, NOTIFICAÇÕES e CHAT — bloco seguinte ao financeiro.
//
// Reaproveita o MESMO mecanismo genérico (RawRecord/RawRelation/
// SnapshotCollection, sanitizeForLegacy, runImport) — nenhum schema/migration
// novo. Só a COLETA é o que este arquivo acrescenta.
//
// ── Segurança (allowlist explícita, nunca objeto inteiro) ──────────────────
// NUNCA lido: PushSubscription inteira (endpoint/p256dh/auth são a
// CREDENCIAL de criptografia do canal push); CommunicationDelivery.
// metadata_json/preview_json (podem carregar id/payload de provedor externo
// ou o corpo integral de um envio — nem lidos, mesmo já descritos como "sem
// segredo" no schema, por prudência: allowlist explícita, não confiança no
// comentário de outro módulo). sanitizeForLegacy/scrubSecretValues rodam por
// cima de tudo como segunda camada — inclusive sobre o TEXTO livre de
// mensagens de chat/alerta/notificação, que é onde um segredo colado à mão
// (token, chave) mais provavelmente apareceria escondido num campo comum.
//
// Deliberadamente FORA deste bloco (ver relatório): PushSubscription,
// IallkaSession/IallkaMessage (chat do assistente de IA, outro domínio),
// CommunicationCampaign/CampaignRecipientState (campanhas, ainda adiado) — e,
// dentro de CommunicationDelivery, só origin IN ('notification','banner')
// entra; origin='campaign' é filtrado fora na própria consulta.
//
// ── Anexos/imagens ──────────────────────────────────────────────────────────
// image_file_name (AlertStandard/SystemAlert/AlertSchedule/
// MandatoryBanner/CommunicationCampaign) é preservado como
// `image_ref: { reference, file_available_in_snapshot: false }` — nome,
// tipo (quando disponível) e referência; o binário nunca é copiado.
//
// ── Mensagens removidas ─────────────────────────────────────────────────────
// ChatMessage não tem, no schema real, nenhuma coluna de remoção/edição nem
// de resposta a outra mensagem — não existe "estado de remoção" nem "relação
// de resposta" para preservar aqui (documentado no relatório do bloco, não
// inventado).
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { fileRef, isoDates, safeJsonParse, type RawRecord, type RawRelation, type SnapshotCollection } from "./importer";
import { findManyChunked, paginate } from "./pagination";

const PAGE_SIZE = 200;

// entity_type de SystemAlert -> to_entity_type do Legado, só para os valores
// que de fato têm coletor próprio (projetos/tarefas/etapas). Qualquer outro
// valor (ex.: tipos futuros) fica preservado em texto (entity_type/entity_id
// no content), sem relação tipada.
const ALERT_ENTITY_TO_LEGACY_TYPE: Record<string, "project" | "project_task" | "project_task_stage"> = {
  project: "project",
  project_task: "project_task",
  project_task_stage: "project_task_stage",
};

export interface CollectAlertsNotificationsChatOptions {
  /** Registros por página de leitura (padrão 200). Nunca um findMany() sem limite. */
  pageSize?: number;
}

export async function collectAlertsNotificationsChatSnapshot(
  db: OperationalPrisma,
  opts: CollectAlertsNotificationsChatOptions = {},
): Promise<SnapshotCollection> {
  const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : PAGE_SIZE;
  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  // ── Padrões, regras e programações (config necessária pra interpretar o alerta) ──
  await paginate(
    (skip, take) =>
      db.alertStandard.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          key: true,
          name: true,
          title: true,
          message: true,
          default_severity: true,
          is_active: true,
          is_system: true,
          is_mandatory: true,
          mandatory_min_severity: true,
          allowed_variables_json: true,
          additional_channels_json: true,
          governed_event_types_json: true,
          image_file_name: true,
          image_alt: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      for (const s of page) {
        records.push({
          entity_type: "alert_standard",
          source_table: "alert_standards",
          original_id: s.id,
          original_code: s.key,
          title: s.name,
          subtitle: s.title,
          original_status: s.is_active ? "ativo" : "inativo",
          dates: isoDates(s),
          content: {
            id: s.id,
            key: s.key,
            name: s.name,
            title: s.title,
            message: s.message,
            default_severity: s.default_severity,
            is_active: s.is_active,
            is_system: s.is_system,
            is_mandatory: s.is_mandatory,
            mandatory_min_severity: s.mandatory_min_severity,
            allowed_variables: safeJsonParse(s.allowed_variables_json),
            additional_channels: safeJsonParse(s.additional_channels_json),
            governed_event_types: safeJsonParse(s.governed_event_types_json),
            image_ref: fileRef(s.image_file_name),
            image_alt: s.image_alt,
          },
          search_category: s.default_severity,
          search_active: s.is_active,
        });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.alertRule.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, standard_id: true, name: true, trigger_type: true, is_active: true, lead_time_minutes: true, severity_override: true, config_json: true, recipient_roles_json: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const r of page) {
        records.push({
          entity_type: "alert_rule",
          source_table: "alert_rules",
          original_id: r.id,
          original_code: null,
          title: r.name,
          subtitle: r.trigger_type,
          original_status: r.is_active ? "ativo" : "inativo",
          dates: isoDates(r),
          content: {
            id: r.id,
            name: r.name,
            trigger_type: r.trigger_type,
            is_active: r.is_active,
            lead_time_minutes: r.lead_time_minutes,
            severity_override: r.severity_override,
            config: safeJsonParse(r.config_json),
            recipient_roles: safeJsonParse(r.recipient_roles_json),
          },
          search_category: r.trigger_type,
          search_active: r.is_active,
        });
        relations.push({ from_original_id: r.id, from_entity_type: "alert_rule", to_original_id: r.standard_id, to_entity_type: "alert_standard", relation_type: "belongs_to_standard", description: null });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.alertSchedule.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          title: true,
          message: true,
          severity: true,
          image_file_name: true,
          image_alt: true,
          user_id: true,
          recurrence_type: true,
          weekdays_json: true,
          time_of_day: true,
          timezone: true,
          starts_at: true,
          ends_at: true,
          occurrence_expires_minutes: true,
          is_active: true,
          is_archived: true,
          archived_at: true,
          last_run_at: true,
          next_run_at: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      for (const sch of page) {
        records.push({
          entity_type: "alert_schedule",
          source_table: "alert_schedules",
          original_id: sch.id,
          original_code: null,
          title: sch.name,
          subtitle: sch.title,
          original_status: sch.is_archived ? "arquivado" : sch.is_active ? "ativo" : "inativo",
          dates: { ...isoDates(sch), starts_at: sch.starts_at.toISOString(), ends_at: sch.ends_at?.toISOString() ?? null, last_run_at: sch.last_run_at?.toISOString() ?? null, next_run_at: sch.next_run_at?.toISOString() ?? null },
          content: {
            id: sch.id,
            name: sch.name,
            title: sch.title,
            message: sch.message,
            severity: sch.severity,
            image_ref: fileRef(sch.image_file_name),
            image_alt: sch.image_alt,
            recurrence_type: sch.recurrence_type,
            weekdays: safeJsonParse(sch.weekdays_json),
            time_of_day: sch.time_of_day,
            timezone: sch.timezone,
            occurrence_expires_minutes: sch.occurrence_expires_minutes,
            is_active: sch.is_active,
            is_archived: sch.is_archived,
          },
          search_category: null,
          search_active: sch.is_active && !sch.is_archived,
        });
        if (sch.user_id) relations.push({ from_original_id: sch.id, from_entity_type: "alert_schedule", to_original_id: sch.user_id, to_entity_type: "user", relation_type: "schedule_recipient", description: null });
      }
    },
  );

  // ── Ocorrências de alerta + eventos ──────────────────────────────────────
  await paginate(
    (skip, take) =>
      db.systemAlert.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          severity: true,
          category: true,
          entity_type: true,
          entity_id: true,
          entity_parent_id: true,
          user_id: true,
          action_url: true,
          is_read: true,
          read_at: true,
          is_archived: true,
          archived_at: true,
          created_at: true,
          notification_message_id: true,
          standard_id: true,
          rule_id: true,
          resolved_at: true,
          resolution_reason: true,
          image_file_name: true,
          image_alt: true,
          expires_at: true,
          schedule_id: true,
          created_by_user_id: true,
          manual_resolved_at: true,
          resolved_by_user_id: true,
          resolution_action: true,
          resolution_description: true,
          automatic_resolved_at: true,
          automatic_resolution_reason: true,
          automatic_resolution_message: true,
          condition_cleared_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const alertIds = page.map((a) => a.id);
      const events = await findManyChunked(alertIds, (ids) =>
        db.systemAlertEvent.findMany({
          where: { alert_id: { in: ids } },
          select: { id: true, alert_id: true, event_type: true, actor_user_id: true, description: true, metadata_json: true, created_at: true },
        }),
      );
      const eventsByAlert = new Map<string, typeof events>();
      for (const ev of events) eventsByAlert.set(ev.alert_id, [...(eventsByAlert.get(ev.alert_id) ?? []), ev]);

      for (const a of page) {
        records.push({
          entity_type: "system_alert",
          source_table: "system_alerts",
          original_id: a.id,
          original_code: null,
          title: a.title,
          subtitle: a.message ? a.message.slice(0, 200) : null,
          original_status: a.is_archived ? "arquivado" : a.resolved_at || a.manual_resolved_at || a.automatic_resolved_at ? "resolvido" : a.is_read ? "lido" : "novo",
          dates: {
            ...isoDates(a),
            read_at: a.read_at?.toISOString() ?? null,
            archived_at: a.archived_at?.toISOString() ?? null,
            resolved_at: a.resolved_at?.toISOString() ?? null,
            expires_at: a.expires_at?.toISOString() ?? null,
            manual_resolved_at: a.manual_resolved_at?.toISOString() ?? null,
            automatic_resolved_at: a.automatic_resolved_at?.toISOString() ?? null,
            condition_cleared_at: a.condition_cleared_at?.toISOString() ?? null,
          },
          content: {
            id: a.id,
            type: a.type,
            title: a.title,
            message: a.message,
            severity: a.severity,
            category: a.category,
            entity_type: a.entity_type,
            entity_id: a.entity_id,
            entity_parent_id: a.entity_parent_id,
            action_url: a.action_url,
            is_read: a.is_read,
            is_archived: a.is_archived,
            resolution_reason: a.resolution_reason,
            image_ref: fileRef(a.image_file_name),
            image_alt: a.image_alt,
            resolution_action: a.resolution_action,
            resolution_description: a.resolution_description,
            automatic_resolution_reason: a.automatic_resolution_reason,
            automatic_resolution_message: a.automatic_resolution_message,
          },
          search_category: a.category,
          search_active: !a.is_archived,
        });

        if (a.user_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.user_id, to_entity_type: "user", relation_type: "alert_recipient", description: null });
        if (a.standard_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.standard_id, to_entity_type: "alert_standard", relation_type: "from_standard", description: null });
        if (a.rule_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.rule_id, to_entity_type: "alert_rule", relation_type: "from_rule", description: null });
        if (a.schedule_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.schedule_id, to_entity_type: "alert_schedule", relation_type: "from_schedule", description: null });
        if (a.notification_message_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.notification_message_id, to_entity_type: "notification_message", relation_type: "from_notification_message", description: null });
        if (a.created_by_user_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.created_by_user_id, to_entity_type: "user", relation_type: "alert_created_by", description: null });
        if (a.resolved_by_user_id) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.resolved_by_user_id, to_entity_type: "user", relation_type: "alert_resolved_by", description: null });
        if (a.entity_type && a.entity_id) {
          const mapped = ALERT_ENTITY_TO_LEGACY_TYPE[a.entity_type];
          if (mapped) relations.push({ from_original_id: a.id, from_entity_type: "system_alert", to_original_id: a.entity_id, to_entity_type: mapped, relation_type: "alert_about_entity", description: a.entity_type });
        }

        for (const ev of eventsByAlert.get(a.id) ?? []) {
          records.push({
            entity_type: "system_alert_event",
            source_table: "system_alert_events",
            original_id: ev.id,
            original_code: null,
            title: ev.event_type,
            subtitle: ev.description ? ev.description.slice(0, 200) : null,
            original_status: null,
            dates: { created_at: ev.created_at.toISOString(), updated_at: null },
            content: { id: ev.id, alert_id: ev.alert_id, event_type: ev.event_type, description: ev.description, metadata: safeJsonParse(ev.metadata_json) },
            search_category: ev.event_type,
            search_active: null,
          });
          relations.push({ from_original_id: ev.id, from_entity_type: "system_alert_event", to_original_id: ev.alert_id, to_entity_type: "system_alert", relation_type: "belongs_to_alert", description: null });
          if (ev.actor_user_id) relations.push({ from_original_id: ev.id, from_entity_type: "system_alert_event", to_original_id: ev.actor_user_id, to_entity_type: "user", relation_type: "event_actor", description: null });
        }
      }
    },
  );

  // ── Notificações: mensagens, regras, preferências, grupos, canais ────────
  await paginate(
    (skip, take) =>
      db.notificationMessage.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, name: true, title: true, content: true, is_active: true, created_by: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const m of page) {
        records.push({
          entity_type: "notification_message",
          source_table: "notification_messages",
          original_id: m.id,
          original_code: null,
          title: m.name,
          subtitle: m.title,
          original_status: m.is_active ? "ativo" : "inativo",
          dates: isoDates(m),
          content: { id: m.id, name: m.name, title: m.title, content: m.content, is_active: m.is_active },
          search_category: null,
          search_active: m.is_active,
        });
        if (m.created_by) relations.push({ from_original_id: m.id, from_entity_type: "notification_message", to_original_id: m.created_by, to_entity_type: "user", relation_type: "created_by_user", description: null });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.notificationRule.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, message_id: true, name: true, is_active: true, target_account_types: true, target_roles: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const r of page) {
        records.push({
          entity_type: "notification_rule",
          source_table: "notification_rules",
          original_id: r.id,
          original_code: null,
          title: r.name,
          subtitle: null,
          original_status: r.is_active ? "ativo" : "inativo",
          dates: isoDates(r),
          content: { id: r.id, name: r.name, is_active: r.is_active, target_account_types: r.target_account_types, target_roles: r.target_roles },
          search_category: null,
          search_active: r.is_active,
        });
        relations.push({ from_original_id: r.id, from_entity_type: "notification_rule", to_original_id: r.message_id, to_entity_type: "notification_message", relation_type: "belongs_to_message", description: null });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.notificationPreference.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, user_id: true, event_type: true, channel: true, enabled: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const p of page) {
        records.push({
          entity_type: "notification_preference",
          source_table: "notification_preferences",
          original_id: p.id,
          original_code: null,
          title: `${p.event_type} · ${p.channel}`,
          subtitle: null,
          original_status: p.enabled ? "habilitado" : "desabilitado",
          dates: isoDates(p),
          content: { id: p.id, event_type: p.event_type, channel: p.channel, enabled: p.enabled },
          search_category: p.channel,
          search_active: p.enabled,
        });
        relations.push({ from_original_id: p.id, from_entity_type: "notification_preference", to_original_id: p.user_id, to_entity_type: "user", relation_type: "belongs_to_user", description: null });
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.notificationGroup.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          owner_user_id: true,
          name: true,
          description: true,
          purpose: true,
          status: true,
          requested_by_id: true,
          approved_by_id: true,
          approved_at: true,
          rejected_by_id: true,
          rejected_at: true,
          rejection_reason: true,
          archived_by_id: true,
          archived_at: true,
          conversation_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const groupIds = page.map((g) => g.id);
      const members = await findManyChunked(groupIds, (ids) =>
        db.notificationGroupMember.findMany({ where: { group_id: { in: ids } }, select: { id: true, group_id: true, user_id: true, created_at: true } }),
      );
      const membersByGroup = new Map<string, typeof members>();
      for (const m of members) membersByGroup.set(m.group_id, [...(membersByGroup.get(m.group_id) ?? []), m]);

      for (const g of page) {
        records.push({
          entity_type: "notification_group",
          source_table: "notification_groups",
          original_id: g.id,
          original_code: null,
          title: g.name,
          subtitle: g.description,
          original_status: g.status,
          dates: { ...isoDates(g), approved_at: g.approved_at?.toISOString() ?? null, rejected_at: g.rejected_at?.toISOString() ?? null, archived_at: g.archived_at?.toISOString() ?? null },
          content: { id: g.id, name: g.name, description: g.description, purpose: g.purpose, status: g.status, rejection_reason: g.rejection_reason },
          search_category: g.status,
          search_active: g.status === "active",
        });
        relations.push({ from_original_id: g.id, from_entity_type: "notification_group", to_original_id: g.owner_user_id, to_entity_type: "user", relation_type: "group_owner", description: null });
        if (g.requested_by_id) relations.push({ from_original_id: g.id, from_entity_type: "notification_group", to_original_id: g.requested_by_id, to_entity_type: "user", relation_type: "group_requested_by", description: null });
        if (g.approved_by_id) relations.push({ from_original_id: g.id, from_entity_type: "notification_group", to_original_id: g.approved_by_id, to_entity_type: "user", relation_type: "group_approved_by", description: null });
        if (g.conversation_id) relations.push({ from_original_id: g.id, from_entity_type: "notification_group", to_original_id: g.conversation_id, to_entity_type: "conversation", relation_type: "group_conversation", description: null });

        for (const m of membersByGroup.get(g.id) ?? []) {
          records.push({
            entity_type: "notification_group_member",
            source_table: "notification_group_members",
            original_id: m.id,
            original_code: null,
            title: null,
            subtitle: null,
            original_status: null,
            dates: { created_at: m.created_at.toISOString(), updated_at: null },
            content: { id: m.id, group_id: m.group_id, user_id: m.user_id },
            search_category: null,
            search_active: null,
          });
          relations.push({ from_original_id: m.id, from_entity_type: "notification_group_member", to_original_id: m.group_id, to_entity_type: "notification_group", relation_type: "belongs_to_group", description: null });
          relations.push({ from_original_id: m.id, from_entity_type: "notification_group_member", to_original_id: m.user_id, to_entity_type: "user", relation_type: "member_user", description: null });
        }
      }
    },
  );

  await paginate(
    (skip, take) =>
      db.userCommunicationChannelPref.findMany({
        skip,
        take,
        orderBy: [{ user_id: "asc" }],
        select: { user_id: true, platform_enabled: true, email_enabled: true, whatsapp_enabled: true, push_enabled: true, marketing_opt_in: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const p of page) {
        records.push({
          entity_type: "user_communication_channel_pref",
          source_table: "user_communication_channel_prefs",
          original_id: p.user_id,
          original_code: null,
          title: "Preferência de canais",
          subtitle: null,
          original_status: null,
          dates: { created_at: null, updated_at: p.updated_at.toISOString() },
          content: { user_id: p.user_id, platform_enabled: p.platform_enabled, email_enabled: p.email_enabled, whatsapp_enabled: p.whatsapp_enabled, push_enabled: p.push_enabled, marketing_opt_in: p.marketing_opt_in },
          search_category: null,
          search_active: null,
        });
        relations.push({ from_original_id: p.user_id, from_entity_type: "user_communication_channel_pref", to_original_id: p.user_id, to_entity_type: "user", relation_type: "belongs_to_user", description: null });
      }
    },
  );

  // ── Entregas de notificação/banner (campanha é filtrada fora aqui mesmo) ──
  await paginate(
    (skip, take) =>
      db.communicationDelivery.findMany({
        where: { origin: { in: ["notification", "banner"] } },
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, origin: true, origin_id: true, recipient_user_id: true, channel: true, status: true, scheduled_for: true, delivered_at: true, failed_at: true, failure_summary: true, attempts: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      for (const d of page) {
        records.push({
          entity_type: "communication_delivery",
          source_table: "communication_deliveries",
          original_id: d.id,
          original_code: null,
          title: `${d.origin} · ${d.channel}`,
          subtitle: d.failure_summary,
          original_status: d.status,
          dates: { ...isoDates(d), scheduled_for: d.scheduled_for.toISOString(), delivered_at: d.delivered_at?.toISOString() ?? null, failed_at: d.failed_at?.toISOString() ?? null },
          content: { id: d.id, origin: d.origin, origin_id: d.origin_id, channel: d.channel, status: d.status, failure_summary: d.failure_summary, attempts: d.attempts },
          search_category: d.channel,
          search_active: d.status === "pending" || d.status === "processing",
        });
        relations.push({ from_original_id: d.id, from_entity_type: "communication_delivery", to_original_id: d.recipient_user_id, to_entity_type: "user", relation_type: "delivery_recipient", description: null });
        if (d.origin === "banner" && d.origin_id) {
          relations.push({ from_original_id: d.id, from_entity_type: "communication_delivery", to_original_id: d.origin_id, to_entity_type: "mandatory_banner", relation_type: "delivery_for_banner", description: null });
        }
        if (d.origin === "notification" && d.origin_id) {
          relations.push({ from_original_id: d.id, from_entity_type: "communication_delivery", to_original_id: d.origin_id, to_entity_type: "notification_message", relation_type: "delivery_for_notification", description: null });
        }
      }
    },
  );

  // ── Comunicados obrigatórios/informativos (banners) ─────────────────────
  await paginate(
    (skip, take) =>
      db.mandatoryBanner.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          body: true,
          image_file_name: true,
          image_alt: true,
          link_url: true,
          kind: true,
          ack_button_label: true,
          version: true,
          audience_json: true,
          starts_at: true,
          ends_at: true,
          is_active: true,
          is_cancelled: true,
          created_by_user_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    pageSize,
    async (page) => {
      const bannerIds = page.map((b) => b.id);
      const acks = await findManyChunked(bannerIds, (ids) =>
        db.bannerAcknowledgement.findMany({ where: { banner_id: { in: ids } }, select: { id: true, banner_id: true, user_id: true, version: true, acknowledged_at: true } }),
      );
      const acksByBanner = new Map<string, typeof acks>();
      for (const a of acks) acksByBanner.set(a.banner_id, [...(acksByBanner.get(a.banner_id) ?? []), a]);

      for (const b of page) {
        records.push({
          entity_type: "mandatory_banner",
          source_table: "mandatory_banners",
          original_id: b.id,
          original_code: null,
          title: b.title,
          subtitle: b.body ? b.body.slice(0, 200) : null,
          original_status: b.is_cancelled ? "cancelado" : b.is_active ? "ativo" : "inativo",
          dates: { ...isoDates(b), starts_at: b.starts_at.toISOString(), ends_at: b.ends_at?.toISOString() ?? null },
          content: {
            id: b.id,
            title: b.title,
            body: b.body,
            image_ref: fileRef(b.image_file_name),
            image_alt: b.image_alt,
            link_url: b.link_url,
            kind: b.kind,
            version: b.version,
            audience: safeJsonParse(b.audience_json),
            is_active: b.is_active,
            is_cancelled: b.is_cancelled,
          },
          search_category: b.kind,
          search_active: b.is_active && !b.is_cancelled,
        });
        if (b.created_by_user_id) relations.push({ from_original_id: b.id, from_entity_type: "mandatory_banner", to_original_id: b.created_by_user_id, to_entity_type: "user", relation_type: "banner_created_by", description: null });

        for (const a of acksByBanner.get(b.id) ?? []) {
          records.push({
            entity_type: "banner_acknowledgement",
            source_table: "banner_acknowledgements",
            original_id: a.id,
            original_code: null,
            title: null,
            subtitle: null,
            original_status: null,
            dates: { created_at: a.acknowledged_at.toISOString(), updated_at: null },
            content: { id: a.id, banner_id: a.banner_id, user_id: a.user_id, version: a.version },
            search_category: null,
            search_active: null,
          });
          relations.push({ from_original_id: a.id, from_entity_type: "banner_acknowledgement", to_original_id: a.banner_id, to_entity_type: "mandatory_banner", relation_type: "belongs_to_banner", description: null });
          relations.push({ from_original_id: a.id, from_entity_type: "banner_acknowledgement", to_original_id: a.user_id, to_entity_type: "user", relation_type: "ack_user", description: null });
        }
      }
    },
  );

  // ── Chat: conversas, participantes, mensagens ───────────────────────────
  await paginate(
    (skip, take) =>
      db.conversation.findMany({
        skip,
        take,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        select: { id: true, title: true, type: true, status: true, archived_at: true, created_by_id: true, created_at: true, updated_at: true },
      }),
    pageSize,
    async (page) => {
      const conversationIds = page.map((c) => c.id);
      const participants = await findManyChunked(conversationIds, (ids) =>
        db.chatParticipant.findMany({ where: { conversation_id: { in: ids } }, select: { id: true, conversation_id: true, user_id: true, role: true, joined_at: true, last_read_at: true, left_at: true } }),
      );
      const messages = await findManyChunked(conversationIds, (ids) =>
        db.chatMessage.findMany({ where: { conversation_id: { in: ids } }, select: { id: true, conversation_id: true, sender_id: true, content: true, is_read: true, created_at: true } }),
      );
      const participantsByConversation = new Map<string, typeof participants>();
      for (const p of participants) participantsByConversation.set(p.conversation_id, [...(participantsByConversation.get(p.conversation_id) ?? []), p]);
      const messagesByConversation = new Map<string, typeof messages>();
      for (const m of messages) messagesByConversation.set(m.conversation_id, [...(messagesByConversation.get(m.conversation_id) ?? []), m]);

      for (const c of page) {
        records.push({
          entity_type: "conversation",
          source_table: "conversations",
          original_id: c.id,
          original_code: null,
          title: c.title ?? `Conversa ${c.type}`,
          subtitle: c.type,
          original_status: c.status,
          dates: { ...isoDates(c), archived_at: c.archived_at?.toISOString() ?? null },
          content: { id: c.id, title: c.title, type: c.type, status: c.status },
          search_category: c.type,
          search_active: c.status === "active",
        });
        if (c.created_by_id) relations.push({ from_original_id: c.id, from_entity_type: "conversation", to_original_id: c.created_by_id, to_entity_type: "user", relation_type: "conversation_created_by", description: null });

        for (const p of participantsByConversation.get(c.id) ?? []) {
          records.push({
            entity_type: "chat_participant",
            source_table: "chat_participants",
            original_id: p.id,
            original_code: null,
            title: null,
            subtitle: p.role,
            original_status: p.left_at ? "removido" : "ativo",
            dates: { created_at: p.joined_at.toISOString(), updated_at: null, last_read_at: p.last_read_at?.toISOString() ?? null, left_at: p.left_at?.toISOString() ?? null },
            content: { id: p.id, conversation_id: p.conversation_id, user_id: p.user_id, role: p.role },
            search_category: p.role,
            search_active: p.left_at == null,
          });
          relations.push({ from_original_id: p.id, from_entity_type: "chat_participant", to_original_id: p.conversation_id, to_entity_type: "conversation", relation_type: "belongs_to_conversation", description: null });
          relations.push({ from_original_id: p.id, from_entity_type: "chat_participant", to_original_id: p.user_id, to_entity_type: "user", relation_type: "participant_user", description: null });
        }

        for (const m of messagesByConversation.get(c.id) ?? []) {
          records.push({
            entity_type: "chat_message",
            source_table: "chat_messages",
            original_id: m.id,
            original_code: null,
            title: null,
            subtitle: m.content ? m.content.slice(0, 200) : null,
            original_status: m.is_read ? "lida" : "nao_lida",
            dates: { created_at: m.created_at.toISOString(), updated_at: null },
            // Sem reply-to/anexo/remoção no schema real — nada disso existe
            // pra preservar (ver comentário no topo do arquivo).
            content: { id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id, content: m.content, is_read: m.is_read },
            search_category: null,
            search_active: null,
          });
          relations.push({ from_original_id: m.id, from_entity_type: "chat_message", to_original_id: m.conversation_id, to_entity_type: "conversation", relation_type: "belongs_to_conversation", description: null });
          relations.push({ from_original_id: m.id, from_entity_type: "chat_message", to_original_id: m.sender_id, to_entity_type: "user", relation_type: "message_author", description: null });
        }
      }
    },
  );

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}
