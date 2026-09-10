import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Item 6 (2ª correção 09/09/2026) — sidebar expandida com padrão GLOBAL de
// 200px. Migração ÚNICA e VERSIONADA: qualquer preferência de largura
// salva antes desta versão é normalizada uma vez para 200; depois disso,
// um redimensionamento manual do usuário volta a persistir.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getAgencies: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock("@/lib/conta-logada", () => ({
  podeConsultarAgencia: () => false,
}));

import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";

const WIDTH_KEY = "sidebar-width";
const MIGRATION_KEY = "sidebar-width-migration";
const MIGRATION_VERSION = "2026-09-item6-v200";

/** Marca a migração como já feita — simula uma sessão que JÁ passou pela
 * normalização e agora deve respeitar o que o usuário escolher. */
function markMigrated() {
  localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
}

function Probe() {
  const { sidebarWidth, setSidebarWidth } = useSidebar();
  return (
    <div>
      <span data-testid="w">{sidebarWidth}</span>
      <button onClick={() => setSidebarWidth(280)}>resize-280</button>
      <button onClick={() => setSidebarWidth(999)}>too-wide</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <SidebarProvider>
      <Probe />
    </SidebarProvider>,
  );
}

beforeEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
  document.documentElement.style.removeProperty("--sidebar-width");
});

describe("SidebarProvider — largura global de 200 + migração versionada", () => {
  it("largura padrão é 200 e vira a var CSS --sidebar-width", async () => {
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("200px"),
    );
  });

  it("sessão com o default ANTIGO salvo (240): após montar, recebe 200 UMA vez e o marcador é gravado", () => {
    localStorage.setItem(WIDTH_KEY, "240");
    // sem marcador de migração ainda
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    expect(localStorage.getItem(WIDTH_KEY)).toBe("200");
    expect(localStorage.getItem(MIGRATION_KEY)).toBe(MIGRATION_VERSION);
  });

  it("sessão com largura ANTIGA grande salva (300+): também é normalizada pra 200 uma vez", () => {
    localStorage.setItem(WIDTH_KEY, "320");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    expect(localStorage.getItem(WIDTH_KEY)).toBe("200");
    expect(localStorage.getItem(MIGRATION_KEY)).toBe(MIGRATION_VERSION);
  });

  it("a migração roda só UMA vez: com o marcador já presente, um valor salvo é respeitado (não re-normaliza)", () => {
    markMigrated();
    localStorage.setItem(WIDTH_KEY, "300");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("300"); // preservado
    expect(localStorage.getItem(WIDTH_KEY)).toBe("300");
  });

  it("F5 após a migração NÃO reverte a largura: 2ª montagem lê o valor salvo (agora 200), não re-força", () => {
    localStorage.setItem(WIDTH_KEY, "240"); // sessão antiga
    const first = renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    first.unmount();
    // "F5"
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    expect(localStorage.getItem(WIDTH_KEY)).toBe("200");
  });

  it("depois da migração, redimensionar manualmente persiste — inclusive após F5", async () => {
    const user = userEvent.setup();
    localStorage.setItem(WIDTH_KEY, "240");
    const first = renderProbe(); // migra pra 200
    expect(screen.getByTestId("w").textContent).toBe("200");

    await user.click(screen.getByRole("button", { name: "resize-280" }));
    expect(screen.getByTestId("w").textContent).toBe("280");
    expect(localStorage.getItem(WIDTH_KEY)).toBe("280");
    expect(localStorage.getItem(MIGRATION_KEY)).toBe(MIGRATION_VERSION);

    first.unmount();
    renderProbe(); // "F5"
    expect(screen.getByTestId("w").textContent).toBe("280"); // escolha nova preservada
  });

  it("clamp continua valendo após a migração: valor acima do máximo → 400", async () => {
    const user = userEvent.setup();
    markMigrated();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "too-wide" }));
    expect(screen.getByTestId("w").textContent).toBe("400");
  });

  it("primeira carga sem nada salvo: 200 + marcador gravado (não fica re-migrando)", () => {
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("200");
    expect(localStorage.getItem(MIGRATION_KEY)).toBe(MIGRATION_VERSION);
  });
});
