import { beforeEach, expect, it } from "vitest";
import { clearEditorSession, editorSessionKey, readEditorSession, writeEditorSession } from "./editor-session";
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
it("separa usuário, versão e etapa; limpar um formulário não remove os demais", () => {
  localStorage.setItem("allka_user", JSON.stringify({ id: "u1" }));
  const key = editorSessionKey("step:v1:s1"), other = editorSessionKey("step:v2:s2");
  writeEditorSession(key, { name: "Em edição" }); writeEditorSession(`${key}:modal`, { name: "Filho" }); writeEditorSession(other, { name: "Outro" });
  localStorage.setItem("allka_user", JSON.stringify({ id: "u2" }));
  expect(readEditorSession(editorSessionKey("step:v1:s1"))).toBeNull();
  clearEditorSession(key);
  expect(readEditorSession(key)).toBeNull(); expect(readEditorSession(`${key}:modal`)).toBeNull();
  expect(readEditorSession(other)).toEqual({ name: "Outro" });
});
it("armazenamento inválido não derruba a tela", () => {
  sessionStorage.setItem("broken", "{x");
  expect(readEditorSession("broken")).toBeNull();
  expect(() => clearEditorSession("broken")).not.toThrow();
});
