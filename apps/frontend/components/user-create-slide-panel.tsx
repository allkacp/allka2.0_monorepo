import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Lock,
  Building2,
  Search,
  X as XIcon,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_COMPANY_PERMISSIONS } from "@/types/user";
import type { CompanyPermissions } from "@/types/user";

interface UserCreateSlidePanelProps {
  open: boolean;
  onClose: () => void;
  onUserCreated?: (user: any) => void;
  /** When set, the panel was opened from within a company and will pre-fill company context */
  companyId?: number | string;
  companyName?: string;
}

export function UserCreateSlidePanel({
  open,
  onClose,
  onUserCreated,
  companyId,
  companyName,
}: UserCreateSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);
  const [currentStep, setCurrentStep] = useState(1);
  useEffect(() => {
    // Scroll Radix ScrollArea viewport back to top on step change
    const vp = bodyScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (vp) vp.scrollTop = 0;
  }, [currentStep]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Reset scroll to top every time the panel opens or the step changes
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const { toast } = useToast();

  // Company-level permissions — only used when creating from within a company
  const [companyPermissions, setCompanyPermissions] =
    useState<CompanyPermissions>(
      JSON.parse(JSON.stringify(DEFAULT_COMPANY_PERMISSIONS)),
    );
  const toggleCompanyPermission = (
    category: keyof CompanyPermissions,
    permId: string,
  ) => {
    setCompanyPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((p) =>
        p.id === permId ? { ...p, enabled: !p.enabled } : p,
      ),
    }));
  };

  // LGPD consent state
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [legalBasis, setLegalBasis] = useState("consent");

  // Estado do novo usuário
  const [newUser, setNewUser] = useState({
    // Etapa 1 - Conta
    name: "",
    email: "",
    username: "",
    password: "",
    account_type: companyId ? "empresas" : "empresas",
    role: companyId ? "company_user" : "company_user",
    // Nome da organização (Agency/Company/Partner) sendo fundada — distinto
    // do nome da pessoa acima. Só usado quando !companyId (fundando uma
    // organização nova, não entrando numa já existente) — Tarefa 11.
    organizationName: "",
    is_active: true,
    plan: "free",
    // Etapa 2 - Dados
    cpf: "",
    birth_date: "",
    phone: "",
    whatsapp: "",
    cep: "",
    street: "",
    number: "",
    city: "",
    state: "",
    notes: "",
    // Etapa 3 - Permissões
    permissions: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Impede duplo-envio enquanto a criação está em andamento (Tarefa 11) —
  // gap pré-existente: o botão não tinha nenhuma trava contra clique duplo.
  const [isCreating, setIsCreating] = useState(false);

  // Vínculo com empresas
  const [availableCompanies, setAvailableCompanies] = useState<
    { id: string; name: string }[]
  >([]);
  const [linkedCompanyIds, setLinkedCompanyIds] = useState<string[]>(
    companyId ? [String(companyId)] : [],
  );
  const [noCompanyLink, setNoCompanyLink] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Permissões disponíveis
  const permissionsByCategory = {
    Projetos: [
      { id: "view_projects", label: "Visualizar Projetos" },
      { id: "create_projects", label: "Criar Projetos" },
      { id: "edit_projects", label: "Editar Projetos" },
      { id: "cancel_projects", label: "Cancelar Projetos" },
    ],
    Usuários: [{ id: "manage_users", label: "Gerenciar Usuários" }],
    Financeiro: [
      { id: "view_payments", label: "Visualizar Pagamentos" },
      { id: "manage_payments", label: "Gerenciar Pagamentos" },
    ],
    Relatórios: [{ id: "view_analytics", label: "Visualizar Análises" }],
    Sistema: [{ id: "admin_access", label: "Acesso Admin" }],
  };

  // Define panel positioning - Extends from sidebar to right edge
  const [panelStyle, setPanelStyle] = useState<{ left: string; width: string; top: string; bottom: string }>(
    {
      left: "240px",
      width: "calc(100vw - 240px)",
      top: "0px",
      bottom: "0px",
    },
  );

  useEffect(() => {
    const calculatePanelStyle = () => {
      const sidebarWidthPx =
        typeof sidebarWidth === "number"
          ? sidebarWidth
          : parseInt(sidebarWidth as string) || 240;
      const left = sidebarWidthPx - 2;
      const top = headerHeight - 1;
      const bottom = footerHeight - 1;
      setPanelStyle({
        left: `${left}px`,
        width: `calc(100vw - ${left}px)`,
        top: `${top}px`,
        bottom: `${bottom}px`,
      });
    };
    calculatePanelStyle();
    window.addEventListener("resize", calculatePanelStyle);
    return () => window.removeEventListener("resize", calculatePanelStyle);
  }, [sidebarWidth, headerHeight, footerHeight]);

  // Load companies when panel opens
  useEffect(() => {
    if (open) {
      // Scroll Radix ScrollArea viewport back to top
      const vp = bodyScrollRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement | null;
      if (vp) vp.scrollTop = 0;
      apiClient
        .getCompanies({ limit: "1000" })
        .then((res: any) => {
          const list = (res.data || []).map((c: any) => ({
            id: String(c.id),
            name: c.name,
          }));
          setAvailableCompanies(list);
        })
        .catch(() => {});
    } else {
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setCurrentStep(1);
      setNewUser({
        name: "",
        email: "",
        username: "",
        password: "",
        account_type: "empresas",
        role: "company_user",
        organizationName: "",
        is_active: true,
        plan: "free",
        cpf: "",
        birth_date: "",
        phone: "",
        whatsapp: "",
        cep: "",
        street: "",
        number: "",
        city: "",
        state: "",
        notes: "",
        permissions: [],
      });
      setAvatarPreview(null);
      setErrors({});
      setCreateError(null);
      setLgpdConsent(false);
      setLegalBasis("consent");
      setLinkedCompanyIds(companyId ? [String(companyId)] : []);
      setNoCompanyLink(false);
      setCompanySearch("");
    }, 420);
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!newUser.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!newUser.email.trim()) newErrors.email = "Email é obrigatório";
    if (!newUser.username.trim()) newErrors.username = "Username é obrigatório";
    if (!newUser.password || newUser.password.length < 6)
      newErrors.password = "Senha é obrigatória (mínimo 6 caracteres)";
    if (!newUser.account_type)
      newErrors.account_type = "Tipo de usuário é obrigatório";
    if (
      !companyId &&
      (newUser.account_type === "agencias" ||
        newUser.account_type === "parceiro" ||
        newUser.account_type === "empresas") &&
      !newUser.organizationName.trim()
    )
      newErrors.organizationName = "Nome da organização é obrigatório";
    if (!lgpdConsent)
      newErrors.lgpd_consent =
        "Aceite da Política de Privacidade é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateUser = async () => {
    if (isCreating) return;
    setCreateError(null);
    setIsCreating(true);
    try {
      const payload: Record<string, any> = {
        email: newUser.email,
        password: newUser.password || "Allka@2026",
        name: newUser.name,
        username: newUser.username || undefined,
        role: newUser.role || "company_user",
        account_type: newUser.account_type || "empresas",
        phone: newUser.phone || undefined,
      };
      if (linkedCompanyIds.length > 0) {
        payload.company_id = linkedCompanyIds[0];
      } else if (newUser.organizationName.trim()) {
        payload.organization_name = newUser.organizationName.trim();
      }
      const created = await apiClient.createUser(payload);

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso.",
      });

      if (onUserCreated) {
        onUserCreated(created);
      }

      handleClose();
    } catch (error: any) {
      const msg = error?.message || "Não foi possível criar o usuário.";
      setCreateError(msg);
      toast({
        title: "Erro ao criar usuário",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setNewUser({
      ...newUser,
      permissions: newUser.permissions.includes(permissionId)
        ? newUser.permissions.filter((p) => p !== permissionId)
        : [...newUser.permissions, permissionId],
    });
  };

  if (!open && !isClosing) return null;

  return (
    <>
      <div
        data-slot="sheet-content"
        data-state={isClosing ? "closed" : "open"}
        className="fixed z-80 bg-background flex flex-col shadow-2xl border-l border-border overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
        style={{
          left: panelStyle.left,
          width: panelStyle.width,
          top: panelStyle.top,
          bottom: panelStyle.bottom,
        }}
      >
        {/* Header with brand theme */}
        <ModalBrandHeader
          title="Criar Novo Usuário"
          left={
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-blue-300/50">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                    {newUser.name ? newUser.name.charAt(0).toUpperCase() : "N"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 rounded-full p-1.5 text-white transition-colors border border-blue-950"
                  type="button"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-xs text-blue-200">
                  Etapa {currentStep} de 3
                </p>
              </div>
            </div>
          }
          onClose={handleClose}
        />

        {/* Conteúdo com Scroll Interno */}
        <div ref={bodyScrollRef} className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* ETAPA 1: CONTA */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      placeholder="Ex: João Silva"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="Ex: joao@empresa.com"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Username / Login *</Label>
                    <Input
                      placeholder="Ex: joao.silva"
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                      className={errors.username ? "border-red-500" : ""}
                    />
                    {errors.username && (
                      <p className="text-xs text-red-500">{errors.username}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className={cn(
                          "pr-10",
                          errors.password ? "border-red-500" : "",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500">{errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Usuário *</Label>
                    {companyId ? (
                      <div className="flex items-center gap-2 h-9 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        <span>Empresas</span>
                        <span className="ml-auto text-xs text-slate-400">
                          Vinculado à empresa
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={newUser.account_type}
                        onValueChange={(value) => {
                          const roleByType: Record<string, string> = {
                            empresas: "company_admin",
                            agencias: "agency_admin",
                            nomades:  "nomad",
                            parceiro: "partner_admin",
                            lider:    "lider",
                            admin:    "admin",
                          };
                          setNewUser({
                            ...newUser,
                            account_type: value,
                            role: roleByType[value] || "company_user",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="empresas">Empresas</SelectItem>
                          <SelectItem value="agencias">Agências</SelectItem>
                          <SelectItem value="nomades">Nômades</SelectItem>
                          <SelectItem value="parceiro">Parceiro</SelectItem>
                          <SelectItem value="lider">Líder de Área</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {errors.account_type && (
                      <p className="text-xs text-red-500">
                        {errors.account_type}
                      </p>
                    )}
                  </div>
                  {!companyId &&
                    (newUser.account_type === "agencias" ||
                      newUser.account_type === "parceiro" ||
                      newUser.account_type === "empresas") && (
                      <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-500/10 p-3">
                        <Label>
                          Nome d
                          {newUser.account_type === "agencias"
                            ? "a Agência"
                            : newUser.account_type === "empresas"
                              ? "a Empresa"
                              : "o Parceiro"}{" "}
                          *
                        </Label>
                        <Input
                          placeholder="Nome da organização"
                          value={newUser.organizationName}
                          onChange={(e) =>
                            setNewUser({ ...newUser, organizationName: e.target.value })
                          }
                          className={errors.organizationName ? "border-red-500" : ""}
                        />
                        {errors.organizationName && (
                          <p className="text-xs text-red-500">{errors.organizationName}</p>
                        )}
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Este usuário será o administrador principal desta organização.
                        </p>
                      </div>
                    )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status da Conta *</Label>
                      <Select
                        value={newUser.is_active ? "ativo" : "inativo"}
                        onValueChange={(value) =>
                          setNewUser({
                            ...newUser,
                            is_active: value === "ativo",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="pausado">Pausado</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nível / Plano *</Label>
                      <Select
                        value={newUser.plan}
                        onValueChange={(value) =>
                          setNewUser({ ...newUser, plan: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* VÍNCULO COM EMPRESAS */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-sm text-slate-800">
                        Vínculo com Empresa(s)
                      </h3>
                    </div>

                    {/* No-link toggle */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="no-company-link"
                        checked={noCompanyLink}
                        onChange={(e) => {
                          setNoCompanyLink(e.target.checked);
                          if (e.target.checked) setLinkedCompanyIds([]);
                        }}
                        className="rounded"
                        disabled={!!companyId}
                      />
                      <label
                        htmlFor="no-company-link"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Sem vínculo com empresa
                      </label>
                    </div>

                    {!noCompanyLink && (
                      <div className="space-y-2">
                        {/* Search input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={companySearch}
                            onChange={(e) => {
                              setCompanySearch(e.target.value);
                              setCompanyDropdownOpen(true);
                            }}
                            onFocus={() => setCompanyDropdownOpen(true)}
                            disabled={!!companyId}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        {/* Dropdown list */}
                        {companyDropdownOpen && !companyId && (
                          <div className="border border-border rounded-md bg-popover max-h-40 overflow-y-auto shadow-sm">
                            {availableCompanies
                              .filter(
                                (c) =>
                                  c.name
                                    .toLowerCase()
                                    .includes(companySearch.toLowerCase()) &&
                                  !linkedCompanyIds.includes(c.id),
                              )
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setLinkedCompanyIds((prev) => [
                                      ...prev,
                                      c.id,
                                    ]);
                                    setCompanySearch("");
                                    setCompanyDropdownOpen(false);
                                  }}
                                >
                                  {c.name}
                                </button>
                              ))}
                            {availableCompanies.filter(
                              (c) =>
                                c.name
                                  .toLowerCase()
                                  .includes(companySearch.toLowerCase()) &&
                                !linkedCompanyIds.includes(c.id),
                            ).length === 0 && (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                Nenhuma empresa encontrada
                              </p>
                            )}
                          </div>
                        )}

                        {/* Selected tags */}
                        {linkedCompanyIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {linkedCompanyIds.map((id) => {
                              const co = availableCompanies.find(
                                (c) => c.id === id,
                              );
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs"
                                >
                                  {co?.name || id}
                                  {!companyId && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLinkedCompanyIds((prev) =>
                                          prev.filter((x) => x !== id),
                                        )
                                      }
                                      className="hover:text-red-500 transition-colors"
                                    >
                                      <XIcon className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {linkedCompanyIds.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Selecione ao menos uma empresa ou marque “Sem
                            vínculo”.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LGPD & Privacidade */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-sm text-slate-800">
                        LGPD &amp; Privacidade
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Base legal do tratamento</Label>
                        <Select
                          value={legalBasis}
                          onValueChange={setLegalBasis}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consent">
                              Consentimento (Art. 7º, I)
                            </SelectItem>
                            <SelectItem value="contract">
                              Execução de contrato (Art. 7º, V)
                            </SelectItem>
                            <SelectItem value="legitimate_interest">
                              Legítimo interesse (Art. 7º, IX)
                            </SelectItem>
                            <SelectItem value="legal_obligation">
                              Obrigação legal (Art. 7º, II)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <Checkbox
                          id="lgpd-consent"
                          checked={lgpdConsent}
                          onCheckedChange={(checked) =>
                            setLgpdConsent(!!checked)
                          }
                          className="mt-0.5"
                        />
                        <label
                          htmlFor="lgpd-consent"
                          className="text-xs text-slate-700 leading-relaxed cursor-pointer"
                        >
                          Li e aceito a{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline underline-offset-2"
                            onClick={(e) => e.preventDefault()}
                          >
                            Política de Privacidade
                          </a>{" "}
                          e os{" "}
                          <a
                            href="#"
                            className="text-blue-600 underline underline-offset-2"
                            onClick={(e) => e.preventDefault()}
                          >
                            Termos de Uso
                          </a>
                          , e autorizo o tratamento dos meus dados pessoais
                          conforme descrito. *
                        </label>
                      </div>
                      {errors.lgpd_consent && (
                        <p className="text-xs text-red-500">
                          {errors.lgpd_consent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-4">
                      Dados Pessoais
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input
                          placeholder="XXX.XXX.XXX-XX"
                          value={newUser.cpf}
                          onChange={(e) =>
                            setNewUser({ ...newUser, cpf: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={newUser.birth_date}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              birth_date: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-4">Contato</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="(11) 98765-4321"
                          value={newUser.phone}
                          onChange={(e) =>
                            setNewUser({ ...newUser, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp</Label>
                        <Input
                          placeholder="(11) 98765-4321"
                          value={newUser.whatsapp}
                          onChange={(e) =>
                            setNewUser({ ...newUser, whatsapp: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-4">Endereço</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                          placeholder="01310-100"
                          value={newUser.cep}
                          onChange={(e) =>
                            setNewUser({ ...newUser, cep: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rua</Label>
                        <Input
                          placeholder="Ex: Rua das Flores"
                          value={newUser.street}
                          onChange={(e) =>
                            setNewUser({ ...newUser, street: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Número</Label>
                          <Input
                            placeholder="123"
                            value={newUser.number}
                            onChange={(e) =>
                              setNewUser({ ...newUser, number: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cidade</Label>
                          <Input
                            placeholder="São Paulo"
                            value={newUser.city}
                            onChange={(e) =>
                              setNewUser({ ...newUser, city: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          placeholder="SP"
                          maxLength={2}
                          value={newUser.state}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              state: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-4">
                      Informações Adicionais
                    </h3>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="Notas sobre o usuário..."
                        value={newUser.notes}
                        onChange={(e) =>
                          setNewUser({ ...newUser, notes: e.target.value })
                        }
                        className="h-24"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: PERMISSÕES */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {companyId ? (
                    /* Created from within a company → show company-level permissions only */
                    <>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 space-y-1">
                        <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" />
                          Permissões na empresa
                          {companyName ? ` "${companyName}"` : ""}
                        </p>
                        <p className="text-xs text-blue-600">
                          Configure o que este usuário poderá fazer dentro da
                          empresa. As permissões da plataforma (painel admin,
                          financeiro, etc.) são gerenciadas separadamente pelo
                          admin da plataforma.
                        </p>
                      </div>

                      {(
                        Object.entries(companyPermissions) as [
                          keyof CompanyPermissions,
                          (typeof companyPermissions)[keyof CompanyPermissions],
                        ][]
                      ).map(([category, perms]) => (
                        <Card key={category} className="p-4">
                          <h3 className="font-semibold text-sm mb-3">
                            {category === "gestao"
                              ? "Gestão"
                              : category === "tasks"
                                ? "Tarefas"
                                : category === "projects"
                                  ? "Projetos"
                                  : "Usuários"}
                          </h3>
                          <div className="space-y-3">
                            {perms.map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between"
                              >
                                <Label
                                  htmlFor={`cp-${perm.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {perm.name}
                                </Label>
                                <Switch
                                  id={`cp-${perm.id}`}
                                  checked={perm.enabled}
                                  onCheckedChange={() =>
                                    toggleCompanyPermission(category, perm.id)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}

                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-500">
                          As permissões de plataforma deste usuário poderão ser
                          ajustadas pelo administrador da plataforma em{" "}
                          <strong>Admin → Usuários</strong>.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Created from platform admin → show platform permissions */
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Selecione as permissões para este usuário
                      </p>
                      {Object.entries(permissionsByCategory).map(
                        ([category, permissions]) => (
                          <Card key={category} className="p-4">
                            <h3 className="font-semibold text-sm mb-3">
                              {category}
                            </h3>
                            <div className="space-y-2">
                              {permissions.map((perm) => (
                                <div
                                  key={perm.id}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={perm.id}
                                    checked={newUser.permissions.includes(
                                      perm.id,
                                    )}
                                    onChange={() => togglePermission(perm.id)}
                                    className="rounded"
                                  />
                                  <label
                                    htmlFor={perm.id}
                                    className="text-sm cursor-pointer"
                                  >
                                    {perm.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ),
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Inline error — shown when creation fails, persists until next attempt */}
        {createError && (
          <div className="mx-4 mt-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 leading-snug">{createError}</p>
          </div>
        )}

        {/* Footer - FIXO */}
        <div
          className={`flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4 flex items-center ${currentStep === 1 ? "justify-start" : "justify-between"}`}
        >
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={currentStep === 1 ? "hidden" : ""}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {currentStep < 3 ? (
            <Button onClick={handleNextStep} className="btn-brand">
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateUser}
              disabled={isCreating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Check className="h-4 w-4 mr-1" />
              {isCreating ? "Criando..." : "Criar Usuário"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
