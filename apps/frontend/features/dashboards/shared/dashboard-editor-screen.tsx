// Tela completa de edição de dashboard — extraída do painel "Editar
// Dashboard"/"Novo Dashboard" que já existia (só) em admin-dashboard-page.tsx
// (EmbeddedSlideScreen + header renomeável + toggle Remover/Adicionar +
// corpo de widgets + rodapé Cancelar/Salvar). Usado tanto pelo dashboard
// normal (mode="user" — salva na visão pessoal) quanto pelo editor de
// template (mode="template" — salva no DashboardTemplate) — MESMO
// componente, mesma UI, só muda o que os callbacks fazem com o resultado.
import { useState, type ReactNode } from "react";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { Button } from "@/components/ui/button";
import { Save, Check, X, Pencil } from "lucide-react";
import type { PinnedEntry } from "@/contexts/open-screens-context";
import { DashboardWidgetEditorModeToggle, DashboardWidgetEditorBody } from "./dashboard-widget-editor-panel";
import type { DashboardWidgetEditor, EditorWidgetLibraryItem } from "./dashboard-widget-editor";

export interface DashboardEditorScreenProps {
  open: boolean;
  isNew: boolean;
  name: string;
  onNameChange: (v: string) => void;
  /** Chamado ao confirmar o campo de nome (Enter/✓) — cada modo decide se persiste na hora (dashboard pessoal) ou só guarda em memória até o Salvar (template). Opcional. */
  onCommitName?: () => void;
  defaultDisplayName?: string;
  editor: DashboardWidgetEditor;
  catalog: EditorWidgetLibraryItem[];
  getWidgetTitle: (type: string, customTitle?: string) => string;
  maxColSpan?: 1 | 2 | 3;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
  titleNew?: string;
  titleEdit?: string;
  pin?: PinnedEntry;
  /** Preview de banners/conteúdo (modo template) renderizado acima da grid. */
  extraTop?: ReactNode;
  /** Ação extra no rodapé — ex.: "Definir como padrão" (só existe no modo template). */
  footerExtra?: ReactNode;
}

export function DashboardEditorScreen({
  open,
  isNew,
  name,
  onNameChange,
  onCommitName,
  defaultDisplayName = "Dashboard Padrão",
  editor,
  catalog,
  getWidgetTitle,
  maxColSpan = 3,
  onSave,
  onCancel,
  saving = false,
  saveLabel,
  titleNew = "Novo Dashboard",
  titleEdit = "Editar dashboard",
  pin,
  extraTop,
  footerExtra,
}: DashboardEditorScreenProps) {
  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <EmbeddedSlideScreen
      open={open}
      onClose={onCancel}
      title={isNew ? titleNew : titleEdit}
      subtitle={
        isNew
          ? "Adicione widgets e dê um nome ao seu novo dashboard."
          : "Atualize as configurações principais deste painel."
      }
      pin={pin}
      footer={
        <div className="flex items-center gap-3 sm:gap-4 w-full flex-wrap">
          <div className="flex items-center gap-2 order-1 shrink-0">
            <Button variant="outline" size="sm" className="h-8 px-4 text-sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="sm" className="h-8 px-5 text-sm btn-brand shadow-sm gap-1.5" onClick={onSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saveLabel ?? (isNew ? "Criar" : "Salvar")}
            </Button>
          </div>
          {/* Contagem: some no mobile pra não disputar espaço com Cancelar/Salvar, que precisam ficar sempre acessíveis (item 17). */}
          <div className="hidden sm:flex items-center gap-4 order-2">
            <div className="w-px h-5 bg-border" />
            <span className="text-xs text-muted-foreground">
              {editor.draftWidgets.filter((w) => w.visible).length} visíveis ·{" "}
              {editor.draftWidgets.filter((w) => !w.visible).length} ocultos ·{" "}
              {editor.draftWidgets.length} total
            </span>
          </div>
          {footerExtra && <div className="order-3 sm:ml-auto shrink-0 w-full sm:w-auto flex justify-end">{footerExtra}</div>}
        </div>
      }
    >
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        {/* Toolbar: nome (renomeável) + modo remover/adicionar */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-wrap">
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onCommitName?.();
                      setIsEditingName(false);
                    }
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  placeholder={isNew ? "Nome do dashboard..." : ""}
                  className="text-sm font-bold leading-tight rounded-md px-2.5 py-1 border border-input bg-background focus:outline-none focus:border-ring w-48"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onCommitName?.();
                    setIsEditingName(false);
                  }}
                  className="flex items-center gap-1 btn-brand rounded-md px-2.5 py-1 text-xs font-semibold transition-all"
                >
                  <Check className="h-3 w-3" />
                  Salvar
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsEditingName(false)}
                  className="bg-muted hover:bg-muted/70 rounded-md p-1 transition-colors"
                  title="Cancelar edição"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold leading-tight text-foreground">
                  {name || (isNew ? titleNew : defaultDisplayName)}
                </h3>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-0.5 transition-colors"
                  title="Renomear"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {isNew
                ? "Adicione widgets à direita e dê um nome ao dashboard"
                : `Arraste para reordenar · ${editor.draftWidgets.filter((w) => w.visible).length} widgets ativos`}
            </p>
          </div>
          <DashboardWidgetEditorModeToggle editor={editor} variant="light" />
        </div>

        <DashboardWidgetEditorBody
          editor={editor}
          catalog={catalog}
          getWidgetTitle={getWidgetTitle}
          maxColSpan={maxColSpan}
          extraTop={extraTop}
        />
      </div>
    </EmbeddedSlideScreen>
  );
}
