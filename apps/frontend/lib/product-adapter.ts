// Bidirectional adapter between backend Product rows and frontend Product objects.
// Frontend carries calculated pricing fields, tasks, variations, addons, etc.
// Backend stores the rich extras in a JSON string column `metadata`.

import type {
  Product,
  Task,
  ProductVariation,
  ProductAddOn,
  ProductStage,
  NomadTest,
  QualificationChecklist,
  Questionnaire,
  ProductPresentation,
  PortfolioImage,
} from "./contexts/product-context";

export interface BackendProduct {
  id: string | number;
  // Código público sequencial ("prod_1", "prod_2"...) usado na URL e no
  // campo "ID do Produto" da UI — nunca usar no lugar de `id` pra
  // update/delete/lookup técnico (ver product-code.ts no backend).
  product_code?: string | null;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  tags: string | null;
  base_price: number;
  complexity: string;
  visibility: string | null;
  image: string | null;
  demonstrations: string | null;
  completion_time: string | null;
  metadata: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variations?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    price_modifier: number;
    deadline_days: number | null;
    scope_description: string | null;
    features: string | null;
    sort_order: number;
    is_active: boolean;
  }>;
  addons?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
  }>;
  task_links?: Array<any>;
  contractability?: {
    productId: string;
    activeTaskTemplates: number;
    hasActiveTaskTemplates: boolean;
    isContractable: boolean;
    productType?: "unico" | "pacote";
  };
}

interface ProductMetadata {
  // Código legível por categoria gerado na importação do catálogo antigo
  // (ex.: "ALK-DES-007"). Só exibição — o identificador sequencial da
  // plataforma continua sendo product_code ("prod_7").
  code?: string;
  // Ids do(s) produto(s) da plataforma antiga que deram origem a este.
  legacyIds?: number[];
  tasks?: Task[];
  recurrence?: string;
  deliveryDays?: string;
  summaryDescription?: string;
  productImagePreview?: string;
  totalTasksCost?: number;
  qualificationFee?: number;
  subtotal?: number;
  taxes?: number;
  operationalFee?: number;
  partnerCommission?: number;
  finalPrice?: number;
  // campos estruturais
  itemLimit?: number;
  totalExecutionHours?: number;
  executionHoursPerDay?: number;
  testsEnabled?: boolean;
  stepsEnabled?: boolean;
  // etapas de execução
  stages?: ProductStage[];
  // testes dos nômades
  nomadTests?: NomadTest[];
  // questionário de briefing do produto
  questionnaire?: Questionnaire | null;
  // apresentação pública do produto
  presentation?: ProductPresentation | null;
  // IDs reais de produtos complementares (vínculo efetivo)
  complementaryProductIds?: string[];
  // features que toda variação herda — base estrutural imutável
  baseFeatures?: string[];
  // dados internos por variação (código, prazo público, horas, etc.)
  variationsInternal?: Record<string, any>;
  // portfólio com metadados ricos
  portfolioImages?: PortfolioImage[];
  // ── Campos editáveis no formulário de cadastro/edição ────────────────
  // Todos estes vivem só no metadata (não têm coluna própria no banco).
  // Precisam estar aqui E nos dois sentidos do adapter, senão o valor é
  // descartado silenciosamente no save (o form salva, o backend responde
  // 200, mas o dado nunca chega ao banco).
  benefits?: string;
  information?: string;
  descriptionAttention?: string;
  deliveryVideoUrl?: string;
  categories?: string[];
  subcategories?: string[];
  includedItems?: string[];
  notIncludedItems?: string[];
  excludedItems?: string[];
  requestAttention?: string;
  oneTimeContract?: string;
  monthlyContract?: string;
  previousContracts?: string;
  associatedTaskModels?: string[];
  additionalImages?: any[];
}

