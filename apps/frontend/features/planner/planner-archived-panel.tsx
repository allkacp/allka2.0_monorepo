// Painel "Cards arquivados" do Planejador (item seguinte ao lote de
// persistência — ata 2026-08-24). Modal seguindo o mesmo padrão visual
// dos outros diálogos do Planejador (Dialog/DialogContent).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Archive, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { usePlannerArchivedCards } from "./use-planner-archived-cards";
import type { PlannerArchivedCard, PlannerCard } from "@/lib/api-client";

function formatArchivedAt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlannerArchivedPanel({
  open,
  onClose,
  onRestored,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onRestored: (card: PlannerCard, usedFallbackColumn: boolean) => void;
  onDeleted?: () => void;
}) {
  const archive = usePlannerArchivedCards();
  const [deletingCard, setDeletingCard] = useState<PlannerArchivedCard | null>(null);

  useEffect(() => {
    if (open) archive.load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRestore = async (id: string) => {
    const result = await archive.restore(id);
    if (result.ok) {
      onRestored(result.card, result.usedFallbackColumn);
    }
    // Erro fica só na lista (sem toast aqui) — o card continua visível na
    // lista de arquivados, exatamente como estava; o chamador decide se
    // quer um toast global (ver PlannerBoard).
  };

  const confirmDelete = async () => {
    if (!deletingCard) return;
    const result = await archive.deletePermanently(deletingCard.id);
    if (!result.ok) throw new Error(result.error);
    onDeleted?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Cards arquivados
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-[240px]">
            {archive.status === "loading" && (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Carregando cards arquivados…
              </div>
            )}

            {archive.status === "error" && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertCircle className="h-7 w-7 text-red-400" />
                <p className="text-sm text-slate-500">{archive.error}</p>
                <Button size="sm" variant="outline" onClick={() => archive.load(archive.page)}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {archive.status === "ready" && archive.data.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Archive className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhum card arquivado.</p>
              </div>
            )}

            {archive.status === "ready" && archive.data.length > 0 && (
              <div className="space-y-2 py-2 max-h-[420px] overflow-y-auto">
                {archive.data.map((card) => {
                  const restoring = archive.isRestoring(card.id);
                  const deleting = archive.isDeleting(card.id);
                  const busy = restoring || deleting;
                  return (
                    <div
                      key={card.id}
                      className="rounded-md border border-slate-200 p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{card.title}</p>
                        {card.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{card.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                          <span>
                            Coluna: {card.columnLabel ?? <span className="italic">coluna removida</span>}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>Arquivado em {formatArchivedAt(card.archivedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={busy}
                          onClick={() => handleRestore(card.id)}
                        >
                          {restoring ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          {restoring ? "Restaurando…" : "Restaurar"}
                        </Button>
                        <button
                          onClick={() => setDeletingCard(card)}
                          disabled={busy}
                          title="Excluir definitivamente"
                          aria-label={`Excluir card ${card.title} definitivamente`}
                          className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {archive.status === "ready" && archive.total > archive.pageSize && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>{archive.total} arquivado(s) no total</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={archive.page <= 1}
                  onClick={() => archive.load(archive.page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span>
                  Página {archive.page} de {archive.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={archive.page >= archive.totalPages}
                  onClick={() => archive.load(archive.page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deletingCard !== null}
        onClose={() => setDeletingCard(null)}
        onConfirm={confirmDelete}
        title="Excluir card definitivamente"
        message="O card será apagado do banco de dados."
        twoStep
        destructive
        targetName={deletingCard?.title}
        targetDetail={deletingCard?.columnLabel ?? undefined}
        consequences={[
          "Esta ação é permanente — o registro é removido de vez, não fica arquivado.",
          "Não poderá ser restaurado depois.",
        ]}
        finalConfirmText="Excluir card definitivamente"
      />
    </>
  );
}
