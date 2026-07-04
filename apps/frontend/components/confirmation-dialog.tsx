
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
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            className={`flex-1 h-9 text-sm font-semibold text-white border-0 shadow-sm ${
              destructive
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-200 dark:shadow-red-900/30"
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
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl mb-4 ${
          destructive
            ? "bg-red-50 dark:bg-red-900/20"
            : "bg-blue-50 dark:bg-blue-900/20"
        }`}>
          {destructive
            ? <AlertTriangle className="h-5 w-5 text-red-500" />
            : <CheckCircle2 className="h-5 w-5 text-blue-500" />}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
      </div>
    </SlidePanel>
  )
}