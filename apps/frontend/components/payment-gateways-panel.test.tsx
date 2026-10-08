import { describe, it, expect } from "vitest";
import { gatewayStatusText } from "./payment-gateways-panel";

describe("Pagamentos: texto de estado do gateway", () => {
  it("não escrito / sem chaves / sem teste / pronto / ativo", () => {
    expect(gatewayStatusText({ implemented: false, configured: false, is_active: false, last_test: null, proven: false })).toMatch(/ainda não escrito/);
    expect(gatewayStatusText({ implemented: true, configured: false, is_active: false, last_test: null, proven: false })).toMatch(/não cadastradas/);
    expect(gatewayStatusText({ implemented: true, configured: true, is_active: false, last_test: null, proven: false })).toMatch(/falta testar/);
    expect(gatewayStatusText({ implemented: true, configured: true, is_active: false, last_test: { at: "", ok: true, message: "ok" }, proven: false })).toBe("Pronto para ativar");
    expect(gatewayStatusText({ implemented: true, configured: true, is_active: true, last_test: { at: "", ok: true, message: "" }, proven: false })).toMatch(/Ativo \(ainda não comprovado/);
  });
});
