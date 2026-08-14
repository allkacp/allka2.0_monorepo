import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { setTestViewportWidth } from "@/vitest.setup";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

describe("useAppFrameMetrics — sidebarWidth vs. real viewport", () => {
  it("reports sidebarWidth 0 below the lg breakpoint, even though the sidebar context has a nonzero width", () => {
    setTestViewportWidth(390); // phone-width — sidebar is "hidden lg:flex", off-canvas
    const { result } = renderHook(() => useAppFrameMetrics(), { wrapper });
    expect(result.current.sidebarWidth).toBe(0);
  });

  it("reports the real sidebarWidth at and above the lg breakpoint", () => {
    setTestViewportWidth(1280); // desktop — sidebar is actually on-screen
    const { result } = renderHook(() => useAppFrameMetrics(), { wrapper });
    expect(result.current.sidebarWidth).toBeGreaterThan(0);
  });

  it("updates sidebarWidth live when the viewport crosses the lg breakpoint", () => {
    setTestViewportWidth(1280);
    const { result } = renderHook(() => useAppFrameMetrics(), { wrapper });
    expect(result.current.sidebarWidth).toBeGreaterThan(0);

    act(() => setTestViewportWidth(500));
    expect(result.current.sidebarWidth).toBe(0);

    act(() => setTestViewportWidth(1440));
    expect(result.current.sidebarWidth).toBeGreaterThan(0);
  });
});
