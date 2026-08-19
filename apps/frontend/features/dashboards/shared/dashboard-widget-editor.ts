// Núcleo compartilhado do editor de widgets — extraído do painel "Editar
// Dashboard" (Sheet full-canvas com draftWidgets/editModalMode) que já era
// o editor REAL usado pelas 5 telas de shape genérico (agency/company/
// leader/partner/admin). Esse era o único editor de fato alcançável — o
// mecanismo `isCustomizeMode`/drag inline nos widgets ao vivo nunca chegou
// a ser conectado a um botão (dead code), então NÃO é ele que este hook
// substitui; é o painel de rascunho (`draftWidgets`) que já funcionava.
//
// Usado tanto pelas 6 telas de dashboard (modo "user" — editar a própria
// visão) quanto pelo editor de template em /admin/dashboard-templates
// (modo "template" — editar o DashboardTemplate global). A UI, o drag,
// o resize e o catálogo são os MESMOS componentes; só a origem dos dados
// iniciais e o destino do save mudam (cada chamador decide isso fora
// daqui, no onSave que passa pro <DashboardWidgetEditorFooter>).
import { useCallback, useState } from "react";
import type { WidgetState } from "./dashboard-common";

export interface EditorWidgetLibraryItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color?: string;
}

export const EDITOR_GRADIENT_MAP: Record<string, string> = {
  blue: "from-blue-500 to-blue-700",
  green: "from-green-500 to-green-700",
  purple: "from-purple-500 to-purple-700",
  indigo: "from-indigo-500 to-indigo-700",
  orange: "from-orange-500 to-rose-600",
  emerald: "from-emerald-500 to-teal-600",
  teal: "from-teal-500 to-teal-700",
  amber: "from-amber-500 to-orange-600",
  yellow: "from-yellow-400 to-amber-600",
  sky: "from-sky-500 to-blue-600",
  red: "from-red-500 to-rose-700",
  cyan: "from-cyan-500 to-sky-600",
  slate: "from-slate-500 to-slate-700",
};

export type EditorMode = "none" | "adicionar" | "remover";

export function useDashboardWidgetEditor(initial: WidgetState[]) {
  const [draftWidgets, setDraftWidgets] = useState<WidgetState[]>(initial);
  const [mode, setMode] = useState<EditorMode>("none");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reset = useCallback((widgets: WidgetState[]) => {
    setDraftWidgets(widgets);
    setMode("none");
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const addWidget = useCallback((type: string) => {
    setDraftWidgets((prev) => {
      const maxOrder = Math.max(...prev.map((w) => w.order), -1);
      return [
        ...prev,
        { id: `${type}-${Date.now()}`, type: type as WidgetState["type"], visible: true, order: maxOrder + 1, colSpan: 1 },
      ];
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setDraftWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const toggleVisible = useCallback((id: string) => {
    setDraftWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }, []);

  const setColSpan = useCallback((id: string, colSpan: 1 | 2 | 3) => {
    setDraftWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, colSpan } : w)));
  }, []);

  // Mesma lógica splice-and-reindex do editor original — chamada no onDrop
  // do card alvo, usando o `draggedId` marcado no onDragStart do card de origem.
  const dropOn = useCallback(
    (targetId: string) => {
      setDraftWidgets((prev) => {
        if (!draggedId || draggedId === targetId) return prev;
        const from = prev.findIndex((w) => w.id === draggedId);
        const to = prev.findIndex((w) => w.id === targetId);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        next.forEach((w, i) => {
          w.order = i;
        });
        return next;
      });
      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId],
  );

  // Reordenação simples (item 12 — mobile): sobe/desce 1 posição, sem
  // drag. Mesma reindexação de `dropOn`, só que por direção em vez de
  // soltar sobre um alvo.
  const moveBy = useCallback((id: string, direction: -1 | 1) => {
    setDraftWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      next.forEach((w, i) => {
        w.order = i;
      });
      return next;
    });
  }, []);

  const finalize = useCallback(() => {
    return draftWidgets.map((w, i) => ({ ...w, order: i }));
  }, [draftWidgets]);

  return {
    draftWidgets,
    mode,
    setMode,
    draggedId,
    dragOverId,
    setDraggedId,
    setDragOverId,
    addWidget,
    removeWidget,
    toggleVisible,
    setColSpan,
    dropOn,
    moveBy,
    reset,
    finalize,
  };
}

export type DashboardWidgetEditor = ReturnType<typeof useDashboardWidgetEditor>;
