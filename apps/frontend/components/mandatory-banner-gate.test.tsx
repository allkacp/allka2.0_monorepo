import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MandatoryBannerGate } from "@/components/mandatory-banner-gate"

// Banner obrigatório (ata 2026-08, bloco 5/5).

const { api } = vi.hoisted(() => ({
  api: { getMyMandatoryBanners: vi.fn(), acknowledgeBanner: vi.fn() },
}))
vi.mock("@/lib/api-client", () => ({ apiClient: api }))

function banner(over: Partial<any> = {}) {
  return {
    id: "b1",
    title: "Manutenção programada",
    body: "O sistema ficará indisponível no sábado.",
    kind: "obrigatorio",
    version: 1,
    ack_button_label: "Li e estou ciente",
    link_url: null,
    image_url: null,
    image_alt: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getMyMandatoryBanners.mockResolvedValue({ data: [banner()] })
  api.acknowledgeBanner.mockResolvedValue({ acknowledged: true, banner_id: "b1", version: 1 })
})

it("mostra o banner obrigatório e registra a ciência ao clicar no botão", async () => {
  const user = userEvent.setup()
  render(<MandatoryBannerGate />)
  expect(await screen.findByText("Manutenção programada")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /li e estou ciente/i }))
  await waitFor(() => expect(api.acknowledgeBanner).toHaveBeenCalledWith("b1", 1))
  await waitFor(() => expect(screen.queryByText("Manutenção programada")).not.toBeInTheDocument())
})

it("banner obrigatório: Esc e clique fora NÃO dispensam", async () => {
  const user = userEvent.setup()
  render(<MandatoryBannerGate />)
  await screen.findByText("Manutenção programada")
  await user.keyboard("{Escape}")
  expect(screen.getByText("Manutenção programada")).toBeInTheDocument()
  // clique no overlay (fora do card)
  await user.click(screen.getByRole("dialog"))
  expect(screen.getByText("Manutenção programada")).toBeInTheDocument()
  expect(api.acknowledgeBanner).not.toHaveBeenCalled()
})

it("banner informativo pode ser fechado com 'Fechar' sem registrar ciência obrigatória", async () => {
  api.getMyMandatoryBanners.mockResolvedValue({ data: [banner({ kind: "informativo" })] })
  const user = userEvent.setup()
  render(<MandatoryBannerGate />)
  await screen.findByText("Manutenção programada")
  await user.click(screen.getByRole("button", { name: /^fechar$/i }))
  await waitFor(() => expect(screen.queryByText("Manutenção programada")).not.toBeInTheDocument())
  expect(api.acknowledgeBanner).not.toHaveBeenCalled()
})

it("fila: após a ciência do primeiro, o segundo aparece", async () => {
  api.getMyMandatoryBanners.mockResolvedValue({
    data: [banner(), banner({ id: "b2", title: "Novo recurso disponível" })],
  })
  const user = userEvent.setup()
  render(<MandatoryBannerGate />)
  expect(await screen.findByText("Manutenção programada")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /li e estou ciente/i }))
  expect(await screen.findByText("Novo recurso disponível")).toBeInTheDocument()
})

it("nova versão em corrida (version_changed) → recarrega os banners", async () => {
  api.acknowledgeBanner.mockRejectedValueOnce(Object.assign(new Error("x"), { data: { code: "version_changed" } }))
  api.getMyMandatoryBanners
    .mockResolvedValueOnce({ data: [banner()] })
    .mockResolvedValue({ data: [banner({ version: 2 })] })
  const user = userEvent.setup()
  render(<MandatoryBannerGate />)
  await screen.findByText("Manutenção programada")
  await user.click(screen.getByRole("button", { name: /li e estou ciente/i }))
  await waitFor(() => expect(api.getMyMandatoryBanners).toHaveBeenCalledTimes(2))
})
