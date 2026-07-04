import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Empresas de demonstração criadas pelos seeds sem email/telefone.
// Dados de contato coerentes (domínio + telefone comercial plausível),
// para deixar de exibir campos vazios na UI. Não afeta contas de teste QA.
const FIXES: Record<string, { email: string; phone: string }> = {
  "seed-ag-client-ambev":          { email: "contato@ambev.com.br",           phone: "(11) 2122-1200" },
  "seed-ag-client-coca-cola":      { email: "contato@cocacola.com.br",        phone: "(11) 2107-8000" },
  "seed-ag-client-embraer":        { email: "contato@embraer.com.br",         phone: "(12) 3927-1000" },
  "seed-ag-client-google":         { email: "contato@google.com.br",          phone: "(11) 2395-3400" },
  "seed-ag-client-ifood":          { email: "contato@ifood.com.br",           phone: "(11) 3230-3200" },
  "seed-ag-client-magazine-luiza": { email: "contato@magazineluiza.com.br",   phone: "(11) 3504-2500" },
  "seed-ag-client-natura":         { email: "contato@natura.net",             phone: "(11) 4796-8000" },
  "seed-ag-client-nubank":         { email: "contato@nubank.com.br",          phone: "(11) 4020-2440" },
  "seed-ag-client-starbucks":      { email: "contato@starbucks.com.br",       phone: "(11) 3956-4000" },
  "seed-ag-client-tesla":          { email: "contato@tesla.com.br",           phone: "(11) 4000-2020" },
  "seed-company-lider-01":         { email: "contato@seedperformance.com.br", phone: "(11) 3555-7788" },
  "seed-partner-company-A":        { email: "contato@alpha.com.br",           phone: "(11) 97777-7777" },
  "seed-partner-company-B":        { email: "contato@beta.com.br",            phone: "(11) 98888-8888" },
  "seed-partner-company-C":        { email: "contato@gamma.com.br",           phone: "(11) 99999-9999" },
};

async function main() {
  console.log("🔧 Corrigindo email/telefone de empresas demo sem contato...\n");
  let updated = 0;
  for (const [id, data] of Object.entries(FIXES)) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      console.log(`  ⚠ ${id} não encontrada, pulando`);
      continue;
    }
    if (company.email && company.phone) {
      console.log(`  ↷ ${company.name} já tem contato, pulando`);
      continue;
    }
    await prisma.company.update({
      where: { id },
      data: {
        email: company.email ?? data.email,
        phone: company.phone ?? data.phone,
      },
    });
    console.log(`  ✓ ${company.name} → ${data.email} / ${data.phone}`);
    updated++;
  }
  console.log(`\n✅ ${updated} empresa(s) atualizada(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
