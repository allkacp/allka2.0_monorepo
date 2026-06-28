/**
 * Seed: Dados reais para a agência agencia@allka.test
 * Cria: Agency profile, 5 clientes (Companies), 510 Projetos com todos os statuses
 *
 * Execução:  cd apps/backend && npx tsx prisma/seed-agencia-data.ts
 * Idempotente: usa upsert com IDs fixos — pode ser re-executado sem duplicar dados
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Configuração ──────────────────────────────────────────────────────────────
const AGENCY_EMAIL = "agencia@allka.test";

const IDS = {
  agency: "seed-ag-test-profile-01",
  clients: [
    "seed-ag-client-01",
    "seed-ag-client-02",
    "seed-ag-client-03",
    "seed-ag-client-04",
    "seed-ag-client-05",
  ],
};

// 510 projetos distribuídos entre 9 statuses
const STATUS_COUNTS: Record<string, number> = {
  "draft":            45,
  "negotiation":      40,
  "pending-approval": 30,
  "awaiting-payment": 35,
  "planning":         60,
  "in-progress":     125,
  "paused":           25,
  "completed":       130,
  "cancelled":        20,
};
// Total: 510

const CLIENTS_DATA = [
  {
    id:      IDS.clients[0],
    name:    "TechNova Solutions",
    cnpj:    "11.222.333/0001-01",
    email:   "contato@technova.com.br",
    phone:   "(11) 3000-1001",
    segment: "Tecnologia",
    website: "https://www.technova.com.br",
    address: "Av. Brigadeiro Faria Lima, 3000 — São Paulo, SP",
  },
  {
    id:      IDS.clients[1],
    name:    "Grupo Meridian",
    cnpj:    "22.333.444/0001-02",
    email:   "ti@grupomeridian.com.br",
    phone:   "(21) 3100-2002",
    segment: "Consultoria",
    website: "https://www.grupomeridian.com.br",
    address: "Rua da Assembleia, 100 — Rio de Janeiro, RJ",
  },
  {
    id:      IDS.clients[2],
    name:    "iStart Digital",
    cnpj:    "33.444.555/0001-03",
    email:   "projetos@istartdigital.com.br",
    phone:   "(41) 3200-3003",
    segment: "Marketing Digital",
    website: "https://www.istartdigital.com.br",
    address: "Al. Carlos de Carvalho, 200 — Curitiba, PR",
  },
  {
    id:      IDS.clients[3],
    name:    "Conexão Plus",
    cnpj:    "44.555.666/0001-04",
    email:   "digital@conexaoplus.com.br",
    phone:   "(51) 3300-4004",
    segment: "E-commerce",
    website: "https://www.conexaoplus.com.br",
    address: "Av. Ipiranga, 6681 — Porto Alegre, RS",
  },
  {
    id:      IDS.clients[4],
    name:    "Viva Commerce",
    cnpj:    "55.666.777/0001-05",
    email:   "mkt@vivacommerce.com.br",
    phone:   "(31) 3400-5005",
    segment: "Varejo",
    website: "https://www.vivacommerce.com.br",
    address: "Av. Afonso Pena, 1000 — Belo Horizonte, MG",
  },
];

// Projetos por cliente: 120 + 100 + 95 + 105 + 90 = 510
const CLIENT_QUOTAS = [120, 100, 95, 105, 90];

const PROJECT_TEMPLATES = [
  { title: "Gestão de Tráfego Pago",                 type: "Marketing Digital"      },
  { title: "Desenvolvimento de Landing Page",         type: "Desenvolvimento Web"    },
  { title: "Identidade Visual",                       type: "Design"                 },
  { title: "Campanha de E-mail Marketing",            type: "Marketing Digital"      },
  { title: "SEO e Posicionamento Orgânico",           type: "Marketing Digital"      },
  { title: "Redesign do Site Institucional",          type: "Desenvolvimento Web"    },
  { title: "Social Media Management",                 type: "Marketing Digital"      },
  { title: "Desenvolvimento de App Mobile",           type: "Desenvolvimento Mobile" },
  { title: "Consultoria de Performance Digital",      type: "Consultoria"            },
  { title: "Criação de Loja Virtual",                 type: "E-commerce"             },
  { title: "Produção de Conteúdo Editorial",          type: "Design"                 },
  { title: "Auditoria de Presença Digital",           type: "Consultoria"            },
  { title: "Campanha de Influenciadores",             type: "Marketing Digital"      },
  { title: "Sistema de Automação de CRM",             type: "Desenvolvimento Web"    },
  { title: "Estratégia de Inbound Marketing",         type: "Marketing Digital"      },
  { title: "Dashboard Analytics Personalizado",       type: "Desenvolvimento Web"    },
  { title: "Gestão de Redes Sociais",                 type: "Marketing Digital"      },
  { title: "Criação de Material Gráfico",             type: "Design"                 },
  { title: "Configuração de Google Ads",              type: "Marketing Digital"      },
  { title: "Desenvolvimento de E-commerce B2B",       type: "E-commerce"             },
];

const VALUES = [
  1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000,
  6000, 7000, 8000, 10000, 12000, 15000, 18000, 20000,
  25000, 30000, 35000, 40000,
];

const now = new Date();
const past   = (days: number) => new Date(now.getTime() - days * 86_400_000);
const future = (days: number) => new Date(now.getTime() + days * 86_400_000);

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function progressForStatus(status: string, seed: number): number {
  const r = seed % 60;
  switch (status) {
    case "draft":             return 0;
    case "negotiation":       return 5;
    case "pending-approval":  return 10;
    case "awaiting-payment":  return 15;
    case "planning":          return 20;
    case "in-progress":       return 30 + r;
    case "paused":            return 20 + (r % 30);
    case "completed":         return 100;
    case "cancelled":         return r % 40;
    default:                  return 0;
  }
}

function datesForStatus(
  status: string,
  idx: number,
): { start_date?: Date; end_date?: Date } {
  const offset = (idx * 2) % 80;
  switch (status) {
    case "in-progress":
      return { start_date: past(offset + 10), end_date: future(30 + offset) };
    case "completed":
      return { start_date: past(offset + 60), end_date: past(offset + 5) };
    case "paused":
      return { start_date: past(offset + 30), end_date: future(60 + offset) };
    case "planning":
      return { start_date: past(offset + 5), end_date: future(45 + offset) };
    case "cancelled":
      return { start_date: past(offset + 45), end_date: past(offset + 10) };
    default:
      return {};
  }
}

async function main() {
  console.log("🌱 Seed: dados para agência agencia@allka.test\n");

  // 1. Find agency user
  const user = await prisma.user.findUnique({ where: { email: AGENCY_EMAIL } });
  if (!user) {
    console.error(`❌ Usuário ${AGENCY_EMAIL} não encontrado. Crie-o primeiro.`);
    process.exit(1);
  }
  console.log(`  ✓ Usuário → ${user.name} (${user.id})`);

  // 2. Upsert Agency profile
  // Check if user already has an agency record (by user_id) to avoid unique constraint error
  const existingByUser = await prisma.agency.findUnique({ where: { user_id: user.id } });
  let agency;
  if (existingByUser) {
    agency = await prisma.agency.update({
      where: { id: existingByUser.id },
      data:  { name: existingByUser.name },
    });
  } else {
    agency = await prisma.agency.upsert({
      where:  { id: IDS.agency },
      update: {},
      create: {
        id:      IDS.agency,
        user_id: user.id,
        name:    user.name ?? "Allka Test Agency",
        email:   AGENCY_EMAIL,
        status:  "ativo",
      },
    });
  }
  const agencyName = agency.name;
  console.log(`  ✓ Agency   → ${agencyName} (${agency.id})`);

  // 3. Create 5 client companies
  const createdCompanies: Array<{ id: string; name: string }> = [];
  for (const c of CLIENTS_DATA) {
    const company = await prisma.company.upsert({
      where:  { id: c.id },
      update: { name: c.name },
      create: {
        id:      c.id,
        name:    c.name,
        cnpj:    c.cnpj,
        email:   c.email,
        phone:   c.phone,
        segment: c.segment,
        website: c.website,
        address: c.address,
        status:  "ativo",
      },
    });
    createdCompanies.push({ id: company.id, name: company.name });
    console.log(`  ✓ Cliente  → ${company.name}`);
  }

  // 4. Build project list (510 projects)
  type ProjectEntry = {
    id: string;
    title: string;
    type: string;
    status: string;
    clientId: string;
    value: number;
    progress: number;
    lifecycle: "avulso" | "mensal";
    start_date?: Date;
    end_date?: Date;
  };

  const projectEntries: ProjectEntry[] = [];
  let globalIdx = 0;

  for (let ci = 0; ci < IDS.clients.length; ci++) {
    const clientId = IDS.clients[ci];
    const quota    = CLIENT_QUOTAS[ci];

    // Build status list for this client proportional to STATUS_COUNTS
    const statusesForClient: string[] = [];
    for (const [status, count] of Object.entries(STATUS_COUNTS)) {
      const share = Math.round((count / 510) * quota);
      for (let k = 0; k < share; k++) statusesForClient.push(status);
    }
    // Fill any rounding gap with "in-progress"
    while (statusesForClient.length < quota) statusesForClient.push("in-progress");
    // Trim if slightly over
    statusesForClient.splice(quota);

    for (let pi = 0; pi < statusesForClient.length; pi++) {
      const status   = statusesForClient[pi];
      const tmpl     = pick(PROJECT_TEMPLATES, globalIdx);
      const repeat   = Math.floor(pi / PROJECT_TEMPLATES.length);
      const suffix   = repeat > 0 ? ` — Fase ${repeat + 1}` : "";

      projectEntries.push({
        id:        `seed-ag-proj-${String(globalIdx + 1).padStart(4, "0")}`,
        title:     tmpl.title + suffix,
        type:      tmpl.type,
        status,
        clientId,
        value:     VALUES[globalIdx % VALUES.length],
        progress:  progressForStatus(status, globalIdx),
        lifecycle: globalIdx % 5 === 0 ? "mensal" : "avulso",
        ...datesForStatus(status, globalIdx),
      });
      globalIdx++;
    }
  }

  // 5. Upsert all projects
  console.log(`\n  Criando ${projectEntries.length} projetos...`);
  let done = 0;
  for (const p of projectEntries) {
    await prisma.project.upsert({
      where:  { id: p.id },
      update: {
        title:     p.title,
        status:    p.status,
        agency:    agencyName,
        client_id: p.clientId,
        value:     p.value,
        progress:  p.progress,
      },
      create: {
        id:           p.id,
        title:        p.title,
        type:         p.type,
        status:       p.status,
        agency:       agencyName,
        client_id:    p.clientId,
        value:        p.value,
        budget:       p.value,
        progress:     p.progress,
        lifecycle:    p.lifecycle,
        company_type: "company",
        start_date:   p.start_date,
        end_date:     p.end_date,
      },
    });
    done++;
    if (done % 100 === 0) console.log(`    → ${done}/${projectEntries.length}`);
  }

  // 6. Summary
  const byStatus: Record<string, number> = {};
  for (const p of projectEntries) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

  console.log("\n  ✅ Por status:");
  for (const [s, n] of Object.entries(byStatus)) {
    console.log(`     ${s.padEnd(22)} → ${n}`);
  }

  console.log("\n  ✅ Por cliente:");
  for (let ci = 0; ci < CLIENTS_DATA.length; ci++) {
    const n = projectEntries.filter((p) => p.clientId === IDS.clients[ci]).length;
    console.log(`     ${CLIENTS_DATA[ci].name.padEnd(25)} → ${n} projetos`);
  }

  console.log(`\n  Total projetos: ${projectEntries.length}`);
  console.log(`  Login agência:  ${AGENCY_EMAIL}`);
  console.log("  ✅ Seed concluído!\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
