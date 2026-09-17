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

/**
 * Gate para scripts autorizados a escrever em produção — usado SÓ quando o
 * modo de produção é explicitamente pedido (nunca como substituto de
 * assertLocalDatabase, que continua intocado para todo o resto).
 *
 * Item 17 (continuação da publicação, 2026-09-17) — achado real:
 * `catalog2-import-prepared-state.ts` chamava `assertLocalDatabase` também
 * no seu modo `--target-env=production`, mesmo já exigindo confirmação
 * explícita, checksum de manifesto e backup para esse modo. Isso é
 * estruturalmente incompatível: o destino de produção real
 * (docker-compose.prod.yml) não publica a porta do MySQL em lugar nenhum
 * alcançável como "local" — o serviço só existe na rede Docker privada
 * `allka_internal`, resolvido por nome de serviço (ex. "mysql"), nunca por
 * localhost/127.0.0.1. Ou seja: o modo de produção, do jeito que estava,
 * nunca conseguia passar por essa checagem contra o destino real — só
 * "funcionaria" se alguém publicasse a porta do MySQL (exatamente o que a
 * tarefa proibiu) ou criasse um túnel contornando a trava (também
 * proibido).
 *
 * Este gate substitui `assertLocalDatabase` SÓ nesse modo: exige um host
 * declarado EXPLICITAMENTE por quem chama (nunca inferido, nunca
 * default) e recusa qualquer divergência entre o host declarado e o host
 * real da URL de conexão — a mesma garantia que `--expected-database-name`
 * já dá para o nome do banco. Continua recusando string vazia/ausente.
 */
export function assertExpectedProductionDatabaseHost(
  rawUrl: string | undefined,
  expectedHost: string,
): { host: string; database: string } {
  if (!rawUrl) {
    throw new Error("DATABASE_URL/--target-url não configurado.");
  }
  if (!expectedHost) {
    throw new Error(
      "--expected-database-host é obrigatório e não pode ser vazio para um destino de produção — nunca inferido da URL.",
    );
  }

  const url = new URL(rawUrl);
  const host = url.hostname;
  const database = url.pathname.replace(/^\//, "");

  if (host !== expectedHost) {
    throw new Error(
      `Recusado: --expected-database-host ("${expectedHost}") não bate com o host real da --target-url ("${host}") — destino divergente do declarado.`,
    );
  }

  return { host, database };
}
