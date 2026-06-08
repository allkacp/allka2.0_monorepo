import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import { mockApiClient } from "./dev-mocks/mock-api-client";
import "./app/globals.css";

// ─── Dev preview: garante token válido sem login manual ───────────────────────
// Em modo desenvolvimento (npm run dev), faz login automático com o usuário
// admin de teste para que todas as chamadas à API funcionem normalmente.
// Nunca executa em produção.
if (import.meta.env.DEV) {
  const TOKEN_KEY = "allka_token";
  const hasToken = !!localStorage.getItem(TOKEN_KEY);
  const wasLoggedOut = localStorage.getItem("allka_logged_out") === "true";
  const isAgencyRoute =
    window.location.pathname.startsWith("/agency") ||
    window.location.pathname.startsWith("/agencia");
  const useMocks =
    import.meta.env.MODE === "mock" ||
    import.meta.env.VITE_USE_MOCKS === "true" ||
    isAgencyRoute;
  const previewEmail = isAgencyRoute ? "agencia@allka.test" : "admin@allka.test";
  const previewAccessType = isAgencyRoute ? "AGENCY" : "ADMIN";

  if (!hasToken && !wasLoggedOut) {
    const login = useMocks
      ? mockApiClient.login(previewEmail, "123456")
      : fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: previewEmail,
            password: "123456",
            accessType: previewAccessType,
          }),
        }).then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)));

    login
      .then((data) => {
        if (data?.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          console.info(`[Dev] Token de preview obtido para ${previewEmail}`);
        }
      })
      .catch((e) =>
        console.warn("[Dev] Não foi possível obter token de preview:", e),
      );
  }
}
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>,
);
