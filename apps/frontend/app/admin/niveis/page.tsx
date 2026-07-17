// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import {
  Edit,
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  Star,
  CheckCircle2,
  Award,
  X,
  Users,
  Percent,
  Gift,
  Crown,
  Zap,
  Target,
  BarChart3,
  Trophy,
  Shield,
  Gem,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";

const LEVEL_THEMES: Record<
  string,
  {
    accent: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    statBg: string;
    statBorder: string;
    statIconColor: string;
    neonRing: string;
    glowShadow: string;
  }
> = {
  Bronze: {
    accent: "border-l-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950/30",
    badgeBorder: "border-amber-200 dark:border-amber-700/40",
    badgeText: "text-amber-700 dark:text-amber-400",
    statBg: "bg-amber-50/70 dark:bg-amber-950/20",
    statBorder: "border-amber-100 dark:border-amber-900/40",
    statIconColor: "text-amber-500",
    neonRing:
      "ring-1 ring-amber-300/30 dark:ring-amber-500/20 hover:ring-amber-400/70 dark:hover:ring-amber-400/50",
    glowShadow:
      "shadow-sm shadow-amber-400/10 hover:shadow-xl hover:shadow-amber-400/20 dark:shadow-amber-400/15 dark:hover:shadow-amber-400/35",
  },
  Silver: {
    accent: "border-l-slate-400",
    badgeBg: "bg-slate-50 dark:bg-slate-800/50",
    badgeBorder: "border-slate-300 dark:border-slate-600/50",
    badgeText: "text-slate-600 dark:text-slate-300",
    statBg: "bg-slate-50/70 dark:bg-slate-800/30",
    statBorder: "border-slate-200 dark:border-slate-700/40",
    statIconColor: "text-slate-500 dark:text-slate-400",
    neonRing:
      "ring-1 ring-slate-300/40 dark:ring-slate-500/25 hover:ring-slate-400/70 dark:hover:ring-slate-400/50",
    glowShadow:
      "shadow-sm shadow-slate-400/10 hover:shadow-xl hover:shadow-slate-400/15 dark:shadow-slate-400/15 dark:hover:shadow-slate-400/25",
  },
  Gold: {
    accent: "border-l-yellow-500",
    badgeBg: "bg-yellow-50 dark:bg-yellow-950/30",
    badgeBorder: "border-yellow-200 dark:border-yellow-700/40",
    badgeText: "text-yellow-700 dark:text-yellow-400",
    statBg: "bg-yellow-50/70 dark:bg-yellow-950/20",
    statBorder: "border-yellow-100 dark:border-yellow-900/40",
    statIconColor: "text-yellow-500",
    neonRing:
      "ring-1 ring-yellow-300/30 dark:ring-yellow-500/20 hover:ring-yellow-400/70 dark:hover:ring-yellow-400/50",
    glowShadow:
      "shadow-sm shadow-yellow-400/10 hover:shadow-xl hover:shadow-yellow-400/20 dark:shadow-yellow-400/15 dark:hover:shadow-yellow-400/35",
  },
  Platinum: {
    accent: "border-l-sky-500",
    badgeBg: "bg-sky-50 dark:bg-sky-950/30",
    badgeBorder: "border-sky-200 dark:border-sky-700/40",
    badgeText: "text-sky-700 dark:text-sky-400",
    statBg: "bg-sky-50/70 dark:bg-sky-950/20",
    statBorder: "border-sky-100 dark:border-sky-900/40",
    statIconColor: "text-sky-500",
    neonRing:
      "ring-1 ring-sky-300/30 dark:ring-sky-500/20 hover:ring-sky-400/70 dark:hover:ring-sky-400/50",
    glowShadow:
      "shadow-sm shadow-sky-400/10 hover:shadow-xl hover:shadow-sky-400/20 dark:shadow-sky-400/15 dark:hover:shadow-sky-400/35",
  },
  Diamond: {
    accent: "border-l-violet-500",
    badgeBg: "bg-violet-50 dark:bg-violet-950/30",
    badgeBorder: "border-violet-200 dark:border-violet-700/40",
    badgeText: "text-violet-700 dark:text-violet-400",
    statBg: "bg-violet-50/70 dark:bg-violet-950/20",
    statBorder: "border-violet-100 dark:border-violet-900/40",
    statIconColor: "text-violet-500",
    neonRing:
      "ring-1 ring-violet-300/30 dark:ring-violet-500/20 hover:ring-violet-400/70 dark:hover:ring-violet-400/50",
    glowShadow:
      "shadow-sm shadow-violet-400/10 hover:shadow-xl hover:shadow-violet-400/20 dark:shadow-violet-400/15 dark:hover:shadow-violet-400/35",
  },
};

