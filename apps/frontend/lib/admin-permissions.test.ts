import { describe, expect, it } from "vitest";
import { hasAdminModulePermission } from "./admin-permissions";

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
