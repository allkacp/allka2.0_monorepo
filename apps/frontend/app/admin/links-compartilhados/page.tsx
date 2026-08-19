// Central Geral de Links — visão consolidada de todos os ShareLinks (não
// mais contextual a um único dashboard, como ShareLinksPanel é). Admin
// autenticado vê TODOS os links da plataforma (?scope=all, confirmado de
// novo no backend — nunca confiamos no papel do usuário só pelo
// frontend); qualquer outro perfil que acesse esta URL só vê os PRÓPRIOS
// links, porque o backend ignora scope=all pra quem não é admin — a
// listagem contextual de cada dashboard continua existindo e funcionando
// exatamente como antes, esta tela é complementar.
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient, ApiError, type DashboardShareLink } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Link2, Search, Copy, Ban, RotateCcw, ArchiveX, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
const PERMISSION_LABEL: Record<DashboardShareLink["permission"], string> = { view: "Somente visualizar", comment: "Comentar" };

function formatDate(iso: string | null): string {
  if (!iso) return "Sem expiração";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function shareUrl(link: DashboardShareLink): string {
  return `${window.location.origin}/dashboard/share/${link.slug || link.token}`;
}

export default function LinksCompartilhadosPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<DashboardShareLink[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "expired" | "revoked">("");
  const [permissionFilter, setPermissionFilter] = useState<"" | "view" | "comment">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<"revoke" | null>(null);
  const [confirmOne, setConfirmOne] = useState<{ id: string; kind: "revoke" | "archive" } | null>(null);

  const load = useCallback(() => {
    setState("loading");
    apiClient
      .listAllDashboardShares({
        scope: "all",
        status: statusFilter || undefined,
        permission: permissionFilter || undefined,
        q: q.trim() || undefined,
      })
      .then((res: { links: DashboardShareLink[] }) => {
        setLinks(res.links);
        setState("ready");
        setSelected(new Set());
      })
      .catch(() => setState("error"));
  }, [statusFilter, permissionFilter, q]);

  // Debounce da busca — evita um request por tecla.
  useEffect(() => {
    const handle = setTimeout(load, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, permissionFilter]);

  const allSelected = links.length > 0 && selected.size === links.length;
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(links.map((l) => l.id)));
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCopy = async (link: DashboardShareLink) => {
    try {
      await navigator.clipboard.writeText(shareUrl(link));
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiClient.revokeDashboardShare(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
      toast({ title: "Link revogado" });
    } catch (err) {
      toast({ title: "Não foi possível revogar", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusyId(null);
      setConfirmOne(null);
    }
  };

  const handleReactivate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiClient.reactivateDashboardShare(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
      toast({ title: "Link reativado" });
    } catch (err) {
      toast({ title: "Não foi possível reativar", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setBusyId(id);
    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try {
      await apiClient.archiveDashboardShare(id);
      toast({ title: "Link excluído" });
    } catch (err) {
      setLinks(previous);
      toast({ title: "Não foi possível excluir", description: err instanceof ApiError ? err.message : undefined, variant: "destructive" });
    } finally {
      setBusyId(null);
      setConfirmOne(null);
    }
  };

  // Ações em massa: nada de endpoint novo — dispara o MESMO endpoint por
  // item já existente e validado individualmente no backend (ownership,
  // status etc.), sequencialmente. Mais lento que um bulk endpoint
  // dedicado, mas reaproveita 100% da validação já existente sem
  // introduzir um caminho novo e menos testado.
  const handleBulkRevoke = async () => {
    setBulkBusy(true);
    const ids = [...selected];
    let okCount = 0;
    for (const id of ids) {
      try {
        const res = await apiClient.revokeDashboardShare(id);
        setLinks((prev) => prev.map((l) => (l.id === id ? res.link : l)));
        okCount++;
      } catch {
        // Um item falhar não interrompe os demais — reporta no final.
      }
    }
    setBulkBusy(false);
    setConfirmBulk(null);
    setSelected(new Set());
    toast({
      title: okCount === ids.length ? `${okCount} link(s) revogado(s)` : `${okCount} de ${ids.length} revogado(s)`,
      variant: okCount === ids.length ? undefined : "destructive",
    });
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (statusFilter) parts.push(STATUS_LABEL[statusFilter]);
    if (permissionFilter) parts.push(PERMISSION_LABEL[permissionFilter]);
    return parts;
  }, [statusFilter, permissionFilter]);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Link2}
            title="Central Geral de Links"
            description={`${links.length} link${links.length !== 1 ? "s" : ""} de dashboards e widgets compartilhados`}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título, URL ou token…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="expired">Expirado</option>
              <option value="revoked">Revogado</option>
            </select>
            <select
              value={permissionFilter}
              onChange={(e) => setPermissionFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas as permissões</option>
              <option value="view">Somente visualizar</option>
              <option value="comment">Comentar</option>
            </select>
          </div>

          {/* Ações em massa */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => setConfirmBulk("revoke")} disabled={bulkBusy}>
                <Ban className="h-3 w-3" /> Revogar selecionados
              </Button>
            </div>
          )}

          {/* Lista */}
          {state === "loading" && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando links…
            </p>
          )}
          {state === "error" && (
            <div className="flex items-center justify-between gap-2 text-sm text-destructive">
              <span>Não foi possível carregar os links.</span>
              <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
            </div>
          )}
          {state === "ready" && links.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum link encontrado{filterSummary.length ? ` para ${filterSummary.join(", ")}` : ""}.</p>
          )}
          {state === "ready" && links.length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="shrink-0" />
                <span className="flex-1">Link</span>
                <span className="w-32 hidden sm:block">Criador</span>
                <span className="w-28 hidden md:block">Validade</span>
                <span className="w-40 shrink-0">Ações</span>
              </div>
              <ul className="divide-y divide-border/50">
                {links.map((link) => {
                  const busy = busyId === link.id;
                  return (
                    <li key={link.id} className="flex items-start gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(link.id)}
                        onChange={() => toggleSelect(link.id)}
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{link.targetTitle}</p>
                        <p className="text-xs font-mono text-muted-foreground truncate" title={shareUrl(link)}>
                          {shareUrl(link)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", STATUS_BADGE_CLASS[link.status])}>
                            {STATUS_LABEL[link.status]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{PERMISSION_LABEL[link.permission]}</Badge>
                          {link.hasPin && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              <Lock className="h-2.5 w-2.5" /> PIN
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-32 hidden sm:block text-xs text-muted-foreground truncate pt-1">
                        {link.creatorName || link.creatorEmail || "—"}
                      </div>
                      <div className="w-28 hidden md:block text-xs text-muted-foreground pt-1">{formatDate(link.expiresAt)}</div>
                      <div className="w-40 shrink-0 flex flex-wrap items-center gap-1 pt-0.5">
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => handleCopy(link)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        {(link.status === "active" || link.status === "expired") && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-destructive" disabled={busy} onClick={() => setConfirmOne({ id: link.id, kind: "revoke" })}>
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                        {link.status === "revoked" && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px]" disabled={busy} onClick={() => handleReactivate(link.id)}>
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-muted-foreground" disabled={busy} onClick={() => setConfirmOne({ id: link.id, kind: "archive" })}>
                          <ArchiveX className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!confirmOne} onOpenChange={(open) => !open && setConfirmOne(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmOne?.kind === "revoke" ? "Revogar este link?" : "Excluir este link?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOne?.kind === "revoke"
                ? "Este link deixará de funcionar imediatamente. O histórico é mantido."
                : "Este link será removido da lista. O histórico é preservado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (!confirmOne) return;
                if (confirmOne.kind === "revoke") handleRevoke(confirmOne.id);
                else handleArchive(confirmOne.id);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk === "revoke"} onOpenChange={(open) => !open && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar {selected.size} link(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os links selecionados deixarão de funcionar imediatamente. O histórico de cada um é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleBulkRevoke} disabled={bulkBusy}>
              {bulkBusy ? "Revogando…" : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
