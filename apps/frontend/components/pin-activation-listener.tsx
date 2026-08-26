/**
 * Consome ativações da Bandeja de Telas para os painéis GLOBAIS que não são
 * "páginas" (Cesta, Notificações, Alertas) — essas não têm uma rota própria
 * pra useConsumePendingActivation ler dentro de si mesmas, então este
 * listener fica montado uma vez em App.tsx (sempre ativo, independente da
 * rota) e abre o painel certo quando o activateKey correspondente chega.
 *
 * "open-alertas" (correção visual, ata 2026-08): Alertas virou painel
 * próprio (AlertsPanel) com seu próprio pin — usa useGlobalHeaderPanel
 * diretamente (chave "alerts"), já que não tem um contexto dedicado como
 * Notificações (não precisa de "tab" nenhum).
 */
import { useEffect } from "react";
import { useOpenScreens } from "@/contexts/open-screens-context";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { useNotificationsPanel } from "@/contexts/notifications-panel-context";
import { useGlobalHeaderPanel } from "@/contexts/global-header-panel-context";

export function PinActivationListener() {
  const basket = useProjectBasket();
  const notifications = useNotificationsPanel();
  const { openPanel } = useGlobalHeaderPanel();
  // NÃO usar useConsumePendingActivation aqui: aquele hook limpa
  // pendingActivation pra QUALQUER key, mesmo uma que não reconheça. Como
  // este componente fica montado em TODA rota (App.tsx), ele sempre roda
  // antes da página de destino (ex.: /admin/projetos) montar — e "consumia"
  // silenciosamente activateKeys de outras páginas (ex.: "create" do pin de
  // rascunho de projeto), zerando o sinal antes da página alvo conseguir lê-lo.
  // Isso quebrava o "alt-tab" da Bandeja de Telas pra qualquer pin que não
  // fosse Cesta/Notificações. Aqui só reagimos (e só limpamos) às keys que
  // são realmente nossas.
  const { pendingActivation, setPendingActivation } = useOpenScreens();
  useEffect(() => {
    if (pendingActivation === "open-cesta") {
      basket.setOpen(true);
      setPendingActivation(null);
    } else if (pendingActivation === "open-notificacoes") {
      notifications.setOpen(true);
      setPendingActivation(null);
    } else if (pendingActivation === "open-alertas") {
      openPanel("alerts");
      setPendingActivation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActivation]);

  return null;
}
