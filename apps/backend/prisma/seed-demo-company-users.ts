/**
 * Seed: usuários reais para as 19 empresas demo que ainda estavam com 0
 * usuários (seed-ag-client-*, seed-partner-company-*, seed-company-lider-01).
 * Quantidade varia por empresa (1 a 3) e o status (is_active) é misto,
 * usando o domínio de e-mail já cadastrado em cada empresa.
 *
 * Execução:  npx tsx prisma/seed-demo-company-users.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type UserDef = {
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login: Date | null;
  phone: string;
};

const COMPANIES: { companyId: string; users: UserDef[] }[] = [
  {
    companyId: "seed-ag-client-01", // TechNova Solutions
    users: [
      { email: "carla.nogueira@technova.com.br", name: "Carla Nogueira", role: "company_admin", is_active: true, last_login: daysAgo(2), phone: "(11) 98111-3001" },
      { email: "diego.martins@technova.com.br", name: "Diego Martins", role: "company_user", is_active: false, last_login: daysAgo(140), phone: "(11) 98111-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-02", // Grupo Meridian
    users: [
      { email: "roberto.assuncao@grupomeridian.com.br", name: "Roberto Assunção", role: "company_admin", is_active: true, last_login: daysAgo(5), phone: "(21) 98222-3001" },
    ],
  },
  {
    companyId: "seed-ag-client-03", // iStart Digital
    users: [
      { email: "juliana.rezende@istartdigital.com.br", name: "Juliana Rezende", role: "company_admin", is_active: true, last_login: daysAgo(1), phone: "(41) 98333-3001" },
      { email: "marcelo.aguiar@istartdigital.com.br", name: "Marcelo Aguiar", role: "company_user", is_active: true, last_login: daysAgo(30), phone: "(41) 98333-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-04", // Conexão Plus
    users: [
      { email: "patricia.figueiredo@conexaoplus.com.br", name: "Patrícia Figueiredo", role: "company_admin", is_active: false, last_login: daysAgo(200), phone: "(51) 98444-3001" },
    ],
  },
  {
    companyId: "seed-ag-client-05", // Viva Commerce
    users: [
      { email: "fabio.andrade@vivacommerce.com.br", name: "Fábio Andrade", role: "company_admin", is_active: true, last_login: daysAgo(3), phone: "(31) 98555-3001" },
      { email: "renata.brandao@vivacommerce.com.br", name: "Renata Brandão", role: "company_user", is_active: true, last_login: daysAgo(20), phone: "(31) 98555-3002" },
      { email: "thiago.cardoso@vivacommerce.com.br", name: "Thiago Cardoso", role: "company_user", is_active: false, last_login: daysAgo(95), phone: "(31) 98555-3003" },
    ],
  },
  {
    companyId: "seed-ag-client-ambev", // Ambev S.A.
    users: [
      { email: "marcia.vasconcelos@ambev.com.br", name: "Márcia Vasconcelos", role: "company_admin", is_active: true, last_login: daysAgo(1), phone: "(11) 98666-3001" },
      { email: "gustavo.leal@ambev.com.br", name: "Gustavo Leal", role: "company_user", is_active: true, last_login: daysAgo(12), phone: "(11) 98666-3002" },
      { email: "vanessa.tavares@ambev.com.br", name: "Vanessa Tavares", role: "company_user", is_active: false, last_login: daysAgo(220), phone: "(11) 98666-3003" },
    ],
  },
  {
    companyId: "seed-ag-client-coca-cola", // Coca-Cola Brasil
    users: [
      { email: "eduardo.pimentel@cocacola.com.br", name: "Eduardo Pimentel", role: "company_admin", is_active: true, last_login: daysAgo(4), phone: "(11) 98777-3001" },
      { email: "larissa.moraes@cocacola.com.br", name: "Larissa Moraes", role: "company_user", is_active: true, last_login: daysAgo(50), phone: "(11) 98777-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-embraer", // Embraer
    users: [
      { email: "ricardo.bittencourt@embraer.com.br", name: "Ricardo Bittencourt", role: "company_admin", is_active: true, last_login: daysAgo(2), phone: "(12) 98888-3001" },
      { email: "sandra.correia@embraer.com.br", name: "Sandra Correia", role: "company_user", is_active: false, last_login: daysAgo(160), phone: "(12) 98888-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-google", // Google Brasil
    users: [
      { email: "bruno.siqueira@google.com.br", name: "Bruno Siqueira", role: "company_admin", is_active: true, last_login: daysAgo(1), phone: "(11) 98999-3001" },
    ],
  },
  {
    companyId: "seed-ag-client-ifood", // iFood
    users: [
      { email: "camila.dutra@ifood.com.br", name: "Camila Dutra", role: "company_admin", is_active: true, last_login: daysAgo(1), phone: "(11) 98123-3001" },
      { email: "felipe.guimaraes@ifood.com.br", name: "Felipe Guimarães", role: "company_user", is_active: true, last_login: daysAgo(18), phone: "(11) 98123-3002" },
      { email: "priscila.magalhaes@ifood.com.br", name: "Priscila Magalhães", role: "company_user", is_active: false, last_login: daysAgo(300), phone: "(11) 98123-3003" },
    ],
  },
  {
    companyId: "seed-ag-client-magazine-luiza", // Magazine Luiza
    users: [
      { email: "helena.barreto@magazineluiza.com.br", name: "Helena Barreto", role: "company_admin", is_active: true, last_login: daysAgo(3), phone: "(17) 98234-3001" },
      { email: "vinicius.cavalcanti@magazineluiza.com.br", name: "Vinícius Cavalcanti", role: "company_user", is_active: true, last_login: daysAgo(40), phone: "(17) 98234-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-natura", // Natura Cosméticos
    users: [
      { email: "amanda.teles@natura.net", name: "Amanda Teles", role: "company_admin", is_active: true, last_login: daysAgo(6), phone: "(11) 98345-3001" },
    ],
  },
  {
    companyId: "seed-ag-client-nubank", // Nubank
    users: [
      { email: "leonardo.aragao@nubank.com.br", name: "Leonardo Aragão", role: "company_admin", is_active: true, last_login: daysAgo(2), phone: "(11) 98456-3001" },
      { email: "debora.sampaio@nubank.com.br", name: "Débora Sampaio", role: "company_user", is_active: false, last_login: daysAgo(175), phone: "(11) 98456-3002" },
    ],
  },
  {
    companyId: "seed-ag-client-starbucks", // Starbucks Coffee
    users: [
      { email: "rafael.quintanilha@starbucks.com.br", name: "Rafael Quintanilha", role: "company_admin", is_active: true, last_login: daysAgo(5), phone: "(11) 98567-3001" },
    ],
  },
  {
    companyId: "seed-ag-client-tesla", // Tesla Brasil
    users: [
      { email: "isabela.franco@tesla.com.br", name: "Isabela Franco", role: "company_admin", is_active: true, last_login: daysAgo(1), phone: "(11) 98678-3001" },
      { email: "otavio.machado@tesla.com.br", name: "Otávio Machado", role: "company_user", is_active: true, last_login: daysAgo(28), phone: "(11) 98678-3002" },
    ],
  },
  {
    companyId: "seed-company-lider-01", // Empresa Seed Performance
    users: [
      { email: "sergio.balbino@seedperformance.com.br", name: "Sérgio Balbino", role: "company_admin", is_active: true, last_login: daysAgo(4), phone: "(11) 98789-3001" },
    ],
  },
  {
    companyId: "seed-partner-company-A", // Cliente Partner Alpha Ltda
    users: [
      { email: "monica.freire@alpha.com.br", name: "Mônica Freire", role: "company_admin", is_active: true, last_login: daysAgo(2), phone: "(11) 97777-9001" },
      { email: "andre.viana@alpha.com.br", name: "André Viana", role: "company_user", is_active: false, last_login: daysAgo(210), phone: "(11) 97777-9002" },
    ],
  },
  {
    companyId: "seed-partner-company-B", // Cliente Partner Beta Ltda
    users: [
      { email: "cristiane.moreno@beta.com.br", name: "Cristiane Moreno", role: "company_admin", is_active: true, last_login: daysAgo(7), phone: "(11) 98888-9001" },
    ],
  },
  {
    companyId: "seed-partner-company-C", // Cliente Partner Gamma Ltda
    users: [
      { email: "washington.paiva@gamma.com.br", name: "Washington Paiva", role: "company_admin", is_active: true, last_login: daysAgo(3), phone: "(11) 99999-9001" },
      { email: "beatriz.nascimento@gamma.com.br", name: "Beatriz Nascimento", role: "company_user", is_active: true, last_login: daysAgo(35), phone: "(11) 99999-9002" },
    ],
  },
];

async function main() {
  console.log("🌱 Seed: usuários reais para empresas demo sem usuários...\n");
  const pass = await bcrypt.hash("Allka@2026", 10);
  let created = 0;
  let skipped = 0;

  for (const { companyId, users } of COMPANIES) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
    if (!company) {
      console.log(`  ⚠ Empresa ${companyId} não encontrada, pulando`);
      continue;
    }
    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        console.log(`  ↷ ${u.name} já existe, pulando`);
        skipped++;
        continue;
      }
      await prisma.user.create({
        data: {
          email: u.email,
          username: u.email.split("@")[0].replace(".", "_"),
          password_hash: pass,
          name: u.name,
          role: u.role,
          account_type: "empresas",
          is_active: u.is_active,
          phone: u.phone,
          company_id: company.id,
          last_login: u.last_login,
        },
      });
      console.log(`  ✓ ${u.name.padEnd(24)} → ${company.name} (${u.is_active ? "ativo" : "inativo"})`);
      created++;
    }
  }

  console.log(`\n✅ ${created} usuário(s) criado(s), ${skipped} já existiam.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
