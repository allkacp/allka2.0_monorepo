import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Item 6 (reunião 09/09/2026) — a sidebar expandida ficou mais enxuta:
// padrão 240→216, mínimo 220→200. O container central é `flex-1`, então
// herda os ~24px automaticamente. Quem já arrastou a barra mantém o valor
// salvo em localStorage.

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

function Probe() {
  const { sidebarWidth, setSidebarWidth } = useSidebar();
  return (
    <div>
      <span data-testid="w">{sidebarWidth}</span>
      <button onClick={() => setSidebarWidth(150)}>too-narrow</button>
      <button onClick={() => setSidebarWidth(999)}>too-wide</button>
      <button onClick={() => setSidebarWidth(180)}>at-190</button>
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

describe("SidebarProvider — largura da sidebar (Item 6)", () => {
  it("largura padrão é 216 (era 240) e vira a var CSS --sidebar-width", async () => {
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("216");
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("216px"),
    );
  });

  it("valor abaixo do mínimo é fixado em 200 (o novo mínimo)", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "too-narrow" }));
    expect(screen.getByTestId("w").textContent).toBe("200");
    await user.click(screen.getByRole("button", { name: "at-190" }));
    expect(screen.getByTestId("w").textContent).toBe("200");
  });

  it("valor acima do máximo continua fixado em 400", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "too-wide" }));
    expect(screen.getByTestId("w").textContent).toBe("400");
  });

  it("respeita uma largura já salva pelo usuário (não força o novo padrão)", () => {
    localStorage.setItem("sidebar-width", "300");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("300");
  });

  it("largura salva fora da faixa cai pro padrão 216, nunca pro 240 antigo", () => {
    localStorage.setItem("sidebar-width", "50");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("216");
  });

  it("migra o DEFAULT LEGADO 240 → 216 (não era escolha deliberada) e reescreve o localStorage", () => {
    localStorage.setItem("sidebar-width", "240");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("216");
    expect(localStorage.getItem("sidebar-width")).toBe("216"); // migração persistida, não re-migra
  });

  it("preserva larguras REALMENTE personalizadas pelo usuário (diferentes do default legado)", () => {
    for (const custom of ["250", "300", "205", "399"]) {
      localStorage.setItem("sidebar-width", custom);
      cleanup();
      renderProbe();
      expect(screen.getByTestId("w").textContent).toBe(custom);
      expect(localStorage.getItem("sidebar-width")).toBe(custom); // intacto
    }
  });

  it("220 (antigo MÍNIMO, alcançado arrastando até o batente) é preservado — só o 240 migra", () => {
    localStorage.setItem("sidebar-width", "220");
    renderProbe();
    expect(screen.getByTestId("w").textContent).toBe("220");
    expect(localStorage.getItem("sidebar-width")).toBe("220");
  });
});
