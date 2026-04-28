/**
 * Seed: Usuários de teste vinculados às empresas
 * Cria 3 usuários por empresa nas 10 empresas existentes (~30 usuários)
 * Distribui: 1 admin ativo recente | 1 usuário ativo antigo | 1 usuário inativo
 *
 * Execução:  npx tsx prisma/seed-company-users.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// daysAgo(0) = now, daysAgo(30) = 30 days back
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// hoursAgo
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main() {
  console.log("🌱 Seed: usuários de teste por empresa...\n");

  const pass = await bcrypt.hash("Allka@2026", 10);

  // ── Fetch the 10 companies by CNPJ ────────────────────────────────────────
  const companyCNPJs = [
    "12.345.678/0001-90", // TechCorp Brasil
    "98.765.432/0001-10", // Varejo Modas Ltda
    "55.555.555/0001-55", // Restaurante Sabor & Arte
    "11.222.333/0001-44", // Clínica Saúde Total
    "22.333.444/0001-55", // Imobiliária Nova Casa
    "33.444.555/0001-66", // Escritório Advocacia JR
    "44.555.666/0001-77", // Academia FitLife
    "55.666.777/0001-88", // Pet Shop Amigo Fiel
    "66.777.888/0001-99", // Escola Crescer & Aprender
    "77.888.999/0001-00", // StartupX Inovações
  ];

  const companies = await prisma.company.findMany({
    where: { cnpj: { in: companyCNPJs } },
    select: { id: true, cnpj: true, name: true },
  });

  const byName = (name: string) => {
    const c = companies.find((co) => co.name.includes(name));
    if (!c) throw new Error(`Empresa não encontrada: ${name}`);
    return c;
  };

  // ── User data: 3 per company ──────────────────────────────────────────────
  type UserDef = {
    email: string;
    username: string;
    name: string;
    role: string;
    is_active: boolean;
    last_login: Date | null;
    company_name_fragment: string;
    phone?: string;
  };

  const users: UserDef[] = [
    // ─ TechCorp Brasil ──────────────────────────────────────────────────────
    { email: "beatriz.takeda@techcorp-test.com", username: "btakeda", name: "Beatriz Takeda", role: "company_admin", is_active: true,  last_login: daysAgo(2),   company_name_fragment: "TechCorp", phone: "(11) 91111-0001" },
    { email: "andre.lopes@techcorp-test.com",    username: "alopes",  name: "André Lopes",    role: "company_user",  is_active: true,  last_login: daysAgo(45),  company_name_fragment: "TechCorp", phone: "(11) 91111-0002" },
    { email: "renata.moura@techcorp-test.com",   username: "rmoura",  name: "Renata Moura",   role: "company_user",  is_active: false, last_login: daysAgo(150), company_name_fragment: "TechCorp", phone: "(11) 91111-0003" },

    // ─ Varejo Modas Ltda ────────────────────────────────────────────────────
    { email: "fernanda.pires@varejo-test.com",  username: "fpires",     name: "Fernanda Pires",   role: "company_admin", is_active: true,  last_login: daysAgo(1),   company_name_fragment: "Varejo", phone: "(11) 92222-0001" },
    { email: "bruno.castilho@varejo-test.com",  username: "bcastilho",  name: "Bruno Castilho",   role: "company_user",  is_active: true,  last_login: daysAgo(60),  company_name_fragment: "Varejo", phone: "(11) 92222-0002" },
    { email: "mariana.braga@varejo-test.com",   username: "mbraga",     name: "Mariana Braga",    role: "company_user",  is_active: false, last_login: null,         company_name_fragment: "Varejo", phone: "(11) 92222-0003" },

    // ─ Restaurante Sabor & Arte ─────────────────────────────────────────────
    { email: "claudia.meireles@sabor-test.com", username: "cmeireles",  name: "Cláudia Meireles", role: "company_admin", is_active: true,  last_login: daysAgo(3),   company_name_fragment: "Sabor",  phone: "(11) 93333-0001" },
    { email: "rodrigo.assis@sabor-test.com",    username: "rassis",     name: "Rodrigo Assis",    role: "company_user",  is_active: true,  last_login: daysAgo(30),  company_name_fragment: "Sabor",  phone: "(11) 93333-0002" },
    { email: "patricia.nunes@sabor-test.com",   username: "pnunes",     name: "Patrícia Nunes",   role: "company_user",  is_active: false, last_login: daysAgo(120), company_name_fragment: "Sabor",  phone: "(11) 93333-0003" },

    // ─ Clínica Saúde Total ──────────────────────────────────────────────────
    { email: "felipe.ramos@clinica-test.com",   username: "framos",     name: "Dr. Felipe Ramos", role: "company_admin", is_active: true,  last_login: hoursAgo(6),  company_name_fragment: "Saúde",  phone: "(21) 94444-0001" },
    { email: "simone.barros@clinica-test.com",  username: "sbarros",    name: "Simone Barros",    role: "company_user",  is_active: true,  last_login: daysAgo(15),  company_name_fragment: "Saúde",  phone: "(21) 94444-0002" },
    { email: "eduardo.pinto@clinica-test.com",  username: "epinto",     name: "Eduardo Pinto",    role: "company_user",  is_active: false, last_login: daysAgo(200), company_name_fragment: "Saúde",  phone: "(21) 94444-0003" },

    // ─ Imobiliária Nova Casa ─────────────────────────────────────────────────
    { email: "gustavo.pereira@novacasa-test.com", username: "gpereira", name: "Gustavo Pereira",  role: "company_admin", is_active: true,  last_login: daysAgo(4),  company_name_fragment: "Nova Casa", phone: "(31) 95555-0001" },
    { email: "aline.ribeiro@novacasa-test.com",   username: "aribeiro", name: "Aline Ribeiro",    role: "company_user",  is_active: true,  last_login: daysAgo(55), company_name_fragment: "Nova Casa", phone: "(31) 95555-0002" },
    { email: "marcos.lima@novacasa-test.com",     username: "mlima",    name: "Marcos Lima",      role: "company_user",  is_active: false, last_login: daysAgo(90), company_name_fragment: "Nova Casa", phone: "(31) 95555-0003" },

    // ─ Escritório Advocacia JR ───────────────────────────────────────────────
    { email: "paulo.vieira@advocacia-test.com",   username: "pvieira",  name: "Dr. Paulo Vieira", role: "company_admin", is_active: true,  last_login: daysAgo(1),   company_name_fragment: "Advocacia", phone: "(11) 96666-0001" },
    { email: "laura.campos@advocacia-test.com",   username: "lcampos",  name: "Laura Campos",     role: "company_user",  is_active: true,  last_login: daysAgo(40),  company_name_fragment: "Advocacia", phone: "(11) 96666-0002" },
    { email: "tiago.nogueira@advocacia-test.com", username: "tnogueira",name: "Tiago Nogueira",   role: "company_user",  is_active: false, last_login: null,         company_name_fragment: "Advocacia", phone: "(11) 96666-0003" },

    // ─ Academia FitLife ──────────────────────────────────────────────────────
    { email: "rafael.torres@fitlife-test.com",  username: "rtorres",  name: "Rafael Torres",  role: "company_admin", is_active: true,  last_login: hoursAgo(3),  company_name_fragment: "FitLife", phone: "(41) 97777-0001" },
    { email: "isabela.cruz@fitlife-test.com",   username: "icruz",    name: "Isabela Cruz",   role: "company_user",  is_active: true,  last_login: daysAgo(25),  company_name_fragment: "FitLife", phone: "(41) 97777-0002" },
    { email: "henrique.dias@fitlife-test.com",  username: "hdias",    name: "Henrique Dias",  role: "company_user",  is_active: false, last_login: daysAgo(160), company_name_fragment: "FitLife", phone: "(41) 97777-0003" },

    // ─ Pet Shop Amigo Fiel ───────────────────────────────────────────────────
    { email: "vanessa.araujo@amigofiel-test.com", username: "varaujo",   name: "Vanessa Araújo",   role: "company_admin", is_active: true,  last_login: daysAgo(2),   company_name_fragment: "Amigo",    phone: "(51) 98888-0001" },
    { email: "diego.mendes@amigofiel-test.com",   username: "dmendes",   name: "Diego Mendes",     role: "company_user",  is_active: true,  last_login: daysAgo(75),  company_name_fragment: "Amigo",    phone: "(51) 98888-0002" },
    { email: "camila.monteiro@amigofiel-test.com",username: "cmonteiro", name: "Camila Monteiro",  role: "company_user",  is_active: false, last_login: daysAgo(110), company_name_fragment: "Amigo",    phone: "(51) 98888-0003" },

    // ─ Escola Crescer & Aprender (empresa inativa) ──────────────────────────
    { email: "cristina.carvalho@crescer-test.com", username: "ccarvalho", name: "Cristina Carvalho", role: "company_admin", is_active: false, last_login: daysAgo(180), company_name_fragment: "Crescer", phone: "(61) 99999-0001" },
    { email: "leandro.freitas@crescer-test.com",   username: "lfreitas",  name: "Leandro Freitas",   role: "company_user",  is_active: false, last_login: daysAgo(240), company_name_fragment: "Crescer", phone: "(61) 99999-0002" },
    { email: "tatiana.gomes@crescer-test.com",     username: "tgomes",    name: "Tatiana Gomes",     role: "company_user",  is_active: false, last_login: null,         company_name_fragment: "Crescer", phone: "(61) 99999-0003" },

    // ─ StartupX Inovações ────────────────────────────────────────────────────
    { email: "lucas.santana@startupx-test.com", username: "lsantana",  name: "Lucas Santana",  role: "company_admin", is_active: true,  last_login: daysAgo(1),  company_name_fragment: "StartupX", phone: "(11) 90000-0001" },
    { email: "amanda.souza@startupx-test.com",  username: "asouza",    name: "Amanda Souza",   role: "company_user",  is_active: true,  last_login: daysAgo(10), company_name_fragment: "StartupX", phone: "(11) 90000-0002" },
    { email: "caio.ferreira@startupx-test.com", username: "cferreira", name: "Caio Ferreira",  role: "company_user",  is_active: false, last_login: daysAgo(80), company_name_fragment: "StartupX", phone: "(11) 90000-0003" },
  ];

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    const company = byName(u.company_name_fragment);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      // Update company_id and last_login so test data is always fresh
      await prisma.user.update({
        where: { email: u.email },
        data: {
          company_id: company.id,
          last_login: u.last_login,
          is_active: u.is_active,
        },
      });
      console.log(`  ↻ Atualizado  ${u.name.padEnd(24)} → ${company.name}`);
      skipped++;
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          username: u.username,
          password_hash: pass,
          name: u.name,
          role: u.role,
          account_type: "empresas",
          is_active: u.is_active,
          phone: u.phone ?? null,
          company_id: company.id,
          last_login: u.last_login,
        },
      });
      console.log(`  ✓ Criado      ${u.name.padEnd(24)} → ${company.name}`);
      created++;
    }
  }

  console.log(`\n✅ Concluído: ${created} criados, ${skipped} atualizados.`);
  console.log(`   Total de usuários vinculados: ${created + skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
