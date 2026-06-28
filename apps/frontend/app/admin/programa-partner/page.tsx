// @ts-nocheck
import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageHeader } from "@/components/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Send,
  Award,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Crown,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Eye,
  Mail,
  Phone,
  CalendarDays,
  Users,
  TrendingUp,
  X,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InviteStatus = "pending" | "accepted" | "declined" | "expired";
type PartnerLevel = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface PartnerInvite {
  id: string;
  agency_id: number;
  agency_name: string;
  agency_email: string;
  agency_location: string;
  sent_at: string;
  expires_at: string;
  status: InviteStatus;
  message?: string;
  accepted_at?: string;
  declined_at?: string;
  declined_reason?: string;
  sent_by: string;
}

interface ActivePartner {
  id: number;
  agency_name: string;
  agency_email: string;
  agency_location: string;
  program_level: PartnerLevel;
  is_partner: boolean;
  accepted_at: string;
  mrr: number;
  led_agencies: number;
  invite_id: string;
}

const LEVEL_CONFIG: Record<
  PartnerLevel,
  { label: string; icon: string; badge: string }
> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    badge: "bg-slate-100 text-slate-600 border-slate-300",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  platinum: {
    label: "Platinum",
    icon: "💎",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  diamond: {
    label: "Diamond",
    icon: "👑",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

const STATUS_CONFIG: Record<
  InviteStatus,
  { label: string; icon: any; badge: string }
> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  accepted: {
    label: "Aceito",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  declined: {
    label: "Recusado",
    icon: XCircle,
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  expired: {
    label: "Expirado",
    icon: Ban,
    badge: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

// Agencies that can be invited (tipo "agency" from empresas, not yet partner)
const AVAILABLE_AGENCIES = [
  {
    id: 4,
    name: "Agência Criativa Hub",
    email: "hello@criativahub.com.br",
    location: "Curitiba, PR",
  },
  {
    id: 7,
    name: "Studio Mídias Sociais",
    email: "studio@midiassociais.net",
    location: "Salvador, BA",
  },
  {
    id: 11,
    name: "Pixel & Cia Design",
    email: "arte@pixelecia.design",
    location: "Florianópolis, SC",
  },
  {
    id: 14,
    name: "MarcaForte Agência",
    email: "ola@marcaforteagencia.com.br",
    location: "Vitória, ES",
  },
];

const mockInvites: PartnerInvite[] = [
  {
    id: "inv-001",
    agency_id: 2,
    agency_name: "Starbucks Coffee",
    agency_email: "info@starbucks.com.br",
    agency_location: "Rio de Janeiro, RJ",
    sent_at: "2025-11-10",
    expires_at: "2025-12-10",
    status: "accepted",
    message:
      "Olá! Gostaríamos de convidar vocês para fazer parte do nosso Programa Partner. Vocês têm um excelente histórico de projetos e acreditamos que esta parceria será muito benéfica.",
    accepted_at: "2025-11-18",
    sent_by: "Administrador",
  },
  {
    id: "inv-002",
    agency_id: 17,
    agency_name: "Conecta Agências",
    agency_email: "parcerias@conectaagencias.com",
    agency_location: "Natal, RN",
    sent_at: "2026-01-05",
    expires_at: "2026-02-05",
    status: "accepted",
    message:
      "Sua agência tem demonstrado crescimento consistente. Gostaríamos de formalizar a parceria através do nosso Programa Partner.",
    accepted_at: "2026-01-12",
    sent_by: "Administrador",
  },
  {
    id: "inv-003",
    agency_id: 4,
    agency_name: "Agência Criativa Hub",
    agency_email: "hello@criativahub.com.br",
    agency_location: "Curitiba, PR",
    sent_at: "2026-02-20",
    expires_at: "2026-03-20",
    status: "declined",
    message:
      "Identificamos grande potencial na sua agência e gostaríamos de convidá-los para o Programa Partner.",
    declined_at: "2026-02-28",
    declined_reason:
      "No momento não temos capacidade de assumir mais responsabilidades.",
    sent_by: "Administrador",
  },
  {
    id: "inv-004",
    agency_id: 7,
    agency_name: "Studio Mídias Sociais",
    agency_email: "studio@midiassociais.net",
    agency_location: "Salvador, BA",
    sent_at: "2026-03-15",
    expires_at: "2026-04-15",
    status: "pending",
    message:
      "Acreditamos que o Studio Mídias Sociais tem o perfil ideal para nosso Programa Partner. Aguardamos sua resposta!",
    sent_by: "Administrador",
  },
  {
    id: "inv-005",
    agency_id: 11,
    agency_name: "Pixel & Cia Design",
    agency_email: "arte@pixelecia.design",
    agency_location: "Florianópolis, SC",
    sent_at: "2026-04-01",
    expires_at: "2026-05-01",
    status: "pending",
    message:
      "Sua agência está crescendo muito rápido e gostaríamos de tê-los como parceiros estratégicos.",
    sent_by: "Administrador",
  },
];

const mockPartners: ActivePartner[] = [
  {
    id: 2,
    agency_name: "Starbucks Coffee",
    agency_email: "info@starbucks.com.br",
    agency_location: "Rio de Janeiro, RJ",
    program_level: "silver",
    is_partner: true,
    accepted_at: "2025-11-18",
    mrr: 3200,
    led_agencies: 3,
    invite_id: "inv-001",
  },
  {
    id: 17,
    agency_name: "Conecta Agências",
    agency_email: "parcerias@conectaagencias.com",
    agency_location: "Natal, RN",
    program_level: "gold",
    is_partner: true,
    accepted_at: "2026-01-12",
    mrr: 7800,
    led_agencies: 8,
    invite_id: "inv-002",
  },
];

function StatusBadge({ status }: { status: InviteStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function LevelBadge({ level }: { level: PartnerLevel }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function ProgramaPartnerPage() {
  const { sidebarWidth } = useSidebar();
  const [invites, setInvites] = useState<PartnerInvite[]>(mockInvites);
  const [partners, setPartners] = useState<ActivePartner[]>(mockPartners);
  const [searchInvites, setSearchInvites] = useState("");
  const [searchPartners, setSearchPartners] = useState("");
  const [filterStatus, setFilterStatus] = useState<InviteStatus | "all">("all");
  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false);
  const [viewingInvite, setViewingInvite] = useState<PartnerInvite | null>(
    null,
  );
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    id: number;
    name: string;
  }>({ open: false, id: 0, name: "" });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const filteredInvites = invites.filter((inv) => {
    const q = searchInvites.toLowerCase();
    const matchSearch =
      !q ||
      inv.agency_name.toLowerCase().includes(q) ||
      inv.agency_email.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredPartners = partners.filter((p) => {
    const q = searchPartners.toLowerCase();
    return (
      !q ||
      p.agency_name.toLowerCase().includes(q) ||
      p.agency_email.toLowerCase().includes(q)
    );
  });

  const handleRevokePartner = (id: number) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
    setInvites((prev) =>
      prev.map((inv) =>
        partners.find((p) => p.id === id)?.invite_id === inv.id
          ? { ...inv, status: "expired" as InviteStatus }
          : inv,
      ),
    );
  };

  const handleCancelInvite = (id: string) => {
    setInvites((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: "expired" as InviteStatus } : inv,
      ),
    );
  };

  const handleResendInvite = (id: string) => {
    const today = new Date();
    const expires = new Date(today);
    expires.setDate(expires.getDate() + 30);
    setInvites((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status: "pending" as InviteStatus,
              sent_at: today.toISOString().split("T")[0],
              expires_at: expires.toISOString().split("T")[0],
            }
          : inv,
      ),
    );
  };

  const stats = {
    total_invites: invites.length,
    pending: invites.filter((i) => i.status === "pending").length,
    accepted: invites.filter((i) => i.status === "accepted").length,
    declined: invites.filter((i) => i.status === "declined").length,
    active_partners: partners.length,
  };

  return (
    <div className="space-y-6 pt-0">
      <PageHeader
        title="Programa Partner"
        description="Gerencie convites e parceiros ativos do Programa Partner de agências"
        actions={
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsInviteSheetOpen(true)}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Novo Convite
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo convite</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Convites Enviados",
            value: stats.total_invites,
            icon: Send,
            color: "from-blue-500 to-blue-700",
          },
          {
            label: "Pendentes",
            value: stats.pending,
            icon: Clock,
            color: "from-amber-400 to-orange-500",
          },
          {
            label: "Aceitos",
            value: stats.accepted,
            icon: CheckCircle2,
            color: "from-emerald-500 to-teal-600",
          },
          {
            label: "Recusados",
            value: stats.declined,
            icon: XCircle,
            color: "from-red-400 to-rose-600",
          },
          {
            label: "Partners Ativos",
            value: stats.active_partners,
            icon: Award,
            color: "from-violet-500 to-purple-700",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`rounded-xl bg-linear-to-br ${color} p-3 text-white shadow-sm`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-medium text-white/70">{label}</p>
              <div className="bg-white/20 rounded-md p-1">
                <Icon className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invites">
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="invites" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Convites
            {stats.pending > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Partners Ativos
            <span className="ml-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {stats.active_partners}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Convites Tab ─── */}
        <TabsContent value="invites" className="mt-4">
          <Card className="border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por agência ou e-mail..."
                  value={searchInvites}
                  onChange={(e) => setSearchInvites(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as any)}
              >
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="accepted">Aceito</SelectItem>
                  <SelectItem value="declined">Recusado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-400 shrink-0">
                {filteredInvites.length} convite
                {filteredInvites.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredInvites.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum convite encontrado</p>
                </div>
              )}
              {filteredInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  {/* Agency avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {invite.agency_name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  {/* Agency info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">
                      {invite.agency_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {invite.agency_email} · {invite.agency_location}
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Enviado{" "}
                      {new Date(invite.sent_at).toLocaleDateString("pt-BR")}
                    </span>
                    {invite.status === "pending" && (
                      <span className="text-amber-600 mt-0.5">
                        Expira{" "}
                        {new Date(invite.expires_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    )}
                    {invite.accepted_at && (
                      <span className="text-emerald-600 mt-0.5">
                        Aceito{" "}
                        {new Date(invite.accepted_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    )}
                    {invite.declined_at && (
                      <span className="text-red-500 mt-0.5">
                        Recusado{" "}
                        {new Date(invite.declined_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    <StatusBadge status={invite.status} />
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => setViewingInvite(invite)}
                        className="gap-2"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver detalhes
                      </DropdownMenuItem>
                      {(invite.status === "declined" ||
                        invite.status === "expired") && (
                        <DropdownMenuItem
                          onClick={() => handleResendInvite(invite.id)}
                          className="gap-2"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Reenviar convite
                        </DropdownMenuItem>
                      )}
                      {invite.status === "pending" && (
                        <DropdownMenuItem
                          onClick={() =>
                            setCancelDialog({
                              open: true,
                              id: invite.id,
                              name: invite.agency_name,
                            })
                          }
                          className="gap-2 text-red-600 focus:text-red-600"
                        >
                          <Ban className="h-3.5 w-3.5" /> Cancelar convite
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── Partners Ativos Tab ─── */}
        <TabsContent value="partners" className="mt-4">
          <Card className="border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar partner..."
                  value={searchPartners}
                  onChange={(e) => setSearchPartners(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {filteredPartners.length} partner
                {filteredPartners.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredPartners.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Crown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum partner ativo</p>
                </div>
              )}
              {filteredPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {partner.agency_name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800">
                        {partner.agency_name}
                      </p>
                      <LevelBadge level={partner.program_level} />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
                        <Award className="h-3 w-3" /> Partner
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {partner.agency_email} · {partner.agency_location}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">MRR</p>
                      <p className="text-sm font-semibold text-slate-700">
                        R$ {partner.mrr.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Ag. Lideradas</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {partner.led_agencies}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Partner desde</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {new Date(partner.accepted_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Revoke */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRevokeDialog({
                        open: true,
                        id: partner.id,
                        name: partner.agency_name,
                      })
                    }
                    className="shrink-0 h-8 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 gap-1.5"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Revogar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── New Invite Sheet ─── */}
      <Sheet open={isInviteSheetOpen} onOpenChange={setIsInviteSheetOpen}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 border-0"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <div className="h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-linear-to-r from-violet-50/50 to-indigo-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-linear-to-br from-violet-600 to-indigo-600 rounded-lg shadow">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-gray-900">
                    Novo Convite Partner
                  </SheetTitle>
                  <p className="text-xs text-gray-500">
                    Envie um convite para uma agência ingressar no Programa
                    Partner
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsInviteSheetOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <InviteForm
                availableAgencies={AVAILABLE_AGENCIES}
                onSend={(data) => {
                  const today = new Date();
                  const expires = new Date(today);
                  expires.setDate(expires.getDate() + data.expires_days);
                  const newInvite: PartnerInvite = {
                    id: `inv-${Date.now()}`,
                    agency_id: data.agency.id,
                    agency_name: data.agency.name,
                    agency_email: data.agency.email,
                    agency_location: data.agency.location,
                    sent_at: today.toISOString().split("T")[0],
                    expires_at: expires.toISOString().split("T")[0],
                    status: "pending",
                    message: data.message,
                    sent_by: "Administrador",
                  };
                  setInvites((prev) => [newInvite, ...prev]);
                  setIsInviteSheetOpen(false);
                }}
                onCancel={() => setIsInviteSheetOpen(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── View Invite Sheet ─── */}
      <Sheet
        open={!!viewingInvite}
        onOpenChange={(open) => !open && setViewingInvite(null)}
      >
        <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <SheetTitle className="text-base font-bold text-slate-800">
                Detalhes do Convite
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingInvite(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {viewingInvite && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold shadow">
                    {viewingInvite.agency_name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {viewingInvite.agency_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {viewingInvite.agency_location}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "E-mail",
                      value: viewingInvite.agency_email,
                      icon: Mail,
                    },
                    {
                      label: "Status",
                      node: <StatusBadge status={viewingInvite.status} />,
                      icon: Clock,
                    },
                    {
                      label: "Enviado em",
                      value: new Date(viewingInvite.sent_at).toLocaleDateString(
                        "pt-BR",
                      ),
                      icon: CalendarDays,
                    },
                    {
                      label: "Expira em",
                      value: new Date(
                        viewingInvite.expires_at,
                      ).toLocaleDateString("pt-BR"),
                      icon: CalendarDays,
                    },
                    ...(viewingInvite.accepted_at
                      ? [
                          {
                            label: "Aceito em",
                            value: new Date(
                              viewingInvite.accepted_at,
                            ).toLocaleDateString("pt-BR"),
                            icon: CheckCircle2,
                          },
                        ]
                      : []),
                    ...(viewingInvite.declined_at
                      ? [
                          {
                            label: "Recusado em",
                            value: new Date(
                              viewingInvite.declined_at,
                            ).toLocaleDateString("pt-BR"),
                            icon: XCircle,
                          },
                        ]
                      : []),
                    {
                      label: "Enviado por",
                      value: viewingInvite.sent_by,
                      icon: Users,
                    },
                  ].map(({ label, value, node, icon: Icon }) => (
                    <div
                      key={label}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="h-3 w-3 text-slate-400" />
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {label}
                        </p>
                      </div>
                      {node || (
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {viewingInvite.message && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Mensagem enviada
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {viewingInvite.message}
                    </p>
                  </div>
                )}

                {viewingInvite.declined_reason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-2">
                      Motivo da recusa
                    </p>
                    <p className="text-sm text-red-700 leading-relaxed">
                      {viewingInvite.declined_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmations */}
      <ConfirmationDialog
        open={revokeDialog.open}
        onClose={() => setRevokeDialog({ open: false, id: 0, name: "" })}
        onConfirm={() => {
          handleRevokePartner(revokeDialog.id);
          setRevokeDialog({ open: false, id: 0, name: "" });
        }}
        title="Revogar status Partner"
        message={`Tem certeza que deseja revogar o status Partner de "${revokeDialog.name}"? A agência perderá todos os benefícios associados.`}
        confirmText="Revogar"
        cancelText="Cancelar"
        destructive
      />
      <ConfirmationDialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false, id: "", name: "" })}
        onConfirm={() => {
          handleCancelInvite(cancelDialog.id);
          setCancelDialog({ open: false, id: "", name: "" });
        }}
        title="Cancelar convite"
        message={`Cancelar o convite enviado para "${cancelDialog.name}"?`}
        confirmText="Cancelar convite"
        cancelText="Voltar"
        destructive
      />
    </div>
  );
}

function InviteForm({
  availableAgencies,
  onSend,
  onCancel,
}: {
  availableAgencies: typeof AVAILABLE_AGENCIES;
  onSend: (data: any) => void;
  onCancel: () => void;
}) {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [message, setMessage] = useState(
    "Olá! Gostaríamos de convidar sua agência para fazer parte do nosso Programa Partner. Identificamos seu potencial e acreditamos que esta parceria trará grandes benefícios para ambas as partes. Aguardamos sua resposta!",
  );
  const [expiresDays, setExpiresDays] = useState("30");
  const [error, setError] = useState("");

  const selectedAgency = availableAgencies.find(
    (a) => String(a.id) === selectedAgencyId,
  );

  const handleSend = () => {
    if (!selectedAgencyId) {
      setError("Selecione uma agência");
      return;
    }
    if (!message.trim()) {
      setError("Adicione uma mensagem ao convite");
      return;
    }
    setError("");
    onSend({
      agency: selectedAgency,
      message: message.trim(),
      expires_days: Number(expiresDays),
    });
  };

  return (
    <div className="space-y-5">
      {/* Agency select */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Agência
        </p>
        <div className="space-y-2">
          {availableAgencies.map((agency) => (
            <label
              key={agency.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAgencyId === String(agency.id) ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <input
                type="radio"
                name="agency"
                value={String(agency.id)}
                checked={selectedAgencyId === String(agency.id)}
                onChange={() => {
                  setSelectedAgencyId(String(agency.id));
                  setError("");
                }}
                className="sr-only"
              />
              <div className="w-9 h-9 rounded-lg bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {agency.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">
                  {agency.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {agency.email} · {agency.location}
                </p>
              </div>
              {selectedAgencyId === String(agency.id) && (
                <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0" />
              )}
            </label>
          ))}
          {availableAgencies.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Todas as agências elegíveis já foram convidadas.
            </p>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      </div>

      {/* Message */}
      <div>
        <Label className="text-slate-700 text-sm font-medium">
          Mensagem do convite
        </Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="mt-1 border-slate-200 text-slate-900 resize-none text-sm"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          {message.length} caracteres
        </p>
      </div>

      {/* Expiry */}
      <div>
        <Label className="text-slate-700 text-sm font-medium">
          Prazo para resposta
        </Label>
        <Select value={expiresDays} onValueChange={setExpiresDays}>
          <SelectTrigger className="mt-1 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Info box */}
      <div className="flex gap-2.5 p-3 rounded-xl bg-violet-50 border border-violet-200">
        <Award className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
        <div className="text-xs text-violet-700 leading-relaxed">
          <p className="font-semibold mb-1">Como funciona o convite</p>
          <p>
            A agência receberá uma notificação no painel e um e-mail com os
            detalhes do Programa Partner. Ela poderá aceitar ou recusar dentro
            do prazo definido. Você poderá acompanhar o status aqui.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <Button
          onClick={handleSend}
          className="btn-brand gap-2"
          disabled={!selectedAgencyId}
        >
          <Send className="h-4 w-4" />
          Enviar convite
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-200 text-slate-600"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
