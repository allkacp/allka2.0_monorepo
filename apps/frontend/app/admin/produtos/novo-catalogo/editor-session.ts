// Recuperação só nesta aba/usuário. Não equivale a salvar no servidor.
export function editorSessionKey(scope: string): string {
  let user = "anonymous";
  try { user = JSON.parse(localStorage.getItem("allka_user") ?? "null")?.id ?? user; } catch { /* sem sessão */ }
  return `allka:editor-recovery:${JSON.stringify([user, window.location.pathname, scope])}`;
}
export function readEditorSession<T>(key?: string): T | null {
  if (!key) return null;
  try { const row = JSON.parse(sessionStorage.getItem(key) ?? "null"); return row?.schema === 1 ? row.value as T : null; } catch { return null; }
}
export function writeEditorSession(key: string | undefined, value: unknown) {
  if (!key) return;
  try { sessionStorage.setItem(key, JSON.stringify({ schema: 1, value })); } catch { /* navegador sem armazenamento: mantém formulário em memória */ }
}
export function clearEditorSession(key?: string) {
  if (!key) return;
  try { for (const name of Object.keys(sessionStorage)) if (name === key || name.startsWith(`${key}:`)) sessionStorage.removeItem(name); } catch { /* sem armazenamento */ }
}
