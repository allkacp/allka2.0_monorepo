
import React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  if (!open) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-700">

        {/* Top accent bar */}
        <div className={`h-1 w-full ${destructive ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-blue-500 to-violet-600"}`} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-0">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            destructive
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-blue-50 dark:bg-blue-900/20"
          }`}>
            {destructive
              ? <AlertTriangle className="h-5 w-5 text-red-500" />
              : <CheckCircle2 className="h-5 w-5 text-blue-500" />}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
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
                : "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-blue-200 dark:shadow-blue-900/30"
            }`}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)}