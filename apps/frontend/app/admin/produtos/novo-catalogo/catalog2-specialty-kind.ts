// Tipo da especialidade × "Quem executa": humano mostra as especialidades humanas, IA só as de IA, e "humano ou IA" (híbrido)
// mostra TODAS (humanas + IA + as marcadas como "humano ou IA"), porque a etapa pode ser feita por qualquer um dos dois.
// Sem tipo cadastrado, a especialidade é humana.
export type ExecKind = "humano" | "ia" | "hibrido";
export const EXEC_KIND_LABEL: Record<ExecKind, string> = { humano: "Humano", ia: "IA", hibrido: "Humano ou IA" };
export const specialtyKind = (sp: { execution_kind?: string | null } | null | undefined): ExecKind => (sp?.execution_kind === "ia" || sp?.execution_kind === "hibrido" ? sp.execution_kind : "humano");
// O tipo antigo "Humano ou IA" de especialidade não é mais oferecido: a etapa híbrida escolhe UMA especialidade humana e UMA de IA.
export const specialtiesForMode = <T extends { execution_kind?: string | null }>(list: T[] | undefined, mode: string | null | undefined): T[] =>
  (list ?? []).filter((sp) => (mode === "hibrido" ? specialtyKind(sp) !== "hibrido" : specialtyKind(sp) === (mode === "ia" ? "ia" : "humano")));
export const isSpecialtyCompatible = (sp: { execution_kind?: string | null } | null | undefined, mode: string | null | undefined): boolean =>
  !sp || (mode === "hibrido" ? specialtyKind(sp) !== "hibrido" : specialtyKind(sp) === (mode === "ia" ? "ia" : "humano"));
/** Id da especialidade que continua valendo ao trocar o "Quem executa" (senão vazio). */
export const keepSpecialtyForMode = (list: { id: string; execution_kind?: string | null }[] | undefined, specialtyId: string | null | undefined, mode: string): string =>
  specialtyId && isSpecialtyCompatible((list ?? []).find((sp) => sp.id === specialtyId), mode) ? specialtyId : "";
export const emptySpecialtyHint = (mode: string | null | undefined): string =>
  mode === "ia" ? "Nenhuma especialidade de IA cadastrada. Cadastre na Precificação (tipo IA)."
  : mode === "hibrido" ? "Nenhuma especialidade cadastrada. Cadastre na Precificação."
  : "Nenhuma especialidade humana cadastrada.";

/** Busca sem acento e sem diferenciar maiúsculas: "grafi" encontra "Designer Gráfico". */
export const normalizeSearch = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const filterSpecialties = <T extends { name: string }>(list: T[], query: string): T[] => {
  const q = normalizeSearch(query);
  if (!q) return list;
  const words = q.split(/\s+/);
  return list.filter((sp) => { const n = normalizeSearch(sp.name); return words.every((w) => n.includes(w)); });
};
