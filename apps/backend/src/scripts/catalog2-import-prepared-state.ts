/**
 * Importa o ESTADO PREPARADO dos produtos catalog2 a partir de um PACOTE em
 * disco (Item 16.1, reunião 2026-09-14, "Fechar os bloqueios antes da
 * publicação") — nunca precisa de conexão simultânea com o banco de
 * origem. Par de `catalog2-export-prepared-state.ts` (gera o pacote a
 * partir de um banco local, sem nenhum destino aberto ao mesmo tempo).
 *
 * Reaproveita INTEGRALMENTE a lógica de identidade/conflito/idempotência já
 * testada em `catalog2-transfer-prepared-state.ts` (Itens 12.1/13.1) — a
 * única diferença é de ONDE os dados dos produtos vêm (arquivo, não um
 * segundo Prisma Client conectado à origem).
 *
 *   npm run catalog2:import-prepared -- --package=./scratch/catalog2-package --dry-run   (padrão)
 *   npm run catalog2:import-prepared -- --package=./scratch/catalog2-package --target-url=mysql://... --apply   (target-env=development, implícito)
 *   npm run catalog2:import-prepared -- --package=./scratch/catalog2-package --target-url=mysql://... --apply --target-env=production \
 *     --expected-database-name=<nome exato do banco na --target-url> \
 *     --confirm="TRANSFERIR PARA PRODUCAO" \
 *     --backup-sha256=<sha256 de um backup real já validado> \
 *     --expected-manifest-sha256=<manifest_sha256 impresso por um --dry-run revisado>
 *
 * Antes de qualquer leitura de produto, o pacote é VALIDADO: `format_version`
 * reconhecida, `package.sha256` bate com o `package.json` real (nunca
 * confia em pacote potencialmente corrompido/adulterado). Falha aqui
 * interrompe tudo, sem tocar em nenhum banco.
 *
 * Item 13.1 (reunião 2026-09-14, "Concluir a preparação local") — localhost
 * NUNCA prova sozinho que um destino é de desenvolvimento (rodar de dentro
 * do próprio VPS de produção, via 127.0.0.1, passaria por
 * `assertLocalDatabase` sem aviso nenhum). Por isso `--target-env` é
 * SEMPRE explícito: "development" (padrão, sem cerimônia extra, mesmo
 * comportamento já testado no Item 12.1) ou "production" (exige TODOS os 4
 * parâmetros acima — falta de qualquer um recusa antes de qualquer
 * escrita). Em produção, qualquer conflito ou divergência de configuração
 * global no manifesto recusa a transferência inteira, mesmo com
 * confirmação — nunca sobrescreve nada silenciosamente. `--dry-run`
 * continua sendo o padrão sempre que `--apply` não é passado.
 *
 * Escopo (só isto, nada além):
 *   - Catalog2Product (+ four_f, delivery_recurrence, status sempre
 *     preservado como "em_preparacao" no destino se o produto for novo —
 *     nunca nasce contratável por esta transferência)
 *   - a versão MAIS RECENTE de cada produto (conteúdo atual — não o
 *     histórico completo de Catalog2VersionEvent, decisão explícita)
 *   - Tarefas + etapas
 *   - Questionários + perguntas (biblioteca compartilhada — identidade por
 *     `name`, decisão explícita já que não há chave natural melhor)
 *   - Variações + opções + efeitos
 *   - Adicionais + efeitos
 *   - Períodos configurados (Catalog2ProductPeriod)
 *   - Preview provisório (Catalog2ProvisionalPreview) — preservando
 *     is_provisional/needs_review; `image_path` é só a referência de
 *     string (o arquivo em si é estático, versionado no frontend, chega
 *     pelo deploy normal de código — nunca copiado por este script)
 *   - Catalog2ProductImportOrigin (metadado de procedência/pendências)
 *
 * NUNCA toca: usuários, projetos, pagamentos, sessões, Catalog2Quote/
 * CartItem/ChangeOrder, Catalog2NotificationJob*, Catalog2PricingSettings
 * (global), Catalog2Specialty (só LIDA por `key` para resolver referência —
 * se não existir no destino ou tiver taxa diferente, entra em
 * "divergências de configuração global", nunca escrita por aqui).
 *
 * Segurança: reusa assertLocalDatabase tanto na origem quanto no destino —
 * nunca aponta para um host remoto, mesmo em --apply. Idempotente: chave
 * natural em toda entidade, upsert por igualdade de conteúdo (unchanged) ou
 * atualização (updated) — nunca duplica ao rodar de novo.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { PACKAGE_FORMAT_VERSION } from "./catalog2-package-format";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

// Datas vêm do JSON como string ISO — Prisma aceita string ISO em campos
// DateTime normalmente, mas alguns pontos do código abaixo comparam datas
// como objeto Date (ex.: `p.provisional_preview?.image_path`, que é só
// string, sem problema — mas `versions[0].published_at` etc. se algum dia
// for comparado por instância). Revive todo string em formato ISO-8601
// completo para Date, de forma determinística e sem heurística frágil.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

interface ExportedPackage {
  format_version: string;
  exported_at: string;
  product_count: number;
  products: unknown[];
  images: Array<{ path: string; sha256: string; size: number; found: boolean }>;
}

function loadPackage(packageDir: string): ExportedPackage {
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageShaPath = path.join(packageDir, "package.sha256");
  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(packageShaPath)) {
    console.error(`❌ Pacote incompleto em ${packageDir} — esperado package.json e package.sha256, nenhum dos dois foi inventado/assumido.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const expectedSha = fs.readFileSync(packageShaPath, "utf8").trim();
  const actualSha = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  if (actualSha !== expectedSha) {
    console.error(`❌ package.sha256 (${expectedSha}) não bate com o package.json real (${actualSha}) — pacote possivelmente corrompido ou adulterado. Nada foi lido além disto.`);
    process.exit(1);
  }
  const pkg = JSON.parse(raw, reviveDates) as ExportedPackage;
  if (pkg.format_version !== PACKAGE_FORMAT_VERSION) {
    console.error(`❌ format_version do pacote ("${pkg.format_version}") não é a esperada ("${PACKAGE_FORMAT_VERSION}") — recusando, pode ser de uma versão incompatível do exportador.`);
    process.exit(1);
  }
  console.log(`  pacote válido: ${pkg.product_count} produtos, exportado em ${pkg.exported_at}, sha256 conferido.`);
  return pkg;
}

// Item 13.1 (reunião 2026-09-14, "Concluir a preparação local") — localhost
// NUNCA prova sozinho que um destino é de desenvolvimento: rodar este
// script de DENTRO do próprio VPS de produção, apontando pro MySQL real via
// 127.0.0.1, passaria por `assertLocalDatabase` sem nenhum aviso adicional
// (é exatamente isso que o pedido identificou como risco real). Por isso um
// destino de produção exige uma declaração EXPLÍCITA e independente da
// string de conexão — nunca inferida do endereço.
const CONFIRM_PHRASE = "TRANSFERIR PARA PRODUCAO";
type TargetEnv = "production" | "development";

function canonicalManifestJSON(lines: ProductManifestLine[]): string {
  // Ordem estável (já vem ordenado por slug na query) — determinístico pra
  // permitir checksum-lock (mesmo padrão já usado em qa-migration-reconcile.yml:
  // diff computado -> sha256 -> só aplica se o sha256 revisado bater de novo).
  return JSON.stringify(lines);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

type Outcome = "created" | "updated" | "unchanged" | "conflict";

interface ProductManifestLine {
  slug: string;
  product: Outcome;
  version: Outcome;
  tasks: { created: number; updated: number; unchanged: number };
  steps: { created: number; updated: number; unchanged: number };
  questionnaires: { created: number; updated: number; unchanged: number; conflict: number };
  variations: { created: number; updated: number; unchanged: number };
  options: { created: number; updated: number; unchanged: number };
  addons: { created: number; updated: number; unchanged: number };
  periods: { created: number; updated: number; unchanged: number };
  provisional_preview: Outcome | "absent";
  import_origin: Outcome;
  global_config_divergences: string[];
  warnings: string[];
}

function jstr(v: unknown): string {
  return JSON.stringify(v ?? null);
}

async function main() {
  const apply = arg("apply") !== undefined;
  const mode: "dry_run" | "apply" = apply ? "apply" : "dry_run";
  const packageDir = arg("package");
  if (!packageDir) {
    console.error("❌ --package é obrigatório (pasta gerada por catalog2:export-prepared, ex.: ./scratch/catalog2-package)");
    process.exit(1);
  }
  console.log(`▶ Validando pacote em ${packageDir}`);
  const pkg = loadPackage(packageDir);

  const targetUrl = arg("target-url");
  if (!targetUrl) {
    console.error("❌ --target-url é obrigatório (ex.: mysql://allka:...@localhost:3306/allka_alvo_descartavel)");
    process.exit(1);
  }
  const targetDatabaseName = new URL(targetUrl).pathname.replace(/^\//, "");
  assertLocalDatabase(targetUrl); // destino: nunca produção, nunca QA online — só localhost/127.0.0.1/::1 (ver gate de --target-env abaixo, localhost sozinho NÃO basta pra apply=production)

  // targetEnv é SEMPRE explícito — nunca inferido do endereço de conexão.
  // "development" preserva o comportamento já testado no Item 12.1 (sem
  // ceremônia extra); "production" exige toda a cadeia de confirmação abaixo.
  const targetEnvArg = arg("target-env");
  if (targetEnvArg !== undefined && targetEnvArg !== "production" && targetEnvArg !== "development") {
    console.error(`❌ --target-env precisa ser exatamente "production" ou "development" (recebido: "${targetEnvArg}")`);
    process.exit(1);
  }
  const targetEnv: TargetEnv = (targetEnvArg as TargetEnv | undefined) ?? "development";

  const dst = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  console.log(`▶ Importação de estado preparado (pacote) — modo ${mode.toUpperCase()} · target-env=${targetEnv}`);
  console.log(`  Pacote: ${packageDir} (${pkg.product_count} produtos) · Destino: ${targetDatabaseName}`);

  // Imagens: se --images-out foi dado, copia + confere sha256; senão só
  // confere a integridade interna do pacote (cada imagem batendo com seu
  // próprio checksum registrado na exportação), sem tocar em disco fora
  // do pacote.
  const imagesOut = arg("images-out");
  for (const img of pkg.images) {
    if (!img.found) { console.log(`  ⚠ imagem ausente na exportação (já registrado lá): ${img.path}`); continue; }
    const srcImgPath = path.join(packageDir, "images", img.path.replace(/^\/+/, ""));
    if (!fs.existsSync(srcImgPath)) { console.error(`❌ imagem listada no manifesto mas ausente no pacote: ${img.path}`); process.exit(1); }
    const actual = crypto.createHash("sha256").update(fs.readFileSync(srcImgPath)).digest("hex");
    if (actual !== img.sha256) { console.error(`❌ imagem ${img.path} com sha256 divergente do manifesto — pacote corrompido.`); process.exit(1); }
    if (imagesOut) {
      const destImgPath = path.join(imagesOut, img.path.replace(/^\/+/, ""));
      fs.mkdirSync(path.dirname(destImgPath), { recursive: true });
      fs.copyFileSync(srcImgPath, destImgPath);
      console.log(`  imagem copiada: ${img.path} -> ${destImgPath}`);
    }
  }

  const products = pkg.products as any[];

  // ── Pré-visualização SEMPRE calculada primeiro (só leitura) — usada tanto
  // para imprimir o manifesto em dry-run quanto como travamento de checksum
  // antes de qualquer escrita em modo produção (mesmo padrão de
  // qa-migration-reconcile.yml: diff calculado -> sha256 -> só aplica se o
  // sha256 revisado bater de novo no momento do apply).
  async function buildReadOnlyManifest(): Promise<ProductManifestLine[]> {
    const lines: ProductManifestLine[] = [];
    const seen = new Set<string>();
    for (const p of products) {
      const line: ProductManifestLine = {
        slug: p.slug,
        product: "unchanged",
        version: "unchanged",
        tasks: { created: 0, updated: 0, unchanged: 0 },
        steps: { created: 0, updated: 0, unchanged: 0 },
        questionnaires: { created: 0, updated: 0, unchanged: 0, conflict: 0 },
        variations: { created: 0, updated: 0, unchanged: 0 },
        options: { created: 0, updated: 0, unchanged: 0 },
        addons: { created: 0, updated: 0, unchanged: 0 },
        periods: { created: 0, updated: 0, unchanged: 0 },
        provisional_preview: p.provisional_preview ? "unchanged" : "absent",
        import_origin: "unchanged",
        global_config_divergences: [],
        warnings: [],
      };
      const v = p.versions[0];
      if (!v) { line.warnings.push("produto sem nenhuma versão — pulado"); lines.push(line); continue; }
      for (const t of v.tasks) {
        if (!t.specialty) continue;
        const key = t.specialty.key;
        const targetSpecialty = await dst.catalog2Specialty.findUnique({ where: { key } });
        if (!targetSpecialty) {
          const msg = `especialidade "${key}" não existe no destino — precisa rodar catalog2:seed-classifications lá antes`;
          if (!seen.has(msg)) { line.global_config_divergences.push(msg); seen.add(msg); }
        } else if (targetSpecialty.max_hourly_rate !== t.specialty.max_hourly_rate) {
          const msg = `especialidade "${key}": max_hourly_rate difere (origem=${t.specialty.max_hourly_rate} · destino=${targetSpecialty.max_hourly_rate}) — NÃO sobrescrito, decisão do responsável`;
          if (!seen.has(msg)) { line.global_config_divergences.push(msg); seen.add(msg); }
        }
      }
      const existingProduct = await dst.catalog2Product.findUnique({ where: { slug: p.slug }, include: { versions: { orderBy: { version_number: "desc" }, take: 1 }, import_origin: true } });
      line.product = existingProduct ? (existingProduct.delivery_recurrence === p.delivery_recurrence ? "unchanged" : "conflict") : "created";
      const existingVersion = existingProduct?.versions[0];
      line.version = !existingProduct ? "created" : !existingVersion ? "created" : existingVersion.title === v.title && existingVersion.full_description === v.full_description ? "unchanged" : "updated";
      line.tasks.created = existingProduct ? 0 : v.tasks.length;
      line.tasks.unchanged = existingProduct ? v.tasks.length : 0;
      line.steps.created = existingProduct ? 0 : v.tasks.reduce((a, t) => a + t.steps.length, 0);
      line.variations.created = existingProduct ? 0 : v.variations.length;
      line.options.created = existingProduct ? 0 : v.variations.reduce((a, va) => a + va.options.length, 0);
      line.addons.created = existingProduct ? 0 : v.addons.length;
      line.periods.created = existingProduct ? 0 : p.periods.length;
      const qCount = new Set(v.tasks.filter((t) => t.questionnaire).map((t) => t.questionnaire!.id)).size;
      line.questionnaires.created = existingProduct ? 0 : qCount;
      line.import_origin = existingProduct?.import_origin ? "unchanged" : "created";
      lines.push(line);
    }
    return lines;
  }

  const readOnlyManifest = await buildReadOnlyManifest();
  const readOnlyManifestHash = sha256(canonicalManifestJSON(readOnlyManifest));

  if (mode === "dry_run") {
    console.log(`\n════════ MANIFESTO — PRÉVIA (${products.length} produtos avaliados) ════════`);
    for (const l of readOnlyManifest) {
      console.log(`  ${l.slug} — produto:${l.product} versão:${l.version} tarefas:${jstr(l.tasks)} questionários:${jstr(l.questionnaires)}`);
      if (l.global_config_divergences.length) for (const d of l.global_config_divergences) console.log(`     ⚠ ${d}`);
      if (l.warnings.length) for (const w of l.warnings) console.log(`     ⚠ ${w}`);
    }
    console.log(`\n  manifest_sha256=${readOnlyManifestHash}`);
    console.log("  (guarde este hash — é exigido em --expected-manifest-sha256 para --apply --target-env=production)");
    if (arg("json") !== undefined) console.log("\n" + JSON.stringify({ mode, target_env: targetEnv, count: products.length, manifest: readOnlyManifest, manifest_sha256: readOnlyManifestHash }, null, 2));
    console.log("\n────────────────────────────────────────────");
    console.log("Nada foi gravado no destino. Rode com --apply para transferir.");
    await dst.$disconnect();
    return;
  }

  // ── Portão de produção — nunca inferido do endereço de conexão ─────────
  if (targetEnv === "production") {
    const expectedDbName = arg("expected-database-name");
    const confirmPhrase = arg("confirm");
    const expectedManifestSha256 = arg("expected-manifest-sha256");
    const backupSha256 = arg("backup-sha256");
    const problems: string[] = [];
    if (!expectedDbName) problems.push("--expected-database-name é obrigatório para --target-env=production");
    else if (expectedDbName !== targetDatabaseName) problems.push(`--expected-database-name ("${expectedDbName}") não bate com o nome do banco na --target-url ("${targetDatabaseName}") — destino divergente do declarado, recusando`);
    if (!confirmPhrase) problems.push(`--confirm é obrigatório para --target-env=production (frase exata: "${CONFIRM_PHRASE}")`);
    else if (confirmPhrase !== CONFIRM_PHRASE) problems.push(`--confirm não bate com a frase exata exigida ("${CONFIRM_PHRASE}")`);
    if (!backupSha256) problems.push("--backup-sha256 é obrigatório para --target-env=production (sha256 de um backup real já validado — auditoria, não verificado automaticamente por este script)");
    if (!expectedManifestSha256) problems.push("--expected-manifest-sha256 é obrigatório para --target-env=production (rode --dry-run primeiro, revise o manifesto, copie o manifest_sha256 impresso)");
    else if (expectedManifestSha256 !== readOnlyManifestHash) problems.push(`--expected-manifest-sha256 ("${expectedManifestSha256}") não bate com o manifesto recalculado agora ("${readOnlyManifestHash}") — o destino pode ter mudado desde a revisão, ou o hash informado está errado. Rode --dry-run de novo e revise o novo manifesto.`);
    const anyConflict = readOnlyManifest.some((l) => l.product === "conflict" || l.questionnaires.conflict > 0);
    const anyGlobalDivergence = readOnlyManifest.some((l) => l.global_config_divergences.length > 0);
    if (anyConflict) problems.push("o manifesto tem pelo menos um conflito (produto ou questionário) — nunca aplicável em produção sem resolver antes, mesmo com confirmação");
    if (anyGlobalDivergence) problems.push("o manifesto tem pelo menos uma divergência de configuração global (ex.: especialidade) — nunca aplicável em produção sem resolver antes, mesmo com confirmação");
    if (problems.length > 0) {
      console.error("\n❌ Portão de produção recusou a transferência:");
      for (const p of problems) console.error(`   - ${p}`);
      console.error("\nNenhuma escrita foi feita.");
      await dst.$disconnect();
      process.exit(1);
    }
    console.log(`\n✅ Portão de produção aprovado — destino "${targetDatabaseName}" confirmado, manifesto ${readOnlyManifestHash} revisado, backup ${backupSha256} referenciado.`);
  }

  const manifest: ProductManifestLine[] = [];
  const configDivergenceSeen = new Set<string>();

  for (const p of products) {
    const line: ProductManifestLine = {
      slug: p.slug,
      product: "unchanged",
      version: "unchanged",
      tasks: { created: 0, updated: 0, unchanged: 0 },
      steps: { created: 0, updated: 0, unchanged: 0 },
      questionnaires: { created: 0, updated: 0, unchanged: 0, conflict: 0 },
      variations: { created: 0, updated: 0, unchanged: 0 },
      options: { created: 0, updated: 0, unchanged: 0 },
      addons: { created: 0, updated: 0, unchanged: 0 },
      periods: { created: 0, updated: 0, unchanged: 0 },
      provisional_preview: p.provisional_preview ? "unchanged" : "absent",
      import_origin: "unchanged",
      global_config_divergences: [],
      warnings: [],
    };
    const v = p.versions[0];
    if (!v) {
      line.warnings.push("produto sem nenhuma versão — pulado");
      manifest.push(line);
      continue;
    }

    // ── Specialties referenciadas: só LEITURA no destino, nunca escrita ──
    for (const t of v.tasks) {
      if (!t.specialty) continue;
      const key = t.specialty.key;
      const targetSpecialty = await dst.catalog2Specialty.findUnique({ where: { key } });
      if (!targetSpecialty) {
        const msg = `especialidade "${key}" não existe no destino — precisa rodar catalog2:seed-classifications lá antes`;
        if (!configDivergenceSeen.has(msg)) { line.global_config_divergences.push(msg); configDivergenceSeen.add(msg); }
      } else if (targetSpecialty.max_hourly_rate !== t.specialty.max_hourly_rate) {
        const msg = `especialidade "${key}": max_hourly_rate difere (origem=${t.specialty.max_hourly_rate} · destino=${targetSpecialty.max_hourly_rate}) — NÃO sobrescrito, decisão do responsável`;
        if (!configDivergenceSeen.has(msg)) { line.global_config_divergences.push(msg); configDivergenceSeen.add(msg); }
      }
    }

    // A esta altura mode é sempre "apply" — dry_run já retornou mais acima,
    // antes deste loop (ver buildReadOnlyManifest/readOnlyManifest).
    // ── APPLY: upsert real, por identidade natural, dentro de uma transação por produto ──
    await dst.$transaction(async (tx) => {
      const existing = await tx.catalog2Product.findUnique({ where: { slug: p.slug } });
      let productId: string;
      if (!existing) {
        const created = await tx.catalog2Product.create({
          data: {
            slug: p.slug,
            internal_name: p.internal_name,
            origin: p.origin,
            delivery_recurrence: p.delivery_recurrence,
            status: "em_preparacao", // NUNCA nasce em status contratável por esta transferência
          },
        });
        productId = created.id;
        line.product = "created";
      } else {
        productId = existing.id;
        const changed = existing.delivery_recurrence !== p.delivery_recurrence || existing.internal_name !== p.internal_name;
        if (changed) {
          await tx.catalog2Product.update({ where: { id: productId }, data: { internal_name: p.internal_name, delivery_recurrence: p.delivery_recurrence } });
          line.product = "updated";
        } else {
          line.product = "unchanged";
        }
      }

      // pillar/category por key (já vem no pacote — export seleciona só a key,
      // referência estrutural resolvida no destino, nunca criada aqui)
      if (p.pillar?.key) {
        const dstPillar = await tx.catalog2Pillar.findUnique({ where: { key: p.pillar.key } });
        if (dstPillar) await tx.catalog2Product.update({ where: { id: productId }, data: { pillar_id: dstPillar.id } });
        else line.warnings.push(`pilar "${p.pillar.key}" não existe no destino`);
      }
      if (p.category?.key) {
        const dstCategory = await tx.catalog2Category.findUnique({ where: { key: p.category.key } });
        if (dstCategory) await tx.catalog2Product.update({ where: { id: productId }, data: { category_id: dstCategory.id } });
        else line.warnings.push(`categoria "${p.category.key}" não existe no destino`);
      }

      // four_f (liga por key, idempotente — nunca duplica o link)
      for (const link of p.four_f) {
        const dstFourF = await tx.catalog2FourF.findUnique({ where: { key: link.four_f.key } });
        if (!dstFourF) { line.warnings.push(`4F "${link.four_f.key}" não existe no destino`); continue; }
        const existingLink = await tx.catalog2ProductFourF.findFirst({ where: { product_id: productId, four_f_id: dstFourF.id } });
        if (!existingLink) await tx.catalog2ProductFourF.create({ data: { product_id: productId, four_f_id: dstFourF.id } });
      }

      // versão atual — upsert por (product_id, version_number)
      const existingVersion = await tx.catalog2ProductVersion.findUnique({ where: { product_id_version_number: { product_id: productId, version_number: v.version_number } } });
      let versionId: string;
      const versionData = {
        title: v.title,
        summary: v.summary,
        full_description: v.full_description,
        base_commercial_deadline_days: v.base_commercial_deadline_days,
        provisional_commercial_deadline_days: v.provisional_commercial_deadline_days,
        provisional_deadline_reason: v.provisional_deadline_reason,
        provisional_deadline_source: v.provisional_deadline_source,
        state: "rascunho" as const, // nunca chega publicada por esta transferência — publicação é ato humano separado
      };
      if (!existingVersion) {
        const createdV = await tx.catalog2ProductVersion.create({ data: { product_id: productId, version_number: v.version_number, ...versionData } });
        versionId = createdV.id;
        line.version = "created";
      } else {
        versionId = existingVersion.id;
        const changed = existingVersion.title !== v.title || existingVersion.full_description !== v.full_description || existingVersion.summary !== v.summary;
        if (changed) { await tx.catalog2ProductVersion.update({ where: { id: versionId }, data: versionData }); line.version = "updated"; }
      }

      // tarefas + etapas + questionário (por key dentro da versão)
      for (const t of v.tasks) {
        let dstSpecialtyId: string | null = null;
        if (t.specialty) {
          const dstSpecialty = await tx.catalog2Specialty.findUnique({ where: { key: t.specialty.key } });
          dstSpecialtyId = dstSpecialty?.id ?? null;
        }
        let dstQuestionnaireId: string | null = null;
        if (t.questionnaire) {
          const existingQ = await tx.catalog2Questionnaire.findFirst({ where: { name: t.questionnaire.name } });
          if (!existingQ) {
            const createdQ = await tx.catalog2Questionnaire.create({ data: { name: t.questionnaire.name, description: t.questionnaire.description } });
            dstQuestionnaireId = createdQ.id;
            line.questionnaires.created++;
            for (const q of t.questionnaire.questions) {
              await tx.catalog2QuestionnaireQuestion.create({ data: { questionnaire_id: createdQ.id, key: q.key, label: q.label, is_required: q.is_required, sort_order: q.sort_order } });
            }
          } else {
            dstQuestionnaireId = existingQ.id;
            const sameDescription = existingQ.description === t.questionnaire.description;
            const existingQuestions = await tx.catalog2QuestionnaireQuestion.findMany({ where: { questionnaire_id: existingQ.id } });
            const sameQuestionCount = existingQuestions.length === t.questionnaire.questions.length;
            if (sameDescription && sameQuestionCount) {
              line.questionnaires.unchanged++;
            } else {
              // Nunca sobrescreve silenciosamente uma biblioteca compartilhada divergente — só relata.
              line.questionnaires.conflict++;
              line.warnings.push(`questionário "${t.questionnaire.name}" já existe no destino com conteúdo diferente — não sobrescrito`);
            }
          }
        }

        const existingTask = await tx.catalog2Task.findFirst({ where: { version_id: versionId, key: t.key } });
        const taskData = {
          name: t.name,
          description: t.description,
          objective: t.objective,
          sort_order: t.sort_order,
          specialty_id: dstSpecialtyId,
          questionnaire_id: dstQuestionnaireId,
          execution_mode: t.execution_mode,
          estimated_minutes: t.estimated_minutes,
          requires_review: t.requires_review,
          requires_client_approval: t.requires_client_approval,
          is_conditional: t.is_conditional,
          effort_is_provisional: t.effort_is_provisional,
          effort_provisional_reason: t.effort_provisional_reason,
          effort_source: t.effort_source,
          effort_ambiguous: t.effort_ambiguous,
          effort_ambiguous_reason: t.effort_ambiguous_reason,
        };
        let taskId: string;
        if (!existingTask) {
          const createdTask = await tx.catalog2Task.create({ data: { version_id: versionId, key: t.key, ...taskData } });
          taskId = createdTask.id;
          line.tasks.created++;
        } else {
          taskId = existingTask.id;
          const changed = existingTask.name !== t.name || existingTask.estimated_minutes !== t.estimated_minutes || existingTask.questionnaire_id !== dstQuestionnaireId;
          if (changed) { await tx.catalog2Task.update({ where: { id: taskId }, data: taskData }); line.tasks.updated++; }
          else line.tasks.unchanged++;
        }

        for (const s of t.steps) {
          const existingStep = await tx.catalog2TaskStep.findFirst({ where: { task_id: taskId, key: s.key } });
          const stepData = { name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional };
          if (!existingStep) { await tx.catalog2TaskStep.create({ data: { task_id: taskId, key: s.key, ...stepData } }); line.steps.created++; }
          else {
            const changed = existingStep.name !== s.name || existingStep.estimated_minutes !== s.estimated_minutes;
            if (changed) { await tx.catalog2TaskStep.update({ where: { id: existingStep.id }, data: stepData }); line.steps.updated++; }
            else line.steps.unchanged++;
          }
        }
      }

      // variações + opções + efeitos (por key dentro da versão / dentro da variação)
      for (const va of v.variations) {
        const existingVa = await tx.catalog2Variation.findFirst({ where: { version_id: versionId, key: va.key } });
        const vaData = { name: va.name, selection_type: va.selection_type, is_required: va.is_required, sort_order: va.sort_order, notes: va.notes };
        let vaId: string;
        if (!existingVa) { const c = await tx.catalog2Variation.create({ data: { version_id: versionId, key: va.key, ...vaData } }); vaId = c.id; line.variations.created++; }
        else { vaId = existingVa.id; const changed = existingVa.name !== va.name; if (changed) { await tx.catalog2Variation.update({ where: { id: vaId }, data: vaData }); line.variations.updated++; } else line.variations.unchanged++; }

        for (const op of va.options) {
          const existingOp = await tx.catalog2VariationOption.findFirst({ where: { variation_id: vaId, key: op.key } });
          const opData = { label: op.label, sort_order: op.sort_order, is_default: op.is_default };
          let opId: string;
          if (!existingOp) { const c = await tx.catalog2VariationOption.create({ data: { variation_id: vaId, key: op.key, ...opData } }); opId = c.id; line.options.created++; }
          else { opId = existingOp.id; const changed = existingOp.label !== op.label; if (changed) { await tx.catalog2VariationOption.update({ where: { id: opId }, data: opData }); line.options.updated++; } else line.options.unchanged++; }

          const existingEffects = await tx.catalog2OptionEffect.findMany({ where: { variation_option_id: opId } });
          if (existingEffects.length === 0 && op.effects.length > 0) {
            for (const eff of op.effects) await tx.catalog2OptionEffect.create({ data: { variation_option_id: opId, effect_type: eff.effect_type, effect_value: eff.effect_value, sort_order: eff.sort_order } });
          }
        }
      }

      // adicionais + efeitos (por key dentro da versão)
      for (const ad of v.addons) {
        const existingAd = await tx.catalog2Addon.findFirst({ where: { version_id: versionId, key: ad.key } });
        const adData = { name: ad.name, description: ad.description, sort_order: ad.sort_order, is_default_selected: ad.is_default_selected, is_active: ad.is_active, base_cost: ad.base_cost };
        let adId: string;
        if (!existingAd) { const c = await tx.catalog2Addon.create({ data: { version_id: versionId, key: ad.key, ...adData } }); adId = c.id; line.addons.created++; }
        else { adId = existingAd.id; const changed = existingAd.name !== ad.name || existingAd.base_cost !== ad.base_cost; if (changed) { await tx.catalog2Addon.update({ where: { id: adId }, data: adData }); line.addons.updated++; } else line.addons.unchanged++; }

        const existingEffects = await tx.catalog2AddonEffect.findMany({ where: { addon_id: adId } });
        if (existingEffects.length === 0 && ad.effects.length > 0) {
          for (const eff of ad.effects) await tx.catalog2AddonEffect.create({ data: { addon_id: adId, effect_type: eff.effect_type, effect_value: eff.effect_value, sort_order: eff.sort_order } });
        }
      }

      // períodos configurados
      for (const per of p.periods) {
        const existingPer = await tx.catalog2ProductPeriod.findUnique({ where: { product_id_period: { product_id: productId, period: per.period } } });
        const perData = { months: per.months, discount_percent: per.discount_percent, is_active: per.is_active };
        if (!existingPer) { await tx.catalog2ProductPeriod.create({ data: { product_id: productId, period: per.period, ...perData } }); line.periods.created++; }
        else {
          const changed = existingPer.discount_percent !== per.discount_percent || existingPer.is_active !== per.is_active;
          if (changed) { await tx.catalog2ProductPeriod.update({ where: { id: existingPer.id }, data: perData }); line.periods.updated++; }
          else line.periods.unchanged++;
        }
      }

      // preview provisório — preserva a marcação de "provisório" explicitamente
      if (p.provisional_preview) {
        const pv = p.provisional_preview;
        const existingPv = await tx.catalog2ProvisionalPreview.findUnique({ where: { product_id: productId } });
        const pvData = {
          is_provisional: true,
          needs_review: pv.needs_review,
          image_path: pv.image_path,
          image_source_note: pv.image_source_note,
          price_amount: pv.price_amount,
          deadline_days: pv.deadline_days,
          modality: pv.modality,
          contract_note: pv.contract_note,
          highlights_json: pv.highlights_json,
          included_items_json: pv.included_items_json,
          options_json: pv.options_json,
          portfolio_refs_json: pv.portfolio_refs_json,
        };
        if (!existingPv) { await tx.catalog2ProvisionalPreview.create({ data: { product_id: productId, ...pvData } }); line.provisional_preview = "created"; }
        else { await tx.catalog2ProvisionalPreview.update({ where: { product_id: productId }, data: pvData }); line.provisional_preview = "unchanged"; }
      }

      // procedência da importação (metadado — nunca decide sozinho, só preserva o rastro)
      if (p.import_origin) {
        const io = p.import_origin;
        const existingIo = await tx.catalog2ProductImportOrigin.findUnique({ where: { product_id: productId } });
        const ioData = {
          source_key: io.source_key,
          source_index: io.source_index,
          source_name: io.source_name,
          rose_reviewed: io.rose_reviewed,
          area_rose: io.area_rose,
          review_state: io.review_state,
          pendencies_json: io.pendencies_json,
          last_import_checksum: io.last_import_checksum,
          main_fields_json: io.main_fields_json,
          rose_fields_json: io.rose_fields_json,
          original_texts_json: io.original_texts_json,
          divergences_json: io.divergences_json,
          historical_price_min: io.historical_price_min,
          historical_price_max: io.historical_price_max,
          historical_price_note: io.historical_price_note,
        };
        if (!existingIo) { await tx.catalog2ProductImportOrigin.create({ data: { product_id: productId, ...ioData } }); line.import_origin = "created"; }
        else { await tx.catalog2ProductImportOrigin.update({ where: { product_id: productId }, data: ioData }); line.import_origin = "unchanged"; }
      }
    });

    manifest.push(line);
  }

  console.log(`\n════════ MANIFESTO — APLICADO (${products.length} produtos avaliados, target-env=${targetEnv}) ════════`);
  for (const l of manifest) {
    console.log(`  ${l.slug} — produto:${l.product} versão:${l.version} tarefas:${jstr(l.tasks)} questionários:${jstr(l.questionnaires)}`);
    if (l.global_config_divergences.length) for (const d of l.global_config_divergences) console.log(`     ⚠ ${d}`);
    if (l.warnings.length) for (const w of l.warnings) console.log(`     ⚠ ${w}`);
  }

  if (arg("json") !== undefined) console.log("\n" + JSON.stringify({ mode, target_env: targetEnv, count: products.length, manifest }, null, 2));

  console.log("\n────────────────────────────────────────────");
  console.log("Transferência concluída no destino informado. Nenhum produto ficou contratável.");

  await dst.$disconnect();
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
