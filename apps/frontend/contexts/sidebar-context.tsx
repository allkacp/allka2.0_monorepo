"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";

interface SidebarSettings {
  backgroundColor: string;
  logoUrl: string;
  backgroundImage?: string | null;
  imageOpacity?: number;
  imageOverlay?: "blue" | "purple" | "pink" | "none";
  overlayIntensity?: number;
  backgroundMode?: "gradient" | "image" | "image+gradient";
  imagePosition?: "top" | "center" | "bottom";
  imageAlignment?: "left" | "center" | "right";
  imageScale?: number;
  customGradientColor1?: string;
  customGradientColor2?: string;
  customGradientDirection?: "to right" | "to bottom" | "135deg";
  sidebarLogo?: string | null;
  sidebarFavicon?: string | null;
  dominantImageColor?: string | null;
  headerBg?: string | null;
  buttonBg?: string | null;
  activeItemColor?: string | null;
  fontScale?: "compact" | "normal" | "comfortable" | "large";
  fontSizeSidebar?: "xs" | "sm" | "base";
  fontSizeHeading?: "sm" | "base" | "lg" | "xl";
  fontSizeBody?: "xs" | "sm" | "base";
  fontSizeTable?: "xs" | "sm" | "base";
}

interface AgencyProfile {
  name: string;
  logo: string;
  planType: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

interface UserProfile {
  name: string;
  role: string;
  job_title: string;
  email: string;
  phone: string;
  avatar: string;
  department: string;
  joinDate: string;
}

interface SidebarContextType {
  sidebarSettings: SidebarSettings;
  agencyProfile: AgencyProfile;
  userProfile: UserProfile;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  previewTheme: SidebarSettings | null;
  previewEnabled: boolean;
  projectColor: string | null;
  updateSidebarSettings: (settings: Partial<SidebarSettings>) => void;
  updateAgencyProfile: (profile: Partial<AgencyProfile>) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setPreviewTheme: (theme: SidebarSettings | null) => void;
  setPreviewEnabled: (enabled: boolean) => void;
  setProjectColor: (color: string | null) => void;
  applyFullTheme: (theme: Partial<SidebarSettings>) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Lookup: Tailwind bg-* class names → valid CSS color values
const BG_TO_CSS: Record<string, string> = {
  "bg-slate-900": "#0f172a",
  "bg-blue-900": "#1e3a8a",
  "bg-blue-800": "#1e40af",
  "bg-slate-800": "#1e293b",
  "bg-indigo-900": "#312e81",
  "bg-green-900": "#14532d",
  "bg-emerald-900": "#064e3b",
  "bg-purple-900": "#581c87",
  "bg-violet-900": "#4c1d95",
  "bg-red-900": "#7f1d1d",
  "bg-gray-900": "#111827",
};

function bgToCSS(bg: string): string {
  if (!bg)
    return "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)";
  if (bg.startsWith("custom-gradient:"))
    return bg.replace("custom-gradient:", "");
  if (BG_TO_CSS[bg]) return BG_TO_CSS[bg];
  return bg; // raw hex / rgb / any valid CSS value
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const defaultSettings: SidebarSettings = {
    backgroundColor:
      "custom-gradient:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
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
    headerBg: null,
    buttonBg: null,
    activeItemColor: null,
    fontScale: "normal",
    fontSizeSidebar: "sm",
    fontSizeHeading: "lg",
    fontSizeBody: "sm",
    fontSizeTable: "xs",
  };

  const [sidebarSettings, setSidebarSettings] =
    useState<SidebarSettings>(defaultSettings);
  const [isMounted, setIsMounted] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<SidebarSettings | null>(
    null,
  );
  const [previewEnabled, setPreviewEnabled] = useState(false);

  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>({
    name: "Allka Digital",
    logo: "/images/logob.png",
    planType: "Premium",
    cnpj: "12.345.678/0001-90",
    email: "contato@allka.digital",
    phone: "(11) 99999-9999",
    address: "São Paulo, SP",
    description: "Agência especializada em marketing digital e desenvolvimento",
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Vinicius Guardia",
    role: "Admin",
    job_title: "Coordenador de Processos",
    email: "cp@lamego.com.vc",
    phone: "",
    avatar: "VG",
    department: "Administração",
    joinDate: "2023-01-01",
  });

  const [projectColor, setProjectColor] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const SIDEBAR_MIN = 220;
  const SIDEBAR_MAX = 400;
  const SIDEBAR_DEFAULT = 240;
  const SIDEBAR_COLLAPSED = 72;

  const [customSidebarWidth, setCustomSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sidebar-width");
      const parsed = saved ? Number(saved) : SIDEBAR_DEFAULT;
      if (!isFinite(parsed) || parsed < SIDEBAR_MIN) return SIDEBAR_DEFAULT;
      if (parsed > SIDEBAR_MAX) return SIDEBAR_MAX;
      return parsed;
    } catch {
      return SIDEBAR_DEFAULT;
    }
  });

