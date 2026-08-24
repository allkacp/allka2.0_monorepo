import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  readSessionUserId,
  getUserScopedStorageKey,
  getCurrentUserScopedStorageKey,
} from "@/lib/dashboard-storage-scope";
import { DASHBOARD_STORAGE_KEY, CURRENT_DASHBOARD_KEY } from "@/lib/dashboard-presets-by-role";

// Lote 5 (ata 2026-08-24) — antes, DASHBOARD_STORAGE_KEY["COMPANY"] era uma
// string fixa ("saved-dashboards-company"): duas contas de empresa
// diferentes, no mesmo navegador, liam e escreviam o MESMO dashboard
// salvo. Este arquivo cobre a base do isolamento por usuário: a chave
// derivada, a proteção contra identidade ausente/vazia, e que a chave
// antiga nunca é lida/escrita/apagada pelo caminho novo.

function setSessionUser(user: Record<string, unknown> | null) {
  if (user === null) {
    window.localStorage.removeItem("allka_user");
  } else {
    window.localStorage.setItem("allka_user", JSON.stringify(user));
  }
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("readSessionUserId", () => {
  it("1. lê o id interno (estável) do usuário em sessão", () => {
    setSessionUser({ id: "usr-123", email: "a@example.com", role: "company_admin" });
    expect(readSessionUserId()).toBe("usr-123");
  });

  it("9. sem sessão (identidade ausente), retorna null — não lê dado de terceiro", () => {
    expect(readSessionUserId()).toBeNull();
  });

  it("id numérico é normalizado pra string", () => {
    setSessionUser({ id: 42 });
    expect(readSessionUserId()).toBe("42");
  });

  it("id ausente, vazio ou só espaço nunca vira uma identidade válida", () => {
    setSessionUser({ id: "" });
    expect(readSessionUserId()).toBeNull();
    setSessionUser({ id: "   " });
    expect(readSessionUserId()).toBeNull();
    setSessionUser({ name: "sem id" });
    expect(readSessionUserId()).toBeNull();
  });

  it("JSON inválido em allka_user não derruba a leitura — retorna null", () => {
    window.localStorage.setItem("allka_user", "{not json");
    expect(readSessionUserId()).toBeNull();
  });
});

describe("getUserScopedStorageKey", () => {
  it("2. a chave nunca contém e-mail ou token, só o id opaco", () => {
    const key = getUserScopedStorageKey("saved-dashboards-company", "usr-123");
    expect(key).toContain("usr-123");
    expect(key).not.toMatch(/@/);
    expect(key).not.toMatch(/token/i);
  });

  it("identidade null/undefined/vazia cai num balde 'anonymous', nunca gera 'undefined'/'null'/vazio na chave", () => {
    expect(getUserScopedStorageKey("base", null)).not.toMatch(/undefined|null/);
    expect(getUserScopedStorageKey("base", undefined)).not.toMatch(/undefined|null/);
    expect(getUserScopedStorageKey("base", "")).not.toMatch(/undefined|null/);
    expect(getUserScopedStorageKey("base", "   ")).not.toMatch(/undefined|null/);
    expect(getUserScopedStorageKey("base", null)).toContain("anonymous");
  });

  it("6. portais diferentes com o mesmo usuário continuam em chaves diferentes (a base já os distinguia)", () => {
    const companyKey = getUserScopedStorageKey("saved-dashboards-company", "usr-1");
    const agencyKey = getUserScopedStorageKey("saved-dashboards-agency", "usr-1");
    expect(companyKey).not.toBe(agencyKey);
  });

  it("13. a chave nova nunca é igual à chave antiga (só-portal) — não vira fallback compartilhado por acidente", () => {
    const oldKey = "saved-dashboards-company";
    const newKey = getUserScopedStorageKey(oldKey, "usr-1");
    expect(newKey).not.toBe(oldKey);
  });
});

describe("getCurrentUserScopedStorageKey — leitura ao vivo da sessão", () => {
  it("3/5. usuário A salva, sai, volta — a mesma chave é derivada de novo pro mesmo id", () => {
    setSessionUser({ id: "user-a" });
    const keyFirstVisit = getCurrentUserScopedStorageKey("saved-dashboards-company");
    setSessionUser(null); // logout
    setSessionUser({ id: "user-a" }); // login de novo, mesmo usuário
    const keyReturn = getCurrentUserScopedStorageKey("saved-dashboards-company");
    expect(keyReturn).toBe(keyFirstVisit);
  });

  it("4. usuário B (mesmo portal) deriva uma chave diferente da de A — não herda a personalização de A", () => {
    setSessionUser({ id: "user-a" });
    const keyA = getCurrentUserScopedStorageKey("saved-dashboards-company");
    setSessionUser({ id: "user-b" });
    const keyB = getCurrentUserScopedStorageKey("saved-dashboards-company");
    expect(keyA).not.toBe(keyB);
  });

  it("7. logout (sessão limpa) deriva a chave 'anonymous', nunca a de um usuário real anterior", () => {
    setSessionUser({ id: "user-a" });
    const keyA = getCurrentUserScopedStorageKey("saved-dashboards-company");
    setSessionUser(null);
    const keyAfterLogout = getCurrentUserScopedStorageKey("saved-dashboards-company");
    expect(keyAfterLogout).not.toBe(keyA);
    expect(keyAfterLogout).toContain("anonymous");
  });

  it("8. troca rápida de conta: cada gravação, feita na hora certa, vai pra chave do usuário certo — sem misturar", () => {
    setSessionUser({ id: "user-a" });
    const keyA = getCurrentUserScopedStorageKey("saved-dashboards-company");
    window.localStorage.setItem(keyA, JSON.stringify({ owner: "a" }));

    setSessionUser({ id: "user-b" });
    const keyB = getCurrentUserScopedStorageKey("saved-dashboards-company");
    window.localStorage.setItem(keyB, JSON.stringify({ owner: "b" }));

    expect(JSON.parse(window.localStorage.getItem(keyA)!)).toEqual({ owner: "a" });
    expect(JSON.parse(window.localStorage.getItem(keyB)!)).toEqual({ owner: "b" });
    expect(keyA).not.toBe(keyB);
  });
});

describe("DASHBOARD_STORAGE_KEY / CURRENT_DASHBOARD_KEY — getters escopados por sessão", () => {
  it("cada acesso relê a sessão atual (getter vivo, não um valor fixo capturado)", () => {
    setSessionUser({ id: "user-a" });
    const forA = DASHBOARD_STORAGE_KEY.COMPANY;
    setSessionUser({ id: "user-b" });
    const forB = DASHBOARD_STORAGE_KEY.COMPANY;
    expect(forA).not.toBe(forB);
  });

  it("10. duas contas escrevendo sob o mesmo papel (COMPANY) nunca colidem na mesma chave", () => {
    setSessionUser({ id: "user-a" });
    const keyA = DASHBOARD_STORAGE_KEY.COMPANY;
    setSessionUser({ id: "user-b" });
    const keyB = DASHBOARD_STORAGE_KEY.COMPANY;
    expect(keyA).not.toBe(keyB);

    const currentKeyA = (() => {
      setSessionUser({ id: "user-a" });
      return CURRENT_DASHBOARD_KEY.COMPANY;
    })();
    setSessionUser({ id: "user-b" });
    const currentKeyB = CURRENT_DASHBOARD_KEY.COMPANY;
    expect(currentKeyA).not.toBe(currentKeyB);
  });

  it("13/14. a chave antiga só-portal continua existindo, intocada — nunca é lida nem apagada por este caminho", () => {
    const oldKey = "saved-dashboards-company";
    window.localStorage.setItem(oldKey, JSON.stringify({ legacy: true }));
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

    setSessionUser({ id: "user-a" });
    const scopedKey = DASHBOARD_STORAGE_KEY.COMPANY;
    window.localStorage.setItem(scopedKey, JSON.stringify({ owner: "a" }));

    // A chave antiga continua lá, com o conteúdo original, nunca tocada.
    expect(window.localStorage.getItem(oldKey)).toBe(JSON.stringify({ legacy: true }));
    expect(removeSpy).not.toHaveBeenCalledWith(oldKey);
    removeSpy.mockRestore();
  });

  it("todas as 5 roles do mapa produzem chaves distintas entre si pro mesmo usuário", () => {
    setSessionUser({ id: "user-a" });
    const keys = new Set([
      DASHBOARD_STORAGE_KEY.AGENCY,
      DASHBOARD_STORAGE_KEY.NOMAD,
      DASHBOARD_STORAGE_KEY.COMPANY,
      DASHBOARD_STORAGE_KEY.PARTNER,
      DASHBOARD_STORAGE_KEY.LEADER,
    ]);
    expect(keys.size).toBe(5);
  });
});
