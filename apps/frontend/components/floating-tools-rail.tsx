import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
const RailHost = createContext<HTMLElement | null | undefined>(undefined);

/** Só os gatilhos vão para a coluna. Painéis e botões mobile permanecem onde estavam. */
export function FloatingToolsRail({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return <RailHost.Provider value={host}>
    {children}
    <div ref={setHost} aria-label="Ferramentas da plataforma" data-testid="floating-tools-rail" className="hidden lg:flex fixed top-[125px] right-[8px] z-65 w-9 flex-col gap-1" />
  </RailHost.Provider>;
}
export function FloatingToolSlot({ children, className, order, fallbackTop }: { children: ReactNode; className?: string; order: number; fallbackTop: number }) {
  const host = useContext(RailHost);
  const node = <div className={className} data-floating-tool-order={order} style={{ order }}>{children}</div>;
  if (host === undefined) return <div className={`fixed right-[8px] z-65 ${className ?? ""}`} style={{ top: fallbackTop }}>{children}</div>;
  return host ? createPortal(node, host) : null;
}
