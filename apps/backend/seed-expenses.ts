/**
 * seed-expenses.ts
 * Popula a tabela de despesas operacionais com exemplos realistas.
 * Uso: npx tsx seed-expenses.ts
 * Idempotente: não duplica se já existirem despesas.
 */
import { prisma } from "./src/lib/prisma";

const EXPENSES = [
  { name: "AWS — EC2 + RDS",              category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 3200,  due_date: new Date("2026-06-05"), paid_at: new Date("2026-06-04"), payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "Servidores de produção e banco de dados",          is_recurring_base: true  },
  { name: "Cloudflare Pro",                category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 210,   due_date: new Date("2026-06-05"), paid_at: new Date("2026-06-04"), payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "CDN + proteção DDoS",                               is_recurring_base: true  },
  { name: "Vercel Pro Team",               category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 280,   due_date: new Date("2026-06-01"), paid_at: new Date("2026-06-01"), payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "Deploy frontend + edge functions",                  is_recurring_base: true  },
  { name: "Domínio allka.com.vc",          category: "Infraestrutura",         type: "fixa",     recurrence: "anual",  status: "paga",     amount: 89,    due_date: new Date("2026-01-15"), paid_at: new Date("2026-01-15"), payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-01", description: "Renovação de domínio",                               is_recurring_base: true  },
  { name: "Slack Business+",               category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 480,   due_date: new Date("2026-06-10"), paid_at: new Date("2026-06-10"), payment_method: "Cartão corporativo",  department: "Geral",      competence_month: "2026-06", description: "Comunicação interna — 20 usuários",                 is_recurring_base: true  },
  { name: "Figma Organization",            category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 640,   due_date: new Date("2026-06-10"), paid_at: new Date("2026-06-09"), payment_method: "Cartão corporativo",  department: "Produto",    competence_month: "2026-06", description: "Design tools — time de produto",                    is_recurring_base: true  },
  { name: "Google Workspace Business",     category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 350,   due_date: new Date("2026-06-01"), paid_at: new Date("2026-06-01"), payment_method: "Cartão corporativo",  department: "Geral",      competence_month: "2026-06", description: "Gmail + Drive + Meet — 15 contas",                  is_recurring_base: true  },
  { name: "RD Station Marketing",          category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 890,   due_date: new Date("2026-06-01"), paid_at: new Date("2026-06-01"), payment_method: "Cartão corporativo",  department: "Marketing",  competence_month: "2026-06", description: "CRM e automação de marketing",                      is_recurring_base: true  },
  { name: "Folha de pagamento — Jun",      category: "Pessoas",                type: "fixa",     recurrence: "mensal", status: "paga",     amount: 42000, due_date: new Date("2026-06-30"), paid_at: new Date("2026-06-28"), payment_method: "Transferência",       department: "RH",         competence_month: "2026-06", description: "CLT: 3 devs + 1 designer + 1 PM",                   is_recurring_base: true  },
  { name: "INSS + FGTS — Junho",           category: "Impostos e Taxas",       type: "fixa",     recurrence: "mensal", status: "pendente", amount: 9800,  due_date: new Date("2026-07-07"), paid_at: null,                   payment_method: "DARF/GFIP",           department: "RH",         competence_month: "2026-06", description: "Encargos trabalhistas sobre folha",                  is_recurring_base: true  },
  { name: "Simples Nacional — Maio",       category: "Impostos e Taxas",       type: "fixa",     recurrence: "mensal", status: "paga",     amount: 4500,  due_date: new Date("2026-06-20"), paid_at: new Date("2026-06-19"), payment_method: "DAS",                 department: "Financeiro", competence_month: "2026-05", description: "DAS — apuração maio/2026",                           is_recurring_base: true  },
  { name: "Aluguel — Escritório SP",       category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 6800,  due_date: new Date("2026-06-10"), paid_at: new Date("2026-06-08"), payment_method: "Transferência",       department: "Admin",      competence_month: "2026-06", description: "Sala comercial Av. Paulista — andar 14",             is_recurring_base: true  },
  { name: "Internet Fibra + VPN",          category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 890,   due_date: new Date("2026-06-15"), paid_at: new Date("2026-06-14"), payment_method: "Débito automático",   department: "Tech",       competence_month: "2026-06", description: "700 Mbps + FortiGate VPN License",                   is_recurring_base: false },
  { name: "Assessoria Jurídica",           category: "Jurídico/Contábil",      type: "fixa",     recurrence: "mensal", status: "pendente", amount: 3500,  due_date: new Date("2026-06-30"), paid_at: null,                   payment_method: "Transferência",       department: "Jurídico",   competence_month: "2026-06", description: "Contrato mensal — Escritório Alves & Dias",          is_recurring_base: true  },
  { name: "Contabilidade Digital",         category: "Jurídico/Contábil",      type: "fixa",     recurrence: "mensal", status: "paga",     amount: 1200,  due_date: new Date("2026-06-05"), paid_at: new Date("2026-06-03"), payment_method: "Transferência",       department: "Financeiro", competence_month: "2026-06", description: "Guias + obrigações acessórias",                      is_recurring_base: true  },
  { name: "Campanha Google Ads — Mai",     category: "Marketing",              type: "variável", recurrence: "única",  status: "paga",     amount: 5200,  due_date: new Date("2026-06-10"), paid_at: new Date("2026-06-08"), payment_method: "Cartão corporativo",  department: "Marketing",  competence_month: "2026-05", description: "Aquisição de leads — produto B2B",                   is_recurring_base: false },
  { name: "Evento — AllkaCon 2026",        category: "Marketing",              type: "variável", recurrence: "única",  status: "pendente", amount: 12000, due_date: new Date("2026-07-15"), paid_at: null,                   payment_method: "Transferência",       department: "Marketing",  competence_month: "2026-07", description: "Venue + catering + material gráfico",                is_recurring_base: false },
  { name: "Consultoria UX — sprint",       category: "Operacional",            type: "variável", recurrence: "única",  status: "paga",     amount: 8500,  due_date: new Date("2026-05-31"), paid_at: new Date("2026-05-30"), payment_method: "Transferência",       department: "Produto",    competence_month: "2026-05", description: "Sprint de redesign do onboarding",                   is_recurring_base: false },
  { name: "Seguro Equipamentos TI",        category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "atrasada", amount: 420,   due_date: new Date("2026-05-30"), paid_at: null,                   payment_method: "Débito automático",   department: "Admin",      competence_month: "2026-05", description: "Apólice notebooks + servidores locais",              is_recurring_base: false, notes: "Pagamento atrasado — contatar seguradora" },
  { name: "Aluguel impressora",            category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "atrasada", amount: 320,   due_date: new Date("2026-05-30"), paid_at: null,                   payment_method: "Débito automático",   department: "Admin",      competence_month: "2026-05", description: "Contrato Ricoh",                                     is_recurring_base: false, notes: "Pagamento em atraso desde 30/05" },
];

async function main() {
  const count = await prisma.expense.count();
  if (count > 0) {
    console.log(`\n⚠️  Já existem ${count} despesa(s) — seed ignorado para não duplicar.\n`);
    return;
  }

  console.log("\n── Inserindo despesas de exemplo ───────────────────────────");
  for (const data of EXPENSES) {
    await prisma.expense.create({ data: data as any });
    console.log(`  ✓ ${data.name}`);
  }
  console.log(`\n✅ ${EXPENSES.length} despesas criadas.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
