import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { startRoadmapSso } = vi.hoisted(() => ({ startRoadmapSso: vi.fn() }));
vi.mock("@/lib/api-client", () => ({
  apiClient: { startRoadmapSso },
}));

import { useOpenRoadmapPanel } from "./use-open-roadmap-panel";

function fakePopup() {
  return { location: { href: "" }, closed: false } as unknown as Window;
}

describe("useOpenRoadmapPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre uma aba em branco de forma síncrona, antes do await, e redireciona para a URL do backend", async () => {
    const popup = fakePopup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(popup);
    startRoadmapSso.mockResolvedValue({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });

    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    expect(popup.location.href).toBe("http://localhost:8090/sso/consume?token=abc");
    expect(result.current.error).toBe("");
    openSpy.mockRestore();
  });

  it("fecha a aba em branco e expõe uma mensagem amigável quando o backend falha", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    startRoadmapSso.mockRejectedValue(new Error("Nenhuma conta elegível da Roadmap encontrada para este e-mail."));

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });

    expect(popup.close).toHaveBeenCalled();
    expect(result.current.error).toBe("Nenhuma conta elegível da Roadmap encontrada para este e-mail.");
    expect(result.current.loading).toBe(false);
  });

  it("usa a mensagem genérica quando o erro não tem .message", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    startRoadmapSso.mockRejectedValue("falha crua");

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });

    expect(result.current.error).toBe("Não foi possível abrir a Central de roadmap e chamados. Tente novamente.");
  });

  it("chamada concorrente (duplo clique) só dispara uma requisição", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakePopup());
    let resolveSso: (v: { redirectUrl: string }) => void = () => {};
    startRoadmapSso.mockReturnValue(new Promise((resolve) => { resolveSso = resolve; }));

    const { result } = renderHook(() => useOpenRoadmapPanel());

    let firstCall: Promise<void>;
    let secondCall: Promise<void>;
    act(() => {
      firstCall = result.current.open();
      secondCall = result.current.open();
    });

    expect(startRoadmapSso).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledTimes(1);

    resolveSso({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });
    await act(async () => {
      await Promise.all([firstCall, secondCall]);
    });
    openSpy.mockRestore();
  });

  it("uma nova chamada depois que a primeira termina é permitida (guard não trava para sempre)", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakePopup());
    startRoadmapSso.mockResolvedValue({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });
    await act(async () => {
      await result.current.open();
    });

    expect(startRoadmapSso).toHaveBeenCalledTimes(2);
    expect(openSpy).toHaveBeenCalledTimes(2);
  });
});