  const setSidebarWidth = (width: number) => {
    const clamped = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width));
    setCustomSidebarWidth(clamped);
    try {
      localStorage.setItem("sidebar-width", String(clamped));
    } catch {}
  };

  // Carregar tema do localStorage ao montar
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("allka_sidebar_theme");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSidebarSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      // Silenciosamente ignorar erros de localStorage
    }
    setIsMounted(true);
  }, []);

  // Salvar tema no localStorage sempre que mudar
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(
          "allka_sidebar_theme",
          JSON.stringify(sidebarSettings),
        );
      } catch (error) {
        // Silenciosamente ignorar erros de localStorage
      }
    }
  }, [sidebarSettings, isMounted]);

  // Aplicar tema como CSS variables globais
  useEffect(() => {
    const root = document.documentElement;

    if (projectColor) {
      root.style.setProperty("--app-brand-gradient", projectColor);
      root.style.setProperty("--app-brand-solid", projectColor);
      root.style.setProperty("--brand-gradient", projectColor);
      return;
    }

    const s = previewTheme || sidebarSettings;
    const isImageMode =
      s.backgroundMode === "image" || s.backgroundMode === "image+gradient";
    const cssValue =
      isImageMode && s.dominantImageColor
        ? bgToCSS(s.dominantImageColor)
        : bgToCSS(s.backgroundColor);
    const headerCss = s.headerBg ? bgToCSS(s.headerBg) : cssValue;
    root.style.setProperty("--app-brand-gradient", cssValue);
    root.style.setProperty("--app-brand-header", headerCss);
    root.style.setProperty("--app-brand-solid", cssValue);
    root.style.setProperty("--brand-gradient", cssValue);
    const buttonCss = s.buttonBg ? bgToCSS(s.buttonBg) : cssValue;
    root.style.setProperty("--app-brand-button", buttonCss);
    const activeColor = s.activeItemColor || "#c81a7f";
    root.style.setProperty("--app-brand-active", activeColor);
    // Per-context font sizes
    // (font-size global é controlada pelo FontScaleControl no header via useFontScale)
    const fsMap = {
      xs: "0.7rem",
      sm: "0.8125rem",
      base: "0.875rem",
      lg: "1rem",
      xl: "1.125rem",
    } as const;
    root.style.setProperty(
      "--app-font-sidebar",
      fsMap[s.fontSizeSidebar || "sm"],
    );
    root.style.setProperty(
      "--app-font-heading",
      fsMap[s.fontSizeHeading || "lg"],
    );
    root.style.setProperty("--app-font-body", fsMap[s.fontSizeBody || "sm"]);
    root.style.setProperty("--app-font-table", fsMap[s.fontSizeTable || "xs"]);
  }, [sidebarSettings, previewTheme, previewEnabled, projectColor]);

  const updateSidebarSettings = (settings: Partial<SidebarSettings>) => {
    setSidebarSettings((prev) => {
      const newSettings = { ...prev, ...settings };
      return newSettings;
    });
  };

  // PASSO 1: Função única global para aplicar tema completo
  const applyFullTheme = (theme: Partial<SidebarSettings>) => {
    const newSettings = { ...sidebarSettings, ...theme };
    setSidebarSettings(newSettings);

    // Salvar no localStorage
    try {
      localStorage.setItem("allka_sidebar_theme", JSON.stringify(newSettings));
    } catch {}

    // Aplicar CSS variables
    const root = document.documentElement;
    const isImageMode =
      newSettings.backgroundMode === "image" ||
      newSettings.backgroundMode === "image+gradient";
    const cssValue =
      isImageMode && newSettings.dominantImageColor
        ? bgToCSS(newSettings.dominantImageColor)
        : bgToCSS(newSettings.backgroundColor);
    const headerCss = newSettings.headerBg
      ? bgToCSS(newSettings.headerBg)
      : cssValue;
    const buttonCss = newSettings.buttonBg
      ? bgToCSS(newSettings.buttonBg)
      : cssValue;
    root.style.setProperty("--app-brand-gradient", cssValue);
    root.style.setProperty("--app-brand-header", headerCss);
    root.style.setProperty("--app-brand-solid", cssValue);
    root.style.setProperty("--brand-gradient", cssValue);
    root.style.setProperty("--app-brand-button", buttonCss);
    const activeColor2 = newSettings.activeItemColor || "#c81a7f";
    root.style.setProperty("--app-brand-active", activeColor2);
    const fsMap2 = {
      xs: "0.7rem",
      sm: "0.8125rem",
      base: "0.875rem",
      lg: "1rem",
      xl: "1.125rem",
    } as const;
    root.style.setProperty(
      "--app-font-sidebar",
      fsMap2[newSettings.fontSizeSidebar || "sm"],
    );
    root.style.setProperty(
      "--app-font-heading",
      fsMap2[newSettings.fontSizeHeading || "lg"],
    );
    root.style.setProperty(
      "--app-font-body",
      fsMap2[newSettings.fontSizeBody || "sm"],
    );
    root.style.setProperty(
      "--app-font-table",
      fsMap2[newSettings.fontSizeTable || "xs"],
    );
  };

  const updateAgencyProfile = (profile: Partial<AgencyProfile>) => {
    setAgencyProfile((prev) => ({ ...prev, ...profile }));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
  };

  const sidebarWidth = sidebarCollapsed ? 72 : customSidebarWidth;

  // Sync CSS variables so footer and other elements can use them
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    root.style.setProperty("--sidebar-collapsed-width", "72px");
    root.style.setProperty("--sidebar-min-width", "220px");
    root.style.setProperty("--sidebar-max-width", "400px");
  }, [sidebarWidth]);

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
        projectColor,
        updateSidebarSettings,
        updateAgencyProfile,
        updateUserProfile,
        setSidebarCollapsed,
        setPreviewTheme,
        setPreviewEnabled,
        setProjectColor,
        applyFullTheme,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
