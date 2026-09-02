"use client";

/**
 * Onboarding: tour guiado (sprint de onboarding, bloco 1/3).
 *
 * Provider único, montado no AppLayout — orquestra a oferta automática no
 * primeiro acesso (janela de boas-vindas), o motor do tour em si (via
 * TourRunner) e o estado que a Central de Ajuda ("Tours da plataforma") lê
 * pra listar/retomar/refazer. Progresso é sempre persistido no servidor
 * (nunca só localStorage) — funciona em outro navegador/dispositivo.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiClient, type TourProgressDto } from "@/lib/api-client";
import { TOURS, toursForAccountType } from "@/lib/tours/registry";
import type { TourDefinition } from "@/lib/tours/types";
import { TourRunner } from "@/components/onboarding/tour-runner";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";

interface ActiveTourState {
  tour: TourDefinition;
  startStepId: string | null;
}

interface OnboardingContextValue {
  loading: boolean;
  accountType: string | null;
  /** Tours elegíveis pro perfil atual + progresso já conhecido de cada um. */
  availableTours: TourDefinition[];
  progressFor: (tourKey: string) => TourProgressDto | null;
  requestStartTour: (tourKey: string) => void;
  requestRestartTour: (tourKey: string) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    // Fora do provider (ex.: rota fora do AppLayout, como login) — devolve
    // um estado inerte em vez de derrubar a página.
    return { loading: false, accountType: null, availableTours: [], progressFor: () => null, requestStartTour: () => {}, requestRestartTour: () => {} };
  }
  return ctx;
}

// Alvo do primeiro passo do primeiro tour elegível — a janela de boas-vindas
// só se oferece depois que ele existir de verdade no DOM (nunca um timeout
// arbitrário como única sincronização).
function firstStepTargetExists(tour: TourDefinition): boolean {
  const first = tour.steps.find((s) => s.target !== null);
  if (!first?.target) return true; // tour só com passos centrais
  return Boolean(document.querySelector(`[data-tour-id="${CSS.escape(first.target)}"]`));
}

