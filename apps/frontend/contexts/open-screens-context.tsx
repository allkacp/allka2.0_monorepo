// @ts-nocheck
/**
 * OpenScreensContext — "Bandeja de Telas" global, estilo Alt+Tab.
 *
 * Uma tela só entra aqui se o usuário clicar explicitamente no ícone de pin
 * daquela tela (opt-in). Nada se adiciona sozinho. Uma vez adicionada, só
 * sai da bandeja se o usuário: (a) clicar em remover dentro da própria
 * bandeja, ou (b) clicar de novo no mesmo ícone de pin na tela de origem.
 *
 * IMPORTANTE: os pins são dados puros (id/label/icon/path/activateKey)
 * guardados aqui no Provider — que fica ACIMA do Router em App.tsx — então
 * sobrevivem a navegar pra outra rota. Eles NÃO dependem do componente que
 * os criou continuar montado (ao contrário de uma versão anterior deste
 * contexto, que usava useEffect+cleanup e por isso perdia o pin ao navegar
 * pra outra página — bug real, corrigido aqui).
 *
 * `activateKey` é opcional: pins de "página inteira" não precisam dele (só
 * navegar até `path` já mostra a tela certa). Pins de uma SUB-tela dentro de
 * uma página com múltiplos estados internos (ex.: /admin/empresas tem
 * listagem vs. Novo Cadastro; /admin/dashboard tem Histórico, Editar, e o
 * detalhe de cada um dos 28 widgets) usam `activateKey` pra dizer à página,
 * depois que ela montar de novo, qual sub-tela abrir — via
 * `useConsumePendingActivation` (ver abaixo). Isso significa que reabrir um
 * pin de sub-tela reabre aquela TELA, não necessariamente com os dados que
 * estavam em rascunho ali antes (isso se perde ao desmontar, é limitação
 * normal do React) — mas o PIN em si nunca some sozinho.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export interface PinnedEntry {
  id: string;
  label: string;
  icon: React.ElementType;
  /** Rota pra onde navegar ao ativar este pin. */
  path: string;
  /** Token opcional lido pela página de destino via useConsumePendingActivation. */
  activateKey?: string;
}

interface OpenScreensContextValue {
  pinned: PinnedEntry[];
  addPinned: (entry: PinnedEntry) => void;
  removePinned: (id: string) => void;
  isPinned: (id: string) => boolean;
  pendingActivation: string | null;
  setPendingActivation: (key: string | null) => void;
}

const OpenScreensContext = createContext<OpenScreensContextValue | null>(
  null,
);

export function OpenScreensProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState<PinnedEntry[]>([]);
  const [pendingActivation, setPendingActivation] = useState<string | null>(
    null,
  );

  const addPinned = useCallback((entry: PinnedEntry) => {
    setPinned((prev) =>
      prev.some((p) => p.id === entry.id) ? prev : [...prev, entry],
    );
  }, []);

  const removePinned = useCallback((id: string) => {
    setPinned((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isPinned = useCallback(
    (id: string) => pinned.some((p) => p.id === id),
    [pinned],
  );

  return (
    <OpenScreensContext.Provider
      value={{
        pinned,
        addPinned,
        removePinned,
        isPinned,
        pendingActivation,
        setPendingActivation,
      }}
    >
      {children}
    </OpenScreensContext.Provider>
  );
}

export function useOpenScreens() {
  const ctx = useContext(OpenScreensContext);
  if (!ctx) {
    throw new Error(
      "useOpenScreens must be used within an OpenScreensProvider",
    );
  }
  return ctx;
}

/**
 * Pin genérico (página inteira OU sub-tela — a única diferença é se `entry`
 * tem `activateKey`). Uso:
 *
 *   const { pinned, toggle } = usePinEntry({ id, label, icon, path, activateKey });
 */
export function usePinEntry(entry: PinnedEntry | null) {
  const { isPinned, addPinned, removePinned } = useOpenScreens();
  const pinned = entry ? isPinned(entry.id) : false;
  const toggle = useCallback(() => {
    if (!entry) return;
    if (isPinned(entry.id)) removePinned(entry.id);
    else addPinned(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.label, entry?.path, entry?.activateKey]);
  return { pinned, toggle };
}

/** Alias — nome usado por PinToTrayButton (pins de página inteira). */
export const usePinnedPage = usePinEntry;

/**
 * Chame UMA VEZ no topo de uma página que tem sub-telas pinnable
 * (ex.: /admin/dashboard, /admin/empresas). Ao montar, se a Bandeja de
 * Telas registrou um `activateKey` pendente (usuário clicou num pin de
 * sub-tela e foi navegado até aqui), `onKey` é chamado com esse valor pra
 * decidir o que abrir — e o pending é limpo em seguida.
 *
 *   useConsumePendingActivation((key) => {
 *     if (key === "historico") setShowHistoricalModal(true);
 *     else if (key.startsWith("widget:")) setDetailsWidgetId(key.slice(7));
 *   });
 */
export function useConsumePendingActivation(onKey: (key: string) => void) {
  const { pendingActivation, setPendingActivation } = useOpenScreens();

  React.useEffect(() => {
    if (!pendingActivation) return;
    onKey(pendingActivation);
    setPendingActivation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActivation]);
}
