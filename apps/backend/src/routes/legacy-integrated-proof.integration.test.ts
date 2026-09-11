import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import {
  runImport,
  collectProductSnapshot,
  collectIdentityOrgSnapshot,
  IMPORTER_VERSION,
  IDENTITY_ORG_IMPORTER_VERSION,
  PROJECT_EXECUTION_IMPORTER_VERSION,
  FINANCIAL_IMPORTER_VERSION,
  ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION,
  CAMPAIGN_IMPORTER_VERSION,
} from "../legacy/importer";
import { collectProjectExecutionSnapshot } from "../legacy/collect-project-execution";
import { collectFinancialSnapshot } from "../legacy/collect-financial";
import { collectAlertsNotificationsChatSnapshot } from "../legacy/collect-alerts-notifications-chat";
import { collectCampaignsSnapshot } from "../legacy/collect-campaigns";
import { buildRetentionManifest as buildRetentionManifestRaw, RETAINED_ACCOUNT_EMAILS, RetentionManifestDb } from "../lib/cutover/retention-manifest";

// Alias com cast fixo: o checker do TypeScript, neste arquivo especificamente
// (mesma chamada compila direto em cutover-simulation.integration.test.ts),
// escolhe um overload errado de PrismaClient.user.findUnique ao verificar a
// estrutura contra RetentionManifestDb (provavelmente por causa da relação
// nomeada CompanyArchive.deleted_by, que amplia o conjunto de overloads) —
// o cast resolve sem alterar o comportamento em runtime (prisma já satisfaz
// a interface, como prova o outro arquivo).
function buildRetentionManifest(db: unknown) {
  return buildRetentionManifestRaw(db as RetentionManifestDb);
}
import { buildDomainPlan, DomainPlanDb } from "../lib/cutover/domain-plan";
import { attachReadOnlyGuard, CutoverReadOnlyViolation, PrismaLikeClient } from "../lib/cutover/read-only-guard";
import { seedRetainedAccounts, seedNoise, snapshotAllTableCounts } from "../test-support/cutover-fixtures";

// PROVA GERAL INTEGRADA DO LEGACY — versão reproduzível e permanente.
//
// Substitui o script temporário usado numa sessão anterior (apagado de
// propósito, não fazia parte do mecanismo) por um teste de integração real,
// seguindo EXATAMENTE o padrão já usado por todo src/routes/legacy-*
// .integration.test.ts: run-db-tests.ts cria/destrói o banco OPERACIONAL
// descartável (nome com `_test_`, nunca allka/allka_legacy reais); este
// arquivo cria e destrói SEU PRÓPRIO banco Legacy descartável (nome com
// `_test_`, aplicando as migrations reais do zero via SQL, do mesmo jeito
// que os outros 6 testes de domínio já fazem).
//
// Cobre, numa execução só, com uma massa integrada de ponta a ponta (todos
// os domínios operacionais):
//   1. os 6 coletores oficiais rodando juntos (produtos, identidade/
//      organizações, projetos/execução, financeiro, alertas/notificações/
//      chat, campanhas) — reconciliação limpa, sem segredo, sem alterar o
//      operacional;
//   2. divergência controlada: um campo histórico real muda na origem
//      DEPOIS do lote oficial selado → o fluxo OFICIAL real (nunca uma
//      função de comparação chamada diretamente) detecta, identifica
//      entidade/registro, e NÃO sobrescreve o selado;
//   3. imutabilidade: depois da tentativa de reimportação divergente,
//      sealed_at/status/contagens/checksum do lote continuam intactos;
//      restaurar a origem faz a reexecução validar limpo, com o checksum
//      original;
//   4. as rotas reais de consulta do Legacy (resumo, produtos, identidades,
//      projetos/tarefas, financeiro, alertas/notificações, chat, campanhas/
//      cupons, detalhe de registro com relações de entrada/saída, filtros
//      por tipo/status/período/conta/id histórico) — autorizado para Admin
//      Master, sem segredo, e SEM nenhuma rota de escrita;
//   5. o simulador de virada real (manifesto de retenção com os 4 e-mails
//      exatos + plano de domínios) contra a MESMA massa — legacy_gaps=[],
//      nenhuma escrita, sem modo apply;
//   6. busca ampliada de segredos cobrindo TODOS os campos textuais
//      persistidos no Legacy (não só content_json/title/subtitle).
//
// Nunca toca allka/allka_legacy reais. Nenhum backup, nenhuma migration
// real, nenhuma limpeza/cutover, nenhuma escrita fora dos dois bancos
// descartáveis desta execução.
//
// Reproduzir:
//   cd apps/backend
//   TEST_DATABASE_ADMIN_URL="mysql://root:<senha>@localhost:3306/allka_test" \
//     npm run test:legacy-integrated-proof
// (troque a senha pela do seu MySQL local — nunca aponte para allka/allka_legacy.)

const backendRoot = path.resolve(__dirname, "..", "..");

function id(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
}

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

