import { describe, expect, it } from "vitest";
import { hasAdminModulePermission, canOpenRoadmapPanel } from "./admin-permissions";

describe("hasAdminModulePermission", () => {
  it("libera quando não há perfil atribuído (comportamento legado)", () => {
    expect(hasAdminModulePermission(undefined, "central_chamados", "view")).toBe(true);
    expect(hasAdminModulePermission(null, "central_chamados", "view")).toBe(true);
  });

  it("libera quando o perfil está inativo", () => {
    expect(hasAdminModulePermission({ is_active: false }, "sistema", "view")).toBe(true);
  });

  it("libera tudo quando is_master", () => {
    expect(hasAdminModulePermission({ is_active: true, is_master: true, permissions: [] }, "sistema", "view")).toBe(true);
  });

  it("bloqueia quando o perfil não tem o par (module, action)", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] };
    expect(hasAdminModulePermission(profile, "central_chamados", "view")).toBe(false);
  });

  it("libera quando o perfil tem exatamente o par (module, action)", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] };
    expect(hasAdminModulePermission(profile, "central_chamados", "view")).toBe(true);
  });

  it("não confunde módulos parecidos nem ações diferentes do mesmo módulo", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "edit" }] };
    expect(hasAdminModulePermission(profile, "central_chamados", "view")).toBe(false);
    expect(hasAdminModulePermission(profile, "sistema", "edit")).toBe(false);
  });
});

describe("canOpenRoadmapPanel", () => {
  it("admin sem perfil vê (grandfather legado do módulo sistema, só pra admin)", () => {
    expect(canOpenRoadmapPanel("admin", undefined)).toBe(true);
    expect(canOpenRoadmapPanel("admin", null)).toBe(true);
  });

  it("admin com perfil inativo vê (mesmo grandfather)", () => {
    expect(canOpenRoadmapPanel("admin", { is_active: false })).toBe(true);
  });

  it("admin com is_master vê", () => {
    expect(canOpenRoadmapPanel("admin", { is_active: true, is_master: true, permissions: [] })).toBe(true);
  });

  it("admin com perfil granular SEM sistema nem central_chamados NÃO vê", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] };
    expect(canOpenRoadmapPanel("admin", profile)).toBe(false);
  });

  it("admin com sistema.view vê", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "sistema", action: "view" }] };
    expect(canOpenRoadmapPanel("admin", profile)).toBe(true);
  });

  it("admin com central_chamados.view vê (sem precisar de sistema)", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] };
    expect(canOpenRoadmapPanel("admin", profile)).toBe(true);
  });

  // O ponto central da correção: fora de account_type "admin", NUNCA existe
  // grandfather — nem pra "sistema", nem por falta de perfil. Sem isso,
  // qualquer empresa/agência/nômade sem perfil (a imensa maioria da base)
  // veria o item por engano.
  it("usuário comum (empresas) SEM perfil NÃO vê — sem grandfather fora de admin", () => {
    expect(canOpenRoadmapPanel("empresas", undefined)).toBe(false);
    expect(canOpenRoadmapPanel("empresas", null)).toBe(false);
  });

  it("usuário comum (agencias) com perfil mas sem central_chamados NÃO vê", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "sistema", action: "view" }] };
    expect(canOpenRoadmapPanel("agencias", profile)).toBe(false);
  });

  it("desenvolvedor não-admin (account_type != admin) COM central_chamados.view VÊ", () => {
    const profile = { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] };
    expect(canOpenRoadmapPanel("empresas", profile)).toBe(true);
    expect(canOpenRoadmapPanel("agencias", profile)).toBe(true);
    expect(canOpenRoadmapPanel("nomades", profile)).toBe(true);
  });

  it("usuário comum com perfil inativo NÃO vê mesmo tendo a permissão cadastrada", () => {
    const profile = { is_active: false, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] };
    expect(canOpenRoadmapPanel("empresas", profile)).toBe(false);
  });

  it("is_master fora de admin ainda libera (flag de super-perfil, não depende de account_type)", () => {
    expect(canOpenRoadmapPanel("agencias", { is_active: true, is_master: true, permissions: [] })).toBe(true);
  });
});
