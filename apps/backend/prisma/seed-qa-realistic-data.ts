/**
 * seed-qa-realistic-data.ts
 *
 * Base QA realista e organizada: 1 Admin, 3 Agencies, 3 Companies, 3 Partners,
 * 1 Leader, 1 Nomad, e 45 Client/ClientLink reais (5 por Agency/Company/Partner).
 *
 * Idempotente: usa upsert por chave natural (email de usuário, user_id de
 * Agency/PartnerProfile, id fixo de Client) em todos os passos. Rodar de novo
 * atualiza em vez de duplicar. Não apaga nada.
 *
 * Escopo: só toca nos 12 e-mails listados em USER_DEFS e nos 45 Client
 * records com id "qa-real-*" abaixo. Não mexe em Project, financeiro,
 * comissões, saques nem em nenhum Client/Company fora desse conjunto.
 *
 * Execução local:  cd apps/backend && npx tsx prisma/seed-qa-realistic-data.ts
 * Em produção: bloqueado por padrão — exige ALLOW_QA_REALISTIC_SEED_IN_PRODUCTION=true
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_TEST_USER_PASSWORD || "123456";

const stats = {
  usersCreated: [] as string[],
  usersUpdated: [] as string[],
  agencies: [] as string[],
  companies: [] as string[],
  partners: [] as string[],
  clientsCreated: [] as string[],
  clientsUpdated: [] as string[],
  links: [] as string[],
  conflicts: [] as string[],
};

// ─── 1. Usuários ──────────────────────────────────────────────────────────

type UserKind = "admin" | "agency" | "company" | "partner" | "leader" | "nomad";

interface UserDef {
  email: string;
  renameFrom?: string; // se o usuário existir com esse e-mail antigo, renomeia preservando o id
  name: string;
  role: string;
  account_type: string;
  kind: UserKind;
}

const USER_DEFS: UserDef[] = [
  { email: "admin@allka.test", name: "Vinicius Guardia Admin", role: "admin", account_type: "admin", kind: "admin" },
  { email: "agencia@allka.test", name: "Gabriel Franco Agency", role: "agency_admin", account_type: "agencias", kind: "agency" },
  { email: "agencia2@allka.test", name: "Teste 2 Agency", role: "agency_admin", account_type: "agencias", kind: "agency" },
  { email: "agencia3@allka.test", name: "Teste 3 Agency", role: "agency_admin", account_type: "agencias", kind: "agency" },
  { email: "company@allka.test", name: "Rose Bonifácio Company", role: "company_admin", account_type: "empresas", kind: "company" },
  { email: "company2@allka.test", name: "Teste 2 Company", role: "company_admin", account_type: "empresas", kind: "company" },
  { email: "company3@allka.test", name: "Teste 3 Company", role: "company_admin", account_type: "empresas", kind: "company" },
  { email: "partner@allka.test", name: "Valdério Partner", role: "partner", account_type: "parceiro", kind: "partner" },
  { email: "partner2@allka.test", name: "Teste 2 Partner", role: "partner", account_type: "parceiro", kind: "partner" },
  { email: "partner3@allka.test", name: "Teste 3 Partner", role: "partner", account_type: "parceiro", kind: "partner" },
  { email: "leader@allka.test", renameFrom: "lider.performance@allka.test", name: "Maria Brito Leader", role: "lider", account_type: "lider", kind: "leader" },
  { email: "nomad@allka.test", renameFrom: "nomade@allka.test", name: "Reynário Nomad", role: "nomad", account_type: "nomades", kind: "nomad" },
];

async function renameOrUpsertUser(def: UserDef, passwordHash: string) {
  const dataFields = {
    name: def.name,
    role: def.role,
    account_type: def.account_type,
    password_hash: passwordHash,
    is_active: true,
  };

  // 1) Se o e-mail final já existe, só atualiza.
  const existingNew = await prisma.user.findUnique({ where: { email: def.email } });
  if (existingNew) {
    const updated = await prisma.user.update({ where: { id: existingNew.id }, data: dataFields });
    stats.usersUpdated.push(def.email);
    return updated;
  }

  // 2) Se veio de um e-mail antigo (rename) e ele existe, renomeia preservando o id.
  if (def.renameFrom) {
    const existingOld = await prisma.user.findUnique({ where: { email: def.renameFrom } });
    if (existingOld) {
      const updated = await prisma.user.update({
        where: { id: existingOld.id },
        data: { ...dataFields, email: def.email },
      });
      stats.usersUpdated.push(`${def.renameFrom} → ${def.email}`);
      return updated;
    }
  }

  // 3) Senão, cria novo.
  const created = await prisma.user.create({
    data: { email: def.email, ...dataFields },
  });
  stats.usersCreated.push(def.email);
  return created;
}

async function ensureAgency(userId: string, name: string, email: string): Promise<string> {
  const existing = await prisma.agency.findUnique({ where: { user_id: userId } });
  const agency = await prisma.agency.upsert({
    where: { user_id: userId },
    update: { name, email, status: "ativo" },
    create: { user_id: userId, name, email, status: "ativo", partner_level: "bronze" },
  });
  stats.agencies.push(`${agency.id}${existing ? " (atualizada)" : " (criada)"} — ${name}`);
  return agency.id;
}

async function ensurePartner(userId: string): Promise<string> {
  const existing = await prisma.partnerProfile.findUnique({ where: { user_id: userId } });
  const partner = await prisma.partnerProfile.upsert({
    where: { user_id: userId },
    update: { status: "active" },
    create: { user_id: userId, status: "active", balance: 0, total_earned: 0, total_withdrawn: 0 },
  });
  stats.partners.push(`${partner.id}${existing ? " (atualizado)" : " (criado)"}`);
  return partner.id;
}

async function ensureCompany(userId: string, fixedId: string, name: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
  if (user?.company_id) {
    // Já vinculado a uma Company real (ex.: company@allka.test já tinha antes
    // desta feature) — preserva o mesmo id, mas sincroniza nome/email/status
    // com o que é esperado agora. Não troca o id, não cria duplicata.
    await prisma.company.update({
      where: { id: user.company_id },
      data: { name, email, status: "ativo" },
    });
    stats.companies.push(`${user.company_id} (id preservado, dados sincronizados) — ${name}`);
    return user.company_id;
  }
  const existing = await prisma.company.findUnique({ where: { id: fixedId } });
  const company = await prisma.company.upsert({
    where: { id: fixedId },
    update: { name, email, status: "ativo" },
    create: { id: fixedId, name, email, status: "ativo" },
  });
  await prisma.user.update({ where: { id: userId }, data: { company_id: company.id } });
  stats.companies.push(`${company.id}${existing ? " (atualizada)" : " (criada)"} — ${name}`);
  return company.id;
}

// ─── 2. Clientes (entidade Client/ClientLink — não Company legada) ────────

type ScopeKind = "agency" | "company" | "partner";

interface ClientDef {
  idSuffix: string;
  name: string;
  type: "pj" | "pf";
  segment: string;
}

interface OwnerGroup {
  ownerKey: string; // slug curto usado no id fixo do Client
  scopeKind: ScopeKind;
  userEmail: string;
  clients: ClientDef[];
}

const STATUS_CYCLE = ["active", "prospect", "inactive", "active", "prospect"] as const;

const OWNER_GROUPS: OwnerGroup[] = [
  {
    ownerKey: "agency1", scopeKind: "agency", userEmail: "agencia@allka.test",
    clients: [
      { idSuffix: "01", name: "Aurora Foods Brasil", type: "pj", segment: "Alimentação" },
      { idSuffix: "02", name: "Clínica Vita Norte", type: "pj", segment: "Saúde" },
      { idSuffix: "03", name: "Marcos Henrique Lima", type: "pf", segment: "Consultoria" },
      { idSuffix: "04", name: "Studio Bella Forma", type: "pj", segment: "Estética" },
      { idSuffix: "05", name: "TecnoRio Soluções", type: "pj", segment: "Tecnologia" },
    ],
  },
  {
    ownerKey: "agency2", scopeKind: "agency", userEmail: "agencia2@allka.test",
    clients: [
      { idSuffix: "01", name: "Padaria Santa Clara", type: "pj", segment: "Alimentação" },
      { idSuffix: "02", name: "Felipe Andrade Consultoria", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "BlueWave Turismo", type: "pj", segment: "Turismo" },
      { idSuffix: "04", name: "Casa Verde Móveis", type: "pj", segment: "Varejo" },
      { idSuffix: "05", name: "Instituto Prisma", type: "pj", segment: "Educação" },
    ],
  },
  {
    ownerKey: "agency3", scopeKind: "agency", userEmail: "agencia3@allka.test",
    clients: [
      { idSuffix: "01", name: "Mercado Alvorada", type: "pj", segment: "Varejo" },
      { idSuffix: "02", name: "Marina Costa Arquitetura", type: "pj", segment: "Arquitetura" },
      { idSuffix: "03", name: "Prime Fit Academia", type: "pj", segment: "Fitness" },
      { idSuffix: "04", name: "Solar Engenharia", type: "pj", segment: "Engenharia" },
      { idSuffix: "05", name: "Helena Duarte", type: "pf", segment: "Consultoria" },
    ],
  },
  {
    ownerKey: "company1", scopeKind: "company", userEmail: "company@allka.test",
    clients: [
      { idSuffix: "01", name: "Grupo Bonifácio Digital", type: "pj", segment: "Tecnologia" },
      { idSuffix: "02", name: "Rafael Nogueira", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Lotus Estética", type: "pj", segment: "Estética" },
      { idSuffix: "04", name: "Atlas Comércio Exterior", type: "pj", segment: "Comércio Exterior" },
      { idSuffix: "05", name: "Café Monte Azul", type: "pj", segment: "Alimentação" },
    ],
  },
  {
    ownerKey: "company2", scopeKind: "company", userEmail: "company2@allka.test",
    clients: [
      { idSuffix: "01", name: "Delta Saúde Ocupacional", type: "pj", segment: "Saúde" },
      { idSuffix: "02", name: "Bianca Torres", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Nova Era Distribuidora", type: "pj", segment: "Distribuição" },
      { idSuffix: "04", name: "Pixel House Studio", type: "pj", segment: "Design" },
      { idSuffix: "05", name: "Transportes Martins", type: "pj", segment: "Logística" },
    ],
  },
  {
    ownerKey: "company3", scopeKind: "company", userEmail: "company3@allka.test",
    clients: [
      { idSuffix: "01", name: "Agência Florença", type: "pj", segment: "Marketing" },
      { idSuffix: "02", name: "Gustavo Meireles", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Clínica São Bento", type: "pj", segment: "Saúde" },
      { idSuffix: "04", name: "Empório Central", type: "pj", segment: "Varejo" },
      { idSuffix: "05", name: "Orion Tecnologia", type: "pj", segment: "Tecnologia" },
    ],
  },
  {
    ownerKey: "partner1", scopeKind: "partner", userEmail: "partner@allka.test",
    clients: [
      { idSuffix: "01", name: "Valente Seguros", type: "pj", segment: "Seguros" },
      { idSuffix: "02", name: "Júlia Cardoso", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Terraço Eventos", type: "pj", segment: "Eventos" },
      { idSuffix: "04", name: "Alpha Contabilidade", type: "pj", segment: "Contabilidade" },
      { idSuffix: "05", name: "Max Dental Clinic", type: "pj", segment: "Saúde" },
    ],
  },
  {
    ownerKey: "partner2", scopeKind: "partner", userEmail: "partner2@allka.test",
    clients: [
      { idSuffix: "01", name: "Bento & Filhos", type: "pj", segment: "Varejo" },
      { idSuffix: "02", name: "Camila Rocha", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Urban Fit Club", type: "pj", segment: "Fitness" },
      { idSuffix: "04", name: "Celeiro Orgânicos", type: "pj", segment: "Alimentação" },
      { idSuffix: "05", name: "NorteSul Logística", type: "pj", segment: "Logística" },
    ],
  },
  {
    ownerKey: "partner3", scopeKind: "partner", userEmail: "partner3@allka.test",
    clients: [
      { idSuffix: "01", name: "Vinhedo Prime", type: "pj", segment: "Alimentação" },
      { idSuffix: "02", name: "André Carvalho", type: "pf", segment: "Consultoria" },
      { idSuffix: "03", name: "Estrela Beauty", type: "pj", segment: "Estética" },
      { idSuffix: "04", name: "TechMind Labs", type: "pj", segment: "Tecnologia" },
      { idSuffix: "05", name: "Casa Imperial Decor", type: "pj", segment: "Decoração" },
    ],
  },
];

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

function fakeDocument(seq: number, type: "pj" | "pf"): string {
  // Documento sintético, único dentro deste seed (prefixo "91" evita colisão
  // com os 3 clientes QA de produção criados manualmente antes: 92.../93...).
  return type === "pj"
    ? `91${String(seq).padStart(12, "0")}` // 14 dígitos
    : `91${String(seq).padStart(9, "0")}`; // 11 dígitos
}

async function ensureClientLink(clientId: string, scopeKind: ScopeKind, scopeId: string) {
  const field = `${scopeKind}_id` as "agency_id" | "company_id" | "partner_id";
  const existing = await prisma.clientLink.findFirst({ where: { client_id: clientId } });
  if (!existing) {
    await prisma.clientLink.create({
      data: { client_id: clientId, [field]: scopeId, status: "active" },
    });
    stats.links.push(`${clientId} → ${scopeKind}:${scopeId} (criado)`);
    return;
  }
  if ((existing as any)[field] !== scopeId) {
    await prisma.clientLink.update({
      where: { id: existing.id },
      data: { agency_id: null, company_id: null, partner_id: null, [field]: scopeId, status: "active" },
    });
    stats.links.push(`${clientId} → ${scopeKind}:${scopeId} (corrigido)`);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_QA_REALISTIC_SEED_IN_PRODUCTION !== "true") {
    console.error(
      "❌ Bloqueado em produção.\n" +
        "   Para rodar em produção, defina: ALLOW_QA_REALISTIC_SEED_IN_PRODUCTION=true",
    );
    process.exit(1);
  }

  console.log("🌱 Seed QA realista — usuários, Agency/Company/Partner e 45 clientes\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userIdByEmail: Record<string, string> = {};

  console.log("👤 Usuários...");
  for (const def of USER_DEFS) {
    const user = await renameOrUpsertUser(def, passwordHash);
    userIdByEmail[def.email] = user.id;
    console.log(`  ✅ ${def.kind.padEnd(8)} ${def.email} (id=${user.id})`);
  }

  console.log("\n🔗 Vinculando Agency/Company/Partner...");
  const scopeIdByEmail: Record<string, string> = {};

  for (const def of USER_DEFS) {
    const userId = userIdByEmail[def.email];
    if (def.kind === "agency") {
      scopeIdByEmail[def.email] = await ensureAgency(userId, def.name, def.email);
    } else if (def.kind === "company") {
      const fixedCompanyId = `qa-real-${def.email.split("@")[0]}`;
      scopeIdByEmail[def.email] = await ensureCompany(userId, fixedCompanyId, def.name, def.email);
    } else if (def.kind === "partner") {
      scopeIdByEmail[def.email] = await ensurePartner(userId);
    } else if (def.kind === "nomad") {
      // Busca por user_id primeiro (Nomade.user_id é único) — o registro
      // antigo pode ainda estar com o e-mail anterior (ex.: nomade@allka.test).
      const byUserId = await prisma.nomade.findUnique({ where: { user_id: userId } });
      if (byUserId) {
        await prisma.nomade.update({
          where: { id: byUserId.id },
          data: { name: def.name, email: def.email, status: "ativo" },
        });
        console.log(`  ✅ Nomade (atualizado, e-mail sincronizado) → ${def.email}`);
      } else {
        await prisma.nomade.upsert({
          where: { email: def.email },
          update: { user_id: userId, name: def.name, status: "ativo" },
          create: { user_id: userId, name: def.name, email: def.email, status: "ativo" },
        });
        console.log(`  ✅ Nomade (criado) → ${def.email}`);
      }
    } else if (def.kind === "leader") {
      const existingArea = await prisma.liderArea.findFirst({ where: { user_id: userId, area_nome: "Performance" } });
      if (!existingArea) {
        await prisma.liderArea.create({
          data: {
            user_id: userId,
            area_nome: "Performance",
            ativo: true,
            categorias_permitidas: JSON.stringify(["Performance e Anúncios Patrocinados", "Tráfego Pago", "SEO"]),
            produtos_permitidos: JSON.stringify([]),
          },
        });
        console.log(`  ✅ LiderArea (criada) → ${def.email}`);
      } else {
        console.log(`  ✅ LiderArea (já existia) → ${def.email}`);
      }
    }
  }

  console.log("\n📇 Criando/atualizando 45 clientes (Client/ClientLink)...");
  let seq = 1;
  for (const group of OWNER_GROUPS) {
    const scopeId = scopeIdByEmail[group.userEmail];
    if (!scopeId) {
      stats.conflicts.push(`Sem scopeId pra ${group.userEmail} — grupo ${group.ownerKey} pulado`);
      continue;
    }
    for (let i = 0; i < group.clients.length; i++) {
      const c = group.clients[i];
      const id = `qa-real-${group.ownerKey}-client-${c.idSuffix}`;
      const document = fakeDocument(seq, c.type);
      const email = `${slugify(c.name)}@qa.allka.test`;
      const status = STATUS_CYCLE[i % STATUS_CYCLE.length];

      const existing = await prisma.client.findUnique({ where: { id } });
      // Documento pode já existir com outro id em execuções antigas —
      // reporta como conflito em vez de quebrar a unique constraint.
      const docConflict = await prisma.client.findFirst({ where: { document, NOT: { id } } });
      if (docConflict) {
        stats.conflicts.push(`Documento ${document} já usado por outro client (${docConflict.id}) — pulando ${id}`);
        seq++;
        continue;
      }

      const client = await prisma.client.upsert({
        where: { id },
        update: { name: c.name, type: c.type, document, email, segment: c.segment, status },
        create: {
          id, name: c.name, type: c.type, document, email, segment: c.segment, status,
          created_by_user_id: userIdByEmail[group.userEmail],
        },
      });
      if (existing) stats.clientsUpdated.push(client.id);
      else stats.clientsCreated.push(client.id);

      await ensureClientLink(client.id, group.scopeKind, scopeId);
      seq++;
    }
  }

  console.log("\n════════════════════════════════════════════════");
  console.log("RESUMO");
  console.log("════════════════════════════════════════════════");
  console.log(`Usuários criados (${stats.usersCreated.length}):`, stats.usersCreated);
  console.log(`Usuários atualizados (${stats.usersUpdated.length}):`, stats.usersUpdated);
  console.log(`Agencies (${stats.agencies.length}):`);
  stats.agencies.forEach((a) => console.log("  -", a));
  console.log(`Companies (${stats.companies.length}):`);
  stats.companies.forEach((c) => console.log("  -", c));
  console.log(`Partners (${stats.partners.length}):`);
  stats.partners.forEach((p) => console.log("  -", p));
  console.log(`Clients criados: ${stats.clientsCreated.length} | atualizados: ${stats.clientsUpdated.length}`);
  console.log(`ClientLinks tocados: ${stats.links.length}`);
  console.log(`Conflitos (${stats.conflicts.length}):`);
  stats.conflicts.forEach((c) => console.log("  ⚠️ ", c));
  console.log(`\nSenha comum: ${PASSWORD}`);
  console.log("════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed QA realista:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
