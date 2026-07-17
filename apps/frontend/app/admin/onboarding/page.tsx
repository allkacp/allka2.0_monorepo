// @ts-nocheck
import { useState, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NeonBadge } from "@/components/neon-badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { ExportButton } from "@/components/export-button";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import {
  Rocket, Plus, Pencil, Trash2, Eye, GripVertical, FileText, Video,
  ImageIcon, CheckCircle2, Users, Building2, UserCheck, Briefcase,
  ArrowUp, ArrowDown, Play, LayoutList, ToggleLeft, ToggleRight, Check,
  ClipboardCheck, Trophy, AlertCircle, X, BarChart2, TrendingDown,
  Clock, UserX, ChevronRight, Link2, AlignLeft, Film, Download, ChevronDown, Search,
} from "lucide-react";

// === Constants ================================================================

const ALL_ACCOUNT_TYPES = ["admin", "company", "agency", "nomad"];

const ACCOUNT_TYPE_ICONS  = { admin: Users, company: Building2, agency: Briefcase, nomad: UserCheck };
const ACCOUNT_TYPE_LABELS = { admin: "Admin", company: "Empresa", agency: "Agencia", nomad: "Nomade" };
const ACCOUNT_TYPE_COLORS = {
  admin:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  company: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  agency:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  nomad:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
};
const ACCOUNT_TYPE_BADGE_COLOR = { admin: "violet", company: "blue", agency: "amber", nomad: "emerald" };
const ACCOUNT_TYPE_PILL_ACTIVE = {
  admin:   "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-700",
  company: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
  agency:  "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
  nomad:   "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
};
const ACCOUNT_TYPE_GRADIENTS = {
  admin:   "from-violet-500 to-purple-600",
  company: "from-blue-500 to-cyan-600",
  agency:  "from-amber-500 to-orange-600",
  nomad:   "from-emerald-500 to-teal-600",
};

const CONTENT_ICONS  = { slide: FileText, video: Video, text: ImageIcon, quiz: ClipboardCheck };
const CONTENT_LABELS = { slide: "Slide", video: "Video", text: "Texto", quiz: "Teste" };
const CONTENT_COLORS = {
  slide: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  video: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  text:  "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400",
  quiz:  "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
};
const CONTENT_BADGE_COLOR = { slide: "blue", video: "rose", text: "slate", quiz: "purple" };

// ─── shared icon-button recipe (docs/padrao-tabela-empresas.md) ────────────
// Square, only-icon action button: thin border at rest, brand-gradient fill
// + white icon + slight lift on hover.
const ICON_BTN =
  "flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150";

function IconActionButton({ icon: Icon, tooltip, onClick, tone = "text-slate-400", size = 26, iconSize = "h-3.5 w-3.5", disabled = false }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      style={{ height: size, width: size }}
      className={`${ICON_BTN} ${tone} dark:text-slate-500 disabled:opacity-30 disabled:pointer-events-none disabled:hover:translate-y-0`}
    >
      <Icon className={iconSize} />
    </button>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

// === Analytics mock data =====================================================

const MOCK_USER_NAMES = [
  "Ana Souza", "Bruno Lima", "Carla Matos", "Daniel Reis", "Eduarda Costa",
  "Felipe Araujo", "Gabriela Nunes", "Henrique Faria", "Isabela Pinto", "Joao Mendes",
  "Karen Vieira", "Lucas Rocha", "Mariana Alves", "Nicolas Teixeira", "Olivia Ferreira",
  "Paulo Santos", "Quenia Barbosa", "Rafael Moreira", "Sabrina Gomes", "Thiago Cardoso",
];

function genAnalytics(circuitId, totalUsers) {
  const seed = parseInt(circuitId) * 13;
  const users = Array.from({ length: Math.min(totalUsers, 20) }, (_, i) => {
    const pct = Math.min(100, Math.max(5, ((seed * (i + 3)) % 97) + 3));
    const minWatched = Math.round((pct / 100) * ((seed * (i + 7)) % 18 + 4));
    const status = pct >= 100 ? "completed" : pct >= 50 ? "in-progress" : pct < 30 ? "dropped" : "in-progress";
    return { id: `u${circuitId}-${i}`, name: MOCK_USER_NAMES[i % MOCK_USER_NAMES.length], pct, minWatched, status };
  });
  const views = totalUsers;
  const at30  = Math.round((users.filter(u => u.pct >= 30).length  / users.length) * 100);
  const at50  = Math.round((users.filter(u => u.pct >= 50).length  / users.length) * 100);
  const at100 = Math.round((users.filter(u => u.pct >= 100).length / users.length) * 100);
  const dropout = Math.round((users.filter(u => u.pct < 30).length / users.length) * 100);
  return { views, at30, at50, at100, dropout, users };
}

const ANALYTICS_DATA = {
  "1": genAnalytics("1", 23),
  "2": genAnalytics("2", 156),
  "3": genAnalytics("3", 45),
  "4": genAnalytics("4", 234),
};

// === Helpers ==================================================================

function resolveGrad(accountTypes) {
  if (!accountTypes || accountTypes.length === 0) return "from-blue-500 to-violet-600";
  if (accountTypes.includes("all") || accountTypes.length > 1) return "from-blue-500 to-violet-600";
  return ACCOUNT_TYPE_GRADIENTS[accountTypes[0]] ?? "from-blue-500 to-violet-600";
}
function resolveIcon(accountTypes) {
  if (!accountTypes || accountTypes.length === 0 || accountTypes.includes("all") || accountTypes.length > 1) return Users;
  return ACCOUNT_TYPE_ICONS[accountTypes[0]] ?? Users;
}
function isAll(accountTypes) {
  return !accountTypes || accountTypes.includes("all") || accountTypes.length === 4;
}

// === Seed data ================================================================

const INITIAL_CIRCUITS = [
  {
    id: "1", name: "Boas-vindas Admin", accountTypes: ["admin"],
    description: "Circuito de onboarding para administradores do sistema",
    elements: [
      { id: "e1", type: "slide", title: "Bem-vindo ao ALLKA",   content: "Introducao ao sistema",        order: 1 },
      { id: "e2", type: "video", title: "Tour pela plataforma", content: "https://...", duration: 180,   order: 2 },
      { id: "e3", type: "text",  title: "Primeiros passos",     content: "Guia de configuracao inicial", order: 3 },
      {
        id: "e10", type: "quiz", title: "Teste de Conhecimentos", order: 4,
        minScore: 70,
        questions: [
          { id: "q1", text: "Qual e o principal objetivo da plataforma ALLKA?",
            options: ["Gerenciar projetos e equipes", "Vender produtos fisicos", "Controlar estoque", "Emitir notas fiscais"], correct: 0 },
          { id: "q2", text: "Quem pode acessar o painel de Onboarding?",
            options: ["Apenas nomades", "Apenas empresas", "Administradores do sistema", "Qualquer usuario"], correct: 2 },
        ],
      },
    ],
    isActive: true, completionRate: 87, totalUsers: 23,
  },
  {
    id: "2", name: "Onboarding Empresas", accountTypes: ["company"],
    description: "Circuito de onboarding para empresas clientes",
    elements: [
      { id: "e4", type: "slide", title: "Bem-vindo",           content: "Introducao para empresas", order: 1 },
      { id: "e5", type: "video", title: "Como criar projetos", content: "https://...", duration: 240, order: 2 },
    ],
    isActive: true, completionRate: 92, totalUsers: 156,
  },
  {
    id: "3", name: "Onboarding Geral", accountTypes: ["company", "agency", "nomad"],
    description: "Circuito geral para empresas, agencias e nomades",
    elements: [
      { id: "e6", type: "slide", title: "Bem-vindo",        content: "Introducao geral", order: 1 },
      { id: "e7", type: "text",  title: "Primeiros passos", content: "Guia de inicio",   order: 2 },
    ],
    isActive: true, completionRate: 78, totalUsers: 45,
  },
  {
    id: "4", name: "Onboarding Nomades", accountTypes: ["nomad"],
    description: "Circuito de onboarding para profissionais nomades",
    elements: [
      { id: "e8", type: "video", title: "Como funciona",          content: "https://...", duration: 300, order: 1 },
      { id: "e9", type: "slide", title: "Suas primeiras tarefas", content: "Guia inicial",               order: 2 },
    ],
    isActive: true, completionRate: 95, totalUsers: 234,
  },
];

// === CompletionBar ============================================================

function CompletionBar({ pct }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1 shrink-0">
        <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
    </div>
  );
}

