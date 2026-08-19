// Peças visuais compartilhadas do editor de widgets (ver
// use-dashboard-widget-editor.ts pro estado). Markup idêntico ao painel
// "Editar Dashboard" que já existia em cada uma das 5 telas de dashboard
// (agency/company/leader/partner/admin) — extraído pra ser literalmente o
// mesmo componente usado ali E no editor de template
// (/admin/dashboard-templates), em vez de um look-alike reconstruído.
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTelaEstreita } from "@/hooks/useTelaEstreita";
import type { WidgetState } from "./dashboard-common";
import { EDITOR_GRADIENT_MAP, type DashboardWidgetEditor, type EditorWidgetLibraryItem } from "./dashboard-widget-editor";

export function DashboardWidgetEditorModeToggle({
  editor,
  variant = "dark",
}: {
  editor: DashboardWidgetEditor;
  /** "dark": header com fundo gradiente colorido (agency/company/leader/partner). "light": header claro (admin, EmbeddedSlideScreen). */
  variant?: "dark" | "light";
}) {
  const inactiveClass = variant === "dark" ? "bg-white/15 hover:bg-white/25 text-white/90" : "bg-muted hover:bg-muted/70 text-foreground";
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => editor.setMode((m) => (m === "remover" ? "none" : "remover"))}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          editor.mode === "remover" ? "bg-red-500 text-white shadow-md" : inactiveClass,
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remover
      </button>
      <button
        onClick={() => editor.setMode((m) => (m === "adicionar" ? "none" : "adicionar"))}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          editor.mode === "adicionar" ? "bg-emerald-500 text-white shadow-md" : inactiveClass,
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </button>
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
  // Item 12 — no mobile, drag-and-drop livre e resize por colSpan viram
  // controles simples (subir/descer, mostrar/ocultar, remover, adicionar).
  // Mesmo componente/estado em ambos os casos — só a interação muda.
  const isMobile = useTelaEstreita();

  return (
    <div className={cn("flex flex-1 overflow-hidden", isMobile ? "flex-col" : "flex-row")}>
      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950/40 transition-all duration-300",
          mode === "adicionar" && !isMobile && "border-r border-border",
        )}
      >
        {isMobile && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <ChevronUp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              No celular, use as setas pra reordenar. Para arrastar/redimensionar livremente, use a versão desktop.
            </p>
          </div>
        )}
        {extraTop}
        {mode === "remover" && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
            <Trash2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              Modo remoção ativo — clique no ícone de lixeira pra remover um widget permanentemente
            </p>
          </div>
        )}
        {mode === "adicionar" && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              Clique em um widget disponível à direita para adicioná-lo
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Widgets</p>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
            {draftWidgets.length}
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
                        disabled={i === 0}
                        onClick={() => editor.moveBy(widget.id, -1)}
                        className="flex items-center justify-center h-5 w-5 rounded text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Mover para cima"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={i === draftWidgets.length - 1}
                        onClick={() => editor.moveBy(widget.id, 1)}
                        className="flex items-center justify-center h-5 w-5 rounded text-white/80 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    mode !== "remover" && <GripVertical className="h-4 w-4 text-white/50 group-hover:text-white/90 transition-colors shrink-0" />
                  )}
                </div>

                <div className="px-3 py-2.5 bg-card">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={cn("shrink-0 rounded-md p-1.5 bg-gradient-to-br text-white shadow-sm", gradient)}>
                      <WIcon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium leading-snug">
                      {widgetColSpan === 1 ? "1/3 da largura" : widgetColSpan === 2 ? "2/3 da largura" : "Largura total"}
                    </p>
                  </div>

                  {!isMobile && colSpanOptions.length > 1 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">Largura:</span>
                      {colSpanOptions.map((n) => (
                        <button
                          key={n}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            editor.setColSpan(widget.id, n);
                          }}
                          title={n === 1 ? "1 coluna" : n === 2 ? "2 colunas" : "Largura total"}
                          className={cn(
                            "flex-1 h-5 text-[10px] font-bold rounded transition-colors border",
                            widgetColSpan === n ? "bg-blue-600 text-white border-blue-600" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleVisible(widget.id);
                      }}
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors",
                        widget.visible
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                          : "text-muted-foreground bg-muted/60 hover:bg-muted",
                      )}
                    >
                      {widget.visible ? <Activity className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {widget.visible ? "Visível" : "Oculto"}
                    </button>

                    {(mode === "remover" || isMobile) && (
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          editor.removeWidget(widget.id);
                        }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-md px-2 py-1 transition-colors"
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
                    key={lib.id}
                    onClick={() => editor.addWidget(lib.id)}
                    className="w-full text-left group flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:shadow-sm active:scale-[0.98] transition-all duration-150"
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
    </div>
  );
}

export function DashboardWidgetEditorFooter({
  editor,
  onCancel,
  onSave,
  saveLabel = "Salvar",
  saving = false,
}: {
  editor: DashboardWidgetEditor;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
}) {
  return (
    <div className="flex-shrink-0 border-t bg-muted/20 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="h-8 px-4 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" className="h-8 px-5 text-sm btn-brand shadow-sm gap-1.5" onClick={onSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saveLabel}
        </Button>
      </div>
      {/* Contagem: some no mobile pra não disputar espaço com Cancelar/Salvar (item 17 — sempre acessíveis). */}
      <div className="hidden sm:flex items-center gap-4">
        <div className="w-px h-5 bg-border" />
        <span className="text-xs text-muted-foreground">
          {editor.draftWidgets.filter((w) => w.visible).length} visíveis · {editor.draftWidgets.filter((w) => !w.visible).length} ocultos · {editor.draftWidgets.length} total
        </span>
      </div>
    </div>
  );
}
