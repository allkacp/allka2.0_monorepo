import React, { Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import {
  TermAcceptanceGate,
  type PendingTerm,
} from "@/components/term-acceptance-gate";
import { apiClient } from "@/lib/api-client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileLayoutWrapper } from "@/components/mobile-layout-wrapper";

import { AccountTypeProvider } from "@/contexts/account-type-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { CompanyProvider } from "@/contexts/company-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { PlatformUsersProvider } from "@/contexts/platform-users-context";
import { SpecialtyProvider } from "@/lib/contexts/specialty-context";
import { PricingProvider } from "@/lib/contexts/pricing-context";
import { ProductProvider } from "@/lib/contexts/product-context";
import { ChatProvider } from "@/contexts/chat-context";
import { ChatWidget } from "@/components/chat-widget";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";
import { PartnerProvider } from "@/contexts/partner-context";
import { EmpresaProvider } from "@/contexts/empresa-context";
import { AgenciaProvider } from "@/contexts/agencia-context";
import { ProjectBasketProvider } from "@/contexts/project-basket-context";

// ─── Admin Pages ────────────────────────────────────────────────────────────
const AdminDashboardPage = React.lazy(
  () => import("@/app/admin/dashboard/page"),
);
const AdminDashboardConfigPage = React.lazy(
  () => import("@/app/admin/dashboard-config/page"),
);
const AdminUsuariosPage = React.lazy(() => import("@/app/admin/usuarios/page"));
const AdminUsuariosInternosPage = React.lazy(
  () => import("@/app/admin/usuarios-internos/page"),
);
const AdminUsersPage = React.lazy(() => import("@/app/admin/users/page"));
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
const AdminCommissionsPage = React.lazy(
  () => import("@/app/admin/commissions/page"),
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
const AdminConfiguracionPage = React.lazy(
  () => import("@/app/admin/configuracion/page"),
);
const AdminSistemaPage = React.lazy(() => import("@/app/admin/sistema/page"));
const AdminAlertasPage = React.lazy(() => import("@/app/admin/alertas/page"));

// ─── Nômades Pages ────────────────────────────────────────────────────────────
const NomadesDashboardPage = React.lazy(
  () => import("@/app/nomades/dashboard/page"),
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
const ParceiroDashboardPage = React.lazy(
  () => import("@/app/parceiro/dashboard/page"),
);
const ParceiroAgenciasPage = React.lazy(
  () => import("@/app/parceiro/agencias/page"),
);
const ParceiroProjetosPage = React.lazy(
  () => import("@/app/parceiro/projetos/page"),
);
const ParceiroComissoesPage = React.lazy(
  () => import("@/app/parceiro/comissoes/page"),
);
const ParceiroSaquesPage = React.lazy(
  () => import("@/app/parceiro/saques/page"),
);

// ─── Empresa Pages ──────────────────────────────────────────────────────────
const EmpresaDashboardPage = React.lazy(
  () => import("@/app/company/dashboard/page"),
);
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

// ─── Agência Pages ─────────────────────────────────────────────────────────
const AgenciaDashboardPage = React.lazy(
  () => import("@/app/agencia/dashboard/page"),
);
const AgenciaProjetosPage = React.lazy(
  () => import("@/app/agencia/projetos/page"),
);
const AgenciaTarefasPage = React.lazy(
  () => import("@/app/agencia/tarefas/page"),
);
const AgenciaFinanceiroPage = React.lazy(
  () => import("@/app/agencia/financeiro/page"),
);
const AgenciaCatalogoPage = React.lazy(
  () => import("@/app/agencia/catalogo/page"),
);

// ─── Login Pages ─────────────────────────────────────────────────────────
const LoginPage = React.lazy(() => import("@/app/admin/login/page"));
const NomadeLoginPage = React.lazy(() => import("@/app/nomades/login/page"));
const EmpresaLoginPage = React.lazy(() => import("@/app/company/login/page"));
const AgenciaLoginPage = React.lazy(() => import("@/app/agencia/login/page"));
const ParceiroLoginPage = React.lazy(() => import("@/app/parceiro/login/page"));

// ─── Auth Guard ──────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("allka_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

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
                                <div className="hidden lg:flex">
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
                                    <Header />
                                  </PageErrorBoundary>
                                  <main className="flex-1 overflow-auto bg-slate-200 dark:bg-background mx-0 py-12 px-14 pb-mobile-nav">
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
          path="/nomades/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <NomadeLoginPage />
            </Suspense>
          }
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
          path="/agencia/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <AgenciaLoginPage />
            </Suspense>
          }
        />
        <Route
          path="/parceiro/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <ParceiroLoginPage />
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
                    path="/admin/usuarios-internos"
                    element={<AdminUsuariosInternosPage />}
                  />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route
                    path="/admin/empresas"
                    element={<AdminEmpresasPage />}
                  />
                  <Route path="/admin/nomades" element={<AdminNomadesPg />} />
                  <Route
                    path="/admin/projetos"
                    element={<AdminProjetosPage />}
                  />
                  <Route
                    path="/admin/produtos"
                    element={<AdminProdutosPage />}
                  />
                  <Route
                    path="/admin/catalogo-produtos"
                    element={<AdminCatalogoProdutosPage />}
                  />
                  <Route
                    path="/admin/precificacao"
                    element={<AdminPrecificacaoPage />}
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
                    path="/admin/commissions"
                    element={<AdminCommissionsPage />}
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
                  <Route
                    path="/admin/configuracion"
                    element={<AdminConfiguracionPage />}
                  />
                  <Route path="/admin/sistema" element={<AdminSistemaPage />} />
                  <Route path="/admin/alertas" element={<AdminAlertasPage />} />

                  {/* ─── Nômades ──────────────────────────────────────────────── */}
                  <Route
                    path="/nomades/dashboard"
                    element={<NomadesDashboardPage />}
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

                  {/* ─── Parceiro ─────────────────────────────────────────── */}
                  <Route
                    path="/parceiro/dashboard"
                    element={<ParceiroDashboardPage />}
                  />
                  <Route
                    path="/parceiro/agencias"
                    element={<ParceiroAgenciasPage />}
                  />
                  <Route
                    path="/parceiro/projetos"
                    element={<ParceiroProjetosPage />}
                  />
                  <Route
                    path="/parceiro/comissoes"
                    element={<ParceiroComissoesPage />}
                  />
                  <Route
                    path="/parceiro/saques"
                    element={<ParceiroSaquesPage />}
                  />

                  {/* ─── Empresa ──────────────────────────────────────────── */}
                  <Route
                    path="/company/dashboard"
                    element={<EmpresaDashboardPage />}
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

                  {/* ─── Agência ──────────────────────────────────────────── */}
                  <Route
                    path="/agencia/dashboard"
                    element={<AgenciaDashboardPage />}
                  />
                  <Route
                    path="/agencia/projetos"
                    element={<AgenciaProjetosPage />}
                  />
                  <Route
                    path="/agencia/tarefas"
                    element={<AgenciaTarefasPage />}
                  />
                  <Route
                    path="/agencia/catalogo"
                    element={<AgenciaCatalogoPage />}
                  />
                  <Route
                    path="/agencia/financeiro"
                    element={<AgenciaFinanceiroPage />}
                  />

                  {/* Fallback */}
                  <Route
                    path="*"
                    element={<Navigate to="/admin/dashboard" replace />}
                  />
                </Routes>
              </AppLayout>
            </RequireAuth>
          }
        />
      </Routes>
      <CookieConsentBanner />
      <DevRoleSwitcher />
    </AccountTypeProvider>
  );
}
