import { describe, expect, it } from "vitest";
import { TOURS, findTour, toursForAccountType } from "@/lib/tours/registry";

describe("Registro de tours (sprint de onboarding, bloco 1/3)", () => {
  it("tour piloto 'Primeiros passos na Allka' existe na versão 1 com os 6 passos esperados", () => {
    const tour = findTour("primeiros-passos");
    expect(tour).toBeDefined();
    expect(tour!.version).toBe(1);
    expect(tour!.steps.map((s) => s.id)).toEqual([
      "main-navigation",
      "global-search",
      "notifications-button",
      "alerts-button",
      "user-profile-menu",
      "help-button",
    ]);
  });

  it("busca é opcional (nem todo portal tem hoje)", () => {
    const tour = findTour("primeiros-passos")!;
    const search = tour.steps.find((s) => s.id === "global-search");
    expect(search?.optional).toBe(true);
  });

  it("Notificações e Alertas são passos DISTINTOS, cada um com seu próprio alvo — nunca o mesmo recurso", () => {
    const tour = findTour("primeiros-passos")!;
    const notif = tour.steps.find((s) => s.id === "notifications-button")!;
    const alerts = tour.steps.find((s) => s.id === "alerts-button")!;
    expect(notif.target).not.toEqual(alerts.target);
    expect(notif.target).toBe("notifications-button");
    expect(alerts.target).toBe("alerts-button");
    // a explicação do passo já deixa clara a distinção conceitual (nunca o mesmo painel)
    expect(alerts.description.toLowerCase()).toContain("notificações");
  });

  it("nenhum passo usa seletor frágil — todo target é uma chave estável de data-tour-id, nunca texto/posição", () => {
    const tour = findTour("primeiros-passos")!;
    for (const step of tour.steps) {
      if (step.target !== null) {
        expect(step.target).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it("toursForAccountType nunca filtra o piloto (disponível a todo perfil) — admin, empresas, agencias, lider, nomades", () => {
    for (const accountType of ["admin", "empresas", "agencias", "lider", "nomades"]) {
      const tours = toursForAccountType(accountType);
      expect(tours.some((t) => t.key === "primeiros-passos")).toBe(true);
    }
  });

  it("registro central: só o tour piloto existe neste bloco (produtos/legacy/checkout/memória/ia/lançamento/grupos/monitoramento ficam pros blocos 2 e 3)", () => {
    expect(TOURS).toHaveLength(1);
  });
});
