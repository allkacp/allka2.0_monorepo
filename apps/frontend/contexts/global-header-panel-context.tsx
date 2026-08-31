/**
 * Coordena os painéis globais do cabeçalho (Cesta, Notificações, Alertas,
 * Ajuda — todos usam <HeaderSlideScreen>, a Tela Slide) pra só um ficar
 * aberto por vez. Sem isso cada um tinha seu próprio estado isolado e dava
 * pra abrir vários empilhados ao mesmo tempo.
 *
 * "alerts" (lote de correção visual, ata 2026-08): Alertas passou a ser um
 * painel de verdade separado de Notificações (chave própria aqui), não mais
 * uma aba dentro do painel de notificações — abrir um agora fecha o outro
 * automaticamente, de graça, por já usarem esta mesma central de exclusão.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

export type GlobalHeaderPanelKey = "cesta" | "notifications" | "alerts" | "product-feedback";

interface GlobalHeaderPanelContextValue {
  isActive: (key: GlobalHeaderPanelKey) => boolean;
  openPanel: (key: GlobalHeaderPanelKey) => void;
  closePanel: (key: GlobalHeaderPanelKey) => void;
}

const GlobalHeaderPanelContext =
  createContext<GlobalHeaderPanelContextValue | null>(null);

export function GlobalHeaderPanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<GlobalHeaderPanelKey | null>(null);

  return (
    <GlobalHeaderPanelContext.Provider
      value={{
        isActive: (key) => activePanel === key,
        openPanel: (key) => setActivePanel(key),
        closePanel: (key) =>
          setActivePanel((prev) => (prev === key ? null : prev)),
      }}
    >
      {children}
    </GlobalHeaderPanelContext.Provider>
  );
}

export function useGlobalHeaderPanel() {
  const ctx = useContext(GlobalHeaderPanelContext);
  if (!ctx) {
    throw new Error(
      "useGlobalHeaderPanel must be used within a GlobalHeaderPanelProvider",
    );
  }
  return ctx;
}
