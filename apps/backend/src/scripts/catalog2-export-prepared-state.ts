/**
 * Exporta o ESTADO PREPARADO dos produtos catalog2 (Item 16.1, reunião
 * 2026-09-14, "Fechar os bloqueios antes da publicação") — banco de ORIGEM
 * -> pacote em disco (JSON + imagens), SEM conexão simultânea com o
 * destino. Complementa `catalog2-transfer-prepared-state.ts` (que exige os
 * dois bancos alcançáveis ao mesmo tempo, impossível entre esta máquina e o
 * VPS de produção) com um par exportar-agora / importar-depois.
 *
 *   npm run catalog2:export-prepared -- --out=./scratch/catalog2-package
 *
 * Mesmo escopo e mesma exclusão do script de transferência direta (ver seu
 * cabeçalho): só os produtos com `Catalog2ProductImportOrigin` + suas
 * dependências diretas. NUNCA usuários, projetos, pagamentos, sessões,
 * cotação/cesta, fila de notificação, config global. Nunca lê nem grava
 * segredo/credencial.
 *
 * Pacote gerado (nunca vai para o Git — está em `.gitignore`):
 *   <out>/package.json   — format_version, exported_at, produtos (dados
 *                           brutos, prontos para o importador reconciliar
 *                           por identidade), lista de imagens referenciadas
 *                           com seu sha256 individual.
 *   <out>/images/<path>  — cópia de cada arquivo de imagem referenciado por
 *                           Catalog2ProvisionalPreview.image_path que
 *                           existir de fato no repositório do frontend.
 *   <out>/package.sha256 — checksum do package.json (conferido pelo
 *                           importador antes de ler qualquer coisa).
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

function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

async function main() {
  const outDir = arg("out");
  if (!outDir) {
    console.error("❌ --out é obrigatório (pasta onde o pacote será gravado, ex.: ./scratch/catalog2-package)");
    process.exit(1);
  }
  const sourceUrl = process.env.DATABASE_URL;
  assertLocalDatabase(sourceUrl); // exportar SÓ de um banco local — nunca de produção diretamente

  const src = new PrismaClient({ datasources: { db: { url: sourceUrl } } });

  console.log(`▶ Exportando estado preparado do catalog2 para ${outDir}`);

  const products = await src.catalog2Product.findMany({
    where: { import_origin: { isNot: null } },
    include: {
      import_origin: true,
      provisional_preview: true,
      four_f: { include: { four_f: true } },
      periods: true,
      pillar: { select: { key: true } },
      category: { select: { key: true } },
      versions: {
        orderBy: { version_number: "desc" },
        take: 1,
        include: {
          variations: { include: { options: { include: { effects: true } } } },
          addons: { include: { effects: true } },
          tasks: { include: { steps: { include: { specialty: { select: { key: true } } } }, specialty: { select: { key: true, max_hourly_rate: true } }, questionnaire: { include: { questions: true } } } },
        },
      },
    },
    orderBy: { slug: "asc" },
  });

  // Referências de imagem — só as que o preview provisório de fato aponta.
  const imageRefs = new Set<string>();
  for (const p of products) {
    if (p.provisional_preview?.image_path) imageRefs.add(p.provisional_preview.image_path);
  }

  // Caminho do frontend público, relativo a este script (apps/backend/src/scripts -> ../../../frontend/public).
  const frontendPublicRoot = path.resolve(__dirname, "..", "..", "..", "frontend", "public");
  const imagesOutDir = path.join(outDir, "images");
  fs.mkdirSync(imagesOutDir, { recursive: true });

  const images: Array<{ path: string; sha256: string; size: number; found: boolean }> = [];
  for (const rel of imageRefs) {
    // image_path já vem como "/images/products/xxx.svg" (raiz pública) —
    // normaliza pra caminho relativo dentro de public/.
    const relClean = rel.replace(/^\/+/, "");
    const srcPath = path.join(frontendPublicRoot, relClean);
    if (!fs.existsSync(srcPath)) {
      images.push({ path: rel, sha256: "", size: 0, found: false });
      console.warn(`  ⚠ imagem referenciada não encontrada no repositório: ${rel} — pacote registra a ausência, não inventa o arquivo`);
      continue;
    }
    const destPath = path.join(imagesOutDir, relClean);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    const stat = fs.statSync(srcPath);
    images.push({ path: rel, sha256: sha256File(srcPath), size: stat.size, found: true });
  }

  const pkg = {
    format_version: PACKAGE_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    product_count: products.length,
    products,
    images,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const packagePath = path.join(outDir, "package.json");
  const packageJson = JSON.stringify(pkg, null, 2);
  fs.writeFileSync(packagePath, packageJson);
  const packageSha256 = crypto.createHash("sha256").update(packageJson, "utf8").digest("hex");
  fs.writeFileSync(path.join(outDir, "package.sha256"), packageSha256 + "\n");

  console.log(`\n════════ PACOTE EXPORTADO ════════`);
  console.log(`  produtos: ${products.length}`);
  console.log(`  imagens referenciadas: ${images.length} (${images.filter((i) => i.found).length} encontradas, ${images.filter((i) => !i.found).length} ausentes)`);
  console.log(`  package.json: ${packagePath}`);
  console.log(`  package.sha256: ${packageSha256}`);
  console.log(`\nNUNCA versionar esta pasta no git — dado, não código.`);

  await src.$disconnect();
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
