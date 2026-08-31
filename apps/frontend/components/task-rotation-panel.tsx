import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Users, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Situação do rodízio de ofertas de Nômade, para o responsável (Admin/Líder)
// entender por que ninguém assumiu e reiniciar quando houver candidatos de
// novo (ata 2026-08, bloco 4/5). Atualização localizada por poll curto — a
// tela da tarefa não é substituída por loader.

const POLL_MS = 10_000;

interface RotationOffer {
  id: string;
  nomade_name: string | null;
  rotation_order: number;
  status: string;
  offered_at: string;
  expires_at: string;
  decline_reason: string | null;
  close_reason: string | null;
}
interface Rotation {
  phase: "atribuida" | "procurando" | "oferta_enviada" | "recusada" | "expirada" | "escalada" | "inativo";
  pending_offer: { id: string; nomade_id: string; rotation_order: number; expires_at: string } | null;
  counts: { offered: number; declined: number; expired: number; pending: number };
  offers: RotationOffer[];
  escalated: boolean;
}

const PHASE_LABEL: Record<Rotation["phase"], string> = {
  atribuida: "Nômade atribuído",
  procurando: "Procurando Nômade",
  oferta_enviada: "Oferta enviada — aguardando resposta",
  recusada: "Última oferta recusada",
  expirada: "Última oferta expirou",
  escalada: "Rodízio esgotado — escalado ao responsável",
  inativo: "Rodízio inativo",
};
const PHASE_TONE: Record<Rotation["phase"], string> = {
  atribuida: "text-emerald-600",
  procurando: "text-blue-600",
  oferta_enviada: "text-blue-600",
  recusada: "text-amber-600",
  expirada: "text-amber-600",
  escalada: "text-red-600",
  inativo: "text-slate-500",
};

export function TaskRotationPanel({ taskId }: { taskId: string }) {
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(false);
      try {
        const r = (await apiClient.getTaskRotation(taskId)) as Rotation | null;
        setRotation(r);
      } catch {
        if (!opts.silent) setError(true);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    void load();
    pollRef.current = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  async function confirmRestart() {
    setRestarting(true);
    try {
      await apiClient.restartTaskRotation(taskId);
      setFlash("Rodízio reiniciado.");
      setRestartOpen(false);
      await load({ silent: true });
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Não foi possível reiniciar o rodízio.");
    } finally {
      setRestarting(false);
      setTimeout(() => setFlash(null), 5000);
    }
  }

  return (
    <div className="col-span-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Rodízio de Nômade
        </p>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      {loading && !rotation && <p className="text-xs text-slate-400">Carregando…</p>}
      {error && (
        <div className="text-xs text-red-500">
          Não foi possível carregar o rodízio.{" "}
          <button className="underline" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      )}

      {rotation && (
        <>
          <p className={cn("text-sm font-medium", PHASE_TONE[rotation.phase])}>{PHASE_LABEL[rotation.phase]}</p>

          {rotation.escalated && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Ninguém elegível/online assumiu. Você recebeu um alerta. Reinicie o rodízio quando houver candidatos —
              esconder o alerta não resolve.
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Avaliados: {rotation.counts.offered}</span>
            <span>Recusaram: {rotation.counts.declined}</span>
            <span>Expiraram: {rotation.counts.expired}</span>
          </div>

          {rotation.pending_offer && (
            <p className="text-xs text-blue-600 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Oferta {rotation.pending_offer.rotation_order} aguardando resposta até{" "}
              {new Date(rotation.pending_offer.expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {rotation.offers.length > 0 && (
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 max-h-32 overflow-y-auto">
              {rotation.offers.map((o) => (
                <li key={o.id}>
                  #{o.rotation_order} {o.nomade_name ?? o.id.slice(0, 6)} — <span className="font-medium">{o.status}</span>
                  {o.decline_reason ? ` ("${o.decline_reason}")` : ""}
                </li>
              ))}
            </ul>
          )}

          {(rotation.phase === "escalada" || rotation.phase === "recusada" || rotation.phase === "expirada") && (
            <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => setRestartOpen(true)} disabled={restarting}>
              {restarting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Reiniciar rodízio
            </Button>
          )}

          {flash && <p className="text-xs text-slate-600 dark:text-slate-300">{flash}</p>}
        </>
      )}

      <ConfirmationDialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onConfirm={confirmRestart}
        title="Reiniciar o rodízio?"
        message="A plataforma vai oferecer a tarefa novamente, do começo, aos Nômades elegíveis e online. As ofertas anteriores são encerradas."
        confirmText="Reiniciar"
        destructive={false}
      />
    </div>
  );
}
