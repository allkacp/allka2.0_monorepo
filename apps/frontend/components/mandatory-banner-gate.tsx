import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

// Banner obrigatório (ata 2026-08, bloco 5/5).
//
// Overlay DENTRO da plataforma que bloqueia o conteúdo atrás. kind
// "obrigatorio": Esc / clique fora NÃO dispensam — só o clique explícito no
// botão de ciência. kind "informativo": pode fechar normalmente. A ciência é
// registrada no servidor por (banner, usuário, versão); uma nova versão faz
// o banner reaparecer. Um banner por vez (fila). Poll curto, não WebSocket.

const POLL_MS = 60_000;

interface Banner {
  id: string;
  title: string;
  body: string;
  kind: "obrigatorio" | "informativo";
  version: number;
  ack_button_label: string;
  link_url: string | null;
  image_url: string | null;
  image_alt: string | null;
}

export function MandatoryBannerGate() {
  const [queue, setQueue] = useState<Banner[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fechados localmente nesta sessão (informativos) — não reaparecem no poll.
  const dismissed = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await apiClient.getMyMandatoryBanners();
      setQueue(res.data.filter((b) => !dismissed.current.has(`${b.id}:${b.version}`)));
    } catch {
      // silencioso — o banner tenta de novo no próximo poll
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const current = queue[0] ?? null;
  const isMandatory = current?.kind === "obrigatorio";

  // Bloqueia a rolagem do fundo enquanto há um banner aberto.
  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [current]);

  // Esc só fecha informativo.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isMandatory) closeInformative();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isMandatory]);

  if (!current) return null;

  function next(banner: Banner) {
    setQueue((q) => q.filter((b) => b.id !== banner.id));
    setError(null);
  }

  function closeInformative() {
    if (!current || isMandatory) return;
    dismissed.current.add(`${current.id}:${current.version}`);
    next(current);
  }

  async function confirm() {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.acknowledgeBanner(current.id, current.version);
      dismissed.current.add(`${current.id}:${current.version}`);
      next(current);
    } catch (err: any) {
      if (err?.data?.code === "version_changed") {
        setError("Há uma nova versão deste comunicado. Atualizando…");
        void load();
      } else {
        setError(err?.message || "Não foi possível registrar sua ciência. Tente de novo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandatory-banner-title"
      onMouseDown={(e) => {
        // Clique fora: só fecha informativo. Obrigatório ignora.
        if (e.target === e.currentTarget && !isMandatory) closeInformative();
      }}
    >
      {/* Fundo que bloqueia a interação com o conteúdo de trás. */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden="true" />

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        {!isMandatory && (
          <button
            type="button"
            onClick={closeInformative}
            aria-label="Dispensar comunicado"
            className="absolute right-3 top-3 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="overflow-y-auto px-6 pb-4 pt-6">
          {current.image_url && (
            <div className="mb-4 w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {/* Imagem inteira — nunca corta (object-contain). */}
              <img
                src={current.image_url}
                alt={current.image_alt ?? ""}
                className="mx-auto max-h-56 w-full object-contain"
              />
            </div>
          )}
          <h2 id="mandatory-banner-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {current.title}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
            {current.body}
          </p>
          {current.link_url && (
            <a
              href={current.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Abrir link <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {error && (
          <p className="px-6 pb-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <span className="text-xs text-neutral-400">
            {isMandatory ? "Ciência obrigatória" : "Comunicado informativo"}
            {queue.length > 1 ? ` · ${queue.length} pendentes` : ""}
          </span>
          <div className="flex gap-2">
            {!isMandatory && (
              <Button variant="ghost" size="sm" onClick={closeInformative}>
                Fechar
              </Button>
            )}
            <Button size="sm" onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {current.ack_button_label || "Li e estou ciente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
