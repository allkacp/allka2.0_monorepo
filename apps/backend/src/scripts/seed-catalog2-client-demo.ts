/**
 * Fixture LOCAL do CATÁLOGO DO CLIENTE do catalog2 (sprint de produtos,
 * blocos 5/6). Um produto `[TESTE LOCAL]` PUBLICADO e comercialmente
 * completo, só para provar a experiência do cliente (catálogo → detalhe →
 * configurador → cotação → cesta → checkout → pagamento simulado → tarefas
 * → aditivo).
 *
 *   npm run catalog2:client-demo                  cria o produto fixture
 *   npm run catalog2:client-demo -- --order-demo   roda um pedido de ponta a
 *                                                   ponta sobre o fixture
 *                                                   (checkout → pagamento →
 *                                                   tarefas → aditivo)
 *   npm run catalog2:client-demo -- --remove       remove TUDO (produto +
 *                                                   cotações/cesta/pedidos/
 *                                                   projetos/tarefas/
 *                                                   aditivos + a empresa de
 *                                                   teste do --order-demo)
 *
 * NUNCA usa um dos 36 rascunhos importados. Slug próprio, prefixo
 * `[TESTE LOCAL]`. `assertLocalDatabase` recusa host remoto.
 */
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { seedCatalog2Classifications } from "../lib/catalog2-classifications-seed";
import { publishVersion, describeCondition } from "../lib/catalog2-service";
import { resolveClientContext, createQuote } from "../lib/catalog2-client";
import { attachCatalog2QuoteToProject, confirmCatalog2AdditivePayment } from "../lib/catalog2-checkout";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { recalculateProjectValue } from "../lib/project-value";
import { confirmPaymentAndGenerateProjectTasks } from "../lib/confirm-payment";

const SLUG = "teste-local-servico-demo-catalogo";
const NAME = "[TESTE LOCAL] Serviço Demo do Catálogo";
const DEMO_COMPANY_NAME = "[TESTE LOCAL] Empresa Demo Checkout Catalogo2";
const DEMO_USER_EMAIL = "teste-local-checkout-catalogo2@example.test";
const db = new PrismaClient();

async function removeOrderDemo(productId: string) {
  const company = await db.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
  if (!company) return;
  const projects = await db.project.findMany({
    where: { company_id: company.id, products: { some: { catalog2_product_id: productId } } },
    select: { id: true },
  });
  for (const proj of projects) {
    await db.catalog2ChangeOrder.deleteMany({ where: { project_id: proj.id } });
    await db.projectTaskStage.deleteMany({ where: { project_task: { project_id: proj.id } } });
    await db.projectTask.deleteMany({ where: { project_id: proj.id } });
    await db.paymentItem.deleteMany({ where: { payment: { project_id: proj.id } } });
    await db.payment.deleteMany({ where: { project_id: proj.id } });
    await db.projectProduct.deleteMany({ where: { project_id: proj.id } });
    await db.project.delete({ where: { id: proj.id } });
  }
  await db.user.deleteMany({ where: { email: DEMO_USER_EMAIL } });
  await db.company.delete({ where: { id: company.id } });
  console.log(`Pedido(s) de demonstração removido(s) (${projects.length} projeto(s) + empresa de teste).`);
}

async function remove() {
  const p = await db.catalog2Product.findUnique({ where: { slug: SLUG } });
  if (!p) {
    console.log("Nada a remover.");
    return;
  }
  await removeOrderDemo(p.id);
  await db.catalog2CartItem.deleteMany({ where: { product_id: p.id } });
  await db.catalog2Quote.deleteMany({ where: { product_id: p.id } });
  await db.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: null } });
  const versions = await db.catalog2ProductVersion.findMany({ where: { product_id: p.id }, select: { id: true } });
  for (const v of versions) {
    await db.catalog2VersionEvent.deleteMany({ where: { version_id: v.id } });
    await db.catalog2Variation.deleteMany({ where: { version_id: v.id } });
    await db.catalog2Addon.deleteMany({ where: { version_id: v.id } });
    await db.catalog2Task.deleteMany({ where: { version_id: v.id } });
    await db.catalog2Condition.deleteMany({ where: { version_id: v.id } });
  }
  await db.catalog2ProductVersion.deleteMany({ where: { product_id: p.id } });
  await db.catalog2ProductFourF.deleteMany({ where: { product_id: p.id } });
  await db.catalog2Product.delete({ where: { id: p.id } });
  console.log("Fixture do cliente removida (produto + cotações + itens de cesta + pedidos de teste).");
}

