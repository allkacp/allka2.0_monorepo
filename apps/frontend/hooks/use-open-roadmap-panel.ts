import { useCallback, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

const FALLBACK_ERROR = "Não foi possível abrir a Central de roadmap e chamados. Tente novamente.";

/**
 * The one place that knows how to open the Roadmap's internal panel via
 * SSO — used by both the sidebar's "Roadmap e chamados" item and the
 * "Abrir painel interno" button on /admin/acesso-chamados, so the
 * open-tab + token-request + error-handling logic exists exactly once.
 * The backend (POST /admin/product-feedback/roadmap-sso/start) is the
 * real authority on who is allowed through; this hook never decides that.
 */
export function useOpenRoadmapPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const open = useCallback(async () => {
    // Guards a double-click (or a second click while the first request is
    // still in flight) from opening a second tab or requesting a second
    // token — only one handoff attempt is ever in flight at a time.
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");

    // Opened synchronously, still inside the click's user-activation
    // window — a window.open() issued after an `await` is treated by most
    // browsers as not user-initiated and gets popup-blocked. We redirect
    // this same tab once the token request resolves.
    const popup = window.open("about:blank", "_blank");

    try {
      const { redirectUrl } = await apiClient.startRoadmapSso();
      if (popup && !popup.closed) {
        popup.location.href = redirectUrl;
      } else {
        // Popup blocked despite the synchronous open (e.g. a stricter
        // browser setting) — fall back to a second attempt now that we
        // have the final URL, better than silently doing nothing.
        window.open(redirectUrl, "_blank");
      }
    } catch (err) {
      popup?.close();
      setError(err instanceof Error ? err.message : FALLBACK_ERROR);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  return { open, loading, error };
}
