// Orquestrador oficial dos 6 domínios do Snapshot Histórico do Legado.
//
// Reusa DIRETAMENTE runImport() e os 6 coletores reais (importer.ts,
// collect-*.ts) — nenhuma lógica de coleta/sanitização/reconciliação/
// checksum/selagem é duplicada aqui. Este módulo só acrescenta o que
// faltava para ter UM comando cobrindo os 6 domínios:
//   - seleção de domínio fechada (products|identity-organizations|
//     project-execution|financial|alerts-notifications-chat|campaigns|all);
//   - nomes de lote determinísticos e sem colisão entre domínios;
//   - proteção de ambiente (local vs QA vs produção, nunca inferida);
//   - trava de concorrência persistente (MySQL GET_LOCK, não arquivo local);
//   - validação de manifesto de backup antes de qualquer modo oficial;
//   - pré-verificação de conexão/migration/permissão antes do modo oficial;
//   - resumo estruturado (para saída legível e --json) sem vazar segredo.
//
// Nenhuma função aqui decide sozinha "gravar oficialmente" — runImport()
// continua sendo o único ponto que grava, com suas próprias guardas
// (kind=official exige sourceName/sourceEnvironment/snapshotAt/
// acknowledgeOfficial — ver importer.ts). Este módulo só adiciona camadas
// ANTES disso (defesa em profundidade), nunca substitui.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { PrismaClient as LegacyPrisma } from "./generated";
import {
  runImport,
  collectProductSnapshot,
  collectIdentityOrgSnapshot,
  IMPORTER_VERSION,
  IDENTITY_ORG_IMPORTER_VERSION,
  PROJECT_EXECUTION_IMPORTER_VERSION,
  FINANCIAL_IMPORTER_VERSION,
  ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
  CAMPAIGN_IMPORTER_VERSION,
  ORPHAN_CATALOG_TASKS_IMPORTER_VERSION,
  type ImportResult,
} from "./importer";
import { collectProjectExecutionSnapshot } from "./collect-project-execution";
import { collectFinancialSnapshot } from "./collect-financial";
import { collectAlertsNotificationsChatSnapshot } from "./collect-alerts-notifications-chat";
import { collectCampaignsSnapshot } from "./collect-campaigns";
import { collectOrphanCatalogTasksSnapshot } from "./collect-orphan-catalog-tasks";

// ── Domínios ────────────────────────────────────────────────────────────
//
// LEGACY_DOMAIN_ORDER continua com exatamente os 6 domínios canônicos —
// é o que `--domain=all` roda, na mesma ordem de sempre. O domínio
// complementar (`orphan-catalog-tasks`) é selecionável individualmente,
// mas DELIBERADAMENTE não entra em `all`: é um bloco de CORREÇÃO PONTUAL
// (83 CatalogTask sem vínculo de produto, achado numa auditoria pós-
// snapshot), não um 7º domínio operacional permanente. Incluí-lo em `all`
// mudaria silenciosamente o significado de "todos os domínios" (hoje
// documentado em toda a sessão como "os 6 domínios") e o tempo/õrdem
// esperados de toda execução futura, mesmo nas (esperadas) execuções em
// que ele não encontra mais nenhuma tarefa órfã. Rodar separado, sob
// nome explícito, deixa a decisão de quando reexecutá-lo com o operador —
// exatamente como pedido ("participar de all apenas quando houver itens
// descobertos" seria um comportamento IMPLÍCITO baseado em contagem, que
// este orquestrador evita de propósito: nenhuma decisão de escrita é
// tomada com base em "quantos registros existem agora", sempre em flags
// explícitas do operador).

export const LEGACY_DOMAIN_ORDER = [
  "products",
  "identity-organizations",
  "project-execution",
  "financial",
  "alerts-notifications-chat",
  "campaigns",
] as const;

/** Domínios complementares — nunca participam de `--domain=all`, só seleção explícita. */
export const SUPPLEMENTARY_DOMAIN_ORDER = ["orphan-catalog-tasks"] as const;

export const ALL_SELECTABLE_DOMAIN_KEYS = [...LEGACY_DOMAIN_ORDER, ...SUPPLEMENTARY_DOMAIN_ORDER] as const;

