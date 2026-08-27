import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertBannerImage } from "@/components/alert-banner-image";

// Banner completo de imagem de alerta (ata 2026-08, 5º lote) — mesma
// disciplina de busca autenticada + Object URL do AlertImageThumbnail
// (ver alert-image-lightbox.test.tsx), mas em modo "contain" de página
// inteira (proporção 3:1), usado no preview dos formulários e no feed
// pessoal de alertas (AlertsPanel).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    fetchAlertImageBlobUrl: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

describe("AlertBannerImage", () => {
  it("sem src, não renderiza nada", () => {
    const { container } = render(<AlertBannerImage src={null} alt={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra skeleton de loading enquanto busca o blob autenticado", async () => {
    let resolveFetch: (url: string) => void = () => {};
    (apiClient.fetchAlertImageBlobUrl as any).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<AlertBannerImage src="/api/system-alerts/abc/image" alt="Banner de teste" />);
    expect(screen.queryByAltText("Banner de teste")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Imagem indisponível")).not.toBeInTheDocument();
    resolveFetch("blob:mock-loading");
    await waitFor(() => expect(screen.getByAltText("Banner de teste")).toBeInTheDocument());
  });

  it("busca a imagem autenticada e renderiza com object-contain em proporção 3:1", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:mock-url-1");
    render(<AlertBannerImage src="/api/system-alerts/abc/image" alt="Banner de teste" />);
    const img = await screen.findByAltText("Banner de teste");
    expect(apiClient.fetchAlertImageBlobUrl).toHaveBeenCalledWith("/api/system-alerts/abc/image");
    expect(img.className).toMatch(/object-contain/);
    expect(img.className).not.toMatch(/object-cover/);
    // O botão que envolve a imagem carrega a moldura 3:1 de largura total.
    expect(img.closest("button")?.className).toMatch(/aspect-\[3\/1\]/);
    expect(img.closest("button")?.className).toMatch(/w-full/);
  });

  it("401/403/404 (fetchAlertImageBlobUrl rejeita) mostra placeholder, nunca quebra o layout", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockRejectedValue(new Error("HTTP 404"));
    render(<AlertBannerImage src="/api/system-alerts/abc/image" alt="Banner de teste" />);
    await waitFor(() => expect(screen.getByTitle("Imagem indisponível")).toBeInTheDocument());
    expect(screen.queryByAltText("Banner de teste")).not.toBeInTheDocument();
  });

  it("clique abre o lightbox com a imagem completa (object-contain) e o alt text", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:mock-url-2");
    const user = userEvent.setup();
    render(<AlertBannerImage src="/api/system-alerts/abc/image" alt="Foto do alerta" />);
    const thumb = await screen.findByTitle("Ampliar imagem");
    await user.click(thumb);
    await waitFor(() => expect(screen.getAllByAltText("Foto do alerta").length).toBeGreaterThan(1));
    expect(screen.getByText("Foto do alerta", { selector: "p" })).toBeInTheDocument();
  });

  it("revoga o Object URL ao trocar de src e ao desmontar", async () => {
    (apiClient.fetchAlertImageBlobUrl as any)
      .mockResolvedValueOnce("blob:banner-A")
      .mockResolvedValueOnce("blob:banner-B");

    const { rerender, unmount } = render(<AlertBannerImage src="/api/system-alerts/a/image" alt="Imagem A" />);
    await waitFor(() => expect(screen.getByAltText("Imagem A")).toHaveAttribute("src", "blob:banner-A"));

    rerender(<AlertBannerImage src="/api/system-alerts/b/image" alt="Imagem B" />);
    await waitFor(() => expect(screen.getByAltText("Imagem B")).toHaveAttribute("src", "blob:banner-B"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:banner-A");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:banner-B");
  });
});
