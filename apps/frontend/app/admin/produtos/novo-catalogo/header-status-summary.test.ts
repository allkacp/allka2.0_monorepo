import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: () => vi.fn(async () => ({ data: [] })) }) }));
import { headerStatusSummary } from "./product-editor";

// Item 2 (31/10): no Produto teste o cabeçalho mostra UM status principal; os demais dados ficam nos detalhes.
// É só apresentação: status comercial e estado da versão continuam separados.
const product = (over: any = {}) => ({ status: "em_preparacao", header: { published: false, activated: false, awaiting_activation: false }, ...over });

describe("headerStatusSummary", () => {
  it("rascunho aberto: principal é 'Rascunho vN'; detalhes trazem status comercial, versão, publicação e catálogo", () => {
    const s = headerStatusSummary(product(), { version_number: 2, state: "rascunho" }, true, false);
    expect(s.main.label).toBe("Rascunho v2");
    const d = Object.fromEntries(s.details.map((x) => [x.k, x.v]));
    expect(d["Versão aberta"]).toBe("v2 · rascunho (editável)");
    expect(d["Publicação"]).toBe("nenhuma versão publicada ainda");
    expect(d["No catálogo"]).toBe("não ativo");
    expect(d["Status do produto"]).not.toBe("");
  });

  it("publicada vigente e ativa: principal é o status comercial; detalhes dizem publicada/ativa", () => {
    const s = headerStatusSummary(product({ status: "disponivel", header: { published: true, published_version_number: 1, activated: true } }), { version_number: 1, state: "publicada", is_published_current: true }, false, false);
    expect(s.main.label).toBe(s.details[0].v);
    const d = Object.fromEntries(s.details.map((x) => [x.k, x.v]));
    expect(d["Versão aberta"]).toBe("v1 · publicada (somente leitura)");
    expect(d["Publicação"]).toContain("v1 publicada");
    expect(d["No catálogo"]).toContain("ativo");
  });

  it("publicada aguardando ativação e versão antiga são estados distintos, não fundidos", () => {
    const awaiting = headerStatusSummary(product({ header: { published: true, published_version_number: 1, awaiting_activation: true } }), { version_number: 1, state: "publicada" }, false, false);
    expect(Object.fromEntries(awaiting.details.map((x) => [x.k, x.v]))["No catálogo"]).toBe("publicado, aguardando ativação");
    const old = headerStatusSummary(product({ status: "disponivel" }), { version_number: 1, state: "publicada" }, false, true);
    expect(old.main.label).toBe("Versão antiga v1");
  });
});
