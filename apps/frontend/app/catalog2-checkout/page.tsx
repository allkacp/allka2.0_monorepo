"use client";

// Checkout do novo catálogo (sprint de produtos, bloco 6/6). Componente
// único compartilhado (Catalog2Checkout) reusado pelos portais elegíveis —
// admin nunca contrata, então não há wrapper admin aqui.

import { Catalog2Checkout } from "@/components/catalog2/catalog2-checkout";

export function Catalog2CheckoutCompanyPage() {
  return <Catalog2Checkout portal="company" />;
}
export function Catalog2CheckoutAgencyPage() {
  return <Catalog2Checkout portal="agency" />;
}

export default Catalog2CheckoutCompanyPage;
