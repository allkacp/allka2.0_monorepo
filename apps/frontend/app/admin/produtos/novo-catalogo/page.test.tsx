import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
import AdminNovoCatalogoRedirectPage from "@/app/admin/produtos/novo-catalogo/page";

// 2026-09 (consolidação catalog2): /admin/produtos/novo-catalogo virou um
// redirecionamento puro pra /admin/produtos — sem tela própria.

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/produtos/novo-catalogo" element={<AdminNovoCatalogoRedirectPage />} />
        <Route path="/admin/produtos" element={<div>Cadastro de Produtos (destino)</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("redirecionamento de /admin/produtos/novo-catalogo", () => {
  it("sem produto selecionado: redireciona pra /admin/produtos", async () => {
    renderAt("/admin/produtos/novo-catalogo");
    expect(await screen.findByText("Cadastro de Produtos (destino)")).toBeInTheDocument();
  });

  it("com ?produto=: preserva o produto selecionado no destino", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/produtos/novo-catalogo?produto=abc123"]}>
        <Routes>
          <Route path="/admin/produtos/novo-catalogo" element={<AdminNovoCatalogoRedirectPage />} />
          <Route
            path="/admin/produtos"
            element={<DestinoComQuery />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("produto=abc123")).toBeInTheDocument();
  });
});

function DestinoComQuery() {
  const [params] = useSearchParams();
  return <div>{params.toString()}</div>;
}
