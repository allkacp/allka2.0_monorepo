/**
 * "Conexões" — aba na tela do projeto pra ligar contas de plataformas de
 * marketing (Meta Ads/Instagram, e no futuro Google Ads/Analytics/Meu
 * Negócio, TikTok). Só Meta tem lógica real por enquanto; os outros 5
 * aparecem como cards "Em breve" — estruturados, mas honestos sobre não
 * funcionarem ainda (mesmo padrão usado nos canais de notificação).
 */
import { useState } from "react";
import {
  Facebook,
  Chrome,
  Building2,
  Music2,
  BarChart3,
  RefreshCw,
  Unplug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { apiClient, ApiError } from "@/lib/api-client";
import { useProjectConnections, type ProjectConnection } from "@/hooks/useProjectConnections";
import { cn } from "@/lib/utils";

const PLACEHOLDER_PROVIDERS = [
  { key: "google_ads", name: "Google Ads", Icon: Chrome },
  { key: "google_analytics", name: "Google Analytics", Icon: BarChart3 },
  { key: "google_business", name: "Google Meu Negócio", Icon: Building2 },
  { key: "tiktok_ads", name: "TikTok Ads", Icon: Music2 },
];

const STATUS_LABEL: Record<ProjectConnection["status"], string> = {
  connected: "Conectado",
  expired: "Expirado — reconecte",
  disconnected: "Desconectado",
  error: "Erro na última sincronização",
};

const STATUS_COLOR: Record<ProjectConnection["status"], string> = {
  connected: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  disconnected: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface ProjectConnectionsTabProps {
  projectId: string | number;
}

export function ProjectConnectionsTab({ projectId }: ProjectConnectionsTabProps) {
  const { connections, loading, refetch } = useProjectConnections(projectId);
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<ProjectConnection | null>(null);

  const metaConnection = connections.find((c) => c.provider === "meta_ads" && c.status !== "disconnected");

  async function handleConnectMeta() {
    setConnecting(true);
    try {
      const res = await apiClient.getMetaAuthorizeUrl(projectId);
      window.open(res.url, "_blank");
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 503
          ? "A integração com Meta Ads ainda não foi configurada."
          : "Não foi possível iniciar a conexão. Tente novamente.";
      toast({ title: "Meta Ads", description: message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    try {
      await apiClient.syncProjectConnectionNow(connectionId);
      toast({ title: "Meta Ads", description: "Sincronização concluída." });
      await refetch();
    } catch {
      toast({ title: "Meta Ads", description: "Não foi possível sincronizar agora.", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  }

  async function confirmDisconnect() {
    if (!disconnecting) return;
    try {
      await apiClient.disconnectProjectConnection(disconnecting.id);
      toast({ title: "Meta Ads", description: "Conexão removida. O histórico continua salvo." });
    } catch {
      toast({ title: "Meta Ads", description: "Não foi possível desconectar agora.", variant: "destructive" });
    } finally {
      setDisconnecting(null);
      await refetch();
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Meta Ads/Instagram — o único canal real por enquanto */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Facebook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Meta Ads / Instagram</p>
              {metaConnection ? (
                <p className="text-xs text-slate-400 truncate">{metaConnection.external_account_name}</p>
              ) : (
                <p className="text-xs text-slate-400">Anúncios do Facebook e Instagram</p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-3 flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : metaConnection ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", STATUS_COLOR[metaConnection.status])}>
                  {STATUS_LABEL[metaConnection.status]}
                </Badge>
                {metaConnection.last_synced_at && (
                  <span className="text-[10px] text-slate-400">
                    Sincronizado {new Date(metaConnection.last_synced_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
              {metaConnection.last_error && metaConnection.status === "error" && (
                <p className="text-[10px] text-red-500 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  {metaConnection.last_error}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {metaConnection.status === "expired" ? (
                  <Button size="sm" className="h-7 text-xs btn-brand border-0" disabled={connecting} onClick={() => void handleConnectMeta()}>
                    Reconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={syncingId === metaConnection.id}
                    onClick={() => void handleSync(metaConnection.id)}
                  >
                    {syncingId === metaConnection.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Sincronizar agora
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                  onClick={() => setDisconnecting(metaConnection)}
                >
                  <Unplug className="h-3 w-3" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" className="mt-3 h-8 text-xs btn-brand border-0 gap-1.5" disabled={connecting} onClick={() => void handleConnectMeta()}>
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Conectar
            </Button>
          )}
        </div>

        {/* Demais canais — estruturados, mas honestos: ainda não funcionam */}
        {PLACEHOLDER_PROVIDERS.map(({ key, name, Icon }) => (
          <div key={key} className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 opacity-70">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0">
                <Icon className="h-5 w-5 text-slate-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{name}</p>
                <p className="text-xs text-slate-400">Ainda não disponível</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">Em breve</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Cada conexão guarda um histórico diário dos resultados — mesmo se você desconectar, os
          números já coletados continuam salvos.
        </p>
      </div>

      <ConfirmationDialog
        open={disconnecting !== null}
        onClose={() => setDisconnecting(null)}
        onConfirm={() => void confirmDisconnect()}
        title="Desconectar Meta Ads"
        message="Isso para as sincronizações futuras dessa conta. O histórico já coletado continua salvo e pode ser visto de novo se você reconectar."
        confirmText="Desconectar"
        destructive
      />
    </div>
  );
}
