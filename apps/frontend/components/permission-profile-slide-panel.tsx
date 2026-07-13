// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import {
  X,
  Shield,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  Settings,
  Compass,
  Store,
  BarChart3,
  FileText,
  Lock,
  LayoutDashboard,
  Minus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { cn } from "@/lib/utils";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";

// ─── Types ────────────────────────────────────────────────────────────────────
type Scope = "none" | "own" | "all";
interface ModulePerm {
  view: Scope;
  create: Scope;
  edit: Scope;
  delete: Scope;
}
interface FormData {
  name: string;
  description: string;
  permissions: Record<string, ModulePerm>;
}

const EMPTY: ModulePerm = {
  view: "none",
  create: "none",
  edit: "none",
  delete: "none",
};
const FULL: ModulePerm = {
  view: "all",
  create: "all",
  edit: "all",
  delete: "all",
};
const CYCLE: Record<Scope, Scope> = { none: "own", own: "all", all: "none" };

const MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Visão Geral",
  },
  { key: "users", label: "Usuários", icon: Users, group: "Gestão" },
  { key: "companies", label: "Empresas", icon: Building2, group: "Gestão" },
  { key: "agencies", label: "Agências", icon: Briefcase, group: "Gestão" },
  { key: "nomades", label: "Nômades", icon: Compass, group: "Gestão" },
  { key: "projects", label: "Projetos", icon: Briefcase, group: "Operações" },
  { key: "products", label: "Produtos", icon: Store, group: "Operações" },
  {
    key: "financial",
    label: "Financeiro",
    icon: DollarSign,
    group: "Financeiro",
  },
  { key: "reports", label: "Relatórios", icon: BarChart3, group: "Financeiro" },
  {
    key: "settings",
    label: "Configurações",
    icon: Settings,
    group: "Administração",
  },
  {
    key: "permissions",
    label: "Permissões",
    icon: Lock,
    group: "Administração",
  },
  { key: "terms", label: "Termos", icon: FileText, group: "Administração" },
];

const ACTIONS: { key: keyof ModulePerm; label: string; colColor: string }[] = [
  { key: "view", label: "Visualizar", colColor: "blue" },
  { key: "create", label: "Criar", colColor: "emerald" },
  { key: "edit", label: "Editar", colColor: "amber" },
  { key: "delete", label: "Excluir", colColor: "red" },
];

const GROUPS = Array.from(new Set(MODULES.map((m) => m.group)));

function buildEmpty(): Record<string, ModulePerm> {
  return Object.fromEntries(MODULES.map((m) => [m.key, { ...EMPTY }]));
}

// ─── Scope Cell ───────────────────────────────────────────────────────────────
function ScopeCell({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (v: Scope) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(CYCLE[value])}
      className="w-full flex items-center justify-center h-10 rounded focus:outline-none group"
    >
      {value === "none" && (
        <span className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-slate-400 transition-colors">
          <Minus className="h-3 w-3 text-slate-300 group-hover:text-slate-400" />
        </span>
      )}
      {value === "own" && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors select-none">
          Próprios
        </span>
      )}
      {value === "all" && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors select-none">
          Todos
        </span>
      )}
    </button>
  );
}

