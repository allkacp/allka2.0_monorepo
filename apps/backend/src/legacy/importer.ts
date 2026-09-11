// Importador OFFLINE da "Consulta da Plataforma Anterior" (sprint de
// produtos, bloco 1/6). Não é rota HTTP. Lê o banco OPERACIONAL e escreve o
// banco LEGADO (`allka_legacy`) com a credencial de escrita
// (`LEGACY_IMPORT_DATABASE_URL`), usada em nenhum outro lugar.
//
// Propriedades: dry-run, idempotência (upsert por (lote, tipo, id original)),
// checksum após sanitização, comparação origem×destino, relatório de
// divergências, nunca sobrescreve silenciosamente uma fotografia concluída.

import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { PrismaClient as LegacyPrisma } from "./generated";
import { hashPayload } from "../lib/canonical-json";
import { sanitizeForLegacy, scrubSecretValues } from "./sanitize";

// Bumped de "products-foundation-1": a fotografia passou a preservar também as
// versões históricas do produto (`product_versions`) e os combos
// (`product_bundles` + itens), além de registrar o tipo do lote.
export const IMPORTER_VERSION = "products-foundation-2";
export const DEFAULT_SOURCE_NAME = "[TESTE LOCAL] Fotografia de produtos anteriores";

/**
 * Tipo do lote — EXPLÍCITO, nunca inferido do texto do nome.
 *   "preview"  = prévia local / teste. Descartável.
 *   "official" = Snapshot Histórico Oficial. Exige parâmetros explícitos e, uma
 *                vez selado, é imutável (só validação idempotente daí em diante).
 */
export type LegacyBatchKind = "preview" | "official";

export type LegacyEntityType =
  | "product"
  | "product_variation"
  | "product_addon"
  | "product_version"
  | "product_bundle"
  | "product_bundle_item"
  | "product_catalog_task"
  | "catalog_task"
  | "specialty"
  | IdentityEntityType
  | ProjectExecutionEntityType
  | FinancialEntityType
  | AlertNotificationChatEntityType
  | CampaignEntityType;

// ── Identidade histórica e organizações (bloco seguinte ao manifesto de
// retenção) — usuários, perfis administrativos, empresas, agências,
// parceiros e nômades. Extensão do MESMO mecanismo genérico de snapshot;
// nenhum schema/migration novo foi necessário (ver prisma/legacy/schema.prisma).
export type IdentityEntityType = "user" | "admin_profile" | "company" | "agency" | "partner_profile" | "nomade";

export const IDENTITY_ENTITY_TYPES: IdentityEntityType[] = [
  "user",
  "admin_profile",
  "company",
  "agency",
  "partner_profile",
  "nomade",
];

// Versão própria do coletor de identidade/organizações — independente de
// IMPORTER_VERSION (que segue evoluindo só para o domínio de produtos).
export const IDENTITY_ORG_IMPORTER_VERSION = "identity-orgs-foundation-1";
export const DEFAULT_IDENTITY_SOURCE_NAME = "[TESTE LOCAL] Fotografia de identidades e organizações anteriores";

// ── Projetos, produtos contratados, tarefas e etapas de execução (bloco
// seguinte ao de identidade/organizações) — maior domínio histórico ainda
// sem cobertura. Ver src/legacy/collect-project-execution.ts.
export type ProjectExecutionEntityType =
  | "project"
  | "project_product"
  | "project_task"
  | "project_task_stage"
  | "task_briefing_answer"
  | "task_attachment"
  | "project_attachment"
  | "task_assignment_history"
  | "task_dependency"
  | "task_release_trigger"
  | "task_release_event"
  | "task_dependency_override"
  | "task_offer"
  // catalog2 ainda não tem coletor próprio (o catálogo novo é preservado
  // operacionalmente, não migrado ao Legado — ver auditoria de virada). Os
  // dois tipos existem aqui só para as relações "contracted_catalog2_product"
  // e "task_from_catalog2_task" ficarem tipadas e auditáveis MESMO sem o
  // destino importado ainda — `to_record_id` fica null e `to_original_id`
  // preserva o id em texto, exatamente o comportamento já previsto pelo
  // modelo genérico de relação.
  | "catalog2_product"
  | "catalog2_task";

export const PROJECT_EXECUTION_ENTITY_TYPES: ProjectExecutionEntityType[] = [
  "project",
  "project_product",
  "project_task",
  "project_task_stage",
  "task_briefing_answer",
  "task_attachment",
  "project_attachment",
  "task_assignment_history",
  "task_dependency",
  "task_release_trigger",
  "task_release_event",
  "task_dependency_override",
  "task_offer",
];

export const PROJECT_EXECUTION_IMPORTER_VERSION = "project-execution-foundation-1";
export const DEFAULT_PROJECT_EXECUTION_SOURCE_NAME = "[TESTE LOCAL] Fotografia de projetos e execução anteriores";

// ── Financeiro histórico (bloco seguinte ao de projetos/execução) —
// faturas, pagamentos, carteiras, saques, comissões/repasses, cobranças
// (squad) e aditivos de catalog2. Ver src/legacy/collect-financial.ts.
//
// Deliberadamente FORA deste domínio (ver relatório do bloco):
//   - BankAccount (dado bancário completo — nenhum valor histórico depois de
//     mascarado, e é exatamente o tipo de dado que este bloco proíbe copiar);
//   - Coupon/CouponUsage (pertencem ao domínio de campanhas, ainda adiado);
//   - Catalog2Quote/Catalog2CartItem (cotação/cesta — não são uma operação
//     financeira concluída).
export type FinancialEntityType =
  | "invoice"
  | "payment"
  | "payment_item"
  | "wallet"
  | "wallet_ledger"
  | "wallet_transaction"
  | "withdrawal_request"
  | "partner_withdrawal"
  | "partner_commission"
  | "company_payment_method"
  | "squad_config"
  | "squad_cycle"
  | "expense"
  | "catalog2_change_order";

export const FINANCIAL_ENTITY_TYPES: FinancialEntityType[] = [
  "invoice",
  "payment",
  "payment_item",
  "wallet",
  "wallet_ledger",
  "wallet_transaction",
  "withdrawal_request",
  "partner_withdrawal",
  "partner_commission",
  "company_payment_method",
  "squad_config",
  "squad_cycle",
  "expense",
  "catalog2_change_order",
];

export const FINANCIAL_IMPORTER_VERSION = "financial-foundation-1";
export const DEFAULT_FINANCIAL_SOURCE_NAME = "[TESTE LOCAL] Fotografia financeira anterior";

