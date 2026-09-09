// Peças visuais compartilhadas do editor de widgets (ver
// use-dashboard-widget-editor.ts pro estado). Markup do painel "Editar
// Dashboard" que já existia em cada uma das 5 telas de dashboard
// (agency/company/leader/partner/admin) — extraído pra ser literalmente o
// mesmo componente usado ali E no editor de template
// (/admin/dashboard-templates), em vez de um look-alike reconstruído.
//
// Item 4 (reunião 09/09/2026) — acabamento visual da edição de widgets:
//  - "Salvar"/"Cancelar" subiram pro topo, junto de "Remover"/"Adicionar"
//    (DashboardWidgetEditorModeToggle), sempre visíveis sem rolar; o rodapé
//    separado (DashboardWidgetEditorFooter) deixou de existir;
//  - os contadores de widgets visíveis/ocultos/total ficaram ao lado da
//    instrução "Arraste para reordenar", no topo do corpo;
//  - o ajuste de largura ganhou rótulos ("1/3", "2/3", "Total"), estado
//    selecionado evidente (não só cor) e uma frase curta do efeito;
//  - limpeza visual contida: avisos de modo mais calmos, espaçamentos
//    consistentes. Nenhum comportamento mudou.
import { useState } from "react";
import {
  LayoutGrid,
  GripVertical,
  Plus,
  Trash2,
  Check,
  EyeOff,
  Activity,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelaEstreita } from "@/hooks/useTelaEstreita";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { WidgetState } from "./dashboard-common";
import { EDITOR_GRADIENT_MAP, type DashboardWidgetEditor, type EditorWidgetLibraryItem } from "./dashboard-widget-editor";

export function DashboardWidgetEditorModeToggle({
  editor,
  variant = "dark",
  onSave,
  onCancel,
  saveLabel = "Salvar",
  saving = false,
}: {
  editor: DashboardWidgetEditor;
  /** "dark": header com fundo gradiente colorido (agency/company/leader/partner). "light": header claro (admin, EmbeddedSlideScreen). */
  variant?: "dark" | "light";
  /** Item 4 — quando passados, "Cancelar" e "Salvar" renderizam aqui no topo,
   *  ao lado de "Remover"/"Adicionar" (não há mais rodapé separado). */
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  saving?: boolean;
}) {
  const dark = variant === "dark";
  const inactiveClass = dark ? "bg-white/15 hover:bg-white/25 text-white/90" : "bg-muted hover:bg-muted/70 text-foreground";
  const modeBtn = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
  const ring = dark
    ? "focus-visible:ring-white focus-visible:ring-offset-transparent"
    : "focus-visible:ring-ring focus-visible:ring-offset-background";
  const showActions = typeof onSave === "function" || typeof onCancel === "function";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => editor.setMode((m) => (m === "remover" ? "none" : "remover"))}
        aria-pressed={editor.mode === "remover"}
        className={cn(modeBtn, ring, editor.mode === "remover" ? "bg-red-500 text-white shadow-md" : inactiveClass)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remover
      </button>
      <button
        type="button"
        onClick={() => editor.setMode((m) => (m === "adicionar" ? "none" : "adicionar"))}
        aria-pressed={editor.mode === "adicionar"}
        className={cn(modeBtn, ring, editor.mode === "adicionar" ? "bg-emerald-500 text-white shadow-md" : inactiveClass)}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </button>

      {showActions && (
        <>
          <div className={cn("w-px h-5 shrink-0 mx-0.5", dark ? "bg-white/25" : "bg-border")} aria-hidden="true" />
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              ring,
              dark ? "bg-white/15 hover:bg-white/25 text-white" : "bg-muted hover:bg-muted/70 text-foreground",
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              ring,
              dark ? "bg-white text-slate-900 hover:bg-white/90" : "btn-brand",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {saveLabel}
          </button>
        </>
      )}
    </div>
  );
}