function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function backendToFrontendProduct(b: BackendProduct): Product {
  const meta = safeParseJSON<ProductMetadata>(b.metadata, {});
  const tags = safeParseJSON<string[]>(b.tags, []);
  const taskLinkCount = b.task_links?.length ?? 0;
  const embeddedTaskCount = meta.tasks?.length ?? 0;
  const activeTaskLinkCount = (b.task_links ?? []).filter((link: any) =>
    link?.catalog_task?.is_active ?? link?.is_active ?? false,
  ).length;
  const hasContractableTasks =
    b.contractability?.isContractable ??
    (activeTaskLinkCount > 0 || embeddedTaskCount > 0);
  const activeTaskTemplates =
    b.contractability?.activeTaskTemplates ??
    Math.max(activeTaskLinkCount, embeddedTaskCount);
  const productType: "unico" | "pacote" =
    b.contractability?.productType ?? (activeTaskTemplates > 1 ? "pacote" : "unico");

  const variations: ProductVariation[] = (b.variations ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description ?? undefined,
    price: v.price,
    priceModifier: v.price_modifier,
    deadlineDays: v.deadline_days ?? undefined,
    scopeDescription: v.scope_description ?? undefined,
    features: v.features ? JSON.parse(v.features) : undefined,
    sortOrder: v.sort_order,
    isActive: v.is_active,
  }));

  const addOns: ProductAddOn[] = (b.addons ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    price: a.price,
    category: (a.category as ProductAddOn["category"]) ?? "extra",
  }));

  return {
    id: String(b.id),
    productCode: b.product_code ?? undefined,
    internalCode: meta.code,
    legacyId: (b as any).legacy_id ?? undefined,
    // Produto consolidado absorveu várias entradas antigas (as faixas que
    // viraram variação) — a lista completa fica aqui.
    legacyIds: meta.legacyIds ?? [],
    name: b.name,
    description: b.description ?? "",
    category: b.category,
    isActive: b.is_active,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    image: b.image ?? undefined,
    tasks: meta.tasks ?? [],
    variations,
    addOns,
    totalTasksCost: meta.totalTasksCost ?? 0,
    qualificationFee: meta.qualificationFee ?? 0,
    subtotal: meta.subtotal ?? 0,
    taxes: meta.taxes ?? 0,
    operationalFee: meta.operationalFee ?? 0,
    partnerCommission: meta.partnerCommission ?? 0,
    finalPrice: meta.finalPrice ?? b.base_price,
    // extras preservados no frontend
    recurrence: meta.recurrence,
    deliveryDays: meta.deliveryDays,
    tags,
    summaryDescription: meta.summaryDescription,
    productImagePreview: meta.productImagePreview,
    itemLimit: meta.itemLimit,
    totalExecutionHours: meta.totalExecutionHours,
    executionHoursPerDay: meta.executionHoursPerDay,
    testsEnabled: meta.testsEnabled,
    stepsEnabled: meta.stepsEnabled,
    stages: meta.stages ?? [],
    nomadTests: meta.nomadTests ?? [],
    questionnaire: meta.questionnaire ?? null,
    presentation: meta.presentation ?? null,
    complementaryProductIds: meta.complementaryProductIds ?? [],
    baseFeatures: meta.baseFeatures ?? [],
    variationsInternal: meta.variationsInternal ?? {},
    demonstrations: safeParseJSON<string[]>(b.demonstrations, []),
    portfolioImages: meta.portfolioImages ?? [],
    // campos do formulário que vivem só no metadata
    benefits: meta.benefits ?? "",
    information: meta.information ?? "",
    descriptionAttention: meta.descriptionAttention ?? "",
    deliveryVideoUrl: meta.deliveryVideoUrl ?? "",
    categories: meta.categories ?? (b.category ? [b.category] : []),
    subcategories: meta.subcategories ?? [],
    includedItems: meta.includedItems ?? [],
    notIncludedItems: meta.notIncludedItems ?? [],
    excludedItems: meta.excludedItems ?? [],
    requestAttention: meta.requestAttention ?? "",
    oneTimeContract: meta.oneTimeContract ?? "",
    monthlyContract: meta.monthlyContract ?? "",
    previousContracts: meta.previousContracts ?? "",
    associatedTaskModels: meta.associatedTaskModels ?? [],
    additionalImages: meta.additionalImages ?? [],
    contractable: hasContractableTasks,
    activeTaskTemplates,
    productType,
  } as Product;
}