// ── Alertas, notificações e chat (bloco seguinte ao financeiro) — 17 tipos.
// Ver src/legacy/collect-alerts-notifications-chat.ts.
//
// Deliberadamente FORA deste bloco (ver relatório):
//   - PushSubscription (endpoint/p256dh/auth são a CREDENCIAL de criptografia
//     do canal push — exatamente o tipo de segredo de canal proibido; sem
//     valor histórico nenhum depois de removida a parte sensível);
//   - IallkaSession/IallkaMessage (chat do assistente de IA de montagem de
//     projeto — feature/domínio diferente do chat interno da plataforma);
//   - CommunicationCampaign/CampaignRecipientState (domínio de campanhas,
//     ainda adiado) — e, dentro de CommunicationDelivery, as linhas com
//     origin="campaign" são filtradas fora pelo mesmo motivo (a tabela é
//     compartilhada por notificação/campanha/banner; só as duas primeiras
//     entram aqui).
export type AlertNotificationChatEntityType =
  | "alert_standard"
  | "alert_rule"
  | "system_alert"
  | "system_alert_event"
  | "alert_schedule"
  | "notification_message"
  | "notification_rule"
  | "notification_preference"
  | "notification_group"
  | "notification_group_member"
  | "user_communication_channel_pref"
  | "communication_delivery"
  | "mandatory_banner"
  | "banner_acknowledgement"
  | "conversation"
  | "chat_participant"
  | "chat_message";

export const ALERT_ENTITY_TYPES: AlertNotificationChatEntityType[] = ["alert_standard", "alert_rule", "system_alert", "system_alert_event", "alert_schedule"];
export const NOTIFICATION_ENTITY_TYPES: AlertNotificationChatEntityType[] = [
  "notification_message",
  "notification_rule",
  "notification_preference",
  "notification_group",
  "notification_group_member",
  "user_communication_channel_pref",
  "communication_delivery",
  "mandatory_banner",
  "banner_acknowledgement",
];
export const CHAT_ENTITY_TYPES: AlertNotificationChatEntityType[] = ["conversation", "chat_participant", "chat_message"];

export const ALERT_NOTIFICATION_CHAT_ENTITY_TYPES: AlertNotificationChatEntityType[] = [
  ...ALERT_ENTITY_TYPES,
  ...NOTIFICATION_ENTITY_TYPES,
  ...CHAT_ENTITY_TYPES,
];

export const ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION = "alerts-notifications-chat-foundation-1";
export const DEFAULT_ALERT_NOTIFICATION_CHAT_SOURCE_NAME = "[TESTE LOCAL] Fotografia de alertas, notificações e chat anteriores";

// ── Campanhas, cupons e destinatários (bloco final de cobertura do
// Legado) — último domínio operacional pendente. Ver
// src/legacy/collect-campaigns.ts.
//
// "communication_delivery" NÃO é redeclarado aqui — já existe em
// AlertNotificationChatEntityType e é a MESMA tabela física; o coletor de
// alertas/notificações/chat filtra fora as linhas origin="campaign"
// (documentado lá como "ainda adiado") e o coletor deste bloco é quem as
// coleta, reusando o mesmo entity_type — sem redefinir o tipo.
//
// Deliberadamente FORA deste bloco (ver relatório):
//   - Nenhuma entidade de "lead"/contato externo existe no schema real —
//     Campaign, Coupon, CouponUsage e CampaignRecipientState só têm
//     destinatário via User (recipient_user_id/linked_user_id/company_id),
//     todos já cobertos pelo coletor de identidade/organizações. Não há
//     lista bruta de contatos nem e-mail/telefone solto pra mascarar.
//   - Campaign.coupon_code e Coupon.code são namespaces INDEPENDENTES (sem
//     FK entre os dois modelos, apesar do nome parecido) — nenhuma relação
//     campaign↔coupon é criada por coincidência de string.
//   - Métricas de abertura/clique/conversão citadas no prompt NÃO existem
//     no schema nem no código (grep em src/lib/comms/*.ts) — só
//     status/state (CommunicationDelivery.status, CampaignRecipientState.state).
export type CampaignEntityType = "campaign" | "coupon" | "coupon_usage" | "communication_campaign" | "campaign_recipient_state";

export const CAMPAIGN_ENTITY_TYPES: CampaignEntityType[] = ["campaign", "coupon", "coupon_usage", "communication_campaign", "campaign_recipient_state"];
// Grupo completo exposto pela consulta do Legado para este domínio —
// inclui "communication_delivery" (origin=campaign) mesmo não sendo um
// CampaignEntityType próprio, porque é o mesmo entity_type físico.
export const CAMPAIGN_DOMAIN_ENTITY_TYPES: LegacyEntityType[] = [...CAMPAIGN_ENTITY_TYPES, "communication_delivery"];

export const CAMPAIGN_IMPORTER_VERSION = "campaigns-foundation-1";
export const DEFAULT_CAMPAIGN_SOURCE_NAME = "[TESTE LOCAL] Fotografia de campanhas anteriores";

export interface RawRecord {
  entity_type: LegacyEntityType;
  source_table: string;
  original_id: string;
  original_code: string | null;
  title: string | null;
  subtitle: string | null;
  original_status: string | null;
  dates: Record<string, unknown>;
  content: Record<string, unknown>;
  search_category: string | null;
  search_active: boolean | null;
}

export interface RawRelation {
  from_original_id: string;
  from_entity_type: LegacyEntityType;
  to_original_id: string;
  to_entity_type: LegacyEntityType | null;
  relation_type: string;
  description: string | null;
}

export interface SnapshotCollection {
  records: RawRecord[];
  relations: RawRelation[];
  sourceCounts: Record<string, number>;
}

