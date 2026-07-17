// @ts-nocheck
import { useState, useEffect } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  X,
  Building2,
  Users,
  FileText,
  Crown,
  CreditCard,
  UserPlus,
  Shield,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Mail,
  Trash2,
  Edit,
  Search,
  Filter,
  Save,
  Calendar,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Download,
  FileSpreadsheet,
  CheckCircle as CheckCircleIcon,
  Pause,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressMapPicker } from "@/components/address/address-map-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { NeonBadge } from "@/components/neon-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CompanyStatusSelector } from "@/components/company-status-selector";
import { apiClient } from "@/lib/api-client";
import { UserViewSlidePanel } from "@/components/user-view-slide-panel";

type CompanyType = "company" | "agency" | "nomad";
type CompanyStatus = "active" | "inactive" | "pending";

interface Company {
  id: number;
  name: string;
  type: CompanyType;
  email: string;
  phone: string;
  document: string;
  location: string;
  account_type?: "independent" | "premium";
  partner_level?: "basic" | "premium" | "enterprise";
  status: CompanyStatus;
  users_count: number;
  users_online: number;
  projects_count: number;
  created_at: string;
  // Added for export functions
  cnpj?: string;
  website?: string;
  address?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  pix_key?: string;
  pix_type?: string;
  lat?: number;
  lng?: number;
  plan?: string;
  activeUsers?: number;
  totalUsers?: number;
  projects?: number;
  // ... potentially other fields
}

// Interface update based on the provided updates
interface CompanyEditSlidePanelProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onSave: (company: Company) => void;
}

// Dummy interfaces for the export functions
interface UserForExport {
  name: string;
  email: string;
  role: string;
  status: string;
}

interface AcceptedTermForExport {
  name: string;
  version: string;
  acceptedAt: string;
  acceptedBy: string;
}

interface RelatedProjectForExport {
  name: string;
  status: string;
  progress: number;
  startDate: string;
}

interface ActivityLogForExport {
  user: string;
  action: string;
  timestamp: string;
  ip: string;
}

