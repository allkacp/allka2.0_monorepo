"use client";
import { useMemo, type ComponentType } from "react";
import { FieldHelpLayer } from "@/app/admin/produtos/novo-catalogo/field-help-layer";
import { lookupHelp, normalizeHelpKey } from "@/app/admin/produtos/novo-catalogo/field-help";
import { GLOBAL_HELP } from "@/lib/screen-help";

// P-5 / P-6 (reunião 07/10, ampliado em 08/10): os ícones (i) de ajuda e o padrão de tamanho/rolagem dos campos valem em TODAS as telas.
// Cada tela tem o seu dicionário (a mesma palavra, como "Prazo", significa coisas diferentes em telas diferentes).
export type HelpDict = Record<string, string>;
/** Normaliza as chaves do dicionário (sem acento, minúsculas) para casar com o texto da tela. */
export const buildHelp = (raw: HelpDict): HelpDict => Object.fromEntries(Object.entries(raw).map(([k, v]) => [normalizeHelpKey(k), v]));

// Padrão de campos: altura mínima igual para caixas de texto/seleção e áreas de texto que crescem na vertical, com limite (rolagem interna).
const STD_CSS = `
.screen-std input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),.screen-std select{min-height:2.25rem}
.screen-std textarea{min-height:5rem;max-height:24rem;resize:vertical;overflow:auto}
`;

// Padrão GLOBAL (todas as telas): mesma altura mínima dos campos (fora de tabelas) e áreas de texto com rolagem. Não força altura mínima em caixas de texto (ex.: conversas).
const GLOBAL_CSS = `
.screen-std-global input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not(table input),.screen-std-global select:not(table select){min-height:2.25rem}
.screen-std-global textarea{max-height:24rem;resize:vertical;overflow:auto}
`;

export function ScreenHelp({ dict, children }: { dict: HelpDict; children: React.ReactNode }) {
  const help = useMemo(() => (label: string) => lookupHelp(dict, label), [dict]);
  return (
    <FieldHelpLayer help={help}>
      <style>{STD_CSS}</style>
      <div className="screen-std contents">{children}</div>
    </FieldHelpLayer>
  );
}

/** Envolve uma tela/componente com a camada de ajuda (i) e o padrão de campos. */
export function withScreenHelp<P extends object>(Component: ComponentType<P>, dict: HelpDict): ComponentType<P> {
  const built = buildHelp(dict);
  const Wrapped = (props: P) => <ScreenHelp dict={built}><Component {...props} /></ScreenHelp>;
  Wrapped.displayName = `WithScreenHelp(${Component.displayName || Component.name || "Tela"})`;
  return Wrapped;
}

/** Camada GERAL de ajuda (i) e padrão de campos: envolve o conteúdo de todas as páginas. Dicionários próprios de cada tela, dentro dela, valem primeiro. */
const GLOBAL_BUILT = buildHelp(GLOBAL_HELP);
export function GlobalScreenHelp({ children }: { children: React.ReactNode }) {
  const help = useMemo(() => (label: string) => lookupHelp(GLOBAL_BUILT, label), []);
  return (
    <FieldHelpLayer help={help} strict>
      <style>{GLOBAL_CSS}</style>
      <div className="screen-std-global contents">{children}</div>
    </FieldHelpLayer>
  );
}
