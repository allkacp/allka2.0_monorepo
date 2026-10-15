// Exemplos do entregável de uma OPÇÃO de variação: links e um arquivo-modelo (referência ao arquivo já enviado).
import { normalizeFileRef, type DeliverableFileRef } from "./catalog2-deliverable-files";

export interface OptionExampleLink { label: string | null; url: string }

export function parseOptionExamples(json: string | null | undefined): OptionExampleLink[] {
  try {
    const v = json ? (JSON.parse(json) as unknown) : [];
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => ({ label: typeof (x as { label?: unknown })?.label === "string" ? ((x as { label: string }).label.trim() || null) : null, url: String((x as { url?: unknown })?.url ?? "").trim() }))
      .filter((x) => /^https?:\/\/[^\s]+$/i.test(x.url));
  } catch { return []; }
}

export function parseOptionExampleFile(json: string | null | undefined): DeliverableFileRef | null {
  try { return json ? normalizeFileRef(JSON.parse(json)) : null; } catch { return null; }
}