// ─── Column header quick-cycle button ────────────────────────────────────────
function ColCycleBtn({
  color,
  onClick,
}: {
  color: string;
  onClick: () => void;
}) {
  const s: Record<string, string> = {
    blue: "text-blue-300    hover:bg-blue-900/50",
    emerald: "text-emerald-300 hover:bg-emerald-900/50",
    amber: "text-amber-300   hover:bg-amber-900/50",
    red: "text-red-300     hover:bg-red-900/50",
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${s[color]}`}
        >
          tudo <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="text-[11px] bg-slate-800 text-white border-slate-700"
      >
        Ciclar coluna inteira: nenhum → próprios → todos
      </TooltipContent>
    </Tooltip>
  );
}

interface PermissionProfileSlidePanelProps {
  open: boolean;
  onClose: () => void;
  profile?: any;
  onSave: (profile: any) => void;
}

export function PermissionProfileSlidePanel({
  open,
  onClose,
  profile,
  onSave,
}: PermissionProfileSlidePanelProps) {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);

  const [formData, setFormData] = useState<FormData>(() => {
    if (profile) {
      const perms: Record<string, ModulePerm> = {};
      MODULES.forEach((m) => {
        const old = profile.permissions?.[m.key] || {};
        perms[m.key] = {
          view: old.view ? "all" : "none",
          create: old.create ? "all" : "none",
          edit: old.edit ? "all" : "none",
          delete: old.delete ? "all" : "none",
        };
      });
      return {
        name: profile.name || "",
        description: profile.description || "",
        permissions: perms,
      };
    }
    return { name: "", description: "", permissions: buildEmpty() };
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 420);
  };

  const setScope = (module: string, action: keyof ModulePerm, scope: Scope) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: { ...prev.permissions[module], [action]: scope },
      },
    }));
  };

  // Cycle an entire column: if any cell is not "all", set all to "all"; otherwise clear all
  const cycleColumn = (action: keyof ModulePerm) => {
    const allFull = MODULES.every(
      (m) => (formData.permissions[m.key]?.[action] ?? "none") === "all",
    );
    const next: Scope = allFull ? "none" : "all";
    setFormData((prev) => {
      const perms = { ...prev.permissions };
      MODULES.forEach((m) => {
        perms[m.key] = { ...perms[m.key], [action]: next };
      });
      return { ...prev, permissions: perms };
    });
  };

  // Cycle an entire row: if any cell is not "all", set all to "all"; otherwise clear all
  const cycleRow = (moduleKey: string) => {
    const perm = formData.permissions[moduleKey];
    const allFull = ACTIONS.every((a) => perm[a.key] === "all");
    const next = allFull ? { ...EMPTY } : { ...FULL };
    setFormData((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [moduleKey]: next },
    }));
  };

  const summary = useMemo(() => {
    let active = 0;
    let total_all = 0;
    MODULES.forEach((m) =>
      ACTIONS.forEach((a) => {
        const v = formData.permissions[m.key]?.[a.key] ?? "none";
        if (v !== "none") active++;
        if (v === "all") total_all++;
      }),
    );
    return { active, total_all, total: MODULES.length * ACTIONS.length };
  }, [formData.permissions]);

  if (!open && !isClosing) return null;

  return (
    <TooltipProvider>
      <div
        data-slot="sheet-content"
        data-state={isClosing ? "closed" : "open"}
        style={{
          left: `${sidebarWidth - 2}px`,
          width: `calc(100vw - ${sidebarWidth - 2}px)`,
          top: `${headerHeight - 1}px`,
          bottom: `${footerHeight - 1}px`,
        }}
        className="fixed z-50 bg-background shadow-2xl flex flex-col overflow-hidden border-l border-border data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
      >
        {/* ── Header ── */}
        <ModalBrandHeader
          title={profile?.id ? "Editar Perfil de Acesso" : "Novo Perfil de Acesso"}
          subtitle={`${summary.active}/${summary.total} permissões ativas${summary.total_all > 0 ? ` · ${summary.total_all}× acesso total` : ""}`}
          icon={<Shield />}
          onClose={handleClose}
        />

        {/* ── Basic Info ── */}
        <div className="px-5 py-3 border-b bg-slate-50 shrink-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Nome do Perfil
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Gerente de Projetos"
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="flex-[2]">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Descrição
              </Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Breve descrição do perfil e seus acessos"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-5 py-2 border-b bg-white shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">
            Escopo:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
              <Minus className="h-2.5 w-2.5 text-slate-300" />
            </span>
            <span className="text-[11px] text-slate-500">Sem acesso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
              Próprios
            </span>
            <span className="text-[11px] text-slate-500">
              Somente registros do próprio usuário
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              Todos
            </span>
            <span className="text-[11px] text-slate-500">
              Todos os registros da plataforma
            </span>
          </div>
          <span className="text-[11px] text-slate-400 ml-auto italic hidden lg:block">
            Clique nas células para ciclar · hover na linha para ativar tudo
          </span>
        </div>

        {/* ── Permission Matrix Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "#0f172a" }}>
                <th
                  className="text-left px-4 py-2.5 font-semibold text-xs text-slate-400 border-r border-slate-700"
                  style={{ width: 200 }}
                >
                  Módulo
                </th>
                {ACTIONS.map((action) => (
                  <th
                    key={action.key}
                    className="text-center px-2 py-2 border-r border-slate-700 last:border-r-0"
                    style={{ width: 130 }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-slate-200">
                        {action.label}
                      </span>
                      <ColCycleBtn
                        color={action.colColor}
                        onClick={() => cycleColumn(action.key)}
                      />
                    </div>
                  </th>
                ))}
                <th className="text-center px-2 py-2" style={{ width: 56 }}>
                  <span className="text-[10px] text-slate-600">Linha</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {GROUPS.map((group) => {
                const groupModules = MODULES.filter((m) => m.group === group);
                return [
                  /* Group row */
                  <tr key={`grp-${group}`}>
                    <td
                      colSpan={ACTIONS.length + 2}
                      className="px-4 py-1.5 bg-slate-100 border-y border-slate-200"
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {group}
                      </span>
                    </td>
                  </tr>,

                  /* Module rows */
                  ...groupModules.map((mod, idx) => {
                    const Icon = mod.icon;
                    const perm = formData.permissions[mod.key] ?? { ...EMPTY };
                    const rowActive = ACTIONS.filter(
                      (a) => perm[a.key] !== "none",
                    ).length;
                    return (
                      <tr
                        key={mod.key}
                        className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors group ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        }`}
                      >
                        {/* Module label */}
                        <td
                          className="px-4 py-0 border-r border-slate-100"
                          style={{ height: 44 }}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-700">
                              {mod.label}
                            </span>
                            {rowActive > 0 && (
                              <span className="ml-auto text-[10px] text-slate-400">
                                {rowActive}/{ACTIONS.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Scope cells */}
                        {ACTIONS.map((action) => (
                          <td
                            key={action.key}
                            className="px-2 py-0.5 border-r border-slate-100 last:border-r-0"
                            style={{ height: 44 }}
                          >
                            <ScopeCell
                              value={perm[action.key]}
                              onChange={(v) => setScope(mod.key, action.key, v)}
                            />
                          </td>
                        ))}

                        {/* Row quick-toggle */}
                        <td
                          className="px-2 py-0 text-center"
                          style={{ height: 44 }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => cycleRow(mod.key)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100"
                              >
                                tudo
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              className="text-[11px] bg-slate-800 text-white border-slate-700"
                            >
                              Ativar / desativar toda a linha
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="border-t px-5 py-3 bg-slate-50 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-8 text-sm px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSave(formData);
                handleClose();
              }}
              disabled={!formData.name.trim()}
              className="h-8 text-sm px-5 text-white border-0"
              style={{
                background: !formData.name.trim()
                  ? undefined
                  : "linear-gradient(135deg, #1e3a8a, #312e81)",
              }}
            >
              Salvar Perfil
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs text-slate-600 font-normal"
            >
              {summary.active} permissões ativas
            </Badge>
            {summary.total_all > 0 && (
              <Badge
                variant="outline"
                className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50 font-normal"
              >
                {summary.total_all}× acesso total
              </Badge>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
