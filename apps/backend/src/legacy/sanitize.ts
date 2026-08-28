// Política EXPLÍCITA de campos bloqueados para o legado (sprint de produtos,
// bloco 1/6, Parte 4).
//
// Mesmo quando um dia forem importados "todos os dados", o legado NUNCA
// guarda credencial/segredo/valor de autenticação. O importador chama
// `sanitizeForLegacy` em cada registro ANTES de calcular o checksum e antes
// de escrever. Registra os NOMES removidos, nunca os valores.

// Padrões de NOME de campo proibidos (case-insensitive). São propositalmente
// específicos para não remover campos legítimos parecidos (ex.: "author",
// "authored_at" não batem em /(^|_)auth(_|$)/).
const BLOCKED_KEY_PATTERNS: RegExp[] = [
  /pass(word)?/i,
  /senha/i,
  /(^|_)hash(_|$)/i,
  /password_hash/i,
  /(^|_)salt(_|$)/i,
  /(^|_)token(s)?(_|$)/i,
  /refresh[_-]?token/i,
  /reset[_-]?token/i,
  /verification[_-]?token/i,
  /setup[_-]?token/i,
  /(^|_)otp(_|$)/i,
  /(^|_)mfa/i,
  /2fa/i,
  /(^|_)cookie/i,
  /(^|_)session(_|$)/i,
  /(^|_)sessao/i,
  /(^|_)secret(s)?(_|$)/i,
  /segredo/i,
  /api[_-]?key/i,
  /apikey/i,
  /client[_-]?secret/i,
  /private[_-]?key/i,
  /(^|_)jwt(_|$)/i,
  /bearer/i,
  /authorization/i,
  /(^|_)auth[_-]?(code|key|secret|token)/i,
  /recovery[_-]?code/i,
  /(^|_)pin(_|$)/i,
  /(^|_)cvv(_|$)/i,
  /(^|_)cvc(_|$)/i,
  /card[_-]?number/i,
  /(full[_-]?)?card[_-]?num/i,
  /(^|_)iban(_|$)/i,
  /account[_-]?number/i,
  /routing[_-]?number/i,
  /pix[_-]?key/i,
  /bank[_-]?account/i,
  /vapid/i,
  /encryption[_-]?key/i,
  /access[_-]?token/i,
];

export function isBlockedKey(key: string): boolean {
  return BLOCKED_KEY_PATTERNS.some((re) => re.test(key));
}

export interface SanitizeResult {
  clean: unknown;
  removedFields: string[];
}

/**
 * Percorre recursivamente objetos/arrays e remove qualquer chave cujo NOME
 * bate com um padrão proibido. Devolve a cópia limpa e a lista (com caminho
 * pontilhado) dos campos removidos — nunca os valores.
 */
export function sanitizeForLegacy(input: unknown): SanitizeResult {
  const removed: string[] = [];

  function walk(value: unknown, path: string): unknown {
    if (Array.isArray(value)) {
      return value.map((v, i) => walk(v, `${path}[${i}]`));
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const childPath = path ? `${path}.${k}` : k;
        if (isBlockedKey(k)) {
          removed.push(childPath);
          continue;
        }
        out[k] = walk(v, childPath);
      }
      return out;
    }
    return value;
  }

  const clean = walk(input, "");
  return { clean, removedFields: removed };
}

/**
 * Recusa payloads que carregam segredos conhecidos como VALOR (não só como
 * nome de campo) — ex.: uma string que parece um JWT ou uma chave hex longa
 * em um campo de nome inocente. Retorna a lista de caminhos suspeitos.
 * O importador REMOVE esses valores (substitui por "[removido: possível
 * segredo]") e marca o registro como sanitizado.
 */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}$/, // JWT
  /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, // bcrypt hash
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM
  /^[A-Fa-f0-9]{64,}$/, // chave hex longa (>=32 bytes)
];

export function scrubSecretValues(input: unknown): { clean: unknown; scrubbed: string[] } {
  const scrubbed: string[] = [];
  function walk(value: unknown, path: string): unknown {
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = walk(v, path ? `${path}.${k}` : k);
      }
      return out;
    }
    if (typeof value === "string" && SECRET_VALUE_PATTERNS.some((re) => re.test(value.trim()))) {
      scrubbed.push(path);
      return "[removido: possível segredo]";
    }
    return value;
  }
  return { clean: walk(input, ""), scrubbed };
}
