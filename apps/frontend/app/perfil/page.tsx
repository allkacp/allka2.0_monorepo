"use client";

/**
 * "Meu Perfil" como PÁGINA dedicada dentro do container padrão da
 * plataforma (ata 2026-08, reparo do bloco 1 — "Meu Perfil no container
 * padrão").
 *
 * Antes, clicar em "Meu Perfil" no menu do usuário abria o
 * `UserViewSlidePanel` administrativo como um slide-over `absolute inset-0`
 * por cima da rota atual (mantinha a URL, invadia a sidebar, duplicava
 * cabeçalho/avatar sobre a topbar). Agora o menu NAVEGA para uma rota
 * pessoal (`/admin/perfil`, `/company/perfil`, `/agency/perfil`,
 * `/partner/perfil` — Nomad/Leader já tinham `/nomades/perfil` e
 * `/leader/perfil` próprios) e esta página renderiza o MESMO painel em
 * `asPage` (card no fluxo normal, um cabeçalho, sem X/overlay/ações de
 * "admin gerenciando outra pessoa").
 *
 * A identidade vem SEMPRE da sessão atual: admin lê `GET
 * /api/users/me` (via `apiClient.getCurrentUser()`); os demais portais
 * montam o objeto a partir do próprio contexto do portal (empresa/agência)
 * — exatamente como o header já fazia. Nenhum id de usuário é aceito pela
 * URL/query para trocar a identidade.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccountType } from "@/contexts/account-type-context";
import { useEmpresa } from "@/contexts/empresa-context";
import { useAgencia } from "@/contexts/agencia-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { UserViewSlidePanel } from "@/components/user-view-slide-panel";

type ViewerRole = "admin" | "agency" | "company" | "nomad";

// Admin, Company, Agency e Partner já usam ESTE MESMO ARQUIVO e o mesmo
// `UserViewSlidePanel` (nunca 4 cópias) — o wrapper abaixo é intencionalmente
// PRÓPRIO (não `STANDARD_SHELL_PANEL_CLASS`, que embute padding pensado para
// telas de tabela) porque o `UserViewSlidePanel` já gerencia seu próprio
// espaçamento interno de ponta a ponta (cabeçalho `UserViewHeader` incluído)
// — envolvê-lo num shell com padding recriaria margens indesejadas ao redor
// do cabeçalho do painel. Nômade/Líder permanecem como páginas próprias
// (`STANDARD_SHELL_PANEL_CLASS`) por terem modelo de dados totalmente
// diferente (CPF/PIX/habilitações vs. áreas de atuação) — não por
// incompatibilidade de container; unificar exigiria estender o modelo de
// dados do `UserViewSlidePanel`, fora do escopo deste lote.
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl lg:rounded-[1.5rem] border border-slate-200/70 dark:border-slate-700/60 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18),0_4px_16px_-4px_rgba(15,23,42,0.10)]">
      {children}
    </div>
  );
}

export default function SelfProfilePage() {
  const { accountType } = useAccountType();
  const empresa = useEmpresa();
  const agencia = useAgencia();

  const needsSessionFetch = accountType === "admin" || accountType === "nomades";
  const [selfUser, setSelfUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(needsSessionFetch);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const loadSession = useCallback(() => {
    if (!needsSessionFetch) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getCurrentUser()
      .then((u: any) => {
        if (!cancelled) setSelfUser(u);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Não foi possível carregar seu perfil.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsSessionFetch]);

  useEffect(() => {
    const cleanup = loadSession();
    return cleanup;
  }, [loadSession, retryNonce]);

  if (loading) {
    return (
      <CardShell>
        <div className="flex-1 flex items-center justify-center gap-2 text-slate-400" role="status" aria-label="Carregando seu perfil">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando seu perfil…</span>
        </div>
      </CardShell>
    );
  }

  if (error) {
    return (
      <CardShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">{error}</p>
          <Button size="sm" onClick={() => setRetryNonce((n) => n + 1)}>Tentar novamente</Button>
        </div>
      </CardShell>
    );
  }

  // ── Identidade da sessão, por portal (mesma lógica do header) ─────────
  let viewerRole: ViewerRole = "admin";
  let user: any = null;
  let agencyFinancial: any = undefined;

  if (accountType === "empresas" && empresa.profile) {
    viewerRole = "company";
    const p = empresa.profile;
    user = {
      id: p.id, name: p.name, email: p.email,
      role: "company_admin", account_type: "company",
      cnpj: p.cnpj, phone: p.phone,
      is_active: p.status === "active", is_admin: false, permissions: [],
      created_at: p.createdAt ?? "", updated_at: p.createdAt ?? "",
    };
  } else if (accountType === "agencias" && agencia.profile) {
    viewerRole = "agency";
    const p = agencia.profile;
    user = {
      id: p.id, name: p.name, email: p.email,
      role: "agency_admin", account_type: "agency",
      phone: p.phone ?? "", is_active: true, is_admin: false, permissions: [],
      created_at: p.createdAt ?? "", updated_at: p.createdAt ?? "",
      currentMrr: p.currentMrr, totalProjects: p.totalProjects, partnerLevel: p.partnerLevel,
    };
    agencyFinancial = {
      invoices: agencia.invoices,
      projectRevenue: agencia.projects.reduce((s: number, pr: any) => s + (pr.value ?? 0), 0),
      currentMrr: p.currentMrr, plan: p.plan, planDiscount: p.planDiscount,
    };
  } else {
    // admin + nomades: usuário real autenticado (ou fallback mínimo).
    viewerRole = accountType === "nomades" ? "nomad" : "admin";
    user = selfUser ?? {
      id: 0, name: "", email: "",
      role: accountType, account_type: accountType,
      is_active: true, is_admin: accountType === "admin", permissions: [],
      created_at: "", updated_at: "",
    };
  }

  return (
    <div className="w-full h-full relative">
      <UserViewSlidePanel
        asPage
        open
        onClose={() => {}}
        user={user}
        viewerRole={viewerRole}
        agencyFinancial={agencyFinancial}
      />
    </div>
  );
}
