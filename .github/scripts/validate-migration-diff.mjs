// Classificador estático do SQL gerado por `prisma migrate diff --script`.
//
// Não tenta ser um parser SQL completo — cobre exatamente o vocabulário que
// `prisma migrate diff` realmente emite para MySQL (visto nos diffs reais
// gerados nesta reconciliação). Qualquer construção fora desse vocabulário
// cai em "blocked" por padrão (nunca em "safe") — ver classifyClause().
//
// Três níveis:
//   safe    — operação estrutural comprovadamente aditiva (nunca perde linha
//             nem reinterpreta dado existente). Elegível para apply
//             automático (ainda sujeito ao checksum-lock do workflow).
//   review  — não é obviamente destrutiva, mas também não é comprovadamente
//             seguro só pelo texto do diff (ex.: MODIFY/CHANGE de coluna —
//             o diff não mostra o tipo ANTERIOR, então não dá pra provar que
//             não é um estreitamento). Exige confirmação humana extra
//             (explicit_review_ack), além do checksum-lock.
//   blocked — comprovadamente destrutivo ou muda identidade de dado (DROP
//             COLUMN, DROP TABLE, DELETE, TRUNCATE, RENAME). O workflow
//             recusa mode=apply incondicionalmente — precisa ser feito
//             manualmente fora desta ferramenta.

const EMPTY_MARKER = "This is an empty migration";

function isEmptyDiff(sql) {
  return sql.includes(EMPTY_MARKER);
}

function stripComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

// Divide o SQL em statements (terminados por ";"), preservando o texto
// original de cada um (sem o ";" final, sem espaço nas pontas).
function splitStatements(sql) {
  const body = stripComments(sql);
  return body
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Divide a lista de cláusulas de um ALTER TABLE por vírgulas de topo,
// respeitando parênteses (ex.: DECIMAL(10,2)) e crases de identificador.
function splitTopLevelClauses(text) {
  const clauses = [];
  let depth = 0;
  let inBacktick = false;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "`") inBacktick = !inBacktick;
    if (!inBacktick) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
    }
    if (ch === "," && depth === 0 && !inBacktick) {
      clauses.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) clauses.push(current.trim());
  return clauses;
}

const SAFE_CLAUSE_PATTERNS = [
  /^ADD\s+COLUMN\b/i,
  /^ADD\s+CONSTRAINT\b.*FOREIGN\s+KEY\b/i,
  /^ADD\s+(UNIQUE\s+)?(KEY|INDEX)\b/i,
  /^ADD\s+PRIMARY\s+KEY\b/i,
  /^DROP\s+FOREIGN\s+KEY\b/i,
  /^DROP\s+(KEY|INDEX)\b/i,
  // RENAME INDEX só troca o nome de uma estrutura de busca — o índice não
  // carrega dado nem identidade de linha, diferente de RENAME COLUMN/TABLE
  // (que mudam o que um nome referencia). Nunca perde nem reinterpreta dado.
  /^RENAME\s+INDEX\b/i,
];

const BLOCKED_CLAUSE_PATTERNS = [
  /^DROP\s+COLUMN\b/i,
  /^DROP\s+PRIMARY\s+KEY\b/i,
  /^RENAME\s+(COLUMN|TO)\b/i,
];

// MODIFY/CHANGE: o script de diff nunca mostra o tipo ANTERIOR da coluna,
// só o statement que leva ao tipo NOVO — não dá pra provar por aqui que uma
// mudança de tipo não estreita nada. Trato como "review" sempre, nunca
// "safe". CHANGE com troca de nome de coluna (CHANGE `old` `new` ...) é
// rename disfarçado de retype -> "blocked" direto.
function classifyModifyOrChange(clause) {
  const changeRename = clause.match(/^CHANGE\s+`?(\w+)`?\s+`?(\w+)`?\s/i);
  if (changeRename && changeRename[1].toLowerCase() !== changeRename[2].toLowerCase()) {
    return { level: "blocked", reason: `CHANGE renomeia coluna (${changeRename[1]} -> ${changeRename[2]})` };
  }
  return { level: "review", reason: "MODIFY/CHANGE de coluna — diff não prova que o tipo anterior era compatível" };
}

