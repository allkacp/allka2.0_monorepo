"use client";

// Tela de Clientes do portal partner: a tela é compartilhada (components/portal-clientes-page.tsx); aqui só se diz de qual portal ela é.
import { PortalClientesPage } from "@/components/portal-clientes-page";

export default function PartnerClientesPage() {
  return <PortalClientesPage portal="partner" />;
}
