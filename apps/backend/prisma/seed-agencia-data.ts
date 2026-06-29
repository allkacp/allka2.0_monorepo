/**
 * Seed: Dados reais para agencia@allka.test ("Lamego Teste Agency")
 * - Atualiza nome da agência no banco para "Lamego Teste Agency" (igual ao dev-mock)
 * - Upsert de 10 empresas-clientes reais
 * - Upsert de 10 projetos espelhando dev-mocks/data/projects.ts
 *
 * Execução:  cd apps/backend && npx tsx prisma/seed-agencia-data.ts
 * Idempotente: usa upsert com IDs fixos
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGENCY_NAME  = "Lamego Teste Agency";
const AGENCY_EMAIL = "agencia@allka.test";

const IDS = {
  clientCocaCola:  "seed-ag-client-coca-cola",
  clientStarbucks: "seed-ag-client-starbucks",
  clientGoogle:    "seed-ag-client-google",
  clientMagazine:  "seed-ag-client-magazine-luiza",
  clientNubank:    "seed-ag-client-nubank",
  clientNatura:    "seed-ag-client-natura",
  clientTesla:     "seed-ag-client-tesla",
  clientAmbev:     "seed-ag-client-ambev",
  clientIfood:     "seed-ag-client-ifood",
  clientEmbraer:   "seed-ag-client-embraer",
  proj01: "seed-ag-real-proj-01",
  proj02: "seed-ag-real-proj-02",
  proj03: "seed-ag-real-proj-03",
  proj04: "seed-ag-real-proj-04",
  proj05: "seed-ag-real-proj-05",
  proj06: "seed-ag-real-proj-06",
  proj07: "seed-ag-real-proj-07",
  proj08: "seed-ag-real-proj-08",
  proj09: "seed-ag-real-proj-09",
  proj10: "seed-ag-real-proj-10",
};

async function main() {
  console.log("🌱 Seed: Lamego Teste Agency — 10 clientes + 10 projetos reais\n");

  // 1. Encontrar user agencia@allka.test
  const user = await prisma.user.findUnique({
    where: { email: AGENCY_EMAIL },
    include: { agency: true },
  });
  if (!user || !user.agency) {
    console.error(`❌ User ${AGENCY_EMAIL} ou perfil de agência não encontrado.`);
    process.exit(1);
  }
  console.log(`  ✓ User    → ${user.email}`);
  console.log(`  ✓ Agency  → "${user.agency.name}" → atualizando para "${AGENCY_NAME}"...`);

  // 2. Atualizar nome da agência para bater com os mocks
  await prisma.agency.update({
    where: { id: user.agency.id },
    data:  { name: AGENCY_NAME },
  });
  console.log(`  ✓ Agency renomeada para "${AGENCY_NAME}"\n`);

  // 3. Upsert 10 clientes
  const clients = [
    { id: IDS.clientCocaCola,  name: "Coca-Cola Brasil",  cnpj: "45.997.418/0001-53", segment: "Bebidas"       },
    { id: IDS.clientStarbucks, name: "Starbucks Coffee",  cnpj: "08.883.874/0001-62", segment: "Alimentação"   },
    { id: IDS.clientGoogle,    name: "Google Brasil",     cnpj: "06.990.590/0001-23", segment: "Tecnologia"    },
    { id: IDS.clientMagazine,  name: "Magazine Luiza",    cnpj: "47.960.950/0001-21", segment: "Varejo"        },
    { id: IDS.clientNubank,    name: "Nubank",            cnpj: "18.236.120/0001-58", segment: "Fintech"       },
    { id: IDS.clientNatura,    name: "Natura Cosméticos", cnpj: "71.673.990/0001-77", segment: "Cosméticos"    },
    { id: IDS.clientTesla,     name: "Tesla Brasil",      cnpj: "33.456.789/0001-11", segment: "Mobilidade"    },
    { id: IDS.clientAmbev,     name: "Ambev S.A.",        cnpj: "02.808.708/0001-07", segment: "Bebidas"       },
    { id: IDS.clientIfood,     name: "iFood",             cnpj: "14.380.200/0001-21", segment: "Tecnologia"    },
    { id: IDS.clientEmbraer,   name: "Embraer",           cnpj: "07.689.002/0001-89", segment: "Aeronáutica"   },
  ];

  for (const c of clients) {
    await prisma.company.upsert({
      where:  { id: c.id },
      update: { name: c.name },
      create: { id: c.id, name: c.name, cnpj: c.cnpj, segment: c.segment, status: "ativo" },
    });
    console.log(`  ✓ Cliente → ${c.name}`);
  }
  console.log();

  // 4. Upsert 10 projetos (espelho fiel de dev-mocks/data/projects.ts)
  const projects = [
    { id: IDS.proj01, title: "Rebranding Institucional",    client_id: IDS.clientCocaCola,  type: "Branding",        status: "completed",       progress: 100, budget: 45000, value: 45000, start_date: new Date("2025-09-01"), end_date: new Date("2026-01-15"), created_at: new Date("2025-08-20T10:00:00Z") },
    { id: IDS.proj02, title: "Social Media Mensal",          client_id: IDS.clientStarbucks, type: "Social Media",    status: "in-progress",     progress: 60,  budget: 8000,  value: 8000,  start_date: new Date("2026-01-01"), end_date: new Date("2026-12-31"), created_at: new Date("2025-12-15T09:00:00Z") },
    { id: IDS.proj03, title: "Landing Page Produto X",       client_id: IDS.clientGoogle,    type: "Web Design",      status: "planning",        progress: 15,  budget: 12000, value: 12000, start_date: new Date("2026-04-20"), end_date: new Date("2026-06-20"), created_at: new Date("2026-04-01T08:00:00Z") },
    { id: IDS.proj04, title: "Campanha Black Friday 2026",   client_id: IDS.clientMagazine,  type: "Campanha",        status: "draft",           progress: 0,   budget: 65000, value: 65000, start_date: new Date("2026-08-01"), end_date: new Date("2026-11-30"), created_at: new Date("2026-03-25T14:00:00Z") },
    { id: IDS.proj05, title: "Vídeo Institucional",          client_id: IDS.clientNubank,    type: "Vídeo",           status: "in-progress",     progress: 40,  budget: 28000, value: 28000, start_date: new Date("2026-03-01"), end_date: new Date("2026-05-15"), created_at: new Date("2026-02-15T10:00:00Z") },
    { id: IDS.proj06, title: "E-mail Marketing Mensal",      client_id: IDS.clientNatura,    type: "E-mail Marketing",status: "in-progress",     progress: 75,  budget: 5000,  value: 5000,  start_date: new Date("2026-01-01"), end_date: new Date("2026-12-31"), created_at: new Date("2025-12-20T11:00:00Z") },
    { id: IDS.proj07, title: "App de Fidelidade",            client_id: IDS.clientTesla,     type: "UX/UI",           status: "awaiting-payment",progress: 0,   budget: 35000, value: 35000, start_date: new Date("2026-05-01"), end_date: new Date("2026-08-30"), created_at: new Date("2026-04-05T09:00:00Z") },
    { id: IDS.proj08, title: "Content Marketing Mensal",     client_id: IDS.clientAmbev,     type: "Content",         status: "in-progress",     progress: 50,  budget: 6500,  value: 6500,  start_date: new Date("2026-02-01"), end_date: new Date("2026-12-31"), created_at: new Date("2026-01-20T14:00:00Z") },
    { id: IDS.proj09, title: "Redesign Portal Interno",      client_id: IDS.clientIfood,     type: "Web Design",      status: "paused",          progress: 30,  budget: 52000, value: 52000, start_date: new Date("2026-01-15"), end_date: new Date("2026-07-15"), created_at: new Date("2025-12-28T10:00:00Z") },
    { id: IDS.proj10, title: "Identidade Visual Corporativa",client_id: IDS.clientEmbraer,   type: "Branding",        status: "in-progress",     progress: 65,  budget: 38000, value: 38000, start_date: new Date("2026-02-15"), end_date: new Date("2026-06-30"), created_at: new Date("2026-02-01T08:00:00Z") },
  ];

  for (const p of projects) {
    const { created_at, ...rest } = p;
    await prisma.project.upsert({
      where:  { id: p.id },
      update: { title: p.title, status: p.status, progress: p.progress, agency: AGENCY_NAME },
      create: { ...rest, agency: AGENCY_NAME, company_type: "company", lifecycle: "avulso", created_at },
    });
    console.log(`  ✓ Projeto [${p.status.padEnd(17)}] → ${p.title}`);
  }

  const total = await prisma.project.count({ where: { agency: AGENCY_NAME } });
  console.log(`\n✅ Agência "${AGENCY_NAME}" tem ${total} projeto(s) no banco.`);
  console.log(`\n💡 Para testar agency com dados reais localmente (sem mocks):`);
  console.log(`   No console do browser: localStorage.setItem("allka_use_real_api", "true"); location.reload();`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
