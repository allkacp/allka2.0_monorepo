// Semeia (idempotente) o catálogo GLOBAL de tipos de conexão e, opcionalmente, o perfil de IA padrão de QA (orientador de conexões).
// Nunca altera tipo já existente (preserva IDs e edições) e NUNCA vincula o perfil a produto algum.
// Uso: tsx scripts/seed-connection-catalog.ts [--with-ai-profile]
import { PrismaClient } from "@prisma/client";
import { ensureConnectionTypes } from "../src/lib/connections/catalog";
import { ensureConnectionAiProfile } from "../src/lib/connections/pending";

(async () => {
  const prisma = new PrismaClient();
  const created = await ensureConnectionTypes(prisma);
  const total = await prisma.connectionType.count();
  console.log(`Tipos de conexão: ${created} criado(s); total ${total}.`);
  if (process.argv.includes("--with-ai-profile")) {
    const p = await ensureConnectionAiProfile(prisma);
    console.log(`Perfil de IA de QA: ${p.id} (${p.name}) — sistema, exige revisão humana, sem vínculo com produto.`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
