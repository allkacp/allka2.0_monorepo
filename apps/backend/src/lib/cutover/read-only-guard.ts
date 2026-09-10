// Garantia técnica de somente-leitura para o simulador de virada.
//
// Isto NÃO é "o código só chama métodos de leitura" (disciplina de quem
// escreve a chamada) — é uma guarda no próprio client Prisma: qualquer ação
// de escrita lança ANTES de tocar o banco, mesmo que um bug ou uma mudança
// futura acidentalmente chame create/update/delete/upsert/executeRaw*.
// TRUNCATE/DROP só são alcançáveis via executeRaw(Unsafe), que também é
// bloqueado aqui — não há nenhum outro caminho de escrita no Prisma Client.
//
// Usado exclusivamente pelo simulador (src/scripts/cutover-simulation.ts) —
// não é anexado ao client `prisma` de src/lib/prisma.ts usado pelo resto da
// aplicação, que continua podendo escrever normalmente.

const WRITE_ACTIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
  "executeRaw",
  "executeRawUnsafe",
]);

export class CutoverReadOnlyViolation extends Error {
  constructor(model: string | undefined, action: string) {
    super(
      `Simulação de virada é somente leitura — ação bloqueada: ${model ?? "(raw)"}.${action}(). ` +
        "Este bloco não implementa nenhum modo de escrita; se isto disparou, é um bug no " +
        "simulador (ou em código chamado por ele), não uma tentativa real de alterar dados.",
    );
    this.name = "CutoverReadOnlyViolation";
  }
}

export type CutoverMiddlewareParams = { model?: string; action: string };
export type CutoverMiddlewareNext = (params: unknown) => Promise<unknown>;
export type CutoverMiddleware = (
  params: CutoverMiddlewareParams,
  next: CutoverMiddlewareNext,
) => Promise<unknown>;

export interface PrismaLikeClient {
  $use(middleware: CutoverMiddleware): void;
}

/**
 * Anexa a guarda de somente-leitura ao client informado e o devolve (mesma
 * instância, mutada). Qualquer chamada de escrita feita a partir daí lança
 * `CutoverReadOnlyViolation` antes de qualquer query real ser enviada ao
 * banco — a checagem acontece no middleware do Prisma, que roda antes do
 * `next()` que de fato despacha para o engine/banco.
 */
export function attachReadOnlyGuard<T extends PrismaLikeClient>(client: T): T {
  client.$use(async (params, next) => {
    if (WRITE_ACTIONS.has(params.action)) {
      throw new CutoverReadOnlyViolation(params.model, params.action);
    }
    return next(params);
  });
  return client;
}
