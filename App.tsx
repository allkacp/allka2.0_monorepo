import React, { Suspense, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import { TermAcceptanceGate, type PendingTerm } from "@/components/term-acceptance-gate"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MobileLayoutWrapper } from "@/components/mobile-layout-wrapper"

import { AccountTypeProvider } from "@/contexts/account-type-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { CompanyProvider } from "@/contexts/company-context"
import { SettingsProvider } from "@/contexts/settings-context"
import { PlatformUsersProvider } from "@/contexts/platform-users-context"
import { SpecialtyProvider } from "@/lib/contexts/specialty-context"
import { PricingProvider } from "@/lib/contexts/pricing-context"
import { ProductProvider } from "@/lib/contexts/product-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ChatWidget } from "@/components/chat-widget"

// ─── Admin Pages ────────────────────────────────────────────────────────────
const AdminDashboardPage = React.lazy(() => import("@/app/admin/dashboard/page"))
const AdminDashboardConfigPage = React.lazy(() => import("@/app/admin/dashboard-config/page"))
const AdminUsuariosPage = React.lazy(() => import("@/app/admin/usuarios/page"))
const AdminUsuariosInternosPage = React.lazy(() => import("@/app/admin/usuarios-internos/page"))
const AdminUsersPage = React.lazy(() => import("@/app/admin/users/page"))
const AdminEmpresasPage = React.lazy(() => import("@/app/admin/empresas/page"))
const AdminNomadesPg = React.lazy(() => import("@/app/admin/nomades/page"))
const AdminAgenciasPage = React.lazy(() => import("@/app/admin/agencias/page"))
const AdminProjetosPage = React.lazy(() => import("@/app/admin/projetos/page"))
const AdminProdutosPage = React.lazy(() => import("@/app/admin/produtos/page"))
const AdminPrecificacaoPage = React.lazy(() => import("@/app/admin/precificacao/page"))
const AdminNiveisPage = React.lazy(() => import("@/app/admin/niveis/page"))
const AdminNiveisNomades = React.lazy(() => import("@/app/admin/niveis-nomades/page"))
const AdminLevelsPage = React.lazy(() => import("@/app/admin/levels/page"))
const AdminEspecialidadesPage = React.lazy(() => import("@/app/admin/especialidades/page"))
const AdminAllkademyPage = React.lazy(() => import("@/app/admin/allkademy/page"))
const AdminFinanceiroPage = React.lazy(() => import("@/app/admin/financeiro/page"))
const AdminRelatoriosPage = React.lazy(() => import("@/app/admin/relatorios/page"))
const AdminDisponibilidadePage = React.lazy(() => import("@/app/admin/disponibilidade/page"))
const AdminComissionamentosPage = React.lazy(() => import("@/app/admin/comissionamentos/page"))
const AdminCommissionsPage = React.lazy(() => import("@/app/admin/commissions/page"))
const AdminPromocoesPage = React.lazy(() => import("@/app/admin/promocoes/page"))
const AdminCampanhasIndicacao = React.lazy(() => import("@/app/admin/campanhas-indicacao/page"))
const AdminOnboardingPage = React.lazy(() => import("@/app/admin/onboarding/page"))
const AdminPermissoesPage = React.lazy(() => import("@/app/admin/permissoes/page"))
const AdminPermissionsPage = React.lazy(() => import("@/app/admin/permissions/page"))
const AdminTermsPage = React.lazy(() => import("@/app/admin/terms/page"))
const AdminNotificationsPage = React.lazy(() => import("@/app/admin/notifications/page"))
const AdminClientesPage = React.lazy(() => import("@/app/admin/clientes/page"))
const AdminConfiguracoesPage = React.lazy(() => import("@/app/admin/configuracoes/page"))
const AdminConfiguracionPage = React.lazy(() => import("@/app/admin/configuracion/page"))
const AdminSistemaPage = React.lazy(() => import("@/app/admin/sistema/page"))
const AdminAlertasPage = React.lazy(() => import("@/app/admin/alertas/page"))

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
)

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Page error:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>Erro ao carregar página</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fee", padding: 16, borderRadius: 8 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#888", marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Mock: termos pendentes para demonstração do fluxo de aceite ─────────────
// Em produção, esta lista viria da API ao autenticar o usuário.
// Armazenamos o estado no localStorage para não bloquear todo acesso no dev.
const DEMO_STORAGE_KEY = "allka_terms_demo_accepted_v1"

