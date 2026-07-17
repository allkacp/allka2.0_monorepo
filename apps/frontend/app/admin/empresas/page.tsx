// @ts-nocheck
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useNavigate, useParams } from "react-router-dom";
import { PageLoader } from "@/components/ui/loading";
import {
  STANDARD_SHELL_PANEL_CLASS,
  STANDARD_SHELL_TABLE_CARD_CLASS,
  StandardPageBanner,
  StandardMetricCard,
} from "@/components/standard-page-shell";
import { usePinEntry, useConsumePendingActivation } from "@/contexts/open-screens-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Search,
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Copy,
  Activity,
  FolderOpen,
  Mail,
  Hash,
  TrendingUp,
  TrendingDown,
  Info,
  Pencil,
  GripVertical,
  CheckCircle,
  PauseCircle,
  Clock,
  Settings2,
  Award,
  AlertTriangle,
  ShieldCheck,
  Phone,
  Loader2,
  FileText,
  Globe,
  MapPin,
  Tag,
  Camera,
  Briefcase,
  Wallet,
  Pin,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { ExportButton } from "@/components/export-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { CompanyEditSlidePanel } from "@/components/company-edit-slide-panel";
import { CompanyViewSlidePanel } from "@/components/company-view-slide-panel";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useCompanies } from "@/hooks/useCompanies";
import { apiClient } from "@/lib/api-client";

const gradientMap: Record<string, string> = {
  "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900":
    "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900":
    "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800":
    "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
  "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900":
    "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
  "bg-gradient-to-b from-emerald-900 via-green-800 to-cyan-900":
    "linear-gradient(to bottom, #064e3b, #166534, #164e63)",
  "bg-gradient-to-tr from-teal-900 via-emerald-800 to-green-800":
    "linear-gradient(to top right, #134e4a, #065f46, #166534)",
  "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900":
    "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
  "bg-gradient-to-b from-indigo-900 via-purple-800 to-fuchsia-900":
    "linear-gradient(to bottom, #312e81, #6b21a8, #701a75)",
  "bg-gradient-to-tr from-violet-900 via-purple-800 to-pink-900":
    "linear-gradient(to top right, #4c1d95, #6b21a8, #831843)",
  "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900":
    "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
  "bg-gradient-to-b from-orange-900 via-red-800 to-rose-900":
    "linear-gradient(to bottom, #7c2d12, #991b1b, #881337)",
  "bg-gradient-to-tr from-rose-900 via-red-800 to-pink-900":
    "linear-gradient(to top right, #881337, #991b1b, #831843)",
  "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900":
    "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
  "bg-gradient-to-b from-neutral-900 via-stone-800 to-slate-900":
    "linear-gradient(to bottom, #171717, #292524, #0f172a)",
  "bg-gradient-to-tr from-black via-slate-900 to-gray-900":
    "linear-gradient(to top right, #000000, #0f172a, #111827)",
};

// "partner" não é mais um CompanyType — Partner é um upgrade da própria
// Agency (Company.partner_status), não uma organização separada com
// cadastro/listagem próprios. Ver "Convidar para Partner" na linha da
// tabela de Agency e o modal de convite em company-view-slide-panel.tsx.
type CompanyType = "all" | "company" | "agency" | "nomad";
type CompanyStatus = "all" | "active" | "inactive" | "pending";

// Única fonte de verdade pro estado "sem nenhum filtro avançado ativo" —
// usada no valor inicial do useState, no reset do modal "Filtros avançados"
// e no botão "Limpar filtros" da toolbar (ver ETAPA 5 / correção). Antes
// disso o mesmo objeto estava duplicado à mão em dois lugares diferentes.
const EMPTY_ADVANCED_FILTERS = {
  name: "",
  cnpj: "",
  email: "",
  phone: "",
  whatsapp: "",
  location: "",
  types: [] as string[],
  statuses: [] as string[],
  accountTypes: [] as string[],
  partnerLevels: [] as string[],
  minUsers: "",
  maxUsers: "",
  minProjects: "",
  maxProjects: "",
  hasBitrixId: false,
  hasAsaasId: false,
  registrationDateFrom: "",
  registrationDateTo: "",
};

const EMPTY_CREATE_WITH_OWNER_FORM = {
  type: "company" as Exclude<CompanyType, "all">,
  organizationName: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  // Dados adicionais da Company (type === "company")
  companyCnpj: "",
  companyPhone: "",
  companyWebsite: "",
  companySegment: "",
  companyStatus: "ativo",
  companyAddress: "",
  companyNumber: "",
  companyNeighborhood: "",
  companyCity: "",
  companyState: "",
  companyZipCode: "",
  companyPixKey: "",
  companyPixKeyType: "cpf",
  companyDescription: "",
  companyLogo: "",
  // Dados adicionais da Agency (type === "agency")
  agencyCnpj: "",
  agencyPhone: "",
  agencyStatus: "ativo",
  agencyAddress: "",
  agencyNumber: "",
  agencyNeighborhood: "",
  agencyCity: "",
  agencyState: "",
  agencyZipCode: "",
  agencyPixKey: "",
  agencyPixKeyType: "cpf",
  // Dados adicionais do Nômade (type === "nomad") — pessoa física, mas o
  // CNPJ é obrigatório pra prestar serviços à plataforma.
  nomadCnpj: "",
  nomadWhatsapp: "",
  nomadLevel: "bronze",
  nomadStatus: "aguardando_aprovacao",
  nomadAvatar: "",
  nomadAddress: "",
  nomadNumber: "",
  nomadNeighborhood: "",
  nomadCity: "",
  nomadState: "",
  nomadZipCode: "",
  nomadPixKey: "",
  nomadPixKeyType: "cpf",
};

type Company = {
  id: number;
  sequence_number?: number;
  name: string;
  legal_name?: string;
  type: CompanyType;
  email: string;
  phone: string;
  phone_secondary?: string;
  whatsapp?: string;
  website?: string;
  document: string;
  ie?: string;
  location: string;
  account_type?: string;
  partner_level?: string;
  program_level?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  is_partner?: boolean;
  status: CompanyStatus;
  users_count: number;
  users_online: number;
  projects_count: number;
  created_at: string;
  mau: number;
  dau: number;
  bitrix_id?: string;
  asaas_id?: string;
  avatar?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  pix_key?: string;
  pix_type?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
  admin_notes?: string;
  internal_notes?: string;
  social_links?: { id: string; platform: string; url: string }[];
  lgpd?: {
    dpo_name?: string;
    dpo_email?: string;
    dpo_phone?: string;
    privacy_policy_accepted: boolean;
    policy_accepted_at?: string;
    policy_version?: string;
    data_processing_purposes?: string[];
    security_incidents?: {
      date: string;
      description: string;
      resolved: boolean;
    }[];
  };
  // Commercial contact
  commercial_contact_name?: string;
  commercial_contact_role?: string;
  commercial_contact_email?: string;
  commercial_contact_phone?: string;
  commercial_contact_whatsapp?: string;
  commercial_contact_preferred_channel?: string;
  commercial_contact_notes?: string;
  // Financial contact
  financial_contact_name?: string;
  financial_contact_role?: string;
  financial_contact_email?: string;
  financial_contact_phone?: string;
  financial_contact_whatsapp?: string;
  financial_contact_preferred_channel?: string;
  financial_contact_notes?: string;
  financial_contact_user_id?: string;
  use_master_as_financial_fallback?: boolean;
};

// Companies loaded from API via useCompanies hook

const PARTNER_LEVEL_CONFIG = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    badge: "allka-badge allka-badge-bronze",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    badge: "allka-badge allka-badge-silver",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    badge: "allka-badge allka-badge-gold",
  },
  platinum: {
    label: "Platinum",
    icon: "💎",
    badge: "allka-badge allka-badge-platinum",
  },
  diamond: {
    label: "Diamond",
    icon: "👑",
    badge: "allka-badge allka-badge-diamond",
  },
};

const companyInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarColors = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-700",
];
const avatarColor = (id: number) => avatarColors[id % avatarColors.length];

// Ícone por tipo de conta — só usado pelas abas do Novo Cadastro (ETAPA 9).
const CREATE_TYPE_TAB_ICON: Record<Exclude<CompanyType, "all">, React.ElementType> = {
  company: Building2,
  agency: Briefcase,
  nomad: MapPin,
};

