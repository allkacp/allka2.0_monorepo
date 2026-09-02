import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Separate from vite.config.ts on purpose — the app's real dev/build config
// stays untouched, this only adds a test runner on top of the same alias
// resolution (@ -> frontend root) the app already uses.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, ".") }],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    // Medido no acabamento do bloco 4/4 (2026-09): `app/admin/empresas/page.test.tsx`
    // (37 testes) e `components/memory-context-preview.test.tsx` passam 100%
    // em isolamento e em conjunto com todo arquivo alterado nesta sprint (3
    // execuções cada, 0 falhas) — a suíte inteira roda em ~25-45s pros 37
    // testes daquele arquivo (~0.7-1.2s/teste em média). Só falham (sempre
    // "Test timed out in 5000ms", nunca uma asserção real) quando a suíte
    // INTEIRA (67 arquivos, ~820 testes) roda de uma vez e o teste sorteado
    // pra estourar muda a cada execução — contenção de CPU real entre
    // processos de teste, não um bug determinístico no componente/teste.
    // 15s dá margem generosa pra essa contenção sem mascarar uma trava real
    // (um teste genuinamente travado ainda estoura, só que mais tarde).
    testTimeout: 15000,
  },
});