const MOCK_PENDING_TERMS: PendingTerm[] = [
  {
    id: "term-demo-1",
    name: "Termo de Uso da Plataforma (Empresa)",
    version: "2.1",
    type: "terms_of_service",
    is_mandatory: true,
    acceptance_level: "empresa",
    content:
      "Ao utilizar esta plataforma como representante de uma empresa, você concorda com os presentes Termos de Uso.\n\n" +
      "1. DA ACEITAÇÃO\n" +
      "O presente instrumento regula as condições de uso da Plataforma Allka para pessoas jurídicas (\"Empresa\"). " +
      "Ao se cadastrar e realizar o primeiro acesso, o usuário administrador (\"User Master\") declara ter lido, compreendido e aceito integralmente este Termo em nome da Empresa.\n\n" +
      "2. DAS OBRIGAÇÕES DA EMPRESA\n" +
      "A Empresa compromete-se a: (a) utilizar a plataforma de forma lícita e ética; (b) manter seus dados cadastrais atualizados; " +
      "(c) responder pelos atos de seus usuários vinculados; (d) não compartilhar credenciais de acesso.\n\n" +
      "3. DA RESPONSABILIDADE\n" +
      "A Allka não se responsabiliza por danos decorrentes do uso indevido da plataforma pela Empresa ou seus usuários.\n\n" +
      "4. DA VIGÊNCIA\n" +
      "Este Termo entra em vigor na data do aceite e permanece válido enquanto durar a relação contratual entre a Empresa e a Allka.",
  },
  {
    id: "term-demo-2",
    name: "Política de Privacidade",
    version: "1.5",
    type: "privacy_policy",
    is_mandatory: true,
    acceptance_level: "usuario",
    content:
      "Esta Política de Privacidade descreve como coletamos, usamos e protegemos seus dados pessoais na Plataforma Allka, " +
      "em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).\n\n" +
      "1. DADOS COLETADOS\n" +
      "Coletamos dados de identificação (nome, CPF/CNPJ), contato (e-mail, telefone), navegação (IP, cookies, logs de acesso) " +
      "e dados fornecidos voluntariamente durante o uso da plataforma.\n\n" +
      "2. FINALIDADE DO TRATAMENTO\n" +
      "Os dados são utilizados para: prestação do serviço contratado; comunicações sobre a plataforma; " +
      "cumprimento de obrigações legais; melhoria contínua dos nossos serviços.\n\n" +
      "3. COMPARTILHAMENTO\n" +
      "Não compartilhamos seus dados com terceiros, exceto quando necessário para a prestação do serviço ou por exigência legal.\n\n" +
      "4. SEUS DIREITOS\n" +
      "Você tem direito de acesso, correção, portabilidade e exclusão dos seus dados. Entre em contato pelo e-mail privacy@allka.com.br.",
  },
]

function AppLayout({ children }: { children: React.ReactNode }) {
  const [termsAccepted, setTermsAccepted] = useState<boolean>(
    () => localStorage.getItem(DEMO_STORAGE_KEY) === "true"
  )

  const handleAllAccepted = (ids: string[]) => {
    console.log("[TermAcceptanceGate] Termos aceitos:", ids)
    localStorage.setItem(DEMO_STORAGE_KEY, "true")
    setTermsAccepted(true)
  }
  return (
    <ChatProvider>
    <PlatformUsersProvider>
    <SettingsProvider>
      <AccountTypeProvider>
        <SidebarProvider>
          <CompanyProvider>
            <SpecialtyProvider>
              <PricingProvider>
              <ProductProvider>
                <MobileLayoutWrapper>
                  <div className="flex h-screen bg-gray-50 overflow-visible font-sans">
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
                      <Header />
                      <main className="flex-1 overflow-auto bg-slate-200 mx-0 py-12 px-14 pb-mobile-nav">
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
                    pendingTerms={MOCK_PENDING_TERMS}
                    user={{ name: "Administrador Master", email: "admin@empresa.com", is_master: true }}
                    onAllAccepted={handleAllAccepted}
                  />
                )}
                {/* Chat widget flutuante */}
                <ChatWidget />
              </ProductProvider>
              </PricingProvider>
            </SpecialtyProvider>
          </CompanyProvider>
        </SidebarProvider>
      </AccountTypeProvider>
    </SettingsProvider>
    </PlatformUsersProvider>
    </ChatProvider>
  )
}

export default function App() {
  return (
    <>
      <Routes>
      {/* Rota inicial → Admin Dashboard */}
      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
              {/* Redireciona raiz para dashboard admin */}
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

              {/* ─── Admin ────────────────────────────────────────────── */}
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/dashboard-config" element={<AdminDashboardConfigPage />} />
              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
              <Route path="/admin/usuarios-internos" element={<AdminUsuariosInternosPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/empresas" element={<AdminEmpresasPage />} />
              <Route path="/admin/nomades" element={<AdminNomadesPg />} />
              <Route path="/admin/agencias" element={<AdminAgenciasPage />} />
              <Route path="/admin/projetos" element={<AdminProjetosPage />} />
              <Route path="/admin/produtos" element={<AdminProdutosPage />} />
              <Route path="/admin/precificacao" element={<AdminPrecificacaoPage />} />
              <Route path="/admin/niveis" element={<AdminNiveisPage />} />
              <Route path="/admin/niveis-nomades" element={<AdminNiveisNomades />} />
              <Route path="/admin/levels" element={<AdminLevelsPage />} />
              <Route path="/admin/especialidades" element={<AdminEspecialidadesPage />} />
              <Route path="/admin/allkademy" element={<AdminAllkademyPage />} />
              <Route path="/admin/financeiro" element={<AdminFinanceiroPage />} />
              <Route path="/admin/relatorios" element={<AdminRelatoriosPage />} />
              <Route path="/admin/disponibilidade" element={<AdminDisponibilidadePage />} />
              <Route path="/admin/comissionamentos" element={<AdminComissionamentosPage />} />
              <Route path="/admin/commissions" element={<AdminCommissionsPage />} />
              <Route path="/admin/promocoes" element={<AdminPromocoesPage />} />
              <Route path="/admin/campanhas-indicacao" element={<AdminCampanhasIndicacao />} />
              <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
              <Route path="/admin/permissoes" element={<AdminPermissoesPage />} />
              <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
              <Route path="/admin/terms" element={<AdminTermsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/clientes" element={<AdminClientesPage />} />
              <Route path="/admin/configuracoes" element={<AdminConfiguracoesPage />} />
              <Route path="/admin/configuracion" element={<AdminConfiguracionPage />} />
              <Route path="/admin/sistema" element={<AdminSistemaPage />} />
              <Route path="/admin/alertas" element={<AdminAlertasPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AppLayout>
        }
      />
      </Routes>
      <CookieConsentBanner />
    </>
  )
}
