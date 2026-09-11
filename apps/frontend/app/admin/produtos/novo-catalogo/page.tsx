"use client";

import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

// Redirecionamento — 2026-09, consolidação "catálogo2 como cadastro
// definitivo": esta rota ("Preparação de Produtos") deixou de ser uma área
// separada. A administração do catalog2 agora vive em /admin/produtos
// ("Cadastro de Produtos"). Mantida só para não quebrar links diretos e
// tours antigos — preserva o produto selecionado via ?produto= quando
// presente.
export default function AdminNovoCatalogoRedirectPage() {
  const [searchParams] = useSearchParams();
  const produto = searchParams.get("produto");
  const target = produto ? `/admin/produtos?produto=${encodeURIComponent(produto)}` : "/admin/produtos";

  useEffect(() => {
    // Log discreto — nunca dado sensível — pra saber, no futuro, se algum
    // link antigo ainda aponta pra esta rota.
    // eslint-disable-next-line no-console
    console.info("[redirect] /admin/produtos/novo-catalogo → " + target);
  }, [target]);

  return <Navigate to={target} replace />;
}
