import React, { Suspense, useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import {
  TermAcceptanceGate,
  type PendingTerm,
} from "@/components/term-acceptance-gate";
import { apiClient } from "@/lib/api-client";
import { PageLoader as BrandPageLoader } from "@/components/ui/loading";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileLayoutWrapper } from "@/components/mobile-layout-wrapper";

import { AccountTypeProvider } from "@/contexts/account-type-context";
import { useAccountType } from "@/contexts/account-type-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { CompanyProvider } from "@/contexts/company-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { PlatformUsersProvider } from "@/contexts/platform-users-context";
import { SpecialtyProvider } from "@/lib/contexts/specialty-context";
import { PricingProvider } from "@/lib/contexts/pricing-context";
import { ProductProvider } from "@/lib/contexts/product-context";
import { ChatProvider } from "@/contexts/chat-context";
import { ChatWidget } from "@/components/chat-widget";

import { PartnerProvider } from "@/contexts/partner-context";
import { EmpresaProvider } from "@/contexts/empresa-context";
import { AgenciaProvider } from "@/contexts/agencia-context";
import { ProjectBasketProvider } from "@/contexts/project-basket-context";

function RedirectToAgency() {
  const location = useLocation();
  const target = location.pathname.replace(/^\/agencia/, "/agency");
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

// ─── Admin Pages ────────────────────────────────────────────────────────────
const AdminDashboardPage = React.lazy(
  () => import("@/app/admin/dashboard/page"),
);
const DashboardSharePage = React.lazy(
  () => import("@/app/dashboard/share/page"),
);
// Allkademy — visão do aluno, compartilhada entre todos os perfis logados
// (distinta de /admin/allkademy, que é exclusiva de admin para gerenciar cursos)
const AllkademyStudentPage = React.lazy(() => import("@/app/allkademy/page"));
const AdminDashboardConfigPage = React.lazy(
  () => import("@/app/admin/dashboard-config/page"),
);
const AdminUsuariosPage = React.lazy(() => import("@/app/admin/usuarios/page"));
const AdminUsuariosInternosPage = React.lazy(
  () => import("@/app/admin/usuarios-internos/page"),
);
const AdminEmpresasPage = React.lazy(() => import("@/app/admin/empresas/page"));
const AdminNomadesPg = React.lazy(() => import("@/app/admin/nomades/page"));
const AdminProjetosPage = React.lazy(() => import("@/app/admin/projetos/page"));
const AdminProdutosPage = React.lazy(() => import("@/app/admin/produtos/page"));
const AdminCatalogoProdutosPage = React.lazy(
  () => import("@/app/admin/catalogo-produtos/page"),
);
const AdminPrecificacaoPage = React.lazy(
  () => import("@/app/admin/precificacao/page"),
);
const AdminTarefasPage = React.lazy(() => import("@/app/admin/tarefas/page"));
const AdminModelosTarefasPage = React.lazy(
  () => import("@/app/admin/modelos-tarefas/page"),
);
const AdminNiveisPage = React.lazy(() => import("@/app/admin/niveis/page"));
const AdminNiveisNomades = React.lazy(
  () => import("@/app/admin/niveis-nomades/page"),
);
const AdminProgramaPartnerPage = React.lazy(
  () => import("@/app/admin/programa-partner/page"),
);
const AdminEspecialidadesPage = React.lazy(
  () => import("@/app/admin/especialidades/page"),
);
const AdminAllkademyPage = React.lazy(
  () => import("@/app/admin/allkademy/page"),
);
const AdminFinanceiroPage = React.lazy(
  () => import("@/app/admin/financeiro/page"),
);
const AdminRelatoriosPage = React.lazy(
  () => import("@/app/admin/relatorios/page"),
);
const AdminDisponibilidadePage = React.lazy(
  () => import("@/app/admin/disponibilidade/page"),
);
const AdminComissionamentosPage = React.lazy(
  () => import("@/app/admin/comissionamentos/page"),
);
const AdminCampanhasIndicacao = React.lazy(
  () => import("@/app/admin/campanhas-indicacao/page"),
);
const AdminOnboardingPage = React.lazy(
  () => import("@/app/admin/onboarding/page"),
);
const AdminPermissoesPage = React.lazy(
  () => import("@/app/admin/permissoes/page"),
);
const AdminPermissionsPage = React.lazy(
  () => import("@/app/admin/permissions/page"),
);
const AdminTermsPage = React.lazy(() => import("@/app/admin/terms/page"));
const AdminNotificationsPage = React.lazy(
  () => import("@/app/admin/notifications/page"),
);
const AdminClientesPage = React.lazy(() => import("@/app/admin/clientes/page"));
const AdminConfiguracoesPage = React.lazy(
  () => import("@/app/admin/configuracoes/page"),
);
const AdminSistemaPage = React.lazy(() => import("@/app/admin/sistema/page"));
const AdminAlertasPage = React.lazy(() => import("@/app/admin/alertas/page"));

// ─── Nômades Pages ────────────────────────────────────────────────────────────
const NomadDashboardPage = React.lazy(
  () => import("@/app/nomades/dashboard/page"),
);
const NomadesRelatoriosPage = React.lazy(
  () => import("@/app/nomades/relatorios/page"),
);
const NomadesProgramaPage = React.lazy(
  () => import("@/app/nomades/programa/page"),
);
const NomadesHabilitacoesPage = React.lazy(
  () => import("@/app/nomades/habilitacoes/page"),
);
const NomadesGanhosPage = React.lazy(() => import("@/app/nomades/ganhos/page"));
const NomadesTarefasDisponiveisPage = React.lazy(
  () => import("@/app/nomades/tarefasdisponiveis/page"),
);
const NomadesMinhasTarefasPage = React.lazy(
  () => import("@/app/nomades/minhastarefas/page"),
);
const NomadesHistoricoPage = React.lazy(
  () => import("@/app/nomades/historico/page"),
);
const NomadesPerfilPage = React.lazy(() => import("@/app/nomades/perfil/page"));

// ─── Parceiro Pages ──────────────────────────────────────────────────────────
const PartnerDashboardPage = React.lazy(
  () => import("@/app/partner/dashboard/page"),
);
const PartnerAgenciasPage = React.lazy(
  () => import("@/app/parceiro/agencias/page"),
);
const PartnerProjetosPage = React.lazy(
  () => import("@/app/parceiro/projetos/page"),
);
const PartnerComissoesPage = React.lazy(
  () => import("@/app/parceiro/comissoes/page"),
);
const PartnerSaquesPage = React.lazy(
  () => import("@/app/parceiro/saques/page"),
);
const PartnerRelatoriosPage = React.lazy(
  () => import("@/app/partner/relatorios/page"),
);
const PartnerClientesPage = React.lazy(
  () => import("@/app/partner/clientes/page"),
);

// ─── Empresa Pages ──────────────────────────────────────────────────────────
const CompanyDashboardPage = React.lazy(
  () => import("@/app/company/dashboard/page"),
);
const EmpresaDashboardPage = CompanyDashboardPage;
const EmpresaProjetosPage = React.lazy(
  () => import("@/app/company/projetos/page"),
);
const EmpresaTarefasPage = React.lazy(
  () => import("@/app/company/tarefas/page"),
);
const EmpresaFaturasPage = React.lazy(
  () => import("@/app/company/faturas/page"),
);
const EmpresaProdutosPage = React.lazy(
  () => import("@/app/company/produtos/page"),
);
const CompanyRelatoriosPage = React.lazy(
  () => import("@/app/company/relatorios/page"),
);
const CompanyClientesPage = React.lazy(
  () => import("@/app/company/clientes/page"),
);

// ─── Agência Pages ─────────────────────────────────────────────────────────
const AgencyDashboardPage = React.lazy(
  () => import("@/app/agency/dashboard/page"),
);
const AgencyProjetosPage = React.lazy(
  () => import("@/app/agencia/projetos/page"),
);
const AgencyTarefasPage = React.lazy(
  () => import("@/app/agencia/tarefas/page"),
);
const AgencyFinanceiroPage = React.lazy(
  () => import("@/app/agencia/financeiro/page"),
);
const AgencyCatalogoPage = React.lazy(
  () => import("@/app/agencia/catalogo/page"),
);
const AgencyRelatoriosPage = React.lazy(
  () => import("@/app/agency/relatorios/page"),
);
const AgencyClientesPage = React.lazy(
  () => import("@/app/agencia/clientes/page"),
);

// ─── Login Pages ─────────────────────────────────────────────────────────
const LoginPage = React.lazy(() => import("@/app/admin/login/page"));
const NomadeLoginPage = React.lazy(() => import("@/app/nomades/login/page"));
const EmpresaLoginPage = React.lazy(() => import("@/app/company/login/page"));
const AgencyLoginPage = React.lazy(() => import("@/app/agencia/login/page"));
const ParceiroLoginPage = React.lazy(() => import("@/app/parceiro/login/page"));
const LiderLoginPage = React.lazy(() => import("@/app/lider/login/page"));

// ─── Líder Pages ──────────────────────────────────────────────────────────────
const LeaderDashboardPage = React.lazy(
  () => import("@/app/leader/dashboard/page"),
);
const LeaderRelatoriosPage = React.lazy(
  () => import("@/app/leader/relatorios/page"),
);
const LiderQualificacaoPage = React.lazy(
  () => import("@/app/lider/qualificacao/page"),
);
const LiderTarefasPage = React.lazy(() => import("@/app/lider/tarefas/page"));
const LiderDevolvidasPage = React.lazy(
  () => import("@/app/lider/devolvidas/page"),
);
const LiderHistoricoPage = React.lazy(
  () => import("@/app/lider/historico/page"),
);
const LiderPerfilPage = React.lazy(() => import("@/app/lider/perfil/page"));
const LiderNomadesPage = React.lazy(() => import("@/app/lider/nomades/page"));
const LiderCatalogoPage = React.lazy(() => import("@/app/lider/catalogo/page"));
const LiderProjetosPage = React.lazy(() => import("@/app/lider/projetos/page"));
const LiderClientesPage = React.lazy(() => import("@/app/lider/clientes/page"));

// ─── Auth Guard ──────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const token = localStorage.getItem("allka_token");
  if (!token) {
    const loginPath =
      pathname.startsWith("/nomad") || pathname.startsWith("/nomades")
        ? "/nomad/login"
        : pathname.startsWith("/agency") || pathname.startsWith("/agencia")
          ? "/agency/login"
          : pathname.startsWith("/partner") || pathname.startsWith("/parceiro")
            ? "/partner/login"
            : pathname.startsWith("/leader") || pathname.startsWith("/lider")
              ? "/leader/login"
              : pathname.startsWith("/company") ||
                  pathname.startsWith("/empresa")
                ? "/company/login"
                : "/login";
    return <Navigate to={loginPath} replace />;
  }

  // Role-based portal guard
  let authUser: { account_type?: string; role?: string } | null = null;
  try {
    authUser = JSON.parse(localStorage.getItem("allka_user") || "null");
  } catch {}

  if (authUser) {
    const portalPrefixes = [
      "/admin",
      "/nomad",
      "/nomades",
      "/agency",
      "/agencia",
      "/company",
      "/empresa",
      "/partner",
      "/parceiro",
      "/leader",
      "/lider",
    ];
    const prefix = portalPrefixes.find((p) => pathname.startsWith(p));
    if (prefix) {
      const { account_type, role } = authUser;
      // Admin can navigate anywhere
      const allowed =
        role === "admin" || account_type === "admin"
          ? true
          : prefix === "/admin"
            ? role === "admin"
            : prefix === "/nomad" || prefix === "/nomades"
              ? account_type === "nomades" || role === "nomad"
              : prefix === "/agency" || prefix === "/agencia"
                ? account_type === "agencias"
                : prefix === "/company" || prefix === "/empresa"
                  ? account_type === "empresas"
                  : prefix === "/partner" || prefix === "/parceiro"
                    ? account_type === "parceiro" || role === "partner"
                    : prefix === "/leader" || prefix === "/lider"
                      ? role === "lider"
                      : false;

      if (!allowed) {
        // Redirect to the user's own home
        const home =
          role === "admin" || account_type === "admin"
            ? "/admin/dashboard"
            : account_type === "nomades"
              ? "/nomad/dashboard"
              : account_type === "empresas"
                ? "/company/dashboard"
                : account_type === "agencias"
                  ? "/agency/dashboard"
                  : account_type === "parceiro"
                    ? "/partner/dashboard"
                    : role === "lider"
                      ? "/leader/dashboard"
                      : "/login";
        return <Navigate to={home} replace />;
      }
    }
  }

  return <>{children}</>;
}

