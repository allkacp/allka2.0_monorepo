/**
 * Migração SQLite → MySQL
 * Uso: npx tsx migrate-sqlite-to-mysql.ts [caminho-do-arquivo.db]
 * Default: prisma/prod.db (depois prisma/dev.db)
 */

import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";

// @ts-ignore
import initSqlJs from "sql.js";

// ── Ordem FK-safe de inserção ──────────────────────────────────────────────
const TABLE_ORDER = [
  "nomade_levels",
  "partner_levels",
  "specialties",
  "admin_profiles",
  "campaigns",
  "terms",
  "system_alerts",
  "courses",
  "conversations",
  "companies",
  "users",
  "agencies",
  "nomades",
  "partner_profiles",
  "admin_permissions",
  "task_templates",
  "lider_areas",
  "qualifications",
  "wallet_transactions",
  "bank_accounts",
  "withdrawal_requests",
  "nomade_habilidades",
  "products",
  "match_queue_entries",
  "partner_commissions",
  "projects",
  "term_acceptances",
  "chat_participants",
  "chat_messages",
  "course_modules",
  "course_enrollments",
  "product_variations",
  "product_addons",
  "catalog_tasks",
  "invoices",
  "payments",
  "task_executions",
  "lessons",
  "project_products",
  "product_catalog_tasks",
  "project_tasks",
  "project_task_stages",
  "task_briefing_answers",
  "task_attachments",
  "task_assignment_history",
];

// Regex para detectar datas ISO8601 do SQLite (ex: "2025-01-15T10:30:00.000Z")
const ISO8601_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

// Nomes de colunas que contêm datetimes (Prisma armazena como ms no SQLite)
const DATETIME_COL_RE =
  /(_at|_date|date_|^date$|_login|_access|_queue|_expires|^data_|joined_at|enrolled_at|accepted_at|registration_date|certification_date|paused_date|scheduled_for|reviewed_at|read_at)$/i;

// Faixa de ms razoável para datas: 2001 → 2100
const MS_TS_MIN = 1_000_000_000_000;
const MS_TS_MAX = 4_102_444_800_000;

function toMysqlDatetime(iso: string): string {
  return iso
    .replace("T", " ")
    .replace(/Z$/, "")
    .replace(/([+-]\d{2}:\d{2})$/, "");
}

function msTsToMysql(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`
  );
}

function quote(val: any, colName?: string): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") {
    // Se a coluna é de data e o valor está na faixa de ms timestamp, converte
    if (
      colName &&
      DATETIME_COL_RE.test(colName) &&
      val >= MS_TS_MIN &&
      val <= MS_TS_MAX
    ) {
      return "'" + msTsToMysql(val) + "'";
    }
    return String(val);
  }
  if (typeof val === "boolean") return val ? "1" : "0";
  const str = String(val);
  // Converter datas ISO8601 para formato MySQL
  if (ISO8601_RE.test(str)) {
    return "'" + toMysqlDatetime(str) + "'";
  }
  // Escape backslash and single quotes
  return "'" + str.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

async function migrate(dbPath: string) {
  console.log(`\n📂 Lendo SQLite: ${dbPath}`);
  const fileBuffer = fs.readFileSync(dbPath);

  const SQL = await initSqlJs();
  const db = new SQL.Database(fileBuffer);

  // Listar tabelas existentes no SQLite
  const tablesResult = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  )[0];
  if (!tablesResult) {
    console.log("⚠️  Nenhuma tabela encontrada no SQLite.");
    db.close();
    return;
  }
  const sqliteTables = new Set(
    tablesResult.values.map((r: any) => r[0] as string),
  );
  console.log(`   Tabelas encontradas: ${[...sqliteTables].join(", ")}\n`);

  // Filtrar tabelas que existem no SQLite na ordem correta
  const orderedTables = TABLE_ORDER.filter((t) => sqliteTables.has(t));
  // Adicionar quaisquer tabelas extras não mapeadas no final
  for (const t of sqliteTables) {
    if (!orderedTables.includes(t)) orderedTables.push(t);
  }

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST ?? "mysql",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "allka",
    password: process.env.MYSQL_PASSWORD ?? "allka_dev",
    database: process.env.MYSQL_DATABASE ?? "allka",
    multipleStatements: true,
  });

  console.log("✅ Conectado ao MySQL\n");

  await conn.query("SET FOREIGN_KEY_CHECKS = 0;");

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const table of orderedTables) {
    const result = db.exec(`SELECT * FROM \`${table}\``);
    if (!result || result.length === 0) {
      console.log(`   [${table}] vazia — pulando`);
      continue;
    }

    const { columns, values } = result[0];
    if (values.length === 0) {
      console.log(`   [${table}] 0 linhas — pulando`);
      continue;
    }

    const cols = columns.map((c: string) => `\`${c}\``).join(", ");
    let inserted = 0;
    let skipped = 0;

    for (const row of values) {
      const vals = row
        .map((v: any, i: number) => quote(v, columns[i]))
        .join(", ");
      const sql = `INSERT IGNORE INTO \`${table}\` (${cols}) VALUES (${vals});`;
      try {
        const [res]: any = await conn.query(sql);
        if (res.affectedRows > 0) inserted++;
        else skipped++;
      } catch (err: any) {
        console.warn(`   ⚠️  [${table}] erro ao inserir linha: ${err.message}`);
        skipped++;
      }
    }

    console.log(`   [${table}] ${inserted} inseridos, ${skipped} ignorados`);
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 1;");
  await conn.end();
  db.close();

  console.log(
    `\n✅ Migração concluída: ${totalInserted} inseridos, ${totalSkipped} ignorados\n`,
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const dbPath = path.resolve(args[0]);
    if (!fs.existsSync(dbPath)) {
      console.error(`❌ Arquivo não encontrado: ${dbPath}`);
      process.exit(1);
    }
    await migrate(dbPath);
    return;
  }

  // Sem argumento: migra prod.db e depois dev.db (INSERT IGNORE evita duplicatas)
  const candidates = [
    path.join(__dirname, "prisma", "prod.db"),
    path.join(__dirname, "prisma", "dev.db"),
  ];

  let ran = false;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      await migrate(p);
      ran = true;
    }
  }

  if (!ran) {
    console.error("❌ Nenhum arquivo .db encontrado em prisma/");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
