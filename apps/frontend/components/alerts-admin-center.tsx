/**
 * Central de Alertas (ata 2026-08) — área "Gerenciar", só pra Admin Master.
 * Cria/edita/reclassifica/arquiva SystemAlert reais (category="alerta")
 * pela interface, sem depender de alteração de código. Nenhuma tabela nova,
 * nenhum motor de regras — os mesmos alertas que já existem.
 */
import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import {
  criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor,
  type Criticality,
} from "@/components/alerts-header-icon";
import { AlertAdminFormModal, type AlertAdminDraft } from "@/components/modals/alert-admin-form-modal";
import { cn } from "@/lib/utils";

interface AdminAlertItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  is_archived: boolean;
  created_at: string;
  user_id: string | null;
  destinatario: { id: string; name: string; email: string } | null;
}

const SEVERITY_BY_CRITICALITY: Record<Criticality, "info" | "warning" | "error"> = {
  verde: "info",
  amarelo: "warning",
  vermelho: "error",
};

const CRITICALITY_FILTERS: { value: "all" | Criticality; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "verde", label: "Verde" },
  { value: "amarelo", label: "Amarelo" },
  { value: "vermelho", label: "Vermelho" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AlertsAdminCenter() {
  const [alerts, setAlerts] = useState<AdminAlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState<"all" | Criticality>("all");
  const [archivedFilter, setArchivedFilter] = useState<"false" | "true" | "all">("false");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<AlertAdminDraft | null>(null);
  const [archiving, setArchiving] = useState<AdminAlertItem | null>(null);
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getAdminSystemAlerts({
        search: search.trim() || undefined,
        severity: criticalityFilter === "all" ? undefined : SEVERITY_BY_CRITICALITY[criticalityFilter],
        is_archived: archivedFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setAlerts(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      setAlerts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, criticalityFilter, archivedFilter, page]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  // Busca/filtro mudou -> volta pra primeira página (nunca durante um
  // patch local de linha, que não passa por aqui).
  useEffect(() => {
    setPage(0);
  }, [search, criticalityFilter, archivedFilter]);

  function patchLocalAlert(updated: AdminAlertItem) {
    setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function removeLocalAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  async function handleCreate(draft: { title: string; message: string; severity: "info" | "warning" | "error"; user_id: string | null }) {
    const created = await apiClient.createAdminSystemAlert(draft);
    // Só insere na visão atual se ainda bate com os filtros (ex.: se o
    // filtro de arquivados está em "true", um alerta recém-criado — sempre
    // ativo — não pertence a essa lista agora).
    if (archivedFilter !== "true" && (criticalityFilter === "all" || SEVERITY_BY_CRITICALITY[criticalityFilter] === created.severity)) {
      setAlerts((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
    }
  }

  async function handleEdit(id: string, draft: { title: string; message: string }) {
    const updated = await apiClient.updateAdminSystemAlert(id, { title: draft.title, message: draft.message });
    patchLocalAlert(updated);
  }

  async function handleReclassify(alert: AdminAlertItem, criticality: Criticality) {
    const newSeverity = SEVERITY_BY_CRITICALITY[criticality];
    if (newSeverity === alert.severity || reclassifyingId) return;
    setReclassifyingId(alert.id);
    try {
      const updated = await apiClient.reclassifyAdminSystemAlert(alert.id, newSeverity);
      if (criticalityFilter !== "all" && SEVERITY_BY_CRITICALITY[criticalityFilter] !== newSeverity) {
        // Não bate mais com o filtro de criticidade ativo — sai da visão,
        // sem recarregar a lista inteira.
        removeLocalAlert(alert.id);
      } else {
        patchLocalAlert(updated);
      }
    } catch {
      // Erro mantém o estado anterior — não aplica nada localmente.
    } finally {
      setReclassifyingId(null);
    }
  }

  async function confirmArchive() {
    if (!archiving) return;
    const updated = archiving.is_archived
      ? await apiClient.unarchiveAdminSystemAlert(archiving.id)
      : await apiClient.archiveAdminSystemAlert(archiving.id);
    if (archivedFilter === "false" || archivedFilter === "true") {
      // A ação tirou o item da visão atual (Ativos <-> Arquivados são
      // mutuamente exclusivos aqui) — some da lista sem reload completo.
      removeLocalAlert(archiving.id);
    } else {
      patchLocalAlert(updated);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-5 pt-3 pb-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-40">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou mensagem"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5 btn-brand border-0" onClick={() => { setEditingDraft(null); setFormOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />
          Novo alerta
        </Button>
      </div>

      <div className="flex items-center gap-1.5 px-5 pb-2 flex-wrap shrink-0" role="group" aria-label="Filtrar por criticidade">
        {CRITICALITY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCriticalityFilter(value)}
            aria-pressed={criticalityFilter === value}
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
              criticalityFilter === value
                ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
            )}
          >
            {label}
          </button>
        ))}
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        <Button size="sm" variant={archivedFilter === "false" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5" onClick={() => setArchivedFilter("false")}>
          Ativos
        </Button>
        <Button size="sm" variant={archivedFilter === "true" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5 gap-1" onClick={() => setArchivedFilter("true")}>
          <Archive className="h-3 w-3" />
          Arquivados
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        {error && (
          <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar a central de alertas agora.</p>
        )}
        {!error && loading && alerts.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
        )}
        {!error && !loading && alerts.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">
            {archivedFilter === "true" ? "Nenhum alerta arquivado." : "Nenhum alerta encontrado."}
          </p>
        )}
        {!error && (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const criticality = criticalityFromSeverity[alert.severity];
              const CriticalityIcon = criticalityIcon[criticality];
              return (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{alert.title}</p>
                      <Badge className={cn("text-xs gap-1", criticalityBadgeColor[criticality])} aria-label={`Criticidade: ${criticalityLabel[criticality]}`}>
                        <CriticalityIcon className="h-3 w-3" aria-hidden="true" />
                        {criticalityLabel[criticality]}
                      </Badge>
                      {alert.is_archived && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Archive className="h-2.5 w-2.5" />
                          Arquivado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span>{alert.destinatario ? alert.destinatario.name : "Geral (todo Admin)"}</span>
                      <span>{formatDate(alert.created_at)}</span>
                    </div>

                    {/* Reclassificar — ação rápida, direto na linha */}
                    <div className="flex items-center gap-1 mt-2" role="group" aria-label={`Reclassificar criticidade de ${alert.title}`}>
                      {(["verde", "amarelo", "vermelho"] as Criticality[]).map((c) => {
                        const Icon = criticalityIcon[c];
                        const active = criticality === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            title={`Reclassificar para ${criticalityLabel[c]}`}
                            aria-pressed={active}
                            disabled={reclassifyingId === alert.id}
                            onClick={() => void handleReclassify(alert, c)}
                            className={cn(
                              "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50",
                              active
                                ? criticalityBadgeColor[c]
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
                            )}
                          >
                            <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                            {criticalityLabel[c]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Editar"
                      onClick={() => {
                        setEditingDraft({
                          id: alert.id,
                          title: alert.title,
                          message: alert.message,
                          severity: alert.severity,
                          user_id: alert.user_id,
                          destinatarioLabel: alert.destinatario?.name ?? null,
                        });
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title={alert.is_archived ? "Desarquivar" : "Arquivar"}
                      onClick={() => setArchiving(alert)}
                    >
                      {alert.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>Página {page + 1} de {totalPages} — {total} alertas</span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertAdminFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editingDraft}
        onSave={(draft) => (editingDraft?.id ? handleEdit(editingDraft.id, draft) : handleCreate(draft))}
      />

      <ConfirmationDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        onConfirm={() => void confirmArchive()}
        title={archiving?.is_archived ? "Desarquivar alerta" : "Arquivar alerta"}
        message={
          archiving?.is_archived
            ? `"${archiving?.title}" volta pra visão ativa da Central de Alertas.`
            : `"${archiving?.title}" sairá da visão ativa, mas continuará registrado — nada é excluído.`
        }
        confirmText={archiving?.is_archived ? "Desarquivar" : "Arquivar"}
        destructive={false}
      />
    </div>
  );
}
