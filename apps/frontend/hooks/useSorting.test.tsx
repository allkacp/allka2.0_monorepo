import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSorting, type SortDirection } from "./useSorting";

const fields = ["user_code", "name", "account_type", "is_active", "inactivity_bucket", "user_type_label", "user_status_label", "last_login"];
const options = { storageKey: "test-users-sort", allowedKeys: fields };
beforeEach(() => localStorage.removeItem(options.storageKey));
afterEach(() => vi.restoreAllMocks());
describe("Ordenação persistida opt-in", () => {
  for (const field of fields) for (const dir of ["asc", "desc"] as SortDirection[]) {
    it(`restaura ${field} ${dir} ao remontar (F5/retorno à tela)`, () => {
      const first = renderHook(() => useSorting(options));
      act(() => first.result.current.handleSort(field, dir));
      first.unmount();
      const second = renderHook(() => useSorting(options));
      expect(second.result.current.sortKey).toBe(field); expect(second.result.current.sortDir).toBe(dir);
    });
  }
  it("ID continua numérico: 1, 2, 10, e não 1, 10, 2", () => {
    localStorage.setItem(options.storageKey, JSON.stringify({ key: "user_code", dir: "asc" }));
    const { result } = renderHook(() => useSorting(options));
    expect(result.current.sortData([{ user_code: "user_10" }, { user_code: "user_2" }, { user_code: "user_1" }]).map(r => r.user_code)).toEqual(["user_1", "user_2", "user_10"]);
  });
  it("não mistura preferências de usuários diferentes", () => {
    const first = renderHook(() => useSorting({ ...options, storageKey: "test-users-sort-account-a" }));
    act(() => first.result.current.handleSort("name", "desc")); first.unmount();
    const second = renderHook(() => useSorting({ ...options, storageKey: "test-users-sort-account-b" }));
    expect(second.result.current.sortKey).toBeNull(); second.unmount();
    const restored = renderHook(() => useSorting({ ...options, storageKey: "test-users-sort-account-a" }));
    expect(restored.result.current.sortKey).toBe("name"); expect(restored.result.current.sortDir).toBe("desc");
    localStorage.removeItem("test-users-sort-account-a"); localStorage.removeItem("test-users-sort-account-b");
  });
  for (const bad of ["{broken", JSON.stringify({ key: "unknown", dir: "asc" }), JSON.stringify({ key: "name", dir: "invalid" })]) {
    it(`ignora preferência inválida ${bad}`, () => {
      localStorage.setItem(options.storageKey, bad);
      const { result } = renderHook(() => useSorting(options));
      expect(result.current.sortKey).toBeNull(); expect(result.current.sortDir).toBe("asc");
    });
  }
  it("armazenamento bloqueado não impede ordenar", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new Error("full"); });
    const { result } = renderHook(() => useSorting(options));
    act(() => result.current.handleSort("name", "asc")); expect(result.current.sortKey).toBe("name");
  });
  it("telas sem opt-in continuam sem persistência", () => {
    const first = renderHook(() => useSorting()); act(() => first.result.current.handleSort("name", "desc")); first.unmount();
    const second = renderHook(() => useSorting()); expect(second.result.current.sortKey).toBeNull(); expect(second.result.current.sortDir).toBe("asc");
  });
});
