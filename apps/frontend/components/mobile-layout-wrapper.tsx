
import type React from "react"

import { useState, useEffect } from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { AppMenuDrawer } from "@/components/app-menu-drawer"

interface MobileLayoutWrapperProps {
  children: React.ReactNode
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {children}
      {mounted && (
        <>
          {/* Bottom Tab Navigation — visível apenas em mobile/tablet */}
          <MobileBottomNav onMenuClick={() => setMenuOpen(true)} />
          {/* Drawer de menu completo (ativado pelo botão "Mais") */}
          <AppMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        </>
      )}
    </>
  )
}
