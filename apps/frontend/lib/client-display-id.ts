/** Código público de clientes, independente de usuários/empresas e das FKs. */
export function formatClientSequenceId(sequence: number): string {
  return String(sequence).padStart(3, "0");
}
