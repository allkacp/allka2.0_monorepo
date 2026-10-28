/** Código público da empresa; o ID interno usado nas relações não muda. */
export function formatCompanySequenceId(value: number | undefined): string {
  return value == null ? "—" : String(value).padStart(3, "0");
}
