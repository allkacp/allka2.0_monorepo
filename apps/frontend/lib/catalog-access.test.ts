import { describe, expect, it } from "vitest";
import { isCatalogRoute } from "@/lib/catalog-access";

// Fechamento do bloco 1 (ata 2026-08): a cesta de projeto pertence ao
// ambiente de catálogo/loja e NÃO é um componente global. `isCatalogRoute`
// é a decisão ÚNICA e testável reusada por Header, drawer mobile/desktop e
// pelo listener da bandeja — nada de regex espalhada por componente.
//
// A regra vale mesmo quando existem itens salvos: estar dentro da rota é o
// que decide, não `basket.items.length`.
describe("isCatalogRoute", () => {
  it("aceita os catálogos de COMPRA de cada portal (os que usam useProjectBasket)", () => {
    for (const path of [
      "/admin/catalogo-produtos",
      "/company/produtos",
      "/agency/catalogo",
      "/agencia/catalogo",
      "/leader/catalogo",
      "/lider/catalogo",
    ]) {
      expect(isCatalogRoute(path), path).toBe(true);
    }
  });

  it("aceita a página de detalhe do produto dentro do catálogo (`/:produtoId`)", () => {
    for (const path of [
      "/admin/catalogo-produtos/prod-123",
      "/company/produtos/abc",
      "/agency/catalogo/xpto",
      "/agencia/catalogo/xpto",
      "/leader/catalogo/9",
    ]) {
      expect(isCatalogRoute(path), path).toBe(true);
    }
  });

  it("tolera barra final e query/hash", () => {
    expect(isCatalogRoute("/admin/catalogo-produtos/")).toBe(true);
    expect(isCatalogRoute("/company/produtos?busca=logo")).toBe(true);
    expect(isCatalogRoute("/company/produtos/abc?tab=info#preco")).toBe(true);
    expect(isCatalogRoute("/agency/catalogo#topo")).toBe(true);
  });

  it("recusa telas administrativas/de gestão que NÃO são loja", () => {
    for (const path of [
      "/admin/dashboard",
      "/admin/financeiro",
      "/admin/perfil",
      "/admin/usuarios",
      "/admin/empresas",
      "/admin/relatorios",
      "/admin/tarefas",
      "/admin/projetos",
      "/admin/projetos/123",
      "/company/dashboard",
      "/company/projetos",
      "/agency/dashboard",
      "/nomades/tarefasdisponiveis",
      "/perfil",
      "/",
    ]) {
      expect(isCatalogRoute(path), path).toBe(false);
    }
  });

  it("recusa a GESTÃO de produtos (`/admin/produtos`) — não é catálogo de compra e não usa cesta", () => {
    expect(isCatalogRoute("/admin/produtos")).toBe(false);
    expect(isCatalogRoute("/admin/produtos/novo")).toBe(false);
  });

  it("recusa combos (têm rota própria e não usam a cesta de projeto)", () => {
    expect(isCatalogRoute("/admin/combos")).toBe(false);
    expect(isCatalogRoute("/agency/combos")).toBe(false);
  });

  it("não casa por prefixo amplo — subrotas administrativas profundas do catálogo não contam", () => {
    // duas ou mais subrotas depois do catálogo não são "detalhe do produto"
    expect(isCatalogRoute("/admin/catalogo-produtos/prod-1/editar")).toBe(false);
    expect(isCatalogRoute("/company/produtos/abc/tarefas/9")).toBe(false);
  });

  it("não casa rotas de outra área que apenas começam igual", () => {
    expect(isCatalogRoute("/admin/catalogo-produtos-relatorio")).toBe(false);
    expect(isCatalogRoute("/company/produtos-export")).toBe(false);
  });
});
