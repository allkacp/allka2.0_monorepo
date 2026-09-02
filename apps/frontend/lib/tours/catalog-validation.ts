// ─── Validador do catálogo de tours (sprint de onboarding, bloco 3/3) ───────
// Roda contra o registro REAL em `registry.test.ts` e falha automaticamente
// se alguém adicionar um tour quebrado no futuro. Nunca decide elegibilidade
// em produção — isso continua sendo só `allowedAccountTypes`/`isEligible`
// (ver types.ts); aqui só PROVA que todo tour tem pelo menos um público real.
import type { TourDefinition, TourCategory, TourEligibilityContext } from "./types";
import { isTourEligible } from "./eligibility";

export const VALID_TOUR_CATEGORIES: TourCategory[] = [
  "primeiros-passos",
  "alertas-comunicacao",
  "produtos-catalogo",
  "memoria-lancamento",
];

const VALID_ACCOUNT_TYPES = ["admin", "empresas", "agencias", "lider", "nomades"] as const;

const STABLE_ID_PATTERN = /^[a-z0-9_-]+$/;

// Um contexto por combinação de perfil real que a plataforma tem hoje — usado
// SÓ pra provar que `hasEligibleAudience` não fica vazio, nunca pra decidir
// elegibilidade de verdade (a função de elegibilidade real do tour é chamada
// tal como está, sem nenhum atalho).
export const REPRESENTATIVE_ELIGIBILITY_CONTEXTS: TourEligibilityContext[] = [
  { accountType: "admin", adminProfile: { is_active: true, is_master: true, permissions: [] } },
  { accountType: "admin", adminProfile: { is_active: true, is_master: false, permissions: [] } },
  { accountType: "empresas", adminProfile: null },
  { accountType: "agencias", adminProfile: null },
  { accountType: "lider", adminProfile: null },
  { accountType: "nomades", adminProfile: null },
];

/** Reexportado por conveniência — mesma função única usada em toda a plataforma (ver `lib/tours/eligibility.ts`). */
export { isTourEligible };

/**
 * Verifica o catálogo inteiro e devolve a lista de problemas encontrados
 * (vazia = catálogo válido). Nunca lança — quem chama decide o que fazer
 * (o teste falha explicitamente listando cada problema).
 */
export function validateTourCatalog(tours: TourDefinition[]): string[] {
  const problems: string[] = [];
  const seenKeys = new Set<string>();
  const seenTitles = new Set<string>();

  for (const tour of tours) {
    const label = `Tour "${tour.key || tour.title || "(sem chave)"}"`;

    if (!tour.key?.trim()) {
      problems.push(`${label}: chave (key) vazia.`);
    } else if (seenKeys.has(tour.key)) {
      problems.push(`Chave duplicada: "${tour.key}".`);
    } else {
      seenKeys.add(tour.key);
    }

    if (!Number.isInteger(tour.version) || tour.version <= 0) {
      problems.push(`${label}: versão inválida (${String(tour.version)}) — precisa ser um número inteiro positivo.`);
    }

    if (!tour.title?.trim()) {
      problems.push(`${label}: título vazio.`);
    } else if (seenTitles.has(tour.title)) {
      problems.push(`Título duplicado: "${tour.title}".`);
    } else {
      seenTitles.add(tour.title);
    }

    if (!VALID_TOUR_CATEGORIES.includes(tour.category)) {
      problems.push(`${label}: categoria desconhecida ("${String(tour.category)}").`);
    }

    if (!tour.steps || tour.steps.length === 0) {
      problems.push(`${label}: nenhum passo definido.`);
    } else if (tour.steps.length < 3 || tour.steps.length > 8) {
      problems.push(`${label}: tem ${tour.steps.length} passos (esperado entre 3 e 8).`);
    }

    const seenStepIds = new Set<string>();
    for (const step of tour.steps ?? []) {
      if (seenStepIds.has(step.id)) {
        problems.push(`${label}: id de passo duplicado ("${step.id}").`);
      }
      seenStepIds.add(step.id);

      if (step.target !== null && !STABLE_ID_PATTERN.test(step.target)) {
        problems.push(`${label}, passo "${step.id}": target "${step.target}" não é uma chave estável de data-tour-id.`);
      }
      if (step.requiresOpening) {
        if (!STABLE_ID_PATTERN.test(step.requiresOpening.openerTarget)) {
          problems.push(`${label}, passo "${step.id}": requiresOpening.openerTarget inválido.`);
        }
        if (!step.requiresOpening.instruction?.trim()) {
          problems.push(`${label}, passo "${step.id}": requiresOpening sem instrução pra pessoa.`);
        }
      }
    }

    for (const at of tour.allowedAccountTypes ?? []) {
      if (!VALID_ACCOUNT_TYPES.includes(at)) {
        problems.push(`${label}: allowedAccountTypes tem tipo de conta desconhecido ("${at}").`);
      }
    }

    for (const route of tour.routes ?? []) {
      if (!route.startsWith("/")) {
        problems.push(`${label}: rota "${route}" não começa com "/".`);
      }
    }
    if (tour.initialRoute && !(tour.routes ?? []).includes(tour.initialRoute)) {
      problems.push(`${label}: initialRoute "${tour.initialRoute}" não está entre routes.`);
    }

    const hasEligibleAudience = REPRESENTATIVE_ELIGIBILITY_CONTEXTS.some((ctx) => isTourEligible(tour, ctx));
    if (!hasEligibleAudience) {
      problems.push(`${label}: nenhum perfil real da plataforma consegue ver este tour (público elegível vazio).`);
    }
  }

  return problems;
}
