"use client";

/**
 * Onboarding: tour guiado (sprint de onboarding, blocos 1-2/3).
 *
 * Provider único, montado no AppLayout — orquestra a oferta automática no
 * primeiro acesso (janela de boas-vindas), a oferta contextual por módulo
 * (quando a pessoa entra numa rota pela primeira vez), o motor do tour em si
 * (via TourRunner) e o estado que a Central de Ajuda lê pra listar/retomar/
 * refazer. Progresso é sempre persistido no servidor (nunca só localStorage)
 * — funciona em outro navegador/dispositivo.
 *
 * Elegibilidade (perfil + permissão real + rota + elemento) é decidida em UM
 * lugar só (`isTourEligible`) — Central de Ajuda, oferta automática, oferta
 * contextual e o próprio motor do tour em andamento consultam a MESMA
 * função, nunca uma segunda checagem que possa divergir.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient, type TourProgressDto } from "@/lib/api-client";
import { TOURS } from "@/lib/tours/registry";
import { isTourEligible } from "@/lib/tours/eligibility";
import type { TourDefinition, TourEligibilityContext } from "@/lib/tours/types";
import { TourRunner } from "@/components/onboarding/tour-runner";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { ContextualOfferModal } from "@/components/onboarding/contextual-offer-modal";

interface ActiveTourState {
  tour: TourDefinition;
  startStepId: string | null;
}

interface AdminProfileState {
  is_active?: boolean;
  is_master?: boolean;
  permissions?: { module: string; action: string }[];
}

interface OnboardingContextValue {
  loading: boolean;
  accountType: string | null;
  /** Tours elegíveis pro perfil/permissão atuais (Central de Ajuda lê daqui — nunca uma segunda lista). */
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

export { isTourEligible };

