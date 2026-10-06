"use client"

import type { ReactNode } from "react"
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell"

/** Moldura padrão das telas (painel branco + faixa de título), igual às demais telas do sistema. O conteúdo rola dentro do painel. */
export function StandardScreen({ icon, title, description, actions, children, hideBanner = false, fill = false }: { icon: React.ElementType; title: string; description: string; actions?: ReactNode; children: ReactNode; hideBanner?: boolean; fill?: boolean }) {
  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative flex h-full min-h-0 flex-col">
        {!hideBanner && <div className="shrink-0"><StandardPageBanner icon={icon} title={title} description={description} actions={actions} /></div>}
        <div className={`min-h-0 flex-1 px-1 pb-2 pt-1 ${fill ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
      </div>
    </div>
  )
}
