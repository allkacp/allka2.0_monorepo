// @ts-nocheck
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/contexts/sidebar-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Globe,
  Mail,
  Bell,
  Shield,
  Palette,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Users,
  Briefcase,
  Headphones,
  TrendingUp,
  Megaphone,
  GraduationCap,
  Link2,
  Link2Off,
  Webhook,
  Plus,
  Pencil,
  Trash2,
  TestTube2,
  Search,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  ExternalLink,
  Zap,
  LayoutGrid,
  ChevronRight,
  AlertCircle,
  FileText,
  Send,
  History,
  Settings,
  Phone,
  PhoneOff,
  UserPlus,
  X,
  Sliders,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  onSave,
  action,
}) {
  return (
    <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
        <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        {action}
        {onSave && (
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs shrink-0"
            onClick={onSave}
          >
            <Save className="h-3 w-3" /> Salvar
          </Button>
        )}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </Card>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatusPill({ connected }) {
  return connected ? (
    <Badge
      variant="outline"
      className="text-[9px] font-semibold h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
    >
      Conectado
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="text-[9px] font-semibold h-4 px-1.5 bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500"
    >
      Desconectado
    </Badge>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_EMAIL_BOXES = [
  {
    id: "1",
    label: "Suporte",
    email: "suporte@allka.com.br",
    description: "Atendimento a dúvidas e problemas técnicos",
    active: true,
  },
  {
    id: "2",
    label: "Financeiro",
    email: "financeiro@allka.com.br",
    description: "Cobranças, faturas e questões financeiras",
    active: true,
  },
  {
    id: "3",
    label: "Comercial",
    email: "comercial@allka.com.br",
    description: "Vendas, parcerias e oportunidades de negócio",
    active: true,
  },
  {
    id: "4",
    label: "No-Reply",
    email: "noreply@allka.com.br",
    description: "Emails automáticos da plataforma",
    active: true,
  },
  {
    id: "5",
    label: "Marketing",
    email: "marketing@allka.com.br",
    description: "Campanhas, newsletters e comunicações em massa",
    active: false,
  },
];

const INITIAL_WA_NUMBERS = [
  {
    id: "1",
    label: "Suporte",
    phone: "+55 11 9•••• 3210",
    type: "Business API",
    status: "connected",
    lastActivity: "há 2 min",
  },
  {
    id: "2",
    label: "Comercial / Vendas",
    phone: "+55 11 9•••• 7788",
    type: "Business API",
    status: "connected",
    lastActivity: "há 15 min",
  },
  {
    id: "3",
    label: "Campanhas em Massa",
    phone: "+55 11 9•••• 5544",
    type: "Business API",
    status: "disconnected",
    lastActivity: "Nunca usado",
  },
];

const INITIAL_ADMIN_AREAS = [
  {
    id: "suporte",
    label: "Suporte",
    icon: Headphones,
    color: "bg-blue-500",
    description: "Atendimento a dúvidas e problemas",
    users: [
      { name: "Ana Lima", email: "ana@allka.com.br" },
      { name: "Bruno Reis", email: "bruno@allka.com.br" },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: TrendingUp,
    color: "bg-emerald-500",
    description: "Cobranças, faturas e relatórios financeiros",
    users: [{ name: "Carla Matos", email: "carla@allka.com.br" }],
  },
  {
    id: "comercial",
    label: "Comercial",
    icon: Briefcase,
    color: "bg-amber-500",
    description: "Vendas, contratos e parcerias",
    users: [
      { name: "Daniel Costa", email: "daniel@allka.com.br" },
      { name: "Eduarda Silva", email: "edu@allka.com.br" },
    ],
  },
  {
    id: "tecnico",
    label: "Técnico",
    icon: Settings,
    color: "bg-violet-500",
    description: "Desenvolvimento, infra e integrações",
    users: [{ name: "Felipe Araujo", email: "felipe@allka.com.br" }],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    color: "bg-rose-500",
    description: "Campanhas, redes sociais e conteúdo",
    users: [],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: GraduationCap,
    color: "bg-cyan-500",
    description: "Treinamento e boas-vindas de novos usuários",
    users: [],
  },
];

const INITIAL_SOCIALS = [
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    connected: true,
    handle: "@allka.oficial",
    icon: Instagram,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    connected: true,
    handle: "allka-platform",
    icon: Linkedin,
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    connected: false,
    handle: "",
    icon: Facebook,
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    connected: false,
    handle: "",
    icon: Youtube,
  },
];

const INITIAL_WEBHOOKS = [
  {
    id: "1",
    name: "Bitrix24 — Novo Lead",
    url: "https://b24-xxx.bitrix24.com.br/rest/1/TOKEN/crm.lead.add",
    event: "user_registration",
    method: "POST",
    active: true,
    lastTriggered: "há 3 min",
  },
  {
    id: "2",
    name: "Slack — Projeto Criado",
    url: "https://hooks.slack.com/services/T00/B00/XXXX",
    event: "project_created",
    method: "POST",
    active: true,
    lastTriggered: "há 2 horas",
  },
  {
    id: "3",
    name: "Zapier — Pagamento",
    url: "https://hooks.zapier.com/hooks/catch/123456/abcde",
    event: "payment_confirmed",
    method: "POST",
    active: false,
    lastTriggered: "há 2 dias",
  },
];

const WEBHOOK_EVENTS = [
  { value: "user_registration", label: "Novo usuário cadastrado" },
  { value: "project_created", label: "Projeto criado" },
  { value: "project_completed", label: "Projeto concluído" },
  { value: "payment_confirmed", label: "Pagamento confirmado" },
  { value: "payment_overdue", label: "Pagamento em atraso" },
  { value: "task_completed", label: "Tarefa concluída" },
  { value: "nomade_qualified", label: "Nômade qualificado" },
  { value: "onboarding_done", label: "Onboarding concluído" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminConfiguracoesPage() {
  useSidebar();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Geral ──
  const [general, setGeneral] = useState({
    siteName: "ALLKA Platform",
    siteDescription: "Plataforma de gestão de projetos e tarefas",
    enableRegistration: true,
    maintenanceMode: false,
  });

  // ── Emails ──
  const [smtp, setSmtp] = useState({
    host: "",
    port: "587",
    user: "",
    password: "",
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [emailBoxes, setEmailBoxes] = useState(INITIAL_EMAIL_BOXES);
  const [editingBox, setEditingBox] = useState(null); // null | "new" | id
  const [boxForm, setBoxForm] = useState({
    label: "",
    email: "",
    description: "",
    active: true,
  });

  // ── WhatsApp ──
  const [waNumbers, setWaNumbers] = useState(INITIAL_WA_NUMBERS);
  const [waSearch, setWaSearch] = useState("");
  const [waFilter, setWaFilter] = useState("all");
  const [addingWa, setAddingWa] = useState(false);
  const [waForm, setWaForm] = useState({
    label: "",
    phone: "",
    type: "Business API",
  });

  // ── Equipe ──
  const [adminAreas, setAdminAreas] = useState(INITIAL_ADMIN_AREAS);
  const [addingUserArea, setAddingUserArea] = useState(null); // area id
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "" });

  // ── Integrações ──
  const [socials, setSocials] = useState(INITIAL_SOCIALS);
  const [webhooks, setWebhooks] = useState(INITIAL_WEBHOOKS);
  const [whSearch, setWhSearch] = useState("");
  const [addingWh, setAddingWh] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [whForm, setWhForm] = useState({
    name: "",
    url: "",
    event: "user_registration",
    method: "POST",
    active: true,
  });

  // ── Segurança ──
  const [security, setSecurity] = useState({
    requireEmailVerification: true,
    maxFileSize: 10,
    sessionTimeout: 30,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: false,
    minLength: 8,
  });

  // ── Aparência ──
  const [appearance, setAppearance] = useState({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
  });

  function save(section) {
    toast({ title: `${section} salvo com sucesso` });
  }

  // ── Email box handlers ──
  function openAddBox() {
    setBoxForm({ label: "", email: "", description: "", active: true });
    setEditingBox("new");
  }
  function openEditBox(b) {
    setBoxForm({
      label: b.label,
      email: b.email,
      description: b.description,
      active: b.active,
    });
    setEditingBox(b.id);
  }
  function cancelBox() {
    setEditingBox(null);
  }
  function saveBox() {
    if (!boxForm.label.trim() || !boxForm.email.trim()) {
      toast({ title: "Preencha label e e-mail", variant: "destructive" });
      return;
    }
    if (editingBox === "new") {
      setEmailBoxes((bs) => [...bs, { id: String(Date.now()), ...boxForm }]);
      toast({ title: "Caixa adicionada" });
    } else {
      setEmailBoxes((bs) =>
        bs.map((b) => (b.id === editingBox ? { ...b, ...boxForm } : b)),
      );
      toast({ title: "Caixa atualizada" });
    }
    setEditingBox(null);
  }
  function deleteBox(id) {
    setEmailBoxes((bs) => bs.filter((b) => b.id !== id));
    toast({ title: "Caixa removida" });
  }
  function toggleBox(id) {
    setEmailBoxes((bs) =>
      bs.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    );
  }

  // ── WA handlers ──
  const filteredWa = useMemo(() => {
    let arr = waNumbers;
    if (waFilter !== "all") arr = arr.filter((n) => n.status === waFilter);
    if (waSearch.trim()) {
      const q = waSearch.toLowerCase();
      arr = arr.filter(
        (n) => n.label.toLowerCase().includes(q) || n.phone.includes(q),
      );
    }
    return arr;
  }, [waNumbers, waFilter, waSearch]);

  function saveWa() {
    if (!waForm.label.trim() || !waForm.phone.trim()) {
      toast({ title: "Preencha label e número", variant: "destructive" });
      return;
    }
    setWaNumbers((ns) => [
      ...ns,
      {
        id: String(Date.now()),
        ...waForm,
        status: "disconnected",
        lastActivity: "Nunca usado",
      },
    ]);
    setWaForm({ label: "", phone: "", type: "Business API" });
    setAddingWa(false);
    toast({ title: "Número adicionado" });
  }
  function deleteWa(id) {
    setWaNumbers((ns) => ns.filter((n) => n.id !== id));
    toast({ title: "Número removido" });
  }
  function disconnectWa(id) {
    setWaNumbers((ns) =>
      ns.map((n) => (n.id === id ? { ...n, status: "disconnected" } : n)),
    );
    toast({ title: "Número desconectado" });
  }
  function testWa(n) {
    toast({
      title: `Testando ${n.label}…`,
      description: "Verificando conexão com a API do WhatsApp.",
    });
  }

  // ── Equipe handlers ──
  function saveUser(areaId) {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    setAdminAreas((as) =>
      as.map((a) =>
        a.id === areaId ? { ...a, users: [...a.users, { ...newUserForm }] } : a,
      ),
    );
    setNewUserForm({ name: "", email: "" });
    setAddingUserArea(null);
    toast({ title: "Usuário atribuído" });
  }
  function removeUser(areaId, email) {
    setAdminAreas((as) =>
      as.map((a) =>
        a.id === areaId
          ? { ...a, users: a.users.filter((u) => u.email !== email) }
          : a,
      ),
    );
    toast({ title: "Usuário removido da área" });
  }

  // ── Social handlers ──
  function toggleSocial(id) {
    setSocials((ss) =>
      ss.map((s) =>
        s.id === id
          ? {
              ...s,
              connected: !s.connected,
              handle: s.connected ? "" : s.handle || `@allka.${s.id}`,
            }
          : s,
      ),
    );
    const soc = socials.find((s) => s.id === id);
    toast({
      title: `${soc?.name} ${soc?.connected ? "desconectado" : "conectado"}`,
    });
  }

  // ── Webhook handlers ──
  const filteredWh = useMemo(() => {
    if (!whSearch.trim()) return webhooks;
    const q = whSearch.toLowerCase();
    return webhooks.filter(
      (w) =>
        w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q),
    );
  }, [webhooks, whSearch]);

  function openAddWh() {
    setWhForm({
      name: "",
      url: "",
      event: "user_registration",
      method: "POST",
      active: true,
    });
    setEditingWh(null);
    setAddingWh(true);
  }
  function openEditWh(w) {
    setWhForm({
      name: w.name,
      url: w.url,
      event: w.event,
      method: w.method,
      active: w.active,
    });
    setEditingWh(w.id);
    setAddingWh(true);
  }
  function cancelWh() {
    setAddingWh(false);
    setEditingWh(null);
  }
  function saveWh() {
    if (!whForm.name.trim() || !whForm.url.trim()) {
      toast({ title: "Preencha nome e URL", variant: "destructive" });
      return;
    }
    if (editingWh) {
      setWebhooks((ws) =>
        ws.map((w) => (w.id === editingWh ? { ...w, ...whForm } : w)),
      );
      toast({ title: "Webhook atualizado" });
    } else {
      setWebhooks((ws) => [
        ...ws,
        { id: String(Date.now()), ...whForm, lastTriggered: "Nunca disparado" },
      ]);
      toast({ title: "Webhook adicionado" });
    }
    setAddingWh(false);
    setEditingWh(null);
  }
  function deleteWh(id) {
    setWebhooks((ws) => ws.filter((w) => w.id !== id));
    toast({ title: "Webhook removido" });
  }
  function toggleWh(id) {
    setWebhooks((ws) =>
      ws.map((w) => (w.id === id ? { ...w, active: !w.active } : w)),
    );
  }
  function testWh(w) {
    toast({
      title: `Testando ${w.name}…`,
      description: `POST para ${w.url.slice(0, 40)}…`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gerencie as configurações gerais da plataforma
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-0.5 text-xs">
          <TabsTrigger value="general" className="text-xs px-3 h-8">
            Geral
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-xs px-3 h-8">
            Emails
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs px-3 h-8">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="equipe" className="text-xs px-3 h-8">
            Equipe
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs px-3 h-8">
            Integrações
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs px-3 h-8">
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs px-3 h-8">
            Segurança
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs px-3 h-8">
            Aparência
          </TabsTrigger>
        </TabsList>

        {/* ─── GERAL ─────────────────────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-4">
          <SectionCard
            icon={Globe}
            title="Informações da Plataforma"
            onSave={() => save("Configurações gerais")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome da Plataforma</Label>
                <Input
                  className="h-9 text-sm"
                  value={general.siteName}
                  onChange={(e) =>
                    setGeneral((g) => ({ ...g, siteName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                className="text-sm resize-none"
                rows={3}
                value={general.siteDescription}
                onChange={(e) =>
                  setGeneral((g) => ({ ...g, siteDescription: e.target.value }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard icon={Globe} title="Acesso e Operação">
            <ToggleRow
              label="Permitir Novos Cadastros"
              description="Usuários podem criar novas contas na plataforma"
              checked={general.enableRegistration}
              onCheckedChange={(v) => {
                setGeneral((g) => ({ ...g, enableRegistration: v }));
                toast({
                  title: `Cadastros ${v ? "habilitados" : "desabilitados"}`,
                });
              }}
            />
            <ToggleRow
              label="Modo de Manutenção"
              description="Desabilita o acesso de usuários temporariamente"
              checked={general.maintenanceMode}
              onCheckedChange={(v) => {
                setGeneral((g) => ({ ...g, maintenanceMode: v }));
                toast({
                  title: `Modo manutenção ${v ? "ativado" : "desativado"}`,
                });
              }}
            />
          </SectionCard>
        </TabsContent>

        {/* ─── EMAILS ────────────────────────────────────────────────────────── */}
        <TabsContent value="emails" className="space-y-4">
          {/* Caixas de e-mail */}
          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <Mail className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  Caixas de E-mail
                </h3>
                <p className="text-xs text-slate-400">
                  Endereços por finalidade — usados nos envios automáticos da
                  plataforma
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs shrink-0"
                onClick={openAddBox}
              >
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>

            {/* Add / Edit form */}
            {editingBox && (
              <div className="px-5 py-4 border-b border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/15 space-y-3">
                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {editingBox === "new" ? "Nova caixa" : "Editar caixa"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Label <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ex: Suporte"
                      value={boxForm.label}
                      onChange={(e) =>
                        setBoxForm((f) => ({ ...f, label: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">
                      E-mail <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      className="h-8 text-xs"
                      placeholder="suporte@allka.com.br"
                      value={boxForm.email}
                      onChange={(e) =>
                        setBoxForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-[11px]">Descrição</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Para que serve este endereço?"
                      value={boxForm.description}
                      onChange={(e) =>
                        setBoxForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveBox}>
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={cancelBox}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emailBoxes.map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 px-5 py-3 text-xs ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {b.label}
                      </span>
                      <span className="text-slate-400">{b.email}</span>
                    </div>
                    {b.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {b.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={b.active}
                    onCheckedChange={() => toggleBox(b.id)}
                    className="shrink-0"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => openEditBox(b)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteBox(b.id)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
              <p className="text-[10px] text-slate-400">
                {emailBoxes.filter((b) => b.active).length} ativas ·{" "}
                {emailBoxes.length} total
              </p>
            </div>
          </Card>

          {/* SMTP */}
          <SectionCard
            icon={Settings}
            title="Configurações SMTP"
            description="Servidor de envio de emails"
            onSave={() => save("SMTP")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Servidor SMTP</Label>
                <Input
                  placeholder="smtp.example.com"
                  className="h-9 text-sm"
                  value={smtp.host}
                  onChange={(e) =>
                    setSmtp((s) => ({ ...s, host: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Porta</Label>
                <Input
                  type="number"
                  placeholder="587"
                  className="h-9 text-sm"
                  value={smtp.port}
                  onChange={(e) =>
                    setSmtp((s) => ({ ...s, port: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário SMTP</Label>
                <Input
                  placeholder="user@example.com"
                  className="h-9 text-sm"
                  value={smtp.user}
                  onChange={(e) =>
                    setSmtp((s) => ({ ...s, user: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha SMTP</Label>
                <div className="relative">
                  <Input
                    type={showSmtpPass ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-9 text-sm pr-9"
                    value={smtp.password}
                    onChange={(e) =>
                      setSmtp((s) => ({ ...s, password: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSmtpPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => toast({ title: "Teste de email enviado!" })}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Testar Configuração
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── WHATSAPP ──────────────────────────────────────────────────────── */}
        <TabsContent value="whatsapp" className="space-y-4">
          {/* info banner */}
          <Card className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                  WhatsApp Business
                </p>
                <p className="text-[11px] text-green-600 dark:text-green-400 leading-relaxed">
                  Configure múltiplos números para segmentar comunicações:
                  suporte, vendas, campanhas em massa. Integração via Meta
                  Business API ou conector Redrive CRM (configurado na aba
                  Sistema).
                </p>
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar número…"
                  className="pl-9 h-9 text-sm w-full"
                  value={waSearch}
                  onChange={(e) => setWaSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                {filteredWa.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {waNumbers.length}
                </span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { key: "all", label: "Todos" },
                  { key: "connected", label: "Conectados", dot: "#10b981" },
                  {
                    key: "disconnected",
                    label: "Desconectados",
                    dot: "#94a3b8",
                  },
                ].map(({ key, label, dot }) => {
                  const active = waFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setWaFilter(key)}
                      style={
                        active && dot
                          ? {
                              background: dot,
                              border: `2px solid ${dot}`,
                              color: "#fff",
                              boxShadow: `0 2px 10px ${dot}55`,
                            }
                          : {}
                      }
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                        active && !dot
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                          : active
                            ? ""
                            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {dot && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            display: "inline-block",
                            background: active ? "rgba(255,255,255,0.7)" : dot,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs shrink-0"
                onClick={() => setAddingWa(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {/* Add form */}
            {addingWa && (
              <div className="px-5 py-4 border-b border-dashed border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-950/15 space-y-3">
                <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                  Novo número
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Label <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ex: Suporte"
                      value={waForm.label}
                      onChange={(e) =>
                        setWaForm((f) => ({ ...f, label: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Número <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="+55 11 9xxxx-xxxx"
                      value={waForm.phone}
                      onChange={(e) =>
                        setWaForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Tipo</Label>
                    <Select
                      value={waForm.type}
                      onValueChange={(v) =>
                        setWaForm((f) => ({ ...f, type: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Business API">
                          Business API
                        </SelectItem>
                        <SelectItem value="Pessoal">Pessoal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveWa}>
                    Adicionar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setAddingWa(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWa.length === 0 && (
                <p className="px-5 py-8 text-xs text-slate-400 text-center">
                  Nenhum número encontrado.
                </p>
              )}
              {filteredWa.map((n, i) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 px-5 py-3 text-xs ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}
                >
                  <div className="h-7 w-7 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {n.label}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {n.phone}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1.5 text-slate-400 border-slate-200 dark:border-slate-700"
                      >
                        {n.type}
                      </Badge>
                      <StatusPill connected={n.status === "connected"} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Última atividade: {n.lastActivity}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => testWa(n)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500 transition-colors"
                      title="Testar"
                    >
                      <TestTube2 className="h-3 w-3" />
                    </button>
                    {n.status === "connected" && (
                      <button
                        onClick={() => disconnectWa(n.id)}
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 transition-colors"
                        title="Desconectar"
                      >
                        <PhoneOff className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteWa(n.id)}
                      className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center gap-4">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: "#10b981",
                  }}
                />
                {waNumbers.filter((n) => n.status === "connected").length}{" "}
                Conectados
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: "#94a3b8",
                  }}
                />
                {waNumbers.filter((n) => n.status === "disconnected").length}{" "}
                Desconectados
              </span>
            </div>
          </Card>
        </TabsContent>

        {/* ─── EQUIPE ────────────────────────────────────────────────────────── */}
        <TabsContent value="equipe" className="space-y-4">
          <p className="text-xs text-slate-400">
            Defina quais administradores são responsáveis por cada área da
            plataforma.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminAreas.map((area) => {
              const AreaIcon = area.icon;
              return (
                <Card
                  key={area.id}
                  className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
                    <div className={`p-1.5 rounded-lg ${area.color} shrink-0`}>
                      <AreaIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        {area.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {area.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {area.users.length} usuário
                      {area.users.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {area.users.length === 0 && (
                      <p className="text-[11px] text-slate-400 py-1">
                        Nenhum usuário atribuído.
                      </p>
                    )}
                    {area.users.map((u) => (
                      <div
                        key={u.email}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                      >
                        <div className="h-6 w-6 rounded-full bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-white">
                            {u.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                        <button
                          onClick={() => removeUser(area.id, u.email)}
                          className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {addingUserArea === area.id ? (
                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <Input
                          className="h-7 text-xs"
                          placeholder="Nome"
                          value={newUserForm.name}
                          onChange={(e) =>
                            setNewUserForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                        />
                        <Input
                          type="email"
                          className="h-7 text-xs"
                          placeholder="e-mail"
                          value={newUserForm.email}
                          onChange={(e) =>
                            setNewUserForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2 flex-1"
                            onClick={() => saveUser(area.id)}
                          >
                            Atribuir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setAddingUserArea(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingUserArea(area.id);
                          setNewUserForm({ name: "", email: "" });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <UserPlus className="h-3 w-3" /> Atribuir usuário
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── INTEGRAÇÕES ───────────────────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-4">
          {/* Redes Sociais */}
          <SectionCard
            icon={Globe}
            title="Redes Sociais"
            description="Conecte as contas oficiais da ALLKA para publicação e analytics"
          >
            <div className="space-y-2">
              {socials.map((s) => {
                const SIcon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: s.color }}
                    >
                      <SIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {s.name}
                        </span>
                        <StatusPill connected={s.connected} />
                      </div>
                      {s.connected && s.handle && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {s.handle}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={s.connected ? "outline" : "default"}
                      className="h-7 text-xs gap-1.5 shrink-0"
                      onClick={() => toggleSocial(s.id)}
                    >
                      {s.connected ? (
                        <>
                          <Link2Off className="h-3 w-3" /> Desconectar
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3 w-3" /> Conectar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * Integração OAuth em desenvolvimento. Conectar/desconectar
              simulado.
            </p>
          </SectionCard>

          {/* Webhooks */}
          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <Webhook className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  Webhooks
                </h3>
                <p className="text-xs text-slate-400">
                  Disparos automáticos para outras plataformas (Bitrix, Zapier,
                  Make, Slack…)
                </p>
              </div>
              <div className="relative min-w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <Input
                  placeholder="Buscar…"
                  className="pl-8 h-8 text-xs w-full"
                  value={whSearch}
                  onChange={(e) => setWhSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                {filteredWh.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {webhooks.length}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs shrink-0"
                onClick={openAddWh}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {/* Add / Edit form */}
            {addingWh && (
              <div className="px-5 py-4 border-b border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/15 space-y-3">
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                  {editingWh ? "Editar webhook" : "Novo webhook"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Ex: Bitrix24 — Novo Lead"
                      value={whForm.name}
                      onChange={(e) =>
                        setWhForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Evento disparador</Label>
                    <Select
                      value={whForm.event}
                      onValueChange={(v) =>
                        setWhForm((f) => ({ ...f, event: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEBHOOK_EVENTS.map((ev) => (
                          <SelectItem key={ev.value} value={ev.value}>
                            {ev.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">
                      URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      placeholder="https://hooks.example.com/…"
                      value={whForm.url}
                      onChange={(e) =>
                        setWhForm((f) => ({ ...f, url: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Método</Label>
                    <Select
                      value={whForm.method}
                      onValueChange={(v) =>
                        setWhForm((f) => ({ ...f, method: v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch
                      checked={whForm.active}
                      onCheckedChange={(v) =>
                        setWhForm((f) => ({ ...f, active: v }))
                      }
                    />
                    <Label className="text-xs">Ativo</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveWh}>
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={cancelWh}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWh.length === 0 && (
                <p className="px-5 py-8 text-xs text-slate-400 text-center">
                  Nenhum webhook encontrado.
                </p>
              )}
              {filteredWh.map((w, i) => {
                const ev = WEBHOOK_EVENTS.find((e) => e.value === w.event);
                return (
                  <div
                    key={w.id}
                    className={`flex items-center gap-3 px-5 py-3 text-xs ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}
                  >
                    <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
                      <Zap className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {w.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 text-slate-400 border-slate-200 font-mono"
                        >
                          {w.method}
                        </Badge>
                        {ev && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400"
                          >
                            {ev.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                        {w.url}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Último disparo: {w.lastTriggered}
                      </p>
                    </div>
                    <Switch
                      checked={w.active}
                      onCheckedChange={() => toggleWh(w.id)}
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => testWh(w)}
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500 transition-colors"
                        title="Testar"
                      >
                        <TestTube2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => openEditWh(w)}
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteWh(w.id)}
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center gap-4">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: "#8b5cf6",
                  }}
                />
                {webhooks.filter((w) => w.active).length} Ativos
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: "#94a3b8",
                  }}
                />
                {webhooks.filter((w) => !w.active).length} Inativos
              </span>
              <p className="ml-auto text-[10px] text-slate-400 italic">
                * Webhooks disparam automaticamente no evento configurado, sem
                necessidade de código.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ─── NOTIFICAÇÕES ──────────────────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Status resumido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Automações ativas", value: "5", icon: Zap, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
              { label: "Modelos de mensagem", value: "12", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Enviadas hoje", value: "248", icon: Send, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
              { label: "Falhas hoje", value: "2", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* O que é + acesso direto */}
          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 shrink-0">
                <Bell className="h-5 w-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Central de Notificações</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automações, modelos de mensagem e pré-configurações por tipo de usuário</p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0 btn-brand border-0" onClick={() => navigate("/admin/notifications")}>
                Abrir <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Sliders, label: "Pré-configurações", desc: "Defina quais notificações cada tipo de usuário recebe por padrão", tab: "defaults", color: "text-indigo-500", bg: "bg-indigo-50" },
                { icon: Zap, label: "Automações", desc: "Regras de disparo automático por evento, data ou condição", tab: "rules", color: "text-violet-500", bg: "bg-violet-50" },
                { icon: FileText, label: "Modelos", desc: "Mensagens com variáveis dinâmicas por canal (e-mail, WhatsApp, push)", tab: "messages", color: "text-blue-500", bg: "bg-blue-50" },
              ].map(({ icon: Icon, label, desc, tab, color, bg }) => (
                <button key={tab} onClick={() => navigate("/admin/notifications")}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 transition-all text-left group">
                  <div className={`p-1.5 rounded-lg ${bg} dark:bg-slate-800 shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── SEGURANÇA ─────────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-4">
          <SectionCard
            icon={Shield}
            title="Autenticação e Acesso"
            onSave={() => save("Segurança")}
          >
            <ToggleRow
              label="Verificação de Email Obrigatória"
              description="Usuários devem verificar email antes de acessar a plataforma"
              checked={security.requireEmailVerification}
              onCheckedChange={(v) =>
                setSecurity((s) => ({ ...s, requireEmailVerification: v }))
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Tamanho Máximo de Arquivo (MB)
                </Label>
                <Input
                  type="number"
                  className="h-9 text-sm"
                  value={security.maxFileSize}
                  onChange={(e) =>
                    setSecurity((s) => ({
                      ...s,
                      maxFileSize: parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timeout de Sessão (minutos)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm"
                  value={security.sessionTimeout}
                  onChange={(e) =>
                    setSecurity((s) => ({
                      ...s,
                      sessionTimeout: parseInt(e.target.value) || 30,
                    }))
                  }
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Shield}
            title="Políticas de Senha"
            onSave={() => save("Políticas de senha")}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-700 dark:text-slate-200">
                  Comprimento mínimo: {security.minLength} caracteres
                </Label>
                <input
                  type="range"
                  min={6}
                  max={20}
                  value={security.minLength}
                  onChange={(e) =>
                    setSecurity((s) => ({
                      ...s,
                      minLength: parseInt(e.target.value),
                    }))
                  }
                  className="w-24 accent-blue-500"
                />
              </div>
              <ToggleRow
                label="Exigir Letras Maiúsculas e Minúsculas"
                checked={security.requireUppercase}
                onCheckedChange={(v) =>
                  setSecurity((s) => ({ ...s, requireUppercase: v }))
                }
              />
              <ToggleRow
                label="Exigir Números"
                checked={security.requireNumbers}
                onCheckedChange={(v) =>
                  setSecurity((s) => ({ ...s, requireNumbers: v }))
                }
              />
              <ToggleRow
                label="Exigir Caracteres Especiais"
                checked={security.requireSpecial}
                onCheckedChange={(v) =>
                  setSecurity((s) => ({ ...s, requireSpecial: v }))
                }
              />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─── APARÊNCIA ─────────────────────────────────────────────────────── */}
        <TabsContent value="appearance" className="space-y-4">
          <SectionCard
            icon={Palette}
            title="Cores da Plataforma"
            onSave={() => save("Aparência")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { key: "primaryColor", label: "Cor Primária" },
                { key: "secondaryColor", label: "Cor Secundária" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={appearance[key]}
                      onChange={(e) =>
                        setAppearance((a) => ({ ...a, [key]: e.target.value }))
                      }
                      className="h-10 w-12 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <Input
                      className="h-9 text-sm font-mono"
                      value={appearance[key]}
                      onChange={(e) =>
                        setAppearance((a) => ({ ...a, [key]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setAppearance({
                    primaryColor: "#3B82F6",
                    secondaryColor: "#10B981",
                  });
                  toast({ title: "Cores restauradas" });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
              </Button>
            </div>
          </SectionCard>

          <SectionCard icon={Palette} title="Logo da Plataforma">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center gap-3 text-slate-400">
              <Palette className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                Clique para fazer upload ou arraste uma imagem
              </p>
              <p className="text-xs">PNG, JPG ou SVG · Máx 2MB</p>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Escolher arquivo
              </Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
