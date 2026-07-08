/**
 * audit-user-profile-links.ts
 *
 * Script TEMPORÁRIO e READ-ONLY. Não escreve nada no banco — só lê e imprime
 * um relatório de integridade dos vínculos de perfil (Agency/Company/
 * Partner/LiderArea/Nomade) de todos os usuários.
 *
 * Execução: cd apps/backend && npx tsx prisma/audit-user-profile-links.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KNOWN_ACCOUNT_TYPES = ["admin", "agencias", "empresas", "parceiro", "lider", "nomades"];

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      account_type: true,
      is_active: true,
      company_id: true,
      agency: { select: { id: true } },
      partner: { select: { id: true } },
      nomade: { select: { id: true } },
      lider_areas: { select: { id: true, ativo: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log("════════════════════════════════════════════════");
  console.log("RESUMO");
  console.log("════════════════════════════════════════════════");
  console.log("Total de usuários:", users.length);

  const byAccountType: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const u of users) {
    const at = u.account_type || "(vazio)";
    byAccountType[at] = (byAccountType[at] || 0) + 1;
    const r = u.role || "(vazio)";
    byRole[r] = (byRole[r] || 0) + 1;
  }
  console.log("\nPor account_type:");
  for (const [k, v] of Object.entries(byAccountType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)} ${v}`);
  }
  console.log("\nPor role:");
  for (const [k, v] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  // ── Duplicated emails (defensive — should be impossible due to @unique) ──
  const emailCounts: Record<string, number> = {};
  for (const u of users) emailCounts[u.email] = (emailCounts[u.email] || 0) + 1;
  const dupEmails = Object.entries(emailCounts).filter(([, c]) => c > 1);

  // ── Integrity checks per type ──────────────────────────────────────────
  interface Problem {
    id: string;
    email: string;
    name: string;
    role: string;
    account_type: string;
    problema: string;
    acao_sugerida: string;
  }
  const problems: Problem[] = [];
  const inactiveUsers: { id: string; email: string; name: string }[] = [];
  const unknownType: { id: string; email: string; name: string; account_type: string; role: string }[] = [];

  for (const u of users) {
    if (!u.is_active) inactiveUsers.push({ id: u.id, email: u.email, name: u.name });

    const at = u.account_type;
    if (!at) {
      problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at || "",
        problema: "account_type vazio/null", acao_sugerida: "Decisão manual — não corrigir no escuro" });
      continue;
    }
    if (!KNOWN_ACCOUNT_TYPES.includes(at)) {
      unknownType.push({ id: u.id, email: u.email, name: u.name, account_type: at, role: u.role });
      continue;
    }

    if (at === "admin") {
      if (u.role !== "admin") {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: `account_type=admin mas role=${u.role}`, acao_sugerida: "Revisar manualmente (não corrigir automático)" });
      }
      continue; // Admin não precisa de vínculo
    }

    if (at === "agencias") {
      if (!u.agency) {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: "Sem Agency vinculada (agencies.user_id)", acao_sugerida: "Criar Agency própria vinculada a este user_id" });
      }
      continue;
    }

    if (at === "empresas") {
      if (!u.company_id) {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: "users.company_id null", acao_sugerida: "Criar Company própria e preencher company_id" });
      }
      // (company_id apontando pra Company inexistente é checado abaixo, em lote)
      continue;
    }

    if (at === "parceiro") {
      if (!u.partner) {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: "Sem PartnerProfile vinculado (partner_profiles.user_id)", acao_sugerida: "Criar PartnerProfile próprio" });
      }
      continue;
    }

    if (at === "lider") {
      const hasActiveArea = u.lider_areas.some((a) => a.ativo);
      if (!hasActiveArea) {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: u.lider_areas.length === 0 ? "Sem LiderArea nenhuma" : "Tem LiderArea mas nenhuma ativa",
          acao_sugerida: "Criar LiderArea 'Performance' ativa" });
      }
      continue;
    }

    if (at === "nomades") {
      if (!u.nomade) {
        problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: at,
          problema: "Sem Nomade vinculado (nomades.user_id)", acao_sugerida: "Criar Nomade próprio" });
      }
      continue;
    }
  }

  // ── company_id apontando pra Company inexistente (checado em lote) ──────
  const companyIds = [...new Set(users.map((u) => u.company_id).filter((x): x is string => !!x))];
  const existingCompanies = await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true } });
  const existingCompanyIds = new Set(existingCompanies.map((c) => c.id));
  for (const u of users) {
    if (u.company_id && !existingCompanyIds.has(u.company_id)) {
      problems.push({ id: u.id, email: u.email, name: u.name, role: u.role, account_type: u.account_type || "",
        problema: `company_id="${u.company_id}" não existe em companies`, acao_sugerida: "Decisão manual — não corrigir automático" });
    }
  }

  console.log("\n════════════════════════════════════════════════");
  console.log(`PROBLEMAS ENCONTRADOS (${problems.length})`);
  console.log("════════════════════════════════════════════════");
  for (const p of problems) {
    console.log(`- [${p.account_type || "?"}] ${p.email} (${p.name}) id=${p.id}`);
    console.log(`    problema: ${p.problema}`);
    console.log(`    ação sugerida: ${p.acao_sugerida}`);
  }

  console.log(`\nTipos desconhecidos/sem regra (${unknownType.length}):`);
  for (const u of unknownType) {
    console.log(`- ${u.email} (${u.name}) account_type="${u.account_type}" role="${u.role}" id=${u.id}`);
  }

  console.log(`\nE-mails duplicados (${dupEmails.length}):`, dupEmails);

  console.log(`\nUsuários inativos (${inactiveUsers.length}), apenas listados:`);
  for (const u of inactiveUsers) console.log(`- ${u.email} (${u.name}) id=${u.id}`);

  console.log("\n════════════════════════════════════════════════");
  console.log("RESUMO FINAL DA AUDITORIA");
  console.log("════════════════════════════════════════════════");
  console.log("Total usuários:", users.length);
  console.log("Problemas de vínculo (corrigíveis):", problems.filter(p => p.acao_sugerida.startsWith("Criar")).length);
  console.log("Problemas que exigem decisão manual:", problems.filter(p => !p.acao_sugerida.startsWith("Criar")).length);
  console.log("Tipos desconhecidos:", unknownType.length);
  console.log("E-mails duplicados:", dupEmails.length);
  console.log("Inativos (não é problema, só info):", inactiveUsers.length);
}

main()
  .catch((e) => {
    console.error("❌ Erro na auditoria:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
