/**
 * auditar-ids-legados.ts — Mostra, por entidade, quantos registros carregam o
 * id da plataforma antiga (`legacy_id`) e dá exemplos.
 *
 * Serve pra responder "de onde veio este registro?" e para conferir se alguma
 * importação deixou buraco de rastreio.
 *
 * npx tsx src/scripts/auditar-ids-legados.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const p = prisma as any;
  const entidades: Array<[string, any, string]> = [
    ["Usuários", p.user, "users"],
    ["Agências", p.agency, "agencies"],
    ["Clientes", p.client, "clients"],
    ["Empresas", p.company, "companies"],
    ["Nômades", p.nomade, "nomades"],
    ["Produtos", p.product, "products"],
    ["Projetos", p.project, "projects"],
    ["Produtos de projeto", p.projectProduct, "project_products"],
    ["Tarefas", p.projectTask, "project_tasks"],
  ];

  console.log("entidade                total   c/ id antigo   faixa de ids antigos");
  console.log("─".repeat(76));
  for (const [nome, model] of entidades) {
    const total = await model.count();
    const com = await model.count({ where: { legacy_id: { not: null } } });
    let faixa = "—";
    if (com > 0) {
      const min = await model.findFirst({
        where: { legacy_id: { not: null } },
        orderBy: { legacy_id: "asc" },
        select: { legacy_id: true },
      });
      const max = await model.findFirst({
        where: { legacy_id: { not: null } },
        orderBy: { legacy_id: "desc" },
        select: { legacy_id: true },
      });
      faixa = `#${min.legacy_id} … #${max.legacy_id}`;
    }
    console.log(
      `${nome.padEnd(22)} ${String(total).padStart(6)} ${String(com).padStart(12)}   ${faixa}`,
    );
  }

  // Produtos consolidados guardam VÁRIOS ids antigos (as faixas que viraram
  // variação), no metadata — legacy_id sozinho não conta essa história.
  const produtos = await prisma.product.findMany({ select: { metadata: true } });
  let comLista = 0;
  let somaIds = 0;
  for (const p2 of produtos) {
    try {
      const ids = JSON.parse(p2.metadata || "{}").legacyIds;
      if (Array.isArray(ids) && ids.length) {
        comLista++;
        somaIds += ids.length;
      }
    } catch {
      /* ignora */
    }
  }
  console.log(
    `\nProdutos com lista de origens no metadata: ${comLista} (${somaIds} ids antigos mapeados no total)`,
  );

  const exemplo = await prisma.product.findFirst({
    where: { product_code: "prod_50" },
    select: { name: true, product_code: true, metadata: true },
  });
  if (exemplo) {
    const meta = JSON.parse(exemplo.metadata || "{}");
    console.log(
      `  ex.: ${exemplo.product_code} "${exemplo.name}" ← antigos ${JSON.stringify(meta.legacyIds)} · código ${meta.code}`,
    );
  }

  const semRastreio = await prisma.projectProduct.count({ where: { legacy_id: null } });
  console.log(
    `\n⚠ Produtos de projeto sem legacy_id: ${semRastreio} — a tabela project_product do dump é a única sem coluna de id própria (chave composta projectId+productId), então não há número antigo pra guardar. O rastreio dela é pelo projeto + produto.`,
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
