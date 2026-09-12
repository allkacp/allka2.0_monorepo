"use client";

// Contexto leve de tela pra IAllka (reunião 10/09, "assistente IAllka —
// ícone e ajuda contextual"). Guarda só um resumo curto e SEGURO da tela
// atual (rota + o que a própria tela decidir registrar — nunca dado sensível
// nem de outra conta) pra gerar sugestões contextuais e uma linha de
// contexto anexada à mensagem enviada. Nunca é enviado como campo
// estruturado novo pro backend (isso mudaria a entrada da IA existente) —
// vira só um prefixo de texto simples na MESMA chamada já existente
// (apiClient.sendIallkaMessage), reaproveitando o fluxo sem reformular a IA.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export interface IallkaScreenContext {
  /** Rótulo curto e humano da tela (nunca um ID técnico). */
  label?: string;
  /** Categoria selecionada num catálogo (nome, nunca ID interno). */
  category?: string;
  /** Termo de busca ativo (só o texto, nunca resultado de outros usuários). */
  search?: string;
  /** Quantos itens estão visíveis agora, pra dar noção de escopo. */
  visibleCount?: number;
  /** Nome do produto/projeto aberto no momento, se houver (nunca ID/UUID). */
  openItemName?: string;
}

interface Suggestion {
  key: string;
  text: string;
}

const CATALOGO_SUGGESTIONS: Suggestion[] = [
  { key: "escolher-produto", text: "Ajude-me a escolher um produto" },
  { key: "produto-objetivo", text: "Qual produto combina com meu objetivo?" },
  { key: "combinacao-4fs", text: "Monte uma combinação usando os 4 Fs" },
  { key: "diferencas-produtos", text: "Explique as diferenças entre estes produtos" },
];
const PROJETOS_SUGGESTIONS: Suggestion[] = [
  { key: "entender-projeto", text: "Ajude-me a entender este projeto" },
  { key: "proximos-passos", text: "Quais são os próximos passos?" },
  { key: "explicar-tarefas", text: "Explique as tarefas pendentes" },
  { key: "estruturar-lancamento", text: "Ajude a estruturar o lançamento" },
];
const GENERIC_SUGGESTIONS: Suggestion[] = [
  { key: "o-que-e-iallka", text: "O que a IAllka pode me ajudar a fazer aqui?" },
];

function labelForRoute(pathname: string): string {
  if (pathname.includes("catalogo-produtos")) return "Catálogo de Produtos";
  if (pathname.includes("/produtos")) return "Cadastro de Produtos";
  if (pathname.includes("projeto")) return "Projetos";
  if (pathname.includes("dashboard")) return "Dashboard";
  if (pathname.includes("allkademy")) return "Allkademy";
  return "esta tela";
}

interface IallkaContextValue {
  screenContext: IallkaScreenContext;
  setScreenContext: (partial: IallkaScreenContext | null) => void;
  suggestions: Suggestion[];
  /** Linha de contexto curta, sempre segura, pra prefixar a mensagem enviada. */
  contextLine: string;
}

const IallkaContext = createContext<IallkaContextValue | null>(null);

export function IallkaContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [screenContext, setScreenContextState] = useState<IallkaScreenContext>({});

  // Cada tela registra (e limpa ao desmontar) só o que ela mesma já mostra
  // na UI — nunca um dado que o usuário não veria de qualquer forma.
  const setScreenContext = useCallback((partial: IallkaScreenContext | null) => {
    setScreenContextState(partial ?? {});
  }, []);

  const isCatalogo = location.pathname.includes("catalogo-produtos");
  const isProjetos = location.pathname.includes("projeto");

  const suggestions = useMemo(() => {
    if (isCatalogo) return CATALOGO_SUGGESTIONS;
    if (isProjetos) return PROJETOS_SUGGESTIONS;
    return GENERIC_SUGGESTIONS;
  }, [isCatalogo, isProjetos]);

  const contextLine = useMemo(() => {
    const label = screenContext.label || labelForRoute(location.pathname);
    const parts = [`Tela atual: ${label}.`];
    if (screenContext.category) parts.push(`Categoria selecionada: ${screenContext.category}.`);
    if (screenContext.search) parts.push(`Busca ativa: "${screenContext.search}".`);
    if (typeof screenContext.visibleCount === "number") parts.push(`${screenContext.visibleCount} item(ns) visível(is) agora.`);
    if (screenContext.openItemName) parts.push(`Aberto agora: ${screenContext.openItemName}.`);
    return parts.join(" ");
  }, [screenContext, location.pathname]);

  const value = useMemo(
    () => ({ screenContext, setScreenContext, suggestions, contextLine }),
    [screenContext, setScreenContext, suggestions, contextLine],
  );

  return <IallkaContext.Provider value={value}>{children}</IallkaContext.Provider>;
}

export function useIallkaContext(): IallkaContextValue {
  const ctx = useContext(IallkaContext);
  if (!ctx) {
    // Fora do provider (ex.: teste isolado de uma tela) — devolve um valor
    // neutro em vez de quebrar a tela que só quer registrar contexto.
    return {
      screenContext: {},
      setScreenContext: () => {},
      suggestions: GENERIC_SUGGESTIONS,
      contextLine: "",
    };
  }
  return ctx;
}
