// Plano de domínios do simulador de virada — classifica CONTAGENS (nunca
// registros individuais com dado sensível) em 5 baldes, por domínio:
//
//   preservar          → fica no operacional depois do reset
//   copiar_legacy       → precisa ser copiado para o Legacy antes da limpeza
//   remover_apos_copia  → cobertura no Legacy CONFIRMADA (lote oficial
//                         selado real, allka_legacy) — candidato à remoção
//                         após autorização separada de limpeza
//   decisao_humana      → não dá para classificar sozinho por natureza do
//                         dado (ver nota da linha) — a disposição final
//                         depende de confirmação humana específica AINDA
//                         não dada
//   bloqueado           → cobertura no Legacy AINDA NÃO comprovada para
//                         este subconjunto específico (coletor existe no
//                         código, mas o lote oficial correspondente ainda
//                         não foi executado/autorizado) — nunca remover
//   fixture_de_teste    → identificado por prefixo "[TESTE LOCAL]" — não é
//                         dado real, nunca conta como um dos 36 produtos
//                         catalog2 reais, e o responsável JÁ decidiu (nesta
//                         sessão) que fixtures são removidas na limpeza —
//                         não é mais decisao_humana
//
// `legacy_covered` = existe COLETOR pronto (código) pra este domínio no
// mecanismo genérico do Legado — não confunda com "já foi copiado de
// verdade". Ver cada nota de linha para o estado real de execução.
//
// 2026-09-11: os 6 domínios operacionais foram selados oficialmente contra
// o allka_legacy REAL (7 lotes: 1 preview + 6 oficiais, 66.479 registros,
// 115.381 relações, zero divergência) — ver docs/legacy-snapshot-cli.md e
// o relatório da sessão. Na mesma data, o lote oficial COMPLEMENTAR das 83
// CatalogTask sem vínculo de produto (achado na auditoria pós-snapshot,
// coletor collectOrphanCatalogTasksSnapshot, domínio
// `orphan-catalog-tasks`) também foi selado contra o allka_legacy real
// (8º lote, 0 divergências) — por isso não há mais nenhuma linha marcada
// `bloqueado` neste plano hoje. O bucket `bloqueado` continua existindo no
// tipo para o caso de um futuro achado equivalente ainda sem lote selado.
//
// Coletores hoje existentes (todos read-only, todos com teste em banco
// descartável): produtos (collectProductSnapshot), identidade/organizações
// (collectIdentityOrgSnapshot), projetos/execução
// (collectProjectExecutionSnapshot), financeiro (collectFinancialSnapshot),
// alertas/notificações/chat (collectAlertsNotificationsChatSnapshot),
// campanhas (collectCampaignsSnapshot) e o complementar de tarefas de
// catálogo órfãs (collectOrphanCatalogTasksSnapshot) — ver
// apps/backend/src/legacy/.
//
// Nenhuma função aqui escreve nada — todas usam apenas count()/findMany()
// de leitura. O client informado pelo script real já vem com
// attachReadOnlyGuard (read-only-guard.ts) por cima disso.

export type RetentionBucket =
  | "preservar"
  | "copiar_legacy"
  | "remover_apos_copia"
  | "decisao_humana"
  | "bloqueado"
  | "fixture_de_teste";

export interface DomainPlanRow {
  domain: string;
  table: string;
  bucket: RetentionBucket;
  count: number;
  legacy_covered: boolean;
  note?: string;
}

export interface Catalog2PlanSummary {
  bucket: "preservar";
  real_products: number;
  test_local_products: number;
  structure_tables: Record<string, number>;
  note: string;
}

export interface DomainPlanResult {
  rows: DomainPlanRow[];
  catalog2: Catalog2PlanSummary;
  /** Domínios com linhas copiar_legacy/remover_apos_copia onde legacy_covered=false — bloqueiam a limpeza. */
  legacy_gaps: string[];
}

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";

// Only the domain names required by the task — used to group rows and to
// compute legacy_gaps consistently regardless of how many tables/rows a
// domain ends up having.
export const REQUIRED_DOMAINS = [
  "usuarios",
  "empresas",
  "agencias",
  "nomades",
  "produtos",
  "projetos",
  "tarefas_etapas",
  "financeiro",
  "alertas",
  "notificacoes",
  "chat",
  "campanhas",
  "configuracoes",
  "catalog2",
] as const;

