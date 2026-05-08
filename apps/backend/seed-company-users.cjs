/**
 * seed-company-users.cjs
 *
 * Cria 2 usuários por empresa já existente no banco:
 *   1. company_admin — aparece como CLIENTE e RESPONSÁVEL no wizard de projeto
 *   2. company_user  — aparece somente como CLIENTE
 *
 * Idempotente: usa upsert por e-mail.
 *
 * Execução:
 *   cd apps/backend && node seed-company-users.cjs
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Dados por empresa (índice = posição da empresa na lista ordenada por name asc)
const COMPANY_USERS = [
  // TechCorp Brasil
  { adminName: "Marcos Andrade",    adminEmail: "marcos@techcorp.com.br",    userName: "Renata Lima",     userEmail: "renata@techcorp.com.br"    },
  // Varejo Modas Ltda
  { adminName: "Fernanda Souza",    adminEmail: "fernanda@varejomodas.com",  userName: "Bruno Castro",    userEmail: "bruno@varejomodas.com"     },
  // Restaurante Sabor & Arte
  { adminName: "Paulo Henrique",    adminEmail: "paulo@saborarte.com.br",    userName: "Aline Torres",    userEmail: "aline@saborarte.com.br"    },
  // Clínica Saúde Total
  { adminName: "Dra. Cláudia Reis", adminEmail: "claudia@saudetotal.com",    userName: "Thiago Pinto",    userEmail: "thiago@saudetotal.com"     },
  // Imobiliária Nova Casa
  { adminName: "Ricardo Fonseca",   adminEmail: "ricardo@novacasa.com.br",   userName: "Tatiane Gomes",   userEmail: "tatiane@novacasa.com.br"   },
  // Escritório Advocacia JR
  { adminName: "Dr. José Rodrigues",adminEmail: "jose@advocaciajr.com",      userName: "Mariana Lopes",   userEmail: "mariana@advocaciajr.com"   },
  // Academia FitLife
  { adminName: "Rafael Correia",    adminEmail: "rafael@fitlife.com.br",     userName: "Juliana Matos",   userEmail: "juliana@fitlife.com.br"    },
  // Pet Shop Amigo Fiel
  { adminName: "Carla Monteiro",    adminEmail: "carla@amigofiel.com",       userName: "Diego Santos",    userEmail: "diego@amigofiel.com"       },
  // Escola Crescer & Aprender
  { adminName: "Ana Paula Vieira",  adminEmail: "anapaula@crescer.edu.br",   userName: "Lucas Freitas",   userEmail: "lucas@crescer.edu.br"      },
  // StartupX Inovações
  { adminName: "Gabriel Carvalho",  adminEmail: "gabriel@startupx.io",       userName: "Sofia Nakamura",  userEmail: "sofia@startupx.io"         },
];

async function main() {
  const password = await bcrypt.hash("senha123", 10);

  // Fetch companies sorted by name so the index matches COMPANY_USERS
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });

  if (companies.length === 0) {
    console.error("Nenhuma empresa encontrada. Execute o seed principal primeiro.");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const data = COMPANY_USERS[i];

    if (!data) {
      console.warn(`  Sem dados para empresa[${i}]: ${company.name}`);
      continue;
    }

    console.log(`\n[${i + 1}] ${company.name} (${company.id})`);

    // 1. company_admin — client AND responsible candidate
    const admin = await prisma.user.upsert({
      where: { email: data.adminEmail },
      update: { company_id: company.id, is_active: true },
      create: {
        email: data.adminEmail,
        password_hash: password,
        name: data.adminName,
        role: "company_admin",
        account_type: "empresas",
        company_id: company.id,
        is_active: true,
      },
    });
    console.log(`   company_admin: ${admin.name} <${admin.email}> — ${admin.id}`);
    created++;

    // 2. company_user — client only
    const user = await prisma.user.upsert({
      where: { email: data.userEmail },
      update: { company_id: company.id, is_active: true },
      create: {
        email: data.userEmail,
        password_hash: password,
        name: data.userName,
        role: "company_user",
        account_type: "empresas",
        company_id: company.id,
        is_active: true,
      },
    });
    console.log(`   company_user:  ${user.name} <${user.email}> — ${user.id}`);
    created++;
  }

  console.log(`\nFinalizado: ${created} usuários criados/atualizados em ${companies.length} empresas.`);
  console.log("Senha para todos: senha123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
