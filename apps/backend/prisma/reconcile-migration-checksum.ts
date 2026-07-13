/**
 * reconcile-migration-checksum.ts
 * ================================================================
 * Ferramenta de reconciliação CONTROLADA para o checksum registrado de UMA
 * migration já aplicada em `_prisma_migrations`, usada quando o CONTEÚDO em
 * disco de uma migration precisa ser corrigido (ex.: remover um BOM UTF-8
 * inválido) sem alterar o que ela efetivamente fez no banco.
 *
 * NUNCA re-executa a migration, NUNCA apaga histórico, NUNCA altera outra
 * coluna além de `checksum`. Recusa qualquer coisa que não bata exatamente
 * com o esperado.
 *
 * Exige, sempre:
 *   --migration=<nome exato da pasta em prisma/migrations>
 *   --expected-old-checksum=<sha256 hex que DEVE estar hoje em _prisma_migrations>
 *
 * Por padrão roda em modo DRY-RUN (só mostra o que faria). Só escreve com:
 *   --apply
 *
 * Recusa:
 *   - migration inexistente em prisma/migrations/<nome>/migration.sql;
 *   - checksum atual no banco diferente do --expected-old-checksum informado;
 *   - novo checksum (calculado do arquivo em disco agora) igual ao antigo
 *     (nada pra reconciliar — provavelmente engano de uso);
 *   - host remoto (só localhost/127.0.0.1).
 *
 * Uso (dry-run):
 *   npx tsx prisma/reconcile-migration-checksum.ts \
 *     --migration=0_baseline \
 *     --expected-old-checksum=4f783b5946bdb8ebbbf60d72768e903a1080af69699e8d5343ab71ae9a1b79c7
 *
 * Uso (aplicar de verdade):
 *   ...(mesmos argumentos) --apply
 * ================================================================
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { prisma } from "../src/lib/prisma";

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    args[key] = rest.length > 0 ? rest.join("=") : true;
  }
  return args;
}

async function main() {
  // ─── Guarda de ambiente — só local ────────────────────────────────────
  const rawUrl = process.env.DATABASE_URL ?? "";
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    console.error("❌ BLOQUEADO: DATABASE_URL ausente/inválida.");
    process.exit(1);
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    console.error(`❌ BLOQUEADO: host "${hostname}" não é localhost/127.0.0.1 — esta ferramenta só roda contra banco local.`);
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const migrationName = args.migration as string | undefined;
  const expectedOldChecksum = args["expected-old-checksum"] as string | undefined;
  const apply = args.apply === true;

  if (!migrationName) {
    console.error("❌ Uso: --migration=<nome exato> --expected-old-checksum=<sha256 hex> [--apply]");
    process.exit(1);
  }
  if (!expectedOldChecksum || !/^[0-9a-f]{64}$/i.test(expectedOldChecksum)) {
    console.error("❌ --expected-old-checksum é obrigatório e deve ser um SHA-256 hex válido (64 caracteres).");
    process.exit(1);
  }

  const migrationDir = path.resolve(__dirname, "migrations", migrationName);
  const migrationFile = path.join(migrationDir, "migration.sql");
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Arquivo não encontrado: ${migrationFile}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(migrationFile);
  const newChecksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; migration_name: string; checksum: string; finished_at: Date | null; applied_steps_count: bigint }>>(
    "SELECT id, migration_name, checksum, finished_at, applied_steps_count FROM _prisma_migrations WHERE migration_name = ?",
    migrationName,
  );

  if (rows.length === 0) {
    console.error(`❌ Nenhum registro de "${migrationName}" em _prisma_migrations deste banco — nada a reconciliar aqui.`);
    process.exit(1);
  }
  if (rows.length > 1) {
    console.error(`❌ Mais de um registro de "${migrationName}" encontrado — situação inesperada, abortando sem tocar em nada.`);
    process.exit(1);
  }

  const row = rows[0];
  console.log("─".repeat(70));
  console.log(`RECONCILIAÇÃO DE CHECKSUM — ${migrationName}`);
  console.log("─".repeat(70));
  console.log(`  Banco               : ${hostname}`);
  console.log(`  Arquivo             : ${migrationFile}`);
  console.log(`  Checksum atual (DB) : ${row.checksum}`);
  console.log(`  Checksum esperado   : ${expectedOldChecksum}`);
  console.log(`  Checksum novo (arq) : ${newChecksum}`);
  console.log(`  finished_at         : ${row.finished_at?.toISOString() ?? "(nulo)"}`);
  console.log(`  applied_steps_count : ${row.applied_steps_count}`);

  if (row.checksum.toLowerCase() !== expectedOldChecksum.toLowerCase()) {
    console.error(
      `\n❌ RECUSADO: checksum atual no banco (${row.checksum}) não bate com --expected-old-checksum ` +
        `(${expectedOldChecksum}) informado. Isso significa que o estado real é diferente do que você espera — ` +
        "não vou sobrescrever às cegas. Confira o estado do banco antes de tentar de novo.",
    );
    process.exit(1);
  }

  if (newChecksum.toLowerCase() === row.checksum.toLowerCase()) {
    console.error("\n❌ RECUSADO: o checksum calculado do arquivo em disco é IGUAL ao já registrado — nada para reconciliar. Verifique se o arquivo foi realmente alterado.");
    process.exit(1);
  }

  if (!apply) {
    console.log("\n🔎 DRY-RUN — nenhuma escrita realizada. Rode novamente com --apply para gravar.");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$executeRawUnsafe(
    "UPDATE _prisma_migrations SET checksum = ? WHERE migration_name = ? AND checksum = ?",
    newChecksum,
    migrationName,
    expectedOldChecksum,
  );
  if (result !== 1) {
    console.error(`\n❌ UPDATE afetou ${result} linha(s) (esperado 1) — estado mudou entre a leitura e a escrita. Nada foi gravado com segurança, mas confira manualmente.`);
    process.exit(1);
  }

  console.log(`\n✅ Checksum de "${migrationName}" atualizado: ${row.checksum} → ${newChecksum}`);
  console.log("   Nenhuma outra coluna foi tocada (finished_at, applied_steps_count, logs preservados).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ ERRO INESPERADO:", e);
  process.exit(1);
});
