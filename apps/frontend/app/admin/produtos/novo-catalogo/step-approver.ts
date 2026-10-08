// P-14 (reunião 07/10): um único seletor "Quem aprova esta etapa" no lugar das caixinhas soltas (líder / especialista).
// Regra do usuário: mesmo quando a execução é feita por IA (ou híbrida), SEMPRE há um qualificador aprovando — não existe "ninguém" para esses casos.
export type ApproverMode = "leader" | "specialist" | "leader_specialist" | "none";

export const APPROVER_OPTIONS: { value: ApproverMode; label: string }[] = [
  { value: "leader", label: "Líder" },
  { value: "specialist", label: "Especialista" },
  { value: "leader_specialist", label: "Líder e depois o especialista" },
  { value: "none", label: "Sem qualificação (só etapas feitas por pessoas, cadastro antigo)" },
];

type Flags = { requires_qualification: boolean; requires_specialist_qualification: boolean; execution_mode?: string };

export function approverOf(f: Flags): ApproverMode {
  if (f.requires_qualification && f.requires_specialist_qualification) return "leader_specialist";
  if (f.requires_specialist_qualification) return "specialist";
  if (f.requires_qualification) return "leader";
  return "none";
}

export function applyApprover(mode: ApproverMode): { requires_qualification: boolean; requires_specialist_qualification: boolean } {
  return { requires_qualification: mode === "leader" || mode === "leader_specialist", requires_specialist_qualification: mode === "specialist" || mode === "leader_specialist" };
}

/** Etapa com IA/híbrida nunca fica sem qualificador: se estiver "sem qualificação", passa a ser o líder. */
export function enforceApprover<T extends Flags>(f: T): T {
  return f.execution_mode && f.execution_mode !== "humano" && approverOf(f) === "none" ? { ...f, ...applyApprover("leader") } : f;
}
