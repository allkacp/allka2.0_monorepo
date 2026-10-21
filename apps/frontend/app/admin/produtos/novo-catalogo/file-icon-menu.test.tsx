import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const api = { viewCatalog2DeliverableFile: vi.fn().mockResolvedValue(undefined), downloadCatalog2DeliverableFile: vi.fn().mockResolvedValue(undefined), uploadCatalog2DeliverableFile: vi.fn() };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { FileIconMenu } from "./catalog2-commercial-ui";

const file = { id: "f1", name: "Plano de midia - versao final com nome muito comprido.pdf", size: 2048 };

// R21-07 (reunião 21/10): anexo = só um ícone roxo clicável; o nome completo não ocupa a tela.
describe("Anexo do entregável · ícone roxo com menu", () => {
  it("mostra só o ícone (nome só no tooltip) e oferece Ver, Baixar, Substituir e Remover em edição", () => {
    const onRemove = vi.fn();
    const { container } = render(<FileIconMenu file={file} readOnly={false} onReplaced={vi.fn()} onRemove={onRemove} onError={vi.fn()} />);
    expect(container.textContent).toBe(""); // nada de texto com o nome do arquivo
    const icon = screen.getByTestId("deliverable-file-icon");
    expect(icon.getAttribute("title")).toContain("Plano de midia");
    fireEvent.click(icon);
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Substituir" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover anexo" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("Ver abre o arquivo e Baixar baixa", () => {
    render(<FileIconMenu file={file} readOnly={false} onReplaced={vi.fn()} onRemove={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByTestId("deliverable-file-icon"));
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    expect(api.viewCatalog2DeliverableFile).toHaveBeenCalledWith(file);
    fireEvent.click(screen.getByTestId("deliverable-file-icon"));
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }));
    expect(api.downloadCatalog2DeliverableFile).toHaveBeenCalledWith(file);
  });

  it("em leitura só aparecem Ver e Baixar (nada de substituir ou remover)", () => {
    render(<FileIconMenu file={file} readOnly onError={vi.fn()} />);
    fireEvent.click(screen.getByTestId("deliverable-file-icon"));
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Substituir" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover anexo" })).not.toBeInTheDocument();
  });
});
