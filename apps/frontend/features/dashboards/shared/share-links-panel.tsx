// Gerenciamento dos links já criados pra um dashboard/widget específico —
// vive na mesma área (Sheet) em que o link é gerado, como uma aba a mais
// (ver uso em app/{agency,company,leader,partner}/dashboard/page.tsx). Lista
// é sempre filtrada por targetId no backend (GET /dashboard-shares?targetId=),
// nunca mistura links de outro dashboard. Status/permissão/PIN vêm prontos
// do backend (routes/dashboard-shares.ts) — nada é recalculado aqui.
import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError, type DashboardShareLink, type ShareLinkActivityEntry } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Lock, Ban, ArchiveX, RotateCcw, Pencil, Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareCreateForm } from "./share-create-form";

const STATUS_LABEL: Record<DashboardShareLink["status"], string> = {
  active: "Ativo",
  expired: "Expirado",
  revoked: "Revogado",
  archived: "Arquivado",
};

const STATUS_BADGE_CLASS: Record<DashboardShareLink["status"], string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  revoked: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800",
  archived: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const PERMISSION_LABEL: Record<DashboardShareLink["permission"], string> = {
  view: "Somente visualizar",
  comment: "Comentar",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sem expiração";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function shareUrl(link: Pick<DashboardShareLink, "token" | "slug">): string {
  return `${window.location.origin}/dashboard/share/${link.slug || link.token}`;
}

function truncateUrl(url: string): string {
  if (url.length <= 46) return url;
  return `${url.slice(0, 34)}…${url.slice(-8)}`;
}

