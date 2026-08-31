import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Clock, CheckCircle2, X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAccountType } from "@/contexts/account-type-context";
import { cn } from "@/lib/utils";

// Oferta de tarefa para o Nômade (ata 2026-08, bloco 4/5). Uma oferta
// individual por vez. Poll curto (não é WebSocket). Aceitar/Recusar têm
// processamento isolado nos botões. Sem window.confirm. Funciona em desktop
// (card no canto) e celular (folha inferior).

const POLL_MS = 12_000;

interface Offer {
  offer_id: string;
  seconds_left: number;
  expires_at: string;
  already_taken: boolean;
  task: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    project: { id: string; name: string } | null;
    product: string | null;
    category: string | null;
  };
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}
function fmtCountdown(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function TaskOfferPrompt() {
  const { accountType } = useAccountType();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState<null | "accept" | "decline">(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enabled = accountType === "nomades";

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await apiClient.getMyTaskOffers();
      const next = (res?.data ?? [])[0] as Offer | undefined;
      if (next && !dismissed.has(next.offer_id)) {
        setOffer(next);
        setSecondsLeft(next.seconds_left);
      } else {
        setOffer(null);
      }
    } catch {
      /* silencioso — o próximo poll tenta de novo */
    }
  }, [enabled, dismissed]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    pollRef.current = setInterval(() => void load(), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, load]);

  // Countdown local (1s) só para a exibição — a expiração real é do servidor.
  useEffect(() => {
    if (!offer) return;
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setFlash("A oferta expirou.");
          setOffer(null);
          void load();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [offer, load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!enabled) return null;

  async function accept() {
    if (!offer || busy) return;
    setBusy("accept");
    try {
      await apiClient.acceptTaskOffer(offer.offer_id);
      setFlash("Você assumiu a tarefa. Ela já está em Minhas Tarefas.");
      setOffer(null);
      navigate("/nomades/minhastarefas");
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.code === "task_already_assigned") {
        setFlash("Esta tarefa já foi assumida por outra pessoa.");
      } else if (err instanceof ApiError && ((err.data as any)?.code === "offer_expired" || (err.data as any)?.code === "offer_not_pending")) {
        setFlash("Esta oferta não está mais disponível.");
      } else {
        setFlash(err instanceof ApiError ? err.message : "Não foi possível aceitar agora.");
      }
      setOffer(null);
      void load();
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (!offer || busy) return;
    setBusy("decline");
    try {
      await apiClient.declineTaskOffer(offer.offer_id);
      setDismissed((s) => new Set(s).add(offer.offer_id));
      setFlash("Tarefa recusada — ela será oferecida a outro Nômade.");
      setOffer(null);
      void load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Não foi possível recusar agora.");
      void load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {flash && (
        <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-auto sm:top-4 max-w-[92vw] rounded-xl bg-slate-900 text-white text-xs px-4 py-2.5 shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {flash}
        </div>
      )}

      {offer && (
        <div
          className={cn(
            "fixed z-[55] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl",
            "inset-x-0 bottom-0 rounded-t-2xl p-4",
            "sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[360px] sm:rounded-2xl",
          )}
          role="dialog"
          aria-label="Oferta de tarefa"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-blue-500" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Nova tarefa oferecida a você</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{offer.task.title}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 shrink-0">
              <Clock className="h-3 w-3" />
              {fmtCountdown(secondsLeft)}
            </span>
          </div>

          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            {offer.task.project && <p>Projeto: {offer.task.project.name}</p>}
            <p>
              {offer.task.product ?? "—"}
              {offer.task.category ? ` · ${offer.task.category}` : ""}
            </p>
            <p>Prazo: {fmtDate(offer.task.due_date)}</p>
          </div>
          {offer.task.description && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-3">{offer.task.description}</p>
          )}
          {offer.already_taken && (
            <p className="mt-2 text-[11px] text-amber-600">Atenção: esta tarefa pode já ter sido assumida.</p>
          )}

          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1 h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => void accept()} disabled={busy !== null}>
              {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Aceitar tarefa
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-9 gap-1.5" onClick={() => void decline()} disabled={busy !== null}>
              {busy === "decline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Recusar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
