// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react"
import {
  AlertTriangle,
  MessageSquare,
  XCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
  ChevronDown,
  X,
  Paperclip,
  Upload,
  Check,
  AlertCircle,
  RefreshCw,
  Ban,
  Inbox,
  ArrowUpDown,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 1 | 2 | 3 | 4 | 5
type AlertStatus = "open" | "resolved" | "postponed" | "cancelled" | "pending_approval"

interface Attachment {
  name: string
  url: string   // object URL (URL.createObjectURL) – persists while page is open
  type: string  // MIME type
  size: number  // bytes
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImage(att: Attachment) {
  return att.type.startsWith("image/")
}

function isPDF(att: Attachment) {
  return att.type === "application/pdf"
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

interface SystemAlertFull {
  id: string
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema"
  priority: Priority
  title: string
  description: string
  count: number
  link: string
  icon: React.ElementType
  createdAt: Date
  dueDate: Date | null
  status: AlertStatus
  resolutionNote?: string
  postponeReason?: string
  cancelReason?: string
  newDate?: Date
  attachments?: Attachment[]
}

// ─── Priority Config ─────────────────────────────────────────────────────────

const priorityConfig: Record<
  Priority,
  { label: string; cardClass: string; badgeClass: string; indicatorClass: string; dotClass: string }
> = {
  1: {
    label: "Prioridade 1",
    cardClass:
      "bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
    indicatorClass: "bg-blue-500",
    dotClass: "bg-blue-500",
  },
  2: {
    label: "Prioridade 2",
    cardClass:
      "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700",
    badgeClass:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
    indicatorClass: "bg-green-500",
    dotClass: "bg-green-500",
  },
  3: {
    label: "Prioridade 3",
    cardClass:
      "bg-purple-50 border-purple-300 dark:bg-purple-950/30 dark:border-purple-700",
    badgeClass:
      "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
    indicatorClass: "bg-purple-500",
    dotClass: "bg-purple-500",
  },
  4: {
    label: "Prioridade 4",
    cardClass:
      "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700",
    badgeClass:
      "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
    indicatorClass: "bg-orange-500",
    dotClass: "bg-orange-500",
  },
  5: {
    label: "Prioridade 5",
    cardClass:
      "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700",
    badgeClass:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
    indicatorClass: "bg-red-500",
    dotClass: "bg-red-500",
  },
}

const statusConfig: Record<
  AlertStatus,
  { label: string; icon: React.ElementType; class: string }
> = {
  open: { label: "Aberto", icon: AlertCircle, class: "text-slate-600 bg-slate-100 border-slate-300" },
  resolved: { label: "Resolvido", icon: CheckCircle2, class: "text-green-700 bg-green-100 border-green-300" },
  postponed: { label: "Adiado", icon: Clock, class: "text-amber-700 bg-amber-100 border-amber-300" },
  cancelled: { label: "Cancelado", icon: Ban, class: "text-red-700 bg-red-100 border-red-300" },
  pending_approval: { label: "Aguardando aprovação", icon: RefreshCw, class: "text-blue-700 bg-blue-100 border-blue-300" },
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const now = new Date()
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000)
const due = (daysFromNow: number) =>
  daysFromNow === 0 ? null : new Date(now.getTime() + daysFromNow * 86400000)

const initialAlerts: SystemAlertFull[] = [
  {
    id: "a1",
    type: "tarefas",
    priority: 5,
    title: "Tarefas atrasadas críticas",
    description: "12 tarefas com prazo vencido há mais de 72h precisam de ação imediata.",
    count: 12,
    link: "/admin/tasks?filter=atrasadas",
    icon: AlertTriangle,
    createdAt: d(3),
    dueDate: due(-1),
    status: "open",
  },
  {
    id: "a2",
    type: "financeiro",
    priority: 5,
    title: "Projetos inadimplentes",
    description: "3 projetos com pagamento vencido há mais de 30 dias.",
    count: 3,
    link: "/admin/projects?filter=inadimplentes",
    icon: XCircle,
    createdAt: d(5),
    dueDate: due(-3),
    status: "open",
  },
  {
    id: "a3",
    type: "mensagens",
    priority: 3,
    title: "Mensagens sem resposta",
    description: "7 mensagens aguardando resposta há mais de 24 horas.",
    count: 7,
    link: "/admin/messages?filter=sem_resposta",
    icon: MessageSquare,
    createdAt: d(1),
    dueDate: due(1),
    status: "open",
  },
  {
    id: "a4",
    type: "sistema",
    priority: 2,
    title: "Certificados expirando",
    description: "4 certificados SSL expiram nos próximos 15 dias.",
    count: 4,
    link: "/admin/sistema?filter=certificados",
    icon: AlertTriangle,
    createdAt: d(2),
    dueDate: due(14),
    status: "open",
  },
  {
    id: "a5",
    type: "projetos",
    priority: 4,
    title: "Contratos pendentes de assinatura",
    description: "5 contratos aguardando assinatura eletrônica dos clientes.",
    count: 5,
    link: "/admin/projects?filter=contratos",
    icon: AlertCircle,
    createdAt: d(4),
    dueDate: due(3),
    status: "open",
  },
  {
    id: "a6",
    type: "tarefas",
    priority: 1,
    title: "Atualizações de rotina pendentes",
    description: "Documentação de 8 projetos precisa de revisão periódica.",
    count: 8,
    link: "/admin/tasks?filter=rotina",
    icon: Clock,
    createdAt: d(7),
    dueDate: due(30),
    status: "open",
  },
  {
    id: "a7",
    type: "financeiro",
    priority: 3,
    title: "Notas fiscais a emitir",
    description: "9 notas fiscais pendentes de emissão referentes ao mês anterior.",
    count: 9,
    link: "/admin/financeiro?filter=nf",
    icon: AlertCircle,
    createdAt: d(6),
    dueDate: due(5),
    status: "open",
  },
]

// ─── Attachment Viewer Modal ─────────────────────────────────────────────────

interface AttachmentViewerProps {
  attachments: Attachment[]
  initialIndex?: number
  onClose: () => void
}

function AttachmentViewer({ attachments, initialIndex = 0, onClose }: AttachmentViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const current = attachments[index]
  const hasPrev = index > 0
  const hasNext = index < attachments.length - 1

  useEffect(() => { setZoom(1); setRotation(0) }, [index])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft" && hasPrev) setIndex((i) => i - 1)
      if (e.key === "ArrowRight" && hasNext) setIndex((i) => i + 1)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [hasPrev, hasNext, onClose])

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = current.url
    a.download = current.name
    a.click()
  }

  return (
    <div className="fixed inset-0 z-500 flex flex-col" style={{ background: "rgba(0,0,0,0.93)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {isImage(current)
            ? <ImageIcon className="h-4 w-4 text-white/60 shrink-0" />
            : <FileText className="h-4 w-4 text-white/60 shrink-0" />
          }
          <span className="text-sm font-medium text-white truncate">{current.name}</span>
          <span className="text-xs text-white/40 shrink-0">{formatBytes(current.size)}</span>
          {attachments.length > 1 && (
            <span className="text-xs text-white/40 shrink-0">{index + 1} / {attachments.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isImage(current) && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Reduzir"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-white/50 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Ampliar"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Girar"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <div className="w-px h-5 bg-white/20" />
            </>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors border border-white/20"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        {hasPrev && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors border border-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1 h-full flex items-center justify-center p-6 overflow-auto">
          {isImage(current) ? (
            <img
              src={current.url}
              alt={current.name}
              className="max-w-none object-contain transition-transform duration-200 select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxHeight: zoom === 1 ? "100%" : "none",
                maxWidth:  zoom === 1 ? "100%" : "none",
              }}
              draggable={false}
            />
          ) : isPDF(current) ? (
            <iframe
              src={current.url}
              className="w-full h-full rounded-lg border border-white/10"
              style={{ minHeight: "70vh" }}
              title={current.name}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/60">
              <FileText className="h-16 w-16" />
              <p className="text-sm">Visualização não disponível para este tipo de arquivo</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-white"
              >
                <Download className="h-4 w-4" />
                Baixar arquivo
              </button>
            </div>
          )}
        </div>

        {hasNext && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors border border-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {attachments.length > 1 && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-black/60 border-t border-white/10 overflow-x-auto">
          {attachments.map((att, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 relative h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                i === index
                  ? "border-blue-400 opacity-100 scale-105"
                  : "border-white/20 opacity-50 hover:opacity-80",
              )}
              title={att.name}
            >
              {isImage(att) ? (
                <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white/10">
                  <FileText className="h-5 w-5 text-white/60" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Attachment Chip Strip ────────────────────────────────────────────────────

interface AttachmentChipsProps {
  attachments: Attachment[]
  onView: (index: number) => void
}

function AttachmentChips({ attachments, onView }: AttachmentChipsProps) {
  if (!attachments || attachments.length === 0) return null
  return (
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Comprovantes:</span>
      {attachments.map((att, i) => (
        <button
          key={i}
          onClick={() => onView(i)}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all shadow-sm"
          title={`Visualizar: ${att.name}`}
        >
          {isImage(att)
            ? <ImageIcon className="h-3 w-3 shrink-0" />
            : <FileText className="h-3 w-3 shrink-0" />
          }
          <span className="max-w-35 truncate">{att.name}</span>
          <Eye className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      ))}
      {attachments.length > 1 && (
        <button
          onClick={() => onView(0)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
        >
          <Eye className="h-3 w-3" />
          Ver todos ({attachments.length})
        </button>
      )}
    </div>
  )
}

// ─── Action Dialog ──────────────────────────────────────────────────────────────────

type DialogType = "resolve" | "postpone" | "cancel" | null

interface DialogState {
  type: DialogType
  alertId: string | null
}

interface FileUploadAreaProps {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
}

function FileUploadArea({ files, onChange, label = "Anexar comprovantes (prints)" }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    onChange([...files, ...Array.from(newFiles)])
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
      >
        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Clique ou arraste prints aqui
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, PDF até 10MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{file.name}</span>
              <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)}KB</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Action Dialog Component ─────────────────────────────────────────────────

interface ActionDialogProps {
  type: "resolve" | "postpone" | "cancel"
  alert: SystemAlertFull
  onClose: () => void
  onConfirm: (data: {
    note: string
    files: File[]
    newDate?: string
  }) => void
}

function ActionDialog({ type, alert, onClose, onConfirm }: ActionDialogProps) {
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [newDate, setNewDate] = useState("")
  const [error, setError] = useState("")

  const config = {
    resolve: {
      title: "Confirmar resolução",
      subtitle: "Descreva detalhadamente o que foi feito para resolver esta atenção.",
      noteLabel: "Explicação da resolução *",
      notePlaceholder: "Descreva as ações tomadas para resolver este item...",
      confirmLabel: "Confirmar Resolução",
      confirmClass: "bg-green-600 hover:bg-green-700 text-white",
      icon: CheckCircle2,
      iconClass: "text-green-600",
      requireNote: true,
      requireDate: false,
    },
    postpone: {
      title: "Solicitar adiamento",
      subtitle: "Informe o motivo do adiamento e a nova data proposta. O item será enviado para aprovação de um responsável.",
      noteLabel: "Motivo do adiamento *",
      notePlaceholder: "Explique por que este item precisa ser adiado...",
      confirmLabel: "Solicitar Adiamento",
      confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
      icon: Clock,
      iconClass: "text-amber-600",
      requireNote: true,
      requireDate: true,
    },
    cancel: {
      title: "Cancelar atenção",
      subtitle: "Informe o motivo do cancelamento com evidências comprobatórias.",
      noteLabel: "Motivo do cancelamento *",
      notePlaceholder: "Descreva o motivo pelo qual este item está sendo cancelado...",
      confirmLabel: "Cancelar Item",
      confirmClass: "bg-red-600 hover:bg-red-700 text-white",
      icon: Ban,
      iconClass: "text-red-600",
      requireNote: true,
      requireDate: false,
    },
  }[type]

  const Icon = config.icon

  const handleConfirm = () => {
    if (!note.trim()) {
      setError(
        type === "resolve"
          ? "A explicação da resolução é obrigatória."
          : type === "postpone"
          ? "O motivo do adiamento é obrigatório."
          : "O motivo do cancelamento é obrigatório.",
      )
      return
    }
    if (config.requireDate && !newDate) {
      setError("A nova data é obrigatória para solicitar o adiamento.")
      return
    }
    onConfirm({ note, files, newDate: newDate || undefined })
  }

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", 
            type === "resolve" ? "bg-green-100 dark:bg-green-950/50" 
            : type === "postpone" ? "bg-amber-100 dark:bg-amber-950/50"
            : "bg-red-100 dark:bg-red-950/50"
          )}>
            <Icon className={cn("h-5 w-5", config.iconClass)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{config.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400">{config.subtitle}</p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.noteLabel}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setError("") }}
              placeholder={config.notePlaceholder}
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          {config.requireDate && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nova data proposta *
              </Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setError("") }}
                min={new Date().toISOString().split("T")[0]}
                className="text-sm"
              />
            </div>
          )}

          <FileUploadArea
            files={files}
            onChange={setFiles}
            label={
              type === "resolve"
                ? "Comprovantes da resolução (opcional)"
                : type === "postpone"
                ? "Comprovantes para o adiamento (opcional)"
                : "Comprovantes do cancelamento (opcional)"
            }
          />

          {type === "postpone" && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <RefreshCw className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Este item será enviado para aprovação de um responsável. Enquanto aguarda aprovação, o status ficará como <strong>Aguardando aprovação</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} className="text-sm">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn("text-sm gap-2", config.confirmClass)}
          >
            <Check className="h-4 w-4" />
            {config.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: SystemAlertFull
  onAction: (id: string, action: "resolve" | "postpone" | "cancel") => void
  onViewAttachments: (attachments: Attachment[], initialIndex?: number) => void
}

function AlertCard({ alert, onAction, onViewAttachments }: AlertCardProps) {
  const pConfig = priorityConfig[alert.priority]
  const sConfig = statusConfig[alert.status]
  const Icon = alert.icon
  const StatusIcon = sConfig.icon

  const isOpen = alert.status === "open"

  const formatDate = (d: Date | null) => {
    if (!d) return null
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const isDuePast = alert.dueDate && alert.dueDate < now

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 shadow-sm transition-all duration-200",
        "hover:shadow-md",
        pConfig.cardClass,
        !isOpen && "opacity-75",
      )}
    >
      {/* Priority indicator bar */}
      <div
        className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl", pConfig.indicatorClass)}
      />

      <div className="pl-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0 opacity-70" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{alert.title}</span>
            <Badge className="text-xs font-bold px-1.5 py-0" variant="secondary">
              {alert.count}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                pConfig.badgeClass,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", pConfig.dotClass)} />
              {pConfig.label}
            </span>

            {/* Status badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                sConfig.class,
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {sConfig.label}
            </span>
            {/* Attachment count badge */}
            {alert.attachments && alert.attachments.length > 0 && (
              <button
                onClick={() => onViewAttachments(alert.attachments!, 0)}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Paperclip className="h-3 w-3" />
                {alert.attachments.length} anexo{alert.attachments.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
          {alert.description}
        </p>

        {/* Resolution / Postpone note */}
        {alert.resolutionNote && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-300">
              <strong>Resolução:</strong> {alert.resolutionNote}
            </p>
            {alert.attachments && alert.attachments.length > 0 && (
              <AttachmentChips
                attachments={alert.attachments}
                onView={(i) => onViewAttachments(alert.attachments!, i)}
              />
            )}
          </div>
        )}
        {alert.postponeReason && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Motivo do adiamento:</strong> {alert.postponeReason}
              {alert.newDate && (
                <span className="ml-2">
                  → Nova data: <strong>{formatDate(alert.newDate)}</strong>
                </span>
              )}
            </p>
            {alert.attachments && alert.attachments.length > 0 && (
              <AttachmentChips
                attachments={alert.attachments}
                onView={(i) => onViewAttachments(alert.attachments!, i)}
              />
            )}
          </div>
        )}
        {alert.cancelReason && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300">
              <strong>Motivo do cancelamento:</strong> {alert.cancelReason}
            </p>
            {alert.attachments && alert.attachments.length > 0 && (
              <AttachmentChips
                attachments={alert.attachments}
                onView={(i) => onViewAttachments(alert.attachments!, i)}
              />
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Criado: {formatDate(alert.createdAt)}
            </span>
            {alert.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isDuePast ? "text-red-600 dark:text-red-400 font-medium" : "",
                )}
              >
                <Clock className="h-3 w-3" />
                Venc: {formatDate(alert.dueDate)}
                {isDuePast && " (vencido)"}
              </span>
            )}
          </div>

          {/* Action buttons – only if open */}
          {isOpen && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onAction(alert.id, "resolve")}
                className="h-7 px-3 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolvido
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(alert.id, "postpone")}
                className="h-7 px-3 gap-1.5 text-xs border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <Clock className="h-3.5 w-3.5" />
                Adiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(alert.id, "cancel")}
                className="h-7 px-3 gap-1.5 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type StatusFilter =
  | "open"
  | "resolved"
  | "postponed"
  | "cancelled"
  | "pending_approval"
  | "all"
type SortOption = "priority_desc" | "priority_asc" | "date_desc" | "date_asc" | "due_asc" | "due_desc"

interface ViewerState {
  attachments: Attachment[]
  initialIndex: number
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<SystemAlertFull[]>(initialAlerts)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open")
  const [sortBy, setSortBy] = useState<SortOption>("priority_desc")
  const [dialog, setDialog] = useState<DialogState>({ type: null, alertId: null })
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  // ─── Computed ────────────────────────────────────────────────────────────

  const filtered = alerts
    .filter((a) => {
      if (statusFilter === "all") return true
      return a.status === statusFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "priority_desc":
          return b.priority - a.priority
        case "priority_asc":
          return a.priority - b.priority
        case "date_desc":
          return b.createdAt.getTime() - a.createdAt.getTime()
        case "date_asc":
          return a.createdAt.getTime() - b.createdAt.getTime()
        case "due_asc": {
          const da = a.dueDate?.getTime() ?? Infinity
          const db = b.dueDate?.getTime() ?? Infinity
          return da - db
        }
        case "due_desc": {
          const da = a.dueDate?.getTime() ?? -Infinity
          const db = b.dueDate?.getTime() ?? -Infinity
          return db - da
        }
        default:
          return 0
      }
    })

  // ─── Counts ──────────────────────────────────────────────────────────────

  const counts = {
    all: alerts.length,
    open: alerts.filter((a) => a.status === "open").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
    postponed: alerts.filter((a) => a.status === "postponed").length,
    cancelled: alerts.filter((a) => a.status === "cancelled").length,
    pending_approval: alerts.filter((a) => a.status === "pending_approval").length,
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openDialog = (id: string, action: "resolve" | "postpone" | "cancel") => {
    setDialog({ type: action, alertId: id })
  }

  const closeDialog = () => setDialog({ type: null, alertId: null })

  const openViewer = useCallback((attachments: Attachment[], initialIndex = 0) => {
    setViewer({ attachments, initialIndex })
  }, [])

  const handleConfirm = ({
    note,
    files,
    newDate,
  }: {
    note: string
    files: File[]
    newDate?: string
  }) => {
    if (!dialog.alertId || !dialog.type) return

    // Convert File[] → Attachment[] with object URLs so they persist on the card
    const attachments: Attachment[] = files.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type || "application/octet-stream",
      size: f.size,
    }))

    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== dialog.alertId) return a
        const base = { ...a, attachments: attachments.length > 0 ? attachments : a.attachments }
        if (dialog.type === "resolve") {
          return { ...base, status: "resolved", resolutionNote: note }
        }
        if (dialog.type === "postpone") {
          return {
            ...base,
            status: "pending_approval",
            postponeReason: note,
            newDate: newDate ? new Date(newDate) : undefined,
          }
        }
        if (dialog.type === "cancel") {
          return { ...base, status: "cancelled", cancelReason: note }
        }
        return a
      }),
    )
    closeDialog()
  }

  // ─── Sort label ──────────────────────────────────────────────────────────

  const sortLabel: Record<SortOption, string> = {
    priority_desc: "Prioridade ↓",
    priority_asc: "Prioridade ↑",
    date_desc: "Data (mais recente)",
    date_asc: "Data (mais antiga)",
    due_asc: "Vencimento (próximo)",
    due_desc: "Vencimento (distante)",
  }

  // ─── Status tab label map ─────────────────────────────────────────────────

  const statusTabs: { key: StatusFilter; label: string; icon: React.ElementType }[] = [
    { key: "open", label: "Abertos", icon: AlertCircle },
    { key: "all", label: "Todos", icon: Inbox },
    { key: "pending_approval", label: "Aguardando", icon: RefreshCw },
    { key: "resolved", label: "Resolvidos", icon: CheckCircle2 },
    { key: "postponed", label: "Adiados", icon: Clock },
    { key: "cancelled", label: "Cancelados", icon: Ban },
  ]

  // ─── Active alert (for dialog) ───────────────────────────────────────────

  const activeAlert = dialog.alertId
    ? alerts.find((a) => a.id === dialog.alertId)
    : null

  // ─── Legend ──────────────────────────────────────────────────────────────

  const priorityLegend: Priority[] = [1, 2, 3, 4, 5]

  return (
    <>
      <div className="space-y-6">
      <PageHeader
        title="Central de Atenções"
        description={<>{counts.open} aberto{counts.open !== 1 ? "s" : ""}{counts.pending_approval > 0 && (<span className="ml-2 text-amber-600 font-medium">• {counts.pending_approval} aguardando aprovação</span>)}</>}
        actions={<>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-sm">
              <ArrowUpDown className="h-4 w-4" />
              {sortLabel[sortBy]}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Ordenar por
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.entries(sortLabel) as [SortOption, string][]).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setSortBy(key)}
                className={cn("text-sm gap-2", sortBy === key && "font-semibold text-blue-600")}
              >
                {sortBy === key && <Check className="h-3.5 w-3.5" />}
                {sortBy !== key && <span className="w-3.5" />}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </>}
      />

      {/* Priority legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Legenda:</span>
        {priorityLegend.map((p) => (
          <span
            key={p}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
              priorityConfig[p].badgeClass,
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", priorityConfig[p].dotClass)} />
            P{p} – {p === 1 ? "Menos importante" : p === 5 ? "Crítico" : priorityConfig[p].label}
          </span>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-wrap">
        {statusTabs.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              statusFilter === key
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            )}
          >
            <TabIcon className="h-3.5 w-3.5" />
            {label}
            {counts[key] > 0 && (
              <span
                className={cn(
                  "ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold",
                  statusFilter === key
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
                )}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-gray-500">
          <Inbox className="h-12 w-12" />
          <p className="text-base font-medium">Nenhum item nesta categoria</p>
          <p className="text-sm">Altere o filtro para visualizar outros itens</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAction={openDialog} onViewAttachments={openViewer} />
          ))}
        </div>
      )}

      </div>

      {/* Action Dialog */}
      {dialog.type && activeAlert && (
        <ActionDialog
          type={dialog.type}
          alert={activeAlert}
          onClose={closeDialog}
          onConfirm={handleConfirm}
        />
      )}

      {/* Attachment Viewer */}
      {viewer && (
        <AttachmentViewer
          attachments={viewer.attachments}
          initialIndex={viewer.initialIndex}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  )
}
