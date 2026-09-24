/**
 * baseline-cleanup.ts — leva um banco (local ou do servidor) ao "modelo limpo":
 * só as 16 contas combinadas com o usuário (12 do time + 4 fake), suas
 * empresas/agências/nômade e 2 projetos fake; TODO o resto dos dados
 * operacionais sai. Catálogo catalog2 (produtos, estrutura) e configuração do
 * sistema (admin_profiles, permissões, cursos, termos…) ficam intactos.
 *
 * Tudo roda em UMA transação: qualquer erro (ou violação de FK na verificação
 * final) desfaz tudo — nada fica pela metade.
 *
 * Uso (dentro do container backend/tools; ver .github/workflows/prod-baseline-cleanup.yml):
 *   npx tsx src/scripts/baseline-cleanup.ts                 # dry-run (padrão): só conta, não escreve
 *   npx tsx src/scripts/baseline-cleanup.ts --apply         # aplica
 *
 * Variáveis obrigatórias:
 *   BASELINE_TARGET_ENV        local | production   (nunca inferido do host)
 *   BASELINE_EXPECTED_DB       nome exato do banco na DATABASE_URL
 * Só para --apply em production:
 *   BASELINE_CONFIRM           "APAGAR DADOS DO SERVIDOR"
 *   BASELINE_BACKUP_CONFIRMED  "sim" (o workflow só define depois de gerar e validar um backup)
 * Opcional:
 *   BASELINE_PASSWORD          senha das 16 contas (padrão 123456 — decisão do usuário)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createProjectWithSequentialCode } from "../lib/create-project";

const REAL_EMAILS = [
  "cp@lamego.com.vc",
  "rose@lamego.com.vc",
  "samanta@araujo.com",
  "valderio@lamego.com.vc",
  "reynario@lamego.com.vc",
  "joao@lamego.com",
  "gabriel@lamego.com.vc",
  "marcos@gabriel.com",
  "eron@lamego.com.vc",
  "gabriel.franco@lamego.com.vc",
  "contato@lamego.com.vc",
  "marcelodalbelles@yahoo.com.br",
] as const;
const FAKE_EMAILS = ["company@allka.com.vc", "agency@allka.com.vc", "partner@allka.com.vc", "company2@allka.com.vc"] as const;
const ORDER = [...REAL_EMAILS, ...FAKE_EMAILS];

// Tabelas de escopo global (sem dono específico / sem FK real para conta) que o
// passe de órfãos nunca alcançaria sozinho. Filhos saem por cascata via FK.
const GLOBAL_TABLES = ["system_alerts", "clients", "catalog_tasks", "mandatory_banners", "campaigns", "coupons", "conversations", "catalog2_notification_jobs", "legacy_records"];

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function fail(msg: string): never {
  console.error(`RECUSADO: ${msg}`);
  process.exit(2);
}

function guards() {
  const env = process.env.BASELINE_TARGET_ENV;
  if (env !== "local" && env !== "production") fail("defina BASELINE_TARGET_ENV=local|production explicitamente.");
  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("?")[0].split("/").pop() ?? "";
  if (!process.env.BASELINE_EXPECTED_DB || process.env.BASELINE_EXPECTED_DB !== dbName) {
    fail(`BASELINE_EXPECTED_DB (${process.env.BASELINE_EXPECTED_DB ?? "vazio"}) não bate com o banco da DATABASE_URL (${dbName}).`);
  }
  if (apply && env === "production") {
    if (process.env.BASELINE_CONFIRM !== "APAGAR DADOS DO SERVIDOR") fail('para --apply em production, BASELINE_CONFIRM="APAGAR DADOS DO SERVIDOR".');
    if (process.env.BASELINE_BACKUP_CONFIRMED !== "sim") fail("backup do servidor não confirmado (BASELINE_BACKUP_CONFIRMED=sim).");
  }
  console.log(`Ambiente: ${env} · banco: ${dbName} · modo: ${apply ? "APLICAR" : "dry-run (não escreve)"}`);
}

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function ensureFakes(tx: Tx, hash: string) {
  const mk = async (email: string, name: string, role: string, accountType: string) =>
    tx.user.upsert({
      where: { email },
      update: { password_hash: hash, is_active: true, name },
      create: { email, password_hash: hash, name, role, account_type: accountType, is_active: true },
    });

  const companyUser = await mk("company@allka.com.vc", "Empresa Dev", "company_admin", "empresas");
  const company2User = await mk("company2@allka.com.vc", "[TESTE] Usuário Empresa 2", "company_admin", "empresas");
  const agencyUser = await mk("agency@allka.com.vc", "Agência Dev", "agency_admin", "agencias");
  const partnerUser = await mk("partner@allka.com.vc", "Agência Parceira Dev", "agency_admin", "agencias");

  const company = await tx.company.upsert({
    where: { owner_user_id: companyUser.id },
    update: { name: "[TESTE] Empresa Dev" },
    create: { owner_user_id: companyUser.id, name: "[TESTE] Empresa Dev", type: "empresa", status: "ativo", email: companyUser.email },
  });
  const company2 = await tx.company.upsert({
    where: { owner_user_id: company2User.id },
    update: { name: "[TESTE] Empresa Dev 2" },
    create: { owner_user_id: company2User.id, name: "[TESTE] Empresa Dev 2", type: "empresa", status: "ativo", email: company2User.email },
  });
  const agency = await tx.agency.upsert({
    where: { owner_user_id: agencyUser.id },
    update: { name: "[TESTE] Agência Dev" },
    create: { owner_user_id: agencyUser.id, name: "[TESTE] Agência Dev", status: "ativo", partner_level: "bronze" },
  });
  const partnerAgency = await tx.agency.upsert({
    where: { owner_user_id: partnerUser.id },
    update: { name: "[TESTE] Agência Parceira Dev" },
    create: { owner_user_id: partnerUser.id, name: "[TESTE] Agência Parceira Dev", status: "ativo", partner_level: "gold" },
  });
  await tx.partnerProfile.upsert({
    where: { agency_id: partnerAgency.id },
    update: { status: "active" },
    create: { agency_id: partnerAgency.id, status: "active", balance: 0 },
  });
  // User.company_id/agency_id (vínculo de membro) é a fonte de verdade de escopo — ver project-scope.ts.
  await tx.user.update({ where: { id: companyUser.id }, data: { company_id: company.id } });
  await tx.user.update({ where: { id: company2User.id }, data: { company_id: company2.id } });
  await tx.user.update({ where: { id: agencyUser.id }, data: { agency_id: agency.id } });
  await tx.user.update({ where: { id: partnerUser.id }, data: { agency_id: partnerAgency.id } });

  const ensureProject = async (companyId: string, creator: string, title: string) => {
    const existing = await tx.project.findFirst({ where: { company_id: companyId, title } });
    if (existing) return;
    await createProjectWithSequentialCode(tx as never, { title, status: "draft", lifecycle: "avulso", company_id: companyId, created_by_user_id: creator });
  };
  await ensureProject(company.id, companyUser.id, "[TESTE] Projeto Fake 1");
  await ensureProject(company2.id, company2User.id, "[TESTE] Projeto Fake 2");
}

async function main() {
  guards();
  const password = process.env.BASELINE_PASSWORD || "123456";

  const existing = await prisma.user.findMany({ where: { email: { in: [...ORDER] } }, select: { email: true } });
  const have = new Set(existing.map((u) => u.email));
  const missingReal = REAL_EMAILS.filter((e) => !have.has(e));
  if (missingReal.length) fail(`contas reais ausentes no banco (não invento conta real): ${missingReal.join(", ")}`);
  const missingFakes = FAKE_EMAILS.filter((e) => !have.has(e));

  const totals = await Promise.all(
    ["users", "companies", "agencies", "nomades", "projects", "clients", "system_alerts"].map(async (t) => {
      const r = await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM \`${t}\``);
      return `${t}=${Number(r[0].c)}`;
    }),
  );
  console.log("Hoje no banco:", totals.join(" "));
  console.log("Contas fake a criar:", missingFakes.length ? missingFakes.join(", ") : "(nenhuma, já existem)");

  if (!apply) {
    console.log("dry-run: nada foi escrito. Use --apply (com as confirmações) para aplicar.");
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.$transaction(
    async (tx) => {
      await ensureFakes(tx, hash);

      const users = await tx.user.findMany({
        where: { email: { in: [...ORDER] } },
        select: { id: true, email: true, company_id: true, agency_id: true },
      });
      const keepUsers = users.map((u) => u.id);
      const keepCompanies = new Set<string>();
      const keepAgencies = new Set<string>();
      for (const u of users) {
        if (u.company_id) keepCompanies.add(u.company_id);
        if (u.agency_id) keepAgencies.add(u.agency_id);
        const oc = await tx.company.findUnique({ where: { owner_user_id: u.id }, select: { id: true } });
        const oa = await tx.agency.findUnique({ where: { owner_user_id: u.id }, select: { id: true } });
        if (oc) keepCompanies.add(oc.id);
        if (oa) keepAgencies.add(oa.id);
      }
      const keepNomades = (await tx.nomade.findMany({ where: { user_id: { in: keepUsers } }, select: { id: true } })).map((n) => n.id);

      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");

      const notIn = async (table: string, ids: string[]) => {
        const r = ids.length
          ? await tx.$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE id NOT IN (${ids.map(() => "?").join(",")})`, ...ids)
          : await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``);
        console.log(`  ${table}: apagou ${r} (mantém ${ids.length})`);
      };
      console.log("-- Âncoras --");
      await notIn("users", keepUsers);
      await notIn("companies", [...keepCompanies]);
      await notIn("agencies", [...keepAgencies]);
      await notIn("nomades", keepNomades);
      console.log(`  products (catálogo antigo): apagou ${await tx.$executeRawUnsafe("DELETE FROM `products`")}`);
      console.log(
        `  projects sem dono: apagou ${await tx.$executeRawUnsafe("DELETE FROM `projects` WHERE company_id IS NULL AND agency_id IS NULL AND client_id IS NULL AND partner_id IS NULL")}`,
      );
      for (const t of GLOBAL_TABLES) console.log(`  ${t} (global): apagou ${await tx.$executeRawUnsafe(`DELETE FROM \`${t}\``)}`);

      console.log("-- Órfãos (todo o grafo de FK real) --");
      const fks = await tx.$queryRawUnsafe<{ T: string; C: string; RT: string; RC: string }[]>(
        `SELECT k.TABLE_NAME AS T, k.COLUMN_NAME AS C, k.REFERENCED_TABLE_NAME AS RT, k.REFERENCED_COLUMN_NAME AS RC
         FROM information_schema.KEY_COLUMN_USAGE k WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
      );
      for (let i = 1; i <= 10; i++) {
        let n = 0;
        for (const f of fks) {
          n += Number(
            await tx.$executeRawUnsafe(
              `DELETE t FROM \`${f.T}\` t LEFT JOIN \`${f.RT}\` p ON t.\`${f.C}\` = p.\`${f.RC}\` WHERE t.\`${f.C}\` IS NOT NULL AND p.\`${f.RC}\` IS NULL`,
            ),
          );
        }
        console.log(`  iteração ${i}: ${n} linhas órfãs removidas`);
        if (n === 0) break;
      }

      console.log("-- Verificação (tem que dar zero) --");
      let violations = 0;
      for (const f of fks) {
        const r = await tx.$queryRawUnsafe<{ c: bigint }[]>(
          `SELECT COUNT(*) AS c FROM \`${f.T}\` t LEFT JOIN \`${f.RT}\` p ON t.\`${f.C}\` = p.\`${f.RC}\` WHERE t.\`${f.C}\` IS NOT NULL AND p.\`${f.RC}\` IS NULL`,
        );
        violations += Number(r[0].c);
      }
      if (violations > 0) throw new Error(`${violations} violações de FK após a limpeza — transação desfeita.`);

      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");

      // Libera os códigos antes de renumerar (user_code é único — evita colisão na ordem das atualizações).
      await tx.user.updateMany({ data: { user_code: null } });
      for (let i = 0; i < ORDER.length; i++) {
        await tx.user.update({ where: { email: ORDER[i] }, data: { user_code: `user_${i + 1}`, password_hash: hash } });
      }
      const left = await tx.user.count();
      if (left !== ORDER.length) throw new Error(`esperava ${ORDER.length} usuários, ficaram ${left} — transação desfeita.`);
    },
    { timeout: 30 * 60 * 1000, maxWait: 60 * 1000 },
  );

  const final = await Promise.all(
    ["users", "companies", "agencies", "nomades", "projects", "catalog2_products"].map(async (t) => {
      const r = await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM \`${t}\``);
      return `${t}=${Number(r[0].c)}`;
    }),
  );
  console.log("Resultado final:", final.join(" "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