function classifyClause(clause) {
  for (const pattern of SAFE_CLAUSE_PATTERNS) {
    if (pattern.test(clause)) return { level: "safe", reason: clause };
  }
  for (const pattern of BLOCKED_CLAUSE_PATTERNS) {
    if (pattern.test(clause)) return { level: "blocked", reason: clause };
  }
  if (/^(MODIFY|CHANGE)\b/i.test(clause)) {
    const result = classifyModifyOrChange(clause);
    return { ...result, reason: `${result.reason}: ${clause}` };
  }
  return { level: "blocked", reason: `cláusula não reconhecida (default = blocked): ${clause}` };
}

function classifyStatement(stmt) {
  if (/^CREATE\s+TABLE\b/i.test(stmt)) {
    return { statement: stmt, level: "safe", details: ["CREATE TABLE"] };
  }
  if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(stmt)) {
    return { statement: stmt, level: "safe", details: ["CREATE INDEX"] };
  }
  if (/^DROP\s+INDEX\b.*\bON\b/i.test(stmt)) {
    return { statement: stmt, level: "safe", details: ["DROP INDEX (metadado, não perde linha)"] };
  }
  if (/^DROP\s+TABLE\b/i.test(stmt)) {
    return { statement: stmt, level: "blocked", details: ["DROP TABLE"] };
  }
  if (/^DROP\s+DATABASE\b/i.test(stmt)) {
    return { statement: stmt, level: "blocked", details: ["DROP DATABASE"] };
  }
  if (/^DELETE\b/i.test(stmt)) {
    return { statement: stmt, level: "blocked", details: ["DELETE"] };
  }
  if (/^TRUNCATE\b/i.test(stmt)) {
    return { statement: stmt, level: "blocked", details: ["TRUNCATE"] };
  }
  if (/^RENAME\s+TABLE\b/i.test(stmt)) {
    return { statement: stmt, level: "blocked", details: ["RENAME TABLE"] };
  }
  const alterMatch = stmt.match(/^ALTER\s+TABLE\s+`?[\w.]+`?\s+([\s\S]+)$/i);
  if (alterMatch) {
    const clauses = splitTopLevelClauses(alterMatch[1]);
    const details = clauses.map(classifyClause);
    const level = details.some((d) => d.level === "blocked")
      ? "blocked"
      : details.some((d) => d.level === "review")
        ? "review"
        : "safe";
    return { statement: stmt, level, details: details.map((d) => d.reason) };
  }
  return { statement: stmt, level: "blocked", details: ["statement não reconhecido (default = blocked)"] };
}

export function classifyDiff(sql) {
  const isEmpty = isEmptyDiff(sql);
  const statements = isEmpty ? [] : splitStatements(sql).map(classifyStatement);
  return {
    isEmpty,
    statements,
    safeCount: statements.filter((s) => s.level === "safe").length,
    reviewCount: statements.filter((s) => s.level === "review").length,
    blockedCount: statements.filter((s) => s.level === "blocked").length,
    blocked: statements.filter((s) => s.level === "blocked"),
    review: statements.filter((s) => s.level === "review"),
  };
}

export function summarize(result) {
  const lines = [];
  lines.push(`empty=${result.isEmpty}`);
  lines.push(`statements=${result.statements.length} safe=${result.safeCount} review=${result.reviewCount} blocked=${result.blockedCount}`);
  if (result.blocked.length > 0) {
    lines.push("-- BLOCKED --");
    for (const b of result.blocked) lines.push(`  ${b.statement.slice(0, 120)}`);
  }
  if (result.review.length > 0) {
    lines.push("-- REVIEW --");
    for (const r of result.review) lines.push(`  ${r.statement.slice(0, 120)}`);
  }
  return lines.join("\n");
}

// CLI: node validate-migration-diff.mjs <arquivo.sql>
// Exit 0 se blockedCount === 0, exit 1 caso contrário. Sempre imprime o
// resumo (inclusive quando passa) para o log/resumo do job.
//
// Comparação via pathToFileURL (não template string manual) — no Windows
// "file://C:\..." vs import.meta.url nunca batem byte-a-byte por causa da
// barra invertida e do formato de drive letter.
const { pathToFileURL } = await import("node:url");
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fs = await import("node:fs");
  const path = process.argv[2];
  if (!path) {
    console.error("uso: node validate-migration-diff.mjs <arquivo.sql>");
    process.exit(2);
  }
  const sql = fs.readFileSync(path, "utf8");
  const result = classifyDiff(sql);
  console.log(summarize(result));
  console.log(`\nJSON: ${JSON.stringify({ isEmpty: result.isEmpty, safeCount: result.safeCount, reviewCount: result.reviewCount, blockedCount: result.blockedCount })}`);
  process.exit(result.blockedCount > 0 ? 1 : 0);
}