// Barra de abas de tipo de conta do Novo Cadastro — troca só a apresentação
// do seletor antigo (grid de botões); o valor interno (createWithOwnerForm.type)
// e o handler de troca continuam exatamente os mesmos (ver ETAPA 9).
function CreateTypeTabs({
  value,
  onChange,
  getLabel,
  getInfo,
}: {
  value: Exclude<CompanyType, "all">;
  onChange: (t: Exclude<CompanyType, "all">) => void;
  getLabel: (t: Exclude<CompanyType, "all">) => string;
  getInfo: (t: Exclude<CompanyType, "all">) => string;
}) {
  const TAB_ORDER = ["company", "agency", "nomad"] as const;
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + TAB_ORDER.length) % TAB_ORDER.length;
    const nextType = TAB_ORDER[nextIndex];
    onChange(nextType);
    tabRefs.current[nextType]?.focus();
  };

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      role="tablist"
      aria-label="Tipo de conta"
    >
      {TAB_ORDER.map((t, index) => {
        const Icon = CREATE_TYPE_TAB_ICON[t];
        const active = value === t;
        return (
          <TooltipProvider key={t} delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={(el) => { tabRefs.current[t] = el; }}
                  type="button"
                  role="tab"
                  aria-pressed={active}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onChange(t)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`flex items-center justify-center gap-2 h-11 px-3 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d1b6a]/50 ${
                    active
                      ? "text-white border-transparent shadow-[0_6px_16px_rgba(110,44,150,0.3)]"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#7d1b6a]/50"
                  }`}
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{getLabel(t)}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="max-w-[220px]">
                {getInfo(t)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// Card de agrupamento visual do Novo Cadastro — só apresentação (borda,
// título, ícone, descrição); os campos dentro continuam com os mesmos
// ids/values/handlers de antes (ver ETAPA 9).
// Mensagem de erro discreta de um campo do Novo Cadastro — some sozinha
// quando o campo correspondente sai de createWithOwnerErrors (ver FASE 5).
function CreateFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function CreateFormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[#7d1b6a] dark:text-[#c07ab0]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h3>
          {description && (
            <p className="text-xs text-slate-400 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CompanyAvatar({ company }: { company: Company }) {
  const [err, setErr] = React.useState(false);
  if (company.avatar && !err) {
    return (
      <div className="w-10 h-10 rounded-full flex-shrink-0 shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <img
          src={company.avatar}
          alt={company.name}
          className="w-full h-full object-contain p-1"
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(company.id)} flex items-center justify-center flex-shrink-0 shadow-sm`}
    >
      <span className="text-xs font-bold text-white">
        {companyInitials(company.name)}
      </span>
    </div>
  );
}

// Bloco de endereço reutilizado pelos 4 tipos do "Novo Cadastro" — cada tipo
// só muda o prefixo das chaves no form (companyZipCode, agencyZipCode, ...),
// já resolvido dinamicamente por handleCreateWithOwnerCepChange via
// createWithOwnerForm.type. Mesmo layout/labels do bloco Endereço de
// admin/clientes (CEP com autofill via ViaCEP, Rua+Número, Bairro, Cidade+UF).
function CreateWithOwnerAddressFields({
  prefix,
  form,
  setForm,
  cepLoading,
  cepError,
  onCepChange,
}: {
  prefix: "company" | "agency" | "nomad" | "partner";
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  cepLoading: boolean;
  cepError: string;
  onCepChange: (raw: string) => void;
}) {
  const zipKey = `${prefix}ZipCode`;
  const addressKey = `${prefix}Address`;
  const numberKey = `${prefix}Number`;
  const neighborhoodKey = `${prefix}Neighborhood`;
  const cityKey = `${prefix}City`;
  const stateKey = `${prefix}State`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>CEP</Label>
          <div className="relative">
            <Input
              placeholder="00000-000"
              value={form[zipKey] || ""}
              onChange={(e) => onCepChange(e.target.value)}
              className="pr-7"
              maxLength={9}
            />
            {cepLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
            )}
          </div>
          {cepError && <p className="text-xs text-red-500">{cepError}</p>}
        </div>
        <div className="space-y-2">
          <Label>Rua / Avenida</Label>
          <Input
            placeholder="Ex: Rua Paulo Lobo"
            value={form[addressKey] || ""}
            onChange={(e) => setForm((f: any) => ({ ...f, [addressKey]: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input
            placeholder="Ex: 123"
            value={form[numberKey] || ""}
            onChange={(e) => setForm((f: any) => ({ ...f, [numberKey]: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input
            placeholder="Ex: Cambuí"
            value={form[neighborhoodKey] || ""}
            onChange={(e) => setForm((f: any) => ({ ...f, [neighborhoodKey]: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input
            placeholder="Ex: Campinas"
            value={form[cityKey] || ""}
            onChange={(e) => setForm((f: any) => ({ ...f, [cityKey]: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Estado (UF)</Label>
          <Input
            placeholder="SP"
            maxLength={2}
            value={form[stateKey] || ""}
            onChange={(e) => setForm((f: any) => ({ ...f, [stateKey]: e.target.value.toUpperCase() }))}
          />
        </div>
      </div>
    </div>
  );
}

// Renders text that truncates with an ellipsis when the column is narrowed;
// a tooltip with the full value only appears when the text is actually cut
// off (checked via scrollWidth vs clientWidth on hover).
function TruncatedText({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const value = text || "—";
  const checkTruncation = () => {
    const el = ref.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  };
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={ref}
            onMouseEnter={checkTruncation}
            className={`block truncate ${className}`}
          >
            {value}
          </span>
        </TooltipTrigger>
        {isTruncated && (
          <TooltipContent side="top" className="max-w-xs text-xs break-words">
            {value}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EmpresasPage() {
  const { sidebarWidth, sidebarSettings, previewTheme } = useSidebar();
  const { toast } = useToast();
  const {
    companies: apiCompanies,
    loading: companiesLoading,
    error: companiesError,
    refetch: refetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany: apiDeleteCompany,
  } = useCompanies();
  // Agency/Nomad são entidades Prisma separadas de Company — sem hook
  // próprio, buscadas em paralelo aqui e mescladas na mesma lista via o
  // campo "type" (ver useEffect de merge abaixo), pra essa tela virar o
  // ponto único de gestão dos 3 tipos de conta organizacional. Partner NÃO
  // é um tipo de conta próprio — é um upgrade que uma Agency recebe (ver
  // PartnerProfile aninhado em cada Agency, "convidar para Partner" na
  // linha da tabela), por isso não tem fetch/mapping próprio aqui.
  const [apiAgencies, setApiAgencies] = useState<any[]>([]);
  const [apiNomades, setApiNomades] = useState<any[]>([]);
  const refetchOrgTypes = useCallback(async () => {
    try {
      const [agRes, noRes] = await Promise.all([
        apiClient.getAgencies({ limit: "1000" }),
        apiClient.getNomades({ limit: "1000" }),
      ]);
      setApiAgencies((agRes as any)?.data || []);
      setApiNomades((noRes as any)?.data || []);
    } catch (err) {
      console.error("[EmpresasPage] erro ao buscar agencies/nomades", err);
    }
  }, []);
  useEffect(() => {
    refetchOrgTypes();
  }, [refetchOrgTypes]);
  const refetchAllOrgTypes = useCallback(() => {
    refetchCompanies();
    refetchOrgTypes();
    // Sidebar mostra "Empresas" (Company+Agency+Nomad+Partner) num badge
    // fixo, buscado uma vez só (App.tsx monta o Sidebar acima do <Routes>,
    // nunca remonta) — sem isso o número ficava defasado após qualquer
    // criação/edição/exclusão aqui, até um F5.
    window.dispatchEvent(new Event("allka:admin-counts-changed"));
  }, [refetchCompanies, refetchOrgTypes]);
  const pageRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const isSyncingScroll = useRef(false);
  // The two mirror bars (top/bottom) are narrow flex-1 strips sitting next to
  // other toolbar/footer controls, while the real table div spans the full
  // card width — their scrollable widths differ. Syncing by raw scrollLeft
  // pixels made one hit its end long before the others. Sync by the
  // *ratio* of scroll completion instead, so all three always reach 0% and
  // 100% together regardless of their individual widths.
  const syncScrollFrom = useCallback((source: HTMLDivElement | null) => {
    if (isSyncingScroll.current || !source) return;
    isSyncingScroll.current = true;
    const sourceMax = source.scrollWidth - source.clientWidth;
    const ratio = sourceMax > 0 ? source.scrollLeft / sourceMax : 0;
    [tableScrollRef, topScrollRef, bottomScrollRef].forEach((ref) => {
      const el = ref.current;
      if (!el || el === source) return;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft = ratio * max;
    });
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }, []);
  const handleTopBarScroll = useCallback(
    () => syncScrollFrom(topScrollRef.current),
    [syncScrollFrom],
  );
  const handleTableScroll = useCallback(
    () => syncScrollFrom(tableScrollRef.current),
    [syncScrollFrom],
  );
  const handleBottomBarScroll = useCallback(
    () => syncScrollFrom(bottomScrollRef.current),
    [syncScrollFrom],
  );

  const appliedTheme = previewTheme || sidebarSettings;
  const themeBg = appliedTheme.backgroundColor;
  const getHeaderStyle = (): React.CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900")
      return {
        background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)",
      };
    if (themeBg.startsWith("custom-gradient:"))
      return { background: themeBg.replace("custom-gradient:", "") };
    if (themeBg.includes("gradient"))
      return { background: gradientMap[themeBg] || "#0f172a" };
    return {};
  };
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(40);
  const navigate = useNavigate();
  const { empresaId: urlEmpresaId } = useParams<{ empresaId?: string }>();

  // ── Column visibility ──────────────────────────────────────────
  type ColKey =
    | "acoes"
    | "id"
    | "empresa"
    | "contato"
    | "cnpj"
    | "status"
    | "plano"
    | "tipo"
    | "membro_desde";
  const allColumns: { key: ColKey; label: string; required?: boolean }[] = [
    { key: "acoes", label: "Ações", required: true },
    { key: "id", label: "ID", required: true },
    { key: "empresa", label: "Empresa", required: true },
    { key: "contato", label: "Contato" },
    { key: "cnpj", label: "CNPJ · Usuários" },
    { key: "status", label: "Status" },
    { key: "plano", label: "Plano" },
    { key: "tipo", label: "Tipo" },
    { key: "membro_desde", label: "Membro Desde" },
  ];
  // Explicação de cada coluna, mostrada no tooltip do ícone de info do cabeçalho
  const COLUMN_INFO: Partial<Record<ColKey, string>> = {
    acoes: "Ações rápidas: ver detalhes, editar e mais informações da empresa.",
    id: "Código sequencial único da empresa — nunca se repete.",
    empresa: "Nome, localização e indicadores de conformidade (DPO/LGPD).",
    contato: "E-mail e telefone/WhatsApp de contato da empresa.",
    cnpj: "CNPJ cadastrado e quantidade de usuários vinculados à empresa.",
    status: "Situação atual da empresa na plataforma.",
    plano: "Plano contratado pela empresa.",
    tipo: "Tipo de conta (Empresa, Agência ou Nômade) e nível de parceria.",
    membro_desde: "Data em que a empresa foi cadastrada na plataforma.",
  };
  // Colunas visíveis por padrão (o usuário pode ligar as demais na engrenagem)
  const DEFAULT_VISIBLE_COLS: ColKey[] = [
    "acoes",
    "id",
    "empresa",
    "contato",
    "status",
    "plano",
    "tipo",
  ];
  // v2: bumped after adding the "id" and "membro_desde" columns and
  // redefining the default visible set — ensures everyone (including
  // browsers with an old saved preference) starts from the new default.
  const VISIBLE_COLS_STORAGE_KEY = "empresas:visibleColsV2";
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => {
    // Persist user choice per browser. To apply per backend user, swap the
    // key with the userId from your auth context.
    try {
      const raw = localStorage.getItem(VISIBLE_COLS_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr) && arr.length > 0) {
          const restored = new Set(
            arr.filter((k): k is ColKey => allColumns.some((c) => c.key === k)),
          );
          // Required columns must always show, even if they were added to
          // the schema after this preference was last saved.
          allColumns.forEach((c) => {
            if (c.required) restored.add(c.key);
          });
          return restored;
        }
      }
    } catch {
      /* ignore */
    }
    return new Set(DEFAULT_VISIBLE_COLS);
  });
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const closeColConfig = useCallback(() => {
    setColConfigOpen(false);
  }, []);

  // ── Company "more info" slide panel (opened via the + button) ───────────
  const [infoPanelCompany, setInfoPanelCompany] = useState<Company | null>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoPanelSummary, setInfoPanelSummary] = useState<{
    projects: { total: number; byStatus: Record<string, number> };
    users: {
      id: string;
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      last_login: string | null;
    }[];
  } | null>(null);
  const [infoPanelLoading, setInfoPanelLoading] = useState(false);
  const openInfoPanel = useCallback(async (company: Company) => {
    setInfoPanelCompany(company);
    setInfoPanelOpen(true);
    setInfoPanelSummary(null);
    if (!company._apiId) return;
    setInfoPanelLoading(true);
    try {
      const data = await apiClient.getCompanySummary(company._apiId);
      setInfoPanelSummary(data as any);
    } catch {
      setInfoPanelSummary(null);
    } finally {
      setInfoPanelLoading(false);
    }
  }, []);
  const closeInfoPanel = useCallback(() => {
    setInfoPanelOpen(false);
  }, []);
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho",
    negotiation: "Negociação",
    "awaiting-payment": "Aguardando pagamento",
    planning: "Planejamento",
    "in-progress": "Em andamento",
    paused: "Pausado",
    completed: "Concluído",
    cancelled: "Cancelado",
    paid: "Pago",
  };

  // Persist whenever visibleCols changes
  useEffect(() => {
    try {
      localStorage.setItem(
        VISIBLE_COLS_STORAGE_KEY,
        JSON.stringify(Array.from(visibleCols)),
      );
    } catch {
      /* ignore */
    }
  }, [visibleCols]);
  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const visibleColumnsList = allColumns.filter((c) => visibleCols.has(c.key));

  // ── Column resize ──────────────────────────────────────────────
  const allDefaultWidths: Record<ColKey, number> = {
    acoes: 99,
    id: 85,
    empresa: 280,
    contato: 240,
    cnpj: 210,
    status: 108,
    plano: 118,
    tipo: 135,
    membro_desde: 140,
  };
  const allMinWidths: Record<ColKey, number> = {
    acoes: 99,
    id: 72,
    empresa: 200,
    contato: 180,
    cnpj: 180,
    status: 92,
    plano: 98,
    tipo: 115,
    membro_desde: 110,
  };
  const defaultColWidths = visibleColumnsList.map(
    (c) => allDefaultWidths[c.key],
  );
  const minColWidths = visibleColumnsList.map((c) => allMinWidths[c.key]);
  const [colWidths, setColWidths] = useState<number[]>(defaultColWidths);

  // Reset widths when visible columns change
  useEffect(() => {
    setColWidths(visibleColumnsList.map((c) => allDefaultWidths[c.key]));
  }, [visibleCols.size]);

  // Only show the horizontal scrollbars (top/bottom mirrors) when the table
  // actually overflows its container — no point showing a scrollbar that
  // has nothing to scroll.
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  useEffect(() => {
    const el = tableScrollRef.current;
    // tableScrollRef is null while companiesLoading shows the early-return
    // spinner (the table isn't mounted yet) — re-run once loading flips to
    // false and the real table mounts, instead of only on colWidths/
    // visibleCols changes, or the ResizeObserver never attaches and the
    // scrollbar mirrors stay hidden forever regardless of actual overflow.
    if (!el) return;
    // A few px of slack (scrollbar-width rounding, border-collapse edge
    // cases) shouldn't count as "overflow" — only show the mirrors when
    // there's genuinely more to scroll than that.
    const check = () =>
      setHasHorizontalOverflow(el.scrollWidth > el.clientWidth + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [colWidths, visibleCols, companiesLoading]);
  const dragState = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      dragState.current = {
        colIndex,
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      };
      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        // Capture as plain values — dragState.current can be nulled by
        // onMouseUp before React flushes the setColWidths updater below,
        // so reading the ref again inside that callback would crash.
        const { colIndex: idx, startX, startWidth } = dragState.current;
        const delta = ev.clientX - startX;
        const newWidth = Math.max(minColWidths[idx], startWidth + delta);
        setColWidths((prev) => {
          const next = [...prev];
          next[idx] = newWidth;
          return next;
        });
      };
      const onMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [colWidths],
  );
  useEffect(() => {
    // The app shell mounts TWO <header> elements (one for desktop, hidden on
    // mobile via CSS; one for mobile, hidden on desktop) — querySelector
    // could grab the hidden one (offsetHeight 0) depending on DOM order, so
    // pick whichever candidate is actually rendered with real height.
    const headers = Array.from(document.querySelectorAll("header"));
    const footers = Array.from(document.querySelectorAll("footer"));
    const measure = () => {
      const h = headers.find((el) => el.offsetHeight > 0);
      const f = footers.find((el) => el.offsetHeight > 0);
      if (h) setHeaderHeight(h.offsetHeight);
      if (f) setFooterHeight(f.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    // The header's second row (level/points pills) can mount/resize after
    // this effect's first run (e.g. once user context finishes loading),
    // which left slide panels positioned with a stale (too-short) height.
    // A ResizeObserver keeps headerHeight/footerHeight correct whenever
    // their actual rendered size changes, not just on window resize.
    const ro = new ResizeObserver(measure);
    headers.forEach((el) => ro.observe(el));
    footers.forEach((el) => ro.observe(el));
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  const [companies, setCompanies] = useState<Company[]>([]);
  const {
    sortKey: companySortKey,
    sortDir: companySortDir,
    handleSort: handleCompanySort,
    sortData: sortCompanies,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting<Company>();

  // Mapping from ColKey to Company field for sortable columns
  const sortableColMap: Partial<Record<string, keyof Company>> = {
    id: "sequence_number",
    empresa: "name",
    status: "status",
    plano: "plan",
    tipo: "type",
    membro_desde: "created_at",
  };
  const [searchQuery, setSearchQuery] = useState("");
  // Criação de Company com usuário principal obrigatório (Tarefa 11) —
  // deliberadamente não reaproveita CompanyCreateSlidePanel (que continua
  // existindo em project-create-new-panel.tsx/project-create-slide-panel.tsx
  // pra empresa "casca" sem usuário, no add-inline dentro da criação de
  // projeto) — forçar cadastro de login completo nesse fluxo rápido seria
  // um endpoint/UX incompatível (Tarefa 9, regra 5).
  const [createWithOwnerOpen, setCreateWithOwnerOpen] = useState(false);
  // Controla QUAL camada está em foco (na frente) — independente de
  // createWithOwnerOpen. Clicar na "espiadinha" do card de trás só troca o
  // foco (alterna qual card está na frente), nunca fecha/descarta o Novo
  // Cadastro — fechar de verdade só acontece pelos botões explícitos
  // (seta de voltar / X / Cancelar), via handleCreateWithOwnerCancelOrBack.
  const [createWithOwnerFocused, setCreateWithOwnerFocused] = useState(true);
  // Bandeja de Telas — cada tela só entra ali se o usuário clicar no ícone
  // de pin (ao lado do Exportar). Nada se adiciona sozinho, e uma vez
  // adicionada, só sai de lá clicando em remover (na própria bandeja ou de
  // novo no mesmo ícone) — fechar/trocar a tela normalmente não desregistra,
  // e o pin sobrevive a navegar pra outra página (dado persistido no
  // contexto, não depende deste componente continuar montado).
  const { pinned: listPinned, toggle: toggleListPinned } = usePinEntry({
    id: "empresas-list",
    label: "Empresas",
    icon: Building2,
    path: "/admin/empresas",
    activateKey: "list",
  });
  const { pinned: createPinned, toggle: toggleCreatePinned } = usePinEntry({
    id: "empresas-create",
    label: "Novo Cadastro",
    icon: Plus,
    path: "/admin/empresas",
    activateKey: "create",
  });
  useConsumePendingActivation((key) => {
    if (key === "create") {
      setCreateWithOwnerOpen(true);
      setCreateWithOwnerFocused(true);
    } else if (key === "list") {
      setCreateWithOwnerFocused(false);
    } else if (key.startsWith("edit:")) {
      const id = Number(key.slice(5));
      const found = companies.find((c) => c.id === id);
      if (found) handleEditCompany(found);
    } else if (key.startsWith("view:")) {
      const id = Number(key.slice(5));
      const found = companies.find((c) => c.id === id);
      if (found) handleViewCompany(found);
    }
  });
  const [createWithOwnerSubmitting, setCreateWithOwnerSubmitting] = useState(false);
  const createWithOwnerAvatarInputRef = useRef<HTMLInputElement>(null);
  const createWithOwnerNomadAvatarInputRef = useRef<HTMLInputElement>(null);
  const [createWithOwnerForm, setCreateWithOwnerForm] = useState(EMPTY_CREATE_WITH_OWNER_FORM);
  const [showCreateWithOwnerPassword, setShowCreateWithOwnerPassword] = useState(false);
  const [createWithOwnerCepLoading, setCreateWithOwnerCepLoading] = useState(false);
  const [createWithOwnerCepError, setCreateWithOwnerCepError] = useState("");
  // Erros por campo do Novo Cadastro — só os 3 campos realmente exigidos
  // pelo backend (name/email/password, ver createUserSchema em
  // apps/backend/src/routes/users.ts) + organizationName quando o tipo
  // precisa. Chave = id do campo (mesmo id usado no <Input>/<Label>).
  const [createWithOwnerErrors, setCreateWithOwnerErrors] = useState<Record<string, string>>({});
  const [createWithOwnerErrorSummary, setCreateWithOwnerErrorSummary] = useState(false);
  const createWithOwnerScrollRef = useRef<HTMLDivElement>(null);
  // FASE 7 — proteção contra perda de dados ao Cancelar/Voltar
  const [createWithOwnerDiscardConfirmOpen, setCreateWithOwnerDiscardConfirmOpen] = useState(false);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Deep-link: open company view from URL param
  useEffect(() => {
    if (!urlEmpresaId) {
      // Route changed away from /admin/empresas/:id — close the panel
      if (viewPanelOpen) {
        setViewPanelOpen(false);
        setSelectedCompany(null);
      }
      return;
    }
    if (companiesLoading) return; // wait until list is loaded
    const numId = parseInt(urlEmpresaId, 10);
    // First try: find in already-mapped companies list by sequential id
    const found = companies.find((c) => c.id === numId);
    if (found) {
      setSelectedCompany(found);
      setViewPanelOpen(true);
      return;
    }
    // Fallback: try matching by real API CUID (e.g. if URL contains a CUID directly)
    const foundByApiId = companies.find((c: any) => c._apiId === urlEmpresaId);
    if (foundByApiId) {
      setSelectedCompany(foundByApiId);
      setViewPanelOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlEmpresaId, companies, companiesLoading]);

  const [pageSize, setPageSize] = useItemsPerPage("admin-empresas", 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const closeFilterPanel = useCallback((resetSelection: boolean) => {
    setShowFieldPicker(false);
    setIsFilterModalOpen(false);
    if (resetSelection) {
      setSelectedFilterId(null);
      setIsEditingFilter(false);
      setUnsavedChanges(false);
    }
  }, []);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    companyId: number | null;
    companyName: string;
  }>({
    open: false,
    companyId: null,
    companyName: "",
  });
  type CompanyDeleteUserAction = "delete" | "unlink" | "suspend";
  const [deleteDialogMembers, setDeleteDialogMembers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [deleteDialogActions, setDeleteDialogActions] = useState<
    Record<string, CompanyDeleteUserAction>
  >({});
  const [deleteDialogLoadingMembers, setDeleteDialogLoadingMembers] = useState(false);

  // Filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS);

  // Gerenciamento de filtros salvos
  const [savedFilters, setSavedFilters] = useState<
    Array<{ id: string; name: string; filters: any }>
  >([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [isEditingFilter, setIsEditingFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [saveAsFilter, setSaveAsFilter] = useState(false);
  const [isDuplicatingFilter, setIsDuplicatingFilter] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<string[]>([
    "nome",
    "status",
    "tipo",
    "plano",
    "parceiro",
    "data_cadastro",
  ]);
  const [showFieldPicker, setShowFieldPicker] = useState(false);


  // Demo data injected for real-API companies so the UI can be previewed
  const DEMO_DPO = [
    {
      dpo_name: "Roberta Mendes",
      dpo_email: "dpo@empresa1.com.br",
      dpo_phone: "(11) 98765-0001",
      privacy_policy_accepted: true,
      policy_accepted_at: "2026-01-10T09:00:00Z",
      policy_version: "v2.1",
    },
    {
      dpo_name: "Carlos Drummond",
      dpo_email: "dpo@empresa2.com.br",
      dpo_phone: "(11) 97654-0002",
      privacy_policy_accepted: false,
    },
    {
      dpo_name: "Luciana Farias",
      dpo_email: "dpo@empresa3.com.br",
      privacy_policy_accepted: true,
      policy_accepted_at: "2026-02-20T14:00:00Z",
      policy_version: "v3.0",
    },
  ];
  const DEMO_PLANS = [
    "enterprise",
    "scale",
    "squad",
    "growth",
    "standard",
    "start",
    "lite",
    "enterprise",
    "scale",
    "growth",
  ];

  // Sync API companies into local state
  useEffect(() => {
    const mapped = apiCompanies.map((c: any, idx: number) => ({
      id: idx + 1,
      _apiId: c.id,
      sequence_number: c.sequence_number ?? undefined,
      name: c.name || "",
      legal_name: c.name || "",
      type: (c.type === "agencia"
        ? "agency"
        : c.type === "nomade"
          ? "nomad"
          : "company") as CompanyType,
      status:
        c.status === "ativo"
          ? "active"
          : c.status === "inativo"
            ? "inactive"
            : "active",
      email: c.email || "",
      phone: c.phone || "",
      document: c.cnpj || "",
      location: c.address || "",
      segment: c.segment || "",
      description: c.description || "",
      website: c.website || "",
      avatar: c.logo || c.avatar || null,
      zip_code: c.zip_code || "",
      street: c.address || "",
      number: c.number || "",
      neighborhood: c.neighborhood || "",
      city: c.city || "",
      state: c.state || "",
      pix_key: c.pix_key || "",
      pix_type: c.pix_key_type || "",
      // Was hardcoded to "starter" — plan/partner_level/account_type must
      // all derive from the same real value, or sort/filter on the Plano
      // column (which reads company.plan) silently breaks against what's
      // actually rendered (which reads partner_level/account_type).
      plan: c.plan || c.partner_level || DEMO_PLANS[idx % DEMO_PLANS.length],
      users_count: c.users_count ?? c._count?.users ?? 0,
      projects_count: c.projects_count ?? c._count?.projects ?? 0,
      created_at: c.created_at || new Date().toISOString(),
      logo_gradient: "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900",
      lgpd: c.lgpd ?? (idx < 3 ? DEMO_DPO[idx] : undefined),
      // partner_level drives the plan display; use API value or fall back to demo rotation
      partner_level:
        c.plan || c.partner_level || DEMO_PLANS[idx % DEMO_PLANS.length],
      // account_type alias for filtering by plan tier (same value as partner_level)
      account_type:
        c.account_type ||
        c.plan ||
        c.partner_level ||
        DEMO_PLANS[idx % DEMO_PLANS.length],
      // Commercial contact
      commercial_contact_name: c.commercial_contact_name || undefined,
      commercial_contact_role: c.commercial_contact_role || undefined,
      commercial_contact_email: c.commercial_contact_email || undefined,
      commercial_contact_phone: c.commercial_contact_phone || undefined,
      commercial_contact_whatsapp: c.commercial_contact_whatsapp || undefined,
      commercial_contact_preferred_channel:
        c.commercial_contact_preferred_channel || undefined,
      commercial_contact_notes: c.commercial_contact_notes || undefined,
      // Financial contact
      financial_contact_name: c.financial_contact_name || undefined,
      financial_contact_role: c.financial_contact_role || undefined,
      financial_contact_email: c.financial_contact_email || undefined,
      financial_contact_phone: c.financial_contact_phone || undefined,
      financial_contact_whatsapp: c.financial_contact_whatsapp || undefined,
      financial_contact_preferred_channel:
        c.financial_contact_preferred_channel || undefined,
      financial_contact_notes: c.financial_contact_notes || undefined,
      financial_contact_user_id: c.financial_contact_user_id || undefined,
      use_master_as_financial_fallback:
        c.use_master_as_financial_fallback ?? true,
    })) as Company[];

    // Agency/Nomad — cada um vem de um endpoint/modelo Prisma próprio, sem
    // o "type" self-declarado que Company tem; aqui o type já nasce certo
    // (é o próprio tipo da entidade), diferente do bloco acima que precisa
    // derivar de c.type.
    const mappedAgencies = apiAgencies.map((a: any, idx: number) => ({
      id: mapped.length + idx + 1,
      _apiId: a.id,
      sequence_number: a.sequence_number ?? undefined,
      name: a.name || "",
      legal_name: a.name || "",
      type: "agency" as CompanyType,
      status: (a.status === "ativo" ? "active" : a.status === "inativo" ? "inactive" : "pending") as CompanyStatus,
      email: a.email || a.user?.email || "",
      phone: a.phone || "",
      document: a.cnpj || "",
      location: a.address || "",
      plan: a.partner_level,
      partner_level: a.partner_level,
      account_type: a.partner_level,
      users_count: a._count?.members ?? 0,
      projects_count: 0,
      created_at: a.created_at || new Date().toISOString(),
      // Presente só quando essa Agency foi convidada/virou Partner — ver
      // "Convidar para Partner"/badge na linha da tabela.
      partner_status: a.partner_profile?.status as
        | "invited"
        | "active"
        | "declined"
        | "suspended"
        | undefined,
      logo_gradient: "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900",
      zip_code: a.zip_code || "",
      street: a.address || "",
      number: a.number || "",
      neighborhood: a.neighborhood || "",
      city: a.city || "",
      state: a.state || "",
      pix_key: a.pix_key || "",
      pix_type: a.pix_key_type || "",
    })) as Company[];

    const mappedNomades = apiNomades.map((n: any, idx: number) => ({
      id: mapped.length + mappedAgencies.length + idx + 1,
      _apiId: n.id,
      sequence_number: undefined,
      name: n.name || "",
      legal_name: n.name || "",
      type: "nomad" as CompanyType,
      status: (n.status === "ativo" ? "active" : n.status === "inativo" || n.status === "reprovado" ? "inactive" : "pending") as CompanyStatus,
      email: n.email || "",
      phone: n.whatsapp || "",
      document: n.cnpj || "",
      location: n.address || "",
      plan: n.level,
      partner_level: n.level,
      account_type: n.level,
      avatar: n.avatar || undefined,
      // Nomad é 1:1 com um único usuário (o próprio nômade, via user_id) —
      // não tem "membros" como Agency, então ou é 1 (já vinculado) ou 0
      // (nômade criado sem o User atômico, caso legado).
      users_count: n.user_id ? 1 : 0,
      projects_count: n._count?.task_executions ?? 0,
      created_at: n.created_at || new Date().toISOString(),
      logo_gradient: "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900",
      zip_code: n.zip_code || "",
      street: n.address || "",
      number: n.number || "",
      neighborhood: n.neighborhood || "",
      city: n.city || "",
      state: n.state || "",
      pix_key: n.pix_key || "",
      pix_type: n.pix_key_type || "",
    })) as Company[];

    setCompanies([...mapped, ...mappedAgencies, ...mappedNomades]);
  }, [apiCompanies, apiAgencies, apiNomades]);

  // ── Search autocomplete (name/ID suggestions as you type) ────────────────
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  // Brief "searching…" feedback so the user knows the query was received,
  // in case the list/filtering ever feels slow (search itself is instant
  // today, but this keeps the affordance ready regardless).
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
    if (!searchQuery) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => setIsSearching(false), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => {
        const idCode = `emp_${c.sequence_number ?? ""}`;
        return (
          c.name?.toLowerCase().includes(q) || idCode.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [companies, searchQuery]);
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── Filtered companies (derived — useMemo ensures instant reactive updates) ──
  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const rawDigits = searchQuery.replace(/\D/g, "");
      filtered = filtered.filter((company) => {
        const statusLabel =
          company.status === "active"
            ? "ativo"
            : company.status === "inactive"
              ? "inativo"
              : "pendente";
        // Word-prefix match: any word in the name that starts with the query
        const nameWords = (company.name || "").toLowerCase().split(/\s+/);
        const nameWordMatch = nameWords.some((w) => w.startsWith(q));
        // Digit-only fields — ONLY activate when the query contains digits
        const digitMatch =
          rawDigits.length > 0 &&
          ((company.document?.replace(/\D/g, "") ?? "").includes(rawDigits) ||
            (company.phone
              ? company.phone.replace(/\D/g, "").includes(rawDigits)
              : false));
        // ID match — "emp_7", "7", etc.
        const idCode = `emp_${company.sequence_number ?? ""}`;
        const idMatch =
          idCode.toLowerCase().includes(q) ||
          (rawDigits.length > 0 &&
            String(company.sequence_number ?? "").includes(rawDigits));
        return (
          nameWordMatch ||
          company.name?.toLowerCase().includes(q) ||
          company.legal_name?.toLowerCase().includes(q) ||
          company.email?.toLowerCase().includes(q) ||
          digitMatch ||
          idMatch ||
          company.document?.toLowerCase().includes(q) ||
          company.location?.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          company.account_type?.toLowerCase().includes(q)
        );
      });
    }

    // Aplicar filtros avançados
    if (advancedFilters.name) {
      filtered = filtered.filter((company) =>
        company.name.toLowerCase().includes(advancedFilters.name.toLowerCase()),
      );
    }

    if (advancedFilters.cnpj) {
      filtered = filtered.filter((company) =>
        company.document.includes(advancedFilters.cnpj),
      );
    }

    if (advancedFilters.email) {
      filtered = filtered.filter((company) =>
        company.email
          .toLowerCase()
          .includes(advancedFilters.email.toLowerCase()),
      );
    }

    if (advancedFilters.phone) {
      filtered = filtered.filter((company) =>
        company.phone.includes(advancedFilters.phone),
      );
    }

    if (advancedFilters.types.length > 0) {
      filtered = filtered.filter((company) =>
        advancedFilters.types.includes(company.type),
      );
    }

    if (advancedFilters.statuses.length > 0) {
      filtered = filtered.filter((company) =>
        advancedFilters.statuses.includes(company.status),
      );
    }

    if (advancedFilters.location) {
      filtered = filtered.filter((company) =>
        company.location
          .toLowerCase()
          .includes(advancedFilters.location.toLowerCase()),
      );
    }

    if (advancedFilters.accountTypes.length > 0) {
      filtered = filtered.filter((company) =>
        company.account_type
          ? advancedFilters.accountTypes.includes(company.account_type)
          : false,
      );
    }

    if (advancedFilters.partnerLevels.length > 0) {
      filtered = filtered.filter((company) =>
        company.partner_level
          ? advancedFilters.partnerLevels.includes(company.partner_level)
          : false,
      );
    }

    if (advancedFilters.minUsers) {
      filtered = filtered.filter(
        (company) => company.users_count >= Number(advancedFilters.minUsers),
      );
    }
    if (advancedFilters.maxUsers) {
      filtered = filtered.filter(
        (company) => company.users_count <= Number(advancedFilters.maxUsers),
      );
    }
    if (advancedFilters.minProjects) {
      filtered = filtered.filter(
        (company) =>
          company.projects_count >= Number(advancedFilters.minProjects),
      );
    }
    if (advancedFilters.maxProjects) {
      filtered = filtered.filter(
        (company) =>
          company.projects_count <= Number(advancedFilters.maxProjects),
      );
    }

    if (advancedFilters.hasBitrixId) {
      filtered = filtered.filter((company) => !!company.bitrix_id);
    }
    if (advancedFilters.hasAsaasId) {
      filtered = filtered.filter((company) => !!company.asaas_id);
    }

    if (advancedFilters.registrationDateFrom) {
      filtered = filtered.filter(
        (company) =>
          new Date(company.created_at) >=
          new Date(advancedFilters.registrationDateFrom),
      );
    }

    if (advancedFilters.registrationDateTo) {
      filtered = filtered.filter(
        (company) =>
          new Date(company.created_at) <=
          new Date(advancedFilters.registrationDateTo),
      );
    }

    return filtered;
  }, [searchQuery, companies, advancedFilters]);

  // Reset to page 1 whenever filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, advancedFilters]);

  const paginatedCompanies = sortCompanies(filteredCompanies).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(filteredCompanies.length / pageSize);

  // Função para renderizar números de página
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i);
        }
        if (totalPages > maxVisible) pages.push("...");
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push("...");
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push("...");
        for (
          let i = currentPage - halfVisible;
          i <= currentPage + halfVisible;
          i++
        ) {
          pages.push(i);
        }
        pages.push("...");
      }
    }
    return pages;
  };

  // ── Go-to-page (jump directly to a page not shown in the compact list) ──
  const [pageJumpValue, setPageJumpValue] = useState("");
  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n);
    }
    setPageJumpValue("");
  };
  const PageJumpField = ({ className = "" }: { className?: string }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpValue}
              onChange={(e) => setPageJumpValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPageJump();
              }}
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
              <span className="relative z-10 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors">
                Ir
              </span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Digite um número de página e clique em "Ir" (ou aperte Enter) para
          navegar direto, mesmo que a página não apareça nos botões
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === "active").length,
    totalUsers: companies.reduce((acc, c) => acc + c.users_count, 0),
    totalProjects: companies.reduce((acc, c) => acc + c.projects_count, 0),
  };

  // account_type/role que o backend (POST /api/users) espera por tipo —
  // ele cria a entidade (Agency/Company/Nomade/PartnerProfile) e o usuário
  // principal na mesma transação (ver apps/backend/src/routes/users.ts).
  // Nomad não tem campo de "nome da organização" próprio (é pessoa, não
  // empresa) — só Company/Agency usam organization_name. Partner não entra
  // aqui: não é um tipo de conta criável (é upgrade de uma Agency já
  // existente — ver "Convidar para Partner" na linha da tabela).
  const CREATE_TYPE_CONFIG: Record<
    Exclude<CompanyType, "all">,
    { account_type: string; role: string; needsOrgName: boolean; orgLabel: string; entityLabel: string }
  > = {
    company: { account_type: "empresas", role: "company_admin", needsOrgName: true, orgLabel: "Nome da Empresa", entityLabel: "Empresa" },
    agency: { account_type: "agencias", role: "agency_admin", needsOrgName: true, orgLabel: "Nome da Agência", entityLabel: "Agência" },
    nomad: { account_type: "nomades", role: "nomad", needsOrgName: false, orgLabel: "", entityLabel: "Nômade" },
  };

  // Genérico pros 3 tipos — cada um usa o mesmo conjunto de campos de
  // endereço, só com prefixo diferente (companyZipCode, agencyZipCode,
  // nomadZipCode, partnerZipCode, ...), que já bate com createWithOwnerForm.type.
  const handleCreateWithOwnerCepChange = async (raw: string) => {
    const prefix = createWithOwnerForm.type;
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCreateWithOwnerForm((f) => ({ ...f, [`${prefix}ZipCode`]: formatted }));
    setCreateWithOwnerCepError("");
    if (digits.length !== 8) return;
    setCreateWithOwnerCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCreateWithOwnerCepError("CEP não encontrado");
        return;
      }
      setCreateWithOwnerForm((f) => ({
        ...f,
        [`${prefix}ZipCode`]: formatted,
        [`${prefix}Address`]: data.logradouro || f[`${prefix}Address`],
        [`${prefix}Neighborhood`]: data.bairro || f[`${prefix}Neighborhood`],
        [`${prefix}City`]: data.localidade || f[`${prefix}City`],
        [`${prefix}State`]: data.uf || f[`${prefix}State`],
      }));
    } catch {
      setCreateWithOwnerCepError("Erro ao buscar CEP");
    } finally {
      setCreateWithOwnerCepLoading(false);
    }
  };

  const handleCreateWithOwnerLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCreateWithOwnerForm((f) => ({ ...f, companyLogo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreateWithOwnerNomadAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCreateWithOwnerForm((f) => ({ ...f, nomadAvatar: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Só valida o que o backend de fato exige (ver createUserSchema em
  // apps/backend/src/routes/users.ts:106-127): name (não-vazio), email
  // (formato válido), password (mínimo 6) — e organizationName quando o
  // tipo atual precisa (regra que já existia, agora só com erro por campo
  // em vez de um toast genérico). Nenhuma regra nova de CNPJ/telefone/CEP/
  // site foi inventada — o backend aceita esses campos como string livre.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validateCreateWithOwnerForm = (f: typeof createWithOwnerForm) => {
    const cfg = CREATE_TYPE_CONFIG[f.type as Exclude<CompanyType, "all">];
    const errors: Record<string, string> = {};
    if (cfg.needsOrgName && !f.organizationName.trim()) {
      const orgFieldId = f.type === "agency" ? "create-agency-org-name" : "create-company-org-name";
      errors[orgFieldId] = `${cfg.orgLabel} é obrigatório.`;
    }
    if (f.type === "nomad" && !f.nomadCnpj.trim()) {
      errors["create-nomad-cnpj"] = "CNPJ é obrigatório para nômades.";
    }
    if (!f.name.trim()) {
      errors["create-company-name"] = "Nome é obrigatório.";
    }
    if (!f.email.trim()) {
      errors["create-company-email"] = "E-mail é obrigatório.";
    } else if (!EMAIL_RE.test(f.email.trim())) {
      errors["create-company-email"] = "Informe um e-mail válido.";
    }
    if (!f.password) {
      errors["create-company-password"] = "Senha é obrigatória.";
    } else if (f.password.length < 6) {
      errors["create-company-password"] = "A senha precisa ter ao menos 6 caracteres.";
    }
    return errors;
  };

  const clearCreateWithOwnerError = (fieldId: string) => {
    setCreateWithOwnerErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      if (Object.keys(next).length === 0) setCreateWithOwnerErrorSummary(false);
      return next;
    });
  };

  const focusAndScrollToField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    const scrollContainer = createWithOwnerScrollRef.current;
    if (el && scrollContainer) {
      const elRect = el.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 24;
      scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      (el as HTMLElement).focus({ preventScroll: true });
    }
  };

  // FASE 7 — considera TODOS os campos do formulário (não só os do tipo
  // ativo no momento), comparando contra EMPTY_CREATE_WITH_OWNER_FORM.
  // `type` fica de fora de propósito: só trocar de aba sem digitar nada
  // não deve contar como "dados preenchidos" (ver 7.3 — troca de tipo nunca
  // abre confirmação).
  const isCreateWithOwnerFormDirty = () => {
    const { type: _t1, ...rest } = createWithOwnerForm;
    const { type: _t2, ...emptyRest } = EMPTY_CREATE_WITH_OWNER_FORM;
    return JSON.stringify(rest) !== JSON.stringify(emptyRest);
  };

  const resetCreateWithOwnerState = () => {
    setCreateWithOwnerForm(EMPTY_CREATE_WITH_OWNER_FORM);
    setCreateWithOwnerErrors({});
    setCreateWithOwnerErrorSummary(false);
    setCreateWithOwnerCepError("");
    setCreateWithOwnerCepLoading(false);
  };

  const handleCreateWithOwnerCancelOrBack = () => {
    if (createWithOwnerSubmitting) return;
    if (isCreateWithOwnerFormDirty()) {
      setCreateWithOwnerDiscardConfirmOpen(true);
      return;
    }
    resetCreateWithOwnerState();
    setCreateWithOwnerOpen(false);
  };

  const handleDiscardCreateWithOwner = () => {
    resetCreateWithOwnerState();
    setCreateWithOwnerDiscardConfirmOpen(false);
    setCreateWithOwnerOpen(false);
  };

  const handleCreateCompanyWithOwner = async () => {
    if (createWithOwnerSubmitting) return;
    const f = createWithOwnerForm;
    const cfg = CREATE_TYPE_CONFIG[f.type as Exclude<CompanyType, "all">];
    const errors = validateCreateWithOwnerForm(f);
    if (Object.keys(errors).length > 0) {
      setCreateWithOwnerErrors(errors);
      setCreateWithOwnerErrorSummary(true);
      // Ordem visual dos campos: organização > nome > e-mail > senha —
      // sempre foca o primeiro erro nessa ordem, não a ordem de inserção
      // no objeto (que não é garantida).
      const orderedFieldIds = [
        "create-company-org-name",
        "create-agency-org-name",
        "create-company-name",
        "create-company-email",
        "create-company-password",
        "create-nomad-cnpj",
      ];
      const firstErrorField = orderedFieldIds.find((id) => errors[id]);
      if (firstErrorField) focusAndScrollToField(firstErrorField);
      return;
    }
    setCreateWithOwnerErrors({});
    setCreateWithOwnerErrorSummary(false);
    setCreateWithOwnerSubmitting(true);
    try {
      // Backend cria a entidade (Company/Agency/Nomade/PartnerProfile) +
      // usuário principal na mesma transação — endpoint único (POST
      // /api/users) pros 4 tipos (Tarefa 9/11).
      await apiClient.createUser({
        ...(cfg.needsOrgName ? { organization_name: f.organizationName.trim() } : {}),
        name: f.name.trim(),
        email: f.email.trim(),
        password: f.password,
        account_type: cfg.account_type,
        role: cfg.role,
        ...(f.phone ? { phone: f.phone } : {}),
        // Dados completos de cada entidade — cada bloco só é enviado quando
        // o tipo selecionado é o dele (o backend também ignora os campos
        // de outros tipos, mas evita mandar lixo à toa).
        ...(f.type === "company"
          ? {
              ...(f.companyCnpj ? { company_cnpj: f.companyCnpj } : {}),
              ...(f.companyPhone ? { company_phone: f.companyPhone } : {}),
              ...(f.companyWebsite ? { company_website: f.companyWebsite } : {}),
              ...(f.companySegment ? { company_segment: f.companySegment } : {}),
              ...(f.companyStatus ? { company_status: f.companyStatus } : {}),
              ...(f.companyAddress ? { company_address: f.companyAddress } : {}),
              ...(f.companyNumber ? { company_number: f.companyNumber } : {}),
              ...(f.companyNeighborhood ? { company_neighborhood: f.companyNeighborhood } : {}),
              ...(f.companyCity ? { company_city: f.companyCity } : {}),
              ...(f.companyState ? { company_state: f.companyState } : {}),
              ...(f.companyZipCode ? { company_zip_code: f.companyZipCode } : {}),
              ...(f.companyPixKey ? { company_pix_key: f.companyPixKey } : {}),
              ...(f.companyPixKey ? { company_pix_key_type: f.companyPixKeyType } : {}),
              ...(f.companyDescription ? { company_description: f.companyDescription } : {}),
              ...(f.companyLogo ? { company_logo: f.companyLogo } : {}),
            }
          : {}),
        ...(f.type === "agency"
          ? {
              ...(f.agencyCnpj ? { agency_cnpj: f.agencyCnpj } : {}),
              ...(f.agencyPhone ? { agency_phone: f.agencyPhone } : {}),
              ...(f.agencyStatus ? { agency_status: f.agencyStatus } : {}),
              ...(f.agencyAddress ? { agency_address: f.agencyAddress } : {}),
              ...(f.agencyNumber ? { agency_number: f.agencyNumber } : {}),
              ...(f.agencyNeighborhood ? { agency_neighborhood: f.agencyNeighborhood } : {}),
              ...(f.agencyCity ? { agency_city: f.agencyCity } : {}),
              ...(f.agencyState ? { agency_state: f.agencyState } : {}),
              ...(f.agencyZipCode ? { agency_zip_code: f.agencyZipCode } : {}),
              ...(f.agencyPixKey ? { agency_pix_key: f.agencyPixKey } : {}),
              ...(f.agencyPixKey ? { agency_pix_key_type: f.agencyPixKeyType } : {}),
            }
          : {}),
        ...(f.type === "nomad"
          ? {
              nomad_cnpj: f.nomadCnpj.trim(),
              ...(f.nomadWhatsapp ? { nomad_whatsapp: f.nomadWhatsapp } : {}),
              ...(f.nomadLevel ? { nomad_level: f.nomadLevel } : {}),
              ...(f.nomadStatus ? { nomad_status: f.nomadStatus } : {}),
              ...(f.nomadAvatar ? { nomad_avatar: f.nomadAvatar } : {}),
              ...(f.nomadAddress ? { nomad_address: f.nomadAddress } : {}),
              ...(f.nomadNumber ? { nomad_number: f.nomadNumber } : {}),
              ...(f.nomadNeighborhood ? { nomad_neighborhood: f.nomadNeighborhood } : {}),
              ...(f.nomadCity ? { nomad_city: f.nomadCity } : {}),
              ...(f.nomadState ? { nomad_state: f.nomadState } : {}),
              ...(f.nomadZipCode ? { nomad_zip_code: f.nomadZipCode } : {}),
              ...(f.nomadPixKey ? { nomad_pix_key: f.nomadPixKey } : {}),
              ...(f.nomadPixKey ? { nomad_pix_key_type: f.nomadPixKeyType } : {}),
            }
          : {}),
      });
      toast({
        title: `${cfg.entityLabel} criado(a)`,
        description: `"${(cfg.needsOrgName ? f.organizationName : f.name).trim()}" cadastrado(a) com sucesso.`,
      });
      setCreateWithOwnerOpen(false);
      resetCreateWithOwnerState();
      refetchAllOrgTypes();
    } catch (error: any) {
      toast({
        title: `Erro ao criar ${cfg.entityLabel.toLowerCase()}`,
        description: error?.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreateWithOwnerSubmitting(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditPanelOpen(true);
  };

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setViewPanelOpen(true);
    navigate(`/admin/empresas/${company.id}`, { replace: true });
  };

  // Convida uma Agency existente pra virar Partner — ela precisa aceitar
  // o convite (PartnerProfile.status "invited") antes de ganhar acesso.
  const handleInvitePartner = async (company: Company) => {
    if (!company._apiId) return;
    try {
      await apiClient.invitePartner(company._apiId);
      toast({
        title: "Convite enviado",
        description: `"${company.name}" foi convidada para virar Partner.`,
      });
      refetchAllOrgTypes();
    } catch (error: any) {
      toast({
        title: "Erro ao convidar",
        description: error.message || "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    }
  };

  // Cada endpoint (Company/Agency/Nomade) usa seu próprio vocabulário de
  // status — a tela unifica pra active/inactive/pending, então salvar
  // precisa reconverter pro valor nativo daquele tipo.
  const STATUS_TO_AGENCY: Record<string, string> = { active: "ativo", inactive: "inativo", pending: "pendente" };
  const STATUS_TO_NOMAD: Record<string, string> = { active: "ativo", inactive: "inativo", pending: "aguardando_aprovacao" };

  const handleSaveCompany = async (data: any) => {
    try {
      if (!selectedCompany?._apiId) {
        setEditPanelOpen(false);
        setSelectedCompany(null);
        return;
      }
      const type = selectedCompany.type;
      if (type === "agency") {
        await apiClient.updateAgency(selectedCompany._apiId, {
          name: data.name || data.legal_name,
          cnpj: data.document || data.cnpj || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          status: data.status ? STATUS_TO_AGENCY[data.status] || data.status : undefined,
        });
      } else if (type === "nomad") {
        await apiClient.updateNomade(selectedCompany._apiId, {
          name: data.name || data.legal_name,
          email: data.email || undefined,
          whatsapp: data.phone || undefined,
          status: data.status ? STATUS_TO_NOMAD[data.status] || data.status : undefined,
        });
      } else {
        await updateCompany(selectedCompany._apiId, {
          name: data.name || data.legal_name,
          cnpj: data.document || data.cnpj || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          status: data.status || undefined,
          segment: data.segment || undefined,
          address: data.street || data.location || undefined,
          number: data.number || undefined,
          neighborhood: data.neighborhood || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip_code: data.zip_code || undefined,
          pix_key: data.pix_key || undefined,
          pix_key_type: data.pix_type || undefined,
          description: data.description || undefined,
          website: data.website || undefined,
        });
      }
      toast({
        title: `${getTypeLabel(type)} atualizado(a)`,
        description: "Os dados foram salvos com sucesso.",
      });
      refetchAllOrgTypes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    }
    setEditPanelOpen(false);
    setSelectedCompany(null);
  };

  const handleDeleteCompany = async (id: number) => {
    const company = companies.find((c) => c.id === id);
    setDeleteDialog({
      open: true,
      companyId: id,
      companyName: company?.name ?? "",
    });
    setDeleteDialogMembers([]);
    setDeleteDialogActions({});
    // Só o tipo "company" tem o fluxo de arquivamento + escolha de ação por
    // usuário (backend em /api/clients); agency/nomad seguem o fluxo simples.
    if (company?.type === "company" && company._apiId) {
      setDeleteDialogLoadingMembers(true);
      try {
        const res: any = await apiClient.getUsers({ company_id: company._apiId });
        const members = (res?.data || []).map((u: any) => ({
          id: u.id,
          name: u.name || "",
          email: u.email || "",
        }));
        setDeleteDialogMembers(members);
        setDeleteDialogActions(
          Object.fromEntries(members.map((m: any) => [m.id, "unlink" as CompanyDeleteUserAction])),
        );
      } catch {
        setDeleteDialogMembers([]);
      } finally {
        setDeleteDialogLoadingMembers(false);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.companyId !== null) {
      const company = companies.find((c) => c.id === deleteDialog.companyId);
      if (company?._apiId) {
        try {
          if (company.type === "agency") {
            await apiClient.deleteAgency(company._apiId);
          } else if (company.type === "nomad") {
            await apiClient.deleteNomade(company._apiId);
          } else {
            const userActions = deleteDialogMembers.map((m) => ({
              userId: m.id,
              action: deleteDialogActions[m.id] ?? "unlink",
            }));
            await apiDeleteCompany(company._apiId, userActions);
          }
          toast({
            title: `${getTypeLabel(company.type)} excluído(a)`,
            description: `"${company.name}" foi excluído(a) com sucesso. O ID ficou disponível para reaproveitamento e os dados foram arquivados no histórico.`,
          });
          refetchAllOrgTypes();
        } catch (error: any) {
          toast({
            title: "Erro ao excluir",
            description: error.message || "Não foi possível excluir.",
            variant: "destructive",
          });
        }
      }
    }
    setDeleteDialog({ open: false, companyId: null, companyName: "" });
    setDeleteDialogMembers([]);
    setDeleteDialogActions({});
  };

  const getTypeLabel = (type: CompanyType) => {
    const labels = {
      all: "Todos",
      company: "Company",
      agency: "Agency",
      nomad: "Nomad",
      partner: "Partner",
    };
    return labels[type];
  };

  const getTypeInfo = (type: CompanyType) => {
    const info = {
      all: "",
      company: "Empresa cliente direta, sem vínculo com agência ou parceiro.",
      agency: "Empresa vinculada a um projeto conduzido por uma agência parceira.",
      nomad: "Empresa atendida por um nômade (freelancer) da plataforma.",
      partner: "Empresa indicada por um parceiro de indicação (referral).",
    };
    return info[type];
  };

  const getStatusColor = (status: CompanyStatus) => {
    const colors = {
      all: "default",
      active: "default",
      inactive: "secondary",
      pending: "outline",
    };
    return colors[status] as any;
  };

  // Stat cards / sparkline / cores agora vêm do shell compartilhado
  // (components/standard-page-shell.tsx) — ver StandardMetricCard acima.

  // avatar helpers are module-scope (companyInitials / avatarColor / CompanyAvatar)

  if (companiesLoading) {
    return <PageLoader text="Carregando empresas…" />;
  }

  if (companiesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar empresas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {companiesError}
          </p>
        </div>
        <Button onClick={refetchCompanies} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Seção "Usuário Principal" (Nome/E-mail/Senha) — extraída pra variável
  // pra poder ser posicionada em lugares diferentes conforme o tipo: pro
  // Nomad (pessoa física) esses dados SÃO a identidade principal, então
  // aparecem logo no topo da aba, junto com CNPJ/WhatsApp — não escondidos
  // depois de Endereço/Dados Financeiros como nos outros 3 tipos (onde a
  // organização é a entidade principal e este é só o login do admin).
  const usuarioPrincipalSection = (
    <CreateFormSection
      icon={Users}
      title="Usuário Principal"
      description={
        CREATE_TYPE_CONFIG[createWithOwnerForm.type as Exclude<CompanyType, "all">].needsOrgName
          ? "Será o administrador desta conta — pode criar e gerenciar os demais usuários da equipe depois."
          : "Login de acesso desta conta."
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="create-company-name">
            Nome {CREATE_TYPE_CONFIG[createWithOwnerForm.type as Exclude<CompanyType, "all">].needsOrgName ? "do responsável" : "completo"}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="create-company-name"
            placeholder="Nome completo"
            value={createWithOwnerForm.name}
            onChange={(e) => {
              setCreateWithOwnerForm((f) => ({ ...f, name: e.target.value }));
              clearCreateWithOwnerError("create-company-name");
            }}
            aria-invalid={!!createWithOwnerErrors["create-company-name"]}
            aria-describedby={createWithOwnerErrors["create-company-name"] ? "create-company-name-error" : undefined}
          />
          <CreateFieldError id="create-company-name" message={createWithOwnerErrors["create-company-name"]} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-company-email">
            E-mail <span className="text-red-500">*</span>
          </Label>
          <Input
            id="create-company-email"
            type="email"
            placeholder="contato@empresa.com"
            value={createWithOwnerForm.email}
            onChange={(e) => {
              setCreateWithOwnerForm((f) => ({ ...f, email: e.target.value }));
              clearCreateWithOwnerError("create-company-email");
            }}
            aria-invalid={!!createWithOwnerErrors["create-company-email"]}
            aria-describedby={createWithOwnerErrors["create-company-email"] ? "create-company-email-error" : undefined}
          />
          <CreateFieldError id="create-company-email" message={createWithOwnerErrors["create-company-email"]} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="create-company-password">
            Senha de acesso <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="create-company-password"
              type={showCreateWithOwnerPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={createWithOwnerForm.password}
              onChange={(e) => {
                setCreateWithOwnerForm((f) => ({ ...f, password: e.target.value }));
                clearCreateWithOwnerError("create-company-password");
              }}
              className="pr-9"
              aria-invalid={!!createWithOwnerErrors["create-company-password"]}
              aria-describedby={createWithOwnerErrors["create-company-password"] ? "create-company-password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowCreateWithOwnerPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={showCreateWithOwnerPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showCreateWithOwnerPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <CreateFieldError id="create-company-password" message={createWithOwnerErrors["create-company-password"]} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-company-phone">Telefone do responsável (opcional)</Label>
          <Input
            id="create-company-phone"
            placeholder="+55 11 98765-4321"
            value={createWithOwnerForm.phone}
            onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
      </div>
    </CreateFormSection>
  );

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div
      className="relative h-full min-h-0 flex flex-col overflow-hidden"
      ref={pageRef}
    >
      {/* Listagem nunca desmonta — só fica oculta ("hidden") quando o Novo
          Cadastro está aberto E em foco, pra preservar estado só-de-DOM que
          não vive em nenhum useState (ex.: posição de scroll horizontal da
          tabela). Sem efeito cascata/espiadinha aqui — alternar entre esta
          tela e o Novo Cadastro agora é feito pela Bandeja de Telas global
          (ícone flutuante abaixo do chat, ver components/open-screens-tray.tsx),
          registrada logo abaixo via usePinEntry (survive a navegação). */}
      <div
        className={
          createWithOwnerOpen && createWithOwnerFocused
            ? "hidden"
            : "h-full min-h-0 flex flex-col"
        }
      >
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Building2}
        title="Empresas"
        description="Gerencie todas as empresas cadastradas na plataforma."
        actions={
          <>
            <div className="bg-white rounded-lg">
              <ExportButton pageRef={pageRef} filename="empresas" />
            </div>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleListPinned}
                    aria-pressed={listPinned}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors ${
                      listPinned
                        ? "border-white bg-white/25 text-white"
                        : "border-white/70 bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <Pin className={`h-3.5 w-3.5 ${listPinned ? "fill-current" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {listPinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setCreateWithOwnerOpen(true);
                      setCreateWithOwnerFocused(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Novo Cadastro
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Criar empresa, agência, nômade ou partner
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StandardMetricCard
          label="Total de Empresas"
          value={stats.total}
          icon={Building2}
          colorKey="blue"
        />
        <StandardMetricCard
          label="Empresas Ativas"
          value={stats.active}
          icon={Activity}
          colorKey="emerald"
        />
        <StandardMetricCard
          label="Total de Usuários"
          value={stats.totalUsers}
          icon={Users}
          colorKey="violet"
        />
        <StandardMetricCard
          label="Total de Projetos"
          value={stats.totalProjects}
          icon={FolderOpen}
          colorKey="orange"
        />
      </div>

      {/* Main Table Card */}
      <Card className={STANDARD_SHELL_TABLE_CARD_CLASS}>
        {/* Card Top Bar — row 1: search + filters + gear */}
        <div className="admin-empresas-toolbar-row flex flex-wrap items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-900/30">
          {/* Search — com autocompletar por nome/ID */}
          <div
            ref={searchBoxRef}
            className="flex-1 relative min-w-[220px] basis-full sm:basis-auto"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d1b6a]/50 dark:text-[#c07ab0]/60 z-10" />
            <Input
              placeholder="Buscar por nome, CNPJ, e-mail ou responsável..."
              aria-label="Buscar empresas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchFocused(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="pl-10 pr-9 h-11 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-[14px] shadow-sm focus-visible:ring-2 focus-visible:ring-[#7d1b6a]/40 focus-visible:border-[#7d1b6a]/60 w-full"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[14px] shadow-xl overflow-hidden">
                {searchSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">
                    Nenhuma empresa encontrada com esse termo
                  </p>
                ) : (
                  searchSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSearchQuery(c.name);
                        setSearchFocused(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <CompanyAvatar company={c} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          emp_
                          {c.sequence_number ?? c.id}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick type filter chips — All/Company/Agency/Nomad/Partner */}
          <div
            className="flex items-center gap-1.5 flex-shrink-0"
            role="group"
            aria-label="Filtrar por tipo de organização"
          >
            {(["all", "company", "agency", "nomad"] as CompanyType[]).map((t) => {
              const active = t === "all" ? advancedFilters.types.length === 0 : advancedFilters.types.length === 1 && advancedFilters.types[0] === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAdvancedFilters({ ...advancedFilters, types: t === "all" ? [] : [t] })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#7d1b6a]/50"
                  }`}
                  style={active ? { background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" } : undefined}
                >
                  {getTypeLabel(t)}
                </button>
              );
            })}
          </div>

          {/* Limpar filtros — aparece quando QUALQUER filtro real está ativo,
              incluindo os campos que só existem dentro do modal "Filtros
              avançados" (cnpj, email, phone, location, período, etc.), não
              só os chips rápidos da toolbar. Comparar contra
              EMPTY_ADVANCED_FILTERS (mesma constante do reset do modal e do
              valor inicial do useState) evita ter que listar cada campo à
              mão aqui — ver ETAPA 5 / correção. */}
          {(searchQuery.trim() !== "" ||
            JSON.stringify(advancedFilters) !== JSON.stringify(EMPTY_ADVANCED_FILTERS)) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchFocused(false);
                setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
              }}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#7d1b6a] dark:hover:text-[#c07ab0] underline-offset-2 hover:underline transition-colors flex-shrink-0"
            >
              Limpar filtros
            </button>
          )}

          {/* Filter Button — icon only, same gradient-on-hover pattern as "Nova Empresa" */}
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Filtros avançados"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="group relative flex items-center justify-center h-11 w-11 rounded-[12px] border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden transition-all flex-shrink-0"
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                  />
                  <Filter className="relative z-10 h-5 w-5 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Filtros avançados</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Column config — opens the slide panel (rendered at the end of the component) */}
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Configurar colunas"
                  onClick={() => setColConfigOpen(true)}
                  className="group relative flex items-center justify-center h-11 w-11 rounded-[12px] border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden transition-all flex-shrink-0"
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                  />
                  <Settings2 className="relative z-10 h-5 w-5 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Configurar colunas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Card Top Bar — row 2: items + count + scrollbar + pagination (mirrors footer) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              variant="top"
            />
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
                    {(() => {
                      const start = Math.min(
                        (currentPage - 1) * pageSize + 1,
                        filteredCompanies.length,
                      );
                      const end = Math.min(
                        currentPage * pageSize,
                        filteredCompanies.length,
                      );
                      return (
                        <>
                          {start}-{end} de{" "}
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {filteredCompanies.length}
                          </span>{" "}
                          empresa{filteredCompanies.length !== 1 ? "s" : ""}
                        </>
                      );
                    })()}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Intervalo de empresas exibido nesta página, do total encontrado com os filtros atuais
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Top horizontal scrollbar mirror (gradient) — only when needed */}
          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopBarScroll}
              title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll empresas-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div
                style={{
                  minWidth: colWidths.reduce((a, b) => a + b, 0),
                  height: 1,
                }}
              />
            </div>
          )}

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
                <span key={index} className="text-xs text-slate-300 px-0.5">
                  ·
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => setCurrentPage(Number(page))}
                  title={
                    page === currentPage
                      ? "Página atual"
                      : `Ir para a página ${page}`
                  }
                  className={`h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors ${
                    page === currentPage
                      ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                  }`}
                  style={
                    page === currentPage
                      ? {
                          background:
                            "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)",
                        }
                      : undefined
                  }
                >
                  {page}
                </button>
              ),
            )}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              title="Próxima página"
              className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <PageJumpField className="ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Table */}
        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto empresas-table-body"
        >
          <table
            className="text-xs"
            style={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: colWidths.reduce((a, b) => a + b, 0),
            }}
          >
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                {visibleColumnsList.map((col, i) => (
                  <th
                    key={col.key}
                    className="py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none relative [&_button]:!text-[11px]"
                    style={{
                      paddingLeft: 16,
                      paddingRight: 16,
                      textAlign: col.key === "acoes" ? "center" : "left",
                      position: "sticky",
                      top: 0,
                      zIndex: col.key === "acoes" ? 3 : 2,
                      background: "var(--table-head)",
                      boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                      borderRight: "1px solid rgba(148,163,184,0.16)",
                      ...(col.key === "acoes"
                        ? {
                            left: 0,
                            minWidth: 99,
                            paddingLeft: 8,
                            paddingRight: 8,
                            borderRight: "1px solid rgba(100,116,139,0.18)",
                            boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                          }
                        : {}),
                    }}
                  >
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`inline-flex items-center gap-1 ${col.key === "acoes" ? "justify-center w-full" : ""}`}
                          >
                            {sortableColMap[col.key] ? (
                              <SortableHeader
                                label={col.label}
                                field={String(sortableColMap[col.key]!)}
                                type={
                                  col.key === "status" ||
                                  col.key === "plano" ||
                                  col.key === "tipo"
                                    ? "status"
                                    : "text"
                                }
                                sortKey={
                                  companySortKey ? String(companySortKey) : null
                                }
                                sortDir={companySortDir}
                                onSort={(f, d) => handleCompanySort(f as any, d)}
                                columnFilters={columnFilters}
                                onFilter={toggleColumnFilter}
                                onClearFilter={clearColumnFilter}
                                filterValues={
                                  col.key === "status"
                                    ? [
                                        ...new Set(
                                          filteredCompanies.map((c) =>
                                            String(c.status),
                                          ),
                                        ),
                                      ]
                                    : col.key === "plano"
                                      ? [
                                          ...new Set(
                                            filteredCompanies.map((c) =>
                                              String(c.plan),
                                            ),
                                          ),
                                        ]
                                      : col.key === "tipo"
                                        ? [
                                            ...new Set(
                                              filteredCompanies.map((c) =>
                                                String(c.type),
                                              ),
                                            ),
                                          ]
                                        : undefined
                                }
                              />
                            ) : (
                              col.label
                            )}
                            {COLUMN_INFO[col.key] && (
                              <Info className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {COLUMN_INFO[col.key] && (
                          <TooltipContent
                            side="top"
                            className="max-w-[220px] text-xs"
                          >
                            {COLUMN_INFO[col.key]}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    {col.key !== "acoes" && (
                      <span
                        onMouseDown={(e) => onResizeMouseDown(e, i)}
                        className="absolute top-0 right-0 h-full w-2.5 flex items-center justify-center cursor-col-resize z-10 group"
                        style={{ transform: "translateX(50%)" }}
                      >
                        <span className="h-4 w-px bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors" />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f7] dark:divide-[oklch(0.20_0.022_258)]">
              {paginatedCompanies.map((company, rowIndex) => (
                <tr
                  key={company.id}
                  className={`group transition-colors cursor-pointer ${
                    rowIndex % 2 === 0
                      ? "bg-white dark:bg-slate-900 hover:bg-indigo-50/70 dark:hover:bg-slate-800/60"
                      : "bg-slate-50/60 dark:bg-slate-900/40 hover:bg-indigo-50/70 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Actions — pinned to the left, first column */}
                  {visibleCols.has("acoes") && (
                    <td
                      className={`px-1 py-2 transition-colors ${
                        rowIndex % 2 === 0
                          ? "bg-white group-hover:bg-indigo-50/70 dark:bg-slate-900 dark:group-hover:bg-slate-800/60"
                          : "bg-slate-50/60 group-hover:bg-indigo-50/70 dark:bg-slate-900/40 dark:group-hover:bg-slate-800/60"
                      }`}
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        minWidth: 99,
                        borderRight: "1px solid rgba(100,116,139,0.18)",
                      }}
                    >
                      {/* Square action buttons + "more" popover */}
                      <div className="flex items-center justify-center gap-0.5">
                        {/* Mais informações — abre o painel deslizante padrão */}
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInfoPanel(company);
                                }}
                                className="h-[21px] w-[21px] flex items-center justify-center rounded-full bg-[#2558FF] text-white shadow-[0_2px_6px_rgba(37,88,255,0.35)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:shadow-[0_2px_10px_rgba(110,44,150,0.5)] transition-all"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">
                              Mais informações
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Ver detalhes */}
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleViewCompany(company)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">
                              Ver detalhes
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Editar empresa */}
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleEditCompany(company)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">
                              Editar empresa
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Convidar para Partner — só faz sentido pra Agency sem convite ativo/pendente */}
                        {company.type === "agency" &&
                          company.partner_status !== "active" &&
                          company.partner_status !== "invited" && (
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInvitePartner(company);
                                    }}
                                    className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-amber-500 dark:text-amber-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                  >
                                    <Award className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  Convidar para Partner
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        {/* Excluir empresa */}
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCompany(company.id);
                                }}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">
                              Excluir empresa
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  )}

                  {/* ID */}
                  {visibleCols.has("id") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                        emp_
                        {company.sequence_number ?? company.id}
                      </span>
                    </td>
                  )}

                  {/* Company */}
                  {visibleCols.has("empresa") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CompanyAvatar company={company} />
                        <div className="min-w-0 flex-1">
                          <TruncatedText
                            text={company.name}
                            className="font-bold text-sm text-slate-800 dark:text-slate-100"
                          />
                          {company.location && (
                            <TruncatedText
                              text={company.location}
                              className="text-xs text-slate-400 dark:text-slate-500"
                            />
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {/* DPO ausente: badge clicável que abre edição */}
                            {!company.lgpd?.dpo_name && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[9px] font-bold border border-orange-500 bg-orange-200 text-orange-900 shadow-[0_0_10px_rgba(249,115,22,0.6)] dark:bg-orange-800/70 dark:text-orange-100 hover:shadow-[0_0_12px_rgba(249,115,22,0.7)] transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCompany(company);
                                      }}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Sem DPO
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="max-w-[220px] p-3 space-y-1.5"
                                  >
                                    <p className="font-semibold text-sm">
                                      DPO não cadastrado
                                    </p>
                                    <p className="text-xs leading-relaxed text-slate-400">
                                      O DPO (Encarregado de Proteção de Dados) é
                                      exigido pela LGPD para empresas que tratam
                                      dados pessoais.
                                    </p>
                                    <p className="text-xs text-blue-400 font-medium">
                                      Clique para completar o cadastro →
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* DPO cadastrado: indicador verde com detalhes no tooltip */}
                            {company.lgpd?.dpo_name && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[9px] font-bold border border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:bg-emerald-800/70 dark:text-emerald-100 cursor-default">
                                      <ShieldCheck className="h-3 w-3" />
                                      DPO cadastrado
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="max-w-[220px] p-3 space-y-1"
                                  >
                                    <p className="font-semibold text-sm">
                                      DPO cadastrado
                                    </p>
                                    <p className="text-xs text-slate-300">
                                      {company.lgpd.dpo_name}
                                    </p>
                                    {company.lgpd.dpo_email && (
                                      <p className="text-xs text-slate-400">
                                        {company.lgpd.dpo_email}
                                      </p>
                                    )}
                                    {company.lgpd.dpo_phone && (
                                      <p className="text-xs text-slate-400">
                                        {company.lgpd.dpo_phone}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {/* Política de privacidade ainda não aceita */}
                            {company.lgpd &&
                              !company.lgpd.privacy_policy_accepted && (
                                <span className="inline-flex items-center rounded-full px-[7px] py-0.5 text-[9px] font-bold border border-amber-500 bg-amber-200 text-amber-900 shadow-[0_0_10px_rgba(245,158,11,0.6)] dark:bg-amber-800/70 dark:text-amber-100">
                                  Política pendente
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Contact */}
                  {visibleCols.has("contato") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <div className="space-y-1">
                        {company.email ? (
                          <a
                            href={`mailto:${company.email}`}
                            className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group min-w-0"
                          >
                            <Mail className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                            <TruncatedText
                              text={company.email}
                              className="group-hover:underline underline-offset-2"
                            />
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[13px] text-slate-300 dark:text-slate-600">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span>—</span>
                          </div>
                        )}
                        {company.phone ? (
                          <a
                            href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group min-w-0"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3 w-3 fill-current text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <TruncatedText
                              text={company.phone}
                              className="group-hover:underline underline-offset-2"
                            />
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[13px] text-slate-300 dark:text-slate-600">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>—</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* CNPJ + Users */}
                  {visibleCols.has("cnpj") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Hash className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <TruncatedText
                            text={company.document}
                            className="text-[13px] font-mono tracking-tight text-slate-600 dark:text-slate-300"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[13px] text-slate-400 dark:text-slate-500">
                          <Users className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          {company.users_count} usuários
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Status */}
                  {visibleCols.has("status") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${
                          company.status === "active"
                            ? "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.65)] dark:bg-emerald-800/70 dark:text-emerald-100"
                            : company.status === "inactive"
                              ? "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300"
                              : "border-amber-500 bg-amber-200 text-amber-900 shadow-[0_0_12px_rgba(245,158,11,0.65)] dark:bg-amber-800/70 dark:text-amber-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            company.status === "active"
                              ? "bg-emerald-500"
                              : company.status === "inactive"
                                ? "bg-slate-400"
                                : "bg-amber-500"
                          }`}
                        />
                        {company.status === "active"
                          ? "Ativo"
                          : company.status === "inactive"
                            ? "Inativo"
                            : "Pendente"}
                      </span>
                    </td>
                  )}

                  {/* Plan */}
                  {visibleCols.has("plano") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      {(() => {
                        const planBadgeBase =
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border w-fit cursor-default";
                        const planMap: Record<
                          string,
                          {
                            name: string;
                            price: string;
                            discount: string;
                            info: string;
                            color: string;
                          }
                        > = {
                          lite: {
                            name: "Lite",
                            price: "R$ 300/mês",
                            discount: "—",
                            info: "Ativa conta agency na plataforma",
                            color: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
                          },
                          start: {
                            name: "Start",
                            price: "R$ 500/mês",
                            discount: "5%",
                            info: "5% de desconto em todos os produtos",
                            color: "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:bg-emerald-800/70 dark:text-emerald-100",
                          },
                          standard: {
                            name: "Standard",
                            price: "R$ 1.000/mês",
                            discount: "10%",
                            info: "10% de desconto em todos os produtos",
                            color: "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:bg-blue-800/70 dark:text-blue-100",
                          },
                          growth: {
                            name: "Growth",
                            price: "R$ 1.500/mês",
                            discount: "15%",
                            info: "15% de desconto em todos os produtos",
                            color: "border-indigo-500 bg-indigo-200 text-indigo-900 shadow-[0_0_10px_rgba(99,102,241,0.6)] dark:bg-indigo-800/70 dark:text-indigo-100",
                          },
                          scale: {
                            name: "Scale",
                            price: "R$ 3.000/mês",
                            discount: "20%",
                            info: "20% de desconto em todos os produtos",
                            color: "border-violet-500 bg-violet-200 text-violet-900 shadow-[0_0_10px_rgba(139,92,246,0.6)] dark:bg-violet-800/70 dark:text-violet-100",
                          },
                          squad: {
                            name: "Squad",
                            price: "R$ 5.000/mês",
                            discount: "20%",
                            info: "Agências — 20% desconto + pós pago + squad dedicado",
                            color: "border-orange-500 bg-orange-200 text-orange-900 shadow-[0_0_10px_rgba(249,115,22,0.6)] dark:bg-orange-800/70 dark:text-orange-100",
                          },
                          enterprise: {
                            name: "Enterprise",
                            price: "R$ 5.000/mês",
                            discount: "—",
                            info: "Empresas — pós pago + atendimento exclusivo + squad dedicado",
                            color: "border-purple-500 bg-purple-200 text-purple-900 shadow-[0_0_11px_rgba(168,85,247,0.6)] dark:bg-purple-800/70 dark:text-purple-100",
                          },
                          // backwards compat
                          basic: {
                            name: "Lite",
                            price: "R$ 300/mês",
                            discount: "—",
                            info: "Ativa conta agency na plataforma",
                            color: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
                          },
                          starter: {
                            name: "Start",
                            price: "R$ 500/mês",
                            discount: "5%",
                            info: "5% de desconto em todos os produtos",
                            color: "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:bg-emerald-800/70 dark:text-emerald-100",
                          },
                          premium: {
                            name: "Standard",
                            price: "R$ 1.000/mês",
                            discount: "10%",
                            info: "10% de desconto em todos os produtos",
                            color: "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:bg-blue-800/70 dark:text-blue-100",
                          },
                          gold: {
                            name: "Growth",
                            price: "R$ 1.500/mês",
                            discount: "15%",
                            info: "15% de desconto em todos os produtos",
                            color: "border-indigo-500 bg-indigo-200 text-indigo-900 shadow-[0_0_10px_rgba(99,102,241,0.6)] dark:bg-indigo-800/70 dark:text-indigo-100",
                          },
                          silver: {
                            name: "Lite",
                            price: "R$ 300/mês",
                            discount: "—",
                            info: "Ativa conta agency na plataforma",
                            color: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
                          },
                          platinum: {
                            name: "Enterprise",
                            price: "R$ 5.000/mês",
                            discount: "—",
                            info: "Empresas — pós pago + atendimento exclusivo + squad dedicado",
                            color: "border-purple-500 bg-purple-200 text-purple-900 shadow-[0_0_11px_rgba(168,85,247,0.6)] dark:bg-purple-800/70 dark:text-purple-100",
                          },
                        };
                        const key = (
                          (company.partner_level || company.account_type) ??
                          ""
                        ).toLowerCase();
                        const plan = planMap[key];
                        if (!plan)
                          return (
                            <span className="text-xs text-slate-400">—</span>
                          );
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`${planBadgeBase} ${plan.color}`}
                                >
                                  {plan.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-[200px] space-y-1 p-2.5">
                                <p className="font-bold">{plan.name}</p>
                                <p className="text-slate-300">{plan.price}</p>
                                {plan.discount !== "—" && (
                                  <p className="text-green-400">
                                    {plan.discount} de desconto em produtos
                                  </p>
                                )}
                                <p className="text-slate-400 leading-snug">
                                  {plan.info}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </td>
                  )}

                  {/* Type */}
                  {visibleCols.has("tipo") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <div className="flex flex-col gap-1 items-start">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border w-fit cursor-default ${
                                  company.type === "company"
                                    ? "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:bg-blue-800/70 dark:text-blue-100"
                                    : company.type === "agency"
                                      ? "border-violet-500 bg-violet-200 text-violet-900 shadow-[0_0_10px_rgba(139,92,246,0.6)] dark:bg-violet-800/70 dark:text-violet-100"
                                      : "border-orange-500 bg-orange-200 text-orange-900 shadow-[0_0_10px_rgba(249,115,22,0.6)] dark:bg-orange-800/70 dark:text-orange-100"
                                }`}
                              >
                                {getTypeLabel(company.type)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[220px] leading-snug">
                              {getTypeInfo(company.type)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {company.type === "agency" &&
                          company.program_level &&
                          (() => {
                            const lvl =
                              PARTNER_LEVEL_CONFIG[
                                company.program_level as keyof typeof PARTNER_LEVEL_CONFIG
                              ];
                            return lvl ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${lvl.badge}`}
                              >
                                {lvl.icon} {lvl.label}
                              </span>
                            ) : null;
                          })()}
                        {company.type === "agency" && company.partner_status === "active" && (
                          <span className="allka-badge allka-badge-partner">
                            <Award className="h-3 w-3" /> Partner
                          </span>
                        )}
                        {company.type === "agency" && company.partner_status === "invited" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            <Award className="h-3 w-3" /> Convite pendente
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Membro Desde */}
                  {visibleCols.has("membro_desde") && (
                    <td
                      className="px-4 py-3"
                      style={{
                        borderRight: "1px solid rgba(148,163,184,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {company.created_at
                          ? new Date(company.created_at).toLocaleDateString(
                              "pt-BR",
                            )
                          : "—"}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedCompanies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Building2 className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhuma empresa encontrada
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Tente ajustar os filtros ou busca
            </p>
          </div>
        )}

        {/* Bottom Pagination */}
        {filteredCompanies.length > 0 && (
          <div className="admin-empresas-pagination-row flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
            <div className="flex items-center gap-3 flex-wrap">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
                variant="bottom"
              />
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
                      {(() => {
                        const start = Math.min(
                          (currentPage - 1) * pageSize + 1,
                          filteredCompanies.length,
                        );
                        const end = Math.min(
                          currentPage * pageSize,
                          filteredCompanies.length,
                        );
                        return (
                          <>
                            Exibindo{" "}
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {start}
                            </span>{" "}
                            a{" "}
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {end}
                            </span>{" "}
                            de{" "}
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {filteredCompanies.length}
                            </span>{" "}
                            registro{filteredCompanies.length !== 1 ? "s" : ""}
                          </>
                        );
                      })()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Intervalo de empresas exibido nesta página, do total encontrado com os filtros atuais
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Horizontal scrollbar mirror — sits between the count text and
                the pagination, synced with the table's horizontal scroll.
                Only rendered when the table actually overflows. Ref, handler
                and width calc unchanged — only spacing/alignment touched. */}
            {hasHorizontalOverflow && (
              <div
                ref={bottomScrollRef}
                onScroll={handleBottomBarScroll}
                title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll empresas-table-scroll self-center mx-1"
                style={{ height: 12 }}
              >
                <div
                  style={{
                    minWidth: colWidths.reduce((a, b) => a + b, 0),
                    height: 1,
                  }}
                />
              </div>
            )}

            <nav
              aria-label="Paginação da tabela de empresas"
              className="flex items-center gap-1 flex-wrap"
            >
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                title="Página anterior"
                className="h-7 px-2 flex items-center gap-1 justify-center rounded-[8px] border border-transparent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d1b6a]/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Anterior</span>
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={index} className="text-xs text-slate-300 px-0.5">
                    ·
                  </span>
                ) : (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    aria-current={page === currentPage ? "page" : undefined}
                    aria-label={
                      page === currentPage
                        ? `Página atual, ${page}`
                        : `Ir para a página ${page}`
                    }
                    title={
                      page === currentPage
                        ? "Página atual"
                        : `Ir para a página ${page}`
                    }
                    className={`h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d1b6a]/40 ${
                      page === currentPage
                        ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                        : "text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                    }`}
                    style={
                      page === currentPage
                        ? {
                            background:
                              "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)",
                          }
                        : undefined
                    }
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
                title="Próxima página"
                className="h-7 px-2 flex items-center gap-1 justify-center rounded-[8px] border border-transparent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d1b6a]/40"
              >
                <span className="text-xs font-medium">Próximo</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <PageJumpField className="ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700" />
            </nav>
          </div>
        )}
      </Card>
      </div>
      </div>
      </div>

      {/* Advanced Filters Modal — Popup 1 */}
      {isFilterModalOpen &&
        (() => {
          const allFilterFields = [
            { id: "nome", label: "Nome da Empresa", section: "identificacao" },
            { id: "cnpj", label: "CNPJ", section: "identificacao" },
            { id: "email", label: "E-mail", section: "identificacao" },
            {
              id: "telefone",
              label: "Telefone / WhatsApp",
              section: "identificacao",
            },
            {
              id: "localizacao",
              label: "Cidade / Estado",
              section: "identificacao",
            },
            { id: "tipo", label: "Tipo de conta", section: "tipo_status" },
            { id: "status", label: "Status", section: "tipo_status" },
            { id: "plano", label: "Plano", section: "plano_parceiro" },
            {
              id: "parceiro",
              label: "Nível de Parceiro",
              section: "plano_parceiro",
            },
            { id: "usuarios", label: "Usuários", section: "volumes" },
            { id: "projetos", label: "Projetos", section: "volumes" },
            { id: "data_cadastro", label: "Data de Cadastro", section: "data" },
            { id: "bitrix", label: "Bitrix ID", section: "integracoes" },
            { id: "asaas", label: "Asaas ID", section: "integracoes" },
          ];
          const has = (id: string) => visibleFields.includes(id);
          const hasSection = (...ids: string[]) => ids.some((id) => has(id));
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
          const guardedFilterClose = () => {
            if (unsavedChanges) {
              setPendingClose(() => () => closeFilterPanel(true));
              return;
            }
            closeFilterPanel(true);
          };
          return (
            <StandardModalDialog
              open={isFilterModalOpen}
              onClose={guardedFilterClose}
              title="Filtros Avançados"
              subtitle={
                unsavedChanges
                  ? "• Alterações não salvas"
                  : selectedFilterId && !isEditingFilter
                    ? "Filtro carregado"
                    : "Configure e aplique filtros"
              }
              footer={
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => {
                      setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
                      setUnsavedChanges(false);
                    }}
                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Save / update filter */}
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
                                  filters: advancedFilters,
                                },
                              ]);
                              setSelectedFilterId(newId);
                              setUnsavedChanges(false);
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
                                filters: advancedFilters,
                              },
                            ]);
                            setSelectedFilterId(newId);
                            setUnsavedChanges(false);
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
                          className="h-7 w-7 flex items-center justify-center rounded-md text-[11px] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : selectedFilterId && unsavedChanges ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSavedFilters(
                              savedFilters.map((f) =>
                                f.id === selectedFilterId
                                  ? { ...f, filters: advancedFilters }
                                  : f,
                              ),
                            );
                            setUnsavedChanges(false);
                          }}
                          className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-sm"
                        >
                          Atualizar filtro
                        </button>
                        <button
                          onClick={() => {
                            setFilterNameInput(
                              `Filtro ${savedFilters.length + 1}`,
                            );
                            setShowSaveInput(true);
                          }}
                          className="h-7 px-3 rounded-md text-[11px] font-medium border border-emerald-400 text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          Salvar como novo
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
                      onClick={() => closeFilterPanel(true)}
                      className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => closeFilterPanel(false)}
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
                              setAdvancedFilters(filter.filters);
                              setSelectedFilterId(filter.id);
                              setIsEditingFilter(false);
                              setUnsavedChanges(false);
                            }}
                            className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                              dragOverFilterId === filter.id &&
                              draggingFilterId !== filter.id
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                                : draggingFilterId === filter.id
                                  ? "opacity-40"
                                  : selectedFilterId === filter.id
                                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                    : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                            }`}
                          >
                            {/* Drag handle */}
                            <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />

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
                                className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200"
                              />
                            ) : (
                              <span className="flex-1 truncate">
                                {filter.name}
                              </span>
                            )}

                            {/* Action icons — shown on hover */}
                            {editingFilterId !== filter.id && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFilterId(filter.id);
                                    setEditingFilterName(filter.name);
                                  }}
                                  title="Renomear"
                                  className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400 transition-all"
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
                                  title="Excluir"
                                  className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all"
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

                  {/* Right — Filter config */}
                  <div className="flex-1 min-h-0 flex flex-col relative">
                    {/* Field-picker dropdown */}
                    {showFieldPicker && (
                      <div
                        className="absolute top-10 left-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-[520px] animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Campos disponíveis
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setVisibleFields(
                                  allFilterFields.map((f) => f.id),
                                )
                              }
                              className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                            >
                              Selecionar todos
                            </button>
                            <button
                              onClick={() => setVisibleFields([])}
                              className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {allFilterFields.map((field) => {
                            const checked = visibleFields.includes(field.id);
                            return (
                              <label
                                key={field.id}
                                className="flex items-center gap-2 py-1 cursor-pointer group"
                              >
                                <div
                                  onClick={() =>
                                    setVisibleFields(
                                      checked
                                        ? visibleFields.filter(
                                            (f) => f !== field.id,
                                          )
                                        : [...visibleFields, field.id],
                                    )
                                  }
                                  className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                    checked
                                      ? "bg-blue-500 border-blue-500"
                                      : "border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
                                  }`}
                                >
                                  {checked && (
                                    <svg
                                      viewBox="0 0 10 8"
                                      className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]"
                                    >
                                      <path
                                        d="M1 4l3 3 5-6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-[12px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">
                                  {field.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            onClick={() =>
                              setVisibleFields([
                                "nome",
                                "status",
                                "tipo",
                                "plano",
                                "parceiro",
                                "data_cadastro",
                              ])
                            }
                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            Recuperar campos padrão
                          </button>
                          <button
                            onClick={() => setShowFieldPicker(false)}
                            className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* "Adicionar campo" link bar */}
                    <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <button
                        onClick={() => setShowFieldPicker(!showFieldPicker)}
                        className={`text-[12px] font-medium transition-colors ${
                          showFieldPicker
                            ? "text-blue-600"
                            : "text-blue-500 hover:text-blue-700"
                        }`}
                      >
                        + Adicionar campo
                      </button>
                      {visibleFields.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                          {visibleFields.length} campo
                          {visibleFields.length !== 1 ? "s" : ""} ativo
                          {visibleFields.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {showFieldPicker && (
                        <button
                          onClick={() => setShowFieldPicker(false)}
                          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter fields */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Identificação */}
                      {hasSection(
                        "nome",
                        "cnpj",
                        "email",
                        "telefone",
                        "localizacao",
                      ) && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Identificação
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {has("nome") && (
                              <Input
                                placeholder="Nome da Empresa"
                                value={advancedFilters.name}
                                onChange={(e) => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    name: e.target.value,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className="h-7 text-xs"
                              />
                            )}
                            {has("cnpj") && (
                              <Input
                                placeholder="CNPJ"
                                value={advancedFilters.cnpj}
                                onChange={(e) => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    cnpj: e.target.value,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className="h-7 text-xs"
                              />
                            )}
                            {has("email") && (
                              <Input
                                placeholder="E-mail"
                                value={advancedFilters.email}
                                onChange={(e) => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    email: e.target.value,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className="h-7 text-xs"
                              />
                            )}
                            {has("telefone") && (
                              <Input
                                placeholder="Telefone / WhatsApp"
                                value={advancedFilters.phone}
                                onChange={(e) => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    phone: e.target.value,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className="h-7 text-xs"
                              />
                            )}
                            {has("localizacao") && (
                              <Input
                                placeholder="Cidade / Estado"
                                value={advancedFilters.location}
                                onChange={(e) => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    location: e.target.value,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className="h-7 text-xs col-span-2"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tipo e Status (Tipo desabilitado: esta tela lista apenas Empresas) */}
                      {hasSection("tipo", "status") && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Status
                          </p>
                          <div className="space-y-2">
                            {false && has("tipo") && (
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { v: "company", l: "Empresa" },
                                  { v: "agency", l: "Agência" },
                                  { v: "nomad", l: "Nômade" },
                                ].map(({ v, l }) => (
                                  <button
                                    key={v}
                                    onClick={() => {
                                      const t = advancedFilters.types.includes(
                                        v,
                                      )
                                        ? advancedFilters.types.filter(
                                            (x) => x !== v,
                                          )
                                        : [...advancedFilters.types, v];
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        types: t,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.types.includes(v) ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            )}
                            {has("status") && (
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { v: "active", l: "Ativo" },
                                  { v: "inactive", l: "Inativo" },
                                  { v: "pending", l: "Pendente" },
                                ].map(({ v, l }) => (
                                  <button
                                    key={v}
                                    onClick={() => {
                                      const s =
                                        advancedFilters.statuses.includes(v)
                                          ? advancedFilters.statuses.filter(
                                              (x) => x !== v,
                                            )
                                          : [...advancedFilters.statuses, v];
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        statuses: s,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.statuses.includes(v) ? (v === "active" ? "bg-emerald-500 text-white border-emerald-500" : v === "inactive" ? "bg-red-500 text-white border-red-500" : "bg-amber-500 text-white border-amber-500") : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Plano e Parceiro */}
                      {hasSection("plano", "parceiro") && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Plano · Nível de Parceiro
                          </p>
                          <div className="space-y-2">
                            {has("plano") && (
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { v: "lite", l: "Lite" },
                                  { v: "start", l: "Start" },
                                  { v: "standard", l: "Standard" },
                                  { v: "growth", l: "Growth" },
                                  { v: "scale", l: "Scale" },
                                  { v: "squad", l: "Squad" },
                                  { v: "enterprise", l: "Enterprise" },
                                ].map(({ v, l }) => (
                                  <button
                                    key={v}
                                    onClick={() => {
                                      const a =
                                        advancedFilters.accountTypes.includes(v)
                                          ? advancedFilters.accountTypes.filter(
                                              (x) => x !== v,
                                            )
                                          : [
                                              ...advancedFilters.accountTypes,
                                              v,
                                            ];
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        accountTypes: a,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.accountTypes.includes(v) ? "bg-violet-500 text-white border-violet-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300"}`}
                                  >
                                    {l}
                                  </button>
                                ))}
                              </div>
                            )}
                            {has("parceiro") && (
                              <div className="flex flex-wrap gap-1.5">
                                {["Bronze", "Silver", "Gold", "Platinum"].map(
                                  (v) => (
                                    <button
                                      key={v}
                                      onClick={() => {
                                        const p =
                                          advancedFilters.partnerLevels.includes(
                                            v,
                                          )
                                            ? advancedFilters.partnerLevels.filter(
                                                (x) => x !== v,
                                              )
                                            : [
                                                ...advancedFilters.partnerLevels,
                                                v,
                                              ];
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          partnerLevels: p,
                                        });
                                        if (selectedFilterId)
                                          setUnsavedChanges(true);
                                      }}
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.partnerLevels.includes(v) ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-300"}`}
                                    >
                                      {v}
                                    </button>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Volume */}
                      {hasSection("usuarios", "projetos") && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Volumes
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {has("usuarios") && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">
                                  Usuários
                                </p>
                                <div className="flex items-center gap-1">
                                  <Input
                                    placeholder="Mín"
                                    type="number"
                                    value={advancedFilters.minUsers}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        minUsers: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-7 text-xs"
                                  />
                                  <span className="text-slate-300 text-xs">
                                    –
                                  </span>
                                  <Input
                                    placeholder="Máx"
                                    type="number"
                                    value={advancedFilters.maxUsers}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        maxUsers: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                            {has("projetos") && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">
                                  Projetos
                                </p>
                                <div className="flex items-center gap-1">
                                  <Input
                                    placeholder="Mín"
                                    type="number"
                                    value={advancedFilters.minProjects}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        minProjects: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-7 text-xs"
                                  />
                                  <span className="text-slate-300 text-xs">
                                    –
                                  </span>
                                  <Input
                                    placeholder="Máx"
                                    type="number"
                                    value={advancedFilters.maxProjects}
                                    onChange={(e) => {
                                      setAdvancedFilters({
                                        ...advancedFilters,
                                        maxProjects: e.target.value,
                                      });
                                      if (selectedFilterId)
                                        setUnsavedChanges(true);
                                    }}
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Data de Cadastro */}
                      {has("data_cadastro") && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Data de Cadastro
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={advancedFilters.registrationDateFrom}
                              onChange={(e) => {
                                setAdvancedFilters({
                                  ...advancedFilters,
                                  registrationDateFrom: e.target.value,
                                });
                                if (selectedFilterId) setUnsavedChanges(true);
                              }}
                              className="h-7 text-xs flex-1"
                            />
                            <span className="text-slate-300 text-xs flex-shrink-0">
                              até
                            </span>
                            <Input
                              type="date"
                              value={advancedFilters.registrationDateTo}
                              onChange={(e) => {
                                setAdvancedFilters({
                                  ...advancedFilters,
                                  registrationDateTo: e.target.value,
                                });
                                if (selectedFilterId) setUnsavedChanges(true);
                              }}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Integrações */}
                      {hasSection("bitrix", "asaas") && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Integrações
                          </p>
                          <div className="flex gap-2">
                            {has("bitrix") && (
                              <button
                                onClick={() => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    hasBitrixId: !advancedFilters.hasBitrixId,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.hasBitrixId ? "bg-cyan-500 text-white border-cyan-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cyan-300"}`}
                              >
                                Com Bitrix ID
                              </button>
                            )}
                            {has("asaas") && (
                              <button
                                onClick={() => {
                                  setAdvancedFilters({
                                    ...advancedFilters,
                                    hasAsaasId: !advancedFilters.hasAsaasId,
                                  });
                                  if (selectedFilterId) setUnsavedChanges(true);
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.hasAsaasId ? "bg-teal-500 text-white border-teal-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-teal-300"}`}
                              >
                                Com Asaas ID
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {visibleFields.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                          <Filter className="h-8 w-8 mb-2 opacity-30" />
                          <p className="text-xs text-center">
                            Nenhum campo ativo.
                            <br />
                            Clique em{" "}
                            <span className="text-blue-500">
                              + Adicionar campo
                            </span>{" "}
                            para configurar.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </StandardModalDialog>
          );
        })()}
      {/* Configurar colunas — Popup 1 */}
      {colConfigOpen && (
        <StandardModalDialog
          open={colConfigOpen}
          onClose={closeColConfig}
          title="Configurar colunas"
          subtitle={`${visibleCols.size} de ${allColumns.length} visíveis`}
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE_COLS))}
                className="h-9 px-4 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Restaurar padrão
              </button>
              <button
                onClick={() => setVisibleCols(new Set(allColumns.map((c) => c.key)))}
                className="h-9 px-4 rounded-lg text-xs font-semibold btn-brand transition-all"
              >
                Mostrar todas
              </button>
            </div>
          }
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    visibleCols.has(col.key)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  } ${col.required ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <Checkbox
                    checked={visibleCols.has(col.key)}
                    onCheckedChange={() => !col.required && toggleCol(col.key)}
                    disabled={col.required}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {col.label}
                    </span>
                    {COLUMN_INFO[col.key] && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {COLUMN_INFO[col.key]}
                      </p>
                    )}
                  </div>
                  {col.required && (
                    <span className="text-[9px] text-slate-400 flex-shrink-0">
                      obrigatória
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </StandardModalDialog>
      )}

      {/* Mais informações da empresa — Popup 1 (botão +) */}
      {infoPanelCompany &&
        (() => {
          const company = infoPanelCompany;
          return (
            <StandardModalDialog
              open={infoPanelOpen}
              onClose={closeInfoPanel}
              title={
                <div className="flex items-center gap-3">
                  <CompanyAvatar company={company} />
                  <span className="truncate">{company.name}</span>
                </div>
              }
              subtitle={`emp_${company.sequence_number ?? company.id} · ${company.location || "Localização não informada"}`}
              footer={
                <div className="flex items-center justify-end gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      closeInfoPanel();
                      handleEditCompany(company);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar empresa
                  </Button>
                  <Button
                    variant="outline"
                    className="border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => {
                      closeInfoPanel();
                      handleDeleteCompany(company.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir empresa
                  </Button>
                </div>
              }
            >
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Dados completos da empresa */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      Dados da empresa
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Contato
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {company.email || "—"}
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 mt-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {company.phone || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          CNPJ · Usuários
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-mono text-slate-700 dark:text-slate-300">
                          <Hash className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {company.document || "—"}
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 mt-1">
                          <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          {company.users_count} usuário
                          {company.users_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Status
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                            company.status === "active"
                              ? "border-emerald-500 bg-emerald-200 text-emerald-900 dark:bg-emerald-800/70 dark:text-emerald-100"
                              : company.status === "inactive"
                                ? "border-slate-400 bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                : "border-amber-500 bg-amber-200 text-amber-900 dark:bg-amber-800/70 dark:text-amber-100"
                          }`}
                        >
                          {company.status === "active"
                            ? "Ativo"
                            : company.status === "inactive"
                              ? "Inativo"
                              : "Pendente"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Plano · Tipo
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {(company.partner_level || company.account_type || "—") +
                            " · " +
                            getTypeLabel(company.type)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 sm:col-span-2">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Membro desde
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {company.created_at
                            ? new Date(company.created_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Projetos — contagem por etapa */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      Projetos
                    </h3>
                    {infoPanelLoading ? (
                      <p className="text-xs text-slate-400">Carregando...</p>
                    ) : infoPanelSummary ? (
                      <>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mr-2">
                            {infoPanelSummary.projects.total}
                          </span>
                          projeto{infoPanelSummary.projects.total !== 1 ? "s" : ""}{" "}
                          no total
                        </p>
                        {infoPanelSummary.projects.total > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(infoPanelSummary.projects.byStatus).map(
                              ([status, count]) => (
                                <span
                                  key={status}
                                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
                                >
                                  {PROJECT_STATUS_LABELS[status] || status}
                                  <span className="rounded-full bg-slate-700 text-white dark:bg-slate-500 px-1.5 text-[10px] font-bold">
                                    {count}
                                  </span>
                                </span>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Nenhum projeto cadastrado para esta empresa.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Não foi possível carregar os projetos.
                      </p>
                    )}
                  </div>

                  {/* Usuários */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                      Usuários vinculados
                    </h3>
                    {infoPanelLoading ? (
                      <p className="text-xs text-slate-400">Carregando...</p>
                    ) : infoPanelSummary && infoPanelSummary.users.length > 0 ? (
                      <div className="space-y-2">
                        {infoPanelSummary.users.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {u.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {u.email}
                              </p>
                            </div>
                            <span
                              className={`flex-shrink-0 ml-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                                u.is_active
                                  ? "border-emerald-500 bg-emerald-200 text-emerald-900 dark:bg-emerald-800/70 dark:text-emerald-100"
                                  : "border-slate-400 bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {u.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Nenhum usuário cadastrado para esta empresa.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </StandardModalDialog>
          );
        })()}

      {/* Nova Empresa — sempre com usuário principal (company_admin) obrigatório,
          criado atomicamente junto (Tarefa 9/11). CompanyCreateSlidePanel (empresa
          sem usuário) continua existindo só para o "Cadastrar empresa" inline
          dentro da criação de projeto — não usado aqui de propósito.
          ETAPA 8: deixou de ser um SlidePanel sobreposto — agora é uma tela
          embutida dentro do mesmo admin-empresas-panel, alternando com a
          listagem via o mesmo estado createWithOwnerOpen (só a apresentação
          mudou; handlers/estado do formulário são exatamente os mesmos).
          Sempre montada (nunca some do DOM) — visível/na frente quando
          aberta E em foco (createWithOwnerOpen && createWithOwnerFocused),
          escondida (fora de tela + fade) nos outros dois casos: fechada de
          verdade OU aberta mas sem foco (usuário trocou pra listagem via
          Bandeja de Telas — o formulário continua intacto, só sai de vista).
          Nunca fecha/descarta sozinha — só os botões explícitos (seta de
          voltar, X, Cancelar) fecham de fato, via
          handleCreateWithOwnerCancelOrBack. */}
      <div
        className={`admin-empresas-create absolute inset-0 z-20 min-h-0 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          createWithOwnerOpen && createWithOwnerFocused
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-[6%] scale-[0.97] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!createWithOwnerOpen || !createWithOwnerFocused}
      >
          <div
            className="shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl"
            style={{
              background:
                "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))",
            }}
          >
            <button
              type="button"
              onClick={handleCreateWithOwnerCancelOrBack}
              disabled={createWithOwnerSubmitting}
              aria-label="Voltar para a listagem de empresas"
              className="text-white/80 hover:text-white hover:bg-white/15 rounded-lg p-2 transition-all shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 truncate">
              <div className="text-base font-semibold text-white truncate">
                Novo Cadastro {getTypeLabel(createWithOwnerForm.type)}
              </div>
              <p className="text-xs font-normal text-white/70 mt-1 truncate">
                Crie uma nova conta e defina seus dados principais.
              </p>
            </div>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleCreatePinned}
                    aria-pressed={createPinned}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors shrink-0 ${
                      createPinned
                        ? "border-white bg-white/25 text-white"
                        : "border-white/40 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <Pin className={`h-3.5 w-3.5 ${createPinned ? "fill-current" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {createPinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div ref={createWithOwnerScrollRef} className="flex-1 min-h-0 overflow-y-auto py-5">
          <div className="space-y-4">
            <CreateTypeTabs
              value={createWithOwnerForm.type}
              onChange={(t) => {
                setCreateWithOwnerForm((f) => ({ ...f, type: t }));
                // Erro de nome de organização é por tipo (create-company-org-name
                // vs create-agency-org-name) — some junto com a troca de aba pra
                // não deixar o resumo de erro aceso sem nenhum campo vermelho visível.
                clearCreateWithOwnerError("create-company-org-name");
                clearCreateWithOwnerError("create-agency-org-name");
              }}
              getLabel={getTypeLabel}
              getInfo={getTypeInfo}
            />

            {createWithOwnerForm.type === "company" && (
              <>
                <CreateFormSection
                  icon={Building2}
                  title="Dados da Empresa"
                  description="Informações principais da organização."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-company-org-name">
                        Nome da Empresa <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="create-company-org-name"
                        placeholder="Ex: Acme Ltda"
                        value={createWithOwnerForm.organizationName}
                        onChange={(e) => {
                          setCreateWithOwnerForm((f) => ({ ...f, organizationName: e.target.value }));
                          clearCreateWithOwnerError("create-company-org-name");
                        }}
                        aria-invalid={!!createWithOwnerErrors["create-company-org-name"]}
                        aria-describedby={createWithOwnerErrors["create-company-org-name"] ? "create-company-org-name-error" : undefined}
                      />
                      <CreateFieldError id="create-company-org-name" message={createWithOwnerErrors["create-company-org-name"]} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-company-cnpj">CNPJ</Label>
                      <Input
                        id="create-company-cnpj"
                        placeholder="00.000.000/0000-00"
                        value={createWithOwnerForm.companyCnpj}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companyCnpj: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-company-phone-biz">Telefone da empresa</Label>
                      <Input
                        id="create-company-phone-biz"
                        placeholder="+55 11 3000-0000"
                        value={createWithOwnerForm.companyPhone}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companyPhone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-company-website">Website</Label>
                      <Input
                        id="create-company-website"
                        placeholder="https://empresa.com"
                        value={createWithOwnerForm.companyWebsite}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companyWebsite: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-company-segment">Segmento</Label>
                      <Input
                        id="create-company-segment"
                        placeholder="Ex: Varejo, Educação, Saúde..."
                        value={createWithOwnerForm.companySegment}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companySegment: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-company-status">Status</Label>
                      <Select
                        value={createWithOwnerForm.companyStatus}
                        onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, companyStatus: v }))}
                      >
                        <SelectTrigger id="create-company-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="prospecto">Prospecto</SelectItem>
                          <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo da empresa (opcional)</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                        {createWithOwnerForm.companyLogo ? (
                          <img src={createWithOwnerForm.companyLogo} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => createWithOwnerAvatarInputRef.current?.click()}
                      >
                        <Camera className="h-3.5 w-3.5 mr-1" /> Escolher
                      </Button>
                      <input
                        ref={createWithOwnerAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCreateWithOwnerLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-company-description">Descrição (opcional)</Label>
                    <Textarea
                      id="create-company-description"
                      placeholder="Breve descrição sobre a empresa..."
                      className="h-20"
                      value={createWithOwnerForm.companyDescription}
                      onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companyDescription: e.target.value }))}
                    />
                  </div>
                </CreateFormSection>

                <CreateFormSection icon={MapPin} title="Endereço" description="Localização da empresa.">
                  <CreateWithOwnerAddressFields
                    prefix="company"
                    form={createWithOwnerForm}
                    setForm={setCreateWithOwnerForm}
                    cepLoading={createWithOwnerCepLoading}
                    cepError={createWithOwnerCepError}
                    onCepChange={handleCreateWithOwnerCepChange}
                  />
                </CreateFormSection>

                <CreateFormSection icon={Wallet} title="Dados Financeiros" description="Informações de recebimento via Pix.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-company-pix-key">Chave PIX</Label>
                      <Input
                        id="create-company-pix-key"
                        placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                        value={createWithOwnerForm.companyPixKey}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, companyPixKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-company-pix-key-type">Tipo de chave PIX</Label>
                      <Select
                        value={createWithOwnerForm.companyPixKeyType}
                        onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, companyPixKeyType: v }))}
                      >
                        <SelectTrigger id="create-company-pix-key-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CreateFormSection>
              </>
            )}

            {createWithOwnerForm.type === "agency" && (
              <>
                <CreateFormSection
                  icon={Briefcase}
                  title="Dados da Agência"
                  description="Informações principais da agência."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-agency-org-name">
                        Nome da Agência <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="create-agency-org-name"
                        placeholder="Ex: Agência Acme"
                        value={createWithOwnerForm.organizationName}
                        onChange={(e) => {
                          setCreateWithOwnerForm((f) => ({ ...f, organizationName: e.target.value }));
                          clearCreateWithOwnerError("create-agency-org-name");
                        }}
                        aria-invalid={!!createWithOwnerErrors["create-agency-org-name"]}
                        aria-describedby={createWithOwnerErrors["create-agency-org-name"] ? "create-agency-org-name-error" : undefined}
                      />
                      <CreateFieldError id="create-agency-org-name" message={createWithOwnerErrors["create-agency-org-name"]} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-agency-cnpj">CNPJ</Label>
                      <Input
                        id="create-agency-cnpj"
                        placeholder="00.000.000/0000-00"
                        value={createWithOwnerForm.agencyCnpj}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, agencyCnpj: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-agency-phone">Telefone da agência</Label>
                      <Input
                        id="create-agency-phone"
                        placeholder="+55 11 3000-0000"
                        value={createWithOwnerForm.agencyPhone}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, agencyPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="create-agency-status">Status</Label>
                    <Select
                      value={createWithOwnerForm.agencyStatus}
                      onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, agencyStatus: v }))}
                    >
                      <SelectTrigger id="create-agency-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CreateFormSection>

                <CreateFormSection icon={MapPin} title="Endereço" description="Localização da agência.">
                  <CreateWithOwnerAddressFields
                    prefix="agency"
                    form={createWithOwnerForm}
                    setForm={setCreateWithOwnerForm}
                    cepLoading={createWithOwnerCepLoading}
                    cepError={createWithOwnerCepError}
                    onCepChange={handleCreateWithOwnerCepChange}
                  />
                </CreateFormSection>

                <CreateFormSection icon={Wallet} title="Dados Financeiros" description="Informações de recebimento via Pix.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-agency-pix-key">Chave PIX</Label>
                      <Input
                        id="create-agency-pix-key"
                        placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                        value={createWithOwnerForm.agencyPixKey}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, agencyPixKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-agency-pix-key-type">Tipo de chave PIX</Label>
                      <Select
                        value={createWithOwnerForm.agencyPixKeyType}
                        onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, agencyPixKeyType: v }))}
                      >
                        <SelectTrigger id="create-agency-pix-key-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CreateFormSection>
              </>
            )}

            {createWithOwnerForm.type === "nomad" && (
              <>
                <CreateFormSection
                  icon={MapPin}
                  title="Dados do Nômade"
                  description="Contato e situação atual na plataforma."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-nomad-cnpj">
                        CNPJ <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="create-nomad-cnpj"
                        placeholder="00.000.000/0001-00"
                        value={createWithOwnerForm.nomadCnpj}
                        onChange={(e) => {
                          setCreateWithOwnerForm((f) => ({ ...f, nomadCnpj: e.target.value }));
                          clearCreateWithOwnerError("create-nomad-cnpj");
                        }}
                        aria-invalid={!!createWithOwnerErrors["create-nomad-cnpj"]}
                        aria-describedby={createWithOwnerErrors["create-nomad-cnpj"] ? "create-nomad-cnpj-error" : undefined}
                      />
                      <CreateFieldError id="create-nomad-cnpj" message={createWithOwnerErrors["create-nomad-cnpj"]} />
                      <p className="text-[11px] text-slate-400">
                        Obrigatório para prestar serviços à plataforma.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-nomad-whatsapp">WhatsApp</Label>
                      <Input
                        id="create-nomad-whatsapp"
                        placeholder="+55 11 98765-4321"
                        value={createWithOwnerForm.nomadWhatsapp}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, nomadWhatsapp: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-nomad-status">Status</Label>
                      <Select
                        value={createWithOwnerForm.nomadStatus}
                        onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, nomadStatus: v }))}
                      >
                        <SelectTrigger id="create-nomad-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
                          <SelectItem value="reprovado">Reprovado</SelectItem>
                          <SelectItem value="pausado">Pausado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Foto de perfil (opcional)</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                        {createWithOwnerForm.nomadAvatar ? (
                          <img src={createWithOwnerForm.nomadAvatar} alt="Foto" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => createWithOwnerNomadAvatarInputRef.current?.click()}
                      >
                        <Camera className="h-3.5 w-3.5 mr-1" /> Escolher imagem
                      </Button>
                      <input
                        ref={createWithOwnerNomadAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCreateWithOwnerNomadAvatarUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </CreateFormSection>

                {usuarioPrincipalSection}

                <CreateFormSection
                  icon={Award}
                  title="Dados Profissionais"
                  description="Nível de experiência na plataforma."
                >
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="create-nomad-level">Nível</Label>
                    <Select
                      value={createWithOwnerForm.nomadLevel}
                      onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, nomadLevel: v }))}
                    >
                      <SelectTrigger id="create-nomad-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="platinum">Platinum</SelectItem>
                        <SelectItem value="diamond">Diamond</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CreateFormSection>

                <CreateFormSection icon={MapPin} title="Endereço" description="Localização do nômade.">
                  <CreateWithOwnerAddressFields
                    prefix="nomad"
                    form={createWithOwnerForm}
                    setForm={setCreateWithOwnerForm}
                    cepLoading={createWithOwnerCepLoading}
                    cepError={createWithOwnerCepError}
                    onCepChange={handleCreateWithOwnerCepChange}
                  />
                </CreateFormSection>

                <CreateFormSection icon={Wallet} title="Dados Financeiros" description="Informações de recebimento via Pix.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-nomad-pix-key">Chave PIX</Label>
                      <Input
                        id="create-nomad-pix-key"
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        value={createWithOwnerForm.nomadPixKey}
                        onChange={(e) => setCreateWithOwnerForm((f) => ({ ...f, nomadPixKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-nomad-pix-key-type">Tipo de chave PIX</Label>
                      <Select
                        value={createWithOwnerForm.nomadPixKeyType}
                        onValueChange={(v) => setCreateWithOwnerForm((f) => ({ ...f, nomadPixKeyType: v }))}
                      >
                        <SelectTrigger id="create-nomad-pix-key-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CreateFormSection>
              </>
            )}

            {createWithOwnerForm.type !== "nomad" && usuarioPrincipalSection}
          </div>
          </div>

          <div className="shrink-0 flex items-center justify-between gap-3 px-1 py-4 border-t border-slate-100 dark:border-slate-800">
            <p
              className={`text-xs text-red-600 dark:text-red-400 transition-opacity ${
                createWithOwnerErrorSummary ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-live="polite"
            >
              {createWithOwnerErrorSummary ? "Revise os campos destacados antes de continuar." : ""}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleCreateWithOwnerCancelOrBack}
                disabled={createWithOwnerSubmitting}
              >
                Cancelar
              </Button>
              <Button
                className="btn-brand"
                onClick={handleCreateCompanyWithOwner}
                disabled={createWithOwnerSubmitting}
              >
                {createWithOwnerSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </div>
          </div>
        </div>

      {/* FASE 7 — descarte de cadastro com dados preenchidos (Cancelar/Voltar) */}
      <ConfirmationDialog
        open={createWithOwnerDiscardConfirmOpen}
        onClose={() => setCreateWithOwnerDiscardConfirmOpen(false)}
        onConfirm={handleDiscardCreateWithOwner}
        title="Descartar cadastro?"
        message="Os dados preenchidos ainda não foram salvos. Deseja descartá-los e voltar para a listagem?"
        confirmText="Descartar e voltar"
        cancelText="Continuar preenchendo"
        destructive
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => {
          setDeleteDialog({ open: false, companyId: null, companyName: "" });
          setDeleteDialogMembers([]);
          setDeleteDialogActions({});
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir empresa"
        message={
          <div>
            <p>
              Tem certeza que deseja excluir "{deleteDialog.companyName}"? Esta
              ação não pode ser desfeita. O ID ficará disponível para
              reaproveitamento e os dados serão arquivados no histórico.
            </p>
            {(() => {
              const company = companies.find((c) => c.id === deleteDialog.companyId);
              if (company?.type !== "company") return null;
              return (
                <div className="mt-4">
                  {deleteDialogLoadingMembers ? (
                    <p className="text-xs text-slate-400">
                      Carregando usuários vinculados...
                    </p>
                  ) : deleteDialogMembers.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Usuários vinculados ({deleteDialogMembers.length})
                        </span>
                        <Select
                          onValueChange={(v) =>
                            setDeleteDialogActions(
                              Object.fromEntries(
                                deleteDialogMembers.map((m) => [m.id, v as CompanyDeleteUserAction]),
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue placeholder="Aplicar a todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unlink">Desvincular</SelectItem>
                            <SelectItem value="suspend">Pausar</SelectItem>
                            <SelectItem value="delete">Excluir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {deleteDialogMembers.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {m.email}
                              </p>
                            </div>
                            <Select
                              value={deleteDialogActions[m.id] ?? "unlink"}
                              onValueChange={(v) =>
                                setDeleteDialogActions((prev) => ({
                                  ...prev,
                                  [m.id]: v as CompanyDeleteUserAction,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-32 text-xs shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unlink">Desvincular</SelectItem>
                                <SelectItem value="suspend">Pausar</SelectItem>
                                <SelectItem value="delete">Excluir</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Nenhum usuário vinculado a esta empresa.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
      />

      <ConfirmationDialog
        open={pendingClose !== null}
        onClose={() => setPendingClose(null)}
        onConfirm={() => {
          pendingClose?.();
          setPendingClose(null);
        }}
        title="Alterações não salvas"
        message="Você tem alterações não salvas. Deseja sair sem salvar?"
        confirmText="Sair sem salvar"
        cancelText="Cancelar"
        destructive={false}
      />

      {selectedCompany && (
        <>
          <CompanyViewSlidePanel
            open={viewPanelOpen}
            onClose={() => {
              setViewPanelOpen(false);
              setSelectedCompany(null);
              navigate("/admin/empresas", { replace: true });
            }}
            company={selectedCompany}
            onCompanyUpdate={(updatedCompany) => {
              // Update the companies list with the new data
              setCompanies(
                companies.map((c) =>
                  c.id === updatedCompany.id ? updatedCompany : c,
                ),
              );
              // Update the selected company to reflect changes
              setSelectedCompany(updatedCompany);
            }}
          />
          <CompanyEditSlidePanel
            open={editPanelOpen}
            onClose={() => {
              setEditPanelOpen(false);
              setSelectedCompany(null);
            }}
            company={selectedCompany}
            onSave={handleSaveCompany}
          />
        </>
      )}
    </div>
    </div>
  );
}
