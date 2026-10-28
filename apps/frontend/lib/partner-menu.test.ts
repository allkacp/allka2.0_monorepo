import { describe, expect, it } from "vitest";
import { agencyMayHaveInternalTasks, partnerAgencyExtraItems } from "./partner-menu";

describe("menu da agência Partner", () => {
  const parceiro = [
    { name: "Dashboard", href: "/partner/dashboard" },
    { name: "Clientes", href: "/partner/clientes" },
    { name: "Agências", href: "/partner/agencias" },
    { name: "Usuários", href: "/partner/usuarios" },
    { name: "Projetos", href: "/partner/projetos" },
    { name: "Comissões", href: "/partner/comissoes" },
    { name: "Saques", href: "/partner/saques" },
    { name: "Relatórios", href: "/partner/relatorios" },
  ];

  it("do menu de Partner só entram Comissões e Saques (Agências não)", () => {
    const names = partnerAgencyExtraItems(parceiro).map((i) => i.name);
    expect(names).toEqual(["Comissões", "Saques"]);
    expect(names).not.toContain("Agências");
  });

  it("Tarefas internas são da Allka: a agência Partner não tem", () => {
    expect(agencyMayHaveInternalTasks(true)).toBe(false);
    expect(agencyMayHaveInternalTasks(false)).toBe(true);
  });
});
