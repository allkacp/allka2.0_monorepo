import { useCallback, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

const FALLBACK_ERROR = "Não foi possível abrir a Central de roadmap e chamados. Tente novamente.";
const READY_MESSAGE_TYPE = "allka-roadmap-sso-ready";
// Generous: a first-time visitor may need to go ask someone for the Basic
// Auth password. There's no cost to waiting longer here — the SSO token's
// own 60s clock only starts AFTER this resolves (see below).
const AWAIT_BASIC_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The one place that knows how to open the Roadmap's internal panel via
 * SSO — used by both the sidebar's "Roadmap e chamados" item and the
 * "Abrir painel interno" button on /admin/acesso-chamados, so the
 * open-tab + token-request + error-handling logic exists exactly once.
 * The backend (POST /product-feedback/roadmap-sso/start) is the real
 * authority on who is allowed through; this hook never decides that.
 *
 * Two-hop navigation, not one: the Roadmap's whole domain sits behind
 * Basic Auth (see infra/caddy/Caddyfile). If we minted the 60s SSO token
 * FIRST and only then navigated to it, a first-time visitor typing the
 * Basic Auth password could easily burn the whole 60s window before ever
 * reaching /sso/consume. Instead we navigate the tab to a plain,
 * token-less page (/sso/await) FIRST — that page requires Basic Auth to
 * even load, so its content only executes once Basic Auth is already
 * resolved for this browser — and only mint the token after it reports
 * back via postMessage. This never lengthens the token's own TTL and never
 * bypasses Basic Auth; it just moves the token minting to after Basic Auth
 * instead of before it.
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
    // browsers as not user-initiated and gets popup-blocked.
    let tab: Window | null = window.open("about:blank", "_blank");

    try {
      const { roadmapInternalUrl } = await apiClient.getRoadmapSsoBaseUrl();
      const origin = new URL(roadmapInternalUrl).origin;
      const awaitUrl = `${origin}/sso/await?origin=${encodeURIComponent(window.location.origin)}`;

      if (tab && !tab.closed) {
        tab.location.href = awaitUrl;
      } else {
        tab = window.open(awaitUrl, "_blank");
      }

      await waitForBasicAuthReady(origin, tab);

      const { redirectUrl } = await apiClient.startRoadmapSso();
      if (tab && !tab.closed) {
        tab.location.href = redirectUrl;
      } else {
        window.open(redirectUrl, "_blank");
      }
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : FALLBACK_ERROR);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  return { open, loading, error };
}

/**
 * Resolves once the opened tab (already navigated to
 * `${roadmapOrigin}/sso/await`) confirms — via postMessage, the only
 * cross-origin-safe channel available here — that it actually loaded,
 * meaning Basic Auth is already satisfied for this browser session.
 * Rejects if the tab is closed first, or if nothing arrives within
 * AWAIT_BASIC_AUTH_TIMEOUT_MS (abandoned Basic Auth prompt, network issue).
 */
function waitForBasicAuthReady(roadmapOrigin: string, tab: Window | null): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.clearInterval(closedPollId);
      window.removeEventListener("message", handleMessage);
    }

    function handleMessage(event: MessageEvent) {
      if (settled) return;
      // Origin check: only trust this specific message from the Roadmap's
      // own origin. Source check: only trust it from the exact tab we
      // opened (window.open's returned reference stays stable across
      // same-tab navigations, even cross-origin) — not from some other
      // unrelated postMessage the page might receive.
      if (event.origin !== roadmapOrigin) return;
      if (tab && event.source !== tab) return;
      if (!event.data || event.data.type !== READY_MESSAGE_TYPE) return;
      settled = true;
      cleanup();
      resolve();
    }

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error(
          "Tempo esgotado aguardando a autenticação da Central de roadmap e chamados. Tente novamente.",
        ),
      );
    }, AWAIT_BASIC_AUTH_TIMEOUT_MS);

    const closedPollId = window.setInterval(() => {
      if (settled) return;
      if (!tab || tab.closed) {
        settled = true;
        cleanup();
        reject(new Error("A aba foi fechada antes de concluir a autenticação."));
      }
    }, 500);

    window.addEventListener("message", handleMessage);
  });
}
