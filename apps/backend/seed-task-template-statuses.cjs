// Idempotent seed: garante variação de status nos modelos de tarefas
// para a tela "Modelos de Tarefas" exibir badges de Ativo / Inativo / Em revisão.
// Reexecutável sem efeitos colaterais — sempre alinha o status ao mapping fixo.

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const TARGET = {
  // Em revisão (modelos passando por refinamento ou validação)
  em_revisao: ["PA0002-T04", "PA0005-T01", "DC0006-T01", "PA0003-T03"],
  // Inativos (descontinuados ou pausados)
  inativa: ["PA0004-T03", "DC0005-T02"],
  // Demais permanecem 'ativa' (default)
};

(async () => {
  let touched = 0;
  for (const [status, codes] of Object.entries(TARGET)) {
    for (const code of codes) {
      const r = await p.catalogTask.updateMany({
        where: { code },
        data: { status, is_active: status === "ativa" },
      });
      if (r.count > 0) touched += r.count;
    }
  }

  // Reabilita os ainda não cobertos como "ativa" (idempotente)
  const allTargeted = [...TARGET.em_revisao, ...TARGET.inativa];
  await p.catalogTask.updateMany({
    where: { code: { notIn: allTargeted } },
    data: { status: "ativa", is_active: true },
  });

  const groups = await p.catalogTask.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  console.log("✅ Modelos de tarefas — distribuição de status:");
  groups.forEach((g) => console.log(`   ${g.status}: ${g._count.status}`));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
