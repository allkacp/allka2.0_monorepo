/**
 * consolidate-legacy-products.ts — Consolida os produtos legados que a
 * importação da plataforma (fase 6) trouxe sem passar pela consolidação.
 *
 * O import-legacy-products.ts já tinha unido o catálogo ativo (142 → 73), mas
 * os 127 produtos descontinuados vieram depois, um a um, direto do dump. São
 * eles que aparecem repetidos na tela ("Análise de UX (até 5/10/20 páginas)").
 * Aqui eles recebem o mesmo tratamento: um produto por família, com as faixas
 * virando ProductVariation.
 *
 * Os produtos permanecem INATIVOS — são descontinuados, existem só para
 * sustentar projetos e tarefas importados.
 *
 * Cuidado central: ProjectTask.project_product_id tem onDelete Cascade. Apagar
 * um ProjectProduct APAGA as tarefas dele. Por isso toda tarefa é movida para
 * o vínculo que fica ANTES de qualquer exclusão, e a exclusão do produto vem
 * por último (as FKs restantes são restritivas, então qualquer coisa esquecida
 * faz o script falhar em vez de destruir dado em silêncio).
 *
 * Idempotente (uma vez consolidado, o grupo deixa de ter irmãos).
 *   npx tsx src/scripts/consolidate-legacy-products.ts [--apply]
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

/** Remove a parte que diferencia a faixa, sobrando o nome da família. */
function nomeBase(n: string): string {
  return n
    .replace(/\s*\((até|Até)\s*[^)]*\)\s*/g, " ")
    .replace(/^\d+\s*x?\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Rótulo da variação, extraído do que diferencia aquele produto. */
function rotuloVariacao(n: string): string {
  const ate = n.match(/\((até\s*[^)]*)\)/i);
  if (ate) {
    const t = ate[1].trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const qtd = n.match(/^(\d+)\s*x?\s+/);
  if (qtd) {
    const q = Number(qtd[1]);
    return `${q} ${q === 1 ? "unidade" : "unidades"}`;
  }
  return n.trim();
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Move vínculos e tarefas de `de` para `para`, mesclando quando os dois já
 * existem no mesmo projeto, e devolve quantas tarefas foram movidas.
 *
 * A ordem importa: tarefa sempre sai antes do vínculo ser apagado, porque
 * ProjectTask.project_product_id é cascade.
 */
async function migrarReferencias(deIds: string[], paraId: string) {
  let tarefas = 0;
  let vinculos = 0;

  const lista = await prisma.projectProduct.findMany({ where: { product_id: { in: deIds } } });
  const porProjeto = new Map<string, typeof lista>();
  for (const v of lista) {
    porProjeto.set(v.project_id, [...(porProjeto.get(v.project_id) ?? []), v]);
  }

  for (const [projectId, doProjeto] of porProjeto) {
    const jaExiste = await prisma.projectProduct.findFirst({
      where: { project_id: projectId, product_id: paraId },
    });
    // Sem vínculo do destino neste projeto: aproveita o primeiro, repontando.
    const alvo = jaExiste ?? doProjeto[0];
    if (!jaExiste && APPLY) {
      await prisma.projectProduct.update({
        where: { id: alvo.id },
        // variation_id apontava para variação do produto que vai sumir (ela
        // cai por cascade) — o histórico de preço já está nos snapshots.
        data: { product_id: paraId, variation_id: null },
      });
    }

    for (const v of doProjeto) {
      if (v.id === alvo.id) continue;
      const qtd = await prisma.projectTask.count({ where: { project_product_id: v.id } });
      if (APPLY) {
        await prisma.projectTask.updateMany({
          where: { project_product_id: v.id },
          data: { project_product_id: alvo.id, product_id: paraId },
        });
        await prisma.projectProduct.delete({ where: { id: v.id } });
      }
      tarefas += qtd;
      vinculos++;
    }
  }

  const restantes = await prisma.projectTask.count({ where: { product_id: { in: deIds } } });
  if (restantes && APPLY) {
    await prisma.projectTask.updateMany({
      where: { product_id: { in: deIds } },
      data: { product_id: paraId },
    });
  }
  return { tarefas: tarefas + restantes, vinculos };
}

/**
 * Etapa 2: o mesmo produto existe duas vezes — a versão descontinuada vinda
 * da importação e a do catálogo atual (ex.: "Landing Page WordPress"). O
 * histórico é repontado para o produto ativo e a duplicata sai de cena.
 */
async function fundirComCatalogoAtivo() {
  const ativos = await prisma.product.findMany({ where: { is_active: true } });
  const legados = await prisma.product.findMany({
    where: { is_active: false, legacy_id: { not: null } },
  });
  const porNome = new Map(ativos.map((p) => [norm(p.name), p]));

  let fundidos = 0;
  let tarefas = 0;
  for (const l of legados) {
    const ativo = porNome.get(norm(l.name));
    if (!ativo) continue;

    const r = await migrarReferencias([l.id], ativo.id);
    tarefas += r.tarefas;

    if (APPLY) {
      let meta: any = {};
      try {
        meta = JSON.parse(ativo.metadata || "{}");
      } catch {
        /* ignora */
      }
      // Registra a origem descontinuada que foi absorvida, pra continuar
      // sendo possível rastrear de onde veio cada tarefa antiga.
      meta.legacyIds = [...new Set([...(meta.legacyIds ?? []), l.legacy_id])];
      await prisma.product.update({
        where: { id: ativo.id },
        data: { metadata: JSON.stringify(meta) },
      });
      await prisma.product.delete({ where: { id: l.id } });
    }
    fundidos++;
    console.log(`  ${l.name.padEnd(46)} → ${ativo.product_code} (${r.tarefas} tarefas, ${r.vinculos} vínculos)`);
  }
  return { fundidos, tarefas };
}

async function main() {
  console.log(`▶ Consolidação de produtos legados — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const legado = await prisma.product.findMany({
    where: { legacy_id: { not: null } },
    orderBy: { base_price: "asc" },
  });

  const grupos = new Map<string, typeof legado>();
  for (const p of legado) {
    const k = nomeBase(p.name).toLowerCase();
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }

  let produtosRemovidos = 0;
  let variacoesCriadas = 0;
  let vinculosMesclados = 0;
  let tarefasMovidas = 0;

  for (const [, membros] of grupos) {
    if (membros.length < 2) continue;

    // O mais barato vira o canônico: é a menor faixa da família, e o
    // base_price do produto deve refletir o piso.
    const [canonico, ...outros] = membros;
    const outrosIds = outros.map((p) => p.id);
    const nome = nomeBase(canonico.name);

    console.log(`■ ${nome}  (${membros.length} → 1)`);

    // ── 1. Mescla os vínculos de projeto, movendo as tarefas antes ────────
    const vinculos = await prisma.projectProduct.findMany({
      where: { product_id: { in: membros.map((p) => p.id) } },
    });
    const porProjeto = new Map<string, typeof vinculos>();
    for (const v of vinculos) {
      porProjeto.set(v.project_id, [...(porProjeto.get(v.project_id) ?? []), v]);
    }

    for (const [projectId, lista] of porProjeto) {
      const alvo = lista.find((v) => v.product_id === canonico.id) ?? lista[0];
      const aRemover = lista.filter((v) => v.id !== alvo.id);

      if (alvo.product_id !== canonico.id && APPLY) {
        await prisma.projectProduct.update({
          where: { id: alvo.id },
          data: { product_id: canonico.id },
        });
      }

      for (const v of aRemover) {
        const qtd = await prisma.projectTask.count({ where: { project_product_id: v.id } });
        if (APPLY) {
          // Move ANTES de apagar: a FK é cascade e levaria as tarefas junto.
          await prisma.projectTask.updateMany({
            where: { project_product_id: v.id },
            data: { project_product_id: alvo.id, product_id: canonico.id },
          });
          await prisma.projectProduct.delete({ where: { id: v.id } });
        }
        tarefasMovidas += qtd;
        vinculosMesclados++;
      }
      if (aRemover.length) {
        console.log(`    projeto ${projectId.slice(0, 8)}…: ${aRemover.length} vínculos mesclados`);
      }
    }

    // Varredura: tarefas que ainda apontam para um produto que vai sumir.
    const restantes = await prisma.projectTask.count({
      where: { product_id: { in: outrosIds } },
    });
    if (restantes && APPLY) {
      await prisma.projectTask.updateMany({
        where: { product_id: { in: outrosIds } },
        data: { product_id: canonico.id },
      });
    }
    if (restantes) {
      tarefasMovidas += restantes;
      console.log(`    ${restantes} tarefas repontadas para o produto canônico`);
    }

    // ── 2. Variações representando cada faixa ─────────────────────────────
    if (APPLY) {
      await prisma.productVariation.deleteMany({ where: { product_id: canonico.id } });
    }
    const rotulosUsados = new Set<string>();
    for (let i = 0; i < membros.length; i++) {
      const m = membros[i];
      let rotulo = rotuloVariacao(m.name);
      // A base antiga tem faixas duplicadas (ex.: dois "1 Card Post (Motion)")
      // — desempata pelo id de origem em vez de esconder uma delas.
      if (rotulosUsados.has(rotulo)) rotulo = `${rotulo} (origem #${m.legacy_id})`;
      rotulosUsados.add(rotulo);

      if (APPLY) {
        await prisma.productVariation.create({
          data: {
            id: `${canonico.id}-V${String(i + 1).padStart(2, "0")}`,
            product_id: canonico.id,
            name: rotulo,
            description: m.short_description,
            price: m.base_price,
            price_modifier: 0,
            scope_description: rotulo,
            sort_order: i + 1,
            is_active: false,
          },
        });
      }
      variacoesCriadas++;
      console.log(`    variação: ${rotulo.padEnd(28)} R$ ${m.base_price}`);
    }

    // ── 3. Canônico assume o nome da família ──────────────────────────────
    if (APPLY) {
      let meta: any = {};
      try {
        meta = JSON.parse(canonico.metadata || "{}");
      } catch {
        /* ignora */
      }
      meta.legacyIds = membros.map((m) => m.legacy_id);
      meta._consolidadoEm = new Date().toISOString();
      await prisma.product.update({
        where: { id: canonico.id },
        data: { name: nome, metadata: JSON.stringify(meta), is_active: false },
      });
    }

    // ── 4. Só agora remove os produtos absorvidos ─────────────────────────
    if (APPLY) {
      await prisma.product.deleteMany({ where: { id: { in: outrosIds } } });
    }
    produtosRemovidos += outrosIds.length;
  }

  console.log(
    `\n${APPLY ? "✅" : "◻"} etapa 1 — famílias legadas: ${produtosRemovidos} produtos absorvidos · ${variacoesCriadas} variações · ${vinculosMesclados} vínculos mesclados · ${tarefasMovidas} tarefas repontadas`,
  );

  console.log(`\n▶ Etapa 2 — legado × catálogo ativo (mesmo produto, duas entradas)`);
  const f = await fundirComCatalogoAtivo();
  console.log(
    `\n${APPLY ? "✅" : "◻"} etapa 2 — ${f.fundidos} duplicatas fundidas no catálogo ativo · ${f.tarefas} tarefas repontadas`,
  );
  const total = await prisma.product.count();
  console.log(`Total de produtos ${APPLY ? "agora" : "hoje"}: ${total}`);
  if (!APPLY) console.log("\n(dry-run — nada foi escrito. Rode com --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro na consolidação:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