export function CompanyEditSlidePanel({
  open,
  onClose,
  company,
  onSave,
}: CompanyEditSlidePanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company-data");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "save" | "cancel" | null;
  }>({ open: false, action: null });

  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    newStatus: CompanyStatus | null;
  }>({ open: false, newStatus: null });

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("all");

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const [editedCompany, setEditedCompany] = useState<Company | null>(null);
  const [currentPlan, setCurrentPlan] = useState("basic");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  // Busca o CEP no ViaCEP e preenche Rua/Bairro/Cidade/Estado automaticamente
  // — mesmo padrão usado no cadastro (admin/clientes e "Novo Cadastro").
  const handleCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setEditedCompany((prev) => (prev ? { ...prev, zip_code: formatted } : prev));
    setCepError("");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
        return;
      }
      setEditedCompany((prev) =>
        prev
          ? {
              ...prev,
              zip_code: formatted,
              street: data.logradouro || prev.street,
              neighborhood: data.bairro || prev.neighborhood,
              city: data.localidade || prev.city,
              state: data.uf || prev.state,
            }
          : prev,
      );
    } catch {
      setCepError("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  // Dummy data and functions for export
  const [users, setUsers] = useState<UserForExport[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState<AcceptedTermForExport[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectForExport[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogForExport[]>([]);

  const handleExportCompanyData = () => {
    if (!editedCompany) return; // Ensure editedCompany is available

    const companyReport = {
      informacoes_basicas: {
        nome: editedCompany.name,
        tipo: editedCompany.type,
        status: editedCompany.status,
        cnpj: editedCompany.cnpj || "N/A", // Use default if not present
        email: editedCompany.email,
        telefone: editedCompany.phone,
        website: editedCompany.website || "N/A",
        endereco: editedCompany.address || "N/A",
      },
      usuarios: users.map((u) => ({
        nome: u.name,
        email: u.email,
        funcao: u.role,
        status: u.status,
      })),
      plano: {
        atual: editedCompany.plan || "basic", // Default to basic if not set
        valor_mensal:
          editedCompany.plan === "Enterprise"
            ? "R$ 499/mês"
            : editedCompany.plan === "Premium"
              ? "R$ 199/mês"
              : "R$ 49/mês",
      },
      metricas_uso: {
        usuarios_ativos: editedCompany.activeUsers || 0,
        total_usuarios: editedCompany.totalUsers || users.length,
        projetos_ativos:
          editedCompany.projects ||
          relatedProjects.filter((p) => p.status === "active").length,
        mau: Math.floor((editedCompany.activeUsers || 0) * 1.2),
        dau: Math.floor((editedCompany.activeUsers || 0) * 0.7),
      },
      financeiro: {
        total_investido: `R$ ${(Math.random() * 50000 + 5000).toFixed(2)}`,
        receita_mensal: `R$ ${(Math.random() * 5000 + 500).toFixed(2)}`,
        lifetime_value: `R$ ${(Math.random() * 100000 + 10000).toFixed(2)}`,
      },
      termos_aceitos: acceptedTerms.map((t) => ({
        termo: t.name,
        versao: t.version,
        aceito_em: t.acceptedAt,
        aceito_por: t.acceptedBy,
      })),
      projetos: relatedProjects.map((p) => ({
        nome: p.name,
        status: p.status,
        progresso: p.progress,
        inicio: p.startDate,
      })),
      logs_recentes: activityLogs.slice(0, 50).map((l) => ({
        usuario: l.user,
        acao: l.action,
        timestamp: l.timestamp,
        ip: l.ip,
      })),
    };

    const jsonStr = JSON.stringify(companyReport, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${editedCompany.name.toLowerCase().replace(/\s/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const handleExportUsersCSV = () => {
    if (!editedCompany) return; // Ensure editedCompany is available

    const csvData = users
      .map(
        (u) =>
          `"${u.name.replace(/"/g, '""')}","${u.email.replace(/"/g, '""')}","${u.role.replace(/"/g, '""')}","${u.status.replace(/"/g, '""')}"`,
      )
      .join("\n");
    const header = "Nome,Email,Função,Status\n";
    const blob = new Blob([header + csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-${editedCompany.name.toLowerCase().replace(/\s/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleStatusChange = (newStatus: CompanyStatus) => {
    setStatusChangeDialog({ open: true, newStatus });
  };

  const confirmStatusChange = async () => {
    if (!editedCompany || !statusChangeDialog.newStatus) return;

    const oldStatus = editedCompany.status;
    setEditedCompany({
      ...editedCompany,
      status: statusChangeDialog.newStatus,
    });
    setStatusChangeDialog({ open: false, newStatus: null });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "Sucesso",
        description: `Status alterado de ${oldStatus === "active" ? "Ativo" : oldStatus === "inactive" ? "Inativo" : "Pendente"} para ${statusChangeDialog.newStatus === "active" ? "Ativo" : statusChangeDialog.newStatus === "inactive" ? "Inativo" : "Pendente"}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao alterar status",
        variant: "destructive",
      });
    }
  };

  // Usuários reais desta empresa — nada de mock. Empresa recém-criada deve
  // mostrar só o admin principal (criado atomicamente junto), sem
  // usuários/tarefas/horas fictícios. Reutilizado como onRefresh depois de
  // editar um usuário no UserViewSlidePanel.
  const fetchCompanyUsers = (targetCompany: Company) => {
    const apiId = (targetCompany as any)._apiId || targetCompany.id;
    apiClient
      .getUsers({ company_id: apiId })
      .then((res: any) => {
        const raw = res?.data || [];
        setRawCompanyUsers(raw);
        const list = raw.map((u: any) => ({
          id: u.id,
          name: u.name || "",
          email: u.email || "",
          role: u.role === "company_admin" ? "Admin" : "User",
          status: u.is_active ? "active" : "inactive",
          last_login: u.last_login || null,
          // "Master" aqui = admin fundador desta Company, criado
          // atomicamente junto (Tarefa 9/11) — admin só desta conta, não
          // confundir com o Admin geral/Master da plataforma (esse é
          // sempre account_type === "admin", nunca "empresas").
          isMaster: u.role === "company_admin",
          phone: u.phone || "",
          department: "",
          tasksCompleted: 0,
          hoursLogged: 0,
          joinedAt: u.created_at,
          lastIp: "",
        }));
        setCompanyUsers(list);
      })
      .catch(() => setCompanyUsers([]));
  };

  useEffect(() => {
    if (company && open) {
      setEditedCompany(company);
      setCurrentPlan(company.partner_level || "basic");
      fetchCompanyUsers(company);
    }
  }, [company, open]);

  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  // Objetos crus da API (perfil completo), guardados à parte de companyUsers
  // (que é só o subconjunto de campos usado pelo card da lista) — o botão
  // "Editar" de cada usuário precisa do objeto completo pra abrir o
  // UserViewSlidePanel de verdade, o mesmo usado em admin/usuarios.
  const [rawCompanyUsers, setRawCompanyUsers] = useState<any[]>([]);
  const [editingCompanyUser, setEditingCompanyUser] = useState<any | null>(null);
  const [companyUserEditOpen, setCompanyUserEditOpen] = useState(false);

  // Mock data for terms, projects, logs
  const terms = [
    { id: 1, term: "Termos de Uso da Plataforma",       version: "3.2", accepted: true,  date: "2026-04-15", acceptedBy: "Ana Paula Silva", category: "Geral",     critical: false },
    { id: 2, term: "Política de Privacidade (LGPD)",    version: "2.1", accepted: true,  date: "2026-04-15", acceptedBy: "Ana Paula Silva", category: "Privacidade", critical: true  },
    { id: 3, term: "Contrato de Prestação de Serviços", version: "1.5", accepted: true,  date: "2026-04-15", acceptedBy: "Ana Paula Silva", category: "Contrato",  critical: true  },
    { id: 4, term: "Política de Cookies",               version: "1.0", accepted: true,  date: "2026-04-15", acceptedBy: "Ana Paula Silva", category: "Privacidade", critical: false },
    { id: 5, term: "Termo de Uso de IA",                version: "1.0", accepted: false, date: null,         acceptedBy: null,              category: "IA",        critical: true  },
    { id: 6, term: "Acordo de Confidencialidade (NDA)", version: "2.0", accepted: false, date: null,         acceptedBy: null,              category: "Contrato",  critical: true  },
  ];

  const projects = [
    { id: 1, name: "Campanha Black Friday 2026",     status: "active",    progress: 78, nomads: 4, deadline: "2026-11-25", budget: 24500, spent: 18900, startDate: "2026-04-10", priority: "high",   tasks: 32, completedTasks: 25 },
    { id: 2, name: "Rebranding Site Institucional",  status: "active",    progress: 45, nomads: 3, deadline: "2026-07-15", budget: 18000, spent: 8100,  startDate: "2026-05-01", priority: "medium", tasks: 28, completedTasks: 12 },
    { id: 3, name: "App Mobile v2.0",                status: "active",    progress: 62, nomads: 6, deadline: "2026-09-30", budget: 45000, spent: 27900, startDate: "2026-03-15", priority: "high",   tasks: 54, completedTasks: 33 },
    { id: 4, name: "SEO Q2 — Estratégia de Conteúdo", status: "completed", progress: 100,nomads: 2, deadline: "2026-04-30", budget: 12000, spent: 11200, startDate: "2026-02-01", priority: "low",    tasks: 18, completedTasks: 18 },
    { id: 5, name: "Migração de Servidor AWS",       status: "paused",    progress: 30, nomads: 2, deadline: "2026-08-20", budget: 8000,  spent: 2400,  startDate: "2026-04-20", priority: "low",    tasks: 14, completedTasks: 4  },
  ];

  const logs = (() => {
    const now = Date.now();
    const items = [
      { user: "Ana Paula Silva",  action: "Login realizado",                category: "auth",     status: "success" },
      { user: "Roberta Lima",     action: "Editou tarefa #4521",            category: "project",  status: "success" },
      { user: "Ana Paula Silva",  action: "Aprovou pagamento de R$ 1.240",  category: "settings", status: "success" },
      { user: "João Carlos Silva",action: "Criou novo projeto",             category: "project",  status: "success" },
      { user: "Sistema",          action: "Backup automático concluído",    category: "settings", status: "success" },
      { user: "Carlos Mendes",    action: "Tentativa de login falha",       category: "auth",     status: "error"   },
      { user: "Ana Paula Silva",  action: "Adicionou novo usuário",         category: "user",     status: "success" },
      { user: "Fernanda Costa",   action: "Alterou senha",                  category: "auth",     status: "warning" },
      { user: "Roberta Lima",     action: "Excluiu arquivo do projeto #18", category: "project",  status: "warning" },
      { user: "Ana Paula Silva",  action: "Atualizou perfil da empresa",    category: "settings", status: "success" },
    ];
    return items.map((it, i) => {
      const d = new Date(now - (i + 1) * 47 * 60 * 1000);
      return {
        id: i + 1,
        ...it,
        timestamp: `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        ip: `192.168.${Math.floor(i / 5) + 1}.${(i * 7 + 10) % 255}`,
        device: i % 3 === 0 ? "Mobile" : "Desktop",
        origin: i % 4 === 0 ? "API" : "Web",
      };
    });
  })();

  const [showTransferMasterModal, setShowTransferMasterModal] = useState(false);
  const [selectedUserForMaster, setSelectedUserForMaster] = useState<
    number | null
  >(null);

  const filteredUsers = companyUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole =
      userRoleFilter === "all" || user.role.toLowerCase() === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredTerms = terms.filter((term) => {
    if (termFilter === "all") return true;
    if (termFilter === "accepted") return term.accepted;
    if (termFilter === "pending") return !term.accepted;
    return true;
  });

  const filteredProjects = projects.filter((project) => {
    if (projectFilter === "all") return true;
    return project.status === projectFilter;
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase());
    const matchesAction =
      logActionFilter === "all" || log.category === logActionFilter;
    return matchesSearch && matchesAction;
  });

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) return;

    const newUser = {
      id: companyUsers.length + 1,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole === "admin" ? "Admin" : "User",
      status: "active" as const,
      last_login: new Date().toISOString().split("T")[0],
      isMaster: false, // New users are not masters by default
    };

    setCompanyUsers([...companyUsers, newUser]);
    setShowAddUserModal(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("member");
  };

  const handleDeleteUser = (userId: number) => {
    setCompanyUsers(companyUsers.filter((user) => user.id !== userId));
  };

  const handleTransferMaster = () => {
    if (!selectedUserForMaster) return;

    setCompanyUsers(
      companyUsers.map((user) => ({
        ...user,
        isMaster: user.id === selectedUserForMaster,
      })),
    );
    setShowTransferMasterModal(false);
    setSelectedUserForMaster(null);
  };

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteType("");
  };

  const handleClickSave = () => {
    setConfirmDialog({ open: true, action: "save" });
  };

  const handleConfirmSave = () => {
    if (editedCompany) {
      onSave(editedCompany);
      setConfirmDialog({ open: false, action: null });
      handleClose();
    }
  };

  const handleClickCancel = () => {
    setConfirmDialog({ open: true, action: "cancel" });
  };

  const handleConfirmCancel = () => {
    setConfirmDialog({ open: false, action: null });
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handlePlanChange = (newPlan: string) => {
    setCurrentPlan(newPlan);
    if (editedCompany) {
      setEditedCompany({
        ...editedCompany,
        partner_level: newPlan as "basic" | "premium" | "enterprise",
        plan: newPlan, // Also update the 'plan' field for export
      });
    }
  };

  if (!open) {
    return null;
  }
  if (!company) {
    return null;
  }

  if (!editedCompany) {
    return (
      <EmbeddedSlideScreen open={open} onClose={handleClose} title="Editar Empresa">
        <div className="flex-1 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        </div>
      </EmbeddedSlideScreen>
    );
  }

  return (
    <>
      <EmbeddedSlideScreen
        open={open}
        onClose={handleClickCancel}
        title="Editar Empresa"
        subtitle={company.name}
        pin={{
          id: `empresas-edit-${company.id}`,
          label: `Editar: ${company.name}`,
          icon: Edit,
          path: "/admin/empresas",
          activateKey: `edit:${company.id}`,
        }}
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Exportar Dados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCompanyData}>
                  <FileText className="h-4 w-4 mr-2" />
                  Relatório Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportUsersCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Usuários (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClickCancel}>
                Cancelar
              </Button>
              <Button className="btn-brand" onClick={handleClickSave}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar Alterações
              </Button>
            </div>
          </div>
        }
      >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Company identity — moved from header per the global modal standard (plain text-only header) */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex-shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
              {company.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{company.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <NeonBadge color={company.type === "company" ? "blue" : company.type === "agency" ? "violet" : "emerald"}>
                {company.type === "company"
                  ? "Company"
                  : company.type === "agency"
                    ? "Agency"
                    : "Nomad"}
              </NeonBadge>
              <NeonBadge color={company.status === "active" ? "emerald" : company.status === "inactive" ? "red" : "amber"}>
                {company.status === "active"
                  ? "Ativo"
                  : company.status === "inactive"
                    ? "Inativo"
                    : "Pendente"}
              </NeonBadge>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b px-6 py-3 shrink-0 bg-gradient-to-r from-gray-50 to-gray-100">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-2">
              <TabsTrigger
                value="company-data"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Users className="h-4 w-4 mr-2" />
                Usuários
              </TabsTrigger>
              <TabsTrigger
                value="plan"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Plano
              </TabsTrigger>
              <TabsTrigger
                value="terms"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Termos
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Projetos
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Activity className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-200">
            <ScrollArea className="h-full">
              <TabsContent value="company-data" className="mt-0">
                {/* ── Top status + stats strip ── */}
                <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 flex-wrap">
                  <CompanyStatusSelector
                    value={editedCompany?.status || "active"}
                    onChange={(status) => {
                      if (editedCompany) {
                        handleStatusChange(status);
                      }
                    }}
                    showLabel={false}
                  />
                  {/* Quick stats */}
                  <div className="flex items-center gap-5 ml-auto flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span className="font-semibold text-slate-700">{company.users_count ?? 0}</span> usuários
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                      <span className="font-semibold text-slate-700">{company.projects_count ?? 0}</span> projetos
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Cadastro: <span className="font-semibold text-slate-700 ml-1">{company.created_at ? new Date(company.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* ── Main form ── */}
                <div className="p-5 space-y-5">

                  {/* Section: Identificação */}
                  <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Identificação</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      {/* Nome */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Nome da Empresa
                        </label>
                        <Input
                          value={editedCompany.name}
                          onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Nome da empresa"
                        />
                      </div>
                      {/* Tipo */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</label>
                        <Select
                          value={editedCompany.type}
                          onValueChange={(v) => setEditedCompany({ ...editedCompany, type: v as CompanyType })}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="agency">Agency</SelectItem>
                            <SelectItem value="nomad">Nomad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Mail className="h-3 w-3" /> E-mail
                        </label>
                        <Input
                          type="email"
                          value={editedCompany.email}
                          onChange={(e) => setEditedCompany({ ...editedCompany, email: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="email@empresa.com"
                        />
                      </div>
                      {/* Telefone */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Telefone
                        </label>
                        <Input
                          type="tel"
                          value={editedCompany.phone}
                          onChange={(e) => setEditedCompany({ ...editedCompany, phone: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="+55 (11) 98765-4321"
                        />
                      </div>
                      {/* Website */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Website
                        </label>
                        <Input
                          value={editedCompany.website || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, website: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="https://empresa.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Documentos */}
                  <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documentos & Conta</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      {/* CNPJ */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <FileText className="h-3 w-3" /> CNPJ
                        </label>
                        <Input
                          value={editedCompany.document || editedCompany.cnpj || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, document: e.target.value, cnpj: e.target.value })}
                          className="h-8 text-sm font-mono"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      {/* Tipo de conta */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Tipo de Conta
                        </label>
                        <Select
                          value={editedCompany.account_type || "independent"}
                          onValueChange={(v) => setEditedCompany({ ...editedCompany, account_type: v as "independent" | "premium" })}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="independent">Independente</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Plano */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Plano
                        </label>
                        <Select
                          value={currentPlan}
                          onValueChange={setCurrentPlan}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Localização */}
                  <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Localização</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                      {/* CEP — primeiro campo, com autofill via ViaCEP */}
                      <div className="col-span-3 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">CEP</label>
                        <div className="relative max-w-[200px]">
                          <Input
                            value={editedCompany.zip_code || ""}
                            onChange={(e) => handleCepChange(e.target.value)}
                            className="h-8 text-sm font-mono pr-7"
                            placeholder="00000-000"
                            maxLength={9}
                          />
                          {cepLoading && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        {cepError && <p className="text-xs text-red-500">{cepError}</p>}
                      </div>
                      {/* Rua */}
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Rua / Logradouro</label>
                        <Input
                          value={editedCompany.street || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, street: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Rua Exemplo"
                        />
                      </div>
                      {/* Número */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Número</label>
                        <Input
                          value={editedCompany.number || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, number: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="123"
                        />
                      </div>
                      {/* Bairro */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Bairro</label>
                        <Input
                          value={editedCompany.neighborhood || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, neighborhood: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Bairro"
                        />
                      </div>
                      {/* Cidade */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cidade</label>
                        <Input
                          value={editedCompany.city || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, city: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="São Paulo"
                        />
                      </div>
                      {/* Estado */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Estado</label>
                        <Input
                          value={editedCompany.state || ""}
                          onChange={(e) => setEditedCompany({ ...editedCompany, state: e.target.value.toUpperCase() })}
                          className="h-8 text-sm"
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                      {/* Map picker full width */}
                      <div className="col-span-3">
                        <AddressMapPicker
                          address={{
                            street: editedCompany.street || "",
                            number: editedCompany.number || "",
                            district: editedCompany.neighborhood || "",
                            city: editedCompany.city || "",
                            state: editedCompany.state || "",
                            zipcode: editedCompany.zip_code || "",
                            lat: editedCompany.lat || 0,
                            lng: editedCompany.lng || 0,
                          }}
                          onAddressChange={(address) => {
                            setEditedCompany((prev) => ({
                              ...prev,
                              street: address.street || "",
                              number: address.number || "",
                              neighborhood: address.district || "",
                              city: address.city || "",
                              state: address.state || "",
                              zip_code: address.zipcode || "",
                              lat: address.lat,
                              lng: address.lng,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={handleClickCancel} className="h-8 px-5 text-xs">
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleClickSave} className="h-8 px-5 text-xs">
                      <Save className="h-3 w-3 mr-1.5" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-0 p-5 space-y-4">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Total de Usuários</p>
                        <p className="text-2xl font-bold mt-1">{companyUsers.length}</p>
                      </div>
                      <Users className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">vinculados à empresa</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Ativos</p>
                        <p className="text-2xl font-bold mt-1">{companyUsers.filter(u => u.status === "active").length}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">{companyUsers.filter(u => u.status === "inactive").length} inativos</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-violet-500 to-purple-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Admins</p>
                        <p className="text-2xl font-bold mt-1">{companyUsers.filter(u => u.role === "Admin").length}</p>
                      </div>
                      <Shield className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">com permissão total</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Engajamento</p>
                        <p className="text-2xl font-bold mt-1">{companyUsers.reduce((s, u) => s + (u.hoursLogged || 0), 0).toLocaleString("pt-BR")}h</p>
                      </div>
                      <Activity className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">horas acumuladas</p>
                  </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200/80 p-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue placeholder="Função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="user">Usuários</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddUserModal(true)} size="sm" className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800">
                    <UserPlus className="h-3 w-3 mr-1.5" /> Adicionar Usuário
                  </Button>
                </div>

                {showTransferMasterModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">
                          Transferir Master
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTransferMasterModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Selecione o usuário que se tornará o novo Master da
                          empresa. Esta ação é irreversível.
                        </p>
                        <Select
                          value={selectedUserForMaster?.toString()}
                          onValueChange={(value) =>
                            setSelectedUserForMaster(Number.parseInt(value))
                          }
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecionar usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyUsers
                              .filter((u) => !u.isMaster)
                              .map((user) => (
                                <SelectItem
                                  key={user.id}
                                  value={user.id.toString()}
                                >
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowTransferMasterModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleTransferMaster}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Transferir Master
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {showAddUserModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">
                          Adicionar Novo Usuário
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowAddUserModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="new-user-name"
                            className="text-xs font-medium"
                          >
                            Nome Completo
                          </Label>
                          <Input
                            id="new-user-name"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="João Silva"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="new-user-email"
                            className="text-xs font-medium"
                          >
                            Email
                          </Label>
                          <Input
                            id="new-user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="joao@empresa.com"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="new-user-role"
                            className="text-xs font-medium"
                          >
                            Função
                          </Label>
                          <Select
                            value={newUserRole}
                            onValueChange={setNewUserRole}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Usuário</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddUserModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleAddUser}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {showInviteModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">
                          Convidar {inviteType}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowInviteModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="invite-email"
                            className="text-xs font-medium"
                          >
                            Email do Convidado
                          </Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowInviteModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleSendInvite}
                            size="sm"
                            className="h-9 px-4"
                          >
                            <Mail className="h-3.5 w-3.5 mr-2" />
                            Enviar Convite
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                <div className="grid gap-2">
                  {filteredUsers.map((user) => {
                    const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                    const isOnline = user.status === "active";
                    return (
                      <div key={user.id} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {initials}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">{user.name}</p>
                              {user.isMaster ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-linear-to-r from-amber-400 to-orange-500 text-white border-0 flex items-center gap-0.5 shadow-sm"
                                  title="Admin exclusivo desta empresa — diferente do Admin geral (Master) da plataforma"
                                >
                                  <Crown className="h-2.5 w-2.5" /> Admin Company
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className={`text-[10px] border-0 ${user.role === "Admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                                  {user.role === "Admin" ? <><Shield className="h-2.5 w-2.5 mr-0.5 inline" /> Admin</> : "Usuário"}
                                </Badge>
                              )}
                              <Badge variant="secondary" className={`text-[10px] border-0 flex items-center gap-0.5 ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                <span className={`h-1 w-1 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} /> {isOnline ? "Online" : "Inativo"}
                              </Badge>
                              {user.department && (
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0">{user.department}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {user.email}</span>
                              {user.phone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {user.phone}</span>}
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {user.last_login ? `Último acesso: ${new Date(user.last_login).toLocaleDateString("pt-BR")}` : "Nunca acessou"}
                              </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="hidden lg:flex items-center gap-4 px-3 border-l border-slate-100 shrink-0">
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-700">{user.tasksCompleted ?? 0}</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Tarefas</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-700">{user.hoursLogged ?? 0}h</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Horas</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {user.isMaster && (
                              <Button variant="outline" size="sm" onClick={() => setShowTransferMasterModal(true)} className="h-7 px-2.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                                <Crown className="h-3 w-3 mr-1" /> Transferir
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => {
                                const raw = rawCompanyUsers.find((u) => u.id === user.id);
                                setEditingCompanyUser(raw || null);
                                setCompanyUserEditOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            {!user.isMaster && (
                              <Button variant="outline" size="icon" onClick={() => handleDeleteUser(user.id)} className="h-7 w-7 text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Quick invites ── */}
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                    <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Convites Rápidos</span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { setInviteType("Partner"); setShowInviteModal(true); }}
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700">Convidar Partner</p>
                        <p className="text-[10px] text-slate-400">Parceiro estratégico</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setInviteType("Nômade Líder"); setShowInviteModal(true); }}
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        <Crown className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700">Convidar Nômade Líder</p>
                        <p className="text-[10px] text-slate-400">Líder de equipe</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setInviteType("Membro"); setShowInviteModal(true); }}
                      className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        <UserPlus className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700">Convidar Membro</p>
                        <p className="text-[10px] text-slate-400">Colaborador padrão</p>
                      </div>
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="plan" className="mt-0 p-5 space-y-4">

                {/* ── Plan summary KPI strip ── */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Plano Atual</p>
                        <p className="text-2xl font-bold mt-1">{currentPlan === "basic" ? "Basic" : currentPlan === "premium" ? "Premium" : "Enterprise"}</p>
                      </div>
                      <CreditCard className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">Renovação automática ativa</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Valor mensal</p>
                        <p className="text-2xl font-bold mt-1">R$ {currentPlan === "basic" ? "99" : currentPlan === "premium" ? "299" : "799"}</p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">Próxima cobrança: 15/06/2026</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-violet-500 to-purple-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Usuários</p>
                        <p className="text-2xl font-bold mt-1">{companyUsers.length} <span className="text-sm font-normal text-white/70">/ {currentPlan === "basic" ? "5" : currentPlan === "premium" ? "20" : "∞"}</span></p>
                      </div>
                      <Users className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">Limite do plano</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Cliente desde</p>
                        <p className="text-2xl font-bold mt-1">14 <span className="text-sm font-normal text-white/70">meses</span></p>
                      </div>
                      <Calendar className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">LTV: R$ {(currentPlan === "basic" ? 99 : currentPlan === "premium" ? 299 : 799) * 14}</p>
                  </div>
                </div>

                {/* ── Plan selection ── */}
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Selecionar Plano</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Faturamento mensal</Badge>
                  </div>

                  <div className="p-4 grid grid-cols-3 gap-3">
                    {/* Basic Plan */}
                    {(() => {
                      const isActive = currentPlan === "basic"
                      return (
                        <div
                          onClick={() => handlePlanChange("basic")}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${isActive ? "border-blue-500 bg-blue-50/40 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          {isActive && (
                            <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">Atual</div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
                              <Shield className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">Basic</h4>
                              <p className="text-[10px] text-slate-500">Para começar</p>
                            </div>
                          </div>
                          <div className="mb-3 pb-3 border-b border-slate-100">
                            <p className="text-2xl font-bold text-slate-800">R$ 99<span className="text-xs font-normal text-slate-400">/mês</span></p>
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-slate-600">
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Até 5 usuários</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> 3 projetos ativos</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> 10 GB armazenamento</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Suporte por e-mail</li>
                          </ul>
                        </div>
                      )
                    })()}

                    {/* Premium Plan */}
                    {(() => {
                      const isActive = currentPlan === "premium"
                      return (
                        <div
                          onClick={() => handlePlanChange("premium")}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${isActive ? "border-purple-500 bg-purple-50/40 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-linear-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">Mais popular</div>
                          {isActive && (
                            <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">Atual</div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                              <Crown className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">Premium</h4>
                              <p className="text-[10px] text-slate-500">Para crescer</p>
                            </div>
                          </div>
                          <div className="mb-3 pb-3 border-b border-slate-100">
                            <p className="text-2xl font-bold text-slate-800">R$ 299<span className="text-xs font-normal text-slate-400">/mês</span></p>
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-slate-600">
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Até 20 usuários</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Projetos ilimitados</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> 100 GB armazenamento</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Suporte prioritário 24/7</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Relatórios avançados</li>
                          </ul>
                        </div>
                      )
                    })()}

                    {/* Enterprise Plan */}
                    {(() => {
                      const isActive = currentPlan === "enterprise"
                      return (
                        <div
                          onClick={() => handlePlanChange("enterprise")}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${isActive ? "border-amber-500 bg-amber-50/40 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
                        >
                          {isActive && (
                            <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">Atual</div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">Enterprise</h4>
                              <p className="text-[10px] text-slate-500">Para escalar</p>
                            </div>
                          </div>
                          <div className="mb-3 pb-3 border-b border-slate-100">
                            <p className="text-2xl font-bold text-slate-800">R$ 799<span className="text-xs font-normal text-slate-400">/mês</span></p>
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-slate-600">
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Usuários ilimitados</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Projetos ilimitados</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Armazenamento ilimitado</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Gerente dedicado</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> SLA garantido 99.9%</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> Integrações personalizadas</li>
                          </ul>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* ── Billing history ── */}
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Histórico de Faturas</span>
                  </div>
                  <div>
                    {[
                      { id: "INV-2026-005", date: "15/05/2026", amount: 299, status: "paid",    method: "Cartão •••• 4242" },
                      { id: "INV-2026-004", date: "15/04/2026", amount: 299, status: "paid",    method: "Cartão •••• 4242" },
                      { id: "INV-2026-003", date: "15/03/2026", amount: 299, status: "paid",    method: "PIX" },
                      { id: "INV-2026-002", date: "15/02/2026", amount: 99,  status: "paid",    method: "Cartão •••• 4242" },
                      { id: "INV-2026-001", date: "15/01/2026", amount: 99,  status: "paid",    method: "Cartão •••• 4242" },
                    ].map((inv, idx) => (
                      <div key={inv.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${idx > 0 ? "border-t border-slate-100" : ""}`}>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">{inv.id}</p>
                          <p className="text-[10px] text-slate-400">{inv.date} • {inv.method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-700">R$ {inv.amount.toLocaleString("pt-BR")}</p>
                          <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700 border-0">Paga</Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {currentPlan !== company.partner_level && (
                  <div className="rounded-xl p-4 border-2 border-blue-200 bg-blue-50/60">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">Alteração de plano pendente</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Você selecionou o plano <strong>{currentPlan.toUpperCase()}</strong>. Clique em "Salvar Alterações" para confirmar a mudança.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="terms" className="mt-0 p-5 space-y-4">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Aceitos</p>
                        <p className="text-2xl font-bold mt-1">{terms.filter(t => t.accepted).length}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">de {terms.length} termos</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Pendentes</p>
                        <p className="text-2xl font-bold mt-1">{terms.filter(t => !t.accepted).length}</p>
                      </div>
                      <Clock className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">aguardando assinatura</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-red-500 to-rose-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Críticos</p>
                        <p className="text-2xl font-bold mt-1">{terms.filter(t => t.critical && !t.accepted).length}</p>
                      </div>
                      <AlertCircle className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">requerem ação imediata</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Conformidade</p>
                        <p className="text-2xl font-bold mt-1">{Math.round((terms.filter(t => t.accepted).length / terms.length) * 100)}%</p>
                      </div>
                      <Shield className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">índice de aceite</p>
                  </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700">Termos & Documentos</h3>
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0">{filteredTerms.length}</Badge>
                  </div>
                  <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="accepted">Aceitos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Term cards ── */}
                <div className="grid gap-2">
                  {filteredTerms.map((term) => {
                    const catColor = term.category === "Privacidade" ? "bg-violet-100 text-violet-700"
                      : term.category === "Contrato"  ? "bg-blue-100 text-blue-700"
                      : term.category === "IA"        ? "bg-pink-100 text-pink-700"
                      : "bg-slate-100 text-slate-700";
                    return (
                      <div key={term.id} className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-sm ${term.critical && !term.accepted ? "border-red-200 bg-red-50/30" : "border-slate-200/80"}`}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${term.accepted ? "bg-linear-to-br from-emerald-400 to-emerald-600" : term.critical ? "bg-linear-to-br from-red-400 to-red-600" : "bg-linear-to-br from-amber-400 to-amber-600"}`}>
                            {term.accepted ? <CheckCircle className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-800">{term.term}</h4>
                              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0 font-mono">v{term.version}</Badge>
                              <Badge variant="secondary" className={`text-[10px] border-0 ${catColor}`}>{term.category}</Badge>
                              {term.critical && (
                                <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 border-0 flex items-center gap-0.5"><AlertCircle className="h-2.5 w-2.5" /> Crítico</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              {term.accepted ? (
                                <>
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(term.date!).toLocaleDateString("pt-BR")}</span>
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {term.acceptedBy}</span>
                                  <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle className="h-3 w-3" /> Assinatura digital válida</span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="h-3 w-3" /> Aguardando assinatura</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!term.accepted && (
                              <Button size="sm" className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700">
                                <CheckCircle className="h-3 w-3 mr-1" /> Solicitar Aceite
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" /> Ver
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="mt-0 p-5 space-y-4">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Projetos Ativos</p>
                        <p className="text-2xl font-bold mt-1">{projects.filter(p => p.status === "active").length}</p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">{projects.length} no total</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Orçamento Total</p>
                        <p className="text-2xl font-bold mt-1">R$ {(projects.reduce((s, p) => s + p.budget, 0) / 1000).toFixed(1)}k</p>
                      </div>
                      <CreditCard className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">R$ {(projects.reduce((s, p) => s + p.spent, 0) / 1000).toFixed(1)}k investidos</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-violet-500 to-purple-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Tarefas</p>
                        <p className="text-2xl font-bold mt-1">{projects.reduce((s, p) => s + p.completedTasks, 0)}<span className="text-sm font-normal text-white/70">/{projects.reduce((s, p) => s + p.tasks, 0)}</span></p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">{Math.round((projects.reduce((s, p) => s + p.completedTasks, 0) / projects.reduce((s, p) => s + p.tasks, 0)) * 100)}% concluídas</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Nômades</p>
                        <p className="text-2xl font-bold mt-1">{projects.reduce((s, p) => s + p.nomads, 0)}</p>
                      </div>
                      <Users className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">alocados em projetos</p>
                  </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700">Projetos Vinculados</h3>
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0">{filteredProjects.length}</Badge>
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                      <SelectItem value="paused">Pausados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Project cards ── */}
                <div className="grid gap-2">
                  {filteredProjects.map((project) => {
                    const statusCfg = project.status === "active"
                      ? { label: "Ativo",     bar: "bg-emerald-500", bg: "bg-emerald-100 text-emerald-700", icon: TrendingUp }
                      : project.status === "completed"
                      ? { label: "Concluído", bar: "bg-blue-500",    bg: "bg-blue-100 text-blue-700",       icon: CheckCircle }
                      : { label: "Pausado",   bar: "bg-amber-500",   bg: "bg-amber-100 text-amber-700",     icon: Pause };
                    const prioCfg = project.priority === "high"
                      ? { label: "Alta",   cls: "bg-red-100 text-red-700" }
                      : project.priority === "medium"
                      ? { label: "Média",  cls: "bg-amber-100 text-amber-700" }
                      : { label: "Baixa",  cls: "bg-slate-100 text-slate-600" };
                    const budgetPct = (project.spent / project.budget) * 100;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div key={project.id} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3 gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-800">{project.name}</h4>
                                <Badge variant="secondary" className={`text-[10px] border-0 flex items-center gap-0.5 ${statusCfg.bg}`}>
                                  <StatusIcon className="h-2.5 w-2.5" /> {statusCfg.label}
                                </Badge>
                                <Badge variant="secondary" className={`text-[10px] border-0 ${prioCfg.cls}`}>Prioridade {prioCfg.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-400" /> {project.nomads} nômades</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-violet-400" /> Início {new Date(project.startDate).toLocaleDateString("pt-BR")}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" /> Prazo {new Date(project.deadline).toLocaleDateString("pt-BR")}</span>
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {project.completedTasks}/{project.tasks} tarefas</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs shrink-0">
                              <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                            </Button>
                          </div>

                          {/* Progress bars */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">Progresso</span>
                                <span className="font-bold text-slate-700">{project.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${statusCfg.bar} rounded-full transition-all`} style={{ width: `${project.progress}%` }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">Orçamento usado</span>
                                <span className="font-bold text-slate-700">R$ {project.spent.toLocaleString("pt-BR")} <span className="text-slate-400 font-normal">/ R$ {project.budget.toLocaleString("pt-BR")}</span></span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 75 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${budgetPct}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-0 p-5 space-y-4">

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-linear-to-br from-indigo-500 to-blue-700 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Total de Eventos</p>
                        <p className="text-2xl font-bold mt-1">{logs.length}</p>
                      </div>
                      <Activity className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">últimas 24h</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Sucesso</p>
                        <p className="text-2xl font-bold mt-1">{logs.filter(l => l.status === "success").length}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">{Math.round((logs.filter(l => l.status === "success").length / logs.length) * 100)}% do total</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Alertas</p>
                        <p className="text-2xl font-bold mt-1">{logs.filter(l => l.status === "warning").length}</p>
                      </div>
                      <AlertCircle className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">requerem atenção</p>
                  </div>
                  <div className="rounded-xl p-4 bg-linear-to-br from-red-500 to-rose-600 text-white shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Erros</p>
                        <p className="text-2xl font-bold mt-1">{logs.filter(l => l.status === "error").length}</p>
                      </div>
                      <X className="h-5 w-5 text-white/70" />
                    </div>
                    <p className="text-[10px] text-white/60 mt-2">eventos críticos</p>
                  </div>
                </div>

                {/* ── Filter bar ── */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200/80 p-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar usuário ou ação..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 h-8 text-xs"
                    />
                  </div>
                  <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      <SelectItem value="auth">Autenticação</SelectItem>
                      <SelectItem value="project">Projetos</SelectItem>
                      <SelectItem value="user">Usuários</SelectItem>
                      <SelectItem value="settings">Configurações</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                    <Download className="h-3 w-3 mr-1.5" /> Exportar
                  </Button>
                </div>

                {/* ── Activity timeline ── */}
                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Activity className="h-10 w-10 opacity-40 mb-2" />
                      <p className="text-sm font-medium text-slate-500">Nenhum log encontrado</p>
                    </div>
                  ) : filteredLogs.map((log, idx) => {
                    const catCfg = log.category === "auth"
                      ? { color: "from-blue-500 to-blue-700",    bg: "bg-blue-100 text-blue-700",   label: "Auth" }
                      : log.category === "project"
                      ? { color: "from-emerald-500 to-teal-600", bg: "bg-emerald-100 text-emerald-700", label: "Projeto" }
                      : log.category === "user"
                      ? { color: "from-violet-500 to-purple-700",bg: "bg-violet-100 text-violet-700",label: "Usuário" }
                      : { color: "from-amber-500 to-orange-600", bg: "bg-amber-100 text-amber-700", label: "Sistema" };
                    const statusCfg = log.status === "success"
                      ? { dot: "bg-emerald-500", bg: "bg-emerald-100 text-emerald-700", label: "Sucesso" }
                      : log.status === "warning"
                      ? { dot: "bg-amber-400",   bg: "bg-amber-100 text-amber-700",     label: "Alerta" }
                      : { dot: "bg-red-500",     bg: "bg-red-100 text-red-700",         label: "Erro" };
                    return (
                      <div key={log.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${idx > 0 ? "border-t border-slate-100" : ""}`}>
                        <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${catCfg.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800">{log.action}</p>
                            <Badge variant="secondary" className={`text-[9px] border-0 ${catCfg.bg}`}>{catCfg.label}</Badge>
                            <Badge variant="secondary" className={`text-[9px] border-0 flex items-center gap-0.5 ${statusCfg.bg}`}>
                              <span className={`h-1 w-1 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> <span className="font-medium text-slate-600">{log.user}</span></span>
                            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {log.timestamp}</span>
                            <span className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> {log.ip}</span>
                            <span className="hidden lg:inline-flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {log.device} • {log.origin}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
      </EmbeddedSlideScreen>

      {/* Dialogs de Confirmação */}
      <ConfirmationDialog
        open={confirmDialog.open && confirmDialog.action === "save"}
        title="Salvar alterações?"
        message="Deseja realmente salvar as alterações da empresa?"
        confirmText="Salvar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmSave}
        onClose={() => setConfirmDialog({ open: false, action: null })}
        destructive={false}
      />

      <ConfirmationDialog
        open={confirmDialog.open && confirmDialog.action === "cancel"}
        title="Descartar alterações?"
        message="Todas as alterações não salvas serão perdidas."
        confirmText="Descartar"
        cancelText="Voltar"
        onConfirm={handleConfirmCancel}
        onClose={() => setConfirmDialog({ open: false, action: null })}
        destructive={true}
      />

      {companyUserEditOpen && (
        <UserViewSlidePanel
          open={companyUserEditOpen}
          onClose={() => {
            setCompanyUserEditOpen(false);
            setEditingCompanyUser(null);
          }}
          onRefresh={() => editedCompany && fetchCompanyUsers(editedCompany)}
          user={editingCompanyUser}
          viewerRole="admin"
        />
      )}

      <AlertDialog
        open={statusChangeDialog.open}
        onOpenChange={(open) =>
          !open && setStatusChangeDialog({ open: false, newStatus: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status da empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente alterar o status desta empresa de{" "}
              {editedCompany?.status === "active"
                ? "Ativa"
                : editedCompany?.status === "inactive"
                  ? "Inativa"
                  : "Pendente"}{" "}
              para{" "}
              {statusChangeDialog.newStatus === "active"
                ? "Ativa"
                : statusChangeDialog.newStatus === "inactive"
                  ? "Inativa"
                  : "Pendente"}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
