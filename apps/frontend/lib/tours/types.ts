// ─── Registro de tours guiados (sprint de onboarding, bloco 1/3) ────────────
// Tipos do registro central — nunca definições de tour espalhadas pelas
// páginas. Um TourStep NUNCA localiza elemento por texto visível, classe CSS
// frágil ou posição na página — sempre por `target` (um valor estável de
// `data-tour-id`, adicionado só aos elementos realmente usados por um tour).

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

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
   * perfil/portal, o motor pula com segurança para o próximo passo válido —
   * nunca trava a página nem deixa overlay preso.
   */
  optional?: boolean;
}

export interface TourDefinition {
  /** Chave estável do tour (nunca muda entre versões). */
  key: string;
  /** Versão numérica — subir a versão oferece o tour de novo mesmo pra quem já concluiu a anterior. */
  version: number;
  title: string;
  description: string;
  /** `undefined` = todos os perfis. Filtragem aqui é só visual — o backend nunca valida isto (ele só guarda progresso). */
  allowedAccountTypes?: Array<"admin" | "empresas" | "agencias" | "lider" | "nomades">;
  /** Permissão adicional necessária, quando aplicável (checada via a mesma função usada no resto da plataforma). */
  requiredPermission?: string;
  initialRoute?: string;
  steps: TourStep[];
}
