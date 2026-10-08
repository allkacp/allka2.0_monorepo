import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Catalog2Thumbnail } from "./catalog2-thumbnail";

// P-12 (08/10): a miniatura mostra a imagem REAL do produto; sem imagem, um espaço neutro. Nunca imagem inventada nem selo de "provisório".
describe("Catalog2Thumbnail — imagem real ou espaço neutro", () => {
  it("com imagePath: renderiza a imagem real", () => {
    const { container } = render(<Catalog2Thumbnail imagePath="/images/products/alk-ads-001.svg" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/images/products/alk-ads-001.svg");
  });

  it("sem imagem: mostra o espaço neutro 'Sem imagem' (nada de gradiente inventado)", () => {
    const { container } = render(<Catalog2Thumbnail imagePath={null} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sem imagem")).toBeInTheDocument();
  });

  it("arquivo que falha ao carregar: cai no espaço neutro", () => {
    const { container } = render(<Catalog2Thumbnail imagePath="/images/products/inexistente.svg" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sem imagem")).toBeInTheDocument();
  });

  it("nunca mostra selo de provisório", () => {
    render(<Catalog2Thumbnail imagePath="/images/products/alk-ads-001.svg" />);
    expect(screen.queryByLabelText(/provisória/i)).not.toBeInTheDocument();
  });
});
