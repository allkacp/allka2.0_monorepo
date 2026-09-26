/**
 * setup-test-accounts.ts — cria/ajusta as contas de teste manual pedidas
 * pelo usuário na sessão de auditoria do fluxo principal (2026-09-25):
 * renomeia empresa@allka.com.vc -> company@allka.com.vc e
 * agencia@allka.com.vc -> agency@allka.com.vc, cria partner@allka.com.vc
 * como uma Agency de verdade com PartnerProfile ativo (é assim que o
 * backend real reconhece "é parceiro" — ver resolveMyPartnerId em
 * src/lib/project-scope.ts — nunca pelo account_type "parceiro" órfão que
 * existe no seed original), e cria/vincula uma Company real pra
 * company@allka.com.vc e uma Agency real pra agency@allka.com.vc — sem
 * isso, o header/dashboard ficava preso em "Carregando..." pra sempre
 * (empresa-context.tsx nunca achava nenhuma Company pertencente ao
 * usuário — achado do usuário 2026-09-25).
 *
 * Idempotente — pode rodar de novo sem duplicar nada.
 *
 *   npx tsx src/scripts/setup-test-accounts.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { createProjectWithSequentialCode } from "../lib/create-project";

const prisma = new PrismaClient();

async function renameEmail(fromEmail: string, toEmail: string) {
  const existing = await prisma.user.findUnique({ where: { email: toEmail } });
  if (existing) {
    console.log(`Já renomeado: ${toEmail}`);
    return existing;
  }
  const updated = await prisma.user.update({ where: { email: fromEmail }, data: { email: toEmail } });
  console.log("Renomeado:", updated.email);
  return updated;
}

async function main() {
  const { host, database } = assertLocalDatabase(process.env.DATABASE_URL);
  console.log(`Banco confirmado: host="${host}" database="${database}"`);

  const password = process.env.SEED_TEST_USER_PASSWORD || "123456";
  const hash = await bcrypt.hash(password, 10);

  const company = await renameEmail("empresa@allka.com.vc", "company@allka.com.vc");
  const agency = await renameEmail("agencia@allka.com.vc", "agency@allka.com.vc");

  // ── Company real vinculada, pra empresa-context.tsx achar algo ──────────
  // Nome com prefixo "[TESTE]" — mesma convenção já usada pelos produtos
  // fixture ("[TESTE LOCAL]") — achado do usuário 2026-09-23: sem uma marca
  // clara, essas contas somem no meio da lista de empresas/agências reais
  // importadas do Legacy na busca do checkout admin, e é fácil confundir
  // teste com dado real. A limpeza de verdade da base (mover tudo real pro
  // Legacy) é um projeto grande à parte, ainda não autorizado — ver
  // [[legacy-cutover-progress]]; isto aqui só marca claramente o que É
  // teste, sem tocar em nenhum dado real existente.
  const companyRow = await prisma.company.upsert({
    where: { owner_user_id: company.id },
    update: { name: "[TESTE] Empresa Dev" },
    create: {
      owner_user_id: company.id,
      name: "[TESTE] Empresa Dev",
      type: "empresa",
      status: "ativo",
      email: company.email,
    },
  });
  console.log("Company:", companyRow.name, companyRow.id);
  // User.company_id (vínculo de MEMBRO) é a fonte de verdade real usada por
  // project-scope.ts pra resolver escopo/visibilidade de projeto — nunca só
  // owner_user_id/owned_company (isso é OWNERSHIP, um conceito diferente,
  // ver comentário em project-scope.ts:11-17). Sem isto, todo endpoint que
  // usa resolveProjectNewScope (confirmação de pagamento, visibilidade de
  // projeto) recusava com 403 mesmo a Company sendo dona de verdade —
  // achado do usuário 2026-09-23, checkout travava em "Acesso negado".
  await prisma.user.update({ where: { id: company.id }, data: { company_id: companyRow.id } });

  // ── Agency real vinculada ────────────────────────────────────────────────
  const agencyRow = await prisma.agency.upsert({
    where: { owner_user_id: agency.id },
    update: { name: "[TESTE] Agência Dev" },
    create: {
      owner_user_id: agency.id,
      name: "[TESTE] Agência Dev",
      status: "ativo",
      partner_level: "bronze",
    },
  });
  console.log("Agency:", agencyRow.name, agencyRow.id);
  await prisma.user.update({ where: { id: agency.id }, data: { agency_id: agencyRow.id } });

  const partnerUser = await prisma.user.upsert({
    where: { email: "partner@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "partner@allka.com.vc",
      password_hash: hash,
      name: "[TESTE] Agência Parceira Dev",
      role: "agency_admin",
      account_type: "agencias",
      is_active: true,
    },
  });
  console.log("Criado/atualizado:", partnerUser.email);

  const partnerAgency = await prisma.agency.upsert({
    where: { owner_user_id: partnerUser.id },
    update: { name: "[TESTE] Agência Parceira Dev" },
    create: {
      owner_user_id: partnerUser.id,
      name: "[TESTE] Agência Parceira Dev",
      status: "ativo",
      partner_level: "gold",
    },
  });
  console.log("Agência:", partnerAgency.name, partnerAgency.id);
  await prisma.user.update({ where: { id: partnerUser.id }, data: { agency_id: partnerAgency.id } });

  const partnerProfile = await prisma.partnerProfile.upsert({
    where: { agency_id: partnerAgency.id },
    update: { status: "active" },
    create: {
      agency_id: partnerAgency.id,
      status: "active",
      balance: 0,
    },
  });
  console.log("PartnerProfile:", partnerProfile.id, partnerProfile.status);

  // ── 2ª empresa de teste — achado do usuário 2026-09-23: precisa de PELO
  // MENOS 2 clientes fake pra testar contratação/checkout admin jogando pra
  // "mais de um cliente" (não só um). Mesmo padrão da primeira: User +
  // Company real vinculados por company_id (membro), nunca só owner_user_id.
  const company2 = await prisma.user.upsert({
    where: { email: "company2@allka.com.vc" },
    update: { password_hash: hash, is_active: true },
    create: {
      email: "company2@allka.com.vc",
      password_hash: hash,
      name: "Company 2 (teste)",
      role: "company_admin",
      account_type: "empresas",
      is_active: true,
    },
  });
  const company2Row = await prisma.company.upsert({
    where: { owner_user_id: company2.id },
    update: { name: "[TESTE] Empresa Dev 2" },
    create: {
      owner_user_id: company2.id,
      name: "[TESTE] Empresa Dev 2",
      type: "empresa",
      status: "ativo",
      email: company2.email,
    },
  });
  await prisma.user.update({ where: { id: company2.id }, data: { company_id: company2Row.id } });
  console.log("Company 2:", company2Row.name, company2Row.id);

  // ── Projetos fake pré-existentes — achado do usuário 2026-09-23: pra
  // testar o checkout admin "anexar a projeto já existente" (não só "criar
  // novo"), precisa já ter um projeto fake esperando em cada cliente fake.
  // Draft, sem produto — idempotente por título+dono (nunca duplica ao
  // rodar de novo).
  async function ensureFakeProject(companyId: string, creatorUserId: string, title: string) {
    const existing = await prisma.project.findFirst({ where: { company_id: companyId, title } });
    if (existing) {
      console.log("Projeto fake já existe:", existing.title, existing.project_code);
      return existing;
    }
    const created = await createProjectWithSequentialCode(prisma, {
      title,
      status: "draft",
      lifecycle: "avulso",
      company_id: companyId,
      created_by_user_id: creatorUserId,
    });
    console.log("Projeto fake criado:", created.title, created.project_code);
    return created;
  }
  await ensureFakeProject(companyRow.id, company.id, "[TESTE] Projeto Fake 1");
  await ensureFakeProject(company2Row.id, company2.id, "[TESTE] Projeto Fake 2");

  console.log("\nContas de teste prontas:");
  console.log("  Company:  company@allka.com.vc /", password);
  console.log("  Company2: company2@allka.com.vc /", password);
  console.log("  Agency:   agency@allka.com.vc /", password);
  console.log("  Partner:  partner@allka.com.vc /", password);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
