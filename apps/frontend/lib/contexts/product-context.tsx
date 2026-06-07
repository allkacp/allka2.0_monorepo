"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSpecialties, type Specialty } from "./specialty-context";
import { usePricing } from "./pricing-context";
import { apiClient } from "@/lib/api-client";
import {
  backendToFrontendProduct,
  frontendToBackendProduct,
  type BackendProduct,
} from "@/lib/product-adapter";

export interface Step {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedHours: number;
  specialtyId: number | null;
  specialty?: number | null; // alias usado pela UI para lookup
  experienceLevel: "iniciante" | "junior" | "pleno" | "senior" | null;
  calculatedCost: number;
  internalGuidance?: string;
  levelRates?: {
    iniciante: number;
    junior: number;
    pleno: number;
    senior: number;
  };
}

// Uma pergunta do questionário de briefing.
// Os campos section/briefingKey/aiContext/placeholder/warning são opcionais agora
// mas preparam a estrutura para a IA gerar o briefing automaticamente no futuro.
export interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: "text" | "multiline" | "select" | "multiselect" | "file";
  required: boolean;
  options?: string[];
  aiAssisted: boolean;
  // ── campos AI-ready (futuro: geração automática de briefing) ──────────────
  section?: string; // agrupamento visual e semântico (ex: "Público-Alvo")
  briefingKey?: string; // chave JSON usada no briefing estruturado gerado pela IA
  aiContext?: string; // contexto que a IA usará para interpretar a resposta
  placeholder?: string; // dica exibida ao usuário no campo de resposta
  warning?: string; // aviso importante exibido abaixo da pergunta
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  // ── campos AI-ready (futuro: geração de briefing via IA) ─────────────────
  briefingTitle?: string; // título do documento de briefing gerado
  briefingInstructions?: string; // instruções para a IA estruturar o output
  questions: QuestionnaireQuestion[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  canRunInParallel: boolean;
  steps: Step[];
  questionnaire: Questionnaire | null;
  calculatedCost: number;
  // campos de conteúdo interno
  objective?: string;
  executionRules?: string[];
  condition?: string;
  taskCategory?: string;
  requiresAccess?: boolean;
}

