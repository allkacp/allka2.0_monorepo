/**
 * backfill-config-etapas.ts — Preenche a configuração do motor nas etapas que
 * nasceram sem ela.
 *
 * As etapas das tarefas importadas vieram do `task_stage` da plataforma antiga
 * (título, ordem, status) e não do modelo, então chegaram sem executor, prazo,
 * valor nem continuidade de nômade. Sem isso o motor trata todas como "nômade
 * comum" e a continuidade entre etapas se perde.
 *
 * A configuração é buscada no CatalogTask da própria tarefa, casando pela
 * POSIÇÃO da etapa (o título do legado nem sempre bate com o do modelo).
 * Quando a contagem de etapas não bate, o registro é deixado como está —
 * preencher com a etapa errada seria pior que não preencher.
 *
 * Só toca em etapa NÃO concluída: histórico fica como foi executado.
 *
 *   npx tsx src/scripts/backfill-config-etapas.ts [--apply] [--todas]
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
// Por padrão só etapas em aberto; --todas inclui as já concluídas.
const TODAS = process.argv.includes("--todas");

async function main() {
  console.log(`▶ Backfill da configuração de etapas — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const tarefas = await prisma.projectTask.findMany({
    where: {
      catalog_task: { steps: { not: null } },
      stages: TODAS ? { some: {} } : { some: { status: { not: "CONCLUIDA" } } },
    },
    select: {
      id: true,
      task_code: true,
      catalog_task: { select: { steps: true, category: true } },
      stages: {
        orderBy: [{ ordem: "asc" }, { created_at: "asc" }],
        // titulo é usado no casamento por título quando a contagem difere.
        select: { id: true, status: true, titulo: true },
      },
    },
  });

  let tarefasOk = 0;
  let etapasAtualizadas = 0;
  let incompatíveis = 0;

  for (const t of tarefas) {
    let passos: any[] = [];
    try {
      passos = JSON.parse(t.catalog_task!.steps || "[]");
    } catch {
      continue;
    }
    if (passos.length === 0) continue;

    // Casamento etapa ↔ passo do modelo:
    //   - contagem igual: posição a posição;
    //   - contagem diferente: por TÍTULO, avançando um cursor no modelo. As
    //     tarefas antigas costumam ser um prefixo do modelo (o modelo ganhou
    //     etapas depois), e nesse caso o título bate um a um. O cursor evita
    //     casar duas vezes com o mesmo passo quando o modelo repete títulos.
    const normalizar = (s: string) =>
      String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    let correspondencia: Array<any | null>;
    if (passos.length === t.stages.length) {
      correspondencia = t.stages.map((_, i) => passos[i]);
    } else {
      let cursor = 0;
      correspondencia = t.stages.map((etapa) => {
        const alvo = normalizar(etapa.titulo);
        for (let j = cursor; j < passos.length; j++) {
          if (normalizar(passos[j].name ?? passos[j].title) === alvo) {
            cursor = j + 1;
            return passos[j];
          }
        }
        return null;
      });
      // Nenhum título casou: não há base pra preencher, deixa como está.
      if (correspondencia.every((c) => c === null)) {
        incompatíveis++;
        continue;
      }
    }

    for (let i = 0; i < t.stages.length; i++) {
      const etapa = t.stages[i];
      if (!TODAS && etapa.status === "CONCLUIDA") continue;
      const p = correspondencia[i];
      if (!p) continue; // etapa sem par no modelo: preservada como está

      if (APPLY) {
        await prisma.projectTaskStage.update({
          where: { id: etapa.id },
          data: {
            executor_type:
              p.executorType === "leader" || p.executorType === "internal" ? p.executorType : "nomad",
            categoria: p.categoryName ?? t.catalog_task!.category ?? null,
            manter_mesmo_nomade: Boolean(p.keepSameNomad),
            horas_execucao: p.executionHours ?? null,
            valor_nomade: p.nomadAmount ?? null,
            oculta_no_prazo: Boolean(p.hideOnProductDeadline),
            conta_no_prazo: p.countsForProductDeadline !== false,
            exige_anexo: Boolean(p.requiresConclusionAttachment),
            config_snapshot: JSON.stringify(p),
          },
        });
      }
      etapasAtualizadas++;
    }
    tarefasOk++;
  }

  console.log(`tarefas com modelo configurado: ${tarefas.length}`);
  console.log(`  aproveitadas: ${tarefasOk} · ${etapasAtualizadas} etapas ${APPLY ? "atualizadas" : "a atualizar"}`);
  console.log(`  puladas por número de etapas diferente do modelo: ${incompatíveis}`);

  if (APPLY) {
    const comExecutorEspecial = await prisma.projectTaskStage.count({
      where: { executor_type: { not: "nomad" } },
    });
    const comContinuidade = await prisma.projectTaskStage.count({
      where: { manter_mesmo_nomade: true },
    });
    console.log(
      `\netapas com executor não-nômade: ${comExecutorEspecial} · com continuidade de nômade: ${comContinuidade}`,
    );
  } else {
    console.log("\n(dry-run — nada foi escrito. Rode com --apply.)");
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
