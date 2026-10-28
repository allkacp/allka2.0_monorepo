// Menu da AGÊNCIA PARTNER (a mesma agência, com o upgrade de Partner ativo). Regra do usuário (26/10/2026): ela NÃO vê tudo.
// Vê: Dashboard, Clientes, Usuários, Projetos, Catálogo, Conexões e acessos, Combos, Tarefas, Navegador seguro, Financeiro, Relatórios (tudo DELA),
// e do Partner só Comissões e Saques. NÃO vê "Agências" (do Partner) nem "Tarefas internas" (são da Allka).
// Fonte única para a barra lateral e para o menu "Mais" do celular — assim os dois nunca divergem.

/** Do menu de Partner, só estes dois entram no menu da agência Partner. */
export const PARTNER_AGENCY_EXTRA_HREFS = ["/partner/comissoes", "/partner/saques"] as const;

/** Itens de Partner que a agência Partner enxerga (Comissões e Saques); o resto do menu de Partner não entra. */
export function partnerAgencyExtraItems<T extends { href: string }>(partnerMenu: T[]): T[] {
  return partnerMenu.filter((item) => (PARTNER_AGENCY_EXTRA_HREFS as readonly string[]).includes(item.href));
}

/** "Tarefas internas" é da Allka: a agência Partner nunca vê, mesmo que o módulo esteja liberado para outras agências. */
export function agencyMayHaveInternalTasks(isPartnerActive: boolean): boolean {
  return !isPartnerActive;
}
