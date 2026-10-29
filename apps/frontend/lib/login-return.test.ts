import { describe, expect, it } from "vitest";
import { loginUrlFor, safeLoginReturnTo } from "./login-return";

describe("retorno seguro após login", () => {
  it.each([
    ["/admin/cadastro-produtos/2", "/login"], ["/nomad/tarefas/1", "/nomad/login"],
    ["/nomades/tarefas/1", "/nomad/login"], ["/agency/projetos/1", "/agency/login"],
    ["/partner/tarefas/2", "/agency/login"], ["/company/projetos/3", "/company/login"],
    ["/empresa/projetos/3", "/company/login"], ["/leader/tarefas/7", "/leader/login"],
    ["/lider/tarefas/7", "/leader/login"],
  ])("preserva o link e escolhe login do portal %s", (pathname, login) => {
    const url = loginUrlFor({ pathname, search: "?aba=etapas&busca=nome%20completo", hash: "#etapa-2" });
    expect(url.split("?")[0]).toBe(login);
    expect(new URLSearchParams(url.slice(url.indexOf("?"))).get("returnTo")).toBe(`${pathname}?aba=etapas&busca=nome%20completo#etapa-2`);
  });
  it.each([null, "", "/", "https://example.com", "//example.com/x", "/\\example.com/x", "/%2fexample.com/x", "/%5cexample.com/x", "/admin/%0d%0afoo", "/login", "/agency/login?returnTo=/admin", "/admin/../login", "/%6cogin", "/primeiro-acesso/token", "javascript:alert(1)", "/%XX"])("recusa retorno externo, inválido ou com loop: %s", (target) => {
    expect(safeLoginReturnTo(target)).toBeNull();
  });
  it("login direto não cria um retorno para si mesmo", () => {
    expect(loginUrlFor({ pathname: "/agency/login", search: "?returnTo=/agency/tarefas" })).toBe("/agency/login");
  });
});
