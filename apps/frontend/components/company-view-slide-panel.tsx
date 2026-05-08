// @ts-nocheck
import {
  X,
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Wallet,
  ArrowUp,
  ArrowDown,
  Lock,
  Download,
  Star,
  Gift,
  Check,
  MessageSquare,
  Camera,
  Eye,
  Clock,
  Activity,
  Zap,
  UserIcon,
  Edit2,
  Save,
  Loader2,
  XCircle,
  Crown,
  Trash2,
  Plus,
  CreditCard,
  MoreVertical,
  FileText,
  Shield,
  BarChart3,
  Share2,
  PauseCircle,
  ZoomIn,
  Crosshair,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useSidebar } from "@/contexts/sidebar-context";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { usePlatformUsers } from "@/contexts/platform-users-context";
import { CompanyUsersTab } from "@/components/company-users-tab";
import { TermsManagementTab } from "@/components/terms-management-tab";
import { ProjectsManagementTab } from "@/components/projects-management-tab";
import { CompanyTasksTab } from "@/components/company-tasks-tab";
import { CompanyLogsTab } from "@/components/company-logs-tab";
import { CompanyStatusSelector } from "@/components/company-status-selector";
import {
  CompanySocialLinksManager,
  type SocialLink,
} from "@/components/company-social-links-manager";
import { AddressMapPicker } from "@/components/address/address-map-picker";
import { useState, useEffect, useRef } from "react";

type CompanyType = "company" | "agency" | "nomad";
type CompanyStatus = "active" | "inactive" | "pending";

interface Company {
  id: number;
  _apiId?: string;
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
  status: CompanyStatus;
  users_count: number;
  users_online: number;
  projects_count: number;
  created_at: string;
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
  social_links: SocialLink[];
}

interface CompanyViewSlidePanelProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onCompanyUpdate?: (updatedCompany: Company) => void;
}

const SOCIAL_PLATFORM_META: Record<
  string,
  {
    label: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    svgPath: string;
  }
