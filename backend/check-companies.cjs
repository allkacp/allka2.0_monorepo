const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.company.findMany({
  include: {
    users: { where: { is_active: true }, select: { id: true, name: true, role: true, email: true } }
  },
  orderBy: { created_at: 'asc' }
})
.then(cs => {
  cs.forEach(c => {
    const roles = c.users.map(u => u.role).join(',') || 'none';
    console.log(`[${c.id.slice(0,8)}] ${c.name} | users: ${c.users.length} (${roles})`);
  });
  console.log('\nTotal companies:', cs.length);
  const noUsers = cs.filter(c => c.users.length === 0);
  const noClient = cs.filter(c => !c.users.some(u => u.role === 'company_user'));
  const noConsult = cs.filter(c => !c.users.some(u => ['company_admin','agency_user','agency_admin','admin'].includes(u.role)));
  console.log('Companies with NO users:', noUsers.length);
  console.log('Companies with NO company_user (client):', noClient.length);
  console.log('Companies with NO consultant/admin:', noConsult.length);
})
.finally(() => p.$disconnect());
