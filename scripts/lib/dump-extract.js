/**
 * dump-extract.js — leitor streaming de mysqldump.
 *
 * O dump da plataforma antiga tem 2,9 GB e usa extended inserts: algumas
 * tabelas de log têm um único `INSERT` de centenas de MB numa linha só. Ler
 * linha a linha com readline estoura a memória, então aqui a leitura é por
 * chunk, e a linha de uma tabela que não interessa é descartada sem nunca ser
 * materializada inteira.
 *
 * Uso:
 *   const { extract } = require("./lib/dump-extract");
 *   await extract({ dump, out, wanted: { tabela: Infinity, outra: 300 } });
 */

const fs = require("node:fs");
const path = require("node:path");

const MAX_STRING = 300;

/** Lê os valores de um `INSERT ... VALUES (..),(..);` já isolado. */
function parseTuples(s, start) {
  const tuples = [];
  let i = start;
  const n = s.length;
  while (i < n) {
    while (i < n && s[i] !== "(") {
      if (s[i] === ";") return tuples;
      i++;
    }
    if (i >= n) break;
    i++;
    const row = [];
    let cur = "";
    let quoted = false;
    let inStr = false;
    while (i < n) {
      const c = s[i];
      if (inStr) {
        if (c === "\\") {
          const nx = s[i + 1];
          const map = { n: "\n", r: "\r", t: "\t", 0: "\0", Z: "\x1a", b: "\b" };
          cur += map[nx] !== undefined ? map[nx] : nx;
          i += 2;
          continue;
        }
        if (c === "'") {
          if (s[i + 1] === "'") {
            cur += "'";
            i += 2;
            continue;
          }
          inStr = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === "'") {
        inStr = true;
        quoted = true;
        i++;
        continue;
      }
      if (c === "," || c === ")") {
        row.push([cur.trim(), quoted]);
        cur = "";
        quoted = false;
        i++;
        if (c === ")") break;
        continue;
      }
      cur += c;
      i++;
    }
    tuples.push(row);
  }
  return tuples;
}

function coerce(raw, wasQuoted, maxString) {
  if (!wasQuoted && raw === "NULL") return null;
  if (raw.startsWith("_binary ")) raw = raw.slice(8);
  if (!wasQuoted && /^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (maxString && raw.length > maxString) {
    return raw.slice(0, maxString) + "…[truncado]";
  }
  return raw;
}

/**
 * @param {object} o
 * @param {string} o.dump  caminho do .sql
 * @param {string} o.out   caminho do .json de saída
 * @param {Record<string, number>} o.wanted  tabela → máximo de linhas
 * @param {number} [o.maxString]  trunca strings acima disso (0 = não trunca)
 * @param {string} [o.escopo]  descrição gravada no arquivo
 */
async function extract({ dump, out, wanted, maxString = MAX_STRING, escopo = "" }) {
  const schema = {};
  const data = {};
  const counts = {};
  let current = null;
  let inCreate = false;

  function handleLine(line) {
    if (line.startsWith("CREATE TABLE")) {
      const m = line.match(/CREATE TABLE `([^`]+)`/);
      if (m) {
        current = m[1];
        schema[current] = [];
        inCreate = true;
      }
      return;
    }
    if (inCreate) {
      if (/^\)\s*ENGINE/.test(line)) {
        inCreate = false;
        return;
      }
      const col = line.match(/^\s+`([^`]+)`\s+\S/);
      if (col) schema[current].push(col[1]);
      return;
    }
    if (!line.startsWith("INSERT INTO")) return;
    const m = line.match(/^INSERT INTO `([^`]+)` VALUES /);
    if (!m) return;
    const table = m[1];
    if (!(table in wanted)) return;

    const cols = schema[table] || [];
    const limit = wanted[table];
    const rows = (data[table] = data[table] || []);
    const tuples = parseTuples(line, m[0].length);
    counts[table] = (counts[table] || 0) + tuples.length;
    for (const t of tuples) {
      if (rows.length >= limit) break;
      const obj = {};
      t.forEach(([v, q], i) => {
        obj[cols[i] || `col${i}`] = coerce(v, q, maxString);
      });
      rows.push(obj);
    }
  }

  console.log(`▶ Lendo ${path.basename(dump)}…`);
  const stream = fs.createReadStream(dump, { encoding: "utf8", highWaterMark: 1 << 22 });
  let pending = "";
  let skipping = false;
  let bytes = 0;
  let lastLog = Date.now();

  for await (const chunk of stream) {
    bytes += chunk.length;
    if (skipping) {
      const nl = chunk.indexOf("\n");
      if (nl === -1) continue;
      skipping = false;
      pending = chunk.slice(nl + 1);
    } else {
      pending += chunk;
    }
    let nl;
    while ((nl = pending.indexOf("\n")) !== -1) {
      handleLine(pending.slice(0, nl));
      pending = pending.slice(nl + 1);
    }
    if (pending.length > 8 << 20) {
      const m = pending.match(/^INSERT INTO `([^`]+)`/);
      if (!m || !(m[1] in wanted)) {
        skipping = true;
        pending = "";
      }
    }
    if (Date.now() - lastLog > 20000) {
      console.log(`  … ${(bytes / 1073741824).toFixed(2)} GB lidos`);
      lastLog = Date.now();
    }
  }
  if (pending.trim()) handleLine(pending);

  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        _fonte: path.basename(dump),
        _escopo: escopo,
        _gerado: new Date().toISOString(),
        counts,
        schema: Object.fromEntries(
          Object.keys(wanted).filter((t) => schema[t]).map((t) => [t, schema[t]]),
        ),
        data,
      },
      null,
      1,
    ),
    "utf8",
  );

  console.log(`\n✅ ${out}  (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)\n`);
  for (const t of Object.keys(wanted)) {
    const got = (data[t] || []).length;
    const tot = counts[t] || 0;
    console.log(
      `  ${t.padEnd(40)} ${String(tot).padStart(7)} linhas${got < tot ? `  (amostra: ${got})` : ""}`,
    );
  }
  return { schema, data, counts };
}

module.exports = { extract, parseTuples, coerce };