export interface ProductVariation {
  id: string;
  name: string; // ex: "Até 2 campanhas"
  description?: string; // descrição complementar
  price: number; // preço absoluto desta variação
  priceModifier?: number; // modificador relativo (legado)
  deadlineDays?: number; // prazo de entrega em dias corridos
  scopeDescription?: string; // o que muda no escopo nesta variação
  features?: string[]; // bullet points do que inclui/muda
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductAddOn {
  id: string;
  name: string;
  price: number;
  category: "creative_type" | "extra";
}

// Circuito Pré-Habilitação — sequência de telas que o nômade percorre antes de iniciar o teste
export interface PreCircuit {
  // Etapa 1 — Boas-vindas
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeHighlights: string[]; // até 4 destaques mostrados como mini-cards
  // Etapa 2 — Sobre o Teste
  aboutDescription: string;
  aboutWhatToExpect: string[]; // lista numerada do que o nômade vai fazer
  estimatedTime?: string; // ex: "2 horas"
  // Etapa 3 — Vídeo orientativo
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: string; // ex: "12:45"
  videoDescription?: string;
  // Etapa 4 — Regras de execução
  rules: string[];
  warnings?: string[]; // avisos em vermelho
  // Etapa 5 — Confirmar início
  confirmChecklist?: string[]; // itens que o nômade deve marcar antes de iniciar
}

// Referência a outra tarefa que será habilitada se o nômade passar no teste
export interface EnabledTaskRef {
  taskId: string; // id da tarefa no sistema (ex: "PA0186-T02")
  taskName: string;
  productId?: string; // produto ao qual a tarefa pertence
  productName?: string;
}

// Teste prático que o nômade executa para ser habilitado numa tarefa
export interface NomadTest {
  id: string;
  code: string; // ex: PA0186-TEST01
  name: string;
  description: string;
  linkedTaskId: string; // id da tarefa real que este teste avalia
  linkedTaskName: string;
  // dados fake para o nômade executar durante o teste
  fakeClientName?: string;
  fakeObjective?: string;
  fakeContext?: string;
  fakeDeliverables?: string[];
  // critérios de avaliação
  evaluationCriteria: string[];
  passingScore: number; // 0–100
  timeLimit?: number; // minutos
  // tarefas adicionais habilitadas ao passar neste teste
  enablesAdditionalTasks: EnabledTaskRef[];
  isActive: boolean;
  createdAt?: string;
  // circuito pré-habilitação
  preCircuit?: PreCircuit;
  // checklist de qualificação (usado pelo líder/qualificador ao revisar a entrega)
  qualificationChecklist?: QualificationChecklist;
}

// ─── Checklist de Qualificação ────────────────────────────────────────────────
// Usado pelo líder/qualificador para revisar a entrega do nômade no teste
// antes da aprovação final. Organizado em seções com itens pontuados.

export type ChecklistItemResult = "ok" | "nok" | "partial" | "na" | null;

export interface ChecklistItem {
  id: string;
  label: string; // o que o qualificador vai verificar
  description?: string; // orientação adicional para o avaliador
  weight: number; // peso no cálculo da nota final (1–5)
  isRequired: boolean; // se NOK aqui → reprova automaticamente
  hint?: string; // dica sobre onde encontrar a entrega
}

export interface ChecklistSection {
  id: string;
  title: string; // ex: "Briefing e Coleta de Informações"
  description?: string;
  items: ChecklistItem[];
}

export interface QualificationChecklist {
  id: string;
  linkedTestId: string; // NomadTest.id ao qual pertence
  linkedTestName: string;
  sections: ChecklistSection[];
  passingScore: number; // % mínimo calculado sobre os pesos
  autoApproveAbove?: number; // % acima do qual aprova automaticamente sem revisão manual
  autoRejectBelow?: number; // % abaixo do qual reprova automaticamente
  allowPartialCorrection: boolean; // se pode devolver para correção parcial
  internalNotes?: string;
}

// Etapa de execução do produto — representa uma fase de entrega atribuída a um nômade
export interface ProductStage {
  id: string;
  code: string; // ex: PA0186-E01
  number: number; // ordem sequencial
  name: string;
  description: string;
  category: string; // ex: Administração, Execução, Relatório
  deliveryDeadlineDays: number; // prazo de entrega (dias corridos desde início)
  executionDeadlineDays: number; // prazo de execução interno (dias)
  executionHours: number;
  value: number; // valor desta etapa
  itemLimit: number;
  specialtyId?: number;
  experienceLevel?: "iniciante" | "junior" | "pleno" | "senior" | null;
  // flags operacionais
  isInternal: boolean; // etapa interna (não visível ao cliente)
  viewAccesses: boolean; // nomade precisa visualizar acessos da conta
  keepSameNomad: boolean; // manter mesmo nômade/líder nas próximas etapas
  delegateToLeader: boolean;
  requiresFinalFiles: boolean; // exige entrega de arquivos finais
  hideInProducts: boolean; // ocultar na listagem de produtos para clientes
  internalGuidance?: string;
}

// ─── Apresentação pública do produto ─────────────────────────────────────────
// Usado no catálogo, painel de detalhes e futuras páginas de produto.
// Serve como template: cada campo aqui deve ser preenchido no seed do produto.

export interface ProductPresentationPoint {
  icon?: string; // nome do ícone lucide (ex: "CheckCircle2") — uso futuro
  title: string;
  description?: string;
}

export interface ProductPresentation {
  tagline?: string; // frase de impacto abaixo do título
  highlights: string[]; // destaques visuais (bullets no topo)
  targetAudience?: string[]; // para quem é este produto
  whatIsIncluded: ProductPresentationPoint[]; // o que está incluído no serviço
  benefits?: ProductPresentationPoint[]; // benefícios / proposta de valor do produto
  deliverables: string[]; // o que o cliente recebe ao final
  notIncluded?: string[]; // o que NÃO está incluído (transparência)
  complementaryProducts?: ProductPresentationPoint[]; // produtos complementares sugeridos
  requirements?: string[]; // o que o cliente precisa providenciar
  howToRequest: { step: string; description: string }[]; // passo a passo para contratar
  faq?: { question: string; answer: string }[]; // perguntas frequentes
}

// Imagem de portfólio com metadados ricos (título, descrição, ordem, marcação de principal)
export interface PortfolioImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  isMain: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  totalTasksCost: number;
  qualificationFee: number;
  subtotal: number;
  taxes: number;
  operationalFee: number;
  partnerCommission: number;
  finalPrice: number;
  variations: ProductVariation[];
  addOns: ProductAddOn[];
  image?: string;
  productImagePreview?: string;
  recurrence?: string;
  deliveryDays?: string;
  tags?: string[];
  summaryDescription?: string;
  // campos estruturais do produto
  itemLimit?: number;
  totalExecutionHours?: number;
  executionHoursPerDay?: number;
  testsEnabled?: boolean;
  stepsEnabled?: boolean;
  // etapas de execução do produto
  stages?: ProductStage[];
  // testes dos nômades
  nomadTests?: NomadTest[];
  // questionário de briefing do produto (preenchido pelo cliente na contratação)
  questionnaire?: Questionnaire | null;
  // apresentação pública (catálogo, painel de detalhes, futura página de produto)
  presentation?: ProductPresentation | null;
  // IDs reais de produtos complementares (vínculo efetivo para cesta)
  complementaryProductIds?: string[];
  // features herdadas por todas as variações — base estrutural imutável
  baseFeatures?: string[];
  // imagens de portfólio / demonstrações do produto (URLs relativas ou absolutas)
  demonstrations?: string[];
  // portfólio com metadados ricos (título, descrição, ordem, principal)
  portfolioImages?: PortfolioImage[];
  contractable?: boolean;
  activeTaskTemplates?: number;
}

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  calculateStepCost: (
    hours: number,
    specialtyId: number,
    level: keyof Specialty["rates"],
  ) => number;
  calculateTaskCost: (task: Task) => number;
  calculateProductPricing: (product: Product) => Product;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { specialties } = useSpecialties();
  const { pricingComponents } = usePricing();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Só chama a API quando houver token de autenticação;
      // caso contrário retornamos lista vazia (ex.: telas de login).
      const hasToken =
        typeof window !== "undefined" && !!localStorage.getItem("allka_token");
      if (!hasToken) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const res: any = await apiClient.getProducts({ limit: "500" });
      const raw: BackendProduct[] = Array.isArray(res)
        ? res
        : (res?.data ?? []);
      setProducts(raw.map(backendToFrontendProduct));
    } catch (err: any) {
      console.error("[ProductProvider] fetchProducts failed:", err);
      setError(err?.message ?? "Erro ao carregar produtos");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const calculateStepCost = (
    hours: number,
    specialtyId: number,
    level: keyof Specialty["rates"],
  ): number => {
    const specialty = specialties.find((s) => s.id === specialtyId);
    if (!specialty) return 0;
    const hourlyRate = specialty.rates[level];
    return hours * hourlyRate;
  };

  const calculateTaskCost = (task: Task): number => {
    return task.steps.reduce((sum, step) => sum + step.calculatedCost, 0);
  };

  const calculateProductPricing = (product: Product): Product => {
    if (!product.tasks || !Array.isArray(product.tasks)) {
      return {
        ...product,
        tasks: [],
        totalTasksCost: 0,
        qualificationFee: 0,
        subtotal: 0,
        taxes: 0,
        operationalFee: 0,
        partnerCommission: 0,
        finalPrice: product.finalPrice ?? 0,
      };
    }

    const updatedTasks = product.tasks.map((task) => {
      const updatedSteps = task.steps.map((step) => {
        if (step.specialtyId && step.experienceLevel) {
          return {
            ...step,
            calculatedCost: calculateStepCost(
              step.estimatedHours,
              step.specialtyId,
              step.experienceLevel,
            ),
          };
        }
        return { ...step, calculatedCost: 0 };
      });

      const taskCost = updatedSteps.reduce(
        (sum, step) => sum + step.calculatedCost,
        0,
      );

      return {
        ...task,
        steps: updatedSteps,
        calculatedCost: taskCost,
      };
    });

    const totalTasksCost = updatedTasks.reduce(
      (sum, task) => sum + task.calculatedCost,
      0,
    );

    const activeCommissions = pricingComponents.filter(
      (c) => c.isActive && c.type === "commission",
    );
    const activeFees = pricingComponents.filter(
      (c) => c.isActive && c.type === "fee",
    );
    const activeTaxes = pricingComponents.filter(
      (c) => c.isActive && c.type === "tax",
    );

    const commissionsTotal = activeCommissions
      .filter((c) => c.valueType === "percentage")
      .reduce((sum, c) => sum + (totalTasksCost * c.value) / 100, 0);

    const feesPercentage = activeFees
      .filter((c) => c.valueType === "percentage")
      .reduce((sum, c) => sum + (totalTasksCost * c.value) / 100, 0);
    const feesFixed = activeFees
      .filter((c) => c.valueType === "fixed")
      .reduce((sum, c) => sum + c.value, 0);
    const feesTotal = feesPercentage + feesFixed;

    const taxesTotal = activeTaxes
      .filter((c) => c.valueType === "percentage")
      .reduce((sum, c) => sum + (totalTasksCost * c.value) / 100, 0);

    const subtotal = totalTasksCost + commissionsTotal;
    const calculated = subtotal + feesTotal + taxesTotal;
    // Se não há tasks cadastradas, preserva o finalPrice informado manualmente.
    const finalPrice =
      totalTasksCost > 0 ? calculated : (product.finalPrice ?? 0);

    return {
      ...product,
      tasks: updatedTasks,
      totalTasksCost,
      qualificationFee: commissionsTotal,
      subtotal,
      taxes: taxesTotal,
      operationalFee: feesTotal,
      partnerCommission: 0,
      finalPrice,
    };
  };

  const addProduct = async (product: Product) => {
    const calculated = calculateProductPricing(product);
    const payload = frontendToBackendProduct(calculated);
    const created: any = await apiClient.createProduct(payload as any);
    const next = backendToFrontendProduct(created as BackendProduct);
    setProducts((prev) => [...prev, next]);
  };

  const updateProduct = async (id: string, product: Product) => {
    const calculated = calculateProductPricing(product);
    const payload = frontendToBackendProduct(calculated);
    // Backend não faz upsert de variations/addons no update — remove antes
    const { variations: _v, addons: _a, ...rest } = payload as any;
    const updated: any = await apiClient.updateProduct(id, rest);
    const next = backendToFrontendProduct(updated as BackendProduct);
    setProducts((prev) => prev.map((p) => (p.id === id ? next : p)));
  };

  const deleteProduct = async (id: string) => {
    await apiClient.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        error,
        refetch: fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        calculateStepCost,
        calculateTaskCost,
        calculateProductPricing,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
