// @ts-nocheck
import { useState, useEffect } from "react";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  Edit,
  Plus,
  Trash2,
  TrendingUp,
  Star,
  CheckCircle2,
  Award,
  X,
  Users,
  Gift,
  Zap,
  Target,
  BarChart3,
  ClipboardCheck,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  MessageSquare,
  Copy,
  ChevronRight,
  Loader2,
  Trophy,
  Shield,
  Gem,
  Crown,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { useNomadeLevels } from "@/hooks/useNomadeLevels";
import { useNomades } from "@/hooks/useNomades";
import { apiClient } from "@/lib/api-client";
import { PageLoader } from "@/components/ui/loading";

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
  Leader: {
    accent: "border-l-rose-500",
    badgeBg: "bg-rose-50 dark:bg-rose-950/30",
    badgeBorder: "border-rose-200 dark:border-rose-700/40",
    badgeText: "text-rose-700 dark:text-rose-400",
    statBg: "bg-rose-50/70 dark:bg-rose-950/20",
    statBorder: "border-rose-100 dark:border-rose-900/40",
    statIconColor: "text-rose-500",
    neonRing:
      "ring-1 ring-rose-300/30 dark:ring-rose-500/20 hover:ring-rose-400/70 dark:hover:ring-rose-400/50",
    glowShadow:
      "shadow-sm shadow-rose-400/10 hover:shadow-xl hover:shadow-rose-400/20 dark:shadow-rose-400/15 dark:hover:shadow-rose-400/35",
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
  Leader: { gradient: "from-rose-500 to-pink-600", Icon: Crown },
};

// Tasks/90d and min rating criteria to MAINTAIN current level
const MAINTAIN_CRITERIA: Record<
  string,
  { minTasks: number; minRating: number }
> = {
  Bronze: { minTasks: 0, minRating: 0 },
  Silver: { minTasks: 30, minRating: 4.0 },
  Gold: { minTasks: 60, minRating: 4.5 },
  Platinum: { minTasks: 0, minRating: 4.5 },
  Diamond: { minTasks: 0, minRating: 4.5 },
  Leader: { minTasks: 0, minRating: 4.5 },
};

// Tasks/90d and min rating criteria to be PROMOTED to next level
const NEXT_CRITERIA: Record<
  string,
  { minTasks: number; minRating: number; label: string }
> = {
  Bronze: { minTasks: 30, minRating: 4.0, label: "Silver" },
  Silver: { minTasks: 60, minRating: 4.5, label: "Gold" },
  Gold: { minTasks: 60, minRating: 4.5, label: "Platinum (convite)" },
  Platinum: { minTasks: 0, minRating: 4.5, label: "Líder (convite)" },
  Diamond: { minTasks: 0, minRating: 4.5, label: "Líder (convite)" },
  Leader: { minTasks: 0, minRating: 0, label: "—" },
};

const COMM_TEMPLATES = [
  {
    title: "🏆 Conquista de Nível",
    text: "Parabéns, {nome}! Você atingiu o nível {nivel} na Allka! Continue com esse desempenho incrível — novos benefícios e mais oportunidades te esperam.",
  },
  {
    title: "⬇️ Regresso de Nível",
    text: "Olá, {nome}. Identificamos que seu desempenho recente ficou abaixo dos critérios do nível {nivel_atual}. Você foi movido para {nivel_novo}. Conte com nosso suporte para retomar seu crescimento!",
  },
  {
    title: "💎 Convite Platinum",
    text: "Parabéns, {nome}! Pela sua excelência, você foi selecionado para o nível Platinum — com remuneração mínima garantida e acesso exclusivo a squads especiais. Aguarde nosso contato.",
  },
  {
    title: "🔥 Convite Líder",
    text: "Parabéns, {nome}! Você foi convidado a se tornar Líder Allka — assumindo a mentoria de novos profissionais e uma remuneração fixa mensal. É o ápice da jornada nômade.",
  },
];

