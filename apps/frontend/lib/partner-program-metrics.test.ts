import { describe, expect, it } from "vitest";
import { NO_DATA_VALUE, partnerProgramMetrics, partnerProgramWidgetData } from "@/lib/partner-program-metrics";

// 01/11 (teste do Codex): o topo do painel Partner mostrava 124 indicações / 38 clientes /
// Diamond (números de demonstração do código) e o widget abaixo 0 / Bronze (API real).
describe("Programa Partner — só dados reais da conta", () => {
  it("sem dados na API: zeros e Bronze no topo e no widget — nunca os números de demonstração", () => {
    const m = partnerProgramMetrics({ activePartners: 1 } as never);
    expect(m.invitesSent.value).toBe("0");
    expect(m.clientsConverted.value).toBe("0");
    expect(m.partnerLevel.value).toBe("Bronze");
    expect(JSON.stringify(m)).not.toMatch(/124|38|Diamond|22\.4k/);
    const w = partnerProgramWidgetData(undefined);
    expect(w).toEqual({ total: 0, invitesSent: 0, pending: 0, accepted: 0, diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0, mrrGenerated: 0 });
  });

  it("comissões a receber / pagas no mês não são inventadas a partir de outro número", () => {
    const m = partnerProgramMetrics({ mrrGenerated: 10000 });
    expect(m.commissionsGenerated.value).toBe("R$ 10.0k");
    expect(m.commissionsToReceive.value).toBe(NO_DATA_VALUE);
    expect(m.commissionPaidMonth.value).toBe(NO_DATA_VALUE);
  });

  it("valores reais da API passam direto; conversão = aceitos ÷ convites", () => {
    const m = partnerProgramMetrics({ invitesSent: 4, accepted: 1, total: 1, gold: 1 });
    expect(m.invitesSent.value).toBe("4");
    expect(m.clientsConverted.value).toBe("1");
    expect(m.conversionRate.value).toBe("25.0%");
    expect(m.partnerLevel.value).toBe("Gold");
  });
});