export type LegacyDomainKey = (typeof ALL_SELECTABLE_DOMAIN_KEYS)[number];

export function isLegacyDomainKey(value: string): value is LegacyDomainKey {
  return (ALL_SELECTABLE_DOMAIN_KEYS as readonly string[]).includes(value);
}

export function isSupplementaryDomainKey(value: string): boolean {
  return (SUPPLEMENTARY_DOMAIN_ORDER as readonly string[]).includes(value);
}

interface DomainDefinition {
  key: LegacyDomainKey;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectors: ReadonlyArray<(db: any) => Promise<any>>;
  importerVersion: string;
}

export const LEGACY_DOMAINS: Record<LegacyDomainKey, DomainDefinition> = {
  products: { key: "products", label: "produtos", collectors: [collectProductSnapshot], importerVersion: IMPORTER_VERSION },
  "identity-organizations": {
    key: "identity-organizations",
    label: "identidade e organizações",
    collectors: [collectIdentityOrgSnapshot],
    importerVersion: IDENTITY_ORG_IMPORTER_VERSION,
  },
  "project-execution": {
    key: "project-execution",
    label: "projetos e execução",
    collectors: [collectProjectExecutionSnapshot],
    importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION,
  },
  financial: { key: "financial", label: "financeiro", collectors: [collectFinancialSnapshot], importerVersion: FINANCIAL_IMPORTER_VERSION },
  "alerts-notifications-chat": {
    key: "alerts-notifications-chat",
    label: "alertas, notificações e chat",
    collectors: [collectAlertsNotificationsChatSnapshot],
    importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
  },
  "orphan-catalog-tasks": {
    key: "orphan-catalog-tasks",
    label: "tarefas de catálogo órfãs (complementar)",
    collectors: [collectOrphanCatalogTasksSnapshot],
    importerVersion: ORPHAN_CATALOG_TASKS_IMPORTER_VERSION,
  },
  campaigns: {
    key: "campaigns",
    label: "campanhas, cupons e destinatários",
    collectors: [collectCampaignsSnapshot],
    importerVersion: CAMPAIGN_IMPORTER_VERSION,
  },
};

/** Nome de lote determinístico e sem colisão: sempre amarra o domínio ao nome-base informado. */
export function deriveSourceName(baseSourceName: string, domain: LegacyDomainKey): string {
  return `${baseSourceName} — ${LEGACY_DOMAINS[domain].label}`;
}

/** Nome de prévia padrão quando nenhum --source-name é informado (dry-run/preview apenas). */
export function defaultPreviewSourceName(domain: LegacyDomainKey, sourceEnvironment: string): string {
  return `[TESTE LOCAL] Fotografia de ${LEGACY_DOMAINS[domain].label} (${sourceEnvironment})`;
}

// ── Redação de credenciais (nunca imprimir senha/URL completa) ──────────

export function redactUrl(raw: string): string {
  try {
    return raw.replace(/:\/\/([^:@/]+):([^@/]*)@/, "://$1:***@");
  } catch {
    return "***";
  }
}

export interface ConnectionIdentity {
  host: string;
  port: number;
  database: string;
}

export function identifyConnection(url: string): ConnectionIdentity {
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 3306), database: u.pathname.replace(/^\//, "") };
}

// ── Guardas de ambiente/identidade ───────────────────────────────────────

export class SnapshotGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotGuardError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "mysql"]); // "mysql" = nome do serviço no docker-compose local
const PRODUCTION_MARKER = /produc(a|ã)o|production/i;

/** Recusa se origem e destino apontarem exatamente para o mesmo host+porta+banco. */
export function assertOriginNotSameAsDestination(operationalUrl: string, legacyUrl: string): void {
  const a = identifyConnection(operationalUrl);
  const b = identifyConnection(legacyUrl);
  if (a.host === b.host && a.port === b.port && a.database === b.database) {
    throw new SnapshotGuardError(
      `Origem e destino não podem ser o mesmo banco (ambos apontam para ${a.host}:${a.port}/${a.database}).`,
    );
  }
}