const DEFAULT_THEME = {
  accent: "border-l-blue-500",
  badgeBg: "bg-blue-50 dark:bg-blue-950/30",
  badgeBorder: "border-blue-200 dark:border-blue-700/40",
  badgeText: "text-blue-700 dark:text-blue-400",
  statBg: "bg-blue-50/70 dark:bg-blue-950/20",
  statBorder: "border-blue-100 dark:border-blue-900/40",
  statIconColor: "text-blue-500",
  neonRing:
    "ring-1 ring-blue-300/30 dark:ring-blue-500/20 hover:ring-blue-400/70 dark:hover:ring-blue-400/50",
  glowShadow:
    "shadow-sm shadow-blue-400/10 hover:shadow-xl hover:shadow-blue-400/20 dark:shadow-blue-400/15 dark:hover:shadow-blue-400/35",
};

const LEVEL_ICON_MAP: Record<string, { gradient: string; Icon: any }> = {
  Bronze: { gradient: "from-amber-500 to-orange-600", Icon: Award },
  Silver: { gradient: "from-slate-400 to-slate-600", Icon: Star },
  Gold: { gradient: "from-yellow-400 to-amber-500", Icon: Trophy },
  Platinum: { gradient: "from-sky-400 to-blue-600", Icon: Shield },
  Diamond: { gradient: "from-violet-500 to-purple-700", Icon: Gem },
};

// Levels are loaded from API in the component

