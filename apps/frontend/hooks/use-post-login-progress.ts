import { useEffect, useRef, useState } from "react";

/**
 * Progresso 0→100% pós-login, sincronizado com um trabalho real (não é um
 * `setTimeout` cego): a barra nunca passa de 95% enquanto `task` não resolve,
 * e só termina em 100% depois que (a) `task` resolveu E (b) o tempo mínimo
 * (`minDurationMs`) já passou — o que for maior. Se `task` demorar mais que
 * o mínimo, o progresso continua avançando devagar (assíntota) até lá, sem
 * travar visualmente numa porcentagem parada.
 */
export function usePostLoginProgress(
  task: () => Promise<void>,
  options: { minDurationMs?: number; active: boolean },
) {
  const { minDurationMs = 5000, active } = options;
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"running" | "done" | "error">(
    "running",
  );
  const [error, setError] = useState<Error | null>(null);
  const readyRef = useRef(false);
  const taskRef = useRef(task);
  taskRef.current = task;

  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    readyRef.current = false;
    setStatus("running");
    setError(null);
    setProgress(0);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const start = Date.now();
    readyRef.current = false;

    taskRef
      .current()
      .then(() => {
        if (!cancelled) readyRef.current = true;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Login] Falha ao preparar o dashboard:", err);
          setStatus("error");
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    const interval = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / minDurationMs, 1);
      // ease-out cúbica: avança rápido no início, desacelera perto do teto —
      // parece "trabalho real" em vez de uma barra linear.
      const eased = 1 - Math.pow(1 - t, 3);

      if (readyRef.current && t >= 1) {
        // Tudo pronto e o mínimo já passou: fecha rápido pra 100%.
        setProgress((p) => Math.min(100, p + 4));
        return;
      }

      if (t >= 1) {
        // Mínimo passou mas os dados ainda não vieram: crawl lento até ~98%,
        // pra nunca parecer travado enquanto espera de verdade.
        const overtime = elapsed - minDurationMs;
        const crawl = 95 + (1 - Math.exp(-overtime / 8000)) * 3;
        setProgress((p) => Math.max(p, Math.min(98, crawl)));
        return;
      }

      setProgress(eased * 95);
    }, 90);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, minDurationMs, attempt]);

  useEffect(() => {
    if (progress >= 100 && status === "running") setStatus("done");
  }, [progress, status]);

  return { progress: Math.min(progress, 100), status, error, retry };
}