/** Recusa se o operacional (DATABASE_URL) e o Legado (LEGACY_IMPORT_DATABASE_URL) tiverem o MESMO nome de banco (mesmo em hosts diferentes) — nunca confundir os dois. */
export function assertOperationalNotConfusedWithLegacy(operationalUrl: string, legacyUrl: string): void {
  const a = identifyConnection(operationalUrl);
  const b = identifyConnection(legacyUrl);
  if (a.database === b.database) {
    throw new SnapshotGuardError(`O banco operacional e o Legado não podem ter o mesmo nome ("${a.database}") — confirme as duas URLs.`);
  }
}

/**
 * Recusa `--source-env` com aparência de produção quando a ORIGEM claramente
 * aponta para um host local — a menos que o operador reconheça
 * explicitamente (ex.: um dump de produção restaurado localmente para
 * auditoria). Nunca adivinha silenciosamente.
 */
export function assertEnvironmentCoherent(opts: {
  sourceEnvironment: string;
  operationalUrl: string;
  acknowledgeEnvironmentMismatch?: boolean;
}): void {
  const info = identifyConnection(opts.operationalUrl);
  const looksLocal = LOCAL_HOSTS.has(info.host);
  const claimsProduction = PRODUCTION_MARKER.test(opts.sourceEnvironment);
  if (looksLocal && claimsProduction && !opts.acknowledgeEnvironmentMismatch) {
    throw new SnapshotGuardError(
      `--source-env="${opts.sourceEnvironment}" foi informado, mas a origem aponta para um host local ("${info.host}") — ` +
        "se isto é intencional (ex.: auditoria de um dump de produção restaurado localmente), repita com --acknowledge-environment-mismatch. " +
        "Nunca inferido silenciosamente.",
    );
  }
}

// ── Trava de concorrência persistente (MySQL GET_LOCK, não arquivo local) ─
//
// GET_LOCK é uma trava nomeada do PRÓPRIO SERVIDOR MySQL, escopada à
// conexão que a pede — sobrevive a reinícios do processo Node (ao
// contrário de um lockfile local) e é liberada automaticamente se a
// conexão cair. A chave da trava é (domínio, nome do lote) — só uma
// execução por vez pode gravar/validar um lote lógico específico.

export function lockKeyFor(domain: LegacyDomainKey, sourceName: string): string {
  const hash = crypto.createHash("sha1").update(sourceName).digest("hex").slice(0, 20);
  return `legacy_snapshot:${domain}:${hash}`;
}

export async function tryAcquireLegacyLock(
  legacy: InstanceType<typeof LegacyPrisma>,
  lockKey: string,
  timeoutSeconds: number,
): Promise<boolean> {
  const rows = await legacy.$queryRawUnsafe<Array<{ locked: number | bigint | null }>>(
    "SELECT GET_LOCK(?, ?) AS locked",
    lockKey,
    timeoutSeconds,
  );
  return Number(rows[0]?.locked) === 1;
}

export async function releaseLegacyLock(legacy: InstanceType<typeof LegacyPrisma>, lockKey: string): Promise<void> {
  await legacy.$queryRawUnsafe("SELECT RELEASE_LOCK(?)", lockKey);
}

export class ConcurrentSnapshotError extends SnapshotGuardError {
  constructor(domain: LegacyDomainKey) {
    super(`Já existe uma execução OFICIAL em andamento para o domínio "${domain}" com este nome de lote — recusado (trava GET_LOCK ocupada).`);
    this.name = "ConcurrentSnapshotError";
  }
}

// ── Manifesto de backup (validação sem tocar em banco) ───────────────────

export interface BackupManifestEntry {
  fileName: string;
  database: string;
  sizeBytes: number;
  sha256: string;
}