export default function NiveisPage() {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const [partnerLevels, setPartnerLevels] = useState<any[]>([]);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({ open: false, id: null, name: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLevels = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await apiClient.getLevels();
      const raw = res.data || (Array.isArray(res) ? res : []);
      const data = raw.map((l: any) => ({
        ...l,
        benefits:
          typeof l.benefits === "string"
            ? (() => {
                try {
                  const p = JSON.parse(l.benefits);
                  return Array.isArray(p) ? p : [];
                } catch {
                  return [];
                }
              })()
            : Array.isArray(l.benefits)
              ? l.benefits
              : [],
      }));
      setPartnerLevels(data);
    } catch (err: any) {
      console.error("[NiveisPage] Failed to load levels:", err);
      setLoadError(err?.message || "Erro ao carregar níveis. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const handleSaveLevel = async (levelData: any) => {
    try {
      if (levelData.id) {
        const res: any = await apiClient.updateLevel(levelData.id, levelData);
        setPartnerLevels((levels) =>
          levels.map((level) =>
            level.id === levelData.id ? res || levelData : level,
          ),
        );
      } else {
        const res: any = await apiClient.createLevel(levelData);
        setPartnerLevels((levels) => [
          ...levels,
          res || { ...levelData, id: Date.now() },
        ]);
      }
    } catch (err) {
      console.error("[NiveisPage] Failed to save level:", err);
    }
    setEditingLevel(null);
    setIsDialogOpen(false);
  };

  const handleDeleteLevel = async (id: number) => {
    try {
      await apiClient.deleteLevel(id);
    } catch (err) {
      console.error("[NiveisPage] Failed to delete level:", err);
    }
    setPartnerLevels((levels) => levels.filter((level) => level.id !== id));
  };

  const confirmDelete = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const openEditDialog = (level?: any) => {
    setEditingLevel(
      level || {
        name: "",
        description: "",
        icon: "🌟",
        color: "#4F46E5",
        gradient: "from-blue-600 to-cyan-600",
        min_mrr: 0,
        max_mrr: 0,
        led_agencies_min: 0,
        led_agencies_mrr_min: 0,
        premium_project_limit: 0,
        commission_rate: 0,
        extra_discount: 10,
        receives_leads_premium: false,
        requires_partner: false,
        level_up_bonus_credits: 0,
        benefits: [],
      },
    );
    setIsDialogOpen(true);
  };

  const formatMrrRange = (min: number, max: number | null) => {
    if (min === 0 && max !== null)
      return `até R$ ${max.toLocaleString("pt-BR")}`;
    if (max === null) return `acima de R$ ${(min - 1).toLocaleString("pt-BR")}`;
    return `R$ ${min.toLocaleString("pt-BR")} a ${max.toLocaleString("pt-BR")}`;
  };

  const formatPremiumLimit = (level: any) => {
    if (!level.premium_project_limit && level.name === "Diamond")
      return "Acima de R$ 6.000";
    if (!level.premium_project_limit) return "—";
    return `até R$ ${level.premium_project_limit.toLocaleString("pt-BR")}`;
  };

  if (loading) {
    return <PageLoader text="Carregando níveis…" />;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <TrendingUp className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar níveis
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {loadError}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLevels}
          className="gap-2"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Award}
        title="Níveis do Programa Partner"
        description="Configure os 5 níveis do Programa Allka Partners com critérios de progressão, benefícios e regras de comissão"
        actions={
          <>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openEditDialog()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Novo Nível
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar novo nível</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PinToTrayButton id="page-niveis" label="Níveis do Programa Partner" icon={Award} path="/admin/niveis" />
          </>
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-6">
      <div className="grid gap-4">
        {partnerLevels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Award className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum nível cadastrado ainda.</p>
            <Button
              size="sm"
              onClick={() => openEditDialog()}
              className="btn-brand gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar primeiro nível
            </Button>
          </div>
        )}

        {partnerLevels.map((level, index) => {
          const theme = LEVEL_THEMES[level.name] ?? DEFAULT_THEME;
          const levelConfig = LEVEL_ICON_MAP[level.name] ?? {
            gradient: "from-blue-500 to-indigo-600",
            Icon: Award,
          };
          const LevelIcon = levelConfig.Icon;
          return (
            <div
              key={level.id}
              className="animate-in fade-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Card
                className={`overflow-hidden bg-white dark:bg-slate-900 border-0 border-l-4 ${theme.accent} ${theme.neonRing} ${theme.glowShadow} transition-all duration-200`}
              >
                {/* ── HEADER ── */}
                <CardHeader className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Modern gradient icon badge */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-12 h-12 rounded-xl bg-linear-to-br ${levelConfig.gradient} flex items-center justify-center shadow-md`}
                        >
                          <LevelIcon className="h-6 w-6 text-white drop-shadow-sm" />
                        </div>
                        <span
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow border-2 border-white dark:border-slate-900"
                          style={{ backgroundColor: level.color ?? "#6B7280" }}
                        >
                          {level.sort_order ?? index + 1}
                        </span>
                      </div>

                      {/* Name + badges + description */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800 dark:text-white">
                            {level.name}
                          </h3>
                          {level.requires_partner && (
                            <Badge
                              className={`border text-xs font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                            >
                              <Crown className="h-3 w-3 mr-1" />
                              Requer Partner
                            </Badge>
                          )}
                          {level.receives_leads_premium && (
                            <Badge className="border text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400">
                              <Zap className="h-3 w-3 mr-1" />
                              Leads Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {level.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(level)}
                        className="h-7 w-7 p-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(level.id, level.name)}
                        className="h-7 w-7 p-0 border-red-100 dark:border-red-900/40 bg-white dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 py-3 space-y-3 dark:bg-slate-900">
                  {/* ── CRITÉRIOS DE PROGRESSÃO ── */}
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      Critérios de Progressão
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div
                        className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <DollarSign
                            className={`h-3 w-3 ${theme.statIconColor}`}
                          />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                            MRR Consumo
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {formatMrrRange(level.min_mrr, level.max_mrr)}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Users className={`h-3 w-3 ${theme.statIconColor}`} />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                            Ag. Lideradas
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {level.led_agencies_min > 0
                            ? `${level.led_agencies_min} ativas`
                            : "—"}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <BarChart3
                            className={`h-3 w-3 ${theme.statIconColor}`}
                          />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                            MRR Lideradas
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {level.led_agencies_mrr_min > 0
                            ? `R$ ${level.led_agencies_mrr_min.toLocaleString("pt-BR")}`
                            : "—"}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Target
                            className={`h-3 w-3 ${theme.statIconColor}`}
                          />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                            Proj. Premium
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {formatPremiumLimit(level)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── PERKS ── */}
                  {(level.commission_rate > 0 ||
                    level.extra_discount > 0 ||
                    level.level_up_bonus_credits > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {level.commission_rate > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                        >
                          <TrendingUp className="h-2.5 w-2.5" />
                          {level.commission_rate}% comissão sobre MRR das
                          lideradas
                        </span>
                      )}
                      {level.extra_discount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400">
                          <Percent className="h-2.5 w-2.5" />+
                          {level.extra_discount}% desconto adicional nas
                          contratações
                        </span>
                      )}
                      {level.level_up_bonus_credits > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-700/40 text-purple-700 dark:text-purple-400">
                          <Gift className="h-2.5 w-2.5" />
                          R${" "}
                          {level.level_up_bonus_credits.toLocaleString(
                            "pt-BR",
                          )}{" "}
                          em créditos ao atingir nível
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── BENEFÍCIOS DESBLOQUEADOS ── */}
                  {(level.benefits ?? []).length > 0 && (
                    <div>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        Benefícios Desbloqueados
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(level.benefits ?? []).map((benefit, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 opacity-70 shrink-0" />
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 z-[70] [&>button:last-child]:top-3 [&>button:last-child]:right-3 [&>button:last-child]:p-1.5 [&>button:last-child]:hover:bg-white/20 [&>button:last-child_svg]:size-4"
          style={{
            left: `${sidebarWidth - 2}px`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
            height: "auto",
            width: `calc(100vw - ${sidebarWidth - 2}px)`,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{
              background:
                "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
            }}
          >
            <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
              <SheetTitle className="text-sm font-bold text-white truncate">
                {editingLevel?.id ? "Editar Nível" : "Novo Nível Partner"}
              </SheetTitle>
              <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
                Configure critérios, benefícios e regras do nível
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-3xl mx-auto">
              {editingLevel && (
                <LevelForm
                  level={editingLevel}
                  onSave={handleSaveLevel}
                  onCancel={() => setIsDialogOpen(false)}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, name: "" })}
        onConfirm={() => {
          handleDeleteLevel(deleteDialog.id!);
          setDeleteDialog({ open: false, id: null, name: "" });
        }}
        title="Excluir nível"
        message={`Tem certeza que deseja excluir o nível "${deleteDialog.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
      />
    </div>
    </div>
    </div>
    </div>
  );
}

const ICON_SUGGESTIONS = [
  "🥉",
  "🥈",
  "🥇",
  "💎",
  "🏆",
  "⭐",
  "🚀",
  "💫",
  "🌟",
  "👑",
  "🎯",
  "🔥",
  "💼",
  "🎖️",
];
const COLOR_PRESETS = [
  { label: "Bronze", value: "#CD7F32" },
  { label: "Prata", value: "#94A3B8" },
  { label: "Ouro", value: "#F59E0B" },
  { label: "Platina", value: "#38BDF8" },
  { label: "Diamante", value: "#8B5CF6" },
  { label: "Esmeralda", value: "#10B981" },
  { label: "Rubi", value: "#EF4444" },
  { label: "Índigo", value: "#4F46E5" },
];

function LevelForm({ level, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({ icon: "🌟", ...level });
  const [benefits, setBenefits] = useState<string[]>(level.benefits || []);
  const [newBenefit, setNewBenefit] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: any) => {
    setFormData((f: any) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Nome é obrigatório";
    if (Number(formData.min_mrr) < 0) e.min_mrr = "Valor inválido";
    if (
      Number(formData.commission_rate) < 0 ||
      Number(formData.commission_rate) > 100
    )
      e.commission_rate = "Entre 0 e 100";
    if (
      Number(formData.extra_discount) < 0 ||
      Number(formData.extra_discount) > 100
    )
      e.extra_discount = "Entre 0 e 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...formData, benefits });
  };

  const addBenefit = () => {
    const trimmed = newBenefit.trim();
    if (trimmed) {
      setBenefits((b) => [...b, trimmed]);
      setNewBenefit("");
    }
  };

  const removeBenefit = (i: number) =>
    setBenefits((b) => b.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
          style={{
            backgroundColor: formData.color + "22",
            border: `2px solid ${formData.color}55`,
          }}
        >
          {formData.icon || "🌟"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {formData.name || (
              <span className="text-slate-400 font-normal">Nome do nível</span>
            )}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {formData.description || "Descrição do nível"}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {Number(formData.commission_rate) > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {formData.commission_rate}% comissão
            </span>
          )}
          {formData.receives_leads_premium && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Leads Premium
            </span>
          )}
        </div>
        <div
          className="shrink-0 w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: formData.color }}
        />
      </div>

      {/* Identidade */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Identidade
        </p>
        <div className="grid grid-cols-[1fr,80px,52px] gap-3 items-start">
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Nome <span className="text-red-400">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Gold, Platinum, Diamond..."
              className={`mt-1 border-slate-200 text-slate-900 ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Ícone</Label>
            <Input
              value={formData.icon}
              onChange={(e) => set("icon", e.target.value)}
              className="mt-1 border-slate-200 text-center text-lg"
              maxLength={2}
            />
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">Cor</Label>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => set("color", e.target.value)}
              className="mt-1 border-slate-200 h-9 w-full cursor-pointer p-0.5"
            />
          </div>
        </div>

        <div className="mt-2.5 flex gap-1.5 flex-wrap">
          {ICON_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => set("icon", emoji)}
              className={`w-8 h-8 rounded-lg text-base transition-colors ${
                formData.icon === emoji
                  ? "bg-blue-100 ring-1 ring-blue-400"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => set("color", preset.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${
                formData.color === preset.value
                  ? "border-slate-400 bg-slate-100 font-medium"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: preset.value }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Descrição */}
      <div>
        <Label className="text-slate-700 text-sm font-medium">Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descreva brevemente este nível e seu propósito..."
          rows={2}
          className="mt-1 border-slate-200 text-slate-900 resize-none"
        />
      </div>

      {/* Critérios de Progressão */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Critérios de Progressão
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              MRR Consumo Mínimo (R$)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.min_mrr}
              onChange={(e) => set("min_mrr", Number(e.target.value))}
              className={`mt-1 border-slate-200 text-slate-900 ${errors.min_mrr ? "border-red-400" : ""}`}
            />
            {errors.min_mrr && (
              <p className="text-xs text-red-500 mt-0.5">{errors.min_mrr}</p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              MRR Consumo Máximo (R$)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.max_mrr ?? ""}
              onChange={(e) =>
                set(
                  "max_mrr",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              placeholder="Deixe vazio para ilimitado"
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Vazio = sem limite (nível máximo)
            </p>
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Agências Lideradas (mín. ativas)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.led_agencies_min}
              onChange={(e) => set("led_agencies_min", Number(e.target.value))}
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Apenas agências com MRR no período
            </p>
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              MRR das Agências Lideradas (R$)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.led_agencies_mrr_min}
              onChange={(e) =>
                set("led_agencies_mrr_min", Number(e.target.value))
              }
              className="mt-1 border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Limite de Projeto Premium (R$)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.premium_project_limit ?? ""}
              onChange={(e) =>
                set(
                  "premium_project_limit",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              placeholder="Vazio = acima do nível anterior"
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Valor máximo por lead premium recebido
            </p>
          </div>
        </div>
      </div>

      {/* Regras e Benefícios */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Regras e Benefícios
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Comissão sobre MRR lideradas (%)
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.commission_rate}
                onChange={(e) => set("commission_rate", Number(e.target.value))}
                className={`border-slate-200 text-slate-900 pr-8 ${errors.commission_rate ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                %
              </span>
            </div>
            {errors.commission_rate && (
              <p className="text-xs text-red-500 mt-0.5">
                {errors.commission_rate}
              </p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Desconto Adicional nas Contratações (%)
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.extra_discount}
                onChange={(e) => set("extra_discount", Number(e.target.value))}
                className={`border-slate-200 text-slate-900 pr-8 ${errors.extra_discount ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                %
              </span>
            </div>
            {errors.extra_discount && (
              <p className="text-xs text-red-500 mt-0.5">
                {errors.extra_discount}
              </p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Créditos Bônus ao Atingir Nível (R$)
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.level_up_bonus_credits}
              onChange={(e) =>
                set("level_up_bonus_credits", Number(e.target.value))
              }
              className="mt-1 border-slate-200 text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Recebe Leads Premium
              </p>
              <p className="text-xs text-slate-500">
                Partner recebe projetos com leads premium da Allka
              </p>
            </div>
            <Switch
              checked={!!formData.receives_leads_premium}
              onCheckedChange={(v) => set("receives_leads_premium", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Requer Status Partner
              </p>
              <p className="text-xs text-slate-500">
                Acesso mediante convite formal da Allka
              </p>
            </div>
            <Switch
              checked={!!formData.requires_partner}
              onCheckedChange={(v) => set("requires_partner", v)}
            />
          </div>
        </div>
      </div>

      {/* Benefícios */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Benefícios
          {benefits.length > 0 && (
            <span className="ml-2 text-blue-500 normal-case font-normal">
              {benefits.length} adicionado{benefits.length > 1 ? "s" : ""}
            </span>
          )}
        </p>

        {benefits.length > 0 && (
          <div className="space-y-1.5 mb-2.5">
            {benefits.map((benefit, i) => (
              <div key={i} className="group flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1">{benefit}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBenefit();
              }
            }}
            placeholder="Ex: Reunião trimestral com fundadores..."
            className="border-slate-200 text-slate-900 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addBenefit}
            disabled={!newBenefit.trim()}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        {benefits.length === 0 && (
          <p className="text-xs text-slate-400 mt-1.5">
            Pressione Enter ou clique em "Adicionar" para incluir cada
            benefício.
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <Button onClick={handleSave} className="btn-brand">
          {formData.id ? "Salvar alterações" : "Criar nível"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
