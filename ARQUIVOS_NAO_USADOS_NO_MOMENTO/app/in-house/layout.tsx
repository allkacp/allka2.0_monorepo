import { ProductProvider } from "@/lib/contexts/product-context"
import { SpecialtyProvider } from "@/lib/contexts/specialty-context"
import type { ReactNode } from "react"

export default function InHouseLayout({ children }: { children: ReactNode }) {
  return (
    <SpecialtyProvider>
      <ProductProvider>{children}</ProductProvider>
    </SpecialtyProvider>
  )
}