> = {
  instagram: {
    label: "Instagram",
    bg: "from-pink-50 to-rose-50",
    iconBg: "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400",
    iconColor: "text-white",
    svgPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  facebook: {
    label: "Facebook",
    bg: "from-blue-50 to-indigo-50",
    iconBg: "bg-blue-600",
    iconColor: "text-white",
    svgPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  linkedin: {
    label: "LinkedIn",
    bg: "from-sky-50 to-blue-50",
    iconBg: "bg-[#0077B5]",
    iconColor: "text-white",
    svgPath:
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  whatsapp: {
    label: "WhatsApp",
    bg: "from-green-50 to-emerald-50",
    iconBg: "bg-[#25D366]",
    iconColor: "text-white",
    svgPath:
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  tiktok: {
    label: "TikTok",
    bg: "from-slate-50 to-zinc-50",
    iconBg: "bg-black",
    iconColor: "text-white",
    svgPath:
      "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  youtube: {
    label: "YouTube",
    bg: "from-red-50 to-rose-50",
    iconBg: "bg-[#FF0000]",
    iconColor: "text-white",
    svgPath:
      "M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z",
  },
  x: {
    label: "X (Twitter)",
    bg: "from-slate-50 to-zinc-50",
    iconBg: "bg-black",
    iconColor: "text-white",
    svgPath:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  site: {
    label: "Site",
    bg: "from-purple-50 to-violet-50",
    iconBg: "bg-violet-600",
    iconColor: "text-white",
    svgPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  },
  telegram: {
    label: "Telegram",
    bg: "from-sky-50 to-cyan-50",
    iconBg: "bg-[#229ED9]",
    iconColor: "text-white",
    svgPath:
      "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
  google_business: {
    label: "Google Meu Negócio",
    bg: "from-yellow-50 to-amber-50",
    iconBg: "bg-white border border-slate-200",
    iconColor: "text-slate-700",
    svgPath:
      "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
  },
  pinterest: {
    label: "Pinterest",
    bg: "from-red-50 to-pink-50",
    iconBg: "bg-[#E60023]",
    iconColor: "text-white",
    svgPath:
      "M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z",
  },
};

export function CompanyViewSlidePanel({
  open,
  onClose,
  company,
  onCompanyUpdate,
}: CompanyViewSlidePanelProps) {
  // Guard: Return null if company is not provided
  if (!company) return null;

  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();
  const { users: contextUsers } = usePlatformUsers();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [migrationStep, setMigrationStep] = useState<"confirm" | "leader">(
    "confirm",
  );
  const [avatar, setAvatar] = useState<string | null>(company?.avatar || null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const CROP_SIZE = 192;
  const [showBalance, setShowBalance] = useState(false);

  // Edit mode state for Dados tab
  const [isDadosEditMode, setIsDadosEditMode] = useState(false);
  const DADOS_ALL_ACCORDIONS = [
    "cadastrais",
    "contato",
    "endereco",
    "financeiro",
    "adicionais",
  ];
  const [dadosOpenAccordions, setDadosOpenAccordions] = useState<string[]>([]);
  const VISAO_ALL_ACCORDIONS = ["estatisticas", "info-principais"];
  const [visaoOpenAccordions, setVisaoOpenAccordions] = useState<string[]>([]);
  const PLANO_ALL_ACCORDIONS = [
    "admin",
    "credito",
    "account",
    "pagamento",
    "carteira",
    "nf",
  ];
  const [planoOpenAccordions, setPlanoOpenAccordions] = useState<string[]>([
    "admin",
    "credito",
    "account",
    "pagamento",
    "carteira",
    "nf",
  ]);
  const [dadosEditedData, setDadosEditedData] = useState<Record<string, any>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [editingSocialUrl, setEditingSocialUrl] = useState("");
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialLinksBuffer, setSocialLinksBuffer] = useState<SocialLink[]>([]);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [showSocialEditConfirm, setShowSocialEditConfirm] = useState(false);
  const [showSocialDeleteConfirm, setShowSocialDeleteConfirm] = useState(false);
  const [pendingSocialSave, setPendingSocialSave] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [pendingSocialDelete, setPendingSocialDelete] = useState<string | null>(
    null,
  );
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Payment methods state
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<string>("card-1");
  const [creditCards, setCreditCards] = useState<
    Array<{
      id: string;
      brand: string;
      lastFour: string;
      expiry: string;
      holderName: string;
    }>
  >([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardData, setNewCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    holderName: "",
  });

  // Admin actions state
  const [adminActionModal, setAdminActionModal] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({
    creditPlan: company.partner_level || "basic",
    accountType: company.type || "company",
    chargeDate: "",
    paymentDate: "",
    dueDate: "",
  });
  const [showAdminConfirmDialog, setShowAdminConfirmDialog] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Company Wallet state
  const [companyWalletBalance, setCompanyWalletBalance] = useState(0);
  const [companyWalletStatements, setCompanyWalletStatements] = useState<any[]>(
    [],
  );
  const [showCompanyWalletModal, setShowCompanyWalletModal] = useState(false);
  const [companyWalletType, setCompanyWalletType] = useState<"add" | "remove">(
    "add",
  );
  const [companyWalletAmount, setCompanyWalletAmount] = useState("");
  const [companyWalletReason, setCompanyWalletReason] = useState("");
  const [showWalletConfirmDialog, setShowWalletConfirmDialog] = useState(false);
  const [isApplyingCompanyWallet, setIsApplyingCompanyWallet] = useState(false);
  const [showWalletHistoryPanel, setShowWalletHistoryPanel] = useState(false);
  const [walletHistorySearch, setWalletHistorySearch] = useState("");
  const [walletHistoryType, setWalletHistoryType] = useState<
    "all" | "credit" | "debit"
  >("all");
  const [walletHistoryDateFrom, setWalletHistoryDateFrom] = useState("");
  const [walletHistoryDateTo, setWalletHistoryDateTo] = useState("");
  const [showNFHistoryPanel, setShowNFHistoryPanel] = useState(false);
  const [nfHistorySearch, setNfHistorySearch] = useState("");
  const [nfHistoryType, setNfHistoryType] = useState<
    "all" | "nf" | "comprovante"
  >("all");
  const [nfHistoryStatus, setNfHistoryStatus] = useState<
    "all" | "Pago" | "Pendente" | "Cancelado"
  >("all");
  const [nfHistoryDateFrom, setNfHistoryDateFrom] = useState("");
  const [nfHistoryDateTo, setNfHistoryDateTo] = useState("");

  useEffect(() => {
    if (company) {
      setAvatar(company.avatar || null);
    }
  }, [company]);

  if (!company) return null;

  // Avatar handlers
  const handleAvatarClick = () => {
    if (avatar) {
      setShowAvatarMenu((p) => !p);
    } else {
      fileInputRef.current?.click();
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setOriginalRawSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };
  const handleCropConfirm = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const fitScale = Math.min(
      CROP_SIZE / img.naturalWidth,
      CROP_SIZE / img.naturalHeight,
    );
    const drawW = img.naturalWidth * fitScale * cropZoom;
    const drawH = img.naturalHeight * fitScale * cropZoom;
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2;
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    setAvatar(canvas.toDataURL("image/jpeg", 0.92));
    setCropOpen(false);
    setRawImageSrc(null);
  };

  const getTypeLabel = (type: CompanyType) => {
    const labels = {
      company: "Empresa",
      agency: "Agência",
      nomad: "Nômade",
    };
    return labels[type];
  };

  const getStatusColor = (status: CompanyStatus) => {
    const colors = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
    };
    return colors[status] as any;
  };

  const getStatusLabel = (status: CompanyStatus) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
    };
    return labels[status];
  };

  // Payment methods functions
  const handleSetDefaultMethod = (method: string) => {
    setDefaultPaymentMethod(method);
  };

  const handleAddCard = () => {
    if (
      newCardData.number &&
      newCardData.expiry &&
      newCardData.cvv &&
      newCardData.holderName
    ) {
      const lastFour = newCardData.number.slice(-4);
      const detectBrand = (num: string) => {
        if (num.startsWith("4")) return "Visa";
        if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return "Mastercard";
        if (
          /^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(
            num,
          )
        )
          return "Elo";
        if (/^3[47]/.test(num)) return "Amex";
        if (/^(6011|65|644|645|646|647|648|649)/.test(num)) return "Discover";
        if (/^(301|305|36|38)/.test(num)) return "Diners";
        if (/^(606282|3841)/.test(num)) return "Hipercard";
        return "Outro";
      };
      const newCard = {
        id: Math.random().toString(),
        brand: detectBrand(newCardData.number),
        lastFour,
        expiry: newCardData.expiry,
        holderName: newCardData.holderName,
      };
      setCreditCards([...creditCards, newCard]);
      setNewCardData({ number: "", expiry: "", cvv: "", holderName: "" });
      setShowAddCardModal(false);
    }
  };

  const handleRemoveCard = (cardId: string) => {
    setCreditCards(creditCards.filter((card) => card.id !== cardId));
  };

  const handleSetDefaultCard = (cardId: string) => {
    if (creditCards.length > 0) {
      setDefaultPaymentMethod(`card-${cardId}`);
    }
  };

  // Company Wallet handlers
  const handleCompanyWalletAction = (action: "add" | "remove") => {
    setCompanyWalletType(action);
    setCompanyWalletAmount("");
    setCompanyWalletReason("");
    setShowCompanyWalletModal(true);
  };

  const handleCompanyWalletSubmit = () => {
    if (!companyWalletAmount || parseFloat(companyWalletAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido",
        variant: "destructive",
      });
      return;
    }
    if (!companyWalletReason.trim()) {
      toast({
        title: "Erro",
        description: "Informe o motivo da operação",
        variant: "destructive",
      });
      return;
    }
    setShowWalletConfirmDialog(true);
  };

  const handleCompanyWalletConfirm = () => {
    setIsApplyingCompanyWallet(true);
    const amount = parseFloat(companyWalletAmount);
    const currentBalance = companyWalletBalance;
    let newBalance = currentBalance;

    if (companyWalletType === "add") {
      newBalance = currentBalance + amount;
    } else {
      if (currentBalance < amount) {
        toast({
          title: "Erro",
          description: "Saldo não pode ser negativo",
          variant: "destructive",
        });
        setIsApplyingCompanyWallet(false);
        return;
      }
      newBalance = currentBalance - amount;
    }

    const newStatement = {
      id: `stmt_${Date.now()}`,
      date: new Date().toISOString(),
      type: (companyWalletType === "add" ? "credit" : "debit") as const,
      amount,
      reason: companyWalletReason,
      balanceAfter: newBalance,
    };

    setCompanyWalletBalance(newBalance);
    setCompanyWalletStatements((prev) => [newStatement, ...prev]);

    toast({
      title: "Sucesso!",
      description: `Saldo atualizado para R$ ${newBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    });

    setShowCompanyWalletModal(false);
    setShowWalletConfirmDialog(false);
    setIsApplyingCompanyWallet(false);
  };

  // Admin actions handlers
  const handleAdminAction = (action: string) => {
    if (action === "change-account") {
      const currentLabel =
        company.type === "company" && company.account_type === "independent"
          ? "Company Independente"
          : company.type === "company"
            ? "Company Dependente"
            : company.type === "agency"
              ? "Agency"
              : company.type === "nomad"
                ? "Partner"
                : "Company Dependente";
      setAdminFormData((prev) => ({ ...prev, accountType: currentLabel }));
    }
    setAdminActionModal(action);
  };

  const handleConfirmAdminAction = () => {
    if (adminActionModal === "edit-plan") {
      const planNames: Record<string, string> = {
        lite: "Lite",
        start: "Start",
        standard: "Standard",
        growth: "Growth",
        scale: "Scale",
        squad: "Squad",
        enterprise: "Enterprise",
      };
      if (onCompanyUpdate) {
        onCompanyUpdate({
          ...company,
          partner_level: adminFormData.creditPlan,
        });
      }
      toast({
        title: "Plano atualizado!",
        description: `Plano alterado para ${planNames[adminFormData.creditPlan] ?? adminFormData.creditPlan}.`,
      });
    }
    if (adminActionModal === "change-account") {
      const typeMap: Record<
        string,
        { type: CompanyType; account_type?: string }
      > = {
        "Company Dependente": { type: "company", account_type: undefined },
        "Company Independente": {
          type: "company",
          account_type: "independent",
        },
        Agency: { type: "agency", account_type: undefined },
        Partner: { type: "nomad", account_type: undefined },
      };
      const mapped = typeMap[adminFormData.accountType];
      if (mapped && onCompanyUpdate) {
        onCompanyUpdate({
          ...company,
          type: mapped.type,
          account_type: mapped.account_type,
        });
      }
      toast({
        title: "Tipo de conta atualizado!",
        description: `Tipo alterado para ${adminFormData.accountType}.`,
      });
    }
    setShowAdminConfirmDialog(false);
    setAdminActionModal(null);
  };

  const handleGenerateBoleto = () => {
    setAdminActionModal(null);
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMigrateClick = () => {
    setMigrationStep("confirm");
    setShowMigrateModal(true);
  };

  const handleConfirmMigration = () => {
    setMigrationStep("leader");
  };

  const handleInviteLeader = () => {
    setShowMigrateModal(false);
    setMigrationStep("confirm");
  };

  const handleMigrateWithoutInvite = () => {
    setShowMigrateModal(false);
    setMigrationStep("confirm");
  };

  const handleCloseMigrateModal = () => {
    setShowMigrateModal(false);
    setMigrationStep("confirm");
  };

  // Dados tab edit handlers
  const getDadosDisplayValue = (key: string) => {
    if (isDadosEditMode && key in dadosEditedData) {
      return dadosEditedData[key];
    }
    const fieldMap: Record<string, string> = {
      legal_name: "legal_name",
      trade_name: "name",
      document: "document",
      ie: "ie",
      status: "status",
      email: "email",
      phone: "phone",
      phone_secondary: "phone_secondary",
      whatsapp: "whatsapp",
      website: "website",
      zip_code: "zip_code",
      street: "street",
      number: "number",
      complement: "complement",
      neighborhood: "neighborhood",
      city: "city",
      state: "state",
      country: "country",
      pix_key: "pix_key",
      pix_type: "pix_type",
      bank_name: "bank_name",
      bank_agency: "bank_agency",
      bank_account: "bank_account",
      bank_account_type: "bank_account_type",
      admin_notes: "admin_notes",
      internal_notes: "internal_notes",
    };
    return (company as any)?.[fieldMap[key]] || "";
  };

  const handleDadosFieldChange = (key: string, value: any) => {
    setDadosEditedData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDadosEditMode = () => {
    setIsDadosEditMode(true);
  };

  const handleDadosCancelEdit = () => {
    setIsDadosEditMode(false);
    setDadosEditedData({});
  };

  const saveSocialLinksDirectly = async (links: SocialLink[]) => {
    if (!company?.id) return;
    setIsSavingSocial(true);
    try {
      const apiId = (company as any)._apiId || company.id;
      await apiClient.updateCompany(String(apiId), {
        website: links.find((l) => l.platform === "site")?.url || undefined,
      });
      onCompanyUpdate?.({ ...company, social_links: links });
      toast({
        title: "Redes sociais salvas!",
        description: "Links atualizados com sucesso.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao salvar redes sociais",
        variant: "destructive",
      });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const SOCIAL_DEMO_LINKS: SocialLink[] = [
    {
      id: "demo-ig",
      platform: "instagram",
      url: "https://instagram.com/empresa",
      order: 0,
    },
    {
      id: "demo-fb",
      platform: "facebook",
      url: "https://facebook.com/empresa",
      order: 1,
    },
    {
      id: "demo-li",
      platform: "linkedin",
      url: "https://linkedin.com/company/empresa",
      order: 2,
    },
    {
      id: "demo-wa",
      platform: "whatsapp",
      url: "https://wa.me/5511999999999",
      order: 3,
    },
  ];

  const confirmSaveSocialCard = async () => {
    if (!pendingSocialSave) return;
    const base = (
      company?.social_links && company.social_links.length > 0
        ? company.social_links
        : SOCIAL_DEMO_LINKS
    ) as SocialLink[];
    const updated = base.map((l) =>
      l.id === pendingSocialSave.id ? { ...l, url: pendingSocialSave.url } : l,
    );
    setEditingSocialId(null);
    setShowSocialEditConfirm(false);
    setPendingSocialSave(null);
    await saveSocialLinksDirectly(updated);
  };

  const confirmDeleteSocialCard = async () => {
    if (!pendingSocialDelete) return;
    const base = (
      company?.social_links && company.social_links.length > 0
        ? company.social_links
        : SOCIAL_DEMO_LINKS
    ) as SocialLink[];
    const updated = base.filter((l) => l.id !== pendingSocialDelete);
    setShowSocialDeleteConfirm(false);
    setPendingSocialDelete(null);
    await saveSocialLinksDirectly(updated);
  };

  const handleDadosSaveClick = () => {
    // Validation
    const name =
      getDadosDisplayValue("legal_name") || getDadosDisplayValue("trade_name");
    const email = getDadosDisplayValue("email");
    const phone = getDadosDisplayValue("phone");
    const zipCode = getDadosDisplayValue("zip_code");

    // Required field validation
    if (!name || typeof name !== "string" || !name.trim()) {
      toast({
        title: "Erro",
        description: "Nome / Razão Social  obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      toast({
        title: "Erro",
        description: "Email válido  obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Phone validation
    if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
      toast({
        title: "Erro",
        description: "Telefone principal  obrigatório (mínimo 10 caracteres)",
        variant: "destructive",
      });
      return;
    }

    // CEP validation (if provided)
    if (
      zipCode &&
      typeof zipCode === "string" &&
      zipCode.trim().length > 0 &&
      zipCode.trim().length < 8
    ) {
      toast({
        title: "Erro",
        description: "CEP deve ter no mínimo 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    // Validation passed  show confirmation dialog
    setShowSaveConfirm(true);
  };

  const performDadosSave = async () => {
    if (!company?.id) {
      toast({
        title: "Erro",
        description: "ID da empresa não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const dataPayload = {
        name: getDadosDisplayValue("trade_name") || company.name,
        legal_name: getDadosDisplayValue("legal_name") || company.name,
        email: getDadosDisplayValue("email"),
        phone: getDadosDisplayValue("phone"),
        phone_secondary: getDadosDisplayValue("phone_secondary") || undefined,
        whatsapp: getDadosDisplayValue("whatsapp") || undefined,
        website: getDadosDisplayValue("website") || undefined,
        ie: getDadosDisplayValue("ie") || undefined,
        zip_code: getDadosDisplayValue("zip_code") || undefined,
        street: getDadosDisplayValue("street") || undefined,
        number: getDadosDisplayValue("number") || undefined,
        complement: getDadosDisplayValue("complement") || undefined,
        neighborhood: getDadosDisplayValue("neighborhood") || undefined,
        city: getDadosDisplayValue("city") || undefined,
        state: getDadosDisplayValue("state") || undefined,
        country: getDadosDisplayValue("country") || "Brasil",
        pix_key: getDadosDisplayValue("pix_key") || undefined,
        pix_type: getDadosDisplayValue("pix_type") || undefined,
        bank_name: getDadosDisplayValue("bank_name") || undefined,
        bank_agency: getDadosDisplayValue("bank_agency") || undefined,
        bank_account: getDadosDisplayValue("bank_account") || undefined,
        bank_account_type:
          getDadosDisplayValue("bank_account_type") || undefined,
        admin_notes: getDadosDisplayValue("admin_notes") || undefined,
        internal_notes: getDadosDisplayValue("internal_notes") || undefined,
        status: getDadosDisplayValue("status") || company.status,
      };

      // Persist to API
      const apiId = (company as any)._apiId || company.id;
      await apiClient.updateCompany(String(apiId), {
        name: dataPayload.name,
        email: dataPayload.email || undefined,
        phone: dataPayload.phone || undefined,
        website: dataPayload.website || undefined,
        status:
          dataPayload.status === "active"
            ? "ativo"
            : dataPayload.status === "inactive"
              ? "inativo"
              : dataPayload.status || undefined,
        address:
          [
            dataPayload.street,
            dataPayload.number,
            dataPayload.complement,
            dataPayload.city,
            dataPayload.state,
            dataPayload.zip_code,
          ]
            .filter(Boolean)
            .join(", ") || undefined,
        description: dataPayload.admin_notes || undefined,
      });

      const updatedCompany: Company = {
        ...company!,
        name: dataPayload.name as string,
        legal_name: dataPayload.legal_name as string,
        email: dataPayload.email as string,
        phone: dataPayload.phone as string,
        phone_secondary: dataPayload.phone_secondary,
        whatsapp: dataPayload.whatsapp,
        website: dataPayload.website,
        ie: dataPayload.ie,
        zip_code: dataPayload.zip_code,
        street: dataPayload.street,
        number: dataPayload.number,
        complement: dataPayload.complement,
        neighborhood: dataPayload.neighborhood,
        city: dataPayload.city,
        state: dataPayload.state,
        country: dataPayload.country,
        pix_key: dataPayload.pix_key,
        pix_type: dataPayload.pix_type,
        bank_name: dataPayload.bank_name,
        bank_agency: dataPayload.bank_agency,
        bank_account: dataPayload.bank_account,
        bank_account_type: dataPayload.bank_account_type,
        admin_notes: dataPayload.admin_notes,
        internal_notes: dataPayload.internal_notes,
        status: dataPayload.status as CompanyStatus,
      };

      onCompanyUpdate?.(updatedCompany);
      toast({
        title: "Dados salvos!",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });
      setIsDadosEditMode(false);
      setDadosEditedData({});
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar dados da empresa",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Mock data for charts and metrics
  const moduleUsageData = [
    { nome: "Vendas", uso: 1200 },
    { nome: "Financeiro", uso: 980 },
    { nome: "Relatórios", uso: 850 },
    { nome: "RH", uso: 720 },
    { nome: "Operações", uso: 650 },
  ];

  // Real users linked to this company (via company_associations or company_id)
  const companyApiId = company._apiId ?? String(company.id);
  const companyUsers = contextUsers.filter(
    (u) =>
      u.company_associations?.some(
        (a) => String(a.company_id) === companyApiId,
      ) || u.company_id === companyApiId,
  );

  // Sort by last_login descending and take up to 5 for the recents card
  const getRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora mesmo";
    if (mins < 60) return `Há ${mins} minuto${mins !== 1 ? "s" : ""}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Há ${hrs} hora${hrs !== 1 ? "s" : ""}`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return `${days} dias atrás`;
    const wks = Math.floor(days / 7);
    return `${wks} semana${wks !== 1 ? "s" : ""} atrás`;
  };

  const recentUsers = companyUsers
    .filter((u) => u.last_login)
    .sort(
      (a, b) =>
        new Date(b.last_login!).getTime() - new Date(a.last_login!).getTime(),
    )
    .slice(0, 5)
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      time: getRelativeTime(u.last_login!),
      isOnline: u.online_status === "online",
    }));

  const onlineCount = companyUsers.filter(
    (u) => u.online_status === "online",
  ).length;

  return (
    <>
      <Sheet
        open={open && !showMigrateModal}
        onOpenChange={(o) => {
          if (!o && !showSaveConfirm && !showCancelConfirm) onClose();
        }}
      >
        <SheetContent
          side="right"
          hideOverlay={true}
          onInteractOutside={(e) => {
            if (
              showSaveConfirm ||
              showCancelConfirm ||
              showSocialEditConfirm ||
              showSocialDeleteConfirm ||
              showSocialModal ||
              showWalletHistoryPanel ||
              showNFHistoryPanel
            )
              e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (
              showSaveConfirm ||
              showCancelConfirm ||
              showSocialEditConfirm ||
              showSocialDeleteConfirm ||
              showSocialModal ||
              showWalletHistoryPanel ||
              showNFHistoryPanel
            )
              e.preventDefault();
          }}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <ModalBrandHeader
              right={
                <div className="flex items-center gap-3 flex-shrink-0">
                  {company.status === "active" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Ativa
                    </span>
                  )}
                  {company.status === "inactive" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-400 text-white">
                      <PauseCircle className="h-3.5 w-3.5" />
                      Inativa
                    </span>
                  )}
                  {company.status === "pending" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
                      <Clock className="h-3.5 w-3.5" />
                      Pendente
                    </span>
                  )}
                  {/* Credit Plan Badge */}
                  {company.partner_level &&
                    (() => {
                      const planMap: Record<
                        string,
                        { name: string; color: string }
                      > = {
                        lite: {
                          name: "Lite",
                          color:
                            "bg-slate-100 text-slate-600 border border-slate-200",
                        },
                        start: {
                          name: "Start",
                          color:
                            "bg-green-100 text-green-700 border border-green-200",
                        },
                        standard: {
                          name: "Standard",
                          color:
                            "bg-blue-100 text-blue-700 border border-blue-200",
                        },
                        growth: {
                          name: "Growth",
                          color:
                            "bg-indigo-100 text-indigo-700 border border-indigo-200",
                        },
                        scale: {
                          name: "Scale",
                          color:
                            "bg-violet-100 text-violet-700 border border-violet-200",
                        },
                        squad: {
                          name: "Squad",
                          color:
                            "bg-orange-100 text-orange-700 border border-orange-200",
                        },
                        enterprise: {
                          name: "Enterprise",
                          color:
                            "bg-purple-100 text-purple-700 border border-purple-200",
                        },
                        // backwards compat
                        basic: {
                          name: "Lite",
                          color:
                            "bg-slate-100 text-slate-600 border border-slate-200",
                        },
                        starter: {
                          name: "Start",
                          color:
                            "bg-green-100 text-green-700 border border-green-200",
                        },
                        pro: {
                          name: "Standard",
                          color:
                            "bg-blue-100 text-blue-700 border border-blue-200",
                        },
                        gold: {
                          name: "Growth",
                          color:
                            "bg-indigo-100 text-indigo-700 border border-indigo-200",
                        },
                        silver: {
                          name: "Lite",
                          color:
                            "bg-slate-100 text-slate-600 border border-slate-200",
                        },
                        platinum: {
                          name: "Enterprise",
                          color:
                            "bg-purple-100 text-purple-700 border border-purple-200",
                        },
                      };
                      const p = planMap[
                        company.partner_level!.toLowerCase()
                      ] ?? {
                        name: company.partner_level,
                        color:
                          "bg-slate-100 text-slate-600 border border-slate-200",
                      };
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${p.color}`}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          {p.name}
                        </span>
                      );
                    })()}

                  {/* Account Type Badge */}
                  {(() => {
                    const label =
                      company.type === "company" &&
                      company.account_type === "independent"
                        ? "Company Independente"
                        : company.type === "company"
                          ? "Company Dependente"
                          : company.type === "agency"
                            ? "Agency"
                            : company.type === "nomad"
                              ? "Partner"
                              : null;
                    if (!label) return null;
                    const typeColor =
                      label === "Company Independente"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : label === "Company Dependente"
                          ? "bg-violet-100 text-violet-700 border border-violet-200"
                          : label === "Agency"
                            ? "bg-pink-100 text-pink-700 border border-pink-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200";
                    const TypeIcon =
                      label === "Agency"
                        ? Building2
                        : label === "Partner"
                          ? Star
                          : Building2;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor}`}
                      >
                        <TypeIcon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    );
                  })()}

                  {/* Wallet Balance Card */}
                  <div
                    onClick={() => setShowBalance(!showBalance)}
                    className="flex cursor-pointer items-center gap-2 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 px-4 py-2 rounded-lg border border-blue-700/50 flex-shrink-0 hover:border-blue-600/75 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">
                        ALLKOIN
                      </p>
                      <p className="text-white font-bold text-sm">
                        {showBalance ? "0.00" : ""}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-blue-200" />
                  </div>
                  <CopyLinkButton />
                </div>
              }
              left={
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar Section */}
                  <button
                    onClick={handleAvatarClick}
                    className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="logo"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500">
                        <span className="text-white font-bold text-2xl">
                          {company.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-[9px] text-white/90 font-medium mt-0.5">
                        {avatar ? "Editar" : "Foto"}
                      </span>
                    </div>
                  </button>

                  {/* Main Info Section */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">
                      {company.name}
                    </h2>
                    <p className="text-blue-300 text-xs truncate">
                      {company.email}
                    </p>
                    <p className="text-blue-200 text-xs mt-1">
                      {getTypeLabel(company.type)}
                    </p>
                  </div>
                </div>
              }
            />
            {/* Avatar menu */}
            {showAvatarMenu && avatar && (
              <>
                <div
                  className="absolute inset-0 z-40"
                  onClick={() => setShowAvatarMenu(false)}
                />
                <div
                  className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]"
                  style={{ top: 108, left: 22 }}
                >
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setTimeout(() => fileInputRef.current?.click(), 10);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-gray-400" />
                    Nova foto
                  </button>
                  {originalRawSrc && (
                    <button
                      onClick={() => {
                        setShowAvatarMenu(false);
                        setRawImageSrc(originalRawSrc);
                        setCropZoom(1);
                        setCropOffset({ x: 0, y: 0 });
                        setCropOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                      Reposicionar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setAvatar(null);
                      setOriginalRawSrc(null);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover foto
                  </button>
                </div>
              </>
            )}

            {/* Crop overlay */}
            {cropOpen && rawImageSrc && (
              <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
                <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                  <p className="text-white text-sm font-semibold">
                    Ajustar logo da empresa
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Arraste para reposicionar use o zoom para ajustar
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({
                        x: e.clientX - cropOffset.x,
                        y: e.clientY - cropOffset.y,
                      });
                    }}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      setCropOffset({
                        x: e.clientX - dragStart.x,
                        y: e.clientY - dragStart.y,
                      });
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <img
                      ref={cropImgRef}
                      src={rawImageSrc}
                      alt="crop"
                      draggable={false}
                      style={{
                        transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                        transformOrigin: "center",
                        userSelect: "none",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        opacity: 0.35,
                      }}
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`,
                        pointerEvents: "none",
                      }}
                    >
                      <img
                        src={rawImageSrc}
                        alt="crop-bright"
                        draggable={false}
                        style={{
                          transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                          transformOrigin: "center",
                          userSelect: "none",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <div
                      className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none"
                      style={{ borderRadius: "50%" }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 px-6 pb-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-white/60 flex-shrink-0" />
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.01}
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-white"
                    />
                    <button
                      onClick={() => setCropOffset({ x: 0, y: 0 })}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                      title="Centralizar"
                    >
                      <Crosshair className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCropOpen(false);
                        setRawImageSrc(null);
                      }}
                      className="flex-1 h-9 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCropConfirm}
                      className="flex-1 h-9 rounded-lg btn-brand text-sm font-semibold transition-colors"
                    >
                      Usar esta foto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content Wrapper */}
            <div className="flex-1 flex flex-col bg-slate-200 dark:bg-background overflow-hidden">
              {/* Content with Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-shrink-0 bg-slate-200 dark:bg-background px-[50px] pt-2 pb-2 border-b border-slate-300 dark:border-slate-700 overflow-x-auto">
                  <TabsList className="grid w-max grid-cols-10 gap-1 bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="visao-geral"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Visão Geral
                    </TabsTrigger>
                    <TabsTrigger
                      value="dados"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Dados
                    </TabsTrigger>
                    <TabsTrigger
                      value="usuarios"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Usuários
                    </TabsTrigger>
                    <TabsTrigger
                      value="redes-sociais"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Redes Sociais
                    </TabsTrigger>
                    <TabsTrigger
                      value="plano"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Plano
                    </TabsTrigger>
                    <TabsTrigger
                      value="termos"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Termos
                    </TabsTrigger>
                    <TabsTrigger
                      value="projetos"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Projetos
                    </TabsTrigger>
                    <TabsTrigger
                      value="tarefas"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Tarefas
                    </TabsTrigger>
                    <TabsTrigger
                      value="log"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      Log
                    </TabsTrigger>
                    <TabsTrigger
                      value="lgpd"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-white/70"
                    >
                      LGPD
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent
                  value="visao-geral"
                  className="flex-1 overflow-y-auto bg-slate-200 dark:bg-background"
                >
                  <div className="px-[50px] py-5 pb-16 space-y-4">
                    {/* KPI Cards — gradient style matching admin/usuarios */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="relative rounded-xl overflow-hidden bg-linear-to-br from-blue-500 to-blue-700 border border-blue-300/70 shadow-md">
                        <div className="px-3 pt-2 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight">
                              Tarefas contratadas
                            </p>
                            <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
                              <TrendingUp className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white leading-none">
                            1.247
                          </p>
                          <p className="text-[10px] text-white/60 mt-1">
                            Vinculadas à empresa
                          </p>
                        </div>
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-linear-to-br from-violet-500 to-purple-700 border border-violet-300/70 shadow-md">
                        <div className="px-3 pt-2 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight">
                              Pontuação total
                            </p>
                            <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
                              <Star className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white leading-none">
                            8.430 pts
                          </p>
                          <p className="text-[10px] text-white/60 mt-1">
                            Soma dos projetos
                          </p>
                        </div>
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-linear-to-br from-emerald-500 to-teal-600 border border-emerald-300/70 shadow-md">
                        <div className="px-3 pt-2 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight">
                              Economia gerada
                            </p>
                            <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
                              <Wallet className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-white leading-none">
                            R$ 124.500
                          </p>
                          <p className="text-[10px] text-white/60 mt-1">
                            Economia acumulada
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mini stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Total de usuários
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {companyUsers.length || company.users_count}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Online agora
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {onlineCount}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                            <CheckCircle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Projetos
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {company.projects_count}
                        </p>
                      </div>
                    </div>

                    {/* Últimos acessos + Módulos mais usados */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Últimos acessos
                          </h3>
                        </div>
                        <div className="space-y-2.5">
                          {recentUsers.length > 0 ? (
                            recentUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-2.5"
                              >
                                <div className="relative shrink-0">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      {user.avatar}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.isOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {user.time}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
                              Nenhum usuário cadastrado
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <BarChart3 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Módulos mais usados
                          </h3>
                        </div>
                        <ResponsiveContainer width="100%" height={155}>
                          <BarChart
                            data={moduleUsageData}
                            layout="vertical"
                            margin={{ top: 0, right: 16, left: 68, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                            />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis
                              dataKey="nome"
                              type="category"
                              tick={{ fontSize: 9 }}
                              width={64}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "none",
                                borderRadius: "4px",
                                color: "#fff",
                                fontSize: "11px",
                              }}
                            />
                            <Bar dataKey="uso" fill="#3b82f6" radius={2} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Informações Principais
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                        {[
                          {
                            label: "ID",
                            value: (
                              <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                {company.id}
                              </code>
                            ),
                          },
                          {
                            label: "Tipo",
                            value: (
                              <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">
                                {getTypeLabel(company.type)}
                              </Badge>
                            ),
                          },
                          {
                            label: "Status",
                            value: (
                              <Badge
                                variant={getStatusColor(company.status)}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {getStatusLabel(company.status)}
                              </Badge>
                            ),
                          },
                          {
                            label: "Cadastro",
                            value: (
                              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                {new Date(
                                  company.created_at,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            ),
                          },
                          {
                            label: "E-mail",
                            value: (
                              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px] block">
                                {company.email}
                              </span>
                            ),
                          },
                          {
                            label: "Telefone",
                            value: (
                              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                {company.phone || "—"}
                              </span>
                            ),
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                          >
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {label}
                            </span>
                            {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Dados Tab */}
                <TabsContent
                  value="dados"
                  className="flex-1 overflow-y-auto bg-slate-200 space-y-4 mt-0 px-[50px] pt-[25px] pb-[80px]"
                >
                  {/* Header with Edit Button */}
                  <div className="flex items-center justify-between pb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Dados da Empresa
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const allOpen = DADOS_ALL_ACCORDIONS.every((a) =>
                            dadosOpenAccordions.includes(a),
                          );
                          setDadosOpenAccordions(
                            allOpen ? [] : DADOS_ALL_ACCORDIONS,
                          );
                        }}
                        className="flex items-center gap-2 group"
                        title={
                          DADOS_ALL_ACCORDIONS.every((a) =>
                            dadosOpenAccordions.includes(a),
                          )
                            ? "Fechar todos"
                            : "Abrir todos"
                        }
                      >
                        <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                          {DADOS_ALL_ACCORDIONS.every((a) =>
                            dadosOpenAccordions.includes(a),
                          )
                            ? "Fechar"
                            : "Expandir"}
                        </span>
                        <div
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                            DADOS_ALL_ACCORDIONS.every((a) =>
                              dadosOpenAccordions.includes(a),
                            )
                              ? "bg-blue-600"
                              : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                              DADOS_ALL_ACCORDIONS.every((a) =>
                                dadosOpenAccordions.includes(a),
                              )
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </button>
                      {!isDadosEditMode ? (
                        <Button
                          onClick={handleDadosEditMode}
                          size="sm"
                          className="btn-brand"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleDadosSaveClick}
                            size="sm"
                            disabled={isSaving}
                            className="btn-brand"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            {isSaving ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button
                            onClick={() => setShowCancelConfirm(true)}
                            size="sm"
                            variant="outline"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accordions */}
                  <Accordion
                    type="multiple"
                    value={dadosOpenAccordions}
                    onValueChange={setDadosOpenAccordions}
                    className="space-y-2"
                  >
                    {/* DADOS CADASTRAIS */}
                    <AccordionItem
                      value="cadastrais"
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">
                            Dados Cadastrais
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {/* Razão Social */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Razão Social
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  getDadosDisplayValue("legal_name") as string
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "legal_name",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Digite a razão social"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("legal_name") ||
                                  company.name ||
                                  ""}
                              </p>
                            )}
                          </div>

                          {/* Nome Fantasia */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Nome Fantasia
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "trade_name",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "trade_name",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Digite o nome fantasia"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("trade_name") ||
                                  company.name ||
                                  ""}
                              </p>
                            )}
                          </div>

                          {/* CNPJ */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              CNPJ
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "document",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "document",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 font-mono text-sm"
                                placeholder="00.000.000/0000-00"
                                disabled
                              />
                            ) : (
                              <p className="text-sm font-mono font-bold text-slate-700">
                                {company.document || ""}
                              </p>
                            )}
                          </div>

                          {/* Inscrição Estadual */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Inscrição Estadual
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("ie") as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange("ie", e.target.value)
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="IE"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("ie") || ""}
                              </p>
                            )}
                          </div>

                          {/* Status da Empresa */}
                          <div className="md:col-span-2 bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                              Status da Empresa
                            </p>
                            {isDadosEditMode ? (
                              <CompanyStatusSelector
                                value={
                                  (getDadosDisplayValue(
                                    "status",
                                  ) as CompanyStatus) || "active"
                                }
                                onChange={(status) =>
                                  handleDadosFieldChange("status", status)
                                }
                                showLabel={false}
                              />
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  company.status === "active"
                                    ? "bg-emerald-500 text-white"
                                    : company.status === "inactive"
                                      ? "bg-slate-200 text-slate-600"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {company.status === "active" && (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                {company.status === "inactive" && (
                                  <PauseCircle className="h-3.5 w-3.5" />
                                )}
                                {company.status === "pending" && (
                                  <Clock className="h-3.5 w-3.5" />
                                )}
                                {getStatusLabel(company.status)}
                              </span>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* CONTATO */}
                    <AccordionItem
                      value="contato"
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold text-slate-800">
                            Contato
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {/* Email Principal */}
                          <div className="md:col-span-2 bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Email Principal
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                type="email"
                                value={getDadosDisplayValue("email") as string}
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "email",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="email@example.com"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("email") || ""}
                              </p>
                            )}
                          </div>

                          {/* Telefone Principal */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Telefone Principal
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                type="tel"
                                value={
                                  (getDadosDisplayValue("phone") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "phone",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="(00) 0000-0000"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("phone") || ""}
                              </p>
                            )}
                          </div>

                          {/* Telefone Secundário */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Telefone Secundário
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                type="tel"
                                value={
                                  (getDadosDisplayValue(
                                    "phone_secondary",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "phone_secondary",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="(00) 0000-0000"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("phone_secondary") || ""}
                              </p>
                            )}
                          </div>

                          {/* WhatsApp */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              WhatsApp
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                type="tel"
                                value={
                                  (getDadosDisplayValue(
                                    "whatsapp",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "whatsapp",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="(00) 00000-0000"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("whatsapp") || ""}
                              </p>
                            )}
                          </div>

                          {/* Site */}
                          <div className="md:col-span-2 bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Site
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                type="url"
                                value={
                                  (getDadosDisplayValue("website") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "website",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="https://exemplo.com.br"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {getDadosDisplayValue("website") || ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* ENDEREÇO */}
                    <AccordionItem
                      value="endereco"
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-500" />
                          <span className="font-semibold text-slate-800">
                            Endereço
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        {/* MAP  view: static embed | edit: interactive picker */}
                        {!isDadosEditMode ? (
                          (() => {
                            const parts = [
                              getDadosDisplayValue("street") || company.street,
                              getDadosDisplayValue("number") || company.number,
                              getDadosDisplayValue("neighborhood") ||
                                company.neighborhood,
                              getDadosDisplayValue("city") || company.city,
                              getDadosDisplayValue("state") || company.state,
                              "Brasil",
                            ].filter(Boolean);
                            const query = encodeURIComponent(
                              parts.length > 1
                                ? parts.join(", ")
                                : company.location,
                            );
                            return (
                              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                <iframe
                                  title="Localização da empresa"
                                  width="100%"
                                  height="220"
                                  loading="lazy"
                                  src={`https://maps.google.com/maps?q=${query}&output=embed&z=15`}
                                  className="block"
                                  style={{ border: 0 }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                              Localização no Mapa
                            </label>
                            <AddressMapPicker
                              address={{
                                street:
                                  (getDadosDisplayValue("street") as string) ||
                                  company.street ||
                                  "",
                                number:
                                  (getDadosDisplayValue("number") as string) ||
                                  company.number ||
                                  "",
                                district:
                                  (getDadosDisplayValue(
                                    "neighborhood",
                                  ) as string) ||
                                  company.neighborhood ||
                                  "",
                                city:
                                  (getDadosDisplayValue("city") as string) ||
                                  company.city ||
                                  "",
                                state:
                                  (getDadosDisplayValue("state") as string) ||
                                  company.state ||
                                  "",
                                zipcode:
                                  (getDadosDisplayValue(
                                    "zip_code",
                                  ) as string) ||
                                  company.zip_code ||
                                  "",
                              }}
                              onAddressChange={(addr) => {
                                if (addr.street !== undefined)
                                  handleDadosFieldChange("street", addr.street);
                                if (addr.number !== undefined)
                                  handleDadosFieldChange("number", addr.number);
                                if (addr.district !== undefined)
                                  handleDadosFieldChange(
                                    "neighborhood",
                                    addr.district,
                                  );
                                if (addr.city !== undefined)
                                  handleDadosFieldChange("city", addr.city);
                                if (addr.state !== undefined)
                                  handleDadosFieldChange("state", addr.state);
                                if (addr.zipcode !== undefined)
                                  handleDadosFieldChange(
                                    "zip_code",
                                    addr.zipcode,
                                  );
                              }}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {/* CEP */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              CEP
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "zip_code",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "zip_code",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 font-mono text-sm"
                                placeholder="00000-000"
                              />
                            ) : (
                              <p className="text-sm font-mono font-bold text-slate-700">
                                {company.zip_code || ""}
                              </p>
                            )}
                          </div>

                          {/* Rua */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Rua
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("street") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "street",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Nome da rua"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.street || ""}
                              </p>
                            )}
                          </div>

                          {/* Número */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Número
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("number") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "number",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="123"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.number || ""}
                              </p>
                            )}
                          </div>

                          {/* Complemento */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Complemento
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "complement",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "complement",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Apto 123, Bloco A"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.complement || ""}
                              </p>
                            )}
                          </div>

                          {/* Bairro */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Bairro
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "neighborhood",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "neighborhood",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Nome do bairro"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.neighborhood || ""}
                              </p>
                            )}
                          </div>

                          {/* Cidade */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Cidade
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("city") as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange("city", e.target.value)
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="São Paulo"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.city || ""}
                              </p>
                            )}
                          </div>

                          {/* Estado */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Estado
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("state") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "state",
                                    e.target.value.toUpperCase(),
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="SP"
                                maxLength={2}
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.state || ""}
                              </p>
                            )}
                          </div>

                          {/* País */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              País
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("country") as string) ||
                                  "Brasil"
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "country",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Brasil"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.country || "Brasil"}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* FINANCEIRO */}
                    <AccordionItem
                      value="financeiro"
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-rose-500" />
                          <span className="font-semibold text-slate-800">
                            Financeiro
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {/* Chave PIX */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Chave PIX
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue("pix_key") as string) ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "pix_key",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Chave PIX"
                              />
                            ) : (
                              <p className="text-sm font-mono font-bold text-slate-700">
                                {company.pix_key || ""}
                              </p>
                            )}
                          </div>

                          {/* Tipo de Chave PIX */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Tipo de Chave PIX
                            </p>
                            {isDadosEditMode ? (
                              <select
                                value={
                                  (getDadosDisplayValue(
                                    "pix_type",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "pix_type",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-medium"
                              >
                                <option value="">Selecione</option>
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">Email</option>
                                <option value="phone">Telefone</option>
                                <option value="random">Aleatória</option>
                              </select>
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.pix_type || ""}
                              </p>
                            )}
                          </div>

                          {/* Banco */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Banco
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "bank_name",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "bank_name",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="Nome do banco"
                              />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.bank_name || ""}
                              </p>
                            )}
                          </div>

                          {/* Agência */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Agência
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "bank_agency",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "bank_agency",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="0000"
                              />
                            ) : (
                              <p className="text-sm font-mono font-bold text-slate-700">
                                {company.bank_agency || ""}
                              </p>
                            )}
                          </div>

                          {/* Conta */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Conta
                            </p>
                            {isDadosEditMode ? (
                              <Input
                                value={
                                  (getDadosDisplayValue(
                                    "bank_account",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "bank_account",
                                    e.target.value,
                                  )
                                }
                                className="border-slate-300 h-8 text-sm"
                                placeholder="000000-0"
                              />
                            ) : (
                              <p className="text-sm font-mono font-bold text-slate-700">
                                {company.bank_account || ""}
                              </p>
                            )}
                          </div>

                          {/* Tipo de Conta */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                              Tipo de Conta
                            </p>
                            {isDadosEditMode ? (
                              <select
                                value={
                                  (getDadosDisplayValue(
                                    "bank_account_type",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "bank_account_type",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-medium"
                              >
                                <option value="">Selecione</option>
                                <option value="corrente">Corrente</option>
                                <option value="poupanca">Poupança</option>
                              </select>
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">
                                {company.bank_account_type || ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* INFORMAÇÕES ADICIONAIS */}
                    <AccordionItem
                      value="adicionais"
                      className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-violet-500" />
                          <span className="font-semibold text-slate-800">
                            Informações Adicionais
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        <div className="space-y-2">
                          {/* Observações Administrativas */}
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                              Observações Administrativas
                            </p>
                            {isDadosEditMode ? (
                              <textarea
                                value={
                                  (getDadosDisplayValue(
                                    "admin_notes",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "admin_notes",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20"
                                placeholder="Notas visíveis para admin"
                              />
                            ) : (
                              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {company.admin_notes || ""}
                              </p>
                            )}
                          </div>

                          {/* Notas Internas */}
                          <div className="bg-amber-50/60 rounded-lg border-l-4 border-l-amber-400 px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1.5">
                              Notas Internas{" "}
                              <span className="normal-case text-[9px] text-amber-400">
                                (apenas admin)
                              </span>
                            </p>
                            {isDadosEditMode ? (
                              <textarea
                                value={
                                  (getDadosDisplayValue(
                                    "internal_notes",
                                  ) as string) || ""
                                }
                                onChange={(e) =>
                                  handleDadosFieldChange(
                                    "internal_notes",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20"
                                placeholder="Notas internas do sistema"
                              />
                            ) : (
                              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {company.internal_notes || ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>

                {/* Usuários Tab */}
                <TabsContent
                  value="usuarios"
                  className="flex-1 overflow-y-auto bg-slate-200 pb-[80px]"
                >
                  <CompanyUsersTab
                    companyId={company._apiId ?? company.id}
                    companyName={company.name}
                  />
                </TabsContent>

                {/* Redes Sociais Tab */}
                <TabsContent
                  value="redes-sociais"
                  className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
                >
                  {isDadosEditMode ? (
                    <div className="space-y-4">
                      <CompanySocialLinksManager
                        socialLinks={
                          (getDadosDisplayValue(
                            "social_links",
                          ) as SocialLink[]) || []
                        }
                        onChange={(links) =>
                          handleDadosFieldChange("social_links", links)
                        }
                        isEditMode={true}
                      />
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleDadosSaveClick}
                          disabled={isSaving}
                          className="gap-2"
                        >
                          {isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const DEMO_LINKS: SocialLink[] = [
                        {
                          id: "demo-ig",
                          platform: "instagram",
                          url: "https://instagram.com/empresa",
                          order: 0,
                        },
                        {
                          id: "demo-fb",
                          platform: "facebook",
                          url: "https://facebook.com/empresa",
                          order: 1,
                        },
                        {
                          id: "demo-li",
                          platform: "linkedin",
                          url: "https://linkedin.com/company/empresa",
                          order: 2,
                        },
                        {
                          id: "demo-wa",
                          platform: "whatsapp",
                          url: "https://wa.me/5511999999999",
                          order: 3,
                        },
                      ];

                      const displayLinks: SocialLink[] =
                        company.social_links && company.social_links.length > 0
                          ? company.social_links
                          : DEMO_LINKS;

                      const handleSaveSocialCard = (linkId: string) => {
                        setPendingSocialSave({
                          id: linkId,
                          url: editingSocialUrl,
                        });
                        setShowSocialEditConfirm(true);
                      };

                      const handleDeleteSocialCard = (linkId: string) => {
                        setPendingSocialDelete(linkId);
                        setShowSocialDeleteConfirm(true);
                      };

                      return (
                        <div className="space-y-5">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Redes Sociais da Empresa
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {displayLinks.length} perfil
                                {displayLinks.length !== 1 ? "s" : ""}{" "}
                                cadastrado{displayLinks.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setSocialLinksBuffer([]);
                                setShowSocialModal(true);
                              }}
                              size="sm"
                              className="gap-2 btn-brand border-0 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Adicionar
                            </Button>
                          </div>

                          {/* 3-column grid */}
                          <div className="grid grid-cols-3 gap-3">
                            {displayLinks.map((link) => {
                              const key = (link.platform || "")
                                .toLowerCase()
                                .trim();
                              const meta =
                                SOCIAL_PLATFORM_META[key] ||
                                SOCIAL_PLATFORM_META.site;
                              const isEditing = editingSocialId === link.id;
                              return (
                                <div
                                  key={link.id}
                                  className={`group relative bg-gradient-to-br ${meta.bg} border border-white/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div
                                      className={`h-11 w-11 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5`}
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className={`h-5 w-5 ${meta.iconColor} fill-current`}
                                      >
                                        <path d={meta.svgPath} />
                                      </svg>
                                    </div>

                                    {/* Info / edit area */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <p className="text-sm font-bold text-slate-800 leading-tight">
                                          {meta.label}
                                        </p>
                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                          Ativo
                                        </span>
                                      </div>

                                      {isEditing ? (
                                        <div className="mt-2 space-y-2">
                                          <input
                                            type="url"
                                            value={editingSocialUrl}
                                            onChange={(e) =>
                                              setEditingSocialUrl(
                                                e.target.value,
                                              )
                                            }
                                            className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            placeholder="https://"
                                            autoFocus
                                          />
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() =>
                                                handleSaveSocialCard(link.id)
                                              }
                                              className="flex-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-1 transition-colors"
                                            >
                                              Salvar
                                            </button>
                                            <button
                                              onClick={() =>
                                                setEditingSocialId(null)
                                              }
                                              className="flex-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-1 transition-colors"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {link.url ? (
                                            <a
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-slate-500 hover:text-blue-600 transition-colors truncate block"
                                            >
                                              {link.url.replace(
                                                /^https?:\/\//,
                                                "",
                                              )}
                                            </a>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">
                                              Sem URL cadastrada
                                            </p>
                                          )}
                                          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => {
                                                setEditingSocialId(link.id);
                                                setEditingSocialUrl(
                                                  link.url || "",
                                                );
                                              }}
                                              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                              Editar
                                            </button>
                                            <span className="text-slate-300">
                                              ·
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleDeleteSocialCard(link.id)
                                              }
                                              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              Excluir
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </TabsContent>

                {/* Plano Tab */}
                <TabsContent
                  value="plano"
                  className="flex-1 overflow-y-auto bg-slate-200"
                >
                  <div className="px-[50px] pt-[25px] pb-[80px]">
                    <div className="flex items-center justify-between pb-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Plano
                      </h3>
                      <button
                        onClick={() => {
                          const allOpen = PLANO_ALL_ACCORDIONS.every((a) =>
                            planoOpenAccordions.includes(a),
                          );
                          setPlanoOpenAccordions(
                            allOpen ? [] : PLANO_ALL_ACCORDIONS,
                          );
                        }}
                        className="flex items-center gap-2 group"
                        title={
                          PLANO_ALL_ACCORDIONS.every((a) =>
                            planoOpenAccordions.includes(a),
                          )
                            ? "Fechar todos"
                            : "Abrir todos"
                        }
                      >
                        <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                          {PLANO_ALL_ACCORDIONS.every((a) =>
                            planoOpenAccordions.includes(a),
                          )
                            ? "Fechar"
                            : "Expandir"}
                        </span>
                        <div
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                            PLANO_ALL_ACCORDIONS.every((a) =>
                              planoOpenAccordions.includes(a),
                            )
                              ? "bg-blue-600"
                              : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                              PLANO_ALL_ACCORDIONS.every((a) =>
                                planoOpenAccordions.includes(a),
                              )
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                    <Accordion
                      type="multiple"
                      value={planoOpenAccordions}
                      onValueChange={setPlanoOpenAccordions}
                      className="space-y-3"
                    >
                      {/* ACCORDION 1: AÇÕES ADMINISTRATIVAS */}
                      <AccordionItem
                        value="admin"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-amber-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Ações Administrativas
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              {
                                label: "Editar Plano",
                                action: "edit-plan",
                                icon: Edit2,
                                color:
                                  "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
                              },
                              {
                                label: "Alterar Conta",
                                action: "change-account",
                                icon: Building2,
                                color:
                                  "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200",
                              },
                              {
                                label: "Forçar Cobrança",
                                action: "force-charge",
                                icon: Zap,
                                color:
                                  "text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200",
                              },
                              {
                                label: "Gerar Boleto",
                                action: "generate-boleto",
                                icon: FileText,
                                color:
                                  "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
                              },
                            ].map(({ label, action, icon: Icon, color }) => (
                              <button
                                key={action}
                                onClick={() => handleAdminAction(action)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${color}`}
                              >
                                <Icon className="h-3 w-3" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* ACCORDION 2: PLANO DE CRÉDITO */}
                      <AccordionItem
                        value="credito"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Crown className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Plano de Crédito
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                          {(() => {
                            const planMap: Record<
                              string,
                              { name: string; discount: string; price: string }
                            > = {
                              lite: {
                                name: "Lite",
                                discount: "",
                                price: "R$ 300/mês",
                              },
                              start: {
                                name: "Start",
                                discount: "5%",
                                price: "R$ 500/mês",
                              },
                              standard: {
                                name: "Standard",
                                discount: "10%",
                                price: "R$ 1.000/mês",
                              },
                              growth: {
                                name: "Growth",
                                discount: "15%",
                                price: "R$ 1.500/mês",
                              },
                              scale: {
                                name: "Scale",
                                discount: "20%",
                                price: "R$ 3.000/mês",
                              },
                              squad: {
                                name: "Squad",
                                discount: "20%",
                                price: "R$ 5.000/mês",
                              },
                              enterprise: {
                                name: "Enterprise",
                                discount: "",
                                price: "R$ 5.000/mês",
                              },
                              basic: {
                                name: "Lite",
                                discount: "",
                                price: "R$ 300/mês",
                              },
                              starter: {
                                name: "Start",
                                discount: "5%",
                                price: "R$ 500/mês",
                              },
                              pro: {
                                name: "Standard",
                                discount: "10%",
                                price: "R$ 1.000/mês",
                              },
                              gold: {
                                name: "Growth",
                                discount: "15%",
                                price: "R$ 1.500/mês",
                              },
                              silver: {
                                name: "Lite",
                                discount: "",
                                price: "R$ 300/mês",
                              },
                              platinum: {
                                name: "Enterprise",
                                discount: "",
                                price: "R$ 5.000/mês",
                              },
                            };
                            const plan = planMap[
                              (company.partner_level || "").toLowerCase()
                            ] || {
                              name: company.partner_level || "Não definido",
                              discount: "",
                              price: "",
                            };
                            return (
                              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl px-4 py-3 text-white shadow-sm">
                                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                  <Crown className="h-4.5 w-4.5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-bold leading-tight">
                                      {plan.name}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 bg-white/20 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                                      Ativo
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs font-semibold text-blue-100">
                                      {plan.price}
                                    </span>
                                    {plan.discount && (
                                      <span className="inline-flex items-center gap-1 bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        <TrendingUp className="h-2.5 w-2.5" />
                                        {plan.discount} desc.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </AccordionContent>
                      </AccordionItem>

                      {/* ACCORDION 3: TIPO DE CONTA */}
                      <AccordionItem
                        value="account"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-purple-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Tipo de Conta
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                label: "Company Dependente",
                                desc: "Vinculada a outra entidade",
                              },
                              {
                                label: "Company Independente",
                                desc: "Operação independente",
                              },
                              { label: "Agency", desc: "Agência de serviços" },
                              {
                                label: "Partner",
                                desc: "Parceiro da plataforma",
                              },
                            ].map(({ label, desc }) => {
                              const isSelected =
                                company.type === "company" &&
                                company.account_type === "independent"
                                  ? label === "Company Independente"
                                  : company.type === "company" &&
                                      company.account_type !== "independent"
                                    ? label === "Company Dependente"
                                    : company.type === "agency"
                                      ? label === "Agency"
                                      : company.type === "nomad"
                                        ? label === "Partner"
                                        : false;
                              return (
                                <div
                                  key={label}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                    isSelected
                                      ? "border-blue-400 bg-blue-50 shadow-sm"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`h-2 w-2 rounded-full flex-shrink-0 ${isSelected ? "bg-blue-500" : "bg-slate-300"}`}
                                  />
                                  <div className="min-w-0">
                                    <p
                                      className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                                    >
                                      {label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                      {desc}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-blue-500 flex-shrink-0 ml-auto" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* ACCORDION 3: MÉTODOS DE PAGAMENTO */}
                      <AccordionItem
                        value="pagamento"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Métodos de Pagamento
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                          {/* Payment Methods List */}
                          <div className="space-y-1.5">
                            {[
                              {
                                id: "pix",
                                label: "Pix",
                                desc: "Transferência instantânea",
                                iconBg: "bg-purple-100",
                                iconColor: "text-purple-600",
                                Icon: Wallet,
                              },
                              {
                                id: "boleto",
                                label: "Boleto",
                                desc: "Até 3 dias úteis",
                                iconBg: "bg-orange-100",
                                iconColor: "text-orange-600",
                                Icon: Download,
                              },
                              {
                                id: "allkoins",
                                label: "Allkoins",
                                desc: "Saldo em créditos",
                                iconBg: "bg-yellow-100",
                                iconColor: "text-yellow-600",
                                Icon: Gift,
                              },
                            ].map(
                              ({
                                id,
                                label,
                                desc,
                                iconBg,
                                iconColor,
                                Icon,
                              }) => {
                                const isDefault = defaultPaymentMethod === id;
                                return (
                                  <div
                                    key={id}
                                    onClick={() => handleSetDefaultMethod(id)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                      isDefault
                                        ? "border-blue-400 bg-blue-50 shadow-sm"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                  >
                                    <div
                                      className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
                                    >
                                      <Icon
                                        className={`h-3.5 w-3.5 ${iconColor}`}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-[11px] font-semibold ${isDefault ? "text-blue-700" : "text-slate-700"}`}
                                      >
                                        {label}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {desc}
                                      </p>
                                    </div>
                                    {isDefault && (
                                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                        Padrão
                                      </span>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>

                          {/* Credit Cards Section */}
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Cartões
                              </label>
                              <button
                                onClick={() => setShowAddCardModal(true)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Novo Cartão
                              </button>
                            </div>
                            {(() => {
                              // Card brand colors and logos
                              const CARD_BRANDS: Record<
                                string,
                                { bg: string; logo: React.ReactNode }
                              > = {
                                Visa: {
                                  bg: "linear-gradient(135deg, #1a1f71 0%, #2a3fa0 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 48 16"
                                      className="h-5 w-auto"
                                      fill="white"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontStyle="italic"
                                        fontSize="16"
                                      >
                                        VISA
                                      </text>
                                    </svg>
                                  ),
                                },
                                Mastercard: {
                                  bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                                  logo: (
                                    <div className="flex items-center gap-0">
                                      <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                                      <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2" />
                                    </div>
                                  ),
                                },
                                Elo: {
                                  bg: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 40 16"
                                      className="h-4 w-auto"
                                      fill="none"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="15"
                                        fill="#FFD600"
                                      >
                                        e
                                      </text>
                                      <text
                                        x="10"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="15"
                                        fill="#EF4123"
                                      >
                                        l
                                      </text>
                                      <text
                                        x="16"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="15"
                                        fill="#00A4E0"
                                      >
                                        o
                                      </text>
                                    </svg>
                                  ),
                                },
                                Amex: {
                                  bg: "linear-gradient(135deg, #006fcf 0%, #004080 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 48 16"
                                      className="h-4 w-auto"
                                      fill="white"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="11"
                                      >
                                        AMEX
                                      </text>
                                    </svg>
                                  ),
                                },
                                Hipercard: {
                                  bg: "linear-gradient(135deg, #822124 0%, #5a1517 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 48 16"
                                      className="h-4 w-auto"
                                      fill="white"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="9"
                                      >
                                        HIPERCARD
                                      </text>
                                    </svg>
                                  ),
                                },
                                Diners: {
                                  bg: "linear-gradient(135deg, #004080 0%, #002850 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 48 16"
                                      className="h-4 w-auto"
                                      fill="white"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="10"
                                      >
                                        DINERS
                                      </text>
                                    </svg>
                                  ),
                                },
                                Discover: {
                                  bg: "linear-gradient(135deg, #f47216 0%, #d45e0a 100%)",
                                  logo: (
                                    <svg
                                      viewBox="0 0 52 16"
                                      className="h-4 w-auto"
                                      fill="white"
                                    >
                                      <text
                                        x="0"
                                        y="13"
                                        fontFamily="Arial"
                                        fontWeight="bold"
                                        fontSize="10"
                                      >
                                        DISCOVER
                                      </text>
                                    </svg>
                                  ),
                                },
                                Outro: {
                                  bg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
                                  logo: (
                                    <CreditCard className="h-5 w-5 text-white" />
                                  ),
                                },
                              };

                              const isExpired = (expiry: string) => {
                                const [m, y] = expiry.split("/").map(Number);
                                const expDate = new Date(2000 + y, m);
                                return expDate < new Date();
                              };

                              return creditCards.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                  <CreditCard className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-sm text-slate-600">
                                    Nenhum cartão cadastrado
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  {creditCards.map((card) => {
                                    const brandInfo =
                                      CARD_BRANDS[card.brand] ||
                                      CARD_BRANDS.Outro;
                                    const isDefault =
                                      defaultPaymentMethod ===
                                      `card-${card.id}`;
                                    const expired = isExpired(card.expiry);
                                    return (
                                      <div
                                        key={card.id}
                                        className={`relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 group ${isDefault ? "ring-2 ring-blue-400" : ""} ${expired ? "opacity-75" : ""}`}
                                        style={{ background: brandInfo.bg }}
                                      >
                                        {/* Decorative circles */}
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full" />
                                          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />
                                        </div>

                                        <div className="relative p-4 text-white">
                                          {/* Top row: Brand logo + badges */}
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              {brandInfo.logo}
                                              <span className="text-[10px] font-semibold opacity-60 uppercase">
                                                {card.brand}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {isDefault && (
                                                <span className="bg-white text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                  Padrão
                                                </span>
                                              )}
                                              {expired && (
                                                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                  Expirado
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Card number */}
                                          <div className="mb-3">
                                            <div className="text-sm font-mono tracking-[0.2em] opacity-90">
                                              •••• •••• •••• {card.lastFour}
                                            </div>
                                          </div>

                                          {/* Bottom: Holder + Expiry */}
                                          <div className="flex justify-between items-end">
                                            <div>
                                              <div className="text-[9px] uppercase opacity-50 tracking-wide">
                                                Titular
                                              </div>
                                              <div className="text-[11px] font-semibold truncate max-w-[120px]">
                                                {card.holderName}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[9px] uppercase opacity-50 tracking-wide">
                                                Validade
                                              </div>
                                              <div
                                                className={`text-[11px] font-semibold ${expired ? "text-red-300" : ""}`}
                                              >
                                                {card.expiry}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Hover overlay with actions */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                          {!isDefault && !expired && (
                                            <Button
                                              onClick={() =>
                                                handleSetDefaultCard(card.id)
                                              }
                                              size="sm"
                                              className="bg-white text-slate-800 hover:bg-blue-50 text-[10px] font-semibold h-7 px-3 shadow-sm"
                                            >
                                              Definir Padrão
                                            </Button>
                                          )}
                                          <Button
                                            onClick={() =>
                                              handleRemoveCard(card.id)
                                            }
                                            size="sm"
                                            variant="outline"
                                            className="bg-white/90 text-slate-800 hover:bg-red-50 h-7 w-7 p-0 shadow-sm"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* ACCORDION 4: CARTEIRA DA EMPRESA */}
                      <AccordionItem
                        value="carteira"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Carteira da Empresa
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl px-4 py-3 text-white shadow-sm">
                            <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                              <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                                Saldo Disponível
                              </p>
                              <p className="text-xl font-bold leading-tight">
                                R${" "}
                                {companyWalletBalance.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleCompanyWalletAction("add")}
                                className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                Adicionar
                              </button>
                              <button
                                onClick={() =>
                                  handleCompanyWalletAction("remove")
                                }
                                className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                              >
                                <ArrowDown className="h-2.5 w-2.5" />
                                Reduzir
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Movimentações
                              </label>
                              <button
                                onClick={() => setShowWalletHistoryPanel(true)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded-full transition-colors"
                              >
                                <Eye className="h-2.5 w-2.5" />
                                Ver todas
                              </button>
                            </div>
                            <div className="space-y-1 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                              {companyWalletStatements
                                .slice(0, 4)
                                .map((stmt) => (
                                  <div
                                    key={stmt.id}
                                    className="flex justify-between items-center px-3 py-2"
                                  >
                                    <div>
                                      <div className="text-[11px] font-semibold text-slate-800">
                                        {stmt.reason}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {new Date(stmt.date).toLocaleString(
                                          "pt-BR",
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-[11px] font-bold ${stmt.type === "credit" ? "text-emerald-600" : "text-red-500"}`}
                                      >
                                        {stmt.type === "credit" ? "+" : "−"} R${" "}
                                        {stmt.amount.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        R${" "}
                                        {stmt.balanceAfter.toLocaleString(
                                          "pt-BR",
                                          { minimumFractionDigits: 2 },
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              {companyWalletStatements.length === 0 && (
                                <div className="text-center py-5 text-slate-400 text-xs">
                                  Nenhuma movimentação
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* ACCORDION 5: NOTAS FISCAIS E COMPROVANTES */}
                      <AccordionItem
                        value="nf"
                        className="border border-slate-200 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="font-semibold text-slate-800 text-[11px]">
                              Notas Fiscais e Comprovantes
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-400">
                              {paymentHistory.length} documento
                              {paymentHistory.length !== 1 ? "s" : ""}
                            </span>
                            <button
                              onClick={() => setShowNFHistoryPanel(true)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full transition-colors"
                            >
                              <Eye className="h-2.5 w-2.5" />
                              Ver todas
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {paymentHistory.slice(0, 4).map((payment) => {
                              const methodLabel = {
                                pix: "Pix",
                                boleto: "Boleto",
                                cartao: "Cartão",
                                allkoins: "Allkoins",
                              }[payment.method];

                              const methodColor = {
                                pix: "bg-purple-50 dark:bg-purple-950/20 border-purple-200",
                                boleto:
                                  "bg-orange-50 dark:bg-orange-950/20 border-orange-200",
                                cartao:
                                  "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                                allkoins:
                                  "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200",
                              }[payment.method];

                              const statusColor = {
                                Pago: "bg-green-100 text-green-800",
                                Pendente: "bg-yellow-100 text-yellow-800",
                                Cancelado: "bg-red-100 text-red-800",
                              }[payment.status];

                              return (
                                <div
                                  key={payment.id}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${methodColor}`}
                                >
                                  <div
                                    className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      payment.type === "nf"
                                        ? "bg-indigo-100"
                                        : "bg-green-100"
                                    }`}
                                  >
                                    {payment.type === "nf" ? (
                                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                                      {payment.type === "nf"
                                        ? "NF"
                                        : "Comprovante"}{" "}
                                      · {methodLabel}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(
                                        payment.date,
                                      ).toLocaleDateString("pt-BR")}{" "}
                                      · R${" "}
                                      {payment.amount.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}
                                    >
                                      {payment.status}
                                    </span>
                                    {payment.type === "nf" && (
                                      <>
                                        <button
                                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                          title="Visualizar"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </button>
                                        <button
                                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                          title="Baixar"
                                        >
                                          <Download className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                    {payment.type === "comprovante" && (
                                      <button
                                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                        title="Comprovante"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  {payment.type === "comprovante" && (
                                    <p className="text-[10px] text-slate-400 mt-1 pl-9 italic">
                                      Pagamentos com Allkoins não geram nota
                                      fiscal.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* NF History Panel */}
                    <Sheet
                      open={showNFHistoryPanel}
                      onOpenChange={setShowNFHistoryPanel}
                    >
                      <SheetContent
                        side="right"
                        className="w-full sm:max-w-lg p-0 flex flex-col"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        {/* Header */}
                        <div className="app-brand-header relative flex-shrink-0 px-6 min-h-[100px] flex flex-col justify-center text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5" />
                            <h2 className="text-base font-bold">
                              Notas Fiscais e Comprovantes
                            </h2>
                          </div>
                          <p className="text-xs opacity-75">
                            {paymentHistory.length} documento
                            {paymentHistory.length !== 1 ? "s" : ""} ·{" "}
                            {company.name}
                          </p>
                          <button
                            onClick={() => setShowNFHistoryPanel(false)}
                            className="absolute top-5 right-5 rounded-lg transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 p-1.5"
                          >
                            <X className="size-6 text-white drop-shadow-md" />
                          </button>
                        </div>

                        {/* Filters */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-white space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar por tipo ou método..."
                              value={nfHistorySearch}
                              onChange={(e) =>
                                setNfHistorySearch(e.target.value)
                              }
                              className="w-full pl-9 pr-3 h-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-50"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs flex-1">
                              {(["all", "nf", "comprovante"] as const).map(
                                (t) => (
                                  <button
                                    key={t}
                                    onClick={() => setNfHistoryType(t)}
                                    className={`flex-1 py-1.5 font-semibold transition-colors ${nfHistoryType === t ? "bg-indigo-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                                  >
                                    {t === "all"
                                      ? "Todos"
                                      : t === "nf"
                                        ? "NF"
                                        : "Comprovantes"}
                                  </button>
                                ),
                              )}
                            </div>
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                              {(
                                [
                                  "all",
                                  "Pago",
                                  "Pendente",
                                  "Cancelado",
                                ] as const
                              ).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setNfHistoryStatus(s)}
                                  className={`px-2.5 py-1.5 font-semibold transition-colors ${nfHistoryStatus === s ? "bg-indigo-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                                >
                                  {s === "all" ? "Status" : s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">
                                De
                              </label>
                              <input
                                type="date"
                                value={nfHistoryDateFrom}
                                onChange={(e) =>
                                  setNfHistoryDateFrom(e.target.value)
                                }
                                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-50"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">
                                Até
                              </label>
                              <input
                                type="date"
                                value={nfHistoryDateTo}
                                onChange={(e) =>
                                  setNfHistoryDateTo(e.target.value)
                                }
                                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-slate-50"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              <button
                                onClick={() => {
                                  const rows = paymentHistory.map((p) => {
                                    const label =
                                      {
                                        pix: "Pix",
                                        boleto: "Boleto",
                                        cartao: "Cartão",
                                        allkoins: "Allkoins",
                                      }[p.method] ?? p.method;
                                    return `${new Date(p.date).toLocaleDateString("pt-BR")};${p.type === "nf" ? "NF" : "Comprovante"};${label};R$ ${p.amount.toLocaleString("pt-BR")};${p.status}`;
                                  });
                                  const csv = [
                                    "Data;Tipo;Método;Valor;Status",
                                    ...rows,
                                  ].join("\n");
                                  const blob = new Blob([csv], {
                                    type: "text/csv;charset=utf-8;",
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `notas-fiscais-${company.name.replace(/\s+/g, "-")}.csv`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-1 px-3 h-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Exportar
                              </button>
                              {(nfHistorySearch ||
                                nfHistoryType !== "all" ||
                                nfHistoryStatus !== "all" ||
                                nfHistoryDateFrom ||
                                nfHistoryDateTo) && (
                                <button
                                  onClick={() => {
                                    setNfHistorySearch("");
                                    setNfHistoryType("all");
                                    setNfHistoryStatus("all");
                                    setNfHistoryDateFrom("");
                                    setNfHistoryDateTo("");
                                  }}
                                  className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                          {(() => {
                            const methodLabel = {
                              pix: "Pix",
                              boleto: "Boleto",
                              cartao: "Cartão",
                              allkoins: "Allkoins",
                            };
                            const filtered = paymentHistory.filter((p) => {
                              const matchSearch =
                                nfHistorySearch === "" ||
                                methodLabel[
                                  p.method as keyof typeof methodLabel
                                ]
                                  ?.toLowerCase()
                                  .includes(nfHistorySearch.toLowerCase()) ||
                                (p.type === "nf"
                                  ? "nf"
                                  : "comprovante"
                                ).includes(nfHistorySearch.toLowerCase());
                              const matchType =
                                nfHistoryType === "all" ||
                                p.type === nfHistoryType;
                              const matchStatus =
                                nfHistoryStatus === "all" ||
                                p.status === nfHistoryStatus;
                              const pDate = new Date(p.date);
                              const matchFrom =
                                nfHistoryDateFrom === "" ||
                                pDate >= new Date(nfHistoryDateFrom);
                              const matchTo =
                                nfHistoryDateTo === "" ||
                                pDate <=
                                  new Date(nfHistoryDateTo + "T23:59:59");
                              return (
                                matchSearch &&
                                matchType &&
                                matchStatus &&
                                matchFrom &&
                                matchTo
                              );
                            });
                            if (filtered.length === 0)
                              return (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                                  <FileText className="h-8 w-8 opacity-30" />
                                  <p className="text-sm">
                                    Nenhum documento encontrado
                                  </p>
                                </div>
                              );
                            return (
                              <div className="divide-y divide-slate-100">
                                {filtered.map((payment) => {
                                  const ml =
                                    methodLabel[
                                      payment.method as keyof typeof methodLabel
                                    ] ?? payment.method;
                                  const methodColor =
                                    {
                                      pix: "bg-purple-50 border-purple-200",
                                      boleto: "bg-orange-50 border-orange-200",
                                      cartao: "bg-blue-50 border-blue-200",
                                      allkoins:
                                        "bg-yellow-50 border-yellow-200",
                                    }[payment.method] ??
                                    "bg-slate-50 border-slate-200";
                                  const statusColor =
                                    {
                                      Pago: "bg-green-100 text-green-800",
                                      Pendente: "bg-yellow-100 text-yellow-800",
                                      Cancelado: "bg-red-100 text-red-800",
                                    }[payment.status] ??
                                    "bg-slate-100 text-slate-700";
                                  return (
                                    <div
                                      key={payment.id}
                                      className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors`}
                                    >
                                      <div
                                        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${payment.type === "nf" ? "bg-indigo-100" : "bg-green-100"}`}
                                      >
                                        {payment.type === "nf" ? (
                                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                        ) : (
                                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800">
                                          {payment.type === "nf"
                                            ? "Nota Fiscal"
                                            : "Comprovante"}{" "}
                                          · {ml}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {new Date(
                                            payment.date,
                                          ).toLocaleDateString("pt-BR")}{" "}
                                          · R${" "}
                                          {payment.amount.toLocaleString(
                                            "pt-BR",
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}
                                        >
                                          {payment.status}
                                        </span>
                                        {payment.type === "nf" && (
                                          <>
                                            <button
                                              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                              title="Visualizar"
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                                              title="Baixar"
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center">
                          {paymentHistory.length} documento
                          {paymentHistory.length !== 1 ? "s" : ""} no total ·{" "}
                          {company.name}
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* Wallet History Panel */}
                    <Sheet
                      open={showWalletHistoryPanel}
                      onOpenChange={setShowWalletHistoryPanel}
                    >
                      <SheetContent
                        side="right"
                        className="w-full sm:max-w-lg p-0 flex flex-col"
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        {/* Header */}
                        <div className="app-brand-header relative flex-shrink-0 px-6 min-h-[100px] flex flex-col justify-center text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <Wallet className="h-5 w-5" />
                            <h2 className="text-base font-bold">
                              Movimentações da Carteira
                            </h2>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs opacity-75">
                              Saldo atual:
                            </span>
                            <span className="text-xl font-bold">
                              R${" "}
                              {companyWalletBalance.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowWalletHistoryPanel(false)}
                            className="absolute top-5 right-5 rounded-lg transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 p-1.5"
                          >
                            <X className="size-6 text-white drop-shadow-md" />
                          </button>
                        </div>

                        {/* Filters */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-white space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar por descrição..."
                              value={walletHistorySearch}
                              onChange={(e) =>
                                setWalletHistorySearch(e.target.value)
                              }
                              className="w-full pl-9 pr-3 h-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-slate-50"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs flex-1">
                              {(["all", "credit", "debit"] as const).map(
                                (t) => (
                                  <button
                                    key={t}
                                    onClick={() => setWalletHistoryType(t)}
                                    className={`flex-1 py-1.5 font-semibold transition-colors ${walletHistoryType === t ? "bg-cyan-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                                  >
                                    {t === "all"
                                      ? "Todos"
                                      : t === "credit"
                                        ? "Entradas"
                                        : "Saídas"}
                                  </button>
                                ),
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const rows = companyWalletStatements.map(
                                  (s) =>
                                    `${new Date(s.date).toLocaleString("pt-BR")};${s.reason};${s.type === "credit" ? "Entrada" : "Saída"};R$ ${s.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })};R$ ${s.balanceAfter.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                                );
                                const csv = [
                                  "Data;Descrição;Tipo;Valor;Saldo Após",
                                  ...rows,
                                ].join("\n");
                                const blob = new Blob([csv], {
                                  type: "text/csv;charset=utf-8;",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `carteira-${company.name.replace(/\s+/g, "-")}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Exportar
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">
                                De
                              </label>
                              <input
                                type="date"
                                value={walletHistoryDateFrom}
                                onChange={(e) =>
                                  setWalletHistoryDateFrom(e.target.value)
                                }
                                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-slate-50"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">
                                Até
                              </label>
                              <input
                                type="date"
                                value={walletHistoryDateTo}
                                onChange={(e) =>
                                  setWalletHistoryDateTo(e.target.value)
                                }
                                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-slate-50"
                              />
                            </div>
                            {(walletHistoryDateFrom ||
                              walletHistoryDateTo ||
                              walletHistorySearch ||
                              walletHistoryType !== "all") && (
                              <button
                                onClick={() => {
                                  setWalletHistorySearch("");
                                  setWalletHistoryType("all");
                                  setWalletHistoryDateFrom("");
                                  setWalletHistoryDateTo("");
                                }}
                                className="self-end h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                          {(() => {
                            const filtered = companyWalletStatements.filter(
                              (s) => {
                                const matchSearch =
                                  walletHistorySearch === "" ||
                                  s.reason
                                    .toLowerCase()
                                    .includes(
                                      walletHistorySearch.toLowerCase(),
                                    );
                                const matchType =
                                  walletHistoryType === "all" ||
                                  s.type === walletHistoryType;
                                const sDate = new Date(s.date);
                                const matchFrom =
                                  walletHistoryDateFrom === "" ||
                                  sDate >= new Date(walletHistoryDateFrom);
                                const matchTo =
                                  walletHistoryDateTo === "" ||
                                  sDate <=
                                    new Date(walletHistoryDateTo + "T23:59:59");
                                return (
                                  matchSearch &&
                                  matchType &&
                                  matchFrom &&
                                  matchTo
                                );
                              },
                            );
                            if (filtered.length === 0)
                              return (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                                  <Wallet className="h-8 w-8 opacity-30" />
                                  <p className="text-sm">
                                    Nenhuma movimentação encontrada
                                  </p>
                                </div>
                              );
                            return (
                              <div className="divide-y divide-slate-100">
                                {filtered.map((stmt) => (
                                  <div
                                    key={stmt.id}
                                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${stmt.type === "credit" ? "bg-emerald-100" : "bg-red-100"}`}
                                      >
                                        {stmt.type === "credit" ? (
                                          <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                                        ) : (
                                          <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                          {stmt.reason}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {new Date(stmt.date).toLocaleString(
                                            "pt-BR",
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                      <p
                                        className={`text-xs font-bold ${stmt.type === "credit" ? "text-emerald-600" : "text-red-500"}`}
                                      >
                                        {stmt.type === "credit" ? "+" : "−"} R${" "}
                                        {stmt.amount.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        R${" "}
                                        {stmt.balanceAfter.toLocaleString(
                                          "pt-BR",
                                          { minimumFractionDigits: 2 },
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Footer count */}
                        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center">
                          {companyWalletStatements.length} movimentaç
                          {companyWalletStatements.length === 1 ? "ão" : "ões"}{" "}
                          no total · desde{" "}
                          {new Date(
                            companyWalletStatements[
                              companyWalletStatements.length - 1
                            ]?.date ?? Date.now(),
                          ).toLocaleDateString("pt-BR")}
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* Company Wallet Modal */}
                    {showCompanyWalletModal && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              {companyWalletType === "add"
                                ? "Adicionar Saldo"
                                : "Reduzir Saldo"}
                            </h3>
                            <div className="space-y-4 mb-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                                  Valor (R$)
                                </label>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={companyWalletAmount}
                                  onChange={(e) =>
                                    setCompanyWalletAmount(e.target.value)
                                  }
                                  className="border-slate-300"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">
                                  Motivo (obrigatório)
                                </label>
                                <Input
                                  placeholder="Descreva o motivo da operação"
                                  value={companyWalletReason}
                                  onChange={(e) =>
                                    setCompanyWalletReason(e.target.value)
                                  }
                                  className="border-slate-300"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowCompanyWalletModal(false)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleCompanyWalletSubmit}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Próximo
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Company Wallet Confirmation Modal */}
                    {showWalletConfirmDialog && showCompanyWalletModal && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              Confirmar Movimentação
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm mb-4">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Tipo:</span>
                                <span className="font-semibold">
                                  {companyWalletType === "add"
                                    ? "Crédito"
                                    : "Débito"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Valor:</span>
                                <span
                                  className={`font-semibold ${companyWalletType === "add" ? "text-emerald-600" : "text-red-600"}`}
                                >
                                  {companyWalletType === "add" ? "+" : "-"} R${" "}
                                  {parseFloat(
                                    companyWalletAmount,
                                  ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Motivo:</span>
                                <span className="font-semibold">
                                  {companyWalletReason}
                                </span>
                              </div>
                              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                                <span className="font-semibold">
                                  Saldo após:
                                </span>
                                <span className="text-blue-600 font-bold">
                                  R${" "}
                                  {(companyWalletType === "add"
                                    ? companyWalletBalance +
                                      parseFloat(companyWalletAmount)
                                    : companyWalletBalance -
                                      parseFloat(companyWalletAmount)
                                  ).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  setShowWalletConfirmDialog(false)
                                }
                                className="flex-1"
                              >
                                Voltar
                              </Button>
                              <Button
                                onClick={handleCompanyWalletConfirm}
                                disabled={isApplyingCompanyWallet}
                                className="flex-1 btn-brand"
                              >
                                {isApplyingCompanyWallet ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processando...
                                  </>
                                ) : (
                                  "Confirmar"
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Admin Action Modals */}
                    {adminActionModal === "edit-plan" && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              Editar Plano de Crédito
                            </h3>
                            <div className="space-y-3 mb-4">
                              <div>
                                <label className="text-xs font-semibold mb-1 block">
                                  Novo Plano
                                </label>
                                <select
                                  value={adminFormData.creditPlan}
                                  onChange={(e) =>
                                    setAdminFormData({
                                      ...adminFormData,
                                      creditPlan: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border rounded text-sm"
                                >
                                  <option value="lite">
                                    Lite R$ 300/mês (ativa conta agency)
                                  </option>
                                  <option value="start">
                                    Start R$ 500/mês (5% desconto)
                                  </option>
                                  <option value="standard">
                                    Standard R$ 1.000/mês (10% desconto)
                                  </option>
                                  <option value="growth">
                                    Growth R$ 1.500/mês (15% desconto)
                                  </option>
                                  <option value="scale">
                                    Scale R$ 3.000/mês (20% desconto)
                                  </option>
                                  <option value="squad">
                                    Squad R$ 5.000/mês (agências 20% + pós pago)
                                  </option>
                                  <option value="enterprise">
                                    Enterprise R$ 5.000/mês (empresas pós pago)
                                  </option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAdminActionModal(null)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => setShowAdminConfirmDialog(true)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {adminActionModal === "change-account" && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              Alterar Tipo de Conta
                            </h3>
                            <div className="space-y-2 mb-4">
                              {[
                                "Company Dependente",
                                "Company Independente",
                                "Agency",
                                "Partner",
                              ].map((type) => (
                                <label
                                  key={type}
                                  className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-gray-50"
                                >
                                  <input
                                    type="radio"
                                    name="account-type"
                                    checked={adminFormData.accountType === type}
                                    onChange={() =>
                                      setAdminFormData({
                                        ...adminFormData,
                                        accountType: type,
                                      })
                                    }
                                    className="cursor-pointer"
                                  />
                                  <span className="text-sm font-medium">
                                    {type}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAdminActionModal(null)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleConfirmAdminAction}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {adminActionModal === "force-charge" && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              Forçar Cobrança
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Tem certeza que deseja forçar a cobrança agora?
                              Esta ação irreversível.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAdminActionModal(null)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleConfirmAdminAction}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                              >
                                Confirmar Cobrança
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {adminActionModal === "generate-boleto" && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">
                              Gerar Boleto
                            </h3>
                            <div className="space-y-3 mb-4">
                              <div>
                                <label className="text-xs font-semibold mb-1 block">
                                  Data de Vencimento
                                </label>
                                <Input
                                  type="date"
                                  value={adminFormData.dueDate}
                                  onChange={(e) =>
                                    setAdminFormData({
                                      ...adminFormData,
                                      dueDate: e.target.value,
                                    })
                                  }
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAdminActionModal(null)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleGenerateBoleto}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Gerar Boleto
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Admin Confirm Dialog */}
                    {(() => {
                      const planNames: Record<string, string> = {
                        lite: "Lite",
                        start: "Start",
                        standard: "Standard",
                        growth: "Growth",
                        scale: "Scale",
                        squad: "Squad",
                        enterprise: "Enterprise",
                      };
                      const friendlyPlan =
                        planNames[adminFormData.creditPlan] ??
                        adminFormData.creditPlan;
                      return (
                        <ConfirmationDialog
                          open={showAdminConfirmDialog}
                          onClose={() => setShowAdminConfirmDialog(false)}
                          onConfirm={handleConfirmAdminAction}
                          title="Confirmar alteração de plano"
                          message={`Tem certeza que deseja alterar o plano da empresa para "${friendlyPlan}"? Esta ação pode impactar cobranças e permissões.`}
                          confirmText="Confirmar"
                          cancelText="Cancelar"
                          destructive={false}
                        />
                      );
                    })()}

                    {/* Add Card Modal */}
                    {showAddCardModal && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold">
                                Adicionar Cartão
                              </h3>
                              <button
                                onClick={() => setShowAddCardModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">
                                  Número do Cartão
                                </label>
                                <Input
                                  value={newCardData.number}
                                  onChange={(e) =>
                                    setNewCardData({
                                      ...newCardData,
                                      number: e.target.value.slice(0, 16),
                                    })
                                  }
                                  placeholder="1234 5678 9012 3456"
                                  className="text-sm h-8"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    Validade
                                  </label>
                                  <Input
                                    value={newCardData.expiry}
                                    onChange={(e) =>
                                      setNewCardData({
                                        ...newCardData,
                                        expiry: e.target.value.slice(0, 5),
                                      })
                                    }
                                    placeholder="MM/YY"
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    CVV
                                  </label>
                                  <Input
                                    value={newCardData.cvv}
                                    onChange={(e) =>
                                      setNewCardData({
                                        ...newCardData,
                                        cvv: e.target.value.slice(0, 4),
                                      })
                                    }
                                    placeholder="123"
                                    className="text-sm h-8"
                                    type="password"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">
                                  Nome do Titular
                                </label>
                                <Input
                                  value={newCardData.holderName}
                                  onChange={(e) =>
                                    setNewCardData({
                                      ...newCardData,
                                      holderName: e.target.value,
                                    })
                                  }
                                  placeholder="João da Silva"
                                  className="text-sm h-8"
                                />
                              </div>

                              <div className="flex gap-2 pt-3 border-t">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowAddCardModal(false)}
                                  className="flex-1 text-sm h-8"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleAddCard}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                                >
                                  Adicionar
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Termos Tab */}
                <TabsContent
                  value="termos"
                  className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
                >
                  <TermsManagementTab company={company} />
                </TabsContent>

                {/* Projetos Tab */}
                <TabsContent
                  value="projetos"
                  className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
                >
                  <ProjectsManagementTab company={company} />
                </TabsContent>

                {/* Tarefas Tab */}
                <TabsContent
                  value="tarefas"
                  className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
                >
                  <CompanyTasksTab company={company} />
                </TabsContent>

                {/* Log Tab */}
                <TabsContent
                  value="log"
                  className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
                >
                  <CompanyLogsTab company={company} />
                </TabsContent>
                <CompanyLgpdTab company={company} />
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Partner Migration Modal - Step 1: Confirm Migration */}
      {showMigrateModal && migrationStep === "confirm" && (
        <div className="z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fixed inset-0">
          <div className="bg-white rounded-3xl max-w-md w-full mx-4 shadow-2xl p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-lg">
                <MessageSquare className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Migrar para Partner
              </h2>
              <p className="text-gray-600 leading-relaxed text-base">
                Deseja realmente migrar{" "}
                <strong className="text-gray-900">{company?.name}</strong> para
                o tipo de conta{" "}
                <strong className="text-gray-900">Partner</strong>?
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl">
              <p className="text-sm text-blue-900 leading-relaxed font-medium">
                Esta ação irá desbloquear funcionalidades exclusivas para
                parceiros da plataforma.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                onClick={handleCloseMigrateModal}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                onClick={handleConfirmMigration}
              >
                Sim, migrar!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Migration Modal - Step 2: Partner Leader Invitation */}
      {showMigrateModal && migrationStep === "leader" && (
        <div className="z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fixed inset-0">
          <div className="bg-white rounded-3xl max-w-md w-full mx-4 shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-blue-600 fill-blue-600" />
                  <h2 className="text-xl font-bold text-blue-600">
                    Convidar para Partner Leader
                  </h2>
                </div>
                <button
                  onClick={handleCloseMigrateModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Question */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-900 leading-relaxed">
                  Deseja também convidar <strong>{company?.name}</strong> para
                  fazer parte do <strong>Programa Partner Leaders</strong>?
                </p>
              </div>

              {/* Benefits */}
              <div className="border-l-4 border-blue-600 pl-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-blue-600" />
                  Benefícios como Partner Leader:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700">
                      Receber{" "}
                      <strong className="text-blue-600">comissão</strong> por
                      cada venda de uma <strong>Agência liderada</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700">
                      Fazer parte do{" "}
                      <strong className="text-blue-600">time de elite</strong>{" "}
                      da plataforma
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Notification */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-900">
                  A agência receberá um <strong>convite por e-mail</strong> e{" "}
                  <strong>notificação no sistema</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-base"
                  onClick={handleInviteLeader}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Sim, convidar!
                </Button>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-base"
                  onClick={handleMigrateWithoutInvite}
                >
                  <X className="h-5 w-5 mr-2" />
                  Não, apenas migrar
                </Button>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-12 rounded-xl border-0 transition-all duration-200 shadow-md hover:shadow-lg text-base"
                  onClick={handleCloseMigrateModal}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save confirmation dialog */}
      <ConfirmationDialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={performDadosSave}
        title="Salvar alterações?"
        message={
          <>
            Tem certeza que deseja salvar as alterações nos dados de{" "}
            <strong className="font-semibold text-slate-700">
              {company.name}
            </strong>
            ? Esta ação irá atualizar as informações da empresa.
          </>
        }
        confirmText="Sim, salvar"
        cancelText="Voltar  edição"
        destructive={false}
      />

      {/* Cancel confirmation dialog */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleDadosCancelEdit}
        title="Descartar alterações?"
        message={
          <>
            Tem certeza que deseja cancelar? Todas as alterações nos dados de{" "}
            <strong className="font-semibold text-slate-700">
              {company.name}
            </strong>{" "}
            serão descartadas.
          </>
        }
        confirmText="Sim, descartar"
        cancelText="Voltar  edição"
        destructive={true}
      />

      {/* Social edit confirmation */}
      <ConfirmationDialog
        open={showSocialEditConfirm}
        onClose={() => {
          setShowSocialEditConfirm(false);
          setPendingSocialSave(null);
        }}
        onConfirm={confirmSaveSocialCard}
        title="Salvar alteração?"
        message="Tem certeza que deseja salvar a edição deste link?"
        confirmText="Sim, salvar"
        cancelText="Cancelar"
        destructive={false}
      />

      {/* Social delete confirmation */}
      <ConfirmationDialog
        open={showSocialDeleteConfirm}
        onClose={() => {
          setShowSocialDeleteConfirm(false);
          setPendingSocialDelete(null);
        }}
        onConfirm={confirmDeleteSocialCard}
        title="Excluir rede social?"
        message="Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        destructive={true}
      />

      {/* Social Links Modal */}
      <Dialog
        open={showSocialModal}
        onOpenChange={(open) => {
          if (!open) setShowSocialModal(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
            <DialogDescription>
              Adicione, edite ou remova os links das redes sociais da empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            <CompanySocialLinksManager
              socialLinks={socialLinksBuffer}
              onChange={(links) => setSocialLinksBuffer(links)}
              isEditMode={true}
            />
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSocialModal(false)}
              disabled={isSavingSocial}
            >
              Cancelar
            </Button>
            <Button
              disabled={isSavingSocial}
              className="gap-2"
              onClick={async () => {
                const merged = [
                  ...(company.social_links || []),
                  ...socialLinksBuffer,
                ];
                await saveSocialLinksDirectly(merged);
                setShowSocialModal(false);
              }}
            >
              {isSavingSocial && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar redes sociais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompanyLgpdTab({ company }: { company: any }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  const defaultLgpd = {
    dpo_name: "",
    dpo_email: "",
    dpo_phone: "",
    privacy_policy_accepted: false,
    policy_accepted_at: "",
    policy_version: "1.0",
    data_processing_purposes: [] as string[],
    security_incidents: [] as {
      date: string;
      description: string;
      resolved: boolean;
    }[],
  };

  const [lgpd, setLgpd] = useState(company?.lgpd ?? defaultLgpd);
  const [newIncident, setNewIncident] = useState({
    date: "",
    description: "",
    resolved: false,
  });

  const purposeOptions = [
    "Gestão de projetos",
    "Comunicação interna",
    "Analytics de plataforma",
    "Comunicação com fornecedores",
    "CRM e relacionamento",
    "Relatórios internos",
    "Cobrança e pagamentos",
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setIsEditing(false);
    toast({
      title: "Dados LGPD salvos",
      description: "Informações de privacidade atualizadas com sucesso.",
    });
  };

  const handleAddIncident = async () => {
    if (!newIncident.date || !newIncident.description) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const updated = {
      ...lgpd,
      security_incidents: [...(lgpd.security_incidents ?? []), newIncident],
    };
    setLgpd(updated);
    setNewIncident({ date: "", description: "", resolved: false });
    setShowIncidentForm(false);
    setIsSaving(false);
    toast({
      title: "Incidente registrado",
      description: "O incidente de segurança foi documentado.",
    });
  };

  const togglePurpose = (p: string) => {
    const current: string[] = lgpd.data_processing_purposes ?? [];
    const updated = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    setLgpd({ ...lgpd, data_processing_purposes: updated });
  };

  return (
    <TabsContent
      value="lgpd"
      className="flex-1 overflow-y-auto bg-slate-200 px-[50px] pt-[25px] pb-[80px]"
    >
      <div className="space-y-4">
        {/* DPO Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-800">
                Encarregado de Dados (DPO)
              </h3>
              {!lgpd.dpo_name && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  Não configurado
                </span>
              )}
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3 w-3" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 gap-1.5"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">
                Nome do DPO
              </label>
              {isEditing ? (
                <Input
                  className="h-8 text-sm"
                  value={lgpd.dpo_name}
                  onChange={(e) =>
                    setLgpd({ ...lgpd, dpo_name: e.target.value })
                  }
                  placeholder="Ex: Maria Fernanda"
                />
              ) : (
                <p className="text-sm text-slate-800">{lgpd.dpo_name || "—"}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">
                E-mail do DPO
              </label>
              {isEditing ? (
                <Input
                  className="h-8 text-sm"
                  value={lgpd.dpo_email}
                  onChange={(e) =>
                    setLgpd({ ...lgpd, dpo_email: e.target.value })
                  }
                  placeholder="dpo@empresa.com"
                />
              ) : (
                <p className="text-sm text-slate-800">
                  {lgpd.dpo_email || "—"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-medium">
                Telefone do DPO
              </label>
              {isEditing ? (
                <Input
                  className="h-8 text-sm"
                  value={lgpd.dpo_phone ?? ""}
                  onChange={(e) =>
                    setLgpd({ ...lgpd, dpo_phone: e.target.value })
                  }
                  placeholder="+55 11 99999-8888"
                />
              ) : (
                <p className="text-sm text-slate-800">
                  {lgpd.dpo_phone || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Política de Privacidade Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">
              Política de Privacidade
            </h3>
            {!lgpd.privacy_policy_accepted && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Pendente
              </span>
            )}
            {lgpd.privacy_policy_accepted && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                ✓ Aceita
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Aceita em:</span>{" "}
              <span className="font-medium">
                {lgpd.policy_accepted_at || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Versão:</span>{" "}
              <span className="font-medium">{lgpd.policy_version || "—"}</span>
            </div>
          </div>
          {isEditing && (
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="policy-accepted"
                checked={lgpd.privacy_policy_accepted}
                onChange={(e) =>
                  setLgpd({
                    ...lgpd,
                    privacy_policy_accepted: e.target.checked,
                    policy_accepted_at: e.target.checked
                      ? new Date().toISOString().split("T")[0]
                      : lgpd.policy_accepted_at,
                  })
                }
                className="w-4 h-4 accent-blue-600"
              />
              <label
                htmlFor="policy-accepted"
                className="text-xs text-slate-700"
              >
                Confirmar aceite da Política de Privacidade
              </label>
            </div>
          )}
          <a
            href="#"
            className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700"
            onClick={(e) => e.preventDefault()}
          >
            Ler Política de Privacidade Allka v1.1
          </a>
        </div>

        {/* Finalidades */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-slate-800">
            Finalidades de Tratamento
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {purposeOptions.map((p) => {
              const selected = (lgpd.data_processing_purposes ?? []).includes(
                p,
              );
              return (
                <button
                  key={p}
                  onClick={() => isEditing && togglePurpose(p)}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border text-left transition-colors ${
                    selected
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  } ${isEditing ? "cursor-pointer hover:border-blue-300" : "cursor-default"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${selected ? "bg-blue-500" : "bg-slate-300"}`}
                  />
                  {p}
                </button>
              );
            })}
          </div>
          {!isEditing && (lgpd.data_processing_purposes ?? []).length === 0 && (
            <p className="text-xs text-slate-400 italic">
              Nenhuma finalidade selecionada. Clique em Editar para configurar.
            </p>
          )}
        </div>

        {/* Incidentes de segurança */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800">
              Incidentes de Segurança
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => setShowIncidentForm((v) => !v)}
            >
              <Plus className="h-3 w-3" />
              Registrar incidente
            </Button>
          </div>

          {showIncidentForm && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Data</label>
                  <Input
                    type="date"
                    className="h-7 text-xs"
                    value={newIncident.date}
                    onChange={(e) =>
                      setNewIncident({ ...newIncident, date: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <input
                    type="checkbox"
                    id="inc-resolved"
                    checked={newIncident.resolved}
                    onChange={(e) =>
                      setNewIncident({
                        ...newIncident,
                        resolved: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600 mb-1"
                  />
                  <label
                    htmlFor="inc-resolved"
                    className="text-xs text-slate-700 mb-1"
                  >
                    Resolvido
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Descrição</label>
                <Input
                  className="h-7 text-xs"
                  placeholder="Descreva o incidente..."
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident({
                      ...newIncident,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowIncidentForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleAddIncident}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Salvar incidente
                </Button>
              </div>
            </div>
          )}

          {(lgpd.security_incidents ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum incidente registrado.
            </p>
          ) : (
            <div className="space-y-2">
              {(lgpd.security_incidents ?? []).map((inc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <span
                    className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${inc.resolved ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800">
                      {inc.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inc.date} · {inc.resolved ? "Resolvido" : "Em aberto"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
