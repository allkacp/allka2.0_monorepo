// Guarda de ambiente do simulador de virada (manifesto de retenção +
// simulação, bloco seguinte à auditoria de preparação da virada limpa).
//
// Mesma filosofia já usada em PRODUCT_FEEDBACK_ENVIRONMENT/COMMS_ENVIRONMENT
// (ver src/config.ts): o ambiente é sempre um valor EXPLÍCITO, nunca
// inferido de NODE_ENV — porque NODE_ENV é "production" tanto na VPS de QA
// quanto na de produção real neste projeto (não existe um NODE_ENV="qa").
// Inferir daria falso positivo de segurança.
//
// Este simulador é somente leitura (ver read-only-guard.ts), mas a guarda
// de ambiente existe mesmo assim: o objetivo é consolidar, desde já, o
// hábito de nunca rodar ferramentas de virada sem confirmação explícita de
// ambiente — antes de existir qualquer modo de escrita real.

const ALLOWED_ENVIRONMENTS = new Set(["local", "qa"]);

export class CutoverEnvironmentNotAllowed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CutoverEnvironmentNotAllowed";
  }
}

function redactDatabaseUrl(raw: string): string {
  return raw.replace(/:\/\/([^:@/]+):([^@/]*)@/, "://$1:***@");
}

/**
 * Lança se a simulação de virada não puder rodar no ambiente atual.
 * Retorna o ambiente confirmado ("local" | "qa") quando permitido.
 *
 * Regras (nenhuma inferida — todas explícitas):
 *   1. CUTOVER_SIM_ENVIRONMENT precisa estar definido como "local" ou "qa".
 *      Ausente, "production", ou qualquer outro valor → recusado.
 *   2. Mesmo com (1) OK, DATABASE_URL não pode conter um marcador visível
 *      de produção ("producao"/"production") — defesa em profundidade caso
 *      alguém aponte a variável de ambiente errada para o banco errado.
 */
export function assertCutoverSimulationAllowed(
  env: NodeJS.ProcessEnv = process.env,
): "local" | "qa" {
  const raw = env.CUTOVER_SIM_ENVIRONMENT;

  if (!raw) {
    throw new CutoverEnvironmentNotAllowed(
      "CUTOVER_SIM_ENVIRONMENT é obrigatório (local|qa) para rodar o simulador de virada. " +
        "Nunca inferido de NODE_ENV ou de DATABASE_URL. Ausente = recusado por padrão.",
    );
  }

  if (!ALLOWED_ENVIRONMENTS.has(raw)) {
    throw new CutoverEnvironmentNotAllowed(
      `Simulação de virada recusada: ambiente "${raw}" não é permitido (só local|qa). ` +
        "Este bloco não implementa nenhum modo de escrita, mas mesmo assim nunca deve ser " +
        "apontado para produção.",
    );
  }

  const dbUrl = env.DATABASE_URL ?? "";
  if (!dbUrl) {
    throw new CutoverEnvironmentNotAllowed(
      "DATABASE_URL é obrigatório para rodar o simulador de virada.",
    );
  }
  if (/produc(a|ã)o|production/i.test(dbUrl)) {
    throw new CutoverEnvironmentNotAllowed(
      `Simulação de virada recusada: DATABASE_URL parece apontar para produção ` +
        `("${redactDatabaseUrl(dbUrl)}"). Aponte para um banco local ou de QA.`,
    );
  }

  return raw as "local" | "qa";
}
