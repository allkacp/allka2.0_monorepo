import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// 5. só Admin Master deve ter isAdminMaster=true — mesma regra oficial
// (canManageAlertsAdmin) usada pelo backend, nunca reformulada aqui.

const { api } = vi.hoisted(() => ({ api: { getCurrentUser: vi.fn() } }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

import { useIsAdminMaster } from "./use-is-admin-master";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useIsAdminMaster", () => {
  it("Admin Master → true", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true } });
    const { result } = renderHook(() => useIsAdminMaster());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("admin comum → false", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u2", account_type: "admin", admin_profile: { is_active: true, is_master: false } });
    const { result } = renderHook(() => useIsAdminMaster());
    await waitFor(() => expect(api.getCurrentUser).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("company/agency → false (nunca Admin Master)", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u3", account_type: "empresas" });
    const { result } = renderHook(() => useIsAdminMaster());
    await waitFor(() => expect(api.getCurrentUser).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("erro na chamada → false (nunca finge acesso)", async () => {
    api.getCurrentUser.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useIsAdminMaster());
    await waitFor(() => expect(api.getCurrentUser).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
