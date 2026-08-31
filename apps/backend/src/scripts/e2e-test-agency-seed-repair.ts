/**
 * Teste repetível — bloco da Agência/PartnerProfile no seed oficial
 * (prisma/seed.ts). Roda o seed oficial DUAS VEZES de verdade contra o
 * banco local configurado em DATABASE_URL (nunca contra um host remoto —
 * ver assertLocalDatabase) e confirma que:
 * - as duas rodadas terminam com código de saída 0 (o campo obsoleto
 *   "user_id" do model Agency/PartnerProfile foi trocado por
 *   "owner_user_id"/"agency_id", que são os nomes reais no schema atual);
 * - a Agência de exemplo é criada com os campos esperados;
 * - rodar de novo não duplica a Agência nem o PartnerProfile;
 * - a relação PartnerProfile.agency_id aponta pra Agency certa (Partner é
 *   hoje um status da Agency, não de um User separado — ver schema.prisma);
 * - a correção da conta do Líder (lote anterior) continua valendo.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";

const prisma = new PrismaClient({ log: ["warn", "error"] });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(backendRoot, "..", "..");
// Invoca o CLI do tsx via `node <caminho>` em vez de `npx tsx` — no Windows,
// execFileSync não resolve o shim .cmd do npx sem shell:true (spawnSync
// ENOENT), e evitar shell:true aqui não depende de escaping de comando.
const tsxCli = path.resolve(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.error(`  ❌ ${msg}`); process.exitCode = 1; }
function section(msg: string) { console.log(`\n─── ${msg} ${"─".repeat(Math.max(0, 60 - msg.length))}`); }

function runSeedOnce(label: string): boolean {
  section(`Rodando o seed oficial (${label})`);
  try {
    execFileSync(process.execPath, [tsxCli, "prisma/seed.ts"], { cwd: backendRoot, stdio: "pipe" });
    pass(`seed terminou com código de saída 0 (${label})`);
    return true;
  } catch (err) {
    const out = err instanceof Error && "stdout" in err ? String((err as any).stdout) : "";
    fail(`seed falhou (${label}): ${err instanceof Error ? err.message : String(err)}\n${out}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("  TESTE — Reparo do bloco Agência/PartnerProfile no seed");
  console.log("=".repeat(70));

  const { host, database } = assertLocalDatabase(process.env.DATABASE_URL);
  console.log(`🔒 Banco confirmado: host="${host}" database="${database}"`);

  const firstRunOk = runSeedOnce("1ª execução");
  const secondRunOk = runSeedOnce("2ª execução");
  if (!firstRunOk || !secondRunOk) {
    await prisma.$disconnect();
    console.log("\n" + "=".repeat(70));
    console.log("  RESULTADO: FALHOU (seed não terminou com sucesso)");
    console.log("=".repeat(70));
    return;
  }

  section("Agência de exemplo: campos e ausência de duplicação");
  const agencyUser = await prisma.user.findUnique({
    where: { email: "agencia@exemplo.com" },
    select: { id: true },
  });
  if (!agencyUser) {
    fail("usuário agencia@exemplo.com não encontrado");
  } else {
    const agencyCount = await prisma.agency.count({ where: { owner_user_id: agencyUser.id } });
    if (agencyCount === 1) {
      pass("exatamente 1 Agência para agencia@exemplo.com (duas execuções não duplicaram)");
    } else {
      fail(`esperado 1 Agência, encontrado ${agencyCount}`);
    }

    const agency = await prisma.agency.findUnique({ where: { owner_user_id: agencyUser.id } });
    if (agency?.name === "Agência Digital Creative" && agency.partner_level === "gold" && agency.status === "ativo") {
      pass("Agência tem os campos esperados (name, partner_level, status)");
    } else {
      fail(`Agência com dados inesperados: ${JSON.stringify(agency)}`);
    }

    section("PartnerProfile: vínculo com a Agency (não com um User separado)");
    const partnerCount = agency ? await prisma.partnerProfile.count({ where: { agency_id: agency.id } }) : 0;
    if (partnerCount === 1) {
      pass("exatamente 1 PartnerProfile para a Agência (duas execuções não duplicaram)");
    } else {
      fail(`esperado 1 PartnerProfile, encontrado ${partnerCount}`);
    }

    const partner = agency ? await prisma.partnerProfile.findUnique({ where: { agency_id: agency.id } }) : null;
    if (partner?.status === "active" && partner.referral_code === "CARLOS10" && partner.agency_id === agency?.id) {
      pass("PartnerProfile tem os campos e a relação esperados (status, referral_code, agency_id)");
    } else {
      fail(`PartnerProfile com dados inesperados: ${JSON.stringify(partner)}`);
    }
  }

  section("Correção do Líder (lote anterior) continua valendo");
  const leader = await prisma.user.findUnique({
    where: { email: "leader@lamego.com.vc" },
    select: { role: true, account_type: true },
  });
  if (leader?.role === "lider" && leader?.account_type === "lider") {
    pass("leader@lamego.com.vc continua com role/account_type = \"lider\"");
  } else {
    fail(`leader@lamego.com.vc mudou inesperadamente: ${JSON.stringify(leader)}`);
  }

  section("Contas comuns não foram promovidas");
  const admin = await prisma.user.findUnique({
    where: { email: "cp@lamego.com.vc" },
    select: { role: true, account_type: true },
  });
  if (admin?.role === "admin" && admin?.account_type === "admin") {
    pass("cp@lamego.com.vc continua admin — não foi promovido");
  } else {
    fail(`cp@lamego.com.vc mudou inesperadamente: ${JSON.stringify(admin)}`);
  }

  await prisma.$disconnect();

  console.log("\n" + "=".repeat(70));
  console.log(process.exitCode ? "  RESULTADO: FALHOU" : "  RESULTADO: OK");
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exitCode = 1;
});