// ─── Fallback inteligente por perfil ─────────────────────────────────────
function ProfileAwareFallback() {
  let authUser: { account_type?: string; role?: string } | null = null;
  try {
    authUser = JSON.parse(localStorage.getItem("allka_user") || "null");
  } catch {}
  if (!authUser) return <Navigate to="/login" replace />;
  const { account_type, role } = authUser;
  const home =
    role === "admin" || account_type === "admin"
      ? "/admin/dashboard"
      : account_type === "nomades"
        ? "/nomad/dashboard"
        : account_type === "empresas"
          ? "/company/dashboard"
          : account_type === "agencias"
            ? "/agency/dashboard"
            : account_type === "parceiro"
              ? "/partner/dashboard"
              : role === "lider"
                ? "/leader/dashboard"
                : "/login";
  return <Navigate to={home} replace />;
}

const PageLoader = () => <BrandPageLoader text="Carregando…" />;

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Page error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>Erro ao carregar página</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fee",
              padding: 16,
              borderRadius: 8,
            }}
          >
            {this.state.error?.message}
          </pre>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 11,
              color: "#888",
              marginTop: 8,
            }}
          >
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Pending terms: loaded from API ──────────────────────────────────────────

function AppLayout({ children }: { children: React.ReactNode }) {
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true); // default true to avoid flash
  const [pendingTerms, setPendingTerms] = useState<PendingTerm[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function checkTerms() {
      try {
        const res: any = await apiClient.checkTerms();
        if (cancelled) return;
        const pending =
          res.pending || res.data || (Array.isArray(res) ? res : []);
        if (pending.length > 0) {
          setPendingTerms(pending);
          setTermsAccepted(false);
        }
      } catch (err) {
        // If API fails, don't block: allow access
        console.error("[App] Failed to check terms:", err);
      }
    }
    checkTerms();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAllAccepted = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await apiClient.acceptTerm(id);
      }
    } catch (err) {
      console.error("[App] Failed to accept terms via API:", err);
    }
    setTermsAccepted(true);
  };
  return (
    <ChatProvider>
      <PlatformUsersProvider>
        <SettingsProvider>
          <SidebarProvider>
            <CompanyProvider>
              <PartnerProvider>
                <EmpresaProvider>
                  <AgenciaProvider>
                    <SpecialtyProvider>
                      <PricingProvider>
                        <ProductProvider>
                          <ProjectBasketProvider>
                            <MobileLayoutWrapper>
                              <div className="flex h-screen bg-gray-50 dark:bg-background overflow-visible font-sans">
                                <div
                                  className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden"
                                  id="sidebar-overlay"
                                />
                                <div className="hidden lg:flex shrink-0 relative z-100">
                                  <Sidebar />
                                </div>
                                <div
                                  className="lg:hidden fixed inset-y-0 left-0 z-50 transform -translate-x-full transition-transform duration-300 ease-in-out"
                                  id="mobile-sidebar"
                                >
                                  <Sidebar />
                                </div>
                                <div className="flex-1 flex flex-col overflow-visible min-w-0">
                                  <PageErrorBoundary>
                                    {/* Header visível apenas em desktop (lg+); mobile usa bottom nav */}
                                    <div className="hidden lg:block">
                                      <Header />
                                    </div>
                                    {/* Header mobile: compacto, sem sidebar toggle */}
                                    <div className="lg:hidden">
                                      <Header />
                                    </div>
                                  </PageErrorBoundary>
                                  <main className="flex-1 overflow-auto bg-slate-200 dark:bg-background mx-0 py-4 px-4 sm:px-6 lg:px-14 lg:py-12 pb-mobile-nav">
                                    <PageErrorBoundary>
                                      <Suspense fallback={<PageLoader />}>
                                        {children}
                                      </Suspense>
                                    </PageErrorBoundary>
                                  </main>
                                  <Footer />
                                </div>
                              </div>
                            </MobileLayoutWrapper>
                            {/* Gate de aceite de termos — posição fixed, bloqueia toda a UI */}
                            {!termsAccepted && (
                              <TermAcceptanceGate
                                pendingTerms={pendingTerms}
                                user={{
                                  name: "Administrador Master",
                                  email: "admin@empresa.com",
                                  is_master: true,
                                }}
                                onAllAccepted={handleAllAccepted}
                              />
                            )}
                            {/* Chat widget flutuante */}
                            <ChatWidget />
                          </ProjectBasketProvider>
                        </ProductProvider>
                      </PricingProvider>
                    </SpecialtyProvider>
                  </AgenciaProvider>
                </EmpresaProvider>
              </PartnerProvider>
            </CompanyProvider>
          </SidebarProvider>
        </SettingsProvider>
      </PlatformUsersProvider>
    </ChatProvider>
  );
}

