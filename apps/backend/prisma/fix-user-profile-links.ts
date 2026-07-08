/**
 * fix-user-profile-links.ts
 *
 * Corrige vínculos de perfil faltantes (Agency/Company/PartnerProfile/
 * Nomade/LiderArea) pra usuários órfãos identificados por
 * audit-user-profile-links.ts. Cada usuário ganha SEU PRÓPRIO vínculo —
 * nunca reaproveita o vínculo de outro usuário (nem dos 12 QA principais).
 *
 * Idempotente: rodar duas vezes não duplica nada. Não apaga, não
 * reassocia vínculo existente de outro usuário.
 *
 * Execução: cd apps/backend && npx tsx prisma/fix-user-profile-links.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function nameOrEmailPrefix(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim();
  return email.split("@")[0];
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      account_type: true,
      company_id: true,
      agency: { select: { id: true } },
      partner: { select: { id: true } },
      nomade: { select: { id: true } },
      lider_areas: { select: { id: true, ativo: true } },
    },
  });

  const created = {
    agencies: [] as string[],
    companies: [] as string[],
    partners: [] as string[],
    nomades: [] as string[],
    liderAreas: [] as string[],
  };
  const skipped: string[] = [];

  for (const u of users) {
    const at = u.account_type;
    const displayName = nameOrEmailPrefix(u.name, u.email);

    if (at === "agencias" && !u.agency) {
      // Idempotência extra: confere de novo por user_id antes de criar,
      // caso o script rode em paralelo ou o include acima esteja stale.
      const existing = await prisma.agency.findUnique({ where: { user_id: u.id } });
      if (existing) {
        skipped.push(`Agency já existia (corrida) para ${u.email}`);
        continue;
      }
      const agency = await prisma.agency.create({
        data: {
          user_id: u.id,
          name: displayName,
          email: u.email,
          status: "ativo",
          partner_level: "bronze",
        },
      });
      created.agencies.push(`${u.email} → agency_id=${agency.id} (${displayName})`);
      continue;
    }

    if (at === "empresas" && !u.company_id) {
      // Regra: só cria/preenche se company_id estiver null. Se já houver
      // um valor (mesmo que "inválido", que a auditoria trataria à parte),
      // não mexe.
      const company = await prisma.company.create({
        data: {
          name: displayName,
          email: u.email,
          status: "ativo",
        },
      });
      await prisma.user.update({ where: { id: u.id }, data: { company_id: company.id } });
      created.companies.push(`${u.email} → company_id=${company.id} (${displayName})`);
      continue;
    }

    if (at === "parceiro" && !u.partner) {
      const existing = await prisma.partnerProfile.findUnique({ where: { user_id: u.id } });
      if (existing) {
        skipped.push(`PartnerProfile já existia (corrida) para ${u.email}`);
        continue;
      }
      const partner = await prisma.partnerProfile.create({
        data: {
          user_id: u.id,
          status: "active",
          balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        },
      });
      created.partners.push(`${u.email} → partner_profile_id=${partner.id} (${displayName})`);
      continue;
    }

    if (at === "nomades" && !u.nomade) {
      const existing = await prisma.nomade.findUnique({ where: { user_id: u.id } });
      if (existing) {
        skipped.push(`Nomade já existia (corrida) para ${u.email}`);
        continue;
      }
      const nomade = await prisma.nomade.create({
        data: {
          user_id: u.id,
          name: displayName,
          email: u.email,
          status: "ativo",
        },
      });
      created.nomades.push(`${u.email} → nomad_id=${nomade.id} (${displayName})`);
      continue;
    }

    if (at === "lider") {
      const hasActiveArea = u.lider_areas.some((a) => a.ativo);
      if (!hasActiveArea) {
        const existing = await prisma.liderArea.findFirst({
          where: { user_id: u.id, area_nome: "Performance" },
        });
        if (existing) {
          if (!existing.ativo) {
            await prisma.liderArea.update({ where: { id: existing.id }, data: { ativo: true } });
            created.liderAreas.push(`${u.email} → LiderArea "Performance" reativada (id=${existing.id})`);
          } else {
            skipped.push(`LiderArea "Performance" já ativa (corrida) para ${u.email}`);
          }
          continue;
        }
        const area = await prisma.liderArea.create({
          data: {
            user_id: u.id,
            area_nome: "Performance",
            ativo: true,
            categorias_permitidas: JSON.stringify([]),
            produtos_permitidos: JSON.stringify([]),
          },
        });
        created.liderAreas.push(`${u.email} → LiderArea "Performance" criada (id=${area.id})`);
      }
      continue;
    }
  }

  console.log("════════════════════════════════════════════════");
  console.log("VÍNCULOS CRIADOS");
  console.log("════════════════════════════════════════════════");
  console.log(`\nAgencies (${created.agencies.length}):`);
  created.agencies.forEach((s) => console.log("  -", s));
  console.log(`\nCompanies (${created.companies.length}):`);
  created.companies.forEach((s) => console.log("  -", s));
  console.log(`\nPartnerProfiles (${created.partners.length}):`);
  created.partners.forEach((s) => console.log("  -", s));
  console.log(`\nNomades (${created.nomades.length}):`);
  created.nomades.forEach((s) => console.log("  -", s));
  console.log(`\nLiderAreas (${created.liderAreas.length}):`);
  created.liderAreas.forEach((s) => console.log("  -", s));
  if (skipped.length) {
    console.log(`\nPulados (já existiam, idempotência) (${skipped.length}):`);
    skipped.forEach((s) => console.log("  -", s));
  }

  const total =
    created.agencies.length +
    created.companies.length +
    created.partners.length +
    created.nomades.length +
    created.liderAreas.length;
  console.log(`\nTotal de vínculos criados: ${total}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao corrigir vínculos:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
