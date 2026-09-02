// ─── Elegibilidade de tour — função ÚNICA (sprint de onboarding, bloco 3/3) ─
// Movida de `contexts/onboarding-context.tsx` pra cá: a Central de Ajuda, a
// oferta automática, a oferta contextual, o motor do tour em andamento E o
// validador do catálogo (`catalog-validation.ts`) agora consultam esta MESMA
// função — nunca uma segunda checagem que possa divergir da real.
import type { TourDefinition, TourEligibilityContext } from "./types";

export function isTourEligible(tour: TourDefinition, ctx: TourEligibilityContext): boolean {
  if (tour.allowedAccountTypes && !tour.allowedAccountTypes.includes(ctx.accountType as (typeof tour.allowedAccountTypes)[number])) {
    return false;
  }
  if (tour.isEligible && !tour.isEligible(ctx)) return false;
  return true;
}
