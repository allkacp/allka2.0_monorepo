import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";

// Heartbeat de presença online (ata 2026-08, bloco 4/5). Enquanto a
// plataforma autenticada está montada, bate o coração a cada
// `heartbeat_ms` (o servidor devolve o valor; até então usa 30s). Cleanup
// no unmount. Não continua depois do logout (o próprio logout chama
// /presence/offline e o AppLayout desmonta). Uma conta inativa recebe 403
// e o loop simplesmente para.

const DEFAULT_MS = 30_000;

export function usePresenceHeartbeat(enabled = true): void {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalMs = useRef<number>(DEFAULT_MS);
  const stopped = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;

    const beat = async () => {
      if (stopped.current) return;
      try {
        const res = await apiClient.presenceHeartbeat();
        if (res?.heartbeat_ms && res.heartbeat_ms !== intervalMs.current) {
          intervalMs.current = res.heartbeat_ms;
          if (timer.current) clearInterval(timer.current);
          timer.current = setInterval(beat, intervalMs.current);
        }
      } catch {
        // 403 (conta inativa) ou rede — para de tentar; o próximo mount reativa.
        stopped.current = true;
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
      }
    };

    void beat();
    timer.current = setInterval(beat, intervalMs.current);

    // Um heartbeat extra quando a aba volta a ficar visível (o usuário
    // "voltou"), sem esperar o próximo tick.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped.current) void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped.current = true;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
