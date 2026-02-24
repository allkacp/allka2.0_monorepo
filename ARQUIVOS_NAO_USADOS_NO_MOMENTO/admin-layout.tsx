import type React from "react"
import { SpecialtyProvider } from "@/lib/contexts/specialty-context"
import { ProductProvider } from "@/lib/contexts/product-context"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SpecialtyProvider>
      <ProductProvider>{children}</ProductProvider>
    </SpecialtyProvider>
  )
}