export function frontendToBackendProduct(p: Product): Record<string, any> {
  const meta: ProductMetadata = {
    tasks: p.tasks,
    recurrence: (p as any).recurrence,
    deliveryDays: (p as any).deliveryDays,
    summaryDescription: (p as any).summaryDescription,
    productImagePreview: p.productImagePreview,
    totalTasksCost: p.totalTasksCost,
    qualificationFee: p.qualificationFee,
    subtotal: p.subtotal,
    taxes: p.taxes,
    operationalFee: p.operationalFee,
    partnerCommission: p.partnerCommission,
    finalPrice: p.finalPrice,
    itemLimit: (p as any).itemLimit,
    totalExecutionHours: (p as any).totalExecutionHours,
    executionHoursPerDay: (p as any).executionHoursPerDay,
    testsEnabled: (p as any).testsEnabled,
    stepsEnabled: (p as any).stepsEnabled,
    stages: (p as any).stages,
    nomadTests: (p as any).nomadTests,
    questionnaire: (p as any).questionnaire,
    presentation: (p as any).presentation,
    complementaryProductIds: (p as any).complementaryProductIds,
    baseFeatures: (p as any).baseFeatures,
    variationsInternal: (p as any).variationsInternal,
    portfolioImages: (p as any).portfolioImages,
    // campos do formulário que vivem só no metadata
    benefits: (p as any).benefits,
    information: (p as any).information,
    descriptionAttention: (p as any).descriptionAttention,
    deliveryVideoUrl: (p as any).deliveryVideoUrl,
    categories: (p as any).categories,
    subcategories: (p as any).subcategories,
    includedItems: (p as any).includedItems,
    notIncludedItems: (p as any).notIncludedItems,
    excludedItems: (p as any).excludedItems,
    requestAttention: (p as any).requestAttention,
    oneTimeContract: (p as any).oneTimeContract,
    monthlyContract: (p as any).monthlyContract,
    previousContracts: (p as any).previousContracts,
    associatedTaskModels: (p as any).associatedTaskModels,
    additionalImages: (p as any).additionalImages,
  };

  const tagsArr = (p as any).tags ?? [];
  const demos: string[] = ((p as any).portfolioImages ?? [])
    .map((img: PortfolioImage) => img.url)
    .filter(Boolean);

  return {
    name: p.name,
    description: p.description,
    short_description: (p as any).summaryDescription ?? undefined,
    category: p.category,
    tags: JSON.stringify(tagsArr),
    base_price: p.finalPrice ?? 0,
    image: p.image ?? undefined,
    // Backend valida com z.string().optional() (sem .nullable()) — mandar
    // `null` explícito quebra a validação ("Expected string, received
    // null"); omitir o campo (undefined) é o que o schema realmente aceita
    // quando não há demonstrações/descrição/etc.
    demonstrations: demos.length ? JSON.stringify(demos) : undefined,
    is_active: p.isActive,
    metadata: JSON.stringify(meta),
    variations: p.variations?.map((v) => ({
      name: v.name,
      description: v.description ?? undefined,
      price: v.price,
      price_modifier: v.priceModifier ?? 0,
      deadline_days: v.deadlineDays ?? undefined,
      scope_description: v.scopeDescription ?? undefined,
      features: v.features ? JSON.stringify(v.features) : undefined,
      sort_order: v.sortOrder ?? 0,
      is_active: v.isActive ?? true,
    })),
    addons: p.addOns?.map((a) => ({
      name: a.name,
      price: a.price,
      category: a.category,
    })),
  };
}
