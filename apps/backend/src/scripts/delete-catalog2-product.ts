/**
 * Apaga um produto catalog2 (por número) e tudo que depende dele: versões,
 * tarefas, cotações, itens de carrinho, produtos de projeto e os projetos que
 * ficarem sem nenhum produto por causa disso (projetos de teste).
 *
 * Uso (dentro de apps/backend):
 *   npx tsx src/scripts/delete-catalog2-product.ts 37            # simulação (não grava nada)
 *   npx tsx src/scripts/delete-catalog2-product.ts 37 --apply     # apaga de verdade
 *
 * SEMPRE tire backup antes de rodar com --apply. Tudo acontece numa única
 * transação; se sobrar qualquer violação de chave estrangeira, desfaz tudo.
 */
import { prisma } from "../lib/prisma";

async function main() {
  const number = Number(process.argv[2]);
  const apply = process.argv.includes("--apply");
  if (!Number.isInteger(number)) throw new Error("Informe o número do produto (ex.: 37).");

  const product = await prisma.catalog2Product.findFirst({ where: { sequence_number: number }, select: { id: true, internal_name: true } });
  if (!product) throw new Error(`Produto ${number} não encontrado.`);
  console.log(`Produto ${number}: ${product.internal_name} (${product.id})`);

  const projectIds = (await prisma.projectProduct.findMany({ where: { catalog2_product_id: product.id }, select: { project_id: true } })).map((p) => p.project_id);
  const counts = {
    versoes: await prisma.catalog2ProductVersion.count({ where: { product_id: product.id } }),
    cotacoes: await prisma.catalog2Quote.count({ where: { product_id: product.id } }),
    produtos_de_projeto: await prisma.projectProduct.count({ where: { catalog2_product_id: product.id } }),
    projetos_envolvidos: new Set(projectIds).size,
  };
  console.log("Vai afetar:", counts);
  if (!apply) {
    console.log("Simulação: nada foi apagado. Rode com --apply para apagar.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");
      await tx.$executeRawUnsafe("DELETE FROM `catalog2_product_versions` WHERE product_id = ?", product.id);
      await tx.$executeRawUnsafe("DELETE FROM `catalog2_products` WHERE id = ?", product.id);

      const fks = await tx.$queryRawUnsafe<{ T: string; C: string; RT: string; RC: string }[]>(
        `SELECT k.TABLE_NAME AS T, k.COLUMN_NAME AS C, k.REFERENCED_TABLE_NAME AS RT, k.REFERENCED_COLUMN_NAME AS RC
         FROM information_schema.KEY_COLUMN_USAGE k WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      const sweep = async (label: string) => {
        for (let i = 1; i <= 12; i++) {
          let n = 0;
          for (const f of fks) {
            n += Number(
              await tx.$executeRawUnsafe(
                `DELETE t FROM \`${f.T}\` t LEFT JOIN \`${f.RT}\` p ON t.\`${f.C}\` = p.\`${f.RC}\` WHERE t.\`${f.C}\` IS NOT NULL AND p.\`${f.RC}\` IS NULL`,
              ),
            );
          }
          console.log(`  ${label} — iteração ${i}: ${n} linhas órfãs removidas`);
          if (n === 0) break;
        }
      };
      await sweep("dependências do produto");

      // Projetos que ficaram sem nenhum produto por causa desta remoção.
      const ids = [...new Set(projectIds)];
      if (ids.length) {
        const r = await tx.$executeRawUnsafe(
          `DELETE FROM \`projects\` WHERE id IN (${ids.map(() => "?").join(",")}) AND NOT EXISTS (SELECT 1 FROM \`project_products\` pp WHERE pp.project_id = \`projects\`.id)`,
          ...ids,
        );
        console.log(`  projetos de teste sem produto: apagou ${r}`);
        await sweep("dependências dos projetos");
      }

      let violations = 0;
      for (const f of fks) {
        const r = await tx.$queryRawUnsafe<{ c: bigint }[]>(
          `SELECT COUNT(*) AS c FROM \`${f.T}\` t LEFT JOIN \`${f.RT}\` p ON t.\`${f.C}\` = p.\`${f.RC}\` WHERE t.\`${f.C}\` IS NOT NULL AND p.\`${f.RC}\` IS NULL`,
        );
        violations += Number(r[0].c);
      }
      if (violations > 0) throw new Error(`${violations} violações de chave estrangeira — transação desfeita.`);
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");
    },
    { timeout: 120000, maxWait: 20000 },
  );
  console.log("Pronto: produto apagado.");
}

main()
  .catch((e) => {
    console.error("ERRO:", e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
