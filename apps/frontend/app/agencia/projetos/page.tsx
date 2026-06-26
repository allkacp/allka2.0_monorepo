// @ts-nocheck
"use client";

import { useLocation } from "react-router-dom";
import { PageLoader } from "@/components/ui/loading";
import { useAgencia } from "@/contexts/agencia-context";
import AdminProjetosPage from "@/app/admin/projetos/page";

export default function AgenciaProjetos() {
  const { profile, loading } = useAgencia();
  const location = useLocation();
  const initialSearch = (location.state as any)?.searchTerm ?? "";

  if (loading || !profile) {
    return <PageLoader text="Carregando projetos da agência…" />;
  }

  return <AdminProjetosPage scope="agency" agencyName={profile.name} initialSearch={initialSearch} />;
}
