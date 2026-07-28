// @ts-nocheck
/**
 * Estado global mínimo do painel de Notificações — precisa viver fora do
 * Header porque o pin da Bandeja de Telas (reaberto de qualquer página)
 * precisa conseguir abrir o painel sem depender do Header estar "dono" do
 * estado local. Mesmo papel que ProjectBasketProvider cumpre pra Cesta.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import { useGlobalHeaderPanel } from "@/contexts/global-header-panel-context";

interface NotificationsPanelContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  tab: "inbox" | "notifications";
  setTab: (t: "inbox" | "notifications") => void;
}

const NotificationsPanelContext =
  createContext<NotificationsPanelContextValue | null>(null);

export function NotificationsPanelProvider({ children }: { children: ReactNode }) {
  const { isActive, openPanel, closePanel } = useGlobalHeaderPanel();
  const open = isActive("notifications");
  const setOpen = (v: boolean) =>
    v ? openPanel("notifications") : closePanel("notifications");
  const [tab, setTab] = useState<"inbox" | "notifications">("inbox");
  return (
    <NotificationsPanelContext.Provider value={{ open, setOpen, tab, setTab }}>
      {children}
    </NotificationsPanelContext.Provider>
  );
}

export function useNotificationsPanel() {
  const ctx = useContext(NotificationsPanelContext);
  if (!ctx) {
    throw new Error(
      "useNotificationsPanel must be used within a NotificationsPanelProvider",
    );
  }
  return ctx;
}
