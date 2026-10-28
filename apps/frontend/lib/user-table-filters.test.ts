import { describe, expect, it } from "vitest";
import { matchesUserAccess, userStatusOption, userTypeOption } from "./user-table-filters";
describe("Filtros de usuários usam os badges reais", () => {
  it.each(["empresas", "empresa", "company"])("normaliza %s para Empresa", account_type => expect(userTypeOption({ account_type }).value).toBe("company"));
  it.each(["agencias", "agencia", "agency"])("normaliza %s para Agência", account_type => expect(userTypeOption({ account_type }).value).toBe("agency"));
  it("Partner é upgrade da Agência, não depende de account_type legado", () => {
    expect(userTypeOption({ account_type: "agencias", partner_status: "ativo" }).value).toBe("partner");
    expect(userTypeOption({ account_type: "agencias", partner_status: "inativo" }).value).toBe("agency");
  });
  it("líder não fica disfarçado de Agência no filtro", () => expect(userTypeOption({ account_type: "agencias", role: "lider" }).value).toBe("leader"));
  it("suspenso, pausado, bloqueado e ativo são distintos", () => {
    expect(userStatusOption({ is_active: false, status: "suspenso", auto_paused: true }).label).toBe("Suspenso");
    expect(userStatusOption({ is_active: true, auto_paused: true }).label).toBe("Pausado");
    expect(userStatusOption({ is_active: false }).label).toBe("Bloqueado");
    expect(userStatusOption({ is_active: false, status: "inativo", auto_paused: true }).label).toBe("Bloqueado");
    expect(userStatusOption({ is_active: true }).label).toBe("Ativo");
  });
});
describe("Último acesso real", () => {
  const now = new Date("2026-10-27T12:00:00");
  it("nunca acessou não é tratado como cadastrado hoje", () => {
    expect(matchesUserAccess(null, "never", "", "", now)).toBe(true);
    expect(matchesUserAccess(null, "90days", "", "", now)).toBe(false);
    expect(matchesUserAccess(null, "custom", "2026-10-01", "2026-10-27", now)).toBe(false);
  });
  it("faixas são inclusivas, não buckets exclusivos", () => {
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    for (const preset of ["7days", "30days", "90days"] as const) expect(matchesUserAccess(yesterday, preset, "", "", now)).toBe(true);
    expect(matchesUserAccess(new Date(now.getTime() - 91 * 86400000).toISOString(), "90days", "", "", now)).toBe(false);
  });
  it("data final inclui o dia inteiro e exclui o seguinte", () => {
    expect(matchesUserAccess("2026-10-27T23:59:59", "custom", "2026-10-01", "2026-10-27", now)).toBe(true);
    expect(matchesUserAccess("2026-10-28T00:00:00", "custom", "2026-10-01", "2026-10-27", now)).toBe(false);
  });
  it("intervalo invertido ou acesso inválido não produz resultado falso", () => {
    expect(matchesUserAccess("2026-10-20", "custom", "2026-10-27", "2026-10-01", now)).toBe(false);
    expect(matchesUserAccess("invalid", "today", "", "", now)).toBe(false);
  });
  it("datas explícitas de filtros avançados prevalecem sobre um atalho anterior", () => {
    expect(matchesUserAccess("2026-10-20T10:00:00", "today", "2026-10-01", "2026-10-20", now)).toBe(true);
    expect(matchesUserAccess("2026-10-27T10:00:00", "today", "2026-10-01", "2026-10-20", now)).toBe(false);
  });
  it("sem filtro inclui quem nunca acessou; hoje respeita início do dia", () => {
    expect(matchesUserAccess(null, "all", "", "", now)).toBe(true);
    expect(matchesUserAccess("2026-10-27T00:00:00", "today", "", "", now)).toBe(true);
    expect(matchesUserAccess("2026-10-26T23:59:59", "today", "", "", now)).toBe(false);
  });
});
