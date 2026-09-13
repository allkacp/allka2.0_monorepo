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
  /** ID do projeto aberto (reunião 10/09, "base de conhecimento —
   * briefings") — SÓ quando a própria tela já confirmou que o usuário tem
   * acesso a ele (é o mesmo projeto que ela está exibindo). Enviado ao
   * backend, que revalida o vínculo de novo antes de usar o briefing —
   * nunca confiado só por estar aqui. */
  projectId?: string;
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
  { key: "criar-projeto", text: "Ajude-me a criar um projeto" },
  { key: "entender-projeto", text: "Ajude-me a entender este projeto" },
  { key: "proximos-passos", text: "Quais são os próximos passos?" },
  { key: "explicar-tarefas", text: "Explique as tarefas pendentes" },
  { key: "estruturar-lancamento", text: "Ajude a estruturar o lançamento" },
];
const CADASTRO_PRODUTOS_SUGGESTIONS: Suggestion[] = [
  { key: "entender-produto", text: "Explique este produto" },
  { key: "revisar-pendencias", text: "O que falta completar neste produto?" },
  { key: "organizar-produto", text: "Ajude-me a organizar os dados do produto" },
  { key: "entender-preco", text: "Explique a composição do preço" },
];
const TAREFAS_SUGGESTIONS: Suggestion[] = [
  { key: "entender-tarefa", text: "Ajude-me a entender esta tarefa" },
  { key: "proximo-passo-tarefa", text: "Qual é o próximo passo desta tarefa?" },
  { key: "preparar-briefing", text: "Ajude-me a preparar o briefing" },
  { key: "revisar-entrega", text: "O que preciso revisar antes da entrega?" },
];
const GENERIC_SUGGESTIONS: Suggestion[] = [
  { key: "o-que-aura-faz", text: "O que a Aura pode me ajudar a fazer nesta tela?" },
];

type ScreenArea = "catalogo" | "cadastro-produtos" | "projetos" | "tarefas" | "dashboard" | "allkademy" | "generica";

/**
 * Reconhece a URL por segmentos, não por um trecho solto. A prioridade é
 * deliberada: em `/projetos/:id/tarefas`, a pessoa está trabalhando em
 * Tarefas e não em Projetos, portanto a Aura deve assumir Tarefas.
 */
function screenAreaForRoute(pathname: string): ScreenArea {
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  if (segments.includes("tarefas")) return "tarefas";
  if (segments.includes("catalogo-produtos")) return "catalogo";
  if (segments.includes("produtos")) return "cadastro-produtos";
  if (segments.some((segment) => segment.startsWith("projeto"))) return "projetos";
  if (segments.includes("dashboard")) return "dashboard";
  if (segments.includes("allkademy")) return "allkademy";
  return "generica";
}

function labelForArea(area: ScreenArea): string {
  switch (area) {
    case "catalogo": return "Catálogo de Produtos";
    case "cadastro-produtos": return "Cadastro de Produtos";
    case "projetos": return "Projetos";
    case "tarefas": return "Tarefas";
    case "dashboard": return "Dashboard";
    case "allkademy": return "Allkademy";
    default: return "esta tela";
  }
}

interface IallkaContextValue {
  screenContext: IallkaScreenContext;
  setScreenContext: (partial: IallkaScreenContext | null) => void;
  suggestions: Suggestion[];
  /** Linha de contexto curta, sempre segura, pra prefixar a mensagem enviada. */
  contextLine: string;
}

const IallkaContext = createContext<IallkaContextValue | null>(null);

/** Contexto registrado por uma tela, atrelado à URL onde ele nasceu. */
type RegisteredScreenContext = IallkaScreenContext & { pathname: string };

export function IallkaContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [registeredContext, setScreenContextState] = useState<RegisteredScreenContext | null>(null);

  // Cada tela registra (e limpa ao desmontar) só o que ela mesma já mostra
  // na UI — nunca um dado que o usuário não veria de qualquer forma. O
  // pathname é salvo junto: ao mudar de URL, um contexto antigo é ignorado
  // imediatamente, mesmo que uma limpeza de componente ocorra depois.
  const setScreenContext = useCallback((partial: IallkaScreenContext | null) => {
    setScreenContextState(partial ? { ...partial, pathname: location.pathname } : null);
  }, [location.pathname]);

  const screenArea = useMemo(() => screenAreaForRoute(location.pathname), [location.pathname]);
  const screenContext = registeredContext?.pathname === location.pathname ? registeredContext : {};

  const suggestions = useMemo(() => {
    switch (screenArea) {
      case "catalogo": return CATALOGO_SUGGESTIONS;
      case "cadastro-produtos": return CADASTRO_PRODUTOS_SUGGESTIONS;
      case "projetos": return PROJETOS_SUGGESTIONS;
      case "tarefas": return TAREFAS_SUGGESTIONS;
      default: return GENERIC_SUGGESTIONS;
    }
  }, [screenArea]);

  const contextLine = useMemo(() => {
    const label = screenContext.label || labelForArea(screenArea);
    const parts = [`Tela atual: ${label}.`];
    if (screenContext.category) parts.push(`Categoria selecionada: ${screenContext.category}.`);
    if (screenContext.search) parts.push(`Busca ativa: "${screenContext.search}".`);
    if (typeof screenContext.visibleCount === "number") parts.push(`${screenContext.visibleCount} item(ns) visível(is) agora.`);
    if (screenContext.openItemName) parts.push(`Aberto agora: ${screenContext.openItemName}.`);
    return parts.join(" ");
  }, [screenContext, screenArea]);

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
