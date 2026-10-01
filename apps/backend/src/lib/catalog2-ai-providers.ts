// Provedores e modelos de IA que a plataforma sabe usar + verificação de "provedor configurado".
// Hoje só o Gemini tem conector real; outros provedores podem ser cadastrados no futuro sem mudar o fluxo.
import { isTaskAIAdapterSimulated } from "./task-ai";

export interface AIProviderInfo { key: string; label: string; models: string[]; env_key: string }

export const AI_PROVIDERS: AIProviderInfo[] = [
  { key: "gemini", label: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"], env_key: "GEMINI_API_KEY" },
];

export const ON_FAILURE_ACTIONS = ["forward_human", "retry_once", "stop"] as const;
export type OnFailure = (typeof ON_FAILURE_ACTIONS)[number];
export const ON_FAILURE_LABEL: Record<OnFailure, string> = {
  forward_human: "Encaminhar a um humano", retry_once: "Tentar mais uma vez e, se falhar, encaminhar a um humano", stop: "Parar e avisar o líder",
};

export const findProvider = (key: string | null | undefined) => AI_PROVIDERS.find((p) => p.key === (key ?? ""));

/** Provedor "configurado": chave presente no ambiente (ou um adaptador simulado de homologação instalado). */
export function providerConfigured(key: string | null | undefined): boolean {
  const p = findProvider(key);
  if (!p) return false;
  if (isTaskAIAdapterSimulated()) return true;
  const v = process.env[p.env_key];
  return !!v && v !== "CHANGE_ME";
}

export function providerProblem(provider: string | null | undefined, model: string | null | undefined): string | null {
  const p = findProvider(provider);
  if (!p) return `O provedor "${provider ?? ""}" não é conhecido pela plataforma.`;
  if (!model || !p.models.includes(model)) return `O modelo "${model ?? ""}" não está disponível no provedor ${p.label}.`;
  if (!providerConfigured(provider)) return `O provedor ${p.label} não está configurado neste ambiente (falta a chave de acesso).`;
  return null;
}
