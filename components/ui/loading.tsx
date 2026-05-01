// @ts-nocheck
/**
 * Allka Loading System — v2
 *
 * Visual padronizado: spinner conic-gradient com borda degradê.
 * Cores: azul #2558FF → roxo #6E2C96 → magenta #A61E86
 *
 * Exportações:
 *   <Spinner size="xs|sm|md|lg|xl" />   — spinner puro
 *   <ButtonLoader text="…" />           — spinner pequeno + texto (botões)
 *   <InlineLoader text="…" />           — spinner médio + texto (seções)
 *   <TableLoader rows cols text />      — spinner médio + skeleton (tabelas)
 *   <DrawerLoader text="…" />           — skeleton + spinner (drawer/modal)
 *   <PageLoader text subtext />         — spinner grande + glow (página)
 *   <OverlayLoader text="…" />          — overlay semitransparente (bloqueio)
 */

import { cn } from "@/lib/utils";

// ─── Brand ───────────────────────────────────────────────────────────────────

const BRAND = {
  blue: "#2558FF",
  purple: "#6E2C96",
  magenta: "#A61E86",
} as const;

// ─── Core ring (CSS conic-gradient + radial-mask) ────────────────────────────
// Evita colisão de IDs de gradiente SVG e é mais leve que a abordagem SVG.
// A camada de arco rotaciona; o track fica estático.

function SpinnerRing({
  size = 40,
  thickness = 3,
  className,
}: {
  size?: number;
  thickness?: number;
  className?: string;
}) {
  // O inner radius do mask precisa coincidir com a borda interna do track.
  const innerR = `calc(50% - ${thickness}px - 0.5px)`;

  return (
    <div
      aria-hidden="true"
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* Track estático */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: `${thickness}px solid rgba(120,120,140,0.14)` }}
      />

      {/* Arco gradiente — rotaciona */}
      <div
        className="absolute inset-0 rounded-full animate-[allka-spin_0.85s_linear_infinite]"
        style={{
          background: `conic-gradient(
            from 0deg at 50% 50%,
            ${BRAND.blue}   0%,
            ${BRAND.purple} 48%,
            ${BRAND.magenta} 72%,
            transparent     88%
          )`,
          WebkitMask: `radial-gradient(farthest-side, transparent ${innerR}, white ${innerR})`,
          mask: `radial-gradient(farthest-side, transparent ${innerR}, white ${innerR})`,
        }}
      />
    </div>
  );
}

// ─── Pulse dots ───────────────────────────────────────────────────────────────

