"use client";

import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { editorSessionKey, readEditorSession, writeEditorSession } from "@/app/admin/produtos/novo-catalogo/editor-session";

type Entity = { id: string; number?: string | number | null; name: string };
type Version = { id: string; number?: number; state?: string };
type EditorContext = { product?: Entity | null; version?: Version | null; task?: Entity | null; step?: Entity | null; workspace?: string };
const Context = createContext<EditorContext>({});

/** Metadados herdados pelos portais, sem copiar IDs/nomes para o estado dos formulários. */
export function FramedEditorScope({ children, ...scope }: EditorContext & { children: ReactNode }) {
  const parent = useContext(Context);
  return <Context.Provider value={{ ...parent, ...scope }}>{children}</Context.Provider>;
}

export function useFramedEditorSessionKey(scope: string): string | undefined {
  const c = useContext(Context);
  return c.product ? editorSessionKey(JSON.stringify(["framed-editor", c.product.id, c.version?.id, c.task?.id, c.step?.id, scope, ...(c.workspace ? [c.workspace] : [])])) : undefined;
}

export function clearFramedEditorDrafts(productId: string, versionId?: string, workspace?: string) {
  try {
    const current = JSON.parse(editorSessionKey("").slice("allka:editor-recovery:".length));
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith("allka:editor-recovery:")) continue;
      try {
        const [user, path, scope] = JSON.parse(key.slice("allka:editor-recovery:".length));
        const ids = JSON.parse(scope);
        if (user === current[0] && path === current[1] && ids[0] === "framed-editor" && ids[1] === productId && (!versionId || ids[2] === versionId) && ids[6] === workspace && String(ids[5]).startsWith("draft:")) sessionStorage.removeItem(key);
      } catch { /* outra chave de recuperação */ }
    }
  } catch { /* sem armazenamento */ }
}

export function FramedEditorBreadcrumb() {
  const c = useContext(Context);
  if (!c.product) return null;
  const label = (kind: string, entity: Entity) => `${kind}${entity.number != null ? ` ID ${String(entity.number).padStart(2, "0")}` : ""} · ${entity.name}`;
  return <div data-testid="framed-editor-context" aria-label="Contexto do cadastro" className="mx-[2px] mb-1 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
    <span className="min-w-0 break-words font-semibold">{label("Produto", c.product)}</span>
    {c.version && <span className="shrink-0 rounded bg-violet-100 px-1.5 text-violet-800 dark:bg-violet-950 dark:text-violet-200">v{c.version.number ?? "—"} · {c.version.state === "publicada" ? "Publicada" : "Rascunho"}</span>}
    {c.task && <span className="min-w-0 break-words">{label("Tarefa", c.task)}</span>}
    {c.step && <span className="min-w-0 break-words">{label("Etapa", c.step)}</span>}
  </div>;
}

/** Recuperação da aba: abrir/fechar não grava no servidor; IDs de versão impedem mistura de cadastros. */
export function useFramedEditorOpen(identity: string, fallback = false): [boolean, Dispatch<SetStateAction<boolean>>] {
  const key = useFramedEditorSessionKey(`open:${identity}`);
  const read = () => readEditorSession<boolean>(key) ?? fallback;
  const [state, setState] = useState(() => ({ key, value: read() }));
  const value = state.key === key ? state.value : read();
  const set = useCallback<Dispatch<SetStateAction<boolean>>>(next => {
    setState(current => {
      const previous = current.key === key ? current.value : readEditorSession<boolean>(key) ?? fallback;
      const value = typeof next === "function" ? next(previous) : next;
      writeEditorSession(key, value);
      return { key, value };
    });
  }, [key, fallback]);
  return [value, set];
}

/** Só recupera campos conhecidos pelo formulário. Nunca captura senhas, arquivos ou DOM arbitrário. */
export function useFramedEditorDraft<T>(identity: string, initial: T, enabled: boolean, revision?: string): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(Context);
  const key = useFramedEditorSessionKey(`draft:${identity}`);
  const base = revision ?? JSON.stringify(initial);
  const read = () => {
    const saved = enabled ? readEditorSession<{ base: string; value: T }>(key) : null;
    return saved?.base === base ? saved.value : initial;
  };
  const [state, setState] = useState(() => ({ key, base, enabled, value: read() }));
  const value = state.key === key && state.base === base && state.enabled === enabled ? state.value : read();
  useEffect(() => {
    const saved = enabled ? readEditorSession<{ base: string; value: T }>(key) : null;
    if (saved?.base === base && JSON.stringify(saved.value) !== JSON.stringify(initial)) window.dispatchEvent(new CustomEvent("catalog2:recovered-unsaved", { detail: { productId: context.product?.id, versionId: context.version?.id } }));
  }, [key, base, enabled]);
  const set = useCallback<Dispatch<SetStateAction<T>>>(next => {
    setState(current => {
      const saved = enabled ? readEditorSession<{ base: string; value: T }>(key) : null;
      const previous = current.key === key && current.base === base && current.enabled === enabled ? current.value : saved?.base === base ? saved.value : initial;
      const value = typeof next === "function" ? (next as (v: T) => T)(previous) : next;
      if (enabled) writeEditorSession(key, { base, value });
      return { key, base, enabled, value };
    });
  }, [key, base, enabled]);
  return [value, set];
}
