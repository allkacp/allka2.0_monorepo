// @ts-nocheck
/**
 * OpenScreensTray — ícone flutuante fixo logo abaixo do ícone de chat, mesmo
 * estilo (ícone puro, sem fundo, tooltip no hover). Sempre visível — se não
 * houver nenhuma tela adicionada, mostra um estado vazio explicando o que é.
 * Cada tela só entra aqui por ação explícita do usuário (ícone de pin na
 * própria tela) — nada se adiciona sozinho, e nada some sozinho: só clicando
 * em remover aqui ou de novo no pin de origem (ver open-screens-context.tsx).
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layers, Check, X } from "lucide-react";
import { useOpenScreens } from "@/contexts/open-screens-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function OpenScreensTray() {
  const { pinned, removePinned, setPendingActivation } = useOpenScreens();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed top-[125px] right-[8px] z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Bandeja de Telas"
            className="group relative flex items-center justify-center h-10 w-10 text-white/70 hover:text-white transition-colors"
          >
            <Layers className="h-5 w-5 shrink-0" />
            {pinned.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 pointer-events-none" />
            )}
            <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
              Bandeja de Telas
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-1.5">
          <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Bandeja de Telas
          </p>
          {pinned.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-slate-400 text-center leading-relaxed">
              Nenhuma tela adicionada ainda. Clique no ícone de pin ao lado do
              Exportar, em qualquer tela, pra adicioná-la aqui.
            </p>
          ) : (
            pinned.map((entry) => {
              const Icon = entry.icon;
              const active =
                location.pathname === entry.path ||
                location.pathname.startsWith(entry.path + "/");
              return (
                <div
                  key={entry.id}
                  className="group/row w-full flex items-center gap-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (entry.activateKey) {
                        setPendingActivation(entry.activateKey);
                      }
                      navigate(entry.path);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2.5 px-2.5 py-2 text-sm text-left min-w-0"
                  >
                    <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {active && (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePinned(entry.id)}
                    title="Remover da bandeja"
                    className="p-1.5 mr-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover/row:opacity-100 transition-all shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
