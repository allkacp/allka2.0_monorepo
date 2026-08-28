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
  Zap,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { TaskRotationPanel } from "@/components/task-rotation-panel";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type StageStatus =
  | "PENDENTE"
  // Etapa aberta pelo motor sem executor definido ainda (nômade em seleção ou
  // líder a atribuir) — ver src/lib/stage-engine.ts no backend.
  | "AGUARDANDO_EXECUTOR"
  | "EM_ANDAMENTO"
  | "CONCLUIDA"
  | "BLOQUEADA";

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
  // ── Motor de execução por etapa ──
  executor_type?: "nomad" | "leader" | "internal";
  nomade_id?: string | null;
  lider_id?: string | null;
  categoria?: string | null;
  manter_mesmo_nomade?: boolean;
  prazo_execucao?: string | null;
  horas_execucao?: number | null;
  valor_nomade?: number | null;
  conta_no_prazo?: boolean;
  exige_anexo?: boolean;
  iniciada_em?: string | null;
  concluida_em?: string | null;
}

const EXECUTOR_CFG: Record<string, { label: string; className: string }> = {
  nomad: {
    label: "Nômade",
    className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800",
  },
  leader: {
    label: "Líder da área",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  },
  internal: {
    label: "Interno Allka",
    className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  },
};

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
  AGUARDANDO_EXECUTOR: {
    label: "Aguardando executor",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
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
    label: "Concluída",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  BLOQUEADA: {
    label: "Bloq",
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
  { key: "briefing", label: "Questionário", icon: MessageSquare },
  { key: "etapas", label: "Etapas", icon: List },
  { key: "comentarios", label: "Comentários", icon: MessageSquare },
  { key: "aprovacao", label: "Itens p/ Aprovação", icon: ThumbsUp },
  { key: "entregas", label: "Hist. Entrega", icon: Rocket },
  { key: "historico", label: "Hist. Status", icon: History },
  { key: "acessos", label: "Acessos", icon: Lock },
  { key: "anexos", label: "Anexos", icon: Paperclip },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "\—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "\—";
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
  PARA_LANCAMENTO: "Para lançamento",
  EM_LANCAMENTO: "Em lançamento",
  AGUARDANDO_INFORMACOES: "Aguard. informações",
  AGUARDANDO_ETAPA: "Aguardando etapa",
  LIBERADA_PARA_EXECUCAO: "Enviada p/ execução",
  EM_EXECUCAO: "Em execução",
  EM_REVISAO: "Em revisão",
  MELHORIAS_FINAIS: "Melhorias finais",
  EM_APROVACAO: "Aprovação - Agência",
  APROVACAO_PENDENTE_CLIENTE: "Aprovação - Cliente",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  CONCLUIDA: "Concluída",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
  AGUARDANDO_NOMADE: "Aguard. nômade",
  ENTREGA_PENDENTE: "Entrega pendente",
  ENTREGA_ATRASADA: "Entrega atrasada",
  QUALIFICACAO_PENDENTE: "Qualificação pendente",
  NAO_SEGUIU_ORIENTACOES: "Não seguiu orientações",
};

function getStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
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
        {value || <span className="text-slate-300">\—</span>}
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
            O motivo será registrado no histórico da etapa.
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
  onLaunch,
  startInEditMode = false,
}: {
  tarefa: any | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (t: any, s: string) => void;
  updatingId: string | null;
  onLaunch?: (tarefa: any) => void;
  startInEditMode?: boolean;
}) {
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
  // O que o motor fez depois de concluir uma etapa (abriu a seguinte, herdou
  // nômade, encerrou a tarefa). Sem isso a ação parece não ter efeito.
  const [motorAviso, setMotorAviso] = useState<string | null>(null);

  // Aprovação da entrega
  const [reprovacaoMotivo, setReprovacaoMotivo] = useState("");
  const [aprovacaoSalvando, setAprovacaoSalvando] = useState(false);
  const [aprovacaoAviso, setAprovacaoAviso] = useState<string | null>(null);

  /**
   * Registra o aceite ou a devolução da entrega. Devolver reabre a última
   * etapa concluída no backend — é ela que precisa ser refeita.
   */
  const registrarAprovacao = async (acao: "aprovar" | "reprovar") => {
    setAprovacaoSalvando(true);
    setAprovacaoAviso(null);
    try {
      if (acao === "aprovar") {
        const r: any = await apiClient.aprovarTarefa(tarefa.id);
        setAprovacaoAviso(
          r?.concluida
            ? "Entrega aprovada — tarefa encerrada."
            : `Aceite da ${r?.nivel} registrado. Agora aguarda a aprovação do ${r?.proximoNivel}.`,
        );
      } else {
        const r: any = await apiClient.reprovarTarefa(tarefa.id, reprovacaoMotivo.trim());
        setAprovacaoAviso(
          r?.etapaReaberta
            ? "Devolvida para ajuste — a última etapa foi reaberta para o executor."
            : "Devolvida para ajuste.",
        );
        setReprovacaoMotivo("");
      }
      // Avisa a tela-mãe pra recarregar a lista — o status da tarefa mudou.
      // (`onSaved` não existe neste componente; o callback real é este.)
      onStatusChange?.(tarefa, acao === "aprovar" ? "APROVADA" : "EM_EXECUCAO");
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 402 && e.data?.invoice) {
        const valor = Number(e.data.invoice.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        setAprovacaoAviso(
          `Limite de alterações grátis atingido. Foi gerada a fatura de ${valor} — assim que for paga (ver Faturas), envie a devolução de novo.`,
        );
      } else {
        setAprovacaoAviso(e?.message ?? "Não foi possível registrar. Tente novamente.");
      }
    } finally {
      setAprovacaoSalvando(false);
    }
  };

  // ── Entrega emergencial ───────────────────────────────────────────────────
  // `tarefa` é uma prop somente-leitura (o pai não tem um refetch dedicado
  // pra "mesmo status, outros campos mudaram") — mantém localmente que o
  // pedido foi feito pra refletir na hora, sem esperar reabrir o drawer.
  const [emergencialConfirmOpen, setEmergencialConfirmOpen] = useState(false);
  const [emergencialSalvando, setEmergencialSalvando] = useState(false);
  const [emergencialAviso, setEmergencialAviso] = useState<string | null>(null);
  const [emergencialSolicitadaLocal, setEmergencialSolicitadaLocal] = useState(false);

  const solicitarEmergencial = async () => {
    setEmergencialSalvando(true);
    setEmergencialAviso(null);
    try {
      await apiClient.solicitarEntregaEmergencial(tarefa.id);
      setEmergencialConfirmOpen(false);
      setEmergencialSolicitadaLocal(true);
    } catch (e: any) {
      setEmergencialAviso(e?.message ?? "Não foi possível solicitar. Tente novamente.");
    } finally {
      setEmergencialSalvando(false);
    }
  };

  // Reset on drawer open/close
  useEffect(() => {
    if (open && tarefa) {
      setTab("dados");
      setStages([]);
      setBriefingData(null);
      setAttachments([]);
      setIsEditMode(startInEditMode);
      setEditStatus(tarefa.status);
      setEmergencialSolicitadaLocal(false);
      setEmergencialAviso(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const updated: any = await apiClient.updateProjectTaskStage(
        tarefa.id,
        stage.id,
        { status },
      );

      // Concluir etapa aciona o motor no backend: ele abre a seguinte (às
      // vezes herdando o nômade) e pode encerrar a tarefa. Recarrega a lista
      // inteira em vez de remendar só a etapa alterada, senão a tela mostra
      // um estado que já não é o do servidor.
      if (status === "CONCLUIDA" && updated?.motor) {
        await loadStages();
        const proxima = updated.motor.proxima_etapa;
        setMotorAviso(
          updated.motor.tarefa_concluida
            ? "Última etapa concluída — a tarefa foi encerrada."
            : proxima
              ? `Etapa concluída. Abriu "${proxima.titulo}"${proxima.herdou_nomade ? " com o mesmo nômade" : proxima.status === "AGUARDANDO_EXECUTOR" ? " — aguardando executor" : ""}.`
              : "Etapa concluída.",
        );
        setTimeout(() => setMotorAviso(null), 6000);
        return;
      }

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
      <EmbeddedSlideScreen
        open={open}
        onClose={onClose}
        hideHeader
        pin={{
          id: `tarefas-view-${tarefa.id}`,
          label: tarefa.title ? `Tarefa: ${tarefa.title}` : "Detalhes da tarefa",
          icon: CheckSquare2,
          path: "/admin/tarefas",
          activateKey: `view:${tarefa.id}`,
        }}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
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
                    <span className="text-[10px] font-mono bg-white/15 text-white/90 px-2 py-0.5 rounded-md">
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
                  title: "Agência",
                  value: tarefa.responsavel_agencia?.name,
                },
                {
                  icon: User,
                  title: "Nômade",
                  value: tarefa.nomade_responsavel?.name,
                },
                {
                  icon: User,
                  title: "Líder",
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

          {/* ── Launch Banner (PARA_LANCAMENTO / EM_LANCAMENTO) ────────── */}
          {onLaunch && (tarefa.status === "PARA_LANCAMENTO" || tarefa.status === "EM_LANCAMENTO") && (
            <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-700 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-indigo-600 shrink-0" />
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                  {tarefa.status === "PARA_LANCAMENTO"
                    ? "Esta tarefa aguarda lançamento."
                    : "Lançamento em andamento — continue preenchendo o briefing."}
                </p>
              </div>
              <button
                onClick={() => { onLaunch(tarefa); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shrink-0"
              >
                <Rocket className="h-3.5 w-3.5" />
                {tarefa.status === "PARA_LANCAMENTO" ? "Lançar tarefa" : "Continuar lançamento"}
              </button>
            </div>
          )}

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

                {/* Rodízio de ofertas de Nômade (ata 2026-08, bloco 4/5) —
                    só relevante enquanto a tarefa procura executor. */}
                {tarefa.status === "AGUARDANDO_NOMADE" && !tarefa.nomade_responsavel_id && (
                  <TaskRotationPanel taskId={tarefa.id} />
                )}

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
                            ? ` \· ${tarefa.project.type}`
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
                            Consultor / Líder
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
                    <SectionTitle>Responsáveis</SectionTitle>
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
                              Agência
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
                              Nômade
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
                            Nenhum responsável atribuído
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
                        label: "Início previsto",
                        date: tarefa.start_date,
                      },
                      {
                        label: "Prazo de entrega",
                        date: tarefa.due_date,
                        highlight: overdue,
                      },
                      {
                        label: "Prazo de execução",
                        date: tarefa.data_inicio_execucao,
                      },
                      {
                        label: "Data de lançamento",
                        date: tarefa.data_lancamento,
                      },
                      {
                        label: "Lib. p/ execução",
                        date: tarefa.data_liberacao_execucao,
                      },
                      { label: "Conclusão", date: tarefa.completed_at },
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
                          {date ? fmtDate(date) : "\—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                {tarefa.observations && (
                  <div className="space-y-2">
                    <SectionTitle>Observações internas</SectionTitle>
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
                                  (q.question_key || q.key || q.id || String(i)),
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
                                      {q.question_text ||
                                        q.text ||
                                        q.label ||
                                        q.question ||
                                        q.title ||
                                        `Pergunta ${i + 1}`}
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
                    {/* Retorno do motor: o que aconteceu depois da conclusão. */}
                    {motorAviso && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                          {motorAviso}
                        </p>
                      </div>
                    )}
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

                    {stages.map((stage, indice) => {
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
                                // Posição na lista, não `ordem`: há dados com
                                // ordem base 0 (geração antiga) e base 1
                                // (motor), e somar 1 quebrava um dos dois.
                                indice + 1
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
                                        Obrigatória
                                      </span>
                                    )}
                                    {stage.briefing_necessario && (
                                      <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">
                                        Briefing
                                      </span>
                                    )}

                                    {/* ── Configuração do motor de etapas ──
                                        Quem executa, continuidade de pessoa,
                                        prazo e esforço são definidos por etapa
                                        — não pela tarefa. */}
                                    {stage.executor_type && (
                                      <span
                                        className={cn(
                                          "text-[10px] px-1.5 py-0.5 rounded-full font-semibold border",
                                          EXECUTOR_CFG[stage.executor_type]?.className ??
                                            EXECUTOR_CFG.nomad.className,
                                        )}
                                        title="Quem executa esta etapa"
                                      >
                                        {EXECUTOR_CFG[stage.executor_type]?.label ??
                                          stage.executor_type}
                                      </span>
                                    )}
                                    {stage.manter_mesmo_nomade && (
                                      <span
                                        className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full font-semibold dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
                                        title="A etapa seguinte fica com o mesmo nômade, sem voltar para a fila"
                                      >
                                        ↻ mantém nômade
                                      </span>
                                    )}
                                    {stage.categoria && (
                                      <span className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full font-semibold dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                        {stage.categoria}
                                      </span>
                                    )}
                                    {stage.conta_no_prazo === false && (
                                      <span
                                        className="text-[10px] bg-slate-50 text-slate-500 border border-dashed border-slate-300 px-1.5 py-0.5 rounded-full font-semibold"
                                        title="Não soma no prazo mostrado ao cliente"
                                      >
                                        fora do prazo
                                      </span>
                                    )}
                                  </div>

                                  {(stage.prazo_execucao ||
                                    stage.horas_execucao ||
                                    stage.valor_nomade) && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                      {stage.prazo_execucao && (
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Prazo{" "}
                                          {new Date(stage.prazo_execucao).toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                      {stage.horas_execucao ? (
                                        <span>{stage.horas_execucao}h de execução</span>
                                      ) : null}
                                      {stage.valor_nomade ? (
                                        <span>
                                          R${" "}
                                          {stage.valor_nomade.toLocaleString("pt-BR", {
                                            minimumFractionDigits: 2,
                                          })}{" "}
                                          ao executor
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
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
                                    {(stage.status === "PENDENTE" ||
                                      stage.status === "AGUARDANDO_EXECUTOR") && (
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
                                        {stage.status === "AGUARDANDO_EXECUTOR"
                                          ? "Iniciar mesmo assim"
                                          : "Lançar etapa"}
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
                                          Retomar execução
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
                                      histórico
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      disabled
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />{" "}
                                      Adicionar item p/ aprovação
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
                  message="Comentários serão exibidos aqui quando disponíveis via API."
                />
              </div>
            )}

            {/* ══ ITENS PARA APROVAÇÃO ══════════════════════════════════ */}
            {tab === "aprovacao" && (
              <div className="p-6 space-y-4">
                {/* Aprovação em dois níveis: a agência confere a entrega e,
                    quando o produto exige, o cliente também. A tarefa só
                    encerra no último aceite — ver src/lib/stage-engine.ts. */}
                {(() => {
                  const t = tarefa as any;
                  const aguardando = [
                    "EM_APROVACAO",
                    "APROVACAO_PENDENTE_CLIENTE",
                    "EM_REVISAO",
                  ].includes(tarefa.status);
                  const nivelAtual = !t.aprovado_agencia_em ? "agencia" : "cliente";

                  return (
                    <>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <SectionTitle>Aceites da entrega</SectionTitle>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {t.aprovado_agencia_em ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              Agência
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.aprovado_agencia_em
                                ? `aprovou em ${new Date(t.aprovado_agencia_em).toLocaleDateString("pt-BR")}`
                                : "aguardando conferência"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {t.aprovado_cliente_em ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              Cliente
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.exige_aprovacao_cliente === false
                                ? "não exigido neste produto"
                                : t.aprovado_cliente_em
                                  ? `aprovou em ${new Date(t.aprovado_cliente_em).toLocaleDateString("pt-BR")}`
                                  : "aguardando conferência"}
                            </span>
                          </div>
                        </div>

                        {t.reprovacoes > 0 && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                              Devolvida {t.reprovacoes}{" "}
                              {t.reprovacoes === 1 ? "vez" : "vezes"}
                              {t.reprovacao_nivel ? ` (última pela ${t.reprovacao_nivel})` : ""}
                            </p>
                            {t.reprovacao_motivo && (
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                {t.reprovacao_motivo}
                              </p>
                            )}
                          </div>
                        )}

                        {t.project_product?.alteracoes_incluidas_snapshot != null && (
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            {Math.min(t.reprovacoes, t.project_product.alteracoes_incluidas_snapshot)} de{" "}
                            {t.project_product.alteracoes_incluidas_snapshot} alterações grátis usadas
                            {t.pending_fee_invoice_id ? " — próxima alteração exige pagamento de taxa" : ""}
                          </p>
                        )}
                      </div>

                      {!["CONCLUIDA", "CANCELADA"].includes(tarefa.status) && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                          <SectionTitle>Entrega emergencial</SectionTitle>
                          {t.emergencial_solicitada_em || emergencialSolicitadaLocal ? (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                              Entrega emergencial solicitada
                              {t.emergencial_solicitada_em
                                ? ` em ${new Date(t.emergencial_solicitada_em).toLocaleDateString("pt-BR")}`
                                : ""}
                              {t.emergencial_reducao_percentual != null
                                ? ` — prazo comprimido em ${t.emergencial_reducao_percentual}%.`
                                : "."}
                            </p>
                          ) : (
                            <>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                Reduz o prazo desta entrega e cobra +50% do valor do produto.
                              </p>
                              <button
                                onClick={() => setEmergencialConfirmOpen(true)}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                              >
                                <Zap className="h-4 w-4" />
                                Solicitar entrega emergencial
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {aguardando ? (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                            Registrando o aceite da <strong>{nivelAtual}</strong>.
                          </p>
                          <textarea
                            value={reprovacaoMotivo}
                            onChange={(e) => setReprovacaoMotivo(e.target.value)}
                            placeholder="Motivo da devolução (obrigatório para reprovar)"
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-[#2558FF]"
                          />
                          {aprovacaoAviso && (
                            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                              <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                                {aprovacaoAviso}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              disabled={aprovacaoSalvando}
                              onClick={() => registrarAprovacao("aprovar")}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {aprovacaoSalvando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-4 w-4" />
                              )}
                              Aprovar entrega
                            </button>
                            <button
                              disabled={aprovacaoSalvando || reprovacaoMotivo.trim().length < 3}
                              onClick={() => registrarAprovacao("reprovar")}
                              title={
                                reprovacaoMotivo.trim().length < 3
                                  ? "Descreva o motivo para devolver"
                                  : undefined
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
                            >
                              <PauseCircle className="h-4 w-4" />
                              Devolver para ajuste
                            </button>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          icon={ThumbsUp}
                          message={
                            tarefa.status === "CONCLUIDA"
                              ? "Entrega aprovada e tarefa encerrada."
                              : "A entrega ainda não chegou à etapa de aprovação."
                          }
                        />
                      )}
                    </>
                  );
                })()}
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
                          Histórico de entregas ({deliveries.length})
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
                        label: "Lançamento",
                        date: tarefa.data_lancamento,
                        icon: Rocket,
                        color: "bg-indigo-100 text-indigo-700",
                      },
                      {
                        label: "Lib. p/ execução",
                        date: tarefa.data_liberacao_execucao,
                        icon: ArrowRight,
                        color: "bg-cyan-100 text-cyan-700",
                      },
                      {
                        label: "Início execução",
                        date: tarefa.data_inicio_execucao,
                        icon: PlayCircle,
                        color: "bg-blue-100 text-blue-700",
                      },
                      {
                        label: "Conclusão",
                        date: tarefa.data_conclusao,
                        icon: CheckCircle2,
                        color: "bg-emerald-100 text-emerald-700",
                      },
                      {
                        label: "Concluído em",
                        date: tarefa.completed_at,
                        icon: CheckCircle2,
                        color: "bg-teal-100 text-teal-700",
                      },
                      {
                        label: "Últ. atualização",
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
                            {date ? fmtDateTime(date) : "\—"}
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
                        label: "Início previsto",
                        date: tarefa.start_date,
                      },
                      {
                        label: "Prazo de entrega",
                        date: tarefa.due_date,
                        highlight: overdue,
                      },
                      { label: "Concluído em", date: tarefa.completed_at },
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
                          {date ? fmtDate(date) : "\—"}
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
                      Informações sensíveis
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Credenciais e acessos não são exibidos diretamente
                    por segurança. Utilize a seção de acessos do
                    projeto para visualizá-los com proteção.
                  </p>
                </div>
                <EmptyState
                  icon={Lock}
                  message="Acessos e credenciais serão exibidos aqui via integração segura."
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
        </div>
      </EmbeddedSlideScreen>

      {/* Pause Modal */}
      <PauseModal
        open={!!pauseStage}
        stage={pauseStage}
        onClose={() => setPauseStage(null)}
        onConfirm={handlePauseConfirm}
        saving={pauseSaving}
      />

      {/* Confirmação de entrega emergencial */}
      <Dialog open={emergencialConfirmOpen} onOpenChange={(v) => !v && setEmergencialConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Solicitar entrega emergencial
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            O prazo será reduzido em{" "}
            <strong>{tarefa?.project_product?.taxa_emergencial_reducao_percentual_snapshot ?? 50}%</strong> e
            será cobrado <strong>+50%</strong> do valor deste produto (
            {(0.5 * (tarefa?.project_product?.preco_final_cliente_snapshot ?? 0)).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            ). Confirma?
          </p>
          {emergencialAviso && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">{emergencialAviso}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmergencialConfirmOpen(false)} disabled={emergencialSalvando}>
              Cancelar
            </Button>
            <Button onClick={solicitarEmergencial} disabled={emergencialSalvando} className="gap-2">
              {emergencialSalvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
