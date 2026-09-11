/**
 * ORQUESTRADOR OFICIAL dos 6 domínios do Snapshot Histórico do Legado.
 *
 * PRÉVIA / DRY-RUN (padrão — nunca escreve nada):
 *   npm run legacy:snapshot -- --domain=products
 *   npm run legacy:snapshot -- --domain=all
 *   npm run legacy:snapshot -- --domain=all --json
 *
 * SNAPSHOT HISTÓRICO OFICIAL (escrita permanente — exige TUDO isto junto):
 *   npm run legacy:snapshot -- --domain=<dominio|all> \
 *     --kind=official \
 *     --confirm-official \
 *     --confirm-phrase="EU CONFIRMO A GRAVACAO PERMANENTE DO SNAPSHOT HISTORICO OFICIAL" \
 *     --source-name="Plataforma allka — produção" \
 *     --source-env=producao \
 *     --snapshot-at=2026-09-10T00:00:00Z \
 *     --backup-manifest=/caminho/para/MANIFESTO_xxx.md
 *   (sempre rode com --dry-run primeiro, sem as flags de oficial, para
 *   conferir o resultado antes.)
 *
 * Ver docs/legacy-snapshot-cli.md para a sintaxe completa e as proibições.
 *
 * Compatibilidade: `npm run import:legacy-snapshot` continua funcionando
 * exatamente como antes (só o domínio de produtos) — este comando novo é
 * quem cobre os 6 domínios.
 */
import path from "node:path";
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { PrismaClient as LegacyPrisma } from "../legacy/generated";
import {
  LEGACY_DOMAIN_ORDER,
  ALL_SELECTABLE_DOMAIN_KEYS,
  LegacyDomainKey,
  isLegacyDomainKey,
  redactUrl,
  assertOriginNotSameAsDestination,
  assertOperationalNotConfusedWithLegacy,
  assertEnvironmentCoherent,
  SnapshotGuardError,
  preflightCheck,
  deriveSourceName,
  defaultPreviewSourceName,
  runDomain,
  runAllDomains,
  type DomainRunSummary,
} from "../legacy/snapshot-orchestrator";

