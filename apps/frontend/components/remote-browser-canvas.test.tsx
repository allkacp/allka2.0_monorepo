import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RemoteBrowserCanvas, normalizeAddress, wsUrlFor } from "./remote-browser-canvas";

const sent: string[] = [];
class FakeWS { static last: FakeWS; readyState = 1; binaryType = ""; onmessage: any; onclose: any; onerror: any; constructor(public url: string) { FakeWS.last = this; } send(m: string) { sent.push(m); } close() {} }
vi.stubGlobal("WebSocket", FakeWS);

describe("Navegador seguro real (visualizador)", () => {
  it("monta o endereço do WebSocket conforme http/https", () => {
    expect(wsUrlFor("/api/x", { protocol: "https:", host: "a.com" }, "/api")).toBe("wss://a.com/api/x");
    expect(wsUrlFor("/api/x", { protocol: "http:", host: "localhost:8082" }, "")).toBe("ws://localhost:8082/api/x");
    expect(wsUrlFor("/api/x", { protocol: "http:", host: "localhost:8082" }, "http://localhost:3001/api")).toBe("ws://localhost:3001/api/x");
  });
  it("envia só mouse/teclado e bloqueia copiar/colar e atalhos com Ctrl", () => {
    render(<RemoteBrowserCanvas url="/api/secure-browser/ws/s1?t=x" watermark="Allka" />);
    expect(FakeWS.last.url).toContain("/api/secure-browser/ws/s1?t=x");
    const c = screen.getByTestId("remote-canvas");
    fireEvent.keyDown(c, { key: "a" });
    fireEvent.keyDown(c, { key: "v", ctrlKey: true });
    fireEvent.keyDown(c, { key: "c", metaKey: true });
    const keys = sent.map((s) => JSON.parse(s)).filter((m) => m.type === "key");
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ action: "down", key: "a" });
    fireEvent.click(screen.getByLabelText("Recarregar"));
    expect(JSON.parse(sent[sent.length - 1])).toEqual({ type: "nav", action: "reload" });
  });
  it("barra de endereço (só no login inicial) navega para o site digitado", () => {
    expect(normalizeAddress("instagram.com")).toBe("https://instagram.com");
    expect(normalizeAddress("http://a.com/x")).toBe("http://a.com/x");
    render(<RemoteBrowserCanvas url="/api/secure-browser/ws/s2?t=x" watermark="Allka" canNavigate />);
    fireEvent.change(screen.getByLabelText("Endereço do site"), { target: { value: "meusite.com.br" } });
    fireEvent.click(screen.getByText("Ir"));
    expect(JSON.parse(sent[sent.length - 1])).toEqual({ type: "nav", action: "goto", url: "https://meusite.com.br" });
  });
  it("sem permissão de navegar, não mostra a barra de endereço", () => {
    render(<RemoteBrowserCanvas url="/api/secure-browser/ws/s3?t=x" watermark="Allka" />);
    expect(screen.queryByLabelText("Endereço do site")).toBeNull();
  });
  it("zoom: oferece porcentagens e lembra a escolha", async () => {
    render(<RemoteBrowserCanvas url="/api/secure-browser/ws/s4?t=x" watermark="Allka" />);
    const sel = screen.getByLabelText("Zoom da página") as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.textContent)).toContain("67%");
    fireEvent.change(sel, { target: { value: "0.5" } });
    expect(window.localStorage.getItem("allka_sb_zoom")).toBe("0.5");
  });
});