function matchesRoute(tour: TourDefinition, pathname: string): boolean {
  if (tour.routes.length === 0) return true; // sem rota associada (ex.: primeiros-passos) — sempre "na rota certa"
  return tour.routes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Alvo do primeiro passo (ou do passo de retomada) — só oferece/inicia
// depois que ele existir de verdade no DOM (nunca um timeout arbitrário
// como única sincronização).
function stepTargetExists(tour: TourDefinition, stepId: string | null): boolean {
  const step = stepId ? tour.steps.find((s) => s.id === stepId) : tour.steps.find((s) => s.target !== null);
  if (!step?.target) return true; // passo central, ou tour só com passos centrais
  return Boolean(document.querySelector(`[data-tour-id="${CSS.escape(step.target)}"]`));
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

// Nunca abre em cima de outro modal/confirmação já aberto — heurística
// genérica sobre a convenção real (Radix Dialog/AlertDialog, usada em toda
// a plataforma pros modais de confirmação), em vez de uma lista de
// exceções que ficaria desatualizada.
function anotherDialogIsOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'));
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfileState | null>(null);
  const [progress, setProgress] = useState<TourProgressDto[]>([]);
  const [welcomeTour, setWelcomeTour] = useState<TourDefinition | null>(null);
  const [contextualTour, setContextualTour] = useState<TourDefinition | null>(null);
  const [active, setActive] = useState<ActiveTourState | null>(null);
  const [pendingStart, setPendingStart] = useState<{ tour: TourDefinition; startStepId: string | null; mode: "start" | "restart" } | null>(null);
  const offeredFirstAccessRef = useRef(false);
  const offeredContextualRef = useRef<Set<string>>(new Set());
  // "Só uma oferta por vez": as duas ofertas automáticas (primeiro acesso e
  // contextual) rodam em efeitos INDEPENDENTES, cada uma com seu próprio
  // laço de espera assíncrono — sem isso, as duas poderiam terminar de
  // esperar quase ao mesmo tempo e mostrar as duas juntas. Uma ref
  // (síncrona, nunca depende de um re-render pra refletir) é reivindicada
  // no exato instante de decidir mostrar algo — a segunda tentativa sempre
  // perde, mesmo que as duas cheguem no mesmo tick.
  const overlayClaimedRef = useRef(false);

  const refreshProgress = useCallback(async () => {
    try {
      const res = await apiClient.listTourProgress();
      setProgress(res.data ?? []);
    } catch {
      // silencioso — tenta de novo na próxima ação; nunca quebra o shell por causa disto
    }
  }, []);

  // Busca o usuário/perfil real de novo (nunca confia num valor guardado
  // antigo pra decidir permissão) — usada tanto na carga inicial quanto pra
  // reavaliar um tour em andamento a cada troca de rota, porque uma
  // permissão pode ter sido revogada por outro admin enquanto a pessoa
  // navegava.
  const refreshUser = useCallback(async () => {
    try {
      const user = await apiClient.getCurrentUser();
      setAccountType(user?.account_type ?? null);
      setAdminProfile(user?.admin_profile ?? null);
      return { accountType: user?.account_type ?? null, adminProfile: user?.admin_profile ?? null };
    } catch {
      return null;
    }
  }, []);

  // Carrega usuário real + progresso uma vez que o shell está de pé.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshUser();
        if (cancelled) return;
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

  const eligibilityCtx: TourEligibilityContext | null = accountType ? { accountType, adminProfile } : null;

  const progressFor = useCallback(
    (tourKey: string): TourProgressDto | null => {
      const tour = TOURS.find((t) => t.key === tourKey);
      if (!tour) return null;
      return progress.find((p) => p.tour_key === tourKey && p.version === tour.version) ?? null;
    },
    [progress],
  );

  const availableTours = useMemo(
    () => (eligibilityCtx ? TOURS.filter((t) => isTourEligible(t, eligibilityCtx)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eligibilityCtx?.accountType, eligibilityCtx?.adminProfile],
  );

  // Oferta automática no primeiro acesso (tour "primeiros-passos", sem rota
  // associada): espera o shell + o alvo do primeiro passo existirem de
  // verdade, nunca abre em cima de um banner obrigatório ou outro modal.
  useEffect(() => {
    if (loading || offeredFirstAccessRef.current || !eligibilityCtx) return;
    // Só o(s) tour(s) da categoria "primeiros-passos" são oferecidos
    // automaticamente no primeiro acesso — os demais tours sem rota (Alertas
    // e Notificações, Grupos, Canais, Memória, IA de Lançamento...) vivem
    // dentro de painéis/modais globais sem uma tela própria pra "entrar pela
    // primeira vez" — ficam disponíveis só pela Central de Ajuda, nunca
    // ofertados sozinhos.
    const candidate = availableTours.find((t) => t.category === "primeiros-passos" && isOfferable(progressFor(t.key)));
    if (!candidate) return;

    let cancelled = false;
    let attempts = 0;
    const tryOffer = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!stepTargetExists(candidate, null) || anotherDialogIsOpen()) {
        if (attempts < 30) setTimeout(tryOffer, 200);
        return;
      }
      try {
        const banners = await apiClient.getMyMandatoryBanners();
        if ((banners?.data?.length ?? 0) > 0) {
          if (attempts < 30) setTimeout(tryOffer, 1000);
          return;
        }
      } catch {
        // se a checagem falhar, segue com cautela (não bloqueia pra sempre)
      }
      if (cancelled || overlayClaimedRef.current) return; // outra oferta já reivindicou o slot neste mesmo instante
      overlayClaimedRef.current = true;
      offeredFirstAccessRef.current = true;
      setWelcomeTour(candidate);
    };
    void tryOffer();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, eligibilityCtx, progress]);

  // Oferta contextual por módulo: quando a rota atual bate com a de um tour
  // elegível ainda sem decisão, oferece uma vez por sessão (nunca a cada
  // navegação) — nunca em cima de boas-vindas, outro tour ativo, banner
  // obrigatório ou qualquer outro modal/confirmação aberto, nunca
  // interrompendo uma ação em andamento.
  useEffect(() => {
    if (loading || !eligibilityCtx || welcomeTour || active || contextualTour || pendingStart) return;
    const candidate = availableTours.find(
      (t) => t.routes.length > 0 && matchesRoute(t, location.pathname) && !offeredContextualRef.current.has(t.key) && isOfferable(progressFor(t.key)),
    );
    if (!candidate) return;

    let cancelled = false;
    let attempts = 0;
    const tryOffer = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!stepTargetExists(candidate, null) || anotherDialogIsOpen()) {
        if (attempts < 15) setTimeout(tryOffer, 300);
        return;
      }
      try {
        const banners = await apiClient.getMyMandatoryBanners();
        if ((banners?.data?.length ?? 0) > 0) return; // não insiste indefinidamente pra uma oferta contextual (menos prioritária que o primeiro acesso)
      } catch {
        // segue com cautela
      }
      if (cancelled || overlayClaimedRef.current) return; // outra oferta já reivindicou o slot neste mesmo instante
      overlayClaimedRef.current = true;
      offeredContextualRef.current.add(candidate.key);
      setContextualTour(candidate);
    };
    void tryOffer();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, eligibilityCtx, location.pathname, progress, welcomeTour, active, contextualTour, pendingStart]);

  // Reavalia elegibilidade do tour EM ANDAMENTO a cada troca de rota — busca
  // o perfil de novo no servidor (nunca confia no valor já guardado: uma
  // permissão pode ter sido revogada por outro admin enquanto a pessoa
  // navegava) e encerra com segurança se não autorizar mais, em vez de
  // deixar o motor tentando avançar num passo não mais permitido.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void refreshUser().then((fresh) => {
      if (cancelled || !fresh?.accountType) return;
      if (!isTourEligible(active.tour, { accountType: fresh.accountType, adminProfile: fresh.adminProfile })) {
        setActive(null);
      }
    });
    return () => {
      cancelled = true;
    };
    // location.key (não só pathname) — muda em toda navegação, inclusive
    // pra uma URL "parecida" (mesmo pathname, querystring diferente), que é
    // exatamente o tipo de navegação usado pra forçar uma nova checagem sem
    // sair da tela do módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tour.key, location.key]);

  const beginNow = useCallback((tour: TourDefinition, startStepId: string | null) => {
    overlayClaimedRef.current = false; // o motor do tour em si (`active`) já é seu próprio guard nas ofertas automáticas
    setWelcomeTour(null);
    setContextualTour(null);
    setPendingStart(null);
    setActive({ tour, startStepId });
  }, []);

  // Início real (via Ajuda) pode exigir navegar pra rota do módulo antes:
  // nunca começa o motor sem o alvo do passo já montado, e nunca navega sem
  // que a pessoa tenha pedido explicitamente (clicando Começar/Continuar).
  useEffect(() => {
    if (!pendingStart) return;
    const { tour, startStepId, mode } = pendingStart;
    if (!matchesRoute(tour, location.pathname)) {
      const dest = tour.initialRoute ?? tour.routes[0];
      if (dest) navigate(dest);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryBegin = async () => {
      if (cancelled) return;
      attempts += 1;
      if (!stepTargetExists(tour, startStepId)) {
        if (attempts < 30) setTimeout(tryBegin, 200);
        return;
      }
      if (cancelled) return;
      const apiCall = mode === "restart" ? apiClient.restartTour(tour.key, tour.version) : apiClient.startTour(tour.key, tour.version);
      await apiCall;
      void refreshProgress();
      if (!cancelled) beginNow(tour, mode === "restart" ? null : startStepId);
    };
    void tryBegin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStart, location.pathname]);

  const requestStartTour = useCallback(
    (tourKey: string) => {
      const tour = TOURS.find((t) => t.key === tourKey);
      if (!tour) return;
      const existing = progressFor(tourKey);
      setPendingStart({ tour, startStepId: existing?.last_step_key ?? null, mode: "start" });
    },
    [progressFor],
  );

  const requestRestartTour = useCallback((tourKey: string) => {
    const tour = TOURS.find((t) => t.key === tourKey);
    if (!tour) return;
    setPendingStart({ tour, startStepId: null, mode: "restart" });
  }, []);

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
    beginNow(tour, null);
  }, [welcomeTour, refreshProgress, beginNow]);

  const handleWelcomePostpone = useCallback(() => {
    if (!welcomeTour) return;
    void apiClient.postponeTour(welcomeTour.key, welcomeTour.version).then(() => refreshProgress());
    overlayClaimedRef.current = false;
    setWelcomeTour(null);
  }, [welcomeTour, refreshProgress]);

  const handleWelcomeDismiss = useCallback(() => {
    if (!welcomeTour) return;
    void apiClient.dismissTour(welcomeTour.key, welcomeTour.version).then(() => refreshProgress());
    overlayClaimedRef.current = false;
    setWelcomeTour(null);
  }, [welcomeTour, refreshProgress]);

  const handleContextualStart = useCallback(() => {
    if (!contextualTour) return;
    const tour = contextualTour;
    void apiClient.startTour(tour.key, tour.version).then(() => refreshProgress());
    beginNow(tour, null);
  }, [contextualTour, refreshProgress, beginNow]);

  const handleContextualPostpone = useCallback(() => {
    if (!contextualTour) return;
    void apiClient.postponeTour(contextualTour.key, contextualTour.version).then(() => refreshProgress());
    overlayClaimedRef.current = false;
    setContextualTour(null);
  }, [contextualTour, refreshProgress]);

  const handleContextualDismiss = useCallback(() => {
    if (!contextualTour) return;
    void apiClient.dismissTour(contextualTour.key, contextualTour.version).then(() => refreshProgress());
    overlayClaimedRef.current = false;
    setContextualTour(null);
  }, [contextualTour, refreshProgress]);

  return (
    <OnboardingContext.Provider value={{ loading, accountType, availableTours, progressFor, requestStartTour, requestRestartTour }}>
      {children}
      {welcomeTour && (
        <WelcomeModal tour={welcomeTour} onStart={handleWelcomeStart} onPostpone={handleWelcomePostpone} onDismiss={handleWelcomeDismiss} />
      )}
      {contextualTour && (
        <ContextualOfferModal
          tour={contextualTour}
          onStart={handleContextualStart}
          onPostpone={handleContextualPostpone}
          onDismiss={handleContextualDismiss}
        />
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
