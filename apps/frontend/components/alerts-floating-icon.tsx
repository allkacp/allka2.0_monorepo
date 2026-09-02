/**
 * AlertsFloatingIcon — acionador de Alertas na barra vertical de ferramentas
 * do lado direito (desktop), junto dos outros ícones dessa barra (chat,
 * bandeja de telas, modo escuro, fonte, ajuda). Mesma família visual desses
 * ícones (ver product-feedback-widget.tsx/header-floating-tools.tsx).
 *
 * Correção pedida pelo responsável (ata 2026-08, revisão visual): Alertas
 * estava ao lado do sino no cabeçalho — precisa ficar na barra direita, com
 * ícone diferente do sino, contador exclusivo e painel exclusivo (AlertsPanel,
 * nunca mais uma aba dentro do painel de Notificações).
 *
 * Indicador de criticidade (ata 2026-08, bloco "interface e usabilidade"):
 * o ícone reflete a MAIOR severidade ativa do usuário —
 * Vermelho > Amarelo > Verde > Neutro. Nunca laranja no amarelo. A cor vale
 * pro ícone, pra badge e pro fundo (mobile). Pulso discreto (motion-safe,
 * respeita prefers-reduced-motion; some quando o painel está aberto). A
 * criticidade NUNCA é comunicada só pela cor: badge com contador + ícone +
 * aria-label/title sempre presentes.
 *
 * Em mobile, onde a barra direita fica escondida (breakpoint < lg), usa o
 * mesmo padrão de botão flutuante redondo já estabelecido pelo "Ajuda e
 * sugestões" — empilhado acima dele, nunca os dois ícones (desktop/mobile)
 * visíveis ao mesmo tempo (alternam por breakpoint, igual ao padrão existente).
 */
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AlertsPanel } from "@/components/alerts-panel";
import { useGlobalHeaderPanel } from "@/contexts/global-header-panel-context";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type CriticalityLevel = "neutro" | "verde" | "amarelo" | "vermelho";

const CRITICALITY_LABEL: Record<CriticalityLevel, string> = {
  neutro: "Nenhuma",
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

// Prioridade Vermelho > Amarelo > Verde > Neutro. `count` é o total de
// alertas ativos (não lidos, não arquivados, não resolvidos) — quando é 0 o
// estado é sempre neutro, mesmo que o backend não mande `bySeverity`.
function highestCriticality(
  count: number,
  bySeverity?: { info?: number; warning?: number; error?: number } | null,
): CriticalityLevel {
  if (count <= 0) return "neutro";
  if ((bySeverity?.error ?? 0) > 0) return "vermelho";
  if ((bySeverity?.warning ?? 0) > 0) return "amarelo";
  if ((bySeverity?.info ?? 0) > 0) return "verde";
  return "amarelo"; // count>0 sem detalhamento: trata como atenção, nunca neutro
}

// Só cor — nada de laranja no amarelo. Cada nível tem cor pra ícone e badge.
const ICON_COLOR: Record<CriticalityLevel, string> = {
  neutro: "text-white/70 group-hover:text-white",
  verde: "text-emerald-400",
  amarelo: "text-yellow-400",
  vermelho: "text-red-400",
};
const BADGE_COLOR: Record<CriticalityLevel, string> = {
  neutro: "bg-slate-500",
  verde: "bg-emerald-500",
  amarelo: "bg-yellow-500",
  vermelho: "bg-red-500",
};
const MOBILE_BG: Record<CriticalityLevel, string> = {
  neutro: "linear-gradient(135deg, #0a1628, #1e3a8a, #0a1628)",
  verde: "linear-gradient(135deg, #065f46, #10b981, #065f46)",
  amarelo: "linear-gradient(135deg, #854d0e, #eab308, #854d0e)",
  vermelho: "linear-gradient(135deg, #dc2626, #7f1d1d)",
};

export function AlertsFloatingIcon() {
  const { isActive, openPanel, closePanel } = useGlobalHeaderPanel();
  const open = isActive("alerts");
  const setOpen = (v: boolean) => (v ? openPanel("alerts") : closePanel("alerts"));

  // Contador exclusivo de alertas — nunca soma notificação (camada
  // compartilhada já existente: GET /system-alerts/unread-count?category=,
  // um único polling aqui, não duplica o que o sino já faz para notificação).
  const [unreadCount, setUnreadCount] = useState(0);
  const [bySeverity, setBySeverity] = useState<{ info?: number; warning?: number; error?: number } | null>(null);
  useEffect(() => {
    const fetchCount = () => {
      apiClient
        .getUnreadSystemAlertsCount({ category: "alerta" })
        .then((r) => {
          setUnreadCount(r?.count ?? 0);
          setBySeverity(r?.bySeverity ?? null);
        })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, []);

  const criticality = highestCriticality(unreadCount, bySeverity);
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);
  // Pulso discreto só quando há alerta ativo, o painel está fechado, e o
  // usuário não pediu redução de movimento (motion-safe). Fora disso: só
  // cor + badge estáticos.
  const pulse = criticality !== "neutro" && !open && "motion-safe:animate-pulse";
  const ariaLabel =
    unreadCount > 0
      ? `Alertas: você possui ${unreadCount} alerta${unreadCount === 1 ? "" : "s"}. Maior criticidade: ${CRITICALITY_LABEL[criticality]}.`
      : "Alertas — nenhum ativo";

  return (
    <>
      {/* Desktop — barra vertical direita, mesma coluna dos outros ícones. */}
      <div className="hidden lg:block fixed top-[285px] right-[8px] z-65 group">
        <button
          type="button"
          data-tour-id="alerts-button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          title={ariaLabel}
          className="relative flex items-center justify-center h-10 w-10 transition-colors"
        >
          <AlertTriangle className={cn("h-5 w-5 shrink-0 transition-colors", ICON_COLOR[criticality], pulse)} />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full text-white text-[9px] font-bold leading-none pointer-events-none",
                BADGE_COLOR[criticality],
              )}
            >
              {badgeText}
            </span>
          )}
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
          Alertas
        </span>
      </div>

      {/* Mobile/tablet — mesmo padrão do botão flutuante redondo de "Ajuda e
          sugestões", empilhado acima dele (mesma posição right-4, bottom
          maior). Nunca aparece junto do ícone desktop (breakpoints
          mutuamente exclusivos: hidden lg:block acima, lg:hidden aqui — "lg"
          e não "xl" de propósito, pra casar exatamente com mobile-bottom-nav
          (lg:hidden) e não deixar uma faixa morta entre lg e xl sem nenhum
          dos dois gatilhos, mesmo raciocínio já documentado em
          product-feedback-widget.tsx). */}
      <button
        type="button"
        data-tour-id="alerts-button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className="lg:hidden fixed right-4 z-45 flex items-center justify-center h-14 w-14 rounded-full text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] active:scale-95 transition-transform"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 88px)",
          background: MOBILE_BG[criticality],
        }}
      >
        <AlertTriangle className={cn("h-6 w-6 shrink-0", pulse)} />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute top-0 right-0 min-w-5 h-5 px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none border-2 border-white/90",
              BADGE_COLOR[criticality],
            )}
          >
            {badgeText}
          </span>
        )}
      </button>

      <AlertsPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
