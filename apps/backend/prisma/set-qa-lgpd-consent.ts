import { PrismaClient } from "@prisma/client";

// Idempotente. Ajusta o consentimento LGPD (term_acceptances) dos 12
// usuários QA fixos, sem tocar em Project/Client/ClientLink/Task/Payment/
// Wallet nem em qualquer outro dado do usuário. Fonte de verdade real:
// TermAcceptance ligado a um Term atualmente ativo (mesmo campo lido por
// GET /api/admin/users em has_lgpd_consent).
//
// Regra de "termos relevantes" por usuário:
//  - acceptance_level "usuario": aplica a todo mundo (termos gerais).
//  - acceptance_level "empresa": aplica só a account_type === "empresas".
//  - acceptance_level "nomade": aplica só a account_type === "nomades".
//
// Consentido = TermAcceptance criado para cada termo ativo relevante.
// Não consentido = nenhum TermAcceptance (de nenhum termo) para o usuário.

const prisma = new PrismaClient();

const CONSENTED_EMAILS = [
  "admin@allka.test",
  "agencia@allka.test",
  "company@allka.test",
  "partner@allka.test",
  "leader@allka.test",
  "nomad@allka.test",
];

const NOT_CONSENTED_EMAILS = [
  "agencia2@allka.test",
  "agencia3@allka.test",
  "company2@allka.test",
  "company3@allka.test",
  "partner2@allka.test",
  "partner3@allka.test",
];

function isTermRelevant(termLevel: string, accountType: string): boolean {
  if (termLevel === "usuario") return true;
  if (termLevel === "empresa") return accountType === "empresas";
  if (termLevel === "nomade") return accountType === "nomades";
  // Nível desconhecido: trata como geral, pra não deixar usuário "quase
  // consentido" por causa de um termo com level fora do padrão conhecido.
  return true;
}

async function main() {
  const activeTerms = await prisma.term.findMany({
    where: { is_active: true },
    select: { id: true, title: true, acceptance_level: true },
  });

  if (activeTerms.length === 0) {
    console.log("Nenhum Term ativo encontrado — nada para consentir. Abortando.");
    return;
  }

  console.log(`Termos ativos encontrados: ${activeTerms.length}`);
  for (const t of activeTerms) {
    console.log(`  - [${t.acceptance_level}] ${t.title} (${t.id})`);
  }
  console.log("");

  const allEmails = [...CONSENTED_EMAILS, ...NOT_CONSENTED_EMAILS];
  const users = await prisma.user.findMany({
    where: { email: { in: allEmails } },
    select: { id: true, email: true, account_type: true },
  });
  const byEmail = new Map(users.map((u) => [u.email, u]));

  const missing = allEmails.filter((e) => !byEmail.has(e));

  const consentedResults: string[] = [];
  const notConsentedResults: string[] = [];

  for (const email of CONSENTED_EMAILS) {
    const user = byEmail.get(email);
    if (!user) continue;

    const relevantTerms = activeTerms.filter((t) => isTermRelevant(t.acceptance_level, user.account_type));

    let createdCount = 0;
    for (const term of relevantTerms) {
      const existing = await prisma.termAcceptance.findUnique({
        where: { term_id_user_id: { term_id: term.id, user_id: user.id } },
      });
      if (!existing) {
        await prisma.termAcceptance.create({
          data: { term_id: term.id, user_id: user.id, ip_address: "127.0.0.1" },
        });
        createdCount++;
      }
    }
    consentedResults.push(
      `${email} — ${relevantTerms.length} termo(s) relevante(s), ${createdCount} aceite(s) criado(s) agora`,
    );
  }

  for (const email of NOT_CONSENTED_EMAILS) {
    const user = byEmail.get(email);
    if (!user) continue;

    const existing = await prisma.termAcceptance.findMany({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (existing.length > 0) {
      await prisma.termAcceptance.deleteMany({ where: { user_id: user.id } });
    }
    notConsentedResults.push(`${email} — ${existing.length} aceite(s) removido(s)`);
  }

  console.log("=== Consentidos (LGPD registrado) ===");
  consentedResults.forEach((line) => console.log(`  ${line}`));
  console.log("");
  console.log("=== Não consentidos (LGPD pendente) ===");
  notConsentedResults.forEach((line) => console.log(`  ${line}`));
  console.log("");
  console.log(`Total consentidos: ${consentedResults.length}/${CONSENTED_EMAILS.length}`);
  console.log(`Total não consentidos: ${notConsentedResults.length}/${NOT_CONSENTED_EMAILS.length}`);
  if (missing.length > 0) {
    console.log("");
    console.log(`ATENÇÃO — usuários não encontrados (${missing.length}):`);
    missing.forEach((e) => console.log(`  ${e}`));
  } else {
    console.log("Nenhum usuário faltando — todos os 12 emails QA encontrados.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
