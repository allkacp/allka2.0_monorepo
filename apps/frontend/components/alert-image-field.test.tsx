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

beforeEach(() => {
  vi.clearAllMocks();
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
});
