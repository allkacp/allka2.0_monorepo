// Tipo da especialidade × "Quem executa" (reunião 2026-10-05): humano só vê especialidades humanas, IA só as de IA,
// "humano ou IA" só as híbridas (a agência escolhe na contratação). Sem tipo cadastrado, a especialidade é humana.
export type ExecKind = "humano" | "ia" | "hibrido";
export const EXEC_KIND_LABEL: Record<ExecKind, string> = { humano: "Humano", ia: "IA", hibrido: "Humano ou IA" };
export const specialtyKind = (sp: { execution_kind?: string | null } | null | undefined): ExecKind => (sp?.execution_kind === "ia" || sp?.execution_kind === "hibrido" ? sp.execution_kind : "humano");
export const specialtiesForMode = <T extends { execution_kind?: string | null }>(list: T[] | undefined, mode: string | null | undefined): T[] => (list ?? []).filter((sp) => specialtyKind(sp) === (mode === "ia" || mode === "hibrido" ? mode : "humano"));
export const isSpecialtyCompatible = (sp: { execution_kind?: string | null } | null | undefined, mode: string | null | undefined): boolean => !sp || specialtyKind(sp) === (mode === "ia" || mode === "hibrido" ? mode : "humano");
/** Id da especialidade que continua valendo ao trocar o "Quem executa" (senão vazio). */
export const keepSpecialtyForMode = (list: { id: string; execution_kind?: string | null }[] | undefined, specialtyId: string | null | undefined, mode: string): string =>
  specialtyId && isSpecialtyCompatible((list ?? []).find((sp) => sp.id === specialtyId), mode) ? specialtyId : "";
export const emptySpecialtyHint = (mode: string | null | undefined): string =>
  mode === "ia" ? "Nenhuma especialidade de IA cadastrada. Cadastre na Precificação (tipo IA)."
  : mode === "hibrido" ? "Nenhuma especialidade \"Humano ou IA\" cadastrada. Cadastre na Precificação (tipo Humano ou IA)."
  : "Nenhuma especialidade humana cadastrada.";