export const OFFICIAL_CONFIRMATION_PHRASE = "EU CONFIRMO A GRAVACAO PERMANENTE DO SNAPSHOT HISTORICO OFICIAL";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const domainArg = arg("domain");
  if (!domainArg) {
    console.error(`❌ --domain é obrigatório. Valores aceitos: ${ALL_SELECTABLE_DOMAIN_KEYS.join(", ")}, all (all roda só os 6 canônicos: ${LEGACY_DOMAIN_ORDER.join(", ")})`);
    process.exit(1);
  }
  const isAll = domainArg === "all";
  if (!isAll && !isLegacyDomainKey(domainArg)) {
    console.error(`❌ --domain="${domainArg}" não é um domínio válido. Valores aceitos: ${ALL_SELECTABLE_DOMAIN_KEYS.join(", ")}, all (all roda só os 6 canônicos: ${LEGACY_DOMAIN_ORDER.join(", ")})`);
    process.exit(1);
  }

  const wantsOfficial = arg("kind") === "official";
  const dryRun = !wantsOfficial || !flag("confirm-official");
  // A checagem completa (todas as condições juntas) acontece abaixo — isto
  // aqui só decide "tentamos oficial?" para dar a mensagem certa; nenhuma
  // flag isolada habilita escrita por si só.

  const operationalUrl = process.env.DATABASE_URL;
  const legacyImportUrl = process.env.LEGACY_IMPORT_DATABASE_URL;
  if (!operationalUrl) {
    console.error("❌ DATABASE_URL não definida (origem operacional).");
    process.exit(1);
  }
  if (!legacyImportUrl) {
    console.error("❌ LEGACY_IMPORT_DATABASE_URL não definida (destino do Legado, escrita).");
    process.exit(1);
  }

  try {
    assertOriginNotSameAsDestination(operationalUrl, legacyImportUrl);
    assertOperationalNotConfusedWithLegacy(operationalUrl, legacyImportUrl);
  } catch (err) {
    if (err instanceof SnapshotGuardError) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const sourceEnvironment = arg("source-env") ?? "local";
  try {
    assertEnvironmentCoherent({
      sourceEnvironment,
      operationalUrl,
      acknowledgeEnvironmentMismatch: flag("acknowledge-environment-mismatch"),
    });
  } catch (err) {
    if (err instanceof SnapshotGuardError) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  let kind: "preview" | "official" = "preview";
  let acknowledgeOfficial = false;

  if (wantsOfficial) {
    const problems: string[] = [];
    if (!flag("confirm-official")) problems.push("--confirm-official é obrigatório");
    if (arg("confirm-phrase") !== OFFICIAL_CONFIRMATION_PHRASE) {
      problems.push('--confirm-phrase precisa ser EXATAMENTE "' + OFFICIAL_CONFIRMATION_PHRASE + '"');
    }
    if (!arg("source-env") || arg("source-env") === "local") problems.push("--source-env explícito e diferente de local é obrigatório");
    if (!arg("source-name")) problems.push("--source-name explícito é obrigatório");
    if (!arg("snapshot-at")) problems.push("--snapshot-at explícito é obrigatório");
    if (isAll && !arg("snapshot-at")) problems.push("--domain=all no modo oficial exige --snapshot-at único e explícito (nunca 6 horários diferentes)");
    if (!arg("backup-manifest")) problems.push("--backup-manifest é obrigatório para o modo oficial");

    if (problems.length > 0) {
      console.error("❌ Modo oficial recusado — condições ausentes:\n - " + problems.join("\n - "));
      console.error("   Nenhuma escrita foi tentada. Continuando em dry-run seria enganoso — abortando.");
      process.exit(1);
    }

    kind = "official";
    acknowledgeOfficial = true;
  }

  const effectiveDryRun = kind === "preview" ? true : dryRun;
  // dryRun só é false quando kind=official E todas as condições acima passaram.

  let snapshotAt: Date;
  const snapshotAtArg = arg("snapshot-at");
  if (snapshotAtArg) {
    snapshotAt = new Date(snapshotAtArg);
    if (Number.isNaN(snapshotAt.getTime())) {
      console.error(`❌ --snapshot-at inválido: "${snapshotAtArg}". Use ISO 8601.`);
      process.exit(1);
    }
  } else {
    if (!effectiveDryRun) {
      console.error("❌ --snapshot-at explícito é obrigatório para o modo oficial.");
      process.exit(1);
    }
    // dry-run sem --snapshot-at: gera UM valor e reusa nos 6 domínios.
    snapshotAt = new Date();
  }

  if (!effectiveDryRun) {
    const operational = new OperationalPrisma({ datasources: { db: { url: operationalUrl } } });
    const legacy = new LegacyPrisma({ datasources: { db: { url: legacyImportUrl } } });
    try {
      const backupManifestPath = path.resolve(arg("backup-manifest")!);
      const result = await preflightCheck({ operational, legacy, backupManifestPath, backupsDir: arg("backup-dir") ? path.resolve(arg("backup-dir")!) : undefined });
      for (const line of result.info) console.log(`ℹ️  ${line}`);
      if (!result.ok) {
        console.error("❌ Pré-verificação falhou — modo oficial recusado:\n - " + result.problems.join("\n - "));
        process.exit(1);
      }
      console.log("✅ Pré-verificação OK.");
    } finally {
      await operational.$disconnect();
      await legacy.$disconnect();
    }
  }

  console.log(
    `\n▶ ${isAll ? "TODOS OS DOMÍNIOS" : domainArg} [${kind.toUpperCase()}]${effectiveDryRun ? " (DRY-RUN)" : ""} — ambiente "${sourceEnvironment}" — snapshot-at ${snapshotAt.toISOString()}`,
  );
  console.log(`  origem: ${redactUrl(operationalUrl)}`);
  console.log(`  destino: ${redactUrl(legacyImportUrl)}`);

  let summaries: DomainRunSummary[];
  let exitCode = 0;

  if (isAll) {
    const baseSourceName = arg("source-name") ?? `[TESTE LOCAL] Fotografia (${sourceEnvironment})`;
    const result = await runAllDomains({
      operationalUrl,
      legacyImportUrl,
      dryRun: effectiveDryRun,
      kind,
      baseSourceName,
      sourceEnvironment,
      snapshotAt,
      acknowledgeOfficial,
    });
    summaries = result.summaries;
    if (!result.ok) {
      exitCode = 1;
      console.error(`\n❌ Domínio "${result.failed}" falhou — execução interrompida.`);
      console.error(`   concluídos: ${result.completed.join(", ") || "(nenhum)"}`);
      console.error(`   falhou: ${result.failed}`);
      console.error(`   não iniciados: ${result.not_started.join(", ") || "(nenhum)"}`);
    }
  } else {
    const domain = domainArg as LegacyDomainKey;
    const sourceName = arg("source-name")
      ? deriveSourceName(arg("source-name")!, domain)
      : defaultPreviewSourceName(domain, sourceEnvironment);
    const summary = await runDomain({
      domain,
      operationalUrl,
      legacyImportUrl,
      dryRun: effectiveDryRun,
      kind,
      sourceName,
      sourceEnvironment,
      snapshotAt,
      acknowledgeOfficial,
    });
    summaries = [summary];
    if (summary.status === "failed") exitCode = 1;
  }

  if (flag("json")) {
    console.log(JSON.stringify({ snapshot_at: snapshotAt.toISOString(), summaries }, null, 2));
  } else {
    console.log("\n── Resumo ─────────────────────────────────────");
    for (const s of summaries) {
      const flagIcon = s.status === "failed" ? "❌" : s.concurrency_detected ? "⚠️ " : "✅";
      console.log(`${flagIcon} ${s.domain.padEnd(26)} status=${s.status.padEnd(20)} esperado=${s.expected} importado=${s.imported} sanitizados=${s.sanitized_records} divergências=${s.divergence_count} duração=${s.duration_ms}ms`);
      if (s.batch_id) console.log(`   lote=${s.batch_id}${s.sealed ? " (SELADO)" : ""}`);
      if (s.concurrency_detected) console.log("   ⚠️  concorrência detectada (outra execução tinha a trava — dry-run seguiu mesmo assim)");
      if (s.error) console.log(`   erro: ${s.error}`);
    }
    console.log("─────────────────────────────────────────────");
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("❌ Falha inesperada:", err instanceof Error ? redactUrl(err.message) : err);
  process.exit(1);
});
