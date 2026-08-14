import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAnyPermission } from "./auth";

const sistemaViewOnly = {
  is_master: false,
  is_active: true,
  permissions: [{ module: "sistema", action: "view" }],
};
const centralChamadosViewOnly = {
  is_master: false,
  is_active: true,
  permissions: [{ module: "central_chamados", action: "view" }],
};
const financeiroOnly = {
  is_master: false,
  is_active: true,
  permissions: [{ module: "financeiro", action: "view" }],
};

const ROADMAP_SSO_CHECKS: Array<[string, "view"]> = [
  ["sistema", "view"],
  ["central_chamados", "view"],
];

describe("evaluateAnyPermission", () => {
  it("libera quando não há perfil atribuído (comportamento legado)", () => {
    assert.equal(evaluateAnyPermission(undefined, ROADMAP_SSO_CHECKS), true);
    assert.equal(evaluateAnyPermission(null, ROADMAP_SSO_CHECKS), true);
  });

  it("libera quando o perfil está inativo", () => {
    assert.equal(
      evaluateAnyPermission({ is_master: false, is_active: false, permissions: [] }, ROADMAP_SSO_CHECKS),
      true,
    );
  });

  it("libera tudo quando is_master", () => {
    assert.equal(
      evaluateAnyPermission({ is_master: true, is_active: true, permissions: [] }, ROADMAP_SSO_CHECKS),
      true,
    );
  });

  it("libera com QUALQUER um dos módulos verificados — sistema.view sozinho basta", () => {
    assert.equal(evaluateAnyPermission(sistemaViewOnly, ROADMAP_SSO_CHECKS), true);
  });

  it("libera com QUALQUER um dos módulos verificados — central_chamados.view sozinho basta", () => {
    assert.equal(evaluateAnyPermission(centralChamadosViewOnly, ROADMAP_SSO_CHECKS), true);
  });

  it("bloqueia quando o perfil não tem nenhum dos módulos verificados", () => {
    assert.equal(evaluateAnyPermission(financeiroOnly, ROADMAP_SSO_CHECKS), false);
  });

  it("bloqueia quando o perfil tem o módulo mas não a ação certa", () => {
    const profile = { is_master: false, is_active: true, permissions: [{ module: "sistema", action: "edit" }] };
    assert.equal(evaluateAnyPermission(profile, ROADMAP_SSO_CHECKS), false);
  });
});
