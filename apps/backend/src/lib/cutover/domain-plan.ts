// Plano de domínios do simulador de virada — classifica CONTAGENS (nunca
// registros individuais com dado sensível) em 4 baldes, por domínio:
//
//   preservar          → fica no operacional depois do reset
//   copiar_legacy       → precisa ser copiado para o Legacy antes da limpeza
//   remover_apos_copia  → já existe cópia no Legacy (mesmo que só "preview")
//                         para este domínio; falta validar/selar e então
//                         remover do operacional
//   decisao_humana      → não dá para classificar sozinho (nativo, sem
//                         legacy_id, fora das 4 contas retidas — candidato a
//                         teste/seed, mas pode ser dado real; ver auditoria)
//
// `legacy_covered` = existe COLETOR pronto (código) pra este domínio no
// mecanismo genérico do Legado — não confundir com "já foi executado um
// snapshot real". Nenhum snapshot oficial real foi rodado contra o
// allka_legacy de verdade em nenhum bloco (proibido em todos eles); o único
// batch real hoje é um "preview" de produtos, anterior a vários destes
// coletores. `legacy_covered=true` responde "dá pra copiar este domínio pro
// Legado quando alguém rodar o importador", não "já foi copiado".
//
// Coletores hoje existentes (todos read-only, todos com teste em banco
// descartável): produtos (collectProductSnapshot), identidade/organizações
// (collectIdentityOrgSnapshot), projetos/execução
// (collectProjectExecutionSnapshot), financeiro (collectFinancialSnapshot),
// alertas/notificações/chat (collectAlertsNotificationsChatSnapshot) e
// campanhas (collectCampaignsSnapshot) — ver apps/backend/src/legacy/.
//
// Nenhuma função aqui escreve nada — todas usam apenas count()/findMany()
// de leitura. O client informado pelo script real já vem com
// attachReadOnlyGuard (read-only-guard.ts) por cima disso.