function formatDateTimeFull(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PERMISSION_METADATA_LABEL: Record<string, string> = { view: "Somente visualizar", comment: "Comentar" };

/** "permission: view → comment" etc. — só formata os pares from/to seguros que o backend já filtrou. */
function formatActivityMetadata(action: string, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (action === "permission_changed" && "from" in metadata && "to" in metadata) {
    const from = PERMISSION_METADATA_LABEL[String(metadata.from)] ?? String(metadata.from);
    const to = PERMISSION_METADATA_LABEL[String(metadata.to)] ?? String(metadata.to);
    return `${from} → ${to}`;
  }
  if (action === "slug_changed" && ("from" in metadata || "to" in metadata)) {
    const from = metadata.from ? String(metadata.from) : "(sem URL personalizada)";
    const to = metadata.to ? String(metadata.to) : "(sem URL personalizada)";
    return `${from} → ${to}`;
  }
  if (action === "expiry_changed" && ("from" in metadata || "to" in metadata)) {
    const from = metadata.from ? formatDateTimeFull(String(metadata.from)) : "sem expiração";
    const to = metadata.to ? formatDateTimeFull(String(metadata.to)) : "sem expiração";
    return `${from} → ${to}`;
  }
  if (action === "created") {
    const parts: string[] = [];
    if (metadata.permission) parts.push(PERMISSION_METADATA_LABEL[String(metadata.permission)] ?? String(metadata.permission));
    if (metadata.hasPin) parts.push("com PIN");
    if (metadata.slug) parts.push(`URL: ${metadata.slug}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  return null;
}

type EditFormState = {
  permission: "view" | "comment";
  slug: string;
  pinEnabled: boolean;
  /** Estado original ao abrir a edição — usado só pra saber se PIN foi desligado (= remover). */
  pinWasEnabled: boolean;
  /** PIN novo digitado nesta edição. Vazio = não mexer no PIN existente (nunca exibimos o atual). */
  pin: string;
  expiryEnabled: boolean;
  expiry: string;
};

function editFormFromLink(link: DashboardShareLink): EditFormState {
  return {
    permission: link.permission,
    slug: link.slug ?? "",
    pinEnabled: link.hasPin,
    pinWasEnabled: link.hasPin,
    pin: "",
    expiryEnabled: !!link.expiresAt,
    expiry: link.expiresAt ? link.expiresAt.slice(0, 10) : "",
  };
}

export function ShareLinksPanel({
  targetId,
  refreshSignal,
  pendingLink,
}: {
  targetId: string | undefined;
  /** Incremente esse número (ex.: após criar um novo link) pra forçar refetch. */
  refreshSignal?: number;
  /**
   * O ShareLink recém-criado (já serializado, retornado pelo próprio POST
   * de criação) — inserido direto no estado da lista assim que chega,
   * sem esperar o refetch. Existe porque depender só do refetch
   * (refreshSignal) falha quando este painel está desmontado no momento
   * da criação (aba "Configuração" ativa, Radix Tabs desmonta o conteúdo
   * inativo por padrão) — a causa da regressão "link novo não aparece em
   * Links criados sem F5". Precisa vir sempre acompanhado de `forceMount`
   * na TabsContent que envolve este painel (ver uso nas 5 telas), senão
   * a prop muda mas o componente nem existe pra reagir a ela.
   */
  pendingLink?: DashboardShareLink | null;
}) {
  const { toast } = useToast();
  const [links, setLinks] = useState<DashboardShareLink[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; kind: "revoke" | "archive" } | null>(null);
  const [historyLinkId, setHistoryLinkId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ShareLinkActivityEntry[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    if (!targetId) return;
    setState("loading");
    apiClient
      .listDashboardShares(targetId)
      .then((res: { links: DashboardShareLink[] }) => {
        setLinks(res.links);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [targetId]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  // Inserção otimista do link recém-criado — não espera o refetch acima
  // (que ainda roda em paralelo e vai reconciliar/confirmar). Dedup por id
  // pra não duplicar quando o GET real chegar e já incluir o mesmo link.
  useEffect(() => {
    if (!pendingLink) return;
    setLinks((prev) => (prev.some((l) => l.id === pendingLink.id) ? prev : [pendingLink, ...prev]));
    setState("ready");
  }, [pendingLink]);

  const handleCopy = async (link: DashboardShareLink) => {
    try {
      await navigator.clipboard.writeText(shareUrl(link));
      toast({ title: "Link copiado!", description: "A URL foi copiada para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiClient.revokeDashboardShare(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
      toast({ title: "Link revogado", description: "Ele deixou de funcionar imediatamente." });
    } catch (err) {
      toast({
        title: "Não foi possível revogar",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  };

  const handleReactivate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiClient.reactivateDashboardShare(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
      toast({ title: "Link reativado" });
    } catch (err) {
      toast({
        title: "Não foi possível reativar",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setBusyId(id);
    const previous = links;
    // Otimista: some da lista imediatamente; reverte em erro.
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try {
      await apiClient.archiveDashboardShare(id);
      toast({ title: "Link excluído", description: "Removido da lista. O histórico foi preservado." });
    } catch (err) {
      setLinks(previous);
      toast({
        title: "Não foi possível excluir",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  };

  // Histórico sobrevive a revogação/expiração/arquivamento (item 8) — a
  // ação "Histórico" fica disponível em qualquer status, inclusive links
  // arquivados que já sumiram da lista operacional padrão.
  const openHistory = (id: string) => {
    setHistoryLinkId(id);
    setHistoryState("loading");
    apiClient
      .getShareLinkActivity(id)
      .then((res: { activities: ShareLinkActivityEntry[] }) => {
        setHistoryEntries(res.activities);
        setHistoryState("ready");
      })
      .catch(() => setHistoryState("error"));
  };

  // ── Edição unificada — URL, Permissão, PIN e Expiração juntos numa única
  // ação "Editar" (ver item 19: nada de lápis espalhado por campo). ──
  const startEdit = (link: DashboardShareLink) => {
    setEditingId(link.id);
    setEditForm(editFormFromLink(link));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (id: string) => {
    if (!editForm) return;
    if (editForm.pinEnabled && !editForm.pinWasEnabled && editForm.pin.length !== 4) {
      toast({ title: "Informe um PIN de 4 dígitos para ativar a proteção.", variant: "destructive" });
      return;
    }
    if (editForm.pinEnabled && editForm.pin.length > 0 && editForm.pin.length !== 4) {
      toast({ title: "O novo PIN precisa ter exatamente 4 dígitos.", variant: "destructive" });
      return;
    }
    setBusyId(id);
    try {
      const patch: {
        slug: string | null;
        permission: "view" | "comment";
        expiresAt: string | null;
        pin?: string | null;
      } = {
        slug: editForm.slug.trim() || null,
        permission: editForm.permission,
        expiresAt:
          editForm.expiryEnabled && editForm.expiry
            ? new Date(`${editForm.expiry}T23:59:59`).toISOString()
            : null,
      };
      // PIN nunca é reenviado "sem querer": só entra no payload quando o
      // usuário de fato ativou proteção nova/trocou o PIN (string de 4
      // dígitos) ou desligou uma proteção que já existia (null = remover).
      // Deixar como estava (ligado, campo em branco) não manda `pin`
      // nenhum — o hash atual continua intocado, nunca é revelado.
      if (editForm.pinEnabled && editForm.pin.length === 4) {
        patch.pin = editForm.pin;
      } else if (!editForm.pinEnabled && editForm.pinWasEnabled) {
        patch.pin = null;
      }

      const res = await apiClient.updateDashboardShare(id, patch);
      setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
      toast({ title: "Link atualizado" });
      cancelEdit();
    } catch (err) {
      toast({
        title: "Não foi possível salvar as alterações",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!targetId) return null;

  return (
    <div className="space-y-3">
      {state === "loading" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando links…
        </p>
      )}
      {state === "error" && (
        <div className="flex items-center justify-between gap-2 text-sm text-destructive">
          <span>Não foi possível carregar os links.</span>
          <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
        </div>
      )}
      {state === "ready" && links.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum link compartilhado criado ainda.</p>
      )}
      {state === "ready" && links.length > 0 && (
        <ul className="space-y-2.5">
          {links.map((link) => {
            const busy = busyId === link.id;
            const editing = editingId === link.id;
            return (
              <li
                key={link.id}
                className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-foreground truncate" title={shareUrl(link)}>
                      {truncateUrl(shareUrl(link))}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", STATUS_BADGE_CLASS[link.status])}>
                        {STATUS_LABEL[link.status]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {PERMISSION_LABEL[link.permission]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 gap-1",
                          link.hasPin && "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400",
                        )}
                      >
                        <Lock className="h-2.5 w-2.5" /> {link.hasPin ? "Protegido por PIN" : "Sem PIN"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {formatDateTime(link.expiresAt) === "Sem expiração" ? "Sem expiração" : `Expira em ${formatDateTime(link.expiresAt)}`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Criado em {formatDateTime(link.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 shrink-0"
                    onClick={() => handleCopy(link)}
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>

                {editing && editForm && (
                  <div className="rounded-lg border border-border/60 bg-background p-3 space-y-3">
                    <ShareCreateForm
                      permission={editForm.permission}
                      onPermissionChange={(v) => setEditForm((f) => (f ? { ...f, permission: v } : f))}
                      slug={editForm.slug}
                      onSlugChange={(v) => setEditForm((f) => (f ? { ...f, slug: v } : f))}
                      slugExcludeId={link.id}
                      pinEnabled={editForm.pinEnabled}
                      onPinEnabledChange={(v) => setEditForm((f) => (f ? { ...f, pinEnabled: v, pin: "" } : f))}
                      pin={editForm.pin}
                      onPinChange={(v) => setEditForm((f) => (f ? { ...f, pin: v } : f))}
                      expiryEnabled={editForm.expiryEnabled}
                      onExpiryEnabledChange={(v) => setEditForm((f) => (f ? { ...f, expiryEnabled: v } : f))}
                      expiry={editForm.expiry}
                      onExpiryChange={(v) => setEditForm((f) => (f ? { ...f, expiry: v } : f))}
                      disabled={busy}
                    />
                    {editForm.pinWasEnabled && editForm.pinEnabled && (
                      <p className="text-[11px] text-muted-foreground">
                        Já existe um PIN definido (nunca exibido). Deixe o campo em branco para mantê-lo, ou digite 4 dígitos novos para trocá-lo.
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button size="sm" className="btn-brand h-7 text-xs" onClick={() => saveEdit(link.id)} disabled={busy}>
                        {busy ? "Salvando…" : "Salvar alterações"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEdit} disabled={busy}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-0.5">
                  {link.status !== "archived" && !editing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={busy}
                      onClick={() => startEdit(link)}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  )}
                  {(link.status === "active" || link.status === "expired") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => setConfirmAction({ id: link.id, kind: "revoke" })}
                    >
                      <Ban className="h-3 w-3" /> Revogar
                    </Button>
                  )}
                  {link.status === "revoked" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={busy}
                      onClick={() => handleReactivate(link.id)}
                    >
                      <RotateCcw className="h-3 w-3" /> Reativar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    onClick={() => setConfirmAction({ id: link.id, kind: "archive" })}
                  >
                    <ArchiveX className="h-3 w-3" /> Excluir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                    onClick={() => openHistory(link.id)}
                  >
                    <History className="h-3 w-3" /> Histórico
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "revoke" ? "Revogar este link?" : "Excluir este link?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "revoke"
                ? "Este link deixará de funcionar imediatamente. O histórico é mantido e você pode reativá-lo depois."
                : "Este link será removido da lista. O histórico é preservado, mas ele não pode ser restaurado por aqui — será necessário criar um novo link."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.kind === "revoke") handleRevoke(confirmAction.id);
                else handleArchive(confirmAction.id);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyLinkId} onOpenChange={(open) => !open && setHistoryLinkId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico do link</DialogTitle>
            <DialogDescription>
              Sobrevive a revogação, expiração e arquivamento — o registro nunca é apagado.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {historyState === "loading" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando histórico…
              </p>
            )}
            {historyState === "error" && (
              <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
            )}
            {historyState === "ready" && historyEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
            )}
            {historyState === "ready" && historyEntries.length > 0 && (
              <ol className="relative border-l border-border/60 pl-4 space-y-4">
                {historyEntries.map((entry) => {
                  const detail = formatActivityMetadata(entry.action, entry.metadata);
                  return (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{entry.label}</p>
                      {detail && <p className="text-xs text-muted-foreground font-mono mt-0.5">{detail}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDateTimeFull(entry.createdAt)}
                        {(entry.actorName || entry.actorEmail) && (
                          <> · {entry.actorName || entry.actorEmail}{entry.actorName && entry.actorEmail ? ` (${entry.actorEmail})` : ""}</>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
