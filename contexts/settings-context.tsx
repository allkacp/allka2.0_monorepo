"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";

export type FontSize = "small" | "medium" | "large" | "extra-large";
export type Language = "pt-BR" | "en-US" | "es-ES";
export type Theme = "light" | "dark" | "system";
export type LayoutDensity = "compact" | "comfortable" | "spacious";

interface SettingsContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  layoutDensity: LayoutDensity;
  setLayoutDensity: (density: LayoutDensity) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const DEFAULT_SETTINGS = {
  fontSize: "medium" as FontSize,
  language: "pt-BR" as Language,
  theme: "light" as Theme,
  layoutDensity: "comfortable" as LayoutDensity,
  highContrast: false,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(
    DEFAULT_SETTINGS.fontSize,
  );
  const [language, setLanguageState] = useState<Language>(
    DEFAULT_SETTINGS.language,
  );
  const [theme, setThemeState] = useState<Theme>(DEFAULT_SETTINGS.theme);
  const [layoutDensity, setLayoutDensityState] = useState<LayoutDensity>(
    DEFAULT_SETTINGS.layoutDensity,
  );
  const [highContrast, setHighContrastState] = useState(
    DEFAULT_SETTINGS.highContrast,
  );
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedSettings = localStorage.getItem("allka-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setFontSizeState(parsed.fontSize || DEFAULT_SETTINGS.fontSize);
        setLanguageState(parsed.language || DEFAULT_SETTINGS.language);
        setThemeState(parsed.theme || DEFAULT_SETTINGS.theme);
        setLayoutDensityState(
          parsed.layoutDensity || DEFAULT_SETTINGS.layoutDensity,
        );
        setHighContrastState(
          parsed.highContrast || DEFAULT_SETTINGS.highContrast,
        );
      } catch (e) {
        console.error("Failed to parse settings:", e);
      }
    }
  }, []);

  // Apply settings to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Apply font size
    const fontSizeMap = {
      small: "15px",
      medium: "17px",
      large: "19px",
      "extra-large": "21px",
    };
    root.style.fontSize = fontSizeMap[fontSize];

    // Apply theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    // Apply high contrast
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Apply layout density
    root.setAttribute("data-density", layoutDensity);

    // Save to localStorage
    localStorage.setItem(
      "allka-settings",
      JSON.stringify({
        fontSize,
        language,
        theme,
        layoutDensity,
        highContrast,
      }),
    );
  }, [fontSize, language, theme, layoutDensity, highContrast, mounted]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLayoutDensity = (density: LayoutDensity) => {
    setLayoutDensityState(density);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
  };

  const resetSettings = () => {
    setFontSizeState(DEFAULT_SETTINGS.fontSize);
    setLanguageState(DEFAULT_SETTINGS.language);
    setThemeState(DEFAULT_SETTINGS.theme);
    setLayoutDensityState(DEFAULT_SETTINGS.layoutDensity);
    setHighContrastState(DEFAULT_SETTINGS.highContrast);
  };

  return (
    <SettingsContext.Provider
      value={{
        fontSize,
        setFontSize,
        language,
        setLanguage,
        theme,
        setTheme,
        layoutDensity,
        setLayoutDensity,
        highContrast,
        setHighContrast,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
