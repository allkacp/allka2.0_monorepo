import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { LoginRoleConfig, Locale } from "@/components/login-page-template";
import { LoadingWolfGame } from "@/components/loading-wolf-game";

/** Mesma progressão sugerida no pedido original, mapeada pra faixas de %. */
export function loadingMessageFor(percent: number, locale: Locale): string {
  const MESSAGES: Record<Locale, [number, string][]> = {
    pt: [
      [0, "Iniciando sessão..."],
      [20, "Preparando seu ambiente..."],
      [40, "Carregando seus dados..."],
      [65, "Carregando projetos..."],
      [85, "Preparando seu dashboard..."],
      [97, "Quase pronto..."],
    ],
    en: [
      [0, "Starting session..."],
      [20, "Preparing your environment..."],
      [40, "Loading your data..."],
      [65, "Loading projects..."],
      [85, "Preparing your dashboard..."],
      [97, "Almost there..."],
    ],
    es: [
      [0, "Iniciando sesión..."],
      [20, "Preparando tu entorno..."],
      [40, "Cargando tus datos..."],
      [65, "Cargando proyectos..."],
      [85, "Preparando tu panel..."],
      [97, "Casi listo..."],
    ],
    zh: [
      [0, "正在启动会话..."],
      [20, "正在准备您的环境..."],
      [40, "正在加载您的数据..."],
      [65, "正在加载项目..."],
      [85, "正在准备您的仪表盘..."],
      [97, "即将完成..."],
    ],
  };
  const stages = MESSAGES[locale];
  let current = stages[0][1];
  for (const [threshold, msg] of stages) {
    if (percent >= threshold) current = msg;
  }
  return current;
}

const ERROR_TEXT: Record<
  Locale,
  { title: string; retry: string; continueAnyway: string }
> = {
  pt: {
    title: "Não conseguimos preparar tudo a tempo.",
    retry: "Tentar novamente",
    continueAnyway: "Continuar mesmo assim",
  },
  en: {
    title: "We couldn't get everything ready in time.",
    retry: "Try again",
    continueAnyway: "Continue anyway",
  },
  es: {
    title: "No pudimos preparar todo a tiempo.",
    retry: "Intentar de nuevo",
    continueAnyway: "Continuar de todas formas",
  },
  zh: {
    title: "未能及时准备好一切。",
    retry: "重试",
    continueAnyway: "仍然继续",
  },
};

const SLOW_LOADING_MS = 6000;

const STUCK_TEXT: Record<Locale, { offline: string; slow: string }> = {
  pt: {
    offline: "Sua internet caiu. Assim que voltar, a gente continua sozinho.",
    slow: "Isso está demorando mais que o normal…",
  },
  en: {
    offline: "Your internet dropped. We'll pick back up the moment it's back.",
    slow: "This is taking longer than usual…",
  },
  es: {
    offline: "Se cayó tu internet. En cuanto vuelva, seguimos solos.",
    slow: "Esto está tardando más de lo normal…",
  },
  zh: {
    offline: "您的网络断开了，恢复后会自动继续。",
    slow: "这次加载比平时慢……",
  },
};

interface Props {
  config: LoginRoleConfig;
  locale: Locale;
  progress: number;
  status: "running" | "done" | "error";
  onRetry: () => void;
  onContinueAnyway: () => void;
}

/**
 * Conteúdo exibido dentro do painel de marca depois que ele se expande pra
 * tela inteira (ver LoginPageTemplate).
 *
 * Minijogo do lobinho (pedido do usuário 2026-09-28/29) — igual ao dino do
 * Chrome: NÃO aparece sempre, só quando a internet caiu de verdade ou o
 * carregamento passou de `SLOW_LOADING_MS`. Quando aparece, toma conta da
 * tela (o card de progresso encolhe pra um resuminho no topo).
 */
export function LoginLoadingOverlay({
  config,
  locale,
  progress,
  status,
  onRetry,
  onContinueAnyway,
}: Props) {
  const content = config.translations[locale];
  const pct = Math.round(progress);
  const errorText = ERROR_TEXT[locale];
  const stuckText = STUCK_TEXT[locale];

  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (status !== "running") { setIsSlow(false); return; }
    const t = window.setTimeout(() => setIsSlow(true), SLOW_LOADING_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  const showGame = status !== "error" && (isOffline || isSlow);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div
        className="w-full max-w-sm transition-[max-width,transform] duration-300"
        style={showGame ? { maxWidth: "22rem", transform: "scale(0.82)" } : undefined}
      >
        <img
          src="/logo-allka-full.png"
          alt="ALLKA"
          className="h-8 object-contain mx-auto mb-6"
        />
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-semibold tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
          {content.tag}
        </div>

        {status === "error" ? (
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-white/90" />
            <p className="text-white/90 text-sm leading-relaxed">
              {errorText.title}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                type="button"
                onClick={onRetry}
                className="w-full h-11 rounded-xl bg-white text-slate-900 font-bold text-sm transition-transform active:scale-[0.98]"
              >
                {errorText.retry}
              </button>
              <button
                type="button"
                onClick={onContinueAnyway}
                className="w-full h-11 rounded-xl border border-white/30 text-white/80 font-semibold text-sm transition-colors hover:bg-white/10"
              >
                {errorText.continueAnyway}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-white font-extrabold tabular-nums leading-none mb-6 transition-[font-size] duration-300"
              style={{ fontSize: showGame ? "clamp(1.5rem, 5vw, 2rem)" : "clamp(2.5rem, 8vw, 4rem)" }}
            >
              {pct}%
            </p>

            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #2558FF, #6E2C96, #A61E86)",
                  transition: "width 90ms linear",
                }}
              />
            </div>

            <p className="text-white/70 text-sm mt-4 min-h-[1.25rem]">
              {showGame ? (isOffline ? stuckText.offline : stuckText.slow) : loadingMessageFor(progress, locale)}
            </p>
          </>
        )}
      </div>

      {/* Minijogo — só aparece quando a internet caiu ou o carregamento
          está demorando (igual ao dino do Chrome). Some no erro pra não
          distrair da ação de retry/continuar mesmo assim. */}
      {showGame && (
        <div className="mt-6 w-full max-w-[820px] animate-in fade-in zoom-in-95 duration-300">
          <LoadingWolfGame big />
        </div>
      )}
    </div>
  );
}