export type RequiredDomain = (typeof REQUIRED_DOMAINS)[number];

/**
 * Superfície mínima do Prisma Client usada pela classificação — só métodos
 * de leitura (count/findMany), nada mais.
 */
export interface DomainPlanDb {
  user: { count(args?: unknown): Promise<number> };
  company: { count(args?: unknown): Promise<number> };
  agency: { count(args?: unknown): Promise<number> };
  nomade: { count(args?: unknown): Promise<number> };
  partnerProfile: { count(args?: unknown): Promise<number> };
  product: { count(args?: unknown): Promise<number> };
  productVariation: { count(args?: unknown): Promise<number> };
  productVersion: { count(args?: unknown): Promise<number> };
  productBundle: { count(args?: unknown): Promise<number> };
  productAddon: { count(args?: unknown): Promise<number> };
  catalogTask: { count(args?: unknown): Promise<number> };
  productCatalogTask: { count(args?: unknown): Promise<number> };
  project: { count(args?: unknown): Promise<number> };
  projectTask: { count(args?: unknown): Promise<number> };
  projectTaskStage: { count(args?: unknown): Promise<number> };
  taskBriefingAnswer: { count(args?: unknown): Promise<number> };
  invoice: { count(args?: unknown): Promise<number> };
  wallet: { count(args?: unknown): Promise<number> };
  walletLedger: { count(args?: unknown): Promise<number> };
  walletTransaction: { count(args?: unknown): Promise<number> };
  withdrawalRequest: { count(args?: unknown): Promise<number> };
  expense: { count(args?: unknown): Promise<number> };
  payment: { count(args?: unknown): Promise<number> };
  paymentItem: { count(args?: unknown): Promise<number> };
  alertRule: { count(args?: unknown): Promise<number> };
  alertStandard: { count(args?: unknown): Promise<number> };
  systemAlert: { count(args?: unknown): Promise<number> };
  systemAlertEvent: { count(args?: unknown): Promise<number> };
  notificationMessage: { count(args?: unknown): Promise<number> };
  notificationRule: { count(args?: unknown): Promise<number> };
  notificationGroup: { count(args?: unknown): Promise<number> };
  notificationGroupMember: { count(args?: unknown): Promise<number> };
  communicationDelivery: { count(args?: unknown): Promise<number> };
  bannerAcknowledgement: { count(args?: unknown): Promise<number> };
  mandatoryBanner: { count(args?: unknown): Promise<number> };
  notificationPreference: { count(args?: unknown): Promise<number> };
  userCommunicationChannelPref: { count(args?: unknown): Promise<number> };
  conversation: { count(args?: unknown): Promise<number> };
  chatParticipant: { count(args?: unknown): Promise<number> };
  chatMessage: { count(args?: unknown): Promise<number> };
  campaign: { count(args?: unknown): Promise<number> };
  communicationCampaign: { count(args?: unknown): Promise<number> };
  campaignRecipientState: { count(args?: unknown): Promise<number> };
  coupon: { count(args?: unknown): Promise<number> };
  couponUsage: { count(args?: unknown): Promise<number> };
  entitySequence: { count(args?: unknown): Promise<number> };
  adminProfile: { count(args?: unknown): Promise<number> };
  adminPermission: { count(args?: unknown): Promise<number> };
  specialty: { count(args?: unknown): Promise<number> };
  term: { count(args?: unknown): Promise<number> };
  aIServiceConfig: { count(args?: unknown): Promise<number> };
  aIModelPricing: { count(args?: unknown): Promise<number> };
  reportConfig: { count(args?: unknown): Promise<number> };
  dashboardTemplate: { count(args?: unknown): Promise<number> };
  course: { count(args?: unknown): Promise<number> };
  courseModule: { count(args?: unknown): Promise<number> };
  lesson: { count(args?: unknown): Promise<number> };
  catalog2Product: { count(args?: unknown): Promise<number>; findMany(args: unknown): Promise<Array<{ internal_name: string }>> };
  catalog2ProductVersion: { count(args?: unknown): Promise<number> };
  catalog2Category: { count(args?: unknown): Promise<number> };
  catalog2Pillar: { count(args?: unknown): Promise<number> };
  catalog2Specialty: { count(args?: unknown): Promise<number> };
  catalog2FourF: { count(args?: unknown): Promise<number> };
  catalog2Variation: { count(args?: unknown): Promise<number> };
  catalog2VariationOption: { count(args?: unknown): Promise<number> };
  catalog2Addon: { count(args?: unknown): Promise<number> };
  catalog2PricingSettings: { count(args?: unknown): Promise<number> };
  catalog2ProductImportOrigin: { count(args?: unknown): Promise<number> };
  catalog2CutoverBatch: { count(args?: unknown): Promise<number> };
  legacyRecord: { count(args?: unknown): Promise<number> };
}