function PulseDots({ className }: { className?: string }) {
  const colors = [BRAND.blue, BRAND.purple, BRAND.magenta];
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-hidden="true"
    >
      {colors.map((color, i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background: color,
            opacity: 0.75,
            animation: `allka-pulse-dot 1.4s ease-in-out ${i * 0.22}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Spinner sizes ────────────────────────────────────────────────────────────

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<SpinnerSize, { px: number; thick: number }> = {
  xs: { px: 14, thick: 1.5 },
  sm: { px: 18, thick: 2 },
  md: { px: 26, thick: 2.5 },
  lg: { px: 36, thick: 3 },
  xl: { px: 52, thick: 4 },
};

/**
 * Spinner puro — use quando precisar apenas do ícone de carregamento.
 * Tamanhos: xs | sm | md | lg | xl
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  const { px, thick } = SIZES[size];
  return <SpinnerRing size={px} thickness={thick} className={className} />;
}

// ─── ButtonLoader ─────────────────────────────────────────────────────────────
/**
 * Conteúdo interno de um botão em processamento — spinner PEQUENO + texto.
 *
 * ```tsx
 * <Button disabled={saving}>
 *   {saving ? <ButtonLoader text="Salvando…" /> : "Salvar"}
 * </Button>
 * ```
 */
export function ButtonLoader({ text = "Processando…" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <SpinnerRing size={14} thickness={1.5} />
      <span>{text}</span>
    </span>
  );
}

// ─── PageLoader ───────────────────────────────────────────────────────────────
/**
 * Carregamento de página inteira — spinner GRANDE com glow + texto + dots.
 * Cobre a área de conteúdo enquanto os dados iniciais carregam.
 *
 * @param text     Mensagem principal
 * @param subtext  Mensagem secundária opcional
 * @param compact  Reduz a altura mínima para sub-seções
 */
export function PageLoader({
  text = "Carregando…",
  subtext,
  compact = false,
}: {
  text?: string;
  subtext?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-7",
        compact ? "min-h-[280px] py-20" : "min-h-[460px]",
      )}
    >
      {/* Spinner com glow ambiente */}
      <div className="relative flex items-center justify-center w-20 h-20">
        {/* Glow externo */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-25"
          style={{
            background: `conic-gradient(${BRAND.blue}, ${BRAND.purple}, ${BRAND.magenta}, ${BRAND.blue})`,
            animation: "allka-halo 2.5s ease-in-out infinite alternate",
          }}
        />
        {/* Glow interno */}
        <div
          className="absolute rounded-full blur-lg opacity-20"
          style={{
            width: 64,
            height: 64,
            background: `radial-gradient(circle, ${BRAND.blue}cc 0%, ${BRAND.purple}80 60%, transparent 90%)`,
            animation: "allka-halo 2s ease-in-out 0.6s infinite alternate",
          }}
        />
        <SpinnerRing size={52} thickness={4} />
      </div>

      {/* Texto + dots */}
      <div className="flex flex-col items-center gap-2.5 text-center max-w-xs">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide">
          {text}
        </p>
        {subtext && (
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            {subtext}
          </p>
        )}
        <PulseDots />
      </div>
    </div>
  );
}

// ─── InlineLoader ─────────────────────────────────────────────────────────────
/**
 * Carregamento inline — spinner MÉDIO + texto.
 * Ideal para seções em cards, filtros e áreas específicas.
 */
export function InlineLoader({
  text = "Carregando…",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className={cn("flex items-center justify-center gap-2.5 py-8", className)}
    >
      <SpinnerRing size={26} thickness={2.5} />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {text}
      </span>
    </div>
  );
}

// ─── TableLoader ──────────────────────────────────────────────────────────────
/**
 * Carregamento de tabela — spinner MÉDIO no topo + linhas skeleton com shimmer.
 *
 * @param rows  Quantas linhas skeleton (padrão: 6)
 * @param cols  Quantas colunas skeleton (padrão: 5)
 * @param text  Texto de status
 */
export function TableLoader({
  rows = 6,
  cols = 5,
  text = "Carregando dados…",
}: {
  rows?: number;
  cols?: number;
  text?: string;
}) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className="w-full overflow-hidden rounded-b-lg"
    >
      {/* Barra de status */}
      <div className="flex items-center justify-center gap-2.5 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40">
        <SpinnerRing size={22} thickness={2} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
          {text}
        </span>
      </div>

      {/* Linhas skeleton */}
      <div className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
        {Array.from({ length: rows }).map((_, ri) => (
          <div
            key={ri}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ opacity: 1 - ri * 0.11 }}
          >
            <div className="h-8 w-8 rounded-full allka-shimmer shrink-0" />
            {Array.from({ length: cols }).map((_, ci) => (
              <div
                key={ci}
                className="h-3 rounded-full allka-shimmer"
                style={{
                  flex: ci === 1 ? 2 : 1,
                  maxWidth: ci === 0 ? 80 : ci === cols - 1 ? 64 : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DrawerLoader ─────────────────────────────────────────────────────────────
/**
 * Carregamento de drawer/modal — skeleton de campos + spinner no rodapé.
 * Usado dentro de Sheet ou Dialog enquanto os dados do item carregam.
 */
export function DrawerLoader({
  text = "Carregando detalhes…",
}: {
  text?: string;
}) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className="flex-1 flex flex-col gap-5 p-6 animate-in fade-in duration-300"
    >
      {/* Header skeleton */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl allka-shimmer shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2.5 w-20 rounded-full allka-shimmer" />
          <div className="h-5 w-44 rounded-full allka-shimmer" />
          <div className="h-2.5 w-28 rounded-full allka-shimmer" />
        </div>
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* Campos skeleton */}
      {[2, 3, 1, 2, 4].map((lines, si) => (
        <div key={si} className="space-y-2">
          <div className="h-2.5 w-16 rounded-full allka-shimmer" />
          {Array.from({ length: lines }).map((_, li) => (
            <div
              key={li}
              className="h-3.5 rounded-full allka-shimmer"
              style={{ width: `${70 + Math.sin(si * 3 + li) * 20}%` }}
            />
          ))}
        </div>
      ))}

      {/* Rodapé com spinner */}
      <div className="mt-auto pt-4 flex items-center justify-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
        <SpinnerRing size={20} thickness={2} />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {text}
        </span>
      </div>
    </div>
  );
}

// ─── OverlayLoader ────────────────────────────────────────────────────────────
/**
 * Overlay semitransparente sobre um container `relative`.
 * Bloqueia interação enquanto mantém o contexto visual da tela.
 *
 * O pai DEVE ter `className="relative"` (ou `position: relative`).
 *
 * ```tsx
 * <div className="relative">
 *   <ConteudoExistente />
 *   {loading && <OverlayLoader />}
 * </div>
 * ```
 */
export function OverlayLoader({ text = "Atualizando…" }: { text?: string }) {
  return (
    <div
      role="status"
      aria-label={text}
      aria-busy="true"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/78 dark:bg-slate-950/78 backdrop-blur-[3px] animate-in fade-in duration-200"
    >
      <SpinnerRing size={36} thickness={3} />
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-4 text-center leading-relaxed">
        {text}
      </span>
    </div>
  );
}
