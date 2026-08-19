import { AlertTriangle } from "lucide-react";
import type { LoginRoleConfig, Locale } from "@/components/login-page-template";

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
 * tela inteira (ver LoginPageTemplate). Propositalmente simples e isolado
 * pra ficar fácil, no futuro, acrescentar uma área de conteúdo (novidades,
 * dicas, banners) sem reestruturar nada — ver o comentário "future slot"
 * abaixo.
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

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div className="w-full max-w-sm">
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
            <p className="text-white font-extrabold tabular-nums leading-none mb-6" style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)" }}>
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
              {loadingMessageFor(progress, locale)}
            </p>
          </>
        )}

        {/* future slot: novidades da plataforma, dicas, banners institucionais —
            renderizar aqui embaixo quando existir, sem mexer no resto do layout */}
      </div>
    </div>
  );
}