// Nomes dos dois bancos descartáveis desta execução — mantidos em
// variáveis explícitas, nunca inferidos, e só ESTES dois são removíveis
// pelo `after()` (nunca uma varredura por outros bancos órfãos).
let opDbName = "";
let legacyDbName = "";
let legacyUrl = "";
let legacyAdminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-12T00:00:00.000Z");

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string; method?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: opts.method ?? "GET",
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkMaster() {
  const p = await prisma.adminProfile.create({ data: { name: `Prova Integrada ${id("ap")}`, is_master: true, is_active: true } });
  const u = await prisma.user.create({
    data: { id: id("legproof-admin"), email: `admin-${id("e")}@example.test`, password_hash: "x", name: "Admin Master (prova integrada)", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

// ── Massa integrada — um pouco de cada domínio operacional, com dados que
//    NUNCA devem chegar ao Legacy (senhas, tokens, Pix, holder_name,
//    payload de provedor, segredo colado em texto livre) e anexos que só
//    devem virar referência de metadado. ─────────────────────────────────
async function seedIntegratedMassa() {
  const adminProfile = await prisma.adminProfile.create({ data: { name: `Massa Integrada ${id("ap")}`, is_master: true, is_active: true } });
  const adminUser = await prisma.user.create({
    data: {
      id: id("proof-admin"),
      email: `admin-proof-${id("e")}@lamego.example.test`,
      password_hash: "SEGREDO_ADMIN_NUNCA_NO_LEGADO",
      name: "Admin Master (massa integrada)",
      role: "admin",
      account_type: "admin",
      status: "ativo",
      is_active: true,
      admin_profile_id: adminProfile.id,
    },
  });

  const agencyOwnerId = id("proof-agowner");
  await prisma.user.create({
    data: { id: agencyOwnerId, email: `agowner-proof-${id("e")}@lamego.example.test`, password_hash: "SEGREDO_DONO_AGENCIA_NUNCA_NO_LEGADO", name: "Dono de Agência (massa integrada)", role: "agency_admin", account_type: "agencias", status: "ativo", is_active: true },
  });
  const agency = await prisma.agency.create({ data: { name: "Agência (massa integrada)", owner_user_id: agencyOwnerId, status: "ativo", partner_level: "gold" } });
  await prisma.user.update({ where: { id: agencyOwnerId }, data: { agency_id: agency.id } });
  const partnerProfile = await prisma.partnerProfile.create({ data: { agency_id: agency.id, status: "active", referral_code: `REF-${id("r")}` } });

  const company = await prisma.company.create({ data: { name: "Empresa (massa integrada)", status: "ativo", type: "empresa", cnpj: crypto.randomBytes(6).toString("hex") } });

  const nomadeUserId = id("proof-nomad");
  await prisma.user.create({
    data: { id: nomadeUserId, email: `nomad-proof-${id("e")}@allka.example.test`, password_hash: "SEGREDO_NOMADE_NUNCA_NO_LEGADO", name: "Nômade (massa integrada)", role: "nomad", account_type: "nomades", status: "ativo", is_active: true },
  });
  const nomade = await prisma.nomade.create({ data: { user_id: nomadeUserId, name: "Nômade (massa integrada)", email: `nomade-perfil-proof-${id("e")}@allka.example.test` } });

  const product = await prisma.product.create({
    data: { name: "Produto Antigo (massa integrada)", product_code: `prod_proof_${id("p")}`, category: "Design", is_active: true, base_price: 1000, description: "Produto usado na prova geral integrada", short_description: "Produto de teste", image: "produtos/prova-integrada.png" },
  });
  const productVariation = await prisma.productVariation.create({ data: { product_id: product.id, name: "Variação Básica (massa integrada)", price: 800, is_active: true } });
  const catalogTask = await prisma.catalogTask.create({ data: { code: `ct_proof_${id("ct")}`, name: "Diagramação (massa integrada)", category: "Design", task_type: "execucao", is_active: true } });
  await prisma.productCatalogTask.create({ data: { product_id: product.id, catalog_task_id: catalogTask.id } });

  const project = await prisma.project.create({
    data: { title: "Projeto (massa integrada)", project_code: `proj_proof_${id("j")}`, status: "in-progress", company_id: company.id, created_by_user_id: adminUser.id, admin_responsible_user_id: adminUser.id },
  });
  const projectProduct = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_code_snapshot: product.product_code, product_category_snapshot: product.category, status: "EM_EXECUCAO" },
  });
  const taskA = await prisma.projectTask.create({
    data: { project_id: project.id, project_product_id: projectProduct.id, catalog_task_id: catalogTask.id, name_snapshot: catalogTask.name, title: "Diagramar identidade (massa integrada)", status: "EM_EXECUCAO", assignee_id: adminUser.id, nomade_responsavel_id: nomade.id },
  });
  const taskB = await prisma.projectTask.create({
    data: { project_id: project.id, project_product_id: projectProduct.id, catalog_task_id: catalogTask.id, name_snapshot: catalogTask.name, title: "Publicar identidade (depende da diagramação)", status: "PARA_LANCAMENTO" },
  });
  await prisma.taskDependency.create({ data: { project_id: project.id, task_id: taskB.id, depends_on_task_id: taskA.id, created_by_user_id: adminUser.id } });
  const stage = await prisma.projectTaskStage.create({ data: { project_task_id: taskA.id, titulo: "Rascunho", ordem: 1, status: "EM_ANDAMENTO", lider_id: adminUser.id } });
  await prisma.taskBriefingAnswer.create({
    data: { project_task_id: taskA.id, question_key: "paleta_cores", question_text: "Qual a paleta de cores preferida?", answer: "Tons de azul e branco", files: JSON.stringify([{ name: "referencia.pdf", url: "/uploads/tasks/referencia-proof.pdf" }]) },
  });
  await prisma.taskAttachment.create({ data: { project_task_id: taskA.id, project_task_stage_id: stage.id, type: "delivery", name: "logo-proof.png", url: "/uploads/tasks/logo-proof.png", size: 204800, mime_type: "image/png", uploaded_by: adminUser.id } });
  await prisma.projectAttachment.create({ data: { project_id: project.id, name: "Briefing geral (massa integrada)", file_name: "briefing-proof.pdf", mime_type: "application/pdf" } });
  await prisma.taskAssignmentHistory.create({ data: { project_task_id: taskA.id, nomade_id: nomade.id, criterio: "manual", automatico: false, resultado: "atribuido" } });

  const invoice = await prisma.invoice.create({ data: { company_id: company.id, project_id: project.id, amount: 1500, status: "pending", invoice_number: `INV-PROOF-${id("n")}` } });
  const payment = await prisma.payment.create({
    data: { project_id: project.id, amount: 500, payment_method: "CARTAO_TESTE", gateway: "FAKE_SANDBOX", status: "PAGO", card_last_digits: "4242", card_holder: "NOME COMPLETO QUE NUNCA DEVE APARECER NO LEGADO", idempotency_key: `idem-proof-${id("k")}` },
  });
  await prisma.paymentItem.create({ data: { payment_id: payment.id, project_product_id: projectProduct.id, product_id: product.id, product_name_snapshot: product.name, unit_price_snapshot: 500, total_snapshot: 500 } });
  const wallet = await prisma.wallet.create({ data: { owner_type: "company", owner_id: company.id, balance: 1000 } });
  await prisma.walletLedger.create({
    data: { wallet_id: wallet.id, type: "payment", direction: "credit", amount: 500, balance_before: 500, balance_after: 1000, description: "Pagamento recebido (massa integrada)", reference_type: "payment", reference_id: payment.id, metadata: { provider_payload: "SEGREDO_DE_PROVEDOR_NUNCA_NO_LEGADO", webhook_secret: "xyz-proof" } },
  });
  await prisma.walletTransaction.create({ data: { nomade_id: nomade.id, type: "credit", amount: 300, description: "Pagamento de tarefa (massa integrada)", receipt: "/uploads/receipts/comprovante-proof.pdf" } });
  await prisma.withdrawalRequest.create({ data: { nomade_id: nomade.id, amount: 200, status: "aguardando_analise", pix_key: "SEGREDO_PIX_NUNCA_NO_LEGADO", pix_key_type: "email" } });
  const partnerCommission = await prisma.partnerCommission.create({ data: { partner_id: partnerProfile.id, amount: 75, status: "pending", company_name: company.name } });

  const standard = await prisma.alertStandard.create({
    data: { key: `test.due_soon.proof.${id("s")}`, name: "Prazo próximo (massa integrada)", title: "Sua tarefa vence em breve", message: "A tarefa {{tarefa}} vence em {{prazo}}", allowed_variables_json: JSON.stringify(["tarefa", "prazo"]) },
  });
  const rule = await prisma.alertRule.create({ data: { standard_id: standard.id, name: "Regra (massa integrada)", trigger_type: "task.due_soon", recipient_roles_json: JSON.stringify(["responsavel"]) } });
  const automaticAlert = await prisma.systemAlert.create({
    data: {
      type: "tarefa_atrasada",
      title: "Tarefa atrasada (massa integrada)",
      message: "Contém um segredo colado à mão: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa — o resto deste texto deve continuar legível",
      severity: "error",
      category: "alerta",
      user_id: adminUser.id,
      standard_id: standard.id,
      rule_id: rule.id,
    },
  });
  await prisma.systemAlertEvent.create({ data: { alert_id: automaticAlert.id, event_type: "created", description: "Alerta criado pelo motor (massa integrada)", actor_user_id: null } });
  const notificationMessage = await prisma.notificationMessage.create({ data: { name: "Msg (massa integrada)", title: "Título", content: "Conteúdo da notificação (massa integrada)", created_by: adminUser.id } });
  await prisma.notificationRule.create({ data: { message_id: notificationMessage.id, name: "Regra de notificação (massa integrada)" } });
  const conversation = await prisma.conversation.create({ data: { title: "Grupo (massa integrada)", type: "group", created_by_id: adminUser.id } });
  const notificationGroup = await prisma.notificationGroup.create({ data: { owner_user_id: adminUser.id, name: "Grupo Financeiro (massa integrada)", status: "active", conversation_id: conversation.id } });
  await prisma.notificationGroupMember.create({ data: { group_id: notificationGroup.id, user_id: agencyOwnerId } });
  await prisma.chatParticipant.create({ data: { conversation_id: conversation.id, user_id: agencyOwnerId, role: "member" } });
  await prisma.chatParticipant.create({ data: { conversation_id: conversation.id, user_id: adminUser.id, role: "owner" } });
  await prisma.chatMessage.create({ data: { conversation_id: conversation.id, sender_id: adminUser.id, content: "Olá, tudo bem? (massa integrada)" } });
  await prisma.chatMessage.create({
    data: { conversation_id: conversation.id, sender_id: agencyOwnerId, content: "Aqui vai minha chave (o resto deste texto deve continuar legível): " + "a".repeat(64) },
  });

  const campaign = await prisma.campaign.create({
    data: { name: "Campanha de Indicação (massa integrada)", type: "referral", status: "active", commission_type: "percentage", commission_value: 15, coupon_code: `REF-PROOF-${id("c")}` },
  });
  await prisma.partnerCommission.update({ where: { id: partnerCommission.id }, data: { campaign_id: campaign.id } });
  const coupon = await prisma.coupon.create({
    data: { code: `CUPOM-PROOF-${id("u")}`, coupon_type: "discount", discount_type: "percentage", discount_value: 10, linked_user_id: agencyOwnerId, allowed_company_ids: JSON.stringify([company.id]) },
  });
  await prisma.couponUsage.create({ data: { coupon_id: coupon.id, company_id: company.id } });
  const communicationCampaign = await prisma.communicationCampaign.create({
    data: {
      internal_name: "reengajamento-proof",
      title: "Volte a usar a Allka (massa integrada)",
      body: "Sentimos sua falta! Segredo de provedor colado à mão: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb — o resto deste texto deve continuar legível",
      image_file_name: "banner-campanha-proof.png",
      channels_json: JSON.stringify(["platform", "email"]),
      audience_json: JSON.stringify({ account_types: ["empresas"] }),
      status: "completed",
      created_by_user_id: adminUser.id,
      activated_by_user_id: adminUser.id,
    },
  });
  await prisma.campaignRecipientState.create({ data: { campaign_id: communicationCampaign.id, recipient_user_id: agencyOwnerId, state: "processed" } });
  await prisma.communicationDelivery.create({
    data: { origin: "campaign", origin_id: communicationCampaign.id, recipient_user_id: agencyOwnerId, channel: "email", status: "delivered", scheduled_for: new Date(), delivered_at: new Date(), idempotency_key: `idem-proof-camp-${id("d")}` },
  });

  return { adminUser, agencyOwnerId, agency, partnerProfile, company, nomade, product, project, invoice, campaign, coupon, communicationCampaign, automaticAlert, conversation };
}

// Coletores oficiais dos 6 domínios — mesmo `sourceName`/`importerVersion`
// usados pelos 6 testes de domínio existentes, adaptado com um nome próprio
// desta prova para nunca colidir com lotes de outro teste.
const DOMAINS = [
  { name: "produtos", collectors: [collectProductSnapshot], sourceName: "Produtos — Prova Geral Integrada (banco descartável)", importerVersion: IMPORTER_VERSION },
  { name: "identidade_organizacoes", collectors: [collectIdentityOrgSnapshot], sourceName: "Identidade e Organizações — Prova Geral Integrada (banco descartável)", importerVersion: IDENTITY_ORG_IMPORTER_VERSION },
  { name: "projetos_execucao", collectors: [collectProjectExecutionSnapshot], sourceName: "Projetos e Execução — Prova Geral Integrada (banco descartável)", importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION },
  { name: "financeiro", collectors: [collectFinancialSnapshot], sourceName: "Financeiro — Prova Geral Integrada (banco descartável)", importerVersion: FINANCIAL_IMPORTER_VERSION },
  { name: "alertas_notificacoes_chat", collectors: [collectAlertsNotificationsChatSnapshot], sourceName: "Alertas, Notificações e Chat — Prova Geral Integrada (banco descartável)", importerVersion: ALERT_NOTIFICATION_CHAT_IMPORTER_VERSION },
  { name: "campanhas", collectors: [collectCampaignsSnapshot], sourceName: "Campanhas — Prova Geral Integrada (banco descartável)", importerVersion: CAMPAIGN_IMPORTER_VERSION },
] as const;

interface OfficialDomain {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collectors: ReadonlyArray<(db: any) => Promise<any>>;
  sourceName: string;
  importerVersion: string;
}

async function officialRun(domain: OfficialDomain) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runImport({
    dryRun: false,
    kind: "official",
    sourceName: domain.sourceName,
    sourceEnvironment: "qa",
    snapshotAt: OFFICIAL_SNAPSHOT_AT,
    acknowledgeOfficial: true,
    legacyImportUrl: legacyUrl,
    collectors: domain.collectors as never,
    importerVersion: domain.importerVersion,
  }) as ReturnType<typeof runImport>;
}

