/**
 * Cria uma relação real de empresa atendida por nômade (hoje não existia
 * nenhuma), pra que o tipo "nomade" na tabela de empresas reflita um dado
 * de verdade, não um valor forçado sem lastro.
 *
 * TechCorp Brasil não tinha nenhum projeto. Criamos um projeto real para
 * ela com a nômade Ana Ferreira (usuária já existente no sistema)
 * atribuída via o campo `nomades`, e marcamos a empresa como type="nomade".
 *
 * Execução: npx tsx prisma/fix-company-nomad-type.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = "cmolwvvjx001jty7wekdqbemo"; // TechCorp Brasil
const NOMAD_USER_ID = "cmolwvvbu000cty7woilx0xkl"; // Ana Ferreira (ana@nomad.com)
const PROJECT_ID = "seed-nomad-proj-techcorp-01";

async function main() {
  const company = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  if (!company) throw new Error("TechCorp Brasil não encontrada");

  const nomad = await prisma.user.findUnique({ where: { id: NOMAD_USER_ID } });
  if (!nomad) throw new Error("Nômade Ana Ferreira não encontrada");

  await prisma.project.upsert({
    where: { id: PROJECT_ID },
    update: {},
    create: {
      id: PROJECT_ID,
      title: "Landing Page de Produto",
      description: "Criação de landing page para lançamento de novo produto, executada por especialista nômade independente.",
      client_id: company.id,
      status: "in-progress",
      lifecycle: "avulso",
      type: "Desenvolvimento Web",
      value: 6500,
      budget: 6500,
      progress: 40,
      company_type: "nomad",
      consultant: nomad.name,
      consultant_email: nomad.email,
      team_size: 1,
      nomades: JSON.stringify([nomad.id]),
      start_date: new Date("2026-06-01"),
      end_date: new Date("2026-07-31"),
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: { type: "nomade" },
  });

  console.log(`✅ Projeto "Landing Page de Produto" criado para ${company.name}, atendida pela nômade ${nomad.name}.`);
  console.log(`✅ ${company.name} classificada como type="nomade".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
