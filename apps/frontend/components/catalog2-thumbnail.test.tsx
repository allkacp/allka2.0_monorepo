import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Catalog2Thumbnail } from "./catalog2-thumbnail";

// Reparo 2026-09 ("restaurar imagens reais"): a miniatura deve mostrar o
// arquivo REAL vindo do backend (imagePath) como fonte principal — o
// ícone/gradiente determinístico só entra como ÚLTIMO recurso, nunca como
// fonte principal (ver comentário no próprio componente).
describe("Catalog2Thumbnail — imagem real como fonte principal, fallback só em falha", () => {
  it("com imagePath: renderiza a imagem real, não o ícone/gradiente", () => {
    const { container } = render(<Catalog2Thumbnail productId="p1" imagePath="/images/products/alk-ads-001.svg" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/images/products/alk-ads-001.svg");
  });

  it("sem imagePath nenhum: cai no ícone/gradiente determinístico (fallback), nunca quebra", () => {
    const { container } = render(<Catalog2Thumbnail productId="p1" imagePath={null} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("imagePath aponta pra arquivo que falha ao carregar: cai no fallback ícone/gradiente", () => {
    const { container } = render(<Catalog2Thumbnail productId="p1" imagePath="/images/products/inexistente.svg" />);
    const img = container.querySelector("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("com imagem real, o selo permanece 'provisório' (reaproveitada, nunca definitiva)", () => {
    render(<Catalog2Thumbnail productId="p1" imagePath="/images/products/alk-ads-001.svg" showBadge />);
    expect(screen.getByLabelText(/provisória/i)).toBeInTheDocument();
  });
});
