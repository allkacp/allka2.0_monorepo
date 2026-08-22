/**
 * Gate usado por scripts locais que gravam dados (seed oficial, smoke tests
 * ao vivo) — garante que o DATABASE_URL configurado aponta para um host
 * local antes de qualquer escrita. Diferente de requireTestDatabaseUrl (que
 * exige um banco descartável com marcador _test/_ci e proíbe o nome "allka"),
 * este gate serve exatamente para o cenário oposto: scripts que devem rodar
 * contra o banco de desenvolvimento local de verdade (nome "allka"), mas
 * nunca contra um host remoto — produção ou QA online incluídos, já que
 * ambos são acessados por host, nunca por localhost/127.0.0.1.
 *
 * Não imprime a URL crua (pode conter senha) — só host e nome do banco.
 */
export function assertLocalDatabase(rawUrl: string | undefined): { host: string; database: string } {
  if (!rawUrl) {
    throw new Error("DATABASE_URL não configurado.");
  }

  const url = new URL(rawUrl);
  const host = url.hostname;
  const database = url.pathname.replace(/^\//, "");

  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `Recusado: DATABASE_URL aponta para um host remoto ("${host}"). Este script só roda contra banco local.`,
    );
  }

  return { host, database };
}
