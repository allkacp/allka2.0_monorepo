// Overlay único de exportação — mostra etapas reais (nunca percentual
// falso), some sozinho pouco depois do sucesso, fica visível em erro até
// o usuário fechar/tentar de novo. `data-export-ignore`: o próprio
// overlay nunca é capturado (mas nem precisaria — ele só existe DEPOIS da
// captura ter começado a rodar em memória, é adicionado ao DOM fora do
// container "dashboard-export-area").
import { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, FileDown, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPORT_STAGE_LABEL, type ExportState } from "./dashboard-export";

export function DashboardExportOverlay({
  state,
  onDismiss,
  onRetry,
}: {
  state: ExportState;
  onDismiss: () => void;
  /** Item 21 — reexecuta a exportação no mesmo formato que falhou, sem o usuário precisar achar o botão original de novo. Opcional: quem não passar mantém só "Fechar". */
  onRetry?: (format: NonNullable<ExportState["format"]>) => void;
}) {
  useEffect(() => {
    if (state.stage !== "success") return;
    const t = setTimeout(onDismiss, 1600);
    return () => clearTimeout(t);
  }, [state.stage, onDismiss]);

  if (state.stage === "idle") return null;

  const FormatIcon = state.format === "pdf" ? FileDown : ImageIcon;
  const isWorking = state.stage === "preparing" || state.stage === "rendering" || state.stage === "generating";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-xs rounded-2xl bg-card border border-border/60 shadow-xl p-5 text-center space-y-3">
        <div
          className={cn(
            "mx-auto flex h-11 w-11 items-center justify-center rounded-full",
            state.stage === "error" ? "bg-destructive/10" : state.stage === "success" ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-primary/10",
          )}
        >
          {isWorking && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {state.stage === "success" && <CheckCircle2 className="h-5.5 w-5.5 text-emerald-600 dark:text-emerald-400" />}
          {state.stage === "error" && <XCircle className="h-5.5 w-5.5 text-destructive" />}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
          <FormatIcon className="h-3.5 w-3.5" />
          {state.format === "pdf" ? "PDF" : "PNG"}
        </div>

        <p className="text-sm font-medium">
          {state.stage === "success"
            ? `${state.format === "pdf" ? "PDF" : "PNG"} gerado com sucesso`
            : state.stage === "error"
              ? state.error || EXPORT_STAGE_LABEL.error
              : EXPORT_STAGE_LABEL[state.stage]}
        </p>

        {state.stage === "error" && (
          <div className="flex items-center justify-center gap-4">
            {onRetry && state.format && (
              <button
                type="button"
                onClick={() => onRetry(state.format!)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