/** Roda um pedido de ponta a ponta sobre o fixture já publicado: checkout →
 * pagamento simulado → tarefas materializadas → aditivo de exemplo
 * (solicitado, aprovado e pago). Chama os SERVIÇOS diretamente (sem HTTP) —
 * é um script de prova local, não um teste automatizado. */
async function orderDemo() {
  const product = await db.catalog2Product.findUnique({ where: { slug: SLUG } });
  if (!product || !product.published_version_id) {
    console.log("Fixture não existe ou não está publicada — rode `npm run catalog2:client-demo` primeiro.");
    return;
  }

  let company = await db.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
  if (!company) company = await db.company.create({ data: { name: DEMO_COMPANY_NAME, status: "ativo" } });
  let user = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: {
        id: `c6demo-${Date.now()}`,
        email: DEMO_USER_EMAIL,
        password_hash: "x",
        name: "Usuário Demo Checkout Catálogo 2.0",
        role: "company_user",
        account_type: "empresas",
        is_active: true,
        status: "ativo",
        company_id: company.id,
      },
    });
  }

  const ctx = await resolveClientContext(user.id, "empresas", "company_user");

  const version = await db.catalog2ProductVersion.findUniqueOrThrow({
    where: { id: product.published_version_id },
    include: { variations: { include: { options: true } } },
  });
  const formato = version.variations.find((v) => v.key === "formato");
  const usoIa = version.variations.find((v) => v.key === "uso_ia");
  const selection = {
    variation_option_keys: [
      formato?.options.find((o) => o.is_default)?.key,
      usoIa?.options.find((o) => o.is_default)?.key,
    ].filter((k): k is string => !!k),
    addon_keys: [],
    quantity: 1,
    answers: {},
  };

  const quote = (await createQuote(ctx, product.id, selection)) as { id: string };
  console.log(`Cotação criada: ${quote.id}`);

  const checkoutClientActionId = `demo-checkout-${Date.now()}`;
  const project = await db.$transaction(async (tx) => {
    const proj = await createProjectWithSequentialCode(tx, {
      title: `[TESTE LOCAL] Pedido — ${NAME}`,
      status: "draft",
      lifecycle: "avulso",
      company_id: company!.id,
      created_by_user_id: user!.id,
      catalog2_checkout_client_action_id: checkoutClientActionId,
    });
    await attachCatalog2QuoteToProject(tx, {
      projectId: proj.id,
      quoteId: quote.id,
      origin: "CATALOG2",
      pagadorSnapshot: "CLIENTE",
    });
    await recalculateProjectValue(tx, proj.id);
    return tx.project.findUniqueOrThrow({ where: { id: proj.id } });
  });
  console.log(`Pedido criado: ${project.project_code} (${project.id})`);

  const paymentResult = await db.$transaction((tx) =>
    confirmPaymentAndGenerateProjectTasks(tx, {
      projectId: project.id,
      requesterUser: { id: user!.id, account_type: "empresas", role: "company_user" },
    }),
  );
  console.log(
    `Pagamento simulado confirmado: ${paymentResult.payment.status}. Tarefas geradas: ${paymentResult.tasksResult?.generated ?? 0}, etapas: ${paymentResult.tasksResult?.stages_generated ?? 0}.`,
  );

  // ── Aditivo de exemplo: mesma configuração, "quantidade extra" fictícia
  // via nova cotação — solicitar, aprovar e pagar. ─────────────────────────
  const addonQuote = (await createQuote(ctx, product.id, { ...selection, quantity: 2 })) as { id: string };
  const changeOrder = await db.catalog2ChangeOrder.create({
    data: {
      project_id: project.id,
      quote_id: addonQuote.id,
      requested_by_user_id: user.id,
      change_summary: `[TESTE LOCAL] Aditivo de demonstração — quantidade 2.`,
      status: "solicitado",
    },
  });
  const approved = await db.catalog2ChangeOrder.update({
    where: { id: changeOrder.id },
    data: {
      status: "aprovado",
      decided_by_user_id: user.id,
      decided_at: new Date(),
      price_impact_snapshot: addonQuote && (await db.catalog2Quote.findUniqueOrThrow({ where: { id: addonQuote.id } })).commercial_price,
      approval_client_action_id: `demo-approve-${Date.now()}`,
    },
  });
  const addonPaymentResult = await db.$transaction(async (tx) => {
    const additivePp = await attachCatalog2QuoteToProject(tx, {
      projectId: project.id,
      quoteId: approved.quote_id,
      origin: "CATALOG2_ADDITIVE",
      changeOrderId: approved.id,
      pagadorSnapshot: "CLIENTE",
    });
    await recalculateProjectValue(tx, project.id);
    const payment = await confirmCatalog2AdditivePayment(tx, {
      projectId: project.id,
      projectProductId: additivePp.id,
      requesterUserId: user!.id,
    });
    await tx.catalog2ChangeOrder.update({
      where: { id: approved.id },
      data: { status: "materializado", materialized_project_product_id: additivePp.id, materialized_payment_id: payment.payment.id || null },
    });
    return payment;
  });
  console.log(
    `Aditivo pago e materializado (isolado do motor genérico). Novas tarefas geradas: ${addonPaymentResult.tasksResult?.generated ?? 0}.`,
  );

  console.log("\nRoteiro de teste manual:");
  console.log(`  - Login como ${DEMO_USER_EMAIL} (empresa "${DEMO_COMPANY_NAME}")`);
  console.log(`  - Abrir o projeto ${project.project_code} no admin/company para conferir tarefas + aditivo`);
  console.log("  - Limpar tudo ao final: npm run catalog2:client-demo -- --remove");
}

