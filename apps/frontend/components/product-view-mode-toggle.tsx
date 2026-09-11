"use client";

// Alternador Lista/Grade (2–5 colunas) — visual recuperado do Cadastro de
// Produtos anterior a c86eaa2 (mesmos ícones/desenho), reusado agora por
// Cadastro E Catálogo de Produtos (reparo 2026-09, "recuperação completa
// dos layouts"). Cada tela mantém sua própria preferência (ver
// use-persisted-view-mode.ts) — este componente é só a UI do controle,
// sem acoplamento a nenhuma fonte de dados.

import type { ProductViewMode } from "@/lib/use-persisted-view-mode";

const MODES: { value: ProductViewMode; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  {
    value: 2,
    label: "2 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1" width="6" height="6" rx="1" fill={c} />
          <rect x="9" y="1" width="6" height="6" rx="1" fill={c} />
          <rect x="1" y="9" width="6" height="6" rx="1" fill={c} />
          <rect x="9" y="9" width="6" height="6" rx="1" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 3,
    label: "3 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="6" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="11" y="1" width="4" height="4" rx="0.8" fill={c} />
          <rect x="1" y="7" width="4" height="4" rx="0.8" fill={c} />
          <rect x="6" y="7" width="4" height="4" rx="0.8" fill={c} />
          <rect x="11" y="7" width="4" height="4" rx="0.8" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 4,
    label: "4 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="0.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="4.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="8.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="12.5" y="1" width="3" height="3" rx="0.6" fill={c} />
          <rect x="0.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="4.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="8.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
          <rect x="12.5" y="5.5" width="3" height="3" rx="0.6" fill={c} />
        </svg>
      );
    },
  },
  {
    value: 5,
    label: "5 colunas",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      const xs = [0.5, 3.5, 6.5, 9.5, 12.5];
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          {xs.map((x) => <rect key={x + "a"} x={x} y="1" width="2.3" height="3" rx="0.5" fill={c} />)}
          {xs.map((x) => <rect key={x + "b"} x={x} y="5.5" width="2.3" height="3" rx="0.5" fill={c} />)}
          {xs.map((x) => <rect key={x + "c"} x={x} y="10" width="2.3" height="3" rx="0.5" fill={c} />)}
        </svg>
      );
    },
  },
  {
    value: "list",
    label: "Lista",
    Icon: ({ active }) => {
      const c = active ? "#4f46e5" : "#94a3b8";
      return (
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <rect x="1" y="1.5" width="14" height="3" rx="0.8" fill={c} />
          <rect x="1" y="6.5" width="14" height="3" rx="0.8" fill={c} />
          <rect x="1" y="11.5" width="14" height="3" rx="0.8" fill={c} />
        </svg>
      );
    },
  },
];

export function ProductViewModeToggle({ value, onChange }: { value: ProductViewMode; onChange: (m: ProductViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label="Modo de visualização">
      {MODES.map(({ value: v, label, Icon }) => (
        <button
          key={String(v)}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
            value === v ? "bg-white shadow-sm dark:bg-slate-700" : "hover:bg-white/60 dark:hover:bg-slate-700/60"
          }`}
        >
          <Icon active={value === v} />
        </button>
      ))}
    </div>
  );
}
