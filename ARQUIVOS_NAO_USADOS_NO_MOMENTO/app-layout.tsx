import type React from "react"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Suspense } from "react"
import { AccountTypeProvider } from "@/contexts/account-type-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { CompanyProvider } from "@/contexts/company-context"
import { SettingsProvider } from "@/contexts/settings-context"
import { CartProvider } from "@/contexts/cart-context"
import { PricingProvider } from "@/lib/contexts/pricing-context"
import { FloatingCreateProject } from "@/components/floating-create-project"
import { MobileLayoutWrapper } from "@/components/mobile-layout-wrapper"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SettingsProvider>
      <AccountTypeProvider>
        <SidebarProvider>
          <CompanyProvider>
            <PricingProvider>
              <CartProvider>
                <MobileLayoutWrapper>
                  <div className="flex h-screen bg-gray-50 overflow-visible">
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

                    <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ paddingBottom: 36 }}>
                      <Header />
                      <main className="flex-1 overflow-auto bg-slate-200 mx-0 py-12 px-14 pb-mobile-nav">
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            </div>
                          }
                        >
                          {children}
                        </Suspense>
                      </main>
                      <Footer />
                    </div>
                  </div>
                  <FloatingCreateProject />
                </MobileLayoutWrapper>
              </CartProvider>
            </PricingProvider>
          </CompanyProvider>
        </SidebarProvider>
      </AccountTypeProvider>
    </SettingsProvider>
  )
}
