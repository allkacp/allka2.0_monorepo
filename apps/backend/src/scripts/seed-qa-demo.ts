/**
 * Seed QA controlado — preparação pré-deploy (fechamento técnico do sprint
 * de produtos). Cria um conjunto MÍNIMO de contas e dados de teste para
 * validar todos os portais, separado do seed de desenvolvimento
 * (`prisma/seed.ts`) e bloqueado em produção.
 *
 *   npm run seed:qa-demo
 *   npm run seed:qa-demo -- --remove
 *
 * Proteções:
 *   • recusa produção — exige SEED_QA_ENVIRONMENT="local"|"qa" explícito
 *     (NUNCA inferido de NODE_ENV: este projeto usa NODE_ENV=production
 *     também na VPS de QA — mesma lição já documentada em src/config.ts
 *     sobre PRODUCT_FEEDBACK_ENVIRONMENT/COMMS_ENVIRONMENT);
 *   • recusa mesmo com a env var certa se o nome do banco no DATABASE_URL
 *     contiver "prod" (defesa extra, não a única barreira);
 *   • senha vem de SEED_QA_PASSWORD (secret) — nunca hardcoded, nunca
 *     impressa no console/log;
 *   • idempotente — todo registro usa `upsert` por id/e-mail/slug FIXOS
 *     (prefixo `qa-`, domínio `@allka-qa.test`), rodar de novo nunca duplica;
 *   • `--remove` apaga só os registros por ESSES ids/e-mails EXATOS —
 *     nunca uma busca ampla tipo `contains`/`LIKE`;
 *   • nunca toca em conta real, nunca mistura com os 36 produtos importados.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { attachCatalog2QuoteToProject, confirmCatalog2AdditivePayment } from "../lib/catalog2-checkout";
import { confirmPaymentAndGenerateProjectTasks } from "../lib/confirm-payment";
import { resolveClientContext, createQuote } from "../lib/catalog2-client";
import { recalculateProjectValue } from "../lib/project-value";
import { seedCatalog2Classifications } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";

const db = new PrismaClient();

// ── Identificadores FIXOS (nunca gerados aleatoriamente) — é isso que torna
// o --remove seguro e exato, sem precisar de busca ampla. ────────────────
const DOMAIN = "@allka-qa.test";
const IDS = {
  adminProfileMaster: "qa-admin-profile-master",
  adminProfileCommon: "qa-admin-profile-common",
  userAdminMaster: "qa-user-admin-master",
  userAdminCommon: "qa-user-admin-common",
  userCompany: "qa-user-company",
  userAgency: "qa-user-agency",
  userPartner: "qa-user-partner",
  userNomad: "qa-user-nomad",
  userLeader: "qa-user-leader",
  company: "qa-company",
  agency: "qa-agency",
  partnerAgency: "qa-partner-agency",
  nomade: "qa-nomade",
  liderArea: "qa-lider-area",
};
const EMAILS = {
  adminMaster: `qa-admin-master${DOMAIN}`,
  adminCommon: `qa-admin${DOMAIN}`,
  company: `qa-company${DOMAIN}`,
  agency: `qa-agency${DOMAIN}`,
  partner: `qa-partner${DOMAIN}`,
  nomad: `qa-nomad${DOMAIN}`,
  leader: `qa-leader${DOMAIN}`,
};
const PRODUCT_SLUG = "teste-qa-servico-completo";
const PRODUCT_NAME = "[TESTE QA] Serviço Completo";

function has(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

function assertQaEnvironment() {
  const env = process.env.SEED_QA_ENVIRONMENT;
  if (env !== "local" && env !== "qa") {
    throw new Error(
      'Recusado: defina SEED_QA_ENVIRONMENT="local" ou "qa" explicitamente (nunca inferido de NODE_ENV — este projeto usa NODE_ENV=production também na VPS de QA). Valor recebido: ' +
        JSON.stringify(env ?? null),
    );
  }
  const rawUrl = process.env.DATABASE_URL ?? "";
  if (/prod/i.test(rawUrl.replace(/^.*@/, ""))) {
    throw new Error("Recusado: DATABASE_URL parece apontar para um banco de produção (contém 'prod' no host/nome). Defesa extra além de SEED_QA_ENVIRONMENT.");
  }
}

function qaPasswordHash(): Promise<string> {
  const pwd = process.env.SEED_QA_PASSWORD;
  if (!pwd) {
    throw new Error("Recusado: defina SEED_QA_PASSWORD (secret) — a senha nunca vem hardcoded neste script.");
  }
  return bcrypt.hash(pwd, 10);
}

// ── Remoção — sempre por id/e-mail FIXO, nunca busca ampla ────────────────
async function remove() {
  console.log("▶ Removendo fixture QA (ids fixos, nunca busca ampla)...");

  const projects = await db.project.findMany({
    where: { OR: [{ company_id: IDS.company }, { agency_id: IDS.agency }] },
    select: { id: true },
  });
  for (const p of projects) {
    await db.catalog2ChangeOrder.deleteMany({ where: { project_id: p.id } });
    await db.projectTaskStage.deleteMany({ where: { project_task: { project_id: p.id } } });
    await db.projectTask.deleteMany({ where: { project_id: p.id } });
    await db.paymentItem.deleteMany({ where: { payment: { project_id: p.id } } });
    await db.payment.deleteMany({ where: { project_id: p.id } });
    await db.projectProduct.deleteMany({ where: { project_id: p.id } });
    await db.systemAlert.deleteMany({ where: { entity_type: "project", entity_id: p.id } });
    await db.project.delete({ where: { id: p.id } });
  }

  await db.catalog2CartItem.deleteMany({ where: { account_id: { in: [IDS.company, IDS.agency] } } });
  await db.catalog2Quote.deleteMany({ where: { account_id: { in: [IDS.company, IDS.agency] } } });

  const product = await db.catalog2Product.findUnique({ where: { slug: PRODUCT_SLUG } });
  if (product) {
    await db.catalog2Product.update({ where: { id: product.id }, data: { published_version_id: null } });
    const versions = await db.catalog2ProductVersion.findMany({ where: { product_id: product.id }, select: { id: true } });
    const vids = versions.map((v) => v.id);
    await db.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } });
    await db.catalog2TaskDependency.deleteMany({ where: { task: { version_id: { in: vids } } } });
    await db.catalog2Task.deleteMany({ where: { version_id: { in: vids } } });
    await db.catalog2Variation.deleteMany({ where: { version_id: { in: vids } } });
    await db.catalog2Addon.deleteMany({ where: { version_id: { in: vids } } });
    await db.catalog2ProductVersion.deleteMany({ where: { product_id: product.id } });
    await db.catalog2ProductFourF.deleteMany({ where: { product_id: product.id } });
    await db.catalog2Product.delete({ where: { id: product.id } });
  }

  await db.liderArea.deleteMany({ where: { id: IDS.liderArea } });
  await db.nomade.deleteMany({ where: { id: IDS.nomade } });
  await db.partnerProfile.deleteMany({ where: { agency_id: IDS.partnerAgency } });

  // Agency.owner_user_id -> User e User.agency_id -> Agency formam uma
  // referência circular — precisa quebrar um lado ANTES de apagar qualquer
  // um dos dois (zera agency_id nos usuários, depois apaga as agências, só
  // depois os usuários).
  await db.user.updateMany({ where: { id: { in: [IDS.userAgency, IDS.userPartner] } }, data: { agency_id: null } });
  await db.agency.deleteMany({ where: { id: { in: [IDS.agency, IDS.partnerAgency] } } });

  await db.user.deleteMany({
    where: {
      id: {
        in: [
          IDS.userAdminMaster, IDS.userAdminCommon, IDS.userCompany, IDS.userAgency,
          IDS.userPartner, IDS.userNomad, IDS.userLeader,
        ],
      },
    },
  });
  await db.adminProfile.deleteMany({ where: { id: { in: [IDS.adminProfileMaster, IDS.adminProfileCommon] } } });
  await db.company.deleteMany({ where: { id: IDS.company } });

  console.log("✅ Fixture QA removida.");
}

async function main() {
  if (has("remove")) {
    assertQaEnvironment();
    return remove();
  }

  assertQaEnvironment();
  const passwordHash = await qaPasswordHash();
  const created: string[] = [];

  // ── 1. Contas dos 7 portais ──────────────────────────────────────────────
  const adminProfileMaster = await db.adminProfile.upsert({
    where: { id: IDS.adminProfileMaster },
    create: { id: IDS.adminProfileMaster, name: "[TESTE QA] Admin Master", is_master: true, is_active: true },
    update: {},
  });
  const adminProfileCommon = await db.adminProfile.upsert({
    where: { id: IDS.adminProfileCommon },
    create: { id: IDS.adminProfileCommon, name: "[TESTE QA] Admin Comum", is_master: false, is_active: true },
    update: {},
  });
  await db.user.upsert({
    where: { id: IDS.userAdminMaster },
    create: { id: IDS.userAdminMaster, email: EMAILS.adminMaster, password_hash: passwordHash, name: "[TESTE QA] Admin Master", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: adminProfileMaster.id },
    update: { password_hash: passwordHash },
  });
  created.push(`Admin Master — ${EMAILS.adminMaster}`);
  await db.user.upsert({
    where: { id: IDS.userAdminCommon },
    create: { id: IDS.userAdminCommon, email: EMAILS.adminCommon, password_hash: passwordHash, name: "[TESTE QA] Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: adminProfileCommon.id },
    update: { password_hash: passwordHash },
  });
  created.push(`Admin comum — ${EMAILS.adminCommon}`);

  const company = await db.company.upsert({
    where: { id: IDS.company },
    create: { id: IDS.company, name: "[TESTE QA] Empresa", status: "ativo" },
    update: {},
  });
  await db.user.upsert({
    where: { id: IDS.userCompany },
    create: { id: IDS.userCompany, email: EMAILS.company, password_hash: passwordHash, name: "[TESTE QA] Usuário Empresa", role: "company_admin", account_type: "empresas", is_active: true, status: "ativo", company_id: company.id },
    update: { password_hash: passwordHash, company_id: company.id },
  });
  created.push(`Company — ${EMAILS.company}`);

  // Agency.owner_user_id é obrigatório e User.agency_id referencia a
  // própria Agency de volta — dependência circular. Resolve criando o
  // usuário SEM agency_id primeiro, depois a Agency, depois atualizando o
  // usuário com o vínculo.
  await db.user.upsert({
    where: { id: IDS.userAgency },
    create: { id: IDS.userAgency, email: EMAILS.agency, password_hash: passwordHash, name: "[TESTE QA] Usuário Agência", role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
    update: { password_hash: passwordHash },
  });
  const agency = await db.agency.upsert({
    where: { id: IDS.agency },
    create: { id: IDS.agency, name: "[TESTE QA] Agência", status: "ativo", owner_user_id: IDS.userAgency },
    update: {},
  });
  await db.user.update({ where: { id: IDS.userAgency }, data: { agency_id: agency.id } });
  created.push(`Agency — ${EMAILS.agency}`);

  // Partner = upgrade de uma Agency PRÓPRIA (nunca a mesma do teste de Agency
  // comum, pra não misturar os dois papéis na mesma conta). Mesma ordem
  // (usuário sem vínculo -> agência -> vínculo) pelo mesmo motivo acima.
  await db.user.upsert({
    where: { id: IDS.userPartner },
    create: { id: IDS.userPartner, email: EMAILS.partner, password_hash: passwordHash, name: "[TESTE QA] Usuário Partner", role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
    update: { password_hash: passwordHash },
  });
  const partnerAgency = await db.agency.upsert({
    where: { id: IDS.partnerAgency },
    create: { id: IDS.partnerAgency, name: "[TESTE QA] Agência Partner", status: "ativo", owner_user_id: IDS.userPartner },
    update: {},
  });
  await db.user.update({ where: { id: IDS.userPartner }, data: { agency_id: partnerAgency.id } });
  await db.partnerProfile.upsert({
    where: { agency_id: partnerAgency.id },
    create: { agency_id: partnerAgency.id, status: "active", invited_at: new Date(), responded_at: new Date() },
    update: { status: "active" },
  });
  created.push(`Partner — ${EMAILS.partner}`);

  await db.user.upsert({
    where: { id: IDS.userNomad },
    create: { id: IDS.userNomad, email: EMAILS.nomad, password_hash: passwordHash, name: "[TESTE QA] Nômade", role: "nomad", account_type: "nomades", is_active: true, status: "ativo" },
    update: { password_hash: passwordHash },
  });
  await db.nomade.upsert({
    where: { id: IDS.nomade },
    create: { id: IDS.nomade, user_id: IDS.userNomad, name: "[TESTE QA] Nômade", email: EMAILS.nomad, status: "ativo", terms_accepted: true },
    update: { status: "ativo" },
  });
  created.push(`Nômade — ${EMAILS.nomad}`);

  await db.user.upsert({
    where: { id: IDS.userLeader },
    create: { id: IDS.userLeader, email: EMAILS.leader, password_hash: passwordHash, name: "[TESTE QA] Líder", role: "lider", account_type: "lider", is_active: true, status: "ativo" },
    update: { password_hash: passwordHash },
  });
  await db.liderArea.upsert({
    where: { id: IDS.liderArea },
    create: { id: IDS.liderArea, user_id: IDS.userLeader, area_nome: "[TESTE QA] Design", ativo: true },
    update: {},
  });
  created.push(`Líder — ${EMAILS.leader}`);

  // ── 2. Produto completo do catalog2 (nunca um dos 36 importados) ────────
  await seedCatalog2Classifications(db);
  await db.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      notes: "[TESTE QA] valores fictícios — nunca sobrescreve config real já definida (só preenchido na criação).",
    },
    // Nunca sobrescreve config comercial real já configurada num QA de longa
    // duração — só garante que existe alguma coisa preenchida na 1ª vez.
    update: {},
  });
  const designer = await db.catalog2Specialty.findFirst({ where: { key: "designer" } });
  if (designer && designer.max_hourly_rate == null) {
    await db.catalog2Specialty.update({ where: { id: designer.id }, data: { max_hourly_rate: 100, hourly_rate_note: "[TESTE QA]" } });
  }

  let product = await db.catalog2Product.findUnique({ where: { slug: PRODUCT_SLUG } });
  let versionId: string;
  if (!product) {
    const pillar = await db.catalog2Pillar.findUnique({ where: { key: "redes_conteudo" } });
    const category = await db.catalog2Category.findUnique({ where: { key: "design" } });
    const fourF = await db.catalog2FourF.findMany({ where: { key: { in: ["fluxo", "forca"] } } });
    product = await db.catalog2Product.create({
      data: {
        slug: PRODUCT_SLUG, internal_name: PRODUCT_NAME, pillar_id: pillar?.id ?? null, category_id: category?.id ?? null,
        origin: "existente", status: "em_preparacao",
        four_f: { create: fourF.map((f) => ({ four_f_id: f.id })) },
      },
    });
    const version = await db.catalog2ProductVersion.create({
      data: {
        product_id: product.id, version_number: 1, state: "rascunho",
        title: "Serviço de teste QA — ponta a ponta",
        summary: "Fixture completa para validar todos os portais antes do deploy.",
        full_description: "[TESTE QA] Produto fictício, nunca um dos 36 importados — variação obrigatória, adicional, autorização de IA, 2 tarefas (a 2ª depende da 1ª, para testar o bloqueio real de dependência), preço e prazo completos.",
        base_commercial_deadline_days: 5,
      },
    });
    versionId = version.id;

    const formato = await db.catalog2Variation.create({
      data: {
        version_id: version.id, key: "formato", name: "Formato", is_required: true, sort_order: 1,
        options: { create: [{ key: "padrao", label: "Padrão", sort_order: 1, is_default: true }] },
      },
    });
    await db.catalog2Variation.create({
      data: {
        version_id: version.id, key: "uso_ia", name: "Uso de IA na produção", is_required: true, sort_order: 2,
        notes: "Escolha obrigatória na contratação — sem impacto automático no preço.",
        options: { create: [
          { key: "autorizado", label: "Autorizado", sort_order: 1, is_default: true },
          { key: "nao_autorizado", label: "Não autorizado", sort_order: 2 },
        ] },
      },
    });
    await db.catalog2Addon.create({
      data: { version_id: version.id, key: "extra_qa", name: "[TESTE QA] Adicional de teste", description: "Adicional opcional para validar o configurador.", base_cost: 30, is_active: true, sort_order: 1 },
    });

    const specialty = designer ?? (await db.catalog2Specialty.findFirstOrThrow());
    const t1 = await db.catalog2Task.create({
      data: { version_id: version.id, key: "briefing", name: "Alinhar briefing", objective: "Entender o objetivo.", sort_order: 1, execution_mode: "humano", specialty_id: specialty.id, estimated_minutes: 30,
        steps: { create: [{ key: "coletar", name: "Coletar referências", sort_order: 1 }] } },
    });
    const t2 = await db.catalog2Task.create({
      data: { version_id: version.id, key: "entrega", name: "Produzir e entregar", objective: "Entregar o serviço.", sort_order: 2, execution_mode: "humano", specialty_id: specialty.id, estimated_minutes: 60,
        steps: { create: [{ key: "producao", name: "Produzir", sort_order: 1 }, { key: "entrega", name: "Entregar", sort_order: 2 }] } },
    });
    // t2 SÓ pode começar depois de t1 concluída — é a dependência real que o
    // QA vai testar clicando em "Liberar" na tarefa 2 antes de concluir a 1.
    await db.catalog2TaskDependency.create({ data: { task_id: t2.id, depends_on_task_id: t1.id } });

    void formato;
    await publishVersion(versionId, "system", { changeSummary: "[TESTE QA] publicação inicial." });
  } else {
    const publishedId = product.published_version_id;
    if (!publishedId) throw new Error("Fixture QA existe mas não está publicada — rode com --remove e depois sem flags para recriar do zero.");
    versionId = publishedId;
  }
  created.push(`Produto — ${PRODUCT_NAME} (${PRODUCT_SLUG})`);

  // ── 3. Pedido/projeto de exemplo (Company compra o produto QA) ──────────
  // Idempotência real pelo campo dedicado (não por título — nunca confiar em
  // texto livre pra decidir "já existe"), verificada ANTES de gerar
  // qualquer cotação nova (gerar uma cotação à toa a cada rerun colidia com
  // a cotação antiga da mesma configuração ao tentar virar "convertida").
  const checkoutActionId = "qa-demo-checkout";
  const companyCtx = await resolveClientContext(IDS.userCompany, "empresas", "company_admin");
  const selection = { variation_option_keys: ["padrao", "autorizado"], addon_keys: [], quantity: 1, answers: {} };

  let project = await db.project.findUnique({ where: { catalog2_checkout_client_action_id: checkoutActionId } });
  if (!project) {
    const quote = (await createQuote(companyCtx, product.id, selection)) as { id: string };
    project = await db.$transaction(async (tx) => {
      const proj = await createProjectWithSequentialCode(tx, {
        title: `[TESTE QA] Pedido — ${PRODUCT_NAME}`,
        status: "draft", lifecycle: "avulso",
        company_id: IDS.company, created_by_user_id: IDS.userCompany,
        catalog2_checkout_client_action_id: checkoutActionId,
      });
      await attachCatalog2QuoteToProject(tx, { projectId: proj.id, quoteId: quote.id, origin: "CATALOG2", pagadorSnapshot: "CLIENTE" });
      await recalculateProjectValue(tx, proj.id);
      return tx.project.findUniqueOrThrow({ where: { id: proj.id } });
    });

    const payment = await db.$transaction((tx) =>
      confirmPaymentAndGenerateProjectTasks(tx, { projectId: project!.id, requesterUser: { id: IDS.userCompany, account_type: "empresas", role: "company_admin" } }),
    );

    // Deixa as duas tarefas em EM_LANCAMENTO — prontas pro QA clicar direto
    // em "Liberar" e ver a tarefa 2 bloqueada pela dependência da tarefa 1.
    await db.projectTask.updateMany({ where: { project_id: project.id }, data: { status: "EM_LANCAMENTO", data_lancamento: new Date() } });

    void payment;
  }
  created.push(`Pedido/Projeto — ${project.project_code}`);

  // ── 4. Aditivo de demonstração (fica "solicitado" — nunca auto-aprovado/
  //       pago, pra o QA poder testar o fluxo de aprovação inteiro). Checa
  //       ANTES de gerar cotação nova — mesmo motivo do pedido acima. ────
  const existingCo = await db.catalog2ChangeOrder.findFirst({ where: { project_id: project.id } });
  if (!existingCo) {
    const addonQuote = (await createQuote(companyCtx, product.id, { ...selection, quantity: 2 })) as { id: string };
    const originalPp = await db.projectProduct.findFirst({ where: { project_id: project.id, origin: "CATALOG2" } });
    await db.catalog2ChangeOrder.create({
      data: {
        project_id: project.id,
        original_project_product_id: originalPp?.id ?? null,
        quote_id: addonQuote.id,
        requested_by_user_id: IDS.userCompany,
        change_summary: `[TESTE QA] Aditivo de demonstração — quantidade 2 de "${PRODUCT_NAME}".`,
        status: "solicitado",
      },
    });
  }
  created.push("Aditivo de demonstração — status \"solicitado\" (pronto para aprovar/pagar no teste)");

  // ── 5. Um alerta + uma notificação, ligados ao projeto de teste ─────────
  await db.systemAlert.upsert({
    where: { id: "qa-demo-alert" },
    create: {
      id: "qa-demo-alert", type: "qa.demo_alert", title: "[TESTE QA] Alerta de demonstração",
      message: `Alerta de exemplo vinculado ao pedido ${project.project_code}.`,
      severity: "warning", category: "alerta", entity_type: "project", entity_id: project.id,
    },
    update: {},
  });
  await db.systemAlert.upsert({
    where: { id: "qa-demo-notification" },
    create: {
      id: "qa-demo-notification", type: "qa.demo_notification", title: "[TESTE QA] Notificação de demonstração",
      message: `Notificação de exemplo vinculada ao pedido ${project.project_code}.`,
      severity: "info", category: "notificacao", entity_type: "project", entity_id: project.id,
    },
    update: {},
  });
  created.push("1 alerta + 1 notificação de demonstração");

  console.log("\n✅ Seed QA concluído. Registros criados/confirmados:");
  for (const c of created) console.log(`   • ${c}`);
  console.log("\nSenha: definida via SEED_QA_PASSWORD (não impressa aqui). Ver docs/qa-contas-teste.md para o e-mail de cada conta.");
  console.log("Limpar tudo: npm run seed:qa-demo -- --remove\n");
}

main()
  .catch((err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
