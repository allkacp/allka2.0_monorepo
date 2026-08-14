import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAnyPermission, evaluateRoadmapSsoAccess } from "./auth";

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

describe("evaluateRoadmapSsoAccess", () => {
  it("admin sem perfil vê (grandfather legado do módulo sistema, só pra admin)", () => {
    assert.equal(evaluateRoadmapSsoAccess("admin", undefined), true);
    assert.equal(evaluateRoadmapSsoAccess("admin", null), true);
  });

  it("admin com perfil inativo ou is_master vê (mesmo grandfather)", () => {
    assert.equal(evaluateRoadmapSsoAccess("admin", { is_master: false, is_active: false, permissions: [] }), true);
    assert.equal(evaluateRoadmapSsoAccess("admin", { is_master: true, is_active: true, permissions: [] }), true);
  });

  it("admin com perfil granular sem sistema nem central_chamados NÃO vê", () => {
    assert.equal(evaluateRoadmapSsoAccess("admin", financeiroOnly), false);
  });

  it("admin com sistema.view OU central_chamados.view vê", () => {
    assert.equal(evaluateRoadmapSsoAccess("admin", sistemaViewOnly), true);
    assert.equal(evaluateRoadmapSsoAccess("admin", centralChamadosViewOnly), true);
  });

  // Núcleo da correção: fora de account_type "admin" nunca existe
  // grandfather — nem por falta de perfil, nem via módulo "sistema". Sem
  // isso, qualquer conta empresas/agencias/nomades sem perfil (a maioria
  // da base) passaria pelo requireAnyPermission original por engano.
  it("account_type não-admin SEM perfil NÃO vê — sem grandfather fora de admin", () => {
    assert.equal(evaluateRoadmapSsoAccess("empresas", undefined), false);
    assert.equal(evaluateRoadmapSsoAccess("agencias", null), false);
  });

  it("account_type não-admin com sistema.view (sem central_chamados) NÃO vê — sistema não vale fora de admin", () => {
    assert.equal(evaluateRoadmapSsoAccess("empresas", sistemaViewOnly), false);
  });

  it("desenvolvedor/QA não-admin com central_chamados.view VÊ, em qualquer account_type", () => {
    assert.equal(evaluateRoadmapSsoAccess("empresas", centralChamadosViewOnly), true);
    assert.equal(evaluateRoadmapSsoAccess("agencias", centralChamadosViewOnly), true);
    assert.equal(evaluateRoadmapSsoAccess("nomades", centralChamadosViewOnly), true);
    assert.equal(evaluateRoadmapSsoAccess("lider", centralChamadosViewOnly), true);
  });

  it("perfil inativo bloqueia mesmo com central_chamados cadastrado, fora de admin", () => {
    const profile = { is_master: false, is_active: false, permissions: [{ module: "central_chamados", action: "view" }] };
    assert.equal(evaluateRoadmapSsoAccess("empresas", profile), false);
  });

  it("is_master fora de admin ainda libera (flag de super-perfil, não depende de account_type)", () => {
    assert.equal(evaluateRoadmapSsoAccess("agencias", { is_master: true, is_active: true, permissions: [] }), true);
  });
});
