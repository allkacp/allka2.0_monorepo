// Componente do Planejador — extraído de admin/projetos/page.tsx (lote 6,
// ata 2026-08-24) pra ficar testável isoladamente: a página inteira
// (admin/projetos/page.tsx, ~6000 linhas) não monta em jsdom por um loop
// pré-existente do @radix-ui/react-compose-refs, então testar o Planejador
// exige extraí-lo pra um componente próprio, controlado pelo hook
// usePlannerBoard (./use-planner-board.ts) — a página só fornece o
// contexto que falta (a lista de projetos reais, já carregada por ela).
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, X, Calendar, LayoutDashboard, AlertCircle, RefreshCw } from "lucide-react";
import { usePlannerBoard, type PlannerPriority } from "./use-planner-board";
import type { PlannerCard as PlannerCardData, PlannerColumn as PlannerColumnData } from "@/lib/api-client";
import type { FrontendProject } from "@/lib/project-adapter";

const PRIORITY_CFG: Record<PlannerPriority, { label: string; pill: string; border: string }> = {
  low: { label: "Baixa", pill: "bg-slate-100 text-slate-600", border: "#94a3b8" },
  medium: { label: "Média", pill: "bg-blue-100 text-blue-700", border: "#3b82f6" },
  high: { label: "Alta", pill: "bg-amber-100 text-amber-700", border: "#f59e0b" },
  urgent: { label: "Urgente", pill: "bg-red-100 text-red-700", border: "#ef4444" },
};

const AVAILABLE_COLORS = [
  { label: "Cinza", value: "bg-gray-800" },
  { label: "Vermelho", value: "bg-red-500" },
  { label: "Laranja", value: "bg-orange-500" },
  { label: "Amarelo", value: "bg-yellow-500" },
  { label: "Verde", value: "bg-green-500" },
  { label: "Azul", value: "bg-blue-500" },
  { label: "Roxo", value: "bg-purple-500" },
  { label: "Rosa", value: "bg-pink-500" },
  { label: "Indigo", value: "bg-indigo-500" },
  { label: "Teal", value: "bg-teal-500" },
];

interface CardFormState {
  columnId: string;
  title: string;
  description: string;
  priority: PlannerPriority;
  dueDate: string;
  projectId: string;
}

const EMPTY_CARD_FORM: CardFormState = {
  columnId: "",
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  projectId: "",
};

