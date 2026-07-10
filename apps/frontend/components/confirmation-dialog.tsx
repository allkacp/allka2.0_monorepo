
import React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/slide-panel'

interface ConfirmationDialogProps {
  /** Controls the visibility of the dialog */
  open: boolean
  /** Function called when the dialog is closed (Cancel button or outside click) */
  onClose: () => void
  /** Function called when the user confirms the action */
  onConfirm: () => void
  /** Title text for the dialog */
  title: string
  /** Main message explaining the action to be confirmed */
  message: React.ReactNode
  /** Text for the confirm button (default: "Confirmar") */
  confirmText?: string
  /** Text for the cancel button (default: "Cancelar") */
  cancelText?: string
  /** Whether the confirm button should have destructive styling (default: true) */
  destructive?: boolean
}

/**
 * Generic confirmation dialog component for destructive actions
 *
 * @example
 * \`\`\`tsx
 * const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null })
 *
 * const handleDeleteClick = (item) => {
 *   setDeleteDialog({ open: true, item })
 * }
 *
 * const handleConfirmDelete = async () => {
 *   await deleteItem(deleteDialog.item.id)
 *   setDeleteDialog({ open: false, item: null })
 * }
 *
 * <ConfirmationDialog
 *   open={deleteDialog.open}
 *   onClose={() => setDeleteDialog({ open: false, item: null })}
 *   onConfirm={handleConfirmDelete}
 *   title="Confirmar Exclusão"
 *   message={`Tem certeza que deseja excluir "${deleteDialog.item?.name}"? Esta ação não pode ser desfeita.`}
 * />
 * \`\`\`
 */
export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  destructive = true,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={title}
      widthMode="compact"
      compactWidth={420}
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            className={`flex-1 h-10 text-sm font-semibold text-white border-0 transition-all ${
              destructive
                ? "bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg shadow-red-500/20 dark:shadow-red-900/40"
                : "btn-brand"
            }`}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="px-6 py-5 flex-1 overflow-y-auto">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl mb-5 ${
          destructive
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
        }`}>
          {destructive
            ? <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            : <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
      </div>
    </SlidePanel>
  )
}