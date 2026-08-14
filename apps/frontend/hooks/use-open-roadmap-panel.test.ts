import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { getRoadmapSsoBaseUrl, startRoadmapSso } = vi.hoisted(() => ({
  getRoadmapSsoBaseUrl: vi.fn(),
  startRoadmapSso: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  apiClient: { getRoadmapSsoBaseUrl, startRoadmapSso },
}));

import { useOpenRoadmapPanel } from "./use-open-roadmap-panel";

const ROADMAP_ORIGIN = "https://roadmap-qa.allka.store";

function fakePopup() {
  return { location: { href: "" }, closed: false } as unknown as Window;
}

function dispatchReady(source: unknown, origin = ROADMAP_ORIGIN) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "allka-roadmap-sso-ready" },
      origin,
      source: source as Window,
    }),
  );
}

describe("useOpenRoadmapPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("abre a aba de forma síncrona e navega primeiro para /sso/await (não pede o token ainda)", async () => {
    const popup = fakePopup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(popup);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    startRoadmapSso.mockResolvedValue({ redirectUrl: `${ROADMAP_ORIGIN}/sso/consume?token=abc` });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });

    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    await waitFor(() => expect(popup.location.href).toContain("/sso/await"));
    expect(popup.location.href).toContain(`origin=${encodeURIComponent(window.location.origin)}`);
    expect(startRoadmapSso).not.toHaveBeenCalled();

    act(() => dispatchReady(popup));
    await act(async () => {
      await openPromise;
    });

    openSpy.mockRestore();
  });

  it("só chama startRoadmapSso (mintando o token) depois do postMessage 'pronto' — nunca antes do Basic Auth resolver", async () => {
    const popup = fakePopup();
    vi.spyOn(window, "open").mockReturnValue(popup);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    startRoadmapSso.mockResolvedValue({ redirectUrl: `${ROADMAP_ORIGIN}/sso/consume?token=abc` });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });
    await waitFor(() => expect(popup.location.href).toContain("/sso/await"));

    act(() => dispatchReady(popup));
    await act(async () => {
      await openPromise;
    });

    expect(startRoadmapSso).toHaveBeenCalledTimes(1);
    expect(popup.location.href).toBe(`${ROADMAP_ORIGIN}/sso/consume?token=abc`);
  });

  it("ignora mensagem de origem diferente da Roadmap (não avança) e aceita a correta em seguida", async () => {
    const popup = fakePopup();
    vi.spyOn(window, "open").mockReturnValue(popup);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    startRoadmapSso.mockResolvedValue({ redirectUrl: `${ROADMAP_ORIGIN}/sso/consume?token=abc` });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });
    await waitFor(() => expect(popup.location.href).toContain("/sso/await"));

    act(() => dispatchReady(popup, "https://evil.example.com"));
    expect(startRoadmapSso).not.toHaveBeenCalled();

    act(() => dispatchReady(popup));
    await act(async () => {
      await openPromise;
    });
    expect(startRoadmapSso).toHaveBeenCalledTimes(1);
  });

  it("ignora mensagem que não veio da aba que foi aberta (source diferente)", async () => {
    const popup = fakePopup();
    vi.spyOn(window, "open").mockReturnValue(popup);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    startRoadmapSso.mockResolvedValue({ redirectUrl: `${ROADMAP_ORIGIN}/sso/consume?token=abc` });

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });
    await waitFor(() => expect(popup.location.href).toContain("/sso/await"));

    act(() => dispatchReady(fakePopup())); // outra janela, não a nossa
    expect(startRoadmapSso).not.toHaveBeenCalled();

    act(() => dispatchReady(popup));
    await act(async () => {
      await openPromise;
    });
    expect(startRoadmapSso).toHaveBeenCalledTimes(1);
  });

  it("fecha a aba e expõe mensagem amigável quando getRoadmapSsoBaseUrl falha", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    getRoadmapSsoBaseUrl.mockRejectedValue(new Error("A URL do painel interno da Roadmap não está configurada."));

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });

    expect(popup.close).toHaveBeenCalled();
    expect(result.current.error).toBe("A URL do painel interno da Roadmap não está configurada.");
    expect(result.current.loading).toBe(false);
    expect(startRoadmapSso).not.toHaveBeenCalled();
  });

  it("fecha a aba e expõe mensagem amigável quando startRoadmapSso falha após o Basic Auth resolver", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    startRoadmapSso.mockRejectedValue(new Error("Nenhuma conta elegível da Roadmap encontrada para este e-mail."));

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });
    await waitFor(() => expect(popup.location.href).toContain("/sso/await"));
    act(() => dispatchReady(popup));
    await act(async () => {
      await openPromise;
    });

    expect(popup.close).toHaveBeenCalled();
    expect(result.current.error).toBe("Nenhuma conta elegível da Roadmap encontrada para este e-mail.");
  });

  it("usa a mensagem genérica quando o erro não tem .message", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    getRoadmapSsoBaseUrl.mockRejectedValue("falha crua");

    const { result } = renderHook(() => useOpenRoadmapPanel());
    await act(async () => {
      await result.current.open();
    });

    expect(result.current.error).toBe("Não foi possível abrir a Central de roadmap e chamados. Tente novamente.");
  });

  it("rejeita com mensagem amigável se a aba for fechada antes do Basic Auth resolver", async () => {
    const popup = { ...fakePopup(), close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: ROADMAP_ORIGIN });
    vi.useFakeTimers();

    const { result } = renderHook(() => useOpenRoadmapPanel());
    let openPromise!: Promise<void>;
    act(() => {
      openPromise = result.current.open();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    (popup as { closed: boolean }).closed = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await openPromise;
    });

    expect(result.current.error).toContain("fechada");
    expect(startRoadmapSso).not.toHaveBeenCalled();
  });

  it("chamada concorrente (duplo clique) só dispara uma requisição de base-url", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakePopup());
    let resolveBaseUrl: (v: { roadmapInternalUrl: string }) => void = () => {};
    getRoadmapSsoBaseUrl.mockReturnValue(new Promise((resolve) => { resolveBaseUrl = resolve; }));

    const { result } = renderHook(() => useOpenRoadmapPanel());

    let firstCall: Promise<void>;
    let secondCall: Promise<void>;
    act(() => {
      firstCall = result.current.open();
      secondCall = result.current.open();
    });

    expect(getRoadmapSsoBaseUrl).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledTimes(1);

    resolveBaseUrl({ roadmapInternalUrl: ROADMAP_ORIGIN });
    // não resolve o postMessage — só garante que a segunda chamada foi descartada, não travou nada.
    await act(async () => {
      await Promise.race([Promise.all([firstCall, secondCall]), new Promise((r) => setTimeout(r, 10))]);
    });
    openSpy.mockRestore();
  });
});