function row(domain: string, table: string, bucket: RetentionBucket, count: number, legacy_covered: boolean, note?: string): DomainPlanRow {
  return { domain, table, bucket, count, legacy_covered, note };
}

async function usuariosRows(db: DomainPlanDb, retainedUserIds: Set<string>): Promise<DomainPlanRow[]> {
  const retained = retainedUserIds.size;
  const [total, comLegacyId] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { legacy_id: { not: null }, id: { notIn: [...retainedUserIds] } } }),
  ]);
  const nativosNaoRetidos = Math.max(0, total - retained - comLegacyId);
  return [
    row("usuarios", "users (retidos)", "preservar", retained, true, "As 4 contas do manifesto de retenção — só identidade/auth/vínculo estrutural."),
    row(
      "usuarios",
      "users (importados, não retidos)",
      "remover_apos_copia",
      comLegacyId,
      true,
      "legacy_id preenchido — coberto pelo lote oficial selado de identidade/organizações (allka_legacy real). Candidato à remoção após autorização separada.",
    ),
    row(
      "usuarios",
      "users (nativos, não retidos)",
      "remover_apos_copia",
      nativosNaoRetidos,
      true,
      "Sem legacy_id e fora das 4 contas retidas — também coberto pelo lote oficial de identidade/organizações (o coletor inclui TODOS os usuários, não só os importados). Decisão do responsável: candidato à remoção após autorização separada.",
    ),
  ];
}

async function orgRows(
  db: DomainPlanDb,
  domain: string,
  table: string,
  model: { count(args?: unknown): Promise<number> },
  retainedOrgIds: Set<string>,
): Promise<DomainPlanRow[]> {
  const [total, comLegacyId] = await Promise.all([
    model.count(),
    model.count({ where: { legacy_id: { not: null }, id: { notIn: [...retainedOrgIds] } } }),
  ]);
  const retained = retainedOrgIds.size;
  const nativosNaoRetidos = Math.max(0, total - retained - comLegacyId);
  return [
    row(domain, `${table} (retidos)`, "preservar", retained, true, "Vínculo estrutural de uma das 4 contas retidas."),
    row(
      domain,
      `${table} (importados, não retidos)`,
      "remover_apos_copia",
      comLegacyId,
      true,
      "Coberto pelo lote oficial selado de identidade/organizações (allka_legacy real). Candidato à remoção após autorização separada, exceto o vínculo estrutural das 4 contas retidas (já preservado na linha acima).",
    ),
    row(
      domain,
      `${table} (nativos, não retidos)`,
      "remover_apos_copia",
      nativosNaoRetidos,
      true,
      "Também coberto pelo mesmo lote oficial (inclui todos os registros, importados ou não). Decisão do responsável: candidato à remoção após autorização separada, exceto estrutura comprovadamente necessária às contas retidas.",
    ),
  ];
}

export interface DomainPlanRetainedIds {
  userIds: Set<string>;
  agencyIds: Set<string>;
  companyIds: Set<string>;
  nomadeIds: Set<string>;
}

