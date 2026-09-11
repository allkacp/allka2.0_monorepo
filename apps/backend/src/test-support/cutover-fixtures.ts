import crypto from "node:crypto";
import { prisma } from "../lib/prisma";

// Fixtures compartilhadas do simulador de virada (manifesto de retenção +
// plano de domínios) — extraídas de cutover-simulation.integration.test.ts
// para serem reusadas por outros testes de integração (ex.:
// legacy-integrated-proof.integration.test.ts) sem duplicar a fixture.

export function id(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

/** Semeia as 4 contas do manifesto de retenção, com o vínculo estrutural real de cada uma. */
export async function seedRetainedAccounts() {
  const adminProfile = await prisma.adminProfile.create({
    data: { id: id("ap"), name: "Master", is_master: true, is_active: true },
  });

  const cp = await prisma.user.create({
    data: {
      id: id("u-cp"),
      email: "cp@lamego.com.vc",
      password_hash: "x",
      name: "Vinicius Guardia",
      role: "admin",
      account_type: "admin",
      status: "ativo",
      is_active: true,
      admin_profile_id: adminProfile.id,
    },
  });

  // Agency.owner_user_id -> User e User.agency_id -> Agency formam um ciclo de
  // FK: cria o usuário primeiro (sem agency_id), cria a agência apontando pra
  // ele, depois liga o usuário à própria agência (mesmo padrão de dono+membro
  // usado pelos fluxos reais de cadastro de agência).
  const gabrielUserId = id("u-gabriel");
  await prisma.user.create({
    data: {
      id: gabrielUserId,
      email: "gabriel@lamego.com.vc",
      password_hash: "x",
      name: "Gabriel Franco",
      role: "agency_admin",
      account_type: "agencias",
      status: "ativo",
      is_active: true,
    },
  });
  const gabrielAgency = await prisma.agency.create({
    data: { id: id("ag"), name: "Gabriel Franco Agency", owner_user_id: gabrielUserId },
  });
  const gabriel = await prisma.user.update({
    where: { id: gabrielUserId },
    data: { agency_id: gabrielAgency.id },
  });

  const valderioUserId = id("u-valderio");
  await prisma.user.create({
    data: {
      id: valderioUserId,
      email: "valderio@lamego.com.vc",
      password_hash: "x",
      name: "Valdério Santos",
      role: "agency_admin",
      account_type: "agencias",
      status: "ativo",
      is_active: true,
    },
  });
  const valderioAgency = await prisma.agency.create({
    data: { id: id("ag"), name: "Valdério Santos Parcerias", owner_user_id: valderioUserId },
  });
  const valderio = await prisma.user.update({
    where: { id: valderioUserId },
    data: { agency_id: valderioAgency.id },
  });
  const valderioPartnerProfile = await prisma.partnerProfile.create({
    data: { id: id("pp"), agency_id: valderioAgency.id, status: "active" },
  });

  const nomadUserId = id("u-nomad");
  const nomadUser = await prisma.user.create({
    data: {
      id: nomadUserId,
      email: "nomad@allka.com.vc",
      password_hash: "x",
      name: "[TESTE LOCAL] Nômade QA",
      role: "nomad",
      account_type: "nomades",
      status: "ativo",
      is_active: true,
    },
  });
  const nomade = await prisma.nomade.create({
    data: { id: id("nm"), user_id: nomadUserId, name: nomadUser.name, email: "nomad-profile@allka.com.vc" },
  });

  return { adminProfile, cp, gabriel, gabrielAgency, valderio, valderioAgency, valderioPartnerProfile, nomadUser, nomade };
}

/** Ruído representativo: usuário importado, usuário nativo, catalog2 real x [TESTE LOCAL]. */
export async function seedNoise() {
  // Usuário importado (legacy_id preenchido) — deve cair em copiar_legacy.
  await prisma.user.create({
    data: {
      id: id("u-legacy"),
      email: "importado@example.test",
      password_hash: "x",
      name: "Importado da plataforma anterior",
      role: "company_admin",
      account_type: "empresas",
      status: "ativo",
      is_active: true,
      legacy_id: 999001,
    },
  });
  // Usuário nativo, não retido — deve cair em decisao_humana.
  await prisma.user.create({
    data: {
      id: id("u-native"),
      email: "smoke-test@allka.test",
      password_hash: "x",
      name: "Cliente Smoke Test",
      role: "company_admin",
      account_type: "empresas",
      status: "ativo",
      is_active: true,
    },
  });

  // catalog2: 2 produtos reais + 1 marcado [TESTE LOCAL] — devem ser separados.
  await prisma.catalog2Product.create({ data: { id: id("c2p"), slug: id("slug"), internal_name: "Landing Page Essencial" } });
  await prisma.catalog2Product.create({ data: { id: id("c2p"), slug: id("slug"), internal_name: "SEO Mensal" } });
  await prisma.catalog2Product.create({
    data: { id: id("c2p"), slug: id("slug"), internal_name: "[TESTE LOCAL] Produto QA" },
  });
}

/** Conta a quantidade de linhas de TODAS as tabelas do schema atual — usado para provar que uma operação não grava nada (antes/depois idênticos). */
export async function snapshotAllTableCounts(): Promise<Record<string, number>> {
  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
  );
  const counts: Record<string, number> = {};
  for (const { table_name } of tables) {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
      `SELECT COUNT(*) AS c FROM \`${table_name}\``,
    );
    counts[table_name] = Number(rows[0].c);
  }
  return counts;
}
