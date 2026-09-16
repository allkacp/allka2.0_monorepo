// Item 16.3 (reuniao 2026-09-14, "Conferir as ferramentas").
//
// Achado real: migrate-deploy-checked.sh decidia "seguro" ou "abortar"
// olhando só o DIFF AGREGADO de TODAS as migrations pendentes de uma vez.
// Isso tem um ponto cego: se uma migration pendente ANTIGA já teve seu
// efeito aplicado fisicamente fora da trilha do Prisma (o padrao exato do
// incidente "Table already exists"), mas OUTRA migration pendente, mais
// nova, e genuinamente aditiva, o diff AGREGADO sai nao-vazio (por causa da
// nova) e mascarava a antiga -- o script achava "seguro", chamava `migrate
// deploy`, que tentaria recriar a tabela da migration antiga e falharia (ou
// pior, em outro engine, corrompia estado).
//
// Este script confere CADA migration pendente, INDIVIDUALMENTE: extrai os
// nomes de tabela/coluna que ela cria (`CREATE TABLE`/`ADD COLUMN`) e
// pergunta ao information_schema do banco REAL se esse nome ja existe. Se
// existir, essa migration especifica ja teve seu efeito aplicado fora da
// trilha do Prisma -- abortar, mesmo que o diff agregado pareca seguro.
//
// Roda com `node` puro (sem tsx/typescript -- nao estao na imagem de
// runtime): `node migrate-precheck.js <migration_name> [<migration_name> ...]`
// Exit 0 = nenhuma pendente colide com o banco real. Exit 1 = colisao
// encontrada (nome impresso) OU erro ao consultar o banco (fail-closed).
"use strict";
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function extractTargets(sql) {
  const tables = new Set();
  const columns = []; // { table, column }
  const createTableRe = /CREATE\s+TABLE\s+`([^`]+)`/gi;
  let m;
  while ((m = createTableRe.exec(sql))) tables.add(m[1]);

  // ALTER TABLE `t` ... ADD COLUMN `c` ... (pode ter varias clausulas
  // separadas por virgula; cada ADD COLUMN dentro do mesmo ALTER pertence
  // à mesma tabela do ALTER TABLE mais próximo antes dela.)
  const alterBlocks = sql.split(/(?=ALTER\s+TABLE\s+`)/gi);
  for (const block of alterBlocks) {
    const tableMatch = block.match(/^ALTER\s+TABLE\s+`([^`]+)`/i);
    if (!tableMatch) continue;
    const table = tableMatch[1];
    const addColRe = /ADD\s+COLUMN\s+`([^`]+)`/gi;
    let cm;
    while ((cm = addColRe.exec(block))) columns.push({ table, column: cm[1] });
  }
  return { tables: [...tables], columns };
}

async function main() {
  const names = process.argv.slice(2).filter(Boolean);
  if (names.length === 0) {
    console.log("migrate-precheck: nenhuma migration pendente para checar — ok.");
    process.exit(0);
  }

  const prisma = new PrismaClient();
  let unsafe = [];
  try {
    for (const name of names) {
      const sqlPath = path.join(__dirname, "prisma", "migrations", name, "migration.sql");
      if (!fs.existsSync(sqlPath)) {
        console.error(`migrate-precheck: ##[error] migration.sql não encontrado para ${name} (${sqlPath}) — abortando (fail-closed).`);
        unsafe.push(`${name}: arquivo de migration ausente na imagem`);
        continue;
      }
      const sql = fs.readFileSync(sqlPath, "utf8");
      const { tables, columns } = extractTargets(sql);

      for (const t of tables) {
        const rows = await prisma.$queryRawUnsafe(
          "SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
          t,
        );
        const count = Number(rows?.[0]?.c ?? 0);
        if (count > 0) unsafe.push(`${name}: CREATE TABLE \`${t}\` — tabela JÁ EXISTE no banco real (efeito já presente fora da trilha do Prisma)`);
      }
      for (const { table, column } of columns) {
        const rows = await prisma.$queryRawUnsafe(
          "SELECT COUNT(*) as c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
          table,
          column,
        );
        const count = Number(rows?.[0]?.c ?? 0);
        if (count > 0) unsafe.push(`${name}: ADD COLUMN \`${table}\`.\`${column}\` — coluna JÁ EXISTE no banco real (efeito já presente fora da trilha do Prisma)`);
      }
    }
  } catch (err) {
    console.error("migrate-precheck: ##[error] falha ao consultar information_schema — abortando (fail-closed):", err instanceof Error ? err.message : err);
    await prisma.$disconnect();
    process.exit(1);
  }
  await prisma.$disconnect();

  if (unsafe.length > 0) {
    console.error("migrate-precheck: ##[error] " + unsafe.length + " migration(s) pendente(s) com efeito JÁ PRESENTE fisicamente no banco (drift por migration individual, mesmo que o diff agregado pareça seguro):");
    for (const u of unsafe) console.error("  - " + u);
    console.error("migrate-precheck: NÃO prosseguir com 'migrate deploy' — reconciliar isoladamente cada migration acima antes de repetir o deploy.");
    process.exit(1);
  }
  console.log(`migrate-precheck: ${names.length} migration(s) pendente(s) conferida(s) individualmente — nenhum alvo (tabela/coluna) já existe fisicamente. Seguro prosseguir.`);
  process.exit(0);
}

main();
