import { useEffect, useRef } from "react"
import { playCategorySound, type SoundCategory } from "@/lib/notification-sounds"

/**
 * Toca o som da categoria quando o contador SOBE. A primeira leitura (ao
 * abrir a página) nunca toca — só avisos que chegam depois disso.
 */
export function useSoundOnIncrease(category: SoundCategory | null, count: number | null) {
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (count === null) return
    if (prev.current !== null && count > prev.current && category) playCategorySound(category)
    prev.current = count
  }, [category, count])
}