export async function buildDomainPlan(db: DomainPlanDb, retained: DomainPlanRetainedIds): Promise<DomainPlanResult> {
  const rows: DomainPlanRow[] = [];

  rows.push(...(await usuariosRows(db, retained.userIds)));
  rows.push(...(await orgRows(db, "empresas", "companies", db.company, retained.companyIds)));
  rows.push(...(await orgRows(db, "agencias", "agencies", db.agency, retained.agencyIds)));
  rows.push(...(await orgRows(db, "nomades", "nomades", db.nomade, retained.nomadeIds)));

  const partnerProfileCount = await db.partnerProfile.count();
  rows.push(
    row(
      "agencias",
      "partner_profiles",
      "remover_apos_copia",
      partnerProfileCount,
      true,
      "Vínculo de parceiro com saldo/comissão — dado de negócio, não identidade; coberto pelo lote oficial selado de identidade/organizações. O vínculo estrutural das contas retidas (Valdério) já aparece em minimal_required_records e não deve ser removido.",
    ),
  );

  // ── Produtos (catálogo antigo) — coberto pelo lote oficial selado real ──
  const [products, productVariations, productVersions, catalogTasksCovered, catalogTasksOrphan, productCatalogTasks, productBundles, productAddons] =
    await Promise.all([
      db.product.count(),
      db.productVariation.count(),
      db.productVersion.count(),
      db.catalogTask.count({ where: { product_links: { some: {} } } }),
      db.catalogTask.count({ where: { product_links: { none: {} } } }),
      db.productCatalogTask.count(),
      db.productBundle.count(),
      db.productAddon.count(),
    ]);
  const producedNote =
    "Coberto pelo lote oficial selado de produtos (allka_legacy real, sem divergência). Candidato à remoção após autorização separada.";
  const productMechanismReady = "Coletor de produtos pronto; contagem atual é zero — nada a copiar hoje, mecanismo pronto se algum dia existir.";
  rows.push(
    row("produtos", "products", "remover_apos_copia", products, true, producedNote),
    row("produtos", "product_variations", "remover_apos_copia", productVariations, true, producedNote),
    row("produtos", "product_versions", "remover_apos_copia", productVersions, true, producedNote),
    row(
      "produtos",
      "catalog_tasks (vinculados a produto)",
      "remover_apos_copia",
      catalogTasksCovered,
      true,
      producedNote,
    ),
    row(
      "produtos",
      "catalog_tasks (órfãos, sem vínculo de produto)",
      "remover_apos_copia",
      catalogTasksOrphan,
      true,
      // 2026-09-11 (mesma sessão): lote oficial complementar selado contra
      // o allka_legacy real (domínio `orphan-catalog-tasks`, coletor
      // collectOrphanCatalogTasksSnapshot) — as 83 tarefas sem vínculo de
      // produto (todas com legacy_id preenchido, import histórico real,
      // não fixture) agora têm cobertura comprovada, zero duplicação com
      // o lote de produtos (252+83=335, exatamente o total real). Deixa
      // de estar `bloqueado`; candidato à remoção após autorização
      // separada, como os demais domínios.
      producedNote,
    ),
    row("produtos", "product_catalog_tasks", "remover_apos_copia", productCatalogTasks, true, producedNote),
    row("produtos", "product_bundles", "copiar_legacy", productBundles, true, productMechanismReady),
    row("produtos", "product_addons", "copiar_legacy", productAddons, true, productMechanismReady),
  );

  // ── Projetos / tarefas / etapas ──────────────────────────────────────────
  const [projectsTotal, projectsComLegacyId, tasksTotal, tasksComLegacyId, stages, briefingAnswers] = await Promise.all([
    db.project.count(),
    db.project.count({ where: { legacy_id: { not: null } } }),
    db.projectTask.count(),
    db.projectTask.count({ where: { legacy_id: { not: null } } }),
    db.projectTaskStage.count(),
    db.taskBriefingAnswer.count(),
  ]);
  const projectExecutionNote = "Coberto pelo lote oficial selado de projetos/execução (allka_legacy real, sem divergência). Candidato à remoção após autorização separada.";
  const projectExecutionNativeNote = "Também coberto pelo mesmo lote oficial (o coletor inclui todos os registros, importados ou não). Decisão do responsável: candidato à remoção após autorização separada.";
  rows.push(
    row("projetos", "projects (importados)", "remover_apos_copia", projectsComLegacyId, true, projectExecutionNote),
    row("projetos", "projects (nativos)", "remover_apos_copia", Math.max(0, projectsTotal - projectsComLegacyId), true, projectExecutionNativeNote),
    row("tarefas_etapas", "project_tasks (importadas)", "remover_apos_copia", tasksComLegacyId, true, projectExecutionNote),
    row("tarefas_etapas", "project_tasks (nativas)", "remover_apos_copia", Math.max(0, tasksTotal - tasksComLegacyId), true, projectExecutionNativeNote),
    row("tarefas_etapas", "project_task_stages", "remover_apos_copia", stages, true, projectExecutionNote),
    row("tarefas_etapas", "task_briefing_answers", "remover_apos_copia", briefingAnswers, true, projectExecutionNote),
  );

  // ── Financeiro ────────────────────────────────────────────────────────────
  const [invoices, wallets, walletLedger, walletTransactions, withdrawalRequests, expenses, payments, paymentItems, legacyRecords] =
    await Promise.all([
      db.invoice.count(),
      db.wallet.count(),
      db.walletLedger.count(),
      db.walletTransaction.count(),
      db.withdrawalRequest.count(),
      db.expense.count(),
      db.payment.count(),
      db.paymentItem.count(),
      db.legacyRecord.count(),
    ]);
  const financialNote = "Coberto pelo lote oficial selado financeiro (allka_legacy real, sem divergência). Candidato à remoção após autorização separada.";
  rows.push(
    row("financeiro", "invoices", "remover_apos_copia", invoices, true, financialNote),
    row("financeiro", "wallets", "remover_apos_copia", wallets, true, financialNote),
    row("financeiro", "wallet_ledger", "remover_apos_copia", walletLedger, true, financialNote),
    row("financeiro", "wallet_transactions", "remover_apos_copia", walletTransactions, true, financialNote),
    row("financeiro", "withdrawal_requests", "remover_apos_copia", withdrawalRequests, true, financialNote),
    row("financeiro", "expenses", "remover_apos_copia", expenses, true, "Despesa operacional da própria Allka, não de cliente — já está no lote financeiro selado. Decisão do responsável: candidata à remoção após autorização separada."),
    row("financeiro", "payments", "remover_apos_copia", payments, true, "Hoje 100% sandbox (gateway FAKE_SANDBOX) por desenho do schema. " + financialNote),
    row("financeiro", "payment_items", "remover_apos_copia", paymentItems, true, financialNote),
    row(
      "financeiro",
      "legacy_records (plataforma predecessora)",
      "remover_apos_copia",
      legacyRecords,
      true,
      "Já isolado (zero FK) e documentado como seguro para remover a qualquer momento — não é do escopo desta virada, mas pode sair junto.",
    ),
  );

  // ── Alertas / notificações / chat / campanhas ───────────────────────────
  const [alertRules, alertStandards, systemAlerts, systemAlertEvents] = await Promise.all([
    db.alertRule.count(),
    db.alertStandard.count(),
    db.systemAlert.count(),
    db.systemAlertEvent.count(),
  ]);
  const alertsNote = "Coberto pelo lote oficial selado de alertas/notificações/chat (allka_legacy real, sem divergência). Candidato à remoção após autorização separada.";
  rows.push(
    row("alertas", "alert_rules", "preservar", alertRules, true, "Definição de regra (config), não ocorrência."),
    row("alertas", "alert_standards", "preservar", alertStandards, true, "Padrão de conteúdo (config)."),
    row("alertas", "system_alerts", "remover_apos_copia", systemAlerts, true, alertsNote),
    row("alertas", "system_alert_events", "remover_apos_copia", systemAlertEvents, true, alertsNote),
  );

  const [
    notificationMessages,
    notificationRules,
    notificationGroups,
    notificationGroupMembers,
    communicationDeliveries,
    bannerAcknowledgements,
    mandatoryBanners,
    notificationPreferences,
    userCommunicationChannelPrefs,
  ] = await Promise.all([
    db.notificationMessage.count(),
    db.notificationRule.count(),
    db.notificationGroup.count(),
    db.notificationGroupMember.count(),
    db.communicationDelivery.count(),
    db.bannerAcknowledgement.count(),
    db.mandatoryBanner.count(),
    db.notificationPreference.count(),
    db.userCommunicationChannelPref.count(),
  ]);
  rows.push(
    row("notificacoes", "notification_messages", "preservar", notificationMessages, true, "Conteúdo autorado por admin (config)."),
    row("notificacoes", "notification_rules", "preservar", notificationRules, true),
    row("notificacoes", "notification_groups", "remover_apos_copia", notificationGroups, true, alertsNote),
    row("notificacoes", "notification_group_members", "remover_apos_copia", notificationGroupMembers, true, alertsNote),
    row("notificacoes", "communication_deliveries", "remover_apos_copia", communicationDeliveries, true, "Coberto para origin=notification/banner pelo lote de alertas/notificações/chat; origin=campaign é coberto pelo lote de campanhas. " + alertsNote),
    row("notificacoes", "banner_acknowledgements", "remover_apos_copia", bannerAcknowledgements, true, alertsNote),
    // Três tabelas antes ausentes desta lista (dado já seguro no Legacy —
    // achado na auditoria pós-snapshot; itemizadas explicitamente agora).
    row("notificacoes", "mandatory_banners", "remover_apos_copia", mandatoryBanners, true, "Definição do aviso obrigatório (não a confirmação de leitura, já coberta em banner_acknowledgements). " + alertsNote),
    row("notificacoes", "notification_preferences", "remover_apos_copia", notificationPreferences, true, alertsNote),
    row("notificacoes", "user_communication_channel_prefs", "remover_apos_copia", userCommunicationChannelPrefs, true, alertsNote),
  );

  const [conversations, chatParticipants, chatMessages] = await Promise.all([
    db.conversation.count(),
    db.chatParticipant.count(),
    db.chatMessage.count(),
  ]);
  const chatNote = "Coberto pelo lote oficial selado de alertas/notificações/chat (allka_legacy real, sem divergência). Conteúdo textual passou por sanitização real (segredo colado em texto livre foi redigido, não excluído). Candidato à remoção após autorização separada.";
  rows.push(
    row("chat", "conversations", "remover_apos_copia", conversations, true, chatNote),
    row("chat", "chat_participants", "remover_apos_copia", chatParticipants, true, chatNote),
    row("chat", "chat_messages", "remover_apos_copia", chatMessages, true, chatNote),
  );

  const [campaigns, communicationCampaigns, campaignRecipientStates, coupons, couponUsages] = await Promise.all([
    db.campaign.count(),
    db.communicationCampaign.count(),
    db.campaignRecipientState.count(),
    db.coupon.count(),
    db.couponUsage.count(),
  ]);
  const campaignNote = "Coberto pelo lote oficial selado de campanhas (allka_legacy real, sem divergência). Candidato à remoção após autorização separada.";
  rows.push(
    row("campanhas", "campaigns", "remover_apos_copia", campaigns, true, campaignNote),
    row("campanhas", "communication_campaigns", "remover_apos_copia", communicationCampaigns, true, campaignNote),
    row("campanhas", "campaign_recipient_states", "remover_apos_copia", campaignRecipientStates, true, campaignNote),
    row("campanhas", "coupons", "remover_apos_copia", coupons, true, "Já está no lote de campanhas selado. Decisão do responsável: candidato à remoção após autorização separada (era promoção real ou cupom de teste — ambos já preservados no Legacy). " + campaignNote),
    row("campanhas", "coupon_usages", "remover_apos_copia", couponUsages, true, campaignNote),
  );

  // ── Configurações (estruturais — nunca saem no reset) ───────────────────
  const [
    entitySequences,
    adminProfiles,
    adminPermissions,
    specialties,
    terms,
    aiServiceConfigs,
    aiModelPricing,
    reportConfigs,
    dashboardTemplates,
    courses,
    courseModules,
    lessons,
  ] = await Promise.all([
    db.entitySequence.count(),
    db.adminProfile.count(),
    db.adminPermission.count(),
    db.specialty.count(),
    db.term.count(),
    db.aIServiceConfig.count(),
    db.aIModelPricing.count(),
    db.reportConfig.count(),
    db.dashboardTemplate.count(),
    db.course.count(),
    db.courseModule.count(),
    db.lesson.count(),
  ]);
  rows.push(
    row("configuracoes", "entity_sequences", "preservar", entitySequences, true, "Controla numeração humana — nunca resetar."),
    row("configuracoes", "admin_profiles", "preservar", adminProfiles, true),
    row("configuracoes", "admin_permissions", "preservar", adminPermissions, true),
    row("configuracoes", "specialties", "preservar", specialties, true),
    row("configuracoes", "terms", "preservar", terms, true),
    row("configuracoes", "ai_service_configs", "preservar", aiServiceConfigs, true),
    row("configuracoes", "ai_model_pricing", "preservar", aiModelPricing, true),
    row("configuracoes", "report_configs", "preservar", reportConfigs, true),
    row("configuracoes", "dashboard_templates", "preservar", dashboardTemplates, true),
    row("configuracoes", "courses", "preservar", courses, true),
    row("configuracoes", "course_modules", "preservar", courseModules, true),
    row("configuracoes", "lessons", "preservar", lessons, true),
  );

  // ── catalog2 — preserva estrutura + os produtos reais; separa o "[TESTE LOCAL]" ──
  const catalog2ProductRows = await db.catalog2Product.findMany({ select: { internal_name: true } });
  const testLocalProducts = catalog2ProductRows.filter((p) => p.internal_name.startsWith(TEST_LOCAL_PREFIX)).length;
  const realProducts = catalog2ProductRows.length - testLocalProducts;

  const [versions, categories, pillars, specialtiesC2, fourF, variations, variationOptions, addons, pricingSettings, importOrigins, cutoverBatches] =
    await Promise.all([
      db.catalog2ProductVersion.count(),
      db.catalog2Category.count(),
      db.catalog2Pillar.count(),
      db.catalog2Specialty.count(),
      db.catalog2FourF.count(),
      db.catalog2Variation.count(),
      db.catalog2VariationOption.count(),
      db.catalog2Addon.count(),
      db.catalog2PricingSettings.count(),
      db.catalog2ProductImportOrigin.count(),
      db.catalog2CutoverBatch.count(),
    ]);

  rows.push(
    row("catalog2", "catalog2_products (reais)", "preservar", realProducts, false, "Estrutura + produtos importados — não publica/altera/apaga nada."),
    row(
      "catalog2",
      "catalog2_products ([TESTE LOCAL])",
      "fixture_de_teste",
      testLocalProducts,
      false,
      "Fixture de teste identificada por prefixo — não é produto real, nunca conta entre os 36 reais. O responsável já decidiu (sessão de ensaio da limpeza): fixtures são removidas na limpeza. Ação futura: remover.",
    ),
    row("catalog2", "catalog2_product_versions", "preservar", versions, false),
    row("catalog2", "catalog2_categories", "preservar", categories, false),
    row("catalog2", "catalog2_pillars", "preservar", pillars, false),
    row("catalog2", "catalog2_specialties", "preservar", specialtiesC2, false),
    row("catalog2", "catalog2_four_f", "preservar", fourF, false),
    row("catalog2", "catalog2_variations", "preservar", variations, false),
    row("catalog2", "catalog2_variation_options", "preservar", variationOptions, false),
    row("catalog2", "catalog2_addons", "preservar", addons, false),
    row("catalog2", "catalog2_pricing_settings", "preservar", pricingSettings, false),
    row("catalog2", "catalog2_product_import_origins", "preservar", importOrigins, false, "Trilha de auditoria da importação — mantida."),
    row("catalog2", "catalog2_cutover_batches", "preservar", cutoverBatches, false, "Mecanismo de cutover já reversível — nenhum executado ainda."),
  );

  const catalog2: Catalog2PlanSummary = {
    bucket: "preservar",
    real_products: realProducts,
    test_local_products: testLocalProducts,
    structure_tables: {
      catalog2_product_versions: versions,
      catalog2_categories: categories,
      catalog2_pillars: pillars,
      catalog2_specialties: specialtiesC2,
      catalog2_four_f: fourF,
      catalog2_variations: variations,
      catalog2_variation_options: variationOptions,
      catalog2_addons: addons,
      catalog2_pricing_settings: pricingSettings,
      catalog2_product_import_origins: importOrigins,
      catalog2_cutover_batches: cutoverBatches,
    },
    note: "Nenhum produto, versão, tarefa, etapa, preço, prazo ou configuração comercial é publicado, alterado ou apagado por este simulador.",
  };

  const legacy_gaps = [
    ...new Set(
      rows
        .filter((r) => (r.bucket === "copiar_legacy" || r.bucket === "remover_apos_copia") && !r.legacy_covered)
        .map((r) => r.domain),
    ),
  ].sort();

  return { rows, catalog2, legacy_gaps };
}
