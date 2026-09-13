/**
 * IAllka — ícone flutuante global (reunião 10/09, "assistente IAllka — ícone
 * e ajuda contextual"). Mesma família visual/posicional dos outros ícones
 * flutuantes (AlertsFloatingIcon, ProductFeedbackWidget, HelpFloatingIcon):
 * barra vertical direita fixa em desktop (`right-[8px] z-65`), botão
 * circular empilhado em mobile (`right-4 z-45`) — próximo slot livre da
 * coluna (depois de Feedback 245px / Alertas 285px / Ajuda 325px → aqui
 * 365px; mobile depois de +12/+88/+164 → aqui +240), pra nunca ficar atrás
 * do container nem sobrepor outro ícone (auditoria desta reunião).
 *
 * Usa a Aura e o símbolo oficial aprovados pelo responsável em 12/09/2026 —
 * nunca um ícone genérico igual ao de Chat/Alertas/Ajuda/Sugestões.
 */
import { useEffect, useState } from "react";
import { useOnboarding } from "@/contexts/onboarding-context";
import { IallkaAssistantPanel } from "@/components/iallka-assistant-panel";
import { IallkaAuraAvatar } from "@/components/iallka-aura-avatar";
import { apiClient } from "@/lib/api-client";
import { canManageAlertsAdmin } from "@/lib/admin-permissions";

// Correção 2026-09-11 ("acesso da IAllka"): mesma matriz do backend —
// nunca mostrar o ícone pra quem clicaria e só receberia 403 (Admin comum,
// Léder, Nômade). Company/Agency/Partner (Agency com PartnerProfile ativo,
// já coberto por account_type "agencias") e Admin Master veem o ícone.
function useCanUseIallka(): boolean | null {
  const [state, setState] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((user: any) => {
        if (cancelled) return;
        const accountType = user?.account_type;
        const allowed =
          accountType === "empresas" ||
          accountType === "agencias" ||
          (accountType === "admin" && canManageAlertsAdmin(accountType, user?.admin_profile ?? null));
        setState(!!allowed);
      })
      .catch(() => {
        if (!cancelled) setState(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function IallkaFloatingIcon() {
  const [open, setOpen] = useState(false);
  const { progressFor } = useOnboarding();
  const canUse = useCanUseIallka();

  // Badge discreto: some assim que a pessoa abrir a IAllka (ou dispensar o
  // tour pela Central de Ajuda) — nunca reaparece sozinho depois disso.
  const progress = progressFor("iallka-assistente");
  const showBadge = !progress || progress.status === "nao_iniciado" || progress.status === "adiado";

  // Nunca mostra o ícone antes de confirmar acesso (evita um "pisca e some"
  // pra quem não tem acesso) nem pra quem realmente não tem — Admin comum,
  // Léder e Nômade simplesmente não veem nada aqui.
  if (!canUse) return null;

  return (
    <>
      {/* Desktop — barra vertical direita, próximo slot livre da coluna. */}
      <div className="hidden lg:block fixed top-[365px] right-[8px] z-65 group">
        <button
          type="button"
          data-tour-id="iallka-icon-button"
          onClick={() => setOpen(true)}
          aria-label="Falar com a Aura"
          title="Falar com a Aura"
          className="relative flex items-center justify-center h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/25 hover:ring-white/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <IallkaAuraAvatar className="h-full w-full" />
          {showBadge && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a1628]" aria-hidden="true" />
          )}
        </button>
        {/* Prévia só no hover/foco do mouse: Aura maior, sem virar modal nem
            ocupar área de trabalho. A imagem aprovada já tem transparência. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-12 w-44 origin-bottom-right opacity-0 scale-90 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-x-0"
        >
          <div className="rounded-2xl border border-violet-200/70 bg-slate-950/35 p-1 shadow-[0_16px_34px_-12px_rgba(15,23,42,0.65)] backdrop-blur-sm">
            <img
              src="/iallka-aura.png"
              alt=""
              className="block h-44 w-full object-contain object-bottom"
            />
          </div>
        </div>
        <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
          Falar com a Aura
        </span>
      </div>

      {/* Mobile/tablet — botão redondo, próximo degrau empilhado (nunca
          depende de hover, sempre clicável/focável direto). */}
      <button
        type="button"
        data-tour-id="iallka-icon-button"
        onClick={() => setOpen(true)}
        aria-label="Falar com a Aura"
        className="lg:hidden fixed right-4 z-45 flex items-center justify-center h-14 w-14 rounded-full overflow-hidden ring-2 ring-white/40 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 240px)" }}
      >
        <IallkaAuraAvatar className="h-full w-full" />
        {showBadge && (
          <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>

      <IallkaAssistantPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