export function isoDates(row: { created_at?: Date | null; updated_at?: Date | null }): Record<string, unknown> {
  return {
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

export function safeJsonParse(raw: string | null | undefined): unknown {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // mantém o texto cru quando não for JSON
  }
}

/**
 * Referência de anexo/comprovante: metadado + ponteiro pro arquivo original —
 * o BINÁRIO nunca é copiado. Usado por qualquer coletor que preserve anexos
 * (tarefas/projetos, recibos financeiros, comprovantes de despesa, ...).
 */
export function fileRef(reference: string | null | undefined): { reference: string; file_available_in_snapshot: false } | null {
  if (!reference) return null;
  return { reference, file_available_in_snapshot: false };
}

/**
 * Monta a fotografia dos PRODUTOS atuais (+ variações, adicionais,
 * tarefas-modelo vinculadas, tarefas de catálogo referenciadas e
 * especialidades). Só metadados — nenhum binário.
 */
export async function collectProductSnapshot(db: OperationalPrisma): Promise<SnapshotCollection> {
  const products = await db.product.findMany({
    include: {
      variations: true,
      addons: true,
      versions: true,
      task_links: { include: { catalog_task: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];
  const catalogTaskById = new Map<string, (typeof products)[number]["task_links"][number]["catalog_task"]>();
  const specialtyCategories = new Set<string>();

  for (const p of products) {
    const projectProductsCount = await db.projectProduct.count({ where: { product_id: p.id } });
    const paymentItemsCount = await db.paymentItem.count({ where: { product_id: p.id } });

    const content: Record<string, unknown> = {
      id: p.id,
      product_code: p.product_code,
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      category: p.category,
      tags: safeJsonParse(p.tags),
      base_price: p.base_price,
      complexity: p.complexity,
      visibility: safeJsonParse(p.visibility),
      // Imagens e portfólio APENAS como metadados/referências — nenhum binário
      // é copiado nesta etapa. Marcamos honestamente que o arquivo não está
      // disponível na fotografia.
      image_ref: p.image
        ? { reference: p.image, file_available_in_snapshot: false }
        : null,
      demonstrations_refs: Array.isArray(safeJsonParse(p.demonstrations))
        ? (safeJsonParse(p.demonstrations) as unknown[]).map((r) => ({
            reference: r,
            file_available_in_snapshot: false,
          }))
        : [],
      contract_count: p.contract_count,
      average_rating: p.average_rating,
      completion_time: p.completion_time,
      is_active: p.is_active,
      exige_aprovacao_cliente: p.exige_aprovacao_cliente,
      metadata: safeJsonParse(p.metadata),
      // Agregados úteis pra entender o produto sem varrer relações:
      counts: {
        variations: p.variations.length,
        addons: p.addons.length,
        catalog_task_links: p.task_links.length,
        used_in_project_products: projectProductsCount,
        payment_items: paymentItemsCount,
      },
    };

    records.push({
      entity_type: "product",
      source_table: "products",
      original_id: p.id,
      original_code: p.product_code ?? null,
      title: p.name,
      subtitle: p.short_description ?? p.description ?? null,
      original_status: p.is_active ? "ativo" : "inativo",
      dates: isoDates(p),
      content,
      search_category: p.category ?? null,
      search_active: p.is_active,
    });
    relations.push({
      from_original_id: p.id,
      from_entity_type: "product",
      to_original_id: p.category,
      to_entity_type: null,
      relation_type: "in_category",
      description: `Categoria "${p.category}"`,
    });
    if (p.category) specialtyCategories.add(p.category);

    for (const v of p.variations) {
      records.push({
        entity_type: "product_variation",
        source_table: "product_variations",
        original_id: v.id,
        original_code: null,
        title: v.name,
        subtitle: v.scope_description ?? v.description ?? null,
        original_status: v.is_active ? "ativo" : "inativo",
        dates: isoDates(v),
        content: {
          id: v.id,
          product_id: v.product_id,
          name: v.name,
          description: v.description,
          price: v.price,
          price_modifier: v.price_modifier,
          deadline_days: v.deadline_days,
          scope_description: v.scope_description,
          features: safeJsonParse(v.features),
          sort_order: v.sort_order,
          is_active: v.is_active,
        },
        search_category: p.category ?? null,
        search_active: v.is_active,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: v.id,
        to_entity_type: "product_variation",
        relation_type: "has_variation",
        description: v.name,
      });
    }

    for (const a of p.addons) {
      records.push({
        entity_type: "product_addon",
        source_table: "product_addons",
        original_id: a.id,
        original_code: null,
        title: a.name,
        subtitle: a.description ?? null,
        original_status: null,
        dates: isoDates({ created_at: a.created_at }),
        content: {
          id: a.id,
          product_id: a.product_id,
          name: a.name,
          description: a.description,
          price: a.price,
          category: a.category,
        },
        search_category: p.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: a.id,
        to_entity_type: "product_addon",
        relation_type: "has_addon",
        description: a.name,
      });
    }

    // Versões históricas do produto (snapshot automático tirado antes de cada
    // salvamento na plataforma antiga). São as "15 linhas de product_versions"
    // que faltavam na fotografia — preservadas com id original e relação.
    const versions = [...p.versions].sort(
      (x, y) => (x.created_at?.getTime() ?? 0) - (y.created_at?.getTime() ?? 0),
    );
    versions.forEach((ver, idx) => {
      records.push({
        entity_type: "product_version",
        source_table: "product_versions",
        original_id: ver.id,
        original_code: null,
        title: `${p.name} — versão ${idx + 1}`,
        subtitle: ver.created_at ? `Salva em ${ver.created_at.toISOString()}` : null,
        original_status: null,
        dates: isoDates({ created_at: ver.created_at }),
        content: {
          id: ver.id,
          product_id: ver.product_id,
          created_at: ver.created_at ? ver.created_at.toISOString() : null,
          // O estado completo do produto naquele instante (campos +
          // variações/adicionais), como estava serializado na origem.
          snapshot: safeJsonParse(ver.snapshot),
        },
        search_category: p.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: ver.id,
        to_entity_type: "product_version",
        relation_type: "has_version",
        description: `Versão ${idx + 1}`,
      });
    });

    for (const link of p.task_links) {
      records.push({
        entity_type: "product_catalog_task",
        source_table: "product_catalog_tasks",
        original_id: link.id,
        original_code: link.catalog_task?.code ?? null,
        title: link.catalog_task?.name ?? null,
        subtitle: link.notes ?? null,
        original_status: link.is_mandatory ? "obrigatoria" : "opcional",
        dates: isoDates({ created_at: link.created_at }),
        content: {
          id: link.id,
          product_id: link.product_id,
          catalog_task_id: link.catalog_task_id,
          variation_id: link.variation_id,
          sort_order: link.sort_order,
          is_mandatory: link.is_mandatory,
          phase: link.phase,
          notes: link.notes,
        },
        search_category: p.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: p.id,
        from_entity_type: "product",
        to_original_id: link.catalog_task_id,
        to_entity_type: "catalog_task",
        relation_type: "has_catalog_task",
        description: link.catalog_task?.name ?? link.catalog_task_id,
      });
      if (link.catalog_task) catalogTaskById.set(link.catalog_task.id, link.catalog_task);
    }
  }

  // Tarefas de catálogo referenciadas (deduplicadas).
  for (const ct of catalogTaskById.values()) {
    records.push({
      entity_type: "catalog_task",
      source_table: "catalog_tasks",
      original_id: ct.id,
      original_code: ct.code,
      title: ct.name,
      subtitle: ct.objective ?? ct.description ?? null,
      original_status: ct.status ?? (ct.is_active ? "ativa" : "inativa"),
      dates: isoDates(ct),
      content: {
        id: ct.id,
        code: ct.code,
        name: ct.name,
        category: ct.category,
        subcategory: ct.subcategory,
        task_type: ct.task_type,
        description: ct.description,
        objective: ct.objective,
        default_deadline_days: ct.default_deadline_days,
        default_priority: ct.default_priority,
        complexity: ct.complexity,
        estimated_hours: ct.estimated_hours,
        responsible_type: ct.responsible_type,
        requires_access: ct.requires_access,
        requires_briefing: ct.requires_briefing,
        requires_files: ct.requires_files,
        // "etapas-modelo" do produto antigo vivem aqui (JSON):
        steps: safeJsonParse(ct.steps),
        checklist: safeJsonParse(ct.checklist),
        briefing_questions: safeJsonParse(ct.briefing_questions),
        required_files: safeJsonParse(ct.required_files),
        execution_rules: safeJsonParse(ct.execution_rules),
        conclusion_rules: safeJsonParse(ct.conclusion_rules),
        status: ct.status,
        is_active: ct.is_active,
      },
      search_category: ct.category ?? null,
      search_active: ct.is_active,
    });
  }

  // Especialidades (todas — são poucas e dão contexto de área).
  const specialties = await db.specialty.findMany({ orderBy: { name: "asc" } });
  for (const s of specialties) {
    records.push({
      entity_type: "specialty",
      source_table: "specialties",
      original_id: s.id,
      original_code: null,
      title: s.name,
      subtitle: s.description ?? null,
      original_status: s.is_active ? "ativa" : "inativa",
      dates: isoDates(s),
      content: {
        id: s.id,
        name: s.name,
        description: s.description,
        hourly_rate: s.hourly_rate,
        category: s.category,
        required_skills: safeJsonParse(s.required_skills),
        is_active: s.is_active,
      },
      search_category: s.category ?? null,
      search_active: s.is_active,
    });
  }
  void specialtyCategories;

  // Combos (ProductBundle + itens). Hoje a base tem ZERO — o laço abaixo
  // simplesmente não produz registros. Fica pronto para preservá-los, com id
  // original e relações (combo → item → produto), se algum existir no futuro.
  const bundles = await db.productBundle.findMany({
    include: { items: true },
    orderBy: { created_at: "asc" },
  });
  for (const b of bundles) {
    records.push({
      entity_type: "product_bundle",
      source_table: "product_bundles",
      original_id: b.id,
      original_code: null,
      title: b.name,
      subtitle: b.description ?? null,
      original_status: b.is_active ? "ativo" : "inativo",
      dates: isoDates(b),
      content: {
        id: b.id,
        name: b.name,
        description: b.description,
        category: b.category,
        agency_id: b.agency_id,
        created_by_user_id: b.created_by_user_id,
        is_active: b.is_active,
        item_count: b.items.length,
      },
      search_category: b.category ?? null,
      search_active: b.is_active,
    });
    for (const item of b.items) {
      records.push({
        entity_type: "product_bundle_item",
        source_table: "product_bundle_items",
        original_id: item.id,
        original_code: null,
        title: null,
        subtitle: null,
        original_status: null,
        dates: {},
        content: {
          id: item.id,
          bundle_id: item.bundle_id,
          product_id: item.product_id,
          variation_id: item.variation_id,
          sort_order: item.sort_order,
        },
        search_category: b.category ?? null,
        search_active: null,
      });
      relations.push({
        from_original_id: b.id,
        from_entity_type: "product_bundle",
        to_original_id: item.id,
        to_entity_type: "product_bundle_item",
        relation_type: "has_bundle_item",
        description: `Item ${item.sort_order}`,
      });
      relations.push({
        from_original_id: item.id,
        from_entity_type: "product_bundle_item",
        to_original_id: item.product_id,
        to_entity_type: "product",
        relation_type: "bundle_contains_product",
        description: null,
      });
    }
  }

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}

/**
 * Monta a fotografia de IDENTIDADE HISTÓRICA e ORGANIZAÇÕES: usuários, perfis
 * administrativos, empresas, agências, parceiros e nômades — com as relações
 * necessárias para, no futuro, interpretar quem é autor/responsável/dono de
 * projetos e tarefas antigos, SEM transformar nada disso em conta ativa no
 * Legado (é só consulta histórica).
 *
 * Preserva por conta, deliberadamente, só o que a consulta histórica precisa:
 * id original, nome, e-mail, papel/perfil, status e datas relevantes. NUNCA
 * copia password_hash, tokens, sessões, MFA/recovery codes, chaves, dados de
 * autenticação ou logs de IP — nenhum desses campos é sequer lido aqui (e o
 * sanitizeForLegacy/scrubSecretValues do importador barram qualquer um que
 * escapasse, por nome ou por valor, como segunda camada de proteção).
 */
export async function collectIdentityOrgSnapshot(db: OperationalPrisma): Promise<SnapshotCollection> {
  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  const adminProfiles = await db.adminProfile.findMany({ orderBy: { created_at: "asc" } });
  for (const p of adminProfiles) {
    records.push({
      entity_type: "admin_profile",
      source_table: "admin_profiles",
      original_id: p.id,
      original_code: null,
      title: p.name,
      subtitle: null,
      original_status: p.is_active ? "ativo" : "inativo",
      dates: isoDates(p),
      content: { id: p.id, name: p.name, is_master: p.is_master, is_active: p.is_active },
      search_category: null,
      search_active: p.is_active,
    });
  }

  const companies = await db.company.findMany({ orderBy: { created_at: "asc" } });
  for (const c of companies) {
    records.push({
      entity_type: "company",
      source_table: "companies",
      original_id: c.id,
      original_code: c.sequence_number != null ? `emp_${String(c.sequence_number).padStart(5, "0")}` : null,
      title: c.name,
      subtitle: c.cnpj ?? null,
      original_status: c.status,
      dates: isoDates(c),
      content: {
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        status: c.status,
        type: c.type,
        segment: c.segment,
        city: c.city,
        state: c.state,
        sequence_number: c.sequence_number,
        legacy_id: c.legacy_id,
      },
      search_category: c.type,
      search_active: c.status === "ativo",
    });
    if (c.owner_user_id) {
      relations.push({
        from_original_id: c.id,
        from_entity_type: "company",
        to_original_id: c.owner_user_id,
        to_entity_type: "user",
        relation_type: "owned_by_user",
        description: null,
      });
    }
    if (c.referred_by_partner_id) {
      relations.push({
        from_original_id: c.id,
        from_entity_type: "company",
        to_original_id: c.referred_by_partner_id,
        to_entity_type: "partner_profile",
        relation_type: "referred_by_partner",
        description: null,
      });
    }
  }

  const agencies = await db.agency.findMany({ orderBy: { created_at: "asc" } });
  for (const a of agencies) {
    records.push({
      entity_type: "agency",
      source_table: "agencies",
      original_id: a.id,
      original_code: a.sequence_number != null ? `age_${String(a.sequence_number).padStart(5, "0")}` : null,
      title: a.name,
      subtitle: a.cnpj ?? null,
      original_status: a.status,
      dates: isoDates(a),
      content: {
        id: a.id,
        name: a.name,
        cnpj: a.cnpj,
        status: a.status,
        partner_level: a.partner_level,
        sequence_number: a.sequence_number,
        legacy_id: a.legacy_id,
      },
      search_category: null,
      search_active: a.status === "ativo",
    });
    relations.push({
      from_original_id: a.id,
      from_entity_type: "agency",
      to_original_id: a.owner_user_id,
      to_entity_type: "user",
      relation_type: "owned_by_user",
      description: null,
    });
  }

  const partnerProfiles = await db.partnerProfile.findMany({ orderBy: { created_at: "asc" } });
  for (const pp of partnerProfiles) {
    records.push({
      entity_type: "partner_profile",
      source_table: "partner_profiles",
      original_id: pp.id,
      original_code: pp.referral_code ?? null,
      title: null,
      subtitle: null,
      original_status: pp.status,
      dates: isoDates(pp),
      content: { id: pp.id, agency_id: pp.agency_id, status: pp.status, referral_code: pp.referral_code },
      search_category: null,
      search_active: pp.status === "active",
    });
    relations.push({
      from_original_id: pp.agency_id,
      from_entity_type: "agency",
      to_original_id: pp.id,
      to_entity_type: "partner_profile",
      relation_type: "has_partner_profile",
      description: null,
    });
  }

  const nomades = await db.nomade.findMany({ orderBy: { created_at: "asc" } });
  for (const n of nomades) {
    records.push({
      entity_type: "nomade",
      source_table: "nomades",
      original_id: n.id,
      original_code: null,
      title: n.name,
      subtitle: n.email,
      original_status: n.status,
      dates: isoDates(n),
      content: { id: n.id, name: n.name, email: n.email, status: n.status, level: n.level, legacy_id: n.legacy_id },
      search_category: null,
      search_active: n.status === "ativo",
    });
    if (n.user_id) {
      relations.push({
        from_original_id: n.id,
        from_entity_type: "nomade",
        to_original_id: n.user_id,
        to_entity_type: "user",
        relation_type: "profile_of_user",
        description: null,
      });
    }
  }

  // Usuários por último — deliberado: as relações acima (agency owner,
  // company owner, nomade profile) já foram emitidas com o lado "user" como
  // destino (`to_entity_type: "user"`), e o resolvedor de relações do
  // importador não exige que o registro de destino já exista no momento em
  // que a relação é enfileirada (só quando grava, ao final do lote).
  const users = await db.user.findMany({ orderBy: { created_at: "asc" } });
  for (const u of users) {
    records.push({
      entity_type: "user",
      source_table: "users",
      original_id: u.id,
      original_code: u.user_code ?? null,
      title: u.name,
      subtitle: u.email,
      original_status: u.status,
      dates: { created_at: u.created_at.toISOString(), updated_at: u.updated_at.toISOString(), last_login: u.last_login ? u.last_login.toISOString() : null },
      // Só o necessário pra consulta histórica: id, nome, e-mail, papel/perfil,
      // status. Deliberadamente AUSENTES: password_hash, username,
      // must_set_password, password_setup_token/expires_at, tokens de
      // reativação, telefone, avatar — nada de autenticação, segredo ou PII
      // não essencial à identidade histórica.
      content: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        account_type: u.account_type,
        status: u.status,
        is_active: u.is_active,
      },
      search_category: u.account_type,
      search_active: u.is_active,
    });
    if (u.admin_profile_id) {
      relations.push({
        from_original_id: u.id,
        from_entity_type: "user",
        to_original_id: u.admin_profile_id,
        to_entity_type: "admin_profile",
        relation_type: "has_admin_profile",
        description: null,
      });
    }
    if (u.company_id) {
      relations.push({
        from_original_id: u.id,
        from_entity_type: "user",
        to_original_id: u.company_id,
        to_entity_type: "company",
        relation_type: "member_of_company",
        description: null,
      });
    }
    if (u.agency_id) {
      relations.push({
        from_original_id: u.id,
        from_entity_type: "user",
        to_original_id: u.agency_id,
        to_entity_type: "agency",
        relation_type: "member_of_agency",
        description: null,
      });
    }
  }

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}

// ─────────────────────────── execução do import ────────────────────────────

export interface ImportOptions {
  dryRun: boolean;
  sourceName?: string;
  sourceEnvironment?: string;
  /**
   * "preview" (padrão) | "official". Um lote OFICIAL exige `sourceName`
   * explícito (sem "[TESTE LOCAL]"), `sourceEnvironment` explícito (≠ "local"),
   * `snapshotAt` explícito e — para GRAVAR (não dry-run) — `acknowledgeOfficial`.
   * Depois de gravado sem divergências, o lote é SELADO e vira imutável.
   */
  kind?: LegacyBatchKind;
  /** Instante do retrato. Obrigatório e explícito para lotes OFICIAIS. */
  snapshotAt?: Date;
  /**
   * Confirmação explícita de que se está gravando um Snapshot Histórico Oficial
   * (execução permanente). Obrigatória para `kind: "official"` fora de dry-run.
   */
  acknowledgeOfficial?: boolean;
  /** Reusar/continuar um lote específico. Sem isto, cria um lote novo. */
  batchId?: string;
  /** Permitir reprocessar um lote JÁ concluído (por padrão, recusa). */
  allowRefresh?: boolean;
  legacyImportUrl: string;
  /**
   * Quais coletores rodam neste lote. Padrão: só `collectProductSnapshot`
   * (comportamento IDÊNTICO ao de antes desta opção existir — nenhum
   * chamador existente precisa mudar). Passe `[collectIdentityOrgSnapshot]`
   * (ou combine coletores) para um lote de outro domínio — cada domínio usa
   * seu próprio `sourceName` (lotes diferentes), então nunca colide com o
   * lote de produtos.
   */
  collectors?: Array<(db: OperationalPrisma) => Promise<SnapshotCollection>>;
  /** Sobrescreve o `importer_version` gravado no lote. Obrigatório junto com `collectors`. */
  importerVersion?: string;
}

export interface EntityReconciliation {
  expected_source: number;
  imported: number;
  divergence: number;
  justification: string;
}

export interface ImportResult {
  dry_run: boolean;
  batch_id: string | null;
  source_name: string;
  /** Tipo EXPLÍCITO do lote — nunca inferido do nome. */
  kind: LegacyBatchKind;
  /** true quando o lote é oficial E já está selado (imutável). */
  sealed: boolean;
  /**
   * "dry_run" | "completed" | "completed_with_divergences" |
   * "validated_official" (re-execução idempotente contra um oficial já selado,
   * sem gravação, origem idêntica).
   */
  status: string;
  importer_version: string;
  totals: { expected: number; imported: number; skipped_unchanged: number; changed: number; sanitized_records: number };
  reconciliation: Record<string, EntityReconciliation>;
  divergences: Array<{ entity_type: string; original_id: string; reason: string }>;
  batch_checksum: string | null;
  blocked_fields_removed_sample: string[];
}

export async function runImport(opts: ImportOptions): Promise<ImportResult> {
  const operational = new OperationalPrisma();
  const legacy = new LegacyPrisma({ datasources: { db: { url: opts.legacyImportUrl } }, log: ["warn", "error"] });

  try {
    const kind: LegacyBatchKind = opts.kind === "official" ? "official" : "preview";
    if (opts.collectors && !opts.sourceName) {
      // Não existe um nome padrão genérico sensato entre domínios diferentes
      // (o padrão de fábrica é especificamente sobre produtos) — exige-se
      // explícito, mesmo espírito das outras guardas deste importador.
      throw Object.assign(
        new Error("sourceName é obrigatório ao informar `collectors` — não há um nome padrão para um domínio customizado."),
        { code: "custom_collectors_require_source_name" },
      );
    }
    const sourceName = opts.sourceName ?? DEFAULT_SOURCE_NAME;
    const sourceEnvironment = opts.sourceEnvironment ?? "local";
    const snapshotAt = opts.snapshotAt ?? new Date();
    const importerVersion = opts.importerVersion ?? IMPORTER_VERSION;

    // ── Guardas de EXECUÇÃO OFICIAL ──────────────────────────────────────
    // Um Snapshot Histórico Oficial só roda com parâmetros explícitos. Nada
    // aqui é inferido de texto: o operador precisa dizer origem, ambiente e
    // instante — e confirmar que a gravação é permanente.
    if (kind === "official") {
      const problems: string[] = [];
      if (!opts.sourceName || !opts.sourceName.trim()) {
        problems.push('--source-name explícito é obrigatório (nome real da origem, ex.: "Plataforma allka — produção").');
      } else if (opts.sourceName.includes("[TESTE LOCAL]")) {
        problems.push('um snapshot oficial não pode usar o prefixo "[TESTE LOCAL]" no nome da origem.');
      }
      if (!opts.sourceEnvironment || !opts.sourceEnvironment.trim() || opts.sourceEnvironment === "local") {
        problems.push('--source-env explícito e diferente de "local" é obrigatório (ex.: "producao").');
      }
      if (!opts.snapshotAt || Number.isNaN(opts.snapshotAt.getTime())) {
        problems.push("--snapshot-at explícito (ISO 8601) é obrigatório para fixar o instante do retrato.");
      }
      if (!opts.dryRun && !opts.acknowledgeOfficial) {
        problems.push("--confirm-official é obrigatório para GRAVAR (a gravação é permanente e o lote é selado).");
      }
      if (problems.length) {
        throw Object.assign(
          new Error(`Execução OFICIAL bloqueada — parâmetros explícitos ausentes:\n - ${problems.join("\n - ")}`),
          { code: "official_requires_explicit_params", problems },
        );
      }
    }

    const collectors = opts.collectors ?? [collectProductSnapshot];
    const collected = await Promise.all(collectors.map((collect) => collect(operational)));
    const collection: SnapshotCollection = {
      records: collected.flatMap((c) => c.records),
      relations: collected.flatMap((c) => c.relations),
      sourceCounts: collected.reduce<Record<string, number>>((acc, c) => {
        for (const [k, v] of Object.entries(c.sourceCounts)) acc[k] = (acc[k] ?? 0) + v;
        return acc;
      }, {}),
    };

    // Sanitiza + checksum de cada registro (checksum SEMPRE após sanitização).
    // title/subtitle/original_code também passam por scrubSecretValues —
    // são texto livre copiado direto da origem (nome, resumo, código) e um
    // segredo colado à mão por engano (ex.: numa mensagem de alerta/chat)
    // pode aparecer ali tanto quanto dentro de `content`.
    const prepared = collection.records.map((r) => {
      const s1 = sanitizeForLegacy(r.content);
      const s2 = scrubSecretValues(s1.clean);
      const titleScrub = scrubSecretValues(r.title);
      const subtitleScrub = scrubSecretValues(r.subtitle);
      const codeScrub = scrubSecretValues(r.original_code);
      const removedFields = [
        ...s1.removedFields,
        ...s2.scrubbed.map((p) => `${p} (valor)`),
        ...titleScrub.scrubbed.map(() => "title (valor)"),
        ...subtitleScrub.scrubbed.map(() => "subtitle (valor)"),
        ...codeScrub.scrubbed.map(() => "original_code (valor)"),
      ];
      const cleanContent = s2.clean;
      return {
        raw: r,
        cleanTitle: titleScrub.clean as string | null,
        cleanSubtitle: subtitleScrub.clean as string | null,
        cleanOriginalCode: codeScrub.clean as string | null,
        cleanContent,
        removedFields,
        sanitized: removedFields.length > 0,
        checksum: hashPayload(cleanContent),
      };
    });

    const expected = prepared.length;
    const blockedSample = [...new Set(prepared.flatMap((p) => p.removedFields))].slice(0, 20);
    const sanitizedRecords = prepared.filter((p) => p.sanitized).length;

    const reconcile = (): Record<string, EntityReconciliation> => {
      const out: Record<string, EntityReconciliation> = {};
      for (const [entity, expectedCount] of Object.entries(collection.sourceCounts)) {
        if (entity === "relations") continue;
        out[entity] = {
          expected_source: expectedCount,
          imported: 0,
          divergence: expectedCount,
          justification: "ainda não importado",
        };
      }
      return out;
    };

    // ── DRY-RUN ──────────────────────────────────────────────────────────
    if (opts.dryRun) {
      const rec = reconcile();
      for (const k of Object.keys(rec)) {
        rec[k].imported = rec[k].expected_source;
        rec[k].divergence = 0;
        rec[k].justification = "dry-run: seria importado";
      }
      return {
        dry_run: true,
        batch_id: null,
        source_name: sourceName,
        kind,
        sealed: false,
        status: "dry_run",
        importer_version: importerVersion,
        totals: { expected, imported: 0, skipped_unchanged: 0, changed: 0, sanitized_records: sanitizedRecords },
        reconciliation: rec,
        divergences: [],
        batch_checksum: hashPayload(prepared.map((p) => p.checksum).sort()),
        blocked_fields_removed_sample: blockedSample,
      };
    }

    // ── Lote ─────────────────────────────────────────────────────────────
    // Sem --batch, um lote OFICIAL ainda é localizado pelo par (kind, origem)
    // para que uma reexecução detecte o snapshot já selado — em vez de criar
    // um lote oficial duplicado.
    let batch = opts.batchId
      ? await legacy.legacyImportBatch.findUnique({ where: { id: opts.batchId } })
      : kind === "official"
        ? await legacy.legacyImportBatch.findFirst({
            where: { kind: "official", source_name: sourceName },
            orderBy: { imported_at: "desc" },
          })
        : null;

    if (batch && opts.kind && batch.kind !== kind) {
      throw Object.assign(
        new Error(
          `O lote ${batch.id} é do tipo "${batch.kind}" e a execução pediu "${kind}". ` +
            `Um lote não muda de tipo — crie um lote novo do tipo correto.`,
        ),
        { code: "batch_kind_mismatch" },
      );
    }

    // ── IMUTABILIDADE: snapshot oficial SELADO nunca é sobrescrito ────────
    // Nem com --allow-refresh. A reexecução vira uma VALIDAÇÃO idempotente:
    // recompara a origem atual com o que foi selado. Qualquer diferença
    // interrompe o processo com relatório; origem idêntica → "validado".
    if (batch && batch.kind === "official" && batch.sealed_at) {
      const sealedRecords = await legacy.legacyRecordSnapshot.findMany({
        where: { batch_id: batch.id },
        select: { entity_type: true, original_id: true, checksum: true },
      });
      const sealedByKey = new Map(sealedRecords.map((e) => [`${e.entity_type}::${e.original_id}`, e.checksum]));
      const sealedDivergences: ImportResult["divergences"] = [];
      const seenKeys = new Set<string>();
      for (const p of prepared) {
        const k = `${p.raw.entity_type}::${p.raw.original_id}`;
        seenKeys.add(k);
        const prev = sealedByKey.get(k);
        if (prev === undefined) {
          sealedDivergences.push({
            entity_type: p.raw.entity_type,
            original_id: p.raw.original_id,
            reason: "registro novo na origem — não existe no snapshot oficial selado",
          });
        } else if (prev !== p.checksum) {
          sealedDivergences.push({
            entity_type: p.raw.entity_type,
            original_id: p.raw.original_id,
            reason: "origem alterada desde o snapshot oficial selado (checksum diferente)",
          });
        }
      }
      for (const k of sealedByKey.keys()) {
        if (!seenKeys.has(k)) {
          const [et, oid] = k.split("::");
          sealedDivergences.push({
            entity_type: et,
            original_id: oid,
            reason: "registro sumiu da origem — presente no snapshot oficial selado, ausente agora",
          });
        }
      }

      const validationReconciliation: Record<string, EntityReconciliation> = {};
      for (const [entity, expectedCount] of Object.entries(collection.sourceCounts)) {
        if (entity === "relations") continue;
        const sealedForEntity = sealedRecords.filter((e) => e.entity_type === entity).length;
        validationReconciliation[entity] = {
          expected_source: expectedCount,
          imported: sealedForEntity,
          divergence: expectedCount - sealedForEntity,
          justification: expectedCount === sealedForEntity ? "coerente com o selado" : "diverge do selado — verificar",
        };
      }

      if (sealedDivergences.length > 0 || Object.values(validationReconciliation).some((r) => r.divergence !== 0)) {
        throw Object.assign(
          new Error(
            `O Snapshot Histórico Oficial selado (${batch.id}) DIVERGE da origem atual. ` +
              `Processo interrompido — nada foi gravado. ${sealedDivergences.length} divergência(s) por registro.`,
          ),
          { code: "official_divergence", divergences: sealedDivergences, reconciliation: validationReconciliation },
        );
      }

      return {
        dry_run: false,
        batch_id: batch.id,
        source_name: batch.source_name,
        kind: "official",
        sealed: true,
        status: "validated_official",
        importer_version: importerVersion,
        totals: { expected, imported: prepared.length, skipped_unchanged: prepared.length, changed: 0, sanitized_records: sanitizedRecords },
        reconciliation: validationReconciliation,
        divergences: [],
        batch_checksum: batch.checksum,
        blocked_fields_removed_sample: blockedSample,
      };
    }

    const batchIsFinished =
      batch != null &&
      (batch.status === "completed" || (kind === "official" && batch.status === "completed_with_divergences"));
    if (batch && batchIsFinished && !opts.allowRefresh) {
      // Nunca sobrescreve silenciosamente uma fotografia concluída.
      throw Object.assign(
        new Error(
          `O lote ${batch.id} já está concluído (${batch.status}). Rode com --allow-refresh para comparar/atualizar, ou crie um lote novo.`,
        ),
        { code: "batch_completed" },
      );
    }

    if (!batch) {
      batch = await legacy.legacyImportBatch.create({
        data: {
          source_name: sourceName,
          source_environment: sourceEnvironment,
          kind,
          snapshot_at: snapshotAt,
          importer_version: importerVersion,
          expected_count: expected,
          status: "running",
        },
      });
    } else {
      await legacy.legacyImportBatch.update({
        where: { id: batch.id },
        data: { status: "running", expected_count: expected, importer_version: importerVersion },
      });
    }

    const divergences: ImportResult["divergences"] = [];
    let importedCount = 0;
    let skippedUnchanged = 0;
    let changed = 0;

    // Estado ANTERIOR (antes de escrever) — para detectar novo/alterado e
    // registrar divergências contra uma fotografia já parcialmente gravada.
    const before = await legacy.legacyRecordSnapshot.findMany({
      where: { batch_id: batch.id },
      select: { entity_type: true, original_id: true, checksum: true },
    });
    const beforeByKey = new Map(before.map((e) => [`${e.entity_type}::${e.original_id}`, e.checksum]));

    // Escrita idempotente por (lote, tipo, id original). Em lotes.
    const CHUNK = 50;
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const slice = prepared.slice(i, i + CHUNK);
      await legacy.$transaction(
        slice.map((p) => {
          const r = p.raw;
          const data = {
            batch_id: batch!.id,
            entity_type: r.entity_type,
            source_table: r.source_table,
            original_id: r.original_id,
            original_code: p.cleanOriginalCode,
            title: p.cleanTitle,
            subtitle: p.cleanSubtitle,
            original_status: r.original_status,
            dates_json: JSON.stringify(r.dates),
            content_json: JSON.stringify(p.cleanContent),
            checksum: p.checksum,
            sanitized: p.sanitized,
            sanitized_fields_json: p.removedFields.length ? JSON.stringify(p.removedFields) : null,
            search_category: r.search_category,
            search_active: r.search_active,
          };
          return legacy.legacyRecordSnapshot.upsert({
            where: {
              batch_id_entity_type_original_id: {
                batch_id: batch!.id,
                entity_type: r.entity_type,
                original_id: r.original_id,
              },
            },
            create: data,
            update: data,
          });
        }),
      );
    }

    // Conta novo/inalterado/alterado comparando com o estado ANTERIOR.
    // Um registro que já existia com checksum diferente é uma DIVERGÊNCIA
    // (a origem mudou desde a fotografia anterior) — nunca sobrescrito em
    // silêncio: só chega aqui em lote não-concluído ou com --allow-refresh.
    for (const p of prepared) {
      const k = `${p.raw.entity_type}::${p.raw.original_id}`;
      const prev = beforeByKey.get(k);
      importedCount++;
      if (prev === undefined) {
        changed++; // novo
      } else if (prev === p.checksum) {
        skippedUnchanged++;
      } else {
        changed++;
        divergences.push({
          entity_type: p.raw.entity_type,
          original_id: p.raw.original_id,
          reason: "checksum diferente do já gravado neste lote — origem alterada desde a fotografia anterior",
        });
      }
    }

    const existing = await legacy.legacyRecordSnapshot.findMany({
      where: { batch_id: batch.id },
      select: { entity_type: true, checksum: true },
    });

    // Relações — só depois que os registros existem (resolve to_record_id
    // dentro do lote). Recria do zero para este lote (idempotente).
    await legacy.legacyRelationSnapshot.deleteMany({ where: { batch_id: batch.id } });
    const recIdByKey = new Map(
      (
        await legacy.legacyRecordSnapshot.findMany({
          where: { batch_id: batch.id },
          select: { id: true, entity_type: true, original_id: true },
        })
      ).map((r) => [`${r.entity_type}::${r.original_id}`, r.id]),
    );
    const relRows = collection.relations.map((rel) => ({
      batch_id: batch!.id,
      from_record_id: recIdByKey.get(`${rel.from_entity_type}::${rel.from_original_id}`)!,
      to_record_id: rel.to_entity_type ? recIdByKey.get(`${rel.to_entity_type}::${rel.to_original_id}`) ?? null : null,
      relation_type: rel.relation_type,
      to_original_id: rel.to_original_id,
      description: rel.description,
    }));
    for (let i = 0; i < relRows.length; i += 200) {
      await legacy.legacyRelationSnapshot.createMany({ data: relRows.slice(i, i + 200) });
    }

    // ── Conferência (Parte 7) ────────────────────────────────────────────
    const importedByEntity: Record<string, number> = {};
    for (const e of existing) importedByEntity[e.entity_type] = (importedByEntity[e.entity_type] ?? 0) + 1;

    const reconciliation: Record<string, EntityReconciliation> = {};
    let anyDivergence = divergences.length > 0;
    for (const [entity, expectedCount] of Object.entries(collection.sourceCounts)) {
      if (entity === "relations") continue;
      const imp = importedByEntity[entity] ?? 0;
      const div = expectedCount - imp;
      if (div !== 0) anyDivergence = true;
      reconciliation[entity] = {
        expected_source: expectedCount,
        imported: imp,
        divergence: div,
        justification: div === 0 ? "coerente" : "quantidades não batem — verificar",
      };
    }
    reconciliation.relations = {
      expected_source: collection.relations.length,
      imported: relRows.length,
      divergence: collection.relations.length - relRows.length,
      justification: collection.relations.length === relRows.length ? "coerente" : "verificar",
    };

    const batchChecksum = hashPayload(existing.map((e) => e.checksum).sort());
    const finalStatus = anyDivergence ? "completed_with_divergences" : "completed";

    // Um lote OFICIAL só é SELADO (vira imutável) quando fecha SEM divergências.
    // Com divergências, fica gravado como "completed_with_divergences", NÃO
    // selado, e o processo é interrompido com relatório — pode ser reprocessado
    // (com --allow-refresh) depois de corrigir a origem.
    const sealNow = kind === "official" && !anyDivergence;

    await legacy.legacyImportBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        imported_count: importedCount,
        checksum: batchChecksum,
        reconciliation_json: JSON.stringify(reconciliation),
        notes:
          `${sanitizedRecords} registro(s) sanitizado(s). ${changed} novo(s)/alterado(s), ${skippedUnchanged} inalterado(s).` +
          (sealNow ? " Snapshot Histórico Oficial SELADO — imutável." : ""),
        ...(sealNow ? { sealed_at: new Date() } : {}),
      },
    });

    if (kind === "official" && anyDivergence) {
      throw Object.assign(
        new Error(
          `Snapshot OFICIAL concluído COM divergências — NÃO foi selado. ` +
            `Lote ${batch.id} gravado como "completed_with_divergences". Revise o relatório antes de reprocessar.`,
        ),
        { code: "official_divergence", divergences, reconciliation, batch_id: batch.id },
      );
    }

    return {
      dry_run: false,
      batch_id: batch.id,
      source_name: sourceName,
      kind,
      sealed: sealNow,
      status: finalStatus,
      importer_version: importerVersion,
      totals: { expected, imported: importedCount, skipped_unchanged: skippedUnchanged, changed, sanitized_records: sanitizedRecords },
      reconciliation,
      divergences,
      batch_checksum: batchChecksum,
      blocked_fields_removed_sample: blockedSample,
    };
  } finally {
    await operational.$disconnect();
    await legacy.$disconnect();
  }
}