// === MiniProgressBar (reusable for analytics) =================================

function MiniBar({ pct, colorClass }) {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// === CircuitAnalyticsSheet ====================================================

function CircuitAnalyticsSheet({ open, circuit, analytics, onClose }) {
  const grad = circuit ? resolveGrad(circuit.accountTypes) : "from-blue-500 to-violet-600";

  // "dropped" = pct < 30; "completed" = pct >= 100; otherwise "in-progress"
  const STATUS_LABEL  = { completed: "Completo", "in-progress": "Em andamento", dropped: "Desistiu" };
  const STATUS_BADGE_COLOR = { completed: "emerald", "in-progress": "blue", dropped: "red" };

  if (!circuit || !analytics) return null;

  const kpis = [
    { label: "Visualizacoes", value: analytics.views, icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Taxa Desistencia", value: `${analytics.dropout}%`, icon: TrendingDown,
      color: analytics.dropout > 30 ? "text-red-500" : analytics.dropout > 15 ? "text-amber-500" : "text-emerald-500",
      bg: analytics.dropout > 30 ? "bg-red-50 dark:bg-red-950/30" : analytics.dropout > 15 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "30% assistido",   value: `${analytics.at30}%`,  icon: ChevronRight, color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "50% assistido",   value: `${analytics.at50}%`,  icon: ChevronRight, color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "100% concluido",  value: `${analytics.at100}%`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  ];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent hideOverlay className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        {/* Header */}
        <div className={`shrink-0 bg-linear-to-br ${grad} px-5 pt-5 pb-4`}>
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold text-white leading-tight">
                Analytics &mdash; {circuit.name}
              </SheetTitle>
              <p className="text-[11px] text-white/70 mt-0.5 leading-tight truncate">
                {circuit.description}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 bg-white/20 text-white border-white/30 text-[10px] font-semibold h-5 px-2">
              {analytics.views} usuarios
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kpis.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label}
                className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${bg} shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5 truncate">{label}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Completion funnel */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Funil de conclusao
              </p>
            </div>
            <div className="px-4 py-4 space-y-3">
              {[
                { label: "Visualizaram (iniciaram)",  value: analytics.views,  pct: 100,            color: "bg-blue-500" },
                { label: "Chegaram a 30%",             value: Math.round(analytics.views * analytics.at30  / 100), pct: analytics.at30,  color: "bg-amber-400" },
                { label: "Chegaram a 50%",             value: Math.round(analytics.views * analytics.at50  / 100), pct: analytics.at50,  color: "bg-orange-400" },
                { label: "Concluiram 100%",            value: Math.round(analytics.views * analytics.at100 / 100), pct: analytics.at100, color: "bg-emerald-500" },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {value} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <MiniBar pct={pct} colorClass={color} />
                </div>
              ))}
              {/* Dropout highlight */}
              <div className={`flex items-center gap-2.5 mt-1 px-3 py-2 rounded-lg border
                ${analytics.dropout > 30
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"}`}>
                <UserX className={`h-3.5 w-3.5 shrink-0 ${analytics.dropout > 30 ? "text-red-500" : "text-slate-400"}`} />
                <span className={`text-xs ${analytics.dropout > 30 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  <strong>{analytics.dropout}%</strong> dos usuarios desistiram antes de completar 30% do circuito
                  {analytics.dropout > 30 && " — atencao recomendada"}
                </span>
              </div>
            </div>
          </div>

          {/* User list */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Usuarios ({analytics.users.length})
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> min. assistidos</span>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_56px_80px] gap-2 px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Usuario</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-right">Progresso</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-center">Min.</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-right">Status</span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {analytics.users.map((u, i) => {
                const barColor = u.pct >= 100 ? "bg-emerald-500" : u.pct >= 50 ? "bg-blue-500" : u.pct >= 30 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={u.id}
                    className={`grid grid-cols-[1fr_80px_56px_80px] gap-2 px-4 py-2.5 items-center
                      ${i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/50 dark:bg-slate-800/20"}`}>
                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-white">{u.name.charAt(0)}</span>
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{u.name}</span>
                    </div>
                    {/* Progress bar + pct */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(u.pct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] tabular-nums font-semibold text-slate-500 shrink-0 w-7 text-right">{u.pct}%</span>
                    </div>
                    {/* Minutes */}
                    <div className="flex items-center justify-center gap-0.5">
                      <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-300">{u.minWatched}</span>
                    </div>
                    {/* Status badge */}
                    <div className="flex justify-end">
                      <NeonBadge color={STATUS_BADGE_COLOR[u.status] ?? "slate"} className="text-[8px] h-4 px-1.5 py-0">
                        {STATUS_LABEL[u.status]}
                      </NeonBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// === AccountTypePills =========================================================

function AccountTypePills({ value, onChange }) {
  const selected = value ?? [];
  const allSelected = isAll(selected);

  function toggleAll() { onChange(["all"]); }

  function toggleType(type) {
    if (allSelected) { onChange([type]); return; }
    if (selected.includes(type)) {
      if (selected.length === 1) return;
      onChange(selected.filter(t => t !== type));
    } else {
      const next = [...selected, type];
      if (next.length === 4) { onChange(["all"]); return; }
      onChange(next);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={toggleAll}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors
          ${allSelected
            ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700"
            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors
          ${allSelected ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"}`}>
          {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
        </div>
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>Todos os tipos</span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">Admin, Empresa, Agencia, Nomade</span>
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {ALL_ACCOUNT_TYPES.map(type => {
          const Icon = ACCOUNT_TYPE_ICONS[type];
          const active = !allSelected && selected.includes(type);
          return (
            <button key={type} type="button" onClick={() => toggleType(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors
                ${active ? ACCOUNT_TYPE_PILL_ACTIVE[type]
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors
                ${active ? "bg-current border-current" : "border-slate-300 dark:border-slate-600"}`}
                style={active ? { backgroundColor: "currentColor" } : {}}>
                {active && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{ACCOUNT_TYPE_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// === QuizBuilder Sheet ========================================================

function QuizBuilder({ open, onClose, onSave }) {
  const { toast } = useToast();
  const [quizTitle, setQuizTitle]   = useState("");
  const [minScore, setMinScore]     = useState(70);
  const [questions, setQuestions]   = useState([]);
  const [draft, setDraft]           = useState({ text: "", options: ["", "", "", ""], correct: 0 });
  const [draftError, setDraftError] = useState("");

  function resetDraft() { setDraft({ text: "", options: ["", "", "", ""], correct: 0 }); setDraftError(""); }

  function handleAddQuestion() {
    if (!draft.text.trim()) { setDraftError("Escreva o enunciado da pergunta."); return; }
    if (draft.options.some(o => !o.trim())) { setDraftError("Preencha todas as 4 opcoes."); return; }
    setDraftError("");
    setQuestions(qs => [...qs, { id: String(Date.now()), ...draft, options: [...draft.options] }]);
    resetDraft();
  }

  function removeQuestion(id) { setQuestions(qs => qs.filter(q => q.id !== id)); }

  function setOption(idx, val) {
    setDraft(d => { const opts = [...d.options]; opts[idx] = val; return { ...d, options: opts }; });
  }

  function handleSave() {
    if (!quizTitle.trim()) { toast({ title: "Informe o titulo do teste", variant: "destructive" }); return; }
    if (questions.length === 0) { toast({ title: "Adicione ao menos uma pergunta", variant: "destructive" }); return; }
    onSave({ title: quizTitle.trim(), minScore: Number(minScore) || 70, questions });
    setQuizTitle(""); setMinScore(70); setQuestions([]); resetDraft();
  }

  function handleClose() {
    setQuizTitle(""); setMinScore(70); setQuestions([]); resetDraft();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent hideOverlay className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <div className="shrink-0 bg-linear-to-br from-purple-500 to-indigo-600 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <ClipboardCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold text-white leading-tight">Construtor de Teste</SheetTitle>
              <p className="text-[11px] text-white/70 mt-0.5 leading-tight">Crie perguntas para avaliar o aprendizado</p>
            </div>
            {questions.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 bg-white/20 rounded-lg px-2.5 py-1">
                <Trophy className="h-3 w-3 text-white" />
                <span className="text-[11px] font-semibold text-white">{questions.length} pergunta{questions.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Titulo do Teste <span className="text-red-500 normal-case">*</span>
              </Label>
              <Input placeholder="Ex: Verificacao de Conhecimentos" className="h-9 text-sm"
                value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nota Minima</Label>
              <div className="flex items-center gap-1.5">
                <Input type="number" min={10} max={100} step={5} className="h-9 text-sm text-center"
                  value={minScore} onChange={e => setMinScore(Math.min(100, Math.max(10, Number(e.target.value))))} />
                <span className="text-sm font-semibold text-slate-500 shrink-0">%</span>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs
            ${minScore >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
              : minScore >= 60 ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400"
              : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"}`}>
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            <span>O aluno precisa acertar <strong>{minScore}%</strong> ou mais das perguntas para ser aprovado.</span>
          </div>

          {questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Perguntas ({questions.length})</p>
              {questions.map((q, qi) => (
                <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 leading-snug">{q.text}</p>
                    <div className="shrink-0">
                      <IconActionButton icon={X} tooltip="Remover pergunta" onClick={() => removeQuestion(q.id)} tone="text-red-500" size={22} iconSize="h-3 w-3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] border
                        ${oi === q.correct
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
                          : "bg-white border-slate-100 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"}`}>
                        <span className="font-bold shrink-0 w-3.5">{OPTION_LETTERS[oi]}</span>
                        <span className="truncate flex-1">{opt}</span>
                        {oi === q.correct && <Check className="h-3 w-3 shrink-0 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-xl p-4 space-y-3 bg-purple-50/40 dark:bg-purple-950/10">
            <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Nova Pergunta
            </p>
            <Textarea placeholder="Escreva o enunciado da pergunta aqui..." rows={2}
              className="text-sm resize-none bg-white dark:bg-slate-900"
              value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} />
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Opcoes — clique no circulo para marcar a correta</p>
              <div className="space-y-1.5">
                {[0, 1, 2, 3].map(oi => (
                  <div key={oi} className="flex items-center gap-2">
                    <button type="button" onClick={() => setDraft(d => ({ ...d, correct: oi }))}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${draft.correct === oi ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"}`}>
                      {draft.correct === oi && <div className="h-2 w-2 rounded-full bg-white" />}
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{OPTION_LETTERS[oi]}</span>
                    <Input placeholder={`Opcao ${OPTION_LETTERS[oi]}...`} className="h-7 text-xs flex-1 bg-white dark:bg-slate-900"
                      value={draft.options[oi]} onChange={e => setOption(oi, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            {draftError && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {draftError}
              </div>
            )}
            <Button size="sm" className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddQuestion}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Pergunta
            </Button>
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          {questions.length > 0 ? (
            <p className="text-[11px] text-slate-400 flex-1">{questions.length} pergunta{questions.length > 1 ? "s" : ""} &middot; aprovacao com {minScore}%</p>
          ) : (
            <p className="text-[11px] text-slate-400 flex-1">Adicione ao menos uma pergunta para salvar.</p>
          )}
          <Button variant="outline" className="h-9 text-sm px-4" onClick={handleClose}>Cancelar</Button>
          <Button className="h-9 text-sm px-5 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave}>
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Salvar Teste
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// === CircuitCard ==============================================================

function CircuitCard({ circuit, analytics, onEdit, onPreview, onToggle, onDelete, onAnalytics, onAddElem, addElemOpen, elemForm, setElemForm, onAddElement, onOpenQuizBuilder, onCloseAdd, onMoveElement, onRemoveElement }) {
  const grad     = resolveGrad(circuit.accountTypes);
  const Icon     = resolveIcon(circuit.accountTypes);
  const allTypes = isAll(circuit.accountTypes);

  return (
    <Card className="overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className={`p-1.5 bg-linear-to-br ${grad} rounded-lg shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{circuit.name}</span>
            {allTypes ? (
              <NeonBadge color="blue" className="text-[9px] h-4 px-1.5 py-0">
                Todos os tipos
              </NeonBadge>
            ) : (
              circuit.accountTypes.map(t => (
                <NeonBadge key={t} color={ACCOUNT_TYPE_BADGE_COLOR[t]} className="text-[9px] h-4 px-1.5 py-0">
                  {ACCOUNT_TYPE_LABELS[t]}
                </NeonBadge>
              ))
            )}
            {circuit.isActive ? (
              <NeonBadge color="emerald" className="text-[9px] h-4 px-1.5 py-0">Ativo</NeonBadge>
            ) : (
              <NeonBadge color="slate" className="text-[9px] h-4 px-1.5 py-0">Inativo</NeonBadge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">{circuit.description}</p>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0 mr-2">
          <div className="text-center">
            <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{circuit.elements.length}</p>
            <p className="text-[9px] text-slate-400 leading-none mt-0.5">Elem.</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{circuit.totalUsers}</p>
            <p className="text-[9px] text-slate-400 leading-none mt-0.5">Usuarios</p>
          </div>
          <div>
            <CompletionBar pct={circuit.completionRate} />
            <p className="text-[9px] text-slate-400 leading-none mt-0.5 text-center">Conclusao</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconActionButton icon={BarChart2} tooltip="Analytics" onClick={() => onAnalytics(circuit)} tone="text-blue-500" />
          <IconActionButton icon={Eye} tooltip="Preview" onClick={() => onPreview(circuit)} tone="text-[#6E2C96]" />
          <IconActionButton icon={Pencil} tooltip="Editar" onClick={() => onEdit(circuit)} tone="text-[#6E2C96]" />
          <IconActionButton
            icon={circuit.isActive ? ToggleRight : ToggleLeft}
            tooltip={circuit.isActive ? "Desativar" : "Ativar"}
            onClick={() => onToggle(circuit.id)}
            tone={circuit.isActive ? "text-emerald-500" : "text-slate-300"}
          />
          <IconActionButton icon={Trash2} tooltip="Excluir" onClick={() => onDelete(circuit.id)} tone="text-red-500" />
        </div>
      </div>

      {/* Analytics mini-strip */}
      {analytics && (
        <div
          className="flex items-center gap-4 px-4 py-2 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/10 transition-colors"
          onClick={() => onAnalytics(circuit)}>
          <BarChart2 className="h-3 w-3 text-slate-400 shrink-0" />
          {[
            { label: "Views",  value: analytics.views,        color: "text-blue-600 dark:text-blue-400" },
            { label: "30%",    value: `${analytics.at30}%`,   color: "text-amber-600 dark:text-amber-400" },
            { label: "50%",    value: `${analytics.at50}%`,   color: "text-orange-600 dark:text-orange-400" },
            { label: "100%",   value: `${analytics.at100}%`,  color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Desist.",value: `${analytics.dropout}%`,
              color: analytics.dropout > 30 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</span>
              <span className={`text-[11px] font-bold tabular-nums ${color}`}>{value}</span>
            </div>
          ))}
          <span className="ml-auto text-[9px] text-slate-400 flex items-center gap-0.5">
            ver detalhes <ChevronRight className="h-2.5 w-2.5" />
          </span>
        </div>
      )}

      {/* Elements section */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <LayoutList className="h-3 w-3" /> Elementos do circuito
          </p>
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-dashed"
            onClick={() => onAddElem(circuit.id)}>
            <Plus className="h-2.5 w-2.5" /> Adicionar
          </Button>
        </div>

        {addElemOpen && (
          <div className="p-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/15 space-y-2.5 mb-2">
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Novo elemento</p>
            <div className="grid grid-cols-4 gap-1.5">
              {["slide", "video", "text", "quiz"].map(t => {
                const EIcon = CONTENT_ICONS[t];
                const active = elemForm.type === t;
                const isQuiz = t === "quiz";
                return (
                  <button key={t} type="button" onClick={() => setElemForm(f => ({ ...f, type: t }))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-[10px] font-semibold transition-colors
                      ${active
                        ? isQuiz
                          ? "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-700 dark:text-purple-400"
                          : "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                    <EIcon className="h-4 w-4" />
                    <span>{CONTENT_LABELS[t]}</span>
                  </button>
                );
              })}
            </div>

            {elemForm.type === "quiz" ? (
              <div className="space-y-2">
                <Input placeholder="Titulo do teste..." className="h-8 text-xs"
                  value={elemForm.title} onChange={e => setElemForm(f => ({ ...f, title: e.target.value }))} />
                <button type="button" onClick={() => onOpenQuizBuilder(circuit.id, elemForm.title)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Abrir Construtor de Perguntas
                </button>
                <Button size="sm" variant="ghost" className="h-7 text-xs w-full" onClick={onCloseAdd}>Cancelar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Titulo..." className="h-7 text-xs"
                  value={elemForm.title} onChange={e => setElemForm(f => ({ ...f, title: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Conteudo ou URL..." className="h-7 text-xs"
                    value={elemForm.content} onChange={e => setElemForm(f => ({ ...f, content: e.target.value }))} />
                  {elemForm.type === "video" && (
                    <Input type="number" placeholder="Duracao (s)..." className="h-7 text-xs"
                      value={elemForm.duration} onChange={e => setElemForm(f => ({ ...f, duration: e.target.value }))} />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={onAddElement}>Adicionar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCloseAdd}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {circuit.elements.length === 0 ? (
          <div className="flex items-center gap-2 py-3 px-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <LayoutList className="h-3.5 w-3.5 text-slate-300" />
            <p className="text-xs text-slate-400">Nenhum elemento. Adicione slides, videos, textos ou testes.</p>
          </div>
        ) : (
          circuit.elements.sort((a, b) => a.order - b.order).map((el, idx, arr) => (
            <div key={el.id}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-xs
                ${idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-800/10"}
                hover:bg-slate-100 dark:hover:bg-slate-700/30`}>
              <GripVertical className="h-3 w-3 text-slate-300 cursor-move shrink-0" />
              <NeonBadge color={CONTENT_BADGE_COLOR[el.type] ?? "slate"} className="text-[9px] h-4 px-1.5 py-0 shrink-0">
                {CONTENT_LABELS[el.type] ?? el.type}
              </NeonBadge>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{el.title}</span>
                {el.type === "video" && el.duration && (
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                    {Math.floor(el.duration / 60)}:{String(el.duration % 60).padStart(2, "0")}
                  </span>
                )}
                {el.type === "quiz" && (
                  <span className="text-[10px] text-purple-500 shrink-0">
                    {el.questions?.length ?? 0} pergunta{(el.questions?.length ?? 0) !== 1 ? "s" : ""} &middot; min. {el.minScore ?? 70}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconActionButton icon={ArrowUp} tooltip="Mover para cima" onClick={() => onMoveElement(circuit.id, el.id, "up")} disabled={idx === 0} size={22} iconSize="h-2.5 w-2.5" />
                <IconActionButton icon={ArrowDown} tooltip="Mover para baixo" onClick={() => onMoveElement(circuit.id, el.id, "down")} disabled={idx === arr.length - 1} size={22} iconSize="h-2.5 w-2.5" />
                <IconActionButton icon={Trash2} tooltip="Remover" onClick={() => onRemoveElement(circuit.id, el.id)} tone="text-red-500" size={22} iconSize="h-2.5 w-2.5" />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// === Main Page ================================================================

export default function AdminOnboardingPage() {
  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();

  const [circuits, setCircuits]             = useState(INITIAL_CIRCUITS);
  const [analyticsMap, setAnalyticsMap]     = useState(ANALYTICS_DATA);
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [editCircuit, setEditCircuit]       = useState(null);
  const [previewCircuit, setPreviewCircuit] = useState(null);
  const [analyticsCircuit, setAnalyticsCircuit] = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [addElemCircuit, setAddElemCircuit] = useState(null);
  const [elemForm, setElemForm]             = useState({ type: "slide", title: "", content: "", duration: "" });
  const [form, setForm]                     = useState({ name: "", accountTypes: ["company"], description: "", isActive: true });

  const [quizBuilderOpen, setQuizBuilderOpen]             = useState(false);
  const [quizBuilderCircuitId, setQuizBuilderCircuitId]   = useState(null);
  const [search, setSearch]                               = useState("");
  const [statusFilter, setStatusFilter]                   = useState("all"); // all | active | inactive

  // Elements managed inside the create/edit panel
  const [formElements, setFormElements]     = useState([]);
  const [formElemForm, setFormElemForm]     = useState({ type: "slide", title: "", content: "", duration: "" });
  const [formAddElemOpen, setFormAddElemOpen] = useState(false);
  const [formQuizBuilderOpen, setFormQuizBuilderOpen] = useState(false);

  const totalCircuits  = circuits.length;
  const activeCircuits = circuits.filter(c => c.isActive).length;
  const avgCompletion  = circuits.length > 0
    ? Math.round(circuits.reduce((a, c) => a + c.completionRate, 0) / circuits.length) : 0;
  const totalUsers = circuits.reduce((a, c) => a + c.totalUsers, 0);

  function openCreate() {
    setEditCircuit(null);
    setForm({ name: "", accountTypes: ["company"], description: "", isActive: true });
    setFormElements([]);
    setFormElemForm({ type: "slide", title: "", content: "", duration: "" });
    setFormAddElemOpen(false);
    setSheetOpen(true);
  }
  function openEdit(c) {
    setEditCircuit(c);
    setForm({ name: c.name, accountTypes: c.accountTypes ?? ["company"], description: c.description, isActive: c.isActive });
    setFormElements([...(c.elements ?? [])].sort((a, b) => a.order - b.order));
    setFormElemForm({ type: "slide", title: "", content: "", duration: "" });
    setFormAddElemOpen(false);
    setSheetOpen(true);
  }
  function handleSave() {
    if (!form.name.trim()) { toast({ title: "Informe o nome do circuito", variant: "destructive" }); return; }
    if (!form.accountTypes?.length) { toast({ title: "Selecione ao menos um tipo de conta", variant: "destructive" }); return; }
    if (editCircuit) {
      setCircuits(cs => cs.map(c => c.id === editCircuit.id
        ? { ...c, ...form, elements: formElements.map((e, i) => ({ ...e, order: i + 1 })) } : c));
      toast({ title: "Circuito atualizado" });
    } else {
      const newId = String(Date.now());
      setCircuits(cs => [...cs, {
        id: newId, elements: formElements.map((e, i) => ({ ...e, order: i + 1 })),
        completionRate: 0, totalUsers: 0,
        name: form.name, accountTypes: form.accountTypes,
        description: form.description, isActive: form.isActive,
      }]);
      setAnalyticsMap(m => ({ ...m, [newId]: { views: 0, at30: 0, at50: 0, at100: 0, dropout: 0, users: [] } }));
      toast({ title: "Circuito criado" });
    }
    setSheetOpen(false);
  }
  function handleDelete() {
    setCircuits(cs => cs.filter(c => c.id !== deleteTarget));
    toast({ title: "Circuito removido" });
    setDeleteTarget(null);
  }
  function toggleActive(id) {
    setCircuits(cs => cs.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  }

  function moveElement(circuitId, elementId, dir) {
    setCircuits(cs => cs.map(c => {
      if (c.id !== circuitId) return c;
      const els = [...c.elements].sort((a, b) => a.order - b.order);
      const idx = els.findIndex(e => e.id === elementId);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === els.length - 1)) return c;
      const ni = dir === "up" ? idx - 1 : idx + 1;
      [els[idx], els[ni]] = [els[ni], els[idx]];
      els.forEach((el, i) => { el.order = i + 1; });
      return { ...c, elements: els };
    }));
  }
  function removeElement(circuitId, elementId) {
    setCircuits(cs => cs.map(c =>
      c.id === circuitId ? { ...c, elements: c.elements.filter(e => e.id !== elementId) } : c
    ));
    toast({ title: "Elemento removido" });
  }
  function handleAddElement() {
    if (!elemForm.title.trim()) { toast({ title: "Informe o titulo", variant: "destructive" }); return; }
    setCircuits(cs => cs.map(c => {
      if (c.id !== addElemCircuit) return c;
      return {
        ...c, elements: [...c.elements, {
          id: String(Date.now()), type: elemForm.type, title: elemForm.title.trim(),
          content: elemForm.content.trim(),
          duration: elemForm.duration ? parseInt(elemForm.duration) : undefined,
          order: c.elements.length + 1,
        }],
      };
    }));
    toast({ title: "Elemento adicionado" });
    setAddElemCircuit(null);
    setElemForm({ type: "slide", title: "", content: "", duration: "" });
  }

  function openQuizBuilder(circuitId, title) {
    setQuizBuilderCircuitId(circuitId);
    setElemForm(f => ({ ...f, title: title || f.title }));
    setQuizBuilderOpen(true);
  }
  function handleSaveQuiz(quizData) {
    setCircuits(cs => cs.map(c => {
      if (c.id !== quizBuilderCircuitId) return c;
      return {
        ...c, elements: [...c.elements, {
          id: String(Date.now()), type: "quiz",
          title: quizData.title, minScore: quizData.minScore, questions: quizData.questions,
          order: c.elements.length + 1,
        }],
      };
    }));
    toast({ title: "Teste adicionado ao circuito" });
    setQuizBuilderOpen(false);
    setAddElemCircuit(null);
    setElemForm({ type: "slide", title: "", content: "", duration: "" });
  }

  // --- Helpers for the create/edit panel elements ---
  function formMoveElement(elementId, dir) {
    setFormElements(els => {
      const arr = [...els];
      const idx = arr.findIndex(e => e.id === elementId);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === arr.length - 1)) return arr;
      const ni = dir === "up" ? idx - 1 : idx + 1;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return arr.map((e, i) => ({ ...e, order: i + 1 }));
    });
  }
  function formRemoveElement(elementId) {
    setFormElements(els => els.filter(e => e.id !== elementId));
  }
  function formAddElement() {
    if (!formElemForm.title.trim()) { toast({ title: "Informe o titulo", variant: "destructive" }); return; }
    setFormElements(els => [...els, {
      id: String(Date.now()), type: formElemForm.type, title: formElemForm.title.trim(),
      content: formElemForm.content.trim(),
      duration: formElemForm.duration ? parseInt(formElemForm.duration) : undefined,
      order: els.length + 1,
    }]);
    setFormElemForm({ type: "slide", title: "", content: "", duration: "" });
    setFormAddElemOpen(false);
  }
  function formSaveQuiz(quizData) {
    setFormElements(els => [...els, {
      id: String(Date.now()), type: "quiz",
      title: quizData.title, minScore: quizData.minScore, questions: quizData.questions,
      order: els.length + 1,
    }]);
    setFormQuizBuilderOpen(false);
    setFormAddElemOpen(false);
    setFormElemForm({ type: "slide", title: "", content: "", duration: "" });
    toast({ title: "Teste adicionado" });
  }

  function circuitMatchesTab(circuit, tab) {
    if (tab === "all") return true;
    const types = circuit.accountTypes ?? [];
    return types.includes("all") || types.length === 4 || types.includes(tab);
  }

  function circuitMatchesFilters(circuit) {
    if (statusFilter === "active"   && !circuit.isActive) return false;
    if (statusFilter === "inactive" &&  circuit.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!circuit.name.toLowerCase().includes(q) && !circuit.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  }

  const tabs = ["all", "admin", "company", "agency", "nomad"];
  const formGrad = resolveGrad(form.accountTypes);
  const FormIcon = resolveIcon(form.accountTypes);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Rocket}
        title="Onboarding"
        description="Circuitos de boas-vindas por tipo de conta"
        actions={
          <>
            <div className="bg-white rounded-lg">
              <ExportButton filename="circuitos" />
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Novo Circuito
            </button>
            <PinToTrayButton id="page-onboarding" label="Onboarding" icon={Rocket} path="/admin/onboarding" />
          </>
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Circuitos",     value: totalCircuits,       icon: Rocket,       grad: "from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-950 border-blue-300/70 dark:border-blue-800/70" },
          { label: "Ativos",              value: activeCircuits,      icon: CheckCircle2, grad: "from-emerald-500 to-teal-600 dark:from-emerald-800 dark:to-teal-900 border-emerald-300/70 dark:border-emerald-800/70" },
          { label: "Taxa de Conclusao",   value: `${avgCompletion}%`, icon: Play,         grad: "from-violet-500 to-purple-700 dark:from-violet-800 dark:to-purple-950 border-violet-300/70 dark:border-violet-800/70" },
          { label: "Usuarios Impactados", value: totalUsers,          icon: Users,        grad: "from-amber-500 to-orange-600 dark:from-amber-800 dark:to-orange-950 border-amber-300/70 dark:border-amber-800/70" },
        ].map(({ label, value, icon: Icon, grad }) => (
          <div key={label} className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${grad} border-2 shadow-lg`}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">{label}</span>
                <div className="bg-white/20 rounded-md p-1"><Icon className="h-3 w-3 text-white" /></div>
              </div>
              <div className="text-xl font-bold text-white">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + status filter toolbar */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Buscar circuito…" className="pl-9 h-9 text-sm w-full"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            {circuits.filter(circuitMatchesFilters).length} de{" "}
            <span className="font-semibold text-slate-600 dark:text-slate-300">{circuits.length}</span>{" "}
            circuito{circuits.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { key: "all",      label: "Todos" },
              { key: "active",   label: "Ativos",   dot: "#10b981" },
              { key: "inactive", label: "Inativos", dot: "#94a3b8" },
            ].map(({ key, label, dot }) => {
              const active = statusFilter === key;
              return (
                <button key={key} onClick={() => setStatusFilter(key)}
                  style={active && dot ? { background: dot, border: `2px solid ${dot}`, color: "#fff", boxShadow: `0 2px 10px ${dot}55` } : {}}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                    active && !dot
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                      : active ? ""
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}>
                  {dot && <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background: active ? "rgba(255,255,255,0.7)" : dot, flexShrink:0 }} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="h-8">
          <TabsTrigger value="all"     className="text-xs px-3">Todos</TabsTrigger>
          <TabsTrigger value="admin"   className="text-xs px-3">Admin</TabsTrigger>
          <TabsTrigger value="company" className="text-xs px-3">Empresas</TabsTrigger>
          <TabsTrigger value="agency"  className="text-xs px-3">Agencias</TabsTrigger>
          <TabsTrigger value="nomad"   className="text-xs px-3">Nomades</TabsTrigger>
        </TabsList>

        {tabs.map(tab => {
          const visible = circuits.filter(c => circuitMatchesTab(c, tab) && circuitMatchesFilters(c));
          return (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {visible.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                  <Rocket className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Nenhum circuito nesta categoria</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={openCreate}>
                    <Plus className="h-3 w-3 mr-1" /> Criar circuito
                  </Button>
                </div>
              )}
              {visible.map(circuit => (
                <CircuitCard
                  key={circuit.id}
                  circuit={circuit}
                  analytics={analyticsMap[circuit.id] ?? null}
                  onEdit={openEdit}
                  onPreview={c => setPreviewCircuit(c)}
                  onToggle={toggleActive}
                  onDelete={id => setDeleteTarget(id)}
                  onAnalytics={c => setAnalyticsCircuit(c)}
                  onAddElem={id => { setAddElemCircuit(id); setElemForm({ type: "slide", title: "", content: "", duration: "" }); }}
                  addElemOpen={addElemCircuit === circuit.id}
                  elemForm={elemForm}
                  setElemForm={setElemForm}
                  onAddElement={handleAddElement}
                  onOpenQuizBuilder={openQuizBuilder}
                  onCloseAdd={() => setAddElemCircuit(null)}
                  onMoveElement={moveElement}
                  onRemoveElement={removeElement}
                />
              ))}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create / Edit Circuit — slide panel from sidebar */}
      {sheetOpen && (() => {
        const left = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(sidebarWidth) || 240;
        return (
          <div
            data-slot="sheet-content"
            data-state="open"
            className="fixed top-0 z-80 h-screen bg-background flex flex-col shadow-2xl border-l border-border overflow-hidden animate-in slide-in-from-right fade-in-0 duration-300"
            style={{ left: `${left}px`, width: `calc(100vw - ${left}px)` }}>

              {/* Brand header */}
              <ModalBrandHeader
                title={editCircuit ? "Editar Circuito" : "Novo Circuito"}
                subtitle={editCircuit ? "Atualize as informacoes do circuito" : "Configure um novo circuito de onboarding"}
                icon={<FormIcon />}
                onClose={() => setSheetOpen(false)}
              />

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 px-8 py-6 space-y-3">

                {/* Section 1 — Dados do Circuito */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados do Circuito</p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 pb-5 pt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Nome do Circuito <span className="text-red-500">*</span>
                      </Label>
                      <Input placeholder="Ex: Onboarding Empresas Premium"
                        className="h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descricao</Label>
                      <Textarea placeholder="Descreva o objetivo deste circuito..."
                        className="text-sm resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" rows={3}
                        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Section 2 — Tipos de Conta */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tipos de Conta com Acesso</p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 pb-5 pt-4">
                    <AccountTypePills value={form.accountTypes} onChange={v => setForm(f => ({ ...f, accountTypes: v }))} />
                  </div>
                </div>

                {/* Section 3 — Configuracoes */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Configuracoes</p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Circuito Ativo</p>
                        <p className="text-xs text-slate-400 mt-0.5">Exibir para novos usuarios assim que criado</p>
                      </div>
                      <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                    </div>
                  </div>
                </div>

                {/* Section 4 — Etapas do Circuito */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Etapas do Circuito</p>
                        <p className="text-xs text-slate-400 mt-0.5">Slides, videos, textos e testes de avaliacao</p>
                      </div>
                    </div>
                    {formElements.length > 0 && (
                      <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-700 px-2 py-0.5 rounded-full">
                        {formElements.length} etapa{formElements.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 pb-5 pt-4 space-y-2">

                    {/* Element list */}
                    {formElements.length === 0 && !formAddElemOpen && (
                      <div className="flex items-center gap-2 py-4 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                        <LayoutList className="h-4 w-4 opacity-40" />
                        <p className="text-xs">Nenhuma etapa ainda. Adicione slides, videos, textos ou testes abaixo.</p>
                      </div>
                    )}

                    {formElements.map((el, idx, arr) => (
                      <div key={el.id}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-colors
                          ${idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/30" : "bg-white dark:bg-transparent"}
                          border-slate-100 dark:border-slate-700/50`}>
                        <GripVertical className="h-3 w-3 text-slate-300 cursor-move shrink-0" />
                        <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[9px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <NeonBadge color={CONTENT_BADGE_COLOR[el.type] ?? "slate"} className="text-[9px] h-4 px-1.5 py-0 shrink-0">
                          {CONTENT_LABELS[el.type] ?? el.type}
                        </NeonBadge>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{el.title}</span>
                          {el.type === "video" && el.duration && (
                            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                              {Math.floor(el.duration / 60)}:{String(el.duration % 60).padStart(2, "0")}
                            </span>
                          )}
                          {el.type === "quiz" && (
                            <span className="text-[10px] text-purple-500 shrink-0">
                              {el.questions?.length ?? 0} pergunta{(el.questions?.length ?? 0) !== 1 ? "s" : ""} &middot; min. {el.minScore ?? 70}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <IconActionButton icon={ArrowUp} tooltip="Mover para cima" onClick={() => formMoveElement(el.id, "up")} disabled={idx === 0} size={22} iconSize="h-2.5 w-2.5" />
                          <IconActionButton icon={ArrowDown} tooltip="Mover para baixo" onClick={() => formMoveElement(el.id, "down")} disabled={idx === arr.length - 1} size={22} iconSize="h-2.5 w-2.5" />
                          <IconActionButton icon={Trash2} tooltip="Remover" onClick={() => formRemoveElement(el.id)} tone="text-red-500" size={22} iconSize="h-2.5 w-2.5" />
                        </div>
                      </div>
                    ))}

                    {/* Add element form */}
                    {formAddElemOpen ? (
                      <div className="p-4 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/15 space-y-3 mt-2">
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Plus className="h-3 w-3" /> Nova Etapa
                        </p>
                        {/* Type selector */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {["slide", "video", "text", "quiz"].map(t => {
                            const EIcon = CONTENT_ICONS[t];
                            const active = formElemForm.type === t;
                            const isQuiz = t === "quiz";
                            return (
                              <button key={t} type="button" onClick={() => setFormElemForm(f => ({ ...f, type: t }))}
                                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[11px] font-semibold transition-colors
                                  ${active
                                    ? isQuiz
                                      ? "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-700 dark:text-purple-400"
                                      : "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400"
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                                <EIcon className="h-4 w-4" />
                                <span>{CONTENT_LABELS[t]}</span>
                              </button>
                            );
                          })}
                        </div>

                        {formElemForm.type === "quiz" ? (
                          <div className="space-y-2">
                            <Input placeholder="Titulo do teste..." className="h-9 text-sm bg-white dark:bg-slate-900"
                              value={formElemForm.title} onChange={e => setFormElemForm(f => ({ ...f, title: e.target.value }))} />
                            <button type="button"
                              onClick={() => setFormQuizBuilderOpen(true)}
                              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
                              <ClipboardCheck className="h-4 w-4" />
                              Abrir Construtor de Perguntas
                            </button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs w-full" onClick={() => setFormAddElemOpen(false)}>Cancelar</Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input placeholder="Titulo da etapa..." className="h-9 text-sm bg-white dark:bg-slate-900"
                              value={formElemForm.title} onChange={e => setFormElemForm(f => ({ ...f, title: e.target.value }))} />
                            {formElemForm.type === "video" ? (
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="URL do video..." className="h-9 text-sm bg-white dark:bg-slate-900"
                                  value={formElemForm.content} onChange={e => setFormElemForm(f => ({ ...f, content: e.target.value }))} />
                                <Input type="number" placeholder="Duracao (segundos)..." className="h-9 text-sm bg-white dark:bg-slate-900"
                                  value={formElemForm.duration} onChange={e => setFormElemForm(f => ({ ...f, duration: e.target.value }))} />
                              </div>
                            ) : (
                              <Textarea placeholder="Conteudo do slide / texto..." rows={3}
                                className="text-sm resize-none bg-white dark:bg-slate-900"
                                value={formElemForm.content} onChange={e => setFormElemForm(f => ({ ...f, content: e.target.value }))} />
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" className="h-9 text-sm flex-1 btn-brand border-0" onClick={formAddElement}>Adicionar Etapa</Button>
                              <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => setFormAddElemOpen(false)}>Cancelar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button type="button" onClick={() => { setFormElemForm({ type: "slide", title: "", content: "", duration: "" }); setFormAddElemOpen(true); }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/10 hover:border-blue-300 hover:text-blue-600 transition-colors text-xs font-medium">
                          <FileText className="h-3.5 w-3.5 text-blue-400" /> Slide / Texto / Video
                        </button>
                        <button type="button" onClick={() => { setFormElemForm({ type: "quiz", title: "", content: "", duration: "" }); setFormAddElemOpen(true); }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-400 transition-colors text-xs font-medium">
                          <ClipboardCheck className="h-3.5 w-3.5" /> Teste / Avaliacao
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              {/* Footer */}
              <div className="shrink-0 px-8 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <Button variant="outline" className="h-9 px-6 text-sm" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                {formElements.length > 0 && (
                  <span className="text-xs text-slate-400 flex-1">{formElements.length} etapa{formElements.length !== 1 ? "s" : ""} configurada{formElements.length !== 1 ? "s" : ""}</span>
                )}
                <Button className="h-9 px-8 btn-brand border-0 shadow-md" onClick={handleSave}>
                  {editCircuit ? "Salvar Alteracoes" : "Criar Circuito"}
                </Button>
              </div>
            </div>

        {/* Quiz builder for the create/edit panel */}
        <QuizBuilder
          open={formQuizBuilderOpen}
          onClose={() => setFormQuizBuilderOpen(false)}
          onSave={formSaveQuiz}
        />
        </div>
      );
      })()}

      {/* Preview Modal */}
      {!!previewCircuit && (() => {
        const pGrad  = resolveGrad(previewCircuit.accountTypes);
        const PIcon  = resolveIcon(previewCircuit.accountTypes);
        const sorted = [...(previewCircuit.elements ?? [])].sort((a, b) => a.order - b.order);

        const TYPE_BG = {
          slide: "bg-blue-50 dark:bg-blue-950/20",
          video: "bg-rose-50 dark:bg-rose-950/20",
          text:  "bg-slate-50 dark:bg-slate-800/40",
          quiz:  "bg-purple-50 dark:bg-purple-950/20",
        };
        const TYPE_ICON_BG = {
          slide: "bg-blue-100 dark:bg-blue-950/50",
          video: "bg-rose-100 dark:bg-rose-950/50",
          text:  "bg-slate-200 dark:bg-slate-700",
          quiz:  "bg-purple-100 dark:bg-purple-950/50",
        };
        const TYPE_ICON_COLOR = {
          slide: "text-blue-600 dark:text-blue-400",
          video: "text-rose-600 dark:text-rose-400",
          text:  "text-slate-600 dark:text-slate-300",
          quiz:  "text-purple-600 dark:text-purple-400",
        };
        const STEP_ICON = { slide: FileText, video: Film, text: AlignLeft, quiz: ClipboardCheck };

        const left = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(sidebarWidth) || 240;
        return (
          <div
            data-slot="sheet-content"
            data-state="open"
            className="fixed top-0 z-80 h-screen bg-background flex flex-col shadow-2xl border-l border-border overflow-hidden animate-in slide-in-from-right fade-in-0 duration-300"
            style={{ left: `${left}px`, width: `calc(100vw - ${left}px)` }}>

              {/* Brand header */}
              <ModalBrandHeader
                title={previewCircuit.name}
                subtitle={previewCircuit.description || "Preview do Circuito"}
                icon={<PIcon />}
                onClose={() => setPreviewCircuit(null)}
                right={
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <LayoutList className="h-3.5 w-3.5 text-white/70" />
                      <span className="text-sm font-semibold text-white">{sorted.length}</span>
                      <span className="text-xs text-white/60">etapas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-white/70" />
                      <span className="text-sm font-semibold text-white">{previewCircuit.totalUsers}</span>
                      <span className="text-xs text-white/60">usuarios</span>
                    </div>
                  </div>
                }
              />

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
                    <LayoutList className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Nenhum elemento neste circuito.</p>
                  </div>
                ) : (
                  <div className="px-7 py-5 space-y-3">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                      Etapas do circuito
                    </p>
                    {sorted.map((el, i) => {
                      const StepIcon = STEP_ICON[el.type] ?? FileText;
                      return (
                        <div key={el.id}
                          className={`rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm`}>

                          {/* Step header */}
                          <div className={`flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800`}>
                            {/* Step number */}
                            <div className={`h-9 w-9 rounded-xl ${TYPE_ICON_BG[el.type]} flex items-center justify-center shrink-0`}>
                              <StepIcon className={`h-4.5 w-4.5 ${TYPE_ICON_COLOR[el.type]}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Etapa {i + 1}
                                </span>
                                <NeonBadge color={CONTENT_BADGE_COLOR[el.type] ?? "slate"} className="text-[9px] h-4 px-1.5 py-0">
                                  {CONTENT_LABELS[el.type] ?? el.type}
                                </NeonBadge>
                              </div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{el.title}</p>
                            </div>

                            {/* Meta right */}
                            {el.type === "video" && el.duration && (
                              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1.5 rounded-lg shrink-0">
                                <Clock className="h-3 w-3 text-rose-500" />
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                                  {Math.floor(el.duration / 60)}min {String(el.duration % 60).padStart(2,"0")}s
                                </span>
                              </div>
                            )}
                            {el.type === "quiz" && (
                              <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/20 px-2.5 py-1.5 rounded-lg shrink-0">
                                <Trophy className="h-3 w-3 text-purple-500" />
                                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                  min. {el.minScore ?? 70}%
                                </span>
                              </div>
                            )}
                            {el.type === "slide" && (
                              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1.5 rounded-lg shrink-0">
                                <FileText className="h-3 w-3 text-blue-500" />
                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Slide</span>
                              </div>
                            )}
                          </div>

                          {/* Content preview area */}
                          {el.type === "video" && (
                            <div className="px-5 py-4 bg-slate-900 flex items-center gap-4">
                              <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-white/50 mb-0.5">URL do Video</p>
                                <p className="text-sm text-white/80 truncate font-mono">{el.content || "—"}</p>
                              </div>
                            </div>
                          )}

                          {el.type === "slide" && el.content && (
                            <div className={`px-5 py-4 ${TYPE_BG.slide} border-t border-blue-100 dark:border-blue-900/40`}>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{el.content}</p>
                            </div>
                          )}

                          {el.type === "text" && el.content && (
                            <div className={`px-5 py-4 ${TYPE_BG.text} border-t border-slate-200 dark:border-slate-700`}>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{el.content}</p>
                            </div>
                          )}

                          {/* Quiz questions */}
                          {el.type === "quiz" && el.questions?.length > 0 && (
                            <div className={`${TYPE_BG.quiz} border-t border-purple-100 dark:border-purple-900/40 px-5 py-4 space-y-4`}>
                              {el.questions.map((q, qi) => (
                                <div key={q.id}>
                                  <div className="flex items-start gap-3 mb-2.5">
                                    <span className="h-5 w-5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{q.text}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 ml-8">
                                    {q.options.map((opt, oi) => (
                                      <div key={oi}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium
                                          ${oi === q.correct
                                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                                            : "bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400"}`}>
                                        <span className="font-bold shrink-0 w-4">{OPTION_LETTERS[oi]}</span>
                                        <span className="flex-1 truncate">{opt}</span>
                                        {oi === q.correct && <Check className="h-3.5 w-3.5 shrink-0 ml-auto text-emerald-600 dark:text-emerald-400" />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-7 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NeonBadge color="slate" className="text-[10px] h-5 px-2 py-0">
                    {sorted.length} etapa{sorted.length !== 1 ? "s" : ""}
                  </NeonBadge>
                  {sorted.filter(e => e.type === "quiz").length > 0 && (
                    <NeonBadge color="purple" className="text-[10px] h-5 px-2 py-0">
                      {sorted.filter(e => e.type === "quiz").length} teste{sorted.filter(e => e.type === "quiz").length > 1 ? "s" : ""}
                    </NeonBadge>
                  )}
                </div>
                <Button variant="outline" className="h-9 px-5 text-sm" onClick={() => setPreviewCircuit(null)}>
                  Fechar
                </Button>
              </div>
          </div>
        );
      })()}

      {/* Analytics Sheet */}
      <CircuitAnalyticsSheet
        open={!!analyticsCircuit}
        circuit={analyticsCircuit}
        analytics={analyticsCircuit ? analyticsMap[analyticsCircuit.id] ?? null : null}
        onClose={() => setAnalyticsCircuit(null)}
      />

      {/* Quiz Builder Sheet */}
      <QuizBuilder
        open={quizBuilderOpen}
        onClose={() => setQuizBuilderOpen(false)}
        onSave={handleSaveQuiz}
      />

      {/* Delete confirm */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Excluir Circuito"
        description="Tem certeza? Todos os elementos deste circuito serao removidos permanentemente."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
    </div>
    </div>
    </div>
  );
}
