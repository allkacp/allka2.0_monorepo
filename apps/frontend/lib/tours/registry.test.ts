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

  it("registro central: bloco 2 adiciona os 14 tours de recursos já entregues — Monitoramento e presença fica de fora (sem interface real hoje)", () => {
    expect(TOURS).toHaveLength(15);
    expect(TOURS.some((t) => /monitoramento/i.test(t.key))).toBe(false);
  });

  it("todo tour tem entre 3 e 8 passos, chave única, versão inteira positiva e categoria válida", () => {
    const seenKeys = new Set<string>();
    const validCategories = ["primeiros-passos", "alertas-comunicacao", "produtos-catalogo", "memoria-lancamento"];
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThanOrEqual(3);
      expect(tour.steps.length).toBeLessThanOrEqual(8);
      expect(Number.isInteger(tour.version) && tour.version > 0).toBe(true);
      expect(validCategories).toContain(tour.category);
      expect(seenKeys.has(tour.key)).toBe(false);
      seenKeys.add(tour.key);
    }
  });

  it("nenhum tour usa seletor frágil — todo target não-nulo é uma chave estável de data-tour-id (nunca texto/classe/posição)", () => {
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        if (step.target !== null) {
          expect(step.target).toMatch(/^[a-z0-9_-]+$/);
        }
      }
    }
  });

  it("tours admin-only (Legacy, Novo Catálogo Admin, Administração de Alertas) exigem allowedAccountTypes=['admin'] E isEligible (Admin Master real, nunca só account_type)", () => {
    for (const key of ["legacy", "novo-catalogo-admin", "administracao-alertas-regras"]) {
      const tour = findTour(key)!;
      expect(tour.allowedAccountTypes).toEqual(["admin"]);
      expect(typeof tour.isEligible).toBe("function");
      // account_type admin sozinho, sem is_master, nunca basta
      expect(tour.isEligible!({ accountType: "admin", adminProfile: { is_active: true, is_master: false, permissions: [] } })).toBe(false);
      expect(tour.isEligible!({ accountType: "admin", adminProfile: { is_active: true, is_master: true, permissions: [] } })).toBe(true);
    }
  });

  it("Legacy nunca oferece o passo de conteúdo incompleto (as 5 abas 'aguardando importação' não viram passo)", () => {
    const tour = findTour("legacy")!;
    expect(tour.steps.some((s) => /aguardando importação|contas|compras|financeiro/i.test(s.description))).toBe(false);
  });

  it("Grupos e comunicação nunca AFIRMA que a conversa interna É o WhatsApp da plataforma (mencionar que WhatsApp NÃO existe ainda é o correto)", () => {
    const tour = findTour("grupos-comunicacao")!;
    for (const step of tour.steps) {
      expect(step.title.toLowerCase()).not.toContain("whatsapp");
      expect(step.description.toLowerCase()).not.toMatch(/whatsapp da (plataforma|allka)/);
    }
    const honesty = tour.steps.find((s) => s.id === "chat-honesty")!;
    expect(honesty.description.toLowerCase()).toMatch(/ainda não existe.*whatsapp|não existe integração real com whatsapp/);
  });

  it("Canais nunca afirma que e-mail/WhatsApp/push está operacional", () => {
    const tour = findTour("canais")!;
    const honesty = tour.steps.find((s) => s.id === "channel-honesty")!;
    expect(honesty.description).toMatch(/não configurado|não envia/i);
  });

  it("Novo catálogo — Admin deixa explícito que os 36 produtos dependem de decisão comercial, e nunca incentiva publicar de verdade", () => {
    const tour = findTour("novo-catalogo-admin")!;
    const businessNote = tour.steps.find((s) => s.id === "business-note")!;
    expect(businessNote.description).toMatch(/decisão comercial/i);
    expect(tour.steps.some((s) => /clique em publicar|publique agora/i.test(s.description))).toBe(false);
  });

  it("Cesta e checkout deixa claro que o pagamento é simulado", () => {
    const tour = findTour("cesta-checkout")!;
    const confirm = tour.steps.find((s) => s.id === "confirm")!;
    expect(confirm.description.toLowerCase()).toMatch(/simulad/);
  });

  it("Plano tático explica que ID/responsável não confirmado bloqueia a materialização", () => {
    const tour = findTour("plano-tatico")!;
    const block = tour.steps.find((s) => s.id === "block-materialization")!;
    expect(block.description).toMatch(/bloqueia|impede/i);
  });

  it("Materialização e execução nunca instrui uma ação de negócio real (nenhum passo manda materializar/aprovar/pagar de verdade)", () => {
    const tour = findTour("materializacao-execucao")!;
    for (const step of tour.steps) {
      expect(step.description.toLowerCase()).not.toMatch(/clique em materializar|confirme o pagamento|aprove agora/);
    }
    expect(tour.steps.some((s) => s.id === "never-automatic")).toBe(true);
  });
});
