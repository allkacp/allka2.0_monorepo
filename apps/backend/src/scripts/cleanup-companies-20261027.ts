/** Limpeza LOCAL autorizada: manter empresas 1/2; usuários são preservados.
 * Simula por padrão. --apply exige backup validado; não roda no boot.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
const KEEP_COMPANY = "cmrp1n92f000bl7ub6mwfl7zu";
const KEEP_AGENCY = "cmscc4i8500lw11fh3fa74uwq";
const REMOVE_COMPANIES = ["cmudf71di0001nhvkuxkvvmfr", "cmuepxunv000b11eadm684q88", "cmuzw6f1g0000m2wc4p4mymnv", "qa-company"];
const REMOVE_NOMADS = ["qa-nomade", "cmrpd0wb000022myes776bnwu"];
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
function check(value: unknown, message: string): asserts value { if (!value) throw Error(`RECUSADO: ${message}`); }
async function protectedState(db: Prisma.TransactionClient) {
  const orderBy = { id: "asc" as const };
  return digest({
    users: await db.user.findMany({ orderBy }),
    keptCompany: await db.company.findUnique({ where: { id: KEEP_COMPANY } }),
    keptAgency: await db.agency.findUnique({ where: { id: KEEP_AGENCY } }),
    partners: await db.partnerProfile.findMany({ orderBy }),
    products: await db.catalog2Product.findMany({ orderBy }),
    versions: await db.catalog2ProductVersion.findMany({ orderBy }),
    tasks: await db.catalog2Task.findMany({ orderBy }),
    steps: await db.catalog2TaskStep.findMany({ orderBy }),
    taskModels: await db.catalog2TaskModel.findMany({ orderBy }),
    stepModels: await db.catalog2StepModel.findMany({ orderBy }),
    clients: await db.client.findMany({ orderBy, include: { links: true } }),
    wallets: await db.wallet.findMany({ orderBy }),
    ledger: await db.walletLedger.findMany({ orderBy }),
  });
}
async function main() {
  const url = new URL(config.DATABASE_URL);
  const rehearsal = process.env.CLEANUP_COMPANIES_REHEARSAL === "true" && url.pathname === "/allka_cleanup_companies_20261027";
  check(config.NODE_ENV !== "production" && ["mysql", "localhost", "127.0.0.1"].includes(url.hostname) && (url.pathname === "/allka" || rehearsal), "somente banco allka LOCAL ou ensaio identificado");
  const companies = await prisma.company.findMany({ orderBy: { sequence_number: "asc" } });
  const agencies = await prisma.agency.findMany();
  const nomads = await prisma.nomade.findMany();
  if (companies.length === 1 && companies[0].id === KEEP_COMPANY && agencies.length === 1 && agencies[0].id === KEEP_AGENCY && nomads.length === 0) {
    console.log("Limpeza já concluída; nada foi alterado."); return;
  }
  check(companies.length === 5 && companies.some(c => c.id === KEEP_COMPANY && c.sequence_number === 2), "empresas fora do escopo previsto");
  check(companies.filter(c => c.id !== KEEP_COMPANY).every(c => REMOVE_COMPANIES.includes(c.id) && c.name.startsWith("[TESTE")), "empresa a remover não reconhecida");
  check(agencies.length === 1 && agencies[0].id === KEEP_AGENCY && agencies[0].sequence_number === 1, "agência preservada divergente");
  check(nomads.length === 2 && nomads.every(n => REMOVE_NOMADS.includes(n.id)), "empresas Nômade fora do escopo");
  check(await prisma.user.count() === 7, "o conjunto dos sete usuários mudou");
  const effects: { target: string; table: string; column: string; rule: string; count: number }[] = [];
  for (const [table, ids] of [["companies", REMOVE_COMPANIES], ["nomades", REMOVE_NOMADS]] as const) {
    const refs = await prisma.$queryRaw<{ t: string; c: string; rule: string }[]>`SELECT k.TABLE_NAME AS t,k.COLUMN_NAME AS c,r.DELETE_RULE AS rule FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r USING(CONSTRAINT_SCHEMA,CONSTRAINT_NAME,TABLE_NAME) WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME=${table}`;
    for (const ref of refs) {
      check(/^[a-zA-Z0-9_]+$/.test(ref.t) && /^[a-zA-Z0-9_]+$/.test(ref.c), "identificador inesperado");
      const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM \`${ref.t}\` WHERE \`${ref.c}\` IN (${ids.map(() => "?").join(",")})`, ...ids);
      const count = Number(rows[0].n);
      if (count) effects.push({ target: table, table: ref.t, column: ref.c, rule: ref.rule, count });
    }
  }
  check(effects.every(e => (e.target === "companies" && e.table === "projects" && e.column === "company_id" && e.rule === "SET NULL" && e.count === 1) || (e.target === "nomades" && e.table === "nomade_habilidades" && e.rule === "CASCADE" && e.count === 6)), "surgiram vínculos adicionais: revisar antes de apagar");
  const projects = await prisma.project.findMany({ orderBy: { id: "asc" } });
  check(projects.filter(p => p.company_id && REMOVE_COMPANIES.includes(p.company_id)).every(p => p.project_code === "proj_952" && p.company_id === "qa-company"), "projeto fora do escopo de teste");
  console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "APLICAR" : "SIMULAR", keep: ["001 — Lamego Academy", "002 — Rose Bonifácio Consultoria e Serviços Ltda."], removeCompanies: companies.filter(c => REMOVE_COMPANIES.includes(c.id)).map(c => ({ id: c.id, number: c.sequence_number, name: c.name })), removeNomads: nomads.map(n => ({ id: n.id, name: n.name })), effects, preserveUsers: 7, preserveProjects: projects.length, nextNumber: 3 }));
  if (!process.argv.includes("--apply")) return;
  const backupPath = process.env.CLEANUP_COMPANIES_BACKUP;
  const sha = process.env.CLEANUP_COMPANIES_BACKUP_SHA256;
  check(backupPath && sha, "backup validado obrigatório");
  const backup = readFileSync(backupPath);
  check(backup.length > 100000 && createHash("sha256").update(backup).digest("hex") === sha.toLowerCase(), "backup divergente");
  check(process.env.CLEANUP_COMPANIES_CONFIRM === "MANTER SOMENTE EMPRESAS 1 E 2", "confirmação específica ausente");
  const before = await protectedState(prisma);
  await prisma.$transaction(async tx => {
    check(await protectedState(tx) === before, "dados mudaram antes da transação");
    for (const c of companies.filter(c => REMOVE_COMPANIES.includes(c.id))) {
      await tx.companyArchive.create({ data: { sequence_number: c.sequence_number, original_company_id: c.id, name: c.name, snapshot: JSON.stringify(c), users_snapshot: "[]", projects_count: projects.filter(p => p.company_id === c.id).length, deleted_by_user_id: "cmormdvqj00005p7xiyt3mcrp" } });
    }
    await tx.company.deleteMany({ where: { id: { in: REMOVE_COMPANIES } } });
    await tx.nomade.deleteMany({ where: { id: { in: REMOVE_NOMADS } } });
    // Metadados do pool antigo não devem fazer o próximo cadastro saltar para 37.
    await tx.companyFreedSequence.deleteMany();
    check(await tx.company.count() === 1 && await tx.agency.count() === 1 && await tx.nomade.count() === 0, "contagem final divergente");
    check(await protectedState(tx) === before, "usuários, matrizes, clientes, carteiras ou empresas mantidas mudaram");
    const afterProjects = await tx.project.findMany({ orderBy: { id: "asc" } });
    const expected = projects.map(p => ({ ...p, company_id: p.company_id && REMOVE_COMPANIES.includes(p.company_id) ? null : p.company_id }));
    check(digest(afterProjects) === digest(expected), "projeto sofreu alteração não prevista");
  }, { isolationLevel: "Serializable", timeout: 60000 });
  await prisma.$executeRawUnsafe("ALTER TABLE companies AUTO_INCREMENT = 3");
  console.log(JSON.stringify({ done: true, companies: 2, users: await prisma.user.count(), protectedSha256: before, projectsPreserved: projects.length, nextNumber: 3 }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
