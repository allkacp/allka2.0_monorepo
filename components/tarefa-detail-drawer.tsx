// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  CheckSquare2,
  Loader2,
  AlertCircle,
  CalendarDays,
  FolderOpen,
  Package,
  Building2,
  User,
  MessageSquare,
  ExternalLink,
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  RotateCcw,
  MoreHorizontal,
  Rocket,
  RefreshCw,
  History,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Lock,
  ChevronRight,
  AlertTriangle,
  List,
  GraduationCap,
  Pencil,
  Save,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type StageStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "BLOQUEADA";

interface TaskStage {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  status: StageStatus;
  obrigatoria: boolean;
  briefing_necessario: boolean;
  checklist_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Stage status config ─────────────────────────────────────────────────────

const STAGE_STATUS_CFG: Record<
  StageStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
    icon: any;
  }
> = {
  PENDENTE: {
    label: "Para executar",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    dot: "bg-slate-400",
    icon: Clock,
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    icon: PlayCircle,
  },
  CONCLUIDA: {
    label: "Conclu\u00edda",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  BLOQUEADA: {
    label: "Bloqueada",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: PauseCircle,
  },
};

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { key: "dados", label: "Dados Gerais", icon: FileText },
  { key: "briefing", label: "Question\u00e1rio", icon: MessageSquare },
  { key: "etapas", label: "Etapas", icon: List },
  { key: "comentarios", label: "Coment\u00e1rios", icon: MessageSquare },
  { key: "aprovacao", label: "Itens p/ Aprova\u00e7\u00e3o", icon: ThumbsUp },
  { key: "entregas", label: "Hist. Entrega", icon: Rocket },
  { key: "historico", label: "Hist. Status", icon: History },
  { key: "acessos", label: "Acessos", icon: Lock },
  { key: "anexos", label: "Anexos", icon: Paperclip },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Status label / style helpers ────────────────────────────────────────────

const TASK_STATUS_LABELS: Record<string, string> = {
  PARA_LANCAMENTO: "Para lan\u00e7amento",
  EM_LANCAMENTO: "Em lan\u00e7amento",
  AGUARDANDO_INFORMACOES: "Aguard. informa\u00e7\u00f5es",
  AGUARDANDO_ETAPA: "Aguardando etapa",
  LIBERADA_PARA_EXECUCAO: "Enviada p/ execu\u00e7\u00e3o",
  EM_EXECUCAO: "Em execu\u00e7\u00e3o",
  EM_REVISAO: "Em revis\u00e3o",
  MELHORIAS_FINAIS: "Melhorias finais",
  EM_APROVACAO: "Aprova\u00e7\u00e3o - Ag\u00eancia",
  APROVACAO_PENDENTE_CLIENTE: "Aprova\u00e7\u00e3o - Cliente",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  CONCLUIDA: "Conclu\u00edda",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
  AGUARDANDO_NOMADE: "Aguard. n\u00f4made",
  ENTREGA_PENDENTE: "Entrega pendente",
  ENTREGA_ATRASADA: "Entrega atrasada",
  QUALIFICACAO_PENDENTE: "Qualifica\u00e7\u00e3o pendente",
  NAO_SEGUIU_ORIENTACOES: "N\u00e3o seguiu orienta\u00e7\u00f5es",
};

function getStatusLabel(status: string): string {
  return (
    TASK_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

function getStatusStyle(status: string): {
  bg: string;
  color: string;
  border: string;
} {
  if (["CONCLUIDA", "APROVADA"].includes(status))
    return {
      bg: "bg-emerald-50",
      color: "text-emerald-700",
      border: "border-emerald-200",
    };
  if (
    [
      "CANCELADA",
      "REPROVADA",
      "ENTREGA_ATRASADA",
      "NAO_SEGUIU_ORIENTACOES",
    ].includes(status)
  )
    return { bg: "bg-red-50", color: "text-red-700", border: "border-red-200" };
  if (["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE"].includes(status))
    return {
      bg: "bg-violet-50",
      color: "text-violet-700",
      border: "border-violet-200",
    };
  if (["EM_EXECUCAO"].includes(status))
    return {
      bg: "bg-blue-50",
      color: "text-blue-700",
      border: "border-blue-200",
    };
  if (["EM_LANCAMENTO"].includes(status))
    return {
      bg: "bg-indigo-50",
      color: "text-indigo-700",
      border: "border-indigo-200",
    };
  if (["AGUARDANDO_NOMADE"].includes(status))
    return {
      bg: "bg-purple-50",
      color: "text-purple-700",
      border: "border-purple-200",
    };
  if (["EM_REVISAO", "MELHORIAS_FINAIS"].includes(status))
    return {
      bg: "bg-amber-50",
      color: "text-amber-700",
      border: "border-amber-200",
    };
  if (["LIBERADA_PARA_EXECUCAO"].includes(status))
    return {
      bg: "bg-cyan-50",
      color: "text-cyan-700",
      border: "border-cyan-200",
    };
  return {
    bg: "bg-slate-100",
    color: "text-slate-600",
    border: "border-slate-200",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ status }: { status: StageStatus }) {
  const cfg = STAGE_STATUS_CFG[status] ?? STAGE_STATUS_CFG.PENDENTE;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold rounded-full border px-2 py-0.5 whitespace-nowrap",
        cfg.bg,
        cfg.color,
        cfg.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
      {children}
    </p>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  color = "text-slate-600",
  bg = "bg-slate-50",
  border = "border-slate-200",
}: {
  icon: any;
  title: string;
  value: React.ReactNode;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3.5 space-y-1.5", bg, border)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </p>
      </div>
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
        {value || <span className="text-slate-300">\u2014</span>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
      <Icon className="h-12 w-12 mb-3 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Pause Modal ──────────────────────────────────────────────────────────────

function PauseModal({
  open,
  stage,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  stage: TaskStage | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  saving: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <PauseCircle className="h-5 w-5 text-amber-600" />
            </div>
            Pausar etapa
          </DialogTitle>
          {stage && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold shrink-0">
                {stage.ordem + 1}
              </span>
              {stage.titulo}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-2 pt-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Informe o motivo da pausa da etapa:
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={4}
            className={cn(
              "w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700",
              "bg-white dark:bg-background px-3.5 py-3 text-sm text-slate-800 dark:text-slate-200",
              "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400",
              "transition-colors",
            )}
          />
          <p className="text-xs text-slate-400">
            O motivo ser\u00e1 registrado no hist\u00f3rico da etapa.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving}
            className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => onConfirm(motivo)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Confirmar pausa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TarefaDetailDrawer({
  tarefa,
  open,
  onClose,
  onStatusChange,
  updatingId,
}: {
  tarefa: any | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (t: any, s: string) => void;
  updatingId: string | null;
}) {
  const { sidebarWidth } = useSidebar();
  const [tab, setTab] = useState<TabKey>("dados");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");

  // Async data
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [briefingData, setBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Stage actions
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [pauseStage, setPauseStage] = useState<TaskStage | null>(null);
  const [pauseSaving, setPauseSaving] = useState(false);

  // Reset on drawer open/close
  useEffect(() => {
    if (open && tarefa) {
      setTab("dados");
      setStages([]);
      setBriefingData(null);
      setAttachments([]);
      setIsEditMode(false);
      setEditStatus(tarefa.status);
    }
  }, [open, tarefa?.id]);

  // Lazy-load on tab change
  useEffect(() => {
    if (!tarefa) return;
    if (tab === "etapas" && stages.length === 0 && !stagesLoading) loadStages();
    if (tab === "briefing" && !briefingData && !briefingLoading) loadBriefing();
    if (
      (tab === "anexos" || tab === "entregas") &&
      attachments.length === 0 &&
      !attachmentsLoading
    )
      loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadStages = useCallback(async () => {
    if (!tarefa) return;
    setStagesLoading(true);
    try {
      const res = await apiClient.getProjectTaskStages(tarefa.id);
      setStages(res?.data ?? []);
    } catch {
      setStages([]);
    } finally {
      setStagesLoading(false);
    }
  }, [tarefa?.id]);

  const loadBriefing = useCallback(async () => {
    if (!tarefa) return;
    setBriefingLoading(true);
    try {
      const res = await apiClient.getProjectTaskBriefing(tarefa.id);
      setBriefingData(res ?? null);
    } catch {
      setBriefingData(null);
    } finally {
      setBriefingLoading(false);
    }
  }, [tarefa?.id]);

  const loadAttachments = useCallback(async () => {
    if (!tarefa) return;
    setAttachmentsLoading(true);
    try {
      const res = await apiClient.getProjectTaskAttachments(tarefa.id);
      setAttachments(res?.data ?? []);
    } catch {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [tarefa?.id]);

  // Stage status update
  const updateStageStatus = async (stage: TaskStage, status: StageStatus) => {
    setUpdatingStageId(stage.id);
    try {
      const updated = await apiClient.updateProjectTaskStage(
        tarefa.id,
        stage.id,
        { status },
      );
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, ...updated } : s)),
      );
    } catch {
    } finally {
      setUpdatingStageId(null);
    }
  };

  const handlePauseConfirm = async (motivo: string) => {
    if (!pauseStage) return;
    setPauseSaving(true);
    // motivo is logged locally (no stage notes field in backend yet)
    if (motivo) {
      console.info(`[Pausa etapa ${pauseStage.titulo}] Motivo: ${motivo}`);
    }
    await updateStageStatus(pauseStage, "BLOQUEADA");
    setPauseSaving(false);
    setPauseStage(null);
  };

  if (!tarefa) return null;

  const overdue = !!(
    tarefa.due_date &&
    !["CONCLUIDA", "CANCELADA", "APROVADA"].includes(tarefa.status) &&
    new Date(tarefa.due_date) < new Date()
  );
  const dias = daysUntil(tarefa.due_date);
  const updating = updatingId === tarefa.id;

  const handleEditSave = () => {
    if (editStatus && editStatus !== tarefa.status) {
      onStatusChange(tarefa, editStatus);
    }
    setIsEditMode(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-700 w-auto! max-w-none!"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          {/* ── Gradient Header ────────────────────────────────────────── */}
          <div
            className="px-6 py-5 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20">
                <CheckSquare2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Chips row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {tarefa.code_snapshot && (
                    <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded-md font-bold tracking-wider">
                      {tarefa.code_snapshot}
                    </span>
                  )}
                  {tarefa.fase && (
                    <span className="text-[10px] bg-white/15 text-white/90 px-2 py-0.5 rounded-md">
                      {tarefa.fase}
                    </span>
                  )}
                  {overdue && (
                    <span className="text-[10px] bg-red-500/40 text-red-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Atrasada
                    </span>
                  )}
                  {tarefa.priority === "urgent" && (
                    <span className="text-[10px] bg-red-500/30 text-red-100 px-2 py-0.5 rounded-md font-semibold">
                      Urgente
                    </span>
                  )}
                </div>
                {/* Title */}
                <h2 className="text-base font-bold text-white leading-snug line-clamp-2">
                  {tarefa.title}
                </h2>
                {/* Subtitle strip */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2">
                  {tarefa.project?.title && (
                    <span className="text-[11px] text-white/60 flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {tarefa.project.title}
                    </span>
                  )}
                  {tarefa.project?.client?.name && (
                    <span className="text-[11px] text-white/60 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {tarefa.project.client.name}
                    </span>
                  )}
                  {tarefa.responsavel_agencia?.name && (
                    <span className="text-[11px] text-white/60 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {tarefa.responsavel_agencia.name}
                    </span>
                  )}
                  {tarefa.project_product?.product_name_snapshot && (
                    <span className="text-[11px] text-white/60 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {tarefa.project_product.product_name_snapshot}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        setEditStatus(tarefa.status);
                      }}
                      className="flex items-center gap-1.5 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={updating}
                      className="flex items-center gap-1.5 text-white bg-white/25 hover:bg-white/35 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {updating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Salvar
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <CopyLinkButton />
              </div>
            </div>

            {/* Status + date row */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {/* Status pill */}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 text-white border border-white/20 rounded-full px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                {getStatusLabel(tarefa.status)}
              </span>
              {tarefa.due_date && (
                <span
                  className={cn(
                    "text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium",
                    overdue
                      ? "bg-red-500/25 text-red-100 border-red-400/30"
                      : "bg-white/10 text-white/70 border-white/20",
                  )}
                >
                  <CalendarDays className="h-3 w-3" />
                  {fmtDate(tarefa.due_date)}
                  {dias !== null && (
                    <span className="ml-0.5">
                      {dias < 0
                        ? `(${Math.abs(dias)}d atraso)`
                        : dias === 0
                          ? "(hoje)"
                          : `(${dias}d)`}
                    </span>
                  )}
                </span>
              )}
              {tarefa.data_inicio_execucao && (
                <span className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-full border bg-white/10 text-white/60 border-white/15">
                  <PlayCircle className="h-3 w-3" />
                  Exec: {fmtDate(tarefa.data_inicio_execucao)}
                </span>
              )}
            </div>
          </div>

          {/* ── Summary Info Bar ────────────────────────────────────────── */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="grid grid-cols-4 gap-2.5">
              {[
                {
                  icon: Package,
                  title: "Produto",
                  value: tarefa.project_product?.product_name_snapshot,
                },
                {
                  icon: FolderOpen,
                  title: "Projeto",
                  value: tarefa.project?.title,
                },
                {
                  icon: Building2,
                  title: "Cliente",
                  value: tarefa.project?.client?.name,
                },
                {
                  icon: User,
                  title: "Ag\u00eancia",
                  value: tarefa.responsavel_agencia?.name,
                },
                {
                  icon: User,
                  title: "N\u00f4made",
                  value: tarefa.nomade_responsavel?.name,
                },
                {
                  icon: User,
                  title: "L\u00edder",
                  value: tarefa.project?.consultant,
                },
                {
                  icon: CalendarDays,
                  title: "Criada em",
                  value: fmtDate(tarefa.created_at),
                },
                {
                  icon: CalendarDays,
                  title: "Prazo",
                  value: tarefa.due_date ? fmtDate(tarefa.due_date) : null,
                },
              ]
                .filter((item) => item.value)
                .map(({ icon: Icon, title, value }) => (
                  <div key={title} className="flex items-start gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold leading-none mb-0.5">
                        {title}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ── Tab Bar ────────────────────────────────────────────────── */}
          <div className="shrink-0 overflow-x-auto border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-background">
            <div className="flex gap-0 min-w-max">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key as TabKey)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors",
                    tab === key
                      ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-background">
            {/* ══ DADOS GERAIS ══════════════════════════════════════════ */}
            {tab === "dados" && (
              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="space-y-2">
                  <SectionTitle>Status da tarefa</SectionTitle>
                  {isEditMode ? (
                    <Select
                      value={editStatus}
                      onValueChange={(v) => setEditStatus(v)}
                      disabled={updating}
                    >
                      <SelectTrigger className="h-9 text-xs font-medium">
                        {updating ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Salvando...
                          </span>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {[
                          "PARA_LANCAMENTO",
                          "EM_LANCAMENTO",
                          "AGUARDANDO_INFORMACOES",
                          "AGUARDANDO_ETAPA",
                          "LIBERADA_PARA_EXECUCAO",
                          "EM_EXECUCAO",
                          "EM_REVISAO",
                          "MELHORIAS_FINAIS",
                          "EM_APROVACAO",
                          "APROVACAO_PENDENTE_CLIENTE",
                          "APROVADA",
                          "REPROVADA",
                          "CONCLUIDA",
                          "PAUSADA",
                          "CANCELADA",
                          "AGUARDANDO_NOMADE",
                          "ENTREGA_PENDENTE",
                          "ENTREGA_ATRASADA",
                          "QUALIFICACAO_PENDENTE",
                          "NAO_SEGUIU_ORIENTACOES",
                        ].map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-xs font-medium"
                          >
                            {getStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    (() => {
                      const sc = getStatusStyle(tarefa.status);
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-2.5 py-1 whitespace-nowrap",
                            sc.bg,
                            sc.color,
                            sc.border,
                          )}
                        >
                          {getStatusLabel(tarefa.status)}
                        </span>
                      );
                    })()
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Projeto */}
                  <div className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 space-y-3">
                    <SectionTitle>Projeto</SectionTitle>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {tarefa.project?.title}
                        </p>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">
                          {tarefa.project?.status?.replace(/-/g, " ")}
                          {tarefa.project?.type
                            ? ` \u00b7 ${tarefa.project.type}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    {tarefa.project?.client && (
                      <div className="flex items-start gap-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Cliente
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {tarefa.project.client.name}
                          </p>
                          {tarefa.project.client.cnpj && (
                            <p className="text-xs text-slate-500">
                              CNPJ: {tarefa.project.client.cnpj}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {tarefa.project?.consultant && (
                      <div className="flex items-start gap-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Consultor / L\u00edder
                          </p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {tarefa.project.consultant}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Produto */}
                  <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
                    <SectionTitle>Produto</SectionTitle>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {tarefa.project_product?.product_name_snapshot}
                        </p>
                        {tarefa.project_product?.product_code_snapshot && (
                          <p className="text-xs font-mono text-purple-600 mt-0.5">
                            {tarefa.project_product.product_code_snapshot}
                          </p>
                        )}
                        {tarefa.project_product?.product_category_snapshot && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tarefa.project_product.product_category_snapshot}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Responsáveis */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4">
                    <SectionTitle>Respons\u00e1veis</SectionTitle>
                    <div className="space-y-2.5">
                      {tarefa.responsavel_agencia && (
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-blue-700">
                              {initials(tarefa.responsavel_agencia.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wide leading-none">
                              Ag\u00eancia
                            </p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {tarefa.responsavel_agencia.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {tarefa.nomade_responsavel && (
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-purple-200 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-purple-700">
                              {initials(tarefa.nomade_responsavel.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wide leading-none">
                              N\u00f4made
                            </p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {tarefa.nomade_responsavel.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {!tarefa.responsavel_agencia &&
                        !tarefa.nomade_responsavel && (
                          <p className="text-xs text-slate-400">
                            Nenhum respons\u00e1vel atribu\u00eddo
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                {/* Prazos */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4">
                  <SectionTitle>Prazos</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: "In\u00edcio previsto",
                        date: tarefa.start_date,
                      },
                      {
                        label: "Prazo de entrega",
                        date: tarefa.due_date,
                        highlight: overdue,
                      },
                      {
                        label: "Prazo de execu\u00e7\u00e3o",
                        date: tarefa.data_inicio_execucao,
                      },
                      {
                        label: "Data de lan\u00e7amento",
                        date: tarefa.data_lancamento,
                      },
                      {
                        label: "Lib. p/ execu\u00e7\u00e3o",
                        date: tarefa.data_liberacao_execucao,
                      },
                      { label: "Conclus\u00e3o", date: tarefa.completed_at },
                    ].map(({ label, date, highlight }) => (
                      <div
                        key={label}
                        className={cn(
                          "rounded-lg p-2.5 border text-center",
                          highlight
                            ? "bg-red-50 border-red-200 dark:bg-red-900/20"
                            : "bg-white dark:bg-background border-slate-200 dark:border-slate-700",
                        )}
                      >
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                          {label}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-bold",
                            date
                              ? highlight
                                ? "text-red-600"
                                : "text-slate-800 dark:text-slate-200"
                              : "text-slate-300",
                          )}
                        >
                          {date ? fmtDate(date) : "\u2014"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                {tarefa.observations && (
                  <div className="space-y-2">
                    <SectionTitle>Observa\u00e7\u00f5es internas</SectionTitle>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {tarefa.observations}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ QUESTIONÁRIO / BRIEFING ══════════════════════════════ */}
            {tab === "briefing" && (
              <div className="p-6">
                {briefingLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">
                      Carregando briefing...
                    </span>
                  </div>
                ) : !briefingData ? (
                  <EmptyState
                    icon={MessageSquare}
                    message="Nenhum dado de briefing disponível."
                  />
                ) : (
                  <div className="space-y-5">
                    {/* Questions from snapshot */}
                    {briefingData.briefing_questions?.length > 0 && (
                      <div>
                        <SectionTitle>
                          Perguntas ({briefingData.briefing_questions.length})
                        </SectionTitle>
                        <div className="space-y-3">
                          {briefingData.briefing_questions.map(
                            (q: any, i: number) => {
                              const answer = briefingData.answers?.find(
                                (a: any) =>
                                  a.question_key ===
                                  (q.key || q.id || String(i)),
                              );
                              return (
                                <div
                                  key={i}
                                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4"
                                >
                                  <div className="flex items-start gap-2.5 mb-2">
                                    <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                      {q.text ||
                                        q.label ||
                                        q.question ||
                                        q.title ||
                                        JSON.stringify(q)}
                                    </p>
                                  </div>
                                  {answer ? (
                                    <div className="ml-7.5 space-y-1">
                                      <p className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-background border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                        {answer.answer || (
                                          <em className="text-slate-400">
                                            Sem resposta
                                          </em>
                                        )}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        Respondido: {fmtDate(answer.updated_at)}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="ml-7.5">
                                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                        Pendente
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                    {/* Answered only (fallback) */}
                    {!briefingData.briefing_questions?.length &&
                      briefingData.answers?.length > 0 && (
                        <div>
                          <SectionTitle>
                            Respostas ({briefingData.answers.length})
                          </SectionTitle>
                          <div className="space-y-3">
                            {briefingData.answers.map((a: any, i: number) => (
                              <div
                                key={i}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 p-4"
                              >
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                  {a.question_text}
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {a.answer || (
                                    <em className="text-slate-400">
                                      Sem resposta
                                    </em>
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {!briefingData.briefing_questions?.length &&
                      !briefingData.answers?.length && (
                        <EmptyState
                          icon={MessageSquare}
                          message="Nenhum questionário preenchido ainda."
                        />
                      )}
                  </div>
                )}
              </div>
            )}

            {/* ══ ETAPAS ══════════════════════════════════════════════ */}
            {tab === "etapas" && (
              <div className="p-6">
                {stagesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">
                      Carregando etapas...
                    </span>
                  </div>
                ) : stages.length === 0 ? (
                  <EmptyState
                    icon={List}
                    message="Nenhuma etapa registrada para esta tarefa."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <SectionTitle>Etapas ({stages.length})</SectionTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-emerald-600 font-semibold">
                          {
                            stages.filter((s) => s.status === "CONCLUIDA")
                              .length
                          }{" "}
                          concluídas
                        </span>
                        <span>/</span>
                        <span>{stages.length} total</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-5">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${Math.round((stages.filter((s) => s.status === "CONCLUIDA").length / stages.length) * 100)}%`,
                        }}
                      />
                    </div>

                    {stages.map((stage) => {
                      const scfg =
                        STAGE_STATUS_CFG[stage.status as StageStatus] ??
                        STAGE_STATUS_CFG.PENDENTE;
                      const isUpdating = updatingStageId === stage.id;
                      return (
                        <div
                          key={stage.id}
                          className={cn(
                            "rounded-xl border p-4 transition-all",
                            stage.status === "CONCLUIDA"
                              ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700"
                              : stage.status === "BLOQUEADA"
                                ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700"
                                : stage.status === "EM_ANDAMENTO"
                                  ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700"
                                  : "bg-white dark:bg-background border-slate-200 dark:border-slate-700",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Number bubble */}
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black",
                                stage.status === "CONCLUIDA"
                                  ? "bg-emerald-600 text-white"
                                  : stage.status === "EM_ANDAMENTO"
                                    ? "bg-blue-600 text-white"
                                    : stage.status === "BLOQUEADA"
                                      ? "bg-amber-500 text-white"
                                      : "bg-slate-200 text-slate-600",
                              )}
                            >
                              {stage.status === "CONCLUIDA" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : stage.status === "BLOQUEADA" ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                stage.ordem + 1
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                    {stage.titulo}
                                  </p>
                                  {stage.descricao && (
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                      {stage.descricao}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <StageBadge
                                      status={stage.status as StageStatus}
                                    />
                                    {stage.obrigatoria && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full font-semibold">
                                        Obrigat\u00f3ria
                                      </span>
                                    )}
                                    {stage.briefing_necessario && (
                                      <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
                                        Briefing
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      disabled={isUpdating}
                                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      disabled
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />{" "}
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {stage.status === "PENDENTE" && (
                                      <DropdownMenuItem
                                        className="text-xs gap-2 text-blue-700"
                                        onClick={() =>
                                          updateStageStatus(
                                            stage,
                                            "EM_ANDAMENTO",
                                          )
                                        }
                                      >
                                        <Rocket className="h-3.5 w-3.5" />{" "}
                                        Lan\u00e7ar etapa
                                      </DropdownMenuItem>
                                    )}
                                    {stage.status === "EM_ANDAMENTO" && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-emerald-700"
                                          onClick={() =>
                                            updateStageStatus(
                                              stage,
                                              "CONCLUIDA",
                                            )
                                          }
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                          Aprovar / Concluir
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-amber-700"
                                          onClick={() => setPauseStage(stage)}
                                        >
                                          <PauseCircle className="h-3.5 w-3.5" />{" "}
                                          Pausar etapa
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-red-700"
                                          onClick={() =>
                                            updateStageStatus(
                                              stage,
                                              "BLOQUEADA",
                                            )
                                          }
                                        >
                                          <ThumbsDown className="h-3.5 w-3.5" />{" "}
                                          Reprovar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.status === "BLOQUEADA" && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-blue-700"
                                          onClick={() =>
                                            updateStageStatus(
                                              stage,
                                              "EM_ANDAMENTO",
                                            )
                                          }
                                        >
                                          <PlayCircle className="h-3.5 w-3.5" />{" "}
                                          Retomar execu\u00e7\u00e3o
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-xs gap-2 text-slate-600"
                                          onClick={() =>
                                            updateStageStatus(stage, "PENDENTE")
                                          }
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />{" "}
                                          Devolver etapa
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {stage.status === "CONCLUIDA" && (
                                      <DropdownMenuItem
                                        className="text-xs gap-2 text-slate-600"
                                        onClick={() =>
                                          updateStageStatus(stage, "PENDENTE")
                                        }
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />{" "}
                                        Devolver etapa
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      disabled
                                    >
                                      <History className="h-3.5 w-3.5" /> Ver
                                      hist\u00f3rico
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      disabled
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />{" "}
                                      Adicionar item p/ aprova\u00e7\u00e3o
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ COMENTÁRIOS ══════════════════════════════════════════ */}
            {tab === "comentarios" && (
              <div className="p-6">
                <EmptyState
                  icon={MessageSquare}
                  message="Coment\u00e1rios ser\u00e3o exibidos aqui quando dispon\u00edveis via API."
                />
              </div>
            )}

            {/* ══ ITENS PARA APROVAÇÃO ══════════════════════════════════ */}
            {tab === "aprovacao" && (
              <div className="p-6">
                <EmptyState
                  icon={ThumbsUp}
                  message="Itens para aprova\u00e7\u00e3o ser\u00e3o exibidos aqui."
                />
              </div>
            )}

            {/* ══ HISTÓRICO DE ENTREGA ══════════════════════════════════ */}
            {tab === "entregas" && (
              <div className="p-6">
                {attachmentsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">
                      Carregando entregas...
                    </span>
                  </div>
                ) : (
                  (() => {
                    const deliveries = attachments.filter(
                      (a) => a.type === "delivery",
                    );
                    return deliveries.length === 0 ? (
                      <EmptyState
                        icon={Rocket}
                        message="Nenhuma entrega registrada para esta tarefa."
                      />
                    ) : (
                      <div className="space-y-3">
                        <SectionTitle>
                          Hist\u00f3rico de entregas ({deliveries.length})
                        </SectionTitle>
                        {deliveries.map((d: any) => (
                          <div
                            key={d.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                  <ExternalLink className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {d.name}
                                  </p>
                                  {d.observations && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {d.observations}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {fmtDateTime(d.created_at)}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" /> Abrir
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* ══ HISTÓRICO DE STATUS ═════════════════════════════════ */}
            {tab === "historico" && (
              <div className="p-6 space-y-6">
                <div>
                  <SectionTitle>Timeline de datas</SectionTitle>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Criada",
                        date: tarefa.created_at,
                        icon: CheckSquare2,
                        color: "bg-slate-200 text-slate-600",
                      },
                      {
                        label: "Lan\u00e7amento",
                        date: tarefa.data_lancamento,
                        icon: Rocket,
                        color: "bg-indigo-100 text-indigo-700",
                      },
                      {
                        label: "Lib. p/ execu\u00e7\u00e3o",
                        date: tarefa.data_liberacao_execucao,
                        icon: ArrowRight,
                        color: "bg-cyan-100 text-cyan-700",
                      },
                      {
                        label: "In\u00edcio execu\u00e7\u00e3o",
                        date: tarefa.data_inicio_execucao,
                        icon: PlayCircle,
                        color: "bg-blue-100 text-blue-700",
                      },
                      {
                        label: "Conclus\u00e3o",
                        date: tarefa.data_conclusao,
                        icon: CheckCircle2,
                        color: "bg-emerald-100 text-emerald-700",
                      },
                      {
                        label: "Conclu\u00eddo em",
                        date: tarefa.completed_at,
                        icon: CheckCircle2,
                        color: "bg-teal-100 text-teal-700",
                      },
                      {
                        label: "\u00dalt. atualiza\u00e7\u00e3o",
                        date: tarefa.updated_at,
                        icon: RefreshCw,
                        color: "bg-slate-100 text-slate-500",
                      },
                    ].map(({ label, date, icon: Icon, color }) => (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-xl",
                          !date && "opacity-40",
                        )}
                      >
                        <div
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                            color,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {label}
                          </p>
                          <span
                            className={cn(
                              "text-xs font-mono",
                              date ? "text-slate-500" : "text-slate-300",
                            )}
                          >
                            {date ? fmtDateTime(date) : "\u2014"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <SectionTitle>Prazos</SectionTitle>
                  <div className="space-y-2">
                    {[
                      {
                        label: "In\u00edcio previsto",
                        date: tarefa.start_date,
                      },
                      {
                        label: "Prazo de entrega",
                        date: tarefa.due_date,
                        highlight: overdue,
                      },
                      { label: "Conclu\u00eddo em", date: tarefa.completed_at },
                    ].map(({ label, date, highlight }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30"
                      >
                        <span className="text-slate-500">{label}</span>
                        <span
                          className={cn(
                            "font-semibold",
                            date
                              ? highlight
                                ? "text-red-600"
                                : "text-slate-700 dark:text-slate-200"
                              : "text-slate-300",
                          )}
                        >
                          {date ? fmtDate(date) : "\u2014"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ ACESSOS E HISTÓRICO ════════════════════════════════ */}
            {tab === "acessos" && (
              <div className="p-6">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      Informa\u00e7\u00f5es sensíveis
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Credenciais e acessos n\u00e3o s\u00e3o exibidos diretamente
                    por seguran\u00e7a. Utilize a se\u00e7\u00e3o de acessos do
                    projeto para visualiz\u00e1-los com prote\u00e7\u00e3o.
                  </p>
                </div>
                <EmptyState
                  icon={Lock}
                  message="Acessos e credenciais ser\u00e3o exibidos aqui via integra\u00e7\u00e3o segura."
                />
              </div>
            )}

            {/* ══ ANEXOS ════════════════════════════════════════════ */}
            {tab === "anexos" && (
              <div className="p-6">
                {attachmentsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">
                      Carregando anexos...
                    </span>
                  </div>
                ) : attachments.length === 0 ? (
                  <EmptyState
                    icon={Paperclip}
                    message="Nenhum anexo encontrado para esta tarefa."
                  />
                ) : (
                  <div className="space-y-3">
                    <SectionTitle>Anexos ({attachments.length})</SectionTitle>
                    {attachments.map((a: any) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                a.type === "delivery"
                                  ? "bg-emerald-100"
                                  : a.type === "link"
                                    ? "bg-blue-100"
                                    : "bg-slate-200",
                              )}
                            >
                              {a.type === "delivery" ? (
                                <Rocket className="h-4 w-4 text-emerald-600" />
                              ) : a.type === "link" ? (
                                <ExternalLink className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Paperclip className="h-4 w-4 text-slate-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {a.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                  {a.type}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {fmtDate(a.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline shrink-0 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Abrir
                          </a>
                        </div>
                        {a.observations && (
                          <p className="text-xs text-slate-500 mt-2 ml-11">
                            {a.observations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* spacer */}
            <div className="h-6" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Pause Modal */}
      <PauseModal
        open={!!pauseStage}
        stage={pauseStage}
        onClose={() => setPauseStage(null)}
        onConfirm={handlePauseConfirm}
        saving={pauseSaving}
      />
    </>
  );
}
