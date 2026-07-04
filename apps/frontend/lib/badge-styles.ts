/**
 * Shared "neon" badge formula, extracted from admin/empresas/page.tsx:
 * colored border + pale-but-not-too-light `-200` background + `-900` text +
 * a colored glow shadow; dark mode uses a richer `-800/70` background with
 * `-100` text instead of a washed-out low-opacity tone.
 *
 * Every className string below is written out in full (not template-built
 * from the color name) on purpose — Tailwind's build-time class scanner
 * only picks up literal strings, so interpolating `border-${color}-500`
 * would silently produce unstyled badges in production.
 */
export type BadgeColor =
  | "blue"
  | "violet"
  | "purple"
  | "pink"
  | "rose"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "emerald"
  | "green"
  | "teal"
  | "cyan"
  | "indigo"
  | "slate"
  | "gray";

const BADGE_CLASSES: Record<BadgeColor, string> = {
  blue: "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:bg-blue-800/70 dark:text-blue-100",
  violet:
    "border-violet-500 bg-violet-200 text-violet-900 shadow-[0_0_10px_rgba(139,92,246,0.6)] dark:bg-violet-800/70 dark:text-violet-100",
  purple:
    "border-purple-500 bg-purple-200 text-purple-900 shadow-[0_0_11px_rgba(168,85,247,0.6)] dark:bg-purple-800/70 dark:text-purple-100",
  pink: "border-pink-500 bg-pink-200 text-pink-900 shadow-[0_0_10px_rgba(236,72,153,0.6)] dark:bg-pink-800/70 dark:text-pink-100",
  rose: "border-rose-500 bg-rose-200 text-rose-900 shadow-[0_0_10px_rgba(244,63,94,0.6)] dark:bg-rose-800/70 dark:text-rose-100",
  red: "border-red-500 bg-red-200 text-red-900 shadow-[0_0_10px_rgba(239,68,68,0.6)] dark:bg-red-800/70 dark:text-red-100",
  orange:
    "border-orange-500 bg-orange-200 text-orange-900 shadow-[0_0_10px_rgba(249,115,22,0.6)] dark:bg-orange-800/70 dark:text-orange-100",
  amber:
    "border-amber-500 bg-amber-200 text-amber-900 shadow-[0_0_10px_rgba(245,158,11,0.6)] dark:bg-amber-800/70 dark:text-amber-100",
  yellow:
    "border-yellow-500 bg-yellow-200 text-yellow-900 shadow-[0_0_10px_rgba(234,179,8,0.6)] dark:bg-yellow-800/70 dark:text-yellow-100",
  emerald:
    "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.6)] dark:bg-emerald-800/70 dark:text-emerald-100",
  green:
    "border-green-500 bg-green-200 text-green-900 shadow-[0_0_10px_rgba(34,197,94,0.6)] dark:bg-green-800/70 dark:text-green-100",
  teal: "border-teal-500 bg-teal-200 text-teal-900 shadow-[0_0_10px_rgba(20,184,166,0.6)] dark:bg-teal-800/70 dark:text-teal-100",
  cyan: "border-cyan-500 bg-cyan-200 text-cyan-900 shadow-[0_0_10px_rgba(6,182,212,0.6)] dark:bg-cyan-800/70 dark:text-cyan-100",
  indigo:
    "border-indigo-500 bg-indigo-200 text-indigo-900 shadow-[0_0_10px_rgba(99,102,241,0.6)] dark:bg-indigo-800/70 dark:text-indigo-100",
  slate:
    "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
  gray: "border-gray-400 bg-gray-300 text-gray-800 shadow-[0_0_8px_rgba(107,114,128,0.4)] dark:bg-gray-800 dark:text-gray-300",
};

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border w-fit";

export function getBadgeClasses(color: BadgeColor): string {
  return `${BADGE_BASE} ${BADGE_CLASSES[color]}`;
}
