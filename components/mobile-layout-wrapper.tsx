
import type React from "react"

import { useState, useEffect } from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MobileMenuSheet } from "@/components/mobile-menu-sheet"
import { MobileHorizontalNav } from "@/components/mobile-horizontal-nav"
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

  const handleMenuClick = () => {
    setMenuOpen(true)
  }

  const handleMenuClose = () => {
    setMenuOpen(false)
  }

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Error caught in MobileLayoutWrapper:", event.error)
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  return (
    <>
      {children}
      {mounted && (
        <>
          <MobileHorizontalNav onMenuClick={handleMenuClick} />
          <AppMenuDrawer open={menuOpen} onClose={handleMenuClose} />
        </>
      )}
    </>
  )
}