export function parseBackupManifest(markdown: string): BackupManifestEntry[] {
  const entries: BackupManifestEntry[] = [];
  const blocks = markdown.split(/^## /m).slice(1);
  for (const block of blocks) {
    const fileName = /Nome do arquivo:\s*`([^`]+)`/.exec(block)?.[1];
    const database = /Banco de origem:\s*`([^`]+)`/.exec(block)?.[1];
    const sizeMatch = /Tamanho:\s*([\d.,]+)\s*bytes/.exec(block);
    const sha = /SHA-256:\s*`([0-9a-f]{64})`/.exec(block)?.[1];
    if (fileName && sha) {
      entries.push({
        fileName,
        database: database ?? "",
        sizeBytes: sizeMatch ? Number(sizeMatch[1].replace(/[.,]/g, "")) : 0,
        sha256: sha,
      });
    }
  }
  return entries;
}

export interface BackupValidationResult {
  ok: boolean;
  problems: string[];
  entries: BackupManifestEntry[];
}

/** Valida o manifesto e os arquivos locais — nunca inclui dump/hash de dado real no retorno além do já público no próprio manifesto. */
export function validateBackupManifest(manifestPath: string, backupsDir?: string): BackupValidationResult {
  const problems: string[] = [];
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, problems: [`manifesto não encontrado: ${manifestPath}`], entries: [] };
  }
  const dir = backupsDir ?? path.dirname(manifestPath);
  const markdown = fs.readFileSync(manifestPath, "utf8");
  const entries = parseBackupManifest(markdown);
  if (entries.length === 0) problems.push("nenhuma entrada de backup reconhecida no manifesto");
  for (const entry of entries) {
    const filePath = path.join(dir, entry.fileName);
    if (!fs.existsSync(filePath)) {
      problems.push(`arquivo de backup ausente: ${entry.fileName}`);
      continue;
    }
    const stat = fs.statSync(filePath);
    if (!stat.size) {
      problems.push(`arquivo de backup vazio: ${entry.fileName}`);
      continue;
    }
    if (entry.sizeBytes && stat.size !== entry.sizeBytes) {
      problems.push(`tamanho diverge em ${entry.fileName}: manifesto=${entry.sizeBytes} real=${stat.size}`);
    }
    const actualHash = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    if (actualHash !== entry.sha256) {
      problems.push(`SHA-256 diverge em ${entry.fileName} — backup pode estar corrompido ou adulterado`);
    }
  }
  return { ok: problems.length === 0, problems, entries };
}

// ── Pré-verificação antes do modo oficial ────────────────────────────────

export interface PreflightResult {
  ok: boolean;
  problems: string[];
  info: string[];
}

class PreflightRollbackSignal extends Error {}

async function checkLegacyWritePermission(legacy: InstanceType<typeof LegacyPrisma>): Promise<boolean> {
  try {
    await legacy.$transaction(async (tx) => {
      await tx.legacyImportBatch.create({
        data: {
          source_name: "__preflight_permission_check__",
          source_environment: "preflight",
          kind: "preview",
          snapshot_at: new Date(),
          importer_version: "preflight",
          expected_count: 0,
          imported_count: 0,
          status: "pending",
        },
      });
      throw new PreflightRollbackSignal();
    });
    return false;
  } catch (err) {
    return err instanceof PreflightRollbackSignal;
  }
}

/**
 * Verificações exigidas antes de QUALQUER execução oficial (nunca chamado
 * pelo caminho dry-run, que não precisa de escrita nem de manifesto).
 */
