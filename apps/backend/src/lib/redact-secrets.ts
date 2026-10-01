// Tira chaves e segredos de qualquer texto que vá para a tela, o histórico ou o log (mensagens de erro de provedores de IA etc.).
const SECRET_ENV_KEYS = ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "JWT_SECRET"];

export function redactSecrets(text: unknown): string {
  let t = String(text ?? "");
  for (const k of SECRET_ENV_KEYS) {
    const v = process.env[k];
    if (v && v !== "CHANGE_ME" && v.length >= 6) t = t.split(v).join("[chave oculta]");
  }
  return t
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[chave oculta]")
    .replace(/sk-[0-9A-Za-z_\-]{16,}/g, "[chave oculta]")
    .replace(/(api[_-]?key|authorization|bearer|token)(["'\s:=]+)[0-9A-Za-z._\-]{12,}/gi, "$1$2[oculto]");
}
