// ─── Registro de tours guiados (sprint de onboarding, blocos 1-2/3) ─────────
// Tipos do registro central — nunca definições de tour espalhadas pelas
// páginas. Um TourStep NUNCA localiza elemento por texto visível, classe CSS
// frágil ou posição na página — sempre por `target` (um valor estável de
// `data-tour-id`, adicionado só aos elementos realmente usados por um tour).

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourCategory = "primeiros-passos" | "alertas-comunicacao" | "produtos-catalogo" | "memoria-lancamento";

export interface TourStep {
  /** Chave estável do passo — persistida como `last_step_key`, nunca um índice numérico. */
  id: string;
  /**
   * Valor de `data-tour-id` do elemento alvo. `null` = passo "central" (sem
   * elemento, ex.: uma explicação genérica), sempre exibido.
   */
  target: string | null;
  title: string;
  description: string;
  placement?: TourPlacement;
  /**
   * Passo opcional: se o elemento-alvo não existir no DOM para aquele
   * perfil/permissão/tela (ex.: tabela vazia), o motor pula com segurança
   * pro próximo passo válido — nunca trava a página nem deixa overlay preso.
   */
  optional?: boolean;
}

/**
 * Contexto real do usuário logado, pro registro decidir elegibilidade sem
 * comparação textual frágil de cargo — sempre os mesmos dados que `/auth/me`
 * já devolve.
 */
export interface TourEligibilityContext {
  accountType: string;
  adminProfile: { is_active?: boolean; is_master?: boolean; permissions?: { module: string; action: string }[] } | null | undefined;
}

export interface TourDefinition {
  /** Chave estável do tour (nunca muda entre versões). */
  key: string;
  /** Versão numérica — subir a versão oferece o tour de novo mesmo pra quem já concluiu a anterior. */
  version: number;
  title: string;
  description: string;
  category: TourCategory;
  /** `undefined` = todos os perfis. Filtragem aqui é só visual — o backend nunca valida isto (ele só guarda progresso). */
  allowedAccountTypes?: Array<"admin" | "empresas" | "agencias" | "lider" | "nomades">;
  /**
   * Checagem adicional de permissão, quando aplicável — SEMPRE a mesma
   * função de decisão já usada pra mostrar/esconder a tela real (ex.:
   * `hasAdminModulePermission`/`canManageAlertsAdmin` de
   * lib/admin-permissions.ts), nunca uma comparação nova que possa divergir
   * da regra real da tela.
   */
  isEligible?: (ctx: TourEligibilityContext) => boolean;
  /**
   * Prefixos de rota onde este tour faz sentido — usados tanto pra oferta
   * contextual (só oferece quando a pessoa está numa dessas rotas) quanto
   * pra "onde abrir" quando o tour é iniciado pela Central de Ajuda a partir
   * de outra tela.
   */
  routes: string[];
  /** Rota preferencial pra abrir quando iniciado fora dela (ex.: pela Ajuda). Padrão: routes[0]. */
  initialRoute?: string;
  steps: TourStep[];
}
