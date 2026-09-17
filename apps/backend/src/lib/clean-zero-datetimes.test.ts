import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mysql from "mysql2/promise";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "./prisma";
import { cleanZeroDatetimes } from "./clean-zero-datetimes";

// `CREATE TRIGGER` falha com o erro 1295 do MySQL ("not supported in the
// prepared statement protocol") quando executado via
// `prisma.$executeRawUnsafe` — o query engine da Prisma sempre usa
// prepared statements. Uma conexão mysql2 direta (texto puro, sem
// prepared statement) evita isso; usada só para essa DDL específica.
async function runPlainSql(sql: string) {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

// Item 17 (continuação da publicação, 2026-09-17) — achado real em
// produção: a versão anterior desta função (a) rodava a varredura inteira
// dentro de UMA transação com limite de 30s, o que derrubou o boot do
// backend contra o banco real (174 tabelas, volume real — nunca
// replicável num banco de teste pequeno); e (b) comparava
// `CAST(col AS CHAR)` contra o literal exato `'0000-00-00 00:00:00'`, que
// NUNCA bate numa coluna `datetime(3)` (o tipo que toda `DateTime` do
// Prisma usa aqui) porque o CAST devolve a parte fracionária
// (`0000-00-00 00:00:00.000`) — ou seja, a função nunca corrigia de fato
// nenhuma coluna `datetime(3)` zerada, só rodava a varredura à toa.
//
// Estes testes não reproduzem o VOLUME real de produção (impossível num
// banco descartável de CI/local) — provam a CORREÇÃO funcional (fixa
// datetime(3) de verdade, idempotente) e a PROPRIEDADE ESTRUTURAL que
// elimina o crash original: uma coluna falhando (aqui, forçado de forma
// determinística via trigger, não por timing de lock/timeout) nunca
// impede as demais colunas de serem processadas na mesma chamada.
describe("cleanZeroDatetimes — correção real de datetime(3) e isolamento de falha por coluna", () => {
  before(() => {
    requireTestDatabaseUrl();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  async function withZeroSqlMode<T>(fn: () => Promise<T>): Promise<T> {
    await prisma.$executeRawUnsafe(
      "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
    );
    return fn();
  }

  it("1. corrige um zero-date real numa coluna datetime(3) NOT NULL para 1970-01-01 (não apenas colunas sem precisão fracionária)", async () => {
    const email = `zerouser-${Date.now()}@allka.test`;
    const user = await prisma.user.create({
      data: { id: `zu_${Date.now()}`, email, password_hash: "x", name: "Zero Test", role: "admin", account_type: "admin" },
    });
    await withZeroSqlMode(() =>
      prisma.$executeRawUnsafe(`UPDATE \`users\` SET \`created_at\` = '0000-00-00 00:00:00' WHERE \`id\` = ?`, user.id),
    );

    const before: any = await prisma.$queryRawUnsafe(
      "SELECT CAST(created_at AS CHAR) AS c FROM users WHERE id = ?",
      user.id,
    );
    assert.match(before[0].c, /^0000-00-00/, "setup falhou — a coluna precisa estar zerada antes do teste");

    const fixed = await cleanZeroDatetimes(prisma as any, true);
    assert.ok(fixed >= 1, "esperava corrigir pelo menos 1 linha");

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(row.created_at.toISOString(), new Date("1970-01-01T00:00:00.000Z").toISOString());

    await prisma.user.delete({ where: { id: user.id } });
  });

  it("2. corrige um zero-date numa coluna datetime(3) NULLABLE para NULL (nunca inventa 1970 numa coluna opcional)", async () => {
    const email = `zerouser2-${Date.now()}@allka.test`;
    const user = await prisma.user.create({
      data: { id: `zu2_${Date.now()}`, email, password_hash: "x", name: "Zero Test 2", role: "admin", account_type: "admin" },
    });
    await withZeroSqlMode(() =>
      prisma.$executeRawUnsafe(`UPDATE \`users\` SET \`last_login\` = '0000-00-00 00:00:00' WHERE \`id\` = ?`, user.id),
    );

    await cleanZeroDatetimes(prisma as any, true);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(row.last_login, null);

    await prisma.user.delete({ where: { id: user.id } });
  });

  it("3. idempotente — rodar de novo imediatamente não encontra mais nada pra corrigir", async () => {
    const fixed = await cleanZeroDatetimes(prisma as any, true);
    assert.equal(fixed, 0);
  });

  it("4. uma coluna falhando (determinístico, via trigger) NUNCA impede as demais de serem corrigidas na MESMA chamada — a propriedade que faltava na versão que derrubou o boot", async () => {
    // Prepara 2 zero-dates em tabelas diferentes.
    const email = `zerouser3-${Date.now()}@allka.test`;
    const user = await prisma.user.create({
      data: { id: `zu3_${Date.now()}`, email, password_hash: "x", name: "Zero Test 3", role: "admin", account_type: "admin" },
    });
    await withZeroSqlMode(() =>
      prisma.$executeRawUnsafe(`UPDATE \`users\` SET \`last_login\` = '0000-00-00 00:00:00' WHERE \`id\` = ?`, user.id),
    );

    const project = await prisma.project.create({
      data: { id: `zp_${Date.now()}`, project_code: `ZP-${Date.now()}`, title: "Zero Proj Test", status: "ativo" },
    });
    await withZeroSqlMode(() =>
      prisma.$executeRawUnsafe(`UPDATE \`projects\` SET \`updated_at\` = '0000-00-00 00:00:00' WHERE \`id\` = ?`, project.id),
    );

    // Força a coluna de `users` a falhar sempre, de forma 100% determinística
    // (nunca depende de timing de lock/timeout) — via trigger, criado com
    // privilégio de root (o mesmo usado pela suíte de testes já precisa
    // disso pra outras operações administrativas do schema).
    await runPlainSql("DROP TRIGGER IF EXISTS _test_force_fail_users_update");
    await runPlainSql(
      "CREATE TRIGGER _test_force_fail_users_update BEFORE UPDATE ON users FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falha forcada para teste de isolamento'",
    );

    try {
      const fixed = await cleanZeroDatetimes(prisma as any, true);
      // `users.last_login` falhou (trigger) — não conta como corrigido.
      // `projects.updated_at` não tem trigger — precisa ter sido corrigido
      // na MESMA chamada, mesmo com outra coluna falhando.
      assert.ok(fixed >= 1, "esperava que projects.updated_at fosse corrigido mesmo com users falhando");

      const proj = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
      assert.equal(proj.updated_at.toISOString(), new Date("1970-01-01T00:00:00.000Z").toISOString());

      const rowsUser: any = await prisma.$queryRawUnsafe(
        "SELECT CAST(last_login AS CHAR) AS c FROM users WHERE id = ?",
        user.id,
      );
      assert.match(rowsUser[0].c, /^0000-00-00/, "users.last_login precisa CONTINUAR zerado — a coluna que falhou não deve ter sido silenciosamente marcada como corrigida");
    } finally {
      await runPlainSql("DROP TRIGGER IF EXISTS _test_force_fail_users_update");
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });
});