async function main() {
  assertLocalDatabase(process.env.DATABASE_URL);
  if (process.argv.includes("--remove")) return remove();
  if (process.argv.includes("--order-demo")) return orderDemo();

  await seedCatalog2Classifications(db);

  // Configuração comercial COMPLETA (só local): percentuais + ORDEM confirmada
  // (bloco 5, correção 1) + valores/hora. Sem isso o produto não fica visível
  // ao cliente.
  await db.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15,
      currency: "BRL",
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      notes: "[TESTE LOCAL] valores e ordem fictícios para o catálogo do cliente.",
    },
    update: {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
  });
  await db.catalog2Specialty.updateMany({ where: { key: "designer" }, data: { max_hourly_rate: 90, hourly_rate_note: "[TESTE LOCAL]" } });
  await db.catalog2Specialty.updateMany({ where: { key: "redator" }, data: { max_hourly_rate: 70, hourly_rate_note: "[TESTE LOCAL]" } });

  if (await db.catalog2Product.findUnique({ where: { slug: SLUG } })) {
    console.log("Fixture já existe. Use --remove para recriar.");
    return;
  }

  const pillar = await db.catalog2Pillar.findUnique({ where: { key: "redes_conteudo" } });
  const category = await db.catalog2Category.findUnique({ where: { key: "design" } });
  const fF = await db.catalog2FourF.findMany({ where: { key: { in: ["fluxo", "forca"] } } });
  const designer = await db.catalog2Specialty.findUnique({ where: { key: "designer" } });
  const redator = await db.catalog2Specialty.findUnique({ where: { key: "redator" } });

  const product = await db.catalog2Product.create({
    data: {
      slug: SLUG,
      internal_name: NAME,
      pillar_id: pillar?.id ?? null,
      category_id: category?.id ?? null,
      origin: "existente",
      status: "em_preparacao",
      four_f: { create: fF.map((f) => ({ four_f_id: f.id })) },
    },
  });

  const v1 = await db.catalog2ProductVersion.create({
    data: {
      product_id: product.id,
      version_number: 1,
      state: "rascunho",
      title: "Peça de Comunicação para Redes Sociais",
      summary: "Arte, copy e legenda prontas para publicar — com opções de formato e adicionais.",
      full_description:
        "Serviço demonstrativo do novo catálogo. Escolha o formato, marque adicionais se quiser, informe a autorização de uso de IA e veja preço e prazo calculados na hora. Este é um item [TESTE LOCAL] para validar a experiência do cliente.",
      // PRAZO COMERCIAL base definido — sem isso o preço não fica pronto p/ cotar.
      base_commercial_deadline_days: 5,
      tasks: {
        create: [
          {
            key: "briefing", name: "Alinhar briefing", objective: "Entender o objetivo da peça.",
            sort_order: 1, execution_mode: "humano", specialty_id: redator?.id ?? null, estimated_minutes: 60,
            steps: { create: [{ key: "coletar", name: "Coletar referências", sort_order: 1, estimated_minutes: 30 }] },
          },
          {
            key: "criacao", name: "Criar a arte", objective: "Produzir a peça visual.",
            sort_order: 2, execution_mode: "humano", specialty_id: designer?.id ?? null, estimated_minutes: 120, requires_review: true,
            steps: { create: [
              { key: "rascunho", name: "Gerar rascunho", sort_order: 1, estimated_minutes: 60 },
              { key: "entrega", name: "Exportar e entregar", sort_order: 2, estimated_minutes: 60 },
            ] },
          },
        ],
      },
    },
  });

  // Variação obrigatória: Formato.
  const varFormato = await db.catalog2Variation.create({
    data: {
      version_id: v1.id, key: "formato", name: "Formato da peça", sort_order: 1, is_required: true,
      options: { create: [
        { key: "estatico", label: "Estático (1 arte)", sort_order: 1, is_default: true },
        { key: "carrossel", label: "Carrossel (até 5 artes)", sort_order: 2 },
      ] },
    },
    include: { options: true },
  });
  const carrossel = varFormato.options.find((o) => o.key === "carrossel")!;
  await db.catalog2OptionEffect.create({ data: { variation_option_id: carrossel.id, effect_type: "add_deadline_days", effect_value: "2", sort_order: 1 } });
  await db.catalog2OptionEffect.create({ data: { variation_option_id: carrossel.id, effect_type: "add_fixed_amount", effect_value: "120", sort_order: 2 } });

  // Variação obrigatória: autorização de IA (como no Card Post) — sem efeito de preço.
  await db.catalog2Variation.create({
    data: {
      version_id: v1.id, key: "uso_ia", name: "Uso de IA na produção", sort_order: 2, is_required: true,
      notes: "Escolha obrigatória na contratação. Sem impacto automático no preço enquanto a regra não for definida.",
      options: { create: [
        { key: "autorizado", label: "Autorizado", sort_order: 1, is_default: true },
        { key: "nao_autorizado", label: "Não autorizado", sort_order: 2 },
      ] },
    },
  });

  // Adicional opcional com entregável extra.
  const addon = await db.catalog2Addon.create({
    data: { version_id: v1.id, key: "legendas_extra", name: "Pacote de legendas extra", description: "3 variações de legenda para testes A/B.", sort_order: 1, base_cost: 40, is_active: true },
  });
  await db.catalog2AddonEffect.create({ data: { addon_id: addon.id, effect_type: "add_deliverable", effect_value: "3 variações de legenda", sort_order: 1 } });

  // Condição TIPADA: informação obrigatória do cliente (require_info) quando marca urgência.
  const condData = {
    version_id: v1.id, key: "material_marca", name: "Pedir material da marca",
    is_active: true, sort_order: 1,
    trigger_source: "quantity", trigger_ref: null as string | null, operator: "gte", comparison_value: "1",
    effect_type: "require_info", effect_value: "Logotipo e cores da marca (link ou arquivo)",
  };
  await db.catalog2Condition.create({ data: { ...condData, explanation: describeCondition(condData) } });

  await publishVersion(v1.id, "system", { changeSummary: "Publicação da fixture [TESTE LOCAL] do catálogo do cliente." });

  const fresh = await db.catalog2Product.findUnique({ where: { id: product.id } });
  console.log(JSON.stringify({ product_id: product.id, slug: SLUG, status: fresh?.status, published_version_id: fresh?.published_version_id }, null, 2));
  console.log("\nAbrir como cliente: /catalog2 (portais elegíveis) — ou preview do Admin Master.");
  console.log("Remover tudo (produto + cotações + cesta): npm run catalog2:client-demo -- --remove");
}

main().finally(() => db.$disconnect());
