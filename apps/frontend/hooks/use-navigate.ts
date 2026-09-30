import { useCallback } from "react"
import { createPath, useNavigate as useRouterNavigate, type NavigateFunction, type NavigateOptions, type To } from "react-router-dom"

// useNavigate com Ctrl/Cmd: quem navega por onClick (botão, linha de tabela,
// card) não é um <a>, então o navegador não abre nova aba sozinho. Este hook
// é o useNavigate de sempre, mas, se Ctrl (ou Cmd no Mac) estiver apertado no
// clique que disparou a navegação, abre o destino em outra aba.
//
// O flag é marcado por um listener global de clique (capture) — roda antes
// do onClick do componente e é limpo logo depois, então só vale pra
// navegação disparada de forma síncrona pelo clique.
let modifierClick = false
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      modifierClick = e.ctrlKey || e.metaKey
      if (modifierClick) setTimeout(() => (modifierClick = false), 0)
    },
    true,
  )
}

/** Navegação por clique com Ctrl/Cmd apertado (pra quem usa window.location). */
export function isModifierClick() {
  return modifierClick
}

/** Vai pra um endereço (recarregando a página); com Ctrl/Cmd, abre outra aba. */
export function openHref(href: string) {
  if (modifierClick) {
    modifierClick = false
    window.open(href, "_blank", "noopener")
    return
  }
  window.location.href = href
}

function toUrl(to: To): string {
  const path = typeof to === "string" ? to : createPath(to)
  return new URL(path, window.location.href).toString()
}

export function useNavigate(): NavigateFunction {
  const navigate = useRouterNavigate()
  return useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to !== "number" && modifierClick) {
        modifierClick = false
        window.open(toUrl(to), "_blank", "noopener")
        return
      }
      return typeof to === "number" ? navigate(to) : navigate(to, options)
    }) as NavigateFunction,
    [navigate],
  )
}