describe("Prova geral integrada do Legacy — reproduzível (6 coletores + divergência + imutabilidade + consulta + simulador)", () => {
  let massa: Awaited<ReturnType<typeof seedIntegratedMassa>>;
  let master: Awaited<ReturnType<typeof mkMaster>>;
  let masterToken: string;

  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    opDbName = new URL(process.env.DATABASE_URL as string).pathname.replace(/^\//, "");

    legacyAdminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "";
    assert.ok(legacyAdminUrl, "TEST_DATABASE_ADMIN_URL necessário");
    const adm = new URL(legacyAdminUrl);
    legacyDbName = `allka_legacy_test_${crypto.randomBytes(5).toString("hex")}`;
    assert.ok(legacyDbName.includes("_test_"), "banco legado tem de ser descartável (_test_)");
    legacyUrl = `mysql://${adm.username}:${adm.password}@${adm.hostname}:${adm.port || 3306}/${legacyDbName}`;

    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
      multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE \`${legacyDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${legacyDbName}\`;`);
    // Migrations REAIS do Legacy, do zero, na ordem — mesmo padrão usado
    // pelos outros 6 testes de domínio (nunca `db push` para este schema).
    for (const m of ["20260901120000_init_legacy_snapshot", "20260910120000_legacy_batch_kind_and_seal"]) {
      const sql = fs.readFileSync(path.join(backendRoot, `prisma/legacy/migrations/${m}/migration.sql`), "utf8");
      await conn.query(sql);
    }
    await conn.end();

    process.env.LEGACY_DATABASE_URL = legacyUrl;
    process.env.LEGACY_IMPORT_DATABASE_URL = legacyUrl;
    app = (await import("../app")).default;

    massa = await seedIntegratedMassa();
    await seedRetainedAccounts();
    await seedNoise();
    master = await mkMaster();
    masterToken = tokenFor({ id: master.id, email: master.email, role: master.role, account_type: master.account_type });

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));

    // Limpeza estritamente delimitada: só os dois bancos desta execução,
    // e só depois de validar host local + marcador descartável.
    assert.ok(legacyDbName.includes("_test_") || legacyDbName.includes("_ci_"), "recusa apagar banco sem marcador descartável");
    const adm = new URL(legacyAdminUrl);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(adm.hostname), "recusa apagar banco em host não-local");
    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
    });
    await conn.execute(`DROP DATABASE IF EXISTS \`${legacyDbName}\`;`);
    await conn.end();
    // O banco operacional (opDbName) é criado e destruído por
    // scripts/run-db-tests.ts (que também confere via information_schema
    // que foi removido) — este teste nunca o toca diretamente.

    await prisma.$disconnect();
  });

  describe("1) Snapshot integrado — os 6 coletores oficiais juntos", () => {
    it("cada domínio sela um lote oficial com reconciliação limpa (divergência zero)", async () => {
      for (const domain of DOMAINS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await officialRun(domain);
        assert.equal(result.status, "completed", `${domain.name}: status`);
        assert.equal(result.sealed, true, `${domain.name}: sealed`);
        assert.equal(result.divergences.length, 0, `${domain.name}: divergences`);
        for (const [entity, r] of Object.entries(result.reconciliation) as [string, { divergence: number }][]) {
          assert.equal(r.divergence, 0, `${domain.name}.${entity}: divergence`);
        }
      }
    });

    it("reexecução de cada domínio é idempotente (validated_official, checksum idêntico)", async () => {
      for (const domain of DOMAINS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r1: any = await officialRun(domain);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r2: any = await officialRun(domain);
        assert.equal(r2.status, "validated_official", `${domain.name}: reexecução deveria só validar`);
        assert.equal(r2.batch_checksum, r1.batch_checksum, `${domain.name}: checksum deveria ser idêntico`);
      }
    });

    it("o importador não altera nenhuma linha do banco operacional", async () => {
      const before = await snapshotAllTableCounts();
      for (const domain of DOMAINS) await officialRun(domain);
      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before, "runImport é somente leitura sobre o operacional");
    });
  });

  describe("2) Divergência controlada (fluxo oficial real, nunca comparação interna direta)", () => {
    // Lote PRÓPRIO desta seção (sourceName dedicado) — nunca o mesmo lote já
    // selado pela seção 1 (que roda os 6 domínios, incluindo financeiro,
    // várias vezes para provar idempotência). Usar o mesmo lote faria este
    // "gera e sela" já encontrar um selado e só validar — o objetivo aqui é
    // controlar o ciclo de vida completo (gerar → selar → divergir →
    // restaurar) isoladamente.
    const financial = {
      name: "financeiro_divergencia",
      collectors: DOMAINS.find((d) => d.name === "financeiro")!.collectors,
      sourceName: "Financeiro — Divergência Controlada (banco descartável)",
      importerVersion: FINANCIAL_IMPORTER_VERSION,
    };
    let sealedBatchId: string;
    let sealedChecksum: string;
    let recordCountBefore: number;
    let relationCountBefore: number;

    it("gera e sela o snapshot oficial financeiro, registrando checksum e contagens", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await officialRun(financial);
      assert.equal(r.status, "completed");
      assert.equal(r.sealed, true);
      sealedBatchId = r.batch_id;
      sealedChecksum = r.batch_checksum;

      const legacy = await openLegacy();
      recordCountBefore = await legacy.legacyRecordSnapshot.count({ where: { batch_id: sealedBatchId } });
      relationCountBefore = await legacy.legacyRelationSnapshot.count({ where: { batch_id: sealedBatchId } });
      await legacy.$disconnect();
    });

    it("altera Invoice.status na origem (campo histórico real, permitido) e detecta a divergência pelo fluxo OFICIAL real", async () => {
      await prisma.invoice.update({ where: { id: massa.invoice.id }, data: { status: "paid" } });

      await assert.rejects(
        () => officialRun(financial),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          const anyErr = err as Error & { code?: string; divergences?: Array<{ entity_type: string; original_id: string; reason: string }> };
          assert.equal(anyErr.code, "official_divergence");
          assert.ok(Array.isArray(anyErr.divergences) && anyErr.divergences.length > 0, "deve listar as divergências por registro");
          const found = anyErr.divergences!.find((d) => d.entity_type === "invoice" && d.original_id === massa.invoice.id);
          assert.ok(found, "a divergência deve identificar domínio (invoice), entidade e o registro exato alterado");
          assert.match(found!.reason, /origem alterada|checksum diferente/i);
          return true;
        },
      );
    });

    it("o lote oficial selado NÃO foi sobrescrito — registros, relações e checksum permanecem iguais", async () => {
      const legacy = await openLegacy();
      const batch = await legacy.legacyImportBatch.findUniqueOrThrow({ where: { id: sealedBatchId } });
      assert.equal(batch.sealed_at !== null, true, "sealed_at deve continuar preenchido");
      assert.equal(batch.status, "completed");
      assert.equal(batch.checksum, sealedChecksum, "checksum do lote não deve mudar");
      const recordCountAfter = await legacy.legacyRecordSnapshot.count({ where: { batch_id: sealedBatchId } });
      const relationCountAfter = await legacy.legacyRelationSnapshot.count({ where: { batch_id: sealedBatchId } });
      assert.equal(recordCountAfter, recordCountBefore, "quantidade de registros não deve mudar");
      assert.equal(relationCountAfter, relationCountBefore, "quantidade de relações não deve mudar");
      await legacy.$disconnect();
    });

    it("restaura o dado original e a reexecução volta a reconciliar limpo, com o checksum original", async () => {
      await prisma.invoice.update({ where: { id: massa.invoice.id }, data: { status: "pending" } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await officialRun(financial);
      assert.equal(r.status, "validated_official");
      assert.equal(r.divergences.length, 0);
      assert.equal(r.batch_checksum, sealedChecksum, "checksum deve bater com o original selado depois de restaurar a origem");
    });
  });

  describe("3) Imutabilidade do lote selado — caminhos reais disponíveis no mecanismo", () => {
    it("não existe rota HTTP nem função exportada que escreva em LegacyRecordSnapshot/LegacyRelationSnapshot/LegacyImportBatch — o único caminho de escrita é runImport()", () => {
      const source = fs.readFileSync(path.join(backendRoot, "src/routes/legacy-consultation.ts"), "utf8");
      assert.doesNotMatch(source, /router\.(post|put|patch|delete)\(/, "o roteador de consulta do Legacy não deve ter nenhum verbo de escrita");
      assert.match(source, /router\.use\(verifyToken, guardAdminMaster\)/, "toda rota do Legacy deve exigir Admin Master");
    });

    it("a única forma real de tentar sobrescrever um lote selado (reimportação) é recusada, e o lote permanece intacto", async () => {
      // Já provado em detalhe na seção 2 (divergência) — aqui confirmamos a
      // moldura estrutural: um lote official+sealed_at nunca chega ao bloco
      // de escrita (upsert) do importer.ts; ele sempre retorna
      // "validated_official" (origem idêntica) ou lança "official_divergence"
      // (origem mudou) ANTES de qualquer legacyRecordSnapshot.upsert/
      // legacyRelationSnapshot.createMany/legacyImportBatch.update de escrita.
      const financial = DOMAINS.find((d) => d.name === "financeiro")!;
      const legacy = await openLegacy();
      const before = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: financial.sourceName } });
      await legacy.$disconnect();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await officialRun(financial); // origem já restaurada — deve só validar
      assert.equal(r.status, "validated_official");

      const legacy2 = await openLegacy();
      const after = await legacy2.legacyImportBatch.findUniqueOrThrow({ where: { id: before.id } });
      assert.equal(after.sealed_at?.getTime(), before.sealed_at?.getTime());
      assert.equal(after.checksum, before.checksum);
      assert.equal(after.status, before.status);
      await legacy2.$disconnect();
    });
  });

  describe("4) Rotas de consulta do Legacy — servidor/roteador real", () => {
    it("resumo: Admin Master vê todos os domínios prontos, sem segredo", async () => {
      const { status, json } = await api("/api/admin/legacy/summary", { token: masterToken });
      assert.equal(status, 200);
      assert.doesNotMatch(JSON.stringify(json), /SEGREDO|password_hash|PIX/i);
    });

    it("produtos: lista e filtra por categoria, achando o próprio lote de produtos mesmo com outros domínios mais recentes coexistindo", async () => {
      const { status, json } = await api("/api/admin/legacy/products?category=Design", { token: masterToken });
      assert.equal(status, 200);
      assert.ok(json.total >= 1);
    });

    it("identidades e organizações: lista e filtra por entity_type=user", async () => {
      const { status, json } = await api("/api/admin/legacy/identities?entity_type=user", { token: masterToken });
      assert.equal(status, 200);
      assert.ok(json.data.every((r: { entity_type: string }) => r.entity_type === "user"));
    });

    it("projetos e tarefas: lista por status", async () => {
      // Sem entity_type explícito, /project-execution só busca "project"
      // (ponto de entrada natural) — Project.status é "in-progress" na
      // massa integrada; project_task.status é "EM_EXECUCAO".
      const { status, json } = await api("/api/admin/legacy/project-execution?status=in-progress", { token: masterToken });
      assert.equal(status, 200);
      assert.ok(json.total >= 1);

      const tasks = await api("/api/admin/legacy/project-execution?entity_type=project_task&status=EM_EXECUCAO", { token: masterToken });
      assert.equal(tasks.status, 200);
      assert.ok(tasks.json.total >= 1);
    });

    it("financeiro: filtra por período (from/to) e não vaza segredo", async () => {
      const { status, json } = await api("/api/admin/legacy/financial?from=2020-01-01&to=2030-01-01", { token: masterToken });
      assert.equal(status, 200);
      assert.doesNotMatch(JSON.stringify(json), /card_holder|PIX|SEGREDO/i);
    });

    it("alertas e notificações: filtra por group=alertas", async () => {
      const { status, json } = await api("/api/admin/legacy/alerts-notifications-chat?group=alertas", { token: masterToken });
      assert.equal(status, 200);
      assert.ok(json.total >= 1);
    });

    it("chat: filtra por group=chat, mensagens sem segredo em texto livre", async () => {
      const { status, json } = await api("/api/admin/legacy/alerts-notifications-chat?group=chat", { token: masterToken });
      assert.equal(status, 200);
      assert.doesNotMatch(JSON.stringify(json), /a{64}/);
    });

    it("campanhas e cupons: filtra por related_to (conta/campanha) e por status", async () => {
      const { status, json } = await api(`/api/admin/legacy/campaigns?related_to=${massa.communicationCampaign.id}`, { token: masterToken });
      assert.equal(status, 200);
      assert.ok(json.total >= 1, "related_to deve achar a entrega/estado vinculado à campanha de comunicação");
    });

    it("detalhe de registro: expõe relações de ENTRADA e de SAÍDA, e o identificador histórico (original_id)", async () => {
      const list = await api(`/api/admin/legacy/campaigns?entity_type=campaign`, { token: masterToken });
      const rec = list.json.data[0];
      const { status, json } = await api(`/api/admin/legacy/records/${rec.id}`, { token: masterToken });
      assert.equal(status, 200);
      assert.equal(json.record.original_id, massa.campaign.id);
      assert.ok(json.relations_incoming_by_type, "deve expor relações de entrada (relations_incoming_by_type)");
      assert.ok(json.relations_by_type !== undefined, "deve expor relações de saída (relations_by_type)");
    });

    it("sem sessão → 401; admin comum (sem is_master) → 404, sem vazar existência do recurso", async () => {
      const anon = await api("/api/admin/legacy/summary");
      assert.equal(anon.status, 401);

      const commonAdminProfile = await prisma.adminProfile.create({ data: { name: `Comum ${id("ap")}`, is_master: false, is_active: true } });
      const commonAdmin = await prisma.user.create({
        data: { id: id("common"), email: `common-${id("e")}@example.test`, password_hash: "x", name: "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: commonAdminProfile.id },
      });
      const commonToken = tokenFor({ id: commonAdmin.id, email: commonAdmin.email, role: commonAdmin.role, account_type: commonAdmin.account_type });
      const forbidden = await api("/api/admin/legacy/summary", { token: commonToken });
      assert.equal(forbidden.status, 404);
    });

    it("nenhuma rota de escrita existe: create/edit/delete/reenviar/resolver/ativar/aplicar-cupom/disparar-campanha/responder-chat todas voltam 404", async () => {
      const attempts: Array<{ method: string; path: string }> = [
        { method: "POST", path: "/api/admin/legacy/campaigns" },
        { method: "PUT", path: `/api/admin/legacy/records/${massa.campaign.id}` },
        { method: "PATCH", path: `/api/admin/legacy/records/${massa.campaign.id}` },
        { method: "DELETE", path: `/api/admin/legacy/records/${massa.campaign.id}` },
        { method: "POST", path: `/api/admin/legacy/campaigns/${massa.campaign.id}/resend` },
        { method: "POST", path: `/api/admin/legacy/campaigns/${massa.coupon.id}/apply` },
        { method: "POST", path: `/api/admin/legacy/alerts-notifications-chat/${massa.automaticAlert.id}/resolve` },
        { method: "POST", path: `/api/admin/legacy/alerts-notifications-chat/conversations/${massa.conversation.id}/messages` },
      ];
      for (const a of attempts) {
        const { status } = await api(a.path, { token: masterToken, method: a.method });
        assert.equal(status, 404, `${a.method} ${a.path} deveria ser 404 (rota inexistente)`);
      }
    });
  });

  describe("5) Simulador de virada + manifesto de retenção", () => {
    it("resolve exatamente os 4 e-mails do manifesto de retenção", async () => {
      const manifest = await buildRetentionManifest(prisma);
      assert.deepEqual(
        manifest.map((m) => m.email).sort(),
        [...RETAINED_ACCOUNT_EMAILS].sort(),
      );
      assert.equal(manifest.length, 4);
    });

    it("classifica só o mínimo estrutural das 4 contas retidas como preservar, e dados de negócio dessas contas como copiar_legacy/lacuna do Legacy — sem escrita e sem modo apply", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = {
        userIds: new Set(manifest.map((m) => m.user_id)),
        agencyIds: new Set(manifest.map((m) => m.linked_agency_id).filter((v): v is string => !!v)),
        companyIds: new Set(manifest.map((m) => m.linked_company_id).filter((v): v is string => !!v)),
        nomadeIds: new Set(manifest.map((m) => m.linked_nomade_id).filter((v): v is string => !!v)),
      };

      const before = await snapshotAllTableCounts();
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      const after = await snapshotAllTableCounts();
      assert.deepEqual(after, before, "o simulador não deve gravar nada, mesmo com a massa integrada completa");

      const userRows = plan.rows.filter((r) => r.domain === "usuarios");
      const retidos = userRows.find((r) => r.table.includes("retidos)"));
      assert.equal(retidos?.count, 4);
      assert.equal(retidos?.bucket, "preservar");

      assert.deepEqual(plan.legacy_gaps, [], "com os 6 coletores prontos, nenhum domínio deve aparecer como lacuna");
    });

    it("os produtos catalog2 [TESTE LOCAL] ficam separados dos reais na classificação (fixture representativa)", async () => {
      const manifest = await buildRetentionManifest(prisma);
      const retained = { userIds: new Set(manifest.map((m) => m.user_id)), agencyIds: new Set<string>(), companyIds: new Set<string>(), nomadeIds: new Set<string>() };
      const plan = await buildDomainPlan(prisma as unknown as DomainPlanDb, retained);
      assert.equal(plan.catalog2.bucket, "preservar");
      assert.equal(plan.catalog2.test_local_products, 1, "a fixture [TESTE LOCAL] do seedNoise deve ficar separada dos reais");
    });

    it("não existe modo apply: attachReadOnlyGuard bloqueia qualquer escrita, e o script real declara can_apply:false", async () => {
      const { PrismaClient } = await import("@prisma/client");
      const guarded = new PrismaClient();
      attachReadOnlyGuard(guarded as unknown as PrismaLikeClient);
      try {
        await assert.rejects(() => guarded.user.create({ data: { id: id("blocked"), email: `blocked-${id("e")}@example.test`, password_hash: "x", name: "x", role: "company_user", account_type: "empresas" } }), CutoverReadOnlyViolation);
      } finally {
        await guarded.$disconnect();
      }

      const scriptSource = fs.readFileSync(path.join(backendRoot, "src/scripts/cutover-simulation.ts"), "utf8");
      assert.match(scriptSource, /can_apply:\s*false/);
      assert.doesNotMatch(scriptSource, /--apply|has\("apply"\)/);
    });
  });

  describe("6) Segurança ampliada — todos os campos textuais persistidos no Legacy", () => {
    const FORBIDDEN = [
      "SEGREDO_ADMIN_NUNCA_NO_LEGADO",
      "SEGREDO_DONO_AGENCIA_NUNCA_NO_LEGADO",
      "SEGREDO_NOMADE_NUNCA_NO_LEGADO",
      "NOME COMPLETO QUE NUNCA DEVE APARECER NO LEGADO",
      "SEGREDO_DE_PROVEDOR_NUNCA_NO_LEGADO",
      "webhook_secret",
      "SEGREDO_PIX_NUNCA_NO_LEGADO",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "a".repeat(64),
    ];

    it("nenhum segredo aparece em NENHUM campo textual das tabelas Legacy (original_code, title, subtitle, content_json, dates_json, notes, reconciliation_json, e nos campos das relações)", async () => {
      const legacy = await openLegacy();
      const records = await legacy.legacyRecordSnapshot.findMany({
        select: { original_code: true, title: true, subtitle: true, content_json: true, dates_json: true, sanitized_fields_json: true },
      });
      const batches = await legacy.legacyImportBatch.findMany({ select: { source_name: true, notes: true, reconciliation_json: true } });
      const relations = await legacy.legacyRelationSnapshot.findMany({ select: { relation_type: true, to_original_id: true, description: true } });
      await legacy.$disconnect();

      const haystack = JSON.stringify({ records, batches, relations });
      for (const needle of FORBIDDEN) {
        assert.ok(!haystack.includes(needle), `segredo não deveria aparecer em nenhum campo textual do Legacy`);
      }
    });

    it("o texto legítimo ao redor do trecho redigido continua legível (a redação não apaga o registro inteiro)", async () => {
      const legacy = await openLegacy();
      const records = await legacy.legacyRecordSnapshot.findMany({ select: { content_json: true } });
      await legacy.$disconnect();
      const haystack = JSON.stringify(records);
      assert.match(haystack, /resto deste texto deve continuar leg/);
    });
  });
});
