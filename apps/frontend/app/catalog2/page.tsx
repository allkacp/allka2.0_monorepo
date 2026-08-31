"use client";

// Página do novo catálogo do CLIENTE (sprint de produtos, bloco 5/6).
// Um único componente compartilhado (Catalog2Store) reusado pelos portais
// elegíveis via wrappers finos. A permissão real é do backend.

import { Catalog2Store } from "@/components/catalog2/catalog2-store";

export function Catalog2AdminPreviewPage() {
  return <Catalog2Store portal="admin" />;
}
export function Catalog2CompanyPage() {
  return <Catalog2Store portal="company" />;
}
export function Catalog2AgencyPage() {
  return <Catalog2Store portal="agency" />;
}

export default Catalog2CompanyPage;