export function DashboardWidgetEditorBody({
  editor,
  catalog,
  getWidgetTitle,
  maxColSpan = 3,
  extraTop,
}: {
  editor: DashboardWidgetEditor;
  catalog: EditorWidgetLibraryItem[];
  getWidgetTitle: (type: string, customTitle?: string) => string;
  /** Nomad só suporta 1|2 (sem largura total) — esconde o botão "3". */
  maxColSpan?: 1 | 2 | 3;
  /** Slot pro preview de banners, renderizado acima da grid (mesma posição em que aparecem no dashboard real). */
  extraTop?: React.ReactNode;
}) {
  const { draftWidgets, mode, draggedId, dragOverId, setDraggedId, setDragOverId } = editor;
  const availableWidgets = catalog.filter((lib) => !draftWidgets.some((dw) => dw.type === lib.id));
  const colSpanOptions = ([1, 2, 3] as const).filter((n) => n <= maxColSpan);
  const visibleCount = draftWidgets.filter((w) => w.visible).length;
  const hiddenCount = draftWidgets.length - visibleCount;
  // Item 12 — no mobile, drag-and-drop livre e resize por colSpan viram
  // controles simples (subir/descer, mostrar/ocultar, remover, adicionar).
  // Mesmo componente/estado em ambos os casos — só a interação muda.
  const isMobile = useTelaEstreita();

  // Remoção de widget: confirmação dupla (ver ConfirmationDialog). O clique
  // no ícone de lixeira só tirava o widget de `draftWidgets` na hora, sem
  // confirmação nenhuma — e o aviso do modo "remover" prometia algo que não
  // era verdade ("remover permanentemente"): esta remoção é só do rascunho
  // (draftWidgets); nada é salvo até o clique em "Salvar", e "Cancelar"
  // descarta a remoção junto com qualquer outra mudança da sessão de
  // edição. Nenhum dado do próprio widget é apagado — só a personalização
  // do painel.
  const [removingWidget, setRemovingWidget] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className={cn("flex flex-1 overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950/40 transition-all duration-300",
          mode === "adicionar" && !isMobile && "border-r border-border",
        )}
      >
        {isMobile && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <p className="text-[11px] font-medium text-muted-foreground">
              No celular, use as setas pra reordenar. Para arrastar/redimensionar livremente, use a versão desktop.
            </p>
          </div>
        )}
        {extraTop}
        {mode === "remover" && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
            <Trash2 className="h-3.5 w-3.5 shrink-0 text-red-500" />
            <p className="text-xs font-medium text-foreground">
              Modo remoção ativo — clique no ícone de lixeira de um widget para removê-lo desta personalização
            </p>
          </div>
        )}
        {mode === "adicionar" && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
            <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <p className="text-xs font-medium text-foreground">
              Clique em um widget disponível à direita para adicioná-lo
            </p>
          </div>
        )}

        {/* Item 4 — instrução de reordenar + contadores, juntos, no topo do corpo. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {isMobile ? "Use as setas para reordenar" : "Arraste para reordenar"}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            role="status"
            aria-label={`${visibleCount} widgets visíveis, ${hiddenCount} ocultos, ${draftWidgets.length} no total`}
          >
            <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">{visibleCount} visíveis</span>
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-muted-foreground">{hiddenCount} ocultos</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{draftWidgets.length} no total</span>
          </span>
        </div>

        <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {draftWidgets.map((widget, i) => {
            const libItem = catalog.find((l) => l.id === widget.type);
            const WIcon = libItem?.icon ?? LayoutGrid;
            const color = libItem?.color ?? "blue";
            const title = getWidgetTitle(widget.type, widget.customTitle);
            const isDraggingThis = draggedId === widget.id;
            const isDragOver = dragOverId === widget.id && draggedId !== widget.id;
            const gradient = EDITOR_GRADIENT_MAP[color] ?? EDITOR_GRADIENT_MAP.blue;
            const widgetColSpan = widget.colSpan ?? 1;
            const posNum = i + 1;

            return (
              <div
                key={widget.id}
                draggable={!isMobile && mode !== "remover"}
                onDragStart={() => setDraggedId(widget.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(widget.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={() => editor.dropOn(widget.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={cn(
                  "group relative rounded-xl border overflow-hidden select-none transition-all duration-150",
                  !isMobile && (widgetColSpan === 3 ? "col-span-3" : widgetColSpan === 2 ? "col-span-2" : "col-span-1"),
                  !isMobile && mode !== "remover" && "cursor-grab active:cursor-grabbing",
                  widget.visible
                    ? "border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                    : "border-dashed border-slate-200 dark:border-slate-700 opacity-50",
                  isDraggingThis && "opacity-30 scale-95",
                  isDragOver && "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]",
                )}
              >
                <div className={cn("h-10 w-full bg-gradient-to-r flex items-center gap-2.5 px-3", gradient)}>
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md text-[11px] font-extrabold text-slate-800 shrink-0 leading-none">
                    {posNum}
                  </div>
                  <span className="flex-1 min-w-0 text-white text-[11px] font-semibold leading-tight truncate">{title}</span>
                  {isMobile ? (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => editor.moveBy(widget.id, -1)}
                        className="flex items-center justify-center h-5 w-5 rounded text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        aria-label={`Mover ${title} para cima`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={i === draftWidgets.length - 1}
                        onClick={() => editor.moveBy(widget.id, 1)}
                        className="flex items-center justify-center h-5 w-5 rounded text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        aria-label={`Mover ${title} para baixo`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    mode !== "remover" && <GripVertical className="h-4 w-4 text-white/50 group-hover:text-white/90 transition-colors shrink-0" />
                  )}
                </div>

                <div className="px-3 py-2.5 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("shrink-0 rounded-md p-1.5 bg-gradient-to-br text-white shadow-sm", gradient)}>
                      <WIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium leading-snug">
                      {widgetColSpan === 1
                        ? "Ocupa 1 de 3 colunas"
                        : widgetColSpan === 2
                          ? "Ocupa 2 de 3 colunas"
                          : "Ocupa a linha inteira"}
                    </p>
                  </div>

                  {!isMobile && colSpanOptions.length > 1 && (
                    <div className="mb-2">
                      <span className="mb-1 block text-[10px] font-medium text-muted-foreground">Largura do widget</span>
                      <div className="flex items-center gap-1" role="group" aria-label="Largura do widget">
                        {colSpanOptions.map((n) => {
                          const label = n === 1 ? "1/3" : n === 2 ? "2/3" : "Total";
                          const desc = n === 1 ? "um terço da linha" : n === 2 ? "dois terços da linha" : "a linha inteira";
                          const selected = widgetColSpan === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              aria-pressed={selected}
                              aria-label={`Largura: ${desc}`}
                              title={`Largura: ${desc}`}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                editor.setColSpan(widget.id, n);
                              }}
                              className={cn(
                                "flex-1 h-6 px-1 text-[10px] font-bold rounded border transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                selected
                                  ? "bg-primary text-primary-foreground border-primary ring-1 ring-primary"
                                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleVisible(widget.id);
                      }}
                      aria-pressed={widget.visible}
                      aria-label={widget.visible ? `Ocultar widget ${title}` : `Exibir widget ${title}`}
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors",
                        widget.visible
                          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-muted-foreground bg-muted/60 hover:bg-muted",
                      )}
                    >
                      {widget.visible ? <Activity className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {widget.visible ? "Visível" : "Oculto"}
                    </button>

                    {(mode === "remover" || isMobile) && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemovingWidget({ id: widget.id, title });
                        }}
                        aria-label={`Remover widget ${title}`}
                        className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-md px-2 py-1 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mode === "adicionar" && (
        <div className={cn("shrink-0 overflow-y-auto bg-muted/30 flex flex-col", isMobile ? "w-full border-t border-border max-h-[50vh]" : "w-80 border-l border-border")}>
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Widgets disponíveis</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {availableWidgets.length === 0 ? "Todos os widgets já estão no dashboard" : `${availableWidgets.length} widget${availableWidgets.length !== 1 ? "s" : ""} para adicionar`}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-2.5">
            {availableWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="bg-emerald-100 dark:bg-emerald-950/40 rounded-full p-3.5 mb-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">Tudo adicionado!</p>
                <p className="text-xs text-muted-foreground mt-1">Todos os widgets já estão no dashboard</p>
              </div>
            ) : (
              availableWidgets.map((lib) => {
                const WIcon = lib.icon;
                const gradient = EDITOR_GRADIENT_MAP[lib.color ?? "blue"] ?? EDITOR_GRADIENT_MAP.blue;
                return (
                  <button
                    type="button"
                    key={lib.id}
                    onClick={() => editor.addWidget(lib.id)}
                    className="w-full text-left group flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:shadow-sm active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    <div className={cn("shrink-0 rounded-lg p-2 bg-gradient-to-br text-white shadow-sm", gradient)}>
                      <WIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug">{lib.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{lib.description}</p>
                    </div>
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-emerald-500 rounded-full p-0.5">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={removingWidget !== null}
        onClose={() => setRemovingWidget(null)}
        onConfirm={() => {
          if (removingWidget) editor.removeWidget(removingWidget.id);
        }}
        title="Remover widget"
        message="Isso remove o widget desta personalização de painel — nenhum dado apresentado por ele é apagado."
        twoStep
        attention
        targetName={removingWidget?.title}
        targetDetail="Personalização deste painel"
        consequences={[
          "A mudança só é salva de verdade quando você clicar em \"Salvar\".",
          "Antes de salvar, dá pra desfazer clicando em \"Cancelar\" (descarta tudo desta sessão) ou adicionando o mesmo widget de novo pelo modo \"Adicionar\".",
        ]}
        finalConfirmText="Remover widget do painel"
      />
    </div>
  );
}
