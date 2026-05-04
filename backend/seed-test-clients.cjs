/**
 * seed-test-clients.cjs
 * ─────────────────────
 * Idempotent seed: garante que toda empresa tenha pelo menos
 *   • 1 usuário cliente  (role: company_user)
 *   • 1 usuário responsável / consultor (role: company_admin)
 *
 * Regras:
 *   - Não apaga nada existente
 *   - Não duplica: usa email como chave; se o email já existe, pula
 *   - Senha padrão: 123@321  (mesmo padrão do admin de testes)
 *
 * Uso:
 *   cd backend
 *   node seed-test-clients.cjs
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/** Converte um nome em slug seguro para usar no e-mail */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-z0-9]+/g, '-')       // substitui especiais por hífen
    .replace(/^-+|-+$/g, '')           // remove hífens nas pontas
    .substring(0, 30);
}

async function main() {
  console.log('=== Seed: clientes e responsáveis de teste ===\n');

  // Busca todas as empresas com seus usuários ativos
  const companies = await prisma.company.findMany({
    include: {
      users: {
        where: { is_active: true },
        select: { id: true, name: true, role: true, email: true },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Empresas encontradas: ${companies.length}\n`);

  const PASSWORD = '123@321';
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  let clientesCreated = 0;
  let clientesSkipped = 0;
  let responsaveisCreated = 0;
  let responsaveisSkipped = 0;

  for (const company of companies) {
    const slug = slugify(company.name);
    const existingUsers = company.users;

    console.log(`Empresa: ${company.name} (${company.id.slice(0, 8)}...)`);
    console.log(`  Usuários ativos atuais: ${existingUsers.length}`);

    // ── Cliente (company_user) ────────────────────────────────────────────
    const hasClient = existingUsers.some((u) => u.role === 'company_user');

    if (hasClient) {
      const client = existingUsers.find((u) => u.role === 'company_user');
      console.log(`  [SKIP] Cliente já existe: ${client.email}`);
      clientesSkipped++;
    } else {
      const clientEmail = `cliente.${slug}@teste.allka.com.br`;
      const existing = await prisma.user.findUnique({ where: { email: clientEmail } });

      if (existing) {
        console.log(`  [SKIP] E-mail já cadastrado: ${clientEmail}`);
        clientesSkipped++;
      } else {
        await prisma.user.create({
          data: {
            email: clientEmail,
            password_hash: passwordHash,
            name: `Cliente ${company.name}`,
            role: 'company_user',
            account_type: 'empresas',
            company_id: company.id,
            phone: '(11) 99999-0001',
            is_active: true,
          },
        });
        console.log(`  [CREATE] Cliente: ${clientEmail}`);
        clientesCreated++;
      }
    }

    // ── Responsável / Consultor (company_admin) ───────────────────────────
    const consultorRoles = ['company_admin', 'agency_user', 'agency_admin', 'admin'];
    const hasConsultor = existingUsers.some((u) => consultorRoles.includes(u.role));

    if (hasConsultor) {
      const consultor = existingUsers.find((u) => consultorRoles.includes(u.role));
      console.log(`  [SKIP] Responsável já existe: ${consultor.email}`);
      responsaveisSkipped++;
    } else {
      const responsavelEmail = `responsavel.${slug}@teste.allka.com.br`;
      const existing = await prisma.user.findUnique({ where: { email: responsavelEmail } });

      if (existing) {
        console.log(`  [SKIP] E-mail já cadastrado: ${responsavelEmail}`);
        responsaveisSkipped++;
      } else {
        await prisma.user.create({
          data: {
            email: responsavelEmail,
            password_hash: passwordHash,
            name: `Responsável ${company.name}`,
            role: 'company_admin',
            account_type: 'empresas',
            company_id: company.id,
            phone: '(11) 99999-0002',
            is_active: true,
          },
        });
        console.log(`  [CREATE] Responsável: ${responsavelEmail}`);
        responsaveisCreated++;
      }
    }

    console.log('');
  }

  console.log('══════════════════════════════════════════');
  console.log(`Resultado:`);
  console.log(`  Clientes criados:      ${clientesCreated}`);
  console.log(`  Clientes pulados:      ${clientesSkipped}`);
  console.log(`  Responsáveis criados:  ${responsaveisCreated}`);
  console.log(`  Responsáveis pulados:  ${responsaveisSkipped}`);
  console.log(`\nSenha padrão: ${PASSWORD}`);
  console.log('Idempotente: execute novamente para verificar (0 criados esperado).');
}

main()
  .catch((err) => {
    console.error('Erro no seed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