export async function preflightCheck(opts: {
  operational: InstanceType<typeof OperationalPrisma>;
  legacy: InstanceType<typeof LegacyPrisma>;
  backupManifestPath: string;
  backupsDir?: string;
}): Promise<PreflightResult> {
  const problems: string[] = [];
  const info: string[] = [];

  try {
    await opts.operational.$queryRawUnsafe("SELECT 1");
    info.push("conexão com a origem operacional: OK");
  } catch {
    problems.push("não foi possível conectar à origem operacional");
  }

  try {
    await opts.legacy.$queryRawUnsafe("SELECT 1");
    info.push("conexão com o Legado: OK");
  } catch {
    problems.push("não foi possível conectar ao Legado");
    return { ok: false, problems, info };
  }

  const expectedTables = ["legacy_import_batches", "legacy_record_snapshots", "legacy_relation_snapshots"];
  const tableRows = await opts.legacy.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN (?, ?, ?)",
    ...expectedTables,
  );
  const foundTables = new Set(tableRows.map((r) => r.table_name));
  for (const t of expectedTables) if (!foundTables.has(t)) problems.push(`tabela esperada ausente no Legado: ${t}`);

  const columnRows = await opts.legacy.$queryRawUnsafe<Array<{ column_name: string }>>(
    "SELECT COLUMN_NAME AS column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'legacy_import_batches' AND COLUMN_NAME IN ('kind','sealed_at')",
  );
  if (columnRows.length < 2) {
    problems.push("migration pendente: colunas kind/sealed_at ausentes em legacy_import_batches (aplique 20260910120000_legacy_batch_kind_and_seal antes do modo oficial)");
  } else {
    info.push("migrations do Legado: em dia (kind/sealed_at presentes)");
  }

  if (problems.length === 0) {
    const canWrite = await checkLegacyWritePermission(opts.legacy);
    if (!canWrite) problems.push("credencial de escrita do Legado não tem permissão de INSERT (verificado com transação revertida)");
    else info.push("permissão de escrita no Legado: confirmada (transação de teste revertida)");
  }

  try {
    const sizeRows = await opts.legacy.$queryRawUnsafe<Array<{ size_mb: number | null }>>(
      "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    info.push(`tamanho atual do Legado: ~${sizeRows[0]?.size_mb ?? "desconhecido"} MiB (informativo — este processo não verifica espaço livre em disco do host/volume, fora do alcance de uma consulta SQL)`);
  } catch {
    info.push("não foi possível estimar o tamanho atual do Legado (não bloqueante)");
  }

  const backupResult = validateBackupManifest(opts.backupManifestPath, opts.backupsDir);
  if (!backupResult.ok) {
    problems.push(`manifesto de backup inválido: ${backupResult.problems.join("; ")}`);
  } else {
    info.push(`manifesto de backup validado: ${backupResult.entries.length} arquivo(s), hash e tamanho coerentes`);
  }

  return { ok: problems.length === 0, problems, info };
}

// ── Resumo estruturado (sem conteúdo sensível) ───────────────────────────

export type DomainRunStatus = "completed" | "validated_official" | "dry_run" | "failed" | "not_started" | "skipped_concurrent";

export interface DomainRunSummary {
  domain: LegacyDomainKey;
  label: string;
  source_name: string;
  source_environment: string;
  snapshot_at: string;
  kind: "preview" | "official";
  dry_run: boolean;
  status: DomainRunStatus;
  expected: number;
  imported: number;
  relations_expected?: number;
  relations_imported?: number;
  sanitized_records: number;
  divergence_count: number;
  duration_ms: number;
  batch_id?: string | null;
  sealed?: boolean;
  concurrency_detected?: boolean;
  error?: string;
}

function sanitizeErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  // Nunca deixar uma URL com credencial escapar num erro inesperado.
  return redactUrl(message).slice(0, 500);
}

export interface RunDomainOptions {
  domain: LegacyDomainKey;
  operationalUrl: string;
  legacyImportUrl: string;
  dryRun: boolean;
  kind: "preview" | "official";
  sourceName: string;
  sourceEnvironment: string;
  snapshotAt: Date;
  acknowledgeOfficial?: boolean;
  batchId?: string;
  allowRefresh?: boolean;
}

/**
 * Roda UM domínio através do runImport() real — sem duplicar nenhuma
 * lógica de coleta/sanitização/reconciliação/checksum/selagem. Só adiciona:
 * trava de concorrência (oficial: bloqueante; dry-run: detecta e informa,
 * nunca bloqueia) e a tradução do resultado para DomainRunSummary.
 */
