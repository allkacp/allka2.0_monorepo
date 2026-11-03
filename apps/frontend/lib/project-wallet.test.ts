import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-client", () => ({ apiClient: { getWalletTopupSummary: vi.fn(), getWallets: vi.fn() } }));
import { apiClient } from "@/lib/api-client";
import { loadProjectWalletBalance } from "./project-wallet";

const api = apiClient as unknown as { getWalletTopupSummary: ReturnType<typeof vi.fn>; getWallets: ReturnType<typeof vi.fn> };
const AGENCY = "cmscc4i8500lw11fh3fa74uwq"; // agência do proj_956

describe("saldo da carteira em Formas de Pagamento (antes 0 fixo)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agência lê a própria carteira pela mesma fonte do topo (1.174,46 no proj_956)", async () => {
    api.getWalletTopupSummary.mockResolvedValue({ balance_brl: 1174.46 });
    expect(await loadProjectWalletBalance({ accountType: "agencias", ownerType: "agency", ownerId: AGENCY })).toBe(1174.46);
    expect(api.getWallets).not.toHaveBeenCalled();
  });

  it("admin lê a carteira do dono do projeto, como em Financeiro → Carteiras", async () => {
    api.getWallets.mockResolvedValue({ data: [{ owner_type: "agency", owner_id: AGENCY, balance: 1174.46 }] });
    expect(await loadProjectWalletBalance({ accountType: "admin", ownerType: "agency", ownerId: AGENCY })).toBe(1174.46);
    expect(api.getWallets).toHaveBeenCalledWith({ owner_type: "agency", owner_id: AGENCY, limit: 1 });
    expect(api.getWalletTopupSummary).not.toHaveBeenCalled();
  });

  it("sem fonte autorizada ou sem carteira: indisponível (null), nunca 0 inventado", async () => {
    expect(await loadProjectWalletBalance({ accountType: "nomades", ownerType: "agency", ownerId: AGENCY })).toBeNull();
    expect(await loadProjectWalletBalance({ accountType: "admin", ownerType: null, ownerId: null })).toBeNull();
    api.getWallets.mockResolvedValue({ data: [] });
    expect(await loadProjectWalletBalance({ accountType: "admin", ownerType: "company", ownerId: "c1" })).toBeNull();
    api.getWalletTopupSummary.mockResolvedValue({});
    expect(await loadProjectWalletBalance({ accountType: "empresas" })).toBeNull();
    expect(api.getWallets).toHaveBeenCalledTimes(1);
  });
});
