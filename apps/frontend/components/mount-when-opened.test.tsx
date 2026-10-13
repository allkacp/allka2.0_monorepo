import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MountWhenOpened } from "./mount-when-opened";

describe("MountWhenOpened", () => {
  it("não monta nada antes da primeira abertura", () => {
    render(<MountWhenOpened open={false}><p>painel</p></MountWhenOpened>);
    expect(screen.queryByText("painel")).toBeNull();
  });

  it("monta ao abrir e continua montado depois de fechar", () => {
    const { rerender } = render(<MountWhenOpened open={false}><p>painel</p></MountWhenOpened>);
    rerender(<MountWhenOpened open={true}><p>painel</p></MountWhenOpened>);
    expect(screen.getByText("painel")).toBeTruthy();
    rerender(<MountWhenOpened open={false}><p>painel</p></MountWhenOpened>);
    expect(screen.getByText("painel")).toBeTruthy();
  });
});
