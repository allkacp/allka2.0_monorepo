
import type React from "react"
import { useEffect, useRef } from "react"
import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"

const gradientMap: Record<string, string> = {
  "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900": "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900": "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800": "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
  "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900": "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
  "bg-gradient-to-b from-emerald-900 via-green-800 to-cyan-900": "linear-gradient(to bottom, #064e3b, #166534, #164e63)",
  "bg-gradient-to-tr from-teal-900 via-emerald-800 to-green-800": "linear-gradient(to top right, #134e4a, #065f46, #166534)",
  "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900": "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
  "bg-gradient-to-b from-indigo-900 via-purple-800 to-fuchsia-900": "linear-gradient(to bottom, #312e81, #6b21a8, #701a75)",
  "bg-gradient-to-tr from-violet-900 via-purple-800 to-pink-900": "linear-gradient(to top right, #4c1d95, #6b21a8, #831843)",
  "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900": "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
  "bg-gradient-to-b from-orange-900 via-red-800 to-rose-900": "linear-gradient(to bottom, #7c2d12, #991b1b, #881337)",
  "bg-gradient-to-tr from-rose-900 via-red-800 to-pink-900": "linear-gradient(to top right, #881337, #991b1b, #831843)",
  "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900": "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
  "bg-gradient-to-b from-neutral-900 via-stone-800 to-slate-900": "linear-gradient(to bottom, #171717, #292524, #0f172a)",
  "bg-gradient-to-tr from-black via-slate-900 to-gray-900": "linear-gradient(to top right, #000000, #0f172a, #111827)",
}

export function Footer() {
  const { sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme || sidebarSettings
  const bg = appliedTheme.backgroundColor
  const footerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const update = () => {
      if (footerRef.current) {
        document.documentElement.style.setProperty(
          "--footer-height",
          `${footerRef.current.offsetHeight}px`
        )
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const getFooterStyle = (): React.CSSProperties => {
    if (!bg || bg === "bg-slate-900") {
      return { background: "linear-gradient(to bottom, #0a1628, #000000)" }
    }
    if (bg.startsWith("custom-gradient:")) {
      return { background: bg.replace("custom-gradient:", "") }
    }
    if (bg.includes("gradient")) {
      return { background: gradientMap[bg] || "#0f172a" }
    }
    return {}
  }

  const isGradientOrDefault = !bg || bg === "bg-slate-900" || bg.includes("gradient") || bg.startsWith("custom-gradient:")

  return (
    <footer
      ref={footerRef}
      className={cn("fixed bottom-0 z-[9999] footer-positioned", !isGradientOrDefault && bg)}
      style={getFooterStyle()}
    >
      <div className="container mx-auto px-4 py-1">
        <p className="text-center text-xs text-white/60">&copy; 2026 ALLKA by Lamego. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}
