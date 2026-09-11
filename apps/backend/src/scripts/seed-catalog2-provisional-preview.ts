/**
 * Preenche `catalog2_provisional_previews` — camada de conteúdo provisório de
 * DEMONSTRAÇÃO para o Admin Master visualizar os produtos do catalog2
 * completos (imagem, preço, prazo, modalidade, contrato, destaques, itens
 * incluídos, opções, portfólio) enquanto os dados comerciais definitivos não
 * existem. NUNCA grava em `catalog2_products`/`catalog2_product_versions` e
 * NUNCA torna nenhum produto comercialmente aprovado.
 *
 *   npm run catalog2:seed-provisional-preview -- --dry-run   (padrão)
 *   npm run catalog2:seed-provisional-preview -- --apply
 *   npm run catalog2:seed-provisional-preview -- --remove
 *
 * Guardas:
 *   - recusa rodar se DATABASE_URL não apontar para localhost/127.0.0.1;
 *   - recusa rodar se NODE_ENV === "production";
 *   - alvo = produtos importados (import_origin existe), em_preparacao,
 *     SEM o prefixo "[TESTE LOCAL]" (a fixture nunca é tocada);
 *   - idempotente: upsert por product_id, pode rodar quantas vezes quiser;
 *   - `--remove` apaga SOMENTE as linhas de catalog2_provisional_previews
 *     dos produtos alvo (nunca toca em Catalog2Product/versões/tarefas).
 *
 * Imagens: escolhidas por INDEXAÇÃO DETERMINÍSTICA (hash do id do produto)
 * dentro dos arquivos .svg JÁ EXISTENTES em apps/frontend/public/images/
 * products (gerados localmente por generate-product-images.ts — gradientes
 * abstratos, não fotografias, sem licença de terceiros). Nunca baixa nada da
 * internet, nunca move/apaga os arquivos, nunca altera produtos antigos.
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";
const IMAGES_DIR = path.resolve(__dirname, "..", "..", "..", "frontend", "public", "images", "products");

function arg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function assertLocalDatabase(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Recusado: NODE_ENV=production. Este script só roda local/test.");
  }
  const url = process.env.DATABASE_URL || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL inválida — recusando rodar.");
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Recusado: DATABASE_URL aponta para host "${host}" — só localhost/127.0.0.1 é permitido.`);
  }
}

// ── FNV-1a 32-bit — mesma função usada no frontend (lib/catalog2-provisional.ts) ──
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function pick<T>(seed: string, items: readonly T[]): T {
  return items[hash(seed) % items.length] as T;
}
function range(seed: string, min: number, max: number, step = 1): number {
  const span = Math.floor((max - min) / step) + 1;
  return min + (hash(seed) % span) * step;
}

const MODALITIES = ["Projeto único", "Recorrente mensal", "Sob demanda"] as const;
const CONTRACT_NOTES = [
  "Contrato único por escopo fechado — condição provisória, sujeita a revisão comercial.",
  "Renovação mensal automática enquanto o serviço estiver ativo — condição provisória.",
  "Contratação avulsa, sob demanda pontual — condição provisória.",
];
const HIGHLIGHT_POOL = [
  "Equipe especializada dedicada ao escopo",
  "Acompanhamento com relatórios periódicos",
  "Prazo de entrega comprometido",
  "Revisões incluídas no ciclo contratado",
  "Suporte direto pelo painel Allka",
  "Metodologia própria de execução",
  "Entregáveis versionados e auditáveis",
];
const INCLUDED_ITEM_POOL = [
  { title: "Diagnóstico inicial", description: "Levantamento do cenário atual antes da execução." },
  { title: "Execução do escopo principal", description: "Entrega do núcleo do serviço contratado." },
  { title: "Revisão e ajustes", description: "Ciclo de ajustes a partir do retorno do cliente." },
  { title: "Relatório final", description: "Consolidação dos resultados entregues." },
  { title: "Handoff e orientações", description: "Repasse do material final e próximos passos." },
];
const OPTION_NAME_POOL = ["Essencial", "Padrão", "Avançado"] as const;

async function main() {
  const dryRun = !arg("apply") && !arg("remove");
  const remove = arg("remove");

  assertLocalDatabase();

  const products = await prisma.catalog2Product.findMany({
    where: {
      status: "em_preparacao",
      import_origin: { isNot: null },
      NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } },
    },
    orderBy: { internal_name: "asc" },
    select: { id: true, internal_name: true },
  });

  console.log(`▶ Produtos alvo (importados, em_preparacao, sem fixture): ${products.length}`);
  if (products.length !== 36) {
    console.log(`  Aviso: esperado historicamente 36; encontrado ${products.length}. Seguindo mesmo assim (alvo é sempre o conjunto real, nunca um número fixo).`);
  }

  if (remove) {
    const ids = products.map((p) => p.id);
    const result = await prisma.catalog2ProvisionalPreview.deleteMany({ where: { product_id: { in: ids } } });
    console.log(`✔ Removidas ${result.count} linha(s) de catalog2_provisional_previews (restrito aos ${ids.length} produtos alvo).`);
    return;
  }

  // ── Pool de imagens já existentes (nunca baixa/move nada) ──
  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".svg"));
  const coverFiles = files.filter((f) => !f.includes("-portfolio-")).sort();
  const portfolioFiles = files.filter((f) => f.includes("-portfolio-")).sort();
  if (coverFiles.length === 0) throw new Error(`Nenhuma imagem de capa encontrada em ${IMAGES_DIR}`);
  console.log(`  Pool de imagens existentes: ${coverFiles.length} capas, ${portfolioFiles.length} portfólio (origem: ${IMAGES_DIR}).`);

  let written = 0;
  for (const p of products) {
    const coverFile = pick(`${p.id}:cover`, coverFiles);
    const coverPath = path.join(IMAGES_DIR, coverFile);
    if (!fs.existsSync(coverPath)) throw new Error(`Arquivo de imagem inexistente: ${coverPath}`);
    const imagePath = `/images/products/${coverFile}`;

    const portfolioRefs: string[] = [];
    if (portfolioFiles.length > 0) {
      const a = pick(`${p.id}:pf1`, portfolioFiles);
      portfolioRefs.push(`/images/products/${a}`);
      if (portfolioFiles.length > 1) {
        let b = pick(`${p.id}:pf2`, portfolioFiles);
        if (b === a) b = portfolioFiles[(portfolioFiles.indexOf(a) + 1) % portfolioFiles.length] as string;
        portfolioRefs.push(`/images/products/${b}`);
      }
    }

    const price = range(`${p.id}:price`, 300, 4800, 50);
    const deadline = range(`${p.id}:deadline`, 3, 21);
    const modality = pick(`${p.id}:modality`, MODALITIES);
    const contractNote = pick(`${p.id}:contract`, CONTRACT_NOTES);

    const highlightCount = range(`${p.id}:hcount`, 3, 5);
    const highlights = Array.from(new Set(
      Array.from({ length: highlightCount }, (_, i) => pick(`${p.id}:h${i}`, HIGHLIGHT_POOL)),
    )).slice(0, 5);

    const includedCount = range(`${p.id}:icount`, 2, INCLUDED_ITEM_POOL.length);
    const included = INCLUDED_ITEM_POOL.slice(0, includedCount);

    const optionCount = range(`${p.id}:ocount`, 2, 3);
    const options = Array.from({ length: optionCount }, (_, i) => {
      const factor = 1 + i * 0.4;
      return {
        name: OPTION_NAME_POOL[i] ?? `Opção ${i + 1}`,
        price: Math.round(price * factor),
        deadline_days: deadline + i * 2,
        modality,
        features: [pick(`${p.id}:of${i}a`, HIGHLIGHT_POOL), pick(`${p.id}:of${i}b`, HIGHLIGHT_POOL)],
      };
    });

    if (dryRun) {
      console.log(`  [dry-run] ${p.internal_name} → imagem=${imagePath} preço=R$${price} prazo=${deadline}d modalidade=${modality}`);
      continue;
    }

    await prisma.catalog2ProvisionalPreview.upsert({
      where: { product_id: p.id },
      create: {
        product_id: p.id,
        is_provisional: true,
        needs_review: true,
        image_path: imagePath,
        image_source_note: `Reaproveitada de ${coverFile} (banco de imagens locais gerado por generate-product-images.ts) — provisória, substituir por imagem definitiva.`,
        price_amount: price,
        deadline_days: deadline,
        modality,
        contract_note: contractNote,
        highlights_json: JSON.stringify(highlights),
        included_items_json: JSON.stringify(included),
        options_json: JSON.stringify(options),
        portfolio_refs_json: JSON.stringify(portfolioRefs),
      },
      update: {
        is_provisional: true,
        needs_review: true,
        image_path: imagePath,
        image_source_note: `Reaproveitada de ${coverFile} (banco de imagens locais gerado por generate-product-images.ts) — provisória, substituir por imagem definitiva.`,
        price_amount: price,
        deadline_days: deadline,
        modality,
        contract_note: contractNote,
        highlights_json: JSON.stringify(highlights),
        included_items_json: JSON.stringify(included),
        options_json: JSON.stringify(options),
        portfolio_refs_json: JSON.stringify(portfolioRefs),
      },
    });
    written++;
  }

  if (dryRun) {
    console.log(`\n(dry-run — nada foi gravado; rode com --apply para gravar)`);
    return;
  }

  console.log(`✔ ${written} produto(s) com preview provisório gravado/atualizado.`);
  const withPrice = await prisma.catalog2ProvisionalPreview.count({
    where: { product_id: { in: products.map((p) => p.id) }, price_amount: { not: null } },
  });
  console.log(`✔ Comprovação: ${withPrice} de ${products.length} produtos alvo possuem preço provisório.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
