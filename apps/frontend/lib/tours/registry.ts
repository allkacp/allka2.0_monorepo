import type { TourDefinition } from "./types";

// ─── Registro central de tours (bloco 1/3) ──────────────────────────────────
// Só o tour piloto neste bloco — os tours detalhados de Produtos, Legacy,
// Checkout, Memória, IA, Lançamento, Grupos e Monitoramento ficam para os
// blocos 2 e 3 do sprint de onboarding.

export const TOURS: TourDefinition[] = [
  {
    key: "primeiros-passos",
    version: 1,
    title: "Primeiros passos na Allka",
    description: "Um tour rápido pelos principais recursos disponíveis para o seu perfil.",
    // Sem allowedAccountTypes: disponível pra todo perfil — cada passo se
    // auto-filtra pela existência real do elemento (ver optional abaixo).
    steps: [
      {
        id: "main-navigation",
        target: "main-navigation",
        title: "Navegação principal",
        description: "Aqui ficam os principais menus e telas do seu perfil.",
        placement: "right",
      },
      {
        id: "global-search",
        target: "global-search",
        title: "Busca",
        description: "Use a busca para encontrar rapidamente o que precisa.",
        placement: "bottom",
        optional: true, // nem todo portal tem busca global hoje
      },
      {
        id: "notifications-button",
        target: "notifications-button",
        title: "Notificações",
        description: "Avisos informativos sobre o que aconteceu — como uma tarefa ter sido liberada para execução.",
        placement: "bottom",
      },
      {
        id: "alerts-button",
        target: "alerts-button",
        title: "Alertas",
        description: "Diferente das Notificações: aqui ficam os itens que pedem atenção ou uma decisão sua.",
        placement: "bottom",
      },
      {
        id: "user-profile-menu",
        target: "user-profile-menu",
        title: "Seu perfil",
        description: "Acesse seus dados, configurações e opções da conta.",
        placement: "bottom",
      },
      {
        id: "help-button",
        target: "help-button",
        title: "Ajuda",
        description: "Volte aqui sempre que quiser repetir este ou outros tours da plataforma.",
        placement: "left",
      },
    ],
  },
];

export function findTour(key: string): TourDefinition | undefined {
  return TOURS.find((t) => t.key === key);
}

export function toursForAccountType(accountType: string): TourDefinition[] {
  return TOURS.filter((t) => !t.allowedAccountTypes || t.allowedAccountTypes.includes(accountType as any));
}