function isOfferable(progress: TourProgressDto | null): boolean {
  if (!progress) return true; // nunca decidido
  if (progress.status === "adiado") {
    return Boolean(progress.postponed_until) && new Date(progress.postponed_until as string).getTime() <= Date.now();
  }
  // concluído/dispensado: nunca reabre sozinho — só manualmente pela Ajuda.
  // em_andamento: não reabre o overlay sozinho de novo (evita surpreender a
  // pessoa no meio de outra tela) — retomar é uma ação deliberada pela Ajuda.
  return false;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [progress, setProgress] = useState<TourProgressDto[]>([]);
  const [welcomeTour, setWelcomeTour] = useState<TourDefinition | null>(null);
  const [active, setActive] = useState<ActiveTourState | null>(null);
  const offeredRef = useRef(false);

  const refreshProgress = useCallback(async () => {
    try {
      const res = await apiClient.listTourProgress();
      setProgress(res.data ?? []);
    } catch {
      // silencioso — tenta de novo na próxima ação; nunca quebra o shell por causa disto
    }
  }, []);

  // Carrega usuário real + progresso uma vez que o shell está de pé.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await apiClient.getCurrentUser();
        if (cancelled) return;
        setAccountType(user?.account_type ?? null);
        await refreshProgress();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressFor = useCallback(
    (tourKey: string): TourProgressDto | null => {
      const tour = TOURS.find((t) => t.key === tourKey);
      if (!tour) return null;
      return progress.find((p) => p.tour_key === tourKey && p.version === tour.version) ?? null;
    },
    [progress],
  );

  const availableTours = accountType ? toursForAccountType(accountType) : [];

  // Oferta automática no primeiro acesso: espera o shell + o alvo do
  // primeiro passo existirem de verdade, nunca abre em cima de um banner
  // obrigatório pendente, nunca duas vezes na mesma sessão.
  useEffect(() => {
    if (loading || offeredRef.current || !accountType) return;
    const candidate = availableTours.find((t) => isOfferable(progressFor(t.key)));
    if (!candidate) return;

    let cancelled = false;
    let attempts = 0;
    const tryOffer = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!firstStepTargetExists(candidate)) {
        if (attempts < 30) setTimeout(tryOffer, 200); // aguarda a montagem real, nunca um timeout único arbitrário
        return;
      }
      try {
        const banners = await apiClient.getMyMandatoryBanners();
        if ((banners?.data?.length ?? 0) > 0) {
          if (attempts < 30) setTimeout(tryOffer, 1000); // banner obrigatório tem prioridade — tenta de novo depois
          return;
        }
      } catch {
        // se a checagem falhar, segue com cautela (não bloqueia pra sempre)
      }
      if (cancelled) return;
      offeredRef.current = true;
      setWelcomeTour(candidate);
    };
    void tryOffer();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, accountType, progress]);

  const beginTour = useCallback((tour: TourDefinition, startStepId: string | null) => {
    setWelcomeTour(null);
    setActive({ tour, startStepId });
  }, []);

  const requestStartTour = useCallback(
    (tourKey: string) => {
      const tour = TOURS.find((t) => t.key === tourKey);
      if (!tour) return;
      const existing = progressFor(tourKey);
      void apiClient.startTour(tourKey, tour.version).then(() => {
        void refreshProgress();
        beginTour(tour, existing?.last_step_key ?? null);
      });
    },
    [progressFor, refreshProgress, beginTour],
  );

  const requestRestartTour = useCallback(
    (tourKey: string) => {
      const tour = TOURS.find((t) => t.key === tourKey);
      if (!tour) return;
      void apiClient.restartTour(tourKey, tour.version).then(() => {
        void refreshProgress();
        beginTour(tour, null);
      });
    },
    [refreshProgress, beginTour],
  );

  const handleStepChange = useCallback(
    (stepId: string) => {
      if (!active) return;
      void apiClient.saveTourStep(active.tour.key, active.tour.version, stepId).then(() => refreshProgress());
    },
    [active, refreshProgress],
  );

  const handleComplete = useCallback(() => {
    if (!active) return;
    void apiClient.completeTour(active.tour.key, active.tour.version).then(() => refreshProgress());
    setActive(null);
  }, [active, refreshProgress]);

  const handleExit = useCallback(() => {
    // Progresso do passo atual já foi salvo pelo último onStepChange —
    // sair nunca marca como concluído.
    setActive(null);
  }, []);

  const handleWelcomeStart = useCallback(() => {
    if (!welcomeTour) return;
    const tour = welcomeTour;
    void apiClient.startTour(tour.key, tour.version).then(() => refreshProgress());
    beginTour(tour, null);
  }, [welcomeTour, refreshProgress, beginTour]);

  const handleWelcomePostpone = useCallback(() => {
    if (!welcomeTour) return;
    void apiClient.postponeTour(welcomeTour.key, welcomeTour.version).then(() => refreshProgress());
    setWelcomeTour(null);
  }, [welcomeTour, refreshProgress]);

  const handleWelcomeDismiss = useCallback(() => {
    if (!welcomeTour) return;
    void apiClient.dismissTour(welcomeTour.key, welcomeTour.version).then(() => refreshProgress());
    setWelcomeTour(null);
  }, [welcomeTour, refreshProgress]);

  return (
    <OnboardingContext.Provider value={{ loading, accountType, availableTours, progressFor, requestStartTour, requestRestartTour }}>
      {children}
      {welcomeTour && (
        <WelcomeModal tour={welcomeTour} onStart={handleWelcomeStart} onPostpone={handleWelcomePostpone} onDismiss={handleWelcomeDismiss} />
      )}
      {active && (
        <TourRunner
          tour={active.tour}
          startStepId={active.startStepId}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      )}
    </OnboardingContext.Provider>
  );
}
