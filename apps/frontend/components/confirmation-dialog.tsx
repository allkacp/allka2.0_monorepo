
import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardModalDialog } from '@/components/standard-modal-dialog'

interface ConfirmationDialogProps {
  /** Controls the visibility of the dialog */
  open: boolean
  /** Function called when the dialog is closed (Cancel button, Escape, or outside click) */
  onClose: () => void
  /** Function called when the user confirms the action. May return a Promise —
   * the dialog awaits it, shows a loading state, and surfaces a rejection as
   * an inline error without closing (the item stays intact). A plain
   * synchronous callback keeps working exactly like before. */
  onConfirm: () => void | Promise<void>
  /** Title text for the dialog (step 1 in two-step mode) */
  title: string
  /** Main message explaining the action to be confirmed */
  message: React.ReactNode
  /** Text for the confirm button (default: "Confirmar"). Ignored in two-step
   * mode — use `continueText` / `finalConfirmText` instead. */
  confirmText?: string
  /** Text for the cancel button (default: "Cancelar") */
  cancelText?: string
  /** Whether the confirm button should have destructive styling (default: true) */
  destructive?: boolean
  /** Icon shown in the highlight badge (default: AlertTriangle when
   * destructive, CheckCircle2 otherwise). */
  icon?: LucideIcon

  // ── Confirmação em duas etapas (opcional, retrocompatível) ────────────────
  /** Ativa o fluxo de duas etapas: 1) explica a ação, 2) confirmação final.
   * As duas etapas acontecem dentro deste MESMO diálogo — nunca dois modais
   * sobrepostos. `onConfirm` só é chamado a partir da segunda etapa. */
  twoStep?: boolean
  /** Nome/alvo da ação, mostrado nas duas etapas (ex.: nome do produto, ou
   * "12 itens"). */
  targetName?: React.ReactNode
  /** Detalhe adicional do alvo, mostrado junto do nome (ex.: código do
   * produto). */
  targetDetail?: React.ReactNode
  /** Lista curta das principais consequências da ação. */
  consequences?: React.ReactNode[]
  /** Texto do botão que avança da 1ª para a 2ª etapa (default: "Continuar
   * para confirmação"). */
  continueText?: string
  /** Texto do botão final da 2ª etapa (ex.: "Excluir produto
   * definitivamente"). Obrigatório em espírito quando `twoStep` é usado. */
  finalConfirmText?: string
}

/**
 * Generic confirmation dialog component for destructive actions.
 *
 * Modo simples (compatível com todos os usos antigos): abre já com o botão
 * de confirmação, chama `onConfirm` e fecha — inalterado, exceto que agora
 * também tolera um `onConfirm` assíncrono (aguarda, mostra erro amigável em
 * caso de falha e mantém o item intacto, sem fechar).
 *
 * Modo `twoStep`: primeira etapa explica a ação; um botão "Continuar para
 * confirmação" leva à segunda etapa, que reforça o alvo e usa o texto de
 * `finalConfirmText` no botão vermelho final — só ali `onConfirm` é
 * chamado. Fechar e reabrir sempre volta pra primeira etapa.
 *
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={async () => { await deleteProduct(id); await refresh(); }}
 *   title="Excluir produto"
 *   message="Esta ação é permanente."
 *   twoStep
 *   targetName={product.name}
 *   targetDetail={product.code}
 *   consequences={["O produto some do catálogo.", "Vínculos existentes impedem a exclusão."]}
 *   finalConfirmText="Excluir produto definitivamente"
 * />
 * ```
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
  icon,
  twoStep = false,
  targetName,
  targetDetail,
  consequences,
  continueText = "Continuar para confirmação",
  finalConfirmText,
}: ConfirmationDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Abrir sempre começa na 1ª etapa; fechar e reabrir reinicia o fluxo.
  useEffect(() => {
    if (open) {
      setStep(1)
      setError(null)
      setIsSubmitting(false)
    }
  }, [open])

  // Durante a operação final, ignora fechamento (Escape/clique fora/X) —
  // evita fechar no meio de uma exclusão em andamento.
  const guardedClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleAdvance = () => {
    if (isSubmitting) return
    setStep(2)
  }

  const handleBack = () => {
    if (isSubmitting) return
    setError(null)
    setStep(1)
  }

  // onConfirm só roda a partir daqui — nunca na 1ª etapa. Um clique duplo
  // ou repetido enquanto isSubmitting é true não dispara uma segunda
  // chamada, e chega a chamar onConfirm no máximo uma vez por confirmação.
  const handleConfirm = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.")
      setIsSubmitting(false)
    }
  }

  const Icon: LucideIcon = icon ?? (destructive ? AlertTriangle : CheckCircle2)
  const showingFinalStep = !twoStep || step === 2

  const footer = twoStep ? (
    step === 1 ? (
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={guardedClose}
        >
          {cancelText}
        </Button>
        <Button
          className="flex-1 h-10 text-sm font-semibold text-white border-0 btn-brand transition-all"
          onClick={handleAdvance}
        >
          {continueText}
        </Button>
      </div>
    ) : (
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={handleBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar
        </Button>
        <Button
          className="flex-1 h-10 text-sm font-semibold text-white border-0 transition-all bg-red-600 hover:bg-red-700 disabled:bg-red-600/60 shadow-md hover:shadow-lg shadow-red-500/20 dark:shadow-red-900/40 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          onClick={() => void handleConfirm()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Excluindo…
            </span>
          ) : (
            finalConfirmText ?? confirmText
          )}
        </Button>
      </div>
  )
  ) : (
    <div className="flex flex-col-reverse sm:flex-row gap-2">
      <Button
        variant="outline"
        className="flex-1 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={guardedClose}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      <Button
        className={`flex-1 h-10 text-sm font-semibold text-white border-0 transition-all ${
          destructive
            ? "bg-red-600 hover:bg-red-700 disabled:bg-red-600/60 shadow-md hover:shadow-lg shadow-red-500/20 dark:shadow-red-900/40 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            : "btn-brand"
        }`}
        onClick={() => void handleConfirm()}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguarde…
          </span>
        ) : (
          confirmText
        )}
      </Button>
    </div>
  )

  return (
    <StandardModalDialog
      open={open}
      onClose={guardedClose}
      title={showingFinalStep && twoStep ? `${title} — confirmação final` : title}
      size="compact"
      footer={footer}
    >
      <div className="px-6 py-5 flex-1 overflow-y-auto">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl mb-5 ${
          destructive
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
        }`}>
          <Icon className={`h-6 w-6 ${destructive ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        {(targetName || targetDetail) && (
          <div className="mt-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {targetName && (
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{targetName}</p>
            )}
            {targetDetail && (
              <p className="text-xs text-slate-400 mt-0.5">{targetDetail}</p>
            )}
          </div>
        )}

        {consequences && consequences.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}

        {twoStep && step === 2 && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
            Esta é a confirmação final — a ação será executada imediatamente ao clicar abaixo.
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <span className="text-xs font-medium leading-tight">{error}</span>
          </div>
        )}
      </div>
    </StandardModalDialog>
  )
}
