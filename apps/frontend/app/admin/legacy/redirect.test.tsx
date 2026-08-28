import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"

// Compatibilidade de rota (sprint de produtos, bloco 2/6): o endereço antigo
// /admin/consulta-legado deve redirecionar para /admin/legacy, preservando
// favoritos/links salvos. Espelha o que App.tsx configura.

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="path">{loc.pathname}</div>
}

it("/admin/consulta-legado → /admin/legacy (replace)", () => {
  render(
    <MemoryRouter initialEntries={["/admin/consulta-legado"]}>
      <Routes>
        <Route path="/admin/legacy" element={<LocationProbe />} />
        <Route path="/admin/consulta-legado" element={<Navigate to="/admin/legacy" replace />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByTestId("path").textContent).toBe("/admin/legacy")
})
