// Menu já resolvido pela barra lateral (permissões, Admin Master, Partner, tarefas internas, navegador seguro,
// Roadmap e a ordem que o usuário escolheu). O menu "Mais" do celular lê daqui para mostrar EXATAMENTE os mesmos
// itens do desktop — antes ele tinha uma lista própria, desatualizada e com contadores de demonstração.
import { useSyncExternalStore } from "react";
import type { ComponentType } from "react";

export type NavItem = {
  name: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: string;
  openInNewTab?: boolean;
  subitems?: NavItem[];
};

let current: NavItem[] = [];
const listeners = new Set<() => void>();

/** Assinatura estável do menu (nome, destino, contador e subitens) — publica só quando muda de verdade. */
export function navigationSignature(items: NavItem[]): string {
  return JSON.stringify(items.map((item) => [item.name, item.href ?? null, item.badge ?? null, !!item.openInNewTab, (item.subitems ?? []).map((sub) => [sub.name, sub.href ?? null, sub.badge ?? null])]));
}

export function publishNavigation(items: NavItem[]) {
  current = items;
  listeners.forEach((listener) => listener());
}

export function useResolvedNavigation(): NavItem[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}
