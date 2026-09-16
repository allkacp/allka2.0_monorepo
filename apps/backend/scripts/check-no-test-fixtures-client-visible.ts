import { PrismaClient } from "@prisma/client";

// Item 11 (reunião 2026-09-14, "Consolidar a entrega"): achado real desta
// etapa — o catálogo do cliente mostrava a fixture local "[TESTE LOCAL]
// Serviço Demo do Catálogo" porque seu `status` tinha sido deixado num
// status client-visible (disponivel) durante teste manual. A filtragem em
// si está correta (status é o único portão de visibilidade — checkClientVisibility/
// CATALOG2_CLIENT_VISIBLE_STATUSES, coberto por testes de integração); o
// problema era um dado de ambiente, não lógica. Um produto sintético de
// teste automatizado usa o MESMO prefixo "[TESTE LOCAL]" de propósito (ver
// catalog2-catalog.integration.test.ts), então excluir esse prefixo no
// código quebraria a suíte — confirmado ao reverter essa tentativa.
//
// Este script é o guarda operacional correto: roda SÓ LEITURA contra
// qualquer banco (local, staging, produção) e falha (exit 1) se algum
// produto com esse prefixo estiver num status visível ao cliente. Deve
// rodar como passo do checklist de pré-publicação (nunca corrige nada
// sozinho — só denuncia).

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";
const CLIENT_VISIBLE_STATUSES = ["pre_lancamento", "disponivel", "temporariamente_inativo", "esgotado_temporariamente"];

async function main() {
  const prisma = new PrismaClient();
  try {
    const offenders = await prisma.catalog2Product.findMany({
      where: {
        internal_name: { startsWith: TEST_LOCAL_PREFIX },
        status: { in: CLIENT_VISIBLE_STATUSES },
      },
      select: { id: true, slug: true, internal_name: true, status: true },
    });
    if (offenders.length === 0) {
      console.log("OK — nenhuma fixture de teste ([TESTE LOCAL]) está num status visível ao cliente.");
      return;
    }
    console.error(`FALHOU — ${offenders.length} fixture(s) de teste em status visível ao cliente:`);
    for (const o of offenders) {
      console.error(`  - ${o.slug} (${o.internal_name}) — status: ${o.status}`);
    }
    console.error("Corrija o status (ex.: 'em_preparacao') antes de publicar/liberar tráfego.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
