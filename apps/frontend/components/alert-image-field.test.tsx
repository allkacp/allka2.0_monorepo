import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertImageField, type AlertImageFieldValue } from "@/components/alert-image-field";

// Campo reutilizável de imagem de alerta (ata 2026-08, 4º lote) — testado
// isolado (não dentro dos formulários grandes que o usam) seguindo o
// precedente de project-admin-responsible-section.test.tsx.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    uploadAlertImage: vi.fn(),
    resolveAlertImageUrl: vi.fn((url: string | null) => url),
    fetchAlertImageBlobUrl: vi.fn(() => Promise.resolve("blob:mock-url")),
  },
}));

import { apiClient } from "@/lib/api-client";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(["x".repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

function Harness() {
  const [value, setValue] = useState<AlertImageFieldValue>({ image_file_name: null, image_alt: null, image_url: null });
  return <AlertImageField value={value} onChange={setValue} />;
}

// jsdom não decodifica bytes reais de imagem — new Image() nunca dispara
// onload/onerror sozinho. O componente usa isso só pra ler
// naturalWidth/naturalHeight ANTES do upload (pré-checagem client-side de
// 1200×200 px), então mockamos o construtor global pra simular a decodificação
// com dimensões controláveis por teste (padrão: exatamente 1200×200, o caso
// "feliz" que a maioria dos testes preexistentes assume).
let mockImageDims = { width: 1200, height: 200 };

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = "";
  set src(value: string) {
    this._src = value;
    this.naturalWidth = mockImageDims.width;
    this.naturalHeight = mockImageDims.height;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockImageDims = { width: 1200, height: 200 };
  vi.stubGlobal("Image", MockImage as unknown as typeof Image);
  if (!("createObjectURL" in URL)) {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => "blob:temp-dims-check";
  }
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:temp-dims-check");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

describe("AlertImageField", () => {
  it("renderiza estado vazio ('Sem imagem') quando não há imagem", () => {
    render(<Harness />);
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /selecionar imagem/i })).toBeInTheDocument();
  });

  it("arquivo de formato inválido mostra erro e não chama upload", async () => {
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = makeFile("doc.pdf", "application/pdf", 1000);
    // userEvent.upload respeita o `accept` do input (filtra o arquivo antes
    // de disparar o change) — usamos fireEvent direto pra simular um
    // arquivo que passou dessa barreira do navegador (ex.: extensão
    // disfarçada) e confirmar que a validação client-side própria do
    // componente pega o caso mesmo assim.
    Object.defineProperty(input, "files", { value: [badFile], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByText(/formato inválido/i)).toBeInTheDocument();
    expect(apiClient.uploadAlertImage).not.toHaveBeenCalled();
  });

  it("arquivo maior que 5MB mostra erro e não chama upload", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeFile("big.png", "image/png", 6 * 1024 * 1024);
    await user.upload(input, bigFile);

    expect(await screen.findByText(/muito grande/i)).toBeInTheDocument();
    expect(apiClient.uploadAlertImage).not.toHaveBeenCalled();
  });

  it("upload bem-sucedido mostra a miniatura e permite remover", async () => {
    (apiClient.uploadAlertImage as any).mockResolvedValue({ file_name: "abc.png", url: "/api/system-alerts/admin/images/abc.png" });
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const goodFile = makeFile("photo.png", "image/png", 1000);
    await user.upload(input, goodFile);

    await waitFor(() => expect(apiClient.uploadAlertImage).toHaveBeenCalledWith(goodFile));
    expect(await screen.findByRole("button", { name: /remover/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(await screen.findByText("Sem imagem")).toBeInTheDocument();
  });

  it("upload com falha mostra erro inline e não deixa a imagem 'anexada'", async () => {
    (apiClient.uploadAlertImage as any).mockRejectedValue(new Error("Formato de imagem inválido"));
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const goodFile = makeFile("photo.webp", "image/webp", 1000);
    await user.upload(input, goodFile);

    expect(await screen.findByText("Formato de imagem inválido")).toBeInTheDocument();
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });

  it("alt de texto se torna obrigatório (aviso) quando há imagem sem alt preenchido", async () => {
    (apiClient.uploadAlertImage as any).mockResolvedValue({ file_name: "abc.png", url: "/api/system-alerts/admin/images/abc.png" });
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("photo.png", "image/png", 1000));

    expect(await screen.findByText(/texto alternativo é obrigatório/i)).toBeInTheDocument();
  });

  // ─── ata 2026-08, 5º lote (correção visual/UX) ───────────────────────────

  it("mostra o texto de orientação (1200×200, 6:1, formatos, 5MB) antes de qualquer seleção", () => {
    render(<Harness />);
    expect(
      screen.getByText("Use um banner de 1200 × 200 px (proporção 6:1), em JPG, PNG ou WebP, com até 5 MB."),
    ).toBeInTheDocument();
  });

  it("mostra a moldura vazia em proporção 6:1 antes de qualquer seleção", () => {
    render(<Harness />);
    const frame = screen.getByTestId("alert-image-empty-frame");
    expect(frame.className).toMatch(/aspect-\[6\/1\]/);
    expect(frame.className).toMatch(/w-full/);
  });

  it("pré-checagem client-side rejeita imagem com dimensões diferentes de 1200×200 SEM chamar o upload", async () => {
    mockImageDims = { width: 800, height: 600 };
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("wrong-size.png", "image/png", 1000));

    expect(
      await screen.findByText("A imagem selecionada possui 800 × 600 px. Selecione uma imagem de exatamente 1200 × 200 px."),
    ).toBeInTheDocument();
    expect(apiClient.uploadAlertImage).not.toHaveBeenCalled();
    expect(screen.getByTestId("alert-image-empty-frame")).toBeInTheDocument();
  });

  it("seleção válida (1200×200 exato) chama o upload e mostra o banner completo (não a miniatura pequena)", async () => {
    (apiClient.uploadAlertImage as any).mockResolvedValue({ file_name: "banner.png", url: "/api/system-alerts/admin/images/banner.png" });
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:banner-preview");
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("banner.png", "image/png", 1000));

    await waitFor(() => expect(apiClient.uploadAlertImage).toHaveBeenCalled());
    // O botão "Ampliar imagem" só existe no AlertBannerImage (moldura 6:1
    // completa), nunca na miniatura compacta h-12 w-12.
    const trigger = await screen.findByTitle("Ampliar imagem");
    expect(trigger.className).toMatch(/aspect-\[6\/1\]/);
    expect(screen.queryByTestId("alert-image-empty-frame")).not.toBeInTheDocument();
  });

  it("rejeição do backend (dimensão incorreta detectada no servidor) exibe a mensagem exata de erro", async () => {
    (apiClient.uploadAlertImage as any).mockRejectedValue(
      new Error("A imagem enviada possui 1000 × 400 px. O banner precisa ter exatamente 1200 × 200 px."),
    );
    const user = userEvent.setup();
    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makeFile("photo.png", "image/png", 1000));

    expect(
      await screen.findByText("A imagem enviada possui 1000 × 400 px. O banner precisa ter exatamente 1200 × 200 px."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("alert-image-empty-frame")).toBeInTheDocument();
  });
});
