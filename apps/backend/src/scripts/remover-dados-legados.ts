/**
 * remover-dados-legados.ts — Desfaz o que foi importado da plataforma antiga,
 * sem deixar registro órfão nem quebrar dado nativo.
 *
 * Dois escopos independentes:
 *
 *   --arquivo    Apaga só o ARQUIVO HISTÓRICO (tabela legacy_records: o
 *                financeiro e o que mais for arquivado ali). É a operação
 *                segura: essa tabela não tem FK em nenhuma direção, então nada
 *                mais no banco depende dela.
 *
 *   --operacao   Apaga o que virou registro OPERACIONAL (tudo com legacy_id:
 *                tarefas, projetos, produtos importados, clientes, nômades,
 *                agências, usuários). Respeita a ordem de dependência e
 *                preserva o que é nativo da plataforma.
 *
 * Cuidados embutidos:
 *   - Conta nativa nunca é tocada: o filtro é sempre `legacy_id != null`, e a
 *     importação deixou de gravar legacy_id em conta nativa justamente por isso.
 *   - Um projeto/produto importado que já tenha recebido dado NOVO (pagamento,
 *     fatura) é preservado e reportado, em vez de arrastar o dado novo junto.
 *   - As três empresas convertidas de agência (Sebrae/Brivia/Able) contam como
 *     operacional e saem com --operacao.
 *
 * Dry-run por padrão — sempre mostra o que sairia antes de sair.
 *   npx tsx src/scripts/remover-dados-legados.ts --arquivo [--apply]
 *   npx tsx src/scripts/remover-dados-legados.ts --operacao [--apply]
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const ARQUIVO = process.argv.includes("--arquivo");
const OPERACAO = process.argv.includes("--operacao");

async function removerArquivo() {
  const total = await prisma.legacyRecord.count();
  const porOrigem = await prisma.legacyRecord.groupBy({ by: ["origem"], _count: true });
  console.log(`\n■ Arquivo histórico (legacy_records): ${total} registros`);
  for (const o of porOrigem) console.log(`    ${o.origem}: ${o._count}`);
  console.log("    nenhuma outra tabela depende destes registros — remoção é isolada.");

  if (APPLY) {
    const r = await prisma.legacyRecord.deleteMany({});
    console.log(`    ✅ ${r.count} registros removidos`);
  }
}

async function removerOperacao() {
  console.log("\n■ Registros operacionais importados (legacy_id preenchido)");

  // Projetos que já receberam dado novo depois da importação ficam de fora —
  // arrastá-los levaria junto pagamento/fatura que não veio do legado.
  const projetosComDadoNovo = await prisma.project.findMany({
    where: {
      legacy_id: { not: null },
      OR: [{ payments: { some: {} } }, { invoices: { some: {} } }],
    },
    select: { id: true, project_code: true, title: true },
  });
  const preservar = new Set(projetosComDadoNovo.map((p) => p.id));
  if (preservar.size) {
    console.log(`    ⚠ ${preservar.size} projetos preservados por terem pagamento/fatura novos:`);
    projetosComDadoNovo.slice(0, 5).forEach((p) => console.log(`        ${p.project_code} ${p.title}`));
  }

  const tarefas = await prisma.projectTask.findMany({
    where: { legacy_id: { not: null }, project_id: { notIn: [...preservar] } },
    select: { id: true },
  });
  const tarefaIds = tarefas.map((t) => t.id);

  const contagens = {
    "respostas de briefing": await prisma.taskBriefingAnswer.count({
      where: { project_task_id: { in: tarefaIds } },
    }),
    "etapas de tarefa": await prisma.projectTaskStage.count({
      where: { project_task_id: { in: tarefaIds } },
    }),
    tarefas: tarefaIds.length,
    "produtos de projeto": await prisma.projectProduct.count({
      where: { project: { legacy_id: { not: null }, id: { notIn: [...preservar] } } },
    }),
    projetos: await prisma.project.count({
      where: { legacy_id: { not: null }, id: { notIn: [...preservar] } },
    }),
    "modelos de tarefa": await prisma.catalogTask.count({ where: { legacy_id: { not: null } } }),
    "produtos importados": await prisma.product.count({ where: { legacy_id: { not: null } } }),
    "vínculos de cliente": await prisma.clientLink.count({
      where: { client: { legacy_id: { not: null } } },
    }),
    clientes: await prisma.client.count({ where: { legacy_id: { not: null } } }),
    nômades: await prisma.nomade.count({ where: { legacy_id: { not: null } } }),
    agências: await prisma.agency.count({ where: { legacy_id: { not: null } } }),
    "empresas convertidas": await prisma.company.count({ where: { legacy_id: { not: null } } }),
    usuários: await prisma.user.count({ where: { legacy_id: { not: null } } }),
  };
  for (const [nome, qtd] of Object.entries(contagens)) {
    console.log(`    ${nome.padEnd(24)} ${String(qtd).padStart(6)}`);
  }

  if (!APPLY) return;

  // Ordem: do mais dependente para o menos, para nenhuma FK reclamar.
  await prisma.taskBriefingAnswer.deleteMany({ where: { project_task_id: { in: tarefaIds } } });
  await prisma.projectTaskStage.deleteMany({ where: { project_task_id: { in: tarefaIds } } });
  await prisma.taskAttachment.deleteMany({ where: { project_task_id: { in: tarefaIds } } });
  await prisma.projectTask.deleteMany({ where: { id: { in: tarefaIds } } });

  await prisma.projectProduct.deleteMany({
    where: { project: { legacy_id: { not: null }, id: { notIn: [...preservar] } } },
  });
  await prisma.project.deleteMany({
    where: { legacy_id: { not: null }, id: { notIn: [...preservar] } },
  });

  await prisma.productCatalogTask.deleteMany({
    where: { catalog_task: { legacy_id: { not: null } } },
  });
  await prisma.catalogTask.deleteMany({ where: { legacy_id: { not: null } } });

  await prisma.productVariation.deleteMany({ where: { product: { legacy_id: { not: null } } } });
  await prisma.product.deleteMany({ where: { legacy_id: { not: null } } });

  await prisma.clientLink.deleteMany({ where: { client: { legacy_id: { not: null } } } });
  await prisma.client.deleteMany({ where: { legacy_id: { not: null } } });
  await prisma.nomade.deleteMany({ where: { legacy_id: { not: null } } });

  // Usuário sai por último: agência e empresa apontam para ele como dono.
  await prisma.agency.deleteMany({ where: { legacy_id: { not: null } } });
  await prisma.company.deleteMany({ where: { legacy_id: { not: null } } });
  await prisma.liderArea.deleteMany({ where: { user: { legacy_id: { not: null } } } });
  await prisma.user.deleteMany({ where: { legacy_id: { not: null } } });

  console.log("    ✅ removidos");
}

async function main() {
  if (!ARQUIVO && !OPERACAO) {
    console.log(
      "Escolha o escopo:\n" +
        "  --arquivo    só o histórico isolado (legacy_records: financeiro etc.)\n" +
        "  --operacao   os registros importados que viraram dado da plataforma\n" +
        "Acrescente --apply para executar (sem ele é só simulação).",
    );
    return;
  }

  console.log(`▶ Remoção de dados legados — ${APPLY ? "APPLY" : "SIMULAÇÃO"}`);
  if (ARQUIVO) await removerArquivo();
  if (OPERACAO) await removerOperacao();

  if (!APPLY) console.log("\n(simulação — nada foi apagado. Acrescente --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
