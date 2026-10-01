"use client";

// Central de Conexões e acessos necessários — uma página por perfil, o mesmo componente.
import { Navigate, useLocation } from "react-router-dom";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { ConnectionsHub, type HubRole } from "@/components/connections/connections-hub";

const Shell = ({ role }: { role: HubRole }) => (
  <div className={STANDARD_SHELL_PANEL_CLASS}>
    <ConnectionsHub role={role} />
  </div>
);
export const ConexoesCompanyPage = () => <Shell role="company" />;
export const ConexoesAgencyPage = () => <Shell role="agency" />;
export const ConexoesNomadPage = () => <Shell role="nomad" />;
export const ConexoesLeaderPage = () => <Shell role="leader" />;
export const ConexoesAdminPage = () => <Shell role="admin" />;

/** /conexoes (usado pelo retorno do OAuth): leva cada perfil à sua página, preservando ?oauth=… */
export function ConexoesRedirect() {
  let user: { role?: string; account_type?: string } | null = null;
  try { user = JSON.parse(localStorage.getItem("allka_user") || "null"); } catch { /* sem sessão */ }
  const { search } = useLocation();
  const r = user?.role ?? "", a = user?.account_type ?? "";
  const base = a === "admin" || r === "admin" ? "/admin" : a === "lider" || r === "lider" ? "/leader" : a === "nomades" || r === "nomad" ? "/nomades" : a === "agencias" || r.startsWith("agency") ? "/agency" : "/company";
  return <Navigate to={`${base}/conexoes${search}`} replace />;
}
