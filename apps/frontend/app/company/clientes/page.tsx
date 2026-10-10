"use client";

// Tela de Clientes do portal company: a tela é compartilhada (components/portal-clientes-page.tsx); aqui só se diz de qual portal ela é.
import { PortalClientesPage } from "@/components/portal-clientes-page";

export default function CompanyClientesPage() {
  return <PortalClientesPage portal="company" />;
}