export async function runDomain(opts: RunDomainOptions): Promise<DomainRunSummary> {
  const def = LEGACY_DOMAINS[opts.domain];
  const startedAt = Date.now();
  const lockKey = lockKeyFor(opts.domain, opts.sourceName);

  const legacy = new LegacyPrisma({ datasources: { db: { url: opts.legacyImportUrl } } });
  let concurrencyDetected = false;
  let lockAcquired = false;
  try {
    lockAcquired = await tryAcquireLegacyLock(legacy, lockKey, opts.dryRun ? 0 : 0);
    if (!lockAcquired) {
      concurrencyDetected = true;
      if (!opts.dryRun) {
        throw new ConcurrentSnapshotError(opts.domain);
      }
      // dry-run: informa e segue (nunca bloqueia teste normal).
    }

    // process.env é a forma como runImport()/OperationalPrisma() resolvem
    // suas próprias conexões (ver importer.ts) — setado aqui, restaurado no
    // finally, para nunca vazar para chamadas concorrentes fora deste
    // processo (cada execução do CLI é um processo Node próprio).
    const prevDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = opts.operationalUrl;
    let result: ImportResult;
    try {
      result = await runImport({
        dryRun: opts.dryRun,
        kind: opts.kind,
        sourceName: opts.sourceName,
        sourceEnvironment: opts.sourceEnvironment,
        snapshotAt: opts.snapshotAt,
        acknowledgeOfficial: opts.acknowledgeOfficial,
        legacyImportUrl: opts.legacyImportUrl,
        collectors: def.collectors as never,
        importerVersion: def.importerVersion,
        batchId: opts.batchId,
        allowRefresh: opts.allowRefresh,
      });
    } finally {
      process.env.DATABASE_URL = prevDbUrl;
    }

    return {
      domain: opts.domain,
      label: def.label,
      source_name: opts.sourceName,
      source_environment: opts.sourceEnvironment,
      snapshot_at: opts.snapshotAt.toISOString(),
      kind: opts.kind,
      dry_run: opts.dryRun,
      status: result.status === "dry_run" ? "dry_run" : result.status === "validated_official" ? "validated_official" : "completed",
      expected: result.totals.expected,
      imported: result.totals.imported,
      sanitized_records: result.totals.sanitized_records,
      divergence_count: result.divergences.length,
      duration_ms: Date.now() - startedAt,
      batch_id: result.batch_id,
      sealed: result.sealed,
      concurrency_detected: concurrencyDetected || undefined,
    };
  } catch (err) {
    return {
      domain: opts.domain,
      label: def.label,
      source_name: opts.sourceName,
      source_environment: opts.sourceEnvironment,
      snapshot_at: opts.snapshotAt.toISOString(),
      kind: opts.kind,
      dry_run: opts.dryRun,
      status: "failed",
      expected: 0,
      imported: 0,
      sanitized_records: 0,
      divergence_count: 0,
      duration_ms: Date.now() - startedAt,
      concurrency_detected: concurrencyDetected || undefined,
      error: sanitizeErrorMessage(err),
    };
  } finally {
    if (lockAcquired) {
      await releaseLegacyLock(legacy, lockKey).catch(() => {});
    }
    await legacy.$disconnect();
  }
}

export interface RunAllOptions {
  operationalUrl: string;
  legacyImportUrl: string;
  dryRun: boolean;
  kind: "preview" | "official";
  baseSourceName: string;
  sourceEnvironment: string;
  snapshotAt: Date;
  acknowledgeOfficial?: boolean;
}

export interface RunAllResult {
  snapshot_at: string;
  summaries: DomainRunSummary[];
  completed: LegacyDomainKey[];
  failed: LegacyDomainKey | null;
  not_started: LegacyDomainKey[];
  ok: boolean;
}

/** `--domain=all` — sequencial, na ordem fixa; falha para tudo o que vem depois. */
export async function runAllDomains(opts: RunAllOptions): Promise<RunAllResult> {
  const summaries: DomainRunSummary[] = [];
  const completed: LegacyDomainKey[] = [];
  let failed: LegacyDomainKey | null = null;

  for (const domain of LEGACY_DOMAIN_ORDER) {
    if (failed) break;
    const sourceName = deriveSourceName(opts.baseSourceName, domain);
    const summary = await runDomain({
      domain,
      operationalUrl: opts.operationalUrl,
      legacyImportUrl: opts.legacyImportUrl,
      dryRun: opts.dryRun,
      kind: opts.kind,
      sourceName,
      sourceEnvironment: opts.sourceEnvironment,
      snapshotAt: opts.snapshotAt,
      acknowledgeOfficial: opts.acknowledgeOfficial,
    });
    summaries.push(summary);
    if (summary.status === "failed") {
      failed = domain;
    } else {
      completed.push(domain);
    }
  }

  const notStarted = LEGACY_DOMAIN_ORDER.filter((d) => !completed.includes(d) && d !== failed);

  return {
    snapshot_at: opts.snapshotAt.toISOString(),
    summaries,
    completed,
    failed,
    not_started: notStarted,
    ok: failed === null,
  };
}
