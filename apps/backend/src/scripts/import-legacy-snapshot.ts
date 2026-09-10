/**
 * Importador OFFLINE da Consulta da Plataforma Anterior (produtos).
 *
 * PRÉVIA LOCAL (padrão — descartável):
 *   npm run import:legacy-snapshot -- --dry-run
 *   npm run import:legacy-snapshot
 *   npm run import:legacy-snapshot -- --batch=<id> --allow-refresh
 *
 * SNAPSHOT HISTÓRICO OFICIAL (imutável — exige parâmetros explícitos):
 *   # sempre teste antes com --dry-run:
 *   npm run import:legacy-snapshot -- --kind=official \
 *     --source-name="Plataforma allka — produção (produtos operacionais)" \
 *     --source-env=producao --snapshot-at=2026-09-10T00:00:00Z --dry-run
 *   # gravação real (permanente, sela o lote):
 *   npm run import:legacy-snapshot -- --kind=official \
 *     --source-name="Plataforma allka — produção (produtos operacionais)" \
 *     --source-env=producao --snapshot-at=2026-09-10T00:00:00Z --confirm-official
 *   # reexecução depois de selado → apenas VALIDA (não regrava); qualquer
 *   # divergência da origem interrompe com relatório.
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
  const official = arg("official") !== undefined || arg("kind") === "official";
  const kind: "preview" | "official" = official ? "official" : "preview";

  const snapshotAtRaw = arg("snapshot-at");
  let snapshotAt: Date | undefined;
  if (snapshotAtRaw !== undefined) {
    snapshotAt = new Date(snapshotAtRaw);
    if (Number.isNaN(snapshotAt.getTime())) {
      console.error(`❌ --snapshot-at inválido: "${snapshotAtRaw}". Use ISO 8601 (ex.: 2026-09-10T00:00:00Z).`);
      process.exit(1);
    }
  }

  const opts = {
    dryRun,
    kind,
    // Oficial NÃO tem default de nome/ambiente — precisa ser dito. Preview
    // mantém exatamente os defaults de sempre.
    sourceName: official ? arg("source-name") : arg("source-name") || DEFAULT_SOURCE_NAME,
    sourceEnvironment: official ? arg("source-env") : arg("source-env") || "local",
    snapshotAt,
    acknowledgeOfficial: arg("confirm-official") !== undefined,
    batchId: arg("batch") || undefined,
    allowRefresh: arg("allow-refresh") !== undefined,
    legacyImportUrl: importUrl,
  };

  console.log(
    `▶ Importação ${dryRun ? "(DRY-RUN) " : ""}[${kind.toUpperCase()}] — origem "${opts.sourceName ?? "(não informada)"}" / ` +
      `ambiente "${opts.sourceEnvironment ?? "(não informado)"}"`,
  );

  const result = await runImport(opts);

  console.log("\n── Resultado ─────────────────────────────────");
  console.log(`  Modo            : ${result.dry_run ? "dry-run" : "escrita"}`);
  console.log(`  Tipo do lote    : ${result.kind}${result.sealed ? " (SELADO — imutável)" : ""}`);
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

  if (result.status === "validated_official") {
    console.log("✅ Snapshot Histórico Oficial VALIDADO — origem idêntica ao lote selado. Nada foi gravado.");
  } else if (result.status === "completed_with_divergences") {
    console.log("⚠️  Concluído COM divergências — revisar antes de considerar a fotografia válida.");
    process.exit(1);
  } else if (result.status === "completed") {
    console.log(
      result.sealed
        ? "✅ Snapshot Histórico Oficial SELADO. Quantidades e checksums coerentes. O lote agora é imutável."
        : "✅ Concluído. Quantidades e checksums coerentes.",
    );
  }
}

main().catch((err) => {
  console.error("❌ Falha na importação:", err instanceof Error ? err.message : err);
  const anyErr = err as { reconciliation?: Record<string, unknown>; divergences?: unknown[] };
  if (anyErr?.reconciliation) {
    console.error("\n── Conferência ──────────────────────────────");
    for (const [entity, r] of Object.entries(anyErr.reconciliation)) {
      const rr = r as { expected_source: number; imported: number; divergence: number; justification: string };
      console.error(`  ${entity.padEnd(22)} esperado=${rr.expected_source}  importado=${rr.imported}  divergência=${rr.divergence}  (${rr.justification})`);
    }
  }
  if (Array.isArray(anyErr?.divergences) && anyErr.divergences.length) {
    console.error("\n── Divergências por registro ─────────────────");
    for (const d of anyErr.divergences as Array<{ entity_type: string; original_id: string; reason: string }>) {
      console.error(`  ${d.entity_type} ${d.original_id}: ${d.reason}`);
    }
  }
  process.exit(1);
});
