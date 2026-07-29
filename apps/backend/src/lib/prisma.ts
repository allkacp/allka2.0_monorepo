import { PrismaClient } from "@prisma/client";
import { cleanZeroDatetimes, isZeroDateError } from "./clean-zero-datetimes";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

const dbUrl = process.env.DATABASE_URL ?? "";
const isMySQL = dbUrl.startsWith("mysql");

const client = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Global middleware: catch zero-date errors from ANY query, fix DB, retry once.
// A limpeza em si vive em clean-zero-datetimes.ts (única implementação —
// antes existia triplicada, cada cópia com seu próprio cooldown mesmo
// operando no mesmo banco).
if (isMySQL) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).$use(
    async (
      params: { model?: string; action: string; args: unknown; dataPath: string[]; runInTransaction: boolean },
      next: (params: unknown) => Promise<unknown>,
    ) => {
      try {
        return await next(params);
      } catch (err) {
        if (!isZeroDateError(err)) throw err;
        console.warn(`⚠️  Zero-date error on ${params.model}.${params.action} — cleaning up…`);
        await cleanZeroDatetimes(client, true);
        return await next(params); // retry once after cleanup
      }
    },
  );
}

// Removido de propósito: um middleware $use() que auto-gerava
// Project.project_code existiu aqui brevemente e foi removido — abria sua
// PRÓPRIA transação (client.$transaction(...)) separada da transação do
// chamador (se o create() falhasse depois por outro motivo, o número da
// sequência já tinha sido consumido, criando buraco permanente) e não
// tinha teste persistido. Todo código que cria Project agora usa o helper
// explícito createProjectWithSequentialCode() (ver src/lib/create-project.ts),
// que gera o código sempre na MESMA transação/conexão do create.

export const prisma: PrismaClient = client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}
