import { SheetFooter } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import {
  InlineLoader,
  ButtonLoader,
  PageLoader,
} from "@/components/ui/loading";

import type React from "react";

import { useState, useEffect, useCallback, useRef, useLayoutEffect, Fragment } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  ListChecks,
  Clock,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  History,
  RotateCcw,
  XCircle,
  ArrowUpDown,
  Gauge,
  FileQuestion,
  CheckCircle2,
  ArrowRight,
  Layers,
  DollarSign,
  Calculator,
  X,
  Lock,
  ImageIcon,
  FileText,
  Link,
  Copy,
  Grid3x3,
  SlidersHorizontal,
  Pencil,
  Power,
  BarChart3,
  Filter,
  GripVertical,
  FlaskConical,
  ShieldCheck,
  Trophy,
  Link2,
  Route,
  PartyPopper,
  PlayCircle,
  Eye as EyePreview,
  ClipboardCheck,
  AlertTriangle,
  Info,
  LayoutTemplate,
  BookOpen,
  Users,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Tag,
  RefreshCw,
  Calendar,
  Target,
  Play,
  ThumbsUp,
  TrendingUp,
  Puzzle,
  CheckSquare,
  Circle,
} from "lucide-react";
import { CircuitoPreHabilitacaoModal } from "@/components/circuito-pre-habilitacao-modal";
import { QualificationChecklistPanel } from "@/components/qualification-checklist-panel";
import { ProductNomadsTab } from "@/components/admin/product-nomads-tab";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Removed: import ImportTaskTemplateModal from "@/components/import-task-template-modal"
import { Switch } from "@/components/ui/switch"; // Import Switch
import { ConfirmationDialog } from "@/components/confirmation-dialog"; // Import ConfirmationDialog
import { apiClient } from "@/lib/api-client";
import { backendToFrontendProduct } from "@/lib/product-adapter";
// Removed: import { ProductSheet } from "@/components/admin/product-sheet"
// Removed: import { QuestionnaireSheet } from "@/components/admin/questionnaire-sheet"
// Removed: import { PricingCalculatorModal } from "@/components/admin/pricing-calculator-modal"
import { useToast } from "@/hooks/use-toast";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { useProducts } from "@/lib/contexts/product-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { CopyLinkButton } from "@/components/copy-link-button";
import { NeonBadge } from "@/components/neon-badge";
import { useSpecialties } from "@/lib/contexts/specialty-context";
// O import era de "@/types/product", que NAO exporta Task — o comentario
// original dizia "Assuming Task type is defined in types/product". O tipo que
// esta pagina usa (com code, specialty, executionTime, etapas) e o do
// product-context, o mesmo que o restante do fluxo de produtos consome.
import type {
  Task,
  Product as ContextProduct,
  Questionnaire as ContextQuestionnaire,
  ProductPresentation,
} from "@/lib/contexts/product-context";
import { formatCurrency } from "@/lib/utils";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { LegacyIdBadge } from "@/components/legacy-id-badge";
import { useConsumePendingActivation } from "@/contexts/open-screens-context";

// ── View mode for the product grid ───────────────────────────────────────────
type ProdGridMode = 2 | 3 | 4 | 5 | "list";
const PROD_GRID_MODES: {
  value: ProdGridMode;
  label: string;
  Icon: React.FC<{ active: boolean }>;
}[] = [
  {
    value: 2,
    label: "2 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1" width="6" height="6" rx="1" fill={c} />
          <rect x="9" y="1" width="6" height="6" rx="1" fill={c} />
          <rect x="1" y="9" width="6" height="6" rx="1" fill={c} />
          <rect x="9" y="9" width="6" height="6" rx="1" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 3,
    label: "3 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="6" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="11" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="1" y="7" width="4" height="4" rx="0.8" fill={c} />
          <rect x="6" y="7" width="4" height="4" rx="0.8" fill={c} />
          <rect x="11" y="7" width="4" height="4" rx="0.8" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 4,
    label: "4 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="0.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="4.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="8.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="12.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="0.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="4.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="8.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="12.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 5,
    label: "5 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      const xs = [0.5, 3.5, 6.5, 9.5, 12.5];
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          {xs.map((x) => (
            <rect
              key={x + "a"}
              x={x}
              y="1"
              width="2.3"
              height="3"
              rx="0.5"
              fill={c}
            />
          ))}
          {xs.map((x) => (
            <rect
              key={x + "b"}
              x={x}
              y="5.5"
              width="2.3"
              height="3"
              rx="0.5"
              fill={c}
            />
          ))}
          {xs.map((x) => (
            <rect
              key={x + "c"}
              x={x}
              y="10"
              width="2.3"
              height="3"
              rx="0.5"
              fill={c}
            />
          ))}
        </svg>
      );
    },
  },
  {
    value: "list",
    label: "Lista",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1.5" width="14" height="3" rx="0.8" fill={c} />
          <rect x="1" y="6.5" width="14" height="3" rx="0.8" fill={c} />
          <rect x="1" y="11.5" width="14" height="3" rx="0.8" fill={c} />
        </svg>
      );
    },
  },
];

function getProdGridClass(mode: ProdGridMode): string {
  if (mode === "list") return "";
  if (mode === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
  if (mode === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
  if (mode === 4)
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
  if (mode === 5)
    return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";
  return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
}

const PROD_GRID_STORAGE_KEY = "allka_cadastro_produtos_view_mode";

// ── Category → NeonBadge color mapping ───────────────────────────────────────
// Products are classified into a fixed, curated set of categories (see the
// checkbox list in the "Classificação e Preço" section of the product form),
// so each one gets a stable, sensible color rather than a single flat tone.
const CATEGORY_BADGE_COLOR_MAP: Record<string, string> = {
  "Design e Criação": "violet",
  "Mídias e Conteúdo": "cyan",
  "Social Media e Publicações": "pink",
  "Performance e Anúncios Patrocinados": "orange",
  "Soluções Web": "blue",
  "Fotografia e Imagem": "teal",
  Desenvolvimento: "indigo",
  Marketing: "emerald",
};
function getCategoryBadgeColor(category: string): any {
  return CATEGORY_BADGE_COLOR_MAP[category] || "slate";
}

// ── Gradient stat-card treatment matching admin/empresas' STAT_COLOR_MAP ────
const PROD_STAT_COLOR_MAP: Record<
  string,
  { gradient: string; darkGradient: string; borderClass: string }
> = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
  },
};

function ProdStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: keyof typeof PROD_STAT_COLOR_MAP;
}) {
  const colors = PROD_STAT_COLOR_MAP[color];
  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">
            {label}
          </span>
          <div className="bg-white/20 rounded-md p-1">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

// Barra de abas responsiva — mede quantas abas cabem na largura disponível
// e joga o resto num menu "Mais N" (dropdown), em vez de deixar a barra
// estourar com scroll horizontal. Usada no "Ver Detalhes" do produto.
// "prod_42" → 42, pra coluna ID mostrar só o número sequencial — mesmo
// padrão do userCodeToNum em admin/usuarios.
function productCodeToNum(code?: string | null): number | null {
  const m = /(\d+)\s*$/.exec(code || "");
  return m ? parseInt(m[1], 10) : null;
}

const TAB_BTN_BASE =
  "h-11 px-4 shrink-0 whitespace-nowrap rounded-lg border flex items-center gap-2 text-sm font-medium transition-all";
function tabBtnClass(isActive: boolean) {
  return `${TAB_BTN_BASE} ${
    isActive
      ? "bg-gradient-to-r from-[#2558FF] via-[#6E2C96] to-[#D92293] text-white border-transparent shadow-md"
      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600"
  }`;
}
// Botão "Mais N" — de propósito SEM o mesmo estilo de pill/cartão dos
// outros (é um controle de menu, não uma aba), só texto + seta, com um
// separador vertical antes dele.
const MORE_BTN_CLASS =
  "h-11 px-3 shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
function TabBadge({
  children,
  tone = "slate",
  onActiveTab = false,
}: {
  children: React.ReactNode;
  tone?: string;
  onActiveTab?: boolean;
}) {
  const toneClass =
    {
      slate: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
      indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
      violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
      teal: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400",
      emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    }[tone] || "bg-slate-100 text-slate-400";
  return (
    <span
      className={`ml-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
        onActiveTab ? "bg-white/25 text-white" : toneClass
      }`}
    >
      {children}
    </span>
  );
}

interface OverflowTab {
  value: string;
  label: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
}

function OverflowTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: OverflowTab[];
  active: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const moreGhostRef = useRef<HTMLButtonElement>(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);

  const GAP_PX = 8; // gap-2
  const SEPARATOR_RESERVE_PX = 24; // divisor + margens antes do "Mais N"

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function recompute() {
      const available = container!.clientWidth;
      const moreWidth = (moreGhostRef.current?.offsetWidth || 90) + SEPARATOR_RESERVE_PX;
      let fit = tabs.length;
      let total = 0;
      for (let i = 0; i < tabs.length; i++) {
        total += (hiddenRefs.current[i]?.offsetWidth || 0) + (i > 0 ? GAP_PX : 0);
        const isLast = i === tabs.length - 1;
        const reserve = isLast ? 0 : GAP_PX + moreWidth;
        if (total + reserve > available) {
          fit = i;
          break;
        }
      }
      setVisibleCount(Math.max(1, fit));
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, tabs.map((t) => t.label).join("|")]);

  const visible = tabs.slice(0, visibleCount);
  const overflow = tabs.slice(visibleCount);

  return (
    <div ref={containerRef} className="relative flex items-center h-12 w-full overflow-hidden">
      {/* Camada de medição — invisível, fora do fluxo visual, só pra saber a
          largura natural de cada aba antes de decidir o que cabe. */}
      <div className="absolute top-0 left-0 flex items-center gap-2 invisible pointer-events-none" aria-hidden="true">
        {tabs.map((tab, i) => (
          <button
            key={tab.value}
            ref={(el) => {
              hiddenRefs.current[i] = el;
            }}
            className={tabBtnClass(false)}
            tabIndex={-1}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge !== undefined && <TabBadge>{tab.badge}</TabBadge>}
          </button>
        ))}
        <button ref={moreGhostRef} className={MORE_BTN_CLASS} tabIndex={-1}>
          Mais {tabs.length}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Abas visíveis de verdade */}
      <div className="flex items-center gap-2">
        {visible.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={tabBtnClass(active === tab.value)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge !== undefined && (
              <TabBadge onActiveTab={active === tab.value}>{tab.badge}</TabBadge>
            )}
          </button>
        ))}
      </div>

      {overflow.length > 0 && (
        <>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 shrink-0" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={MORE_BTN_CLASS}
            >
              Mais {overflow.length}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((tab) => (
              <DropdownMenuItem
                key={tab.value}
                onClick={() => onChange(tab.value)}
                className={active === tab.value ? "text-blue-600 font-medium" : ""}
              >
                <tab.icon className="h-3.5 w-3.5 mr-2" />
                {tab.label}
                {tab.badge !== undefined && <span className="ml-auto text-[10px] font-bold">{tab.badge}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </>
      )}
    </div>
  );
}

type Question = {
  id: string;
  question: string;
  type: "text" | "multiline" | "select" | "multiselect" | "file";
  required: boolean;
  aiAssisted: boolean;
  allowsAttachment: boolean;
  exampleAnswer?: string;
  options?: string[]; // Added options for select/multiselect types
};

interface TaskStep {
  id: string;
  name: string;
  description: string;
  specialty: string; // This should likely be specialtyId to link to the specialties context
  leader: string;
  area: string;
  estimatedHours: number;
  order: number;
  canRunInParallel: boolean;
  experienceLevel?: string;
  // Added from existing code
  calculatedCost: number;
}

// Removed redeclaration of Task interface
// interface Task {
//   id: string
//   code: string // Auto-generated
//   name: string
//   specialty: string
//   executionTime: number // in hours
//   executionDeadline: number // in hours
//   deliveryDeadline: number // in hours
//   adjustmentDeadline: number // in hours
//   approvalDeadline: number // in hours
//   automaticValue: number
//   order: number
//   canRunInParallel: boolean

//   // New fields from design
//   attentionText: string
//   pop: string // Standard Operating Procedure
//   complementaryFiles: string[]
//   verificationItems: string[]

//   // Configuration checkboxes
//   keepNextStepWithNomadLeader: boolean
//   delegateToLeader: boolean
//   liberateAfterSend: boolean
//   requireFinalFiles: boolean
//   isInternalStep: boolean
//   concludeOnRejection: boolean
//   hideFromClient: boolean
//   hasVariations: boolean
//   noConditions: boolean
//   showAccess: boolean
//   hideInProducts: boolean
//   dontCountDeadline: boolean
//   dontCountValue: boolean
//   hasAdditionals: boolean

//   steps: TaskStep[]
//   // Added from existing code
//   description?: string
//   calculatedCost: number
//   // Added for task dependency
//   dependencies: string[]

//   // New fields for template import
//   isLinkedToTemplate?: boolean
//   templateId?: string | null
//   // Added for task import
//   canExecuteInParallel?: boolean // Renamed from canRunInParallel for consistency in import logic
// }

/**
 * O tipo de produto usado nesta tela. Era uma redeclaracao independente que
 * foi divergindo do Product do product-context (presentation como string em
 * vez de objeto, questionnaire com outro formato, campos faltando) — e como
 * o arquivo tinha @ts-nocheck, a divergencia so aparecia em runtime.
 *
 * Agora estende o tipo real: o que os dois tem em comum vem do contexto
 * (produto do contexto entra aqui e volta pra la sem conversao), e abaixo
 * ficam so os campos que existem apenas nesta tela, todos opcionais.
 */
type Product = ContextProduct & {
  price?: number;
  status?: string;
  deliveryVideoUrl?: string;
  benefits?: string;
  information?: string;
  descriptionAttention?: string;
  includedItems?: string[];
  notIncludedItems?: string[];
  complementaryProducts?: string[];
  requestAttention?: string;
  oneTimeContract?: string;
  monthlyContract?: string;
  previousContracts?: string;
  associatedTaskModels?: string[];
  subcategories?: string[];
  questions?: Question[];
  additionalImages?: string[];
  // Campos legados/derivados que a tela ainda le dinamicamente.
  [key: string]: any;
};

// Define Questionnaire type as it was undeclared
// O questionario e o mesmo tipo do product-context; a tela mantinha uma
// terceira declaracao propria, que divergia do que `task.questionnaire`
// realmente carrega.
type Questionnaire = ContextQuestionnaire;

// Mock default tax rates, assuming these are defined elsewhere or constants
const DEFAULT_TAX_RATES = {
  QUALIFICATION_FEE: 0.15, // 15%
  TAXES: 0.05, // 5%
  OPERATIONAL_FEE: 0.03, // 3%
};

function parseDemonstrations(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

export default function AdminProdutosPage() {
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();
  const { specialties } = useSpecialties();
  const { toast } = useToast();
  const { sidebarWidth } = useSidebar();
  const { headerHeight, footerHeight } = useAppFrameMetrics();

  // Filters and view mode state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  // Padrão da plataforma: lista mostra só o que está ativo. Inativo é
  // exceção e só aparece quando a pessoa muda o filtro de propósito — senão
  // produto descontinuado (ex.: os importados da base antiga) polui a tela.
  const [filterStatus, setFilterStatus] = useState<string>("active");
  // Aba-filtro "Com tarefas" (barra de filtros rápidos acima da tabela) —
  // separada de filterStatus porque é uma dimensão diferente (tem/não tem
  // tarefas vinculadas, não ativo/inativo).
  const [quickFilterTasksOnly, setQuickFilterTasksOnly] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("name");
  const [gridMode, setGridModeState] = useState<ProdGridMode>(() => {
    try {
      const saved = localStorage.getItem(PROD_GRID_STORAGE_KEY);
      if (saved === "list") return "list";
      const n = Number(saved);
      if (n === 2 || n === 3 || n === 4 || n === 5) return n as ProdGridMode;
    } catch {}
    return 3;
  });
  const setGridMode = (mode: ProdGridMode) => {
    setGridModeState(mode);
    try {
      localStorage.setItem(PROD_GRID_STORAGE_KEY, String(mode));
    } catch {}
  };
  const [pageSize, setPageSize] = useItemsPerPage("admin-produtos", 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageJumpValue, setPageJumpValue] = useState("");

  // Advanced filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<
    Array<{ id: string; name: string; filters: any }>
  >([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [visibleFields, setVisibleFields] = useState([
    "categoria",
    "area",
    "status",
    "ordenar",
  ]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false); // Renamed from isCreateOpen
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  // Qual imagem da galeria está em destaque no "Ver Detalhes" — null = usa a
  // capa por padrão. Resetado sempre que um novo produto é aberto (ver
  // handleViewProduct) pra não "vazar" a seleção de um produto pro outro.
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);
  // Aba ativa do "Ver Detalhes" — controlada pra permitir trocar de aba
  // programaticamente a partir do menu "Mais N" (ver OverflowTabBar).
  const [viewActiveTab, setViewActiveTab] = useState("overview");
  // Toolbar do questionário (busca + filtro + expandir/colapsar)
  const [questionnaireSearch, setQuestionnaireSearch] = useState("");
  const [questionnaireFilter, setQuestionnaireFilter] = useState<
    "all" | "required" | "optional"
  >("all");
  const [questionnaireExpandAll, setQuestionnaireExpandAll] = useState(false);
  const [collapsedQSections, setCollapsedQSections] = useState<Set<string>>(new Set());
  const [expandedQQuestions, setExpandedQQuestions] = useState<Set<string>>(new Set());
  // Sub-aba ativa dentro de "Apresentação" (Resumo/Destaques/Escopo/Entregáveis/Contratação/FAQ)
  const [presentationSubTab, setPresentationSubTab] = useState("resumo");

  // Reabre o painel certo (criar/editar/ver detalhes) ao clicar num item
  // pinado na Bandeja de Telas — mesmo padrão de admin/empresas.
  useConsumePendingActivation((key: string) => {
    if (key === "create") {
      handleOpenProductSheet();
    } else if (key.startsWith("edit:")) {
      const id = key.slice(5);
      const found = products.find((p) => p.id === id);
      if (found) handleEditProduct(found);
    } else if (key.startsWith("view:")) {
      const id = key.slice(5);
      const found = products.find((p) => p.id === id);
      if (found) handleViewProduct(found);
    }
  });
  const navigate = useNavigate();
  const { produtoId: urlProdutoId } = useParams<{ produtoId?: string }>();

  // Deep-link: open product sheet from URL param
  useEffect(() => {
    if (!urlProdutoId) return;
    // A URL usa só o número ("5"), sem o prefixo "prod_" (já tem "produtos"
    // antes da barra) — reconstitui o product_code completo pra buscar.
    const lookupId = /^\d+$/.test(urlProdutoId)
      ? `prod_${urlProdutoId}`
      : urlProdutoId;
    apiClient
      .getProduct(lookupId)
      .then((product: any) => {
        setSelectedProduct(product ? backendToFrontendProduct(product) : product);
        setIsViewSheetOpen(true);
      })
      .catch(() => {
        setSelectedProduct({ id: lookupId } as any);
        setIsViewSheetOpen(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProdutoId]);
  // ── Catalog tasks for the view sheet ────────────────────────────────────
  const [productCatalogTasks, setProductCatalogTasks] = useState<any[]>([]);
  const [catalogTasksLoading, setCatalogTasksLoading] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [catalogTaskSearch, setCatalogTaskSearch] = useState("");
  const [catalogTaskSearchResults, setCatalogTaskSearchResults] = useState<
    any[]
  >([]);
  const [catalogTaskSearchLoading, setCatalogTaskSearchLoading] =
    useState(false);
  const [openAddTaskFor, setOpenAddTaskFor] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // New state for view modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] =
    useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] =
    useState<Questionnaire | null>(null);
  // Circuito Pré-Habilitação — preview admin
  const [selectedCircuitTest, setSelectedCircuitTest] = useState<any>(null);
  const [isCircuitPreviewOpen, setIsCircuitPreviewOpen] = useState(false);

  const [importMode, setImportMode] = useState<"linked" | "copy" | null>(null);
  const [selectedTemplateToImport, setSelectedTemplateToImport] =
    useState<any>(null);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  const [showScheduling, setShowScheduling] = useState(false);
  const [activationDate, setActivationDate] = useState("");
  const [deactivationDate, setDeactivationDate] = useState("");

  const [customTagInput, setCustomTagInput] = useState("");
  const [priceEditPassword, setPriceEditPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<
    Array<{
      id: string;
      url: string;
      title?: string;
      description?: string;
      isMain: boolean;
      sortOrder: number;
    }>
  >([]);
  const [productQuestions, setProductQuestions] = useState<Question[]>([]);
  const [productTasks, setProductTasks] = useState<Task[]>([]); // State to hold tasks for the product form

  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [currentFieldEnhancing, setCurrentFieldEnhancing] = useState<
    string | null
  >(null);

  const [productVariations, setProductVariations] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      priceModifier?: number;
      deadlineDays?: number;
      scopeDescription?: string;
      features?: string[];
      sortOrder?: number;
      isActive?: boolean;
    }>
  >([]);

  const [productAddOns, setProductAddOns] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      category: "creative_type" | "extra";
    }>
  >([]);

  const [toggleConfirmation, setToggleConfirmation] = useState<{
    product: Product | null;
    newStatus: boolean;
  }>({ product: null, newStatus: false });

  // Mock formData for the updates, this would typically be managed by a form context or hook
  const [productFormData, setProductFormData] = useState<{
    [key: string]: any;
    productId: string;
    name: string;
    category: string;
    categories: string[];
    subcategories: string[];
    tags: string[];
    recurrence: string;
    price: string;
    deliveryDays: string;
    isActive: boolean;
    exigeAprovacaoCliente: boolean;
    productImage: File | null;
    productImagePreview: string;
    presentation: string;
    deliveryVideoUrl: string;
    benefits: string;
    information: string;
    descriptionAttention: string;
    summaryDescription: string;
    includedItems: string[];
    notIncludedItems: string[];
    complementaryProducts: string[];
    requestAttention: string;
    oneTimeContract: string;
    monthlyContract: string;
    previousContracts: string;
    status: string;
    associatedTaskModels: string[];
    description: string;
    /**
     * Titulo e descricao do questionario do produto. Era declarado como
     * `Array<pergunta>` e inicializado com `[]`, mas NENHUM ponto do arquivo
     * usa como lista: as perguntas vivem em `productQuestions`, e tanto os
     * inputs quanto os tres caminhos de salvar leem `.title`/`.description`.
     * Com o array, os campos abriam vazios e digitar neles espalhava o array
     * num objeto.
     */
    questionnaire: { title: string; description: string };
    tasks: Task[];
    excludedItems: string[];
  }>({
    productId: "",
    name: "",
    category: "",
    categories: [],
    subcategories: [],
    tags: [],
    recurrence: "",
    price: "",
    deliveryDays: "",
    isActive: true,
    exigeAprovacaoCliente: true,
    productImage: null,
    productImagePreview: "",
    presentation: "",
    deliveryVideoUrl: "",
    benefits: "",
    information: "",
    descriptionAttention: "",
    summaryDescription: "",
    includedItems: [],
    notIncludedItems: [],
    complementaryProducts: [],
    requestAttention: "",
    oneTimeContract: "",
    monthlyContract: "",
    previousContracts: "",
    status: "Ativo",
    associatedTaskModels: [],
    // Fields from updates for editing
    description: "",
    // Questionnaire and Tasks fields
    questionnaire: { title: "", description: "" },
    tasks: [],
    excludedItems: [],
  });

  // Aba ativa do formulário de cadastro/edição de produto (controlada pra
  // permitir "pular" direto pra aba+campo certos a partir do alerta de
  // pendências abaixo).
  const [productFormTab, setProductFormTab] = useState("info");

  // Alguns produtos antigos guardam `presentation` como objeto rico
  // ({tagline, highlights, ...}, ver lib/product-adapter.ts) em vez de
  // string simples — esse form só lida com texto puro, então convertemos
  // com segurança em vez de deixar `.trim()` quebrar a tela.
  const textOf = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && typeof (v as any).tagline === "string") {
      return (v as any).tagline;
    }
    return "";
  };

  // Ao salvar, o form só edita o texto puro da tagline — se o produto tinha
  // o objeto rico (highlights, targetAudience, whatIsIncluded, etc. vindos
  // da importação da base antiga), preserva o resto e só atualiza a
  // tagline. Sem isso, qualquer save no formulário apagava esses campos
  // silenciosamente (sobrescrevia o objeto inteiro pela string).
  // Estado editável dos campos estruturados da apresentação comercial
  // (Para quem é, O que está incluído, Não incluído, Pré-requisitos, Como
  // contratar, FAQ, Destaques, Entregáveis) — antes só existiam no seed/
  // import da base antiga, sem nenhuma UI de edição.
  const [presentationDraft, setPresentationDraft] = useState<{
    highlights: string[];
    targetAudience: string[];
    whatIsIncluded: { title: string; description: string }[];
    deliverables: string[];
    notIncluded: string[];
    requirements: string[];
    howToRequest: { step: string; description: string }[];
    faq: { question: string; answer: string }[];
  }>({
    highlights: [],
    targetAudience: [],
    whatIsIncluded: [],
    deliverables: [],
    notIncluded: [],
    requirements: [],
    howToRequest: [],
    faq: [],
  });

  // O placeholder deixado pela migração da base antiga ("[DADO NÃO
  // DISPONÍVEL NA BASE ANTIGA...]") não deve aparecer como item editável —
  // ao abrir o form pra editar, tratamos como campo vazio pra o usuário
  // preencher do zero.
  const isPlaceholderText = (v: unknown): boolean =>
    typeof v === "string" && v.includes("DADO NÃO DISPONÍVEL");
  const cleanStringArr = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? arr.filter((s): s is string => typeof s === "string" && !isPlaceholderText(s))
      : [];
  const cleanPointArr = (
    arr: unknown,
    key: string,
  ): { [k: string]: string }[] =>
    Array.isArray(arr)
      ? arr
          .filter((p) => p && typeof p === "object" && !isPlaceholderText((p as any)[key]))
          .map((p: any) => ({ [key]: p[key] || "", description: p.description || "" }))
      : [];
  const cleanFaqArr = (
    arr: unknown,
  ): { question: string; answer: string }[] =>
    Array.isArray(arr)
      ? arr
          .filter((p) => p && typeof p === "object" && !isPlaceholderText((p as any).question))
          .map((p: any) => ({ question: p.question || "", answer: p.answer || "" }))
      : [];

  const buildPresentationPayload = (
    original: unknown,
    tagline: string,
    draft: typeof presentationDraft,
  ): ProductPresentation => ({
    ...(original && typeof original === "object" ? (original as object) : {}),
    tagline,
    highlights: draft.highlights,
    targetAudience: draft.targetAudience,
    whatIsIncluded: draft.whatIsIncluded,
    deliverables: draft.deliverables,
    notIncluded: draft.notIncluded,
    requirements: draft.requirements,
    howToRequest: draft.howToRequest,
    faq: draft.faq,
  });

  // Itens que compõem o "quão completo está o cadastro" — cada um aponta
  // pra uma aba + campo específico. `required` bloqueia o salvamento (ver
  // handleCreateProduct/handleSaveProduct); os demais são recomendados.
  const PRODUCT_COMPLETION_CHECKLIST: Array<{
    key: string;
    label: string;
    tab: string;
    required: boolean;
    isFilled: (d: typeof productFormData) => boolean;
  }> = [
    {
      key: "name",
      label: "Nome do produto",
      tab: "info",
      required: true,
      isFilled: (d) => !!textOf(d.name).trim(),
    },
    {
      key: "categories",
      label: "Categoria",
      tab: "info",
      required: true,
      isFilled: (d) => (d.categories || []).length > 0,
    },
    {
      key: "productImage",
      label: "Imagem de capa",
      tab: "info",
      required: false,
      isFilled: (d) => !!(d.productImagePreview || d.productImage),
    },
    {
      key: "summaryDescription",
      label: "Resumo da descrição",
      tab: "info",
      required: false,
      isFilled: (d) => !!textOf(d.summaryDescription).trim(),
    },
    {
      key: "includedItems",
      label: "Itens inclusos",
      tab: "info",
      required: false,
      isFilled: (d) => (d.includedItems || []).length > 0,
    },
    {
      key: "notIncludedItems",
      label: "Itens não inclusos",
      tab: "info",
      required: false,
      isFilled: (d) => (d.notIncludedItems || []).length > 0,
    },
    {
      key: "presentation",
      label: "Texto de apresentação",
      tab: "apresentacao",
      required: false,
      isFilled: (d) => !!textOf(d.presentation).trim(),
    },
    {
      key: "benefits",
      label: "Benefícios chave",
      tab: "apresentacao",
      required: false,
      isFilled: (d) => !!textOf(d.benefits).trim(),
    },
    {
      key: "requestAttention",
      label: "O que solicitar ao cliente",
      tab: "solicitar",
      required: false,
      isFilled: (d) => !!textOf(d.requestAttention).trim(),
    },
    {
      key: "tasks",
      label: "Tarefas do produto",
      tab: "tarefas",
      required: false,
      isFilled: (d) => (d.tasks || []).length > 0,
    },
    {
      key: "questionnaire",
      label: "Perguntas do questionário",
      tab: "questionario",
      required: false,
      isFilled: (d) =>
        Array.isArray((d.questionnaire as any)?.questions)
          ? (d.questionnaire as any).questions.length > 0
          : Array.isArray(d.questionnaire) && d.questionnaire.length > 0,
    },
  ];

  const productCompletionStatus = PRODUCT_COMPLETION_CHECKLIST.map((item) => ({
    ...item,
    filled: item.isFilled(productFormData),
  }));
  const missingRequiredItems = productCompletionStatus.filter(
    (i) => i.required && !i.filled,
  );
  const missingRecommendedItems = productCompletionStatus.filter(
    (i) => !i.required && !i.filled,
  );

  const jumpToProductField = (tab: string, key: string) => {
    setProductFormTab(tab);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`product-field-${key}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add(
          "ring-2",
          "ring-blue-400",
          "ring-offset-2",
          "dark:ring-offset-slate-900",
        );
        setTimeout(() => {
          el.classList.remove(
            "ring-2",
            "ring-blue-400",
            "ring-offset-2",
            "dark:ring-offset-slate-900",
          );
        }, 1600);
      });
    });
  };

  const availableTags = [
    "Pauta",
    "Assuntos para posts",
    "Temas para posts",
    "Conteúdo para posts",
    "Temas para blogs",
    "Assuntos para blogs",
    "Conteúdos para blogs",
    "Temas para vídeos",
    "Assuntos para vídeos",
    "Conteúdos para vídeos",
  ];

  const availableSubcategories = [
    "Social Media",
    "Blog",
    "Vídeo",
    "E-mail Marketing",
    "SEO",
    "Copywriting",
  ];

  // Normalize products to ensure arrays are never undefined
  const safeProducts = (products || []).map((p) => ({
    ...p,
    tasks: (p.tasks || []).map((t) => ({
      ...t,
      steps: t.steps || [],
      dependencies: t.dependencies || [],
    })),
  }));

  const filteredProducts = safeProducts
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(product.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String((product as any).productCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesArea =
        filterAreas.length === 0 ||
        (product.tasks || []).some((task) =>
          (task.steps || []).some((step) => filterAreas.includes(step.area)),
        );

      const _productCategories: string[] = (product as any).categories?.length
        ? (product as any).categories
        : product.category ? [product.category] : [];
      const matchesCategory =
        filterCategories.length === 0 ||
        _productCategories.some((c) => filterCategories.includes(c));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && product.isActive) ||
        (filterStatus === "inactive" && !product.isActive);

      const matchesTasksOnly = !quickFilterTasksOnly || (product.tasks || []).length > 0;

      return matchesSearch && matchesArea && matchesCategory && matchesStatus && matchesTasksOnly;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-asc":
          return (a.finalPrice || 0) - (b.finalPrice || 0);
        case "price-desc":
          return (b.finalPrice || 0) - (a.finalPrice || 0);
        case "id":
          return a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const getPageNumbers = () => {
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    const pages: (number | string)[] = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible - 1; i++) pages.push(i);
        if (totalPages > maxVisible) pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++)
          pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const commitPageJump = () => {
    const n = Number.parseInt(pageJumpValue, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n);
    setPageJumpValue("");
  };

  const uniqueAreas = Array.from(
    new Set(
      safeProducts.flatMap((p) =>
        (p.tasks || []).flatMap((t) => (t.steps || []).map((s) => s.area)),
      ),
    ),
  ).filter(Boolean);

  const uniqueCategories = Array.from(
    new Set(
      safeProducts.flatMap((p) =>
        (p as any).categories?.length ? (p as any).categories : p.category ? [p.category] : []
      )
    ),
  ).filter(Boolean);

  const getTotalHours = (product: Product) => {
    return (product.tasks || []).reduce((total, task) => {
      return (
        total +
        (task.steps || []).reduce(
          (taskTotal, step) => taskTotal + step.estimatedHours,
          0,
        )
      );
    }, 0);
  };

  const getContractabilitySummary = (product: Product) =>
    (product as any).contractability as
      | { isContractable: boolean; activeTaskTemplates: number }
      | undefined;

  const canActivateProduct = (product: Product) => {
    const summary = getContractabilitySummary(product);
    if (summary) return summary.isContractable;
    return (product.tasks || []).length > 0;
  };

  // Updated badge colors for dependency statuses
  const getDependencyBadgeColor = (dependencies: string[]) => {
    if (dependencies.length === 0) return "bg-gray-100 text-gray-800";
    if (dependencies.length === 1) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  // ── Catalog Task Handlers ───────────────────────────────────────────────
  const fetchProductCatalogTasks = useCallback(async (productId: string) => {
    setCatalogTasksLoading(true);
    try {
      const data = await apiClient.getCatalogTasksByProduct(productId);
      setProductCatalogTasks(Array.isArray(data) ? data : []);
    } catch {
      setProductCatalogTasks([]);
    } finally {
      setCatalogTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isViewSheetOpen && selectedProduct) {
      fetchProductCatalogTasks(selectedProduct.id);
      setOpenAddTaskFor(null);
      setCatalogTaskSearch("");
      setCatalogTaskSearchResults([]);
    } else {
      setProductCatalogTasks([]);
    }
  }, [isViewSheetOpen, selectedProduct?.id]);

  const searchCatalogTasks = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setCatalogTaskSearchResults([]);
        return;
      }
      setCatalogTaskSearchLoading(true);
      try {
        const res = await apiClient.getCatalogTasks({ search: q, limit: 20 });
        const data = res.data ?? res ?? [];
        const linkedIds = new Set(
          productCatalogTasks.map(
            (l: any) => l.catalog_task?.id ?? l.catalog_task_id,
          ),
        );
        setCatalogTaskSearchResults(
          data.filter((t: any) => !linkedIds.has(t.id)),
        );
      } catch {
        setCatalogTaskSearchResults([]);
      } finally {
        setCatalogTaskSearchLoading(false);
      }
    },
    [productCatalogTasks],
  );

  async function handleAddCatalogTask(task: any, phase: string | null) {
    if (!selectedProduct) return;
    const relevantLinks = phase
      ? productCatalogTasks.filter((l) => l.phase === phase)
      : productCatalogTasks.filter((l) => !l.phase || l.phase === "base");
    const nextOrder = relevantLinks.length + 1;
    try {
      await apiClient.linkCatalogTaskToProduct({
        product_id: selectedProduct.id,
        catalog_task_id: task.id,
        sort_order: nextOrder,
        is_mandatory: true,
        phase: phase || undefined,
      });
      toast({ title: "Tarefa vinculada!" });
      fetchProductCatalogTasks(selectedProduct.id);
      setCatalogTaskSearch("");
      setCatalogTaskSearchResults([]);
    } catch (e: any) {
      toast({
        title: "Erro ao vincular",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  async function handleRemoveCatalogTaskLink(linkId: string) {
    try {
      await apiClient.unlinkCatalogTask(linkId);
      toast({ title: "Tarefa desvinculada" });
      if (selectedProduct) fetchProductCatalogTasks(selectedProduct.id);
    } catch (e: any) {
      toast({
        title: "Erro ao desvincular",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  async function handleUpdateCatalogTaskLink(
    link: any,
    updates: { is_mandatory?: boolean; notes?: string; sort_order?: number },
  ) {
    try {
      await apiClient.linkCatalogTaskToProduct({
        product_id: link.product_id,
        catalog_task_id: link.catalog_task?.id ?? link.catalog_task_id,
        sort_order: updates.sort_order ?? link.sort_order,
        is_mandatory: updates.is_mandatory ?? link.is_mandatory,
        phase: link.phase ?? undefined,
        notes:
          updates.notes !== undefined
            ? updates.notes || undefined
            : (link.notes ?? undefined),
      });
      if (selectedProduct) fetchProductCatalogTasks(selectedProduct.id);
    } catch (e: any) {
      toast({
        title: "Erro ao atualizar",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  async function handleMoveTaskLink(
    link: any,
    idx: number,
    arr: any[],
    direction: -1 | 1,
  ) {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    const other = arr[newIdx];
    try {
      await Promise.all([
        apiClient.linkCatalogTaskToProduct({
          product_id: link.product_id,
          catalog_task_id: link.catalog_task?.id ?? link.catalog_task_id,
          sort_order: newIdx + 1,
          is_mandatory: link.is_mandatory,
          phase: link.phase ?? undefined,
          notes: link.notes ?? undefined,
        }),
        apiClient.linkCatalogTaskToProduct({
          product_id: other.product_id,
          catalog_task_id: other.catalog_task?.id ?? other.catalog_task_id,
          sort_order: idx + 1,
          is_mandatory: other.is_mandatory,
          phase: other.phase ?? undefined,
          notes: other.notes ?? undefined,
        }),
      ]);
      if (selectedProduct) fetchProductCatalogTasks(selectedProduct.id);
    } catch (e: any) {
      toast({
        title: "Erro ao reordenar",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductFormTab("info");
    setProductFormData({
      name: product.name || "",
      presentation: textOf((product as any).presentation),
      benefits: (product as any).benefits || "",
      information: (product as any).information || "",
      description: product.description || "",
      summaryDescription: (product as any).summaryDescription || "",
      descriptionAttention: (product as any).descriptionAttention || "",
      category: product.category || "",
      categories: (product as any).categories?.length
        ? (product as any).categories
        : product.category ? [product.category] : [],
      subcategories: (product as any).subcategories || [],
      price: product.finalPrice?.toString() || "0",
      deliveryDays: (product as any).deliveryDays?.toString() || "0",
      productImage: null,
      productImagePreview:
        (product as any).productImagePreview || (product as any).image || "",
      deliveryVideoUrl: (product as any).deliveryVideoUrl || "",
      tags: (product as any).tags || [],
      productId: (product as any).productCode || product.id,
      recurrence: (product as any).recurrence || "",
      complementaryProducts: (product as any).complementaryProductIds || [],
      requestAttention: (product as any).requestAttention || "",
      oneTimeContract: (product as any).oneTimeContract || "",
      monthlyContract: (product as any).monthlyContract || "",
      previousContracts: (product as any).previousContracts || "",
      status: product.isActive ? "Ativo" : "Inativo",
      isActive: product.isActive,
      // Produto salvo antes desta coluna existir não traz o campo: assume
      // `true`, que é o default do banco e o comportamento histórico.
      exigeAprovacaoCliente: (product as any).exigeAprovacaoCliente ?? true,
      associatedTaskModels: (product as any).associatedTaskModels || [],
      // Update formData for questionnaire and tasks
      questionnaire: {
        title: (product as any).questionnaire?.title || "",
        description: (product as any).questionnaire?.description || "",
      },
      tasks: product.tasks || [], // Use tasks from the product object
      includedItems: (product as any).includedItems || [],
      notIncludedItems: (product as any).notIncludedItems || [],
      excludedItems: (product as any).excludedItems || [],
    });
    {
      const pres = (product as any).presentation;
      setPresentationDraft({
        highlights: cleanStringArr(pres?.highlights),
        targetAudience: cleanStringArr(pres?.targetAudience),
        whatIsIncluded: cleanPointArr(pres?.whatIsIncluded, "title") as {
          title: string;
          description: string;
        }[],
        deliverables: cleanStringArr(pres?.deliverables),
        notIncluded: cleanStringArr(pres?.notIncluded),
        requirements: cleanStringArr(pres?.requirements),
        howToRequest: cleanPointArr(pres?.howToRequest, "step") as {
          step: string;
          description: string;
        }[],
        faq: cleanFaqArr(pres?.faq),
      });
    }
    setAdditionalImages((product as any).additionalImages || []);
    // Load rich portfolio images; fall back to building from demonstrations URLs
    const existingPortfolio = (product as any).portfolioImages as
      | Array<{
          id: string;
          url: string;
          title?: string;
          description?: string;
          isMain: boolean;
          sortOrder: number;
        }>
      | undefined;
    if (existingPortfolio && existingPortfolio.length > 0) {
      setPortfolioImages(existingPortfolio);
    } else {
      const demoUrls: string[] = parseDemonstrations((product as any).demonstrations);
      setPortfolioImages(
        demoUrls.map((url, i) => ({
          id: `img-${i}-${Date.now()}`,
          url,
          title: "",
          description: "",
          isMain: i === 0,
          sortOrder: i,
        })),
      );
    }
    // "Perguntas" nessa aba lê productQuestions, não productFormData.questionnaire
    // — mas o dado real (do produto salvo) vive em product.questionnaire.questions,
    // não em product.questions (campo que nunca existiu no adapter). Sem isso, a
    // aba sempre aparecia vazia mesmo com perguntas reais salvas no produto.
    setProductQuestions(
      (product as any).questions || (product as any).questionnaire?.questions || [],
    );
    setProductVariations(product.variations || []);
    setProductAddOns(product.addOns || []);
    setProductTasks(product.tasks || []); // Set tasks for the product form
    setIsProductSheetOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    // products from useProducts() context are ALREADY adapted to frontend shape.
    // Do NOT run backendToFrontendProduct here — that double-adapts and wipes
    // tags/demonstrations/stages/tasks.
    setSelectedProduct(product);
    setActiveGalleryImage(null);
    setViewActiveTab("overview");
    setQuestionnaireSearch("");
    setQuestionnaireFilter("all");
    setQuestionnaireExpandAll(false);
    setCollapsedQSections(new Set());
    setExpandedQQuestions(new Set());
    setPresentationSubTab("resumo");
    setIsViewSheetOpen(true);
    // "produtos" já está antes da barra, então o prefixo "prod_" é redundante
    // na URL — só o número (a UI ainda mostra "prod_N" nos badges/ID normalmente).
    const urlCode = (
      (product as any).productCode || product.id
    ).replace(/^prod_/, "");
    navigate(`/admin/produtos/${urlCode}`, { replace: true });
  };

  const handleDeleteProduct = async (productId: string) => {
    // Implement deletion logic here, e.g., show a confirmation dialog
    if (
      !confirm(
        "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
      )
    )
      return;

    try {
      await deleteProduct(productId);
      // Optionally show a success message
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    }
  };

  const calculateAutomaticPrice = () => {
    const tasksTotal = (productFormData.tasks || []).reduce((total, task) => {
      return total + (task.automaticValue || 0);
    }, 0);

    return tasksTotal;
  };

  const calculateStepValue = (specialtyId: string, hours: number): number => {
    if (!specialtyId || !hours) return 0;

    const specialty = specialties.find(
      (s) => s.id.toString() === specialtyId.toString(),
    );
    if (!specialty) return 0;

    // Use the highest level (senior) rate as specified
    const seniorRate = specialty.rates.senior;
    return seniorRate * hours;
  };

  const calculateTaskValue = (steps: TaskStep[]): number => {
    if (!steps || steps.length === 0) return 0;

    return steps.reduce((total, step) => {
      const stepValue = calculateStepValue(
        step.specialty,
        step.estimatedHours || 0,
      );
      return total + stepValue;
    }, 0);
  };

  // Campos do cadastro de produto com botão "Melhorar com IA". `mode: "list"`
  // pede itens curtos (um por linha) e faz merge no array existente; "text"
  // (padrão) substitui o campo pelo texto gerado.
  const AI_ENHANCE_FIELDS: Record<
    string,
    { label: string; mode?: "text" | "list" }
  > = {
    name: { label: "Nome do Produto" },
    description: { label: "Descrição Completa do Produto" },
    summaryDescription: { label: "Resumo da Descrição" },
    descriptionAttention: { label: "Atenção na Descrição" },
    presentation: { label: "Texto de Apresentação" },
    benefits: { label: "Benefícios Chave" },
    information: { label: "Informações Adicionais" },
    requestAttention: { label: "O que Solicitar ao Cliente" },
    includedItems: { label: "Itens Inclusos", mode: "list" },
    notIncludedItems: { label: "Itens Não Inclusos", mode: "list" },
  };

  const [aiEnhanceError, setAiEnhanceError] = useState<string | null>(null);

  // Histórico de versões — snapshot automático tirado pelo backend a cada
  // "Salvar Produto" (ver PUT /api/products/:id). Aqui só listamos e
  // permitimos restaurar; o snapshot em si é responsabilidade do backend.
  const [versionHistory, setVersionHistory] = useState<{
    open: boolean;
    loading: boolean;
    restoring: string | null;
    versions: Array<{ id: string; created_at: string; name?: string; short_description?: string }>;
    error: string | null;
  }>({ open: false, loading: false, restoring: null, versions: [], error: null });

  const handleOpenVersionHistory = async () => {
    if (!selectedProduct) return;
    setVersionHistory((v) => ({ ...v, open: true, loading: true, error: null }));
    try {
      const res: any = await apiClient.getProductVersions(selectedProduct.id);
      setVersionHistory((v) => ({ ...v, loading: false, versions: res?.data || [] }));
    } catch (err: any) {
      setVersionHistory((v) => ({
        ...v,
        loading: false,
        error: err?.message || "Não foi possível carregar o histórico.",
      }));
    }
  };

  // Confirmação antes de restaurar — a versão que o usuário clicou fica
  // "pendente" até confirmar no ConfirmationDialog (evita reverter por
  // engano com um clique só).
  const [versionPendingRestore, setVersionPendingRestore] = useState<{
    id: string;
    name?: string;
    created_at: string;
  } | null>(null);

  // Confirmação antes de salvar o produto — "Salvar Produto" só abre o
  // diálogo; o save de fato só roda em onConfirm.
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const handleRequestRestoreVersion = (version: { id: string; name?: string; created_at: string }) => {
    setVersionPendingRestore(version);
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedProduct) return;
    setVersionPendingRestore(null);
    setVersionHistory((v) => ({ ...v, restoring: versionId }));
    try {
      const restored: any = await apiClient.restoreProductVersion(selectedProduct.id, versionId);
      const adapted = backendToFrontendProduct(restored);
      setSelectedProduct(adapted);
      handleEditProduct(adapted);
      setVersionHistory((v) => ({ ...v, open: false, restoring: null }));
      toast({ title: "Versão restaurada", description: "O produto foi revertido pra essa versão." });
      refetchProducts();
    } catch (err: any) {
      setVersionHistory((v) => ({
        ...v,
        restoring: null,
        error: err?.message || "Não foi possível restaurar essa versão.",
      }));
    }
  };

  // Pesquisa de preço de mercado com IA (busca real na internet via Gemini
  // grounding) — só dispara quando o admin clica, nunca automático (cada
  // chamada é uma busca de verdade, mais lenta/cara que os botões de texto).
  const [pricingResearch, setPricingResearch] = useState<{
    loading: boolean;
    text: string;
    sources: Array<{ title: string; url: string }>;
    error: string | null;
  }>({ loading: false, text: "", sources: [], error: null });

  // A IA às vezes usa markdown (**negrito**, # título) mesmo quando pedimos
  // pra não usar — o painel exibe texto puro, então limpamos aqui em vez de
  // depender só do prompt.
  const stripMarkdown = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/^[ \t]*#{1,6}\s+/gm, "")
      .replace(/^([ \t]*)\*\s+/gm, "$1- ");

  const handleResearchPricing = async () => {
    setPricingResearch({ loading: true, text: "", sources: [], error: null });
    try {
      const res: any = await apiClient.aiResearchProductPricing({
        product_name: productFormData.name,
        category:
          (productFormData.categories || [])[0] || productFormData.category,
        description:
          productFormData.description || productFormData.summaryDescription,
      });
      setPricingResearch({
        loading: false,
        text: stripMarkdown(res?.research_text || ""),
        sources: res?.sources || [],
        error: null,
      });
    } catch (err: any) {
      setPricingResearch({
        loading: false,
        text: "",
        sources: [],
        error: err?.message || "Não foi possível pesquisar o mercado agora.",
      });
    }
  };

  const handleAIEnhance = async (
    fieldName: string,
    prefs: { length: "manter" | "curto" | "medio" | "longo"; approach: "melhorar" | "recriar" } = {
      length: "manter",
      approach: "melhorar",
    },
  ) => {
    const fieldConfig = AI_ENHANCE_FIELDS[fieldName];
    if (!fieldConfig) return;
    const mode = fieldConfig.mode || "text";
    const currentValue = (productFormData as any)[fieldName];
    const currentText = Array.isArray(currentValue)
      ? currentValue.join("\n")
      : currentValue || "";

    setAiEnhanceError(null);
    setIsEnhancingWithAI(true);
    setCurrentFieldEnhancing(fieldName);

    try {
      const otherFields: Record<string, string> = {};
      Object.entries(AI_ENHANCE_FIELDS).forEach(([key, cfg]) => {
        if (key === fieldName) return;
        const v = (productFormData as any)[key];
        const text = Array.isArray(v) ? v.join(", ") : v;
        if (text && String(text).trim()) otherFields[cfg.label] = String(text);
      });

      const res: any = await apiClient.aiImproveProductField({
        field_label: fieldConfig.label,
        current_value: currentText,
        mode,
        length: prefs.length,
        approach: prefs.approach,
        context: {
          name: productFormData.name,
          category:
            (productFormData.categories || [])[0] || productFormData.category,
          price: productFormData.price,
          other_fields: otherFields,
        },
      });

      const improved = (res?.improved_value || "").trim();
      if (!improved) return;

      if (mode === "list") {
        const newItems = improved
          .split("\n")
          .map((s: string) => s.replace(/^[-•\d.]+\s*/, "").trim())
          .filter(Boolean);
        const existing: string[] = Array.isArray(currentValue)
          ? currentValue
          : [];
        const merged = Array.from(new Set([...existing, ...newItems]));
        setProductFormData({ ...productFormData, [fieldName]: merged });
      } else {
        setProductFormData({ ...productFormData, [fieldName]: improved });
      }
    } catch (err: any) {
      setAiEnhanceError(
        err?.message || "Não foi possível melhorar este campo com IA agora.",
      );
    } finally {
      setIsEnhancingWithAI(false);
      setCurrentFieldEnhancing(null);
    }
  };

  // Botão "Melhorar com IA" reutilizável — mesma linguagem visual do
  // TaskLaunchDrawer (Sparkles ↔ Loader2, texto vira "Melhorando…"). Antes de
  // gerar, abre um popover com preferências de tamanho/abordagem — lembradas
  // por campo (cada campo guarda a última escolha feita nele).
  const AiFieldButton = ({ fieldName }: { fieldName: string }) => {
    const isLoading =
      isEnhancingWithAI && currentFieldEnhancing === fieldName;
    const [open, setOpen] = useState(false);
    const [length, setLength] = useState<"manter" | "curto" | "medio" | "longo">("manter");
    const [approach, setApproach] = useState<"melhorar" | "recriar">("melhorar");
    const isList = AI_ENHANCE_FIELDS[fieldName]?.mode === "list";

    const LENGTH_OPTIONS: Array<{ value: typeof length; label: string }> = isList
      ? [
          { value: "manter", label: "Mesma quantidade" },
          { value: "curto", label: "Poucos itens" },
          { value: "medio", label: "Quantidade média" },
          { value: "longo", label: "Muitos itens" },
        ]
      : [
          { value: "manter", label: "Manter tamanho atual" },
          { value: "curto", label: "Curto" },
          { value: "medio", label: "Médio" },
          { value: "longo", label: "Longo" },
        ];

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isEnhancingWithAI}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {isLoading ? "Melhorando…" : "Melhorar com IA"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3 space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              {isList ? "Quantidade" : "Tamanho da resposta"}
            </p>
            <div className="flex flex-wrap gap-1">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLength(opt.value)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                    length === opt.value
                      ? "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Como aplicar
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { value: "melhorar", label: "Melhorar o atual" },
                  { value: "recriar", label: "Recriar do zero" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setApproach(opt.value)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                    approach === opt.value
                      ? "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs btn-brand gap-1.5"
            onClick={() => {
              setOpen(false);
              handleAIEnhance(fieldName, { length, approach });
            }}
          >
            <Sparkles className="h-3 w-3" />
            Gerar
          </Button>
        </PopoverContent>
      </Popover>
    );
  };

  // ── ID generator ────────────────────────────────────────────────────────
  const CATEGORY_SIGLA: Record<string, string> = {
    // Web
    Web: "WEB",
    "Desenvolvimento Web": "WEB",
    Desenvolvimento: "WEB",
    "Loja Virtual": "WEB",
    // Design
    "Design Gráfico": "DES",
    "Design e Audiovisual": "DES",
    Design: "DES",
    // Social Media
    "Social Media": "SOC",
    "Mídias e Conteúdo": "SOC",
    Conteúdo: "SOC",
    // Ads / Tráfego
    "Tráfego Pago": "ADS",
    Tráfego: "ADS",
    "Marketing Digital": "ADS",
    Marketing: "ADS",
    // Branding
    Branding: "BRD",
    // Vídeo
    Vídeo: "VID",
    Audiovisual: "VID",
    "Vídeo e Audiovisual": "VID",
    "Produção Audiovisual": "VID",
    // Automação
    Automação: "AUT",
    // SEO
    SEO: "SE",
    // CRM
    CRM: "CRM",
    Relacionamento: "CRM",
    // Consultoria fallback
    Consultoria: "CON",
  };

  const generateProductId = (category: string): string => {
    const sigla = CATEGORY_SIGLA[category] || "PROD";
    const prefix = `${sigla}-`;
    // IDs are now auto-increment integers — return empty string (server assigns the ID)
    return "";
  };

  const handleCreateProduct = () => {
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha o nome do produto");
      return;
    }

    if (!productFormData.categories || productFormData.categories.length === 0) {
      alert("Por favor, selecione ao menos uma categoria");
      return;
    }

    const primaryCategory = productFormData.categories[0];
    const generatedId = generateProductId(primaryCategory);
    const newProductWithDefaults = {
      id: generatedId,
      name: productFormData.name,
      description:
        productFormData.summaryDescription || productFormData.benefits,
      category: primaryCategory,
      categories: productFormData.categories,
      isActive: productFormData.isActive,
      exigeAprovacaoCliente: productFormData.exigeAprovacaoCliente,
      tasks: productTasks, // This should be populated if tasks are managed within the product form
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTasksCost: 0,
      qualificationFee: 0,
      subtotal: 0,
      taxes: 0,
      operationalFee: 0,
      partnerCommission: 0,
      finalPrice:
        Number.parseFloat(productFormData.price) || calculateAutomaticPrice(),
      variations: productVariations,
      addOns: productAddOns,
      // Populate other Product fields as needed from productFormData
      price: Number.parseFloat(productFormData.price) || 0,
      deliveryDays: effectiveDeliveryDays,
      image: productFormData.productImagePreview,
      productImagePreview: productFormData.productImagePreview,
      deliveryVideoUrl: productFormData.deliveryVideoUrl,
      presentation: buildPresentationPayload(
        null,
        productFormData.presentation,
        presentationDraft,
      ),
      benefits: productFormData.benefits,
      information: productFormData.information,
      descriptionAttention: productFormData.descriptionAttention,
      summaryDescription: productFormData.summaryDescription,
      includedItems: productFormData.includedItems,
      notIncludedItems: productFormData.notIncludedItems,
      complementaryProductIds: productFormData.complementaryProducts,
      requestAttention: productFormData.requestAttention,
      oneTimeContract: productFormData.oneTimeContract,
      monthlyContract: productFormData.monthlyContract,
      previousContracts: productFormData.previousContracts,
      status: productFormData.status,
      associatedTaskModels: productFormData.associatedTaskModels,
      recurrence: productFormData.recurrence,
      subcategories: productFormData.subcategories,
      tags: productFormData.tags,
      questions: productQuestions,
      additionalImages: additionalImages,
      portfolioImages: portfolioImages,
      demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
      // Questionnaire should be part of the product data if managed
      questionnaire: {
        ...(productFormData.questionnaire as any),
        title: (productFormData.questionnaire as any)?.title || "Questionário do Produto",
        description:
          (productFormData.questionnaire as any)?.description ||
          "Respostas do cliente para configurar o produto.",
        questions: productQuestions,
      },
    };

    addProduct(newProductWithDefaults);

    resetProductForm();
    setIsProductSheetOpen(false);
  };

  const resetProductForm = () => {
    setProductFormTab("info");
    setProductFormData({
      productId: "",
      name: "",
      category: "",
      categories: [],
      subcategories: [],
      tags: [],
      recurrence: "",
      price: "",
      deliveryDays: "",
      isActive: true,
      exigeAprovacaoCliente: true,
      productImage: null,
      productImagePreview: "",
      presentation: "",
      deliveryVideoUrl: "",
      benefits: "",
      information: "",
      descriptionAttention: "",
      summaryDescription: "",
      includedItems: [],
      notIncludedItems: [],
      complementaryProducts: [],
      requestAttention: "",
      oneTimeContract: "",
      monthlyContract: "",
      previousContracts: "",
      status: "Ativo",
      associatedTaskModels: [],
      // Resetting fields added for editing
      description: "",
      // Resetting questionnaire and tasks
      questionnaire: { title: "", description: "" },
      tasks: [],
      excludedItems: [],
    });
    setAdditionalImages([]);
    setPortfolioImages([]);
    setProductQuestions([]);
    setCustomTagInput("");
    // Resetting customization options
    setProductVariations([]);
    setProductAddOns([]);
    setProductTasks([]); // Reset tasks
  };

  const handleOpenProductSheet = () => {
    resetProductForm();
    setSelectedProduct(null); // Ensure we are in create mode
    setIsProductSheetOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProductFormData({
          ...productFormData,
          productImage: file,
          productImagePreview: ev.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setAdditionalImages([...additionalImages, ...newImages]);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      if (!productFormData.tags.includes(customTagInput.trim())) {
        setProductFormData({
          ...productFormData,
          tags: [...productFormData.tags, customTagInput.trim()],
        });
      }
      setCustomTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setProductFormData({
      ...productFormData,
      tags: productFormData.tags.filter((t) => t !== tag),
    });
  };

  const toggleSubcategory = (subcategory: string) => {
    setProductFormData({
      ...productFormData,
      subcategories: productFormData.subcategories.includes(subcategory)
        ? productFormData.subcategories.filter((s) => s !== subcategory)
        : [...productFormData.subcategories, subcategory],
    });
  };

  const handleEditPrice = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (priceEditPassword === "123") {
      setShowPasswordModal(false);
      setPriceEditPassword("");
      // Price input is now editable
      const priceInput = document.querySelector(
        'input[value*="R$"]',
      ) as HTMLInputElement;
      if (priceInput) {
        priceInput.removeAttribute("readOnly");
        priceInput.classList.remove("bg-green-50", "dark:bg-green-950/20");
        priceInput.classList.add("bg-white", "dark:bg-background");
        priceInput.focus();
      }
    } else {
      alert("Senha incorreta!");
      setPriceEditPassword("");
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question: "",
      type: "text",
      required: false,
      aiAssisted: false,
      allowsAttachment: false,
      options: [], // Initialize options
    };
    setProductQuestions([...productQuestions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setProductQuestions(
      productQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  };

  const removeQuestion = (id: string) => {
    setProductQuestions(productQuestions.filter((q) => q.id !== id));
  };

  const addVariation = () => {
    const newVariation = {
      id: `var-${Date.now()}`,
      name: "",
      description: "",
      price: 0,
      priceModifier: 0,
      deadlineDays: undefined,
      scopeDescription: "",
      features: [],
      sortOrder: productVariations.length + 1,
      isActive: true,
    };
    setProductVariations([...productVariations, newVariation]);
  };

  const updateVariation = (
    id: string,
    updates: Partial<(typeof productVariations)[0]>,
  ) => {
    setProductVariations(
      productVariations.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    );
  };

  const removeVariation = (id: string) => {
    setProductVariations(productVariations.filter((v) => v.id !== id));
  };

  const addAddOn = () => {
    const newAddOn = {
      id: `addon-${Date.now()}`,
      name: "",
      price: 0,
      category: "extra" as const,
    };
    setProductAddOns([...productAddOns, newAddOn]);
  };

  const updateAddOn = (
    id: string,
    updates: Partial<(typeof productAddOns)[0]>,
  ) => {
    setProductAddOns(
      productAddOns.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };

  const removeAddOn = (id: string) => {
    setProductAddOns(productAddOns.filter((a) => a.id !== id));
  };

  const handleSaveProduct = async () => {
    setIsSavingProduct(true);
    try {
      if (selectedProduct) {
        // Edit existing product
        await updateProduct(selectedProduct.id, {
          // Pass selectedProduct.id to updateProduct
          ...selectedProduct, // Start with existing selected product
          ...productFormData, // Override with form data
          price: Number.parseFloat(productFormData.price),
          deliveryDays: effectiveDeliveryDays,
          additionalImages,
          portfolioImages,
          demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
          questions: productQuestions,
          variations: productVariations,
          addOns: productAddOns,
          tasks: productTasks, // Use the tasks from the form state
          // Ensure other necessary fields are updated as well
          name: productFormData.name,
          presentation: buildPresentationPayload(
            (selectedProduct as any)?.presentation,
            productFormData.presentation,
            presentationDraft,
          ),
          benefits: productFormData.benefits,
          information: productFormData.information,
          description: productFormData.description,
          category: productFormData.categories[0] || productFormData.category,
          categories: productFormData.categories,
          subcategories: productFormData.subcategories,
          image: productFormData.productImagePreview,
          productImagePreview: productFormData.productImagePreview,
          deliveryVideoUrl: productFormData.deliveryVideoUrl,
          tags: productFormData.tags,
          recurrence: productFormData.recurrence,
          complementaryProductIds: productFormData.complementaryProducts,
          requestAttention: productFormData.requestAttention,
          oneTimeContract: productFormData.oneTimeContract,
          monthlyContract: productFormData.monthlyContract,
          previousContracts: productFormData.previousContracts,
          status: productFormData.status,
          associatedTaskModels: productFormData.associatedTaskModels,
          isActive: productFormData.isActive, // Assuming isActive is part of productFormData
          exigeAprovacaoCliente: productFormData.exigeAprovacaoCliente,
          // Include questionnaire and tasks from form state
          questionnaire: {
            ...(productFormData.questionnaire as any),
            title: (productFormData.questionnaire as any)?.title || "Questionário do Produto",
            description:
              (productFormData.questionnaire as any)?.description ||
              "Respostas do cliente para configurar o produto.",
            questions: productQuestions,
          },
          excludedItems: productFormData.excludedItems,
          updatedAt: new Date().toISOString(),
          // `price` aqui é legado desta tela: o backend grava base_price a
          // partir de finalPrice (ver product-adapter). O tipo local de
          // Product já o declara, então a conversão só evita o erro de
          // propriedade desconhecida no literal.
        } as Product);
        toast({
          title: "Sucesso",
          description: "Produto atualizado com sucesso!",
        });
      } else {
        // Create new product
        // Call handleCreateProduct which already has the logic for new products
        await handleCreateProduct();
        toast({
          title: "Sucesso",
          description: "Produto criado com sucesso!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao salvar produto",
        description: err?.message || "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProduct(false);
    }
    setIsProductSheetOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setProductFormTab("info");
    setProductFormData({
      productId: "",
      name: "",
      category: "",
      categories: [],
      subcategories: [],
      tags: [],
      recurrence: "",
      price: "",
      deliveryDays: "",
      isActive: true,
      exigeAprovacaoCliente: true,
      productImage: null,
      productImagePreview: "",
      presentation: "",
      deliveryVideoUrl: "",
      benefits: "",
      information: "",
      descriptionAttention: "",
      summaryDescription: "",
      includedItems: [],
      notIncludedItems: [],
      complementaryProducts: [],
      requestAttention: "",
      oneTimeContract: "",
      monthlyContract: "",
      previousContracts: "",
      status: "Ativo",
      associatedTaskModels: [],
      // Fields from updates for editing
      description: "",
      // Resetting questionnaire and tasks
      questionnaire: { title: "", description: "" },
      tasks: [],
      excludedItems: [],
    });
    setAdditionalImages([]);
    setPortfolioImages([]);
    setProductQuestions([]);
    setProductVariations([]);
    setProductAddOns([]);
    setProductTasks([]); // Reset tasks as well
    setPresentationDraft({
      highlights: [],
      targetAudience: [],
      whatIsIncluded: [],
      deliverables: [],
      notIncluded: [],
      requirements: [],
      howToRequest: [],
      faq: [],
    });
  };

  const handleSaveDraft = () => {
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha pelo menos o nome do produto");
      return;
    }

    const _draftPrimaryCategory = productFormData.categories[0] || productFormData.category || "Sem categoria";
    const generatedId = generateProductId(_draftPrimaryCategory);

    const draftProduct: Product = {
      id: generatedId,
      name: productFormData.name,
      description:
        productFormData.summaryDescription ||
        productFormData.benefits ||
        "Rascunho",
      category: _draftPrimaryCategory,
      categories: productFormData.categories.length ? productFormData.categories : [_draftPrimaryCategory],
      isActive: false,
      exigeAprovacaoCliente: productFormData.exigeAprovacaoCliente,
      tasks: [], // Drafts might not have tasks yet, or they could be saved separately
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTasksCost: 0,
      qualificationFee: 0,
      subtotal: 0,
      taxes: 0,
      operationalFee: 0,
      partnerCommission: 0,
      finalPrice: Number.parseFloat(productFormData.price) || 0,
      // Populate other fields as needed for draft
      price: Number.parseFloat(productFormData.price) || 0,
      deliveryDays: effectiveDeliveryDays,
      image: productFormData.productImagePreview,
      productImagePreview: productFormData.productImagePreview,
      deliveryVideoUrl: productFormData.deliveryVideoUrl,
      presentation: buildPresentationPayload(
        null,
        productFormData.presentation,
        presentationDraft,
      ),
      benefits: productFormData.benefits,
      information: productFormData.information,
      descriptionAttention: productFormData.descriptionAttention,
      summaryDescription: productFormData.summaryDescription,
      includedItems: productFormData.includedItems,
      notIncludedItems: productFormData.notIncludedItems,
      complementaryProductIds: productFormData.complementaryProducts,
      requestAttention: productFormData.requestAttention,
      oneTimeContract: productFormData.oneTimeContract,
      monthlyContract: productFormData.monthlyContract,
      previousContracts: productFormData.previousContracts,
      status: "Inativo", // Drafts are typically inactive
      associatedTaskModels: productFormData.associatedTaskModels,
      recurrence: productFormData.recurrence,
      subcategories: productFormData.subcategories,
      tags: productFormData.tags,
      questions: productQuestions,
      additionalImages: additionalImages,
      portfolioImages: portfolioImages,
      demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
      variations: productVariations,
      addOns: productAddOns,
      questionnaire: {
        ...(productFormData.questionnaire as any),
        title: (productFormData.questionnaire as any)?.title || "Rascunho Questionário",
        description:
          (productFormData.questionnaire as any)?.description ||
          "Questionário para configurar o produto.",
        questions: productQuestions,
      },
    };

    addProduct(draftProduct);
    resetProductForm();
    setIsProductSheetOpen(false);
  };

  const handleScheduleLaunch = () => {
    if (!activationDate) {
      alert("Por favor, defina a data de ativação");
      return;
    }

    // Here you would likely want to call handleSaveProduct() first,
    // then potentially set the activation/deactivation dates on the product
    // or queue it for a scheduled activation.
    // For now, we'll assume handleCreateProduct or handleUpdateProduct is called within handleSaveProduct.
    handleSaveProduct(); // Ensure product is saved first

    // Then handle scheduling logic
    // ... (actual scheduling logic would go here)

    setShowScheduling(false);
    setActivationDate("");
    setDeactivationDate("");
  };

  const handleImportTemplate = (template: any) => {
    setSelectedTemplateToImport(template);
    setShowImportModeDialog(true);
    setShowImportTemplateModal(false);
  };

  // Updated confirmImportTemplate to use productFormData for tasks
  const confirmImportTemplate = (mode: "linked" | "copy") => {
    if (!selectedTemplateToImport) return;

    const newTask: Task = {
      id: Date.now().toString(),
      code:
        mode === "linked"
          ? selectedTemplateToImport.id
          : `AUTO-GERADO-${Date.now()}`,
      name: selectedTemplateToImport.name,
      specialty: selectedTemplateToImport.category || "",
      executionTime: selectedTemplateToImport.estimated_hours || 0,
      executionDeadline: 0,
      deliveryDeadline: 0,
      adjustmentDeadline: 0,
      approvalDeadline: 0,
      automaticValue: selectedTemplateToImport.base_price || 0,
      order: (productFormData.tasks || []).length + 1,
      canRunInParallel: false, // Default value
      attentionText: "",
      pop: "",
      complementaryFiles: [],
      verificationItems: [],
      isLinkedToTemplate: mode === "linked",
      templateId: mode === "linked" ? selectedTemplateToImport.id : null,
      steps: [],
      description: selectedTemplateToImport.description || "",
      calculatedCost: 0,
      dependencies: [],
      keepNextStepWithNomadLeader: false,
      delegateToLeader: false,
      liberateAfterSend: false,
      requireFinalFiles: false,
      isInternalStep: false,
      concludeOnRejection: false,
      hideFromClient: false,
      hasVariations: false,
      noConditions: false,
      showAccess: false,
      hideInProducts: false,
      dontCountDeadline: false,
      dontCountValue: false,
      hasAdditionals: false,
      // For linked tasks, we need to map steps from the template
      // For copied tasks, steps will be initially empty and can be added
      ...(mode === "linked" && { steps: selectedTemplateToImport.steps || [] }),
    };

    setProductFormData({
      ...productFormData,
      tasks: [...(productFormData.tasks || []), newTask],
    });

    setShowImportModeDialog(false);
    setSelectedTemplateToImport(null);
  };

  // Renamed to toggleConfirmation for clarity
  const handleToggleProductStatus = (product: Product, newStatus: boolean) => {
    setToggleConfirmation({ product, newStatus });
  };

  const confirmToggleStatus = async () => {
    if (!toggleConfirmation.product) return;

    try {
      if (toggleConfirmation.newStatus) {
        const summary = getContractabilitySummary(toggleConfirmation.product);
        if (summary && !summary.isContractable) {
          toast({
            title: "Produto sem tarefas",
            description:
              "Cadastre pelo menos 1 modelo de tarefa operacional ativo antes de ativar este produto.",
            variant: "destructive",
          });
          return;
        }

        if (!summary) {
          const catalogTasks = await apiClient.getCatalogTasksByProduct(
            toggleConfirmation.product.id,
          );

          if (!Array.isArray(catalogTasks) || catalogTasks.length === 0) {
            toast({
              title: "Produto sem tarefas",
              description:
                "Cadastre pelo menos 1 modelo de tarefa operacional ativo antes de ativar este produto.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Call updateProduct with (id, product) signature
      await updateProduct(toggleConfirmation.product.id, {
        ...toggleConfirmation.product,
        isActive: toggleConfirmation.newStatus,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Sucesso",
        description: `Produto ${toggleConfirmation.newStatus ? "ativado" : "desativado"} com sucesso`,
      });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do produto",
        variant: "destructive",
      });
    } finally {
      setToggleConfirmation({ product: null, newStatus: false });
    }
  };

  // Calculate active filters count for display
  const activeFiltersCount = [
    filterCategories.length > 0,
    filterAreas.length > 0,
    // "active" é o padrão da tela, não conta como filtro aplicado.
    filterStatus !== "active",
    sortBy !== "name",
  ].filter(Boolean).length;

  // Shared numbered-pagination control (brand gradient on the active page +
  // a "Pág./Ir" jump field), reused identically by the top and bottom
  // toolbar mirrors — same recipe as admin/clientes' PaginationControls.
  const PaginationControls = () => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((page, index) =>
        page === "..." ? (
          <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
        ) : (
          <button
            key={index}
            onClick={() => setCurrentPage(Number(page))}
            title={page === currentPage ? "Página atual" : `Ir para a página ${page}`}
            className={`h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors ${
              page === currentPage
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
            style={page === currentPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        title="Próxima página"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitPageJump(); }}
                placeholder="Pág."
                aria-label="Ir para a página"
                className="h-7 w-14 text-xs text-center rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={commitPageJump}
                disabled={!pageJumpValue}
                className="group relative h-7 px-2.5 rounded-[8px] text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                />
                <span className="relative z-10 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors">Ir</span>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Ir diretamente para uma página</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const ProductCountText = () => (
    <span className="text-xs text-slate-400 whitespace-nowrap">
      {filteredProducts.length !== safeProducts.length ? (
        <>
          de{" "}
          <span className="font-semibold text-blue-500">{filteredProducts.length}</span>{" "}
          de {safeProducts.length} produto
          {safeProducts.length !== 1 ? "s" : ""}
        </>
      ) : (
        <>
          de{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {safeProducts.length}
          </span>{" "}
          produto{safeProducts.length !== 1 ? "s" : ""}
        </>
      )}
    </span>
  );

  if (productsLoading) {
    return <PageLoader text="Carregando produtos…" />;
  }

  if (productsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar produtos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {productsError}
          </p>
        </div>
        <Button onClick={refetchProducts} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const _editStages = (selectedProduct as any)?.stages;
  const _hasEditStages = Array.isArray(_editStages) && _editStages.length > 0;
  const _autoDeliveryDays = _hasEditStages
    ? Math.max(...(_editStages as any[]).map((s: any) => s.deliveryDeadlineDays || 0))
    : null;
  const effectiveDeliveryDays = _autoDeliveryDays ?? (Number.parseInt(productFormData.deliveryDays) || 0);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="relative h-full min-h-0 flex flex-col">
    <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Package}
        title="Cadastro de Produtos"
        description="Cadastre, edite e organize os produtos e serviços da plataforma"
        actions={
          <>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleOpenProductSheet}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Novo Produto
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar novo produto</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PinToTrayButton id="page-produtos" label="Cadastro de Produtos" icon={Package} path="/admin/produtos" />
          </>
        }
      />
    </div>

    <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="space-y-3">
      {/* ── Abas-filtro rápido — substituem os cards de KPI; clicar filtra a
          tabela abaixo direto, sem precisar abrir o painel de Filtros. ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden mb-1">
        <div className="flex items-center flex-wrap">
          {(
            [
              {
                key: "all",
                label: "Todos os produtos",
                icon: Package,
                count: safeProducts.length,
                active: filterStatus === "all" && !quickFilterTasksOnly,
                onClick: () => {
                  setFilterStatus("all");
                  setQuickFilterTasksOnly(false);
                },
              },
              {
                key: "active",
                label: "Ativos",
                icon: CheckCircle2,
                count: safeProducts.filter((p) => p.isActive).length,
                active: filterStatus === "active" && !quickFilterTasksOnly,
                onClick: () => {
                  setFilterStatus("active");
                  setQuickFilterTasksOnly(false);
                },
              },
              {
                key: "with_tasks",
                label: "Com tarefas",
                icon: ListChecks,
                count: safeProducts.filter((p) => (p.tasks || []).length > 0).length,
                active: quickFilterTasksOnly,
                onClick: () => {
                  setQuickFilterTasksOnly(true);
                  setFilterStatus("all");
                },
              },
              {
                key: "categories",
                label: "Categorias",
                icon: Layers,
                count: uniqueCategories.length,
                active: false,
                onClick: () => setIsFilterModalOpen(true),
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={tab.onClick}
              className={`relative flex items-center gap-2 px-4 h-14 text-sm font-medium border-r border-slate-100 dark:border-slate-800 last:border-r-0 transition-colors ${
                tab.active
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span
                className={`ml-0.5 h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  tab.active
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
              <span
                className={`absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 transition-transform origin-left ${
                  tab.active ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Row 1 — search + Filtros + view-mode switch */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          {/* Search */}
          <div className="flex-1 relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Filters button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className={`h-9 gap-2 px-3.5 text-xs flex-shrink-0 ${activeFiltersCount > 0 ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Ordenar */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-auto gap-1.5 text-xs shrink-0 border-slate-200 dark:border-slate-700">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Ordenar: Nome</SelectItem>
              <SelectItem value="price-asc">Ordenar: Preço ↑</SelectItem>
              <SelectItem value="price-desc">Ordenar: Preço ↓</SelectItem>
              <SelectItem value="id">Ordenar: ID</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
            {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "itens"}
          </span>

          {/* View mode selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
            {PROD_GRID_MODES.map(({ value, label, Icon }) => (
              <button
                key={String(value)}
                type="button"
                title={label}
                onClick={() => setGridMode(value)}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                  gridMode === value
                    ? "bg-white dark:bg-slate-700 shadow-sm"
                    : "hover:bg-white/60 dark:hover:bg-slate-700/60"
                }`}
              >
                <Icon active={gridMode === value} />
              </button>
            ))}
          </div>
        </div>

        {/* Row 2 (top) — items-per-page + count + numbered pagination (mirrored at the bottom) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              variant="top"
            />
            <ProductCountText />
          </div>
          {totalPages > 1 && <PaginationControls />}
        </div>

        {/* Products content */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-5 shadow-sm">
              <Package className="h-9 w-9 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md text-sm leading-relaxed">
              {searchTerm || activeFiltersCount > 0
                ? "Tente ajustar os filtros ou busca para encontrar o que procura."
                : "Comece criando seu primeiro produto para gerenciar seu catálogo."}
            </p>
            {!(searchTerm || activeFiltersCount > 0) && (
              <Button
                onClick={handleOpenProductSheet}
                className="btn-brand gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Produto
              </Button>
            )}
          </div>
        ) : gridMode === "list" ? (
          /* ── LIST VIEW — tabela com checkbox + seleção em lote ── */
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          paginatedProducts.length > 0 &&
                          paginatedProducts.every((p) => selectedProductIds.has(p.id))
                        }
                        onChange={(e) => {
                          setSelectedProductIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              paginatedProducts.forEach((p) => next.add(p.id));
                            } else {
                              paginatedProducts.forEach((p) => next.delete(p.id));
                            }
                            return next;
                          });
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                    </th>
                    <th className="py-3 px-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] w-16">ID</th>
                    <th className="py-3 px-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">Produto</th>
                    <th className="py-3 px-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] hidden sm:table-cell">Categoria</th>
                    <th className="py-3 px-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] hidden md:table-cell">Tarefas e tempo</th>
                    <th className="py-3 px-2 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">Preço</th>
                    <th className="py-3 px-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">Status</th>
                    <th className="py-3 px-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(product.id)}
                          onChange={(e) => {
                            setSelectedProductIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(product.id);
                              else next.delete(product.id);
                              return next;
                            });
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300"
                        />
                      </td>
                      {/* ID sequencial da plataforma (prod_1, prod_2, …) — mesma
                          ideia da coluna de código em usuários/empresas. Todo
                          produto tem o seu; o `id` técnico (cuid) nunca aparece. */}
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                            {productCodeToNum((product as any).productCode) ?? "—"}
                          </span>
                          {/* Produto consolidado veio de várias entradas antigas:
                              mostra todas, senão não dá pra achar a origem. */}
                          <LegacyIdBadge
                            legacyIds={(product as any).legacyIds}
                            legacyId={(product as any).legacyId}
                            entidade="produto"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {product.productImagePreview || (product as any).image ? (
                              <img
                                src={product.productImagePreview || (product as any).image}
                                alt={product.name}
                                className="h-10 w-10 rounded-xl object-cover border shadow-sm"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                                <Package className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                                product.isActive ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-semibold truncate leading-tight">
                                {product.name}
                              </p>
                              {/* O código agora tem coluna própria; aqui fica só
                                  o código legível por categoria, quando existe. */}
                              {(product as any).internalCode && (
                                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                                  {(product as any).internalCode}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                              {product.description || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        {((product as any).categories?.length ? (product as any).categories : [product.category])
                          .filter(Boolean)
                          .slice(0, 1)
                          .map((cat: string) => (
                            <NeonBadge key={cat} color={getCategoryBadgeColor(cat)}>
                              {cat}
                            </NeonBadge>
                          ))}
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5" />
                            {(product.tasks || []).length} tarefas
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {getTotalHours(product)}h
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-[13px] font-bold text-emerald-600 whitespace-nowrap">
                          {formatCurrency(product.finalPrice || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={product.isActive}
                            disabled={!canActivateProduct(product) && !product.isActive}
                            onCheckedChange={(checked) => handleToggleProductStatus(product, checked)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span
                            className={`text-[11px] font-medium hidden lg:block ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                          >
                            {product.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider delayDuration={400}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleViewProduct(product)}
                                  className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs font-medium">Ver detalhes</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider delayDuration={400}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs font-medium">Editar produto</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Barra de seleção em lote */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedProductIds.size} selecionado{selectedProductIds.size !== 1 ? "s" : ""}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedProductIds.size === 0}
                    className="h-7 text-xs gap-1"
                  >
                    Ações em lote
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={async () => {
                      let skipped = 0;
                      for (const id of selectedProductIds) {
                        const p = safeProducts.find((pr) => pr.id === id);
                        if (!p || p.isActive) continue;
                        const summary = getContractabilitySummary(p);
                        if (summary && !summary.isContractable) {
                          skipped++;
                          continue;
                        }
                        await updateProduct(p.id, {
                          ...p,
                          isActive: true,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                      setSelectedProductIds(new Set());
                      toast({
                        title: "Produtos ativados",
                        description: skipped
                          ? `${skipped} produto(s) sem tarefas vinculadas não foram ativados.`
                          : undefined,
                      });
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                    Ativar selecionados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      for (const id of selectedProductIds) {
                        const p = safeProducts.find((pr) => pr.id === id);
                        if (!p || !p.isActive) continue;
                        await updateProduct(p.id, {
                          ...p,
                          isActive: false,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                      setSelectedProductIds(new Set());
                      toast({ title: "Produtos desativados" });
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    Desativar selecionados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          /* ── GRID VIEW ── */
          <div className="p-4">
            <div className={getProdGridClass(gridMode)}>
              {paginatedProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border ${
                    product.isActive
                      ? "border-slate-200/80 dark:border-slate-700/60"
                      : "border-slate-200/80 dark:border-slate-700/60 opacity-80"
                  }`}
                >
                  {/* Cover image area */}
                  <div className="relative h-32 overflow-hidden">
                    {product.productImagePreview || (product as any).image ? (
                      <img
                        src={
                          product.productImagePreview || (product as any).image
                        }
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
                        <Package className="h-12 w-12 text-white/15" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent" />
                    {/* Top: ID + Status */}
                    <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-black/50 backdrop-blur-sm text-white/90 px-2 py-0.5 rounded-md tracking-wide border border-white/10">
                        {(product as any).productCode || product.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
                          product.isActive
                            ? "bg-emerald-500/85 text-white border-emerald-400/30"
                            : "bg-slate-600/75 text-white/80 border-white/10"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${product.isActive ? "bg-white" : "bg-white/50"}`}
                        />
                        {product.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {/* Bottom: recurrence + price */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                      {(product as any).recurrence && (
                        <span className="text-[10px] font-medium bg-black/45 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-md">
                          {(product as any).recurrence}
                        </span>
                      )}
                      <span className="ml-auto text-sm font-bold bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg border border-white/10">
                        {formatCurrency(product.finalPrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 pt-3.5 pb-3">
                    <h3 className="font-semibold text-[15px] leading-snug truncate text-slate-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {(product as any).summaryDescription ||
                        product.description ||
                        "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          product.productType === "pacote"
                            ? "text-[10px] font-medium px-2 py-0.5 text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400"
                            : "text-[10px] font-medium px-2 py-0.5 text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300"
                        }
                      >
                        {product.productType === "pacote"
                          ? `Pacote (${product.activeTaskTemplates ?? 0} tarefas)`
                          : "Único"}
                      </Badge>
                      {((product as any).categories?.length ? (product as any).categories : [product.category]).filter(Boolean).map((cat: string) => (
                        <Badge key={cat} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                          {cat}
                        </Badge>
                      ))}
                      {((product as any).tags || [])
                        .slice(0, 2)
                        .map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] font-normal px-2 py-0.5 text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <TooltipProvider>
                    <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {(product.tasks || []).length}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Tarefas
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tarefas de execução vinculadas a este produto</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {getTotalHours(product)}h
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Horas Est.
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Total de horas estimadas para entregar este produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {(product as any).deliveryDays
                                ? `${(product as any).deliveryDays}d`
                                : "—"}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Entrega
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prazo de entrega do produto em dias corridos</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>

                  {/* Actions row */}
                  <TooltipProvider>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={product.isActive}
                              disabled={!canActivateProduct(product) && !product.isActive}
                              onCheckedChange={(checked) =>
                                handleToggleProductStatus(product, checked)
                              }
                              className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                            <span
                              className={`text-xs font-medium ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {product.isActive
                              ? "Clique para desativar o produto"
                              : "Clique para ativar o produto"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              className="h-8 px-3 text-xs gap-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver todos os detalhes do produto</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="h-8 px-3 text-xs gap-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Abrir formulário de edição</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TooltipProvider>

                  {/* Tasks Accordion */}
                  <div className="px-4 pb-3 border-t">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="tasks" className="border-0">
                        <AccordionTrigger className="py-2 hover:no-underline text-xs font-medium text-muted-foreground hover:text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            Tarefas e etapas ({(product.tasks || []).length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="space-y-2 pt-1">
                            {(product.tasks || []).map((task, index) => (
                              <div
                                key={task.id}
                                className="border rounded-lg p-3 space-y-2 bg-muted/20"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                                        {index + 1}
                                      </span>
                                      <h4 className="font-medium text-sm">
                                        {task.name}
                                      </h4>
                                      {task.canRunInParallel && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Paralela
                                        </Badge>
                                      )}
                                      {task.taskCategory && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400"
                                        >
                                          {task.taskCategory}
                                        </Badge>
                                      )}
                                      <Badge className="text-xs bg-emerald-100 text-emerald-800 border-0">
                                        {formatCurrency(task.calculatedCost)}
                                      </Badge>
                                    </div>
                                    {task.objective && (
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 ml-7 leading-snug">
                                        🎯 {task.objective}
                                      </p>
                                    )}
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 ml-7 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    {(task.condition ||
                                      task.requiresAccess !== undefined) && (
                                      <div className="flex items-center gap-2 mt-1.5 ml-7 flex-wrap">
                                        {task.condition && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                            Condição: {task.condition}
                                          </span>
                                        )}
                                        {task.requiresAccess !== undefined && (
                                          <span
                                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${task.requiresAccess ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}`}
                                          >
                                            {task.requiresAccess
                                              ? "🔐 Requer acessos"
                                              : "✓ Sem acessos externos"}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {(task.executionRules || []).length > 0 && (
                                      <div className="mt-2 ml-7 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                          Regras de execução
                                        </p>
                                        <ul className="space-y-0.5">
                                          {(task.executionRules || []).map(
                                            (rule, rIdx) => (
                                              <li
                                                key={rIdx}
                                                className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                                              >
                                                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                                                {rule}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="h-7 w-7 p-0 flex-shrink-0"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {(task.dependencies || []).length > 0 && (
                                  <div className="flex items-center gap-2 ml-7">
                                    <Badge
                                      className={`text-xs ${getDependencyBadgeColor(task.dependencies)}`}
                                    >
                                      Depende de {task.dependencies.length}{" "}
                                      tarefa(s)
                                    </Badge>
                                  </div>
                                )}

                                <div className="ml-7 space-y-1">
                                  {(task.steps || []).map((step) => {
                                    const specialty = specialties.find(
                                      (s) => s.id === step.specialty,
                                    );
                                    return (
                                      <div
                                        key={step.id}
                                        className="flex flex-col gap-1 p-2 bg-background rounded-md border text-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="font-semibold text-muted-foreground flex-shrink-0">
                                              {step.order}.
                                            </span>
                                            <span className="truncate">
                                              {step.name}
                                            </span>
                                            {specialty && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs flex-shrink-0"
                                              >
                                                {specialty.name}
                                              </Badge>
                                            )}
                                            {step.experienceLevel && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs flex-shrink-0"
                                              >
                                                {step.experienceLevel}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-muted-foreground">
                                              {step.estimatedHours}h
                                            </span>
                                            <span className="font-semibold text-emerald-600">
                                              {formatCurrency(
                                                step.calculatedCost,
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        {step.internalGuidance && (
                                          <p className="text-[11px] text-muted-foreground pl-4 italic border-l-2 border-slate-200 dark:border-slate-700 ml-1">
                                            {step.internalGuidance}
                                          </p>
                                        )}
                                        {step.levelRates && (
                                          <div className="flex items-center gap-2 pl-4 mt-0.5 flex-wrap">
                                            {Object.entries(
                                              step.levelRates,
                                            ).map(([lvl, val]) => (
                                              <span
                                                key={lvl}
                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                              >
                                                {lvl}: {formatCurrency(val)}/h
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {task.questionnaire && (
                                  <div className="ml-7 pt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs bg-transparent h-7 gap-1"
                                      onClick={() => {
                                        setSelectedQuestionnaire(
                                          task.questionnaire,
                                        );
                                        setIsQuestionnaireModalOpen(true);
                                      }}
                                    >
                                      <FileQuestion className="h-3 w-3" />
                                      Questionário (
                                      {task.questionnaire.questions.length}{" "}
                                      perguntas)
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Stages Accordion */}
                  {((product as any).stages || []).length > 0 && (
                    <div className="px-4 pb-3 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="stages" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline text-xs font-medium text-muted-foreground hover:text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              Etapas de execução (
                              {((product as any).stages || []).length})
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-0">
                            <div className="space-y-1.5 pt-1">
                              {((product as any).stages || []).map(
                                (stage: any) => (
                                  <div
                                    key={stage.id}
                                    className={`rounded-lg border p-3 space-y-2 ${stage.isInternal ? "bg-slate-50 dark:bg-slate-800/60 border-dashed" : "bg-muted/20"}`}
                                  >
                                    {/* Stage header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-bold flex-shrink-0">
                                          {stage.number}
                                        </span>
                                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                          {stage.code}
                                        </span>
                                        <h4 className="font-medium text-sm leading-tight">
                                          {stage.name}
                                        </h4>
                                        {stage.isInternal && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] border-slate-300 text-slate-500 dark:text-slate-400 flex-shrink-0"
                                          >
                                            Interna
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-violet-200 bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400 flex-shrink-0"
                                        >
                                          {stage.category}
                                        </Badge>
                                        <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-0 flex-shrink-0">
                                          {formatCurrency(stage.value)}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Stage description */}
                                    {stage.description && (
                                      <p className="text-xs text-muted-foreground ml-7 line-clamp-2">
                                        {stage.description}
                                      </p>
                                    )}

                                    {/* Stage metrics */}
                                    <div className="flex items-center gap-3 ml-7 flex-wrap">
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {stage.executionHours}h execução
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <ChevronRight className="h-3 w-3" />
                                        Entrega em {stage.deliveryDeadlineDays}d
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Package className="h-3 w-3" />
                                        Limite: {stage.itemLimit}
                                      </span>
                                    </div>

                                    {/* Flags */}
                                    <div className="flex items-center gap-1.5 ml-7 flex-wrap">
                                      {stage.viewAccesses && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                                          🔐 Visualiza acessos
                                        </span>
                                      )}
                                      {stage.keepSameNomad && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
                                          👤 Mesmo nômade
                                        </span>
                                      )}
                                      {stage.delegateToLeader && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                          🎯 Delegar ao líder
                                        </span>
                                      )}
                                      {stage.requiresFinalFiles && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                          📎 Requer arquivos finais
                                        </span>
                                      )}
                                      {stage.hideInProducts && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                          👁 Oculto no catálogo
                                        </span>
                                      )}
                                    </div>

                                    {/* Internal guidance */}
                                    {stage.internalGuidance && (
                                      <div className="ml-7 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                                          Orientação interna
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                                          {stage.internalGuidance}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Row 3 — bottom mirror of Row 2 (items-per-page + count + pagination) */}
        {filteredProducts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
                variant="bottom"
              />
              <ProductCountText />
            </div>
            {totalPages > 1 && <PaginationControls />}
          </div>
        )}
      </Card>


      {/* Advanced Filters Modal */}
      {isFilterModalOpen &&
        (() => {
          const allFilterFields = [
            { id: "categoria", label: "Categoria", section: "produto" },
            { id: "area", label: "Área", section: "produto" },
            { id: "status", label: "Status", section: "produto" },
            { id: "ordenar", label: "Ordenar por", section: "produto" },
          ];
          const has = (id: string) => visibleFields.includes(id);
          const handleDrop = (targetId: string) => {
            if (!draggingFilterId || draggingFilterId === targetId) return;
            const from = savedFilters.findIndex(
              (f) => f.id === draggingFilterId,
            );
            const to = savedFilters.findIndex((f) => f.id === targetId);
            if (from === -1 || to === -1) return;
            const reordered = [...savedFilters];
            const [moved] = reordered.splice(from, 1);
            reordered.splice(to, 0, moved);
            setSavedFilters(reordered);
            setDraggingFilterId(null);
            setDragOverFilterId(null);
          };
          const clearFilters = () => {
            setFilterCategories([]);
            setFilterAreas([]);
            // Volta ao padrão da tela (só ativos), não a "todos".
            setFilterStatus("active");
            setSortBy("name");
            setCurrentPage(1);
          };
          const applyAndClose = () => {
            setCurrentPage(1);
            setIsFilterModalOpen(false);
            setShowFieldPicker(false);
          };
          return (
            <StandardModalDialog
              open={isFilterModalOpen}
              onClose={() => {
                setIsFilterModalOpen(false);
                setSelectedFilterId(null);
                setShowFieldPicker(false);
              }}
              title="Filtros Avançados"
              subtitle="Configure e aplique filtros"
              footer={
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>
                  <div className="flex items-center gap-2">
                    {showSaveInput ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={filterNameInput}
                          onChange={(e) => setFilterNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filterNameInput.trim()) {
                              const newId = `filter-${Date.now()}`;
                              setSavedFilters([
                                ...savedFilters,
                                {
                                  id: newId,
                                  name: filterNameInput.trim(),
                                  filters: {
                                    filterCategories,
                                    filterAreas,
                                    filterStatus,
                                    sortBy,
                                  },
                                },
                              ]);
                              setSelectedFilterId(newId);
                              setShowSaveInput(false);
                              setFilterNameInput("");
                            }
                            if (e.key === "Escape") {
                              setShowSaveInput(false);
                              setFilterNameInput("");
                            }
                          }}
                          placeholder={`Filtro ${savedFilters.length + 1}`}
                          className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                        />
                        <button
                          disabled={!filterNameInput.trim()}
                          onClick={() => {
                            const newId = `filter-${Date.now()}`;
                            setSavedFilters([
                              ...savedFilters,
                              {
                                id: newId,
                                name: filterNameInput.trim(),
                                filters: {
                                  filterCategories,
                                  filterAreas,
                                  filterStatus,
                                  sortBy,
                                },
                              },
                            ]);
                            setSelectedFilterId(newId);
                            setShowSaveInput(false);
                            setFilterNameInput("");
                          }}
                          className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => {
                            setShowSaveInput(false);
                            setFilterNameInput("");
                          }}
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setFilterNameInput(
                            `Filtro ${savedFilters.length + 1}`,
                          );
                          setShowSaveInput(true);
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                      >
                        Salvar filtro
                      </button>
                    )}
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                    <button
                      onClick={() => {
                        setIsFilterModalOpen(false);
                        setShowFieldPicker(false);
                      }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={applyAndClose}
                      className="h-7 px-4 rounded-md text-[11px] font-semibold btn-brand transition-all shadow-sm"
                    >
                      Aplicar Filtros
                    </button>
                  </div>
                </div>
              }
            >
                {/* Body */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left — Saved Filters */}
                  <div className="w-44 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                      <Filter className="h-3 w-3" /> Filtros Salvos
                    </p>
                    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                      {savedFilters.length === 0 ? (
                        <div className="text-center py-8">
                          <Filter className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Nenhum filtro salvo
                          </p>
                        </div>
                      ) : (
                        savedFilters.map((filter) => (
                          <div
                            key={filter.id}
                            draggable
                            onDragStart={() => setDraggingFilterId(filter.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverFilterId(filter.id);
                            }}
                            onDrop={() => handleDrop(filter.id)}
                            onDragEnd={() => {
                              setDraggingFilterId(null);
                              setDragOverFilterId(null);
                            }}
                            onClick={() => {
                              if (editingFilterId) return;
                              setFilterCategories(
                                filter.filters.filterCategories || [],
                              );
                              setFilterAreas(filter.filters.filterAreas || []);
                              setFilterStatus(
                                filter.filters.filterStatus || "all",
                              );
                              setSortBy(filter.filters.sortBy || "name");
                              setSelectedFilterId(filter.id);
                            }}
                            className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                              dragOverFilterId === filter.id &&
                              draggingFilterId !== filter.id
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                : draggingFilterId === filter.id
                                  ? "opacity-40"
                                  : selectedFilterId === filter.id
                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                    : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                            }`}
                          >
                            <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab" />
                            {editingFilterId === filter.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingFilterName}
                                onChange={(e) =>
                                  setEditingFilterName(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (
                                    e.key === "Enter" &&
                                    editingFilterName.trim()
                                  ) {
                                    setSavedFilters(
                                      savedFilters.map((f) =>
                                        f.id === filter.id
                                          ? {
                                              ...f,
                                              name: editingFilterName.trim(),
                                            }
                                          : f,
                                      ),
                                    );
                                    setEditingFilterId(null);
                                  } else if (e.key === "Escape")
                                    setEditingFilterId(null);
                                }}
                                onBlur={() => {
                                  if (editingFilterName.trim())
                                    setSavedFilters(
                                      savedFilters.map((f) =>
                                        f.id === filter.id
                                          ? {
                                              ...f,
                                              name: editingFilterName.trim(),
                                            }
                                          : f,
                                      ),
                                    );
                                  setEditingFilterId(null);
                                }}
                                className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            ) : (
                              <span className="flex-1 truncate">
                                {filter.name}
                              </span>
                            )}
                            {editingFilterId !== filter.id && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFilterId(filter.id);
                                    setEditingFilterName(filter.name);
                                  }}
                                  className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSavedFilters(
                                      savedFilters.filter(
                                        (f) => f.id !== filter.id,
                                      ),
                                    );
                                    if (selectedFilterId === filter.id)
                                      setSelectedFilterId(null);
                                  }}
                                  className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right — Filter Fields */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Add field button */}
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <button
                          onClick={() => setShowFieldPicker(!showFieldPicker)}
                          className="text-[11px] font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Adicionar campo
                          <span className="ml-1 text-slate-400">
                            {visibleFields.length} campos ativos
                          </span>
                        </button>
                        {showFieldPicker && (
                          <div className="absolute top-6 left-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 w-44 space-y-0.5">
                            {allFilterFields.map((f) => (
                              <label
                                key={f.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors ${visibleFields.includes(f.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={visibleFields.includes(f.id)}
                                  onChange={() =>
                                    setVisibleFields((v) =>
                                      v.includes(f.id)
                                        ? v.filter((x) => x !== f.id)
                                        : [...v, f.id],
                                    )
                                  }
                                  className="accent-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {f.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CATEGORIA */}
                    {has("categoria") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Categoria
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setFilterCategories((prev) =>
                                  prev.includes(cat)
                                    ? prev.filter((x) => x !== cat)
                                    : [...prev, cat],
                                );
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filterCategories.includes(cat) ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ÁREA */}
                    {has("area") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Área
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueAreas.length === 0 ? (
                            <p className="text-[11px] text-slate-400">
                              Nenhuma área cadastrada ainda
                            </p>
                          ) : (
                            uniqueAreas.map((area) => (
                              <button
                                key={area}
                                onClick={() => {
                                  setFilterAreas((prev) =>
                                    prev.includes(area)
                                      ? prev.filter((x) => x !== area)
                                      : [...prev, area],
                                  );
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filterAreas.includes(area) ? "bg-violet-500 text-white border-violet-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300"}`}
                              >
                                {area}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* STATUS */}
                    {has("status") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Status
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "all", l: "Todos" },
                            { v: "active", l: "Ativo" },
                            { v: "inactive", l: "Inativo" },
                          ].map(({ v, l }) => (
                            <button
                              key={v}
                              onClick={() => {
                                setFilterStatus(v);
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                                filterStatus === v
                                  ? v === "active"
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : v === "inactive"
                                      ? "bg-red-500 text-white border-red-500"
                                      : "bg-blue-500 text-white border-blue-500"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ORDENAR POR */}
                    {has("ordenar") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Ordenar por
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "name", l: "Nome (A-Z)" },
                            { v: "price-asc", l: "Preço ↑" },
                            { v: "price-desc", l: "Preço ↓" },
                            { v: "id", l: "ID" },
                          ].map(({ v, l }) => (
                            <button
                              key={v}
                              onClick={() => setSortBy(v)}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${sortBy === v ? "bg-slate-700 text-white border-slate-700" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </StandardModalDialog>
          );
        })()}

      {/* ConfirmationDialog for toggling product status */}
      <ConfirmationDialog
        open={toggleConfirmation.product !== null}
        onClose={() =>
          setToggleConfirmation({ product: null, newStatus: false })
        }
        onConfirm={confirmToggleStatus}
        title={
          toggleConfirmation.newStatus ? "Ativar Produto" : "Desativar Produto"
        }
        message={
          toggleConfirmation.newStatus
            ? `Tem certeza que deseja ativar o produto "${toggleConfirmation.product?.name}"? Ele ficará visível para os clientes.`
            : `Tem certeza que deseja desativar o produto "${toggleConfirmation.product?.name}"? Ele não ficará mais visível para os clientes.`
        }
        confirmText={toggleConfirmation.newStatus ? "Ativar" : "Desativar"}
        destructive={!toggleConfirmation.newStatus}
      />

      {/* ConfirmationDialog for restoring a product version from history */}
      <ConfirmationDialog
        open={versionPendingRestore !== null}
        onClose={() => setVersionPendingRestore(null)}
        onConfirm={() => {
          if (versionPendingRestore) handleRestoreVersion(versionPendingRestore.id);
        }}
        title="Restaurar versão anterior"
        message={
          <>
            Tem certeza que deseja restaurar o produto pra como estava em{" "}
            <strong>
              {versionPendingRestore
                ? new Date(versionPendingRestore.created_at).toLocaleString("pt-BR")
                : ""}
            </strong>
            {versionPendingRestore?.name ? ` ("${versionPendingRestore.name}")` : ""}? As alterações
            feitas depois desse momento serão substituídas — mas fica salvo um novo snapshot do
            estado atual antes de restaurar, então dá pra desfazer se precisar.
          </>
        }
        confirmText="Restaurar"
        destructive
      />

      {/* ConfirmationDialog before actually saving the product form */}
      <ConfirmationDialog
        open={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={() => {
          setIsSaveConfirmOpen(false);
          handleSaveProduct();
        }}
        title="Salvar alterações"
        message={`Tem certeza que deseja salvar as alterações em "${productFormData.name || "este produto"}"? Um snapshot do estado anterior fica salvo no histórico, então dá pra reverter depois se precisar.`}
        confirmText="Salvar"
        destructive={false}
      />

      {/* ProductSheet, QuestionnaireSheet, and PricingCalculatorModal are now inline below */}

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Editar Preço Manualmente
            </DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para editar o preço do produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Digite a senha"
                value={priceEditPassword}
                onChange={(e) => setPriceEditPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O preço é calculado automaticamente com base nas tarefas,
              especialidades e custos. Apenas administradores podem editá-lo
              manualmente.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handlePasswordSubmit}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Sheet */}
      <Sheet open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <SheetContent
          side="right"
          hideOverlay
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
          }}
        >
          <ModalBrandHeader
            title="Cálculo Detalhado"
            subtitle={
              selectedProduct
                ? selectedProduct.name
                : "Breakdown de preço do produto"
            }
            icon={<Calculator />}
          />

          {selectedProduct && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero price card */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Preço Final do Produto
                  </p>
                  <p className="text-4xl font-bold">
                    {formatCurrency(selectedProduct.finalPrice)}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
                    <span>{(selectedProduct.tasks || []).length} tarefas</span>
                    <span>·</span>
                    <span>
                      {(selectedProduct.tasks || []).reduce(
                        (s, t) =>
                          s +
                          (t.steps || []).reduce(
                            (ss, st) => ss + (st.estimatedHours || 0),
                            0,
                          ),
                        0,
                      )}
                      h estimadas
                    </span>
                    <span>·</span>
                    <span>
                      Custo base{" "}
                      {formatCurrency(selectedProduct.totalTasksCost)}
                    </span>
                  </div>
                </div>

                {/* Tasks & Steps breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Custos por Tarefa e Etapa
                  </h3>
                  {(selectedProduct.tasks || []).map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className="border rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {task.order || taskIndex + 1}
                          </span>
                          <span className="font-medium text-sm">
                            {task.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(task.calculatedCost)}
                        </span>
                      </div>
                      <div className="divide-y">
                        {(task.steps || []).map((step) => {
                          const specialty = specialties.find(
                            (s) => s.id === step.specialty,
                          );
                          const hourlyRate =
                            specialty && step.experienceLevel
                              ? specialty.rates[step.experienceLevel]
                              : 0;
                          return (
                            <div
                              key={step.id}
                              className="flex items-center justify-between px-4 py-2.5 text-sm"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                                <span className="text-xs text-muted-foreground w-5 shrink-0">
                                  {step.order}.
                                </span>
                                <span className="truncate">{step.name}</span>
                                {specialty && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                  >
                                    {specialty.name}
                                  </Badge>
                                )}
                                {step.experienceLevel && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs shrink-0"
                                  >
                                    {step.experienceLevel}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {step.estimatedHours}h ×{" "}
                                {formatCurrency(hourlyRate)} ={" "}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(step.calculatedCost)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price composition */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Composição do Preço
                  </h3>
                  <div className="border rounded-xl overflow-hidden divide-y">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm">
                          Custo das Tarefas (Nômades)
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.totalTasksCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-yellow-50/60 dark:bg-yellow-950/20">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                        <span className="text-sm">Taxa de Qualificação</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.QUALIFICATION_FEE * 100).toFixed(
                            0,
                          )}
                          %
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.qualificationFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-sm font-semibold">Subtotal</span>
                      </div>
                      <span className="text-sm font-bold">
                        {formatCurrency(selectedProduct.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-sm">Impostos</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.TAXES * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.taxes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-sm">Taxa Operacional</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.OPERATIONAL_FEE * 100).toFixed(0)}
                          %
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.operationalFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4 bg-green-50 dark:bg-green-950/30">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-700 dark:text-green-400">
                          Preço Final
                        </span>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedProduct.finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPricingModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              size="sm"
              className="ml-auto btn-brand"
              onClick={() => {
                setIsPricingModalOpen(false);
                // Era `openProductSheet(...)`, funcao que nao existe — clicar
                // em "Editar Produto" aqui quebrava a tela. A funcao correta e
                // `handleEditProduct`, que preenche o formulario com o produto
                // e abre a folha de edicao.
                if (selectedProduct) handleEditProduct(selectedProduct);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Produto
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Detail Sheet */}
      <EmbeddedSlideScreen
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Detalhes da Tarefa"
        subtitle={
          selectedTask
            ? selectedTask.name
            : "Informações completas sobre a tarefa"
        }
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Fechar
            </Button>
            <Button size="sm" className="ml-auto btn-brand">
              <Edit className="h-4 w-4 mr-2" />
              Editar Tarefa
            </Button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 w-full">
          {selectedTask && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero card */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Custo da Tarefa
                  </p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(selectedTask.calculatedCost)}
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                      {selectedTask.steps.length} etapa
                      {selectedTask.steps.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h estimadas
                    </span>
                    {selectedTask.canRunInParallel && (
                      <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                        Execução Paralela
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Etapas
                    </p>
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedTask.steps.length}
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Horas Est.
                    </p>
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Paralela
                    </p>
                    <p
                      className={`font-bold text-sm leading-tight ${selectedTask.canRunInParallel ? "text-violet-600" : "text-slate-400"}`}
                    >
                      {selectedTask.canRunInParallel ? "Sim" : "Não"}
                    </p>
                  </div>
                </div>

                {selectedTask.dependencies &&
                  selectedTask.dependencies.length > 0 && (
                    <div className="flex items-start gap-3 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 bg-amber-50/60 dark:bg-amber-950/20">
                      <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <ListChecks className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Dependências
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          Esta tarefa só pode iniciar após a conclusão de{" "}
                          <strong>{selectedTask.dependencies.length}</strong>{" "}
                          tarefa
                          {selectedTask.dependencies.length !== 1
                            ? "s"
                            : ""}{" "}
                          anterior
                          {selectedTask.dependencies.length !== 1 ? "es" : ""}.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Steps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Etapas da Tarefa
                    </h3>
                    {selectedTask.steps.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                        {selectedTask.steps.length}
                      </span>
                    )}
                  </div>

                  {selectedTask.steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                      <Layers className="h-8 w-8 mb-2 text-slate-200 dark:text-slate-700" />
                      <p className="text-xs font-medium">
                        Nenhuma etapa cadastrada
                      </p>
                      <p className="text-[10px] mt-0.5">
                        Acesse "Gerenciar Etapas" para adicionar
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Linha vertical de timeline */}
                      {selectedTask.steps.length > 1 && (
                        <div className="absolute left-4 top-9 bottom-9 w-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
                      )}
                      <div className="space-y-3 relative z-10">
                        {selectedTask.steps.map((step, si) => {
                          const specialty = specialties.find(
                            (s) => s.id === step.specialty,
                          );
                          const hourlyRate =
                            specialty && step.experienceLevel
                              ? specialty.rates[step.experienceLevel]
                              : 0;
                          return (
                            <div key={step.id} className="flex gap-3">
                              {/* Número da etapa */}
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 text-white font-bold text-sm shrink-0 shadow-sm z-10">
                                {step.order || si + 1}
                              </div>
                              {/* Card da etapa */}
                              <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-card shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                                      {step.name}
                                    </p>
                                    {step.description && (
                                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {step.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-emerald-600 leading-tight">
                                      {formatCurrency(step.calculatedCost)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {step.estimatedHours}h estimadas
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  {specialty && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-2 py-0.5"
                                    >
                                      {specialty.name}
                                    </Badge>
                                  )}
                                  {step.experienceLevel && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-2 py-0.5"
                                    >
                                      {step.experienceLevel}
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>
                                      {step.estimatedHours}h ×{" "}
                                      {formatCurrency(hourlyRate)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTask.questionnaire && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileQuestion className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Questionário Associado
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuestionnaire(selectedTask.questionnaire);
                          setIsQuestionnaireModalOpen(true);
                        }}
                        className="ml-auto h-7 text-xs gap-1 px-2.5"
                      >
                        Ver Completo
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="p-4 bg-card">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {selectedTask.questionnaire.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {selectedTask.questionnaire.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {selectedTask.questionnaire.questions.length} pergunta
                          {selectedTask.questionnaire.questions.length !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </EmbeddedSlideScreen>

      {/* Questionnaire Sheet */}
      <Sheet
        open={isQuestionnaireModalOpen}
        onOpenChange={setIsQuestionnaireModalOpen}
      >
        <SheetContent
          side="right"
          hideOverlay
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
          }}
        >
          <ModalBrandHeader
            title="Questionário"
            subtitle={
              selectedQuestionnaire
                ? selectedQuestionnaire.title
                : "Para cliente / agência"
            }
            icon={<FileQuestion />}
          />

          {selectedQuestionnaire && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Questionário pré-tarefa
                  </p>
                  <p className="text-xl font-bold">
                    {selectedQuestionnaire.title}
                  </p>
                  {selectedQuestionnaire.description && (
                    <p className="text-sm opacity-80 mt-1">
                      {selectedQuestionnaire.description}
                    </p>
                  )}
                  <div className="mt-3 text-sm opacity-80">
                    {selectedQuestionnaire.questions.length} perguntas
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Perguntas
                  </h3>
                  {selectedQuestionnaire.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">
                              {question.question}
                            </p>
                            {question.required && (
                              <Badge
                                variant="destructive"
                                className="text-xs shrink-0"
                              >
                                Obrigatória
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {question.type === "text" && "Texto curto"}
                              {question.type === "multiline" && "Texto longo"}
                              {question.type === "select" && "Seleção única"}
                              {question.type === "multiselect" &&
                                "Múltipla escolha"}
                              {question.type === "file" && "Upload de arquivo"}
                            </Badge>
                            {question.aiAssisted && (
                              <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Sparkles className="h-3 w-3 mr-1" />
                                IA Assistida
                              </Badge>
                            )}
                          </div>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-muted space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Opções:
                              </p>
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span>{option}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsQuestionnaireModalOpen(false)}
            >
              Fechar
            </Button>
            <Button size="sm" className="ml-auto btn-brand">
              <Edit className="h-4 w-4 mr-2" />
              Editar Questionário
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* <ImportTaskTemplateModal
        open={showImportTemplateModal}
        onClose={() => setShowImportTemplateModal(false)}
        onImport={handleImportTemplate}
      /> */}

      {/* Modernized import mode dialog with better styling and layout */}
      <Dialog
        open={showImportModeDialog}
        onOpenChange={setShowImportModeDialog}
      >
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Como deseja importar o modelo?
            </DialogTitle>
            <DialogDescription>
              Escolha se deseja vincular ao modelo original ou criar uma cópia
              independente
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-3">
            <button
              onClick={() => {
                setImportMode("linked");
                setShowImportModeDialog(false);
                if (selectedTemplateToImport) {
                  // Import as linked
                  const newTask: Task = {
                    id: Date.now().toString(),
                    name: selectedTemplateToImport.name,
                    description: selectedTemplateToImport.description,
                    templateId: selectedTemplateToImport.id,
                    isLinkedToTemplate: true,
                    order: (productFormData.tasks || []).length + 1,
                    canRunInParallel: false, // Default value from Task interface
                    // Replicate other fields from template if needed, or fetch them
                    steps: selectedTemplateToImport.steps || [], // Assuming steps are part of template
                    // Add other default Task properties here if they are not in selectedTemplateToImport
                    code:
                      selectedTemplateToImport.code ||
                      `LINKED-${selectedTemplateToImport.id}`,
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline:
                      selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline:
                      selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline:
                      selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline:
                      selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue:
                      selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles:
                      selectedTemplateToImport.complementaryFiles || [],
                    verificationItems:
                      selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader:
                      selectedTemplateToImport.keepNextStepWithNomadLeader ||
                      false,
                    delegateToLeader:
                      selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend:
                      selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles:
                      selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep:
                      selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection:
                      selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient:
                      selectedTemplateToImport.hideFromClient || false,
                    hasVariations:
                      selectedTemplateToImport.hasVariations || false,
                    noConditions:
                      selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts:
                      selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline:
                      selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue:
                      selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals:
                      selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost:
                      selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  };
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  });
                  setSelectedTemplateToImport(null);
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Vincular ao Modelo Original
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    As alterações feitas no modelo original serão refletidas
                    automaticamente neste produto
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setImportMode("copy");
                setShowImportModeDialog(false);
                if (selectedTemplateToImport) {
                  // Import as copy
                  const newTask: Task = {
                    id: Date.now().toString(),
                    name: `${selectedTemplateToImport.name} (Cópia)`,
                    description: selectedTemplateToImport.description,
                    templateId: null, // No template link for copy
                    isLinkedToTemplate: false,
                    order: (productFormData.tasks || []).length + 1,
                    canRunInParallel:
                      selectedTemplateToImport.canRunInParallel || false, // Use existing default or template value
                    // Replicate other fields from template if needed, or set defaults
                    steps: selectedTemplateToImport.steps || [], // Copy steps as well
                    code: `COPY-${Date.now().toString().slice(-6)}`, // Auto-generated code for copy
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline:
                      selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline:
                      selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline:
                      selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline:
                      selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue:
                      selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles:
                      selectedTemplateToImport.complementaryFiles || [],
                    verificationItems:
                      selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader:
                      selectedTemplateToImport.keepNextStepWithNomadLeader ||
                      false,
                    delegateToLeader:
                      selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend:
                      selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles:
                      selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep:
                      selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection:
                      selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient:
                      selectedTemplateToImport.hideFromClient || false,
                    hasVariations:
                      selectedTemplateToImport.hasVariations || false,
                    noConditions:
                      selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts:
                      selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline:
                      selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue:
                      selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals:
                      selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost:
                      selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  };
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  });
                  setSelectedTemplateToImport(null);
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Criar Cópia Independente
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Criar uma cópia que pode ser editada livremente sem afetar o
                    modelo original
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-end px-6 py-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setShowImportModeDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet: View product (read-only) */}
      <EmbeddedSlideScreen
        open={isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          navigate("/admin/produtos", { replace: true });
        }}
        hideHeader
        pin={
          selectedProduct
            ? {
                id: `produtos-view-${selectedProduct.id}`,
                label: `Ver: ${selectedProduct.name}`,
                icon: Eye,
                path: "/admin/produtos",
                activateKey: `view:${selectedProduct.id}`,
              }
            : undefined
        }
      >
        <div className="flex flex-col flex-1 min-h-0 w-full">
          {selectedProduct && (
            <>
              <div className="relative overflow-hidden flex-shrink-0 rounded-2xl mx-3 mt-3 mb-2 shadow-sm">
                {/* Mesmo gradiente oficial dos banners da plataforma
                    (StandardPageBanner) — navy → roxo → magenta vibrante,
                    não o genérico simétrico que esmaecia de volta pro
                    escuro no canto direito. */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }}
                />
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 88% 15%, rgba(255,255,255,0.35), transparent 45%)",
                  }}
                />
                <div className="relative z-10 flex items-center justify-between pl-6 pr-16 py-4">
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  {selectedProduct.productImagePreview || (selectedProduct as any).image ? (
                    <img
                      src={selectedProduct.productImagePreview || (selectedProduct as any).image}
                      alt={selectedProduct.name}
                      className="h-12 w-12 rounded-xl object-cover border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 text-lg font-bold text-white truncate">
                    {selectedProduct.name}
                    <p className="text-[13px] font-normal text-white/60 mt-0.5 truncate">
                      {selectedProduct.category}
                      {selectedProduct.recurrence ? ` · ${selectedProduct.recurrence}` : ""} · {formatCurrency(selectedProduct.finalPrice || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CopyLinkButton />
                  <button
                    onClick={() => {
                      setIsViewSheetOpen(false);
                      navigate("/admin/produtos", { replace: true });
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <Tabs value={viewActiveTab} onValueChange={setViewActiveTab} className="space-y-0">
                  {/* Sticky tab navigation — responsiva, colapsa em "Mais N" */}
                  <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5">
                    <OverflowTabBar
                      active={viewActiveTab}
                      onChange={setViewActiveTab}
                      tabs={[
                        { value: "overview", label: "Visão Geral", icon: Eye },
                        {
                          value: "tasks",
                          label: "Tarefas",
                          icon: Layers,
                          badge: productCatalogTasks.length > 0 ? productCatalogTasks.length : undefined,
                        },
                        { value: "pricing", label: "Preços", icon: DollarSign },
                        { value: "questionnaire", label: "Questionário", icon: FileQuestion },
                        {
                          value: "nomad-tests",
                          label: "Testes",
                          icon: FlaskConical,
                          badge:
                            ((selectedProduct as any).nomadTests || []).filter((t: any) => t.isActive).length > 0
                              ? ((selectedProduct as any).nomadTests || []).filter((t: any) => t.isActive).length
                              : undefined,
                        },
                        { value: "circuito", label: "Circuito", icon: Route },
                        {
                          value: "checklist",
                          label: "Checklist",
                          icon: ClipboardCheck,
                          badge:
                            ((selectedProduct as any).nomadTests || []).filter((t: any) => t.qualificationChecklist).length > 0
                              ? ((selectedProduct as any).nomadTests || []).filter((t: any) => t.qualificationChecklist).length
                              : undefined,
                        },
                        {
                          value: "apresentacao",
                          label: "Apresentação",
                          icon: LayoutTemplate,
                          badge: (selectedProduct as any).presentation ? "✓" : "!",
                        },
                        { value: "nomades-habilitados", label: "Desempenho", icon: Users },
                        {
                          value: "complementares",
                          label: "Complementares",
                          icon: Link2,
                          badge:
                            ((selectedProduct as any).complementaryProductIds || []).length > 0
                              ? ((selectedProduct as any).complementaryProductIds || []).length
                              : undefined,
                        },
                      ]}
                    />
                  </div>
                  <div className="p-5">
                    {/* ── VISÃO GERAL ── */}
                    <TabsContent value="overview" className="space-y-4 mt-0">
                      {/* ── Image + gallery (side by side) + metrics ── */}
                      <div className="flex gap-3">
                        {/* Left: square main image */}
                        <div
                          className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-gradient-to-br from-blue-500 to-violet-600 shrink-0"
                          style={{ width: 192, height: 192 }}
                        >
                          {activeGalleryImage ||
                          selectedProduct.productImagePreview ||
                          (selectedProduct as any).image ? (
                            <img
                              src={
                                activeGalleryImage ||
                                selectedProduct.productImagePreview ||
                                (selectedProduct as any).image
                              }
                              alt={selectedProduct.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                          {/* Status pill */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${selectedProduct.isActive ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white/80 inline-block" />
                              {selectedProduct.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          {/* Price overlay bottom */}
                          <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                            <p className="text-white font-bold text-sm drop-shadow">
                              {formatCurrency(selectedProduct.finalPrice || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Right: gallery thumbnails (vertical) + metrics */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                          {/* Gallery column — real portfolio images */}
                          <div className="flex gap-2 flex-wrap">
                            {(() => {
                              const coverUrl =
                                selectedProduct.productImagePreview ||
                                (selectedProduct as any).image ||
                                "";
                              const portfolioUrls: string[] = (
                                (selectedProduct as any).portfolioImages || []
                              )
                                .map((img: any) => img.url)
                                .filter(Boolean);
                              const demoUrls: string[] = parseDemonstrations(
                                (selectedProduct as any).demonstrations,
                              ).filter(Boolean);
                              const allUrls =
                                portfolioUrls.length > 0
                                  ? portfolioUrls
                                  : demoUrls.length > 0
                                    ? demoUrls
                                    : coverUrl
                                      ? [coverUrl]
                                      : [];
                              const displayUrls = allUrls.slice(0, 4);
                              const currentMain = activeGalleryImage || coverUrl;
                              return displayUrls.map((url, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveGalleryImage(url)}
                                  className={`shrink-0 h-14 w-14 rounded-xl overflow-hidden cursor-pointer transition-all ${url === currentMain ? "border-2 border-blue-500 shadow-sm" : "border border-slate-200 dark:border-slate-700 hover:border-blue-400"}`}
                                >
                                  <img
                                    src={url}
                                    alt={`Imagem ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ));
                            })()}
                            <button
                              onClick={() => {
                                setIsViewSheetOpen(false);
                                handleEditProduct(selectedProduct);
                              }}
                              className="shrink-0 h-14 w-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-0.5 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors text-slate-400 hover:text-blue-500"
                              title="Gerenciar imagens"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-medium leading-none">
                                + foto
                              </span>
                            </button>
                          </div>

                          {/* Compact metrics */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 h-14 bg-white dark:bg-slate-800/50 flex items-center gap-2.5">
                              <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
                                  Preço
                                </p>
                                <p className="font-bold text-emerald-600 text-sm leading-tight truncate">
                                  {formatCurrency(
                                    selectedProduct.finalPrice || 0,
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 h-14 bg-white dark:bg-slate-800/50 flex items-center gap-2.5">
                              <RefreshCw className="h-4 w-4 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
                                  Recorrência
                                </p>
                                <p className="font-semibold text-sm leading-tight truncate">
                                  {selectedProduct.recurrence || "—"}
                                </p>
                              </div>
                            </div>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 h-14 bg-white dark:bg-slate-800/50 flex items-center gap-2.5">
                              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">
                                  Prazo
                                </p>
                                <p className="font-semibold text-sm leading-tight truncate">
                                  {selectedProduct.deliveryDays
                                    ? `${selectedProduct.deliveryDays}d`
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Category + tags inline */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {selectedProduct.category}
                            </span>
                            {(selectedProduct.tags || [])
                              .slice(0, 3)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Summary description */}
                      {selectedProduct.summaryDescription && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Descrição
                          </p>
                          <p className="text-[13px] text-foreground leading-relaxed">
                            {selectedProduct.summaryDescription}
                          </p>
                        </div>
                      )}

                      {/* Benefits */}
                      {selectedProduct.benefits && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Benefícios
                          </p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                            {selectedProduct.benefits}
                          </p>
                        </div>
                      )}

                      {/* Subcategories */}
                      {(selectedProduct.subcategories || []).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Subcategorias
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedProduct.subcategories || []).map(
                              (sub) => (
                                <Badge
                                  key={sub}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {sub}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Included / Not included */}
                      <div className="grid grid-cols-2 gap-3">
                        {(selectedProduct.includedItems || []).length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Incluso
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedProduct.includedItems || []).map(
                                (item, i) => (
                                  <Badge
                                    key={i}
                                    className="text-xs bg-emerald-100 text-emerald-800 border-0"
                                  >
                                    {item}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                        {(selectedProduct.notIncludedItems || []).length >
                          0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Não incluso
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedProduct.notIncludedItems || []).map(
                                (item, i) => (
                                  <Badge
                                    key={i}
                                    className="text-xs bg-red-100 text-red-800 border-0"
                                  >
                                    {item}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request attention */}
                      {selectedProduct.requestAttention && (
                        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">
                            O que solicitar ao cliente
                          </p>
                          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                            {selectedProduct.requestAttention}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── TAREFAS VINCULADAS ── */}
                    <TabsContent value="tasks" className="space-y-4 mt-3">
                      {/* Warning banner */}
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                          <strong>Tarefas reutilizáveis.</strong> Alterações
                          feitas no{" "}
                          <a
                            href="/admin/tarefas"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100"
                          >
                            Cadastro de Tarefas
                          </a>{" "}
                          serão refletidas automaticamente em todos os produtos
                          vinculados.
                        </p>
                      </div>

                      {/* Base tasks section */}
                      <div className="space-y-3">
                        {(() => {
                          const baseTasks = productCatalogTasks.filter(
                            (l) => !l.phase || l.phase === "base",
                          );
                          const mandatoryCount = baseTasks.filter(
                            (l) => l.is_mandatory,
                          ).length;
                          const specificCount = baseTasks.filter(
                            (l) => l.notes,
                          ).length;
                          return (
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-base font-bold leading-tight">
                                  Tarefas do produto
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Gerencie as tarefas reutilizáveis vinculadas a este produto.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                                  <span className="h-6 w-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Layers className="h-3.5 w-3.5" />
                                  </span>
                                  <div className="leading-tight">
                                    <p className="text-sm font-bold">{baseTasks.length}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      tarefa{baseTasks.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                                  <span className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </span>
                                  <div className="leading-tight">
                                    <p className="text-sm font-bold">{mandatoryCount}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      obrigatória{mandatoryCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                                  <span className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <FileText className="h-3.5 w-3.5" />
                                  </span>
                                  <div className="leading-tight">
                                    <p className="text-sm font-bold">{specificCount}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      específica{specificCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="btn-brand border-0 gap-1.5 h-9"
                                  onClick={() => {
                                    setCatalogTaskSearch("");
                                    setCatalogTaskSearchResults([]);
                                    setOpenAddTaskFor((p) =>
                                      p === "base" ? null : "base",
                                    );
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Vincular tarefa
                                </Button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Add panel for base tasks */}
                        {openAddTaskFor === "base" && (
                          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                className="pl-8 h-8 text-xs"
                                placeholder="Buscar por nome ou código..."
                                value={catalogTaskSearch}
                                onChange={(e) => {
                                  setCatalogTaskSearch(e.target.value);
                                  searchCatalogTasks(e.target.value);
                                }}
                                autoFocus
                              />
                              {catalogTaskSearch && (
                                <button
                                  onClick={() => {
                                    setCatalogTaskSearch("");
                                    setCatalogTaskSearchResults([]);
                                  }}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            {catalogTaskSearchLoading && (
                              <InlineLoader
                                text="Buscando..."
                                className="py-1 justify-start"
                              />
                            )}
                            {catalogTaskSearchResults.length > 0 && (
                              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                                {catalogTaskSearchResults.map((task) => (
                                  <button
                                    key={task.id}
                                    onClick={() =>
                                      handleAddCatalogTask(task, null)
                                    }
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-colors group"
                                  >
                                    <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                      {task.code}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {task.name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {task.category}
                                      </p>
                                    </div>
                                    <Plus className="h-3.5 w-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!catalogTaskSearchLoading &&
                              catalogTaskSearch.length > 1 &&
                              catalogTaskSearchResults.length === 0 && (
                                <p className="text-xs text-muted-foreground py-1">
                                  Nenhuma tarefa disponível.{" "}
                                  <a
                                    href="/admin/tarefas"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 underline"
                                  >
                                    Criar nova tarefa
                                  </a>
                                </p>
                              )}
                          </div>
                        )}

                        {/* Loading */}
                        {catalogTasksLoading && (
                          <InlineLoader
                            text="Carregando tarefas vinculadas…"
                            className="py-10 justify-center"
                          />
                        )}

                        {/* Empty state */}
                        {!catalogTasksLoading &&
                          productCatalogTasks.filter(
                            (l) => !l.phase || l.phase === "base",
                          ).length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Layers className="h-8 w-8 text-muted-foreground/25 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                Nenhuma tarefa vinculada.
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                Use "Vincular Tarefa" para adicionar do
                                catálogo.
                              </p>
                            </div>
                          )}

                        {/* Task list — base */}
                        {!catalogTasksLoading &&
                          productCatalogTasks.filter(
                            (l) => !l.phase || l.phase === "base",
                          ).length > 0 && (
                            <div className="space-y-2">
                              {productCatalogTasks
                                .filter((l) => !l.phase || l.phase === "base")
                                .map((link, idx, arr) => (
                                  <CatalogTaskLinkRow
                                    key={link.id}
                                    link={link}
                                    index={idx}
                                    total={arr.length}
                                    onMoveUp={() =>
                                      handleMoveTaskLink(link, idx, arr, -1)
                                    }
                                    onMoveDown={() =>
                                      handleMoveTaskLink(link, idx, arr, 1)
                                    }
                                    onToggleMandatory={() =>
                                      handleUpdateCatalogTaskLink(link, {
                                        is_mandatory: !link.is_mandatory,
                                      })
                                    }
                                    onUpdateNotes={(notes) =>
                                      handleUpdateCatalogTaskLink(link, {
                                        notes,
                                      })
                                    }
                                    onRemove={() =>
                                      handleRemoveCatalogTaskLink(link.id)
                                    }
                                  />
                                ))}
                            </div>
                          )}
                      </div>

                      {/* Variation-specific tasks */}
                      {(selectedProduct.variations || []).length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Tarefas por variação
                          </p>
                          {(selectedProduct.variations || []).map(
                            (variation: any) => {
                              const varTasks = productCatalogTasks.filter(
                                (l) => l.phase === variation.id,
                              );
                              return (
                                <div
                                  key={variation.id}
                                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                                >
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/30">
                                    <div>
                                      <p className="text-xs font-semibold">
                                        {variation.name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {varTasks.length} tarefa
                                        {varTasks.length !== 1 ? "s" : ""}{" "}
                                        específica
                                        {varTasks.length !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                      onClick={() => {
                                        setCatalogTaskSearch("");
                                        setCatalogTaskSearchResults([]);
                                        setOpenAddTaskFor((p) =>
                                          p === variation.id
                                            ? null
                                            : variation.id,
                                        );
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Adicionar
                                    </Button>
                                  </div>
                                  {openAddTaskFor === variation.id && (
                                    <div className="px-3 py-2.5 border-t border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-2">
                                      <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                          className="pl-8 h-8 text-xs"
                                          placeholder="Buscar tarefa..."
                                          value={catalogTaskSearch}
                                          onChange={(e) => {
                                            setCatalogTaskSearch(
                                              e.target.value,
                                            );
                                            searchCatalogTasks(e.target.value);
                                          }}
                                          autoFocus
                                        />
                                      </div>
                                      {catalogTaskSearchResults.length > 0 && (
                                        <div className="space-y-1 max-h-36 overflow-y-auto">
                                          {catalogTaskSearchResults.map(
                                            (task) => (
                                              <button
                                                key={task.id}
                                                onClick={() =>
                                                  handleAddCatalogTask(
                                                    task,
                                                    variation.id,
                                                  )
                                                }
                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 text-left transition-colors group"
                                              >
                                                <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                                  {task.code}
                                                </span>
                                                <p className="text-xs font-medium flex-1 truncate">
                                                  {task.name}
                                                </p>
                                                <Plus className="h-3 w-3 text-indigo-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {varTasks.length > 0 && (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {varTasks.map((link) => (
                                        <div
                                          key={link.id}
                                          className="flex items-center gap-2 px-3 py-2"
                                        >
                                          <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                            {link.catalog_task?.code}
                                          </span>
                                          <p className="text-xs font-medium flex-1 truncate">
                                            {link.catalog_task?.name}
                                          </p>
                                          {link.is_mandatory ? (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                                              Obrig.
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                                              Opcional
                                            </span>
                                          )}
                                          <button
                                            onClick={() =>
                                              handleRemoveCatalogTaskLink(
                                                link.id,
                                              )
                                            }
                                            className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {varTasks.length === 0 &&
                                    openAddTaskFor !== variation.id && (
                                      <div className="px-4 py-3 text-xs text-muted-foreground/60 italic">
                                        Nenhuma tarefa específica para esta
                                        variação.
                                      </div>
                                    )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── PREÇOS ── */}
                    <TabsContent value="pricing" className="space-y-4 mt-3">
                      {/* Header + stat cards */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-base font-bold leading-tight">
                            Preços e variações
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Gerencie valores, prazos e condições de cada contratação.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                            <span className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Tag className="h-3.5 w-3.5" />
                            </span>
                            <div className="leading-tight">
                              <p className="text-[10px] text-muted-foreground">Preço base</p>
                              <p className="text-sm font-bold text-emerald-600">
                                {formatCurrency(selectedProduct.finalPrice || 0)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                            <span className="h-6 w-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <Layers className="h-3.5 w-3.5" />
                            </span>
                            <div className="leading-tight">
                              <p className="text-[10px] text-muted-foreground">Variações</p>
                              <p className="text-sm font-bold">
                                {(selectedProduct.variations || []).length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-1.5">
                            <span className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Calendar className="h-3.5 w-3.5" />
                            </span>
                            <div className="leading-tight">
                              <p className="text-[10px] text-muted-foreground">Prazo padrão</p>
                              <p className="text-sm font-bold">
                                {selectedProduct.deliveryDays
                                  ? `${selectedProduct.deliveryDays} dias`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="btn-brand border-0 gap-1.5 h-9"
                            onClick={() => {
                              setIsViewSheetOpen(false);
                              handleEditProduct(selectedProduct);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Nova variação
                          </Button>
                        </div>
                      </div>

                      {/* Variações cadastradas — tabela */}
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/40">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-bold">Variações cadastradas</p>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-muted-foreground">
                              <th className="text-left px-4 py-2 font-semibold">Variação</th>
                              <th className="text-left px-4 py-2 font-semibold">Recorrência</th>
                              <th className="text-left px-4 py-2 font-semibold">Prazo</th>
                              <th className="text-left px-4 py-2 font-semibold">Preço</th>
                              <th className="text-left px-4 py-2 font-semibold">Status</th>
                              <th className="text-right px-4 py-2 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">Contratação Padrão</span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    Base
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Configuração principal do produto
                                </p>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {selectedProduct.recurrence || "—"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {selectedProduct.deliveryDays
                                  ? `${selectedProduct.deliveryDays} dias`
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-600">
                                {formatCurrency(selectedProduct.finalPrice || 0)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${selectedProduct.isActive ? "text-emerald-600" : "text-red-500"}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full inline-block ${selectedProduct.isActive ? "bg-emerald-500" : "bg-red-500"}`}
                                  />
                                  {selectedProduct.isActive ? "Ativa" : "Inativa"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                    title="Visualizar"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                    title="Duplicar"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                    className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {(selectedProduct.variations || []).map((v) => (
                              <tr key={v.id}>
                                <td className="px-4 py-3 font-medium">{v.name || "—"}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {selectedProduct.recurrence || "—"}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {v.deadlineDays ? `${v.deadlineDays} dias` : "—"}
                                </td>
                                <td className="px-4 py-3 font-semibold text-emerald-600">
                                  {formatCurrency(v.price)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${v.isActive !== false ? "text-emerald-600" : "text-red-500"}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full inline-block ${v.isActive !== false ? "bg-emerald-500" : "bg-red-500"}`}
                                    />
                                    {v.isActive !== false ? "Ativa" : "Inativa"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setIsViewSheetOpen(false);
                                        handleEditProduct(selectedProduct);
                                      }}
                                      className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                      title="Editar"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Info banner */}
                      <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3">
                        <Info className="h-4 w-4 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          O preço da contratação padrão é exibido no catálogo. Variações podem sobrescrever valor e prazo.
                        </p>
                      </div>

                      {/* Add-ons — creative_type */}
                      {(selectedProduct.addOns || []).filter(
                        (a) => a.category === "creative_type",
                      ).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Add-ons · Tipo Criativo
                          </p>
                          <div className="border rounded-xl overflow-hidden divide-y">
                            {(selectedProduct.addOns || [])
                              .filter((a) => a.category === "creative_type")
                              .map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                                >
                                  <span>{addon.name}</span>
                                  <span className="font-semibold text-emerald-600">
                                    {formatCurrency(addon.price)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Add-ons — extra */}
                      {(selectedProduct.addOns || []).filter(
                        (a) => a.category === "extra",
                      ).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Add-ons · Extra
                          </p>
                          <div className="border rounded-xl overflow-hidden divide-y">
                            {(selectedProduct.addOns || [])
                              .filter((a) => a.category === "extra")
                              .map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                                >
                                  <span>{addon.name}</span>
                                  <span className="font-semibold text-emerald-600">
                                    {formatCurrency(addon.price)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {(selectedProduct.variations || []).length === 0 &&
                        (selectedProduct.addOns || []).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <DollarSign className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma variação ou add-on cadastrado.
                            </p>
                          </div>
                        )}
                    </TabsContent>

                    {/* ── QUESTIONÁRIO ── */}
                    <TabsContent
                      value="questionnaire"
                      className="space-y-3 mt-3"
                    >
                      {(() => {
                        const questionnaire = (selectedProduct as any)
                          .questionnaire;
                        const questions: any[] =
                          questionnaire?.questions ||
                          (selectedProduct as any).questions ||
                          [];

                        if (questions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <FileQuestion className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhuma pergunta cadastrada neste questionário.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                O questionário de briefing é preenchido pelo
                                cliente no momento da contratação.
                              </p>
                            </div>
                          );
                        }

                        // ── Agrupar por seção ──────────────────────────────────────
                        const sections: Record<string, any[]> = {};
                        const NO_SECTION = "__geral__";
                        for (const q of questions) {
                          const key = q.section || NO_SECTION;
                          if (!sections[key]) sections[key] = [];
                          sections[key].push(q);
                        }
                        const sectionKeys = Object.keys(sections);
                        const hasMultipleSections = sectionKeys.some(
                          (k) => k !== NO_SECTION,
                        );

                        const requiredCount = questions.filter(
                          (q) => q.required,
                        ).length;
                        const optionalCount = questions.length - requiredCount;

                        const TYPE_LABELS: Record<string, string> = {
                          text: "Texto curto",
                          multiline: "Texto longo",
                          select: "Seleção única",
                          multiselect: "Múltipla escolha",
                          file: "Upload de arquivo",
                        };

                        const matchesQuestion = (q: any) => {
                          const searchOk =
                            !questionnaireSearch ||
                            (q.question || "")
                              .toLowerCase()
                              .includes(questionnaireSearch.toLowerCase());
                          const filterOk =
                            questionnaireFilter === "all" ||
                            (questionnaireFilter === "required"
                              ? !!q.required
                              : !q.required);
                          return searchOk && filterOk;
                        };

                        const toggleSection = (key: string) => {
                          setCollapsedQSections((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        };
                        const toggleQuestion = (id: string) => {
                          setExpandedQQuestions((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        };

                        const FILTER_PILLS: {
                          key: "all" | "required" | "optional";
                          label: string;
                        }[] = [
                          { key: "all", label: "Todas" },
                          { key: "required", label: "Obrigatórias" },
                          { key: "optional", label: "Opcionais" },
                        ];

                        return (
                          <div className="space-y-4">
                            {/* Header + stat pills */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-base font-bold leading-tight">
                                  Questionário do produto
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Organize as informações solicitadas ao cliente antes da execução.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
                                  {questions.length} perguntas
                                </span>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                  {requiredCount} obrigatórias
                                </span>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                  {optionalCount} opcionais
                                </span>
                              </div>
                            </div>

                            {/* Toolbar: busca + filtro + expandir */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  className="pl-8 h-9 text-sm"
                                  placeholder="Buscar pergunta..."
                                  value={questionnaireSearch}
                                  onChange={(e) =>
                                    setQuestionnaireSearch(e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {FILTER_PILLS.map((f) => (
                                  <button
                                    key={f.key}
                                    onClick={() => setQuestionnaireFilter(f.key)}
                                    className={`h-9 px-3.5 rounded-lg text-xs font-semibold border transition-colors ${
                                      questionnaireFilter === f.key
                                        ? f.key === "required"
                                          ? "bg-red-500 text-white border-red-500"
                                          : f.key === "optional"
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "bg-gradient-to-r from-[#2558FF] via-[#6E2C96] to-[#D92293] text-white border-transparent"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 text-xs ml-auto"
                                onClick={() => {
                                  const willExpand = !questionnaireExpandAll;
                                  setQuestionnaireExpandAll(willExpand);
                                  setExpandedQQuestions(
                                    willExpand
                                      ? new Set(questions.map((q) => q.id))
                                      : new Set(),
                                  );
                                }}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                {questionnaireExpandAll
                                  ? "Colapsar todas"
                                  : "Expandir todas"}
                              </Button>
                            </div>

                            {sectionKeys.map((sectionKey) => {
                              const sectionQuestions = sections[
                                sectionKey
                              ].filter(matchesQuestion);
                              if (sectionQuestions.length === 0) return null;
                              const isCollapsed =
                                collapsedQSections.has(sectionKey);
                              return (
                                <div key={sectionKey} className="space-y-2">
                                  {/* Cabeçalho da seção */}
                                  {hasMultipleSections &&
                                    sectionKey !== NO_SECTION && (
                                      <button
                                        type="button"
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-purple-100 dark:border-purple-800/40 bg-purple-50/70 dark:bg-purple-950/20 px-4 py-2.5 transition-colors hover:bg-purple-50 dark:hover:bg-purple-950/30"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <FileQuestion className="h-3.5 w-3.5" />
                                          </span>
                                          <span className="text-sm font-semibold">
                                            {sectionKey}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                                            {sectionQuestions.length} perguntas
                                          </span>
                                          <ChevronDown
                                            className={`h-4 w-4 text-purple-500 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                                          />
                                        </div>
                                      </button>
                                    )}

                                  {/* Perguntas da seção */}
                                  {!isCollapsed &&
                                    sectionQuestions.map((question: any) => {
                                      const idx =
                                        questions.indexOf(question) + 1;
                                      const isExpanded = expandedQQuestions.has(
                                        question.id,
                                      );
                                      const hasExpandableContent =
                                        (question.options || []).length > 0 ||
                                        !!question.warning ||
                                        !!question.aiContext;
                                      return (
                                        <div
                                          key={question.id}
                                          className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40"
                                        >
                                          {/* Linha principal */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              hasExpandableContent &&
                                              toggleQuestion(question.id)
                                            }
                                            className="w-full flex items-start gap-3 p-4 text-left"
                                          >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-bold shrink-0 mt-0.5">
                                              {idx}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm">
                                                {question.question}
                                              </p>
                                              {question.placeholder && (
                                                <p className="text-xs text-muted-foreground/80 italic mt-0.5">
                                                  Ex: {question.placeholder}
                                                </p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-[45%]">
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5"
                                              >
                                                {TYPE_LABELS[question.type] ??
                                                  question.type}
                                              </Badge>
                                              {question.aiAssisted && (
                                                <Badge className="text-[10px] px-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                                  IA
                                                </Badge>
                                              )}
                                              {question.briefingKey && (
                                                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                  {question.briefingKey}
                                                </span>
                                              )}
                                              <span
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                  question.required
                                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}
                                              >
                                                {question.required
                                                  ? "Obrigatória"
                                                  : "Opcional"}
                                              </span>
                                              <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                              {hasExpandableContent && (
                                                <ChevronDown
                                                  className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                />
                                              )}
                                            </div>
                                          </button>

                                          {isExpanded && hasExpandableContent && (
                                            <div className="px-4 pb-4 pl-14 space-y-2 bg-purple-50/30 dark:bg-purple-950/10 border-t border-slate-100 dark:border-slate-800 pt-3">
                                              {/* Warning */}
                                              {question.warning && (
                                                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                  <span>{question.warning}</span>
                                                </div>
                                              )}

                                              {/* aiContext */}
                                              {question.aiContext && (
                                                <div className="flex items-start gap-2 text-[11px] text-blue-600 dark:text-blue-400">
                                                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                                  <span className="text-muted-foreground">
                                                    {question.aiContext}
                                                  </span>
                                                </div>
                                              )}

                                              {/* Opções */}
                                              {(question.options || []).length >
                                                0 && (
                                                <div className="space-y-1">
                                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                                                    Opções
                                                  </p>
                                                  {(question.options || []).map(
                                                    (
                                                      option: string,
                                                      optIdx: number,
                                                    ) => (
                                                      <div
                                                        key={optIdx}
                                                        className="flex items-center gap-2 text-xs"
                                                      >
                                                        <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <span>{option}</span>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── TESTES DOS NÔMADES ── */}
                    <TabsContent value="nomad-tests" className="space-y-4 mt-3">
                      {(() => {
                        const nomadTests =
                          (selectedProduct as any).nomadTests || [];
                        const habilitadosCount = nomadTests.filter(
                          (t: any) => t.isActive,
                        ).length;

                        const header = (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-base font-bold leading-tight">
                                Testes do produto
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Defina validações práticas antes da entrega.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-2.5">
                                <span className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                  <FlaskConical className="h-4 w-4" />
                                </span>
                                <div className="leading-tight">
                                  <p className="text-base font-bold">
                                    {nomadTests.length}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    testes
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-2.5">
                                <span className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                  <Users className="h-4 w-4" />
                                </span>
                                <div className="leading-tight">
                                  <p className="text-base font-bold">
                                    {habilitadosCount}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    nômades habilitados
                                    <br />
                                    após aprovação
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );

                        if (nomadTests.length === 0) {
                          return (
                            <div className="space-y-4">
                              {header}
                              <Button
                                size="sm"
                                className="btn-brand border-0 gap-1.5 h-9"
                                onClick={() => {
                                  setIsViewSheetOpen(false);
                                  handleEditProduct(selectedProduct);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Criar teste
                              </Button>

                              <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 to-blue-50/60 dark:from-purple-950/20 dark:to-blue-950/10 px-6 py-10 flex flex-col items-center text-center gap-3">
                                <FlaskConical className="h-12 w-12 text-violet-400" />
                                <p className="text-base font-bold">
                                  Nenhum teste cadastrado
                                </p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  Crie critérios práticos para validar a qualidade da entrega e habilitar nômades neste produto.
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  <Button
                                    size="sm"
                                    className="btn-brand border-0"
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                  >
                                    Criar primeiro teste
                                  </Button>
                                  <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                    Ver exemplos
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Validação técnica
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Funcionamento e integrações
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <ClipboardCheck className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Checklist prático
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Etapas que precisam ser comprovadas
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Critério de aprovação
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Resultado mínimo esperado
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Agrupar testes por tarefa vinculada
                        const grouped: Record<
                          string,
                          { taskName: string; tests: any[] }
                        > = {};
                        for (const t of nomadTests) {
                          const key = t.linkedTaskId || "geral";
                          if (!grouped[key])
                            grouped[key] = {
                              taskName: t.linkedTaskName || key,
                              tests: [],
                            };
                          grouped[key].tests.push(t);
                        }

                        return (
                          <div className="space-y-6">
                            {header}
                            {Object.entries(grouped).map(([taskId, group]) => (
                              <div key={taskId} className="space-y-3">
                                {/* Cabeçalho do grupo */}
                                <div className="flex items-center gap-2">
                                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-2">
                                    {group.taskName}
                                  </span>
                                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                </div>

                                {group.tests.map((test: any) => (
                                  <div
                                    key={test.id}
                                    className="border rounded-xl overflow-hidden"
                                  >
                                    {/* Cabeçalho do teste */}
                                    <div className="flex items-start gap-3 p-4 bg-muted/30">
                                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 shrink-0">
                                        <FlaskConical className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] font-mono text-muted-foreground">
                                            {test.code}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                              test.isActive
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                            }`}
                                          >
                                            <span
                                              className={`h-1.5 w-1.5 rounded-full inline-block ${test.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                                            />
                                            {test.isActive
                                              ? "Ativo"
                                              : "Inativo"}
                                          </span>
                                        </div>
                                        <p className="font-semibold text-sm mt-0.5">
                                          {test.name}
                                        </p>
                                        {test.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {test.description}
                                          </p>
                                        )}
                                        {/* Métricas */}
                                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Trophy className="h-3 w-3 text-amber-500" />
                                            Aprovação:{" "}
                                            <strong className="text-foreground">
                                              {test.passingScore}%
                                            </strong>
                                          </span>
                                          {test.timeLimit && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              Limite:{" "}
                                              <strong className="text-foreground">
                                                {test.timeLimit} min
                                              </strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Briefing fake */}
                                    {(test.fakeClientName ||
                                      test.fakeObjective) && (
                                      <div className="px-4 py-3 border-t bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                          Briefing do Teste (dados fictícios)
                                        </p>
                                        {test.fakeClientName && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Cliente:
                                            </span>
                                            <span className="font-medium">
                                              {test.fakeClientName}
                                            </span>
                                          </div>
                                        )}
                                        {test.fakeObjective && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Objetivo:
                                            </span>
                                            <span>{test.fakeObjective}</span>
                                          </div>
                                        )}
                                        {test.fakeContext && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Contexto:
                                            </span>
                                            <span>{test.fakeContext}</span>
                                          </div>
                                        )}
                                        {(test.fakeDeliverables || []).length >
                                          0 && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">
                                              Entregáveis esperados:
                                            </span>
                                            <ul className="mt-1 space-y-0.5 pl-3">
                                              {test.fakeDeliverables.map(
                                                (d: string, i: number) => (
                                                  <li
                                                    key={i}
                                                    className="flex items-start gap-1.5"
                                                  >
                                                    <span className="text-amber-500 shrink-0 mt-0.5">
                                                      ·
                                                    </span>
                                                    <span>{d}</span>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Critérios de avaliação */}
                                    {(test.evaluationCriteria || []).length >
                                      0 && (
                                      <div className="px-4 py-3 border-t space-y-1.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Critérios de Avaliação
                                        </p>
                                        {test.evaluationCriteria.map(
                                          (c: string, i: number) => (
                                            <div
                                              key={i}
                                              className="flex items-start gap-2 text-xs"
                                            >
                                              <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                              <span>{c}</span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    {/* Habilitar Outras Tarefas */}
                                    {(test.enablesAdditionalTasks || [])
                                      .length > 0 && (
                                      <div className="px-4 py-3 border-t bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                          <Link2 className="h-3 w-3" />
                                          Habilita Outras Tarefas ao Passar
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {test.enablesAdditionalTasks.map(
                                            (ref: any) => (
                                              <span
                                                key={ref.taskId}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-700"
                                              >
                                                <CheckCircle2 className="h-3 w-3" />
                                                {ref.taskName}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}

                            {/* CTA para novo teste */}
                            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-muted-foreground hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-colors">
                              <Plus className="h-4 w-4" />
                              Adicionar Novo Teste
                            </button>
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── CIRCUITO PRÉ-HABILITAÇÃO ── */}
                    <TabsContent value="circuito" className="space-y-4 mt-3">
                      {(() => {
                        const nomadTests = (
                          (selectedProduct as any).nomadTests || []
                        ).filter((t: any) => t.preCircuit);
                        const allTests =
                          (selectedProduct as any).nomadTests || [];

                        const circuitoHeader = (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-base font-bold leading-tight">
                                Circuitos de qualificação
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Organize a sequência de testes e regras para aprovação.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                className="btn-brand border-0 gap-1.5 h-9"
                                onClick={() => setViewActiveTab("nomad-tests")}
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                Ir para Testes
                              </Button>
                              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                Como funciona
                              </button>
                            </div>
                          </div>
                        );

                        const circuitoStats = (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <Route className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-base font-bold">{nomadTests.length}</p>
                                <p className="text-[11px] text-muted-foreground">circuitos</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <SlidersHorizontal className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-base font-bold">
                                  {nomadTests.reduce(
                                    (a: number, t: any) => a + 5,
                                    0,
                                  ) || 0}
                                </p>
                                <p className="text-[11px] text-muted-foreground">etapas</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <Link2 className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-[11px] text-muted-foreground">Dependência</p>
                                <p className="text-sm font-bold">Testes</p>
                              </div>
                            </div>
                          </div>
                        );

                        const exemploFluxo = (
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                            <div>
                              <p className="text-sm font-bold flex items-center gap-1.5">
                                Exemplo de fluxo
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Veja como os circuitos ajudam no processo de qualificação.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {[
                                {
                                  n: 1,
                                  title: "Teste",
                                  desc: "Configure os testes necessários.",
                                  Icon: FlaskConical,
                                  color: "text-blue-600",
                                  bg: "bg-blue-100 dark:bg-blue-900/30",
                                },
                                {
                                  n: 2,
                                  title: "Validação",
                                  desc: "Defina regras e condições de validação.",
                                  Icon: ClipboardCheck,
                                  color: "text-violet-600",
                                  bg: "bg-violet-100 dark:bg-violet-900/30",
                                },
                                {
                                  n: 3,
                                  title: "Aprovação",
                                  desc: "Revisão e aprovação final do processo.",
                                  Icon: ShieldCheck,
                                  color: "text-pink-600",
                                  bg: "bg-pink-100 dark:bg-pink-900/30",
                                },
                              ].map((s, i, arr) => (
                                <Fragment key={s.n}>
                                  <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-start gap-2.5">
                                    <span
                                      className={`h-8 w-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}
                                    >
                                      <s.Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold leading-tight">
                                        {s.n}. {s.title}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {s.desc}
                                      </p>
                                    </div>
                                  </div>
                                  {i < arr.length - 1 && (
                                    <div className="h-px w-4 border-t border-dashed border-slate-300 dark:border-slate-600 shrink-0" />
                                  )}
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        );

                        if (allTests.length === 0 || nomadTests.length === 0) {
                          return (
                            <div className="space-y-4">
                              {circuitoHeader}
                              {circuitoStats}
                              <div className="rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/10 px-6 py-10 flex flex-col items-center text-center gap-3">
                                <div className="flex items-center gap-3">
                                  {[FlaskConical, ClipboardCheck, ShieldCheck].map(
                                    (Icon, i, arr) => (
                                      <Fragment key={i}>
                                        <span className="h-14 w-14 rounded-full border-2 border-dashed border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 text-violet-400 flex items-center justify-center">
                                          <Icon className="h-6 w-6" />
                                        </span>
                                        {i < arr.length - 1 && (
                                          <div className="h-px w-8 border-t border-dashed border-violet-300 dark:border-violet-700" />
                                        )}
                                      </Fragment>
                                    ),
                                  )}
                                </div>
                                <p className="text-base font-bold mt-1">
                                  Nenhum circuito configurado
                                </p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  Cadastre ao menos um teste para criar fluxos de validação, revisão e aprovação.
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  <Button
                                    size="sm"
                                    className="btn-brand border-0"
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                  >
                                    Cadastrar teste
                                  </Button>
                                  <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                    Ver exemplo de circuito
                                  </button>
                                </div>
                              </div>
                              {exemploFluxo}
                            </div>
                          );
                        }

                        const STEP_DEFS = [
                          {
                            key: "welcome",
                            label: "Boas-vindas",
                            Icon: PartyPopper,
                            color: "text-violet-600",
                            bg: "bg-violet-100 dark:bg-violet-900/40",
                          },
                          {
                            key: "about",
                            label: "Sobre o Teste",
                            Icon: BookOpen,
                            color: "text-blue-600",
                            bg: "bg-blue-100 dark:bg-blue-900/40",
                          },
                          {
                            key: "video",
                            label: "Vídeo",
                            Icon: PlayCircle,
                            color: "text-red-600",
                            bg: "bg-red-100 dark:bg-red-900/40",
                          },
                          {
                            key: "rules",
                            label: "Regras",
                            Icon: ListChecks,
                            color: "text-amber-600",
                            bg: "bg-amber-100 dark:bg-amber-900/40",
                          },
                          {
                            key: "confirm",
                            label: "Confirmar",
                            Icon: CheckCircle2,
                            color: "text-emerald-600",
                            bg: "bg-emerald-100 dark:bg-emerald-900/40",
                          },
                        ];

                        return (
                          <div className="space-y-6">
                            {nomadTests.map((test: any) => {
                              const pc = test.preCircuit;
                              const stepData = [
                                {
                                  key: "welcome",
                                  title: pc.welcomeTitle || "—",
                                  preview: pc.welcomeSubtitle,
                                  count: (pc.welcomeHighlights || []).length,
                                  unit: "destaques",
                                },
                                {
                                  key: "about",
                                  title: "Sobre o Teste",
                                  preview: pc.aboutDescription,
                                  count: (pc.aboutWhatToExpect || []).length,
                                  unit: "ações",
                                },
                                {
                                  key: "video",
                                  title: pc.videoTitle || "Vídeo",
                                  preview: pc.videoDescription,
                                  count: pc.videoUrl ? 1 : 0,
                                  unit: "vídeo",
                                },
                                {
                                  key: "rules",
                                  title: "Regras de Execução",
                                  preview: (pc.rules || [])[0],
                                  count: (pc.rules || []).length,
                                  unit: "regras",
                                },
                                {
                                  key: "confirm",
                                  title: "Confirmar Início",
                                  preview: null,
                                  count: (pc.confirmChecklist || []).length,
                                  unit: "itens",
                                },
                              ];
                              return (
                                <div
                                  key={test.id}
                                  className="rounded-xl border overflow-hidden"
                                >
                                  {/* Cabeçalho do teste */}
                                  <div className="flex items-start gap-3 p-4 bg-muted/30 border-b">
                                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                                      <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm">
                                        {test.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {test.linkedTaskName} · {test.code}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-xs shrink-0"
                                      onClick={() => {
                                        setSelectedCircuitTest(test);
                                        setIsCircuitPreviewOpen(true);
                                      }}
                                    >
                                      <EyePreview className="h-3.5 w-3.5" />
                                      Simular
                                    </Button>
                                  </div>

                                  {/* Stepper das 5 etapas */}
                                  <div className="divide-y">
                                    {STEP_DEFS.map((def, i) => {
                                      const sd = stepData[i];
                                      const Icon = def.Icon;
                                      return (
                                        <div
                                          key={def.key}
                                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                                        >
                                          {/* Número e ícone */}
                                          <div className="flex items-center gap-2 shrink-0 w-32">
                                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-bold">
                                              {i + 1}
                                            </span>
                                            <div
                                              className={`h-7 w-7 rounded-lg ${def.bg} flex items-center justify-center`}
                                            >
                                              <Icon
                                                className={`h-3.5 w-3.5 ${def.color}`}
                                              />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                              {def.label}
                                            </span>
                                          </div>
                                          {/* Conteúdo resumido */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">
                                              {sd.title}
                                            </p>
                                            {sd.preview && (
                                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {sd.preview}
                                              </p>
                                            )}
                                          </div>
                                          {/* Badge de quantidade */}
                                          {sd.count > 0 && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
                                              {sd.count} {sd.unit}
                                            </span>
                                          )}
                                          {def.key === "video" &&
                                            sd.count === 0 && (
                                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 shrink-0">
                                                sem vídeo
                                              </span>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── CHECKLIST DE QUALIFICAÇÃO ── */}
                    <TabsContent value="checklist" className="space-y-4 mt-3">
                      {(() => {
                        const allTests =
                          (selectedProduct as any).nomadTests || [];
                        const testsWithCL = allTests.filter(
                          (t: any) => t.qualificationChecklist,
                        );
                        const testsWithout = allTests.filter(
                          (t: any) => !t.qualificationChecklist,
                        );

                        const checklistHeader = (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-base font-bold leading-tight">
                                Checklists de qualificação
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Transforme testes em critérios claros de conferência e aprovação.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                className="btn-brand border-0 gap-1.5 h-9"
                                onClick={() => setViewActiveTab("nomad-tests")}
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                Ir para Testes
                              </Button>
                              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                Entenda a relação
                              </button>
                            </div>
                          </div>
                        );

                        const checklistStats = (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <ClipboardCheck className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-base font-bold">{testsWithCL.length}</p>
                                <p className="text-[11px] text-muted-foreground">checklists</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <ListChecks className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-base font-bold">
                                  {testsWithCL.reduce(
                                    (a: number, t: any) =>
                                      a +
                                      t.qualificationChecklist.sections.reduce(
                                        (b: number, s: any) => b + s.items.length,
                                        0,
                                      ),
                                    0,
                                  )}
                                </p>
                                <p className="text-[11px] text-muted-foreground">critérios</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <Link2 className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-[11px] text-muted-foreground">Dependência</p>
                                <p className="text-sm font-bold">Testes</p>
                              </div>
                            </div>
                          </div>
                        );

                        if (allTests.length === 0) {
                          return (
                            <div className="space-y-4">
                              {checklistHeader}
                              {checklistStats}
                              <div className="rounded-2xl border border-dashed border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/10 px-6 py-10 flex flex-col items-center text-center gap-3">
                                <ClipboardCheck className="h-12 w-12 text-violet-400" />
                                <p className="text-base font-bold">
                                  Nenhum checklist disponível
                                </p>
                                <p className="text-sm text-muted-foreground max-w-md">
                                  Cadastre testes para gerar checklists de qualificação e acompanhar evidências antes da aprovação.
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  <Button
                                    size="sm"
                                    className="btn-brand border-0"
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                  >
                                    Cadastrar teste
                                  </Button>
                                  <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                    Ver modelo de checklist
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                    <Target className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Critérios objetivos
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      O que precisa ser validado
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                    <ImageIcon className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Evidências
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Arquivos e comprovações
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                  <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      Aprovação final
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Resultado e responsável
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {checklistHeader}
                            {checklistStats}
                            {/* Testes sem checklist configurado */}
                            {testsWithout.length > 0 && (
                              <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    {testsWithout.length} teste(s) sem checklist
                                    configurado
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {testsWithout.map((t: any) => (
                                    <span
                                      key={t.id}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                                    >
                                      {t.code} · {t.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Testes com checklist configurado */}
                            {testsWithCL.map((test: any) => {
                              const cl = test.qualificationChecklist;
                              const totalItems = cl.sections.reduce(
                                (a: number, s: any) => a + s.items.length,
                                0,
                              );
                              const requiredItems = cl.sections
                                .flatMap((s: any) => s.items)
                                .filter((i: any) => i.isRequired).length;

                              return (
                                <div
                                  key={test.id}
                                  className="rounded-xl border overflow-hidden"
                                >
                                  {/* Cabeçalho */}
                                  <div className="flex items-start gap-3 p-4 bg-muted/30 border-b">
                                    <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                      <ClipboardCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm">
                                        {test.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {test.code} · Checklist:{" "}
                                        {cl.sections.length} seções ·{" "}
                                        {totalItems} itens
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {/* Badges de regras automáticas */}
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                                        Mín {cl.passingScore}%
                                      </span>
                                      {cl.autoApproveAbove != null && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                                          Auto ≥{cl.autoApproveAbove}%
                                        </span>
                                      )}
                                      {requiredItems > 0 && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                                          {requiredItems} obrig.
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Seções e itens em modo read-only */}
                                  <div className="p-4">
                                    <ScrollArea className="max-h-[400px] pr-2">
                                      <QualificationChecklistPanel
                                        checklist={cl}
                                        readOnly={true}
                                      />
                                    </ScrollArea>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── APRESENTAÇÃO ── */}
                    <TabsContent
                      value="apresentacao"
                      className="space-y-4 mt-3"
                    >
                      {(() => {
                        const pres = ((selectedProduct as any).presentation ||
                          {}) as Record<string, any>;
                        const hasPres = !!(selectedProduct as any).presentation;

                        // Placeholder deixado pela migração da base antiga
                        // ("[DADO NÃO DISPONÍVEL NA BASE ANTIGA...]") conta
                        // como "sem dado" pra fins de exibição — mostra o
                        // banner de pendência em vez do texto literal.
                        const isPendingArr = (arr: any) => {
                          if (!Array.isArray(arr) || arr.length === 0) return true;
                          const first = arr[0];
                          const text =
                            typeof first === "string"
                              ? first
                              : first?.title || first?.step || first?.question || "";
                          return text.includes("DADO NÃO DISPONÍVEL");
                        };

                        const goEdit = () => {
                          setIsViewSheetOpen(false);
                          handleEditProduct(selectedProduct);
                        };

                        const PendingInfo = ({ label }: { label: string }) => (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3">
                            <div className="flex items-start gap-2.5">
                              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold">
                                  {label}{" "}
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 align-middle">
                                    Informação pendente
                                  </span>{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    — conteúdo não disponível na base antiga.
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Preencha este campo para deixar a apresentação completa.
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="btn-brand border-0 shrink-0"
                              onClick={goEdit}
                            >
                              Completar informação
                            </Button>
                          </div>
                        );

                        const arrayFields = [
                          "highlights",
                          "targetAudience",
                          "whatIsIncluded",
                          "deliverables",
                          "notIncluded",
                          "requirements",
                          "howToRequest",
                          "faq",
                        ];
                        const taglineFilled =
                          !!pres.tagline &&
                          !pres.tagline.includes("DADO NÃO DISPONÍVEL");
                        const filledCount =
                          arrayFields.filter((f) => !isPendingArr(pres[f]))
                            .length + (taglineFilled ? 1 : 0);
                        const isComplete =
                          hasPres && filledCount === arrayFields.length + 1;

                        const header = (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-base font-bold leading-tight">
                                Apresentação comercial
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Resumo do produto para consulta e compartilhamento.
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                isComplete
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              {isComplete ? "Completa" : "Incompleta"}
                            </span>
                          </div>
                        );

                        const SUB_TABS = [
                          { key: "resumo", label: "Resumo" },
                          { key: "destaques", label: "Destaques" },
                          { key: "escopo", label: "Escopo" },
                          { key: "entregaveis", label: "Entregáveis" },
                          { key: "contratacao", label: "Contratação" },
                          { key: "faq", label: "FAQ" },
                        ];

                        const subTabBar = (
                          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                            {SUB_TABS.map((t) => (
                              <button
                                key={t.key}
                                onClick={() => setPresentationSubTab(t.key)}
                                className={`relative pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors ${
                                  presentationSubTab === t.key
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                              >
                                {t.label}
                                {presentationSubTab === t.key && (
                                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        );

                        // Tagline curta = headline em destaque; quando o campo
                        // veio da migração antiga como um parágrafo inteiro
                        // (comum nesta base), usamos o nome do produto como
                        // headline e mostramos o texto longo como corpo,
                        // limitado visualmente pra não estourar o card.
                        const shortTagline =
                          taglineFilled && pres.tagline.length <= 140
                            ? pres.tagline
                            : null;
                        const heroBody = taglineFilled
                          ? shortTagline
                            ? selectedProduct.summaryDescription
                            : pres.tagline
                          : selectedProduct.summaryDescription;

                        // ── RESUMO ──────────────────────────────────────────
                        const resumoContent = (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 to-blue-50/60 dark:from-purple-950/20 dark:to-blue-950/10 p-5">
                              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                                {selectedProduct.category}
                              </p>
                              <p className="text-xl font-bold leading-tight">
                                {shortTagline || selectedProduct.name}
                              </p>
                              {heroBody && (
                                <p className="text-sm text-muted-foreground mt-2 max-w-2xl line-clamp-6 whitespace-pre-line">
                                  {heroBody}
                                </p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                                <p className="text-lg font-bold">
                                  {(pres.whatIsIncluded || []).length || "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Itens incluídos
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                                <p className="text-lg font-bold">
                                  {(pres.deliverables || []).length || "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Entregáveis
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                                <p className="text-lg font-bold">
                                  {selectedProduct.deliveryDays
                                    ? `${selectedProduct.deliveryDays} dias`
                                    : "—"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Prazo estimado
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
                                <p className="text-lg font-bold">
                                  {formatCurrency(selectedProduct.finalPrice || 0)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Investimento
                                </p>
                              </div>
                            </div>
                            {!isPendingArr(pres.highlights) ? (
                              <div>
                                <p className="text-sm font-bold mb-2">
                                  Destaques principais
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {pres.highlights
                                    .slice(0, 4)
                                    .map((h: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-3"
                                      >
                                        <span className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                          <CheckCircle2 className="h-4 w-4" />
                                        </span>
                                        <p className="text-sm font-medium leading-snug">
                                          {h}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : (
                              <PendingInfo label="Destaques principais" />
                            )}
                          </div>
                        );

                        // ── DESTAQUES ───────────────────────────────────────
                        const destaquesContent = (
                          <div className="space-y-4">
                            {!isPendingArr(pres.highlights) ? (
                              <div className="space-y-1.5">
                                {pres.highlights.map((h: string, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5"
                                  >
                                    <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      ✓
                                    </span>
                                    <span>{h}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <PendingInfo label="Destaques" />
                            )}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Para quem é
                              </p>
                              {!isPendingArr(pres.targetAudience) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {pres.targetAudience.map(
                                    (t: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                                      >
                                        {t}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <PendingInfo label="Para quem é" />
                              )}
                            </div>
                          </div>
                        );

                        // ── ESCOPO ──────────────────────────────────────────
                        const escopoContent = (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Para quem é
                              </p>
                              {!isPendingArr(pres.targetAudience) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {pres.targetAudience.map(
                                    (t: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                                      >
                                        {t}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <PendingInfo label="Para quem é" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-bold">
                                  O que está incluído
                                </p>
                                {!isPendingArr(pres.whatIsIncluded) && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    {pres.whatIsIncluded.length} itens
                                  </span>
                                )}
                              </div>
                              {!isPendingArr(pres.whatIsIncluded) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {pres.whatIsIncluded.map(
                                    (item: any, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                                      >
                                        <span className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          {i + 1}
                                        </span>
                                        <div>
                                          <p className="text-sm font-semibold">
                                            {item.title}
                                          </p>
                                          {item.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <PendingInfo label="O que está incluído" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-bold">Não incluído</p>
                                {!isPendingArr(pres.notIncluded) && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {pres.notIncluded.length} itens
                                  </span>
                                )}
                              </div>
                              {!isPendingArr(pres.notIncluded) ? (
                                <div className="space-y-1">
                                  {pres.notIncluded.map(
                                    (d: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                        {d}
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <PendingInfo label="Não incluído" />
                              )}
                            </div>
                          </div>
                        );

                        // ── COMO CONTRATAR (reaproveitado em Entregáveis e Contratação) ──
                        const comoContratarBox = (
                          <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10 p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <p className="text-sm font-bold flex items-center gap-1.5">
                                <Link2 className="h-3.5 w-3.5 text-purple-500" />
                                Como contratar
                              </p>
                              {!isPendingArr(pres.howToRequest) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                  {pres.howToRequest.length} etapa
                                  {pres.howToRequest.length !== 1 ? "s" : ""} cadastrada
                                  {pres.howToRequest.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {!isPendingArr(pres.howToRequest) ? (
                              <div className="space-y-2">
                                {pres.howToRequest.map((s: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between gap-2.5 text-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {i + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-medium truncate">
                                          {s.step || `Etapa ${i + 1}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {s.description || "Descrição não informada"}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs shrink-0"
                                      onClick={goEdit}
                                    >
                                      Completar etapa
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <PendingInfo label="Como contratar" />
                            )}
                          </div>
                        );

                        const faqBox = (
                          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <p className="text-sm font-bold flex items-center gap-1.5">
                                <FileQuestion className="h-3.5 w-3.5 text-blue-500" />
                                FAQ
                              </p>
                              {!isPendingArr(pres.faq) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  {pres.faq.length} pergunta
                                  {pres.faq.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {!isPendingArr(pres.faq) ? (
                              <div className="space-y-2">
                                {pres.faq.map((f: any, i: number) => (
                                  <details
                                    key={i}
                                    className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-slate-900 px-3 py-2"
                                  >
                                    <summary className="text-sm font-semibold cursor-pointer">
                                      {f.question || "Pergunta cadastrada"}
                                    </summary>
                                    {f.answer && (
                                      <p className="text-xs text-muted-foreground mt-1.5">
                                        {f.answer}
                                      </p>
                                    )}
                                  </details>
                                ))}
                              </div>
                            ) : (
                              <PendingInfo label="FAQ" />
                            )}
                          </div>
                        );

                        // ── ENTREGÁVEIS ─────────────────────────────────────
                        const entregaveisContent = (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-4">
                                <p className="text-sm font-bold flex items-center gap-1.5 mb-2 text-red-700 dark:text-red-400">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Não incluído
                                </p>
                                {!isPendingArr(pres.notIncluded) ? (
                                  <div className="space-y-1.5">
                                    {pres.notIncluded.map(
                                      (d: string, i: number) => (
                                        <div
                                          key={i}
                                          className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300"
                                        >
                                          <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                          {d}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <PendingInfo label="Não incluído" />
                                )}
                              </div>
                              <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-sm font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Entregas e entregáveis
                                  </p>
                                  {!isPendingArr(pres.deliverables) && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                      {pres.deliverables.length} entregáveis
                                    </span>
                                  )}
                                </div>
                                {!isPendingArr(pres.deliverables) ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                                    {pres.deliverables.map(
                                      (d: string, i: number) => (
                                        <div
                                          key={i}
                                          className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-300"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                          {d}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <PendingInfo label="Entregas e entregáveis" />
                                )}
                              </div>
                            </div>

                            {!isPendingArr(pres.requirements) ? (
                              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                                  Pré-requisitos do cliente
                                </p>
                                <div className="space-y-1">
                                  {pres.requirements.map(
                                    (r: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        {r}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ) : (
                              <PendingInfo label="Pré-requisitos do cliente" />
                            )}

                            {comoContratarBox}
                            {faqBox}
                          </div>
                        );

                        const contratacaoContent = comoContratarBox;
                        const faqContent = faqBox;

                        const CONTENT: Record<string, React.ReactNode> = {
                          resumo: resumoContent,
                          destaques: destaquesContent,
                          escopo: escopoContent,
                          entregaveis: entregaveisContent,
                          contratacao: contratacaoContent,
                          faq: faqContent,
                        };

                        return (
                          <div className="space-y-4">
                            {header}
                            {subTabBar}
                            {CONTENT[presentationSubTab]}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    <TabsContent value="nomades-habilitados" className="space-y-4 mt-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-base font-bold leading-tight">
                            Desempenho do produto
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            Acompanhe resultados reais de execução, qualidade e aprovação.
                            <button className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                              Como são calculadas as métricas
                              <Info className="h-3 w-3" />
                            </button>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                          <span className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Play className="h-4 w-4" />
                          </span>
                          <div className="leading-tight">
                            <p className="text-lg font-bold">0</p>
                            <p className="text-[11px] text-muted-foreground">execuções</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                          <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <ThumbsUp className="h-4 w-4" />
                          </span>
                          <div className="leading-tight">
                            <p className="text-lg font-bold">—</p>
                            <p className="text-[11px] text-muted-foreground">taxa de aprovação</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                          <span className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ClipboardCheck className="h-4 w-4" />
                          </span>
                          <div className="leading-tight">
                            <p className="text-lg font-bold">0</p>
                            <p className="text-[11px] text-muted-foreground">tarefas concluídas</p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                          <span className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                          </span>
                          <div className="leading-tight">
                            <p className="text-lg font-bold">0</p>
                            <p className="text-[11px] text-muted-foreground">nômades habilitados</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3">
                        <Info className="h-4 w-4 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          Os indicadores serão exibidos após a primeira execução real deste produto.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-8 flex items-center gap-6">
                        <div className="h-20 w-28 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <Gauge className="h-8 w-8 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-bold">
                            Ainda não há dados de desempenho
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                            As métricas aparecerão aqui assim que este produto tiver execuções reais.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                          >
                            Ver como funciona
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold mb-2">O que será acompanhado</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                            <span className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <BarChart3 className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold leading-tight">Execuções</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Volume e evolução no período
                              </p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                            <span className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold leading-tight">Qualidade</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Avaliações e taxa de aprovação
                              </p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                            <span className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Clock className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold leading-tight">Produtividade</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Tarefas concluídas e tempo médio
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="complementares" className="space-y-4 mt-3">
                      {(() => {
                        const complementaryIds: string[] =
                          (selectedProduct as any).complementaryProductIds || [];
                        const complementaryProducts = complementaryIds
                          .map((id) => safeProducts.find((p) => p.id === id))
                          .filter(Boolean) as Product[];

                        const complHeader = (
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-base font-bold leading-tight">
                                Produtos complementares
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Crie combinações que ampliam a solução e facilitam novas contratações.
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                Como funciona
                              </button>
                              <Button
                                size="sm"
                                className="btn-brand border-0 gap-1.5 h-9"
                                onClick={() => {
                                  setIsViewSheetOpen(false);
                                  handleEditProduct(selectedProduct);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Vincular produto
                              </Button>
                            </div>
                          </div>
                        );

                        const mandatoryCompl = complementaryProducts.filter(
                          (cp: any) => cp.isComplementaryMandatory,
                        ).length;

                        const complStats = (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Link2 className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-lg font-bold">
                                  {complementaryProducts.length}
                                </p>
                                <p className="text-[11px] text-muted-foreground">vinculados</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <CheckSquare className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-lg font-bold">{mandatoryCompl}</p>
                                <p className="text-[11px] text-muted-foreground">obrigatórios</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                              <span className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Circle className="h-4 w-4" />
                              </span>
                              <div className="leading-tight">
                                <p className="text-lg font-bold">
                                  {complementaryProducts.length - mandatoryCompl}
                                </p>
                                <p className="text-[11px] text-muted-foreground">opcionais</p>
                              </div>
                            </div>
                          </div>
                        );

                        const howItHelps = (
                          <div>
                            <p className="text-sm font-bold mb-2">
                              Como os complementares ajudam
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                <span className="h-9 w-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                                  <TrendingUp className="h-4 w-4" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">
                                    Venda adicional
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Sugira serviços relacionados
                                  </p>
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                <span className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  <Puzzle className="h-4 w-4" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">
                                    Combinação de soluções
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Monte ofertas mais completas
                                  </p>
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 flex items-start gap-3">
                                <span className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <Users className="h-4 w-4" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">
                                    Jornada do cliente
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Conecte os próximos passos
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );

                        if (complementaryProducts.length === 0) {
                          return (
                            <div className="space-y-4">
                              {complHeader}
                              {complStats}
                              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20 px-6 py-8 flex items-center gap-6">
                                <div className="flex items-center gap-1 shrink-0">
                                  {[0, 1, 2].map((i) => (
                                    <Fragment key={i}>
                                      <div className="h-12 w-12 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-indigo-300" />
                                      </div>
                                      {i < 2 && (
                                        <Link2 className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
                                      )}
                                    </Fragment>
                                  ))}
                                </div>
                                <div className="flex-1">
                                  <p className="text-base font-bold">
                                    Nenhum produto complementar vinculado
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                                    Vincule serviços relacionados para sugerir combinações e construir uma jornada mais completa.
                                  </p>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                  <Button
                                    size="sm"
                                    className="btn-brand border-0"
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                  >
                                    Vincular primeiro produto
                                  </Button>
                                  <button
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                    onClick={() => {
                                      setIsViewSheetOpen(false);
                                      handleEditProduct(selectedProduct);
                                    }}
                                  >
                                    Editar vínculos
                                  </button>
                                </div>
                              </div>
                              {howItHelps}
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-4">
                            {complHeader}
                            {complStats}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {complementaryProducts.map((cp) => (
                                <div
                                  key={cp.id}
                                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                  onClick={() => handleViewProduct(cp)}
                                >
                                  {cp.productImagePreview || (cp as any).image ? (
                                    <img
                                      src={cp.productImagePreview || (cp as any).image}
                                      alt={cp.name}
                                      className="h-10 w-10 rounded-lg object-cover border shrink-0"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                                      <Package className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{cp.name}</p>
                                    <p className="text-xs text-emerald-600 font-semibold">
                                      {formatCurrency(cp.finalPrice || 0)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {howItHelps}
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Always-visible footer with product summary */}
              <div className="shrink-0 border-t bg-background">
                {!canActivateProduct(selectedProduct) && !selectedProduct.isActive && (
                  <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Produto sem estrutura operacional mínima.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Adicione ao menos um modelo de tarefa ativo antes de ativar ou contratar este produto.
                    </p>
                  </div>
                )}
                {/* Data strip */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedProduct.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full inline-block ${
                        selectedProduct.isActive
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    {selectedProduct.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {selectedProduct.category}
                  </span>
                  {getContractabilitySummary(selectedProduct)?.isContractable === false && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Estrutura incompleta
                      </span>
                    </>
                  )}
                  <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedProduct.finalPrice || 0)}
                  </span>
                  {selectedProduct.recurrence && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedProduct.recurrence}
                      </span>
                    </>
                  )}
                  {selectedProduct.deliveryDays && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedProduct.deliveryDays} dias
                      </span>
                    </>
                  )}
                  {(selectedProduct.tasks || []).length > 0 && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {(selectedProduct.tasks || []).length} tarefa
                        {(selectedProduct.tasks || []).length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                  <Button
                    size="sm"
                    className="btn-brand border-0 shrink-0"
                    onClick={() => {
                      setIsViewSheetOpen(false);
                      handleEditProduct(selectedProduct);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Produto
                  </Button>
                </div>
                {/* Action buttons */}
                <div className="px-5 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsViewSheetOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </EmbeddedSlideScreen>

      {/* Circuito Pré-Habilitação — Preview Admin */}
      <CircuitoPreHabilitacaoModal
        test={selectedCircuitTest}
        open={isCircuitPreviewOpen}
        onOpenChange={setIsCircuitPreviewOpen}
        previewMode={true}
      />

      {/* Sheet for creating/editing products */}
      <EmbeddedSlideScreen
        open={isProductSheetOpen}
        onClose={() => setIsProductSheetOpen(false)}
        hideHeader
        pin={
          selectedProduct
            ? {
                id: `produtos-edit-${selectedProduct.id}`,
                label: `Editar: ${selectedProduct.name}`,
                icon: Pencil,
                path: "/admin/produtos",
                activateKey: `edit:${selectedProduct.id}`,
              }
            : {
                id: "produtos-create",
                label: "Novo Produto",
                icon: Plus,
                path: "/admin/produtos",
                activateKey: "create",
              }
        }
        footer={
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsProductSheetOpen(false);
                resetForm();
              }}
              className="gap-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
            {selectedProduct && (
              <Popover
                open={versionHistory.open}
                onOpenChange={(open) =>
                  open ? handleOpenVersionHistory() : setVersionHistory((v) => ({ ...v, open: false }))
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <History className="h-3.5 w-3.5" />
                    Histórico
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-0 max-h-96 overflow-y-auto">
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Histórico de versões
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Snapshot automático a cada vez que o produto é salvo
                    </p>
                  </div>
                  {versionHistory.loading && (
                    <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando…
                    </div>
                  )}
                  {versionHistory.error && (
                    <p className="px-3 py-3 text-xs text-red-600 dark:text-red-400">
                      {versionHistory.error}
                    </p>
                  )}
                  {!versionHistory.loading && !versionHistory.error && versionHistory.versions.length === 0 && (
                    <p className="px-3 py-4 text-xs text-slate-400">
                      Nenhuma versão anterior ainda — o histórico começa a partir do próximo salvamento.
                    </p>
                  )}
                  {versionHistory.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {new Date(v.created_at).toLocaleString("pt-BR")}
                        </p>
                        {v.name && (
                          <p className="text-[11px] text-slate-400 truncate">{v.name}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={versionHistory.restoring === v.id}
                        onClick={() => handleRequestRestoreVersion(v)}
                        className="h-7 px-2 text-[11px] gap-1 shrink-0"
                      >
                        {versionHistory.restoring === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="gap-1.5 text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Rascunho
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScheduleLaunch}
                className="gap-1.5 text-xs"
              >
                <Clock className="h-3.5 w-3.5" />
                Agendar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsSaveConfirmOpen(true)}
                disabled={isSavingProduct}
                className="btn-brand gap-1.5 text-xs"
              >
                {isSavingProduct ? (
                  <ButtonLoader text="Salvando…" />
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Salvar Produto
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 w-full">
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ background: "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))" }}
          >
            <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
              {productFormData.name ||
                (selectedProduct ? "Editar Produto" : "Novo Produto")}
              <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
                {selectedProduct
                  ? `Editando • ${(productFormData.categories || []).join(", ") || productFormData.category || (selectedProduct as any)?.category || ""}`
                  : "Cadastro de novo produto"}
              </p>
            </div>
            <button
              onClick={() => setIsProductSheetOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {(missingRequiredItems.length > 0 ||
                missingRecommendedItems.length > 0) && (
                <div className="mb-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800/60">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Cadastro incompleto
                    </span>
                    <span className="text-xs text-amber-700/80 dark:text-amber-400/80">
                      {missingRequiredItems.length > 0
                        ? `${missingRequiredItems.length} obrigatório(s)`
                        : ""}
                      {missingRequiredItems.length > 0 &&
                      missingRecommendedItems.length > 0
                        ? " · "
                        : ""}
                      {missingRecommendedItems.length > 0
                        ? `${missingRecommendedItems.length} recomendado(s)`
                        : ""}{" "}
                      pendente(s) — clique para ir direto ao campo
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3">
                    {missingRequiredItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => jumpToProductField(item.tab, item.key)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-700 dark:text-red-400 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    ))}
                    {missingRecommendedItems.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => jumpToProductField(item.tab, item.key)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-400 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Tabs
                value={productFormTab}
                onValueChange={setProductFormTab}
                className="space-y-3"
              >
                <div className="-mx-6 px-6 sticky top-0 z-10 bg-background border-b border-slate-200 dark:border-slate-700">
                  <TooltipProvider>
                    <TabsList className="w-full justify-start bg-transparent p-0 rounded-none gap-0 h-auto border-0 flex-wrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="info"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <Package className="h-3.5 w-3.5" />
                            Informações
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Nome, ID, categoria, preço, imagem de capa e galeria
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="apresentacao"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Apresentação
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Vídeo, texto de apresentação, benefícios e
                            informações complementares
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="complementares"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Complementares
                            {productFormData.complementaryProducts.length >
                              0 && (
                              <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center justify-center">
                                {productFormData.complementaryProducts.length}
                              </span>
                            )}
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Produtos vinculados como complementares (upsell /
                            cross-sell)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="solicitar"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <ListChecks className="h-3.5 w-3.5" />
                            Solicitação
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Briefing, contratos e o que solicitar ao cliente na
                            contratação
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="tarefas"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Tarefas
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Tarefas e etapas de execução vinculadas a este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="customizacao"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Opções
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Variações de escopo e add-ons disponíveis para este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="questionario"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <FileQuestion className="h-3.5 w-3.5" />
                            Questionário
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Perguntas enviadas ao cliente ao contratar este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TabsList>
                  </TooltipProvider>
                </div>

                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 bg-card p-4 rounded-lg border">
                      <TooltipProvider>
                        <Label className="text-sm font-semibold flex items-center gap-1">
                          ID do Produto
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Gerado automaticamente com base na categoria
                                escolhida
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                      </TooltipProvider>
                      <Input
                        value={
                          productFormData.productId ||
                          selectedProduct?.id ||
                          `PROD-${Date.now().toString().slice(-6)}`
                        }
                        readOnly
                        className="text-sm bg-muted"
                      />
                    </div>

                    <div id="product-field-name" className="col-span-2 space-y-2 bg-card p-4 rounded-lg border scroll-mt-16">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-semibold">
                          Nome do Produto <span className="text-red-500">*</span>
                        </Label>
                        <AiFieldButton fieldName="name" />
                      </div>
                      <Input
                        placeholder="Ex: Pauta de Conteúdo com 20 temas"
                        value={productFormData.name}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            name: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* ── Cover Image ── */}
                  <div id="product-field-productImage" className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden scroll-mt-16">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Imagem de Capa
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · aparece no catálogo e nos cards de produto
                      </span>
                      {productFormData.productImagePreview && (
                        <button
                          type="button"
                          onClick={() =>
                            setProductFormData({
                              ...productFormData,
                              productImagePreview: "",
                            })
                          }
                          className="ml-auto flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <X className="h-3 w-3" /> Remover
                        </button>
                      )}
                    </div>
                    <div className="bg-card">
                      {/* Large preview */}
                      <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {productFormData.productImagePreview ? (
                          <>
                            <img
                              src={productFormData.productImagePreview}
                              alt="Capa do produto"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-2 left-3">
                              <span className="text-[11px] font-semibold text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                Imagem de capa ativa
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg w-full h-full">
                              <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                              <p className="text-sm text-slate-400 font-medium">
                                Nenhuma imagem de capa
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Cole o caminho abaixo para visualizar
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* URL input */}
                      <div className="px-4 py-3 space-y-2 border-t border-slate-100 dark:border-slate-700/60">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Caminho / URL da imagem
                        </label>
                        <Input
                          placeholder="/images/products/meu-produto.svg ou https://…"
                          value={productFormData.productImagePreview}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              productImagePreview: e.target.value,
                            })
                          }
                          className="text-sm h-8 font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Tamanho recomendado: <strong>800 × 500 px</strong> ·
                          formatos aceitos: JPG, PNG, SVG, WebP
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Portfolio / Gallery ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                      <Grid3x3 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Portfólio / Galeria
                      </span>
                      {portfolioImages.length > 0 && (
                        <span className="text-[11px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                          {portfolioImages.length}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · exibido no drawer de detalhes
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPortfolioImages([
                            ...portfolioImages,
                            {
                              id: `img-${Date.now()}`,
                              url: "",
                              title: "",
                              description: "",
                              isMain: portfolioImages.length === 0,
                              sortOrder: portfolioImages.length,
                            },
                          ]);
                        }}
                        className="ml-auto flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors px-2.5 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </button>
                    </div>

                    {portfolioImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-card">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                          <Grid3x3 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          Nenhuma imagem no portfólio
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Adicione imagens para exibir na galeria do produto
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2 bg-card">
                        {/* Grid de thumbnails */}
                        <div className="grid grid-cols-3 gap-2">
                          {portfolioImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-default ${
                                img.isMain
                                  ? "border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                {img.url ? (
                                  <img
                                    src={img.url}
                                    alt={img.title || `Imagem ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                    <ImageIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                    <span className="text-[9px] text-slate-400">
                                      sem URL
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Hover overlay — ações */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (idx === 0) return;
                                    const updated = [...portfolioImages];
                                    [updated[idx - 1], updated[idx]] = [
                                      updated[idx],
                                      updated[idx - 1],
                                    ];
                                    setPortfolioImages(
                                      updated.map((item, i) => ({
                                        ...item,
                                        sortOrder: i,
                                      })),
                                    );
                                  }}
                                  disabled={idx === 0}
                                  className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center text-sm font-bold hover:bg-white disabled:opacity-25 shadow-sm transition-colors"
                                  title="Mover para esquerda"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPortfolioImages(
                                      portfolioImages.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    )
                                  }
                                  className="h-7 w-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (idx === portfolioImages.length - 1)
                                      return;
                                    const updated = [...portfolioImages];
                                    [updated[idx], updated[idx + 1]] = [
                                      updated[idx + 1],
                                      updated[idx],
                                    ];
                                    setPortfolioImages(
                                      updated.map((item, i) => ({
                                        ...item,
                                        sortOrder: i,
                                      })),
                                    );
                                  }}
                                  disabled={idx === portfolioImages.length - 1}
                                  className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center text-sm font-bold hover:bg-white disabled:opacity-25 shadow-sm transition-colors"
                                  title="Mover para direita"
                                >
                                  →
                                </button>
                              </div>

                              {/* Badges fixas */}
                              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                                {img.isMain ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                                    ★ Destaque
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Separador */}
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                        {/* Lista compacta de campos por imagem */}
                        <div className="space-y-2">
                          {portfolioImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className={`rounded-lg border p-2.5 space-y-2 transition-all ${
                                img.isMain
                                  ? "border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/10"
                                  : "border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  Imagem {idx + 1}
                                  {img.isMain ? " · Destaque" : ""}
                                </span>
                                {!img.isMain && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPortfolioImages(
                                        portfolioImages.map((item, i) => ({
                                          ...item,
                                          isMain: i === idx,
                                        })),
                                      )
                                    }
                                    className="ml-auto text-[11px] font-medium text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    Definir como destaque
                                  </button>
                                )}
                              </div>
                              <Input
                                placeholder="URL /images/products/… ou https://…"
                                value={img.url}
                                onChange={(e) => {
                                  const updated = [...portfolioImages];
                                  updated[idx] = {
                                    ...updated[idx],
                                    url: e.target.value,
                                  };
                                  setPortfolioImages(updated);
                                }}
                                className="text-xs h-7 px-2 font-mono"
                              />
                              <Input
                                placeholder="Título (opcional)"
                                value={img.title || ""}
                                onChange={(e) => {
                                  const updated = [...portfolioImages];
                                  updated[idx] = {
                                    ...updated[idx],
                                    title: e.target.value,
                                  };
                                  setPortfolioImages(updated);
                                }}
                                className="text-xs h-7 px-2"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Classificação e Preço ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Classificação e Preço
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div id="product-field-categories" className="space-y-2 col-span-2 scroll-mt-16">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Categoria <span className="text-red-500">*</span>{" "}
                          <span className="text-slate-400 font-normal">(selecione uma ou mais)</span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Design e Criação",
                            "Mídias e Conteúdo",
                            "Social Media e Publicações",
                            "Performance e Anúncios Patrocinados",
                            "Soluções Web",
                            "Fotografia e Imagem",
                            "Desenvolvimento",
                            "Marketing",
                          ].map((cat) => {
                            const selected = (productFormData.categories || []).includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  const current = productFormData.categories || [];
                                  setProductFormData({
                                    ...productFormData,
                                    categories: selected
                                      ? current.filter((c) => c !== cat)
                                      : [...current, cat],
                                    category: selected && current[0] === cat
                                      ? current[1] || ""
                                      : current[0] === cat || current.length === 0 ? cat : current[0],
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                  selected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TooltipProvider>
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            Recorrência
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Avulso = cobrado por pedido · Mensal =
                                  assinatura
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <Select
                          value={productFormData.recurrence}
                          onValueChange={(value) =>
                            setProductFormData({
                              ...productFormData,
                              recurrence: value,
                            })
                          }
                        >
                          <SelectTrigger className="text-sm h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Avulso">Avulso</SelectItem>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                            <SelectItem value="Avulso e Mensal">
                              Avulso e Mensal
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/*
                        Regra de aprovação do produto. Mora aqui e não no
                        projeto porque quem determina se o cliente confere é o
                        tipo de entrega. O valor é copiado para cada tarefa na
                        geração, então mudar depois não altera contratações
                        que já aconteceram.
                      */}
                      <div className="space-y-2">
                        <TooltipProvider>
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            Aprovação do cliente
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Ligado: depois do aceite da agência, a tarefa
                                  ainda espera o aceite do cliente para
                                  encerrar. Desligado: o aceite da agência já
                                  encerra. Vale só para tarefas geradas daqui
                                  em diante.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <div className="flex items-center gap-2.5 h-8">
                          <Switch
                            checked={productFormData.exigeAprovacaoCliente}
                            onCheckedChange={(checked) =>
                              setProductFormData({
                                ...productFormData,
                                exigeAprovacaoCliente: checked,
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {productFormData.exigeAprovacaoCliente
                              ? "Cliente aprova a entrega"
                              : "Agência encerra sozinha"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TooltipProvider>
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            Preço (Calculado){" "}
                            <span className="text-red-500">*</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Calculado automaticamente pelas tarefas. Use
                                  “Editar” para ajuste manual com senha.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <div className="flex gap-2">
                          <Input
                            placeholder="R$ 0,00"
                            value={
                              productFormData.price ||
                              formatCurrency(calculateAutomaticPrice())
                            }
                            readOnly
                            className="text-sm h-8 bg-emerald-50 dark:bg-emerald-950/20 font-semibold text-emerald-700 dark:text-emerald-400"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleEditPrice}
                                  className="h-8 px-2 bg-transparent shrink-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Editar preço manualmente (requer senha de
                                  administrador)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleResearchPricing}
                                  disabled={pricingResearch.loading}
                                  className="h-8 px-2 bg-transparent shrink-0 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"
                                >
                                  {pricingResearch.loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Pesquisar preço de mercado com IA (busca real
                                  na internet: freelancer, agência, região)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {(pricingResearch.loading ||
                        pricingResearch.text ||
                        pricingResearch.error) && (
                        <div className="col-span-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-200 dark:border-violet-800/60">
                            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                            <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                              Pesquisa de preço de mercado (IA)
                            </span>
                          </div>
                          <div className="p-4 space-y-3">
                            {pricingResearch.loading && (
                              <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Pesquisando preços atuais na internet…
                              </div>
                            )}
                            {pricingResearch.error && (
                              <p className="text-sm text-red-600 dark:text-red-400">
                                {pricingResearch.error}
                              </p>
                            )}
                            {pricingResearch.text && (
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {pricingResearch.text}
                              </p>
                            )}
                            {pricingResearch.sources.length > 0 && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-violet-200/60 dark:border-violet-800/40">
                                {pricingResearch.sources.map((s, i) => (
                                  <a
                                    key={i}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate max-w-[220px]"
                                  >
                                    {s.title}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <TooltipProvider>
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            Dias de Entrega{" "}
                            {!_hasEditStages && <span className="text-red-500">*</span>}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {_hasEditStages
                                    ? "Calculado automaticamente a partir das etapas do produto"
                                    : "Prazo máximo de entrega em dias corridos após o início da execução"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        {_hasEditStages ? (
                          <div className="flex items-center gap-2 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{_autoDeliveryDays}d</span>
                            <span className="text-slate-400">· calculado das {(_editStages as any[]).length} etapas</span>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            placeholder="Ex: 5"
                            value={productFormData.deliveryDays}
                            onChange={(e) =>
                              setProductFormData({
                                ...productFormData,
                                deliveryDays: e.target.value,
                              })
                            }
                            className="text-sm h-8"
                            min="0"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Tags & Subcategorias ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Tags e Subcategorias
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help ml-0.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Ajudam na busca, filtragem e organização do
                              catálogo
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-sm font-normal cursor-pointer group"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="ml-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Adicionar tag..."
                            className="h-6 w-auto text-sm border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[100px]"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Pressione Enter para adicionar.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Subcategorias
                        </Label>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.subcategories.map((subcategory) => (
                            <Badge
                              key={subcategory}
                              variant="secondary"
                              className="text-sm font-normal cursor-pointer group"
                            >
                              {subcategory}
                              <button
                                onClick={() => toggleSubcategory(subcategory)}
                                className="ml-1.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {availableSubcategories
                            .filter(
                              (sub) =>
                                !productFormData.subcategories.includes(sub),
                            )
                            .map((sub) => (
                              <Button
                                key={sub}
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSubcategory(sub)}
                                className="text-sm h-7"
                              >
                                {sub}
                              </Button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Textos */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Textos de Descrição
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Descrição Detalhada{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <AiFieldButton fieldName="description" />
                        </div>
                        <Textarea
                          placeholder="Uma descrição completa do produto, incluindo escopo, objetivos e o que o cliente receberá."
                          value={productFormData.description}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              description: e.target.value,
                            })
                          }
                          className="text-sm min-h-[150px]"
                        />
                      </div>
                      <div id="product-field-summaryDescription" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Resumo da Descrição
                          </Label>
                          <AiFieldButton fieldName="summaryDescription" />
                        </div>
                        <Textarea
                          placeholder="Um resumo conciso para listagens rápidas ou prévias."
                          value={productFormData.summaryDescription}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              summaryDescription: e.target.value,
                            })
                          }
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            Atenção na Descrição
                          </Label>
                          <AiFieldButton fieldName="descriptionAttention" />
                        </div>
                        <Textarea
                          placeholder="Qualquer informação importante que o cliente deve saber antes de comprar."
                          value={productFormData.descriptionAttention}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              descriptionAttention: e.target.value,
                            })
                          }
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Itens Inclusos e Excluídos
                      </span>
                      <span className="text-sm text-slate-400 hidden sm:block">
                        · pressione Enter para adicionar
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div id="product-field-includedItems" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ Incluso
                          </Label>
                          <AiFieldButton fieldName="includedItems" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 min-h-[40px]">
                          {productFormData.includedItems.map((item, index) => (
                            <Badge
                              key={index}
                              className="text-sm font-normal bg-emerald-100 text-emerald-800 border-0 cursor-pointer group"
                            >
                              {item}
                              <button
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    includedItems:
                                      productFormData.includedItems.filter(
                                        (_, i) => i !== index,
                                      ),
                                  })
                                }
                                className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            placeholder="Adicionar..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  includedItems: [
                                    ...productFormData.includedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-sm border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[80px]"
                          />
                        </div>
                      </div>
                      <div id="product-field-notIncludedItems" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-red-500">
                            ✕ Não incluso
                          </Label>
                          <AiFieldButton fieldName="notIncludedItems" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 min-h-[40px]">
                          {productFormData.notIncludedItems.map(
                            (item, index) => (
                              <Badge
                                key={index}
                                className="text-sm font-normal bg-red-100 text-red-800 border-0 cursor-pointer group"
                              >
                                {item}
                                <button
                                  onClick={() =>
                                    setProductFormData({
                                      ...productFormData,
                                      notIncludedItems:
                                        productFormData.notIncludedItems.filter(
                                          (_, i) => i !== index,
                                        ),
                                    })
                                  }
                                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ),
                          )}
                          <Input
                            placeholder="Adicionar..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  notIncludedItems: [
                                    ...productFormData.notIncludedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-sm border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="apresentacao" className="space-y-3 mt-3">
                  {/* Mídia */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <PlayCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Mídia e Texto
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · exibido na página do produto para o cliente
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Vídeo de Apresentação (URL){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Link className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={productFormData.deliveryVideoUrl}
                            onChange={(e) =>
                              setProductFormData({
                                ...productFormData,
                                deliveryVideoUrl: e.target.value,
                              })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div id="product-field-presentation" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Texto de Apresentação
                          </Label>
                          <AiFieldButton fieldName="presentation" />
                        </div>
                        <Textarea
                          placeholder="Descreva o que o produto faz e seus principais benefícios."
                          value={productFormData.presentation}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              presentation: e.target.value,
                            })
                          }
                          className="text-sm min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Apresentação comercial — campos estruturados (Ver Detalhes → Apresentação) */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <LayoutTemplate className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Apresentação Comercial
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · exibido nas sub-abas de "Apresentação" em Ver Detalhes
                      </span>
                    </div>
                    <div className="p-4 space-y-4">
                      <StringListField
                        label="Destaques"
                        items={presentationDraft.highlights}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, highlights: v })
                        }
                        placeholder="Ex: Cadastro de até 10 produtos"
                      />
                      <StringListField
                        label="Para quem é"
                        items={presentationDraft.targetAudience}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, targetAudience: v })
                        }
                        placeholder="Ex: Lojistas que querem vender online"
                      />
                      <TitleDescListField
                        label="O que está incluído"
                        items={presentationDraft.whatIsIncluded}
                        onChange={(v) =>
                          setPresentationDraft({
                            ...presentationDraft,
                            whatIsIncluded: v as { title: string; description: string }[],
                          })
                        }
                        titleKey="title"
                        titlePlaceholder="Ex: Criação e configuração da loja"
                      />
                      <StringListField
                        label="Entregáveis"
                        items={presentationDraft.deliverables}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, deliverables: v })
                        }
                        placeholder="Ex: Loja publicada e configurada"
                      />
                      <StringListField
                        label="Não incluído"
                        items={presentationDraft.notIncluded}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, notIncluded: v })
                        }
                        placeholder="Ex: Criação de conteúdo"
                      />
                      <StringListField
                        label="Pré-requisitos do cliente"
                        items={presentationDraft.requirements}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, requirements: v })
                        }
                        placeholder="Ex: Ter conta ativa na plataforma"
                      />
                      <TitleDescListField
                        label="Como contratar"
                        items={presentationDraft.howToRequest}
                        onChange={(v) =>
                          setPresentationDraft({
                            ...presentationDraft,
                            howToRequest: v as { step: string; description: string }[],
                          })
                        }
                        titleKey="step"
                        titlePlaceholder="Ex: Envio do briefing"
                      />
                      <FaqListField
                        items={presentationDraft.faq}
                        onChange={(v) =>
                          setPresentationDraft({ ...presentationDraft, faq: v })
                        }
                      />
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Benefícios e Informações
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div id="product-field-benefits" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Benefícios Chave
                          </Label>
                          <AiFieldButton fieldName="benefits" />
                        </div>
                        <Textarea
                          placeholder="Liste os principais benefícios do produto para o cliente."
                          value={productFormData.benefits}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              benefits: e.target.value,
                            })
                          }
                          className="text-sm min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Informações Adicionais
                          </Label>
                          <AiFieldButton fieldName="information" />
                        </div>
                        <Textarea
                          placeholder="Informações técnicas ou de uso que não se encaixam em outras seções."
                          value={productFormData.information}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              information: e.target.value,
                            })
                          }
                          className="text-sm min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── COMPLEMENTARES (edit) ── */}
                <TabsContent value="complementares" className="space-y-3 mt-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Produtos Complementares
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · aparecem no Ver Detalhes como sugestão de upsell
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Currently linked */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          IDs vinculados (
                          {productFormData.complementaryProducts.length})
                        </Label>
                        {productFormData.complementaryProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {productFormData.complementaryProducts.map(
                              (id: string) => {
                                const p = safeProducts.find((x) => x.id === id);
                                return (
                                  <div
                                    key={id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 text-sm font-medium text-indigo-700 dark:text-indigo-300"
                                  >
                                    <span>{p ? `${id} · ${p.name}` : id}</span>
                                    <button
                                      type="button"
                                      className="ml-1 text-indigo-400 hover:text-red-500 transition-colors"
                                      onClick={() =>
                                        setProductFormData((prev: any) => ({
                                          ...prev,
                                          complementaryProducts:
                                            prev.complementaryProducts.filter(
                                              (x: string) => x !== id,
                                            ),
                                        }))
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Nenhum produto vinculado ainda.
                          </p>
                        )}
                      </div>
                      {/* Add product search */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Adicionar produto
                        </Label>
                        <div className="max-h-60 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                          {safeProducts
                            .filter(
                              (p) =>
                                p.id !== productFormData.productId &&
                                !productFormData.complementaryProducts.includes(
                                  p.id,
                                ),
                            )
                            .map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                onClick={() =>
                                  setProductFormData((prev: any) => ({
                                    ...prev,
                                    complementaryProducts: [
                                      ...prev.complementaryProducts,
                                      p.id,
                                    ],
                                  }))
                                }
                              >
                                <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0">
                                  {p.id}
                                </span>
                                <span className="text-sm flex-1 min-w-0 line-clamp-1">
                                  {p.name}
                                </span>
                                <Plus className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>


                <TabsContent value="solicitar" className="space-y-3 mt-3">
                  {/* Briefing */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <ClipboardCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Briefing do Cliente
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · o que o cliente deve enviar ao contratar
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div id="product-field-requestAttention" className="space-y-2 scroll-mt-16">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium text-muted-foreground">
                            O que solicitar para o cliente?
                          </Label>
                          <AiFieldButton fieldName="requestAttention" />
                        </div>
                        <Textarea
                          placeholder="Ex: Arquivo com o logo em vetor, Briefing detalhado, etc."
                          value={productFormData.requestAttention}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              requestAttention: e.target.value,
                            })
                          }
                          className="text-sm min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Itens Excluídos
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.excludedItems.map((item, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-sm font-normal cursor-pointer group"
                            >
                              {item}
                              <button
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    excludedItems:
                                      productFormData.excludedItems.filter(
                                        (_, i) => i !== index,
                                      ),
                                  })
                                }
                                className="ml-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            placeholder="Adicionar item excluído..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  excludedItems: [
                                    ...productFormData.excludedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-sm border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contratos */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileText className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Contratos e Termos
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Contrato de Pagamento Único
                        </Label>
                        <Textarea
                          placeholder="Termos específicos para pagamentos únicos."
                          value={productFormData.oneTimeContract}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              oneTimeContract: e.target.value,
                            })
                          }
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Contrato Mensal
                        </Label>
                        <Textarea
                          placeholder="Termos específicos para contratos mensais."
                          value={productFormData.monthlyContract}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              monthlyContract: e.target.value,
                            })
                          }
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Contratos Anteriores
                        </Label>
                        <Textarea
                          placeholder="Informações sobre contratos prévios que este produto pode substituir ou complementar."
                          value={productFormData.previousContracts}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              previousContracts: e.target.value,
                            })
                          }
                          className="text-sm min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tarefas" className="space-y-4 mt-3">
                  {/* ── Cabeçalho + Stats ── */}
                  <div id="product-field-tasks" className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden scroll-mt-16">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Tarefas do Produto
                      </span>
                      {productFormData.tasks.length > 0 && (
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productFormData.tasks.length}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowImportTemplateModal(true)}
                        className="ml-auto gap-1 text-sm h-7 px-2.5 bg-transparent"
                      >
                        <FileText className="h-3 w-3" />
                        Importar Modelo
                      </Button>
                    </div>
                    {productFormData.tasks.length > 0 && (
                      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-card">
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-base font-bold text-slate-700 dark:text-slate-200 leading-tight">
                            {productFormData.tasks.length}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Tarefas
                          </p>
                        </div>
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-base font-bold text-slate-700 dark:text-slate-200 leading-tight">
                            {productFormData.tasks.reduce(
                              (s, t) => s + (t.steps || []).length,
                              0,
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Etapas
                          </p>
                        </div>
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-sm font-bold text-emerald-600 leading-tight">
                            {formatCurrency(
                              productFormData.tasks.reduce(
                                (s, t) => s + (t.calculatedCost || 0),
                                0,
                              ),
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Custo Total
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Estado vazio ── */}
                  {productFormData.tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                      <Layers className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-medium text-slate-500">
                        Nenhuma tarefa cadastrada
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Adicione tarefas ou importe de um modelo
                      </p>
                    </div>
                  )}

                  {/* ── Lista de Tarefas ── */}
                  <Accordion type="multiple" className="space-y-2">
                    {productFormData.tasks.map((task, taskIndex) => (
                      <AccordionItem
                        key={task.id}
                        value={task.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-0 bg-card"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-3.5 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-200 dark:[&[data-state=open]]:border-slate-700 [&[data-state=open]]:bg-blue-50/40 dark:[&[data-state=open]]:bg-blue-950/10">
                          <div className="flex items-center gap-4 min-w-0 flex-1 pr-2">
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 text-white text-sm font-bold shrink-0 shadow-sm">
                              {taskIndex + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-snug">
                                {task.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">
                                  {(task.steps || []).length} etapa
                                  {(task.steps || []).length !== 1 ? "s" : ""}
                                </span>
                                {(task.steps || []).length > 0 && (
                                  <>
                                    <span className="text-[11px] text-muted-foreground">
                                      ·
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {(task.steps || []).reduce(
                                        (s, st) => s + (st.estimatedHours || 0),
                                        0,
                                      )}
                                      h est.
                                    </span>
                                  </>
                                )}
                                {task.canRunInParallel && (
                                  <Badge className="text-[9px] px-1.5 h-4 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0">
                                    Paralela
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge className="text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 shrink-0">
                              {formatCurrency(task.calculatedCost)}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 space-y-4 bg-card">
                            {/* Preview das etapas */}
                            {(task.steps || []).length > 0 && (
                              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                                  <ListChecks className="h-3 w-3 text-blue-500 shrink-0" />
                                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {(task.steps || []).length} Etapa
                                    {(task.steps || []).length !== 1 ? "s" : ""}
                                  </p>
                                  <span className="ml-auto text-[11px] text-muted-foreground">
                                    {(task.steps || []).reduce(
                                      (s, st) => s + (st.estimatedHours || 0),
                                      0,
                                    )}
                                    h ·{" "}
                                    {formatCurrency(
                                      (task.steps || []).reduce(
                                        (s, st) => s + (st.calculatedCost || 0),
                                        0,
                                      ),
                                    )}
                                  </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                  {(task.steps || []).map((step, si) => (
                                    <div
                                      key={step.id}
                                      className="flex items-center gap-2.5 px-3 py-2"
                                    >
                                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[9px] font-bold shrink-0">
                                        {si + 1}
                                      </span>
                                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate font-medium">
                                        {step.name}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground shrink-0">
                                        {step.estimatedHours}h
                                      </span>
                                      <span className="text-[11px] font-semibold text-emerald-600 shrink-0 min-w-14 text-right">
                                        {formatCurrency(step.calculatedCost)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Campos */}
                            <div className="grid grid-cols-4 gap-4">
                              <div className="space-y-2 col-span-3">
                                <Label className="text-sm font-semibold">
                                  Nome da Tarefa
                                </Label>
                                <Input
                                  value={task.name}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? { ...t, name: e.target.value }
                                            : t,
                                      ),
                                    })
                                  }
                                  className="text-sm h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                  Ordem
                                </Label>
                                <Input
                                  type="number"
                                  value={task.order}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                order: Number.parseInt(
                                                  e.target.value,
                                                ),
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                  className="text-sm h-8"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">
                                Descrição
                              </Label>
                              <Textarea
                                value={task.description}
                                onChange={(e) =>
                                  setProductFormData({
                                    ...productFormData,
                                    tasks: productFormData.tasks.map(
                                      (t, idx) =>
                                        idx === taskIndex
                                          ? {
                                              ...t,
                                              description: e.target.value,
                                            }
                                          : t,
                                    ),
                                  })
                                }
                                className="text-sm min-h-[72px]"
                                placeholder="Descreva o objetivo desta tarefa..."
                              />
                            </div>

                            <div className="flex items-center gap-5 flex-wrap p-4 bg-slate-50/60 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.canRunInParallel}
                                  onCheckedChange={(checked) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                canRunInParallel: checked,
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-sm font-medium">
                                  Pode rodar em paralelo
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.isLinkedToTemplate || false}
                                  onCheckedChange={(checked) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                isLinkedToTemplate: checked,
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-sm font-medium">
                                  Vinculado a Modelo
                                </Label>
                              </div>
                            </div>

                            {/* Rodapé de ações */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    tasks: productFormData.tasks.filter(
                                      (_, idx) => idx !== taskIndex,
                                    ),
                                  })
                                }
                                className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover Tarefa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                className="text-sm gap-1.5"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                Gerenciar Etapas
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm gap-1.5 bg-transparent border-dashed hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      // Add new task with default values
                      setProductFormData({
                        ...productFormData,
                        tasks: [
                          ...productFormData.tasks,
                          {
                            id: Date.now().toString(),
                            name: `Nova Tarefa ${productFormData.tasks.length + 1}`,
                            description: "",
                            specialty: "",
                            executionTime: 0,
                            executionDeadline: 0,
                            deliveryDeadline: 0,
                            adjustmentDeadline: 0,
                            approvalDeadline: 0,
                            automaticValue: 0,
                            order: productFormData.tasks.length + 1,
                            canRunInParallel: false,
                            steps: [],
                            calculatedCost: 0,
                            dependencies: [],
                            // Add other default task properties
                            code: "",
                            attentionText: "",
                            pop: "",
                            complementaryFiles: [],
                            verificationItems: [],
                            keepNextStepWithNomadLeader: false,
                            delegateToLeader: false,
                            liberateAfterSend: false,
                            requireFinalFiles: false,
                            isInternalStep: false,
                            concludeOnRejection: false,
                            hideFromClient: false,
                            hasVariations: false,
                            noConditions: false,
                            showAccess: false,
                            hideInProducts: false,
                            dontCountDeadline: false,
                            dontCountValue: false,
                            hasAdditionals: false,
                          },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Nova Tarefa
                  </Button>
                </TabsContent>

                <TabsContent value="customizacao" className="space-y-3 mt-3">
                  {/* Variações */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Variações do Produto
                      </span>
                      {productVariations.length > 0 && (
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productVariations.length}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 hidden sm:block ml-1">
                        · cada variação pode ter preço e prazo distintos
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addVariation}
                        className="ml-auto text-sm gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productVariations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <Layers className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-sm text-slate-500 font-medium">
                          Nenhuma variação cadastrada
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Adicione variações para oferecer planos distintos
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productVariations.map((variation, index) => (
                          <div key={variation.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                Variação {index + 1}
                              </span>
                              <button
                                onClick={() => removeVariation(variation.id)}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2 col-span-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Nome da Variação
                                </Label>
                                <Input
                                  value={variation.name}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: Até 2 campanhas"
                                  className="text-sm h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Preço (R$)
                                </Label>
                                <Input
                                  type="number"
                                  value={variation.price}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      price:
                                        Number.parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="text-sm h-8"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Prazo (dias)
                                </Label>
                                <Input
                                  type="number"
                                  value={variation.deadlineDays ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      deadlineDays: e.target.value
                                        ? Number.parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="Ex: 80"
                                  className="text-sm h-8"
                                  min="0"
                                />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Escopo / Entrega
                                </Label>
                                <Input
                                  value={variation.scopeDescription ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      scopeDescription: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: Gerencia até 2 campanhas simultâneas"
                                  className="text-sm h-8"
                                />
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Descrição complementar
                                </Label>
                                <Input
                                  value={variation.description ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Indicado para negócios com..."
                                  className="text-sm h-8"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add-ons */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Plus className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Add-ons
                      </span>
                      {productAddOns.length > 0 && (
                        <span className="text-[11px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                          {productAddOns.length}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addAddOn}
                        className="ml-auto text-sm gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productAddOns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <DollarSign className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-sm text-slate-500 font-medium">
                          Nenhum add-on cadastrado
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productAddOns.map((addOn, index) => (
                          <div
                            key={addOn.id}
                            className="grid grid-cols-4 gap-4 p-4 items-end"
                          >
                            <div className="space-y-2 col-span-2">
                              <Label className="text-sm font-medium text-muted-foreground">
                                Nome
                              </Label>
                              <Input
                                value={addOn.name}
                                onChange={(e) =>
                                  updateAddOn(addOn.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="text-sm h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-muted-foreground">
                                Preço
                              </Label>
                              <Input
                                type="number"
                                value={addOn.price}
                                onChange={(e) =>
                                  updateAddOn(addOn.id, {
                                    price:
                                      Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="text-sm h-8"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="space-y-2 flex-1">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Tipo
                                </Label>
                                <Select
                                  value={addOn.category}
                                  onValueChange={(value) =>
                                    updateAddOn(addOn.id, {
                                      category: value as
                                        | "creative_type"
                                        | "extra",
                                    })
                                  }
                                >
                                  <SelectTrigger className="text-sm h-8">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="creative_type">
                                      Tipo Criativo
                                    </SelectItem>
                                    <SelectItem value="extra">Extra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => removeAddOn(addOn.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="questionario" className="space-y-3 mt-3">
                  {/* Metadados do questionário */}
                  <div id="product-field-questionnaire" className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden scroll-mt-16">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileQuestion className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Configuração do Questionário
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Título do Questionário
                        </Label>
                        <Input
                          value={productFormData.questionnaire.title}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              questionnaire: {
                                ...productFormData.questionnaire,
                                title: e.target.value,
                              },
                            })
                          }
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Descrição do Questionário
                        </Label>
                        <Textarea
                          value={productFormData.questionnaire.description}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              questionnaire: {
                                ...productFormData.questionnaire,
                                description: e.target.value,
                              },
                            })
                          }
                          className="text-sm min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Perguntas */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Perguntas
                      </span>
                      {productQuestions.length > 0 && (
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productQuestions.length}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addQuestion}
                        className="ml-auto text-sm gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <FileQuestion className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-sm text-slate-500 font-medium">
                          Nenhuma pergunta cadastrada
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Adicione perguntas para o briefing do cliente
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productQuestions.map((question, index) => (
                          <div key={question.id} className="p-4 space-y-3">
                            <div className="flex items-start gap-4">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 text-sm font-bold shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1 space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Pergunta
                                </Label>
                                <Input
                                  value={question.question}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      question: e.target.value,
                                    })
                                  }
                                  className="text-sm h-8"
                                />
                              </div>
                              <button
                                onClick={() => removeQuestion(question.id)}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mt-5 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pl-9">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) =>
                                    updateQuestion(question.id, {
                                      type: value as Question["type"],
                                    })
                                  }
                                >
                                  <SelectTrigger className="text-sm h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">
                                      Texto Curto
                                    </SelectItem>
                                    <SelectItem value="multiline">
                                      Texto Longo
                                    </SelectItem>
                                    <SelectItem value="select">
                                      Seleção Única
                                    </SelectItem>
                                    <SelectItem value="multiselect">
                                      Múltipla Escolha
                                    </SelectItem>
                                    <SelectItem value="file">
                                      Upload de Arquivo
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Opções (para seleção)
                                </Label>
                                <Input
                                  value={question.options?.join(", ")}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      options: e.target.value
                                        .split(",")
                                        .map((o) => o.trim())
                                        .filter((o) => o),
                                    })
                                  }
                                  placeholder="Opção1, Opção2, ..."
                                  className="text-sm h-8 disabled:opacity-40"
                                  disabled={
                                    question.type !== "select" &&
                                    question.type !== "multiselect"
                                  }
                                />
                              </div>
                              <div className="space-y-2 flex items-end">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={question.required}
                                    onCheckedChange={(checked) =>
                                      updateQuestion(question.id, {
                                        required: checked,
                                      })
                                    }
                                  />
                                  <Label className="text-sm font-medium">
                                    Obrigatória
                                  </Label>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pl-9">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.aiAssisted}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, {
                                      aiAssisted: checked,
                                    })
                                  }
                                />
                                <Label className="text-sm font-medium text-muted-foreground">
                                  IA Assistida
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.allowsAttachment}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, {
                                      allowsAttachment: checked,
                                    })
                                  }
                                />
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Permite Anexo
                                </Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── NÔMADES E DESEMPENHO — admin only (rota já protegida) ── */}
                <TabsContent
                  value="nomades-habilitados"
                  className="space-y-3 mt-3"
                >
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Nômades Habilitados e Desempenho
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:block">
                        · visível apenas para administradores
                      </span>
                    </div>
                    <div className="p-4">
                      <ProductNomadsTab productId={selectedProduct?.id ?? ""} />
                    </div>
                  </div>
                </TabsContent>

                {/* ── COMPLEMENTARES ── */}
                <TabsContent value="complementares" className="space-y-3 mt-3">
                  {(() => {
                    if (!selectedProduct) return null;
                    const linkedIds: string[] =
                      (selectedProduct as any).complementaryProductIds || [];
                    const linkedProds = linkedIds
                      .map((id) => safeProducts.find((p) => p.id === id))
                      .filter(Boolean);
                    return (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Produtos Complementares Vinculados
                              </span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold">
                                {linkedIds.length}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setIsViewSheetOpen(false);
                                handleEditProduct(selectedProduct);
                              }}
                              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                              Editar vínculos
                            </button>
                          </div>
                          <div className="p-4">
                            {linkedProds.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                                <Link2 className="h-8 w-8 text-muted-foreground/30" />
                                <p className="text-sm font-medium text-muted-foreground">
                                  Nenhum produto complementar vinculado
                                </p>
                                <p className="text-sm text-muted-foreground/70">
                                  Clique em "Editar vínculos" para adicionar
                                  produtos complementares.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {linkedProds.map((cp: any) => (
                                  <div
                                    key={cp.id}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20"
                                  >
                                    <div className="shrink-0 h-10 w-10 rounded-lg overflow-hidden border border-indigo-100 dark:border-indigo-800 bg-gradient-to-br from-indigo-500 to-purple-600">
                                      {cp.image ? (
                                        <img
                                          src={(cp as any).image}
                                          alt={cp.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Package className="h-4 w-4 text-white/70" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold leading-tight line-clamp-1">
                                        {cp.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                          {cp.id}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          ·
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          {cp.category}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          ·
                                        </span>
                                        <span className="text-[11px] font-semibold text-emerald-600">
                                          {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                          }).format(cp.finalPrice || 0)}
                                          {cp.recurrence === "Mensal"
                                            ? "/mês"
                                            : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-[11px] shrink-0"
                                    >
                                      {cp.category}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Cross-reference: which products point to this one */}
                        {(() => {
                          const pointingToThis = safeProducts.filter((p) =>
                            ((p as any).complementaryProductIds || []).includes(
                              selectedProduct.id,
                            ),
                          );
                          if (pointingToThis.length === 0) return null;
                          return (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                                <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Produtos que indicam este como complementar
                                </span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                                  {pointingToThis.length}
                                </span>
                              </div>
                              <div className="p-4 space-y-2">
                                {pointingToThis.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <Package className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-mono">{p.id}</span>
                                    <span>·</span>
                                    <span>{p.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </EmbeddedSlideScreen>
    </div>
    </div>
    </div>
    </div>
  );
}

// ─── Editores da Apresentação comercial (aba "Ver Detalhes" → Apresentação) ──
// Campos estruturados que antes só existiam no seed/import da base antiga e
// não tinham nenhuma UI de edição — o form só editava a tagline em texto
// puro. Cada componente abaixo edita um array do objeto `presentation`.

function StringListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5"
          >
            <span className="flex-1 text-sm truncate">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-red-500 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TitleDescListField({
  label,
  items,
  onChange,
  titleKey,
  titlePlaceholder,
}: {
  label: string;
  items: { [k: string]: string }[];
  onChange: (items: { [k: string]: string }[]) => void;
  titleKey: string;
  titlePlaceholder?: string;
}) {
  const add = () =>
    onChange([...items, { [titleKey]: "", description: "" }]);
  const update = (i: number, patch: { [k: string]: string }) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}>
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Input
                value={item[titleKey] || ""}
                onChange={(e) => update(i, { [titleKey]: e.target.value })}
                placeholder={titlePlaceholder}
                className="text-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-red-500 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={item.description || ""}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Descrição (opcional)"
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqListField({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (items: { question: string; answer: string }[]) => void;
}) {
  const add = () => onChange([...items, { question: "", answer: "" }]);
  const update = (i: number, patch: Partial<{ question: string; answer: string }>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">FAQ</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}>
          <Plus className="h-3 w-3" />
          Adicionar pergunta
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <Input
                value={item.question}
                onChange={(e) => update(i, { question: e.target.value })}
                placeholder="Pergunta"
                className="text-sm"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-red-500 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Textarea
              value={item.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
              placeholder="Resposta"
              className="text-xs min-h-[60px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CatalogTaskLinkRow: sub-component for Tarefas tab ─────────────────────────────────────
function CatalogTaskLinkRow({
  link,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onToggleMandatory,
  onUpdateNotes,
  onRemove,
}: {
  link: any;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleMandatory: () => void;
  onUpdateNotes: (notes: string) => void;
  onRemove: () => void;
}) {
  const task = link.catalog_task;
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(link.notes || "");

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder (grip visual, up/down on hover) */}
        <div className="relative shrink-0 group/reorder h-5 w-4">
          <GripVertical className="h-4 w-4 text-slate-300 group-hover/reorder:opacity-0 transition-opacity" />
          <div className="absolute inset-0 flex flex-col gap-0.5 opacity-0 group-hover/reorder:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="h-3 w-3 text-slate-500" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>
          </div>
        </div>
        {/* Order badge */}
        <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        {/* Name + code + category */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate flex items-center gap-2">
            {task?.name ?? "Tarefa"}
            <span className="font-mono text-[10px] font-normal text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
              {task?.code ?? "—"}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {task?.category}
          </p>
        </div>
        {/* Mandatory toggle */}
        <button
          onClick={onToggleMandatory}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
            link.is_mandatory
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
          }`}
        >
          {link.is_mandatory && <CheckCircle2 className="h-3 w-3" />}
          {link.is_mandatory ? "Obrigatória" : "Opcional"}
        </button>
        {/* Link to Cadastro de Tarefas */}
        <a
          href="/admin/tarefas"
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir no Cadastro de Tarefas"
          className="shrink-0 text-muted-foreground hover:text-indigo-600 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {/* Remove */}
        <button
          onClick={onRemove}
          title="Remover vínculo"
          className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Notes row */}
      <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800">
        {editingNotes ? (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 text-xs px-2 py-1 border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-400"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdateNotes(notesValue);
                  setEditingNotes(false);
                }
                if (e.key === "Escape") {
                  setNotesValue(link.notes || "");
                  setEditingNotes(false);
                }
              }}
              autoFocus
              placeholder="Observação específica para este produto..."
            />
            <button
              onClick={() => {
                onUpdateNotes(notesValue);
                setEditingNotes(false);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold whitespace-nowrap"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setNotesValue(link.notes || "");
                setEditingNotes(false);
              }}
              className="text-xs text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-xs text-left w-full transition-colors"
          >
            {link.notes ? (
              <span className="text-slate-600 dark:text-slate-400">
                {link.notes}
              </span>
            ) : (
              <span className="text-muted-foreground/50 italic">
                Adicionar observação específica para este produto...
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