export type RetentionBucket = "preservar" | "copiar_legacy" | "remover_apos_copia" | "decisao_humana";

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
      "copiar_legacy",
      comLegacyId,
      true,
      "legacy_id preenchido — vieram da plataforma anterior; coletor de identidade/organizações pronto (nenhum snapshot real executado ainda).",
    ),
    row(
      "usuarios",
      "users (nativos, não retidos)",
      "decisao_humana",
      nativosNaoRetidos,
      true,
      "Sem legacy_id e fora das 4 contas retidas — candidato a teste/seed, mas exige confirmação humana.",
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
    row(domain, `${table} (importados, não retidos)`, "copiar_legacy", comLegacyId, true, "Coletor de identidade/organizações pronto (nenhum snapshot real executado ainda)."),
    row(domain, `${table} (nativos, não retidos)`, "decisao_humana", nativosNaoRetidos, true),
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
      "copiar_legacy",
      partnerProfileCount,
      true,
      "Vínculo de parceiro com saldo/comissão — dado de negócio, não identidade; coletor de identidade/organizações já cobre. O vínculo estrutural das contas retidas já aparece em minimal_required_records.",
    ),
  );

  // ── Produtos (catálogo antigo) — coberto pelo único snapshot existente ──
  const [products, productVariations, productVersions, catalogTasks, productCatalogTasks, productBundles, productAddons] = await Promise.all([
    db.product.count(),
    db.productVariation.count(),
    db.productVersion.count(),
    db.catalogTask.count(),
    db.productCatalogTask.count(),
    db.productBundle.count(),
    db.productAddon.count(),
  ]);
  const producedNote =
    "Já existe um snapshot real em allka_legacy (batch 'preview', 924 registros) — mas não inclui product_version/product_bundle/product_addon (adicionados ao coletor depois desse batch); rodar de novo, como oficial, antes de remover.";
  const productMechanismReady = "Coletor de produtos pronto — não fazia parte do único batch real existente (anterior a este campo do coletor); precisa de novo snapshot antes de remover.";
  rows.push(
    row("produtos", "products", "remover_apos_copia", products, true, producedNote),
    row("produtos", "product_variations", "remover_apos_copia", productVariations, true, producedNote),
    row("produtos", "product_versions", "remover_apos_copia", productVersions, true, productMechanismReady),
    row("produtos", "catalog_tasks", "remover_apos_copia", catalogTasks, true, producedNote),
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
  const projectExecutionNote = "Coletor de projetos/execução pronto (nenhum snapshot real executado ainda no allka_legacy real).";
  rows.push(
    row("projetos", "projects (importados)", "copiar_legacy", projectsComLegacyId, true, projectExecutionNote),
    row("projetos", "projects (nativos)", "decisao_humana", Math.max(0, projectsTotal - projectsComLegacyId), true),
    row("tarefas_etapas", "project_tasks (importadas)", "copiar_legacy", tasksComLegacyId, true, projectExecutionNote),
    row("tarefas_etapas", "project_tasks (nativas)", "decisao_humana", Math.max(0, tasksTotal - tasksComLegacyId), true),
    row("tarefas_etapas", "project_task_stages", "copiar_legacy", stages, true, projectExecutionNote),
    row("tarefas_etapas", "task_briefing_answers", "copiar_legacy", briefingAnswers, true, projectExecutionNote),
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
  const financialNote = "Coletor financeiro pronto (nenhum snapshot real executado ainda no allka_legacy real).";
  rows.push(
    row("financeiro", "invoices", "copiar_legacy", invoices, true, financialNote),
    row("financeiro", "wallets", "copiar_legacy", wallets, true, financialNote),
    row("financeiro", "wallet_ledger", "copiar_legacy", walletLedger, true, financialNote),
    row("financeiro", "wallet_transactions", "copiar_legacy", walletTransactions, true, financialNote),
    row("financeiro", "withdrawal_requests", "copiar_legacy", withdrawalRequests, true, financialNote),
    row("financeiro", "expenses", "decisao_humana", expenses, true, "Despesa operacional da própria Allka, não de cliente — confirmar se é para reter."),
    row("financeiro", "payments", "copiar_legacy", payments, true, "Hoje 100% sandbox (gateway FAKE_SANDBOX) por desenho do schema. " + financialNote),
    row("financeiro", "payment_items", "copiar_legacy", paymentItems, true, financialNote),
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
  rows.push(
    row("alertas", "alert_rules", "preservar", alertRules, true, "Definição de regra (config), não ocorrência."),
    row("alertas", "alert_standards", "preservar", alertStandards, true, "Padrão de conteúdo (config)."),
    row("alertas", "system_alerts", "copiar_legacy", systemAlerts, true, "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda)."),
    row("alertas", "system_alert_events", "copiar_legacy", systemAlertEvents, true, "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda)."),
  );

  const [
    notificationMessages,
    notificationRules,
    notificationGroups,
    notificationGroupMembers,
    communicationDeliveries,
    bannerAcknowledgements,
  ] = await Promise.all([
    db.notificationMessage.count(),
    db.notificationRule.count(),
    db.notificationGroup.count(),
    db.notificationGroupMember.count(),
    db.communicationDelivery.count(),
    db.bannerAcknowledgement.count(),
  ]);
  rows.push(
    row("notificacoes", "notification_messages", "preservar", notificationMessages, true, "Conteúdo autorado por admin (config)."),
    row("notificacoes", "notification_rules", "preservar", notificationRules, true),
    row("notificacoes", "notification_groups", "copiar_legacy", notificationGroups, true, "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda)."),
    row("notificacoes", "notification_group_members", "copiar_legacy", notificationGroupMembers, true, "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda)."),
    row("notificacoes", "communication_deliveries", "copiar_legacy", communicationDeliveries, true, "Coletor de alertas/notificações/chat pronto para origin=notification/banner; origin=campaign é coletado pelo coletor de campanhas."),
    row("notificacoes", "banner_acknowledgements", "copiar_legacy", bannerAcknowledgements, true, "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda)."),
  );

  const [conversations, chatParticipants, chatMessages] = await Promise.all([
    db.conversation.count(),
    db.chatParticipant.count(),
    db.chatMessage.count(),
  ]);
  const chatNote = "Coletor de alertas/notificações/chat pronto (nenhum snapshot real executado ainda). Conteúdo textual passa por sanitização (segredo colado em texto livre é redigido, não excluído).";
  rows.push(
    row("chat", "conversations", "copiar_legacy", conversations, true, chatNote),
    row("chat", "chat_participants", "copiar_legacy", chatParticipants, true, chatNote),
    row("chat", "chat_messages", "copiar_legacy", chatMessages, true, chatNote),
  );

  const [campaigns, communicationCampaigns, campaignRecipientStates, coupons, couponUsages] = await Promise.all([
    db.campaign.count(),
    db.communicationCampaign.count(),
    db.campaignRecipientState.count(),
    db.coupon.count(),
    db.couponUsage.count(),
  ]);
  const campaignNote = "Coletor de campanhas pronto (bloco final de cobertura do Legado — nenhum snapshot real executado ainda no allka_legacy real).";
  rows.push(
    row("campanhas", "campaigns", "copiar_legacy", campaigns, true, campaignNote),
    row("campanhas", "communication_campaigns", "copiar_legacy", communicationCampaigns, true, campaignNote),
    row("campanhas", "campaign_recipient_states", "copiar_legacy", campaignRecipientStates, true, campaignNote),
    row("campanhas", "coupons", "decisao_humana", coupons, true, "Pode ser promoção real ou cupom de teste — confirmar. " + campaignNote),
    row("campanhas", "coupon_usages", "copiar_legacy", couponUsages, true, campaignNote),
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
      "decisao_humana",
      testLocalProducts,
      false,
      "Separado da comunicação dos produtos finais — não conta como um dos produtos reais.",
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
