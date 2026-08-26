import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertImageThumbnail } from "@/components/alert-image-lightbox";

// Reparo de segurança (ata 2026-08, pós-4º lote): a miniatura/lightbox
// busca a imagem via fetch autenticado (apiClient.fetchAlertImageBlobUrl)
// e converte pra Object URL — nunca um <img src> direto numa rota
// protegida. Este arquivo cobre os itens 17 e 20 da lista de testes da
// ata: troca de conta não reaproveita Object URL anterior, e regressão
// básica de miniatura/lightbox/estados de erro.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    fetchAlertImageBlobUrl: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom não implementa URL.createObjectURL/revokeObjectURL — o
  // componente só CHAMA revokeObjectURL (a criação acontece dentro do
  // apiClient mockado), então só precisamos de um espião pra revoke.
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

describe("AlertImageThumbnail", () => {
  it("sem src, não renderiza nada", () => {
    const { container } = render(<AlertImageThumbnail src={null} alt={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("busca a imagem autenticada e mostra a miniatura", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:mock-url-1");
    render(<AlertImageThumbnail src="/api/system-alerts/abc/image" alt="Descrição de teste" />);
    await waitFor(() => expect(screen.getByAltText("Descrição de teste")).toBeInTheDocument());
    expect(apiClient.fetchAlertImageBlobUrl).toHaveBeenCalledWith("/api/system-alerts/abc/image");
  });

  it("401/403/404 (fetchAlertImageBlobUrl rejeita) mostra placeholder 'Imagem indisponível', nunca quebra", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockRejectedValue(new Error("HTTP 403"));
    render(<AlertImageThumbnail src="/api/system-alerts/abc/image" alt="Descrição de teste" />);
    await waitFor(() => expect(screen.getByTitle("Imagem indisponível")).toBeInTheDocument());
    expect(screen.queryByAltText("Descrição de teste")).not.toBeInTheDocument();
  });

  it("clique na miniatura abre o lightbox com alt text", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:mock-url-2");
    const user = userEvent.setup();
    render(<AlertImageThumbnail src="/api/system-alerts/abc/image" alt="Foto do alerta" />);
    const thumb = await screen.findByTitle("Ampliar imagem");
    await user.click(thumb);
    await waitFor(() => expect(screen.getAllByAltText("Foto do alerta").length).toBeGreaterThan(1));
  });

  it("17. trocar de conta (src muda pra outro recurso) revoga o Object URL anterior e nunca reaproveita a imagem antiga", async () => {
    (apiClient.fetchAlertImageBlobUrl as any)
      .mockResolvedValueOnce("blob:conta-A")
      .mockResolvedValueOnce("blob:conta-B");

    const { rerender } = render(<AlertImageThumbnail src="/api/system-alerts/alert-da-conta-A/image" alt="Imagem da conta A" />);
    await waitFor(() => expect(screen.getByAltText("Imagem da conta A")).toHaveAttribute("src", "blob:conta-A"));

    // Simula troca de contexto (logout + login de outra conta): o `src`
    // passado ao componente muda pra um recurso diferente.
    rerender(<AlertImageThumbnail src="/api/system-alerts/alert-da-conta-B/image" alt="Imagem da conta B" />);

    await waitFor(() => expect(screen.getByAltText("Imagem da conta B")).toHaveAttribute("src", "blob:conta-B"));
    // O Object URL da conta A foi revogado — nunca fica pendurado em
    // memória nem reaparece.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:conta-A");
    expect(screen.queryByAltText("Imagem da conta A")).not.toBeInTheDocument();
  });

  it("revoga o Object URL ao desmontar", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:desmontar");
    const { unmount } = render(<AlertImageThumbnail src="/api/system-alerts/xyz/image" alt="Imagem de teste" />);
    await waitFor(() => expect(screen.getByAltText("Imagem de teste")).toBeInTheDocument());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:desmontar");
  });

  it("20. regressão: miniatura nunca excede o tamanho compacto (h-12 w-12 por padrão)", async () => {
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:tamanho");
    render(<AlertImageThumbnail src="/api/system-alerts/xyz/image" alt="Imagem de teste" />);
    const img = await screen.findByAltText("Imagem de teste");
    expect(img.className).toMatch(/h-12 w-12/);
  });
});