function RevisionTab() {
  const [filter, setFilter] = useState("Todos");
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [promotedIds, setPromotedIds] = useState<Set<number>>(new Set());
  const [demotedIds, setDemotedIds] = useState<Set<number>>(new Set());
  const [lastRevision, setLastRevision] = useState("15/01/2026");
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [revisionNomads, setRevisionNomads] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .getNomades({ limit: "500" })
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setRevisionNomads(
          list.map((n: any, i: number) => ({
            id: n.id ?? i,
            name: n.name ?? n.nome ?? "Nômade",
            level: n.level ?? n.nivel ?? "Bronze",
            tasks90d: n.tasks90d ?? n.completedTasks ?? 0,
            rating: n.rating ?? n.averageRating ?? 5.0,
            specialties: n.specialties ?? n.especialidades ?? [],
            eligibility: n.eligibility ?? "maintain",
          })),
        );
      })
      .catch(() => {});
  }, []);

  const eligible = revisionNomads.filter(
    (n) => n.eligibility === "promote",
  ).length;
  const atRisk = revisionNomads.filter(
    (n) => n.eligibility === "demote" || n.eligibility === "warn",
  ).length;

  const handleCopyTemplate = (title: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedTemplate(title);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleStartRevision = () => {
    const today = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setLastRevision(today);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-linear-to-br from-green-500 to-emerald-600 text-white border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-80">
              Elegíveis para Promoção
            </p>
            <p className="text-3xl font-bold mt-1">{eligible}</p>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-red-500 to-rose-600 text-white border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-80">
              Em Risco de Rebaixamento
            </p>
            <p className="text-3xl font-bold mt-1">{atRisk}</p>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-amber-500 to-yellow-600 text-white border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-80">
              Convites Platinum Pendentes
            </p>
            <p className="text-3xl font-bold mt-1">1</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Última Revisão
            </p>
            <p className="text-base font-bold mt-1">{lastRevision}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs w-full"
              onClick={handleStartRevision}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Iniciar Nova Revisão
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          Filtrar:
        </span>
        {[
          "Todos",
          "Bronze",
          "Silver",
          "Gold",
          "Platinum",
          "Diamond",
          "Leader",
        ].map((l) => (
          <Badge
            key={l}
            variant={filter === l ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => setFilter(l)}
          >
            {l}
          </Badge>
        ))}
      </div>

      {/* Nomad rows */}
      <div className="space-y-3">
        {revisionNomads
          .filter((n) => filter === "Todos" || n.level === filter)
          .map((nomad) => {
            const maintain = MAINTAIN_CRITERIA[nomad.level] || {
              minTasks: 0,
              minRating: 0,
            };
            const next = NEXT_CRITERIA[nomad.level];
            const meetsMaintain =
              nomad.tasks90d >= maintain.minTasks &&
              nomad.rating >= maintain.minRating;
            const rowBorder =
              nomad.eligibility === "promote"
                ? "border-l-4 border-l-green-400 bg-green-50/40"
                : nomad.eligibility === "demote"
                  ? "border-l-4 border-l-red-400 bg-red-50/40"
                  : nomad.eligibility === "warn"
                    ? "border-l-4 border-l-orange-400 bg-orange-50/40"
                    : "";
            const actioned =
              promotedIds.has(nomad.id) || demotedIds.has(nomad.id);

            return (
              <Card
                key={nomad.id}
                className={`shadow-sm ${rowBorder} ${actioned ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Identity */}
                    <div className="flex items-center gap-3 min-w-45">
                      <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {nomad.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{nomad.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 mt-0.5 ${
                            LEVEL_THEMES[nomad.level]
                              ? `${LEVEL_THEMES[nomad.level].badgeBg} ${LEVEL_THEMES[nomad.level].badgeBorder} ${LEVEL_THEMES[nomad.level].badgeText}`
                              : ""
                          }`}
                        >
                          {nomad.level}
                        </Badge>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex-1 grid grid-cols-3 gap-3 min-w-70">
                      {/* Tasks/90d */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Tarefas/90d
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${nomad.tasks90d >= maintain.minTasks ? "bg-green-500" : "bg-red-500"}`}
                              style={{
                                width:
                                  maintain.minTasks > 0
                                    ? `${Math.min(100, (nomad.tasks90d / Math.max(next?.minTasks || maintain.minTasks, 1)) * 100)}%`
                                    : "100%",
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${nomad.tasks90d >= maintain.minTasks ? "text-green-600" : "text-red-600"}`}
                          >
                            {nomad.tasks90d}
                          </span>
                        </div>
                        {maintain.minTasks > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            mín. {maintain.minTasks}
                          </p>
                        )}
                      </div>

                      {/* Rating */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Nota Média
                        </p>
                        <div className="flex items-center gap-1">
                          <Star
                            className={`h-3 w-3 ${nomad.rating >= maintain.minRating ? "fill-yellow-400 text-yellow-400" : "fill-red-400 text-red-400"}`}
                          />
                          <span
                            className={`text-sm font-bold ${nomad.rating >= maintain.minRating ? "text-green-600" : "text-red-600"}`}
                          >
                            {nomad.rating.toFixed(1)}
                          </span>
                        </div>
                        {maintain.minRating > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            mín. {maintain.minRating}
                          </p>
                        )}
                      </div>

                      {/* On-time */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          No Prazo
                        </p>
                        <span
                          className={`text-sm font-bold ${nomad.ontime >= 85 ? "text-green-600" : "text-orange-600"}`}
                        >
                          {nomad.ontime}%
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          mín. 85%
                        </p>
                      </div>
                    </div>

                    {/* Eligibility + Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {promotedIds.has(nomad.id) && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          ✓ Promovido
                        </Badge>
                      )}
                      {demotedIds.has(nomad.id) && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          ⬇ Rebaixado
                        </Badge>
                      )}
                      {invitedIds.has(nomad.id) && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          📨 Convite Enviado
                        </Badge>
                      )}
                      {!actioned && !invitedIds.has(nomad.id) && (
                        <>
                          {nomad.eligibility === "promote" && (
                            <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />⬆
                              Elegível para Promoção
                            </Badge>
                          )}
                          {nomad.eligibility === "maintain" && (
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                              <MinusCircle className="h-3 w-3 mr-1" />✓ Manter
                            </Badge>
                          )}
                          {nomad.eligibility === "demote" && (
                            <Badge className="bg-red-100 text-red-700 border border-red-300 text-xs">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />⬇
                              Critérios não atendidos
                            </Badge>
                          )}
                          {nomad.eligibility === "warn" && (
                            <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />⚠
                              Atenção necessária
                            </Badge>
                          )}
                        </>
                      )}

                      {/* Action buttons */}
                      {!actioned && (
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {nomad.eligibility === "promote" &&
                            nomad.level === "Gold" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                onClick={() =>
                                  setInvitedIds(
                                    (prev) => new Set([...prev, nomad.id]),
                                  )
                                }
                              >
                                💎 Convidar Platinum
                              </Button>
                            )}
                          {nomad.eligibility === "promote" &&
                            nomad.level === "Platinum" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                onClick={() =>
                                  setInvitedIds(
                                    (prev) => new Set([...prev, nomad.id]),
                                  )
                                }
                              >
                                🔥 Convidar Líder
                              </Button>
                            )}
                          {nomad.eligibility === "promote" &&
                            ["Bronze", "Silver"].includes(nomad.level) && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() =>
                                  setPromotedIds(
                                    (prev) => new Set([...prev, nomad.id]),
                                  )
                                }
                              >
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                                Promover
                              </Button>
                            )}
                          {(nomad.eligibility === "demote" ||
                            nomad.eligibility === "warn") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() =>
                                setDemotedIds(
                                  (prev) => new Set([...prev, nomad.id]),
                                )
                              }
                            >
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Rebaixar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() =>
                              setPromotedIds(
                                (prev) => new Set([...prev, nomad.id]),
                              )
                            }
                          >
                            ✓ Manter
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Communication templates */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-base font-semibold">Pacote de Comunicação</p>
              <p className="text-xs text-muted-foreground">
                Templates prontos para comunicar promoções e recessões
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMM_TEMPLATES.map((t) => (
            <div
              key={t.title}
              className="rounded-lg border p-3 bg-muted/30 space-y-2"
            >
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {t.text}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs w-full"
                onClick={() => handleCopyTemplate(t.title, t.text)}
              >
                {copiedTemplate === t.title ? (
                  <>
                    <ChevronRight className="h-3 w-3 mr-1 text-green-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar template
                  </>
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NiveisNomadesPage() {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const {
    levels: apiLevels,
    loading: levelsLoading,
    error: levelsError,
    refetch: refetchLevels,
    createLevel,
    updateLevel,
    deleteLevel: apiDeleteLevel,
  } = useNomadeLevels();
  const { nomades: apiNomades, loading: nomadesLoading } = useNomades();
  const [nomadLevels, setNomadLevels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("config");
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: number | null;
    name: string;
  }>({ open: false, id: null, name: "" });

  // Sync API levels into local state (parse benefits JSON string if needed)
  useEffect(() => {
    if (apiLevels.length > 0) {
      const parsed = apiLevels.map((l: any) => ({
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
      setNomadLevels(parsed);
    }
  }, [apiLevels]);

  const handleSaveLevel = async (levelData: any) => {
    try {
      if (levelData.id) {
        await updateLevel(String(levelData.id), levelData);
      } else {
        await createLevel(levelData);
      }
    } catch {
      /* toast handled in hook */
    }
    setEditingLevel(null);
    setIsDialogOpen(false);
  };

  const handleDeleteLevel = async (id: number) => {
    try {
      await apiDeleteLevel(String(id));
    } catch {
      /* handled */
    }
    setNomadLevels((levels) => levels.filter((l) => l.id !== id));
  };

  const openEditDialog = (level?: any) => {
    setEditingLevel(
      level || {
        name: "",
        description: "",
        icon: "🌟",
        color: "#4F46E5",
        min_tasks_quarter: 0,
        min_rating: 0,
        max_rejection_rate: 100,
        min_ontime_rate: 0,
        bonus_percentage: 0,
        level_up_bonus_credits: 0,
        is_leader_level: false,
        benefits: [],
      },
    );
    setIsDialogOpen(true);
  };

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Award}
        title="Níveis de Nômades"
        description="Configure os níveis de gamificação dos nômades com critérios de performance, bônus e benefícios"
        actions={
          <>
            {activeTab === "config" && (
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
            )}
            <PinToTrayButton id="page-niveis-nomades" label="Níveis de Nômades" icon={Award} path="/admin/niveis-nomades" />
          </>
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="config">Configuração de Níveis</TabsTrigger>
          <TabsTrigger value="revisao">Revisão Trimestral</TabsTrigger>
        </TabsList>
        <TabsContent value="config">
          <div className="grid gap-4">
            {levelsLoading && <PageLoader text="Carregando níveis…" compact />}

            {!levelsLoading && levelsError && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-5 max-w-md text-center">
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    Erro ao carregar níveis
                  </p>
                  <p className="text-xs text-red-500 font-mono">
                    {levelsError}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchLevels}
                  className="gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {!levelsLoading && !levelsError && nomadLevels.length === 0 && (
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

            {!levelsLoading &&
              !levelsError &&
              nomadLevels.map((level, index) => {
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
                            {/* Gradient icon badge */}
                            <div className="relative shrink-0">
                              <div
                                className={`w-12 h-12 rounded-xl bg-linear-to-br ${levelConfig.gradient} flex items-center justify-center shadow-md`}
                              >
                                <LevelIcon className="h-6 w-6 text-white drop-shadow-sm" />
                              </div>
                              <span
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow border-2 border-white dark:border-slate-900"
                                style={{
                                  backgroundColor: level.color ?? "#6B7280",
                                }}
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
                                {level.is_leader_level && (
                                  <Badge
                                    className={`border text-xs font-medium ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                                  >
                                    <Crown className="h-3 w-3 mr-1" />
                                    Liderança
                                  </Badge>
                                )}
                                {level.bonus_percentage > 0 && (
                                  <Badge className="border text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400">
                                    <TrendingUp className="h-3 w-3 mr-1" />+
                                    {level.bonus_percentage}% bônus
                                  </Badge>
                                )}
                                {level.min_tasks_quarter === 0 &&
                                  !level.is_leader_level && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    >
                                      Nível base
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
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  id: level.id,
                                  name: level.name,
                                })
                              }
                              className="h-7 w-7 p-0 border-red-100 dark:border-red-900/40 bg-white dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 py-3 space-y-3 dark:bg-slate-900">
                        {/* ── CRITÉRIOS DE PERFORMANCE ── */}
                        <div>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                            Critérios de Performance
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div
                              className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <ClipboardCheck
                                  className={`h-3 w-3 ${theme.statIconColor}`}
                                />
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                  Tarefas/Trim.
                                </span>
                              </div>
                              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                                {level.min_tasks_quarter > 0
                                  ? `≥ ${level.min_tasks_quarter}`
                                  : "—"}
                              </p>
                            </div>
                            <div
                              className={`rounded-lg p-2.5 border ${theme.statBg} ${theme.statBorder}`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <Star
                                  className={`h-3 w-3 ${theme.statIconColor}`}
                                />
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                  Avaliação Mín.
                                </span>
                              </div>
                              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                                {level.min_rating > 0
                                  ? `≥ ${level.min_rating.toFixed(1)} ★`
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
                                  Entrega Prazo
                                </span>
                              </div>
                              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                                {level.min_ontime_rate > 0
                                  ? `≥ ${level.min_ontime_rate}%`
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
                                  Rejeição Máx.
                                </span>
                              </div>
                              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">
                                {level.max_rejection_rate < 100
                                  ? `≤ ${level.max_rejection_rate}%`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* ── PERKS ── */}
                        {(level.bonus_percentage > 0 ||
                          level.level_up_bonus_credits > 0) && (
                          <div className="flex flex-wrap gap-1.5">
                            {level.bonus_percentage > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                              >
                                <Zap className="h-2.5 w-2.5" />+
                                {level.bonus_percentage}% de bônus nas tarefas
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
                        {(Array.isArray(level.benefits) ? level.benefits : [])
                          .length > 0 && (
                          <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                              Benefícios Desbloqueados
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(level.benefits)
                                ? level.benefits
                                : []
                              ).map((benefit, i) => (
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
        </TabsContent>
        <TabsContent value="revisao">
          <RevisionTab />
        </TabsContent>
      </Tabs>

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
                {editingLevel?.id ? "Editar Nível" : "Novo Nível de Nômade"}
              </SheetTitle>
              <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
                Configure critérios de performance e benefícios
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
  { label: "Leader", value: "#F43F5E" },
  { label: "Esmeralda", value: "#10B981" },
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
    if (Number(formData.min_rating) < 0 || Number(formData.min_rating) > 5)
      e.min_rating = "Entre 0 e 5";
    if (
      Number(formData.max_rejection_rate) < 0 ||
      Number(formData.max_rejection_rate) > 100
    )
      e.max_rejection_rate = "Entre 0 e 100";
    if (
      Number(formData.min_ontime_rate) < 0 ||
      Number(formData.min_ontime_rate) > 100
    )
      e.min_ontime_rate = "Entre 0 e 100";
    if (
      Number(formData.bonus_percentage) < 0 ||
      Number(formData.bonus_percentage) > 100
    )
      e.bonus_percentage = "Entre 0 e 100";
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
          {Number(formData.bonus_percentage) > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              +{formData.bonus_percentage}% bônus
            </span>
          )}
          {formData.is_leader_level && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Líder
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
              placeholder="Ex: Silver, Gold, Platinum..."
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
              className={`w-8 h-8 rounded-lg text-base transition-colors ${formData.icon === emoji ? "bg-blue-100 ring-1 ring-blue-400" : "bg-slate-100 hover:bg-slate-200"}`}
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
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${formData.color === preset.value ? "border-slate-400 bg-slate-100 font-medium" : "border-slate-200 bg-white hover:border-slate-300"}`}
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

      {/* Critérios de Performance */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Critérios de Performance
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Tarefas Mínimas por Trimestre
            </Label>
            <Input
              type="number"
              min={0}
              value={formData.min_tasks_quarter}
              onChange={(e) => set("min_tasks_quarter", Number(e.target.value))}
              className="mt-1 border-slate-200 text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              0 = sem requisito mínimo
            </p>
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Avaliação Mínima (0–5)
            </Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={formData.min_rating}
              onChange={(e) => set("min_rating", Number(e.target.value))}
              className={`mt-1 border-slate-200 text-slate-900 ${errors.min_rating ? "border-red-400" : ""}`}
            />
            {errors.min_rating && (
              <p className="text-xs text-red-500 mt-0.5">{errors.min_rating}</p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Entrega no Prazo Mínima (%)
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.min_ontime_rate}
                onChange={(e) => set("min_ontime_rate", Number(e.target.value))}
                className={`border-slate-200 text-slate-900 pr-8 ${errors.min_ontime_rate ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                %
              </span>
            </div>
            {errors.min_ontime_rate && (
              <p className="text-xs text-red-500 mt-0.5">
                {errors.min_ontime_rate}
              </p>
            )}
          </div>
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Taxa de Rejeição Máxima (%)
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.max_rejection_rate}
                onChange={(e) =>
                  set("max_rejection_rate", Number(e.target.value))
                }
                className={`border-slate-200 text-slate-900 pr-8 ${errors.max_rejection_rate ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                %
              </span>
            </div>
            {errors.max_rejection_rate && (
              <p className="text-xs text-red-500 mt-0.5">
                {errors.max_rejection_rate}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recompensas */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Recompensas
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-slate-700 text-sm font-medium">
              Bônus nas Tarefas (%)
            </Label>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.bonus_percentage}
                onChange={(e) =>
                  set("bonus_percentage", Number(e.target.value))
                }
                className={`border-slate-200 text-slate-900 pr-8 ${errors.bonus_percentage ? "border-red-400" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                %
              </span>
            </div>
            {errors.bonus_percentage && (
              <p className="text-xs text-red-500 mt-0.5">
                {errors.bonus_percentage}
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

        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Nível de Liderança
            </p>
            <p className="text-xs text-slate-500">
              Nômade lidera e coordena uma equipe de outros nômades
            </p>
          </div>
          <Switch
            checked={!!formData.is_leader_level}
            onCheckedChange={(v) => set("is_leader_level", v)}
          />
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
            placeholder="Ex: Acesso antecipado a projetos de alto valor..."
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
