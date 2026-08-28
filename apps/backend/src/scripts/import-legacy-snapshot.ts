/**
 * Importador OFFLINE da Consulta da Plataforma Anterior (produtos).
 *
 *   npm run import:legacy-snapshot -- --dry-run
 *   npm run import:legacy-snapshot
 *   npm run import:legacy-snapshot -- --batch=<id> --allow-refresh
 *
 * Lê o banco OPERACIONAL (DATABASE_URL) e escreve o banco LEGADO
 * (LEGACY_IMPORT_DATABASE_URL). NÃO é uma rota HTTP. Não usa
 * `prisma db push --accept-data-loss`.
 */
import { runImport, DEFAULT_SOURCE_NAME } from "../legacy/importer";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

async function main() {
  const importUrl = process.env.LEGACY_IMPORT_DATABASE_URL;
  if (!importUrl) {
    console.error("❌ LEGACY_IMPORT_DATABASE_URL não definida. É a credencial de ESCRITA do banco legado (offline).");
    process.exit(1);
  }

  const dryRun = arg("dry-run") !== undefined;
  const opts = {
    dryRun,
    sourceName: arg("source-name") || DEFAULT_SOURCE_NAME,
    sourceEnvironment: arg("source-env") || "local",
    batchId: arg("batch") || undefined,
    allowRefresh: arg("allow-refresh") !== undefined,
    legacyImportUrl: importUrl,
  };

  console.log(`▶ Importação ${dryRun ? "(DRY-RUN)" : ""} — origem "${opts.sourceName}" / ambiente "${opts.sourceEnvironment}"`);

  const result = await runImport(opts);

  console.log("\n── Resultado ─────────────────────────────────");
  console.log(`  Modo            : ${result.dry_run ? "dry-run" : "escrita"}`);
  console.log(`  Lote            : ${result.batch_id ?? "(nenhum — dry-run)"}`);
  console.log(`  Situação        : ${result.status}`);
  console.log(`  Versão importador: ${result.importer_version}`);
  console.log(`  Esperado        : ${result.totals.expected}`);
  console.log(`  Importado       : ${result.totals.imported}`);
  console.log(`  Inalterados     : ${result.totals.skipped_unchanged}`);
  console.log(`  Novos/alterados : ${result.totals.changed}`);
  console.log(`  Sanitizados     : ${result.totals.sanitized_records}`);
  console.log(`  Checksum do lote: ${result.batch_checksum}`);
  if (result.blocked_fields_removed_sample.length) {
    console.log(`  Campos removidos (amostra): ${result.blocked_fields_removed_sample.join(", ")}`);
  }
  console.log("\n── Conferência origem × legado ───────────────");
  for (const [entity, r] of Object.entries(result.reconciliation)) {
    const flag = r.divergence === 0 ? "OK " : "!! ";
    console.log(`  ${flag}${entity.padEnd(22)} esperado=${r.expected_source}  importado=${r.imported}  divergência=${r.divergence}  (${r.justification})`);
  }
  if (result.divergences.length) {
    console.log("\n── Divergências por registro ─────────────────");
    for (const d of result.divergences) console.log(`  ${d.entity_type} ${d.original_id}: ${d.reason}`);
  }
  console.log("─────────────────────────────────────────────");

  if (result.status === "completed_with_divergences") {
    console.log("⚠️  Concluído COM divergências — revisar antes de considerar a fotografia válida.");
  } else if (result.status === "completed") {
    console.log("✅ Concluído. Quantidades e checksums coerentes.");
  }
}

main().catch((err) => {
  console.error("❌ Falha na importação:", err instanceof Error ? err.message : err);
  process.exit(1);
});