export default function App() {
  const navigate = useNavigate();

  // Handle 401 from any API call: redirect to the appropriate login page
  useEffect(() => {
    const handler = () => {
      const path = window.location.pathname;
      const loginPath =
        path.startsWith("/nomad") || path.startsWith("/nomades")
          ? "/nomad/login"
          : path.startsWith("/agency") || path.startsWith("/agencia")
            ? "/agency/login"
            : path.startsWith("/partner") || path.startsWith("/parceiro")
              ? "/partner/login"
              : path.startsWith("/leader") || path.startsWith("/lider")
                ? "/leader/login"
                : path.startsWith("/company") || path.startsWith("/empresa")
                  ? "/company/login"
                  : "/login";
      if (!path.includes("/login")) navigate(loginPath, { replace: true });
    };
    window.addEventListener("allka:unauthorized", handler);
    return () => window.removeEventListener("allka:unauthorized", handler);
  }, [navigate]);

  return (
    <AccountTypeProvider>
      <Routes>
        {/* ─── Login pages (fora do AppLayout, públicas) ─── */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/nomad/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <NomadeLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/nomades/login"
          element={<Navigate to="/nomad/login" replace />}
        />
        <Route
          path="/agency/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <AgencyLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/agencia/login"
          element={<RedirectToAgency />}
        />
        <Route
          path="/company/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <EmpresaLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/partner/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <ParceiroLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/parceiro/login"
          element={<Navigate to="/partner/login" replace />}
        />
        <Route
          path="/leader/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LiderLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/lider/login"
          element={<Navigate to="/leader/login" replace />}
        />

        {/* ─── Rota pública de share de dashboard/widget ─────────────────── */}
        <Route
          path="/dashboard/share/:token"
          element={
            <Suspense fallback={<PageLoader />}>
              <DashboardSharePage />
            </Suspense>
          }
        />

        {/* ─── Todas as rotas protegidas passam pelo AppLayout ── */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppLayout>
                <Routes>
                  {/* Redireciona raiz para dashboard admin */}
                  <Route
                    path="/"
                    element={<Navigate to="/admin/dashboard" replace />}
                  />

                  {/* ─── Allkademy (aluno) — acessível a qualquer perfil logado,
                      não tem prefixo de portal então RequireAuth já libera para
                      todos automaticamente. Distinta de /admin/allkademy. ── */}
                  <Route path="/allkademy" element={<AllkademyStudentPage />} />

                  {/* ─── Admin ────────────────────────────────────────────── */}
                  <Route
                    path="/admin/dashboard"
                    element={<AdminDashboardPage />}
                  />
                  <Route
                    path="/admin/dashboard-config"
                    element={<AdminDashboardConfigPage />}
                  />
                  <Route
                    path="/admin/usuarios"
                    element={<AdminUsuariosPage />}
                  />
                  <Route
                    path="/admin/usuarios/:userId"
                    element={<AdminUsuariosPage />}
                  />
                  <Route
                    path="/admin/usuarios-internos"
                    element={<AdminUsuariosInternosPage />}
                  />
                  <Route
                    path="/admin/empresas"
                    element={<AdminEmpresasPage />}
                  />
                  <Route
                    path="/admin/empresas/:empresaId"
                    element={<AdminEmpresasPage />}
                  />
                  <Route path="/admin/nomades" element={<AdminNomadesPg />} />
                  <Route
                    path="/admin/projetos"
                    element={<AdminProjetosPage />}
                  />
                  <Route
                    path="/admin/projetos/:projectId"
                    element={<AdminProjetosPage />}
                  />
                  <Route
                    path="/admin/produtos"
                    element={<AdminProdutosPage />}
                  />
                  <Route
                    path="/admin/produtos/:produtoId"
                    element={<AdminProdutosPage />}
                  />
                  <Route
                    path="/admin/catalogo-produtos"
                    element={<AdminCatalogoProdutosPage />}
                  />
                  <Route
                    path="/admin/catalogo-produtos/:produtoId"
                    element={<AdminCatalogoProdutosPage />}
                  />
                  <Route
                    path="/admin/precificacao"
                    element={<AdminPrecificacaoPage />}
                  />
                  <Route path="/admin/tarefas" element={<AdminTarefasPage />} />
                  <Route
                    path="/admin/tarefas/:tarefaId"
                    element={<AdminTarefasPage />}
                  />
                  <Route
                    path="/admin/modelos-tarefas"
                    element={<AdminModelosTarefasPage />}
                  />
                  <Route
                    path="/admin/modelos-tarefas/:modeloId"
                    element={<AdminModelosTarefasPage />}
                  />
                  <Route path="/admin/niveis" element={<AdminNiveisPage />} />
                  <Route
                    path="/admin/niveis-nomades"
                    element={<AdminNiveisNomades />}
                  />
                  <Route
                    path="/admin/levels"
                    element={<Navigate to="/admin/niveis" replace />}
                  />
                  <Route
                    path="/admin/programa-partner"
                    element={<AdminProgramaPartnerPage />}
                  />
                  <Route
                    path="/admin/especialidades"
                    element={<AdminEspecialidadesPage />}
                  />
                  <Route
                    path="/admin/allkademy"
                    element={<AdminAllkademyPage />}
                  />
                  <Route
                    path="/admin/financeiro"
                    element={<AdminFinanceiroPage />}
                  />
                  <Route
                    path="/admin/relatorios"
                    element={<AdminRelatoriosPage />}
                  />
                  <Route
                    path="/admin/disponibilidade"
                    element={<AdminDisponibilidadePage />}
                  />
                  <Route
                    path="/admin/comissionamentos"
                    element={<AdminComissionamentosPage />}
                  />
                  <Route
                    path="/admin/campanhas-indicacao"
                    element={<AdminCampanhasIndicacao />}
                  />
                  <Route
                    path="/admin/onboarding"
                    element={<AdminOnboardingPage />}
                  />
                  <Route
                    path="/admin/permissoes"
                    element={<AdminPermissoesPage />}
                  />
                  <Route
                    path="/admin/permissions"
                    element={<AdminPermissionsPage />}
                  />
                  <Route path="/admin/terms" element={<AdminTermsPage />} />
                  <Route
                    path="/admin/notifications"
                    element={<AdminNotificationsPage />}
                  />
                  <Route
                    path="/admin/clientes"
                    element={<AdminClientesPage />}
                  />
                  <Route
                    path="/admin/configuracoes"
                    element={<AdminConfiguracoesPage />}
                  />
                  <Route path="/admin/sistema" element={<AdminSistemaPage />} />
                  <Route path="/admin/alertas" element={<AdminAlertasPage />} />
                  {/* ─── Nômade dashboard (replica do admin) ────────────── */}
                  <Route
                    path="/nomad/dashboard"
                    element={<NomadDashboardPage />}
                  />
                  {/* ─── Nômades ──────────────────────────────────────────────── */}
                  <Route
                    path="/nomades/dashboard"
                    element={<Navigate to="/nomad/dashboard" replace />}
                  />
                  <Route
                    path="/nomades/programa"
                    element={<NomadesProgramaPage />}
                  />
                  <Route
                    path="/nomades/habilitacoes"
                    element={<NomadesHabilitacoesPage />}
                  />
                  <Route
                    path="/nomades/ganhos"
                    element={<NomadesGanhosPage />}
                  />
                  <Route
                    path="/nomades/tarefasdisponiveis"
                    element={<NomadesTarefasDisponiveisPage />}
                  />
                  <Route
                    path="/nomades/minhastarefas"
                    element={<NomadesMinhasTarefasPage />}
                  />
                  <Route
                    path="/nomades/historico"
                    element={<NomadesHistoricoPage />}
                  />
                  <Route
                    path="/nomades/perfil"
                    element={<NomadesPerfilPage />}
                  />
                  <Route
                    path="/nomades/relatorios"
                    element={<NomadesRelatoriosPage />}
                  />
                  <Route
                    path="/nomad/relatorios"
                    element={<NomadesRelatoriosPage />}
                  />

                  {/* ─── Partner (novo) ──────────────────────────────────── */}
                  <Route
                    path="/partner/dashboard"
                    element={<PartnerDashboardPage />}
                  />
                  <Route
                    path="/partner/agencias"
                    element={<PartnerAgenciasPage />}
                  />
                  <Route
                    path="/partner/projetos"
                    element={<PartnerProjetosPage />}
                  />
                  <Route
                    path="/partner/comissoes"
                    element={<PartnerComissoesPage />}
                  />
                  <Route
                    path="/partner/saques"
                    element={<PartnerSaquesPage />}
                  />
                  <Route
                    path="/partner/relatorios"
                    element={<PartnerRelatoriosPage />}
                  />
                  <Route
                    path="/partner/clientes"
                    element={<PartnerClientesPage />}
                  />

                  {/* ─── Parceiro ─────────────────────────────────────────── */}
                  <Route
                    path="/parceiro/dashboard"
                    element={<Navigate to="/partner/dashboard" replace />}
                  />
                  <Route
                    path="/parceiro/agencias"
                    element={<Navigate to="/partner/agencias" replace />}
                  />
                  <Route
                    path="/parceiro/projetos"
                    element={<Navigate to="/partner/projetos" replace />}
                  />
                  <Route
                    path="/parceiro/comissoes"
                    element={<Navigate to="/partner/comissoes" replace />}
                  />
                  <Route
                    path="/parceiro/saques"
                    element={<Navigate to="/partner/saques" replace />}
                  />
                  <Route
                    path="/parceiro/relatorios"
                    element={<Navigate to="/partner/relatorios" replace />}
                  />
                  <Route
                    path="/parceiro/clientes"
                    element={<Navigate to="/partner/clientes" replace />}
                  />

                  {/* ─── Empresa ──────────────────────────────────────────── */}
                  <Route
                    path="/company/dashboard"
                    element={<CompanyDashboardPage />}
                  />
                  <Route
                    path="/company/projetos"
                    element={<EmpresaProjetosPage />}
                  />
                  <Route
                    path="/company/tarefas"
                    element={<EmpresaTarefasPage />}
                  />
                  <Route
                    path="/company/faturas"
                    element={<EmpresaFaturasPage />}
                  />
                  <Route
                    path="/company/produtos"
                    element={<EmpresaProdutosPage />}
                  />
                  <Route
                    path="/company/relatorios"
                    element={<CompanyRelatoriosPage />}
                  />
                  <Route
                    path="/company/clientes"
                    element={<CompanyClientesPage />}
                  />

                  {/* ─── Agency (novo) ────────────────────────────────────── */}
                  <Route
                    path="/agency/dashboard"
                    element={<AgencyDashboardPage />}
                  />
                  <Route
                    path="/agency/projetos"
                    element={<AgencyProjetosPage />}
                  />
                  <Route
                    path="/agency/projetos/:projectId"
                    element={<AgencyProjetosPage />}
                  />
                  <Route
                    path="/agency/tarefas"
                    element={<AgencyTarefasPage />}
                  />
                  <Route
                    path="/agency/tarefas/:tarefaId"
                    element={<AgencyTarefasPage />}
                  />
                  <Route
                    path="/agency/catalogo"
                    element={<AgencyCatalogoPage />}
                  />
                  <Route
                    path="/agency/financeiro"
                    element={<AgencyFinanceiroPage />}
                  />
                  <Route
                    path="/agency/relatorios"
                    element={<AgencyRelatoriosPage />}
                  />
                  <Route
                    path="/agency/clientes"
                    element={<AgencyClientesPage />}
                  />

                  {/* ─── Agência ──────────────────────────────────────────── */}
                  <Route
                    path="/agencia/dashboard"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/projetos"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/projetos/:projectId"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/tarefas"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/tarefas/:tarefaId"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/catalogo"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agency/catalogo"
                    element={<AgencyCatalogoPage />}
                  />
                  <Route
                    path="/agencia/financeiro"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/relatorios"
                    element={<RedirectToAgency />}
                  />
                  <Route
                    path="/agencia/clientes"
                    element={<Navigate to="/agency/clientes" replace />}
                  />

                  {/* ─── Leader (novo) ────────────────────────────────────── */}
                  <Route
                    path="/leader/dashboard"
                    element={<LeaderDashboardPage />}
                  />
                  <Route
                    path="/leader/qualificacao"
                    element={<LiderQualificacaoPage />}
                  />
                  <Route
                    path="/leader/tarefas"
                    element={<LiderTarefasPage />}
                  />
                  <Route
                    path="/leader/devolvidas"
                    element={<LiderDevolvidasPage />}
                  />
                  <Route
                    path="/leader/historico"
                    element={<LiderHistoricoPage />}
                  />
                  <Route
                    path="/leader/perfil"
                    element={<LiderPerfilPage />}
                  />
                  <Route
                    path="/leader/relatorios"
                    element={<LeaderRelatoriosPage />}
                  />
                  <Route
                    path="/leader/nomades"
                    element={<LiderNomadesPage />}
                  />
                  <Route
                    path="/leader/catalogo"
                    element={<LiderCatalogoPage />}
                  />
                  <Route
                    path="/leader/projetos"
                    element={<LiderProjetosPage />}
                  />
                  <Route
                    path="/leader/clientes"
                    element={<LiderClientesPage />}
                  />

                  {/* ─── Líder ─────────────────────────────────────── */}
                  <Route
                    path="/lider/dashboard"
                    element={<Navigate to="/leader/dashboard" replace />}
                  />
                  <Route
                    path="/lider/qualificacao"
                    element={<Navigate to="/leader/qualificacao" replace />}
                  />
                  <Route
                    path="/lider/tarefas"
                    element={<Navigate to="/leader/tarefas" replace />}
                  />
                  <Route
                    path="/lider/devolvidas"
                    element={<Navigate to="/leader/devolvidas" replace />}
                  />
                  <Route
                    path="/lider/historico"
                    element={<Navigate to="/leader/historico" replace />}
                  />
                  <Route
                    path="/lider/perfil"
                    element={<Navigate to="/leader/perfil" replace />}
                  />
                  <Route
                    path="/lider/relatorios"
                    element={<Navigate to="/leader/relatorios" replace />}
                  />
                  <Route
                    path="/lider/nomades"
                    element={<Navigate to="/leader/nomades" replace />}
                  />
                  <Route
                    path="/lider/catalogo"
                    element={<Navigate to="/leader/catalogo" replace />}
                  />
                  <Route
                    path="/lider/projetos"
                    element={<Navigate to="/leader/projetos" replace />}
                  />
                  <Route
                    path="/lider/clientes"
                    element={<Navigate to="/leader/clientes" replace />}
                  />

                  {/* Fallback — redireciona para o dashboard do perfil ativo */}
                  <Route path="*" element={<ProfileAwareFallback />} />
                </Routes>
              </AppLayout>
            </RequireAuth>
          }
        />
      </Routes>
      <CookieConsentBanner />
    </AccountTypeProvider>
  );
}
