"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

interface SidebarSettings {
  backgroundColor: string
  logoUrl: string
  backgroundImage?: string | null
  imageOpacity?: number
  imageOverlay?: "blue" | "purple" | "pink" | "none"
  overlayIntensity?: number
  backgroundMode?: "gradient" | "image" | "image+gradient"
  imagePosition?: "top" | "center" | "bottom"
  imageAlignment?: "left" | "center" | "right"
  imageScale?: number
  customGradientColor1?: string
  customGradientColor2?: string
  customGradientDirection?: "to right" | "to bottom" | "135deg"
  sidebarLogo?: string | null
  sidebarFavicon?: string | null
}

interface AgencyProfile {
  name: string
  logo: string
  planType: string
  cnpj: string
  email: string
  phone: string
  address: string
  description: string
}

interface UserProfile {
  name: string
  role: string
  email: string
  phone: string
  avatar: string
  department: string
  joinDate: string
}

interface SidebarContextType {
  sidebarSettings: SidebarSettings
  agencyProfile: AgencyProfile
  userProfile: UserProfile
  sidebarCollapsed: boolean
  sidebarWidth: number
  previewTheme: SidebarSettings | null
  previewEnabled: boolean
  updateSidebarSettings: (settings: Partial<SidebarSettings>) => void
  updateAgencyProfile: (profile: Partial<AgencyProfile>) => void
  updateUserProfile: (profile: Partial<UserProfile>) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setPreviewTheme: (theme: SidebarSettings | null) => void
  setPreviewEnabled: (enabled: boolean) => void
  applyFullTheme: (theme: Partial<SidebarSettings>) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const defaultSettings: SidebarSettings = {
    backgroundColor: "custom-gradient:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
    logoUrl: "/images/logob.png",
    backgroundImage: null,
    imageOpacity: 100,
    imageOverlay: "none",
    overlayIntensity: 30,
    backgroundMode: "gradient",
    imagePosition: "center",
    imageAlignment: "center",
    imageScale: 100,
    customGradientColor1: "#3b82f6",
    customGradientColor2: "#8b5cf6",
    customGradientDirection: "to right",
    sidebarLogo: null,
    sidebarFavicon: null,
  }

  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>(defaultSettings)
  const [isMounted, setIsMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<SidebarSettings | null>(null)
  const [previewEnabled, setPreviewEnabled] = useState(false)

  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>({
    name: "Allka Digital",
    logo: "/images/logob.png",
    planType: "Premium",
    cnpj: "12.345.678/0001-90",
    email: "contato@allka.digital",
    phone: "(11) 99999-9999",
    address: "São Paulo, SP",
    description: "Agência especializada em marketing digital e desenvolvimento",
  })

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "João Silva",
    role: "Gestor de Agência",
    email: "joao@allka.digital",
    phone: "(11) 98888-8888",
    avatar: "JS",
    department: "Gestão",
    joinDate: "2023-01-15",
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [customSidebarWidth, setCustomSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sidebar-width")
      return saved ? Number(saved) : 208
    } catch { return 208 }
  })

  const setSidebarWidth = (width: number) => {
    const clamped = Math.min(400, Math.max(160, width))
    setCustomSidebarWidth(clamped)
    try { localStorage.setItem("sidebar-width", String(clamped)) } catch {}
  }

  // Carregar tema do localStorage ao montar
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("allka_sidebar_theme")
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSidebarSettings((prev) => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      // Silenciosamente ignorar erros de localStorage
    }
    setIsMounted(true)
  }, [])

  // Salvar tema no localStorage sempre que mudar
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem("allka_sidebar_theme", JSON.stringify(sidebarSettings))
      } catch (error) {
        // Silenciosamente ignorar erros de localStorage
      }
    }
  }, [sidebarSettings, isMounted])

  // Aplicar tema como CSS variables globais
  useEffect(() => {
    const themeToApply = previewTheme || sidebarSettings
    
    const root = document.documentElement
    
    // Extrair gradiente do backgroundColor
    let gradientValue = "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)"
    let solidValue = "#1e293b"
    
    if (themeToApply.backgroundColor.startsWith("custom-gradient:")) {
      gradientValue = themeToApply.backgroundColor.replace("custom-gradient:", "")
    } else if (themeToApply.backgroundColor.startsWith("bg-")) {
      // Handle Tailwind class names by extracting the solid color
      solidValue = themeToApply.backgroundColor
    } else {
      // Assume it's a hex color
      solidValue = themeToApply.backgroundColor
    }
    
    root.style.setProperty("--app-brand-gradient", gradientValue)
    root.style.setProperty("--app-brand-solid", solidValue)
  }, [sidebarSettings, previewTheme, previewEnabled])

  const updateSidebarSettings = (settings: Partial<SidebarSettings>) => {
    setSidebarSettings((prev) => {
      const newSettings = { ...prev, ...settings }
      return newSettings
    })
  }

  // PASSO 1: Função única global para aplicar tema completo
  const applyFullTheme = (theme: Partial<SidebarSettings>) => {
    const newSettings = { ...sidebarSettings, ...theme }
    setSidebarSettings(newSettings)
    
    // Salvar no localStorage
    try {
      localStorage.setItem("allka_sidebar_theme", JSON.stringify(newSettings))
    } catch (error) {
      // Silenciosamente ignorar erros
    }
    
    // Aplicar CSS variables
    const root = document.documentElement
    let gradientValue = "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)"
    let solidValue = "#1e293b"
    
    if (newSettings.backgroundColor.startsWith("custom-gradient:")) {
      gradientValue = newSettings.backgroundColor.replace("custom-gradient:", "")
    } else {
      solidValue = newSettings.backgroundColor
    }
    
    root.style.setProperty("--app-brand-gradient", gradientValue)
    root.style.setProperty("--app-brand-solid", solidValue)
  }

  const updateAgencyProfile = (profile: Partial<AgencyProfile>) => {
    setAgencyProfile((prev) => ({ ...prev, ...profile }))
  }

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }))
  }

  const sidebarWidth = sidebarCollapsed ? 64 : customSidebarWidth

  // Sync CSS variable so footer and other elements can use it
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`)
  }, [sidebarWidth])

  return (
    <SidebarContext.Provider
      value={{
        sidebarSettings,
        agencyProfile,
        userProfile,
        sidebarCollapsed,
        sidebarWidth,
        setSidebarWidth,
        previewTheme,
        previewEnabled,
        updateSidebarSettings,
        updateAgencyProfile,
        updateUserProfile,
        setSidebarCollapsed,
        setPreviewTheme,
        setPreviewEnabled,
        applyFullTheme,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
