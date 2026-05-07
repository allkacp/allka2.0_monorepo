import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import "./app/globals.css";

// ─── Dev preview: garante token válido sem login manual ───────────────────────
// Em modo desenvolvimento (npm run dev), faz login automático com o usuário
// admin de teste para que todas as chamadas à API funcionem normalmente.
// Nunca executa em produção.
if (import.meta.env.DEV) {
  const TOKEN_KEY = "allka_token";
  const hasToken = !!localStorage.getItem(TOKEN_KEY);
  const wasLoggedOut = localStorage.getItem("allka_logged_out") === "true";

  if (!hasToken && !wasLoggedOut) {
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@allka.test",
        password: "Teste@123456",
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((data) => {
        if (data?.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          console.info("[Dev] Token de preview obtido para admin@allka.test");
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
