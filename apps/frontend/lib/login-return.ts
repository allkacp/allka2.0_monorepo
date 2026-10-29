/** Destino por URL, não por armazenamento global: funciona após F5 e não mistura abas. */
export function safeLoginReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//")) return null;
    const url = new URL(value, "https://allka.invalid");
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "").toLowerCase();
    if (url.origin !== "https://allka.invalid" || !path || /(?:^|\/)(?:login|logout|primeiro-acesso)(?:\/|$)/.test(path)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function loginUrlFor(location: { pathname: string; search?: string; hash?: string }): string {
  const root = location.pathname.split("/")[1];
  const login = ["nomad", "nomades"].includes(root) ? "/nomad/login"
    : ["agency", "agencia", "partner", "parceiro"].includes(root) ? "/agency/login"
    : ["leader", "lider"].includes(root) ? "/leader/login"
    : ["company", "empresa"].includes(root) ? "/company/login" : "/login";
  const target = safeLoginReturnTo(`${location.pathname}${location.search ?? ""}${location.hash ?? ""}`);
  return target ? `${login}?returnTo=${encodeURIComponent(target)}` : login;
}
