import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X, Archive, Users, Search, RefreshCw, MessageSquare } from "lucide-react";
import { DashboardShellFrame } from "@/features/dashboards/shared/dashboard-shell-frame";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Central do Admin Master para os Grupos de Notificação (ata 2026-08, bloco
// 3/5). Aba própria, separada dos grupos de acesso a chamados. É a "tela
// real da solicitação" que o alerta amarelo abre em "Ver origem"
// (?review=<id>).

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  status: string;
  owner_user_id: string;
  requested_by_id: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejected_by_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  archived_at: string | null;
  conversation_id: string | null;
  member_count: number;
  created_at: string;
  members?: Array<{ id: string; name: string; email: string; account_type: string; is_active: boolean }>;
}

const TABS = [
  { key: "pending", label: "Pendentes de aprovação" },
  { key: "active", label: "Ativos" },
  { key: "rejected", label: "Rejeitados" },
  { key: "archived", label: "Arquivados" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AdminGruposNotificacaoPage() {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const tab = (params.get("tab") as (typeof TABS)[number]["key"]) || "pending";
  const reviewId = params.get("review");
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [role, setRole] = useState<"master" | "leader" | "other" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<GroupRow | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.getNotificationGroupsList({ status: tab, q: q.trim() || undefined });
      setGroups((res?.data ?? []) as GroupRow[]);
      setRole(res?.role ?? "other");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep-link ?review=<id> → carrega o detalhe do grupo.
  useEffect(() => {
    if (!reviewId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiClient
      .getNotificationGroup(reviewId)
      .then((g: any) => {
        if (!cancelled) setDetail(g as GroupRow);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reviewId, groups]);

  const openReview = (id: string) => {
    const p = new URLSearchParams(params);
    p.set("review", id);
    setParams(p);
  };
  const closeReview = () => {
    const p = new URLSearchParams(params);
    p.delete("review");
    setParams(p);
  };
  const setTab = (key: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", key);
    p.delete("review");
    setParams(p);
  };

  async function approve(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.approveNotificationGroup(id);
      toast({ title: "Grupo aprovado — sala de chat criada." });
      closeReview();
      await load();
    } catch (err) {
      toast({
        title: err instanceof ApiError ? err.message : "Não foi possível aprovar agora.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject() {
    if (!detail) return;
    await apiClient.rejectNotificationGroup(detail.id, rejectReason.trim());
    setRejectOpen(false);
    setRejectReason("");
    toast({ title: "Solicitação rejeitada." });
    closeReview();
    await load();
  }

  async function confirmArchive() {
    if (!detail) return;
    await apiClient.archiveNotificationGroup(detail.id);
    setArchiveOpen(false);
    toast({ title: "Grupo arquivado — a sala ficou somente leitura." });
    closeReview();
    await load();
  }

  const noPermission = role !== null && role !== "master";

  const list = useMemo(() => groups, [groups]);

  return (
    <DashboardShellFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5" /> Grupos de Notificação
            </h1>
            <p className="text-xs text-slate-500">
              Ciclo de aprovação de grupos solicitados por líderes. Não se confunde com grupos de acesso a chamados.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3" /> Atualizar
          </Button>
        </div>

        {noPermission ? (
          <p className="text-sm text-slate-500 px-1">Esta área é exclusiva do Admin Master.</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Situação dos grupos">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                    tab === t.key
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
                  )}
                >
                  {t.label}
                </button>
              ))}
              <div className="relative ml-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome..."
                  aria-label="Buscar grupos"
                  className="h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 w-48"
                />
              </div>
            </div>

            {loading && <p className="text-sm text-slate-400 py-8 text-center">Carregando...</p>}
            {error && (
              <div className="py-8 text-center">
                <p className="text-sm text-red-500">Não foi possível carregar os grupos.</p>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => void load()}>
                  Tentar novamente
                </Button>
              </div>
            )}
            {!loading && !error && list.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">Nenhum grupo nesta situação.</p>
            )}

            <div className="space-y-2">
              {list.map((g) => (
                <button
                  key={g.id}
                  onClick={() => openReview(g.id)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{g.name}</span>
                    <Badge className={cn("text-[10px]", STATUS_BADGE[g.status])}>{g.status}</Badge>
                    <span className="text-xs text-slate-400">{g.member_count} membro{g.member_count !== 1 ? "s" : ""}</span>
                  </div>
                  {g.purpose && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.purpose}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Criado {new Date(g.created_at).toLocaleDateString("pt-BR")}
                    {g.status === "rejected" && g.rejection_reason ? ` · Motivo: ${g.rejection_reason}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Painel de análise ─────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30" onClick={closeReview}>
          <div
            className="w-full max-w-md h-full bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{detail.name}</h2>
                <Badge className={cn("text-[10px] mt-1", STATUS_BADGE[detail.status])}>{detail.status}</Badge>
              </div>
              <button onClick={closeReview} aria-label="Fechar" className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detail.description && <p className="text-sm text-slate-600 dark:text-slate-300">{detail.description}</p>}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Finalidade</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{detail.purpose || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Solicitado por</p>
                <p className="text-slate-700 dark:text-slate-200">{detail.requested_by_id ? "Líder" : "Admin Master (direto)"}</p>
              </div>
              <div>
                <p className="text-slate-400">Criado em</p>
                <p className="text-slate-700 dark:text-slate-200">{new Date(detail.created_at).toLocaleString("pt-BR")}</p>
              </div>
              {detail.approved_at && (
                <div>
                  <p className="text-slate-400">Aprovado em</p>
                  <p className="text-slate-700 dark:text-slate-200">{new Date(detail.approved_at).toLocaleString("pt-BR")}</p>
                </div>
              )}
              {detail.rejected_at && (
                <div className="col-span-2">
                  <p className="text-slate-400">Rejeitado em</p>
                  <p className="text-slate-700 dark:text-slate-200">
                    {new Date(detail.rejected_at).toLocaleString("pt-BR")} — {detail.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Membros ({detail.members?.length ?? detail.member_count})
              </p>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {(detail.members ?? []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs rounded-md border border-slate-100 dark:border-slate-800 px-2 py-1.5">
                    <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                    <span className="text-slate-400">{m.account_type}{!m.is_active ? " · inativo" : ""}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {detail.status === "pending" && (
                <>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => void approve(detail.id)} disabled={busy}>
                    <Check className="h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200" onClick={() => setRejectOpen(true)}>
                    <X className="h-3.5 w-3.5" /> Rejeitar
                  </Button>
                </>
              )}
              {detail.status === "active" && (
                <>
                  {detail.conversation_id && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <MessageSquare className="h-3.5 w-3.5" /> Sala de chat criada
                    </span>
                  )}
                  <Button size="sm" variant="outline" className="gap-1 text-amber-600 border-amber-200" onClick={() => setArchiveOpen(true)}>
                    <Archive className="h-3.5 w-3.5" /> Arquivar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejeição — justificativa obrigatória */}
      <ConfirmationDialog
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={confirmReject}
        title="Rejeitar solicitação de grupo"
        message={
          <div className="space-y-2">
            <p>Explique o motivo da rejeição — o líder verá esta justificativa.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              aria-label="Justificativa da rejeição"
              className="w-full text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            />
          </div>
        }
        confirmText="Rejeitar"
        destructive
        confirmDisabled={rejectReason.trim().length < 3}
      />

      {/* Arquivar — confirmação dupla */}
      <ConfirmationDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={confirmArchive}
        twoStep
        attention
        icon={Archive}
        title="Arquivar grupo"
        message="O grupo sai das regras ativas e a sala de chat fica somente leitura. Nenhuma mensagem é apagada."
        targetName={detail?.name}
        consequences={[
          "A sala de chat não recebe mais mensagens novas (histórico preservado).",
          "Os membros continuam registrados — nada é excluído.",
        ]}
        continueText="Continuar para confirmação"
        finalConfirmText="Arquivar grupo"
      />
    </DashboardShellFrame>
  );
}
