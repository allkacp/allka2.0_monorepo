// Cliente Prisma do banco LEGADO (`allka_legacy`) — SOMENTE LEITURA.
//
// A aplicação nunca escreve aqui. A URL vem de `LEGACY_DATABASE_URL`, que
// aponta para um usuário MySQL com apenas `GRANT SELECT` (a barreira real é
// a permissão do banco; este módulo é a barreira de código em cima dela).
// A URL de escrita (`LEGACY_IMPORT_DATABASE_URL`) NUNCA é importada aqui —
// só o importador offline a usa.

import { PrismaClient as LegacyPrismaClient } from "./generated";

export type { LegacyPrismaClient };

// Lido de `process.env` (não do `config` congelado) para que testes possam
// apontar para um banco legado descartável em `before()`. `config.ts`
// declara/documenta a variável e valida o boot; a barreira real continua
// sendo a permissão SELECT-only do usuário MySQL.
function legacyUrl(): string | undefined {
  return process.env.LEGACY_DATABASE_URL || undefined;
}

export function isLegacyConfigured(): boolean {
  return Boolean(legacyUrl());
}

let client: LegacyPrismaClient | null = null;
let clientUrl: string | undefined;

/**
 * Devolve o cliente de leitura do legado, ou `null` quando
 * `LEGACY_DATABASE_URL` não está configurada (as rotas então respondem 503).
 */
export function getLegacyPrisma(): LegacyPrismaClient | null {
  const url = legacyUrl();
  if (!url) return null;
  if (!client || clientUrl !== url) {
    client = new LegacyPrismaClient({
      datasources: { db: { url } },
      log: ["warn", "error"],
    });
    clientUrl = url;
  }
  return client;
}

export class LegacyNotConfiguredError extends Error {
  httpStatus = 503;
  code = "legacy_not_configured";
  constructor() {
    super("A Consulta da Plataforma Anterior não está configurada neste ambiente.");
  }
}

/** Igual a getLegacyPrisma(), mas lança em vez de devolver null. */
export function requireLegacyPrisma(): LegacyPrismaClient {
  const c = getLegacyPrisma();
  if (!c) throw new LegacyNotConfiguredError();
  return c;
}
