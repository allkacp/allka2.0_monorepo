
import { useLayoutEffect } from "react"

/**
 * Footer — Item 6 (complemento 09/09/2026).
 *
 * A faixa decorativa vazia do rodapé foi REMOVIDA: ela era `fixed` no fim de
 * todo conteúdo, sem texto (o copyright vive só no rodapé da sidebar
 * expandida — ver components/sidebar.tsx) e ainda "roubava" altura do
 * container central por causa da reserva `--footer-height`.
 *
 * O componente continua existindo (mantém a assinatura/o ponto de montagem em
 * App.tsx e o contrato da variável `--footer-height`, consumida pelo
 * `.pb-mobile-nav` e por alguns dashboards), mas agora não pinta nada e zera
 * a reserva: `--footer-height: 0px`.
 */
export function Footer(_props: { transparent?: boolean } = {}) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.style.getPropertyValue("--footer-height")
    root.style.setProperty("--footer-height", "0px")
    return () => {
      if (previous) root.style.setProperty("--footer-height", previous)
      else root.style.removeProperty("--footer-height")
    }
  }, [])

  return null
}