export function PlannerBoard({ projects }: { projects: FrontendProject[] }) {
  const board = usePlannerBoard();
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"column" | "card" | null>(null);

  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<PlannerColumnData | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnColor, setColumnColor] = useState("bg-blue-500");

  const [showCardDialog, setShowCardDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<PlannerCardData | null>(null);
  const [cardForm, setCardForm] = useState<CardFormState>(EMPTY_CARD_FORM);
  const [isSavingCard, setIsSavingCard] = useState(false);

  const [removingCard, setRemovingCard] = useState<PlannerCardData | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveType(board.columns.find((c) => c.id === active.id) ? "column" : "card");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    if (!over) return;

    if (activeType === "column") {
      if (active.id === over.id) return;
      const oi = board.columns.findIndex((c) => c.id === active.id);
      const ni = board.columns.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(board.columns, oi, ni).map((c) => c.id);
      const result = await board.reorderColumns(reordered);
      if (!result.ok) toast({ title: "Não foi possível reordenar as colunas", description: result.error, variant: "destructive" });
      return;
    }

    const targetColumn = board.columns.find((c) => c.id === over.id);
    const activeCard = board.cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    if (targetColumn) {
      // Solto direto na coluna (não em cima de outro card): vai pro fim.
      const destCount = board.cards.filter((c) => c.columnId === targetColumn.id && c.id !== activeCard.id).length;
      const result = await board.moveCard(activeCard.id, targetColumn.id, destCount);
      if (!result.ok) toast({ title: "Não foi possível mover o card", description: result.error, variant: "destructive" });
      return;
    }

    const overCard = board.cards.find((c) => c.id === over.id);
    if (overCard) {
      const destCards = board.cards
        .filter((c) => c.columnId === overCard.columnId && c.id !== activeCard.id)
        .sort((a, b) => a.position - b.position);
      const targetIndex = destCards.findIndex((c) => c.id === overCard.id);
      const result = await board.moveCard(activeCard.id, overCard.columnId, targetIndex);
      if (!result.ok) toast({ title: "Não foi possível mover o card", description: result.error, variant: "destructive" });
    }
  };

  const openNewColumnDialog = () => {
    setEditingColumn(null);
    setColumnName("");
    setColumnColor("bg-blue-500");
    setShowColumnDialog(true);
  };
  const openEditColumnDialog = (column: PlannerColumnData) => {
    setEditingColumn(column);
    setColumnName(column.label);
    setColumnColor(column.color);
    setShowColumnDialog(true);
  };
  const saveColumn = async () => {
    if (!columnName.trim()) return;
    try {
      if (editingColumn) {
        await board.updateColumn(editingColumn.id, { label: columnName, color: columnColor });
      } else {
        await board.createColumn({ label: columnName, color: columnColor });
      }
      setShowColumnDialog(false);
    } catch (err) {
      toast({
        title: "Não foi possível salvar a coluna",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };
  const deleteColumn = async (columnId: string) => {
    if (!confirm("Excluir esta coluna?")) return;
    const result = await board.deleteColumn(columnId);
    if (!result.ok) {
      toast({ title: "Não foi possível excluir a coluna", description: result.error, variant: "destructive" });
    }
  };

  const openNewCardDialog = (columnId: string) => {
    setEditingCard(null);
    setCardForm({ ...EMPTY_CARD_FORM, columnId });
    setShowCardDialog(true);
  };
  const openEditCardDialog = (card: PlannerCardData) => {
    setEditingCard(card);
    setCardForm({
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? "",
      priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.slice(0, 10) : "",
      projectId: card.projectId ?? "",
    });
    setShowCardDialog(true);
  };
  const saveCard = async () => {
    if (!cardForm.title.trim() || isSavingCard) return;
    setIsSavingCard(true);
    try {
      const dueDateIso = cardForm.dueDate ? new Date(`${cardForm.dueDate}T00:00:00.000Z`).toISOString() : null;
      if (editingCard) {
        const result = await board.updateCard(editingCard.id, {
          title: cardForm.title,
          description: cardForm.description || null,
          priority: cardForm.priority,
          dueDate: dueDateIso,
          projectId: cardForm.projectId || null,
        });
        if (!result.ok) {
          toast({
            title: result.conflict ? "Este card foi alterado por outra sessão" : "Não foi possível salvar",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        if (cardForm.columnId !== editingCard.columnId) {
          const destCount = board.cards.filter((c) => c.columnId === cardForm.columnId).length;
          await board.moveCard(editingCard.id, cardForm.columnId, destCount);
        }
      } else {
        const created = await board.createCard({
          columnId: cardForm.columnId,
          title: cardForm.title,
          description: cardForm.description || undefined,
          priority: cardForm.priority,
          dueDate: dueDateIso,
          projectId: cardForm.projectId || null,
        });
        if (!created) return; // clique duplo ignorado — já havia uma criação em andamento
      }
      setShowCardDialog(false);
      setEditingCard(null);
    } catch (err) {
      toast({
        title: "Não foi possível salvar o card",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSavingCard(false);
    }
  };

  const requestDeleteCard = (cardId: string) => {
    const card = board.cards.find((c) => c.id === cardId) ?? null;
    setRemovingCard(card);
  };
  const confirmDeleteCard = async () => {
    if (!removingCard) return;
    const result = await board.removeCard(removingCard.id);
    if (!result.ok) throw new Error(result.error);
  };

  // ── Estados de carregamento/erro/vazio ──────────────────────────────────
  if (board.status === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        Carregando planejador…
      </div>
    );
  }

  if (board.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-slate-500">{board.error ?? "Não foi possível carregar o Planejador."}</p>
        <Button size="sm" variant="outline" onClick={() => board.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const isEmpty = board.cards.length === 0;

  return (
    <div className="py-2 pb-0" data-testid="planner-board">
      <div className="flex items-center justify-end mb-2">
        <Button
          onClick={openNewColumnDialog}
          size="sm"
          className="h-7 text-xs px-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
        >
          <Plus className="h-3 w-3 mr-1" />
          Nova Coluna
        </Button>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 mb-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <LayoutDashboard className="h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum card ainda.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openNewCardDialog(board.columns[0]?.id ?? "")}
            disabled={!board.columns[0]}
          >
            <Plus className="h-3 w-3 mr-1" />
            Criar primeiro card
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 overflow-x-auto">
          <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {board.columns.map((col) => (
              <PlannerColumnView
                key={col.id}
                column={col}
                cards={board.cards.filter((c) => c.columnId === col.id).sort((a, b) => a.position - b.position)}
                projects={projects}
                onEdit={() => openEditColumnDialog(col)}
                onDelete={() => deleteColumn(col.id)}
                onAddCard={() => openNewCardDialog(col.id)}
                onEditCard={openEditCardDialog}
                onDeleteCard={requestDeleteCard}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeId && activeType === "column" && (
            <div className="w-56 opacity-80">
              {board.columns.find((c) => c.id === activeId) && (
                <div className={`${board.columns.find((c) => c.id === activeId)?.color} text-white rounded-t-lg px-3 py-2`}>
                  <h3 className="font-bold text-xs">{board.columns.find((c) => c.id === activeId)?.label}</h3>
                </div>
              )}
            </div>
          )}
          {activeId && activeType === "card" && (
            <div className="w-56 opacity-80">
              <Card className="p-2 bg-white border-2 border-violet-500">
                <div className="text-xs font-semibold">{board.cards.find((c) => c.id === activeId)?.title}</div>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Coluna — criar/editar */}
      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Coluna</Label>
              <Input value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Ex: Em Aprovação" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColumnColor(c.value)}
                    className={`h-10 rounded-md ${c.value} ${columnColor === c.value ? "ring-2 ring-offset-2 ring-black" : ""}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card — criar/editar */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={cardForm.title}
                onChange={(e) => setCardForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="O que precisa ser feito?"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                value={cardForm.description}
                onChange={(e) => setCardForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes adicionais..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(PRIORITY_CFG) as PlannerPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCardForm((f) => ({ ...f, priority: p }))}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        cardForm.priority === p
                          ? "bg-slate-800 text-white border-slate-800"
                          : `${PRIORITY_CFG[p].pill} border-transparent`
                      }`}
                    >
                      {PRIORITY_CFG[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Limite</Label>
                <Input
                  type="date"
                  value={cardForm.dueDate}
                  onChange={(e) => setCardForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Coluna</Label>
              <select
                value={cardForm.columnId}
                onChange={(e) => setCardForm((f) => ({ ...f, columnId: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
              >
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>
                Vincular a Projeto <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <select
                value={cardForm.projectId}
                onChange={(e) => setCardForm((f) => ({ ...f, projectId: e.target.value }))}
                className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
              >
                <option value="">Nenhum</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            {editingCard && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  setShowCardDialog(false);
                  requestDeleteCard(editingCard.id);
                }}
              >
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowCardDialog(false)} disabled={isSavingCard}>
              Cancelar
            </Button>
            <Button onClick={saveCard} disabled={isSavingCard}>
              {isSavingCard ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={removingCard !== null}
        onClose={() => setRemovingCard(null)}
        onConfirm={confirmDeleteCard}
        title="Remover card"
        message="O card sai do quadro. Dá pra recuperar depois, se precisar."
        twoStep
        attention
        targetName={removingCard?.title}
        targetDetail={board.columns.find((c) => c.id === removingCard?.columnId)?.label}
        consequences={["O card é arquivado, não apagado — nenhum outro card é afetado."]}
        finalConfirmText="Remover este card"
      />
    </div>
  );
}

// ─── Sub-componentes de apresentação (coluna e card, com dnd-kit) ─────────

function PlannerColumnView({
  column,
  cards,
  projects,
  onEdit,
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: {
  column: PlannerColumnData;
  cards: PlannerCardData[];
  projects: FrontendProject[];
  onEdit: () => void;
  onDelete: () => void;
  onAddCard: () => void;
  onEditCard: (card: PlannerCardData) => void;
  onDeleteCard: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: column.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-56 flex-shrink-0">
      <div
        className={`${column.color} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-1.5 cursor-move min-w-0">
          <h3 className="font-bold text-xs uppercase tracking-wide truncate">{column.label}</h3>
          <span className="text-[10px] opacity-80 flex-shrink-0">({cards.length})</span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div
        ref={setDropRef}
        className="bg-slate-50 rounded-b-lg p-2 min-h-[300px] max-h-[calc(100vh-430px)] overflow-y-auto space-y-1.5"
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-6">Arraste cartões aqui</div>
          ) : (
            cards.map((card) => (
              <PlannerCardView
                key={card.id}
                card={card}
                projects={projects}
                onEdit={() => onEditCard(card)}
                onDelete={() => onDeleteCard(card.id)}
              />
            ))
          )}
        </SortableContext>

        <button
          onClick={onAddCard}
          className="w-full mt-1 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors"
        >
          <Plus className="h-3 w-3" /> Adicionar cartão
        </button>
      </div>
    </div>
  );
}

function PlannerCardView({
  card,
  projects,
  onEdit,
  onDelete,
}: {
  card: PlannerCardData;
  projects: FrontendProject[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const cfg = PRIORITY_CFG[card.priority] ?? PRIORITY_CFG.medium;
  const linkedProject = card.projectId ? projects.find((p) => String(p.id) === card.projectId) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = card.dueDate ? new Date(card.dueDate) : null;
  const isOverdue = due ? due < today : false;

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: cfg.border,
  };

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      className="p-2 bg-white hover:shadow-md transition-all cursor-move border-l-[3px] group"
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.pill}`}>{cfg.label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Remover card"
          className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      <h4
        className="text-[11px] font-semibold text-slate-800 leading-tight mb-1.5 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {card.title}
      </h4>

      {card.description && <p className="text-[10px] text-slate-400 mb-1.5 line-clamp-1">{card.description}</p>}

      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
        {due ? (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-slate-500"}`}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        ) : (
          <span />
        )}
        {linkedProject && (
          <span
            className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-[90px]"
            title={linkedProject.name}
          >
            {linkedProject.name}
          </span>
        )}
      </div>
    </Card>
  );
}
