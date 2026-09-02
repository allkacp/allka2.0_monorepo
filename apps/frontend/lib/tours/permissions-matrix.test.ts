import { describe, expect, it } from "vitest";
import { findTour } from "@/lib/tours/registry";
import { isTourEligible } from "@/lib/tours/eligibility";
import type { TourEligibilityContext } from "@/lib/tours/types";

// ─── Auditoria explícita de permissões — TODOS os tours, não só os 3 ────────
// admin-only já cobertos em registry.test.ts (sprint de onboarding, bloco
// 3/3). Cada linha documenta a regra REAL da tela que o tour ensina — nunca
// uma regra nova inventada aqui. Onde a plataforma não tem uma permissão
// mais fina que account_type (grupos, canais, catálogo do cliente, checkout,
// projetos, aditivos, memória, IA de lançamento, plano tático,
// materialização), o teste prova que essa ausência é INTENCIONAL: o mesmo
// account_type sempre entra, e um account_type de fora sempre é bloqueado.

const ADMIN_MASTER: TourEligibilityContext = { accountType: "admin", adminProfile: { is_active: true, is_master: true, permissions: [] } };
const ADMIN_NON_MASTER: TourEligibilityContext = { accountType: "admin", adminProfile: { is_active: true, is_master: false, permissions: [] } };
const EMPRESA: TourEligibilityContext = { accountType: "empresas", adminProfile: null };
const AGENCIA: TourEligibilityContext = { accountType: "agencias", adminProfile: null };
const LIDER: TourEligibilityContext = { accountType: "lider", adminProfile: null };
const NOMADE: TourEligibilityContext = { accountType: "nomades", adminProfile: null };

const ALL_CONTEXTS = [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA, LIDER, NOMADE];

function expectEligibility(key: string, expectedEligible: TourEligibilityContext[]) {
  const tour = findTour(key)!;
  expect(tour, `tour "${key}" não existe no registro`).toBeDefined();
  for (const ctx of ALL_CONTEXTS) {
    const shouldBeEligible = expectedEligible.includes(ctx);
    expect(
      isTourEligible(tour, ctx),
      `tour "${key}" com accountType="${ctx.accountType}"${ctx.adminProfile ? ` is_master=${ctx.adminProfile.is_master}` : ""} deveria ser elegível=${shouldBeEligible}`,
    ).toBe(shouldBeEligible);
  }
}

describe("Matriz de permissões — todos os 15 tours (sprint de onboarding, bloco 3/3)", () => {
  it("primeiros-passos: aberto a todo perfil (tour de primeiro acesso, cada passo se autofiltra)", () => {
    expectEligibility("primeiros-passos", ALL_CONTEXTS);
  });

  it("alertas-notificacoes: aberto a todo perfil (ícones globais, sem tela restrita)", () => {
    expectEligibility("alertas-notificacoes", ALL_CONTEXTS);
  });

  it("administracao-alertas-regras: só Admin Master de verdade (canManageAlertsAdmin) — admin sem is_master NUNCA entra", () => {
    expectEligibility("administracao-alertas-regras", [ADMIN_MASTER]);
  });

  it("grupos-comunicacao: aberto a todo perfil — a aba Grupos do painel de Notificações não tem gate próprio de account_type", () => {
    expectEligibility("grupos-comunicacao", ALL_CONTEXTS);
  });

  it("canais: aberto a todo perfil — preferências de canal são por usuário, sem gate de account_type", () => {
    expectEligibility("canais", ALL_CONTEXTS);
  });

  it("legacy: só Admin Master de verdade — consulta de dados sensíveis da plataforma anterior", () => {
    expectEligibility("legacy", [ADMIN_MASTER]);
  });

  it("novo-catalogo-admin (administração do catálogo): só Admin Master de verdade — cria/edita produto e preço", () => {
    expectEligibility("novo-catalogo-admin", [ADMIN_MASTER]);
  });

  it("catalogo-cliente-configurador: só quem compra (empresas/agencias) — nunca admin, líder ou nômade", () => {
    expectEligibility("catalogo-cliente-configurador", [EMPRESA, AGENCIA]);
  });

  it("cesta-checkout: só quem compra (empresas/agencias) — mesmo público do catálogo do cliente", () => {
    expectEligibility("cesta-checkout", [EMPRESA, AGENCIA]);
  });

  it("pedido-projeto-tarefas (projetos): compradores + admin (acompanha todo projeto) — nunca líder/nômade", () => {
    expectEligibility("pedido-projeto-tarefas", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("aditivos: mesmo público de projetos — Company/Agency solicitam, só Admin aprova (aprovação é um PASSO explicativo dentro do tour, nunca uma ação)", () => {
    expectEligibility("aditivos", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("memoria (leitura E edição): admin/empresas/agencias — líder e nômade nunca têm acesso a Memória", () => {
    expectEligibility("memoria", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("ia-lancamento: mesmo público de Memória (a IA usa o mesmo contexto)", () => {
    expectEligibility("ia-lancamento", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("plano-tatico: mesmo público de IA de Lançamento (etapa seguinte do mesmo fluxo)", () => {
    expectEligibility("plano-tatico", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("materializacao-execucao: mesmo público — a exceção administrativa é só um PASSO explicativo, nunca uma ação real disparável pelo tour", () => {
    expectEligibility("materializacao-execucao", [ADMIN_MASTER, ADMIN_NON_MASTER, EMPRESA, AGENCIA]);
  });

  it("memória nunca instrui uma ação de EDIÇÃO — todos os passos descrevem o que a seção É, nunca 'clique em Editar' (quem só pode consultar recebe o mesmo passo, sem instrução impossível)", () => {
    const tour = findTour("memoria")!;
    for (const step of tour.steps) {
      expect(step.description.toLowerCase()).not.toMatch(/clique em editar|edite agora/);
    }
  });
});
